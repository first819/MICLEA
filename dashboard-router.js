/* ============================================================
   Dashboard SPA router
   Loads core features inline via an embed-mode iframe, driven
   by location.hash so refresh + back/forward work. Front-end only.
   ============================================================ */
(function () {
  "use strict";

  var CORE = {
    "speed-round":   { title: "Speed Round",         eyebrow: "Warm-up · Easy mode",          desc: "A quick burst of easy questions to shake off the nerves and build momentum." },
    "gauntlet":      { title: "Gauntlet",             eyebrow: "The flagship · Realistic mock", desc: "Three rounds, rising pressure, one curveball. This is the real thing." },
    "progress":      { title: "Progress & Insights",  eyebrow: "Your trajectory",               desc: "Every Speed Round and Gauntlet, distilled into where you're winning and what to drill next." },
    "resume":        { title: "Résumé",               eyebrow: "Document studio",               desc: "Build it, then let Micl sharpen every line — stronger verbs, quantified impact, tailored to the role." },
    "cover-letter":  { title: "Cover Letter",         eyebrow: "Document studio",               desc: "Drop in the role and a job description — Micl drafts a tailored letter in your voice." },
    "question-bank": { title: "Question Bank",        eyebrow: "Study deliberately",            desc: "Hundreds of real interview questions — searchable and ready to drill." },
    "company-packs": { title: "Company Packs",        eyebrow: "Ultra",                         desc: "Drill the exact style each company is known for — curated and kept current." },
    "settings":      { title: "Settings",             eyebrow: "Your account",                  desc: "Manage your profile, security, and how Miclea looks and feels." },
    "help":          { title: "Help & Support",       eyebrow: "We've got you",                 desc: "Find answers fast, or send us a note — we usually reply within a few hours." }
  };

  var body = document.body;
  var frame = document.getElementById("featureFrame");
  var loading = document.getElementById("featureLoading");
  var pageInfo = document.getElementById("pageInfo");
  var pageEyebrow = document.getElementById("pageEyebrow");
  var pageTitle = document.getElementById("pageTitle");
  var pageDesc = document.getElementById("pageDesc");
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
    if (pageInfo) pageInfo.style.display = "none";
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
    var info = CORE[slug];
    document.title = info.title + " — Miclea";
    setActiveNav(slug);
    if (pageInfo && info) {
      if (pageEyebrow) pageEyebrow.textContent = info.eyebrow;
      if (pageTitle)   pageTitle.textContent   = info.title;
      if (pageDesc)    pageDesc.textContent     = info.desc;
      pageInfo.style.display = "flex";
    }
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
