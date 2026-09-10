// ==UserScript==
// @name         微软积分商城自动签到
// @namespace    https://github.com/u2222223/xload
// @version      2026.9.10.1
// @description  自动完成 Microsoft Rewards 每日任务获取积分奖励：PC 搜索、移动端搜索、每日活动、阅读文章、签入
// @author       xload
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_cookie
// @grant        GM_info
// @connect      *
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ===================================================================
  // CORE-START —— 核心纯函数（无 DOM / 无副作用 / 无 GM 依赖，可独立单测）
  // ===================================================================

  // ---- 站点客观事实（端点 / 客户端参数 / UA / 任务类型，逐字照抄核对，见 REF 声明）----
  var MR_FACTS = {
    clientId: '0000000040170455',
    scope: 'service::prod.rewardsplatform.microsoft.com::MBI_SSL',
    redirectUri: 'https://login.live.com/oauth20_desktop.srf',
    authorizeUrl: 'https://login.live.com/oauth20_authorize.srf',
    tokenUrl: 'https://login.live.com/oauth20_token.srf',
    rewardsInfoUrl: 'https://rewards.bing.com/api/getuserinfo?type=1&X-Requested-With=XMLHttpRequest',
    rewardsHome: 'https://rewards.bing.com/',
    reportActivityUrl: 'https://rewards.bing.com/api/reportactivity?X-Requested-With=XMLHttpRequest',
    dapiMeUrl: 'https://prod.rewardsplatform.microsoft.com/dapi/me',
    dapiActivitiesUrl: 'https://prod.rewardsplatform.microsoft.com/dapi/me/activities',
    appId: 'SAAndroid/31.4.2110003555',
    readOfferId: 'ENUS_readarticle3_30points',
    ua: {
      pc: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.81',
      mobile: 'Mozilla/5.0 (Linux; Android 16; MCE16 Build/BP3A.250905.014; ) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36 EdgA/123.0.2420.102'
    },
    // 任务活动类型：103 签入；101 阅读文章
    activityType: { sign: 103, read: 101 },
    // 搜索前需要删除的 bing 会话 cookie（客观事实）
    searchClearCookies: ['_EDGE_S', '_Rwho', '_RwBf']
  };

  // 内置随机搜索词库（自建，非原文；离线模式）
  var OFF_WORDS = [
    '天气预报', '今日新闻', '热点资讯', '电影推荐', '美食做法', '旅游攻略', '健身方法',
    '学习方法', '股票行情', '数码评测', '汽车资讯', '历史故事', '科技动态', '健康养生',
    '足球比赛', '篮球赛事', '编程教程', '英语学习', '摄影技巧', '音乐推荐', '财经新闻',
    '体育新闻', '娱乐八卦', '家居装修', '育儿知识', '理财技巧', '职场经验', '宠物饲养',
    '游戏攻略', '动漫推荐', '经典电影', '世界名著', '科学常识', '地理知识', '天文现象'
  ];

  // ---- 通用工具（纯函数）----
  function mrIsSafeUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\//i.test(url.trim());
  }

  function mrIsJson(s) {
    if (typeof s !== 'string') return false;
    try {
      var j = JSON.parse(s);
      return Array.isArray(j) || (typeof j === 'object' && j !== null);
    } catch (e) { return false; }
  }

  function mrRand(n) {
    return Math.floor(Math.random() * n);
  }

  function mrRandScope(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function mrShuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = mrRand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function mrUuid() {
    try {
      var raw = (window && window.crypto && typeof window.crypto.randomUUID === 'function')
        ? window.crypto.randomUUID()
        : '';
      if (raw) return raw;
    } catch (e) { /* ignore */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function mrRandWord() {
    return OFF_WORDS[mrRand(OFF_WORDS.length)];
  }

  function mrRandSubstring(str, min, max) {
    if (typeof str !== 'string') return str;
    if (str.length <= min) return str;
    var n = mrRandScope(min, Math.min(max, str.length));
    return str.substring(0, n);
  }

  function mrBuildQueryWord() {
    return mrRandSubstring(mrRandWord(), 2, 8);
  }

  // ---- 日期（纯函数）----
  function mrTodayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function mrDateHyphen() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function mrDateSlash() {
    var d = new Date();
    return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + '/' + d.getFullYear();
  }

  // ---- OAuth URL 组装（纯字符串拼接，客观事实）----
  function mrBuildAuthorizeUrl() {
    return MR_FACTS.authorizeUrl +
      '?client_id=' + MR_FACTS.clientId +
      '&scope=' + encodeURIComponent(MR_FACTS.scope) +
      '&response_type=code' +
      '&redirect_uri=' + encodeURIComponent(MR_FACTS.redirectUri);
  }

  function mrBuildTokenUrl(grant) {
    // grant: { refresh_token } 或 { code }
    var base = MR_FACTS.tokenUrl +
      '?client_id=' + MR_FACTS.clientId +
      '&scope=' + encodeURIComponent(MR_FACTS.scope);
    if (grant && grant.code) {
      return base + '&code=' + encodeURIComponent(grant.code) +
        '&redirect_uri=' + encodeURIComponent(MR_FACTS.redirectUri) +
        '&grant_type=authorization_code';
    }
    if (grant && grant.refresh_token) {
      return base + '&refresh_token=' + encodeURIComponent(grant.refresh_token) +
        '&grant_type=REFRESH_TOKEN';
    }
    return null;
  }

  // ---- 授权码提取（客观事实：code 形如 M. 开头的串）----
  var AUTH_CODE_RE = /M\.[\w+.]+(-\w+){4}/;
  function mrExtractAuthCode(text) {
    if (typeof text !== 'string') return null;
    var m = text.match(AUTH_CODE_RE);
    return m ? m[0] : null;
  }

  // ---- token 响应解析（客观事实字段：refresh_token / access_token）----
  function mrParseToken(text) {
    if (!mrIsJson(text)) return null;
    var res = JSON.parse(text);
    if (res.refresh_token && res.access_token) {
      return { refresh: res.refresh_token, access: res.access_token };
    }
    return null;
  }

  // ---- Rewards Dashboard 计数解析（客观事实字段）----
  function mrParseCounters(dashboard) {
    if (!dashboard || !dashboard.userStatus) return null;
    var counters = dashboard.userStatus.counters || {};
    var out = {
      dailyPoint: 0,
      pc: { progress: 0, max: 0 },
      mobile: { progress: 0, max: 0 }
    };
    if (counters.dailyPoint && counters.dailyPoint.length) {
      out.dailyPoint = Number(counters.dailyPoint[0].pointProgress) || 0;
    }
    if (counters.pcSearch && counters.pcSearch.length) {
      out.pc.progress = Number(counters.pcSearch[0].pointProgress) || 0;
      out.pc.max = Number(counters.pcSearch[0].pointProgressMax) || 0;
    }
    if (counters.mobileSearch && counters.mobileSearch.length) {
      out.mobile.progress = Number(counters.mobileSearch[0].pointProgress) || 0;
      out.mobile.max = Number(counters.mobileSearch[0].pointProgressMax) || 0;
    }
    return out;
  }

  // ---- 阅读任务进度解析（客观事实：promotions 内 offerid）----
  function mrParseReadProgress(promotions) {
    var out = { max: 1, progress: 0 };
    if (!Array.isArray(promotions)) return out;
    for (var i = 0; i < promotions.length; i++) {
      var o = promotions[i];
      var attrs = o && o.attributes;
      if (attrs && attrs.offerid === MR_FACTS.readOfferId) {
        out.max = Number(attrs.max) || 1;
        out.progress = Number(attrs.progress) || 0;
        break;
      }
    }
    return out;
  }

  // ---- 活动任务收集（客观事实字段）----
  function mrCollectPromos(dashboard, slashDate) {
    var list = [];
    if (!dashboard) return list;
    var dailySet = dashboard.dailySetPromotions || {};
    var daily = dailySet[slashDate];
    var more = dashboard.morePromotions;
    daily = Array.isArray(daily) ? daily : [];
    more = Array.isArray(more) ? more : [];
    var merged = daily.concat(more);
    for (var i = 0; i < merged.length; i++) {
      var item = merged[i];
      if (!item) continue;
      if (item.complete === false &&
          item.priority > -2 &&
          item.exclusiveLockedFeatureStatus !== 'locked') {
        list.push({ id: item.offerId, hash: item.hash, url: item.destinationUrl });
      }
    }
    return list;
  }

  // ---- 搜索页 HTML 解析（客观事实 regex：IG / b_algo 结果）----
  function mrExtractSearchGuid(html) {
    if (typeof html !== 'string') return null;
    var m = html.match(/,IG:"(.*?)",/);
    return m ? m[1] : null;
  }

  function mrExtractSearchResult(html) {
    if (typeof html !== 'string') return null;
    var m = html.match(/class="b_algo(.*?)href="(.*?)"h="ID=(.*?)">(.*?)<\/h2/);
    if (m) return { href: m[2], id: m[3], title: m[4] };
    return null;
  }

  // ---- RequestVerificationToken 提取（客观事实 regex）----
  function mrExtractRvt(html) {
    if (typeof html !== 'string') return null;
    var m = html.match(/RequestVerificationToken(.*?)value="(.*?)"/);
    return m ? m[2] : null;
  }

  // ---- 搜索 URL / 报告 URL 组装（纯字符串拼接）----
  function mrBuildSearchParams(keyword, mkt) {
    return 'q=' + encodeURIComponent(keyword) + '&form=QBLH' + (mkt || '');
  }

  function mrBuildSearchUrl(host, keyword, mkt) {
    return 'https://' + host + '/search?' + mrBuildSearchParams(keyword, mkt);
  }

  // ---- 主页区域识别（客观事实 regex：Region / RevIpCC）----
  function mrExtractRegion(html) {
    if (typeof html !== 'string') return null;
    var m = html.match(/Region:"(.*?)"(.*?)RevIpCC:"(.*?)"/);
    if (m) return { region: m[1], ipcc: (m[3] || '').toUpperCase() };
    return null;
  }

  // ---- 风控等级 → 延迟区间（纯函数）----
  function mrRiskDelays(level) {
    var map = {
      loose: { min: 8000, max: 20000 },
      standard: { min: 15000, max: 45000 },
      strict: { min: 30000, max: 90000 }
    };
    return map[level] || map.standard;
  }

  // ---- 设置合并 / 归一化（纯函数）----
  var DEFAULT_SETTINGS = {
    searchEnabled: true,
    signEnabled: true,
    readEnabled: true,
    promosEnabled: true,
    pcSearchCount: 30,
    mobileSearchCount: 20,
    searchLimit: 60,
    intervalMin: 15000,
    intervalMax: 45000,
    riskLevel: 'standard',
    notify: true,
    autoRun: true,
    autoDelayMin: 30,
    autoDelayMax: 90,
    lockCN: false,
    region: 'CN',
    authCode: '',
    pcUA: MR_FACTS.ua.pc,
    mobileUA: MR_FACTS.ua.mobile
  };

  function mrMergeSettings(base, patch) {
    var o = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) o[k] = base[k];
    if (patch && typeof patch === 'object') {
      for (k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) o[k] = patch[k];
    }
    return o;
  }

  function mrToInt(v, def) {
    var n = parseInt(v, 10);
    return isFinite(n) ? n : def;
  }

  function mrNormalizeSettings(raw) {
    var s = mrMergeSettings(DEFAULT_SETTINGS, raw && typeof raw === 'object' ? raw : {});
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
      if (typeof DEFAULT_SETTINGS[k] === 'boolean') s[k] = !!s[k];
    });
    s.pcSearchCount = Math.max(1, mrToInt(s.pcSearchCount, 30));
    s.mobileSearchCount = Math.max(1, mrToInt(s.mobileSearchCount, 20));
    s.searchLimit = Math.max(1, mrToInt(s.searchLimit, 60));
    s.intervalMin = Math.max(1000, mrToInt(s.intervalMin, 15000));
    s.intervalMax = Math.max(s.intervalMin, mrToInt(s.intervalMax, 45000));
    s.riskLevel = (['loose', 'standard', 'strict'].indexOf(s.riskLevel) !== -1) ? s.riskLevel : 'standard';
    s.region = (s.region && /^[a-zA-Z]{2}$/.test(String(s.region))) ? String(s.region).toUpperCase() : 'CN';
    if (typeof s.pcUA !== 'string' || !s.pcUA) s.pcUA = MR_FACTS.ua.pc;
    if (typeof s.mobileUA !== 'string' || !s.mobileUA) s.mobileUA = MR_FACTS.ua.mobile;
    if (typeof s.authCode !== 'string') s.authCode = '';
    return s;
  }

  // ===================================================================
  // CORE-END
  // ===================================================================

  // ---- 常量 / 键名 ------------------------------------------------
  var TASK_ID = 'scriptcat-1703-1';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/scriptcat-1703-1/panel.html';
  var KS = {
    SETTINGS: 'xload-mr-settings',
    TOKEN: 'xload-mr-token',
    STATE: 'xload-mr-state',
    HISTORY: 'xload-mr-history'
  };
  var LOG_KEY = 'xload-' + TASK_ID + '-logs';
  var FAB_LABEL = '微软积分签到';

  // ---- 日志系统 ---------------------------------------------------
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

  // ---- GM 存储封装（跨站点共享；异常不中断）-----------------------
  function gmGet(key, def) {
    try {
      var v = (typeof GM_getValue === 'function') ? GM_getValue(key, null) : null;
      return (v == null || v === undefined) ? def : v;
    } catch (e) { return def; }
  }
  function gmSet(key, val) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, val); } catch (e) { /* ignore */ }
  }

  var settings = mrNormalizeSettings(gmGet(KS.SETTINGS, null));
  function persistSettings(next) {
    settings = mrNormalizeSettings(next);
    gmSet(KS.SETTINGS, settings);
    return settings;
  }

  function getRefreshToken() { return gmGet(KS.TOKEN, null); }
  function setRefreshToken(t) { gmSet(KS.TOKEN, t); }

  function loadState() { return gmGet(KS.STATE, {}) || {}; }
  function saveState(s) { gmSet(KS.STATE, s); }

  function loadHistory() { return gmGet(KS.HISTORY, []) || []; }
  function pushHistory(rec) {
    var h = loadHistory().slice(0, 200);
    h.unshift(rec);
    gmSet(KS.HISTORY, h);
    return h;
  }

  // ---- 面板通信（共享模板 createChannel，勿重写）-------------------
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

  // ---- 网络层（GM_xmlhttpRequest 包装；命名 httpRequest 避免与 gmGet 重名）----
  function httpRequest(opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!mrIsSafeUrl(opts.url)) { reject(new Error('不允许的 URL')); return; }
      try {
        GM_xmlhttpRequest({
          method: (opts.method || 'GET').toUpperCase(),
          url: opts.url,
          headers: opts.headers || {},
          data: opts.data,
          timeout: opts.timeout || 15000,
          redirect: opts.redirect || 'follow',
          onload: function (xhr) {
            var status = Number(xhr.status) || 0;
            if (status >= 200 && status < 300) {
              resolve({ status: status, text: xhr.responseText || '', finalUrl: xhr.finalUrl || opts.url });
            } else if ([301, 302, 303, 307, 308].indexOf(status) !== -1) {
              var loc = null;
              try {
                var m = (xhr.responseHeaders || '').match(/location:\s*(.*?)\r?\n/i);
                loc = m ? m[1] : null;
              } catch (e) { /* ignore */ }
              resolve({ status: status, text: xhr.responseText || '', finalUrl: xhr.finalUrl || opts.url, redirect: loc });
            } else {
              reject(new Error('HTTP ' + status));
            }
          },
          onerror: function () { reject(new Error('请求异常')); },
          ontimeout: function () { reject(new Error('请求超时')); }
        });
      } catch (e) { reject(e); }
    });
  }

  // ---- cookie 辅助（best-effort，失败不中断）-----------------------
  function gmCookie(action, details) {
    return new Promise(function (resolve) {
      try {
        if (typeof GM_cookie !== 'function') { resolve(null); return; }
        var called = false;
        var cb = function (res) { if (!called) { called = true; resolve(res); } };
        var r;
        try {
          if (action === 'list') r = GM_cookie('list', details, cb);
          else r = GM_cookie(action, details, cb);
        } catch (e) { r = null; }
        if (r && typeof r.then === 'function') {
          r.then(function (res) { if (!called) { called = true; resolve(res); } })
           .catch(function () { if (!called) { called = true; resolve(null); } });
        } else {
          setTimeout(function () { if (!called) { called = true; resolve(null); } }, 800);
        }
      } catch (e) { resolve(null); }
    });
  }

  function gmCookieList(url) {
    return gmCookie('list', { url: url }).then(function (res) {
      var list = (res && res.length) ? res : (res && Array.isArray(res) ? res : []);
      if (!Array.isArray(list)) list = [];
      return list;
    });
  }

  function gmCookieDelete(url, name) {
    return gmCookie('delete', { url: url, name: name });
  }

  function buildCookieHeader(cookies) {
    if (!Array.isArray(cookies) || !cookies.length) return '';
    return cookies.map(function (c) { return c.name + '=' + c.value; }).join('; ');
  }

  // ---- 通知 -------------------------------------------------------
  function notify(success, text) {
    if (!settings.notify) return;
    try {
      if (typeof GM_notification === 'function') {
        GM_notification({
          text: String(text || ''),
          title: '微软积分商城自动签到' + (success ? ' ' : '') + (success ? '完成' : '提示')
        });
      }
    } catch (e) { /* ignore */ }
  }

  // ---- 关键路径埋点（面板打开请求尺寸/坐标/返回值）-----------------
  function openPanel() {
    if (!mrIsSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
    restoreLogs();
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) {
      try { existing.focus(); } catch (e) { /* ignore */ }
      log('panel.reuse', {});
      return true;
    }
    log('panel.open', { url: PANEL_URL });
    try {
      var W = Math.min(920, Math.max(500, (window.screen.availWidth || 1280) - 100));
      var H = Math.min(840, Math.max(580, (window.screen.availHeight || 800) - 120));
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

  // ---- 认证（token 流，客观端点照抄）-------------------------------
  var Auth = {
    accessToken: null,

    hasToken: function () {
      return !!getRefreshToken();
    },

    _saveTokens: function (pair) {
      if (pair.refresh) setRefreshToken(pair.refresh);
      if (pair.access) this.accessToken = pair.access;
    },

    // 通过 login.live.com 授权 URL 自动提取 code（需要已登录 cookie，best-effort）
    _collectCode: function () {
      var self = this;
      var url = mrBuildAuthorizeUrl();
      return gmCookieList('https://login.live.com').then(function (cookies) {
        var cookieHeader = buildCookieHeader(cookies);
        var headers = { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' };
        if (cookieHeader) headers.cookie = cookieHeader;
        return httpRequest({ url: url, headers: headers, redirect: 'manual' });
      }).then(function (res) {
        var code = mrExtractAuthCode(res.text || '');
        if (!code && res.redirect) {
          code = mrExtractAuthCode(res.redirect);
        }
        if (!code && res.finalUrl) {
          code = mrExtractAuthCode(decodeURIComponent(res.finalUrl));
        }
        return code || null;
      }).catch(function (e) {
        log('auth.collectCode.error', { message: String(e && e.message || e) });
        return null;
      });
    },

    _exchange: function (grant) {
      var self = this;
      var url = mrBuildTokenUrl(grant);
      if (!url) return Promise.reject(new Error('无效的授权参数'));
      return httpRequest({ url: url, method: 'GET' }).then(function (res) {
        var pair = mrParseToken(res.text);
        if (!pair) throw new Error('token 解析失败');
        self._saveTokens(pair);
        return pair.access;
      });
    },

    ensureToken: function () {
      var self = this;
      if (self.accessToken) return Promise.resolve(self.accessToken);
      var refresh = getRefreshToken();
      if (refresh) {
        return self._exchange({ refresh_token: refresh }).catch(function (e) {
          log('auth.refresh.error', { message: String(e && e.message || e) });
          // 刷新失败：清掉失效 token，尝试 code 流程
          setRefreshToken(null);
          return self._ensureByCode();
        });
      }
      return self._ensureByCode();
    },

    _ensureByCode: function () {
      var self = this;
      var provided = settings.authCode ? mrExtractAuthCode(settings.authCode) : null;
      if (provided) {
        return self._exchange({ code: provided }).catch(function (e) {
          log('auth.code.error', { message: String(e && e.message || e) });
          throw new Error('授权码无效或已过期，请重新获取授权码后填写到面板');
        });
      }
      // 无码则尝试 cookie 自动授权
      return self._collectCode().then(function (code) {
        if (!code) throw new Error('未获取到授权：请在 rewards.bing.com 登录微软账号，或把授权码/链接填到面板');
        return self._exchange({ code: code });
      });
    }
  };

  // ---- 主机 / 区域解析 --------------------------------------------
  var Bing = {
    host: null,
    _resolveHost: function () {
      var self = this;
      if (self.host) return Promise.resolve(self.host);
      if (settings.lockCN) {
        self.host = 'cn.bing.com';
        return Promise.resolve(self.host);
      }
      return httpRequest({ url: 'https://www.bing.com/', redirect: 'manual' }).then(function (res) {
        try {
          self.host = (res.finalUrl && (new URL(res.finalUrl)).host) || 'www.bing.com';
        } catch (e) { self.host = 'www.bing.com'; }
        return self.host;
      }).catch(function () {
        self.host = 'www.bing.com';
        return self.host;
      });
    },

    checkRegion: function () {
      return httpRequest({ url: 'https://' + (this.host || 'www.bing.com') + '/', headers: {} })
        .then(function (res) {
          var info = mrExtractRegion((res.text || '').replace(/\s/g, ''));
          return info ? info.ipcc : null;
        })
        .catch(function () { return null; });
    }
  };

  // ---- 移动端 dapi 头（客观事实）----------------------------------
  function buildMobileHeaders(region) {
    return {
      'content-type': 'application/json; charset=UTF-8',
      'user-agent': settings.mobileUA,
      'authorization': 'Bearer ' + Auth.accessToken,
      'x-rewards-appid': MR_FACTS.appId,
      'x-rewards-ismobile': 'true',
      'x-rewards-country': region
    };
  }

  function regionLower() {
    return settings.lockCN ? 'cn' : (settings.region || 'CN').toLowerCase();
  }

  // ---- 积分查询（Dashboard）---------------------------------------
  function getRewardsInfo() {
    return httpRequest({
      url: MR_FACTS.rewardsInfoUrl + '&_=' + Date.now(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'referer': MR_FACTS.rewardsHome
      }
    }).then(function (res) {
      if (mrIsJson(res.text)) {
        var j = JSON.parse(res.text);
        if (j.dashboard) return j.dashboard;
      }
      throw new Error('Dashboard 解析失败');
    });
  }

  function getRewardsToken() {
    return httpRequest({
      url: MR_FACTS.rewardsHome,
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'referer': MR_FACTS.rewardsHome
      }
    }).then(function (res) {
      return mrExtractRvt(res.text.replace(/\s/g, ''));
    });
  }

  // ---- 任务执行器 -------------------------------------------------
  var Tasks = {
    enabled: function (key) {
      var map = { sign: 'signEnabled', read: 'readEnabled', promos: 'promosEnabled', search: 'searchEnabled' };
      return settings[map[key]] !== false;
    },

    sign: function (emit) {
      var region = regionLower();
      return httpRequest({
        method: 'POST',
        url: MR_FACTS.dapiActivitiesUrl,
        headers: Object.assign(buildMobileHeaders(region), {
          'x-rewards-partnerid': 'startapp',
          'x-rewards-flights': 'rwgobig'
        }),
        data: JSON.stringify({
          amount: 1,
          attributes: {},
          id: mrUuid(),
          type: MR_FACTS.activityType.sign,
          country: region,
          risk_context: {},
          channel: 'SAAndroid'
        })
      }).then(function (res) {
        if (mrIsJson(res.text)) {
          var j = JSON.parse(res.text);
          var p = ((j.response || {}).activity || {}).p;
          var points = Number(p) || 0;
          return { done: true, points: points, already: points === 0 };
        }
        return { done: false };
      });
    },

    readProgress: function () {
      return httpRequest({
        url: MR_FACTS.dapiMeUrl + '?channel=SAAndroid&options=613',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'user-agent': settings.mobileUA,
          'authorization': 'Bearer ' + Auth.accessToken,
          'x-rewards-appid': MR_FACTS.appId,
          'x-rewards-ismobile': 'true'
        }
      }).then(function (res) {
        if (mrIsJson(res.text)) {
          var j = JSON.parse(res.text);
          return mrParseReadProgress((j.response || {}).promotions);
        }
        return { max: 1, progress: 0 };
      });
    },

    read: function (emit) {
      var region = regionLower();
      return this.readProgress().then(function (pro) {
        if (pro.progress >= pro.max) {
          return { done: true, skipped: true, progress: pro.progress, max: pro.max };
        }
        return httpRequest({
          method: 'POST',
          url: MR_FACTS.dapiActivitiesUrl,
          headers: buildMobileHeaders(region),
          data: JSON.stringify({
            amount: 1,
            country: region,
            id: mrUuid(),
            type: MR_FACTS.activityType.read,
            attributes: { offerid: MR_FACTS.readOfferId }
          })
        }).then(function () {
          return { done: true, progress: Math.min(pro.progress + 1, pro.max), max: pro.max };
        });
      });
    },

    promos: function (emit) {
      return Promise.all([getRewardsInfo(), getRewardsToken()]).then(function (r) {
        var dashboard = r[0];
        var rvt = r[1];
        var list = mrCollectPromos(dashboard, mrDateSlash());
        if (!list.length) return { done: true, count: 0 };
        if (!rvt) throw new Error('RequestVerificationToken 获取失败');
        var chain = Promise.resolve();
        list.forEach(function (item) {
          chain = chain.then(function () {
            return httpRequest({
              method: 'POST',
              url: MR_FACTS.reportActivityUrl,
              headers: {
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'referer': item.url
              },
              data: (function () {
                var p = new URLSearchParams();
                p.append('id', item.id);
                p.append('hash', item.hash);
                p.append('timeZone', '480');
                p.append('activityAmount', '1');
                p.append('dbs', '0');
                p.append('form', '');
                p.append('type', '');
                p.append('__RequestVerificationToken', rvt);
                return p.toString();
              })()
            }).then(function () {
              return Bing._resolveHost().then(function (host) {
                return httpRequest({
                  method: 'POST',
                  url: 'https://' + host + '/msrewards/api/v1/ReportActivity?ajaxreq=1',
                  headers: {
                    'content-type': 'application/json; charset=UTF-8',
                    'referer': item.url
                  },
                  data: JSON.stringify({
                    ActivitySubType: 'quiz',
                    ActivityType: 'notification',
                    OfferId: item.id,
                    Channel: 'Bing.Com',
                    PartnerId: 'BingTrivia',
                    Timezone: -480
                  })
                });
              });
            }).then(function () {
              return new Promise(function (res) { setTimeout(res, 1000); });
            });
          });
        });
        return chain.then(function () { return { done: true, count: list.length }; });
      });
    },

    searchOnce: function (keyword, device) {
      var self = this;
      var mkt = settings.lockCN ? '&mkt=zh-CN' : '';
      var ua = device === 'pc' ? settings.pcUA : settings.mobileUA;
      var cookieU = device === 'pc' ? 'u=d' : 'u=m';
      var cookie = '_Rwho=' + cookieU + '&ts=' + mrDateHyphen();
      var headers = {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'user-agent': ua,
        'cookie': cookie
      };
      return Bing._resolveHost().then(function (host) {
        // 删除旧会话 cookie（best-effort）
        return Promise.all(MR_FACTS.searchClearCookies.map(function (name) {
          return gmCookieDelete('https://bing.com', name).catch(function () {});
        })).then(function () {
          var query = mrBuildSearchUrl(host, keyword, mkt);
          return httpRequest({
            url: query,
            headers: Object.assign({}, headers, { 'referer': 'https://' + host + '/?form=QBLH' })
          }).then(function (res) {
            var html = (res.text || '').replace(/\s/g, '');
            var guid = mrExtractSearchGuid(html) || mrUuid().replace(/-/g, '').toUpperCase();
            var result = mrExtractSearchResult(html);
            var params = mrBuildSearchParams(keyword, mkt);
            var ncheader = 'https://' + host + '/rewardsapp/ncheader?ver=88888888&IID=SERP.5047&IG=' + guid + '&ajaxreq=1';
            var report = 'https://' + host + '/rewardsapp/reportActivity?IG=' + guid + '&IID=SERP.5047&' + params + '&ajaxreq=1';
            var h2 = Object.assign({}, headers, { 'referer': query });
            return httpRequest({ method: 'POST', url: ncheader, headers: h2, data: 'wb=1;i=1;v=1' })
              .then(function () {
                return httpRequest({
                  method: 'POST',
                  url: report,
                  headers: h2,
                  data: 'url=' + encodeURIComponent(query) + '&V=web'
                });
              })
              .then(function () {
                if (result) {
                  var click = 'https://' + host + '/fd/ls/GLinkPingPost.aspx?IG=' + guid + '&ID=' + result.id + '&url=' + result.href;
                  return httpRequest({ method: 'GET', url: click, headers: h2 });
                }
                return null;
              })
              .then(function () { return query; });
          });
        });
      });
    },

    search: function (emit) {
      var self = this;
      return getRewardsInfo().then(function (dashboard) {
        var counters = mrParseCounters(dashboard);
        if (!counters) throw new Error('搜索计数解析失败');
        var pcRemain = Math.max(0, counters.pc.max - counters.pc.progress);
        var mobileRemain = Math.max(0, counters.mobile.max - counters.mobile.progress);
        if (pcRemain <= 0 && mobileRemain <= 0) {
          return { done: true, searchers: 0, pc: counters.pc, mobile: counters.mobile };
        }
        // 每 3 积分 ≈ 1 次搜索（客观事实：Bing 搜索默认每次 3 分）
        var pcNeed = Math.ceil(pcRemain / 3);
        var mobileNeed = Math.ceil(mobileRemain / 3);
        var total = Math.min(pcNeed + mobileNeed, settings.searchLimit);
        var delays = mrRiskDelays(settings.riskLevel);
        var done = 0;
        var device = pcRemain > 0 ? 'pc' : 'mobile';

        function step() {
          if (done >= total) return { done: true };
          var keyword = mrBuildQueryWord();
          return self.searchOnce(keyword, device).then(function () {
            done++;
            if (emit) emit({ stage: 'search', done: done, total: total, device: device, keyword: keyword });
            device = (device === 'pc' && mobileNeed > 0) ? 'mobile' : device;
            var wait = mrRandScope(settings.intervalMin, settings.intervalMax);
            return new Promise(function (res) { setTimeout(res, wait); }).then(step);
          });
        }
        return step().then(function () {
          return { done: true, searchers: done, pc: counters.pc, mobile: counters.mobile };
        });
      });
    }
  };

  // ---- 运行编排 ---------------------------------------------------
  var running = false;

  function runTasks(onlyTypes, emitter) {
    if (running) return Promise.reject(new Error('已有任务在运行，请稍候'));
    running = true;
    var startedAt = Date.now();

    function emit(ev) {
      try { if (emitter) emitter(ev); } catch (e) { /* ignore */ }
      channel.send('progress', ev);
    }

    function include(key) {
      if (!onlyTypes || !onlyTypes.length) return true;
      return onlyTypes.indexOf(key) !== -1;
    }

    function finish(summary) {
      running = false;
      var rec = {
        day: mrTodayKey(),
        time: new Date().toISOString(),
        points: summary.points,
        searchers: summary.searchers || 0,
        status: summary.error ? 'error' : 'ok',
        note: summary.error || summary.note
      };
      pushHistory(rec);
      var st = loadState();
      st.lastRunDay = mrTodayKey();
      st.lastRunAt = new Date().toISOString();
      st.lastSummary = summary;
      saveState(st);
      channel.send('done', summary);
      log('run.finish', summary);
      if (summary.error) { notify(false, summary.error); } else { notify(true, summary.note); }
    }

    emit({ stage: 'start', types: onlyTypes || ['sign', 'read', 'promos', 'search'] });

    return Auth.ensureToken().then(function () {
      emit({ stage: 'auth', message: '授权完成' });
      if (settings.lockCN) {
        return Bing.checkRegion().then(function (ipcc) {
          if (ipcc && ipcc !== 'CN') {
            throw new Error('当前 IP 非中国大陆地区（' + ipcc + '），已按「锁定国区」策略停止');
          }
        });
      }
    }).then(function () {
      var chain = Promise.resolve();
      var summary = { points: 0, searchers: 0, note: '' };

      if (include('sign') && Tasks.enabled('sign')) {
        chain = chain.then(function () {
          emit({ stage: 'task', task: 'sign', message: '执行签入任务' });
          return Tasks.sign(emit).then(function (r) {
            summary.points += r.points || 0;
            emit({ stage: 'taskDone', task: 'sign', result: r });
          });
        });
      }
      if (include('read') && Tasks.enabled('read')) {
        chain = chain.then(function () {
          emit({ stage: 'task', task: 'read', message: '执行阅读任务' });
          return Tasks.read(emit).then(function (r) {
            emit({ stage: 'taskDone', task: 'read', result: r });
          });
        });
      }
      if (include('promos') && Tasks.enabled('promos')) {
        chain = chain.then(function () {
          emit({ stage: 'task', task: 'promos', message: '执行活动任务' });
          return Tasks.promos(emit).then(function (r) {
            summary.points += (r.count || 0) * 0; // 活动积分以官网为准
            emit({ stage: 'taskDone', task: 'promos', result: r });
          });
        });
      }
      if (include('search') && Tasks.enabled('search')) {
        chain = chain.then(function () {
          emit({ stage: 'task', task: 'search', message: '执行搜索任务' });
          return Tasks.search(emit).then(function (r) {
            summary.searchers = r.searchers || 0;
            emit({ stage: 'taskDone', task: 'search', result: r });
          });
        });
      }

      return chain.then(function () {
        summary.note = '本次运行完成';
        return getRewardsInfo().then(function (dashboard) {
          summary.counters = mrParseCounters(dashboard);
          summary.points = summary.counters ? summary.counters.dailyPoint : summary.points;
          return summary;
        }).catch(function () { return summary; });
      });
    }).then(finish).catch(function (e) {
      finish({ points: 0, error: String(e && e.message || e), note: '运行出错' });
    });
  }

  // ---- 状态汇总（面板 getState）-----------------------------------
  function currentStatus() {
    var st = loadState();
    return {
      ok: true,
      settings: settings,
      hasToken: getRefreshToken() !== null || Auth.accessToken != null,
      lastRunDay: st.lastRunDay || null,
      lastRunAt: st.lastRunAt || null,
      lastSummary: st.lastSummary || null,
      history: loadHistory().slice(0, 30)
    };
  }

  // ---- 面板命令处理 ------------------------------------------------
  function registerChannelHandlers() {
    channel.on('command', function (data, msg) {
      var action = (data && data.action) || '';
      log('channel.command', { action: action });

      if (action === 'getState') {
        channel.reply(msg, currentStatus());
        return;
      }
      if (action === 'getConfig') {
        channel.reply(msg, { ok: true, settings: settings });
        return;
      }
      if (action === 'setConfig') {
        persistSettings(data.settings || {});
        channel.reply(msg, { ok: true, settings: settings });
        return;
      }
      if (action === 'resetSettings') {
        persistSettings(DEFAULT_SETTINGS);
        channel.reply(msg, { ok: true, settings: settings });
        return;
      }
      if (action === 'getHistory') {
        channel.reply(msg, { ok: true, history: loadHistory() });
        return;
      }
      if (action === 'runTasks') {
        var types = (data && data.types) || null;
        channel.reply(msg, { ok: true, started: true });
        runTasks(types).catch(function (e) {
          log('run.error', { message: String(e && e.message || e) });
        });
        return;
      }
      if (action === 'refreshStatus') {
        getRewardsInfo().then(function (dashboard) {
          channel.reply(msg, { ok: true, counters: mrParseCounters(dashboard) });
        }).catch(function (e) {
          channel.reply(msg, { ok: false, error: String(e && e.message || e) });
        });
        return;
      }
      if (action === 'getLogs') {
        channel.reply(msg, { ok: true, text: logText() });
        return;
      }
      channel.reply(msg, { ok: false, error: '未知命令: ' + action });
    });
  }

  // ---- FAB 聚合按钮组（共享模板 xloadFab，整体复制，勿改写）---------
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

  function mountFabItem() {
    var fab = xloadFab();
    fab.addItem(TASK_ID, FAB_LABEL, openPanel);
    log('fab.mount', { task: TASK_ID });
  }

  // ---- 每日自动执行（页面保持打开时触发一次）----------------------
  var autoScheduled = false;
  function scheduleAutoRun() {
    if (autoScheduled) return;
    var st = loadState();
    var today = mrTodayKey();
    if (!settings.autoRun) { log('autorun.disabled', {}); return; }
    if (st.lastRunDay === today) { log('autorun.already', { day: today }); return; }
    autoScheduled = true;
    var delay = mrRandScope(settings.autoDelayMin, settings.autoDelayMax) * 1000;
    log('autorun.schedule', { delayMs: delay, day: today });
    setTimeout(function () {
      log('autorun.trigger', {});
      runTasks(null).catch(function (e) {
        log('autorun.error', { message: String(e && e.message || e) });
      });
    }, delay);
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
    // 宿主站点排除：xload 官网 / 本站不注入任何 UI 与监听
    var host = String(window.location.host || '').toLowerCase();
    if (host.indexOf('xload.net') !== -1 || host.indexOf('u2222223.github.io') !== -1) {
      return;
    }
    log('init.start', { ua: navigator.userAgent.slice(0, 80), host: host, readyState: document.readyState });

    try {
      window.addEventListener('error', function (ev) {
        log('window.error', { message: String((ev && ev.message) || ''), file: String((ev && ev.filename) || ''), line: (ev && ev.lineno) || 0, col: (ev && ev.colno) || 0 });
      });
      window.addEventListener('unhandledrejection', function (ev) {
        var r = ev && ev.reason;
        log('window.unhandledrejection', { message: String((r && r.message) || r) });
        if (ev && typeof ev.preventDefault === 'function') { try { ev.preventDefault(); } catch (e) { /* ignore */ } }
      });
    } catch (e) { /* ignore */ }

    registerChannelHandlers();

    whenReady(function () {
      try {
        mountFabItem();
        log('init.fab.ok', {});
      } catch (e) { log('init.fab.error', { message: String(e && e.message || e) }); }
    });

    scheduleAutoRun();
    log('init.done', { host: host });
  }

  whenReady(init);
})();