// ==UserScript==
// @name         多引擎翻译助手
// @name:zh-CN   多引擎翻译助手
// @name:en      Multi-Engine Translation Helper
// @version      1.0.0
// @description  选中或输入文本后，调用谷歌、有道、微信等多种引擎完成文本翻译与整页翻译。
// @description:zh-CN 选中或输入文本后，调用谷歌、有道、微信等多种引擎完成文本翻译与整页翻译。
// @description:en Translate selected or typed text with Google, Youdao and WeChat engines, and translate entire pages.
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      translate.google.com
// @connect      translate.googleapis.com
// @connect      dict.youdao.com
// @connect      wxapp.translator.qq.com
// ==/UserScript==

(function () {
  'use strict';

  var PANEL_TASK = 'xload-1c9e7dbfe0ae';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-1c9e7dbfe0ae/panel.html';

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
    TARGET_LANG: 'target_lang',
    TIMEOUT: 'timeout_ms',
    SKIP_CJK: 'skip_cjk',
    POS: 'float_pos',
    BATCH: 'batch_size'
  };

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
    var t = document.getElementById('xload-trans-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'xload-trans-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 20px;border-radius:50px;z-index:2147483647;font-size:14px;max-width:80vw;box-shadow:0 5px 15px rgba(0,0,0,.3);';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 3000);
  }

  function gmRequest(options) {
    return new Promise(function (resolve, reject) {
      var opts = {};
      for (var k in options) if (Object.prototype.hasOwnProperty.call(options, k)) opts[k] = options[k];
      opts.onload = function (res) { resolve(res); };
      opts.onerror = function () { reject(new Error('网络请求失败')); };
      opts.ontimeout = function () { reject(new Error('网络请求超时')); };
      opts.onabort = function () { reject(new Error('网络请求已取消')); };
      try { GM_xmlhttpRequest(opts); } catch (e) { reject(e); }
    });
  }

  function requestGoogleText(text, tl) {
    var url = 'https://translate.google.com/translate_a/single?client=gtx&dt=t&dj=1&ie=UTF-8&sl=auto&tl='
      + encodeURIComponent(tl) + '&q=' + encodeURIComponent(text);
    return gmRequest({ method: 'GET', url: url, timeout: getCfg(CFG.TIMEOUT, 10000) }).then(function (res) {
      if (res.status < 200 || res.status >= 300) throw new Error('谷歌翻译返回 HTTP ' + res.status);
      var obj = JSON.parse(res.responseText);
      if (!obj || !Array.isArray(obj.sentences)) throw new Error('谷歌翻译结果解析失败');
      return obj.sentences.map(function (s) { return s.trans || ''; }).join('');
    });
  }

  function requestGooglePageText(text, tl) {
    var params = new URLSearchParams({
      client: 'gtx', dt: 't', sl: 'auto', tl: tl, q: text
    }).toString();
    return gmRequest({ method: 'GET', url: 'https://translate.googleapis.com/translate_a/single?' + params, timeout: getCfg(CFG.TIMEOUT, 10000) })
      .then(function (res) {
        if (res.status < 200 || res.status >= 300) throw new Error('谷歌翻译返回 HTTP ' + res.status);
        var data = JSON.parse(res.responseText);
        if (data && data[0]) return data[0].map(function (item) { return item[0]; }).join('');
        return text;
      });
  }

  function parseYoudao(data) {
    if (!data || typeof data !== 'object') return '';
    var lines = [];
    var ecWords = data.ec && data.ec.word;
    var ceWords = data.ce && data.ce.word;

    if (Array.isArray(ecWords) && ecWords.length > 0) {
      var entries = ecWords[0] && ecWords[0].trs;
      if (Array.isArray(entries)) {
        entries.forEach(function (entry) {
          var text = entry && entry.tr && entry.tr[0] && entry.tr[0].l && entry.tr[0].l.i;
          if (Array.isArray(text) && text.length > 0) lines.push(String(text[0]));
        });
      }
    } else if (Array.isArray(ceWords) && ceWords.length > 0) {
      var ceEntries = ceWords[0] && ceWords[0].trs;
      if (Array.isArray(ceEntries)) {
        ceEntries.forEach(function (entry) {
          var raw = entry && entry.tr && entry.tr[0] && entry.tr[0].l && entry.tr[0].l.i;
          var text = '';
          if (typeof raw === 'string') {
            text = raw;
          } else if (Array.isArray(raw)) {
            raw.forEach(function (item) {
              if (typeof item === 'string') text += item;
              else if (item && typeof item === 'object' && '#text' in item) text += item['#text'];
            });
          }
          text = text.replace(/^[ \t\r\n;]+|[ \t\r\n;]+$/g, '');
          if (text) lines.push(text);
        });
      }
    }
    return lines.join('\n');
  }

  function requestYoudao(query) {
    var q = String(query == null ? '' : query).trim();
    if (!q) return Promise.reject(new Error('查询内容不能为空'));
    var url = 'https://dict.youdao.com/jsonapi?q=' + encodeURIComponent(q);
    return gmRequest({
      method: 'GET', url: url, anonymous: true, timeout: 6000,
      headers: { Accept: 'application/json, text/plain, */*' }
    }).then(function (res) {
      if (res.status < 200 || res.status >= 300) throw new Error('有道词典返回 HTTP ' + res.status);
      var data = JSON.parse(res.responseText);
      var translation = parseYoudao(data);
      if (!translation) throw new Error('未找到可用释义');
      return translation;
    });
  }

  function requestWechat(text) {
    var params = 'source=auto&target=zh&platform=WeChat_APP&candidateLangs=en|zh&guid=cli_user&sourceText=' + encodeURIComponent(text);
    return gmRequest({
      method: 'GET',
      url: 'https://wxapp.translator.qq.com/api/translate?' + params,
      timeout: getCfg(CFG.TIMEOUT, 10000),
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://servicewechat.com/wxb1070eabc6f9107e/117/page-frame.html',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.32(0x18002035) NetType/WIFI Language/zh_TW'
      }
    }).then(function (res) {
      if (res.status < 200 || res.status >= 300) throw new Error('微信翻译返回 HTTP ' + res.status);
      var obj = JSON.parse(res.responseText);
      if (obj && obj.targetText) return obj.targetText;
      throw new Error('微信翻译接口返回异常');
    });
  }

  function collectTextNodes(skipCjk) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        var tag = parent && parent.tagName;
        if (tag && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA'].indexOf(tag) >= 0) return NodeFilter.FILTER_REJECT;
        var text = node.textContent.trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        if (skipCjk && /[\u4e00-\u9fa5]/.test(text)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function translatePage(ch, opts) {
    var nodes = collectTextNodes(opts.skipCjk);
    if (nodes.length === 0) {
      ch.send('done', { translated: 0, total: 0 });
      toast('没有需要翻译的文本');
      return Promise.resolve();
    }
    ch.send('progress', { percent: 0, message: '发现 ' + nodes.length + ' 个文本段落' });
    var batchSize = Math.max(1, Number(getCfg(CFG.BATCH, 10)) || 10);
    var completed = 0;
    var translated = 0;

    function runBatch(index) {
      if (index >= nodes.length) {
        ch.send('done', { translated: translated, total: nodes.length });
        toast('页面翻译完成');
        return Promise.resolve();
      }
      var batch = nodes.slice(index, index + batchSize);
      var tasks = batch.map(function (textNode) {
        var original = textNode.textContent.trim();
        if (original.length <= 2) return Promise.resolve();
        return requestGooglePageText(original, opts.tl).then(function (result) {
          if (result && result !== original) {
            textNode.textContent = result;
            if (textNode.parentElement) textNode.parentElement.style.backgroundColor = 'rgba(255,255,0,0.1)';
            translated++;
          }
        }).catch(function () { });
      });
      return Promise.all(tasks).then(function () {
        completed += batch.length;
        var percent = Math.min(100, Math.round(completed / nodes.length * 100));
        ch.send('progress', { percent: percent, message: '正在翻译… ' + percent + '%' });
        return runBatch(index + batchSize);
      });
    }

    return runBatch(0);
  }

  function resolveQuery(data) {
    var d = data || {};
    if (d.text != null && String(d.text).trim()) return String(d.text).trim();
    return getSelection();
  }

  var panelChannel = null;

  function bindCommands(ch) {
    ch.on('translate_text', function (data) {
      var query = resolveQuery(data);
      if (!query) { ch.send('error', { message: '没有可翻译的文本，请先选中文本或在面板中输入内容' }); return; }
      var tl = (data && data.target_lang) || getCfg(CFG.TARGET_LANG, 'zh-CN');
      ch.send('progress', { message: '正在请求谷歌翻译…' });
      requestGoogleText(query, tl).then(function (result) {
        ch.send('done', { text: result, source: query, target: tl });
        toast('翻译完成');
      }).catch(function (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      });
    });

    ch.on('youdao_lookup', function (data) {
      var query = resolveQuery(data);
      if (!query) { ch.send('error', { message: '没有可查询的文本' }); return; }
      ch.send('progress', { message: '正在查询有道词典…' });
      requestYoudao(query).then(function (result) {
        ch.send('done', { text: result, source: query });
        toast('查询完成');
      }).catch(function (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      });
    });

    ch.on('wechat_translate', function (data) {
      var query = resolveQuery(data);
      if (!query) { ch.send('error', { message: '没有可翻译的文本' }); return; }
      ch.send('progress', { message: '正在请求微信翻译…' });
      requestWechat(query).then(function (result) {
        ch.send('done', { text: result, source: query });
        toast('翻译完成');
      }).catch(function (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      });
    });

    ch.on('translate_page', function (data) {
      var d = data || {};
      var skipCjk = typeof d.skip_cjk === 'boolean' ? d.skip_cjk : getCfg(CFG.SKIP_CJK, true);
      var tl = d.target_lang || getCfg(CFG.TARGET_LANG, 'zh-CN');
      translatePage(ch, { skipCjk: skipCjk, tl: tl }).catch(function (e) {
        ch.send('error', { message: e && e.message ? e.message : String(e) });
      });
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
    var pos = getCfg(CFG.POS, { left: '10px', top: '15%' });
    var btn = document.createElement('div');
    btn.id = 'xload-trans-btn';
    btn.textContent = '🌐';
    btn.title = '多引擎翻译助手：点击打开功能面板';
    btn.style.cssText = 'position:fixed;left:' + (pos.left || '10px') + ';top:' + (pos.top || '15%')
      + ';width:44px;height:44px;border-radius:50%;background:rgba(30,30,30,.85);color:#fff;'
      + 'display:flex;align-items:center;justify-content:center;font-size:20px;cursor:move;'
      + 'z-index:2147483646;box-shadow:0 4px 15px rgba(0,0,0,.2);user-select:none;';
    makeDraggable(btn);
    return btn;
  }

  function quickTranslate() {
    var query = getSelection();
    if (!query) { toast('请先选中要翻译的文本'); return; }
    var tl = getCfg(CFG.TARGET_LANG, 'zh-CN');
    toast('正在翻译…');
    requestGoogleText(query, tl).then(function (result) {
      toast(result || '未获得翻译结果', 6000);
    }).catch(function (e) {
      toast('翻译失败：' + (e && e.message ? e.message : e));
    });
  }

  function init() {
    document.body.appendChild(createFloatButton());
    try {
      GM_registerMenuCommand('打开功能面板', openPanel);
      GM_registerMenuCommand('翻译选中文本', quickTranslate);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
