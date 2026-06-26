/* ============================================================
   Dashboard SPA router
   Loads core features inline via an embed-mode iframe, driven
   by location.hash so refresh + back/forward work. Front-end only.
   ============================================================ */
(function () {
  "use strict";

  var CORE = {
    "speed-round": "Speed Round",
    "gauntlet": "Gauntlet",
    "progress": "Progress & Insights",
    "resume": "Résumé",
    "cover-letter": "Cover Letter",
    "question-bank": "Question Bank",
    "company-packs": "Company Packs",
    "settings": "Settings",
    "help": "Help & Support"
  };

  var body = document.body;
  var frame = document.getElementById("featureFrame");
  var loading = document.getElementById("featureLoading");
  var loadTimer = null;

  function stopLoading() {
    clearTimeout(loadTimer);
    loading.classList.remove("on");
  }

  function slugFromHref(href) {
    if (!href) return "";
    return href.split("?")[0].split("#")[0]
      .replace(/^.*?\/\/[^/]+/, "")   // strip origin
      .replace(/^\//, "")              // leading slash
      .replace(/\/$/, "")              // trailing slash
      .replace(/\.html$/, "");         // .html
  }

  function setActiveNav(slug) {
    var target = slug || "dashboard";
    Array.prototype.forEach.call(document.querySelectorAll(".sb-nav .nav-item"), function (a) {
      a.classList.toggle("active", slugFromHref(a.getAttribute("href")) === target);
    });
  }

  function showHome() {
    body.classList.remove("feature-active");
    stopLoading();
    frame.removeAttribute("src");
    document.title = "Dashboard — Miclea";
    setActiveNav("dashboard");
  }

  function showFeature(slug) {
    if (slugFromHref(frame.getAttribute("src") || "") !== slug) {
      loading.classList.add("on");
      // Safety net: never spin forever if the frame fails to fire load.
      clearTimeout(loadTimer);
      loadTimer = setTimeout(stopLoading, 8000);
      frame.setAttribute("src", slug + "?embed=1");
    }
    body.classList.add("feature-active");
    document.title = CORE[slug] + " — Miclea";
    setActiveNav(slug);
  }

  function route() {
    var slug = (location.hash || "").replace(/^#/, "");
    if (slug && CORE.hasOwnProperty(slug)) showFeature(slug);
    else showHome();
  }

  frame.addEventListener("load", function () {
    if (frame.getAttribute("src")) stopLoading();
  });
  frame.addEventListener("error", stopLoading);

  // Intercept core-feature + Dashboard links anywhere in the dashboard document.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var slug = slugFromHref(a.getAttribute("href"));
    if (slug === "dashboard") {
      e.preventDefault();
      if (location.hash) location.hash = ""; else route();
      return;
    }
    if (CORE.hasOwnProperty(slug)) {
      e.preventDefault();
      if (location.hash === "#" + slug) route();   // already active -> ensure shown
      else location.hash = "#" + slug;             // triggers hashchange -> route()
    }
    // anything else (settings, help, login, pricing, marketing) -> normal navigation
  });

  // An embedded feature asked to navigate to another core feature.
  window.addEventListener("message", function (e) {
    if (e.source !== frame.contentWindow) return;
    var d = e.data;
    if (d && d.type === "miclea:navigate" && CORE.hasOwnProperty(d.slug)) {
      location.hash = "#" + d.slug;
    }
  });

  window.addEventListener("hashchange", route);
  route(); // initial view from the URL
})();
