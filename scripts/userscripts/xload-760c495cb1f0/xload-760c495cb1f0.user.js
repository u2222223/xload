// ==UserScript==
// @name         客優雲庫存清單-功能
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  客優雲庫存清單 功能
// @author       You
// @match        https://erp.keyouyun.com/depot/stock
// @match        https://world.keyouyun.com/depot/stock
// @icon         https://www.google.com/s2/favicons?sz=64&domain=keyouyun.com
// @grant        none
// @require       http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @downloadURL https://update.greasyfork.org/scripts/484631/%E5%AE%A2%E5%84%AA%E9%9B%B2%E5%BA%AB%E5%AD%98%E6%B8%85%E5%96%AE-%E5%8A%9F%E8%83%BD.user.js
// @updateURL https://update.greasyfork.org/scripts/484631/%E5%AE%A2%E5%84%AA%E9%9B%B2%E5%BA%AB%E5%AD%98%E6%B8%85%E5%96%AE-%E5%8A%9F%E8%83%BD.meta.js
// ==/UserScript==

(function () {
    'use strict';

    var API_BASE = 'https://world.keyouyun.com';
    var PANEL_TASK = 'xload-760c495cb1f0';
    var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-760c495cb1f0/panel.html';

    var DEFAULT_CONFIG = {
        warehouseId: '1454426052596420608',
        batchSize: 50,
        stockingDays: 3,
        skuCodeLength: 10,
        pageDelay: 5000
    };
    var config = Object.assign({}, DEFAULT_CONFIG);

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

    // ------------------------------------------------------------------
    // 面板参数与通信
    // ------------------------------------------------------------------

    function toInt(value) {
        var n = parseInt(value, 10);
        return isNaN(n) ? null : n;
    }

    function applyConfig(input) {
        if (!input || typeof input !== 'object') return config;
        if (typeof input.warehouseId === 'string' && input.warehouseId) {
            config.warehouseId = input.warehouseId;
        }
        var batchSize = toInt(input.batchSize);
        if (batchSize !== null && batchSize > 0) config.batchSize = batchSize;
        var stockingDays = toInt(input.stockingDays);
        if (stockingDays !== null && stockingDays >= 0) config.stockingDays = stockingDays;
        var skuCodeLength = toInt(input.skuCodeLength);
        if (skuCodeLength !== null && skuCodeLength > 0) config.skuCodeLength = skuCodeLength;
        var pageDelay = toInt(input.pageDelay);
        if (pageDelay !== null && pageDelay >= 0) config.pageDelay = pageDelay;
        return config;
    }

    function errorMessage(e) {
        return e && e.message ? String(e.message) : String(e);
    }

    var channel = null;

    function openPanel() {
        if (channel) {
            try { channel.close(); } catch (e) { /* 忽略旧通道关闭异常 */ }
        }
        channel = XLoadPanel.open(PANEL_URL, PANEL_TASK);
        channel.send('hello', {});
        registerPanelHandlers(channel);
        return channel;
    }

    function registerPanelHandlers(ch) {
        ch.on('autoUpdateSafe', function (data) {
            applyConfig(data);
            ch.send('progress', { action: 'autoUpdateSafe', state: 'running' });
            try {
                autoUpdateSafe({
                    progress: function (page, count) {
                        ch.send('progress', { action: 'autoUpdateSafe', page: page, count: count });
                    },
                    done: function (pages) {
                        ch.send('done', { action: 'autoUpdateSafe', pages: pages });
                    }
                });
            } catch (e) {
                ch.send('error', { action: 'autoUpdateSafe', message: errorMessage(e) });
            }
        });

        ch.on('openOverSell', function (data) {
            applyConfig(data);
            ch.send('progress', { action: 'openOverSell', state: 'running' });
            try {
                batchOpenOverSell(1, {
                    progress: function (page, count) {
                        ch.send('progress', { action: 'openOverSell', page: page, count: count });
                    },
                    done: function (pages) {
                        ch.send('done', { action: 'openOverSell', pages: pages });
                    }
                });
            } catch (e) {
                ch.send('error', { action: 'openOverSell', message: errorMessage(e) });
            }
        });

        ch.on('updateCargo', function (data) {
            applyConfig(data);
            ch.send('progress', { action: 'updateCargo', state: 'running' });
            try {
                var updated = updateCargoFromPage();
                ch.send('done', { action: 'updateCargo', updated: updated });
            } catch (e) {
                ch.send('error', { action: 'updateCargo', message: errorMessage(e) });
            }
        });

        ch.on('deleteStock', function (data) {
            applyConfig(data);
            ch.send('progress', { action: 'deleteStock', state: 'running' });
            try {
                deleteStock();
                ch.send('done', { action: 'deleteStock' });
            } catch (e) {
                ch.send('error', { action: 'deleteStock', message: errorMessage(e) });
            }
        });
    }

    // ------------------------------------------------------------------
    // 接口封装
    // ------------------------------------------------------------------

    function apiRequest(method, path, payload, expectJson) {
        var result;
        var options = {
            url: API_BASE + path,
            type: method,
            contentType: 'application/json; charset=utf-8',
            xhrFields: { withCredentials: true },
            async: false,
            success: function (data) { result = data; }
        };
        if (payload !== undefined) options.data = JSON.stringify(payload);
        if (expectJson) options.dataType = 'json';
        $.ajax(options);
        return result;
    }

    function fetchStockPage(page, size, skuCode) {
        var query = [
            'page=' + encodeURIComponent(page),
            'size=' + encodeURIComponent(size),
            'itemType=1',
            'skuCode=' + encodeURIComponent(skuCode || ''),
            'warehouseId=' + encodeURIComponent(config.warehouseId)
        ].join('&');
        var data = apiRequest('GET', '/vn/api/stock?' + query);
        return Array.isArray(data) ? data : [];
    }

    // ------------------------------------------------------------------
    // 业务功能
    // ------------------------------------------------------------------

    function updateSafeStock(skuCodes) {
        return apiRequest('PUT', '/vn/api/stock/safe-stock/v2', {
            warehouseId: config.warehouseId,
            type: 1,
            skuCodes: skuCodes,
            stockingDays: config.stockingDays
        }, true);
    }

    function autoUpdateSafe(hooks) {
        hooks = hooks || {};
        var size = config.batchSize;
        var page = 1;
        var count = size;
        while (count === size) {
            var data = fetchStockPage(page, size, '');
            count = data.length;
            updateSafeStock(data.map(function (x) { return x.skuCode; }));
            if (hooks.progress) hooks.progress(page, count);
            page++;
        }
        if (hooks.done) hooks.done(page - 1);
    }

    function openOverSell(skuData) {
        var autoSync = skuData.autoSyncToPlatformConfigDTO;
        var autoPush = autoSync ? autoSync.autoPush : 0;
        var oversell = autoSync ? autoSync.oversell : 0;
        if (oversell) return;
        return apiRequest('POST', '/vn/api/auto/config/setConfig', {
            autoPush: autoPush,
            preventOversell: 1,
            oversell: 1,
            storageScItemId: skuData.scItemId,
            skuCode: skuData.skuCode,
            warehouseId: config.warehouseId
        }, true);
    }

    function batchOpenOverSell(page, hooks) {
        hooks = hooks || {};
        var size = config.batchSize;
        var data = fetchStockPage(page, size, '');
        data.forEach(openOverSell);
        if (hooks.progress) hooks.progress(page, data.length);
        if (data.length === size) {
            setTimeout(function () { batchOpenOverSell(page + 1, hooks); }, config.pageDelay);
        } else if (hooks.done) {
            hooks.done(page);
        }
    }

    function singleOpenOverSell(skuCode) {
        var data = fetchStockPage(1, config.batchSize, skuCode);
        data.forEach(openOverSell);
        return data.length;
    }

    function deleteStock() {
        return apiRequest('DELETE', '/vn/api/sc-item/v2', [], true);
    }

    function findCargo(skuCode) {
        var data = apiRequest('POST', '/lux/api/special/findProductSimpleInfo', [{ skuCode: skuCode }], true);
        if (!Array.isArray(data)) return [];
        return data.map(function (x) {
            return { variationIndexs: x.variationIndexs, productId: x.productId, platformId: 10 };
        });
    }

    function updateCargo(skuCode, variationVM) {
        return apiRequest('POST', '/lux/api/special/update_product_cargo_info', {
            cargoCode: skuCode,
            variationVM: variationVM
        }, true);
    }

    function getStock(skuCode) {
        var data = fetchStockPage(1, config.batchSize, skuCode);
        return data.length > 0 ? data[0] : undefined;
    }

    function updateCargoBySkuCode(skuCode) {
        var skuData = getStock(skuCode);
        if (!skuData) return;
        var result = findCargo(skuData.variationSku);
        result.forEach(function (element) {
            var variation = element.variationIndexs && element.variationIndexs[0];
            if (!variation) return;
            if (variation.stock < 2) {
                variation.stock = skuData.residue > 2 ? 999 : skuData.residue;
            } else if (skuData.residue === 0 && variation.stock > 0) {
                variation.stock = 0;
            }
        });
        updateCargo(skuCode, result);
    }

    function updateCargoFromPage() {
        var updated = 0;
        $('.v-offer-item__body').each(function (index, ele) {
            var skuCode = $(ele).find('div.v-offer-item__cell:eq(2)').text();
            if (skuCode.length === config.skuCodeLength) {
                updateCargoBySkuCode(skuCode);
                singleOpenOverSell(skuCode);
                updated++;
            }
        });
        return updated;
    }

    // ------------------------------------------------------------------
    // 页面按钮
    // ------------------------------------------------------------------

    function initUi() {
        var batchButton = $('button:contains("批次處理")').last();
        batchButton.after(
            '<button type="button" class="v-btn" id="autoUpdateSafe"><div class="v-btn__content">自動更新安全庫存</div></button>' +
            '<button type="button" class="v-btn" id="openOverSell"><div class="v-btn__content">打開防超賣</div></button>' +
            '<button type="button" class="v-btn" id="updateCargo"><div class="v-btn__content">更新蝦皮庫存 </div></button>' +
            '<button type="button" class="v-btn" id="openPanel"><div class="v-btn__content">功能面板</div></button>'
        );

        $('#autoUpdateSafe').click(function () { autoUpdateSafe(); });
        $('#openOverSell').click(function () { batchOpenOverSell(1); });
        $('#deleteStock').click(function () { deleteStock(); });
        $('#updateCargo').click(function () { updateCargoFromPage(); });
        $('#openPanel').click(function () { openPanel(); });
    }

    setTimeout(function () {
        initUi();
    }, 5000);
})();
