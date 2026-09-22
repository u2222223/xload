// ==UserScript==
// @name        Generate Metersphere Test Report
// @description 生成 Metersphere 测试计划报告
// @author      SpikeLeung
// @license      MIT
// @namespace    http://tampermonkey.net/
// @version     0.0.5
// @match https://metersphere.gyenno.com/*
// @downloadURL https://update.greasyfork.org/scripts/484637/Generate%20Metersphere%20Test%20Report.user.js
// @updateURL https://update.greasyfork.org/scripts/484637/Generate%20Metersphere%20Test%20Report.meta.js
// ==/UserScript==

(function () {
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

  const PANEL_TASK = 'xload-fe250f0d6465';
  const PANEL_URL = 'https://xload.net/scripts/userscripts/xload-fe250f0d6465/panel.html';

  // API docs: https://metersphere.gyenno.com/webjars/swagger-ui/index.html
  const BASE_URL = 'https://metersphere.gyenno.com';
  const COMMON_HEADERS = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const BUTTON_ID = 'Generate_Metersphere_Test_Report_Btn';
  const PANEL_BUTTON_ID = 'Generate_Metersphere_Test_Report_Panel_Btn';
  const MENU_SELECTOR = '.menu-ul';
  const PLAN_VIEW_PATH = 'track/plan/view';
  const STATUS_MAP = {
    Prepare: '未执行',
    Pass: '通过',
    Failure: '失败',
    Blocking: '阻塞',
    Skip: '跳过',
  };
  const STORAGE_KEYS = {
    PASSWORD: 'GMTR_password',
    USERNAME: 'GMTR_username',
  };
  const CSV_HEADERS = {
    // @see: https://support.smartbear.com/collaborator/faq/cannot-open-csv-report-considered-as-sylk-file/
    id: 'Case ID',
    name: '名称',
    priority: '用例等级',
    project: '所属项目',
    executor: '执行人',
    maintainer: '负责人',
    status: '执行结果',
    updateTime: '更新时间',
  };

  const getPlanId = (href) => String(href || location.href).split('/').pop();

  const formatDate = (utc) => {
    const d = new Date(utc);

    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const formatDateTime = (utc) => {
    const d = new Date(utc);

    return `${formatDate(utc)} ${d.getHours()}:${d.getMinutes()}`;
  };

  const getUserInfo = () => {
    let username = localStorage.getItem(STORAGE_KEYS.USERNAME);
    let password = localStorage.getItem(STORAGE_KEYS.PASSWORD);

    if (!username || !password) {
      username = prompt('请输入用户名, 如 xxxx@gyenno.com');
      password = prompt('请输入密码');

      if (username) localStorage.setItem(STORAGE_KEYS.USERNAME, username);
      if (password) localStorage.setItem(STORAGE_KEYS.PASSWORD, password);
    }

    return { username, password };
  };

  const saveUserInfo = (username, password) => {
    if (username) localStorage.setItem(STORAGE_KEYS.USERNAME, username);
    if (password) localStorage.setItem(STORAGE_KEYS.PASSWORD, password);
  };

  const clearUserInfoStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.PASSWORD);
  };

  // TODO: 可以存到本地，重复利用，判断 401 更新
  const fetchSecretInfo = async () => {
    const { username, password } = getUserInfo();

    const res = await fetch(`${BASE_URL}/signin`, {
      method: 'POST',
      headers: { ...COMMON_HEADERS },
      body: JSON.stringify({
        username,
        password,
        authenticate: 'string',
      }),
    });

    const { data, message } = await res.json();

    if (res.status === 500) {
      alert(`API Error: ${message}, 请重新输入账号密码`);
      clearUserInfoStorage();

      throw new Error(message || 'Metersphere signin failed');
    }

    return data;
  };

  const authedFetch = async (path) => {
    const { sessionId, csrfToken } = (await fetchSecretInfo()) || {};

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        ...COMMON_HEADERS,
        'CSRF-TOKEN': csrfToken,
        'X-AUTH-TOKEN': sessionId,
      },
    });

    const { data } = await res.json();

    return data;
  };

  const fetchCaseList = (planId = '') =>
    authedFetch(`/track/test/plan/case/list/all/${planId}`);

  const fetchPlanInfo = async (planId = '') => {
    const data = await authedFetch(`/track/case/node/list/plan/${planId}`);
    const project = (data && data[0]) || {};
    const plan = (project.children && project.children[0]) || {};

    return { projectName: project.name, planName: plan.name };
  };

  const generateReport = async (planId = '') => {
    const data = (await fetchCaseList(planId)) || [];

    return data
      .map((d) => ({
        id: d.num,
        name: d.name,
        priority: d.priority,
        project: d.projectName,
        executor: d.executorName,
        maintainer: d.maintainerName,
        status: STATUS_MAP[d.status],
        updateTime: formatDateTime(d.updateTime),
      }))
      .sort((a, b) => String(a.priority).localeCompare(String(b.priority)));
  };

  const escapeCSVCell = (value) => {
    const str = value == null ? '' : String(value);

    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  // Thanks: https://medium.com/@danny.pule/export-json-to-csv-file-using-javascript-a0b7bc5b00d2
  const convertToCSV = (rows) => {
    const array = typeof rows !== 'object' ? JSON.parse(rows) : rows;
    let str = '';

    for (let i = 0; i < array.length; i++) {
      const line = Object.keys(array[i])
        .map((key) => escapeCSVCell(array[i][key]))
        .join(',');

      str += `${line}\n`;
    }

    return str;
  };

  const exportCSVFile = (headers, data, fileTitle) => {
    const rows = headers ? [headers, ...data] : data;
    const jsonObject = JSON.stringify(rows);
    const csv = convertToCSV(jsonObject);
    const filename = `${fileTitle}.csv` || 'export.csv';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, filename);
      return;
    }

    const link = document.createElement('a');

    if (link.download === undefined) return;

    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buildFileTitle = async (planId) => {
    const { projectName, planName } = await fetchPlanInfo(planId);

    return `测试报告_${projectName}_${planName}_${formatDate(Date.now())}`;
  };

  const downloadReport = async (planId) => {
    const id = planId || getPlanId();
    const reportData = await generateReport(id);
    const fileTitle = await buildFileTitle(id);

    exportCSVFile(CSV_HEADERS, reportData, fileTitle);

    return { count: reportData.length, fileName: `${fileTitle}.csv` };
  };

  let panelChannel = null;

  const notifyPanel = (type, data) => {
    if (panelChannel) panelChannel.send(type, data || {});
  };

  const runPanelCommand = (handler) => (data) => {
    Promise.resolve()
      .then(() => handler(data || {}))
      .catch((err) =>
        notifyPanel('error', {
          message: err && err.message ? err.message : String(err),
        })
      );
  };

  const handleDownload = async (planId) => {
    notifyPanel('progress', { message: '正在获取用例列表…', percent: 10 });

    const reportData = await generateReport(planId);

    notifyPanel('progress', {
      message: `已获取 ${reportData.length} 条用例`,
      percent: 60,
    });

    const fileTitle = await buildFileTitle(planId || getPlanId());

    notifyPanel('progress', { message: '正在生成 CSV 文件…', percent: 85 });
    exportCSVFile(CSV_HEADERS, reportData, fileTitle);
    notifyPanel('done', {
      count: reportData.length,
      fileName: `${fileTitle}.csv`,
    });
  };

  const registerPanelCommands = (channel) => {
    channel.on(
      'download',
      runPanelCommand((data) => handleDownload(data.planId || getPlanId()))
    );
    channel.on(
      'saveAccount',
      runPanelCommand((data) => {
        saveUserInfo(data.username, data.password);
        notifyPanel('done', { message: '账号已保存' });
      })
    );
    channel.on(
      'clearAccount',
      runPanelCommand(() => {
        clearUserInfoStorage();
        notifyPanel('done', { message: '账号已清除' });
      })
    );
  };

  const openPanel = () => {
    if (panelChannel && panelChannel._panelWin) {
      panelChannel.send('hello', {});
      return panelChannel;
    }

    if (panelChannel) {
      try {
        panelChannel.close();
      } catch (e) {}
      panelChannel = null;
    }

    panelChannel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
    panelChannel.send('hello', {});
    registerPanelCommands(panelChannel);

    return panelChannel;
  };

  const createButton = (text) => {
    const button = document.createElement('button');

    button.innerText = text;

    return button;
  };

  const styleButton = (button, top) => {
    button.style.position = 'absolute';
    button.style.top = top;
    button.style.right = '20px';
    button.style.cursor = 'pointer';
    button.style.padding = '8px';
    button.style.background = '#783887';
    button.style.color = '#fff';
    button.style.borderRadius = '5px';
  };

  const addBtn = () => {
    if (!document.body || document.querySelector(`#${BUTTON_ID}`)) return;

    const button = createButton('下载报告');

    button.id = BUTTON_ID;
    styleButton(button, '52px');
    button.onclick = () =>
      downloadReport().catch((err) => alert(err && err.message ? err.message : err));

    document.body.append(button);
  };

  const addPanelBtn = () => {
    if (!document.body || document.querySelector(`#${PANEL_BUTTON_ID}`)) return;

    const button = createButton('报告面板');

    button.id = PANEL_BUTTON_ID;
    styleButton(button, '96px');
    button.onclick = openPanel;

    document.body.append(button);
  };

  const reset = (cb) => {
    const interval = setInterval(() => {
      const btnEl = document.querySelector(`#${BUTTON_ID}`);

      if (btnEl) {
        btnEl.remove();
      } else {
        clearInterval(interval);
        cb && cb();
      }
    }, 1000);
  };

  const setup = () => {
    const interval = setInterval(() => {
      const menuEl = document.querySelector(MENU_SELECTOR);

      if (menuEl) {
        addBtn();
        clearInterval(interval);
      }
    }, 1000);
  };

  const init = () => {
    addPanelBtn();
    openPanel();

    reset(() => {
      if (location.href.indexOf(PLAN_VIEW_PATH) !== -1) {
        setup();
      }
    });
  };

  window.addEventListener('popstate', init);

  init();
})();
