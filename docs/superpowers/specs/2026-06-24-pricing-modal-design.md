# Pricing Modal — Design Spec

**Date:** 2026-06-24  
**Status:** Approved  
**Scope:** `dashboard.html` only

---

## Overview

When the "Upgrade plan" link in the dashboard sidebar is clicked, a modal dialog opens in place of navigating to `pricing.html`. The modal shows all three pricing tiers (Free, Pro, Ultra), a monthly/annual billing toggle, and a single bottom CTA button that updates based on the selected plan. Clicking a CTA navigates to Stripe checkout (URLs to be wired up later).

---

## Trigger

- Element: `<a href="pricing">Upgrade plan</a>` inside `.sb-foot .sb-pro` in `dashboard.html`
- Behavior: `preventDefault()` on click → call `openPricingModal()`
- No changes to any other file

---

## Modal Structure

```
┌─────────────────────────────────────────────────────┐
│  [Logo]                                         [✕] │  ← pm-topbar
│                                                     │
│           Unlock your full potential                │  ← pm-title-block (centered)
│     Pick the plan that matches your ambition.       │
│                  Cancel anytime.                    │
│                                                     │
│              [ Monthly ]  [ Annual ✓ ]              │  ← billing toggle
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Free    │  │  Ultra   │  │  Pro     │         │  ← pm-cards (3-col grid)
│  │ (current)│  │ (selected│  │          │         │
│  │          │  │  default)│  │          │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│                  [ Get Ultra ]                      │  ← pm-cta-btn
└─────────────────────────────────────────────────────┘
```

---

## Layout & Visual Details

### Top bar (`pm-topbar`)
- Miclea logo (`images/logo.png`, height 30px) — left
- Close button (✕, 34×34px, rounded border) — right
- `justify-content: space-between`

### Title block (`pm-title-block`)
- `text-align: center`
- Title: "Unlock your full potential" — 24px, 700 weight
- Subtitle: "Pick the plan that matches your ambition. Cancel anytime." — 14px, muted

### Billing toggle
- Centered, pill style matching `pricing.html`
- Two options: Monthly / Annual (Annual active by default, "Save 20%" badge)
- Switching updates prices and billing notes on Pro and Ultra cards

### Cards grid (`pm-cards`)
- 3-column CSS grid, 16px gap
- Cards are selectable (click → blue border + filled dot indicator in top-right)
- Ultra pre-selected on open
- Free card: `cursor: default`, greyed out, not selectable, shows "Your current plan"

### Card content (each card)
- Selection dot (22×22px circle, top-right): empty ring → filled blue with checkmark when selected
- Plan name, price (dollar + number + period), billing note
- Divider line
- Feature list with check icons (locked features use lock icon at 35% opacity)
- Selected card: price color changes to brand blue (`#2043f9`)

### Copy

| Card  | Tagline (not shown in modal, omitted for brevity) | CTA label |
|-------|--------------------------------------------------|-----------|
| Free  | — | "Your current plan" (non-interactive) |
| Ultra | pre-selected | "Get Ultra" |
| Pro   | — | "Choose Pro" |

### Bottom CTA (`pm-cta-btn`)
- Single centered button, full brand blue (`#2043f9`), 280px min-width
- Text: `"Get Ultra"` by default; updates to `"Choose Pro"` when Pro is selected
- On click: navigates to Stripe checkout URL (placeholder `#` until wired up)

---

## Behavior

| Action | Result |
|--------|--------|
| Click "Upgrade plan" link | Modal opens, backdrop appears |
| Click ✕ button | Modal closes |
| Click backdrop | Modal closes |
| Press Escape | Modal closes |
| Click Ultra card | Ultra selected, CTA → "Get Ultra" |
| Click Pro card | Pro selected, CTA → "Choose Pro" |
| Click Free card | No effect (current plan) |
| Toggle billing | Prices update: Ultra $29→$23/mo, Pro $19→$15/mo (annual) |
| Click CTA button | Navigate to `#` (Stripe URL placeholder) |

---

## Animation

- Backdrop: fade in (opacity 0→1, 200ms)
- Dialog: fade in + translate up 12px→0 (200ms, ease-out)
- Close: reverse of open

---

## Implementation Location

All code (HTML, CSS, JS) goes inline in `dashboard.html`:
- CSS: new `<style>` block (or appended to existing one)
- HTML: modal markup just before `</body>`
- JS: appended to existing `<script>` block (or new block before `</body>`)

No new files created.

---

## Prices

| Plan  | Monthly | Annual (per month) | Annual total |
|-------|---------|-------------------|--------------|
| Free  | $0      | $0                | —            |
| Pro   | $19     | $15               | $182         |
| Ultra | $29     | $23               | $278         |

---

## Out of Scope

- Actual Stripe integration (future)
- `dashboard-v2.html` (excluded by user)
- Mobile/responsive breakpoints (follow-up)
