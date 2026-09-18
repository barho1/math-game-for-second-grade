/* ===================================================================
   questions.js – מחולל המשימות
   כל משימה מוחזרת כאובייקט שהמשחק יודע להציג:
   { type, kicker, text, html, input, choices, answer, hintHtml, explainHtml }
   רמות קושי 1..5 מותאמות לתחילת כיתה ב׳ ומתקדמות בהדרגה.
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  /* ---------- כלי עזר ---------- */
  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var OBJECTS = [
    { e: '🍎', n: 'תפוחים' }, { e: '🎈', n: 'בלונים' }, { e: '🍪', n: 'עוגיות' },
    { e: '🚗', n: 'מכוניות' }, { e: '🌸', n: 'פרחים' }, { e: '🐠', n: 'דגים' },
    { e: '⭐', n: 'כוכבים' }, { e: '🧁', n: 'קאפקייקס' }, { e: '🐝', n: 'דבורים' },
    { e: '🚀', n: 'חלליות' }, { e: '🐥', n: 'אפרוחים' }, { e: '🪁', n: 'עפיפונים' },
    { e: '🍄', n: 'פטריות' }, { e: '🐸', n: 'צפרדעים' }, { e: '🎁', n: 'מתנות' }
  ];

  var NAMES = [
    { n: 'דנה', f: true }, { n: 'נועה', f: true }, { n: 'שירה', f: true }, { n: 'מאיה', f: true },
    { n: 'יואב', f: false }, { n: 'איתי', f: false }, { n: 'עומר', f: false }, { n: 'אורי', f: false },
    { n: 'תמר', f: true }, { n: 'רוני', f: true }, { n: 'אלון', f: false }, { n: 'גיא', f: false }
  ];

  /* הגדרות טווחים לכל רמה */
  var LEVELS = {
    1: { max: 10,  sum: 10,  carry: false, seq: [1, 2, -1, -2],       count: 10, sub10: true },
    2: { max: 20,  sum: 20,  carry: false, seq: [2, 5, 10, -1, -2],   count: 20, sub10: true },
    3: { max: 20,  sum: 20,  carry: true,  seq: [3, 5, -2, -3],       count: 30, sub10: false },
    4: { max: 50,  sum: 50,  carry: true,  seq: [4, 5, 10, -5, -10],  count: 40, sub10: false },
    5: { max: 100, sum: 100, carry: true,  seq: [6, 9, 10, 25, -7, -10], count: 60, sub10: false }
  };
  function cfg(level) { return LEVELS[Math.min(5, Math.max(1, level))]; }

  /* ---------- תצוגות חזותיות ---------- */

  /* שורת אובייקטים */
  function row(count, emoji, cls) {
    var out = '';
    for (var i = 0; i < count; i++) {
      out += '<span class="item' + (cls ? ' ' + cls : '') + '" style="animation-delay:' + (i * 0.03) + 's">' + emoji + '</span>';
    }
    return out;
  }

  /* "עשירייה" – הכלי החזותי המוכר מהכיתה: מסגרת של 10 משבצות */
  function tenFrames(n, emoji) {
    var frames = Math.max(1, Math.ceil(n / 10));
    var html = '<div class="frames">';
    for (var f = 0; f < frames; f++) {
      html += '<div class="tenframe">';
      for (var i = 0; i < 10; i++) {
        var idx = f * 10 + i;
        html += '<div class="cell">' + (idx < n ? '<span>' + (emoji || '🔵') + '</span>' : '') + '</div>';
      }
      html += '</div>';
    }
    return html + '</div>';
  }

  /* ציר מספרים עם קפיצות – רק כשהטווח קצר מספיק כדי להיות קריא */
  function numberLine(from, jump, to) {
    var min = Math.max(0, Math.min(from, to) - 2);
    var max = Math.max(from, to) + 2;
    if (max - min > 22) return '';
    var span = max - min;
    var ticks = '';
    for (var v = min; v <= max; v++) {
      var p = ((v - min) / span) * 100;
      var mark = (v === from || v === to);
      ticks += '<span class="tick' + (mark ? ' mark' : '') + '" style="left:' + p + '%">' +
               '<i></i><em>' + v + '</em></span>';
    }
    var a = ((Math.min(from, to) - min) / span) * 100;
    var b = ((Math.max(from, to) - min) / span) * 100;
    var arrow = '<span class="jump" style="left:' + a + '%;width:' + (b - a) + '%">' +
                (jump > 0 ? '+' : '−') + Math.abs(jump) + '</span>';
    return '<div class="numline" dir="ltr">' + arrow + ticks + '</div>';
  }

  /* המחשת כמות: עד 20 בעשיריות, ומעל – בצרורות של 10 (ספירה בקפיצות) */
  function quantity(n, emoji) {
    if (n <= 20) return tenFrames(n, emoji);
    var tens = Math.floor(n / 10), ones = n % 10, s = '<div class="visual qty-bundles">';
    for (var i = 0; i < tens; i++) s += '<span class="grp bundle">' + row(10, emoji || '🔵') + '</span>';
    if (ones) s += '<span class="grp">' + row(ones, emoji || '🔵') + '</span>';
    return s + '</div>';
  }

  /* במספרים דו-ספרתיים ההמחשה הנכונה אינה ציור של 100 פריטים אלא פירוק:
     קופצים קודם בעשרות ואז ביחידות – בדיוק כפי שנלמד בכיתה. */
  function jumpSteps(a, b, minus) {
    var tens = Math.floor(b / 10) * 10, ones = b % 10;
    var mid = minus ? a - tens : a + tens;
    var end = minus ? mid - ones : mid + ones;
    var sign = minus ? ' − ' : ' + ';
    var lines = [];
    if (tens) lines.push(a + sign + tens + ' = ' + mid);
    if (ones) lines.push((tens ? mid : a) + sign + ones + ' = ' + end);
    if (!lines.length) lines.push(a + sign + b + ' = ' + end);
    return '<p class="q-text">קופצים קודם בעשרות ואז ביחידות:</p>' +
      lines.map(function (l) { return '<div class="equation step">' + l + '</div>'; }).join('');
  }

  /* המחשה מוחשית רק כשהמספרים קטנים; אחרת – פירוק */
  var CONCRETE_MAX = 20;

  /* ---------- בניית אפשרויות בחירה ---------- */
  function choicesAround(answer, min, max, extras) {
    var set = [answer];
    var near = Math.max(6, Math.round(answer * 0.5));   // מסיח חייב להיות קרוב מספיק כדי להיות מפתה
    (extras || []).forEach(function (v) {
      if (v !== answer && v >= min && v <= max && Math.abs(v - answer) <= near && set.indexOf(v) < 0) set.push(v);
    });
    // מסיחים קרובים לתשובה; קפיצה של 10 רק כשהמספרים דו-ספרתיים
    var pool = answer >= 20 ? [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10] : [-3, -2, -1, 1, 2, 3, 4, -4];
    var guard = 0;
    while (set.length < 4 && guard++ < 200) {
      var v = answer + pick(pool);
      if (v >= min && v <= max && set.indexOf(v) < 0) set.push(v);
    }
    // גיבוי: עדיין בסביבת התשובה, לא מספר אקראי מהטווח כולו
    guard = 0;
    while (set.length < 4 && guard++ < 200) {
      var v2 = rnd(Math.max(min, answer - 6), Math.min(max, answer + 6));
      if (set.indexOf(v2) < 0) set.push(v2);
    }
    while (set.length < 4) {
      var v3 = rnd(min, max);
      if (set.indexOf(v3) < 0) set.push(v3);
    }
    return shuffle(set).map(function (v) { return { v: v, sym: String(v) }; });
  }

  /* ---------- מחוללי משימות ---------- */

  function genAdd(level, hint) {
    var c = cfg(level), a, b;
    if (level <= 2 && Math.random() < 0.07) {
      // חיבור עם 0 – מושג בסיסי שכדאי לתרגל
      a = rnd(0, c.sum); b = 0;
      if (Math.random() < 0.5) { b = a; a = 0; }
    } else {
      do {
        a = rnd(1, c.sum - 1);
        b = rnd(1, c.sum - a);
        if (!c.carry && (a % 10) + (b % 10) > 10) { a = 0; }  // בלי חצייה של העשרת (השלמה ל-10 מותרת)
      } while (a < 1 || b < 1);
    }
    var ans = a + b;
    var obj = pick(OBJECTS);
    var visual = '';
    if (level <= 2 || hint) {
      visual = (a <= 12 && b <= 12)
        ? '<div class="visual"><span class="grp">' + row(a, obj.e) + '</span>' +
          '<span class="op">+</span><span class="grp">' + row(b, obj.e) + '</span></div>'
        : (hint ? quantity(a, obj.e) + '<div class="visual op-row"><span class="op">+</span></div>' +
                  quantity(b, obj.e) : '');
    }
    return {
      type: 'add', kicker: 'חיבור',
      html: '<div class="equation">' + a + ' <span>+</span> ' + b + ' <span>=</span> <span class="blank">?</span></div>' + visual,
      input: 'choices',
      choices: choicesAround(ans, 0, c.sum + 12, [a + b + 1, a + b - 1, Math.abs(a - b)]),
      answer: ans,
      hintHtml: ans <= CONCRETE_MAX
        ? numberLine(a, b, ans) + quantity(ans, obj.e)
        : jumpSteps(a, b, false),
      explainHtml: '<div class="equation">' + a + ' + ' + b + ' = <b>' + ans + '</b></div>' +
        (ans <= CONCRETE_MAX
          ? '<p class="q-text">מתחילים מ-' + a + ' וסופרים ' + b + ' קדימה.</p>' + numberLine(a, b, ans)
          : jumpSteps(a, b, false))
    };
  }

  function genSub(level, hint) {
    var c = cfg(level);
    var a, b;
    if (level <= 2 && Math.random() < 0.07) {
      // X−0 ו-X−X: שני מקרי קצה שילדים צריכים להכיר
      a = rnd(1, c.sum);
      b = Math.random() < 0.5 ? 0 : a;
    } else {
      a = rnd(3, c.sum);
      b = rnd(1, Math.min(a - 1, c.sub10 ? a - 1 : c.max));
      if (!c.carry && (a % 10) < (b % 10)) b = a % 10 === 0 ? b : rnd(1, a % 10 || 1);
    }
    var ans = a - b;
    var obj = pick(OBJECTS);
    var visual = '';
    if (level <= 2 || hint) {
      visual = (a <= 12)
        ? '<div class="visual"><span class="grp">' + row(ans, obj.e) + row(b, obj.e, 'gone') + '</span></div>'
        : (hint ? quantity(a, obj.e) + '<p class="q-text">מתוכם מורידים ' + b + '.</p>' : '');
    }
    return {
      type: 'sub', kicker: 'חיסור',
      html: '<div class="equation">' + a + ' <span>−</span> ' + b + ' <span>=</span> <span class="blank">?</span></div>' + visual,
      input: 'choices',
      choices: choicesAround(ans, 0, c.sum, [ans + 1, ans - 1, a + b]),
      answer: ans,
      hintHtml: a <= CONCRETE_MAX
        ? numberLine(a, -b, ans) + quantity(a, obj.e)
        : jumpSteps(a, b, true),
      explainHtml: '<div class="equation">' + a + ' − ' + b + ' = <b>' + ans + '</b></div>' +
        (a <= CONCRETE_MAX
          ? '<p class="q-text">מתחילים מ-' + a + ' וסופרים ' + b + ' אחורה.</p>' + numberLine(a, -b, ans)
          : jumpSteps(a, b, true))
    };
  }

  function genMissing(level, hint) {
    var c = cfg(level);
    var shape = pick(['a+?=c', '?+b=c', 'a-?=c']);
    var a, b, cc, ans, eq;
    if (shape === 'a-?=c') {
      a = rnd(4, c.sum); ans = rnd(1, a - 1); cc = a - ans;
      eq = a + ' <span>−</span> <span class="blank">?</span> <span>=</span> ' + cc;
    } else {
      a = rnd(1, c.sum - 2); b = rnd(1, c.sum - a); cc = a + b;
      if (shape === 'a+?=c') { ans = b; eq = a + ' <span>+</span> <span class="blank">?</span> <span>=</span> ' + cc; }
      else { ans = a; eq = '<span class="blank">?</span> <span>+</span> ' + b + ' <span>=</span> ' + cc; }
    }
    var usePad = level >= 3;
    return {
      type: 'missing', kicker: 'מה חסר?',
      text: 'איזה מספר מסתתר במשבצת?',
      html: '<div class="equation">' + eq + '</div>' +
        ((hint || level <= 2) && cc <= CONCRETE_MAX ? quantity(cc, '🔵') : ''),
      input: usePad ? 'pad' : 'choices',
      choices: usePad ? null : choicesAround(ans, 0, c.sum, [ans + 1, ans - 1, cc]),
      answer: ans,
      hintHtml: cc <= CONCRETE_MAX
        ? quantity(cc, '🔵') + '<p class="q-text">כמה עוד צריך כדי להגיע ל-' + cc + '?</p>'
        : '<p class="q-text">כמה חסר כדי להגיע ל-' + cc + '? אפשר לקפוץ קודם בעשרות ואז ביחידות.</p>',
      explainHtml: '<div class="equation">' + eq.replace('<span class="blank">?</span>', '<b>' + ans + '</b>') + '</div>' +
        '<p class="q-text">בודקים: התשובה משלימה בדיוק ל-' + cc + '.</p>'
    };
  }

  /* בונה תרגיל שתוצאתו value, לצורך השוואה בין שני תרגילים */
  function exprFor(value, maxv) {
    if (value >= 2 && Math.random() < 0.5) {
      var a2 = rnd(1, value - 1);
      return a2 + ' + ' + (value - a2);
    }
    var room = Math.min(9, maxv - value);
    if (room >= 1) { var y = rnd(1, room); return (value + y) + ' − ' + y; }
    var a3 = rnd(1, Math.max(1, value - 1));
    return a3 + ' + ' + (value - a3);
  }

  function genCompare(level) {
    var c = cfg(level);
    var left, right, lv, rv;
    if (level >= 4 && Math.random() < 0.35) {
      // תרגיל מול תרגיל: 20+10 ? 15+15
      var x = rnd(1, Math.floor(c.max / 2)), y2 = rnd(1, Math.floor(c.max / 2));
      lv = x + y2; left = x + ' + ' + y2;
      rv = Math.random() < 0.35 ? lv : clamp(lv + pick([-5, -3, -2, -1, 1, 2, 3, 5]), 2, c.max);
      right = exprFor(rv, c.max);
    } else if (level >= 3 && Math.random() < 0.55) {
      var a = rnd(1, Math.min(12, c.sum - 1)), b = rnd(1, Math.min(9, c.sum - a));
      lv = a + b; left = a + ' + ' + b;
      rv = Math.random() < 0.35 ? lv : clamp(lv + pick([-3, -2, -1, 1, 2, 3]), 0, c.max);
      right = String(rv);
    } else {
      lv = rnd(0, c.max); left = String(lv);
      rv = Math.random() < 0.25 ? lv : clamp(lv + pick([-10, -5, -2, -1, 1, 2, 5, 10]), 0, c.max);
      right = String(rv);
    }
    var ans = lv > rv ? '>' : (lv < rv ? '<' : '=');

    /* ההמחשה חייבת לשקף את הכמות האמיתית. עד 20 – ריבוע לכל יחידה.
       מעל 20 – פירוק לעשרות ויחידות, שהוא גם הדרך הנכונה להשוות דו-ספרתיים. */
    function pvRow(n, tenE, oneE) {
      var t = Math.floor(n / 10), o = n % 10;
      return '<div class="pv"><b class="pv-n">' + n + '</b>' +
        '<span class="pv-part"><span class="pv-items">' + row(t, tenE) + '</span>' +
        '<span class="pv-lbl">' + t + ' עשרות</span></span>' +
        '<span class="pv-part"><span class="pv-items pv-ones">' + row(o, oneE) + '</span>' +
        '<span class="pv-lbl">' + o + ' יחידות</span></span></div>';
    }
    function sideBySide() {
      if (Math.max(lv, rv) <= 20) {
        return '<div class="visual"><span class="grp">' + row(lv, '🟦') + '</span>' +
               '<span class="divider"></span><span class="grp">' + row(rv, '🟨') + '</span></div>';
      }
      return '<div class="pv-compare">' + pvRow(lv, '🟦', '🔹') + pvRow(rv, '🟨', '🔸') + '</div>';
    }
    function hintText() {
      var pre = '';
      if (/[+−]/.test(left)) pre += '<p class="q-text">קודם מחשבים: ' + left + ' = ' + lv + '.</p>';
      if (/[+−]/.test(right)) pre += '<p class="q-text">וגם: ' + right + ' = ' + rv + '.</p>';
      if (Math.max(lv, rv) <= 20) return pre + '<p class="q-text">הפה של התנין 🐊 תמיד נפתח אל המספר הגדול.</p>';
      var lt = Math.floor(lv / 10), rt = Math.floor(rv / 10);
      return pre + '<p class="q-text">משווים קודם את העשרות: ל-' + lv + ' יש ' + lt +
             ' עשרות, ול-' + rv + ' יש ' + rt + ' עשרות.' +
             (lt === rt ? ' העשרות שוות, ולכן משווים את היחידות.' : '') + '</p>';
    }

    return {
      type: 'compare', kicker: 'השוואה',
      text: 'איזה סימן מתאים?',
      html: '<div class="equation">' + left + ' <span class="slot">?</span> ' + right + '</div>' +
        (level <= 2 ? sideBySide() : ''),
      input: 'choices',
      choices: shuffle([
        { v: '>', sym: '&gt;', label: 'גדול מ־' },
        { v: '<', sym: '&lt;', label: 'קטן מ־' },
        { v: '=', sym: '=', label: 'שווה ל־' }
      ]),
      answer: ans,
      hintHtml: hintText() + sideBySide(),
      explainHtml: '<div class="equation">' + left + ' <b>' + (ans === '>' ? '&gt;' : ans === '<' ? '&lt;' : '=') + '</b> ' + right + '</div>' +
        '<p class="q-text">' + (ans === '=' ? (lv + ' שווה ל-' + rv + '.') : (ans === '>' ? (lv + ' גדול מ-' + rv + '.') : (lv + ' קטן מ-' + rv + '.'))) + '</p>'
    };
  }

  function genSequence(level) {
    var c = cfg(level);
    // רק צעדים שכל חמשת האיברים שלהם נכנסים בטווח הרמה
    var usable = c.seq.filter(function (s) { return Math.abs(s) * 4 <= c.max; });
    if (!usable.length) usable = [1];
    var step = pick(usable);
    var span = Math.abs(step) * 4;
    var start = step > 0 ? rnd(0, c.max - span) : rnd(span, c.max);
    var arr = [];
    for (var i = 0; i < 5; i++) arr.push(start + step * i);
    // הנעלם יכול להופיע בסוף, באמצע, וברמות הגבוהות גם בהתחלה
    var hideIdx = level <= 2 ? pick([3, 4]) : (level === 3 ? pick([1, 2, 3, 4]) : pick([0, 1, 2, 3, 4]));
    var ans = arr[hideIdx];
    var html = '<div class="seq">' + arr.map(function (v, i) {
      return i === hideIdx ? '<span class="blank">?</span>' : '<span>' + v + '</span>';
    }).join('') + '</div>';
    return {
      type: 'sequence', kicker: 'סדרה',
      text: 'מה החוקיות? איזה מספר חסר?',
      html: html,
      input: 'choices',
      choices: choicesAround(ans, 0, Math.max(c.max, ans + 10), [ans + step, ans - step, ans + 1]),
      answer: ans,
      hintHtml: '<p class="q-text">בכל פעם ' + (step > 0 ? 'מוסיפים ' : 'מורידים ') + Math.abs(step) + '.</p>',
      explainHtml: '<p class="q-text">בסדרה הזו ' + (step > 0 ? 'מוסיפים' : 'מורידים') + ' ' + Math.abs(step) +
        ' בכל צעד, ולכן המספר החסר הוא <b>' + ans + '</b>.</p>' +
        '<div class="seq">' + arr.map(function (v, i) { return '<span' + (i === hideIdx ? ' class="blank"' : '') + '>' + v + '</span>'; }).join('') + '</div>'
    };
  }

  /* תרגיל חזותי בלבד – בלי ספרות בשאלה */
  function genVisual(level) {
    var c = cfg(level);
    var obj = pick(OBJECTS);
    var plus = Math.random() < 0.6;
    var a, b, ans, html;
    if (plus) {
      a = rnd(2, Math.min(9, Math.floor(c.sum / 2)));
      b = rnd(1, Math.min(9, c.sum - a));
      ans = a + b;
      html = '<div class="visual"><span class="grp">' + row(a, obj.e) + '</span><span class="op">+</span>' +
             '<span class="grp">' + row(b, obj.e) + '</span><span class="op">=</span><span class="op">?</span></div>';
    } else {
      a = rnd(3, Math.min(12, c.sum));
      b = rnd(1, a - 1);
      ans = a - b;
      html = '<div class="visual"><span class="grp">' + row(ans, obj.e) + row(b, obj.e, 'gone') + '</span>' +
             '<span class="op">=</span><span class="op">?</span></div>';
    }
    return {
      type: 'visual', kicker: 'סופרים ומחשבים',
      text: plus ? 'כמה יש בסך הכול?' : 'כמה נשארו? (המטושטשים הלכו)',
      html: html,
      input: 'choices',
      choices: choicesAround(ans, 0, c.sum + 5, [ans + 1, ans - 1, a]),
      answer: ans,
      hintHtml: quantity(ans, obj.e) + '<p class="q-text">סופרים יחד, אחד-אחד.</p>',
      explainHtml: '<div class="equation">' + (plus ? a + ' + ' + b : a + ' − ' + b) + ' = <b>' + ans + '</b></div>' +
        (ans <= CONCRETE_MAX ? quantity(ans, obj.e) : '')
    };
  }

  function genCount(level) {
    var c = cfg(level);
    var obj = pick(OBJECTS);
    var n = rnd(Math.max(4, Math.floor(c.count / 3)), c.count);
    var html;
    if (n <= 20) {
      html = quantity(n, obj.e);
    } else { // קבוצות של 10 – מעודד ספירה בקפיצות
      var tens = Math.floor(n / 10), ones = n % 10, s = '<div class="visual">';
      for (var i = 0; i < tens; i++) s += '<span class="grp bundle">' + row(10, obj.e) + '</span>';
      if (ones) s += '<span class="grp">' + row(ones, obj.e) + '</span>';
      html = s + '</div>';
    }
    return {
      type: 'count', kicker: 'ספירה',
      text: 'כמה יש כאן?',
      html: html,
      input: 'choices',
      choices: choicesAround(n, 0, c.count + 10, [n + 1, n - 1, n + 10]),
      answer: n,
      hintHtml: '<p class="q-text">אפשר לספור בקפיצות של 10 ואז להוסיף את הבודדים.</p>',
      explainHtml: '<p class="q-text">יש כאן <b>' + n + '</b>.</p>' + quantity(n, obj.e)
    };
  }

  function genWord(level) {
    var c = cfg(level);
    var p = pick(NAMES), obj = pick(OBJECTS);
    var kind = pick(['join', 'take', 'diff', 'need']);
    var a, b, ans, text, eq;
    if (kind === 'join') {
      a = rnd(2, Math.max(3, c.sum - 3)); b = rnd(1, c.sum - a); ans = a + b;
      text = 'ל' + p.n + ' היו ' + a + ' ' + obj.n + '. ' + (p.f ? 'היא קיבלה' : 'הוא קיבל') + ' עוד ' + b + '. כמה יש ' + (p.f ? 'לה' : 'לו') + ' עכשיו?';
      eq = a + ' + ' + b + ' = ' + ans;
    } else if (kind === 'take') {
      a = rnd(4, c.sum); b = rnd(1, a - 1); ans = a - b;
      text = 'ל' + p.n + ' היו ' + a + ' ' + obj.n + '. ' + (p.f ? 'היא נתנה' : 'הוא נתן') + ' ' + b + ' לחבר. כמה נשארו?';
      eq = a + ' − ' + b + ' = ' + ans;
    } else if (kind === 'diff') {
      var p2 = pick(NAMES.filter(function (x) { return x.n !== p.n; }));
      a = rnd(3, c.sum); b = rnd(1, a - 1); ans = a - b;
      text = 'ל' + p.n + ' יש ' + a + ' ' + obj.n + ' ול' + p2.n + ' יש ' + b + '. בכמה יש ל' + p.n + ' יותר?';
      eq = a + ' − ' + b + ' = ' + ans;
    } else {
      a = rnd(1, c.sum - 2); var cc = rnd(a + 1, c.sum); ans = cc - a;
      text = 'ל' + p.n + ' יש ' + a + ' ' + obj.n + '. כמה עוד ' + (p.f ? 'היא צריכה' : 'הוא צריך') + ' כדי שיהיו ' + cc + '?';
      eq = a + ' + ' + ans + ' = ' + cc;
    }
    return {
      type: 'word', kicker: 'בעיה מילולית',
      text: text,
      html: a <= 12 ? '<div class="visual small">' + row(a, obj.e) + '</div>'
                    : '<div class="visual" style="font-size:2.6rem">' + obj.e + '</div>',
      input: 'choices',
      choices: choicesAround(ans, 0, c.sum + 5, [ans + 1, ans - 1, a]),
      answer: ans,
      hintHtml: '<p class="q-text">' + (kind === 'join' || kind === 'need' ? 'מוסיפים ➕' : 'מורידים ➖') +
        (a <= CONCRETE_MAX ? ' – בואו נצייר את זה:</p>' + quantity(a, obj.e)
                           : ' – כדאי לקפוץ בעשרות ואז ביחידות.</p>'),
      explainHtml: '<div class="equation">' + eq + '</div><p class="q-text">' + answerSentence(kind, p, ans, obj) + '</p>'
    };
  }

  function answerSentence(kind, p, ans, obj) {
    if (kind === 'join') return 'עכשיו יש ל' + p.n + ' <b>' + ans + '</b> ' + obj.n + '.';
    if (kind === 'take') return 'נשארו <b>' + ans + '</b> ' + obj.n + '.';
    if (kind === 'diff') return 'ל' + p.n + ' יש <b>' + ans + '</b> ' + obj.n + ' יותר.';
    return 'צריך עוד <b>' + ans + '</b> ' + obj.n + '.';
  }

  var GENERATORS = {
    add: genAdd, sub: genSub, missing: genMissing, compare: genCompare,
    sequence: genSequence, visual: genVisual, count: genCount, word: genWord
  };

  MG.Questions = {
    TYPE_LABELS: {
      add: 'חיבור', sub: 'חיסור', missing: 'השלמת מספר חסר', compare: 'השוואת מספרים',
      sequence: 'סדרות וחוקיות', visual: 'תרגיל חזותי', count: 'ספירה', word: 'בעיות מילוליות'
    },

    /* אילו סוגי תרגילים נפתחים בכל רמה – הדרגתיות */
    typesForLevel: function (level) {
      if (level <= 1) return ['count', 'visual', 'add', 'sub', 'compare', 'sequence'];
      if (level === 2) return ['add', 'sub', 'visual', 'compare', 'sequence', 'missing', 'count', 'word'];
      return ['add', 'sub', 'missing', 'compare', 'sequence', 'word', 'visual', 'count'];
    },

    generate: function (level, type, hint) {
      var types = this.typesForLevel(level);
      var t = (type && GENERATORS[type]) ? type : pick(types);
      var q = GENERATORS[t](level, !!hint);
      q.level = level;
      return q;
    },

    /* רשימת סוגים מעורבבת למשימה, כדי למנוע תחושת חזרתיות */
    missionPlan: function (level, count) {
      var types = shuffle(this.typesForLevel(level));
      var plan = [];
      while (plan.length < count) plan = plan.concat(types);
      return plan.slice(0, count);
    },

    _util: { rnd: rnd, pick: pick, shuffle: shuffle }
  };
})(window.MG);
