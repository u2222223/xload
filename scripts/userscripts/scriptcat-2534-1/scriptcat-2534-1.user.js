// ==UserScript==
// @name        抖音视频流过滤
// @namespace   https://github.com/u2222223/xload
// @version     2026.9.10.1
// @description 自定义过滤抖音网页版视频流中的广告、直播和不感兴趣内容
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

  // 默认配置：总开关 + 预设过滤项 + 自定义规则数组
  var DEFAULT_CONFIG = {
    enabled: true,        // 过滤总开关
    filterAds: true,      // 过滤广告视频
    filterLive: false,    // 过滤直播卡片
    filterPicture: false, // 过滤图集/图文
    rules: []             // 自定义规则 [{id,enabled,field,op,value,caseSensitive}]
  };

  // 自定义规则可匹配的字段
  var TEXT_FIELDS = ['desc', 'author', 'uid', 'tags']; // 文本类字段
  var TEXT_OPS = ['contains', 'equals', 'regex'];      // 文本类操作符
  var NUM_OPS = ['gt', 'gte', 'lt', 'lte', 'equals'];  // 数值类（时长）操作符
  var FIELD_LABELS = { desc: '标题/文案', author: '作者', uid: '作者ID', tags: '话题标签', duration: '时长' };

  // 从对象取字段：优先 camelCase，其次 snake_case（兼容抖音 DOM React props 与网络接口两种形态）
  function pick(obj, camel, snake) {
    if (obj == null || typeof obj !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, camel)) return obj[camel];
    if (Object.prototype.hasOwnProperty.call(obj, snake)) return obj[snake];
    return undefined;
  }

  function asStr(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return String(v);
  }

  // 尝试把字符串解析为对象（网络侧 web_raw_data 为 JSON 字符串，且 brand_ad 本身还可能二次编码）
  function tryJson(v) {
    if (typeof v !== 'string') return (v && typeof v === 'object') ? v : null;
    try { return JSON.parse(v); } catch (e) { return null; }
  }

  // 广告标识判真（true / 1 / '1' / 'true'）
  function truthyAd(v) {
    return v === true || v === 1 || v === '1' || v === 'true';
  }

  // 判定是否广告（照抄站点客观字段，多路兜底；兼容 DOM 对象形与网络 JSON 字符串形）
  function detectAd(raw) {
    if (pick(raw, 'isAds', 'is_ads') === true) return true;
    var rad = pick(raw, 'rawAdData', 'raw_ad_data');
    if (typeof rad === 'string' && rad.trim() !== '') return true;
    var wrd = pick(raw, 'webRawData', 'web_raw_data');
    var w = (wrd && typeof wrd === 'object') ? wrd : tryJson(wrd);
    if (!w) return false;
    var ba = pick(w, 'brandAd', 'brand_ad');
    var bo = (ba && typeof ba === 'object') ? ba : tryJson(ba);
    if (bo && truthyAd(pick(bo, 'isAd', 'is_ad'))) return true;
    var ii = pick(w, 'insertInfo', 'insert_info');
    var io = (ii && typeof ii === 'object') ? ii : tryJson(ii);
    if (io && truthyAd(pick(io, 'isAd', 'is_ad'))) return true;
    return false;
  }

  // 判定是否直播（cell_room / cellRoom 对象存在即直播间）
  function detectLive(raw) {
    var cr = pick(raw, 'cellRoom', 'cell_room');
    return (cr != null && typeof cr === 'object');
  }

  // 从原始 aweme 对象抽取统一视频元数据（纯函数，兼容 DOM camelCase 与网络 snake_case）
  function extractMeta(raw) {
    var m = {
      id: '',
      desc: '',
      nickname: '',
      uid: '',
      duration: null,
      isAd: false,
      isLive: false,
      isPicture: false,
      tags: []
    };
    if (raw == null || typeof raw !== 'object') return m;
    m.id = asStr(pick(raw, 'awemeId', 'aweme_id'));
    m.desc = asStr(pick(raw, 'desc', 'desc'));

    var author = pick(raw, 'authorInfo', 'author');
    if (author && typeof author === 'object') {
      m.nickname = asStr(pick(author, 'nickname', 'nickname'));
      m.uid = asStr(pick(author, 'uid', 'uid'));
    }

    var video = pick(raw, 'video', 'video');
    if (video && typeof video === 'object') {
      var d = pick(video, 'duration', 'duration');
      if (typeof d === 'number') m.duration = d;
    }

    var awemeType = pick(raw, 'awemeType', 'aweme_type');
    m.isPicture = (awemeType === 68) || (Number(awemeType) === 68);
    m.isAd = detectAd(raw);
    m.isLive = detectLive(raw);

    var textExtra = pick(raw, 'textExtra', 'text_extra');
    var videoTag = pick(raw, 'videoTag', 'video_tag');
    if (Array.isArray(textExtra)) {
      for (var i = 0; i < textExtra.length; i++) {
        var ht = pick(textExtra[i], 'hashtagName', 'hashtag_name');
        if (typeof ht === 'string' && ht.trim() !== '') m.tags.push(ht.trim());
      }
    }
    if (Array.isArray(videoTag)) {
      for (var j = 0; j < videoTag.length; j++) {
        var tn = pick(videoTag[j], 'tagName', 'tag_name');
        if (typeof tn === 'string' && tn.trim() !== '') m.tags.push(tn.trim());
      }
    }
    return m;
  }

  // 文本匹配：value 可为字符串或字符串数组（命中任一即 true）
  function matchTextValue(value, op, pattern, caseSensitive) {
    if (value == null || typeof pattern !== 'string') return false;
    var list = Array.isArray(value) ? value : [value];
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (typeof h !== 'string') continue;
      if (op === 'regex') {
        var re = null;
        try { re = new RegExp(pattern, caseSensitive ? '' : 'i'); } catch (e) { re = null; }
        if (re && re.test(h)) return true;
      } else {
        var a = caseSensitive ? h : h.toLowerCase();
        var b = caseSensitive ? pattern : pattern.toLowerCase();
        if (op === 'contains' && a.indexOf(b) >= 0) return true;
        if (op === 'equals' && a === b) return true;
      }
    }
    return false;
  }

  // 字段 key 映射：rule.field -> meta 属性名
  var FIELD_KEYS = { desc: 'desc', author: 'nickname', uid: 'uid', tags: 'tags', duration: 'duration' };

  function fieldLabel(field) {
    return FIELD_LABELS[field] || field;
  }

  // 单条规则匹配（纯函数）
  function matchRule(meta, rule) {
    if (!rule || !rule.enabled) return false;
    var field = rule.field;
    var op = rule.op;
    if (field === 'duration') {
      var v = Number(meta.duration);
      var t = Number(rule.value);
      if (isNaN(v) || isNaN(t)) return false;
      if (op === 'gt') return v > t;
      if (op === 'gte') return v >= t;
      if (op === 'lt') return v < t;
      if (op === 'lte') return v <= t;
      if (op === 'equals') return v === t;
      return false;
    }
    var key = FIELD_KEYS[field];
    if (!key) return false;
    return matchTextValue(meta[key], op, rule.value, !!rule.caseSensitive);
  }

  // 综合判定：是否过滤 + 命中原因（纯函数）
  function shouldFilter(meta, config) {
    var reasons = [];
    if (!config || !config.enabled) return { filtered: false, reasons: reasons };
    if (config.filterAds && meta.isAd) reasons.push('广告视频');
    if (config.filterLive && meta.isLive) reasons.push('直播');
    if (config.filterPicture && meta.isPicture) reasons.push('图集/图文');
    var rules = Array.isArray(config.rules) ? config.rules : [];
    for (var i = 0; i < rules.length; i++) {
      if (matchRule(meta, rules[i])) {
        reasons.push(fieldLabel(rules[i].field) + (rules[i].value ? '：' + rules[i].value : ''));
      }
    }
    return { filtered: reasons.length > 0, reasons: reasons };
  }

  // 归一化单条规则（补默认值 + 取值约束；id 无则按序号确定式生成）
  function normalizeRule(raw, idx) {
    var field = (TEXT_FIELDS.indexOf(raw && raw.field) >= 0 || (raw && raw.field === 'duration'))
      ? raw.field : 'desc';
    var ops = field === 'duration' ? NUM_OPS : TEXT_OPS;
    var op = ops.indexOf(raw && raw.op) >= 0 ? raw.op : (field === 'duration' ? 'gt' : 'contains');
    var value = (raw && typeof raw.value === 'string') ? raw.value : '';
    return {
      id: (raw && typeof raw.id === 'string' && raw.id) ? raw.id : ('rule_' + idx),
      enabled: raw == null || raw.enabled !== false,
      field: field,
      op: op,
      value: value,
      caseSensitive: Boolean(raw && raw.caseSensitive)
    };
  }

  // 归一化整份配置（补默认值 + 类型约束；空 value 规则丢弃视为无效）
  function normalizeConfig(raw) {
    var cfg = { enabled: true, filterAds: true, filterLive: false, filterPicture: false, rules: [] };
    var src = (raw && typeof raw === 'object') ? raw : {};
    if (src.enabled === false) cfg.enabled = false;
    if (src.filterAds != null) cfg.filterAds = Boolean(src.filterAds);
    if (src.filterLive != null) cfg.filterLive = Boolean(src.filterLive);
    if (src.filterPicture != null) cfg.filterPicture = Boolean(src.filterPicture);
    var rules = Array.isArray(src.rules) ? src.rules : [];
    for (var i = 0; i < rules.length; i++) {
      var nr = normalizeRule(rules[i], i);
      if (nr.value && nr.value.trim() !== '') cfg.rules.push(nr);
    }
    return cfg;
  }

  // 导出配置 JSON（纯函数）
  function exportConfigJson(config) {
    var out = {
      enabled: config.enabled,
      filterAds: config.filterAds,
      filterLive: config.filterLive,
      filterPicture: config.filterPicture,
      rules: config.rules
    };
    return JSON.stringify(out, null, 2);
  }

  // 解析配置 JSON（纯函数，非法返回 {ok:false,error}）
  function parseConfigJson(text) {
    if (typeof text !== 'string') return { ok: false, error: '请输入文本' };
    try {
      var obj = JSON.parse(text);
      if (!obj || typeof obj !== 'object') return { ok: false, error: '内容不是 JSON 对象' };
      return { ok: true, config: normalizeConfig(obj) };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  // 外链协议白名单：仅允许 http/https
  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  var TASK_ID = 'scriptcat-2534-1';
  var LS_CONFIG_KEY = 'xload-dy-filter-config';
  var LS_STATS_KEY = 'xload-dy-filter-stats';
  var LOG_KEY = 'xload-dy-filter-logs';
  // 面板入口（上线后站点域名以实际部署为准；协议仅 http/https）
  var PANEL_URL = 'https://xload.net/scripts/userscripts/scriptcat-2534-1/panel.html';

  // ---- 日志系统 -----------------------------------------------------
  // 内存环形缓冲 + localStorage 持久化 + console；面板「查看日志」可复制回传排错。
  var LOG_RING = [];
  function log(tag, data) {
    var entry = { t: new Date().toISOString(), tag: tag, data: data == null ? null : data };
    LOG_RING.push(entry);
    if (LOG_RING.length > 300) LOG_RING.shift();
    try { console.log('[xload:scriptcat-2534-1]', tag, data == null ? '' : data); } catch (e) { /* ignore */ }
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

  // ---- 配置/统计读写（独立命名，勿与其它函数重名）------------------
  function loadConfig() {
    try { return normalizeConfig(JSON.parse(window.localStorage.getItem(LS_CONFIG_KEY))); }
    catch (e) { return normalizeConfig({}); }
  }
  var config = loadConfig();

  function persistConfig(next) {
    config = normalizeConfig(next);
    try { window.localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config)); } catch (e) { /* ignore */ }
  }

  function loadStats() {
    try {
      var s = JSON.parse(window.localStorage.getItem(LS_STATS_KEY));
      return { filtered: Number(s && s.filtered) || 0, scanned: Number(s && s.scanned) || 0 };
    } catch (e) { return { filtered: 0, scanned: 0 }; }
  }
  var stats = loadStats();

  function persistStats() {
    try { window.localStorage.setItem(LS_STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  // ---- 面板通信（与 panel.js 的 PanelChannel 协议一致；沙箱安全三级投递）----
  // 回包先经 panelWin（window.open 直接返回值）→ event.source → BroadcastChannel 兜底。
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

  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });
      var resp;
      if (action === 'getState') {
        resp = { ok: true, config: config, stats: stats };
      } else if (action === 'applyConfig') {
        persistConfig(data.config || {});
        resp = { ok: true, config: config, stats: stats };
      } else if (action === 'resetConfig') {
        persistConfig(DEFAULT_CONFIG);
        stats = { filtered: 0, scanned: 0 };
        persistStats();
        resp = { ok: true, config: config, stats: stats };
      } else if (action === 'getLogs') {
        resp = { ok: true, logs: logText() };
      } else if (action === 'clearStats') {
        stats = { filtered: 0, scanned: 0 };
        persistStats();
        resp = { ok: true, stats: stats };
      } else {
        resp = { ok: false, error: '未知命令: ' + action };
      }
      channel.reply(msg, resp);
    });
  }

  // ---- React fiber 访问（页面事实：抖音卡片视频数据挂在 React 组件 props 上）----
  function getReactFiber(el) {
    if (!el) return null;
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.indexOf('__reactFiber$') === 0 || k.indexOf('__reactInternalInstance$') === 0) {
        return el[k];
      }
    }
    return null;
  }

  // 沿 fiber 链向上（含 sibling）查找 awemeInfo / originData / 拆到 props 的 aweme 字段
  function searchFiberForAweme(fiber, hops) {
    var f = fiber;
    while (f && hops-- > 0) {
      var p = f.memoizedProps;
      if (p && typeof p === 'object') {
        if (p.awemeInfo && typeof p.awemeInfo === 'object') return p.awemeInfo;
        if (p.originData && typeof p.originData === 'object') return p.originData;
        if (typeof p.awemeId === 'string' && p.awemeId &&
            (p.desc != null || p.video || p.authorInfo || p.author)) return p;
      }
      var c = f.child;
      while (c && hops-- > 0) {
        var cp = c.memoizedProps;
        if (cp && typeof cp === 'object' && cp.awemeInfo && typeof cp.awemeInfo === 'object') return cp.awemeInfo;
        c = c.sibling;
      }
      f = f.return;
    }
    return null;
  }

  // 从新增 DOM 节点向上寻找携带 aweme 数据的元素
  function findAwemeFromNode(node) {
    var el = (node && node.nodeType === 1) ? node : (node && node.nodeType === 3 ? node.parentElement : null);
    if (!el) return null;
    var cur = el;
    var up = 16;
    while (cur && up-- > 0) {
      var fiber = getReactFiber(cur);
      var aweme = fiber ? searchFiberForAweme(fiber, 12) : null;
      if (aweme && typeof aweme === 'object') return { aweme: aweme, el: cur };
      cur = cur.parentElement;
    }
    return null;
  }

  // 定位要移除的「卡片容器」：向上找 <li> 或含视频节点的容器，兜底用持有者本身
  function cardContainer(holder) {
    var card = holder;
    var p = holder.parentElement;
    var up = 8;
    while (p && up-- > 0) {
      if (p.tagName === 'LI') { card = p; break; }
      if (p.querySelector && p.querySelector('video, xg-video-container, [class*="video"]')) { card = p; break; }
      p = p.parentElement;
    }
    return card;
  }

  // ---- MutationObserver + 过滤执行 + 自动续流 ---------------------
  var sawIds = {};
  var sawCount = 0;

  function rememberId(id) {
    if (!id) return false;
    if (sawIds[id]) return true;
    sawIds[id] = true;
    sawCount++;
    if (sawCount > 3000) { sawIds = {}; sawCount = 0; } // 防无限增长
    return false;
  }

  function processNodeForAweme(node) {
    var hit = findAwemeFromNode(node);
    if (!hit) return;
    var meta = extractMeta(hit.aweme);
    // 无任何有效元数据则跳过（避免误伤）
    if (!meta.id && !meta.desc && !meta.nickname && !meta.isAd && !meta.isLive) return;
    var key = meta.id || (meta.desc + '|' + meta.nickname);
    if (!key) return;
    if (rememberId(key)) return;
    stats.scanned++;
    var res = shouldFilter(meta, config);
    if (res.filtered) {
      stats.filtered++;
      var card = cardContainer(hit.el);
      if (card && card.parentElement) {
        try {
          card.setAttribute('data-xload-filtered', '1');
          card.parentElement.removeChild(card);
          log('filter.remove', { id: meta.id, desc: meta.desc.slice(0, 40), nickname: meta.nickname, reasons: res.reasons });
        } catch (e) { log('filter.remove.error', { message: String(e && e.message || e) }); }
        scheduleTopUp();
      }
    }
    persistStats();
    pushStats();
  }

  var pendingQueue = [];
  var queuedScheduled = false;

  function onMutations(muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        if (added[j] && added[j].nodeType === 1) pendingQueue.push(added[j]);
      }
    }
    if (pendingQueue.length && !queuedScheduled) {
      queuedScheduled = true;
      try { window.requestAnimationFrame(processQueue); } catch (e) { processQueue(); }
    }
  }

  function processQueue() {
    queuedScheduled = false;
    var q = pendingQueue.splice(0, 800);
    for (var i = 0; i < q.length; i++) {
      var node = q[i];
      if (!node) continue;
      if (node.isConnected === false) continue;
      processNodeForAweme(node);
    }
    if (pendingQueue.length) onMutations([]);
  }

  var mo = null;
  function observeFeed() {
    if (mo) return;
    if (!document.body) return;
    mo = new MutationObserver(onMutations);
    mo.observe(document.body, { childList: true, subtree: true });
    log('observer.start', {});
  }

  var lastStatsPush = 0;
  function pushStats() {
    var now = Date.now();
    if (now - lastStatsPush < 400) return;
    lastStatsPush = now;
    channel.send('filterStats', { filtered: stats.filtered, scanned: stats.scanned });
  }

  // 自动续流：过滤掉内容后，若页面接近底部则轻推滚动触发下一批加载，避免「刷不动」。
  // 限频：每 60s 最多 24 次，两次间隔 >= 1.2s，应对平台风控。
  var lastTopUp = 0;
  var topUpCount = 0;
  var topUpWindowStart = Date.now();
  var topUpTimer = null;

  function scheduleTopUp() {
    if (topUpTimer) clearTimeout(topUpTimer);
    topUpTimer = setTimeout(doTopUp, 700);
  }

  function doTopUp() {
    topUpTimer = null;
    if (!config.enabled) return;
    var now = Date.now();
    if (now - topUpWindowStart > 60000) { topUpWindowStart = now; topUpCount = 0; }
    if (topUpCount >= 24) return;
    if (now - lastTopUp < 1200) return;
    lastTopUp = now;
    topUpCount++;
    var sh = document.documentElement.scrollHeight;
    var vh = window.innerHeight;
    var y = window.scrollY || window.pageYOffset || 0;
    if ((sh - vh - y) < 800) {
      try { window.scrollBy(0, 300); } catch (e) { /* ignore */ }
      log('topup.scroll', {});
    }
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
      var W = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
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

  // ---- FAB 聚合按钮组（共享模板 templates/fab.js，v3 大气版 + 可折叠）----
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

  function injectFab() {
    var fab = xloadFab();
    fab.addItem(TASK_ID, '视频流过滤', openPanel);
    log('fab.added', {});
  }

  // ---- 全局错误捕获入日志 ----------------------------------------
  function registerErrorCapture() {
    window.addEventListener('error', function (e) {
      try {
        log('window.error', { message: e && e.message, file: e && e.filename, line: e && e.lineno, col: e && e.colno });
      } catch (er) { /* ignore */ }
    });
    window.addEventListener('unhandledrejection', function (e) {
      try {
        var r = e && e.reason;
        log('unhandledrejection', { message: r && r.message ? r.message : String(r) });
        if (e && e.preventDefault) e.preventDefault();
      } catch (er) { /* ignore */ }
    });
  }

  // ---- 启动 -------------------------------------------------------
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function init() {
    // 宿主站点排除：在自家站点（xload.net / u2222223.github.io）上直接退出
    var host = (location.hostname || '').toLowerCase();
    if (host === 'xload.net' || /(^|\.)xload\.net$/.test(host) ||
        host === 'u2222223.github.io' || /(^|\.)u2222223\.github\.io$/.test(host)) {
      return;
    }
    log('init.start', { host: host, ua: navigator.userAgent.slice(0, 80), readyState: document.readyState });
    registerErrorCapture();
    registerChannelHandlers();
    whenReady(function () {
      try {
        injectFab();
        observeFeed();
        log('init.ready.done', { config: config, stats: stats });
      } catch (e) {
        log('init.ready.error', { message: String(e && e.message || e) });
      }
    });
  }

  init();
})();