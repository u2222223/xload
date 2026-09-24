// ==UserScript==
// @name         XenForo Ignore Members & Content Toolkit
// @version      7.0.0
// @description  Hide ignored members, reactions, tags, ranks, badges and signatures across XenForo forums
// @match        https://lewdcorner.com/threads/*
// @match        https://lewdcorner.com/direct-messages/*
// @match        https://azkoselscorner.com/index.php?threads/*
// @match        https://azkoselscorner.com/index.php?direct-messages/*
// @match        https://f95zone.to/threads/*
// @match        https://f95zone.to/direct-messages/*
// @match        https://ulmf.org/threads/*
// @match        https://ulmf.org/direct-messages/*
// @match        https://allthefallen.moe/forum/index.php?threads/*
// @match        https://allthefallen.moe/forum/index.php?direct-messages/*
// @match        https://lewdcorner.com
// @match        https://f95zone.to
// @match        https://azkoselscorner.com/index.php
// @match        https://allthefallen.moe/forum/index.php
// @match        https://ulmf.org
// @match        https://lewdcorner.com/forums/*
// @match        https://f95zone.to/forums/*
// @match        https://ulmf.org/forums/*
// @match        https://azkoselscorner.com/index.php?forums/*
// @match        https://allthefallen.moe/forum/index.php?forums/*
// @match        https://lewdcorner.com/latest-updatesv2*
// @match        https://lewdcorner.com/latest-updates.php*
// @match        https://f95zone.to/sam/latest_alpha/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function () {
    'use strict';

    /* ============================================================
     * Panel communication layer
     * ============================================================ */
    (function () {
        'use strict';
        var PREFIX = 'xload-panel:';
        var PANEL_ORIGIN = 'https://xload.net';

        var LOG_LIMIT = 200;
        var LOG_PUSH = 'log';
        var LOG_PULL = 'logs';
        var LOG_LEVELS = ["debug", "info", "warn", "error"];
        var PING = '_ping';
        var PONG = '_pong';
        var _logs = [];
        var _channels = [];

        function _safeData(data) {
            if (data == null) return null;
            if (typeof data !== 'object') return data;
            try { return JSON.parse(JSON.stringify(data)); }
            catch (e) { try { return String(data); } catch (e2) { return '[unserializable]'; } }
        }

        function _broadcastLog(entry) {
            for (var i = 0; i < _channels.length; i++) {
                try { _channels[i]._post({ type: LOG_PUSH, data: entry, _from: _channels[i]._id }); } catch (e) { }
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
            } catch (e) { }
        }

        function logsSnapshot() {
            try {
                return _logs.map(function (e) {
                    return { ts: e.ts, level: e.level, event: e.event, data: _safeData(e.data) };
                });
            } catch (e) { return []; }
        }

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
        } catch (e) { }

        function Channel(taskId) {
            this._id = String(taskId || '');
            this._seq = 0;
            this._handlers = {};
            this._pending = {};
            this._bc = null;
            this._opener = null;
            this._panelWin = null;
            this._nonce = 'c' + Math.random().toString(36).slice(2, 10);
            this._msgSeq = 0;
            this._seen = {};
            this._seenCount = 0;
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
            if (msg._mid == null) msg._mid = this._nonce + ':' + (++this._msgSeq);
            if (this._panelWin) { try { this._panelWin.postMessage(msg, PANEL_ORIGIN); } catch (e) { } }
            else if (this._opener) { try { this._opener.postMessage(msg, PANEL_ORIGIN); } catch (e) { } }
            if (this._bc) { try { this._bc.postMessage(msg); } catch (e) { } }
        };

        Channel.prototype._dispatch = function (msg) {
            if (!msg || typeof msg.type !== 'string') return;
            if (msg._mid != null) {
                if (this._seen[msg._mid]) return;
                this._seen[msg._mid] = 1;
                if (++this._seenCount > 500) { this._seen = {}; this._seenCount = 0; }
            }
            if (msg.type === LOG_PUSH) return;
            if (msg.type === PING) {
                this._post({ type: PONG, data: {}, _from: this._id });
                return;
            }
            if (msg._id != null && !msg._request && Object.prototype.hasOwnProperty.call(this._pending, msg._id)) {
                var p = this._pending[msg._id];
                delete this._pending[msg._id];
                if (p._timer) clearTimeout(p._timer);
                if (msg.error != null) p.reject(new Error(String(msg.error)));
                else p.resolve(msg.data == null ? {} : msg.data);
                return;
            }
            log('debug', 'recv', { type: msg.type });
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

        Channel.prototype.send = function (type, data) {
            log('debug', 'send', { type: type });
            this._post({ type: type, data: data == null ? {} : data, _from: this._id });
            return this;
        };

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

        Channel.prototype.on = function (type, handler) {
            (this._handlers[type] = this._handlers[type] || []).push(handler);
            return this;
        };

        Channel.prototype.close = function () {
            var idx = _channels.indexOf(this);
            if (idx >= 0) _channels.splice(idx, 1);
            log('info', 'close', {});
            if (this._onMsg) { try { window.removeEventListener('message', this._onMsg); } catch (e) { } }
            if (this._bc) { try { this._bc.close(); } catch (e) { } }
            var ids = Object.keys(this._pending);
            for (var i = 0; i < ids.length; i++) {
                var p = this._pending[ids[i]];
                if (p._timer) clearTimeout(p._timer);
                p.reject(new Error('panel channel closed'));
            }
            this._pending = {};
            this._handlers = {};
            this._seen = {};
            this._seenCount = 0;
            this._bc = null;
            this._opener = null;
            this._panelWin = null;
        };

        window.XLoadPanel = {
            CHANNEL_PREFIX: PREFIX,
            PANEL_ORIGIN: PANEL_ORIGIN,
            LOG_LIMIT: LOG_LIMIT,
            log: function (level, event, data) { log(level, event, data); return this; },
            logs: function () { return logsSnapshot(); },
            clearLogs: function () { _logs = []; return this; },
            channel: function (taskId) { return new Channel(taskId || ''); },
            open: function (panelUrl, taskId) {
                var win = null;
                try { win = window.open(panelUrl, '_blank'); } catch (e) { win = null; }
                return new Channel(taskId || '').attach(win);
            }
        };
    })();

    /* ============================================================
     * Panel identity
     * ============================================================ */
    var PANEL_TASK = 'xload-39668868585d';
    var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-39668868585d/panel.html';

    /* ============================================================
     * Defaults and storage keys
     * ============================================================ */
    var OPTION_PREFIX = 'xignoreOpt:';

    var DEFAULTS = {
        addIgnoreButton: true,
        hideUsersPermanent: true,
        ignoreMembers: ['user1', 'user2', 'user3'],
        ignoreReactionsMembers: ['user1', 'user2', 'user3'],
        ignoreTags: ['VN', 'DAZ', 'Hand Drawn', "Ren'Py", 'Complete', 'AI', 'RPGM', 'ports', 'Hiatus', 'Abondened', 'Loli', 'animated', '2d game', 'sleep sex', 'RPG', 'Patreon', 'Active'],
        ignoreMembersAll: false,
        ignoreReactionsAll: false,
        ignoreMembersDirectMessages: ['user1', 'user2', 'user3'],
        ignoreMembersDirectMessagesReactions: ['user1', 'user2', 'user3'],
        ignoreMembersDirectMessagesAll: false,
        ignoreMembersDirectMessagesReactionsAll: false,
        ignoreLCSignatureMembers: ['user1', 'user2', 'user3'],
        ignoreLCSignatureDirectMessagesMembers: ['user1', 'user2', 'user3'],
        ignoreLCBanners: [],
        ignoreLCDonationBanners: true,
        ignoreLCBadges: true,
        ignoreLCSignaturesAll: false,
        ignoreLCWhiteSpaceSoMuchYouCan: false
    };

    var STORE = {
        users: 'ignoreXenForoUsers',
        dmUsers: 'ignoreXenForoUsersDM',
        reactions: 'ignoreXenForoRUsers',
        dmReactions: 'ignoreXenForoRDMUsers',
        tags: 'ignoreXenForoTags',
        ranks: 'ignoreLCRanks',
        signatureMembers: 'xignoreSignatureMembers',
        signatureDmMembers: 'xignoreSignatureDmMembers'
    };

    var RANK_HINTS = ['t1', 't2', 't3', 't4', 't5', 't6', 'Registered', 'Lewd', 'VIPplus', 'UwU', 'Godly', 'Donator', 'Donator2'];

    /* ============================================================
     * Generic helpers
     * ============================================================ */
    function isString(value) {
        return typeof value === 'string' || value instanceof String;
    }

    function safeArray(list) {
        var result = [];
        if (!list || typeof list.forEach !== 'function') return result;
        list.forEach(function (element) {
            if (element === undefined || element === null || !isString(element) || element.length === 0) return;
            result.push(element);
        });
        return result;
    }

    function splitList(value) {
        if (!value) return [];
        return safeArray(value.split(',').map(function (item) { return item.trim(); }));
    }

    function readList(key, fallback) {
        try {
            var raw = GM_getValue(key, null);
            if (raw === null || raw === undefined) return fallback;
            return safeArray(JSON.parse(raw));
        } catch (e) {
            return fallback;
        }
    }

    function writeList(key, list) {
        try { GM_setValue(key, JSON.stringify(list)); } catch (e) { }
    }

    function readBool(name, fallback) {
        try {
            var value = GM_getValue(OPTION_PREFIX + name, fallback);
            return value === true || value === 'true';
        } catch (e) {
            return fallback;
        }
    }

    function writeBool(name, value) {
        try { GM_setValue(OPTION_PREFIX + name, !!value); } catch (e) { }
    }

    var styleSheet = null;

    function addStyle(css) {
        try {
            if (!styleSheet) {
                styleSheet = document.createElement('style');
                styleSheet.type = 'text/css';
                (document.head || document.documentElement).appendChild(styleSheet);
            }
            var sheet = styleSheet.sheet;
            sheet.insertRule(css, (sheet.cssRules || sheet.rules || []).length);
        } catch (e) { }
    }

    function waitForElement(selector, callback) {
        var observer = new MutationObserver(function () {
            var element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                callback(element);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function runWithPolling(fn) {
        window.addEventListener('load', fn);
        $(document).ready(function () {
            fn();
            setInterval(fn, 1000);
        });
    }

    /* ============================================================
     * Runtime state
     * ============================================================ */
    var S = {
        addIgnoreButton: readBool('addIgnoreButton', DEFAULTS.addIgnoreButton),
        hideUsersPermanent: readBool('hideUsersPermanent', DEFAULTS.hideUsersPermanent),
        ignoreMembers: DEFAULTS.ignoreMembers.slice(),
        ignoreReactionsMembers: DEFAULTS.ignoreReactionsMembers.slice(),
        ignoreTags: DEFAULTS.ignoreTags.slice(),
        ignoreMembersAll: readBool('ignoreMembersAll', DEFAULTS.ignoreMembersAll),
        ignoreReactionsAll: readBool('ignoreReactionsAll', DEFAULTS.ignoreReactionsAll),
        ignoreMembersDirectMessages: DEFAULTS.ignoreMembersDirectMessages.slice(),
        ignoreMembersDirectMessagesReactions: DEFAULTS.ignoreMembersDirectMessagesReactions.slice(),
        ignoreMembersDirectMessagesAll: readBool('ignoreMembersDirectMessagesAll', DEFAULTS.ignoreMembersDirectMessagesAll),
        ignoreMembersDirectMessagesReactionsAll: readBool('ignoreMembersDirectMessagesReactionsAll', DEFAULTS.ignoreMembersDirectMessagesReactionsAll),
        ignoreLCSignatureMembers: DEFAULTS.ignoreLCSignatureMembers.slice(),
        ignoreLCSignatureDirectMessagesMembers: DEFAULTS.ignoreLCSignatureDirectMessagesMembers.slice(),
        ignoreLCBanners: DEFAULTS.ignoreLCBanners.slice(),
        ignoreLCDonationBanners: readBool('ignoreLCDonationBanners', DEFAULTS.ignoreLCDonationBanners),
        ignoreLCBadges: readBool('ignoreLCBadges', DEFAULTS.ignoreLCBadges),
        ignoreLCSignaturesAll: readBool('ignoreLCSignaturesAll', DEFAULTS.ignoreLCSignaturesAll),
        ignoreLCWhiteSpaceSoMuchYouCan: readBool('ignoreLCWhiteSpaceSoMuchYouCan', DEFAULTS.ignoreLCWhiteSpaceSoMuchYouCan)
    };

    if (S.addIgnoreButton && S.hideUsersPermanent) {
        var storedRanks = readList(STORE.ranks, null);
        if (storedRanks) S.ignoreLCBanners = storedRanks;
        var storedTags = readList(STORE.tags, null);
        if (storedTags) S.ignoreTags = storedTags;
        var storedReactions = readList(STORE.reactions, null);
        if (storedReactions) S.ignoreReactionsMembers = storedReactions;
        var storedDmReactions = readList(STORE.dmReactions, null);
        if (storedDmReactions) S.ignoreMembersDirectMessagesReactions = storedDmReactions;
    }
    var storedSignatureMembers = readList(STORE.signatureMembers, null);
    if (storedSignatureMembers) S.ignoreLCSignatureMembers = storedSignatureMembers;
    var storedSignatureDmMembers = readList(STORE.signatureDmMembers, null);
    if (storedSignatureDmMembers) S.ignoreLCSignatureDirectMessagesMembers = storedSignatureDmMembers;

    var ORIGINALS = {
        tags: DEFAULTS.ignoreTags.slice(),
        reactions: DEFAULTS.ignoreReactionsMembers.slice(),
        dmReactions: DEFAULTS.ignoreMembersDirectMessagesReactions.slice(),
        banners: DEFAULTS.ignoreLCBanners.slice()
    };

    var useSameId = true;

    /* ============================================================
     * Shared hiding helpers
     * ============================================================ */
    function removeSidebarRows(selector, trim) {
        $(selector).each(function () {
            var html = trim ? $(this).html().trim() : $(this).html();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('li.block-row').remove();
            }
        });
    }

    function removeTaggedRows(rowSelector, labelSelector) {
        var elements = document.querySelectorAll(rowSelector);
        elements.forEach(function (userItem) {
            var labels = $(userItem).find(labelSelector);
            if (labels.length === 0) return;
            labels.each(function () {
                var html = $(this).html().trim();
                if (html !== undefined && S.ignoreTags.includes(html)) {
                    $(userItem).remove();
                }
            });
        });
    }

    function applyDonationBannerHiding() {
        if (!S.ignoreLCDonationBanners) return;
        addStyle('.jblcDonateNotice, .stfrtDonateBubble, .stfrtDonateBubble.is-unavailable { display: none !important; }');
        $(document).ready(function () {
            waitForElement('.stfrtDonate-liteBtn.stfrtDonate-hideToday', function (element) {
                $(element).trigger('click');
            });
        });
    }

    /* ============================================================
     * Per-layout game/tag filtering
     * ============================================================ */
    function ignoreATFGames() {
        removeSidebarRows('.p-body-sidebar .contentRow-main a span.label', true);
    }

    function ignoreLCGames() {
        removeTaggedRows('article.lcForumStats-row', '.lcForumStats-thread .lcForumStats-prefixes .label');
        removeSidebarRows('.p-body-sidebar .contentRow-main a span.label', true);
    }

    function ignoreF95Games() {
        removeTaggedRows('.brmsContentList .itemContent', '.listBlock.itemTitle a span');
        removeSidebarRows('.p-body-sidebar .contentRow-main a span.label', true);
    }

    function ignoreACGames() {
        removeTaggedRows('.forumStatsContainer .forumStats-main table.dataList-table tr.dataList-row', '.dataList-textRow span[data-xf-init] .label,.aiprefix');
        removeSidebarRows('.p-body-sidebar .contentRow-main a span.label, .p-body-sidebar .contentRow-main a span.aiprefix', false);
    }

    function ignoreF95LuGames1() {
        $('.resource-tile_label-wrap .resource-tile_label-wrap_left div,.resource-tile_label-wrap .resource-tile_label-wrap_right div').each(function () {
            var html = $(this).text().trim();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('.resource-tile').remove();
            }
        });
    }

    function ignoreLCLuGames1() {
        $('.card__mediaBadges .lc-badge').each(function () {
            var html = $(this).html().trim();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('.lc-card').remove();
            }
        });
        $('.lc-tags .lc-tag').each(function () {
            var html = $(this).html().trim();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('.lc-card').remove();
            }
        });
    }

    function ignoreLCLuGames2() {
        $('.lcCardMediaBadges .lcCardBadge').each(function () {
            var html = $(this).html().trim();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('.lcCardSlot').remove();
            }
        });
        $('.lcCardRestingTagList button').each(function () {
            var html = $(this).html().trim();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('.lcCardSlot').remove();
            }
        });
    }

    function ignoreACGames1() {
        $('.thread-title-with-hover .prefix-label .label').each(function () {
            var html = $(this).html().trim();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('.thread-widget-slider').remove();
            }
        });
    }

    function ignoreGames1() {
        $('.structItem-title a.labelLink span.label, .lcGameCard-mediaBadgeLeft span.label').each(function () {
            var html = $(this).html().trim();
            if (S.ignoreTags.includes(html)) {
                $(this).closest('.structItem--thread').remove();
            }
        });
    }

    function ignoreGames2() {
        var elements = document.querySelectorAll('.p-body-header .p-title-value a');
        elements.forEach(function (userItem) {
            var spans = $(userItem).find('span');
            if (spans.length === 0) return;
            spans.each(function () {
                var html = $(this).html().trim();
                if (html !== undefined && S.ignoreTags.includes(html)) {
                    $('.p-body-main').remove();
                    $('.p-body-pageContent').remove();
                }
            });
        });
        $('.p-description .tagList a').each(function () {
            var html = $(this).html().trim();
            if (S.ignoreTags.includes(html)) {
                $('.p-body-main').remove();
                $('.p-body-pageContent').remove();
            }
        });
    }

    /* ============================================================
     * Home / listing routing
     * ============================================================ */
    var homePage = window.location.href;
    var isLCHome = homePage === 'https://lewdcorner.com/';
    var isF95Home = homePage === 'https://f95zone.to/';
    var isULMFHome = homePage === 'https://ulmf.org/';
    var isACHome = homePage === 'https://azkoselscorner.com/index.php';
    var isATFHome = homePage === 'https://allthefallen.moe/forum/index.php';
    var isHome = isLCHome || isF95Home || isACHome || isATFHome;

    if (isATFHome) {
        if (S.ignoreTags.length > 0) {
            runWithPolling(ignoreATFGames);
        }
    } else if (isLCHome) {
        if (S.ignoreTags.length > 0) {
            runWithPolling(ignoreLCGames);
            applyDonationBannerHiding();
        }
    } else if (isF95Home) {
        if (S.ignoreTags.length > 0) {
            runWithPolling(ignoreF95Games);
        }
    } else if (isACHome || isULMFHome) {
        if (S.ignoreTags.length > 0) {
            runWithPolling(ignoreACGames);
        }
    }

    if (homePage.startsWith('https://f95zone.to/sam/latest_alpha/')) {
        runWithPolling(ignoreF95LuGames1);
    } else if (homePage.startsWith('https://lewdcorner.com/latest-updates.php')) {
        runWithPolling(ignoreLCLuGames1);
        applyDonationBannerHiding();
    } else if (homePage.startsWith('https://lewdcorner.com/latest-updatesv2')) {
        runWithPolling(ignoreLCLuGames2);
        applyDonationBannerHiding();
    } else if (homePage.startsWith('https://azkoselscorner.com/index.php?forums/')) {
        runWithPolling(ignoreACGames1);
    } else if (homePage.startsWith('https://lewdcorner.com/forums/') ||
               homePage.startsWith('https://f95zone.to/forums/') ||
               homePage.startsWith('https://allthefallen.moe/forum/index.php?forums/') ||
               homePage.startsWith('https://ulmf.org/forums/')) {
        runWithPolling(ignoreGames1);
        applyDonationBannerHiding();
    } else if (!isHome) {
        initThreadPage();
    }

    /* ============================================================
     * Thread / direct-message page handling
     * ============================================================ */
    function initThreadPage() {
        var membersOriginal = S.ignoreMembers.slice();
        var dmMembersOriginal = S.ignoreMembersDirectMessages.slice();

        if (!S.hideUsersPermanent) {
            writeList(STORE.users, S.ignoreMembers);
            writeList(STORE.dmUsers, S.ignoreMembersDirectMessages);
        }

        S.ignoreMembers = readList(STORE.users, S.ignoreMembers);
        S.ignoreMembersDirectMessages = readList(STORE.dmUsers, S.ignoreMembersDirectMessages);

        if (S.ignoreTags.length > 0) {
            runWithPolling(ignoreGames2);
        }

        buildMessageStyles();
        applyDonationBannerHiding();

        if (S.addIgnoreButton) {
            mountIgnoreButtons(membersOriginal, dmMembersOriginal);
        }
    }

    function buildMessageStyles() {
        var POST_SELECTOR = "article.message.message--post.js-post[data-author='{author}']";
        var DM_SELECTOR = "article.message.message--conversationMessage.js-message[data-author='{author}']";

        function byAuthor(template, author) {
            return template.replace('{author}', author);
        }

        var dmSelectors = S.ignoreMembersDirectMessages.map(function (u) { return byAuthor(DM_SELECTOR, u); });
        var dmReactionSelectors = S.ignoreMembersDirectMessagesReactions.map(function (u) { return byAuthor(DM_SELECTOR, u); });
        var postSelectors = S.ignoreMembers.map(function (u) { return byAuthor(POST_SELECTOR, u); });
        var reactionSelectors = S.ignoreReactionsMembers.map(function (u) { return byAuthor(POST_SELECTOR, u); });
        var bannerSelectors = S.ignoreLCBanners.map(function (rank) { return 'html body div.userBanner.' + rank + '.message-userBanner'; });
        var signatureSelectors = S.ignoreLCSignatureMembers.map(function (u) { return byAuthor(POST_SELECTOR, u); });
        var signatureDmSelectors = S.ignoreLCSignatureDirectMessagesMembers.map(function (u) { return byAuthor(DM_SELECTOR, u); });

        if (S.ignoreMembersDirectMessagesAll) {
            addStyle('article.message.message--conversationMessage.js-message[data-author] { display: none !important; }');
        }
        if (dmSelectors.length > 0) {
            addStyle(dmSelectors.join(',') + ' { display: none !important; }');
        }
        if (dmReactionSelectors.length > 0) {
            addStyle(dmReactionSelectors.join(',') + ' .reactionsBar.js-reactionsList.is-active { display: none !important; }');
        }
        if (signatureSelectors.length > 0) {
            addStyle(signatureSelectors.join(',') + ' aside.message-signature { display: none !important; }');
        }
        if (signatureDmSelectors.length > 0) {
            addStyle(signatureDmSelectors.join(',') + ' aside.message-signature { display: none !important; }');
        }
        if (S.ignoreLCSignaturesAll) {
            addStyle('aside.message-signature { display: none !important; }');
        }
        if (postSelectors.length > 0) {
            addStyle(postSelectors.join(',') + ' { display: none !important; }');
        }
        if (reactionSelectors.length > 0) {
            addStyle(reactionSelectors.join(',') + ' .reactionsBar.js-reactionsList.is-active { display: none !important; }');
        }
        if (S.ignoreMembersAll) {
            addStyle('article.message.message--post.js-post[data-author] { display: none !important; }');
        }
        if (S.ignoreReactionsAll || S.ignoreMembersDirectMessagesReactionsAll) {
            addStyle('.reactionsBar.js-reactionsList.is-active { display: none !important; }');
        }
        if (bannerSelectors.length > 0) {
            addStyle(bannerSelectors.join(',') + ' { display: none !important; }');
        }
        if (S.ignoreLCBadges) {
            addStyle('div.featuredBadges.featuredBadges--message { display: none !important; }');
        }
        if (S.ignoreLCWhiteSpaceSoMuchYouCan) {
            addStyle('div.st-years-of-service, .xentr-message-container .xentr-slider-nav { padding: 0px !important; margin: 0px !important; }');
            addStyle('div.st-years-of-service { margin-top: 5px !important; }');
            addStyle('dl.pairs.pairs--justified { padding: 0 5px 0px 5px !important; }');
        }
    }

    /* ============================================================
     * In-page ignore controls
     * ============================================================ */
    function mountIgnoreButtons(membersOriginal, dmMembersOriginal) {
        addStyle('.message-attribution-main .set_r,.message-attribution-main .reset_r,.message-attribution-main .ignore_xenforo_user,.message-attribution-main .ignore_custom_member,.message-attribution-main .reset_custom_member,.message-attribution-main .add_tags,.message-attribution-main .show_tags,.message-attribution-main .reset_tags { display: inline-block !important; font-size: 12px !important; max-height: 0px !important; color: unset !important; }');
        addStyle('body[data-template="thread_view"] .block--messages article.message.message--post .message-attribution a { min-height: 0px !important; font-size: 12px !important; color: unset;}');
        addStyle('.message-attribution-main .reset_c_sep { font-size: 12px !important; }');
        addStyle('body[data-template="thread_view"] .block--messages article.message.message--post .message-attribution { font-size: 12px !important; }');
        addStyle('.reset_ranks_lc_r,.set_ranks_lc_r { font-size: 12px !important; display: block !important; padding: 0px !important; margin: 0px !important; line-height: 10px !important; }');

        window.addEventListener('load', function () {
            bindRankBannerClicks();
            decorateMessages(membersOriginal, dmMembersOriginal);
        });
    }

    function bindRankBannerClicks() {
        $('html body div.userBanner.message-userBanner').each(function () {
            var classes = $(this).attr('class');
            var classesArray = classes.split(/\s+/);
            var rank = classesArray[1];
            $(this).on('click', function () {
                var answer = confirm('Do you want ignore the rank ' + rank + ' ?');
                if (answer && !S.ignoreLCBanners.includes(rank)) {
                    S.ignoreLCBanners.push(rank);
                    writeList(STORE.ranks, S.ignoreLCBanners);
                    alert('rank ' + rank + ' is ignored');
                    window.location.reload();
                }
            });
        });
    }

    function decorateMessages(membersOriginal, dmMembersOriginal) {
        var elements = document.querySelectorAll('article.message[data-author]');
        elements.forEach(function (userItem) {
            var author = $(userItem).data('author');
            $(userItem).find('section.message-user').each(function () {
                var element = $(this).attr('itemid');
                if (element === undefined) {
                    var nameLink = $(this).find('.message-userDetails .message-name a');
                    if (nameLink.length) element = nameLink.attr('href');
                }
                if (element === undefined) return;

                var addedElementOriginal = this;
                var addedElement = $(userItem).find('.message-attribution .message-attribution-main');
                $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="ignore_xenforo_user" href="' + element + 'ignore">Ignore User</a>');
                if (useSameId) {
                    $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="ignore_custom_member" data-author="' + author + '" href="#">Hide User</a>');
                    $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="reset_custom_member" href="#">Reset Ignore Users</a>');
                    $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="reset_tags" href="#">Reset Ignore Tags</a>');
                    $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="reset_r" href="#">Reset Ignore Reactions</a>');
                    $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="show_tags" href="#">Set Ignore Users</a>');
                    $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="add_tags" href="#">Set Ignore Tags</a>');
                    $(addedElement).append('<span class="reset_c_sep">&nbsp;|&nbsp;</span><a class="set_r" href="#">Set Ignore Reactions</a>');
                    $(addedElementOriginal).append('<a class="reset_ranks_lc_r" href="#">Reset Ignored Ranks</a>');
                    $(addedElementOriginal).append('<a class="set_ranks_lc_r" href="#">Set Ignored Ranks</a>');
                }
            });

            if (useSameId) {
                bindMessageActions(userItem, membersOriginal, dmMembersOriginal);
            }
        });
    }

    function bindMessageActions(userItem, membersOriginal, dmMembersOriginal) {
        var selector = '.message-attribution .message-attribution-main a';
        var selectorOriginal = 'section.message-user ';

        $(userItem).on('click', selector + '.ignore_custom_member', function (event) {
            event.preventDefault();
            var meAuthor = $(this).data('author');
            if (!S.ignoreMembers.includes(meAuthor)) S.ignoreMembers.push(meAuthor);
            if (!S.ignoreMembersDirectMessages.includes(meAuthor)) S.ignoreMembersDirectMessages.push(meAuthor);
            writeList(STORE.users, S.ignoreMembers);
            writeList(STORE.dmUsers, S.ignoreMembersDirectMessages);
            addStyle('article.message.message--conversationMessage.js-message[data-author="' + meAuthor + '"] { display: none !important; }');
            addStyle('article.message.message--post.js-post[data-author="' + meAuthor + '"] { display: none !important; }');
        });

        $(userItem).on('click', selector + '.reset_custom_member', function (event) {
            event.preventDefault();
            writeList(STORE.users, membersOriginal);
            writeList(STORE.dmUsers, dmMembersOriginal);
            window.location.reload();
        });

        $(userItem).on('click', selector + '.add_tags', function () {
            var userInput = prompt('Enter multiple tags separated by commas (e.g., Apple, Banana, Orange):', S.ignoreTags.join(', '));
            if (userInput === null) return false;
            S.ignoreTags = splitList(userInput);
            writeList(STORE.tags, S.ignoreTags);
            alert('Ignored Tags are : ' + S.ignoreTags.join(', '));
        });

        $(userItem).on('click', selector + '.show_tags', function () {
            var userInput = prompt('Enter multiple users separated by commas (e.g., Apple, Banana, Orange):', S.ignoreMembers.join(', '));
            if (userInput === null) return false;
            S.ignoreMembers = splitList(userInput);
            writeList(STORE.users, S.ignoreMembers);
            writeList(STORE.dmUsers, S.ignoreMembers);
            alert('Ignored Users are : ' + S.ignoreMembers.join(', '));
        });

        $(userItem).on('click', selector + '.reset_tags', function () {
            S.ignoreTags = ORIGINALS.tags.slice();
            writeList(STORE.tags, ORIGINALS.tags);
            alert('Ignored Tags are : ' + S.ignoreTags.join(', '));
        });

        $(userItem).on('click', selector + '.set_r', function () {
            var userInput = prompt('Enter multiple users where you want ignore his reactions separated by commas (e.g., Apple, Banana, Orange):', S.ignoreReactionsMembers.join(', '));
            if (userInput === null) return false;
            S.ignoreReactionsMembers = splitList(userInput);
            S.ignoreMembersDirectMessagesReactions = S.ignoreReactionsMembers.slice();
            writeList(STORE.reactions, S.ignoreReactionsMembers);
            writeList(STORE.dmReactions, S.ignoreMembersDirectMessagesReactions);
            alert('Ignored User Reactions are : ' + S.ignoreReactionsMembers.join(', '));
            window.location.reload();
        });

        $(userItem).on('click', selector + '.reset_r', function () {
            S.ignoreReactionsMembers = ORIGINALS.reactions.slice();
            S.ignoreMembersDirectMessagesReactions = ORIGINALS.dmReactions.slice();
            writeList(STORE.reactions, S.ignoreReactionsMembers);
            writeList(STORE.dmReactions, S.ignoreMembersDirectMessagesReactions);
            alert('Ignored User Reactions are : ' + S.ignoreReactionsMembers.join(', '));
            window.location.reload();
        });

        $(userItem).on('click', selectorOriginal + '.set_ranks_lc_r', function () {
            var userInput = prompt('Enter multiple ranks where you want ignore this rank separated by commas (e.g., ' + RANK_HINTS.join(', ') + '):', S.ignoreLCBanners.join(', '));
            if (userInput === null) return false;
            S.ignoreLCBanners = splitList(userInput);
            writeList(STORE.ranks, S.ignoreLCBanners);
            alert('Ignored Ranks are : ' + S.ignoreLCBanners.join(', '));
            window.location.reload();
        });

        $(userItem).on('click', selectorOriginal + '.reset_ranks_lc_r', function () {
            S.ignoreLCBanners = ORIGINALS.banners.slice();
            writeList(STORE.ranks, S.ignoreLCBanners);
            alert('Ignored Ranks are : ' + S.ignoreLCBanners.join(', '));
            window.location.reload();
        });
    }

    /* ============================================================
     * Panel integration
     * ============================================================ */
    var panelChannel = null;

    var OPTION_CONTROLS = {
        'ignore-members-all': 'ignoreMembersAll',
        'ignore-reactions-all': 'ignoreReactionsAll',
        'ignore-dm-members-all': 'ignoreMembersDirectMessagesAll',
        'ignore-dm-reactions-all': 'ignoreMembersDirectMessagesReactionsAll',
        'ignore-signatures-all': 'ignoreLCSignaturesAll',
        'ignore-badges': 'ignoreLCBadges',
        'ignore-donation-banners': 'ignoreLCDonationBanners',
        'hide-white-space': 'ignoreLCWhiteSpaceSoMuchYouCan',
        'add-ignore-button': 'addIgnoreButton',
        'hide-users-permanent': 'hideUsersPermanent'
    };

    function panelProgress(message) {
        if (panelChannel) panelChannel.send('progress', { message: message });
    }

    function panelDone(message) {
        if (panelChannel) panelChannel.send('done', { message: message });
    }

    function panelError(message) {
        if (panelChannel) panelChannel.send('error', { message: message });
    }

    function reloadSoon() {
        setTimeout(function () { window.location.reload(); }, 400);
    }

    function applyListField(data, field, stateKey, storeKey) {
        if (!data || typeof data[field] !== 'string') return;
        S[stateKey] = splitList(data[field]);
        writeList(storeKey, S[stateKey]);
    }

    function handleApplyLists(data) {
        panelProgress('应用忽略名单');
        try {
            applyListField(data, 'ignore-members', 'ignoreMembers', STORE.users);
            applyListField(data, 'ignore-reactions', 'ignoreReactionsMembers', STORE.reactions);
            applyListField(data, 'ignore-tags', 'ignoreTags', STORE.tags);
            applyListField(data, 'ignore-dm-members', 'ignoreMembersDirectMessages', STORE.dmUsers);
            applyListField(data, 'ignore-dm-reactions', 'ignoreMembersDirectMessagesReactions', STORE.dmReactions);
            applyListField(data, 'ignore-signature-members', 'ignoreLCSignatureMembers', STORE.signatureMembers);
            applyListField(data, 'ignore-signature-dm-members', 'ignoreLCSignatureDirectMessagesMembers', STORE.signatureDmMembers);
            applyListField(data, 'ignore-ranks', 'ignoreLCBanners', STORE.ranks);
            XLoadPanel.log('info', 'panel.applyLists', {});
            panelDone('忽略名单已更新');
            reloadSoon();
        } catch (e) {
            panelError(String(e));
        }
    }

    function handleResetLists() {
        panelProgress('恢复默认名单');
        try {
            S.ignoreTags = ORIGINALS.tags.slice();
            writeList(STORE.tags, ORIGINALS.tags);
            S.ignoreReactionsMembers = ORIGINALS.reactions.slice();
            writeList(STORE.reactions, ORIGINALS.reactions);
            S.ignoreMembersDirectMessagesReactions = ORIGINALS.dmReactions.slice();
            writeList(STORE.dmReactions, ORIGINALS.dmReactions);
            S.ignoreLCBanners = ORIGINALS.banners.slice();
            writeList(STORE.ranks, ORIGINALS.banners);
            XLoadPanel.log('info', 'panel.resetLists', {});
            panelDone('已恢复默认名单');
            reloadSoon();
        } catch (e) {
            panelError(String(e));
        }
    }

    function handleApplyOptions(data) {
        panelProgress('应用显示选项');
        try {
            Object.keys(OPTION_CONTROLS).forEach(function (controlId) {
                if (!data || typeof data[controlId] !== 'boolean') return;
                var stateKey = OPTION_CONTROLS[controlId];
                S[stateKey] = data[controlId];
                writeBool(stateKey, data[controlId]);
            });
            XLoadPanel.log('info', 'panel.applyOptions', {});
            panelDone('显示选项已更新');
            reloadSoon();
        } catch (e) {
            panelError(String(e));
        }
    }

    function handleResetUsers() {
        panelProgress('重置忽略用户');
        writeList(STORE.users, DEFAULTS.ignoreMembers);
        writeList(STORE.dmUsers, DEFAULTS.ignoreMembersDirectMessages);
        panelDone('已重置忽略用户');
        reloadSoon();
    }

    function handleResetTags() {
        panelProgress('重置忽略标签');
        writeList(STORE.tags, DEFAULTS.ignoreTags);
        panelDone('已重置忽略标签');
        reloadSoon();
    }

    function handleResetReactions() {
        panelProgress('重置忽略反应');
        writeList(STORE.reactions, DEFAULTS.ignoreReactionsMembers);
        writeList(STORE.dmReactions, DEFAULTS.ignoreMembersDirectMessagesReactions);
        panelDone('已重置忽略反应');
        reloadSoon();
    }

    function handleResetRanks() {
        panelProgress('重置忽略等级');
        writeList(STORE.ranks, DEFAULTS.ignoreLCBanners);
        panelDone('已重置忽略等级');
        reloadSoon();
    }

    function bindPanelCommands(channel) {
        channel.on('apply-lists', handleApplyLists);
        channel.on('reset-lists', function () { handleResetLists(); });
        channel.on('apply-options', handleApplyOptions);
        channel.on('reset-users', function () { handleResetUsers(); });
        channel.on('reset-tags', function () { handleResetTags(); });
        channel.on('reset-reactions', function () { handleResetReactions(); });
        channel.on('reset-ranks', function () { handleResetRanks(); });
    }

    function openPanel() {
        try {
            if (panelChannel) {
                try { panelChannel.close(); } catch (e) { }
                panelChannel = null;
            }
            panelChannel = XLoadPanel.open(PANEL_URL, PANEL_TASK);
            bindPanelCommands(panelChannel);
            panelChannel.send('hello', {});
            XLoadPanel.log('info', 'panel.open', {});
        } catch (e) {
            try { XLoadPanel.log('error', 'panel.open.failed', { message: String(e) }); } catch (e2) { }
        }
    }

    function mountPanelLauncher() {
        try {
            if (document.getElementById('xignore-panel-launcher')) return;
            var button = document.createElement('button');
            button.id = 'xignore-panel-launcher';
            button.type = 'button';
            button.textContent = '忽略设置';
            button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:6px 10px;font-size:12px;line-height:1.2;border:1px solid #8a8a8a;border-radius:4px;background:#ffffff;color:#333333;cursor:pointer;opacity:0.85;';
            button.addEventListener('click', openPanel);
            (document.body || document.documentElement).appendChild(button);
        } catch (e) { }
    }

    $(document).ready(mountPanelLauncher);
})();
