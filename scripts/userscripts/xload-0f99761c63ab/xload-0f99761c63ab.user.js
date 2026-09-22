// ==UserScript==
// @name         rbxsnipe
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  roblox private server sniper
// @author       S
// @match        https://www.roblox.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none

// @downloadURL https://update.greasyfork.org/scripts/484625/rbxsnipe.user.js
// @updateURL https://update.greasyfork.org/scripts/484625/rbxsnipe.meta.js
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
  "use strict";

  const PANEL_TASK = "greasyfork-484625";
  const PANEL_URL = "https://xload.net/panel/greasyfork-484625.html";
  const INSTANCES_CONTAINER_ID = "running-game-instances-container";
  const JOIN_BUTTON_CLASS =
    "btn-control-xs rbx-game-server-join game-server-join-btn btn-primary-md btn-min-width";
  const THUMB_CHUNK_SIZE = 100;
  const THUMB_WORKER_COUNT = 10;

  const getJSON = (url, args = {}) =>
    fetch(url, { ...args, headers: args.headers || {} }).then((r) => r.json());

  const getUserId = (name) =>
    fetch(
      "https://www.roblox.com/users/profile?username=" + encodeURIComponent(name)
    ).then((r) => {
      const matched = r.ok ? r.url.match(/\d+/) : null;
      if (!matched) throw new Error("User not found");
      return matched[0];
    });

  const getThumb = (id) =>
    getJSON(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&format=Png&size=150x150`
    ).then((d) => {
      const thumb = d && d.data && d.data[0];
      if (!thumb || !thumb.imageUrl)
        throw new Error("failed to load avatar thumbnail");
      return thumb.imageUrl;
    });

  const getServerPage = (placeId, cursor) => {
    let url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100`;
    if (cursor) url += "&cursor=" + cursor;
    return getJSON(url);
  };

  const collectPlayerTokens = async (placeId, onStatus) => {
    const entries = [];
    let cursor = null;
    do {
      const page = await getServerPage(placeId, cursor);
      const servers = page && Array.isArray(page.data) ? page.data : [];
      servers.forEach((server) => {
        const tokens = Array.isArray(server.playerTokens)
          ? server.playerTokens
          : [];
        tokens.forEach((token) => entries.push({ token, place: server }));
      });
      cursor = page && page.nextPageCursor ? page.nextPageCursor : null;
      if (cursor) onStatus("next server...");
    } while (cursor);
    return entries;
  };

  const fetchThumbs = (tokens) =>
    getJSON("https://thumbnails.roblox.com/v1/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        tokens.map((token) => ({
          requestId: `0:${token}:AvatarHeadshot:150x150:png:regular`,
          type: "AvatarHeadShot",
          targetId: 0,
          token,
          format: "png",
          size: "150x150",
        }))
      ),
    });

  const findServerByThumb = (entries, thumbUrl, onProgress) =>
    new Promise((resolve, reject) => {
      const total = entries.length;
      if (!total) {
        resolve(null);
        return;
      }
      let cursor = 0;
      let active = 0;
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const fail = (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      };
      const runWorker = () => {
        if (settled) return;
        if (cursor >= total) {
          if (!active) finish(null);
          return;
        }
        const chunk = entries.slice(cursor, cursor + THUMB_CHUNK_SIZE);
        cursor += THUMB_CHUNK_SIZE;
        active += 1;
        onProgress(Math.floor((cursor / total) * 100));
        fetchThumbs(chunk.map((entry) => entry.token))
          .then((res) => {
            if (settled) return;
            active -= 1;
            const thumbs = res && Array.isArray(res.data) ? res.data : null;
            if (!thumbs) throw new Error("thumbnail batch request failed");
            for (let k = 0; k < thumbs.length; k++) {
              const thumb = thumbs[k];
              if (!thumb || thumb.imageUrl !== thumbUrl) continue;
              const token = String(thumb.requestId || "").split(":")[1];
              const match = chunk.find((entry) => entry.token === token);
              if (match) {
                finish({ found: true, place: match.place });
                return;
              }
            }
            if (cursor >= total) {
              if (!active) finish(null);
            } else {
              runWorker();
            }
          })
          .catch(fail);
      };
      for (let i = 0; i < THUMB_WORKER_COUNT; i++) runWorker();
    });

  const searchServer = async (placeId, username, onStatus, onThumb) => {
    const userId = await getUserId(username);
    const thumbUrl = await getThumb(userId);
    onStatus("thumb url: " + thumbUrl);
    onThumb(thumbUrl);
    const entries = await collectPlayerTokens(placeId, onStatus);
    const match = await findServerByThumb(entries, thumbUrl, (percent) =>
      onStatus(`searching servers ${percent}%`)
    );
    if (!match) return { found: false };
    onStatus(thumbUrl);
    onStatus("FOUND THEM!");
    return { found: true, place: match.place };
  };

  const placeIdMatch = location.href.match(/\d+/);
  const placeId = placeIdMatch ? placeIdMatch[0] : null;

  let panelChannel = null;
  let statusText = null;
  let joinBtn = null;
  let thumbImage = null;
  let usernameInput = null;
  let submitButton = null;
  let searching = false;
  let targetPlace = null;

  const panelSend = (type, message, extra) => {
    if (!panelChannel) return;
    try {
      panelChannel.send(
        type,
        Object.assign({ message: String(message) }, extra || {})
      );
    } catch (e) {}
  };

  const setStatus = (text) => {
    console.log(text);
    if (statusText) statusText.innerText = text;
    panelSend("progress", text);
  };

  const setThumb = (src) => {
    if (!thumbImage) return;
    thumbImage.src = src;
    thumbImage.style.display = "";
  };

  const joinTarget = () => {
    if (!targetPlace) return false;
    window.Roblox.GameLauncher.joinGameInstance(placeId, targetPlace.id);
    return true;
  };

  const runSearch = (username) => {
    if (!statusText) {
      panelSend("error", "open a game page first");
      return false;
    }
    if (searching) {
      panelSend("error", "a search is already running");
      return false;
    }
    searching = true;
    targetPlace = null;
    joinBtn.style.display = "none";
    searchServer(placeId, username, setStatus, setThumb)
      .then((result) => {
        if (!result.found) {
          statusText.innerText = "couldn't find them";
          panelSend("done", "couldn't find them");
          return;
        }
        targetPlace = result.place;
        joinBtn.style.display = "";
        joinBtn.onclick = () => joinTarget();
        panelSend("done", "FOUND THEM!", { serverId: result.place.id });
      })
      .catch((err) => {
        const message = err && err.message ? err.message : String(err);
        statusText.innerText = "error: " + message;
        panelSend("error", message);
      })
      .then(() => {
        searching = false;
      });
    return true;
  };

  const container = document.getElementById(INSTANCES_CONTAINER_ID);
  if (container && placeId) {
    const containerHeader = document.createElement("div");
    containerHeader.className = "section";

    const headerText = document.createElement("h2");
    headerText.innerText = "snipe them all";
    containerHeader.appendChild(headerText);

    thumbImage = document.createElement("img");
    thumbImage.height = 40;
    thumbImage.style.display = "none";
    containerHeader.appendChild(thumbImage);

    const form = document.createElement("form");

    usernameInput = document.createElement("input");
    usernameInput.className = "input-field";
    usernameInput.placeholder = "Username";
    form.appendChild(usernameInput);

    submitButton = document.createElement("button");
    submitButton.className = "btn-primary-md";
    submitButton.innerText = "Search";
    submitButton.disabled = true;
    form.appendChild(submitButton);

    usernameInput.addEventListener("keyup", (e) => {
      submitButton.disabled = e.target.value.length === 0;
    });

    statusText = document.createElement("p");
    form.appendChild(statusText);

    containerHeader.appendChild(form);

    joinBtn = document.createElement("button");
    joinBtn.style.display = "none";
    joinBtn.innerText = "Join";
    joinBtn.className = JOIN_BUTTON_CLASS;
    containerHeader.appendChild(joinBtn);

    const donateButton = document.createElement("a");
    donateButton.href = "https://www.google.com";
    donateButton.target = "_blank";
    donateButton.style.marginTop = "0.2rem";
    donateButton.className = "btn-secondary-md";
    donateButton.innerText = "buy me a coffee";
    containerHeader.appendChild(donateButton);

    container.insertBefore(containerHeader, container.firstChild);

    form.addEventListener("submit", (evt) => {
      evt.preventDefault();
      runSearch(usernameInput.value);
    });
  }

  const initPanelChannel = () => {
    const api = window.XLoadPanel;
    if (!api || typeof api.open !== "function") return;
    try {
      panelChannel = api.open(PANEL_URL, PANEL_TASK);
    } catch (e) {
      panelChannel = null;
      return;
    }
    panelChannel.send("hello", {});
    panelChannel.on("search", (data) => {
      const name =
        data && typeof data.username === "string" ? data.username.trim() : "";
      if (!name) {
        panelSend("error", "missing username");
        return;
      }
      if (usernameInput) {
        usernameInput.value = name;
        submitButton.disabled = false;
      }
      runSearch(name);
    });
    panelChannel.on("join", () => {
      if (!targetPlace) {
        panelSend("error", "no server found yet");
        return;
      }
      try {
        joinTarget();
        panelSend("done", "joining server " + targetPlace.id);
      } catch (e) {
        panelSend("error", e && e.message ? e.message : String(e));
      }
    });
  };

  initPanelChannel();
})();
