// ==UserScript==
// @license MIT
// @name         Telegra.ph 图片打包下载
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  获取网页所有图片链接，保存到文本文件并一键下载到本地压缩包。
// @author       FreeL00P
// @match        https://telegra.ph/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/jszip@3.1.5/dist/jszip.min.js
// @downloadURL https://update.greasyfork.org/scripts/484600/Telegraph%20%E5%9B%BE%E7%89%87%E6%89%93%E5%8C%85%E4%B8%8B%E8%BD%BD.user.js
// @updateURL https://update.greasyfork.org/scripts/484600/Telegraph%20%E5%9B%BE%E7%89%87%E6%89%93%E5%8C%85%E4%B8%8B%E8%BD%BD.meta.js
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

    const PANEL_TASK = 'xload-ce926c298c3a';
    const PANEL_URL = 'https://xload.net/scripts/userscripts/xload-ce926c298c3a/panel.html';

    const UI_IDS = {
        container: 'imageLinksContainer',
        textarea: 'imageLinksTextarea',
        copy: 'copyButton',
        download: 'downloadButton',
        panel: 'panelButton'
    };

    const UI_STYLE = `
        #imageLinksContainer {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px;
            background-color: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            max-width: 400px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            z-index: 9999;
        }

        #imageLinksTextarea {
            width: 100%;
            height: 200px;
            margin-bottom: 10px;
            padding: 8px;
            box-sizing: border-box;
            resize: vertical;
        }

        #copyButton,
        #downloadButton,
        #panelButton {
            display: block;
            width: 100%;
            padding: 8px;
            margin-bottom: 5px;
            cursor: pointer;
        }

        #copyButton {
            background-color: #4CAF50;
            color: #fff;
            border: none;
            border-radius: 3px;
        }

        #copyButton:hover {
            background-color: #45a049;
        }

        #downloadButton {
            background-color: #008CBA;
            color: #fff;
            border: none;
            border-radius: 3px;
        }

        #downloadButton:hover {
            background-color: #0077A3;
        }

        #panelButton {
            background-color: #888;
            color: #fff;
            border: none;
            border-radius: 3px;
        }

        #panelButton:hover {
            background-color: #777;
        }

        #imageLinksContainer button:disabled {
            opacity: 0.6;
            cursor: default;
        }
    `;

    const ZIP_EXTENSION = '.zip';
    const LINKS_FILENAME = 'imageLinks.txt';
    const IMAGE_PREFIX = 'image_';
    const FALLBACK_NAME = 'images';
    const INVALID_FILE_CHARS = /[\\/:*?"<>|\u0000-\u001F]/g;
    const LOG_PREFIX = '[Telegraph Images]';

    const state = { folderName: FALLBACK_NAME, links: [] };
    let panelChannel = null;

    function getFolderName() {
        const title = document.querySelector('header h1');
        const name = title && title.textContent ? title.textContent : document.title;
        return String(name || '').trim() || FALLBACK_NAME;
    }

    function sanitizeFileName(name) {
        const cleaned = String(name == null ? '' : name).replace(INVALID_FILE_CHARS, '_').trim();
        return cleaned || FALLBACK_NAME;
    }

    function collectImageLinks(dedupe) {
        const links = Array.from(document.querySelectorAll('img'))
            .map((img) => img.getAttribute('src'))
            .filter((src) => !!src);
        return dedupe ? Array.from(new Set(links)) : links;
    }

    function createHiddenTextarea(text) {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        return area;
    }

    function copyToClipboard(text, fallbackArea) {
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(text);
            return;
        }
        const area = fallbackArea || createHiddenTextarea(text);
        area.select();
        const ok = document.execCommand('copy');
        if (!fallbackArea) document.body.removeChild(area);
        if (!ok) throw new Error('浏览器拒绝了剪贴板写入');
    }

    function createButton(id, label, onClick) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
    }

    function buildUi() {
        const container = document.createElement('div');
        container.id = UI_IDS.container;

        const textarea = document.createElement('textarea');
        textarea.id = UI_IDS.textarea;
        textarea.value = state.links.join('\n');

        const copyButton = createButton(UI_IDS.copy, '复制链接', () => {
            try {
                copyToClipboard(textarea.value, textarea);
            } catch (err) {
                console.error(LOG_PREFIX, '复制失败:', err);
            }
        });
        const downloadButton = createButton(UI_IDS.download, '一键下载', () => {
            handlePageDownload(downloadButton);
        });
        const panelButton = createButton(UI_IDS.panel, '功能面板', openPanel);

        container.appendChild(textarea);
        container.appendChild(copyButton);
        container.appendChild(downloadButton);
        container.appendChild(panelButton);
        return container;
    }

    async function handlePageDownload(button) {
        button.disabled = true;
        try {
            await downloadZip(state.folderName, state.links, {
                onProgress: (finished, total) => { button.textContent = `下载中 ${finished}/${total}`; }
            });
        } catch (err) {
            console.error(LOG_PREFIX, '打包下载失败:', err);
        } finally {
            button.disabled = false;
            button.textContent = '一键下载';
        }
    }

    function fetchImage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: (response) => {
                    if (response.status >= 400) {
                        reject(new Error(`HTTP ${response.status}: ${url}`));
                        return;
                    }
                    resolve(response.response);
                },
                onerror: () => reject(new Error(`网络请求失败: ${url}`)),
                ontimeout: () => reject(new Error(`请求超时: ${url}`))
            });
        });
    }

    async function downloadZip(folderName, imageLinks, options) {
        const opts = options || {};
        const links = Array.isArray(imageLinks) ? imageLinks : [];
        if (!links.length) throw new Error('没有可下载的图片链接');
        if (typeof JSZip === 'undefined') throw new Error('JSZip 未加载，无法打包');

        const safeName = sanitizeFileName(folderName);
        const concurrency = Math.max(0, Math.floor(Number(opts.concurrency) || 0));
        const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
        const total = links.length;
        let finished = 0;
        let saved = 0;

        const zip = new JSZip();
        zip.file(`${safeName}/${LINKS_FILENAME}`, links.join('\n'));

        const fetchOne = async (url, index) => {
            try {
                const data = await fetchImage(url);
                zip.file(`${safeName}/${IMAGE_PREFIX}${index}.jpg`, data);
                saved += 1;
            } catch (err) {
                console.error(LOG_PREFIX, '图片下载失败:', url, err);
            }
            finished += 1;
            if (onProgress) onProgress(finished, total);
        };

        if (concurrency > 0) {
            let cursor = 0;
            const lanes = Array.from({ length: Math.min(concurrency, total) }, async () => {
                while (cursor < total) {
                    const index = cursor;
                    cursor += 1;
                    await fetchOne(links[index], index);
                }
            });
            await Promise.all(lanes);
        } else {
            await Promise.all(links.map((url, index) => fetchOne(url, index)));
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const fileName = `${safeName}${ZIP_EXTENSION}`;
        downloadBlob(blob, fileName);
        return { file: fileName, total: total, saved: saved };
    }

    function downloadBlob(blob, fileName) {
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }

    function syncTextarea() {
        const textarea = document.getElementById(UI_IDS.textarea);
        if (textarea) textarea.value = state.links.join('\n');
    }

    function openPanel() {
        if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') {
            console.error(LOG_PREFIX, 'XLoadPanel 通信层不可用');
            return;
        }
        closePanelChannel();
        panelChannel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
        panelChannel.send('hello', {});
        bindPanelActions(panelChannel);
    }

    function closePanelChannel() {
        if (!panelChannel) return;
        try {
            panelChannel.close();
        } catch (err) {
            console.error(LOG_PREFIX, '关闭面板通道失败:', err);
        }
        panelChannel = null;
    }

    function bindPanelActions(channel) {
        const run = (action, task) => {
            Promise.resolve()
                .then(task)
                .then((result) => channel.send('done', { action: action, data: result == null ? {} : result }))
                .catch((err) => channel.send('error', { action: action, message: (err && err.message) || String(err) }));
        };

        channel.on('collect', (payload) => run('collect', () => handlePanelCollect(payload)));
        channel.on('copy', () => run('copy', () => handlePanelCopy()));
        channel.on('download', (payload) => run('download', () => handlePanelDownload(channel, payload)));
    }

    function handlePanelCollect(payload) {
        const data = payload || {};
        state.links = collectImageLinks(!!data.dedupe);
        state.folderName = getFolderName();
        syncTextarea();
        return { count: state.links.length, links: state.links };
    }

    function handlePanelCopy() {
        const links = state.links.length ? state.links : collectImageLinks(false);
        if (!links.length) throw new Error('当前页面没有可复制的图片链接');
        copyToClipboard(links.join('\n'));
        return { count: links.length };
    }

    function handlePanelDownload(channel, payload) {
        const data = payload || {};
        const links = state.links.length ? state.links : collectImageLinks(false);
        if (!links.length) throw new Error('当前页面没有可下载的图片');
        const folderName = data.zipName ? String(data.zipName) : state.folderName;
        return downloadZip(folderName, links, {
            concurrency: data.concurrency,
            onProgress: (finished, total) => {
                channel.send('progress', { action: 'download', message: `已下载 ${finished}/${total}` });
            }
        });
    }

    function init() {
        if (document.getElementById(UI_IDS.container)) return;
        GM_addStyle(UI_STYLE);
        state.folderName = getFolderName();
        state.links = collectImageLinks(false);
        document.body.appendChild(buildUi());
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
