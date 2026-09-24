// ==UserScript==
// @name         Link Shortener Bypass Toolkit
// @description  Skips link shorteners and ad-gate pages to reach the final destination automatically, blocks ad-block detection and intrusive popups or prompts, neutralizes focus and context-menu tricks, accelerates long countdown timers, and offers optional media download helpers.
// @version      97.0
// @run-at       document-start
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        window.onurlchange
// @grant        GM_registerMenuCommand
// @exclude      /^(https?:\/\/)([^\/]+\.)?((cloudflare|github|aliyun|reddit|bing|yahoo|microsoft|whatsapp|amazon|ebay|payoneer|paypal|skrill|stripe|stripecdn|tipalti|wise|discord|tokopedia|taobao|taboola|aliexpress|netflix|citigroup|spotify|bankofamerica|hsbc|blogger|(accounts|studio).youtube|atlassian|pinterest|twitter|x|live|linkedin|fastbull|tradingview|deepseek|chatgpt|openai|grok|bilibili|indodax|bmcdn6|fbsbx|googlesyndication|amazon-adsystem|pubmatic|gstatic).com|(telegram|wikipedia|lichess).org|(doubleclick|yahoo).net|proton.me|stripe.network|meta.ai|codepen.io|(shopee|lazada|rakuten|maybank|binance).*|(dana|ovo|bca.co|bri.co|bni.co|bankmandiri.co|desa|(.*).go).id|(.*).(edu|gov))(\/.*)/
// @exclude      /^https?:\/\/(?!(www\.google\.com\/(recaptcha\/|url)|docs\.google\.com\/|drive\.google\.com\/)).*google\..*/
// @exclude      /^https?:\/\/([a-z0-9]+\.)*(facebook|instagram|tiktok)\.com\/(?!(flx\/warn\/|linkshim\/|link\/v2)).*/
// ==/UserScript==

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

(function () {
  'use strict';

  /* ================================================================== *
   * Panel identity and transport
   * ================================================================== */

  var PANEL_TASK = 'xload-01859a28d74d';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-01859a28d74d/panel.html';

  var panelChannel = null;

  function panelLog(level, event, data) {
    try {
      if (window.XLoadPanel && typeof window.XLoadPanel.log === 'function') {
        window.XLoadPanel.log(level, event, data);
      }
    } catch (e) {}
  }

  function report(type, data) {
    try { if (panelChannel) panelChannel.send(type, data || {}); } catch (e) {}
  }

  function openPanel() {
    if (panelChannel) {
      report('hello', {});
      return panelChannel;
    }
    if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') return null;
    panelChannel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
    registerPanelCommands(panelChannel);
    report('hello', {});
    panelLog('info', 'panel.open', {});
    return panelChannel;
  }

  /* ================================================================== *
   * Settings store (persisted through GM storage, editable from panel)
   * ================================================================== */

  var SETTINGS_KEY = 'shortlink-bypass:settings';

  var DEFAULT_SETTINGS = {
    BlogDelay: false,
    SetDelay: 5,
    TimerFC: false,
    TDelay: 1000,
    SameTab: false,
    RightFC: false,
    BlockFC: false,
    BlockPop: false,
    AntiDebug: false,
    YTShort: false,
    Adblock: false,
    Prompt: false,
    Flickr: false,
    YTDown: false,
    DelayPageUrl: '',
    MediaEndpoint: ''
  };

  var CONTROL_TO_SETTING = {
    'same-tab': 'SameTab',
    'context-menu': 'RightFC',
    'always-ready': 'BlockFC',
    'popup-blocker': 'BlockPop',
    'anti-debug': 'AntiDebug',
    'youtube-short': 'YTShort',
    'adblock-detection': 'Adblock',
    'prompts': 'Prompt',
    'flickr': 'Flickr',
    'youtube-download': 'YTDown',
    'fast-timer': 'TimerFC',
    'set-delay': 'SetDelay',
    'timer-delay': 'TDelay',
    'delay-page-url': 'DelayPageUrl',
    'media-endpoint': 'MediaEndpoint'
  };

  function readSettings() {
    var stored = {};
    try { stored = JSON.parse(GM_getValue(SETTINGS_KEY, '{}')) || {}; } catch (e) { stored = {}; }
    return Object.assign({}, DEFAULT_SETTINGS, stored);
  }

  function persistSettings() {
    try { GM_setValue(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  function settingsSnapshot() {
    return Object.assign({}, settings);
  }

  function normalizeSetting(key, value) {
    var fallback = DEFAULT_SETTINGS[key];
    if (typeof fallback === 'boolean') return !!value;
    if (typeof fallback === 'number') {
      var n = Number(value);
      return isNaN(n) ? fallback : n;
    }
    return value == null ? '' : String(value);
  }

  var settings = readSettings();

  var cfg = {
    get: function (key) { return settings[key]; },
    set: function (key, value) {
      settings[key] = normalizeSetting(key, value);
      persistSettings();
    }
  };

  /* ================================================================== *
   * Panel command handling
   * ================================================================== */

  function registerPanelCommands(channel) {
    Object.keys(CONTROL_TO_SETTING).forEach(function (controlId) {
      channel.on(controlId, function (data) {
        try {
          var value = data && Object.prototype.hasOwnProperty.call(data, 'value') ? data.value : data;
          cfg.set(CONTROL_TO_SETTING[controlId], value);
          report('progress', { control: controlId, value: cfg.get(CONTROL_TO_SETTING[controlId]) });
        } catch (e) {
          report('error', { control: controlId, message: e && e.message });
        }
      });
    });

    channel.on('apply-settings', function (data) {
      try {
        report('progress', { action: 'apply-settings' });
        var values = data && data.values && typeof data.values === 'object' ? data.values : data;
        if (values && typeof values === 'object') {
          Object.keys(CONTROL_TO_SETTING).forEach(function (controlId) {
            if (Object.prototype.hasOwnProperty.call(values, controlId)) {
              cfg.set(CONTROL_TO_SETTING[controlId], values[controlId]);
            }
          });
        }
        panelLog('info', 'settings.apply', settingsSnapshot());
        report('done', { action: 'apply-settings' });
      } catch (e) {
        report('error', { action: 'apply-settings', message: e && e.message });
      }
    });

    channel.on('reset-settings', function () {
      try {
        report('progress', { action: 'reset-settings' });
        settings = Object.assign({}, DEFAULT_SETTINGS);
        persistSettings();
        panelLog('info', 'settings.reset', {});
        report('done', { action: 'reset-settings' });
      } catch (e) {
        report('error', { action: 'reset-settings', message: e && e.message });
      }
    });

    channel.on('run-features', function () {
      try {
        report('progress', { action: 'run-features' });
        var activated = runGlobalFeatures();
        panelLog('info', 'features.run', { activated: activated });
        report('done', { action: 'run-features', activated: activated });
      } catch (e) {
        report('error', { action: 'run-features', message: e && e.message });
      }
    });

    channel.on('reload-page', function () {
      try {
        report('progress', { action: 'reload-page' });
        report('done', { action: 'reload-page' });
        location.reload();
      } catch (e) {
        report('error', { action: 'reload-page', message: e && e.message });
      }
    });
  }

  try {
    GM_registerMenuCommand('Open Control Panel', openPanel);
    GM_registerMenuCommand('Apply Enabled Features Now', function () { runGlobalFeatures(); });
  } catch (e) {}

  /* ================================================================== *
   * DOM helpers
   * ================================================================== */

  var pageParams = new URLSearchParams(location.search);

  // Selector helper with optional :contains("text"), :innerText("text") and :has(sel) suffixes.
  function find(query, all = false) {
    const containsMatch = query.match(/:contains\("([^"]+)"\)$/);
    const innerTextMatch = query.match(/:innerText\("([^"]+)"\)$/);
    const hasMatch = query.match(/:has\(([^)]+)\)$/);
    let baseQuery, text, childSelector, useInnerText;
    if (containsMatch) {
      baseQuery = query.replace(/:contains\("[^"]+"\)$/, '');
      text = containsMatch[1];
      useInnerText = false;
    } else if (innerTextMatch) {
      baseQuery = query.replace(/:innerText\("[^"]+"\)$/, '');
      text = innerTextMatch[1];
      useInnerText = true;
    } else if (hasMatch) {
      baseQuery = query.replace(/:has\([^)]+\)$/, '');
      childSelector = hasMatch[1];
      text = null;
      useInnerText = false;
    } else {
      baseQuery = query;
      text = null;
      useInnerText = false;
    }
    const elements = document.querySelectorAll(baseQuery);
    if (!text && !childSelector && !all) return document.querySelector(baseQuery);
    if (all && !text && !childSelector) return elements;
    if (hasMatch) {
      const filtered = Array.from(elements).filter(el => el.querySelector(childSelector));
      return all ? filtered : filtered[0] || null;
    }
    if (text) {
      const filtered = Array.from(elements).filter(el => {
        const content = (useInnerText ? el.innerText : el.textContent).trim();
        return content.toLowerCase().includes(text.toLowerCase());
      });
      return all ? filtered : filtered[0] || null;
    }
    return all ? elements : elements[0] || null;
  }

  const exists = query => find(query) !== null;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function fakeHidden() {
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
  }

  function logNote(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const context = window.self === window.top ? 'top' : 'iframe';
    const text = `[ShortlinkBypass] ${timestamp} [${context}] ${level.toUpperCase()}: ${message}`;
    switch (level) {
      case 'warn': console.warn(text); break;
      case 'error': console.error(text); break;
      case 'debug': console.log(text); break;
      default: console.log(text);
    }
  }

  function redirect(url, blog = true) {
    const delayPage = cfg.get('DelayPageUrl');
    if (blog && cfg.get('BlogDelay') && delayPage) {
      location = delayPage + (delayPage.includes('?') ? '&' : '?') + 'BypassResults=' + url;
    } else {
      location = url;
    }
    panelLog('info', 'redirect', { url: String(url) });
  }

  function setActiveElement(selector) {
    elementReady(selector).then(element => {
      const temp = element.tabIndex;
      element.tabIndex = 0;
      element.focus();
      element.tabIndex = temp;
    });
  }

  function elementReady(selector) {
    return new Promise(function (resolve) {
      let element = find(selector);
      if (element) { resolve(element); return; }
      new MutationObserver(function (_, observer) {
        element = find(selector);
        if (element) { resolve(element); observer.disconnect(); }
      }).observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  function waitForElm(query, callback, maxWaitTime = 15, initialDelay = 5) {
    const startTime = Date.now();
    const maxWaitTimeMs = maxWaitTime * 1000;
    const initialDelayMs = initialDelay * 1000;
    setTimeout(() => {
      const observer = new MutationObserver(() => {
        if (exists(query)) {
          observer.disconnect();
          callback(find(query));
        } else if (Date.now() - startTime >= maxWaitTimeMs + initialDelayMs) {
          observer.disconnect();
          logNote(`Element ${query} not found within ${maxWaitTime + initialDelay} seconds`, 'warn');
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      if (exists(query)) {
        observer.disconnect();
        callback(find(query));
      }
    }, initialDelayMs);
  }

  /* ================================================================== *
   * Page-behaviour overrides
   * ================================================================== */

  function SameTab() {
    Object.defineProperty(unsafeWindow, 'open', {
      value: function (url) {
        if (url) {
          location.href = url;
          logNote(`Forced window.open to same tab: ${url}`);
        }
        return null;
      },
      writable: false,
      configurable: false
    });
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[target="_blank"]');
      if (target && target.href) {
        e.preventDefault();
        location.href = target.href;
        logNote(`Redirected target="_blank" to same tab: ${target.href}`);
      }
    }, true);
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.target === '_blank' && form.action) {
        e.preventDefault();
        location.href = form.action;
        logNote(`Redirected form target="_blank" to same tab: ${form.action}`);
      }
    }, true);
  }

  function ReadytoClick(selector, sleepTime = 0) {
    const events = ['mouseover', 'mousedown', 'mouseup', 'click'];
    const userEvents = ['mousemove', 'touchstart'];
    const selectors = selector.split(', ');
    if (selectors.length > 1) {
      return selectors.forEach(item => ReadytoClick(item));
    }
    if (sleepTime > 0) {
      return sleep(sleepTime * 1000).then(function () { ReadytoClick(selector, 0); });
    }
    userEvents.forEach(eventName => {
      document.dispatchEvent(new Event(eventName, { bubbles: true }));
    });
    elementReady(selector).then(function (element) {
      element.removeAttribute('disabled');
      element.removeAttribute('target');
      events.forEach(eventName => {
        element.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true }));
      });
    });
  }

  function EnableRCF() {
    if (CloudPS(true, true, false)) return;
    const events = ['contextmenu', 'copy', 'cut', 'paste', 'select', 'selectstart', 'dragstart', 'drop'];
    function preventDefaultActions(event) {
      event.stopPropagation();
    }
    events.forEach(function (eventName) {
      document.addEventListener(eventName, preventDefaultActions, true);
    });
  }

  function CloudPS(checkFrames = false, captchaSite = false, checkFlare = true) {
    if (checkFrames && window.self !== window.top) {
      logNote('Bypass Function Canceled Because Iframe Detected ', 'info');
      return true;
    }
    if ((checkFlare && document.title === 'Just a moment...') || exists('.spacer-top.spacer.core-msg')) {
      logNote('Bypass Function Canceled on Cloudflare Page ', 'info');
      return true;
    }
    if (captchaSite) {
      const captchaDomains = [/\.google\.com$/, /\.recaptcha\.net$/, /\.hcaptcha\.com$/, /\.cloudflare\.com$/];
      const host = location.host.toLowerCase();
      if (captchaDomains.some(regex => regex.test(host))) {
        logNote('Bypass Function Canceled on This Sites', 'info');
        return true;
      }
    }
    return false;
  }

  function notify(txt, clicktocopy = false, clicktoclose = false, duration = cfg.get('SetDelay')) {
    const m = document.createElement('div');
    m.style.padding = '10px 20px';
    m.style.zIndex = 10000;
    m.style.position = 'fixed';
    m.style.width = '970px';
    m.style.top = '10px';
    m.style.transform = 'translateX(-50%)';
    m.style.left = '50%';
    m.style.fontFamily = 'Arial, sans-serif';
    m.style.fontSize = '16px';
    m.style.color = 'white';
    m.style.textAlign = 'center';
    m.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    m.style.boxSizing = 'border-box';
    m.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    m.style.cursor = 'pointer';
    const mainText = document.createElement('div');
    mainText.innerText = txt.replace('@', duration);
    m.appendChild(mainText);
    const actionText = document.createElement('span');
    actionText.style.position = 'absolute';
    actionText.style.right = '10px';
    actionText.style.bottom = '5px';
    actionText.style.fontSize = '12px';
    actionText.style.color = 'white';
    actionText.style.userSelect = 'none';
    if (clicktocopy) actionText.innerText = 'Click to Copy';
    else if (clicktoclose) actionText.innerText = 'Click to Close';
    m.appendChild(actionText);
    document.body.appendChild(m);
    m.addEventListener('click', () => {
      if (clicktocopy) {
        navigator.clipboard.writeText(txt.replace('@', duration)).then(() => {
          mainText.innerText = 'Copied to clipboard!';
          setTimeout(() => { document.body.removeChild(m); clearInterval(timerId); }, 1000);
        }).catch(err => { console.error('Failed to copy text: ', err); });
      }
      if (clicktoclose) {
        document.body.removeChild(m);
        clearInterval(timerId);
      }
    });
    const timerId = setInterval(() => {
      duration -= 1;
      if (duration <= 0) clearInterval(timerId);
      else mainText.innerText = txt.replace('@', duration);
    }, 1000);
  }

  function NoFocus() {
    if (CloudPS(true, true, false)) return;
    window.mouseleave = true;
    window.onmouseover = true;
    document.hasFocus = () => true;
    if (!Object.getOwnPropertyDescriptor(document, 'webkitVisibilityState')?.get) {
      Object.defineProperty(document, 'webkitVisibilityState', { get: () => 'visible', configurable: true });
    }
    if (!Object.getOwnPropertyDescriptor(document, 'visibilityState')?.get) {
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    }
    if (!Object.getOwnPropertyDescriptor(document, 'hidden')?.get) {
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    }
    const eventOptions = { capture: true, passive: true };
    const ensureVisibility = () => {
      if (document.hidden !== false) {
        Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
      }
    };
    ensureVisibility();
    window.addEventListener('focus', e => e.stopImmediatePropagation(), eventOptions);
    window.addEventListener('blur', e => e.stopImmediatePropagation(), eventOptions);
  }

  function CaptchaDone(callback, checkInterval = 1000) {
    if (CloudPS()) return;
    const win = unsafeWindow;
    if (typeof callback !== 'function') {
      logNote('Callback harus berupa fungsi', 'error');
      return;
    }
    let intervalId;
    const checkCaptcha = () => {
      try {
        if (exists('.iconcaptcha-modal__body-checkmark')) {
          clearInterval(intervalId);
          callback();
          return;
        }
        if (exists("iframe[src^='https://newassets.hcaptcha.com']")) {
          if (win.hcaptcha && typeof win.hcaptcha.getResponse === 'function') {
            const response = win.hcaptcha.getResponse();
            if (response && response.length > 0) { clearInterval(intervalId); callback(); return; }
          }
        }
        if (exists("input[name='cf-turnstile-response']")) {
          if (win.turnstile && typeof win.turnstile.getResponse === 'function') {
            const response = win.turnstile.getResponse();
            if (response && response.length > 0) { clearInterval(intervalId); callback(); return; }
          }
        }
        if (exists("iframe[title='reCAPTCHA']")) {
          if (win.grecaptcha && typeof win.grecaptcha.getResponse === 'function') {
            const response = win.grecaptcha.getResponse();
            if (response && response.length > 0) { clearInterval(intervalId); callback(); return; }
          }
        }
      } catch (error) {
        console.error('Error checking captcha:', error);
      }
    };
    intervalId = setInterval(checkCaptcha, checkInterval);
  }

  function DebugLog() {
    if (CloudPS(true, true, true)) return;
    const STORAGE_KEY = 'protection_tracker';
    let attemptCount = GM_getValue(STORAGE_KEY, 0);
    if (attemptCount > 0) setTimeout(() => GM_setValue(STORAGE_KEY, 0), 60000);
    const SavedMethods = {
      output: logNote,
      trace: typeof console.debug === 'function' ? console.debug : logNote,
      alert: console.warn,
      notice: console.info,
      issue: console.error,
      grid: typeof console.table === 'function' ? console.table : logNote,
      wipe: console.clear,
      funcBuilder: Function.prototype.constructor,
      makeElement: document.createElement
    };
    const limits = {
      grid: { max: 5, timeframe: 5000 },
      wipe: { max: 5, timeframe: 5000 },
      filteredOutput: { max: 5, timeframe: 5000 },
      blocker: { max: 1, timeframe: 15000, count: 0, timestamp: 0 }
    };
    function canReport(category) {
      const restriction = limits[category] || { count: 0 };
      if (restriction.stopped) return false;
      const currentTime = Date.now();
      restriction.timestamp = restriction.timestamp || currentTime;
      if (currentTime - restriction.timestamp > restriction.timeframe) {
        restriction.count = 0;
        restriction.timestamp = currentTime;
      }
      if (++restriction.count > restriction.max) {
        restriction.stopped = true;
        SavedMethods.alert(`Max limit hit for ${category}`);
        return false;
      }
      return true;
    }
    Object.defineProperty(window, 'onbeforeunload', { configurable: false, writable: false, value: null });
    ['output', 'trace', 'alert', 'notice', 'issue', 'grid'].forEach(method => {
      if (typeof SavedMethods[method] === 'function') {
        console[method] = new Proxy(SavedMethods[method], {
          apply: (target, context, params) => {
            const adjustedParams = params.map(item => {
              if (typeof item === 'function') return 'Hidden Function';
              if (typeof item !== 'object' || !item) return item;
              const attributes = Object.getOwnPropertyDescriptors(item);
              if (attributes.toString || 'get' in attributes) return 'Hidden Accessor';
              if (Array.isArray(item) && item.length === 50 && typeof item[0] === 'object') return 'Hidden BigArray';
              return item;
            });
            if (params.length - adjustedParams.filter(x => x === params[params.indexOf(x)]).length >= Math.max(params.length - 1, 1)) {
              if (!canReport('filteredOutput')) return;
            }
            return SavedMethods[method].apply(context, adjustedParams);
          }
        });
      }
    });
    ['wipe'].forEach(method => {
      console[method] = () => canReport(method) && SavedMethods.alert(`Blocked ${method}`);
    });
    window.Function.prototype.constructor = new Proxy(SavedMethods.funcBuilder, {
      apply: (target, context, inputs) => {
        const codeText = inputs[0];
        if (codeText?.includes('debugger')) {
          attemptCount++;
          GM_setValue(STORAGE_KEY, attemptCount);
          if (canReport('blocker')) SavedMethods.alert(`Blocked debugger (count: ${attemptCount})`);
          if (attemptCount > 100) {
            GM_setValue(STORAGE_KEY, 0);
            throw new Error('Debugger overload detected');
          }
          setTimeout(() => GM_setValue(STORAGE_KEY, Math.max(0, attemptCount - 1)), 1);
          inputs[0] = codeText.replaceAll('debugger', '');
        }
        return target.apply(context, inputs);
      }
    });
    document.createElement = new Proxy(SavedMethods.makeElement, {
      apply: (target, context, args) => {
        const newNode = target.apply(context, args);
        if (args[0].toLowerCase() === 'iframe') {
          newNode.addEventListener('load', () => {
            try {
              newNode.contentWindow.console = { ...console };
              newNode.contentWindow.Function.prototype.constructor = window.Function.prototype.constructor;
            } catch (err) {}
          });
        }
        return newNode;
      }
    });
    Object.keys(SavedMethods).forEach(method => {
      if (method in console) Object.defineProperty(console, method, { configurable: false, writable: false });
    });
    if (cfg.get('AntiDebug')) {
      const baseTiming = performance.now;
      logNote('Performance Modified For Anti-Debug Protection');
      performance.now = () => baseTiming() + Math.random() * 2;
    }
  }

  function CheckVisibility(selector, operatorOrCallback, textCondition, callback, actionOnVisible = true) {
    if (CloudPS()) return;
    function isElementVisible(elem) {
      if (!elem) return false;
      if (!elem.offsetHeight && !elem.offsetWidth) return false;
      if (getComputedStyle(elem).visibility === 'hidden') return false;
      return true;
    }
    function checkTextCondition(condition) {
      try {
        const conditionParts = condition.split(/(==|!=)/);
        if (conditionParts.length !== 3) {
          console.error('Invalid text condition format:', condition);
          return false;
        }
        const selectorPart = conditionParts[0].trim();
        const sel = selectorPart.replace("find('", '').replace("').innerText", '').trim();
        const expectedValue = conditionParts[2].trim().replace(/['"]/g, '');
        const elem = find(sel);
        if (!elem) return false;
        const actualValue = elem.innerText.trim();
        if (conditionParts[1].trim() === '==') return actualValue.includes(expectedValue);
        if (conditionParts[1].trim() === '!=') return !actualValue.includes(expectedValue);
        return false;
      } catch (error) {
        console.error('Error evaluating text condition:', error);
        return false;
      }
    }
    if (typeof operatorOrCallback === 'function') {
      const callbackFn = operatorOrCallback;
      const intervalId = setInterval(() => {
        try {
          const elem = find(selector);
          const isVisible = isElementVisible(elem);
          if ((actionOnVisible && isVisible) || (!actionOnVisible && !isVisible)) {
            clearInterval(intervalId);
            callbackFn();
          }
        } catch (error) {
          console.error('Error checking visibility:', error);
        }
      }, 1000);
    } else if (typeof operatorOrCallback === 'string' && (operatorOrCallback === '&&' || operatorOrCallback === '||')) {
      const operator = operatorOrCallback;
      const intervalId = setInterval(() => {
        try {
          const elem = find(selector);
          const isVisible = isElementVisible(elem);
          const isTextConditionMet = checkTextCondition(textCondition);
          if ((operator === '&&' && isVisible && isTextConditionMet) || (operator === '||' && (isVisible || isTextConditionMet))) {
            clearInterval(intervalId);
            callback();
          }
        } catch (error) {
          console.error('Error checking visibility and text condition:', error);
        }
      }, 1000);
    } else {
      console.error('Parameter tidak valid.');
    }
  }

  function TrustMe() {
    if (CloudPS(true, true, true)) return;
    const sandbox = new Proxy(window, {
      get(target, key) {
        if (key === 'Object') {
          return new Proxy(Object, {
            get(objTarget, objKey) {
              if (objKey === 'freeze') {
                return function (obj) {
                  logNote('Object.freeze disabled in sandbox.', 'warn');
                  return obj;
                };
              }
              return Reflect.get(objTarget, objKey);
            }
          });
        }
        return Reflect.get(target, key);
      }
    });
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'message' || typeof listener !== 'function') {
        return originalAddEventListener.call(this, type, listener, options);
      }
      const wrappedListener = function (event) {
        let clonedEvent;
        try {
          if (event instanceof MessageEvent) {
            clonedEvent = new MessageEvent(event.type, {
              data: event.data,
              origin: event.origin,
              source: event.source,
              lastEventId: event.lastEventId,
              ports: event.ports,
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed
            });
          } else if (event instanceof MouseEvent) {
            clonedEvent = new MouseEvent(event.type, {
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed,
              clientX: event.clientX,
              clientY: event.clientY,
              button: event.button,
              buttons: event.buttons,
              target: event.target,
              currentTarget: event.currentTarget,
              relatedTarget: event.relatedTarget
            });
          } else if (event instanceof KeyboardEvent) {
            clonedEvent = new KeyboardEvent(event.type, {
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed,
              key: event.key,
              code: event.code,
              ctrlKey: event.ctrlKey,
              shiftKey: event.shiftKey,
              altKey: event.altKey,
              metaKey: event.metaKey
            });
          } else {
            clonedEvent = new Event(event.type, {
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed
            });
            ['target', 'currentTarget', 'eventPhase', 'timeStamp'].forEach(prop => {
              if (event[prop] !== undefined) {
                Object.defineProperty(clonedEvent, prop, { value: event[prop], writable: true, configurable: true });
              }
            });
          }
          clonedEvent = new Proxy(clonedEvent, {
            get(target, prop) {
              if (prop === 'isTrusted') return true;
              return Reflect.get(target, prop);
            }
          });
        } catch (e) {
          logNote(`Failed to clone event: ${e.message}`, 'error');
          return listener.call(this, event);
        }
        return listener.call(this, clonedEvent);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    };
    return sandbox;
  }

  function NoPrompts() {
    let timeoutInterval = 1000;
    unsafeWindow.onbeforeunload = null;
    timeoutInterval = (timeoutInterval + timeoutInterval) || 1000;
    setTimeout(NoPrompts, timeoutInterval);
    window.alert = () => {};
    window.confirm = () => true;
    window.prompt = () => null;
    if (window.Notification) {
      Notification.requestPermission = () => Promise.resolve('denied');
      Object.defineProperty(window, 'Notification', { value: null, writable: false });
    }
    if (document.readyState !== 'loading' && document.body) {
      find('[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"], [class*="banner"], [id*="banner"], [class*="gdpr"], [id*="gdpr"], [class*="privacy"], [id*="privacy"], [role="dialog"], [aria-label*="cookie"], [aria-label*="consent"], [aria-label*="privacy"], [class*="notice"], [id*="notice"]', true).forEach(banner => {
        if (banner.textContent.match(/cookie|consent|tracking|gdpr|privacy|accept|agree|decline|manage|preferences/i)) {
          banner.style.display = 'none';
          banner.remove();
        }
      });
    }
  }

  function BoostTimers(targetDelay) {
    if (CloudPS(true, true, true)) return;
    const limits = {
      setTimeout: { max: 1, timeframe: 5000, count: 0, timestamp: 0 },
      setInterval: { max: 1, timeframe: 5000, count: 0, timestamp: 0 }
    };
    function canLog(type) {
      const restriction = limits[type];
      const currentTime = Date.now();
      if (currentTime - restriction.timestamp > restriction.timeframe) {
        restriction.count = 0;
        restriction.timestamp = currentTime;
      }
      if (++restriction.count <= restriction.max) return true;
      return false;
    }
    const wrapTimer = (orig, type) => (func, delay, ...args) =>
      orig(func, (typeof delay === 'number' && delay >= targetDelay)
        ? (canLog(type) && logNote(`[BoostTimers] Accelerated ${type} from ${delay}ms to ${targetDelay}ms`), 50)
        : delay, ...args);
    try {
      Object.defineProperties(unsafeWindow, {
        setTimeout: { value: wrapTimer(unsafeWindow.setTimeout, 'setTimeout'), writable: true, configurable: true },
        setInterval: { value: wrapTimer(unsafeWindow.setInterval, 'setInterval'), writable: true, configurable: true }
      });
    } catch (e) {
      const proxyTimer = (orig, type) => new Proxy(orig, {
        apply: (t, _, a) => t(a[0], (typeof a[1] === 'number' && a[1] >= targetDelay)
          ? (canLog(type) && logNote(`[BoostTimers] Accelerated ${type} from ${a[1]}ms to ${targetDelay}ms`), 50)
          : a[1], ...a.slice(2))
      });
      unsafeWindow.setTimeout = proxyTimer(unsafeWindow.setTimeout, 'setTimeout');
      unsafeWindow.setInterval = proxyTimer(unsafeWindow.setInterval, 'setInterval');
    }
  }

  function AIORemover(action, target = null, attributes = null) {
    switch (action) {
      case 'removeRef':
        delete document.referrer;
        document.__defineGetter__('referrer', () => target || '');
        logNote('Referrer removed or set to:', target || 'empty');
        break;
      case 'removeBp':
        if (!target) { logNote('Selector is required for removeBp action.', 'error'); return; }
        find(target, true).forEach(element => element.remove());
        logNote(`Elements with selector "${target}" removed.`);
        break;
      case 'delCookie':
        if (!target) { logNote('Cookie name is required for delCookie action.', 'error'); return; }
        document.cookie = `${target}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        logNote(`Cookie "${target}" deleted.`);
        break;
      case 'removeAttr': {
        if (!target || !attributes) { logNote('Selector and attributes are required for removeAttr action.', 'error'); return; }
        const attrs = Array.isArray(attributes) ? attributes : [attributes];
        const validAttrs = ['onclick', 'class', 'target', 'id'];
        const invalidAttrs = attrs.filter(a => !validAttrs.includes(a));
        if (invalidAttrs.length) { logNote(`Invalid attributes: ${invalidAttrs.join(', ')}`, 'error'); return; }
        const attrElements = find(target, true);
        if (!attrElements.length) { logNote(`No elements found for selector "${target}"`, 'error'); return; }
        attrElements.forEach(element => {
          attrs.forEach(attr => element.removeAttribute(attr));
        });
        logNote(`Attributes ${attrs.join(', ')} Removed`);
        break;
      }
      case 'noAdb': {
        let blockPattern, allowedDomains = null;
        if (target instanceof RegExp) {
          blockPattern = target;
        } else if (target && target.blockPattern) {
          blockPattern = target.blockPattern;
          allowedDomains = target.allowedDomains || null;
        } else {
          logNote('blockPattern is required for noAdb action.', 'error');
          return;
        }
        const currentDomain = window.location.hostname;
        if (allowedDomains && !allowedDomains.test(currentDomain)) {
          logNote(`NoAdb: Domain ${currentDomain} not allowed.`, 'info');
          return;
        }
        const regAdb = new RegExp(blockPattern);
        new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME') {
                const source = node.src || node.textContent || '';
                if (regAdb.test(source)) node.remove();
              }
            });
          });
        }).observe(document, { childList: true, subtree: true });
        find('script, iframe', true).forEach(element => {
          const source = element.src || element.textContent || '';
          if (regAdb.test(source)) element.remove();
        });
        logNote(`NoAdb: Initialized blocking for pattern "${blockPattern}".`);
        break;
      }
      default:
        logNote('Invalid action. Use Existing Cases', 'error');
    }
  }

  function DoIfExists(query, actionOrTime = 'click', timeInSecOrFuncName = 1, funcName = 'setTimeout') {
    let action = 'click';
    let time = 1;
    let timerFuncName = 'setTimeout';
    if (typeof actionOrTime === 'number') {
      time = actionOrTime;
      timerFuncName = typeof timeInSecOrFuncName === 'string' ? timeInSecOrFuncName : 'setTimeout';
    } else if (typeof actionOrTime === 'string') {
      action = actionOrTime;
      time = typeof timeInSecOrFuncName === 'number' ? timeInSecOrFuncName : 1;
      timerFuncName = typeof funcName === 'string' ? funcName : 'setTimeout';
    }
    function GetForm(FormName) {
      const forms = document.forms;
      for (let i = 0; i < forms.length; i++) {
        if (FormName === 'mdn') {
          const form = forms[i].innerHTML;
          if (form.includes('Step')) return forms[i];
        } else if (FormName === 'Allin1') {
          const bait = forms[i].action;
          if (/bypass.html|adblock.html/.test(bait)) continue;
          return forms[i];
        }
      }
      return null;
    }
    let element;
    if (query === 'mdn' || query === 'Allin1') element = GetForm(query);
    else element = find(query);
    if (!element) {
      logNote(`Elemen "${query}" tidak ditemukan.`, 'error');
      return;
    }
    if (typeof element[action] !== 'function') {
      logNote(`Elemen "${query}" tidak memiliki metode "${action}".`, 'error');
      return;
    }
    if (timerFuncName !== 'setTimeout' && timerFuncName !== 'setInterval') {
      logNote('Timer tidak valid. Gunakan "setTimeout" atau "setInterval".', 'error');
      return;
    }
    const timerFunc = window[timerFuncName];
    if (timerFuncName === 'setTimeout') {
      timerFunc(() => {
        try {
          element[action]();
          logNote(`Aksi "${action}" berhasil dijalankan pada elemen "${query}".`);
        } catch (error) {
          console.error(`Aksi "${action}" Gagal pada elemen "${query}":`, error);
        }
      }, time * 1000);
    } else {
      const intervalId = timerFunc(() => {
        try {
          if (exists(query)) {
            const currentElement = find(query);
            currentElement[action]();
            logNote(`Aksi "${action}" berhasil dijalankan pada elemen "${query}".`);
          } else {
            logNote(`Elemen "${query}" tidak ditemukan.`, 'error');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error(`Aksi "${action}" Gagal pada elemen "${query}":`, error);
          clearInterval(intervalId);
        }
      }, time * 1000);
      logNote(`Interval ID: ${intervalId}`);
    }
  }

  function BlockPopup() {
    const win = unsafeWindow;
    const originalOpen = win.open;
    function createNotification(url, callback) {
      const div = document.createElement('div');
      div.className = 'popup-notification';
      const shadow = div.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>:host { position: fixed; top: 15px; right: 15px; z-index: 9999; font-family: Arial, sans-serif; }.popup { background: #fff; border: 2px solid #333; padding: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); max-width: 350px; border-radius: 5px; }.title { font: bold 16px Arial; color: #000; margin-bottom: 10px; padding-right: 20px; position: relative; }.url { font-size: 14px; color: #222; word-break: break-all; background: #f5f5f5; padding: 8px; border-radius: 3px; margin-bottom: 15px; }.buttons { display: flex; gap: 10px; }
      button { font: bold 14px Arial; padding: 8px 15px; cursor: pointer; border: none; border-radius: 3px; transition: background 0.2s; }.allow { background: #4CAF50; color: #fff; } .allow:hover { background: #45a049; }.block { background: #f44336; color: #fff; } .block:hover { background: #da190b; }.whitelist { background: #2196F3; color: #fff; opacity: 0.6; cursor: not-allowed; }.reload { background: #FFC107; color: #000; } .reload:hover { background: #FFB300; }.close { position: absolute; top: 0; right: 0; background: none; border: none; font-size: 16px; cursor: pointer; color: #333; }.close:hover { color: #f44336; }
      </style><div class="popup"><div class="title">Popup Request<button class="close">✕</button></div><div class="url">${url || 'about:blank'}</div><div class="buttons"><button class="allow">Open</button><button class="whitelist" title="Sementara Belum Bisa di Gunakan">Whitelist</button><button class="block">Block</button><button class="reload">Reload</button></div></div>`;
      const remove = () => div.remove();
      shadow.querySelector('.allow').onclick = () => { callback(true); remove(); };
      shadow.querySelector('.block').onclick = () => { callback(false); remove(); };
      shadow.querySelector('.reload').onclick = () => { win.location.reload(); remove(); };
      shadow.querySelector('.close').onclick = () => { callback(false); remove(); };
      find('.popup-notification')?.remove();
      document.body.appendChild(div);
    }
    win.open = (url, name, features) => new Promise(resolve => createNotification(url, shouldOpen => resolve(shouldOpen ? originalOpen(url, name, features) : (logNote(`Blocked popup to: ${url}`), null))));
    document.addEventListener('click', e => {
      const target = e.target;
      if (target.tagName === 'A' && target.target === '_blank' && target.href) {
        e.preventDefault();
        createNotification(target.href, shouldOpen => shouldOpen ? originalOpen(target.href) : logNote(`Blocked onclick popup to: ${target.href}`));
      }
    }, true);
    document.addEventListener('submit', e => {
      const form = e.target;
      if (form.target === '_blank' && form.action) {
        e.preventDefault();
        createNotification(form.action, shouldOpen => shouldOpen ? originalOpen(form.action) : logNote(`Blocked form popup to: ${form.action}`));
      }
    }, true);
  }

  /* ================================================================== *
   * Generic bypass dispatcher
   * ================================================================== */

  function handleSite(match, exclude, data, url = '', blog = false, all = false) {
    if (CloudPS()) return;
    if (typeof exclude === 'function') {
      data = exclude;
      exclude = null;
      url = '';
      blog = false;
      all = false;
    }
    if (!new RegExp(match).test(location.host)) return;
    if (exclude && new RegExp(exclude).test(location.host)) {
      logNote(`Domain ${location.host} Excluded`, 'info');
      return;
    }
    if (typeof data === 'function') {
      try {
        data();
      } catch (e) {
        logNote(`Error executing function data: ${e.message}`, 'error');
      }
      return;
    }
    if (typeof data === 'string') {
      const parts = data.split(',');
      if (parts.every(p => pageParams.has(p.replace(/\+[0-9]+/, '')))) {
        const use = parts[0];
        let value = all
          ? pageParams.getAll(use.replace(/\+[0-9]+/, '')).find(u => new RegExp(match).test(u))
          : pageParams.get(use.replace(/\+[0-9]+/, ''));
        if (!value || value.includes('st?')) value = extractFlexibleUrl(use);
        if (value) redirect(url + value, blog);
      } else {
        const value = extractFlexibleUrl(data);
        if (value) redirect(url + value, blog);
      }
      return;
    }
    let dataObj = data;
    if (Array.isArray(data)) dataObj = { '/': data };
    if (typeof dataObj !== 'object' || dataObj === null) {
      logNote('Invalid data type: data must be a function, string, array, or object', 'error');
      return;
    }
    if (!(location.pathname in dataObj)) {
      logNote(`Pathname ${location.pathname} not found in data`, 'info');
      return;
    }
    const [key, value] = dataObj[location.pathname];
    let finalValue = '';
    if (typeof key === 'object' && key.test(location.search)) finalValue = value + RegExp.$1;
    else if (pageParams.has(key)) finalValue = value + pageParams.get(key);
    else finalValue = extractFlexibleUrl('url');
    if (finalValue) redirect(url + finalValue, blog);

    function extractFlexibleUrl(dataString) {
      const currentUrl = window.location.href;
      const urlParams = currentUrl.split('&url=');
      if (urlParams.length < 2) {
        logNote('Not enough URL parameters to extract', 'warn');
        return null;
      }
      let partsToTake = 1;
      if (dataString.match(/url\+(\d+)/)) partsToTake = parseInt(dataString.match(/url\+(\d+)/)[1]);
      if (partsToTake > urlParams.length - 1) {
        logNote(`Requested parts (${partsToTake}) exceed available URL parameters (${urlParams.length - 1})`, 'warn');
        partsToTake = urlParams.length - 1;
      }
      let extractedUrl = '';
      if (partsToTake === 1) {
        extractedUrl = urlParams[urlParams.length - 1];
      } else {
        const startIndex = urlParams.length - partsToTake;
        extractedUrl = urlParams.slice(startIndex).join('&url=');
      }
      try {
        extractedUrl = decodeURIComponent(extractedUrl);
      } catch (e) {
        logNote('Error decoding extracted URL: ' + e, 'error');
      }
      return extractedUrl;
    }
  }

  /* ================================================================== *
   * Global feature switches
   * ================================================================== */

  function runGlobalFeatures() {
    if (CloudPS(true, true, true)) return [];
    const features = [
      {
        key: 'Adblock',
        label: 'Adblock Feature',
        action: () => AIORemover('noAdb', /adblock|AdbModel|AdblockReg|AntiAdblock|blockAdBlock|checkAdBlock|detectAnyAdb|detectAdBlock|justDetectAdb|FuckAdBlock|TestAdBlock|DisableDevtool|devtools/)
      },
      {
        key: 'Prompt',
        label: 'Disable Prompts & Notifications',
        action: () => {
          const runNoPrompts = () => NoPrompts();
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runNoPrompts, { once: true });
          else runNoPrompts();
          new MutationObserver(runNoPrompts).observe(document, { childList: true, subtree: true });
        }
      },
      { key: 'SameTab', label: 'SameTab', action: SameTab },
      { key: 'TimerFC', label: 'Fast Timer', action: () => BoostTimers(cfg.get('TDelay')) },
      { key: 'AntiDebug', label: 'Anti-Debug', action: DebugLog },
      { key: 'BlockFC', label: 'Focus Control', action: NoFocus },
      { key: 'RightFC', label: 'Right Click Control', action: EnableRCF },
      { key: 'BlockPop', label: 'Popup Blocker', action: BlockPopup }
    ];
    const activated = features
      .filter(feature => cfg.get(feature.key))
      .map(feature => { feature.action(); return feature.label; });
    if (activated.length) logNote(`Activated Features: ${activated.join(', ')}`, 'info');
    return activated;
  }

  /* ================================================================== *
   * Site handlers
   * ================================================================== */

  handleSite(/(bitwidgets|virtuous-tech|coinilium|adwarden).net|(bubblix|dailytech-news).eu|(biit|carfocus|blogfly|multimix).site|(newsminer|adwyn|coderun).uno|wii.si|(cryptics|uiio|kiit|liln|dailynewshub|nanolink).fun|cryptorealm.online/, () => {
    TrustMe();
    const OriginalMutationObserver = window.MutationObserver;
    window.MutationObserver = function (callback) {
      const stack = new Error().stack;
      if (/monitorSuspiciousAttributes/.test(stack)) {
        return { observe: () => {}, disconnect: () => {} };
      }
      return new OriginalMutationObserver(callback);
    };
    window.MutationObserver.prototype = OriginalMutationObserver.prototype;
  });

  handleSite(/(youtube|youtube-nocookie).com/, () => {
    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
    document.addEventListener('visibilitychange', e => e.stopImmediatePropagation(), true);

    const waitForEl = (sel, cb, t = 1e4) => {
      const start = Date.now();
      const check = () => {
        const elm = find(sel);
        if (elm) return cb(elm);
        if (Date.now() - start > t) logNote(`Timeout: ${sel}`, 'warn');
        else setTimeout(check, 500);
      };
      setTimeout(check, 1e3);
    };

    const startDownload = (url, type) => {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/shorts/')[1]?.split('?')[0];
      if (!videoId) return logNote('Invalid video ID', 'warn');
      const endpoint = cfg.get('MediaEndpoint');
      if (!endpoint) return logNote('Media download endpoint is not configured', 'warn');
      const downloadUrl = type === 'video'
        ? `${endpoint}/youtube/video/${videoId}`
        : `${endpoint}/youtube/audio/${videoId}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.click();
      panelLog('info', 'media.download', { type: type, videoId: videoId });
    };

    const showDownloadDialog = () => {
      if (find('#dl-bp-dialog')) return;
      const dialog = document.createElement('div');
      dialog.id = 'dl-bp-dialog';
      const shadow = dialog.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>.dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 1000; width: 90%; max-width: 400px; text-align: center; }.input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }.btns { display: flex; gap: 10px; justify-content: center; }
      .btn { background: #ff0000; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; }.btn:hover { background: #cc0000; }.close { position: absolute; top: 10px; right: 10px; cursor: pointer; font-size: 20px; }</style><div class="dialog"><span class="close">X</span><h3>Download YouTube Video or Audio</h3><input class="input" type="text" value="${location.href}"><div class="btns"><button class="btn" id="video-btn">Video</button><button class="btn" id="audio-btn">Audio</button></div></div>`;
      document.body.appendChild(dialog);
      shadow.querySelector('.close').addEventListener('click', () => dialog.remove());
      shadow.querySelector('#video-btn').addEventListener('click', () => startDownload(shadow.querySelector('.input').value, 'video') && dialog.remove());
      shadow.querySelector('#audio-btn').addEventListener('click', () => startDownload(shadow.querySelector('.input').value, 'audio') && dialog.remove());
    };

    const addDownloadButton = () => waitForEl('ytd-subscribe-button-renderer', elm => {
      if (find('#dl-bp-button')) return;
      elm.parentElement.style.cssText = 'display: flex; align-items: center; gap: 8px';
      elm.insertAdjacentHTML('afterend', '<button id="dl-bp-button" style="background: #ff0000; color: white; border: none; padding: 8px 12px; border-radius: 2px; cursor: pointer; font-size: 13px; line-height: 18px;">DL BP</button>');
      find('#dl-bp-button').addEventListener('click', showDownloadDialog);
    });

    if (cfg.get('YTDown')) {
      addDownloadButton();
      document.addEventListener('yt-navigate-finish', addDownloadButton);
      document.addEventListener('yt-page-data-updated', addDownloadButton);
    }
    if (cfg.get('YTShort')) {
      const bypassShorts = () => {
        if (!location.pathname.startsWith('/shorts')) return;
        const vidId = location.pathname.split('/')[2];
        if (vidId) window.location.replace(`https://www.youtube.com/watch?v=${vidId}`);
      };
      bypassShorts();
      document.addEventListener('yt-navigate-start', bypassShorts);
    }
  });

  handleSite(/.*/, runGlobalFeatures);

  /* ================================================================== *
   * Optional delay landing page
   * ================================================================== */

  function delayPageHost() {
    try { return new URL(cfg.get('DelayPageUrl')).host; } catch (e) { return ''; }
  }

  function detectDelayLanding() {
    const h = new URL(location.href);
    const host = delayPageHost();
    if (!host || h.host !== host) return null;
    if (h.pathname !== '/' || !h.searchParams.has('BypassResults')) return null;
    return {
      isNotifyNeeded: true,
      redirectDelay: cfg.get('SetDelay'),
      link: decodeURIComponent(location.href.split('BypassResults=')[1].replace('&m=1', ''))
    };
  }

  function onHtmlLoaded() {
    const bas = detectDelayLanding();
    if (bas) {
      const { isNotifyNeeded, redirectDelay, link } = bas;
      if (isNotifyNeeded) {
        notify('Please Wait You Will be Redirected to Your Destination in @ Seconds , Thanks');
      }
      setTimeout(() => { location.href = link; }, redirectDelay * 1000);
    }

    handleSite(/coinclix.co|coinhub.wiki|(vitalityvista|geekgrove).net/, () => {
      let $ = unsafeWindow.jQuery;
      const url = window.location.href;
      if (url.includes('go/')) {
        notify('Reload the Page , if the Copied Key is Different', false, true);
        sleep(1000).then(() => {
          const link = find('p.mb-2:nth-child(2) > strong > a');
          const key = find('p.mb-2:nth-child(3) > kbd > code') || find('p.mb-2:nth-child(4) > kbd > code');
          if (link && key) {
            const keyText = key.textContent.trim();
            GM_setClipboard(keyText);
            GM_setValue('lastKey', keyText);
            GM_openInTab(link.href, false);
          } else {
            const p = Array.from(document.getElementsByTagName('p')).find(p => p.textContent.toLowerCase().includes('step 1') && p.textContent.toLowerCase().includes('google'));
            if (p) {
              sleep(1000).then(() => {
                const t = p.textContent.toLowerCase();
                GM_openInTab(
                  t.includes('geekgrove') ? 'https://www.google.com/url?q=https://geekgrove.net'
                    : t.includes('vitalityvista') ? 'https://www.google.com/url?q=https://vitalityvista.net'
                      : t.includes('coinhub') ? 'https://www.google.com/url?q=https://coinhub.wiki'
                        : 'https://www.google.com/url?q=https://geekgrove.net',
                  false
                );
              });
            }
          }
        });
      }
      if (['geekgrove.net', 'vitalityvista.net', 'coinhub.wiki'].some(site => url.includes(site))) {
        ReadytoClick('a.btn:has(.mdi-check)', 2);
        ReadytoClick('#btnLinkStart', 2);
        CaptchaDone(() => { ReadytoClick('#btnLinkContinue'); });
        CheckVisibility('#btnLinkContinue', () => {
          if (!exists('.iconcaptcha-modal')) ReadytoClick('#btnLinkContinue');
          else ReadytoClick('.iconcaptcha-modal__body');
        });
        CheckVisibility('.alert-success.alert-inline.alert', () => { ReadytoClick('#btnLpcont'); });
        sleep(1000).then(() => {
          const input = find('#linkInput.form-control');
          if (input) {
            input.value = GM_getValue('lastKey', '');
            sleep(1000).then(() => find('.btn-primary.btn-ripple')?.click());
          }
          const observer = new MutationObserver((mutations, obs) => {
            const codeEl = find('.link_code');
            if (codeEl) {
              const code = codeEl.textContent.trim();
              GM_setClipboard(code);
              $('#link_result_footer > div > div').text(`The Copied Code is / Kode yang tersalin adalah: ${code} , Please Paste the Code on the coinclix.co Site Manually / Silahkan Paste Kodenya di Situs coinclix.co secara manual`);
              obs.disconnect();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        });
      }
    });

    handleSite(/.*/, () => {
      if (CloudPS(true, true, true)) return;
      let $ = unsafeWindow.jQuery;
      const hosts = ['lopteapi.com', '3link.co', 'exeygo.com', 'vuotlink.vip'];
      if (exists('form[id=go-link]') && hosts.includes(location.host)) {
        ReadytoClick('a.btn.btn-success.btn-lg.get-link:not([disabled])', 3);
      } else if (exists('form[id=go-link]')) {
        $('form[id=go-link]').off('submit').on('submit', function (e) {
          e.preventDefault();
          let form = $(this), url = form.attr('action'), submitBtn = form.find('button');
          let navCollapse = $('.navbar-collapse.collapse'), mainHeader = $('.main-header'), sideColumn = $('.col-sm-6.hidden-xs');
          $.ajax({
            type: 'POST',
            url: url,
            data: form.serialize(),
            dataType: 'json',
            beforeSend: function (xhr) {
              submitBtn.attr('disabled', 'disabled');
              $('a.get-link').text('Bypassed');
              let btn = '<button class="btn btn-default , col-md-12 text-center" onclick="javascript: return false;"><b>Thanks for using this bypass script</b></button>';
              navCollapse.replaceWith(btn);
              mainHeader.replaceWith(btn);
              sideColumn.replaceWith(btn);
            },
            success: function (result, status, xhr) {
              let finalUrl = result.url;
              if (finalUrl.includes('swiftcut.xyz')) {
                finalUrl = finalUrl.replace(/[?&]i=[^&]*/g, '').replace(/[?]&/, '?').replace('&&', '&').replace(/[?&]$/, '');
                location.href = finalUrl;
              } else if (xhr.responseText.match(/(a-s-cracks.top|mdiskshortner.link|exashorts.fun|bigbtc.win|slink.bid|clockads.in)/)) {
                location.href = finalUrl;
              } else {
                redirect(finalUrl);
              }
            },
            error: function (xhr, status, error) {
              logNote(`AJAX request failed: ${status} - ${error}`, 'error');
            }
          });
        });
      }
    });

    handleSite(/flickr.com/, () => {
      if (!cfg.get('Flickr')) return;
      function createDownloadLinks() {
        const finalizeContainer = (container, sizesLink) => {
          if (!container.children.length) return;
          const parent = sizesLink.parentElement;
          if (parent) parent.insertBefore(container, sizesLink);
          else document.body.appendChild(container);
          logNote('The Image is Ready to Save', 'info');
        };
        waitForElm('a[href*="/sizes/"]', sizesLink => {
          if (!sizesLink) return logNote('View all sizes link not found', 'error');
          GM_xmlhttpRequest({
            method: 'GET',
            url: sizesLink.href,
            onload: response => {
              try {
                const sizesDoc = new DOMParser().parseFromString(response.responseText, 'text/html');
                const sizeItems = sizesDoc.querySelectorAll('.sizes-list li ol li');
                if (!sizeItems.length) return logNote('No size items found', 'warn');
                const container = document.createElement('div');
                container.style.cssText = 'background:white;border:1px solid #ccc;padding:10px;z-index:1000;margin-bottom:5px;position:relative';
                const header = document.createElement('div');
                header.textContent = 'Download Options';
                header.style.cssText = 'text-align:center;font-weight:bold;margin-bottom:0px;color:#333';
                container.appendChild(header);
                const closeButton = document.createElement('button');
                closeButton.textContent = 'X';
                closeButton.style.cssText = 'position:absolute;top:0px;right:0px;background:none;border:none;font-size:14px;cursor:pointer;color:#333';
                closeButton.onclick = () => container.remove();
                container.appendChild(closeButton);
                let processed = 0;
                sizeItems.forEach(item => {
                  const sizeLink = item.querySelector('a');
                  const sizeText = sizeLink ? sizeLink.textContent.trim() : item.textContent.trim();
                  const sizeName = `${sizeText} ${item.querySelector('small')?.textContent.trim() || ''}`;
                  const sizeUrl = sizeLink?.href;
                  if (!sizeUrl) {
                    processed++;
                    if (processed === sizeItems.length) finalizeContainer(container, sizesLink);
                    return;
                  }
                  GM_xmlhttpRequest({
                    method: 'GET',
                    url: sizeUrl,
                    onload: sizeResponse => {
                      try {
                        const sizeDoc = new DOMParser().parseFromString(sizeResponse.responseText, 'text/html');
                        const img = sizeDoc.querySelector('#allsizes-photo img[src]');
                        if (!img) return;
                        const saveLink = document.createElement('a');
                        saveLink.href = img.src;
                        saveLink.textContent = `Save ${sizeName}`;
                        saveLink.style.cssText = 'display:block;margin:5px 0';
                        saveLink.onclick = e => { e.preventDefault(); GM_openInTab(img.src, { active: true }); };
                        container.appendChild(saveLink);
                      } catch (e) {}
                      processed++;
                      if (processed === sizeItems.length) finalizeContainer(container, sizesLink);
                    },
                    onerror: () => {
                      processed++;
                      if (processed === sizeItems.length) finalizeContainer(container, sizesLink);
                    }
                  });
                });
              } catch (e) {
                logNote(`Error processing sizes page: ${e.message}`, 'error');
              }
            },
            onerror: () => logNote('Failed to fetch sizes page', 'error')
          });
        });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createDownloadLinks, { once: true });
      else createDownloadLinks();
    });

    handleSite(/bigbtc.win/, () => {
      CaptchaDone(() => { DoIfExists('#claimbutn'); });
      if (location.href.includes('/bonus')) {
        DoIfExists('#clickhere', 3);
      }
    });

    handleSite('(bitwidgets|virtuous-tech|coinilium|adwarden).net|(bubblix|dailytech-news).eu|(biit|carfocus|blogfly|multimix).site|(newsminer|adwyn|coderun).uno|wii.si|(cryptics|uiio|kiit|liln|dailynewshub|nanolink).fun|cryptorealm.online', () => {
      CheckVisibility('*:contains("Failed! Please reload")', () => {
        sleep(1000).then(() => { window.location.reload(); });
      });
      let $ = unsafeWindow.jQuery;
      elementReady('#clickMessage[style*="display: block"], clickMessage[style*="display:block"]').then(() => { fakeHidden(); });
      CheckVisibility('*:contains("Verified")', () => {
        const findVerify = () => Array.from(find('*', true)).find(el => el.textContent.trim() === 'Continue' || 'Verify');
        const verifyElement = findVerify();
        if (verifyElement) {
          setTimeout(() => {
            $('*[type="button"]:contains("Continue")').click();
            $('*[type="button"]:contains("Verify")').click();
          }, 1000);
        }
      });
      const tano = window.location.href;
      const knownHosts = ['dailytech-news.eu', 'wii.si', 'bubblix.eu', 'bitwidgets.net', 'virtuous-tech.net', 'carfocus.site', 'multimix.site', 'coderun.uno', 'newsminer.uno', 'cryptics.fun', 'coinilium.net', 'uiio.fun', 'nanolink.fun', 'adwarden.net', 'adwyn.uno', 'biit.site', 'cryptorealm.online', 'dailynewshub.fun', 'kiit.fun', 'liln.fun'];
      if (knownHosts.some(tino => tano.includes(tino))) {
        CheckVisibility('#captcha-container', '&&', "find('.mb-2').innerText == 'Verified'", () => ReadytoClick('button:contains("Verify")', 2));
        elementReady('#loadingDiv[style*="display:block"] button, #loadingDiv[style*="display: block"] button').then(ReadytoClick.bind(this, 'button', 2));
        elementReady('#clickMessage[style*="display: block"], clickMessage[style*="display:block"]').then(() => {
          setActiveElement('[data-placement-id="revbid-leaderboard"]');
          fakeHidden();
        });
      } else {
        CheckVisibility('text:contains("To Start")', () => {
          const textElement = find('text:contains("To Start")');
          const buttonText = textElement.textContent.match(/Click\s+(\w+)\s+To Start/i)?.[1];
          if (!buttonText) return;
          const findButton = () => {
            const elements = find('*', true);
            for (const el of elements) {
              if (el.textContent.trim() === buttonText) return el;
            }
            return null;
          };
          let buttonElement = findButton();
          if (buttonElement) {
            setTimeout(() => { $(buttonElement).click(); }, 2000);
          }
        });
      }
    });
  }

  if (['interactive', 'complete'].includes(document.readyState)) onHtmlLoaded();
  else document.addEventListener('DOMContentLoaded', onHtmlLoaded);

  panelLog('info', 'script.start', { host: location.host });
})();
