// ==UserScript==
// @name        ClipSaver for X
// @description Adds a download control to X (Twitter) posts and media grids, opening a download launcher for the post. A companion panel page can trigger downloads and show progress.
// @version     1.0.0
// @license     MIT
// @run-at      document-start
// @noframes
// @grant       GM_openInTab
// @grant       GM.openInTab
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @match       https://x.com/*
// @match       https://twitter.com/*
// ==/UserScript==
(function () {
  'use strict';

  var PANEL_TASK = 'xload-90867ea645e8';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-90867ea645e8/panel.html';
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
  var SUPPORTED_LANGS = {
    en: 'en', es: 'es', fr: 'fr', pt: 'pt', ru: 'ru', ja: 'ja', de: 'de', ko: 'ko',
    it: 'it', id: 'id', tr: 'tr', pl: 'pl', uk: 'uk', nl: 'nl', vi: 'vi', th: 'th',
    ar: 'ar', fa: 'fa', hi: 'hi', ms: 'ms', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW'
  };

  var Utils = {
    getLang: function () {
      var raw = String(navigator.language || navigator.userLanguage || 'en');
      var code = raw.split('-')[0];
      if (code === 'zh') return raw === 'zh-CN' ? 'zh-CN' : 'zh-TW';
      return SUPPORTED_LANGS[code] || 'en';
    },
    openTab: function (url, options) {
      var opts = options || { active: true, insert: true, setParent: true };
      try {
        if (typeof GM_openInTab === 'function') return GM_openInTab(url, opts);
        if (typeof GM !== 'undefined' && GM && typeof GM.openInTab === 'function') return GM.openInTab(url, opts);
      } catch (e) {}
      return window.open(url, '_blank');
    }
  };

  /* ------------------------------------------------------------------ */
  /* 面板桥接                                                            */
  /* ------------------------------------------------------------------ */
  var Panel = {
    channel: null,
    onApply: null,
    config: { enabled: true, showSensitive: true },
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
  /* X (Twitter)                                                         */
  /* ------------------------------------------------------------------ */
  var XDownloader = {
    ICON: '<g class="download"><path d="M11.99 16l-5.7-5.7L7.7 8.88l3.29 3.3V2.59h2v9.59l3.3-3.3 1.41 1.42-5.71 5.7zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" /></g>',
    MEDIA_SELECTORS: [
      'div[role="progressbar"]',
      'button[data-testid="playButton"]',
      'div[data-testid="videoComponent"]',
      'a[href="/settings/content_you_see"]',
      'div.media-image-container',
      'div.media-preview-container',
      'div[aria-labelledby]>div:first-child>div[role="button"][tabindex="0"]'
    ],
    isTweetdeck: function () { return window.location.host.indexOf('tweetdeck') !== -1; },
    extractStatusId: function (url) {
      if (!url) return null;
      var match = String(url).match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    },
    download: function (statusIds) {
      var url = DOWNLOAD_BASE + Utils.getLang() + '/v/downloader?url=' + encodeURIComponent('https://x.com/_/status/' + statusIds);
      Utils.openTab(url);
      try { window.XLoadPanel.log('info', 'download.trigger', { statusIds: String(statusIds) }); } catch (e) {}
    },
    downloadCurrent: function () {
      var fromPath = XDownloader.extractStatusId(window.location.href);
      XDownloader.download(fromPath || window.location.href);
    },
    injectStyles: function () {
      if (document.getElementById('clipsaver-x-style')) return;
      var style = document.createElement('style');
      style.id = 'clipsaver-x-style';
      style.textContent = [
        '.clipsaver-x-down { margin-left: 12px; order: 99; }',
        '.clipsaver-x-down:hover > div > div > div > div { color: rgba(29, 161, 242, 1); }',
        '.clipsaver-x-down:hover > div > div > div > div > div { background-color: rgba(29, 161, 242, 0.1); }',
        '.clipsaver-x-down:active > div > div > div > div > div { background-color: rgba(29, 161, 242, 0.2); }',
        '.clipsaver-x-down:hover svg { color: rgba(29, 161, 242, 1); }',
        '.clipsaver-x-down:hover div:first-child:not(:last-child) { background-color: rgba(29, 161, 242, 0.1); }',
        '.clipsaver-x-down:active div:first-child:not(:last-child) { background-color: rgba(29, 161, 242, 0.2); }',
        '.clipsaver-x-down.clipsaver-x-media { position: absolute; right: 0; }',
        '.clipsaver-x-down.clipsaver-x-media > div { display: flex; border-radius: 99px; margin: 2px; }',
        '.clipsaver-x-down.clipsaver-x-media > div > div { display: flex; margin: 6px; color: #fff; }',
        '.clipsaver-x-down.clipsaver-x-media:hover > div { background-color: rgba(255, 255, 255, 0.6); }',
        '.clipsaver-x-down.clipsaver-x-media:hover > div > div { color: rgba(29, 161, 242, 1); }',
        '.clipsaver-x-down.clipsaver-x-media:not(:hover) > div > div { filter: drop-shadow(0 0 1px #000); }'
      ].join('\n');
      (document.head || document.documentElement).appendChild(style);
    },
    addButtonTo: function (article) {
      if (article.dataset.clipsaverDetected) return;
      article.dataset.clipsaverDetected = 'true';
      var statusIds = Array.prototype.map.call(article.querySelectorAll('a[href*="/status/"]'), function (el) {
        return XDownloader.extractStatusId(el.href);
      }).filter(function (id) { return id; });
      if (statusIds.length === 0) return;
      var hasMedia = article.querySelector(XDownloader.MEDIA_SELECTORS.join(','));
      if (!hasMedia) return;
      var btnGroup = article.querySelector('div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions');
      if (!btnGroup) return;
      var btnShare = Array.prototype.slice.call(
        btnGroup.querySelectorAll(':scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a')
      ).pop().parentNode;
      var btnDownload = btnShare.cloneNode(true);
      btnDownload.classList.add('clipsaver-x-down');
      btnDownload.style.marginLeft = '10px';
      btnDownload.style.cursor = 'pointer';
      var innerButton = btnDownload.querySelector('button');
      if (innerButton) innerButton.removeAttribute('disabled');
      var svgContainer = XDownloader.isTweetdeck() ? btnDownload.firstElementChild : btnDownload.querySelector('svg');
      if (svgContainer) {
        if (XDownloader.isTweetdeck()) {
          svgContainer.innerHTML = '<svg viewBox="0 0 20 20" width="15" height="15">' + XDownloader.ICON + '</svg>';
          svgContainer.removeAttribute('rel');
          btnDownload.classList.replace('pull-left', 'pull-right');
        } else {
          svgContainer.innerHTML = XDownloader.ICON;
        }
      }
      btnGroup.insertBefore(btnDownload, btnShare.nextSibling);
      btnDownload.onclick = function () { XDownloader.download(statusIds); };
      if (Panel.config.showSensitive) {
        var reveal = article.querySelector('div[aria-labelledby] div[role="button"][tabindex="0"]:not([data-testid]) > div[dir] > span > span');
        if (reveal) reveal.click();
      }
    },
    addButtonToMedia: function (listitems) {
      Array.prototype.forEach.call(listitems, function (li) {
        if (li.dataset.clipsaverDetected) return;
        li.dataset.clipsaverDetected = 'true';
        var statusElement = li.querySelector('a[href*="/status/"]');
        var statusId = statusElement ? XDownloader.extractStatusId(statusElement.href) : null;
        if (!statusId) return;
        var btnDownload = document.createElement('div');
        btnDownload.classList.add('clipsaver-x-down', 'clipsaver-x-media');
        btnDownload.style.cursor = 'pointer';
        btnDownload.innerHTML = '<div><div><svg viewBox="0 0 20 20" width="15" height="15">' + XDownloader.ICON + '</svg></div></div>';
        li.style.position = li.style.position || 'relative';
        li.appendChild(btnDownload);
        btnDownload.onclick = function () { XDownloader.download(statusId); };
      });
    },
    detect: function (node) {
      var tag = node.tagName;
      var article = (tag === 'ARTICLE' && node) || (tag === 'DIV' && (node.querySelector('article') || node.closest('article')));
      if (article) XDownloader.addButtonTo(article);
      var listitems = (tag === 'LI' && node.getAttribute('role') === 'listitem' && [node]) ||
        (tag === 'DIV' && node.querySelectorAll('li[role="listitem"]')) || null;
      if (listitems) XDownloader.addButtonToMedia(listitems);
    },
    start: function () {
      if (!/(twitter|x)\.com/.test(window.location.host)) return;
      XDownloader.injectStyles();
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.forEach.call(mutation.addedNodes, function (node) {
            if (node.nodeType === 1) XDownloader.detect(node);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  var ACTIONS = {
    download_current: function (data) {
      Panel.apply(data);
      XDownloader.downloadCurrent();
    },
    open_downloader: function (data) {
      Panel.apply(data);
      XDownloader.downloadCurrent();
    }
  };

  XDownloader.start();

  (function connectPanel() {
    var key = 'panel-connect.' + PANEL_TASK;
    if (Store.get(key, false)) return;
    Store.set(key, true);
    Panel.open(ACTIONS);
  })();
}());
