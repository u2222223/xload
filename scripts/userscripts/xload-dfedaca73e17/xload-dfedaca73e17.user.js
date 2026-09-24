// ==UserScript==
// @name         x-hide-bars
// @namespace    https://tampermonkey.net/
// @version      1.0.3
// @description  X mobile: swipe up hides top/bottom bars, stays hidden on stop, swipe down restores. PageUp key does not restore. Compose FAB always hidden. Semantic selectors only, no class names.
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @run-at       document-start
// @grant        none
// @license AGPL
// @downloadURL https://update.greasyfork.org/scripts/597090/x-hide-bars.user.js
// @updateURL https://update.greasyfork.org/scripts/597090/x-hide-bars.meta.js
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

    // ---------- 运行日志（仅内存环形缓冲，刷新即清；不脱敏、不持久化） ----------
    var LOG_LIMIT = 200;
    var LOG_PUSH = 'log';
    var LOG_PULL = 'logs';
    var LOG_LEVELS = ["debug","info","warn","error"];
    var _logs = [];
    var _channels = [];

    function _safeData(data) {
      if (data == null) return null;
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
      if (this._panelWin) { try { this._panelWin.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
      else if (this._opener) { try { this._opener.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
      if (this._bc) { try { this._bc.postMessage(msg); } catch (e) {} }
    };

    Channel.prototype._dispatch = function (msg) {
      if (!msg || typeof msg.type !== 'string') return;
      // 忽略其它脚本通道回环的日志推送，避免同任务多通道间日志互相转发形成死循环
      if (msg.type === LOG_PUSH) return;
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

  /* ==================== 面板接入配置 ==================== */
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-dfedaca73e17/panel.html';
  var PANEL_TASK = 'xload-dfedaca73e17';

  /* ==================== 常量与可变配置 ==================== */
  var TRANSITION = 'transform .25s ease';
  var BAR_OFFSET = 16;
  var TOP_MAX_TOP = 2;
  var TOP_MIN_HEIGHT = 30;
  var TOP_MAX_BOTTOM_RATIO = 0.5;
  var FAB_SELECTOR = 'a[href="/compose/post"]';

  var DEFAULTS = {
    threshold: 4,
    keySuppressMs: 600,
    scanDebounceMs: 500
  };

  var threshold = DEFAULTS.threshold;
  var keySuppressMs = DEFAULTS.keySuppressMs;

  /* ==================== 运行时状态 ==================== */
  var topBar = null;
  var bottomBar = null;
  var curHidden = false;          // 当前应处状态：true=隐藏
  var keySuppressUntil = 0;       // PageUp 键盘翻页抑制期（不等于手势下滑）
  var scanTimer = null;
  var fabHidden = true;           // 撰写悬浮按钮是否隐藏（默认保持原行为）
  var lastY = getScrollY();
  var barState = new WeakMap();   // 元素自身记录隐藏态，避免不同元素串键
  var panel = null;
  var observer = null;

  /* ==================== 工具函数 ==================== */
  function getScrollY() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function toPositiveNumber(value, fallback) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : fallback;
  }

  function isVisible(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function findFixedAncestor(el) {
    var n = el;
    while (n && n !== document.documentElement) {
      var pos = getComputedStyle(n).position;
      if (pos === 'fixed' || pos === 'sticky') return n;
      n = n.parentElement;
    }
    return null;
  }

  /* ==================== 栏位查找 ==================== */
  function findBottomBar() {
    var navs = document.querySelectorAll('nav[role="navigation"]');
    for (var i = 0; i < navs.length; i++) {
      var nav = navs[i];
      if (nav.querySelector('a[href="/home"]') &&
          nav.querySelector('a[href="/notifications"]')) {
        return findFixedAncestor(nav) || nav;
      }
    }
    return null;
  }

  function findTopBar() {
    var all = document.querySelectorAll('body *');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!isVisible(el)) continue;
      if (getComputedStyle(el).position !== 'fixed') continue;
      var r = el.getBoundingClientRect();
      if (r.top > TOP_MAX_TOP) continue;
      if (r.height < TOP_MIN_HEIGHT) continue;
      if (r.bottom > window.innerHeight * TOP_MAX_BOTTOM_RATIO) continue;
      if (bottomBar && (bottomBar === el || bottomBar.contains(el) || el.contains(bottomBar))) continue;
      return el;
    }
    return null;
  }

  /* ==================== 撰写悬浮按钮（href 跨版本/跨语言稳定） ==================== */
  function applyFabVisibility() {
    var fab = document.querySelector(FAB_SELECTOR);
    if (!fab) return;
    if (fabHidden) {
      if (fab.style.visibility !== 'hidden') {
        fab.style.visibility = 'hidden';
        fab.style.pointerEvents = 'none';
      }
    } else if (fab.style.visibility === 'hidden') {
      fab.style.visibility = '';
      fab.style.pointerEvents = '';
    }
  }

  /* ==================== 扫描与栏位应用 ==================== */
  function rescan() {
    bottomBar = findBottomBar();
    topBar = findTopBar();
    applyFabVisibility();
    XLoadPanel.log('debug', 'rescan', {
      hasTop: !!topBar,
      hasBottom: !!bottomBar
    });
  }

  function measureHeight(el) {
    var max = 0;
    var stack = [el];
    while (stack.length) {
      var cur = stack.pop();
      if (!isVisible(cur)) continue;
      var h = cur.getBoundingClientRect().height;
      if (h > max) max = h;
      for (var i = 0; i < cur.children.length; i++) stack.push(cur.children[i]);
    }
    return max;
  }

  function applyBar(el, hide, isTop) {
    if (!el) return;
    if (barState.get(el) === hide) return; // 状态未变不动画
    barState.set(el, hide);
    el.style.transition = TRANSITION;
    var d = measureHeight(el) + BAR_OFFSET;
    el.style.transform = hide
      ? 'translateY(' + (isTop ? -d : d) + 'px)'
      : 'translateY(0)';
    el.style.pointerEvents = hide ? 'none' : '';
  }

  function setBars(hide) {
    var changed = hide !== curHidden;
    curHidden = hide;
    applyBar(topBar, hide, true);
    applyBar(bottomBar, hide, false);
    if (changed) XLoadPanel.log('debug', 'bars.state', { hidden: hide });
  }

  /* ==================== 滚动手势 ==================== */
  function onScroll() {
    var y = getScrollY();
    var delta = y - lastY;
    // PageUp 等键盘翻页触发的滚动：只更新基准，不改变栏状态
    if (Date.now() < keySuppressUntil) {
      lastY = y;
      return;
    }
    if (Math.abs(delta) >= threshold) {
      // 上滑浏览（scrollY 增大）→ 隐藏；下滑（scrollY 减小）→ 恢复；停止不动
      setBars(delta > 0);
      lastY = y;
    }
  }

  function clearKeySuppress() {
    keySuppressUntil = 0;
  }

  // SPA 中节点会被重建：重扫后保持当前隐藏状态，而不是强制恢复，
  // 避免与滚动中持续的 DOM 变更互相打架
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      rescan();
      setBars(curHidden);
    }, DEFAULTS.scanDebounceMs);
  }

  /* ==================== 面板通信 ==================== */
  function readValues(data) {
    if (data && typeof data === 'object') {
      if (data.values && typeof data.values === 'object') return data.values;
      return data;
    }
    return {};
  }

  function report(type, payload) {
    if (panel) panel.send(type, payload);
  }

  function runAction(name, fn, data) {
    report('progress', { action: name });
    try {
      var result = fn(readValues(data));
      report('done', { action: name, result: result == null ? null : result });
      XLoadPanel.log('info', 'action.done', { action: name });
    } catch (e) {
      var msg = e && e.message ? e.message : String(e);
      report('error', { action: name, message: msg });
      XLoadPanel.log('error', 'action.error', { action: name, message: msg });
    }
  }

  function onPanelCommand(name, fn) {
    panel.on(name, function (data) {
      runAction(name, fn, data);
    });
  }

  function initPanel() {
    if (panel) return panel;
    try {
      panel = XLoadPanel.open(PANEL_URL, PANEL_TASK);
    } catch (e) {
      panel = XLoadPanel.channel(PANEL_TASK);
    }
    panel.send('hello', {});
    XLoadPanel.log('info', 'panel.ready', { task: PANEL_TASK });

    onPanelCommand('apply-bars', function (v) {
      setBars(v.hidden === true);
      return { hidden: curHidden };
    });

    onPanelCommand('rescan', function () {
      rescan();
      setBars(curHidden);
      return { hidden: curHidden, hasTop: !!topBar, hasBottom: !!bottomBar };
    });

    onPanelCommand('apply-fab', function (v) {
      fabHidden = v['hide-fab'] !== false;
      applyFabVisibility();
      return { hidden: fabHidden };
    });

    onPanelCommand('apply-gesture', function (v) {
      threshold = toPositiveNumber(v.threshold, DEFAULTS.threshold);
      keySuppressMs = toPositiveNumber(v['key-suppress-ms'], DEFAULTS.keySuppressMs);
      return { threshold: threshold, keySuppressMs: keySuppressMs };
    });

    return panel;
  }

  /* ==================== 启动 ==================== */
  function boot() {
    rescan();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', scheduleScan);
    // PageUp 键盘翻页：抑制期内不恢复栏；真实手势出现立即解除抑制
    window.addEventListener('keydown', function (e) {
      if (e.key === 'PageUp') keySuppressUntil = Date.now() + keySuppressMs;
    });
    window.addEventListener('wheel', clearKeySuppress, { passive: true });
    window.addEventListener('touchstart', clearKeySuppress, { passive: true });
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (window.top === window) initPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
