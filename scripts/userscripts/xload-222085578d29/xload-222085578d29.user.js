// ==UserScript==
// @name         客優雲自動更新安全庫存 on 採購建議
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  客優雲自動更新安全庫存 on 採購建議 功能
// @author       You
// @match        https://erp.keyouyun.com/purchase/purchasing
// @match        https://world.keyouyun.com/purchase/purchasing
// @icon         https://www.google.com/s2/favicons?sz=64&domain=keyouyun.com
// @grant        none
// @require       http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @downloadURL https://update.greasyfork.org/scripts/484629/%E5%AE%A2%E5%84%AA%E9%9B%B2%E8%87%AA%E5%8B%95%E6%9B%B4%E6%96%B0%E5%AE%89%E5%85%A8%E5%BA%AB%E5%AD%98%20on%20%E6%8E%A1%E8%B3%BC%E5%BB%BA%E8%AD%B0.user.js
// @updateURL https://update.greasyfork.org/scripts/484629/%E5%AE%A2%E5%84%AA%E9%9B%B2%E8%87%AA%E5%8B%95%E6%9B%B4%E6%96%B0%E5%AE%89%E5%85%A8%E5%BA%AB%E5%AD%98%20on%20%E6%8E%A1%E8%B3%BC%E5%BB%BA%E8%AD%B0.meta.js
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

    // ===== 環境設定 =====
    var PANEL_TASK = 'xload-222085578d29';
    var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-222085578d29/panel.html';

    var API_HOST = 'https://world.keyouyun.com';
    var LEGACY_API_HOST = 'https://api.keyouyun.com';
    var GOOGLE_FORM_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLScxAZfGOH-qiOBc1SwaESTlpDfIfUOvxp99xhUjV3yIIv1Pkw/formResponse';
    var GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/u/3/d/1JC4Ln7ZsBGPfyBfzIv8zQmyCfRvVzrOFsUux2V2Pavg/gviz/tq?tq=SELECT+B';

    var FORM_FIELDS = {
        skuCode: 'entry.232505530',
        image: 'entry.711702336'
    };

    var DEFAULT_OPTIONS = {
        warehouseId: '1454426052596420608',
        stockingDays: 0,
        dailySales: 7,
        pageSize: 50
    };

    var PAGE_SIZE = DEFAULT_OPTIONS.pageSize;

    // ===== HTTP 輔助 =====
    // 同步 GET 並解析 JSON（沿用原腳本同步請求行為以保證流程一致性）
    function syncGetJson(url) {
        var text = $.ajax({
            type: 'GET',
            url: url,
            xhrFields: { withCredentials: true },
            async: false
        }).responseText;
        return JSON.parse(text);
    }

    // 同步送出 JSON 內容（DELETE / PUT 等寫入操作）
    function syncSendJson(method, url, payload) {
        return $.ajax({
            url: url,
            type: method,
            data: JSON.stringify(payload),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            xhrFields: { withCredentials: true },
            async: false
        });
    }

    function purchasingQuery(page, size) {
        return API_HOST + '/vn/api/purchasing'
            + '?skuCode=&itemSkuCode=&type=-1&providerName=&startDate=&endDate='
            + '&page=' + page + '&size=' + size;
    }

    // ===== Google Sheet / Form =====
    function submitToGoogleSheet(skuCode, imageUrl) {
        var data = {};
        data[FORM_FIELDS.skuCode] = skuCode;
        data[FORM_FIELDS.image] = imageUrl;
        $.ajax({
            type: 'POST',
            url: GOOGLE_FORM_URL,
            crossDomain: true,
            data: data
        });
    }

    function fetchGoogleSheetSettings() {
        var responseText = $.ajax({
            type: 'GET',
            url: GOOGLE_SHEET_URL,
            async: false
        }).responseText;

        var from = responseText.indexOf('{');
        var to = responseText.lastIndexOf('}') + 1;
        var payload = JSON.parse(responseText.slice(from, to));

        var cols = payload.table.cols;
        return payload.table.rows.map(function (row) {
            var rowObject = {};
            row.c.forEach(function (cell, index) {
                var col = cols[index];
                rowObject[col.label] = col.type === 'datetime'
                    ? (new Function('', 'return new ' + cell.v))().getTime() / 1000
                    : cell.v;
            });
            return rowObject;
        });
    }

    // 勾選「暫不採購」的列，回傳其 SKU 並同步至 Google 表單
    function syncNoPurchaseToSheet() {
        var skuCodes = [];
        $('div.purchase-table div.suggest-table-cell').each(function (index, cell) {
            var $cell = $(cell);
            var checked = $cell.find('div.v-input--selection-controls__ripple.primary--text');
            if (checked.length === 0) return;

            var skuCode = $cell.find('a').last().text();
            var response = syncGetJson(
                LEGACY_API_HOST + '/vn/api/purchasing'
                + '?skuCode=' + encodeURIComponent(skuCode)
                + '&itemSkuCode=&type=-1&providerName=&startDate=&endDate=&page=0&size=50'
            );

            if (response.length === 1) {
                response = response[0].data[0];
            }
            console.log(response);
            skuCodes.push(skuCode);

            submitToGoogleSheet(skuCode, response.image);
        });
        console.log(skuCodes);
        return skuCodes;
    }

    // ===== 採購建議分析 =====
    function fetchAllPurchasing(size) {
        var all = [];
        var page = 0;
        var count = size;
        while (count === size) {
            var data = syncGetJson(purchasingQuery(page, size));
            count = data.length;
            all = all.concat(data);
            page++;
        }
        return all;
    }

    // 依 Google Sheet 的 ProdNo 名單，拆分需刪除的採購單與需更新安全庫存的 SKU
    function analyzePurchasing(options) {
        options = options || {};
        var size = options.pageSize > 0 ? options.pageSize : PAGE_SIZE;

        var noPurchasingSkuCodes = fetchGoogleSheetSettings().map(function (item) {
            return item.ProdNo;
        });
        console.log(noPurchasingSkuCodes);

        var purchasingIds = [];
        var safeStockSkuCodes = [];
        fetchAllPurchasing(size).forEach(function (item) {
            var detail = item.data[0];
            if (noPurchasingSkuCodes.indexOf(detail.skuCode) === -1) {
                safeStockSkuCodes.push(detail.skuCode);
            } else {
                purchasingIds.push(detail.purchasingId);
            }
        });

        console.log(safeStockSkuCodes.length);
        return { purchasingIds: purchasingIds, safeStockSkuCodes: safeStockSkuCodes };
    }

    function deletePurchasing(purchasingIds) {
        syncSendJson('DELETE', API_HOST + '/vn/api/purchasing', purchasingIds);
    }

    function updateSafeStock(skuCodes, options) {
        options = options || {};
        var params = {
            warehouseId: options.warehouseId || DEFAULT_OPTIONS.warehouseId,
            type: 1,
            skuCodes: skuCodes,
            stockingDays: options.stockingDays != null ? options.stockingDays : DEFAULT_OPTIONS.stockingDays,
            dailySales: options.dailySales != null ? options.dailySales : DEFAULT_OPTIONS.dailySales
        };
        syncSendJson('PUT', API_HOST + '/vn/api/stock/safe-stock/v2', params);
    }

    // 主要流程：刪除已在「暫不採購」名單中的採購建議
    function runAutoUpdateSafe(options) {
        var analysis = analyzePurchasing(options);
        if (analysis.purchasingIds.length > 0) {
            deletePurchasing(analysis.purchasingIds);
        }
        console.log(analysis.purchasingIds);

        $('button:contains("查詢")').click();
        return analysis;
    }

    // 針對未列入「暫不採購」名單的 SKU 更新安全庫存
    function runUpdateSafeStock(options) {
        var analysis = analyzePurchasing(options);
        if (analysis.safeStockSkuCodes.length > 0) {
            updateSafeStock(analysis.safeStockSkuCodes, options);
        }
        return analysis;
    }

    // ===== 頁面注入與事件 =====
    function injectAutoUpdateButton() {
        $('button:contains("更換供貨商")').last().after(
            '<button type="button" class="v-btn" style="" id="autoUpdateSafe"><div class="v-btn__content">自動更新安全庫存</div></button>'
        );
    }

    function bindPageEvents() {
        $('div.v-btn__content:contains("暫不採購")').click(function () {
            syncNoPurchaseToSheet();
        });

        $('#test').click(function () {
            console.log(fetchGoogleSheetSettings());
        });

        $('#autoUpdateSafe').click(function () {
            runAutoUpdateSafe();
        });
    }

    // ===== 面板整合 =====
    function readNumber(data, keys, fallback) {
        for (var i = 0; i < keys.length; i++) {
            var value = data[keys[i]];
            if (value !== undefined && value !== null && value !== '') {
                var num = Number(value);
                if (!isNaN(num)) return num;
            }
        }
        return fallback;
    }

    function readOptions(data) {
        data = data || {};
        return {
            pageSize: readNumber(data, ['page-size', 'pageSize'], DEFAULT_OPTIONS.pageSize),
            warehouseId: data['warehouse-id'] || data.warehouseId || DEFAULT_OPTIONS.warehouseId,
            stockingDays: readNumber(data, ['stocking-days', 'stockingDays'], DEFAULT_OPTIONS.stockingDays),
            dailySales: readNumber(data, ['daily-sales', 'dailySales'], DEFAULT_OPTIONS.dailySales)
        };
    }

    function runPanelTask(channel, label, task) {
        try {
            channel.send('progress', { message: label + '：開始執行…' });
            var result = task();
            channel.send('done', { message: label + '：完成', result: result });
        } catch (err) {
            var message = err && err.message ? err.message : String(err);
            channel.send('error', { message: label + '：' + message });
        }
    }

    function bindPanelCommands(channel) {
        channel.on('auto-update-safe', function (data) {
            runPanelTask(channel, '自動更新安全庫存', function () {
                var analysis = runAutoUpdateSafe(readOptions(data));
                return {
                    deletedCount: analysis.purchasingIds.length,
                    safeStockCount: analysis.safeStockSkuCodes.length
                };
            });
        });

        channel.on('sync-no-purchase', function () {
            runPanelTask(channel, '同步暫不採購', function () {
                return { count: syncNoPurchaseToSheet().length };
            });
        });

        channel.on('update-safe-stock', function (data) {
            runPanelTask(channel, '更新安全庫存', function () {
                var analysis = runUpdateSafeStock(readOptions(data));
                return { count: analysis.safeStockSkuCodes.length };
            });
        });
    }

    function initPanel() {
        if (!window.XLoadPanel) return;
        var channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
        channel.send('hello', {});
        bindPanelCommands(channel);
    }

    function init() {
        injectAutoUpdateButton();
        bindPageEvents();
        initPanel();
    }

    setTimeout(init, 5000);
})();
