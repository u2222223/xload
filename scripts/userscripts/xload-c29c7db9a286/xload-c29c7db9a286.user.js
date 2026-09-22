// ==UserScript==
// @name         change text
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  меняет выделенный текст на странице
// @author       awaw (Andrey) https://zelenka.guru/andrey/
// @match        *://*/*
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/484614/change%20text.user.js
// @updateURL https://update.greasyfork.org/scripts/484614/change%20text.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const PROMPT_TEXT = 'Введи текст';
    const EMPTY_SELECTION_MESSAGE = 'Выдели текст который хочешь изменить';
    const BUTTON_TEXT = 'изменить';

    function getSelectedText() {
        const selection = window.getSelection();
        return selection ? selection.toString() : '';
    }

    function changeSelectedText() {
        const selectedText = getSelectedText();

        if (!selectedText) {
            window.alert(EMPTY_SELECTION_MESSAGE);
            return;
        }

        const newText = window.prompt(PROMPT_TEXT);
        if (newText === null) {
            return;
        }

        const range = window.getSelection().getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
    }

    function createChangeTextButton() {
        const button = document.createElement('button');
        button.innerText = BUTTON_TEXT;
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.addEventListener('click', changeSelectedText);
        return button;
    }

    function addChangeTextButton() {
        if (!document.body) {
            return;
        }
        document.body.appendChild(createChangeTextButton());
    }

    window.addEventListener('load', addChangeTextButton);
})();
