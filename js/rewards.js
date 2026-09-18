/* ===================================================================
   rewards.js – עולמות, פרסים, מדבקות, מדליות וחנות
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var S = MG.Storage;

  /* ---------- עולמות ---------- */
  var WORLDS = [
    { id: 'meadow', name: 'אחו הפרחים', emoji: '🌼', sub: 'מתחילים בקטן', need: 0,
      bg: 'linear-gradient(135deg,#7bd389,#3fa96b)' },
    { id: 'ocean',  name: 'מפרץ הים',   emoji: '🐠', sub: 'צוללים לתרגילים', need: 9,
      bg: 'linear-gradient(135deg,#4cc9f0,#2c7bd6)' },
    { id: 'space',  name: 'מסע לחלל',   emoji: '🚀', sub: 'ממריאים גבוה', need: 24,
      bg: 'linear-gradient(135deg,#9d7bff,#5b3bd6)' },
    { id: 'candy',  name: 'ארץ הממתקים', emoji: '🍭', sub: 'מתוק ומאתגר', need: 42,
      bg: 'linear-gradient(135deg,#ff8fb1,#e0457b)' },
    { id: 'jungle', name: 'ג׳ונגל הקופים', emoji: '🐒', sub: 'ההרפתקה הגדולה', need: 63,
      bg: 'linear-gradient(135deg,#ffb703,#e06d06)' }
  ];

  var MISSIONS_PER_WORLD = 5;   // כמה משימות משלימות עולם
  var TASKS_PER_MISSION = 8;    // כמה תרגילים במשימה רגילה
  var TASKS_PER_BONUS = 4;      // אתגר בונוס קצר

  /* ---------- מדבקות לאיסוף ---------- */
  var STICKERS = [
    '🦄', '🐙', '🦕', '🐳', '🦋', '🐝', '🦉', '🐢',
    '🍉', '🍩', '🌈', '🎠', '🪐', '⚡', '🎪', '🧸',
    '🛸', '🏰', '🐬', '🦩'
  ];

  /* ---------- חנות ---------- */
  var SHOP = [
    { id: 'hat-crown',  name: 'כתר מלכותי', ico: '👑', cost: 30, kind: 'hat' },
    { id: 'hat-cap',    name: 'כובע מצחייה', ico: '🧢', cost: 15, kind: 'hat' },
    { id: 'hat-top',    name: 'מגבעת קסמים', ico: '🎩', cost: 25, kind: 'hat' },
    { id: 'hat-grad',   name: 'כובע בוגרים', ico: '🎓', cost: 40, kind: 'hat' },
    { id: 'hat-bow',    name: 'פפיון ורוד', ico: '🎀', cost: 15, kind: 'hat' },
    { id: 'hat-party',  name: 'כובע מסיבה', ico: '🥳', cost: 20, kind: 'hat' },
    { id: 'hat-flower', name: 'זר פרחים', ico: '🌺', cost: 20, kind: 'hat' },
    { id: 'hat-hero',   name: 'מסכת גיבור', ico: '🦸', cost: 50, kind: 'hat' },
    { id: 'chest',      name: 'תיבת הפתעה', ico: '🎁', cost: 35, kind: 'chest', repeat: true }
  ];

  /* ---------- מדליות ---------- */
  var MEDALS = [
    { id: 'first',   ico: '🌟', t: 'הצעד הראשון',     d: 'פתרתם תרגיל ראשון',           test: function (s) { return s.progress.totalCorrect >= 1; } },
    { id: 'ten',     ico: '🔟', t: 'עשרה נכונים',      d: '10 תשובות נכונות',            test: function (s) { return s.progress.totalCorrect >= 10; } },
    { id: 'fifty',   ico: '🏅', t: 'חמישים נכונים',    d: '50 תשובות נכונות',            test: function (s) { return s.progress.totalCorrect >= 50; } },
    { id: 'hundred', ico: '🏆', t: 'מאה נכונים',       d: '100 תשובות נכונות',           test: function (s) { return s.progress.totalCorrect >= 100; } },
    { id: 'streak5', ico: '🔥', t: 'רצף של 5',         d: '5 נכונות ברצף',               test: function (s) { return s.progress.bestStreak >= 5; } },
    { id: 'streak10',ico: '⚡', t: 'רצף של 10',        d: '10 נכונות ברצף',              test: function (s) { return s.progress.bestStreak >= 10; } },
    { id: 'world1',  ico: '🌼', t: 'חוקר האחו',        d: 'סיימתם את אחו הפרחים',        test: function (s) { return !!(s.progress.worlds.meadow && s.progress.worlds.meadow.done); } },
    { id: 'allworlds',ico: '🗺️', t: 'מגלה עולמות',     d: 'סיימתם את כל העולמות',        test: function (s) { return WORLDS.every(function (w) { return s.progress.worlds[w.id] && s.progress.worlds[w.id].done; }); } },
    { id: 'coins100',ico: '💰', t: 'אוצר של מטבעות',   d: 'אספתם 100 מטבעות בסך הכול',   test: function (s) { return s.progress.coins >= 100; } },
    { id: 'stick5',  ico: '🎨', t: 'אספן מדבקות',      d: 'אספתם 5 מדבקות',              test: function (s) { return s.stickers.length >= 5; } },
    { id: 'stickall',ico: '💎', t: 'האוסף המושלם',     d: 'אספתם את כל המדבקות',         test: function (s) { return s.stickers.length >= STICKERS.length; } },
    { id: 'level5',  ico: '🧠', t: 'אלוף החשבון',      d: 'הגעתם לרמת קושי 5',           test: function (s) { return s.progress.level >= 5; } }
  ];

  MG.Rewards = {
    WORLDS: WORLDS,
    STICKERS: STICKERS,
    SHOP: SHOP,
    MEDALS: MEDALS,
    MISSIONS_PER_WORLD: MISSIONS_PER_WORLD,
    TASKS_PER_MISSION: TASKS_PER_MISSION,
    TASKS_PER_BONUS: TASKS_PER_BONUS,

    world: function (id) {
      for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[i];
      return WORLDS[0];
    },

    isUnlocked: function (w) {
      return S.get().progress.stars >= w.need;
    },

    /* חישוב כוכבים למשימה: 3 כוכבים על כמעט הכול נכון בניסיון ראשון */
    starsFor: function (firstTry, total) {
      var r = firstTry / total;
      if (r >= 0.9) return 3;
      if (r >= 0.65) return 2;
      if (r >= 0.35) return 1;
      return 1; // תמיד יוצאים עם כוכב – בלי תחושת כישלון
    },

    /* סיום משימה: עדכון עולם, כוכבים ומטבעות */
    finishMission: function (worldId, stars, coins, isBonus) {
      var s = S.get();
      var w = S.world(worldId);
      if (!isBonus) w.missions++;
      if (stars > 0) w.stars += stars;
      var justDone = false;
      if (!w.done && w.missions >= MISSIONS_PER_WORLD) { w.done = true; justDone = true; }
      s.progress.stars += stars;
      s.progress.coins += coins;
      s.progress.missions++;
      S.save();
      return { worldDone: justDone };
    },

    /* מדבקה אקראית שעוד לא נאספה */
    randomSticker: function () {
      var s = S.get();
      var left = STICKERS.filter(function (x) { return s.stickers.indexOf(x) < 0; });
      if (!left.length) return null;
      var pick = left[Math.floor(Math.random() * left.length)];
      s.stickers.push(pick);
      S.save();
      return pick;
    },

    /* בדיקת מדליות חדשות – מחזיר רשימת מדליות שנפתחו עכשיו */
    checkMedals: function () {
      var s = S.get(), fresh = [];
      MEDALS.forEach(function (m) {
        if (s.medals.indexOf(m.id) < 0 && m.test(s)) {
          s.medals.push(m.id);
          fresh.push(m);
        }
      });
      if (fresh.length) S.save();
      return fresh;
    },

    buy: function (itemId) {
      var s = S.get();
      var item = null;
      SHOP.forEach(function (i) { if (i.id === itemId) item = i; });
      if (!item) return { ok: false };
      if (!item.repeat && s.owned.indexOf(itemId) >= 0) return { ok: false, reason: 'owned' };
      if (s.progress.coins < item.cost) return { ok: false, reason: 'coins' };
      s.progress.coins -= item.cost;
      if (item.kind === 'hat') {
        s.owned.push(itemId);
        s.player.hat = item.ico;
      } else if (item.kind === 'chest') {
        var st = this.randomSticker();
        S.save();
        return { ok: true, item: item, sticker: st };
      }
      S.save();
      return { ok: true, item: item };
    }
  };
})(window.MG);
