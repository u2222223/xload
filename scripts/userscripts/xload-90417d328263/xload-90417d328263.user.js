// ==UserScript==
// @name         页面调试助手
// @name:zh-CN   页面调试助手
// @name:en      Page Debug Assistant
// @version      1.0.0
// @description  在页面上屏蔽指定元素、加载元素间距标注工具、执行自定义脚本并查看页面调试信息。
// @description:zh-CN 在页面上屏蔽指定元素、加载元素间距标注工具、执行自定义脚本并查看页面调试信息。
// @description:en Hide elements, load an element-spacing inspector, run custom scripts and inspect page debug information.
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  var PANEL_TASK = 'xload-90417d328263';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-90417d328263/panel.html';

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

  var CFG = { POS: 'float_pos' };

  function getCfg(key, def) {
    try { var v = GM_getValue(key, undefined); return v === undefined ? def : v; }
    catch (e) { return def; }
  }

  function setCfg(key, val) {
    try { GM_setValue(key, val); } catch (e) {}
  }

  function toast(msg, ms) {
    var t = document.getElementById('xload-debug-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'xload-debug-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 20px;border-radius:50px;z-index:2147483647;font-size:14px;max-width:80vw;box-shadow:0 5px 15px rgba(0,0,0,.3);';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 3000);
  }

  function describeElement(el) {
    if (!el || !el.tagName) return '';
    var id = el.id ? '#' + el.id : '';
    var cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    return el.tagName.toLowerCase() + id + cls;
  }

  function startBlockElement(ch) {
    toast('请点击要屏蔽的元素');
    ch.send('progress', { message: '请在页面上点击要屏蔽的元素' });
    var handler = function (e) {
      e.preventDefault();
      e.stopPropagation();
      var target = e.target;
      var desc = describeElement(target);
      if (target) target.style.display = 'none';
      document.removeEventListener('click', handler, true);
      ch.send('done', { element: desc });
      toast('🚫 元素已隐藏');
    };
    document.addEventListener('click', handler, true);
  }

  function loadSpacing(ch) {
    var existing = document.getElementById('xload-spacing-script');
    if (existing) {
      ch.send('done', { loaded: existing.dataset.loaded === 'true' });
      toast('📏 标注工具已加载，按住 Alt 查看元素间距');
      return;
    }
    var script = document.createElement('script');
    script.id = 'xload-spacing-script';
    script.src = 'https://unpkg.com/spacingjs';
    script.onload = function () {
      script.dataset.loaded = 'true';
      ch.send('done', { loaded: true });
      toast('📏 标注工具加载完成，按住 Alt 查看元素间距');
    };
    script.onerror = function () {
      script.remove();
      ch.send('error', { message: '标注工具加载失败' });
    };
    document.body.appendChild(script);
  }

  function runScript(code) {
    var result;
    try {
      result = (0, eval)(code);
    } catch (e) {
      throw new Error(e && e.message ? e.message : String(e));
    }
    if (result && typeof result === 'object') {
      try { result = JSON.stringify(result); } catch (e) { result = String(result); }
    }
    return result;
  }

  function collectDebugInfo() {
    return [
      'Title: ' + document.title,
      'URL: ' + location.href,
      'UserAgent: ' + navigator.userAgent,
      'Screen: ' + screen.width + 'x' + screen.height,
      'Cookie: ' + document.cookie,
      'LastModified: ' + document.lastModified
    ].join('\n');
  }

  var panelChannel = null;

  function bindCommands(ch) {
    ch.on('block_element', function () {
      try {
        startBlockElement(ch);
      } catch (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      }
    });

    ch.on('load_spacing', function () {
      try {
        loadSpacing(ch);
      } catch (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      }
    });

    ch.on('run_js', function (data) {
      var code = data && data.code != null ? String(data.code) : '';
      if (!code.trim()) { ch.send('error', { message: '请输入要执行的脚本内容' }); return; }
      ch.send('progress', { message: '正在执行脚本…' });
      try {
        var result = runScript(code);
        ch.send('done', { result: result === undefined ? 'undefined' : String(result) });
        toast('脚本已执行');
      } catch (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      }
    });

    ch.on('debug_info', function () {
      try {
        var info = collectDebugInfo();
        console.log(info);
        ch.send('done', { info: info });
      } catch (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      }
    });
  }

  function openPanel() {
    try {
      if (panelChannel) { try { panelChannel.close(); } catch (e) {} }
      panelChannel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
      bindCommands(panelChannel);
      panelChannel.send('hello', {});
      window.XLoadPanel.log('info', 'panel.open', { task: PANEL_TASK });
    } catch (e) {
      toast('无法打开功能面板');
    }
  }

  function makeDraggable(btn) {
    var dragging = false, moved = false, sx = 0, sy = 0, il = 0, it = 0;
    btn.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      var rect = btn.getBoundingClientRect();
      il = rect.left; it = rect.top;
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      btn.style.left = (il + dx) + 'px';
      btn.style.top = (it + dy) + 'px';
    });
    window.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      if (moved) setCfg(CFG.POS, { left: btn.style.left, top: btn.style.top });
    });
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!moved) openPanel();
    });
  }

  function createFloatButton() {
    var pos = getCfg(CFG.POS, { left: '10px', top: '65%' });
    var btn = document.createElement('div');
    btn.id = 'xload-debug-btn';
    btn.textContent = '🐞';
    btn.title = '页面调试助手：点击打开功能面板';
    btn.style.cssText = 'position:fixed;left:' + (pos.left || '10px') + ';top:' + (pos.top || '65%')
      + ';width:44px;height:44px;border-radius:50%;background:rgba(30,30,30,.85);color:#fff;'
      + 'display:flex;align-items:center;justify-content:center;font-size:20px;cursor:move;'
      + 'z-index:2147483646;box-shadow:0 4px 15px rgba(0,0,0,.2);user-select:none;';
    makeDraggable(btn);
    return btn;
  }

  function init() {
    document.body.appendChild(createFloatButton());
    try {
      GM_registerMenuCommand('打开功能面板', openPanel);
      GM_registerMenuCommand('查看页面调试信息', function () {
        var info = collectDebugInfo();
        console.log(info);
        toast('调试信息已输出到控制台', 4000);
      });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
