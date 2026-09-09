// ==UserScript==
// @name         通用小说下载器
// @name:zh-CN   通用小说下载器
// @name:en      NovelFetch - Universal Novel Downloader
// @namespace    https://github.com/u2222223/xload
// @version      1.0.2
// @description  一个可扩展的通用型小说下载器：在小说目录页一键抓取章节，自动生成 TXT 纯文本与 EPUB 电子书，支持章节筛选、自定义命名、并发下载与进度实时显示。
// @author       xload
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无网络副作用，可独立单测）
  // ===================================================================

  // 默认设置（全新 schema：NovelFetch）
  var DEFAULT_SETTINGS = {
    formats: { txt: true, epub: true, htmlzip: false }, // 输出格式：TXT / EPUB / HTML(ZIP)
    chapterTitleTemplate: '{index} {title}',            // 章节命名模板：{index} {title} {book}
    txtIndent: '　',                                     // TXT 每段缩进（默认为全角空格）
    epubAuthor: '',                                     // EPUB 元数据作者（留空取站点作者）
    concurrency: 3,                                     // 并发下载线程数 1-10
    interval: 200,                                      // 下载间隔基数（毫秒）
    maxInterval: 2000,                                  // 下载间隔最大值（毫秒）
    retry: 2,                                           // 每个章节失败重试次数
    autoRetry: true,                                    // 失败章节自动重试
    chapterRange: '',                                   // 章节范围："1-100" / "1,3,5" / 空=全部
    keywordFilter: '',                                  // 章节标题关键词过滤
    tokenOptions: {},                                   // 各站点登录 token/Cookie（按站点域名键存储）
    excludeSites: ['127.0.0.1', 'localhost', 'xload.net', 'u2222223.github.io'] // 排除站点（含宿主站点）
  };

  // 外链协议白名单：仅允许 http/https（用于链接、图片、窗口打开等）
  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  // 主机名匹配（支持 '*.example.com' 通配子域 / 精确域名）
  function hostMatches(host, pattern) {
    host = String(host || '').toLowerCase();
    pattern = String(pattern || '').toLowerCase().trim();
    if (!pattern) return false;
    if (pattern.indexOf('*.') === 0) {
      var suffix = pattern.slice(1);             // 形如 '.example.com'
      var base = pattern.slice(2);               // 形如 'example.com'
      return host.endsWith(suffix) || host === base;
    }
    return host === pattern;
  }

  // 浅合并：以 base 为基础，patch 覆盖（纯函数）
  function mergeSettings(base, patch) {
    var out = {}, key;
    for (key in base) if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key];
    if (patch && typeof patch === 'object') {
      for (key in patch) if (Object.prototype.hasOwnProperty.call(patch, key)) out[key] = patch[key];
    }
    return out;
  }

  // 归一化配置（补默认值 + 类型/取值约束，纯函数）
  function normalizeSettings(raw) {
    var m = mergeSettings(DEFAULT_SETTINGS, raw && typeof raw === 'object' ? raw : {});
    if (!m.formats || typeof m.formats !== 'object') m.formats = { txt: true, epub: true, htmlzip: false };
    m.formats.txt = Boolean(m.formats.txt);
    m.formats.epub = Boolean(m.formats.epub);
    m.formats.htmlzip = Boolean(m.formats.htmlzip);
    if (!m.formats.txt && !m.formats.epub && !m.formats.htmlzip) m.formats.txt = true;
    if (typeof m.chapterTitleTemplate !== 'string' || m.chapterTitleTemplate.indexOf('{') < 0) {
      m.chapterTitleTemplate = '{index} {title}';
    }
    m.txtIndent = typeof m.txtIndent === 'string' ? m.txtIndent : '　';
    m.epubAuthor = typeof m.epubAuthor === 'string' ? m.epubAuthor : '';
    m.concurrency = Math.max(1, Math.min(10, Math.floor(Number(m.concurrency) || 3)));
    m.interval = Math.max(0, Math.floor(Number(m.interval) || 0));
    m.maxInterval = Math.max(0, Math.floor(Number(m.maxInterval) || 0));
    m.retry = Math.max(0, Math.min(10, Math.floor(Number(m.retry) || 0)));
    m.autoRetry = Boolean(m.autoRetry);
    m.chapterRange = typeof m.chapterRange === 'string' ? m.chapterRange : '';
    m.keywordFilter = typeof m.keywordFilter === 'string' ? m.keywordFilter : '';
    m.tokenOptions = (m.tokenOptions && typeof m.tokenOptions === 'object') ? m.tokenOptions : {};
    m.excludeSites = Array.isArray(m.excludeSites)
      ? m.excludeSites.filter(function (x) { return typeof x === 'string'; })
      : DEFAULT_SETTINGS.excludeSites.slice();
    return m;
  }

  // 章节范围解析："1-100"、"1,3,5-10"；空/非法返回 null（表示全选）。
  // 返回升序去重的 1-based 章节序号数组。
  function parseRange(text, max) {
    if (typeof text !== 'string' || !text.trim()) return null;
    var parts = text.split(','), out = [], seen = {};
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var m = p.match(/^(\d+)\s*-\s*(\d+)$/), start, end;
      if (m) { start = parseInt(m[1], 10); end = parseInt(m[2], 10); }
      else if (/^\d+$/.test(p)) { start = end = parseInt(p, 10); }
      else continue;
      if (end < start) { var t = start; start = end; end = t; }
      if (max > 0) { start = Math.max(1, start); end = Math.min(max, end); }
      for (var k = start; k <= end; k++) if (!seen[k]) { seen[k] = 1; out.push(k); }
    }
    if (!out.length) return null;
    out.sort(function (a, b) { return a - b; });
    return out;
  }

  // 依据范围 + 关键词筛选章节（chapters 以 index 为 1-based 序号）
  function selectChapters(chapters, opts) {
    var range = parseRange(opts.chapterRange, chapters.length);
    var kw = String(opts.keywordFilter || '').trim().toLowerCase();
    var out = [];
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      if (range && range.indexOf(ch.index) < 0) continue;
      if (kw && String(ch.title || '').toLowerCase().indexOf(kw) < 0) continue;
      out.push(ch);
    }
    return out;
  }

  // 章节章节命名模板，替换 {index}/{title}/{book}
  function renderTitle(template, chapter) {
    var t = (template && template.indexOf('{') >= 0) ? template : '{index} {title}';
    return String(t)
      .replace(/\{index\}/g, String(chapter.index == null ? '' : chapter.index))
      .replace(/\{title\}/g, String(chapter.title == null ? '' : chapter.title))
      .replace(/\{book\}/g, String(chapter.bookname == null ? '' : chapter.bookname));
  }

  // 章节按卷（sectionIndex）分组，返回 [{index, name, chapters:[...]}]
  function groupChapters(chapters) {
    var groups = [], map = {}, order = [];
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var key = ch.sectionIndex == null ? 0 : ch.sectionIndex;
      var name = ch.sectionName || '';
      if (map[key] == null) { map[key] = { index: key, name: name, chapters: [] }; order.push(key); }
      map[key].chapters.push(ch);
    }
    for (var j = 0; j < order.length; j++) groups.push(map[order[j]]);
    return groups;
  }

  // 章节去重（按 chapterUrl，保留第一次出现）
  function dedupChapters(chapters) {
    var seen = {}, out = [];
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var u = ch.url || ch.chapterUrl || '';
      if (!u || seen[u]) continue;
      seen[u] = 1;
      out.push(ch);
    }
    return out;
  }

  // 正文文本清洗：统一换行、压缩空白、合并多余空行、去首尾空白
  function cleanText(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t\u3000]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // 文件名安全化：去除非法字符，限制长度
  function sanitizeFilename(name) {
    var s = String(name || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim();
    if (!s) s = '未命名';
    return s.length > 120 ? s.slice(0, 120) : s;
  }

  // XML/HTML 文本转义
  function escapeXml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // 相对 URL 转绝对 URL（基于基准地址）
  function absUrl(base, href) {
    try { return new URL(href, base).href; } catch (e) { return href; }
  }

  // ---- ZIP(store) 打包：用于 EPUB / HTML 压缩包 ----
  var CRC_TABLE = (function () {
    var t = new Array(256), n, c, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(u8) {
    var c = 0xFFFFFFFF, i;
    for (i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // 构建 STORE（无压缩）ZIP；entries: [{name, data:Uint8Array}]
  function buildZipStore(entries) {
    var enc = new TextEncoder();
    var locals = [], central = [], offset = 0, i;
    for (i = 0; i < entries.length; i++) {
      var nameU8 = enc.encode(entries[i].name);
      var data = entries[i].data;
      var crc = crc32(data);
      var size = data.length;
      var local = new Uint8Array(30 + nameU8.length + size);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true); dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true); dv.setUint32(18, size, true); dv.setUint32(22, size, true);
      dv.setUint16(26, nameU8.length, true); dv.setUint16(28, 0, true);
      local.set(nameU8, 30); local.set(data, 30 + nameU8.length);
      locals.push(local);
      var cd = new Uint8Array(46 + nameU8.length);
      var cddv = new DataView(cd.buffer);
      cddv.setUint32(0, 0x02014b50, true);
      cddv.setUint16(4, 20, true); cddv.setUint16(6, 20, true); cddv.setUint16(8, 0, true);
      cddv.setUint16(10, 0, true); cddv.setUint16(12, 0, true); cddv.setUint16(14, 0, true);
      cddv.setUint32(16, crc, true); cddv.setUint32(20, size, true); cddv.setUint32(24, size, true);
      cddv.setUint16(28, nameU8.length, true);
      cddv.setUint16(30, 0, true); cddv.setUint16(32, 0, true); cddv.setUint16(34, 0, true);
      cddv.setUint32(38, 0, true); cddv.setUint32(42, offset, true);
      cd.set(nameU8, 46);
      central.push(cd);
      offset += local.length;
    }
    var centralSize = 0;
    for (i = 0; i < central.length; i++) centralSize += central[i].length;
    var end = new Uint8Array(22);
    var edv = new DataView(end.buffer);
    edv.setUint32(0, 0x06054b50, true);
    edv.setUint16(4, 0, true); edv.setUint16(6, 0, true);
    edv.setUint16(8, entries.length, true); edv.setUint16(10, entries.length, true);
    edv.setUint32(12, centralSize, true); edv.setUint32(16, offset, true);
    edv.setUint16(20, 0, true);
    var out = new Uint8Array(offset + centralSize + 22), pos = 0, j;
    for (j = 0; j < locals.length; j++) { out.set(locals[j], pos); pos += locals[j].length; }
    for (j = 0; j < central.length; j++) { out.set(central[j], pos); pos += central[j].length; }
    out.set(end, pos);
    return out;
  }

  // 组装 TXT 全文（返回字符串）
  function buildTxt(chapters, opts) {
    var indent = opts.txtIndent != null ? opts.txtIndent : '　';
    var lines = [];
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      lines.push(renderTitle(opts.chapterTitleTemplate, ch));
      lines.push('');
      var paras = cleanText(ch.text || '').split('\n');
      for (var j = 0; j < paras.length; j++) {
        var p = paras[j].trim();
        if (!p) continue;
        lines.push(indent + p);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  // 组装 EPUB 文件（返回 [{name, data:Uint8Array}]，供 buildZipStore 打包）
  function buildEpubFiles(book, chapters, opts) {
    var enc = new TextEncoder();
    var uid = 'novelfetch-' + (opts.uid != null ? opts.uid : Date.now());
    var title = book.title || 'download';
    var author = (opts.epubAuthor || book.author || 'Unknown');
    var lang = 'zh';
    var entries = [];
    var manifest = [], spine = [], chapterFiles = [];
    var i;
    for (i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var id = 'ch' + (i + 1);
      var href = 'text/chapter-' + (i + 1) + '.xhtml';
      var titleTxt = renderTitle(opts.chapterTitleTemplate, ch);
      var ps = cleanText(ch.text || '').split('\n');
      var bodyHtml = '';
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j].trim();
        if (!p) continue;
        bodyHtml += '<p>' + escapeXml(p) + '</p>\n';
      }
      var xhtml = '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<!DOCTYPE html>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="' + lang + '">' +
        '<head><title>' + escapeXml(titleTxt) + '</title></head>' +
        '<body><h2>' + escapeXml(titleTxt) + '</h2>\n' + bodyHtml + '</body></html>';
      entries.push({ name: 'OEBPS/' + href, data: enc.encode(xhtml) });
      manifest.push({ id: id, href: href });
      spine.push({ id: id });
      chapterFiles.push({ id: id, title: titleTxt, href: href });
    }
    // content.opf
    var manItems = manifest.map(function (m) {
      return '<item id="' + m.id + '" href="' + m.href + '" media-type="application/xhtml+xml"/>';
    }).join('\n');
    var spineItems = spine.map(function (s) { return '<itemref idref="' + s.id + '"/>'; }).join('\n');
    var opf = '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">' +
      '<dc:title>' + escapeXml(title) + '</dc:title>' +
      '<dc:creator opf:role="aut">' + escapeXml(author) + '</dc:creator>' +
      '<dc:language>' + lang + '</dc:language>' +
      '<dc:identifier id="BookId" opf:scheme="UUID">' + escapeXml(uid) + '</dc:identifier>' +
      '</metadata>' +
      '<manifest>' + manItems +
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>' +
      '</manifest>' +
      '<spine toc="ncx">' + spineItems + '</spine>' +
      '</package>';
    entries.push({ name: 'OEBPS/content.opf', data: enc.encode(opf) });
    // toc.ncx
    var navPoints = chapterFiles.map(function (c, idx) {
      return '<navPoint id="np' + (idx + 1) + '" playOrder="' + (idx + 1) + '">' +
        '<navLabel><text>' + escapeXml(c.title) + '</text></navLabel>' +
        '<content src="' + c.href + '"/>' +
        '</navPoint>';
    }).join('\n');
    var ncx = '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">' +
      '<head><meta name="dtb:uid" content="' + escapeXml(uid) + '"/></head>' +
      '<docTitle><text>' + escapeXml(title) + '</text></docTitle>' +
      '<navMap>' + navPoints + '</navMap></ncx>';
    entries.push({ name: 'OEBPS/toc.ncx', data: enc.encode(ncx) });
    // container.xml
    var container = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>' +
      '</rootfiles></container>';
    entries.push({ name: 'META-INF/container.xml', data: enc.encode(container) });
    // mimetype 必须第一且 STORE
    var mimetype = { name: 'mimetype', data: enc.encode('application/epub+zip') };
    entries.unshift(mimetype);
    return entries;
  }

  // 组装 HTML（可直接浏览）章节列表，返回 [{name, data}] 供 ZIP 打包
  function buildHtmlFiles(book, chapters, opts) {
    var enc = new TextEncoder();
    var entries = [];
    var toc = '<html><head><meta charset="utf-8"><title>' + escapeXml(book.title || '') + '</title></head><body><h1>' +
      escapeXml(book.title || '') + '</h1><ul>';
    var i;
    for (i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var fname = 'chapter-' + (i + 1) + '.html';
      var titleTxt = renderTitle(opts.chapterTitleTemplate, ch);
      var ps = cleanText(ch.text || '').split('\n');
      var bodyHtml = '';
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j].trim();
        if (!p) continue;
        bodyHtml += '<p>' + escapeXml(p) + '</p>\n';
      }
      toc += '<li><a href="' + fname + '">' + escapeXml(titleTxt) + '</a></li>';
      entries.push({
        name: fname,
        data: enc.encode('<html><head><meta charset="utf-8"><title>' + escapeXml(titleTxt) +
          '</title></head><body><h2>' + escapeXml(titleTxt) + '</h2>\n' + bodyHtml + '</body></html>')
      });
    }
    toc += '</ul></body></html>';
    entries.unshift({ name: 'index.html', data: enc.encode(toc) });
    return entries;
  }

  // 从 Content-Type 头解析 charset（小写），失败返回 null
  function charsetFromContentType(ct) {
    if (typeof ct !== 'string') return null;
    var m = ct.match(/charset\s*=\s*["']?([\w-]+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  // ---- 常量 ---------------------------------------------------------
  var TASK_ID = 'greasyfork-406070-1';
  var LS_SETTINGS_KEY = 'xload-novelfetch-settings';
  var LS_HISTORY_KEY = 'xload-novelfetch-history';
  var LOG_KEY = 'xload-greasyfork-406070-1-logs';
  // 面板入口（主站独立页；协议仅 http/https）
  var PANEL_URL = 'https://xload.net/scripts/userscripts/greasyfork-406070-1/panel.html';

  // ---- 日志系统 -----------------------------------------------------
  // 内存环形缓冲 + localStorage 持久化 + console；面板内可查看/复制，便于排错。
  var LOG_RING = [];
  function log(tag, data) {
    var entry = { t: new Date().toISOString(), tag: tag, data: data == null ? null : data };
    LOG_RING.push(entry);
    if (LOG_RING.length > 300) LOG_RING.shift();
    try { console.log('[xload:greasyfork-406070-1]', tag, data == null ? '' : data); } catch (e) { /* ignore */ }
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
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function firstText(selectors, root, stripPrefix) {
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = $(selectors[i], root);
        if (el && el.innerText) {
          var t = el.innerText.trim();
          if (stripPrefix) t = t.replace(stripPrefix, '').trim();
          if (t) return t;
        }
      } catch (e) { /* ignore */ }
    }
    return '';
  }

  // ---- 存储读写（@grant none 走 localStorage）----
  // 命名与网络请求 httpGet 严格区分，避免函数重名覆盖（历史排错红线）
  function storeGet(key, def) {
    try {
      var s = window.localStorage.getItem(key);
      return (s == null) ? def : JSON.parse(s);
    } catch (e) { return def; }
  }
  function storeSet(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  // ---- 设置读写 -----------------------------------------------------
  function loadSettings() {
    try { return normalizeSettings(storeGet(LS_SETTINGS_KEY, null)); }
    catch (e) { return normalizeSettings(null); }
  }
  var settings = loadSettings();
  function persist(next) {
    settings = normalizeSettings(next);
    try { storeSet(LS_SETTINGS_KEY, settings); } catch (e) { /* ignore */ }
    return settings;
  }

  // ---- 任务历史 -----------------------------------------------------
  function loadHistory() {
    var h = storeGet(LS_HISTORY_KEY, null);
    return Array.isArray(h) ? h : [];
  }
  function pushHistory(item) {
    try {
      var h = loadHistory().filter(function (x) { return x && x.title && x.url !== item.url; });
      var rec = { time: Date.now() };
      for (var k in item) if (Object.prototype.hasOwnProperty.call(item, k)) rec[k] = item[k];
      h.unshift(rec);
      if (h.length > 50) h = h.slice(0, 50);
      storeSet(LS_HISTORY_KEY, h);
    } catch (e) { /* ignore */ }
  }

  // ---- 主机排除（宿主站点）-----------------------------------------
  function isSelfHost(host) {
    host = String(host || '').toLowerCase();
    return host === 'xload.net' || host.endsWith('.xload.net') ||
      host === 'u2222223.github.io' || host.endsWith('.u2222223.github.io');
  }
  function isExcludedHost(host) {
    if (isSelfHost(host)) return true;
    for (var i = 0; i < settings.excludeSites.length; i++) {
      if (hostMatches(host, settings.excludeSites[i])) return true;
    }
    return false;
  }

  // ---- 网络请求（@grant none 同源 fetch）----------------------------
  function httpGet(url, opts) {
    opts = opts || {};
    if (!isSafeUrl(url)) return Promise.reject(new Error('不允许的 URL：' + url));
    var init = { method: opts.method || 'GET', credentials: 'same-origin' };
    if (opts.timeout) {
      var ctl = new AbortController();
      init.signal = ctl.signal;
      var timer = setTimeout(function () { ctl.abort(); }, opts.timeout);
    }
    return fetch(url, init).then(function (resp) {
      if (!resp.ok && resp.status !== 0) throw new Error('HTTP ' + resp.status + ' ' + url);
      var ct = resp.headers.get('content-type') || opts.contentType || '';
      var cs = charsetFromContentType(ct) || opts.charset || document.characterSet || 'utf-8';
      return resp.arrayBuffer().then(function (buf) {
        var text = decodeBuffer(buf, cs);
        return { url: url, text: text, status: resp.status };
      });
    }).finally(function () { if (timer) clearTimeout(timer); });
  }
  function decodeBuffer(buf, charset) {
    var cs = String(charset || '').toLowerCase();
    if (!cs || cs === 'utf-8' || cs === 'utf8') return new TextDecoder('utf-8').decode(buf);
    try { return new TextDecoder(cs).decode(buf); } catch (e) { return new TextDecoder('utf-8').decode(buf); }
  }
  function parseHtml(html, baseUrl) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    try {
      var base = doc.createElement('base');
      base.href = baseUrl;
      doc.head.appendChild(base);
    } catch (e) { /* ignore */ }
    return doc;
  }

  // ---- 适配器（站点规则注册制，函数式）------------------------------
  // 每个 adapter：{ id, name, match(host, pathname, doc), parseBook(doc, url), parseChapter(doc, url, chapter) }
  var adapters = [];

  function registerAdapter(a) {
    if (a && a.id) adapters.push(a);
  }

  // 页码事实照抄核对：笔趣阁类站点选择器（#list a / .listmain a / #content 等）
  var BIQUGE = {
    titleSel: ['#info h1', '.info h2', '.info h1', '#bookinfo h1'],
    authorSel: ['#info > p:nth-child(2)', '#info > div:nth-child(2)', '.info .author', '.small > span:nth-child(1)'],
    authorPrefix: /作\s*者[：:]\s*/,
    introSel: ['#intro', '.intro', '.book-intro', '.desc'],
    coverSel: ['#fmimg > img', '.info > .cover > img', '.book-boxs > .img > img', '.imgbox > img'],
    chapterSel: ['#list a', '.listmain a', '.book-item a', '#chapterlist a'],
    sectionSel: ['#list dt', '.listmain dt', '.layout-tit'],
    contentSel: ['#content', '#chaptercontent', '.showtxt', '.content-txt', '#booktext']
  };

  function collectSections(doc) {
    // 返回 [{el, name}] 或 []（无分卷）
    var sels = BIQUGE.sectionSel, res = [];
    for (var s = 0; s < sels.length; s++) {
      var els = $$(sels[s], doc);
      if (els && els.length) {
        for (var i = 0; i < els.length; i++) {
          res.push({ el: els[i], name: (els[i].innerText || '').trim() });
        }
        break;
      }
    }
    return res;
  }

  // 依据分卷元素与章节链接顺序，给章节分配 sectionName/sectionIndex
  function assignSections(doc, links) {
    var sections = collectSections(doc);
    if (!sections.length) {
      return links.map(function (l) { return { a: l, sectionName: '', sectionIndex: 0 }; });
    }
    var order = []; // 把 dt 与 dd 按文档顺序排布
    var root = doc.body;
    var walk = function (node) {
      if (!node) return;
      if (node.nodeType === 1) {
        var isSection = sections.some(function (s) { return s.el === node; });
        var isLink = links.some(function (l) { return l.a === node; });
        if (isSection) { order.push({ type: 's', el: node }); return; }
        if (isLink) { order.push({ type: 'l', el: node }); return; }
        for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
      }
    };
    walk(root);
    var out = [], curSection = null, curIndex = 0;
    var linkLookup = {};
    links.forEach(function (l) { linkLookup[l.a] = l; });
    order.forEach(function (o) {
      if (o.type === 's') { curSection = (o.el.innerText || '').trim(); curIndex++; }
      else if (o.type === 'l' && linkLookup[o.el]) {
        out.push({ a: o.el, sectionName: curSection || '', sectionIndex: curIndex });
      }
    });
    // 兜底：未匹配到的链接直接追加
    links.forEach(function (l) {
      var already = out.some(function (o) { return o.a === l.a; });
      if (!already) out.push({ a: l.a, sectionName: '', sectionIndex: 0 });
    });
    return out;
  }

  function biqugeAdapter() {
    return {
      id: 'biquge',
      name: '笔趣阁类（通用）',
      match: function (host, pathname, doc) {
        // 命中关键列表/正文选择器即视为可解析（覆盖大量笔趣阁系站点）
        var hasList = 0;
        for (var i = 0; i < BIQUGE.chapterSel.length; i++) hasList += $$(BIQUGE.chapterSel[i], doc).length;
        return hasList >= 5;
      },
      parseBook: async function (doc, url) {
        var title = firstText(BIQUGE.titleSel, doc, /最新章节$/);
        var author = firstText(BIQUGE.authorSel, doc, BIQUGE.authorPrefix);
        var introEl = null;
        for (var i = 0; i < BIQUGE.introSel.length; i++) { introEl = $(BIQUGE.introSel[i], doc); if (introEl) break; }
        var cover = null;
        for (var j = 0; j < BIQUGE.coverSel.length; j++) { var c = $(BIQUGE.coverSel[j], doc); if (c) { cover = c.src || c.getAttribute('src') || null; break; } }
        if (cover && !isSafeUrl(cover)) cover = null;
        var links = [];
        for (var k = 0; k < BIQUGE.chapterSel.length; k++) {
          var els = $$(BIQUGE.chapterSel[k], doc);
          if (els && els.length) { els.forEach(function (a) { links.push(a); }); break; }
        }
        links = links.filter(function (a) {
          var href = a.getAttribute('href');
          return href && href !== '#' && !/^javascript:/i.test(href);
        });
        var assigned = assignSections(doc, links);
        var chapters = [];
        assigned.forEach(function (o, idx) {
          var href = o.a.getAttribute('href');
          var abs = absUrl(url, href);
          if (!isSafeUrl(abs)) return;
          chapters.push({
            index: idx + 1,
            title: (o.a.innerText || '').trim(),
            url: abs,
            isVip: false,
            sectionName: o.sectionName,
            sectionIndex: o.sectionIndex
          });
        });
        chapters = dedupChapters(chapters);
        return {
          title: title || document.title || '',
          author: author,
          site: (new URL(url)).hostname,
          url: url,
          cover: cover,
          intro: introEl ? (introEl.innerText || '').trim() : '',
          chapters: chapters
        };
      },
      parseChapter: async function (doc, url, chapter) {
        var content = null;
        for (var i = 0; i < BIQUGE.contentSel.length; i++) { content = $(BIQUGE.contentSel[i], doc); if (content) break; }
        if (!content) throw new Error('未找到正文（可能被反爬拦截或结构变化）');
        // 移除广告/脚本/内链，保留文本
        $$('script, style, noscript', content).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        var html = content.innerHTML || '';
        // <br> 转换行
        var text = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6])>/gi, '\n').replace(/<[^>]+>/g, '');
        return { text: cleanText(text) };
      }
    };
  }

  function fanqieAdapter() {
    return {
      id: 'fanqie',
      name: '番茄小说',
      match: function (host) { return host.indexOf('fanqienovel.com') >= 0; },
      parseBook: async function (doc, url) {
        var title = firstText(['.info-name h1', '.book-name'], doc);
        var author = firstText(['.author-name'], doc) || '未知';
        var introEl = $('.page-abstract-content', doc) || $('.abstract', doc);
        var sectionList = $('.page-directory-content', doc);
        var chapters = [];
        if (sectionList) {
          var nodes = Array.prototype.slice.call(sectionList.childNodes);
          var secName = '', secIdx = 0, idx = 0;
          nodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            var vol = $('div.volume', node);
            if (vol) { secName = (vol.innerText || '').trim(); secIdx++; return; }
            $$('div.chapter-item', node).forEach(function (c) {
              var a = $('a', c);
              if (!a) return;
              idx++;
              var href = absUrl(url, a.getAttribute('href'));
              if (!isSafeUrl(href)) return;
              chapters.push({
                index: idx,
                title: (a.innerText || '').trim(),
                url: href,
                isVip: !!$('.chapter-item-lock', c),
                sectionName: secName,
                sectionIndex: secIdx
              });
            });
          });
        }
        return {
          title: title, author: author, site: 'fanqienovel.com', url: url,
          cover: null, intro: introEl ? (introEl.innerText || '').trim() : '', chapters: chapters
        };
      },
      parseChapter: async function (doc, url, chapter) {
        // 番茄免费章节正文在文章容器内；VIP 章节需登录/第三方 API（超范围，见 README）
        var content = $('.muye-reader-content', doc) || $('.article-content', doc) || $('.chapter-content', doc);
        if (!content) return { text: '' };
        var html = (content.innerHTML || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div)>/gi, '\n').replace(/<[^>]+>/g, '');
        return { text: cleanText(html) };
      }
    };
  }

  function genericAdapter() {
    return {
      id: 'generic',
      name: '通用启发式',
      match: function (host, pathname, doc) {
        return $$('a[href]', doc).length >= 20;
      },
      parseBook: async function (doc, url) {
        // 兜底：找标题 + 正文页常见的章节链接集合
        var title = document.title || '';
        var links = $$('a[href]', doc).filter(function (a) {
          var t = (a.innerText || '').trim();
          var href = a.getAttribute('href');
          return href && t && /(章|节|回|话|第)/.test(t) && !/^javascript:/i.test(href);
        });
        if (!links.length) throw new Error('未能识别章节列表，此站点需要为其编写适配器');
        var chapters = links.slice(0, 5000).map(function (a, idx) {
          var abs = absUrl(url, a.getAttribute('href'));
          return { index: idx + 1, title: (a.innerText || '').trim(), url: abs, isVip: false, sectionName: '', sectionIndex: 0 };
        });
        chapters = dedupChapters(chapters.filter(function (c) { return isSafeUrl(c.url); }));
        return { title: title, author: '', site: (new URL(url)).hostname, url: url, cover: null, intro: '', chapters: chapters };
      },
      parseChapter: async function (doc, url, chapter) {
        var content = $('#content', doc) || $('#chaptercontent', doc) || $('.showtxt', doc) || $('article', doc);
        if (!content) content = doc.body;
        var html = (content.innerHTML || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '');
        return { text: cleanText(html) };
      }
    };
  }

  registerAdapter(fanqieAdapter());
  registerAdapter(biqugeAdapter());
  registerAdapter(genericAdapter());

  function matchAdapter() {
    var host = window.location.hostname || '';
    var pathname = window.location.pathname || '';
    for (var i = 0; i < adapters.length; i++) {
      try {
        if (adapters[i].match(host, pathname, document)) return adapters[i];
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  // ---- 抓取目录（在当前页）-----------------------------------------
  var cachedCatalog = null;
  async function getCatalog(force) {
    if (cachedCatalog && !force) return cachedCatalog;
    var adapter = matchAdapter();
    if (!adapter) throw new Error('当前页面不是受支持的小说目录页');
    var host = window.location.hostname || '';
    if (isExcludedHost(host)) throw new Error('已排除该站点');
    var book = await adapter.parseBook(document, window.location.href);
    if (!book || !book.chapters || !book.chapters.length) throw new Error('未抓取到章节列表');
    cachedCatalog = { adapterId: adapter.id, adapterName: adapter.name, adapter: adapter, book: book };
    return cachedCatalog;
  }

  // ---- 下载引擎 -----------------------------------------------------
  var ctl = { status: 'idle', pause: false, stop: false };

  async function waitWhilePaused() {
    while (ctl.pause && !ctl.stop) await sleep(150);
    if (ctl.stop) throw new Error('已停止');
  }

  function reportProgress(payload) {
    channel.send('progress', payload);
  }

  async function fetchChapterText(book, chapter, adapter) {
    await waitWhilePaused();
    var lastErr = null;
    var maxTry = settings.autoRetry ? (settings.retry + 1) : 1;
    for (var attempt = 0; attempt < maxTry; attempt++) {
      try {
        var res = await httpGet(chapter.url, {});
        var doc = parseHtml(res.text, chapter.url);
        var r = await adapter.parseChapter(doc, chapter.url, chapter);
        if (r && (r.text || r.text === '')) return r.text;
        throw new Error('正文为空');
      } catch (e) {
        lastErr = e;
        if (attempt < maxTry - 1) await sleep(Math.min(settings.maxInterval || 2000, (attempt + 1) * 500));
      }
    }
    throw lastErr || new Error('下载失败');
  }

  async function runDownload(payload) {
    if (ctl.status === 'running') throw new Error('已有下载任务进行中');
    var catalog = cachedCatalog;
    if (!catalog) catalog = await getCatalog(false);
    var book = catalog.book;
    var adapter = catalog.adapter;

    var opts = normalizeSettings(mergeSettings(settings, payload.settings || {}));
    var selected;
    if (Array.isArray(payload.selectedIndexes) && payload.selectedIndexes.length) {
      var set = {};
      payload.selectedIndexes.forEach(function (n) { set[n] = 1; });
      selected = book.chapters.filter(function (c) { return set[c.index]; });
    } else {
      selected = selectChapters(book.chapters, opts);
    }
    if (!selected.length) throw new Error('筛选后没有可下载的章节');

    ctl.status = 'running'; ctl.pause = false; ctl.stop = false;
    var done = 0, fails = [];
    var startTime = Date.now();
    var total = selected.length;
    var stripping = { formats: opts.formats, book: book, chapters: [] };

    reportProgress({ phase: 'start', done: 0, total: total, title: book.title });

    var concurrency = opts.concurrency;
    var index = 0, running = 0;
    await new Promise(function (resolve) {
      var timer = setInterval(function () {
        if (ctl.stop) { if (running === 0) { clearInterval(timer); resolve(); } return; }
        while (running < concurrency && index < total) {
          var pos = index++;
          running++;
          var chapter = selected[pos];
          (async function () {
            if (ctl.stop) return;
            try {
              await waitWhilePaused();
              if (ctl.stop) return;
              var text = await fetchChapterText(book, chapter, adapter);
              chapter.text = text;
              stripping.chapters.push(chapter);
            } catch (e) {
              fails.push({ index: chapter.index, title: chapter.title, url: chapter.url, message: String(e && e.message || e) });
            } finally {
              done++;
              running--;
              var el = Date.now() - startTime;
              var speed = el > 0 ? (done / (el / 1000)) : 0;
              reportProgress({
                phase: 'running', done: done, total: total,
                current: chapter.title, speed: speed, fails: fails.length,
                remaining: total - done
              });
            }
          })();
        }
        if (index >= total && running === 0) { clearInterval(timer); resolve(); }
      }, 30);
    });

    ctl.status = 'idle';
    if (ctl.stop) {
      reportProgress({ phase: 'stopped', done: done, total: total });
      return { stopped: true, done: done, total: total, fails: fails };
    }
    // 组装 + 触发下载
    var orderOk = stripping.chapters;
    var formatInfo = [];
    try {
      if (opts.formats.txt) {
        var txt = buildTxt(orderOk, opts);
        saveText(txt, sanitizeFilename(book.title) + '.txt');
        formatInfo.push('TXT');
      }
      if (opts.formats.epub) {
        var epubEntries = buildEpubFiles(book, orderOk, opts);
        var epubU8 = buildZipStore(epubEntries);
        saveBlob(new Blob([epubU8], { type: 'application/epub+zip' }), sanitizeFilename(book.title) + '.epub');
        formatInfo.push('EPUB');
      }
      if (opts.formats.htmlzip) {
        var htmlEntries = buildHtmlFiles(book, orderOk, opts);
        var zipU8 = buildZipStore(htmlEntries);
        saveBlob(new Blob([zipU8], { type: 'application/zip' }), sanitizeFilename(book.title) + '-html.zip');
        formatInfo.push('HTML(ZIP)');
      }
    } catch (e) {
      log('export.error', { message: String(e && e.message || e) });
    }
    var size = 0;
    orderOk.forEach(function (c) { size += (c.text || '').length; });
    pushHistory({
      title: book.title, site: book.site || '', url: book.url,
      chapters: orderOk.length, size: size, formats: formatInfo.join(','), ok: true
    });
    var res = { done: orderOk.length, total: total, fails: fails, formats: formatInfo, size: size };
    channel.send('done', { phase: 'done', result: res });
    reportProgress({ phase: 'done', done: orderOk.length, total: total, fails: fails.length });
    log('download.done', { book: book.title, done: orderOk.length, fails: fails.length, formats: formatInfo });
    return res;
  }

  function saveText(text, filename) {
    saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
  }
  function saveBlob(blob, filename) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
  }

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
      if (m._from && m._from !== taskId) return;
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

  var channel = createChannel(TASK_ID);

  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });
      var resp;
      function finish(r) { channel.reply(msg, r); }
      function fail(e) { channel.reply(msg, { ok: false, error: String(e && e.message || e) }); }

      if (action === 'getState') {
        var adapter = matchAdapter();
        resp = {
          ok: true, host: window.location.hostname, href: window.location.href,
          pageTitle: document.title, adapterId: adapter ? adapter.id : null,
          adapterName: adapter ? adapter.name : null,
          excluded: isExcludedHost(window.location.hostname || ''),
          hasCatalog: !!cachedCatalog,
          chapterCount: cachedCatalog ? cachedCatalog.book.chapters.length : 0,
          settings: settings,
          history: loadHistory()
        };
        finish(resp);
        return;
      }
      if (action === 'getCatalog') {
        getCatalog(false).then(function (catalog) {
          finish({
            ok: true, adapterId: catalog.adapterId, adapterName: catalog.adapterName,
            book: {
              title: catalog.book.title, author: catalog.book.author, site: catalog.book.site,
              cover: catalog.book.cover, intro: catalog.book.intro
            },
            groups: groupChapters(catalog.book.chapters).map(function (g) {
              return { index: g.index, name: g.name, chapters: g.chapters.map(function (c) { return { index: c.index, title: c.title, isVip: c.isVip }; }) };
            }),
            total: catalog.book.chapters.length,
            selected: selectChapters(catalog.book.chapters, settings).length
          });
        }).catch(fail);
        return;
      }
      if (action === 'getChapter') {
        // 预览单章（供面板"查看选中章节"）
        var idx = (data && data.index) || 1;
        getCatalog(false).then(function (catalog) {
          var ch = null;
          for (var i = 0; i < catalog.book.chapters.length; i++) if (catalog.book.chapters[i].index === idx) { ch = catalog.book.chapters[i]; break; }
          if (!ch) { fail(new Error('章节不存在')); return; }
          var adapter = catalog.adapterId === 'fanqie' ? fanqieAdapter() : biqugeAdapter();
          return httpGet(ch.url, {}).then(function (res) {
            return adapter.parseChapter(parseHtml(res.text, ch.url), ch.url, ch).then(function (r) {
              finish({ ok: true, index: ch.index, title: ch.title, text: (r.text || '').slice(0, 2000) });
            });
          });
        }).catch(fail);
        return;
      }
      if (action === 'startDownload') {
        runDownload(data || {}).then(function (r) { finish({ ok: true, result: r }); }).catch(fail);
        return;
      }
      if (action === 'pause') { ctl.pause = true; finish({ ok: true, status: ctl.status }); return; }
      if (action === 'resume') { ctl.pause = false; finish({ ok: true, status: ctl.status }); return; }
      if (action === 'stop') {
        ctl.stop = true; ctl.pause = false;
        finish({ ok: true, status: 'stopping' });
        return;
      }
      if (action === 'applySettings') {
        persist(mergeSettings(settings, (data && data.settings) || {}));
        finish({ ok: true, settings: settings });
        return;
      }
      if (action === 'resetSettings') {
        persist(DEFAULT_SETTINGS);
        finish({ ok: true, settings: settings });
        return;
      }
      if (action === 'getLogs') { finish({ ok: true, logs: logText() }); return; }
      if (action === 'getHistory') { finish({ ok: true, history: loadHistory() }); return; }
      if (action === 'clearHistory') {
        storeSet(LS_HISTORY_KEY, []);
        finish({ ok: true, history: [] });
        return;
      }
      finish({ ok: false, error: '未知命令: ' + action });
    });
  }

  // ---- 面板入口（独立页弹窗：window.open + moveTo 居中，单例复用）----
  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    restoreLogs();
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) {
      try { existing.focus(); } catch (e) { /* ignore */ }
      log('panel.reuse', {});
      return true;
    }
    log('panel.open', { url: PANEL_URL });
    try {
      var W = Math.min(920, Math.max(480, (window.screen.availWidth || 1280) - 120));
      var H = Math.min(820, Math.max(560, (window.screen.availHeight || 900) - 140));
      var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
      var T = Math.max(0, Math.round(((window.screen.availHeight || 900) - H) / 2));
      var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T +
        ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
      var w = window.open(PANEL_URL, '_blank', features);
      var result = { opened: !!w, requestedW: W, requestedH: H, left: L, top: T };
      if (w) {
        // 部分浏览器会忽略 features 里的 left/top，用 moveTo/resizeTo 兜底
        try { w.moveTo(L, T); w.resizeTo(W, H); } catch (e) { /* 跨源 popup 部分浏览器受限 */ }
        channel.setPanelWin(w);
      }
      log('panel.open.result', result);
      return !!w;
    } catch (e) {
      log('panel.open.error', { message: String(e && e.message || e) });
      return false;
    }
  }

  // ---- xload 聚合按钮组（共享模板 templates/fab.js v3，全部复制，勿自行重写）----------
  // 可折叠（默认展开）、极简扁平、整组拖拽、位置记忆、防出屏。
  function xloadFab() {
    var POS_KEY = 'xload-fab-pos';
    var COLLAPSE_KEY = 'xload-fab-collapsed';
    var DRAG_THRESHOLD = 4;
    var collapsed = false;
  
    function fabStoreGet(key, def) {
      try {
        if (typeof GM_getValue === 'function') {
          var v = GM_getValue(key, null);
          return (v == null) ? def : v;
        }
        var s = window.localStorage.getItem(key);
        return (s == null) ? def : JSON.parse(s);
      } catch (e) { return def; }
    }
    function fabStoreSet(key, val) {
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
    if (oldStyle && oldStyle.getAttribute('data-xload-fab-style-version') !== '3') {
      oldStyle.parentNode.removeChild(oldStyle);
      oldStyle = null;
    }
    if (!oldStyle) {
      var st = document.createElement('style');
      st.setAttribute('data-xload-fab-style', '');
      st.setAttribute('data-xload-fab-style-version', '3');
      st.textContent =
        '#xload-fab-root{' +
          'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
          'display:flex;flex-direction:column;gap:4px;' +
          'min-width:150px;max-width:230px;padding:6px;box-sizing:border-box;' +
          'background:#fff;' +
          'border:1px solid #e2e8f0;border-radius:10px;' +
          'box-shadow:0 1px 3px rgba(15,23,42,.06);' +
          'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;' +
          'user-select:none;-webkit-user-select:none;touch-action:none;' +
        '}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"]{padding:4px;}' +
        '#xload-fab-root button{font-family:inherit;}' +
        '#xload-fab-root [data-xload-fab-toggle]{' +
          'display:flex;align-items:center;gap:8px;width:100%;' +
          'padding:7px 8px;border:0;border-radius:8px;cursor:grab;' +
          'background:transparent;color:#334155;' +
          'font-size:13px;font-weight:600;line-height:1;text-align:left;' +
          'transition:background .15s ease,color .15s ease;' +
        '}' +
        '#xload-fab-root [data-xload-fab-toggle]:hover{' +
          'background:#f1f5f9;color:#0f172a;' +
        '}' +
        '#xload-fab-root [data-xload-fab-toggle]:active{background:#e8eef5;}' +
        '#xload-fab-root .xf-brand{' +
          'display:inline-flex;align-items:center;justify-content:center;flex:none;' +
          'width:20px;height:20px;border-radius:6px;background:#2563eb;color:#fff;' +
          'font-size:11px;font-weight:800;' +
        '}' +
        '#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '#xload-fab-root .xf-caret{' +
          'flex:none;width:0;height:0;' +
          'border-left:4px solid transparent;border-right:4px solid transparent;' +
          'border-top:5px solid #94a3b8;transition:transform .18s ease;' +
        '}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-90deg);}' +
        '#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;gap:4px;margin-top:2px;}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] [data-xload-fab-list]{display:none;}' +
        '#xload-fab-root [data-xload-fab-item]{' +
          'display:flex;align-items:center;gap:8px;width:100%;' +
          'padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;' +
          'background:#f8fafc;color:#334155;' +
          'font-size:13px;font-weight:500;line-height:1;text-align:left;cursor:pointer;' +
          'transition:border-color .15s ease,background .15s ease,color .15s ease;' +
        '}' +
        '#xload-fab-root [data-xload-fab-item]:hover{' +
          'border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8;' +
        '}' +
        '#xload-fab-root [data-xload-fab-item]:active{background:#dbeafe;}' +
        '#xload-fab-root .xf-dot{' +
          'width:8px;height:8px;border-radius:50%;flex:none;background:#10b981;' +
        '}' +
        '@media (prefers-color-scheme:dark){' +
          '#xload-fab-root{background:#0f172a;border-color:rgba(148,163,184,.18);' +
            'box-shadow:0 1px 3px rgba(0,0,0,.4);}' +
          '#xload-fab-root [data-xload-fab-toggle]{color:#cbd5e1;}' +
          '#xload-fab-root [data-xload-fab-toggle]:hover{background:rgba(148,163,184,.12);color:#f1f5f9;}' +
          '#xload-fab-root [data-xload-fab-toggle]:active{background:rgba(148,163,184,.20);}' +
          '#xload-fab-root [data-xload-fab-item]{background:#1e293b;border-color:rgba(148,163,184,.20);color:#cbd5e1;}' +
          '#xload-fab-root [data-xload-fab-item]:hover{border-color:#3b82f6;background:rgba(37,99,235,.18);color:#fff;}' +
          '#xload-fab-root [data-xload-fab-item]:active{background:rgba(37,99,235,.28);}' +
          '#xload-fab-root .xf-caret{border-top-color:#64748b;}' +
        '}';
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
      fabStoreSet(COLLAPSE_KEY, collapsed);
    }
    function toggleCollapse() {
      setCollapsed(!collapsed);
      // 折叠状态变化后重新 clamp（宽度可能变化）
      var p = fabStoreGet(POS_KEY, null);
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
        var p = fabStoreGet(POS_KEY, null);
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          applyPos(p.x, p.y);
        }
      }
  
      // 初始折叠状态（只在首次初始化时恢复，幂等）
      collapsed = fabStoreGet(COLLAPSE_KEY, false); // 默认 false = 展开
      if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
      else { root.removeAttribute('data-xload-fab-collapsed'); }
  
      var dragging = false;
      var downOnToggle = false;
      var sx = 0, sy = 0, ox = 0, oy = 0;
  
      // 从手柄或组内空白处起拖；item 按钮上起按仅当移动超过阈值才进入拖拽（保留点击）
      root.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        var t = ev.target;
        var isToggle = !!(t && t.getAttribute && t.getAttribute('data-xload-fab-toggle') === 'true');
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
          fabStoreSet(POS_KEY, { x: root.offsetLeft, y: root.offsetTop });
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
        var p = fabStoreGet(POS_KEY, null);
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

  function injectFab() {
    var fab = xloadFab();
    fab.addItem(TASK_ID, '小说下载', openPanel);
  }

  // ---- 启动 ---------------------------------------------------------
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  var initStarted = false;
  function init() {
    if (initStarted) return;
    initStarted = true;
    log('init.start', { ua: navigator.userAgent.slice(0, 80), readyState: document.readyState });
    var host = window.location.hostname || '';

    // 全局错误捕获（控制台报错入日志，便于面板回传排错）
    if (!window.__xloadErrHooked) {
      window.__xloadErrHooked = true;
      window.addEventListener('error', function (e) {
        log('global.error', { message: e && e.message, file: e && e.filename, line: e && e.lineno, col: e && e.colno });
      });
      window.addEventListener('unhandledrejection', function (e) {
        log('global.unhandledrejection', { message: (e && e.reason && e.reason.message) || String(e && e.reason) });
        if (e && e.preventDefault) e.preventDefault();
      });
    }

    if (isSelfHost(host)) { log('init.self.skip', { host: host }); return; }
    if (isExcludedHost(host)) { log('init.excluded.skip', { host: host }); return; }

    try {
      registerChannelHandlers();
      whenReady(function () {
        try { injectFab(); log('init.fab.ok', {}); } catch (e) { log('init.fab.error', { message: String(e && e.message || e) }); }
      });
      log('init.done', { host: host, adapterId: (matchAdapter() || {}).id || null });
    } catch (e) {
      log('init.error', { message: String(e && e.message || e) });
    }
  }

  whenReady(init);
})();