/* ===================================================================
   place.js – נתיב מספרים וערך מקום
   לפי תוכנית הלימודים לכיתה ב׳ (המספרים הטבעיים בתחום ה-1,000): מנייה בעשרות
   ובמאות, קריאה וכתיבה של מספרים במילים, ערך המקום (מאות, עשרות, יחידות, ואפס
   כשומר מקום), סדר המספרים, ישר המספרים, לוח המאה, זוגי ואי-זוגי.

   שלבים 1..4 (השלב מתקדם לבד, ראו adaptiveUpdate ב-app.js):
     1  עד 100: ערך מקום, ספירה ב-1 וב-10, שכנים, זוגי ואי-זוגי
     2  עד 200: גם מספר במילים, לוח המאה וישר המספרים של העשרות
     3  עד 1000: מאות, ספירה ב-100, ישר המספרים של המאות והשוואה
     4  כל המספרים התלת-ספרתיים, כולל אפס באמצע, וישר מספרים מדויק
   =================================================================== */
(function (MG) {
  'use strict';

  var Q = MG.Questions, h = Q._h;
  var rnd = h.rnd, pick = h.pick, shuffle = h.shuffle, clamp = h.clamp,
      choicesAround = h.choicesAround, numWord = h.numWord, numsToWords = h.numsToWords,
      speakable = h.speakable;

  var MAX_STAGE = 4;

  function eq(inner) { return '<div class="equation">' + inner + '</div>'; }
  function step(line) { return '<div class="equation step">' + line + '</div>'; }
  function say(text) { return '<p class="q-text">' + text + '</p>'; }
  function digits(n) { return [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10]; }
  function uniq(list) { return list.filter(function (v, i) { return list.indexOf(v) === i; }); }

  /* מספר לפי שלב. zero=true מכריח ספרת אפס (שומר מקום) בשלבים התלת-ספרתיים. */
  function pickNum(st, zero) {
    if (st <= 1) return rnd(11, 99);
    if (st === 2) return Math.random() < 0.3 ? rnd(100, 199) : rnd(11, 99);
    var n = rnd(1, 9) * 100 + rnd(0, 9) * 10 + (Math.random() < 0.4 ? 0 : rnd(0, 9));
    if (st >= 4 && (zero || Math.random() < 0.4)) {
      n = rnd(1, 9) * 100 + (Math.random() < 0.5 ? rnd(1, 9) : rnd(1, 9) * 10);   // אפס בעשרות או ביחידות
    }
    return n;
  }

  /* ---------- תצוגות ---------- */

  /* קוביות בסיס-10: ריבוע = מאה, מקל = עשר, קובייה = אחד */
  function blocks(n) {
    var d = digits(n), s = '<div class="blocks">', i;
    for (i = 0; i < d[0]; i++) s += '<span class="bk bh">100</span>';
    for (i = 0; i < d[1]; i++) s += '<span class="bk bt"></span>';
    for (i = 0; i < d[2]; i++) s += '<span class="bk bo"></span>';
    return s + '</div>';
  }
  var LEGEND = 'ריבוע = 100, מקל = 10, קובייה = 1.';
  var LEGEND_SPOKEN = 'ריבוע הוא מאה, מקל הוא עשר, וקובייה היא אחת.';

  /* טבלת מקומות: מאות, עשרות, יחידות (משמאל לימין, כמו שמספר נכתב) */
  function placeTable(n, hideHundreds) {
    var d = digits(n);
    function cell(label, v) { return '<div><span>' + label + '</span><b>' + v + '</b></div>'; }
    return '<div class="pvt" dir="ltr">' + (hideHundreds ? '' : cell('מאות', d[0])) + cell('עשרות', d[1]) + cell('יחידות', d[2]) + '</div>';
  }

  /* מספר גדול עם ספרה מסומנת. pos: 0 = יחידות, 1 = עשרות, 2 = מאות */
  function numberWithMark(n, pos) {
    var s = String(n), idx = s.length - 1 - pos, out = '';
    for (var i = 0; i < s.length; i++) out += i === idx ? '<span class="hi">' + s[i] + '</span>' : s[i];
    return '<div class="equation bignum">' + out + '</div>';
  }

  /* ---------- מסיחים אופייניים לערך מקום ---------- */
  function digitSwaps(n) {
    var s = String(n), out = [];
    if (s.length === 3) {
      out.push(+(s[0] + s[2] + s[1]), +(s[1] + s[0] + s[2]), +(s[2] + s[1] + s[0]));
    } else if (s.length === 2) out.push(+(s[1] + s[0]));
    return out;
  }
  function placeChoices(n, extra) {
    var c = uniq(digitSwaps(n).concat([n + 10, n - 10, n + 100, n - 100, n + 1, n - 1], extra || []))
      .filter(function (v) { return v !== n && v >= 0 && v <= 1000; });
    return choicesAround(n, 0, 1000, shuffle(c).slice(0, 3));
  }

  /* ---------- ערך מקום ---------- */
  function genPlace(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE);
    var shape = pick(['compose', 'digit', 'decomp']);
    var n = pickNum(st, false), d = digits(n);

    if (shape === 'compose') {
      var blocksView = st <= 2 || hint;
      var table = st >= 3 ? placeTable(n, false) : placeTable(n, n < 100);
      return {
        type: 'place', kicker: 'ערך מקום',
        text: blocksView ? 'כמה זה בסך הכול? ' + LEGEND : 'איזה מספר זה?',
        spoken: blocksView
          ? 'כמה זה בסך הכול? ' + LEGEND_SPOKEN
          : 'איזה מספר זה? מאות, ' + numWord(d[0]) + '. עשרות, ' + numWord(d[1]) + '. יחידות, ' + numWord(d[2]) + '.',
        html: blocksView ? blocks(n) : table,
        input: 'choices',
        choices: placeChoices(n),
        answer: n,
        hintHtml: blocks(n) + say('סופרים: ' + (d[0] ? d[0] * 100 + ', ' : '') + (d[1] ? d[1] * 10 + ', ' : '') + d[2] + '.') +
          step((d[0] ? d[0] * 100 + ' + ' : '') + (d[1] || d[0] ? d[1] * 10 + ' + ' : '') + d[2] + ' = ' + n),
        explainHtml: eq(placeSum(d) + ' <span>=</span> <b>' + n + '</b>') + placeTable(n, n < 100)
      };
    }

    if (shape === 'digit') {
      // ספרה שאינה אפס, ובשלב 1 רק עשרות ויחידות
      var positions = [0, 1, 2].filter(function (p) { return d[2 - p] > 0 && String(n).length > p; });
      var pos = pick(positions), digit = d[2 - pos], value = digit * Math.pow(10, pos);
      var names = ['היחידות', 'העשרות', 'המאות'];
      var cands = uniq([digit, digit * 10, digit * 100, digit * 1000].concat([pos === 0 ? 10 * digit : digit + 1]))
        .filter(function (v) { return v !== value && v <= 1000; });
      return {
        type: 'place', kicker: 'ערך מקום',
        text: 'מה ערך הספרה המסומנת?',
        spoken: 'מה ערך הספרה המסומנת? הספרה ' + numWord(digit) + ' במקום ' + names[pos] + '.',
        html: numberWithMark(n, pos),
        input: 'choices',
        choices: choicesAround(value, 0, 1000, shuffle(cands).slice(0, 3)),
        answer: value,
        hintHtml: say('הספרה ' + digit + ' נמצאת במקום ' + names[pos] + '.') + blocks(value) +
          step(digit + ' × ' + Math.pow(10, pos) + ' = ' + value),
        explainHtml: say('הספרה ' + digit + ' במקום ' + names[pos] + ' שווה <b>' + value + '</b>.') + placeTable(n, n < 100)
      };
    }

    // decomp: n = 300 + ? + 7
    var parts = [d[0] * 100, d[1] * 10, d[2]];
    if (n < 100) parts[0] = null;
    var hideIdx = pick([0, 1, 2].filter(function (i) { return parts[i] != null && parts[i] > 0; }));
    var shown = parts.map(function (v, i) {
      if (v == null) return null;
      return i === hideIdx ? '<span class="blank">?</span>' : String(v);
    }).filter(function (v) { return v !== null; });
    var ans = parts[hideIdx];
    var unit = [100, 10, 1][hideIdx], dg = ans / unit;
    return {
      type: 'place', kicker: 'ערך מקום',
      text: 'איזה מספר חסר?',
      spoken: 'איזה מספר חסר? ' + numWord(n) + ' שווה ' + parts.map(function (v, i) {
        if (v == null) return null;
        return i === hideIdx ? 'כמה' : numWord(v);
      }).filter(Boolean).join(' ועוד '),
      html: eq(n + ' <span>=</span> ' + shown.join(' <span>+</span> ')),
      input: 'choices',
      choices: choicesAround(ans, 0, 1000, shuffle(uniq([dg, dg * 10, dg * 100, ans + unit, ans - unit])
        .filter(function (v) { return v !== ans && v >= 0 && v <= 1000; })).slice(0, 3)),
      answer: ans,
      hintHtml: placeTable(n, n < 100) + say('ב-' + n + ' יש ' + dg + ' ' + ['מאות', 'עשרות', 'יחידות'][hideIdx] + ', וזה ' + ans + '.'),
      explainHtml: eq(placeSum(d, n < 100) + ' <span>=</span> ' + n) + say('החסר הוא <b>' + ans + '</b>.')
    };
  }

  function placeSum(d, twoDigit) {
    var p = [];
    if (!twoDigit && d[0]) p.push(d[0] * 100);
    if (d[1]) p.push(d[1] * 10);
    if (d[2] || !p.length) p.push(d[2]);
    return p.join(' <span>+</span> ');
  }

  /* ---------- מספר במילים ---------- */
  function genWords(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE);
    var n = pickNum(Math.max(st, 2), st >= 4);
    var d = digits(n);
    var wordsText = numWord(n);
    var parts = [];
    if (d[0]) parts.push(d[0] * 100);
    if (d[1]) parts.push(d[1] * 10);
    if (d[2]) parts.push(d[2]);
    // מסיחי קריאה: "שלוש מאות ושבע" מול "שלוש מאות ושבעים"
    var near = [n + 10, n - 10, n + 100, n - 100].concat(digitSwaps(n));
    if (d[0] && d[1] === 0 && d[2] > 0) near.push(d[0] * 100 + d[2] * 10, d[0] * 10 + d[2]);   // 307 מול 370 ו-37
    if (d[0] && d[2] === 0 && d[1] > 0) near.push(d[0] * 100 + d[1]);                           // 340 מול 304
    return {
      type: 'words', kicker: 'מספר במילים',
      text: 'איזה מספר כתוב כאן?',
      spoken: 'איזה מספר כתוב כאן? ' + wordsText + '.',
      html: '<p class="q-text words">' + wordsText + '</p>',
      input: 'choices',
      choices: choicesAround(n, 0, 1000, shuffle(uniq(near).filter(function (v) { return v !== n && v > 0 && v <= 1000; })).slice(0, 3)),
      answer: n,
      hintHtml: say('מפרקים את המספר לחלקים:') + step(parts.join(' + ') + ' = ' + n),
      explainHtml: say('"' + wordsText + '" נכתב כך:') + eq(parts.join(' <span>+</span> ') + ' <span>=</span> <b>' + n + '</b>')
    };
  }

  /* ---------- לוח המאה ---------- */
  function chartHtml(r0, c0, rows, cols, blankR, blankC) {
    var s = '<table class="chart" dir="ltr">';
    for (var i = 0; i < rows; i++) {
      s += '<tr>';
      for (var j = 0; j < cols; j++) {
        var v = (r0 + i) * 10 + (c0 + j);
        s += (i === blankR && j === blankC) ? '<td class="ch-blank">?</td>' : '<td>' + v + '</td>';
      }
      s += '</tr>';
    }
    return s + '</table>';
  }

  function genChart(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE);
    // חלון של 3 שורות על 5 עמודות מתוך הלוח (1..100), עם מספר אחד חסר
    var r0 = rnd(0, 6), c0 = rnd(1, 6), br = rnd(0, 2), bc = rnd(0, 4);
    var ans = (r0 + br) * 10 + (c0 + bc);

    if (st >= 3 && Math.random() < 0.45) {
      // תנועה בלוח: ימינה = ועוד 1, למטה = ועוד 10
      var down = rnd(1, 3), right = rnd(1, 4), top = rnd(0, 6), left = rnd(1, 6);
      var from = top * 10 + left, to = from + down * 10 + right;
      return {
        type: 'chart', kicker: 'לוח המאה',
        text: 'מתחילים ב-' + from + ' וזזים: ' + down + ' למטה ו-' + right + ' ימינה. איפה נעצרים?',
        spoken: 'מתחילים ב' + numWord(from) + ' וזזים ' + (down === 1 ? 'שורה אחת' : numWord(down, 'f', true) + ' שורות') +
          ' למטה ו' + (right === 1 ? 'צעד אחד' : numWord(right, 'm', true) + ' צעדים') + ' ימינה. איפה נעצרים?',
        html: '',
        input: 'choices',
        choices: choicesAround(to, 1, 100, shuffle([from + down + right, to - 10, to + 1, to + 10]).slice(0, 3)),
        answer: to,
        hintHtml: chartHtml(top, left, down + 1, right + 1, down, right) +
          say('למטה זה ועוד 10, וימינה זה ועוד 1.'),
        explainHtml: step(from + ' + ' + down * 10 + ' = ' + (from + down * 10)) +
          step((from + down * 10) + ' + ' + right + ' = ' + to) + say('נעצרים במספר <b>' + to + '</b>.')
      };
    }

    return {
      type: 'chart', kicker: 'לוח המאה',
      text: 'איזה מספר חסר בלוח?',
      spoken: 'איזה מספר חסר בלוח?',
      html: chartHtml(r0, c0, 3, 5, br, bc),
      input: 'choices',
      choices: choicesAround(ans, 1, 100, shuffle([ans + 1, ans - 1, ans + 10, ans - 10].filter(function (v) { return v >= 1 && v <= 100; })).slice(0, 3)),
      answer: ans,
      hintHtml: say('ימינה זה ועוד 1, ושמאלה פחות 1. למטה זה ועוד 10, ולמעלה פחות 10.'),
      explainHtml: chartHtml(r0, c0, 3, 5, -1, -1) + say('המספר החסר הוא <b>' + ans + '</b>.')
    };
  }

  /* ---------- ישר המספרים ---------- */
  function lineHtml(lo, hi, stepBy, labelEvery, target, reveal) {
    var span = hi - lo, ticks = '';
    for (var v = lo; v <= hi; v += stepBy) {
      var pctPos = ((v - lo) / span) * 100, isT = v === target;
      var label = isT ? (reveal ? v : '?') : ((v - lo) % labelEvery === 0 ? v : '');
      ticks += '<span class="tick' + (isT ? ' mark' : '') + '" style="left:' + pctPos + '%"><i></i><em>' + label + '</em></span>';
    }
    return '<div class="numline nline" dir="ltr">' + ticks + '</div>';
  }

  function genLine(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE);
    var lo, hi, by, every, target;
    if (st <= 2) { lo = 0; hi = 100; by = 10; every = 10; target = rnd(1, 9) * 10; }
    else if (st === 3) { lo = 0; hi = 1000; by = 100; every = 100; target = rnd(1, 9) * 100; }
    else { lo = rnd(0, 8) * 100; hi = lo + 100; by = 10; every = 50; target = lo + rnd(1, 9) * 10; if ((target - lo) % 50 === 0) target += 10; }
    var stepSize = by;
    return {
      type: 'line', kicker: 'ישר המספרים',
      text: 'איזה מספר מסומן בסימן השאלה?',
      spoken: 'איזה מספר מסומן בסימן השאלה?',
      html: lineHtml(lo, hi, by, every, target),
      input: 'choices',
      choices: choicesAround(target, lo, hi, shuffle([target + stepSize, target - stepSize, target + 2 * stepSize, target - 2 * stepSize, target + 5 * stepSize].filter(function (v) {
        return v >= lo && v <= hi && (st < 4 || (v - lo) % every !== 0);   // בשלב 4 מספר שכתוב על הישר הוא מסיח מובן מאליו
      })).slice(0, 3)),
      answer: target,
      hintHtml: say('בין כל שני סימונים מוסיפים ' + stepSize + '. סופרים בקפיצות של ' + stepSize + ' מהמספר שלפני.'),
      explainHtml: lineHtml(lo, hi, by, every, target, true) + say('המספר המסומן הוא <b>' + target + '</b>.')
    };
  }

  /* ---------- זוגי ואי-זוגי ---------- */
  function genParity(stage) {
    var st = clamp(stage, 1, MAX_STAGE);
    var even = Math.random() < 0.5, lo = st >= 3 ? 100 : 10, hi = st >= 3 ? 999 : 99;
    var pool = [], n;
    for (n = lo; n <= hi; n++) pool.push(n);
    var right = shuffle(pool.filter(function (v) { return (v % 2 === 0) === even; })).slice(0, 1);
    // מסיחים מפתים: ספרת העשרות הפוכה מהסוף ("32" מול "23"), כדי שלא יתבססו על הספרה הראשונה
    var wrong = shuffle(pool.filter(function (v) { return (v % 2 === 0) !== even; })).slice(0, 3);
    var all = right.concat(wrong);
    var rule = 'מספר זוגי נגמר ב-0, 2, 4, 6 או 8. מספר אי-זוגי נגמר ב-1, 3, 5, 7 או 9.';
    return {
      type: 'parity', kicker: 'זוגי ואי-זוגי',
      text: even ? 'איזה מספר זוגי?' : 'איזה מספר אי-זוגי?',
      spoken: even ? 'איזה מספר זוגי?' : 'איזה מספר אי זוגי?',
      html: '',
      input: 'choices',
      choices: shuffle(all).map(function (v) { return { v: v, sym: String(v) }; }),
      answer: right[0],
      hintHtml: say(rule) + say('מספר זוגי אפשר לחלק לזוגות בלי שנשאר אחד לבד.'),
      explainHtml: say(right[0] + ' ' + (even ? 'זוגי' : 'אי-זוגי') + ', כי הוא נגמר ב-' + (right[0] % 10) + '.') + say(rule)
    };
  }

  /* ---------- ספירה בקפיצות ---------- */
  function genPseq(stage) {
    var st = clamp(stage, 1, MAX_STAGE);
    var steps = st <= 1 ? [1, 10, -1, -10] : st === 2 ? [2, 5, 10, -10, 1, -1] : st === 3 ? [10, 100, -10, -100] : [1, 10, 100, -1, -10, -100];
    var max = st <= 1 ? 100 : st === 2 ? 200 : 1000;
    var stepBy = pick(steps), span = Math.abs(stepBy) * 4;
    var start = stepBy > 0 ? rnd(0, max - span) : rnd(span, max);
    // ספירה בעשרות ובמאות מתחילה ממספר "עגול" לפעמים, כמו בתוכנית
    if (Math.abs(stepBy) >= 10 && Math.random() < 0.4) start = Math.round(start / Math.abs(stepBy)) * Math.abs(stepBy);
    start = clamp(start, stepBy > 0 ? 0 : span, stepBy > 0 ? max - span : max);
    var arr = [];
    for (var i = 0; i < 5; i++) arr.push(start + stepBy * i);
    var hideIdx = st <= 1 ? pick([2, 3, 4]) : pick([0, 1, 2, 3, 4]);
    var ans = arr[hideIdx];
    var rowHtml = function (reveal) {
      return '<div class="seq">' + arr.map(function (v, i) {
        return i === hideIdx && !reveal ? '<span class="blank">?</span>' : '<span' + (i === hideIdx ? ' class="hit"' : '') + '>' + v + '</span>';
      }).join('') + '</div>';
    };
    var word = Math.abs(stepBy);
    return {
      type: 'pseq', kicker: 'ספירה בקפיצות',
      text: 'מה החוקיות? איזה מספר חסר?',
      spoken: 'איזה מספר חסר בסדרה? ' + arr.map(function (v, i) { return i === hideIdx ? 'כמה' : numWord(v); }).join(', '),
      html: rowHtml(false),
      input: 'choices',
      choices: choicesAround(ans, 0, Math.min(1000, Math.max(max, ans + 10)), shuffle([ans + stepBy, ans - stepBy, ans + 1, ans - 1, ans + 10].filter(function (v) { return v !== ans && v >= 0 && v <= 1000; })).slice(0, 3)),
      answer: ans,
      hintHtml: say('בכל פעם ' + (stepBy > 0 ? 'מוסיפים ' : 'מורידים ') + word + '.'),
      explainHtml: say('בסדרה הזו ' + (stepBy > 0 ? 'מוסיפים' : 'מורידים') + ' ' + word + ' בכל צעד, ולכן המספר החסר הוא <b>' + ans + '</b>.') + rowHtml(true)
    };
  }

  /* ---------- השוואת מספרים גדולים ---------- */
  function genPcompare(stage, hint) {
    var st = clamp(stage, 1, MAX_STAGE);
    if (st >= 4 && Math.random() < 0.4) return pcompareExtreme();
    var a = pickNum(3, false), b;
    if (st <= 3) { b = rnd(1, 9) * 100 + rnd(0, 99); while (Math.floor(b / 100) === Math.floor(a / 100)) b = rnd(1, 9) * 100 + rnd(0, 99); }
    else { b = Math.random() < 0.5 ? Math.floor(a / 100) * 100 + rnd(0, 99) : a; if (b === a && Math.random() < 0.6) b = a + pick([-10, -1, 1, 10]); }
    b = clamp(b, 100, 999);
    var ans = a > b ? '>' : (a < b ? '<' : '=');
    var da = digits(a), db = digits(b);
    var why = da[0] !== db[0] ? 'משווים מאות: ' + da[0] + ' ו-' + db[0] + '.'
      : da[1] !== db[1] ? 'המאות שוות, ולכן משווים עשרות: ' + da[1] + ' ו-' + db[1] + '.'
      : da[2] !== db[2] ? 'המאות והעשרות שוות, ולכן משווים יחידות: ' + da[2] + ' ו-' + db[2] + '.'
      : 'כל הספרות שוות.';
    return {
      type: 'pcompare', kicker: 'השוואת מספרים גדולים',
      text: 'איזה סימן מתאים?',
      spoken: 'איזה סימן מתאים? ' + numWord(a) + ' או ' + numWord(b) + '?',
      html: eq(a + ' <span class="slot">?</span> ' + b),
      input: 'choices',
      choices: shuffle([
        { v: '>', sym: '&gt;', label: 'גדול מ־' },
        { v: '<', sym: '&lt;', label: 'קטן מ־' },
        { v: '=', sym: '=', label: 'שווה ל־' }
      ]),
      answer: ans,
      hintHtml: placeTable(a, false) + placeTable(b, false) + say(why),
      explainHtml: eq(a + ' <b>' + (ans === '>' ? '&gt;' : ans === '<' ? '&lt;' : '=') + '</b> ' + b) + say(why)
    };
  }

  /* הגדול ביותר או הקטן ביותר מבין ארבעה מספרים */
  function pcompareExtreme() {
    var base = rnd(1, 8) * 100, nums = [];
    while (nums.length < 4) {
      var v = base + rnd(0, 9) * 10 + rnd(0, 9);
      if (nums.indexOf(v) < 0) nums.push(v);
    }
    var big = Math.random() < 0.5;
    var ans = big ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
    return {
      type: 'pcompare', kicker: 'השוואת מספרים גדולים',
      text: big ? 'איזה מספר הגדול ביותר?' : 'איזה מספר הקטן ביותר?',
      spoken: big ? 'איזה מספר הגדול ביותר?' : 'איזה מספר הקטן ביותר?',
      html: '',
      input: 'choices',
      choices: shuffle(nums).map(function (v) { return { v: v, sym: String(v) }; }),
      answer: ans,
      hintHtml: say('כל המספרים מתחילים באותה ספרת מאות, ולכן משווים את העשרות, ואם הן שוות, את היחידות.'),
      explainHtml: say('המספר ה' + (big ? 'גדול' : 'קטן') + ' ביותר הוא <b>' + ans + '</b>.')
    };
  }

  /* ---------- מספרים שכנים ---------- */
  function genNeighbors(stage) {
    var st = clamp(stage, 1, MAX_STAGE);
    var max = st <= 1 ? 99 : st === 2 ? 199 : 999;
    var shapes = st <= 1 ? ['by1', 'between'] : st === 2 ? ['by1', 'by10', 'between'] : ['by1', 'by10', 'by100', 'between'];
    var shape = pick(shapes), base, ans, text, spoken, why;
    if (shape === 'between') {
      var lo = rnd(st <= 1 ? 10 : 90, max - 3);
      if (Math.random() < 0.3 && st >= 2) lo = pick([98, 99, 198, 199, 298, 399, 499, 899].filter(function (v) { return v <= max - 2; }));
      ans = lo + 1;
      text = 'איזה מספר נמצא בין ' + lo + ' ל-' + (lo + 2) + '?';
      spoken = 'איזה מספר נמצא בין ' + numWord(lo) + ' ל' + numWord(lo + 2) + '?';
      why = 'המספר שבא אחרי ' + lo + ' הוא ' + ans + ', ואחריו ' + (lo + 2) + '.';
    } else {
      var delta = shape === 'by1' ? 1 : shape === 'by10' ? 10 : 100, more = Math.random() < 0.5;
      base = more ? rnd(2, max - delta) : rnd(delta + 1, max);
      ans = more ? base + delta : base - delta;
      text = 'איזה מספר ' + (more ? 'גדול' : 'קטן') + ' ב-' + delta + ' מ-' + base + '?';
      spoken = 'איזה מספר ' + (more ? 'גדול' : 'קטן') + ' ב' + numWord(delta, 'm') + ' מ' + numWord(base) + '?';
      why = (more ? base + ' + ' : base + ' − ') + delta + ' = ' + ans;
    }
    return {
      type: 'neighbors', kicker: 'מספרים שכנים',
      text: text, spoken: spoken,
      html: '',
      input: 'choices',
      choices: choicesAround(ans, 0, Math.max(max + 10, ans + 10), shuffle([ans + 1, ans - 1, ans + 10, ans - 10, ans + 100, ans - 100]
        .filter(function (v) { return v >= 0 && v <= 1000 && v !== ans; })).slice(0, 3)),
      answer: ans,
      hintHtml: say(shape === 'between' ? 'מחפשים את המספר שבא אחרי הראשון ולפני השני.' : 'בודקים איזו ספרה משתנה: ' +
        (shape === 'by1' ? 'היחידות' : shape === 'by10' ? 'העשרות' : 'המאות') + '.') + step(why),
      explainHtml: say('התשובה היא <b>' + ans + '</b>.') + step(why)
    };
  }

  /* ---------- רישום הנתיב ---------- */
  Q.register({
    strand: 'place',
    generators: {
      place: genPlace, words: genWords, chart: genChart, line: genLine,
      parity: genParity, pseq: genPseq, pcompare: genPcompare, neighbors: genNeighbors
    },
    labels: {
      place: 'ערך מקום', words: 'מספר במילים', chart: 'לוח המאה', line: 'ישר המספרים',
      parity: 'זוגי ואי-זוגי', pseq: 'ספירה בקפיצות', pcompare: 'השוואת מספרים גדולים', neighbors: 'מספרים שכנים'
    },
    howTo: {
      place:     { ico: '🧱', title: 'ערך מקום',            line: 'כל ספרה שווה לפי המקום שלה: מאות, עשרות, יחידות.' },
      words:     { ico: '🔤', title: 'מספר במילים',         line: 'קוראים את המספר במילים ובוחרים את הספרות.' },
      chart:     { ico: '🔳', title: 'לוח המאה',            line: 'ימינה ועוד 1, למטה ועוד 10.' },
      line:      { ico: '📏', title: 'ישר המספרים',         line: 'מוצאים איזה מספר מסומן על הישר.' },
      parity:    { ico: '⚖️', title: 'זוגי ואי־זוגי',       line: 'מספר זוגי אפשר לחלק לזוגות בלי שארית.' },
      pseq:      { ico: '🪜', title: 'ספירה בקפיצות',       line: 'סופרים ב־1, ב־10 או ב־100 ומשלימים את החסר.' },
      pcompare:  { ico: '📊', title: 'השוואת מספרים גדולים', line: 'משווים קודם מאות, אחר כך עשרות, ואז יחידות.' },
      neighbors: { ico: '🏠', title: 'מספרים שכנים',        line: 'מוצאים את המספר שלפני, אחרי או באמצע.' }
    },
    typesForStage: function (st) {
      var t = ['place', 'pseq', 'neighbors', 'parity'];
      if (st >= 2) t = t.concat(['words', 'chart', 'line']);
      if (st >= 3) t.push('pcompare');
      return t;
    }
  });
})(window.MG);
