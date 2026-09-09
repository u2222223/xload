// ==UserScript==
// @name        学术论文免费下载工具
// @namespace   https://github.com/u2222223/xload
// @version     1.0.3
// @description 多平台学术论文一键免费下载：知网、万方、维普、皮书、中华医学会、博看期刊，无需登录付费账号
// @author      xload
// @match       *://*.cnki.net/*
// @match       *://*.wanfangdata.com.cn/*
// @match       *://*.cqvip.com/*
// @match       *://*.pishu.com.cn/*
// @match       *://*.yiigle.com/*
// @match       *://*.bookan.com.cn/*
// @grant       GM_xmlhttpRequest
// @grant       GM_download
// @grant       GM_setValue
// @grant       GM_getValue
// @connect     *
// @license     MIT
// @run-at      document-end
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用，可独立单测）
  // ===================================================================

  // 支持站点：site key -> 显示名 / 官网（客观事实，用于站点导航）
  var SITE_META = {
    cnki: { label: '知网', home: 'https://www.cnki.net/' },
    wanfang: { label: '万方', home: 'https://www.wanfangdata.com.cn/' },
    cqvip: { label: '维普', home: 'https://lib.cqvip.com/' },
    pishu: { label: '皮书', home: 'https://www.pishu.com.cn/' },
    yiigle: { label: '中华医学会', home: 'https://www.yiigle.com/index' },
    bookan: { label: '博看期刊', home: 'http://new.bookan.com.cn/' }
  };

  // 公开解析源（sci-hub 镜像，按其可用性轮换尝试；协议仅 http/https）
  var SCIHUB_MIRRORS = [
    'https://sci-hub.se',
    'https://sci-hub.st',
    'https://sci-hub.ru',
    'https://sci-hub.ee',
    'https://sci-hub.wf'
  ];

  // 宿主 -> site key（域名归属，客观事实）
  function detectSite(host) {
    var h = String(host || '').toLowerCase();
    if (!h) return null;
    if (h.indexOf('cnki.net') !== -1) return 'cnki';
    if (h.indexOf('wanfangdata.com.cn') !== -1) return 'wanfang';
    if (h.indexOf('cqvip.com') !== -1) return 'cqvip';
    if (h.indexOf('pishu.com.cn') !== -1) return 'pishu';
    if (h.indexOf('yiigle.com') !== -1) return 'yiigle';
    if (h.indexOf('bookan.com.cn') !== -1) return 'bookan';
    return null;
  }

  // 外链协议白名单：仅允许 http/https
  function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  // DOI 提取：标准 DOI 串（10.xxxx/xxx）
  var DOI_RE = /\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/;
  function extractDoi(text) {
    if (typeof text !== 'string') return null;
    var m = text.match(DOI_RE);
    return m ? m[0] : null;
  }

  // 解析源 URL 拼接：优先 DOI；其次标题；退化为原页 URL（纯字符串拼接）
  function buildResolverUrl(base, paper) {
    if (!isSafeUrl(base)) return null;
    var b = base.replace(/\/+$/, '');
    var p = paper || {};
    var target = p.doi;
    if (!target && p.title) target = encodeURIComponent(p.title);
    if (!target && p.url) target = p.url;
    if (!target) return null;
    if (p.doi) return b + '/' + p.doi;
    return b + '/' + target;
  }

  // 生成候选解析源列表：auto 时遍历所有镜像，否则只保留用户指定镜像
  function buildSources(paper, prefer) {
    var list = [];
    var push = function (base) {
      var u = buildResolverUrl(base, paper);
      if (u) list.push({ id: base, name: base, url: u });
    };
    if (isSafeUrl(prefer)) {
      push(prefer);
    } else {
      for (var i = 0; i < SCIHUB_MIRRORS.length; i++) push(SCIHUB_MIRRORS[i]);
    }
    return list;
  }

  // 知网下载按钮 href 里的 order?id=xxx（页面客观事实）
  function parseCnkiOrderId(href) {
    if (typeof href !== 'string') return null;
    var m = href.match(/order\?id=([^&]+)/i);
    return m ? m[1] : null;
  }

  // 知网免费按钮 onclick showdown('id','info')（页面客观事实）
  function parseCnkiShowdown(onclick) {
    if (typeof onclick !== 'string') return null;
    var m = onclick.match(/showdown\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/i);
    if (m) return { id: m[1], info: m[2] };
    return null;
  }

  // 皮书数据库正文里的 download?ID=xxx&siteid=xxx（页面客观事实）
  function parsePishuDownload(html) {
    if (typeof html !== 'string') return null;
    var m = html.match(/download\?ID=([^&"]*)&siteid=([^&"]*)/i);
    if (m) return { contentId: m[1], siteId: m[2] };
    return null;
  }

  // 解析失败特征 -> 友好文案（无命中返回 null）
  function classifyError(text) {
    var s = String(text || '');
    if (/article[^<]{0,20}not\s*found|\u043d\u0435\s*\u043d\u0430\u0439\u0434\u0435\u043d\u0430/i.test(s)) return '解析源未收录该文献';
    if (/captcha|\u621b\u9a8c\u7801|Access\s*Denied|429|Too Many Requests/i.test(s)) return '解析源触发人机验证，请稍后重试或切换解析源';
    if (/timeout|timed out|\u8fde\u63a5\u8d85\u65f6/i.test(s)) return '解析源连接超时，请重试';
    return null;
  }

  // 文件名净化（去掉路径/非法字符）
  function sanitizeFilename(name) {
    var s = String(name || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return s || '论文';
  }

  // 计数归一化（>=0 整数）
  function normalizeCount(n) {
    var v = Number(n);
    return (isFinite(v) && v >= 0) ? Math.floor(v) : 0;
  }

  // 今日日期键 YYYY-MM-DD
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // 默认设置
  var DEFAULT_SETTINGS = {
    resolverMode: 'auto', // 'auto' 逐镜像自动切换 | 指定镜像 base
    format: 'pdf',        // 下载格式偏好：'pdf' | 'caj'（仅提示，格式由解析源决定）
    dailyThreshold: 10    // 每日用量提醒阈值（次/站点）
  };

  function mergeObj(base, patch) {
    var o = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) o[k] = base[k];
    if (patch && typeof patch === 'object') {
      for (k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) o[k] = patch[k];
    }
    return o;
  }

  function normalizeSettings(raw) {
    var m = mergeObj(DEFAULT_SETTINGS, raw && typeof raw === 'object' ? raw : {});
    m.resolverMode = (m.resolverMode === 'auto' || isSafeUrl(m.resolverMode)) ? m.resolverMode : 'auto';
    m.format = (m.format === 'caj') ? 'caj' : 'pdf';
    m.dailyThreshold = normalizeCount(m.dailyThreshold) || DEFAULT_SETTINGS.dailyThreshold;
    return m;
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  // ---- 页面事实（照抄核对，非实现） ---------------------------------
  // 各站点提取论文元数据用到的 DOM 选择器/参数，逐字来自原脚本的页面适配逻辑：
  //   - 知网（kns.cnki.net）：.btn-dlpdf > a / .btn-dlcaj > a 的 href 含 order?id=…；
  //     #param-filename、#param-dbname；.icon-free 的父级 <a> onclick 为 showdown('id','info')；标题取 <title>
  //   - 万方（d.wanfangdata.com.cn）：.download 的 href；标题取 .detailTitleCN span
  //   - 维普（lib.cqvip.com）：标题取 <title>
  //   - 皮书（www.pishu.com.cn）：正文 html 里 download?ID=…&siteid=…&Type=；标题取 .title
  //   - 中华医学会（rs.yiigle.com）：meta[name="eprints.eprintid"] 的 content
  //   - 博看（new.bookan.com.cn）：URL 参数 id / type；标题取 #infoWrap > h2
  var CNKI_SELECTORS = { pdf: '.btn-dlpdf > a', caj: '.btn-dlcaj > a' };

  var TASK_ID = 'scriptcat-1397-1';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/scriptcat-1397-1/panel.html';
  var LS_SETTINGS = 'xload-paper-settings';
  var LS_USAGE = 'xload-paper-usage';
  var LS_HISTORY = 'xload-paper-history';
  var LOG_KEY = 'xload-' + TASK_ID + '-logs';

  // ---- 日志系统 -----------------------------------------------------
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
  function getUrlParam(name) {
    try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
  }

  // ---- 面板通信（与 panel.js 的 PanelChannel 协议一致）---------------
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
        // 优先经 panelWin（window.open 直接引用）回包：油猴沙箱中 event.source 可能为 null，不能只靠它。
        // 若面板由 window.open 打开，panelWin 回包能命中面板的 window 'message' 监听。
        log('channel.reply.send', { type: m.type, hasPanelWin: !!panelWin, hasSource: !!msg._source, hasBc: !!bc });
        if (panelWin) { try { panelWin.postMessage(m, '*'); } catch (e) { /* ignore */ } }
        if (msg._source && msg._source !== panelWin) { try { msg._source.postMessage(m, '*'); } catch (e) { /* ignore */ } }
        if (bc) { try { bc.postMessage(m); } catch (e) { /* ignore */ } }
      },
      on: function (type, h) { (handlers[type] = handlers[type] || []).push(h); },
      setPanelWin: function (w) { panelWin = w; },
      getPanelWin: function () { return panelWin; }
    };
  }

  var channel = createChannel(TASK_ID);

  // ---- GM 存储封装（跨站点共享；隐私模式异常不中断）-----------------
  function gmGet(key, def) {
    try {
      var v = (typeof GM_getValue === 'function') ? GM_getValue(key, def) : null;
      return (v == null || v === undefined) ? def : v;
    } catch (e) { return def; }
  }
  function gmSet(key, val) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, val); } catch (e) { /* ignore */ }
  }

  var settings = normalizeSettings(gmGet(LS_SETTINGS, {}));
  function persistSettings(next) {
    settings = normalizeSettings(next);
    gmSet(LS_SETTINGS, settings);
    return settings;
  }

  function loadUsage() { return gmGet(LS_USAGE, {}) || {}; }
  function todayCount(site) {
    if (!site) return 0;
    var u = loadUsage();
    var day = u[todayKey()] || {};
    return normalizeCount(day[site]);
  }
  function bumpUsage(site) {
    if (!site) return 0;
    var u = loadUsage();
    var key = todayKey();
    if (!u[key] || typeof u[key] !== 'object') u[key] = {};
    u[key][site] = normalizeCount(u[key][site]) + 1;
    gmSet(LS_USAGE, u);
    return u[key][site];
  }
  function usageSummary() {
    var u = loadUsage();
    var day = u[todayKey()] || {};
    var out = {};
    var k;
    for (k in SITE_META) if (Object.prototype.hasOwnProperty.call(SITE_META, k)) out[k] = normalizeCount(day[k]);
    return out;
  }

  function loadHistory() { return gmGet(LS_HISTORY, []) || []; }
  function pushHistory(rec) {
    var h = loadHistory();
    h.unshift(rec);
    h = h.slice(0, 20);
    gmSet(LS_HISTORY, h);
    return h;
  }

  // ---- 论文元数据提取（站点适配器）----------------------------------
  function metaContent(names) {
    for (var i = 0; i < names.length; i++) {
      var m = document.querySelector('meta[name="' + names[i] + '"]');
      if (m && m.getAttribute('content')) return m.getAttribute('content').trim();
    }
    return '';
  }

  function extractPaperInfo() {
    var site = detectSite(window.location.host);
    var info = {
      site: site,
      title: (document.title || '').trim(),
      url: window.location.href,
      doi: extractDoi(metaContent(['citation_doi', 'dc.identifier.doi', 'dc.identifier', 'DC.identifier', 'DOI']) || window.location.href),
      ids: {}
    };
    if (!site) return info;

    try {
      if (site === 'cnki') {
        var a = $(CNKI_SELECTORS.pdf) || $(CNKI_SELECTORS.caj);
        var href = a ? (a.getAttribute('href') || '') : '';
        info.ids.orderid = parseCnkiOrderId(href) || '';
        var fn = $('#param-filename');
        var db = $('#param-dbname');
        info.ids.filename = fn ? (fn.value || '') : '';
        info.ids.dbname = db ? (db.value || '') : '';
        var iconFree = $('.icon-free');
        var parentA = iconFree ? iconFree.closest('a') : null;
        var sd = parseCnkiShowdown(parentA ? (parentA.getAttribute('onclick') || '') : '');
        if (sd) { info.ids.id = sd.id; info.ids.info = sd.info; }
      } else if (site === 'wanfang') {
        var dl = $('.download');
        info.ids.download = dl ? (dl.getAttribute('href') || '') : '';
        var tn = $('.detailTitleCN span');
        if (tn) info.title = tn.textContent.trim() || info.title;
      } else if (site === 'pishu') {
        var pd = parsePishuDownload(document.body ? document.body.innerHTML : '');
        if (pd) { info.ids.contentId = pd.contentId; info.ids.siteId = pd.siteId; }
        var pt = $('.title');
        if (pt) info.title = pt.textContent.trim() || info.title;
      } else if (site === 'cqvip') {
        info.title = (document.title || '').trim();
      } else if (site === 'yiigle') {
        info.ids.cmaid = metaContent(['eprints.eprintid']);
      } else if (site === 'bookan') {
        info.ids.issueIds = getUrlParam('id') || '';
        info.ids.bookanType = getUrlParam('type') || '';
        var bh = $('#infoWrap > h2');
        if (bh) info.title = bh.textContent.replace(/\s+/g, ' ').trim() || info.title;
      }
    } catch (e) {
      log('extract.error', { site: site, message: String(e && e.message || e) });
    }
    return info;
  }

  // ---- 解析引擎（多源智能切换）---------------------------------------
  function gmGet(url) {
    return new Promise(function (resolve, reject) {
      if (!isSafeUrl(url)) { reject(new Error('不允许的 URL')); return; }
      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          timeout: 12000,
          responseType: 'text',
          onload: function (res) { resolve(res); },
          onerror: function () { reject(new Error('network')); },
          ontimeout: function () { reject(new Error('timeout')); }
        });
      } catch (e) { reject(e); }
    });
  }

  function probeSource(url) {
    return gmGet(url).then(function (res) {
      var text = typeof res.responseText === 'string' ? res.responseText
        : (res.response || res.responseText || '');
      var reason = classifyError(text);
      if (reason === '解析源未收录该文献') return { ok: false, reason: 'notfound' };
      if (!text || text.length < 200) return { ok: false, reason: 'empty' };

      // 提取直接下载链接（sci-hub 落地页常见 .pdf 或 /downloads|/tree 路径）
      var dl = null;
      var m1 = text.match(/(?:href|src)\s*=\s*["']([^"']+\.pdf[^"']*)["']/i);
      if (m1) {
        var cand = m1[1];
        dl = isSafeUrl(cand) ? cand : (url.replace(/\/[^/]*$/, '') + (cand.charAt(0) === '/' ? '' : '/') + cand);
      } else {
        var m2 = text.match(/(?:href|src)\s*=\s*["'](\/(?:downloads|tree)\/[^"']+)["']/i);
        if (m2) {
          var base = url.replace(/\/[^/]*$/, '');
          dl = base.replace(/\/+$/, '') + m2[1];
        }
      }
      return { ok: true, landingUrl: res.finalUrl || url, downloadUrl: isSafeUrl(dl) ? dl : null };
    }).catch(function () { return { ok: false, reason: 'network' }; });
  }

  function resolvePaper(paper, prefer, onProgress) {
    var sources = buildSources(paper || extractPaperInfo(), prefer);
    function step(i) {
      if (i >= sources.length) {
        return Promise.reject(new Error('所有解析源均不可用，请稍后重试或手动切换解析源'));
      }
      var src = sources[i];
      log('resolve.try', { i: i + 1, total: sources.length, source: src.name });
      if (onProgress) onProgress({ stage: 'check', now: i + 1, total: sources.length, source: src.name });
      return probeSource(src.url).then(function (r) {
        if (r.ok) {
          log('resolve.found', { source: src.name, downloadUrl: r.downloadUrl });
          if (onProgress) onProgress({ stage: 'found', source: src.name });
          return { source: src, landingUrl: r.landingUrl, downloadUrl: r.downloadUrl };
        }
        log('resolve.skip', { source: src.name, reason: r.reason });
        return step(i + 1);
      });
    }
    return step(0);
  }

  function doDownload(resolved, paper, site) {
    var r = resolved || {};
    var filename = sanitizeFilename(paper && paper.title) + '.pdf';
    if (r.downloadUrl && isSafeUrl(r.downloadUrl)) {
      return new Promise(function (resolve, reject) {
        try {
          GM_download({
            url: r.downloadUrl,
            name: filename,
            saveAs: true,
            onload: function () { resolve({ ok: true, via: 'download', name: filename }); },
            onerror: function () { reject(new Error('下载失败')); }
          });
        } catch (e) { reject(e); }
      });
    }
    if (r.landingUrl && isSafeUrl(r.landingUrl)) {
      try { window.open(r.landingUrl, '_blank'); } catch (e) { /* ignore */ }
      return Promise.resolve({ ok: true, via: 'landing', url: r.landingUrl });
    }
    return Promise.reject(new Error('未获得可用下载链接，请重新解析'));
  }

  // ---- 面板命令处理 -------------------------------------------------
  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });

      if (action === 'getState') {
        var paper0 = extractPaperInfo();
        channel.reply(msg, {
          ok: true,
          paper: paper0,
          site: detectSite(window.location.host),
          settings: settings,
          usage: usageSummary(),
          history: loadHistory()
        });
        return;
      }
      if (action === 'resolve') {
        var paper = extractPaperInfo();
        var prefer = (data && data.source) ? data.source : (settings.resolverMode === 'auto' ? null : settings.resolverMode);
        channel.send('progress', { stage: 'start', source: prefer || 'auto' });
        resolvePaper(paper, prefer, function (p) { channel.send('progress', p); })
          .then(function (r) {
            channel.send('done', { source: r.source.name, landingUrl: r.landingUrl, downloadUrl: r.downloadUrl });
            channel.reply(msg, { ok: true, resolved: r, paper: paper });
          })
          .catch(function (e) {
            channel.send('error', { message: String(e && e.message || e) });
            channel.reply(msg, { ok: false, error: String(e && e.message || e) });
          });
        return;
      }
      if (action === 'download') {
        var paper1 = extractPaperInfo();
        var site1 = detectSite(window.location.host);
        var resolved1 = (data && data.resolved) || {};
        doDownload(resolved1, paper1, site1).then(function (r) {
          log('download.done', r);
          if (site1) {
            var cnt = bumpUsage(site1);
            if (cnt >= settings.dailyThreshold) {
              log('usage.threshold', { site: site1, count: cnt, threshold: settings.dailyThreshold });
            }
          }
          pushHistory({
            title: paper1.title || '未命名文献',
            site: site1,
            time: new Date().toISOString(),
            status: 'ok',
            url: r.url || r.name || ''
          });
          channel.send('progress', { stage: 'downloaded' });
          channel.reply(msg, { ok: true, r: r });
        }).catch(function (e) {
          log('download.error', { message: String(e && e.message || e) });
          channel.send('error', { message: String(e && e.message || e) });
          channel.reply(msg, { ok: false, error: String(e && e.message || e) });
        });
        return;
      }
      if (action === 'applySettings') {
        persistSettings(data.settings || {});
        channel.reply(msg, { ok: true, settings: settings });
        return;
      }
      if (action === 'resetSettings') {
        persistSettings(DEFAULT_SETTINGS);
        channel.reply(msg, { ok: true, settings: settings });
        return;
      }
      if (action === 'clearHistory') {
        gmSet(LS_HISTORY, []);
        channel.reply(msg, { ok: true });
        return;
      }
      if (action === 'getLogs') {
        channel.reply(msg, { ok: true, text: logText() });
        return;
      }
      channel.reply(msg, { ok: false, error: '未知命令: ' + action });
    });
  }

  // ---- 面板入口（独立页弹窗，单例复用）--------------------------------
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
    } catch (e) { log('panel.open.error', { message: String(e && e.message || e) }); return false; }
  }

// =====================================================================
// xload 聚合按钮组（FAB）共享模板 —— 经过验证的通用实现（v2 视觉升级）
// ---------------------------------------------------------------------
// 特性：
//   1) 多按钮平铺显示，不折叠（即使页面只有 1 个 xload 脚本也用此协议）；
//   2) 整组可拖拽（拖手柄或组内空白处起拖；item 按钮点击与拖拽分离）；
//   3) 位置记忆：拖拽后保存，刷新/重开页面恢复；
//   4) 防出屏：拖拽时 clamp 到视口内；
//   5) 屏幕切换/窗口 resize/缩放：自动重新 clamp，按钮不会跑出屏幕外。
// 视觉：玻璃拟态卡片（毛玻璃 + 细边框 + 柔和阴影）、品牌渐变手柄、白卡片 item、
//       hover 动效、自动适配暗色模式（prefers-color-scheme: dark）。
// 使用方式：把本块复制到 <task_id>.user.js，然后在启动处调用：
//   var fab = xloadFab();
//   fab.addItem(TASK_ID, '按钮文案', function () { openPanel(); });
// 说明：同一页面多个 xload 脚本共用同一个 #xload-fab-root，重复调用幂等；
//   拖拽绑定与样式注入只做一次；位置经 localStorage（页面上下文）/ GM 值（沙箱）持久化。
// 本文件为模板，非成品脚本，不参与 check-output。
// =====================================================================

function xloadFab() {
  var POS_KEY = 'xload-fab-pos';
  var DRAG_THRESHOLD = 4;

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
    // 兼容旧协议：旧容器可能是「toggle+折叠list」结构，这里强制 list 平铺
    var oldList = root.querySelector('[data-xload-fab-list]');
    if (oldList) { oldList.style.display = 'flex'; }
  } else {
    root = document.createElement('div');
    root.id = 'xload-fab-root';
    root.setAttribute('data-xload-fab-root', 'true');
    document.body.appendChild(root);
  }

  // ---------- 样式注入（幂等，scoped 到 #xload-fab-root，不污染页面） ----------
  if (!root.querySelector('style[data-xload-fab-style]')) {
    var st = document.createElement('style');
    st.setAttribute('data-xload-fab-style', '');
    st.textContent =
      '#xload-fab-root{' +
        'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
        'display:flex;flex-direction:column;align-items:stretch;gap:8px;' +
        'min-width:150px;max-width:230px;padding:8px;box-sizing:border-box;' +
        'background:rgba(255,255,255,.82);' +
        '-webkit-backdrop-filter:blur(12px) saturate(160%);backdrop-filter:blur(12px) saturate(160%);' +
        'border:1px solid rgba(148,163,184,.30);border-radius:14px;' +
        'box-shadow:0 10px 30px rgba(15,23,42,.14),0 2px 8px rgba(15,23,42,.08);' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;' +
        'user-select:none;-webkit-user-select:none;touch-action:none;' +
      '}' +
      '#xload-fab-root button{font-family:inherit;}' +
      '#xload-fab-root [data-xload-fab-toggle]{' +
        'display:flex;align-items:center;justify-content:center;gap:8px;' +
        'padding:9px 12px;border:0;border-radius:10px;cursor:grab;' +
        'background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;' +
        'font-size:13px;font-weight:700;letter-spacing:.3px;line-height:1;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 3px 8px rgba(29,78,216,.32);' +
        'transition:filter .15s ease,box-shadow .15s ease,transform .15s ease;' +
      '}' +
      '#xload-fab-root [data-xload-fab-toggle]:hover{' +
        'filter:brightness(1.06);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 4px 12px rgba(29,78,216,.40);' +
        'transform:translateY(-1px);' +
      '}' +
      '#xload-fab-root [data-xload-fab-toggle]:active{transform:translateY(0);}' +
      '#xload-fab-root .xf-brand{' +
        'display:inline-flex;align-items:center;justify-content:center;flex:none;' +
        'width:19px;height:19px;border-radius:6px;background:rgba(255,255,255,.18);' +
        'font-size:9px;font-weight:800;letter-spacing:0;' +
      '}' +
      '#xload-fab-root .xf-dots{display:inline-flex;flex-direction:column;gap:2px;flex:none;}' +
      '#xload-fab-root .xf-dots i{display:block;width:13px;height:1.5px;border-radius:1px;background:currentColor;opacity:.9;}' +
      '#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;gap:6px;}' +
      '#xload-fab-root [data-xload-fab-item]{' +
        'display:flex;align-items:center;gap:8px;width:100%;' +
        'padding:8px 11px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#0f172a;' +
        'font-size:13px;font-weight:500;line-height:1;text-align:left;cursor:pointer;' +
        'box-shadow:0 1px 2px rgba(15,23,42,.05);' +
        'transition:border-color .15s ease,background .15s ease,color .15s ease,transform .15s ease,box-shadow .15s ease;' +
      '}' +
      '#xload-fab-root [data-xload-fab-item]:hover{' +
        'border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8;' +
        'transform:translateX(-2px);box-shadow:0 2px 6px rgba(37,99,235,.18);' +
      '}' +
      '#xload-fab-root [data-xload-fab-item]:active{transform:translateX(-2px) scale(.98);}' +
      '#xload-fab-root .xf-dot{' +
        'width:7px;height:7px;border-radius:50%;flex:none;' +
        'background:linear-gradient(135deg,#22c55e,#16a34a);' +
        'box-shadow:0 0 0 2px rgba(34,197,94,.18);' +
      '}' +
      '@media (prefers-color-scheme:dark){' +
        '#xload-fab-root{background:rgba(15,23,42,.74);border-color:rgba(148,163,184,.20);' +
          'box-shadow:0 10px 30px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.35);}' +
        '#xload-fab-root [data-xload-fab-item]{background:rgba(30,41,59,.85);color:#e2e8f0;border-color:rgba(148,163,184,.22);' +
          'box-shadow:0 1px 2px rgba(0,0,0,.3);}' +
        '#xload-fab-root [data-xload-fab-item]:hover{background:#1e3a8a;border-color:#3b82f6;color:#fff;' +
          'box-shadow:0 2px 8px rgba(59,130,246,.3);}' +
      '}';
    root.appendChild(st);
  }

  var handle = root.querySelector('[data-xload-fab-toggle]');
  if (!handle) {
    handle = document.createElement('button');
    handle.type = 'button';
    handle.setAttribute('data-xload-fab-toggle', 'true');
    handle.setAttribute('aria-label', 'xload 工具');
    handle.innerHTML =
      '<span class="xf-brand">x</span>' +
      '<span class="xf-dots"><i></i><i></i><i></i></span>' +
      '<span>xload 工具</span>';
    root.insertBefore(handle, root.firstChild);
  }

  var list = root.querySelector('[data-xload-fab-list]');
  if (!list) {
    list = document.createElement('div');
    list.setAttribute('data-xload-fab-list', 'true');
    root.appendChild(list);
  }
  list.style.display = 'flex'; // 始终平铺，不折叠

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
      var p = storeGet(POS_KEY, null);
      if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        applyPos(p.x, p.y);
      }
    }

    var dragging = false;
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
      }
    }
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);

    // 屏幕切换 / 窗口 resize / 缩放：重新 clamp，避免按钮跑出屏幕看不见
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
    // 初始布局后立即 clamp 一次（图标/尺寸渲染完）
    setTimeout(onViewportChange, 200);
  }

  return {
    root: root,
    list: list,
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

  var FAB_LABEL = '免费下载';

  function mountFabItem() {
    var fab = xloadFab();
    fab.addItem(TASK_ID, FAB_LABEL, openPanel);
    log('fab.mount', { task: TASK_ID });
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
    // 宿主站点排除：xload 官网 / 本站不注入任何 UI 与监听
    var host = String(window.location.host || '').toLowerCase();
    if (host.indexOf('xload.net') !== -1 || host.indexOf('u2222223.github.io') !== -1) {
      return;
    }
    log('init.start', { ua: navigator.userAgent.slice(0, 80), host: host, readyState: document.readyState });

    registerChannelHandlers();

    var site = detectSite(host);
    if (site) {
      log('init.site', { site: site, title: document.title });
    }

    whenReady(function () {
      try {
        mountFabItem();
        log('init.fab.ok', { site: site });
      } catch (e) { log('init.fab.error', { message: String(e && e.message || e) }); }
    });
    log('init.done', { site: site });
  }

  whenReady(init);
})();