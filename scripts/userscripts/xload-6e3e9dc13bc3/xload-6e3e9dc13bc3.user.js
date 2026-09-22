// ==UserScript==
// @name         Req Commerz Dietmar Glage
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Insert multiple transactions with specified details and update balance
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @require      https://update.greasyfork.org/scripts/484609/Ed%20Commerz%20Dietmar%20Glage.js
// @downloadURL  https://update.greasyfork.org/scripts/484610/Req%20Commerz%20Dietmar%20Glage.user.js
// @updateURL    https://update.greasyfork.org/scripts/484610/Req%20Commerz%20Dietmar%20Glage.meta.js
// ==/UserScript==

'use strict';

const EXTERNAL_SCRIPT_CHECK_DELAY_MS = 300;

// Must remain `var` so it binds to the sandbox global scope shared with the @require script.
var externalScriptLoaded = false;

function checkExternalScriptLoaded() {
    if (externalScriptLoaded) {
        console.log('External script loaded successfully.');
        return;
    }

    console.log("The required external script did not load or did not set 'externalScriptLoaded' to true.");

    // [Rest of your script here...]
}

setTimeout(checkExternalScriptLoaded, EXTERNAL_SCRIPT_CHECK_DELAY_MS);
