// ==UserScript==
// @name         Discord bulk delete messages with preview and stop controls
// @name:en      Discord bulk delete messages with preview and stop controls
// @name:zh-CN   Discord 批量删除消息：预览范围与可停止清理
// @name:zh-TW   Discord 批次刪除訊息：預覽範圍與可停止清理
// @namespace    https://xload.net/
// @version      2026.9.16.1
// @description  Preview and delete messages in Discord channels or DMs with adjustable delays, progress counts, and a stop control.
// @description:en      Preview and delete messages in Discord channels or DMs with adjustable delays, progress counts, and a stop control.
// @description:zh-CN   预览并删除 Discord 频道或私信中的消息，支持调整删除间隔、查看进度计数和随时停止后续请求。
// @description:zh-TW   預覽並刪除 Discord 頻道或私訊中的訊息，支援調整刪除間隔、查看進度計數和隨時停止後續請求。
// @homepageURL  https://xload.net/scripts/userscripts/xload-d401bffa/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        https://discord.com/*
// @match        https://canary.discord.com/*
// @match        https://ptb.discord.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-d401bffa';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-d401bffa/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-d401bffa-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "Discord bulk delete messages with preview and stop controls",
    "short": "Preview and delete messages in Discord channels or DMs with adjustable delays, progress counts, and a stop control.",
    "panel.documentTitle": "Discord bulk delete messages with preview and stop controls - Panel",
    "fab.label": "Discord bulk delete messages with preview and stop controls",
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
    "error.PARAMS": "Check scope IDs and the 1000–60000 ms delay.",
    "error.AUTH": "Sign in again to continue. Account credentials could not be read or were rejected.",
    "error.PERMISSION": "Discord denied access or deletion permission. No further deletions were requested.",
    "error.ROUTE": "Open a Discord channel or DM, or enter a scope manually.",
    "error.RESPONSE": "Discord returned an unexpected search response. Preview was discarded.",
    "error.NO_PROGRESS": "Search pagination made no progress. No partial preview can be deleted; try a new preview.",
    "error.INDEX_TIMEOUT": "Search indexing did not finish after five waits. Try a new preview later.",
    "error.RATE_LIMIT": "Discord kept rate-limiting the operation. Stop or continue later.",
    "error.NETWORK": "Network/server request failed after three retries. A timed-out deletion may already have completed.",
    "error.MISSING": "The search scope was not found or is inaccessible.",
    "error.HTTP": "Discord rejected the request. Check the diagnostic log.",
    "error.BUSY": "A job is already running. Stop it before starting another.",
    "error.STALE": "The page, account or preview changed. Identify the scope and preview again.",
    "error.STOPPED": "Stopped"
  },
  "zh-CN": {
    "title": "Discord 批量删除消息：预览范围与可停止清理",
    "short": "预览并删除 Discord 频道或私信中的消息，支持调整删除间隔、查看进度计数和随时停止后续请求。",
    "panel.documentTitle": "Discord 批量删除消息：预览范围与可停止清理 - 功能面板",
    "fab.label": "Discord 批量删除消息：预览范围与可停止清理",
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
    "error.PARAMS": "请检查范围标识及 1000–60000 毫秒间隔。",
    "error.AUTH": "请重新登录后继续，账号凭据无法读取或被拒绝。",
    "error.PERMISSION": "Discord 拒绝访问或删除权限，已停止后续删除。",
    "error.ROUTE": "请打开 Discord 频道或私信，也可手填范围。",
    "error.RESPONSE": "Discord 搜索结果格式异常，预览已作废。",
    "error.NO_PROGRESS": "搜索分页无进展，不允许删除不完整预览，请重新预览。",
    "error.INDEX_TIMEOUT": "搜索索引在五次等待后仍未就绪，请稍后重新预览。",
    "error.RATE_LIMIT": "Discord 持续限流，请停止或稍后继续。",
    "error.NETWORK": "网络或服务器请求在三次重试后失败，超时的删除可能已经完成。",
    "error.MISSING": "搜索范围不存在或无法访问。",
    "error.HTTP": "Discord 拒绝请求，请查看诊断日志。",
    "error.BUSY": "已有任务运行，请先停止。",
    "error.STALE": "页面、账号或预览已变化，请识别范围并重新预览。",
    "error.STOPPED": "已停止"
  },
  "zh-TW": {
    "title": "Discord 批次刪除訊息：預覽範圍與可停止清理",
    "short": "預覽並刪除 Discord 頻道或私訊中的訊息，支援調整刪除間隔、查看進度計數和隨時停止後續請求。",
    "panel.documentTitle": "Discord 批次刪除訊息：預覽範圍與可停止清理 - 功能面板",
    "fab.label": "Discord 批次刪除訊息：預覽範圍與可停止清理",
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
    "error.PARAMS": "請檢查範圍識別碼及 1000–60000 毫秒間隔。",
    "error.AUTH": "請重新登入後繼續，帳號憑證無法讀取或遭拒。",
    "error.PERMISSION": "Discord 拒絕存取或刪除權限，已停止後續刪除。",
    "error.ROUTE": "請開啟 Discord 頻道或私訊，也可手填範圍。",
    "error.RESPONSE": "Discord 搜尋結果格式異常，預覽已作廢。",
    "error.NO_PROGRESS": "搜尋分頁無進展，不允許刪除不完整預覽，請重新預覽。",
    "error.INDEX_TIMEOUT": "搜尋索引在五次等待後仍未就緒，請稍後重新預覽。",
    "error.RATE_LIMIT": "Discord 持續限制速率，請停止或稍後繼續。",
    "error.NETWORK": "網路或伺服器請求在三次重試後失敗，逾時的刪除可能已經完成。",
    "error.MISSING": "搜尋範圍不存在或無法存取。",
    "error.HTTP": "Discord 拒絕請求，請檢視診斷記錄。",
    "error.BUSY": "已有工作執行中，請先停止。",
    "error.STALE": "頁面、帳號或預覽已變更，請辨識範圍並重新預覽。",
    "error.STOPPED": "已停止"
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
  function isSelfHost(host) {
    return /(^|\.)(xload\.net|u2222223\.github\.io)$/i.test(String(host || ''));
  }
  var DEFAULTS = { delayMs: 1500, excludeSites: ['xload.net', 'u2222223.github.io'] };

  function validId(value) {
    return typeof value === 'string' && /^[1-9]\d{16,19}$/.test(value) && BigInt(value) <= 18446744073709551615n;
  }

  function normalizeScope(input) {
    var s = input || {};
    var result = { scopeType: s.scopeType, authorId: String(s.authorId || '').trim(), guildId: String(s.guildId || '').trim(), channelId: String(s.channelId || '').trim() };
    if (!['channel', 'dm', 'server'].includes(result.scopeType) || !validId(result.authorId)) throw new Error('PARAMS');
    if (result.scopeType === 'dm') {
      if (!validId(result.channelId) || (result.guildId && result.guildId !== '@me')) throw new Error('PARAMS');
      result.guildId = '@me';
    } else {
      if (!validId(result.guildId)) throw new Error('PARAMS');
      if (result.scopeType === 'channel' && !validId(result.channelId)) throw new Error('PARAMS');
      if (result.scopeType === 'server') result.channelId = '';
    }
    return result;
  }

  function scopeSignature(scope) {
    var s = normalizeScope(scope);
    return [s.scopeType, s.authorId, s.guildId, s.channelId].join('|');
  }

  function validateDelay(value) {
    var n = Number(value);
    if (!Number.isInteger(n) || n < 1000 || n > 60000) throw new Error('PARAMS');
    return n;
  }

  function routeScope(pathname, accountId) {
    var match = /^\/channels\/(@me|\d+)\/(\d+)(?:\/|$)/.exec(pathname);
    if (!match || !validId(match[2])) throw new Error('ROUTE');
    return normalizeScope({ scopeType: match[1] === '@me' ? 'dm' : 'channel', authorId: accountId, guildId: match[1], channelId: match[2] });
  }

  function searchPath(scope, beforeId) {
    var s = normalizeScope(scope);
    if (!validId(beforeId)) throw new Error('PARAMS');
    var prefix = s.scopeType === 'dm' ? 'channels/' + s.channelId : 'guilds/' + s.guildId;
    var query = 'author_id=' + s.authorId + '&sort_by=timestamp&sort_order=desc&offset=0&max_id=' + beforeId;
    if (s.scopeType === 'channel') query += '&channel_id=' + s.channelId;
    return '/api/v9/' + prefix + '/messages/search?' + query;
  }

  function extractHits(response, scope) {
    if (!response || !Array.isArray(response.messages)) throw new Error('RESPONSE');
    var seen = new Set();
    var rows = [];
    response.messages.forEach(function (group) {
      if (!Array.isArray(group)) throw new Error('RESPONSE');
      group.forEach(function (m) {
        if (!m || m.hit !== true) return;
        if (!validId(m.id) || !validId(m.channel_id) || !m.author || String(m.author.id) !== scope.authorId) throw new Error('RESPONSE');
        if (scope.scopeType !== 'server' && m.channel_id !== scope.channelId) throw new Error('RESPONSE');
        if (seen.has(m.id)) return;
        seen.add(m.id);
        rows.push({ id: m.id, channelId: m.channel_id, timestamp: Number.isFinite(Date.parse(m.timestamp)) ? new Date(m.timestamp).toISOString() : '', eligible: m.type === 0 || (Number.isInteger(m.type) && m.type >= 6 && m.type <= 21) });
      });
    });
    return rows;
  }

  function pageCursor(rows, previous) {
    if (!rows.length) return null;
    var minimum = rows.reduce(function (smallest, row) { return BigInt(row.id) < smallest ? BigInt(row.id) : smallest; }, BigInt(previous));
    if (minimum >= BigInt(previous)) throw new Error('NO_PROGRESS');
    return minimum.toString();
  }

  function retryWait(body, header, fallback) {
    var seconds = Number(body && body.retry_after);
    var headerSeconds = Number(header);
    var milliseconds = Math.max(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0, Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds * 1000 : 0, 1000);
    return Math.ceil(milliseconds === 1000 ? Math.max(milliseconds, fallback || 1000) : milliseconds);
  }

  function responsePolicy(status, retries, indexing) {
    if (status === 401) return 'AUTH';
    if (status === 403) return 'PERMISSION';
    if (status === 400) return 'PARAMS';
    if (status === 429) return 'RATE';
    if (status === 202) return indexing < 5 ? 'INDEXING' : 'INDEX_TIMEOUT';
    if (status === 0 || status >= 500) return retries < 3 ? 'RETRY' : 'NETWORK';
    if (status === 404) return 'MISSING';
    return status >= 200 && status < 300 ? 'OK' : 'HTTP';
  }

  function mayStart(preview, request, binding, busy) {
    if (busy) throw new Error('BUSY');
    if (!preview || !request || request.confirmed !== true || request.previewId !== preview.id || preview.binding !== binding) throw new Error('STALE');
    return true;
  }

  function completeAttempt(counts, outcome) {
    return { deleted: counts.deleted + (outcome === 'deleted' ? 1 : 0), failed: counts.failed + (outcome === 'failed' ? 1 : 0), missing: counts.missing + (outcome === 'missing' ? 1 : 0) };
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
  var preview = null;
  var activeJob = null;
  var lastResult = null;
  var pageEpoch = 0;
  var observedPath = location.pathname;

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':' + key, fallback) : fallback; } catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try { if (typeof GM_setValue === 'function') GM_setValue(TASK_ID + ':' + key, value); } catch (e) { /* memory still works */ }
  }

  var delayPreference = DEFAULTS.delayMs;

  function readSession() {
    var accountId = '';
    var token = '';
    var probe = document.createElement('iframe');
    probe.hidden = true;
    try {
      document.documentElement.appendChild(probe);
      var storage = probe.contentWindow.localStorage;
      accountId = JSON.parse(storage.getItem('user_id_cache') || 'null') || '';
      token = JSON.parse(storage.getItem('token') || 'null') || '';
    } catch (e) { /* optional store fallback below */ }
    finally { probe.remove(); }
    if (!token) {
      try {
        var page = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
        var chunks = page.webpackChunkdiscord_app;
        var loader;
        if (chunks && typeof chunks.push === 'function') {
          var chunkName = 'xload_' + crypto.randomUUID();
          var capture = [ [chunkName], {}, function (runtime) { loader = runtime; } ];
          chunks.push(capture);
          if (chunks[chunks.length - 1] === capture) chunks.pop();
        }
        if (loader && loader.c) {
          Object.keys(loader.c).some(function (key) {
            var exported = loader.c[key] && loader.c[key].exports;
            var store = exported && exported.default;
            if (store && typeof store.getToken === 'function') { token = store.getToken(); return !!token; }
            return false;
          });
        }
      } catch (e) { /* credentials are never logged */ }
    }
    if (typeof token !== 'string' || !token || !validId(String(accountId))) throw new Error('AUTH');
    return { accountId: String(accountId), token: token };
  }

  function trackPage() {
    if (observedPath !== location.pathname) {
      observedPath = location.pathname;
      pageEpoch++;
      preview = null;
      log('page.change', { epoch: pageEpoch });
      if (activeJob) cancelJob('STALE');
    }
  }

  function sessionBinding(session) {
    trackPage();
    return [location.origin, location.pathname, pageEpoch, session.accountId].join('|');
  }

  function assertJob(job) {
    if (job.cancelled) throw new Error(job.cancelled);
    var session = readSession();
    if (sessionBinding(session) !== job.binding || session.token !== job.auth.token) throw new Error('STALE');
    if (job.cancelled) throw new Error(job.cancelled);
  }

  function publicJob(job) {
    return { jobId: job.id, phase: job.phase, found: job.rows.length, deleted: job.counts.deleted, failed: job.counts.failed, missing: job.counts.missing, waitingMs: job.waitingMs || 0, code: job.code || '', recoverable: job.phase === 'paused' };
  }

  function emitJob(job, type) {
    channel.send(type || 'progress', publicJob(job));
  }

  async function waitJob(job, milliseconds, phase) {
    job.phase = phase;
    var end = Date.now() + milliseconds;
    job.waitingMs = milliseconds;
    emitJob(job);
    while (Date.now() < end) {
      assertJob(job);
      await new Promise(function (resolve) {
        var timer = setTimeout(function () { job.wake = null; resolve(); }, Math.min(1000, end - Date.now()));
        job.wake = function () { clearTimeout(timer); job.wake = null; resolve(); };
      });
    }
    job.waitingMs = 0;
    assertJob(job);
  }

  async function httpGet(job, path, method) {
    if (!/^\/api\/v9\/(?:channels|guilds)\/[1-9]\d{16,19}\/messages(?:\/|$)/.test(path)) throw new Error('PARAMS');
    var retries = 0;
    var indexing = 0;
    var throttles = 0;
    for (;;) {
      assertJob(job);
      var response = null;
      var body = null;
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 30000);
      try {
        response = await fetch(location.origin + path, { method: method || 'GET', headers: { Authorization: job.auth.token }, credentials: 'omit', redirect: 'error', signal: controller.signal });
        if (response.status !== 204) { try { body = await response.json(); } catch (e) { /* mapped below */ } }
      } catch (e) { response = null; }
      finally { clearTimeout(timer); }
      var status = response ? response.status : 0;
      var policy = responsePolicy(status, retries, indexing);
      log('request.result', { method: method || 'GET', status: status, retry: retries });
      // A completed DELETE is counted even if Stop was pressed while it was in flight.
      if (policy === 'OK') return { status: status, body: body };
      if (policy === 'MISSING' && method === 'DELETE') return { status: status, body: null };
      if (policy === 'RETRY') { retries++; await waitJob(job, 1000 * Math.pow(2, retries - 1), 'retry'); continue; }
      if (policy === 'RATE' || policy === 'INDEXING') {
        if (policy === 'RATE' && ++throttles > 10) throw new Error('RATE_LIMIT');
        if (policy === 'INDEXING') indexing++;
        await waitJob(job, retryWait(body, response.headers.get('Retry-After'), 2000), policy === 'RATE' ? 'rate' : 'indexing');
        continue;
      }
      throw new Error(policy);
    }
  }

  function newJob(kind, scope, auth) {
    return { id: crypto.randomUUID(), kind: kind, scope: scope, auth: auth, binding: sessionBinding(auth), phase: kind, rows: [], counts: { deleted: 0, failed: 0, missing: 0 }, cursor: 0, cancelled: '', waitingMs: 0, code: '' };
  }

  function finishJob(job, code) {
    job.code = code || job.cancelled || 'COMPLETE';
    job.phase = job.code === 'STOPPED' ? 'stopped' : job.code === 'COMPLETE' ? 'complete' : 'error';
    job.waitingMs = 0;
    lastResult = publicJob(job);
    if (activeJob === job) activeJob = null;
    job.auth = null;
    job.rows = [];
    channel.send('done', lastResult);
    log('job.done', { phase: lastResult.phase, code: lastResult.code, found: lastResult.found, deleted: lastResult.deleted, failed: lastResult.failed });
  }

  function previewSummary() {
    if (!preview) return null;
    return { previewId: preview.id, found: preview.rows.length, scope: preview.scope, samples: preview.rows.slice(0, 20).map(function (row, index) { return { number: index + 1, timestamp: row.timestamp }; }) };
  }

  async function collectPreview(job) {
    var before = ((BigInt(Date.now()) - 1420070400000n) << 22n).toString();
    var seen = new Set();
    try {
      for (;;) {
        job.phase = 'scan';
        var response = await httpGet(job, searchPath(job.scope, before), 'GET');
        assertJob(job);
        var hits = extractHits(response.body, job.scope);
        var next = pageCursor(hits, before);
        hits.forEach(function (row) {
          if (row.eligible && !seen.has(row.id)) { seen.add(row.id); job.rows.push(row); }
        });
        emitJob(job);
        if (!hits.length) {
          // An empty page claiming more matches is not a complete preview.
          if (Number(response.body.total_results) > 0) throw new Error('NO_PROGRESS');
          break;
        }
        before = next;
        await waitJob(job, 1500, 'scan');
      }
      assertJob(job);
      preview = { id: crypto.randomUUID(), binding: job.binding, token: job.auth.token, scope: job.scope, rows: job.rows.slice() };
      channel.send('preview', previewSummary());
      finishJob(job);
    } catch (error) { finishJob(job, job.cancelled || error.message); }
  }

  async function eraseMessages(job) {
    try {
      while (job.cursor < job.rows.length) {
        assertJob(job);
        job.phase = 'delete';
        job.code = '';
        emitJob(job);
        var row = job.rows[job.cursor];
        try {
          var response = await httpGet(job, '/api/v9/channels/' + row.channelId + '/messages/' + row.id, 'DELETE');
          job.counts = completeAttempt(job.counts, response.status === 404 ? 'missing' : 'deleted');
        } catch (error) {
          if (job.cancelled || error.message === 'STALE') throw error;
          job.counts = completeAttempt(job.counts, 'failed');
          if (['AUTH', 'PERMISSION', 'PARAMS'].includes(error.message)) throw error;
          job.cursor++;
          job.phase = 'paused';
          job.code = error.message;
          emitJob(job, 'error');
          return;
        }
        job.cursor++;
        emitJob(job);
        if (job.cancelled) throw new Error(job.cancelled);
        if (job.cursor < job.rows.length) await waitJob(job, job.delayMs, 'delay');
      }
      finishJob(job);
    } catch (error) { finishJob(job, job.cancelled || error.message); }
  }

  function cancelJob(code) {
    if (!activeJob) return;
    activeJob.cancelled = code || 'STOPPED';
    if (activeJob.wake) activeJob.wake();
    if (activeJob.phase === 'paused') finishJob(activeJob, activeJob.cancelled);
  }

  function safeLogs() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]').slice(-60); } catch (e) { return []; }
  }

  function handleAction(data) {
    var action = data.action;
    trackPage();
    if (action === 'status' || action === 'getState') return { ok: true, locale: i18n.getLocale(), localePreference: i18n.getPreference(), delayMs: delayPreference, job: activeJob ? publicJob(activeJob) : lastResult, active: !!activeJob, preview: previewSummary() };
    if (action === 'getLogs') return { ok: true, logs: safeLogs() };
    if (action === 'saveSettings') { delayPreference = validateDelay(data.delayMs); gmSet('delayMs', delayPreference); log('settings.save', { delayMs: delayPreference }); return { ok: true }; }
    if (action === 'stop') {
      if (activeJob && data.jobId !== activeJob.id) throw new Error('STALE');
      cancelJob('STOPPED'); return { ok: true };
    }
    if (action === 'resume') {
      if (!activeJob || activeJob.id !== data.jobId || activeJob.phase !== 'paused' || data.confirmed !== true) throw new Error('STALE');
      assertJob(activeJob);
      activeJob.phase = 'delete';
      eraseMessages(activeJob);
      return { ok: true };
    }
    if (activeJob) throw new Error('BUSY');
    if (action === 'invalidate') { preview = null; return { ok: true }; }
    var session = readSession();
    if (action === 'identify') { preview = null; return { ok: true, scope: routeScope(location.pathname, session.accountId) }; }
    if (action === 'scan') {
      var scope = normalizeScope(data);
      preview = null;
      activeJob = newJob('scan', scope, session);
      var scanId = activeJob.id;
      collectPreview(activeJob);
      return { ok: true, jobId: scanId };
    }
    if (action === 'start') {
      mayStart(preview, data, sessionBinding(session), !!activeJob);
      if (session.token !== preview.token) throw new Error('STALE');
      var delay = validateDelay(data.delayMs);
      activeJob = newJob('delete', preview.scope, session);
      activeJob.rows = preview.rows.slice();
      activeJob.delayMs = delay;
      preview = null;
      var eraseId = activeJob.id;
      eraseMessages(activeJob);
      return { ok: true, jobId: eraseId };
    }
    throw new Error('PARAMS');
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
    if (window.top !== window.self || !['discord.com', 'canary.discord.com', 'ptb.discord.com'].includes(location.hostname)) return;
    try { delayPreference = validateDelay(gmGet('delayMs', DEFAULTS.delayMs)); } catch (e) { delayPreference = DEFAULTS.delayMs; }
    channel = createChannel(TASK_ID);
    window.addEventListener('error', function (event) {
      log('window.error', { message: 'page-error', file: 'redacted', line: event.lineno, col: event.colno });
    });
    window.addEventListener('unhandledrejection', function (event) {
      log('window.unhandledrejection', { message: 'page-rejection' });
      event.preventDefault();
    });
    channel.on('command', function (data, message) {
      // Only the xload popup accepted by the shared origin gate may issue commands.
      if (!message._source || message._source !== channel.getPanelWin()) return;
      log('channel.command', { action: ['getState', 'status', 'setLanguage', 'identify', 'scan', 'start', 'resume', 'stop', 'invalidate', 'saveSettings', 'getLogs'].includes(data.action) ? data.action : 'unknown' });
      if (data && data.action === 'setLanguage') {
        var preference = i18n.setLocale(data.locale);
        updateFabLabel();
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: preference });
        return;
      }
      try { channel.reply(message, handleAction(data || {})); }
      catch (error) {
        var code = Object.prototype.hasOwnProperty.call(I18N_DICT.en, 'error.' + error.message) ? error.message : 'HTTP';
        channel.reply(message, { ok: false, code: code, recoverable: false });
        log('command.error', { code: code });
      }
    });
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand(i18n.t('fab.label'), openPanel);
    setInterval(trackPage, 1000);
    log('init', { host: location.hostname });
  }

  init();
})();
