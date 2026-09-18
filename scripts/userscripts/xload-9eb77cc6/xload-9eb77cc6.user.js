// ==UserScript==
// @name         GitHub Single File Quick Download from the File List
// @name:en      GitHub Single File Quick Download from the File List
// @name:zh-CN   GitHub 单文件快捷下载：文件列表直接下载
// @name:zh-TW   GitHub 單檔快速下載：檔案清單直接下載
// @namespace    https://xload.net/
// @version      2026.9.18.5
// @description  Adds a quick download action to every file row of a GitHub repository list so single files can be saved without opening the raw page.
// @description:en      Adds a quick download action to every file row of a GitHub repository list so single files can be saved without opening the raw page.
// @description:zh-CN   在 GitHub 文件列表的每个文件行添加快捷下载入口，无需打开文件页再找 Raw 按钮。
// @description:zh-TW   在 GitHub 檔案清單的每個檔案列加入快速下載入口，不必開啟檔案頁再找 Raw 按鈕。
// @homepageURL  https://xload.net/scripts/userscripts/xload-9eb77cc6/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://github.com/*
// @match        *://*.github.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-9eb77cc6';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-9eb77cc6/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-9eb77cc6-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "GitHub Single File Quick Download from the File List",
    "short": "Adds a quick download action to every file row of a GitHub repository list so single files can be saved without opening the raw page.",
    "panel.documentTitle": "GitHub Single File Quick Download from the File List - Panel",
    "fab.label": "GitHub Single File Quick Download from the File List",
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
    "status.title": "Current repository file list",
    "status.url": "Current page",
    "status.count": "{count} file(s) can be downloaded",
    "status.noRepo": "Not on a repository file list",
    "settings.title": "Settings",
    "settings.enabled": "Show quick download on file rows",
    "settings.enabledHint": "Add a download icon next to each file row",
    "settings.route": "Download route",
    "settings.routeDirect": "Direct (GitHub raw)",
    "settings.routeMirror": "Mirror",
    "settings.mirrorUrl": "Mirror prefix",
    "settings.mirrorHint": "Example: https://ghfast.top/https://raw.githubusercontent.com",
    "settings.autoFallback": "Auto fallback to direct",
    "settings.autoFallbackHint": "Retry via GitHub raw when the mirror fails",
    "action.download": "Download",
    "state.downloading": "Starting download for {name}...",
    "state.done": "Download started",
    "err.notDownloadable": "This item cannot be downloaded",
    "err.mirrorFailed": "Mirror failed, fallback to direct",
    "err.invalidMirror": "Mirror URL must start with http:// or https://",
    "help.fileList": "Open a repository file list on GitHub to use this feature.",
    "file.empty": "No downloadable files on this page",
    "log.title": "Recent logs",
    "log.copy": "Copy logs"
  },
  "zh-CN": {
    "title": "GitHub 单文件快捷下载：文件列表直接下载",
    "short": "在 GitHub 文件列表的每个文件行添加快捷下载入口，无需打开文件页再找 Raw 按钮。",
    "panel.documentTitle": "GitHub 单文件快捷下载：文件列表直接下载 - 功能面板",
    "fab.label": "GitHub 单文件快捷下载：文件列表直接下载",
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
    "status.title": "当前仓库文件列表",
    "status.url": "当前页面",
    "status.count": "有 {count} 个文件可下载",
    "status.noRepo": "当前不在仓库文件列表页",
    "settings.title": "设置",
    "settings.enabled": "在文件行显示快捷下载",
    "settings.enabledHint": "在每个文件行旁添加下载入口",
    "settings.route": "下载线路",
    "settings.routeDirect": "直连（GitHub raw）",
    "settings.routeMirror": "镜像",
    "settings.mirrorUrl": "镜像前缀",
    "settings.mirrorHint": "示例：https://ghfast.top/https://raw.githubusercontent.com",
    "settings.autoFallback": "镜像失败自动回退直连",
    "settings.autoFallbackHint": "镜像不可用时改用 GitHub raw 重试",
    "action.download": "下载",
    "state.downloading": "正在开始下载 {name}...",
    "state.done": "已开始下载",
    "err.notDownloadable": "该项不可下载",
    "err.mirrorFailed": "镜像失败，已回退直连",
    "err.invalidMirror": "镜像地址必须以 http:// 或 https:// 开头",
    "help.fileList": "在 GitHub 打开仓库文件列表后即可使用。",
    "file.empty": "当前页面没有可下载的文件",
    "log.title": "最近日志",
    "log.copy": "复制日志"
  },
  "zh-TW": {
    "title": "GitHub 單檔快速下載：檔案清單直接下載",
    "short": "在 GitHub 檔案清單的每個檔案列加入快速下載入口，不必開啟檔案頁再找 Raw 按鈕。",
    "panel.documentTitle": "GitHub 單檔快速下載：檔案清單直接下載 - 功能面板",
    "fab.label": "GitHub 單檔快速下載：檔案清單直接下載",
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
    "status.title": "目前倉庫檔案清單",
    "status.url": "目前頁面",
    "status.count": "有 {count} 個檔案可下載",
    "status.noRepo": "目前不在倉庫檔案清單頁",
    "settings.title": "設定",
    "settings.enabled": "在檔案列顯示快速下載",
    "settings.enabledHint": "在每個檔案列旁加入下載入口",
    "settings.route": "下載線路",
    "settings.routeDirect": "直連（GitHub raw）",
    "settings.routeMirror": "鏡像",
    "settings.mirrorUrl": "鏡像前綴",
    "settings.mirrorHint": "範例：https://ghfast.top/https://raw.githubusercontent.com",
    "settings.autoFallback": "鏡像失敗自動回退直連",
    "settings.autoFallbackHint": "鏡像不可用時改用 GitHub raw 重試",
    "action.download": "下載",
    "state.downloading": "正在開始下載 {name}...",
    "state.done": "已開始下載",
    "err.notDownloadable": "該項無法下載",
    "err.mirrorFailed": "鏡像失敗，已回退直連",
    "err.invalidMirror": "鏡像網址必須以 http:// 或 https:// 開頭",
    "help.fileList": "在 GitHub 開啟倉庫檔案清單後即可使用。",
    "file.empty": "目前頁面沒有可下載的檔案",
    "log.title": "最近日誌",
    "log.copy": "複製日誌"
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

  function classifyRepoHref(href) {
    if (typeof href !== 'string') return 'unknown';
    if (!href.startsWith('/')) return 'unknown';
    var parts = href.split('/').filter(Boolean);
    if (parts.length < 4) return 'unknown';
    var kind = parts[2];
    if (kind === 'blob') return 'file';
    if (kind === 'tree') return 'dir';
    if (kind === 'releases' || kind === 'tags' || kind === 'wiki') return 'unknown';
    return 'unknown';
  }

  function isHttpUrl(value) {
    if (typeof value !== 'string') return false;
    try {
      var url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) { return false; }
  }

  function normalizeMirrorPrefix(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (!isHttpUrl(raw)) return '';
    return raw.replace(/\/+$/, '');
  }

  function buildFileDownloadUrl(repoHref, route, mirrorPrefix) {
    if (typeof repoHref !== 'string' || !repoHref.startsWith('/')) return '';
    if (classifyRepoHref(repoHref) !== 'file') return '';
    var rawPath = repoHref.replace('/blob/', '/');
    if (route === 'direct') {
      return 'https://raw.githubusercontent.com' + rawPath;
    }
    if (route !== 'mirror') return '';
    var prefix = normalizeMirrorPrefix(mirrorPrefix);
    if (!prefix) return '';
    if (/^https?:\/\/[^/]+\/gh$/.test(prefix)) {
      return prefix + repoHref.replace('/blob/', '@');
    }
    return prefix + rawPath;
  }

  function resolveDownloadUrl(repoHref, config) {
    if (!config || typeof config !== 'object') return '';
    var route = config.route === 'mirror' ? 'mirror' : 'direct';
    var mirror = route === 'mirror' ? config.mirror : '';
    return buildFileDownloadUrl(repoHref, route, mirror);
  }

  // CORE-END

  var CONFIG_KEY = TASK_ID + ':config:v1';

  function gmGet(key, fallback) {
    try { if (typeof GM_getValue === 'function') return GM_getValue(key, fallback); } catch (e) { /* ignore */ }
    return fallback;
  }
  function gmSet(key, value) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, value); } catch (e) { /* ignore */ }
  }

  function httpGet(url) {
    return new Promise(function (resolve, reject) {
      if (!isSafeUrl(url)) { reject(new Error('unsafe url')); return; }
      var controller = (typeof AbortController === 'function') ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); reject(new Error('timeout')); }, 5000);
      fetch(url, { method: 'HEAD', signal: controller && controller.signal, mode: 'cors' }).then(function (res) {
        clearTimeout(timer);
        resolve(res);
      }).catch(function (err) { clearTimeout(timer); reject(err); });
    });
  }

  function defaultConfig() {
    return { version: 1, enabled: true, route: 'direct', mirror: 'https://ghfast.top/https://raw.githubusercontent.com', autoFallback: true, language: 'auto' };
  }
  function readConfig() {
    var raw = gmGet(CONFIG_KEY, null);
    var cfg = defaultConfig();
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if (typeof raw.enabled === 'boolean') cfg.enabled = raw.enabled;
      if (raw.route === 'mirror' || raw.route === 'direct') cfg.route = raw.route;
      if (typeof raw.mirror === 'string') cfg.mirror = raw.mirror;
      if (typeof raw.autoFallback === 'boolean') cfg.autoFallback = raw.autoFallback;
      if (typeof raw.language === 'string') cfg.language = raw.language;
    }
    return cfg;
  }
  function writeConfig(cfg) {
    gmSet(CONFIG_KEY, cfg);
  }

  var FILE_ICON_SELECTOR = 'div.Box-row svg.octicon.octicon-file, .react-directory-filename-column>svg.color-fg-muted';
  var ROW_SELECTOR = 'tr, div.Box-row, [role="row"]';

  function scanFileRows() {
    var icons = document.querySelectorAll(FILE_ICON_SELECTOR);
    var files = [];
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      var row = icon.closest(ROW_SELECTOR);
      if (!row) continue;
      var link = row.querySelector('a[href*="/blob/"]');
      if (!link) continue;
      var href = link.getAttribute('href') || '';
      var name = (link.textContent || link.getAttribute('title') || '').trim();
      files.push({ name: name, path: href, downloadable: true });
    }
    return files;
  }

  function removeQuickLinks() {
    var links = document.querySelectorAll('.xload-ghfile-link');
    for (var i = links.length - 1; i >= 0; i--) {
      var p = links[i].parentNode;
      if (p) p.removeChild(links[i]);
    }
    var rows = document.querySelectorAll('.xload-ghfile-row');
    for (var j = rows.length - 1; j >= 0; j--) rows[j].classList.remove('xload-ghfile-row');
    var style = document.getElementById('xload-ghfile-style');
    if (style && style.parentNode) style.parentNode.removeChild(style);
  }

  function ensureStyles() {
    if (document.getElementById('xload-ghfile-style')) return;
    var style = document.createElement('style');
    style.id = 'xload-ghfile-style';
    style.textContent = '.xload-ghfile-link{display:none;margin-left:6px;text-decoration:none;color:inherit;line-height:1;}' +
      '.xload-ghfile-row:hover .xload-ghfile-link,.xload-ghfile-row:focus-within .xload-ghfile-link{display:inline;}' +
      '.xload-ghfile-link svg{vertical-align:text-bottom;}';
    var head = document.head || document.documentElement;
    if (head) head.appendChild(style);
  }

  function injectQuickLinks() {
    var cfg = readConfig();
    if (!cfg.enabled) { removeQuickLinks(); return; }
    if (location.pathname.indexOf('/tags') > -1 || location.pathname.indexOf('/releases') > -1) { removeQuickLinks(); return; }
    ensureStyles();
    removeQuickLinks();
    var icons = document.querySelectorAll(FILE_ICON_SELECTOR);
    var added = 0;
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      var row = icon.closest(ROW_SELECTOR);
      if (!row) continue;
      var link = row.querySelector('a[href*="/blob/"]');
      if (!link) continue;
      var href = link.getAttribute('href') || '';
      var url = resolveDownloadUrl(href, cfg);
      if (!url || !isSafeUrl(url)) continue;
      var name = (link.textContent || link.getAttribute('title') || '').trim();
      var a = document.createElement('a');
      a.className = 'xload-ghfile-link';
      a.href = url;
      a.setAttribute('download', name);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer nofollow');
      a.setAttribute('aria-label', i18n.t('action.download') + ' ' + name);
      a.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"></path></svg>';
      icon.parentNode.insertBefore(a, icon.nextSibling);
      row.classList.add('xload-ghfile-row');
      added++;
    }
    log('inject.done', { count: added });
  }

  function triggerAnchorDownload(url) {
    if (!isSafeUrl(url)) { log('download.unsafe', { url: url }); return false; }
    var a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.style.display = 'none';
    document.body.appendChild(a);
    try { a.click(); } catch (e) { /* ignore */ }
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 100);
    return true;
  }

  function patchHistoryEvents() {
    if (window.__xload_urlchange_patched) return;
    window.__xload_urlchange_patched = true;
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () { var r = origPush.apply(this, arguments); window.dispatchEvent(new Event('urlchange')); return r; };
    history.replaceState = function () { var r = origReplace.apply(this, arguments); window.dispatchEvent(new Event('urlchange')); return r; };
    window.addEventListener('popstate', function () { window.dispatchEvent(new Event('urlchange')); });
  }

  var injectTimer = null;
  function scheduleInject() {
    if (injectTimer) clearTimeout(injectTimer);
    injectTimer = setTimeout(function () { injectQuickLinks(); }, 500);
  }
  function startObserver() {
    if (!document.body) { setTimeout(startObserver, 100); return; }
    var observer = new MutationObserver(function () { scheduleInject(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('urlchange', function () { scheduleInject(); });
    scheduleInject();
  }

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
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: i18n.getPreference() });
        return;
      }
      if (data && data.action === 'getFileListState') {
        var files = scanFileRows();
        channel.reply(message, { ok: true, url: location.href, files: files, config: readConfig() });
        return;
      }
      if (data && data.action === 'setConfig') {
        var next = data.config || {};
        var cfg1 = readConfig();
        if (typeof next.enabled === 'boolean') cfg1.enabled = next.enabled;
        if (next.route === 'mirror' || next.route === 'direct') cfg1.route = next.route;
        if (typeof next.mirror === 'string') cfg1.mirror = next.mirror;
        if (typeof next.autoFallback === 'boolean') cfg1.autoFallback = next.autoFallback;
        if (cfg1.route === 'mirror' && !isHttpUrl(cfg1.mirror)) { channel.reply(message, { ok: false, error: i18n.t('err.invalidMirror') }); return; }
        writeConfig(cfg1);
        scheduleInject();
        channel.reply(message, { ok: true, config: cfg1 });
        return;
      }
      if (data && data.action === 'setEnabled') {
        var cfg2 = readConfig();
        cfg2.enabled = !!data.enabled;
        writeConfig(cfg2);
        scheduleInject();
        channel.reply(message, { ok: true, enabled: cfg2.enabled });
        return;
      }
      if (data && data.action === 'setRoute') {
        var cfg3 = readConfig();
        cfg3.route = data.route === 'mirror' ? 'mirror' : 'direct';
        if (typeof data.mirror === 'string') cfg3.mirror = data.mirror;
        if (cfg3.route === 'mirror' && !isHttpUrl(cfg3.mirror)) { channel.reply(message, { ok: false, error: i18n.t('err.invalidMirror') }); return; }
        writeConfig(cfg3);
        scheduleInject();
        channel.reply(message, { ok: true, route: cfg3.route });
        return;
      }
      if (data && data.action === 'setAutoFallback') {
        var cfg4 = readConfig();
        cfg4.autoFallback = !!data.enabled;
        writeConfig(cfg4);
        channel.reply(message, { ok: true, autoFallback: cfg4.autoFallback });
        return;
      }
      if (data && data.action === 'downloadFile') {
        var filePath = data.path || '';
        if (classifyRepoHref(filePath) !== 'file') { channel.reply(message, { ok: false, error: i18n.t('err.notDownloadable') }); return; }
        var cfg5 = readConfig();
        var downloadUrl = resolveDownloadUrl(filePath, cfg5);
        if (!downloadUrl) { channel.reply(message, { ok: false, error: i18n.t('err.notDownloadable') }); return; }
        if (cfg5.route === 'mirror' && cfg5.autoFallback) {
          httpGet(downloadUrl).then(function (res) {
            if (res.ok) { triggerAnchorDownload(downloadUrl); channel.reply(message, { ok: true }); }
            else { var direct = buildFileDownloadUrl(filePath, 'direct', ''); triggerAnchorDownload(direct); channel.reply(message, { ok: true, fallback: true }); }
          }).catch(function () {
            var direct = buildFileDownloadUrl(filePath, 'direct', ''); triggerAnchorDownload(direct); channel.reply(message, { ok: true, fallback: true });
          });
        } else {
          triggerAnchorDownload(downloadUrl);
          channel.reply(message, { ok: true });
        }
        return;
      }
      channel.reply(message, { ok: false, error: 'unknown action' });
    });
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    patchHistoryEvents();
    startObserver();
    log('init', { href: window.location.href });
  }

  init();
})();
