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
    this._closed = false;
    var self = this;

    // 优先跨源通道：面板由脚本 window.open 打开时 window.opener 指向目标页面
    try {
      if (window.opener && window.opener !== window) this._opener = window.opener;
    } catch (e) { this._opener = null; }

    // 通道1：window 'message'（跨源 postMessage，opener / panelWin / event.source 都走这里）
    this._onMsg = function (ev) {
      if (!ev.data || typeof ev.data !== 'object' || !ev.data.type) return;
      if (ev.source === window) return;
      if (self._opener && ev.source !== self._opener) return;
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
    if (this._closed) {
      var closedError = new Error('Panel channel is closed: ' + type);
      closedError.code = 'CHANNEL_CLOSED';
      return Promise.reject(closedError);
    }
    var id = ++this._seq;
    var t = typeof timeout === 'number' && timeout > 0 ? timeout : 8000;
    return new Promise(function (resolve, reject) {
      self._pending[id] = {
        resolve: resolve,
        reject: reject,
        _timer: setTimeout(function () {
          if (self._pending[id]) {
            delete self._pending[id];
            var error = new Error((typeof self.translate === 'function' ? self.translate('timeout') + ': ' : '原页面未响应：') + type);
            error.code = 'REQUEST_TIMEOUT';
            reject(error);
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
    if (this._closed) return;
    this._closed = true;
    if (this._onMsg) { try { window.removeEventListener('message', this._onMsg); } catch (e) { /* ignore */ } }
    if (this._bc) { try { this._bc.close(); } catch (e) { /* ignore */ } }
    var ids = Object.keys(this._pending);
    for (var i = 0; i < ids.length; i++) {
      var pending = this._pending[ids[i]];
      if (pending._timer) clearTimeout(pending._timer);
      var error = new Error('Panel channel is closed');
      error.code = 'CHANNEL_CLOSED';
      pending.reject(error);
    }
    this._bc = null;
    this._opener = null;
    this._handlers = {};
    this._pending = {};
  };

  // ---------- PUI：面板 UI 组件 ----------
  var PUI = {};
  var translator = null;
  // 新面板显式接入；旧面板保留现有默认文案。
  PUI.setTranslator = function (fn) { translator = typeof fn === 'function' ? fn : null; };
  function uiText(key, fallback) { return translator ? translator(key) : fallback; }

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
    var head = el('div', 'pui-modal-head', o.title || uiText('notice', '提示'));
    var body = el('div', 'pui-modal-body');
    if (typeof o.body === 'string') body.textContent = o.body;
    else if (o.body && o.body.nodeType) body.appendChild(o.body);
    var foot = el('div', 'pui-modal-foot');
    var api = {
      close: function () {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
      }
    };
    var btns = o.buttons && o.buttons.length ? o.buttons : [{ text: uiText('close', '关闭'), type: 'default' }];
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

  // ---------- PanelPage：面板页统一启动器 ----------
  // 读取 body[data-panel-task] 建立通道；驱动状态机 waiting → ready → running → done/failed。
  // 操作按钮：点击后以 action.id 为命令发起请求-响应，携带全部 [data-control] 控件值。
  var PanelPage = {
    init: function () {
      var taskId = (document.body && document.body.getAttribute('data-panel-task')) || '';
      var copy = { connecting: '等待脚本连接…', running: '正在执行…', done: '已完成', failed: '执行失败' };
      var statusSection = document.getElementById('panel-status');
      var statusText = document.getElementById('panel-status-text');
      var progress = document.getElementById('panel-progress');
      var progressFill = document.getElementById('panel-progress-fill');
      try {
        var raw = document.getElementById('panel-loading');
        if (raw) {
          var parsed = JSON.parse(raw.textContent || '{}');
          for (var k in copy) {
            if (typeof parsed[k] === 'string' && parsed[k]) copy[k] = parsed[k];
          }
        }
      } catch (e) { /* 使用默认文案 */ }

      function setState(state, text) {
        if (statusSection) statusSection.setAttribute('data-state', state);
        if (statusText && text != null) statusText.textContent = text;
        if (progress) progress.hidden = state !== 'running';
      }

      var channel = new PanelChannel(taskId);
      channel.on('hello', function () {
        setState('ready', null);
        if (statusText) statusText.textContent = '脚本已连接';
        // 脚本连接后拉取历史运行日志（旧脚本无日志层时静默失败）
        channel.request('logs', {}, 3000).then(function (res) {
          if (res && Array.isArray(res.logs)) mergeLogs(res.logs);
        }).catch(function () {});
      });
      channel.on('progress', function (data) {
        var d = data || {};
        setState('running', copy.running);
        if (progressFill && typeof d.pct === 'number') {
          progressFill.style.width = Math.max(0, Math.min(100, Number(d.pct) || 0)) + '%';
        }
      });
      channel.on('done', function (data) {
        setState('done', (data && data.text) || copy.done);
      });
      channel.on('error', function (data) {
        setState('failed', (data && data.text) || copy.failed);
      });

      var controls = document.querySelectorAll('[data-control]');
      function collectControls() {
        var out = {};
        for (var i = 0; i < controls.length; i++) {
          var el = controls[i];
          var id = el.getAttribute('data-control');
          if (!id) continue;
          out[id] = el.getAttribute('data-type') === 'switch' ? !!el.checked : el.value;
        }
        return out;
      }
      var buttons = document.querySelectorAll('[data-action]');
      for (var j = 0; j < buttons.length; j++) {
        (function (btn) {
          var actionId = btn.getAttribute('data-action');
          btn.addEventListener('click', function () {
            channel.request(actionId, collectControls()).catch(function (err) {
              PUI.toast((err && err.message) || '操作失败', 'error');
            });
          });
        })(buttons[j]);
      }
      // ---------- 运行日志区（默认隐藏，Ctrl+` 切换；仅内存，不脱敏） ----------
      var LOG_RENDER_MAX = 200;
      var logs = [];
      var logDrawer = document.getElementById('panel-log');
      var logList = document.getElementById('panel-log-list');
      var logEmpty = document.getElementById('panel-log-empty');

      function formatEntry(entry) {
        var e = entry || {};
        var t = '';
        try { t = new Date(e.ts || 0).toISOString(); } catch (err) { t = String(e.ts || ''); }
        var data = '';
        try { data = e.data == null ? '' : ' ' + JSON.stringify(e.data); } catch (err) { data = ''; }
        return t + ' ' + String(e.event || '') + data;
      }

      function renderLogs() {
        if (!logList) return;
        while (logList.children.length > 0) logList.removeChild(logList.children[0]);
        for (var i = 0; i < logs.length; i++) {
          var entry = logs[i] || {};
          var row = document.createElement('div');
          row.className = 'panel-log-entry';
          row.setAttribute('data-level', String(entry.level || 'info'));
          var level = document.createElement('span');
          level.className = 'panel-log-level';
          level.textContent = '[' + String(entry.level || 'info') + ']';
          row.appendChild(level);
          var text = document.createElement('span');
          text.textContent = formatEntry(entry);
          row.appendChild(text);
          logList.appendChild(row);
        }
        if (logEmpty) logEmpty.hidden = logs.length > 0;
      }

      function logsText() {
        var lines = [];
        for (var i = 0; i < logs.length; i++) {
          try { lines.push(JSON.stringify(logs[i])); } catch (err) {}
        }
        return lines.join('\n');
      }

      function addLog(entry) {
        if (!entry || typeof entry !== 'object') return;
        logs.push(entry);
        if (logs.length > LOG_RENDER_MAX) logs.splice(0, logs.length - LOG_RENDER_MAX);
        renderLogs();
      }

      // 合并历史快照与已收到的实时条目，按 ts+event 去重，避免拉取覆盖实时日志
      function mergeLogs(snapshot) {
        var seen = {};
        var merged = [];
        var all = snapshot.concat(logs);
        for (var i = 0; i < all.length; i++) {
          var e = all[i] || {};
          var key = String(e.ts) + '|' + String(e.event);
          if (seen[key]) continue;
          seen[key] = true;
          merged.push(e);
        }
        merged.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
        logs = merged.slice(-LOG_RENDER_MAX);
        renderLogs();
      }

      function toggleLog() {
        if (!logDrawer) return;
        logDrawer.hidden = !logDrawer.hidden;
        if (!logDrawer.hidden) renderLogs();
      }

      function fallbackCopy(text) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', 'readonly');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          PUI.toast('日志已复制', 'success');
        } catch (err2) { PUI.toast('复制失败', 'error'); }
      }

      function copyLogs() {
        if (logs.length === 0) { PUI.toast('暂无日志', 'warn'); return; }
        var text = logsText();
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              PUI.toast('日志已复制', 'success');
            }).catch(function () {
              fallbackCopy(text);
            });
            return;
          }
        } catch (err) {}
        fallbackCopy(text);
      }

      function downloadLogs() {
        if (logs.length === 0) { PUI.toast('暂无日志', 'warn'); return; }
        try {
          var blob = new Blob([logsText()], { type: 'application/jsonl' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'xload-log-' + (taskId || 'panel') + '-' + Date.now() + '.jsonl';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { try { URL.revokeObjectURL(url); } catch (err) {} }, 1000);
        } catch (err) { PUI.toast('下载失败', 'error'); }
      }

      function clearLogs() {
        logs = [];
        renderLogs();
      }

      channel.on('log', function (data) { addLog(data); });

      if (logDrawer) {
        logDrawer.hidden = true;
        var clearBtn = document.getElementById('panel-log-clear');
        var copyBtn = document.getElementById('panel-log-copy');
        var downloadBtn = document.getElementById('panel-log-download');
        var closeBtn = document.getElementById('panel-log-close');
        if (clearBtn) clearBtn.addEventListener('click', clearLogs);
        if (copyBtn) copyBtn.addEventListener('click', copyLogs);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadLogs);
        if (closeBtn) closeBtn.addEventListener('click', toggleLog);
      }
      window.addEventListener('keydown', function (ev) {
        if (!ev || !ev.ctrlKey || (ev.key !== '`' && ev.key !== '~')) return;
        var target = ev.target;
        var tag = target && target.tagName ? String(target.tagName).toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable)) return;
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
        toggleLog();
      });
      renderLogs();

      setState('waiting', copy.connecting);
      return channel;
    }
  };

  window.PanelChannel = PanelChannel;
  window.PUI = PUI;
  window.PanelPage = PanelPage;
})();
