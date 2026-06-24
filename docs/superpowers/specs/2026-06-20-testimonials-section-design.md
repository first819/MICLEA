# Miclea AI — Testimonials Section Design

**Date:** 2026-06-20
**Status:** Approved

## Goal

Add a deep social-proof testimonials section to the Miclea AI landing page (`index.html`):
testimonials with real faces, headline numbers, and case-study snippets.

## Placement

Replaces the existing off-brand "Section 5: Trusted by world-class teams" (currently
stale Exa leftover content — Devin, HubSpot, "find the data they need"), which sits after
the Benchmarks section and before the Enterprise-grade security section. This is the
natural social-proof slot in the page flow.

## Layout (Direction A: stat bar + card grid)

1. **Eyebrow + headline** — uses existing `.ps-kicker` dash style and serif display font.
   Headline: "Loved by people who got the offer."
2. **Stat bar** — 3 headline numbers in serif, colored `--brand-default` (#1f40ed):
   - 12,000+ got hired
   - 3.2× more callbacks
   - 87% offer rate within 30 days
3. **Card grid** — 6 testimonial cards, responsive (3-col → 2-col → 1-col):
   - Real portrait photo (`i.pravatar.cc` / `randomuser.me` placeholders, swappable for real headshots)
   - Quote referencing real product features: Micl (the AI interviewer), Speed Round, the
     Gauntlet's curveball round, Progress & Insights
   - Name, role, company logo (Stripe, Google, Nvidia, Goldman, OpenAI, Anthropic — from the marquee set)
   - 2 of 6 cards carry an embedded mini-stat ("+18% comp negotiated", "5 final rounds
     failed before Miclea") — the case-study snippets
4. **Footer link** — "Read full case studies →" in the existing `.link-arrow` style.

## Style

- White section, reuses `section.light` shell.
- Cards: 1px #e5e7eb border, 12px radius, subtle hover lift.
- Serif (Arizona) for headline + numbers; sans (Diatype) for body.
- `--brand-default` for numbers and accents.
- New CSS scoped under a `.tm-*` namespace to avoid collisions.
- Dead `.testi` / `.metric` / `.hubspot` CSS from the replaced section is removed.
- No JavaScript required.

## Voice

Encouraging-but-honest coaching tone per the brand guide. Specific and slightly raw
("I'd bombed four final rounds…"), not generic praise.

## Out of scope

- Real customer data / legal review of quotes (placeholder content).
- CMS / dynamic loading — static HTML only.
