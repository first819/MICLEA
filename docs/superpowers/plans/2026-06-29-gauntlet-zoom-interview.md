# Gauntlet Zoom-Style Video Interview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Gauntlet session into a Zoom-style 1:1 video interview — a large AI interviewer (Micl) who speaks each question, a real camera self-view, real microphone live-transcription — keeping the existing 3-round/break logic and detailed results analysis.

**Architecture:** Reuse `gauntlet.html`'s setup screen, round/question/scoring state machine, and results screen. Replace the session + break presentation with a **lobby** (permission gate + device preview) and an **immersive call** screen (big interviewer, self-view PiP, captions, control bar), with the break rendered as an in-call overlay. A new `interviewer.js` owns how Micl looks and speaks behind two independent, swappable providers (voice + visual) driven by a multi-character config; the shipping defaults (browser speech + AI portrait + speaking FX) need no API key.

**Tech Stack:** Vanilla HTML/CSS/JS (no build, no test framework). `navigator.mediaDevices.getUserMedia` (camera/mic), Web Audio `AnalyserNode` (mic meter), `webkitSpeechRecognition` (live transcript), `speechSynthesis` (voice now). Supabase edge functions (`ai-question`, `ai-feedback`) reused. Verification via the Claude_Preview MCP sandbox.

**Reference spec:** `docs/superpowers/specs/2026-06-29-gauntlet-zoom-interview-design.md`

---

## Conventions for every verification step

This project has no automated tests. "Verify" means: copy the changed files into the preview sandbox, reload, and inspect via the Claude_Preview MCP. The sandbox serves `/tmp/miclea-preview`, **not** the repo — you MUST copy first.

Standard sync command (run from repo root `/Users/first/Downloads/MICLEA`):

```bash
cp gauntlet.html interviewer.js dashboard.html /tmp/miclea-preview/ 2>/dev/null; cp -r images /tmp/miclea-preview/ 2>/dev/null; echo synced
```

Then in the preview MCP: `preview_start` (if not running) pointed at the sandbox, open `gauntlet.html`, `preview_eval` `window.location.reload()`, then `preview_console_logs` (expect no errors) and `preview_snapshot` / `preview_screenshot`.

**Camera/mic in the sandbox:** the headless browser usually has no real camera. Verify the **deny/fallback** path directly (needs no device), and for the happy path **stub** the APIs with `preview_eval` before reloading — code shown in Task 8.

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `interviewer.js` | Micl avatar + voice/visual providers + character config + `speak()` | **Create** |
| `images/interviewer-micl.jpg` | Default interviewer portrait (swappable via config) | **Create** |
| `dashboard.html` | Allow camera/mic for the embedded feature iframe | Modify (line ~649) |
| `gauntlet.html` | Lobby + call markup/styles; rewritten orchestration script | Modify (replace `#screen-session` + `#screen-break`; rewrite inline `<script>`) |

---

## Task 1: Interviewer module (`interviewer.js`)

Self-contained module: multi-character config, swappable voice + visual providers, `speak()` that resolves when Micl finishes. Shipping defaults (`browser` voice, `portrait` visual) need no key. ElevenLabs / talking-head are documented drop-in points.

**Files:**
- Create: `interviewer.js`

- [ ] **Step 1: Create `interviewer.js`**

```js
/* interviewer.js — Micl interviewer.
   Two independent, swappable providers: VOICE + VISUAL, driven by the active character.
   Shipping defaults need no API key. Load AFTER app-shell.js, BEFORE the page's call script. */
(function () {
  "use strict";

  // ---- Config: flip to upgrade. Defaults require no key. ----
  var VOICE_PROVIDER  = "browser";    // 'browser' | 'elevenlabs'
  var VISUAL_PROVIDER = "portrait";   // 'portrait' | 'talkinghead'

  // ---- Characters: add an interviewer = append a portrait + (later) a voice id. ----
  var CHARACTERS = [
    { id: "micl", name: "Micl", title: "Your AI interviewer",
      portraitUrl: "images/interviewer-micl.jpg", elevenVoiceId: "" }
  ];

  var active = CHARACTERS[0];
  var stageEl = null;

  // ---------------- VISUAL ----------------
  function renderPortrait() {
    stageEl.innerHTML =
      '<div class="mi-bg"></div>' +
      '<div class="mi-ring"></div>' +
      '<img class="mi-portrait" src="' + active.portraitUrl + '" alt="' + active.name + '" ' +
        'onerror="this.style.display=\'none\'">' +
      '<div class="mi-fx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="mi-name">' + active.name + '<small>' + active.title + '</small></div>';
  }
  function mountVisual() {
    // 'talkinghead' drop-in: render a <video> here and swap in clip URLs in speak().
    renderPortrait();
  }
  function setSpeaking(on) {
    if (stageEl) stageEl.classList.toggle("mi-speaking", !!on);
  }

  // ---------------- VOICE: browser (default) ----------------
  function speakBrowser(text) {
    return new Promise(function (resolve) {
      var done = false;
      function finish() { if (!done) { done = true; resolve(); } }
      var synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
        // No TTS available: hold long enough to read the caption.
        setTimeout(finish, Math.min(9000, 1600 + text.length * 45));
        return;
      }
      try { synth.cancel(); } catch (e) {}
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 1.0;
      u.onend = finish; u.onerror = finish;
      synth.speak(u);
      // Safety net: some browsers never fire onend.
      setTimeout(finish, Math.min(15000, 2500 + text.length * 60));
    });
  }

  // ---------------- VOICE: elevenlabs (drop-in, later) ----------------
  function speakElevenLabs(text) {
    // Later: POST {text, voiceId: active.elevenVoiceId} to a Supabase edge fn that
    // holds the EL key, receive audio, play it, resolve on 'ended', drive FX from
    // amplitude. On any failure, fall back to the browser voice.
    return speakBrowser(text);
  }

  // ---------------- public ----------------
  function speak(text) {
    if (!text) return Promise.resolve();
    setSpeaking(true);
    var p = (VOICE_PROVIDER === "elevenlabs") ? speakElevenLabs(text) : speakBrowser(text);
    return p.then(function () { setSpeaking(false); },
                  function () { setSpeaking(false); });
  }
  function mount(el) { stageEl = el; mountVisual(); }
  function setCharacter(id) {
    var c = CHARACTERS.filter(function (x) { return x.id === id; })[0];
    if (c) { active = c; if (stageEl) mountVisual(); }
  }
  function destroy() {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    setSpeaking(false);
  }

  window.MiclInterviewer = {
    mount: mount, setCharacter: setCharacter, speak: speak,
    setSpeaking: setSpeaking, destroy: destroy, characters: CHARACTERS
  };
})();
```

- [ ] **Step 2: Sanity-check syntax**

Run: `node --check interviewer.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add interviewer.js
git commit -m "feat(gauntlet): interviewer module with swappable voice/visual providers"
```

---

## Task 2: Default interviewer portrait asset

The `portrait` visual provider needs one realistic headshot. Use a royalty-free professional portrait as the default; it is swappable via the `CHARACTERS` config and the user will replace it / add more later.

**Files:**
- Create: `images/interviewer-micl.jpg`

- [ ] **Step 1: Download a professional headshot into `images/`**

```bash
curl -fsSL "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=900&fit=crop&crop=faces" -o images/interviewer-micl.jpg
```

- [ ] **Step 2: Verify it downloaded as a real image**

Run: `file images/interviewer-micl.jpg`
Expected: `images/interviewer-micl.jpg: JPEG image data, ...` (not HTML/empty). If the URL fails, substitute any local square headshot at the same path.

- [ ] **Step 3: Commit**

```bash
git add images/interviewer-micl.jpg
git commit -m "feat(gauntlet): default interviewer portrait asset"
```

---

## Task 3: Allow camera/mic in the embedded feature iframe

In the dashboard, core features load inside `#featureFrame`. Iframes block `getUserMedia` unless granted via `allow`. Without this, the gauntlet's camera/mic fail when opened from the dashboard.

**Files:**
- Modify: `dashboard.html:649`

- [ ] **Step 1: Add the `allow` attribute to the iframe**

Find (line ~649):

```html
    <iframe id="featureFrame" title="Feature" referrerpolicy="same-origin"></iframe>
```

Replace with:

```html
    <iframe id="featureFrame" title="Feature" referrerpolicy="same-origin" allow="camera; microphone; autoplay"></iframe>
```

- [ ] **Step 2: Verify the attribute is present**

Run: `grep -n 'allow="camera; microphone; autoplay"' dashboard.html`
Expected: one match on the `featureFrame` line.

- [ ] **Step 3: Commit**

```bash
git add dashboard.html
git commit -m "feat(gauntlet): allow camera/mic for embedded feature iframe"
```

---

## Task 4: Load the interviewer module + remove old session/break markup

Wire `interviewer.js` into `gauntlet.html` and delete the old card-based session and break sections (replaced in Tasks 5–7). The setup and results sections stay.

**Files:**
- Modify: `gauntlet.html` (script tags; remove `#screen-session` and `#screen-break`)

- [ ] **Step 1: Load `interviewer.js` after `app-shell.js`**

Find:

```html
<script type="module" src="ai-client.js"></script>
<script src="app-shell.js"></script>
```

Replace with:

```html
<script type="module" src="ai-client.js"></script>
<script src="app-shell.js"></script>
<script src="interviewer.js"></script>
```

- [ ] **Step 2: Delete the old `#screen-session` section**

Remove the entire block from `<!-- ============ SESSION ============ -->` through its closing `</section>` (the `<section id="screen-session" ...> … </section>` currently at lines ~123–150).

- [ ] **Step 3: Delete the old `#screen-break` section**

Remove the entire block from `<!-- ============ BREAK (enforced) ============ -->` through its closing `</section>` (the `<section id="screen-break" ...> … </section>` currently at lines ~152–164).

- [ ] **Step 4: Verify the file still parses and the old sections are gone**

Run: `grep -c 'id="screen-session"\|id="screen-break"' gauntlet.html`
Expected: `0`

- [ ] **Step 5: Commit**

```bash
git add gauntlet.html
git commit -m "chore(gauntlet): load interviewer.js; drop old session/break markup"
```

---

## Task 5: Lobby screen markup

The permission gate: a full-screen dark lobby with a "use camera & microphone" card, a live device preview, a mic meter, and Join / fallback buttons.

**Files:**
- Modify: `gauntlet.html` (insert a new `#screen-lobby` section after `#screen-setup`)

- [ ] **Step 1: Insert the lobby section immediately after the setup `</section>`**

```html
      <!-- ============ LOBBY (permission gate) ============ -->
      <section id="screen-lobby" class="hide">
        <div class="lobby">
          <div class="lobby-preview">
            <video id="lobbyVideo" autoplay playsinline muted></video>
            <div id="lobbyVideoOff" class="lobby-videooff">Camera preview will appear here</div>
            <div class="lobby-self-tag">You</div>
          </div>

          <!-- state: ask permission -->
          <div class="lobby-panel" id="lobbyGrant">
            <h2 class="serif">Ready for your interview?</h2>
            <p>Micl needs your <b>camera</b> and <b>microphone</b> to run a realistic mock interview. Nothing is uploaded — video stays on your device.</p>
            <button class="btn btn-brand btn-lg" id="allowBtn" style="width:100%">Allow camera &amp; microphone</button>
            <div class="lobby-meter"><span>Mic</span><div class="lobby-meter-track"><div class="lobby-meter-fill" id="micMeterFill"></div></div></div>
          </div>

          <!-- state: granted, ready to join -->
          <div class="lobby-panel hide" id="lobbyReady">
            <h2 class="serif">You're set.</h2>
            <p>Camera and mic look good. Three rounds, escalating difficulty, with a short break between each. Speak your answers out loud — Micl is listening.</p>
            <div class="lobby-meter"><span>Mic</span><div class="lobby-meter-track"><div class="lobby-meter-fill" id="micMeterFill2"></div></div></div>
            <button class="btn btn-brand btn-lg" id="joinBtn" style="width:100%">Join interview</button>
          </div>

          <!-- state: denied / no device -->
          <div class="lobby-panel hide" id="lobbyDenied">
            <h2 class="serif">No camera or mic access</h2>
            <p>That's okay — you can still run the Gauntlet. Pick how you'd like to continue:</p>
            <button class="btn btn-brand btn-lg" id="joinAudioBtn" style="width:100%;margin-bottom:10px">Continue audio-only</button>
            <button class="btn btn-ghost btn-lg" id="joinTextBtn" style="width:100%">Continue with typing</button>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Verify the section exists**

Run: `grep -c 'id="screen-lobby"\|id="allowBtn"\|id="joinBtn"' gauntlet.html`
Expected: `3`

- [ ] **Step 3: Commit**

```bash
git add gauntlet.html
git commit -m "feat(gauntlet): lobby permission-gate markup"
```

---

## Task 6: Call screen markup (immersive)

The Zoom-style call: full-screen stage for Micl, self-view PiP, top bar (REC + round chip + progress rail), question/answer captions, and the control bar. The break overlay lives inside this section.

**Files:**
- Modify: `gauntlet.html` (insert a new `#screen-call` section after `#screen-lobby`)

- [ ] **Step 1: Insert the call section immediately after the lobby `</section>`**

```html
      <!-- ============ CALL (immersive) ============ -->
      <section id="screen-call" class="hide">
        <div class="call">
          <!-- big interviewer stage (interviewer.js mounts here) -->
          <div class="ai-stage" id="aiStage"></div>

          <!-- top bar -->
          <div class="call-top">
            <span class="call-pill rec"><i></i> REC</span>
            <span class="call-pill" id="roundChip">Round 1 · Broad</span>
            <span class="call-rail"><i id="seg1"></i><i id="seg2"></i><i id="seg3"></i></span>
          </div>

          <!-- question caption (Micl asking) -->
          <div class="cap cap-q hide" id="qCap"></div>

          <!-- self view -->
          <div class="self-tile hide" id="selfTile">
            <video id="selfVideo" autoplay playsinline muted></video>
            <div class="self-camoff">Camera off</div>
            <span class="self-label">You</span>
          </div>

          <!-- answer caption (your transcript) -->
          <div class="cap cap-a hide" id="answerCap">
            <span class="cap-lbl"><span class="eq"><i></i><i></i><i></i><i></i></span> You · listening</span>
            <div class="cap-text" id="answerText" spellcheck="false"></div>
          </div>

          <!-- control bar -->
          <div class="call-controls">
            <span class="turn-hint" id="turnHint">Micl is asking…</span>
            <button class="ctl" id="micBtn" aria-label="Toggle microphone" title="Mute / unmute">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
            </button>
            <button class="ctl" id="camBtn" aria-label="Toggle camera" title="Camera on / off">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </button>
            <button class="btn btn-brand" id="doneBtn" disabled>Done answering</button>
            <button class="ctl end" id="endBtn" aria-label="End interview" title="End interview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)"/></svg>
            </button>
          </div>

          <!-- enforced break overlay (in-call) -->
          <div class="break-overlay hide" id="breakOverlay">
            <span class="roundtag rt2" id="breakTag">Round 1 complete</span>
            <div class="break-ring">
              <svg width="190" height="190" viewBox="0 0 190 190" style="transform:rotate(-90deg)"><circle cx="95" cy="95" r="82" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="10"/><circle id="breakArc" cx="95" cy="95" r="82" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="515.2" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s linear"/></svg>
              <div class="bn"><b id="breakNum">30</b><span>mandatory break</span></div>
            </div>
            <h3 class="serif" id="breakHead">Round 2 is tougher — take a breath.</h3>
            <p id="breakBody">Shake out your shoulders, sip some water, reset. The questions get deeper from here.</p>
            <div class="lock-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> This break can't be skipped — even if you refresh.</div>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Verify the section + key hooks exist**

Run: `grep -c 'id="screen-call"\|id="aiStage"\|id="answerText"\|id="doneBtn"\|id="breakOverlay"' gauntlet.html`
Expected: `5`

- [ ] **Step 3: Commit**

```bash
git add gauntlet.html
git commit -m "feat(gauntlet): immersive call screen markup with in-call break overlay"
```

---

## Task 7: Call + lobby styles

Full-screen immersive styling for lobby and call: dark stage, portrait + speaking FX, self-view PiP, captions, control bar, break overlay. Added inside the existing `<style>` block in `gauntlet.html`.

**Files:**
- Modify: `gauntlet.html` (append to the `<style>…</style>` block, before `</style>`)

- [ ] **Step 1: Append these rules just before `</style>`**

```css
  /* ===== Immersive lobby + call ===== */
  body.gt-immersive .main, body.gt-immersive .content{padding:0!important}
  #screen-lobby, #screen-call{position:fixed;inset:0;z-index:60;background:#0e1217;color:#fff}
  /* lobby */
  .lobby{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap;padding:30px}
  .lobby-preview{position:relative;width:min(46vw,560px);aspect-ratio:4/3;border-radius:18px;overflow:hidden;background:linear-gradient(160deg,#2a3340,#161b22);border:1px solid rgba(255,255,255,.12)}
  .lobby-preview video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
  .lobby-videooff{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.5);font-size:14px}
  .lobby-preview video[srcobject], .lobby-preview.live .lobby-videooff{display:none}
  .lobby-self-tag{position:absolute;bottom:12px;left:12px;font-size:12px;background:rgba(0,0,0,.5);padding:4px 10px;border-radius:8px}
  .lobby-panel{width:min(90vw,380px)}
  .lobby-panel h2{font-size:30px;font-weight:400;margin-bottom:12px}
  .lobby-panel p{color:rgba(255,255,255,.72);font-size:15px;line-height:1.6;margin-bottom:22px}
  .lobby-meter{display:flex;align-items:center;gap:10px;margin-top:16px;font-size:12px;color:rgba(255,255,255,.6)}
  .lobby-meter-track{flex:1;height:7px;border-radius:100px;background:rgba(255,255,255,.14);overflow:hidden}
  .lobby-meter-fill{height:100%;width:0;background:linear-gradient(90deg,#1f40ed,#5b6bf0);transition:width .08s linear}
  /* call stage */
  .call{position:absolute;inset:0}
  .ai-stage{position:absolute;inset:0;overflow:hidden}
  .ai-stage .mi-bg{position:absolute;inset:0;background:radial-gradient(120% 120% at 50% 28%,#2a3340,#0e1217)}
  .ai-stage .mi-portrait{position:absolute;top:50%;left:50%;width:min(42vh,340px);height:min(42vh,340px);object-fit:cover;border-radius:50%;transform:translate(-50%,-58%);box-shadow:0 24px 80px rgba(0,0,0,.5)}
  .ai-stage .mi-ring{position:absolute;top:50%;left:50%;width:min(46vh,380px);height:min(46vh,380px);border-radius:50%;transform:translate(-50%,-58%);border:2px solid rgba(120,150,255,.25);transition:.3s}
  .ai-stage.mi-speaking .mi-ring{box-shadow:0 0 0 8px rgba(31,64,237,.18),0 0 90px rgba(31,64,237,.45);border-color:rgba(120,150,255,.6)}
  .ai-stage .mi-fx{position:absolute;top:calc(50% + min(20vh,150px));left:50%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:4px;height:30px;opacity:0;transition:opacity .25s}
  .ai-stage.mi-speaking .mi-fx{opacity:1}
  .ai-stage .mi-fx i{width:4px;height:6px;border-radius:3px;background:#6f86ff;animation:mifx 1s ease-in-out infinite}
  .ai-stage .mi-fx i:nth-child(2){animation-delay:.1s}.ai-stage .mi-fx i:nth-child(3){animation-delay:.2s}.ai-stage .mi-fx i:nth-child(4){animation-delay:.3s}.ai-stage .mi-fx i:nth-child(5){animation-delay:.4s}.ai-stage .mi-fx i:nth-child(6){animation-delay:.5s}.ai-stage .mi-fx i:nth-child(7){animation-delay:.6s}
  @keyframes mifx{0%,100%{height:6px}50%{height:28px}}
  .ai-stage .mi-name{position:absolute;left:24px;bottom:96px;font-size:15px;font-weight:600}
  .ai-stage .mi-name small{display:block;font-weight:400;font-size:12px;color:rgba(255,255,255,.6);font-family:var(--font-family-monospace);letter-spacing:.4px}
  /* top bar */
  .call-top{position:absolute;top:18px;left:18px;right:18px;display:flex;align-items:center;gap:10px;z-index:5}
  .call-pill{background:rgba(0,0,0,.45);backdrop-filter:blur(8px);padding:6px 12px;border-radius:100px;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:7px}
  .call-pill.rec{color:#ff6b6b}.call-pill.rec i{width:8px;height:8px;border-radius:50%;background:#ff5a5a;display:inline-block;animation:recbl 1.2s infinite}
  @keyframes recbl{50%{opacity:.3}}
  .call-rail{display:flex;gap:5px;width:160px;margin-left:auto}
  .call-rail i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.22);overflow:hidden;position:relative}
  .call-rail i::after{content:"";position:absolute;inset:0;width:var(--f,0%);background:#5b6bf0;transition:width .5s var(--ease-standard)}
  .call-rail i.r2::after{background:#f59e0b}.call-rail i.r3::after{background:#f87171}
  /* self view */
  .self-tile{position:absolute;right:18px;bottom:96px;width:min(22vw,210px);aspect-ratio:4/3;border-radius:12px;overflow:hidden;background:#222a33;border:2px solid rgba(255,255,255,.25);z-index:5}
  .self-tile video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
  .self-tile .self-camoff{position:absolute;inset:0;display:none;align-items:center;justify-content:center;font-size:12px;color:rgba(255,255,255,.6);background:#222a33}
  .self-tile.camoff .self-camoff{display:flex}
  .self-tile .self-label{position:absolute;bottom:7px;left:8px;font-size:11px;background:rgba(0,0,0,.5);padding:2px 8px;border-radius:6px}
  /* captions */
  .cap{position:absolute;left:50%;transform:translateX(-50%);max-width:min(80%,720px);z-index:6;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);border-radius:14px;padding:12px 18px;text-align:center}
  .cap-q{top:14%;font-size:clamp(17px,2.4vw,24px);font-family:var(--font-family-serif);line-height:1.3}
  .cap-a{bottom:104px;border:1px solid rgba(31,64,237,.6);text-align:left;min-width:min(80%,520px)}
  .cap-a .cap-lbl{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9fb0ff;display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .cap-a .cap-text{font-size:15px;line-height:1.55;color:#fff;white-space:pre-wrap;min-height:22px;outline:none}
  .cap-a .cap-text:empty::before{content:"Answer out loud — your words appear here.";color:rgba(255,255,255,.5)}
  .cap-a .eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px}
  .cap-a .eq i{width:3px;background:#6f86ff;border-radius:2px;height:4px}
  .cap-a.live .eq i{animation:mifx 1s ease-in-out infinite}
  .cap-a.live .eq i:nth-child(2){animation-delay:.15s}.cap-a.live .eq i:nth-child(3){animation-delay:.3s}.cap-a.live .eq i:nth-child(4){animation-delay:.45s}
  /* controls */
  .call-controls{position:absolute;left:0;right:0;bottom:0;height:84px;display:flex;align-items:center;justify-content:center;gap:14px;z-index:7;background:linear-gradient(transparent,rgba(0,0,0,.6))}
  .turn-hint{position:absolute;left:24px;font-size:13px;color:rgba(255,255,255,.7)}
  .ctl{width:50px;height:50px;border-radius:50%;border:none;background:rgba(255,255,255,.16);color:#fff;display:flex;align-items:center;justify-content:center;transition:.15s}
  .ctl:hover{background:rgba(255,255,255,.26)}
  .ctl svg{width:22px;height:22px}
  .ctl.off{background:#ef4444}
  .ctl.rec{box-shadow:0 0 0 3px rgba(111,134,255,.6)}
  .ctl.end{background:#ef4444}.ctl.end:hover{background:#dc2626}
  .call-controls .btn{padding:0 22px;height:48px}
  .call-controls .btn:disabled{opacity:.45;pointer-events:none}
  /* break overlay */
  .break-overlay{position:absolute;inset:0;z-index:20;background:rgba(8,11,15,.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px}
  .break-overlay .break-ring{width:190px;height:190px;position:relative;margin:14px 0}
  .break-overlay .break-ring .bn{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .break-overlay .break-ring .bn b{font-size:62px;font-weight:700;letter-spacing:-3px;font-variant-numeric:tabular-nums}
  .break-overlay .break-ring .bn span{font-family:var(--font-family-monospace);font-size:10.5px;letter-spacing:1.5px;color:rgba(255,255,255,.6);text-transform:uppercase}
  .break-overlay h3{font-size:24px;margin:6px 0 8px}
  .break-overlay p{max-width:440px;color:rgba(255,255,255,.72);font-size:15px;line-height:1.6}
  .break-overlay .lock-row{display:flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(255,255,255,.55);margin-top:16px;font-family:var(--font-family-monospace)}
  .break-overlay .lock-row svg{width:14px;height:14px}
  .break-overlay .roundtag{background:rgba(245,158,11,.2);color:#fbbf24}
```

- [ ] **Step 2: Sync to the sandbox and verify the lobby renders**

```bash
cp gauntlet.html interviewer.js dashboard.html /tmp/miclea-preview/; cp -r images /tmp/miclea-preview/; echo synced
```
In the preview MCP: open `gauntlet.html`, reload, then `preview_eval`:
```js
['screen-setup','screen-lobby','screen-call'].forEach(function(s){var e=document.getElementById(s);e&&e.classList.add('hide')});
document.getElementById('screen-lobby').classList.remove('hide');
```
Run `preview_screenshot`. Expected: dark full-screen lobby with the preview area, "Ready for your interview?" panel, and "Allow camera & microphone" button. `preview_console_logs` shows no errors.

- [ ] **Step 3: Commit**

```bash
git add gauntlet.html
git commit -m "feat(gauntlet): immersive lobby + call styles"
```

---

## Task 8: Orchestration script — full rewrite of the inline `<script>`

Replace the inline IIFE with the new flow: setup → lobby (media + meter + fallbacks) → call (per-question speak/listen loop) → in-call break → results. Reuses `ROUNDS`, `aiQ`, save/load, `radar`, and `finish` (results) logic from the original.

**Files:**
- Modify: `gauntlet.html` (replace everything between `<script>` (the non-module inline one) and its closing `</script>`)

- [ ] **Step 1: Replace the inline `<script> … </script>` (the last one, the IIFE) with this complete script**

```html
<script>
(function(){
  var $=function(s){return document.querySelector(s)};
  var LS=window.localStorage, KEY='miclea_gauntlet';
  var RING=2*Math.PI*82;

  var ROUNDS=[
    {tag:'Round 1 · Broad',cls:'rt1',qs:[
      {q:"To start — walk me through your background and what brought you here.",a:""},
      {q:"Why this role, and why now?",a:""}
    ]},
    {tag:'Round 2 · Harder',cls:'rt2',qs:[
      {q:"Tell me about a time a project failed. What did you actually do?",a:""},
      {q:"Walk me through a hard technical trade-off you made and why.",a:""},
      {q:"How do you handle a teammate who disagrees with your design?",a:""}
    ]},
    {tag:'Round 3 · Curveball',cls:'rt3',qs:[
      {q:"If you had to delete one feature from a product you love, what goes and why?",a:""},
      {q:"It's your first day and the codebase is on fire. No docs. What's your first hour?",a:""}
    ]}
  ];

  // ---- state ----
  var state, mode='video';           // 'video' | 'audio' | 'text'
  var mediaStream=null, audioCtx=null, meterRAF=null;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition, rec=null, finalText='', listening=false;
  var breakTimer=null, micOn=true;

  function save(){ try{LS.setItem(KEY,JSON.stringify(state))}catch(e){} }
  function clearSave(){ try{LS.removeItem(KEY)}catch(e){} }
  function load(){ try{return JSON.parse(LS.getItem(KEY))}catch(e){return null} }

  function globalIdx(r,q){ var n=0; for(var i=0;i<r;i++) n+=ROUNDS[i].qs.length; return n+q; }
  function aiQ(r,q){ var a=window.miclGauntletQs; var i=globalIdx(r,q); return (a&&a[i])||null; }
  function qTextFor(r,q){ return aiQ(r,q)||ROUNDS[r].qs[q].q; }

  // ---- screen switching ----
  function show(name){
    ['setup','lobby','call','results'].forEach(function(s){
      var el=$('#screen-'+s); if(el) el.classList.toggle('hide', s!==name);
    });
    document.body.classList.toggle('gt-immersive', name==='lobby'||name==='call');
  }

  // ---- role chips (setup) ----
  var roleChips=$('#roleChips');
  if(roleChips) roleChips.addEventListener('click',function(e){
    var b=e.target.closest('.chip-opt'); if(!b)return;
    this.querySelectorAll('.chip-opt').forEach(function(c){c.classList.remove('on')});
    b.classList.add('on');
  });

  // ---- MEDIA ----
  function setMeterFill(pct){ var a=$('#micMeterFill'),b=$('#micMeterFill2'); if(a)a.style.width=pct+'%'; if(b)b.style.width=pct+'%'; }
  function startMeter(){
    try{
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      var src=audioCtx.createMediaStreamSource(mediaStream);
      var an=audioCtx.createAnalyser(); an.fftSize=256; src.connect(an);
      var data=new Uint8Array(an.frequencyBinCount);
      (function loop(){
        an.getByteFrequencyData(data);
        var avg=data.reduce(function(x,y){return x+y},0)/data.length;
        setMeterFill(Math.min(100,Math.round(avg*1.6)));
        meterRAF=requestAnimationFrame(loop);
      })();
    }catch(e){}
  }
  async function requestMedia(){
    try{
      mediaStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
      mode='video';
      var v=$('#lobbyVideo'); if(v){ v.srcObject=mediaStream; v.play().catch(function(){}); }
      $('#lobbyVideo').parentNode.classList.add('live');
      startMeter();
      $('#lobbyGrant').classList.add('hide');
      $('#lobbyReady').classList.remove('hide');
    }catch(err){
      $('#lobbyGrant').classList.add('hide');
      $('#lobbyDenied').classList.remove('hide');
    }
  }
  function stopMedia(){
    if(mediaStream){ mediaStream.getTracks().forEach(function(t){try{t.stop()}catch(e){}}); mediaStream=null; }
    if(meterRAF){ cancelAnimationFrame(meterRAF); meterRAF=null; }
    if(audioCtx){ try{audioCtx.close()}catch(e){} audioCtx=null; }
  }

  // ---- SPEECH RECOGNITION ----
  function setListenUI(on){
    listening=on;
    var cap=$('#answerCap'); if(cap) cap.classList.toggle('live',on);
    var mb=$('#micBtn'); if(mb) mb.classList.toggle('rec',on && micOn);
  }
  function startRec(){
    finalText=($('#answerText').textContent||'').trim();
    if(!SR || mode==='text' || !micOn){
      var at=$('#answerText'); at.setAttribute('contenteditable','true');
      if(mode==='text') at.focus();
      setListenUI(true); return;
    }
    try{
      rec=new SR(); rec.continuous=true; rec.interimResults=true; rec.lang='en-US';
      rec.onresult=function(e){
        var interim='';
        for(var i=e.resultIndex;i<e.results.length;i++){
          var t=e.results[i][0].transcript;
          if(e.results[i].isFinal) finalText+=(finalText?' ':'')+t.trim();
          else interim+=t;
        }
        $('#answerText').textContent=(finalText+(interim?' '+interim:'')).trim();
      };
      rec.onerror=function(){};
      rec.onend=function(){ if(listening && micOn){ try{rec.start()}catch(e){} } };
      rec.start();
    }catch(e){
      $('#answerText').setAttribute('contenteditable','true');
    }
    setListenUI(true);
  }
  function stopRec(){ if(rec){ try{rec.onend=null; rec.stop()}catch(e){} rec=null; } setListenUI(false); }

  // ---- CALL FLOW ----
  function fetchQuestions(){
    var slots=0; ROUNDS.forEach(function(R){slots+=R.qs.length;});
    if(window.Micl && window.Micl.ai){
      window.Micl.ai('ai-question',{count:slots,mode:'gauntlet'}).then(function(out){
        if(out && out.questions && out.questions.length){
          window.miclGauntletQs=out.questions.map(function(q){return q.content;});
          // refresh the on-screen question if we're still on the first, AI-less render
          if(state && !$('#screen-call').classList.contains('hide')) refreshQCaption();
        }
      }).catch(function(e){ window.Micl.onAiError && window.Micl.onAiError(e); });
    }
    if(window.miclSupabase){
      window.miclSupabase.auth.getUser().then(function(u){
        var uid=u && u.data && u.data.user && u.data.user.id; if(!uid) return;
        window.miclSupabase.from('practice_sessions').insert({user_id:uid,mode:'gauntlet'}).select('id').single()
          .then(function(s){ window.miclSessionId=s.data&&s.data.id; });
      }).catch(function(){});
    }
  }
  function refreshQCaption(){ var qc=$('#qCap'); if(qc && qc.textContent.trim()==='') qc.textContent=qTextFor(state.r,state.q); }

  function showLobby(){ show('lobby'); }

  function beginCall(chosenMode){
    mode=chosenMode||mode;
    var roleEl=document.querySelector('#roleChips .on');
    state={role:roleEl?roleEl.textContent:'Candidate', r:0, q:0, scores:[[],[],[]], breakEnd:null, t0:Date.now()};
    save();
    fetchQuestions();
    enterCall();
    askCurrent();
  }
  function enterCall(){
    show('call');
    window.MiclInterviewer.mount($('#aiStage'));
    if(mode==='video' && mediaStream){
      var v=$('#selfVideo'); v.srcObject=mediaStream; v.play().catch(function(){});
      $('#selfTile').classList.remove('hide');
    } else {
      $('#selfTile').classList.add('hide');
    }
  }
  function paintRail(){
    [1,2,3].forEach(function(n){
      var seg=$('#seg'+n); if(!seg) return;
      seg.classList.toggle('r2',n===2); seg.classList.toggle('r3',n===3);
      var R=ROUNDS[state.r], pct;
      if(n-1<state.r) pct=100;
      else if(n-1===state.r) pct=Math.round(state.q/R.qs.length*100);
      else pct=0;
      seg.style.setProperty('--f',pct+'%');
    });
    $('#roundChip').textContent=ROUNDS[state.r].tag;
  }
  function setTurn(who){
    $('#turnHint').textContent = who==='ai' ? 'Micl is asking…' : 'Your turn — answer out loud';
    $('#doneBtn').disabled = who==='ai';
  }
  function askCurrent(){
    paintRail();
    var qt=qTextFor(state.r,state.q);
    var qc=$('#qCap'); qc.textContent=qt; qc.classList.remove('hide');
    $('#answerText').textContent=''; $('#answerCap').classList.add('hide');
    setTurn('ai');
    window.MiclInterviewer.speak(qt).then(function(){
      setTurn('you');
      $('#answerCap').classList.remove('hide');
      startRec();
    });
  }
  function submitAnswer(){
    if($('#doneBtn').disabled) return;
    var ans=($('#answerText').textContent||'').trim();
    if(!ans){ window.Miclea && Miclea.toast('Say or type your answer first'); return; }
    stopRec();
    if(aiQ(state.r,state.q) && window.Micl){
      window.Micl.ai('ai-feedback',{question:aiQ(state.r,state.q),answer:ans,sessionId:window.miclSessionId})
        .then(function(fb){ if(fb && fb.score!=null && window.Miclea) Miclea.toast('Micl scored that '+fb.score+'/10'); })
        .catch(function(e){ window.Micl.onAiError && window.Micl.onAiError(e); });
    }
    var base=state.r===0?78:state.r===1?70:74;
    state.scores[state.r].push(ans.length>50?base+Math.floor(Math.random()*16):base-10+Math.floor(Math.random()*12));
    var R=ROUNDS[state.r];
    if(state.q < R.qs.length-1){ state.q++; save(); askCurrent(); return; }
    if(state.r < ROUNDS.length-1){ state.breakEnd=Date.now()+30000; save(); showBreak(); return; }
    save(); endToResults();
  }

  // ---- controls ----
  function toggleMic(){
    micOn=!micOn;
    if(mediaStream){ var t=mediaStream.getAudioTracks()[0]; if(t) t.enabled=micOn; }
    $('#micBtn').classList.toggle('off',!micOn);
    if(listening){ if(micOn) startRec(); else stopRec(); if(!micOn){ $('#answerCap').classList.add('live'); } }
  }
  function toggleCam(){
    if(!mediaStream) return;
    var t=mediaStream.getVideoTracks()[0]; if(!t) return;
    t.enabled=!t.enabled;
    $('#camBtn').classList.toggle('off',!t.enabled);
    $('#selfTile').classList.toggle('camoff',!t.enabled);
  }
  function endInterview(){
    if(!window.confirm("End the interview now? You'll go straight to your analysis.")) return;
    endToResults();
  }
  function endToResults(){
    stopRec();
    try{ window.MiclInterviewer.destroy(); }catch(e){}
    stopMedia();
    clearInterval(breakTimer);
    finish();
  }

  // ---- BREAK overlay ----
  function showBreak(){
    var ov=$('#breakOverlay'); ov.classList.remove('hide');
    var nextR=state.r+1;
    $('#breakTag').textContent='Round '+(state.r+1)+' complete';
    $('#breakHead').textContent = nextR===1 ? 'Round 2 is tougher — take a breath.' : 'Final round: the curveball.';
    $('#breakBody').textContent = nextR===1
      ? 'Shake out your shoulders, sip some water, reset. The questions get deeper from here.'
      : "One unexpected question is coming. There's no perfect answer — they're watching how you think on your feet. Stay composed.";
    try{ window.MiclInterviewer.setSpeaking(false); }catch(e){}
    tickBreak();
  }
  function tickBreak(){
    clearInterval(breakTimer);
    function frame(){
      var left=Math.ceil((state.breakEnd-Date.now())/1000);
      if(left<=0){
        clearInterval(breakTimer);
        $('#breakNum').textContent='0';
        $('#breakArc').style.strokeDashoffset=RING;
        state.r++; state.q=0; state.breakEnd=null; save();
        setTimeout(function(){ $('#breakOverlay').classList.add('hide'); askCurrent(); },350);
        return;
      }
      $('#breakNum').textContent=left;
      $('#breakArc').style.strokeDashoffset=(RING*(1-left/30)).toFixed(1);
    }
    frame();
    breakTimer=setInterval(frame,250);
  }

  // ---- RESULTS (reused) ----
  function radar(vals){
    var labels=['Clarity','Confidence','Structure','Relevance','Pacing'];
    var cx=130,cy=108,R=78,n=5,el=$('#radar'); if(!el) return;
    function pt(i,r){var a=-Math.PI/2+i/n*2*Math.PI;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];}
    var g='';
    for(var ring=1;ring<=4;ring++){var pp=[];for(var i=0;i<n;i++){var p=pt(i,R*ring/4);pp.push(p.join(','));}g+='<polygon points="'+pp.join(' ')+'" fill="none" stroke="#ece9e4" stroke-width="1"/>';}
    for(var i=0;i<n;i++){var p=pt(i,R);g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="#ece9e4"/>';
      var lp=pt(i,R+18);g+='<text x="'+lp[0].toFixed(1)+'" y="'+lp[1].toFixed(1)+'" text-anchor="middle" font-size="10" fill="#6b7280" font-family="var(--font-family-monospace)">'+labels[i]+'</text>';}
    var dp=vals.map(function(v,i){return pt(i,R*v/100).map(function(x){return x.toFixed(1)}).join(',')});
    g+='<polygon points="'+dp.join(' ')+'" fill="rgba(31,64,237,.16)" stroke="#1f40ed" stroke-width="2"/>';
    vals.forEach(function(v,i){var p=pt(i,R*v/100);g+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="#1f40ed"/>';});
    el.innerHTML=g;
  }
  function finish(){
    show('results');
    var avg=function(a){return a.length?Math.round(a.reduce(function(x,y){return x+y},0)/a.length):0};
    var r1=avg(state.scores[0]),r2=avg(state.scores[1]),r3=avg(state.scores[2]);
    var overall=Math.round((r1+r2+r3)/3)||0;
    var names=[['1','Broad','#1f40ed',r1],['2','Harder','#d97706',r2],['3','Curveball','#dc2626',r3]];
    var rb=$('#roundsBreak'); if(rb) rb.innerHTML=names.map(function(x){
      return '<div class="rbreak"><span class="rb-i" style="background:'+x[2]+'">'+x[0]+'</span><div class="rb-b"><div class="rb-t">Round '+x[0]+' — '+x[1]+'</div><div class="rb-m">'+(x[3]>=80?'Strong':x[3]>=68?'Solid':'Shaky')+' performance</div></div><span class="rb-s" style="color:'+x[2]+'">'+x[3]+'</span></div>';
    }).join('');
    radar([84,80,86,78,72]);
    var arc=$('#resArc'); if(arc) setTimeout(function(){arc.style.strokeDashoffset=(427*(1-overall/100)).toFixed(1)},150);
    var resNum=$('#resNum');
    if(resNum){ var nn=0,st=Math.max(1,Math.round(overall/40)); var ci=setInterval(function(){nn+=st;if(nn>=overall){nn=overall;clearInterval(ci);}resNum.textContent=nn},26); }
    var secs=Math.round((Date.now()-state.t0)/1000);
    window.Miclea && Miclea.addSession({type:'gauntlet',topic:'Gauntlet · '+state.role,role:state.role,score:overall,date:new Date().toISOString().slice(0,10),mins:Math.max(1,Math.round(secs/60))});
    try{localStorage.setItem('miclea_gauntlet_used',String((parseInt(localStorage.getItem('miclea_gauntlet_used')||'0',10)||0)+1));}catch(e){}
    clearSave();
  }

  // ---- lifecycle teardown ----
  window.addEventListener('pagehide',function(){ stopRec(); stopMedia(); try{window.MiclInterviewer.destroy()}catch(e){} });

  // ---- resume an in-progress gauntlet (refresh during call/break) ----
  function resume(saved){
    state=saved;
    show('lobby');
    // Media must be re-granted after a refresh; route through the lobby.
    var grant=$('#lobbyGrant'); grant.querySelector('h2').textContent='Resume your interview';
    grant.querySelector('p').textContent='Re-enable your camera & mic to pick up where you left off. Your break timer kept running.';
    function go(){
      fetchQuestions(); enterCall();
      if(state.breakEnd && state.breakEnd>Date.now()){ showBreak(); }
      else if(state.breakEnd && state.breakEnd<=Date.now()){ state.r++; state.q=0; state.breakEnd=null; save(); askCurrent(); }
      else { askCurrent(); }
    }
    $('#allowBtn').onclick=function(){ requestMedia().then(function(){}); };
    $('#joinBtn').onclick=go;
    $('#joinAudioBtn').onclick=function(){ mode='audio'; go(); };
    $('#joinTextBtn').onclick=function(){ mode='text'; go(); };
  }

  // ---- events ----
  $('#startBtn') && $('#startBtn').addEventListener('click',showLobby);
  $('#allowBtn') && $('#allowBtn').addEventListener('click',function(){ requestMedia(); });
  $('#joinBtn')  && $('#joinBtn').addEventListener('click',function(){ beginCall('video'); });
  $('#joinAudioBtn') && $('#joinAudioBtn').addEventListener('click',function(){ beginCall('audio'); });
  $('#joinTextBtn')  && $('#joinTextBtn').addEventListener('click',function(){ beginCall('text'); });
  $('#micBtn') && $('#micBtn').addEventListener('click',toggleMic);
  $('#camBtn') && $('#camBtn').addEventListener('click',toggleCam);
  $('#doneBtn') && $('#doneBtn').addEventListener('click',submitAnswer);
  $('#endBtn') && $('#endBtn').addEventListener('click',endInterview);
  $('#againBtn') && $('#againBtn').addEventListener('click',function(){ clearSave(); location.reload(); });

  // ---- boot ----
  var saved=load();
  if(saved && saved.r!=null && saved.scores){ resume(saved); }
})();
</script>
```

- [ ] **Step 2: Sanity-check the file still has matching tags**

Run: `node -e "const s=require('fs').readFileSync('gauntlet.html','utf8'); const o=(s.match(/<script/g)||[]).length, c=(s.match(/<\/script>/g)||[]).length; console.log('open',o,'close',c); process.exit(o===c?0:1)"`
Expected: `open` count equals `close` count (exit 0).

- [ ] **Step 3: Commit**

```bash
git add gauntlet.html
git commit -m "feat(gauntlet): zoom-style call orchestration (lobby, per-question loop, in-call break)"
```

---

## Task 9: End-to-end verification in the sandbox

Drive the full flow in the preview browser. Because the headless browser has no camera, verify (a) the deny/fallback path with no device and (b) the happy path with stubbed media.

**Files:** none (verification only)

- [ ] **Step 1: Sync everything to the sandbox**

```bash
cp gauntlet.html interviewer.js dashboard.html /tmp/miclea-preview/; cp -r images /tmp/miclea-preview/; echo synced
```

- [ ] **Step 2: Verify setup → lobby transition**

In the preview MCP: open `gauntlet.html`, reload. `preview_click` the "Begin the Gauntlet" button (`#startBtn`). `preview_screenshot`. Expected: the immersive lobby appears. `preview_console_logs`: no errors.

- [ ] **Step 3: Verify the deny/fallback path**

`preview_eval`:
```js
navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('denied'));
document.getElementById('allowBtn').click();
```
`preview_screenshot`. Expected: the "No camera or mic access" panel with "Continue audio-only" / "Continue with typing".

- [ ] **Step 4: Verify the happy path with stubbed media + instant voice**

Reload, then `preview_eval` BEFORE interacting:
```js
// Stub a media stream (a blank canvas video track + silent audio).
const c=document.createElement('canvas');c.width=320;c.height=240;c.getContext('2d').fillRect(0,0,320,240);
const vs=c.captureStream(5);
const ac=new (window.AudioContext||window.webkitAudioContext)();
const dst=ac.createMediaStreamDestination();
const fake=new MediaStream([...vs.getVideoTracks(), ...dst.stream.getAudioTracks()]);
navigator.mediaDevices.getUserMedia=()=>Promise.resolve(fake);
// Make Micl "speak" instantly so the loop advances fast in tests.
window.MiclInterviewer.speak=(t)=>{window.MiclInterviewer.setSpeaking(true);return new Promise(r=>setTimeout(()=>{window.MiclInterviewer.setSpeaking(false);r();},300));};
```
Then: `preview_click` `#startBtn` → `preview_click` `#allowBtn` → `preview_click` `#joinBtn`. `preview_screenshot`. Expected: the call screen with the interviewer stage, self-view PiP visible, REC badge, "Round 1 · Broad" chip, and (after ~300ms) the question caption + answer caption, with "Done answering" enabled.

- [ ] **Step 5: Verify answer submit + round/break flow**

`preview_eval`:
```js
document.getElementById('answerText').textContent='This is my detailed test answer covering background and motivation clearly.';
document.getElementById('doneBtn').click();   // -> Q2
```
Repeat the set-text + `#doneBtn` click once more to finish Round 1 → expect the **break overlay** with a counting-down ring. Confirm it cannot be dismissed by clicking elsewhere. `preview_screenshot`.

- [ ] **Step 6: Verify controls + teardown**

`preview_eval`:
```js
document.getElementById('micBtn').click();   // mute -> micBtn gets .off
document.getElementById('camBtn').click();   // cam off -> selfTile gets .camoff
```
`preview_screenshot` (mic/cam show off states). Then confirm teardown stops tracks:
```js
document.getElementById('endBtn'); // ensure exists
// simulate end without confirm():
window.confirm=()=>true; document.getElementById('endBtn').click();
```
`preview_screenshot`. Expected: the results screen (overall score ring, round-by-round, radar, strengths/weaknesses). `preview_console_logs`: no errors.

- [ ] **Step 7: Record results**

Note any console errors or visual issues. If found, fix the relevant source file, re-sync (Step 1), and re-verify the affected step. No commit (verification only) unless fixes were made — then commit them with `fix(gauntlet): …`.

---

## Self-review notes (author check)

- **Spec coverage:** lobby permission gate (Task 5/8), camera self-view (Task 6/8), live mic transcription (Task 8 `startRec`), ElevenLabs/visual provider abstraction + multi-character (Task 1), 3 rounds + enforced break overlay (Task 8 `showBreak`/`tickBreak`), detailed results analysis (Task 8 `finish`, reused markup), embed-mode camera permission (Task 3), graceful fallbacks (Task 8 deny path + text mode), teardown (Task 8 `stopMedia`/`pagehide`). All covered.
- **Type/name consistency:** `MiclInterviewer.{mount,speak,setSpeaking,destroy,setCharacter}` defined in Task 1 and used identically in Task 8. DOM ids in Tasks 5/6 markup (`#aiStage`, `#answerText`, `#doneBtn`, `#breakOverlay`, `#qCap`, `#answerCap`, `#selfTile`, `#selfVideo`, `#lobbyVideo`, `#micMeterFill`/`#micMeterFill2`, `#seg1..3`, `#roundChip`, `#breakArc`/`#breakNum`/`#breakHead`/`#breakBody`/`#breakTag`) all match Task 8 selectors. Results ids (`#roundsBreak`, `#radar`, `#resArc`, `#resNum`, `#againBtn`) are unchanged from the original results markup.
- **No placeholders:** every code step is complete and copy-pasteable.
- **Note:** the original `ROUNDS` had baked-in sample answers (`a:`) used to *simulate* speech. Real mic transcription replaces simulation, so `a:` values are intentionally emptied (kept as keys for shape; harmless).
```
