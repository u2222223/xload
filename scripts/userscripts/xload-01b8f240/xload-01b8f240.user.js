// ==UserScript==
// @name         Pixiv Artist UID, Profile Media, and Work Type Labels
// @name:en      Pixiv Artist UID, Profile Media, and Work Type Labels
// @name:zh-CN   Pixiv 画师 UID、资料图片与作品类型标记
// @name:zh-TW   Pixiv 繪師 UID、資料圖片與作品類型標記
// @namespace    https://xload.net/
// @version      2026.9.17.1
// @description  Show and copy Pixiv artist IDs, expose valid profile image links, and label loaded works as single, multi-page, or ugoira
// @description:en      Show and copy Pixiv artist IDs, expose valid profile image links, and label loaded works as single, multi-page, or ugoira
// @description:zh-CN   显示并复制 Pixiv 画师 ID，提供有效资料图片链接，并标记单图、多图或动图作品
// @description:zh-TW   顯示並複製 Pixiv 繪師 ID，提供有效資料圖片連結，並標記單圖、多圖或動圖作品
// @homepageURL  https://xload.net/scripts/userscripts/xload-01b8f240/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://pixiv.net/*
// @match        *://www.pixiv.net/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-01b8f240';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-01b8f240/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-01b8f240-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "Pixiv Artist UID, Profile Media, and Work Type Labels",
    "short": "Show and copy Pixiv artist IDs, expose valid profile image links, and label loaded works as single, multi-page, or ugoira",
    "panel.documentTitle": "Pixiv Artist UID, Profile Media, and Work Type Labels - Panel",
    "fab.label": "Pixiv Artist UID, Profile Media, and Work Type Labels",
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
    "error.unsupported": "Unsupported command",
    "artist.cardTitle": "Artist context",
    "artist.uid": "Artist UID",
    "artist.avatar": "Avatar image",
    "artist.background": "Profile background",
    "artist.unavailable": "Not available on this page",
    "artist.copyUid": "Copy UID",
    "artist.copyAvatar": "Copy avatar URL",
    "artist.copyBackground": "Copy background URL",
    "artist.open": "Open",
    "artist.copied": "Copied",
    "artist.copyFailed": "Copy failed",
    "settings.title": "Display settings",
    "settings.uid": "Show artist UID",
    "settings.uidHelp": "Keep the detected artist ID visible beside the page content.",
    "settings.assets": "Show profile media links",
    "settings.assetsHelp": "Only validated Pixiv or Pximg HTTP(S) links are shown.",
    "settings.badges": "Show work type labels",
    "settings.badgesHelp": "Label loaded works from Pixiv metadata.",
    "work.title": "Loaded work types",
    "work.single": "Single",
    "work.multi": "Multi-page",
    "work.ugoira": "Ugoira",
    "work.unknown": "Unknown",
    "work.count": "{count} works",
    "status.connecting": "Reading the Pixiv page…",
    "status.ready": "Ready · {count} works labeled",
    "status.error": "Could not read this page",
    "control.refresh": "Refresh page data",
    "control.viewLogs": "View logs",
    "control.copyLogs": "Copy logs",
    "logs.title": "Diagnostics",
    "logs.empty": "No logs yet"
  },
  "zh-CN": {
    "title": "Pixiv 画师 UID、资料图片与作品类型标记",
    "short": "显示并复制 Pixiv 画师 ID，提供有效资料图片链接，并标记单图、多图或动图作品",
    "panel.documentTitle": "Pixiv 画师 UID、资料图片与作品类型标记 - 功能面板",
    "fab.label": "Pixiv 画师 UID、资料图片与作品类型标记",
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
    "error.unsupported": "不支持的命令",
    "artist.cardTitle": "画师资料",
    "artist.uid": "画师 UID",
    "artist.avatar": "头像图片",
    "artist.background": "主页背景",
    "artist.unavailable": "当前页面暂无资料",
    "artist.copyUid": "复制 UID",
    "artist.copyAvatar": "复制头像地址",
    "artist.copyBackground": "复制背景地址",
    "artist.open": "打开",
    "artist.copied": "已复制",
    "artist.copyFailed": "复制失败",
    "settings.title": "显示配置",
    "settings.uid": "显示画师 UID",
    "settings.uidHelp": "在页面内容旁显示识别到的画师 ID。",
    "settings.assets": "显示资料图片链接",
    "settings.assetsHelp": "只显示已校验的 Pixiv 或 Pximg HTTP(S) 链接。",
    "settings.badges": "显示作品类型标记",
    "settings.badgesHelp": "依据 Pixiv 元数据标记已加载作品。",
    "work.title": "已加载作品类型",
    "work.single": "单图",
    "work.multi": "多图",
    "work.ugoira": "动图",
    "work.unknown": "未知类型",
    "work.count": "{count} 个作品",
    "status.connecting": "正在读取 Pixiv 页面…",
    "status.ready": "已就绪 · 已标记 {count} 个作品",
    "status.error": "无法读取当前页面",
    "control.refresh": "刷新页面资料",
    "control.viewLogs": "查看日志",
    "control.copyLogs": "复制日志",
    "logs.title": "诊断日志",
    "logs.empty": "暂无日志"
  },
  "zh-TW": {
    "title": "Pixiv 繪師 UID、資料圖片與作品類型標記",
    "short": "顯示並複製 Pixiv 繪師 ID，提供有效資料圖片連結，並標記單圖、多圖或動圖作品",
    "panel.documentTitle": "Pixiv 繪師 UID、資料圖片與作品類型標記 - 功能面板",
    "fab.label": "Pixiv 繪師 UID、資料圖片與作品類型標記",
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
    "error.unsupported": "不支援的命令",
    "artist.cardTitle": "繪師資料",
    "artist.uid": "繪師 UID",
    "artist.avatar": "頭像圖片",
    "artist.background": "首頁背景",
    "artist.unavailable": "目前頁面暫無資料",
    "artist.copyUid": "複製 UID",
    "artist.copyAvatar": "複製頭像網址",
    "artist.copyBackground": "複製背景網址",
    "artist.open": "開啟",
    "artist.copied": "已複製",
    "artist.copyFailed": "複製失敗",
    "settings.title": "顯示設定",
    "settings.uid": "顯示繪師 UID",
    "settings.uidHelp": "在頁面內容旁顯示辨識到的繪師 ID。",
    "settings.assets": "顯示資料圖片連結",
    "settings.assetsHelp": "只顯示已驗證的 Pixiv 或 Pximg HTTP(S) 連結。",
    "settings.badges": "顯示作品類型標記",
    "settings.badgesHelp": "依據 Pixiv 中繼資料標記已載入作品。",
    "work.title": "已載入作品類型",
    "work.single": "單圖",
    "work.multi": "多圖",
    "work.ugoira": "動圖",
    "work.unknown": "未知類型",
    "work.count": "{count} 個作品",
    "status.connecting": "正在讀取 Pixiv 頁面…",
    "status.ready": "已就緒 · 已標記 {count} 個作品",
    "status.error": "無法讀取目前頁面",
    "control.refresh": "重新整理頁面資料",
    "control.viewLogs": "檢視日誌",
    "control.copyLogs": "複製日誌",
    "logs.title": "診斷日誌",
    "logs.empty": "暫無日誌"
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
  function extractArtistId(value) {
    var match = String(value || '').match(/\/users\/(\d+)(?:[/?#]|$)/);
    return match ? match[1] : '';
  }

  function extractArtworkId(value) {
    var match = String(value || '').match(/\/artworks\/(\d+)(?:[/?#]|$)/);
    return match ? match[1] : '';
  }

  function normalizeMediaUrl(value, base) {
    try {
      var parsed = new URL(String(value || ''), String(base || 'https://www.pixiv.net/'));
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
      var host = parsed.hostname.toLowerCase();
      if (host !== 'pixiv.net' && !host.endsWith('.pixiv.net') && host !== 'pximg.net' && !host.endsWith('.pximg.net')) return '';
      return parsed.href;
    } catch (e) { return ''; }
  }

  function classifyWorkKind(illustType, pageCount) {
    var type = Number(illustType);
    var pages = Number(pageCount);
    if (type === 2) return 'ugoira';
    if ((type === 0 || type === 1) && Number.isFinite(pages) && pages > 1) return 'multi';
    if ((type === 0 || type === 1) && Number.isFinite(pages) && pages === 1) return 'single';
    return 'unknown';
  }

  function normalizeSettings(value) {
    var input = value && typeof value === 'object' ? value : {};
    return {
      showUid: input.showUid !== false,
      showAssets: input.showAssets !== false,
      showBadges: input.showBadges !== false
    };
  }

  function workKindLabelKey(kind) {
    if (kind === 'single') return 'work.single';
    if (kind === 'multi') return 'work.multi';
    if (kind === 'ugoira') return 'work.ugoira';
    return 'work.unknown';
  }

  function normalizeArtistPayload(body, fallbackId) {
    var input = body && typeof body === 'object' ? body : {};
    return {
      id: String(input.userId || fallbackId || '').replace(/\D/g, ''),
      name: String(input.name || input.userName || ''),
      avatarUrl: normalizeMediaUrl(input.imageBig || input.image || '', 'https://www.pixiv.net/'),
      backgroundUrl: normalizeMediaUrl(input.background && input.background.url || '', 'https://www.pixiv.net/')
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

  var SETTINGS_KEY = TASK_ID + ':settings';
  var channel = null;
  var fabItem = null;
  var settings = normalizeSettings(gmGet(SETTINGS_KEY, {}));
  var state = {
    status: 'connecting',
    artist: { id: '', name: '', avatarUrl: '', backgroundUrl: '' },
    counts: { single: 0, multi: 0, ugoira: 0, unknown: 0 },
    workKinds: {},
    error: ''
  };
  var artistCache = {};
  var illustCache = {};
  var scanTimer = 0;
  var scanRunning = false;
  var scanAgain = false;
  var lastHref = window.location.href;

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback; }
    catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, value); }
    catch (e) { log('storage.set.error', { key: key, message: String(e && e.message || e) }); }
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

  function httpGet(value) {
    var parsed = new URL(String(value || ''), 'https://www.pixiv.net/');
    if ((parsed.hostname !== 'www.pixiv.net' && parsed.hostname !== 'pixiv.net') || !parsed.pathname.startsWith('/ajax/')) {
      return Promise.reject(new Error('Blocked non-Pixiv API URL'));
    }
    return fetch(parsed.href, { credentials: 'include', headers: { Accept: 'application/json' } }).then(function (response) {
      if (!response.ok) throw new Error('Pixiv HTTP ' + response.status);
      return response.json();
    }).then(function (payload) {
      if (!payload || payload.error || !payload.body) throw new Error(payload && payload.message || 'Pixiv response missing body');
      return payload.body;
    });
  }

  function loadArtist(artistId) {
    var id = String(artistId || '').replace(/\D/g, '');
    if (!id) return Promise.resolve(normalizeArtistPayload({}, ''));
    if (!artistCache[id]) {
      artistCache[id] = httpGet('/ajax/user/' + id).then(function (body) {
        return normalizeArtistPayload(body, id);
      }).catch(function (error) {
        delete artistCache[id];
        throw error;
      });
    }
    return artistCache[id];
  }

  function loadIllust(artworkId) {
    var id = String(artworkId || '').replace(/\D/g, '');
    if (!id) return Promise.resolve(null);
    if (!illustCache[id]) {
      illustCache[id] = httpGet('/ajax/illust/' + id).catch(function (error) {
        delete illustCache[id];
        throw error;
      });
    }
    return illustCache[id];
  }

  function copyText(value) {
    var text = String(value || '');
    if (!text) return Promise.reject(new Error('Nothing to copy'));
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, 'text');
        return Promise.resolve(true);
      }
    } catch (e) { /* continue to browser clipboard */ }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).then(function () { return true; });
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        if (!document.execCommand('copy')) throw new Error('copy command rejected');
        resolve(true);
      } catch (error) { reject(error); }
      area.remove();
    });
  }

  function injectPageStyle() {
    if (document.getElementById('xload-artist-context-style')) return;
    var style = document.createElement('style');
    style.id = 'xload-artist-context-style';
    style.setAttribute('data-xload-owned', 'true');
    style.textContent = '#xload-artist-context{margin:12px auto;padding:12px;max-width:760px;border:1px solid #d4d4d4;background:#fff;color:#111;font:14px/1.5 sans-serif}' +
      '#xload-artist-context h2{margin:0 0 8px;font-size:16px}' +
      '#xload-artist-context p{margin:6px 0;overflow-wrap:anywhere}' +
      '#xload-artist-context button,#xload-artist-context a{margin-left:8px;color:#111;background:#fff;border:1px solid #111;padding:3px 7px;text-decoration:none;cursor:pointer}' +
      '.xload-work-kind{display:inline-block;margin:4px;padding:2px 6px;border:1px solid #111;background:#fff;color:#111;font:12px/1.3 sans-serif;vertical-align:middle}';
    (document.head || document.documentElement).appendChild(style);
  }

  function makeCopyButton(labelKey, value) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = i18n.t(labelKey);
    button.addEventListener('click', function () {
      copyText(value).then(function () {
        button.textContent = i18n.t('artist.copied');
        log('copy.success', { field: labelKey });
        window.setTimeout(function () { button.textContent = i18n.t(labelKey); }, 1600);
      }).catch(function (error) {
        button.textContent = i18n.t('artist.copyFailed');
        log('copy.error', { field: labelKey, message: String(error && error.message || error) });
      });
    });
    return button;
  }

  function appendAssetRow(card, labelKey, copyKey, value) {
    if (!value) return;
    var row = document.createElement('p');
    var label = document.createElement('strong');
    label.textContent = i18n.t(labelKey) + ': ';
    var link = document.createElement('a');
    link.href = value;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = i18n.t('artist.open');
    row.appendChild(label);
    row.appendChild(link);
    row.appendChild(makeCopyButton(copyKey, value));
    card.appendChild(row);
  }

  function renderArtistCard() {
    var existing = document.getElementById('xload-artist-context');
    if (!state.artist.id || (!settings.showUid && !settings.showAssets)) {
      if (existing) existing.remove();
      return;
    }
    var card = existing || document.createElement('section');
    card.id = 'xload-artist-context';
    card.setAttribute('data-xload-owned', 'true');
    card.replaceChildren();
    var heading = document.createElement('h2');
    heading.textContent = i18n.t('artist.cardTitle') + (state.artist.name ? ' · ' + state.artist.name : '');
    card.appendChild(heading);
    if (settings.showUid) {
      var uidRow = document.createElement('p');
      var uidLabel = document.createElement('strong');
      uidLabel.textContent = i18n.t('artist.uid') + ': ';
      var uidValue = document.createElement('span');
      uidValue.textContent = state.artist.id;
      uidRow.appendChild(uidLabel);
      uidRow.appendChild(uidValue);
      uidRow.appendChild(makeCopyButton('artist.copyUid', state.artist.id));
      card.appendChild(uidRow);
    }
    if (settings.showAssets) {
      appendAssetRow(card, 'artist.avatar', 'artist.copyAvatar', state.artist.avatarUrl);
      appendAssetRow(card, 'artist.background', 'artist.copyBackground', state.artist.backgroundUrl);
    }
    if (!existing) {
      var main = document.querySelector('main');
      if (main) main.insertBefore(card, main.firstChild);
      else document.body.appendChild(card);
    }
  }

  function updateWorkBadgeText() {
    var badges = document.querySelectorAll('.xload-work-kind[data-xload-kind]');
    for (var i = 0; i < badges.length; i++) {
      var kind = badges[i].getAttribute('data-xload-kind') || 'unknown';
      badges[i].textContent = i18n.t(workKindLabelKey(kind));
      badges[i].setAttribute('aria-label', i18n.t(workKindLabelKey(kind)));
    }
  }

  function addBadge(anchor, artworkId, kind) {
    if (!anchor || anchor.getAttribute('data-xload-kind-done') === artworkId) return;
    anchor.setAttribute('data-xload-kind-done', artworkId);
    var badge = document.createElement('span');
    badge.className = 'xload-work-kind';
    badge.setAttribute('data-xload-owned', 'true');
    badge.setAttribute('data-xload-kind', kind);
    badge.setAttribute('data-xload-work-id', artworkId);
    badge.textContent = i18n.t(workKindLabelKey(kind));
    badge.setAttribute('aria-label', i18n.t(workKindLabelKey(kind)));
    anchor.insertAdjacentElement('afterend', badge);
  }

  function recalculateCounts() {
    var counts = { single: 0, multi: 0, ugoira: 0, unknown: 0 };
    Object.keys(state.workKinds).forEach(function (id) {
      var kind = state.workKinds[id];
      counts[kind] = (counts[kind] || 0) + 1;
    });
    state.counts = counts;
  }

  function collectArtworkAnchors() {
    var anchors = document.querySelectorAll('a[href*="/artworks/"]');
    var grouped = {};
    for (var i = 0; i < anchors.length && i < 240; i++) {
      var id = extractArtworkId(anchors[i].href || anchors[i].getAttribute('href'));
      if (!id) continue;
      (grouped[id] = grouped[id] || []).push(anchors[i]);
    }
    return grouped;
  }

  function scanWorkCards() {
    if (!settings.showBadges) {
      var existing = document.querySelectorAll('.xload-work-kind');
      for (var r = 0; r < existing.length; r++) existing[r].remove();
      state.workKinds = {};
      recalculateCounts();
      return Promise.resolve();
    }
    var grouped = collectArtworkAnchors();
    var ids = Object.keys(grouped).slice(0, 80);
    var cursor = 0;
    function worker() {
      if (cursor >= ids.length) return Promise.resolve();
      var id = ids[cursor++];
      return loadIllust(id).then(function (body) {
        var kind = classifyWorkKind(body && body.illustType, body && body.pageCount);
        state.workKinds[id] = kind;
        grouped[id].forEach(function (anchor) { addBadge(anchor, id, kind); });
      }).catch(function (error) {
        state.workKinds[id] = 'unknown';
        grouped[id].forEach(function (anchor) { addBadge(anchor, id, 'unknown'); });
        log('work.metadata.error', { artworkId: id, message: String(error && error.message || error) });
      }).then(worker);
    }
    return Promise.all([worker(), worker(), worker(), worker()]).then(function () { recalculateCounts(); });
  }

  function findArtistIdFromDom() {
    var links = document.querySelectorAll('main a[href*="/users/"]');
    for (var i = 0; i < links.length; i++) {
      var id = extractArtistId(links[i].href || links[i].getAttribute('href'));
      if (id) return id;
    }
    return '';
  }

  function resolveCurrentArtistId() {
    var direct = extractArtistId(window.location.href);
    if (direct) return Promise.resolve(direct);
    var artworkId = extractArtworkId(window.location.href);
    if (artworkId) {
      return loadIllust(artworkId).then(function (body) {
        return String(body && body.userId || '').replace(/\D/g, '') || findArtistIdFromDom();
      });
    }
    return Promise.resolve(findArtistIdFromDom());
  }

  function getStateSnapshot() {
    return {
      ok: true,
      locale: i18n.getLocale(),
      localePreference: i18n.getPreference(),
      status: state.status,
      artist: state.artist,
      counts: state.counts,
      settings: settings,
      error: state.error
    };
  }

  function scanPage(reason) {
    if (scanRunning) { scanAgain = true; return; }
    scanRunning = true;
    state.status = 'connecting';
    state.error = '';
    channel.send('progress', getStateSnapshot());
    resolveCurrentArtistId().then(function (artistId) {
      return artistId ? loadArtist(artistId) : normalizeArtistPayload({}, '');
    }).then(function (artist) {
      state.artist = artist;
      renderArtistCard();
      return scanWorkCards();
    }).then(function () {
      state.status = 'ready';
      channel.send('done', getStateSnapshot());
      log('scan.done', { reason: reason, artistId: state.artist.id, counts: state.counts });
    }).catch(function (error) {
      state.status = 'error';
      state.error = String(error && error.message || error);
      renderArtistCard();
      channel.send('error', getStateSnapshot());
      log('scan.error', { reason: reason, message: state.error });
    }).finally(function () {
      scanRunning = false;
      if (scanAgain) { scanAgain = false; scheduleScan('queued'); }
    });
  }

  function scheduleScan(reason) {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(function () { scanPage(reason); }, 180);
  }

  function mutationIsExternal(mutation) {
    if (mutation.target && mutation.target.closest && mutation.target.closest('[data-xload-owned="true"]')) return false;
    for (var i = 0; i < mutation.addedNodes.length; i++) {
      var node = mutation.addedNodes[i];
      if (node.nodeType !== 1) return true;
      if (!node.matches('[data-xload-owned="true"]') && !node.closest('[data-xload-owned="true"]')) return true;
    }
    return false;
  }

  function watchPage() {
    var observer = new MutationObserver(function (mutations) {
      if (window.location.href !== lastHref) {
        lastHref = window.location.href;
        state.artist = normalizeArtistPayload({}, '');
        state.workKinds = {};
        log('page.route', { href: lastHref });
        scheduleScan('route');
        return;
      }
      if (mutations.some(mutationIsExternal)) scheduleScan('dom');
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('popstate', function () { scheduleScan('popstate'); });
    window.addEventListener('hashchange', function () { scheduleScan('hashchange'); });
  }

  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) {
      try { existing.focus(); } catch (e) { log('panel.reuse.error', { message: String(e && e.message || e) }); }
      log('panel.reuse', {});
      return true;
    }
    try {
      var width = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
      var height = Math.min(780, Math.max(540, (window.screen.availHeight || 800) - 140));
      var left = Math.max(0, Math.round(((window.screen.availWidth || 1280) - width) / 2));
      var top = Math.max(0, Math.round(((window.screen.availHeight || 800) - height) / 2));
      var features = 'popup=yes,width=' + width + ',height=' + height + ',left=' + left + ',top=' + top +
        ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
      var panelWin = window.open(PANEL_URL, '_blank', features);
      if (panelWin) {
        try { panelWin.moveTo(left, top); panelWin.resizeTo(width, height); }
        catch (moveError) { log('panel.position.error', { message: String(moveError && moveError.message || moveError) }); }
        channel.setPanelWin(panelWin);
      }
      log('panel.open', { opened: !!panelWin, width: width, height: height, left: left, top: top });
      return !!panelWin;
    } catch (error) {
      log('panel.open.error', { message: String(error && error.message || error) });
      return false;
    }
  }

  function handleCommand(data, message) {
    var action = data && data.action || '';
    log('channel.command', { action: action });
    if (action === 'setLanguage') {
      var preference = i18n.setLocale(data.locale);
      updateFabLabel();
      renderArtistCard();
      updateWorkBadgeText();
      channel.reply(message, getStateSnapshot());
      return;
    }
    if (action === 'getState') {
      channel.reply(message, getStateSnapshot());
      return;
    }
    if (action === 'setSettings') {
      settings = normalizeSettings(data.settings);
      gmSet(SETTINGS_KEY, settings);
      renderArtistCard();
      if (!settings.showBadges) scanWorkCards();
      else scheduleScan('settings');
      log('settings.save', settings);
      channel.reply(message, getStateSnapshot());
      return;
    }
    if (action === 'refresh') {
      artistCache = {};
      illustCache = {};
      scheduleScan('panel-refresh');
      channel.reply(message, getStateSnapshot());
      return;
    }
    if (action === 'copy') {
      var values = { uid: state.artist.id, avatar: state.artist.avatarUrl, background: state.artist.backgroundUrl };
      copyText(values[data.field]).then(function () {
        channel.reply(message, { ok: true });
      }).catch(function (error) {
        channel.reply(message, { ok: false, error: String(error && error.message || error) });
      });
      return;
    }
    if (action === 'getLogs') {
      var rows = [];
      try { rows = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { rows = []; }
      channel.reply(message, { ok: true, logs: rows.slice(-60) });
      return;
    }
    channel.reply(message, { ok: false, error: i18n.t('error.unsupported') });
  }

  function init() {
    if (isSelfHost(window.location.hostname)) return;
    if (window.self !== window.top) return;
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
    injectPageStyle();
    watchPage();
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    log('init', { href: window.location.href });
    scheduleScan('init');
  }

  init();
})();
