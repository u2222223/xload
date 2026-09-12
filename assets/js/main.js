(function () {
  "use strict";

  var data = null;

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
    nav += navLink("/", "Home", active === "script" || active === "home");
    enabledTypes().forEach(function (t) {
      if (t === "script") return;
      nav += navLink("/?type=" + encodeURIComponent(t), typeById(t).label, active === t);
    });
    nav += navLink("/about.html", "About", active === "about");
    var name = data ? esc(data.site.name) : "xload";
    return (
      '<header class="site-header"><div class="nav-wrap">' +
      '<a class="logo" href="/"><img class="logo-img" src="/assets/img/xload_logo.png" alt="' + name + ' logo"><span>' + name + "</span></a>" +
      '<nav class="main-nav" id="main-nav">' + nav + "</nav>" +
      '<button class="nav-toggle" type="button" aria-label="Menu">&#9776;</button>' +
      "</div></header>"
    );
    function navLink(href, label, isActive) {
      return '<a href="' + href + '"' + (isActive ? ' class="active"' : "") + ">" + label + "</a>";
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
      '<li><a href="/about.html">About us</a></li>' +
      '<li><a href="/contact.html">Contact</a></li>' +
      "</ul></div>" +
      "<div class=\"footer-col\"><h4>Types</h4><ul>" + typesCol + "</ul></div>" +
      "<div class=\"footer-col\"><h4>Legal</h4><ul>" +
      '<li><a href="/privacy-policy.html">Privacy Policy</a></li>' +
      '<li><a href="/terms-of-service.html">Terms of Service</a></li>' +
      '<li><a href="/cookie-policy.html">Cookie Policy</a></li>' +
      "</ul></div>" +
      "</div>" +
      '<div class="footer-bottom"><span>&copy; ' + new Date().getFullYear() + " " + esc(data.site.name) + ". All rights reserved.</span>" +
      '<span>Downloads are linked to our GitHub releases &mdash; we never host files directly.</span></div>' +
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
      typeSel.innerHTML = '<option value="all">All types</option>' + enabledTypes().map(function (id) {
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
        empty.textContent = "No results found. Try a different search or filter.";
        grid.appendChild(empty);
      }

      var cl = document.getElementById("count-line");
      if (cl) cl.textContent = list.length + (list.length === 1 ? " item" : " items");
    }

    var tSel = document.getElementById("ff-type");
    if (tSel) tSel.addEventListener("change", apply);
    if (document.getElementById("ff-sort")) document.getElementById("ff-sort").addEventListener("change", apply);
    if (document.getElementById("filter-q")) document.getElementById("filter-q").addEventListener("input", apply);
    apply();
  }

  /* ---------------- init ---------------- */
  function init() {
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