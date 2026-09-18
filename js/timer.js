/* ===================================================================
   timer.js – מנגנון הגבלת זמן שימוש יומי
   הזמן נספר רק כשהמשחק פתוח וגלוי, ולא באזור ההורים / מסך סיום היום.
   הספירה מתאפסת אוטומטית בכל יום חדש.
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var S = MG.Storage;
  var handle = null;
  var countable = true;      // האם המסך הנוכחי נספר
  var ticksSinceSave = 0;
  var cbTick = null, cbExpire = null;
  var firedExpire = false;

  function rollDateIfNeeded() {
    var s = S.get();
    if (s.usage.date !== S.today()) {
      s.usage = { date: S.today(), usedSec: 0, bonusSec: 0 };
      firedExpire = false;
      S.save();
      return true;
    }
    return false;
  }

  function limitSec() {
    var s = S.get();
    return Math.max(0, (s.parent.dailyLimitMin * 60) + (s.usage.bonusSec || 0));
  }

  function remainingSec() {
    rollDateIfNeeded();
    return Math.max(0, limitSec() - S.get().usage.usedSec);
  }

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s2 = sec % 60;
    return m + ':' + String(s2).padStart(2, '0');
  }

  function tick() {
    var rolled = rollDateIfNeeded();
    var s = S.get();
    var visible = !document.hidden;

    if (countable && visible && remainingSec() > 0) {
      s.usage.usedSec++;
      ticksSinceSave++;
      if (ticksSinceSave >= 10) { S.save(); ticksSinceSave = 0; }
    }

    if (cbTick) cbTick(remainingSec(), limitSec());

    if (remainingSec() <= 0 && !firedExpire) {
      firedExpire = true;
      S.save();
      if (cbExpire) cbExpire();
    }
    if (rolled && cbTick) cbTick(remainingSec(), limitSec());
  }

  MG.Timer = {
    PRESETS: [10, 15, 20, 30],

    init: function (opts) {
      opts = opts || {};
      cbTick = opts.onTick || null;
      cbExpire = opts.onExpire || null;
      rollDateIfNeeded();
      firedExpire = remainingSec() <= 0;
      if (handle) clearInterval(handle);
      handle = setInterval(tick, 1000);
      document.addEventListener('visibilitychange', function () {
        S.save();
        if (cbTick) cbTick(remainingSec(), limitSec());
      });
      window.addEventListener('pagehide', function () { S.save(); });
      window.addEventListener('beforeunload', function () { S.save(); });
      if (cbTick) cbTick(remainingSec(), limitSec());
      return this;
    },

    /* מסכים כמו אזור ההורים או "נגמר הזמן" אינם נספרים */
    setCountable: function (v) { countable = !!v; },

    remainingSec: remainingSec,
    limitSec: limitSec,
    fmt: fmt,
    usedSec: function () { rollDateIfNeeded(); return S.get().usage.usedSec; },
    isExpired: function () { return remainingSec() <= 0; },

    setLimitMinutes: function (min) {
      var s = S.get();
      s.parent.dailyLimitMin = Math.max(1, Math.min(300, Math.round(min)));
      S.save();
      if (remainingSec() > 0) firedExpire = false;
      if (cbTick) cbTick(remainingSec(), limitSec());
    },

    addBonusMinutes: function (min) {
      var s = S.get();
      s.usage.bonusSec = (s.usage.bonusSec || 0) + min * 60;
      S.save();
      if (remainingSec() > 0) firedExpire = false;
      if (cbTick) cbTick(remainingSec(), limitSec());
    },

    resetToday: function () {
      var s = S.get();
      s.usage = { date: S.today(), usedSec: 0, bonusSec: 0 };
      S.save();
      firedExpire = false;
      if (cbTick) cbTick(remainingSec(), limitSec());
    }
  };
})(window.MG);
