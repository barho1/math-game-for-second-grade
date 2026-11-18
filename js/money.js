/* ===================================================================
   money.js – נתיב כסף
   לפי תוכנית הלימודים לכיתה ב׳ (שימוש במספרים דו-ספרתיים ותלת-ספרתיים,
   ושאלות קנייה ומכירה): ספירת מטבעות ושטרות, דרכים שונות לשלם סכום, ועודף.

   שלבים 1..4:
     1  מטבעות של 1, 2, 5, 10 עד 30 שקלים
     2  גם שטרות של 20 ו-50, ודרכים לשלם סכום
     3  עד 100, ועודף מקנייה
     4  עד 200, וקנייה של שני פריטים
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp, choicesAround = h.choicesAround, numWord = h.numWord;
  var MAX_STAGE = 4;

  function say(t) { return '<p class="q-text">' + t + '</p>'; }
  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function step(l) { return '<div class="equation step">' + l + '</div>'; }
  /* "שקל אחד", "שני שקלים", "עשרה שקלים" */
  function sh(n) { return n === 1 ? 'שקל אחד' : n === 2 ? 'שני שקלים' : numWord(n, 'm') + ' שקלים'; }

  function chip(v) { return '<span class="mny ' + (v >= 20 ? 'note' : 'coin') + ' v' + v + '">' + v + '</span>'; }
  function chips(list) { return '<div class="mny-set">' + list.slice().sort(function (a, b) { return b - a; }).map(chip).join('') + '</div>'; }
  function sum(list) { return list.reduce(function (a, b) { return a + b; }, 0); }

  /* מפרק סכום לאוסף של מטבעות ושטרות, באקראי ובלי יותר מ-max פריטים */
  function decompose(total, denoms, max) {
    for (var attempt = 0; attempt < 200; attempt++) {
      var rem = total, out = [];
      while (rem > 0 && out.length <= max) {
        var fit = denoms.filter(function (d) { return d <= rem; });
        // נוטים לערכים גדולים, כדי שהאוסף יהיה קצר
        var d = Math.random() < 0.65 ? fit[fit.length - 1] : pick(fit);
        out.push(d); rem -= d;
      }
      if (rem === 0 && out.length <= max) return out;
    }
    return null;
  }

  function denomsFor(st) { return st <= 1 ? [1, 2, 5, 10] : st === 2 ? [1, 2, 5, 10, 20, 50] : [1, 2, 5, 10, 20, 50, 100]; }
  function capFor(st) { return st <= 1 ? 30 : st === 2 ? 130 : st === 3 ? 160 : 260; }

  /* ---------- ספירת כסף ---------- */
  function genCoins(stage) {
    var st = clamp(stage, 1, MAX_STAGE), denoms = denomsFor(st), list, total, g = 0;
    do {
      list = [];
      for (var i = rnd(3, 6); i > 0; i--) list.push(pick(denoms));
      total = sum(list); g++;
    } while ((total > capFor(st) || total < 6) && g < 200);
    var sorted = list.slice().sort(function (a, b) { return b - a; });
    var run = 0, lines = sorted.map(function (v, i) {
      var prev = run; run += v;
      return i === 0 ? '' : step(prev + ' + ' + v + ' = ' + run);
    }).join('');
    return {
      type: 'coins', kicker: 'כסף',
      text: 'כמה כסף יש כאן?',
      spoken: 'כמה כסף יש כאן? סופרים מהמטבע או השטר הגדול ביותר.',
      html: chips(list),
      input: 'choices',
      choices: choicesAround(total, 0, total + 30, [total + 1, total - 1, total + 5, total - 5, total + 10, total - 10]
        .filter(function (v) { return v >= 0 && v !== total; }).slice(0, 3)),
      answer: total,
      hintHtml: say('סופרים מהגדול לקטן, ומוסיפים אחד אחד:') + lines,
      explainHtml: eq(sorted.join(' <span>+</span> ') + ' <span>=</span> <b>' + total + '</b>')
    };
  }

  /* ---------- דרכים לשלם ---------- */
  function genPay(stage) {
    var st = clamp(Math.max(2, stage), 2, MAX_STAGE), denoms = denomsFor(st);
    var T = st === 2 ? rnd(8, 40) : st === 3 ? rnd(12, 100) : rnd(30, 190), groups = [], g = 0, sets, sums;
    var right;
    do {
      right = decompose(T, denoms, 7);
      sets = right ? [right] : [];
      var deltas = shuffle([1, -1, 2, -2, 5, -5, 10, -10]).filter(function (d) { return T + d >= 3; });
      for (var i = 0; right && i < deltas.length && sets.length < 4; i++) {
        var w = decompose(T + deltas[i], denoms, 7);
        if (w) sets.push(w);
      }
      sums = sets.map(sum);
      g++;
    } while ((!right || sets.length < 4 || new Set(sets.map(function (s) { return s.slice().sort().join(); })).size < 4) && g < 100);
    var ids = ['A', 'B', 'C', 'D'], order = shuffle([0, 1, 2, 3]);
    var choices = order.map(function (k, pos) { return { v: ids[pos], sym: chips(sets[k]) }; });
    var answerId = ids[order.indexOf(0)];
    var rightSorted = sets[0].slice().sort(function (a, b) { return b - a; });
    return {
      type: 'pay', kicker: 'דרכים לשלם',
      text: 'איזה אוסף שווה ' + T + ' שקלים?',
      spoken: 'איזה אוסף שווה ' + sh(T) + '?',
      html: '',
      input: 'choices',
      choices: choices,
      answer: answerId,
      hintHtml: say('סופרים כל אוסף בנפרד, מהגדול לקטן, ובודקים איזה מהם יוצא ' + T + '.'),
      explainHtml: eq(rightSorted.join(' <span>+</span> ') + ' <span>=</span> <b>' + T + '</b>')
    };
  }

  /* ---------- קנייה ועודף ---------- */
  var ITEMS = [
    { n: 'מחברת', e: '📓' }, { n: 'ספר', e: '📘' }, { n: 'כדור', e: '⚽' },
    { n: 'בובה', e: '🧸' }, { n: 'עט', e: '🖊️' }, { n: 'משחק', e: '🎲' }
  ];

  function genChange(stage) {
    var st = clamp(Math.max(3, stage), 3, MAX_STAGE), two = st >= 4 && Math.random() < 0.6;
    var a = pick(ITEMS), b = pick(ITEMS.filter(function (x) { return x !== a; }));
    var p1 = rnd(5, two ? 60 : 95), p2 = two ? rnd(5, 70) : 0, total = p1 + p2;
    var pay = [20, 50, 100, 200].filter(function (m) { return m > total && m <= (st >= 4 ? 200 : 100); })[0] || 200;
    var change = pay - total;
    var text = two
      ? 'קנית ' + a.n + ' ב-' + p1 + ' שקלים ו' + b.n + ' ב-' + p2 + ' שקלים. שילמת ' + pay + ' שקלים. כמה עודף קיבלת?'
      : 'קנית ' + a.n + ' ב-' + p1 + ' שקלים. שילמת ' + pay + ' שקלים. כמה עודף קיבלת?';
    var spoken = two
      ? 'קנית ' + a.n + ' ב' + sh(p1) + ' ו' + b.n + ' ב' + sh(p2) + '. שילמת ' + sh(pay) + '. כמה עודף קיבלת?'
      : 'קנית ' + a.n + ' ב' + sh(p1) + '. שילמת ' + sh(pay) + '. כמה עודף קיבלת?';
    return {
      type: 'change', kicker: 'עודף',
      text: text, spoken: spoken,
      html: '<div class="visual" style="font-size:2.6rem">' + a.e + (two ? b.e : '') + '</div>',
      input: 'choices',
      choices: choicesAround(change, 0, pay, [total, change + 10, change - 10, change + 1, change - 1]
        .filter(function (v) { return v >= 0 && v !== change; }).slice(0, 3)),
      answer: change,
      hintHtml: say('העודף הוא מה שנשאר מהכסף ששילמת:') + (two ? step(p1 + ' + ' + p2 + ' = ' + total) : '') +
        step(pay + ' − ' + total + ' = ' + change),
      explainHtml: (two ? step(p1 + ' + ' + p2 + ' = ' + total) : '') + eq(pay + ' <span>−</span> ' + total + ' <span>=</span> <b>' + change + '</b>') +
        say('העודף הוא <b>' + change + '</b> שקלים.'),
      explainSpoken: Q.richSpeech((two ? step(p1 + ' + ' + p2 + ' = ' + total) : '') + eq(pay + ' <span>−</span> ' + total + ' <span>=</span> ' + change)) + ' העודף הוא ' + sh(change) + '.'
    };
  }

  Q.register({
    strand: 'money',
    generators: { coins: genCoins, pay: genPay, change: genChange },
    labels: { coins: 'ספירת כסף', pay: 'דרכים לשלם', change: 'עודף' },
    howTo: {
      coins:  { ico: '🪙', title: 'ספירת כסף',    line: 'סופרים מטבעות ושטרות ומגלים כמה כסף יש.' },
      pay:    { ico: '💳', title: 'דרכים לשלם',   line: 'בוחרים את האוסף ששווה בדיוק את הסכום.' },
      change: { ico: '🛍️', title: 'עודף',         line: 'מחסרים את המחיר ממה ששילמו.' }
    },
    typesForStage: function (st) {
      if (st <= 1) return ['coins'];
      if (st === 2) return ['coins', 'pay'];
      return ['coins', 'pay', 'change'];
    }
  });
})(window.MG);
