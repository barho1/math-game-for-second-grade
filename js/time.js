/* ===================================================================
   time.js – נתיב שעון וזמן
   לפי תוכנית הלימודים לכיתה ב׳ (מדידות זמן): קריאת שעון מחוגים בשעות שלמות,
   חצאי שעות ורבעי שעות, וחישובי משך זמן, גם מעבר לשעה 12.

   שלבים 1..4:
     1  שעות שלמות
     2  גם חצאי שעות, ובחירת השעון שמראה שעה נתונה
     3  גם רבעי שעות, וחישוב מתי נגמר משהו (שעות וחצאי שעות, בלי מעבר ל-12)
     4  גם משך בקפיצות של רבע שעה, ומעבר לשעה 12
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp, numWord = h.numWord;
  var MAX_STAGE = 4;

  function wrap(n) { return ((n - 1) % 12 + 12) % 12 + 1; }                 // 13 -> 1, 0 -> 12
  function digital(hr, mn) { return hr + ':' + (mn < 10 ? '0' : '') + mn; }
  function hw(n) { return numWord(wrap(n), 'f'); }                           // "שלוש", "שתים עשרה"
  function say(text) { return '<p class="q-text">' + text + '</p>'; }
  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function minsFor(st) { return st <= 1 ? [0] : st === 2 ? [0, 30] : [0, 15, 30, 45]; }

  /* שעה במילים: "שלוש", "שלוש וחצי", "שלוש ורבע", "רבע לארבע" */
  function timeWords(hr, mn) {
    if (mn === 0) return hw(hr);
    if (mn === 15) return hw(hr) + ' ורבע';
    if (mn === 30) return hw(hr) + ' וחצי';
    return 'רבע ל' + hw(hr + 1);
  }

  /* משך במילים: "חצי שעה", "שעה וחצי", "שעתיים", "שלוש שעות ורבע" */
  function durWords(min) {
    var hrs = Math.floor(min / 60), r = min % 60, head;
    if (hrs === 0) return r === 15 ? 'רבע שעה' : r === 30 ? 'חצי שעה' : 'שלושה רבעי שעה';
    head = hrs === 1 ? 'שעה' : hrs === 2 ? 'שעתיים' : numWord(hrs, 'f') + ' שעות';
    return head + (r === 15 ? ' ורבע' : r === 30 ? ' וחצי' : r === 45 ? ' ושלושה רבעים' : '');
  }

  /* ---------- שעון מחוגים (SVG) ---------- */
  function clockSvg(hr, mn, size) {
    var a = (hr % 12) * 30 + mn * 0.5, b = mn * 6, nums = '';
    for (var i = 1; i <= 12; i++) {
      var ang = i * 30 * Math.PI / 180;
      nums += '<text x="' + (50 + 36 * Math.sin(ang)).toFixed(1) + '" y="' + (50 - 36 * Math.cos(ang) + 3.2).toFixed(1) +
              '" text-anchor="middle" font-size="9" font-weight="700" fill="#3b2a5a">' + i + '</text>';
    }
    return '<svg class="clock" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" data-time="' + digital(hr, mn) +
      '" role="img" aria-label="שעון">' +
      '<circle cx="50" cy="50" r="47" fill="#fff" stroke="#3b2a5a" stroke-width="3"/>' + nums +
      '<line x1="50" y1="50" x2="50" y2="30" stroke="#3b2a5a" stroke-width="5" stroke-linecap="round" transform="rotate(' + a + ' 50 50)"/>' +
      '<line x1="50" y1="50" x2="50" y2="17" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round" transform="rotate(' + b + ' 50 50)"/>' +
      '<circle cx="50" cy="50" r="3" fill="#3b2a5a"/></svg>';
  }

  /* כלל הקריאה של השעון, בטקסט ובהקראה */
  function rule(hr, mn) {
    var nx = wrap(hr + 1);
    if (mn === 0) return [
      'המחוג הקצר על ' + hr + ', והארוך על 12: שעה שלמה.',
      'המחוג הקצר על ' + hw(hr) + ', והארוך על שתים עשרה: שעה שלמה.'];
    if (mn === 30) return [
      'המחוג הקצר בין ' + hr + ' ל-' + nx + ', והארוך על 6: חצי שעה.',
      'המחוג הקצר בין ' + hw(hr) + ' ל' + hw(nx) + ', והארוך על שש: חצי שעה.'];
    if (mn === 15) return [
      'המחוג הארוך על 3: רבע שעה אחרי ' + hr + '.',
      'המחוג הארוך על שלוש: רבע שעה אחרי ' + hw(hr) + '.'];
    return [
      'המחוג הארוך על 9: רבע שעה לפני ' + nx + '.',
      'המחוג הארוך על תשע: רבע שעה לפני ' + hw(nx) + '.'];
  }

  function timeChoices(answer, candidates) {
    var set = [answer];
    shuffle(candidates).forEach(function (c) { if (set.length < 4 && set.indexOf(c) < 0) set.push(c); });
    return shuffle(set);
  }

  /* ---------- קריאת שעון ---------- */
  function genClock(stage) {
    var st = clamp(stage, 1, MAX_STAGE), mins = minsFor(st), hr = rnd(1, 12), mn = pick(mins);
    var ans = digital(hr, mn), cand = [], r = rule(hr, mn);
    mins.forEach(function (m2) { if (m2 !== mn) cand.push(digital(hr, m2)); });
    cand.push(digital(wrap(hr + 1), mn), digital(wrap(hr - 1), mn), digital(wrap(hr + 2), mn));
    if (mn === 45) cand.push(digital(wrap(hr + 1), 15));
    return {
      type: 'clock', kicker: 'קריאת שעון',
      text: 'מה השעה?',
      spoken: 'מה השעה? המחוג הקצר מראה שעה, והמחוג הארוך מראה דקות.',
      html: '<div class="clock-wrap">' + clockSvg(hr, mn, 190) + '</div>',
      input: 'choices',
      choices: timeChoices(ans, cand).map(function (v) { return { v: v, sym: v }; }),
      answer: ans,
      hintHtml: say(r[0]),
      hintSpoken: r[1],
      explainHtml: eq('<b>' + ans + '</b>') + say(r[0]),
      explainSpoken: 'השעה ' + timeWords(hr, mn) + '. ' + r[1]
    };
  }

  /* ---------- איזה שעון מראה את השעה ---------- */
  function genTclock(stage) {
    var st = clamp(Math.max(2, stage), 2, MAX_STAGE), mins = minsFor(st);
    var hr = rnd(1, 12), mn = pick(mins), ans = digital(hr, mn), r = rule(hr, mn);
    var cand = [digital(wrap(hr + 1), mn), digital(wrap(hr - 1), mn)];
    mins.forEach(function (m2) { if (m2 !== mn) cand.push(digital(hr, m2)); });
    // "החלפת מחוגים": הטעות הנפוצה ביותר בקריאת שעון
    if (mn % 5 === 0 && mins.indexOf((hr % 12) * 5) >= 0) cand.push(digital(mn / 5 === 0 ? 12 : mn / 5, (hr % 12) * 5));
    var all = timeChoices(ans, cand);
    return {
      type: 'tclock', kicker: 'איזה שעון?',
      text: 'איזה שעון מראה את השעה ' + ans + '?',
      spoken: 'איזה שעון מראה את השעה ' + timeWords(hr, mn) + '?',
      html: '',
      input: 'choices',
      choices: all.map(function (v) { var p = v.split(':'); return { v: v, sym: clockSvg(+p[0], +p[1], 96) }; }),
      answer: ans,
      hintHtml: say('ב-' + ans + ': ' + r[0]),
      hintSpoken: 'בשעה ' + timeWords(hr, mn) + ': ' + r[1],
      explainHtml: eq('<b>' + ans + '</b>') + say(r[0]),
      explainSpoken: 'השעה ' + timeWords(hr, mn) + '. ' + r[1]
    };
  }

  /* ---------- משך זמן ---------- */
  function genDuration(stage) {
    var st = clamp(Math.max(3, stage), 3, MAX_STAGE), shape = pick(['end', 'length']);
    var startM = pick(st <= 3 ? [0, 30] : [0, 15, 30, 45]);
    var durs = st <= 3 ? [60, 90, 120, 150, 180] : [30, 45, 60, 75, 90, 120, 150, 180];
    var dur = pick(durs);
    if (shape === 'length') dur = pick([60, 90, 120, 150, 180]);          // משך בשעות וחצאי שעות בלבד
    var hr = st <= 3 ? rnd(1, Math.max(1, 11 - Math.ceil(dur / 60))) : rnd(1, 12);
    var endT = hr * 60 + startM + dur, endH = wrap(Math.floor(endT / 60)), endM = endT % 60;
    var startS = digital(hr, startM), endS = digital(endH, endM);

    if (shape === 'length') {
      var hrsVal = dur / 60, val = String(hrsVal);
      var cand = [hrsVal + 0.5, hrsVal - 0.5, hrsVal + 1, hrsVal - 1].filter(function (x) { return x >= 0.5; }).map(String);
      var opts = timeChoices(val, cand);
      var sym = function (v) { var n = +v, w = Math.floor(n); return n % 1 ? (w ? w + '½' : '½') : String(w); };
      return {
        type: 'duration', kicker: 'משך זמן',
        text: 'התחלנו בשעה ' + startS + ' וסיימנו בשעה ' + endS + '. כמה שעות עברו?',
        spoken: 'התחלנו בשעה ' + timeWords(hr, startM) + ' וסיימנו בשעה ' + timeWords(endH, endM) + '. כמה זמן עבר?',
        html: '<div class="clocks-pair">' + clockSvg(hr, startM, 110) + '<span class="arrow">➜</span>' + clockSvg(endH, endM, 110) + '</div>',
        input: 'choices',
        choices: opts.map(function (v) { return { v: v, sym: sym(v), label: 'שעות' }; }),
        answer: val,
        hintHtml: say('סופרים שעה אחרי שעה מ-' + startS + ' עד ' + endS + '.'),
        hintSpoken: 'סופרים שעה אחרי שעה, מ' + timeWords(hr, startM) + ' עד ' + timeWords(endH, endM) + '.',
        explainHtml: eq(startS + ' ➜ ' + endS) + say('עבר זמן של ' + durWords(dur) + '.'),
        explainSpoken: 'מ' + timeWords(hr, startM) + ' עד ' + timeWords(endH, endM) + ' עבר זמן של ' + durWords(dur) + '.'
      };
    }

    var cands = [-60, 60, -30, 30, -15, 15, 120].map(function (d) {
      var t = endT + d; return digital(wrap(Math.floor(t / 60)), ((t % 60) + 60) % 60);
    }).filter(function (v) { return v !== endS && (st >= 4 || /:(00|30)$/.test(v)); });
    var hoursPart = Math.floor(dur / 60) * 60, rest = dur - hoursPart, mid = hr * 60 + startM + hoursPart;
    var midS = digital(wrap(Math.floor(mid / 60)), mid % 60);
    var stepsHtml = '';
    var stepsSpoken = '';
    if (hoursPart) {
      stepsHtml += '<div class="equation step">' + startS + ' + ' + Math.floor(dur / 60) + ' ⌛ = ' + midS + '</div>';
      stepsSpoken += 'מוסיפים ' + durWords(hoursPart) + ' ומגיעים ל' + timeWords(wrap(Math.floor(mid / 60)), mid % 60) + '. ';
    }
    if (rest) {
      stepsHtml += '<div class="equation step">' + midS + ' + ' + rest + "' = " + endS + '</div>';
      stepsSpoken += 'מוסיפים ' + durWords(rest) + ' ומגיעים ל' + timeWords(endH, endM) + '.';
    }
    return {
      type: 'duration', kicker: 'משך זמן',
      text: 'משחק התחיל בשעה ' + startS + ' ונמשך ' + durWords(dur) + '. באיזו שעה הוא נגמר?',
      spoken: 'משחק התחיל בשעה ' + timeWords(hr, startM) + ' ונמשך ' + durWords(dur) + '. באיזו שעה הוא נגמר?',
      html: '<div class="clock-wrap">' + clockSvg(hr, startM, 150) + '</div>',
      input: 'choices',
      choices: timeChoices(endS, cands).map(function (v) { return { v: v, sym: v }; }),
      answer: endS,
      hintHtml: say('מוסיפים קודם שעות שלמות, ואחר כך את הדקות:') + stepsHtml,
      hintSpoken: 'מוסיפים קודם שעות שלמות, ואחר כך את הדקות. ' + stepsSpoken,
      explainHtml: eq('<b>' + endS + '</b>') + stepsHtml,
      explainSpoken: 'המשחק נגמר בשעה ' + timeWords(endH, endM) + '. ' + stepsSpoken
    };
  }

  Q.register({
    strand: 'time',
    generators: { clock: genClock, tclock: genTclock, duration: genDuration },
    labels: { clock: 'קריאת שעון', tclock: 'בחירת שעון', duration: 'משך זמן' },
    howTo: {
      clock:    { ico: '🕒', title: 'קריאת שעון',    line: 'המחוג הקצר מראה שעה, והארוך מראה דקות.' },
      tclock:   { ico: '⏰', title: 'איזה שעון?',     line: 'בוחרים את השעון שמראה את השעה הנתונה.' },
      duration: { ico: '⌛', title: 'כמה זמן?',       line: 'מוסיפים זמן לשעה ומוצאים מתי זה נגמר.' }
    },
    typesForStage: function (st) {
      if (st <= 1) return ['clock'];
      if (st === 2) return ['clock', 'tclock'];
      return ['clock', 'tclock', 'duration'];
    }
  });
})(window.MG);
