// ==UserScript==
// @name         GitHub Git Clone Accelerator and SSH Address Copy
// @name:en      GitHub Git Clone Accelerator and SSH Address Copy
// @name:zh-CN   GitHub 克隆加速：一键复制 git clone 命令与 SSH 地址
// @name:zh-TW   GitHub Clone 加速：一鍵複製 git clone 命令與 SSH 位址
// @namespace    https://xload.net/
// @version      2026.9.18.6
// @description  Adds accelerated HTTPS and SSH clone addresses to the GitHub clone panel and copies a complete git clone command in one click.
// @description:en      Adds accelerated HTTPS and SSH clone addresses to the GitHub clone panel and copies a complete git clone command in one click.
// @description:zh-CN   在 GitHub 克隆面板中提供加速的 HTTPS 与 SSH 地址，并一键复制完整 git clone 命令。
// @description:zh-TW   在 GitHub 複製面板中提供加速的 HTTPS 與 SSH 位址，並一鍵複製完整 git clone 命令。
// @homepageURL  https://xload.net/scripts/userscripts/xload-c58e4d54/
// @supportURL   https://github.com/u2222223/xload/issues
// @match        *://github.com/*
// @match        *://*.github.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // XLOAD:DISCOVERY-QUALITY:REQUIRED

  var TASK_ID = 'xload-c58e4d54';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-c58e4d54/panel.html';
  var SELF_HOSTS = ['xload.net', 'u2222223.github.io'];
  var LOG_KEY = 'xload-c58e4d54-logs';
  var CONFIG_KEY = 'xload-c58e4d54:config';

  var I18N_DICT =
/* XLOAD-I18N-DICT-START */
{
  "en": {
    "title": "GitHub Git Clone Accelerator and SSH Address Copy",
    "short": "Adds accelerated HTTPS and SSH clone addresses to the GitHub clone panel and copies a complete git clone command in one click.",
    "panel.documentTitle": "GitHub Git Clone Accelerator and SSH Address Copy - Panel",
    "fab.label": "GitHub Git Clone Accelerator and SSH Address Copy",
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
    "control.reset": "Reset defaults",
    "notice": "Notice",
    "close": "Close",
    "timeout": "The original page did not respond",
    "error.pageUnresponsive": "The original page did not respond",
    "clone.protocol_https": "HTTPS",
    "clone.protocol_ssh": "SSH",
    "clone.original": "Original",
    "clone.accelerated": "Accelerated",
    "clone.copy": "Copy command",
    "clone.auto_copy": "Auto prepend git clone",
    "clone.command_preview": "Command preview",
    "mirror.add": "Add mirror",
    "mirror.custom": "Custom mirror",
    "mirror.delete": "Delete",
    "mirror.enable": "Enable",
    "mirror.disable": "Disable",
    "mirror.region": "Region",
    "state.copied": "Copied",
    "state.preview": "Preview",
    "state.noMirrors": "No mirrors enabled",
    "err.clipboard_denied": "Clipboard permission denied",
    "err.page_not_ready": "Clone panel not ready",
    "err.invalidUrl": "Invalid URL",
    "err.noRepo": "Cannot detect repository path",
    "help.clone": "Click any address to copy. The panel lets you switch protocol, toggle auto copy, and manage mirrors.",
    "help.mirror": "Enter a HTTPS proxy base URL (e.g. https://ghproxy.org) or a SSH prefix (e.g. ssh://git@host:443/)."
  },
  "zh-CN": {
    "title": "GitHub 克隆加速：一键复制 git clone 命令与 SSH 地址",
    "short": "在 GitHub 克隆面板中提供加速的 HTTPS 与 SSH 地址，并一键复制完整 git clone 命令。",
    "panel.documentTitle": "GitHub 克隆加速：一键复制 git clone 命令与 SSH 地址 - 功能面板",
    "fab.label": "GitHub 克隆加速：一键复制 git clone 命令与 SSH 地址",
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
    "control.reset": "恢复默认",
    "notice": "提示",
    "close": "关闭",
    "timeout": "原页面未响应",
    "error.pageUnresponsive": "原页面未响应",
    "clone.protocol_https": "HTTPS",
    "clone.protocol_ssh": "SSH",
    "clone.original": "原始地址",
    "clone.accelerated": "加速地址",
    "clone.copy": "复制命令",
    "clone.auto_copy": "自动添加 git clone",
    "clone.command_preview": "命令预览",
    "mirror.add": "添加镜像",
    "mirror.custom": "自定义镜像",
    "mirror.delete": "删除",
    "mirror.enable": "启用",
    "mirror.disable": "停用",
    "mirror.region": "地区",
    "state.copied": "已复制",
    "state.preview": "预览",
    "state.noMirrors": "没有启用的镜像",
    "err.clipboard_denied": "剪贴板权限被拒绝",
    "err.page_not_ready": "克隆面板未就绪",
    "err.invalidUrl": "地址格式无效",
    "err.noRepo": "无法识别仓库路径",
    "help.clone": "点击任意地址即可复制。面板可切换协议、开关自动复制、管理镜像。",
    "help.mirror": "输入 HTTPS 代理基础地址（如 https://ghproxy.org）或 SSH 前缀（如 ssh://git@host:443/）。"
  },
  "zh-TW": {
    "title": "GitHub Clone 加速：一鍵複製 git clone 命令與 SSH 位址",
    "short": "在 GitHub 複製面板中提供加速的 HTTPS 與 SSH 位址，並一鍵複製完整 git clone 命令。",
    "panel.documentTitle": "GitHub Clone 加速：一鍵複製 git clone 命令與 SSH 位址 - 功能面板",
    "fab.label": "GitHub Clone 加速：一鍵複製 git clone 命令與 SSH 位址",
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
    "control.reset": "恢復預設",
    "notice": "提示",
    "close": "關閉",
    "timeout": "原頁面未回應",
    "error.pageUnresponsive": "原頁面未回應",
    "clone.protocol_https": "HTTPS",
    "clone.protocol_ssh": "SSH",
    "clone.original": "原始位址",
    "clone.accelerated": "加速位址",
    "clone.copy": "複製命令",
    "clone.auto_copy": "自動加入 git clone",
    "clone.command_preview": "命令預覽",
    "mirror.add": "加入鏡像",
    "mirror.custom": "自訂鏡像",
    "mirror.delete": "刪除",
    "mirror.enable": "啟用",
    "mirror.disable": "停用",
    "mirror.region": "地區",
    "state.copied": "已複製",
    "state.preview": "預覽",
    "state.noMirrors": "沒有啟用的鏡像",
    "err.clipboard_denied": "剪貼簿權限被拒絕",
    "err.page_not_ready": "複製面板未就緒",
    "err.invalidUrl": "位址格式無效",
    "err.noRepo": "無法識別倉庫路徑",
    "help.clone": "點擊任意位址即可複製。面板可切換協定、開關自動複製、管理鏡像。",
    "help.mirror": "輸入 HTTPS 代理基礎位址（如 https://ghproxy.org）或 SSH 前綴（如 ssh://git@host:443/）。"
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
  function detectCloneProtocol(url) {
    var value = String(url || '');
    if (/^https?:\/\//i.test(value)) return 'https';
    if (/^git@/i.test(value) || /^ssh:\/\//i.test(value)) return 'ssh';
    return 'unknown';
  }

  function parseRepoPath(url, protocol) {
    var value = String(url || '');
    if (protocol === 'https') {
      var m = value.match(/^https?:\/\/[^\/]+(\/[^\/]+\/[^\/]+?)(?:\.git)?(?:[?#].*)?$/i);
      if (m) return m[1].replace(/^\/+/, '');
    } else if (protocol === 'ssh') {
      var m = value.match(/^git@[^:]+:([^\/]+\/[^\/]+?)(?:\.git)?(?:[?#].*)?$/i);
      if (m) return m[1];
      m = value.match(/^ssh:\/\/[^\/]+\/([^\/]+\/[^\/]+?)(?:\.git)?(?:[?#].*)?$/i);
      if (m) return m[1];
    }
    return null;
  }

  function normalizeMirrorPrefix(prefix, protocol) {
    var value = String(prefix || '').trim().replace(/\/+$/, '');
    if (!value) return null;
    if (protocol === 'https') {
      if (!/^https?:\/\//i.test(value)) return null;
      return value;
    }
    if (protocol === 'ssh') {
      if (/^ssh:\/\//i.test(value)) return value;
      if (/^git@[^:]+:/i.test(value)) return value;
      return null;
    }
    return null;
  }

  function buildAcceleratedUrl(repoPath, mirror) {
    if (!repoPath || !mirror || !mirror.prefix) return null;
    var path = String(repoPath).replace(/^\/+/, '');
    if (mirror.protocol === 'https') {
      var base = String(mirror.prefix).replace(/\/+$/, '');
      if (base === 'https://gitclone.com') {
        return 'https://gitclone.com/github.com/' + path;
      }
      if (/^https?:\/\/[^\/]+\/https?:\/\//i.test(base)) {
        return base + '/' + path;
      }
      return base + '/https://github.com/' + path;
    }
    if (mirror.protocol === 'ssh') {
      return String(mirror.prefix).replace(/\/+$/, '') + '/' + path;
    }
    return null;
  }

  function buildCloneCommand(address, includeGitClone) {
    var value = String(address || '');
    if (!value) return '';
    return (includeGitClone ? 'git clone ' : '') + value;
  }

  function isAllowedUrl(value) {
    var text = String(value || '').trim();
    if (!text) return false;
    if (/^(javascript|data|vbscript):/i.test(text)) return false;
    return /^(https?:|ssh:|git@)/i.test(text);
  }

  function migrateConfig(config) {
    var defaults = {
      version: 1,
      protocol: 'https',
      autoCopy: true,
      disabledIds: [],
      customMirrors: []
    };
    if (!config || typeof config !== 'object') return defaults;
    var result = {
      version: 1,
      protocol: config.protocol === 'ssh' ? 'ssh' : 'https',
      autoCopy: config.autoCopy !== false,
      disabledIds: Array.isArray(config.disabledIds) ? config.disabledIds : [],
      customMirrors: Array.isArray(config.customMirrors) ? config.customMirrors.filter(function (m) {
        return m && typeof m === 'object' && m.id && m.prefix;
      }) : []
    };
    return result;
  }
  // CORE-END

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
// xload 聚合按钮组（FAB）共享模板 —— 经过验证的通用实现（v5 D0 极简黑白静态 · 可折叠）
// ---------------------------------------------------------------------
// 视觉权威：_preview/fab-panel-preview.html（D0 极简黑白，黑白高对比 · 无动效）。
//   v5 相对 v4：移除入场淡入动画与所有 transition（折叠即时收起），根节点
//   min-width/font-size 对齐预览；hover 仅做即时黑白反色，不属于动效。
// 特性：
//   1) 多按钮平铺在 list 中；**可折叠**——点击手柄收起/展开 item 列表，默认展开；
//   2) 整组可拖拽（拖手柄或组内空白处起拖；item 按钮点击与拖拽分离）；
//   3) 位置记忆：拖拽后保存，刷新/重开页面恢复；
//   4) 防出屏：拖拽时 clamp 到视口内；
//   5) 屏幕切换/窗口 resize/缩放：自动重新 clamp，按钮不会跑出屏幕外。
//   6) 折叠状态持久化（键 xload-fab-collapsed，默认展开）。
//   7) iframe 下不插入按钮：`window.self !== window.top`（脚本运行在 iframe 内）时
//      xloadFab() 直接返回空实现（不注入样式、不创建按钮、不绑事件），普通顶层页面才插入。
// 视觉：D0 极简黑白（v5，对齐 _preview/fab-panel-preview.html）——
//       纯黑手柄（白底 x 徽标）、白卡片 item、直边高对比；无入场动画、无过渡。
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
  if (!root) {
    root = document.createElement('div');
    root.id = 'xload-fab-root';
    root.setAttribute('data-xload-fab-root', 'true');
    document.body.appendChild(root);
  }

  // ---------- 样式注入（幂等，scoped 到 #xload-fab-root，不污染页面；v5 覆盖旧版样式） ----------
  var oldStyle = root.querySelector('style[data-xload-fab-style]');
  if (oldStyle && oldStyle.getAttribute('data-xload-fab-style-version') !== '5') {
    oldStyle.parentNode.removeChild(oldStyle);
    oldStyle = null;
  }
  if (!oldStyle) {
    var st = document.createElement('style');
    st.setAttribute('data-xload-fab-style', '');
    st.setAttribute('data-xload-fab-style-version', '5');
    st.textContent =
      '#xload-fab-root{' +
        'position:fixed;right:16px;bottom:140px;z-index:2147483000;' +
        'display:flex;flex-direction:column;gap:2px;' +
        'min-width:176px;max-width:240px;padding:6px;box-sizing:border-box;' +
        'background:#fff;' +
        'border:1px solid #e5e5e5;border-radius:6px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.08);' +
        'font-size:13px;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Roboto,Helvetica,Arial,sans-serif;' +
        'user-select:none;-webkit-user-select:none;touch-action:none;' +
      '}' +
      '#xload-fab-root button{width:100%;padding:9px 10px;border:0;border-radius:4px;font:inherit;text-align:left;}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"]{padding:4px;}' +
      '#xload-fab-root [data-xload-fab-toggle]{' +
        'display:flex;align-items:center;gap:8px;cursor:pointer;' +
        'background:#111;color:#fff;font-weight:700;line-height:1;' +
      '}' +
      '#xload-fab-root [data-xload-fab-toggle]:hover{background:#000;}' +
      '#xload-fab-root .xf-brand{' +
        'display:inline-flex;align-items:center;justify-content:center;flex:none;' +
        'width:20px;height:20px;border-radius:3px;background:#fff;color:#000;' +
        'font-size:11px;' +
      '}' +
      '#xload-fab-root .xf-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#xload-fab-root .xf-caret{' +
        'flex:none;width:6px;height:6px;' +
        'border-right:1.5px solid #fff;border-bottom:1.5px solid #fff;' +
        'transform:rotate(45deg);' +
      '}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"] .xf-caret{transform:rotate(-135deg);}' +
      '#xload-fab-root [data-xload-fab-list]{display:flex;flex-direction:column;gap:2px;}' +
      '#xload-fab-root[data-xload-fab-collapsed="true"] [data-xload-fab-list]{display:none;}' +
      '#xload-fab-root [data-xload-fab-item]{' +
        'display:flex;align-items:center;gap:9px;cursor:pointer;' +
        'background:#fff;color:#111;font-weight:500;line-height:1;' +
      '}' +
      '#xload-fab-root [data-xload-fab-item]:hover{background:#111;color:#fff;}' +
      '#xload-fab-root .xf-dot{' +
        'width:7px;height:7px;border-radius:50%;flex:none;background:#111;' +
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

  // ---------- 配置与镜像 ----------
  var DEFAULT_MIRRORS = [
    { id: 'https-gitclone-com', label: 'GitClone', region: 'CN', prefix: 'https://gitclone.com', protocol: 'https' },
    { id: 'https-wget-la', label: 'Wget.la', region: 'HK/TW/JP/US', prefix: 'https://wget.la/https://github.com', protocol: 'https' },
    { id: 'https-hk-gh-proxy', label: 'gh-proxy HK', region: 'HK', prefix: 'https://hk.gh-proxy.org/https://github.com', protocol: 'https' },
    { id: 'https-ghfast-top', label: 'ghfast.top', region: 'KR/JP/SG/US/DE', prefix: 'https://ghfast.top/https://github.com', protocol: 'https' },
    { id: 'https-githubfast-com', label: 'Github Fast', region: 'KR', prefix: 'https://githubfast.com/https://github.com', protocol: 'https' },
    { id: 'ssh-github-443', label: 'GitHub 443', region: 'JP/SG', prefix: 'ssh://git@ssh.github.com:443/', protocol: 'ssh' }
  ];

  function gmGet(key, fallback) {
    try { return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback; }
    catch (e) { return fallback; }
  }

  function gmSet(key, value) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, value); } catch (e) { /* ignore */ }
  }

  function readConfig() {
    var raw = gmGet(CONFIG_KEY, null);
    var parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    return migrateConfig(parsed);
  }

  function writeConfig(config) {
    gmSet(CONFIG_KEY, JSON.stringify(config));
  }

  function getAllMirrors(config) {
    var builtIn = DEFAULT_MIRRORS.filter(function (m) { return config.disabledIds.indexOf(m.id) === -1; });
    var custom = (config.customMirrors || []).filter(function (m) { return m && m.id && m.prefix && !m.disabled; });
    return builtIn.concat(custom);
  }

  function findMirror(config, id) {
    var found = DEFAULT_MIRRORS.find(function (m) { return m.id === id; });
    if (found) return found;
    return (config.customMirrors || []).find(function (m) { return m.id === id; });
  }

  function generateMirrorId() {
    return 'custom-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 10000);
  }

  // ---------- 页面克隆面板注入 ----------
  var INJECTED_MARK = 'data-xload-clone-injected';

  function findClonePanel() {
    // GitHub 将 Code 下拉渲染到 __primerPortalRoot__ 内，面板包含 input[value^="https:"] 与 input[value^="git@"]
    var inputs = document.querySelectorAll('input[value^="https:"]:not([title]), input[value^="git@"]:not([title])');
    for (var i = 0; i < inputs.length; i++) {
      var panel = inputs[i].closest('div[role="dialog"]') || inputs[i].closest('[class*="Overlay"]') || inputs[i].closest('#__primerPortalRoot__') || inputs[i].parentElement;
      if (panel) return panel;
    }
    return null;
  }

  function getOriginalUrls() {
    var httpsInput = document.querySelector('input[value^="https:"]:not([title])');
    var sshInput = document.querySelector('input[value^="git@"]:not([title])');
    return {
      https: httpsInput ? httpsInput.value : null,
      ssh: sshInput ? sshInput.value : null
    };
  }

  function createAcceleratedInput(value, label, title) {
    var wrap = document.createElement('div');
    wrap.style.marginTop = '4px';
    wrap.setAttribute('data-xload-clone', 'true');
    var lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.display = 'block';
    lbl.style.fontSize = '12px';
    lbl.style.color = 'var(--fgColor-muted, #555)';
    lbl.style.marginBottom = '2px';
    var input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('readonly', 'true');
    input.value = value;
    input.setAttribute('title', title || value);
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.setAttribute('data-xload-clone', 'true');
    wrap.appendChild(lbl);
    wrap.appendChild(input);
    wrap.addEventListener('click', function (e) {
      if (e.target === input) return;
      input.select();
    });
    input.addEventListener('click', function () {
      var cfg = readConfig();
      doCopy(value, cfg.autoCopy);
    });
    return wrap;
  }

  function clearInjected(panel) {
    if (!panel) return;
    var nodes = panel.querySelectorAll('[data-xload-clone="true"]');
    for (var i = nodes.length - 1; i >= 0; i--) nodes[i].remove();
  }

  function injectAccelerated(panel) {
    if (!panel || panel.getAttribute(INJECTED_MARK) === 'true') return;
    var cfg = readConfig();
    var urls = getOriginalUrls();
    if (!urls.https && !urls.ssh) return;
    clearInjected(panel);

    var httpsInput = panel.querySelector('input[value^="https:"]:not([title])');
    var sshInput = panel.querySelector('input[value^="git@"]:not([title])');
    var mirrors = getAllMirrors(cfg);

    if (httpsInput && urls.https) {
      var repoPath = parseRepoPath(urls.https, 'https');
      if (repoPath) {
        var parent = httpsInput.parentElement;
        if (parent) {
          var section = document.createElement('div');
          section.setAttribute('data-xload-clone', 'true');
          section.style.marginTop = '8px';
          var head = document.createElement('div');
          head.textContent = i18n.t('clone.accelerated') + ' (HTTPS)';
          head.style.fontSize = '12px';
          head.style.fontWeight = '600';
          head.style.marginBottom = '4px';
          section.appendChild(head);
          var httpsMirrors = mirrors.filter(function (m) { return m.protocol === 'https'; });
          if (httpsMirrors.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = i18n.t('state.noMirrors');
            empty.style.fontSize = '12px';
            empty.style.color = '#888';
            section.appendChild(empty);
          } else {
            httpsMirrors.forEach(function (mirror) {
              var addr = buildAcceleratedUrl(repoPath, mirror);
              if (addr) section.appendChild(createAcceleratedInput(buildCloneCommand(addr, cfg.autoCopy), mirror.label, mirror.region));
            });
          }
          parent.insertAdjacentElement('afterend', section);
        }
      }
    }

    if (sshInput && urls.ssh) {
      var repoPath = parseRepoPath(urls.ssh, 'ssh');
      if (repoPath) {
        var parent = sshInput.parentElement;
        if (parent) {
          var section = document.createElement('div');
          section.setAttribute('data-xload-clone', 'true');
          section.style.marginTop = '8px';
          var head = document.createElement('div');
          head.textContent = i18n.t('clone.accelerated') + ' (SSH)';
          head.style.fontSize = '12px';
          head.style.fontWeight = '600';
          head.style.marginBottom = '4px';
          section.appendChild(head);
          var sshMirrors = mirrors.filter(function (m) { return m.protocol === 'ssh'; });
          if (sshMirrors.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = i18n.t('state.noMirrors');
            empty.style.fontSize = '12px';
            empty.style.color = '#888';
            section.appendChild(empty);
          } else {
            sshMirrors.forEach(function (mirror) {
              var addr = buildAcceleratedUrl(repoPath, mirror);
              if (addr) section.appendChild(createAcceleratedInput(buildCloneCommand(addr, cfg.autoCopy), mirror.label, mirror.region));
            });
          }
          parent.insertAdjacentElement('afterend', section);
        }
      }
    }

    panel.setAttribute(INJECTED_MARK, 'true');
    log('clone.injected', { https: !!urls.https, ssh: !!urls.ssh, mirrors: mirrors.length });
  }

  function resetInjectedMarks() {
    document.querySelectorAll('[' + INJECTED_MARK + '="true"]').forEach(function (node) {
      node.removeAttribute(INJECTED_MARK);
      clearInjected(node);
    });
  }

  function observeClonePanel() {
    function onMutations() {
      var panel = findClonePanel();
      if (panel) injectAccelerated(panel);
    }
    var observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true });
    onMutations();
    return observer;
  }

  // ---------- 剪贴板 ----------
  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(textarea);
    return ok;
  }

  function doCopy(text, includeGitClone) {
    var command = buildCloneCommand(text, includeGitClone);
    var ok = false;
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(command);
        ok = true;
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(command);
        ok = true;
      } else {
        ok = fallbackCopy(command);
      }
    } catch (e) {
      ok = fallbackCopy(command);
    }
    log('clone.copy', { ok: ok, protocol: detectCloneProtocol(text) });
    channel.send('progress', { phase: 'copying', ok: ok, command: command });
    if (ok) channel.send('done', { command: command });
    else channel.send('error', { code: 'clipboard_denied', message: i18n.t('err.clipboard_denied') });
    return { ok: ok, command: command };
  }

  // ---------- 面板通信命令 ----------
  function getCloneState() {
    var cfg = readConfig();
    var urls = getOriginalUrls();
    var httpsRepo = urls.https ? parseRepoPath(urls.https, 'https') : null;
    var sshRepo = urls.ssh ? parseRepoPath(urls.ssh, 'ssh') : null;
    var mirrors = getAllMirrors(cfg).map(function (m) {
      var repoPath = m.protocol === 'https' ? httpsRepo : sshRepo;
      var address = repoPath ? buildAcceleratedUrl(repoPath, m) : null;
      return {
        id: m.id,
        label: m.label,
        region: m.region,
        protocol: m.protocol,
        address: address,
        command: address ? buildCloneCommand(address, cfg.autoCopy) : null,
        isCustom: !!m.isCustom
      };
    });
    return {
      ok: true,
      protocol: cfg.protocol,
      autoCopy: cfg.autoCopy,
      original: urls,
      mirrors: mirrors,
      disabledIds: cfg.disabledIds,
      customMirrors: cfg.customMirrors,
      locale: i18n.getLocale(),
      localePreference: i18n.getPreference()
    };
  }

  function handleCommand(data, message) {
    var action = data && data.action;
    var cfg = readConfig();
    if (action === 'setLanguage') {
      var preference = i18n.setLocale(data.locale);
      updateFabLabel();
      channel.reply(message, { ok: true, locale: i18n.getLocale(), localePreference: preference });
      return;
    }
    if (action === 'getState') {
      channel.reply(message, getCloneState());
      return;
    }
    if (action === 'setProtocol') {
      cfg.protocol = data.protocol === 'ssh' ? 'ssh' : 'https';
      writeConfig(cfg);
      resetInjectedMarks();
      var panel = findClonePanel();
      if (panel) injectAccelerated(panel);
      channel.reply(message, { ok: true, protocol: cfg.protocol });
      log('config.protocol', { protocol: cfg.protocol });
      return;
    }
    if (action === 'setAutoCopy') {
      cfg.autoCopy = data.enabled !== false;
      writeConfig(cfg);
      resetInjectedMarks();
      var panel = findClonePanel();
      if (panel) injectAccelerated(panel);
      channel.reply(message, { ok: true, autoCopy: cfg.autoCopy });
      log('config.autoCopy', { autoCopy: cfg.autoCopy });
      return;
    }
    if (action === 'copyCloneCommand') {
      var urls = getOriginalUrls();
      var original = data.protocol === 'ssh' ? urls.ssh : urls.https;
      if (!original) {
        channel.reply(message, { ok: false, error: i18n.t('err.page_not_ready') });
        return;
      }
      var repoPath = parseRepoPath(original, data.protocol === 'ssh' ? 'ssh' : 'https');
      if (!repoPath) {
        channel.reply(message, { ok: false, error: i18n.t('err.noRepo') });
        return;
      }
      var mirror = data.mirrorId ? findMirror(cfg, data.mirrorId) : getAllMirrors(cfg)[0];
      if (!mirror) {
        channel.reply(message, { ok: false, error: i18n.t('state.noMirrors') });
        return;
      }
      var address = buildAcceleratedUrl(repoPath, mirror);
      var result = doCopy(address, cfg.autoCopy);
      channel.reply(message, result);
      return;
    }
    if (action === 'setMirrorEnabled') {
      var id = data.id;
      var enabled = data.enabled !== false;
      if (id.indexOf('custom-') === 0) {
        cfg.customMirrors.forEach(function (m) { if (m.id === id) m.disabled = !enabled; });
      } else {
        cfg.disabledIds = cfg.disabledIds.filter(function (d) { return d !== id; });
        if (!enabled) cfg.disabledIds.push(id);
      }
      writeConfig(cfg);
      resetInjectedMarks();
      var panel = findClonePanel();
      if (panel) injectAccelerated(panel);
      channel.reply(message, { ok: true, disabledIds: cfg.disabledIds, customMirrors: cfg.customMirrors });
      log('config.mirrorEnabled', { id: id, enabled: enabled });
      return;
    }
    if (action === 'moveMirror') {
      var list = cfg.customMirrors;
      var from = data.from;
      var to = data.to;
      if (from >= 0 && from < list.length && to >= 0 && to < list.length) {
        var item = list.splice(from, 1)[0];
        list.splice(to, 0, item);
        writeConfig(cfg);
      }
      channel.reply(message, { ok: true, customMirrors: cfg.customMirrors });
      log('config.moveMirror', { from: from, to: to });
      return;
    }
    if (action === 'addCustomMirror') {
      var prefix = normalizeMirrorPrefix(data.prefix, data.protocol);
      if (!prefix || !isAllowedUrl(prefix)) {
        channel.reply(message, { ok: false, error: i18n.t('err.invalidUrl') });
        return;
      }
      var custom = {
        id: generateMirrorId(),
        label: String(data.label || 'Custom').trim() || 'Custom',
        region: String(data.region || '').trim() || 'Custom',
        prefix: prefix,
        protocol: data.protocol === 'ssh' ? 'ssh' : 'https',
        isCustom: true,
        disabled: false
      };
      cfg.customMirrors.push(custom);
      writeConfig(cfg);
      resetInjectedMarks();
      var panel = findClonePanel();
      if (panel) injectAccelerated(panel);
      channel.reply(message, { ok: true, customMirrors: cfg.customMirrors });
      log('config.addCustomMirror', { id: custom.id });
      return;
    }
    if (action === 'removeMirror') {
      cfg.customMirrors = cfg.customMirrors.filter(function (m) { return m.id !== data.id; });
      writeConfig(cfg);
      resetInjectedMarks();
      var panel = findClonePanel();
      if (panel) injectAccelerated(panel);
      channel.reply(message, { ok: true, customMirrors: cfg.customMirrors });
      log('config.removeMirror', { id: data.id });
      return;
    }
    if (action === 'resetConfig') {
      cfg = migrateConfig(null);
      writeConfig(cfg);
      resetInjectedMarks();
      var panel = findClonePanel();
      if (panel) injectAccelerated(panel);
      channel.reply(message, { ok: true, config: cfg });
      log('config.reset', {});
      return;
    }
    channel.reply(message, { ok: false, error: 'unknown action: ' + action });
  }

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
    channel.on('command', handleCommand);
    observeClonePanel();
    var fab = xloadFab();
    fabItem = fab.addItem(TASK_ID, i18n.t('fab.label'), openPanel);
    log('init', { href: window.location.href });
  }

  init();
})();
