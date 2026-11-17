/* ===================================================================
   mult.js – נתיב כפל וחילוק
   לפי תוכנית הלימודים לכיתה ב׳: כפל כקבוצות שוות, חילוק בלי שארית (לחלקים
   ולהכלה), לוח הכפל עד 6×6 לכולם ועד 10×10 למתקדמים, סימני התחלקות ב-2, 5, 10
   וסוגריים. הרמזים נשענים על האסטרטגיות מהתוכנית: חילוף (7×3 = 3×7),
   פירוק (6×7 = 5×7 + 7) וספירה בקפיצות.

   שלבים 1..6 (השלב מתקדם לבד, ראו adaptiveUpdate ב-app.js):
     1  ×2 ו-×10, ×0 ו-×1, עם מערכים
     2  ×5, וחילוק ב-2, 5, 10 כהפך של כפל
     3  ×3, ×4, בעיות של קבוצות שוות, חילוק לחלקים, גורם חסר
     4  כל הלוח עד 6×6, הקלדה במקום בחירה, סימני התחלקות, חילוק הכלה
     5  גם 7 עד 10
     6  לוח הכפל המלא, גם בשילוב, וסוגריים
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp, row = h.row,
      choicesAround = h.choicesAround, numWord = h.numWord, numsToWords = h.numsToWords,
      speakable = h.speakable, OBJECTS = h.OBJECTS;

  var MAX_STAGE = 6;
  /* סימן החילוק בספרי הלימוד בישראל הוא נקודתיים. ה-span נחוץ להקראה ("חלקי"). */
  var DIV = '<span class="div">:</span>';
  var BLANK = '<span class="blank">?</span>';

  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function step(line) { return '<div class="equation step">' + line + '</div>'; }
  function say(text) { return '<p class="q-text">' + text + '</p>'; }
  function att(n, g) { return numWord(n, g, true); }       // צמוד לשם העצם: "שתי עוגיות"
  function seq(stepBy, count) {                             // 5, 10, 15, ...
    var out = [];
    for (var i = 1; i <= count; i++) out.push(stepBy * i);
    return out.join(', ');
  }

  /* ---------- בחירת מספרים לפי שלב ---------- */

  /* t = מספר הלוח, o = הגורם השני. t נבחר מהלוחות שפתוחים בשלב. */
  function partsFor(st) {
    var t, o;
    if (st <= 1) { t = pick([2, 10]); o = rnd(1, 5); }
    else if (st === 2) { t = pick([2, 5, 10]); o = rnd(1, 10); }
    else if (st === 3) { t = pick([2, 3, 4, 5, 10]); o = rnd(1, 10); }
    else if (st === 4) {
      if (Math.random() < 0.35) { t = pick([2, 5, 10]); o = rnd(1, 10); }
      else { t = rnd(2, 6); o = rnd(2, 6); }
    } else {
      // בלוח המלא הכי קשה לזכור 6 עד 9, ולכן הם מקבלים יותר מקום
      if (Math.random() < 0.6) { t = pick([6, 7, 8, 9]); o = rnd(2, 10); }
      else { t = rnd(2, 10); o = rnd(2, 10); }
    }
    // אפס ואחד הם תכונות שכדאי להכיר, בעיקר בשלבים הראשונים
    if (st <= 2 && Math.random() < 0.12) o = pick([0, 1]);
    return { t: t, o: o };
  }

  function pairFor(st) {
    var p = partsFor(st);
    return Math.random() < 0.5 ? [p.t, p.o] : [p.o, p.t];
  }

  /* שני גורמים שאינם 0 או 1 – לתרגילי חסר, מערכים וסיפורים */
  function partsNZ(st) {
    var p, guard = 0;
    do { p = partsFor(st); } while ((p.t < 2 || p.o < 2) && guard++ < 300);
    if (p.t < 2 || p.o < 2) p = { t: 2, o: 3 };
    return p;
  }
  function pairNZ(st) {
    var p = partsNZ(st);
    return Math.random() < 0.5 ? [p.t, p.o] : [p.o, p.t];
  }

  /* מחלק ומנה לחילוק בלי שארית. בשלבים גבוהים גם הגורם השני יכול להיות המחלק. */
  function divParts(st) {
    var p = partsNZ(st);
    var swap = st >= 4 && Math.random() < 0.5;
    var d = swap ? p.o : p.t, q = swap ? p.t : p.o;
    return { d: d, q: q, a: d * q };
  }

  /* ---------- תצוגות ---------- */

  /* מערך: rows שורות, cols עמודות. הגודל קטן ככל שיש יותר פריטים, כדי שייכנס במסך */
  function arrayGrid(rows, cols, emoji) {
    var n = rows * cols;
    if (!n) return '';
    var size = n <= 20 ? 's-big' : (n <= 50 ? 's-mid' : 's-small');
    var cells = '';
    for (var i = 0; i < n; i++) cells += '<span>' + emoji + '</span>';
    return '<div class="array ' + size + '" style="--cols:' + cols + '">' + cells + '</div>';
  }

  /* חלוקה לקבוצות: groups קבוצות של size פריטים */
  function groupsVisual(groups, size, emoji) {
    var s = '<div class="visual groups">';
    for (var i = 0; i < groups; i++) s += '<span class="grp bundle">' + row(size, emoji) + '</span>';
    return s + '</div>';
  }

  /* ---------- אסטרטגיות לרמזים (מהתוכנית: חילוף, פירוק, ספירה בקפיצות) ---------- */
  function strategy(a, b) {
    var big = Math.max(a, b), small = Math.min(a, b);
    if (a === 0 || b === 0) return say('כל מספר כפול 0 הוא 0: אין קבוצות, ולכן אין כלום.');
    if (a === 1 || b === 1) return say('כפול 1 זו קבוצה אחת, ולכן נשאר אותו מספר.');
    if (small === 2) return say('כפול 2 זה פעמיים אותו מספר:') + step(big + ' + ' + big + ' = ' + big * 2);
    if (small === 10 || big === 10) {
      var n10 = small === 10 ? big : small;
      return say(n10 + ' עשרות הן ' + n10 * 10 + '.') + step(seq(10, n10));
    }
    if (small === 5 || big === 5) {
      var n5 = small === 5 ? big : small;
      return say('סופרים בחמישיות, ' + n5 + ' פעמים:') + step(seq(5, n5));
    }
    if (big >= 6) {
      // פירוק: 6×7 = 5×7 + 7
      var five = 5 * small, rest = big - 5;
      var lines = step('5 × ' + small + ' = ' + five);
      lines += rest === 1
        ? step(five + ' + ' + small + ' = ' + (five + small))
        : step(rest + ' × ' + small + ' = ' + rest * small) + step(five + ' + ' + rest * small + ' = ' + (five + rest * small));
      return say('אפשר לפרק: ' + big + ' זה 5 ועוד ' + rest + '.') + lines;
    }
    return say('סופרים בקפיצות של ' + big + ', ' + small + ' פעמים:') + step(seq(big, small));
  }

  /* רמז לחילוק: כמה פעמים d נכנס ב-a */
  function divHint(a, d, q, emoji) {
    return say('חילוק הוא ההפך מכפל. בודקים כמה פעמים ' + d + ' נכנס ב-' + a + ', בקפיצות של ' + d + ':') +
      step(seq(d, q)) +
      (q <= 6 && a <= 30 ? groupsVisual(q, d, emoji) : '');
  }

  function spokenEq(html) {
    return numsToWords(speakable(html.replace(BLANK, ' כמה ')));
  }

  /* ---------- כפל ---------- */
  /* מסיחים אופייניים: טעות של גורם אחד ("שכנים" בלוח הכפל) וחיבור במקום כפל.
     choicesAround מוסיף את כולם, ולכן נותנים לו שלושה בדיוק. */
  function multChoices(a, b, ans) {
    var near = shuffle([(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), a + b]).slice(0, 3);
    return choicesAround(ans, 0, Math.max(ans + 10, 30), near);
  }

  function genMult(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE), obj = pick(OBJECTS);
    var r = Math.random(), shape = 'eq';
    if (st <= 3 && r < 0.25) shape = 'array';
    else if (st >= 3 && r > 0.7) shape = 'missing';

    if (shape === 'missing') return multMissing(st, hint, obj);

    var p = shape === 'array' ? pairNZ(st) : pairFor(st);
    var a = p[0], b = p[1], ans = a * b;

    if (shape === 'array') {
      return {
        type: 'mult', kicker: 'כפל',
        text: 'יש ' + a + ' שורות, ובכל שורה ' + b + ' ' + obj.n + '. כמה יש בסך הכול?',
        spoken: 'יש ' + att(a, 'f') + ' שורות, ובכל שורה ' + att(b, obj.g) + ' ' + obj.n + '. כמה יש בסך הכול?',
        html: arrayGrid(a, b, obj.e),
        input: 'choices',
        choices: multChoices(a, b, ans),
        answer: ans,
        hintHtml: say(a + ' שורות של ' + b + ' – זה ' + a + ' × ' + b + '.') + strategy(a, b),
        explainHtml: eq(a + ' <span>×</span> ' + b + ' <span>=</span> <b>' + ans + '</b>') + strategy(a, b)
      };
    }

    // בשלבים הגבוהים מקלידים במקום לבחור: זו כבר ידיעה בעל פה, לא זיהוי
    var usePad = st >= 5 && !hint && Math.random() < 0.5;
    return {
      type: 'mult', kicker: 'כפל',
      spoken: 'כמה זה ' + numWord(a) + ' כפול ' + numWord(b) + '?',
      html: eq(a + ' <span>×</span> ' + b + ' <span>=</span> ' + BLANK) +
        ((st <= 3 || hint) && ans > 0 ? arrayGrid(a, b, obj.e) : ''),
      input: usePad ? 'pad' : 'choices',
      choices: usePad ? null : multChoices(a, b, ans),
      answer: ans,
      hintHtml: (a > 1 && b > 1 ? say('כפל הוא קבוצות שוות: ' + a + ' קבוצות של ' + b + '.') + arrayGrid(a, b, obj.e) : '') +
        strategy(a, b),
      explainHtml: eq(a + ' <span>×</span> ' + b + ' <span>=</span> <b>' + ans + '</b>') + strategy(a, b)
    };
  }

  /* גורם חסר: ? × b = c, או a × ? = c */
  function multMissing(st, hint, obj) {
    var p = pairNZ(st), a = p[0], b = p[1], c = a * b;
    var hideFirst = Math.random() < 0.5;
    var ans = hideFirst ? a : b, known = hideFirst ? b : a;
    var eqHtml = hideFirst
      ? BLANK + ' <span>×</span> ' + b + ' <span>=</span> ' + c
      : a + ' <span>×</span> ' + BLANK + ' <span>=</span> ' + c;
    var usePad = st >= 4 && !hint;
    return {
      type: 'mult', kicker: 'כפל',
      text: 'איזה מספר מסתתר במשבצת?',
      spoken: 'איזה מספר חסר? ' + spokenEq(eqHtml),
      html: eq(eqHtml) + (hint && c <= 50 ? arrayGrid(known, ans, obj.e) : ''),
      input: usePad ? 'pad' : 'choices',
      choices: usePad ? null : choicesAround(ans, 0, 12, [ans + 1, ans - 1, known]),
      answer: ans,
      hintHtml: say('בודקים כמה פעמים ' + known + ' נכנס ב-' + c + ', בקפיצות של ' + known + ':') +
        step(seq(known, ans)),
      explainHtml: eq(eqHtml.replace(BLANK, '<b>' + ans + '</b>')) +
        say('בודקים: ' + known + ' × ' + ans + ' = ' + c + '.')
    };
  }

  /* ---------- חילוק ---------- */
  function genDiv(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE), obj = pick(OBJECTS);
    var r = Math.random(), shape = 'eq';
    if (st >= 2 && r < 0.3) shape = 'inverse';
    else if (st >= 4 && r > 0.7) shape = 'missing';
    var pt = divParts(st), d = pt.d, q = pt.q, a = pt.a;

    if (shape === 'inverse') return divInverse(pt, obj);
    if (shape === 'missing') return divMissing(st, hint, pt);

    return {
      type: 'div', kicker: 'חילוק',
      spoken: 'כמה זה ' + numWord(a) + ' חלקי ' + numWord(d) + '?',
      html: eq(a + ' ' + DIV + ' ' + d + ' <span>=</span> ' + BLANK) +
        ((st <= 2 || hint) && a <= 20 ? '<div class="visual small">' + row(a, obj.e) + '</div>' : ''),
      input: 'choices',
      choices: choicesAround(q, 0, Math.max(q + 8, 12), [q + 1, q - 1, d]),
      answer: q,
      hintHtml: divHint(a, d, q, obj.e),
      explainHtml: eq(a + ' ' + DIV + ' ' + d + ' <span>=</span> <b>' + q + '</b>') +
        say('כי ' + q + ' × ' + d + ' = ' + a + '.')
    };
  }

  /* כפל וחילוק הם פעולות הפוכות: נותנים d × q = a ושואלים a : d2 */
  function divInverse(pt) {
    var d = pt.d, q = pt.q, a = pt.a;
    var useD = Math.random() < 0.5;
    var by = useD ? d : q, ans = useD ? q : d;
    return {
      type: 'div', kicker: 'חילוק',
      text: 'משתמשים בתרגיל הכפל כדי לפתור את החילוק:',
      spoken: 'משתמשים בתרגיל הכפל כדי לפתור את החילוק. ' + numWord(d) + ' כפול ' + numWord(q) +
        ' שווה ' + numWord(a) + '. כמה זה ' + numWord(a) + ' חלקי ' + numWord(by) + '?',
      html: eq(d + ' <span>×</span> ' + q + ' <span>=</span> ' + a) +
        eq(a + ' ' + DIV + ' ' + by + ' <span>=</span> ' + BLANK),
      input: 'choices',
      choices: choicesAround(ans, 0, Math.max(ans + 8, 12), [ans + 1, ans - 1, by]),
      answer: ans,
      hintHtml: say('כפל וחילוק הפוכים: ' + ans + ' × ' + by + ' = ' + a + ', ולכן ' + a + ' : ' + by + ' = ' + ans + '.'),
      explainHtml: eq(a + ' ' + DIV + ' ' + by + ' <span>=</span> <b>' + ans + '</b>') +
        say('כי ' + ans + ' × ' + by + ' = ' + a + '.')
    };
  }

  /* מחלק חסר או מספר חסר: a : ? = q, או ? : d = q */
  function divMissing(st, hint, pt) {
    var d = pt.d, q = pt.q, a = pt.a;
    var hideDividend = Math.random() < 0.5;
    var eqHtml = hideDividend
      ? BLANK + ' ' + DIV + ' ' + d + ' <span>=</span> ' + q
      : a + ' ' + DIV + ' ' + BLANK + ' <span>=</span> ' + q;
    var ans = hideDividend ? a : d;
    var usePad = st >= 5 && !hint;
    return {
      type: 'div', kicker: 'חילוק',
      text: 'איזה מספר מסתתר במשבצת?',
      spoken: 'איזה מספר חסר? ' + spokenEq(eqHtml),
      html: eq(eqHtml),
      input: usePad ? 'pad' : 'choices',
      choices: usePad ? null : choicesAround(ans, 0, Math.max(ans + 10, 12),
        hideDividend ? [d * (q + 1), d * (q - 1), q + d] : [ans + 1, ans - 1, q]),
      answer: ans,
      hintHtml: hideDividend
        ? say('מחלקים ב-' + d + ' ומקבלים ' + q + '. לכן המספר הוא ' + q + ' × ' + d + '.')
        : say('בודקים כמה פעמים ' + q + ' נכנס ב-' + a + ', בקפיצות של ' + q + ':') + step(seq(q, d)),
      explainHtml: eq(eqHtml.replace(BLANK, '<b>' + ans + '</b>')) +
        say('בודקים: ' + q + ' × ' + d + ' = ' + a + '.')
    };
  }

  /* ---------- סיפורי כפל וחילוק ---------- */
  /* צירופים הגיוניים של מכל ותכולה. g = המין הדקדוקי, לצורך ההקראה. */
  var COMBOS = [
    { one: 'קופסה', many: 'קופסאות', cg: 'f', e: '🍪', n: 'עוגיות', g: 'f' },
    { one: 'שקית', many: 'שקיות', cg: 'f', e: '🍎', n: 'תפוחים', g: 'm' },
    { one: 'צלחת', many: 'צלחות', cg: 'f', e: '🧁', n: 'קאפקייקס', g: 'm' },
    { one: 'אגרטל', many: 'אגרטלים', cg: 'm', e: '🌸', n: 'פרחים', g: 'm' },
    { one: 'אקווריום', many: 'אקווריומים', cg: 'm', e: '🐠', n: 'דגים', g: 'm' },
    { one: 'קן', many: 'קנים', cg: 'm', e: '🥚', n: 'ביצים', g: 'f' },
    { one: 'גביע', many: 'גביעים', cg: 'm', e: '🍨', n: 'כדורי גלידה', g: 'm' }
  ];
  var PRICED = [
    { one: 'סוכרייה', many: 'סוכריות', g: 'f', e: '🍬' },
    { one: 'מחברת', many: 'מחברות', g: 'f', e: '📓' },
    { one: 'כרטיס', many: 'כרטיסים', g: 'm', e: '🎟️' },
    { one: 'ספר', many: 'ספרים', g: 'm', e: '📘' }
  ];

  function genMword(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE);
    var kinds = st <= 2 ? ['groups'] : (st === 3 ? ['groups', 'share'] : ['groups', 'share', 'pack', 'price']);
    var kind = pick(kinds);
    var q;

    if (kind === 'groups') {
      var c = pick(COMBOS), p = pairNZ(st), A = p[0], B = p[1], ans = A * B;
      q = {
        text: 'יש ' + A + ' ' + c.many + '. בכל ' + c.one + ' יש ' + B + ' ' + c.n + '. כמה ' + c.n + ' יש בסך הכול?',
        spoken: 'יש ' + att(A, c.cg) + ' ' + c.many + '. בכל ' + c.one + ' יש ' + att(B, c.g) + ' ' + c.n +
          '. כמה ' + c.n + ' יש בסך הכול?',
        html: (st <= 2 || hint) && A <= 6 && ans <= 30 ? groupsVisual(A, B, c.e)
          : '<div class="visual" style="font-size:2.6rem">' + c.e + '</div>',
        answer: ans,
        hintHtml: say(A + ' קבוצות שוות של ' + B + ' – זה ' + A + ' × ' + B + '.') + arrayGrid(A, B, c.e) + strategy(A, B),
        explainHtml: eq(A + ' <span>×</span> ' + B + ' <span>=</span> <b>' + ans + '</b>') +
          say('יש בסך הכול <b>' + ans + '</b> ' + c.n + '.'),
        extras: [(A + 1) * B, A * (B + 1), A + B]
      };
    } else if (kind === 'share') {
      var o = pick(OBJECTS), pt = divParts(st);
      q = {
        text: pt.a + ' ' + o.n + ' ' + (o.g === 'f' ? 'מתחלקות' : 'מתחלקים') + ' שווה בשווה בין ' + pt.d +
          ' ילדים. כמה ' + o.n + ' יקבל כל ילד?',
        spoken: att(pt.a, o.g) + ' ' + o.n + ' ' + (o.g === 'f' ? 'מתחלקות' : 'מתחלקים') + ' שווה בשווה בין ' +
          att(pt.d, 'm') + ' ילדים. כמה ' + o.n + ' יקבל כל ילד?',
        html: (st <= 3 || hint) && pt.a <= 20 ? '<div class="visual small">' + row(pt.a, o.e) + '</div>'
          : '<div class="visual" style="font-size:2.6rem">' + o.e + '</div>',
        answer: pt.q,
        hintHtml: divHint(pt.a, pt.d, pt.q, o.e),
        explainHtml: eq(pt.a + ' ' + DIV + ' ' + pt.d + ' <span>=</span> <b>' + pt.q + '</b>') +
          say('כל ילד קיבל <b>' + pt.q + '</b> ' + o.n + '.'),
        extras: [pt.q + 1, pt.q - 1, pt.d]
      };
    } else if (kind === 'pack') {
      var cp = pick(COMBOS), pp = divParts(st);
      // pp.d = כמה בכל מכל, pp.q = כמה מכלים צריך
      q = {
        text: 'יש ' + pp.a + ' ' + cp.n + '. שמים ' + pp.d + ' ' + cp.n + ' בכל ' + cp.one + '. כמה ' + cp.many + ' צריך?',
        spoken: 'יש ' + att(pp.a, cp.g) + ' ' + cp.n + '. שמים ' + att(pp.d, cp.g) + ' ' + cp.n + ' בכל ' + cp.one +
          '. כמה ' + cp.many + ' צריך?',
        html: (st <= 3 || hint) && pp.a <= 20 ? '<div class="visual small">' + row(pp.a, cp.e) + '</div>'
          : '<div class="visual" style="font-size:2.6rem">' + cp.e + '</div>',
        answer: pp.q,
        hintHtml: divHint(pp.a, pp.d, pp.q, cp.e),
        explainHtml: eq(pp.a + ' ' + DIV + ' ' + pp.d + ' <span>=</span> <b>' + pp.q + '</b>') +
          say('צריך <b>' + pp.q + '</b> ' + cp.many + '.'),
        extras: [pp.q + 1, pp.q - 1, pp.d]
      };
    } else {
      var it = pick(PRICED), pr = pairNZ(st), price = pr[0], cnt = pr[1], tot = price * cnt;
      var verb = it.g === 'f' ? 'עולות' : 'עולים';
      q = {
        text: 'כל ' + it.one + ' עולה ' + price + ' שקלים. כמה ' + verb + ' ' + cnt + ' ' + it.many + '?',
        spoken: 'כל ' + it.one + ' עולה ' + att(price, 'm') + ' שקלים. כמה ' + verb + ' ' + att(cnt, it.g) + ' ' + it.many + '?',
        html: '<div class="visual" style="font-size:2.6rem">' + it.e + '</div>',
        answer: tot,
        hintHtml: say('כל ' + it.one + ' עולה ' + price + ', ולכן סופרים בקפיצות של ' + price + ', ' + cnt + ' פעמים:') +
          step(seq(price, cnt)),
        explainHtml: eq(price + ' <span>×</span> ' + cnt + ' <span>=</span> <b>' + tot + '</b>') +
          say('' + cnt + ' ' + it.many + ' עולים ביחד <b>' + tot + '</b> שקלים.'),
        extras: [(price + 1) * cnt, price * (cnt + 1), price + cnt]
      };
    }

    var ans2 = q.answer;
    return {
      type: 'mword', kicker: 'סיפור כפל וחילוק',
      text: q.text, spoken: q.spoken, html: q.html,
      input: 'choices',
      choices: choicesAround(ans2, 0, Math.max(ans2 + 10, 30), q.extras),
      answer: ans2,
      hintHtml: q.hintHtml, explainHtml: q.explainHtml
    };
  }

  /* ---------- סוגריים ---------- */
  function genBrackets() {
    var shape = pick(['A', 'B', 'C', 'D']);
    var a, b, c, ans, expr, lines, wrong;
    if (shape === 'A') {              // (a + b) × c
      a = rnd(1, 9); b = rnd(1, 9); c = rnd(2, 5);
      ans = (a + b) * c; expr = '(' + a + ' <span>+</span> ' + b + ') <span>×</span> ' + c;
      lines = [a + ' + ' + b + ' = ' + (a + b), (a + b) + ' × ' + c + ' = ' + ans];
      wrong = a + b * c;
    } else if (shape === 'B') {       // a × (b + c)
      a = rnd(2, 5); b = rnd(1, 9); c = rnd(1, 9);
      ans = a * (b + c); expr = a + ' <span>×</span> (' + b + ' <span>+</span> ' + c + ')';
      lines = [b + ' + ' + c + ' = ' + (b + c), a + ' × ' + (b + c) + ' = ' + ans];
      wrong = a * b + c;
    } else if (shape === 'C') {       // (a − b) × c
      a = rnd(6, 15); b = rnd(1, a - 2); c = rnd(2, 5);
      ans = (a - b) * c; expr = '(' + a + ' <span>−</span> ' + b + ') <span>×</span> ' + c;
      lines = [a + ' − ' + b + ' = ' + (a - b), (a - b) + ' × ' + c + ' = ' + ans];
      wrong = a - b * c;
    } else {                          // a + (b × c)
      a = rnd(1, 20); b = rnd(2, 6); c = rnd(2, 6);
      ans = a + b * c; expr = a + ' <span>+</span> (' + b + ' <span>×</span> ' + c + ')';
      lines = [b + ' × ' + c + ' = ' + (b * c), a + ' + ' + (b * c) + ' = ' + ans];
      wrong = (a + b) * c;
    }
    return {
      type: 'brackets', kicker: 'סוגריים',
      text: 'קודם מחשבים מה שבתוך הסוגריים.',
      spoken: 'קודם מחשבים מה שבתוך הסוגריים. כמה זה ' +
        numsToWords(speakable(expr)).replace(/[,\s]+$/, '') + '?',
      html: eq(expr + ' <span>=</span> ' + BLANK),
      input: 'choices',
      choices: choicesAround(ans, 0, Math.max(ans + 12, 30), [wrong, ans + 1, ans - 1]),
      answer: ans,
      hintHtml: say('קודם מחשבים מה שבתוך הסוגריים, ואחר כך ממשיכים:') + lines.map(step).join(''),
      explainHtml: eq(expr + ' <span>=</span> <b>' + ans + '</b>') + lines.map(step).join('')
    };
  }

  /* ---------- סימני התחלקות ---------- */
  var RULES = {
    10: 'מספר מתחלק ב-10 אם הוא נגמר ב-0.',
    5: 'מספר מתחלק ב-5 אם הוא נגמר ב-0 או ב-5.',
    2: 'מספר מתחלק ב-2 אם הוא זוגי: נגמר ב-0, 2, 4, 6 או 8.'
  };

  function genDivis(stage) {
    var st = clamp(stage, 1, MAX_STAGE);
    var d = pick(st <= 1 ? [10, 2] : [2, 5, 10]);
    var multiples = [], others = [], n;
    for (n = 12; n <= 98; n++) (n % d === 0 ? multiples : others).push(n);
    var ans = pick(multiples);
    var chosen = [ans];
    // מסיח מפתה: בחילוק ב-10 מספר שנגמר ב-5 (הוא מתחלק ב-5, לא ב-10)
    if (d === 10) {
      var lures = others.filter(function (x) { return x % 10 === 5; });
      chosen.push(pick(lures));
    }
    var pool = shuffle(others.filter(function (x) { return chosen.indexOf(x) < 0; }));
    while (chosen.length < 4) chosen.push(pool.pop());
    return {
      type: 'divis', kicker: 'סימני התחלקות',
      text: 'איזה מספר מתחלק ב-' + d + ' בלי שארית?',
      spoken: 'איזה מספר מתחלק ב' + numWord(d) + ' בלי שארית?',
      html: '<div class="equation">' + d + ' ' + DIV + ' <span class="slot">?</span></div>',
      input: 'choices',
      choices: shuffle(chosen).map(function (v) { return { v: v, sym: String(v) }; }),
      answer: ans,
      hintHtml: say(RULES[d]),
      explainHtml: say(RULES[d]) + eq(ans + ' ' + DIV + ' ' + d + ' <span>=</span> <b>' + (ans / d) + '</b>') +
        say('לכן ' + ans + ' מתחלק ב-' + d + ' בלי שארית.')
    };
  }

  /* ---------- רישום הנתיב ---------- */
  Q.register({
    strand: 'mult',
    generators: { mult: genMult, div: genDiv, mword: genMword, brackets: genBrackets, divis: genDivis },
    labels: {
      mult: 'כפל', div: 'חילוק', mword: 'סיפורי כפל וחילוק', brackets: 'סוגריים', divis: 'סימני התחלקות'
    },
    howTo: {
      mult:     { ico: '✖️', title: 'כפל',               line: 'קבוצות שוות: סופרים כמה יש בסך הכול.' },
      div:      { ico: '➗', title: 'חילוק',              line: 'מחלקים שווה בשווה ובודקים כמה יש בכל קבוצה.' },
      mword:    { ico: '📦', title: 'סיפור כפל וחילוק',   line: 'שומעים את הסיפור וחושבים: קבוצות שוות.' },
      brackets: { ico: '🧩', title: 'סוגריים',            line: 'קודם מחשבים מה שבתוך הסוגריים.' },
      divis:    { ico: '🔟', title: 'סימני התחלקות',      line: 'מגלים לפי הספרה האחרונה מי מתחלק.' }
    },
    typesForStage: function (st) {
      if (st <= 1) return ['mult'];
      if (st === 2) return ['mult', 'div'];
      if (st === 3) return ['mult', 'div', 'mword'];
      if (st <= 5) return ['mult', 'div', 'mword', 'divis'];
      return ['mult', 'div', 'mword', 'divis', 'brackets'];
    }
  });
})(window.MG);
