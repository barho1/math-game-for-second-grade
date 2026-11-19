/* ===================================================================
   storage.js – שמירת המצב של המשחק (localStorage)
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var KEY = 'mg-number-journey-v1';

  /* מצב בדיקות: פרופיל נפרד לגמרי, במפתח משלו, כדי שבדיקות פונקציונליות לא ייגעו בנתוני הילדה.
     הדגל נשמר ב-sessionStorage בלבד: סגירת האפליקציה מחזירה אוטומטית לפרופיל הילדה.
     ?test=1 בכתובת מפעיל את המצב. המעבר בין הפרופילים מתבצע בטעינה מחדש של הדף. */
  var TEST_KEY = KEY + '-test';
  var TEST_FLAG = 'mg-test-mode';
  var testMode = (function () {
    try {
      if (/[?&]test=1(&|$)/.test(window.location.search)) window.sessionStorage.setItem(TEST_FLAG, '1');
    } catch (e) { /* אין sessionStorage – ממשיכים */ }
    try { return window.sessionStorage.getItem(TEST_FLAG) === '1'; } catch (e) { return false; }
  })();
  function activeKey() { return testMode ? TEST_KEY : KEY; }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function defaults() {
    return {
      version: 1,
      player: { name: '', face: '🦊', color: '#ffd166', hat: '' },
      progress: {
        level: 1,           // רמת הליבה (חשבון בסיסי), אדפטיבית 1..5
        skills: { mult: 1, place: 1, time: 1, money: 1, measure: 1, fractions: 1, data: 1, geometry: 1 },// שלב בכל נתיב נושא (כפל וחילוק וכו'), אדפטיבי, מתחיל ב-1
        opened: {},         // נתיבים שההורה פתח מוקדם, לפני שהרמה הכללית הגיעה לסף
        stars: 0,
        coins: 0,
        streak: 0,          // רצף תשובות נכונות נוכחי
        bestStreak: 0,
        coinsEarned: 0,     // סך המטבעות שנאספו אי פעם (לא היתרה) – לצורך מדליות
        totalCorrect: 0,
        totalAnswered: 0,
        firstTryCorrect: 0,
        missions: 0,
        worlds: {}          // worldId -> {stars:0, missions:0, done:false}
      },
      owned: [],            // פריטים שנרכשו בחנות
      stickers: [],         // מדבקות שנאספו
      medals: [],           // הישגים שנפתחו
      byType: {},           // סטטיסטיקה לפי סוג תרגיל: {type:{ok,total}}
      settings: { sound: true, speech: true, autoRead: false },
      help: {
        tourDone: false,   // האם הסיור הראשוני הושלם או דולג
        seenTypes: [],     // סוגי תרגילים שכבר הוסבר עליהם
        seenScreens: [],   // מסכים שכבר הוצג בהם הסבר ראשוני
        handShown: false   // האצבע המנחה כבר הודגמה
      },
      parent: { dailyLimitMin: 20, gateEnabled: true, hidden: {} },   // hidden: נתיבים שההורה הסתיר
      usage: { date: today(), usedSec: 0, bonusSec: 0 }
    };
  }

  /* פרופיל הבדיקות מתחיל נקי, עם מגבלת זמן גבוהה כדי שהבדיקות לא ייקטעו */
  function testDefaults() {
    var d = defaults();
    d.player.name = 'בדיקות';
    d.parent.dailyLimitMin = 300;
    d.parent.gateEnabled = false;   // הבודק/ת הוא/היא ההורה: בלי שאלת כניסה בכל טעינה מחדש
    return d;
  }
  function fresh() { return testMode ? testDefaults() : defaults(); }

  var state = null;

  function migrate(s) {
    var base = defaults();
    // מיזוג רדוד + עמוק לאובייקטים הידועים, כדי לא לאבד מפתחות חדשים בעדכוני גרסה
    var out = Object.assign({}, base, s);
    ['player', 'progress', 'settings', 'parent', 'usage', 'help'].forEach(function (k) {
      out[k] = Object.assign({}, base[k], s && s[k]);
    });
    out.progress.worlds = Object.assign({}, s && s.progress && s.progress.worlds);
    // שמירות ישנות אינן מכירות נתיבים: משלימים ברירות מחדל בלי לאבד שלבים קיימים
    out.progress.skills = Object.assign({}, base.progress.skills, s && s.progress && s.progress.skills);
    out.progress.opened = Object.assign({}, s && s.progress && s.progress.opened);
    if (out.progress.coinsEarned == null || out.progress.coinsEarned < out.progress.coins) {
      out.progress.coinsEarned = out.progress.coins;   // הגירה למשחקים שנשמרו לפני המונה המצטבר
    }
    out.owned = (s && s.owned) || [];
    out.stickers = (s && s.stickers) || [];
    out.medals = (s && s.medals) || [];
    out.byType = (s && s.byType) || {};
    out.help.seenTypes = (s && s.help && s.help.seenTypes) || [];
    out.help.seenScreens = (s && s.help && s.help.seenScreens) || [];
    return out;
  }

  MG.Storage = {
    today: today,

    load: function () {
      if (state) return state;
      var raw = null;
      try { raw = window.localStorage.getItem(activeKey()); } catch (e) { raw = null; }
      if (raw) {
        try { state = migrate(JSON.parse(raw)); } catch (e) { state = fresh(); }
      } else {
        state = fresh();
      }
      // איפוס יומי של מונה הזמן
      if (state.usage.date !== today()) {
        state.usage = { date: today(), usedSec: 0, bonusSec: 0 };
        this.save();
      }
      return state;
    },

    get: function () { return state || this.load(); },

    save: function () {
      try { window.localStorage.setItem(activeKey(), JSON.stringify(state)); } catch (e) { /* מצב פרטי – ממשיכים בלי שמירה */ }
    },

    /* איפוס הפרופיל הפעיל בלבד: במצב בדיקות זה פרופיל הבדיקות, והמפתח של הילדה לא נגע */
    reset: function () {
      state = fresh();
      this.save();
      return state;
    },

    isTestMode: function () { return testMode; },

    /* מעבר בין הפרופילים: קובעים את הדגל ואז הקורא טוען מחדש את הדף.
       לפני המעבר שומרים את הפרופיל הנוכחי תחת המפתח שלו. */
    setTestMode: function (on) {
      this.save();
      try {
        if (on) window.sessionStorage.setItem(TEST_FLAG, '1');
        else window.sessionStorage.removeItem(TEST_FLAG);
      } catch (e) { return false; }
      return true;
    },

    /* העתקה חד-כיוונית: ההתקדמות של הילדה נקראת ומועתקת לפרופיל הבדיקות, ולא להפך.
       שומרים את זמן הבדיקות והשם של פרופיל הבדיקות. */
    copyMainToTest: function () {
      if (!testMode) return false;
      var raw = null;
      try { raw = window.localStorage.getItem(KEY); } catch (e) { return false; }
      if (!raw) return false;
      var copy;
      try { copy = migrate(JSON.parse(raw)); } catch (e) { return false; }
      copy.parent.dailyLimitMin = 300;
      copy.parent.gateEnabled = false;
      copy.usage = { date: today(), usedSec: 0, bonusSec: 0 };
      state = copy;
      this.save();
      return true;
    },

    // עוזרים קטנים
    world: function (id) {
      var s = this.get();
      if (!s.progress.worlds[id]) s.progress.worlds[id] = { stars: 0, missions: 0, done: false };
      return s.progress.worlds[id];
    },

    /* כל הוספת מטבעות עוברת כאן, כדי שהמונה המצטבר לא יאבד כשקונים בחנות */
    addCoins: function (n) {
      var p = this.get().progress;
      p.coins += n;
      if (n > 0) p.coinsEarned = (p.coinsEarned || 0) + n;
      this.save();
    },
    addStars: function (n) { this.get().progress.stars += n; this.save(); },

    recordAnswer: function (type, ok, firstTry) {
      var s = this.get();
      s.progress.totalAnswered++;
      if (ok) {
        s.progress.totalCorrect++;
        if (firstTry) s.progress.firstTryCorrect++;
        s.progress.streak++;
        if (s.progress.streak > s.progress.bestStreak) s.progress.bestStreak = s.progress.streak;
      } else {
        s.progress.streak = 0;
      }
      var t = s.byType[type] || (s.byType[type] = { ok: 0, total: 0 });
      t.total++;
      if (ok && firstTry) t.ok++;
      this.save();
    }
  };
})(window.MG);
