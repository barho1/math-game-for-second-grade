/* ===================================================================
   core2.js – העמקת חיבור וחיסור (רמות 6-8 של הליבה)
   לפי התוכנית לכיתה ב׳: חיבור וחיסור במאונך מתוך הבנת ערך המקום, אמת ושקר,
   אומדן, חיבור וחיסור כפעולות הפוכות, ובעיות מילוליות מורכבות
   (השוואה, בעיה הפוכה, איסוף, ובעיות בשני צעדים).

   מתי כל סוג נפתח (רמת הליבה):
     6  vertical (מאונך), tf (נכון/לא נכון), inverse (פעולות הפוכות), word2 (בעיות מורכבות)
     7  estimate (אומדן), ובעיות איסוף
     8  בעיות בשני צעדים
   חיבור וחיסור עצמם (רמות 6-8) נמצאים ב-questions.js: bigAddPair ו-bigSubPair.
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp,
      choicesAround = h.choicesAround, numWord = h.numWord, numsToWords = h.numsToWords,
      speakable = h.speakable, OBJECTS = h.OBJECTS, NAMES = h.NAMES;

  var BLANK = '<span class="blank">?</span>';
  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function step(line) { return '<div class="equation step">' + line + '</div>'; }
  function say(text) { return '<p class="q-text">' + text + '</p>'; }
  function att(n, g) { return numWord(n, g, true); }
  function lvl(level) { return clamp(Math.max(6, level), 6, 8); }   // כרטיס ההסבר מציג דוגמה מרמה 1

  /* ---------- זוגות מספרים ---------- */
  function addPair(level) {
    var a, b, g = 0;
    do {
      a = level === 6 ? rnd(12, 88) : rnd(25, 99);
      b = level === 6 ? rnd(11, 100 - a) : rnd(25, 99);
      g++;
    } while (((a % 10) + (b % 10) < 10 || b < 11) && g < 500);
    return (a % 10) + (b % 10) >= 10 ? [a, b] : [47, 38];
  }
  function subPair(level) {
    var a, b, g = 0;
    do {
      a = level === 6 ? rnd(31, 99) : rnd(100, 199);
      b = level === 6 ? rnd(11, a - 1) : rnd(21, 99);
      g++;
    } while (((a % 10) >= (b % 10) || a - b < 10) && g < 500);
    return (a % 10) < (b % 10) ? [a, b] : [83, 46];
  }

  /* ---------- שלבי פתרון בדרך שנלמדת בכיתה (פירוק לפי ערך מקום) ---------- */
  function addSteps(a, b) {
    var ones = (a % 10) + (b % 10), tens = (a - (a % 10)) + (b - (b % 10));
    return step((a % 10) + ' + ' + (b % 10) + ' = ' + ones) +
           step((a - (a % 10)) + ' + ' + (b - (b % 10)) + ' = ' + tens) +
           step(ones + ' + ' + tens + ' = ' + (a + b));
  }
  function subSteps(a, b) {
    // כשיחידות המחוסר גדולות: "שוברים" עשרת אחת. 57 = 40 + 17.
    var borrow = (a % 10) < (b % 10);
    var aT = a - (a % 10) - (borrow ? 10 : 0), aO = (a % 10) + (borrow ? 10 : 0);
    var bT = b - (b % 10), bO = b % 10;
    return step(a + ' = ' + aT + ' + ' + aO) + step(b + ' = ' + bT + ' + ' + bO) +
           step(aT + ' − ' + bT + ' = ' + (aT - bT)) + step(aO + ' − ' + bO + ' = ' + (aO - bO)) +
           step((aT - bT) + ' + ' + (aO - bO) + ' = ' + (a - b));
  }

  /* ---------- חיבור וחיסור במאונך ---------- */
  function vrow(sign, str, width, blankIdx) {
    var cells = '', pad = width - str.length;
    for (var i = 0; i < width; i++) {
      var ch = i < pad ? '' : str[i - pad];
      cells += (blankIdx != null && i - pad === blankIdx) ? '<b class="blank">?</b>' : '<b>' + ch + '</b>';
    }
    return '<div class="vr"><i>' + sign + '</i>' + cells + '</div>';
  }
  /* blank: 'all' = כל ספרות התוצאה חסרות, מספר = ספרה אחת, null = התוצאה מוצגת */
  function vertical(a, b, minus, res, blank) {
    var sa = String(a), sb = String(b), sr = String(res);
    var width = Math.max(sa.length, sb.length, sr.length);
    var resRow;
    if (blank === 'all') {
      resRow = '<div class="vr"><i></i>' + Array.apply(null, Array(width)).map(function (_, i) {
        return i < width - sr.length ? '<b></b>' : '<b class="blank">?</b>';
      }).join('') + '</div>';
    } else resRow = vrow('', sr, width, blank);
    return '<div class="vert" dir="ltr">' + vrow('', sa, width) + vrow(minus ? '−' : '+', sb, width) +
      '<div class="vline"></div>' + resRow + '</div>';
  }

  function genVertical(level, hint) {
    var lv = lvl(level), minus = Math.random() < 0.5;
    var p = minus ? subPair(lv) : addPair(lv), a = p[0], b = p[1], res = minus ? a - b : a + b;
    var steps = minus ? subSteps(a, b) : addSteps(a, b);
    var sign = minus ? '−' : '+', word = minus ? 'חיסור' : 'חיבור';
    var shape = Math.random() < 0.6 || hint ? 'total' : 'digit';

    if (shape === 'digit') {
      var sr = String(res), idx = rnd(0, sr.length - 1), dgt = +sr[idx];
      return {
        type: 'vertical', kicker: word + ' במאונך',
        text: 'איזו ספרה חסרה בתוצאה?',
        spoken: 'איזו ספרה חסרה בתוצאה? ' + numWord(a) + (minus ? ' פחות ' : ' ועוד ') + numWord(b) + '.',
        html: vertical(a, b, minus, res, idx),
        input: 'choices',
        choices: choicesAround(dgt, 0, 9, [dgt + 1, dgt - 1, dgt + 2].filter(function (v) { return v >= 0 && v <= 9 && v !== dgt; })),
        answer: dgt,
        hintHtml: say('פותרים עמודה אחרי עמודה, מהיחידות:') + steps,
        explainHtml: vertical(a, b, minus, res, null) + steps
      };
    }
    // total: מקלדת מספרים בשלב ההתחלה, ובחירה כשצריך עזרה
    return {
      type: 'vertical', kicker: word + ' במאונך',
      text: 'כמה זה בסך הכול?',
      spoken: 'כמה זה ' + numWord(a) + (minus ? ' פחות ' : ' ועוד ') + numWord(b) + '? פותרים עמודה אחרי עמודה.',
      html: vertical(a, b, minus, res, 'all'),
      input: hint ? 'choices' : 'pad',
      choices: hint ? choicesAround(res, 0, 220, shuffle([res + 10, res - 10, res + 1, res - 1].filter(function (v) { return v >= 0; })).slice(0, 3)) : null,
      answer: res,
      hintHtml: say('פותרים עמודה אחרי עמודה, מהיחידות:') + steps,
      explainHtml: eq(a + ' <span>' + sign + '</span> ' + b + ' <span>=</span> <b>' + res + '</b>') + steps
    };
  }

  /* ---------- נכון או לא נכון ---------- */
  var TF = [
    { v: 'T', sym: '✔', label: 'נכון' },
    { v: 'F', sym: '✘', label: 'לא נכון' }
  ];

  function genTf(level) {
    var lv = lvl(level), kind = pick(['add', 'sub', 'family']);
    var truth = Math.random() < 0.5, left, right, real, hintLines, why;
    if (kind === 'add') {
      var pa = addPair(lv), a1 = pa[0], b1 = pa[1];
      real = a1 + b1; left = a1 + ' <span>+</span> ' + b1; hintLines = addSteps(a1, b1);
    } else if (kind === 'sub') {
      var ps = subPair(lv), a2 = ps[0], b2 = ps[1];
      real = a2 - b2; left = a2 + ' <span>−</span> ' + b2; hintLines = subSteps(a2, b2);
    } else {
      // משפחת תרגילים: אם a + b = c אז c − b = a
      var pf = addPair(lv), a3 = pf[0], b3 = pf[1], c3 = a3 + b3;
      real = a3; left = c3 + ' <span>−</span> ' + b3; hintLines = step(a3 + ' + ' + b3 + ' = ' + c3);
    }
    // שגיאות אופייניות: שוכחים את העשרת שעוברת, או טועים באחד
    var wrong = real + pick([-10, 10, -1, 1, 2, -2, 10]);
    if (wrong < 0 || wrong === real) wrong = real + 10;
    right = truth ? real : wrong;
    var shown = left + ' <span>=</span> ' + right;
    return {
      type: 'tf', kicker: 'נכון או לא נכון',
      text: 'האם התרגיל נכון?',
      spoken: 'האם התרגיל נכון? ' + numsToWords(speakable(shown)),
      html: eq(shown),
      input: 'choices',
      choices: TF.map(function (c) { return { v: c.v, sym: c.sym, label: c.label }; }),
      answer: truth ? 'T' : 'F',
      hintHtml: say('מחשבים את הצד השמאלי, ובודקים אם יוצא אותו מספר:') + hintLines,
      explainHtml: eq(left + ' <span>=</span> <b>' + real + '</b>') +
        say(truth ? 'התרגיל נכון.' : 'התרגיל לא נכון: התוצאה הנכונה היא ' + real + ', ולא ' + right + '.')
    };
  }

  /* ---------- אומדן ---------- */
  function round10(n) { return Math.round(n / 10) * 10; }

  function genEstimate(level, hint) {
    var lv = lvl(level);
    return Math.random() < 0.5 ? estimateBench(lv) : estimateWhich(lv);
  }

  /* האם a + b גדול או קטן מ-B, בלי לחשב במדויק */
  function estimateBench(lv) {
    var mode = pick(['bench', 'rounded']), a, b, leftSum, rightText, rightVal, why;
    if (mode === 'rounded') {
      // 18 + 19 ? 20 + 20: מעגלים כלפי מעלה או מטה את שני המחוברים, אותו כיוון
      var up = Math.random() < 0.5;
      do { a = rnd(11, 89); b = rnd(11, 89); } while (a % 10 === 0 || b % 10 === 0 || (a % 10 > 4) !== up || (b % 10 > 4) !== up);
      var ra = up ? a + (10 - a % 10) : a - (a % 10), rb = up ? b + (10 - b % 10) : b - (b % 10);
      leftSum = a + b; rightVal = ra + rb;
      rightText = ra + ' <span>+</span> ' + rb;
      why = [step(a + ' ≈ ' + ra), step(b + ' ≈ ' + rb)];
      return buildBench(a + ' <span>+</span> ' + b, leftSum, rightText, rightVal, why, 'משווים בלי לחשב: כל מחובר בצד שמאל ' + (up ? 'קטן' : 'גדול') + ' מהמחובר שמולו.');
    }
    var B = lv === 6 ? pick([50, 100]) : pick([100, 150, 200]);
    var gap = Math.random() < 0.15 ? 0 : rnd(3, 14) * (Math.random() < 0.5 ? -1 : 1);
    var total = B + gap;
    a = rnd(Math.max(11, total - 99), Math.min(99, total - 11)); b = total - a;
    var ra2 = round10(a), rb2 = round10(b);
    why = [step(a + ' ≈ ' + ra2), step(b + ' ≈ ' + rb2), step(ra2 + ' + ' + rb2 + ' = ' + (ra2 + rb2))];
    return buildBench(a + ' <span>+</span> ' + b, total, String(B), B, why,
      'מעגלים כל מספר לעשרות הקרובות, ובודקים. אם זה קרוב מאוד, מחשבים במדויק.');
  }

  function buildBench(leftHtml, leftVal, rightHtml, rightVal, whyLines, tip) {
    var ans = leftVal > rightVal ? '>' : (leftVal < rightVal ? '<' : '=');
    return {
      type: 'estimate', kicker: 'אומדן',
      text: 'בלי לחשב במדויק: איזה סימן מתאים?',
      spoken: 'בלי לחשב במדויק: איזה סימן מתאים? ' + numsToWords(speakable(leftHtml)) + ' או ' + numsToWords(speakable(rightHtml)) + '?',
      html: eq(leftHtml + ' <span class="slot">?</span> ' + rightHtml),
      input: 'choices',
      choices: shuffle([
        { v: '>', sym: '&gt;', label: 'גדול מ־' },
        { v: '<', sym: '&lt;', label: 'קטן מ־' },
        { v: '=', sym: '=', label: 'שווה ל־' }
      ]),
      answer: ans,
      hintHtml: say(tip) + whyLines.join(''),
      explainHtml: eq(leftHtml + ' <b>' + (ans === '>' ? '&gt;' : ans === '<' ? '&lt;' : '=') + '</b> ' + rightHtml) +
        say(leftVal + ' ' + (ans === '>' ? 'גדול מ' : ans === '<' ? 'קטן מ' : 'שווה ל') + '-' + rightVal + '.')
    };
  }

  /* איזו תוצאה גדולה יותר: שני תרגילים שמתחילים באותו מספר */
  function estimateWhich(lv) {
    var minus = Math.random() < 0.5, base = lv === 6 ? rnd(60, 150) : rnd(100, 300);
    var x = rnd(5, 30), y = x + rnd(2, 9);
    if (Math.random() < 0.5) { var t = x; x = y; y = t; }
    var sign = minus ? '−' : '+';
    var wantBig = Math.random() < 0.7;
    var resX = minus ? base - x : base + x, resY = minus ? base - y : base + y;
    var winner = (resX > resY) === wantBig ? 'A' : 'B';
    var word = wantBig ? 'גדולה' : 'קטנה';
    var rule = minus
      ? 'בשני התרגילים מתחילים באותו מספר. ככל שמחסרים יותר, נשאר פחות.'
      : 'בשני התרגילים מתחילים באותו מספר. ככל שמוסיפים יותר, יוצא יותר.';
    return {
      type: 'estimate', kicker: 'אומדן',
      text: 'בלי לחשב: איזו תוצאה ' + word + ' יותר?',
      spoken: 'בלי לחשב: איזו תוצאה ' + word + ' יותר? ' + 'א, ' + numsToWords(speakable(base + ' ' + sign + ' ' + x)) + '. ב, ' + numsToWords(speakable(base + ' ' + sign + ' ' + y)) + '.',
      html: '<div class="which"><div class="equation"><span class="wl">א</span> ' + base + ' <span>' + sign + '</span> ' + x + '</div>' +
            '<div class="equation"><span class="wl">ב</span> ' + base + ' <span>' + sign + '</span> ' + y + '</div></div>',
      input: 'choices',
      choices: [{ v: 'A', sym: 'א' }, { v: 'B', sym: 'ב' }],
      answer: winner,
      hintHtml: say(rule),
      explainHtml: step(base + ' ' + sign + ' ' + x + ' = ' + resX) + step(base + ' ' + sign + ' ' + y + ' = ' + resY) +
        say('התוצאה ה' + word + ' יותר היא של תרגיל ' + (winner === 'A' ? 'א' : 'ב') + '.')
    };
  }

  /* ---------- פעולות הפוכות ---------- */
  function genInverse(level, hint) {
    var lv = lvl(level), shape = pick(['undo', 'family']);
    if (shape === 'undo') {
      var a = lv === 6 ? rnd(30, 99) : rnd(60, 199), b = rnd(8, Math.min(a - 1, 60)), minus = Math.random() < 0.5;
      var expr = minus ? a + ' <span>−</span> ' + b + ' <span>+</span> ' + b : a + ' <span>+</span> ' + b + ' <span>−</span> ' + b;
      var mid = minus ? a - b : a + b;
      return {
        type: 'inverse', kicker: 'פעולות הפוכות',
        text: 'מה התוצאה? (אפשר בלי לחשב)',
        spoken: 'כמה זה ' + numsToWords(speakable(expr)) + '? אפשר בלי לחשב.',
        html: eq(expr + ' <span>=</span> ' + BLANK),
        input: 'choices',
        choices: choicesAround(a, 0, 260, [mid, a + b, a - b].filter(function (v) { return v !== a && v >= 0; }).slice(0, 3)),
        answer: a,
        hintHtml: say('חיבור וחיסור הפוכים: מה שמוסיפים מורידים, ומה שמורידים מחזירים, ולכן חוזרים לאותו מספר.') +
          step(minus ? a + ' − ' + b + ' = ' + mid : a + ' + ' + b + ' = ' + mid) +
          step(minus ? mid + ' + ' + b + ' = ' + a : mid + ' − ' + b + ' = ' + a),
        explainHtml: eq(expr + ' <span>=</span> <b>' + a + '</b>') + say('חזרנו בדיוק למספר שהתחלנו ממנו.')
      };
    }
    // משפחת תרגילים: נתון תרגיל אחד, מוצאים תרגיל אחר מאותה משפחה
    var p = addPair(lv), x = p[0], y = p[1], z = x + y, mode = pick(['sub1', 'sub2', 'add']);
    var given, ask, ans;
    if (mode === 'sub1') { given = x + ' <span>+</span> ' + y + ' <span>=</span> ' + z; ask = z + ' <span>−</span> ' + x + ' <span>=</span> ' + BLANK; ans = y; }
    else if (mode === 'sub2') { given = x + ' <span>+</span> ' + y + ' <span>=</span> ' + z; ask = z + ' <span>−</span> ' + y + ' <span>=</span> ' + BLANK; ans = x; }
    else { given = z + ' <span>−</span> ' + y + ' <span>=</span> ' + x; ask = x + ' <span>+</span> ' + y + ' <span>=</span> ' + BLANK; ans = z; }
    return {
      type: 'inverse', kicker: 'פעולות הפוכות',
      text: 'משתמשים בתרגיל הראשון כדי לפתור את השני:',
      spoken: 'משתמשים בתרגיל הראשון כדי לפתור את השני. ' + numsToWords(speakable(given)) + '. ' + numsToWords(speakable(ask.replace(BLANK, ' כמה '))) + '?',
      html: eq(given) + eq(ask),
      input: 'choices',
      choices: choicesAround(ans, 0, 220, [ans + 10, ans - 10, ans + 1, ans - 1, x + y].filter(function (v) { return v !== ans && v >= 0; }).slice(0, 3)),
      answer: ans,
      hintHtml: say('שלושת המספרים הם משפחה: ' + x + ', ' + y + ' ו-' + z + '. מי שהכי גדול הוא הסכום.'),
      explainHtml: eq(ask.replace(BLANK, '<b>' + ans + '</b>')) + say('המספרים ' + x + ', ' + y + ' ו-' + z + ' קשורים ביניהם בחיבור ובחיסור.')
    };
  }

  /* ---------- בעיות מורכבות ---------- */
  function genWord2(level, hint) {
    var lv = lvl(level);
    var kinds = lv === 6 ? ['compare', 'reverse'] : lv === 7 ? ['compare', 'reverse', 'combine'] : ['compare', 'reverse', 'combine', 'two'];
    var kind = pick(kinds), p = pick(NAMES), obj = pick(OBJECTS);
    var text, spoken, ans, lines, sentence, extras;

    if (kind === 'compare') {
      var p2 = pick(NAMES.filter(function (x) { return x.n !== p.n; }));
      var more = Math.random() < 0.5, a = rnd(20, 80), b = rnd(5, 19);
      ans = more ? a + b : a - b;
      var cmp = more ? 'יותר' : 'פחות';
      text = 'ל' + p.n + ' יש ' + a + ' ' + obj.n + '. ל' + p2.n + ' יש ' + b + ' ' + obj.n + ' ' + cmp + ' מאשר ל' + p.n + '. כמה ' + obj.n + ' יש ל' + p2.n + '?';
      spoken = 'ל' + p.n + ' יש ' + att(a, obj.g) + ' ' + obj.n + '. ל' + p2.n + ' יש ' + att(b, obj.g) + ' ' + obj.n + ' ' + cmp + ' מאשר ל' + p.n +
        '. כמה ' + obj.n + ' יש ל' + p2.n + '?';
      lines = step(a + (more ? ' + ' : ' − ') + b + ' = ' + ans);
      sentence = 'ל' + p2.n + ' יש <b>' + ans + '</b> ' + obj.n + '.';
      extras = [more ? a - b : a + b, ans + 1, ans - 1];
    } else if (kind === 'reverse') {
      var sumMode = Math.random() < 0.6;
      if (sumMode) {
        var S = rnd(30, 100), A = rnd(10, S - 5); ans = S - A;
        text = 'סכום שני מספרים הוא ' + S + '. אחד מהם הוא ' + A + '. מהו המספר השני?';
        spoken = 'סכום שני מספרים הוא ' + numWord(S) + '. אחד מהם הוא ' + numWord(A) + '. מהו המספר השני?';
        lines = step(A + ' + ' + BLANK + ' = ' + S) + step(S + ' − ' + A + ' = ' + ans);
        extras = [S + A, ans + 1, ans - 1];
      } else {
        var Big = rnd(40, 100), D = rnd(8, 30); ans = Big - D;
        text = 'ההפרש בין שני מספרים הוא ' + D + '. המספר הגדול הוא ' + Big + '. מהו המספר הקטן?';
        spoken = 'ההפרש בין שני מספרים הוא ' + numWord(D) + '. המספר הגדול הוא ' + numWord(Big) + '. מהו המספר הקטן?';
        lines = step(Big + ' − ' + BLANK + ' = ' + D) + step(Big + ' − ' + D + ' = ' + ans);
        extras = [Big + D, ans + 1, ans - 1];
      }
      sentence = 'המספר השני הוא <b>' + ans + '</b>.';
    } else if (kind === 'combine') {
      if (Math.random() < 0.5) {
        var k1 = rnd(3, 25), k2 = rnd(3, 25), k3 = rnd(3, 25); ans = k1 + k2 + k3;
        text = 'אימא קנתה ' + k1 + ' ק"ג תפוחים, ' + k2 + ' ק"ג אגסים ו-' + k3 + ' ק"ג בננות. כמה ק"ג פירות קנתה?';
        spoken = 'אימא קנתה ' + att(k1, 'm') + ' קילו תפוחים, ' + att(k2, 'm') + ' קילו אגסים ו' + att(k3, 'm') + ' קילו בננות. כמה קילו פירות קנתה?';
        lines = step(k1 + ' + ' + k2 + ' + ' + k3 + ' = ' + ans);
        sentence = 'אימא קנתה בסך הכול <b>' + ans + '</b> ק"ג פירות.';
        extras = [k1 + k2, ans + 10, ans - 10];
      } else {
        var m0 = rnd(50, 100), m1 = rnd(8, 25), m2 = rnd(8, 25); ans = m0 - m1 - m2;
        var she = p.f;
        text = 'ל' + p.n + ' היו ' + m0 + ' שקלים. ' + (she ? 'היא קנתה' : 'הוא קנה') + ' מחברת ב-' + m1 + ' שקלים וגם עט ב-' + m2 + ' שקלים. כמה שקלים נשארו ' + (she ? 'לה' : 'לו') + '?';
        spoken = 'ל' + p.n + ' היו ' + att(m0, 'm') + ' שקלים. ' + (she ? 'היא קנתה' : 'הוא קנה') + ' מחברת ב' + att(m1, 'm') + ' שקלים וגם עט ב' + att(m2, 'm') + ' שקלים. כמה שקלים נשארו ' + (she ? 'לה' : 'לו') + '?';
        lines = step(m1 + ' + ' + m2 + ' = ' + (m1 + m2)) + step(m0 + ' − ' + (m1 + m2) + ' = ' + ans);
        sentence = 'נשארו <b>' + ans + '</b> שקלים.';
        extras = [m0 - m1, m0 - m2, ans + 10];
      }
    } else {
      var s0 = rnd(30, 70), g1 = rnd(10, 30), t1 = rnd(10, Math.min(40, s0 + g1 - 5)); ans = s0 + g1 - t1;
      var s = p.f;
      text = 'ל' + p.n + ' היו ' + s0 + ' ' + obj.n + '. ' + (s ? 'היא קיבלה' : 'הוא קיבל') + ' עוד ' + g1 + ', ואז ' + (s ? 'נתנה' : 'נתן') + ' ' + t1 + ' לחבר. כמה נשארו?';
      spoken = 'ל' + p.n + ' היו ' + att(s0, obj.g) + ' ' + obj.n + '. ' + (s ? 'היא קיבלה' : 'הוא קיבל') + ' עוד ' + numWord(g1, obj.g, false) + ', ואז ' + (s ? 'נתנה' : 'נתן') + ' ' + numWord(t1, obj.g, false) + ' לחבר. כמה נשארו?';
      lines = step(s0 + ' + ' + g1 + ' = ' + (s0 + g1)) + step((s0 + g1) + ' − ' + t1 + ' = ' + ans);
      sentence = 'נשארו <b>' + ans + '</b> ' + obj.n + '.';
      extras = [s0 + g1, s0 - t1, ans + 10];
    }
    extras = extras.filter(function (v) { return v >= 0 && v !== ans; }).slice(0, 3);
    return {
      type: 'word2', kicker: 'בעיה מורכבת',
      text: text, spoken: spoken,
      html: '<div class="visual" style="font-size:2.6rem">' + (kind === 'combine' ? '🛒' : kind === 'reverse' ? '🔢' : obj.e) + '</div>',
      input: 'choices',
      choices: choicesAround(ans, 0, 250, extras),
      answer: ans,
      hintHtml: say('מחליטים אילו פעולות צריך, ובאיזה סדר:') + lines,
      explainHtml: lines + say(sentence)
    };
  }

  /* ---------- רישום ---------- */
  Q.registerCore({
    generators: { vertical: genVertical, tf: genTf, estimate: genEstimate, inverse: genInverse, word2: genWord2 },
    minLevel: { vertical: 6, tf: 6, inverse: 6, word2: 6, estimate: 7 },
    labels: {
      vertical: 'חיבור וחיסור במאונך', tf: 'נכון או לא נכון', estimate: 'אומדן',
      inverse: 'פעולות הפוכות', word2: 'בעיות מורכבות'
    },
    howTo: {
      vertical: { ico: '🧮', title: 'חיבור וחיסור במאונך', line: 'פותרים עמודה אחרי עמודה, מהיחידות.' },
      tf:       { ico: '✅', title: 'נכון או לא נכון',     line: 'בודקים אם התרגיל נכון.' },
      estimate: { ico: '🎯', title: 'אומדן',               line: 'מעריכים בלי לחשב במדויק.' },
      inverse:  { ico: '🔄', title: 'פעולות הפוכות',       line: 'חיבור וחיסור מבטלים זה את זה.' },
      word2:    { ico: '📚', title: 'בעיה מורכבת',         line: 'קוראים את הסיפור ובוחרים אילו פעולות צריך.' }
    }
  });
})(window.MG);
