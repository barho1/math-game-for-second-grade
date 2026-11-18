/* ===================================================================
   measure.js – נתיב מדידות
   לפי תוכנית הלימודים לכיתה ב׳ (מדידות): מדידת אורך בס"מ ובמטר, מדידת שטח
   בכיסוי ריבועים (יחידות שטח), היקף כספירת יחידות אורך, והשוואת משקל.

   שלבים 1..3:
     1  קריאת אורך על סרגל (מ-0), בחירת יחידה (ס"מ או מטר), השוואת משקל
     2  גם אורך שמתחיל לא מ-0, ושטח של מלבן בריבועים
     3  גם המרה בין מטר לס"מ, היקף, ושטח של צורה בצורת L
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp, choicesAround = h.choicesAround;
  var MAX_STAGE = 3;

  function say(t) { return '<p class="q-text">' + t + '</p>'; }
  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function step(l) { return '<div class="equation step">' + l + '</div>'; }

  /* ---------- סרגל ---------- */
  function rulerSvg(n, from, to) {
    var u = 10, pad = 8, w = n * u + 2 * pad, ticks = '', i;
    for (i = 0; i <= n; i++) {
      var x = pad + i * u;
      ticks += '<line x1="' + x + '" y1="22" x2="' + x + '" y2="' + (i % 5 === 0 ? 33 : 29) + '" stroke="#3b2a5a" stroke-width="1"/>' +
               '<text x="' + x + '" y="42" text-anchor="middle" font-size="6.5" font-weight="700" fill="#3b2a5a">' + i + '</text>';
    }
    var x0 = pad + from * u, x1 = pad + to * u;
    return '<svg class="ruler" viewBox="0 0 ' + w + ' 48" data-from="' + from + '" data-to="' + to + '" data-n="' + n + '" role="img" aria-label="סרגל">' +
      '<rect x="' + (pad - 3) + '" y="21" width="' + (n * u + 6) + '" height="24" rx="2" fill="#fff3cf" stroke="#c99a2e" stroke-width="0.8"/>' + ticks +
      '<rect x="' + x0 + '" y="6" width="' + (x1 - x0) + '" height="11" rx="2.5" fill="#ffb347" stroke="#c97b13" stroke-width="0.8"/>' +
      '<line x1="' + x0 + '" y1="17" x2="' + x0 + '" y2="22" stroke="#c97b13" stroke-width="0.6" stroke-dasharray="1.4 1"/>' +
      '<line x1="' + x1 + '" y1="17" x2="' + x1 + '" y2="22" stroke="#c97b13" stroke-width="0.6" stroke-dasharray="1.4 1"/></svg>';
  }

  function genRuler(stage) {
    var st = clamp(stage, 1, MAX_STAGE), n = st >= 2 ? 12 : 10, from, to;
    if (st >= 2 && Math.random() < 0.8) { from = rnd(1, 5); to = from + rnd(2, Math.min(7, n - from)); }
    else { from = 0; to = rnd(2, 10); }
    var ans = to - from;
    var cands = [ans + 1, ans - 1, ans + 2, to].filter(function (v) { return v > 0 && v !== ans; });
    return {
      type: 'ruler', kicker: 'מדידת אורך',
      text: 'מה אורך החפץ בסנטימטרים?',
      spoken: 'מה אורך החפץ בסנטימטרים?',
      html: rulerSvg(n, from, to),
      input: 'choices',
      choices: choicesAround(ans, 1, n, shuffle(cands).slice(0, 3)).map(function (c) { return { v: c.v, sym: c.sym, label: 'ס"מ' }; }),
      answer: ans,
      hintHtml: from === 0
        ? say('החפץ מתחיל ב-0, ולכן המספר שבו הוא נגמר הוא האורך.')
        : say('החפץ לא מתחיל ב-0. מחסרים: איפה הוא נגמר פחות איפה הוא מתחיל.') + step(to + ' − ' + from + ' = ' + ans),
      explainHtml: (from === 0 ? '' : step(to + ' − ' + from + ' = ' + ans)) + say('אורך החפץ הוא <b>' + ans + '</b> סנטימטרים.'),
      explainSpoken: (from === 0 ? '' : h.numWord(to) + ' פחות ' + h.numWord(from) + ' שווה ' + h.numWord(ans) + '. ') + 'אורך החפץ הוא ' + h.numWord(ans, 'm') + ' סנטימטרים.'
    };
  }

  /* ---------- איזו יחידה, והמרה ---------- */
  var UNITS = [
    ['אורך העיפרון', 'cm'], ['אורך המחק', 'cm'], ['רוחב הספר', 'cm'], ['אורך הנעל', 'cm'], ['רוחב האצבע', 'cm'],
    ['גובה הדלת', 'm'], ['אורך הכיתה', 'm'], ['גובה העץ', 'm'], ['אורך מגרש הכדורגל', 'm'], ['אורך החצר', 'm']
  ];

  function genUnit(stage) {
    var st = clamp(stage, 1, MAX_STAGE);
    if (st >= 3 && Math.random() < 0.5) {
      var k = rnd(1, 4), toCm = Math.random() < 0.6;
      var ans = toCm ? k * 100 : k, shown = toCm ? k : k * 100;
      return {
        type: 'unit', kicker: 'מטר וסנטימטר',
        text: toCm ? 'כמה סנטימטרים יש ב-' + shown + ' ' + (shown === 1 ? 'מטר' : 'מטרים') + '?' : 'כמה מטרים יש ב-' + shown + ' סנטימטרים?',
        spoken: toCm ? 'כמה סנטימטרים יש ב' + (shown === 1 ? 'מטר אחד' : h.numWord(shown, 'm', true) + ' מטרים') + '?'
                     : 'כמה מטרים יש ב' + h.numWord(shown) + ' סנטימטרים?',
        html: '',
        input: 'choices',
        choices: choicesAround(ans, 1, 500, shuffle([ans + 100, Math.max(1, ans - 100), ans * 10, Math.max(1, Math.round(ans / 10)), ans + 10].filter(function (v) { return v !== ans; })).slice(0, 3)),
        answer: ans,
        hintHtml: say('מטר אחד הוא 100 סנטימטרים.') + (toCm ? step(shown + ' × 100 = ' + ans) : step(shown + ' <span class="div">:</span> 100 = ' + ans)),
        explainHtml: say('מטר אחד הוא 100 סנטימטרים, ולכן התשובה היא <b>' + ans + '</b>.')
      };
    }
    var u = pick(UNITS), word = u[1] === 'cm' ? 'סנטימטר' : 'מטר';
    return {
      type: 'unit', kicker: 'איזו יחידה',
      text: 'באיזו יחידה מודדים את ' + u[0] + '?',
      spoken: 'באיזו יחידה מודדים את ' + u[0] + '? סנטימטר או מטר?',
      html: '',
      input: 'choices',
      choices: shuffle([{ v: 'cm', sym: 'ס"מ' }, { v: 'm', sym: 'מטר' }]),
      answer: u[1],
      hintHtml: say('סנטימטר מתאים לדברים קטנים, כמו אצבע. מטר מתאים לדברים גדולים, כמו דלת.'),
      explainHtml: say(u[0] + ' מודדים ב<b>' + word + '</b>.')
    };
  }

  /* ---------- משקל ---------- */
  var WEIGHTS = [
    ['🐘', 'פיל', '🐭', 'עכבר'], ['🍉', 'אבטיח', '🍒', 'דובדבן'], ['🚗', 'מכונית', '🚲', 'אופניים'],
    ['🏠', 'בית', '🪑', 'כיסא'], ['🐄', 'פרה', '🐔', 'תרנגולת'], ['🪨', 'אבן', '🪶', 'נוצה']
  ];

  function genWeight() {
    var w = pick(WEIGHTS), heavy = Math.random() < 0.7, heavyLeft = Math.random() < 0.5;
    var left = heavyLeft ? w[0] : w[2], right = heavyLeft ? w[2] : w[0];
    var ln = heavyLeft ? w[1] : w[3], rn = heavyLeft ? w[3] : w[1];
    var ansSide = heavy === heavyLeft ? 'A' : 'B';
    var word = heavy ? 'יותר' : 'פחות';
    return {
      type: 'weight', kicker: 'משקל',
      text: 'מה שוקל ' + word + '?',
      spoken: 'מה שוקל ' + word + ': ' + ln + ' או ' + rn + '?',
      html: '',
      input: 'choices',
      choices: [{ v: 'A', sym: left }, { v: 'B', sym: right }],
      answer: ansSide,
      hintHtml: say('חושבים איזה דבר קשה להרים, ואיזה קל להרים.'),
      explainHtml: say((heavy ? 'כבד' : 'קל') + ' יותר: <b>' + (ansSide === 'A' ? left : right) + '</b>.')
    };
  }

  /* ---------- שטח והיקף על רשת ---------- */
  function gridHtml(rows, cols, cut, perim) {
    var cells = '';
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var out = cut && r < cut.r && c >= cols - cut.c;       // פינה שהוסרה (למעלה בצד ימין של הציור)
      cells += '<i class="' + (out ? 'off' : 'on') + '"></i>';
    }
    return '<div class="agrid' + (perim ? ' perim' : '') + '" dir="ltr" style="--cols:' + cols + '" data-rows="' + rows + '" data-cols="' + cols + '">' + cells + '</div>';
  }

  function genArea(stage) {
    var st = clamp(Math.max(2, stage), 2, MAX_STAGE), L = st >= 3 && Math.random() < 0.5, R, C, cut = null, area, lines;
    if (L) {
      R = rnd(3, 4); C = rnd(4, 5);
      cut = { r: rnd(1, R - 1), c: rnd(1, C - 2) };
      area = R * C - cut.r * cut.c;
      var perRow = [];
      for (var r = 0; r < R; r++) perRow.push(r < cut.r ? C - cut.c : C);
      lines = step(perRow.join(' + ') + ' = ' + area);
    } else {
      R = rnd(2, 5); C = rnd(2, 6); area = R * C;
      lines = step(R + ' × ' + C + ' = ' + area);
    }
    return {
      type: 'area', kicker: 'שטח',
      text: 'כמה ריבועים יש בצורה? (כל ריבוע הוא יחידת שטח אחת)',
      spoken: 'כמה ריבועים יש בצורה? כל ריבוע הוא יחידת שטח אחת.',
      html: gridHtml(R, C, cut, false),
      input: 'choices',
      choices: choicesAround(area, 1, 30, shuffle([area + 1, area - 1, R + C, area + C, area - R].filter(function (v) { return v > 0 && v !== area; })).slice(0, 3)),
      answer: area,
      hintHtml: say(L ? 'סופרים כמה ריבועים יש בכל שורה, ומחברים:' : 'יש ' + R + ' שורות, ובכל שורה ' + C + ' ריבועים:') + lines,
      hintSpoken: (L ? 'סופרים כמה ריבועים יש בכל שורה, ומחברים. ' : 'יש ' + h.numWord(R, 'f', true) + ' שורות, ובכל שורה ' + h.numWord(C, 'm', true) + ' ריבועים. ') + Q.richSpeech(lines),
      explainHtml: lines + say('השטח הוא <b>' + area + '</b> יחידות שטח.'),
      explainSpoken: Q.richSpeech(lines) + ' השטח הוא ' + h.numWord(area, 'f') + ' יחידות שטח.'
    };
  }

  function genPerimeter() {
    var R = rnd(2, 5), C = rnd(2, 6), p = 2 * (R + C);
    return {
      type: 'perimeter', kicker: 'היקף',
      text: 'כמה יחידות אורך יש בהיקף? (צלע של ריבוע היא יחידה אחת)',
      spoken: 'כמה יחידות אורך יש בהיקף? צלע של ריבוע היא יחידה אחת.',
      html: gridHtml(R, C, null, true),
      input: 'choices',
      choices: choicesAround(p, 4, 40, shuffle([R * C, R + C, p + 2, p - 2, 2 * R + C].filter(function (v) { return v > 0 && v !== p; })).slice(0, 3)),
      answer: p,
      hintHtml: say('סופרים את הצלעות של הריבועים לאורך הקו החיצון: למעלה ולמטה ' + C + ', ובצדדים ' + R + '.') +
        step(C + ' + ' + R + ' + ' + C + ' + ' + R + ' = ' + p),
      explainHtml: step(C + ' + ' + R + ' + ' + C + ' + ' + R + ' = ' + p) + say('ההיקף הוא <b>' + p + '</b> יחידות אורך.')
    };
  }

  Q.register({
    strand: 'measure',
    generators: { ruler: genRuler, unit: genUnit, weight: genWeight, area: genArea, perimeter: genPerimeter },
    labels: { ruler: 'מדידת אורך', unit: 'יחידות מידה', weight: 'משקל', area: 'שטח', perimeter: 'היקף' },
    howTo: {
      ruler:     { ico: '📏', title: 'מדידת אורך',  line: 'קוראים על הסרגל כמה סנטימטרים אורך החפץ.' },
      unit:      { ico: '📐', title: 'יחידות מידה', line: 'מטר לדברים גדולים, סנטימטר לדברים קטנים.' },
      weight:    { ico: '⚖️', title: 'משקל',        line: 'בוחרים מה שוקל יותר או פחות.' },
      area:      { ico: '🟦', title: 'שטח',         line: 'סופרים כמה ריבועים מכסים את הצורה.' },
      perimeter: { ico: '🔲', title: 'היקף',        line: 'סופרים את הצלעות לאורך הקו החיצון.' }
    },
    typesForStage: function (st) {
      var t = ['ruler', 'unit', 'weight'];
      if (st >= 2) t.push('area');
      if (st >= 3) t.push('perimeter');
      return t;
    }
  });
})(window.MG);
