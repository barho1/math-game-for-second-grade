/* ===================================================================
   fractions.js – נתיב שברים
   לפי תוכנית הלימודים לכיתה ב׳ (הכרת השברים חצי ורבע): חצי ורבע כחלק של יחידה
   (צורה) וכחלק של כמות, והקשרים ביניהם: שני חצאים הם שלם, ארבעה רבעים הם שלם,
   שני רבעים הם חצי. ההכרה במילים ("חצי", "רבע"), עם הסמלים ½ ¼ ¾ בכפתורים.

   שלבים 1..3:
     1  חצי: איזה חלק צבוע, וחצי של כמות זוגית
     2  גם רבע, שני רבעים שווים לחצי, וקשרים בין חצי, רבע ושלם
     3  שלושה רבעים, רבע ושלושה רבעים של כמות, וקשרים מורכבים יותר
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp, row = h.row,
      choicesAround = h.choicesAround, numWord = h.numWord, OBJECTS = h.OBJECTS;
  var MAX_STAGE = 3;
  var DIV = '<span class="div">:</span>';

  function say(t) { return '<p class="q-text">' + t + '</p>'; }
  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function step(l) { return '<div class="equation step">' + l + '</div>'; }

  /* ערכי השברים שבשאלות הסימון */
  var FR = {
    half:  { sym: '½', label: 'חצי', word: 'חצי' },
    quarter: { sym: '¼', label: 'רבע', word: 'רבע' },
    three: { sym: '¾', label: 'שלושה רבעים', word: 'שלושה רבעים' },
    whole: { sym: '1', label: 'שלם', word: 'שלם' }
  };
  function symChoices() {
    return shuffle(['half', 'quarter', 'three', 'whole']).map(function (k) { return { v: k, sym: FR[k].sym, label: FR[k].label }; });
  }
  function fracKey(n, k) {
    var v = k / n;
    return v === 1 ? 'whole' : v === 0.5 ? 'half' : v === 0.25 ? 'quarter' : 'three';
  }

  /* ---------- ציור: עוגה או פס, מחולקים ל-n חלקים שווים, k מהם צבועים ---------- */
  function fracSvg(n, k, kind) {
    var i, parts = '';
    if (kind === 'bar') {
      var w = 100 / n;
      for (i = 0; i < n; i++) parts += '<rect x="' + (5 + i * w * 0.9) + '" y="22" width="' + (w * 0.9) + '" height="56" fill="' + (i < k ? '#ffb347' : '#fff') + '" stroke="#3b2a5a" stroke-width="2"/>';
      return '<svg class="frac" viewBox="0 0 100 100" data-n="' + n + '" data-k="' + k + '" data-kind="bar" role="img" aria-label="צורה מחולקת">' + parts + '</svg>';
    }
    for (i = 0; i < n; i++) {
      var a0 = (i * 360 / n - 90) * Math.PI / 180, a1 = ((i + 1) * 360 / n - 90) * Math.PI / 180;
      var x0 = 50 + 45 * Math.cos(a0), y0 = 50 + 45 * Math.sin(a0), x1 = 50 + 45 * Math.cos(a1), y1 = 50 + 45 * Math.sin(a1);
      parts += '<path d="M50 50 L' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A45 45 0 0 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z" fill="' + (i < k ? '#ffb347' : '#fff') + '" stroke="#3b2a5a" stroke-width="2"/>';
    }
    return '<svg class="frac" viewBox="0 0 100 100" data-n="' + n + '" data-k="' + k + '" data-kind="pie" role="img" aria-label="צורה מחולקת">' + parts + '</svg>';
  }

  /* ---------- איזה חלק צבוע ---------- */
  function genFrac(stage) {
    var st = clamp(stage, 1, MAX_STAGE), n, k;
    if (st === 1) { n = 2; k = pick([1, 1, 2]); }
    else if (st === 2) { n = pick([2, 4]); k = n === 2 ? pick([1, 2]) : pick([1, 2, 4]); }
    else { n = pick([2, 4, 4]); k = n === 2 ? pick([1, 2]) : pick([1, 2, 3, 4]); }
    var ans = fracKey(n, k), kind = pick(['pie', 'bar']);
    var hintTxt = 'בצורה ' + n + ' חלקים שווים, ו-' + k + ' מהם צבועים.';
    return {
      type: 'frac', kicker: 'שברים',
      text: 'איזה חלק מהצורה צבוע?',
      spoken: 'איזה חלק מהצורה צבוע?',
      html: '<div class="frac-wrap">' + fracSvg(n, k, kind) + '</div>',
      input: 'choices',
      choices: symChoices(),
      answer: ans,
      hintHtml: say(hintTxt) + say(n === 2 ? 'שני חלקים שווים הם חצאים.' : 'ארבעה חלקים שווים הם רבעים.'),
      hintSpoken: 'בצורה ' + numWord(n, 'm', true) + ' חלקים שווים, ו' + (k === 1 ? 'אחד מהם צבוע' : numWord(k, 'm') + ' מהם צבועים') + '. ' +
        (n === 2 ? 'שני חלקים שווים הם חצאים.' : 'ארבעה חלקים שווים הם רבעים.'),
      explainHtml: say('הצבוע הוא <b>' + FR[ans].word + '</b>.'),
      explainSpoken: 'הצבוע הוא ' + FR[ans].word + '.'
    };
  }

  /* ---------- חצי ורבע של כמות ---------- */
  function genFracOf(stage) {
    var st = clamp(stage, 1, MAX_STAGE), kind, n, ans, word;
    if (st === 1) kind = 'half'; else kind = pick(st === 2 ? ['half', 'quarter'] : ['half', 'quarter', 'three']);
    if (kind === 'half') { n = rnd(2, st === 1 ? 10 : 20) * 2; ans = n / 2; word = 'חצי'; }
    else if (kind === 'quarter') { n = rnd(2, st === 2 ? 10 : 8) * 4; ans = n / 4; word = 'רבע'; }
    else { n = rnd(1, 5) * 4; ans = n / 4 * 3; word = 'שלושה רבעים'; }
    var obj = pick(OBJECTS), divisor = kind === 'half' ? 2 : 4;
    return {
      type: 'fracof', kicker: 'שבר של כמות',
      text: 'כמה זה ' + word + ' מ-' + n + '?',
      spoken: 'כמה זה ' + word + ' מ' + numWord(n) + '?',
      html: n <= 20 ? '<div class="visual small">' + row(n, obj.e) + '</div>' : '',
      input: 'choices',
      choices: choicesAround(ans, 0, n, shuffle([ans + 1, ans - 1, n - ans, n / 2, n / 4].filter(function (v) { return v >= 0 && v !== ans && v === Math.floor(v); })).slice(0, 3)),
      answer: ans,
      hintHtml: say(kind === 'half' ? 'חצי הוא חלוקה לשני חלקים שווים.' : kind === 'quarter' ? 'רבע הוא חלוקה לארבעה חלקים שווים.' : 'קודם מוצאים רבע, ואחר כך לוקחים שלושה כאלה.') +
        step(n + ' ' + DIV + ' ' + divisor + ' = ' + (n / divisor)) + (kind === 'three' ? step((n / 4) + ' × 3 = ' + ans) : ''),
      explainHtml: step(n + ' ' + DIV + ' ' + divisor + ' = ' + (n / divisor)) + (kind === 'three' ? step((n / 4) + ' × 3 = ' + ans) : '') +
        say(word + ' מ-' + n + ' הוא <b>' + ans + '</b>.')
    };
  }

  /* ---------- קשרים בין חצי, רבע ושלם ---------- */
  function genFracRel(stage) {
    var st = clamp(Math.max(2, stage), 2, MAX_STAGE);
    var items = [
      { t: 'כמה חצאים יש בשלם?', s: 'כמה חצאים יש בשלם?', a: 2, why: 'שני חצאים הם שלם.' },
      { t: 'כמה רבעים יש בשלם?', s: 'כמה רבעים יש בשלם?', a: 4, why: 'ארבעה רבעים הם שלם.' },
      { t: 'כמה רבעים יש בחצי?', s: 'כמה רבעים יש בחצי?', a: 2, why: 'שני רבעים הם חצי.' }
    ];
    var syms = [
      { t: 'שני רבעים שווים ל...', s: 'שני רבעים שווים ל...', a: 'half', why: 'שני רבעים הם חצי.' },
      { t: 'חצי ועוד חצי שווים ל...', s: 'חצי ועוד חצי שווים ל...', a: 'whole', why: 'שני חצאים הם שלם.' },
      { t: 'ארבעה רבעים שווים ל...', s: 'ארבעה רבעים שווים ל...', a: 'whole', why: 'ארבעה רבעים הם שלם.' }
    ];
    if (st >= 3) {
      syms.push({ t: 'חצי ועוד רבע שווים ל...', s: 'חצי ועוד רבע שווים ל...', a: 'three', why: 'חצי הוא שני רבעים, ועוד רבע הם שלושה רבעים.' });
      syms.push({ t: 'שלם פחות רבע שווה ל...', s: 'שלם פחות רבע שווה ל...', a: 'three', why: 'שלם הוא ארבעה רבעים, ואם לוקחים רבע נשארים שלושה רבעים.' });
    }
    var useSym = Math.random() < 0.5, it = useSym ? pick(syms) : pick(items);
    return {
      type: 'fracrel', kicker: 'חצי, רבע ושלם',
      text: it.t, spoken: it.s,
      html: '',
      input: 'choices',
      choices: useSym ? symChoices() : choicesAround(it.a, 1, 8, [1, 3, 4, 2].filter(function (v) { return v !== it.a; }).slice(0, 3)),
      answer: it.a,
      hintHtml: say('אפשר לצייר עוגה ולחלק אותה לחצאים ולרבעים.'),
      explainHtml: say(it.why)
    };
  }

  Q.register({
    strand: 'fractions',
    generators: { frac: genFrac, fracof: genFracOf, fracrel: genFracRel },
    labels: { frac: 'שברים בצורה', fracof: 'שבר של כמות', fracrel: 'חצי, רבע ושלם' },
    howTo: {
      frac:    { ico: '🍕', title: 'שברים',           line: 'בוחרים איזה חלק מהצורה צבוע: חצי, רבע או שלם.' },
      fracof:  { ico: '🍪', title: 'חצי ורבע של כמות', line: 'מחלקים את הכמות לחלקים שווים.' },
      fracrel: { ico: '🧩', title: 'חצי, רבע ושלם',    line: 'מגלים כמה חצאים ורבעים יש בשלם.' }
    },
    typesForStage: function (st) {
      if (st <= 1) return ['frac', 'fracof'];
      return ['frac', 'fracof', 'fracrel'];
    }
  });
})(window.MG);
