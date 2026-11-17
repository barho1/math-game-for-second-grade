/* ===================================================================
   geometry.js – נתיב גאומטריה
   לפי תוכנית הלימודים לכיתה ב׳ (מצולעים וגופים; שיקוף והזזה): זיהוי צורות
   וגופים (קובייה, תיבה, גליל, פירמידה, חרוט, כדור), המונחים פאה, צלע וקדקוד,
   סימטריה, שיקוף והזזה של צורה על רשת.

   שלבים 1..3:
     1  זיהוי גופים וצורות שטוחות, ומה בעולם דומה לגוף
     2  גם תיבה ופירמידה, וסימטריה
     3  פאות, צלעות וקדקודים של גופים, שיקוף והזזה
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp, choicesAround = h.choicesAround;
  var MAX_STAGE = 3;

  function say(t) { return '<p class="q-text">' + t + '</p>'; }
  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }

  /* ---------- גופים (SVG) ---------- */
  var SOLIDS = {
    cube:     { n: 'קובייה',  f: 6, v: 8, e: 12, feat: 'כל הפאות שלה ריבועים שווים.' },
    cuboid:   { n: 'תיבה',    f: 6, v: 8, e: 12, feat: 'הפאות שלה מלבנים, כמו בקופסה.' },
    cylinder: { n: 'גליל',    feat: 'יש לו שתי פאות עגולות ושטח מעוגל באמצע, כמו קופסת שימורים.' },
    cone:     { n: 'חרוט',    feat: 'יש לו בסיס עגול וקצה מחודד, כמו גביע גלידה.' },
    pyramid:  { n: 'פירמידה', f: 5, v: 5, e: 8, feat: 'יש לה בסיס, ומשולשים שנפגשים בקצה מחודד.' },
    sphere:   { n: 'כדור',    feat: 'הוא עגול מכל הכיוונים, ואין לו פאות שטוחות.' }
  };
  var STROKE = 'stroke="#3b2a5a" stroke-width="2" stroke-linejoin="round"';
  var C1 = '#7aa7ff', C2 = '#a9c6ff', C3 = '#5b86e6';

  function solidSvg(kind, size) {
    var body = '';
    if (kind === 'cube') body =
      '<polygon points="20,40 60,40 60,80 20,80" fill="' + C1 + '" ' + STROKE + '/>' +
      '<polygon points="20,40 40,20 80,20 60,40" fill="' + C2 + '" ' + STROKE + '/>' +
      '<polygon points="60,40 80,20 80,60 60,80" fill="' + C3 + '" ' + STROKE + '/>';
    else if (kind === 'cuboid') body =
      '<polygon points="8,48 68,48 68,82 8,82" fill="' + C1 + '" ' + STROKE + '/>' +
      '<polygon points="8,48 28,28 88,28 68,48" fill="' + C2 + '" ' + STROKE + '/>' +
      '<polygon points="68,48 88,28 88,62 68,82" fill="' + C3 + '" ' + STROKE + '/>';
    else if (kind === 'cylinder') body =
      '<path d="M22 28 L22 74 A28 10 0 0 0 78 74 L78 28 Z" fill="' + C1 + '" ' + STROKE + '/>' +
      '<ellipse cx="50" cy="28" rx="28" ry="10" fill="' + C2 + '" ' + STROKE + '/>';
    else if (kind === 'cone') body =
      '<path d="M20 74 L50 14 L80 74 A30 10 0 0 1 20 74 Z" fill="' + C1 + '" ' + STROKE + '/>';
    else if (kind === 'pyramid') body =
      '<polygon points="14,72 56,80 50,14" fill="' + C1 + '" ' + STROKE + '/>' +
      '<polygon points="56,80 88,60 50,14" fill="' + C3 + '" ' + STROKE + '/>';
    else body =
      '<defs><radialGradient id="sg" cx="38%" cy="32%"><stop offset="0" stop-color="#d7e5ff"/><stop offset="1" stop-color="' + C3 + '"/></radialGradient></defs>' +
      '<circle cx="50" cy="50" r="33" fill="url(#sg)" ' + STROKE + '/>';
    return '<svg class="solid" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" data-kind="' + kind + '" role="img" aria-label="' + SOLIDS[kind].n + '">' + body + '</svg>';
  }
  function nameChoice(k) { return { v: k, sym: '<span class="gname">' + SOLIDS[k].n + '</span>' }; }

  function genSolid(stage) {
    var st = clamp(stage, 1, MAX_STAGE), pool = st <= 1 ? ['cube', 'sphere', 'cylinder', 'cone'] : Object.keys(SOLIDS);
    var ans = pick(pool), opts = [ans];
    shuffle(pool).forEach(function (k) { if (opts.length < 4 && opts.indexOf(k) < 0) opts.push(k); });
    return {
      type: 'solid', kicker: 'גופים',
      text: 'איזה גוף זה?',
      spoken: 'איזה גוף זה?',
      html: '<div class="solid-wrap">' + solidSvg(ans, 170) + '</div>',
      input: 'choices',
      choices: shuffle(opts).map(nameChoice),
      answer: ans,
      hintHtml: say('מסתכלים על הפאות ועל הצורה: ' + SOLIDS[ans].feat),
      explainHtml: say('זה <b>' + SOLIDS[ans].n + '</b>. ' + SOLIDS[ans].feat)
    };
  }

  /* ---------- מה בעולם דומה לגוף ---------- */
  var OBJS = [
    { e: '🎲', phrase: 'קובייה של משחק', k: 'cube' }, { e: '📦', phrase: 'קופסה', k: 'cuboid' },
    { e: '🥫', phrase: 'קופסת שימורים', k: 'cylinder' }, { e: '🍦', phrase: 'גביע של גלידה', k: 'cone' },
    { e: '⚽', phrase: 'כדורגל', k: 'sphere' }
  ];
  function genObjSolid(stage) {
    var o = pick(OBJS), opts = [o.k];
    shuffle(OBJS.map(function (x) { return x.k; })).forEach(function (k) { if (opts.length < 4 && opts.indexOf(k) < 0) opts.push(k); });
    return {
      type: 'objsolid', kicker: 'גופים בעולם',
      text: 'לאיזה גוף דומה ' + o.phrase + '?',
      spoken: 'לאיזה גוף דומה ' + o.phrase + '?',
      html: '<div class="visual" style="font-size:3.4rem">' + o.e + '</div>',
      input: 'choices',
      choices: shuffle(opts).map(nameChoice),
      answer: o.k,
      hintHtml: say('חושבים על הצורה של החפץ: ' + SOLIDS[o.k].feat),
      explainHtml: say(o.phrase + ' דומה ל<b>' + SOLIDS[o.k].n + '</b>.')
    };
  }

  /* ---------- צורות שטוחות ---------- */
  var SHAPES = {
    triangle:  { n: 'משולש', s: 3, svg: '<polygon points="50,14 88,80 12,80" fill="' + C1 + '" ' + STROKE + '/>' },
    square:    { n: 'ריבוע', s: 4, svg: '<rect x="22" y="22" width="56" height="56" fill="' + C1 + '" ' + STROKE + '/>' },
    rectangle: { n: 'מלבן',  s: 4, svg: '<rect x="10" y="30" width="80" height="42" fill="' + C1 + '" ' + STROKE + '/>' },
    circle:    { n: 'עיגול', s: 0, svg: '<circle cx="50" cy="50" r="34" fill="' + C1 + '" ' + STROKE + '/>' }
  };
  function shapeSvg(kind, size) {
    return '<svg class="shape2d" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" data-kind="' + kind + '" role="img" aria-label="' + SHAPES[kind].n + '">' + SHAPES[kind].svg + '</svg>';
  }
  function genShape(stage) {
    var kind = pick(Object.keys(SHAPES)), sp = SHAPES[kind];
    if (Math.random() < 0.5) {
      var keys = Object.keys(SHAPES);
      return {
        type: 'shape', kicker: 'צורות',
        text: 'איזו צורה זו?', spoken: 'איזו צורה זו?',
        html: '<div class="solid-wrap">' + shapeSvg(kind, 150) + '</div>',
        input: 'choices',
        choices: shuffle(keys).map(function (k) { return { v: k, sym: '<span class="gname">' + SHAPES[k].n + '</span>' }; }),
        answer: kind,
        hintHtml: say(kind === 'square' ? 'לריבוע ארבע צלעות שוות.' : kind === 'rectangle' ? 'למלבן ארבע צלעות, והארוכות מול הקצרות.' : kind === 'triangle' ? 'למשולש שלוש צלעות.' : 'לעיגול אין פינות ואין צלעות ישרות.'),
        explainHtml: say('זה <b>' + sp.n + '</b>.')
      };
    }
    return {
      type: 'shape', kicker: 'צורות',
      text: 'כמה צלעות יש לצורה?', spoken: 'כמה צלעות יש לצורה?',
      html: '<div class="solid-wrap">' + shapeSvg(kind, 150) + '</div>',
      input: 'choices',
      choices: choicesAround(sp.s, 0, 5, [0, 3, 4, 5].filter(function (v) { return v !== sp.s; })).map(function (c) { return { v: c.v, sym: c.sym }; }),
      answer: sp.s,
      hintHtml: say('צלע היא קו ישר שמקיף את הצורה. סופרים את הקווים הישרים.'),
      explainHtml: say(sp.s === 0 ? 'לעיגול אין צלעות.' : 'ל' + sp.n + ' יש <b>' + sp.s + '</b> צלעות.')
    };
  }

  /* ---------- רשתות: סימטריה, שיקוף והזזה ---------- */
  function gStr(g) { return g.map(function (r) { return r.join(''); }).join('/'); }
  function gridHtml(g, cls) {
    var rows = g.length, cols = g[0].length, cells = '';
    g.forEach(function (r) { r.forEach(function (c) { cells += '<i class="' + (c ? 'on' : 'off') + '"></i>'; }); });
    return '<div class="mg ' + (cls || '') + '" dir="ltr" style="--cols:' + cols + '" data-g="' + gStr(g) + '">' + cells + '</div>';
  }
  function mirror(g) { return g.map(function (r) { return r.slice().reverse(); }); }
  function vflip(g) { return g.slice().reverse().map(function (r) { return r.slice(); }); }
  function rot180(g) { return vflip(mirror(g)); }
  function same(a, b) { return gStr(a) === gStr(b); }
  function randGrid(rows, cols, lo, hi) {
    var g, n, guard = 0;
    do {
      g = []; n = 0;
      for (var r = 0; r < rows; r++) { g.push([]); for (var c = 0; c < cols; c++) { var v = Math.random() < 0.5 ? 1 : 0; g[r].push(v); n += v; } }
      guard++;
    } while ((n < lo || n > hi) && guard < 500);
    return g;
  }
  function isSym(g) { return same(g, mirror(g)); }

  function genSymmetry() {
    var sym = randGrid(3, 3, 4, 7), r;
    sym = sym.map(function (row) { return [row[0], row[1], row[0]]; });
    var cnt = sym.reduce(function (a, row) { return a + row[0] + row[1]; }, 0);
    var guard = 0;
    while ((cnt < 3 || cnt > 5) && guard++ < 200) { sym = randGrid(3, 3, 3, 8).map(function (row) { return [row[0], row[1], row[0]]; }); cnt = sym.reduce(function (a, row) { return a + row[0] + row[1]; }, 0); }
    var sets = [sym], tries = 0;
    while (sets.length < 4 && tries++ < 400) {
      var g = randGrid(3, 3, 4, 7);
      if (!isSym(g) && sets.every(function (o) { return !same(o, g); })) sets.push(g);
    }
    var order = shuffle([0, 1, 2, 3]), ids = ['A', 'B', 'C', 'D'];
    return {
      type: 'symmetry', kicker: 'סימטריה',
      text: 'איזו צורה סימטרית? (אפשר לקפל לאורך הקו המקווקו, והצדדים זהים)',
      spoken: 'איזו צורה סימטרית? אפשר לקפל אותה לאורך הקו המקווקו, והצדדים זהים.',
      html: '',
      input: 'choices',
      choices: order.map(function (k, pos) { return { v: ids[pos], sym: gridHtml(sets[k], 'sm mid') }; }),
      answer: ids[order.indexOf(0)],
      hintHtml: say('מקפלים את הצורה באמצע: הצד הימני צריך ליפול בדיוק על הצד השמאלי.'),
      explainHtml: say('בצורה הנכונה שני הצדדים של הקו המקווקו זהים, ולכן היא סימטרית.') + gridHtml(sym, 'sm mid')
    };
  }

  function genReflect() {
    var P, M, wrong, g = 0;
    do {
      P = randGrid(3, 3, 4, 6); M = mirror(P);
      wrong = [P, vflip(P), rot180(P)];
      g++;
    } while ((same(P, M) || wrong.some(function (w) { return same(w, M); }) ||
              same(P, wrong[1]) || same(P, wrong[2]) || same(wrong[1], wrong[2])) && g < 800);
    var sets = [M].concat(wrong), order = shuffle([0, 1, 2, 3]), ids = ['A', 'B', 'C', 'D'];
    return {
      type: 'reflect', kicker: 'שיקוף',
      text: 'איזו צורה היא השיקוף של הצורה, כמו במראה שבקו המקווקו?',
      spoken: 'איזו צורה היא השיקוף של הצורה, כמו במראה שבקו המקווקו?',
      html: '<div class="mirror-row" dir="ltr">' + gridHtml(P, 'big') + '<span class="mline"></span><span class="mq">?</span></div>',
      input: 'choices',
      choices: order.map(function (k, pos) { return { v: ids[pos], sym: gridHtml(sets[k], 'sm') }; }),
      answer: ids[order.indexOf(0)],
      hintHtml: say('במראה מה שבצד אחד של הקו מופיע בצד השני, הפוך: מה שהיה קרוב לקו נשאר קרוב לקו.'),
      explainHtml: say('בשיקוף כל שורה מתהפכת: הימין הופך לשמאל.') + gridHtml(M, 'sm')
    };
  }

  function genTranslate() {
    var shape = [[1, 0], [1, 1]], dx = rnd(1, 2), dy = rnd(1, 2), r0 = rnd(0, 1), c0 = rnd(0, 1);
    if (Math.random() < 0.5) shape = [[1, 1], [0, 1]];
    function board(r, c) {
      var g = [];
      for (var i = 0; i < 5; i++) { g.push([0, 0, 0, 0, 0]); }
      shape.forEach(function (row, i) { row.forEach(function (v, j) { if (v) g[r + i][c + j] = 1; }); });
      return g;
    }
    var pos = [[r0 + dy, c0 + dx], [r0 + dx, c0 + dy], [r0, c0 + dx], [r0 + dy, c0]];
    var keys = [], sets = [];
    pos.forEach(function (p) {
      var k = p.join(',');
      if (keys.indexOf(k) < 0 && p[0] >= 0 && p[1] >= 0 && p[0] <= 3 && p[1] <= 3) { keys.push(k); sets.push(board(p[0], p[1])); }
    });
    // לא מצליחים לייצר ארבעה מסיחים שונים: מוסיפים מיקומים אחרים בלוח
    for (var r = 0; sets.length < 4 && r < 4; r++) for (var c = 0; sets.length < 4 && c < 4; c++) {
      var k2 = r + ',' + c;
      if (keys.indexOf(k2) < 0) { keys.push(k2); sets.push(board(r, c)); }
    }
    var order = shuffle([0, 1, 2, 3]), ids = ['A', 'B', 'C', 'D'];
    var stepsRight = dx === 1 ? 'צעד אחד ימינה' : 'שני צעדים ימינה', stepsDown = dy === 1 ? 'צעד אחד למטה' : 'שני צעדים למטה';
    return {
      type: 'translate', kicker: 'הזזה',
      text: 'מזיזים את הצורה ' + dx + ' ימינה ו-' + dy + ' למטה. איזה לוח נכון?',
      spoken: 'מזיזים את הצורה ' + stepsRight + ' ו' + stepsDown + '. איזה לוח נכון?',
      html: '<div class="mirror-row" dir="ltr">' + gridHtml(board(r0, c0), 'big') + '</div>',
      input: 'choices',
      choices: order.map(function (k, pos2) { return { v: ids[pos2], sym: gridHtml(sets[k], 'sm') }; }),
      answer: ids[order.indexOf(0)],
      hintHtml: say('בהזזה הצורה לא מתהפכת ולא מסתובבת, רק עוברת למקום אחר. סופרים ' + stepsRight + ' ואחר כך ' + stepsDown + '.'),
      hintSpoken: 'בהזזה הצורה לא מתהפכת ולא מסתובבת, רק עוברת למקום אחר. סופרים ' + stepsRight + ' ואחר כך ' + stepsDown + '.',
      explainHtml: say('הצורה זזה ' + dx + ' ימינה ו-' + dy + ' למטה, וכל התאים שלה זזו יחד.') + gridHtml(sets[0], 'sm'),
      explainSpoken: 'הצורה זזה ' + stepsRight + ' ו' + stepsDown + ', וכל התאים שלה זזו יחד.'
    };
  }

  /* ---------- פאות, צלעות וקדקודים ---------- */
  function genParts3d() {
    var kind = pick(['cube', 'cuboid', 'pyramid']), part = pick([['f', 'פאות'], ['v', 'קדקודים'], ['e', 'צלעות']]);
    var ans = SOLIDS[kind][part[0]];
    var def = part[0] === 'f' ? 'פאה היא משטח שטוח של הגוף.' : part[0] === 'e' ? 'צלע היא הקו שבו נפגשות שתי פאות.' : 'קדקוד הוא הנקודה שבה נפגשות כמה צלעות.';
    var noun = kind === 'pyramid' ? 'פירמידה' : SOLIDS[kind].n;
    return {
      type: 'parts3d', kicker: 'פאות, צלעות וקדקודים',
      text: 'כמה ' + part[1] + ' יש ל' + noun + (kind === 'pyramid' ? ' ריבועית' : '') + '?',
      spoken: 'כמה ' + part[1] + ' יש ל' + noun + (kind === 'pyramid' ? ' ריבועית' : '') + '?',
      html: '<div class="solid-wrap">' + solidSvg(kind, 150) + '</div>',
      input: 'choices',
      choices: choicesAround(ans, 3, 14, shuffle([ans + 1, ans - 1, ans + 2, ans - 2, 6, 8, 12].filter(function (v) { return v !== ans && v >= 3; })).slice(0, 3)),
      answer: ans,
      hintHtml: say(def) + say('סופרים אחד אחד, ומסמנים בראש כדי לא לספור פעמיים.'),
      explainHtml: say('ל' + noun + (kind === 'pyramid' ? ' ריבועית' : '') + ' יש <b>' + ans + '</b> ' + part[1] + '.') + say(def)
    };
  }

  Q.register({
    strand: 'geometry',
    generators: { solid: genSolid, objsolid: genObjSolid, shape: genShape, symmetry: genSymmetry, reflect: genReflect, translate: genTranslate, parts3d: genParts3d },
    labels: { solid: 'גופים', objsolid: 'גופים בעולם', shape: 'צורות', symmetry: 'סימטריה', reflect: 'שיקוף', translate: 'הזזה', parts3d: 'פאות, צלעות וקדקודים' },
    howTo: {
      solid:     { ico: '🧊', title: 'גופים',                line: 'מזהים גוף: קובייה, תיבה, גליל, חרוט, פירמידה או כדור.' },
      objsolid:  { ico: '🥫', title: 'גופים בעולם',          line: 'מוצאים לאיזה גוף דומה חפץ מהחיים.' },
      shape:     { ico: '🔺', title: 'צורות',                line: 'מזהים צורות ומונים את הצלעות שלהן.' },
      symmetry:  { ico: '🦋', title: 'סימטריה',              line: 'צורה סימטרית אפשר לקפל לשני חצאים זהים.' },
      reflect:   { ico: '🪞', title: 'שיקוף',                line: 'כמו במראה: הצד הימני נהיה שמאלי.' },
      translate: { ico: '➡️', title: 'הזזה',                 line: 'הצורה עוברת למקום אחר, בלי להסתובב.' },
      parts3d:   { ico: '📐', title: 'פאות, צלעות וקדקודים', line: 'סופרים את החלקים של הגוף.' }
    },
    typesForStage: function (st) {
      var t = ['solid', 'objsolid', 'shape'];
      if (st >= 2) t.push('symmetry');
      if (st >= 3) t = t.concat(['parts3d', 'reflect', 'translate']);
      return t;
    }
  });
})(window.MG);
