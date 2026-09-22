// ==UserScript==
// @name         Bux auto claim
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Renda Extra
// @author       You
// @match        https://seoclub.su/*
// @match        http://videoblog.su/*
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://bulkviews.ru/*
// @match        https://losena.net/*
// @match        https://socexpertt.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=seoclub.su
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/484612/Bux%20auto%20claim.user.js
// @updateURL https://update.greasyfork.org/scripts/484612/Bux%20auto%20claim.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const RELOAD_DELAY_MS = 25000;
    const AUTO_RELOAD_URLS = [
        'https://bulkviews.ru/',
        'https://losena.net/',
        'https://seoclub.su/',
    ];

    const href = window.location.href;

    function clickWhenReady(selector, delay) {
        setTimeout(function () {
            const element = document.querySelector(selector);
            if (element) {
                element.click();
            }
        }, delay);
    }

    if (href.includes('https://m.youtube.com/')) {
        window.close();
    }

    if (AUTO_RELOAD_URLS.some(function (url) { return href.includes(url); })) {
        setTimeout(function () { history.go(0); }, RELOAD_DELAY_MS);
    }

    clickWhenReady('div:nth-of-type(11) span', 2000);
    clickWhenReady('.go-link-youtube', 4000);

    setTimeout(function () {
        if (!(/[?&]autoplay=1/).test(location.search)) {
            clickWhenReady('.ytp-large-play-button', 0);
        }
    }, 500);

    const timer = document.querySelector('.timer');
    if (timer) {
        const check = setInterval(function () {
            if (timer.textContent.trim() === '0') {
                clearInterval(check);
                clickWhenReady('.butt-nw', 800);
            }
        }, 1000);
    }
})();
