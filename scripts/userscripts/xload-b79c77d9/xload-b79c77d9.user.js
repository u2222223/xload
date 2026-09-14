// ==UserScript==
// @name         通用无限滚动翻页
// @name:zh-CN   通用无限滚动翻页
// @name:en      Universal Infinite Scroll
// @namespace    https://github.com/u2222223/xload
// @version      2026.9.14.1
// @description  自动识别并同源加载下一页，将正文无缝追加到当前页面；支持自定义规则、自动滚动与独立控制面板。
// @description:zh-CN  自动识别并同源加载下一页，将正文无缝追加到当前页面；支持自定义规则、自动滚动与独立控制面板。
// @description:en  Detect and load same-origin next pages, append content seamlessly, and manage custom rules and auto scrolling from a separate panel.
// @author       xload
// @match        *://*/*
// @run-at       document-end
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  var TASK_ID = 'xload-b79c77d9';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-b79c77d9/panel.html';
  var STORE_KEY = 'xload-b79c77d9-settings';
  var LOG_KEY = 'xload-b79c77d9-logs';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用，可独立单测）
  // ===================================================================
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var DEFAULT_CONFIG = {
    enabled: true,
    threshold: 1600,
    delay: 650,
    maxPages: 20,
    autoScroll: false,
    scrollSpeed: 36,
    updateHistory: false,
    excludeSites: ['xload.net', 'u2222223.github.io'],
    customRules: []
  };

  function isSelfHost(host) {
    host = String(host || '').toLowerCase();
    for (var i = 0; i < SELF_HOSTS.length; i++) {
      if (host === SELF_HOSTS[i] || host.endsWith('.' + SELF_HOSTS[i])) return true;
    }
    return false;
  }

  function clampNumber(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isPlainObject(value)) {
      var out = {}, key;
      for (key in value) if (Object.prototype.hasOwnProperty.call(value, key)) out[key] = cloneValue(value[key]);
      return out;
    }
    return value;
  }

  function isSafeUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
  }

  function resolveHttpUrl(raw, base) {
    try {
      var value = new URL(String(raw || ''), String(base || ''));
      return /^https?:$/.test(value.protocol) ? value.href : '';
    } catch (e) { return ''; }
  }

  function globMatch(value, pattern) {
    value = String(value || '').toLowerCase();
    pattern = String(pattern || '').trim().toLowerCase();
    if (!value || !pattern) return false;
    if (pattern === '*') return true;
    var escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$', 'i').test(value);
  }

  function matchesSite(host, patterns) {
    if (!Array.isArray(patterns)) return false;
    for (var i = 0; i < patterns.length; i++) if (globMatch(host, patterns[i])) return true;
    return false;
  }

  function normalizeRule(rule, index) {
    if (!isPlainObject(rule)) return null;
    var host = String(rule.host || '').trim().toLowerCase();
    var nextSelector = String(rule.nextSelector || '').trim();
    var contentSelector = String(rule.contentSelector || '').trim();
    if (!host || !nextSelector || !contentSelector) return null;
    return {
      id: String(rule.id || ('rule-' + index)).slice(0, 80),
      name: String(rule.name || host).slice(0, 80),
      enabled: rule.enabled !== false,
      host: host,
      path: String(rule.path || '*').trim() || '*',
      nextSelector: nextSelector.slice(0, 500),
      contentSelector: contentSelector.slice(0, 500),
      paginationSelector: String(rule.paginationSelector || '').trim().slice(0, 500)
    };
  }

  function normalizeRules(rules) {
    var out = [];
    if (!Array.isArray(rules)) return out;
    for (var i = 0; i < rules.length && out.length < 100; i++) {
      var rule = normalizeRule(rules[i], i + 1);
      if (rule) out.push(rule);
    }
    return out;
  }

  function normalizeConfig(input) {
    input = isPlainObject(input) ? input : {};
    return {
      enabled: input.enabled !== false,
      threshold: Math.round(clampNumber(input.threshold, 100, 10000, DEFAULT_CONFIG.threshold)),
      delay: Math.round(clampNumber(input.delay, 0, 15000, DEFAULT_CONFIG.delay)),
      maxPages: Math.round(clampNumber(input.maxPages, 1, 200, DEFAULT_CONFIG.maxPages)),
      autoScroll: input.autoScroll === true,
      scrollSpeed: Math.round(clampNumber(input.scrollSpeed, 5, 300, DEFAULT_CONFIG.scrollSpeed)),
      updateHistory: input.updateHistory === true,
      excludeSites: Array.isArray(input.excludeSites)
        ? input.excludeSites.map(function (v) { return String(v || '').trim().toLowerCase(); }).filter(Boolean).slice(0, 100)
        : cloneValue(DEFAULT_CONFIG.excludeSites),
      customRules: normalizeRules(input.customRules)
    };
  }

  function matchRule(rule, host, path) {
    return !!(rule && rule.enabled && globMatch(host, rule.host) && globMatch(path, rule.path || '*'));
  }

  function selectRule(rules, host, path) {
    for (var i = 0; i < rules.length; i++) if (matchRule(rules[i], host, path)) return rules[i];
    return null;
  }

  function scoreNextDescriptor(item, currentUrl) {
    if (!item || !item.href) return -999;
    var href = resolveHttpUrl(item.href, currentUrl);
    if (!href || href === currentUrl || String(item.disabled || '') === 'true') return -999;
    var text = String(item.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    var rel = String(item.rel || '').toLowerCase();
    var aria = String(item.aria || '').toLowerCase();
    var title = String(item.title || '').toLowerCase();
    var cls = String(item.className || '').toLowerCase();
    var all = [text, aria, title, cls].join(' ');
    var score = 0;
    if (/(^|\s)next(\s|$)/.test(rel)) score += 120;
    if (/下一页|下一頁|下页|下頁|next\s*(page)?|older|more|后页|後頁|›|»|→/.test(all)) score += 55;
    if (/prev|previous|上一页|上一頁|前页|前頁|‹|«/.test(all)) score -= 90;
    if (/disabled|inactive/.test(cls)) score -= 100;
    try {
      var cur = new URL(currentUrl), nxt = new URL(href);
      if (cur.origin === nxt.origin) score += 25;
      if (cur.pathname === nxt.pathname) score += 8;
      if (/[?&](page|p|paged|start|offset)=?\d+/i.test(nxt.search)) score += 15;
    } catch (e) { score -= 30; }
    return score;
  }

  function chooseNextDescriptor(items, currentUrl) {
    var best = null, bestScore = 20;
    for (var i = 0; i < items.length; i++) {
      var score = scoreNextDescriptor(items[i], currentUrl);
      if (score > bestScore) { bestScore = score; best = items[i]; }
    }
    return best;
  }

  function shouldTrigger(scrollTop, viewportHeight, documentHeight, threshold) {
    return Number(documentHeight) - (Number(scrollTop) + Number(viewportHeight)) <= Number(threshold);
  }

  function stableFingerprint(item) {
    if (!item) return '';
    return [item.id || '', item.href || '', item.text || ''].join('|').replace(/\s+/g, ' ').trim().slice(0, 600);
  }
  // ===================================================================
  // CORE-END
  // ===================================================================

  var BUILTIN_RULES = normalizeRules([
    { id: 'google', name: 'Google 搜索', host: '*.google.*', path: '/search*', nextSelector: 'a[rel="next"], a#pnnext', contentSelector: '#search .MjjYud, #rso > div', paginationSelector: '#botstuff' },
    { id: 'bing', name: 'Bing 搜索', host: '*.bing.com', path: '/search*', nextSelector: 'a.sb_pagN, a.sb_fullnpl', contentSelector: '#b_results > li.b_algo', paginationSelector: '#b_results > li.b_pag' },
    { id: 'duckduckgo', name: 'DuckDuckGo', host: 'html.duckduckgo.com', path: '*', nextSelector: '.nav-link form input[type="submit"], a.result--more__btn', contentSelector: '.results > .result', paginationSelector: '.nav-link' },
    { id: 'github-commits', name: 'GitHub 提交列表', host: 'github.com', path: '*/commits/*', nextSelector: 'a[rel="next"], a[data-testid="pagination-next-button"]', contentSelector: '[data-testid="commit-row-item"], .TimelineItem', paginationSelector: '.paginate-container, nav[aria-label="Pagination"]' },
    { id: 'github-releases', name: 'GitHub 发布列表', host: 'github.com', path: '*/releases*', nextSelector: 'a[rel="next"], .paginate-container a:last-child', contentSelector: '.Box > div.Box-body, section', paginationSelector: '.paginate-container' },
    { id: 'wordpress', name: 'WordPress 列表', host: '*', path: '*', nextSelector: 'a.next.page-numbers, a[rel="next"], .nav-previous a', contentSelector: 'main article, article[id^="post-"], .posts .post', paginationSelector: '.navigation.pagination, .nav-links, .wp-pagenavi' },
    { id: 'discourse', name: '论坛列表', host: '*', path: '*', nextSelector: 'a[rel="next"], .pagination .next a, a.pageNav-jump--next', contentSelector: '.topic-list-item, .structItemContainer > .structItem, .threadlist > li', paginationSelector: '.pagination, nav.pageNavWrapper' }
  ]);

  var state = {
    config: loadConfig(),
    paused: false,
    loading: false,
    ended: false,
    page: 1,
    loaded: 0,
    nextUrl: '',
    activeRule: null,
    lastError: '',
    seenUrls: {},
    seenItems: {},
    autoScrollFrame: 0,
    autoScrollLast: 0,
    fabItem: null
  };

  function loadConfig() {
    try { return normalizeConfig(JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); }
    catch (e) { return normalizeConfig({}); }
  }

  function saveConfig(config) {
    state.config = normalizeConfig(config);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.config)); } catch (e) { /* ignore */ }
    log('settings.apply', state.config);
  }

  function restoreLogs() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; }
  }

  function log(tag, data) {
    var entry = { time: new Date().toISOString(), tag: String(tag), data: data == null ? {} : data };
    try { console.log('[xload infinite scroll]', tag, data == null ? '' : data); } catch (e) { /* ignore */ }
    try {
      var list = restoreLogs();
      list.push(entry);
      if (list.length > 60) list = list.slice(list.length - 60);
      localStorage.setItem(LOG_KEY, JSON.stringify(list));
    } catch (e2) { /* ignore */ }
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
      if (ev.origin !== 'https://xload.net') return;
      if (m._from !== taskId) return;
      if (panelWin && ev.source !== panelWin) return;
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
        var s = window.localStorage.getItem(key); return (s == null) ? def : JSON.parse(s);
      } catch (e) { return def; }
    }
    function storeSet(key, val) {
      try {
        if (typeof GM_setValue === 'function') { GM_setValue(key, val); return; }
        window.localStorage.setItem(key, JSON.stringify(val));
      } catch (e) { /* ignore */ }
    }
    var root = document.getElementById('xload-fab-root');
    if (root) { var oldList = root.querySelector('[data-xload-fab-list]'); if (oldList) oldList.style.display = 'flex'; }
    else { root = document.createElement('div'); root.id = 'xload-fab-root'; root.setAttribute('data-xload-fab-root', 'true'); document.body.appendChild(root); }
    var oldStyle = root.querySelector('style[data-xload-fab-style]');
    if (oldStyle && oldStyle.getAttribute('data-xload-fab-style-version') !== '4') { oldStyle.parentNode.removeChild(oldStyle); oldStyle = null; }
    if (!oldStyle) {
      var st = document.createElement('style'); st.setAttribute('data-xload-fab-style', ''); st.setAttribute('data-xload-fab-style-version', '4');
      st.textContent = '#xload-fab-root{position:fixed;right:16px;bottom:140px;z-index:2147483000;display:flex;flex-direction:column;gap:2px;min-width:170px;max-width:240px;padding:6px;box-sizing:border-box;background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.08);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none;animation:xfFabFade .3s ease backwards;}@keyframes xfFabFade{from{opacity:0}to{opacity:1}}#xload-fab-root[data-xload-fab-collapsed="true"]{padding:4px;}#xload-fab-root button{font-family:inherit;}#xload-fab-root [data-xload-fab-toggle]{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border:0;border-radius:4px;cursor:pointer;background:#111;color:#fff;font-size:13px;font-weight:700;letter-spacing:.3px;line-height:1;text-align:left;transition:background .2s ease;}#xload-fab-root [data-xload-fab-toggle]:hover{background:#000;}#xload-fab-root .xf-brand{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;border-radius:3px;background:#fff;color:#000;font-size:11px;font-weight:800;}#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;}#xload-fab-root .xf-caret{flex:none;width:6px;height:6px;border-right:1.5px solid #fff;border-bottom:1.5px solid #fff;transform:rotate(45deg);transition:transform .25s ease;}#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-135deg);}#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;overflow:hidden;max-height:0;opacity:0;transition:max-height .3s ease,opacity .25s ease;}#xload-fab-root:not([data-xload-fab-collapsed="true"]) [data-xload-fab-list]{max-height:240px;opacity:1;}#xload-fab-root [data-xload-fab-item]{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:0;border-radius:4px;background:#fff;color:#111;font-size:13px;font-weight:500;line-height:1;text-align:left;cursor:pointer;transition:background .2s ease,color .2s ease;}#xload-fab-root [data-xload-fab-item]:hover{background:#111;color:#fff;}#xload-fab-root .xf-dot{width:7px;height:7px;border-radius:50%;flex:none;background:#111;transition:background .2s ease;}#xload-fab-root [data-xload-fab-item]:hover .xf-dot{background:#fff;}';
      root.appendChild(st);
    }
    var handle = root.querySelector('[data-xload-fab-toggle]');
    if (!handle) { handle = document.createElement('button'); handle.type = 'button'; handle.setAttribute('data-xload-fab-toggle', 'true'); handle.setAttribute('aria-label', 'xload 工具'); root.insertBefore(handle, root.firstChild); }
    if (!handle.querySelector('.xf-caret')) handle.innerHTML = '<span class="xf-brand">x</span><span class="xf-title">xload 工具</span><span class="xf-caret"></span>';
    var list = root.querySelector('[data-xload-fab-list]');
    if (!list) { list = document.createElement('div'); list.setAttribute('data-xload-fab-list', 'true'); root.appendChild(list); }
    list.style.display = 'flex';
    function setCollapsed(c) { collapsed = !!c; if (collapsed) root.setAttribute('data-xload-fab-collapsed', 'true'); else root.removeAttribute('data-xload-fab-collapsed'); storeSet(COLLAPSE_KEY, collapsed); }
    function toggleCollapse() { setCollapsed(!collapsed); var p = storeGet(POS_KEY, null); if (p && typeof p.x === 'number' && typeof p.y === 'number') applyPos(p.x, p.y); }
    var movedFlag = false;
    function applyPos(x, y) { x = Math.max(4, Math.min(x, window.innerWidth - root.offsetWidth - 4)); y = Math.max(4, Math.min(y, window.innerHeight - root.offsetHeight - 4)); root.style.left = x + 'px'; root.style.top = y + 'px'; root.style.right = 'auto'; root.style.bottom = 'auto'; return { x: x, y: y }; }
    if (!root.getAttribute('data-xload-fab-drag-ready')) {
      root.setAttribute('data-xload-fab-drag-ready', 'true');
      function restorePos() { var p = storeGet(POS_KEY, null); if (p && typeof p.x === 'number' && typeof p.y === 'number') applyPos(p.x, p.y); }
      collapsed = storeGet(COLLAPSE_KEY, false); if (collapsed) root.setAttribute('data-xload-fab-collapsed', 'true'); else root.removeAttribute('data-xload-fab-collapsed');
      var dragging = false, downOnToggle = false, sx = 0, sy = 0, ox = 0, oy = 0;
      root.addEventListener('pointerdown', function (ev) { if (ev.button !== 0) return; var t = ev.target; var isToggle = !!(t && t.closest && t.closest('[data-xload-fab-toggle]')); var isItem = !!(t && t.closest && t.closest('[data-xload-fab-item]')); if (isItem && !isToggle) return; dragging = true; movedFlag = false; downOnToggle = isToggle; sx = ev.clientX; sy = ev.clientY; ox = root.offsetLeft; oy = root.offsetTop; try { root.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } });
      root.addEventListener('pointermove', function (ev) { if (!dragging) return; var dx = ev.clientX - sx, dy = ev.clientY - sy; if (!movedFlag && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return; movedFlag = true; applyPos(ox + dx, oy + dy); });
      function endDrag() { if (!dragging) return; dragging = false; if (movedFlag) storeSet(POS_KEY, { x: root.offsetLeft, y: root.offsetTop }); else if (downOnToggle) toggleCollapse(); downOnToggle = false; }
      root.addEventListener('pointerup', endDrag);
      root.addEventListener('pointercancel', function () { if (!dragging) return; dragging = false; downOnToggle = false; movedFlag = false; });
      function onViewportChange() { var p = storeGet(POS_KEY, null); if (p && typeof p.x === 'number' && typeof p.y === 'number') applyPos(p.x, p.y); else if (root.style.left || root.style.top) applyPos(parseInt(root.style.left, 10) || 16, parseInt(root.style.top, 10) || 140); }
      window.addEventListener('resize', onViewportChange); window.addEventListener('orientationchange', onViewportChange); restorePos(); setTimeout(onViewportChange, 200);
    }
    return {
      root: root, list: list, setCollapsed: setCollapsed, toggleCollapse: toggleCollapse, isCollapsed: function () { return collapsed; },
      addItem: function (taskId, label, onClick) {
        var existing = list.querySelector('[data-xload-task="' + taskId + '"]'); if (existing) return existing;
        var item = document.createElement('button'); item.type = 'button'; item.setAttribute('data-xload-fab-item', 'true'); item.setAttribute('data-xload-task', taskId);
        var dot = document.createElement('span'); dot.className = 'xf-dot'; var txt = document.createElement('span'); txt.textContent = label; item.appendChild(dot); item.appendChild(txt);
        item.addEventListener('pointerdown', function (ev) { if (ev.button !== 0) return; var sx2 = ev.clientX, sy2 = ev.clientY, dragged = false; var onMove = function (ev2) { if (Math.abs(ev2.clientX - sx2) > DRAG_THRESHOLD || Math.abs(ev2.clientY - sy2) > DRAG_THRESHOLD) dragged = true; }; var onUp = function () { item.removeEventListener('pointermove', onMove); item.removeEventListener('pointerup', onUp); item.removeEventListener('pointercancel', onUp); if (dragged) movedFlag = true; }; item.addEventListener('pointermove', onMove, { once: false }); item.addEventListener('pointerup', onUp, { once: true }); item.addEventListener('pointercancel', onUp, { once: true }); });
        item.addEventListener('click', function () { if (movedFlag) { movedFlag = false; return; } if (onClick) onClick(); }); list.appendChild(item); return item;
      }
    };
  }

  var channel = createChannel(TASK_ID);

  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    restoreLogs();
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) { try { existing.focus(); } catch (e) { /* ignore */ } log('panel.reuse', {}); return true; }
    try {
      var W = Math.min(920, Math.max(520, (window.screen.availWidth || 1280) - 120));
      var H = Math.min(820, Math.max(580, (window.screen.availHeight || 800) - 120));
      var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
      var T = Math.max(0, Math.round(((window.screen.availHeight || 800) - H) / 2));
      var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T + ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
      log('panel.open', { requestedW: W, requestedH: H, left: L, top: T });
      var w = window.open(PANEL_URL, '_blank', features);
      var moved = false;
      if (w) { try { w.moveTo(L, T); w.resizeTo(W, H); moved = true; } catch (e2) { log('panel.move.error', { message: String(e2 && e2.message || e2) }); } channel.setPanelWin(w); }
      log('panel.open.result', { opened: !!w, moved: moved });
      return !!w;
    } catch (e) { log('panel.open.error', { message: String(e && e.message || e) }); return false; }
  }

  function getAllRules() { return state.config.customRules.concat(BUILTIN_RULES); }

  function querySelectorSafe(root, selector, all) {
    if (!root || !selector) return all ? [] : null;
    try { return all ? Array.prototype.slice.call(root.querySelectorAll(selector)) : root.querySelector(selector); }
    catch (e) { log('selector.error', { selector: selector, message: String(e.message || e) }); return all ? [] : null; }
  }

  function describeLinks(root) {
    var links = querySelectorSafe(root, 'a[href]', true);
    return links.slice(0, 2000).map(function (a) {
      return { element: a, href: a.href || a.getAttribute('href'), text: a.textContent, rel: a.rel, aria: a.getAttribute('aria-label'), title: a.title, className: a.className, disabled: a.getAttribute('aria-disabled') };
    });
  }

  function findNext(root, baseUrl, rule) {
    var element = rule ? querySelectorSafe(root, rule.nextSelector, false) : null;
    if (element && element.tagName !== 'A') element = querySelectorSafe(element, 'a[href]', false);
    if (element) {
      var direct = resolveHttpUrl(element.getAttribute('href') || element.href, baseUrl);
      if (direct) return { url: direct, element: element, mode: 'rule' };
    }
    var chosen = chooseNextDescriptor(describeLinks(root), baseUrl);
    return chosen ? { url: resolveHttpUrl(chosen.href, baseUrl), element: chosen.element, mode: 'heuristic' } : null;
  }

  function inferContentSelector(currentDoc, nextDoc, rule) {
    if (rule && querySelectorSafe(nextDoc, rule.contentSelector, true).length) return rule.contentSelector;
    var candidates = [
      'main article', '[role="main"] article', '.topic-list-item', '.structItem', '.threadlist > li',
      '#content article', '.posts > article', '.post-list > *', '.result', '.search-result',
      '#search .MjjYud', '#b_results > li.b_algo', 'main > section', 'main > div'
    ];
    var best = '', bestScore = 0;
    for (var i = 0; i < candidates.length; i++) {
      var nowCount = querySelectorSafe(currentDoc, candidates[i], true).length;
      var nextCount = querySelectorSafe(nextDoc, candidates[i], true).length;
      var score = Math.min(nowCount, nextCount) * 10 - Math.abs(nowCount - nextCount);
      if (nextCount >= 2 && score > bestScore) { best = candidates[i]; bestScore = score; }
    }
    return best;
  }

  function sanitizeTree(node, pageUrl) {
    var blocked = querySelectorSafe(node, 'script, iframe, object, embed, base, meta[http-equiv="refresh"]', true);
    blocked.forEach(function (el) { el.remove(); });
    var all = [node].concat(querySelectorSafe(node, '*', true));
    all.forEach(function (el) {
      if (!el.attributes) return;
      Array.prototype.slice.call(el.attributes).forEach(function (attr) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
      ['href', 'src', 'action', 'poster'].forEach(function (name) {
        if (!el.hasAttribute || !el.hasAttribute(name)) return;
        var raw = el.getAttribute(name);
        if (/^(#|mailto:|tel:)/i.test(raw || '')) return;
        var safe = resolveHttpUrl(raw, pageUrl);
        if (safe) el.setAttribute(name, safe); else el.removeAttribute(name);
      });
      if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
    });
    return node;
  }

  function fingerprintElement(el) {
    return stableFingerprint({ id: el.id, href: (querySelectorSafe(el, 'a[href]', false) || {}).href, text: el.textContent });
  }

  function seedFingerprints(selector) {
    querySelectorSafe(document, selector, true).forEach(function (el) { var fp = fingerprintElement(el); if (fp) state.seenItems[fp] = true; });
  }

  function appendPage(nextDoc, pageUrl, rule) {
    var selector = inferContentSelector(document, nextDoc, rule);
    if (!selector) throw new Error('无法识别可追加的正文列表，请在面板添加站点规则');
    var incoming = querySelectorSafe(nextDoc, selector, true);
    var current = querySelectorSafe(document, selector, true);
    if (!incoming.length || !current.length) throw new Error('正文选择器未同时命中当前页与下一页：' + selector);
    if (!Object.keys(state.seenItems).length) seedFingerprints(selector);
    var marker = current[current.length - 1];
    var parent = marker.parentNode;
    var added = 0;
    incoming.forEach(function (source) {
      var clone = sanitizeTree(source.cloneNode(true), pageUrl);
      var fp = fingerprintElement(clone);
      if (fp && state.seenItems[fp]) return;
      if (fp) state.seenItems[fp] = true;
      parent.appendChild(clone);
      added++;
    });
    if (!added) throw new Error('下一页内容与当前页重复，已停止');
    if (rule && rule.paginationSelector) {
      var oldPager = querySelectorSafe(document, rule.paginationSelector, false);
      var newPager = querySelectorSafe(nextDoc, rule.paginationSelector, false);
      if (oldPager && newPager) oldPager.replaceWith(sanitizeTree(newPager.cloneNode(true), pageUrl));
    }
    return { added: added, selector: selector };
  }

  function detectRule() {
    state.activeRule = selectRule(getAllRules(), location.hostname.toLowerCase(), location.pathname + location.search);
    var next = findNext(document, location.href, state.activeRule);
    state.nextUrl = next ? next.url : '';
    state.ended = !state.nextUrl;
    log('rule.detect', { rule: state.activeRule && state.activeRule.name, nextUrl: state.nextUrl, mode: next && next.mode });
    updateFab();
  }

  function fetchDocument(url) {
    if (!isSafeUrl(url)) return Promise.reject(new Error('下一页 URL 协议不受支持'));
    var target = new URL(url);
    if (target.origin !== location.origin) return Promise.reject(new Error('为保护登录信息，仅允许加载同源下一页'));
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : 0;
    return fetch(target.href, { credentials: 'include', headers: { Accept: 'text/html,application/xhtml+xml' }, signal: controller && controller.signal })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var type = response.headers.get('content-type') || '';
        if (type && !/html|xhtml/i.test(type)) throw new Error('下一页不是 HTML 文档');
        return response.text();
      }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function loadNextPage(reason) {
    if (!state.config.enabled || state.paused || state.loading || state.ended) return Promise.resolve({ ok: false, skipped: true });
    if (state.loaded >= state.config.maxPages) { state.ended = true; state.lastError = '已达到最大加载页数'; updateFab(); pushState(); return Promise.resolve({ ok: false, ended: true }); }
    if (!state.nextUrl) detectRule();
    var url = state.nextUrl;
    if (!url || state.seenUrls[url]) { state.ended = true; updateFab(); pushState(); return Promise.resolve({ ok: false, ended: true }); }
    state.loading = true; state.lastError = ''; updateFab(); pushProgress('loading', '正在加载下一页', { url: url, reason: reason });
    log('page.load.start', { url: url, reason: reason });
    state.seenUrls[url] = true;
    return new Promise(function (resolve) { setTimeout(resolve, state.config.delay); })
      .then(function () { return fetchDocument(url); })
      .then(function (nextDoc) {
        var result = appendPage(nextDoc, url, state.activeRule);
        state.page++; state.loaded++;
        var following = findNext(nextDoc, url, state.activeRule);
        state.nextUrl = following ? following.url : '';
        state.ended = !state.nextUrl || state.nextUrl === url;
        if (state.config.updateHistory && isSafeUrl(url)) { try { history.pushState({ xloadInfinitePage: state.page }, nextDoc.title || document.title, url); } catch (e) { /* ignore */ } }
        log('page.load.done', { url: url, added: result.added, selector: result.selector, nextUrl: state.nextUrl });
        pushProgress('done', '已追加第 ' + state.page + ' 页', result);
        return { ok: true, result: result };
      })
      .catch(function (error) {
        delete state.seenUrls[url]; state.paused = true; state.lastError = String(error && error.message || error);
        log('page.load.error', { url: url, message: state.lastError }); channel.send('error', { message: state.lastError, url: url });
        return { ok: false, error: state.lastError };
      })
      .finally(function () { state.loading = false; updateFab(); pushState(); });
  }

  function snapshot() {
    return {
      ok: true, config: cloneValue(state.config), page: state.page, loaded: state.loaded, paused: state.paused,
      loading: state.loading, ended: state.ended, nextUrl: state.nextUrl,
      activeRule: state.activeRule ? state.activeRule.name : '启发式检测', lastError: state.lastError,
      pageInfo: { host: location.hostname, url: location.href, title: document.title }, builtinRules: cloneValue(BUILTIN_RULES)
    };
  }

  function pushState() { channel.send('renderState', snapshot()); }
  function pushProgress(stage, message, extra) { channel.send('progress', { stage: stage, message: message, page: state.page, extra: extra || {} }); }

  function updateFab() {
    if (!state.fabItem) return;
    var text = state.fabItem.querySelector('span:last-child');
    if (!text) return;
    var status = state.loading ? '加载中' : state.paused ? '已暂停' : state.ended ? '已结束' : ('第 ' + state.page + ' 页');
    text.textContent = '无限翻页 · ' + status;
    state.fabItem.title = '点击打开面板；右键回到顶部';
  }

  function applyAutoScroll() {
    if (state.autoScrollFrame) cancelAnimationFrame(state.autoScrollFrame);
    state.autoScrollFrame = 0; state.autoScrollLast = 0;
    if (!state.config.autoScroll || !state.config.enabled || state.paused) return;
    function step(time) {
      if (!state.config.autoScroll || !state.config.enabled || state.paused) { state.autoScrollFrame = 0; return; }
      if (!state.autoScrollLast) state.autoScrollLast = time;
      var seconds = Math.min(0.1, (time - state.autoScrollLast) / 1000);
      state.autoScrollLast = time;
      window.scrollBy(0, state.config.scrollSpeed * seconds);
      state.autoScrollFrame = requestAnimationFrame(step);
    }
    state.autoScrollFrame = requestAnimationFrame(step);
    log('autoScroll.start', { speed: state.config.scrollSpeed });
  }

  function onScroll() {
    if (shouldTrigger(window.pageYOffset || document.documentElement.scrollTop, window.innerHeight, document.documentElement.scrollHeight, state.config.threshold)) loadNextPage('scroll');
  }

  function handleCommand(data, msg) {
    data = data || {};
    log('channel.command', { action: data.action });
    var action = data.action;
    if (action === 'queryState') { detectRule(); channel.reply(msg, snapshot()); return; }
    if (action === 'applyConfig') {
      saveConfig(data.config); state.paused = !state.config.enabled; state.ended = false; detectRule(); applyAutoScroll(); updateFab(); channel.reply(msg, snapshot()); return;
    }
    if (action === 'resetConfig') { saveConfig(DEFAULT_CONFIG); state.paused = false; state.ended = false; detectRule(); applyAutoScroll(); channel.reply(msg, snapshot()); return; }
    if (action === 'togglePause') { state.paused = !state.paused; log('pause.toggle', { paused: state.paused }); applyAutoScroll(); updateFab(); channel.reply(msg, snapshot()); return; }
    if (action === 'loadNow') { state.paused = false; loadNextPage('panel').then(function (result) { channel.reply(msg, { ok: result.ok, state: snapshot() }); }); return; }
    if (action === 'scrollTop') { window.scrollTo({ top: 0, behavior: 'smooth' }); channel.reply(msg, { ok: true }); return; }
    if (action === 'testRule') {
      var rule = normalizeRule(data.rule, 1); var matched = rule && matchRule(rule, location.hostname, location.pathname + location.search);
      var nextFound = matched && !!querySelectorSafe(document, rule.nextSelector, false); var contentCount = matched ? querySelectorSafe(document, rule.contentSelector, true).length : 0;
      channel.reply(msg, { ok: !!(matched && nextFound && contentCount), matched: !!matched, nextFound: !!nextFound, contentCount: contentCount }); return;
    }
    if (action === 'getLogs') { channel.reply(msg, { ok: true, logs: JSON.stringify(restoreLogs(), null, 2) }); return; }
    channel.reply(msg, { ok: false, error: '未知命令' });
  }

  function init() {
    if (isSelfHost(location.hostname)) return;
    log('init', { url: location.href, top: window.self === window.top });
    window.addEventListener('error', function (event) { log('global.error', { message: event.message, file: event.filename, line: event.lineno, col: event.colno }); });
    window.addEventListener('unhandledrejection', function (event) { var reason = event.reason; log('global.unhandledrejection', { message: String(reason && reason.message || reason) }); event.preventDefault(); });
    if (matchesSite(location.hostname, state.config.excludeSites)) { log('init.excluded', { host: location.hostname }); return; }
    channel.on('command', handleCommand);
    var fab = xloadFab();
    state.fabItem = fab.addItem(TASK_ID, '无限翻页 · 检测中', openPanel);
    if (state.fabItem) state.fabItem.addEventListener('contextmenu', function (event) { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); log('scroll.top', { source: 'fab' }); });
    detectRule();
    state.paused = !state.config.enabled;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('popstate', function () { state.activeRule = null; state.nextUrl = ''; state.ended = false; detectRule(); });
    applyAutoScroll(); updateFab(); pushState();
  }

  init();
})();
