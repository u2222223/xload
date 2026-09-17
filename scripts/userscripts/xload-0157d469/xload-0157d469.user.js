// ==UserScript==
// @name         X Long Post Expander — Read Available Full Text
// @name:en      X Long Post Expander — Read Available Full Text
// @name:zh-CN   X 长文展开：自动显示可用正文
// @name:zh-TW   X 長文展開：自動顯示可用內文
// @namespace    https://xload.net/
// @version      2026.9.16.3
// @description  X long post expander activates supported expansion controls so you can read available long-form text with fewer repeated clicks.
// @description:en      X long post expander activates supported expansion controls so you can read available long-form text with fewer repeated clicks.
// @description:zh-CN   X 长文展开自动触发支持的正文展开入口，让你减少重复点击并阅读当前可访问的长帖子内容。
// @description:zh-TW   X 長文展開自動觸發支援的內文展開入口，讓你減少重複點擊並閱讀目前可存取的長貼文內容。
// @homepageURL  https://xload.net/scripts/userscripts/xload-0157d469/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://x.com/*
// @match        *://*.x.com/*
// @match        *://twitter.com/*
// @match        *://*.twitter.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-0157d469';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-0157d469/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-0157d469-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "X Long Post Expander — Read Available Full Text",
    "short": "X long post expander activates supported expansion controls so you can read available long-form text with fewer repeated clicks.",
    "panel.documentTitle": "X Long Post Expander — Read Available Full Text - Panel",
    "fab.label": "X Long Post Expander — Read Available Full Text",
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
    "error.command": "Unsupported command or invalid settings",
    "error.storage": "Settings could not be saved",
    "error.copy": "Copy failed; select the log text to copy it",
    "error.busy": "A scan is already running",
    "longText.empty": "No expandable posts",
    "longText.failed": "Text could not be expanded",
    "longText.help": "Navigation links require manual opening",
    "longText.enabled": "Automatically expand long posts",
    "longText.once": "Expand once",
    "longText.counts": "Expanded: {expanded} · Manual opening: {manual} · Failed: {failed}",
    "longText.scope": "Counts apply to this page session. Only supported controls beside the main post text are used; quoted posts and reply loaders are skipped.",
    "status.working": "Working",
    "status.ready": "Connected to the original page",
    "status.offline": "Return to X and open this panel from the script button",
    "status.paused": "Automatic expansion paused",
    "action.apply": "Apply",
    "action.restore": "Restore",
    "a11y.openPanel": "Open controls",
    "logs.title": "Diagnostics",
    "logs.show": "View logs",
    "logs.copy": "Copy logs",
    "logs.copied": "Logs copied",
    "logs.empty": "No logs yet"
  },
  "zh-CN": {
    "title": "X 长文展开：自动显示可用正文",
    "short": "X 长文展开自动触发支持的正文展开入口，让你减少重复点击并阅读当前可访问的长帖子内容。",
    "panel.documentTitle": "X 长文展开：自动显示可用正文 - 功能面板",
    "fab.label": "X 长文展开：自动显示可用正文",
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
    "error.command": "不支持的命令或无效配置",
    "error.storage": "配置无法保存",
    "error.copy": "复制失败，请选中日志文本后复制",
    "error.busy": "正在执行扫描",
    "longText.empty": "没有可展开帖子",
    "longText.failed": "正文无法展开",
    "longText.help": "跳转链接需要手动打开",
    "longText.enabled": "自动展开长帖子",
    "longText.once": "单次展开",
    "longText.counts": "已展开：{expanded} · 需手动打开：{manual} · 失败：{failed}",
    "longText.scope": "计数仅限本次页面会话。只处理主帖正文旁受支持的控件，跳过引用帖与回复加载入口。",
    "status.working": "处理中",
    "status.ready": "已连接原页面",
    "status.offline": "请返回 X，从脚本按钮打开此面板",
    "status.paused": "已暂停自动展开",
    "action.apply": "应用",
    "action.restore": "恢复",
    "a11y.openPanel": "打开控制面板",
    "logs.title": "诊断日志",
    "logs.show": "查看日志",
    "logs.copy": "复制日志",
    "logs.copied": "已复制日志",
    "logs.empty": "暂无日志"
  },
  "zh-TW": {
    "title": "X 長文展開：自動顯示可用內文",
    "short": "X 長文展開自動觸發支援的內文展開入口，讓你減少重複點擊並閱讀目前可存取的長貼文內容。",
    "panel.documentTitle": "X 長文展開：自動顯示可用內文 - 功能面板",
    "fab.label": "X 長文展開：自動顯示可用內文",
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
    "error.command": "不支援的命令或無效設定",
    "error.storage": "設定無法儲存",
    "error.copy": "複製失敗，請選取日誌文字後複製",
    "error.busy": "正在執行掃描",
    "longText.empty": "沒有可展開貼文",
    "longText.failed": "內文無法展開",
    "longText.help": "導覽連結需要手動開啟",
    "longText.enabled": "自動展開長貼文",
    "longText.once": "單次展開",
    "longText.counts": "已展開：{expanded} · 需手動開啟：{manual} · 失敗：{failed}",
    "longText.scope": "計數僅限本次頁面工作階段。只處理主貼文內文旁受支援的控制項，略過引用貼文與回覆載入入口。",
    "status.working": "處理中",
    "status.ready": "已連接原頁面",
    "status.offline": "請返回 X，從腳本按鈕開啟此面板",
    "status.paused": "已暫停自動展開",
    "action.apply": "套用",
    "action.restore": "還原",
    "a11y.openPanel": "開啟控制面板",
    "logs.title": "診斷日誌",
    "logs.show": "查看日誌",
    "logs.copy": "複製日誌",
    "logs.copied": "已複製日誌",
    "logs.empty": "尚無日誌"
  }
}
/* XLOAD-I18N-DICT-END */;

function createI18n(taskId, dictionary, options) {
    var opts = options || {};
    var memoryLocale = null;
    var dynamicText = typeof WeakMap === 'function' ? new WeakMap() : null;
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

    function setText(element, key, vars) {
      if (!element || typeof element.setAttribute !== 'function') return element;
      var normalizedKey = String(key || '');
      element.setAttribute('data-i18n', normalizedKey);
      if (dynamicText) dynamicText.set(element, { key: normalizedKey, vars: vars || null });
      element.textContent = t(normalizedKey, vars);
      return element;
    }

    function apply(root) {
      var scope = root || document;
      var textNodes = scope.querySelectorAll ? scope.querySelectorAll('[data-i18n]') : [];
      for (var i = 0; i < textNodes.length; i++) {
        var saved = dynamicText && dynamicText.get(textNodes[i]);
        var key = saved ? saved.key : textNodes[i].getAttribute('data-i18n');
        textNodes[i].textContent = t(key, saved && saved.vars);
      }
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

    var api = { taskId: String(taskId || ''), t: t, setText: setText, apply: apply, getLocale: getLocale, getPreference: readPreference, setLocale: setLocale, normalizeLocale: normalizeLocale };
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

  // XLOAD:CORE-TEST:REQUIRED
  // CORE-START
  var DEFAULT_CONFIG = { version: 1, enabled: true, excludeSites: ['xload.net', 'u2222223.github.io'] };

  function isSelfHost(host) {
    var value = String(host || '').toLowerCase().replace(/\.$/, '');
    return DEFAULT_CONFIG.excludeSites.some(function (item) {
      return value === item || value.endsWith('.' + item);
    });
  }

  function normalizeConfig(value) {
    return { version: 1, enabled: value && value.version === 1 && typeof value.enabled === 'boolean' ? value.enabled : true };
  }

  function postIdentity(value, base) {
    try {
      var url = new URL(value, base);
      if (!/^https?:$/.test(url.protocol) || !/^(?:[^.]+\.)*(?:x\.com|twitter\.com)$/.test(url.hostname)) return '';
      var match = url.pathname.match(/^\/(?:[^/]+|i\/web)\/status\/(\d+)(?:\/|$)/);
      return match ? match[1] : '';
    } catch (e) { return ''; }
  }

  function expansionDecision(input) {
    if (!input || !input.postId || !input.mainText || !input.bodyControl || input.quoted || input.disabled || !input.visible) return 'skip';
    var label = String(input.label || '').trim();
    if (['Show more', '显示更多', '顯示更多', 'さらに表示', '더 보기'].indexOf(label) < 0) return 'skip';
    if (input.href || input.link || input.linkAncestor || input.navigationHint) return 'manual';
    return input.button ? 'expand' : 'skip';
  }

  function expansionVerified(before, after) {
    return !!(before && after && before.postId === after.postId && after.connected &&
      after.text && after.text !== before.text && after.text.length > before.text.length);
  }

  function canAttempt(postId, seenIds, alreadyExpanded) {
    return /^\d+$/.test(String(postId || '')) && !alreadyExpanded && (!seenIds || seenIds.indexOf(postId) < 0);
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

  var channel = null;
  var fabItem = null;

  function updateFabLabel() {
    if (!fabItem) return;
    var label = fabItem.querySelector('.xf-dot + span');
    if (label) label.textContent = i18n.t('fab.label');
    fabItem.setAttribute('aria-label', i18n.t('a11y.openPanel'));
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
    var panelWin;
    try { panelWin = window.open(PANEL_URL, '_blank', features); }
    catch (e) { log('panel.open.error', { code: 'POPUP_FAILED' }); return false; }
    if (panelWin) {
      try { panelWin.moveTo(left, top); panelWin.resizeTo(width, height); } catch (e) { /* ignore */ }
      channel.setPanelWin(panelWin);
    }
    log('panel.open', { opened: !!panelWin, width: width, height: height, left: left, top: top });
    return !!panelWin;
  }

  var config;
  var counts = { expanded: 0, manual: 0, failed: 0 };
  var seenControls = new WeakMap();
  var completedPosts = new Set();
  var manualPosts = new Set();
  var queuedArticles = new Set();
  var scanTimer = null;
  var working = false;
  var outcome = 'READY';
  var lastRoute = '';

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':' + key, fallback) : fallback; }
    catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    if (typeof GM_setValue !== 'function') throw new Error('STORAGE_UNAVAILABLE');
    GM_setValue(TASK_ID + ':' + key, value);
  }

  function addBounded(set, value) {
    set.add(value);
    if (set.size > 2000) set.delete(set.values().next().value);
  }

  function readState() {
    return { ok: true, enabled: config.enabled, version: 1, counts: Object.assign({}, counts), working: working, outcome: outcome,
      locale: i18n.getLocale(), localePreference: i18n.getPreference() };
  }

  function quotedWithin(node, article) {
    var parent = node.parentElement;
    while (parent && parent !== article) {
      if (parent.matches('article, [role="link"], a[href]')) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function inspectArticle(article) {
    if (!article || !article.isConnected) return null;
    var time = Array.from(article.querySelectorAll('time')).find(function (node) { return !quotedWithin(node.closest('a') || node, article); });
    var permalink = time && time.closest('a[href]');
    var postId = permalink ? postIdentity(permalink.getAttribute('href'), location.href) : '';
    var text = Array.from(article.querySelectorAll('[data-testid="tweetText"]')).find(function (node) { return !quotedWithin(node, article); });
    return postId && text ? { postId: postId, text: text } : null;
  }

  function candidateInfo(control, article, post) {
    var parent = control.parentElement;
    var textParent = post.text.parentElement;
    var nearby = post.text.contains(control) || parent === textParent ||
      (parent && parent.parentElement === textParent && parent.querySelectorAll('button, [role="button"], a').length === 1);
    return { postId: post.postId, mainText: true, bodyControl: nearby,
      quoted: control.closest('article') !== article || quotedWithin(control, article),
      disabled: control.disabled || control.getAttribute('aria-disabled') === 'true',
      visible: !!control.getClientRects().length,
      label: control.textContent, href: control.getAttribute('href'),
      link: control.tagName === 'A' || control.getAttribute('role') === 'link',
      navigationHint: /(?:link|navigate)/i.test(control.getAttribute('data-testid') || ''),
      linkAncestor: !!(parent && parent.closest('a[href], [role="link"]')),
      button: control.tagName === 'BUTTON' || control.getAttribute('role') === 'button' };
  }

  async function expandArticles(articles, once, requestId) {
    if (working) return { ok: false, errorCode: 'BUSY' };
    working = true;
    channel.send('progress', Object.assign(readState(), { requestId: requestId, phase: 'scanning' }));
    var confirmations = [];
    var attempted = 0;
    var failedBefore = counts.failed;
    try {
      articles.forEach(function (article) {
        if (!once && !config.enabled) return;
        var post = inspectArticle(article);
        if (!post || completedPosts.has(post.postId)) return;
        var controls = article.querySelectorAll('button, a[role="link"], [role="button"]');
        Array.from(controls).some(function (control) {
          var decision = expansionDecision(candidateInfo(control, article, post));
          if (decision === 'skip') return false;
          if (decision === 'manual') {
            if (!manualPosts.has(post.postId)) { addBounded(manualPosts, post.postId); counts.manual++; }
            return false;
          }
          var seenIds = seenControls.get(control) || [];
          if (!canAttempt(post.postId, seenIds, completedPosts.has(post.postId))) return false;
          seenControls.set(control, seenIds.concat(post.postId).slice(-100));
          var before = { postId: post.postId, text: post.text.textContent };
          attempted++;
          try {
            control.click();
            confirmations.push(new Promise(function (resolve) {
              setTimeout(function () {
                var fresh = inspectArticle(article);
                if (expansionVerified(before, fresh && { postId: fresh.postId, text: fresh.text.textContent, connected: article.isConnected })) {
                  if (!completedPosts.has(post.postId)) { addBounded(completedPosts, post.postId); counts.expanded++; }
                } else { counts.failed++; }
                resolve();
              }, 1400);
            }));
          } catch (e) { counts.failed++; log('expand.error', { code: 'CLICK_FAILED' }); }
          return true;
        });
      });
      await Promise.all(confirmations);
    } catch (e) { log('scan.error', { code: 'SCAN_FAILED' }); counts.failed++; }
    finally { working = false; }
    outcome = counts.failed > failedBefore ? 'UNVERIFIED' : attempted ? 'READY' : 'EMPTY';
    var result = Object.assign(readState(), { requestId: requestId, phase: 'done', attempted: attempted });
    channel.send('done', result);
    if (config.enabled && queuedArticles.size) scheduleScan();
    return result;
  }

  function scheduleScan() {
    if (!config.enabled || scanTimer || working) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      if (!config.enabled) { queuedArticles.clear(); return; }
      var batch = Array.from(queuedArticles);
      queuedArticles.clear();
      if (batch.length) expandArticles(batch, false, null);
    }, 200);
  }

  function collectArticles(root) {
    if (!config.enabled || !root) return;
    var element = root.nodeType === 1 ? root : root.parentElement;
    if (!element || element.closest('#xload-fab-root')) return;
    var containing = element.closest('article');
    if (containing) queuedArticles.add(containing);
    element.querySelectorAll('article').forEach(function (article) { queuedArticles.add(article); });
    scheduleScan();
  }

  function safeLogs() {
    try {
      var logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      return Array.isArray(logs) ? logs.slice(-60).map(function (row) {
        return { at: row.at, tag: row.tag, data: row.data };
      }) : [];
    } catch (e) { return []; }
  }

  async function handleCommand(data, message) {
    var action = data && data.action;
    log('channel.command', { action: typeof action === 'string' ? action.slice(0, 48) : 'invalid' });
    var result;
    if (action === 'setLanguage' && ['auto', 'en', 'zh-CN', 'zh-TW'].indexOf(data.locale) >= 0) {
      i18n.setLocale(data.locale);
      updateFabLabel();
      result = readState();
    } else if (action === 'getState' || action === 'longText.status') {
      result = readState();
    } else if (action === 'longText.configure' && typeof data.enabled === 'boolean') {
      var next = { version: 1, enabled: data.enabled };
      try {
        gmSet('config', next);
        var stored = gmGet('config', null);
        if (!stored || stored.version !== 1 || stored.enabled !== next.enabled) throw new Error('READBACK_FAILED');
        config = normalizeConfig(stored);
        if (!config.enabled) { clearTimeout(scanTimer); scanTimer = null; queuedArticles.clear(); }
        else collectArticles(document.body);
        log('settings.save', { enabled: config.enabled });
        result = readState();
      } catch (e) { result = { ok: false, errorCode: 'STORAGE_FAILED' }; }
    } else if (action === 'longText.expand' && data.once === true) {
      result = await expandArticles(Array.from(document.querySelectorAll('article')), true, message._id);
    } else if (action === 'getLogs') {
      result = { ok: true, logs: safeLogs() };
    } else { result = { ok: false, errorCode: 'INVALID_COMMAND' }; }
    channel.reply(message, result);
    if (!result.ok) channel.send('error', { requestId: message._id, errorCode: result.errorCode });
  }

  function init() {
    if (isSelfHost(window.location.hostname)) return;
    if (window.self !== window.top) return;
    config = normalizeConfig(gmGet('config', null));
    channel = createChannel(TASK_ID);
    window.addEventListener('error', function (event) {
      log('window.error', { message: event.message, file: event.filename, line: event.lineno, col: event.colno });
    });
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      log('window.unhandledrejection', { message: String(reason && reason.message || reason) });
      event.preventDefault();
    });
    channel.on('command', handleCommand);
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    updateFabLabel();
    log('init', { enabled: config.enabled });
    collectArticles(document.body);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        collectArticles(record.target);
        record.addedNodes.forEach(collectArticles);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['href', 'data-testid', 'aria-disabled'] });
    lastRoute = location.pathname;
    setInterval(function () {
      if (lastRoute !== location.pathname) {
        lastRoute = location.pathname;
        log('page.change', { kind: 'spa' });
        collectArticles(document.body);
      }
    }, 1000);
  }

  try { init(); } catch (e) { log('init.error', { code: 'INITIALIZATION_FAILED' }); }
})();
