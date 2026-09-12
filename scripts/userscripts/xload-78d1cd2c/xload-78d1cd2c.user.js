// ==UserScript==
// @name         Telegram网页版媒体下载器
// @name:en      Telegram Web Media Downloader
// @namespace    https://github.com/u2222223/xload
// @version      2026.9.12.1
// @description  在Telegram网页版（webk / webz）一键下载图片、GIF、视频和语音消息，支持从限制下载的私密频道下载、批量下载与实时进度
// @description:en  One-click download images, GIFs, videos and voice messages on Telegram Web (webk & webz), even from restricted private channels, with batch download and live progress
// @author       xload
// @license      MIT
// @match        *://*.telegram.org/*
// @match        *://telegram.org/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用，可独立单测）
  // ===================================================================

  // 宿主站点（xload 自有域名）：命中即整脚本不介入，双保险之一
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];

  // 判断 host 是否为本脚本宿主站点（含子域）
  function isSelfHost(host) {
    if (!host) return false;
    var h = String(host).toLowerCase();
    for (var i = 0; i < SELF_HOSTS.length; i++) {
      var d = SELF_HOSTS[i];
      if (h === d || h.slice(-(d.length + 1)) === '.' + d) return true;
    }
    return false;
  }

  // 判断 host 是否为 Telegram 网页版域名（含子域）
  function isTargetHost(host) {
    if (!host) return false;
    var h = String(host).toLowerCase();
    return h === 'telegram.org' || h.slice(-'.telegram.org'.length) === '.telegram.org';
  }

  // 依据 host + pathname 识别 Telegram 网页版版本：'webk'（/k/） / 'webz'（/a/ /z/ 及旧域名）
  function detectVersion(host, pathname) {
    var h = String(host || '').toLowerCase();
    var p = String(pathname || '').toLowerCase();
    if (h === 'webk.telegram.org') return 'webk';
    if (h === 'webz.telegram.org' || h === 'weba.telegram.org') return 'webz';
    if (p === '/k' || p.indexOf('/k/') === 0) return 'webk';
    if (p === '/a' || p.indexOf('/a/') === 0) return 'webz';
    if (p === '/z' || p.indexOf('/z/') === 0) return 'webz';
    return 'unknown';
  }

  // djb2 字符串哈希，回退命名用（返回 uint32）
  function stringHash32(s) {
    var h = 0, i = 0;
    s = String(s == null ? '' : s);
    var l = s.length;
    if (l > 0) {
      while (i < l) {
        h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
      }
    }
    return h >>> 0;
  }

  // 外链协议白名单：仅允许 http/https（拒绝 javascript:/data:/vbscript:）
  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  // 解析 Content-Range（'bytes start-end/total'）；不匹配返回 null
  function parseContentRange(header) {
    if (typeof header !== 'string') return null;
    var m = header.match(/^bytes\s+(\d+)-(\d+)\/(\d+)$/i);
    if (!m) return null;
    return { start: parseInt(m[1], 10), end: parseInt(m[2], 10), total: parseInt(m[3], 10) };
  }

  // 解析 telegram 视频流 URL 的元数据。
  // 页面事实：部分视频 src 形如 'stream/{"dcId":5,"location":{...},"mimeType":"video/mp4","fileName":"xxx.MP4"}'
  // 返回 { fileName, mimeType }；非法/无元数据返回 null。
  function parseStreamMeta(url) {
    if (typeof url !== 'string') return null;
    try {
      var seg = url.split('/');
      var jsonStr = decodeURIComponent(seg[seg.length - 1]);
      if (jsonStr.charAt(0) !== '{') return null;
      var meta = JSON.parse(jsonStr);
      if (!meta || typeof meta !== 'object') return null;
      var out = {};
      if (typeof meta.fileName === 'string' && meta.fileName) out.fileName = meta.fileName;
      if (typeof meta.mimeType === 'string' && meta.mimeType) out.mimeType = meta.mimeType;
      return out;
    } catch (e) {
      return null;
    }
  }

  // 文件名净化：去除非法字符与换行，限制长度
  function sanitizeFileName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 180);
  }

  // 依据 MIME 判断媒体大类
  function mediaKindFromMime(mime) {
    if (typeof mime !== 'string') return 'image';
    var m = mime.split(';')[0].trim().toLowerCase();
    if (m.indexOf('video/') === 0) return 'video';
    if (m.indexOf('audio/') === 0) return 'audio';
    if (m === 'image/gif') return 'gif';
    if (m.indexOf('image/') === 0) return 'image';
    return 'image';
  }

  // 依据 MIME 推断扩展名，未知回退 fallback
  function extFromMime(mime, fallback) {
    if (typeof mime !== 'string') return fallback;
    var m = mime.split(';')[0].trim().toLowerCase();
    var map = {
      'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mov',
      'video/x-matroska': 'mkv', 'video/mpeg': 'mpg',
      'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/webm': 'weba',
      'audio/wav': 'wav', 'audio/opus': 'ogg', 'audio/aac': 'aac',
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
      'image/webp': 'webp', 'image/bmp': 'bmp'
    };
    return map[m] || fallback;
  }

  // 生成文件名：优先原始文件名，其次「telegram-类别-时间戳-短hash.扩展名」
  function buildFileName(opts) {
    opts = opts || {};
    var kind = opts.kind === 'gif' ? 'image' : (opts.kind || 'image');
    var mime = opts.mime || '';
    var fallbackExt = kind === 'audio' ? 'ogg' : (kind === 'video' ? 'mp4' : 'jpg');
    var ext = extFromMime(mime, fallbackExt);
    var base = sanitizeFileName(opts.sourceName || '');
    if (base) {
      // 已有扩展名则信任；否则补全检测到的扩展名
      var dot = base.lastIndexOf('.');
      var hasExt = dot > 0 && dot < base.length - 1 && (base.length - dot) <= 6;
      return hasExt ? base : base + '.' + ext;
    }
    var d = new Date();
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    var ts = '' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
    return 'telegram-' + kind + '-' + ts + '-x' + stringHash32(opts.url || '').toString(36) + '.' + ext;
  }

  // 用检测到的扩展名替换文件名最后一个扩展（缺扩展则追加）
  function reshapeExt(fileName, ext) {
    if (typeof fileName !== 'string' || !ext) return fileName;
    var dot = fileName.lastIndexOf('.');
    if (dot > 0) return fileName.slice(0, dot + 1) + ext;
    return fileName + '.' + ext;
  }

  // 配置默认值 + 归一化
  var DEFAULT_SETTINGS = {
    concurrency: 2,        // 批量下载并发上限（单条下载不受限）
    namingRule: 'auto',    // auto=智能命名 original=优先原始文件名 hash=短hash
    showPageButton: true,  // 是否在页面注入单条下载按钮
    enableBatch: true      // 是否允许批量下载
  };

  function mergeSettings(base, patch) {
    var out = {};
    var key;
    for (key in base) if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key];
    if (patch && typeof patch === 'object') {
      for (key in patch) if (Object.prototype.hasOwnProperty.call(patch, key)) out[key] = patch[key];
    }
    return out;
  }

  function normalizeSettings(raw) {
    var m = mergeSettings(DEFAULT_SETTINGS, raw && typeof raw === 'object' ? raw : {});
    m.concurrency = Math.max(1, Math.min(6, parseInt(m.concurrency, 10) || 2));
    if (['auto', 'original', 'hash'].indexOf(m.namingRule) < 0) m.namingRule = 'auto';
    m.showPageButton = Boolean(m.showPageButton);
    m.enableBatch = Boolean(m.enableBatch);
    return m;
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  // ---- 常量 ---------------------------------------------------------
  var TASK_ID = 'xload-78d1cd2c';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/' + TASK_ID + '/panel.html';
  var LOG_KEY = 'xload-' + TASK_ID + '-logs';
  var LS_KEY = 'xload-tgdl-settings';
  var HIST_KEY = 'xload-tgdl-history';

  // 默认排除站点（双保险之二：宿主域名 + 常驻排除）
  var excludeSites = SELF_HOSTS.concat([]);

  // 当前 Telegram 网页版版本（init 时依据 host/pathname 判定）
  var currentVersion = 'unknown';

  // Telegram webk 图标字体下载字形（页面事实：U+E979 = 下载）
  var DOWNLOAD_ICON = String.fromCharCode(0xE979);

  // 页面事实（照抄核对，非实现）：Telegram 网页版两种版本的 DOM 选择器
  var WEBZ_SEL = {
    story: '#StoryViewer',
    storyHeader: '.GrsJNw3y',
    storyImage: 'img.PVZ8TOWS',
    mediaSlide: '#MediaViewer .MediaViewerSlide--active',
    mediaActions: '#MediaViewer .MediaViewerActions',
    videoPlayer: '.MediaViewerContent > .VideoPlayer',
    mediaImage: '.MediaViewerContent > div > img'
  };
  var WEBK_SEL = {
    pinned: '.pinned-audio',
    pinnedUtils: '.pinned-container-wrapper-utils',
    voice: 'audio-element',
    bubble: '.bubble',
    story: '#stories-viewer',
    storyHeader: "[class^='_ViewerStoryHeaderRight']",
    storyFooter: "[class^='_ViewerStoryFooterRight']",
    storyVideo: 'video.media-video',
    storyImage: 'img.media-photo',
    viewer: '.media-viewer-whole',
    viewerAspecter: '.media-viewer-movers .media-viewer-aspecter',
    viewerButtons: '.media-viewer-topbar .media-viewer-buttons',
    ckinPlayer: '.ckin__player',
    viewerImage: 'img.thumbnail'
  };

  // ---- 日志系统（内存环形缓冲 + localStorage + console）---------------
  var LOG_RING = [];
  function log(tag, data) {
    var entry = { t: new Date().toISOString(), tag: tag, data: data == null ? null : data };
    LOG_RING.push(entry);
    if (LOG_RING.length > 300) LOG_RING.shift();
    try { console.log('[xload:' + TASK_ID + ']', tag, data == null ? '' : data); } catch (e) { /* ignore */ }
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

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---- 配置 / 历史读写 -----------------------------------------------
  function loadSettings() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(LS_KEY));
      return normalizeSettings(raw);
    } catch (e) {
      return normalizeSettings({});
    }
  }
  var settings = loadSettings();
  function persistSettings() {
    settings = normalizeSettings(settings);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  function loadHistory() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(HIST_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  var history = loadHistory();
  function saveHistory() {
    try { window.localStorage.setItem(HIST_KEY, JSON.stringify(history.slice(0, 100))); } catch (e) { /* ignore */ }
  }
  function trimHistory() { history = history.slice(0, 100); }

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

  // ---- 下载引擎 ------------------------------------------------------
  var activeDownloads = {}; // id -> 任务记录

  // 提取原始文件名（来自 stream 元数据）
  function extractSourceName(url) {
    var meta = parseStreamMeta(url);
    return (meta && meta.fileName) ? meta.fileName : '';
  }

  function queueSnapshot() {
    var now = Date.now();
    return Object.keys(activeDownloads).map(function (k) {
      var r = activeDownloads[k];
      var el = Math.max(1, now - (r.startTime || now));
      var speed = r.received > 0 ? Math.round(r.received / (el / 1000)) : 0;
      var percent = r.total > 0 ? Math.round((r.received / r.total) * 100) : 0;
      return {
        id: r.id, fileName: r.fileName, kind: r.kind, status: r.status,
        received: r.received, total: r.total, size: r.size, error: r.error,
        speed: speed, percent: percent
      };
    });
  }

  function pushQueue() {
    channel.send('queue', { queue: queueSnapshot(), history: history.slice(0, 30), connected: true, version: currentVersion });
  }

  function finishDownload(rec, size) {
    if (rec.cancelled) return;
    rec.status = 'done';
    rec.size = size || 0;
    rec.finishedAt = new Date().toISOString();
    pushQueue();
    history.unshift({ fileName: rec.fileName, kind: rec.kind, size: rec.size, time: rec.finishedAt, url: rec.url });
    trimHistory();
    saveHistory();
    channel.send('done', { id: rec.id, fileName: rec.fileName, kind: rec.kind, size: rec.size });
    log('download.done', { fileName: rec.fileName, kind: rec.kind, size: rec.size });
    setTimeout(function () { delete activeDownloads[rec.id]; pushQueue(); }, 4000);
  }

  function failDownload(rec, err) {
    rec.status = rec.cancelled ? 'cancelled' : 'error';
    rec.error = String((err && err.message) || err || '未知错误');
    pushQueue();
    channel.send('error', { id: rec.id, fileName: rec.fileName, kind: rec.kind, message: rec.error });
    log('download.error', { fileName: rec.fileName, kind: rec.kind, message: rec.error });
    setTimeout(function () { delete activeDownloads[rec.id]; pushQueue(); }, 6000);
  }

  function makeDownloadRec(url, kind, sourceName) {
    var id = 'dl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    var name = buildFileName({ sourceName: sourceName, kind: kind, mime: (parseStreamMeta(url) || {}).mimeType || '', url: url });
    return {
      id: id, url: url, kind: kind, status: 'pending',
      fileName: name, received: 0, total: 0, mime: '', size: 0,
      blobParts: [], cancelled: false, startTime: Date.now(), error: ''
    };
  }

  // 下载入口：kind ∈ video/audio/image(gif 归 image 处理由调用方判断)
  function downloadMedia(url, kind, sourceName) {
    if (!isSafeUrl(url)) { log('download.blocked', { url: url, kind: kind }); return null; }
    if (sourceName == null) sourceName = extractSourceName(url);
    var rec = makeDownloadRec(url, kind, sourceName);
    activeDownloads[rec.id] = rec;
    rec.status = 'running';
    pushQueue();
    log('download.start', { id: rec.id, fileName: rec.fileName, kind: kind });
    if (kind === 'image' || kind === 'gif') {
      downloadImage(rec);
    } else {
      downloadBinary(rec);
    }
    return rec.id;
  }

  function triggerAnchorSave(blob, fileName, onDone) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 30000);
    if (onDone) onDone();
  }

  function downloadImage(rec) {
    try {
      var a = document.createElement('a');
      a.href = rec.url;
      a.download = rec.fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      finishDownload(rec, 0);
    } catch (e) {
      failDownload(rec, e);
    }
  }

  function downloadBinary(rec) {
    var offset = 0;
    var total = null;

    function step() {
      if (rec.cancelled) { failDownload(rec, new Error('已取消')); return; }
      fetch(rec.url, {
        method: 'GET',
        headers: { Range: 'bytes=' + offset + '-' }
      }).then(function (res) {
        if (res.status !== 200 && res.status !== 206) throw new Error('HTTP ' + res.status);
        var mime = (res.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
        if (mime) {
          rec.mime = mime;
          var ext = extFromMime(mime, rec.kind === 'audio' ? 'ogg' : 'mp4');
          if (ext) rec.fileName = reshapeExt(rec.fileName, ext);
          // 校验主类型：避免拿到「只有声音的 MP4」这类不完整流（评论核心诉求）
          if (rec.kind === 'video' && mime.indexOf('video/') !== 0 && mime.indexOf('octet-stream') < 0) {
            throw new Error('非视频响应，MIME=' + mime);
          }
          if (rec.kind === 'audio' && mime.indexOf('audio/') !== 0 && mime.indexOf('octet-stream') < 0) {
            throw new Error('非音频响应，MIME=' + mime);
          }
        }
        var range = parseContentRange(res.headers.get('Content-Range'));
        if (range) {
          if (range.start !== offset) throw new Error('存在数据间隙 (gap)');
          if (total != null && range.total !== total) throw new Error('总大小不一致');
          total = range.total;
          offset = range.end + 1;
        } else {
          // 单段 200 完整响应
          total = Number(res.headers.get('Content-Length')) || null;
          offset = total != null ? total : -1;
        }
        rec.total = total || 0;
        rec.received = offset > 0 ? offset : 0;
        pushQueue();
        return res.blob();
      }).then(function (blob) {
        rec.blobParts.push(blob);
        if (total != null && (offset >= total || offset < 0)) {
          concatAndSave(rec);
        } else if (total == null) {
          concatAndSave(rec);
        } else {
          step();
        }
      }).catch(function (e) { failDownload(rec, e); });
    }
    step();
  }

  function concatAndSave(rec) {
    var mime = rec.mime || (rec.kind === 'video' ? 'video/mp4' : 'audio/ogg');
    try {
      var blob = new Blob(rec.blobParts, { type: mime });
      rec.size = blob.size;
      triggerAnchorSave(blob, rec.fileName, function () { finishDownload(rec, rec.size); });
      log('download.concat', { fileName: rec.fileName, parts: rec.blobParts.length, size: blob.size });
    } catch (e) {
      failDownload(rec, e);
    }
  }

  // ---- 批量采集（扫描已渲染消息里的媒体，尽力提取直链）----------------
  function collectBatchMedia(filter) {
    var out = [];
    var seen = Object.create(null);
    function push(url, kind, sourceName) {
      if (!url || !isSafeUrl(url)) return;
      if (seen[url]) return;
      seen[url] = true;
      out.push({ url: url, kind: kind, sourceName: sourceName || '' });
    }
    // webk：语音直链最完整；视频 src 尽力
    $$(WEBK_SEL.voice).forEach(function (el) {
      var audio = el.audio || el.querySelector('audio');
      var src = audio && (audio.getAttribute('src') || audio.src || '');
      push(src, 'audio', '');
    });
    $$('video').forEach(function (v) {
      var src = v.currentSrc || v.src || (v.querySelector('source') && v.querySelector('source').src) || '';
      // 仅保留真实媒体流/原始对象
      if (src && (src.indexOf('blob:') === 0 || src.indexOf('http') === 0 || src.indexOf('/stream') >= 0 || src.indexOf('.mp4') >= 0 || src.indexOf('.webm') >= 0)) {
        push(src, 'video', '');
      }
    });
    // 图片：仅在 blob/photo 直链时收录（列表内多为缩略图，质量以实际为准）
    $$('img').forEach(function (img) {
      var src = img.currentSrc || img.src || '';
      if (!src) return;
      if (src.indexOf('blob:') === 0) { push(src, 'image', ''); }
      else if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(src)) { push(src, 'image', ''); }
    });
    if (filter && filter !== 'all') {
      out = out.filter(function (m) {
        return m.kind === filter || (filter === 'image' && m.kind === 'gif');
      });
    }
    return out;
  }

  // ---- 命令处理（面板 -> 脚本）---------------------------------------
  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });
      var resp;
      if (action === 'getState') {
        resp = { ok: true, version: currentVersion, settings: settings, queue: queueSnapshot(), history: history.slice(0, 30), connected: true };
      } else if (action === 'applySettings') {
        settings = normalizeSettings(data.settings);
        persistSettings();
        resp = { ok: true, settings: settings };
      } else if (action === 'resetSettings') {
        settings = normalizeSettings(DEFAULT_SETTINGS);
        persistSettings();
        resp = { ok: true, settings: settings };
      } else if (action === 'batchDownload') {
        if (!settings.enableBatch) { resp = { ok: false, error: '批量下载已在设置中关闭' }; }
        else {
          var filter = data.filter || 'all';
          var items = collectBatchMedia(filter);
          var ids = [];
          items.forEach(function (m) { ids.push(downloadMedia(m.url, m.kind, m.sourceName)); });
          resp = { ok: true, count: ids.length, ids: ids };
          log('batch.download', { filter: filter, count: ids.length });
        }
      } else if (action === 'redownload') {
        var item = data.item;
        if (item && item.url) {
          downloadMedia(item.url, item.kind, item.sourceName);
          resp = { ok: true };
        } else {
          resp = { ok: false, error: '缺少下载地址' };
        }
      } else if (action === 'cancelDownload') {
        var rec = activeDownloads[data.id];
        if (rec) { rec.cancelled = true; rec.status = 'cancelled'; pushQueue(); resp = { ok: true }; }
        else { resp = { ok: false, error: '任务不存在' }; }
      } else if (action === 'clearHistory') {
        history = []; saveHistory(); pushQueue();
        resp = { ok: true };
      } else if (action === 'getLogs') {
        resp = { ok: true, text: logText() };
      } else if (action === 'ping') {
        resp = { ok: true, version: currentVersion };
      } else {
        resp = { ok: false, error: '未知命令: ' + action };
      }
      channel.reply(msg, resp);
    });
  }

  // ---- webz（/a/ /z/ 版本）按钮注入适配器 ----------------------------
  function makeWebzDownloadButton() {
    var icon = document.createElement('i');
    icon.className = 'icon icon-download';
    var btn = document.createElement('button');
    btn.className = 'Button smaller translucent-white round xload-tg-dl';
    btn.appendChild(icon);
    btn.setAttribute('type', 'button');
    btn.setAttribute('title', '下载');
    btn.setAttribute('aria-label', '下载');
    return btn;
  }

  function injectWebzStoryButton(storyContainer) {
    var header = $(WEBZ_SEL.storyHeader, storyContainer) ||
      (($('.DropdownMenu', storyContainer) && $('.DropdownMenu', storyContainer).parentNode));
    if (!header || header.querySelector('.xload-tg-dl')) return;
    var btn = makeWebzDownloadButton();
    btn.onclick = function () {
      var video = $('video', storyContainer);
      var videoSrc = video && (video.src || video.currentSrc || (video.querySelector('source') && video.querySelector('source').src));
      if (videoSrc) { downloadMedia(videoSrc, 'video', ''); return; }
      var imgs = $$(WEBZ_SEL.storyImage, storyContainer);
      if (imgs.length > 0 && imgs[imgs.length - 1].src) downloadMedia(imgs[imgs.length - 1].src, 'image', '');
    };
    var firstBtn = $('button', header);
    if (firstBtn) header.insertBefore(btn, firstBtn); else header.appendChild(btn);
  }

  function injectWebzViewerButton() {
    var slide = $(WEBZ_SEL.mediaSlide);
    var actions = $(WEBZ_SEL.mediaActions);
    if (!slide || !actions) return;
    var videoPlayer = $(WEBZ_SEL.videoPlayer, slide);
    var img = $(WEBZ_SEL.mediaImage, slide);
    var url, kind;
    if (videoPlayer) {
      var v = $('video', videoPlayer);
      url = v && (v.currentSrc || v.src);
      kind = 'video';
    } else if (img && img.src) {
      url = img.src;
      kind = 'image';
    }
    if (!url || !isSafeUrl(url)) return;
    var existing = $('button.xload-tg-dl', actions);
    if (existing) {
      if (existing.getAttribute('data-xload-tg-url') === url) return;
      existing.setAttribute('data-xload-tg-url', url);
      existing.onclick = function () { downloadMedia(url, kind, ''); };
      return;
    }
    var btn = makeWebzDownloadButton();
    btn.setAttribute('data-xload-tg-url', url);
    btn.onclick = function () { downloadMedia(url, kind, ''); };
    actions.prepend(btn);
  }

  function setupWebzScan() {
    setInterval(function () {
      try {
        var storyContainer = $(WEBZ_SEL.story);
        if (storyContainer) injectWebzStoryButton(storyContainer);
        injectWebzViewerButton();
      } catch (e) { log('webz.scan.error', { message: String(e && e.message || e) }); }
    }, 500);
  }

  // ---- webk（/k/ 版本）按钮注入适配器 --------------------------------
  function makeWebkDownloadButton(url, kind, labelText) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon tgico-download xload-tg-dl';
    btn.innerHTML = '<span class="tgico">' + DOWNLOAD_ICON + '</span>';
    btn.setAttribute('title', labelText || (kind === 'audio' ? '下载语音' : '下载'));
    btn.setAttribute('aria-label', '下载');
    btn.setAttribute('data-xload-tg-url', url);
    btn.onclick = function () { downloadMedia(url, kind, ''); };
    return btn;
  }

  function setupWebkVoice() {
    // 正在播放的置顶语音/圆视频
    var pinned = $(WEBK_SEL.pinned);
    if (pinned) {
      var isVoice = !!$('audio-element', pinned);
      var audio = $('audio', pinned);
      var video = $('video', pinned);
      var src = '', kind = '';
      if (isVoice || audio) { src = audio && (audio.getAttribute('src') || audio.src || ''); kind = 'audio'; }
      else if (video) { src = video.currentSrc || video.src || ''; kind = 'video'; }
      var utils = $(WEBK_SEL.pinnedUtils, pinned);
      if (src && utils && !$('.xload-tg-dl', utils)) {
        var btn = makeWebkDownloadButton(src, kind, kind === 'audio' ? '下载语音' : '下载视频');
        btn.className = 'btn-icon tgico-download xload-tg-dl';
        utils.appendChild(btn);
      }
    }
    // 每条语音消息气泡
    $$(WEBK_SEL.voice).forEach(function (el) {
      var bubble = el.closest(WEBK_SEL.bubble);
      if (!bubble || bubble.querySelector('.xload-tg-dl')) return;
      var audio = el.audio || el.querySelector('audio');
      var src = audio && (audio.getAttribute('src') || audio.src || '');
      if (!src) return;
      var btn = makeWebkDownloadButton(src, 'audio', '下载语音');
      btn.className = 'btn-icon tgico-download xload-tg-dl';
      bubble.appendChild(btn);
    });
  }

  function makeWebkStoryButton(storyContainer) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-icon rp xload-tg-dl';
    btn.innerHTML = '<span class="tgico">' + DOWNLOAD_ICON + '</span>';
    btn.setAttribute('title', '下载');
    btn.setAttribute('aria-label', '下载');
    btn.onclick = function () {
      var video = $(WEBK_SEL.storyVideo, storyContainer);
      var videoSrc = video && (video.src || video.currentSrc || (video.querySelector('source') && video.querySelector('source').src));
      if (videoSrc) { downloadMedia(videoSrc, 'video', ''); return; }
      var img = $(WEBK_SEL.storyImage, storyContainer);
      if (img && img.src) downloadMedia(img.src, 'image', '');
    };
    return btn;
  }

  function setupWebkStories() {
    var storyContainer = $(WEBK_SEL.story);
    if (!storyContainer) return;
    [$(WEBK_SEL.storyHeader, storyContainer), $(WEBK_SEL.storyFooter, storyContainer)].forEach(function (target) {
      if (!target || target.querySelector('.xload-tg-dl')) return;
      target.prepend(makeWebkStoryButton(storyContainer));
    });
  }

  function setupWebkViewer() {
    var whole = $(WEBK_SEL.viewer);
    if (!whole) return;
    var aspecter = $(WEBK_SEL.viewerAspecter, whole);
    var buttons = $(WEBK_SEL.viewerButtons, whole);
    if (!aspecter || !buttons) return;
    var url = '', kind = '';
    if ($(WEBK_SEL.ckinPlayer, aspecter) || $('video', aspecter)) {
      var v = $('video', aspecter);
      url = v && (v.currentSrc || v.src || '');
      kind = 'video';
    } else {
      var img = $(WEBK_SEL.viewerImage, aspecter);
      if (!img || !img.src) return;
      url = img.src;
      kind = 'image';
    }
    if (!url || !isSafeUrl(url)) return;
    var existing = $('button.xload-tg-dl', buttons);
    if (existing) {
      if (existing.getAttribute('data-xload-tg-url') === url) return;
      existing.setAttribute('data-xload-tg-url', url);
      existing.onclick = function () { downloadMedia(url, kind, ''); };
      return;
    }
    buttons.prepend(makeWebkDownloadButton(url, kind, kind === 'video' ? '下载视频' : '下载图片'));
  }

  function setupWebkScan() {
    setInterval(function () {
      try {
        setupWebkVoice();
        setupWebkStories();
        setupWebkViewer();
      } catch (e) { log('webk.scan.error', { message: String(e && e.message || e) }); }
    }, 500);
  }

  // ---- 面板入口（独立页弹窗：window.open + moveTo 居中，单例复用）----
  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    restoreLogs();
    // 单例：已打开且未关闭则复用聚焦，不重复 window.open
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) {
      try { existing.focus(); } catch (e) { /* ignore */ }
      log('panel.reuse', {});
      return true;
    }
    log('panel.open', { url: PANEL_URL });
    try {
      var W = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
      var H = Math.min(780, Math.max(540, (window.screen.availHeight || 800) - 140));
      var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
      var T = Math.max(0, Math.round(((window.screen.availHeight || 800) - H) / 2));
      var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T +
        ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
      var w = window.open(PANEL_URL, '_blank', features);
      var result = { opened: !!w, requestedW: W, requestedH: H, left: L, top: T };
      if (w) {
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

  // ---- xload 聚合按钮组（FAB 共享模板）------------------------------
  function xloadFab() {
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
      var oldList = root.querySelector('[data-xload-fab-list]');
      if (oldList) { oldList.style.display = 'flex'; }
    } else {
      root = document.createElement('div');
      root.id = 'xload-fab-root';
      root.setAttribute('data-xload-fab-root', 'true');
      document.body.appendChild(root);
    }

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

    function setCollapsed(c) {
      collapsed = !!c;
      if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
      else { root.removeAttribute('data-xload-fab-collapsed'); }
      storeSet(COLLAPSE_KEY, collapsed);
    }
    function toggleCollapse() {
      setCollapsed(!collapsed);
      var p = storeGet(POS_KEY, null);
      if (p && typeof p.x === 'number' && typeof p.y === 'number') { applyPos(p.x, p.y); }
    }

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

      collapsed = storeGet(COLLAPSE_KEY, false);
      if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
      else { root.removeAttribute('data-xload-fab-collapsed'); }

      var dragging = false;
      var downOnToggle = false;
      var sx = 0, sy = 0, ox = 0, oy = 0;

      root.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        var t = ev.target;
        var isToggle = !!(t && t.closest && t.closest('[data-xload-fab-toggle]'));
        var isItem = !!(t && t.closest && t.closest('[data-xload-fab-item]'));
        if (isItem && !isToggle) return;
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
          toggleCollapse();
        }
        downOnToggle = false;
      }
      root.addEventListener('pointerup', endDrag);
      root.addEventListener('pointercancel', function () {
        if (!dragging) return;
        dragging = false;
        downOnToggle = false;
        movedFlag = false;
      });

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

  function setupFab() {
    try {
      var fab = xloadFab();
      fab.addItem(TASK_ID, 'TG媒体下载', openPanel);
      log('fab.ok', { top: window.self === window.top });
    } catch (e) { log('fab.error', { message: String(e && e.message || e) }); }
  }

  // ---- 全局错误捕获（写入日志缓冲，供面板「查看日志」回传）------------
  function registerGlobalErrors() {
    window.addEventListener('error', function (e) {
      try {
        log('window.error', { message: e.message || '', file: e.filename || '', line: e.lineno || 0, col: e.colno || 0 });
      } catch (ignored) { /* ignore */ }
    });
    window.addEventListener('unhandledrejection', function (e) {
      try {
        var r = e && e.reason;
        log('window.unhandledrejection', { message: (r && r.message) ? r.message : String(r) });
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
      } catch (ignored) { /* ignore */ }
    });
  }

  // ---- 启动 ---------------------------------------------------------
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function init() {
    // 宿主站点排除（硬性）：xload 自有域名直接不介入
    if (isSelfHost(location.hostname)) { log('init.skip.selfhost', { host: location.hostname }); return; }
    // 仅 Telegram 网页版生效
    if (!isTargetHost(location.hostname)) { log('init.skip.nontarget', { host: location.hostname }); return; }

    log('init.start', { host: location.hostname, path: location.pathname, ua: navigator.userAgent.slice(0, 80) });
    restoreLogs();
    currentVersion = detectVersion(location.hostname, location.pathname);
    registerGlobalErrors();
    registerChannelHandlers();

    if (settings.showPageButton) {
      setupWebzScan();
      setupWebkScan();
      log('init.adapters.on', {});
    } else {
      log('init.adapters.off', {});
    }

    whenReady(function () {
      setupFab();
    });

    // 周期推送队列/历史到面板，并在面板打开时能拉到最新状态
    setInterval(function () { pushQueue(); }, 3000);

    log('init.done', { version: currentVersion, settings: settings });
  }

  whenReady(init);
})();