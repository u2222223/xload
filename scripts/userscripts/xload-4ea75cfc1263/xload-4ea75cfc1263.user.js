// ==UserScript==
// @name         自定义搜索增强
// @name:zh-CN   自定义搜索增强
// @name:en      Custom Search Enhancer
// @version      1.0.0
// @description  使用可自定义的搜索引擎列表快速搜索选中文本，支持站点限定与整页地址等占位符。
// @description:zh-CN 使用可自定义的搜索引擎列表快速搜索选中文本，支持站点限定与整页地址等占位符。
// @description:en Quickly search selected text with a customizable engine list, supporting placeholders for host and page URL.
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  var PANEL_TASK = 'xload-4ea75cfc1263';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-4ea75cfc1263/panel.html';

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

  var CFG = {
    ENGINES: 'search_engines_json',
    POS: 'float_pos'
  };

  var DEFAULT_SEARCH_ENGINES = [
    { name: '谷歌搜索', icon: '', url: 'https://www.google.com/search?q=%s' },
    { name: '百度搜索', icon: '', url: 'https://www.baidu.com/s?wd=%s' },
    { name: '搜中文(谷歌)', icon: '', url: 'https://www.google.com/search?lr=lang_zh-CN&q=%s' },
    { name: '站内搜索(谷歌)', icon: '', url: 'https://www.google.com/search?q=site:%host%+%22%s%22' },
    { name: '维基百科', icon: '', url: 'https://zh.wikipedia.org/wiki/%s' },
    { name: 'GitHub', icon: '', url: 'https://github.com/search?q=%s' },
    { name: '有道词典', icon: '', url: 'http://dict.youdao.com/w/eng/%s' },
    { name: '页面快照(谷歌)', icon: '', url: 'http://www.google.com/search?q=cache:%url%' },
    { name: '网页时光机', icon: '', url: 'http://web.archive.org/%url%' },
    { name: '翻译页面(谷歌)', icon: '', url: 'https://translate.google.com/translate?sl=auto&tl=zh-CN&u=%url%' }
  ];

  function getCfg(key, def) {
    try { var v = GM_getValue(key, undefined); return v === undefined ? def : v; }
    catch (e) { return def; }
  }

  function setCfg(key, val) {
    try { GM_setValue(key, val); } catch (e) {}
  }

  function getSelection() {
    try { return window.getSelection().toString().trim(); } catch (e) { return ''; }
  }

  function toast(msg, ms) {
    var t = document.getElementById('xload-search-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'xload-search-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 20px;border-radius:50px;z-index:2147483647;font-size:14px;max-width:80vw;box-shadow:0 5px 15px rgba(0,0,0,.3);';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 3000);
  }

  function loadEngines() {
    var raw = getCfg(CFG.ENGINES, null);
    if (raw == null) return DEFAULT_SEARCH_ENGINES.slice();
    try {
      var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(function (item) {
          return item && typeof item.name === 'string' && typeof item.url === 'string';
        });
      }
    } catch (e) {}
    return DEFAULT_SEARCH_ENGINES.slice();
  }

  function findEngine(name) {
    var engines = loadEngines();
    for (var i = 0; i < engines.length; i++) {
      if (engines[i].name === name) return engines[i];
    }
    return engines[0] || null;
  }

  function buildSearchUrl(engine, query) {
    var target = engine.url;
    target = target.replace(/%host%/g, location.hostname);
    target = target.replace(/%url%/g, encodeURIComponent(location.href));
    if (target.indexOf('%s') >= 0) {
      target = target.replace(/%s/g, encodeURIComponent(query));
    }
    return target;
  }

  function runSearch(engineName, query) {
    var engine = findEngine(engineName);
    if (!engine) throw new Error('未找到可用的搜索引擎');
    var url = buildSearchUrl(engine, query);
    if (/%s/.test(url)) throw new Error('该搜索引擎需要搜索内容');
    window.open(url);
    return { engine: engine.name, url: url };
  }

  function resolveQuery(data) {
    var d = data || {};
    if (d.query != null && String(d.query).trim()) return String(d.query).trim();
    return getSelection();
  }

  var panelChannel = null;

  function bindCommands(ch) {
    ch.on('search', function (data) {
      var d = data || {};
      var query = resolveQuery(d);
      if (!query) { ch.send('error', { message: '请输入搜索内容或先在页面选中文本' }); return; }
      ch.send('progress', { message: '正在打开搜索结果…' });
      try {
        var result = runSearch(d.engine, query);
        ch.send('done', { engine: result.engine, url: result.url });
        toast('已打开搜索：' + result.engine);
      } catch (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      }
    });

    ch.on('save_engines', function (data) {
      var json = data && data.engines_json;
      if (json == null || String(json).trim() === '') { ch.send('error', { message: '搜索引擎列表不能为空' }); return; }
      var parsed;
      try { parsed = typeof json === 'string' ? JSON.parse(json) : json; }
      catch (e) { ch.send('error', { message: 'JSON 解析失败：' + e.message }); return; }
      if (!Array.isArray(parsed) || parsed.length === 0) { ch.send('error', { message: '列表必须是非空数组' }); return; }
      var valid = parsed.every(function (item) {
        return item && typeof item.name === 'string' && typeof item.url === 'string';
      });
      if (!valid) { ch.send('error', { message: '每一项必须包含 name 与 url 字段' }); return; }
      setCfg(CFG.ENGINES, JSON.stringify(parsed));
      ch.send('done', { count: parsed.length });
      toast('搜索引擎列表已保存');
    });

    ch.on('reset_engines', function () {
      setCfg(CFG.ENGINES, JSON.stringify(DEFAULT_SEARCH_ENGINES));
      ch.send('done', { count: DEFAULT_SEARCH_ENGINES.length });
      toast('已恢复默认搜索引擎列表');
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
    var pos = getCfg(CFG.POS, { left: '10px', top: '25%' });
    var btn = document.createElement('div');
    btn.id = 'xload-search-btn';
    btn.textContent = '🔍';
    btn.title = '自定义搜索增强：点击打开功能面板';
    btn.style.cssText = 'position:fixed;left:' + (pos.left || '10px') + ';top:' + (pos.top || '25%')
      + ';width:44px;height:44px;border-radius:50%;background:rgba(30,30,30,.85);color:#fff;'
      + 'display:flex;align-items:center;justify-content:center;font-size:20px;cursor:move;'
      + 'z-index:2147483646;box-shadow:0 4px 15px rgba(0,0,0,.2);user-select:none;';
    makeDraggable(btn);
    return btn;
  }

  function quickSearch() {
    var query = getSelection();
    if (!query) { toast('请先选中要搜索的文本'); return; }
    try {
      var result = runSearch(null, query);
      toast('已打开搜索：' + result.engine);
    } catch (e) {
      toast('搜索失败：' + (e && e.message ? e.message : e));
    }
  }

  function init() {
    document.body.appendChild(createFloatButton());
    try {
      GM_registerMenuCommand('打开功能面板', openPanel);
      GM_registerMenuCommand('搜索选中文本', quickSearch);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
