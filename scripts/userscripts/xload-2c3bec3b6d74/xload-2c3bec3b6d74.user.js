// ==UserScript==
// @name        Shell Shockers | Show HP
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_info
// @grant        GM_setClipboard
// @grant        GM_openInTab
//
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// @grant        GM.info
// @grant        GM.setClipboard
// @grant        GM.openInTab

// @grant        none
// @run-at       document-start
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @require      https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js
// @require      https://cdn.jsdelivr.net/npm/@tweakpane/plugin-essentials@0.1.8/dist/tweakpane-plugin-essentials.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
//
// @license MIT
// @namespace https://greasyfork.org/users/1361048

// @version     1.0
// @author      wish?
// @description Shows players HP above their name

// @match        *://*.shellshock.io/*
// @match        *://*.shell.onlypuppy7.online/*
// @match        *://*.algebra.best/*
// @match        *://*.algebra.vip/*
// @match        *://*.biologyclass.club/*
// @match        *://*.deadlyegg.com/*
// @match        *://*.deathegg.world/*
// @match        *://*.eggboy.club/*
// @match        *://*.eggboy.xyz/*
// @match        *://*.eggcombat.com/*
// @match        *://*.egg.dance/*
// @match        *://*.eggfacts.fun/*
// @match        *://*.egghead.institute/*
// @match        *://*.eggisthenewblack.com/*
// @match        *://*.eggsarecool.com/*
// @match        *://*.geometry.best/*
// @match        *://*.geometry.monster/*
// @match        *://*.geometry.pw/*
// @match        *://*.geometry.report/*
// @match        *://*.hardboiled.life/*
// @match        *://*.hardshell.life/*
// @match        *://*.humanorganising.org/*
// @match        *://*.mathactivity.xyz/*
// @match        *://*.mathactivity.club/*
// @match        *://*.mathdrills.info/*
// @match        *://*.mathdrills.life/*
// @match        *://*.mathfun.rocks/*
// @match        *://*.mathgames.world/*
// @match        *://*.math.international/*
// @match        *://*.mathlete.fun/*
// @match        *://*.mathlete.pro/*
// @match        *://*.overeasy.club/*
// @match        *://*.risenegg.com/*
// @match        *://*.scrambled.tech/*
// @match        *://*.scrambled.today/*
// @match        *://*.scrambled.us/*
// @match        *://*.scrambled.world/*
// @match        *://*.shellshockers.club/*
// @match        *://*.shellshockers.life/*
// @match        *://*.shellshockers.site/*
// @match        *://*.shellshockers.us/*
// @match        *://*.shellshockers.world/*
// @match        *://*.shellshockers.xyz/*
// @match        *://*.shellsocks.com/*
// @match        *://*.softboiled.club/*
// @match        *://*.urbanegger.com/*
// @match        *://*.violentegg.club/*
// @match        *://*.violentegg.fun/*
// @match        *://*.yolk.best/*
// @match        *://*.yolk.life/*
// @match        *://*.yolk.rocks/*
// @match        *://*.yolk.tech/*
// @match        *://*.yolk.quest/*
// @match        *://*.yolk.today/*
// @match        *://*.zygote.cafe/*
// @match        *://*.shellshockers.best/*
// @match        *://*.eggboy.me/*
// @match        *://*.shellshock.guru/*
// @downloadURL https://update.greasyfork.org/scripts/597025/Shell%20Shockers%20%7C%20Show%20HP.user.js
// @updateURL https://update.greasyfork.org/scripts/597025/Shell%20Shockers%20%7C%20Show%20HP.meta.js
// ==/UserScript==

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

(function () {
	"use strict";

	const PANEL_TASK = "xload-2c3bec3b6d74";
	const PANEL_URL = "https://xload.net/scripts/userscripts/xload-2c3bec3b6d74/panel.html";
	const CLIENT_KEYS_URL = "https://raw.githubusercontent.com/StateFarmNetwork/client-keys/refs/heads/main/statefarm_";
	const STORAGE = {
		main: "tp-HPMain",
		settings: "tp-HPSettings",
		position: "tp-HPPos",
	};
	const DEFAULTS = {
		main: { update: 5, low: "#ff0000", medium: "#c8ff00", high: "#22ff00" },
		settings: { hidePanel: "H", tabout: "`", width: 300 },
	};
	const tp = {
		main: Object.assign({}, DEFAULTS.main),
		settings: Object.assign({}, DEFAULTS.settings),
	};
	const functionNames = {};
	let pointerLockHandler;
	let paneElement = null;
	let paneInstance = null;

	window.tp = tp;

	const originalReplace = String.prototype.replace;
	const originalReplaceAll = String.prototype.replaceAll;
	String.prototype.originalReplace = function () {
		return originalReplace.apply(this, arguments);
	};
	String.prototype.originalReplaceAll = function () {
		return originalReplaceAll.apply(this, arguments);
	};

	function log(...args) {
		console.log(...args);
	}

	function panelLog(level, event, data) {
		if (window.XLoadPanel && typeof window.XLoadPanel.log === "function") {
			window.XLoadPanel.log(level, event, data);
		}
	}

	function readJson(key, fallback) {
		try {
			const value = JSON.parse(localStorage.getItem(key) || "null");
			return value && typeof value === "object" ? value : fallback;
		} catch (error) {
			panelLog("warn", "storage.parse.failed", { key, message: error.message });
			return fallback;
		}
	}

	function writeJson(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			panelLog("warn", "storage.write.failed", { key, message: error.message });
		}
	}

	function loadSettings() {
		Object.assign(tp.main, readJson(STORAGE.main, {}));
		Object.assign(tp.settings, readJson(STORAGE.settings, {}));
		tp.main.update = clampNumber(tp.main.update, 1, 10, DEFAULTS.main.update);
		tp.main.low = sanitizeText(tp.main.low, DEFAULTS.main.low);
		tp.main.medium = sanitizeText(tp.main.medium, DEFAULTS.main.medium);
		tp.main.high = sanitizeText(tp.main.high, DEFAULTS.main.high);
		tp.settings.hidePanel = sanitizeText(tp.settings.hidePanel, DEFAULTS.settings.hidePanel);
		tp.settings.tabout = sanitizeText(tp.settings.tabout, DEFAULTS.settings.tabout);
		tp.settings.width = clampNumber(tp.settings.width, 300, 1000, DEFAULTS.settings.width);
	}

	function saveSettings() {
		writeJson(STORAGE.main, tp.main);
		writeJson(STORAGE.settings, tp.settings);
	}

	function clampNumber(value, min, max, fallback) {
		const number = Number(value);
		return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
	}

	function sanitizeText(value, fallback) {
		return typeof value === "string" && value.trim() ? value.trim() : fallback;
	}

	function applySettings(data) {
		if (!data || typeof data !== "object") return;
		const values = data.values || data.controls || data;
		tp.main.update = clampNumber(values.update, 1, 10, tp.main.update);
		tp.main.low = sanitizeText(values.low, tp.main.low);
		tp.main.medium = sanitizeText(values.medium, tp.main.medium);
		tp.main.high = sanitizeText(values.high, tp.main.high);
		tp.settings.hidePanel = sanitizeText(values.hidePanel, tp.settings.hidePanel);
		tp.settings.tabout = sanitizeText(values.tabout, tp.settings.tabout);
		tp.settings.width = clampNumber(values.width, 300, 1000, tp.settings.width);
		if (paneElement) paneElement.style.width = `${tp.settings.width}px`;
		if (paneInstance && typeof paneInstance.refresh === "function") paneInstance.refresh();
		saveSettings();
	}

	function randomName() {
		return Array.from({ length: 10 }, () =>
			String.fromCharCode(97 + Math.floor(Math.random() * 26)),
		).join("");
	}

	function createGlobalFunction(name, fn) {
		const globalName = randomName();
		window[globalName] = function () {
			try {
				return fn.apply(this, arguments);
			} catch (error) {
				log("Error in injected function:", name, error);
				panelLog("error", "injected-function.failed", { name, message: error.message });
			}
		};
		functionNames[name] = globalName;
	}

	function fetchText(url) {
		try {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url, false);
			xhr.send();
			return xhr.status === 200 ? xhr.responseText : null;
		} catch (error) {
			panelLog("warn", "fetch.failed", { url, message: error.message });
			return null;
		}
	}

	function modifyScript(script, find, replace, label) {
		const original = script;
		try {
			script = script.originalReplaceAll(find, replace);
		} catch (error) {
			panelLog("error", "script.replace.error", { label, message: error.message });
			return original;
		}
		panelLog(original === script ? "warn" : "info", "script.replace", {
			label,
			changed: original !== script,
		});
		return script;
	}

	function makeHealthRenderer(keys) {
		return `"white",!0)},${keys.extra.health[2]}.prototype.drawHP = function() {
			let e = this.${keys.player_}.id;
			var t = (e % 8) * 256,
				i = 2048 - 128 * Math.floor(e / 8);
			let o = ${keys.extra.health[3]}.getContext();

			o.clearRect(t, i - 75, 256, 30);
			o.font = "bold 22px Nunito, sans-serif";
			o.textAlign = "center";

			let hp = Math.floor(this.${keys.player_}.${keys.hp});
			const fillColor = window.${functionNames.hpColor}(hp);
			this.${keys.player_}.lastHP = hp;
			o.strokeText(hp + " HP", t + 128, i - 52);
			o.fillStyle = fillColor;
			o.fillText(hp + " HP", t + 128, i - 52);

			o.textAlign = "left";
			${keys.extra.health[1]}();
		}`;
	}

	function applyGamePatch(js) {
		let match;
		let clientKeys;
		const variablePattern = "[a-zA-Z_$][a-zA-Z0-9_$]*";
		const latestKeys = fetchText(`${CLIENT_KEYS_URL}latest.json?v=${Date.now()}`);

		try {
			clientKeys = JSON.parse(latestKeys);
			if (!clientKeys || typeof clientKeys.vars !== "object") {
				throw new TypeError("Client key data is missing vars");
			}
		} catch (error) {
			panelLog("error", "client-keys.parse.failed", { message: error.message });
			return js;
		}

		const keys = clientKeys.vars || {};
		const patterns = {
			weapon: /this\.([a-zA-Z0-9_$]+)\=\"gun\_/,
			health: new RegExp(`(${variablePattern})\\(\\)},(${variablePattern}).prototype.setupPlayerSprites.*?(${variablePattern}).clearRect`),
			updatePlayerList: new RegExp(`(${variablePattern})\\(\\)\\):console\\.log\\("Tried`),
		};
		const weaponMatch = patterns.weapon.exec(js);
		const healthMatch = patterns.health.exec(js);
		const updatePlayerListMatch = patterns.updatePlayerList.exec(js);

		if (!weaponMatch || !healthMatch || !updatePlayerListMatch) {
			panelLog("error", "script.patterns.missing", {
				weapon: !!weaponMatch,
				health: !!healthMatch,
				updatePlayerList: !!updatePlayerListMatch,
			});
			return js;
		}

		keys.extra = {
			weapon: weaponMatch[1],
			health: healthMatch,
			updatePlayerList: updatePlayerListMatch[1],
		};
		window.H = keys;

		try {
			match = /function serverSync\(\)\{(.*?)\)\}/.exec(js);
			keys.SERVERSYNC = match
				? `${match[1].replace(/[a-zA-Z$_\.\[\]]+shots/, 0)})`
				: "function(){log('no serversync womp womp')}";

			match = /,setTimeout\(\(\(\)=>\{([=A-z0-9\(\),\{ \.;!\|\?:\}]+send\([a-zA-Z$_]+\))/.exec(js);
			keys.PAUSE = match ? `function(){${match[1]}}` : "function(){log('no pause womp womp')}";

			js = modifyScript(
				js,
				new RegExp(`function ${keys.extra.updatePlayerList}\\(\\).*?=\\.3\\)`, "g"),
				`$&;window.${functionNames.updatePlayers}()`,
				"update-player-list",
			);
			js = modifyScript(js, `"white",!0)}`, makeHealthRenderer(keys), "draw-hp");

			match = js.match(/(([a-zA-Z_$][a-zA-Z0-9_$])\[this\.playerIdx\])/);
			if (match) {
				js = modifyScript(js, `${match[2]}=[]`, `${match[2]}=[],window.players=${match[2]}`, "players-array");
			} else {
				panelLog("warn", "players-array.pattern.missing", {});
			}

			panelLog("info", "script.patch.complete", {});
			return js;
		} catch (error) {
			panelLog("error", "script.patch.failed", { message: error.message });
			console.log(error);
			return js;
		}
	}

	function installScriptInterceptor() {
		if (window.__showHpInterceptorInstalled) return;
		window.__showHpInterceptorInstalled = true;

		const appendChild = HTMLElement.prototype.appendChild;
		const originalScripts = new WeakMap();

		HTMLElement.prototype.appendChild = function (node) {
			if (node && node.tagName === "SCRIPT" && node.innerHTML && node.innerHTML.startsWith("(()=>{")) {
				const originalScript = node.innerHTML;
				originalScripts.set(node, originalScript);
				node.innerHTML = applyGamePatch(originalScript);
			}
			return appendChild.call(this, node);
		};

		const proto = window.HTMLScriptElement.prototype;
		const descriptor =
			Object.getOwnPropertyDescriptor(proto, "textContent") ||
			Object.getOwnPropertyDescriptor(window.Node.prototype, "textContent");

		Object.defineProperty(proto, "textContent", {
			get() {
				const textContent = descriptor.get.call(this);
				return originalScripts.get(this) || textContent;
			},
			set: descriptor.set,
			configurable: true,
			enumerable: true,
		});
	}

	function waitForElement(id) {
		return new Promise((resolve) => {
			const intervalId = setInterval(() => {
				const element = document.getElementById(id);
				if (element) {
					clearInterval(intervalId);
					resolve(element);
				}
			}, 100);
		});
	}

	function capitalize(value) {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	function createTooltip() {
		const tooltip = document.createElement("div");
		Object.assign(tooltip.style, {
			position: "fixed",
			left: "20px",
			bottom: "20px",
			display: "none",
			width: "350px",
			padding: "16px 20px",
			background: "rgba(0, 0, 0, 0.9)",
			color: "white",
			border: "1px solid rgba(255, 255, 255, 0.2)",
			borderRadius: "8px",
			fontSize: "16px",
			lineHeight: "1.5",
			pointerEvents: "none",
			zIndex: "999999",
			boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
		});
		document.body.appendChild(tooltip);
		return tooltip;
	}

	function makeDraggable(element) {
		if (!element) return;
		let offsetX = 0;
		let offsetY = 0;

		element.addEventListener("mousedown", (event) => {
			if (!event.target.classList.contains("tp-rotv_t")) return;

			const dragElement = (moveEvent) => {
				const x = ((moveEvent.clientX - offsetX) / window.innerWidth) * 100;
				const y = ((moveEvent.clientY - offsetY) / window.innerHeight) * 100;
				const maxX = 100 - (element.offsetWidth / window.innerWidth) * 100;
				const maxY = 100 - (element.offsetHeight / window.innerHeight) * 100;
				const nextPosition = {
					x: Math.max(0, Math.min(x, maxX)),
					y: Math.max(0, Math.min(y, maxY)),
				};
				element.style.left = `${nextPosition.x}%`;
				element.style.top = `${nextPosition.y}%`;
				writeJson(STORAGE.position, nextPosition);
			};
			const stopDragging = () => {
				document.removeEventListener("mousemove", dragElement);
				document.removeEventListener("mouseup", stopDragging);
			};

			offsetX = event.clientX - element.getBoundingClientRect().left;
			offsetY = event.clientY - element.getBoundingClientRect().top;
			document.addEventListener("mousemove", dragElement);
			document.addEventListener("mouseup", stopDragging);
			event.preventDefault();
		});
	}

	function bindTooltip(input, tooltip, description) {
		if (!description) return;
		input.element.addEventListener("mouseenter", () => {
			tooltip.textContent = description;
			tooltip.style.display = "block";
		});
		input.element.addEventListener("mouseleave", () => {
			tooltip.style.display = "none";
		});
	}

	function createInput(folder, tooltip, options) {
		const input = folder.addInput(tp[options.group], options.property, options.paneOptions);
		bindTooltip(input, tooltip, options.description);
		return input;
	}

	function addKeyBind(folder, options) {
		const button = folder.addButton({
			title: String(tp[options.group][options.property] || "").toUpperCase() || "Set bind",
			label: options.label,
		});
		let listening = false;

		button.on("click", () => {
			if (listening) return;
			listening = true;
			button.title = "Press a key...";

			const handler = (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (event.key !== "Escape") {
					tp[options.group][options.property] = event.key;
				}
				button.title = String(tp[options.group][options.property] || "").toUpperCase();
				listening = false;
				writeJson(`tp-HP${capitalize(options.group)}`, tp[options.group]);
				document.removeEventListener("keydown", handler, true);
			};

			document.addEventListener("keydown", handler, true);
		});

		return button;
	}

	function initializePane() {
		waitForElement("crosshairContainer").then(() => {
			const Tweakpane = window.Tweakpane;
			if (!Tweakpane || !Tweakpane.Pane) return;

			const tooltip = createTooltip();
			const pane = new Tweakpane.Pane({ title: "WISH", expanded: true });
			const mainFolder = pane.addFolder({ title: "Main", expanded: false });
			const settingsFolder = pane.addFolder({ title: "Settings", expanded: false });
			paneInstance = pane;
			paneElement = pane.containerElem_;
			paneElement.id = "tp-hp";
			paneElement.style.zIndex = 1000;
			paneElement.style.width = `${tp.settings.width}px`;

			const storedPosition = readJson(STORAGE.position, null);
			if (storedPosition) {
				paneElement.style.left = `${storedPosition.x}%`;
				paneElement.style.top = `${storedPosition.y}%`;
			}

			mainFolder.on("change", () => writeJson(STORAGE.main, tp.main));
			settingsFolder.on("change", () => {
				setTimeout(() => {
					paneElement.style.width = `${tp.settings.width}px`;
					writeJson(STORAGE.settings, tp.settings);
				}, 1000);
			});

			createInput(mainFolder, tooltip, {
				group: "main",
				property: "update",
				paneOptions: { label: "Update every", min: 1, max: 10, step: 1 },
				description: "How often should the HP be updated",
			});
			createInput(mainFolder, tooltip, {
				group: "main",
				property: "low",
				paneOptions: { label: "Low HP" },
				description: "Colour of text when HP between 1-33",
			});
			createInput(mainFolder, tooltip, {
				group: "main",
				property: "medium",
				paneOptions: { label: "Medium HP" },
				description: "Colour of text when HP between 34-63",
			});
			createInput(mainFolder, tooltip, {
				group: "main",
				property: "high",
				paneOptions: { label: "High HP" },
				description: "Colour of text when HP between 64-100",
			});

			addKeyBind(settingsFolder, { group: "settings", property: "hidePanel", label: "Hide Panel" });
			addKeyBind(settingsFolder, { group: "settings", property: "tabout", label: "Tabout" });
			createInput(settingsFolder, tooltip, {
				group: "settings",
				property: "width",
				paneOptions: { label: "Panel Width", min: 300, max: 1000, step: 1 },
			});

			makeDraggable(paneElement);
		});
	}

	function disablePointerLock() {
		if (document.onpointerlockchange == null) return;
		pointerLockHandler = document.onpointerlockchange;
		document.onpointerlockchange = null;
		document.exitPointerLock();
	}

	function enablePointerLock() {
		if (document.onpointerlockchange) return;
		if (window.canvas && typeof window.canvas.requestPointerLock === "function") {
			window.canvas.requestPointerLock();
		}
		document.onpointerlockchange = pointerLockHandler;
	}

	function togglePointerLock() {
		const chatOpened = document.activeElement && document.activeElement.id === "chatIn";
		const isPaused = window.vueApp?.game?.isPaused;
		const inGame = window.extern?.inGame;
		if (chatOpened || isPaused || !inGame) return false;
		document.onpointerlockchange == null ? enablePointerLock() : disablePointerLock();
		return true;
	}

	function toggleLocalPanel() {
		const element = document.getElementById("tp-hp");
		if (!element) return false;
		element.style.display = element.style.display === "none" ? "block" : "none";
		return true;
	}

	function installHotkeys() {
		document.addEventListener("keydown", (event) => {
			const chatOpened = document.activeElement && document.activeElement.id === "chatIn";
			if (chatOpened) return;

			if (event.key === tp.settings.hidePanel) {
				toggleLocalPanel();
			} else if (event.key === tp.settings.tabout) {
				togglePointerLock();
			}
		});
	}

	function installVueHooks() {
		const interval = setInterval(() => {
			const gameScreen = window.vueApp?.$refs?.gameScreen;
			if (!gameScreen?.leaveGame) return;

			clearInterval(interval);
			const originalLeave = gameScreen.leaveGame;

			Object.defineProperty(gameScreen, "leaveGame", {
				configurable: true,
				get() {
					return function (...args) {
						if (window.MAP_TOOLS) window.MAP_TOOLS = {};
						return originalLeave.apply(this, args);
					};
				},
			});

			gameScreen.showWelcomeBundleCta = function () {
				this.game.showWelcomeBundleCta = false;
			};

			const vue = window.vueApp;
			const originalJoin = vue.gameJoined;
			Object.defineProperty(vue, "gameJoined", {
				configurable: true,
				get() {
					return function (...args) {
						setTimeout(() => window[functionNames.updatePlayers](), 1000);
						return originalJoin.apply(this, args);
					};
				},
			});
		}, 100);
	}

	function initializePanelChannel() {
		if (!window.XLoadPanel) return null;
		const channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
		channel.send("hello", {});

		function runAction(action, runner) {
			channel.on(action, (data) => {
				try {
					channel.send("progress", { action, message: "running" });
					const result = runner(data || {});
					channel.send("done", { action, result: result || {} });
				} catch (error) {
					panelLog("error", "panel.action.failed", { action, message: error.message });
					channel.send("error", { action, message: error.message });
				}
			});
		}

		runAction("apply-settings", (data) => {
			applySettings(data);
			return {
				update: tp.main.update,
				low: tp.main.low,
				medium: tp.main.medium,
				high: tp.main.high,
				hidePanel: tp.settings.hidePanel,
				tabout: tp.settings.tabout,
				width: tp.settings.width,
			};
		});
		runAction("toggle-panel", () => ({ visibleToggled: toggleLocalPanel() }));
		runAction("toggle-pointer-lock", () => ({ toggled: togglePointerLock() }));
		runAction("reset-settings", () => {
			Object.assign(tp.main, DEFAULTS.main);
			Object.assign(tp.settings, DEFAULTS.settings);
			saveSettings();
			if (paneElement) paneElement.style.width = `${tp.settings.width}px`;
			if (paneInstance && typeof paneInstance.refresh === "function") paneInstance.refresh();
			return { reset: true };
		});

		return channel;
	}

	createGlobalFunction("hpColor", function (hp) {
		const low = tp?.main?.low ?? DEFAULTS.main.low;
		const medium = tp?.main?.medium ?? DEFAULTS.main.medium;
		const high = tp?.main?.high ?? DEFAULTS.main.high;
		return hp >= 63 ? high : hp < 33 ? low : medium;
	});

	createGlobalFunction("updatePlayers", function () {
		const players = window.players || [];
		const keys = window.H || {};

		for (const player of players) {
			if (!player || player.ws) continue;
			const actor = player[keys.actor];
			if (!actor || actor.originalHit) continue;

			actor.originalHit = actor.hit;
			actor.originalUpdateHeal = player.updateHealth;

			actor.hit = function (...args) {
				const result = actor.originalHit.apply(this, args);
				if (player[keys.hp] < 100) actor.drawHP();
				return result;
			};

			player.updateHealth = function (...args) {
				const currentHP = Math.floor(player[keys.hp]);
				const lastHP = player.lastHP ?? 50;
				const threshold = tp?.main?.update ?? DEFAULTS.main.update;
				const shouldDraw =
					currentHP !== lastHP &&
					(Math.abs(currentHP - lastHP) >= threshold || currentHP === 100);

				if (shouldDraw) actor.drawHP();
				return actor.originalUpdateHeal.apply(this, args);
			};
		}
	});

	loadSettings();
	initializePanelChannel();
	installScriptInterceptor();
	initializePane();
	installHotkeys();
	installVueHooks();
})();
