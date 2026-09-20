/* ===================================================================
   speech.js — הקראה קולית
   המשחק מיועד לילדים שחלקם עדיין לא קוראים בשטף. כל טקסט שמופיע להם
   ניתן להקראה בלחיצה על רמקול.

   עיקרון: נכשלים בשקט. אם אין תמיכה או אין קול עברי במכשיר, כפתורי
   הרמקול פשוט לא מוצגים והמשחק ממשיך בדיוק כמו קודם.
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var synth = window.speechSynthesis || null;
  var voice = null;
  var decided = false;   // האם כבר יודעים אם יש קול עברי
  var usable = true;     // אופטימי עד שמתברר אחרת
  var primed = false;
  var readyCbs = [];

  function isHebrew(v) {
    var l = String(v.lang || '').toLowerCase().replace('_', '-');
    return l.indexOf('he') === 0 || l.indexOf('iw') === 0;   // iw הוא הקוד הישן לעברית
  }

  function resolveVoices() {
    if (!synth) { decided = true; usable = false; return; }
    var list = [];
    try { list = synth.getVoices() || []; } catch (e) { list = []; }
    if (!list.length) return;   // עוד לא נטענו – ננסה שוב ב-voiceschanged

    for (var i = 0; i < list.length; i++) {
      if (isHebrew(list[i])) { voice = list[i]; break; }
    }
    // רשימה מלאה בלי קול עברי = המכשיר יקריא עברית בקול לועזי, וזה ג'יבריש.
    // במקרה כזה עדיף לא להציע הקראה בכלל.
    usable = !!voice;
    decided = true;
    readyCbs.splice(0).forEach(function (cb) { try { cb(); } catch (e) {} });
  }

  if (synth) {
    resolveVoices();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', resolveVoices);
    } else {
      synth.onvoiceschanged = resolveVoices;
    }
    // iOS לפעמים לא יורה voiceschanged; בודקים שוב אחרי רגע
    setTimeout(resolveVoices, 800);
    setTimeout(function () { decided = true; }, 2500);
  } else {
    decided = true; usable = false;
  }

  MG.Speech = {
    /* האם בכלל יש מנוע הקראה במכשיר */
    supported: function () { return !!synth; },

    /* האם כדאי להציג כפתורי רמקול. לפני שהקולות נטענו מניחים שכן,
       כי ב-iOS הרשימה מגיעה באיחור ויש שם קול עברי. */
    available: function () { return !!synth && usable; },

    /* האם ההקראה דלוקה.
       כפתור הרמקול שבסרגל העליון הוא השתקה כללית: ילדה שמכבה אותו מצפה
       שהמשחק ישתוק לגמרי, ולא רק שהצלילים ייפסקו. המתג הנפרד באזור ההורים
       ממשיך לשלוט בהקראה בנפרד, וכך כוונת ההורה נשמרת גם אחרי השתקה וביטולה. */
    enabled: function () {
      if (!this.available()) return false;
      var s = MG.Storage && MG.Storage.get();
      if (!s) return true;
      return s.settings.sound !== false && s.settings.speech !== false;
    },

    autoRead: function () {
      var s = MG.Storage && MG.Storage.get();
      return this.enabled() && !!(s && s.settings.autoRead);
    },

    /* iOS מרשה הקראה רק אחרי מגע של המשתמש. נקרא פעם אחת מה-listener
       החד-פעמי שכבר קיים במשחק. */
    prime: function () {
      if (primed || !synth) return;
      primed = true;
      try {
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0; u.lang = 'he-IL';
        synth.speak(u);
      } catch (e) { /* לא נורא */ }
    },

    speak: function (text) {
      if (!this.enabled()) return false;
      var t = String(text == null ? '' : text).trim();
      if (!t) return false;
      try {
        synth.cancel();
        var u = new SpeechSynthesisUtterance(t);
        u.lang = 'he-IL';
        if (voice) u.voice = voice;
        u.rate = 0.85;    // איטי במכוון – הקהל הוא בני שבע
        u.pitch = 1;      // העלאת גובה על קול דחוס רק מחדדת את הצליל המתכתי
        synth.speak(u);
        return true;
      } catch (e) { return false; }
    },

    stop: function () { try { if (synth) synth.cancel(); } catch (e) {} },

    /* קריאה חוזרת כשמתברר סופית אם יש קול עברי, כדי לרענן כפתורים */
    onReady: function (cb) {
      if (decided) { cb(); return; }
      readyCbs.push(cb);
      setTimeout(function () { if (!decided) { decided = true; cb(); } }, 2600);
    }
  };
})(window.MG);
