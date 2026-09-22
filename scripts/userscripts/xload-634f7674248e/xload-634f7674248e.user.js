// ==UserScript==
// @name         Inline SVG Replacer
// @namespace    https://mkpo.li/
// @version      0.1.1
// @description  Replace all img tags with src as an SVG file into inline SVG tags
// @author       mkpoli
// @match        *://*/*
// @exclude      *://*.google.*/*
// @grant        none
// @license      CC0
// @downloadURL https://update.greasyfork.org/scripts/484635/Inline%20SVG%20Replacer.user.js
// @updateURL https://update.greasyfork.org/scripts/484635/Inline%20SVG%20Replacer.meta.js
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

    /* --------------------------------------------------------------------- *
     * 面板标识
     * --------------------------------------------------------------------- */

    var PANEL_TASK = 'xload-634f7674248e';
    var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-634f7674248e/panel.html';

    /* --------------------------------------------------------------------- *
     * 配置
     * --------------------------------------------------------------------- */

    var DEFAULT_RASTER_EXTENSIONS = [
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp',
        'ico', 'avif', 'apng', 'tiff', 'tif'
    ];

    var config = {
        enabled: true,
        timeout: 8000,
        debug: false,
        skipExtensions: DEFAULT_RASTER_EXTENSIONS.slice()
    };

    /* --------------------------------------------------------------------- *
     * 工具函数
     * --------------------------------------------------------------------- */

    function log() {
        if (!config.debug) return;
        try {
            console.log.apply(console, ['[Inline SVG Replacer]'].concat(
                Array.prototype.slice.call(arguments)
            ));
        } catch (e) { /* 忽略日志异常 */ }
    }

    function extensionOf(url) {
        if (!url) return '';
        var clean = String(url).split('#')[0].split('?')[0];
        var slash = clean.lastIndexOf('/');
        var name = slash === -1 ? clean : clean.slice(slash + 1);
        var dot = name.lastIndexOf('.');
        if (dot === -1 || dot === name.length - 1) return '';
        return name.slice(dot + 1).toLowerCase();
    }

    function isRasterExtension(ext) {
        return !!ext && config.skipExtensions.indexOf(ext) !== -1;
    }

    // 扩展名属于已知位图格式时，无需发起网络请求
    function isNonSvgImage(img) {
        if (!img || typeof img.src !== 'string') return true;
        return isRasterExtension(extensionOf(img.src));
    }

    function isSvgResponse(response) {
        if (!response || !response.headers || typeof response.headers.get !== 'function') {
            return false;
        }
        var contentType = response.headers.get('Content-Type');
        return !!contentType && contentType.toLowerCase().indexOf('image/svg+xml') !== -1;
    }

    function fetchWithTimeout(url, timeout) {
        if (!(timeout > 0) || typeof AbortController !== 'function') {
            return fetch(url);
        }
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, timeout);
        return fetch(url, { signal: controller.signal }).then(
            function (response) {
                clearTimeout(timer);
                return response;
            },
            function (error) {
                clearTimeout(timer);
                throw error;
            }
        );
    }

    function parseSvgDocument(text) {
        var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        if (!doc) return null;
        var root = doc.documentElement;
        if (!root || root.nodeName === 'parsererror') return null;
        if (doc.querySelector && doc.querySelector('parsererror')) return null;
        return doc.querySelector ? doc.querySelector('svg') : null;
    }

    function copyAttributes(from, to) {
        Array.prototype.forEach.call(from.attributes, function (attr) {
            try {
                to.setAttribute(attr.name, attr.value);
            } catch (e) { /* 忽略非法属性名 */ }
        });
    }

    /* --------------------------------------------------------------------- *
     * 核心：把单张 <img> 内联为 <svg>
     * --------------------------------------------------------------------- */

    function inlineImage(img) {
        if (!config.enabled) return Promise.resolve(false);
        if (!img || !img.parentNode || isNonSvgImage(img)) return Promise.resolve(false);

        var src = img.src;
        if (!src) return Promise.resolve(false);

        return fetchWithTimeout(src, config.timeout)
            .then(function (response) {
                if (!isSvgResponse(response)) return null;
                return response.text();
            })
            .then(function (svgText) {
                if (typeof svgText !== 'string') return false;
                var svg = parseSvgDocument(svgText);
                if (!svg || !img.parentNode) return false;
                copyAttributes(img, svg);
                img.replaceWith(svg);
                log('replaced', src);
                return true;
            })
            .catch(function (error) {
                console.error('Error inlining SVG:', error);
                return false;
            });
    }

    function collectCandidates(root) {
        var scope = root && typeof root.querySelectorAll === 'function' ? root : document;
        var images = scope.querySelectorAll('img');
        var candidates = [];
        Array.prototype.forEach.call(images, function (img) {
            if (img.src && !isNonSvgImage(img)) candidates.push(img);
        });
        return candidates;
    }

    function inlineImages(candidates, onProgress) {
        var total = candidates.length;
        if (!total) return Promise.resolve(0);

        var done = 0;
        var replaced = 0;

        return Promise.all(candidates.map(function (img) {
            return inlineImage(img).then(function (ok) {
                if (ok) replaced++;
                done++;
                if (onProgress) {
                    try { onProgress(done, total, replaced); } catch (e) { /* 忽略上报异常 */ }
                }
                return ok;
            });
        })).then(function () { return replaced; });
    }

    function replaceAllImages(root, onProgress) {
        return inlineImages(collectCandidates(root), onProgress);
    }

    /* --------------------------------------------------------------------- *
     * XLoadPanel 通信
     * --------------------------------------------------------------------- */

    var panelChannel = null;

    function sendPanel(type, data) {
        if (!panelChannel) return;
        try { panelChannel.send(type, data); } catch (e) { /* 忽略通道异常 */ }
    }

    function reportProgress(done, total, replaced) {
        sendPanel('progress', { done: done, total: total, replaced: replaced });
    }

    function reportDone(result) {
        sendPanel('done', result || {});
    }

    function reportError(error) {
        sendPanel('error', {
            message: error && error.message ? error.message : String(error)
        });
    }

    function toBoolean(value, fallback) {
        if (typeof value === 'boolean') return value;
        if (value === 1 || value === '1' || value === 'true' || value === 'on') return true;
        if (value === 0 || value === '0' || value === 'false' || value === 'off') return false;
        return fallback;
    }

    function toNonNegativeNumber(value, fallback) {
        var n = Number(value);
        if (!isFinite(n) || n < 0) return fallback;
        return n;
    }

    function toExtensionList(value, fallback) {
        if (typeof value !== 'string') return fallback;
        var list = value.split(',').map(function (item) {
            return item.trim().toLowerCase().replace(/^\./, '');
        }).filter(Boolean);
        return list.length ? list : fallback;
    }

    // 面板下发的控件值同步到本地配置
    function applyPanelData(data) {
        if (!data || typeof data !== 'object') return;
        if ('enabled' in data) config.enabled = toBoolean(data.enabled, config.enabled);
        if ('debug' in data) config.debug = toBoolean(data.debug, config.debug);
        if ('timeout' in data) config.timeout = toNonNegativeNumber(data.timeout, config.timeout);
        if ('skipExtensions' in data) {
            config.skipExtensions = toExtensionList(data.skipExtensions, config.skipExtensions);
        }
    }

    function handleInline(data) {
        applyPanelData(data);
        var candidates = collectCandidates(document);

        if (!config.enabled) {
            reportProgress(candidates.length, candidates.length, 0);
            reportDone({ replaced: 0, total: candidates.length, disabled: true });
            return Promise.resolve();
        }

        reportProgress(0, candidates.length, 0);
        return inlineImages(candidates, function (done, total, replaced) {
            reportProgress(done, total, replaced);
        }).then(function (replaced) {
            reportDone({ replaced: replaced, total: candidates.length });
        });
    }

    function handleScan(data) {
        applyPanelData(data);
        var candidates = collectCandidates(document);
        reportDone({ count: candidates.length, enabled: config.enabled });
        return Promise.resolve();
    }

    function guard(handler) {
        return function (data, msg) {
            try {
                var result = handler(data, msg);
                if (result && typeof result.catch === 'function') result.catch(reportError);
            } catch (error) {
                reportError(error);
            }
        };
    }

    // 打开面板页并建立通信；已连接时补发 hello 通知面板页就绪
    function connectPanel() {
        if (panelChannel) {
            sendPanel('hello', {});
            return panelChannel;
        }
        try {
            panelChannel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
        } catch (e) {
            panelChannel = null;
            return null;
        }
        panelChannel.on('inline', guard(handleInline));
        panelChannel.on('scan', guard(handleScan));
        panelChannel.send('hello', {});
        return panelChannel;
    }

    /* --------------------------------------------------------------------- *
     * 页面入口
     * --------------------------------------------------------------------- */

    var LAUNCHER_ID = 'inline-svg-replacer-panel';

    function createLauncher() {
        if (!document.body || document.getElementById(LAUNCHER_ID)) return;
        var button = document.createElement('button');
        button.id = LAUNCHER_ID;
        button.type = 'button';
        button.textContent = 'SVG';
        button.title = 'Open Inline SVG Replacer panel';
        button.setAttribute('aria-label', 'Open Inline SVG Replacer panel');
        button.style.cssText = [
            'position:fixed',
            'right:12px',
            'bottom:12px',
            'z-index:2147483647',
            'width:32px',
            'height:32px',
            'padding:0',
            'border:0',
            'border-radius:50%',
            'background:rgba(17,17,17,.65)',
            'color:#fff',
            'font-size:11px',
            'line-height:32px',
            'text-align:center',
            'cursor:pointer',
            'opacity:.45'
        ].join(';');
        button.addEventListener('click', connectPanel);
        document.body.appendChild(button);
    }

    function bootstrap() {
        createLauncher();
        if (!config.enabled) return;
        replaceAllImages(document).then(function (replaced) {
            log('inline pass complete, replaced', replaced);
        }).catch(function (error) {
            console.error('Error inlining SVG:', error);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }
})();
