# Miclea AI — Feature Build Prompts

> **Product:** Miclea AI — an AI-powered job interview preparation SaaS where users practice interviews with an AI interviewer ("Micl"), track their progress, and prepare supporting materials (résumé, cover letter).
>
> **How to use this document:** Each section below is a self-contained prompt you can hand to an AI builder (Claude Code, Cursor, v0, Lovable, etc.) or a developer. Build features in the order listed, or independently. Every prompt states the goal, user flow, UI, data model, AI behavior, and edge cases so it can be implemented without further context.

---

## Global Context (include at the top of any single-feature prompt)

```
You are building Miclea AI, a job interview preparation SaaS. Users practice
mock interviews with an AI interviewer named "Micl" using their microphone (voice
in, voice + text out), then review analytics on their performance.

Brand voice: encouraging but honest, like a sharp coach. The product should feel
modern, fast, and a little fun — not corporate or intimidating.

Core stack assumptions (adjust to your project):
- Frontend: React + TypeScript, component library of your choice, responsive.
- Backend: Node/serverless API (or Supabase edge functions).
- Auth + DB: Supabase (Postgres, Row Level Security per user).
- AI: an LLM for question generation + answer evaluation; a speech-to-text (STT)
  service for the mic, and optional text-to-speech (TTS) for Micl's voice.
- Payments: Stripe Checkout + Stripe Customer Portal.

Cross-cutting requirements for every feature:
- All user data is scoped to the authenticated user (RLS).
- Gate premium features behind subscription status (see Subscription Plan feature).
- Persist every interview session and its per-question results for the
  Progress & Insights and Question Bank features.
- Accessible: keyboard navigable, ARIA labels, captions/transcript for all audio.
- Mobile-friendly.
```

---

## 1. Speed Round (Practice Session / Speed Mode)

**Prompt:**

```
Build the "Speed Round" feature for Miclea AI — a fast-paced, low-pressure warm-up
interview. It is the easy mode users run before attempting the Gauntlet.

GOAL
A quick burst of easy questions to warm the user up, build confidence, and get
them comfortable speaking out loud to Micl (the AI interviewer).

FLOW
1. Setup screen: user optionally picks a job role / field and difficulty is fixed
   to "easy". Show estimated length (~3–5 min). Prompt for and request microphone
   permission here; explain why it's needed. If denied, allow a text-input
   fallback but encourage mic use.
2. Session: ask 8–10 easy questions, one at a time, fast-paced.
   - Micl asks the question (display text + optional TTS voice).
   - A visible countdown / "thinking" affordance keeps the pace energetic.
   - User answers by speaking (mic) — transcribe with STT in near-real-time and
     show the live transcript so the user sees they're being heard.
   - User taps "Next" (or auto-advance after a short pause in speech) to move on.
   - Show progress (e.g. "Question 4 of 10") throughout.
3. Results screen: short, encouraging summary — number answered, a light overall
   score, 2–3 quick tips, and a clear CTA to "Try the Gauntlet" or "Practice again".

UI / VIBE
- Fun, energetic, gamified UI. Use motion, a lively progress bar, and upbeat
  microcopy ("Nice — keep it rolling!"). This is the playful counterpart to the
  serious Gauntlet. Keep latency low so it feels snappy.

AI BEHAVIOR
- Generate easy, broad warm-up questions (e.g. "Tell me about yourself", "Why this
  role?"). Adapt lightly to the chosen role.
- Lightweight evaluation only — this is a warm-up, so feedback is brief and
  positive. Save full analysis for the Gauntlet.

DATA
- Persist a session record: type="speed", role, timestamp, questions asked, the
  user's transcribed answers, and a light per-answer + overall score.
- These feed Progress & Insights and populate the Question Bank.

EDGE CASES
- Mic permission denied → text fallback.
- STT fails / silence → allow retry or skip, never block.
- User abandons mid-session → save partial progress, mark as incomplete.
```

---

## 2. Gauntlet Round (Mock Interview / Gauntlet Run)

**Prompt:**

```
Build the "Gauntlet Round" feature for Miclea AI — a realistic, progressively
harder mock interview in three rounds. This is the flagship feature and should
feel like a real interview.

GOAL
Simulate the pressure and arc of a real interview: start broad, get harder, end
with a curveball. Deliver detailed performance analysis afterward.

STRUCTURE
- Three rounds, each with 2–3 questions, asked one at a time via mic (same
  STT/TTS interaction model as the Speed Round).
- Difficulty escalates each round:
  - Round 1 — Broad: general, real-interview-style questions (background,
    motivation, role fit).
  - Round 2 — Harder: deeper, more challenging / role-specific or behavioral
    questions that probe for substance.
  - Round 3 — Curveball: an unexpected, off-script question designed to test
    composure and adaptability (e.g. an unusual hypothetical or a pointed
    follow-up).
- Between each round there is a MANDATORY, UNSKIPPABLE 30-second break.
  - Show a 30s countdown timer the user cannot bypass (no skip button, no early
    "continue"). Use the break to set expectations for the next round ("Round 2 is
    tougher — take a breath.") and let the user reset.
  - The break must be enforced server-side or via a locked timer so it can't be
    clicked through.

FLOW
1. Setup: pick role/field. Explain the 3-round structure, the rising difficulty,
   and the 30s breaks. Request mic permission.
2. Round loop (for each of the 3 rounds):
   a. Round intro card (name + what to expect).
   b. Ask 2–3 questions; transcribe answers live; show round/question progress.
   c. On round complete → enforced 30s break (rounds 1→2 and 2→3 only; no break
      after round 3).
3. Completion → hand off to a detailed results / analysis screen (overall score,
   per-round breakdown, strengths, weaknesses, specific improvement suggestions).
   This analysis is the source data for Progress & Insights.

UI / VIBE
- Serious, immersive, realistic — the deliberate contrast to the Speed Round's
  playfulness. Minimal distractions, clear round indicators, a calm but
  high-stakes feel.

AI BEHAVIOR
- Generate questions matched to each round's difficulty tier and the chosen role.
- Round 2 should genuinely raise the bar vs Round 1; Round 3 should be a true
  curveball, not just "harder".
- Optionally ask one adaptive follow-up based on a weak/vague answer to mimic a
  real interviewer.
- Produce a structured evaluation per answer and per round: score, what worked,
  what to improve, behavioral signals (clarity, confidence, structure, relevance).

DATA
- Persist a session record: type="gauntlet", role, timestamp, per-round questions,
  transcribed answers, per-answer + per-round + overall scores, and the structured
  analysis. Feeds Progress & Insights and the Question Bank.

EDGE CASES
- User must not be able to skip the 30s break (verify the timer can't be bypassed
  via UI or refresh — persist break state).
- Mic denied → text fallback.
- Abandon mid-gauntlet → save partial, mark incomplete; don't count partials in
  "completed interview" stats.
```

---

## 3. Progress & Insights

**Prompt:**

```
Build the "Progress & Insights" dashboard for Miclea AI — analytics across all of
a user's interview sessions (Speed and Gauntlet).

GOAL
Give users a clear, motivating view of how they're improving over time and where
to focus next.

CONTENT
- Headline metrics: total interviews, average score, best score, current streak,
  total practice time.
- Trends over time: a chart of scores per session (filter by Speed vs Gauntlet,
  by date range).
- Behavioral breakdown: aggregate the behavioral signals captured during interviews
  (e.g. clarity, confidence, structure/STAR usage, relevance, pacing/filler words)
  shown as a radar or bar breakdown.
- Strengths & weaknesses: AI-generated summary of recurring strong areas and the
  top areas to improve, drawn from session analyses.
- Session history: a list of past interviews, each opening a detail view with the
  questions, the user's answers/transcript, and that session's feedback.

UI
- Clean dashboard with cards + charts. Empty state for new users ("Run your first
  interview to unlock insights"). Make improvement visible and rewarding.

ULTRA-ONLY CAPABILITIES (gate to the Ultra tier)
- Advanced analytics: month-over-month trends, deeper behavioral drill-down
  (per-signal history, percentile vs. the user's own past), and filters beyond
  the Pro view.
- Session replay: re-play a past Gauntlet session with the
  transcript, per-answer scores, and a timeline synced together so the user can
  scrub through how the session unfolded.
- Exportable PDF performance report.
- Surface the Ultra-only features here, too: the dashboard is where users land
  Company-Specific Pack progress. Show per-pack readiness alongside the standard
  interview analytics once Ultra is active. Non-Ultra users see these dashboard
  sections as locked previews with an upgrade CTA.
- Base Progress & Insights (headline metrics, trends, behavioral breakdown,
  strengths/weaknesses, session history) remains available on Pro; only the
  capabilities listed in this block gate to Ultra.

DATA
- Read from the persisted session + per-question + analysis records created by the
  Speed and Gauntlet features (type="speed" | "gauntlet"). Compute aggregates
  (averages, trends, streaks) on read or via a summary table. Advanced analytics
  and replay read the same records at finer granularity.

EDGE CASES
- No sessions yet → friendly empty state.
- Only partial/incomplete sessions → handle gracefully, label them.
- Non-Ultra user viewing Ultra dashboard sections → locked preview, never raw data.
```

---

## 4. Question Bank

**Prompt:**

```
Build the "Question Bank" feature for Miclea AI — a searchable library of interview
questions, including ones the user has previously been asked. This is a PREMIUM
(subscription-gated) feature.

GOAL
Let users review and study from a large bank of questions, including their own
past interview questions, to prepare more deliberately.

CONTENT
- A large library of interview questions across categories.
- Includes the questions the user has previously been asked in their Speed and
  Gauntlet sessions (linked back to that session/answer where applicable).
- Each question entry shows: the question, difficulty (easy / medium / hard),
  question type/category (e.g. behavioral, technical, situational, role-specific),
  and — if the user has answered it — their past answer and feedback.

FILTERING
- Filter by difficulty (easy / medium / hard).
- Filter by question type/category.
- Search by keyword.
- Optionally filter to "questions I've been asked" vs the full bank.

ACCESS CONTROL
- Gate the whole feature behind a paid tier. Pro unlocks the core-roles /
  standard-difficulty bank; Ultra unlocks the full bank (all roles, senior &
  specialized) plus Company-Specific Packs. Free/unauthenticated users see a
  locked preview with an upgrade CTA (links to the Subscription Plan flow).

DATA
- A questions table (text, difficulty, type, role tags). User-asked questions are
  associated to the user via their session records.

EDGE CASES
- Non-subscriber → paywall/upgrade prompt, no full access.
- No prior questions for a new user → still show the general bank; "your asked
  questions" section shows an empty state.
```

---

## 5. Résumé Editor (with Micl AI)

**Prompt:**

```
Build the "Résumé" feature for Miclea AI — an editor where users create and improve
their résumé with help from the Micl AI assistant.

GOAL
Let users build or refine a résumé with AI assistance, ready to use in job
applications alongside their interview prep.

FUNCTIONALITY
- Create a new résumé from scratch or import/paste an existing one.
- A structured editor (sections: contact, summary, experience, education, skills,
  etc.) with live editing.
- Micl AI assistance: select text or a section and ask Micl to improve wording,
  strengthen bullet points (action verbs + quantified impact), tailor to a target
  role/job description, fix tone, or shorten/expand.
- Show AI suggestions as proposed edits the user can accept or reject (don't
  silently overwrite their content).
- Save multiple résumé versions; export (PDF at minimum).

UI
- Two-pane feel: editor + live preview, with Micl available inline or in a side
  panel.

AI BEHAVIOR
- Micl rewrites/improves on request, explains why briefly, and tailors to a pasted
  job description when provided. Never fabricate experience the user didn't provide.

DATA
- Persist résumé documents (versions, sections, content) per user.

ACCESS CONTROL
- Pro: full access, up to 10 AI edits / month.
- Ultra: full access, unlimited saved résumés and AI edits.
- Free: locked — show a preview with an upgrade CTA (routes to the Subscription
  Plan flow).
```

---

## 6. Cover Letter Editor (with Micl AI)

**Prompt:**

```
Build the "Cover Letter" feature for Miclea AI — an editor where users create a new
cover letter or improve an existing one with Micl AI.

GOAL
Help users produce a strong, tailored cover letter quickly.

FUNCTIONALITY
- Create a new cover letter from scratch, or paste/import an existing one to edit.
- Generate a draft from inputs: target role, company, job description, and the
  user's résumé/key points.
- Micl AI assistance: improve tone, tailor to the job description, tighten,
  adjust length, and match the user's voice. Suggestions are accept/reject, not
  silent overwrites.
- Save multiple letters; export (PDF at minimum).

UI
- Editor + live preview, Micl inline or in a side panel. Reuse the résumé editor's
  patterns for consistency.

AI BEHAVIOR
- Generate and refine on request; pull from the user's résumé when available to
  stay consistent and avoid fabrication.

DATA
- Persist cover letter documents per user.

ACCESS CONTROL
- Pro: full access, up to 10 AI generations / month.
- Ultra: full access, unlimited saved letters and AI edits.
- Free: locked — show a preview with an upgrade CTA (same approach as the résumé
  feature).
```

---

## 7. Settings

**Prompt:**

```
Build the "Settings" feature for Miclea AI — account and preference management.

GOAL
Let users manage their account details and app preferences.

FIELDS / SECTIONS
- Profile: display name / username (editable).
- Email: view and change email (with verification on change).
- Password: change password (require current password; enforce strength rules).
- Theme: light / dark / system preference, applied app-wide and persisted.
- (Optional but recommended here or nearby) link to manage subscription/billing
  via the Stripe Customer Portal, and a Help & Resources link.

UI
- Standard settings layout with grouped sections, inline validation, and clear
  save/confirmation feedback.

DATA
- Persist user profile fields and theme preference. Email/password changes go
  through the auth provider (e.g. Supabase Auth).

EDGE CASES
- Email change requires re-verification.
- Password change requires current-password confirmation.
- Show clear success/error states for every action.
```

---

## 8. Help & Resources

**Prompt:**

```
Build the "Help & Resources" feature for Miclea AI — support and guidance for users.

GOAL
Give users a way to get help and find guidance on using the product.

CONTENT
- "Contact us for help": a contact form (subject, message, user email prefilled)
  that creates a support request / sends an email to the support inbox, with a
  confirmation to the user.
- Optionally: FAQ / how-to articles covering Speed Round, Gauntlet, mic setup,
  subscriptions, and résumé/cover letter tools.

UI
- Simple, searchable help page with the contact form prominent.

DATA
- Persist or forward support requests (e.g. to a support table or email/ticketing
  integration).

EDGE CASES
- Form validation; confirmation on submit; graceful failure if sending fails
  (don't lose the user's message).
```

---

## 9. Subscription Plan (Stripe)

**Prompt:**

```
Build the "Subscription Plan" feature for Miclea AI — plan selection and billing
via Stripe across three tiers (Free / Pro / Ultra). The user's tier gates premium
features throughout the app.

GOAL
Let users choose a tier, pay via Stripe, and have their subscription tier gate
premium features throughout the app. The gate resolves a TIER (free | pro | ultra),
not just a boolean — each premium feature declares the minimum tier it requires.

TIERS & PRICING
- Free: $0. One Speed Round session and one Gauntlet Round session; live transcript
  and per-answer scoring during the session. Everything else locked.
- Pro: $19/month or $182/year (annual ≈ 20% off). 50 Speed & Gauntlet rounds/month,
  full Progress & Insights (base), Question Bank (core roles), Résumé Editor + AI
  (10 edits/month), Cover Letter Editor + AI (10/month).
- Ultra: $29/month or $278/year (annual ≈ 20% off). Everything in Pro PLUS unlimited
  Speed & Gauntlet, full Question Bank (all roles, senior & specialized) +
  Company-Specific Packs, unlimited Résumé & Cover Letter AI, advanced analytics +
  session replay, Priority AI, and early access to new features.
- Stripe needs four price IDs: Pro-monthly, Pro-annual, Ultra-monthly, Ultra-annual.

GATING MATRIX (single source of truth — must match the pricing page exactly)
| Capability                          | Free      | Pro          | Ultra |
|-------------------------------------|-----------|--------------|-------|
| Speed Round                         | 1 session | 50 / month   | Unlimited |
| Gauntlet Round                      | 1 session | 50 / month   | Unlimited |
| Live transcript + per-answer scores | ✅        | ✅           | ✅ |
| Progress & Insights (base)          | —         | ✅           | ✅ |
| Advanced analytics + session replay | —         | —            | ✅ |
| Question Bank                       | —         | Core roles   | All roles + Packs |
| Résumé Editor + AI                  | —         | 10 / month   | Unlimited |
| Cover Letter Editor + AI            | —         | 10 / month   | Unlimited |
| Company-Specific Packs              | —         | —            | ✅ |
| Priority AI (faster responses)      | —         | —            | ✅ |
| Early access to new features        | —         | —            | ✅ |

PLATFORM PERKS (Ultra)
- Priority AI: route Ultra users' LLM/STT requests through a higher-priority queue
  so responses are faster at peak load. Implemented as routing/queue priority, not
  a separate UI feature.
- Early access: gate new/beta features behind an "ultra" feature flag.

FUNCTIONALITY
- Pricing page showing Free / Pro / Ultra with monthly and annual billing options
  (annual discounted ~20%). Clearly list what each tier unlocks (mirror the
  gating matrix). The built page is `pricing.html`.
- On plan select → redirect the user to Stripe Checkout for the chosen tier +
  billing interval (the matching price ID).
- Handle Stripe webhooks to record subscription tier + status (active, canceled,
  past_due, trialing) against the user. This is the single source of truth for
  gating.
- Provide access to the Stripe Customer Portal so users can manage/cancel/upgrade/
  downgrade and update payment methods.
- After successful checkout, redirect back into the app with confirmation and the
  newly unlocked tier active.

GATING
- Every premium feature checks the user's tier against the minimum it requires
  (Pro-gated vs Ultra-gated per the matrix); users below that tier see upgrade
  prompts that route to the pricing page.

DATA
- Store: Stripe customer ID, subscription ID, tier (free | pro | ultra), interval
  (monthly | annual), status, current period end — per user. Update via webhooks.

EDGE CASES
- Webhook idempotency and signature verification.
- Checkout abandoned → no status change.
- Subscription lapses (past_due/canceled) → revert the user to the Free tier at
  period end (revoke Pro/Ultra access).
- Downgrade Ultra → Pro → Ultra-only features lock at period end; Pro features stay.
- Keep Stripe and your DB in sync as the webhook is authoritative, not the
  client redirect.
```

---

## 10. Company-Specific Packs (Ultra)

**Prompt:**

```
Build the "Company-Specific Packs" feature for Miclea AI — curated question sets
tied to a specific company's known interview process, runnable as practice
sessions. This is an ULTRA-tier feature. Reuse the Question Bank's data model +
filtering and the interview engine for running a pack.

GOAL
Let users drill the exact style of questions a target company is known for, instead
of generic practice — e.g. Amazon Leadership Principles, Google behavioral, Goldman
Sachs finance cases, Meta, Microsoft.

CONTENT
- Each Pack is a named, curated collection of real-style questions tagged by
  company and round/type (behavioral, technical, case, leadership-principle, etc.).
- Browsing a Pack shows its questions (with difficulty + type) and a "Start"
  action that launches a Speed or Gauntlet session scoped to that Pack's question
  pool.
- Packs are maintained/curated content and updated as hiring patterns shift; show a
  "last updated" signal and allow "coming soon" placeholders for packs not yet live.

DATA
- Extend the questions table with company / pack tags; Pack questions are curated
  rows. Reuse the existing Question Bank filtering and the shared interview engine
  to run a pack session (persisted as a normal session with the pack referenced).
- Per-pack progress (sessions run, readiness/score for that pack) is surfaced on
  the Progress & Insights dashboard for Ultra users.

ACCESS CONTROL
- Ultra only. Lower tiers see Pack names/cards as locked previews with an upgrade
  CTA routing to the Subscription Plan / pricing flow.

EDGE CASES
- Pack content versioning (questions change over time) — don't break links from
  past sessions to questions that were later edited/removed.
- Empty / coming-soon packs → clear placeholder, no dead-ends.
- Non-Ultra access attempt → paywall, never the full pack contents.
```

---

## Suggested Build Order

1. **Auth + Settings** (foundation: accounts, theme).
2. **Subscription Plan** (so tier gating exists before premium features).
3. **Speed Round** (simplest interview loop; proves the mic/STT/AI pipeline).
4. **Gauntlet Round** (reuses the interview pipeline; adds rounds + enforced breaks).
5. **Progress & Insights** (consumes session data from 3 & 4; Ultra adds advanced
   analytics, session replay, and the Ultra-feature dashboard surfaces).
6. **Question Bank** (Pro/Ultra; consumes session questions).
7. **Company-Specific Packs** (Ultra; reuses Question Bank data + interview engine).
8. **Résumé Editor** and **Cover Letter Editor** (Micl AI document tools).
9. **Help & Resources** (support layer).

---

## Shared Systems to Build Once and Reuse

- **Interview engine:** mic permission → STT live transcript → question display
  (+ optional TTS) → answer capture → AI evaluation → session persistence. Used by
  Speed Round, Gauntlet Round, and Company-Specific Packs.
- **Micl AI assistant:** accept/reject suggestion UX shared by Résumé and Cover
  Letter editors.
- **Session/analysis data model:** one schema for sessions, per-question results,
  and structured analysis — handles type="speed" | "gauntlet" and feeds Progress &
  Insights and the Question Bank.
- **Subscription gate:** a single check/hook used everywhere premium features
  appear. It resolves the user's TIER (free | pro | ultra), and each feature
  declares the minimum tier it requires (Pro-gated vs Ultra-gated).
```
