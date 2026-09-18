// ==UserScript==
// @name         YouTube CPU Tamer – Reduce CPU Usage and Battery Drain
// @name:en      YouTube CPU Tamer – Reduce CPU Usage and Battery Drain
// @name:zh-CN   YouTube CPU Tamer：降低 YouTube CPU 占用与耗电
// @name:zh-TW   YouTube CPU Tamer：降低 YouTube CPU 占用與耗電
// @namespace    https://xload.net/
// @version      2026.9.18.3
// @description  Reduces YouTube's CPU usage and battery drain on watch, home, embedded, and Music pages by aligning timers with the browser's rendering cycle.
// @description:en      Reduces YouTube's CPU usage and battery drain on watch, home, embedded, and Music pages by aligning timers with the browser's rendering cycle.
// @description:zh-CN   通过把定时器与浏览器渲染帧对齐，减少 YouTube 页面后台任务执行，从而降低 CPU 占用与电池消耗。
// @description:zh-TW   透過將計時器與瀏覽器渲染幀對齊，減少 YouTube 頁面背景任務執行，進而降低 CPU 占用與電池消耗。
// @homepageURL  https://xload.net/scripts/userscripts/xload-f023e122/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://youtube.com/*
// @match        *://*.youtube.com/*
// @match        *://music.youtube.com/*
// @match        *://*.music.youtube.com/*
// @match        *://youtube-nocookie.com/*
// @match        *://*.youtube-nocookie.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// @allFrames    true
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-f023e122';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-f023e122/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-f023e122-logs';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "YouTube CPU Tamer – Reduce CPU Usage and Battery Drain",
    "short": "Reduces YouTube's CPU usage and battery drain on watch, home, embedded, and Music pages by aligning timers with the browser's rendering cycle.",
    "panel.documentTitle": "YouTube CPU Tamer – Reduce CPU Usage and Battery Drain - Panel",
    "fab.label": "YouTube CPU Tamer – Reduce CPU Usage and Battery Drain",
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
    "cpuTamer.title": "Timer throttling",
    "cpuTamer.desc": "Reduces YouTube CPU usage by aligning short, high-frequency page timers with the browser rendering frame.",
    "cpuTamer.toggle.general": "Enable timer throttling",
    "cpuTamer.toggle.generalDesc": "Turn the module on or off. Disabling restores YouTube's original setTimeout and setInterval.",
    "cpuTamer.throttleLevel": "Throttle strength",
    "cpuTamer.throttleDesc": "Lower is closer to native behavior; higher skips more rendering frames to save CPU.",
    "cpuTamer.level.low": "Low",
    "cpuTamer.level.medium": "Medium",
    "cpuTamer.level.high": "High",
    "cpuTamer.scope": "Page scope",
    "cpuTamer.scope.watch": "Watch page",
    "cpuTamer.scope.home": "Home / browse",
    "cpuTamer.scope.embed": "Embedded player",
    "cpuTamer.scope.music": "YouTube Music",
    "cpuTamer.scope.chat": "Live chat",
    "cpuTamer.scope.other": "Other",
    "cpuTamer.status": "Throttle status",
    "cpuTamer.status.active": "Active",
    "cpuTamer.status.inactive": "Inactive",
    "cpuTamer.status.unavailable": "Unavailable",
    "cpuTamer.error.noRaf": "Graphics acceleration is unavailable, so timer throttling is disabled. Enable hardware acceleration in your browser settings.",
    "cpuTamer.action.restore": "Restore native timers",
    "cpuTamer.action.restored": "Native timers restored",
    "cpuTamer.logs": "Runtime log",
    "cpuTamer.logs.copy": "Copy log",
    "cpuTamer.logs.copied": "Log copied",
    "status.label": "Connection",
    "status.connected": "Connected",
    "status.unconnected": "Not connected"
  },
  "zh-CN": {
    "title": "YouTube CPU Tamer：降低 YouTube CPU 占用与耗电",
    "short": "通过把定时器与浏览器渲染帧对齐，减少 YouTube 页面后台任务执行，从而降低 CPU 占用与电池消耗。",
    "panel.documentTitle": "YouTube CPU Tamer：降低 YouTube CPU 占用与耗电 - 功能面板",
    "fab.label": "YouTube CPU Tamer：降低 YouTube CPU 占用与耗电",
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
    "cpuTamer.title": "定时器节流",
    "cpuTamer.desc": "把短延迟、高频的页面定时器对齐到浏览器渲染帧，降低 YouTube CPU 占用。",
    "cpuTamer.toggle.general": "启用定时器节流",
    "cpuTamer.toggle.generalDesc": "开或关本模块。关闭后恢复 YouTube 原生的 setTimeout 与 setInterval。",
    "cpuTamer.throttleLevel": "节流强度",
    "cpuTamer.throttleDesc": "越低越接近原生行为；越高跳过越多渲染帧以节省 CPU。",
    "cpuTamer.level.low": "低",
    "cpuTamer.level.medium": "中",
    "cpuTamer.level.high": "高",
    "cpuTamer.scope": "页面作用域",
    "cpuTamer.scope.watch": "观看页",
    "cpuTamer.scope.home": "首页 / 浏览",
    "cpuTamer.scope.embed": "嵌入式播放器",
    "cpuTamer.scope.music": "YouTube Music",
    "cpuTamer.scope.chat": "直播聊天",
    "cpuTamer.scope.other": "其他",
    "cpuTamer.status": "节流状态",
    "cpuTamer.status.active": "已启用",
    "cpuTamer.status.inactive": "已关闭",
    "cpuTamer.status.unavailable": "不可用",
    "cpuTamer.error.noRaf": "图形加速不可用，因此定时器节流已禁用。请在浏览器设置中开启硬件加速。",
    "cpuTamer.action.restore": "恢复原生定时器",
    "cpuTamer.action.restored": "已恢复原生定时器",
    "cpuTamer.logs": "运行日志",
    "cpuTamer.logs.copy": "复制日志",
    "cpuTamer.logs.copied": "日志已复制",
    "status.label": "连接状态",
    "status.connected": "已连接",
    "status.unconnected": "未连接"
  },
  "zh-TW": {
    "title": "YouTube CPU Tamer：降低 YouTube CPU 占用與耗電",
    "short": "透過將計時器與瀏覽器渲染幀對齊，減少 YouTube 頁面背景任務執行，進而降低 CPU 占用與電池消耗。",
    "panel.documentTitle": "YouTube CPU Tamer：降低 YouTube CPU 占用與耗電 - 功能面板",
    "fab.label": "YouTube CPU Tamer：降低 YouTube CPU 占用與耗電",
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
    "cpuTamer.title": "計時器節流",
    "cpuTamer.desc": "把短延遲、高頻的頁面計時器對齊到瀏覽器渲染幀，降低 YouTube CPU 占用。",
    "cpuTamer.toggle.general": "啟用計時器節流",
    "cpuTamer.toggle.generalDesc": "開或關本模組。關閉後恢復 YouTube 原生的 setTimeout 與 setInterval。",
    "cpuTamer.throttleLevel": "節流強度",
    "cpuTamer.throttleDesc": "越低越接近原生行為；越高跳過越多渲染幀以節省 CPU。",
    "cpuTamer.level.low": "低",
    "cpuTamer.level.medium": "中",
    "cpuTamer.level.high": "高",
    "cpuTamer.scope": "頁面作用域",
    "cpuTamer.scope.watch": "觀看頁",
    "cpuTamer.scope.home": "首頁 / 瀏覽",
    "cpuTamer.scope.embed": "嵌入式播放器",
    "cpuTamer.scope.music": "YouTube Music",
    "cpuTamer.scope.chat": "直播聊天",
    "cpuTamer.scope.other": "其他",
    "cpuTamer.status": "節流狀態",
    "cpuTamer.status.active": "已啟用",
    "cpuTamer.status.inactive": "已關閉",
    "cpuTamer.status.unavailable": "不可用",
    "cpuTamer.error.noRaf": "圖形加速不可用，因此計時器節流已停用。請在瀏覽器設定中開啟硬體加速。",
    "cpuTamer.action.restore": "恢復原生計時器",
    "cpuTamer.action.restored": "已恢復原生計時器",
    "cpuTamer.logs": "執行紀錄",
    "cpuTamer.logs.copy": "複製紀錄",
    "cpuTamer.logs.copied": "紀錄已複製",
    "status.label": "連線狀態",
    "status.connected": "已連線",
    "status.unconnected": "未連線"
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
  // —— CPU Tamer 调度核心纯函数（无 DOM / 无副作用，可独立单测）——

  // 节流强度 → 帧对齐间隔：每隔多少帧执行一次到期队列（1=每帧最轻，3=每 3 帧最强）
  var THROTTLE_FRAME_INTERVAL = { low: 1, medium: 2, high: 3 };

  function normalizeLevel(level) {
    if (level === 'low' || level === 'high') return level;
    return 'medium';
  }

  function throttleInterval(level) {
    var value = THROTTLE_FRAME_INTERVAL[normalizeLevel(level)];
    return typeof value === 'number' ? value : 2;
  }

  // 页面作用域判定：music / embed / watch / chat / home（音乐域名优先于路径）
  function resolveScope(host, path) {
    var h = String(host || '').toLowerCase();
    var p = String(path || '');
    if (h.indexOf('music.youtube') >= 0) return 'music';
    if (p.indexOf('/embed') === 0) return 'embed';
    if (p.indexOf('/watch') === 0) return 'watch';
    if (p.indexOf('/live_chat') === 0 || p.indexOf('/live_chat_replay') === 0) return 'chat';
    return 'home';
  }

  // 原始延迟分桶：0=立即 1=短帧对齐 2=中 3=长；桶越小应越早执行
  function bucketFor(delay, level) {
    var d = Number(delay);
    if (!isFinite(d) || d < 0) d = 0;
    var interval = throttleInterval(level);
    if (d <= 0) return 0;
    if (d <= interval * 16) return 1;
    if (d <= interval * 50) return 2;
    return 3;
  }

  // 是否纳入帧对齐调度：只在短延迟高频桶上节流，长延迟直接走原生避免误伤
  function shouldAlign(delay, level) {
    return bucketFor(delay, level) <= 1;
  }

  // 回调是否可延后：仅函数可进入队列；字符串（eval）等非函数直接透传
  function isDeferrable(callback, source) {
    if (typeof callback !== 'function') return false;
    if (source === 'protected') return false; // rAF 驱动 / 白名单任务不延后
    return true;
  }

  // 调度状态机：推进一帧，返回 { frame, skip, due }。skip 帧不扫队列以省 CPU；due 为到期任务对象数组。
  function tick(state) {
    var interval = throttleInterval(state && state.level);
    var frame = ((state && state.frame) || 0) + 1;
    var skip = interval > 1 && (frame % interval) !== 0;
    var due = [];
    if (!skip) {
      var now = (state && state.now) || 0;
      var tasks = (state && state.tasks) || [];
      for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        if (task && task.nextDue != null && task.nextDue <= now) due.push(task);
      }
    }
    return { frame: frame, skip: skip, due: due };
  }
  // CORE-END

  // =====================================================================
  // 任务实现：YouTube CPU Tamer —— 页面定时器帧对齐调度 + 面板命令
  // =====================================================================

  // 页面上下文：沙箱隔离下用 unsafeWindow 直接覆写页面全局定时器
  var page = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(TASK_ID + ':' + key, fallback) : fallback; }
    catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try { if (typeof GM_setValue === 'function') GM_setValue(TASK_ID + ':' + key, value); } catch (e) { /* ignore */ }
  }

  function detectGpu() {
    try {
      var canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  var rafAvailable = false;
  var gpuAvailable = false;
  try { rafAvailable = typeof page.requestAnimationFrame === 'function'; } catch (e) { rafAvailable = false; }
  try { gpuAvailable = detectGpu(); } catch (e) { gpuAvailable = false; }

  var nativeRAF = null;
  var nativeCancelRAF = null;
  try {
    nativeRAF = rafAvailable ? page.requestAnimationFrame.bind(page) : null;
    nativeCancelRAF = typeof page.cancelAnimationFrame === 'function' ? page.cancelAnimationFrame.bind(page) : null;
  } catch (e) { nativeRAF = null; nativeCancelRAF = null; }

  var nativeSetTimeout = null;
  var nativeSetInterval = null;
  var nativeClearTimeout = null;
  var nativeClearInterval = null;

  var tamerTasks = {};
  var tamerNextId = 1;
  var scheduler = { frame: 0, level: 'medium' };
  var tamerInstalled = false;
  var tamerEnabled = true;
  var tamerCount = 0;
  var rafId = 0;
  var settings = { enabled: true, throttleLevel: 'medium' };

  function loadSettings() {
    settings.enabled = gmGet('cpuTamer:enabled', true) !== false;
    settings.throttleLevel = normalizeLevel(gmGet('cpuTamer:throttleLevel', 'medium'));
  }

  function hasTask(id) {
    return Object.prototype.hasOwnProperty.call(tamerTasks, id);
  }

  function taskArray() {
    var out = [];
    for (var k in tamerTasks) if (hasTask(k)) out.push(tamerTasks[k]);
    return out;
  }

  function taskCount() {
    var n = 0;
    for (var k in tamerTasks) if (hasTask(k)) n++;
    return n;
  }

  function scheduleDeferred(fn, delay, isInterval, args) {
    var id = tamerNextId++;
    var d = Number(delay);
    if (!isFinite(d) || d < 0) d = 0;
    if (isInterval && d < 4) d = 4;
    tamerTasks[id] = { id: id, fn: fn, args: args || [], delay: d, interval: !!isInterval, nextDue: Date.now() + d, lastRun: 0 };
    tamerCount++;
    if (tamerCount > 8192) {
      log('tamer.overload', { reason: 'deferredCount exceeded safety cap' });
      restoreNative();
      return id;
    }
    return id;
  }

  function canIntercept() {
    return tamerInstalled && tamerEnabled && rafAvailable && gpuAvailable;
  }

  function wrapTimerSetter(nativeFn, isInterval) {
    return function (callback, delay) {
      if (!canIntercept()) return nativeFn.apply(page, arguments);
      if (!isDeferrable(callback, null)) return nativeFn.apply(page, arguments);
      if (!shouldAlign(delay, scheduler.level)) return nativeFn.apply(page, arguments);
      var args = Array.prototype.slice.call(arguments, 2);
      return scheduleDeferred(callback, delay, isInterval, args);
    };
  }

  function wrapClear(nativeFn) {
    return function (id) {
      if (id != null && hasTask(id)) {
        delete tamerTasks[id];
        tamerCount = Math.max(0, tamerCount - 1);
        return undefined;
      }
      return nativeFn.call(page, id);
    };
  }

  function flush(due, now) {
    for (var i = 0; i < due.length; i++) {
      var task = due[i];
      if (!hasTask(task.id)) continue;
      tamerTasks[task.id].lastRun = now;
      try { task.fn.apply(undefined, task.args); }
      catch (e) { log('tamer.task.error', { message: String(e && e.message || e) }); }
      if (task.interval && hasTask(task.id)) {
        tamerTasks[task.id].nextDue = now + (task.delay || 4);
      } else if (!task.interval) {
        delete tamerTasks[task.id];
        tamerCount = Math.max(0, tamerCount - 1);
      }
    }
  }

  function frameLoop() {
    if (!tamerInstalled) { rafId = 0; return; }
    var now = Date.now();
    var result = tick({ frame: scheduler.frame, now: now, level: scheduler.level, tasks: taskArray() });
    scheduler.frame = result.frame;
    if (!result.skip) flush(result.due, now);
    rafId = nativeRAF ? nativeRAF(frameLoop) : 0;
  }

  function startLoop() {
    if (rafId || !nativeRAF) return;
    rafId = nativeRAF(frameLoop);
  }

  function stopLoop() {
    if (rafId && nativeCancelRAF) { try { nativeCancelRAF(rafId); } catch (e) { /* ignore */ } }
    rafId = 0;
  }

  function installProxy() {
    if (tamerInstalled) return;
    try {
      nativeSetTimeout = page.setTimeout;
      nativeSetInterval = page.setInterval;
      nativeClearTimeout = page.clearTimeout;
      nativeClearInterval = page.clearInterval;
      page.setTimeout = wrapTimerSetter(nativeSetTimeout, false);
      page.setInterval = wrapTimerSetter(nativeSetInterval, true);
      page.clearTimeout = wrapClear(nativeClearTimeout);
      page.clearInterval = wrapClear(nativeClearInterval);
      tamerInstalled = true;
      startLoop();
      log('tamer.install', { scope: resolveScope(window.location.hostname, window.location.pathname) });
    } catch (e) {
      log('tamer.install.error', { message: String(e && e.message || e) });
    }
  }

  function restoreNative() {
    if (!tamerInstalled) return;
    try {
      stopLoop();
      page.setTimeout = nativeSetTimeout;
      page.setInterval = nativeSetInterval;
      page.clearTimeout = nativeClearTimeout;
      page.clearInterval = nativeClearInterval;
    } catch (e) { /* ignore */ }
    tamerTasks = {};
    tamerCount = 0;
    tamerInstalled = false;
    log('tamer.restore', {});
  }

  function applyEnabled() {
    if (tamerEnabled) {
      if (rafAvailable && gpuAvailable && !tamerInstalled) installProxy();
    } else {
      restoreNative();
    }
  }

  function getTamerStatus() {
    return {
      ok: true,
      page: window.location.href,
      scope: resolveScope(window.location.hostname, window.location.pathname),
      general: tamerEnabled,
      throttleLevel: settings.throttleLevel,
      rafAvailable: rafAvailable,
      gpuAvailable: gpuAvailable,
      installed: tamerInstalled,
      deferredCount: taskCount()
    };
  }

  function handleCommand(data, message) {
    if (!message || !message._request || message._id == null || message._from !== TASK_ID) return;
    var action = data && data.action;
    log('channel.command', { action: action });
    try {
      if (action === 'setLanguage' || action === 'setLocale') {
        var preference = i18n.setLocale(data && data.locale);
        updateFabLabel();
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: preference });
        return;
      }
      if (action === 'getState') {
        channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: i18n.getPreference() });
        return;
      }
      if (action === 'getStatus') {
        channel.reply(message, getTamerStatus());
        return;
      }
      if (action === 'setModule') {
        if (data && data.module === 'general') {
          settings.enabled = !!data.enabled;
          tamerEnabled = settings.enabled;
          gmSet('cpuTamer:enabled', settings.enabled);
          applyEnabled();
          channel.reply(message, { ok: true, general: tamerEnabled, installed: tamerInstalled, status: getTamerStatus() });
          channel.send('done', getTamerStatus());
          return;
        }
        channel.reply(message, { ok: false, error: 'INVALID_MODULE' });
        return;
      }
      if (action === 'setThrottleLevel') {
        var level = normalizeLevel(data && data.level);
        settings.throttleLevel = level;
        scheduler.level = level;
        gmSet('cpuTamer:throttleLevel', level);
        channel.reply(message, { ok: true, throttleLevel: level, status: getTamerStatus() });
        channel.send('done', getTamerStatus());
        return;
      }
      if (action === 'restore') {
        tamerEnabled = false;
        settings.enabled = false;
        gmSet('cpuTamer:enabled', false);
        restoreNative();
        channel.reply(message, { ok: true, installed: false, status: getTamerStatus() });
        channel.send('done', getTamerStatus());
        return;
      }
      if (action === 'getLogs') {
        var logs = [];
        try { logs = JSON.parse(window.localStorage.getItem(LOG_KEY) || '[]').slice(-60); } catch (e) { logs = []; }
        channel.reply(message, { ok: true, logs: logs });
        return;
      }
      channel.reply(message, { ok: false, error: 'UNKNOWN_COMMAND' });
    } catch (e) {
      channel.reply(message, { ok: false, error: String(e && e.message || e) });
    }
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

    loadSettings();
    tamerEnabled = settings.enabled;
    scheduler.level = settings.throttleLevel;
    if (tamerEnabled && rafAvailable && gpuAvailable) installProxy();

    channel.on('command', handleCommand);

    function mountFab() {
      var fab = xloadFab();
      fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
      updateFabLabel();
    }
    if (document.body) mountFab();
    else document.addEventListener('DOMContentLoaded', mountFab, { once: true });

    log('init', {
      href: window.location.href,
      scope: resolveScope(window.location.hostname, window.location.pathname),
      installed: tamerInstalled,
      raf: rafAvailable,
      gpu: gpuAvailable
    });
  }

  init();
})();
