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

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  // ---------------- VISUAL ----------------
  function renderPortrait() {
    stageEl.innerHTML =
      '<div class="mi-bg"></div>' +
      '<div class="mi-ring"></div>' +
      '<img class="mi-portrait" src="' + esc(active.portraitUrl) + '" alt="' + esc(active.name) + '" ' +
        'onerror="this.style.display=\'none\'">' +
      '<div class="mi-fx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  }
  function mountVisual() {
    if (VISUAL_PROVIDER === "talkinghead") {
      // future drop-in: render a <video> here and swap clip URLs in speak()
      renderPortrait(); // until talking-head is wired, fall back to portrait
      return;
    }
    renderPortrait();
  }
  function setSpeaking(on) {
    if (stageEl) stageEl.classList.toggle("mi-speaking", !!on);
  }

  // ---------------- VOICE: browser (default) ----------------
  function speakBrowser(text) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = null;
      function finish() { if (!done) { done = true; if (timer) clearTimeout(timer); resolve(); } }
      var synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
        // No TTS available: hold long enough to read the caption.
        timer = setTimeout(finish, Math.min(9000, 1600 + text.length * 45));
        return;
      }
      try { synth.cancel(); } catch (e) {}
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0; u.pitch = 1.0;
      u.onend = finish; u.onerror = finish;
      synth.speak(u);
      // Safety net: some browsers never fire onend.
      timer = setTimeout(finish, Math.min(15000, 2500 + text.length * 60));
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
