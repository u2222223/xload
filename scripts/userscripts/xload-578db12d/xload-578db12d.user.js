// ==UserScript==
// @name         百度网盘视频播放增强
// @namespace    https://github.com/u2222223/xload
// @version      2026.9.12.2
// @description  百度网盘视频播放增强：倍速播放、音量增益、画面与字幕调节、进度记忆，完全免费无广告。
// @description:en Baidu Netdisk video playback booster: playback speed, volume gain, picture & subtitle tuning, resume progress. Free, no ads.
// @author       xload
// @match        http*://yun.baidu.com/s/*
// @match        https://pan.baidu.com/s/*
// @match        https://yan.baidu.com/s/*
// @match        https://pan.baidu.com/wap/home*
// @match        https://pan.baidu.com/play/video*
// @match        https://pan.baidu.com/pfile/video*
// @match        https://pan.baidu.com/pfile/mboxvideo*
// @match        https://pan.baidu.com/mbox/streampage*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用 / 可独立单测）
  // ===================================================================

  // 默认设置（结构化 JSON，全部持久化记忆）
  var DEFAULT_SETTINGS = {
    speed: 1,                // 播放倍速 0.25 ~ 4
    speedMemory: false,      // 记住上次倍速
    longPressEnabled: true,  // 长按加速开关
    longPressSpeed: 3,       // 长按时的临时倍速
    longPressKey: 'KeyA',    // 长按触发键
    seekStep: 5,             // 左右方向键快进快退步进（秒）
    volumeGain: 100,         // 音量增益百分比 100 ~ 300
    eqPreset: 'none',        // 均衡器预设 none/pop/rock/classical/vocal
    bassBoost: false,        // 低音增强
    fitMode: 'auto',         // 画面比例 auto/contain/cover/16_9/4_3
    brightness: 100,         // 亮度 %
    contrast: 100,           // 对比度 %
    saturate: 100,           // 饱和度 %
    hue: 0,                  // 色相度数 0 ~ 360
    rotation: 0,             // 画面旋转 0/90/180/270
    subtitleEnabled: false,  // 本地字幕启用
    subtitleOffset: 0,       // 字幕同步微调（毫秒，负=提前，正=延后）
    subtitleStyle: {
      fontFamily: 'inherit', // 字体
      fontSize: 24,          // 字号
      color: '#ffffff',      // 颜色
      strokeOn: true,        // 描边
      strokeColor: '#000000',
      strokeWidth: 1.5,
      shadowOn: false,       // 阴影
      opacity: 100,          // 不透明度 %
      positionOffset: 40     // 距底部位置（px）
    },
    progressMemory: true,    // 进度记忆（续播）
    autoNext: false          // 自动播放下一个（预留）
  };

  // 视频扩展名（用于播放列表探测）
  var VIDEO_EXT = /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|ts|m2ts|rm|rmvb|mts|3gp|mpg|mpeg)(\?|#|$)/i;

  // 均衡器预设（dB 增益：[60Hz, 230Hz, 910Hz, 3kHz, 6kHz]）
  var EQ_PRESETS = {
    none:       { bands: [0, 0, 0, 0, 0], bass: 0 },
    pop:        { bands: [3, -1, 2, -1, 2], bass: 0 },
    rock:       { bands: [4, 1, -2, 1, 3],  bass: 1 },
    classical:  { bands: [0, 0, 0, -1, 2],  bass: 0 },
    vocal:      { bands: [-1, 0, 3, 2, 0],  bass: 0 }
  };

  // 浅合并：以 base 为基础，patch 覆盖（纯函数，返回新对象）
  function mergeSettings(base, patch) {
    var out = {}, key;
    for (key in base) if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key];
    if (patch && typeof patch === 'object') {
      for (key in patch) if (Object.prototype.hasOwnProperty.call(patch, key)) out[key] = patch[key];
    }
    return out;
  }

  // 数值收敛到 [min, max]，纯函数
  function clampNum(v, min, max) {
    var n = Number(v);
    if (!isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  // 归一化配置（补默认值 + 类型/取值约束，纯函数）
  function normalizeSettings(raw) {
    var s = mergeSettings(DEFAULT_SETTINGS, raw && typeof raw === 'object' ? raw : {});
    s.speed = clampNum(s.speed, 0.25, 4);
    s.speedMemory = Boolean(s.speedMemory);
    s.longPressEnabled = Boolean(s.longPressEnabled);
    s.longPressSpeed = clampNum(s.longPressSpeed, 0.5, 8);
    s.seekStep = clampNum(s.seekStep, 1, 120);
    s.volumeGain = clampNum(s.volumeGain, 100, 300);
    if (!Object.prototype.hasOwnProperty.call(EQ_PRESETS, s.eqPreset)) s.eqPreset = 'none';
    s.bassBoost = Boolean(s.bassBoost);
    s.fitMode = ['auto', 'contain', 'cover', '16_9', '4_3'].indexOf(s.fitMode) >= 0 ? s.fitMode : 'auto';
    s.brightness = clampNum(s.brightness, 20, 300);
    s.contrast = clampNum(s.contrast, 20, 300);
    s.saturate = clampNum(s.saturate, 0, 400);
    s.hue = clampNum(s.hue, 0, 360);
    s.rotation = [0, 90, 180, 270].indexOf(Number(s.rotation)) >= 0 ? Number(s.rotation) : 0;
    s.subtitleEnabled = Boolean(s.subtitleEnabled);
    s.subtitleOffset = clampNum(s.subtitleOffset, -10000, 10000);
    s.progressMemory = Boolean(s.progressMemory);
    s.autoNext = Boolean(s.autoNext);

    var st = s.subtitleStyle && typeof s.subtitleStyle === 'object' ? s.subtitleStyle : {};
    var style = {
      fontFamily: String(st.fontFamily || 'inherit'),
      fontSize: clampNum(st.fontSize, 12, 80),
      color: isHexColor(st.color) ? st.color : '#ffffff',
      strokeOn: Boolean(st.strokeOn),
      strokeColor: isHexColor(st.strokeColor) ? st.strokeColor : '#000000',
      strokeWidth: clampNum(st.strokeWidth, 0, 6),
      shadowOn: Boolean(st.shadowOn),
      opacity: clampNum(st.opacity, 20, 100),
      positionOffset: clampNum(st.positionOffset, 0, 200)
    };
    s.subtitleStyle = style;
    return s;
  }

  // 是否为 #RGB / #RRGGBB 颜色，纯函数
  function isHexColor(c) {
    return typeof c === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c.trim());
  }

  // 外链协议白名单：仅允许 http/https，纯函数
  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  // 宿主站点判断（xload 官网不注入），纯函数
  function isSelfHost(host) {
    host = String(host || '').toLowerCase();
    if (!host) return false;
    if (host === 'xload.net' || host === 'u2222223.github.io') return true;
    return host.indexOf('.xload.net') > 0 || host.indexOf('.u2222223.github.io') > 0;
  }

  // djb2 字符串哈希（稳定，用于进度记忆键），纯函数
  function hashStr(str) {
    var h = 5381, i;
    str = String(str || '');
    for (i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  // 由页面 URL + 媒体源地址生成稳定的进度记忆键，纯函数
  function buildProgressKey(href, src) {
    var h = String(href || '');
    var s = String(src || '');
    // 去掉易变的查询参数（如 token 时间戳），只保留路径与关键 id
    var norm = h.replace(/[?#].*$/, '');
    return hashStr(norm + '|' + s);
  }

  // 解析时间码（支持 H:MM:SS、MM:SS、秒、逗号/点毫秒），返回秒数或 null，纯函数
  function parseTimestamp(t) {
    t = String(t == null ? '' : t).trim().replace(',', '.');
    var m = t.match(/^(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/);
    if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (m[4] ? (+m[4]) / Math.pow(10, m[4].length) : 0);
    m = t.match(/^(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/);
    if (m) return (+m[1]) * 60 + (+m[2]) + (m[3] ? (+m[3]) / Math.pow(10, m[3].length) : 0);
    m = t.match(/^(\d+(?:\.\d+)?)$/);
    if (m) return +m[1];
    return null;
  }

  // 解析 SRT 字幕，返回 [{start, end, text}]，纯函数
  function parseSrt(input) {
    var cues = [];
    var lines = String(input == null ? '' : input).replace(/\r\n?/g, '\n').split('\n');
    var i = 0;
    while (i < lines.length) {
      var line = lines[i].trim();
      if (line === '') { i++; continue; }
      var arrow = lines[i].indexOf('-->');
      if (arrow < 0) { i++; continue; }
      var tm = line.split('-->');
      var start = parseTimestamp(tm[0]);
      var end = parseTimestamp(tm[1] ? tm[1].trim().replace(/\s.*$/, '') : '');
      i++;
      var textLines = [];
      while (i < lines.length && lines[i].trim() !== '') { textLines.push(lines[i].trim()); i++; }
      if (start != null && end != null) cues.push({ start: start, end: end, text: textLines.join('\n') });
    }
    return cues;
  }

  // 解析 WebVTT 字幕，返回 [{start, end, text}]，纯函数
  function parseVtt(input) {
    var text = String(input == null ? '' : input).replace(/\r\n?/g, '\n');
    text = text.replace(/^WEBVTT[^\n]*\n/, '');
    var cues = [];
    var lines = text.split('\n');
    var i = 0;
    while (i < lines.length) {
      var line = lines[i].trim();
      if (line === '') { i++; continue; }
      var arrow = lines[i].indexOf('-->');
      if (arrow < 0) { i++; continue; }
      var tm = line.split('-->');
      var start = parseTimestamp(tm[0].trim());
      var end = parseTimestamp(tm[1] ? tm[1].trim().replace(/\s.*$/, '') : '');
      i++;
      var textLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].replace(/<[^>]+>/g, '').trim());
        i++;
      }
      if (start != null && end != null) cues.push({ start: start, end: end, text: textLines.join('\n') });
    }
    return cues;
  }

  // 解析 ASS 字幕（仅基础 Dialogue 行），返回 [{start, end, text}]，纯函数
  function parseAss(input) {
    var cues = [];
    var lines = String(input == null ? '' : input).replace(/\r\n?/g, '\n').split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('Dialogue:') !== 0) continue;
      var parts = lines[i].slice('Dialogue:'.length).split(',');
      if (parts.length < 10) continue;
      var start = parseTimestamp(parts[1]);
      var end = parseTimestamp(parts[2]);
      var text = parts.slice(9).join(',')
        .replace(/\\N/gi, '\n')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\\h/g, ' ')
        .trim();
      if (start != null && end != null) cues.push({ start: start, end: end, text: text });
    }
    return cues;
  }

  // 自动识别字幕格式并解析，返回 [{start, end, text}]，纯函数
  function parseSubtitle(text, type) {
    var t = String(text == null ? '' : text);
    var kind = String(type || '').toLowerCase();
    if (kind === 'srt') return parseSrt(t);
    if (kind === 'vtt') return parseVtt(t);
    if (kind === 'ass' || kind === 'ssa') return parseAss(t);
    if (/^\s*WEBVTT/m.test(t)) return parseVtt(t);
    if (/\bDialogue:/m.test(t) || /\[Events\]/i.test(t)) return parseAss(t);
    return parseSrt(t);
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  // ---- 页面事实（照抄/核对自目标站点与参考脚本，非实现方式）----------
  // 百度网盘各页面形态下承载 <video> 的容器选择器（视频元素最终取其中的 video 标签）
  var VIDEO_CONTAINERS = [
    '#video-wrap',          // 分享页 / 播放页原生播放器容器
    '.vp-video__player',    // 部分版本播放器容器
    '#app .video-content',  // Vue 版播放页
    '.preview-video',       // 移动端 (wap/home) 预览视频
    'video'                 // 兜底：直接命中 video 元素
  ];

  var TASK_ID = 'xload-578db12d';
  var LS_KEY = 'xload-bdv-settings';
  var LS_LOG_KEY = 'xload-bdv-logs';
  var LS_PROGRESS_KEY = 'xload-bdv-progress';
  // 面板入口固定用主站域名
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-578db12d/panel.html';
  // 宿主站点排除（双保险）
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];

  // ---- 日志系统 ------------------------------------------------------
  var LOG_RING = [];
  function log(tag, data) {
    var entry = { t: new Date().toISOString(), tag: tag, data: data == null ? null : data };
    LOG_RING.push(entry);
    if (LOG_RING.length > 300) LOG_RING.shift();
    try { console.log('[xload:xload-578db12d]', tag, data == null ? '' : data); } catch (e) { /* ignore */ }
    try { window.localStorage.setItem(LS_LOG_KEY, JSON.stringify(LOG_RING.slice(-60))); } catch (e) { /* ignore */ }
    return entry;
  }
  function logText() {
    return LOG_RING.map(function (e) {
      return '[' + e.t + '] ' + e.tag + (e.data != null ? ' ' + JSON.stringify(e.data) : '');
    }).join('\n');
  }
  function restoreLogs() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(LS_LOG_KEY));
      if (Array.isArray(raw)) LOG_RING = raw.slice(-60);
    } catch (e) { /* ignore */ }
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function noop() {}

  // ---- 配置读写 ------------------------------------------------------
  var settings = loadSettings();
  function loadSettings() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(LS_KEY));
      return normalizeSettings(raw);
    } catch (e) { return normalizeSettings({}); }
  }
  function persist(next) {
    settings = normalizeSettings(next);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) { /* 忽略隐私模式异常 */ }
  }
  function currentSettings() { return settings; }

  // ---- 面板通信（共享模板 templates/channel.js 整体复制，勿改投递顺序）----
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
        if (win && typeof win.postMessage === 'function') { win.postMessage.call(win, m, '*'); return true; }
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
      var W = Math.min(940, Math.max(500, (window.screen.availWidth || 1280) - 120));
      var H = Math.min(820, Math.max(560, (window.screen.availHeight || 800) - 140));
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

  // ---- 播放器增强核心（在原生 <video> 上做增强，不替换播放器）---------

  // 发现当前视频元素（按容器选择器顺序取第一个带 video 的）
  function findVideo() {
    for (var i = 0; i < VIDEO_CONTAINERS.length; i++) {
      var sel = VIDEO_CONTAINERS[i];
      var nodes;
      try {
        if (sel === 'video') nodes = $$('video');
        else {
          var c = $(sel);
          nodes = c ? $$('video', c) : [];
        }
      } catch (e) { nodes = []; }
      for (var j = 0; j < nodes.length; j++) {
        var v = nodes[j];
        // 过滤掉广告/预览极小的视频，尽量命中主视频
        if (v && (v.currentSrc || v.src || v.getAttribute('src')) && (v.offsetWidth > 80 || v.videoWidth > 0)) return v;
      }
    }
    // 宽松兜底：取尺寸最大的 video
    var all = $$('video');
    var best = null, bestArea = 0;
    for (var k = 0; k < all.length; k++) {
      var area = all[k].offsetWidth * all[k].offsetHeight;
      if (all[k].currentSrc || all[k].src) {
        if (area >= bestArea) { best = all[k]; bestArea = area; }
      }
    }
    return best;
  }

  var activeVideo = null;
  var lastVideoKey = '';
  var boundElements = {}; // 已绑定的 video 元素（按 __xloadBpId 索引）

  function elementId(el) {
    if (!el.__xloadBpId) el.__xloadBpId = (function () { BP_SEQ = (BP_SEQ || 0) + 1; return BP_SEQ; })();
    return el.__xloadBpId;
  }
  var BP_SEQ = 0;

  // ---- 画面调节（CSS filter + object-fit + transform）----
  function applyPicture(video, s) {
    var filterParts = [
      'brightness(' + (s.brightness / 100) + ')',
      'contrast(' + (s.contrast / 100) + ')',
      'saturate(' + (s.saturate / 100) + ')'
    ];
    if (s.hue) filterParts.push('hue-rotate(' + s.hue + 'deg)');
    video.style.filter = filterParts.join(' ');
    video.style.transform = s.rotation ? 'rotate(' + s.rotation + 'deg)' : '';

    var fitMap = { auto: '', contain: 'contain', cover: 'cover', '16_9': 'cover', '4_3': 'cover' };
    var obf = fitMap[s.fitMode];
    if (obf) {
      video.style.objectFit = obf;
      if (s.fitMode === '16_9') { video.style.aspectRatio = '16 / 9'; video.style.width = video.style.width || '100%'; }
      else if (s.fitMode === '4_3') { video.style.aspectRatio = '4 / 3'; video.style.width = video.style.width || '100%'; }
      else { video.style.aspectRatio = ''; }
    } else {
      video.style.objectFit = '';
      video.style.aspectRatio = '';
    }
  }

  function isPictureDefault(s) {
    return s.brightness === 100 && s.contrast === 100 && s.saturate === 100 && !s.hue && !s.rotation && s.fitMode === 'auto';
  }

  // ---- 音频增强（Web Audio API：音量增益 + 均衡器 + 低音增强）----
  var audio = { ctx: null, entries: {} }; // entries[videoId] = {gain, filters[], bass, el}

  function ensureAudioFor(video, s) {
    var needBoost = s.volumeGain > 100 || s.eqPreset !== 'none' || s.bassBoost;
    if (!needBoost) { syncNativeVolume(video); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { log('audio.noSupport', {}); return; }
    var id = elementId(video);
    try {
      if (!audio.ctx) audio.ctx = new AC();
      var entry = audio.entries[id];
      if (!entry) {
        var src = audio.ctx.createMediaElementSource(video);
        var gain = audio.ctx.createGain();
        var nodes = [];
        // 5 段 EQ：60/230/910/3000/6000
        var types = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
        var freqs = [60, 230, 910, 3000, 6000];
        for (var i = 0; i < 5; i++) {
          var f = audio.ctx.createBiquadFilter();
          f.type = types[i];
          f.frequency.value = freqs[i];
          f.gain.value = 0;
          nodes.push(f);
        }
        var bass = audio.ctx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 100;
        bass.gain.value = 0;
        var prev = src;
        for (var k = 0; k < nodes.length; k++) { prev.connect(nodes[k]); prev = nodes[k]; }
        prev.connect(bass);
        bass.connect(gain);
        gain.connect(audio.ctx.destination);
        entry = { gain: gain, filters: nodes, bass: bass, el: video };
        audio.entries[id] = entry;
        bindVolumeMirror(video);
      }
      applyAudioSettings(entry, video, s);
      if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    } catch (e) {
      log('audio.ensure.error', { message: String(e && e.message || e) });
    }
  }

  function applyAudioSettings(entry, video, s) {
    var preset = EQ_PRESETS[s.eqPreset] || EQ_PRESETS.none;
    for (var i = 0; i < entry.filters.length; i++) {
      entry.filters[i].gain.value = preset.bands[i] || 0;
    }
    entry.bass.gain.value = s.bassBoost ? 9 : (preset.bass || 0);
    setGain(entry, video, s);
  }

  function setGain(entry, video, s) {
    var mult = s.volumeGain / 100;
    var base = video.muted ? 0 : video.volume;
    try { entry.gain.gain.value = clampNum(base * mult, 0, 3); } catch (e) { /* ignore */ }
  }

  function syncNativeVolume(video) {
    // 未开启增益时不做任何处理，保持原生行为（不对元素建 WebAudio 链接）
  }

  function bindVolumeMirror(video) {
    var id = elementId(video);
    if (video.__xloadVolBound) return;
    video.__xloadVolBound = true;
    video.addEventListener('volumechange', function () {
      var entry = audio.entries[id];
      if (entry) setGain(entry, video, settings);
    });
    video.addEventListener('play', function () {
      if (audio.ctx && audio.ctx.state === 'suspended') { try { audio.ctx.resume(); } catch (e) { /* ignore */ } }
    });
  }

  // ---- 字幕渲染 ----
  var subtitleCues = [];
  var subtitleType = '';
  var subtitleEl = null;
  var subtitleVideo = null;

  function clearSubtitleOverlay() {
    if (subtitleEl && subtitleEl.parentNode) { subtitleEl.parentNode.removeChild(subtitleEl); subtitleEl = null; }
    subtitleVideo = null;
  }

  function ensureSubtitleOverlay(video) {
    if (subtitleEl && subtitleEl.parentNode && subtitleVideo === video) return subtitleEl;
    clearSubtitleOverlay();
    var parent = video.parentElement;
    if (!parent) return null;
    try {
      var pos = window.getComputedStyle(parent).position;
      if (pos === 'static') parent.style.position = 'relative';
    } catch (e) { /* ignore */ }
    var el = document.createElement('div');
    el.setAttribute('data-xload-sub', 'true');
    var st = settings.subtitleStyle;
    el.style.cssText = 'position:absolute;left:4%;right:4%;bottom:' + st.positionOffset + 'px;' +
      'text-align:center;pointer-events:none;z-index:2147483600;' +
      'white-space:pre-wrap;line-height:1.4;';
    parent.appendChild(el);
    subtitleEl = el;
    subtitleVideo = video;
    return el;
  }

  function applySubtitleStyle() {
    if (!subtitleEl) return;
    var st = settings.subtitleStyle;
    var css = 'position:absolute;left:4%;right:4%;bottom:' + st.positionOffset + 'px;' +
      'text-align:center;pointer-events:none;z-index:2147483600;' +
      'white-space:pre-wrap;line-height:1.4;';
    css += 'font-family:' + st.fontFamily + ';font-size:' + st.fontSize + 'px;color:' + st.color + ';';
    css += 'opacity:' + (st.opacity / 100) + ';';
    if (st.strokeOn) css += '-webkit-text-stroke:' + st.strokeWidth + 'px ' + st.strokeColor + ';';
    if (st.shadowOn) css += 'text-shadow:0 2px 4px rgba(0,0,0,0.85);';
    subtitleEl.style.cssText = css;
  }

  function renderSubtitle(video) {
    if (!settings.subtitleEnabled || !subtitleCues.length) {
      if (subtitleEl) subtitleEl.textContent = '';
      return;
    }
    var el = ensureSubtitleOverlay(video);
    if (!el) return;
    var t = video.currentTime + (settings.subtitleOffset / 1000);
    var text = '';
    for (var i = 0; i < subtitleCues.length; i++) {
      var c = subtitleCues[i];
      if (t >= c.start && t <= c.end) { text = c.text; break; }
    }
    el.textContent = text;
  }

  function setSubtitle(name, text, type) {
    var cues = parseSubtitle(text, type);
    if (!cues.length) { log('subtitle.empty', { name: name }); return false; }
    subtitleCues = cues;
    subtitleType = type || 'auto';
    settings.subtitleEnabled = true;
    persist(settings);
    if (subtitleEl) applySubtitleStyle();
    log('subtitle.load', { name: name, cues: cues.length });
    return true;
  }

  function clearSubtitle() {
    subtitleCues = [];
    clearSubtitleOverlay();
    settings.subtitleEnabled = false;
    persist(settings);
    log('subtitle.clear', {});
  }

  // ---- 进度记忆 ----
  function loadProgressMap() {
    try { return JSON.parse(window.localStorage.getItem(LS_PROGRESS_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveProgressMap(map) {
    try { window.localStorage.setItem(LS_PROGRESS_KEY, JSON.stringify(map)); } catch (e) { /* ignore */ }
  }

  function restoreProgress(video) {
    if (!settings.progressMemory) return;
    var key = buildProgressKey(location.href, video.currentSrc || video.src || '');
    var map = loadProgressMap();
    var t = map[key];
    if (t && t > 5 && video.duration - t > 5) {
      try { video.currentTime = t; log('progress.restore', { key: key, time: t }); } catch (e) { /* ignore */ }
    }
  }

  function rememberProgressLoop() {
    setInterval(function () {
      if (!settings.progressMemory) return;
      var v = activeVideo || findVideo();
      if (!v || !v.duration || !v.currentTime) return;
      var key = buildProgressKey(location.href, v.currentSrc || v.src || '');
      var map = loadProgressMap();
      map[key] = v.currentTime;
      // 只保留最近 200 条，按时间截断
      var keys = Object.keys(map);
      if (keys.length > 200) {
        keys.slice(0, keys.length - 200).forEach(function (k) { delete map[k]; });
      }
      saveProgressMap(map);
    }, 3000);
  }

  // ---- 播放列表（尽力而为：从 DOM 收集视频文件链接）----
  function detectPlaylist() {
    var seen = {};
    var list = [];
    function add(name, url) {
      if (!url || !name) return;
      if (seen[url]) return;
      seen[url] = true;
      list.push({ name: name, url: url });
    }
    $$('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var text = (a.textContent || '').trim();
      if (VIDEO_EXT.test(unescape(href)) || VIDEO_EXT.test(text)) {
        add(text || href.split('/').pop(), a.href);
      } else if (/(fid=|path=)/.test(href) && text) {
        add(text, a.href);
      }
    });
    // 补充：带 data-fs-id / data-path 的元素
    $$('[data-fs-id], [data-fid], [data-path]').forEach(function (n) {
      var text = (n.getAttribute('data-name') || n.getAttribute('title') || n.textContent || '').trim();
      var href = null;
      var fsid = n.getAttribute('data-fs-id') || n.getAttribute('data-fid');
      var path = n.getAttribute('data-path');
      if (path) href = path;
      if (text && (VIDEO_EXT.test(text) || path)) add(text, href || location.href);
    });
    return list.slice(0, 200);
  }

  // ---- 应用到单个视频 ----
  function applyToVideo(video) {
    var s = settings;
    if (s.speed && video.playbackRate !== s.speed) {
      try { video.playbackRate = s.speed; } catch (e) { /* ignore */ }
    }
    applyPicture(video, s);
    ensureAudioFor(video, s);
    if (s.subtitleEnabled) renderSubtitle(video);
  }

  function bindVideo(video) {
    var id = elementId(video);
    if (boundElements[id]) return;
    boundElements[id] = true;
    video.addEventListener('timeupdate', function () { renderSubtitle(video); });
    video.addEventListener('seeked', function () { renderSubtitle(video); });
    video.addEventListener('ratechange', function () { pushStateSoon(); });
    video.addEventListener('play', function () { pushStateSoon(); });
    video.addEventListener('pause', function () { pushStateSoon(); });
  }

  // ---- 键盘快捷键 + 长按加速 ----
  var longPressActive = false;
  var longPressTimer = null;

  function applySpeed(video, spd) {
    if (video) { try { video.playbackRate = spd; } catch (e) { /* ignore */ } }
  }

  function onKeyDown(e) {
    var v = activeVideo || findVideo();
    if (!v) return;
    // 输入框内不拦截
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (settings.longPressEnabled && e.code === settings.longPressKey && !e.repeat) {
      e.preventDefault();
      longPressActive = true;
      applySpeed(v, settings.longPressSpeed);
      log('longpress.start', { speed: settings.longPressSpeed });
      return;
    }
    if (e.code === 'ArrowRight' && !e.shiftKey) {
      e.preventDefault();
      try { v.currentTime = Math.min(v.duration || 0, v.currentTime + settings.seekStep); } catch (err) { /* ignore */ }
      pushStateSoon();
    } else if (e.code === 'ArrowLeft' && !e.shiftKey) {
      e.preventDefault();
      try { v.currentTime = Math.max(0, v.currentTime - settings.seekStep); } catch (err) { /* ignore */ }
      pushStateSoon();
    }
  }

  function onKeyUp(e) {
    if (settings.longPressEnabled && longPressActive && e.code === settings.longPressKey) {
      longPressActive = false;
      var v = activeVideo || findVideo();
      applySpeed(v, settings.speed);
      log('longpress.end', { speed: settings.speed });
    }
  }

  // ---- 播放状态回传（节流）----
  var pushTimer = null;
  function pushStateSoon() {
    if (pushTimer) return;
    pushTimer = setTimeout(function () { pushTimer = null; pushState(); }, 300);
  }

  function getPlayerState() {
    var v = activeVideo || findVideo();
    if (!v) return { connected: true, hasVideo: false };
    var quality = '';
    if (v.videoWidth && v.videoHeight) quality = v.videoWidth + '×' + v.videoHeight;
    return {
      connected: true,
      hasVideo: true,
      title: document.title || '',
      duration: v.duration || 0,
      currentTime: v.currentTime || 0,
      speed: v.playbackRate || 1,
      volume: v.volume || 0,
      muted: v.muted,
      paused: v.paused,
      quality: quality,           // 实际渲染分辨率（透明展示，避免「1080P 实为 720P」）
      videoWidth: v.videoWidth || 0,
      videoHeight: v.videoHeight || 0
    };
  }

  function pushState() {
    channel.send('playerState', getPlayerState());
  }

  // ---- 发现循环：监测视频切换 ----
  function tick() {
    var v = findVideo();
    if (v !== activeVideo) {
      activeVideo = v;
      if (v) {
        bindVideo(v);
        restoreProgress(v);
        applyToVideo(v);
        log('video.found', { src: (v.currentSrc || v.src || '').slice(0, 120), w: v.videoWidth, h: v.videoHeight });
      }
    } else if (v) {
      var key = v.currentSrc || v.src || '';
      if (key && key !== lastVideoKey) {
        lastVideoKey = key;
        restoreProgress(v);
        applyToVideo(v);
        log('video.switched', { src: key.slice(0, 120) });
      }
      // 持续校正倍速（部分播放器会重置）
      if (settings.speed && Math.abs(v.playbackRate - settings.speed) > 0.01 && !longPressActive) {
        applySpeed(v, settings.speed);
      }
      if (settings.subtitleEnabled && subtitleCues.length) renderSubtitle(v);
    }
    lastVideoKey = (v && (v.currentSrc || v.src)) || '';
  }

  function applyAll() {
    var v = activeVideo || findVideo();
    if (v) {
      if (longPressActive) applySpeed(v, settings.longPressSpeed);
      else applySpeed(v, settings.speed);
      applyPicture(v, settings);
      ensureAudioFor(v, settings);
    }
    applySubtitleStyle();
    if (v && settings.subtitleEnabled) renderSubtitle(v);
    if (v && !settings.subtitleEnabled && subtitleEl) subtitleEl.textContent = '';
    pushStateSoon();
  }

  function resetAll() {
    persist(DEFAULT_SETTINGS);
    try { window.localStorage.removeItem(LS_PROGRESS_KEY); } catch (e) { /* ignore */ }
    clearSubtitleOverlay();
    applyAll();
    log('reset', {});
  }

  // ---- 命令处理 ----
  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });
      var resp;
      switch (action) {
        case 'querySettings':
          resp = { ok: true, settings: settings };
          break;
        case 'applySettings':
          persist(mergeSettings(settings, data.settings || {}));
          applyAll();
          resp = { ok: true, settings: settings };
          break;
        case 'resetSettings':
          resetAll();
          resp = { ok: true, settings: settings };
          break;
        case 'getState':
          resp = getPlayerState();
          break;
        case 'loadSubtitle':
          var okSub = setSubtitle(data.name, data.text, data.type);
          if (subtitleEl) applySubtitleStyle();
          resp = { ok: okSub, cues: subtitleCues.length };
          break;
        case 'clearSubtitle':
          clearSubtitle();
          resp = { ok: true };
          break;
        case 'seek':
          var vv = activeVideo || findVideo();
          var delta = Number(data.seconds) || 0;
          if (vv && delta) { try { vv.currentTime = Math.max(0, Math.min(vv.duration || 0, vv.currentTime + delta)); } catch (e) { /* ignore */ } }
          resp = { ok: true, currentTime: vv ? vv.currentTime : 0 };
          break;
        case 'setSpeed':
          persist(mergeSettings(settings, { speed: clampNum(data.speed, 0.25, 4) }));
          applyAll();
          resp = { ok: true, settings: settings };
          break;
        case 'getPlaylist':
          resp = { ok: true, playlist: detectPlaylist() };
          break;
        case 'switchVideo':
          var url = data.url;
          if (isSafeUrl(url)) { try { location.href = url; } catch (e) { /* ignore */ } }
          resp = { ok: true };
          break;
        case 'getLogs':
          resp = { ok: true, logs: logText() };
          break;
        default:
          resp = { ok: false, error: '未知命令: ' + action };
      }
      channel.reply(msg, resp);
    });
  }

  // ---- 启动 ----
  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function init() {
    // 宿主站点排除（硬性）：xload 官网直接返回
    if (isSelfHost(location.hostname) || SELF_HOSTS.indexOf(location.hostname) >= 0) { return; }

    // 全局错误捕获（必加）：统一写入日志环形缓冲
    window.addEventListener('error', function (e) {
      log('window.error', { message: e && e.message, file: e && e.filename, line: e && e.lineno, col: e && e.colno });
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      log('unhandledrejection', { message: r && r.message ? r.message : String(r) });
      if (e && e.preventDefault) e.preventDefault();
    });

    log('init.start', { host: location.hostname, path: location.pathname });

    restoreLogs();
    registerChannelHandlers();
    rememberProgressLoop();

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    // 长按加速：若焦点丢失则复位（安全兜底）
    window.addEventListener('blur', function () {
      if (longPressActive) { longPressActive = false; var v = activeVideo || findVideo(); applySpeed(v, settings.speed); }
    });

    // 视频发现循环
    setInterval(tick, 800);
    if (window.MutationObserver) {
      try {
        var mo = new MutationObserver(function () { tick(); });
        mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
      } catch (e) { /* ignore */ }
    }
    document.addEventListener('play', tick, true);
    document.addEventListener('canplay', tick, true);

    whenReady(function () {
      try {
        // 尽早定位到视频
        tick();
        // 聚合按钮组（共享模板 xloadFab）
        var fab = xloadFab();
        fab.addItem(TASK_ID, '网盘播放增强', openPanel);
        log('init.fab.ok', {});
      } catch (e) { log('init.fab.error', { message: String(e && e.message || e) }); }
    });

    // 周期回传播放状态
    setInterval(pushStateSoon, 1500);

    log('init.done', { settings: settings });
  }

  // =====================================================================
  // xload 聚合按钮组（FAB）共享模板 —— templates/fab.js 整体复制
  // =====================================================================
  function xloadFab() {
    if (window.self !== window.top) {
      return {
        root: null, list: null,
        setCollapsed: function () {}, toggleCollapse: function () {},
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
        if (typeof GM_getValue === 'function') { var v = GM_getValue(key, null); return (v == null) ? def : v; }
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
        if (p && typeof p.x === 'number' && typeof p.y === 'number') { applyPos(p.x, p.y); }
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
            if (Math.abs(ev2.clientX - sx2) > DRAG_THRESHOLD || Math.abs(ev2.clientY - sy2) > DRAG_THRESHOLD) dragged = true;
          };
          var onUp = function () {
            item.removeEventListener('pointermove', onMove);
            item.removeEventListener('pointerup', onUp);
            item.removeEventListener('pointercancel', onUp);
            if (dragged) movedFlag = true;
          };
          item.addEventListener('pointermove', onMove);
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

  whenReady(init);
})();