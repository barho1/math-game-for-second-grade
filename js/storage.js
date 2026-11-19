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

  /* ---------- גיבוי והעברה בין מכשירים ----------
     ההתקדמות נשמרת ב-localStorage של הדפדפן בלבד, ובאייפד אפליקציה שהותקנה על המסך
     הראשי שומרת בנפרד מ-Safari. הקוד מאפשר להעביר התקדמות בהעתק-הדבק.

     פורמט: MGJ1.<סכום ביקורת>.<JSON בקידוד base64 בטוח לכתובות>
     סכום הביקורת תופס קוד שנחתך או שונה בהעתקה. הוא אינו הגנה מפני זיוף, ולכן הקוד
     נקרא תמיד בזהירות: כל ערך עובר ניקוי וגבולות לפני שהוא נכנס למצב המשחק.
     הזמן היומי (usage) והגדרות ההורים (parent) נשארים של המכשיר הנוכחי. */
  var CODE_PREFIX = 'MGJ1';
  var BACKUP_KEYS = ['player', 'progress', 'owned', 'stickers', 'medals', 'byType', 'settings', 'help'];
  var MAX_LIST = 500;

  function checksum(str) {            // FNV-1a ב-32 ביט
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function toB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64(b64) {
    var b = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var bin = atob(b), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function num(v, def, max) {
    return (typeof v === 'number' && isFinite(v) && v >= 0 && v <= max) ? Math.floor(v) : def;
  }
  function strList(v) {
    return (Array.isArray(v) ? v : []).filter(function (x) { return typeof x === 'string' && x.length <= 40; }).slice(0, MAX_LIST);
  }
  function str(v, def, max) { return (typeof v === 'string' && v.length <= max) ? v : def; }

  /* מנקה מצב שנקרא מקוד: אותו מבנה כמו המצב הרגיל, עם ערכים תקינים בלבד */
  function sanitize(src) {
    var base = defaults();
    var out = migrate(src);
    Object.keys(base.progress).forEach(function (k) {
      if (typeof base.progress[k] === 'number') out.progress[k] = num(out.progress[k], base.progress[k], 1e7);
    });
    out.progress.level = Math.min(Math.max(out.progress.level, 1), 8);
    Object.keys(base.progress.skills).forEach(function (k) {
      out.progress.skills[k] = Math.min(Math.max(num(out.progress.skills[k], 1, 1e7), 1), 8);
    });
    var worlds = {};
    Object.keys(out.progress.worlds).slice(0, 50).forEach(function (id) {
      var w = out.progress.worlds[id];
      if (!/^[a-z0-9_-]{1,30}$/i.test(id) || !w || typeof w !== 'object') return;
      worlds[id] = { stars: num(w.stars, 0, 1e5), missions: num(w.missions, 0, 1e5), done: w.done === true };
    });
    out.progress.worlds = worlds;
    var opened = {};
    Object.keys(out.progress.opened).slice(0, 50).forEach(function (k) {
      if (/^[a-z0-9_-]{1,30}$/i.test(k) && out.progress.opened[k] === true) opened[k] = true;
    });
    out.progress.opened = opened;

    var pl = out.player;
    pl.name = str(pl.name, '', 12);
    pl.face = str(pl.face, base.player.face, 20) || base.player.face;
    pl.hat = str(pl.hat, '', 8);
    pl.color = (typeof pl.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(pl.color)) ? pl.color : base.player.color;

    out.owned = strList(out.owned);
    out.stickers = strList(out.stickers);
    out.medals = strList(out.medals);
    var byType = {};
    Object.keys(out.byType).slice(0, 100).forEach(function (t) {
      var e = out.byType[t];
      if (/^[a-z0-9_-]{1,30}$/i.test(t) && e && typeof e === 'object') byType[t] = { ok: num(e.ok, 0, 1e7), total: num(e.total, 0, 1e7) };
    });
    out.byType = byType;
    out.help.seenTypes = strList(out.help.seenTypes);
    out.help.seenScreens = strList(out.help.seenScreens);
    out.help.tourDone = out.help.tourDone === true;
    out.help.handShown = out.help.handShown === true;
    ['sound', 'speech', 'autoRead'].forEach(function (k) {
      out.settings[k] = typeof out.settings[k] === 'boolean' ? out.settings[k] : base.settings[k];
    });
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

    /* קוד גיבוי של ההתקדמות הנוכחית */
    exportCode: function () {
      var s = this.get(), d = {};
      BACKUP_KEYS.forEach(function (k) { d[k] = s[k]; });
      var b64 = toB64(JSON.stringify({ v: 1, d: d }));
      return CODE_PREFIX + '.' + checksum(b64) + '.' + b64;
    },

    /* קורא קוד שהודבק. מחזיר {ok:true, state} או {ok:false, error}.
       error: 'format' (לא נראה כקוד), 'version' (גרסה אחרת), 'checksum' (נחתך או שונה), 'data' (פגום) */
    readCode: function (code) {
      var clean = String(code || '').replace(/[\s​-‏‪-‮⁦-⁩﻿]/g, '');
      var parts = clean.split('.');
      if (parts.length !== 3 || !/^MGJ/.test(parts[0])) return { ok: false, error: 'format' };
      if (parts[0] !== CODE_PREFIX) return { ok: false, error: 'version' };
      if (!/^[A-Za-z0-9_-]+$/.test(parts[2]) || checksum(parts[2]) !== parts[1]) return { ok: false, error: 'checksum' };
      var data;
      try { data = JSON.parse(fromB64(parts[2])); } catch (e) { return { ok: false, error: 'data' }; }
      if (!data || data.v !== 1 || !data.d || typeof data.d !== 'object' ||
          !data.d.player || typeof data.d.player !== 'object' ||
          !data.d.progress || typeof data.d.progress !== 'object') return { ok: false, error: 'data' };
      try { return { ok: true, state: sanitize(data.d) }; } catch (e) { return { ok: false, error: 'data' }; }
    },

    /* מחליף את ההתקדמות במצב שנקרא מקוד. הגדרות ההורים והזמן היומי נשארים של המכשיר הזה. */
    restore: function (newState) {
      var cur = this.get();
      newState.parent = cur.parent;
      newState.usage = cur.usage;
      state = newState;
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
