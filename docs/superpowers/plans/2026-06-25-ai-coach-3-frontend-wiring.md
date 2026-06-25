# AI Coach — Plan 3: Frontend Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded mock data on each feature page with real calls to the AI edge functions, so Speed Round, Gauntlet, Question Bank, Company Packs, Résumé, and Cover Letter are personalized end to end.

**Architecture:** Add one shared `ai-client.js` that creates the Supabase client and exposes `window.Micl.ai(fnName, body)` (attaches the session JWT, POSTs to `functions/v1/<fnName>`, returns JSON or throws on 4xx/5xx). Each feature page loads it before `app-shell.js`, then swaps its mock array / mock generator for an `await Micl.ai(...)` call, keeping the existing UI/render code.

**Tech Stack:** static HTML/JS, `@supabase/supabase-js@2.49.8` (esm CDN), the edge functions from Plan 2, `server.py` dev server (port 8753).

**Spec:** `docs/superpowers/specs/2026-06-25-ai-coach-design.md`
**Depends on:** Plans 1 + 2 deployed.

**Verification:** preview the page, exercise the flow, and confirm via `preview_network` that the `functions/v1/...` call returns 200 and the UI renders the live data. Tier-gate UX: a 403 surfaces an upgrade toast.

---

### Task 1: Shared AI client

**Files:**
- Create: `ai-client.js`

- [ ] **Step 1: Write the client**

`ai-client.js`:
```javascript
// Shared AI client for MICLEA feature pages.
// Load with <script type="module" src="ai-client.js"></script> BEFORE app-shell.js.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm'

const SUPABASE_URL  = 'https://eezjeiitzvtduarviume.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlemplaWl0enZ0ZHVhcnZpdW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTg4MjAsImV4cCI6MjA5NTg3NDgyMH0.Z2JC8QufY-sVp9VoUg8j08RZjHgKnePWJSZkP8U6oFc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
window.miclSupabase = supabase

async function ai(fnName, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_signed_in')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(out.error || `http_${res.status}`)
    err.status = res.status
    err.need = out.need
    throw err
  }
  return out
}

// Convenience: show an upgrade toast on a 403, rethrow otherwise.
function onAiError(e) {
  if (e.status === 403 && window.Miclea) {
    window.Miclea.toast(`Upgrade to ${e.need || 'Pro'} to use Micl AI`, 'err')
  } else if (window.Miclea) {
    window.Miclea.toast('Micl had trouble — try again', 'err')
  }
  console.error('[Micl AI]', e)
}

window.Micl = { ai, onAiError, supabase }
window.dispatchEvent(new Event('micl-ai-ready'))
```

- [ ] **Step 2: Verify it loads on a page**

Add `<script type="module" src="ai-client.js"></script>` just before `<script src="app-shell.js"></script>` in `resume.html` (this also **replaces** the inline Supabase module added in Plan 1 Task 3 Step 1 — delete that inline `<script type="module">` block since `ai-client.js` now provides `window.miclSupabase`).

Preview `http://127.0.0.1:8753/resume`, open the console, and run:
```js
typeof window.Micl?.ai
```
Expected: `"function"`.

- [ ] **Step 3: Commit**

```bash
git add ai-client.js resume.html
git commit -m "feat: shared Micl AI client (window.Micl.ai) + adopt it in resume.html"
```

---

### Task 2: Résumé page — live suggestions

Replace the static `SUGG` array (resume.html:214-223) with a real `ai-resume` call. The accept/reject UI and persistence (Plan 1) stay.

**Files:**
- Modify: `resume.html` (script IIFE, the `SUGG` definition and `openDrawer`)

- [ ] **Step 1: Make `openDrawer` fetch suggestions**

In `resume.html`, replace the `SUGG` constant (resume.html:214-223) with a mutable holder and a loader, and update `openDrawer` (resume.html:225) to fetch when empty. Replace lines 214-239 with:
```javascript
  var SUGG=[];

  async function fetchSuggestions(field){
    try{
      var out = await window.Micl.ai('ai-resume', { field: field || null });
      SUGG = (out.suggestions || []).map(function(s,i){ return {
        id: (s.field||'s')+i, field: s.field, title: s.title, why: s.why, after: s.after
      };});
    }catch(e){ window.Micl.onAiError(e); SUGG=[]; }
  }

  async function openDrawer(filterId){
    $('#drawer').classList.add('open');$('#drawerScrim').classList.add('open');
    $('#suggBody').innerHTML='<div class="sg-loading" style="padding:24px;color:var(--ink-muted)">Micl is reviewing your résumé…</div>';
    await fetchSuggestions(filterId);
    var list = SUGG;
    if(!list.length){ $('#suggBody').innerHTML='<div style="padding:24px;color:var(--ink-muted)">No suggestions right now.</div>'; return; }
    $('#suggBody').innerHTML=list.map(function(s){
      return '<div class="sugg" data-field="'+s.field+'" data-id="'+s.id+'">'+
        '<div class="sg-t"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'+s.title+'</div>'+
        '<div class="sg-why">'+s.why+'</div>'+
        '<div class="sg-before">'+esc(model[s.field])+'</div>'+
        '<div class="sg-after">'+esc(s.after)+'</div>'+
        '<div class="sg-act"><button class="sg-accept">Accept</button><button class="sg-reject">Reject</button></div>'+
        '<div class="sg-status ok">✓ Applied</div>'+
      '</div>';
    }).join('');
  }
```
The accept handler at resume.html:247 still reads `SUGG.filter(...)` — leave it; `SUGG` is now populated before the cards render, so `card.dataset.id` lookups still resolve.

- [ ] **Step 2: Verify**

Preview `http://127.0.0.1:8753/resume` as an Ultra user. Click "Ask Micl". Confirm via `preview_network` a `POST .../functions/v1/ai-resume` returns 200, and real suggestion cards appear with the candidate's actual summary in the "before" box. Click Accept and confirm the field updates + "Résumé saved" toast (Plan 1 persistence).

- [ ] **Step 3: Commit**

```bash
git add resume.html
git commit -m "feat: résumé page uses live ai-resume suggestions instead of mock SUGG"
```

---

### Task 3: Cover-letter page — live generation + refine

`cover-letter.html` has a mock `draft()` behind `#genBtn` (cover-letter.html:132) and a mock `SUGG` (cover-letter.html:139). Wire generation to `ai-cover-letter`.

**Files:**
- Modify: `cover-letter.html`

- [ ] **Step 1: Add the AI client**

Add `<script type="module" src="ai-client.js"></script>` immediately before `<script src="app-shell.js"></script>` (cover-letter.html:112).

- [ ] **Step 2: Wire `#genBtn` to the function**

Replace the `#genBtn` click handler (cover-letter.html:132-136) with a real call. The page needs a company + role; read them from the existing inputs if present, else prompt. Replace the handler body with:
```javascript
  $('#genBtn').addEventListener('click', async function(){
    var btn=this;
    var company = ($('#companyInput')&&$('#companyInput').value.trim()) || prompt('Which company is this for?');
    var jobTitle = ($('#roleInput')&&$('#roleInput').value.trim()) || prompt('What role?');
    if(!company || !jobTitle){ Miclea.toast('Add a company and role first','err'); return; }
    if(!unlimited){ if(editsLeft<=0){Miclea.toast('No AI generations left this month','err');return;} }
    btn.disabled=true; btn.style.opacity=.6;
    var label=btn.innerHTML; btn.textContent='Drafting…';
    try{
      var out = await window.Micl.ai('ai-cover-letter', { company: company, jobTitle: jobTitle });
      setBody(out.content);
      if(!unlimited){ editsLeft--; $('#editsLeft').textContent=editsLeft; }
      Miclea.toast('Draft ready — edit or refine with Micl');
    }catch(e){ window.Micl.onAiError(e); }
    finally{ btn.disabled=false; btn.style.opacity=1; btn.innerHTML=label; }
  });
```
Note: if `#companyInput`/`#roleInput` do not exist on the page, the `prompt()` fallback covers it; a later polish task can add proper inputs.

- [ ] **Step 3: Verify**

Preview `http://127.0.0.1:8753/cover-letter` as Ultra. Click "Generate draft with Micl", enter a company + role. Confirm `POST .../ai-cover-letter` → 200 (via `preview_network`) and a real multi-paragraph letter fills the editor + preview.

- [ ] **Step 4: Commit**

```bash
git add cover-letter.html
git commit -m "feat: cover-letter page generates via ai-cover-letter"
```

---

### Task 4: Speed Round — AI questions + per-answer feedback

`speed-round.html` uses `var QUESTIONS=[...]` (line 191), starts via `startSession` (#startBtn, line 291), advances via `next` (#nextBtn, line 289), loads a question with `loadQ` reading `QUESTIONS[idx]`.

**Files:**
- Modify: `speed-round.html`

- [ ] **Step 1: Add the AI client**

Add `<script type="module" src="ai-client.js"></script>` immediately before `<script src="app-shell.js"></script>` (speed-round.html:187).

- [ ] **Step 2: Fetch questions on start; create a session row**

Find `startSession` (the `#startBtn` handler, speed-round.html:291) and make it async: before showing the first question, fetch tailored questions and open a `practice_sessions` row. Wrap the existing start logic so it runs after this prelude. At the top of `startSession`, add:
```javascript
    // Pull AI-tailored questions (fallback to the built-in set on failure)
    try{
      var out = await window.Micl.ai('ai-question', { count: total, mode: 'speed' });
      if(out.questions && out.questions.length){
        QUESTIONS = out.questions.map(function(q){ return { q: q.content, a: '', topic: q.topic, id: q.id }; });
        total = QUESTIONS.length; $('#qTotal').textContent = total;
      }
    }catch(e){ window.Micl.onAiError(e); /* keep built-in QUESTIONS */ }
    try{
      var s = await window.miclSupabase.from('practice_sessions')
        .insert({ user_id: (await window.miclSupabase.auth.getUser()).data.user.id, mode:'speed' })
        .select('id').single();
      window.miclSessionId = s.data && s.data.id;
    }catch(e){ /* non-blocking */ }
```
Change the `startSession` declaration to `async function startSession(){` and the `#startBtn` listener (speed-round.html:291) to `$('#startBtn').addEventListener('click',function(){startSession();});`.

- [ ] **Step 3: Request feedback on each answer**

In `next` (the `#nextBtn` handler, speed-round.html:289), after the current answer is captured but before advancing, request feedback for the spoken/typed answer. Add inside `next`, before `idx++`:
```javascript
    var answered = ($('#ttext') && $('#ttext').textContent || '').trim();
    if(answered && QUESTIONS[idx]){
      window.Micl.ai('ai-feedback', {
        question: QUESTIONS[idx].q,
        answer: answered,
        sessionId: window.miclSessionId,
        questionId: QUESTIONS[idx].id || null,
      }).then(function(fb){
        if(fb && fb.score!=null) scores.push(Number(fb.score)*10);
        if(fb && fb.feedback && window.Miclea) Miclea.toast('Micl scored that '+fb.score+'/10');
      }).catch(window.Micl.onAiError);
    }
```
(The existing `scores` array feeds the end-of-session chart at speed-round.html:310-314; AI scores now flow in.)

- [ ] **Step 4: Verify**

Preview `http://127.0.0.1:8753/speed-round` as Pro/Ultra. Click Start; confirm `POST .../ai-question` → 200 and the first question is a tailored one (not the built-in "Tell me about yourself" unless AI chose it). Type an answer, click Next; confirm `POST .../ai-feedback` → 200 and a score toast. Finish and confirm a row in `practice_sessions` + `session_answers`:
```sql
select count(*) from public.session_answers where session_id = (select max(id) from public.practice_sessions);
```

- [ ] **Step 5: Commit**

```bash
git add speed-round.html
git commit -m "feat: Speed Round pulls AI questions + per-answer feedback, logs a session"
```

---

### Task 5: Gauntlet — AI rounds + feedback

`gauntlet.html` uses `var ROUNDS=[...]` (line 216), `startGauntlet` (#startBtn, line 334), `submit` (#nextBtn, line 333).

**Files:**
- Modify: `gauntlet.html`

- [ ] **Step 1: Add the AI client**

Add `<script type="module" src="ai-client.js"></script>` immediately before `<script src="app-shell.js"></script>` (gauntlet.html:211).

- [ ] **Step 2: Fetch harder questions on start**

Make `startGauntlet` async and, before it builds the first round, fetch gauntlet-mode questions to populate the round questions. At the top of `startGauntlet`, add:
```javascript
    try{
      var out = await window.Micl.ai('ai-question', { count: 9, mode: 'gauntlet' });
      if(out.questions && out.questions.length){
        window.miclGauntletQs = out.questions.map(function(q){ return q.content; });
      }
    }catch(e){ window.Micl.onAiError(e); }
    try{
      var s = await window.miclSupabase.from('practice_sessions')
        .insert({ user_id:(await window.miclSupabase.auth.getUser()).data.user.id, mode:'gauntlet' })
        .select('id').single();
      window.miclSessionId = s.data && s.data.id;
    }catch(e){ /* non-blocking */ }
```
Where `ROUNDS` supplies each round's question text, prefer `window.miclGauntletQs` when present (replace the question-text lookup in the round builder with `(window.miclGauntletQs && window.miclGauntletQs[globalQuestionIndex]) || ROUNDS[...]`). Change `startGauntlet` to `async function` and its `#startBtn` listener (gauntlet.html:334) to `$('#startBtn').addEventListener('click',function(){startGauntlet();});`.

- [ ] **Step 3: Feedback on submit**

In `submit` (the `#nextBtn` handler, gauntlet.html:333), after capturing the answer, fire an `ai-feedback` call (same shape as Speed Round Step 3), passing `window.miclSessionId`. Use the current round's question text as `question`.

- [ ] **Step 4: Verify**

Preview `http://127.0.0.1:8753/gauntlet` as Pro/Ultra. Start; confirm `POST .../ai-question` (count 9, gauntlet) → 200 and questions populate. Submit an answer; confirm `POST .../ai-feedback` → 200. Finish and confirm a `gauntlet` row in `practice_sessions`.

- [ ] **Step 5: Commit**

```bash
git add gauntlet.html
git commit -m "feat: Gauntlet pulls AI questions + feedback, logs a session"
```

---

### Task 6: Question Bank — load from Supabase + generate

`question-bank.html` uses `var BANK=[...]` (line 135) and `render()` (line 163).

**Files:**
- Modify: `question-bank.html`

- [ ] **Step 1: Add the AI client**

Add `<script type="module" src="ai-client.js"></script>` immediately before `<script src="app-shell.js"></script>` (question-bank.html:126).

- [ ] **Step 2: Load real questions (curated + the user's AI questions)**

Replace the static `BANK` initializer (question-bank.html:135) with a load from Supabase, then call `render()`. After the `var BANK=[...]` declaration, add:
```javascript
  async function loadBank(){
    try{
      var sb = window.miclSupabase;
      var res = await sb.from('question_bank')
        .select('id, content, role, topic, difficulty, source')
        .order('created_at', { ascending:false })
        .limit(200);
      if(res.data && res.data.length){
        BANK = res.data.map(function(r){ return {
          q: r.content, topic: r.topic || r.role || 'General',
          diff: r.difficulty || 'medium', ai: r.source === 'ai'
        };});
        render();
      }
    }catch(e){ /* keep static BANK */ }
  }
  if(window.miclSupabase) loadBank(); else window.addEventListener('micl-ai-ready', loadBank);
```
(RLS returns curated rows + the caller's own AI rows — exactly the intended bank.)

- [ ] **Step 3: Add a "Generate questions" action**

Find the page's primary action button (the header CTA). Wire a click to:
```javascript
    try{
      Miclea.toast('Micl is writing fresh questions…');
      await window.Micl.ai('ai-question', { count: 5, mode: 'speed' });
      await loadBank();
      Miclea.toast('Added 5 new questions');
    }catch(e){ window.Micl.onAiError(e); }
```
If no suitable button exists, add one in the header: `<button class="btn btn-brand btn-sm" id="genQs">Generate with Micl</button>` and bind the handler to `#genQs`.

- [ ] **Step 4: Verify**

Preview `http://127.0.0.1:8753/question-bank`. Confirm the list shows the 10 curated questions (from Plan 1 Task 5) on load (via `preview_network`, a `question_bank` select → 200). Click Generate; confirm `POST .../ai-question` → 200 and 5 new AI-tagged questions appear.

- [ ] **Step 5: Commit**

```bash
git add question-bank.html
git commit -m "feat: Question Bank loads from Supabase + generates via ai-question"
```

---

### Task 7: Company Packs — live research

`company-packs.html` uses `var PACKS=[...]` (line 101).

**Files:**
- Modify: `company-packs.html`

- [ ] **Step 1: Add the AI client**

Add `<script type="module" src="ai-client.js"></script>` immediately before `<script src="app-shell.js"></script>` (company-packs.html:91).

- [ ] **Step 2: Add a research input + render the result**

Add a small search row near the top of the packs container and a handler. Insert into the page header (adjust the container selector to the page's main wrapper):
```html
<div class="pack-research" style="display:flex;gap:8px;margin:16px 0">
  <input id="coInput" placeholder="Research a company (e.g. Stripe)" style="flex:1;padding:10px 12px;border:1px solid var(--app-line);border-radius:8px">
  <button class="btn btn-brand" id="coGo">Research with Micl</button>
</div>
<div id="packResult"></div>
```
Then the handler (in the page script):
```javascript
  $('#coGo') && $('#coGo').addEventListener('click', async function(){
    var company = $('#coInput').value.trim();
    if(!company){ Miclea.toast('Enter a company','err'); return; }
    var role = window.Miclea ? null : null;
    $('#coGo').disabled=true; var lbl=$('#coGo').textContent; $('#coGo').textContent='Researching…';
    try{
      var out = await window.Micl.ai('ai-research', { company: company });
      var p = out.pack || {};
      $('#packResult').innerHTML =
        '<div class="card"><h3 class="serif">'+company+'</h3>'+
        '<p>'+(p.overview||'')+'</p>'+
        '<h4>Culture</h4><p>'+(p.culture||'')+'</p>'+
        '<h4>Interview process</h4><p>'+(p.interview_process||'')+'</p>'+
        '<h4>Likely questions</h4><ul>'+((p.likely_questions||[]).map(function(q){return '<li>'+q+'</li>';}).join(''))+'</ul>'+
        '<h4>Talking points</h4><ul>'+((p.talking_points||[]).map(function(q){return '<li>'+q+'</li>';}).join(''))+'</ul></div>';
    }catch(e){ window.Micl.onAiError(e); }
    finally{ $('#coGo').disabled=false; $('#coGo').textContent=lbl; }
  });
```
Ensure a `$` helper exists on the page (define `var $=function(s){return document.querySelector(s)}` if not already present in the script block).

- [ ] **Step 3: Verify**

Preview `http://127.0.0.1:8753/company-packs` as Pro/Ultra. Type "Stripe", click Research. Confirm `POST .../ai-research` → 200 (via `preview_network`) and a rendered pack with overview + likely questions. Confirm persistence:
```sql
select company from public.company_packs order by created_at desc limit 1;
```

- [ ] **Step 4: Commit**

```bash
git add company-packs.html
git commit -m "feat: Company Packs runs live ai-research and renders the pack"
```

---

### Task 8: Sync server tier into the localStorage UX mirror

The pages read `Miclea.getTier()` (localStorage) for lock UX; the server is now the source of truth. Mirror the server tier on load so the UX matches entitlements.

**Files:**
- Modify: `app-shell.js` (in `mount()`, near where it applies tier/theme)

- [ ] **Step 1: Pull the server tier on shell mount**

In `app-shell.js`, find where the shell initializes `window.Miclea` and applies tier (the `paintTierUI`/`applyLocks` area — search for `getTier`). After `window.Miclea` is exposed and `ai-client.js` may be present, add a one-shot sync:
```javascript
  // Mirror the server-side tier into localStorage so lock UX matches entitlements.
  (async function syncServerTier(){
    try{
      var sb = window.miclSupabase; if(!sb) return;
      var u = (await sb.auth.getUser()).data.user; if(!u) return;
      var r = await sb.from('user_tier').select('tier').eq('user_id', u.id).maybeSingle();
      if(r.data && r.data.tier && r.data.tier !== Miclea.getTier()){
        Miclea.setTier(r.data.tier);
        window.dispatchEvent(new Event('tierchange'));
      }
    }catch(e){ /* offline / not signed in — keep local */ }
  })();
```
Because this runs after pages may have already painted, the `tierchange` event (which several pages listen for and reload on, e.g. resume.html:176) reconciles the UI.

- [ ] **Step 2: Verify**

Set your test user to `pro` server-side:
```sql
update public.user_tier set tier='pro' where user_id='<your-uid>';
```
Clear `localStorage.miclea_tier` in the console, reload a feature page, and confirm `Miclea.getTier()` becomes `"pro"` and Ultra-only locks (e.g. résumé unlimited edits) stay locked.

- [ ] **Step 3: Commit**

```bash
git add app-shell.js
git commit -m "feat: mirror server-side tier into localStorage on shell mount"
```

---

## Self-review checklist

- [ ] Every feature page loads `ai-client.js` before `app-shell.js`.
- [ ] No page still renders only its mock array when signed in (résumé `SUGG`, cover-letter `draft()`, speed `QUESTIONS`, gauntlet `ROUNDS`, bank `BANK`, packs `PACKS` all have a live path).
- [ ] Mock data remains as a graceful fallback when a call fails (offline / error) — verified by blocking the network and confirming pages still function.
- [ ] 403 from an under-tier user shows an upgrade toast, not a broken UI.
- [ ] `practice_sessions` + `session_answers` rows are written from Speed Round and Gauntlet.
- [ ] No secret keys added to any page — only the public anon key via `ai-client.js`.

## Final integration pass

- [ ] Run the full happy path as an Ultra user: onboarding (upload résumé) → résumé edit/save → Speed Round (AI Qs + feedback) → Gauntlet → Question Bank (generate) → Company Packs (research) → Cover Letter (generate). Confirm each via `preview_network` 200s and the corresponding Supabase rows.
- [ ] Run as a Free user: AI actions show upgrade prompts; curated question bank still works.
- [ ] Open the PR summarizing the three plans; include the tier-gate test result from Plan 2 Task 8.
