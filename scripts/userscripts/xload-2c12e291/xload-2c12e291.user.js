// ==UserScript==
// @name         YouTube Ad Controls
// @name:en      YouTube Ad Controls
// @name:zh-CN   YouTube 广告控制
// @name:zh-TW   YouTube 廣告控制
// @namespace    https://xload.net/
// @version      2026.9.15.2
// @description  Manage targeted ad handling on YouTube with an immediate off switch.
// @description:en      Manage targeted ad handling on YouTube with an immediate off switch.
// @description:zh-CN   管理 YouTube 的定向广告处理，支持立即关闭。
// @description:zh-TW   管理 YouTube 的定向廣告處理，支援立即關閉。
// @match        https://youtube.com/*
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://music.youtube.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  var TASK_ID = 'xload-2c12e291';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-2c12e291/panel.html';
  var LOG_KEY = 'xload-2c12e291-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "YouTube Ad Controls",
    "short": "Manage targeted ad handling on YouTube with an immediate off switch.",
    "panel.documentTitle": "YouTube Ad Controls - Panel",
    "fab.label": "YouTube Ad Controls",
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
    "ad.page": "Hide page ads",
    "ad.player": "Handle player ads",
    "ad.disable": "Disable ad handling",
    "ad.restore": "Restore hidden elements",
    "ad.empty": "No ad actions yet",
    "ad.unmatched": "Ad state not recognized",
    "ad.help": "Disable handling if normal controls are affected. Restore also turns page-ad hiding off for this host.",
    "ad.policyLabel": "Ad controls for this host",
    "ad.host": "Current host",
    "ad.refresh": "Refresh state",
    "ad.recent": "Recent actions (this page session)",
    "ad.clear": "Clear logs",
    "ad.logs": "View diagnostic logs",
    "ad.copy": "Copy visible logs",
    "ad.copied": "Logs copied",
    "ad.filter": "Filter actions by rule or category",
    "ad.counts": "Hidden now: {hidden}. Session hides: {hide}; skips: {skip}; seeks: {seek}; unmatched: {unmatched}; errors: {errors}.",
    "ad.limit": "Native skip buttons take priority. Seeking requires a confirmed ad-owned video, a finite duration up to 10 minutes and a seekable range. Unrecognized states remain untouched. A time jump cannot be undone.",
    "ad.privacy": "Host switches and language use userscript storage; this panel also remembers language locally. Action history stays in memory. Up to 60 diagnostic entries persist in the source page’s local storage and can be cleared here. No ad-classification requests are made.",
    "status.connecting": "Connecting to the source page…",
    "status.connected": "Connected to {host}",
    "status.disconnected": "Source page unavailable. Open this panel from YouTube. Cached logs and help remain available.",
    "status.disabled": "Player handling is off",
    "status.idle": "No active player ad detected",
    "status.skip": "Native ad skip requested",
    "status.seek": "Confirmed ad media advanced",
    "status.unmatched": "Ad signal found; safe action unavailable",
    "status.restored": "Restored {count} elements",
    "status.cleared": "Logs cleared",
    "error.command": "Invalid command",
    "error.policy": "Invalid host or ad settings",
    "error.language": "Unsupported language preference",
    "error.storage": "Settings could not be saved. Check userscript storage permissions.",
    "error.operation": "The operation failed; inspect diagnostic logs.",
    "error.copy": "Copy failed. Select and copy the log text manually."
  },
  "zh-CN": {
    "title": "YouTube 广告控制",
    "short": "管理 YouTube 的定向广告处理，支持立即关闭。",
    "panel.documentTitle": "YouTube 广告控制 - 功能面板",
    "fab.label": "YouTube 广告控制",
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
    "ad.page": "隐藏页面广告",
    "ad.player": "处理播放器广告",
    "ad.disable": "关闭广告处理",
    "ad.restore": "恢复隐藏元素",
    "ad.empty": "暂无广告操作",
    "ad.unmatched": "未识别广告状态",
    "ad.help": "正常控件受影响时请关闭处理。恢复元素也会关闭此主机的页面广告隐藏。",
    "ad.policyLabel": "此主机的广告控制",
    "ad.host": "当前主机",
    "ad.refresh": "刷新状态",
    "ad.recent": "近期操作（本页面会话）",
    "ad.clear": "清空日志",
    "ad.logs": "查看诊断日志",
    "ad.copy": "复制当前日志",
    "ad.copied": "日志已复制",
    "ad.filter": "按规则或类别筛选操作",
    "ad.counts": "当前隐藏：{hidden}。会话隐藏：{hide}；跳过：{skip}；跳跃：{seek}；未匹配：{unmatched}；错误：{errors}。",
    "ad.limit": "优先点击原生跳过按钮。跳跃须确认视频属于广告容器、时长不超过 10 分钟且可寻址。未识别状态不作处理；已发生的时间跳跃无法撤销。",
    "ad.privacy": "主机开关和语言保存在用户脚本存储，面板也在本地记忆语言。操作记录仅存内存；最多 60 条诊断记录保存在原页面的本地存储，可在此清空。不发送广告分类请求。",
    "status.connecting": "正在连接原页面…",
    "status.connected": "已连接 {host}",
    "status.disconnected": "原页面不可用，请从 YouTube 打开面板。仍可查看已收日志和帮助。",
    "status.disabled": "播放器处理已关闭",
    "status.idle": "未检测到活动的播放器广告",
    "status.skip": "已请求原生跳过广告",
    "status.seek": "已跳转已确认的广告媒体",
    "status.unmatched": "发现广告信号，未找到安全操作",
    "status.restored": "已恢复 {count} 个元素",
    "status.cleared": "日志已清空",
    "error.command": "命令无效",
    "error.policy": "主机或广告设置无效",
    "error.language": "不支持该语言选项",
    "error.storage": "无法保存设置，请检查用户脚本存储权限。",
    "error.operation": "操作失败，请查看诊断日志。",
    "error.copy": "复制失败，请手动选中日志并复制。"
  },
  "zh-TW": {
    "title": "YouTube 廣告控制",
    "short": "管理 YouTube 的定向廣告處理，支援立即關閉。",
    "panel.documentTitle": "YouTube 廣告控制 - 功能面板",
    "fab.label": "YouTube 廣告控制",
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
    "ad.page": "隱藏頁面廣告",
    "ad.player": "處理播放器廣告",
    "ad.disable": "關閉廣告處理",
    "ad.restore": "還原隱藏元素",
    "ad.empty": "暫無廣告操作",
    "ad.unmatched": "未辨識廣告狀態",
    "ad.help": "正常控制項受影響時請關閉處理。還原元素也會關閉此主機的頁面廣告隱藏。",
    "ad.policyLabel": "此主機的廣告控制",
    "ad.host": "目前主機",
    "ad.refresh": "重新整理狀態",
    "ad.recent": "近期操作（本頁工作階段）",
    "ad.clear": "清除日誌",
    "ad.logs": "檢視診斷日誌",
    "ad.copy": "複製目前日誌",
    "ad.copied": "日誌已複製",
    "ad.filter": "依規則或類別篩選操作",
    "ad.counts": "目前隱藏：{hidden}。工作階段隱藏：{hide}；略過：{skip}；跳躍：{seek}；未匹配：{unmatched}；錯誤：{errors}。",
    "ad.limit": "優先點擊原生略過按鈕。跳躍須確認影片屬於廣告容器、時長不超過 10 分鐘且可定址。未辨識狀態不作處理；已發生的時間跳躍無法撤銷。",
    "ad.privacy": "主機開關和語言保存在使用者腳本儲存空間，面板也在本機記憶語言。操作記錄僅存記憶體；最多 60 條診斷記錄保存在原頁面的本機儲存空間，可在此清除。不傳送廣告分類請求。",
    "status.connecting": "正在連線至原頁面…",
    "status.connected": "已連線至 {host}",
    "status.disconnected": "原頁面無法連線，請從 YouTube 開啟面板。仍可檢視已收日誌和說明。",
    "status.disabled": "播放器處理已關閉",
    "status.idle": "未偵測到播放中的播放器廣告",
    "status.skip": "已請求原生略過廣告",
    "status.seek": "已跳轉已確認的廣告媒體",
    "status.unmatched": "發現廣告訊號，未找到安全操作",
    "status.restored": "已還原 {count} 個元素",
    "status.cleared": "日誌已清除",
    "error.command": "命令無效",
    "error.policy": "主機或廣告設定無效",
    "error.language": "不支援此語言選項",
    "error.storage": "無法儲存設定，請檢查使用者腳本儲存權限。",
    "error.operation": "操作失敗，請檢視診斷日誌。",
    "error.copy": "複製失敗，請手動選取日誌並複製。"
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
      if (!Array.isArray(rows)) rows = [];
      rows.push(entry);
      window.localStorage.setItem(LOG_KEY, JSON.stringify(rows.slice(-60)));
    } catch (e) { /* 日志不能中断主逻辑 */ }
  }

  // XLOAD:CORE-TEST:REQUIRED
  // CORE-START
  var DEFAULT_SETTINGS = { excludeSites: ['xload.net', 'u2222223.github.io'] };
  var SUPPORTED_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'];
  var PAGE_RULES = [
    { id: 'page.slot', selector: 'ytd-ad-slot-renderer' },
    { id: 'page.display', selector: 'ytd-display-ad-renderer' },
    { id: 'page.companion', selector: 'ytd-companion-ad-renderer, ytm-companion-ad-renderer' },
    { id: 'page.promoted', selector: 'ytd-promoted-video-renderer, ytd-compact-promoted-video-renderer' },
    { id: 'page.sparkles', selector: 'ytd-promoted-sparkles-web-renderer, ytd-promoted-sparkles-text-search-renderer' },
    { id: 'page.masthead', selector: 'ytd-video-masthead-ad' },
    { id: 'page.search', selector: 'ytd-search-pyv-renderer' },
    { id: 'page.shorts', selector: 'ytd-shorts-ad-renderer' },
    { id: 'page.panel', selector: "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']" },
    { id: 'page.playerAds', selector: '#player-ads' }
  ];

  function isSelfHost(host) {
    var value = String(host || '').toLowerCase().replace(/\.$/, '');
    return DEFAULT_SETTINGS.excludeSites.some(function (item) {
      return value === item || value.endsWith('.' + item);
    });
  }

  function isSupportedHost(host) {
    return SUPPORTED_HOSTS.indexOf(host) !== -1;
  }

  function normalizePolicy(value) {
    var input = value && typeof value === 'object' ? value : {};
    return { pageAds: input.pageAds === true, playerAds: input.playerAds === true };
  }

  function validateAdCommand(data, host) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !isSupportedHost(host)) return 'error.command';
    var allowed = {
      getState: ['action'], getAdState: ['action'], setLanguage: ['action', 'locale'],
      setAdPolicy: ['action', 'host', 'pageAds', 'playerAds'],
      disableAll: ['action'], restoreHidden: ['action'], clearAdLog: ['action']
    };
    if (!Object.prototype.hasOwnProperty.call(allowed, data.action)) return 'error.command';
    if (Object.keys(data).some(function (key) { return allowed[data.action].indexOf(key) < 0; })) return 'error.command';
    if (data.action === 'setAdPolicy' && (data.host !== host || typeof data.pageAds !== 'boolean' || typeof data.playerAds !== 'boolean')) return 'error.policy';
    if (data.action === 'setLanguage' && ['auto', 'en', 'zh-CN', 'zh-TW'].indexOf(data.locale) < 0) return 'error.language';
    return '';
  }

  function decidePlayerAction(state) {
    if (!state.enabled) return { kind: 'disabled' };
    if (!state.adSignal) return { kind: 'idle' };
    if (state.hasVideo && state.paused) return { kind: 'unmatched' };
    if (state.skipAvailable) return { kind: 'skip', rule: 'player.nativeSkip' };
    // A marker near the main video is insufficient proof that its timeline is an ad.
    if (!state.adMediaOwned || !state.hasVideo || state.paused || state.seeking || state.readyState < 2) return { kind: 'unmatched' };
    var end = state.duration;
    if (typeof end !== 'number' || !Number.isFinite(end) || end <= 0 || end > 600 ||
        !Number.isFinite(state.currentTime) || state.currentTime < 0 || state.currentTime >= end - 0.2) return { kind: 'unmatched' };
    var target = Math.max(0, end - 0.05);
    var canSeek = Array.isArray(state.ranges) && state.ranges.some(function (range) {
      return Array.isArray(range) && Number.isFinite(range[0]) && Number.isFinite(range[1]) &&
        range[0] <= state.currentTime && range[0] <= target && range[1] >= target;
    });
    return canSeek ? { kind: 'seek', target: target, rule: 'player.ownedAdSeek' } : { kind: 'unmatched' };
  }

  function ownsHiddenDisplay(value, priority) {
    return value === 'none' && priority === 'important';
  }

  function appendAdAction(rows, entry) {
    return rows.concat([entry]).slice(-60);
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
  var host = window.location.hostname;
  var policy = normalizePolicy(null);
  var hiddenElements = new Map();
  var recentActions = [];
  var counts = { hide: 0, skip: 0, seek: 0, unmatched: 0, errors: 0 };
  var playerAdState = 'disabled';
  var watchedRoot = null;
  var adObserver = null;
  var pendingScan = null;
  var monitor = null;
  var routeKey = '';
  var skipAttempts = new WeakMap();
  var seekAttempts = new WeakMap();
  var navigating = false;
  var SKIP_SELECTOR = '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern';
  var OVERLAY_SELECTOR = '.video-ads.ytp-ad-module .ytp-ad-player-overlay';

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':' + key, fallback) : fallback; }
    catch (error) { log('storage.read.error', { message: String(error.message).slice(0, 200) }); return fallback; }
  }

  function gmSet(key, value) {
    if (typeof GM_setValue !== 'function') throw new Error('userscript storage unavailable');
    GM_setValue(TASK_ID + ':' + key, value);
  }

  function recordAdAction(rule, category, amount) {
    var n = amount == null ? 1 : amount;
    if (Object.prototype.hasOwnProperty.call(counts, category)) counts[category] += n;
    recentActions = appendAdAction(recentActions, { at: new Date().toISOString(), rule: rule, category: category, count: n });
  }

  function readDiagnosticLogs() {
    try {
      var rows = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]');
      return Array.isArray(rows) ? rows.slice(-60) : [];
    } catch (error) { return []; }
  }

  function getAdState(requestId) {
    return {
      ok: true, requestId: requestId, host: host, policy: normalizePolicy(policy),
      hiddenCount: hiddenElements.size, playerAdState: playerAdState,
      recentActions: recentActions.slice(), counts: Object.assign({}, counts),
      logs: readDiagnosticLogs(), locale: i18n.getLocale(), localePreference: i18n.getPreference()
    };
  }

  function isVisibleElement(element) {
    if (!element || !element.isConnected || element.hidden || element.closest('[hidden], [aria-hidden="true"]')) return false;
    var style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.getClientRects().length > 0;
  }

  function restoreHiddenElements() {
    var restored = 0;
    hiddenElements.forEach(function (before, element) {
      if (ownsHiddenDisplay(element.style.getPropertyValue('display'), element.style.getPropertyPriority('display'))) {
        if (before.value) element.style.setProperty('display', before.value, before.priority);
        else element.style.removeProperty('display');
        restored++;
      }
    });
    hiddenElements.clear();
    if (restored) recordAdAction('page.restore', 'restore', restored);
    return restored;
  }

  function hideMatchedPageAds(root) {
    hiddenElements.forEach(function (before, element) {
      if (!element.isConnected) {
        if (ownsHiddenDisplay(element.style.getPropertyValue('display'), element.style.getPropertyPriority('display'))) {
          if (before.value) element.style.setProperty('display', before.value, before.priority);
          else element.style.removeProperty('display');
        }
        hiddenElements.delete(element);
      }
    });
    PAGE_RULES.forEach(function (rule) {
      var elements = Array.from(root.querySelectorAll(rule.selector));
      if (root.matches && root.matches(rule.selector)) elements.unshift(root);
      elements.forEach(function (element) {
        if (hiddenElements.has(element) || hiddenElements.size >= 1000 || !isVisibleElement(element)) return;
        // Do not hide a live player or its native skip controls with a page-ad rule.
        if (element.querySelector(SKIP_SELECTOR + ', #movie_player, ytd-player, video.html5-main-video')) return;
        hiddenElements.set(element, { value: element.style.getPropertyValue('display'), priority: element.style.getPropertyPriority('display') });
        element.style.setProperty('display', 'none', 'important');
        recordAdAction(rule.id, 'hide');
      });
    });
  }

  function inspectPlayerAds(root) {
    var candidates = Array.from(root.querySelectorAll('#movie_player, ytd-player'));
    root.querySelectorAll('video.html5-main-video, .video-ads.ytp-ad-module video').forEach(function (video) {
      var owner = video.closest('#movie_player, ytd-player') || video.closest('.video-ads.ytp-ad-module') || video.parentElement.parentElement;
      if (owner && candidates.indexOf(owner) < 0) candidates.push(owner);
    });
    // Nested player wrappers represent one player, not independent ad episodes.
    candidates = candidates.filter(function (candidate) {
      return !candidates.some(function (other) { return candidate !== other && other.contains(candidate); });
    });
    var state = 'idle';
    candidates.forEach(function (container) {
      if (!isVisibleElement(container)) return;
      var skipSignals = Array.from(container.querySelectorAll(SKIP_SELECTOR)).filter(isVisibleElement);
      var button = skipSignals.find(function (element) {
        return isVisibleElement(element) && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && window.getComputedStyle(element).pointerEvents !== 'none';
      });
      var overlay = Array.from(container.querySelectorAll(OVERLAY_SELECTOR)).find(isVisibleElement);
      var media = container.querySelector('.video-ads.ytp-ad-module video') || container.querySelector('video');
      var ranges = [];
      if (media) for (var index = 0; index < media.seekable.length; index++) ranges.push([media.seekable.start(index), media.seekable.end(index)]);
      var decision = decidePlayerAction({
        enabled: policy.playerAds, adSignal: !!(skipSignals.length || overlay), skipAvailable: !!button,
        hasVideo: !!media, adMediaOwned: !!(media && media.closest('.video-ads.ytp-ad-module')),
        paused: !media || media.paused, seeking: !!(media && media.seeking), readyState: media ? media.readyState : 0,
        duration: media ? media.duration : NaN, currentTime: media ? media.currentTime : NaN, ranges: ranges
      });
      if (decision.kind !== 'idle') state = decision.kind;
      if (decision.kind === 'skip') {
        var now = Date.now();
        if (now - (skipAttempts.get(button) || 0) < 1500) return;
        skipAttempts.set(button, now);
        button.click();
        recordAdAction(decision.rule, 'skip');
      } else if (decision.kind === 'seek') {
        var signature = media.currentSrc + '|' + media.duration;
        if (seekAttempts.get(media) === signature) return;
        // Recheck synchronous DOM ownership immediately before changing the timeline.
        if (!media.isConnected || !media.closest('.video-ads.ytp-ad-module') || !isVisibleElement(overlay)) return;
        media.currentTime = decision.target;
        seekAttempts.set(media, signature);
        recordAdAction(decision.rule, 'seek');
      } else if (decision.kind === 'idle' && media) {
        seekAttempts.delete(media);
      }
    });
    if (state === 'unmatched' && playerAdState !== state) recordAdAction('player.unmatched', 'unmatched');
    playerAdState = state;
  }

  function stopAdObservers() {
    if (adObserver) adObserver.disconnect();
    adObserver = null;
    watchedRoot = null;
    if (pendingScan != null) clearTimeout(pendingScan);
    pendingScan = null;
  }

  function scanAds() {
    pendingScan = null;
    if (navigating || (!policy.pageAds && !policy.playerAds)) return;
    var root = document.querySelector('ytd-app, ytm-app, ytmusic-app') || document.querySelector('main');
    if (!root) {
      stopAdObservers();
      restoreHiddenElements();
      if (policy.playerAds && playerAdState !== 'unmatched') recordAdAction('player.rootMissing', 'unmatched');
      playerAdState = policy.playerAds ? 'unmatched' : 'disabled';
      return;
    }
    if (root !== watchedRoot) {
      if (watchedRoot) restoreHiddenElements();
      stopAdObservers();
      watchedRoot = root;
      adObserver = new MutationObserver(scheduleAdScan);
      adObserver.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden', 'disabled', 'aria-disabled', 'style', 'src'] });
    }
    try {
      if (policy.pageAds) hideMatchedPageAds(root);
      if (policy.playerAds) inspectPlayerAds(root);
      else playerAdState = 'disabled';
    } catch (error) {
      playerAdState = 'unmatched';
      if (!recentActions.length || recentActions[recentActions.length - 1].rule !== 'scan.error') {
        recordAdAction('scan.error', 'errors');
        log('ad.scan.error', { message: String(error.message).slice(0, 200) });
      }
    }
  }

  function scheduleAdScan() {
    if (pendingScan == null && !navigating && (policy.pageAds || policy.playerAds)) pendingScan = setTimeout(scanAds, 120);
  }

  function saveAdPolicy(next) {
    var clean = normalizePolicy(next);
    gmSet('policy:' + host, clean);
    policy = clean;
    if (!policy.pageAds) restoreHiddenElements();
    if (!policy.playerAds) playerAdState = 'disabled';
    if (!policy.pageAds && !policy.playerAds) stopAdObservers();
    else scheduleAdScan();
    log('policy.saved', { host: host });
  }

  function handleAdCommand(data, message) {
    if (!message || message._from !== TASK_ID || message._request !== true || !Number.isSafeInteger(message._id) || message._id <= 0) return;
    var requestId = message._id;
    var invalid = validateAdCommand(data, host);
    log('channel.command', { action: invalid ? 'invalid' : data.action, requestId: requestId });
    if (invalid) {
      var rejected = { ok: false, requestId: requestId, code: 'INVALID_COMMAND', messageKey: invalid };
      channel.reply(message, rejected);
      channel.send('error', rejected);
      return;
    }
    try {
      var restoredCount = 0;
      if (data.action === 'setLanguage') { i18n.setLocale(data.locale); updateFabLabel(); }
      else if (data.action === 'setAdPolicy') saveAdPolicy(data);
      else if (data.action === 'disableAll' || data.action === 'restoreHidden') {
        // Recovery remains immediate even if persisting the off switch fails.
        policy = { pageAds: false, playerAds: data.action === 'restoreHidden' && policy.playerAds };
        restoredCount = restoreHiddenElements();
        if (!policy.playerAds) { playerAdState = 'disabled'; stopAdObservers(); }
        channel.send('progress', { requestId: requestId, stage: 'restored', restoredCount: restoredCount });
        gmSet('policy:' + host, policy);
        log('policy.restore', { host: host });
      } else if (data.action === 'clearAdLog') {
        recentActions = [];
        counts = { hide: 0, skip: 0, seek: 0, unmatched: 0, errors: 0 };
        window.localStorage.removeItem(LOG_KEY);
      }
      var result = getAdState(requestId);
      result.restoredCount = restoredCount;
      channel.reply(message, result);
      channel.send('done', result);
    } catch (error) {
      log('command.error', { action: data.action, message: String(error.message).slice(0, 200) });
      recordAdAction('command.error', 'errors');
      var failure = { ok: false, requestId: requestId, code: 'OPERATION_FAILED', messageKey: /Policy|disableAll|restoreHidden/.test(data.action) ? 'error.storage' : 'error.operation' };
      channel.reply(message, failure);
      channel.send('error', failure);
    }
  }

  function beginNavigation() {
    navigating = true;
    stopAdObservers();
    restoreHiddenElements();
    skipAttempts = new WeakMap();
    seekAttempts = new WeakMap();
    playerAdState = policy.playerAds ? 'idle' : 'disabled';
    log('page.navigation', { host: host });
  }

  function finishNavigation() {
    navigating = false;
    routeKey = window.location.href;
    scheduleAdScan();
  }

  function updateFabLabel() {
    if (!fabItem) return;
    var label = fabItem.querySelector('.xf-dot + span');
    if (label) label.textContent = i18n.t('fab.label');
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
      log('panel.reuse', { opened: true });
      return true;
    }
    var width = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
    var height = Math.min(780, Math.max(540, (window.screen.availHeight || 800) - 140));
    var left = Math.max(0, Math.round(((window.screen.availWidth || 1280) - width) / 2));
    var top = Math.max(0, Math.round(((window.screen.availHeight || 800) - height) / 2));
    var features = 'popup=yes,width=' + width + ',height=' + height + ',left=' + left + ',top=' + top +
      ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
    var panelWin = null;
    try { panelWin = window.open(PANEL_URL, '_blank', features); }
    catch (error) { log('panel.open.error', { message: String(error.message).slice(0, 200) }); }
    if (panelWin) {
      try { panelWin.moveTo(left, top); panelWin.resizeTo(width, height); } catch (e) { /* ignore */ }
      channel.setPanelWin(panelWin);
    }
    log('panel.open', { opened: !!panelWin, width: width, height: height, left: left, top: top });
    return !!panelWin;
  }

  function init() {
    if (isSelfHost(window.location.hostname)) return;
    if (!isSupportedHost(host) || window.self !== window.top) return;
    channel = createChannel(TASK_ID);
    window.addEventListener('error', function (event) {
      recordAdAction('window.error', 'errors');
      log('window.error', { message: event.message, file: event.filename, line: event.lineno, col: event.colno });
    });
    window.addEventListener('unhandledrejection', function (event) {
      recordAdAction('window.unhandledrejection', 'errors');
      var reason = event.reason;
      log('window.unhandledrejection', { message: String(reason && reason.message || reason) });
      event.preventDefault();
    });
    channel.on('command', handleAdCommand);
    policy = normalizePolicy(gmGet('policy:' + host, null));
    routeKey = window.location.href;
    window.addEventListener('yt-navigate-start', beginNavigation);
    window.addEventListener('yt-navigate-finish', finishNavigation);
    window.addEventListener('popstate', function () { beginNavigation(); finishNavigation(); });
    window.addEventListener('pagehide', function () { beginNavigation(); if (monitor) clearInterval(monitor); monitor = null; });
    function startMonitor() {
      if (monitor) return;
      monitor = setInterval(function () {
        if (routeKey !== window.location.href) { beginNavigation(); finishNavigation(); }
        scheduleAdScan();
      }, 1000);
    }
    window.addEventListener('pageshow', function () { finishNavigation(); startMonitor(); });
    startMonitor();
    scheduleAdScan();
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    log('init', { host: host });
  }

  init();
})();
