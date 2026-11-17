/* ===================================================================
   data.js – נתיב נתונים
   לפי תוכנית הלימודים לכיתה ב׳ (חקר נתונים): קריאה והשוואה של ייצוגים ישירים,
   תרשים תמונות ותרשים עמודות, ושאלות כמו "מה מופיע הכי הרבה" ו"בכמה יותר".

   שלבים 1..3:
     1  תרשים תמונות: כל סמל הוא אחד
     2  תרשים תמונות שבו כל סמל הוא שניים, ותרשים עמודות
     3  תרשים עמודות: בכמה יותר, וכמה בסך הכול
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp, choicesAround = h.choicesAround, numWord = h.numWord;
  var MAX_STAGE = 3;

  function say(t) { return '<p class="q-text">' + t + '</p>'; }
  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function step(l) { return '<div class="equation step">' + l + '</div>'; }

  var CATS = [
    { e: '🍎', n: 'תפוחים' }, { e: '🍌', n: 'בננות' }, { e: '🍇', n: 'ענבים' },
    { e: '🍓', n: 'תותים' }, { e: '🍊', n: 'תפוזים' }
  ];

  /* בוחר 3-4 קטגוריות עם ערכים שונים זה מזה, ובכל זאת בלי תיקו בשיא ובשפל */
  function makeData(count, lo, hi) {
    var cats = shuffle(CATS).slice(0, count), vals, g = 0;
    do {
      vals = cats.map(function () { return rnd(lo, hi); });
      g++;
    } while (new Set(vals).size < vals.length && g < 200);
    return cats.map(function (c, i) { return { e: c.e, n: c.n, v: vals[i] }; });
  }

  /* ---------- תרשים תמונות ---------- */
  function pictHtml(data, unit) {
    var rows = data.map(function (d) {
      var sym = '';
      for (var i = 0; i < d.v / unit; i++) sym += '<span>' + d.e + '</span>';
      return '<div class="pict-row"><b class="pict-lbl">' + d.e + '</b><div class="pict-syms">' + sym + '</div></div>';
    }).join('');
    return '<div class="pict" dir="ltr" data-unit="' + unit + '" data-v="' + data.map(function (d) { return d.v; }).join(',') + '">' + rows + '</div>' +
      (unit > 1 ? '<p class="q-text pict-key">כל סמל הוא ' + unit + ' ילדים.</p>' : '');
  }

  /* ---------- תרשים עמודות (SVG) ---------- */
  function barSvg(data, maxV) {
    var n = data.length, W = 40 + n * 44, H = 150, bottom = 124, unit = 100 / maxV, grid = '', bars = '', i;
    for (i = 0; i <= maxV; i++) {
      var y = bottom - i * unit;
      grid += '<line x1="30" y1="' + y + '" x2="' + (W - 6) + '" y2="' + y + '" stroke="#' + (i % 2 ? 'e7e1f2' : 'cfc5e6') + '" stroke-width="' + (i % 2 ? 0.6 : 1) + '"/>';
      if (i % 2 === 0) grid += '<text x="24" y="' + (y + 3) + '" text-anchor="end" font-size="9" font-weight="700" fill="#3b2a5a">' + i + '</text>';
    }
    data.forEach(function (d, k) {
      var x = 42 + k * 44, hgt = d.v * unit;
      bars += '<rect x="' + x + '" y="' + (bottom - hgt) + '" width="30" height="' + hgt + '" rx="3" fill="#7aa7ff" stroke="#3b2a5a" stroke-width="1.5"/>' +
              '<text x="' + (x + 15) + '" y="' + (bottom + 17) + '" text-anchor="middle" font-size="15">' + d.e + '</text>';
    });
    return '<svg class="bars" viewBox="0 0 ' + W + ' ' + H + '" data-v="' + data.map(function (d) { return d.v; }).join(',') + '" role="img" aria-label="תרשים עמודות">' + grid + bars + '</svg>';
  }

  /* ---------- שאלות על הנתונים (משותף לשני התרשימים) ---------- */
  function questions(data, st, unitWord) {
    var shapes = st <= 1 ? ['read', 'most'] : st === 2 ? ['read', 'most', 'least'] : ['read', 'most', 'diff', 'total'];
    var shape = pick(shapes), sorted = data.slice().sort(function (a, b) { return b.v - a.v; });
    var d1 = pick(data), d2 = pick(data.filter(function (x) { return x !== d1; }));
    var emojiChoices = shuffle(data).map(function (d) { return { v: d.e, sym: d.e }; });
    if (shape === 'read') {
      return { text: 'כמה ילדים אוהבים ' + d1.n + '?', spoken: 'כמה ילדים אוהבים ' + d1.n + '?', ans: d1.v, kind: 'num',
        hint: 'סופרים את ה' + unitWord + ' של ' + d1.n + '.', explain: d1.n + ': <b>' + d1.v + '</b> ילדים.',
        explainSp: d1.n + ': ' + numWord(d1.v, 'm') + ' ילדים.' };
    }
    if (shape === 'most') {
      return { text: 'איזה פרי אוהבים הכי הרבה?', spoken: 'איזה פרי אוהבים הכי הרבה?', ans: sorted[0].e, kind: 'emoji', choices: emojiChoices,
        hint: 'מחפשים את השורה או העמודה הארוכה ביותר.', explain: 'הכי הרבה אוהבים את <b>' + sorted[0].e + '</b>: ' + sorted[0].v + ' ילדים.',
        explainSp: 'הכי הרבה אוהבים את ' + sorted[0].n + ': ' + numWord(sorted[0].v, 'm') + ' ילדים.' };
    }
    if (shape === 'least') {
      return { text: 'איזה פרי אוהבים הכי מעט?', spoken: 'איזה פרי אוהבים הכי מעט?', ans: sorted[sorted.length - 1].e, kind: 'emoji', choices: emojiChoices,
        hint: 'מחפשים את השורה או העמודה הקצרה ביותר.', explain: 'הכי מעט אוהבים את <b>' + sorted[sorted.length - 1].e + '</b>: ' + sorted[sorted.length - 1].v + ' ילדים.',
        explainSp: 'הכי מעט אוהבים את ' + sorted[sorted.length - 1].n + ': ' + numWord(sorted[sorted.length - 1].v, 'm') + ' ילדים.' };
    }
    if (shape === 'diff') {
      var hi = d1.v > d2.v ? d1 : d2, lo = hi === d1 ? d2 : d1;
      return { text: 'בכמה ילדים יותר אוהבים ' + hi.n + ' מאשר ' + lo.n + '?', spoken: 'בכמה ילדים יותר אוהבים ' + hi.n + ' מאשר ' + lo.n + '?',
        ans: hi.v - lo.v, kind: 'num', hint: 'קוראים את שני הערכים, ומחסרים:', lines: step(hi.v + ' − ' + lo.v + ' = ' + (hi.v - lo.v)),
        explain: 'ההפרש הוא <b>' + (hi.v - lo.v) + '</b>.', explainSp: 'ההפרש הוא ' + numWord(hi.v - lo.v, 'm') + '.' };
    }
    var total = data.reduce(function (a, d) { return a + d.v; }, 0);
    return { text: 'כמה ילדים ענו בסך הכול?', spoken: 'כמה ילדים ענו בסך הכול?', ans: total, kind: 'num',
      hint: 'מחברים את כל הערכים:', lines: step(data.map(function (d) { return d.v; }).join(' + ') + ' = ' + total), explain: 'ענו <b>' + total + '</b> ילדים.',
      explainSp: 'ענו ' + numWord(total, 'm') + ' ילדים.' };
  }

  function build(type, kicker, chartHtml, qd, data, unit) {
    var extras = qd.kind === 'num'
      ? shuffle([qd.ans + 1, qd.ans - 1, qd.ans + unit, qd.ans - unit, qd.ans + 2].filter(function (v) { return v > 0 && v !== qd.ans; })).slice(0, 3) : null;
    return {
      type: type, kicker: kicker,
      text: qd.text, spoken: qd.spoken,
      html: chartHtml,
      input: 'choices',
      choices: qd.kind === 'num' ? choicesAround(qd.ans, 0, 40, extras) : qd.choices,
      answer: qd.ans,
      hintHtml: say(qd.hint) + (qd.lines || ''),
      explainHtml: (qd.lines || '') + say(qd.explain),
      explainSpoken: qd.explainSp ? (qd.lines ? Q.richSpeech(qd.lines) + ' ' : '') + qd.explainSp : undefined
    };
  }

  function genPict(stage) {
    var st = clamp(stage, 1, MAX_STAGE), unit = st >= 2 && Math.random() < 0.6 ? 2 : 1;
    var data = makeData(st >= 2 ? 4 : 3, 1, unit === 2 ? 5 : 7).map(function (d) { return { e: d.e, n: d.n, v: d.v * unit }; });
    return build('pict', 'תרשים תמונות', '<p class="q-text pict-title">איזה פרי אוהבים הילדים?</p>' + pictHtml(data, unit), questions(data, Math.min(st, 2), 'סמלים'), data, unit);
  }

  function genBar(stage) {
    var st = clamp(Math.max(2, stage), 2, MAX_STAGE), data = makeData(st >= 3 ? 4 : 3, 2, 10);
    return build('bar', 'תרשים עמודות', '<p class="q-text pict-title">איזה פרי אוהבים הילדים?</p>' + barSvg(data, 10), questions(data, st, 'עמודה'), data, 1);
  }

  Q.register({
    strand: 'data',
    generators: { pict: genPict, bar: genBar },
    labels: { pict: 'תרשים תמונות', bar: 'תרשים עמודות' },
    howTo: {
      pict: { ico: '🧑‍🤝‍🧑', title: 'תרשים תמונות', line: 'כל סמל הוא ילד אחד, או שניים. סופרים וקוראים את הנתונים.' },
      bar:  { ico: '📊',   title: 'תרשים עמודות', line: 'גובה העמודה מראה כמה. קוראים אותו מהמספרים בצד.' }
    },
    typesForStage: function (st) { return st <= 1 ? ['pict'] : ['pict', 'bar']; }
  });
})(window.MG);
