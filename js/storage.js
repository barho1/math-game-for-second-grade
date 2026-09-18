/* ===================================================================
   storage.js – שמירת המצב של המשחק (localStorage)
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var KEY = 'mg-number-journey-v1';

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function defaults() {
    return {
      version: 1,
      player: { name: '', face: '🦊', color: '#ffd166', hat: '' },
      progress: {
        level: 1,           // רמת קושי אדפטיבית 1..5
        stars: 0,
        coins: 0,
        streak: 0,          // רצף תשובות נכונות נוכחי
        bestStreak: 0,
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
      settings: { sound: true },
      parent: { dailyLimitMin: 20, gateEnabled: true },
      usage: { date: today(), usedSec: 0, bonusSec: 0 }
    };
  }

  var state = null;

  function migrate(s) {
    var base = defaults();
    // מיזוג רדוד + עמוק לאובייקטים הידועים, כדי לא לאבד מפתחות חדשים בעדכוני גרסה
    var out = Object.assign({}, base, s);
    ['player', 'progress', 'settings', 'parent', 'usage'].forEach(function (k) {
      out[k] = Object.assign({}, base[k], s && s[k]);
    });
    out.progress.worlds = Object.assign({}, s && s.progress && s.progress.worlds);
    out.owned = (s && s.owned) || [];
    out.stickers = (s && s.stickers) || [];
    out.medals = (s && s.medals) || [];
    out.byType = (s && s.byType) || {};
    return out;
  }

  MG.Storage = {
    today: today,

    load: function () {
      if (state) return state;
      var raw = null;
      try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
      if (raw) {
        try { state = migrate(JSON.parse(raw)); } catch (e) { state = defaults(); }
      } else {
        state = defaults();
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
      try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* מצב פרטי – ממשיכים בלי שמירה */ }
    },

    reset: function () {
      state = defaults();
      this.save();
      return state;
    },

    // עוזרים קטנים
    world: function (id) {
      var s = this.get();
      if (!s.progress.worlds[id]) s.progress.worlds[id] = { stars: 0, missions: 0, done: false };
      return s.progress.worlds[id];
    },

    addCoins: function (n) { this.get().progress.coins += n; this.save(); },
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
