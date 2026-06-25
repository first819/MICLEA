# MICLEA AI Coach — design

**Date:** 2026-06-25
**Status:** Approved, ready for implementation plan

## Problem

MICLEA's practice modes (Speed Round, Gauntlet), Company Packs, Résumé, and Cover Letter
features are static — they draw from a fixed question bank and offer no personalization.
The user wants an AI layer that reads each user's resume and onboarding data (target role,
weak spots) and tailors the whole experience: generating questions aimed at the user's gaps,
giving per-answer feedback, researching companies/industries from the live web, and drafting
resume/cover-letter content. AI-generated questions should accumulate into the question bank
so it grows over time, while users can still practice from existing stored questions.

## Context (as-is)

- **Frontend is static HTML/JS** deployed on Vercel. No build step, no server today. The
  authenticated feature pages (`speed-round`, `gauntlet`, `progress`, `question-bank`,
  `resume`, `cover-letter`, `company-packs`, `settings`, `help`) share `tokens.css` +
  `app-shell.css` + `app-shell.js`, which exposes `window.Miclea` (`getTier/setTier`,
  `getTheme/setTheme`, `getSessions/addSession`, `toast`). See [[app-shell-architecture]].
- **Dashboard** loads core features inline in an `?embed=1` iframe via a hash router. See
  [[dashboard-inline-features]].
- **Tier gating** today is localStorage-only (`miclea_tier`: free < pro < ultra) via
  `class="lockable" data-tier`. There is no server-side enforcement.
- **Onboarding** runs before the dashboard and captures target role + weak spots; the user
  confirms this data will be persisted to **Supabase** per user.
- **Backends available:** the user has **Supabase** (database) and **Vercel** (hosting +
  serverless/edge functions). No AI integration exists yet.

## Key constraint

A static frontend cannot call the Claude or Tavily APIs directly — doing so would expose
the API keys in the browser. **All AI calls must go through Vercel serverless functions**
that hold the keys as server-side environment variables. This is the central architectural
driver.

## Decisions

- **AI provider:** Claude via the official `@anthropic-ai/sdk` (imported in Deno via the
  `npm:` specifier).
- **Web research:** Tavily (purpose-built AI search API) feeds results to Claude for synthesis.
- **Runtime: Supabase Edge Functions (Deno), not Vercel.** Grounded in the codebase: `auth.js`
  already calls `${SUPABASE_URL}/functions/v1/send-verification-email` and
  `send-password-reset-email`. We extend that existing serverless surface rather than adding a
  second platform (Vercel Node `/api`). Keys live as Supabase function secrets.
- **One shared AI backend** of Edge Functions powers all four feature areas — not four
  separate integrations.
- **Model split:**
  - `claude-sonnet-4-6` — question generation + per-answer feedback (high volume, cost-sensitive).
  - `claude-opus-4-8` — résumé + cover letter (quality-critical, low volume).
  - **Confirmed:** documents use Opus 4.8 (quality over the ~$0.025/doc saving from Sonnet).
- **Question bank grows over time:** AI generates → stored in `question_bank` → users practice
  from stored questions → AI tops up / fills gaps. Free tier practices the curated/stored bank
  with no live AI generation.
- **Tier gating:**
  - Free → curated question bank only, no AI calls.
  - Pro → AI questions + per-answer feedback + company packs.
  - Ultra → everything, including résumé + cover-letter AI.
  - Enforced **server-side** inside each Edge Function (read the user's tier from Supabase),
    not just the localStorage lock overlay.
- **Secrets** (`ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) live only
  as Supabase function secrets (`supabase secrets set`). `SUPABASE_URL` and the anon key are
  already public in the client.

## Architecture

```
Browser (fetch, with the user's Supabase access token in Authorization)
  → Supabase Edge Function  (secrets: ANTHROPIC_API_KEY, TAVILY_API_KEY, SERVICE_ROLE_KEY)
      → verify the caller's JWT → resolve auth uid
      → read user context from Supabase (onboarding_answers, resumes, tier)
      → enforce tier (403 if insufficient)
      → call Claude (and Tavily for research)
      → persist results to Supabase (service-role client)
  ← JSON back to browser
```

The browser calls `${SUPABASE_URL}/functions/v1/ai-<name>` with
`Authorization: Bearer <session access_token>` — the same base URL pattern `auth.js` already
uses for the email functions.

### Edge functions

| Function | Reads | Calls | Writes | Tier |
|---|---|---|---|---|
| `ai-question` | `onboarding_answers` + `resumes` | Claude (Sonnet 4.6) | `question_bank` | Pro |
| `ai-feedback` | question + user answer + onboarding | Claude (Sonnet 4.6) | `session_answers` | Pro |
| `ai-research` | company/industry query | Tavily → Claude (Sonnet 4.6) | `company_packs` | Pro |
| `ai-resume` | `resumes` + `target_roles` | Claude (Opus 4.8) | `resumes` (revision) | Ultra |
| `ai-cover-letter` | `resumes` + job description | Claude (Opus 4.8) | `cover_letters` | Ultra |

Each function: verify JWT → load context from Supabase → check tier (403 if insufficient) →
build the prompt → call Claude/Tavily → persist → return JSON. Streaming (`.stream()` +
`.finalMessage()`) is used for the long-output functions (résumé, cover letter, gauntlet
generation) to avoid request timeouts; `messages.create` for the short ones.

### Supabase schema

**Existing (as-is in the project — do not recreate):**
```
onboarding_answers  user_id (PK), career_stage, main_goal, pain_points[], interview_feeling,
                    target_roles[], interview_timeline, practice_focus[], referral_source,
                    resume_filename, completed_at, updated_at
```
Mapping to the AI's needs: **weak spots** = `pain_points` + `practice_focus`;
**target role** = `target_roles[]` (first element is primary); **experience level** =
`career_stage`. The AI reads these columns directly — no rename needed.

**New tables:**
```
resumes            user_id (PK), fields jsonb, file_path text, file_text text, updated_at
                     -- fields = the structured resume-editor content (summary, experience[],
                     --          skills, etc.); file_path = Storage path of the uploaded file;
                     --          file_text = extracted plain text of that upload
question_bank      id, user_id (nullable = curated/global), content, role, topic, difficulty,
                     source ('curated'|'ai'), times_practiced, created_at
practice_sessions  id, user_id, mode ('speed'|'gauntlet'), score, completed_at
session_answers    id, session_id, question_id, answer_text, feedback, score, created_at
cover_letters      id, user_id, job_title, company, content, created_at
company_packs      id, user_id, company, industry, research_json jsonb, created_at
user_tier          user_id (PK), tier ('free'|'pro'|'ultra'), updated_at
                     -- server-side source of truth for tier (localStorage stays a UX mirror)
```

Row-level security: a user can read/write only their own rows; curated `question_bank` rows
(`user_id IS NULL`) are world-readable. Edge functions use the **service-role** key and scope
every query by the JWT-verified user id.

### Resume capture (new — closes the "onboarding needs fixing" gap)

Today nothing persists the resume: `resume.html` is a `contenteditable` editor with no save,
and onboarding stores only `resume_filename`. We add **both** paths (user's choice):
- **Structured editor →** `resumes.fields` (jsonb). `resume.html` loads from / saves to this.
  This is the source of truth the AI rewrites.
- **File upload →** a Supabase Storage bucket `resumes/<uid>/<filename>`; path saved to
  `resumes.file_path`, extracted text to `resumes.file_text`. Gives the AI the real document.

### Frontend wiring

Feature pages call `${SUPABASE_URL}/functions/v1/ai-<name>` with the session token and render
results into their existing UI. No secrets touch the browser. Tier locks stay as the UX layer
(`.lockable`); the server is the source of truth. Generated questions feed the existing
`question-bank` view;
feedback renders after each answer in Speed Round / Gauntlet.

## Cost (reference)

Per-use, at the chosen model split:

| Feature | In | Out | Model | Cost |
|---|---|---|---|---|
| Speed Round (10 Q + feedback) | ~7K | ~3.5K | Sonnet 4.6 | ~$0.07 |
| Gauntlet session | ~15K | ~8K | Sonnet 4.6 | ~$0.17 |
| Company research | ~5K + Tavily | ~2K | Sonnet 4.6 | ~$0.05 |
| Résumé rewrite | ~3K | ~2K | Opus 4.8 | ~$0.065 |
| Cover letter | ~3K | ~2K | Opus 4.8 | ~$0.065 |

Tavily ≈ $0.001/search. Rough monthly infra: ~50 users ≈ $40; ~200 users ≈ $205;
~1,000 users ≈ $845 (Claude + Supabase Pro; static hosting stays on Vercel). AI features
gated behind Pro/Ultra to offset cost.

## Out of scope (this pass)

- Auth system itself (assumed Supabase Auth already issues the user session).
- Billing/subscription enforcement beyond reading a `tier` column.
- Migrating the existing localStorage tier demo switch.
- Rate limiting / abuse controls (noted as a fast follow).

## Resolved

1. **Documents → Opus 4.8** (confirmed).
2. **Auth → exists** (Supabase Auth logs users in and captures their info). **Caveat:** the
   onboarding flow "still needs some fixing" — the plan must verify onboarding actually
   persists `weak_spots` / `target_role` to Supabase in the expected shape, and repair it if
   the AI routes depend on fields it doesn't yet write.
3. **Web search → Tavily** (user has / will provision a key; added to Supabase function secrets).
4. **Runtime → Supabase Edge Functions** (Deno), matching the existing email functions — not Vercel.
5. **Resume capture → Both** a real file upload (Supabase Storage + extracted text) **and** the
   structured editor fields persisted to `resumes.fields`.
