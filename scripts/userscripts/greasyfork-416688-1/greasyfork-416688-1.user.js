// ==UserScript==
// @name         全局字体渲染增强
// @name:zh-CN   全局字体渲染增强
// @name:en      Global Font Rendering Enhancer
// @namespace    https://github.com/u2222223/xload
// @version      1.0.0
// @description  无需 MacType，享受细腻网页字体阅读体验。全局字体重写、中英文分字体、抗锯齿平滑、描边阴影、动态缩放，黑白名单过滤与站点个性化。
// @author       xload
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用，可独立单测）
  // ===================================================================

  // 默认配置（全新 schema：全局 / 站点 / 路径 / 元素 四级作用域）
  var DEFAULT_CONFIG = {
    enabled: true,               // 总开关
    preset: 'balanced',          // 预设：balanced | delicate | performance | custom
    fontZh: 'Microsoft YaHei UI',   // 中文字体族
    fontEn: 'Segoe UI',             // 英文字体族（排在前）
    monospace: 'ui-monospace, Consolas, Menlo, Monaco, monospace', // 等宽字体
    antiAlias: true,             // 抗锯齿平滑
    strokeEnabled: false,        // 文字描边
    strokeWidth: 0.02,           // 描边粗细 px（0~0.2）
    strokeColor: '#000000',      // 描边颜色
    shadowEnabled: false,        // 文字阴影
    shadowSize: 0.6,             // 阴影模糊半径 px（0~4）
    shadowColor: '#7c7c7c',      // 阴影颜色
    shadowAlpha: 0.6,            // 阴影透明度 0~1
    zoom: 1.0,                   // 字号缩放 0.8~2.5
    fontRewrite: true,           // 字体重写（把常见网页字体映射到所选字体）
    filterMode: 'blacklist',     // blacklist 排除模式 | whitelist 白名单模式
    excludeSites: ['127.0.0.1', 'localhost'], // 排除站点（黑名单；支持 *.domain.com）
    includeSites: [],            // 白名单站点（白名单模式生效）
    excludePaths: [],            // 路径规则（每项：/regex/ 表示正则，否则前缀匹配）
    includeSelectors: "html, body, p, div, span, a, li, td, th, label, h1, h2, h3, h4, h5, h6, blockquote, article, section, button, input, select, textarea",
    excludeSelectors: "[class*='icon' i], [class*='symbol' i], [class*='glyph'], [class*='fa-'], i, svg, [class*='vjs-'], [class*='watermark' i], .textLayer *, pre, pre *, code, code *"
  };

  // 三套预设（对象片段，覆盖到 default 上）
  var PRESETS = {
    balanced: {
      antiAlias: true, strokeEnabled: false, shadowEnabled: false,
      zoom: 1.0, fontRewrite: true
    },
    delicate: {
      antiAlias: true, strokeEnabled: true, strokeWidth: 0.025,
      shadowEnabled: true, shadowSize: 0.75, shadowAlpha: 0.6,
      zoom: 1.0, fontRewrite: true
    },
    performance: {
      antiAlias: true, strokeEnabled: false, shadowEnabled: false,
      zoom: 1.0, fontRewrite: false
    }
  };

  // 页面事实（照抄）：字体重写目标列表（常见网页字体名）
  var FONT_REWRITE_LIST = [
    'Arial', 'FangSong', 'Georgia', 'Helvetica', 'Helvetica Neue',
    'KaiTi', 'Microsoft YaHei', 'MingLiU', 'NSimSun', 'Noto Sans',
    'Open Sans', 'PMingLiU', 'PingFang SC', 'Roboto', 'Segoe UI',
    'SimHei', 'SimSun', 'Tahoma', 'Ubuntu', 'Verdana',
    '宋体', '黑体', '楷体', '微软雅黑'
  ];

  // 页面事实（照抄）：编辑器类站点黑名单，命中时禁用字体重写，避免破坏编辑器等宽布局
  var EDITOR_BLOCKED_HOSTS = [
    'addon.tencentsuite.com', 'developer.mozilla.org', 'docs.google.com',
    'docs.qq.com', 'feishu.cn', 'fonts.google.com', 'github.com',
    'github.dev', 'github1s.com', 'image.baidu.com', 'kdocs.cn',
    'leetcode.cn', 'leetcode.com', 'mail.google.com', 'newassets.hcaptcha.com',
    'note.youdao.com', 'notion.com', 'notion.site', 'notion.so',
    'regex101.com', 'scriptcat.org', 'shimo.im', 'support.google.com',
    'tool.lu', 'vscode.dev', 'weread.qq.com', 'wolai.com',
    'wqxuetang.com', 'xiezuocat.com', 'youtube.com', 'yuque.com'
  ];

  // ---- 纯工具 ----
  function clamp(num, min, max) {
    num = Number(num);
    if (!isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function isString(v) { return typeof v === 'string'; }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  // 浅合并（纯函数，不修改 base）
  function mergeObject(base, patch) {
    var out = {};
    var k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    if (isPlainObject(patch)) {
      for (k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k];
    }
    return out;
  }

  // 深拷贝（配置含数组）
  function deepClone(v) {
    if (Array.isArray(v)) return v.map(deepClone);
    if (isPlainObject(v)) {
      var o = {}, k;
      for (k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = deepClone(v[k]);
      return o;
    }
    return v;
  }

  // 外链协议白名单：仅允许 http/https
  function isSafeUrl(url) {
    return isString(url) && /^https?:\/\//i.test(url.trim());
  }

  // 颜色：#RGB / #RRGGBB / 8 位 hex 归一化为小写 #RRGGBB；非法返回 null
  function parseColor(hex) {
    if (!isString(hex)) return null;
    var m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length === 8) h = h.slice(0, 6);
    return '#' + h.toLowerCase();
  }

  // hex -> rgba(r,g,b,a) 字符串；非法返回 null
  function hexToRgba(hex, alphaPct) {
    hex = parseColor(hex);
    if (!hex) return null;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var a = clamp(alphaPct, 0, 1);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (Math.round(a * 100) / 100) + ')';
  }

  // 清理用户输入的 CSS 值/选择器：去除 url()/@import/注释/控制符，防 CSS 注入
  function sanitizeCssValue(str) {
    if (!isString(str)) return '';
    var s = str.trim();
    if (!s) return '';
    s = s.replace(/\/\*[\s\S]*?\*\//g, '');          // 去注释
    s = s.replace(/url\s*\(/gi, 'none(');             // 去 url()
    s = s.replace(/@import/gi, '');                   // 去 @import
    s = s.replace(/[\x00-\x1f\x7f]/g, ' ');           // 去控制符
    s = s.replace(/[{}]/g, '');                       // 去大括号（防逃逸）
    s = s.replace(/<|>/g, '');                        // 去尖括号
    s = s.replace(/\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/gi, ''); // 去转义注入
    return s.replace(/\s{2,}/g, ' ').replace(/^\s*,\s*|,\s*$/g, '').trim();
  }

  // 字体族归一化：拆逗号、去引号、去空、去重
  function normalizeFontList(str) {
    if (!isString(str)) return [];
    var seen = {}, out = [];
    str.split(',').forEach(function (part) {
      var name = part.trim().replace(/^['"]|['"]$/g, '').trim();
      if (!name || seen[name]) return;
      seen[name] = 1;
      out.push(name);
    });
    return out;
  }

  // 生成 font-family 字体栈（引号包裹多词字体名）
  function buildFontStack(zh, en) {
    var zhList = normalizeFontList(zh);
    var enList = normalizeFontList(en);
    var result = enList.concat(zhList).map(function (n) {
      return /\s/.test(n) ? '"' + n + '"' : n;
    });
    if (result.length === 0) result = ['system-ui'];
    result.push('sans-serif');
    return result.join(', ');
  }

  // 等宽字体栈
  function buildMonoStack(str) {
    var list = normalizeFontList(str);
    if (list.length === 0) list = ['ui-monospace', 'Consolas'];
    var result = list.map(function (n) {
      return /\s/.test(n) ? '"' + n + '"' : n;
    });
    result.push('monospace');
    return result.join(', ');
  }

  // 生成文字阴影值（0 0 <size>px <rgba>），size<=0 返回 'none'
  function buildShadowCss(size, colorHex, alpha) {
    size = Number(size);
    if (!isFinite(size) || size <= 0) return 'none';
    size = clamp(size, 0, 4);
    var rgba = hexToRgba(colorHex, alpha);
    if (!rgba) return 'none';
    return '0 0 ' + size + 'px ' + rgba;
  }

  // 生成文字描边值（<width>px <color>），width<=0 返回 '0px transparent'
  function buildStrokeCss(width, colorHex) {
    width = Number(width);
    if (!isFinite(width) || width <= 0) return '0px transparent';
    width = clamp(width, 0, 0.2);
    var c = parseColor(colorHex) || '#000000';
    return width + 'px ' + c;
  }

  // 生成字体重写 @font-face：把列表内字体映射为 targetFont
  function buildFontFaceCss(targetFont, mappingList) {
    var list = Array.isArray(mappingList) ? mappingList : [];
    var parts = [];
    list.forEach(function (f) {
      if (!isString(f) || !f.trim()) return;
      var name = f.trim().replace(/^['"]|['"]$/g, '').trim();
      var src = (targetFont || '').trim().replace(/^['"]|['"]$/g, '').trim();
      if (!name || !src || name === src) return;
      parts.push('@font-face{font-family:"' + name + '";src:local("' + src + '");}');
    });
    return parts.join('');
  }

  // 通配符主机匹配：pattern 可精确、可 *.domain.com（匹配子域，不含根域本身）
  // 语义对齐业界惯例：`*.example.com` 匹配 `www.example.com`、`a.b.example.com`，不匹配 `example.com` 本身。
  function matchHost(host, pattern) {
    host = String(host || '').toLowerCase();
    pattern = String(pattern || '').trim().toLowerCase();
    if (!host || !pattern) return false;
    if (pattern === host) return true;
    if (pattern.charCodeAt(0) === 42 && pattern.length > 1) { // 42 = '*'
      return host.endsWith(pattern.slice(1));
    }
    return false;
  }

  function hostMatchesAny(host, patterns) {
    if (!Array.isArray(patterns)) return false;
    for (var i = 0; i < patterns.length; i++) {
      if (matchHost(host, patterns[i])) return true;
    }
    return false;
  }

  // 路径规则匹配：/regex/flags 形式走正则（对完整 href），否则前缀匹配
  function matchPathRule(rule, href, pathname) {
    if (!isString(rule) || !rule.trim()) return false;
    rule = rule.trim();
    var re = rule.match(/^\/((?:[^/\\]|\\.)+)\/([gimsuy]*)$/);
    if (re) {
      try {
        return new RegExp(re[1], re[2]).test(href || '');
      } catch (e) { return false; }
    }
    return (href || '').indexOf(rule) !== -1 || (pathname || '').indexOf(rule) !== -1;
  }

  function anyPathMatches(rules, href, pathname) {
    if (!Array.isArray(rules)) return false;
    for (var i = 0; i < rules.length; i++) {
      if (matchPathRule(rules[i], href, pathname)) return true;
    }
    return false;
  }

  // 判断当前站点是否应被排除（纯函数，不读 location）
  function isSiteExcluded(cfg, host, pathname, href) {
    if (!cfg || cfg.enabled === false) return true;
    if (cfg.filterMode === 'whitelist') {
      var inList = hostMatchesAny(host, cfg.includeSites) || anyPathMatches((cfg && cfg.rules) || [], href, pathname);
      return !inList;
    }
    return hostMatchesAny(host, cfg.excludeSites) || anyPathMatches(cfg.excludePaths, href, pathname);
  }

  // 是否应禁用字体重写（编辑器类站点 blacklist）
  function isEditorBlocked(host) {
    host = String(host || '').toLowerCase();
    if (!host) return false;
    for (var i = 0; i < EDITOR_BLOCKED_HOSTS.length; i++) {
      var b = EDITOR_BLOCKED_HOSTS[i];
      if (host === b || host.endsWith('.' + b)) return true;
    }
    return false;
  }

  // 归一化配置（补默认 + 类型/取值约束）
  function normalizeConfig(raw) {
    var merged = mergeObject(DEFAULT_CONFIG, isPlainObject(raw) ? raw : {});
    merged.enabled = merged.enabled !== false;
    if (typeof merged.preset !== 'string' || !PRESETS[merged.preset]) merged.preset = 'custom';
    merged.fontZh = isString(merged.fontZh) ? merged.fontZh : DEFAULT_CONFIG.fontZh;
    merged.fontEn = isString(merged.fontEn) ? merged.fontEn : DEFAULT_CONFIG.fontEn;
    merged.monospace = isString(merged.monospace) ? merged.monospace : DEFAULT_CONFIG.monospace;
    merged.antiAlias = merged.antiAlias !== false;
    merged.strokeEnabled = Boolean(merged.strokeEnabled);
    merged.strokeWidth = clamp(merged.strokeWidth, 0, 0.2);
    merged.strokeColor = parseColor(merged.strokeColor) || '#000000';
    merged.shadowEnabled = Boolean(merged.shadowEnabled);
    merged.shadowSize = clamp(merged.shadowSize, 0, 4);
    merged.shadowColor = parseColor(merged.shadowColor) || '#7c7c7c';
    merged.shadowAlpha = clamp(merged.shadowAlpha, 0, 1);
    merged.zoom = clamp(merged.zoom, 0.8, 2.5);
    merged.fontRewrite = merged.fontRewrite !== false;
    merged.filterMode = merged.filterMode === 'whitelist' ? 'whitelist' : 'blacklist';
    merged.excludeSites = Array.isArray(merged.excludeSites) ? merged.excludeSites.filter(isString) : DEFAULT_CONFIG.excludeSites.slice();
    merged.includeSites = Array.isArray(merged.includeSites) ? merged.includeSites.filter(isString) : [];
    merged.excludePaths = Array.isArray(merged.excludePaths) ? merged.excludePaths.filter(isString) : [];
    merged.includeSelectors = sanitizeCssValue(merged.includeSelectors) || 'body';
    merged.excludeSelectors = sanitizeCssValue(merged.excludeSelectors);
    return merged;
  }

  // 应用预设（传入预设名或预设对象，返回融合后的配置）
  function applyPreset(cfg, presetName) {
    var base = normalizeConfig(cfg);
    var fragment = PRESETS[presetName];
    if (!fragment) return base;
    return normalizeConfig(mergeObject(base, fragment));
  }

  // 组装最终注入的 CSS（核心渲染管线：字体重写→字体→抗锯齿→描边阴影→缩放→豁免）
  function buildStyleCss(cfg, host) {
    cfg = normalizeConfig(cfg);
    if (cfg.enabled === false) return '';

    var fontStack = buildFontStack(cfg.fontZh, cfg.fontEn);
    var monoStack = buildMonoStack(cfg.monospace);
    var shadow = cfg.shadowEnabled ? buildShadowCss(cfg.shadowSize, cfg.shadowColor, cfg.shadowAlpha) : 'none';
    var stroke = cfg.strokeEnabled ? buildStrokeCss(cfg.strokeWidth, cfg.strokeColor) : '0px transparent';
    var smoothing = cfg.antiAlias
      ? '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;'
      : '';
    var fontFace = (cfg.fontRewrite && !isEditorBlocked(host))
      ? buildFontFaceCss(cfg.fontZh, FONT_REWRITE_LIST)
      : '';

    var zoomCss = '';
    if (cfg.zoom !== 1.0) {
      zoomCss = '@supports (zoom:100%){html{zoom:' + cfg.zoom + ' !important;}}';
    }

    var include = cfg.includeSelectors;

    // 免渲染元素重置（豁免阴影/描边，保护图标字体与代码块）
    var excludeReset = '';
    if (cfg.excludeSelectors) {
      excludeReset = ':is(' + cfg.excludeSelectors + '){text-shadow:none !important;-webkit-text-stroke:0px transparent !important;}';
    }

    var root = ':root{--fr-family:' + fontStack + ';--fr-mono:' + monoStack + ';--fr-shadow:' + shadow + ';--fr-stroke:' + stroke + ';--fr-selection:#0969da33;}';
    var familyRules =
      'html,body{font-family:var(--fr-family);}' +
      'button,input,select,textarea,optgroup{font-family:inherit;}' +
      'pre,code,kbd,samp,var{font-family:var(--fr-mono);}';
    var effectRules = ':is(' + include + '){' + smoothing +
      'text-shadow:var(--fr-shadow);-webkit-text-stroke:var(--fr-stroke);}';
    var selectionRules = '::selection{color:currentcolor !important;background:var(--fr-selection) !important;text-shadow:none !important;-webkit-text-stroke:0 transparent !important;}';

    return fontFace + root + familyRules + effectRules + selectionRules + excludeReset + zoomCss;
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  // ---- 常量 ---------------------------------------------------------
  var TASK_ID = 'greasyfork-416688-1';
  var LS_KEY = 'xload-font-enhancer-settings';
  var LOG_KEY = 'xload-greasyfork-416688-1-logs';
  var STYLE_ID = 'xload-font-enhancer-style';
  // 面板入口（主站独立页；协议仅 http/https）
  var PANEL_URL = 'https://xload.net/scripts/userscripts/greasyfork-416688-1/panel.html';

  // ---- 日志系统 -----------------------------------------------------
  // 内存环形缓冲 + localStorage 持久化 + console；面板可查看/复制，便于排错。
  var LOG_RING = [];
  function log(tag, data) {
    var entry = { t: new Date().toISOString(), tag: tag, data: data == null ? null : data };
    LOG_RING.push(entry);
    if (LOG_RING.length > 300) LOG_RING.shift();
    try { console.log('[xload:greasyfork-416688-1]', tag, data == null ? '' : data); } catch (e) { /* ignore */ }
    try { window.localStorage.setItem(LOG_KEY, JSON.stringify(LOG_RING.slice(-60))); } catch (e) { /* ignore */ }
    return entry;
  }
  function logText() {
    return LOG_RING.map(function (e) {
      return '[' + e.t + '] ' + e.tag + (e.data != null ? ' ' + JSON.stringify(e.data) : '');
    }).join('\n');
  }
  function restoreLogs() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(LOG_KEY));
      if (Array.isArray(raw)) LOG_RING = raw.slice(-60);
    } catch (e) { /* ignore */ }
  }

  // ---- DOM 小工具 ---------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function noop() {}

  // ---- 样式注入 -----------------------------------------------------
  function addStyle(id, css) {
    removeStyle(id);
    var el = document.createElement('style');
    el.setAttribute('data-xload-id', id);
    el.textContent = css;
    (document.head || document.documentElement).appendChild(el);
    return el;
  }
  function removeStyle(id) {
    var el = $('style[data-xload-id="' + id + '"]');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ---- 配置读写 -----------------------------------------------------
  function loadConfig() {
    try {
      return normalizeConfig(JSON.parse(window.localStorage.getItem(LS_KEY)));
    } catch (e) {
      return normalizeConfig(null);
    }
  }
  var config = loadConfig();

  function persist(next, presetName) {
    next = presetName ? applyPreset(next, presetName) : normalizeConfig(next);
    if (presetName) next.preset = presetName;
    config = next;
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch (e) { /* ignore */ }
    return config;
  }

  // ---- 页面信息（供面板显示/排除） ----------------------------------
  function pageInfo() {
    var host = window.location.hostname || '';
    return {
      href: window.location.href,
      host: host,
      pathname: window.location.pathname,
      title: document.title || '',
      excluded: isSiteExcluded(config, host, window.location.pathname, window.location.href),
      editorBlocked: isEditorBlocked(host),
      enabled: config.enabled
    };
  }

  // ---- 字体检测（canvas 宽度比对，供面板填充字体列表） ----------------
  var FONT_CANDIDATES = [
    { ch: '微软雅黑', en: 'Microsoft YaHei UI' },
    { ch: '微软雅黑', en: 'Microsoft YaHei' },
    { ch: '苹方-简', en: 'PingFang SC' },
    { ch: '苹方-繁', en: 'PingFang TC' },
    { ch: '霞鹜文楷', en: 'LXGW WenKai' },
    { ch: '思源黑体', en: 'Source Han Sans SC' },
    { ch: '思源宋体', en: 'Source Han Serif SC' },
    { ch: '鸿蒙黑体', en: 'HarmonyOS Sans SC' },
    { ch: '更纱黑体 SC', en: 'Sarasa Gothic SC' },
    { ch: '冬青黑体简', en: 'Hiragino Sans GB' },
    { ch: '方正舒体', en: 'FZShuTi' },
    { ch: '华文楷体', en: 'STKaiti' },
    { ch: '华文仿宋', en: 'STFangsong' },
    { ch: '黑体', en: 'SimHei' },
    { ch: '宋体', en: 'SimSun' },
    { ch: '楷体', en: 'KaiTi' },
    { ch: 'Segoe UI', en: 'Segoe UI' },
    { ch: 'Arial', en: 'Arial' },
    { ch: 'Roboto', en: 'Roboto' }
  ];

  function canvasContext() {
    try {
      var c = document.createElement('canvas');
      c.width = 200; c.height = 60;
      return c.getContext('2d');
    } catch (e) { return null; }
  }

  function detectFont(ctx, probeText, baseWidth, baseWidthItalic, name) {
    try {
      ctx.font = '16px "' + name + '", monospace';
      return ctx.measureText(probeText).width !== baseWidth;
    } catch (e) { return null; }
  }

  function getFontList() {
    var result = [];
    try {
      var ctx = canvasContext();
      if (!ctx) return FONT_CANDIDATES.map(function (f) { return f.en; });
      var probe = '判断字體渲染 0123456789 abcABC';
      ctx.font = '16px monospace';
      var baseWidth = ctx.measureText(probe).width;
      FONT_CANDIDATES.forEach(function (f) {
        var ok = detectFont(ctx, probe, baseWidth, null, f.en);
        result.push({ zh: f.ch, en: f.en, available: !!ok });
      });
    } catch (e) {
      result = FONT_CANDIDATES.map(function (f) { return { zh: f.ch, en: f.en, available: null }; });
    }
    return result;
  }

  // ---- 面板通信（与 panel.js 的 PanelChannel 协议一致）---------------
  // 同源走 BroadcastChannel；跨源（面板在 xload、脚本在本页）走
  // window.open(面板) → 面板 opener.postMessage → 脚本监听 message 并用 event.source 回包。
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
      if (m._from && m._from !== taskId) return;
      m._source = ev.source;
      dispatch(m);
    }
    window.addEventListener('message', onWindowMessage);

    return {
      send: function (type, data) {
        var m = { type: type, data: data == null ? {} : data, _from: taskId };
        if (panelWin) { try { panelWin.postMessage(m, '*'); } catch (e) { /* ignore */ } }
        if (bc) { try { bc.postMessage(m); } catch (e) { /* ignore */ } }
      },
      reply: function (msg, data) {
        if (!msg || msg._id == null || !msg._request) return;
        var m = { type: msg.type, data: data == null ? {} : data, _id: msg._id, _from: taskId };
        if (msg._source) { try { msg._source.postMessage(m, '*'); } catch (e) { /* ignore */ } }
        if (bc) { try { bc.postMessage(m); } catch (e) { /* ignore */ } }
      },
      on: function (type, h) { (handlers[type] = handlers[type] || []).push(h); },
      setPanelWin: function (w) { panelWin = w; }
    };
  }

  var channel = createChannel(TASK_ID);

  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });
      var resp;
      if (action === 'queryConfig') {
        resp = { ok: true, config: config, page: pageInfo() };
      } else if (action === 'applyConfig') {
        persist(data.config || {});
        applyStyle();
        resp = { ok: true, config: config, page: pageInfo() };
      } else if (action === 'resetConfig') {
        config = normalizeConfig(null);
        try { window.localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
        applyStyle();
        resp = { ok: true, config: config };
      } else if (action === 'applyPreset') {
        persist(config, data.preset || 'balanced');
        applyStyle();
        resp = { ok: true, config: config };
      } else if (action === 'getPageInfo') {
        resp = { ok: true, page: pageInfo() };
      } else if (action === 'getFontList') {
        resp = { ok: true, fonts: getFontList() };
      } else if (action === 'getLogs') {
        resp = { ok: true, logs: logText() };
      } else {
        resp = { ok: false, error: '未知命令: ' + action };
      }
      channel.reply(msg, resp);
    });
  }

  // ---- 渲染应用 -----------------------------------------------------
  function applyStyle() {
    var host = window.location.hostname || '';
    var excluded = isSiteExcluded(config, host, window.location.pathname, window.location.href);
    if (excluded || config.enabled === false) {
      removeStyle(STYLE_ID);
      log('render.skip', { host: host, excluded: excluded });
      return;
    }
    var css = buildStyleCss(config, host);
    if (!css) { removeStyle(STYLE_ID); return; }
    addStyle(STYLE_ID, css);
    log('render.apply', { host: host, len: css.length });
  }

  function fullCleanup() {
    removeStyle(STYLE_ID);
    log('render.cleanup', {});
  }

  // ---- 面板入口（独立页弹窗：window.open + moveTo 居中）------------
  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    restoreLogs();
    log('panel.open', { url: PANEL_URL });
    try {
      var W = Math.min(900, Math.max(440, (window.screen.availWidth || 1280) - 120));
      var H = Math.min(800, Math.max(520, (window.screen.availHeight || 900) - 140));
      var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
      var T = Math.max(0, Math.round(((window.screen.availHeight || 900) - H) / 2));
      var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T +
        ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
      var w = window.open(PANEL_URL, '_blank', features);
      var result = { opened: !!w, requestedW: W, requestedH: H, left: L, top: T };
      if (w) {
        try { w.moveTo(L, T); w.resizeTo(W, H); } catch (e) { /* 部分浏览器跨源受限 */ }
        channel.setPanelWin(w);
      }
      log('panel.open.result', result);
      return !!w;
    } catch (e) {
      log('panel.open.error', { message: String(e && e.message || e) });
      return false;
    }
  }

  function injectFab() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '字体渲染';
    btn.setAttribute('data-xload-fab', TASK_ID);
    btn.style.cssText = 'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
      'padding:10px 14px;border:0;border-radius:20px;background:#4f46e5;color:#fff;' +
      'font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92;';
    btn.addEventListener('click', openPanel);
    document.body.appendChild(btn);
  }

  // 快捷键唤出面板（Alt+F），避免与页面输入冲突
  function bindHotkey() {
    document.addEventListener('keydown', function (ev) {
      if (ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && (ev.key === 'f' || ev.key === 'F')) {
        ev.preventDefault();
        openPanel();
      }
    }, true);
  }

  // ---- 启动 ---------------------------------------------------------
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function injectStyleWhenReady() {
    var ok = false;
    function tryInject() {
      if (ok) return;
      if (document.head || document.documentElement) {
        ok = true;
        applyStyle();
        return;
      }
      setTimeout(tryInject, 30);
    }
    tryInject();
  }

  function init() {
    log('init.start', { ua: navigator.userAgent.slice(0, 80), readyState: document.readyState });
    try {
      injectStyleWhenReady();
      registerChannelHandlers();
      bindHotkey();
      whenReady(function () {
        try { injectFab(); log('init.fab.ok', {}); } catch (e) { log('init.fab.error', { message: String(e && e.message || e) }); }
      });
      log('init.done', { enabled: config.enabled, preset: config.preset });
    } catch (e) {
      log('init.error', { message: String(e && e.message || e) });
    }
  }

  whenReady(init);
})();