# Pricing Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pricing pop-up modal to `dashboard.html` that opens when the sidebar "Upgrade plan" link is clicked, shows all three tiers with a selectable card UI and single bottom CTA, and closes via the X button, backdrop click, or Escape key.

**Architecture:** All code is added inline to `dashboard.html` — CSS in the existing `<style>` block, HTML just before `</body>`, and JS appended inside the existing `<script>` block. No new files. All class names and IDs are prefixed with `pm-` to avoid collisions with existing dashboard styles.

**Tech Stack:** Vanilla HTML/CSS/JS — no frameworks, no dependencies.

---

## File Map

- **Modify:** `dashboard.html`
  - CSS appended before `</style>` at line 273
  - HTML appended before `</body>` at line 630
  - JS appended before `</script>` at line 629

---

## Task 1: Add Modal CSS

**Files:**
- Modify: `dashboard.html` (before `</style>` at line 273)

- [ ] **Step 1: Append modal CSS before `</style>`**

  Open `dashboard.html`. Find the closing `</style>` tag at line 273. Insert the following block immediately before it:

  ```css
  /* ── Pricing Modal ── */
  #pricing-modal{display:none;position:fixed;inset:0;z-index:9000;align-items:center;justify-content:center;padding:20px}
  #pricing-modal.pm-open{display:flex}
  .pm-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.52);backdrop-filter:blur(4px);opacity:0;transition:opacity .2s ease}
  #pricing-modal.pm-open .pm-backdrop{opacity:1}
  .pm-dialog{position:relative;z-index:1;background:#fff;border-radius:20px;width:100%;max-width:1040px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.22);padding:28px 32px 40px;opacity:0;transform:translateY(12px);transition:opacity .2s ease,transform .2s ease}
  #pricing-modal.pm-open .pm-dialog{opacity:1;transform:translateY(0)}
  .pm-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
  .pm-logo{height:30px;width:auto;display:block}
  .pm-close-btn{width:34px;height:34px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b7280;flex-shrink:0;padding:0}
  .pm-close-btn svg{width:15px;height:15px}
  .pm-title-block{text-align:center;margin-bottom:24px}
  .pm-modal-title{font-size:24px;font-weight:700;letter-spacing:-.5px;color:#111}
  .pm-modal-sub{font-size:14px;color:#6b7280;margin-top:5px}
  .pm-toggle-wrap{display:flex;justify-content:center;margin-bottom:28px}
  .pm-billing-toggle{display:inline-flex;align-items:center;background:#f5f5f5;border-radius:999px;padding:4px}
  .pm-bt-opt{font-size:13px;font-weight:500;padding:7px 18px;border-radius:999px;cursor:pointer;color:#6b7280;user-select:none;display:flex;align-items:center;gap:7px;transition:background .15s,color .15s,box-shadow .15s}
  .pm-bt-opt.active{background:#fff;color:#111;box-shadow:0 1px 4px rgba(0,0,0,.1)}
  .pm-bt-badge{background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px}
  .pm-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
  .pm-card{border-radius:16px;padding:28px 24px 24px;display:flex;flex-direction:column;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;position:relative;transition:border-color .2s,box-shadow .2s;user-select:none}
  .pm-card:not(.pm-card--current):hover{border-color:#93a4fb}
  .pm-card--selected{border:2px solid #1f40ed!important;box-shadow:0 0 0 4px rgba(31,64,237,.08)}
  .pm-card--current{cursor:default;opacity:.7}
  .pm-sel-dot{position:absolute;top:20px;right:20px;width:22px;height:22px;border-radius:50%;border:1.5px solid #d1d5db;background:#fff;display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s;flex-shrink:0}
  .pm-card--selected .pm-sel-dot{background:#1f40ed;border-color:#1f40ed}
  .pm-sel-dot svg{width:12px;height:12px;color:#fff;display:none}
  .pm-card--selected .pm-sel-dot svg{display:block}
  .pm-plan-name{font-size:22px;font-weight:700;color:#111;margin-bottom:6px;padding-right:28px}
  .pm-price{display:flex;align-items:baseline;gap:2px;margin-bottom:2px}
  .pm-price-dollar{font-size:18px;font-weight:600;padding-bottom:2px;color:#111}
  .pm-price-num{font-size:28px;font-weight:700;color:#111;letter-spacing:-.5px}
  .pm-price-period{font-size:13px;color:#9ca3af;font-weight:400;margin-left:2px}
  .pm-card--selected .pm-price-dollar,.pm-card--selected .pm-price-num{color:#1f40ed}
  .pm-billing-note{font-size:12px;color:#9ca3af;margin-bottom:18px}
  .pm-current-label{font-size:12px;color:#9ca3af;margin-bottom:18px;font-style:italic}
  .pm-card-divider{height:1px;background:#f0f0f0;margin-bottom:18px}
  .pm-features{list-style:none;display:flex;flex-direction:column;gap:10px;flex:1}
  .pm-features li{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:#374151;line-height:1.4}
  .pm-fi{flex:0 0 17px;height:17px;display:flex;align-items:center;justify-content:center;margin-top:1px}
  .pm-fi svg{width:14px;height:14px;color:#1f40ed}
  .pm-fi--lock{opacity:.35}
  .pm-fi--lock svg{width:12px;height:12px;color:#9ca3af}
  .pm-locked-text{opacity:.42}
  .pm-footer{display:flex;justify-content:center}
  .pm-cta-btn{background:#1f40ed;color:#fff;border:0;border-radius:12px;padding:15px 48px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s,box-shadow .15s;min-width:280px;text-align:center}
  .pm-cta-btn:hover{background:#1534c7;box-shadow:0 4px 16px rgba(31,64,237,.3)}
  ```

- [ ] **Step 2: Verify CSS is valid**

  Save the file. Open `dashboard.html` in the browser (or refresh if already open). The dashboard should look exactly the same — no visual changes yet, but DevTools → Elements should show the `#pricing-modal` styles in the stylesheet.

- [ ] **Step 3: Commit**

  ```bash
  git add dashboard.html
  git commit -m "feat: add pricing modal CSS to dashboard"
  ```

---

## Task 2: Add Modal HTML

**Files:**
- Modify: `dashboard.html` (before `</body>` at line 630)

- [ ] **Step 1: Append modal HTML before `</body>`**

  Find the `</body>` tag at line 630 of `dashboard.html`. Insert the following block immediately before it:

  ```html
  <!-- ── Pricing Modal ── -->
  <div id="pricing-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title">
    <div class="pm-backdrop"></div>
    <div class="pm-dialog">
      <div class="pm-topbar">
        <img class="pm-logo" src="images/logo.png" alt="Miclea">
        <button class="pm-close-btn" id="pm-close-btn" aria-label="Close pricing modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="pm-title-block">
        <div class="pm-modal-title" id="pm-title">Unlock your full potential</div>
        <div class="pm-modal-sub">Pick the plan that matches your ambition. Cancel anytime.</div>
      </div>
      <div class="pm-toggle-wrap">
        <div class="pm-billing-toggle">
          <div class="pm-bt-opt" id="pm-btn-monthly" onclick="pmSetBilling('monthly')">Monthly</div>
          <div class="pm-bt-opt active" id="pm-btn-annual" onclick="pmSetBilling('annual')">Annual <span class="pm-bt-badge">Save 20%</span></div>
        </div>
      </div>
      <div class="pm-cards">

        <!-- Free — current plan, not selectable -->
        <div class="pm-card pm-card--current" id="pm-card-free">
          <div class="pm-sel-dot">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
          </div>
          <div class="pm-plan-name">Free</div>
          <div class="pm-price">
            <span class="pm-price-dollar">$</span><span class="pm-price-num">0</span><span class="pm-price-period">/ month</span>
          </div>
          <div class="pm-current-label">Your current plan</div>
          <div class="pm-card-divider"></div>
          <ul class="pm-features">
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>1 Speed Round session</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>1 Gauntlet Round session</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Live transcript + instant scoring</span></li>
            <li><div class="pm-fi pm-fi--lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg></div><span class="pm-locked-text">Progress dashboard</span></li>
            <li><div class="pm-fi pm-fi--lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg></div><span class="pm-locked-text">Question Bank</span></li>
            <li><div class="pm-fi pm-fi--lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg></div><span class="pm-locked-text">Resume &amp; Cover Letter Editor</span></li>
          </ul>
        </div>

        <!-- Ultra — pre-selected -->
        <div class="pm-card pm-card--selected" id="pm-card-ultra" onclick="pmSelectPlan('ultra','Get Ultra')">
          <div class="pm-sel-dot">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
          </div>
          <div class="pm-plan-name">Ultra</div>
          <div class="pm-price">
            <span class="pm-price-dollar">$</span><span class="pm-price-num" id="pm-ultra-price">23</span><span class="pm-price-period">/ month</span>
          </div>
          <div class="pm-billing-note" id="pm-ultra-note">$278 billed annually</div>
          <div class="pm-card-divider"></div>
          <ul class="pm-features">
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span><strong>Unlimited</strong> Speed &amp; Gauntlet Rounds</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Full Question Bank — all roles &amp; senior</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span><strong>Company Packs</strong> — Amazon, Google, Goldman, Meta</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Unlimited Resume &amp; Cover Letter AI rewrites</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Advanced analytics &amp; session replay</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Priority AI — faster responses at peak hours</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Early access to new features</span></li>
          </ul>
        </div>

        <!-- Pro -->
        <div class="pm-card" id="pm-card-pro" onclick="pmSelectPlan('pro','Choose Pro')">
          <div class="pm-sel-dot">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>
          </div>
          <div class="pm-plan-name">Pro</div>
          <div class="pm-price">
            <span class="pm-price-dollar">$</span><span class="pm-price-num" id="pm-pro-price">15</span><span class="pm-price-period">/ month</span>
          </div>
          <div class="pm-billing-note" id="pm-pro-note">$182 billed annually</div>
          <div class="pm-card-divider"></div>
          <ul class="pm-features">
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span><strong>50</strong> Speed &amp; Gauntlet Rounds / month</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Full progress dashboard &amp; history</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Question Bank — core roles &amp; standard difficulty</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Resume Editor — 10 AI rewrites / month</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Cover Letter Editor — 10 AI generations / month</span></li>
            <li><div class="pm-fi"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8 6 11.5 13.5 4"/></svg></div><span>Week-over-week improvement tips</span></li>
          </ul>
        </div>

      </div><!-- /pm-cards -->

      <div class="pm-footer">
        <button class="pm-cta-btn" id="pm-cta-btn">Get Ultra</button>
      </div>
    </div><!-- /pm-dialog -->
  </div><!-- /pricing-modal -->
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add dashboard.html
  git commit -m "feat: add pricing modal HTML to dashboard"
  ```

---

## Task 3: Add Modal JavaScript

**Files:**
- Modify: `dashboard.html` (append inside `<script>` block before `</script>` at line 629)

- [ ] **Step 1: Append JS before the closing `</script>` tag**

  Find `</script>` at line 629. Insert the following block immediately before it (after the existing `drawLine` / `drawBars` code, still inside the IIFE or after it closes):

  ```javascript
  // ── Pricing Modal ──
  (function(){
    var modal = document.getElementById('pricing-modal');
    var closeBtn = document.getElementById('pm-close-btn');
    var ctaBtn = document.getElementById('pm-cta-btn');

    function openPricingModal() {
      pmSelectPlan('ultra', 'Get Ultra');
      pmSetBilling('annual');
      modal.classList.add('pm-open');
      document.body.style.overflow = 'hidden';
    }

    function closePricingModal() {
      modal.classList.remove('pm-open');
      document.body.style.overflow = '';
    }

    // Intercept the "Upgrade plan" sidebar link
    var upgradeLink = document.querySelector('.sb-pro a[href="pricing"]');
    if (upgradeLink) {
      upgradeLink.addEventListener('click', function(e) {
        e.preventDefault();
        openPricingModal();
      });
    }

    // Close via X button
    closeBtn.addEventListener('click', closePricingModal);

    // Close via backdrop click
    modal.addEventListener('click', function(e) {
      if (e.target === modal || e.target.classList.contains('pm-backdrop')) {
        closePricingModal();
      }
    });

    // Close via Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('pm-open')) {
        closePricingModal();
      }
    });

    // CTA — placeholder href until Stripe URLs are wired up
    ctaBtn.addEventListener('click', function() {
      window.location.href = '#';
    });
  })();

  function pmSetBilling(mode) {
    document.querySelectorAll('.pm-bt-opt').forEach(function(o) { o.classList.remove('active'); });
    document.getElementById('pm-btn-' + mode).classList.add('active');
    var annual = mode === 'annual';
    document.getElementById('pm-ultra-price').textContent = annual ? '23' : '29';
    document.getElementById('pm-ultra-note').textContent = annual ? '$278 billed annually' : 'Billed monthly';
    document.getElementById('pm-pro-price').textContent = annual ? '15' : '19';
    document.getElementById('pm-pro-note').textContent = annual ? '$182 billed annually' : 'Billed monthly';
  }

  function pmSelectPlan(plan, label) {
    document.querySelectorAll('.pm-card:not(.pm-card--current)').forEach(function(c) {
      c.classList.remove('pm-card--selected');
    });
    document.getElementById('pm-card-' + plan).classList.add('pm-card--selected');
    document.getElementById('pm-cta-btn').textContent = label;
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add dashboard.html
  git commit -m "feat: add pricing modal JS — open/close, billing toggle, card selection"
  ```

---

## Task 4: Verify in Browser

**Files:** None — manual verification only.

- [ ] **Step 1: Open dashboard in browser**

  Open `dashboard.html` in a browser (or use the local server at `python3 server.py`).

- [ ] **Step 2: Verify trigger**

  Click "Upgrade plan" in the sidebar bottom-left. Expected: modal fades in with blurred backdrop, Ultra card pre-selected, "Get Ultra" CTA, Annual billing active.

- [ ] **Step 3: Verify card selection**

  Click the Pro card. Expected: Pro card gets blue border + filled dot, CTA button text changes to "Choose Pro". Click Ultra again — it switches back.

- [ ] **Step 4: Verify billing toggle**

  Click "Monthly". Expected: Ultra price changes to $29, billing note → "Billed monthly"; Pro price → $19. Click "Annual" — prices return to $23/$15.

- [ ] **Step 5: Verify close — X button**

  Click the ✕ button. Expected: modal fades out, dashboard scrolling restored.

- [ ] **Step 6: Verify close — backdrop**

  Reopen modal, then click the dark area outside the white dialog. Expected: modal closes.

- [ ] **Step 7: Verify close — Escape**

  Reopen modal, then press Escape. Expected: modal closes.

- [ ] **Step 8: Verify reset on reopen**

  Open modal, select Pro, switch to Monthly, then close and reopen. Expected: Ultra is pre-selected again, Annual is active.

- [ ] **Step 9: Final commit**

  ```bash
  git add dashboard.html
  git commit -m "feat: pricing modal complete — triggers, cards, billing toggle, close"
  ```
