(function () {
  "use strict";

  var data = null;
  var LOCALE_KEY = "xload-release-locale";
  var SITE_UI = {
    en: {
      home: "Home", about: "About", language: "Language", auto: "Auto (browser)",
      homeTitle: "Home — xload",
      homeDescription: "Browse and search every browser userscript listed on xload. Filter by keyword and category, then install directly from GitHub.",
      homeIntro: "Every userscript in the catalog. Use the search, filters and sort to find what you need. New tools are added regularly.",
      filterType: "Filter by type", allTypes: "All types", keywordFilter: "Keyword filter",
      keywordPlaceholder: "Filter results by keyword…", sortOrder: "Sort order",
      mostPopular: "Most popular", newest: "Newest", nameAZ: "Name A–Z",
      noResults: "No results found. Try a different search or filter.", item: "item", items: "items",
      aboutTitle: "About xload",
      aboutDescription: "Learn what xload is, who it is for and how our downloads work. Every tool is open source and hosted on GitHub.",
      aboutIntro: "Making great browser tools easy to find, easy to trust and easy to install.",
      aboutLead: "xload is a catalog of userscripts, browser extensions and desktop tools that we either build ourselves or maintain as open-source projects. Our goal is simple: <strong>give people fast, free and safe access to powerful tools</strong> without shady download buttons, fake \"installers\" or bundled adware.",
      downloadsHeading: "How downloads work",
      downloadsLead: "We never store script or program files on our servers. Instead, every download button links directly to our <strong>official GitHub repository releases</strong>. This has three big benefits:",
      transparency: "<strong>Transparency</strong> — every line of code is public and auditable.",
      safety: "<strong>Safety</strong> — you always receive the official, signed release, never a third-party re-pack.",
      versioning: "<strong>Versioning</strong> — you can see update history, changelogs and releases at a glance.",
      audienceHeading: "Who is it for",
      audienceBody: "Power users, developers, students and anyone who wants to customize their web experience. Whether you want to save time on repetitive tasks, improve privacy, or just make websites look better, you will likely find a tool for it here.",
      valuesHeading: "Our values",
      openSource: "<strong>Open source first.</strong> If we build it, you can read it.",
      freeForever: "<strong>Free forever.</strong> No paywalls, no \"pro\" upsells hiding core features.",
      honestAds: "<strong>Independent and honest advertising.</strong> The site is supported by respectful Google ads, clearly labelled.",
      contactHeading: "Contact",
      contactBody: "Questions, feedback or a feature idea? Reach out via our <a href=\"/contact.html\">contact page</a>.",
      footerAbout: "About us", footerContact: "Contact", footerTypes: "Types", footerLegal: "Legal",
      privacyPolicy: "Privacy Policy", termsOfService: "Terms of Service", cookiePolicy: "Cookie Policy",
      rightsReserved: "All rights reserved.",
      downloadsNote: "Downloads are linked to our GitHub releases &mdash; we never host files directly."
    },
    "zh-CN": {
      home: "首页", about: "关于", language: "语言", auto: "自动（浏览器）",
      homeTitle: "首页 — xload",
      homeDescription: "浏览和搜索 xload 收录的浏览器用户脚本，按关键词和类别筛选，并从 GitHub 直接安装。",
      homeIntro: "浏览目录中的全部用户脚本。使用搜索、筛选和排序快速找到所需工具，我们也会持续添加新工具。",
      filterType: "按类型筛选", allTypes: "全部类型", keywordFilter: "关键词筛选",
      keywordPlaceholder: "按关键词筛选结果…", sortOrder: "排序方式",
      mostPopular: "最热门", newest: "最新", nameAZ: "名称 A–Z",
      noResults: "没有找到结果，请尝试其他搜索词或筛选条件。", item: "项", items: "项",
      aboutTitle: "关于 xload",
      aboutDescription: "了解 xload、它适合哪些用户以及下载方式。所有工具均开源并托管在 GitHub。",
      aboutIntro: "让优秀的浏览器工具更容易被发现、信任和安装。",
      aboutLead: "xload 是一个用户脚本、浏览器扩展和桌面工具目录，其中的项目由我们自行开发或作为开源项目维护。我们的目标很简单：<strong>让每个人都能快速、免费、安全地使用强大工具</strong>，远离可疑下载按钮、虚假“安装器”和捆绑广告软件。",
      downloadsHeading: "下载方式",
      downloadsLead: "我们不会在自己的服务器上存储脚本或程序文件。每个下载按钮都会直接链接到<strong>官方 GitHub 仓库的发行版本</strong>，这样做有三大好处：",
      transparency: "<strong>透明</strong> — 每一行代码都公开且可审查。",
      safety: "<strong>安全</strong> — 你获得的始终是官方签名版本，而不是第三方重新打包的文件。",
      versioning: "<strong>版本清晰</strong> — 更新历史、变更日志和发行版本一目了然。",
      audienceHeading: "适合谁使用",
      audienceBody: "适合高级用户、开发者、学生，以及所有希望自定义网页体验的人。无论你想减少重复操作、改善隐私，还是让网站更美观，都有机会在这里找到合适的工具。",
      valuesHeading: "我们的价值观",
      openSource: "<strong>开源优先。</strong>我们开发的内容，你都可以查看源码。",
      freeForever: "<strong>永久免费。</strong>没有付费墙，也不会用“专业版”隐藏核心功能。",
      honestAds: "<strong>独立、诚实的广告。</strong>网站由克制且标识清晰的 Google 广告提供支持。",
      contactHeading: "联系我们",
      contactBody: "有问题、反馈或功能建议？欢迎通过<a href=\"/contact.html\">联系页面</a>告诉我们。",
      footerAbout: "关于我们", footerContact: "联系我们", footerTypes: "分类", footerLegal: "法律",
      privacyPolicy: "隐私政策", termsOfService: "服务条款", cookiePolicy: "Cookie 政策",
      rightsReserved: "保留所有权利。",
      downloadsNote: "下载链接到我们的 GitHub 发行版 &mdash; 我们从不直接托管文件。"
    },
    "zh-TW": {
      home: "首頁", about: "關於", language: "語言", auto: "自動（瀏覽器）",
      homeTitle: "首頁 — xload",
      homeDescription: "瀏覽和搜尋 xload 收錄的瀏覽器使用者腳本，依關鍵字和類別篩選，並從 GitHub 直接安裝。",
      homeIntro: "瀏覽目錄中的全部使用者腳本。使用搜尋、篩選和排序快速找到所需工具，我們也會持續加入新工具。",
      filterType: "依類型篩選", allTypes: "全部類型", keywordFilter: "關鍵字篩選",
      keywordPlaceholder: "依關鍵字篩選結果…", sortOrder: "排序方式",
      mostPopular: "最熱門", newest: "最新", nameAZ: "名稱 A–Z",
      noResults: "找不到結果，請嘗試其他搜尋詞或篩選條件。", item: "項", items: "項",
      aboutTitle: "關於 xload",
      aboutDescription: "了解 xload、它適合哪些使用者以及下載方式。所有工具均開源並託管於 GitHub。",
      aboutIntro: "讓優秀的瀏覽器工具更容易被發現、信任和安裝。",
      aboutLead: "xload 是一個使用者腳本、瀏覽器擴充功能和桌面工具目錄，其中的專案由我們自行開發或作為開源專案維護。我們的目標很簡單：<strong>讓每個人都能快速、免費、安全地使用強大工具</strong>，遠離可疑下載按鈕、虛假「安裝程式」和綑綁廣告軟體。",
      downloadsHeading: "下載方式",
      downloadsLead: "我們不會在自己的伺服器上儲存腳本或程式檔案。每個下載按鈕都會直接連結到<strong>官方 GitHub 儲存庫的發行版本</strong>，這樣做有三大好處：",
      transparency: "<strong>透明</strong> — 每一行程式碼都公開且可審查。",
      safety: "<strong>安全</strong> — 你取得的始終是官方簽署版本，而不是第三方重新封裝的檔案。",
      versioning: "<strong>版本清楚</strong> — 更新歷史、變更記錄和發行版本一目了然。",
      audienceHeading: "適合誰使用",
      audienceBody: "適合進階使用者、開發者、學生，以及所有希望自訂網頁體驗的人。無論你想減少重複操作、改善隱私，還是讓網站更美觀，都有機會在這裡找到合適的工具。",
      valuesHeading: "我們的價值觀",
      openSource: "<strong>開源優先。</strong>我們開發的內容，你都可以查看原始碼。",
      freeForever: "<strong>永久免費。</strong>沒有付費牆，也不會用「專業版」隱藏核心功能。",
      honestAds: "<strong>獨立、誠實的廣告。</strong>網站由克制且標示清楚的 Google 廣告提供支持。",
      contactHeading: "聯絡我們",
      contactBody: "有問題、意見或功能建議？歡迎透過<a href=\"/contact.html\">聯絡頁面</a>告訴我們。",
      footerAbout: "關於我們", footerContact: "聯絡我們", footerTypes: "分類", footerLegal: "法律",
      privacyPolicy: "隱私政策", termsOfService: "服務條款", cookiePolicy: "Cookie 政策",
      rightsReserved: "保留所有權利。",
      downloadsNote: "下載連結到我們的 GitHub 發行版 &mdash; 我們從不直接託管檔案。"
    }
  };
  var activeSiteLocale = "en";

  /* ---------------- icons ---------------- */
  function icon(name) {
    var svgs = {
      puzzle: '<path d="M12 3v4l2 1-2 1v3h3l-1-2 1-2h4v4h-2v1h2v4h-2l1 2-1 2H9l2-4h-3V8l1-2-1-2h4zM5 5h4l-1 1v1H6v3h2v2H5l-1-1v-3l1-1V5z"/>',
      extension: '<path d="M3 3h18v18H3zM5 5v14h14V5H5zm3 3h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/>',
      app: '<path d="M5 3h6v6H5zm8 0h6v6h-6zM5 15h6v6H5zm8 0h6v6h-6z"/>',
      box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7zm2 2.5V16l7 3V12L5 9.5zm9 3V19l7-3V9.5L14 12.5zM4.6 6.5l7.4 3.3 7.4-3.3L12 3.2 4.6 6.5z"/>',
      download: '<path d="M12 3v10l3-3 1.4 1.4L12 16.8l-4.4-4.4L9 10l3 3V3h4a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2h4z"/>',
      star: '<path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4-4.7-4.6 6.5-.9L12 2.5z"/>',
      search: '<path d="M10 2a8 8 0 105.3 14l4.3 4.3 1.4-1.4-4.3-4.3A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/>',
      clock: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm-1 3v6l4.5 2.7.8-1.3-3.3-2V7h-2z"/>',
      code: '<path d="M8 6l-6 6 6 6 1.4-1.4L4.8 12l4.6-4.6L8 6zm8 0l6 6-6 6-1.4-1.4L19.2 12l-4.6-4.6L16 6z"/>',
      shield: '<path d="M12 3l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3zm0 2.3L6 7.6V12c0 3.7 2.3 6.4 6 7.7 3.7-1.3 6-4 6-7.7V7.6l-6-2.3z"/>'
    };
    var d = svgs[name] || svgs.box;
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' + d + "</svg>";
  }

  /* ---------------- utils ---------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  }
  function param(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function resolvedLocale(value) {
    if (value !== "auto") return SITE_UI[value] ? value : "en";
    var languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < languages.length; i++) {
      var name = String(languages[i]).replace(/_/g, "-").toLowerCase();
      if (name.indexOf("zh") === 0) return /(?:hant|tw|hk|mo)/.test(name) ? "zh-TW" : "zh-CN";
    }
    return "en";
  }

  function savedLocale() {
    try { return localStorage.getItem(LOCALE_KEY) || "auto"; } catch (e) { return "auto"; }
  }

  function languageControl() {
    return '<section class="release-language" data-release-i18n-controls>' +
      '<label class="pui-field" for="release-locale"><span class="pui-label" data-site-ui="language">Language</span>' +
      '<select class="pui-input" id="release-locale"><option value="auto" data-site-ui="auto">Auto (browser)</option>' +
      '<option value="en">English</option><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option></select></label></section>';
  }

  function ensurePanelStyles() {
    if (document.querySelector('link[href="/assets/panel/panel.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/panel/panel.css";
    document.head.insertBefore(link, document.head.firstChild);
  }

  function applySiteLocale(value) {
    var locale = resolvedLocale(value);
    var ui = SITE_UI[locale] || SITE_UI.en;
    activeSiteLocale = locale;
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-site-ui]").forEach(function (el) {
      var key = el.getAttribute("data-site-ui");
      if (ui[key]) el.textContent = ui[key];
    });
    document.querySelectorAll("[data-site-ui-html]").forEach(function (el) {
      var key = el.getAttribute("data-site-ui-html");
      if (ui[key]) el.innerHTML = ui[key];
    });
    document.querySelectorAll("[data-site-ui-attr]").forEach(function (el) {
      String(el.getAttribute("data-site-ui-attr") || "").split(",").forEach(function (spec) {
        var pair = spec.split(":");
        var attr = pair.shift();
        var key = pair.join(":");
        if (attr && ui[key]) el.setAttribute(attr, ui[key]);
      });
    });
    var select = document.getElementById("release-locale");
    if (select) select.value = ["auto", "en", "zh-CN", "zh-TW"].indexOf(value) >= 0 ? value : "auto";
    if (typeof window.xloadApplyReleaseLocale === "function") window.xloadApplyReleaseLocale(value);
    if (typeof window.xloadApplyListingLocale === "function") window.xloadApplyListingLocale();
  }

  function siteText(key) {
    return (SITE_UI[activeSiteLocale] && SITE_UI[activeSiteLocale][key]) || SITE_UI.en[key] || key;
  }

  /* ---------------- chrome (header / footer) ---------------- */
  function enabledTypes() {
    if (!data) return ["script"];
    var list = data.enabledTypes && data.enabledTypes.length ? data.enabledTypes : ["script"];
    return list;
  }
  function typeById(id) {
    var t = (data.types || []).filter(function (x) { return x.id === id; })[0];
    return t || { id: id, label: id, icon: "box" };
  }

  function buildHeader() {
    var active = document.body.getAttribute("data-nav") || "";
    var nav = "";
    nav += navLink("/", "Home", active === "script" || active === "home", "home");
    enabledTypes().forEach(function (t) {
      if (t === "script") return;
      nav += navLink("/?type=" + encodeURIComponent(t), typeById(t).label, active === t);
    });
    nav += navLink("/about.html", "About", active === "about", "about");
    var name = data ? esc(data.site.name) : "xload";
    var existingLanguage = document.querySelector(".release-language");
    var legacyDetail = location.pathname.indexOf("/scripts/userscripts/") === 0 && !existingLanguage;
    var language = existingLanguage || legacyDetail ? "" : languageControl();
    return (
      '<header class="site-header"><div class="nav-wrap">' +
      '<a class="logo" href="/"><img class="logo-img" src="/assets/img/xload_logo.png" alt="' + name + ' logo"><span>' + name + "</span></a>" +
      '<nav class="main-nav" id="main-nav">' + nav + "</nav>" +
      language +
      '<button class="nav-toggle" type="button" aria-label="Menu">&#9776;</button>' +
      "</div></header>"
    );
    function navLink(href, label, isActive, localeKey) {
      return '<a href="' + href + '"' + (isActive ? ' class="active"' : "") + (localeKey ? ' data-site-ui="' + localeKey + '"' : '') + ">" + label + "</a>";
    }
  }

  function buildFooter() {
    if (!data) return "";
    var en = enabledTypes();
    var typesCol = en.map(function (id) {
      var t = typeById(id);
      return '<li><a href="/?type=' + encodeURIComponent(id) + '">' + esc(t.label) + "</a></li>";
    }).join("");
    return (
      '<footer class="site-footer"><div class="container">' +
      '<div class="footer-grid">' +
      "<div class=\"footer-col\"><h4>" + esc(data.site.name) + "</h4><ul>" +
      "<li>" + esc(data.site.tagline) + "</li>" +
      '<li><a href="/about.html" data-site-ui="footerAbout">About us</a></li>' +
      '<li><a href="/contact.html" data-site-ui="footerContact">Contact</a></li>' +
      "</ul></div>" +
      "<div class=\"footer-col\"><h4 data-site-ui=\"footerTypes\">Types</h4><ul>" + typesCol + "</ul></div>" +
      "<div class=\"footer-col\"><h4 data-site-ui=\"footerLegal\">Legal</h4><ul>" +
      '<li><a href="/privacy-policy.html" data-site-ui="privacyPolicy">Privacy Policy</a></li>' +
      '<li><a href="/terms-of-service.html" data-site-ui="termsOfService">Terms of Service</a></li>' +
      '<li><a href="/cookie-policy.html" data-site-ui="cookiePolicy">Cookie Policy</a></li>' +
      "</ul></div>" +
      "</div>" +
      '<div class="footer-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(data.site.name) + ' <span data-site-ui="rightsReserved">All rights reserved.</span></span>' +
      '<span data-site-ui-html="downloadsNote">Downloads are linked to our GitHub releases &mdash; we never host files directly.</span></div>' +
      "</div></footer>"
    );
  }

  function buildCookieBanner() {
    var banner = document.createElement("div");
    banner.className = "cookie-banner hidden";
    banner.id = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.innerHTML =
      "<p>We use cookies to personalise content, provide analytics and show ads tailored to you. See our " +
      '<a href="/cookie-policy.html">Cookie Policy</a> for details.</p>' +
      '<div class="actions">' +
      '<button class="btn btn-ghost" data-ck="essential">Essential only</button>' +
      '<button class="btn" data-ck="all">Accept all</button>' +
      "</div>";
    document.body.appendChild(banner);
    var state = localStorage.getItem("xload_consent");
    if (!state) {
      setTimeout(function () { banner.classList.remove("hidden"); }, 1200);
    } else {
      applyConsent(state);
    }
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]");
      if (!b) return;
      applyConsent(b.getAttribute("data-ck"));
      localStorage.setItem("xload_consent", b.getAttribute("data-ck"));
      banner.classList.add("hidden");
    });
  }

  /* Google Consent Mode (see cookie-policy.html) */
  function applyConsent(mode) {
    if (typeof window.googleToken === "undefined") return;
    var ad_storage = mode === "all" ? "granted" : "denied";
    var analytics_storage = mode === "all" ? "granted" : "denied";
    window[window.googleToken].push(["consent", "update", {
      ad_user_data: ad_storage,
      ad_personalization: ad_storage,
      ad_storage: ad_storage,
      analytics_storage: analytics_storage
    }]);
  }

  function wireChrome() {
    var h = document.getElementById("chrome-header");
    if (h) h.innerHTML = buildHeader();
    var f = document.getElementById("chrome-footer");
    if (f) f.innerHTML = buildFooter();

    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("main-nav");
    var language = document.querySelector(".release-language");
    var navWrap = h && h.querySelector(".nav-wrap");
    if (language && navWrap) navWrap.insertBefore(language, toggle || null);
    var localeSelect = document.getElementById("release-locale");
    var localeValue = savedLocale();
    if (localeSelect) {
      localeSelect.value = ["auto", "en", "zh-CN", "zh-TW"].indexOf(localeValue) >= 0 ? localeValue : "auto";
      localeSelect.addEventListener("change", function () {
        try { localStorage.setItem(LOCALE_KEY, localeSelect.value); } catch (e) {}
        applySiteLocale(localeSelect.value);
      });
    }
    applySiteLocale(localeValue);
    if (toggle && nav) {
      toggle.addEventListener("click", function () { nav.classList.toggle("open"); });
    }
  }

  /* ---------------- listing & search ---------------- */
  var TYPE_META = {
    script: { label: "Script", icon: "puzzle" },
    extension: { label: "Extension", icon: "extension" },
    app: { label: "App", icon: "app" }
  };

  function cardHTML(item) {
    var tm = TYPE_META[item.type] || { label: "Item", icon: "box" };
    var tags = (item.tags || []).slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var gh = icon("download");
    return (
      '<a class="script-card" href="' + esc(item.page) + '" target="_blank" rel="noopener">' +
      '<div class="card-top"><span class="card-badge">' + icon(tm.icon) + "</span>" +
      "<h3>" + esc(item.title) + "</h3></div>" +
      '<p class="desc">' + esc(item.short || item.description) + "</p>" +
      '<div class="tags">' + tags + "</div>" +
      '<div class="card-meta">' +
      '<span class="dl">' + icon("download") + " " + fmt(item.downloads) + "</span>" +
      '<span>' + icon("star") + " " + (item.rating ? Number(item.rating).toFixed(1) : "&ndash;") + "</span>" +
      "</div></a>"
    );
  }

  function renderListing() {
    var grid = document.getElementById("listing");
    if (!grid) return;
    var storeAll = (data.scripts || []).concat();
    var activeType = param("type") || "all";
    var q = param("q").toLowerCase().trim();
    var sort = param("sort") || "popular";

    var typeSel = document.getElementById("ff-type");
    if (typeSel) {
      typeSel.innerHTML = '<option value="all">' + esc(siteText("allTypes")) + '</option>' + enabledTypes().map(function (id) {
        return '<option value="' + esc(id) + '">' + esc(typeById(id).label) + "</option>";
      }).join("");
      typeSel.value = activeType;
    }
    if (q) { var fi = document.getElementById("filter-q"); if (fi) fi.value = param("q"); }

    // 渐进增强（SSG）：构建时已把卡片写进 HTML，JS 只负责筛选/排序/补漏。
    // 爬虫不执行 JS 也能看到全部卡片（内容直接进 HTML 源码）。
    var staticIds = {};
    Array.prototype.forEach.call(grid.querySelectorAll(".script-card[data-id]"), function (c) {
      staticIds[c.getAttribute("data-id")] = c;
    });

    function ensureCard(item) {
      var el = staticIds[item.id];
      if (el) return el;
      var tmp = document.createElement("div");
      tmp.innerHTML = cardHTML(item);
      el = tmp.firstChild;
      staticIds[item.id] = el;
      return el;
    }

    function apply() {
      var t = document.getElementById("ff-type").value;
      var k = document.getElementById("filter-q").value.toLowerCase().trim();
      var s = document.getElementById("ff-sort").value;
      if (typeSel && typeSel.options.length) typeSel.options[0].textContent = siteText("allTypes");

      var list = storeAll.filter(function (it) {
        if (t !== "all" && it.type !== t) return false;
        if (k) {
          var hay = (it.title + " " + (it.description || "") + " " + (it.tags || []).join(" ") + " " + (it.categories || []).join(" ")).toLowerCase();
          if (hay.indexOf(k) < 0) return false;
        }
        return true;
      });

      if (s === "newest") list.sort(function (a, b) { return (b.lastUpdated || "").localeCompare(a.lastUpdated || ""); });
      else if (s === "name") list.sort(function (a, b) { return a.title.localeCompare(b.title); });
      else list.sort(function (a, b) { return (Number(b.downloads) || 0) - (Number(a.downloads) || 0); });

      // 清理旧空态提示
      var oldEmpty = grid.querySelector(".empty");
      if (oldEmpty && oldEmpty.parentNode) oldEmpty.parentNode.removeChild(oldEmpty);

      // 补漏：静态卡片之外的条目动态渲染，然后按当前排序重排 DOM
      list.forEach(function (item, i) {
        var el = ensureCard(item);
        if (grid.children[i] !== el) grid.insertBefore(el, grid.children[i] || null);
      });

      // 隐藏不匹配项（保留静态卡片，控制 display 即可）
      Object.keys(staticIds).forEach(function (id) {
        var el = staticIds[id];
        var matched = list.some(function (it) { return it.id === id; });
        el.style.display = matched ? "" : "none";
      });

      if (!list.length) {
        var empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = siteText("noResults");
        grid.appendChild(empty);
      }

      var cl = document.getElementById("count-line");
      if (cl) cl.textContent = list.length + " " + siteText(list.length === 1 ? "item" : "items");
    }

    var tSel = document.getElementById("ff-type");
    if (tSel) tSel.addEventListener("change", apply);
    if (document.getElementById("ff-sort")) document.getElementById("ff-sort").addEventListener("change", apply);
    if (document.getElementById("filter-q")) document.getElementById("filter-q").addEventListener("input", apply);
    window.xloadApplyListingLocale = apply;
    apply();
  }

  /* ---------------- init ---------------- */
  function init() {
    ensurePanelStyles();
    fetch("/scripts-data.json")
      .then(function (r) { if (!r.ok) throw new Error("data"); return r.json(); })
      .then(function (d) {
        data = d;
        if (data && typeof window.googleToken === "undefined") {
          window.googleToken = d.site.adsense ? "xload_consent_token" : "";
        }
        wireChrome();
        renderListing();
      })
      .catch(function () {
        wireChrome();
      });
    buildCookieBanner();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
