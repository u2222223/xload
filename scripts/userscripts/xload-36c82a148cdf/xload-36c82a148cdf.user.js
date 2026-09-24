// ==UserScript==
// @name        ClipSaver for Douyin
// @description Adds a download button to the Douyin player control bar that opens a download launcher for the current video. A companion panel page can trigger downloads and show progress.
// @version     1.0.0
// @license     MIT
// @run-at      document-start
// @noframes
// @grant       GM_openInTab
// @grant       GM.openInTab
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @match       https://www.douyin.com/*
// ==/UserScript==
(function () {
  'use strict';

  var PANEL_TASK = 'xload-36c82a148cdf';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-36c82a148cdf/panel.html';
  var DOWNLOAD_BASE = 'https://www.tool77.com/';

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
    openDownloader: function (url, lang) {
      var target = url || window.location.href;
      Utils.openTab(DOWNLOAD_BASE + (lang || 'zh-CN') + '/v/downloader?url=' + encodeURIComponent(target));
    },
    createDownloadSvg: function (color, width, height) {
      var colorValue = color || '#FFF';
      var w = width || 25;
      var h = height || 25;
      var SVG_NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('viewBox', '0 0 1024 1024');
      svg.setAttribute('version', '1.1');
      svg.setAttribute('xmlns', SVG_NS);
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute(
        'd',
        'M684.5 512H573.1V389.8c0-11.2-9.1-20.4-20.4-20.4h-81.5c-11.3 0-20.4 9.1-20.4 20.4v122.4l-112.4 0.6c-4 0-7.1 2.3-8.5 5.5 0 0.1-0.1 0.1-0.1 0.2-0.3 0.6-0.3 1.3-0.4 2-0.1 0.6-0.3 1.2-0.2 1.8 0 0.1-0.1 0.3-0.1 0.4 0 0.4 0.2 0.7 0.3 1.1 0.2 0.8 0.3 1.6 0.7 2.4 0.2 0.4 0.4 0.7 0.6 1 0.3 0.6 0.6 1.2 1 1.7l168.2 188c0.4 0.4 0.8 0.6 1.2 1 0.2 0.2 0.3 0.5 0.6 0.7 0.2 0.2 0.5 0.2 0.8 0.4 0.7 0.4 1.4 0.7 2.1 1 0.2 0.1 0.5 0.2 0.7 0.2 2.9 0.9 6 0.6 8.3-1.3 0.5-0.4 0.8-1.1 1.2-1.6 0.3-0.2 0.6-0.4 0.9-0.7l175.2-187.8c0.5-0.6 0.8-1.3 1.2-1.9 0.2-0.3 0.4-0.5 0.5-0.9 0.4-0.8 0.6-1.6 0.7-2.3 0.1-0.4 0.3-0.6 0.3-1v-1c0.6-5.4-3.6-9.7-9.1-9.7zM471.3 349.1h81.5c11.3 0 20.4-9.1 20.4-20.4v-20.4c0-11.2-9.1-20.4-20.4-20.4h-81.5c-11.3 0-20.4 9.1-20.4 20.4v20.4c0 11.3 9.1 20.4 20.4 20.4zM512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 814.6c-202.4 0-366.5-164.1-366.5-366.6 0-202.4 164.1-366.5 366.5-366.5S878.5 309.6 878.5 512 714.4 878.6 512 878.6z'
      );
      path.setAttribute('fill', colorValue);
      svg.appendChild(path);
      return svg;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 面板桥接                                                            */
  /* ------------------------------------------------------------------ */
  var Panel = {
    channel: null,
    onApply: null,
    config: { enabled: true, pollInterval: 777 },
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
  /* Douyin                                                              */
  /* ------------------------------------------------------------------ */
  var Douyin = {
    downloadCurrent: function () {
      Utils.openDownloader(window.location.href, 'zh-CN');
      try { window.XLoadPanel.log('info', 'download.trigger', { url: window.location.href }); } catch (e) {}
    },
    inject: function () {
      var controllers = document.querySelectorAll('.xg-inner-controls:not([data-clipsaver="true"])');
      Array.prototype.forEach.call(controllers, function (controller) {
        controller.setAttribute('data-clipsaver', 'true');
        var rightGrid = controller.querySelector('.xg-right-grid');
        if (!rightGrid) return;
        var fullscreen = rightGrid.querySelector('.xgplayer-fullscreen');
        if (!fullscreen) return;
        var downloadButton = fullscreen.cloneNode(false);
        downloadButton.style.display = 'flex';
        downloadButton.style.alignItems = 'center';
        downloadButton.style.justifyContent = 'center';
        downloadButton.style.margin = '0 7px';
        downloadButton.appendChild(Utils.createDownloadSvg('#FFF', 20, 20));
        rightGrid.before(downloadButton);
        downloadButton.addEventListener('click', function () { Douyin.downloadCurrent(); });
      });
    },
    start: function () {
      if (!/douyin\.com/.test(window.location.host)) return;
      setInterval(function () { Douyin.inject(); }, Panel.config.pollInterval || 777);
    }
  };

  var ACTIONS = {
    download_current: function (data) {
      Panel.apply(data);
      Douyin.downloadCurrent();
    },
    open_downloader: function (data) {
      Panel.apply(data);
      Douyin.downloadCurrent();
    }
  };

  Douyin.start();

  (function connectPanel() {
    var key = 'panel-connect.' + PANEL_TASK;
    if (Store.get(key, false)) return;
    Store.set(key, true);
    Panel.open(ACTIONS);
  })();
}());
