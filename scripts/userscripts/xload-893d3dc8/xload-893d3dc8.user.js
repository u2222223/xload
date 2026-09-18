// ==UserScript==
// @name         GitHub Folder Download as ZIP for Any Subdirectory
// @name:en      GitHub Folder Download as ZIP for Any Subdirectory
// @name:zh-CN   GitHub 文件夹打包下载：子目录一键导出 ZIP
// @name:zh-TW   GitHub 資料夾打包下載：子目錄一鍵匯出 ZIP
// @namespace    https://xload.net/
// @version      2026.9.18.7
// @description  Packages the current GitHub subdirectory into a ZIP archive in the browser so a single folder can be downloaded without cloning the whole repository.
// @description:en      Packages the current GitHub subdirectory into a ZIP archive in the browser so a single folder can be downloaded without cloning the whole repository.
// @description:zh-CN   把当前 GitHub 子目录在浏览器内打包成 ZIP，无需克隆整个仓库即可下载该文件夹。
// @description:zh-TW   在瀏覽器內把目前 GitHub 子目錄打包成 ZIP，不必複製整個倉庫就能下載該資料夾。
// @homepageURL  https://xload.net/scripts/userscripts/xload-893d3dc8/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://github.com/*
// @match        *://*.github.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-893d3dc8';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-893d3dc8/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-893d3dc8-logs';
  var CONFIG_KEY = TASK_ID + ':config:v1';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "GitHub Folder Download as ZIP for Any Subdirectory",
    "short": "Packages the current GitHub subdirectory into a ZIP archive in the browser so a single folder can be downloaded without cloning the whole repository.",
    "panel.documentTitle": "GitHub Folder Download as ZIP for Any Subdirectory - Panel",
    "fab.label": "GitHub Folder Download as ZIP for Any Subdirectory",
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
    "control.start": "Start archive",
    "control.cancel": "Cancel",
    "control.retry": "Retry failed",
    "control.viewLogs": "View logs",
    "control.reset": "Reset defaults",
    "notice": "Notice",
    "close": "Close",
    "timeout": "The original page did not respond",
    "error.pageUnresponsive": "The original page did not respond",
    "folder.currentPath": "Current path",
    "folder.fileCount": "Files found",
    "folder.totalSize": "Total size",
    "folder.namePattern": "Archive name template",
    "folder.maxBytes": "Max archive size (MB)",
    "folder.maxFiles": "Max file count",
    "folder.sourceLabel": "File source",
    "folder.sourceDirect": "GitHub direct",
    "folder.sourceMirror": "Mirror",
    "folder.mirrorLabel": "Mirror base URL",
    "folder.includeRoot": "Show entry on repository root",
    "progress.label": "Progress",
    "progress.processing": "Processing {done}/{total} files · {size}",
    "progress.done": "Archive ready · {size}",
    "progress.failed": "{failed} failed",
    "err.limitExceeded": "Archive exceeds the configured limit ({limit}).",
    "err.rateLimited": "GitHub rate limit hit. Please wait a moment and retry.",
    "err.sourceFailed": "Selected source failed, falling back to direct.",
    "err.noFiles": "No files found in this directory.",
    "err.apiFailed": "Failed to read directory from GitHub ({status}).",
    "err.networkFailed": "Network error while fetching {file}.",
    "err.cancelled": "Archive cancelled by user.",
    "err.notDirectory": "Open a repository directory page to use this feature.",
    "help.folder": "Use {repo}, {path}, {ref}, {date} in the name template. The archive is built locally in your browser.",
    "help.mirror": "Mirror must accept https://github.com/{owner}/{repo}/raw/{ref}/{path} style URLs.",
    "logs.label": "Logs",
    "logs.clear": "Clear logs",
    "status.idle": "Idle",
    "status.scanning": "Scanning directory...",
    "status.downloading": "Downloading...",
    "status.building": "Building ZIP...",
    "status.complete": "Complete",
    "failedFiles.title": "Failed files"
  },
  "zh-CN": {
    "title": "GitHub 文件夹打包下载：子目录一键导出 ZIP",
    "short": "把当前 GitHub 子目录在浏览器内打包成 ZIP，无需克隆整个仓库即可下载该文件夹。",
    "panel.documentTitle": "GitHub 文件夹打包下载：子目录一键导出 ZIP - 功能面板",
    "fab.label": "GitHub 文件夹打包下载：子目录一键导出 ZIP",
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
    "control.start": "开始打包",
    "control.cancel": "取消",
    "control.retry": "重试失败",
    "control.viewLogs": "查看日志",
    "control.reset": "恢复默认",
    "notice": "提示",
    "close": "关闭",
    "timeout": "原页面未响应",
    "error.pageUnresponsive": "原页面未响应",
    "folder.currentPath": "当前路径",
    "folder.fileCount": "文件数",
    "folder.totalSize": "总大小",
    "folder.namePattern": "压缩包命名模板",
    "folder.maxBytes": "大小上限（MB）",
    "folder.maxFiles": "文件数上限",
    "folder.sourceLabel": "文件来源",
    "folder.sourceDirect": "GitHub 直连",
    "folder.sourceMirror": "镜像",
    "folder.mirrorLabel": "镜像基础 URL",
    "folder.includeRoot": "在仓库根目录显示入口",
    "progress.label": "进度",
    "progress.processing": "已处理 {done}/{total} 个文件 · {size}",
    "progress.done": "打包完成 · {size}",
    "progress.failed": "失败 {failed} 个",
    "err.limitExceeded": "超出设置的上限（{limit}）。",
    "err.rateLimited": "GitHub 速率限制，请稍后再试。",
    "err.sourceFailed": "所选来源不可用，已回退到直连。",
    "err.noFiles": "当前目录没有文件。",
    "err.apiFailed": "读取 GitHub 目录失败（{status}）。",
    "err.networkFailed": "下载 {file} 时网络错误。",
    "err.cancelled": "已取消打包。",
    "err.notDirectory": "请在 GitHub 仓库目录页使用此功能。",
    "help.folder": "命名模板可用 {repo}、{path}、{ref}、{date}；压缩包在浏览器本地组装。",
    "help.mirror": "镜像需支持 https://github.com/{owner}/{repo}/raw/{ref}/{path} 形式地址。",
    "logs.label": "日志",
    "logs.clear": "清空日志",
    "status.idle": "待机",
    "status.scanning": "正在扫描目录...",
    "status.downloading": "正在下载...",
    "status.building": "正在生成 ZIP...",
    "status.complete": "完成",
    "failedFiles.title": "失败文件"
  },
  "zh-TW": {
    "title": "GitHub 資料夾打包下載：子目錄一鍵匯出 ZIP",
    "short": "在瀏覽器內把目前 GitHub 子目錄打包成 ZIP，不必複製整個倉庫就能下載該資料夾。",
    "panel.documentTitle": "GitHub 資料夾打包下載：子目錄一鍵匯出 ZIP - 功能面板",
    "fab.label": "GitHub 資料夾打包下載：子目錄一鍵匯出 ZIP",
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
    "control.start": "開始打包",
    "control.cancel": "取消",
    "control.retry": "重試失敗",
    "control.viewLogs": "查看紀錄",
    "control.reset": "恢復預設",
    "notice": "提示",
    "close": "關閉",
    "timeout": "原頁面未回應",
    "error.pageUnresponsive": "原頁面未回應",
    "folder.currentPath": "目前路徑",
    "folder.fileCount": "檔案數",
    "folder.totalSize": "總大小",
    "folder.namePattern": "壓縮檔命名範本",
    "folder.maxBytes": "大小上限（MB）",
    "folder.maxFiles": "檔案數上限",
    "folder.sourceLabel": "檔案來源",
    "folder.sourceDirect": "GitHub 直連",
    "folder.sourceMirror": "鏡像",
    "folder.mirrorLabel": "鏡像基礎 URL",
    "folder.includeRoot": "在倉庫根目錄顯示入口",
    "progress.label": "進度",
    "progress.processing": "已處理 {done}/{total} 個檔案 · {size}",
    "progress.done": "打包完成 · {size}",
    "progress.failed": "失敗 {failed} 個",
    "err.limitExceeded": "超出設定的上限（{limit}）。",
    "err.rateLimited": "GitHub 速率限制，請稍後再試。",
    "err.sourceFailed": "所選來源不可用，已回退到直連。",
    "err.noFiles": "目前目錄沒有檔案。",
    "err.apiFailed": "讀取 GitHub 目錄失敗（{status}）。",
    "err.networkFailed": "下載 {file} 時網路錯誤。",
    "err.cancelled": "已取消打包。",
    "err.notDirectory": "請在 GitHub 倉庫目錄頁使用此功能。",
    "help.folder": "命名範本可用 {repo}、{path}、{ref}、{date}；壓縮檔在瀏覽器本機組裝。",
    "help.mirror": "鏡像需支援 https://github.com/{owner}/{repo}/raw/{ref}/{path} 形式位址。",
    "logs.label": "紀錄",
    "logs.clear": "清空紀錄",
    "status.idle": "待機",
    "status.scanning": "正在掃描目錄...",
    "status.downloading": "正在下載...",
    "status.building": "正在生成 ZIP...",
    "status.complete": "完成",
    "failedFiles.title": "失敗檔案"
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
  function parseGitHubPath(href) {
    var url;
    try { url = new URL(href, window.location.href); } catch (e) { return null; }
    if (!/^github\.com$/i.test(url.hostname)) return null;
    var parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2) return null;
    var owner = decodeURIComponent(parts[0]);
    var repo = decodeURIComponent(parts[1]);
    var ref = 'HEAD';
    var path = '';
    if (parts.length >= 4 && parts[2] === 'tree') {
      ref = decodeURIComponent(parts[3]);
      path = parts.slice(4).map(decodeURIComponent).join('/');
    } else if (parts.length >= 4 && parts[2] === 'blob') {
      return null;
    }
    if (!owner || !repo) return null;
    return { owner: owner, repo: repo, ref: ref, path: path, isRoot: !path };
  }

  function isRepoDirectoryPage(href, doc) {
    var parsed = parseGitHubPath(href);
    if (!parsed) return false;
    if (parsed.isRoot) return true;
    var urlPath = '/' + parsed.owner + '/' + parsed.repo + '/tree/' + encodeURIComponent(parsed.ref) + (parsed.path ? '/' + parsed.path.split('/').map(encodeURIComponent).join('/') : '');
    if (window.location.pathname.indexOf('/tree/') > -1) return true;
    if (doc && doc.querySelector && doc.querySelector('[data-testid="file-name-link"], .react-directory-row, .Box-row')) return true;
    return false;
  }

  function flattenTree(entries, basePath) {
    var files = [];
    var totalBytes = 0;
    if (!Array.isArray(entries)) return { files: files, totalBytes: 0 };
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e || typeof e !== 'object') continue;
      var name = String(e.name || '');
      var itemPath = basePath ? basePath + '/' + name : name;
      var type = e.type === 'dir' ? 'dir' : (e.type === 'file' ? 'file' : e.type);
      if (type === 'file') {
        var size = typeof e.size === 'number' && e.size >= 0 ? e.size : 0;
        files.push({ name: name, path: itemPath, size: size, sha: e.sha || null, downloadUrl: e.download_url || null });
        totalBytes += size;
      } else if (type === 'dir' && Array.isArray(e.children)) {
        var sub = flattenTree(e.children, itemPath);
        files = files.concat(sub.files);
        totalBytes += sub.totalBytes;
      }
    }
    return { files: files, totalBytes: totalBytes };
  }

  function sanitizeFileName(name) {
    var s = String(name || '').replace(/[\\\\/:*?"<>|]/g, '_');
    s = s.replace(/[\x00-\x1f\x7f]/g, '');
    return s.slice(0, 200);
  }

  function buildArchiveName(pattern, vars) {
    var p = String(pattern || '{repo}-{path}-{date}');
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var v = vars || {};
    var pathSlug = sanitizeFileName(v.path || '').replace(/\//g, '-').replace(/^[-_]+|[-_]+$/g, '') || 'root';
    var repoSlug = sanitizeFileName(v.repo || 'repo');
    var refSlug = sanitizeFileName(v.ref || 'HEAD');
    var result = p.replace(/\{repo\}/g, repoSlug)
      .replace(/\{path\}/g, pathSlug)
      .replace(/\{ref\}/g, refSlug)
      .replace(/\{date\}/g, dateStr);
    result = sanitizeFileName(result);
    if (!/\.zip$/i.test(result)) result += '.zip';
    return result;
  }

  function exceedsLimit(totalBytes, totalFiles, limits) {
    var l = limits || {};
    var maxBytes = typeof l.maxBytes === 'number' ? l.maxBytes : Infinity;
    var maxFiles = typeof l.maxFiles === 'number' ? l.maxFiles : Infinity;
    if (typeof totalBytes !== 'number' || totalBytes < 0) totalBytes = 0;
    if (typeof totalFiles !== 'number' || totalFiles < 0) totalFiles = 0;
    if (totalBytes > maxBytes) return { exceeded: true, kind: 'bytes', value: totalBytes, limit: maxBytes };
    if (totalFiles > maxFiles) return { exceeded: true, kind: 'files', value: totalFiles, limit: maxFiles };
    return { exceeded: false };
  }

  function formatBytes(bytes) {
    var n = typeof bytes === 'number' && isFinite(bytes) ? bytes : 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function makeRawUrl(owner, repo, ref, filePath, source, mirrorBase) {
    var direct = 'https://raw.githubusercontent.com/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/' + encodeURIComponent(ref) + '/' + filePath.split('/').map(encodeURIComponent).join('/');
    if (source !== 'mirror' || !mirrorBase) return direct;
    var base = String(mirrorBase).replace(/\/$/, '');
    if (!/^https?:\/\//i.test(base)) return direct;
    return base + '/https://raw.githubusercontent.com/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/' + encodeURIComponent(ref) + '/' + filePath.split('/').map(encodeURIComponent).join('/');
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
// xload 聚合按钮组（FAB）共享模板 —— 经过验证的通用实现（v5 D0 极简黑白静态 · 可折叠）
// ---------------------------------------------------------------------
// 视觉权威：_preview/fab-panel-preview.html（D0 极简黑白，黑白高对比 · 无动效）。
//   v5 相对 v4：移除入场淡入动画与所有 transition（折叠即时收起），根节点
//   min-width/font-size 对齐预览；hover 仅做即时黑白反色，不属于动效。
// 特性：
//   1) 多按钮平铺在 list 中；**可折叠**——点击手柄收起/展开 item 列表，默认展开；
//   2) 整组可拖拽（拖手柄或组内空白处起拖；item 按钮点击与拖拽分离）；
//   3) 位置记忆：拖拽后保存，刷新/重开页面恢复；
//   4) 防出屏：拖拽时 clamp 到视口内；
//   5) 屏幕切换/窗口 resize/缩放：自动重新 clamp，按钮不会跑出屏幕外。
//   6) 折叠状态持久化（键 xload-fab-collapsed，默认展开）。
//   7) iframe 下不插入按钮：`window.self !== window.top`（脚本运行在 iframe 内）时
//      xloadFab() 直接返回空实现（不注入样式、不创建按钮、不绑事件），普通顶层页面才插入。
// 视觉：D0 极简黑白（v5，对齐 _preview/fab-panel-preview.html）——
//       纯黑手柄（白底 x 徽标）、白卡片 item、直边高对比；无入场动画、无过渡。
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
  if (!root) {
    root = document.createElement('div');
    root.id = 'xload-fab-root';
    root.setAttribute('data-xload-fab-root', 'true');
    document.body.appendChild(root);
  }

  // ---------- 样式注入（幂等，scoped 到 #xload-fab-root，不污染页面；v5 覆盖旧版样式） ----------
  var oldStyle = root.querySelector('style[data-xload-fab-style]');
  if (oldStyle && oldStyle.getAttribute('data-xload-fab-style-version') !== '5') {
    oldStyle.parentNode.removeChild(oldStyle);
    oldStyle = null;
  }
  if (!oldStyle) {
    var st = document.createElement('style');
    st.setAttribute('data-xload-fab-style', '');
    st.setAttribute('data-xload-fab-style-version', '5');
    st.textContent =
      '#xload-fab-root{' +
        'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
        'display:flex;flex-direction:column;gap:2px;' +
        'min-width:176px;max-width:240px;padding:6px;box-sizing:border-box;' +
        'background:#fff;' +
        'border:1px solid #e5e5e5;border-radius:6px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.08);' +
        'font-size:13px;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;' +
        'user-select:none;-webkit-user-select:none;touch-action:none;' +
      '}' +
      '#xload-fab-root button{width:100%;padding:9px 10px;border:0;border-radius:4px;font:inherit;text-align:left;}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"]{padding:4px;}' +
      '#xload-fab-root [data-xload-fab-toggle]{' +
        'display:flex;align-items:center;gap:8px;cursor:pointer;' +
        'background:#111;color:#fff;font-weight:700;line-height:1;' +
      '}' +
      '#xload-fab-root [data-xload-fab-toggle]:hover{background:#000;}' +
      '#xload-fab-root .xf-brand{' +
        'display:inline-flex;align-items:center;justify-content:center;flex:none;' +
        'width:20px;height:20px;border-radius:3px;background:#fff;color:#000;' +
        'font-size:11px;' +
      '}' +
      '#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#xload-fab-root .xf-caret{' +
        'flex:none;width:6px;height:6px;' +
        'border-right:1.5px solid #fff;border-bottom:1.5px solid #fff;' +
        'transform:rotate(45deg);' +
      '}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-135deg);}' +
      '#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;gap:2px;}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"] [data-xload-fab-list]{display:none;}' +
      '#xload-fab-root [data-xload-fab-item]{' +
        'display:flex;align-items:center;gap:9px;cursor:pointer;' +
        'background:#fff;color:#111;font-weight:500;line-height:1;' +
      '}' +
      '#xload-fab-root [data-xload-fab-item]:hover{background:#111;color:#fff;}' +
      '#xload-fab-root .xf-dot{' +
        'width:7px;height:7px;border-radius:50%;flex:none;background:#111;' +
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
var currentJob = null;
var jobCounter = 0;

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

// ---- storage wrappers ----
function gmGet(key, fallback) {
  try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':' + key, fallback) : fallback; }
  catch (e) { return fallback; }
}
function gmSet(key, value) {
  try { if (typeof GM_setValue === 'function') GM_setValue(TASK_ID + ':' + key, value); } catch (e) { /* ignore */ }
}

function loadConfig() {
  var raw = gmGet('config:v1', null);
  var cfg = (raw && typeof raw === 'object') ? raw : {};
  return {
    version: 1,
    namePattern: typeof cfg.namePattern === 'string' ? cfg.namePattern : '{repo}-{path}-{date}',
    maxBytes: typeof cfg.maxBytes === 'number' ? cfg.maxBytes : 100 * 1024 * 1024,
    maxFiles: typeof cfg.maxFiles === 'number' ? cfg.maxFiles : 500,
    source: cfg.source === 'mirror' ? 'mirror' : 'direct',
    mirrorBase: typeof cfg.mirrorBase === 'string' ? cfg.mirrorBase : 'https://ghfast.top',
    includeRoot: typeof cfg.includeRoot === 'boolean' ? cfg.includeRoot : false
  };
}

function saveConfig(cfg) {
  gmSet('config:v1', cfg);
  log('config.save', cfg);
}

// ---- network ----
function httpGet(url, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    function fallbackFetch() {
      fetch(url, { method: 'GET', credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.arrayBuffer();
        })
        .then(resolve, reject);
    }
    if (typeof GM_xmlhttpRequest !== 'function') {
      fallbackFetch();
      return;
    }
    try {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        onload: function (res) {
          if (res.status >= 200 && res.status < 300) {
            resolve(res.response);
          } else if (res.status === 403 || res.status === 429) {
            reject({ code: 'rate_limited', status: res.status, message: 'rate limited' });
          } else {
            reject({ code: 'http_error', status: res.status, message: 'HTTP ' + res.status });
          }
        },
        onerror: function () { reject({ code: 'network', message: 'network error' }); },
        ontimeout: function () { reject({ code: 'timeout', message: 'request timeout' }); }
      });
    } catch (e) { fallbackFetch(); }
  });
}

function apiGetJson(url) {
  return new Promise(function (resolve, reject) {
    function fallbackFetch() {
      fetch(url, { method: 'GET', credentials: 'same-origin', headers: { 'Accept': 'application/vnd.github+json' } })
        .then(function (res) {
          if (res.status === 403 || res.status === 429) throw { code: 'rate_limited', status: res.status };
          if (!res.ok) throw { code: 'http_error', status: res.status };
          return res.json();
        })
        .then(resolve, reject);
    }
    if (typeof GM_xmlhttpRequest !== 'function') {
      fallbackFetch();
      return;
    }
    try {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        responseType: 'json',
        headers: { 'Accept': 'application/vnd.github+json' },
        onload: function (res) {
          if (res.status >= 200 && res.status < 300) {
            resolve(res.response);
          } else if (res.status === 403 || res.status === 429) {
            reject({ code: 'rate_limited', status: res.status });
          } else {
            reject({ code: 'http_error', status: res.status });
          }
        },
        onerror: function () { reject({ code: 'network' }); },
        ontimeout: function () { reject({ code: 'timeout' }); }
      });
    } catch (e) { fallbackFetch(); }
  });
}

// ---- GitHub directory traversal ----
function contentsApiUrl(owner, repo, path, ref, page) {
  var url = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents';
  if (path) url += '/' + path.split('/').map(encodeURIComponent).join('/');
  url += '?ref=' + encodeURIComponent(ref) + '&per_page=100';
  if (page) url += '&page=' + page;
  return url;
}

function parseLinkHeader(header) {
  var result = { next: null, last: null };
  if (!header) return result;
  var parts = String(header).split(',');
  for (var i = 0; i < parts.length; i++) {
    var m = parts[i].match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (m) result[m[2]] = m[1];
  }
  return result;
}

function listDirectory(owner, repo, path, ref) {
  return new Promise(function (resolve, reject) {
    var all = [];
    function fetchPage(page) {
      var url = contentsApiUrl(owner, repo, path, ref, page);
      apiGetJson(url).then(function (data) {
        if (!Array.isArray(data)) { reject({ code: 'api_failed', status: 200 }); return; }
        for (var i = 0; i < data.length; i++) all.push(data[i]);
        // GitHub API does not always return Link header in JSON request; conservatively try next page if full.
        if (data.length === 100) {
          fetchPage(page + 1);
        } else {
          resolve(all);
        }
      }).catch(reject);
    }
    fetchPage(1);
  });
}

function collectFilesRecursive(owner, repo, basePath, ref, limits, state) {
  state = state || { files: [], totalBytes: 0, stopped: false, reason: null };
  limits = limits || {};
  if (state.stopped) return Promise.resolve(state);
  return listDirectory(owner, repo, basePath, ref).then(function (entries) {
    if (state.stopped) return state;
    for (var i = 0; i < entries.length; i++) {
      if (state.stopped) break;
      var e = entries[i];
      var name = String(e.name || '');
      var itemPath = basePath ? basePath + '/' + name : name;
      if (e.type === 'file') {
        var size = typeof e.size === 'number' && e.size >= 0 ? e.size : 0;
        state.files.push({ name: name, path: itemPath, size: size, sha: e.sha || null, downloadUrl: e.download_url || null });
        state.totalBytes += size;
      } else if (e.type === 'dir') {
        // recurse; depth limited by API naturally
      }
    }
    // Check limits after current level
    var check = exceedsLimit(state.totalBytes, state.files.length, limits);
    if (check.exceeded) {
      state.stopped = true;
      state.reason = check;
      return state;
    }
    // Recurse into subdirectories sequentially to avoid API burst
    var dirs = entries.filter(function (e) { return e.type === 'dir'; });
    function nextDir() {
      if (state.stopped) return Promise.resolve(state);
      var dir = dirs.shift();
      if (!dir) return Promise.resolve(state);
      var itemPath = basePath ? basePath + '/' + dir.name : dir.name;
      return collectFilesRecursive(owner, repo, itemPath, ref, limits, state).then(nextDir);
    }
    return nextDir();
  });
}

// ---- job orchestration ----
function makeJob(parsed, cfg) {
  jobCounter++;
  return {
    id: 'job-' + Date.now() + '-' + jobCounter,
    parsed: parsed,
    cfg: cfg,
    files: [],
    totalBytes: 0,
    done: 0,
    failed: [],
    cancelled: false,
    status: 'scanning',
    archiveName: buildArchiveName(cfg.namePattern, { repo: parsed.repo, path: parsed.path, ref: parsed.ref }),
    source: cfg.source,
    mirrorBase: cfg.mirrorBase,
    downloadedBytes: 0
  };
}

function sendProgress(job) {
  channel.send('progress', {
    jobId: job.id,
    status: job.status,
    done: job.done,
    total: job.files.length,
    failed: job.failed.length,
    bytes: job.downloadedBytes,
    totalBytes: job.totalBytes,
    archiveName: job.archiveName
  });
}

function sendError(job, code, message, extra) {
  var payload = { jobId: job ? job.id : null, code: code, message: message };
  if (extra) {
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
  }
  channel.send('error', payload);
}

function sendDone(job, blobUrl) {
  channel.send('done', {
    jobId: job.id,
    archiveName: job.archiveName,
    bytes: job.downloadedBytes,
    totalFiles: job.files.length,
    failed: job.failed.length,
    blobUrl: blobUrl
  });
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function downloadWithMirror(job, file, attempt) {
  var directUrl = makeRawUrl(job.parsed.owner, job.parsed.repo, job.parsed.ref, file.path, 'direct', null);
  var urls = [directUrl];
  if (job.source === 'mirror' && job.mirrorBase) {
    var mirrorUrl = makeRawUrl(job.parsed.owner, job.parsed.repo, job.parsed.ref, file.path, 'mirror', job.mirrorBase);
    urls.unshift(mirrorUrl);
  }
  var idx = Math.min(attempt, urls.length - 1);
  return httpGet(urls[idx], { responseType: 'arraybuffer' }).catch(function (err) {
    if (idx < urls.length - 1) return downloadWithMirror(job, file, idx + 1);
    throw err;
  });
}

function runDownloadBatch(job) {
  var concurrency = 3;
  var index = 0;
  var pending = [];
  function processNext() {
    if (job.cancelled) return;
    var i = index++;
    if (i >= job.files.length) return;
    var file = job.files[i];
    // Skip files that already succeeded; failed ones may be retried separately
    var p = downloadWithMirror(job, file, 0).then(function (data) {
      if (job.cancelled) return;
      job.done++;
      job.downloadedBytes += data.byteLength || data.length || 0;
      file._data = new Uint8Array(data);
      sendProgress(job);
    }).catch(function (err) {
      if (job.cancelled) return;
      file._error = err;
      if (job.failed.indexOf(file) === -1) job.failed.push(file);
      sendProgress(job);
      log('download.failed', { file: file.path, error: String(err && err.message || err) });
    });
    pending.push(p);
    p.then(function () {
      pending.splice(pending.indexOf(p), 1);
    });
    if (pending.length < concurrency) processNext();
  }
  for (var k = 0; k < concurrency; k++) processNext();
  return Promise.all(pending);
}

function startArchive(data, message) {
  var cfg = loadConfig();
  if (data && typeof data.namePattern === 'string') cfg.namePattern = data.namePattern;
  if (data && typeof data.maxBytes === 'number') cfg.maxBytes = data.maxBytes;
  if (data && typeof data.maxFiles === 'number') cfg.maxFiles = data.maxFiles;
  if (data && data.source) cfg.source = data.source;
  if (data && typeof data.mirrorBase === 'string') cfg.mirrorBase = data.mirrorBase;
  saveConfig(cfg);

  var parsed = parseGitHubPath(window.location.href);
  if (!parsed || (!cfg.includeRoot && parsed.isRoot)) {
    channel.reply(message, { ok: false, error: i18n.t('err.notDirectory') });
    return;
  }
  if (currentJob && (currentJob.status === 'scanning' || currentJob.status === 'downloading' || currentJob.status === 'building')) {
    channel.reply(message, { ok: false, error: 'Another archive is running' });
    return;
  }
  var job = makeJob(parsed, cfg);
  currentJob = job;
  channel.reply(message, { ok: true, jobId: job.id, archiveName: job.archiveName });
  sendProgress(job);

  collectFilesRecursive(parsed.owner, parsed.repo, parsed.path, parsed.ref, { maxBytes: cfg.maxBytes, maxFiles: cfg.maxFiles })
    .then(function (state) {
      if (job.cancelled) return;
      if (state.reason && state.reason.exceeded) {
        job.status = 'error';
        sendError(job, 'limit_exceeded', i18n.t('err.limitExceeded', { limit: state.reason.kind === 'bytes' ? formatBytes(state.reason.limit) : state.reason.limit + ' files' }), { kind: state.reason.kind, limit: state.reason.limit });
        return;
      }
      job.files = state.files;
      job.totalBytes = state.totalBytes;
      if (job.files.length === 0) {
        job.status = 'error';
        sendError(job, 'no_files', i18n.t('err.noFiles'));
        return;
      }
      sendProgress(job);
      job.status = 'downloading';
      return runDownloadBatch(job);
    })
    .then(function () {
      if (job.cancelled) return;
      if (job.status === 'error') return;
      job.status = 'building';
      sendProgress(job);
      var builder = createZipBuilder();
      for (var i = 0; i < job.files.length; i++) {
        var f = job.files[i];
        if (f._data) builder.add(f.path, f._data);
      }
      var zipBytes = builder.build();
      var blob = new Blob([zipBytes], { type: 'application/zip' });
      var url = URL.createObjectURL(blob);
      job.status = 'complete';
      job.downloadedBytes = zipBytes.length;
      sendDone(job, url);
      triggerDownload(url, job.archiveName);
      log('archive.done', { jobId: job.id, files: job.files.length, bytes: zipBytes.length });
    })
    .catch(function (err) {
      if (job.cancelled) return;
      job.status = 'error';
      if (err && err.code === 'rate_limited') {
        sendError(job, 'rate_limited', i18n.t('err.rateLimited'));
      } else {
        sendError(job, err && err.code || 'api_failed', i18n.t('err.apiFailed', { status: err && err.status || 'unknown' }));
      }
      log('archive.error', { error: String(err && err.message || err) });
    });
}

function cancelArchive(data, message) {
  if (currentJob && data && data.jobId === currentJob.id) {
    currentJob.cancelled = true;
    currentJob.status = 'cancelled';
    sendError(currentJob, 'cancelled', i18n.t('err.cancelled'));
    channel.reply(message, { ok: true });
  } else {
    channel.reply(message, { ok: false, error: 'No running job' });
  }
}

function retryFailed(data, message) {
  if (!currentJob || !data || data.jobId !== currentJob.id) {
    channel.reply(message, { ok: false, error: 'No active job' });
    return;
  }
  var job = currentJob;
  var toRetry = job.failed.slice();
  job.failed = [];
  job.status = 'downloading';
  channel.reply(message, { ok: true, count: toRetry.length });
  var index = 0;
  var concurrency = 3;
  var pending = [];
  function processNext() {
    if (job.cancelled) return;
    var i = index++;
    if (i >= toRetry.length) return;
    var file = toRetry[i];
    var p = downloadWithMirror(job, file, 0).then(function (data) {
      if (job.cancelled) return;
      file._data = new Uint8Array(data);
      file._error = null;
      job.done++;
      job.downloadedBytes += data.byteLength || data.length || 0;
      sendProgress(job);
    }).catch(function (err) {
      if (job.cancelled) return;
      file._error = err;
      if (job.failed.indexOf(file) === -1) job.failed.push(file);
      sendProgress(job);
    });
    pending.push(p);
    p.then(function () { pending.splice(pending.indexOf(p), 1); });
    if (pending.length < concurrency) processNext();
  }
  for (var k = 0; k < concurrency; k++) processNext();
  Promise.all(pending).then(function () {
    if (job.cancelled) return;
    if (job.failed.length === 0) {
      job.status = 'building';
      sendProgress(job);
      var builder = createZipBuilder();
      for (var i = 0; i < job.files.length; i++) {
        var f = job.files[i];
        if (f._data) builder.add(f.path, f._data);
      }
      var zipBytes = builder.build();
      var blob = new Blob([zipBytes], { type: 'application/zip' });
      var url = URL.createObjectURL(blob);
      job.status = 'complete';
      job.downloadedBytes = zipBytes.length;
      sendDone(job, url);
      triggerDownload(url, job.archiveName);
    } else {
      job.status = 'downloading';
    }
  });
}

function triggerDownload(url, filename) {
  try {
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); }, 1000);
  } catch (e) { log('download.trigger.error', { message: String(e.message || e) }); }
}

function getFolderState(message) {
  var cfg = loadConfig();
  var parsed = parseGitHubPath(window.location.href);
  var state = {
    ok: true,
    url: window.location.href,
    locale: i18n.getLocale(),
    localePreference: i18n.getPreference(),
    config: cfg
  };
  if (parsed) {
    state.owner = parsed.owner;
    state.repo = parsed.repo;
    state.ref = parsed.ref;
    state.path = parsed.path;
    state.isDirectory = isRepoDirectoryPage(window.location.href, document);
    state.isRoot = parsed.isRoot;
  }
  channel.reply(message, state);
}

function setSource(data, message) {
  var cfg = loadConfig();
  if (data && data.source) cfg.source = data.source === 'mirror' ? 'mirror' : 'direct';
  if (data && typeof data.mirrorBase === 'string') cfg.mirrorBase = data.mirrorBase;
  saveConfig(cfg);
  channel.reply(message, { ok: true, source: cfg.source, mirrorBase: cfg.mirrorBase });
}

function setLimits(data, message) {
  var cfg = loadConfig();
  if (data && typeof data.maxBytes === 'number') cfg.maxBytes = data.maxBytes;
  if (data && typeof data.maxFiles === 'number') cfg.maxFiles = data.maxFiles;
  saveConfig(cfg);
  channel.reply(message, { ok: true, limits: { maxBytes: cfg.maxBytes, maxFiles: cfg.maxFiles } });
}

function savePanelConfig(data, message) {
  var cfg = loadConfig();
  if (data && typeof data.namePattern === 'string') cfg.namePattern = data.namePattern;
  if (data && typeof data.maxBytes === 'number') cfg.maxBytes = data.maxBytes;
  if (data && typeof data.maxFiles === 'number') cfg.maxFiles = data.maxFiles;
  if (data && typeof data.includeRoot === 'boolean') cfg.includeRoot = data.includeRoot;
  saveConfig(cfg);
  channel.reply(message, { ok: true, config: cfg });
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
    if (!data || !data.action) {
      channel.reply(message, { ok: false, error: 'missing action' });
      return;
    }
    try {
      if (data.action === 'setLanguage') {
        var preference = i18n.setLocale(data.locale);
        updateFabLabel();
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: preference });
        return;
      }
      if (data.action === 'getState') {
        getFolderState(message);
        return;
      }
      if (data.action === 'getFolderState') {
        getFolderState(message);
        return;
      }
      if (data.action === 'startArchive') {
        startArchive(data, message);
        return;
      }
      if (data.action === 'cancelArchive') {
        cancelArchive(data, message);
        return;
      }
      if (data.action === 'retryFailed') {
        retryFailed(data, message);
        return;
      }
      if (data.action === 'setSource') {
        setSource(data, message);
        return;
      }
      if (data.action === 'setLimits') {
        setLimits(data, message);
        return;
      }
      if (data.action === 'saveConfig') {
        savePanelConfig(data, message);
        return;
      }
      channel.reply(message, { ok: false, error: 'unknown action: ' + data.action });
    } catch (e) {
      log('command.error', { action: data.action, message: String(e && e.message || e) });
      channel.reply(message, { ok: false, error: String(e && e.message || e) });
    }
  });

  var cfg = loadConfig();
  var showFab = cfg.includeRoot || (isRepoDirectoryPage(window.location.href, document) && !parseGitHubPath(window.location.href).isRoot);
  if (showFab) {
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
  }
  log('init', { href: window.location.href, fabShown: !!showFab });
}

init();
})();
