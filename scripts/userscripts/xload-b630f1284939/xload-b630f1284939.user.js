// ==UserScript==
// @name         Bilibili-banned-contents-hider
// @name:zh-CN   移除Bilibili黑名单用户的创作内容
// @namespace    https://github.com/upojzsb/Bilibili-banned-contents-hider
// @version      V0.6.1
// @description  Hide banned users' contents on Bilibili. Bilibili may push content created by users from your blacklist. This script is used to remove those contents. Promotions and advertisements will also be removed
// @description:zh-CN 隐藏Bilibili黑名单用户的内容。Bilibiil可能会推送黑名单用户创作的内容，该脚本旨在移除这些内容，广告及推广内容也将被移除
// @author       UPO-JZSB
// @match        *://*.bilibili.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=greasyfork.org
// @license      GPL-3.0
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL https://update.greasyfork.org/scripts/484601/Bilibili-banned-contents-hider.user.js
// @updateURL https://update.greasyfork.org/scripts/484601/Bilibili-banned-contents-hider.meta.js
// ==/UserScript==

'use strict';

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
      self._post({ type: type, data: data == null ? {} : data, _id: id, _request: true, _from: this._id });
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

async function runScript() {
  // ----------------------------------------------------------------------
  // Configuration
  // ----------------------------------------------------------------------

  const BLACKLIST_API_URL = 'https://api.bilibili.com/x/relation/blacks';
  const BLACKLIST_CACHE_KEY = 'bilibili_blacklist_cache'; // Storage key of the local blacklist cache
  const BLACKLIST_PAGE_SIZE = 20; // Users per page returned by the blacklist API
  const RESCAN_DEBOUNCE_MS = 250;
  const BILIBILI_URL_PATTERN = /^https:\/\/.*\.bilibili\.com/;

  const PANEL_URL = 'https://xload.net/panel/greasyfork-484601.html';
  const PANEL_TASK = 'greasyfork-484601';

  // Runtime state shared by the scanning and panel layers
  const state = {
    blacklist: { mid: [], name: [] },
    settings: { hideAds: true, hideBlacklist: true },
    lastWarnedUrl: '', // Prevents repeated warnings for the same URL
  };

  // ----------------------------------------------------------------------
  // Generic helpers
  // ----------------------------------------------------------------------

  // Return the n-th parentNode of an element
  function returnNthParent(element, n) {
    let current = element;
    for (let i = 0; i < n && current; i++) {
      current = current.parentNode;
    }
    return current;
  }

  // Hide the element and log the action. Returns true when it was hidden now.
  function hideElement(element, elementType = 'element') {
    if (element && element.style.display !== 'none') {
      console.debug(`Hiding ${elementType}:`, element);
      element.style.display = 'none';
      return true;
    }
    return false;
  }

  // The panel must be driven from the top frame only, otherwise nested
  // bilibili iframes would each try to open the panel page.
  function isTopWindow() {
    try {
      return window.top === window;
    } catch (error) {
      return false;
    }
  }

  // ----------------------------------------------------------------------
  // Blacklist synchronization
  // ----------------------------------------------------------------------

  function blacklistApiUrl(pageNumber) {
    return `${BLACKLIST_API_URL}?re_version=0&pn=${pageNumber}&ps=${BLACKLIST_PAGE_SIZE}&jsonp=jsonp`;
  }

  // Use the GET method to fetch a JSON document from the given API
  async function fetchDataJson(url) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Include credentials (cookies) in the request
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'DNT': '1',
        'Origin': 'https://account.bilibili.com',
        'Referer': 'https://account.bilibili.com/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonData = await response.json();

    if (jsonData.code !== undefined && jsonData.code !== 0) {
      throw new Error(`Bilibili API Error! Code: ${jsonData.code}, Message: ${jsonData.message}`);
    }

    return jsonData;
  }

  // Fetch every page of the blacklist API and collect mid/uname in parallel
  // lists. The first page also carries the total number of banned users.
  async function fetchBlacklistFromApi() {
    const firstPage = await fetchDataJson(blacklistApiUrl(1));
    const payload = firstPage.data;

    if (!payload || typeof payload.total !== 'number' || !Array.isArray(payload.list)) {
      throw new Error('Unexpected blacklist API response');
    }

    const totalPageNumber = Math.ceil(payload.total / BLACKLIST_PAGE_SIZE);
    const items = payload.list.slice();

    for (let pageNumber = 2; pageNumber <= totalPageNumber; pageNumber++) {
      const nextPage = await fetchDataJson(blacklistApiUrl(pageNumber));
      if (!nextPage.data || !Array.isArray(nextPage.data.list)) {
        throw new Error('Unexpected blacklist API response');
      }
      items.push(...nextPage.data.list);
    }

    return {
      mid: items.map((item) => item.mid),
      name: items.map((item) => item.uname),
    };
  }

  // Persist the blacklist, but skip the write when it is unchanged.
  // JSON.stringify provides a simple and effective deep comparison.
  async function syncBlacklistCache(freshBlacklist) {
    const cachedData = await GM_getValue(BLACKLIST_CACHE_KEY);

    if (cachedData && JSON.stringify(cachedData) === JSON.stringify(freshBlacklist)) {
      console.debug('Fetched data is identical to the local cache. No update needed.');
      return;
    }

    console.debug('Blacklist has changed or cache is empty. Updating local storage.');
    await GM_setValue(BLACKLIST_CACHE_KEY, freshBlacklist);
  }

  // Guarantee the blacklist always exposes usable mid/name arrays
  function normalizeBlacklist(rawBlacklist) {
    const source = rawBlacklist && typeof rawBlacklist === 'object' ? rawBlacklist : {};
    return {
      mid: Array.isArray(source.mid) ? source.mid : [],
      name: Array.isArray(source.name) ? source.name : [],
    };
  }

  // Get the blacklist with mid and name, falling back to the local cache on failure
  async function getBlacklist() {
    try {
      console.debug('Attempting to fetch latest blacklist from Bilibili...');
      const freshBlacklist = await fetchBlacklistFromApi();
      await syncBlacklistCache(freshBlacklist);
      return freshBlacklist;
    } catch (error) { // Fetch failed, use local data instead
      console.warn(`Could not fetch blacklist from Bilibili: ${error.message}`);
      console.debug('Falling back to locally stored blacklist cache.');

      const cachedBlacklist = normalizeBlacklist(await GM_getValue(BLACKLIST_CACHE_KEY));

      if (cachedBlacklist.mid.length > 0) {
        console.debug(`Successfully loaded ${cachedBlacklist.mid.length} users from cache.`);
      } else {
        console.warn('No cached blacklist found. Hiding will not be active.');
      }

      return cachedBlacklist;
    }
  }

  // ----------------------------------------------------------------------
  // Page scanning
  // ----------------------------------------------------------------------

  const isHomePageUrl = (url) => url === 'https://www.bilibili.com/' || url.startsWith('https://www.bilibili.com/?');

  // Every supported page is described by one rule:
  //   test     - whether the rule applies to the current URL
  //   selector - elements to inspect
  //   match    - 'mid': hide when a banned user id appears in the innerHTML,
  //              'name': hide when a banned user name appears as text
  //   parents  - levels of parentNode between the matched element and the card
  //   label    - name used when logging the hidden element
  const BLACKLIST_RULES = [
    {
      test: isHomePageUrl,
      selector: '.feed-card, .bili-video-card, .floor-single-card',
      match: 'mid',
      parents: 0,
      label: 'main page card',
    },
    {
      test: (url) => url.startsWith('https://search.bilibili.com/all'),
      selector: '.bili-video-card, .user-list',
      match: 'mid',
      parents: 0,
      label: 'search result card',
    },
    {
      test: (url) => url.startsWith('https://www.bilibili.com/v/popular/history'),
      selector: '.up-name',
      match: 'name',
      parents: 3,
      label: 'history card',
    },
    {
      test: (url) => url.startsWith('https://www.bilibili.com/v/popular/rank/all'),
      selector: '.up-name',
      match: 'name',
      parents: 5,
      label: 'rank card',
    },
    {
      test: (url) => url.startsWith('https://www.bilibili.com/video/'),
      selector: '.upname',
      match: 'name',
      parents: 3,
      label: 'video page card',
    },
  ];

  // Hide every element matched by the selector and count the newly hidden ones
  function hideAll(selector, label) {
    const elements = document.querySelectorAll(selector);
    console.debug('Advertisement cards found:', elements);
    let hiddenCount = 0;
    elements.forEach((element) => {
      if (hideElement(element, label)) hiddenCount++;
    });
    return hiddenCount;
  }

  // Remove promotions and advertisements
  function scanAdvertisements() {
    const currentUrl = window.location.href;

    if (!currentUrl.startsWith('https://www.bilibili.com/')) return 0;

    if (isHomePageUrl(currentUrl)) { // On the main page
      // Remove promotional videos
      return hideAll('.bili-video-card.is-rcmd[class="bili-video-card is-rcmd"]', 'advertisement');
    }

    if (currentUrl.startsWith('https://www.bilibili.com/video/')) { // On the video page
      // Simply removing cards will cause race condition problems
      return hideAll('.video-card-ad-small, .video-page-game-card-small, .video-page-special-card-small', 'advertisement');
    }

    return 0; // URL not yet implemented
  }

  // Check whether a card was created by a banned user
  function matchesBlacklist(card, rule) {
    const ids = rule.match === 'mid' ? state.blacklist.mid : state.blacklist.name;
    if (ids.length === 0) return false;

    const content = rule.match === 'mid' ? card.innerHTML : card.textContent || '';
    return ids.some((userId) => content.includes(String(userId)));
  }

  // Apply one blacklist rule and count the newly hidden cards
  function applyBlacklistRule(rule) {
    const cards = document.querySelectorAll(rule.selector);
    console.debug(`Cards found for ${rule.label}:`, cards);

    let hiddenCount = 0;
    cards.forEach((card) => {
      if (!matchesBlacklist(card, rule)) return;
      const cardToBeRemoved = rule.parents ? returnNthParent(card, rule.parents) : card;
      if (hideElement(cardToBeRemoved, rule.label)) hiddenCount++;
    });
    return hiddenCount;
  }

  // Warn about a URL at most once
  function shouldWarn() {
    const currentUrl = window.location.href;
    if (currentUrl === state.lastWarnedUrl) return false;
    state.lastWarnedUrl = currentUrl;
    return true;
  }

  // Remove contents created by banned users
  function scanBlacklistedContent() {
    const currentUrl = window.location.href;

    // Use RegExp to match all subdomains of bilibili.com
    if (!BILIBILI_URL_PATTERN.test(currentUrl)) {
      if (shouldWarn()) {
        console.warn('Bilibili-banned-contents-hider may not run here: ', currentUrl);
      }
      return 0;
    }

    const rule = BLACKLIST_RULES.find((candidate) => candidate.test(currentUrl));
    if (!rule) { // URL not yet implemented
      if (shouldWarn()) {
        console.warn('Contents hiding not implemented on ', currentUrl);
        console.warn('Please post the information as an issue on https://github.com/upojzsb/Bilibili-banned-contents-hider');
      }
      return 0;
    }

    return applyBlacklistRule(rule);
  }

  // The entry-point scan that runs all hiding logic.
  // Returns the number of newly hidden elements.
  function runFullScan() {
    let hiddenCount = 0;
    if (state.settings.hideAds) hiddenCount += scanAdvertisements();
    if (state.settings.hideBlacklist) hiddenCount += scanBlacklistedContent();
    return hiddenCount;
  }

  // ----------------------------------------------------------------------
  // Panel integration (XLoadPanel)
  // ----------------------------------------------------------------------

  function reportPanelError(channel, actionId, error) {
    channel.send('error', { action: actionId, message: (error && error.message) || String(error) });
  }

  // Listen for panel commands (type = action.id) and report progress/results
  function registerPanelHandlers(channel) {
    channel.on('refresh-blacklist', async () => {
      channel.send('progress', { action: 'refresh-blacklist', message: '正在从Bilibili同步黑名单…' });
      try {
        state.blacklist = normalizeBlacklist(await getBlacklist());
        channel.send('done', { action: 'refresh-blacklist', count: state.blacklist.mid.length });
      } catch (error) {
        reportPanelError(channel, 'refresh-blacklist', error);
      }
    });

    channel.on('rescan-page', () => {
      channel.send('progress', { action: 'rescan-page', message: '正在扫描当前页面…' });
      try {
        channel.send('done', { action: 'rescan-page', hidden: runFullScan() });
      } catch (error) {
        reportPanelError(channel, 'rescan-page', error);
      }
    });

    // Switch controls sent by the panel toggle the corresponding features
    channel.on('hide-ads', (data) => {
      if (data && typeof data.value === 'boolean') state.settings.hideAds = data.value;
    });
    channel.on('hide-blacklist', (data) => {
      if (data && typeof data.value === 'boolean') state.settings.hideBlacklist = data.value;
    });
  }

  // Open the panel page and establish the command channel
  function connectPanel() {
    if (!window.XLoadPanel || !isTopWindow()) return;

    const channel = XLoadPanel.open(PANEL_URL, PANEL_TASK);
    registerPanelHandlers(channel);
    channel.send('hello', {}); // Notify the panel page that the script is ready
  }

  // ----------------------------------------------------------------------
  // Entry point
  // ----------------------------------------------------------------------

  // Establish the panel channel first so commands can arrive at any time
  connectPanel();

  // Remove advertisements in advance since the loading of blacklist may take some time
  scanAdvertisements();

  // Get the blacklist
  state.blacklist = normalizeBlacklist(await getBlacklist());
  console.debug('Get blacklist successfully, blacklist=', state.blacklist.mid);

  // Run the main hiding function once on initial load
  runFullScan();

  // Set up the MutationObserver to handle dynamically loaded content
  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runFullScan, RESCAN_DEBOUNCE_MS);
  });

  // Start watching the entire page for any changes to the element list
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
}

runScript().catch((error) => console.error('Bilibili-banned-contents-hider failed:', error));
