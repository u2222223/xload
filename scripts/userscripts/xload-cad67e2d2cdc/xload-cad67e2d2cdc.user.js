// ==UserScript==
// @name         客優雲出入庫-更新蝦皮庫存
// @namespace    http://tampermonkey.net/
// @version      2026-01-19--1
// @description  客優雲出入庫-更新蝦皮庫存 功能
// @author       You
// @match        https://erp.keyouyun.com/depot/active*
// @match        https://world.keyouyun.com/depot/active*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=keyouyun.com
// @grant        none
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @downloadURL  https://update.greasyfork.org/scripts/484630/%E5%AE%A2%E5%84%AA%E9%9B%B2%E5%87%BA%E5%85%A5%E5%BA%AB-%E6%9B%B4%E6%96%B0%E8%9D%A6%E7%9A%AE%E5%BA%AB%E5%AD%98.user.js
// @updateURL    https://update.greasyfork.org/scripts/484630/%E5%AE%A2%E5%84%AA%E9%9B%B2%E5%87%BA%E5%85%A5%E5%BA%AB-%E6%9B%B4%E6%96%B0%E8%9D%A6%E7%9A%AE%E5%BA%AB%E5%AD%98.meta.js
// ==/UserScript==

// XLoadPanel —— 面板通信层（脚本侧精简实现，协议与站点 assets/panel/panel.js 对齐）
// 消息格式：{type, data, _from}；请求-响应：{_id, _request}
// 信任模型：跨源仅信任面板页来源 PANEL_ORIGIN；优先使用 open() 返回的窗口引用
(function () {
  'use strict';
  var PREFIX = 'xload-panel:';
  var PANEL_ORIGIN = 'https://xload.net';

  // ---------- 运行日志（仅内存环形缓冲，刷新即清；不脱敏、不持久化） ----------
  var LOG_LIMIT = 200;
  var LOG_PUSH = 'log';
  var LOG_PULL = 'logs';
  var LOG_LEVELS = ["debug","info","warn","error"];
  var _logs = [];
  var _channels = [];

  function _safeData(data) {
    if (data == null) return null;
    try { return JSON.parse(JSON.stringify(data)); }
    catch (e) { try { return String(data); } catch (e2) { return '[unserializable]'; } }
  }

  // 向所有已连接面板推送日志（走 _post，避免触发 send 的埋点造成递归）
  function _broadcastLog(entry) {
    for (var i = 0; i < _channels.length; i++) {
      try { _channels[i]._post({ type: LOG_PUSH, data: entry, _from: _channels[i]._id }); } catch (e) {}
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
    } catch (e) {}
  }

  // 返回深拷贝快照，避免调用方改动缓冲内条目
  function logsSnapshot() {
    try {
      return _logs.map(function (e) {
        return { ts: e.ts, level: e.level, event: e.event, data: _safeData(e.data) };
      });
    } catch (e) { return []; }
  }

  // 全局未捕获错误与 Promise 拒绝：只记录，不拦截站点默认行为
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
  } catch (e) {}

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
    _channels.push(this);
    log('info', 'channel', { taskId: this._id });
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
    // 忽略其它脚本通道回环的日志推送，避免同任务多通道间日志互相转发形成死循环
    if (msg.type === LOG_PUSH) return;
    if (msg._id != null && !msg._request && Object.prototype.hasOwnProperty.call(this._pending, msg._id)) {
      var p = this._pending[msg._id];
      delete this._pending[msg._id];
      if (p._timer) clearTimeout(p._timer);
      if (msg.error != null) p.reject(new Error(String(msg.error)));
      else p.resolve(msg.data == null ? {} : msg.data);
      return;
    }
    log('debug', 'recv', { type: msg.type });
    // 内建响应：面板拉取运行日志快照
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

  // 单向发送：type 命令；上报用 progress/done/error
  Channel.prototype.send = function (type, data) {
    log('debug', 'send', { type: type });
    this._post({ type: type, data: data == null ? {} : data, _from: this._id });
    return this;
  };

  // 请求-响应：等待面板回包，默认超时 8000ms
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

  // 监听面板消息（面板命令 type = action.id）
  Channel.prototype.on = function (type, handler) {
    (this._handlers[type] = this._handlers[type] || []).push(handler);
    return this;
  };

  Channel.prototype.close = function () {
    var idx = _channels.indexOf(this);
    if (idx >= 0) _channels.splice(idx, 1);
    log('info', 'close', {});
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
    LOG_LIMIT: LOG_LIMIT,
    // 可选上报接口：脚本可在关键功能点记录自定义运行事件
    log: function (level, event, data) { log(level, event, data); return this; },
    logs: function () { return logsSnapshot(); },
    clearLogs: function () { _logs = []; return this; },
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

  var PANEL_TASK = 'xload-cad67e2d2cdc';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-cad67e2d2cdc/panel.html';
  var DEFAULT_WAREHOUSE_ID = '1454426052596420608';
  var DEFAULT_POSITION = 'WHJ-1-1';
  var DEFAULT_SHELF_CODE = '1531594197984563200';
  var INIT_DELAY = 5000;

  var state = {
    warehouses: [],
    panelChannel: null
  };

  function log(level, event, data) {
    if (window.XLoadPanel && typeof window.XLoadPanel.log === 'function') {
      window.XLoadPanel.log(level, event, data || {});
    }
  }

  function ajaxJson(options) {
    var response;
    var failure;

    $.ajax({
      url: options.url,
      type: options.type || 'GET',
      data: options.data == null ? undefined : JSON.stringify(options.data),
      contentType: 'application/json; charset=utf-8',
      dataType: options.dataType,
      xhrFields: { withCredentials: true },
      async: false,
      success: function (data) {
        response = data;
      },
      error: function (xhr, status, error) {
        failure = error || status || 'request failed';
        log('error', 'ajax.error', { url: options.url, status: status, error: String(failure) });
      }
    });

    if (failure) throw new Error(String(failure));
    return response;
  }

  function getSelectedOrderCodes() {
    var orders = [];
    $('div.v-offer-item-Wrap').each(function (_index, element) {
      var selected = $(element).find('div.v-input--selection-controls__ripple.primary--text');
      if (selected.length > 0) {
        orders.push($(element).find('.grey--text:eq(1)').text());
      }
    });
    return orders;
  }

  function getVisibleSkuCodes() {
    var skuCodes = [];
    $('.v-offer-item__info').each(function (_index, element) {
      var skuCode = $.trim($(element).find('div.v-offer-item__info-skuCode').text());
      if (skuCode.length === 10) skuCodes.push(skuCode);
    });
    return skuCodes;
  }

  function ensureWarehouses() {
    if (state.warehouses.length > 0) return state.warehouses;

    var data = ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/all/warehouse/v2?shareSign=false&thirdSign=false'
    });
    state.warehouses = data && data.ownerWarehouses ? data.ownerWarehouses : [];
    return state.warehouses;
  }

  function findWarehouseByName(warehouseName) {
    var normalizedName = $.trim(warehouseName || '');
    if (!normalizedName) return null;

    return ensureWarehouses().filter(function (warehouse) {
      return warehouse.warehouseName === normalizedName;
    })[0] || null;
  }

  function getStock(skuCode, warehouseId) {
    var result = ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/stock?page=1&size=50&itemType=1&skuCode=' +
        encodeURIComponent(skuCode) + '&warehouseId=' + encodeURIComponent(warehouseId || DEFAULT_WAREHOUSE_ID)
    });
    return result && result.length > 0 ? result[0] : null;
  }

  function findCargo(variationSku) {
    var result = ajaxJson({
      url: 'https://world.keyouyun.com/lux/api/special/findProductSimpleInfo',
      type: 'POST',
      dataType: 'json',
      data: [{ skuCode: variationSku }]
    }) || [];

    return result.map(function (item) {
      return {
        variationIndexs: item.variationIndexs,
        productId: item.productId,
        platformId: 10
      };
    });
  }

  function updateCargo(skuCode, variationVM) {
    return ajaxJson({
      url: 'https://world.keyouyun.com/lux/api/special/update_product_cargo_info',
      type: 'POST',
      dataType: 'json',
      data: {
        cargoCode: skuCode,
        variationVM: variationVM
      }
    });
  }

  function updateCargoBySkuCode(skuCode) {
    var skuData = getStock(skuCode, DEFAULT_WAREHOUSE_ID);
    if (!skuData) {
      log('warn', 'stock.missing', { skuCode: skuCode });
      return false;
    }

    var cargoItems = findCargo(skuData.variationSku);
    cargoItems.forEach(function (item) {
      var firstVariation = item.variationIndexs && item.variationIndexs[0];
      if (!firstVariation) return;

      if (firstVariation.stock < 2) {
        firstVariation.stock = skuData.residue > 2 ? 999999 : skuData.residue;
      } else if (skuData.residue === 0 && firstVariation.stock > 0) {
        firstVariation.stock = 0;
      }
    });

    updateCargo(skuCode, cargoItems);
    return true;
  }

  function openOverSell(skuData) {
    var config = skuData.autoSyncToPlatformConfigDTO;
    var autoPush = config ? config.autoPush : 0;

    return ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/auto/config/setConfig',
      type: 'POST',
      dataType: 'json',
      data: {
        autoPush: autoPush,
        preventOversell: 1,
        oversell: 1,
        storageScItemId: skuData.scItemId,
        skuCode: skuData.skuCode,
        warehouseId: DEFAULT_WAREHOUSE_ID
      }
    });
  }

  function singleOpenOverSell(skuCode) {
    var stocks = ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/stock?page=1&size=50&itemType=1&skuCode=' +
        encodeURIComponent(skuCode) + '&warehouseId=' + encodeURIComponent(DEFAULT_WAREHOUSE_ID)
    }) || [];

    stocks.forEach(openOverSell);
    return stocks.length;
  }

  function updateSelectedShopeeStock(reportProgress) {
    var skuCodes = getVisibleSkuCodes();
    var updated = 0;

    skuCodes.forEach(function (skuCode, index) {
      if (reportProgress) {
        reportProgress('更新 SKU ' + skuCode + '（' + (index + 1) + '/' + skuCodes.length + '）');
      }
      if (updateCargoBySkuCode(skuCode)) updated += 1;
      singleOpenOverSell(skuCode);
    });

    log('info', 'stock.update.done', { total: skuCodes.length, updated: updated });
    return { total: skuCodes.length, updated: updated };
  }

  function fetchWarehouseFlows(orderCodes) {
    return ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/warehouse/flow?page=1&size=50&action=OUT&codes=' +
        orderCodes.map(encodeURIComponent).join(',')
    }) || [];
  }

  function loadScItemMapping(flow, skuCodesMapping) {
    var missingSkuCodes = [];
    flow.warehouseFlowItem.forEach(function (item) {
      if (!Object.prototype.hasOwnProperty.call(skuCodesMapping, item.skuCode)) {
        missingSkuCodes.push(item.skuCode);
      }
    });

    if (missingSkuCodes.length === 0) return skuCodesMapping;

    var scItems = ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/sc-item?page=1&size=100&skuCodes=' +
        flow.warehouseFlowItem.map(function (item) { return encodeURIComponent(item.skuCode); }).join(',')
    }) || [];

    scItems.forEach(function (scItem) {
      if (!Object.prototype.hasOwnProperty.call(skuCodesMapping, scItem.skuCode)) {
        skuCodesMapping[scItem.skuCode] = scItem;
      }
    });

    return skuCodesMapping;
  }

  function loadPositionMapping(warehouseId, scItems) {
    var positionMapping = {};
    var records = ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/warehouse/operation/records',
      type: 'POST',
      dataType: 'json',
      data: {
        warehouseId: warehouseId,
        scItemIds: scItems.map(function (item) { return item.scItemId; })
      }
    }) || [];

    records.forEach(function (item) {
      positionMapping[item.scItemId] = item.positions && item.positions[0];
    });

    return positionMapping;
  }

  function buildInboundItems(flow, skuCodesMapping, positionMapping) {
    return flow.warehouseFlowItem.map(function (item) {
      var mapping = skuCodesMapping[item.skuCode];
      if (!mapping) throw new Error('找不到商品 SKU：' + item.skuCode);

      return {
        position: positionMapping[mapping.scItemId] || DEFAULT_POSITION,
        id: mapping.id,
        count: item.count,
        skuCode: item.skuCode,
        scItemId: mapping.scItemId,
        costPrice: mapping.costPrice,
        price: mapping.costPrice,
        shelfCode: DEFAULT_SHELF_CODE
      };
    });
  }

  function createInboundFlow(warehouse, sourceFlow, inboundItems) {
    var memo = '調撥原單號:' + sourceFlow.code + (sourceFlow.ordersn ? ';銷售原單號:' + sourceFlow.ordersn : '');
    return ajaxJson({
      url: 'https://world.keyouyun.com/vn/api/v2/warehouse/flow/in',
      type: 'POST',
      dataType: 'json',
      data: {
        scItems: inboundItems,
        warehouseId: warehouse.warehouseId,
        itemType: 1,
        memo: memo
      }
    });
  }

  function transferSelectedOrders(warehouseName, reportProgress) {
    var warehouse = findWarehouseByName(warehouseName);
    if (!warehouse) throw new Error('無此倉庫名稱');

    var orders = getSelectedOrderCodes();
    if (orders.length === 0) throw new Error('未選擇出庫單');

    if (reportProgress) reportProgress('讀取出庫單資料');
    var flows = fetchWarehouseFlows(orders);
    var skuCodesMapping = {};
    var successCount = 0;

    for (var i = 0; i < flows.length; i += 1) {
      var flow = flows[i];
      if (reportProgress) reportProgress('建立調撥入庫單 ' + (i + 1) + '/' + flows.length);
      loadScItemMapping(flow, skuCodesMapping);

      var positionMapping = loadPositionMapping(warehouse.warehouseId, Object.values(skuCodesMapping));
      var inboundItems = buildInboundItems(flow, skuCodesMapping, positionMapping);
      var result = createInboundFlow(warehouse, flow, inboundItems);

      if (result) {
        successCount += 1;
        $('button:contains("重置")').click();
        break;
      }
    }

    log('info', 'transfer.done', { orders: orders.length, success: successCount });
    return { orders: orders.length, success: successCount };
  }

  function addActionButtons() {
    var button = $('button:contains("新增採購入庫")').last();
    if (!button.length || $('#updateCargo').length > 0) return;

    button.after(
      '<button type="button" class="v-btn" id="updateCargo"><div class="v-btn__content">更新蝦皮庫存 </div></button>' +
      '<button type="button" class="v-btn" id="addTransferOrder"><div class="v-btn__content">出庫單調撥入庫 </div></button>' +
      '<button type="button" class="v-btn" id="openXLoadPanel"><div class="v-btn__content">功能面板 </div></button>'
    );

    $('#updateCargo').on('click', function () {
      try {
        updateSelectedShopeeStock();
      } catch (error) {
        alert(error.message || String(error));
        log('error', 'stock.update.failed', { message: error.message || String(error) });
      }
    });

    $('#addTransferOrder').on('click', function () {
      var warehouseName = prompt('請輸入調撥入庫倉庫名稱');
      if (!warehouseName) {
        alert('沒輸入');
        return;
      }

      try {
        var result = transferSelectedOrders(warehouseName);
        alert(result.success > 0 ? '調撥成功' : '調撥失敗');
      } catch (error) {
        alert(error.message || String(error));
        log('error', 'transfer.failed', { message: error.message || String(error) });
      }
    });

    $('#openXLoadPanel').on('click', openPanel);
  }

  function sendPanelError(channel, action, error) {
    channel.send('error', {
      action: action,
      message: error && error.message ? error.message : String(error)
    });
  }

  function bindPanelHandlers(channel) {
    channel
      .on('update-shopee-stock', function () {
        try {
          var result = updateSelectedShopeeStock(function (message) {
            channel.send('progress', { action: 'update-shopee-stock', message: message });
          });
          channel.send('done', { action: 'update-shopee-stock', result: result });
        } catch (error) {
          sendPanelError(channel, 'update-shopee-stock', error);
        }
      })
      .on('transfer-inbound', function (data) {
        try {
          var result = transferSelectedOrders(data && data.warehouseName, function (message) {
            channel.send('progress', { action: 'transfer-inbound', message: message });
          });
          channel.send('done', { action: 'transfer-inbound', result: result });
        } catch (error) {
          sendPanelError(channel, 'transfer-inbound', error);
        }
      });

    return channel;
  }

  function createPanelChannel(channelFactory) {
    if (state.panelChannel && typeof state.panelChannel.close === 'function') {
      state.panelChannel.close();
    }

    state.panelChannel = bindPanelHandlers(channelFactory());
    state.panelChannel.send('hello', {});
    return state.panelChannel;
  }

  function openPanel() {
    createPanelChannel(function () {
      return window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
    });
  }

  function initPanelChannel() {
    createPanelChannel(function () {
      return window.XLoadPanel.channel(PANEL_TASK);
    });
  }

  setTimeout(function () {
    addActionButtons();
    initPanelChannel();
  }, INIT_DELAY);
})();
