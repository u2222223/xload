// ==UserScript==
// @name        更换背景色
// @namespace   0xFF336699
// @match       *://*/*
// @run-at      document-start
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// @version     0.1.0
// @license     GPL-3.0 License
// @author      0xFF336699
// @description 如果网站body没有设置默认颜色就更换它；有的网站并不适合更换背景色，可在右键菜单中将该网站设为排除。默认颜色 #e8e2d6，现支持通过功能面板动态设置颜色与自动应用开关，无需再修改代码。
// @downloadURL https://update.greasyfork.org/scripts/484628/%E6%9B%B4%E6%8D%A2%E8%83%8C%E6%99%AF%E8%89%B2.user.js
// @updateURL https://update.greasyfork.org/scripts/484628/%E6%9B%B4%E6%8D%A2%E8%83%8C%E6%99%AF%E8%89%B2.meta.js
// ==/UserScript==

// XLoadPanel —— 面板通信层（脚本侧精简实现，协议与站点 assets/panel/panel.js 对齐）
// 消息格式：{type, data, _from}；请求-响应：{_id, _request}
// 信任模型：跨源仅信任面板页来源 PANEL_ORIGIN；优先使用 open() 返回的窗口引用
(function () {
  'use strict';
  var PREFIX = 'xload-panel:';
  var PANEL_ORIGIN = 'https://xload.net';

  function Channel(taskId) {
    this._id = String(taskId || '');
    this._seq = 0;
    this._handlers = {};
    this._pending = {};
    this._bc = null;
    this._opener = null;
    this._panelWin = null;
    var self = this;
    try {
      if (window.opener && window.opener !== window) this._opener = window.opener;
    } catch (e) { this._opener = null; }
    this._onMsg = function (ev) {
      if (!ev.data || typeof ev.data !== 'object' || !ev.data.type) return;
      if (ev.source === window) return;
      if (ev.source && ev.source !== self._panelWin && ev.source !== self._opener) return;
      if (ev.origin && ev.origin !== PANEL_ORIGIN && ev.origin !== window.location.origin) return;
      if (ev.data._from !== self._id) return;
      self._dispatch(ev.data);
    };
    window.addEventListener('message', this._onMsg);
    try {
      this._bc = new BroadcastChannel(PREFIX + this._id);
      this._bc.onmessage = function (ev) { self._dispatch(ev.data); };
    } catch (e) { this._bc = null; }
  }

  Channel.prototype.attach = function (panelWin) {
    if (panelWin) this._panelWin = panelWin;
    return this;
  };

  Channel.prototype._post = function (msg) {
    if (this._panelWin) { try { this._panelWin.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
    else if (this._opener) { try { this._opener.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
    if (this._bc) { try { this._bc.postMessage(msg); } catch (e) {} }
  };

  Channel.prototype._dispatch = function (msg) {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg._id != null && Object.prototype.hasOwnProperty.call(this._pending, msg._id)) {
      var p = this._pending[msg._id];
      delete this._pending[msg._id];
      if (p._timer) clearTimeout(p._timer);
      if (msg.error != null) p.reject(new Error(String(msg.error)));
      else p.resolve(msg.data == null ? {} : msg.data);
      return;
    }
    var hs = this._handlers[msg.type];
    if (hs) {
      var data = msg.data == null ? {} : msg.data;
      for (var i = 0; i < hs.length; i++) hs[i](data, msg);
    }
  };

  // 单向发送：type 命令；上报用 progress/done/error
  Channel.prototype.send = function (type, data) {
    this._post({ type: type, data: data == null ? {} : data, _from: this._id });
    return this;
  };

  // 请求-响应：等待面板回包，默认超时 8000ms
  Channel.prototype.request = function (type, data, timeout) {
    var self = this;
    var id = ++this._seq;
    var t = typeof timeout === 'number' && timeout > 0 ? timeout : 8000;
    return new Promise(function (resolve, reject) {
      self._pending[id] = { resolve: resolve, reject: reject };
      self._pending[id]._timer = setTimeout(function () {
        if (self._pending[id]) {
          delete self._pending[id];
          reject(new Error('panel request timeout: ' + type));
        }
      }, t);
      self._post({ type: type, data: data == null ? {} : data, _id: id, _request: true, _from: self._id });
    });
  };

  // 监听面板消息（面板命令 type = action.id）
  Channel.prototype.on = function (type, handler) {
    (this._handlers[type] = this._handlers[type] || []).push(handler);
    return this;
  };

  Channel.prototype.close = function () {
    if (this._onMsg) { try { window.removeEventListener('message', this._onMsg); } catch (e) {} }
    if (this._bc) { try { this._bc.close(); } catch (e) {} }
    var ids = Object.keys(this._pending);
    for (var i = 0; i < ids.length; i++) {
      var p = this._pending[ids[i]];
      if (p._timer) clearTimeout(p._timer);
      p.reject(new Error('panel channel closed'));
    }
    this._pending = {};
    this._handlers = {};
    this._bc = null;
    this._opener = null;
    this._panelWin = null;
  };

  window.XLoadPanel = {
    CHANNEL_PREFIX: PREFIX,
    PANEL_ORIGIN: PANEL_ORIGIN,
    channel: function (taskId) { return new Channel(taskId || ''); },
    // 打开面板页并绑定信任窗口：window.open 不带 noopener，返回的引用即跨源信任源
    open: function (panelUrl, taskId) {
      var win = null;
      try { win = window.open(panelUrl, '_blank'); } catch (e) { win = null; }
      return new Channel(taskId || '').attach(win);
    }
  };
})();

(function () {
  'use strict';

  var DEFAULT_COLOR = '#e8e2d6';
  var COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  var SETTINGS_KEY = 'xload:panel-settings';
  var PANEL_TASK = 'greasyfork-484628';
  var PANEL_URL = 'https://xload.net/panel/greasyfork-484628.html';

  function normalizeColor(value) {
    if (typeof value !== 'string') return null;
    var color = value.trim();
    return COLOR_PATTERN.test(color) ? color : null;
  }

  function getSettings() {
    var fallback = { color: DEFAULT_COLOR, autoApply: true };
    try {
      var raw = GM_getValue(SETTINGS_KEY);
      if (!raw) return fallback;
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || typeof data !== 'object') return fallback;
      return {
        color: normalizeColor(data.color) || DEFAULT_COLOR,
        autoApply: data.autoApply !== false
      };
    } catch (e) {
      return fallback;
    }
  }

  function saveSettings(patch) {
    var settings = getSettings();
    if (patch) {
      if (patch.color) settings.color = patch.color;
      if (patch.autoApply != null) settings.autoApply = !!patch.autoApply;
    }
    try {
      GM_setValue(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
    return settings;
  }

  function isExcluded() {
    return !!GM_getValue(location.hostname);
  }

  function setExcluded(excluded) {
    GM_setValue(location.hostname, !!excluded);
  }

  function applyBackgroundColor(color) {
    if (document.body) document.body.style.backgroundColor = color;
  }

  function clearColor() {
    if (document.body) document.body.style.backgroundColor = '';
  }

  function applyColorOnLoad() {
    var settings = getSettings();
    if (!settings.autoApply || isExcluded()) return;
    if (!document.body || document.body.style.backgroundColor) return;
    document.body.style.backgroundColor = settings.color;
  }

  function switchExclude() {
    var excluded = !isExcluded();
    setExcluded(excluded);
    if (excluded) clearColor();
    else applyBackgroundColor(getSettings().color);
  }

  function whenBodyReady(callback) {
    var settled = false;
    function settle() {
      if (settled || !document.body) return;
      settled = true;
      clearInterval(poll);
      document.removeEventListener('DOMContentLoaded', settle);
      callback();
    }
    var poll = setInterval(settle, 100);
    document.addEventListener('DOMContentLoaded', settle);
    setTimeout(function () {
      clearInterval(poll);
      document.removeEventListener('DOMContentLoaded', settle);
    }, 15000);
  }

  var panelChannel = null;

  function reportPanel(type, action, message) {
    panelChannel.send(type, { action: action, message: message });
  }

  function bindPanelAction(id, run) {
    panelChannel.on(id, function (data) {
      reportPanel('progress', id, '正在执行…');
      try {
        reportPanel('done', id, run(data || {}) || '已完成');
      } catch (err) {
        reportPanel('error', id, (err && err.message) || String(err));
      }
    });
  }

  function doApply(data) {
    var color = data.bgColor ? normalizeColor(data.bgColor) : getSettings().color;
    if (!color) throw new Error('无效的颜色值：' + data.bgColor);
    var patch = { color: color };
    if (typeof data.autoApply === 'boolean') patch.autoApply = data.autoApply;
    var settings = saveSettings(patch);
    applyBackgroundColor(settings.color);
    return '背景色已应用：' + settings.color;
  }

  function doReset(data) {
    var patch = { color: DEFAULT_COLOR };
    if (typeof data.autoApply === 'boolean') patch.autoApply = data.autoApply;
    var settings = saveSettings(patch);
    applyBackgroundColor(settings.color);
    return '已恢复默认颜色：' + settings.color;
  }

  function doToggleExclude() {
    switchExclude();
    return isExcluded() ? '已排除本站' : '已取消排除本站';
  }

  function openPanel() {
    if (panelChannel) {
      try { panelChannel.close(); } catch (e) {}
    }
    panelChannel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
    bindPanelAction('apply', doApply);
    bindPanelAction('reset', doReset);
    bindPanelAction('toggleExclude', doToggleExclude);
    panelChannel.send('hello', {});
  }

  GM_registerMenuCommand('更换body背景色[排除此网站/取消排除]', switchExclude, 'H');
  GM_registerMenuCommand('打开功能面板', openPanel);
  whenBodyReady(applyColorOnLoad);
})();
