// ==UserScript==
// @name         HTML5视频播放增强
// @name:en      HTML5 Video Playback Booster
// @namespace    https://github.com/u2222223/xload
// @version      2026.9.12.1
// @description  全能 HTML5 视频播放增强：倍速调节与记忆、一键视频截图、画中画、网页全屏、快进快退、音量控制、自定义快捷键与长按加速。通用能力对所有 H5 视频页面生效，并内置 B站/YouTube/爱奇艺/腾讯视频/优酷/芒果TV 等主流站点适配。
// @description:en  All-in-one HTML5 video playback booster: playback rate control with memory, one-click screenshot, picture-in-picture, web fullscreen, seek/volume control, customizable hotkeys and hold-to-accelerate. Works generically on any HTML5 video page with adapters for Bilibili, YouTube, iQiyi, Tencent, Youku, Mango TV and more.
// @author       xload
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // =====================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用，可独立单测）
  // =====================================================================

  // 宿主站点：脚本不在自己的网站上注入按钮/样式（避免污染 xload 官网页面）
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];

  // 默认快捷键（规范组合：Ctrl+Shift+Alt+Meta+Key，Key 单字符小写，Space 用 'Space'）
  var DEFAULT_SHORTCUTS = {
    playPause: 'Space',
    forward: 'ArrowRight',
    backward: 'ArrowLeft',
    forwardLarge: 'Shift+ArrowRight',
    backwardLarge: 'Shift+ArrowLeft',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    mute: 'm',
    rateUp: 'c',
    rateDown: 'x',
    rateReset: 'z',
    next: 'n',
    screenshot: 'p',
    pip: 'i',
    fullscreen: 'Enter',
    webFullscreen: 'Shift+Enter',
    prevFrame: 'd',
    nextFrame: 'f',
    exitFullscreen: 'Escape',
    longPress: 'g'
  };

  // 默认配置（结构化 JSON 存储）
  var DEFAULT_CONFIG = {
    enabled: true,                // 总开关
    whitelistMode: false,         // false=黑名单(排除) | true=白名单(仅启用)
    enabledSites: [],             // 白名单站点（白名单模式生效）
    excludeSites: ['xload.net', 'u2222223.github.io'], // 排除站点（含宿主站点）
    rateMode: 'remember',         // remember=记住上次 | default=固定默认 | site=站点级 | off=不改
    defaultRate: 1.0,             // 默认倍速（default 模式）
    longPressEnabled: true,       // 长按加速开关
    longPressRate: 3.0,           // 长按加速目标倍速
    seekStep: 5,                  // 快进/快退步进（秒）
    seekStepLarge: 20,            // Shift 大步进（秒）
    volumeStep: 0.1,              // 音量步进
    screenshotFormat: 'png',      // png | jpg
    pipEnabled: true,             // 画中画
    webFullscreenEnabled: true,   // 网页全屏
    shortcuts: DEFAULT_SHORTCUTS, // 快捷键映射
    siteRates: {}                 // 站点级倍速记忆 {host: rate}
  };

  // 站点事实（照抄客观 DOM 选择器）：主流站点播放器的按钮/容器选择器
  // key 同时用于 detectSite 返回；shortcutOverrides 为该站点按键习惯的重映射。
  var SITE_ADAPTERS = {
    youtube: {
      shell: '#movie_player',
      play: 'button.ytp-play-button',
      next: 'a.ytp-next-button',
      full: 'button.ytp-fullscreen-button',
      shortcutOverrides: { rateUp: 'v', nextFrame: 'e' }
    },
    bilibili: {
      shell: '#bilibili-player',
      next: '.bpx-player-ctrl-next',
      webFull: '.bpx-player-ctrl-web',
      full: '.bpx-player-ctrl-full',
      liveHostPrefix: 'live.'
    },
    iqiyi: {
      full: '.iqp-btn-fullscreen:not(.fake__click)',
      next: '.iqp-btn-next'
    },
    qq: {
      shell: '#player',
      next: '.txp_btn_next_u',
      webFull: '.txp_btn_fake',
      full: '.txp_btn_fullscreen'
    },
    youku: {
      shell: '#ykPlayer',
      webFull: '.kui-webfullscreen-icon-0',
      full: '.kui-fullscreen-icon-0',
      next: '.kui-next-icon-0'
    },
    mgtv: {
      full: 'mango-screen',
      webFull: 'mango-webscreen > a',
      next: 'mango-control-playnext-btn'
    },
    ixigua: {
      full: 'div[aria-label="全屏"]',
      next: '.xgplayer-control-item.control_playnext'
    },
    acfun: {
      next: '.btn-next-part .control-btn',
      webFull: '.fullscreen-web',
      full: '.fullscreen-screen'
    },
    sohu: {
      next: 'li.on[data-vid]+li a',
      full: '.x-fullscreen-btn',
      webFull: '.x-pagefs-btn'
    },
    twitch: {
      full: 'button[data-a-target=player-fullscreen-button]',
      play: 'button[data-a-target=player-play-pause-button]',
      webFull: '.player-controls__right-control-group > div:nth-child(4) > button'
    },
    douyu: {
      video: '.layout-Player video',
      shell: '#js-player-video',
      play: 'div[class|=play]',
      webFull: '.wfs-2a8e83',
      full: '.fs-781153',
      liveHostNote: 'live room uses .layout-Player video'
    },
    huya: {
      webFull: '.player-fullpage-btn',
      full: '.player-fullscreen-btn',
      play: '#player-btn'
    },
    douyin: {
      full: '.xgplayer-fullscreen',
      shortcutOverrides: { rateUp: 'v', rateDown: 's', rateReset: 'a' }
    },
    weibo: { multipleVideo: true },
    baidu: { forcePlaybackRate: true },
    '163': { multipleVideoOnNews: true },
    ted: { full: 'button[title=Fullscreen]' }
  };

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

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  // 浅合并（纯函数，不修改 base）
  function mergeObject(base, patch) {
    var out = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    if (isPlainObject(patch)) {
      for (k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k];
    }
    return out;
  }

  // 外链协议白名单：仅允许 http/https
  function isSafeUrl(url) {
    return isString(url) && /^https?:\/\//i.test(url.trim());
  }

  // 宿主站点判断（纯函数，不读 location）
  function isSelfHost(host) {
    host = String(host || '').toLowerCase();
    if (!host) return false;
    for (var i = 0; i < SELF_HOSTS.length; i++) {
      var h = SELF_HOSTS[i];
      if (host === h || host.endsWith('.' + h)) return true;
    }
    return false;
  }

  // 通配符主机匹配：patterm 精确或 *.domain.com（匹配子域，不含根域本身）
  function matchHost(host, pattern) {
    host = String(host || '').toLowerCase();
    pattern = String(pattern || '').trim().toLowerCase();
    if (!host || !pattern) return false;
    if (pattern === host) return true;
    if (pattern.charCodeAt(0) === 42 && pattern.length > 1) {
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

  // 主域名提取（用于站点识别/日志，不与 location 耦合）
  function getMainDomain(host) {
    host = String(host || '').toLowerCase();
    var parts = host.split('.');
    if (parts.length < 2) return host;
    var i = parts.length - 2;
    if (/^(com|net|org|gov|edu|co|cc|tv|ac|cn|io)$/.test(parts[i])) i--;
    return parts[Math.max(0, i)] || host;
  }

  // 站点识别（纯函数，返回 SITE_ADAPTERS 的 key 或 'generic'）
  function detectSite(host) {
    host = String(host || '').toLowerCase();
    if (!host) return 'generic';
    if (/youtube\.com$|youtube\.no$|youtube-nocookie\.com$/.test(host)) return 'youtube';
    if (/bilibili\.com$/.test(host)) return 'bilibili';
    if (/iqiyi\.com$/.test(host)) return 'iqiyi';
    if (/\.qq\.com$/.test(host)) return 'qq';
    if (/youku\.com$|tudou\.com$/.test(host)) return 'youku';
    if (/mgtv\.com$/.test(host)) return 'mgtv';
    if (/ixigua\.com$/.test(host)) return 'ixigua';
    if (/acfun\.cn$/.test(host)) return 'acfun';
    if (/sohu\.com$/.test(host)) return 'sohu';
    if (/twitch\.tv$/.test(host)) return 'twitch';
    if (/douyu\.com$/.test(host)) return 'douyu';
    if (/huya\.com$/.test(host)) return 'huya';
    if (/douyin\.com$/.test(host)) return 'douyin';
    if (/weibo\.com$|weibo\.cn$/.test(host)) return 'weibo';
    if (/baidu\.com$/.test(host)) return 'baidu';
    if (/163\.com$|126\.com$/.test(host)) return '163';
    if (/ted\.com$/.test(host)) return 'ted';
    return 'generic';
  }

  // 当前站点是否被排除（纯函数）
  function isSiteExcluded(cfg, host) {
    if (cfg && cfg.enabled === false) return true;
    if (!cfg) return false;
    if (cfg.whitelistMode && Array.isArray(cfg.enabledSites) && cfg.enabledSites.length) {
      return !hostMatchesAny(host, cfg.enabledSites);
    }
    return hostMatchesAny(host, cfg.excludeSites);
  }

  // ---- 快捷键组合：规范化 / 事件提取 ----
  function isModifierKey(key) {
    return key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta';
  }

  function normalizeKeyPart(key) {
    if (key == null) return '';
    key = String(key);
    if (key === ' ' || key === 'Spacebar') return 'Space';
    if (key.length === 1) return key.toLowerCase();
    return key;
  }

  // 由 keydown 事件对象提取规范组合（纯函数，仅读取入参）
  function comboFromEvent(ev) {
    if (!ev || ev.key == null) return '';
    var key = ev.key;
    if (isModifierKey(key)) return '';
    var k = normalizeKeyPart(key);
    if (!k) return '';
    var parts = [];
    if (ev.ctrlKey) parts.push('Ctrl');
    if (ev.shiftKey) parts.push('Shift');
    if (ev.altKey) parts.push('Alt');
    if (ev.metaKey) parts.push('Meta');
    parts.push(k);
    return parts.join('+');
  }

  // 把用户录入的组合字符串规范化（如 "shift+ArrowRight" -> "Shift+ArrowRight"）
  function normalizeCombo(str) {
    if (str == null) return '';
    var raw = String(str);
    var trimmed = raw.trim();
    if (trimmed === '') return raw.indexOf(' ') >= 0 ? 'Space' : '';
    var parts = trimmed.split('+').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    if (!parts.length) return '';
    var seen = { Ctrl: false, Shift: false, Alt: false, Meta: false };
    var key = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var lc = p.toLowerCase();
      if (lc === 'ctrl' || lc === 'control') seen.Ctrl = true;
      else if (lc === 'shift') seen.Shift = true;
      else if (lc === 'alt' || lc === 'option') seen.Alt = true;
      else if (lc === 'meta' || lc === 'cmd' || lc === 'command' || lc === 'win') seen.Meta = true;
      else key = p;
    }
    var order = ['Ctrl', 'Shift', 'Alt', 'Meta'];
    var out = [];
    for (var j = 0; j < order.length; j++) if (seen[order[j]]) out.push(order[j]);
    var nk = normalizeKeyPart(key);
    if (!nk) return '';
    out.push(nk);
    return out.join('+');
  }

  // 取组合的按键部分（如 'Shift+ArrowRight' -> 'ArrowRight'）
  function comboKeyPart(combo) {
    combo = String(combo || '');
    var idx = combo.lastIndexOf('+');
    return idx >= 0 ? combo.slice(idx + 1) : combo;
  }

  // 归一化快捷键映射（缺失/非法项回落到默认）
  function normalizeShortcuts(map) {
    var out = {};
    for (var k in DEFAULT_SHORTCUTS) {
      var combo = map && map[k] ? normalizeCombo(map[k]) : '';
      out[k] = combo || DEFAULT_SHORTCUTS[k];
    }
    return out;
  }

  // ---- 播放数值约束 ----
  function normalizeRate(r) {
    r = Number(r);
    if (!isFinite(r)) return 1;
    return clamp(r, 0.25, 4);
  }

  function normalizeVolume(v) {
    v = Number(v);
    if (!isFinite(v)) return 1;
    return clamp(v, 0, 1);
  }

  function formatTime(sec) {
    sec = Number(sec);
    if (!isFinite(sec) || sec < 0 || sec > 8640000) sec = 0;
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return (h > 0 ? h + ':' : '') + pad(m) + ':' + pad(s);
  }

  function buildFilename(base, ext) {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var ts = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    var title = String(base || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
    return 'xload_shot_' + ts + '_' + title + '.' + ext;
  }

  // 配置归一化（补默认 + 类型/取值约束）
  function normalizeConfig(raw) {
    var c = mergeObject(DEFAULT_CONFIG, isPlainObject(raw) ? raw : {});
    c.enabled = c.enabled !== false;
    c.whitelistMode = Boolean(c.whitelistMode);
    c.enabledSites = Array.isArray(c.enabledSites) ? c.enabledSites.filter(isString) : [];
    c.excludeSites = Array.isArray(c.excludeSites) && c.excludeSites.length ? c.excludeSites.filter(isString) : DEFAULT_CONFIG.excludeSites.slice();
    if (['remember', 'default', 'site', 'off'].indexOf(c.rateMode) < 0) c.rateMode = 'remember';
    c.defaultRate = normalizeRate(c.defaultRate);
    c.longPressEnabled = c.longPressEnabled !== false;
    c.longPressRate = normalizeRate(c.longPressRate);
    c.seekStep = clamp(Number(c.seekStep) || 5, 1, 300);
    c.seekStepLarge = clamp(Number(c.seekStepLarge) || 20, 1, 3600);
    c.volumeStep = clamp(Number(c.volumeStep) || 0.1, 0.01, 0.5);
    c.screenshotFormat = c.screenshotFormat === 'jpg' ? 'jpg' : 'png';
    c.pipEnabled = c.pipEnabled !== false;
    c.webFullscreenEnabled = c.webFullscreenEnabled !== false;
    c.shortcuts = normalizeShortcuts(c.shortcuts);
    c.siteRates = isPlainObject(c.siteRates) ? c.siteRates : {};
    return c;
  }

  // =====================================================================
  // CORE-END
  // =====================================================================

  // ---- 常量（运行时）-----------------------------------------------
  var TASK_ID = 'xload-d5aaecca';
  var LS_KEY = 'xload-vpb-settings';
  var RATE_KEY = 'xload-vpb-rate';
  var SITE_RATE_KEY = 'xload-vpb-site-rates';
  var LOG_KEY = 'xload-' + TASK_ID + '-logs';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/' + TASK_ID + '/panel.html';
  var NAV_KEYS = { Space: 1, ArrowRight: 1, ArrowLeft: 1, ArrowUp: 1, ArrowDown: 1, PageUp: 1, PageDown: 1 };

  // ---- 日志系统（console + localStorage 环形缓冲 ~60 条）-------------
  var LOG_RING = [];
  function log(tag, data) {
    var entry = { t: new Date().toISOString(), tag: tag, data: data == null ? null : data };
    LOG_RING.push(entry);
    if (LOG_RING.length > 400) LOG_RING.shift();
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

  // ---- 配置读写 -----------------------------------------------------
  function loadConfig() {
    try { return normalizeConfig(JSON.parse(window.localStorage.getItem(LS_KEY))); } catch (e) { return normalizeConfig(null); }
  }
  var config = loadConfig();

  function persistConfig(next) {
    next = normalizeConfig(next);
    config = next;
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch (e) { /* ignore */ }
    recomputeShortcuts();
    return config;
  }

  // ---- 倍速记忆（localStorage）-------------------------------------
  function readRate() {
    try { var r = parseFloat(window.localStorage.getItem(RATE_KEY)); return isFinite(r) && r > 0 ? normalizeRate(r) : normalizeRate(config.defaultRate); } catch (e) { return normalizeRate(config.defaultRate); }
  }
  function writeRate(r) { try { window.localStorage.setItem(RATE_KEY, String(normalizeRate(r))); } catch (e) { /* ignore */ } }
  function readSiteRates() { try { var o = JSON.parse(window.localStorage.getItem(SITE_RATE_KEY)); return isPlainObject(o) ? o : {}; } catch (e) { return {}; } }
  function writeSiteRate(host, r) { var o = readSiteRates(); o[host] = normalizeRate(r); try { window.localStorage.setItem(SITE_RATE_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  function getSiteRate(host) { var o = readSiteRates(); return o[host] != null ? normalizeRate(o[host]) : normalizeRate(config.defaultRate); }
  function rememberRateAction(r) {
    if (config.rateMode === 'remember') writeRate(r);
    else if (config.rateMode === 'site') writeSiteRate((window.location.hostname || '').toLowerCase(), r);
  }
  function rateToApply() {
    if (config.rateMode === 'off') return null;
    if (config.rateMode === 'default') return normalizeRate(config.defaultRate);
    if (config.rateMode === 'site') return getSiteRate((window.location.hostname || '').toLowerCase());
    return readRate();
  }

  // ---- 运行时状态 ---------------------------------------------------
  var currentVideo = null;
  var currentSite = 'generic';
  var currentAdapter = null;
  var shell = null;
  var activeShortcutsInverse = {};
  var longPressActive = false;
  var lastRateBefore = 1;
  var toastEl = null;
  var toastTimer = null;
  var observer = null;
  var pollTimer = null;

  // ---- 站点识别 + 快捷键重映射 -------------------------------------
  function detectCurrentSite() {
    currentSite = detectSite((window.location.hostname || '').toLowerCase());
    currentAdapter = SITE_ADAPTERS[currentSite] || null;
  }
  function recomputeShortcuts() {
    var merged = mergeObject(config.shortcuts, currentAdapter && currentAdapter.shortcutOverrides);
    activeShortcutsInverse = {};
    for (var k in merged) {
      var combo = normalizeCombo(merged[k]);
      if (combo) activeShortcutsInverse[combo] = k;
    }
  }

  // ---- DOM 工具 ----------------------------------------------------
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function clickEl(e) {
    if (typeof e === 'string') e = qs(e);
    if (!e) return false;
    try { e.click(); } catch (err) { try { e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (e2) {} }
    return true;
  }

  // ---- 页内提示 toast ----------------------------------------------
  function toast(msg) {
    try {
      if (!msg) return;
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.setAttribute('data-xload-vpb-toast', '');
        toastEl.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:2147483647;background:rgba(17,24,39,.92);color:#fff;padding:7px 14px;border-radius:8px;font-size:13px;pointer-events:none;opacity:0;transition:opacity .25s;';
        (document.body || document.documentElement).appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.style.opacity = '1';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.style.opacity = '0'; }, 1600);
    } catch (e) { /* ignore */ }
  }

  // ---- 视频元素检测 -------------------------------------------------
  function findVideo() {
    var list = document.querySelectorAll('video');
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i].offsetWidth > 10 && list[i].videoWidth > 0) return list[i];
    }
    for (i = 0; i < list.length; i++) {
      if (list[i].offsetWidth > 10) return list[i];
    }
    return list.length ? list[0] : null;
  }

  function isLive(v) { return !!(v && v.duration === Infinity); }

  function bindVideo(v) {
    if (!v || v.__xloadVpbBound) return;
    v.__xloadVpbBound = true;
    try {
      applyDefaultRate(v);
      v.addEventListener('ratechange', function () { onVideoRateChange(v); });
      v.addEventListener('play', function () { pushStateToPanel(); });
      v.addEventListener('pause', function () { pushStateToPanel(); });
      v.addEventListener('volumechange', function () { pushStateToPanel(); });
    } catch (e) { log('video.bind.error', { message: String(e && e.message || e) }); }
  }

  function updateShell() {
    shell = null;
    if (currentAdapter && currentAdapter.shell) shell = qs(currentAdapter.shell);
    if (!shell && currentVideo) {
      try { shell = webFullscreen.getContainer(currentVideo); } catch (e) { shell = currentVideo.parentNode; }
    }
  }

  function setCurrentVideo(v) {
    if (!v || currentVideo === v) return;
    currentVideo = v;
    bindVideo(v);
    updateShell();
    log('video.switch', { src: (v.currentSrc || v.src || '').slice(0, 120), w: v.videoWidth, h: v.videoHeight });
    pushStateToPanel();
  }

  function ensureVideo() {
    if (currentVideo && currentVideo.isConnected && currentVideo.offsetWidth > 1) return currentVideo;
    var v = findVideo();
    if (v) setCurrentVideo(v);
    return currentVideo;
  }

  function applyDefaultRate(v) {
    var r = rateToApply();
    if (r == null) return;
    if (Math.abs((+v.playbackRate || 1) - r) > 0.001) v.playbackRate = r;
  }

  function onVideoRateChange(v) {
    var r = +v.playbackRate;
    if (!isFinite(r) || r <= 0) return;
    var host = (window.location.hostname || '').toLowerCase();
    if (config.rateMode === 'site') writeSiteRate(host, r);
    else if (config.rateMode === 'remember') writeRate(r); // 含 1.0，修复「1.0 不记忆」
    else if (config.rateMode === 'default') { /* 固定默认，不自动记忆 */ }
    else if (config.rateMode === 'off') { /* 不改 */ }
    pushStateToPanel();
  }

  // ---- 播放控制动作 -------------------------------------------------
  function setPlaybackRate(v, r, remember) {
    r = normalizeRate(r);
    v.playbackRate = r;
    if (remember !== false) rememberRateAction(r);
    pushStateToPanel();
  }

  function togglePlay(v) {
    if (!v) return;
    if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function (e) { log('play.error', { message: String(e && e.message || e) }); }); }
    else v.pause();
  }

  function seekBy(v, sec) {
    if (!v || isLive(v)) return;
    var t = v.currentTime + sec;
    if (t < 0) t = 0;
    if (isFinite(v.duration) && t > v.duration) t = v.duration;
    v.currentTime = t;
    toast((sec >= 0 ? '+' : '') + sec + 's → ' + formatTime(t));
  }

  function adjustVolume(v, delta) {
    if (!v) return;
    v.volume = normalizeVolume((+v.volume || 0) + delta);
    v.muted = false;
    toast('音量 ' + Math.round(v.volume * 100) + '%');
  }

  function toggleMute(v) {
    if (!v) return;
    v.muted = !v.muted;
    toast(v.muted ? '已静音' : '已取消静音');
  }

  function adjustRate(v, delta) {
    if (!v) return;
    var r = normalizeRate((+v.playbackRate || 1) + delta);
    setPlaybackRate(v, r, true);
    toast('速度 ' + r.toFixed(2) + 'x');
  }

  function stepFrame(v, delta) {
    if (!v || isLive(v)) return;
    v.pause();
    var t = v.currentTime + delta;
    if (t < 0) t = 0;
    v.currentTime = t;
  }

  function nextVideo(v) {
    if (!v || isLive(v)) return;
    if (currentAdapter && currentAdapter.next) {
      if (clickEl(currentAdapter.next)) return;
    }
    var m = window.location.pathname.match(/(\d+)([^/]*)$/);
    if (m) {
      var d = parseInt(m[1], 10) + 1;
      window.location.href = window.location.pathname.slice(0, m.index) + d + m[2] + window.location.search + window.location.hash;
    } else {
      toast('未找到下一集');
    }
  }

  function doScreenshot(v) {
    if (!v) return;
    try {
      var w = v.videoWidth, h = v.videoHeight;
      if (!w || !h) { toast('视频尚未加载，无法截图'); return; }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(v, 0, 0, w, h);
      var ext = config.screenshotFormat === 'jpg' ? 'jpg' : 'png';
      var mime = config.screenshotFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(function (blob) {
        if (!blob) { toast('截图失败'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = buildFilename(document.title, ext);
        (document.body || document.documentElement).appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        toast('已保存截图');
      }, mime, 0.92);
    } catch (e) {
      toast('截图失败（视频可能受保护）');
      log('screenshot.error', { message: String(e && e.message || e) });
    }
  }

  function togglePip(v) {
    if (!v || !config.pipEnabled) return;
    if (document.pictureInPictureElement) {
      var p = document.exitPictureInPicture();
      if (p && p.catch) p.catch(function (e) { toast('退出画中画失败'); log('pip.exit.error', { message: String(e && e.message || e) }); });
    } else if (v.requestPictureInPicture) {
      var p2 = v.requestPictureInPicture();
      if (p2 && p2.catch) p2.catch(function (e) { toast('无法进入画中画'); log('pip.enter.error', { message: String(e && e.message || e) }); });
    } else {
      toast('当前浏览器不支持画中画');
    }
    pushStateToPanel();
  }

  function toggleNativeFullscreen(v) {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      var p = document.exitFullscreen ? document.exitFullscreen() : null;
      if (p && p.catch) p.catch(function () {});
      return;
    }
    if (!v) return;
    var req = v.requestFullscreen || v.webkitRequestFullscreen || v.webkitRequestFullScreen || v.mozRequestFullScreen;
    if (req) {
      var r = req.call(v);
      if (r && r.catch) r.catch(function (e) { log('fs.error', { message: String(e && e.message || e) }); });
    } else if (currentAdapter && currentAdapter.full) {
      clickEl(currentAdapter.full);
    }
    pushStateToPanel();
  }

  // ---- 网页全屏（万能网页全屏：CSS 类强制 video 容器铺满视口）-------
  var webFullscreen = {
    active: false,
    container: null,
    styleId: 'xload-vpb-webfs',
    ensureStyle: function () {
      if (document.getElementById(this.styleId)) return;
      var style = document.createElement('style');
      style.id = this.styleId;
      style.textContent =
        '.xload-vpb-fp-body .xload-vpb-fp-zTop{position:relative !important;z-index:2147483646 !important;}' +
        '.xload-vpb-fp-wrapper,.xload-vpb-fp-body{overflow:hidden !important;}' +
        '.xload-vpb-fp-wrapper .xload-vpb-fp-inner{width:100% !important;height:100% !important;}' +
        '.xload-vpb-fp-wrapper{display:block !important;position:fixed !important;width:100% !important;height:100% !important;padding:0 !important;margin:0 !important;top:0 !important;left:0 !important;background:#000 !important;z-index:2147483646 !important;}';
      (document.head || document.documentElement).appendChild(style);
    },
    getContainer: function (v) {
      var p = v.parentNode;
      var e = v;
      var w = v.clientWidth, h = v.clientHeight;
      while (p && p !== document.body && (p.clientWidth - w < 5) && (p.clientHeight - h < 5)) {
        e = p;
        p = e.parentNode;
      }
      return e;
    },
    enter: function (v) {
      if (this.active || !v) return;
      this.ensureStyle();
      this.container = this.getContainer(v);
      if (!this.container.contains(v)) this.container = this.getContainer(v);
      document.body.classList.add('xload-vpb-fp-body');
      var e = v, guard = 0;
      while (e && e !== this.container && guard < 50) { e.classList.add('xload-vpb-fp-inner'); e = e.parentNode; guard++; }
      if (this.container) this.container.classList.add('xload-vpb-fp-wrapper');
      var anc = this.container ? this.container.parentNode : null;
      guard = 0;
      while (anc && anc !== document.body && guard < 50) { anc.classList.add('xload-vpb-fp-zTop'); anc = anc.parentNode; guard++; }
      this.active = true;
      toast('已进入网页全屏（按 ESC 退出）');
      pushStateToPanel();
    },
    exit: function () {
      if (!this.active) return;
      var all = document.querySelectorAll('.xload-vpb-fp-wrapper, .xload-vpb-fp-inner, .xload-vpb-fp-zTop');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        el.classList.remove('xload-vpb-fp-wrapper');
        el.classList.remove('xload-vpb-fp-inner');
        el.classList.remove('xload-vpb-fp-zTop');
      }
      document.body.classList.remove('xload-vpb-fp-body');
      this.active = false;
      this.container = null;
      pushStateToPanel();
    },
    toggle: function (v) { if (this.active) this.exit(); else this.enter(v); }
  };

  function toggleWebFullscreen(v) {
    if (!config.webFullscreenEnabled) return;
    if (!v) return;
    webFullscreen.toggle(v);
  }

  function exitAllFullscreen() {
    if (webFullscreen.active) webFullscreen.exit();
    else if (document.fullscreenElement) { var p = document.exitFullscreen(); if (p && p.catch) p.catch(function () {}); }
  }

  // ---- 长按加速 -----------------------------------------------------
  function longPressDown(v) {
    if (longPressActive || !v) return;
    longPressActive = true;
    lastRateBefore = +v.playbackRate || 1;
    setPlaybackRate(v, config.longPressRate, false);
    toast('加速 ' + normalizeRate(config.longPressRate) + 'x');
  }
  function longPressUp(v) {
    if (!longPressActive) return;
    longPressActive = false;
    if (v) setPlaybackRate(v, lastRateBefore, false);
    toast('恢复 ' + normalizeRate(lastRateBefore) + 'x');
  }

  // ---- 动作分发 -----------------------------------------------------
  var SEEKISH = { forward: 1, backward: 1, forwardLarge: 1, backwardLarge: 1, prevFrame: 1, nextFrame: 1, rateUp: 1, rateDown: 1, rateReset: 1 };

  function runAction(action, v, ev) {
    switch (action) {
      case 'playPause': togglePlay(v); break;
      case 'forward': seekBy(v, config.seekStep); break;
      case 'backward': seekBy(v, -config.seekStep); break;
      case 'forwardLarge': seekBy(v, config.seekStepLarge); break;
      case 'backwardLarge': seekBy(v, -config.seekStepLarge); break;
      case 'volumeUp': adjustVolume(v, config.volumeStep); break;
      case 'volumeDown': adjustVolume(v, -config.volumeStep); break;
      case 'mute': toggleMute(v); break;
      case 'rateUp': adjustRate(v, 0.1); break;
      case 'rateDown': adjustRate(v, -0.1); break;
      case 'rateReset': setPlaybackRate(v, config.defaultRate, true); toast('速度 ' + normalizeRate(config.defaultRate) + 'x'); break;
      case 'next': nextVideo(v); break;
      case 'screenshot': doScreenshot(v); break;
      case 'pip': togglePip(v); break;
      case 'fullscreen': toggleNativeFullscreen(v); break;
      case 'webFullscreen': toggleWebFullscreen(v); break;
      case 'prevFrame': stepFrame(v, -0.04); break;
      case 'nextFrame': stepFrame(v, 0.04); break;
      case 'exitFullscreen': exitAllFullscreen(); break;
      case 'longPress': break; // 由 keydown/keyup 专门处理
      default: break;
    }
  }

  function shouldIgnoreKeyTarget(t) {
    if (!t) return false;
    var tag = (t.nodeName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return true;
    if (t.isContentEditable) return true;
    return false;
  }

  function keydownHandler(ev) {
    try {
      if (!config.enabled) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (shouldIgnoreKeyTarget(ev.target)) return;
      var combo = comboFromEvent(ev);
      if (!combo) return;
      var action = activeShortcutsInverse[combo];
      if (!action) return;

      if (action === 'longPress') {
        if (ev.repeat) return;
        var lv = ensureVideo();
        if (!lv) return;
        ev.preventDefault(); ev.stopPropagation();
        longPressDown(lv);
        return;
      }

      var v = ensureVideo();
      if (!v) return;
      var keyPart = comboKeyPart(combo);
      if (NAV_KEYS[keyPart] && shell && shell.contains && shell.contains(ev.target)) return;
      ev.preventDefault();
      ev.stopPropagation();
      runAction(action, v, ev);
    } catch (e) {
      log('keydown.error', { message: String(e && e.message || e) });
    }
  }

  function keyupHandler(ev) {
    try {
      var combo = comboFromEvent(ev);
      if (!combo) return;
      if (activeShortcutsInverse[combo] === 'longPress' && longPressActive) {
        var v = ensureVideo();
        if (v) longPressUp(v);
      }
    } catch (e) { /* ignore */ }
  }

  // ---- 面板通信（共享模板 createChannel：沙箱安全三级投递）----------
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

  function buildState() {
    var v = currentVideo;
    var video = (function () {
      if (!v) return { exists: false };
      return {
        exists: true,
        paused: !!v.paused,
        rate: +v.playbackRate || 1,
        volume: +v.volume || 0,
        muted: !!v.muted,
        currentTime: v.currentTime || 0,
        duration: isFinite(v.duration) ? v.duration : null,
        videoWidth: v.videoWidth || 0,
        videoHeight: v.videoHeight || 0,
        live: isLive(v),
        src: (v.currentSrc || v.src || '').slice(0, 300)
      };
    })();
    return {
      ok: true,
      config: config,
      page: {
        host: (window.location.hostname || '').toLowerCase(),
        href: window.location.href,
        site: currentSite,
        excluded: isSiteExcluded(config, (window.location.hostname || '').toLowerCase())
      },
      video: video,
      pipActive: !!document.pictureInPictureElement,
      webFullscreenActive: webFullscreen.active,
      nativeFullscreenActive: !!(document.fullscreenElement || document.webkitFullscreenElement)
    };
  }

  function pushStateToPanel() {
    var w = channel.getPanelWin();
    if (w && !w.closed) channel.send('state', buildState());
  }

  function handleControl(op) {
    var v = ensureVideo();
    if (!v) return { ok: false, error: '页面上没有检测到视频' };
    var opName = op && op.op ? op.op : (typeof op === 'string' ? op : '');
    switch (opName) {
      case 'play': { var p = v.play(); if (p && p.catch) p.catch(function () {}); break; }
      case 'pause': v.pause(); break;
      case 'togglePlay': togglePlay(v); break;
      case 'seek': seekBy(v, Number(op.value) || 0); break;
      case 'setRate': { var r = normalizeRate(op.value == null ? 1 : Number(op.value)); setPlaybackRate(v, r, true); toast('速度 ' + r.toFixed(2) + 'x'); break; }
      case 'setVolume': v.volume = normalizeVolume(Number(op.value) || 0); v.muted = false; break;
      case 'toggleMute': toggleMute(v); break;
      case 'next': nextVideo(v); break;
      case 'screenshot': doScreenshot(v); break;
      case 'pip': togglePip(v); break;
      case 'webFullscreen': toggleWebFullscreen(v); break;
      case 'nativeFullscreen': toggleNativeFullscreen(v); break;
      case 'nextFrame': stepFrame(v, 0.04); break;
      case 'prevFrame': stepFrame(v, -0.04); break;
      default: return { ok: false, error: '未知控制: ' + opName };
    }
    return { ok: true, state: buildState() };
  }

  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });
      var resp;
      try {
        if (action === 'getState') {
          resp = buildState();
        } else if (action === 'applyConfig') {
          resp = { ok: true, config: persistConfig(data.config || {}) };
        } else if (action === 'resetConfig') {
          try { window.localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
          config = normalizeConfig(null);
          recomputeShortcuts();
          resp = { ok: true, config: config };
        } else if (action === 'applyShortcuts') {
          var merged = mergeObject(config, { shortcuts: data.shortcuts || {} });
          persistConfig(merged);
          resp = { ok: true, config: config };
        } else if (action === 'getLogs') {
          resp = { ok: true, logs: logText() };
        } else if (action === 'control') {
          resp = handleControl((data && data.control) || {});
        } else {
          resp = { ok: false, error: '未知命令: ' + action };
        }
      } catch (e) {
        log('channel.command.error', { action: action, message: String(e && e.message || e) });
        resp = { ok: false, error: String(e && e.message || e) };
      }
      channel.reply(msg, resp);
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
    try {
      var W = Math.min(960, Math.max(480, (window.screen.availWidth || 1280) - 120));
      var H = Math.min(860, Math.max(560, (window.screen.availHeight || 900) - 140));
      var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
      var T = Math.max(0, Math.round(((window.screen.availHeight || 900) - H) / 2));
      var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T + ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
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

  // ---- xload 聚合按钮组（共享模板 xloadFab）------------------------
  function xloadFab() {
    if (window.self !== window.top) {
      return { root: null, list: null, setCollapsed: function () {}, toggleCollapse: function () {}, isCollapsed: function () { return false; }, addItem: function () { return null; } };
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
      if (oldList) oldList.style.display = 'flex';
    } else {
      root = document.createElement('div');
      root.id = 'xload-fab-root';
      root.setAttribute('data-xload-fab-root', 'true');
      document.body.appendChild(root);
    }
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
        '#xload-fab-root{position:fixed;right:16px;bottom:140px;z-index:2147483000;display:flex;flex-direction:column;gap:6px;min-width:170px;max-width:240px;padding:8px;box-sizing:border-box;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.10),0 2px 6px rgba(15,23,42,.05);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none;}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"]{padding:6px;}' +
        '#xload-fab-root button{font-family:inherit;}' +
        '#xload-fab-root [data-xload-fab-toggle]{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border:0;border-radius:9px;cursor:pointer;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:13px;font-weight:700;letter-spacing:.2px;line-height:1;text-align:left;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 6px rgba(29,78,216,.25);transition:filter .15s ease,box-shadow .15s ease;}' +
        '#xload-fab-root [data-xload-fab-toggle]:hover{filter:brightness(1.07);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 3px 10px rgba(29,78,216,.35);}' +
        '#xload-fab-root [data-xload-fab-toggle]:active{filter:brightness(.95);}' +
        '#xload-fab-root .xf-brand{display:inline-flex;align-items:center;justify-content:center;flex:none;width:21px;height:21px;border-radius:6px;background:#fff;color:#1d4ed8;font-size:11px;font-weight:800;}' +
        '#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '#xload-fab-root .xf-caret{flex:none;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid rgba(255,255,255,.85);transition:transform .18s ease;}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-90deg);}' +
        '#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;gap:6px;margin-top:2px;}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] [data-xload-fab-list]{display:none;}' +
        '#xload-fab-root [data-xload-fab-item]{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;color:#334155;font-size:13px;font-weight:500;line-height:1;text-align:left;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:border-color .15s ease,background .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease;}' +
        '#xload-fab-root [data-xload-fab-item]:hover{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8;box-shadow:0 2px 8px rgba(37,99,235,.15);}' +
        '#xload-fab-root [data-xload-fab-item]:active{background:#dbeafe;}' +
        '#xload-fab-root .xf-dot{width:8px;height:8px;border-radius:50%;flex:none;background:#10b981;}' +
        '@media (prefers-color-scheme:dark){' +
        '#xload-fab-root{background:#111827;border-color:rgba(148,163,184,.20);box-shadow:0 8px 24px rgba(0,0,0,.5);}' +
        '#xload-fab-root [data-xload-fab-item]{background:#1f2937;border-color:rgba(148,163,184,.22);color:#e2e8f0;}' +
        '#xload-fab-root [data-xload-fab-item]:hover{border-color:#3b82f6;background:rgba(37,99,235,.18);color:#fff;box-shadow:0 2px 8px rgba(59,130,246,.3);}' +
        '#xload-fab-root [data-xload-fab-item]:active{background:rgba(37,99,235,.28);}' +
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
    if (!handle.querySelector('.xf-caret')) {
      handle.innerHTML = '<span class="xf-brand">x</span><span class="xf-title">xload 工具</span><span class="xf-caret"></span>';
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
      if (collapsed) root.setAttribute('data-xload-fab-collapsed', 'true');
      else root.removeAttribute('data-xload-fab-collapsed');
      storeSet(COLLAPSE_KEY, collapsed);
    }
    function toggleCollapse() {
      setCollapsed(!collapsed);
      var p = storeGet(POS_KEY, null);
      if (p && typeof p.x === 'number' && typeof p.y === 'number') applyPos(p.x, p.y);
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
        if (p && typeof p.x === 'number' && typeof p.y === 'number') applyPos(p.x, p.y);
      }
      collapsed = storeGet(COLLAPSE_KEY, false);
      if (collapsed) root.setAttribute('data-xload-fab-collapsed', 'true');
      else root.removeAttribute('data-xload-fab-collapsed');
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
        if (movedFlag) storeSet(POS_KEY, { x: root.offsetLeft, y: root.offsetTop });
        else if (downOnToggle) toggleCollapse();
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
        if (p && typeof p.x === 'number' && typeof p.y === 'number') applyPos(p.x, p.y);
        else if (root.style.left || root.style.top) applyPos(parseInt(root.style.left, 10) || 16, parseInt(root.style.top, 10) || 140);
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
          item.addEventListener('pointerup', onUp);
          item.addEventListener('pointercancel', onUp);
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
    try {
      var fab = xloadFab();
      fab.addItem(TASK_ID, '视频增强', openPanel);
      log('init.fab.ok', {});
    } catch (e) {
      log('init.fab.error', { message: String(e && e.message || e) });
    }
  }

  // ---- 动态检测 / shadow DOM ----------------------------------------
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function () {
      var v = findVideo();
      if (v && v !== currentVideo) setCurrentVideo(v);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      ensureVideo();
      updateShell();
    }, 2000);
  }
  function hookShadowDom() {
    try {
      var proto = Element.prototype;
      var orig = proto.attachShadow;
      if (!orig || orig.__xloadVpbHooked) return;
      var hook = function (opts) {
        var sr = orig.call(this, opts);
        try {
          setTimeout(function () {
            var v = sr.querySelector && sr.querySelector('video');
            if (v) setCurrentVideo(v);
          }, 600);
        } catch (e) { /* ignore */ }
        return sr;
      };
      hook.__xloadVpbHooked = true;
      proto.attachShadow = hook;
    } catch (e) {
      log('shadow.hook.error', { message: String(e && e.message || e) });
    }
  }

  function installErrorHandlers() {
    window.addEventListener('error', function (e) {
      log('global.error', { message: (e && e.message) || '', file: (e && e.filename) || '', line: (e && e.lineno) != null ? e.lineno : '', col: (e && e.colno) != null ? e.colno : '' });
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      log('global.unhandledrejection', { message: (r && r.message) ? r.message : String(r == null ? '' : r) });
      if (e && e.preventDefault) e.preventDefault();
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  // ---- 启动 ---------------------------------------------------------
  function init() {
    log('init.start', { ua: navigator.userAgent.slice(0, 90), readyState: document.readyState });
    var host = (window.location.hostname || '').toLowerCase();
    if (isSelfHost(host)) { log('init.self.skip', { host: host }); return; }
    installErrorHandlers();
    config = loadConfig();
    detectCurrentSite();
    recomputeShortcuts();
    registerChannelHandlers();
    document.addEventListener('keydown', keydownHandler, true);
    document.addEventListener('keyup', keyupHandler, true);
    hookShadowDom();
    onReady(function () {
      startObserver();
      startPolling();
      ensureVideo();
      updateShell();
      injectFab();
      log('init.ready', { host: host, site: currentSite, enabled: config.enabled, rateMode: config.rateMode });
    });
    log('init.done', {});
  }

  init();
})();