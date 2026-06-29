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
