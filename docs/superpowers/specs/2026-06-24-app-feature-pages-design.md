# Miclea AI — App Feature Pages (Design Spec)

**Date:** 2026-06-24
**Status:** Approved (design), ready for implementation

## Goal
Build the 10 product features described in `Feautre/Miclea-Feature-Prompts.md` as front-end
HTML mockups, styled with the **landing page's exact design system** (`tokens.css`), and
linked into the existing `dashboard.html` sidebar. Interactive where it matters; no real
backend, auth, Stripe, STT, or LLM.

## Constraints
- **Do not modify** `tokens.css`, `index.html`, or the landing-page theme.
- Only change to `dashboard.html`: update sidebar `href`s to point at the new pages (no
  visual/theme changes).
- Reuse `tokens.css` for fonts (Arizona serif, ABCDiatype sans, Suisse mono), brand color
  `--brand-default #1f40ed`, cream/greige neutrals, 8px radii, motion tokens.

## Architecture
Two new shared files keep 10 pages DRY and consistent:

- **`app-shell.css`** — in-app chrome restyled in landing tokens: left sidebar (collapsible),
  topbar (search, streak chip, notifications, avatar), main content area on cream/white.
  Shared component classes: cards, pills/badges, buttons (`.btn-brand`, `.btn-ghost`),
  eyebrow labels, lock-overlay, toast.
- **`app-shell.js`** — sidebar collapse + mobile drawer (localStorage `miclea_sb`); mock
  **tier state** `miclea_tier` ∈ {free, pro, ultra} with helpers `getTier()`, `setTier()`,
  `requireTier(min)` that show/hide `.lock` overlays; tiny mock session store
  (`miclea_sessions`) seeded for Progress/Question Bank; `toast(msg)` helper.

Each page is a standalone `.html` that links `tokens.css` + `app-shell.css` + `app-shell.js`,
renders the shared sidebar/topbar, and contains its own page-specific CSS/JS inline.

### Shared sidebar nav (every app page + dashboard)
| Label | href |
|-------|------|
| Dashboard | dashboard.html |
| Speed Round (Practice Sessions) | speed-round.html |
| Gauntlet (Mock Interview) | gauntlet.html |
| Progress & Insights | progress.html |
| Résumé | resume.html |
| Cover Letter | cover-letter.html |
| Question Bank | question-bank.html |
| Company Packs | company-packs.html |
| Settings | settings.html |
| Help & Support | help.html |
| Upgrade CTA → | pricing.html |

## Tier gating (single source of truth)
`requireTier(min)` resolves `free<pro<ultra`. Below-min features render a blurred preview +
upgrade CTA (route to `pricing.html`), never raw data. Matrix per the prompt doc. Settings
includes a **tier switcher** so the whole app is demoable (flip free→pro→ultra, locks open).

## The 10 pages
1. **speed-round.html** — Setup (role select + mic-permission sim, ~3–5 min estimate) →
   Session (8–10 easy Qs, countdown ring, simulated live transcript, progress, auto-advance) →
   Results (count, light score, 2–3 tips, CTA to Gauntlet/retry). Energetic/gamified.
2. **gauntlet.html** — Setup → 3 rounds (Broad → Harder → Curveball), 2–3 Qs each →
   **enforced 30s break between rounds**, locked countdown persisted to localStorage
   (refresh/UI can't bypass) → Results: overall + per-round breakdown, behavioral radar,
   strengths/weaknesses. Serious/immersive.
3. **progress.html** — Headline metrics (interviews, avg, best, streak, hours); SVG trend
   line (filter Speed/Gauntlet); behavioral radar; AI strengths/weaknesses; session history
   table + detail drawer. **Ultra-locked**: advanced analytics, session replay, company-pack
   readiness — blurred previews + upgrade CTA. Base view available on pro.
4. **question-bank.html** — Search + filters (difficulty, type, "asked by me"), question
   grid, detail w/ past answer + feedback. **Free = paywall preview**; pro = core; ultra = all.
5. **resume.html** — Two-pane editor + live preview, Micl side panel with **accept/reject**
   suggestion cards, version switcher, export (PDF stub). Free locked; pro 10 edits/mo; ultra ∞.
6. **cover-letter.html** — Generate-from-inputs (role/company/JD) + same Micl accept/reject
   panel, live preview, versions, export. Same gating as résumé.
7. **settings.html** — Profile, email (verify-on-change sim), password (current-pw + strength),
   theme light/dark/system toggle (persisted), billing link, **tier switcher**. Inline
   validation + save toasts.
8. **help.html** — Searchable FAQ accordion + contact form (email prefilled) w/ confirmation.
9. **company-packs.html** — Pack cards (Amazon, Google, Meta, Microsoft, Goldman Sachs…) with
   "last updated", coming-soon placeholders, pack detail → Start session. **Ultra only**;
   lower tiers see locked previews + upgrade CTA.
10. **Subscription** — Reuse existing `pricing.html`; wire all upgrade CTAs to it.

## Out of scope (YAGNI)
Real backend/DB/RLS, Stripe Checkout/webhooks, real STT/TTS/LLM, real auth/email. Mic, AI
evaluation, transcripts, and data are simulated front-end mocks consistent with the repo's
existing prototype pages.

## Verification
Serve locally (`server.py`) and load each page in the preview: sidebar nav works across all
pages, Gauntlet break can't be skipped (incl. refresh), tier switcher opens/closes locks,
forms validate, charts/animations render. No console errors.
