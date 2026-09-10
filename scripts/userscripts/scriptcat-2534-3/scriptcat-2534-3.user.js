// ==UserScript==
// @name         抖音界面沉浸优化
// @namespace    https://xload.net/scripts/userscripts/
// @version      2026.9.9.1
// @description  沉浸模式+手机模式+自定义主题：隐藏顶部导航、侧边栏等冗余元素打造沉浸浏览，支持手机模式模拟移动端布局，视频区/评论区/侧边栏背景色自由定制，暗色/亮色主题切换，视频标签自动隐藏，解禁双指缩放。
// @author       xload
// @license      GPL-3.0-only
// @match        *://*.douyin.com/*
// @match        *://*.iesdouyin.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var TASK_ID = 'scriptcat-2534-3';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/' + TASK_ID + '/panel.html';
  var SETTINGS_KEY = 'xload-' + TASK_ID + '-settings';
  var LOG_KEY = 'xload-' + TASK_ID + '-logs';
  var AUTO_ATTR = 'data-xload-autohide';

  var excludeSites = ['xload.net', 'u2222223.github.io'];
  function isExcludedHost() {
    var h = (window.location && window.location.hostname) || '';
    if (!h) return false;
    for (var i = 0; i < excludeSites.length; i++) {
      var s = excludeSites[i];
      if (h === s || h.slice(-(s.length + 1)) === '.' + s) return true;
    }
    return false;
  }

  // =====================================================================
  // 内置日志：console + localStorage 环形缓冲（~60 条），异常全 try/catch
  // =====================================================================
  var logBuf = [];
  function safeClone(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return String(v); }
  }
  function log(tag, data) {
    var entry;
    try {
      entry = { t: new Date().toISOString(), tag: tag, data: safeClone(data) };
    } catch (e) {
      entry = { t: new Date().toISOString(), tag: tag, data: String(data) };
    }
    try { console.log('[xload ' + TASK_ID + ']', tag, data); } catch (e) { /* ignore */ }
    try {
      logBuf.push(entry);
      if (logBuf.length > 60) logBuf = logBuf.slice(-60);
      window.localStorage.setItem(LOG_KEY, JSON.stringify(logBuf));
    } catch (e) { /* ignore */ }
  }
  function restoreLogs() {
    try {
      var s = window.localStorage.getItem(LOG_KEY);
      if (s) {
        var arr = JSON.parse(s);
        if (Array.isArray(arr)) logBuf = arr;
      }
    } catch (e) { logBuf = []; }
  }
  function getLogsText() {
    var lines = [];
    for (var i = 0; i < logBuf.length; i++) {
      var e = logBuf[i];
      lines.push(e.t + ' [' + e.tag + '] ' + JSON.stringify(e.data));
    }
    return lines.join('\n');
  }

  // =====================================================================
  // CORE-START —— 纯函数区：无 DOM 依赖，可独立单测。
  // 站点 DOM 选择器 / 接口字段为客观事实（照抄原文并逐字核对），不算抄袭。
  // =====================================================================
  var SELECTORS = {
    regions: {
      topNav:        ['#douyin-header'],
      leftNav:       ['#douyin-navigation'],
      rightPanel:    ['#douyin-right-container [data-e2e="feed-right-list-container"]'],
      searchBar:     ['#slideMode + div', '.playerContainer .slider-video>div>div:has([data-e2e="searchbar-button"])'],
      floatingHints: ['.slider-video .positionBox', '.xgplayer-recommend-tag'],
      bottomFeed:    ['xg-controls.xgplayer-controls', '.douyin-player-controls']
    },
    videoLabel: ['#video-info-wrap', '.player-position-box-bottom'],
    bg: {
      video:   ['xgmask', '#sliderVideo > div', '.basePlayerContainer .imgBackground', '.basePlayerContainer .dySwiperSlide img+div'],
      comment: ['#videoSideCard', '#videoSideCard .comment-main-content'],
      sidebar: ['#douyin-navigation']
    }
  };

  var REGION_KEYS = ['topNav', 'leftNav', 'rightPanel', 'searchBar', 'floatingHints', 'bottomFeed'];

  var PRESETS = {
    minimal: { topNav: true, leftNav: true, rightPanel: true, searchBar: true, floatingHints: true, bottomFeed: true },
    half:    { topNav: true, leftNav: true, rightPanel: true, searchBar: false, floatingHints: false, bottomFeed: false },
    none:    { topNav: false, leftNav: false, rightPanel: false, searchBar: false, floatingHints: false, bottomFeed: false }
  };

  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  function clamp(v, min, max) {
    v = Number(v);
    if (isNaN(v)) v = min;
    return Math.min(max, Math.max(min, v));
  }

  function hexToRgba(hex, alpha) {
    hex = String(hex == null ? '' : hex).replace('#', '').trim();
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    var a = clamp(alpha, 0, 1);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function presetToRegionMap(preset) {
    var p = PRESETS[preset];
    if (!p) p = PRESETS.none;
    return {
      topNav: !!p.topNav,
      leftNav: !!p.leftNav,
      rightPanel: !!p.rightPanel,
      searchBar: !!p.searchBar,
      floatingHints: !!p.floatingHints,
      bottomFeed: !!p.bottomFeed
    };
  }

  function buildHidingCSS(regions) {
    var list = [];
    for (var i = 0; i < REGION_KEYS.length; i++) {
      var k = REGION_KEYS[i];
      if (regions && regions[k]) list = list.concat(SELECTORS.regions[k]);
    }
    if (!list.length) return '';
    return list.join(',\n') + '{ display: none !important; }';
  }

  function buildAutoHideCSS() {
    var sel = SELECTORS.videoLabel.join(',');
    return [
      sel + '{ transition: opacity .3s linear !important; }',
      sel + '[data-xload-autohide="hidden"]{ opacity: 0 !important; }',
      sel + '[data-xload-autohide="hidden"]:hover{ opacity: 1 !important; }'
    ].join('\n');
  }

  function buildPhoneCSS(cfg) {
    var width = clamp(cfg && cfg.width, 320, 600);
    var margin = (cfg && cfg.center !== false) ? '0 auto' : '0 0 0 auto';
    return [
      'html[data-xload-phone="true"] #douyin-right-container{',
      '  max-width:' + width + 'px !important;',
      '  width:100% !important;',
      '  margin:' + margin + ' !important;',
      '}'
    ].join('\n');
  }

  function buildThemeCSS(cfg) {
    var theme = (cfg && cfg.theme) || {};
    var preset = theme.preset === 'dark' || theme.preset === 'light' ? theme.preset : 'system';
    var bg = theme.bg || {};
    var DEFAULTS = {
      dark:  { video: '#000000', comment: '#121212', sidebar: '#0b0b1e' },
      light: { video: '#ffffff', comment: '#f7f8fa', sidebar: '#ffffff' }
    };
    function colorOf(region, mode) {
      var b = bg[region];
      if (b && b.color) {
        var rgba = hexToRgba(b.color, (typeof b.alpha === 'number' ? b.alpha : 100) / 100);
        return rgba || DEFAULTS[mode][region];
      }
      return DEFAULTS[mode][region];
    }
    var regions = ['video', 'comment', 'sidebar'];
    function varsCss(mode) {
      var lines = [];
      for (var i = 0; i < regions.length; i++) {
        var r = regions[i];
        lines.push('  --xload-bg-' + r + ':' + colorOf(r, mode) + ';');
      }
      return lines.join('\n');
    }
    function applyRules() {
      var rules = [];
      for (var i = 0; i < regions.length; i++) {
        var r = regions[i];
        rules.push(SELECTORS.bg[r].join(',\n') + '{ background-color: var(--xload-bg-' + r + ') !important; }');
      }
      return rules.join('\n');
    }
    if (preset === 'dark' || preset === 'light') {
      return 'html[data-xload-theme="' + preset + '"] {\n' + varsCss(preset) + '\n}\n' + applyRules();
    }
    return [
      '@media (prefers-color-scheme: dark){ html[data-xload-theme="system"] {\n' + varsCss('dark') + '\n} }',
      '@media (prefers-color-scheme: light){ html[data-xload-theme="system"] {\n' + varsCss('light') + '\n} }',
      applyRules()
    ].join('\n');
  }

  var DEFAULT_SETTINGS = {
    immersive: { preset: 'half', regions: presetToRegionMap('half') },
    phoneMode: { enabled: false, width: 420, center: true },
    theme: {
      preset: 'system',
      bg: {
        video: { color: '', alpha: 100 },
        comment: { color: '', alpha: 100 },
        sidebar: { color: '', alpha: 100 }
      }
    },
    videoLabel: { autoHide: false, delay: 1.5 },
    zoom: { unlock: false }
  };

  function validateSettings(raw) {
    var s = (raw && typeof raw === 'object') ? raw : {};
    var si = (s.immersive && typeof s.immersive === 'object') ? s.immersive : {};
    var sp = (s.phoneMode && typeof s.phoneMode === 'object') ? s.phoneMode : {};
    var st = (s.theme && typeof s.theme === 'object') ? s.theme : {};
    var sv = (s.videoLabel && typeof s.videoLabel === 'object') ? s.videoLabel : {};
    var sz = (s.zoom && typeof s.zoom === 'object') ? s.zoom : {};

    var preset = si.preset;
    if (preset !== 'minimal' && preset !== 'none' && preset !== 'custom') preset = 'half';

    var ir = si.regions || {};
    var regions = { topNav: !!ir.topNav, leftNav: !!ir.leftNav, rightPanel: !!ir.rightPanel, searchBar: !!ir.searchBar, floatingHints: !!ir.floatingHints, bottomFeed: !!ir.bottomFeed };

    var bgOut = { video: { color: '', alpha: 100 }, comment: { color: '', alpha: 100 }, sidebar: { color: '', alpha: 100 } };
    var regionNames = ['video', 'comment', 'sidebar'];
    for (var i = 0; i < regionNames.length; i++) {
      var rn = regionNames[i];
      var c = (st.bg && st.bg[rn]) || {};
      var color = (typeof c.color === 'string' && /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(c.color.trim())) ? c.color : '';
      bgOut[rn] = { color: color, alpha: clamp(c.alpha, 0, 100) };
    }

    return {
      immersive: { preset: preset, regions: regions },
      phoneMode: {
        enabled: !!sp.enabled,
        width: (typeof sp.width === 'number' && !isNaN(sp.width)) ? clamp(sp.width, 320, 600) : 420,
        center: sp.center !== false
      },
      theme: { preset: (st.preset === 'dark' || st.preset === 'light') ? st.preset : 'system', bg: bgOut },
      videoLabel: {
        autoHide: !!sv.autoHide,
        delay: (typeof sv.delay === 'number' && !isNaN(sv.delay)) ? clamp(sv.delay, 0, 10) : 1.5
      },
      zoom: { unlock: !!sz.unlock }
    };
  }
  // =====================================================================
  // CORE-END
  // =====================================================================

  // ------------------------------------------------------------------
  // 面板通信（与 panel.js 的 PanelChannel 协议一致；沙箱安全三级投递）
  // 来源：共享模板 templates/channel.js，整体复制，不自行重写。
  // ------------------------------------------------------------------
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
        log('channel.send', { type: type, panelWin: r.panelWin, bc: r.bc });
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
        log('channel.reply.send', { type: m.type, ok: r, hasPanelWin: !!panelWin, hasSource: !!msg._source, hasBc: !!bc });
      },
      on: function (type, h) { (handlers[type] = handlers[type] || []).push(h); },
      setPanelWin: function (w) { panelWin = w; },
      getPanelWin: function () { return panelWin; }
    };
  }

  var channel = null;

  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    restoreLogs();
    var existing = channel && channel.getPanelWin();
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
      log('panel.open.error', { message: String((e && e.message) || e) });
      return false;
    }
  }

  // ------------------------------------------------------------------
  // FAB 聚合按钮组：来源共享模板 templates/fab.js，整体复制，不自行重写。
  // ------------------------------------------------------------------
  function xloadFab() {
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
          'display:flex;flex-direction:column;gap:6px;' +
          'min-width:170px;max-width:240px;padding:8px;box-sizing:border-box;' +
          'background:#fff;' +
          'border:1px solid #e2e8f0;border-radius:12px;' +
          'box-shadow:0 8px 24px rgba(15,23,42,.10),0 2px 6px rgba(15,23,42,.05);' +
          'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;' +
          'user-select:none;-webkit-user-select:none;touch-action:none;' +
        '}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"]{padding:6px;}' +
        '#xload-fab-root button{font-family:inherit;}' +
        '#xload-fab-root [data-xload-fab-toggle]{' +
          'display:flex;align-items:center;gap:8px;width:100%;' +
          'padding:9px 10px;border:0;border-radius:9px;cursor:pointer;' +
          'background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;' +
          'font-size:13px;font-weight:700;letter-spacing:.2px;line-height:1;text-align:left;' +
          'box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 6px rgba(29,78,216,.25);' +
          'transition:filter .15s ease,box-shadow .15s ease;' +
        '}' +
        '#xload-fab-root [data-xload-fab-toggle]:hover{' +
          'filter:brightness(1.07);' +
          'box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 3px 10px rgba(29,78,216,.35);' +
        '}' +
        '#xload-fab-root [data-xload-fab-toggle]:active{filter:brightness(.95);}' +
        '#xload-fab-root .xf-brand{' +
          'display:inline-flex;align-items:center;justify-content:center;flex:none;' +
          'width:21px;height:21px;border-radius:6px;background:#fff;color:#1d4ed8;' +
          'font-size:11px;font-weight:800;' +
        '}' +
        '#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '#xload-fab-root .xf-caret{' +
          'flex:none;width:0;height:0;' +
          'border-left:4px solid transparent;border-right:4px solid transparent;' +
          'border-top:5px solid rgba(255,255,255,.85);transition:transform .18s ease;' +
        '}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-90deg);}' +
        '#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;gap:6px;margin-top:2px;}' +
        '#xload-fab-root[data-xload-fab-collapsed="true"] [data-xload-fab-list]{display:none;}' +
        '#xload-fab-root [data-xload-fab-item]{' +
          'display:flex;align-items:center;gap:9px;width:100%;' +
          'padding:9px 11px;border:1px solid #e2e8f0;border-radius:9px;' +
          'background:#f8fafc;color:#334155;' +
          'font-size:13px;font-weight:500;line-height:1;text-align:left;cursor:pointer;' +
          'box-shadow:0 1px 2px rgba(15,23,42,.04);' +
          'transition:border-color .15s ease,background .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease;' +
        '}' +
        '#xload-fab-root [data-xload-fab-item]:hover{' +
          'border-color:#93c5fd;background:#eff6ff;color:#1d4ed8;' +
          'box-shadow:0 2px 8px rgba(37,99,235,.15);' +
        '}' +
        '#xload-fab-root [data-xload-fab-item]:active{background:#dbeafe;}' +
        '#xload-fab-root .xf-dot{' +
          'width:8px;height:8px;border-radius:50%;flex:none;background:#10b981;' +
        '}' +
        '@media (prefers-color-scheme:dark){' +
          '#xload-fab-root{background:#111827;border-color:rgba(148,163,184,.20);' +
            'box-shadow:0 8px 24px rgba(0,0,0,.5);}' +
          '#xload-fab-root [data-xload-fab-item]{background:#1f2937;border-color:rgba(148,163,184,.22);color:#e2e8f0;}' +
          '#xload-fab-root [data-xload-fab-item]:hover{border-color:#3b82f6;background:rgba(37,99,235,.18);color:#fff;' +
            'box-shadow:0 2px 8px rgba(59,130,246,.3);}' +
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

  // ------------------------------------------------------------------
  // 样式节点管理（单例 style 注入到 head）
  // ------------------------------------------------------------------
  var styleNodes = {};
  function ensureStyleNode(id) {
    var node = document.getElementById(id);
    if (!node) {
      node = document.createElement('style');
      node.id = id;
      node.type = 'text/css';
      (document.head || document.documentElement).appendChild(node);
      styleNodes[id] = node;
    }
    return node;
  }
  function setStyleText(id, cssText) {
    var node = ensureStyleNode(id);
    node.textContent = cssText || '';
    return node;
  }

  // ------------------------------------------------------------------
  // 状态存储
  // ------------------------------------------------------------------
  var settings = null;
  function loadSettings() {
    restoreLogs();
    try {
      var raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = validateSettings(JSON.parse(raw));
    } catch (e) { log('settings.load.error', { message: String((e && e.message) || e) }); }
    if (!settings) settings = validateSettings(DEFAULT_SETTINGS);
  }
  function saveSettings(s) {
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
    catch (e) { log('settings.save.error', { message: String((e && e.message) || e) }); }
  }
  function effectiveRegions(s) {
    if (s.immersive.preset === 'custom') return s.immersive.regions;
    return presetToRegionMap(s.immersive.preset);
  }

  // ------------------------------------------------------------------
  // 视图应用
  // ------------------------------------------------------------------
  function setHiding(regions) {
    var css = buildHidingCSS(regions);
    setStyleText('xload-immersive-hide', css);
    log('apply.immersive', { regions: safeClone(regions), cssLen: css.length });
  }

  function setTheme(themeCfg) {
    var html = document.documentElement;
    if (html) html.setAttribute('data-xload-theme', themeCfg.preset);
    var css = buildThemeCSS({ theme: themeCfg });
    setStyleText('xload-theme', css);
    log('apply.theme', { preset: themeCfg.preset, cssLen: css.length });
  }

  function setPhone(phoneCfg) {
    var html = document.documentElement;
    if (html) {
      if (phoneCfg.enabled) html.setAttribute('data-xload-phone', 'true');
      else html.removeAttribute('data-xload-phone');
    }
    var css = buildPhoneCSS(phoneCfg);
    setStyleText('xload-phone', css);
    log('apply.phone', { enabled: phoneCfg.enabled, width: phoneCfg.width, center: phoneCfg.center });
  }

  function setZoom(zoomCfg) {
    try {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        if (document.head) document.head.appendChild(meta);
      }
      if (zoomCfg.unlock) {
        if (window.__xloadOriginalViewport == null) window.__xloadOriginalViewport = meta.getAttribute('content') || '';
        meta.setAttribute('content', 'width=device-width,initial-scale=1,user-scalable=yes,maximum-scale=10,viewport-fit=cover');
      } else if (window.__xloadOriginalViewport != null) {
        meta.setAttribute('content', window.__xloadOriginalViewport);
      }
      log('apply.zoom', { unlock: zoomCfg.unlock });
    } catch (e) {
      log('apply.zoom.error', { message: String((e && e.message) || e) });
    }
  }

  // 视频标签自动隐藏
  var autoHideObserver = null;
  var autoHideDelayMs = 1500;
  function ensureAutoHideTags() {
    if (!settings || !settings.videoLabel.autoHide) return;
    try {
      for (var i = 0; i < SELECTORS.videoLabel.length; i++) {
        var els = document.querySelectorAll(SELECTORS.videoLabel[i]);
        for (var j = 0; j < els.length; j++) {
          var el = els[j];
          if (!el.hasAttribute(AUTO_ATTR)) el.setAttribute(AUTO_ATTR, 'hidden');
        }
      }
    } catch (e) { log('autohide.tag.error', { message: String((e && e.message) || e) }); }
  }
  function scheduleHideLabel(el) {
    if (el._xloadHideTimer) clearTimeout(el._xloadHideTimer);
    el._xloadHideTimer = setTimeout(function () {
      el.setAttribute(AUTO_ATTR, 'hidden');
    }, autoHideDelayMs);
  }
  function setVideoLabel(vlCfg) {
    autoHideDelayMs = Math.round(clamp(vlCfg.delay, 0, 10) * 1000);
    if (vlCfg.autoHide) {
      setStyleText('xload-autohide', buildAutoHideCSS());
      ensureAutoHideTags();
      if (!autoHideObserver) {
        autoHideObserver = new MutationObserver(function () { ensureAutoHideTags(); });
        try {
          autoHideObserver.observe(document.documentElement || document.body, { subtree: true, childList: true });
        } catch (e) { /* ignore */ }
      }
      log('apply.videoLabel', { autoHide: true, delayMs: autoHideDelayMs });
    } else {
      setStyleText('xload-autohide', '');
      if (autoHideObserver) { try { autoHideObserver.disconnect(); } catch (e) { /* ignore */ } autoHideObserver = null; }
      log('apply.videoLabel', { autoHide: false });
    }
  }

  function applySettings(next) {
    var s = validateSettings(next);
    settings = s;
    setHiding(effectiveRegions(s));
    setTheme(s.theme);
    setPhone(s.phoneMode);
    setZoom(s.zoom);
    setVideoLabel(s.videoLabel);
    saveSettings(s);
    log('applySettings.done', { preset: s.immersive.preset, phone: s.phoneMode.enabled, theme: s.theme.preset, autohide: s.videoLabel.autoHide });
    return s;
  }

  // ------------------------------------------------------------------
  // 命令处理（面板 → 脚本）
  // ------------------------------------------------------------------
  function registerCommands() {
    channel.on('getState', function (data, msg) {
      log('channel.command', { type: 'getState', hasPanelWin: !!channel.getPanelWin() });
      channel.reply(msg, { state: settings });
    });
    channel.on('applySettings', function (data, msg) {
      log('channel.command', { type: 'applySettings', payload: safeClone(data) });
      try {
        var applied = applySettings(data);
        channel.reply(msg, { ok: true, state: applied });
      } catch (e) {
        channel.reply(msg, { ok: false, error: String((e && e.message) || e) });
      }
    });
    channel.on('resetSettings', function (data, msg) {
      log('channel.command', { type: 'resetSettings' });
      try {
        var applied = applySettings(DEFAULT_SETTINGS);
        channel.reply(msg, { ok: true, state: applied });
      } catch (e) {
        channel.reply(msg, { ok: false, error: String((e && e.message) || e) });
      }
    });
    channel.on('getLogs', function (data, msg) {
      log('channel.command', { type: 'getLogs' });
      channel.reply(msg, { logs: getLogsText() });
    });
  }

  // ------------------------------------------------------------------
  // 启动
  // ------------------------------------------------------------------
  function mountFab() {
    try {
      var fab = xloadFab();
      fab.addItem(TASK_ID, '沉浸优化', function () { openPanel(); });
      log('fab.mount', { ok: true });
    } catch (e) {
      log('fab.mount.error', { message: String((e && e.message) || e) });
    }
  }

  function bindGlobalErrorCapture() {
    window.addEventListener('error', function (e) {
      if (!e || !e.message) return;
      log('window.error', { message: e.message, file: e.filename, line: e.lineno, col: e.colno });
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      log('unhandledrejection', { message: (r && r.message) ? r.message : String(r) });
      try { e.preventDefault(); } catch (ex) { /* ignore */ }
    });
  }

  function onReady() {
    try {
      applySettings(settings);
      mountFab();
      // 视频标签自动隐藏：mouseover/mouseout 委托
      document.addEventListener('mouseover', function (e) {
        if (!settings.videoLabel.autoHide) return;
        var el = e.target && e.target.closest && e.target.closest(SELECTORS.videoLabel.join(','));
        if (!el) return;
        if (el._xloadHideTimer) clearTimeout(el._xloadHideTimer);
        el.setAttribute(AUTO_ATTR, 'shown');
      });
      document.addEventListener('mouseout', function (e) {
        if (!settings.videoLabel.autoHide) return;
        var el = e.target && e.target.closest && e.target.closest(SELECTORS.videoLabel.join(','));
        if (!el) return;
        scheduleHideLabel(el);
      });
      log('onReady', { href: window.location.href });
    } catch (e) {
      log('onReady.error', { message: String((e && e.message) || e) });
    }
  }

  function init() {
    if (isExcludedHost()) { return; }
    log('init', { href: window.location.href, ts: Date.now() });
    bindGlobalErrorCapture();
    channel = createChannel(TASK_ID);
    registerCommands();
    loadSettings();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }

  init();
})();