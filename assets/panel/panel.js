// panel.js —— 功能面板共用 SDK（全局 PanelChannel + PUI）
// 面板页与油猴脚本通过 BroadcastChannel（channel 名固定 xload-panel:{task_id}）双向通信。
// 依赖：无第三方库；要求浏览器支持 BroadcastChannel。
(function () {
  'use strict';

  var PREFIX = 'xload-panel:';

  // ---------- PanelChannel：BroadcastChannel + 跨源 postMessage 封装 ----------
  // 同源（面板与页面同域）用 BroadcastChannel；跨源（面板在 xload 站点、脚本在目标站点）
  // 用 window.opener + postMessage：脚本 window.open 面板（不用 noopener）后，面板通过
  // window.opener.postMessage 发给页面，页面用 event.source/panelWin postMessage 回包。
  // 双通道策略：不二选一，始终「同时」监听 window 'message' + BroadcastChannel，
  // 发送也同时走 opener.postMessage + bc.postMessage——脚本侧从哪条通道回包都能命中。
  function PanelChannel(taskId) {
    this._id = String(taskId || '');
    this._seq = 0;
    this._handlers = {};
    this._pending = {};
    this._bc = null;
    this._opener = null;
    this._onMsg = null;
    var self = this;

    // 优先跨源通道：面板由脚本 window.open 打开时 window.opener 指向目标页面
    try {
      if (window.opener && window.opener !== window) this._opener = window.opener;
    } catch (e) { this._opener = null; }

    // 通道1：window 'message'（跨源 postMessage，opener / panelWin / event.source 都走这里）
    this._onMsg = function (ev) {
      if (!ev.data || typeof ev.data !== 'object' || !ev.data.type) return;
      if (ev.source === window) return;
      if (ev.data._from !== self._id) return;
      self._dispatch(ev.data);
    };
    window.addEventListener('message', this._onMsg);

    // 通道2：BroadcastChannel（同源兜底，与脚本侧 bc 互通）
    try {
      this._bc = new BroadcastChannel(PREFIX + this._id);
      this._bc.onmessage = function (ev) { self._dispatch(ev.data); };
    } catch (e) { this._bc = null; }
  }

  // 统一投递：跨源走 opener.postMessage，同源走 BroadcastChannel，双通道都发
  PanelChannel.prototype._post = function (msg) {
    if (this._opener) { try { this._opener.postMessage(msg, '*'); } catch (e) { /* ignore */ } }
    if (this._bc) { try { this._bc.postMessage(msg); } catch (e) { /* ignore */ } }
  };

  PanelChannel.prototype._dispatch = function (msg) {
    if (!msg || typeof msg !== 'object' || !msg.type) return;
    // 请求-响应关联：带 _id 的消息若在等待表中，视为响应回包
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

  // 单向发送：panel -> 油猴（type 命令），或 油猴 -> panel（type: progress/done/error）
  PanelChannel.prototype.send = function (type, data) {
    this._post({ type: type, data: data == null ? {} : data, _from: this._id });
    return this;
  };

  // 请求-响应：panel -> 油猴，等待油猴回包（沿用同 type + 原 _id）。默认超时 8000ms。
  PanelChannel.prototype.request = function (type, data, timeout) {
    var self = this;
    var id = ++this._seq;
    var t = typeof timeout === 'number' && timeout > 0 ? timeout : 8000;
    return new Promise(function (resolve, reject) {
      self._pending[id] = {
        resolve: resolve,
        reject: reject,
        _timer: setTimeout(function () {
          if (self._pending[id]) {
            delete self._pending[id];
            reject(new Error('原页面未响应：' + type));
          }
        }, t)
      };
      self._post({ type: type, data: data == null ? {} : data, _id: id, _request: true, _from: self._id });
    });
  };

  // 监听油猴消息：channel.on('progress', function (data) { ... })
  PanelChannel.prototype.on = function (type, handler) {
    (this._handlers[type] = this._handlers[type] || []).push(handler);
    return this;
  };

  PanelChannel.prototype.off = function (type, handler) {
    var hs = this._handlers[type];
    if (hs) this._handlers[type] = hs.filter(function (h) { return h !== handler; });
    return this;
  };

  PanelChannel.prototype.close = function () {
    if (this._onMsg) { try { window.removeEventListener('message', this._onMsg); } catch (e) { /* ignore */ } }
    if (this._bc) { try { this._bc.close(); } catch (e) { /* ignore */ } }
    this._bc = null;
    this._opener = null;
    this._handlers = {};
    this._pending = {};
  };

  // ---------- PUI：面板 UI 组件 ----------
  var PUI = {};

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // toast(msg, type) —— type: info / success / warn / error，默认 info
  PUI.toast = function (msg, type) {
    var kind = type || 'info';
    var box = document.querySelector('.pui-toasts');
    if (!box) {
      box = el('div', 'pui-toasts');
      document.body.appendChild(box);
    }
    var t = el('div', 'pui-toast pui-toast-' + kind, String(msg == null ? '' : msg));
    box.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 3000);
    return t;
  };

  // progressBar(opts) —— opts: {text} 默认文案；返回 {set, done, hide}
  PUI.progressBar = function (opts) {
    var o = opts || {};
    var wrap = el('div', 'pui-progress');
    var track = el('div', 'pui-progress-track');
    var fill = el('div', 'pui-progress-fill');
    var label = el('div', 'pui-progress-label', o.text || '');
    track.appendChild(fill);
    wrap.appendChild(track);
    wrap.appendChild(label);
    document.body.appendChild(wrap);
    var api = {
      set: function (pct, text) {
        var v = Math.max(0, Math.min(100, Number(pct) || 0));
        fill.style.width = v + '%';
        if (text != null) label.textContent = text;
        return api;
      },
      done: function (text) {
        fill.style.width = '100%';
        if (text != null) label.textContent = text;
        setTimeout(api.hide, 800);
        return api;
      },
      hide: function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        return api;
      }
    };
    api.set(0);
    return api;
  };

  // modal(opts) —— opts: {title, body, buttons:[{text, type, onClick}]}；返回 {close}
  PUI.modal = function (opts) {
    var o = opts || {};
    var mask = el('div', 'pui-modal-mask');
    var box = el('div', 'pui-modal');
    var head = el('div', 'pui-modal-head', o.title || '提示');
    var body = el('div', 'pui-modal-body');
    if (typeof o.body === 'string') body.textContent = o.body;
    else if (o.body && o.body.nodeType) body.appendChild(o.body);
    var foot = el('div', 'pui-modal-foot');
    var api = {
      close: function () {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
      }
    };
    var btns = o.buttons && o.buttons.length ? o.buttons : [{ text: '关闭', type: 'default' }];
    btns.forEach(function (b) {
      var btn = el('button', 'pui-btn pui-btn-' + (b.type || 'default'), b.text);
      btn.addEventListener('click', function () {
        if (b.onClick && b.onClick(api) !== false) api.close();
        else if (!b.onClick) api.close();
      });
      foot.appendChild(btn);
    });
    box.appendChild(head);
    box.appendChild(body);
    box.appendChild(foot);
    mask.appendChild(box);
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) {
      if (e.target === mask) api.close();
    });
    return api;
  };

  window.PanelChannel = PanelChannel;
  window.PUI = PUI;
})();
