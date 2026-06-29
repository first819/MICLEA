# Gauntlet — Zoom-Style Video Interview UI

**Date:** 2026-06-29
**Status:** Approved design
**File touched:** `gauntlet.html` (+ new `interviewer.js`)

## Summary

Rework the Gauntlet **session** experience into a Zoom-style video interview: a
large AI interviewer ("Micl") who speaks the questions, a small real self-view of
the candidate (camera), real microphone capture with live transcription, and a
post-interview analysis. The existing setup screen, 3-round/break state machine,
AI wiring (`ai-question` / `ai-feedback`), and detailed results screen are kept.

## Goals

- Realistic Zoom-like 1:1 interview feel (big interviewer, small self-view PiP).
- Actually request and use the camera and microphone for the SaaS.
- AI interviewer speaks each question aloud (ElevenLabs voice later; browser
  voice now) over an AI portrait, via swappable voice + visual provider layers.
- Support multiple interviewer characters (portrait + voice) via config.
- Keep the proven 3-round escalation (Broad → Harder → Curveball) with the
  enforced, non-skippable 30s breaks between rounds.
- Detailed analysis after the interview ends (reuse existing results screen).

## Non-goals

- Real-time WebRTC streaming avatar (chosen: clip-per-question).
- Multi-participant calls (1:1 only: Micl + candidate).
- Cloud speech-to-text (chosen: browser live transcription).
- Building the actual ElevenLabs / D-ID / HeyGen integration now (no key yet) —
  only the abstractions + functional fallbacks. Each real provider is a later,
  key-gated drop-in.
- Lip-synced talking head now (visual = AI portrait + speaking FX for this round).

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Voice | **ElevenLabs** (realistic) as the target; architect now, wire later. Browser `speechSynthesis` active now. No key yet. |
| Interviewer visual | AI-generated portrait + speaking FX now; lip-synced talking head (D-ID/HeyGen) is a later, separate drop-in |
| Avatar delivery (if talking head) | Clip per question (no WebRTC) |
| Provider model | **Two independent providers — voice and visual** — both behind a config; functional fallback for each |
| Characters | Multi-character config (`{ name, portraitUrl, elevenVoiceId }`); user will add more avatars later |
| Answer capture | Live mic transcription (browser `SpeechRecognition`) |
| Round structure | Keep 3 rounds + enforced 30s breaks |
| In-call layout | Immersive captions (big interviewer + self-view PiP + caption overlays) |

## Screen flow

```
setup  →  LOBBY (permissions + device preview)  →  CALL (immersive)
       →  [break overlay between rounds]  →  results (analysis)
```

The setup screen (role chips, round preview, "Begin the Gauntlet") is unchanged.
"Begin the Gauntlet" now routes to the **lobby** instead of straight to the
session. The round/question/scoring/break state machine and the results screen
are reused as-is; only the session presentation changes.

## Components

### Lobby screen (permission gate)
- Card: "Micl wants to use your camera & microphone." Primary **Allow & continue**
  triggers `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`.
- On grant: live self-view `<video>` preview + mic level meter (Web Audio
  `AnalyserNode`) so the candidate confirms devices work.
- Pre-call camera/mic toggle pills; **Join interview** starts the call with the
  acquired `MediaStream`.
- **Fallbacks** when denied / no device:
  - **Continue audio-only** — no self-view, mic transcription still active.
  - **Continue text-only** — no camera/mic; transcript caption becomes a
    typed `contenteditable` field.
- The acquired `MediaStream` is owned by the call and passed forward (not
  re-requested) to avoid a second prompt.

### Call screen (immersive)
- **Stage (full-bleed):** the interviewer. Rendered by `interviewer.js`
  (see Provider layer). While Micl speaks: speaking FX (glow pulse + live
  waveform). When a real provider is active, the lip-synced clip plays here.
- **Self-view PiP:** real camera `<video>`, bottom-right, mirrored, rounded.
- **Top bar:** ● REC badge (recording indicator), round chip
  (e.g. "Round 1 · Broad"), 3-segment progress rail (reuses existing seg fill
  logic, recolored per round).
- **Captions:**
  - *Question caption* near Micl while he asks (always shows the question text,
    even if audio fails).
  - *Answer caption* strip while the candidate answers — live transcript,
    `contenteditable` so it can be corrected before submit.
- **Control bar (bottom):** mic toggle (mutes audio track + pauses
  recognition), camera toggle (disables video track), **End interview** (red),
  settings (no-op placeholder / future device switch).

**Per-question loop:**
1. `MiclInterviewer.speak(questionText)` — question caption shown, controls read
   "Micl is asking…", answer controls disabled.
2. On resolve, candidate's turn: start `SpeechRecognition`, show "● Listening" +
   waveform, build the answer caption live.
3. Candidate taps **Done answering** (or the mic button): stop recognition, send
   transcript to `ai-feedback` (existing call + scoring), advance the existing
   state machine → next question / break / results.

### Break overlay (in-call intermission)
- The existing enforced break renders as an overlay on top of the dimmed stage:
  countdown ring (reused), "Round N is tougher…" copy, lock note ("can't be
  skipped — even if you refresh").
- Camera stays on underneath; no media teardown. On countdown end, auto-resume
  into the next round's first question.
- Persisted break end-time / refresh-resume behavior is unchanged.

### Results screen (analysis)
- Reused unchanged: overall score ring, round-by-round breakdown, behavioral
  radar, strengths & what-to-sharpen, CTAs. This is the "detailed analysis after
  the interview is over."

## Provider layer (`interviewer.js`)

A single module owns how Micl looks and speaks, decoupled from the call UI. It
composes **two independent providers** — a *visual* provider and a *voice*
provider — driven by the active **character**.

```js
window.MiclInterviewer = {
  mount(stageEl),                 // render the active character into the stage
  setCharacter(id),               // switch interviewer (portrait + voice)
  speak(text) -> Promise<void>,   // "say" text; resolves when finished speaking
  setSpeaking(bool),              // drive speaking FX
  destroy(),
}
```

### Characters
A config array of selectable interviewers; `speak()` and `mount()` use the active one.
```js
const CHARACTERS = [
  { id: 'micl', name: 'Micl', portraitUrl: '…', elevenVoiceId: '…' },
  // user adds more later: just a portrait + a voice id
];
```
The default character ships with the AI-generated portrait produced during
implementation. Adding a character requires no code changes beyond this array.

### Voice provider
- **`browser` (now, default, no key):** browser `speechSynthesis`; `speak()`
  resolves on the utterance `end` event.
- **`elevenlabs` (later, drop-in):** a new Supabase **edge function** holds the
  ElevenLabs key server-side, takes `{ text, voiceId }`, returns/streams audio;
  the module plays it (resolving on `ended`) and drives the speaking FX from its
  amplitude. Selecting it = config flip + the edge function + key in secrets.
  Browser voice remains the automatic fallback if the call fails.

### Visual provider
- **`portrait` (now, default):** renders the character's AI portrait with
  speaking FX (glow pulse + live waveform). No lip-sync.
- **`talkinghead` (later, separate drop-in):** `{ provider: 'd-id' | 'heygen' }`
  via an edge function that returns a lip-synced clip URL per question
  (`clip-per-question`); played on the stage, resolving `speak()` on `ended`.
  ElevenLabs audio can be fed in for the lip-sync. **No call-UI changes** to
  enable.

Voice and visual are selected by independent config constants (defaults
`browser` + `portrait`), so they can be upgraded separately.

## Media lifecycle

- One `MediaStream` acquired in the lobby, owned by the call.
- Mic toggle = `audioTrack.enabled = false` + pause recognition; camera toggle =
  `videoTrack.enabled = false`.
- **Teardown** (`stream.getTracks().forEach(t => t.stop())`) on: End interview,
  navigating to results, page `beforeunload`/`pagehide`, and any fatal error.
  Guarantees the camera indicator light turns off.

## Speech recognition

- Use `window.SpeechRecognition || window.webkitSpeechRecognition`,
  `continuous = true`, `interimResults = true`; append finalized segments to the
  answer caption, show interim text live.
- Not supported / errors → fall back to the typed `contenteditable` caption; the
  flow never blocks.

## Error handling

| Case | Behavior |
|---|---|
| Camera/mic permission denied | Lobby offers audio-only or text-only paths |
| No camera device | Audio-only path; self-view hidden |
| `speechSynthesis` / clip fails | Question caption still shown + small "voice unavailable" note; loop continues |
| `SpeechRecognition` unsupported | Typed transcript caption |
| Empty transcript on submit | Allow typing before submit; don't send empty answer to `ai-feedback` |
| AI question fetch fails | Existing `onAiError` + fallback to baked-in question text (current behavior) |

## Testing / verification

- Lobby: allow path shows live preview + mic meter; deny path shows audio-only /
  text-only options; no second permission prompt on Join.
- Call: question is spoken and captioned; mic transcription builds the answer
  caption; mic/camera toggles actually disable tracks (self-view freezes, REC
  reflects mute).
- Break overlay appears between rounds, counts down, can't be skipped, auto-resumes.
- End interview / page leave stops all tracks (camera light off).
- Results screen renders the full analysis after round 3.
- Provider abstractions: browser voice + portrait visual work with no key;
  swapping a config constant is the only call-UI change needed to point voice at
  ElevenLabs or visual at a talking head.
- Characters: switching the active character changes portrait + voice; adding one
  is config-only.
- Verify in the preview sandbox per project convention (preview server reads the
  copied files, not the repo directly).

## Out of scope / future

- ElevenLabs edge function + key wiring (architected now, built later).
- Real D-ID/HeyGen talking-head edge function + key wiring.
- Cloud speech-to-text.
- Device-switching UI behind the settings control.
- Real-time streaming avatar.
- In-app character picker UI (config-only for now).
