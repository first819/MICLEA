# Nav Auth Buttons + Auto-Login Design

**Date:** 2026-06-22  
**Status:** Approved

## Summary

Add a "Get Started →" button to the nav (right of "Sign in"), styled to visually contrast it. Wire up Supabase auth so returning users who already have a session are auto-redirected to the dashboard on page load.

## Nav Changes

**File:** `index.html`

Two new CSS classes added alongside existing button styles:

```css
.btn-ghost {
  background: transparent;
  color: #111;
  border: 1px solid #d1d5db;
  padding: 8px 16px;
  font-size: 15px;
  font-weight: 500;
}
.btn-ghost:hover { background: rgba(0,0,0,.05); }

.btn-navy {
  background: rgba(13, 33, 137, 0.82);
  color: #fff;
  border: none;
  padding: 8px 16px;
  font-size: 15px;
  font-weight: 500;
}
.btn-navy:hover { background: rgba(13, 33, 137, 1); }
```

Replace the single `.nav-cta` anchor:

```html
<!-- Before -->
<div class="nav-cta">
  <a class="btn btn-dash" href="#">Sign in</a>
</div>

<!-- After -->
<div class="nav-cta">
  <a class="btn btn-ghost" href="#">Sign in</a>
  <a class="btn btn-navy" href="#">Get Started →</a>
</div>
```

Both `href="#"` — destination URLs wired up later.

## auth.js Module

**File:** `auth.js` (new, at project root)

Responsibilities:
1. Initialize the Supabase client using project URL and anon key (constants at top of file, clearly marked as config placeholders).
2. On `DOMContentLoaded`, call `supabase.auth.getSession()`.
3. If a session is found, call `window.location.replace('/dashboard')` — URL is a placeholder, swapped in when the app route is known.
4. Export the Supabase client so other pages can import it without re-initializing.

Uses Supabase JS loaded from CDN (`esm.sh` or `cdn.jsdelivr.net`) — no build step required for this static site.

## index.html Wire-up

Add one line to `<head>`:

```html
<script type="module" src="auth.js"></script>
```

Loads async — does not block page paint. Session check resolves in <200ms on a warm tab.

## Redirect Target

`/dashboard` is a placeholder. Update the constant in `auth.js` once the real app route is known.

## Out of Scope

- Sign in and Get Started link destinations (wired up later)
- Sign-up flow itself
- Nav state changes for logged-in users (e.g. swapping buttons to avatar/dashboard link) — redirect handles this for now
