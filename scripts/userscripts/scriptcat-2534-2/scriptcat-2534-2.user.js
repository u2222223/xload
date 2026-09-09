// ==UserScript==
// @name        抖音播放器增强
// @namespace   https://github.com/u2222223/xload
// @version     1.0.0
// @description 增强抖音网页版播放器体验：画质记忆、禁止自动播放、自定义全屏与背景色
// @author      xload
// @match       *://*.douyin.com/*
// @match       *://*.iesdouyin.com/*
// @run-at      document-start
// @grant       none
// @license     MIT
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用，可独立单测）
  // ===================================================================

  var DEFAULT_SETTINGS = {
    qualityMode: 0,          // 默认画质档：0=智能
    qualityMemory: false,    // 记忆上次选择画质
    disableAutoplay: false,  // 禁止自动播放
    autoFullscreen: false,   // 自动进入全屏
    doubleClickFullscreen: false, // 双击进入全屏
    clickAreaFullscreen: false,   // 单击视频区进入全屏
    fullscreenMode: 'element',    // 'element' 真实全屏 | 'website' 网页全屏
    bgEnabled: false,        // 启用视频区背景色
    bgColor: '#000000',      // 背景色（#RRGGBB / #RGB）
    bgAlpha: 60,             // 背景不透明度 0-100
    progressDragFix: true,   // 移动端进度条拖拽修复
    touchAreaEnlarge: false  // 触控区域放大
  };

  // 照抄自页面事实：抖音播放器各清晰度档（写入 sessionStorage 的负载结构）
  var QUALITY_TAB = [
    { done: 1, gearClarity: '20', gearName: '超清 4K', gearType: -2, qualityType: 72 },
    { done: 1, gearClarity: '10', gearName: '超清 2K', gearType: -1, qualityType: 7 },
    { done: 1, gearClarity: '5', gearName: '高清 1080P', gearType: 1, qualityType: 2 },
    { done: 1, gearClarity: '4', gearName: '高清 720P', gearType: 2, qualityType: 15 },
    { done: 1, gearClarity: '3', gearName: '标清 540P', gearType: 3, qualityType: 21 },
    { done: 1, gearClarity: '2', gearName: '极速', gearType: 4, qualityType: 21 },
    { done: 1, gearClarity: '0', gearName: '智能', gearType: 0 }
  ];

  // 按画质档位号取档（返回副本，不暴露内部引用）
  function gearForMode(mode) {
    for (var i = 0; i < QUALITY_TAB.length; i++) {
      if (QUALITY_TAB[i].gearType === mode) {
        var g = QUALITY_TAB[i];
        var out = { done: g.done, gearClarity: g.gearClarity, gearName: g.gearName, gearType: g.gearType };
        if (g.qualityType != null) out.qualityType = g.qualityType;
        return out;
      }
    }
    return null;
  }

  // 生成写入 sessionStorage['MANUAL_SWITCH'] 的 JSON 串；档位未知返回 null
  function buildQualityJSON(mode) {
    var gear = gearForMode(mode);
    if (!gear) return null;
    return JSON.stringify(gear);
  }

  // 档位的人读名称（未知档回退「智能」）
  function qualityLabel(mode) {
    var gear = gearForMode(mode);
    return gear ? gear.gearName : '智能';
  }

  // 浅合并：以 base 为基础，patch 覆盖（纯函数）
  function mergeSettings(base, patch) {
    var out = {};
    var key;
    for (key in base) if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key];
    if (patch && typeof patch === 'object') {
      for (key in patch) if (Object.prototype.hasOwnProperty.call(patch, key)) out[key] = patch[key];
    }
    return out;
  }

  // 归一化配置（补默认值 + 类型/取值约束，纯函数）
  function normalizeSettings(raw) {
    var merged = mergeSettings(DEFAULT_SETTINGS, raw && typeof raw === 'object' ? raw : {});
    if (typeof merged.qualityMode !== 'number' || gearForMode(merged.qualityMode) == null) merged.qualityMode = 0;
    merged.qualityMemory = Boolean(merged.qualityMemory);
    merged.disableAutoplay = Boolean(merged.disableAutoplay);
    merged.autoFullscreen = Boolean(merged.autoFullscreen);
    merged.doubleClickFullscreen = Boolean(merged.doubleClickFullscreen);
    merged.clickAreaFullscreen = Boolean(merged.clickAreaFullscreen);
    merged.fullscreenMode = merged.fullscreenMode === 'website' ? 'website' : 'element';
    merged.bgEnabled = Boolean(merged.bgEnabled);
    if (typeof merged.bgColor !== 'string') merged.bgColor = '#000000';
    merged.bgAlpha = Math.max(0, Math.min(100, Number(merged.bgAlpha) || 0));
    merged.progressDragFix = Boolean(merged.progressDragFix);
    merged.touchAreaEnlarge = Boolean(merged.touchAreaEnlarge);
    return merged;
  }

  // 外链协议白名单：仅允许 http/https
  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  // 颜色校验 + 转换：#RGB/#RRGGBB + 0-100 不透明度 -> rgba() 串；非法返回 null
  function colorToRgba(hex, alphaPct) {
    if (typeof hex !== 'string') return null;
    var m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    var a = Math.max(0, Math.min(100, Number(alphaPct) || 0)) / 100;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + (Math.round(a * 100) / 100) + ')';
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  // ---- 页面事实（照抄核对，非实现） ---------------------------------
  var QUALITY_SESSION_KEY = 'MANUAL_SWITCH'; // 页面读取的清晰度会话键
  var SELECTORS = {
    feedVideo: '.page-recommend-container [data-e2e="feed-active-video"] video',
    fullscreenWebsite: 'xg-icon[data-e2e="xgplayer-page-full-screen"] .xgplayer-icon',
    fullscreenElement: '[data-e2e="feed-active-video"] .xgplayer-fullscreen',
    fullscreenSearch: '[data-e2e="feed-active-video"] dy-icon.douyin-player-page-full-screen .douyin-player-icon',
    clickContainers: '.newVideoPlayer, .slider-video, [data-e2e="feed-active-video"]',
    bgTargets: 'xgmask, #sliderVideo > div, .basePlayerContainer .imgBackground, .basePlayerContainer .dySwiperSlide img+div',
    progressOuter: 'xg-progress xg-outer'
  };

  var TASK_ID = 'scriptcat-2534-2';
  var LS_KEY = 'xload-dy-player-settings';
  var LS_MEMORY_KEY = 'xload-dy-player-quality-memory';
  // 面板入口（上线时站点域名以实际部署为准；协议仅 http/https）
  var PANEL_URL = 'https://u2222223.github.io/xload/scripts/userscripts/scriptcat-2534-2/panel.html';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function noop() {}

  // ---- 配置读写 -----------------------------------------------------
  function loadSettings() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(LS_KEY));
      return normalizeSettings(raw);
    } catch (e) {
      return normalizeSettings({});
    }
  }

  var settings = loadSettings();

  function persist(next) {
    settings = normalizeSettings(next);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) { /* 忽略隐私模式/跨域异常 */ }
  }

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

  // ---- 面板通信（与 panel.js 的 PanelChannel 协议一致）---------------
  function createChannel(taskId) {
    var bc = null;
    var handlers = {};
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

    return {
      send: function (type, data) { if (bc) bc.postMessage({ type: type, data: data == null ? {} : data, _from: taskId }); },
      reply: function (msg, data) {
        if (bc && msg && msg._id != null && msg._request) {
          bc.postMessage({ type: msg.type, data: data == null ? {} : data, _id: msg._id, _from: taskId });
        }
      },
      on: function (type, h) { (handlers[type] = handlers[type] || []).push(h); }
    };
  }

  var channel = createChannel(TASK_ID);

  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      var resp;
      if (action === 'querySettings') {
        resp = { ok: true, settings: settings };
      } else if (action === 'applySettings') {
        persist(mergeSettings(settings, data.settings || {}));
        applyAll();
        resp = { ok: true, settings: settings };
      } else if (action === 'resetSettings') {
        resetAll();
        resp = { ok: true, settings: settings };
      } else {
        resp = { ok: false, error: '未知命令: ' + action };
      }
      channel.reply(msg, resp);
    });
  }

  // ---- 功能实现 -----------------------------------------------------
  function pushState(info) {
    channel.send('playerState', info || {});
  }

  // 清晰度应用 + 记忆
  function injectQuality(json) {
    if (json == null) return;
    try { window.sessionStorage.setItem(QUALITY_SESSION_KEY, json); } catch (e) { /* ignore */ }
  }

  function applyQualityGear() {
    var json = settings.qualityMemory ? (loadMemory() || buildQualityJSON(settings.qualityMode)) : buildQualityJSON(settings.qualityMode);
    injectQuality(json);
    // 采用重试窗口，覆盖页面随后对会话键的初始化/覆盖
    [500, 1200, 2500].forEach(function (ms) {
      setTimeout(function () { injectQuality(json); }, ms);
    });
  }

  function loadMemory() {
    try { return window.localStorage.getItem(LS_MEMORY_KEY); } catch (e) { return null; }
  }

  function rememberQualityLoop() {
    var lastSeen = null;
    setInterval(function () {
      if (!settings.qualityMemory) return;
      var cur = null;
      try { cur = window.sessionStorage.getItem(QUALITY_SESSION_KEY); } catch (e) { return; }
      if (cur == null || cur === lastSeen) return;
      lastSeen = cur;
      try { window.localStorage.setItem(LS_MEMORY_KEY, cur); } catch (e) { /* ignore */ }
    }, 2000);
  }

  // 禁止自动播放：阻止首次自动播放，用户主动点击/按空格后放行
  function bindAutoplayBlock(video) {
    var pending = true;

    function block(evt) {
      if (!pending) return;
      if (evt) {
        if (evt.cancelable) evt.preventDefault();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
      }
      try { video.autoplay = false; video.pause(); } catch (e) { /* ignore */ }
    }
    function unlock() { pending = false; }
    function onPlay(evt) { if (pending) block(evt); }
    function onKey(evt) {
      if (evt.code === 'Space' && !evt.ctrlKey && !evt.altKey && !evt.shiftKey && !evt.metaKey) unlock();
    }

    video.addEventListener('play', onPlay, true);
    document.addEventListener('keydown', onKey, true);
    var parent = video.parentElement;
    if (parent) parent.addEventListener('click', unlock, true);

    return function cleanup() {
      video.removeEventListener('play', onPlay, true);
      document.removeEventListener('keydown', onKey, true);
      if (parent) parent.removeEventListener('click', unlock, true);
    };
  }

  // 触发全屏（元素/网页两种模式，兼容搜索页）
  function triggerFullscreen() {
    var sel = settings.fullscreenMode === 'website' ? SELECTORS.fullscreenWebsite : SELECTORS.fullscreenElement;
    var btn = $(sel);
    if (!btn && settings.fullscreenMode !== 'website') btn = $(SELECTORS.fullscreenSearch);
    if (!btn) btn = $(SELECTORS.fullscreenWebsite);
    if (btn) { try { btn.click(); return true; } catch (e) { return false; } }
    return false;
  }

  // 双击 / 单击 视频区进入全屏
  function bindClickFullscreen() {
    var conf = settings;
    if (!conf.doubleClickFullscreen && !conf.clickAreaFullscreen) return noop;
    var last = 0;
    var timer = null;

    function enter() { triggerFullscreen(); }

    function onClick(evt) {
      var t = evt.target;
      if (!(t instanceof Element)) return;
      if (t.closest('xg-controls') || t.closest('.douyin-player-controls')) return;
      var container = t.closest(SELECTORS.clickContainers);
      if (!container) return;
      var now = Date.now();
      var isDouble = (now - last) < 320;
      last = now;
      if (timer) { clearTimeout(timer); timer = null; }
      if (isDouble) {
        if (conf.doubleClickFullscreen) {
          if (evt.cancelable) evt.preventDefault();
          enter();
        }
        return;
      }
      if (conf.clickAreaFullscreen) {
        timer = setTimeout(function () {
          timer = null;
          if (!conf.doubleClickFullscreen || Date.now() - last >= 320) enter();
        }, 320);
      }
    }

    document.addEventListener('click', onClick, true);
    return function () {
      document.removeEventListener('click', onClick, true);
      if (timer) clearTimeout(timer);
    };
  }

  // 视频区背景色
  function applyBackgroundColor() {
    removeStyle('xload-dy-bg');
    if (!settings.bgEnabled) return;
    var rgba = colorToRgba(settings.bgColor, settings.bgAlpha);
    if (!rgba || settings.bgAlpha <= 0) return;
    addStyle('xload-dy-bg', SELECTORS.bgTargets + '{ background: ' + rgba + ' !important; }');
  }

  // 移动端进度条拖拽修复：按住时临时加粗导轨，松手还原
  function bindProgressDragFix() {
    if (!settings.progressDragFix) return noop;

    function thicken(evt) {
      var t = evt.target;
      if (!(t instanceof Element) || !t.closest) return;
      var progress = t.closest('xg-progress');
      if (!progress) return;
      var outer = progress.querySelector('xg-outer');
      if (outer) outer.style.height = '6px';
    }
    function restore() {
      $$(SELECTORS.progressOuter).forEach(function (o) { o.style.height = ''; });
    }

    document.addEventListener('touchstart', thicken, true);
    document.addEventListener('touchend', restore, true);
    document.addEventListener('touchcancel', restore, true);
    return function () {
      document.removeEventListener('touchstart', thicken, true);
      document.removeEventListener('touchend', restore, true);
      document.removeEventListener('touchcancel', restore, true);
    };
  }

  // 触控区域放大（CSS）
  function applyTouchAreaEnlarge() {
    removeStyle('xload-dy-touch');
    if (!settings.touchAreaEnlarge) return;
    addStyle('xload-dy-touch', 'xg-progress { height: 20px !important; } xg-progress xg-outer, xg-progress xg-inner { height: 8px !important; }');
  }

  // ---- 编排 ---------------------------------------------------------
  var activeCleanup = noop;
  var fsTriggered = false;
  var lastVideoKey = '';
  var interactiveCleanups = { click: noop, progress: noop };

  function rebindInteractive() {
    try { interactiveCleanups.click(); } catch (e) { /* ignore */ }
    try { interactiveCleanups.progress(); } catch (e) { /* ignore */ }
    interactiveCleanups.click = bindClickFullscreen();
    interactiveCleanups.progress = bindProgressDragFix();
  }

  function onVideoChanged(video) {
    if (activeCleanup) { try { activeCleanup(); } catch (e) { /* ignore */ } activeCleanup = noop; }
    fsTriggered = false;

    applyQualityGear();

    var cleanups = [noop];
    if (settings.disableAutoplay) cleanups.push(bindAutoplayBlock(video));

    if (settings.autoFullscreen) {
      setTimeout(function () { if (!fsTriggered) { fsTriggered = triggerFullscreen(); } }, 400);
    }

    activeCleanup = function () { cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); };

    pushState({ event: 'videoChanged', isPlaying: !video.paused, src: video.currentSrc || video.src || '' });
  }

  function tick() {
    var video = $(SELECTORS.feedVideo);
    if (!video) return;
    var key = video.currentSrc || video.src || '';
    if (!key) return;
    if (key && key === lastVideoKey) return;
    lastVideoKey = key;
    onVideoChanged(video);
  }

  function applyAll() {
    // 静态项
    applyBackgroundColor();
    applyTouchAreaEnlarge();
    // 常驻监听（可安全重绑）
    rebindInteractive();
    // 每个视频项（重置后由 tick 检测触发）
    lastVideoKey = '';
    tick();
  }

  function resetAll() {
    persist(DEFAULT_SETTINGS);
    try { window.localStorage.removeItem(LS_MEMORY_KEY); } catch (e) { /* ignore */ }
    applyAll();
  }

  // ---- 面板入口（悬浮按钮）-------------------------------------------
  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) return false;
    try { window.open(PANEL_URL, '_blank', 'noopener'); return true; } catch (e) { return false; }
  }

  function injectFab() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '播放器增强';
    btn.setAttribute('data-xload-fab', TASK_ID);
    btn.style.cssText = 'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
      'padding:10px 14px;border:0;border-radius:20px;background:#2563eb;color:#fff;' +
      'font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.92;';
    btn.addEventListener('click', openPanel);
    document.body.appendChild(btn);
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
    // 全量应用一次，并持续监测活动视频
    applyAll();
    rememberQualityLoop();
    registerChannelHandlers();

    // 播放/加载事件触发即时重检
    document.addEventListener('play', tick, true);
    document.addEventListener('canplay', tick, true);
    setInterval(tick, 800);

    whenReady(function () {
      try { injectFab(); } catch (e) { /* ignore */ }
    });
  }

  whenReady(init);
})();