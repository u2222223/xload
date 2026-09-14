// ==UserScript==
// @name         Zhihu Content Filter
// @name:en      Zhihu Content Filter
// @name:zh-CN   知乎内容过滤器
// @name:zh-TW   知乎內容過濾器
// @namespace    https://xload.net/
// @version      2026.9.14.2
// @description  Filter Zhihu cards by type, phrases, users, votes, age, and labeled content.
// @description:en      Filter Zhihu cards by type, phrases, users, votes, age, and labeled content.
// @description:zh-CN   按类别、短语、用户、赞同数、时间和内容标记过滤知乎卡片。
// @description:zh-TW   依類別、片語、使用者、贊同數、時間和內容標記過濾知乎卡片。
// @match        *://*.zhihu.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  var TASK_ID = 'xload-afe511cf';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-afe511cf/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-afe511cf-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "Zhihu Content Filter",
    "short": "Filter Zhihu cards by type, phrases, users, votes, age, and labeled content.",
    "panel.documentTitle": "Zhihu Content Filter - Panel",
    "fab.label": "Zhihu Content Filter",
    "ad.label": "Advertisement",
    "language.label": "Language",
    "language.auto": "Auto (browser)",
    "language.en": "English",
    "language.zhCN": "简体中文",
    "language.zhTW": "繁體中文",
    "footer.tools": "Tools",
    "footer.privacy": "Privacy",
    "control.save": "Save settings",
    "control.saved": "Settings saved",
    "control.close": "Close",
    "notice": "Notice",
    "close": "Close",
    "timeout": "The original page did not respond",
    "error.pageUnresponsive": "The original page did not respond",
    "error.unknownCommand": "Unknown command",
    "fab.labelPaused": "Zhihu Filter (paused)"
  },
  "zh-CN": {
    "title": "知乎内容过滤器",
    "short": "按类别、短语、用户、赞同数、时间和内容标记过滤知乎卡片。",
    "panel.documentTitle": "知乎内容过滤器 - 功能面板",
    "fab.label": "知乎内容过滤器",
    "ad.label": "广告",
    "language.label": "语言",
    "language.auto": "自动（浏览器）",
    "language.en": "English",
    "language.zhCN": "简体中文",
    "language.zhTW": "繁體中文",
    "footer.tools": "工具列表",
    "footer.privacy": "隐私政策",
    "control.save": "保存配置",
    "control.saved": "已保存配置",
    "control.close": "关闭",
    "notice": "提示",
    "close": "关闭",
    "timeout": "原页面未响应",
    "error.pageUnresponsive": "原页面未响应",
    "error.unknownCommand": "未知命令",
    "fab.labelPaused": "知乎过滤（已暂停）"
  },
  "zh-TW": {
    "title": "知乎內容過濾器",
    "short": "依類別、片語、使用者、贊同數、時間和內容標記過濾知乎卡片。",
    "panel.documentTitle": "知乎內容過濾器 - 功能面板",
    "fab.label": "知乎內容過濾器",
    "ad.label": "廣告",
    "language.label": "語言",
    "language.auto": "自動（瀏覽器）",
    "language.en": "English",
    "language.zhCN": "简体中文",
    "language.zhTW": "繁體中文",
    "footer.tools": "工具列表",
    "footer.privacy": "隱私政策",
    "control.save": "儲存設定",
    "control.saved": "已儲存設定",
    "control.close": "關閉",
    "notice": "提示",
    "close": "關閉",
    "timeout": "原頁面未回應",
    "error.pageUnresponsive": "原頁面未回應",
    "error.unknownCommand": "未知命令",
    "fab.labelPaused": "知乎過濾（已暫停）"
  }
}
/* XLOAD-I18N-DICT-END */;

function createI18n(taskId, dictionary, options) {
    var opts = options || {};
    var memoryLocale = null;
    var allowedLocales = ['auto', 'en', 'zh-CN', 'zh-TW'];
    var allowedAttributes = { title: true, placeholder: true, 'aria-label': true, alt: true };

    function normalizeLocale(value) {
      var locale = String(value || '').replace(/_/g, '-').toLowerCase();
      if (/^zh(?:-|$)/.test(locale)) {
        if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(locale)) return 'zh-TW';
        return 'zh-CN';
      }
      return 'en';
    }

    function detectedLocale() {
      var values = [];
      try { values = navigator.languages || []; } catch (e) { values = []; }
      if (!values.length) {
        try { values = [navigator.language]; } catch (e) { values = []; }
      }
      for (var i = 0; i < values.length; i++) {
        if (/^zh(?:-|$)/i.test(String(values[i] || ''))) return normalizeLocale(values[i]);
      }
      return 'en';
    }

    function readPreference() {
      if (memoryLocale != null) return memoryLocale;
      try {
        var value = opts.get ? opts.get('locale', 'auto') : memoryLocale;
        memoryLocale = allowedLocales.indexOf(value) >= 0 ? value : 'auto';
      } catch (e) { memoryLocale = 'auto'; }
      return memoryLocale;
    }

    function writePreference(value) {
      memoryLocale = value;
      try { if (opts.set) opts.set('locale', value); } catch (e) { /* denied storage uses memory */ }
    }

    function getLocale() {
      var preference = readPreference();
      return preference === 'auto' ? detectedLocale() : preference;
    }

    function t(key, vars) {
      var locale = getLocale();
      var current = dictionary[locale] || {};
      var english = dictionary.en || {};
      var value = current[key];
      if (typeof value !== 'string') value = english[key];
      if (typeof value !== 'string') value = key;
      return value.replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, name) {
        return vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : '{' + name + '}';
      });
    }

    function apply(root) {
      var scope = root || document;
      var textNodes = scope.querySelectorAll ? scope.querySelectorAll('[data-i18n]') : [];
      for (var i = 0; i < textNodes.length; i++) textNodes[i].textContent = t(textNodes[i].getAttribute('data-i18n'));
      var attrNodes = scope.querySelectorAll ? scope.querySelectorAll('[data-i18n-attr]') : [];
      for (var j = 0; j < attrNodes.length; j++) {
        var specs = String(attrNodes[j].getAttribute('data-i18n-attr') || '').split(',');
        for (var k = 0; k < specs.length; k++) {
          var pair = specs[k].split(':');
          var attr = String(pair.shift() || '').trim().toLowerCase();
          var key = pair.join(':').trim();
          if (allowedAttributes[attr] && key) attrNodes[j].setAttribute(attr, t(key));
        }
      }
      try { if (document.documentElement) document.documentElement.lang = getLocale(); } catch (e) { /* ignore */ }
      return api;
    }

    function setLocale(value) {
      var locale = allowedLocales.indexOf(value) >= 0 ? value : 'auto';
      writePreference(locale);
      apply();
      return locale;
    }

    var api = { taskId: String(taskId || ''), t: t, apply: apply, getLocale: getLocale, getPreference: readPreference, setLocale: setLocale, normalizeLocale: normalizeLocale };
    return api;
  }

  var i18n = createI18n(TASK_ID, I18N_DICT, {
    get: function (key, fallback) {
      try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':i18n:' + key, fallback) : fallback; }
      catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { if (typeof GM_setValue === 'function') GM_setValue(TASK_ID + ':i18n:' + key, value); } catch (e) { /* denied storage */ }
    }
  });

  function log(tag, data) {
    try {
      var entry = { at: new Date().toISOString(), tag: tag, data: data == null ? null : data };
      console.log('[xload:' + TASK_ID + ']', tag, data == null ? '' : data);
      var rows = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]');
      rows.push(entry);
      window.localStorage.setItem(LOG_KEY, JSON.stringify(rows.slice(-60)));
    } catch (e) { /* 日志不能中断主逻辑 */ }
  }

  // CORE-START
  function normalizeText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function parseRuleLines(value) {
    var source = (Array.isArray(value) ? value.join('\n') : String(value == null ? '' : value)).replace(/\r/g, '\n');
    var rows = source.split(/\n+/);
    var result = [];
    var seen = Object.create(null);
    rows.forEach(function (row) {
      var item = normalizeText(row);
      if ((item.charAt(0) === '"' && item.charAt(item.length - 1) === '"') ||
          (item.charAt(0) === "'" && item.charAt(item.length - 1) === "'")) {
        item = normalizeText(item.slice(1, -1));
      }
      var key = item.toLocaleLowerCase();
      if (item && !seen[key]) { seen[key] = true; result.push(item); }
    });
    return result;
  }

  function parseCompactNumber(value) {
    var text = normalizeText(value).replace(/,/g, '');
    var match = text.match(/(-?\d+(?:\.\d+)?)\s*([万萬千kKmM]?)/);
    if (!match) return null;
    var unit = match[2].toLowerCase();
    var factor = unit === '万' || unit === '萬' ? 10000 : unit === '千' || unit === 'k' ? 1000 : unit === 'm' ? 1000000 : 1;
    var number = Number(match[1]) * factor;
    return Number.isFinite(number) ? Math.round(number) : null;
  }

  function normalizeSettings(input) {
    var raw = input && typeof input === 'object' ? input : {};
    var allowedTypes = ['answer', 'article', 'video', 'pin'];
    var types = Array.isArray(raw.types) ? raw.types.filter(function (type) { return allowedTypes.indexOf(type) >= 0; }) : [];
    return {
      enabled: raw.enabled !== false,
      types: types.filter(function (type, index) { return types.indexOf(type) === index; }),
      keywords: parseRuleLines(raw.keywords || ''),
      users: parseRuleLines(raw.users || ''),
      minVotes: Math.max(0, Math.min(100000000, Math.floor(Number(raw.minVotes) || 0))),
      ageDays: [0, 180, 365].indexOf(Number(raw.ageDays)) >= 0 ? Number(raw.ageDays) : 0,
      filterYanxuan: raw.filterYanxuan === true,
      filterDirect: raw.filterDirect === true,
      includeSupporters: raw.includeSupporters === true,
      excludeSites: ['xload.net', 'u2222223.github.io']
    };
  }

  function evaluateRecord(record, settings, nowMs) {
    var cfg = normalizeSettings(settings);
    if (!cfg.enabled) return [];
    var reasons = [];
    var haystack = normalizeText([record.title, record.body].join(' ')).toLocaleLowerCase();
    var author = normalizeText(record.author).toLocaleLowerCase();
    var supporterText = normalizeText(record.supporterText).toLocaleLowerCase();
    if (cfg.types.indexOf(record.type) >= 0) reasons.push('type:' + record.type);
    cfg.keywords.some(function (rule) {
      if (haystack.indexOf(rule.toLocaleLowerCase()) >= 0) { reasons.push('keyword:' + rule); return true; }
      return false;
    });
    cfg.users.some(function (rule) {
      var needle = rule.toLocaleLowerCase();
      if (author.indexOf(needle) >= 0 || (cfg.includeSupporters && supporterText.indexOf(needle) >= 0)) {
        reasons.push((author.indexOf(needle) >= 0 ? 'user:' : 'supporter:') + rule);
        return true;
      }
      return false;
    });
    if (cfg.filterYanxuan && record.isYanxuan) reasons.push('label:yanxuan');
    if (cfg.filterDirect && record.isDirect) reasons.push('label:direct');
    if (cfg.minVotes > 0 && typeof record.votes === 'number' && record.votes < cfg.minVotes) {
      var withinWindow = cfg.ageDays === 0;
      if (!withinWindow && typeof record.publishedAt === 'number') {
        var age = Math.max(0, Number(nowMs || Date.now()) - record.publishedAt);
        withinWindow = age <= cfg.ageDays * 86400000;
      }
      if (withinWindow) reasons.push('votes:' + record.votes + '<' + cfg.minVotes);
    }
    return reasons;
  }
  // CORE-END

// =====================================================================
// xload 面板通信通道（脚本侧 createChannel）—— 经过验证的通用实现
// ---------------------------------------------------------------------
// 出处与依据：
//   - greasyfork-416688-1（全局字体渲染增强，@grant none，页面上下文）回包走
//     event.source.postMessage 可用，通讯正常。
//   - scriptcat-1397-1（学术论文免费下载，@grant GM_*，油猴沙箱）回包走
//     event.source.postMessage 静默失败（沙箱内 event.source 可能为 null 或
//     不可回写），面板 getState 超时显示「独立模式」。
//   - 结论：回包必须「先经 panelWin（window.open 直接返回值）→ 再 event.source →
//     最后 BroadcastChannel 兜底」三级投递，才能同时在 页面上下文 与 沙箱 生效。
// 使用方式：复制本块到 <task_id>.user.js，channel 名固定 'xload-panel:' + taskId；
//   保持 CORE-START/CORE-END 之外即可，无需修改。配套 openPanel 参考下方示例。
// 本文件为模板，非成品脚本，不参与 check-output。
// =====================================================================

// ---- 面板通信（与 panel.js 的 PanelChannel 协议一致；沙箱安全三级投递）----
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
    if (ev.origin !== 'https://xload.net') return;
    if (m._from !== taskId) return;
    if (panelWin && ev.source !== panelWin) return;
    m._source = ev.source;
    dispatch(m);
  }
  window.addEventListener('message', onWindowMessage);

  // 沙箱安全投递：isolated world 中 window 方法 this 绑定可能失效，
  // 用 Function.prototype.call 显式绑定目标窗口，避免 Illegal invocation。
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
      // 回包三级投递：panelWin 最可靠（沙箱内 event.source 可能失效）→ event.source → BroadcastChannel
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

// ---- 面板入口（独立页弹窗：window.open + moveTo 居中，单例复用）--------
// PANEL_URL 按 task 固定：'https://xload.net/scripts/userscripts/' + taskId + '/panel.html'
// 示例（需要脚本自备 log()/restoreLogs()）：
//
// function openPanel() {
//   if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
//   restoreLogs();
//   // 单例：已打开且未关闭则复用聚焦，不重复 window.open
//   var existing = channel.getPanelWin();
//   if (existing && !existing.closed) {
//     try { existing.focus(); } catch (e) { /* ignore */ }
//     log('panel.reuse', {});
//     return true;
//   }
//   log('panel.open', { url: PANEL_URL });
//   try {
//     var W = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
//     var H = Math.min(780, Math.max(540, (window.screen.availHeight || 800) - 140));
//     var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
//     var T = Math.max(0, Math.round(((window.screen.availHeight || 800) - H) / 2));
//     var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T +
//       ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
//     var w = window.open(PANEL_URL, '_blank', features);
//     var result = { opened: !!w, requestedW: W, requestedH: H, left: L, top: T };
//     if (w) {
//       try { w.moveTo(L, T); w.resizeTo(W, H); } catch (e) { /* 跨源 popup 部分浏览器受限 */ }
//       channel.setPanelWin(w);
//     }
//     log('panel.open.result', result);
//     return !!w;
//   } catch (e) {
//     log('panel.open.error', { message: String(e && e.message || e) });
//     return false;
//   }
// }

// =====================================================================
// xload 聚合按钮组（FAB）共享模板 —— 经过验证的通用实现（v4 极简黑白 + 可折叠）
// ---------------------------------------------------------------------
// 特性：
//   1) 多按钮平铺在 list 中；**可折叠**——点击手柄收起/展开 item 列表，默认展开；
//   2) 整组可拖拽（拖手柄或组内空白处起拖；item 按钮点击与拖拽分离）；
//   3) 位置记忆：拖拽后保存，刷新/重开页面恢复；
//   4) 防出屏：拖拽时 clamp 到视口内；
//   5) 屏幕切换/窗口 resize/缩放：自动重新 clamp，按钮不会跑出屏幕外。
//   6) 折叠状态持久化（键 xload-fab-collapsed，默认展开）。
//   7) iframe 下不插入按钮：`window.self !== window.top`（脚本运行在 iframe 内）时
//      xloadFab() 直接返回空实现（不注入样式、不创建按钮、不绑事件），普通顶层页面才插入。
// 视觉：极简黑白（v4）——纯黑手柄（白底 x 徽标）、白卡片 item、直边高对比；
//       仅保留基础过渡：淡入、hover 黑白反色、折叠平滑收起，无花哨动画。
// 交互：手柄 cursor=pointer（点击=折叠/展开）；折叠在 pointerup 判断 downOnToggle 触发
//       （setPointerCapture 会把 click 重定向到 root，故不依赖 click 事件）。
// 使用方式：把本块复制到 <task_id>.user.js，然后在启动处调用：
//   var fab = xloadFab();
//   fab.addItem(TASK_ID, '按钮文案', function () { openPanel(); });
// 说明：同一页面多个 xload 脚本共用同一个 #xload-fab-root，重复调用幂等；
//   拖拽绑定与样式注入只做一次；位置经 localStorage（页面上下文）/ GM 值（沙箱）持久化。
// 本文件为模板，非成品脚本，不参与 check-output。
// =====================================================================

function xloadFab() {
  // iframe 内不插入按钮（普通顶层页面才插入）；返回空实现保持 API 兼容，调用方无需特判
  if (window.self !== window.top) {
    return {
      root: null,
      list: null,
      setCollapsed: function () {},
      toggleCollapse: function () {},
      isCollapsed: function () { return false; },
      addItem: function () { return null; }
    };
  }

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
    // 兼容旧协议：旧容器可能是「toggle+折叠list」结构，这里强制 list 展开
    var oldList = root.querySelector('[data-xload-fab-list]');
    if (oldList) { oldList.style.display = 'flex'; }
  } else {
    root = document.createElement('div');
    root.id = 'xload-fab-root';
    root.setAttribute('data-xload-fab-root', 'true');
    document.body.appendChild(root);
  }

  // ---------- 样式注入（幂等，scoped 到 #xload-fab-root，不污染页面；v3 覆盖旧版样式） ----------
  var oldStyle = root.querySelector('style[data-xload-fab-style]');
  if (oldStyle && oldStyle.getAttribute('data-xload-fab-style-version') !== '4') {
    oldStyle.parentNode.removeChild(oldStyle);
    oldStyle = null;
  }
  if (!oldStyle) {
    var st = document.createElement('style');
    st.setAttribute('data-xload-fab-style', '');
    st.setAttribute('data-xload-fab-style-version', '4');
    st.textContent =
      '#xload-fab-root{' +
        'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
        'display:flex;flex-direction:column;gap:2px;' +
        'min-width:170px;max-width:240px;padding:6px;box-sizing:border-box;' +
        'background:#ffffff;' +
        'border:1px solid #e5e5e5;border-radius:6px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.08);' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;' +
        'user-select:none;-webkit-user-select:none;touch-action:none;' +
        'animation:xfFabFade .3s ease backwards;' +
      '}' +
      '@keyframes xfFabFade{from{opacity:0}to{opacity:1}}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"]{padding:4px;}' +
      '#xload-fab-root button{font-family:inherit;}' +
      '#xload-fab-root [data-xload-fab-toggle]{' +
        'display:flex;align-items:center;gap:8px;width:100%;' +
        'padding:9px 10px;border:0;border-radius:4px;cursor:pointer;' +
        'background:#111;color:#fff;' +
        'font-size:13px;font-weight:700;letter-spacing:.3px;line-height:1;text-align:left;' +
        'transition:background .2s ease;' +
      '}' +
      '#xload-fab-root [data-xload-fab-toggle]:hover{background:#000;}' +
      '#xload-fab-root .xf-brand{' +
        'display:inline-flex;align-items:center;justify-content:center;flex:none;' +
        'width:20px;height:20px;border-radius:3px;background:#fff;color:#000;' +
        'font-size:11px;font-weight:800;' +
      '}' +
      '#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;}' +
      '#xload-fab-root .xf-caret{' +
        'flex:none;width:6px;height:6px;' +
        'border-right:1.5px solid #fff;border-bottom:1.5px solid #fff;' +
        'transform:rotate(45deg);transition:transform .25s ease;' +
      '}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-135deg);}' +
      '#xload-fab-root [data-xload-fab-list]{' +
        'display:flex;flex-direction:column;overflow:hidden;' +
        'max-height:0;opacity:0;' +
        'transition:max-height .3s ease,opacity .25s ease;' +
      '}' +
      '#xload-fab-root:not([data-xload-fab-collapsed="true"]) [data-xload-fab-list]{max-height:240px;opacity:1;}' +
      '#xload-fab-root [data-xload-fab-item]{' +
        'display:flex;align-items:center;gap:9px;width:100%;' +
        'padding:9px 10px;border:0;border-radius:4px;' +
        'background:#fff;color:#111;' +
        'font-size:13px;font-weight:500;line-height:1;text-align:left;cursor:pointer;' +
        'transition:background .2s ease,color .2s ease;' +
      '}' +
      '#xload-fab-root [data-xload-fab-item]:hover{background:#111;color:#fff;}' +
      '#xload-fab-root .xf-dot{' +
        'width:7px;height:7px;border-radius:50%;flex:none;background:#111;' +
        'transition:background .2s ease;' +
      '}' +
      '#xload-fab-root [data-xload-fab-item]:hover .xf-dot{background:#fff;}';
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
  // 升级旧手柄结构（旧版带 xf-dots 三横线、无 caret）：补齐扁平化结构
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

  // ---------- 折叠状态（默认展开） ----------
  function setCollapsed(c) {
    collapsed = !!c;
    if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
    else { root.removeAttribute('data-xload-fab-collapsed'); }
    storeSet(COLLAPSE_KEY, collapsed);
  }
  function toggleCollapse() {
    setCollapsed(!collapsed);
    // 折叠状态变化后重新 clamp（宽度可能变化）
    var p = storeGet(POS_KEY, null);
    if (p && typeof p.x === 'number' && typeof p.y === 'number') { applyPos(p.x, p.y); }
  }

  // ---------- 拖拽 + 位置记忆 + 防出屏（只绑定一次） ----------
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

    // 初始折叠状态（只在首次初始化时恢复，幂等）
    collapsed = storeGet(COLLAPSE_KEY, false); // 默认 false = 展开
    if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
    else { root.removeAttribute('data-xload-fab-collapsed'); }

    var dragging = false;
    var downOnToggle = false;
    var sx = 0, sy = 0, ox = 0, oy = 0;

    // 从手柄或组内空白处起拖；item 按钮上起按仅当移动超过阈值才进入拖拽（保留点击）
    root.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      var t = ev.target;
      // 用 closest 判断是否命中手柄（点击手柄内部文字/徽标/箭头也应视为手柄）
      var isToggle = !!(t && t.closest && t.closest('[data-xload-fab-toggle]'));
      var isItem = !!(t && t.closest && t.closest('[data-xload-fab-item]'));
      if (isItem && !isToggle) return; // item 按钮交给点击逻辑（item 自身 pointerdown 处理拖拽）
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
        // 在手柄上起按且未发生拖拽 = 点击手柄 → 折叠/展开。
        // 注意：setPointerCapture 会把派生的 click 事件重定向到 root，handle 上的 click 监听
        // 收不到，因此这里在 pointerup 直接处理，不依赖 click 事件（拖拽后 downOnToggle 判定自然屏蔽误触）。
        toggleCollapse();
      }
      downOnToggle = false;
    }
    root.addEventListener('pointerup', endDrag);
    // pointercancel（如系统手势抢占）：视为放弃本次按下，不触发折叠
    root.addEventListener('pointercancel', function () {
      if (!dragging) return;
      dragging = false;
      downOnToggle = false;
      movedFlag = false;
    });

    // 屏幕切换 / 窗口 resize / 缩放：重新 clamp，避免按钮跑出屏幕看不见
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
    // 初始布局后立即 clamp 一次（图标/尺寸渲染完）
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
      // item 自身拖拽：按下后移动超过阈值视为拖拽，屏蔽随后的 click
      item.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        var sx2 = ev.clientX, sy2 = ev.clientY;
        var dragged = false;
        var onMove = function (ev2) {
          if (Math.abs(ev2.clientX - sx2) > DRAG_THRESHOLD || Math.abs(ev2.clientY - sy2) > DRAG_THRESHOLD) {
            dragged = true;
          }
        };
        var onUp = function (ev2) {
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

  var SETTINGS_KEY = TASK_ID + ':settings';
  var STATS_KEY = TASK_ID + ':lastStats';
  var HIDDEN_ATTR = 'data-xload-' + TASK_ID + '-hidden';
  var DEFAULT_SETTINGS = normalizeSettings({ enabled: true, types: [], keywords: '', users: '', minVotes: 0, ageDays: 0 });
  var activeSettings = loadSettings();
  var observer = null;
  var scanTimer = 0;
  var stats = { scanned: 0, hidden: 0, reasons: {}, recent: [] };

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback; }
    catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, value); }
    catch (e) { log('storage.write.error', { message: String(e && e.message || e) }); }
  }

  function settingsForPanel(settings) {
    return {
      enabled: settings.enabled,
      types: settings.types.slice(),
      keywords: settings.keywords.join('\n'),
      users: settings.users.join('\n'),
      minVotes: settings.minVotes,
      ageDays: settings.ageDays,
      filterYanxuan: settings.filterYanxuan,
      filterDirect: settings.filterDirect,
      includeSupporters: settings.includeSupporters
    };
  }

  function loadSettings() {
    var stored = gmGet(SETTINGS_KEY, null);
    return normalizeSettings(stored || DEFAULT_SETTINGS);
  }

  function saveSettings(value) {
    activeSettings = normalizeSettings(value);
    gmSet(SETTINGS_KEY, activeSettings);
    log('settings.save', settingsForPanel(activeSettings));
    restoreAll();
    scanPage('settings');
    updateFabLabel();
    return settingsForPanel(activeSettings);
  }

  function parseDatasetObject(element, key) {
    if (!element || !element.dataset || !element.dataset[key]) return null;
    try { return JSON.parse(element.dataset[key]); } catch (e) { return null; }
  }

  function detectType(root) {
    var item = root.querySelector('.ContentItem') || root;
    var moduleName = normalizeText(item.getAttribute && item.getAttribute('data-za-detail-view-path-module')).toLowerCase();
    var link = root.querySelector('a[href*="/zvideo/"],a[href*="video.zhihu.com"],a[href*="zhuanlan.zhihu.com"],a[href*="/pin/"]');
    var href = link ? String(link.href || '') : '';
    if (moduleName.indexOf('zvideo') >= 0 || root.querySelector('.ZVideoItem-video,.VideoAnswerPlayer') || /\/zvideo\/|video\.zhihu\.com/.test(href)) return 'video';
    if (moduleName.indexOf('article') >= 0 || moduleName.indexOf('post') >= 0 || /zhuanlan\.zhihu\.com/.test(href)) return 'article';
    if (moduleName.indexOf('pin') >= 0 || item.classList && item.classList.contains('PinItem') || /\/pin\//.test(href)) return 'pin';
    return 'answer';
  }

  function extractVotes(root) {
    var moduleElement = root.querySelector('[data-za-extra-module]');
    var moduleData = parseDatasetObject(moduleElement, 'zaExtraModule');
    var content = moduleData && moduleData.card && moduleData.card.content;
    if (content && content.upvote_num != null) return parseCompactNumber(content.upvote_num);
    var button = root.querySelector('button[aria-label*="赞同"],button[aria-label*="贊同"],button[aria-label*="upvote" i],.VoteButton');
    return button ? parseCompactNumber(button.getAttribute('aria-label') || button.textContent) : null;
  }

  function extractAuthor(root) {
    var dataElement = root.querySelector('[data-zop]');
    var zop = parseDatasetObject(dataElement, 'zop');
    if (zop && zop.authorName) return normalizeText(zop.authorName);
    var node = root.querySelector('.AuthorInfo-name,.UserLink-link,.CommentItemV2-metaSibling,[itemprop="name"]');
    return node ? normalizeText(node.getAttribute('content') || node.textContent) : '';
  }

  function extractPublishedAt(root) {
    var node = root.querySelector('time[datetime],[data-tooltip*="发布"],[data-tooltip*="發佈"],[data-tooltip*="Published" i]');
    if (!node) return null;
    var value = node.getAttribute('datetime') || node.getAttribute('data-tooltip') || node.textContent;
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function readCard(root) {
    var titleNode = root.querySelector('h1,h2,.ContentItem-title,[itemprop="headline"],[itemprop="name"]');
    var bodyNode = root.querySelector('.RichContent-inner,.RichText,.ContentItem-excerpt,.CommentContent');
    var text = normalizeText(root.textContent);
    return {
      type: detectType(root),
      title: titleNode ? normalizeText(titleNode.getAttribute('content') || titleNode.textContent) : '',
      body: bodyNode ? normalizeText(bodyNode.textContent) : text,
      author: extractAuthor(root),
      supporterText: normalizeText((root.querySelector('.FeedSource-byline,.ContentItem-meta') || {}).textContent),
      votes: extractVotes(root),
      publishedAt: extractPublishedAt(root),
      isYanxuan: !!root.querySelector('.KfeCollection-AnswerTopCard-Container,.KfeCollection-PurchaseBtn') || /盐选|鹽選|严选|嚴選/.test(text),
      isDirect: !!root.querySelector('a[href^="https://zhida.zhihu.com/"]') || /知乎直答|Zhihu Direct/i.test(text)
    };
  }

  function collectCards() {
    var selector = '.Card.TopstoryItem,.List-item,.Card.SearchResult-Card,.HotItem,.Card.AnswerCard,.ContentItem.ArticleItem,.ContentItem.AnswerItem,.ContentItem.PinItem,.CommentItemV2';
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
    return nodes.filter(function (node, index) {
      var parent = node.parentElement && node.parentElement.closest(selector);
      return !parent && nodes.indexOf(node) === index;
    });
  }

  function hideCard(root, reasons, record) {
    if (!root.hasAttribute(HIDDEN_ATTR)) {
      root.setAttribute(HIDDEN_ATTR, 'true');
      root.setAttribute('data-xload-prev-hidden', root.hidden ? 'true' : 'false');
      root.setAttribute('data-xload-prev-display', root.style.getPropertyValue('display') || '');
    }
    root.hidden = true;
    root.style.setProperty('display', 'none', 'important');
    reasons.forEach(function (reason) { stats.reasons[reason] = (stats.reasons[reason] || 0) + 1; });
    stats.recent.unshift({ title: record.title || normalizeText(record.body).slice(0, 90), reasons: reasons.slice() });
    stats.recent = stats.recent.slice(0, 20);
  }

  function restoreCard(root) {
    if (!root.hasAttribute(HIDDEN_ATTR)) return;
    root.hidden = root.getAttribute('data-xload-prev-hidden') === 'true';
    var display = root.getAttribute('data-xload-prev-display');
    if (display) root.style.setProperty('display', display); else root.style.removeProperty('display');
    root.removeAttribute(HIDDEN_ATTR);
    root.removeAttribute('data-xload-prev-hidden');
    root.removeAttribute('data-xload-prev-display');
  }

  function restoreAll() {
    document.querySelectorAll('[' + HIDDEN_ATTR + ']').forEach(restoreCard);
  }

  function snapshotStats() {
    return { scanned: stats.scanned, hidden: stats.hidden, reasons: Object.assign({}, stats.reasons), recent: stats.recent.slice() };
  }

  function scanPage(trigger) {
    var cards = collectCards();
    stats = { scanned: cards.length, hidden: 0, reasons: {}, recent: [] };
    cards.forEach(function (root) {
      restoreCard(root);
      var record = readCard(root);
      var reasons = evaluateRecord(record, activeSettings, Date.now());
      if (reasons.length) { hideCard(root, reasons, record); stats.hidden += 1; }
    });
    log('scan.done', { trigger: trigger, scanned: stats.scanned, hidden: stats.hidden });
    gmSet(STATS_KEY, snapshotStats());
    if (channel) channel.send('done', { action: 'scan', stats: snapshotStats() });
    return snapshotStats();
  }

  function scheduleScan(trigger) {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(function () { scanPage(trigger); }, 180);
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        return Array.prototype.some.call(mutation.addedNodes || [], function (node) { return node && node.nodeType === 1; });
      });
      if (relevant) scheduleScan('mutation');
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  var channel = null;
  var fabItem = null;

  function updateFabLabel() {
    if (!fabItem) return;
    var label = fabItem.querySelector('.xf-dot + span');
    if (label) label.textContent = i18n.t(activeSettings.enabled ? 'fab.label' : 'fab.labelPaused');
  }

  function isSelfHost(host) {
    var value = String(host || '').toLowerCase();
    return SELF_HOSTS.some(function (item) {
      return value === item || value.endsWith('.' + item);
    });
  }

  function isZhihuHost(host) {
    var value = String(host || '').toLowerCase();
    return value === 'zhihu.com' || value.endsWith('.zhihu.com');
  }

  function isSafeUrl(value) {
    try {
      var parsed = new URL(value, window.location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) { return false; }
  }

  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) return false;
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) {
      try { existing.focus(); } catch (e) { /* ignore */ }
      return true;
    }
    var width = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
    var height = Math.min(780, Math.max(540, (window.screen.availHeight || 800) - 140));
    var left = Math.max(0, Math.round(((window.screen.availWidth || 1280) - width) / 2));
    var top = Math.max(0, Math.round(((window.screen.availHeight || 800) - height) / 2));
    var features = 'popup=yes,width=' + width + ',height=' + height + ',left=' + left + ',top=' + top +
      ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
    var panelWin = window.open(PANEL_URL, '_blank', features);
    if (panelWin) {
      try { panelWin.moveTo(left, top); panelWin.resizeTo(width, height); } catch (e) { /* ignore */ }
      channel.setPanelWin(panelWin);
    }
    log('panel.open', { opened: !!panelWin, width: width, height: height, left: left, top: top });
    return !!panelWin;
  }

  function init() {
    if (isSelfHost(window.location.hostname)) return;
    if (!isZhihuHost(window.location.hostname)) return;
    channel = createChannel(TASK_ID);
    window.addEventListener('error', function (event) {
      log('window.error', { message: event.message, file: event.filename, line: event.lineno, col: event.colno });
    });
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      log('window.unhandledrejection', { message: String(reason && reason.message || reason) });
      event.preventDefault();
    });
    channel.on('command', function (data, message) {
      if (data && data.action === 'setLanguage') {
        var preference = i18n.setLocale(data.locale);
        updateFabLabel();
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: preference });
        return;
      }
      if (data && data.action === 'getState') {
        log('channel.command', { action: 'getState' });
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: i18n.getPreference(), settings: settingsForPanel(activeSettings), stats: snapshotStats() });
        return;
      }
      if (data && data.action === 'saveSettings') {
        log('channel.command', { action: 'saveSettings' });
        channel.reply(message, { ok: true, settings: saveSettings(data.settings), stats: snapshotStats() });
        return;
      }
      if (data && data.action === 'rescan') {
        log('channel.command', { action: 'rescan' });
        channel.reply(message, { ok: true, stats: scanPage('panel') });
        return;
      }
      if (data && data.action === 'setEnabled') {
        var changed = settingsForPanel(activeSettings);
        changed.enabled = data.enabled !== false;
        channel.reply(message, { ok: true, settings: saveSettings(changed), stats: snapshotStats() });
        return;
      }
      if (data && data.action === 'resetSettings') {
        channel.reply(message, { ok: true, settings: saveSettings(DEFAULT_SETTINGS), stats: snapshotStats() });
        return;
      }
      if (data && data.action === 'testRules') {
        var preview = normalizeSettings(data.settings || {});
        channel.reply(message, { ok: true, keywords: preview.keywords, users: preview.users });
        return;
      }
      if (data && data.action === 'getLogs') {
        var logs = [];
        try { logs = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { logs = []; }
        channel.reply(message, { ok: true, logs: logs });
        return;
      }
      channel.reply(message, { ok: false, error: i18n.t('error.unknownCommand') });
    });
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    startObserver();
    scanPage('init');
    log('init', { href: window.location.href });
  }

  init();
})();
