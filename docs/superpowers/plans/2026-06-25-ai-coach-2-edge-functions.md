# AI Coach — Plan 2: Supabase Edge Functions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared AI backend as Supabase Edge Functions (Deno) that read user context, enforce tier, call Claude (and Tavily), persist results, and return JSON — with the API keys held only as function secrets.

**Architecture:** A `_shared/` folder holds CORS, the service-role + per-request user clients, tier enforcement, and the Anthropic client. Five functions (`ai-question`, `ai-feedback`, `ai-research`, `ai-resume`, `ai-cover-letter`) follow one shape: verify JWT → load context → check tier → call Claude/Tavily → persist → respond. Built on the same `functions/v1/...` surface `auth.js` already uses.

**Tech Stack:** Supabase Edge Functions (Deno), `npm:@anthropic-ai/sdk`, `npm:@supabase/supabase-js@2`, `npm:unpdf` (PDF text extraction), Tavily REST API, Claude (`claude-sonnet-4-6` for question/feedback/research, `claude-opus-4-8` for résumé/cover-letter).

**Spec:** `docs/superpowers/specs/2026-06-25-ai-coach-design.md`
**Depends on:** Plan 1 (tables + storage must exist).

**Prereqs:** Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` into every function automatically — do not set those. You must set `ANTHROPIC_API_KEY` and `TAVILY_API_KEY` (Task 7).

**Local testing:** `supabase functions serve <name> --no-verify-jwt` runs a function at `http://127.0.0.1:54321/functions/v1/<name>`. Get a real user JWT from the browser console on a logged-in page: `(await window.miclSupabase.auth.getSession()).data.session.access_token`.

---

### Task 1: Shared helpers

**Files:**
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/_shared/clients.ts`
- Create: `supabase/functions/_shared/tier.ts`
- Create: `supabase/functions/_shared/anthropic.ts`

- [ ] **Step 1: CORS headers**

`supabase/functions/_shared/cors.ts`:
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Supabase clients (service role + caller identity)**

`supabase/functions/_shared/clients.ts`:
```typescript
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// Service-role client: bypasses RLS, used for all reads/writes after auth.
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
}

// Resolve the caller's user id from their Authorization bearer token.
// Returns null if missing/invalid.
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
```

- [ ] **Step 3: Tier enforcement**

`supabase/functions/_shared/tier.ts`:
```typescript
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type Tier = "free" | "pro" | "ultra";
const RANK: Record<Tier, number> = { free: 0, pro: 1, ultra: 2 };

export async function getTier(db: SupabaseClient, userId: string): Promise<Tier> {
  const { data } = await db
    .from("user_tier")
    .select("tier")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.tier as Tier) ?? "free";
}

// Returns true if the user's tier meets or exceeds `required`.
export function meets(tier: Tier, required: Tier): boolean {
  return RANK[tier] >= RANK[required];
}
```

- [ ] **Step 4: Anthropic client + context loader**

`supabase/functions/_shared/anthropic.ts`:
```typescript
import Anthropic from "npm:@anthropic-ai/sdk";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

export const MODEL_FAST = "claude-sonnet-4-6";   // questions, feedback, research
export const MODEL_DEEP = "claude-opus-4-8";     // résumé, cover letter

// Loads the personalization context the prompts need for one user.
export async function loadUserContext(db: SupabaseClient, userId: string) {
  const [onb, resume] = await Promise.all([
    db.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(),
    db.from("resumes").select("fields, file_text").eq("user_id", userId).maybeSingle(),
  ]);
  const o = onb.data ?? {};
  const r = resume.data ?? {};
  return {
    targetRole: (o.target_roles?.[0] as string) ?? "the target role",
    targetRoles: (o.target_roles as string[]) ?? [],
    weakSpots: [...(o.pain_points ?? []), ...(o.practice_focus ?? [])] as string[],
    careerStage: (o.career_stage as string) ?? "unspecified",
    timeline: (o.interview_timeline as string) ?? "unspecified",
    resumeFields: (r.fields as Record<string, unknown>) ?? {},
    resumeText: (r.file_text as string) ?? "",
  };
}

// Compact, prompt-ready summary of the résumé (structured fields preferred,
// uploaded text as fallback).
export function resumeSummary(ctx: { resumeFields: Record<string, unknown>; resumeText: string }): string {
  const f = ctx.resumeFields;
  if (f && Object.keys(f).length) {
    return [
      `Title: ${f.title ?? ""}`,
      `Summary: ${f.summary ?? ""}`,
      `Experience: ${f.role ?? ""} at ${f.company ?? ""} (${f.dates ?? ""}) — ${f.b0 ?? ""} ${f.b1 ?? ""}`,
      `Skills: ${f.skills ?? ""}`,
    ].join("\n");
  }
  return ctx.resumeText?.slice(0, 4000) || "(no résumé on file)";
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/
git commit -m "feat: shared edge-function helpers (cors, clients, tier, anthropic)"
```

---

### Task 2: `ai-feedback` (simplest — build the template first)

Returns coaching on a user's answer. Sonnet, non-streaming. Pro tier.

**Files:**
- Create: `supabase/functions/ai-feedback/index.ts`

- [ ] **Step 1: Write the function**

`supabase/functions/ai-feedback/index.ts`:
```typescript
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_FAST, loadUserContext } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "pro")) return json({ error: "upgrade_required", need: "pro" }, 403);

    const { question, answer, sessionId, questionId } = await req.json();
    if (!question || !answer) return json({ error: "missing question or answer" }, 400);

    const ctx = await loadUserContext(db, userId);
    const msg = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 700,
      system:
        "You are Micl, an expert interview coach. Give concise, specific, encouraging " +
        "feedback on the candidate's answer. Tailor to their target role and known weak spots. " +
        "Return 2-4 sentences plus one concrete improvement. End with a score out of 10 as 'Score: N/10'.",
      messages: [{
        role: "user",
        content:
          `Target role: ${ctx.targetRole}\n` +
          `Known weak spots: ${ctx.weakSpots.join(", ") || "none recorded"}\n` +
          `Career stage: ${ctx.careerStage}\n\n` +
          `Question: ${question}\n\nCandidate's answer: ${answer}`,
      }],
    });

    const text = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const scoreMatch = text.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;

    if (sessionId) {
      await db.from("session_answers").insert({
        session_id: sessionId,
        question_id: questionId ?? null,
        answer_text: answer,
        feedback: text,
        score,
      });
    }
    return json({ feedback: text, score });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: Serve locally and call it**

```bash
supabase functions serve ai-feedback --no-verify-jwt --env-file supabase/functions/.env.local
```
(Create `supabase/functions/.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` for local runs; it is gitignored — see Task 7 Step 1.)

In a second terminal, with `$JWT` set to a real session token:
```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/ai-feedback \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"question":"Tell me about yourself.","answer":"Um, I am a person who codes things sometimes."}' | jq
```
Expected: JSON `{ "feedback": "...", "score": <number> }`. A token for a `free` user instead returns `{"error":"upgrade_required","need":"pro"}` with HTTP 403 — verify by temporarily checking a free user, or trust the tier gate (covered again in Task 8).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-feedback/ supabase/functions/.env.local
git commit -m "feat: ai-feedback edge function (Sonnet, Pro-gated)"
```
(`.env.local` will be removed from tracking in Task 7 Step 1; if it is already gitignored, only commit the function dir.)

---

### Task 3: `ai-question`

Generates tailored questions and stores them in `question_bank`. Sonnet. Pro tier.

**Files:**
- Create: `supabase/functions/ai-question/index.ts`

- [ ] **Step 1: Write the function**

`supabase/functions/ai-question/index.ts`:
```typescript
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_FAST, loadUserContext, resumeSummary } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "pro")) return json({ error: "upgrade_required", need: "pro" }, 403);

    const { count = 5, mode = "speed", topic = null } = await req.json().catch(() => ({}));
    const n = Math.min(Math.max(Number(count) || 5, 1), 15);
    const ctx = await loadUserContext(db, userId);

    const msg = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 1200,
      system:
        "You are Micl, an interview-prep question generator. Produce realistic interview " +
        "questions tailored to the candidate's target role, résumé, and weak spots. " +
        "Return ONLY a JSON array of objects: " +
        `[{"content": string, "topic": string, "difficulty": "easy"|"medium"|"hard"}]. No prose.`,
      messages: [{
        role: "user",
        content:
          `Generate ${n} ${mode === "gauntlet" ? "challenging, multi-part" : "varied"} questions.\n` +
          `Target role: ${ctx.targetRole}\n` +
          `Weak spots to target: ${ctx.weakSpots.join(", ") || "general interview skills"}\n` +
          (topic ? `Focus topic: ${topic}\n` : "") +
          `Candidate résumé:\n${resumeSummary(ctx)}`,
      }],
    });

    const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    let items: { content: string; topic?: string; difficulty?: string }[] = [];
    try {
      const start = raw.indexOf("["); const end = raw.lastIndexOf("]");
      items = JSON.parse(raw.slice(start, end + 1));
    } catch { return json({ error: "parse_failed", raw }, 502); }

    const rows = items.map((q) => ({
      user_id: userId,
      content: q.content,
      role: ctx.targetRole,
      topic: q.topic ?? topic ?? null,
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty ?? "") ? q.difficulty : "medium",
      source: "ai",
    }));
    const ins = await db.from("question_bank").insert(rows).select("id, content, topic, difficulty");
    if (ins.error) return json({ error: ins.error.message }, 500);

    return json({ questions: ins.data });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: Serve and test**

```bash
supabase functions serve ai-question --no-verify-jwt --env-file supabase/functions/.env.local
```
```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/ai-question \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"count":3,"mode":"speed"}' | jq
```
Expected: `{ "questions": [ { "id": <n>, "content": "...", ... } x3 ] }`. Confirm they persisted:
```sql
select count(*) from public.question_bank where source = 'ai';
```
Expected: ≥ 3.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-question/
git commit -m "feat: ai-question edge function — generate + store tailored questions (Sonnet, Pro)"
```

---

### Task 3a: Résumé file-text extraction helper

Populate `resumes.file_text` from the uploaded file so the AI can read real résumé content (the structured editor stays primary; this is the fallback). Runs server-side.

**Files:**
- Create: `supabase/functions/ai-ingest-resume/index.ts`

- [ ] **Step 1: Write the function (download from Storage → extract text → save)**

`supabase/functions/ai-ingest-resume/index.ts`:
```typescript
import { extractText, getDocumentProxy } from "npm:unpdf";
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const { data: row } = await db.from("resumes").select("file_path").eq("user_id", userId).maybeSingle();
    if (!row?.file_path) return json({ error: "no_file" }, 404);

    const dl = await db.storage.from("resumes").download(row.file_path);
    if (dl.error || !dl.data) return json({ error: "download_failed" }, 500);

    let text = "";
    if (row.file_path.toLowerCase().endsWith(".pdf")) {
      const buf = new Uint8Array(await dl.data.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const res = await extractText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
    } else {
      text = await dl.data.text(); // .txt / best-effort for .doc
    }

    await db.from("resumes").update({ file_text: text.slice(0, 20000) }).eq("user_id", userId);
    return json({ ok: true, chars: text.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: Serve and test** (requires a user who uploaded a PDF in Plan 1 Task 4)

```bash
supabase functions serve ai-ingest-resume --no-verify-jwt --env-file supabase/functions/.env.local
curl -s -X POST http://127.0.0.1:54321/functions/v1/ai-ingest-resume \
  -H "Authorization: Bearer $JWT" | jq
```
Expected: `{ "ok": true, "chars": <n> }`. Verify:
```sql
select length(file_text) from public.resumes where user_id = '<uid>';
```
Expected: > 0.

- [ ] **Step 3: Call it from onboarding after upload**

In `onboarding.html`, in the finish-handler right after the `resumes` upsert that records `file_path` (Plan 1 Task 4 Step 2), add a fire-and-forget ingest call:
```javascript
            // Kick off server-side text extraction (non-blocking)
            const sess = (await supabase.auth.getSession()).data.session
            if(sess){
              fetch('https://eezjeiitzvtduarviume.supabase.co/functions/v1/ai-ingest-resume', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${sess.access_token}` },
              }).catch(()=>{})
            }
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ai-ingest-resume/ onboarding.html
git commit -m "feat: ai-ingest-resume — extract uploaded résumé text into resumes.file_text"
```

---

### Task 4: `ai-research` (Tavily + Claude)

Researches a company/industry from the live web and stores a pack. Sonnet. Pro tier.

**Files:**
- Create: `supabase/functions/ai-research/index.ts`

- [ ] **Step 1: Write the function**

`supabase/functions/ai-research/index.ts`:
```typescript
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_FAST } from "../_shared/anthropic.ts";

async function tavily(query: string) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: Deno.env.get("TAVILY_API_KEY"),
      query,
      search_depth: "advanced",
      max_results: 6,
    }),
  });
  if (!res.ok) throw new Error(`tavily ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: { title: string; url: string; content: string }) =>
    `- ${r.title} (${r.url})\n  ${r.content}`).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "pro")) return json({ error: "upgrade_required", need: "pro" }, 403);

    const { company, role = null } = await req.json();
    if (!company) return json({ error: "missing company" }, 400);

    const sources = await tavily(`${company} company interview process culture recent news ${role ?? ""}`);

    const msg = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 1500,
      system:
        "You are Micl, an interview research analyst. Using ONLY the provided web sources, " +
        "produce a company prep pack. Return JSON with keys: " +
        `{"overview": string, "culture": string, "recent_news": string[], ` +
        `"interview_process": string, "likely_questions": string[], "talking_points": string[]}. No prose.`,
      messages: [{
        role: "user",
        content: `Company: ${company}\nRole: ${role ?? "general"}\n\nWeb sources:\n${sources}`,
      }],
    });

    const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    let pack: Record<string, unknown>;
    try {
      const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
      pack = JSON.parse(raw.slice(s, e + 1));
    } catch { return json({ error: "parse_failed", raw }, 502); }

    const ins = await db.from("company_packs")
      .insert({ user_id: userId, company, industry: role, research_json: pack })
      .select("id").single();

    return json({ id: ins.data?.id, pack });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: Serve and test** (needs `TAVILY_API_KEY` in `.env.local`)

```bash
supabase functions serve ai-research --no-verify-jwt --env-file supabase/functions/.env.local
curl -s -X POST http://127.0.0.1:54321/functions/v1/ai-research \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"company":"Stripe","role":"Software Engineer"}' | jq '.pack.overview, .pack.likely_questions'
```
Expected: a non-empty overview string and an array of questions. Verify persistence:
```sql
select company, research_json->>'overview' from public.company_packs order by created_at desc limit 1;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-research/
git commit -m "feat: ai-research edge function — Tavily web search + Claude synthesis (Sonnet, Pro)"
```

---

### Task 5: `ai-resume` (Opus, streaming)

Rewrites résumé sections. Opus 4.8, adaptive thinking, streaming. Ultra tier.

**Files:**
- Create: `supabase/functions/ai-resume/index.ts`

- [ ] **Step 1: Write the function**

`supabase/functions/ai-resume/index.ts`:
```typescript
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_DEEP, loadUserContext, resumeSummary } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "ultra")) return json({ error: "upgrade_required", need: "ultra" }, 403);

    // field = which section to improve ("summary" | "b0" | "b1" | "skills"); optional
    const { field = null, jobDescription = null } = await req.json().catch(() => ({}));
    const ctx = await loadUserContext(db, userId);

    const stream = anthropic.messages.stream({
      model: MODEL_DEEP,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system:
        "You are Micl, an elite résumé writer. Rewrite the requested section into quantified, " +
        "role-tailored, active-voice impact. Match the candidate's real experience — never invent " +
        "facts. Return JSON: " +
        `[{"field": string, "title": string, "why": string, "after": string}]. No prose.`,
      messages: [{
        role: "user",
        content:
          `Target role: ${ctx.targetRole}\n` +
          (jobDescription ? `Job description:\n${jobDescription}\n` : "") +
          (field ? `Improve only the "${field}" field.\n` : "Suggest improvements for summary, b0, b1, and skills.\n") +
          `\nCurrent résumé:\n${resumeSummary(ctx)}`,
      }],
    });

    const msg = await stream.finalMessage();
    const raw = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    let suggestions: unknown;
    try {
      const s = raw.indexOf("["); const e = raw.lastIndexOf("]");
      suggestions = JSON.parse(raw.slice(s, e + 1));
    } catch { return json({ error: "parse_failed", raw }, 502); }

    return json({ suggestions });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: Serve and test** (needs an Ultra-tier user — set one in Task 8)

```bash
supabase functions serve ai-resume --no-verify-jwt --env-file supabase/functions/.env.local
curl -s -X POST http://127.0.0.1:54321/functions/v1/ai-resume \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"field":"summary"}' | jq
```
Expected: `{ "suggestions": [ { "field": "summary", "title": "...", "why": "...", "after": "..." } ] }`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-resume/
git commit -m "feat: ai-resume edge function — section rewrites (Opus, adaptive thinking, Ultra)"
```

---

### Task 6: `ai-cover-letter` (Opus, streaming)

Generates a full cover letter and stores it. Opus 4.8, adaptive thinking, streaming. Ultra tier.

**Files:**
- Create: `supabase/functions/ai-cover-letter/index.ts`

- [ ] **Step 1: Write the function**

`supabase/functions/ai-cover-letter/index.ts`:
```typescript
import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, getUserId } from "../_shared/clients.ts";
import { getTier, meets } from "../_shared/tier.ts";
import { anthropic, MODEL_DEEP, loadUserContext, resumeSummary } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const db = serviceClient();
    const tier = await getTier(db, userId);
    if (!meets(tier, "ultra")) return json({ error: "upgrade_required", need: "ultra" }, 403);

    const { company, jobTitle, jobDescription = "" } = await req.json();
    if (!company || !jobTitle) return json({ error: "missing company or jobTitle" }, 400);

    const ctx = await loadUserContext(db, userId);
    const stream = anthropic.messages.stream({
      model: MODEL_DEEP,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system:
        "You are Micl, an expert cover-letter writer. Write a tailored, specific, confident " +
        "cover letter grounded in the candidate's real résumé. Three to four short paragraphs. " +
        "No clichés, no invented facts. Return ONLY the letter text.",
      messages: [{
        role: "user",
        content:
          `Company: ${company}\nRole: ${jobTitle}\n` +
          (jobDescription ? `Job description:\n${jobDescription}\n` : "") +
          `\nCandidate résumé:\n${resumeSummary(ctx)}`,
      }],
    });

    const msg = await stream.finalMessage();
    const content = msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("").trim();

    const ins = await db.from("cover_letters")
      .insert({ user_id: userId, job_title: jobTitle, company, content })
      .select("id").single();

    return json({ id: ins.data?.id, content });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: Serve and test** (Ultra user)

```bash
supabase functions serve ai-cover-letter --no-verify-jwt --env-file supabase/functions/.env.local
curl -s -X POST http://127.0.0.1:54321/functions/v1/ai-cover-letter \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"company":"Stripe","jobTitle":"Software Engineer"}' | jq -r '.content'
```
Expected: a multi-paragraph letter. Verify:
```sql
select company, job_title, length(content) from public.cover_letters order by created_at desc limit 1;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-cover-letter/
git commit -m "feat: ai-cover-letter edge function — full letter generation + store (Opus, Ultra)"
```

---

### Task 7: Secrets + deploy all functions

**Files:**
- Create: `supabase/functions/.env.local` (gitignored — local only)
- Modify: `.gitignore`

- [ ] **Step 1: Gitignore local secrets**

Add to `.gitignore`:
```
supabase/functions/.env.local
```
If `.env.local` was committed in an earlier task, remove it from tracking:
```bash
git rm --cached supabase/functions/.env.local 2>/dev/null || true
git commit -m "chore: gitignore local edge-function secrets" || true
```

- [ ] **Step 2: Set the remote secrets**

```bash
supabase secrets set ANTHROPIC_API_KEY="sk-ant-..." TAVILY_API_KEY="tvly-..."
```
Expected: `Finished supabase secrets set.` (The Anthropic + Tavily keys come from the user.)

- [ ] **Step 3: Deploy every function**

```bash
supabase functions deploy ai-feedback ai-question ai-research ai-resume ai-cover-letter ai-ingest-resume
```
Expected: each deploys successfully. Note: these functions need `verify_jwt` ON (the default) so the platform requires a valid token — our code additionally resolves the user. The existing email functions are unaffected.

- [ ] **Step 4: Smoke-test the deployed endpoint**

```bash
curl -s -X POST https://eezjeiitzvtduarviume.supabase.co/functions/v1/ai-feedback \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"question":"Tell me about yourself.","answer":"I build web apps."}' | jq
```
Expected: live feedback JSON (proves remote secrets + deploy work end to end).

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: deploy AI edge functions; gitignore local secrets"
```

---

### Task 8: Tier test fixtures + gate verification

**Files:** none (data only)

- [ ] **Step 1: Give your test user Ultra**

Via Supabase MCP `execute_sql` (replace with your uid):
```sql
insert into public.user_tier (user_id, tier) values ('<your-uid>', 'ultra')
on conflict (user_id) do update set tier = 'ultra', updated_at = now();
```

- [ ] **Step 2: Confirm a Pro-gated call succeeds and a free user is blocked**

With your Ultra token, `ai-feedback` returns feedback (already seen). Then downgrade and retest:
```sql
update public.user_tier set tier = 'free' where user_id = '<your-uid>';
```
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://eezjeiitzvtduarviume.supabase.co/functions/v1/ai-feedback \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"question":"x","answer":"y"}'
```
Expected: `403`. Restore your tier:
```sql
update public.user_tier set tier = 'ultra' where user_id = '<your-uid>';
```

- [ ] **Step 3: No commit** (data fixtures only). Record the tier test result in the PR description later.

---

## Self-review checklist

- [ ] Every spec edge function exists (`ai-question`, `ai-feedback`, `ai-research`, `ai-resume`, `ai-cover-letter`) + the `ai-ingest-resume` helper.
- [ ] Model split matches spec: Sonnet for question/feedback/research, Opus for résumé/cover-letter.
- [ ] Tier gate returns 403 with `need` for under-tier users (Task 8).
- [ ] Secrets exist only in Supabase (`supabase secrets list` shows `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`); none in any client file or git.
- [ ] All five+one functions deployed (`supabase functions list`).
- [ ] Persistence verified: `question_bank`, `company_packs`, `cover_letters`, `session_answers` each got a row from a test call.

**Next:** `docs/superpowers/plans/2026-06-25-ai-coach-3-frontend-wiring.md`.
