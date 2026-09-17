// ==UserScript==
// @name         Product price history tracker & browsing insights for shopping sites
// @name:en      Product price history tracker & browsing insights for shopping sites
// @name:zh-CN   商品价格历史追踪与浏览洞察：判断最佳购买时机
// @name:zh-TW   商品價格歷史追蹤與瀏覽洞察：判斷最佳購買時機
// @namespace    https://xload.net/
// @version      2026.9.17.2
// @description  Tracks product prices you view on supported stores and shows the price trend so you can decide when to buy.
// @description:en      Tracks product prices you view on supported stores and shows the price trend so you can decide when to buy.
// @description:zh-CN   记录你在支持的购物网站浏览过的商品价格，展示价格走势，帮你判断何时购买更划算。
// @description:zh-TW   記錄你在支援的購物網站瀏覽過的商品價格，顯示價格走勢，幫你判斷何時購買更划算。
// @homepageURL  https://xload.net/scripts/userscripts/xload-1b4011f3/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://aliexpress.com/*
// @match        *://*.aliexpress.com/*
// @match        *://lazada.com/*
// @match        *://*.lazada.com/*
// @match        *://ebay.com/*
// @match        *://*.ebay.com/*
// @match        *://amazon.com/*
// @match        *://*.amazon.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-1b4011f3';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-1b4011f3/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-1b4011f3-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "Product price history tracker & browsing insights for shopping sites",
    "short": "Tracks product prices you view on supported stores and shows the price trend so you can decide when to buy.",
    "panel.documentTitle": "Product price history tracker & browsing insights for shopping sites - Panel",
    "fab.label": "Product price history tracker & browsing insights for shopping sites",
    "ad.label": "Advertisement",
    "language.label": "Language",
    "language.auto": "Auto (browser)",
    "language.en": "English",
    "language.zhCN": "简体中文",
    "language.zhTW": "繁體中文",
    "footer.tools": "Tools",
    "footer.privacy": "Privacy",
    "control.save": "Save settings",
    "control.saved": "Settings saved",
    "control.close": "Close",
    "notice": "Notice",
    "close": "Close",
    "timeout": "The original page did not respond",
    "error.pageUnresponsive": "The original page did not respond",
    "error.unknown": "Unknown command",
    "section.products": "Browsed products",
    "section.settings": "Settings",
    "section.compare": "Category comparison",
    "settings.retention": "Keep history for",
    "settings.retention.days": "{days} days",
    "settings.badge": "Show a badge when the price changes",
    "settings.badgeHelp": "Adds a small note on the product page when the price differs from your last visit.",
    "control.clearHistory": "Clear history",
    "control.clearHistoryConfirm": "Clear your entire local browsing history? This cannot be undone.",
    "control.removeProduct": "Remove",
    "control.viewLogs": "View logs",
    "control.copyLogs": "Copy logs",
    "state.empty_history": "No browsing history yet. Browse products on a supported store first.",
    "state.priceRange": "Range {low} \u2013 {high}",
    "state.dropped": "Dropped {amount} since last visit",
    "state.risen": "Up {amount} since last visit",
    "state.unchanged": "Same price as last visit",
    "state.current": "Current",
    "state.low": "Low",
    "state.high": "High",
    "state.avg": "Average",
    "state.points": "{count} records",
    "state.cheapest": "Lowest in group",
    "state.compareEmpty": "No group of two or more browsed products yet. Keep browsing similar items to see comparisons.",
    "badge.drop": "Dropped {amount}",
    "badge.rise": "Up {amount}",
    "aria.priceChart": "Price trend chart",
    "chart.title": "Price trend",
    "status.loading": "Loading\u2026",
    "log.title": "Logs"
  },
  "zh-CN": {
    "title": "商品价格历史追踪与浏览洞察：判断最佳购买时机",
    "short": "记录你在支持的购物网站浏览过的商品价格，展示价格走势，帮你判断何时购买更划算。",
    "panel.documentTitle": "商品价格历史追踪与浏览洞察：判断最佳购买时机 - 功能面板",
    "fab.label": "商品价格历史追踪与浏览洞察：判断最佳购买时机",
    "ad.label": "广告",
    "language.label": "语言",
    "language.auto": "自动（浏览器）",
    "language.en": "English",
    "language.zhCN": "简体中文",
    "language.zhTW": "繁體中文",
    "footer.tools": "工具列表",
    "footer.privacy": "隐私政策",
    "control.save": "保存配置",
    "control.saved": "已保存配置",
    "control.close": "关闭",
    "notice": "提示",
    "close": "关闭",
    "timeout": "原页面未响应",
    "error.pageUnresponsive": "原页面未响应",
    "error.unknown": "未知命令",
    "section.products": "已浏览商品",
    "section.settings": "设置",
    "section.compare": "品类对比",
    "settings.retention": "历史保留时长",
    "settings.retention.days": "{days} 天",
    "settings.badge": "价格变动时显示徽标",
    "settings.badgeHelp": "当价格与上次访问不同时，在商品页显示小提示。",
    "control.clearHistory": "清除历史",
    "control.clearHistoryConfirm": "确定清除全部本地浏览历史？此操作无法撤销。",
    "control.removeProduct": "移除",
    "control.viewLogs": "查看日志",
    "control.copyLogs": "复制日志",
    "state.empty_history": "还没有浏览记录，先浏览支持网站的商品。",
    "state.priceRange": "价格区间 {low} \u2013 {high}",
    "state.dropped": "较上次下降 {amount}",
    "state.risen": "较上次上涨 {amount}",
    "state.unchanged": "与上次价格相同",
    "state.current": "当前",
    "state.low": "最低",
    "state.high": "最高",
    "state.avg": "均价",
    "state.points": "{count} 条记录",
    "state.cheapest": "组内最低",
    "state.compareEmpty": "暂无可对比的品类分组。继续浏览同类商品后可查看对比。",
    "badge.drop": "降价 {amount}",
    "badge.rise": "涨价 {amount}",
    "aria.priceChart": "价格走势图",
    "chart.title": "价格走势",
    "status.loading": "加载中…",
    "log.title": "日志"
  },
  "zh-TW": {
    "title": "商品價格歷史追蹤與瀏覽洞察：判斷最佳購買時機",
    "short": "記錄你在支援的購物網站瀏覽過的商品價格，顯示價格走勢，幫你判斷何時購買更划算。",
    "panel.documentTitle": "商品價格歷史追蹤與瀏覽洞察：判斷最佳購買時機 - 功能面板",
    "fab.label": "商品價格歷史追蹤與瀏覽洞察：判斷最佳購買時機",
    "ad.label": "廣告",
    "language.label": "語言",
    "language.auto": "自動（瀏覽器）",
    "language.en": "English",
    "language.zhCN": "简体中文",
    "language.zhTW": "繁體中文",
    "footer.tools": "工具列表",
    "footer.privacy": "隱私政策",
    "control.save": "儲存設定",
    "control.saved": "已儲存設定",
    "control.close": "關閉",
    "notice": "提示",
    "close": "關閉",
    "timeout": "原頁面未回應",
    "error.pageUnresponsive": "原頁面未回應",
    "error.unknown": "未知命令",
    "section.products": "已瀏覽商品",
    "section.settings": "設定",
    "section.compare": "品類對比",
    "settings.retention": "歷史保留時長",
    "settings.retention.days": "{days} 天",
    "settings.badge": "價格變動時顯示徽章",
    "settings.badgeHelp": "當價格與上次瀏覽不同時，在商品頁顯示小提示。",
    "control.clearHistory": "清除歷史",
    "control.clearHistoryConfirm": "確定清除全部本機瀏覽歷史？此操作無法復原。",
    "control.removeProduct": "移除",
    "control.viewLogs": "查看日誌",
    "control.copyLogs": "複製日誌",
    "state.empty_history": "尚無瀏覽紀錄，先瀏覽支援網站的商品。",
    "state.priceRange": "價格區間 {low} \u2013 {high}",
    "state.dropped": "較上次下降 {amount}",
    "state.risen": "較上次上漲 {amount}",
    "state.unchanged": "與上次價格相同",
    "state.current": "目前",
    "state.low": "最低",
    "state.high": "最高",
    "state.avg": "均價",
    "state.points": "{count} 筆記錄",
    "state.cheapest": "組內最低",
    "state.compareEmpty": "暫無可對比的品類分組。繼續瀏覽同類商品後可查看對比。",
    "badge.drop": "降價 {amount}",
    "badge.rise": "漲價 {amount}",
    "aria.priceChart": "價格走勢圖",
    "chart.title": "價格走勢",
    "status.loading": "載入中…",
    "log.title": "日誌"
  }
}
/* XLOAD-I18N-DICT-END */;

function createI18n(taskId, dictionary, options) {
    var opts = options || {};
    var memoryLocale = null;
    var dynamicText = typeof WeakMap === 'function' ? new WeakMap() : null;
    var allowedLocales = ['auto', 'en', 'zh-CN', 'zh-TW'];
    var allowedAttributes = { title: true, placeholder: true, 'aria-label': true, alt: true };

    function normalizeLocale(value) {
      var locale = String(value || '').replace(/_/g, '-').toLowerCase();
      if (/^zh(?:-|$)/.test(locale)) {
        if (/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(locale)) return 'zh-TW';
        return 'zh-CN';
      }
      return 'en';
    }

    function detectedLocale() {
      var values = [];
      try { values = navigator.languages || []; } catch (e) { values = []; }
      if (!values.length) {
        try { values = [navigator.language]; } catch (e) { values = []; }
      }
      for (var i = 0; i < values.length; i++) {
        if (/^zh(?:-|$)/i.test(String(values[i] || ''))) return normalizeLocale(values[i]);
      }
      return 'en';
    }

    function readPreference() {
      if (memoryLocale != null) return memoryLocale;
      try {
        var value = opts.get ? opts.get('locale', 'auto') : memoryLocale;
        memoryLocale = allowedLocales.indexOf(value) >= 0 ? value : 'auto';
      } catch (e) { memoryLocale = 'auto'; }
      return memoryLocale;
    }

    function writePreference(value) {
      memoryLocale = value;
      try { if (opts.set) opts.set('locale', value); } catch (e) { /* denied storage uses memory */ }
    }

    function getLocale() {
      var preference = readPreference();
      return preference === 'auto' ? detectedLocale() : preference;
    }

    function t(key, vars) {
      var locale = getLocale();
      var current = dictionary[locale] || {};
      var english = dictionary.en || {};
      var value = current[key];
      if (typeof value !== 'string') value = english[key];
      if (typeof value !== 'string') value = key;
      return value.replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, name) {
        return vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : '{' + name + '}';
      });
    }

    function setText(element, key, vars) {
      if (!element || typeof element.setAttribute !== 'function') return element;
      var normalizedKey = String(key || '');
      element.setAttribute('data-i18n', normalizedKey);
      if (dynamicText) dynamicText.set(element, { key: normalizedKey, vars: vars || null });
      element.textContent = t(normalizedKey, vars);
      return element;
    }

    function apply(root) {
      var scope = root || document;
      var textNodes = scope.querySelectorAll ? scope.querySelectorAll('[data-i18n]') : [];
      for (var i = 0; i < textNodes.length; i++) {
        var saved = dynamicText && dynamicText.get(textNodes[i]);
        var key = saved ? saved.key : textNodes[i].getAttribute('data-i18n');
        textNodes[i].textContent = t(key, saved && saved.vars);
      }
      var attrNodes = scope.querySelectorAll ? scope.querySelectorAll('[data-i18n-attr]') : [];
      for (var j = 0; j < attrNodes.length; j++) {
        var specs = String(attrNodes[j].getAttribute('data-i18n-attr') || '').split(',');
        for (var k = 0; k < specs.length; k++) {
          var pair = specs[k].split(':');
          var attr = String(pair.shift() || '').trim().toLowerCase();
          var key = pair.join(':').trim();
          if (allowedAttributes[attr] && key) attrNodes[j].setAttribute(attr, t(key));
        }
      }
      try { if (document.documentElement) document.documentElement.lang = getLocale(); } catch (e) { /* ignore */ }
      return api;
    }

    function setLocale(value) {
      var locale = allowedLocales.indexOf(value) >= 0 ? value : 'auto';
      writePreference(locale);
      apply();
      return locale;
    }

    var api = { taskId: String(taskId || ''), t: t, setText: setText, apply: apply, getLocale: getLocale, getPreference: readPreference, setLocale: setLocale, normalizeLocale: normalizeLocale };
    return api;
  }

  var i18n = createI18n(TASK_ID, I18N_DICT, {
    get: function (key, fallback) {
      try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':i18n:' + key, fallback) : fallback; }
      catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { if (typeof GM_setValue === 'function') GM_setValue(TASK_ID + ':i18n:' + key, value); } catch (e) { /* denied storage */ }
    }
  });

  function log(tag, data) {
    try {
      var entry = { at: new Date().toISOString(), tag: tag, data: data == null ? null : data };
      console.log('[xload:' + TASK_ID + ']', tag, data == null ? '' : data);
      var rows = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]');
      rows.push(entry);
      window.localStorage.setItem(LOG_KEY, JSON.stringify(rows.slice(-60)));
    } catch (e) { /* 日志不能中断主逻辑 */ }
  }

  // XLOAD:CORE-TEST:REQUIRED
  // CORE-START
  var DEFAULT_RETENTION_DAYS = 90;
  var RETENTION_MIN = 7;
  var RETENTION_MAX = 365;
  var MAX_POINTS = 500;

  var STORE_DOMAINS = ['aliexpress', 'lazada', 'ebay', 'amazon'];

  // 详情页判定正则（站点事实：URL 结构，非实现逻辑）。
  var DETAIL_PATTERNS = {
    aliexpress: /\/item\/[^.\\/]+\.html/,
    lazada: /\/products\/.*-i\d+.*\.html/,
    ebay: /\/itm\/\d+/,
    amazon: /\/(?:dp|gp\/product)\/[A-Z0-9]{10}/i
  };

  // 商品 ID 提取（站点事实：各站 URL 中的稳定标识）。
  var ID_PATTERNS = {
    aliexpress: /\/item\/([^.\\/]+)\.html/,
    lazada: /\/products\/.*?-i(\d+)/i,
    ebay: /\/itm\/(\d+)/,
    amazon: /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i
  };

  // 品类推导用的停用词（非完整词典，只用于同类商品粗分组）。
  var STOPWORDS = {
    a:1, an:1, the:1, and:1, or:1, of:1, to:1, in:1, on:1, for:1, with:1, by:1, at:1,
    from:1, is:1, are:1, was:1, as:1, be:1, it:1, this:1, that:1,
    new:1, hot:1, sale:1, free:1, now:1, top:1, best:1, high:1, low:1, quality:1, brand:1,
    original:1, official:1, mini:1, small:1, large:1, size:1, color:1, colour:1,
    red:1, blue:1, black:1, white:1, green:1, yellow:1,
    pcs:1, pc:1, lot:1, set:1, pack:1, box:1, bag:1, pair:1,
    women:1, men:1, kids:1, boy:1, girl:1, baby:1, adult:1, unisex:1
  };

  function detectStore(hostname) {
    var h = String(hostname || '').toLowerCase().replace(/^www\./i, '');
    if (!h) return null;
    for (var i = 0; i < STORE_DOMAINS.length; i++) {
      var d = STORE_DOMAINS[i];
      if (h === d + '.com' || h.indexOf('.' + d + '.') !== -1) return d;
    }
    return null;
  }

  function isProductUrl(store, url) {
    var pattern = DETAIL_PATTERNS[store];
    return !!pattern && pattern.test(String(url || ''));
  }

  function extractProductId(store, url) {
    var pattern = ID_PATTERNS[store];
    if (!pattern) return null;
    var m = String(url || '').match(pattern);
    if (!m) return null;
    return store === 'amazon' ? m[1].toUpperCase() : m[1];
  }

  // 把站点价格文案解析为数值；同时兼容「1,234.56」与「1.234,56」两种千分/小数点写法，
  // 以及「9.99 - 12.99」这类价格区间（取首个价格）。
  function parsePriceChunk(chunk) {
    var cleaned = chunk;
    var hasDot = cleaned.indexOf('.') !== -1;
    var hasComma = cleaned.indexOf(',') !== -1;
    var normalized;
    if (hasDot && hasComma) {
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = cleaned.replace(/,/g, '');
      }
    } else if (hasComma) {
      normalized = /,\d{3}$/.test(cleaned) ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
    } else if (hasDot) {
      normalized = cleaned.split('.').length - 1 > 1 ? cleaned.replace(/\./g, '') : cleaned;
    } else {
      normalized = cleaned;
    }
    var m = normalized.match(/\d+(?:\.\d+)?/);
    if (!m) return null;
    var value = parseFloat(m[0]);
    return isFinite(value) ? value : null;
  }

  function normalizePrice(text) {
    if (text == null) return null;
    var chunks = String(text).split(/[\s\-–—/|]+/);
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i].replace(/[^\d.,]/g, '');
      if (!c || !/\d/.test(c)) continue;
      var value = parsePriceChunk(c);
      if (value !== null) return value;
    }
    return null;
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function tokenize(text) {
    var raw = String(text || '').toLowerCase().split(/[^a-z0-9]+/);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var t = raw[i];
      if (!t || t.length < 3) continue;
      if (/^\d+$/.test(t)) continue;
      if (STOPWORDS[t]) continue;
      out.push(t);
    }
    return out;
  }

  function computeStats(points) {
    var count = points ? points.length : 0;
    if (!count) {
      return { count: 0, first: null, last: null, firstT: null, lastT: null, low: null, high: null, avg: null, current: null };
    }
    var values = [];
    for (var i = 0; i < count; i++) values.push(points[i].value);
    var low = Math.min.apply(null, values);
    var high = Math.max.apply(null, values);
    var sum = 0;
    for (var j = 0; j < values.length; j++) sum += values[j];
    return {
      count: count,
      first: values[0],
      last: values[values.length - 1],
      firstT: points[0].t,
      lastT: points[points.length - 1].t,
      low: low,
      high: high,
      avg: round2(sum / values.length),
      current: values[values.length - 1]
    };
  }

  // 最近一次价格相对上一次的差值；负值表示已降价。
  function computeDrop(points) {
    if (!points || points.length < 2) return null;
    return round2(points[points.length - 1].value - points[points.length - 2].value);
  }

  function buildChartPoints(points, maxCount) {
    var n = maxCount && maxCount > 0 ? maxCount : 24;
    if (!points || !points.length) return [];
    if (points.length <= n) {
      return points.map(function (p) { return p.value; });
    }
    var out = [];
    var step = (points.length - 1) / (n - 1);
    for (var i = 0; i < n; i++) {
      var idx = Math.round(i * step);
      if (idx >= points.length) idx = points.length - 1;
      out.push(points[idx].value);
    }
    return out;
  }

  function buildRecord(store, url, id, title, priceText, now) {
    if (!store || !url) return null;
    var value = normalizePrice(priceText);
    if (value === null) return null;
    var pid = id || extractProductId(store, url);
    if (!pid) return null;
    return {
      key: store + ':' + pid,
      store: store,
      id: String(pid),
      title: String(title || '').trim(),
      url: String(url),
      raw: String(priceText || '').trim(),
      value: value,
      t: now ? now : Date.now()
    };
  }

  function sameDay(a, b) {
    var da = new Date(a);
    var db = new Date(b);
    return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth() && da.getUTCDate() === db.getUTCDate();
  }

  function recordPoint(products, record) {
    var key = record.key;
    var out = {};
    for (var k in products) out[k] = products[k];
    var point = { t: record.t, value: record.value, raw: record.raw };
    var existing = products[key];
    if (!existing) {
      out[key] = {
        key: key,
        store: record.store,
        id: record.id,
        title: record.title,
        url: record.url,
        points: [point]
      };
    } else {
      var pts = existing.points.slice();
      var last = pts[pts.length - 1];
      if (last && last.value === record.value && sameDay(last.t, record.t)) {
        pts[pts.length - 1] = point;
      } else {
        pts.push(point);
        if (pts.length > MAX_POINTS) pts = pts.slice(pts.length - MAX_POINTS);
      }
      out[key] = {
        key: existing.key,
        store: existing.store || record.store,
        id: existing.id || record.id,
        title: record.title || existing.title,
        url: record.url || existing.url,
        points: pts
      };
    }
    return out;
  }

  function validateRetentionDays(value) {
    var n = Math.round(Number(value));
    if (!isFinite(n)) return DEFAULT_RETENTION_DAYS;
    return Math.max(RETENTION_MIN, Math.min(RETENTION_MAX, n));
  }

  function pruneProducts(products, retentionDays, now) {
    var days = validateRetentionDays(retentionDays);
    var cutoff = now - days * 86400000;
    var out = {};
    for (var k in products) {
      var p = products[k];
      var pts = (p.points || []).filter(function (pt) { return pt.t >= cutoff; });
      if (pts.length) {
        out[k] = { key: p.key, store: p.store, id: p.id, title: p.title, url: p.url, points: pts };
      }
    }
    return out;
  }

  function buildViewModel(products) {
    var rows = [];
    for (var k in products) {
      var p = products[k];
      var stats = computeStats(p.points);
      var drop = computeDrop(p.points);
      rows.push({
        key: p.key,
        store: p.store,
        id: p.id,
        title: p.title,
        url: p.url,
        current: stats.current,
        currentRaw: p.points.length ? p.points[p.points.length - 1].raw : null,
        low: stats.low,
        high: stats.high,
        avg: stats.avg,
        count: stats.count,
        firstT: stats.firstT,
        lastT: stats.lastT,
        drop: drop,
        category: null,
        chart: buildChartPoints(p.points, 24)
      });
    }
    rows.sort(function (a, b) { return (b.lastT || 0) - (a.lastT || 0); });
    return rows;
  }

  // 对已浏览商品做“同店 + 共享关键词”分组，组内按当前价升序，便于找出品类内最低价。
  function buildComparison(rows) {
    if (!rows || rows.length < 2) return [];
    var freq = {};
    var tokenSets = [];
    for (var i = 0; i < rows.length; i++) {
      var toks = tokenize(rows[i].title);
      tokenSets[i] = toks;
      var seen = {};
      for (var j = 0; j < toks.length; j++) {
        var t = toks[j];
        if (!seen[t]) { seen[t] = 1; freq[t] = (freq[t] || 0) + 1; }
      }
    }
    var groups = {};
    var order = [];
    for (var r = 0; r < rows.length; r++) {
      var rowTokens = tokenSets[r];
      var best = null;
      var bestScore = -1;
      for (var q = 0; q < rowTokens.length; q++) {
        var tok = rowTokens[q];
        var score = (freq[tok] || 0) * 1000 + tok.length;
        if (score > bestScore) { bestScore = score; best = tok; }
      }
      var cat = best || rows[r].store;
      var gKey = rows[r].store + '|' + cat;
      if (!groups[gKey]) {
        groups[gKey] = { store: rows[r].store, label: cat, items: [] };
        order.push(gKey);
      }
      groups[gKey].items.push(rows[r]);
    }
    var out = [];
    for (var g = 0; g < order.length; g++) {
      var grp = groups[order[g]];
      if (grp.items.length < 2) continue;
      grp.items.sort(function (a, b) {
        if (a.current === null) return 1;
        if (b.current === null) return -1;
        return a.current - b.current;
      });
      out.push(grp);
    }
    out.sort(function (a, b) {
      return b.items.length - a.items.length || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
    });
    return out;
  }
  // CORE-END

  // ===================== 站点适配器（站点事实：DOM 选择器） =====================
  // aliexpress / lazada / ebay 选择器逐字取自参考源；amazon 在原脚本中未启用记录，
  // 此处使用页面通用结构化标题与价格选择器（自写，见 REF 借鉴声明）。
  var SITE_SELECTORS = {
    aliexpress: {
      title: "h1[data-pl='product-title'], h1[class*='HazeProductDescription_HazeProductDescription__smallText_']",
      price: "span.product-price-value, div[class*='currentPriceText'], div[class*='HazeProductPrice_SnowPrice__container']>div"
    },
    lazada: {
      title: "h1[class*='pdp-mod-product-badge-title']",
      price: "div[class*='product-current-price-container'], div[class*='product-price-content-salePrice'], .pdp-product-price"
    },
    ebay: {
      title: ".x-item-title__mainTitle",
      price: ".x-price-primary >span"
    },
    amazon: {
      title: "#productTitle",
      price: ".a-price .a-offscreen"
    }
  };

  var META_PRICE_KEYS = ['og:price:amount', 'product:price:amount', 'twitter:data1'];

  // ===================== 本地存储（gmGet/gmSet 封装） =====================
  var DATA_KEY = TASK_ID + ':data';
  var DATA_VERSION = 1;
  var BADGE_ID = 'xload-price-badge';

  function DEFAULT_SETTINGS() {
    return { retentionDays: DEFAULT_RETENTION_DAYS, showBadge: true };
  }

  function gmGet(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') {
        var v = GM_getValue(key, null);
        return v == null ? fallback : v;
      }
    } catch (e) { /* 降级到页面 localStorage */ }
    try {
      var s = window.localStorage.getItem(key);
      return s == null ? fallback : JSON.parse(s);
    } catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try {
      if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; }
    } catch (e) { /* 降级到页面 localStorage */ }
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function readData() {
    var raw = gmGet(DATA_KEY, null);
    var data = null;
    if (raw && typeof raw === 'object' && raw.version === DATA_VERSION && raw.settings && raw.products) {
      data = raw;
    } else if (raw && typeof raw === 'object' && raw.settings && raw.products) {
      data = { version: DATA_VERSION, settings: raw.settings, products: raw.products };
    } else {
      data = { version: DATA_VERSION, settings: DEFAULT_SETTINGS(), products: {} };
    }
    if (data.settings == null || typeof data.settings !== 'object') data.settings = DEFAULT_SETTINGS();
    if (typeof data.settings.retentionDays !== 'number') data.settings.retentionDays = DEFAULT_RETENTION_DAYS;
    data.settings.retentionDays = validateRetentionDays(data.settings.retentionDays);
    if (typeof data.settings.showBadge !== 'boolean') data.settings.showBadge = true;
    if (data.products == null || typeof data.products !== 'object' || Array.isArray(data.products)) data.products = {};
    return data;
  }

  function writeData(data) {
    try { gmSet(DATA_KEY, data); } catch (e) { log('storage.write.error', { message: String(e && e.message || e) }); }
  }

  function readLogs() {
    try { return JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; }
  }

  function metaContent(property) {
    try {
      var el = document.querySelector('meta[property="' + property + '"]');
      return el && el.content ? el.content : null;
    } catch (e) { return null; }
  }

  function safeQuery(selector) {
    try { return document.querySelector(selector); } catch (e) { return null; }
  }

  function extractProductInfo(store) {
    var sel = SITE_SELECTORS[store];
    var title = null;
    var priceText = null;
    if (sel) {
      var titleEl = safeQuery(sel.title);
      var priceEl = safeQuery(sel.price);
      if (titleEl) title = titleEl.textContent;
      if (priceEl) priceText = priceEl.textContent;
    }
    if (!title || !title.trim()) title = metaContent('og:title') || document.title;
    if (!priceText || !priceText.trim()) {
      for (var i = 0; i < META_PRICE_KEYS.length; i++) {
        var v = metaContent(META_PRICE_KEYS[i]);
        if (v) { priceText = v; break; }
      }
    }
    if (!title || !title.trim() || !priceText || !priceText.trim()) return null;
    return { title: title.trim(), priceText: priceText.trim() };
  }

  function clearBadge() {
    var el = document.getElementById(BADGE_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function injectBadge(drop) {
    if (window.self !== window.top) return;
    clearBadge();
    if (drop === null) return;
    var text;
    if (drop < 0) text = i18n.t('badge.drop', { amount: Math.abs(drop).toFixed(2) });
    else if (drop > 0) text = i18n.t('badge.rise', { amount: drop.toFixed(2) });
    else return;
    var el = document.createElement('div');
    el.id = BADGE_ID;
    el.setAttribute('data-xload-price-badge', 'true');
    el.setAttribute('role', 'status');
    el.textContent = text;
    el.style.cssText =
      'position:fixed;right:16px;bottom:90px;z-index:2147483000;' +
      'background:#111;color:#fff;padding:8px 12px;' +
      'border-radius:4px;font-size:12px;max-width:260px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.16);';
    var close = document.createElement('span');
    close.textContent = ' ×';
    close.setAttribute('role', 'button');
    close.style.cssText = 'cursor:pointer;margin-left:8px;opacity:.7;';
    close.addEventListener('click', clearBadge);
    el.appendChild(close);
    document.body.appendChild(el);
  }

  var recordState = { url: null, value: null };

  function commitRecord(record) {
    var data = readData();
    data.products = recordPoint(data.products, record);
    data.products = pruneProducts(data.products, data.settings.retentionDays, record.t);
    writeData(data);
    var product = data.products[record.key];
    var stats = computeStats(product ? product.points : []);
    var drop = computeDrop(product ? product.points : []);
    if (data.settings.showBadge) injectBadge(drop);
    else clearBadge();
    if (channel) {
      channel.send('progress', {
        type: 'recorded',
        key: record.key,
        product: { store: record.store, id: record.id, title: record.title, url: record.url },
        stats: { current: stats.current, low: stats.low, high: stats.high, avg: stats.avg, count: stats.count, drop: drop }
      });
    }
    log('record', { store: record.store, id: record.id, value: record.value, title: (record.title || '').slice(0, 80) });
  }

  function tryRecord() {
    if (window.self !== window.top) return true;
    var store = detectStore(window.location.hostname);
    if (!store) return true;
    if (!isProductUrl(store, window.location.href)) return true;
    var info = extractProductInfo(store);
    if (!info) return false;
    var now = Date.now();
    var record = buildRecord(store, window.location.href, extractProductId(store, window.location.href), info.title, info.priceText, now);
    if (!record) return true;
    if (recordState.url === window.location.href && recordState.value === record.value) return true;
    recordState.url = window.location.href;
    recordState.value = record.value;
    commitRecord(record);
    return true;
  }

  function startRecording() {
    var attempts = 0;
    function tick() {
      attempts++;
      if (!tryRecord() && attempts < 12) setTimeout(tick, 800);
    }
    tryRecord();
    setTimeout(tick, 800);
    // SPA 页面切换后 URL 变化时重新尝试（定时轻量探测，仅商品页走 DOM 查询）。
    setInterval(function () {
      if (recordState.url !== window.location.href) recordState.url = null;
      tryRecord();
    }, 4000);
  }

// =====================================================================
// xload 面板通信通道（脚本侧 createChannel）—— 经过验证的通用实现
// ---------------------------------------------------------------------
// 出处与依据：
//   - greasyfork-416688-1（全局字体渲染增强，@grant none，页面上下文）回包走
//     event.source.postMessage 可用，通讯正常。
//   - scriptcat-1397-1（学术论文免费下载，@grant GM_*，油猴沙箱）回包走
//     event.source.postMessage 静默失败（沙箱内 event.source 可能为 null 或
//     不可回写），面板 getState 超时显示「独立模式」。
//   - 结论：回包必须「先经 panelWin（window.open 直接返回值）→ 再 event.source →
//     最后 BroadcastChannel 兜底」三级投递，才能同时在 页面上下文 与 沙箱 生效。
// 使用方式：复制本块到 <task_id>.user.js，channel 名固定 'xload-panel:' + taskId；
//   保持 CORE-START/CORE-END 之外即可，无需修改。配套 openPanel 参考下方示例。
// 本文件为模板，非成品脚本，不参与 check-output。
// =====================================================================

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

  // 沙箱安全投递：isolated world 中 window 方法 this 绑定可能失效，
  // 用 Function.prototype.call 显式绑定目标窗口，避免 Illegal invocation。
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
      // 回包三级投递：panelWin 最可靠（沙箱内 event.source 可能失效）→ event.source → BroadcastChannel
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

// ---- 面板入口（独立页弹窗：window.open + moveTo 居中，单例复用）--------
// PANEL_URL 按 task 固定：'https://xload.net/scripts/userscripts/' + taskId + '/panel.html'
// 示例（需要脚本自备 log()/restoreLogs()）：
//
// function openPanel() {
//   if (!isSafeUrl(PANEL_URL)) { log('panel.open.blocked', { url: PANEL_URL }); return false; }
//   restoreLogs();
//   // 单例：已打开且未关闭则复用聚焦，不重复 window.open
//   var existing = channel.getPanelWin();
//   if (existing && !existing.closed) {
//     try { existing.focus(); } catch (e) { /* ignore */ }
//     log('panel.reuse', {});
//     return true;
//   }
//   log('panel.open', { url: PANEL_URL });
//   try {
//     var W = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
//     var H = Math.min(780, Math.max(540, (window.screen.availHeight || 800) - 140));
//     var L = Math.max(0, Math.round(((window.screen.availWidth || 1280) - W) / 2));
//     var T = Math.max(0, Math.round(((window.screen.availHeight || 800) - H) / 2));
//     var features = 'popup=yes,width=' + W + ',height=' + H + ',left=' + L + ',top=' + T +
//       ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
//     var w = window.open(PANEL_URL, '_blank', features);
//     var result = { opened: !!w, requestedW: W, requestedH: H, left: L, top: T };
//     if (w) {
//       try { w.moveTo(L, T); w.resizeTo(W, H); } catch (e) { /* 跨源 popup 部分浏览器受限 */ }
//       channel.setPanelWin(w);
//     }
//     log('panel.open.result', result);
//     return !!w;
//   } catch (e) {
//     log('panel.open.error', { message: String(e && e.message || e) });
//     return false;
//   }
// }

// =====================================================================
// xload 聚合按钮组（FAB）共享模板 —— 经过验证的通用实现（v4 极简黑白 + 可折叠）
// ---------------------------------------------------------------------
// 特性：
//   1) 多按钮平铺在 list 中；**可折叠**——点击手柄收起/展开 item 列表，默认展开；
//   2) 整组可拖拽（拖手柄或组内空白处起拖；item 按钮点击与拖拽分离）；
//   3) 位置记忆：拖拽后保存，刷新/重开页面恢复；
//   4) 防出屏：拖拽时 clamp 到视口内；
//   5) 屏幕切换/窗口 resize/缩放：自动重新 clamp，按钮不会跑出屏幕外。
//   6) 折叠状态持久化（键 xload-fab-collapsed，默认展开）。
//   7) iframe 下不插入按钮：`window.self !== window.top`（脚本运行在 iframe 内）时
//      xloadFab() 直接返回空实现（不注入样式、不创建按钮、不绑事件），普通顶层页面才插入。
// 视觉：极简黑白（v4）——纯黑手柄（白底 x 徽标）、白卡片 item、直边高对比；
//       仅保留基础过渡：淡入、hover 黑白反色、折叠平滑收起，无花哨动画。
// 交互：手柄 cursor=pointer（点击=折叠/展开）；折叠在 pointerup 判断 downOnToggle 触发
//       （setPointerCapture 会把 click 重定向到 root，故不依赖 click 事件）。
// 使用方式：把本块复制到 <task_id>.user.js，然后在启动处调用：
//   var fab = xloadFab();
//   fab.addItem(TASK_ID, '按钮文案', function () { openPanel(); });
// 说明：同一页面多个 xload 脚本共用同一个 #xload-fab-root，重复调用幂等；
//   拖拽绑定与样式注入只做一次；位置经 localStorage（页面上下文）/ GM 值（沙箱）持久化。
// 本文件为模板，非成品脚本，不参与 check-output。
// =====================================================================

function xloadFab() {
  // iframe 内不插入按钮（普通顶层页面才插入）；返回空实现保持 API 兼容，调用方无需特判
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
    // 兼容旧协议：旧容器可能是「toggle+折叠list」结构，这里强制 list 展开
    var oldList = root.querySelector('[data-xload-fab-list]');
    if (oldList) { oldList.style.display = 'flex'; }
  } else {
    root = document.createElement('div');
    root.id = 'xload-fab-root';
    root.setAttribute('data-xload-fab-root', 'true');
    document.body.appendChild(root);
  }

  // ---------- 样式注入（幂等，scoped 到 #xload-fab-root，不污染页面；v3 覆盖旧版样式） ----------
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
  // 升级旧手柄结构（旧版带 xf-dots 三横线、无 caret）：补齐扁平化结构
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

  // ---------- 折叠状态（默认展开） ----------
  function setCollapsed(c) {
    collapsed = !!c;
    if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
    else { root.removeAttribute('data-xload-fab-collapsed'); }
    storeSet(COLLAPSE_KEY, collapsed);
  }
  function toggleCollapse() {
    setCollapsed(!collapsed);
    // 折叠状态变化后重新 clamp（宽度可能变化）
    var p = storeGet(POS_KEY, null);
    if (p && typeof p.x === 'number' && typeof p.y === 'number') { applyPos(p.x, p.y); }
  }

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

    // 初始折叠状态（只在首次初始化时恢复，幂等）
    collapsed = storeGet(COLLAPSE_KEY, false); // 默认 false = 展开
    if (collapsed) { root.setAttribute('data-xload-fab-collapsed', 'true'); }
    else { root.removeAttribute('data-xload-fab-collapsed'); }

    var dragging = false;
    var downOnToggle = false;
    var sx = 0, sy = 0, ox = 0, oy = 0;

    // 从手柄或组内空白处起拖；item 按钮上起按仅当移动超过阈值才进入拖拽（保留点击）
    root.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      var t = ev.target;
      // 用 closest 判断是否命中手柄（点击手柄内部文字/徽标/箭头也应视为手柄）
      var isToggle = !!(t && t.closest && t.closest('[data-xload-fab-toggle]'));
      var isItem = !!(t && t.closest && t.closest('[data-xload-fab-item]'));
      if (isItem && !isToggle) return; // item 按钮交给点击逻辑（item 自身 pointerdown 处理拖拽）
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
        // 在手柄上起按且未发生拖拽 = 点击手柄 → 折叠/展开。
        // 注意：setPointerCapture 会把派生的 click 事件重定向到 root，handle 上的 click 监听
        // 收不到，因此这里在 pointerup 直接处理，不依赖 click 事件（拖拽后 downOnToggle 判定自然屏蔽误触）。
        toggleCollapse();
      }
      downOnToggle = false;
    }
    root.addEventListener('pointerup', endDrag);
    // pointercancel（如系统手势抢占）：视为放弃本次按下，不触发折叠
    root.addEventListener('pointercancel', function () {
      if (!dragging) return;
      dragging = false;
      downOnToggle = false;
      movedFlag = false;
    });

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

  var channel = null;
  var fabItem = null;

  function updateFabLabel() {
    if (!fabItem) return;
    var label = fabItem.querySelector('.xf-dot + span');
    if (label) label.textContent = i18n.t('fab.label');
  }

  function isSelfHost(host) {
    var value = String(host || '').toLowerCase();
    return SELF_HOSTS.some(function (item) {
      return value === item || value.endsWith('.' + item);
    });
  }

  function isSafeUrl(value) {
    try {
      var parsed = new URL(value, window.location.href);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) { return false; }
  }

  function openPanel() {
    if (!isSafeUrl(PANEL_URL)) return false;
    var existing = channel.getPanelWin();
    if (existing && !existing.closed) {
      try { existing.focus(); } catch (e) { /* ignore */ }
      return true;
    }
    var width = Math.min(900, Math.max(480, (window.screen.availWidth || 1280) - 120));
    var height = Math.min(780, Math.max(540, (window.screen.availHeight || 800) - 140));
    var left = Math.max(0, Math.round(((window.screen.availWidth || 1280) - width) / 2));
    var top = Math.max(0, Math.round(((window.screen.availHeight || 800) - height) / 2));
    var features = 'popup=yes,width=' + width + ',height=' + height + ',left=' + left + ',top=' + top +
      ',menubar=no,toolbar=no,location=yes,status=yes,resizable=yes,scrollbars=yes';
    var panelWin = window.open(PANEL_URL, '_blank', features);
    if (panelWin) {
      try { panelWin.moveTo(left, top); panelWin.resizeTo(width, height); } catch (e) { /* ignore */ }
      channel.setPanelWin(panelWin);
    }
    log('panel.open', { opened: !!panelWin, width: width, height: height, left: left, top: top });
    return !!panelWin;
  }

  function init() {
    if (isSelfHost(window.location.hostname)) return;
    channel = createChannel(TASK_ID);
    window.addEventListener('error', function (event) {
      log('window.error', { message: event.message, file: event.filename, line: event.lineno, col: event.colno });
    });
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      log('window.unhandledrejection', { message: String(reason && reason.message || reason) });
      event.preventDefault();
    });
    channel.on('command', function (data, message) {
      if (data && data.action === 'setLanguage') {
        var preference = i18n.setLocale(data.locale);
        updateFabLabel();
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: preference });
        return;
      }
      if (data && data.action === 'getState') {
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: i18n.getPreference() });
        return;
      }
      if (data && data.action === 'getSnapshot') {
        var snap = readData();
        snap.products = pruneProducts(snap.products, snap.settings.retentionDays, Date.now());
        channel.reply(message, {
          ok: true,
          settings: { retentionDays: snap.settings.retentionDays, showBadge: snap.settings.showBadge },
          products: buildViewModel(snap.products)
        });
        return;
      }
      if (data && data.action === 'saveSettings') {
        var d = readData();
        d.settings.retentionDays = validateRetentionDays(data && data.retentionDays);
        if (typeof data.showBadge === 'boolean') d.settings.showBadge = data.showBadge;
        d.products = pruneProducts(d.products, d.settings.retentionDays, Date.now());
        writeData(d);
        clearBadge();
        log('settings.save', { retentionDays: d.settings.retentionDays, showBadge: d.settings.showBadge });
        channel.reply(message, { ok: true, settings: { retentionDays: d.settings.retentionDays, showBadge: d.settings.showBadge } });
        return;
      }
      if (data && data.action === 'clearHistory') {
        var c = readData();
        c.products = {};
        writeData(c);
        recordState.url = null;
        recordState.value = null;
        log('history.clear', {});
        channel.reply(message, { ok: true });
        return;
      }
      if (data && data.action === 'removeProduct') {
        var r = readData();
        if (data && data.key && r.products[data.key]) {
          delete r.products[data.key];
          writeData(r);
          log('history.remove', { key: data.key });
        }
        channel.reply(message, { ok: true, products: buildViewModel(r.products) });
        return;
      }
      if (data && data.action === 'getLogs') {
        channel.reply(message, { ok: true, logs: readLogs() });
        return;
      }
      channel.reply(message, { ok: false, error: i18n.t('error.unknown') });
    });
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    log('init', { href: window.location.href });
    startRecording();
  }

  init();
})();
