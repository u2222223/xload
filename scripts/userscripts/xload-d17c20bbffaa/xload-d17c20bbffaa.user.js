// ==UserScript==
// @name         RuTracker Full-Text Search in Topics
// @namespace    copyMister
// @version      1.4
// @description  Allows to search for text on all pages of RuTracker topics
// @description:ru  Позволяет искать текст на всех страницах тем на Рутрекере
// @author       copyMister
// @license      MIT
// @match        https://rutracker.org/forum/viewtopic.php*
// @match        https://rutracker.net/forum/viewtopic.php*
// @match        https://rutracker.nl/forum/viewtopic.php*
// @match        https://rutracker.lib/forum/viewtopic.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rutracker.org
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @homepageURL  https://rutracker.org/forum/viewtopic.php?t=4717182
// @downloadURL https://update.greasyfork.org/scripts/484622/RuTracker%20Full-Text%20Search%20in%20Topics.user.js
// @updateURL https://update.greasyfork.org/scripts/484622/RuTracker%20Full-Text%20Search%20in%20Topics.meta.js
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

    var POST_SELECTOR = '#topic_main > tbody[id^="post_"]';
    var HIDE_ON_SEARCH_SELECTOR = 'h1.maintitle + div.small, #pagination';
    var TOTAL_PAGES_SELECTOR = '#pagination b:nth-child(2)';
    var DEFAULT_PER_PAGE = 30;
    var KEY_ENTER = 13;

    // сколько мс ждать между запросами страниц (по умолчанию 0.5 сек)
    var waitTime = 500;

    var PANEL_TASK = 'greasyfork-484622';
    var PANEL_URL = 'https://xload.net/panel/greasyfork-484622.html';

    var STYLE = [
        '.fsearch-wrapper { position: absolute; z-index: 1; width: 100%; top: 3px; display: flex; justify-content: center; }',
        '.fsearch-text { width: 250px; border: 1px solid #c0c0c0; padding: 2px; margin-right: 2px; font-size: 12px; }',
        '.fsearch-text:focus { outline: 2px solid #4d90fe; outline-offset: -2px; }',
        '.fsearch-prog { width: 90px; font-size: 9px; display: flex; flex-direction: column; align-items: center; margin-right: 5px; user-select: none; }',
        '.fsearch-prog > label { margin: 0; cursor: auto; }',
        '.fsearch-btn { width: 50px; margin-right: 5px; }',
        '.fsearch-res { width: 90px; display: flex; align-items: center; font-size: 10px; opacity: 0; user-select: none; }',
        '.fsearch-opt { background-color: buttonface; border: 1px solid #c0c0c0; border-radius: 3px; margin-right: 2px; font-size: 14px; width: 21px; }',
        '.fsearch-menu { border-spacing: 1px; }',
        '.fsearch-menu label { margin-right: 0; }',
        '.fsearch-menu label:first-child { margin-top: 0; }',
    ].join('\n');

    var SEARCH_BAR_HTML = '<div class="fsearch-wrapper"><a href="#fsearch-menu" class="fsearch-opt menu-root menu-alt1">⚙</a><input id="fsearch-text" class="fsearch-text" type="text" placeholder="искать в теме..." accesskey="ф"><input id="fsearch-btn" class="fsearch-btn" type="button" value="поиск"><div class="fsearch-prog"><label for="prog"><span id="cur-page">0</span> из <span id="all-page">1</span> стр.</label><progress id="prog" max="100" value="0">0%</progress></div><div class="fsearch-res">Найдено:&nbsp;<span id="found-num">0</span></div></div>';

    var ui = {};
    var postDb = [];
    var dbReversed = false;
    var dispatchedPages = 0;
    var receivedPages = 0;
    var allPage = 1;
    var perPage = DEFAULT_PER_PAGE;
    var panelChannel = null;

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function $$(selector, root) {
        return (root || document).querySelectorAll(selector);
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function reportPanel(type, data) {
        if (panelChannel) panelChannel.send(type, data);
    }

    function buildOptionsMenuHtml(nickValue, descValue) {
        return '<div id="fsearch-menu" class="menu-sub"><table class="fsearch-menu"><tbody><tr><th class="pad_4">Опции поиска</th></tr><tr><td class="pad_4"><label><input type="checkbox" id="check-nick" ' + nickValue + '>искать по никам авторов</label><label><input type="checkbox" id="check-desc" ' + descValue + '>новые сообщения вверху</label></td></tr></table></div>';
    }

    function clearPosts() {
        $$(POST_SELECTOR).forEach(function (post) {
            post.remove();
        });
    }

    function hidePagination() {
        $$(HIDE_ON_SEARCH_SELECTOR).forEach(function (div) {
            div.style.display = 'none';
        });
    }

    function saveCheckValues() {
        GM_setValue('nickValue', ui.checkNick.checked ? 'checked' : '');
        GM_setValue('descValue', ui.checkDesc.checked ? 'checked' : '');
    }

    function markMatches(element, queryReg) {
        element.innerHTML = element.innerHTML.replaceAll(queryReg, '<mark>$&</mark>');
    }

    function initPostBlocks(postBody, postSign) {
        if (!unsafeWindow.BB) return;
        unsafeWindow.BB.initPost(postBody);
        if (postSign) unsafeWindow.BB.initPost(postSign);
    }

    function processResults() {
        var query = ui.searchInput.value.trim().toLowerCase();
        var queryReg = new RegExp(escapeRegExp(query), 'gi');
        var found = 0;
        var fragment = new DocumentFragment();

        if (ui.checkDesc.checked !== dbReversed) {
            postDb.reverse();
            dbReversed = ui.checkDesc.checked;
        }

        postDb.forEach(function (post) {
            var postCopy = post.cloneNode(true);
            var postAuthor = postCopy.querySelector('.poster_info > p.nick');
            var postBody = postCopy.querySelector('.post_body');
            var postSign = postCopy.querySelector('.signature');
            var postText = '';

            if (ui.checkNick.checked) {
                postText = postAuthor.textContent.trim() + ' ';
            }

            Array.prototype.forEach.call(postBody.childNodes, function (node) {
                var text = node.textContent.trim();
                if (text.length > 0) {
                    postText += text + ' ';
                }
            });

            if (postText.toLowerCase().includes(query)) {
                found++;
                if (ui.checkNick.checked) markMatches(postAuthor, queryReg);
                markMatches(postBody, queryReg);
                fragment.append(postCopy);
                initPostBlocks(postBody, postSign);
            }
        });

        ui.topicMain.append(fragment);
        ui.searchBtn.disabled = false;
        ui.searchInput.style.backgroundColor = 'lightyellow';
        ui.foundNum.textContent = found;
        ui.foundNum.parentElement.style.opacity = 1;

        reportPanel('done', { found: found, total: postDb.length });
    }

    function handlePageError() {
        ui.searchBtn.disabled = false;
        reportPanel('error', { message: '页面请求失败，请稍后重试' });
    }

    function fetchPage() {
        var url = dispatchedPages === 0 ? ui.topicUrl : ui.topicUrl + '&start=' + dispatchedPages * perPage;
        var xhr = new XMLHttpRequest();

        dispatchedPages++;
        ui.curPage.textContent = dispatchedPages;
        ui.progLine.value = (100 / allPage) * dispatchedPages;

        xhr.open('get', url, true);
        xhr.responseType = 'document';
        xhr.onload = function () {
            var doc = xhr.response;
            if (!doc) {
                handlePageError();
                return;
            }
            $$(POST_SELECTOR, doc).forEach(function (post) {
                postDb.push(post);
            });
            receivedPages++;
            if (receivedPages === allPage) processResults();
        };
        xhr.onerror = handlePageError;
        xhr.send();
    }

    function startSearch() {
        if (ui.searchBtn.disabled) return;

        saveCheckValues();

        if (ui.searchInput.value.trim().length === 0) return;

        ui.searchBtn.disabled = true;
        clearPosts();
        reportPanel('progress', { current: 0, total: allPage, percent: 0 });

        if (postDb.length > 0) {
            processResults();
            return;
        }

        hidePagination();
        dispatchedPages = 0;
        receivedPages = 0;

        for (var page = 0; page < allPage; page++) {
            setTimeout(fetchPage, page * waitTime);
        }
    }

    function resetResults() {
        clearPosts();
        ui.curPage.textContent = '0';
        ui.progLine.value = 0;
        ui.foundNum.textContent = '0';
        ui.foundNum.parentElement.style.opacity = 0;
        ui.searchInput.style.backgroundColor = '';
    }

    function applyPanelSettings(data) {
        if (typeof data.query === 'string') {
            ui.searchInput.value = data.query;
        }
        if (typeof data['search-nick'] === 'boolean') {
            ui.checkNick.checked = data['search-nick'];
        }
        if (typeof data['newest-first'] === 'boolean') {
            ui.checkDesc.checked = data['newest-first'];
        }
        if (typeof data['fetch-delay'] === 'number' && isFinite(data['fetch-delay']) && data['fetch-delay'] >= 0) {
            waitTime = data['fetch-delay'];
        }
    }

    function setupPanel() {
        if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') return;

        panelChannel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
        panelChannel.send('hello', {});

        panelChannel.on('search', function (data) {
            try {
                if (ui.searchBtn.disabled) {
                    reportPanel('error', { message: '搜索正在进行中，请稍后重试' });
                    return;
                }
                applyPanelSettings(data || {});
                if (ui.searchInput.value.trim().length === 0) {
                    reportPanel('error', { message: '搜索词为空' });
                    return;
                }
                startSearch();
            } catch (err) {
                reportPanel('error', { message: String((err && err.message) || err) });
            }
        });

        panelChannel.on('clear-results', function () {
            try {
                resetResults();
                reportPanel('done', { cleared: true });
            } catch (err) {
                reportPanel('error', { message: String((err && err.message) || err) });
            }
        });
    }

    function resolvePerPage() {
        var value = unsafeWindow.BB ? parseInt(unsafeWindow.BB.PG_PER_PAGE, 10) : NaN;
        return value > 0 ? value : DEFAULT_PER_PAGE;
    }

    function resolveTotalPages() {
        var el = $(TOTAL_PAGES_SELECTOR);
        var value = el ? parseInt(el.textContent, 10) : NaN;
        return value > 0 ? value : 1;
    }

    function collectUi() {
        ui.searchInput = $('#fsearch-text');
        ui.searchBtn = $('#fsearch-btn');
        ui.curPage = $('#cur-page');
        ui.progLine = $('#prog');
        ui.foundNum = $('#found-num');
        ui.checkNick = $('#check-nick');
        ui.checkDesc = $('#check-desc');
        ui.topicMain = $('#topic_main');
        ui.topicUrl = $('#topic-title').href;
    }

    function bindEvents() {
        ui.searchBtn.addEventListener('click', startSearch);
        ui.searchInput.addEventListener('keyup', function (e) {
            if (e.keyCode === KEY_ENTER) startSearch();
        });
    }

    function init() {
        var container = $('#soc-container');
        if (!container || !container.parentElement || !$('#topic-title') || !$('#topic_main')) return;

        GM_addStyle(STYLE);

        container.parentElement.style.cssText = 'position: relative; padding: 0; height: 26px;';
        container.insertAdjacentHTML('beforebegin', SEARCH_BAR_HTML);
        document.body.insertAdjacentHTML('beforeend', buildOptionsMenuHtml(GM_getValue('nickValue', ''), GM_getValue('descValue', '')));

        collectUi();
        perPage = resolvePerPage();
        allPage = resolveTotalPages();
        $('#all-page').textContent = allPage;

        bindEvents();
        setupPanel();
    }

    init();
})();
