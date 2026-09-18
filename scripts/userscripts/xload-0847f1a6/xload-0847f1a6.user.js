// ==UserScript==
// @name         GitHub Download Accelerator for Release, Raw and ZIP Files
// @name:en      GitHub Download Accelerator for Release, Raw and ZIP Files
// @name:zh-CN   GitHub 下载加速：Release、Raw 与 Code ZIP 镜像加速
// @name:zh-TW   GitHub 下載加速：Release、Raw 與 Code ZIP 鏡像加速
// @namespace    https://xload.net/
// @version      2026.9.18.4
// @description  Adds mirror download links next to GitHub release assets, raw files and ZIP archives so large files download faster without leaving the repository page.
// @description:en      Adds mirror download links next to GitHub release assets, raw files and ZIP archives so large files download faster without leaving the repository page.
// @description:zh-CN   为 GitHub 的 Release 附件、Raw 文件与 ZIP 归档添加镜像下载入口，不必离开仓库页面即可更快下载大文件。
// @description:zh-TW   為 GitHub 的 Release 附件、Raw 檔案與 ZIP 壓縮檔加入鏡像下載入口，不必離開倉庫頁面就能更快下載大檔案。
// @homepageURL  https://xload.net/scripts/userscripts/xload-0847f1a6/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://github.com/*
// @match        *://*.github.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-0847f1a6';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-0847f1a6/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-0847f1a6-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "GitHub Download Accelerator for Release, Raw and ZIP Files",
    "short": "Adds mirror download links next to GitHub release assets, raw files and ZIP archives so large files download faster without leaving the repository page.",
    "panel.documentTitle": "GitHub Download Accelerator for Release, Raw and ZIP Files - Panel",
    "fab.label": "GitHub Download Accelerator for Release, Raw and ZIP Files",
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
    "panel.status": "Status",
    "panel.linkTypes": "Link types",
    "panel.mirrors": "Mirror sources",
    "panel.detected": "Detected on this page",
    "panel.logs": "Logs",
    "mirror.add": "Add self-hosted mirror",
    "mirror.label": "Name",
    "mirror.prefix": "Prefix URL",
    "mirror.addBtn": "Add",
    "mirror.builtin": "Built-in",
    "mirror.custom": "Custom",
    "mirror.noMirrors": "No mirror sources available.",
    "mirror.enable": "Enable",
    "mirror.disable": "Disable",
    "mirror.move_up": "Move up",
    "mirror.move_down": "Move down",
    "mirror.remove": "Remove",
    "linktype.release": "Release assets",
    "linktype.raw": "Raw files",
    "linktype.zip": "Code ZIP",
    "state.connecting": "Connecting to page...",
    "state.connected": "Connected",
    "state.detected": "{count} download entries detected",
    "state.none": "No downloadable entry detected on this page.",
    "state.failed": "{count} failed",
    "action.retry": "Retry with this mirror",
    "action.copy": "Copy",
    "action.refresh": "Refresh",
    "action.save": "Save",
    "err.invalid_prefix": "Prefix must start with http:// or https:// and must not contain a dangerous protocol.",
    "err.download_failed": "Download failed: {message}",
    "err.mirrorNotApplicable": "This mirror does not support {type} links.",
    "help.mirrors": "Enable or disable mirrors, change the order to set priority, or add your own gh-proxy style prefix. Disabled mirrors are skipped when injecting links.",
    "help.raw": "Raw links use raw.githubusercontent.com; release and ZIP links use github.com. A gh-proxy prefix works with both when it accepts the full original URL.",
    "log.empty": "No logs yet."
  },
  "zh-CN": {
    "title": "GitHub 下载加速：Release、Raw 与 Code ZIP 镜像加速",
    "short": "为 GitHub 的 Release 附件、Raw 文件与 ZIP 归档添加镜像下载入口，不必离开仓库页面即可更快下载大文件。",
    "panel.documentTitle": "GitHub 下载加速：Release、Raw 与 Code ZIP 镜像加速 - 功能面板",
    "fab.label": "GitHub 下载加速：Release、Raw 与 Code ZIP 镜像加速",
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
    "panel.status": "状态",
    "panel.linkTypes": "下载入口",
    "panel.mirrors": "镜像源",
    "panel.detected": "当前页面检测到",
    "panel.logs": "日志",
    "mirror.add": "添加自建镜像",
    "mirror.label": "名称",
    "mirror.prefix": "前缀地址",
    "mirror.addBtn": "添加",
    "mirror.builtin": "内置",
    "mirror.custom": "自建",
    "mirror.noMirrors": "暂无可用的镜像源。",
    "mirror.enable": "启用",
    "mirror.disable": "停用",
    "mirror.move_up": "上移",
    "mirror.move_down": "下移",
    "mirror.remove": "删除",
    "linktype.release": "Release 附件",
    "linktype.raw": "Raw 文件",
    "linktype.zip": "Code ZIP",
    "state.connecting": "正在连接原页面...",
    "state.connected": "已连接",
    "state.detected": "检测到 {count} 个下载入口",
    "state.none": "当前页面未检测到可下载入口。",
    "state.failed": "{count} 个失败",
    "action.retry": "使用该镜像重试",
    "action.copy": "复制",
    "action.refresh": "刷新",
    "action.save": "保存",
    "err.invalid_prefix": "前缀必须以 http:// 或 https:// 开头，且不能包含危险协议。",
    "err.download_failed": "下载失败：{message}",
    "err.mirrorNotApplicable": "该镜像不支持 {type} 类型链接。",
    "help.mirrors": "启用或停用镜像，调整顺序以设置优先级，或添加自己的 gh-proxy 风格前缀。停用的镜像在注入链接时会被跳过。",
    "help.raw": "Raw 链接使用 raw.githubusercontent.com；Release 与 ZIP 链接使用 github.com。若 gh-proxy 前缀接受完整原始 URL，则可同时用于两类链接。",
    "log.empty": "暂无日志。"
  },
  "zh-TW": {
    "title": "GitHub 下載加速：Release、Raw 與 Code ZIP 鏡像加速",
    "short": "為 GitHub 的 Release 附件、Raw 檔案與 ZIP 壓縮檔加入鏡像下載入口，不必離開倉庫頁面就能更快下載大檔案。",
    "panel.documentTitle": "GitHub 下載加速：Release、Raw 與 Code ZIP 鏡像加速 - 功能面板",
    "fab.label": "GitHub 下載加速：Release、Raw 與 Code ZIP 鏡像加速",
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
    "panel.status": "狀態",
    "panel.linkTypes": "下載入口",
    "panel.mirrors": "鏡像源",
    "panel.detected": "目前頁面偵測到",
    "panel.logs": "日誌",
    "mirror.add": "新增自建鏡像",
    "mirror.label": "名稱",
    "mirror.prefix": "前綴網址",
    "mirror.addBtn": "新增",
    "mirror.builtin": "內建",
    "mirror.custom": "自建",
    "mirror.noMirrors": "暫無可用的鏡像源。",
    "mirror.enable": "啟用",
    "mirror.disable": "停用",
    "mirror.move_up": "上移",
    "mirror.move_down": "下移",
    "mirror.remove": "刪除",
    "linktype.release": "Release 附件",
    "linktype.raw": "Raw 檔案",
    "linktype.zip": "Code ZIP",
    "state.connecting": "正在連接原頁面...",
    "state.connected": "已連接",
    "state.detected": "偵測到 {count} 個下載入口",
    "state.none": "目前頁面未偵測到可下載入口。",
    "state.failed": "{count} 個失敗",
    "action.retry": "使用該鏡像重試",
    "action.copy": "複製",
    "action.refresh": "重新整理",
    "action.save": "儲存",
    "err.invalid_prefix": "前綴必須以 http:// 或 https:// 開頭，且不能包含危險協定。",
    "err.download_failed": "下載失敗：{message}",
    "err.mirrorNotApplicable": "該鏡像不支援 {type} 類型連結。",
    "help.mirrors": "啟用或停用鏡像，調整順序以設定優先順序，或新增自己的 gh-proxy 風格前綴。停用的鏡像在注入連結時會被跳過。",
    "help.raw": "Raw 連結使用 raw.githubusercontent.com；Release 與 ZIP 連結使用 github.com。若 gh-proxy 前綴接受完整原始 URL，則可同時用於兩類連結。",
    "log.empty": "暫無日誌。"
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

  function detectDownloadType(href) {
    var url = String(href || '');
    if (!url) return null;
    if (url.indexOf('/releases/download/') !== -1) return 'release';
    if (/\.zip(?:[?#]|$)/i.test(url)) return 'zip';
    if (url.indexOf('/raw/') !== -1 || url.indexOf('raw.githubusercontent.com') !== -1) return 'raw';
    return null;
  }

  function isValidMirrorPrefix(prefix) {
    var s = String(prefix || '').trim();
    if (!s) return false;
    try {
      var u = new URL(s, 'https://example.com/');
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) { return false; }
  }

  function buildAcceleratedUrl(originalUrl, mirror, type) {
    var urlStr = String(originalUrl || '');
    if (!urlStr) return null;
    if (!mirror || typeof mirror !== 'object') return null;
    if (mirror.applies && Array.isArray(mirror.applies) && mirror.applies.indexOf(type) === -1) return null;
    var prefix = String(mirror.prefix || '').trim();
    if (!isValidMirrorPrefix(prefix)) return null;
    var parsed;
    try { parsed = new URL(urlStr, 'https://github.com/'); } catch (e) { return null; }
    var protocolSuffix = /https?:\/\/$/i;
    var hostSuffix = new RegExp(parsed.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    var appendPath = protocolSuffix.test(prefix) || hostSuffix.test(prefix);
    var suffix = appendPath ? (parsed.pathname + parsed.search) : parsed.href;
    return prefix + suffix;
  }

  function defaultConfig() {
    return {
      version: 1,
      linkTypes: { release: true, raw: true, zip: true },
      disabledIds: [],
      mirrors: [
        { id: 'builtin-release-0', label: 'gh.h233.eu.org', prefix: 'https://gh.h233.eu.org/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-1', label: 'gh.ddlc.top', prefix: 'https://gh.ddlc.top/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-2', label: 'gh-proxy.org', prefix: 'https://gh-proxy.org/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-3', label: 'cdn.gh-proxy.org', prefix: 'https://cdn.gh-proxy.org/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-4', label: 'edgeone.gh-proxy.org', prefix: 'https://edgeone.gh-proxy.org/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-5', label: 'github.geekery.cn', prefix: 'https://github.geekery.cn/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-6', label: 'github.ednovas.xyz', prefix: 'https://github.ednovas.xyz/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-7', label: 'ghp.keleyaa.com', prefix: 'https://ghp.keleyaa.com/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-8', label: 'gh.chjina.com', prefix: 'https://gh.chjina.com/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-9', label: 'git.yylx.win', prefix: 'https://git.yylx.win/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-10', label: 'ghfast.top', prefix: 'https://ghfast.top/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-release-11', label: 'wget.la', prefix: 'https://wget.la/https://github.com', applies: ['release', 'zip'], builtin: true },
        { id: 'builtin-raw-0', label: 'GitHub 原生', prefix: 'https://raw.githubusercontent.com', applies: ['raw'], builtin: true },
        { id: 'builtin-raw-1', label: 'wget.la Raw', prefix: 'https://wget.la/https://raw.githubusercontent.com', applies: ['raw'], builtin: true },
        { id: 'builtin-raw-2', label: 'hk.gh-proxy.org Raw', prefix: 'https://hk.gh-proxy.org/https://raw.githubusercontent.com', applies: ['raw'], builtin: true },
        { id: 'builtin-raw-3', label: 'ghfast.top Raw', prefix: 'https://ghfast.top/https://raw.githubusercontent.com', applies: ['raw'], builtin: true },
        { id: 'builtin-raw-4', label: 'gh.catmak.name Raw', prefix: 'https://gh.catmak.name/https://raw.githubusercontent.com', applies: ['raw'], builtin: true },
        { id: 'builtin-raw-5', label: 'cdn.gh-proxy.org Raw', prefix: 'https://cdn.gh-proxy.org/https://raw.githubusercontent.com', applies: ['raw'], builtin: true },
        { id: 'builtin-raw-6', label: 'g.blfrp.cn Raw', prefix: 'https://g.blfrp.cn/https://raw.githubusercontent.com', applies: ['raw'], builtin: true }
      ]
    };
  }

  function normalizeConfig(input) {
    var def = defaultConfig();
    if (!input || typeof input !== 'object') return def;
    var cfg = {};
    cfg.version = typeof input.version === 'number' ? input.version : def.version;
    cfg.linkTypes = { release: true, raw: true, zip: true };
    if (input.linkTypes && typeof input.linkTypes === 'object') {
      if (typeof input.linkTypes.release === 'boolean') cfg.linkTypes.release = input.linkTypes.release;
      if (typeof input.linkTypes.raw === 'boolean') cfg.linkTypes.raw = input.linkTypes.raw;
      if (typeof input.linkTypes.zip === 'boolean') cfg.linkTypes.zip = input.linkTypes.zip;
    }
    cfg.disabledIds = Array.isArray(input.disabledIds) ? input.disabledIds.filter(function (id) { return typeof id === 'string'; }) : [];
    if (Array.isArray(input.mirrors) && input.mirrors.length) {
      cfg.mirrors = input.mirrors.map(function (m, idx) {
        return {
          id: (m.id != null ? String(m.id) : 'mirror-' + idx),
          label: String(m.label || m.id || 'Mirror'),
          prefix: String(m.prefix || ''),
          applies: Array.isArray(m.applies) ? m.applies : ['release', 'zip'],
          builtin: !!m.builtin
        };
      });
    } else {
      cfg.mirrors = def.mirrors.slice();
    }
    if (Array.isArray(input.custom)) {
      input.custom.forEach(function (c) {
        cfg.mirrors.push({
          id: (c.id != null ? String(c.id) : 'custom-' + Date.now()),
          label: String(c.label || 'Custom'),
          prefix: String(c.prefix || ''),
          applies: Array.isArray(c.applies) ? c.applies : ['release', 'zip', 'raw'],
          builtin: false
        });
      });
    }
    return cfg;
  }

  function getEnabledMirrors(config, type) {
    if (!config || !Array.isArray(config.mirrors)) return [];
    var disabled = config.disabledIds || [];
    return config.mirrors.filter(function (m) {
      if (disabled.indexOf(m.id) !== -1) return false;
      if (!type) return true;
      if (!m.applies || !m.applies.length) return true;
      return m.applies.indexOf(type) !== -1;
    });
  }

  function getTopMirrors(config, type, limit) {
    var enabled = getEnabledMirrors(config, type);
    var n = typeof limit === 'number' ? limit : 6;
    return enabled.slice(0, Math.max(0, n));
  }

  function sortMirror(config, id, direction) {
    if (!config || !Array.isArray(config.mirrors)) return config;
    var idx = -1;
    for (var i = 0; i < config.mirrors.length; i++) {
      if (config.mirrors[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return config;
    var next = config.mirrors.slice();
    if (direction === 'up' && idx > 0) {
      var tmp = next[idx]; next[idx] = next[idx - 1]; next[idx - 1] = tmp;
    } else if (direction === 'down' && idx < next.length - 1) {
      var tmp2 = next[idx]; next[idx] = next[idx + 1]; next[idx + 1] = tmp2;
    }
    config.mirrors = next;
    return config;
  }

  function sanitizeMirrorPrefix(prefix) {
    var s = String(prefix || '').trim();
    if (!s) return '';
    if (!isValidMirrorPrefix(s)) return '';
    if (/https?:\/\/$/i.test(s)) return s;
    if (s.endsWith('/')) return s;
    var protocolSuffixMatch = s.match(/https?:\/\/[^/]+$/i);
    if (protocolSuffixMatch) {
      var afterFirstProtocol = s.slice(s.indexOf('://') + 3);
      var hasInfixProtocol = afterFirstProtocol.indexOf('://') !== -1;
      if (hasInfixProtocol) return s;
      var hostMatch = s.match(/^https?:\/\/([^/]+)$/i);
      if (hostMatch) {
        var host = hostMatch[1].toLowerCase();
        if (host === 'github.com' || host === 'raw.githubusercontent.com' || host === 'codeload.github.com') return s;
      }
      return s + '/';
    }
    return s + '/';
  }

  // CORE-END

  var config = null;
  var detected = [];
  var injectionTimer = null;
  var pageObserver = null;
  var CONFIG_KEY = TASK_ID + ':config';

  function gmGet(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') {
        var v = GM_getValue(key, undefined);
        return v === undefined ? fallback : v;
      }
    } catch (e) { /* ignore */ }
    try {
      var raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try {
      if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; }
    } catch (e) { /* ignore */ }
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function loadConfig() {
    var raw = gmGet(CONFIG_KEY, null);
    var cfg = normalizeConfig(raw);
    return cfg;
  }

  function saveConfig(cfg) {
    gmSet(CONFIG_KEY, cfg);
  }

  function getLogEntries() {
    try {
      return JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]');
    } catch (e) { return []; }
  }

  function findMirror(id) {
    if (!config || !Array.isArray(config.mirrors)) return null;
    for (var i = 0; i < config.mirrors.length; i++) {
      if (config.mirrors[i].id === id) return config.mirrors[i];
    }
    return null;
  }

  function clearInjected() {
    var nodes = document.querySelectorAll('.xload-ghdl-release, .xload-ghdl-raw, .xload-ghdl-zip');
    for (var i = 0; i < nodes.length; i++) {
      var p = nodes[i].parentNode;
      if (p) p.removeChild(nodes[i]);
    }
    var lists = document.querySelectorAll('ul[data-xload-ghdl-injected]');
    for (var j = 0; j < lists.length; j++) lists[j].removeAttribute('data-xload-ghdl-injected');
    detected.length = 0;
  }

  function recordDetected(type, original, accelerated, mirrorLabel) {
    detected.push({ type: type, original: original, accelerated: accelerated, mirror: mirrorLabel });
  }

  function createMirrorLink(url, mirror, type) {
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noreferrer noopener nofollow';
    a.className = 'btn btn-sm';
    a.style.cssText = 'margin-right:4px;margin-top:2px;';
    a.textContent = mirror.label;
    a.title = mirror.prefix + ' (' + type + ')';
    return a;
  }

  function injectRelease() {
    if (!config.linkTypes.release) return 0;
    var boxes = document.querySelectorAll('.Box-footer');
    var count = 0;
    for (var b = 0; b < boxes.length; b++) {
      var rows = boxes[b].querySelectorAll('li.Box-row');
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        if (row.querySelector('.xload-ghdl-release')) continue;
        var link = row.querySelector('a[href^="/"]');
        if (!link) continue;
        var href = link.getAttribute('href');
        if (detectDownloadType(href) !== 'release') continue;
        var original = 'https://github.com' + href;
        var mirrors = getTopMirrors(config, 'release', 6);
        if (!mirrors.length) continue;
        var container = document.createElement('div');
        container.className = 'xload-ghdl-release';
        container.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;';
        for (var i = 0; i < mirrors.length; i++) {
          var url = buildAcceleratedUrl(original, mirrors[i], 'release');
          if (!url || !isSafeUrl(url)) continue;
          container.appendChild(createMirrorLink(url, mirrors[i], 'release'));
          recordDetected('release', original, url, mirrors[i].label);
        }
        if (!container.childNodes.length) continue;
        var target = link.parentElement && link.parentElement.parentElement && link.parentElement.parentElement.nextElementSibling;
        if (target) target.appendChild(container);
        else row.appendChild(container);
        count++;
      }
    }
    return count;
  }

  function injectZip() {
    if (!config.linkTypes.zip) return 0;
    var portalRoot = document.getElementById('__primerPortalRoot__');
    if (!portalRoot) return 0;
    var lists = portalRoot.querySelectorAll('ul[class^="prc-ActionList-ActionList-"]');
    var count = 0;
    for (var l = 0; l < lists.length; l++) {
      var list = lists[l];
      if (list.getAttribute('data-xload-ghdl-injected')) continue;
      var last = list.querySelector('li:last-child a[href^="/"][href$=".zip"]');
      if (!last) continue;
      var href = last.getAttribute('href');
      var original = 'https://github.com' + href;
      var mirrors = getTopMirrors(config, 'zip', 6);
      if (!mirrors.length) continue;
      var baseLi = last.closest('li');
      if (!baseLi) continue;
      for (var i = 0; i < mirrors.length; i++) {
        var url = buildAcceleratedUrl(original, mirrors[i], 'zip');
        if (!url || !isSafeUrl(url)) continue;
        var clone = baseLi.cloneNode(true);
        clone.classList.add('xload-ghdl-zip');
        var a = clone.querySelector('a[href$=".zip"]');
        if (a) {
          a.href = url;
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noreferrer noopener nofollow');
          a.title = mirrors[i].prefix;
        }
        var span = clone.querySelector('span');
        if (span) span.textContent = 'Download ZIP (' + mirrors[i].label + ')';
        baseLi.parentNode.insertBefore(clone, baseLi.nextSibling);
        recordDetected('zip', original, url, mirrors[i].label);
      }
      list.setAttribute('data-xload-ghdl-injected', 'true');
      count++;
    }
    return count;
  }

  function injectRaw() {
    if (!config.linkTypes.raw) return 0;
    var btn = document.querySelector('a[data-testid="raw-button"]');
    if (!btn || !btn.parentElement) return 0;
    if (btn.parentElement.querySelector('.xload-ghdl-raw')) return 0;
    var href = btn.getAttribute('href');
    if (!href) return 0;
    var path = href;
    if (path.indexOf('http') !== 0) {
      path = path.replace(/^\/(?:blob|raw)\//, '/');
    } else {
      try { path = new URL(path).pathname; } catch (e) { return 0; }
    }
    var original = 'https://raw.githubusercontent.com' + path;
    var mirrors = getTopMirrors(config, 'raw', 6);
    if (!mirrors.length) return 0;
    var container = document.createElement('span');
    container.className = 'xload-ghdl-raw';
    container.style.cssText = 'display:inline-flex;flex-wrap:wrap;gap:6px;margin-left:8px;vertical-align:middle;';
    for (var i = 0; i < mirrors.length; i++) {
      var url = buildAcceleratedUrl(original, mirrors[i], 'raw');
      if (!url || !isSafeUrl(url)) continue;
      container.appendChild(createMirrorLink(url, mirrors[i], 'raw'));
      recordDetected('raw', original, url, mirrors[i].label);
    }
    if (!container.childNodes.length) return 0;
    btn.parentElement.appendChild(container);
    return 1;
  }

  function applyAll() {
    clearInjected();
    injectRelease();
    injectRaw();
    injectZip();
    sendPageState();
  }

  function scheduleInjection(immediate) {
    if (injectionTimer) clearTimeout(injectionTimer);
    injectionTimer = setTimeout(function () { applyAll(); }, immediate ? 50 : 800);
  }

  function sendPageState() {
    if (!channel) return;
    channel.send('done', { count: detected.length, types: countDetectedByType() });
  }

  function countDetectedByType() {
    var counts = { release: 0, raw: 0, zip: 0 };
    for (var i = 0; i < detected.length; i++) {
      if (counts[detected[i].type] != null) counts[detected[i].type]++;
    }
    return counts;
  }

  function addUrlChangeEvent() {
    var push = history.pushState;
    history.pushState = function () {
      var ret = push.apply(this, arguments);
      try { window.dispatchEvent(new Event('urlchange')); } catch (e) { /* ignore */ }
      return ret;
    };
    var replace = history.replaceState;
    history.replaceState = function () {
      var ret = replace.apply(this, arguments);
      try { window.dispatchEvent(new Event('urlchange')); } catch (e) { /* ignore */ }
      return ret;
    };
    window.addEventListener('popstate', function () {
      try { window.dispatchEvent(new Event('urlchange')); } catch (e) { /* ignore */ }
    });
  }

  function startObserver() {
    if (pageObserver) return;
    pageObserver = new MutationObserver(function (mutations) {
      var relevant = false;
      for (var m = 0; m < mutations.length; m++) {
        var nodes = mutations[m].addedNodes;
        for (var n = 0; n < nodes.length; n++) {
          var node = nodes[n];
          if (node.nodeType !== 1) continue;
          if (node.matches && (node.matches('a[data-testid="raw-button"]') || node.matches('.Box-footer') || node.matches('ul[class^="prc-ActionList-ActionList-"]'))) { relevant = true; break; }
          if (node.querySelector && (node.querySelector('a[data-testid="raw-button"]') || node.querySelector('.Box-footer') || node.querySelector('ul[class^="prc-ActionList-ActionList-"]'))) { relevant = true; break; }
        }
        if (relevant) break;
      }
      if (relevant) scheduleInjection(false);
    });
    pageObserver.observe(document, { childList: true, subtree: true });
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
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: i18n.getPreference(), mirrors: config.mirrors, linkTypes: config.linkTypes });
        return;
      }
      if (data && data.action === 'getMirrors') {
        channel.reply(message, { ok: true, mirrors: config.mirrors, disabledIds: config.disabledIds });
        return;
      }
      if (data && data.action === 'setMirrorEnabled') {
        var id = data.id;
        var enabled = !!data.enabled;
        var pos = config.disabledIds.indexOf(id);
        if (enabled && pos !== -1) config.disabledIds.splice(pos, 1);
        if (!enabled && pos === -1) config.disabledIds.push(id);
        saveConfig(config);
        applyAll();
        channel.reply(message, { ok: true, mirrors: config.mirrors, disabledIds: config.disabledIds });
        return;
      }
      if (data && data.action === 'moveMirror') {
        sortMirror(config, data.id, data.direction);
        saveConfig(config);
        applyAll();
        channel.reply(message, { ok: true, mirrors: config.mirrors, disabledIds: config.disabledIds });
        return;
      }
      if (data && data.action === 'addCustomMirror') {
        var rawPrefix = String(data.prefix || '').trim();
        var label = String(data.label || '').trim();
        if (!label || !isValidMirrorPrefix(rawPrefix)) {
          channel.reply(message, { ok: false, error: i18n.t('err.invalid_prefix'), mirrors: config.mirrors, disabledIds: config.disabledIds });
          return;
        }
        var prefix = sanitizeMirrorPrefix(rawPrefix);
        if (!prefix) {
          channel.reply(message, { ok: false, error: i18n.t('err.invalid_prefix'), mirrors: config.mirrors, disabledIds: config.disabledIds });
          return;
        }
        config.mirrors.push({
          id: 'custom-' + Date.now(),
          label: label || prefix,
          prefix: prefix,
          applies: ['release', 'zip', 'raw'],
          builtin: false
        });
        saveConfig(config);
        applyAll();
        channel.reply(message, { ok: true, mirrors: config.mirrors, disabledIds: config.disabledIds });
        return;
      }
      if (data && data.action === 'removeMirror') {
        config.mirrors = config.mirrors.filter(function (m) { return m.id !== data.id || m.builtin; });
        config.disabledIds = config.disabledIds.filter(function (id) { return id !== data.id; });
        saveConfig(config);
        applyAll();
        channel.reply(message, { ok: true, mirrors: config.mirrors, disabledIds: config.disabledIds });
        return;
      }
      if (data && data.action === 'getLinkTypes') {
        channel.reply(message, { ok: true, types: config.linkTypes });
        return;
      }
      if (data && data.action === 'setLinkType') {
        if (config.linkTypes[data.type] !== undefined) config.linkTypes[data.type] = !!data.enabled;
        saveConfig(config);
        applyAll();
        channel.reply(message, { ok: true, types: config.linkTypes });
        return;
      }
      if (data && data.action === 'getPageState') {
        channel.reply(message, { ok: true, url: window.location.href, detected: detected.slice(), failed: [] });
        return;
      }
      if (data && data.action === 'retryDownload') {
        var mirror = findMirror(data.mirrorId);
        var retryUrl = mirror ? buildAcceleratedUrl(data.original, mirror, data.type) : null;
        if (retryUrl && isSafeUrl(retryUrl)) {
          window.open(retryUrl, '_blank', 'noopener,noreferrer');
        }
        channel.reply(message, { ok: !!retryUrl, url: retryUrl });
        return;
      }
      if (data && data.action === 'getLogs') {
        channel.reply(message, { ok: true, logs: getLogEntries() });
        return;
      }
      channel.reply(message, { ok: false, error: 'Unknown command' });
    });

    config = loadConfig();

    if (window.onurlchange === undefined) addUrlChangeEvent();
    window.addEventListener('urlchange', function () { scheduleInjection(true); });
    startObserver();

    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    applyAll();
    log('init', { href: window.location.href, mirrors: config.mirrors.length });
  }

  init();
})();
