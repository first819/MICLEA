/* ============================================================
   Miclea AI — App shell runtime
   Injects sidebar + topbar, manages collapse, tier gating,
   a mock session store, and toasts. Front-end only.
   ============================================================ */
(function () {
  "use strict";
  var LS = window.localStorage;

  /* ---------- Tier state (single source of truth for gating) ---------- */
  var TIERS = { free: 0, pro: 1, ultra: 2 };
  function getTier() { return LS.getItem("miclea_tier") || "pro"; }
  function setTier(t) {
    if (!(t in TIERS)) return;
    LS.setItem("miclea_tier", t);
    applyLocks();
    paintTierUI();
    window.dispatchEvent(new CustomEvent("tierchange", { detail: t }));
  }
  function meets(min) { return TIERS[getTier()] >= TIERS[min || "free"]; }

  /* lockable elements declare data-tier="pro|ultra" (minimum required) */
  function applyLocks() {
    document.querySelectorAll(".lockable[data-tier]").forEach(function (el) {
      var need = el.getAttribute("data-tier");
      el.classList.toggle("is-locked", !meets(need));
    });
    document.querySelectorAll(".nav-item[data-tier]").forEach(function (el) {
      var need = el.getAttribute("data-tier");
      var lk = el.querySelector(".lockicon");
      if (lk) lk.style.display = meets(need) ? "none" : "";
    });
  }
  function paintTierUI() {
    var t = getTier();
    var tag = document.querySelector(".sb-pro .tier-tag");
    if (tag) tag.textContent = t;
    var pro = document.querySelector(".sb-pro");
    if (pro) {
      var h = pro.querySelector("h4"), p = pro.querySelector("p"), a = pro.querySelector("a");
      if (t === "ultra") {
        h.textContent = "Ultra is active"; p.textContent = "Every feature unlocked. Nice.";
        a.textContent = "Manage plan";
      } else if (t === "pro") {
        h.textContent = "Go further with Ultra"; p.textContent = "Unlimited rounds, packs & replay.";
        a.textContent = "Upgrade plan";
      } else {
        h.textContent = "Unlock Miclea Pro"; p.textContent = "Full progress, question bank & tools.";
        a.textContent = "See plans";
      }
    }
    document.querySelectorAll("[data-current-tier]").forEach(function (e) { e.textContent = t; });
  }

  /* ---------- Theme (light / dark / system), applied app-wide ---------- */
  function getTheme() { return LS.getItem("miclea_theme") || "system"; }
  function resolveDark(t) {
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme() {
    document.body.classList.toggle("theme-dark", resolveDark(getTheme()));
  }
  function setTheme(t) {
    LS.setItem("miclea_theme", t);
    applyTheme();
    window.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }

  /* ---------- Mock session store (feeds Progress & Question Bank) ---------- */
  function seedSessions() {
    if (LS.getItem("miclea_sessions")) return;
    var seed = [
      { id: 1, type: "gauntlet", topic: "Algorithms & DS", role: "Software Engineer", score: 92, date: "2026-06-23", mins: 28 },
      { id: 2, type: "speed", topic: "System Design", role: "Software Engineer", score: 71, date: "2026-06-22", mins: 5 },
      { id: 3, type: "gauntlet", topic: "Behavioral", role: "Product Manager", score: 86, date: "2026-06-19", mins: 31 },
      { id: 4, type: "speed", topic: "SQL & Databases", role: "Data Analyst", score: 64, date: "2026-06-18", mins: 4 },
      { id: 5, type: "speed", topic: "OS Concepts", role: "Software Engineer", score: 78, date: "2026-06-17", mins: 5 },
      { id: 6, type: "gauntlet", topic: "Leadership", role: "Engineering Manager", score: 81, date: "2026-06-15", mins: 33 }
    ];
    LS.setItem("miclea_sessions", JSON.stringify(seed));
  }
  function getSessions() { try { return JSON.parse(LS.getItem("miclea_sessions")) || []; } catch (e) { return []; } }
  function addSession(s) {
    var all = getSessions();
    s.id = Date.now();
    all.unshift(s);
    LS.setItem("miclea_sessions", JSON.stringify(all));
    return s;
  }

  /* ---------- Toast ---------- */
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var ERR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  function toast(msg, type) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    var el = document.createElement("div");
    el.className = "toast " + (type === "err" ? "err" : "ok");
    el.innerHTML = (type === "err" ? ERR : OK) + "<span>" + msg + "</span>";
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () { el.classList.remove("show"); setTimeout(function () { el.remove(); }, 240); }, 2600);
  }

  /* ---------- Icons ---------- */
  var I = {
    dashboard: '<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    speed: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    gauntlet: '<polygon points="12 2 15 8.6 22 9.3 17 14 18.2 21 12 17.5 5.8 21 7 14 2 9.3 9 8.6 12 2"/>',
    progress: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    resume: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
    cover: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
    bank: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    packs: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };
  function svg(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }

  var NAV = [
    { group: "Main", items: [
      { id: "dashboard", label: "Dashboard", href: "dashboard", icon: "dashboard" },
      { id: "speed-round", label: "Speed Round", href: "speed-round", icon: "speed", badge: "Easy" },
      { id: "gauntlet", label: "Gauntlet", href: "gauntlet", icon: "gauntlet" },
      { id: "progress", label: "Progress & Insights", href: "progress", icon: "progress" }
    ]},
    { group: "Prep", items: [
      { id: "resume", label: "Résumé", href: "resume", icon: "resume" },
      { id: "cover-letter", label: "Cover Letter", href: "cover-letter", icon: "cover" },
      { id: "question-bank", label: "Question Bank", href: "question-bank", icon: "bank" },
      { id: "company-packs", label: "Company Packs", href: "company-packs", icon: "packs", tier: "ultra" }
    ]},
    { group: "General", items: [
      { id: "settings", label: "Settings", href: "settings", icon: "settings" },
      { id: "help", label: "Help & Support", href: "help", icon: "help" },
      { id: "logout", label: "Log out", href: "login", icon: "logout" }
    ]}
  ];

  function buildRail(active) {
    var items = "";
    NAV.forEach(function (g, gi) {
      g.items.forEach(function (it) {
        if (it.id === "logout") return; // logout handled in sidebar/bottom
        var cls = "rail-item" + (it.id === active ? " active" : "");
        items += '<a class="' + cls + '" href="' + it.href + '" data-tip="' + it.label + '"' +
          (it.tier ? ' data-tier="' + it.tier + '"' : "") + ">" + svg(I[it.icon]) +
          (it.tier ? '<span class="lockicon">' + svg(I.lock) + "</span>" : "") + "</a>";
      });
      if (gi < 1) items += '<div class="rail-sep"></div>';
      if (gi === 1) items += '<div class="rail-spacer"></div>';
    });
    return '' +
      '<nav class="rail">' +
        '<button class="rail-toggle" id="railToggle" aria-label="Toggle sidebar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
        '</button>' +
        items +
      '</nav>';
  }

  function buildSidebar(active, ph) {
    var nav = "";
    NAV.forEach(function (g) {
      nav += '<div class="sb-group">' + g.group + "</div>";
      g.items.forEach(function (it) {
        var cls = "nav-item" + (it.id === active ? " active" : "") + (it.id === "logout" ? " danger" : "");
        var extra = "";
        if (it.badge) extra = '<span class="badge">' + it.badge + "</span>";
        if (it.tier) extra = '<span class="lockicon">' + svg(I.lock) + "</span>";
        nav += '<a class="' + cls + '" href="' + it.href + '" data-tip="' + it.label + '"' +
          (it.tier ? ' data-tier="' + it.tier + '"' : "") + ">" +
          svg(I[it.icon]) + '<span class="label">' + it.label + "</span>" + extra + "</a>";
      });
    });
    return '' +
      '<aside class="sidebar">' +
        '<div class="sb-head">' +
          '<a href="dashboard" class="sb-logo" aria-label="Miclea home"><img src="images/logo.png" alt="Miclea"></a>' +
          '<button class="sb-toggle" id="collapseBtn" aria-label="Collapse sidebar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="sb-search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" placeholder="' + (ph || "Search…") + '" aria-label="Search"><kbd>⌘K</kbd>' +
        '</div>' +
        '<nav class="sb-nav">' + nav + '</nav>' +
        '<div class="sb-foot">' +
          '<div class="sb-pro">' +
            '<span class="tier-tag">pro</span>' +
            '<h4>Go further with Ultra</h4><p>Unlimited rounds, packs & replay.</p>' +
            '<a href="pricing">Upgrade plan</a>' +
          '</div>' +
        '</div>' +
      '</aside>' +
      '<div class="scrim" id="scrim"></div>';
  }

  function buildTopbar() {
    return '' +
      '<header class="topbar">' +
        '<button class="icon-btn mobile-toggle" id="mobileToggle" aria-label="Menu">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
        '</button>' +
        '<div class="top-actions">' +
          '<div class="streak-chip"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg><span>7-day streak</span></div>' +
          '<button class="icon-btn" aria-label="Notifications"><span class="dot"></span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>' +
          '<a class="user-chip" href="settings"><span class="avatar">TH</span><span class="u-name">Thomas Hanks</span><svg class="u-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></a>' +
        '</div>' +
      '</header>';
  }

  /* In embed mode, keep navigation to other core features inside the embed:
     tell the parent dashboard to update its hash (which reloads this iframe). */
  function wireEmbedLinks() {
    var CORE = { "speed-round":1,"gauntlet":1,"progress":1,"resume":1,"cover-letter":1,"question-bank":1,"company-packs":1,"settings":1,"help":1 };
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank") return;
      var slug = a.getAttribute("href").split("?")[0].split("#")[0]
        .replace(/^.*?\/\/[^/]+/, "").replace(/^\//, "").replace(/\/$/, "").replace(/\.html$/, "");
      if (!CORE[slug]) return;
      e.preventDefault();
      if (window.parent !== window) window.parent.postMessage({ type: "miclea:navigate", slug: slug }, "*");
      else location.href = slug + "?embed=1";
    });
  }

  function isEmbed() {
    try { return new URLSearchParams(location.search).has("embed"); }
    catch (e) { return /[?&]embed(=|&|$)/.test(location.search); }
  }

  function mount() {
    var page = document.body.getAttribute("data-page") || "";
    if (isEmbed()) {
      document.body.classList.add("embed");
      seedSessions();
      applyTheme();
      applyLocks();
      paintTierUI();
      wireEmbedLinks();
      return;
    }
    document.body.insertAdjacentHTML("afterbegin", buildRail(page) + buildSidebar(page, document.body.getAttribute("data-search")));
    var main = document.querySelector(".main");
    if (main) main.insertAdjacentHTML("afterbegin", buildTopbar());

    /* collapse + mobile */
    if (LS.getItem("miclea_sb") === "1") document.body.classList.add("collapsed");
    function toggleCollapse() {
      document.body.classList.toggle("collapsed");
      LS.setItem("miclea_sb", document.body.classList.contains("collapsed") ? "1" : "0");
    }
    var cb = document.getElementById("collapseBtn");
    if (cb) cb.addEventListener("click", toggleCollapse);
    var rt = document.getElementById("railToggle");
    if (rt) rt.addEventListener("click", function () {
      if (window.innerWidth <= 820) document.body.classList.toggle("nav-open");
      else toggleCollapse();
    });
    var mt = document.getElementById("mobileToggle");
    if (mt) mt.addEventListener("click", function () { document.body.classList.add("nav-open"); });
    var sc = document.getElementById("scrim");
    if (sc) sc.addEventListener("click", function () { document.body.classList.remove("nav-open"); });

    seedSessions();
    applyTheme();
    applyLocks();
    paintTierUI();
  }
  /* apply theme ASAP to reduce flash (body exists by script load at end of page) */
  if (document.body) applyTheme();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  /* ---------- Public API ---------- */
  window.Miclea = {
    getTier: getTier, setTier: setTier, meets: meets, applyLocks: applyLocks,
    getSessions: getSessions, addSession: addSession, toast: toast,
    getTheme: getTheme, setTheme: setTheme,
    svg: svg, icons: I
  };
})();
