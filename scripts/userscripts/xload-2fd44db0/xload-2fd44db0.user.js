// ==UserScript==
// @name         123pan Download Limit Unlock
// @name:en      123pan Download Limit Unlock
// @name:zh-CN   123云盘下载限制突破
// @name:zh-TW   123雲盤下載限制突破
// @namespace    https://xload.net/
// @version      2026.9.18.2
// @description  Download large files from 123pan drive and share pages without the size limit.
// @description:en      Download large files from 123pan drive and share pages without the size limit.
// @description:zh-CN   突破123云盘1GB下载大小限制，在个人网盘和分享页直接下载大文件。
// @description:zh-TW   突破123雲盤1GB下載大小限制，在個人網盤與分享頁直接下載大檔案。
// @homepageURL  https://xload.net/scripts/userscripts/xload-2fd44db0/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://123pan.com/*
// @match        *://*.123pan.com/*
// @match        *://123pan.cn/*
// @match        *://*.123pan.cn/*
// @match        *://123684.com/*
// @match        *://*.123684.com/*
// @match        *://123865.com/*
// @match        *://*.123865.com/*
// @match        *://123952.com/*
// @match        *://*.123952.com/*
// @match        *://123912.com/*
// @match        *://*.123912.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-2fd44db0';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-2fd44db0/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-2fd44db0-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "123pan Download Limit Unlock",
    "short": "Download large files from 123pan drive and share pages without the size limit.",
    "panel.documentTitle": "123pan Download Limit Unlock - Panel",
    "fab.label": "123pan Download Limit Unlock",
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
    "error.noDirectUrl": "Could not obtain a direct download URL",
    "panel.refresh": "Refresh",
    "panel.file": "File",
    "panel.size": "Size",
    "panel.status": "Status",
    "panel.download": "Download",
    "panel.downloadAll": "Download all",
    "panel.cancel": "Stop",
    "panel.empty": "No files detected on this page.",
    "panel.emptyHint": "Open a 123pan drive or share page that lists files, then refresh the list.",
    "panel.queued": "Queued {count} file(s)",
    "panel.err.login": "Requires login or membership to download",
    "panel.err.traffic": "Download traffic quota exceeded",
    "panel.err.size": "File exceeds the download size limit",
    "panel.err.other": "Download failed",
    "panel.err.notFound": "File not found on this page, please refresh",
    "state.pending": "Pending",
    "state.queued": "Queued",
    "state.downloading": "Downloading",
    "state.done": "Done",
    "state.error": "Error",
    "state.canceled": "Canceled",
    "status.connected": "Connected to the page",
    "status.disconnected": "Page not connected",
    "logs.title": "Logs",
    "logs.copy": "Copy logs",
    "logs.clear": "Clear",
    "logs.copied": "Logs copied"
  },
  "zh-CN": {
    "title": "123云盘下载限制突破",
    "short": "突破123云盘1GB下载大小限制，在个人网盘和分享页直接下载大文件。",
    "panel.documentTitle": "123云盘下载限制突破 - 功能面板",
    "fab.label": "123云盘下载限制突破",
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
    "error.noDirectUrl": "无法获取直接下载地址",
    "panel.refresh": "刷新",
    "panel.file": "文件",
    "panel.size": "大小",
    "panel.status": "状态",
    "panel.download": "下载",
    "panel.downloadAll": "全部下载",
    "panel.cancel": "停止",
    "panel.empty": "当前页面未识别到文件。",
    "panel.emptyHint": "请打开列出文件的个人网盘或分享页，然后刷新列表。",
    "panel.queued": "已加入 {count} 个文件",
    "panel.err.login": "需要登录或会员才能下载",
    "panel.err.traffic": "下载流量已超出限制",
    "panel.err.size": "文件超过下载大小限制",
    "panel.err.other": "下载失败",
    "panel.err.notFound": "页面上找不到该文件，请刷新",
    "state.pending": "待处理",
    "state.queued": "排队中",
    "state.downloading": "下载中",
    "state.done": "完成",
    "state.error": "错误",
    "state.canceled": "已取消",
    "status.connected": "已连接页面",
    "status.disconnected": "未连接页面",
    "logs.title": "日志",
    "logs.copy": "复制日志",
    "logs.clear": "清空",
    "logs.copied": "日志已复制"
  },
  "zh-TW": {
    "title": "123雲盤下載限制突破",
    "short": "突破123雲盤1GB下載大小限制，在個人網盤與分享頁直接下載大檔案。",
    "panel.documentTitle": "123雲盤下載限制突破 - 功能面板",
    "fab.label": "123雲盤下載限制突破",
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
    "error.noDirectUrl": "無法取得直接下載網址",
    "panel.refresh": "重新整理",
    "panel.file": "檔案",
    "panel.size": "大小",
    "panel.status": "狀態",
    "panel.download": "下載",
    "panel.downloadAll": "全部下載",
    "panel.cancel": "停止",
    "panel.empty": "目前頁面未偵測到檔案。",
    "panel.emptyHint": "請開啟列出檔案的個人網盤或分享頁，然後重新整理清單。",
    "panel.queued": "已加入 {count} 個檔案",
    "panel.err.login": "需要登入或會員才能下載",
    "panel.err.traffic": "下載流量已超出限制",
    "panel.err.size": "檔案超過下載大小限制",
    "panel.err.other": "下載失敗",
    "panel.err.notFound": "頁面上找不到該檔案，請重新整理",
    "state.pending": "待處理",
    "state.queued": "排隊中",
    "state.downloading": "下載中",
    "state.done": "完成",
    "state.error": "錯誤",
    "state.canceled": "已取消",
    "status.connected": "已連接頁面",
    "status.disconnected": "未連接頁面",
    "logs.title": "日誌",
    "logs.copy": "複製日誌",
    "logs.clear": "清除",
    "logs.copied": "日誌已複製"
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
  // 任务特有纯函数：文件列表归一化、大小解析/格式化、下载地址构造、错误分类、安全 URL 校验。
  // 全部无 DOM / 无存储副作用，可直接在 Node 中单测。

  function pickFirst(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v != null && v !== '') return v;
    }
    return null;
  }

  function toNumber(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function pickIsDir(it) {
    if (typeof it.isDir === 'boolean') return it.isDir;
    if (typeof it.isFolder === 'boolean') return it.isFolder;
    return toNumber(pickFirst(it, ['type', 'Type', 'fileType', 'FileType'])) === 1;
  }

  // 不同来源（API 对象 / DOM 抓取）字段名不同，这里统一到 { id, name, size, sizeLabel, isDir }。
  // 只处理文件（去重），空 id 与空 name 同时缺失时跳过。
  function normalizeFileList(items) {
    if (!Array.isArray(items)) return [];
    var out = [];
    var seen = {};
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || typeof it !== 'object') continue;
      var id = pickFirst(it, ['id', 'Id', 'fileId', 'FileId', 'fileID', 'key', 'rowKey']);
      var name = pickFirst(it, ['name', 'Name', 'fileName', 'FileName', 'title', 'Title', 'text']);
      var size = toNumber(pickFirst(it, ['size', 'Size', 'fileSize', 'FileSize', 'length', 'SizeBytes']));
      var isDir = pickIsDir(it);
      if (id == null && name == null) continue;
      id = id == null ? String(i) : String(id);
      if (name == null || String(name).trim() === '') name = id;
      if (isDir) continue; // 下载对象只保留文件
      if (seen[id]) continue;
      seen[id] = true;
      out.push({ id: id, name: String(name), size: size, sizeLabel: formatBytes(size), isDir: false });
    }
    return out;
  }

  // 把 "1.2 GB" / "2048" / "512 KB" 之类的文本换算成字节数；无法解析返回 0。
  function parseSizeText(text) {
    if (text == null) return 0;
    var s = String(text).trim().toUpperCase();
    if (!s) return 0;
    var m = s.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(TB|GB|MB|KB|B)?/);
    if (!m) return 0;
    var num = parseFloat(String(m[1]).replace(/,/g, ''));
    var unit = m[2] || 'B';
    var mult = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 }[unit] || 1;
    return Math.round(num * mult);
  }

  function formatBytes(bytes) {
    var n = Number(bytes);
    if (!isFinite(n) || n < 0) n = 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    if (n < 1099511627776) return (n / 1073741824).toFixed(2) + ' GB';
    return (n / 1099511627776).toFixed(2) + ' TB';
  }

  // 下载错误分类：把下载接口返回归类为 traffic / login / size / other，供面板如实展示。
  // 站点事实：5113 / 5114 或消息含「下载流量已超出」→ 流量受限；登录/会员墙 → 鉴权；1GB 等大小墙 → 大小。
  function classifyDownloadError(res) {
    var code = -1;
    var message = '';
    if (res && typeof res === 'object') {
      var c = pickFirst(res, ['code', 'Code', 'errno', 'status']);
      if (c != null) code = Number(c);
      message = String(pickFirst(res, ['message', 'msg', 'Message', 'Msg', 'error', 'Error']) || '');
    } else if (typeof res === 'string') {
      message = res;
    }
    if (code === 5113 || code === 5114) return 'traffic';
    if (/下载流量已超出|流量已超出|流量|traffic|quota|限速|购买流量|充值/i.test(message)) return 'traffic';
    if (/未登录|请先登录|登录|login|sign\s*in|token|auth|permission|会员|vip|svip/i.test(message)) return 'login';
    if (/1\s*GB|过大|大小|size|too\s+large/i.test(message)) return 'size';
    return 'other';
  }

  // 解开下载地址里的内嵌 params（base64 → encodeURIComponent），返回真实直链。
  function decodeParams(value) {
    if (!value) return '';
    try { return decodeURIComponent(atob(String(value))); }
    catch (e) {
      try { return atob(String(value)); } catch (e2) { return ''; }
    }
  }

  // 下载地址构造：把下载接口返回的地址规范为浏览器可直接下载的地址。
  // 返回 { url: string, reason: null } 或 { url: null, reason: '<code>' }。
  function buildDownloadUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return { url: null, reason: 'empty' };
    var outer;
    try { outer = new URL(String(rawUrl)); }
    catch (e) { return { url: null, reason: 'invalid' }; }
    if (outer.protocol !== 'http:' && outer.protocol !== 'https:') return { url: null, reason: 'protocol' };

    var target = outer.href;
    var nested = outer.searchParams.get('params');
    if (nested) {
      var innerHref = decodeParams(nested);
      var inner = null;
      if (innerHref) { try { inner = new URL(innerHref, outer.origin); } catch (e2) { inner = null; } }
      if (inner && (inner.protocol === 'http:' || inner.protocol === 'https:')) {
        inner.searchParams.set('auto_redirect', '0');
        target = inner.href;
      }
    } else {
      var u = null;
      try { u = new URL(target); } catch (e3) { u = null; }
      if (u) { u.searchParams.set('auto_redirect', '0'); target = u.href; }
    }
    return { url: target, reason: null };
  }

  // 仅允许 http/https 下载地址，拒绝 javascript:/data:/vbscript:。
  function isSafeDownloadUrl(value) {
    if (!value || typeof value !== 'string') return false;
    var s = value.trim().toLowerCase();
    if (/^(javascript|data|vbscript):/.test(s)) return false;
    return /^https?:\/\//i.test(s);
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

  // ============================ 任务特有下载引擎 ============================
  var DOWNLOAD_INFO_PATHS = [
    'file/download_info',
    'file/batch_download_info',
    'share/download/info',
    'file/batch_download_share_info'
  ];
  var SETTINGS_KEY = 'dl.settings';
  var DEFAULT_SETTINGS = { batch: false };
  var FILE_ROW_SELECTOR = 'tr.ant-table-row';

  function gmGet(key, def) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, def) : def; }
    catch (e) { return def; }
  }
  function gmSet(key, val) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, val); } catch (e) { /* ignore */ }
  }

  var settings = null;
  function readSettings() {
    if (settings) return settings;
    var s = gmGet(SETTINGS_KEY, null);
    if (!s || typeof s !== 'object') s = {};
    settings = { batch: s.batch === true };
    return settings;
  }
  function writeSettings() {
    gmSet(SETTINGS_KEY, { batch: settings.batch });
  }

  // 会话内存状态：下载缓存 fileId -> { url,name }；最近文件列表；取消标志
  var downloadCache = {};
  var lastFileList = [];
  var cancelRequested = false;
  var intercepted = false;

  function isDownloadInfoUrl(rawUrl) {
    if (!rawUrl) return false;
    var path = '';
    try { path = new URL(String(rawUrl), window.location.href).pathname; }
    catch (e) { return false; }
    for (var i = 0; i < DOWNLOAD_INFO_PATHS.length; i++) {
      if (path.indexOf(DOWNLOAD_INFO_PATHS[i]) !== -1) return true;
    }
    return false;
  }

  // 站点事实：web 端下载受 1GB 大小限制，把 platform 头改为 android 可绕过；给请求注入该头。
  function withAndroidHeader(headers) {
    if (headers && typeof headers.get === 'function' && typeof headers.forEach === 'function') {
      var out = new Headers();
      headers.forEach(function (v, k) { out.set(k, v); });
      out.set('platform', 'android');
      return out;
    }
    var obj = {};
    if (headers && typeof headers === 'object') {
      for (var k in headers) { if (Object.prototype.hasOwnProperty.call(headers, k)) obj[k] = headers[k]; }
    }
    obj.platform = 'android';
    return obj;
  }

  function extractFileId(rawUrl) {
    if (!rawUrl) return null;
    try {
      var q = new URL(String(rawUrl), window.location.href).searchParams;
      var single = q.get('fileId') || q.get('fileid') || q.get('fileIdList');
      return single ? String(single) : null;
    } catch (e) { return null; }
  }

  function emitDownloadError(fileId, kind, message) {
    if (channel && channel.send) channel.send('error', { fileId: fileId, kind: kind, message: message || '' });
    log('download.error', { fileId: fileId, kind: kind, message: message });
  }

  // 处理下载接口回包：分类错误或提取直链。返回布尔值表示是否已处理。
  function processDownloadPayload(payload, requestUrl) {
    if (!payload || typeof payload !== 'object') return false;
    var fileId = extractFileId(requestUrl);
    var code = payload.code == null ? -1 : Number(payload.code);
    var message = String(pickFirstText(payload, ['message', 'msg', 'Message', 'Msg']) || '');

    // 服务器返回错误码，或消息命中流量/登录/大小限制 → 如实回传，不伪装成功
    if (code !== 0 || /流量|traffic|登录|login|会员|vip|1\s*GB|大小|过大/i.test(message)) {
      var kind = classifyDownloadError(payload);
      emitDownloadError(fileId, kind, message || ('code ' + code));
      return true;
    }

    var data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    var rawUrl = pickFirstText(data, ['DownloadUrl', 'DownloadURL', 'downloadUrl']);
    if (typeof rawUrl === 'string' && rawUrl) {
      var built = buildDownloadUrl(rawUrl);
      if (built && built.url) {
        var key = fileId || built.url;
        downloadCache[key] = { id: fileId, url: built.url, name: '' };
        if (channel && channel.send) channel.send('done', { fileId: fileId, url: built.url });
        log('download.done', { fileId: fileId, url: built.url });
        return true;
      }
      emitDownloadError(fileId, 'other', built && built.reason ? built.reason : 'unknown');
      return true;
    }
    return false;
  }

  // 轻量取字段（复用 CORE 的 pickFirst，避免与宿主变量冲突）
  function pickFirstText(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v != null && v !== '') return v;
    }
    return null;
  }

  function installInterceptors() {
    if (intercepted) return;
    intercepted = true;
    if (typeof unsafeWindow === 'undefined' || !unsafeWindow) {
      log('intercept.skip', { reason: 'unsafeWindow-unavailable' });
      return;
    }
    var page = unsafeWindow;

    // fetch 拦截：下载信息请求注入 android 头；回包克隆后解析分类，不改页面拿到的响应
    var nativeFetch = null;
    try { nativeFetch = page.fetch && page.fetch.bind(page); } catch (e) { nativeFetch = null; }
    if (nativeFetch) {
      page.fetch = function (input, init) {
        var urlStr = typeof input === 'string' ? input : (input && input.url);
        var isDl = isDownloadInfoUrl(urlStr);
        var opts = init || {};
        try { if (isDl) opts.headers = withAndroidHeader(opts.headers); } catch (e) { /* ignore */ }
        return nativeFetch(input, opts).then(function (resp) {
          if (!isDl) return resp;
          try {
            resp.clone().text().then(function (text) {
              var payload = null;
              try { payload = JSON.parse(text); } catch (e2) { payload = null; }
              processDownloadPayload(payload, urlStr);
            }).catch(function () { /* ignore */ });
          } catch (e3) { /* ignore */ }
          return resp;
        });
      };
    }

    // XHR 拦截：open 记录目标，send 前注入 android 头，load 后解析回包
    var proto = null;
    try { proto = page.XMLHttpRequest && page.XMLHttpRequest.prototype; } catch (e) { proto = null; }
    if (proto) {
      var origOpen = proto.open;
      var origSend = proto.send;
      var origSetHeader = proto.setRequestHeader;
      proto.open = function () {
        var url = arguments.length > 1 ? arguments[1] : '';
        this.__xloadDl = isDownloadInfoUrl(url);
        this.__xloadUrl = url;
        return origOpen.apply(this, arguments);
      };
      proto.setRequestHeader = function (name, value) {
        if (this.__xloadDl && String(name).toLowerCase() === 'platform') value = 'android';
        return origSetHeader.apply(this, arguments);
      };
      proto.send = function () {
        var self = this;
        if (self.__xloadDl) {
          try { origSetHeader.call(self, 'platform', 'android'); } catch (e) { /* ignore */ }
          try {
            self.addEventListener('load', function () {
              var text = self.responseText;
              if (!text && self.response && typeof self.response === 'object') text = JSON.stringify(self.response);
              var payload = null;
              try { payload = JSON.parse(text); } catch (e2) { payload = null; }
              processDownloadPayload(payload, self.__xloadUrl);
            }, { once: true });
          } catch (e2) { /* ignore */ }
        }
        return origSend.apply(this, arguments);
      };
    }
    log('intercept.ready', {});
  }

  function scanFileList() {
    var rows = [];
    try { rows = Array.prototype.slice.call(document.querySelectorAll(FILE_ROW_SELECTOR)); }
    catch (e) { rows = []; }
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var id = row.getAttribute && row.getAttribute('data-row-key');
      var cells = row.querySelectorAll ? Array.prototype.slice.call(row.querySelectorAll('td')) : [];
      var name = '';
      var sizeText = '';
      var firstCell = true;
      for (var c = 0; c < cells.length; c++) {
        var cellText = (cells[c].textContent || '').replace(/\s+/g, ' ').trim();
        if (!cellText) continue;
        if (firstCell) { name = cellText; firstCell = false; }
        sizeText = cellText;
      }
      items.push({ id: id, name: name, size: parseSizeText(sizeText), isDir: false });
    }
    return normalizeFileList(items);
  }

  function findFileRow(fileId) {
    try {
      var rows = document.querySelectorAll(FILE_ROW_SELECTOR);
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].getAttribute && rows[i].getAttribute('data-row-key') === String(fileId)) return rows[i];
      }
    } catch (e) { return null; }
    return null;
  }

  function clickFileDownloadControl(fileId) {
    var row = findFileRow(fileId);
    if (!row) return false;
    try {
      var candidates = Array.prototype.slice.call(row.querySelectorAll('button, a, [role="button"]'));
      for (var i = 0; i < candidates.length; i++) {
        var t = (candidates[i].textContent || '') + ' ' +
          (candidates[i].getAttribute && (candidates[i].getAttribute('aria-label') || '') ) + ' ' +
          (candidates[i].getAttribute && (candidates[i].getAttribute('title') || ''));
        if (/下载|download/i.test(t)) {
          candidates[i].click();
          return true;
        }
      }
    } catch (e) { return false; }
    return false;
  }

  function triggerBrowserDownload(url, name) {
    if (!isSafeDownloadUrl(url)) { log('download.trigger.blocked', { url: url }); return false; }
    try {
      var a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', name || '');
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { if (a.parentNode) a.parentNode.removeChild(a); } catch (e) { /* ignore */ } }, 1000);
      return true;
    } catch (e) { return false; }
  }

  function startDownload(fileId, name, isBatch) {
    if (cancelRequested) { cancelRequested = false; return { ok: false, error: 'canceled' }; }
    var cached = downloadCache[fileId];
    if (cached && cached.url) {
      var ok = triggerBrowserDownload(cached.url, name || cached.name);
      if (ok) {
        if (channel && channel.send) channel.send('progress', { fileId: fileId, state: 'downloading', received: 0, total: 0 });
        log('download.trigger', { fileId: fileId, via: 'cache', url: cached.url });
      }
      return ok ? { ok: true, url: cached.url } : { ok: false, error: 'other' };
    }
    var clicked = clickFileDownloadControl(fileId);
    if (clicked) {
      if (channel && channel.send) channel.send('progress', { fileId: fileId, state: 'downloading', received: 0, total: 0 });
      log('download.trigger', { fileId: fileId, via: 'dom-click' });
      return { ok: true, queued: true };
    }
    return { ok: false, error: 'not-found' };
  }

  function readLogs() {
    try {
      var rows = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]');
      return Array.isArray(rows) ? rows.slice(-60) : [];
    } catch (e) { return []; }
  }
  function clearLogs() {
    try { window.localStorage.removeItem(LOG_KEY); } catch (e) { /* ignore */ }
  }

  function findFileName(fileId) {
    for (var i = 0; i < lastFileList.length; i++) {
      if (lastFileList[i].id === String(fileId)) return lastFileList[i].name;
    }
    return '';
  }

  function init() {
    if (isSelfHost(window.location.hostname)) return;
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
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: i18n.getPreference(), settings: readSettings() });
        return;
      }
      if (data && data.action === 'list-files') {
        var files = scanFileList();
        lastFileList = files;
        var reason = files.length ? null : 'empty';
        log('command.list-files', { count: files.length });
        channel.reply(message, { ok: true, files: files, reason: reason });
        return;
      }
      if (data && data.action === 'download') {
        var fileId = String(data.fileId == null ? '' : data.fileId);
        var result = startDownload(fileId, findFileName(fileId), false);
        log('command.download', { fileId: fileId, result: result });
        channel.reply(message, result);
        return;
      }
      if (data && data.action === 'batch-download') {
        var ids = Array.isArray(data.fileIds) ? data.fileIds : [];
        var queued = [];
        cancelRequested = false;
        for (var i = 0; i < ids.length; i++) {
          if (cancelRequested) break;
          var r = startDownload(String(ids[i]), '', true);
          queued.push({ fileId: String(ids[i]), ok: r.ok, error: r.error || null });
        }
        log('command.batch-download', { count: queued.length });
        channel.reply(message, { ok: true, queued: queued });
        return;
      }
      if (data && data.action === 'cancel') {
        cancelRequested = true;
        log('command.cancel', {});
        channel.reply(message, { ok: true });
        return;
      }
      if (data && data.action === 'save-settings') {
        if (data.settings && typeof data.settings === 'object') {
          settings.batch = data.settings.batch === true;
          writeSettings();
        }
        channel.reply(message, { ok: true, settings: settings });
        return;
      }
      if (data && data.action === 'get-logs') {
        channel.reply(message, { ok: true, logs: readLogs() });
        return;
      }
      if (data && data.action === 'clear-logs') {
        clearLogs();
        channel.reply(message, { ok: true });
        return;
      }
      channel.reply(message, { ok: false, error: 'unknown-action' });
    });
    installInterceptors();
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    log('init', { href: window.location.href });
  }

  init();
})();
