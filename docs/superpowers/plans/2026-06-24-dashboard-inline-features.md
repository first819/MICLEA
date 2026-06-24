# Dashboard Inline Feature Loading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard's core-feature sidebar/launcher links load each feature inline (in an embed-mode iframe) instead of navigating to the standalone app-shell page.

**Architecture:** `dashboard.html` becomes a lightweight SPA host. A hidden `<iframe id="featureFrame">` fills the `.content` area when a core feature is active; the dashboard's own home content shows otherwise. A new `dashboard-router.js` intercepts core-feature link clicks, drives the iframe via `location.hash`, and restores state on refresh/back/forward. `app-shell.js` gains an "embed" branch: when a page is loaded with `?embed=1` it skips building its rail/sidebar/topbar (so no second shell) but still exposes `window.Miclea` and applies theme/tier/locks. Same-origin `localStorage` keeps sessions/tier/theme in sync between dashboard and embedded feature.

**Tech Stack:** Static HTML/CSS/vanilla JS. Local preview via `server.py` (clean URLs, strips query). No build step, no test runner — verification is done in the Claude Preview sandbox (which reads from the `/tmp/miclea-preview` mirror, **not** the repo; copy changed files there before reloading).

---

## Conventions for every task

- **Preview mirror:** the preview server serves `/tmp/miclea-preview`, not the repo. After editing repo files, copy them into the mirror before reloading:
  `cp <changed files> /tmp/miclea-preview/`
- **Core feature slugs** (used identically in `dashboard-router.js` and the `app-shell.js` embed link-bridge):
  `speed-round`, `gauntlet`, `progress`, `resume`, `cover-letter`, `question-bank`, `company-packs`
- **Commit after each task.** On branch `master` (the active working branch in this repo).

---

## File Structure

- **Create** `dashboard-router.js` — the SPA router for `dashboard.html` (click interception, hash routing, iframe show/hide, loading + error states, active-nav). One responsibility: routing the dashboard's content area.
- **Modify** `app-shell.js` — add an embed branch in `mount()` + an in-iframe link bridge. Responsibility unchanged (app runtime); embed mode is a variant of mounting.
- **Modify** `app-shell.css` — additive embed-layout rules (zero sidebar gutter, hide chrome).
- **Modify** `dashboard.html` — remove `target="_blank"` from nav links, add iframe + loading markup into `.content`, add iframe/feature-active CSS to the inline `<style>`, link `dashboard-router.js`.

---

## Task 0: Baseline — confirm the current (broken) behavior in preview

**Files:** none (verification only).

- [ ] **Step 1: Sync the repo into the preview mirror**

Run:
```bash
cd /Users/first/Downloads/MICLEA
cp dashboard.html app-shell.js app-shell.css tokens.css /tmp/miclea-preview/
```
Expected: no output (success).

- [ ] **Step 2: Ensure the preview server is running**

Use the preview tool `preview_start` (launch config `miclea-static`) if no server is listed by `preview_list`. Then navigate the preview to `/dashboard`.

- [ ] **Step 3: Capture the baseline**

Use `preview_snapshot` on `/dashboard`. Confirm the dashboard home renders (stat cards, "Performance Trend" chart). Then `preview_eval`:
```js
Array.from(document.querySelectorAll('.sb-nav .nav-item')).map(a => a.getAttribute('href') + (a.target ? ' [' + a.target + ']' : ''))
```
Expected: core-feature links show `[_blank]` (e.g. `gauntlet [_blank]`, `progress [_blank]`). This documents the band-aid we are replacing. No commit.

---

## Task 1: `app-shell.js` — embed branch (skip shell, keep Miclea)

**Files:**
- Modify: `app-shell.js` (the `mount()` function, ~lines 218-246)

- [ ] **Step 1: Add an `isEmbed()` helper and embed branch at the top of `mount()`**

In `app-shell.js`, replace the opening of `mount()`:
```js
  function mount() {
    var page = document.body.getAttribute("data-page") || "";
    document.body.insertAdjacentHTML("afterbegin", buildRail(page) + buildSidebar(page, document.body.getAttribute("data-search")));
```
with:
```js
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
```

- [ ] **Step 2: Add `wireEmbedLinks()` just above `mount()`**

Insert this function immediately before `function isEmbed()` (or before `mount`):
```js
  /* In embed mode, keep navigation to other core features inside the embed:
     tell the parent dashboard to update its hash (which reloads this iframe). */
  function wireEmbedLinks() {
    var CORE = { "speed-round":1,"gauntlet":1,"progress":1,"resume":1,"cover-letter":1,"question-bank":1,"company-packs":1 };
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
```

- [ ] **Step 3: Sync mirror and verify embed mode renders no shell**

Run:
```bash
cp app-shell.js /tmp/miclea-preview/
```
Navigate the preview to `/gauntlet?embed=1`. Use `preview_eval`:
```js
JSON.stringify({
  embed: document.body.classList.contains('embed'),
  rails: document.querySelectorAll('.rail, .sidebar, .topbar').length,
  miclea: typeof window.Miclea,
  content: !!document.querySelector('main.content')
})
```
Expected: `{"embed":true,"rails":0,"miclea":"object","content":true}` — embed class on, **no** rail/sidebar/topbar built, `Miclea` available, feature content present.

- [ ] **Step 4: Verify standalone (non-embed) is unchanged**

Navigate the preview to `/gauntlet` (no query). `preview_eval`:
```js
JSON.stringify({ embed: document.body.classList.contains('embed'), rails: document.querySelectorAll('.rail, .sidebar').length })
```
Expected: `{"embed":false,"rails":2}` — normal shell still builds.

- [ ] **Step 5: Commit**

```bash
git add app-shell.js
git commit -m "feat: add embed mode to app-shell (skip shell, keep Miclea API)"
```

---

## Task 2: `app-shell.css` — embed layout rules

**Files:**
- Modify: `app-shell.css` (append at end of file)

- [ ] **Step 1: Append embed-layout rules**

Add to the end of `app-shell.css`:
```css
/* ===================== Embed mode (loaded inside the dashboard iframe) ===================== */
body.embed .rail,
body.embed .sidebar,
body.embed .scrim,
body.embed .topbar { display: none !important; }
body.embed .main { margin-left: 0 !important; }
body.embed .content { padding-top: 24px; }
```

- [ ] **Step 2: Sync mirror and verify full-width embed**

Run:
```bash
cp app-shell.css /tmp/miclea-preview/
```
Navigate to `/gauntlet?embed=1`. `preview_eval`:
```js
(function(){ var m=document.querySelector('.main'); return getComputedStyle(m).marginLeft; })()
```
Expected: `"0px"` (no reserved sidebar gutter). Then `preview_screenshot` — the gauntlet content should fill the width with no empty left column and no app-shell sidebar.

> Note (from project memory): in the headless preview, CSS transitions can freeze when the tab isn't visible, so `getComputedStyle` may report a pre-transition margin. If you see a non-zero value, re-run after a `preview_eval` of `document.querySelector('.main').offsetHeight` (forces reflow) — the rule itself is correct.

- [ ] **Step 3: Commit**

```bash
git add app-shell.css
git commit -m "feat: embed-mode layout rules (zero gutter, hide chrome)"
```

---

## Task 3: `dashboard.html` — markup, CSS, and remove `target="_blank"`

**Files:**
- Modify: `dashboard.html` — inline `<style>` (before `</style>` at the head), `<main class="content">` open (line ~431), nav links, and the bottom `<script src>` link.

- [ ] **Step 1: Remove all `target="_blank"` from nav/launcher links**

In `dashboard.html`, remove every occurrence of ` target="_blank"` (note the leading space). Confirm the count first:
```bash
grep -c 'target="_blank"' dashboard.html
```
Expected: a non-zero count (the nav links from the band-aid). Use a replace-all edit of the literal ` target="_blank"` → `` (empty). Re-run the grep; expected: `0`.

- [ ] **Step 2: Add iframe + loading markup as the first children of `.content`**

Find (line ~431):
```html
  <main class="content">
    <!-- Stat cards -->
```
Replace with:
```html
  <main class="content">
    <iframe id="featureFrame" title="Feature" referrerpolicy="same-origin"></iframe>
    <div id="featureLoading" aria-hidden="true"><div class="fl-spinner"></div></div>
    <!-- Stat cards -->
```

- [ ] **Step 3: Add feature-active + iframe CSS to the inline `<style>`**

In `dashboard.html`, immediately before the closing `</style>` of the main inline style block (the one that ends right before `</head>`), insert:
```css
  /* ===================== Inline feature host ===================== */
  #featureFrame{display:none;width:100%;border:0;background:var(--app-bg)}
  #featureLoading{display:none}
  body.feature-active .content{padding:0;max-width:none;position:relative}
  body.feature-active .content > :not(#featureFrame):not(#featureLoading){display:none}
  body.feature-active #featureFrame{display:block;width:100%;height:calc(100vh - 70px)}
  #featureLoading.on{display:flex;position:absolute;inset:0;align-items:center;justify-content:center;background:var(--app-bg);z-index:2}
  .fl-spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--brand-faint);border-top-color:var(--brand);animation:fl-spin .8s linear infinite}
  @keyframes fl-spin{to{transform:rotate(360deg)}}
```

- [ ] **Step 4: Link the router script before `</body>`**

Find the end of the existing bottom script and `</body>` (line ~678):
```html
  })();
</script>
</body>
```
Replace with:
```html
  })();
</script>
<script src="dashboard-router.js"></script>
</body>
```

- [ ] **Step 5: Sync mirror and verify home still renders + markup present**

Run:
```bash
cp dashboard.html /tmp/miclea-preview/
```
Navigate to `/dashboard`. `preview_eval`:
```js
JSON.stringify({
  frame: !!document.getElementById('featureFrame'),
  loading: !!document.getElementById('featureLoading'),
  blanks: document.querySelectorAll('.sb-nav a[target="_blank"]').length,
  homeVisible: getComputedStyle(document.querySelector('.stats')).display !== 'none'
})
```
Expected: `{"frame":true,"loading":true,"blanks":0,"homeVisible":true}`. (Note: `dashboard-router.js` doesn't exist yet, so a 404 for it is expected here; the home view must still render fine.)

- [ ] **Step 6: Commit**

```bash
git add dashboard.html
git commit -m "feat: dashboard iframe host markup + CSS, drop target=_blank"
```

---

## Task 4: `dashboard-router.js` — the SPA router

**Files:**
- Create: `dashboard-router.js`

- [ ] **Step 1: Create `dashboard-router.js` with the full router**

Create `dashboard-router.js`:
```js
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
    "company-packs": "Company Packs"
  };

  var body = document.body;
  var frame = document.getElementById("featureFrame");
  var loading = document.getElementById("featureLoading");

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
    loading.classList.remove("on");
    frame.removeAttribute("src");
    document.title = "Dashboard — Miclea";
    setActiveNav("dashboard");
  }

  function showFeature(slug) {
    if (slugFromHref(frame.getAttribute("src") || "") !== slug) {
      loading.classList.add("on");
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
    if (frame.getAttribute("src")) loading.classList.remove("on");
  });

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
      if (location.hash === "#" + slug) route();   // already active → ensure shown
      else location.hash = "#" + slug;             // triggers hashchange → route()
    }
    // anything else (settings, help, login, pricing, marketing) → normal navigation
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
```

- [ ] **Step 2: Sync mirror**

```bash
cp dashboard-router.js /tmp/miclea-preview/
```

- [ ] **Step 3: Verify clicking a feature loads it inline (no navigation)**

Navigate to `/dashboard`. Use `preview_click` on the sidebar "Progress & Insights" link (text "Progress & Insights"). Then `preview_eval`:
```js
JSON.stringify({
  url: location.href.slice(-40),
  featureActive: document.body.classList.contains('feature-active'),
  src: document.getElementById('featureFrame').getAttribute('src'),
  activeNav: (document.querySelector('.sb-nav .nav-item.active')||{}).textContent && document.querySelector('.sb-nav .nav-item.active').textContent.trim()
})
```
Expected: url ends with `/dashboard#progress`, `featureActive:true`, `src:"progress?embed=1"`, and the active nav label is "Progress & Insights". Then `preview_screenshot` — the Progress feature renders inside the dashboard, dashboard sidebar still present, no second sidebar.

- [ ] **Step 4: Verify refresh keeps the feature, and back/forward work**

`preview_eval` `location.reload()` (or use `preview_eval` to set `location.hash` then reload). After reload on `/dashboard#progress`, `preview_eval`:
```js
JSON.stringify({ featureActive: document.body.classList.contains('feature-active'), src: document.getElementById('featureFrame').getAttribute('src') })
```
Expected: `{"featureActive":true,"src":"progress?embed=1"}`. Then `preview_eval` `history.back()` and confirm it returns to the home view (`featureActive:false`).

- [ ] **Step 5: Verify utility links still navigate (full page)**

`preview_eval`:
```js
(function(){ var a=Array.from(document.querySelectorAll('.sb-nav .nav-item')).find(function(x){return x.textContent.trim().indexOf('Settings')===0}); return { href:a.getAttribute('href'), target:a.target||'(none)' }; })()
```
Expected: `{ "href":"settings", "target":"(none)" }` — Settings is not a core feature, so the router leaves it alone and it navigates normally. (Optional: `preview_click` Settings and confirm the URL becomes `/settings` with the standalone app-shell.)

- [ ] **Step 6: Commit**

```bash
git add dashboard-router.js
git commit -m "feat: dashboard SPA router for inline feature loading"
```

---

## Task 5: End-to-end verification — cross-feature nav, session sync, theme/tier

**Files:** none (verification; only edit if a check fails).

- [ ] **Step 1: Cross-feature navigation stays embedded**

Navigate to `/dashboard#progress`. Inside the embedded Progress feature, find a link that points to a core feature (e.g. a "Start a round" / Gauntlet link). `preview_click` it (or, if it's inside the iframe and not directly clickable via the snapshot, `preview_eval`):
```js
document.getElementById('featureFrame').contentWindow.postMessage // sanity: bridge exists
```
Then verify the bridge by simulating: `preview_eval`:
```js
window.postMessage({type:'miclea:navigate', slug:'gauntlet'}, '*'); setTimeout(()=>{}, 0); 'sent'
```
Wait briefly, then `preview_eval` `location.hash` → expected `#gauntlet`, and `featureFrame` `src` is `gauntlet?embed=1`. (This confirms the parent's `message` listener + router.) 

> If a real in-iframe core-feature link exists, prefer clicking it and confirming the parent hash updates to that feature rather than navigating the iframe to a non-embed page.

- [ ] **Step 2: Session sync — completing a feature reflects on the dashboard**

`preview_eval` to confirm shared storage works across the iframe boundary:
```js
JSON.stringify({
  parent: (JSON.parse(localStorage.getItem('miclea_sessions'))||[]).length,
  frameSameOrigin: (function(){ try { return document.getElementById('featureFrame').contentWindow.localStorage === localStorage; } catch(e){ return 'cross-origin:'+e.message; } })()
})
```
Expected: `parent` is a number ≥ 1 and `frameSameOrigin:true` (same-origin → the embedded feature's `Miclea.addSession` writes to the same store the dashboard reads).

- [ ] **Step 3: Theme + tier apply inside the embed**

`preview_eval` set a tier and dark theme, then reload an embedded feature:
```js
localStorage.setItem('miclea_tier','ultra'); localStorage.setItem('miclea_theme','dark'); location.hash='#company-packs'; 'ok'
```
After the iframe loads, `preview_eval`:
```js
(function(){ var w=document.getElementById('featureFrame').contentWindow; return { dark: w.document.body.classList.contains('theme-dark'), tier: w.Miclea && w.Miclea.getTier() }; })()
```
Expected: `{ "dark":true, "tier":"ultra" }`. Reset afterward: `localStorage.setItem('miclea_theme','system')`.

- [ ] **Step 4: Standalone pages unaffected (regression check)**

Navigate directly to `/gauntlet` (no query). `preview_eval`:
```js
JSON.stringify({ rails: document.querySelectorAll('.rail,.sidebar').length, embed: document.body.classList.contains('embed') })
```
Expected: `{"rails":2,"embed":false}` — the standalone page still renders its full app-shell.

- [ ] **Step 5: Final proof**

`preview_screenshot` on `/dashboard#gauntlet` showing the feature inline within the dashboard shell. Share it as proof. No commit (verification only); if any step failed, fix the relevant file, re-sync to `/tmp/miclea-preview`, re-verify, and commit the fix.

---

## Self-Review notes (resolved)

- **Spec coverage:** scope (core features inline, utilities navigate) → Task 4 router `CORE` map + pass-through; history/hash → Task 4 Steps 3-4; embed mode without second shell → Tasks 1-2; standalone pages preserved → Task 1 Step 4 / Task 5 Step 4; in-iframe link bridge → Task 1 `wireEmbedLinks` + Task 4 `message` listener; session/theme/tier sync → Task 5; no deletions → none planned (matches "decide later"). `dashboard-v2.html` intentionally untouched.
- **Type/name consistency:** the seven `CORE` slugs are identical in `dashboard-router.js` and `app-shell.js`'s `wireEmbedLinks`; message contract is `{type:"miclea:navigate", slug}` on both sides; element ids `featureFrame` / `featureLoading` and classes `feature-active` / `embed` / `on` match across `dashboard.html`, CSS, and JS.
- **No placeholders:** all code blocks are complete and copy-pasteable.
