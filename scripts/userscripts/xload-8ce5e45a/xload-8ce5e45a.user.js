// ==UserScript==
// @name         Zhihu Dark Reading Helper
// @name:en      Zhihu Dark Reading Helper
// @name:zh-CN   知乎暗色阅读助手
// @name:zh-TW   知乎深色閱讀助手
// @namespace    https://xload.net/
// @version      2026.9.15.1
// @description  Apply a configurable dark reading theme to Zhihu pages and dynamic surfaces.
// @description:en      Apply a configurable dark reading theme to Zhihu pages and dynamic surfaces.
// @description:zh-CN   为知乎页面和动态界面应用可配置的暗色阅读主题。
// @description:zh-TW   為知乎頁面和動態介面套用可設定的深色閱讀主題。
// @match        https://zhihu.com/*
// @match        https://*.zhihu.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  var TASK_ID = 'xload-8ce5e45a';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-8ce5e45a/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-8ce5e45a-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "Zhihu Dark Reading Helper",
    "short": "Apply a configurable dark reading theme to Zhihu pages and dynamic surfaces.",
    "panel.documentTitle": "Zhihu Dark Reading Helper - Panel",
    "fab.label": "Zhihu Dark Reading Helper",
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
    "error.unknownCommand": "Unknown panel command",
    "theme.group": "Reading theme",
    "theme.mode": "Theme mode",
    "theme.system": "Follow system",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.brightness": "Dark background brightness",
    "theme.brightnessValue": "Brightness: {value}%",
    "theme.dimImages": "Dim bright images",
    "theme.codeContrast": "Code-block contrast",
    "theme.contrastNormal": "Normal",
    "theme.contrastHigh": "High",
    "theme.previewLight": "Current preview: light theme, brightness {value}%",
    "theme.previewDark": "Current preview: dark theme, brightness {value}%",
    "control.reset": "Restore appearance",
    "control.resetDone": "Appearance restored",
    "status.connecting": "Connecting to the Zhihu page…",
    "status.connected": "Connected · {mode}",
    "status.applied": "Theme applied · {mode}",
    "status.restored": "Helper theme removed from this page",
    "logs.title": "Diagnostic logs",
    "logs.view": "View logs",
    "logs.copy": "Copy logs",
    "logs.copied": "Logs copied",
    "logs.empty": "No diagnostic logs yet",
    "error.clipboard": "Could not copy logs"
  },
  "zh-CN": {
    "title": "知乎暗色阅读助手",
    "short": "为知乎页面和动态界面应用可配置的暗色阅读主题。",
    "panel.documentTitle": "知乎暗色阅读助手 - 功能面板",
    "fab.label": "知乎暗色阅读助手",
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
    "error.unknownCommand": "未知的面板命令",
    "theme.group": "阅读主题",
    "theme.mode": "主题模式",
    "theme.system": "跟随系统",
    "theme.light": "浅色",
    "theme.dark": "深色",
    "theme.brightness": "深色背景亮度",
    "theme.brightnessValue": "亮度：{value}%",
    "theme.dimImages": "柔化亮图",
    "theme.codeContrast": "代码块对比度",
    "theme.contrastNormal": "标准",
    "theme.contrastHigh": "高",
    "theme.previewLight": "当前预览：浅色主题，亮度 {value}%",
    "theme.previewDark": "当前预览：深色主题，亮度 {value}%",
    "control.reset": "恢复外观",
    "control.resetDone": "已恢复外观",
    "status.connecting": "正在连接知乎页面…",
    "status.connected": "已连接 · {mode}",
    "status.applied": "主题已应用 · {mode}",
    "status.restored": "已从当前页面移除助手主题",
    "logs.title": "诊断日志",
    "logs.view": "查看日志",
    "logs.copy": "复制日志",
    "logs.copied": "日志已复制",
    "logs.empty": "暂无诊断日志",
    "error.clipboard": "无法复制日志"
  },
  "zh-TW": {
    "title": "知乎深色閱讀助手",
    "short": "為知乎頁面和動態介面套用可設定的深色閱讀主題。",
    "panel.documentTitle": "知乎深色閱讀助手 - 功能面板",
    "fab.label": "知乎深色閱讀助手",
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
    "error.unknownCommand": "未知的面板命令",
    "theme.group": "閱讀主題",
    "theme.mode": "主題模式",
    "theme.system": "跟隨系統",
    "theme.light": "淺色",
    "theme.dark": "深色",
    "theme.brightness": "深色背景亮度",
    "theme.brightnessValue": "亮度：{value}%",
    "theme.dimImages": "柔化亮圖",
    "theme.codeContrast": "程式碼區塊對比度",
    "theme.contrastNormal": "標準",
    "theme.contrastHigh": "高",
    "theme.previewLight": "目前預覽：淺色主題，亮度 {value}%",
    "theme.previewDark": "目前預覽：深色主題，亮度 {value}%",
    "control.reset": "恢復外觀",
    "control.resetDone": "已恢復外觀",
    "status.connecting": "正在連線知乎頁面…",
    "status.connected": "已連線 · {mode}",
    "status.applied": "主題已套用 · {mode}",
    "status.restored": "已從目前頁面移除助手主題",
    "logs.title": "診斷日誌",
    "logs.view": "查看日誌",
    "logs.copy": "複製日誌",
    "logs.copied": "日誌已複製",
    "logs.empty": "暫無診斷日誌",
    "error.clipboard": "無法複製日誌"
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
  var DEFAULT_THEME_SETTINGS = Object.freeze({
    mode: 'system',
    brightness: 88,
    dimImages: true,
    codeContrast: 'high'
  });

  function normalizeThemeSettings(input) {
    var value = input && typeof input === 'object' ? input : {};
    var mode = ['system', 'light', 'dark'].indexOf(value.mode) >= 0 ? value.mode : DEFAULT_THEME_SETTINGS.mode;
    var brightness = Number(value.brightness);
    if (!Number.isFinite(brightness)) brightness = DEFAULT_THEME_SETTINGS.brightness;
    brightness = Math.min(100, Math.max(65, Math.round(brightness)));
    return {
      mode: mode,
      brightness: brightness,
      dimImages: typeof value.dimImages === 'boolean' ? value.dimImages : DEFAULT_THEME_SETTINGS.dimImages,
      codeContrast: value.codeContrast === 'normal' ? 'normal' : 'high'
    };
  }

  function resolveThemeMode(mode, systemDark) {
    return mode === 'system' ? (systemDark ? 'dark' : 'light') : (mode === 'dark' ? 'dark' : 'light');
  }

  function greyHex(channel) {
    var bounded = Math.min(255, Math.max(0, Math.round(channel)));
    var part = bounded.toString(16).padStart(2, '0');
    return '#' + part + part + part;
  }

  function createColorTokens(input, systemDark) {
    var settings = normalizeThemeSettings(input);
    var effectiveMode = resolveThemeMode(settings.mode, systemDark);
    if (effectiveMode === 'light') {
      return {
        mode: 'light', background: '#ffffff', surface: '#ffffff', raised: '#fafafa',
        text: '#111111', muted: '#555555', border: '#e5e5e5', link: '#111111',
        codeBackground: '#f4f4f4', codeText: '#111111', imageFilter: 'none'
      };
    }
    var base = 10 + Math.round((settings.brightness - 65) * 0.42);
    return {
      mode: 'dark', background: greyHex(base), surface: greyHex(base + 8), raised: greyHex(base + 16),
      text: '#ececec', muted: '#a3a3a3', border: '#555555', link: '#ffffff',
      codeBackground: settings.codeContrast === 'high' ? '#000000' : greyHex(base + 5),
      codeText: settings.codeContrast === 'high' ? '#ffffff' : '#e5e5e5',
      imageFilter: settings.dimImages ? 'brightness(0.78) contrast(0.96)' : 'none'
    };
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
  var SETTINGS_KEY = TASK_ID + ':theme-settings';
  var STYLE_ID = TASK_ID + '-theme-style';
  var themeSettings = normalizeThemeSettings(null);
  var themeSuspended = false;
  var rootObserver = null;
  var systemTheme = null;

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback; }
    catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try {
      if (typeof GM_setValue === 'function') GM_setValue(key, value);
      return true;
    } catch (e) {
      log('storage.set.error', { key: key, message: String(e && e.message || e) });
      return false;
    }
  }

  function isSystemDark() {
    return !!(systemTheme && systemTheme.matches);
  }

  function createThemeCss(settings) {
    var tokens = createColorTokens(settings, isSystemDark());
    var scope = '[data-xload-reading-theme="' + tokens.mode + '"]';
    return scope + '{color-scheme:' + tokens.mode + ';--xl-bg:' + tokens.background + ';--xl-surface:' + tokens.surface +
      ';--xl-raised:' + tokens.raised + ';--xl-text:' + tokens.text + ';--xl-muted:' + tokens.muted +
      ';--xl-border:' + tokens.border + ';--xl-link:' + tokens.link + ';--xl-code-bg:' + tokens.codeBackground +
      ';--xl-code-text:' + tokens.codeText + ';--xl-image-filter:' + tokens.imageFilter + ';}' +
      scope + ',' + scope + ' body,' + scope + ' #root{background:var(--xl-bg)!important;color:var(--xl-text)!important;}' +
      scope + ' .AppHeader,' + scope + ' .Card,' + scope + ' .Modal-inner,' + scope + ' .Popover-content,' +
      scope + ' .Menu,' + scope + ' .ContentItem,' + scope + ' .QuestionHeader,' + scope + ' .Question-mainColumn,' +
      scope + ' .Post-Header,' + scope + ' .Post-RichTextContainer,' + scope + ' .RichContent,' +
      scope + ' .Search-container,' + scope + ' .Topstory-container{' +
      'background-color:var(--xl-surface)!important;color:var(--xl-text)!important;border-color:var(--xl-border)!important;}' +
      scope + ' input,' + scope + ' textarea,' + scope + ' select,' + scope + ' button{' +
      'background-color:var(--xl-raised)!important;color:var(--xl-text)!important;border-color:var(--xl-border)!important;}' +
      scope + ' a,' + scope + ' .Link,' + scope + ' .Button--plain{' +
      'color:var(--xl-link)!important;text-decoration-color:var(--xl-muted)!important;}' +
      scope + ' pre,' + scope + ' code,' + scope + ' .highlight{' +
      'background:var(--xl-code-bg)!important;color:var(--xl-code-text)!important;border-color:var(--xl-border)!important;}' +
      scope + ' .RichContent img,' + scope + ' .Post-RichTextContainer img{' +
      'filter:var(--xl-image-filter);transition:filter .18s ease;}' +
      scope + ' :focus-visible{outline:2px solid var(--xl-text)!important;outline-offset:2px;}' +
      scope + ' *{scrollbar-color:var(--xl-muted) var(--xl-bg);}' +
      '@media print{' + scope + ',' + scope + ' body{color-scheme:light;background:#fff!important;color:#111!important;}' +
      scope + ' img{filter:none!important;}}';
  }

  function mountTheme(settings) {
    themeSettings = normalizeThemeSettings(settings);
    var tokens = createColorTokens(themeSettings, isSystemDark());
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = createThemeCss(themeSettings);
    document.documentElement.setAttribute('data-xload-reading-theme', tokens.mode);
    themeSuspended = false;
    log('theme.apply', { settings: themeSettings, effectiveMode: tokens.mode });
    return tokens.mode;
  }

  function removeTheme() {
    themeSuspended = true;
    document.documentElement.removeAttribute('data-xload-reading-theme');
    var style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    log('theme.restore', { host: window.location.hostname });
  }

  function saveThemeSettings(input) {
    var normalized = normalizeThemeSettings(input);
    gmSet(SETTINGS_KEY, normalized);
    return { settings: normalized, effectiveMode: mountTheme(normalized) };
  }

  function restoreThemeAttribute() {
    if (themeSuspended) return;
    var expected = resolveThemeMode(themeSettings.mode, isSystemDark());
    if (document.documentElement.getAttribute('data-xload-reading-theme') !== expected) {
      document.documentElement.setAttribute('data-xload-reading-theme', expected);
      log('theme.attribute.restored', { effectiveMode: expected });
    }
  }

  function updateFabLabel() {
    if (!fabItem) return;
    var label = fabItem.querySelector('.xf-dot + span');
    if (label) label.textContent = i18n.t('fab.label');
  }

  function isSelfHost(host) {
    var value = String(host || '').toLowerCase();
    return SELF_HOSTS.some(function (item) {
      return value === item || value.endsWith('.' + item);
    });
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
    if (window.top !== window.self) return;
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
        channel.reply(message, {
          ok: true,
          locale: i18n.getLocale(),
          localePreference: i18n.getPreference(),
          settings: themeSettings,
          effectiveMode: resolveThemeMode(themeSettings.mode, isSystemDark()),
          applied: !themeSuspended
        });
        return;
      }
      if (data && data.action === 'saveSettings') {
        var saved = saveThemeSettings(data.settings);
        log('settings.save', saved);
        channel.reply(message, { ok: true, settings: saved.settings, effectiveMode: saved.effectiveMode, applied: true });
        channel.send('done', { action: 'saveSettings', effectiveMode: saved.effectiveMode });
        return;
      }
      if (data && data.action === 'resetSettings') {
        themeSettings = normalizeThemeSettings(null);
        gmSet(SETTINGS_KEY, themeSettings);
        removeTheme();
        log('settings.reset', { settings: themeSettings });
        channel.reply(message, { ok: true, settings: themeSettings, effectiveMode: resolveThemeMode(themeSettings.mode, isSystemDark()), applied: false });
        channel.send('done', { action: 'resetSettings' });
        return;
      }
      if (data && data.action === 'getLogs') {
        var rows = [];
        try { rows = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { rows = []; }
        channel.reply(message, { ok: true, logs: Array.isArray(rows) ? rows.slice(-60) : [] });
        return;
      }
      log('channel.command.unknown', { action: data && data.action });
      channel.reply(message, { ok: false, error: i18n.t('error.unknownCommand') });
    });
    systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    themeSettings = normalizeThemeSettings(gmGet(SETTINGS_KEY, DEFAULT_THEME_SETTINGS));
    mountTheme(themeSettings);
    var onSystemThemeChange = function () {
      if (!themeSuspended && themeSettings.mode === 'system') mountTheme(themeSettings);
    };
    if (typeof systemTheme.addEventListener === 'function') systemTheme.addEventListener('change', onSystemThemeChange);
    else if (typeof systemTheme.addListener === 'function') systemTheme.addListener(onSystemThemeChange);
    rootObserver = new MutationObserver(restoreThemeAttribute);
    rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-xload-reading-theme'] });
    window.addEventListener('pageshow', restoreThemeAttribute);
    window.addEventListener('popstate', restoreThemeAttribute);
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    log('init', { host: window.location.hostname });
  }

  init();
})();
