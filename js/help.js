/* ===================================================================
   help.js — הוראות ועזרה בתוך המשחק
   מיועד לילדי תחילת כיתה ב׳, שחלקם עדיין לא קוראים בשטף:
   כל הסבר הוא משפט אחד קצר, מלווה בדוגמה אמיתית, וניתן להקראה.
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var S = MG.Storage, Q = MG.Questions, Sp = MG.Speech;
  var deps = {};            // מוזרק מ-app.js: confetti, audio, go
  var tour = null;          // מצב הסיור הפעיל

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function state() { return S.get().help; }
  function save() { S.save(); }

  /* ---------- כפתור רמקול ---------- */
  function speaker(text) {
    if (!Sp.available()) return null;
    var b = el('button', 'speak-btn');
    b.type = 'button';
    b.textContent = '🔊';
    b.title = 'הקראה';
    b.setAttribute('aria-label', 'הקראה');
    b.onclick = function (ev) {
      ev.stopPropagation();
      Sp.prime();
      Sp.speak(text);
    };
    return b;
  }

  /* שורה של הסבר: אייקון, משפט, ורמקול */
  function helpRow(ico, line) {
    var row = el('div', 'help-row');
    row.appendChild(el('span', 'help-ico', ico));
    row.appendChild(el('span', 'help-line', line));
    var sp = speaker(line);
    if (sp) row.appendChild(sp);
    return row;
  }

  /* ---------- תוכן העזרה לפי מסך ---------- */
  var SHEETS = {
    home: { ico: '🗺️', title: 'המפה', rows: [
      ['🌍', 'כל עולם הוא הרפתקה חדשה.'],
      ['👆', 'לוחצים על עולם כדי להתחיל.'],
      ['⭐', 'כוכבים פותחים עולמות נעולים.']
    ] },
    play: { ico: '🎮', title: 'איך משחקים', rows: [
      ['👆', 'לוחצים על התשובה הנכונה.'],
      ['💛', 'טעות זה בסדר. מקבלים רמז.'],
      ['🏃', 'הפס למעלה מראה כמה נשאר.']
    ] },
    avatar: { ico: '🎨', title: 'הדמות שלי', rows: [
      ['🐼', 'בוחרים חבר שילווה אתכם.'],
      ['🌈', 'בוחרים צבע שאוהבים.'],
      ['👑', 'כובעים קונים בחנות.']
    ] },
    collection: { ico: '🎁', title: 'האוסף שלי', rows: [
      ['❓', 'מדבקה עם סימן שאלה עוד לא נאספה.'],
      ['🏅', 'מדליות מקבלים על הישגים.'],
      ['📈', 'למטה רואים כמה התקדמתם.']
    ] },
    shop: { ico: '🛍️', title: 'החנות', rows: [
      ['🪙', 'קונים במטבעות שאספתם.'],
      ['👑', 'כובע נלבש על הדמות שלכם.'],
      ['🎁', 'תיבת הפתעה נותנת מדבקה.']
    ] },
    parent: { ico: '⚙️', title: 'אזור ההורים', rows: [
      ['👨‍👩‍👧', 'המסך הזה מיועד למבוגרים.'],
      ['⏳', 'כאן קובעים כמה זמן משחקים.']
    ] },
    result: { ico: '🎉', title: 'סיימתם משימה', rows: [
      ['⭐', 'כוכבים לפי כמה ענו נכון.'],
      ['▶', 'אפשר לצאת למשימה נוספת.']
    ] },
    timeup: { ico: '🌙', title: 'נגמר הזמן', rows: [
      ['🌙', 'סיימנו להיום. נתראה מחר!'],
      ['⚙️', 'הורים יכולים להוסיף זמן.']
    ] }
  };

  /* ---------- חלון עזרה כללי ---------- */
  function sheet(opts) {
    var root = $('modal-root');
    root.innerHTML = '';
    var box = el('div', 'modal help-sheet');
    var head = el('div', 'help-head');
    head.appendChild(el('div', 'm-emoji', opts.ico || '❓'));
    head.appendChild(el('h3', null, opts.title || 'עזרה'));
    box.appendChild(head);

    var body = el('div', 'help-rows');
    (opts.rows || []).forEach(function (r) { body.appendChild(helpRow(r[0], r[1])); });
    box.appendChild(body);
    if (opts.extra) box.appendChild(opts.extra);

    var row = el('div', 'btn-row');
    row.style.justifyContent = 'center';
    (opts.buttons || []).forEach(function (b) {
      var btn = el('button', 'btn ' + (b.primary === false ? 'btn-ghost' : 'btn-primary'));
      btn.textContent = b.text;
      btn.onclick = function () {
        if (deps.audio) deps.audio.click();
        Sp.stop();
        root.innerHTML = '';
        if (b.fn) b.fn();
      };
      row.appendChild(btn);
    });
    box.appendChild(row);
    root.appendChild(box);
    return box;
  }

  /* ---------- הסבר על סוג תרגיל, בפעם הראשונה ---------- */
  function explainType(type, done) {
    var info = Q.HOW_TO[type];
    if (!info) { done(); return; }
    var demo = Q.generate(1, type, false);      // רמה 1 = הדוגמה הפשוטה ביותר
    var ans = demo.choices
      ? (demo.choices.filter(function (c) { return c.v === demo.answer; })[0] || {}).sym
      : demo.answer;

    var extra = el('div', 'demo-box');
    extra.appendChild(el('div', 'demo-label', 'לדוגמה:'));
    extra.appendChild(el('div', 'demo-q', (demo.text ? '<div class="q-text">' + demo.text + '</div>' : '') + demo.html));
    extra.appendChild(el('div', 'demo-answer', 'התשובה: <b dir="ltr">' + ans + '</b>'));

    var seen = state().seenTypes;
    if (seen.indexOf(type) < 0) { seen.push(type); save(); }

    sheet({
      ico: info.ico,
      title: info.title,
      rows: [[ '👆', info.line ]],
      extra: extra,
      buttons: [{ text: 'הבנתי, מתחילים!', fn: done }]
    });
    if (Sp.autoRead()) Sp.speak(info.title + '. ' + info.line);
  }

  /* ---------- הסיור ---------- */
  var STEPS = [
    { target: '#chip-avatar', ico: '🦊', line: 'זאת הדמות שלך.' },
    { target: '.world',       ico: '🌼', line: 'כאן בוחרים לאן יוצאים.' },
    { practice: true,         ico: '👆', line: 'נסו! לוחצים על התשובה.' },
    { target: '.topbar',      ico: '🪙', line: 'כאן המטבעות, הכוכבים והעזרה.' }
  ];

  function closeTour(markDone) {
    if (!tour) return;
    window.removeEventListener('resize', positionStep);
    var root = $('tour-root');
    root.classList.add('hidden');
    root.innerHTML = '';
    tour = null;
    Sp.stop();
    if (markDone) { state().tourDone = true; save(); }
    if (deps.onTourEnd) deps.onTourEnd();
  }

  function positionStep() {
    if (!tour) return;
    var step = STEPS[tour.i];
    var hole = $('tour-hole');
    var card = $('tour-card');
    if (!hole || !card) return;

    var root = $('tour-root');
    if (step.practice || !step.target) {
      hole.style.display = 'none';
      root.classList.add('tour-dim');   // אין זרקור, ולכן מחשיכים את כל הרקע
      card.style.top = '';
      card.classList.add('centered');
      return;
    }
    var node = document.querySelector(step.target);
    if (!node) {
      hole.style.display = 'none'; root.classList.add('tour-dim');
      card.classList.add('centered'); return;
    }
    root.classList.remove('tour-dim');

    var r = node.getBoundingClientRect();
    var pad = 8;
    hole.style.display = 'block';
    hole.style.top = (r.top - pad) + 'px';
    hole.style.left = (r.left - pad) + 'px';
    hole.style.width = (r.width + pad * 2) + 'px';
    hole.style.height = (r.height + pad * 2) + 'px';

    card.classList.remove('centered');
    // הכרטיס מתחת לאלמנט, ואם אין מקום – מעליו
    var below = r.bottom + 14;
    var fits = below + card.offsetHeight < window.innerHeight - 10;
    card.style.top = (fits ? below : Math.max(10, r.top - card.offsetHeight - 14)) + 'px';
  }

  function practiceCard(card, next) {
    // הטעימה הראשונה חייבת להיות המובנת ביותר: חיבור של שתי קבוצות קטנות.
    // וריאנט החיסור של אותו סוג מציג פריטים מטושטשים, וזה מושג שדורש הסבר.
    function simple(c) { return c.answer <= 6 && /בסך הכול/.test(c.text || ''); }
    var q = Q.generate(1, 'visual', false);
    for (var t = 0; t < 120 && !simple(q); t++) q = Q.generate(1, 'visual', false);
    var right = q.choices.filter(function (c) { return c.v === q.answer; })[0];
    var wrong = q.choices.filter(function (c) { return c.v !== q.answer; })[0];
    var opts = Math.random() < 0.5 ? [right, wrong] : [wrong, right];

    var box = el('div', 'tour-practice');
    box.appendChild(el('div', 'q-text', q.text));
    box.appendChild(el('div', null, q.html));

    var answers = el('div', 'tour-answers');
    opts.forEach(function (c) {
      var b = el('button', 'ans');
      b.innerHTML = '<span class="sym">' + c.sym + '</span>';
      b.onclick = function () {
        if (c.v === q.answer) {
          b.classList.add('correct');
          if (deps.audio) deps.audio.correct();
          if (deps.confetti) deps.confetti(26);
          // מסירים הודעת "כמעט" קודמת, אחרת שתי ההודעות מוצגות יחד
          var prev = box.querySelector('.tour-praise');
          if (prev) prev.remove();
          var msg = el('div', 'tour-praise', 'כל הכבוד! 🎉');
          box.appendChild(msg);
          if (Sp.enabled()) Sp.speak('כל הכבוד!');
          answers.querySelectorAll('.ans').forEach(function (x) { x.disabled = true; });
          setTimeout(next, 1300);
        } else {
          b.classList.add('wrong');
          b.disabled = true;
          if (deps.audio) deps.audio.wrong();
          var m = box.querySelector('.tour-praise');
          if (!m) {
            m = el('div', 'tour-praise soft', 'כמעט! נסו שוב 💛');
            box.appendChild(m);
            if (Sp.enabled()) Sp.speak('כמעט, נסו שוב');
          }
        }
      };
      answers.appendChild(b);
    });
    box.appendChild(answers);
    card.appendChild(box);
  }

  function renderStep() {
    var step = STEPS[tour.i];
    var root = $('tour-root');
    root.innerHTML = '';
    root.classList.remove('hidden');

    root.appendChild(el('div', 'tour-hole')).id = 'tour-hole';
    var card = el('div', 'tour-card');
    card.id = 'tour-card';

    var head = el('div', 'tour-head');
    head.appendChild(el('span', 'tour-ico', step.ico));
    head.appendChild(el('span', 'tour-line', step.line));
    var sp = speaker(step.line);
    if (sp) head.appendChild(sp);
    card.appendChild(head);

    if (step.practice) practiceCard(card, nextStep);

    var row = el('div', 'tour-btns');
    if (!step.practice) {
      var nextBtn = el('button', 'btn btn-primary');
      nextBtn.textContent = (tour.i === STEPS.length - 1) ? 'יאללה, מתחילים!' : 'הבא ➜';
      nextBtn.onclick = function () { if (deps.audio) deps.audio.click(); nextStep(); };
      row.appendChild(nextBtn);
    }
    var skip = el('button', 'btn btn-ghost btn-small');
    skip.textContent = 'דילוג';
    skip.onclick = function () { if (deps.audio) deps.audio.click(); closeTour(true); };
    row.appendChild(skip);
    card.appendChild(row);

    root.appendChild(card);
    // מודדים אחרי שהכרטיס נמצא ב-DOM, אחרת אין לו גובה
    requestAnimationFrame(positionStep);
    if (Sp.enabled()) { Sp.prime(); Sp.speak(step.line); }

    var dots = el('div', 'tour-dots');
    for (var i = 0; i < STEPS.length; i++) {
      dots.appendChild(el('span', 'tour-dot' + (i === tour.i ? ' on' : '')));
    }
    card.appendChild(dots);
  }

  function nextStep() {
    if (!tour) return;
    tour.i++;
    if (tour.i >= STEPS.length) { closeTour(true); return; }
    renderStep();
  }

  function startTour() {
    if (deps.go) deps.go('home');
    tour = { i: 0 };
    window.addEventListener('resize', positionStep);
    setTimeout(renderStep, 120);   // אחרי שהמסך מרונדר, כדי שהמדידה תהיה נכונה
  }

  /* ---------- האצבע המנחה ---------- */
  function maybeHand() {
    if (state().handShown) return;
    var box = $('answers');
    if (!box || !box.children.length) return;
    state().handShown = true; save();
    var hand = el('div', 'point-hand', '👆');
    box.appendChild(hand);
    var kill = function () { if (hand.parentNode) hand.remove(); };
    setTimeout(kill, 2800);
    box.addEventListener('click', kill, { once: true });
  }

  MG.Help = {
    init: function (d) { deps = d || {}; },

    speaker: speaker,

    /* מופעל פעם אחת, בכניסה הראשונה */
    maybeTour: function () {
      if (state().tourDone) return false;
      startTour();
      return true;
    },
    startTour: startTour,
    closeTour: function () { closeTour(false); },
    tourOpen: function () { return !!tour; },

    needsExplain: function (type) { return state().seenTypes.indexOf(type) < 0; },
    explainType: explainType,

    maybeHand: maybeHand,

    /* גיליון העזרה של המסך הנוכחי */
    openFor: function (screen) {
      var conf = SHEETS[screen] || SHEETS.home;
      sheet({
        ico: conf.ico,
        title: conf.title,
        rows: conf.rows,
        buttons: [
          { text: 'הבנתי', fn: null },
          { text: '▶ סיור מחדש', primary: false, fn: function () { startTour(); } }
        ]
      });
    },

    resetSeen: function () {
      var h = state();
      h.tourDone = false;
      h.seenTypes = [];
      h.seenScreens = [];
      h.handShown = false;
      save();
    }
  };
})(window.MG);
