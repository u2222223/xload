// ==UserScript==
// @name        ClipSaver for Instagram
// @description Adds a floating download button over Instagram videos, reels and posts that opens a download launcher for the current media. A companion panel page can trigger downloads and show progress.
// @version     1.0.0
// @license     MIT
// @run-at      document-start
// @noframes
// @grant       GM_openInTab
// @grant       GM.openInTab
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @match       https://www.instagram.com/*
// ==/UserScript==
(function () {
  'use strict';

  var PANEL_TASK = 'xload-7d879054b2be';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-7d879054b2be/panel.html';
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
    },
    openDownloader: function (url) {
      var target = url || window.location.href;
      Utils.openTab(DOWNLOAD_BASE + Utils.getLang() + '/v/downloader?url=' + encodeURIComponent(target));
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
  /* 悬浮下载按钮                                                        */
  /* ------------------------------------------------------------------ */
  var DownloadHud = {
    instances: {},
    VALID_POSITIONS: [
      'top-center', 'bottom-center', 'left-center', 'right-center',
      'top-left-quarter', 'top-three-quarter', 'bottom-left-quarter', 'bottom-three-quarter',
      'right-top-quarter', 'right-three-quarter', 'left-top-quarter', 'left-three-quarter'
    ],
    createStyleText: function (id, zIndex, buttonSize) {
      return [
        '#' + id + ' { position: fixed; z-index: ' + zIndex + ' !important; overflow: hidden;',
        'background: rgba(0,0,0,0.3); width: ' + buttonSize + 'px; height: ' + buttonSize + 'px;',
        'border-radius: 50%; display: none; align-items: center; justify-content: center;',
        'cursor: pointer; pointer-events: auto !important; font-size: 16px; }',
        '#' + id + '::before { content: ""; position: absolute; inset: 0; border-radius: inherit;',
        'padding: 2px; background: linear-gradient(90deg,red,orange,yellow,green,cyan,blue,violet,red);',
        'background-size: 200% 200%; opacity: 0; transition: opacity .25s;',
        '-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);',
        '-webkit-mask-composite: xor; mask-composite: exclude; }',
        '#' + id + '.clipsaver-hover::before { opacity: 1; animation: clipsaver-rainbow 3s linear infinite; }',
        '#' + id + ' svg { fill: currentColor; pointer-events: none; }',
        '@keyframes clipsaver-rainbow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }'
      ].join('\n');
    },
    isPointInRect: function (x, y, rect) {
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    },
    isVisibleElement: function (element, minTargetSize) {
      var rect = element.getBoundingClientRect();
      if (rect.width <= minTargetSize || rect.height <= minTargetSize) return false;
      var style = window.getComputedStyle(element);
      return !(style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0');
    },
    computePosition: function (position, rect, size, edgeOffset) {
      var top = rect.top + edgeOffset;
      var left = rect.left + rect.width / 2 - size / 2;
      switch (position) {
        case 'bottom-center': top = rect.bottom - size - edgeOffset; break;
        case 'left-center': top = rect.top + rect.height / 2 - size / 2; left = rect.left + edgeOffset; break;
        case 'right-center': top = rect.top + rect.height / 2 - size / 2; left = rect.right - size - edgeOffset; break;
        case 'right-top-quarter': top = rect.top + rect.height * 0.25 - size / 2; left = rect.right - size - edgeOffset; break;
        case 'right-three-quarter': top = rect.top + rect.height * 0.75 - size / 2; left = rect.right - size - edgeOffset; break;
        case 'left-top-quarter': top = rect.top + rect.height * 0.25 - size / 2; left = rect.left + edgeOffset; break;
        case 'left-three-quarter': top = rect.top + rect.height * 0.75 - size / 2; left = rect.left + edgeOffset; break;
        case 'top-left-quarter': top = rect.top + edgeOffset; left = rect.left + rect.width * 0.25 - size / 2; break;
        case 'top-three-quarter': top = rect.top + edgeOffset; left = rect.left + rect.width * 0.75 - size / 2; break;
        case 'bottom-left-quarter': top = rect.bottom - size - edgeOffset; left = rect.left + rect.width * 0.25 - size / 2; break;
        case 'bottom-three-quarter': top = rect.bottom - size - edgeOffset; left = rect.left + rect.width * 0.75 - size / 2; break;
        case 'top-center':
        default: break;
      }
      return { top: top, left: left };
    },
    create: function (options) {
      var opts = options || {};
      var id = opts.id || 'clipsaver-hud';
      var zIndex = opts.zIndex || 2147483647;
      var buttonSize = opts.buttonSize || 40;
      var iconSize = opts.iconSize || 25;
      var iconColor = opts.iconColor || '#fff';
      var minTargetSize = opts.minTargetSize == null ? 50 : opts.minTargetSize;
      var targetSelector = opts.targetSelector || 'video';
      var extraTargetSelector = opts.extraTargetSelector || '';
      var getAnchorRect = opts.getAnchorRect || null;
      var onClick = opts.onClick || null;
      if (this.instances[id]) return this.instances[id].api;

      var self = this;
      var state = {
        activeTarget: null,
        mouseX: -500,
        mouseY: -500,
        destroyed: false,
        disabled: false,
        buttonPosition: opts.buttonPosition || 'top-center',
        buttonEdgeOffset: Number.isFinite(Number(opts.buttonEdgeOffset)) ? Number(opts.buttonEdgeOffset) : 15
      };

      var style = GM_addStyle(this.createStyleText(id, zIndex, buttonSize));
      var button = document.createElement('div');
      button.id = id;
      button.style.cursor = 'pointer!important';
      button.appendChild(Utils.createDownloadSvg(iconColor, iconSize, iconSize));
      (document.body || document.documentElement).appendChild(button);

      var updateButtonPos = function () {
        if (state.destroyed || !state.activeTarget || button.style.display === 'none') return;
        var rect = typeof getAnchorRect === 'function' ? getAnchorRect(state.activeTarget) : null;
        if (!rect) rect = state.activeTarget.getBoundingClientRect();
        if (!rect) return;
        var pos = self.computePosition(state.buttonPosition, rect, buttonSize, state.buttonEdgeOffset);
        var top = pos.top;
        var left = pos.left;
        if (left < 5) left = 5;
        if (top < 5) top = 5;
        if (top > window.innerHeight - buttonSize - 5) top = window.innerHeight - buttonSize - 5;
        if (left > window.innerWidth - buttonSize - 5) left = window.innerWidth - buttonSize - 5;
        button.style.top = top + 'px';
        button.style.left = left + 'px';
        button.style.zIndex = zIndex + '!important';
      };

      var pickTarget = function () {
        var targets = document.querySelectorAll(targetSelector);
        for (var i = 0; i < targets.length; i++) {
          var element = targets[i];
          var rect = element.getBoundingClientRect();
          if (!self.isPointInRect(state.mouseX, state.mouseY, rect)) continue;
          if (!self.isVisibleElement(element, minTargetSize)) continue;
          if (targetSelector === 'video' && element.readyState < 3) continue;
          return element;
        }
        if (extraTargetSelector) {
          var extraTargets = document.querySelectorAll(extraTargetSelector);
          for (var j = 0; j < extraTargets.length; j++) {
            var extra = extraTargets[j];
            if (self.isPointInRect(state.mouseX, state.mouseY, extra.getBoundingClientRect())) return extra;
          }
        }
        return null;
      };

      var checkHover = function () {
        if (state.destroyed) return;
        if (state.disabled) {
          button.style.display = 'none';
          state.activeTarget = null;
          return;
        }
        if (state.mouseX < 0 || state.mouseY < 0) return;
        var buttonRect = button.getBoundingClientRect();
        var isHoveringButton = button.style.display === 'flex' && self.isPointInRect(state.mouseX, state.mouseY, buttonRect);
        if (isHoveringButton) {
          button.classList.add('clipsaver-hover');
          return;
        }
        button.classList.remove('clipsaver-hover');
        var found = pickTarget();
        if (found) {
          state.activeTarget = found;
          button.style.display = 'flex';
          updateButtonPos();
        } else {
          button.style.display = 'none';
          state.activeTarget = null;
        }
      };

      var onMouseMove = function (event) {
        if (state.destroyed) return;
        state.mouseX = event.clientX;
        state.mouseY = event.clientY;
        checkHover();
      };
      var onMouseDown = function (event) {
        if (state.destroyed || state.disabled) return;
        if (button.style.display !== 'flex') return;
        if (!self.isPointInRect(event.clientX, event.clientY, button.getBoundingClientRect())) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof onClick === 'function') {
          Promise.resolve(onClick(state.activeTarget)).catch(function () {});
        }
      };
      var onScroll = function () {
        if (state.destroyed || state.disabled) return;
        if (state.activeTarget && button.style.display === 'flex') updateButtonPos();
      };

      window.addEventListener('mousemove', onMouseMove, true);
      window.addEventListener('mousedown', onMouseDown, true);
      window.addEventListener('scroll', onScroll, { passive: true, capture: true });
      var timer = setInterval(function () {
        if (state.destroyed) return;
        if (state.mouseX >= 0 && state.mouseY >= 0) checkHover();
      }, 300);

      var api = {
        getCurrentTargetElement: function () { return state.activeTarget; },
        hideButton: function () { button.style.display = 'none'; },
        disable: function () {
          state.disabled = true;
          button.style.display = 'none';
          state.activeTarget = null;
        },
        enable: function () {
          state.disabled = false;
          checkHover();
        },
        showButtonForTarget: function (target) {
          if (!target || state.disabled) return;
          state.activeTarget = target;
          button.style.display = 'flex';
          updateButtonPos();
        },
        setButtonPosition: function (position, edgeOffset) {
          if (self.VALID_POSITIONS.indexOf(position) >= 0) state.buttonPosition = position;
          if (edgeOffset != null && Number.isFinite(Number(edgeOffset))) state.buttonEdgeOffset = Number(edgeOffset);
          if (state.activeTarget && button.style.display === 'flex') updateButtonPos();
        },
        destroy: function () {
          if (state.destroyed) return;
          state.destroyed = true;
          clearInterval(timer);
          window.removeEventListener('mousemove', onMouseMove, true);
          window.removeEventListener('mousedown', onMouseDown, true);
          window.removeEventListener('scroll', onScroll, true);
          button.remove();
          try { style.remove(); } catch (e) {}
          delete self.instances[id];
        }
      };
      this.instances[id] = { api: api };
      return api;
    },
    mount: function (spec) {
      var options = spec || {};
      var getDownloadUrl = options.getDownloadUrl;
      if (typeof getDownloadUrl !== 'function') return null;
      var invokeDownload = options.invokeDownload || Utils.openDownloader;
      var buttonOptions = {};
      Object.keys(options).forEach(function (key) {
        if (key !== 'getDownloadUrl' && key !== 'invokeDownload') buttonOptions[key] = options[key];
      });
      buttonOptions.onClick = function (target) {
        if (!target) return;
        return Promise.resolve(getDownloadUrl(target)).then(function (url) {
          if (url && String(url).indexOf('undefined') === -1) invokeDownload(url);
        }).catch(function () {});
      };
      return this.create(buttonOptions);
    }
  };

  /* ------------------------------------------------------------------ */
  /* 面板桥接                                                            */
  /* ------------------------------------------------------------------ */
  var Panel = {
    channel: null,
    onApply: null,
    config: { enabled: true, buttonPosition: 'top-center', buttonSize: 40, iconSize: 25, edgeOffset: 15 },
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
  /* Instagram                                                           */
  /* ------------------------------------------------------------------ */
  var Instagram = {
    hud: null,
    getPlayUrl: function (target) {
      var clean = function (url) { return String(url).split('?')[0]; };
      var article = target && target.closest ? target.closest('article') : null;
      if (article) {
        var href = article.querySelector('a[href*="/p/"], a[href*="/reels/"], a[href*="/reel/"]');
        var value = href && href.getAttribute('href');
        if (value) return clean(window.location.origin + value);
      }
      return clean(window.location.href);
    },
    downloadCurrent: function () {
      Utils.openDownloader(Instagram.getPlayUrl(null));
      try { window.XLoadPanel.log('info', 'download.trigger', { url: window.location.href }); } catch (e) {}
    },
    start: function () {
      if (!/instagram\.com/.test(window.location.host)) return;
      Instagram.hud = DownloadHud.mount({
        id: 'clipsaver-instagram-hud',
        buttonSize: Panel.config.buttonSize,
        iconSize: Panel.config.iconSize,
        buttonEdgeOffset: Panel.config.edgeOffset,
        getDownloadUrl: function (target) { return Instagram.getPlayUrl(target); }
      });
      if (Instagram.hud && !Panel.config.enabled) Instagram.hud.disable();
    }
  };

  var ACTIONS = {
    download_current: function (data) {
      Panel.apply(data);
      Instagram.downloadCurrent();
    },
    open_downloader: function (data) {
      Panel.apply(data);
      Instagram.downloadCurrent();
    }
  };

  Panel.onApply = function (cfg) {
    if (!Instagram.hud) return;
    Instagram.hud.setButtonPosition(cfg.buttonPosition, cfg.edgeOffset);
    if (cfg.enabled) Instagram.hud.enable();
    else Instagram.hud.disable();
  };

  Instagram.start();

  (function connectPanel() {
    var key = 'panel-connect.' + PANEL_TASK;
    if (Store.get(key, false)) return;
    Store.set(key, true);
    Panel.open(ACTIONS);
  })();
}());
