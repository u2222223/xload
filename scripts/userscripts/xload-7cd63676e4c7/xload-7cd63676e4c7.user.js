// ==UserScript==
// @name          유튜브 팟 플레이어로 보기 버튼 추가
// @namespace     유튜브 팟 플레이어로 보기 버튼 추가
// @version       0.5
// @description   유튜브 동영상을 팟 플레이어로 열 수 있는 버튼을 추가합니다. 기존 영상은 일시 정지 됩니다.
// @match         *://*.youtube.com/*
// @icon          https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @author        mickey90427 <mickey90427@naver.com>
// @downloadURL https://update.greasyfork.org/scripts/484602/%EC%9C%A0%ED%8A%9C%EB%B8%8C%20%ED%8C%9F%20%ED%94%8C%EB%A0%88%EC%9D%B4%EC%96%B4%EB%A1%9C%20%EB%B3%B4%EA%B8%B0%20%EB%B2%84%ED%8A%BC%20%EC%B6%94%EA%B0%80.user.js
// @updateURL https://update.greasyfork.org/scripts/484602/%EC%9C%A0%ED%8A%9C%EB%B8%8C%20%ED%8C%9F%20%ED%94%8C%EB%A0%88%EC%9D%B4%EC%96%B4%EB%A1%9C%20%EB%B3%B4%EA%B8%B0%20%EB%B2%84%ED%8A%BC%20%EC%B6%94%EA%B0%80.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'potplayer-button';
    const LOGO_ID = 'logo';
    const VIDEO_SELECTOR = '.html5-main-video';
    const PROTOCOL_BASE = 'potplayer:https://www.youtube.com/watch?v=';
    const RETRY_INTERVAL_MS = 100;

    const PANEL_TASK = 'greasyfork-484602';
    const PANEL_URL = 'https://xload.net/panel/greasyfork-484602.html';

    const BUTTON_STYLE = 'background-color: #ff0; color: #000; border: none; padding: 10px; margin-left: 10px; cursor: pointer; border-radius: 5px;';

    const OPEN_MODE_CUSTOM = '직접 입력';
    const OPEN_MODE_START = '처음부터';

    function getVideoID() {
        return new URLSearchParams(window.location.search).get('v');
    }

    function getVideoElement() {
        return document.querySelector(VIDEO_SELECTOR);
    }

    function getVideoState() {
        const video = getVideoElement();
        if (!video) return null;
        return {
            videoId: getVideoID(),
            currentTime: Number.isFinite(video.currentTime) ? Math.floor(video.currentTime) : 0,
            duration: Number.isFinite(video.duration) ? Math.floor(video.duration) : 0
        };
    }

    function isVideoReady() {
        const video = getVideoElement();
        return Boolean(video && Number.isFinite(video.duration) && video.duration > 0);
    }

    function pauseVideo() {
        const video = getVideoElement();
        if (video) video.pause();
    }

    function createPotPlayerURL(videoID, startTime) {
        const params = new URLSearchParams({ t: String(startTime) });
        return PROTOCOL_BASE + videoID + '?' + params.toString();
    }

    function openInPotPlayer() {
        const videoID = getVideoID();
        const video = getVideoElement();
        if (!videoID || !video) return;

        pauseVideo();
        window.location.href = createPotPlayerURL(videoID, Math.max(0, Math.floor(video.currentTime)));
    }

    function createPotPlayerButton() {
        if (document.getElementById(BUTTON_ID)) return;

        const logoContainer = document.getElementById(LOGO_ID);
        if (!logoContainer || !isVideoReady()) return;

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.textContent = 'Open in PotPlayer';
        button.style.cssText = BUTTON_STYLE;
        button.addEventListener('click', openInPotPlayer);

        logoContainer.parentNode.insertBefore(button, logoContainer.nextSibling);
    }

    function startButtonWatcher() {
        setInterval(createPotPlayerButton, RETRY_INTERVAL_MS);
    }

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

    function resolveStartTime(data) {
        const mode = data && data['open-mode'];
        if (mode === OPEN_MODE_START) return 0;
        if (mode === OPEN_MODE_CUSTOM) {
            const seconds = Math.floor(Number(data['custom-seconds']));
            if (!Number.isFinite(seconds) || seconds < 0) {
                throw new Error('시작 시간(초)이 올바르지 않습니다.');
            }
            return seconds;
        }
        const state = getVideoState();
        if (!state) {
            throw new Error('재생 중인 유튜브 플레이어를 찾을 수 없습니다.');
        }
        return state.currentTime;
    }

    function handleOpenPotPlayer(data) {
        const videoID = getVideoID();
        if (!videoID) {
            throw new Error('현재 페이지에서 유튜브 영상을 찾을 수 없습니다.');
        }
        const startTime = resolveStartTime(data);
        pauseVideo();
        window.location.href = createPotPlayerURL(videoID, startTime);
        return { videoId: videoID, startTime: startTime };
    }

    function handlePauseVideo() {
        const state = getVideoState();
        if (!state) {
            throw new Error('재생 중인 유튜브 플레이어를 찾을 수 없습니다.');
        }
        pauseVideo();
        return state;
    }

    function handleVideoStatus() {
        const state = getVideoState();
        if (!state) {
            throw new Error('재생 중인 유튜브 플레이어를 찾을 수 없습니다.');
        }
        return state;
    }

    function runPanelAction(channel, actionId, task) {
        channel.send('progress', { action: actionId, message: 'running' });
        try {
            const result = task();
            channel.send('done', { action: actionId, result: result || {} });
        } catch (err) {
            channel.send('error', { action: actionId, message: (err && err.message) || String(err) });
        }
    }

    function setupPanelChannel() {
        if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') return;

        const channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
        channel.send('hello', {});

        channel.on('open-potplayer', (data) => runPanelAction(channel, 'open-potplayer', () => handleOpenPotPlayer(data)));
        channel.on('pause-video', () => runPanelAction(channel, 'pause-video', handlePauseVideo));
        channel.on('video-status', () => runPanelAction(channel, 'video-status', handleVideoStatus));
    }

    startButtonWatcher();
    setupPanelChannel();
})();
