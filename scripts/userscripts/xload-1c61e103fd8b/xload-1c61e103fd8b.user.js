// ==UserScript==
// @name        ClipSaver Media File Downloader
// @description Direct download helper for media URLs: shows a small progress panel on video, audio and image pages served from media CDNs and saves the file locally. A companion panel page can start and cancel downloads.
// @version     1.0.0
// @license     MIT
// @run-at      document-start
// @noframes
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_xmlhttpRequest
// @connect     googlevideo.com
// @connect     tiktokcdn.com
// @connect     snssdk.com
// @connect     douyinvod.com
// @connect     tiktokv.com
// @connect     fbcdn.net
// @connect     zjcdn.com
// @connect     twimg.com
// @connect     douyinstatic.com
// @connect     xhscdn.com
// @connect     amemv.com
// @connect     tikwm.com
// @connect     tiktokcdn-eu.com
// @connect     tiktokcdn-us.com
// @connect     douyinpic.com
// @connect     douyinmusicpromotion.com
// @connect     cdninstagram.com
// @connect     ted.com
// @connect     licdn.com
// @connect     sc-cdn.net
// @connect     pinimg.com
// @connect     tedcdn.com
// @connect     dmcdn.net
// @connect     tumblr.com
// @connect     rutube.ru
// @connect     uma.media
// @match       https://*.googlevideo.com/*
// @match       https://*.tiktokcdn.com/*
// @match       https://*.douyinvod.com/*
// @match       https://*.fbcdn.net/*
// @match       https://video.twimg.com/*
// @match       https://*.zjcdn.com/*
// @match       https://*.snssdk.com/*
// @match       https://*.tiktokv.com/*
// @match       https://*.douyinstatic.com/*
// @match       https://*.xhscdn.com/*
// @match       https://*.amemv.com/*
// @match       https://*.tikwm.com/*
// @match       https://*.tiktokcdn-eu.com/*
// @match       https://*.tiktokcdn-us.com/*
// @match       https://*.douyinpic.com/*
// @match       https://*.douyinmusicpromotion.com/*
// @match       https://*.cdninstagram.com/*
// @match       https://*.licdn.com/*
// @match       https://*.sc-cdn.net/*
// @match       https://*.pinimg.com/*
// @match       https://*.ted.com/*
// @match       https://*.tedcdn.com/*
// @match       https://*.dmcdn.net/*
// @match       https://*.tumblr.com/*
// @match       https://*.rutube.ru/*
// @match       https://*.uma.media/*
// ==/UserScript==
(function () {
  'use strict';

  var PANEL_TASK = 'xload-1c61e103fd8b';
  var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-1c61e103fd8b/panel.html';

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
      // 双通道（postMessage + BroadcastChannel）会重复投递同一消息，用实例唯一 nonce + 序号标记 _mid 去重
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
      if (this._panelWin) { try { this._panelWin.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
      else if (this._opener) { try { this._opener.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
      if (this._bc) { try { this._bc.postMessage(msg); } catch (e) {} }
    };

    Channel.prototype._dispatch = function (msg) {
      if (!msg || typeof msg.type !== 'string') return;
      // 双通道可能重复投递同一消息，按 _mid 去重，避免命令被重复执行
      if (msg._mid != null) {
        if (this._seen[msg._mid]) return;
        this._seen[msg._mid] = 1;
        if (++this._seenCount > 500) { this._seen = {}; this._seenCount = 0; }
      }
      // 忽略其它脚本通道回环的日志推送，避免同任务多通道间日志互相转发形成死循环
      if (msg.type === LOG_PUSH) return;
      // 内建心跳：面板探活时回应 pong，脚本重载后新通道可借此被面板重新发现
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

  /* ------------------------------------------------------------------ */
  /* 持久化：优先 GM 存储，回退 localStorage                             */
  /* ------------------------------------------------------------------ */
  var Store = {
    get: function (key, fallback) {
      try { if (typeof GM_getValue === 'function') return GM_getValue(key, fallback); } catch (e) {}
      try {
        var raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; } } catch (e) {}
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
  };

  /* ------------------------------------------------------------------ */
  /* 通用工具                                                            */
  /* ------------------------------------------------------------------ */
  var SUPPORTED_LANGS = {
    en: 'en', es: 'es', fr: 'fr', pt: 'pt', ru: 'ru', ja: 'ja', de: 'de', ko: 'ko',
    it: 'it', id: 'id', tr: 'tr', pl: 'pl', uk: 'uk', nl: 'nl', vi: 'vi', th: 'th',
    ar: 'ar', fa: 'fa', hi: 'hi', ms: 'ms', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW'
  };

  var Utils = {
    getLang: function () {
      var raw = String(navigator.language || navigator.userLanguage || 'en');
      var code = raw.split('-')[0];
      if (code === 'zh') return raw === 'zh-CN' ? 'zh-CN' : 'zh-TW';
      return SUPPORTED_LANGS[code] || 'en';
    },
    formatBytes: function (bytes, decimals) {
      var size = Number(bytes);
      if (!Number.isFinite(size) || size < 0) return '0 KB';
      var kb = 1024;
      var mb = kb * 1024;
      var gb = mb * 1024;
      var digits = decimals == null ? 2 : decimals;
      if (size >= gb) return (size / gb).toFixed(digits) + ' GB';
      if (size >= mb) return (size / mb).toFixed(digits) + ' MB';
      return (size / kb).toFixed(digits) + ' KB';
    }
  };

  /* ------------------------------------------------------------------ */
  /* 面板桥接                                                            */
  /* ------------------------------------------------------------------ */
  var Panel = {
    channel: null,
    onApply: null,
    config: { enabled: true },
    apply: function (data) {
      if (!data || typeof data !== 'object') return;
      var src = data.values || data.controls || data;
      Object.keys(Panel.config).forEach(function (key) {
        if (src[key] !== undefined) Panel.config[key] = src[key];
      });
      if (typeof Panel.onApply === 'function') {
        try { Panel.onApply(Panel.config); } catch (e) {}
      }
    },
    report: function (type, data) {
      if (!Panel.channel) return;
      try { Panel.channel.send(type, data || {}); } catch (e) {}
    },
    bind: function (channel, actions) {
      Object.keys(actions).forEach(function (id) {
        channel.on(id, function (data) {
          try {
            Panel.report('progress', { action: id, status: 'running' });
            Promise.resolve(actions[id](data)).then(function () {
              Panel.report('done', { action: id, status: 'done' });
            }).catch(function (err) {
              Panel.report('error', { action: id, message: String(err && err.message || err) });
            });
          } catch (err) {
            Panel.report('error', { action: id, message: String(err && err.message || err) });
          }
        });
      });
    },
    open: function (actions) {
      if (Panel.channel) return Panel.channel;
      if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') return null;
      var channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
      Panel.channel = channel;
      Panel.bind(channel, actions);
      channel.send('hello', {});
      try { window.XLoadPanel.log('info', 'panel.ready', { task: PANEL_TASK }); } catch (e) {}
      return channel;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 本地化文案                                                          */
  /* ------------------------------------------------------------------ */
  var MESSAGES = {
    en: { startDownload: 'Start Download', cancelDownload: 'Cancel Download', downloadProgress: 'Download Progress:', downloadCompleted: 'Download completed', downloadCompletedToast: 'Download completed!', reDownload: 'Download Again', downloadFailed: 'Download failed', downloadFailedToast: 'Download failed, please check console', downloadCanceledToast: 'Download canceled', downloaderTip: '* If download fails, save manually: right click -> Save video as.<br>* If the file is too large (over 200MB), manual saving is recommended.' },
    es: { startDownload: 'Iniciar descarga', cancelDownload: 'Cancelar descarga', downloadProgress: 'Progreso de descarga:', downloadCompleted: 'Descarga completada', downloadCompletedToast: '¡Descarga completada!', reDownload: 'Descargar de nuevo', downloadFailed: 'Error de descarga', downloadFailedToast: 'La descarga falló, revise la consola', downloadCanceledToast: 'Descarga cancelada', downloaderTip: '* Si la descarga falla, guarda manualmente: clic derecho -> Guardar video como.<br>* Si el archivo es demasiado grande (mas de 200MB), se recomienda guardar manualmente.' },
    fr: { startDownload: 'Demarrer le telechargement', cancelDownload: 'Annuler le telechargement', downloadProgress: 'Progression du telechargement :', downloadCompleted: 'Telechargement termine', downloadCompletedToast: 'Telechargement termine !', reDownload: 'Telecharger a nouveau', downloadFailed: 'Echec du telechargement', downloadFailedToast: 'Le telechargement a echoue, verifiez la console', downloadCanceledToast: 'Telechargement annule', downloaderTip: '* Si le telechargement echoue, enregistrez manuellement : clic droit -> Enregistrer la video sous.<br>* Si le fichier est trop volumineux (plus de 200MB), l\'enregistrement manuel est recommande.' },
    pt: { startDownload: 'Iniciar download', cancelDownload: 'Cancelar download', downloadProgress: 'Progresso do download:', downloadCompleted: 'Download concluido', downloadCompletedToast: 'Download concluido!', reDownload: 'Baixar novamente', downloadFailed: 'Falha no download', downloadFailedToast: 'Falha no download, verifique o console', downloadCanceledToast: 'Download cancelado', downloaderTip: '* Se o download falhar, salve manualmente: clique direito -> Salvar video como.<br>* Se o arquivo for muito grande (acima de 200MB), recomenda-se salvar manualmente.' },
    ru: { startDownload: 'Начать загрузку', cancelDownload: 'Отменить загрузку', downloadProgress: 'Прогресс загрузки:', downloadCompleted: 'Загрузка завершена', downloadCompletedToast: 'Загрузка завершена!', reDownload: 'Скачать снова', downloadFailed: 'Ошибка загрузки', downloadFailedToast: 'Сбой загрузки, проверьте консоль', downloadCanceledToast: 'Загрузка отменена', downloaderTip: '* Если загрузка не удалась, сохраните вручную: правый клик -> Сохранить видео как.<br>* Если файл слишком большой (более 200MB), рекомендуется сохранять вручную.' },
    ja: { startDownload: 'ダウンロード開始', cancelDownload: 'ダウンロードをキャンセル', downloadProgress: 'ダウンロード進行状況:', downloadCompleted: 'ダウンロード完了', downloadCompletedToast: 'ダウンロードが完了しました！', reDownload: '再ダウンロード', downloadFailed: 'ダウンロード失敗', downloadFailedToast: 'ダウンロードに失敗しました。コンソールを確認してください', downloadCanceledToast: 'ダウンロードをキャンセルしました', downloaderTip: '* ダウンロードに失敗した場合は手動保存: 右クリック -> 動画を名前を付けて保存。<br>* ファイルが大きすぎる場合（200MB超）、手動保存を推奨します。' },
    de: { startDownload: 'Download starten', cancelDownload: 'Download abbrechen', downloadProgress: 'Download-Fortschritt:', downloadCompleted: 'Download abgeschlossen', downloadCompletedToast: 'Download abgeschlossen!', reDownload: 'Erneut herunterladen', downloadFailed: 'Download fehlgeschlagen', downloadFailedToast: 'Download fehlgeschlagen, bitte Konsole pruefen', downloadCanceledToast: 'Download abgebrochen', downloaderTip: '* Wenn der Download fehlschlaegt, manuell speichern: Rechtsklick -> Video speichern unter.<br>* Wenn die Datei zu gross ist (uber 200MB), wird manuelles Speichern empfohlen.' },
    ko: { startDownload: '다운로드 시작', cancelDownload: '다운로드 취소', downloadProgress: '다운로드 진행률:', downloadCompleted: '다운로드 완료', downloadCompletedToast: '다운로드가 완료되었습니다!', reDownload: '다시 다운로드', downloadFailed: '다운로드 실패', downloadFailedToast: '다운로드에 실패했습니다. 콘솔을 확인하세요', downloadCanceledToast: '다운로드가 취소되었습니다', downloaderTip: '* 다운로드 실패 시 수동 저장: 마우스 오른쪽 클릭 -> 동영상을 다른 이름으로 저장.<br>* 파일이 너무 큰 경우(200MB 이상) 수동 저장을 권장합니다.' },
    it: { startDownload: 'Avvia download', cancelDownload: 'Annulla download', downloadProgress: 'Avanzamento download:', downloadCompleted: 'Download completato', downloadCompletedToast: 'Download completato!', reDownload: 'Scarica di nuovo', downloadFailed: 'Download non riuscito', downloadFailedToast: 'Download non riuscito, controlla la console', downloadCanceledToast: 'Download annullato', downloaderTip: '* Se il download fallisce, salva manualmente: clic destro -> Salva video con nome.<br>* Se il file e troppo grande (oltre 200MB), e consigliato il salvataggio manuale.' },
    id: { startDownload: 'Mulai unduh', cancelDownload: 'Batalkan unduhan', downloadProgress: 'Progres unduhan:', downloadCompleted: 'Unduhan selesai', downloadCompletedToast: 'Unduhan selesai!', reDownload: 'Unduh lagi', downloadFailed: 'Unduhan gagal', downloadFailedToast: 'Unduhan gagal, periksa konsol', downloadCanceledToast: 'Unduhan dibatalkan', downloaderTip: '* Jika unduhan gagal, simpan manual: klik kanan -> Simpan video sebagai.<br>* Jika file terlalu besar (lebih dari 200MB), disarankan simpan manual.' },
    tr: { startDownload: 'Indirmeyi baslat', cancelDownload: 'Indirmeyi iptal et', downloadProgress: 'Indirme ilerlemesi:', downloadCompleted: 'Indirme tamamlandi', downloadCompletedToast: 'Indirme tamamlandi!', reDownload: 'Tekrar indir', downloadFailed: 'Indirme basarisiz', downloadFailedToast: 'Indirme basarisiz, lutfen konsolu kontrol edin', downloadCanceledToast: 'Indirme iptal edildi', downloaderTip: '* Indirme basarisiz olursa manuel kaydedin: saga tik -> Videoyu farkli kaydet.<br>* Dosya cok buyukse (200MB ustu), manuel kaydetmeniz onerilir.' },
    pl: { startDownload: 'Rozpocznij pobieranie', cancelDownload: 'Anuluj pobieranie', downloadProgress: 'Postep pobierania:', downloadCompleted: 'Pobieranie zakonczone', downloadCompletedToast: 'Pobieranie zakonczone!', reDownload: 'Pobierz ponownie', downloadFailed: 'Pobieranie nieudane', downloadFailedToast: 'Pobieranie nieudane, sprawdz konsole', downloadCanceledToast: 'Pobieranie anulowane', downloaderTip: '* Jesli pobieranie sie nie powiedzie, zapisz recznie: prawy przycisk -> Zapisz wideo jako.<br>* Jesli plik jest zbyt duzy (powyej 200MB), zaleca sie zapis reczny.' },
    uk: { startDownload: 'Почати завантаження', cancelDownload: 'Скасувати завантаження', downloadProgress: 'Прогрес завантаження:', downloadCompleted: 'Завантаження завершено', downloadCompletedToast: 'Завантаження завершено!', reDownload: 'Завантажити знову', downloadFailed: 'Помилка завантаження', downloadFailedToast: 'Не вдалося завантажити, перевірте консоль', downloadCanceledToast: 'Завантаження скасовано', downloaderTip: '* Якщо завантаження не вдалося, збережіть вручну: правий клік -> Зберегти відео як.<br>* Якщо файл занадто великий (понад 200MB), рекомендовано зберігати вручну.' },
    nl: { startDownload: 'Download starten', cancelDownload: 'Download annuleren', downloadProgress: 'Downloadvoortgang:', downloadCompleted: 'Download voltooid', downloadCompletedToast: 'Download voltooid!', reDownload: 'Opnieuw downloaden', downloadFailed: 'Download mislukt', downloadFailedToast: 'Download mislukt, controleer de console', downloadCanceledToast: 'Download geannuleerd', downloaderTip: '* Als downloaden mislukt, handmatig opslaan: rechtermuisknop -> Video opslaan als.<br>* Als het bestand te groot is (meer dan 200MB), wordt handmatig opslaan aanbevolen.' },
    vi: { startDownload: 'Bat dau tai xuong', cancelDownload: 'Huy tai xuong', downloadProgress: 'Tien do tai xuong:', downloadCompleted: 'Tai xuong hoan tat', downloadCompletedToast: 'Tai xuong hoan tat!', reDownload: 'Tai lai', downloadFailed: 'Tai xuong that bai', downloadFailedToast: 'Tai xuong that bai, vui long kiem tra console', downloadCanceledToast: 'Da huy tai xuong', downloaderTip: '* Neu tai xuong that bai, hay luu thu cong: nhap chuot phai -> Luu video thanh.<br>* Neu tep qua lon (tren 200MB), khuyen nghi luu thu cong.' },
    th: { startDownload: 'เริ่มดาวน์โหลด', cancelDownload: 'ยกเลิกการดาวน์โหลด', downloadProgress: 'ความคืบหน้าการดาวน์โหลด:', downloadCompleted: 'ดาวน์โหลดเสร็จสิ้น', downloadCompletedToast: 'ดาวน์โหลดเสร็จสิ้น!', reDownload: 'ดาวน์โหลดอีกครั้ง', downloadFailed: 'ดาวน์โหลดล้มเหลว', downloadFailedToast: 'ดาวน์โหลดล้มเหลว โปรดตรวจสอบคอนโซล', downloadCanceledToast: 'ยกเลิกการดาวน์โหลดแล้ว', downloaderTip: '* หากดาวน์โหลดล้มเหลว ให้บันทึกด้วยตนเอง: คลิกขวา -> บันทึกวิดีโอเป็น.<br>* หากไฟล์มีขนาดใหญ่เกินไป (มากกว่า 200MB) แนะนำให้บันทึกด้วยตนเอง.' },
    ar: { startDownload: 'بدء التنزيل', cancelDownload: 'إلغاء التنزيل', downloadProgress: 'تقدم التنزيل:', downloadCompleted: 'اكتمل التنزيل', downloadCompletedToast: 'اكتمل التنزيل!', reDownload: 'تنزيل مرة اخرى', downloadFailed: 'فشل التنزيل', downloadFailedToast: 'فشل التنزيل، يرجى التحقق من وحدة التحكم', downloadCanceledToast: 'تم إلغاء التنزيل', downloaderTip: '* إذا فشل التنزيل، احفظ يدويًا: انقر بزر الماوس الأيمن -> حفظ الفيديو باسم.<br>* إذا كان الملف كبيرًا جدًا (أكثر من 200MB)، يوصى بالحفظ اليدوي.' },
    fa: { startDownload: 'شروع دانلود', cancelDownload: 'لغو دانلود', downloadProgress: 'پیشرفت دانلود:', downloadCompleted: 'دانلود کامل شد', downloadCompletedToast: 'دانلود کامل شد!', reDownload: 'دانلود دوباره', downloadFailed: 'دانلود ناموفق بود', downloadFailedToast: 'دانلود ناموفق بود، لطفا کنسول را بررسی کنید', downloadCanceledToast: 'دانلود لغو شد', downloaderTip: '* اگر دانلود ناموفق بود، به صورت دستی ذخیره کنید: راست کلیک -> ذخیره ویدیو با نام.<br>* اگر فایل خیلی بزرگ است (بیش از 200MB)، ذخیره دستی توصیه می شود.' },
    hi: { startDownload: 'डाउनलोड शुरू करें', cancelDownload: 'डाउनलोड रद्द करें', downloadProgress: 'डाउनलोड प्रगति:', downloadCompleted: 'डाउनलोड पूरा हुआ', downloadCompletedToast: 'डाउनलोड पूरा हुआ!', reDownload: 'फिर से डाउनलोड करें', downloadFailed: 'डाउनलोड असफल रहा', downloadFailedToast: 'डाउनलोड असफल रहा, कृपया कंसोल जांचें', downloadCanceledToast: 'डाउनलोड रद्द कर दिया गया', downloaderTip: '* यदि डाउनलोड असफल हो, मैन्युअली सेव करें: राइट क्लिक -> वीडियो को इस नाम से सेव करें.<br>* यदि फाइल बहुत बड़ी है (200MB से अधिक), मैन्युअल सेव करना सुझाया जाता है.' },
    ms: { startDownload: 'Mula muat turun', cancelDownload: 'Batal muat turun', downloadProgress: 'Kemajuan muat turun:', downloadCompleted: 'Muat turun selesai', downloadCompletedToast: 'Muat turun selesai!', reDownload: 'Muat turun semula', downloadFailed: 'Muat turun gagal', downloadFailedToast: 'Muat turun gagal, sila semak konsol', downloadCanceledToast: 'Muat turun dibatalkan', downloaderTip: '* Jika muat turun gagal, simpan secara manual: klik kanan -> Simpan video sebagai.<br>* Jika fail terlalu besar (lebih 200MB), simpan secara manual adalah disyorkan.' },
    'zh-CN': { startDownload: '开始下载', cancelDownload: '取消下载', downloadProgress: '下载进度：', downloadCompleted: '下载完成', downloadCompletedToast: '下载完成！', reDownload: '重新下载', downloadFailed: '下载失败', downloadFailedToast: '下载失败，请查看控制台', downloadCanceledToast: '下载已取消', downloaderTip: '* 如果下载失败，请手动保存：鼠标右键 -> 视频另存为。<br>* 如果文件太大(200MB)以上，推荐使用手动保存。' },
    'zh-TW': { startDownload: '開始下載', cancelDownload: '取消下載', downloadProgress: '下載進度：', downloadCompleted: '下載完成', downloadCompletedToast: '下載完成！', reDownload: '重新下載', downloadFailed: '下載失敗', downloadFailedToast: '下載失敗，請查看控制台', downloadCanceledToast: '下載已取消', downloaderTip: '* 如果下載失敗，請手動儲存：滑鼠右鍵 -> 影片另存為。<br>* 如果檔案太大(200MB)以上，建議使用手動儲存。' }
  };

  /* ------------------------------------------------------------------ */
  /* 直接媒体文件下载                                                     */
  /* ------------------------------------------------------------------ */
  var MEDIA_HOSTS = [
    /googlevideo\.com/, /tiktokcdn\.com/, /douyinvod\.com/, /fbcdn\.net/, /video\.twimg\.com/,
    /zjcdn\.com/, /snssdk\.com/, /tiktokv\.com/, /douyinstatic\.com/, /twimg\.com/, /xhscdn\.com/,
    /amemv\.com/, /tikwm\.com/, /tiktokcdn-eu\.com/, /tiktokcdn-us\.com/, /douyinpic\.com/,
    /douyinmusicpromotion\.com/, /cdninstagram\.com/, /ted\.com/, /licdn\.com/, /sc-cdn\.net/,
    /pinimg\.com/, /tedcdn\.com/, /dmcdn\.net/, /tumblr\.com/, /rutube\.ru/, /uma\.media/
  ];

  var TYPE_EXTENSIONS = {
    'audio/mpeg': 'mp3', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm',
    'audio/aac': 'aac', 'audio/flac': 'flac', 'audio/x-wav': 'wav', 'audio/x-ms-wma': 'wma',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mov',
    'video/x-msvideo': 'avi', 'video/x-ms-wmv': 'wmv', 'video/mpeg': 'mpeg', 'video/3gpp': '3gp',
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'image/svg+xml': 'svg', 'image/bmp': 'bmp', 'image/tiff': 'tiff', 'image/x-icon': 'ico'
  };

  var Downloader = {
    currentRequest: null,
    doms: null,
    language: null,
    cssInjected: false,
    isMediaPage: function () {
      var host = window.location.host;
      var matched = MEDIA_HOSTS.some(function (rule) { return rule.test(host); });
      return matched && document.contentType !== 'text/html';
    },
    getFileExtension: function (url) {
      try {
        var source = document.querySelector('video source');
        var type = '';
        if (source instanceof HTMLSourceElement && (source.src || source.type)) {
          url = source.src || '';
          type = source.type || '';
        } else if (!source && document.querySelector('img')) {
          url = String(url || '');
        }
        var normalized = String(type).split(';')[0].trim().toLowerCase();
        if (normalized && TYPE_EXTENSIONS[normalized]) return TYPE_EXTENSIONS[normalized];
        if (!url) return null;
        var cleanUrl = String(url).split('?')[0].split('#')[0];
        var fileName = cleanUrl.split('/').pop();
        if (!fileName) return null;
        var match = fileName.match(/\.([a-zA-Z0-9]+)$/);
        return match ? match[1].toLowerCase() : null;
      } catch (error) {
        return null;
      }
    },
    generateFilename: function (url) {
      var ext = '';
      try {
        ext = new URL(String(url)).searchParams.get('____ext_') || '';
      } catch (err) {
        var match = String(url).match(/[?&]____ext_=([^&#]*)/);
        ext = match ? decodeURIComponent(match[1]) : '';
      }
      ext = String(ext).trim().toLowerCase().replace(/^\./, '');
      if (!ext || ext === 'unknown') ext = this.getFileExtension(url);
      ext = String(ext || '').trim().toLowerCase().replace(/^\./, '').replace(/[^a-z0-9]/g, '');
      if (!ext || ext === 'unknown') ext = 'mp4';
      return Date.now() + '.' + ext;
    },
    injectCss: function () {
      if (this.cssInjected) return;
      var id = 'clipsaver-media-style';
      if (document.getElementById(id)) { this.cssInjected = true; return; }
      var style = document.createElement('style');
      style.id = id;
      style.textContent = [
        '.clipsaver-gui { position: fixed; top: 20px; right: 20px; width: 250px; padding: 10px;',
        'background: rgba(0,0,0,0.8); color: #fff; font-family: Arial, sans-serif; border-radius: 8px;',
        'z-index: 99999; font-size: 15px; }',
        '.clipsaver-btn { width: 100%; padding: 6px 0; margin-bottom: 6px; color: #fff; border: none;',
        'border-radius: 4px; cursor: pointer; }',
        '.clipsaver-download-btn { background: #1a73e8; }',
        '.clipsaver-cancel-btn { background: #e53935; display: none; }',
        '.clipsaver-progress-container { display: none; }',
        '.clipsaver-progress-label { margin-bottom: 6px; }',
        '.clipsaver-progress-wrap { background: #555; height: 10px; border-radius: 4px; overflow: hidden; }',
        '.clipsaver-progress-bar { width: 0%; height: 100%; background: #0f0; }',
        '.clipsaver-progress-text { margin-top: 4px; font-size: 12px; }',
        '.clipsaver-tip { font-size: 11px; margin-top: 10px; }',
        '.clipsaver-toast { font-size: 15px; position: fixed; top: 20px; left: 50%; transform: translateX(-50%);',
        'padding: 10px 20px; background: rgba(0,0,0,0.8); color: #fff; border-radius: 6px;',
        'font-family: Arial, sans-serif; z-index: 100000; opacity: 0; transition: opacity 0.3s ease; }'
      ].join('\n');
      (document.head || document.documentElement).appendChild(style);
      this.cssInjected = true;
    },
    showToast: function (message) {
      var mountNode = document.body || document.documentElement;
      if (!mountNode) return;
      this.injectCss();
      var toast = document.createElement('div');
      toast.className = 'clipsaver-toast';
      toast.textContent = message;
      mountNode.appendChild(toast);
      requestAnimationFrame(function () { toast.style.opacity = 1; });
      setTimeout(function () {
        toast.style.opacity = 0;
        setTimeout(function () { toast.remove(); }, 300);
      }, 2e3);
    },
    buildGui: function () {
      var mountNode = document.body || document.documentElement;
      if (!mountNode) return null;
      this.injectCss();
      var language = this.language;
      var gui = document.createElement('div');
      gui.className = 'clipsaver-gui';
      gui.innerHTML = [
        '<button class="clipsaver-btn clipsaver-download-btn" data-role="download-btn">' + language.startDownload + '</button>',
        '<button class="clipsaver-btn clipsaver-cancel-btn" data-role="cancel-btn">' + language.cancelDownload + '</button>',
        '<div class="clipsaver-progress-container" data-role="progress-container">',
        '<div class="clipsaver-progress-label">' + language.downloadProgress + '</div>',
        '<div class="clipsaver-progress-wrap"><div class="clipsaver-progress-bar" data-role="progress-bar"></div></div>',
        '<div class="clipsaver-progress-text" data-role="progress-text">0%</div></div>',
        '<div class="clipsaver-tip">' + language.downloaderTip + '</div>'
      ].join('');
      mountNode.appendChild(gui);
      return {
        gui: gui,
        downloadBtn: gui.querySelector('[data-role="download-btn"]'),
        cancelBtn: gui.querySelector('[data-role="cancel-btn"]'),
        progressContainer: gui.querySelector('[data-role="progress-container"]'),
        progressBar: gui.querySelector('[data-role="progress-bar"]'),
        progressText: gui.querySelector('[data-role="progress-text"]')
      };
    },
    setDownloadingState: function (doms) {
      doms.downloadBtn.style.display = 'none';
      doms.cancelBtn.style.display = 'block';
      doms.progressContainer.style.display = 'block';
      doms.progressBar.style.width = '0%';
      doms.progressText.textContent = '0%';
    },
    setIdleState: function (doms) {
      doms.progressContainer.style.display = 'none';
      doms.cancelBtn.style.display = 'none';
      doms.downloadBtn.style.display = 'block';
      doms.downloadBtn.textContent = this.language.reDownload;
    },
    startDownload: function () {
      var self = this;
      var doms = this.doms || this.buildGui();
      if (!doms) return false;
      if (this.currentRequest) return true;
      var url = window.location.href;
      var filename = this.generateFilename(url);
      var language = this.language;
      this.setDownloadingState(doms);
      try { window.XLoadPanel.log('info', 'download.start', { url: url }); } catch (e) {}
      this.currentRequest = GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        responseType: 'blob',
        onprogress: function (event) {
          if (event.lengthComputable) {
            var percent = (event.loaded / event.total * 100).toFixed(2);
            doms.progressBar.style.width = percent + '%';
            doms.progressText.textContent = percent + '% | ' + Utils.formatBytes(event.loaded) + '/' + Utils.formatBytes(event.total);
          }
        },
        onload: function (response) {
          if (response.status < 200 || response.status >= 300 || !response.response) {
            self.failDownload(new Error('Request failed with status ' + response.status));
            return;
          }
          var blob = response.response;
          var anchor = document.createElement('a');
          var objectUrl = URL.createObjectURL(blob);
          anchor.href = objectUrl;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 1e3);
          self.currentRequest = null;
          doms.progressBar.style.width = '100%';
          doms.progressText.textContent = language.downloadCompleted;
          self.showToast(language.downloadCompletedToast);
          self.setIdleState(doms);
          Panel.report('progress', { action: 'start_download', percent: 100 });
        },
        onerror: function (err) { self.failDownload(err); },
        onabort: function () { self.failDownload(new Error('Request aborted')); },
        ontimeout: function () { self.failDownload(new Error('Request timeout')); }
      });
      return true;
    },
    failDownload: function (err) {
      var doms = this.doms || this.buildGui();
      this.currentRequest = null;
      if (!doms) return;
      doms.progressText.textContent = this.language.downloadFailed;
      this.showToast(this.language.downloadFailedToast);
      this.setIdleState(doms);
      try { window.XLoadPanel.log('error', 'download.failed', { message: String(err && err.message || err) }); } catch (e) {}
    },
    cancelDownload: function () {
      if (!this.currentRequest) return false;
      this.currentRequest.abort();
      this.currentRequest = null;
      if (this.doms) {
        this.showToast(this.language.downloadCanceledToast);
        this.setIdleState(this.doms);
      }
      return true;
    },
    bindEvents: function (doms) {
      var self = this;
      doms.downloadBtn.addEventListener('click', function () { self.startDownload(); });
      doms.cancelBtn.addEventListener('click', function () { self.cancelDownload(); });
    },
    start: function () {
      if (!this.isMediaPage() || !Panel.config.enabled) return;
      this.language = MESSAGES[Utils.getLang()] || MESSAGES.en;
      this.doms = this.buildGui();
      if (!this.doms) return;
      this.bindEvents(this.doms);
    }
  };

  var ACTIONS = {
    start_download: function (data) {
      Panel.apply(data);
      Downloader.startDownload();
    },
    cancel_download: function (data) {
      Panel.apply(data);
      Downloader.cancelDownload();
    }
  };

  Downloader.start();

  (function connectPanel() {
    var key = 'panel-connect.' + PANEL_TASK;
    if (Store.get(key, false)) return;
    Store.set(key, true);
    Panel.open(ACTIONS);
  })();
}());
