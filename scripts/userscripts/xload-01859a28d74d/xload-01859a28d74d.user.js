// ==UserScript==
// @name       Bypass All Shortlinks
// @name:id    Bypass Semua Shortlink
// @name:ug    Bypass بارلىق قىسقا ئۇلىنىشلار
// @name:ar    تجاوز الجميع الروابط المختصرة
// @name:ja    バイパス 全て ショートリンク
// @name:he    לַעֲקוֹף את כל קישורים קצרים
// @name:hi    सभी शॉर्टलिंक को बायपास करें
// @name:ko    모든 짧은 링크 우회
// @name:th    บายพาส ทั้งหมด ลิงค์สั้น
// @name:nb    Omgå Alle Kortlenker
// @name:sv    Förbigå alla kortlänkar
// @name:sr    Zaobići Sve Kratke veze
// @name:sk    Obísť Všetky Krátke odkazy
// @name:hu    Bypass Összes Rövid linkek
// @name:ro    Bypass Toate Linkuri scurte
// @name:fi    Ohittaa Kaikki Lyhyet linkit
// @name:el    Παράκαμψη Ολα Σύντομοι σύνδεσμοι
// @name:eo    Pretervojo Ĉiuj Mallongaj ligiloj
// @name:it    Bypassare Tutto Collegamenti brevi
// @name:bg    Заобикаляне на всички кратки връзки
// @name:es    Saltarse Todos los Enlaces Acortados
// @name:cs    Obcházeč všech zkracovačů odkazů
// @name:vi    Bỏ qua Tất cả Các liên kết ngắn
// @name:pl    Bypass Wszystkie Krótkie linki
// @name:uk    Обхід всі Короткі посилання
// @name:ru    Обход Все Короткие ссылки
// @name:tr    Bypass Tüm Kısa Linkler
// @name:fr    Bypass Tout Lien courts
// @name:nl    Bypass Alle Korte links
// @name:da    Bypass Alle Shortlinks
// @name:de    Bypass Alle Kurzlinks
// @name:zh-cn 旁路 全部 短链接
// @name:zh-tw 旁路 全部 短鏈接
// @name:pt-br Bypass Todos Links curtos
// @name:fr-ca Bypass Tout Lien courts
// @namespace  Violentmonkey Scripts
// @run-at     document-start
// @author     Bloggerpemula
// @version    96.8
// @match      *://*/*
// @grant      GM_setValue
// @grant      GM_getValue
// @grant      GM_addStyle
// @grant      GM_openInTab
// @grant      GM_setClipboard
// @grant      GM_xmlhttpRequest
// @grant      window.onurlchange
// @grant      GM_registerMenuCommand
// @icon       https://i.ibb.co/qgr0H1n/BASS-Blogger-Pemula.png
// @require    https://update.greasyfork.org/scripts/528923/1588272/MonkeyConfig%20Mod.js
// @description    Bypass All Shortlinks Sites Automatically Skips Annoying Link Shorteners, Go Directly to Your Destination , Skip AdFly , Skip Annoying Ads, Block Adblock Detection , Block Annoying Popup And Prompts , Automatically Downloading Files , Flickr Images And Youtube Video And Much More
// @description:id Bypass Semua Situs Shortlink Secara Otomatis Melewati Pemendek Tautan yang Mengganggu, Langsung Menuju Tujuan Anda, Melewati AdFly, Melewati Iklan yang Mengganggu, Memblokir Deteksi Adblock, Memblokir Popup dan Prompt yang Mengganggu, Mengunduh File dan Video YouTube Secara Otomatis, dan Banyak Lagi
// @description:ug بارلىق قىسقا ئۇلىنىش تور بېكەتلىرىنى ئايلىنىپ ئۆتۈپ ، كىشىنى بىزار قىلىدىغان ئۇلىنىش قىسقارتقۇچلىرىنى ئاپتوماتىك ئاتلاڭ ، بىۋاسىتە مەنزىلىڭىزگە بېرىڭ ، AdFly دىن ئاتلاڭ ، كىشىنى بىزار قىلىدىغان ئېلانلارنى ئاتلاڭ ، توسۇشنى بايقاشنى چەكلەڭ ، كىشىنى بىزار قىلىدىغان كۆزنەك ۋە تەشۋىقاتلارنى توسىمىز ، ھۆججەت ۋە Youtube سىنلىرىنى ئاپتوماتىك چۈشۈرۈڭ.
// @description:ar تجاوز جميع مواقع الروابط المختصرة تلقائيًا وتخطي اختصارات الروابط المزعجة والانتقال مباشرة إلى وجهتك وتخطي AdFly وتخطي الإعلانات المزعجة وحظر اكتشاف Adblock وحظر النوافذ المنبثقة والمطالبات المزعجة وتنزيل الملفات ومقاطع فيديو YouTube تلقائيًا وغير ذلك الكثير
// @description:he עקיפת כל אתרי הקישורים הקצרים מדלגת אוטומטית על מקצרי קישורים מעצבנים, גולשת ישירות ליעד שלך, דלגת על AdFly, דלגת על פרסומות מעצבנות, חסימה של זיהוי חסימות פרסום, חסימה של חלונות קופצים והנחיות מעצבנות, הורדה אוטומטית של קבצים וסרטוני יוטיוב ועוד ועוד.
// @description:hi सभी शॉर्टलिंक साइटों को बायपास करें, स्वचालित रूप से कष्टप्रद लिंक शॉर्टनर्स को छोड़ दें, सीधे अपने गंतव्य पर जाएं, एडफ्लाई को छोड़ें, कष्टप्रद विज्ञापनों को छोड़ें, एडब्लॉक डिटेक्शन को ब्लॉक करें, कष्टप्रद पॉपअप और संकेतों को ब्लॉक करें, स्वचालित रूप से फ़ाइलें और यूट्यूब वीडियो डाउनलोड करना और बहुत कुछ
// @description:ja すべての短縮リンクサイトをバイパスし、迷惑なリンク短縮サービスを自動的にスキップし、目的地に直接移動し、AdFlyをスキップし、迷惑な広告をスキップし、Adblock検出をブロックし、迷惑なポップアップとプロンプトをブロックし、ファイルとYoutubeビデオを自動的にダウンロードし、その他多数
// @description:ko 모든 단축 링크 사이트를 자동으로 우회하고 귀찮은 링크 단축기를 건너뛰고 목적지로 바로 이동하고 AdFly를 건너뛰고 귀찮은 광고를 건너뛰고 광고 차단 감지를 차단하고 귀찮은 팝업 및 프롬프트를 차단하고 파일과 YouTube 비디오를 자동으로 다운로드하고 훨씬 더 많은 기능을 제공합니다.
// @description:th ข้ามไซต์ Shortlinks ทั้งหมด ข้ามตัวย่อลิงก์ที่น่ารำคาญโดยอัตโนมัติ ไปที่ปลายทางของคุณโดยตรง ข้าม AdFly ข้ามโฆษณาที่น่ารำคาญ บล็อกการตรวจจับการบล็อกโฆษณา บล็อกป๊อปอัปและคำเตือนที่น่ารำคาญ ดาวน์โหลดไฟล์และวิดีโอ YouTube โดยอัตโนมัติ และอื่น ๆ อีกมากมาย
// @description:eo Preteriri Ĉiujn Mallongigajn Retejojn Aŭtomate Preterlasas Ĝenajn Ligilo-Mallongigilojn, Iru Rekte al Via Celloko, Preterlasi AdFly, Preterlasi Ĝenajn Reklamojn, Bloki Reklamblokan Detekton, Bloki Ĝenajn Ŝprucfenestrojn kaj Promesojn, Aŭtomate Elŝuti Dosierojn kaj Youtube-Videojn kaj Multe Pli
// @description:de Umgehen Sie alle Shortlinks-Sites, überspringen Sie automatisch lästige Link-Verkürzer, gehen Sie direkt zu Ihrem Ziel, überspringen Sie AdFly, überspringen Sie lästige Anzeigen, blockieren Sie die Adblock-Erkennung, blockieren Sie lästige Popups und Eingabeaufforderungen, laden Sie automatisch Dateien und YouTube-Videos herunter und vieles mehr
// @description:tr Tüm Kısa Bağlantı Sitelerini Otomatik Olarak Atla Rahatsız Edici Bağlantı Kısaltıcılarını Atla, Doğrudan Hedefine Git, AdFly'ı Atla, Rahatsız Edici Reklamları Atla, Reklam Engelleme Algılamasını Engelle, Rahatsız Edici Açılır Pencereleri ve İstemleri Engelle, Dosyaları ve Youtube Videolarını Otomatik Olarak İndir ve Daha Fazlası
// @description:da Omgå alle shortlinks-sider. Springer automatisk irriterende linkforkortere over, gå direkte til din destination, spring AdFly over, spring irriterende annoncer over, blokerer Adblock-detektion, blokerer irriterende pop op-vinduer og prompts, downloader automatisk filer og YouTube-videoer og meget mere.
// @description:fr Contournez tous les sites de liens courts, ignorez automatiquement les raccourcisseurs de liens gênants, accédez directement à votre destination, ignorez AdFly, ignorez les publicités gênantes, bloquez la détection Adblock, bloquez les fenêtres contextuelles et les invites gênantes, téléchargez automatiquement des fichiers et des vidéos YouTube et bien plus encore
// @description:bg Заобикаля всички сайтове с кратки връзки. Автоматично пропуска досадни съкращаващи връзки, отива директно до вашата дестинация, пропуска AdFly, пропуска досадни реклами, блокира откриването на Adblock, блокира досадни изскачащи прозорци и подкани, автоматично изтегляне на файлове и YouTube видео и много други.
// @description:ro Omiteți toate site-urile cu linkuri scurte, omite automat scurtătoarele de linkuri enervante, mergeți direct la destinație, omiteți AdFly, omiteți reclamele enervante, blocați detectarea blocajelor de reclame, blocați ferestrele pop-up și solicitările enervante, descărcați automat fișiere și videoclipuri YouTube și multe altele
// @description:fi Ohita kaikki pikalinkkisivustot, ohita automaattisesti ärsyttävät linkkien lyhentäjät, siirry suoraan määränpäähäsi, ohita AdFly, ohita ärsyttävät mainokset, estä mainosten estäjän havaitsemisen, estä ärsyttävät ponnahdusikkunat ja kehotteet, lataa tiedostot ja YouTube-videot automaattisesti ja paljon muuta
// @description:it Bypass All Shortlinks Sites salta automaticamente i fastidiosi accorciatori di link, vai direttamente alla tua destinazione, salta AdFly, salta le pubblicità fastidiose, blocca il rilevamento di Adblock, blocca i fastidiosi popup e prompt, scarica automaticamente file e video di YouTube e molto altro
// @description:el Παράκαμψη όλων των ιστότοπων με σύντομες συνδέσεις, παρακάμπτει αυτόματα ενοχλητικούς συντομευτές συνδέσμων, πηγαίνει απευθείας στον προορισμό σας, παρακάμπτει το AdFly, παρακάμπτει ενοχλητικές διαφημίσεις, αποκλείει την ανίχνευση αποκλεισμού διαφημίσεων, αποκλείει ενοχλητικά αναδυόμενα παράθυρα και μηνύματα, κάνει αυτόματη λήψη αρχείων και βίντεο Youtube και πολλά άλλα
// @description:es Omite todos los sitios de enlaces cortos: omite automáticamente los acortadores de enlaces molestos, va directamente a su destino, omite AdFly, omite anuncios molestos, bloquea la detección de bloqueadores de anuncios, bloquea las ventanas emergentes y los avisos molestos, descarga automáticamente archivos y videos de YouTube y mucho más.
// @description:hu Megkerüli az összes rövid linkeket tartalmazó webhelyet, automatikusan kihagyja a bosszantó linkrövidítőket, közvetlenül a célállomásra ugrik, kihagyja az AdFly-t, kihagyja a bosszantó hirdetéseket, blokkolja az Adblock észlelését, blokkolja a bosszantó felugró ablakokat és üzeneteket, automatikusan letölti a fájlokat és a YouTube-videókat, és még sok mást.
// @description:nb Omgå alle nettsteder med korte lenker. Hopper automatisk over irriterende lenkeforkortere, gå direkte til destinasjonen din, hopp over AdFly, hopp over irriterende annonser, blokker annonseblokkeringsdeteksjon, blokker irriterende popup-vinduer og spørsmål, last ned filer og YouTube-videoer automatisk og mye mer.
// @description:sk Obíďte všetky stránky s krátkymi odkazmi, automaticky preskočí otravné skracovače odkazov, prejdite priamo na miesto určenia, preskočte AdFly, preskočte otravné reklamy, blokujte detekciu blokovania reklám, blokujte otravné vyskakovacie okná a výzvy, automaticky sťahujte súbory a videá z YouTube a oveľa viac.
// @description:sv Hoppa över alla korta länkar, hoppar automatiskt över irriterande länkförkortare, går direkt till din destination, hoppar över AdFly, hoppar över irriterande annonser, blockerar annonsblockeringsdetektering, blockerar irriterande popup-fönster och uppmaningar, laddar automatiskt ner filer och YouTube-videor och mycket mer.
// @description:sr Zaobiđi sve stranice s kratkim poveznicama, automatski preskače dosadne skraćivače poveznica, idi izravno na svoje odredište, preskoči AdFly, preskoči dosadne oglase, blokiraj otkrivanje blokatora oglasa, blokiraj dosadne skočne prozore i upite, automatski preuzima datoteke i YouTube videozapise i još mnogo toga
// @description:pl Omiń wszystkie witryny z krótkimi linkami, automatycznie pomijaj irytujące skracacze linków, przejdź bezpośrednio do celu, pomiń AdFly, pomiń irytujące reklamy, zablokuj wykrywanie Adblocka, zablokuj irytujące wyskakujące okienka i monity, automatycznie pobieraj pliki i filmy z YouTube i wiele więcej
// @description:nl Omzeil alle shortlinks Sites Sla automatisch vervelende linkverkorters over, Ga direct naar uw bestemming, Sla AdFly over, Sla vervelende advertenties over, Blokkeer Adblock-detectie, Blokkeer vervelende pop-ups en prompts, Download automatisch bestanden en YouTube-video's en nog veel meer
// @description:cs Obejde všechny stránky s krátkými odkazy, automaticky přeskakuje otravné zkracovače odkazů, přejde přímo k cíli, přeskakuje AdFly, přeskakuje otravné reklamy, blokuje detekci blokování reklam, blokuje otravná vyskakovací okna a výzvy, automaticky stahuje soubory a videa z YouTube a mnohem více.
// @description:uk Обхід усіх сайтів із короткими посиланнями: автоматично пропускає надокучливі скорочувачі посилань, переходить безпосередньо до місця призначення, пропускає AdFly, пропускає надокучливу рекламу, блокує виявлення блокувальників реклами, блокує надокучливі спливаючі вікна та підказки, автоматично завантажує файли та відео з Youtube та багато іншого.
// @description:ru Обход всех сайтов с короткими ссылками. Автоматически пропускает раздражающие сокращатели ссылок, переходит сразу к месту назначения, пропускает AdFly, пропускает раздражающую рекламу, блокирует обнаружение AdBlock, блокирует раздражающие всплывающие окна и подсказки, автоматически загружает файлы и видео с YouTube и многое другое.
// @description:vi Bỏ qua tất cả các trang web liên kết ngắn tự động bỏ qua các trình rút gọn liên kết gây phiền nhiễu, đi thẳng đến đích của bạn, bỏ qua AdFly, bỏ qua quảng cáo gây phiền nhiễu, chặn phát hiện Adblock, chặn cửa sổ bật lên và lời nhắc gây phiền nhiễu, tự động tải xuống tệp và video YouTube và nhiều hơn nữa
// @description:zh-cn 绕过所有短链接网站自动跳过烦人的链接缩短器，直接转到您的目的地，跳过 AdFly，跳过烦人的广告，阻止 Adblock 检测，阻止烦人的弹出窗口和提示，自动下载文件和 Youtube 视频等等
// @description:zh-tw 繞過所有短鏈接網站自動跳過煩人的鏈接縮短器，直接轉到您的目的地，跳過 AdFly，跳過煩人的廣告，阻止 Adblock 檢測，阻止煩人的彈出窗口和提示，自動下載文件和 Youtube 視頻等等
// @description:pt-br Ignore todos os sites Shortlinks automaticamente, ignore encurtadores de links irritantes, vá diretamente para o seu destino, ignore o AdFly, ignore anúncios irritantes, bloqueie a detecção de bloqueadores de anúncios, bloqueie pop-ups e prompts irritantes, baixe arquivos e vídeos do YouTube automaticamente e muito mais
// @description:fr-ca Contournez tous les sites de liens courts, ignorez automatiquement les raccourcisseurs de liens gênants, accédez directement à votre destination, ignorez AdFly, ignorez les publicités gênantes, bloquez la détection Adblock, bloquez les fenêtres contextuelles et les invites gênantes, téléchargez automatiquement des fichiers et des vidéos YouTube et bien plus encore
// @exclude /^(https?:\/\/)([^\/]+\.)?((cloudflare|github|aliyun|reddit|bing|yahoo|microsoft|whatsapp|amazon|ebay|payoneer|paypal|skrill|stripe|stripecdn|tipalti|wise|discord|tokopedia|taobao|taboola|aliexpress|netflix|citigroup|spotify|bankofamerica|hsbc|blogger|(accounts|studio).youtube|atlassian|pinterest|twitter|x|live|linkedin|fastbull|tradingview|deepseek|chatgpt|openai|grok|bilibili|indodax|bmcdn6|fbsbx|googlesyndication|amazon-adsystem|pubmatic|gstatic).com|(greasyfork|openuserjs|telegram|wikipedia|lichess).org|(doubleclick|yahoo).net|proton.me|stripe.network|meta.ai|codepen.io|(shopee|lazada|rakuten|maybank|binance).*|(dana|ovo|bca.co|bri.co|bni.co|bankmandiri.co|desa|(.*).go).id|(.*).(edu|gov))(\/.*)/
// @exclude /^https?:\/\/(?!(www\.google\.com\/(recaptcha\/|url)|docs\.google\.com\/|drive\.google\.com\/)).*google\..*/
// @exclude /^https?:\/\/([a-z0-9]+\.)*(facebook|instagram|tiktok)\.com\/(?!(flx\/warn\/|linkshim\/|link\/v2)).*/
// @downloadURL https://update.greasyfork.org/scripts/431691/Bypass%20All%20Shortlinks.user.js
// @updateURL https://update.greasyfork.org/scripts/431691/Bypass%20All%20Shortlinks.meta.js
// ==/UserScript==
// ================================================================================================================================================================
//                                          PLEASE READ SCRIPT INFO BEFORE USE
//                                      PLEASE RESPECT IF MY SCRIPTS USEFUL FOR YOU
//                      DON'T TRY TO COPY PASTE MY SCRIPTS THEN SHARE TO OTHERS LIKE YOU ARE THE CREATOR
//                 PLEASE DON'T REMOVE OR CHANGE MY BLOG, DISABLE YOUR ADBLOCK IN MY BLOG , THANKS FOR YOUR SUPPORT
//              My Blog is Very Important to give some Delay for safe away ,Track New Shortlinks , Broken Bypass etc...
// Thanks so much to @JustOlaf , @Konf , @hacker09 , @juansi , @NotYou , @cunaqr And @Rust1667 for Helping me , make my script even better
//                        Thanks so much to @varram for providing a Great Bypass Site bypass.city and adbypass.org
//                                And also Thank you to everyone who has Contributed with Good Feedback.
// =================================================================================================================================================================

(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Panel wiring constants
   * ------------------------------------------------------------------ */
  const PANEL_TASK = 'xload-01859a28d74d';
  const PANEL_URL = 'https://xload.net/scripts/userscripts/xload-01859a28d74d/panel.html';
  const BLOG_BASE = 'https://bloggerpemula.pythonanywhere.com';

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

  /* ------------------------------------------------------------------
   * User settings (MonkeyConfig menu)
   * ------------------------------------------------------------------ */
  const cfg = new MonkeyConfig({
    title: 'Additional AIO Bypass Settings',
    menuCommand: 'Open Bypass Settings',
    shadowWidth: '550px',
    shadowHeight: '275px',
    iframeWidth: '450px',
    iframeHeight: '200px',
    params: {
      BlogDelay: { label: 'Delay in My Blog', type: 'checkbox', default: false, column: 'right&top' },
      SetDelay: { label: '=', type: 'number', default: 5, column: 'right&top', inputWidth: '40px' },
      TimerFC: { label: 'Fast Timer', type: 'checkbox', default: false, column: 'left&top' },
      TDelay: { label: '=', type: 'number', default: 1000, column: 'left&top' },
      SameTab: { label: 'Open Links Same Tabs', type: 'checkbox', default: false, column: 'left' },
      RightFC: { label: 'Enable Context Menu', type: 'checkbox', default: false, column: 'left' },
      BlockFC: { label: 'Enable Always Ready', type: 'checkbox', default: false, column: 'left' },
      BlockPop: { label: 'Enable Popup Blocker', type: 'checkbox', default: false, column: 'left' },
      AntiDebug: { label: 'Enable Anti Debug & Log Cleared', type: 'checkbox', default: false, column: 'left' },
      YTShort: { label: 'Disable Youtube Short', type: 'checkbox', default: false, column: 'right' },
      Adblock: { label: 'Disable Adblock Detections', type: 'checkbox', default: false, column: 'right' },
      Prompt: { label: 'Disable Prompts & Notifications', type: 'checkbox', default: false, column: 'right' },
      Flickr: { label: 'Auto Save Images From Flickr', type: 'checkbox', default: false, column: 'right' },
      YTDown: { label: 'Auto Download Youtube Video', type: 'checkbox', default: false, column: 'right' }
    }
  });

  /* ------------------------------------------------------------------
   * Query engine + tiny DOM helpers
   * ------------------------------------------------------------------ */
  // bp() supports a small jQuery-like subset on top of querySelector(All):
  //   ":contains(\"text\")", ":innerText(\"text\")" and ":has(selector)".
  function bp(query, all = false) {
    const containsMatch = query.match(/:contains\("([^"]+)"\)$/);
    const innerTextMatch = query.match(/:innerText\("([^"]+)"\)$/);
    const hasMatch = query.match(/:has\(([^)]+)\)$/);

    let baseQuery = query;
    let text = null;
    let childSelector = null;
    let useInnerText = false;

    if (containsMatch) {
      baseQuery = query.replace(/:contains\("[^"]+"\)$/, '');
      text = containsMatch[1];
    } else if (innerTextMatch) {
      baseQuery = query.replace(/:innerText\("[^"]+"\)$/, '');
      text = innerTextMatch[1];
      useInnerText = true;
    } else if (hasMatch) {
      baseQuery = query.replace(/:has\([^)]+\)$/, '');
      childSelector = hasMatch[1];
    }

    const elements = Array.from(document.querySelectorAll(baseQuery));

    if (!text && !childSelector) return all ? elements : elements[0] || null;

    let filtered = elements;
    if (childSelector) {
      filtered = elements.filter(el => el.querySelector(childSelector));
    } else {
      const needle = text.toLowerCase();
      filtered = elements.filter(el => {
        const content = (useInnerText ? el.innerText : el.textContent).trim();
        return content.toLowerCase().includes(needle);
      });
    }
    return all ? filtered : filtered[0] || null;
  }

  const BpParams = new URLSearchParams(location.search);
  const elementExists = query => bp(query) !== null;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function fakeHidden() {
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
  }

  function redirect(url, blog = true) {
    location = blog && cfg.get('BlogDelay') ? BLOG_BASE + '/?BypassResults=' + url : url;
  }

  function setActiveElement(selector) {
    elementReady(selector).then(element => {
      const temp = element.tabIndex;
      element.tabIndex = 0;
      element.focus();
      element.tabIndex = temp;
    });
  }

  function elementReady(selector) {
    return new Promise(function (resolve) {
      let element = bp(selector);
      if (element) {
        resolve(element);
        return;
      }
      new MutationObserver(function (_, observer) {
        element = bp(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  function waitForElm(query, callback, maxWaitTime = 15, initialDelay = 5) {
    const startTime = Date.now();
    const maxWaitTimeMs = maxWaitTime * 1000;
    const initialDelayMs = initialDelay * 1000;
    setTimeout(() => {
      const observer = new MutationObserver(() => {
        if (elementExists(query)) {
          observer.disconnect();
          callback(bp(query));
        } else if (Date.now() - startTime >= maxWaitTimeMs + initialDelayMs) {
          observer.disconnect();
          BpNote(`Element ${query} not found within ${maxWaitTime + initialDelay} seconds`, 'warn');
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      if (elementExists(query)) {
        observer.disconnect();
        callback(bp(query));
      }
    }, initialDelayMs);
  }

  /* ------------------------------------------------------------------
   * Shared behaviour helpers
   * ------------------------------------------------------------------ */
  function SameTab() {
    Object.defineProperty(unsafeWindow, 'open', {
      value: function (url) {
        if (url) {
          location.href = url;
          BpNote(`Forced window.open to same tab: ${url}`);
        }
        return null;
      },
      writable: false,
      configurable: false
    });
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[target="_blank"]');
      if (target && target.href) {
        e.preventDefault();
        location.href = target.href;
        BpNote(`Redirected target="_blank" to same tab: ${target.href}`);
      }
    }, true);
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.target === '_blank' && form.action) {
        e.preventDefault();
        location.href = form.action;
        BpNote(`Redirected form target="_blank" to same tab: ${form.action}`);
      }
    }, true);
  }

  function ReadytoClick(selector, sleepTime = 0) {
    const events = ['mouseover', 'mousedown', 'mouseup', 'click'];
    const userEvents = ['mousemove', 'touchstart'];
    const selectors = selector.split(', ');
    if (selectors.length > 1) return selectors.forEach(ReadytoClick);

    if (sleepTime > 0) {
      return sleep(sleepTime * 1000).then(function () {
        ReadytoClick(selector, 0);
      });
    }

    userEvents.forEach(eventName => {
      document.dispatchEvent(new Event(eventName, { bubbles: true }));
    });

    elementReady(selector).then(function (element) {
      element.removeAttribute('disabled');
      element.removeAttribute('target');
      events.forEach(eventName => {
        element.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true }));
      });
    });
  }

  function BpNote(message, level = 'info', caller = 'BloggerPemula') {
    const timestamp = new Date().toLocaleTimeString();
    const context = window.self === window.top ? 'top' : 'iframe';
    const BpMessage = `[BASS V96.5] ${timestamp} [${context}] - ${level.toUpperCase()} From ${caller}: ${message}`;
    try { window.XLoadPanel.log(level, 'bass.note', { message, caller, context }); } catch (e) {}
    switch (level) {
      case 'warn': console.warn(BpMessage); break;
      case 'error': console.error(BpMessage); break;
      case 'debug': console.log(BpMessage); break;
      default: console.log(BpMessage);
    }
  }

  function EnableRCF() {
    if (CloudPS(true, true, false)) return;
    const events = ['contextmenu', 'copy', 'cut', 'paste', 'select', 'selectstart', 'dragstart', 'drop'];
    function preventDefaultActions(event) {
      event.stopPropagation();
    }
    events.forEach(function (eventName) {
      document.addEventListener(eventName, preventDefaultActions, true);
    });
  }

  function CloudPS(checkFrames = false, captchaSite = false, checkFlare = true) {
    if (checkFrames && window.self !== window.top) {
      BpNote('Bypass Function Canceled Because Iframe Detected ', 'info');
      return true;
    }
    if ((checkFlare && document.title === 'Just a moment...') || elementExists('.spacer-top.spacer.core-msg')) {
      BpNote('Bypass Function Canceled on Cloudflare Page ', 'info');
      return true;
    }
    if (captchaSite) {
      const captchaDomains = [/\.google\.com$/, /\.recaptcha\.net$/, /\.hcaptcha\.com$/, /\.cloudflare\.com$/];
      const host = location.host.toLowerCase();
      if (captchaDomains.some(regex => regex.test(host))) {
        BpNote('Bypass Function Canceled on This Sites', 'info');
        return true;
      }
    }
    return false;
  }

  function notify(txt, clicktocopy = false, clicktoclose = false, duration = cfg.get('SetDelay')) {
    const m = document.createElement('div');
    m.style.padding = '10px 20px';
    m.style.zIndex = 10000;
    m.style.position = 'fixed';
    m.style.width = '970px';
    m.style.top = '10px';
    m.style.transform = 'translateX(-50%)';
    m.style.left = '50%';
    m.style.fontFamily = 'Arial, sans-serif';
    m.style.fontSize = '16px';
    m.style.color = 'white';
    m.style.textAlign = 'center';
    m.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    m.style.boxSizing = 'border-box';
    m.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    m.style.cursor = 'pointer';

    const mainText = document.createElement('div');
    mainText.innerText = txt.replace('@', duration);
    m.appendChild(mainText);

    const actionText = document.createElement('span');
    actionText.style.position = 'absolute';
    actionText.style.right = '10px';
    actionText.style.bottom = '5px';
    actionText.style.fontSize = '12px';
    actionText.style.color = 'white';
    actionText.style.userSelect = 'none';
    if (clicktocopy) actionText.innerText = 'Click to Copy';
    else if (clicktoclose) actionText.innerText = 'Click to Close';
    m.appendChild(actionText);

    document.body.appendChild(m);
    m.addEventListener('click', () => {
      if (clicktocopy) {
        navigator.clipboard.writeText(txt.replace('@', duration)).then(() => {
          mainText.innerText = 'Copied to clipboard!';
          setTimeout(() => {
            document.body.removeChild(m);
            clearInterval(timerId);
          }, 1000);
        }).catch(err => console.error('Failed to copy text: ', err));
      }
      if (clicktoclose) {
        document.body.removeChild(m);
        clearInterval(timerId);
      }
    });
    const timerId = setInterval(() => {
      duration -= 1;
      if (duration <= 0) clearInterval(timerId);
      else mainText.innerText = txt.replace('@', duration);
    }, 1000);
  }

  function NoFocus() {
    if (CloudPS(true, true, false)) return;
    window.mouseleave = true;
    window.onmouseover = true;
    document.hasFocus = () => true;
    if (!Object.getOwnPropertyDescriptor(document, 'webkitVisibilityState')?.get) {
      Object.defineProperty(document, 'webkitVisibilityState', { get: () => 'visible', configurable: true });
    }
    if (!Object.getOwnPropertyDescriptor(document, 'visibilityState')?.get) {
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    }
    if (!Object.getOwnPropertyDescriptor(document, 'hidden')?.get) {
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    }
    const eventOptions = { capture: true, passive: true };
    const ensureVisibility = () => {
      if (document.hidden !== false) {
        Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
      }
    };
    ensureVisibility();
    window.addEventListener('focus', e => e.stopImmediatePropagation(), eventOptions);
    window.addEventListener('blur', e => e.stopImmediatePropagation(), eventOptions);
  }

  function CaptchaDone(callback, checkInterval = 1000) {
    if (CloudPS()) return;
    const win = unsafeWindow;
    if (typeof callback !== 'function') {
      BpNote('Callback harus berupa fungsi', 'error');
      return;
    }
    let intervalId;
    const checkCaptcha = () => {
      try {
        if (elementExists('.iconcaptcha-modal__body-checkmark')) {
          clearInterval(intervalId);
          callback();
          return;
        }
        if (elementExists("iframe[src^='https://newassets.hcaptcha.com']")) {
          if (win.hcaptcha && typeof win.hcaptcha.getResponse === 'function') {
            const response = win.hcaptcha.getResponse();
            if (response && response.length > 0) {
              clearInterval(intervalId);
              callback();
              return;
            }
          }
        }
        if (elementExists("input[name='cf-turnstile-response']")) {
          if (win.turnstile && typeof win.turnstile.getResponse === 'function') {
            const response = win.turnstile.getResponse();
            if (response && response.length > 0) {
              clearInterval(intervalId);
              callback();
              return;
            }
          }
        }
        if (elementExists("iframe[title='reCAPTCHA']")) {
          if (win.grecaptcha && typeof win.grecaptcha.getResponse === 'function') {
            const response = win.grecaptcha.getResponse();
            if (response && response.length > 0) {
              clearInterval(intervalId);
              callback();
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking captcha:', error);
      }
    };
    intervalId = setInterval(checkCaptcha, checkInterval);
  }

  function DebugLog() {
    if (CloudPS(true, true, true)) return;
    const STORAGE_KEY = 'protection_tracker';
    let attemptCount = GM_getValue(STORAGE_KEY, 0);
    if (attemptCount > 0) setTimeout(() => GM_setValue(STORAGE_KEY, 0), 60000);

    const SavedMethods = {
      output: BpNote,
      trace: typeof console.debug === 'function' ? console.debug : BpNote,
      alert: console.warn,
      notice: console.info,
      issue: console.error,
      grid: typeof console.table === 'function' ? console.table : BpNote,
      wipe: console.clear,
      funcBuilder: Function.prototype.constructor,
      makeElement: document.createElement
    };
    const limits = {
      grid: { max: 5, timeframe: 5000 },
      wipe: { max: 5, timeframe: 5000 },
      filteredOutput: { max: 5, timeframe: 5000 },
      blocker: { max: 1, timeframe: 15000, count: 0, timestamp: 0 }
    };

    function canReport(category) {
      const restriction = limits[category] || { count: 0 };
      if (restriction.stopped) return false;
      const currentTime = Date.now();
      restriction.timestamp = restriction.timestamp || currentTime;
      if (currentTime - restriction.timestamp > restriction.timeframe) {
        restriction.count = 0;
        restriction.timestamp = currentTime;
      }
      if (++restriction.count > restriction.max) {
        restriction.stopped = true;
        SavedMethods.alert(`Max limit hit for ${category}`);
        return false;
      }
      return true;
    }

    Object.defineProperty(window, 'onbeforeunload', { configurable: false, writable: false, value: null });

    ['output', 'trace', 'alert', 'notice', 'issue', 'grid'].forEach(method => {
      if (typeof SavedMethods[method] !== 'function') return;
      console[method] = new Proxy(SavedMethods[method], {
        apply: (target, context, params) => {
          const adjustedParams = params.map(item => {
            if (typeof item === 'function') return 'Hidden Function';
            if (typeof item !== 'object' || !item) return item;
            const attributes = Object.getOwnPropertyDescriptors(item);
            if (attributes.toString || 'get' in attributes) return 'Hidden Accessor';
            if (Array.isArray(item) && item.length === 50 && typeof item[0] === 'object') return 'Hidden BigArray';
            return item;
          });
          if (params.length - adjustedParams.filter(x => x === params[params.indexOf(x)]).length >= Math.max(params.length - 1, 1)) {
            if (!canReport('filteredOutput')) return;
          }
          return SavedMethods[method].apply(context, adjustedParams);
        }
      });
    });

    ['wipe'].forEach(method => {
      console[method] = () => canReport(method) && SavedMethods.alert(`Blocked ${method}`);
    });

    window.Function.prototype.constructor = new Proxy(SavedMethods.funcBuilder, {
      apply: (target, context, inputs) => {
        const codeText = inputs[0];
        if (codeText?.includes('debugger')) {
          attemptCount++;
          GM_setValue(STORAGE_KEY, attemptCount);
          if (canReport('blocker')) SavedMethods.alert(`Blocked debugger (count: ${attemptCount})`);
          if (attemptCount > 100) {
            GM_setValue(STORAGE_KEY, 0);
            throw new Error('Debugger overload detected');
          }
          setTimeout(() => GM_setValue(STORAGE_KEY, Math.max(0, attemptCount - 1)), 1);
          inputs[0] = codeText.replaceAll('debugger', '');
        }
        return target.apply(context, inputs);
      }
    });

    document.createElement = new Proxy(SavedMethods.makeElement, {
      apply: (target, context, args) => {
        const newNode = target.apply(context, args);
        if (args[0].toLowerCase() === 'iframe') {
          newNode.addEventListener('load', () => {
            try {
              newNode.contentWindow.console = { ...console };
              newNode.contentWindow.Function.prototype.constructor = window.Function.prototype.constructor;
            } catch (err) {}
          });
        }
        return newNode;
      }
    });

    Object.keys(SavedMethods).forEach(method => {
      if (method in console) Object.defineProperty(console, method, { configurable: false, writable: false });
    });

    if (cfg.get('AntiDebug')) {
      const baseTiming = performance.now;
      BpNote('Performance Modified For Anti-Debug Protection');
      performance.now = () => baseTiming() + Math.random() * 2;
    }
  }

  function CheckVisibility(selector, operatorOrCallback, textCondition, callback, actionOnVisible = true) {
    if (CloudPS()) return;

    function isElementVisible(elem) {
      if (!elem) return false;
      if (!elem.offsetHeight && !elem.offsetWidth) return false;
      if (getComputedStyle(elem).visibility === 'hidden') return false;
      return true;
    }

    function checkTextCondition(condition) {
      try {
        const conditionParts = condition.split(/(==|!=)/);
        if (conditionParts.length !== 3) {
          console.error('Invalid text condition format:', condition);
          return false;
        }
        const selectorPart = conditionParts[0].trim();
        const sel = selectorPart.replace("bp('", '').replace("').innerText", '').trim();
        const expectedValue = conditionParts[2].trim().replace(/['"]/g, '');
        const elem = bp(sel);
        if (!elem) return false;
        const actualValue = elem.innerText.trim();
        if (conditionParts[1].trim() === '==') return actualValue.includes(expectedValue);
        if (conditionParts[1].trim() === '!=') return !actualValue.includes(expectedValue);
        return false;
      } catch (error) {
        console.error('Error evaluating text condition:', error);
        return false;
      }
    }

    if (typeof operatorOrCallback === 'function') {
      const callbackFn = operatorOrCallback;
      const checkInterval = 1000;
      const intervalId = setInterval(() => {
        try {
          const isVisible = isElementVisible(bp(selector));
          if ((actionOnVisible && isVisible) || (!actionOnVisible && !isVisible)) {
            clearInterval(intervalId);
            callbackFn();
          }
        } catch (error) {
          console.error('Error checking visibility:', error);
        }
      }, checkInterval);
    } else if (typeof operatorOrCallback === 'string' && (operatorOrCallback === '&&' || operatorOrCallback === '||')) {
      const operator = operatorOrCallback;
      const checkInterval = 1000;
      const intervalId = setInterval(() => {
        try {
          const isVisible = isElementVisible(bp(selector));
          const isTextConditionMet = checkTextCondition(textCondition);
          if ((operator === '&&' && isVisible && isTextConditionMet) ||
              (operator === '||' && (isVisible || isTextConditionMet))) {
            clearInterval(intervalId);
            callback();
          }
        } catch (error) {
          console.error('Error checking visibility and text condition:', error);
        }
      }, checkInterval);
    } else {
      console.error('Parameter tidak valid.');
    }
  }

  function TrustMe() {
    if (CloudPS(true, true, true)) return;
    const sandbox = new Proxy(window, {
      get(target, key) {
        if (key === 'Object') {
          return new Proxy(Object, {
            get(objTarget, objKey) {
              if (objKey === 'freeze') {
                return function (obj) {
                  BpNote('Object.freeze disabled in sandbox.', 'warn');
                  return obj;
                };
              }
              return Reflect.get(objTarget, objKey);
            }
          });
        }
        return Reflect.get(target, key);
      }
    });

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'message' || typeof listener !== 'function') {
        return originalAddEventListener.call(this, type, listener, options);
      }
      const wrappedListener = function (event) {
        let clonedEvent;
        try {
          if (event instanceof MessageEvent) {
            clonedEvent = new MessageEvent(event.type, {
              data: event.data,
              origin: event.origin,
              source: event.source,
              lastEventId: event.lastEventId,
              ports: event.ports,
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed
            });
          } else if (event instanceof MouseEvent) {
            clonedEvent = new MouseEvent(event.type, {
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed,
              clientX: event.clientX,
              clientY: event.clientY,
              button: event.button,
              buttons: event.buttons,
              target: event.target,
              currentTarget: event.currentTarget,
              relatedTarget: event.relatedTarget
            });
          } else if (event instanceof KeyboardEvent) {
            clonedEvent = new KeyboardEvent(event.type, {
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed,
              key: event.key,
              code: event.code,
              ctrlKey: event.ctrlKey,
              shiftKey: event.shiftKey,
              altKey: event.altKey,
              metaKey: event.metaKey
            });
          } else {
            clonedEvent = new Event(event.type, {
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              composed: event.composed
            });
            ['target', 'currentTarget', 'eventPhase', 'timeStamp'].forEach(prop => {
              if (event[prop] !== undefined) {
                Object.defineProperty(clonedEvent, prop, { value: event[prop], writable: true, configurable: true });
              }
            });
          }
          clonedEvent = new Proxy(clonedEvent, {
            get(target, prop) {
              if (prop === 'isTrusted') return true;
              return Reflect.get(target, prop);
            }
          });
        } catch (e) {
          BpNote(`Failed to clone event: ${e.message}`, 'error');
          return listener.call(this, event);
        }
        return listener.call(this, clonedEvent);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    };
    return sandbox;
  }

  function NoPrompts() {
    let timeoutInterval = 1000;
    unsafeWindow.onbeforeunload = null;
    timeoutInterval = (timeoutInterval + timeoutInterval) || 1000;
    setTimeout(NoPrompts, timeoutInterval);
    window.alert = () => {};
    window.confirm = () => true;
    window.prompt = () => null;
    if (window.Notification) {
      Notification.requestPermission = () => Promise.resolve('denied');
      Object.defineProperty(window, 'Notification', { value: null, writable: false });
    }
    if (document.readyState !== 'loading' && document.body) {
      bp('[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"], [class*="banner"], [id*="banner"], [class*="gdpr"], [id*="gdpr"], [class*="privacy"], [id*="privacy"], [role="dialog"], [aria-label*="cookie"], [aria-label*="consent"], [aria-label*="privacy"], [class*="notice"], [id*="notice"]', true)
        .forEach(banner => {
          if (banner.textContent.match(/cookie|consent|tracking|gdpr|privacy|accept|agree|decline|manage|preferences/i)) {
            banner.style.display = 'none';
            banner.remove();
          }
        });
    }
  }

  function BoostTimers(targetDelay) {
    if (CloudPS(true, true, true)) return;
    const limits = {
      setTimeout: { max: 1, timeframe: 5000, count: 0, timestamp: 0 },
      setInterval: { max: 1, timeframe: 5000, count: 0, timestamp: 0 }
    };
    function canLog(type) {
      const restriction = limits[type];
      const currentTime = Date.now();
      if (currentTime - restriction.timestamp > restriction.timeframe) {
        restriction.count = 0;
        restriction.timestamp = currentTime;
      }
      return ++restriction.count <= restriction.max;
    }
    const wrapTimer = (orig, type) => (func, delay, ...args) =>
      orig(func, (typeof delay === 'number' && delay >= targetDelay) ? (canLog(type) && BpNote(`[BoostTimers] Accelerated ${type} from ${delay}ms to ${targetDelay}ms`), 50) : delay, ...args);
    try {
      Object.defineProperties(unsafeWindow, {
        setTimeout: { value: wrapTimer(unsafeWindow.setTimeout, 'setTimeout'), writable: true, configurable: true },
        setInterval: { value: wrapTimer(unsafeWindow.setInterval, 'setInterval'), writable: true, configurable: true }
      });
    } catch (e) {
      const proxyTimer = (orig, type) => new Proxy(orig, {
        apply: (t, _, a) => t(a[0], (typeof a[1] === 'number' && a[1] >= targetDelay) ? (canLog(type) && BpNote(`[BoostTimers] Accelerated ${type} from ${a[1]}ms to ${targetDelay}ms`), 50) : a[1], ...a.slice(2))
      });
      unsafeWindow.setTimeout = proxyTimer(unsafeWindow.setTimeout, 'setTimeout');
      unsafeWindow.setInterval = proxyTimer(unsafeWindow.setInterval, 'setInterval');
    }
  }

  function AIORemover(action, target = null, attributes = null) {
    switch (action) {
      case 'removeRef': {
        delete document.referrer;
        document.__defineGetter__('referrer', () => target || '');
        BpNote('Referrer removed or set to:', target || 'empty');
        break;
      }
      case 'removeBp': {
        if (!target) {
          BpNote('Selector is required for removeBp action.', 'error');
          return;
        }
        bp(target, true).forEach(element => element.remove());
        BpNote(`Elements with selector "${target}" removed.`);
        break;
      }
      case 'delCookie': {
        if (!target) {
          BpNote('Cookie name is required for delCookie action.', 'error');
          return;
        }
        document.cookie = `${target}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        BpNote(`Cookie "${target}" deleted.`);
        break;
      }
      case 'removeAttr': {
        if (!target || !attributes) {
          BpNote('Selector and attributes are required for removeAttr action.', 'error');
          return;
        }
        const attrs = Array.isArray(attributes) ? attributes : [attributes];
        const validAttrs = ['onclick', 'class', 'target', 'id'];
        const invalidAttrs = attrs.filter(a => !validAttrs.includes(a));
        if (invalidAttrs.length) {
          BpNote(`Invalid attributes: ${invalidAttrs.join(', ')}`, 'error');
          return;
        }
        const attrElements = bp(target, true);
        if (!attrElements.length) {
          BpNote(`No elements found for selector "${target}"`, 'error');
          return;
        }
        attrElements.forEach(element => {
          attrs.forEach(attr => element.removeAttribute(attr));
        });
        BpNote(`Attributes ${attrs.join(', ')} Removed`);
        break;
      }
      case 'noAdb': {
        let blockPattern;
        let allowedDomains = null;
        if (target instanceof RegExp) {
          blockPattern = target;
        } else if (target && target.blockPattern) {
          blockPattern = target.blockPattern;
          allowedDomains = target.allowedDomains || null;
        } else {
          BpNote('blockPattern is required for noAdb action.', 'error');
          return;
        }
        const currentDomain = window.location.hostname;
        if (allowedDomains && !allowedDomains.test(currentDomain)) {
          BpNote(`NoAdb: Domain ${currentDomain} not allowed.`, 'info');
          return;
        }
        const regAdb = new RegExp(blockPattern);
        new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME') {
                const source = node.src || node.textContent || '';
                if (regAdb.test(source)) node.remove();
              }
            });
          });
        }).observe(document, { childList: true, subtree: true });
        bp('script, iframe', true).forEach(element => {
          const source = element.src || element.textContent || '';
          if (regAdb.test(source)) element.remove();
        });
        BpNote(`NoAdb: Initialized blocking for pattern "${blockPattern}".`);
        break;
      }
      default:
        BpNote('Invalid action. Use Existing Cases', 'error');
    }
  }

  function DoIfExists(query, actionOrTime = 'click', timeInSecOrFuncName = 1, funcName = 'setTimeout') {
    let action = 'click';
    let time = 1;
    let timerFuncName = 'setTimeout';

    if (typeof actionOrTime === 'number') {
      time = actionOrTime;
      timerFuncName = typeof timeInSecOrFuncName === 'string' ? timeInSecOrFuncName : 'setTimeout';
    } else if (typeof actionOrTime === 'string') {
      action = actionOrTime;
      time = typeof timeInSecOrFuncName === 'number' ? timeInSecOrFuncName : 1;
      timerFuncName = typeof funcName === 'string' ? funcName : 'setTimeout';
    }

    function GetForm(FormName) {
      const forms = document.forms;
      for (let i = 0; i < forms.length; i++) {
        if (FormName === 'mdn') {
          const form = forms[i].innerHTML;
          if (form.includes('Step')) return forms[i];
        } else if (FormName === 'Allin1') {
          const bait = forms[i].action;
          if (/bypass.html|adblock.html/.test(bait)) continue;
          return forms[i];
        }
      }
      return null;
    }

    let element;
    if (query === 'mdn' || query === 'Allin1') element = GetForm(query);
    else element = bp(query);

    if (!element) {
      BpNote(`Elemen "${query}" tidak ditemukan.`, 'error');
      return;
    }
    if (typeof element[action] !== 'function') {
      BpNote(`Elemen "${query}" tidak memiliki metode "${action}".`, 'error');
      return;
    }
    if (timerFuncName !== 'setTimeout' && timerFuncName !== 'setInterval') {
      BpNote('Timer tidak valid. Gunakan "setTimeout" atau "setInterval".', 'error');
      return;
    }

    const timerFunc = window[timerFuncName];
    if (timerFuncName === 'setTimeout') {
      timerFunc(() => {
        try {
          element[action]();
          BpNote(`Aksi "${action}" berhasil dijalankan pada elemen "${query}".`);
        } catch (error) {
          console.error(`Aksi "${action}" Gagal pada elemen "${query}":`, error);
        }
      }, time * 1000);
    } else {
      const intervalId = timerFunc(() => {
        try {
          if (elementExists(query)) {
            const currentElement = bp(query);
            currentElement[action]();
            BpNote(`Aksi "${action}" berhasil dijalankan pada elemen "${query}".`);
          } else {
            BpNote(`Elemen "${query}" tidak ditemukan.`, 'error');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error(`Aksi "${action}" Gagal pada elemen "${query}":`, error);
          clearInterval(intervalId);
        }
      }, time * 1000);
      BpNote(`Interval ID: ${intervalId}`);
    }
  }

  function BypassedByBloggerPemula(match, exclude, data, url = '', blog = false, all = false) {
    if (CloudPS()) return;

    if (typeof exclude === 'function') {
      data = exclude;
      exclude = null;
      url = '';
      blog = false;
      all = false;
    }
    if (!new RegExp(match).test(location.host)) return;
    if (exclude && new RegExp(exclude).test(location.host)) {
      BpNote(`Domain ${location.host} Excluded`, 'info');
      return;
    }

    if (typeof data === 'function') {
      try {
        data();
      } catch (e) {
        BpNote(`Error executing function data: ${e.message}`, 'error');
      }
      return;
    }

    if (typeof data === 'string') {
      const params = data.split(',');
      if (params.every(p => BpParams.has(p.replace(/\+[0-9]+/, '')))) {
        const use = params[0];
        let value = all
          ? BpParams.getAll(use.replace(/\+[0-9]+/, '')).find(u => new RegExp(match).test(u))
          : BpParams.get(use.replace(/\+[0-9]+/, ''));
        if (!value || value.includes('st?')) value = extractFlexibleUrl(use);
        if (value) redirect(url + value, blog);
      } else {
        const value = extractFlexibleUrl(data);
        if (value) redirect(url + value, blog);
      }
      return;
    }

    let dataObj = data;
    if (Array.isArray(data)) dataObj = { '/': data };
    if (typeof dataObj !== 'object' || dataObj === null) {
      BpNote('Invalid data type: data must be a function, string, array, or object', 'error');
      return;
    }
    if (!(location.pathname in dataObj)) {
      BpNote(`Pathname ${location.pathname} not found in data`, 'info');
      return;
    }

    const [key, value] = dataObj[location.pathname];
    let finalValue = '';
    if (typeof key === 'object' && key.test(location.search)) {
      finalValue = value + RegExp.$1;
    } else if (BpParams.has(key)) {
      finalValue = value + BpParams.get(key);
    } else {
      finalValue = extractFlexibleUrl('url');
    }
    if (finalValue) redirect(url + finalValue, blog);

    function extractFlexibleUrl(dataString) {
      const currentUrl = window.location.href;
      const urlParams = currentUrl.split('&url=');
      if (urlParams.length < 2) {
        BpNote('Not enough URL parameters to extract', 'warn');
        return null;
      }
      let partsToTake = 1;
      if (dataString.match(/url\+(\d+)/)) partsToTake = parseInt(dataString.match(/url\+(\d+)/)[1]);
      if (partsToTake > urlParams.length - 1) {
        BpNote(`Requested parts (${partsToTake}) exceed available URL parameters (${urlParams.length - 1})`, 'warn');
        partsToTake = urlParams.length - 1;
      }
      let extractedUrl = '';
      if (partsToTake === 1) {
        extractedUrl = urlParams[urlParams.length - 1];
      } else {
        const startIndex = urlParams.length - partsToTake;
        extractedUrl = urlParams.slice(startIndex).join('&url=');
      }
      try {
        extractedUrl = decodeURIComponent(extractedUrl);
      } catch (e) {
        BpNote('Error decoding extracted URL: ' + e, 'error');
      }
      return extractedUrl;
    }
  }

  function BlockPopup() {
    const win = unsafeWindow;
    const originalOpen = win.open;

    function createNotification(url, callback) {
      const div = document.createElement('div');
      div.className = 'popup-notification';
      const shadow = div.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>:host { position: fixed; top: 15px; right: 15px; z-index: 9999; font-family: Arial, sans-serif; }.popup { background: #fff; border: 2px solid #333; padding: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); max-width: 350px; border-radius: 5px; }.title { font: bold 16px Arial; color: #000; margin-bottom: 10px; padding-right: 20px; position: relative; }.url { font-size: 14px; color: #222; word-break: break-all; background: #f5f5f5; padding: 8px; border-radius: 3px; margin-bottom: 15px; }.buttons { display: flex; gap: 10px; }
      button { font: bold 14px Arial; padding: 8px 15px; cursor: pointer; border: none; border-radius: 3px; transition: background 0.2s; }.allow { background: #4CAF50; color: #fff; } .allow:hover { background: #45a049; }.block { background: #f44336; color: #fff; } .block:hover { background: #da190b; }.whitelist { background: #2196F3; color: #fff; opacity: 0.6; cursor: not-allowed; }.reload { background: #FFC107; color: #000; } .reload:hover { background: #FFB300; }.close { position: absolute; top: 0; right: 0; background: none; border: none; font-size: 16px; cursor: pointer; color: #333; }.close:hover { color: #f44336; }
      </style><div class="popup"><div class="title">Popup Request<button class="close">✕</button></div><div class="url">${url || 'about:blank'}</div><div class="buttons"><button class="allow">Open</button><button class="whitelist" title="Sementara Belum Bisa di Gunakan">Whitelist</button><button class="block">Block</button><button class="reload">Reload</button></div></div>`;
      const remove = () => div.remove();
      shadow.querySelector('.allow').onclick = () => { callback(true); remove(); };
      shadow.querySelector('.block').onclick = () => { callback(false); remove(); };
      shadow.querySelector('.reload').onclick = () => { win.location.reload(); remove(); };
      shadow.querySelector('.close').onclick = () => { callback(false); remove(); };
      bp('.popup-notification')?.remove();
      document.body.appendChild(div);
    }

    win.open = (url, name, features) => new Promise(resolve =>
      createNotification(url, shouldOpen =>
        resolve(shouldOpen ? originalOpen(url, name, features) : (BpNote(`Blocked popup to: ${url}`), null))));

    document.addEventListener('click', e => {
      const target = e.target;
      if (target.tagName === 'A' && target.target === '_blank' && target.href) {
        e.preventDefault();
        createNotification(target.href, shouldOpen =>
          shouldOpen ? originalOpen(target.href) : BpNote(`Blocked onclick popup to: ${target.href}`));
      }
    }, true);

    document.addEventListener('submit', e => {
      const form = e.target;
      if (form.target === '_blank' && form.action) {
        e.preventDefault();
        createNotification(form.action, shouldOpen =>
          shouldOpen ? originalOpen(form.action) : BpNote(`Blocked form popup to: ${form.action}`));
      }
    }, true);
  }

  /* ------------------------------------------------------------------
   * Feature registry + panel bridge
   * ------------------------------------------------------------------ */
  function getRuntimeFeatures() {
    return [
      { panelId: 'enable-adblock', key: 'Adblock', log: 'Adblock Feature',
        action: () => AIORemover('noAdb', /adblock|AdbModel|AdblockReg|AntiAdblock|blockAdBlock|checkAdBlock|detectAnyAdb|detectAdBlock|justDetectAdb|FuckAdBlock|TestAdBlock|DisableDevtool|devtools/) },
      { panelId: 'disable-prompts', key: 'Prompt', log: 'Disable Prompts & Notifications',
        action: () => {
          const runNoPrompts = () => NoPrompts();
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runNoPrompts, { once: true });
          else runNoPrompts();
          new MutationObserver(runNoPrompts).observe(document, { childList: true, subtree: true });
        } },
      { panelId: 'force-same-tab', key: 'SameTab', log: 'SameTab', action: SameTab },
      { panelId: 'fast-timer', key: 'TimerFC', log: 'Fast Timer',
        action: (values = {}) => BoostTimers(Number(values['timer-delay'] || cfg.get('TDelay'))) },
      { panelId: 'anti-debug', key: 'AntiDebug', log: 'Anti-Debug', action: DebugLog },
      { panelId: 'keep-page-active', key: 'BlockFC', log: 'Focus Control', action: NoFocus },
      { panelId: 'enable-context-menu', key: 'RightFC', log: 'Right Click Control', action: EnableRCF },
      { panelId: 'popup-blocker', key: 'BlockPop', log: 'Popup Blocker', action: BlockPopup }
    ];
  }

  function panelValues(data) {
    return (data && typeof data === 'object' && data.values && typeof data.values === 'object') ? data.values : (data || {});
  }

  function buildPanelStatus() {
    const values = {};
    getRuntimeFeatures().forEach(({ panelId, key }) => { values[panelId] = !!cfg.get(key); });
    values['timer-delay'] = Number(cfg.get('TDelay')) || 1000;
    return { url: location.href, host: location.host, title: document.title, values };
  }

  function runSelectedFeatures(data = {}, source = 'panel') {
    if (CloudPS(true, true, true)) return [];
    const values = panelValues(data);
    const usePanelValues = Object.keys(values).some(key => key !== 'timer-delay');
    const activated = [];
    const errors = [];

    getRuntimeFeatures().forEach(feature => {
      const enabled = usePanelValues ? !!values[feature.panelId] : !!cfg.get(feature.key);
      if (!enabled) return;
      try {
        feature.action(values);
        activated.push(feature.log);
      } catch (error) {
        errors.push({ feature: feature.log, message: error && error.message ? error.message : String(error) });
      }
    });

    if (activated.length) BpNote(`Activated Features: ${activated.join(', ')}`, 'info', source);
    if (errors.length) {
      BpNote(`Feature errors: ${errors.map(e => e.feature).join(', ')}`, 'warn', source);
      window.XLoadPanel.log('warn', 'features.errors', { errors });
    }
    return activated;
  }

  // Wire every panel action id to a handler that reports progress/done/error.
  function bindPanelChannel(channel) {
    if (!channel || channel._bassBound) return channel;
    channel._bassBound = true;

    const reply = (type, handler) => channel.on(type, data => {
      try {
        channel.send('progress', { action: type, message: 'running' });
        const result = handler(data) || {};
        channel.send('done', { action: type, result });
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        window.XLoadPanel.log('error', 'panel.action.error', { type, message });
        channel.send('error', { action: type, message });
      }
    });

    reply('refresh-status', () => buildPanelStatus());
    reply('apply-page-helpers', data => ({ activated: runSelectedFeatures(data, 'XLoadPanel'), status: buildPanelStatus() }));
    reply('copy-current-url', () => {
      GM_setClipboard(location.href);
      return { copied: location.href };
    });
    reply('open-current-url', () => {
      GM_openInTab(location.href, false);
      return { opened: location.href };
    });
    return channel;
  }

  function openXLoadPanel() {
    const channel = bindPanelChannel(window.XLoadPanel.open(PANEL_URL, PANEL_TASK));
    channel.send('hello', {});
    window.XLoadPanel.log('info', 'panel.open', { url: PANEL_URL, taskId: PANEL_TASK });
    return channel;
  }

  // Auto-connect a channel so a panel opened from the site can reach this page.
  try {
    bindPanelChannel(window.XLoadPanel.channel(PANEL_TASK)).send('hello', {});
    GM_registerMenuCommand('Open Bypass Panel', openXLoadPanel);
  } catch (e) {
    window.XLoadPanel.log('warn', 'panel.menu.failed', { message: e && e.message ? e.message : String(e) });
  }

  /* ------------------------------------------------------------------
   * Site handlers
   * ------------------------------------------------------------------ */
  BypassedByBloggerPemula(/(bitwidgets|virtuous-tech|coinilium|adwarden).net|(bubblix|dailytech-news).eu|(biit|carfocus|blogfly|multimix).site|(newsminer|adwyn|coderun).uno|wii.si|(cryptics|uiio|kiit|liln|dailynewshub|nanolink).fun|cryptorealm.online/, () => {
    TrustMe();
    const OriginalMutationObserver = window.MutationObserver;
    window.MutationObserver = function (callback) {
      const stack = new Error().stack;
      if (/monitorSuspiciousAttributes/.test(stack)) {
        return { observe: () => {}, disconnect: () => {} };
      }
      return new OriginalMutationObserver(callback);
    };
    window.MutationObserver.prototype = OriginalMutationObserver.prototype;
  });

  BypassedByBloggerPemula(/(youtube|youtube-nocookie).com/, () => {
    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
    document.addEventListener('visibilitychange', e => e.stopImmediatePropagation(), true);

    const waitForEl = (sel, cb, t = 1e4) => {
      const start = Date.now();
      const check = () => {
        const elm = bp(sel);
        if (elm) return cb(elm);
        if (Date.now() - start > t) BpNote(`Timeout: ${sel}`, 'warn');
        else setTimeout(check, 500);
      };
      setTimeout(check, 1e3);
    };

    const showDownloadDialog = () => {
      if (bp('#dl-bp-dialog')) return;
      const dialog = document.createElement('div');
      dialog.id = 'dl-bp-dialog';
      const shadow = dialog.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>.dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 1000; width: 90%; max-width: 400px; text-align: center; }.input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }.btns { display: flex; gap: 10px; justify-content: center; }
      .btn { background: #ff0000; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; }.btn:hover { background: #cc0000; }.close { position: absolute; top: 10px; right: 10px; cursor: pointer; font-size: 20px; }</style><div class="dialog"><span class="close">X</span><h3>Download YouTube Video or Audio</h3><input class="input" type="text" value="${location.href}"><div class="btns"><button class="btn" id="video-btn">Video</button><button class="btn" id="audio-btn">Audio</button></div></div>`;
      document.body.appendChild(dialog);
      shadow.querySelector('.close').addEventListener('click', () => dialog.remove());
      shadow.querySelector('#video-btn').addEventListener('click', () => startDownload(shadow.querySelector('.input').value, 'video') && dialog.remove());
      shadow.querySelector('#audio-btn').addEventListener('click', () => startDownload(shadow.querySelector('.input').value, 'audio') && dialog.remove());
    };

    const startDownload = (url, type) => {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/shorts/')[1]?.split('?')[0];
      if (!videoId) return BpNote('Invalid video ID', 'warn');
      const downloadUrl = type === 'video'
        ? `${BLOG_BASE}/youtube/video/${videoId}`
        : `${BLOG_BASE}/youtube/audio/${videoId}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.click();
    };

    const addDownloadButton = () => waitForEl('ytd-subscribe-button-renderer', elm => {
      if (bp('#dl-bp-button')) return;
      elm.parentElement.style.cssText = 'display: flex; align-items: center; gap: 8px';
      elm.insertAdjacentHTML('afterend', '<button id="dl-bp-button" style="background: #ff0000; color: white; border: none; padding: 8px 12px; border-radius: 2px; cursor: pointer; font-size: 13px; line-height: 18px;">DL BP</button>');
      bp('#dl-bp-button').addEventListener('click', showDownloadDialog);
    });

    if (cfg.get('YTDown')) {
      addDownloadButton();
      document.addEventListener('yt-navigate-finish', addDownloadButton);
      document.addEventListener('yt-page-data-updated', addDownloadButton);
    }

    if (cfg.get('YTShort')) {
      const bypassShorts = () => {
        if (!location.pathname.startsWith('/shorts')) return;
        const vidId = location.pathname.split('/')[2];
        if (vidId) window.location.replace(`https://www.youtube.com/watch?v=${vidId}`);
      };
      bypassShorts();
      document.addEventListener('yt-navigate-start', bypassShorts);
    }
  });

  BypassedByBloggerPemula(/.*/, () => {
    runSelectedFeatures({}, 'startup');
  });

  // Injecting code from start and the end of document coded by @Konf
  if (['interactive', 'complete'].includes(document.readyState)) {
    onHtmlLoaded();
  } else {
    document.addEventListener('DOMContentLoaded', onHtmlLoaded);
  }

  function onHtmlLoaded() {
    const bas = (h => {
      const result = { isNotifyNeeded: false, redirectDelay: 0, link: undefined };
      switch (h.host) {
        case 'bloggerpemula.pythonanywhere.com':
          if (h.pathname === '/' && h.searchParams.has('BypassResults')) {
            result.link = decodeURIComponent(location.href.split('BypassResults=')[1].replace('&m=1', ''));
            result.redirectDelay = cfg.get('SetDelay');
            result.isNotifyNeeded = true;
            return result;
          }
          break;
        default:
          break;
      }
    })(new URL(location.href));

    if (bas) {
      const { isNotifyNeeded, redirectDelay, link } = bas;
      if (isNotifyNeeded) {
        notify('Please Wait You Will be Redirected to Your Destination in @ Seconds , Thanks');
      }
      setTimeout(() => { location.href = link; }, redirectDelay * 1000);
    }

    BypassedByBloggerPemula(/coinclix.co|coinhub.wiki|(vitalityvista|geekgrove).net/, () => {
      const $ = unsafeWindow.jQuery;
      const url = window.location.href;

      if (url.includes('go/')) {
        notify('Reload the Page , if the Copied Key is Different', false, true);
        sleep(1000).then(() => {
          const link = bp('p.mb-2:nth-child(2) > strong > a');
          const key = bp('p.mb-2:nth-child(3) > kbd > code') || bp('p.mb-2:nth-child(4) > kbd > code');
          if (link && key) {
            const keyText = key.textContent.trim();
            GM_setClipboard(keyText);
            GM_setValue('lastKey', keyText);
            GM_openInTab(link.href, false);
          } else {
            const p = Array.from(document.getElementsByTagName('p'))
              .find(el => el.textContent.toLowerCase().includes('step 1') && el.textContent.toLowerCase().includes('google'));
            if (p) {
              sleep(1000).then(() => {
                const t = p.textContent.toLowerCase();
                GM_openInTab(
                  t.includes('geekgrove') ? 'https://www.google.com/url?q=https://geekgrove.net'
                    : t.includes('vitalityvista') ? 'https://www.google.com/url?q=https://vitalityvista.net'
                      : t.includes('coinhub') ? 'https://www.google.com/url?q=https://coinhub.wiki'
                        : 'https://www.google.com/url?q=https://geekgrove.net',
                  false
                );
              });
            }
          }
        });
      }

      if (['geekgrove.net', 'vitalityvista.net', 'coinhub.wiki'].some(site => url.includes(site))) {
        ReadytoClick('a.btn:has(.mdi-check)', 2);
        ReadytoClick('#btnLinkStart', 2);
        CaptchaDone(() => { ReadytoClick('#btnLinkContinue'); });
        CheckVisibility('#btnLinkContinue', () => {
          if (!elementExists('.iconcaptcha-modal')) ReadytoClick('#btnLinkContinue');
          else ReadytoClick('.iconcaptcha-modal__body');
        });
        CheckVisibility('.alert-success.alert-inline.alert', () => { ReadytoClick('#btnLpcont'); });
        sleep(1000).then(() => {
          const input = bp('#linkInput.form-control');
          if (input) {
            input.value = GM_getValue('lastKey', '');
            sleep(1000).then(() => bp('.btn-primary.btn-ripple')?.click());
          }
          const observer = new MutationObserver((mutations, obs) => {
            const codeEl = bp('.link_code');
            if (codeEl) {
              const code = codeEl.textContent.trim();
              GM_setClipboard(code);
              $('#link_result_footer > div > div').text(`The Copied Code is / Kode yang tersalin adalah: ${code} , Please Paste the Code on the coinclix.co Site Manually / Silahkan Paste Kodenya di Situs coinclix.co secara manual`);
              obs.disconnect();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        });
      }
    });

    BypassedByBloggerPemula(/.*/, () => {
      if (CloudPS(true, true, true)) return;
      const List = ['lopteapi.com', '3link.co', 'exeygo.com', 'vuotlink.vip'];
      const $ = unsafeWindow.jQuery;
      if (elementExists('form[id=go-link]') && List.includes(location.host)) {
        ReadytoClick('a.btn.btn-success.btn-lg.get-link:not([disabled])', 3);
      } else if (elementExists('form[id=go-link]')) {
        $('form[id=go-link]').off('submit').on('submit', function (e) {
          e.preventDefault();
          const form = $(this);
          const url = form.attr('action');
          const pesan = form.find('button');
          const notforsale = $('.navbar-collapse.collapse');
          const blogger = $('.main-header');
          const pemula = $('.col-sm-6.hidden-xs');
          $.ajax({
            type: 'POST',
            url: url,
            data: form.serialize(),
            dataType: 'json',
            beforeSend: function (xhr) {
              pesan.attr('disabled', 'disabled');
              $('a.get-link').text('Bypassed by Bloggerpemula');
              const btn = '<button class="btn btn-default , col-md-12 text-center" onclick="javascript: return false;"><b>Thanks for using Bypass All Shortlinks Scripts and for Donations , Regards : Bloggerpemula</b></button>';
              notforsale.replaceWith(btn);
              blogger.replaceWith(btn);
              pemula.replaceWith(btn);
            },
            success: function (result, status, xhr) {
              let finalUrl = result.url;
              if (finalUrl.includes('swiftcut.xyz')) {
                finalUrl = finalUrl.replace(/[?&]i=[^&]*/g, '').replace(/[?]&/, '?').replace(/&&/, '&').replace(/[?&]$/, '');
                location.href = finalUrl;
              } else if (xhr.responseText.match(/(a-s-cracks.top|mdiskshortner.link|exashorts.fun|bigbtc.win|slink.bid|clockads.in)/)) {
                location.href = finalUrl;
              } else {
                redirect(finalUrl);
              }
            },
            error: function (xhr, status, error) {
              BpNote(`AJAX request failed: ${status} - ${error}`, 'error');
            }
          });
        });
      }
    });

    BypassedByBloggerPemula(/flickr.com/, () => {
      if (!cfg.get('Flickr')) return;

      function createDownloadLinks() {
        const finalizeContainer = (container, sizesLink) => {
          if (!container.children.length) return;
          const parent = sizesLink.parentElement;
          if (parent) parent.insertBefore(container, sizesLink);
          else document.body.appendChild(container);
          BpNote('The Image is Ready to Save', 'info');
        };

        waitForElm('a[href*="/sizes/"]', sizesLink => {
          if (!sizesLink) return BpNote('View all sizes link not found', 'error');
          GM_xmlhttpRequest({
            method: 'GET',
            url: sizesLink.href,
            onload: response => {
              try {
                const sizesDoc = new DOMParser().parseFromString(response.responseText, 'text/html');
                const sizeItems = sizesDoc.querySelectorAll('.sizes-list li ol li');
                if (!sizeItems.length) return BpNote('No size items found', 'warn');

                const container = document.createElement('div');
                container.style.cssText = 'background:white;border:1px solid #ccc;padding:10px;z-index:1000;margin-bottom:5px;position:relative';
                const header = document.createElement('div');
                header.textContent = 'Bloggerpemula Script';
                header.style.cssText = 'text-align:center;font-weight:bold;margin-bottom:0px;color:#333';
                container.appendChild(header);

                const closeButton = document.createElement('button');
                closeButton.textContent = 'X';
                closeButton.style.cssText = 'position:absolute;top:0px;right:0px;background:none;border:none;font-size:14px;cursor:pointer;color:#333';
                closeButton.onclick = () => container.remove();
                container.appendChild(closeButton);

                let processed = 0;
                sizeItems.forEach(item => {
                  const sizeLink = item.querySelector('a');
                  const sizeText = sizeLink ? sizeLink.textContent.trim() : item.textContent.trim();
                  const sizeName = `${sizeText} ${item.querySelector('small')?.textContent.trim() || ''}`;
                  const sizeUrl = sizeLink?.href;
                  if (!sizeUrl) {
                    processed++;
                    if (processed === sizeItems.length) finalizeContainer(container, sizesLink);
                    return;
                  }
                  GM_xmlhttpRequest({
                    method: 'GET',
                    url: sizeUrl,
                    onload: sizeResponse => {
                      try {
                        const sizeDoc = new DOMParser().parseFromString(sizeResponse.responseText, 'text/html');
                        const img = sizeDoc.querySelector('#allsizes-photo img[src]');
                        if (!img) return;
                        const saveLink = document.createElement('a');
                        saveLink.href = img.src;
                        saveLink.textContent = `Save ${sizeName}`;
                        saveLink.style.cssText = 'display:block;margin:5px 0';
                        saveLink.onclick = e => {
                          e.preventDefault();
                          GM_openInTab(img.src, { active: true });
                        };
                        container.appendChild(saveLink);
                      } catch (e) {}
                      processed++;
                      if (processed === sizeItems.length) finalizeContainer(container, sizesLink);
                    },
                    onerror: () => {
                      processed++;
                      if (processed === sizeItems.length) finalizeContainer(container, sizesLink);
                    }
                  });
                });
              } catch (e) {
                BpNote(`Error processing sizes page: ${e.message}`, 'error');
              }
            },
            onerror: () => BpNote('Failed to fetch sizes page', 'error')
          });
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createDownloadLinks, { once: true });
      } else {
        createDownloadLinks();
      }
    });

    BypassedByBloggerPemula(/bigbtc.win/, () => {
      CaptchaDone(() => { DoIfExists('#claimbutn'); });
      if (location.href.includes('/bonus')) DoIfExists('#clickhere', 3);
    });

    BypassedByBloggerPemula('(bitwidgets|virtuous-tech|coinilium|adwarden).net|(bubblix|dailytech-news).eu|(biit|carfocus|blogfly|multimix).site|(newsminer|adwyn|coderun).uno|wii.si|(cryptics|uiio|kiit|liln|dailynewshub|nanolink).fun|cryptorealm.online', () => {
      CheckVisibility('*:contains("Failed! Please reload")', () => {
        sleep(1000).then(() => { window.location.reload(); });
      });

      const $ = unsafeWindow.jQuery;
      elementReady('#clickMessage[style*="display: block"], clickMessage[style*="display:block"]').then(() => { fakeHidden(); });

      CheckVisibility('*:contains("Verified")', () => {
        const findVerify = () => Array.from(bp('*', true)).find(el => el.textContent.trim() === 'Continue' || 'Verify');
        const verifyElement = findVerify();
        if (verifyElement) {
          setTimeout(() => {
            $('*[type="button"]:contains("Continue")').click();
            $('*[type="button"]:contains("Verify")').click();
          }, 1000);
        }
      });

      const tano = window.location.href;
      if (['dailytech-news.eu', 'wii.si', 'bubblix.eu', 'bitwidgets.net', 'virtuous-tech.net', 'carfocus.site', 'multimix.site', 'coderun.uno', 'newsminer.uno', 'cryptics.fun', 'coinilium.net', 'uiio.fun', 'nanolink.fun', 'adwarden.net', 'adwyn.uno', 'biit.site', 'cryptorealm.online', 'dailynewshub.fun', 'kiit.fun', 'liln.fun'].some(tino => tano.includes(tino))) {
        CheckVisibility('#captcha-container', '&&', "bp('.mb-2').innerText == 'Verified'", () => ReadytoClick('button:contains("Verify")', 2));
        elementReady('#loadingDiv[style*="display:block"] button, #loadingDiv[style*="display: block"] button').then(ReadytoClick.bind(this, 'button', 2));
        elementReady('#clickMessage[style*="display: block"], clickMessage[style*="display:block"]').then(() => {
          setActiveElement('[data-placement-id="revbid-leaderboard"]');
          fakeHidden();
        });
      } else {
        CheckVisibility('text:contains("To Start")', () => {
          const textElement = bp('text:contains("To Start")');
          const buttonText = textElement.textContent.match(/Click\s+(\w+)\s+To Start/i)?.[1];
          if (!buttonText) return;
          const findButton = () => {
            const elements = bp('*', true);
            for (const el of elements) {
              if (el.textContent.trim() === buttonText) return el;
            }
            return null;
          };
          const buttonElement = findButton();
          if (buttonElement) {
            setTimeout(() => { $(buttonElement).click(); }, 2000);
          }
        });
      }
    });
  }
})();
