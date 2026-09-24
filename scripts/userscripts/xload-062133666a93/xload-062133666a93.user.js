// ==UserScript==
// @name        ClipSaver for Spotify
// @description Adds a download button to the Spotify player and track lists that opens an audio download link for the current track. A companion panel page can trigger downloads and show progress.
// @version     1.0.0
// @license     MIT
// @run-at      document-start
// @noframes
// @grant       GM_openInTab
// @grant       GM.openInTab
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @match       https://open.spotify.com/*
// ==/UserScript==
(function () {
  'use strict';

  var PANEL_TASK = 'xload-062133666a93';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-062133666a93/panel.html';
  var DOWNLOAD_BASE = 'https://www.spotmelo.com/en?s=80&url=';

  // XLoadPanel —— 面板通信层（脚本侧精简实现，协议与站点 assets/panel/panel.js 对齐）
  // 消息格式：{type, data, _from}；请求-响应：{_id, _request}
  // 信任模型：跨源仅信任面板页来源 PANEL_ORIGIN；优先使用 open() 返回的窗口引用
  (function () {
    'use strict';
    var PREFIX = 'xload-panel:';
    var PANEL_ORIGIN = 'https://xload.net';

    // ---------- 运行日志（仅内存环形缓冲，刷新即清；不脱敏、不持久化） ----------
    var LOG_LIMIT = 200;
    var LOG_PUSH = 'log';
    var LOG_PULL = 'logs';
    var LOG_LEVELS = ["debug","info","warn","error"];
    var PING = '_ping';
    var PONG = '_pong';
    var _logs = [];
    var _channels = [];

    function _safeData(data) {
      if (data == null) return null;
      if (typeof data !== 'object') return data;
      try { return JSON.parse(JSON.stringify(data)); }
      catch (e) { try { return String(data); } catch (e2) { return '[unserializable]'; } }
    }

    // 向所有已连接面板推送日志（走 _post，避免触发 send 的埋点造成递归）
    function _broadcastLog(entry) {
      for (var i = 0; i < _channels.length; i++) {
        try { _channels[i]._post({ type: LOG_PUSH, data: entry, _from: _channels[i]._id }); } catch (e) {}
      }
    }

    function log(level, event, data) {
      try {
        var lv = String(level || 'info');
        if (LOG_LEVELS.indexOf(lv) < 0) lv = 'info';
        var entry = {
          ts: Date.now(),
          level: lv,
          event: String(event == null ? '' : event),
          data: _safeData(data)
        };
        _logs.push(entry);
        if (_logs.length > LOG_LIMIT) _logs.splice(0, _logs.length - LOG_LIMIT);
        _broadcastLog(entry);
      } catch (e) {}
    }

    // 返回深拷贝快照，避免调用方改动缓冲内条目
    function logsSnapshot() {
      try {
        return _logs.map(function (e) {
          return { ts: e.ts, level: e.level, event: e.event, data: _safeData(e.data) };
        });
      } catch (e) { return []; }
    }

    // 全局未捕获错误与 Promise 拒绝：只记录，不拦截站点默认行为
    try {
      window.addEventListener('error', function (ev) {
        log('error', 'window.error', {
          message: ev && ev.message,
          filename: ev && ev.filename,
          lineno: ev && ev.lineno,
          colno: ev && ev.colno,
          stack: ev && ev.error && ev.error.stack
        });
      });
      window.addEventListener('unhandledrejection', function (ev) {
        var reason = ev && ev.reason;
        log('error', 'window.unhandledrejection', {
          message: reason && reason.message ? reason.message : String(reason),
          stack: reason && reason.stack
        });
      });
    } catch (e) {}

    function Channel(taskId) {
      this._id = String(taskId || '');
      this._seq = 0;
      this._handlers = {};
      this._pending = {};
      this._bc = null;
      this._opener = null;
      this._panelWin = null;
      // 双通道（postMessage + BroadcastChannel）会重复投递同一消息，用实例唯一 nonce + 序号标记 _mid 去重
      this._nonce = 'c' + Math.random().toString(36).slice(2, 10);
      this._msgSeq = 0;
      this._seen = {};
      this._seenCount = 0;
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
      _channels.push(this);
      log('info', 'channel', { taskId: this._id });
    }

    Channel.prototype.attach = function (panelWin) {
      if (panelWin) this._panelWin = panelWin;
      return this;
    };

    Channel.prototype._post = function (msg) {
      if (msg._mid == null) msg._mid = this._nonce + ':' + (++this._msgSeq);
      if (this._panelWin) { try { this._panelWin.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
      else if (this._opener) { try { this._opener.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
      if (this._bc) { try { this._bc.postMessage(msg); } catch (e) {} }
    };

    Channel.prototype._dispatch = function (msg) {
      if (!msg || typeof msg.type !== 'string') return;
      // 双通道可能重复投递同一消息，按 _mid 去重，避免命令被重复执行
      if (msg._mid != null) {
        if (this._seen[msg._mid]) return;
        this._seen[msg._mid] = 1;
        if (++this._seenCount > 500) { this._seen = {}; this._seenCount = 0; }
      }
      // 忽略其它脚本通道回环的日志推送，避免同任务多通道间日志互相转发形成死循环
      if (msg.type === LOG_PUSH) return;
      // 内建心跳：面板探活时回应 pong，脚本重载后新通道可借此被面板重新发现
      if (msg.type === PING) {
        this._post({ type: PONG, data: {}, _from: this._id });
        return;
      }
      if (msg._id != null && !msg._request && Object.prototype.hasOwnProperty.call(this._pending, msg._id)) {
        var p = this._pending[msg._id];
        delete this._pending[msg._id];
        if (p._timer) clearTimeout(p._timer);
        if (msg.error != null) p.reject(new Error(String(msg.error)));
        else p.resolve(msg.data == null ? {} : msg.data);
        return;
      }
      log('debug', 'recv', { type: msg.type });
      // 内建响应：面板拉取运行日志快照
      if (msg._request && msg._id != null && msg.type === LOG_PULL) {
        this._post({ type: LOG_PULL, data: { logs: logsSnapshot() }, _id: msg._id, _from: this._id });
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
      log('debug', 'send', { type: type });
      this._post({ type: type, data: data == null ? {} : data, _from: this._id });
      return this;
    };

    // 请求-响应：等待面板回包，默认超时 8000ms
    Channel.prototype.request = function (type, data, timeout) {
      var self = this;
      var id = ++this._seq;
      var t = typeof timeout === 'number' && timeout > 0 ? timeout : 8000;
      log('debug', 'request', { type: type });
      return new Promise(function (resolve, reject) {
        self._pending[id] = { resolve: resolve, reject: reject };
        self._pending[id]._timer = setTimeout(function () {
          if (self._pending[id]) {
            delete self._pending[id];
            log('error', 'request.timeout', { type: type });
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
      var idx = _channels.indexOf(this);
      if (idx >= 0) _channels.splice(idx, 1);
      log('info', 'close', {});
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
      this._seen = {};
      this._seenCount = 0;
      this._bc = null;
      this._opener = null;
      this._panelWin = null;
    };

    window.XLoadPanel = {
      CHANNEL_PREFIX: PREFIX,
      PANEL_ORIGIN: PANEL_ORIGIN,
      LOG_LIMIT: LOG_LIMIT,
      // 可选上报接口：脚本可在关键功能点记录自定义运行事件
      log: function (level, event, data) { log(level, event, data); return this; },
      logs: function () { return logsSnapshot(); },
      clearLogs: function () { _logs = []; return this; },
      channel: function (taskId) { return new Channel(taskId || ''); },
      // 打开面板页并绑定信任窗口：window.open 不带 noopener，返回的引用即跨源信任源
      open: function (panelUrl, taskId) {
        var win = null;
        try { win = window.open(panelUrl, '_blank'); } catch (e) { win = null; }
        return new Channel(taskId || '').attach(win);
      }
    };
  })();

  /* ------------------------------------------------------------------ */
  /* 持久化：优先 GM 存储，回退 localStorage                             */
  /* ------------------------------------------------------------------ */
  var Store = {
    get: function (key, fallback) {
      try { if (typeof GM_getValue === 'function') return GM_getValue(key, fallback); } catch (e) {}
      try {
        var raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; } } catch (e) {}
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  /* ------------------------------------------------------------------ */
  /* 通用工具                                                            */
  /* ------------------------------------------------------------------ */
  var Utils = {
    openTab: function (url, options) {
      var opts = options || { active: true, insert: true, setParent: true };
      try {
        if (typeof GM_openInTab === 'function') return GM_openInTab(url, opts);
        if (typeof GM !== 'undefined' && GM && typeof GM.openInTab === 'function') return GM.openInTab(url, opts);
      } catch (e) {}
      return window.open(url, '_blank');
    },
    trackIdFromHref: function (href) {
      if (!href) return null;
      var uriMatch = href.match(/spotify:track:([a-zA-Z0-9]+)/);
      if (uriMatch) return uriMatch[1];
      var webMatch = href.match(/track\/([a-zA-Z0-9]+)/);
      return webMatch ? webMatch[1] : null;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 面板桥接                                                            */
  /* ------------------------------------------------------------------ */
  var Panel = {
    channel: null,
    onApply: null,
    config: { enabled: true, tracklistButtonSize: 18 },
    apply: function (data) {
      if (!data || typeof data !== 'object') return;
      var src = data.values || data.controls || data;
      Object.keys(Panel.config).forEach(function (key) {
        if (src[key] !== undefined) Panel.config[key] = src[key];
      });
      if (typeof Panel.onApply === 'function') {
        try { Panel.onApply(Panel.config); } catch (e) {}
      }
    },
    report: function (type, data) {
      if (!Panel.channel) return;
      try { Panel.channel.send(type, data || {}); } catch (e) {}
    },
    bind: function (channel, actions) {
      Object.keys(actions).forEach(function (id) {
        channel.on(id, function (data) {
          try {
            Panel.report('progress', { action: id, status: 'running' });
            Promise.resolve(actions[id](data)).then(function () {
              Panel.report('done', { action: id, status: 'done' });
            }).catch(function (err) {
              Panel.report('error', { action: id, message: String(err && err.message || err) });
            });
          } catch (err) {
            Panel.report('error', { action: id, message: String(err && err.message || err) });
          }
        });
      });
    },
    open: function (actions) {
      if (Panel.channel) return Panel.channel;
      if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') return null;
      var channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
      Panel.channel = channel;
      Panel.bind(channel, actions);
      channel.send('hello', {});
      try { window.XLoadPanel.log('info', 'panel.ready', { task: PANEL_TASK }); } catch (e) {}
      return channel;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Spotify                                                             */
  /* ------------------------------------------------------------------ */
  var Spotify = {
    _debounceTimer: null,
    _playerAnchorPollTimer: null,
    _pendingPlayerAnchor: null,
    ICON_PATHS: [
      'M503.806 583.233c2.47 3.347 5.795 5.422 9.469 5.422s6.998-2.075 9.469-5.422l198.018-268.933c1.328-1.81 1.849-4.715 1.142-7.332-0.731-2.595-2.454-4.194-4.279-4.194h-128.113v-273.353c0-5.11-1.351-10.221-4.047-14.059-2.702-3.922-6.252-5.881-9.787-5.881h-124.78c-3.534 0-7.084 1.949-9.787 5.881-2.704 3.844-4.047 8.956-4.047 14.059v273.353h-128.121c-1.825 0-3.55 1.6-4.279 4.194-0.706 2.618-0.208 5.508 1.142 7.332l198.002 268.933z',
      'M881.309 622.062l-119.507-82.941h-74.672l125.271 101.382-137.726-1.804c-3.992 0-9.729 3.849-11.538 7.051l-38.258 92.528h-224.016l-38.258-92.528c-1.793-3.201-7.531-7.051-11.539-7.051h-136.904l124.469-99.578h-74.705l-119.49 82.941c-18.657 11.196-29.868 36.961-24.864 57.311l22.155 121.494c5.036 20.335 27.247 36.962 49.375 36.962h643.554c22.112 0 44.34-16.627 49.375-36.962l22.128-121.494c5.020-20.35-6.175-46.117-24.848-57.311v0 0z'
    ],
    extractTrackIds: function () {
      var ids = [];
      var seen = {};
      var links = document.querySelectorAll('aside a[href]');
      Array.prototype.forEach.call(links, function (link) {
        var id = Utils.trackIdFromHref(link.getAttribute('href'));
        if (id && !seen[id]) { seen[id] = true; ids.push(id); }
      });
      return ids;
    },
    buildDownloadUrl: function (trackId) {
      return DOWNLOAD_BASE + encodeURIComponent('https://open.spotify.com/track/' + trackId);
    },
    downloadTrack: function (trackId) {
      if (!trackId) return false;
      Utils.openTab(this.buildDownloadUrl(trackId));
      try { window.XLoadPanel.log('info', 'download.trigger', { trackId: trackId }); } catch (e) {}
      return true;
    },
    downloadCurrent: function () {
      var ids = this.extractTrackIds();
      return this.downloadTrack(ids.length ? ids[0] : null);
    },
    createDownloadSvg: function (color, size) {
      var svgNS = 'http://www.w3.org/2000/svg';
      var iconColor = color || '#1ed760';
      var iconSize = size || 20;
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('viewBox', '0 0 1045 1024');
      svg.setAttribute('xmlns', svgNS);
      svg.setAttribute('width', String(iconSize));
      svg.setAttribute('height', String(iconSize));
      this.ICON_PATHS.forEach(function (d) {
        var path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', iconColor);
        svg.appendChild(path);
      });
      return svg;
    },
    createDownloadButton: function (sourceButton, stripAttributes, svgSize, onClick) {
      var spotify = this;
      var button = sourceButton.cloneNode(false);
      if (stripAttributes) {
        var className = button.getAttribute('class');
        Array.prototype.slice.call(button.attributes).forEach(function (attr) {
          button.removeAttribute(attr.name);
        });
        if (className) button.setAttribute('class', className);
      }
      button.style.cursor = 'pointer';
      button.setAttribute('userscript-v', 'true');
      button.appendChild(spotify.createDownloadSvg('#1ed760', svgSize));
      button.addEventListener('click', onClick);
      return button;
    },
    isVisible: function (el) {
      if (!el || !el.isConnected) return false;
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      var style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    },
    findPlayerAnchor: function () {
      var selectors = ['[data-testid="fullscreen-mode-button"]', '[data-testid="pip-toggle-button"]'];
      for (var i = 0; i < selectors.length; i++) {
        var anchor = document.querySelector(selectors[i]);
        if (anchor && this.isVisible(anchor)) return anchor;
      }
      return null;
    },
    stopPlayerAnchorPoll: function () {
      if (!this._playerAnchorPollTimer) return;
      clearTimeout(this._playerAnchorPollTimer);
      this._playerAnchorPollTimer = null;
    },
    getPlayerAnchor: function () {
      var spotify = this;
      var pollMs = 500;
      var timeoutMs = 1e4;
      var anchor = this.findPlayerAnchor();
      if (anchor) return Promise.resolve(anchor);
      if (this._pendingPlayerAnchor) return this._pendingPlayerAnchor;
      this._pendingPlayerAnchor = new Promise(function (resolve) {
        var elapsed = 0;
        var poll = function () {
          spotify._playerAnchorPollTimer = null;
          var found = spotify.findPlayerAnchor();
          if (found) {
            spotify._pendingPlayerAnchor = null;
            resolve(found);
            return;
          }
          elapsed += pollMs;
          if (elapsed >= timeoutMs) {
            spotify._pendingPlayerAnchor = null;
            resolve(null);
            return;
          }
          spotify._playerAnchorPollTimer = setTimeout(poll, pollMs);
        };
        spotify.stopPlayerAnchorPoll();
        spotify._playerAnchorPollTimer = setTimeout(poll, pollMs);
      });
      return this._pendingPlayerAnchor;
    },
    injectPlayer: function () {
      var spotify = this;
      return this.getPlayerAnchor().then(function (anchor) {
        if (!anchor || !anchor.parentElement) return;
        if (!Panel.config.enabled) return;
        if (anchor.parentElement.querySelector('button[userscript-v="true"]')) return;
        var button = spotify.createDownloadButton(anchor, true, 30, function () {
          spotify.downloadCurrent();
        });
        anchor.parentElement.insertBefore(button, anchor.parentElement.firstChild);
        spotify.stopPlayerAnchorPoll();
      });
    },
    extractTrackIdFromElement: function (el) {
      var scope = el.closest('[role="row"]') || el;
      var links = scope.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        var id = Utils.trackIdFromHref(links[i].getAttribute('href'));
        if (id) return id;
      }
      return null;
    },
    injectTracklist: function () {
      var spotify = this;
      if (!Panel.config.enabled) return;
      var rows = document.querySelectorAll('[data-testid="tracklist-row"]:not([track-userscript-v="true"])');
      Array.prototype.forEach.call(rows, function (tracklist) {
        tracklist.setAttribute('track-userscript-v', 'true');
        var gridcells = tracklist.querySelectorAll('[role="gridcell"]');
        var gridcell = gridcells[gridcells.length - 1];
        if (!gridcell) return;
        var sourceButton = gridcell.querySelector('button');
        if (!sourceButton) return;
        var button = spotify.createDownloadButton(sourceButton, false, Panel.config.tracklistButtonSize || 18, function (e) {
          e.stopPropagation();
          e.preventDefault();
          var trackId = spotify.extractTrackIdFromElement(gridcell);
          spotify.downloadTrack(trackId);
        });
        gridcell.insertBefore(button, gridcell.firstChild);
      });
    },
    scheduleInject: function () {
      var spotify = this;
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(function () {
        spotify.injectPlayer();
        spotify.injectTracklist();
      }, 300);
    },
    start: function () {
      if (!/spotify\.com/.test(window.location.host)) return;
      var spotify = this;
      new MutationObserver(function () { spotify.scheduleInject(); })
        .observe(document.body, { childList: true, subtree: true });
      this.scheduleInject();
    }
  };

  var ACTIONS = {
    download_current: function (data) {
      Panel.apply(data);
      var ok = Spotify.downloadCurrent();
      if (!ok) throw new Error('No track found on the page');
    },
    open_downloader: function (data) {
      Panel.apply(data);
      Spotify.downloadCurrent();
    }
  };

  Spotify.start();

  (function connectPanel() {
    var key = 'panel-connect.' + PANEL_TASK;
    if (Store.get(key, false)) return;
    Store.set(key, true);
    Panel.open(ACTIONS);
  })();
}());
