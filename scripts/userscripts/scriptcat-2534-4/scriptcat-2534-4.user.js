// ==UserScript==
// @name         抖音互动内容屏蔽
// @namespace    https://xload.net/scripts/userscripts/scriptcat-2534-4
// @version      2026.9.9.1
// @description  统一管理抖音直播弹幕、评论区、礼物特效的屏蔽规则，支持关键词过滤、用户黑名单，被屏蔽内容可选折叠或完全隐藏，规则跨场景复用。
// @author       xload
// @license      MIT
// @match        *://*.douyin.com/*
// @match        *://*.iesdouyin.com/*
// @icon         https://xload.net/favicon.svg
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  var TASK_ID = 'scriptcat-2534-4';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/scriptcat-2534-4/panel.html';
  var STORE_KEY = 'xload-dy-blk:config';
  var LOG_KEY = 'xload-dy-blk:logs';
  var LOG_MAX = 60;

  // 默认排除的宿主站点（含子域）：xload 官网与 GitHub Pages，命中直接退出
  var excludeSites = ['xload.net', 'u2222223.github.io', 'github.io'];
  function isExcludedHost() {
    try {
      var host = location.hostname.toLowerCase();
      for (var i = 0; i < excludeSites.length; i++) {
        var e = excludeSites[i];
        if (host === e || host.slice(-(e.length + 1)) === '.' + e) return true;
      }
    } catch (err) { /* ignore */ }
    return false;
  }

  // ------------------------- 内置日志（环形缓冲） -------------------------
  var _logs = [];
  function loadLogs() {
    try {
      var raw = window.localStorage.getItem(LOG_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) _logs = arr.slice(-LOG_MAX);
      }
    } catch (e) { _logs = []; }
  }
  function flushLogs() {
    try { window.localStorage.setItem(LOG_KEY, JSON.stringify(_logs.slice(-LOG_MAX))); } catch (e) { /* ignore */ }
  }
  function log(tag, data) {
    var entry = { t: Date.now(), tag: tag, data: data == null ? {} : data };
    _logs.push(entry);
    if (_logs.length > LOG_MAX) _logs.splice(0, _logs.length - LOG_MAX);
    try {
      console.log('[互动内容屏蔽][' + tag + ']', data == null ? '' : data);
      flushLogs();
    } catch (e) { /* ignore */ }
  }
  loadLogs();

  // ------------------------- 全局错误捕获（入日志） -------------------------
  window.addEventListener('error', function (ev) {
    try {
      log('global.error', { message: ev.message, file: ev.filename, line: ev.lineno, col: ev.colno });
    } catch (e) { /* ignore */ }
  });
  window.addEventListener('unhandledrejection', function (ev) {
    try {
      var r = ev && ev.reason;
      log('global.unhandledrejection', { message: (r && r.message) ? r.message : String(r) });
    } catch (e) { /* ignore */ }
  });

  // =====================================================================
  // CORE-START
  // =====================================================================
  // 纯函数规则引擎：不依赖 DOM / GM_* / 全局状态，可单测。

  // 转义正则特殊字符
  function escRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 把一条关键词/正则字符串编译成匹配器：
  //   - 形式 /pattern/flags → 正则（flags 仅接受 img）
  //   - 其他 → 忽略大小写子串匹配
  function keyToMatcher(value) {
    var s = String(value == null ? '' : value);
    if (s.length === 0) return null;
    var m = /^\/(.+)\/([a-z]*)$/.exec(s);
    if (m) {
      try {
        var flags = (m[2] || '').replace(/[^img]/g, '');
        return { kind: 're', text: s, re: new RegExp(m[1], flags) };
      } catch (e) { /* fallthrough 子串 */ }
    }
    var lower = s.toLowerCase();
    return { kind: 'sub', text: s, lower: lower };
  }

  // 编译关键词数组 → 匹配器数组（过滤空/无效）
  function compileKeywords(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var k = keyToMatcher(list[i]);
      if (k) out.push(k);
    }
    return out;
  }

  // 文本是否命中任一匹配器
  function matchAny(text, matchers) {
    if (text == null || text === '') return false;
    var t = String(text);
    var lower = t.toLowerCase();
    for (var i = 0; i < matchers.length; i++) {
      var k = matchers[i];
      if (k.kind === 're') {
        k.re.lastIndex = 0;
        if (k.re.test(t)) return true;
      } else {
        if (lower.indexOf(k.lower) !== -1) return true;
      }
    }
    return false;
  }

  // 用户是否命中（黑名单列表：大小写不敏感精确匹配或子串命中）
  function matchUser(user, users) {
    if (user == null || user === '') return false;
    if (!Array.isArray(users) || users.length === 0) return false;
    var u = String(user).toLowerCase();
    for (var i = 0; i < users.length; i++) {
      var v = String(users[i] == null ? '' : users[i]);
      if (v === '') continue;
      var lv = v.toLowerCase();
      if (u === lv || u.indexOf(lv) !== -1 || lv.indexOf(u) !== -1) return true;
    }
    return false;
  }

  // 编译分场景屏蔽配置 → 可复用的匹配结构（纯函数）
  // settings: { danmaku:{keywords,users}, comment:{keywords,users} }
  function compileBlocks(settings) {
    var s = settings || {};
    return {
      danmaku: {
        keywords: compileKeywords(s.danmaku && s.danmaku.keywords),
        users: (s.danmaku && s.danmaku.users) || []
      },
      comment: {
        keywords: compileKeywords(s.comment && s.comment.keywords),
        users: (s.comment && s.comment.users) || []
      }
    };
  }

  // 核心判定：给定 text/user 与某场景编译块，返回命中信息或 null
  function evalBlocker(text, user, block) {
    if (!block) return null;
    if (matchAny(text, block.keywords)) {
      return { type: 'keyword' };
    }
    if (matchUser(user, block.users)) {
      return { type: 'user' };
    }
    return null;
  }

  // URL 白名单：仅允许 http/https
  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    var s = url.trim();
    if (!/^https?:\/\//i.test(s)) return false;
    return true;
  }

  // 生成本地唯一 id（用于规则/元素标记）
  function uid() {
    return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // 规则文本解析（导入用）：每行一条，格式「类型:值:场景」或「类型:值」
  //   类型 = keyword|user；值 = 关键词或昵称；场景 = danmaku|comment|all（缺省 all）
  function parseRulesText(text) {
    var rules = [];
    if (typeof text !== 'string') return rules;
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line === '' || line.charAt(0) === '#') continue;
      var parts = line.split(':');
      var type = (parts[0] || '').trim().toLowerCase();
      if (type !== 'keyword' && type !== 'user') continue;
      var value = parts.slice(1, parts.length - 1).join(':').trim();
      if (!value && parts.length > 3) value = parts.slice(1).join(':').trim();
      if (value === '') {
        // 只有两段「类型:值」
        value = (parts[1] || '').trim();
        rules.push({ type: type, value: value, scene: 'all' });
        continue;
      }
      var scene = (parts[parts.length - 1] || '').trim().toLowerCase();
      if (scene !== 'danmaku' && scene !== 'comment' && scene !== 'all') {
        // 末段不是场景名，视为值的一部分
        value = parts.slice(1).join(':').trim();
        scene = 'all';
      }
      rules.push({ type: type, value: value, scene: scene });
    }
    return rules;
  }

  // 规则序列化（导出用）：每行「类型:值:场景」
  function formatRulesText(rules) {
    var out = [];
    if (!Array.isArray(rules)) return '';
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i] || {};
      var t = r.type === 'user' ? 'user' : 'keyword';
      var v = String(r.value == null ? '' : r.value);
      var scene = (r.scene === 'danmaku' || r.scene === 'comment') ? r.scene : 'all';
      if (v === '') continue;
      out.push(t + ':' + v + ':' + scene);
    }
    return out.join('\n');
  }

  // 把统一规则列表分配到 settings 的 danmaku/comment 关键词与用户列表（导入规则落地）
  function applyRulesToSettings(settings, rules) {
    var s = settings || {};
    s.danmaku = s.danmaku || {};
    s.comment = s.comment || {};
    s.danmaku.keywords = s.danmaku.keywords || [];
    s.danmaku.users = s.danmaku.users || [];
    s.comment.keywords = s.comment.keywords || [];
    s.comment.users = s.comment.users || [];
    if (!Array.isArray(rules)) return s;
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i] || {};
      var isUser = r.type === 'user';
      var inD = r.scene === 'danmaku' || r.scene === 'all';
      var inC = r.scene === 'comment' || r.scene === 'all';
      if (isUser) {
        if (inD && s.danmaku.users.indexOf(r.value) === -1) s.danmaku.users.push(r.value);
        if (inC && s.comment.users.indexOf(r.value) === -1) s.comment.users.push(r.value);
      } else {
        if (inD && s.danmaku.keywords.indexOf(r.value) === -1) s.danmaku.keywords.push(r.value);
        if (inC && s.comment.keywords.indexOf(r.value) === -1) s.comment.keywords.push(r.value);
      }
    }
    return s;
  }

  // 从 settings 抽取统一规则列表（导出/展示用）
  function collectRules(settings) {
    var rules = [];
    var s = settings || {};
    function pushScene(arr, type, scene) {
      if (!Array.isArray(arr)) return;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] == null || String(arr[i]) === '') continue;
        rules.push({ type: type, value: String(arr[i]), scene: scene });
      }
    }
    pushScene(s.danmaku && s.danmaku.keywords, 'keyword', 'danmaku');
    pushScene(s.danmaku && s.danmaku.users, 'user', 'danmaku');
    pushScene(s.comment && s.comment.keywords, 'keyword', 'comment');
    pushScene(s.comment && s.comment.users, 'user', 'comment');
    return rules;
  }
  // =====================================================================
  // CORE-END
  // =====================================================================

  // ------------------------- 存储封装（@grant none → localStorage） -------------------------
  function defaultSettings() {
    return {
      danmaku: { enabled: true, blockAll: false, keywords: [], users: [] },
      comment: { enabled: true, mode: 'fold', keywords: [], users: [] },
      gift: { enabled: true, blockGiftAnim: true, blockEnter: true, blockLike: true, blockFansClub: true }
    };
  }

  function deepMerge(base, patch) {
    var out = {};
    for (var k in base) out[k] = base[k];
    if (patch && typeof patch === 'object') {
      for (var k2 in patch) out[k2] = patch[k2];
    }
    return out;
  }

  function storeGet() {
    var def = defaultSettings();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return def;
      var obj = JSON.parse(raw);
      return {
        danmaku: deepMerge(def.danmaku, obj.danmaku),
        comment: deepMerge(def.comment, obj.comment),
        gift: deepMerge(def.gift, obj.gift)
      };
    } catch (e) {
      log('store.get.error', { message: String(e && e.message || e) });
      return def;
    }
  }
  function storeSet(v) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { log('store.set.error', { message: String(e && e.message || e) }); }
  }

  // ------------------------- 运行时状态 -------------------------
  var settings = storeGet();
  var compiled = compileBlocks(settings);
  var stats = { danmaku: 0, comment: 0, gift: 0 };
  var observers = [];
  var giftStyleEl = null;

  // =====================================================================
  // 面板通信通道（共享模板 templates/channel.js，整体复制）
  // =====================================================================
  function createChannel(taskId) {
    var bc = null;
    var handlers = {};
    var panelWin = null;
    try { bc = new BroadcastChannel('xload-panel:' + taskId); } catch (e) { bc = null; }

    function dispatch(msg) {
      if (!msg || typeof msg !== 'object' || !msg.type) return;
      var hs = handlers[msg.type];
      if (hs) {
        var data = msg.data == null ? {} : msg.data;
        for (var i = 0; i < hs.length; i++) hs[i](data, msg);
      }
    }
    if (bc) bc.onmessage = function (ev) { dispatch(ev.data); };

    function onWindowMessage(ev) {
      var m = ev && ev.data;
      if (!m || typeof m !== 'object' || !m.type) return;
      if (ev.source === window) return;
      if (m._from && m._from !== taskId) return;
      m._source = ev.source;
      dispatch(m);
    }
    window.addEventListener('message', onWindowMessage);

    function postTo(win, m) {
      try {
        if (win && typeof win.postMessage === 'function') {
          win.postMessage.call(win, m, '*');
          return true;
        }
      } catch (e) { /* ignore */ }
      return false;
    }

    return {
      send: function (type, data) {
        var m = { type: type, data: data == null ? {} : data, _from: taskId };
        var r = { panelWin: postTo(panelWin, m), bc: false };
        if (bc) { try { bc.postMessage(m); r.bc = true; } catch (e) { /* ignore */ } }
        if (typeof log === 'function') log('channel.send', { type: type, panelWin: r.panelWin, bc: r.bc });
      },
      reply: function (msg, data) {
        if (!msg || msg._id == null || !msg._request) return;
        var m = { type: msg.type, data: data == null ? {} : data, _id: msg._id, _from: taskId };
        var r = {
          panelWin: postTo(panelWin, m),
          source: (msg._source && msg._source !== panelWin) ? postTo(msg._source, m) : false,
          bc: false
        };
        if (bc) { try { bc.postMessage(m); r.bc = true; } catch (e) { /* ignore */ } }
        if (typeof log === 'function') log('channel.reply.send', { type: m.type, ok: r, hasPanelWin: !!panelWin, hasSource: !!msg._source, hasBc: !!bc });
      },
      on: function (type, h) { (handlers[type] = handlers[type] || []).push(h); },
      setPanelWin: function (w) { panelWin = w; },
      getPanelWin: function () { return panelWin; }
    };
  }

  var channel = createChannel(TASK_ID);

  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    loadLogs();
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) {
      try { existing.focus(); } catch (e) { /* ignore */ }
      log('panel.reuse', {});
      return true;
    }
    log('panel.open', { url: PANEL_URL });
    try {
      var W = Math.min(920, Math.max(480, (window.screen.availWidth || 1280) - 120));
      var H = Math.min(800, Math.max(560, (window.screen.availHeight || 800) - 140));
      var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
      var T = Math.max(0, Math.round(((window.screen.availHeight || 800) - H) / 2));
      var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T +
        ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
      var w = window.open(PANEL_URL, '_blank', features);
      var result = { opened: !!w, requestedW: W, requestedH: H, left: L, top: T };
      if (w) {
        try { w.moveTo(L, T); w.resizeTo(W, H); } catch (e) { /* 跨源 popup 部分浏览器受限 */ }
        channel.setPanelWin(w);
      }
      log('panel.open.result', result);
      return !!w;
    } catch (e) {
      log('panel.open.error', { message: String(e && e.message || e) });
      return false;
    }
  }

  // =====================================================================
  // FAB 聚合按钮组（共享模板 templates/fab.js，整体复制）
  // =====================================================================
  function xloadFab() {
    var POS_KEY = 'xload-fab-pos';
    var COLLAPSE_KEY = 'xload-fab-collapsed';
    var DRAG_THRESHOLD = 4;
    var collapsed = false;

    function storeGet(key, def) {
      try {
        if (typeof GM_getValue === 'function') {
          var v = GM_getValue(key, null);
          return (v == null) ? def : v;
        }
        var s = window.localStorage.getItem(key);
        return (s == null) ? def : JSON.parse(s);
      } catch (e) { return def; }
    }
    function storeSet(key, val) {
      try {
        if (typeof GM_setValue === 'function') { GM_setValue(key, val); return; }
        window.localStorage.setItem(key, JSON.stringify(val));
      } catch (e) { /* ignore */ }
    }

    var root = document.getElementById('xload-fab-root');
    if (root) {
      var oldList = root.querySelector('[data-xload-fab-list]');
      if (oldList) { oldList.style.display = 'flex'; }
    } else {
      root = document.createElement('div');
      root.id = 'xload-fab-root';
      root.setAttribute('data-xload-fab-root', 'true');
      document.body.appendChild(root);
    }

    var oldStyle = root.querySelector('style[data-xload-fab-style]');
    if (oldStyle && oldStyle.getAttribute('data-xload-fab-style-version') !== '3') {
      oldStyle.parentNode.removeChild(oldStyle);
      oldStyle = null;
    }
    if (!oldStyle) {
      var st = document.createElement('style');
      st.setAttribute('data-xload-fab-style', '');
      st.setAttribute('data-xload-fab-style-version', '3');
      st.textContent =
        '#xload-fab-root{' +
          'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
          'display:flex;flex-direction:column;gap:6px;' +
          'min-width:170px;max-width:240px;padding:8px;box-sizing:border-box;' +
          'background:#fff;' +
          'border:1px solid #e2e8f0;border-radius:12px;' +
          'box-shadow:0 8px 24px rgba(15,23,42,.10),0 2px 6px rgba(15,23,42,.05);' +
          'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;' +
          'user-select:none;-webkit-user-select:none;touch-action:none;' +
        '}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"]{padding:6px;}' +
        '#xload-fab-root button{font-family:inherit;}' +
        '#xload-fab-root [data-xload-fab-toggle]{' +
          'display:flex;align-items:center;gap:8px;width:100%;' +
          'padding:9px 10px;border:0;border-radius:9px;cursor:pointer;' +
          'background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;' +
          'font-size:13px;font-weight:700;letter-spacing:.2px;line-height:1;text-align:left;' +
          'box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 6px rgba(29,78,216,.25);' +
          'transition:filter .15s ease,box-shadow .15s ease;' +
        '}' +
        '#xload-fab-root [data-xload-fab-toggle]:hover{' +
          'filter:brightness(1.07);' +
          'box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 3px 10px rgba(29,78,216,.35);' +
        '}' +
        '#xload-fab-root [data-xload-fab-toggle]:active{filter:brightness(.95);}' +
        '#xload-fab-root .xf-brand{' +
          'display:inline-flex;align-items:center;justify-content:center;flex:none;' +
          'width:21px;height:21px;border-radius:6px;background:#fff;color:#1d4ed8;' +
          'font-size:11px;font-weight:800;' +
        '}' +
        '#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '#xload-fab-root .xf-caret{' +
          'flex:none;width:0;height:0;' +
          'border-left:4px solid transparent;border-right:4px solid transparent;' +
          'border-top:5px solid rgba(255,255,255,.85);transition:transform .18s ease;' +
        '}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-90deg);}' +
        '#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;gap:6px;margin-top:2px;}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] [data-xload-fab-list]{display:none;}' +
        '#xload-fab-root [data-xload-fab-item]{' +
          'display:flex;align-items:center;gap:9px;width:100%;' +
          'padding:9px 11px;border:1px solid #e2e8f0;border-radius:9px;' +
          'background:#f8fafc;color:#334155;' +
          'font-size:13px;font-weight:500;line-height:1;text-align:left;cursor:pointer;' +
          'box-shadow:0 1px 2px rgba(15,23,42,.04);' +
          'transition:border-color .15s ease,background .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease;' +
        '}' +
        '#xload-fab-root [data-xload-fab-item]:hover{' +
          'border-color:#93c5fd;background:#eff6ff;color:#1d4ed8;' +
          'box-shadow:0 2px 8px rgba(37,99,235,.15);' +
        '}' +
        '#xload-fab-root [data-xload-fab-item]:active{background:#dbeafe;}' +
        '#xload-fab-root .xf-dot{' +
          'width:8px;height:8px;border-radius:50%;flex:none;background:#10b981;' +
        '}' +
        '@media (prefers-color-scheme:dark){' +
          '#xload-fab-root{background:#111827;border-color:rgba(148,163,184,.20);' +
            'box-shadow:0 8px 24px rgba(0,0,0,.5);}' +
          '#xload-fab-root [data-xload-fab-item]{background:#1f2937;border-color:rgba(148,163,184,.22);color:#e2e8f0;}' +
          '#xload-fab-root [data-xload-fab-item]:hover{border-color:#3b82f6;background:rgba(37,99,235,.18);color:#fff;' +
            'box-shadow:0 2px 8px rgba(59,130,246,.3);}' +
          '#xload-fab-root [data-xload-fab-item]:active{background:rgba(37,99,235,.28);}' +
        '}';
      root.appendChild(st);
    }

    var handle = root.querySelector('[data-xload-fab-toggle]');
    if (!handle) {
      handle = document.createElement('button');
      handle.type = 'button';
      handle.setAttribute('data-xload-fab-toggle', 'true');
      handle.setAttribute('aria-label', 'xload 工具');
      root.insertBefore(handle, root.firstChild);
    }
    if (!handle.querySelector('.xf-caret')) {
      handle.innerHTML =
        '<span class="xf-brand">x</span>' +
        '<span class="xf-title">xload 工具</span>' +
        '<span class="xf-caret"></span>';
    }

    var list = root.querySelector('[data-xload-fab-list]');
    if (!list) {
      list = document.createElement('div');
      list.setAttribute('data-xload-fab-list', 'true');
      root.appendChild(list);
    }
    list.style.display = 'flex';

    function setCollapsed(c) {
      collapsed = !!c;
      if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
      else { root.removeAttribute('data-xload-fab-collapsed'); }
      storeSet(COLLAPSE_KEY, collapsed);
    }
    function toggleCollapse() {
      setCollapsed(!collapsed);
      var p = storeGet(POS_KEY, null);
      if (p && typeof p.x === 'number' && typeof p.y === 'number') { applyPos(p.x, p.y); }
    }

    var movedFlag = false;
    if (!root.getAttribute('data-xload-fab-drag-ready')) {
      root.setAttribute('data-xload-fab-drag-ready', 'true');

      function applyPos(x, y) {
        x = Math.max(4, Math.min(x, window.innerWidth - root.offsetWidth - 4));
        y = Math.max(4, Math.min(y, window.innerHeight - root.offsetHeight - 4));
        root.style.left = x + 'px';
        root.style.top = y + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        return { x: x, y: y };
      }

      function restorePos() {
        var p = storeGet(POS_KEY, null);
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          applyPos(p.x, p.y);
        }
      }

      collapsed = storeGet(COLLAPSE_KEY, false);
      if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
      else { root.removeAttribute('data-xload-fab-collapsed'); }

      var dragging = false;
      var downOnToggle = false;
      var sx = 0, sy = 0, ox = 0, oy = 0;

      root.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        var t = ev.target;
        var isToggle = !!(t && t.closest && t.closest('[data-xload-fab-toggle]'));
        var isItem = !!(t && t.closest && t.closest('[data-xload-fab-item]'));
        if (isItem && !isToggle) return;
        dragging = true;
        movedFlag = false;
        downOnToggle = isToggle;
        sx = ev.clientX; sy = ev.clientY;
        ox = root.offsetLeft; oy = root.offsetTop;
        try { root.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      });

      root.addEventListener('pointermove', function (ev) {
        if (!dragging) return;
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!movedFlag && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        movedFlag = true;
        applyPos(ox + dx, oy + dy);
      });

      function endDrag() {
        if (!dragging) return;
        dragging = false;
        if (movedFlag) {
          storeSet(POS_KEY, { x: root.offsetLeft, y: root.offsetTop });
        } else if (downOnToggle) {
          toggleCollapse();
        }
        downOnToggle = false;
      }
      root.addEventListener('pointerup', endDrag);
      root.addEventListener('pointercancel', function () {
        if (!dragging) return;
        dragging = false;
        downOnToggle = false;
        movedFlag = false;
      });

      function onViewportChange() {
        var p = storeGet(POS_KEY, null);
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          applyPos(p.x, p.y);
        } else if (root.style.left || root.style.top) {
          applyPos(parseInt(root.style.left, 10) || 16, parseInt(root.style.top, 10) || 140);
        }
      }
      window.addEventListener('resize', onViewportChange);
      window.addEventListener('orientationchange', onViewportChange);

      restorePos();
      setTimeout(onViewportChange, 200);
    }

    return {
      root: root,
      list: list,
      setCollapsed: setCollapsed,
      toggleCollapse: toggleCollapse,
      isCollapsed: function () { return collapsed; },
      addItem: function (taskId, label, onClick) {
        var existing = list.querySelector('[data-xload-task="' + taskId + '"]');
        if (existing) return existing;
        var item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('data-xload-fab-item', 'true');
        item.setAttribute('data-xload-task', taskId);
        var dot = document.createElement('span');
        dot.className = 'xf-dot';
        var txt = document.createElement('span');
        txt.textContent = label;
        item.appendChild(dot);
        item.appendChild(txt);
        item.addEventListener('pointerdown', function (ev) {
          if (ev.button !== 0) return;
          var sx2 = ev.clientX, sy2 = ev.clientY;
          var dragged = false;
          var onMove = function (ev2) {
            if (Math.abs(ev2.clientX - sx2) > DRAG_THRESHOLD || Math.abs(ev2.clientY - sy2) > DRAG_THRESHOLD) {
              dragged = true;
            }
          };
          var onUp = function () {
            item.removeEventListener('pointermove', onMove);
            item.removeEventListener('pointerup', onUp);
            item.removeEventListener('pointercancel', onUp);
            if (dragged) movedFlag = true;
          };
          item.addEventListener('pointermove', onMove, { once: false });
          item.addEventListener('pointerup', onUp, { once: true });
          item.addEventListener('pointercancel', onUp, { once: true });
        });
        item.addEventListener('click', function () {
          if (movedFlag) { movedFlag = false; return; }
          if (onClick) onClick();
        });
        list.appendChild(item);
        return item;
      }
    };
  }

  // ------------------------- DOM 工具 -------------------------
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // 观察 DOM 新增节点（childList + subtree），对命中节点执行回调
  function watchNodes(selector, callback, root) {
    var r = root || document.body;
    if (!r) return null;
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var n = m.addedNodes[i];
          if (n.nodeType !== 1) continue;
          try {
            if (n.matches && n.matches(selector)) { callback(n); continue; }
            if (n.querySelectorAll) {
              var hits = n.querySelectorAll(selector);
              for (var j = 0; j < hits.length; j++) callback(hits[j]);
            }
          } catch (e) { /* ignore */ }
        }
      });
    });
    mo.observe(r, { childList: true, subtree: true });
    return mo;
  }

  // 提取 React fiber 实例（参考原脚本 getReactInstance，照抄客观挂载键）
  function getReactInstance(el) {
    try {
      var keys = Object.keys(el);
      for (var i = 0; i < keys.length; i++) {
        if (/^__reactFiber\$|^__reactInternalInstance\$/.test(keys[i])) {
          var fiber = el[keys[i]];
          return { reactFiber: fiber };
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // 从弹幕元素提取 message 实例（多路径兜底 + 上溯 30 层）
  function extractMessageFromDom(el) {
    var inst = getReactInstance(el);
    if (!inst || !inst.reactFiber) return null;
    var node = inst.reactFiber;
    try {
      // 直接候选路径（照抄原脚本的消息挂载位置思路）
      var cands = [];
      if (node.memoizedProps && node.memoizedProps.message) cands.push(node.memoizedProps.message);
      if (node.return && node.return.memoizedProps && node.return.memoizedProps.message) cands.push(node.return.memoizedProps.message);
      var fib = node.memoizedProps && node.memoizedProps.children && node.memoizedProps.children.props;
      if (fib && fib.children && fib.children.props && fib.children.props.message) cands.push(fib.children.props.message);
      for (var c = 0; c < cands.length; c++) {
        if (cands[c] && typeof cands[c] === 'object') return cands[c];
      }
      // 深度上溯（沿 return 链向上找含 message 的对象）
      var cur = node;
      var depth = 0;
      while (cur && depth < 40) {
        var p = cur.memoizedProps;
        if (p && p.message && typeof p.message === 'object') return p.message;
        cur = cur.return;
        depth++;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // 提取弹幕信息 { method, text, user, chatBy, isGift, isEnter, isLike }
  function extractDanmaku(el) {
    var msg = extractMessageFromDom(el);
    var out = { method: null, text: '', user: '', chatBy: null, raw: null };
    if (msg) {
      out.raw = msg;
      out.method = msg.method || null;
      var payload = msg.payload || {};
      var common = payload.common || {};
      out.text = payload.content || common.describe || '';
      if (payload.user && payload.user.nickname) out.user = payload.user.nickname;
      else if (common.user && common.user.nickname) out.user = common.user.nickname;
      out.chatBy = payload.chat_by;
    }
    if (!out.text) {
      var txt = (el.textContent || '').trim();
      // 去掉用户名前缀后的正文（降级，尽力而为）
      out.text = txt;
    }
    if (typeof out.text === 'string') out.text = out.text.trim();
    return out;
  }

  // ------------------------- 弹幕适配器（直播） -------------------------
  var DANMAKU_SEL = '#chatroom .webcast-chatroom___item';

  function hideDanmaku(el) {
    try { el.style.display = 'none'; } catch (e) { /* ignore */ }
    try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) { /* ignore */ }
  }

  function processDanmaku(el) {
    if (el.getAttribute('data-xload-blk')) return;
    el.setAttribute('data-xload-blk', '1');
    var s = settings;
    var d = s.danmaku;
    if (!d.enabled) return;
    var info = extractDanmaku(el);
    var method = info.method;
    var g = s.gift;

    // 礼物消息（弹幕层“送礼信息”）
    if (method === 'WebcastGiftMessage') {
      if (g.enabled && g.blockGiftAnim) { hideDanmaku(el); stats.gift++; }
      return;
    }
    // 进场/成员消息（新等级进场特效）
    if (method === 'WebcastMemberMessage' || method === 'WebcastRoomMessage') {
      if (g.enabled && g.blockEnter) { hideDanmaku(el); stats.gift++; }
      return;
    }
    // 点赞播报
    if (method === 'WebcastLikeMessage') {
      if (g.enabled && g.blockLike) { hideDanmaku(el); stats.gift++; }
      return;
    }
    // 普通聊天（弹幕）：屏蔽全部 / 关键词 / 用户
    if (method === 'WebcastChatMessage' || method === 'WebcastEmojiChatMessage' || method === null || method === 'WebcastScreenChatMessage') {
      if (d.blockAll && method === 'WebcastChatMessage') { hideDanmaku(el); stats.danmaku++; return; }
      var r = evalBlocker(info.text, info.user, compiled.danmaku);
      if (r) { hideDanmaku(el); stats.danmaku++; }
      return;
    }
    // 其余消息类型如粉丝团/展馆：若启用了关键词/用户屏蔽，仍尝试匹配文本
    var r2 = evalBlocker(info.text, info.user, compiled.danmaku);
    if (r2) { hideDanmaku(el); stats.danmaku++; }
  }

  function scanDanmaku() {
    $$(DANMAKU_SEL).forEach(function (el) {
      if (!el.getAttribute('data-xload-blk')) processDanmaku(el);
    });
  }

  // ------------------------- 评论适配器 -------------------------
  var COMMENT_SEL = '[data-e2e="comment-item"]';

  function extractComment(el) {
    var user = '';
    var text = '';
    var u = el.querySelector('[data-e2e="comment-username"], .comment-item-username, [class*="user-name"], [class*="username"]');
    if (!u) u = el.querySelector('a[href*="/user/"]');
    if (u) user = (u.textContent || '').trim();
    if (!user) {
      // 兜底：取名称区域常见文本（限制长度避免抓到大段正文）
      var cands = $$('.comment-item-content', el).map(function (n) { return n.textContent.trim(); });
      for (var i = 0; i < cands.length; i++) {
        if (cands[i] && cands[i].length <= 40) { user = cands[i]; break; }
      }
    }
    var c = el.querySelector('[data-e2e="comment-content"], .comment-item-content, [class*="comment-content"]');
    if (c) text = (c.textContent || '').trim();
    if (!text) text = (el.textContent || '').replace(user, '').trim();
    return { user: user, text: text };
  }

  function foldComment(el) {
    if (el.getAttribute('data-xload-folded')) return;
    el.setAttribute('data-xload-folded', '1');
    try {
      var bar = document.createElement('div');
      bar.className = 'xload-blk-foldbar';
      bar.textContent = '已屏蔽评论（点击展开查看）';
      bar.style.cssText = 'padding:8px 12px;font-size:12px;color:#94a3b8;cursor:pointer;border-bottom:1px solid #e2e8f0;';
      var inner = el.innerHTML;
      el.innerHTML = '';
      el.appendChild(bar);
      var expanded = false;
      var _original = inner;
      bar.addEventListener('click', function () {
        if (expanded) {
          bar.textContent = '已屏蔽评论（点击展开查看）';
          el.innerHTML = '';
          el.appendChild(bar);
          expanded = false;
        } else {
          bar.textContent = '已屏蔽评论（点击收起）';
          el.innerHTML = _original;
          expanded = true;
        }
      });
    } catch (e) { el.style.display = 'none'; }
  }

  function processComment(el) {
    if (el.getAttribute('data-xload-blk')) return;
    el.setAttribute('data-xload-blk', '1');
    var c = settings.comment;
    if (!c.enabled) return;
    var info = extractComment(el);
    var r = evalBlocker(info.text, info.user, compiled.comment);
    if (!r) return;
    stats.comment++;
    if (c.mode === 'fold') foldComment(el);
    else { el.style.display = 'none'; }
  }

  function scanComments() {
    $$(COMMENT_SEL).forEach(function (el) {
      if (!el.getAttribute('data-xload-blk')) processComment(el);
    });
  }

  // ------------------------- 礼物特效适配器（CSS 屏蔽 + DOM 观察） -------------------------
  // 页面事实类名/ID（照抄自参考源，属客观站点事实）
  function buildGiftCss(g) {
    var css = '';
    if (g.blockGiftAnim) {
      css += '#GiftTrayLayout,#GiftEffectLayout,#GiftMenuLayout,div[id^="gift_effect_bg_"]{display:none!important;}\n';
    }
    if (g.blockEnter) {
      css += '#chatroom .webcast-chatroom___bottom-message,div[style*="new_grade_enter"]{display:none!important;}\n';
    }
    if (g.blockFansClub) {
      css += '#chatroom .webcast-chatroom___item span:has(>div[style*="fansclub"]),#chatroom .webcast-chatroom___item *:has(>img[src*="fansclub"]){display:none!important;}\n';
    }
    return css;
  }

  function applyGiftCss() {
    var css = settings.gift.enabled ? buildGiftCss(settings.gift) : '';
    if (!giftStyleEl) {
      giftStyleEl = document.createElement('style');
      giftStyleEl.id = 'xload-blk-gift-style';
      document.documentElement.appendChild(giftStyleEl);
    }
    giftStyleEl.textContent = css;
  }

  // ------------------------- 设置应用（重新编译 + 重新扫描 + 礼物 CSS） -------------------------
  function applySettings() {
    compiled = compileBlocks(settings);
    applyGiftCss();
    try {
      scanDanmaku();
      scanComments();
    } catch (e) { log('apply.scan.error', { message: String(e && e.message || e) }); }
  }

  function setSettings(next) {
    settings = next || defaultSettings();
    storeSet(settings);
    applySettings();
  }

  // ------------------------- 面板命令处理 -------------------------
  function onCommand(cmd, msg) {
    try {
      switch (cmd) {
        case 'getState':
          channel.reply(msg, { settings: settings, stats: stats, version: '2026.9.9.1' });
          log('channel.command.getState', {});
          break;
        case 'setState':
          if (msg.data && msg.data.settings) {
            setSettings(msg.data.settings);
            channel.reply(msg, { ok: true, settings: settings });
            log('channel.command.setState', {});
          } else {
            channel.reply(msg, { ok: false, error: '缺少 settings' });
            log('channel.command.setState.error', {});
          }
          break;
        case 'reset':
          setSettings(defaultSettings());
          stats = { danmaku: 0, comment: 0, gift: 0 };
          channel.reply(msg, { ok: true, settings: settings });
          log('channel.command.reset', {});
          break;
        case 'pullStats':
          channel.reply(msg, { stats: stats });
          log('channel.command.pullStats', {});
          break;
        case 'getLogs':
          channel.reply(msg, { logs: _logs.slice(-LOG_MAX) });
          log('channel.command.getLogs', { count: Math.min(LOG_MAX, _logs.length) });
          break;
        default:
          log('channel.command.unknown', { cmd: cmd });
      }
    } catch (e) {
      log('channel.command.error', { cmd: cmd, message: String(e && e.message || e) });
    }
  }
  channel.on('command', function (data, msg) {
    if (data && data.cmd) onCommand(data.cmd, msg);
  });

  // ------------------------- 启动 -------------------------
  function startObservers() {
    if (observers.length) return;
    var danmo = watchNodes(DANMAKU_SEL, function (el) { processDanmaku(el); });
    if (danmo) observers.push(danmo);
    var como = watchNodes(COMMENT_SEL, function (el) { processComment(el); });
    if (como) observers.push(como);
    log('init.observers', { danmaku: !!danmo, comment: !!como });
  }

  function mountFab() {
    try {
      var fab = xloadFab();
      fab.addItem(TASK_ID, '互动屏蔽', function () { openPanel(); });
      log('init.fab', {});
    } catch (e) {
      log('init.fab.error', { message: String(e && e.message || e) });
    }
  }

  function init() {
    try {
      log('init', { href: location.href });
      if (isExcludedHost()) { log('init.excluded', { host: location.hostname }); return; }

      // 礼物 CSS 尽早注入
      applyGiftCss();

      // 等待 body 就绪后启动观察器与 FAB
      var ready = function () {
        if (!document.body) return false;
        startObservers();
        scanDanmaku();
        scanComments();
        mountFab();
        return true;
      };
      if (!ready()) {
        var tick = 0;
        var timer = setInterval(function () {
          tick++;
          if (ready() || tick > 200) { clearInterval(timer); }
        }, 120);
      }
    } catch (e) {
      log('init.error', { message: String(e && e.message || e) });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // 暴露（供调试/面板排错）
  try {
    window.__xloadDyBlocker = {
      taskId: TASK_ID,
      getSettings: function () { return settings; },
      getStats: function () { return stats; },
      getLogs: function () { return _logs; },
      openPanel: openPanel
    };
  } catch (e) { /* ignore */ }
})();