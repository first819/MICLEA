# Nav Auth Buttons + Auto-Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ghost "Sign in" + translucent navy "Get Started →" button pair to the nav, and auto-redirect returning Supabase-authenticated users to `/dashboard` on page load.

**Architecture:** Two changes — (1) CSS + HTML update to `index.html` for the new button styles, (2) a new `auth.js` ES module that initializes Supabase and checks for an existing session on load, redirecting if found.

**Tech Stack:** Vanilla JS (ES modules), Supabase JS v2 via CDN (no build step).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `index.html` | Modify | Add `.btn-ghost` / `.btn-navy` CSS; replace `.nav-cta` anchor; add `<script type="module">` tag |
| `auth.js` | Create | Supabase client init + session check + redirect |

---

### Task 1: Add nav button CSS to index.html

**Files:**
- Modify: `index.html` (inside the `<style>` block, after the existing `.btn-dash:hover` rule at line ~30)

- [ ] **Step 1: Add the two new button classes**

Open `index.html`. Find the line:
```css
  .btn-dash:hover{background:#1a1a1a}
```
Insert immediately after it:
```css
  .btn-ghost{background:transparent;color:#111;padding:8px 16px;font-size:15px;font-weight:500;border:1px solid #d1d5db}
  .btn-ghost:hover{background:rgba(0,0,0,.05)}
  .btn-navy{background:rgba(13,33,137,0.82);color:#fff;padding:8px 16px;font-size:15px;font-weight:500;border:none}
  .btn-navy:hover{background:rgba(13,33,137,1)}
```

- [ ] **Step 2: Verify visually**

Open `http://127.0.0.1:8753/index.html` (or run `python3 server.py` first).  
No visible change yet — these classes are not used anywhere. That's expected.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "style: add btn-ghost and btn-navy CSS classes"
```

---

### Task 2: Replace nav-cta buttons in index.html

**Files:**
- Modify: `index.html` (~line 591)

- [ ] **Step 1: Replace the single Sign in anchor**

Find:
```html
    <div class="nav-cta">
      <a class="btn btn-dash" href="#">Sign in</a>
    </div>
```
Replace with:
```html
    <div class="nav-cta">
      <a class="btn btn-ghost" href="#">Sign in</a>
      <a class="btn btn-navy" href="#">Get Started &#8594;</a>
    </div>
```
(`&#8594;` is the `→` arrow character — use the HTML entity to avoid encoding issues.)

- [ ] **Step 2: Verify visually**

Reload `http://127.0.0.1:8753/index.html`.  
Expected: nav right side shows a ghost "Sign in" button (outline, transparent) and a dark navy "Get Started →" button side by side. Hovering ghost button shows a faint grey fill; hovering navy button deepens to full `#0d2189`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Get Started button to nav alongside Sign in"
```

---

### Task 3: Create auth.js with Supabase session check

**Files:**
- Create: `auth.js` (project root, same level as `index.html`)

- [ ] **Step 1: Get your Supabase project URL and anon key**

Go to your Supabase dashboard → project → Settings → API.  
You need:
- **Project URL** — looks like `https://xyzxyz.supabase.co`
- **anon public key** — long JWT string under "Project API keys"

If you haven't created a Supabase project yet, create one at supabase.com (free tier is fine for this stage).

- [ ] **Step 2: Create auth.js**

Create `/Users/first/Downloads/MICLEA/auth.js` with the following content, substituting your real values for the two constants:

```js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co'  // TODO: replace
const SUPABASE_ANON = 'YOUR_ANON_KEY'                     // TODO: replace
const DASHBOARD_URL = '/dashboard'                         // TODO: replace when app route is known

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    window.location.replace(DASHBOARD_URL)
  }
})
```

- [ ] **Step 3: Verify the module loads without errors**

Reload `http://127.0.0.1:8753/index.html`.  
Open browser DevTools → Console.  
Expected: no errors. (If Supabase URL/key are still placeholders, you'll see a network error — that's fine for now; the important thing is no JS syntax errors.)

- [ ] **Step 4: Commit**

```bash
git add auth.js
git commit -m "feat: add auth.js with Supabase session check and auto-redirect"
```

---

### Task 4: Wire auth.js into index.html

**Files:**
- Modify: `index.html` (`<head>` block, after the `<link rel="stylesheet">` line)

- [ ] **Step 1: Add the module script tag**

Find in `index.html`:
```html
<link rel="stylesheet" href="tokens.css">
```
Insert immediately after:
```html
<script type="module" src="auth.js"></script>
```

- [ ] **Step 2: Verify no page-load regression**

Reload `http://127.0.0.1:8753/index.html`.  
Expected: page loads normally, no redirect (no active session), no console errors.

- [ ] **Step 3: Verify auto-redirect works end-to-end**

To test the redirect path without a real user:
1. Open DevTools → Console.
2. Paste and run:
```js
// Simulate a stored session token (bypasses network call)
import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({ createClient }) => {
  const sb = createClient('https://YOUR_PROJECT.supabase.co', 'YOUR_ANON_KEY')
  // Sign in with a test user first (requires a real Supabase user to exist):
  // sb.auth.signInWithPassword({ email: 'test@example.com', password: 'testpass' })
  sb.auth.getSession().then(({ data }) => console.log('session:', data.session))
})
```
If you have a real Supabase project and a test user, sign in once, then reload the page — you should be redirected to `/dashboard`.  
If no project yet, skip this step and revisit when Supabase is configured.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: wire auth.js module into index.html for auto-login on load"
```

---

## Done

At this point:
- The nav shows ghost "Sign in" + navy "Get Started →" on every page load
- Returning users with an active Supabase session are auto-redirected to `/dashboard`
- `auth.js` exports `supabase` so other pages can `import { supabase } from './auth.js'` without re-initializing the client

**Next steps (out of scope for this plan):**
- Replace `href="#"` on both nav buttons with real sign-in / sign-up URLs
- Replace `DASHBOARD_URL` constant with the real app route
- Apply the same `<script type="module" src="auth.js">` tag to `pricing.html` and other pages as needed
