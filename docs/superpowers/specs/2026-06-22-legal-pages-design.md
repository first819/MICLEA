# Legal Pages Design — Privacy, Terms, Security

**Date:** 2026-06-22  
**Status:** Approved

## Overview

Create three standalone legal pages for Miclea AI: Privacy Policy, Terms of Service, and Security Policy. Update all existing `href="#"` footer legal links in `index.html` and `pricing.html` to point to these pages.

## Pages

| File | Title |
|------|-------|
| `privacy.html` | Privacy Policy — Miclea AI |
| `terms.html` | Terms of Service — Miclea AI |
| `security.html` | Security — Miclea AI |

## Layout & Styling

- **Background:** white (`#fff`)
- **Text:** black/near-black (`#111` / `#1a1a1a`)
- **Content column:** `max-width: 760px`, centered, `padding: 0 24px`
- **Nav:** Full site nav copied from `pricing.html` pattern (logo + center links + CTA buttons), same sticky header
- **Typography:** Inter font (already loaded via Google Fonts); `h1` for page title, `h2` for sections, `h3` for sub-sections, `p` for body
- **Page title area:** small eyebrow label + large serif title + "Last updated" date line
- **No decorative elements** — plain white, clean reading layout

## Section Content

### privacy.html
1. Introduction
2. Information We Collect
3. How We Use Your Information
4. Sharing Your Information
5. Data Retention
6. Your Rights
7. Cookies & Tracking
8. Contact Us

### terms.html
1. Acceptance of Terms
2. Description of Service
3. Account Registration
4. Acceptable Use
5. Intellectual Property
6. Disclaimers
7. Limitation of Liability
8. Termination
9. Governing Law
10. Contact Us

### security.html
1. Our Commitment
2. Infrastructure & Hosting
3. Data Encryption
4. Access Controls
5. Incident Response
6. Vulnerability Disclosure
7. Contact Us

## Footer (on each legal page)

Minimal footer with links to the other two policy pages + "Back to home". Matches the `#fff` background.

## Link Updates

- `index.html` footer `<a href="#">Privacy</a>` → `<a href="privacy.html">Privacy</a>`
- `index.html` footer `<a href="#">Terms</a>` → `<a href="terms.html">Terms</a>`
- `index.html` footer `<a href="#">Security</a>` → `<a href="security.html">Security</a>`
- `pricing.html` footer: same three updates

## Content Approach

Draft placeholder text written specifically for Miclea AI (AI-powered interview practice SaaS). Realistic boilerplate — not Lorem Ipsum. User will replace with final legal-reviewed copy before launch.
