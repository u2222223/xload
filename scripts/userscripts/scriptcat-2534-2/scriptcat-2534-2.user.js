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
  var LOG_KEY = 'xload-dy-player-logs';
  // 面板入口（上线时站点域名以实际部署为准；协议仅 http/https）
  var PANEL_URL = 'https://xload.net/scripts/userscripts/scriptcat-2534-2/panel.html';

  // ---- 日志系统 -----------------------------------------------------
  // 内存环形缓冲 + localStorage 持久化 + console；面板内可查看/复制，便于排错。
  var LOG_RING = [];
  function log(tag, data) {
    var entry = { t: new Date().toISOString(), tag: tag, data: data == null ? null : data };
    LOG_RING.push(entry);
    if (LOG_RING.length > 300) LOG_RING.shift();
    try { console.log('[xload:scriptcat-2534-2]', tag, data == null ? '' : data); } catch (e) { /* ignore */ }
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
  // 同源走 BroadcastChannel；跨源（面板在 xload 站点、脚本在抖音）走
  // window.open(面板) → 面板用 opener.postMessage 发来 → 脚本监听 message 并用 event.source 回包。
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

    // 跨源：接收面板（window.open 打开，opener=本页面）postMessage 来的消息，记住来源供回包
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
      log('channel.command', { action: action, fromMessage: !!msg });
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
    log('video.changed', { src: video.currentSrc || video.src || '', paused: video.paused });

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

  // ---- 面板入口（页面内居中模态浮层，不开新窗口 / 不用 iframe）----
  function openPanel() {
    if (document.getElementById('xload-dy-modal')) return true; // 已打开
    restoreLogs();
    log('panel.open', { url: location.href });

    var overlay = document.createElement('div');
    overlay.id = 'xload-dy-modal';
    overlay.setAttribute('data-xload-modal', TASK_ID);
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,17,23,.55);' +
      'display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;color:#111827;width:min(640px,92vw);max-height:86vh;overflow:auto;' +
      'border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '抖音播放器增强 - 设置面板');

    var header = document.createElement('div');
    header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #eef0f3;display:flex;align-items:center;justify-content:space-between;';
    var title = document.createElement('div');
    var h1 = document.createElement('h2');
    h1.textContent = '抖音播放器增强';
    h1.style.cssText = 'margin:0;font-size:17px;color:#111827;';
    var sub = document.createElement('p');
    sub.textContent = '画质记忆、禁止自动播放、自定义全屏与背景色';
    sub.style.cssText = 'margin:3px 0 0;font-size:12px;color:#6b7280;';
    title.appendChild(h1);
    title.appendChild(sub);
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.style.cssText = 'border:0;background:none;font-size:24px;line-height:1;cursor:pointer;color:#6b7280;padding:4px 8px;';
    header.appendChild(title);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.style.cssText = 'padding:18px 20px;flex:1;overflow:auto;';

    var status = document.createElement('div');
    status.id = 'xload-dy-modal-status';
    status.style.cssText = 'padding:9px 12px;border-radius:8px;background:#eef2ff;color:#3730a3;font-size:13px;margin-bottom:16px;';
    status.textContent = '设置将直接应用到当前页面';
    body.appendChild(status);

    function group(titleText) {
      var g = document.createElement('section');
      g.style.cssText = 'margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #eef0f3;';
      var h = document.createElement('h3');
      h.textContent = titleText;
      h.style.cssText = 'margin:0 0 10px;font-size:15px;color:#111827;';
      g.appendChild(h);
      body.appendChild(g);
      return g;
    }
    function row(parent) {
      var r = document.createElement('div');
      r.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;';
      parent.appendChild(r);
      return r;
    }
    function field(parent, labelText, control, check) {
      var f = document.createElement('div');
      f.style.cssText = check
        ? 'display:flex;align-items:center;gap:7px;min-width:0;'
        : 'display:flex;flex-direction:column;gap:5px;min-width:150px;';
      if (!check) {
        var lb = document.createElement('label');
        lb.textContent = labelText;
        lb.style.cssText = 'font-size:13px;color:#4b5563;';
        f.appendChild(lb);
        f.appendChild(control);
      } else {
        var chk = document.createElement('label');
        chk.style.cssText = 'font-size:14px;color:#1f2328;cursor:pointer;display:inline-flex;align-items:center;gap:6px;';
        chk.appendChild(control);
        chk.appendChild(document.createTextNode(labelText));
        f.appendChild(chk);
      }
      parent.appendChild(f);
      return f;
    }

    var gQuality = group('画质设置');
    var rQuality = row(gQuality);
    var sel = document.createElement('select');
    sel.style.cssText = 'padding:6px 8px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;';
    [
      { v: 0, label: '智能（自动）' },
      { v: -2, label: '超清 4K' },
      { v: -1, label: '超清 2K' },
      { v: 1, label: '高清 1080P' },
      { v: 2, label: '高清 720P' },
      { v: 3, label: '标清 540P' },
      { v: 4, label: '极速' }
    ].forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = String(o.v);
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    field(rQuality, '默认画质', sel, false);
    var chkMemory = document.createElement('input');
    chkMemory.type = 'checkbox';
    field(rQuality, '记忆上次选择的画质', chkMemory, true);
    var hint = document.createElement('p');
    hint.textContent = '画质档位取决于抖音平台实际提供的分辨率；本脚本不解锁平台未开放的画质。';
    hint.style.cssText = 'margin:8px 0 0;font-size:12px;color:#9ca3af;';
    gQuality.appendChild(hint);

    var gPlay = group('播放控制');
    var rPlay = row(gPlay);
    function mkCheck(labelText) {
      var c = document.createElement('input');
      c.type = 'checkbox';
      field(rPlay, labelText, c, true);
      return c;
    }
    var chkNoAutoplay = mkCheck('禁止自动播放');
    var chkAutoFs = mkCheck('自动进入全屏');
    var chkDbl = mkCheck('双击进入全屏');
    var chkClickArea = mkCheck('单击视频区进入全屏');
    var rMode = document.createElement('div');
    rMode.style.cssText = 'display:flex;gap:16px;margin-top:10px;';
    ['element', 'website'].forEach(function (v) {
      var lb = document.createElement('label');
      lb.style.cssText = 'font-size:14px;color:#1f2328;cursor:pointer;display:inline-flex;align-items:center;gap:6px;';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'xload-dy-fsmode';
      radio.value = v;
      lb.appendChild(radio);
      lb.appendChild(document.createTextNode(v === 'element' ? '元素全屏（真实全屏）' : '网页全屏'));
      rMode.appendChild(lb);
    });
    gPlay.appendChild(rMode);

    var gUi = group('界面定制');
    var chkBg = document.createElement('input');
    chkBg.type = 'checkbox';
    field(gUi, '自定义视频区背景色', chkBg, true);
    var rBg = row(gUi);
    var colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#000000';
    colorInput.style.cssText = 'padding:2px;border:1px solid #d1d5db;border-radius:8px;';
    field(rBg, '颜色', colorInput, false);
    var alphaField = document.createElement('div');
    alphaField.style.cssText = 'display:flex;flex-direction:column;gap:5px;flex:1;min-width:200px;';
    var alphaLabel = document.createElement('label');
    alphaLabel.style.cssText = 'font-size:13px;color:#4b5563;';
    var alphaSpan = document.createElement('span');
    alphaSpan.id = 'xload-dy-alpha-val';
    alphaSpan.textContent = '60';
    alphaLabel.appendChild(document.createTextNode('不透明度 '));
    alphaLabel.appendChild(alphaSpan);
    alphaLabel.appendChild(document.createTextNode('%'));
    var alphaInput = document.createElement('input');
    alphaInput.type = 'range';
    alphaInput.min = '0';
    alphaInput.max = '100';
    alphaInput.step = '1';
    alphaInput.value = '60';
    alphaInput.style.cssText = 'width:100%;';
    alphaField.appendChild(alphaLabel);
    alphaField.appendChild(alphaInput);
    rBg.appendChild(alphaField);

    var gMob = group('移动端优化');
    var rMob = row(gMob);
    function mkCheck2(labelText) {
      var c = document.createElement('input');
      c.type = 'checkbox';
      field(rMob, labelText, c, true);
      return c;
    }
    var chkProgress = mkCheck2('进度条拖拽修复');
    var chkTouch = mkCheck2('触控区域放大');

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:6px;';
    function mkBtn(text, kind) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.cssText = 'border:0;border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer;' +
        (kind === 'primary' ? 'background:#2563eb;color:#fff;' : kind === 'danger' ? 'background:#fee2e2;color:#b91c1c;' : 'background:#eef0f3;color:#1f2328;');
      return b;
    }
    var btnLog = mkBtn('查看日志', 'default');
    var btnReset = mkBtn('恢复默认设置', 'danger');
    var btnApply = mkBtn('应用到原页面', 'primary');
    actions.appendChild(btnLog);
    actions.appendChild(btnReset);
    actions.appendChild(btnApply);
    body.appendChild(actions);

    var footer = document.createElement('div');
    footer.style.cssText = 'padding:10px 20px;border-top:1px solid #eef0f3;display:flex;justify-content:space-between;align-items:center;';
    var footerLink = document.createElement('a');
    footerLink.href = PANEL_URL;
    footerLink.target = '_blank';
    footerLink.textContent = '打开独立面板页 →';
    footerLink.style.cssText = 'font-size:12px;color:#2563eb;text-decoration:none;';
    footer.appendChild(footerLink);
    var logCount = document.createElement('span');
    logCount.id = 'xload-dy-log-count';
    logCount.textContent = '日志 ' + LOG_RING.length + ' 条';
    logCount.style.cssText = 'font-size:12px;color:#9ca3af;';
    footer.appendChild(logCount);

    box.appendChild(header);
    box.appendChild(body);
    box.appendChild(footer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function read() {
      var fsMode = 'element';
      var radios = document.getElementsByName('xload-dy-fsmode');
      for (var i = 0; i < radios.length; i++) if (radios[i].checked) fsMode = radios[i].value;
      return {
        qualityMode: Number(sel.value),
        qualityMemory: chkMemory.checked,
        disableAutoplay: chkNoAutoplay.checked,
        autoFullscreen: chkAutoFs.checked,
        doubleClickFullscreen: chkDbl.checked,
        clickAreaFullscreen: chkClickArea.checked,
        fullscreenMode: fsMode,
        bgEnabled: chkBg.checked,
        bgColor: colorInput.value,
        bgAlpha: Number(alphaInput.value),
        progressDragFix: chkProgress.checked,
        touchAreaEnlarge: chkTouch.checked
      };
    }
    function render(s) {
      s = mergeSettings(DEFAULT_SETTINGS, s || {});
      sel.value = String(s.qualityMode);
      chkMemory.checked = Boolean(s.qualityMemory);
      chkNoAutoplay.checked = Boolean(s.disableAutoplay);
      chkAutoFs.checked = Boolean(s.autoFullscreen);
      chkDbl.checked = Boolean(s.doubleClickFullscreen);
      chkClickArea.checked = Boolean(s.clickAreaFullscreen);
      var radios = document.getElementsByName('xload-dy-fsmode');
      for (var i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value === s.fullscreenMode);
      chkBg.checked = Boolean(s.bgEnabled);
      colorInput.value = (typeof s.bgColor === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s.bgColor)) ? s.bgColor : '#000000';
      var alpha = Math.max(0, Math.min(100, Number(s.bgAlpha) || 0));
      alphaInput.value = String(alpha);
      alphaSpan.textContent = String(alpha);
      chkProgress.checked = Boolean(s.progressDragFix);
      chkTouch.checked = Boolean(s.touchAreaEnlarge);
    }
    function applyLocal() {
      var s = read();
      persist(s);
      applyAll();
      log('panel.apply', s);
      status.textContent = '已应用到当前页面（' + new Date().toLocaleTimeString() + '）';
      status.style.background = '#ecfdf5';
      status.style.color = '#047857';
    }

    closeBtn.addEventListener('click', function () {
      log('panel.close', {});
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        log('panel.close', { by: 'mask' });
        overlay.parentNode.removeChild(overlay);
      }
    });
    btnApply.addEventListener('click', applyLocal);
    btnReset.addEventListener('click', function () {
      persist(DEFAULT_SETTINGS);
      try { window.localStorage.removeItem(LS_MEMORY_KEY); } catch (e) { /* ignore */ }
      render(DEFAULT_SETTINGS);
      applyAll();
      log('panel.reset', {});
      status.textContent = '已恢复默认设置';
      status.style.background = '#fef3c7';
      status.style.color = '#92400e';
    });
    btnLog.addEventListener('click', function () {
      var s = status.textContent;
      status.textContent = logText() || '（暂无日志）';
      status.style.background = '#f9fafb';
      status.style.color = '#1f2328';
      status.style.whiteSpace = 'pre-wrap';
      status.style.wordBreak = 'break-all';
      status.style.maxHeight = '40vh';
      status.style.overflow = 'auto';
      status.addEventListener('click', function copyLog() {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(status.textContent).then(function () {
              PUI && PUI.toast ? PUI.toast('日志已复制', 'success') : alert('日志已复制');
            });
          } else {
            var ta = document.createElement('textarea');
            ta.value = status.textContent;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            alert('日志已复制');
          }
        } catch (e) { alert('复制失败：' + e.message); }
        status.removeEventListener('click', copyLog);
      });
      status.title = '点击复制日志';
    });

    render(settings);
    log('panel.rendered', { settings: settings });
    return true;
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
    log('init.start', { ua: navigator.userAgent.slice(0, 80), readyState: document.readyState });
    // 全量应用一次，并持续监测活动视频
    try { applyAll(); } catch (e) { log('init.applyAll.error', { message: String(e && e.message || e) }); }
    rememberQualityLoop();
    registerChannelHandlers();

    // 播放/加载事件触发即时重检
    document.addEventListener('play', tick, true);
    document.addEventListener('canplay', tick, true);
    setInterval(tick, 800);

    whenReady(function () {
      try { injectFab(); log('init.fab.ok', {}); } catch (e) { log('init.fab.error', { message: String(e && e.message || e) }); }
    });
    log('init.done', { settings: settings });
  }

  whenReady(init);
})();