// ==UserScript==
// @name         YouTube SponsorBlock Controls
// @name:en      YouTube SponsorBlock Controls
// @name:zh-CN   YouTube SponsorBlock 片段控制
// @name:zh-TW   YouTube SponsorBlock 片段控制
// @namespace    https://xload.net/
// @version      2026.9.16.2
// @description  Control SponsorBlock skipping and replay skipped segments on YouTube.
// @description:en      Control SponsorBlock skipping and replay skipped segments on YouTube.
// @description:zh-CN   控制 YouTube 的 SponsorBlock 跳过行为，并重看片段。
// @description:zh-TW   控制 YouTube 的 SponsorBlock 跳過行為，並重看片段。
// @homepageURL  https://xload.net/scripts/userscripts/xload-d7e6bded/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://music.youtube.com/*
// @match        https://youtube.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      sponsor.ajay.app
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';



  var TASK_ID = 'xload-d7e6bded';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-d7e6bded/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-d7e6bded-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "YouTube SponsorBlock Controls",
    "short": "Control SponsorBlock skipping and replay skipped segments on YouTube.",
    "panel.documentTitle": "YouTube SponsorBlock Controls - Panel",
    "fab.label": "YouTube SponsorBlock Controls",
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
    "segment.mode": "Skipping mode",
    "segment.auto": "Automatic",
    "segment.manual": "Manual",
    "segment.off": "Off",
    "segment.categoryLabel": "Choose segment categories",
    "category.sponsor": "Sponsor",
    "category.intro": "Intro",
    "category.outro": "Outro",
    "category.selfpromo": "Self promotion",
    "category.interaction": "Interaction reminder",
    "segment.refresh": "Refresh segments",
    "segment.skip": "Skip selected segment",
    "segment.replay": "Replay last segment",
    "segment.empty": "No segments found",
    "segment.fetchError": "Could not load segments. Refresh to retry.",
    "segment.help": "Replay protects the entire merged segment until you leave it. Adjacent or overlapping segments are skipped together. Playback stays paused if you paused it.",
    "segment.notReady": "The active player has no valid duration or seekable range. Live streams cannot be skipped.",
    "segment.invalid": "Invalid settings or command",
    "segment.stale": "The video or settings changed. Refresh the list and try again.",
    "segment.disabled": "Skipping is off",
    "segment.failed": "The operation failed; check the original page and retry.",
    "status.idle": "Open a YouTube video to load segments",
    "status.fetching": "Loading segments…",
    "status.ready": "Loaded {count} segments",
    "status.off": "Off — requests and skipping are stopped",
    "status.error": "Could not load segments",
    "status.connecting": "Connecting to the original page…",
    "status.disconnected": "Original page disconnected; your unsaved choices remain here",
    "segment.list": "Available segments",
    "segment.video": "Video: {id}",
    "segment.protected": "Replay protection is active",
    "segment.unprotected": "No replay protection",
    "action.none": "No skip action yet",
    "action.skipped": "Last action: skipped a segment",
    "action.replayed": "Last action: replayed a segment",
    "logs.show": "View logs",
    "logs.copy": "Copy logs",
    "logs.copied": "Logs copied",
    "logs.failed": "Could not copy logs; select and copy the text below",
    "player.paused": "Paused",
    "player.playing": "Playing",
    "segment.savedOffline": "Choose settings here; keep the original YouTube page open to save or control playback."
  },
  "zh-CN": {
    "title": "YouTube SponsorBlock 片段控制",
    "short": "控制 YouTube 的 SponsorBlock 跳过行为，并重看片段。",
    "panel.documentTitle": "YouTube SponsorBlock 片段控制 - 功能面板",
    "fab.label": "YouTube SponsorBlock 片段控制",
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
    "segment.mode": "跳过模式",
    "segment.auto": "自动",
    "segment.manual": "手动",
    "segment.off": "关闭",
    "segment.categoryLabel": "选择片段类别",
    "category.sponsor": "赞助广告",
    "category.intro": "开场",
    "category.outro": "结尾",
    "category.selfpromo": "自我推广",
    "category.interaction": "互动提醒",
    "segment.refresh": "刷新片段",
    "segment.skip": "跳过选中片段",
    "segment.replay": "重看上次片段",
    "segment.empty": "未发现片段",
    "segment.fetchError": "无法加载片段，请刷新重试。",
    "segment.help": "重看保护覆盖整个合并区间，直到离开该区间。相邻或重叠片段会一起跳过；已暂停的播放会保持暂停。",
    "segment.notReady": "当前播放器没有有效时长或可跳转区间，直播无法跳过。",
    "segment.invalid": "配置或命令无效",
    "segment.stale": "视频或配置已变更，请刷新列表后重试。",
    "segment.disabled": "跳过功能已关闭",
    "segment.failed": "操作失败，请检查原页面后重试。",
    "status.idle": "打开 YouTube 视频以加载片段",
    "status.fetching": "正在加载片段…",
    "status.ready": "已加载 {count} 个片段",
    "status.off": "已关闭 — 请求和跳过均已停止",
    "status.error": "无法加载片段",
    "status.connecting": "正在连接原页面…",
    "status.disconnected": "原页面已断开，未保存的选择仍保留在此",
    "segment.list": "可用片段",
    "segment.video": "视频：{id}",
    "segment.protected": "重看保护生效中",
    "segment.unprotected": "未启用重看保护",
    "action.none": "尚未跳过片段",
    "action.skipped": "最近操作：跳过片段",
    "action.replayed": "最近操作：重看片段",
    "logs.show": "查看日志",
    "logs.copy": "复制日志",
    "logs.copied": "日志已复制",
    "logs.failed": "无法复制日志，请选中下方文本手动复制",
    "player.paused": "已暂停",
    "player.playing": "播放中",
    "segment.savedOffline": "可在此编辑配置；保存或控制播放时请保持原 YouTube 页面打开。"
  },
  "zh-TW": {
    "title": "YouTube SponsorBlock 片段控制",
    "short": "控制 YouTube 的 SponsorBlock 跳過行為，並重看片段。",
    "panel.documentTitle": "YouTube SponsorBlock 片段控制 - 功能面板",
    "fab.label": "YouTube SponsorBlock 片段控制",
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
    "segment.mode": "跳過模式",
    "segment.auto": "自動",
    "segment.manual": "手動",
    "segment.off": "關閉",
    "segment.categoryLabel": "選擇片段類別",
    "category.sponsor": "贊助廣告",
    "category.intro": "開場",
    "category.outro": "結尾",
    "category.selfpromo": "自我推廣",
    "category.interaction": "互動提醒",
    "segment.refresh": "重新整理片段",
    "segment.skip": "跳過選取片段",
    "segment.replay": "重看上次片段",
    "segment.empty": "未發現片段",
    "segment.fetchError": "無法載入片段，請重新整理再試。",
    "segment.help": "重看保護涵蓋整個合併區間，直到離開該區間。相鄰或重疊片段會一起跳過；已暫停的播放會保持暫停。",
    "segment.notReady": "目前播放器沒有有效時長或可跳轉區間，直播無法跳過。",
    "segment.invalid": "設定或命令無效",
    "segment.stale": "影片或設定已變更，請重新整理清單後再試。",
    "segment.disabled": "跳過功能已關閉",
    "segment.failed": "操作失敗，請檢查原頁面後再試。",
    "status.idle": "開啟 YouTube 影片以載入片段",
    "status.fetching": "正在載入片段…",
    "status.ready": "已載入 {count} 個片段",
    "status.off": "已關閉 — 請求和跳過均已停止",
    "status.error": "無法載入片段",
    "status.connecting": "正在連接原頁面…",
    "status.disconnected": "原頁面已中斷，未儲存的選擇仍保留在此",
    "segment.list": "可用片段",
    "segment.video": "影片：{id}",
    "segment.protected": "重看保護生效中",
    "segment.unprotected": "未啟用重看保護",
    "action.none": "尚未跳過片段",
    "action.skipped": "最近操作：跳過片段",
    "action.replayed": "最近操作：重看片段",
    "logs.show": "檢視日誌",
    "logs.copy": "複製日誌",
    "logs.copied": "日誌已複製",
    "logs.failed": "無法複製日誌，請選取下方文字手動複製",
    "player.paused": "已暫停",
    "player.playing": "播放中",
    "segment.savedOffline": "可在此編輯設定；儲存或控制播放時請保持原 YouTube 頁面開啟。"
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
  var CATEGORY_KEYS = ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction'];
  var DEFAULT_POLICY = { mode: 'manual', categories: CATEGORY_KEYS.slice(), excludeSites: ['xload.net', 'u2222223.github.io'] };

  function isSelfHost(host) {
    var value = String(host || '').toLowerCase();
    return ['xload.net', 'u2222223.github.io'].some(function (item) { return value === item || value.endsWith('.' + item); });
  }

  function readVideoId(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== 'https:' || !/^(www\.|m\.|music\.)?youtube\.com$/.test(url.hostname)) return '';
      var id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/shorts\/([^/]+)/.exec(url.pathname)?.[1];
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : '';
    } catch (e) { return ''; }
  }

  function normalizePolicy(value) {
    if (!value || !['manual', 'auto', 'off'].includes(value.mode) || !Array.isArray(value.categories) || value.categories.some(function (key) { return !CATEGORY_KEYS.includes(key); })) return null;
    return { mode: value.mode, categories: CATEGORY_KEYS.filter(function (key) { return value.categories.includes(key); }), excludeSites: DEFAULT_POLICY.excludeSites.slice() };
  }

  function normalizeSegments(rows, duration, categories) {
    if (!Array.isArray(rows) || !Number.isFinite(duration) || duration <= 0) return [];
    var used = new Set();
    return rows.slice(0, 2000).flatMap(function (row, index) {
      if (!row || !Array.isArray(row.segment) || !categories.includes(row.category) || (row.actionType && row.actionType !== 'skip')) return [];
      var start = row.segment[0], end = row.segment[1];
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || start >= duration) return [];
      end = Math.min(end, duration);
      var id = typeof row.UUID === 'string' && /^[\w-]{1,128}$/.test(row.UUID) ? row.UUID : row.category + ':' + start + ':' + end + ':' + index;
      if (used.has(id)) return [];
      used.add(id);
      return [{ id: id, start: start, end: end, category: row.category }];
    }).sort(function (a, b) { return a.start - b.start || a.end - b.end; });
  }

  function mergeSegments(rows) {
    var merged = [];
    rows.forEach(function (row) {
      var last = merged[merged.length - 1];
      if (last && row.start <= last.end) { last.end = Math.max(last.end, row.end); last.ids.push(row.id); }
      else merged.push({ start: row.start, end: row.end, ids: [row.id] });
    });
    return merged.map(function (row) { row.key = row.ids.join('|'); return row; });
  }

  function containsTime(range, time) { return !!range && Number.isFinite(time) && time >= range.start && time < range.end; }

  function automaticTarget(ranges, state) {
    if (state.mode !== 'auto' || state.paused || state.seeking || !state.active || !Number.isFinite(state.duration) || state.duration <= 0 || containsTime(state.protectedRange, state.time)) return null;
    return ranges.find(function (range) { return containsTime(range, state.time) && range.end <= state.duration && !state.processed.includes(range.key); }) || null;
  }

  function contextMatches(command, id, revision) {
    return !!id && command.videoId === id && command.contextRevision === revision;
  }

  function acceptsResponse(serial, currentSerial, id, currentId, mode) {
    return serial === currentSerial && id === currentId && mode !== 'off';
  }

  function protectionAfterSeek(last, current, time) {
    if (containsTime(last, time)) return last;
    return containsTime(current, time) ? current : null;
  }

  function shouldRetryRequest(code, attempt) {
    return attempt === 0 && /^(network|timeout|http-5\d\d)$/.test(code);
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
    catch (e) { log('panel.open.error', { message: String(e.message), width: width, height: height, left: left, top: top }); return false; }
    if (panelWin) {
      try { panelWin.moveTo(left, top); panelWin.resizeTo(width, height); } catch (e) { /* ignore */ }
      channel.setPanelWin(panelWin);
    }
    log('panel.open', { opened: !!panelWin, width: width, height: height, left: left, top: top });
    return !!panelWin;
  }

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':' + key, fallback) : fallback; } catch (e) { return fallback; }
  }
  function gmSet(key, value) {
    if (typeof GM_setValue !== 'function') throw new Error('storage');
    GM_setValue(TASK_ID + ':' + key, value);
  }

  var policy = normalizePolicy(gmGet('policy', DEFAULT_POLICY)) || normalizePolicy(DEFAULT_POLICY);
  var videoId = '', contextRevision = 0, player = null, rawSegments = [], segments = [], ranges = [];
  var processed = new Set(), protectedRange = null, lastSkipped = null, ownSeek = null;
  var cache = new Map(), requestSerial = 0, pendingRequest = null, fetchState = 'idle', failureKey = '', lastAction = 'action.none', lastBroadcast = 0;

  function httpGet(url) {
    if (!isSafeUrl(url) || new URL(url).origin !== 'https://sponsor.ajay.app') throw new Error('url');
    var request, rejectRequest, settled = false;
    var promise = new Promise(function (resolve, reject) {
      rejectRequest = reject;
      function finish(error, result) {
        if (settled) return;
        settled = true;
        if (error) reject(error); else resolve(result);
      }
      request = GM_xmlhttpRequest({ method: 'GET', url: url, anonymous: true, timeout: 8000,
        onload: function (response) {
          if (response.status === 404) { finish(null, []); return; }
          if (response.status !== 200) { finish(new Error('http-' + response.status)); return; }
          try {
            var result = JSON.parse(response.responseText);
            if (!Array.isArray(result)) throw new Error('schema');
            finish(null, result);
          } catch (e) { finish(new Error('schema')); }
        },
        onerror: function () { finish(new Error('network')); },
        ontimeout: function () { finish(new Error('timeout')); },
        onabort: function () { finish(new Error('cancelled')); }
      });
    });
    return { promise: promise, abort: function () { if (!settled) { settled = true; rejectRequest(new Error('cancelled')); if (request) request.abort(); } } };
  }

  function cancelRequest() {
    requestSerial += 1;
    if (pendingRequest) pendingRequest.abort();
    pendingRequest = null;
  }

  function rebuildSegments() {
    segments = normalizeSegments(rawSegments, player && player.duration, policy.categories);
    ranges = mergeSegments(segments);
  }

  function snapshot() {
    rebuildSegments();
    var ready = !!player && Number.isFinite(player.duration) && player.duration > 0;
    return { ok: true, videoId: videoId, contextRevision: contextRevision, segments: segments,
      policy: policy, fetchState: fetchState, messageKey: failureKey || (videoId && policy.mode !== 'off' && !ready ? 'segment.notReady' : ''), lastAction: lastAction,
      playbackState: { ready: ready, paused: !player || player.paused,
        position: player && Number.isFinite(player.currentTime) ? player.currentTime : 0 },
      replayProtected: !!protectedRange, canReplay: !!lastSkipped && policy.mode !== 'off',
      locale: i18n.getLocale(), localePreference: i18n.getPreference() };
  }

  function broadcastState(force) {
    if (!channel || (!force && Date.now() - lastBroadcast < 1000)) return;
    var panel = channel.getPanelWin();
    if (!panel || panel.closed) return;
    lastBroadcast = Date.now();
    channel.send('done', snapshot());
  }

  async function loadSegments(force) {
    cancelRequest();
    var serial = requestSerial, id = videoId;
    failureKey = '';
    if (policy.mode === 'off' || !id) { fetchState = policy.mode === 'off' ? 'off' : 'idle'; broadcastState(true); return; }
    var saved = cache.get(id);
    if (!force && saved && Date.now() - saved.at < 300000) {
      rawSegments = saved.rows; fetchState = 'ready'; broadcastState(true); return;
    }
    fetchState = 'fetching';
    channel.send('progress', { stage: 'fetching' });
    var url = new URL('https://sponsor.ajay.app/api/skipSegments');
    url.searchParams.set('videoID', id);
    url.searchParams.set('categories', JSON.stringify(CATEGORY_KEYS));
    for (var attempt = 0; attempt < 2; attempt += 1) {
      try {
        pendingRequest = httpGet(url.href);
        var rows = await pendingRequest.promise;
        if (!acceptsResponse(serial, requestSerial, id, videoId, policy.mode)) return;
        pendingRequest = null;
        rawSegments = rows; fetchState = 'ready';
        cache.delete(id); cache.set(id, { at: Date.now(), rows: rows });
        if (cache.size > 30) cache.delete(cache.keys().next().value);
        log('segments.loaded', { count: rows.length, attempt: attempt + 1 });
        broadcastState(true); return;
      } catch (error) {
        if (serial !== requestSerial || id !== videoId || error.message === 'cancelled') return;
        if (shouldRetryRequest(error.message, attempt)) continue;
        pendingRequest = null; rawSegments = []; fetchState = 'error'; failureKey = 'segment.fetchError';
        log('segments.error', { code: error.message, attempt: attempt + 1 });
        channel.send('error', { code: error.message, messageKey: failureKey });
        broadcastState(true); return;
      }
    }
  }

  function selectPlayer() {
    var candidates = Array.from(document.querySelectorAll('#movie_player video, ytd-player video, video.html5-main-video, video'));
    var visible = candidates.filter(function (element) { var rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight; });
    return visible.find(function (element) { return !element.paused; }) || visible[0] || (location.hostname === 'music.youtube.com' ? candidates.find(function (element) { return !element.paused; }) || candidates[0] : null) || null;
  }

  function isPlaybackActive() {
    return !!player && player.isConnected && player === selectPlayer() && !player.closest('.ad-showing, .ad-interrupting');
  }

  function seekRange(range, replay) {
    if (!player || !isPlaybackActive() || !Number.isFinite(player.duration) || player.duration <= 0 || range.end > player.duration || !player.seekable || !player.seekable.length) throw new Error('segment.notReady');
    var target = replay ? range.start : range.end;
    var seekable = false;
    for (var i = 0; i < player.seekable.length; i += 1) if (target >= player.seekable.start(i) && target <= player.seekable.end(i)) seekable = true;
    if (!seekable) throw new Error('segment.notReady');
    ownSeek = { target: target, expires: Date.now() + 2000 };
    try { player.currentTime = target; }
    catch (e) { ownSeek = null; throw new Error('segment.notReady'); }
    if (replay) protectedRange = range;
    else { lastSkipped = range; processed.add(range.key); protectedRange = null; }
    lastAction = replay ? 'action.replayed' : 'action.skipped';
    log('playback.action', { action: replay ? 'replay' : 'skip' });
    broadcastState(true);
  }

  function onSeeking() {
    if (!player) return;
    if (ownSeek && Date.now() < ownSeek.expires && Math.abs(player.currentTime - ownSeek.target) < 0.3) return;
    ownSeek = null;
    protectedRange = protectionAfterSeek(lastSkipped, protectedRange, player.currentTime);
    broadcastState(true);
  }

  function playbackTick() {
    if (!player || readVideoId(location.href) !== videoId) return;
    rebuildSegments();
    if (protectedRange && !player.seeking && !containsTime(protectedRange, player.currentTime)) protectedRange = null;
    var target = automaticTarget(ranges, { mode: policy.mode, paused: player.paused, seeking: player.seeking, active: isPlaybackActive(), duration: player.duration, time: player.currentTime, protectedRange: protectedRange, processed: Array.from(processed) });
    if (target) { try { seekRange(target, false); } catch (e) { failureKey = 'segment.notReady'; } }
    broadcastState(false);
  }

  function syncPage(skipPlayback) {
    var id = readVideoId(location.href), current = selectPlayer();
    if (current !== player) {
      if (player) { player.removeEventListener('timeupdate', playbackTick); player.removeEventListener('seeking', onSeeking); }
      player = current;
      if (player) { player.addEventListener('timeupdate', playbackTick); player.addEventListener('seeking', onSeeking); }
    }
    if (id !== videoId) {
      cancelRequest(); videoId = id; contextRevision += 1;
      rawSegments = []; segments = []; ranges = []; processed.clear(); protectedRange = null; lastSkipped = null; ownSeek = null; lastAction = 'action.none';
      log('page.changed', { hasVideo: !!id, revision: contextRevision });
      loadSegments(false);
    }
    if (skipPlayback !== true) playbackTick();
  }

  async function handleCommand(data, message) {
    if (!data || typeof data.action !== 'string' || !message || !message._request || !['string', 'number'].includes(typeof message._id)) return;
    log('channel.command', { action: data.action });
    try {
      syncPage(true);
      if (data.action === 'setLanguage') { i18n.setLocale(data.locale); updateFabLabel(); }
      else if (data.action === 'setPolicy') {
        var next = normalizePolicy(data);
        if (!next) throw new Error('segment.invalid');
        gmSet('policy', next); policy = next; contextRevision += 1;
        processed.clear(); log('policy.saved', { mode: policy.mode, categories: policy.categories });
        await loadSegments(false);
      } else if (data.action === 'getSegments') { await loadSegments(true); }
      else if (data.action === 'skipSegment' || data.action === 'replayLast') {
        if (!contextMatches(data, videoId, contextRevision)) throw new Error('segment.stale');
        if (policy.mode === 'off') throw new Error('segment.disabled');
        rebuildSegments();
        var range = data.action === 'replayLast' ? lastSkipped : ranges.find(function (item) { return item.ids.includes(data.segmentId); });
        if (!range) throw new Error('segment.stale');
        seekRange(range, data.action === 'replayLast');
      } else if (data.action === 'getLogs') {
        var logs = [];
        try { logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { /* empty log */ }
        channel.reply(message, { ok: true, logs: logs }); return;
      } else if (data.action !== 'getState') throw new Error('segment.invalid');
      channel.reply(message, Object.assign(snapshot(), { requestId: message._id }));
      broadcastState(true);
    } catch (error) {
      var key = I18N_DICT.en[error.message] ? error.message : 'segment.failed';
      log('command.error', { action: data.action, messageKey: key });
      channel.reply(message, { ok: false, code: key, messageKey: key, requestId: message._id });
    }
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
    channel.on('command', handleCommand);
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    log('init', { host: window.location.hostname });
    syncPage();
    document.addEventListener('yt-navigate-finish', syncPage);
    window.addEventListener('popstate', syncPage);
    window.setInterval(syncPage, 750);
  }

  init();
})();
