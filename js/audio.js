/* ===================================================================
   audio.js – צלילים קצרים ועדינים (Web Audio, ללא קבצים חיצוניים)
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var ctx = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }

  function enabled() {
    var s = MG.Storage.get();
    return s.settings.sound !== false;
  }

  /* נגינת תו בודד */
  function tone(freq, start, dur, type, vol) {
    var c = ensure();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    gain.gain.setValueAtTime(0.0001, c.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(vol || 0.16, c.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur + 0.02);
  }

  function melody(notes, type, vol) {
    if (!enabled()) return;
    var c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    notes.forEach(function (n) { tone(n[0], n[1], n[2], type, vol); });
  }

  MG.Audio = {
    unlock: function () {
      var c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },
    click:    function () { melody([[520, 0, 0.07]], 'triangle', 0.08); },
    correct:  function () { melody([[660, 0, 0.12], [880, 0.09, 0.12], [1175, 0.18, 0.22]], 'triangle', 0.14); },
    wrong:    function () { melody([[330, 0, 0.14], [262, 0.1, 0.22]], 'sine', 0.10); },
    reward:   function () { melody([[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.32]], 'triangle', 0.15); },
    levelUp:  function () { melody([[784, 0, 0.1], [988, 0.08, 0.1], [1319, 0.16, 0.28]], 'square', 0.09); },
    chest:    function () { melody([[392, 0, 0.1], [523, 0.08, 0.1], [659, 0.16, 0.1], [880, 0.24, 0.3]], 'triangle', 0.13); },
    bye:      function () { melody([[659, 0, 0.18], [523, 0.16, 0.18], [392, 0.32, 0.4]], 'sine', 0.12); }
  };
})(window.MG);
