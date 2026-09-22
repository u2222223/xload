// ==UserScript==
// @name         ServiceNow - Update Ticket Number
// @version      0.0.5
// @description  Replace the number input field with a link to the current ticket
// @author       Matteo Lecca
// @match        *.service-now.com*/incident.do*
// @match        *.service-now.com*/sc_request.do*
// @match        *.service-now.com*/sc_req_item.do*
// @match        *.service-now.com*/sc_task.do*
// @match        *.service-now.com*/problem.do*
// @match        *.service-now.com*/change_request.do*
// @match        *.service-now.com*/rm_story.do*
// @match        *.service-now.com*/rm_enhancement.do*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=service-now.com
// @grant        none
// @license MIT
// @namespace    https://greasyfork.org/users/1246673
// @downloadURL https://update.greasyfork.org/scripts/484615/ServiceNow%20-%20Update%20Ticket%20Number.user.js
// @updateURL https://update.greasyfork.org/scripts/484615/ServiceNow%20-%20Update%20Ticket%20Number.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // XLoadPanel —— 面板通信层（脚本侧精简实现，协议与站点 assets/panel/panel.js 对齐）
    // 消息格式：{type, data, _from}；请求-响应：{_id, _request}
    // 信任模型：跨源仅信任面板页来源 PANEL_ORIGIN；优先使用 open() 返回的窗口引用
    (function () {
        'use strict';
        var PREFIX = 'xload-panel:';
        var PANEL_ORIGIN = 'https://xload.net';

        function Channel(taskId) {
            this._id = String(taskId || '');
            this._seq = 0;
            this._handlers = {};
            this._pending = {};
            this._bc = null;
            this._opener = null;
            this._panelWin = null;
            var self = this;
            try {
                if (window.opener && window.opener !== window) this._opener = window.opener;
            } catch (e) { this._opener = null; }
            this._onMsg = function (ev) {
                if (!ev.data || typeof ev.data !== 'object' || !ev.data.type) return;
                if (ev.source === window) return;
                if (ev.source && ev.source !== self._panelWin && ev.source !== self._opener) return;
                if (ev.origin && ev.origin !== PANEL_ORIGIN && ev.origin !== window.location.origin) return;
                if (ev.data._from !== self._id) return;
                self._dispatch(ev.data);
            };
            window.addEventListener('message', this._onMsg);
            try {
                this._bc = new BroadcastChannel(PREFIX + this._id);
                this._bc.onmessage = function (ev) { self._dispatch(ev.data); };
            } catch (e) { this._bc = null; }
        }

        Channel.prototype.attach = function (panelWin) {
            if (panelWin) this._panelWin = panelWin;
            return this;
        };

        Channel.prototype._post = function (msg) {
            if (this._panelWin) { try { this._panelWin.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
            else if (this._opener) { try { this._opener.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
            if (this._bc) { try { this._bc.postMessage(msg); } catch (e) {} }
        };

        Channel.prototype._dispatch = function (msg) {
            if (!msg || typeof msg.type !== 'string') return;
            if (msg._id != null && Object.prototype.hasOwnProperty.call(this._pending, msg._id)) {
                var p = this._pending[msg._id];
                delete this._pending[msg._id];
                if (p._timer) clearTimeout(p._timer);
                if (msg.error != null) p.reject(new Error(String(msg.error)));
                else p.resolve(msg.data == null ? {} : msg.data);
                return;
            }
            var hs = this._handlers[msg.type];
            if (hs) {
                var data = msg.data == null ? {} : msg.data;
                for (var i = 0; i < hs.length; i++) hs[i](data, msg);
            }
        };

        // 单向发送：type 命令；上报用 progress/done/error
        Channel.prototype.send = function (type, data) {
            this._post({ type: type, data: data == null ? {} : data, _from: this._id });
            return this;
        };

        // 请求-响应：等待面板回包，默认超时 8000ms
        Channel.prototype.request = function (type, data, timeout) {
            var self = this;
            var id = ++this._seq;
            var t = typeof timeout === 'number' && timeout > 0 ? timeout : 8000;
            return new Promise(function (resolve, reject) {
                self._pending[id] = { resolve: resolve, reject: reject };
                self._pending[id]._timer = setTimeout(function () {
                    if (self._pending[id]) {
                        delete self._pending[id];
                        reject(new Error('panel request timeout: ' + type));
                    }
                }, t);
                self._post({ type: type, data: data == null ? {} : data, _id: id, _request: true, _from: self._id });
            });
        };

        // 监听面板消息（面板命令 type = action.id）
        Channel.prototype.on = function (type, handler) {
            (this._handlers[type] = this._handlers[type] || []).push(handler);
            return this;
        };

        Channel.prototype.close = function () {
            if (this._onMsg) { try { window.removeEventListener('message', this._onMsg); } catch (e) {} }
            if (this._bc) { try { this._bc.close(); } catch (e) {} }
            var ids = Object.keys(this._pending);
            for (var i = 0; i < ids.length; i++) {
                var p = this._pending[ids[i]];
                if (p._timer) clearTimeout(p._timer);
                p.reject(new Error('panel channel closed'));
            }
            this._pending = {};
            this._handlers = {};
            this._bc = null;
            this._opener = null;
            this._panelWin = null;
        };

        window.XLoadPanel = {
            CHANNEL_PREFIX: PREFIX,
            PANEL_ORIGIN: PANEL_ORIGIN,
            channel: function (taskId) { return new Channel(taskId || ''); },
            // 打开面板页并绑定信任窗口：window.open 不带 noopener，返回的引用即跨源信任源
            open: function (panelUrl, taskId) {
                var win = null;
                try { win = window.open(panelUrl, '_blank'); } catch (e) { win = null; }
                return new Channel(taskId || '').attach(win);
            }
        };
    })();

    const PANEL_TASK = 'greasyfork-484615';
    const PANEL_URL = 'https://xload.net/panel/greasyfork-484615.html';
    const STORAGE_KEY = 'sn-update-ticket-number.settings';

    const DEFAULTS = { enableLink: true, showCopyIcon: true };

    function copyText(text) {
        if (!text) return Promise.resolve(false);
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(function () { return true; });
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function fallbackCopy(text) {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, text.length);
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(area);
        return ok;
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
        } catch (e) { /* ignore */ }
        return Object.assign({}, DEFAULTS);
    }

    function saveSettings(settings) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
    }

    function resolveTableName() {
        const match = window.location.pathname.match(/\/(\w*)\.do/);
        return match && match[1] ? match[1] : null;
    }

    function findNumberInput(tableName) {
        let elementId = tableName + '.number';
        if (!document.getElementById(elementId)) return null;
        if (document.getElementById('sys_readonly.' + elementId)) elementId = 'sys_readonly.' + elementId;
        return document.getElementById(elementId);
    }

    function buildTicketUrl(tableName) {
        let sysId = '';
        try { sysId = window.g_form ? window.g_form.getUniqueValue() : ''; } catch (e) { sysId = ''; }
        return 'https://' + window.location.hostname + '/nav_to.do?uri=' + tableName + '.do?sys_id=' + sysId;
    }

    function replaceNumberWithLink(tableName, numberInput, showCopyIcon) {
        const ticketUrl = buildTicketUrl(tableName);

        const numberLink = document.createElement('a');
        numberLink.textContent = numberInput.value;
        numberLink.title = '[WK - SN] Convert Number in link';
        numberLink.href = '#';
        numberLink.addEventListener('click', function (e) {
            e.preventDefault();
            copyText(ticketUrl);
        });

        numberInput.replaceWith(numberLink);

        if (showCopyIcon) {
            const numberCopy = document.createElement('i');
            numberCopy.style.marginLeft = '0.5em';
            numberCopy.className = 'icon-copy';
            numberCopy.title = '[WK - SN] Copy Number';
            numberCopy.addEventListener('click', function () { copyText(numberInput.value); });
            numberLink.parentNode.appendChild(numberCopy);
        }
    }

    function extractValue(data) {
        if (data && typeof data === 'object' && 'value' in data) return data.value;
        return data;
    }

    const tableName = resolveTableName();
    const numberInput = tableName ? findNumberInput(tableName) : null;

    if (numberInput) {
        const settings = loadSettings();
        if (settings.enableLink) replaceNumberWithLink(tableName, numberInput, settings.showCopyIcon);
    }

    const channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
    channel.send('hello', { table: tableName || '', number: numberInput ? numberInput.value : '' });

    channel.on('copyUrl', function (data) {
        if (!tableName) {
            channel.send('error', { message: '未找到工单上下文' });
            return;
        }
        channel.send('progress', {});
        copyText(buildTicketUrl(tableName)).then(function (ok) {
            if (ok) channel.send('done', {});
            else channel.send('error', { message: '复制失败' });
        }).catch(function () { channel.send('error', { message: '复制失败' }); });
    });

    channel.on('copyNumber', function (data) {
        const number = numberInput ? numberInput.value : '';
        if (!number) {
            channel.send('error', { message: '未找到工单编号' });
            return;
        }
        channel.send('progress', {});
        copyText(number).then(function (ok) {
            if (ok) channel.send('done', {});
            else channel.send('error', { message: '复制失败' });
        }).catch(function () { channel.send('error', { message: '复制失败' }); });
    });

    channel.on('enableLink', function (data) {
        const settings = loadSettings();
        settings.enableLink = !!extractValue(data);
        saveSettings(settings);
        channel.send('done', {});
    });

    channel.on('showCopyIcon', function (data) {
        const settings = loadSettings();
        settings.showCopyIcon = !!extractValue(data);
        saveSettings(settings);
        channel.send('done', {});
    });
})();
