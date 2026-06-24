# Dashboard inline feature loading — design

**Date:** 2026-06-24
**Status:** Approved, ready for implementation plan

## Problem

In `dashboard.html` (the current/new dashboard), clicking a feature in the sidebar
navigates to a separate page (e.g. `gauntlet.html`). Those feature pages render the
`app-shell.js` sidebar/topbar — a different shell from the dashboard's own — which the
user perceives as "the old dashboard UI." The user wants core features to load **inline**
inside the dashboard (no page change), keeping the dashboard's shell as the single nav.

## Context (as-is)

- `dashboard.html` is the live dashboard (`/dashboard` → `dashboard.html`; ~10 pages link
  to it). It is **self-contained**: its own inline `<style>` shell (DM Sans, custom
  tokens), its own hardcoded sidebar/topbar. It does **not** use `app-shell.js`/`.css`.
- Feature pages (`speed-round`, `gauntlet`, `progress`, `resume`, `cover-letter`,
  `question-bank`, `company-packs`, plus `settings`, `help`) are standalone HTML that load
  `tokens.css` + `app-shell.css` + `app-shell.js`. `app-shell.js` injects the rail +
  sidebar + topbar and exposes `window.Miclea` (tier/theme/sessions/toast/applyLocks).
- Every feature page has a uniform structure: page-specific inline `<style>`, a
  `<main class="content">…</main>` body, `<script src="app-shell.js">`, then a
  feature-init `<script>` that calls `window.Miclea.*`.
- `dashboard-v2.html` is a byte-for-byte identical, **unreferenced** duplicate of
  `dashboard.html`.
- The dashboard's inline styles and `app-shell.css` share **33 class names** (incl.
  `.card`, `.content`, `.pad`, `.badge`, `.card-*`). Loading `app-shell.css` into the
  dashboard document would clobber the dashboard's look — so the feature content cannot be
  injected into the dashboard document directly without CSS isolation.

## Decisions

- **Scope:** core features load inline — Speed Round, Gauntlet, Progress, Résumé, Cover
  Letter, Question Bank, Company Packs. Utility links (Settings, Help, Log out,
  Pricing/Upgrade) keep navigating as full pages.
- **History:** URL updates to `/dashboard#<feature>`; refresh restores the feature view;
  browser back/forward navigate between features. Shareable.
- **Standalone pages stay working** unchanged when visited directly (still render
  `app-shell`). The dashboard reuses them in an embed mode.
- **Deletion:** nothing deleted yet. After the flow is verified end-to-end, revisit
  `dashboard-v2.html` and the app-shell.
- **Approach:** lightweight **"embed mode" iframe** (chosen over fetch-and-inject because
  of the 33-class CSS collision, which makes in-document injection fragile on a no-build
  static site). Each feature renders in its own document — zero CSS bleed, full fidelity.

## Architecture

`dashboard.html` becomes a lightweight SPA host. Its shell (sidebar, topbar) and home
content are unchanged. A hidden `<iframe id="featureFrame">` fills the `.content` area when
a core feature is active; the home content shows when no feature is active.

### Components

1. **Router** — small inline script in `dashboard.html`.
   - `CORE_FEATURES`: the seven core feature slugs.
   - Intercepts clicks on sidebar nav items + home launcher cards whose `href` is a core
     feature → `preventDefault()`, `route(slug)`.
   - `route(slug)`:
     - `dashboard` or empty → restore home content, hide iframe, mark Dashboard nav active,
       clear hash, reset title.
     - otherwise → set `iframe.src = slug + '?embed=1'` (only if changed), hide home, show
       iframe with a loading state until the iframe's `load` event, mark the matching nav
       item `.active`, set `location.hash = '#' + slug`, set `document.title`.
   - Runs on initial load and on `hashchange` (drives refresh + back/forward).
   - Utility links (Settings, Help, Log out, Pricing) are **not** intercepted → normal
     full-page navigation.
   - Depends on: the dashboard DOM (sidebar links, `.content`, iframe) and `location.hash`.

2. **`app-shell.js` embed guard** — one branch in `mount()`.
   - When `new URLSearchParams(location.search).has('embed')` (or `<body data-embed>`):
     skip `buildRail` / `buildSidebar` / `buildTopbar` and the collapse/mobile handlers;
     add `body.classList.add('embed')`.
   - Still run `seedSessions / applyTheme / applyLocks / paintTierUI` and expose
     `window.Miclea`, so feature-init scripts and tier-gating work unchanged.
   - Non-embed loads behave exactly as today (no regression to standalone pages).
   - Depends on: `location.search`, `document.body`.

3. **`app-shell.css` embed rules** — additive.
   - `body.embed .main{margin-left:0}` and hide the (absent) topbar slot, so embedded
     content uses full width with no reserved sidebar gap.
   - Purely additive; no existing rule changes.

4. **In-iframe feature link bridge** — small handler active only in embed mode (in
   `app-shell.js` embed branch).
   - Same-origin links to a core feature get `?embed=1` appended (so following them keeps
     embed mode), and notify the parent via `postMessage` to sync `location.hash`.
   - Prevents falling back into the old app-shell when navigating between features from
     inside a feature.

### Data flow

- Click core feature → router sets iframe `src` to `slug?embed=1` and `#slug`.
- iframe loads the standalone feature page; `app-shell.js` sees `embed`, skips the shell,
  exposes `Miclea`, renders only `<main class="content">`.
- Feature reads/writes `localStorage` (`miclea_sessions`, `miclea_tier`, `miclea_theme`) —
  **same origin as the parent**, so dashboard streaks/sessions/tier stay in sync.
- Back/forward or refresh → `hashchange`/load → router restores the correct view.

### Error handling

- iframe fails to load (404/network): router shows an inline error state in `.content`
  with a "Back to dashboard" action; hash is reset to empty.
- Unknown/non-core hash on load: treated as `dashboard` (home view).
- `?embed=1` on a page without `app-shell.js`: no effect (param ignored) — safe.

## Out of scope

- No rewrite of feature page content.
- No deletion of `dashboard-v2.html` or app-shell yet (revisited after verification).
- No change to utility pages (Settings/Help/Pricing) navigation.
- No auto-resizing of the iframe to content height in v1 — the iframe fills the content
  viewport and scrolls internally (acceptable for full-height feature views).

## Verification

- Click each core feature from the dashboard → loads inline, no page navigation, dashboard
  sidebar remains, no second sidebar/flash.
- URL shows `#<feature>`; refresh stays on it; back/forward move between features and home.
- Settings/Help/Pricing still navigate as full pages.
- Visiting `/gauntlet` etc. directly still renders the standalone app-shell page (no
  regression).
- A completed Speed Round/Gauntlet inside the iframe updates `miclea_sessions` and is
  reflected on the dashboard / Progress.
- Theme and tier (free/pro/ultra) apply correctly inside the embedded feature.
