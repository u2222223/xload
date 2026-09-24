// ==UserScript==
// @name         Web AutoClicker with Target & Interval
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Tampermonkey autoclicker with crosshair target picker, interval adjustment, and start/stop controls.
// @author       You
// @match        https://flip.gg/*
// @grant        none
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/597092/Web%20AutoClicker%20with%20Target%20%20Interval.user.js
// @updateURL https://update.greasyfork.org/scripts/597092/Web%20AutoClicker%20with%20Target%20%20Interval.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // XLoadPanel —— 面板通信层（脚本侧精简实现，协议与站点 assets/panel/panel.js 对齐）
    // 消息格式：{type, data, _from}；请求-响应：{_id, _request}
    // 信任模型：跨源仅信任面板页来源 PANEL_ORIGIN；优先使用 open() 返回的窗口引用
    (function () {
      'use strict';
      var PREFIX = 'xload-panel:';
      var PANEL_ORIGIN = 'https://xload.net';

      // ---------- 运行日志（仅内存环形缓冲，刷新即清；不脱敏、不持久化） ----------
      var LOG_LIMIT = 200;
      var LOG_PUSH = 'log';
      var LOG_PULL = 'logs';
      var LOG_LEVELS = ["debug","info","warn","error"];
      var _logs = [];
      var _channels = [];

      function _safeData(data) {
        if (data == null) return null;
        try { return JSON.parse(JSON.stringify(data)); }
        catch (e) { try { return String(data); } catch (e2) { return '[unserializable]'; } }
      }

      // 向所有已连接面板推送日志（走 _post，避免触发 send 的埋点造成递归）
      function _broadcastLog(entry) {
        for (var i = 0; i < _channels.length; i++) {
          try { _channels[i]._post({ type: LOG_PUSH, data: entry, _from: _channels[i]._id }); } catch (e) {}
        }
      }

      function log(level, event, data) {
        try {
          var lv = String(level || 'info');
          if (LOG_LEVELS.indexOf(lv) < 0) lv = 'info';
          var entry = {
            ts: Date.now(),
            level: lv,
            event: String(event == null ? '' : event),
            data: _safeData(data)
          };
          _logs.push(entry);
          if (_logs.length > LOG_LIMIT) _logs.splice(0, _logs.length - LOG_LIMIT);
          _broadcastLog(entry);
        } catch (e) {}
      }

      // 返回深拷贝快照，避免调用方改动缓冲内条目
      function logsSnapshot() {
        try {
          return _logs.map(function (e) {
            return { ts: e.ts, level: e.level, event: e.event, data: _safeData(e.data) };
          });
        } catch (e) { return []; }
      }

      // 全局未捕获错误与 Promise 拒绝：只记录，不拦截站点默认行为
      try {
        window.addEventListener('error', function (ev) {
          log('error', 'window.error', {
            message: ev && ev.message,
            filename: ev && ev.filename,
            lineno: ev && ev.lineno,
            colno: ev && ev.colno,
            stack: ev && ev.error && ev.error.stack
          });
        });
        window.addEventListener('unhandledrejection', function (ev) {
          var reason = ev && ev.reason;
          log('error', 'window.unhandledrejection', {
            message: reason && reason.message ? reason.message : String(reason),
            stack: reason && reason.stack
          });
        });
      } catch (e) {}

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
        _channels.push(this);
        log('info', 'channel', { taskId: this._id });
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
        // 忽略其它脚本通道回环的日志推送，避免同任务多通道间日志互相转发形成死循环
        if (msg.type === LOG_PUSH) return;
        if (msg._id != null && !msg._request && Object.prototype.hasOwnProperty.call(this._pending, msg._id)) {
          var p = this._pending[msg._id];
          delete this._pending[msg._id];
          if (p._timer) clearTimeout(p._timer);
          if (msg.error != null) p.reject(new Error(String(msg.error)));
          else p.resolve(msg.data == null ? {} : msg.data);
          return;
        }
        log('debug', 'recv', { type: msg.type });
        // 内建响应：面板拉取运行日志快照
        if (msg._request && msg._id != null && msg.type === LOG_PULL) {
          this._post({ type: LOG_PULL, data: { logs: logsSnapshot() }, _id: msg._id, _from: this._id });
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
        log('debug', 'send', { type: type });
        this._post({ type: type, data: data == null ? {} : data, _from: this._id });
        return this;
      };

      // 请求-响应：等待面板回包，默认超时 8000ms
      Channel.prototype.request = function (type, data, timeout) {
        var self = this;
        var id = ++this._seq;
        var t = typeof timeout === 'number' && timeout > 0 ? timeout : 8000;
        log('debug', 'request', { type: type });
        return new Promise(function (resolve, reject) {
          self._pending[id] = { resolve: resolve, reject: reject };
          self._pending[id]._timer = setTimeout(function () {
            if (self._pending[id]) {
              delete self._pending[id];
              log('error', 'request.timeout', { type: type });
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
        var idx = _channels.indexOf(this);
        if (idx >= 0) _channels.splice(idx, 1);
        log('info', 'close', {});
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
        LOG_LIMIT: LOG_LIMIT,
        // 可选上报接口：脚本可在关键功能点记录自定义运行事件
        log: function (level, event, data) { log(level, event, data); return this; },
        logs: function () { return logsSnapshot(); },
        clearLogs: function () { _logs = []; return this; },
        channel: function (taskId) { return new Channel(taskId || ''); },
        // 打开面板页并绑定信任窗口：window.open 不带 noopener，返回的引用即跨源信任源
        open: function (panelUrl, taskId) {
          var win = null;
          try { win = window.open(panelUrl, '_blank'); } catch (e) { win = null; }
          return new Channel(taskId || '').attach(win);
        }
      };
    })();

    /* ------------------------------------------------------------------ *
     * 面板任务参数
     * ------------------------------------------------------------------ */
    var PANEL_TASK = 'xload-eefd73fd016d';
    var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-eefd73fd016d/panel.html';

    /* ------------------------------------------------------------------ *
     * 配置与运行状态
     * ------------------------------------------------------------------ */
    var SETTINGS = {
        intervalSec: 1,
        stepSec: 0.5,
        minIntervalSec: 0.1,
        minTickMs: 100
    };

    var LABELS = {
        center: 'Target: Center/Default',
        picking: 'Target: Click anywhere...',
        colorIdle: '#aaa',
        colorPicking: '#ffcc00',
        colorSet: '#00ffcc'
    };

    var state = {
        running: false,
        picking: false,
        targetX: null,
        targetY: null,
        timer: null,
        visible: true
    };

    var els = {};
    var channel = null;

    /* ------------------------------------------------------------------ *
     * 工具函数
     * ------------------------------------------------------------------ */
    function byId(id) {
        return document.getElementById(id);
    }

    function clampInterval(value) {
        var n = parseFloat(value);
        if (!isFinite(n) || n <= 0) n = SETTINGS.intervalSec;
        return Math.max(SETTINGS.minIntervalSec, n);
    }

    function currentIntervalSec() {
        return clampInterval(els.interval.value);
    }

    function intervalMs() {
        return Math.max(SETTINGS.minTickMs, currentIntervalSec() * 1000);
    }

    function logEvent(level, event, data) {
        try {
            if (window.XLoadPanel && typeof window.XLoadPanel.log === 'function') {
                window.XLoadPanel.log(level, event, data);
            }
        } catch (e) { /* 日志失败不影响主流程 */ }
    }

    /* ------------------------------------------------------------------ *
     * 悬浮面板构建
     * ------------------------------------------------------------------ */
    function buildPanel() {
        var panel = document.createElement('div');
        panel.id = 'ac-panel';
        panel.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; background: #222; color: #fff; padding: 15px; border-radius: 8px; font-family: Arial, sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.5); width: 220px; user-select: none;';
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; cursor: move; display: flex; justify-content: space-between;">
                <span>AutoClicker</span>
                <span id="ac-close" style="cursor: pointer; color: #aaa;">&times;</span>
            </div>
            <div style="margin-bottom: 8px;">
                <label style="font-size: 12px;">Interval (sec):</label>
                <div style="display: flex; align-items: center; margin-top: 3px;">
                    <input type="number" id="ac-interval" value="1" step="0.1" min="0.1" style="width: 60px; padding: 4px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px;">
                    <button id="ac-up" style="margin-left: 5px; padding: 4px 8px; background: #444; color: #fff; border: none; cursor: pointer;">▲</button>
                    <button id="ac-down" style="margin-left: 2px; padding: 4px 8px; background: #444; color: #fff; border: none; cursor: pointer;">▼</button>
                </div>
            </div>
            <div style="margin-bottom: 10px; display: flex; align-items: center;">
                <button id="ac-pick" style="flex: 1; padding: 6px; background: #333; color: #00ffcc; border: 1px solid #00ffcc; border-radius: 4px; cursor: pointer;">🎯 Pick Spot</button>
            </div>
            <div id="ac-coords" style="font-size: 11px; color: #aaa; margin-bottom: 10px;">Target: Center/Default</div>
            <button id="ac-toggle" style="width: 100%; padding: 10px; background: #28a745; color: #fff; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;">START</button>
        `;
        document.body.appendChild(panel);
        return panel;
    }

    function cacheElements(panel) {
        els.panel = panel;
        els.interval = byId('ac-interval');
        els.toggle = byId('ac-toggle');
        els.pick = byId('ac-pick');
        els.coords = byId('ac-coords');
        els.up = byId('ac-up');
        els.down = byId('ac-down');
        els.close = byId('ac-close');
    }

    /* ------------------------------------------------------------------ *
     * 间隔与目标
     * ------------------------------------------------------------------ */
    function setIntervalValue(sec) {
        var value = clampInterval(sec);
        els.interval.value = value.toFixed(1);
        return value;
    }

    function setTargetLabel(text, color) {
        els.coords.innerText = text;
        els.coords.style.color = color;
    }

    function applyTarget(x, y) {
        state.targetX = x;
        state.targetY = y;
        setTargetLabel('Target: X:' + x + ', Y:' + y, LABELS.colorSet);
    }

    function startPicking() {
        state.picking = true;
        setTargetLabel(LABELS.picking, LABELS.colorPicking);
    }

    function clearTarget() {
        state.targetX = null;
        state.targetY = null;
        state.picking = false;
        setTargetLabel(LABELS.center, LABELS.colorIdle);
    }

    function onDocumentClickCapture(e) {
        if (!state.picking) return;
        e.preventDefault();
        e.stopPropagation();
        state.picking = false;
        applyTarget(e.clientX, e.clientY);
    }

    /* ------------------------------------------------------------------ *
     * 点击模拟与循环
     * ------------------------------------------------------------------ */
    function clickAt(x, y) {
        var el = document.elementFromPoint(x, y);
        if (!el) return null;
        var types = ['mousedown', 'mouseup', 'click'];
        for (var i = 0; i < types.length; i++) {
            el.dispatchEvent(new MouseEvent(types[i], { bubbles: true, cancelable: true, view: window }));
        }
        return el;
    }

    function clickTarget() {
        if (state.targetX !== null && state.targetY !== null) {
            return clickAt(state.targetX, state.targetY);
        }
        return clickAt(window.innerWidth / 2, window.innerHeight / 2);
    }

    function tick() {
        if (!state.running) return;
        clickTarget();
        state.timer = setTimeout(tick, intervalMs());
    }

    function setRunning(running) {
        running = !!running;
        if (state.running === running) return state.running;
        state.running = running;

        if (running) {
            els.toggle.innerText = 'STOP';
            els.toggle.style.background = '#dc3545';
            els.interval.disabled = true;
            tick();
        } else {
            els.toggle.innerText = 'START';
            els.toggle.style.background = '#28a745';
            els.interval.disabled = false;
            clearTimeout(state.timer);
            state.timer = null;
        }
        return state.running;
    }

    /* ------------------------------------------------------------------ *
     * 面板显隐与拖动
     * ------------------------------------------------------------------ */
    function setPanelVisible(visible) {
        state.visible = !!visible;
        els.panel.style.display = state.visible ? '' : 'none';
    }

    function resetPosition() {
        els.panel.style.left = '';
        els.panel.style.top = '20px';
        els.panel.style.right = '20px';
    }

    function initDrag(panel) {
        var header = panel.querySelector('div');
        var dragging = false;
        var offsetX = 0;
        var offsetY = 0;

        header.addEventListener('mousedown', function (e) {
            if (e.target === els.close) return;
            dragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            panel.style.left = (e.clientX - offsetX) + 'px';
            panel.style.top = (e.clientY - offsetY) + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', function () {
            dragging = false;
        });
    }

    /* ------------------------------------------------------------------ *
     * UI 事件绑定
     * ------------------------------------------------------------------ */
    function wireUi() {
        els.close.addEventListener('click', function () {
            els.panel.remove();
        });
        els.up.addEventListener('click', function () {
            setIntervalValue(currentIntervalSec() + SETTINGS.stepSec);
        });
        els.down.addEventListener('click', function () {
            setIntervalValue(currentIntervalSec() - SETTINGS.stepSec);
        });
        els.pick.addEventListener('click', startPicking);
        els.toggle.addEventListener('click', function () {
            setRunning(!state.running);
        });
        document.addEventListener('click', onDocumentClickCapture, true);
        initDrag(els.panel);
    }

    /* ------------------------------------------------------------------ *
     * 面板通信：命令监听与状态上报
     * ------------------------------------------------------------------ */
    function snapshot() {
        return {
            running: state.running,
            picking: state.picking,
            intervalSec: currentIntervalSec(),
            targetX: state.targetX,
            targetY: state.targetY,
            visible: state.visible
        };
    }

    function report(type, data) {
        if (channel) channel.send(type, data);
    }

    function registerCommand(name, handler) {
        channel.on(name, function (data) {
            report('progress', { action: name, status: 'running' });
            try {
                var result = handler(data || {});
                report('done', { action: name, result: result == null ? snapshot() : result });
            } catch (err) {
                var message = String((err && err.message) || err);
                report('error', { action: name, message: message });
                logEvent('error', 'command.failed', { action: name, message: message });
            }
        });
    }

    function applyConfig(data) {
        if (data.intervalSec != null) setIntervalValue(data.intervalSec);
        if (data.visible != null) setPanelVisible(data.visible);
        return snapshot();
    }

    function bindChannelCommands() {
        registerCommand('start', function (data) {
            if (data.intervalSec != null) setIntervalValue(data.intervalSec);
            setRunning(true);
            logEvent('info', 'clicker.start', { intervalSec: currentIntervalSec() });
            return snapshot();
        });

        registerCommand('stop', function () {
            setRunning(false);
            logEvent('info', 'clicker.stop', {});
            return snapshot();
        });

        registerCommand('toggle', function () {
            setRunning(!state.running);
            return snapshot();
        });

        registerCommand('click-once', function () {
            var el = clickTarget();
            return { clicked: !!el, targetX: state.targetX, targetY: state.targetY };
        });

        registerCommand('pick', function () {
            startPicking();
            return snapshot();
        });

        registerCommand('apply-target', function (data) {
            if (data.x != null && data.y != null) {
                applyTarget(Number(data.x), Number(data.y));
            }
            return snapshot();
        });

        registerCommand('clear-target', function () {
            clearTarget();
            return snapshot();
        });

        registerCommand('set-visible', function (data) {
            setPanelVisible(data.visible !== false);
            return snapshot();
        });

        registerCommand('reset-position', function () {
            resetPosition();
            return snapshot();
        });

        registerCommand('config', function (data) {
            return applyConfig(data || {});
        });
    }

    function openPanel() {
        if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') {
            logEvent('warn', 'panel.unavailable', {});
            return null;
        }

        try {
            channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
        } catch (e) {
            channel = null;
        }

        if (!channel) {
            logEvent('warn', 'panel.open.failed', { task: PANEL_TASK });
            return null;
        }

        bindChannelCommands();
        channel.send('hello', {});
        logEvent('info', 'panel.ready', { task: PANEL_TASK });
        return channel;
    }

    /* ------------------------------------------------------------------ *
     * 初始化
     * ------------------------------------------------------------------ */
    function init() {
        cacheElements(buildPanel());
        wireUi();
        openPanel();
    }

    init();

})();
