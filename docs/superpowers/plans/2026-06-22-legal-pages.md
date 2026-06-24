# Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create three standalone legal pages (Privacy, Terms, Security) and wire up existing `href="#"` footer links in `index.html` and `pricing.html`.

**Architecture:** Three self-contained HTML files sharing the same nav/footer pattern as `pricing.html`. Each page has a minimal white layout with a centered 760px reading column. No JavaScript required.

**Tech Stack:** Plain HTML, CSS (inline `<style>`), tokens.css (already in repo)

---

### Task 1: Create privacy.html

**Files:**
- Create: `privacy.html`

- [ ] **Step 1: Create the file with this exact content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — Miclea AI</title>
<link rel="icon" type="image/png" sizes="32x32" href="favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="favicon-180.png">
<link rel="stylesheet" href="tokens.css">
<style>
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  a{text-decoration:none;color:inherit}
  body{overflow-x:hidden;background:#fff;color:#111}

  .wrap-wide{max-width:1280px;margin:0 auto;padding:0 24px}

  /* Nav */
  header.nav{position:sticky;top:0;z-index:60;height:var(--nav-height);background:#fff;display:flex;
    align-items:center;border-bottom:1px solid #f0f0f0}
  .nav .wrap-wide{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;width:100%}
  .nav .wrap-wide .nav-logo{justify-self:start;display:flex;align-items:center}
  .nav .wrap-wide .nav-logo img{height:34px;width:auto;display:block}
  .nav .wrap-wide nav.center{justify-self:center}
  .nav .wrap-wide .nav-cta{justify-self:end}
  nav.center{display:flex;gap:30px;align-items:center}
  nav.center a{font-family:var(--font-family-sans);font-weight:500;font-size:16px;
    color:var(--text-light-default);display:inline-flex;align-items:center;gap:5px;
    padding:5px 10px;border-radius:6px;transition:background .15s,color .15s}
  nav.center a:hover{background:rgba(0,0,0,.06)}
  nav.center a .caret{font-size:9px;color:#9ca3af;margin-left:1px}
  .nav-cta{display:flex;gap:10px;align-items:center}
  .btn{display:inline-flex;align-items:center;justify-content:center;border:0;cursor:pointer;
    border-radius:4px;font-family:var(--font-family-sans);
    transition:background .15s,color .15s}
  .btn-dash{background:#000;color:#fff;padding:9px 16px;font-size:15px;font-weight:500}
  .btn-dash:hover{background:#1a1a1a}
  .hamburger{display:none;width:32px;height:32px;border:0;background:none;cursor:pointer;
    align-items:center;justify-content:center}
  .hamburger svg{width:22px;height:22px}

  /* Content */
  .legal-wrap{max-width:760px;margin:0 auto;padding:72px 24px 96px}
  .legal-label{font-family:var(--font-family-sans);font-size:12px;font-weight:500;
    letter-spacing:1.4px;text-transform:uppercase;color:#6b7280;margin-bottom:16px}
  .legal-wrap h1{font-family:var(--font-family-serif);font-weight:400;font-size:clamp(32px,4vw,52px);
    line-height:1.08;letter-spacing:-1.5px;color:#111;margin:0 0 12px}
  .legal-updated{font-size:14px;color:#6b7280;margin-bottom:56px}
  .legal-wrap h2{font-family:var(--font-family-sans);font-size:18px;font-weight:600;
    color:#111;margin:48px 0 12px;padding-top:48px;border-top:1px solid #e5e7eb}
  .legal-wrap h2:first-of-type{margin-top:0;padding-top:0;border-top:none}
  .legal-wrap h3{font-family:var(--font-family-sans);font-size:15px;font-weight:600;
    color:#111;margin:28px 0 8px}
  .legal-wrap p{font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px}
  .legal-wrap ul{font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px;
    padding-left:24px}
  .legal-wrap ul li{margin-bottom:6px}
  .legal-wrap a{color:var(--brand-default);text-decoration:underline;text-underline-offset:2px}
  .legal-wrap a:hover{opacity:.8}

  /* Footer */
  .legal-footer{border-top:1px solid #e5e7eb;padding:32px 24px;text-align:center}
  .legal-footer-links{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;
    font-size:14px;color:#6b7280}
  .legal-footer-links a{color:#6b7280}
  .legal-footer-links a:hover{color:#111}
  .legal-footer-copy{margin-top:12px;font-size:13px;color:#9ca3af}

  @media(max-width:640px){
    nav.center,.nav-cta{display:none}
    .hamburger{display:flex}
  }
</style>
</head>
<body>

<header class="nav">
  <div class="wrap-wide">
    <a class="nav-logo" href="index.html" aria-label="Miclea home">
      <img src="images/logo.png" alt="Miclea">
    </a>
    <nav class="center">
      <a href="#">Products <span class="caret">&#9662;</span></a>
      <div class="nav-dd">
        <a class="nav-dd__trigger" href="#">Resources <span class="caret">&#9662;</span></a>
        <div class="nav-dd__menu" role="menu" aria-label="Resources">
          <a href="job-seekers.html" role="menuitem"><span class="nav-dd__t">Job seekers</span><span class="nav-dd__d">Land more callbacks and offers, faster</span></a>
          <a href="bootcamps.html" role="menuitem"><span class="nav-dd__t">Bootcamps</span><span class="nav-dd__d">Lift cohort placement rates</span></a>
          <a href="career-centers.html" role="menuitem"><span class="nav-dd__t">Career centers</span><span class="nav-dd__d">Coach more students with less staff</span></a>
          <a href="universities.html" role="menuitem"><span class="nav-dd__t">Universities</span><span class="nav-dd__d">Raise graduate employment outcomes</span></a>
          <a href="teams.html" role="menuitem"><span class="nav-dd__t">Teams</span><span class="nav-dd__d">Prep employees for internal moves</span></a>
        </div>
      </div>
      <a href="pricing.html">Pricing</a>
      <a href="#">Blog</a>
      <a href="#">About</a>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-dash" href="#">Log in</a>
    </div>
    <button class="hamburger" aria-label="Open menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
</header>

<main class="legal-wrap">
  <p class="legal-label">Legal</p>
  <h1>Privacy Policy</h1>
  <p class="legal-updated">Last updated: June 22, 2026</p>

  <h2>Introduction</h2>
  <p>Miclea AI, Inc. ("Miclea," "we," "our," or "us") is committed to protecting your personal information. This Privacy Policy explains what data we collect when you use our AI-powered interview practice platform, how we use it, and the choices you have. By using Miclea, you agree to the practices described here.</p>

  <h2>Information We Collect</h2>
  <h3>Information you provide</h3>
  <ul>
    <li><strong>Account data:</strong> name, email address, and password when you register.</li>
    <li><strong>Profile data:</strong> resume, target roles, and experience level you add to personalize practice sessions.</li>
    <li><strong>Session content:</strong> your spoken and written answers during practice interviews, which we use to generate scores and feedback.</li>
    <li><strong>Payment data:</strong> billing details collected and processed by our payment provider (Stripe); we do not store raw card numbers.</li>
    <li><strong>Communications:</strong> messages you send to our support team.</li>
  </ul>
  <h3>Information collected automatically</h3>
  <ul>
    <li><strong>Usage data:</strong> pages visited, features used, session duration, and click patterns.</li>
    <li><strong>Device data:</strong> browser type, operating system, IP address, and referring URL.</li>
    <li><strong>Cookies and similar technologies:</strong> see the Cookies section below.</li>
  </ul>

  <h2>How We Use Your Information</h2>
  <p>We use the information we collect to:</p>
  <ul>
    <li>Provide, operate, and improve the Miclea platform and its AI coaching features.</li>
    <li>Generate personalized interview scores, feedback, and recommendations.</li>
    <li>Process payments and manage your subscription.</li>
    <li>Send transactional emails (receipts, password resets, usage summaries).</li>
    <li>Send marketing emails where you have opted in — you can unsubscribe at any time.</li>
    <li>Monitor for fraud, abuse, and security incidents.</li>
    <li>Comply with legal obligations.</li>
  </ul>
  <p>We do not sell your personal data to third parties.</p>

  <h2>Sharing Your Information</h2>
  <p>We share your data only with:</p>
  <ul>
    <li><strong>Service providers</strong> who help us operate Miclea (cloud hosting, payment processing, analytics, email delivery) under strict data-processing agreements.</li>
    <li><strong>AI model providers</strong> who process your session content to generate feedback. Data is not used to train external models without your explicit consent.</li>
    <li><strong>Law enforcement or regulators</strong> when required by law or to protect the safety of our users.</li>
    <li><strong>Acquirers</strong> in the event of a merger, acquisition, or sale of assets, where the acquiring party agrees to honor this policy.</li>
  </ul>

  <h2>Data Retention</h2>
  <p>We retain your account data for as long as your account is active. Session recordings and transcripts are retained for 12 months by default; you can delete individual sessions at any time from your dashboard. After account deletion, we purge personal data within 30 days, except where we are required by law to retain it longer.</p>

  <h2>Your Rights</h2>
  <p>Depending on where you live, you may have the right to:</p>
  <ul>
    <li>Access the personal data we hold about you.</li>
    <li>Correct inaccurate data.</li>
    <li>Request deletion of your data ("right to be forgotten").</li>
    <li>Object to or restrict certain processing.</li>
    <li>Export your data in a portable format.</li>
  </ul>
  <p>To exercise any of these rights, email us at <a href="mailto:privacy@miclea.ai">privacy@miclea.ai</a>. We will respond within 30 days.</p>

  <h2>Cookies &amp; Tracking</h2>
  <p>We use cookies and similar technologies to keep you logged in, remember your preferences, and understand how the product is used. You can control cookies through your browser settings. Disabling cookies may affect some features of the platform. We do not respond to Do Not Track signals at this time.</p>

  <h2>Contact Us</h2>
  <p>If you have questions about this policy or your data, contact our privacy team at <a href="mailto:privacy@miclea.ai">privacy@miclea.ai</a> or write to:</p>
  <p>Miclea AI, Inc.<br>Privacy Team<br>New York, NY, USA</p>
</main>

<footer class="legal-footer">
  <nav class="legal-footer-links" aria-label="Legal pages">
    <a href="privacy.html">Privacy</a>
    <a href="terms.html">Terms</a>
    <a href="security.html">Security</a>
    <a href="index.html">← Back to home</a>
  </nav>
  <p class="legal-footer-copy">© 2026 Miclea AI, Inc. All rights reserved.</p>
</footer>

</body>
</html>
```

- [ ] **Step 2: Verify the file opens correctly**

Open `privacy.html` in a browser. Confirm: white background, black text, nav with logo, full policy content.

- [ ] **Step 3: Commit**

```bash
git add privacy.html
git commit -m "feat: add Privacy Policy page"
```

---

### Task 2: Create terms.html

**Files:**
- Create: `terms.html`

- [ ] **Step 1: Create the file with this exact content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Terms of Service — Miclea AI</title>
<link rel="icon" type="image/png" sizes="32x32" href="favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="favicon-180.png">
<link rel="stylesheet" href="tokens.css">
<style>
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  a{text-decoration:none;color:inherit}
  body{overflow-x:hidden;background:#fff;color:#111}

  .wrap-wide{max-width:1280px;margin:0 auto;padding:0 24px}

  /* Nav */
  header.nav{position:sticky;top:0;z-index:60;height:var(--nav-height);background:#fff;display:flex;
    align-items:center;border-bottom:1px solid #f0f0f0}
  .nav .wrap-wide{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;width:100%}
  .nav .wrap-wide .nav-logo{justify-self:start;display:flex;align-items:center}
  .nav .wrap-wide .nav-logo img{height:34px;width:auto;display:block}
  .nav .wrap-wide nav.center{justify-self:center}
  .nav .wrap-wide .nav-cta{justify-self:end}
  nav.center{display:flex;gap:30px;align-items:center}
  nav.center a{font-family:var(--font-family-sans);font-weight:500;font-size:16px;
    color:var(--text-light-default);display:inline-flex;align-items:center;gap:5px;
    padding:5px 10px;border-radius:6px;transition:background .15s,color .15s}
  nav.center a:hover{background:rgba(0,0,0,.06)}
  nav.center a .caret{font-size:9px;color:#9ca3af;margin-left:1px}
  .nav-cta{display:flex;gap:10px;align-items:center}
  .btn{display:inline-flex;align-items:center;justify-content:center;border:0;cursor:pointer;
    border-radius:4px;font-family:var(--font-family-sans);
    transition:background .15s,color .15s}
  .btn-dash{background:#000;color:#fff;padding:9px 16px;font-size:15px;font-weight:500}
  .btn-dash:hover{background:#1a1a1a}
  .hamburger{display:none;width:32px;height:32px;border:0;background:none;cursor:pointer;
    align-items:center;justify-content:center}
  .hamburger svg{width:22px;height:22px}

  /* Content */
  .legal-wrap{max-width:760px;margin:0 auto;padding:72px 24px 96px}
  .legal-label{font-family:var(--font-family-sans);font-size:12px;font-weight:500;
    letter-spacing:1.4px;text-transform:uppercase;color:#6b7280;margin-bottom:16px}
  .legal-wrap h1{font-family:var(--font-family-serif);font-weight:400;font-size:clamp(32px,4vw,52px);
    line-height:1.08;letter-spacing:-1.5px;color:#111;margin:0 0 12px}
  .legal-updated{font-size:14px;color:#6b7280;margin-bottom:56px}
  .legal-wrap h2{font-family:var(--font-family-sans);font-size:18px;font-weight:600;
    color:#111;margin:48px 0 12px;padding-top:48px;border-top:1px solid #e5e7eb}
  .legal-wrap h2:first-of-type{margin-top:0;padding-top:0;border-top:none}
  .legal-wrap h3{font-family:var(--font-family-sans);font-size:15px;font-weight:600;
    color:#111;margin:28px 0 8px}
  .legal-wrap p{font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px}
  .legal-wrap ul{font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px;
    padding-left:24px}
  .legal-wrap ul li{margin-bottom:6px}
  .legal-wrap a{color:var(--brand-default);text-decoration:underline;text-underline-offset:2px}
  .legal-wrap a:hover{opacity:.8}

  /* Footer */
  .legal-footer{border-top:1px solid #e5e7eb;padding:32px 24px;text-align:center}
  .legal-footer-links{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;
    font-size:14px;color:#6b7280}
  .legal-footer-links a{color:#6b7280}
  .legal-footer-links a:hover{color:#111}
  .legal-footer-copy{margin-top:12px;font-size:13px;color:#9ca3af}

  @media(max-width:640px){
    nav.center,.nav-cta{display:none}
    .hamburger{display:flex}
  }
</style>
</head>
<body>

<header class="nav">
  <div class="wrap-wide">
    <a class="nav-logo" href="index.html" aria-label="Miclea home">
      <img src="images/logo.png" alt="Miclea">
    </a>
    <nav class="center">
      <a href="#">Products <span class="caret">&#9662;</span></a>
      <div class="nav-dd">
        <a class="nav-dd__trigger" href="#">Resources <span class="caret">&#9662;</span></a>
        <div class="nav-dd__menu" role="menu" aria-label="Resources">
          <a href="job-seekers.html" role="menuitem"><span class="nav-dd__t">Job seekers</span><span class="nav-dd__d">Land more callbacks and offers, faster</span></a>
          <a href="bootcamps.html" role="menuitem"><span class="nav-dd__t">Bootcamps</span><span class="nav-dd__d">Lift cohort placement rates</span></a>
          <a href="career-centers.html" role="menuitem"><span class="nav-dd__t">Career centers</span><span class="nav-dd__d">Coach more students with less staff</span></a>
          <a href="universities.html" role="menuitem"><span class="nav-dd__t">Universities</span><span class="nav-dd__d">Raise graduate employment outcomes</span></a>
          <a href="teams.html" role="menuitem"><span class="nav-dd__t">Teams</span><span class="nav-dd__d">Prep employees for internal moves</span></a>
        </div>
      </div>
      <a href="pricing.html">Pricing</a>
      <a href="#">Blog</a>
      <a href="#">About</a>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-dash" href="#">Log in</a>
    </div>
    <button class="hamburger" aria-label="Open menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
</header>

<main class="legal-wrap">
  <p class="legal-label">Legal</p>
  <h1>Terms of Service</h1>
  <p class="legal-updated">Last updated: June 22, 2026</p>

  <h2>Acceptance of Terms</h2>
  <p>By creating an account or using the Miclea AI platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.</p>

  <h2>Description of Service</h2>
  <p>Miclea AI provides an AI-powered interview practice platform that allows users to rehearse job interviews, receive automated scoring and feedback, and track improvement over time. Features may change as we improve the product. We will notify you of material changes.</p>

  <h2>Account Registration</h2>
  <p>You must provide accurate information when creating your account and keep it up to date. You are responsible for all activity that occurs under your account. Keep your password confidential and notify us immediately at <a href="mailto:support@miclea.ai">support@miclea.ai</a> if you suspect unauthorized access.</p>
  <p>You must be at least 16 years old to use the Service. Users under 18 must have parental or guardian consent.</p>

  <h2>Acceptable Use</h2>
  <p>You agree not to:</p>
  <ul>
    <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
    <li>Upload content that is defamatory, obscene, harassing, or infringes third-party rights.</li>
    <li>Attempt to reverse-engineer, scrape, or extract data from the platform at scale.</li>
    <li>Use automated tools to access the Service beyond normal user interaction.</li>
    <li>Share your account credentials with others or resell access to the Service.</li>
    <li>Interfere with or disrupt the integrity or performance of the Service.</li>
  </ul>

  <h2>Intellectual Property</h2>
  <p>Miclea AI and its licensors own all rights in the Service, including the software, AI models, design, and content we provide. Nothing in these Terms grants you ownership of any part of the Service.</p>
  <p>You retain ownership of content you upload (resumes, answers, recordings). By uploading content, you grant Miclea a limited license to use it solely to provide and improve the Service for you.</p>

  <h2>Subscriptions &amp; Payments</h2>
  <p>Paid plans are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as stated in our refund policy. We reserve the right to change pricing with 30 days' notice to subscribers. Continued use after a price change constitutes acceptance.</p>

  <h2>Disclaimers</h2>
  <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that interview practice using Miclea will result in job offers or any particular employment outcome. AI-generated feedback is for practice purposes only and is not professional career advice.</p>

  <h2>Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, Miclea AI will not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits or lost data, arising out of or related to your use of the Service. Our total liability to you for any claim will not exceed the amount you paid us in the 12 months preceding the claim.</p>

  <h2>Termination</h2>
  <p>We may suspend or terminate your account at any time if you violate these Terms or if we decide to discontinue the Service. You may cancel your account at any time from your account settings. Upon termination, your right to use the Service ends immediately.</p>

  <h2>Governing Law</h2>
  <p>These Terms are governed by the laws of the State of New York, USA, without regard to conflict-of-law principles. Any disputes will be resolved in the state or federal courts located in New York County, New York, and you consent to personal jurisdiction there.</p>

  <h2>Contact Us</h2>
  <p>Questions about these Terms? Email us at <a href="mailto:legal@miclea.ai">legal@miclea.ai</a> or write to:</p>
  <p>Miclea AI, Inc.<br>Legal Team<br>New York, NY, USA</p>
</main>

<footer class="legal-footer">
  <nav class="legal-footer-links" aria-label="Legal pages">
    <a href="privacy.html">Privacy</a>
    <a href="terms.html">Terms</a>
    <a href="security.html">Security</a>
    <a href="index.html">← Back to home</a>
  </nav>
  <p class="legal-footer-copy">© 2026 Miclea AI, Inc. All rights reserved.</p>
</footer>

</body>
</html>
```

- [ ] **Step 2: Verify the file opens correctly**

Open `terms.html` in a browser. Confirm: white background, black text, nav with logo, all Terms sections present.

- [ ] **Step 3: Commit**

```bash
git add terms.html
git commit -m "feat: add Terms of Service page"
```

---

### Task 3: Create security.html

**Files:**
- Create: `security.html`

- [ ] **Step 1: Create the file with this exact content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Security — Miclea AI</title>
<link rel="icon" type="image/png" sizes="32x32" href="favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="favicon-180.png">
<link rel="stylesheet" href="tokens.css">
<style>
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  a{text-decoration:none;color:inherit}
  body{overflow-x:hidden;background:#fff;color:#111}

  .wrap-wide{max-width:1280px;margin:0 auto;padding:0 24px}

  /* Nav */
  header.nav{position:sticky;top:0;z-index:60;height:var(--nav-height);background:#fff;display:flex;
    align-items:center;border-bottom:1px solid #f0f0f0}
  .nav .wrap-wide{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;width:100%}
  .nav .wrap-wide .nav-logo{justify-self:start;display:flex;align-items:center}
  .nav .wrap-wide .nav-logo img{height:34px;width:auto;display:block}
  .nav .wrap-wide nav.center{justify-self:center}
  .nav .wrap-wide .nav-cta{justify-self:end}
  nav.center{display:flex;gap:30px;align-items:center}
  nav.center a{font-family:var(--font-family-sans);font-weight:500;font-size:16px;
    color:var(--text-light-default);display:inline-flex;align-items:center;gap:5px;
    padding:5px 10px;border-radius:6px;transition:background .15s,color .15s}
  nav.center a:hover{background:rgba(0,0,0,.06)}
  nav.center a .caret{font-size:9px;color:#9ca3af;margin-left:1px}
  .nav-cta{display:flex;gap:10px;align-items:center}
  .btn{display:inline-flex;align-items:center;justify-content:center;border:0;cursor:pointer;
    border-radius:4px;font-family:var(--font-family-sans);
    transition:background .15s,color .15s}
  .btn-dash{background:#000;color:#fff;padding:9px 16px;font-size:15px;font-weight:500}
  .btn-dash:hover{background:#1a1a1a}
  .hamburger{display:none;width:32px;height:32px;border:0;background:none;cursor:pointer;
    align-items:center;justify-content:center}
  .hamburger svg{width:22px;height:22px}

  /* Content */
  .legal-wrap{max-width:760px;margin:0 auto;padding:72px 24px 96px}
  .legal-label{font-family:var(--font-family-sans);font-size:12px;font-weight:500;
    letter-spacing:1.4px;text-transform:uppercase;color:#6b7280;margin-bottom:16px}
  .legal-wrap h1{font-family:var(--font-family-serif);font-weight:400;font-size:clamp(32px,4vw,52px);
    line-height:1.08;letter-spacing:-1.5px;color:#111;margin:0 0 12px}
  .legal-updated{font-size:14px;color:#6b7280;margin-bottom:56px}
  .legal-wrap h2{font-family:var(--font-family-sans);font-size:18px;font-weight:600;
    color:#111;margin:48px 0 12px;padding-top:48px;border-top:1px solid #e5e7eb}
  .legal-wrap h2:first-of-type{margin-top:0;padding-top:0;border-top:none}
  .legal-wrap h3{font-family:var(--font-family-sans);font-size:15px;font-weight:600;
    color:#111;margin:28px 0 8px}
  .legal-wrap p{font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px}
  .legal-wrap ul{font-size:16px;line-height:1.7;color:#374151;margin:0 0 16px;
    padding-left:24px}
  .legal-wrap ul li{margin-bottom:6px}
  .legal-wrap a{color:var(--brand-default);text-decoration:underline;text-underline-offset:2px}
  .legal-wrap a:hover{opacity:.8}

  /* Footer */
  .legal-footer{border-top:1px solid #e5e7eb;padding:32px 24px;text-align:center}
  .legal-footer-links{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;
    font-size:14px;color:#6b7280}
  .legal-footer-links a{color:#6b7280}
  .legal-footer-links a:hover{color:#111}
  .legal-footer-copy{margin-top:12px;font-size:13px;color:#9ca3af}

  @media(max-width:640px){
    nav.center,.nav-cta{display:none}
    .hamburger{display:flex}
  }
</style>
</head>
<body>

<header class="nav">
  <div class="wrap-wide">
    <a class="nav-logo" href="index.html" aria-label="Miclea home">
      <img src="images/logo.png" alt="Miclea">
    </a>
    <nav class="center">
      <a href="#">Products <span class="caret">&#9662;</span></a>
      <div class="nav-dd">
        <a class="nav-dd__trigger" href="#">Resources <span class="caret">&#9662;</span></a>
        <div class="nav-dd__menu" role="menu" aria-label="Resources">
          <a href="job-seekers.html" role="menuitem"><span class="nav-dd__t">Job seekers</span><span class="nav-dd__d">Land more callbacks and offers, faster</span></a>
          <a href="bootcamps.html" role="menuitem"><span class="nav-dd__t">Bootcamps</span><span class="nav-dd__d">Lift cohort placement rates</span></a>
          <a href="career-centers.html" role="menuitem"><span class="nav-dd__t">Career centers</span><span class="nav-dd__d">Coach more students with less staff</span></a>
          <a href="universities.html" role="menuitem"><span class="nav-dd__t">Universities</span><span class="nav-dd__d">Raise graduate employment outcomes</span></a>
          <a href="teams.html" role="menuitem"><span class="nav-dd__t">Teams</span><span class="nav-dd__d">Prep employees for internal moves</span></a>
        </div>
      </div>
      <a href="pricing.html">Pricing</a>
      <a href="#">Blog</a>
      <a href="#">About</a>
    </nav>
    <div class="nav-cta">
      <a class="btn btn-dash" href="#">Log in</a>
    </div>
    <button class="hamburger" aria-label="Open menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
</header>

<main class="legal-wrap">
  <p class="legal-label">Security</p>
  <h1>Security at Miclea</h1>
  <p class="legal-updated">Last updated: June 22, 2026</p>

  <h2>Our Commitment</h2>
  <p>Protecting your data is fundamental to everything we build at Miclea AI. This page describes the technical and organizational measures we have in place to keep your information secure.</p>

  <h2>Infrastructure &amp; Hosting</h2>
  <p>Miclea runs on cloud infrastructure hosted in the United States. Our cloud provider maintains SOC 2 Type II certification. We use isolated environments for production and non-production workloads and apply security patches on a regular cadence.</p>
  <ul>
    <li>Production systems are hosted in geographically redundant data centers.</li>
    <li>Network traffic is segmented and access between services is restricted by default.</li>
    <li>Automated backups run daily with point-in-time recovery available.</li>
  </ul>

  <h2>Data Encryption</h2>
  <p>All data is encrypted at rest and in transit:</p>
  <ul>
    <li><strong>In transit:</strong> TLS 1.2 or higher is enforced for all connections between your browser and our servers.</li>
    <li><strong>At rest:</strong> User data, session recordings, and database contents are encrypted using AES-256.</li>
    <li><strong>Passwords:</strong> Passwords are hashed using bcrypt and never stored in plaintext.</li>
  </ul>

  <h2>Access Controls</h2>
  <p>We follow the principle of least privilege for internal access to systems and data:</p>
  <ul>
    <li>Production database access is restricted to a small number of engineers and requires multi-factor authentication (MFA).</li>
    <li>All internal access to sensitive systems is logged and audited.</li>
    <li>Employee accounts are provisioned and de-provisioned through a centralized identity provider.</li>
    <li>We conduct periodic access reviews to revoke unnecessary permissions.</li>
  </ul>

  <h2>Incident Response</h2>
  <p>We maintain a documented incident response plan. In the event of a confirmed security breach affecting your data, we will:</p>
  <ul>
    <li>Contain and investigate the incident as quickly as possible.</li>
    <li>Notify affected users within 72 hours of confirming the breach, as required by applicable law.</li>
    <li>Provide guidance on steps you can take to protect your account.</li>
    <li>Conduct a post-incident review to prevent recurrence.</li>
  </ul>

  <h2>Vulnerability Disclosure</h2>
  <p>We welcome responsible disclosure of security vulnerabilities. If you believe you have found a security issue in Miclea AI, please email us at <a href="mailto:security@miclea.ai">security@miclea.ai</a>. We ask that you:</p>
  <ul>
    <li>Give us a reasonable amount of time to investigate before making any public disclosure.</li>
    <li>Avoid accessing or modifying data belonging to other users.</li>
    <li>Not perform denial-of-service testing.</li>
  </ul>
  <p>We will acknowledge your report within 2 business days and keep you informed as we work toward a fix. We do not currently offer a bug bounty program, but we appreciate every responsible report.</p>

  <h2>Contact Us</h2>
  <p>For security questions or to report a vulnerability, email <a href="mailto:security@miclea.ai">security@miclea.ai</a>.</p>
</main>

<footer class="legal-footer">
  <nav class="legal-footer-links" aria-label="Legal pages">
    <a href="privacy.html">Privacy</a>
    <a href="terms.html">Terms</a>
    <a href="security.html">Security</a>
    <a href="index.html">← Back to home</a>
  </nav>
  <p class="legal-footer-copy">© 2026 Miclea AI, Inc. All rights reserved.</p>
</footer>

</body>
</html>
```

- [ ] **Step 2: Verify the file opens correctly**

Open `security.html` in a browser. Confirm: white background, nav, all Security sections present.

- [ ] **Step 3: Commit**

```bash
git add security.html
git commit -m "feat: add Security page"
```

---

### Task 4: Update footer links in index.html and pricing.html

**Files:**
- Modify: `index.html` (lines ~1269–1271)
- Modify: `pricing.html` (lines ~760–762)

- [ ] **Step 1: Update index.html footer legal nav**

Find this block in `index.html` (around line 1268):
```html
<nav class="legal" aria-label="Legal">
  <a href="#">Privacy</a>
  <a href="#">Terms</a>
  <a href="#">Security</a>
```

Replace with:
```html
<nav class="legal" aria-label="Legal">
  <a href="privacy.html">Privacy</a>
  <a href="terms.html">Terms</a>
  <a href="security.html">Security</a>
```

- [ ] **Step 2: Update pricing.html footer legal nav**

Find this block in `pricing.html` (around line 759):
```html
<nav class="foot-legal" aria-label="Legal">
  <a href="#">Privacy</a>
  <a href="#">Terms</a>
  <a href="#">Security</a>
  <a href="#">Cookies</a>
```

Replace with:
```html
<nav class="foot-legal" aria-label="Legal">
  <a href="privacy.html">Privacy</a>
  <a href="terms.html">Terms</a>
  <a href="security.html">Security</a>
  <a href="#">Cookies</a>
```

- [ ] **Step 3: Verify links work**

Open `index.html` in a browser. Scroll to the footer. Click Privacy, Terms, and Security links — each should navigate to the correct page.

Repeat from `pricing.html`.

- [ ] **Step 4: Commit**

```bash
git add index.html pricing.html
git commit -m "feat: wire footer legal links to privacy, terms, and security pages"
```
