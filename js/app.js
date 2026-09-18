/* ===================================================================
   app.js – לב המשחק: ניווט, לולאת המשחק, מנוע ההתאמה האישית והממשק
   =================================================================== */
(function (MG) {
  'use strict';

  var S = MG.Storage, Q = MG.Questions, R = MG.Rewards, T = MG.Timer, A = MG.Audio;

  /* ---------- כלי עזר קטנים ---------- */
  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function on(elm, ev, fn) { if (elm) elm.addEventListener(ev, fn); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    $('toast-root').appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function modal(opts) {
    var root = $('modal-root');
    root.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML =
      (opts.emoji ? '<div class="m-emoji">' + opts.emoji + '</div>' : '') +
      (opts.title ? '<h3>' + opts.title + '</h3>' : '') +
      (opts.body ? '<p>' + opts.body + '</p>' : '') +
      '<div class="btn-row" style="justify-content:center"></div>';
    var rowEl = box.querySelector('.btn-row');
    (opts.buttons || [{ text: 'סבבה!' }]).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.primary === false ? 'btn-ghost' : 'btn-primary');
      btn.textContent = b.text;
      btn.onclick = function () { A.click(); root.innerHTML = ''; if (b.fn) b.fn(); };
      rowEl.appendChild(btn);
    });
    root.appendChild(box);
  }

  var COLORS = ['#ffd166', '#ff8fb1', '#9d7bff', '#4cc9f0', '#52d1a4', '#ff9f68', '#b5e48c', '#ffffff'];
  function confetti(n) {
    var layer = $('fx-layer');
    for (var i = 0; i < (n || 26); i++) {
      var c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.top = '-20px';
      c.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      c.style.animationDuration = (1.1 + Math.random() * 1.1) + 's';
      c.style.animationDelay = (Math.random() * 0.25) + 's';
      layer.appendChild(c);
      (function (node) { setTimeout(function () { node.remove(); }, 2600); })(c);
    }
  }

  function floater(emoji, fromEl) {
    var layer = $('fx-layer');
    var rect = fromEl ? fromEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0 };
    var f = document.createElement('div');
    f.className = 'floater';
    f.textContent = emoji;
    f.style.left = (rect.left + rect.width / 2 - 16) + 'px';
    f.style.top = (rect.top - 10) + 'px';
    layer.appendChild(f);
    setTimeout(function () { f.remove(); }, 1300);
  }

  /* ---------- מצב ריצה ---------- */
  var ui = { screen: 'home', parentUnlocked: false, gateAnswer: 0 };
  var adaptive = { goodRun: 0, recent: [], hintLeft: 0 };
  var mission = null;
  var timeUpPending = false;   // הזמן נגמר, ומחכים שהתרגיל הנוכחי יסתיים
  var lastEarned = null;       // מה נצבר בסיבוב שנקטע, להצגה במסך הפרידה

  /* ---------- סרגלים עליון/תחתון ---------- */
  function renderHeader() {
    var s = S.get();
    $('stat-stars').textContent = s.progress.stars;
    $('stat-coins').textContent = s.progress.coins;
    $('chip-face').textContent = s.player.face;
    $('chip-avatar').style.background = s.player.color;
    $('btn-sound').textContent = s.settings.sound ? '🔊' : '🔇';
  }

  /* השעון אינו מוצג באופן קבוע: הוא מציץ לשלוש שניות בכל פעם שנגמרת דקה,
     וכן פעם אחת בפתיחת המשחק. כך אין לחץ זמן מתמיד מול העיניים. */
  var clock = { lastBucket: null, hideTimer: null };

  function peekClock(ms) {
    var chip = $('chip-time');
    chip.classList.add('is-showing');
    clearTimeout(clock.hideTimer);
    clock.hideTimer = setTimeout(function () { chip.classList.remove('is-showing'); }, ms || 3000);
  }

  function renderTime(remaining, limit) {
    $('stat-time').textContent = T.fmt(remaining);
    $('chip-time').classList.toggle('is-low', remaining <= 120);

    var bucket = Math.ceil(remaining / 60);
    if (clock.lastBucket === null) peekClock(3500);           // הצצה אחת בהתחלה
    else if (bucket !== clock.lastBucket && remaining > 0) peekClock(3000);
    clock.lastBucket = bucket;

    // אם ההורה הוסיף זמן – מבטלים את מצב "התרגיל האחרון"
    if (timeUpPending && !T.isExpired()) {
      timeUpPending = false;
      $('lastcall').hidden = true;
    }
    // ...ואם כבר הוצג מסך הפרידה, חוזרים למפה מעצמנו
    if (ui.screen === 'timeup' && !T.isExpired()) go('home');
    if (ui.screen === 'parent' && ui.parentUnlocked) renderParentTime(remaining, limit);
  }

  /* ---------- ניווט ---------- */
  function go(name) {
    if (name === 'play' && T.isExpired()) name = 'timeup';
    if (T.isExpired() && (name === 'home' || name === 'shop' || name === 'collection' || name === 'avatar')) name = 'timeup';

    ui.screen = name;
    qsa('.screen').forEach(function (sc) { sc.classList.remove('is-active'); });
    var target = $('screen-' + name);
    if (target) target.classList.add('is-active');

    qsa('.nav-btn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.go === name); });
    $('bottombar').classList.toggle('hidden', name === 'play');

    // הזמן אינו נספר באזור ההורים ובמסך סיום היום
    T.setCountable(name !== 'parent' && name !== 'timeup');

    if (name === 'home') renderHome();
    if (name === 'avatar') renderAvatar();
    if (name === 'collection') renderCollection();
    if (name === 'shop') renderShop();
    if (name === 'parent') renderParent();
    if (name === 'timeup') renderTimeup();
    window.scrollTo(0, 0);
    renderHeader();
  }

  /* ---------- מסך הבית: מפת העולמות ---------- */
  function renderHome() {
    var s = S.get();
    $('hello-face').textContent = s.player.face;
    $('hello-title').textContent = s.player.name ? 'שלום, ' + s.player.name + '!' : 'שלום!';
    $('hello-sub').textContent = 'לאן נצא היום?';

    var wrap = $('worlds');
    wrap.innerHTML = '';
    R.WORLDS.forEach(function (w) {
      var wp = S.world(w.id);
      var unlocked = R.isUnlocked(w);
      var maxStars = R.MISSIONS_PER_WORLD * 3;
      var pct = Math.min(100, Math.round((wp.missions / R.MISSIONS_PER_WORLD) * 100));
      var btn = document.createElement('button');
      btn.className = 'world' + (unlocked ? '' : ' locked');
      btn.style.background = w.bg;
      btn.innerHTML =
        '<span class="world-emoji">' + w.emoji + '</span>' +
        '<span class="world-info">' +
          '<span class="world-name">' + w.name + (wp.done ? ' ✔' : '') + '</span>' +
          '<span class="world-sub">' + (unlocked ? w.sub : 'צריך ' + w.need + ' כוכבים כדי לפתוח') + '</span>' +
          '<span class="world-stars">⭐ ' + wp.stars + ' / ' + maxStars + '</span>' +
          '<span class="world-progress"><i style="width:' + pct + '%"></i></span>' +
        '</span>' +
        (unlocked ? '' : '<span class="lock">🔒</span>');
      btn.onclick = function () {
        A.click();
        if (!unlocked) {
          var missing = w.need - s.progress.stars;
          toast('עוד ' + missing + ' כוכבים ⭐ ונפתח!');
          return;
        }
        chooseMissionType(w);
      };
      wrap.appendChild(btn);
    });

    var lvlNames = { 1: 'מתחילים', 2: 'מתקדמים', 3: 'אלופים', 4: 'סופר-אלופים', 5: 'אשפי חשבון' };
    $('home-tip').innerHTML = 'רמה נוכחית: <b>' + lvlNames[s.progress.level] + '</b> · ' +
      (s.progress.missions ? 'כבר השלמת ' + s.progress.missions + ' משימות. ממשיכים!' : 'בחרו עולם ויוצאים לדרך!');
  }

  function chooseMissionType(w) {
    var wp = S.world(w.id);
    modal({
      emoji: w.emoji,
      title: w.name,
      body: 'משימה ' + Math.min(wp.missions + 1, R.MISSIONS_PER_WORLD) + ' מתוך ' + R.MISSIONS_PER_WORLD,
      buttons: [
        { text: '▶ יוצאים למשימה', fn: function () { startMission(w.id, false); } },
        { text: '⭐ אתגר הכוכב', primary: false, fn: function () { startMission(w.id, true); } }
      ]
    });
  }

  /* ---------- מסך הדמות ---------- */
  var FACES = ['🦊', '🐼', '🐨', '🦄', '🐯', '🐵', '🐧', '🐢', '🐰', '🐻', '🦁', '🐸'];

  function renderAvatar() {
    var s = S.get();
    $('avatar-face').textContent = s.player.face;
    $('avatar-hat').textContent = s.player.hat || '';
    $('avatar-big').style.background = s.player.color;
    $('name-input').value = s.player.name;

    var fr = $('pick-faces'); fr.innerHTML = '';
    FACES.forEach(function (f) {
      var b = document.createElement('button');
      b.className = 'pick' + (s.player.face === f ? ' is-on' : '');
      b.textContent = f;
      b.onclick = function () { A.click(); s.player.face = f; S.save(); renderAvatar(); renderHeader(); };
      fr.appendChild(b);
    });

    var cr = $('pick-colors'); cr.innerHTML = '';
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'pick pick-color' + (s.player.color === c ? ' is-on' : '');
      b.style.background = c;
      b.onclick = function () { A.click(); s.player.color = c; S.save(); renderAvatar(); renderHeader(); };
      cr.appendChild(b);
    });

    var hr = $('pick-hats'); hr.innerHTML = '';
    var none = document.createElement('button');
    none.className = 'pick' + (!s.player.hat ? ' is-on' : '');
    none.textContent = '🚫';
    none.title = 'בלי כובע';
    none.onclick = function () { A.click(); s.player.hat = ''; S.save(); renderAvatar(); };
    hr.appendChild(none);
    R.SHOP.filter(function (i) { return i.kind === 'hat'; }).forEach(function (item) {
      var owned = s.owned.indexOf(item.id) >= 0;
      var b = document.createElement('button');
      b.className = 'pick' + (owned ? '' : ' locked') + (s.player.hat === item.ico && owned ? ' is-on' : '');
      b.textContent = item.ico;
      b.title = item.name;
      b.onclick = function () {
        A.click();
        if (!owned) { toast('אפשר לקנות בחנות 🛍️ (' + item.cost + ' 🪙)'); return; }
        s.player.hat = item.ico; S.save(); renderAvatar();
      };
      hr.appendChild(b);
    });
  }

  /* ---------- לולאת המשחק ---------- */
  function startMission(worldId, isBonus) {
    if (T.isExpired()) { go('timeup'); return; }
    var s = S.get();
    var level = isBonus ? Math.min(5, s.progress.level + 1) : s.progress.level;
    var count = isBonus ? R.TASKS_PER_BONUS : R.TASKS_PER_MISSION;
    mission = {
      worldId: worldId, isBonus: !!isBonus, level: level,
      plan: Q.missionPlan(level, count), idx: 0,
      firstTry: 0, correct: 0, coins: 0, total: count,
      stickerWon: null
    };
    buildTrack(count);
    go('play');
    nextQuestion();
  }

  function buildTrack(count) {
    var t = $('track');
    t.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var st = document.createElement('div');
      st.className = 'track-step';
      t.appendChild(st);
    }
    var walker = document.createElement('div');
    walker.className = 'track-walker';
    walker.id = 'walker';
    walker.textContent = S.get().player.face;
    t.appendChild(walker);
    updateTrack();
  }

  function updateTrack() {
    if (!mission) return;
    var steps = qsa('#track .track-step');
    steps.forEach(function (st, i) {
      st.classList.toggle('done', i < mission.idx);
      st.classList.toggle('now', i === mission.idx);
    });
    var w = $('walker');
    if (w) {
      var pct = mission.total > 1 ? (mission.idx / (mission.total - 1)) * 86 : 0;
      w.style.right = (4 + pct) + '%';   // הדף כולו RTL, ו-right נתמך בכל הדפדפנים
    }
  }

  var current = null; // {q, attempts, answered}

  function nextQuestion() {
    if (!mission) { go('home'); return; }
    // הזמן נגמר – מסיימים רק עכשיו, אחרי שהתרגיל הקודם הושלם
    if (timeUpPending || T.isExpired()) { endMission('timeup'); return; }
    if (mission.idx >= mission.total) { endMission(); return; }

    var useHint = adaptive.hintLeft > 0;
    var q = Q.generate(mission.level, mission.plan[mission.idx], useHint);
    current = { q: q, attempts: 0, answered: false, padValue: '' };
    renderQuestion(q);
    updateTrack();
  }

  function renderQuestion(q) {
    var card = $('question-card');
    card.innerHTML =
      '<div class="q-kicker">' + q.kicker + '</div>' +
      (q.text ? '<div class="q-text">' + q.text + '</div>' : '') +
      q.html;
    // אנימציית כניסה מחדש
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';

    $('hint-bar').innerHTML = '';
    var box = $('answers');
    box.className = 'answers';
    box.innerHTML = '';

    if (q.input === 'pad') {
      box.classList.add('pad');
      var disp = document.createElement('div');
      disp.className = 'pad-display';
      disp.id = 'pad-display';
      disp.textContent = '';
      box.appendChild(disp);
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'].forEach(function (k) {
        var b = document.createElement('button');
        b.className = 'ans pad-key' + (k === '✔' ? ' pad-ok' : '') + (k === '⌫' ? ' pad-del' : '');
        b.textContent = k;
        b.onclick = function () { padPress(k); };
        box.appendChild(b);
      });
    } else {
      if (q.choices.length === 3) box.classList.add('three');
      q.choices.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'ans';
        b.innerHTML = '<span class="sym">' + c.sym + '</span>' + (c.label ? '<span class="lbl">' + c.label + '</span>' : '');
        b.dataset.val = String(c.v);
        b.onclick = function () { checkAnswer(c.v, b); };
        box.appendChild(b);
      });
    }
  }

  /* גלילה אל הרמז רק אם הוא באמת מחוץ למסך – באייפד הכול נכנס, ואין מה לגלול */
  function bringHintIntoView() {
    var hb = $('hint-bar');
    if (!hb) return;
    if (hb.getBoundingClientRect().bottom <= window.innerHeight) return;
    hb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function padPress(k) {
    if (!current || current.answered) return;
    A.click();
    if (k === '⌫') current.padValue = current.padValue.slice(0, -1);
    else if (k === '✔') {
      if (current.padValue === '') return;
      checkAnswer(parseInt(current.padValue, 10), null);
      return;
    } else if (current.padValue.length < 3) current.padValue += k;
    $('pad-display').textContent = current.padValue;
  }

  function checkAnswer(val, btn) {
    if (!current || current.answered) return;
    var q = current.q;
    var ok = (typeof q.answer === 'number') ? (Number(val) === q.answer) : (String(val) === String(q.answer));
    current.attempts++;

    if (ok) {
      current.answered = true;
      onCorrect(btn);
    } else {
      onWrong(btn);
    }
  }

  function onCorrect(btn) {
    var firstTry = current.attempts === 1;
    var q = current.q;
    A.correct();
    if (btn) btn.classList.add('correct');
    else if ($('pad-display')) $('pad-display').classList.add('pad-ok');

    S.recordAnswer(q.type, true, firstTry);
    mission.correct++;
    if (firstTry) mission.firstTry++;
    grantMedals();

    var coins = firstTry ? (mission.isBonus ? 4 : 2) : 1;
    mission.coins += coins;
    S.addCoins(coins);       // נזקף מיד, ולא רק בסוף המשימה
    renderHeader();

    var praise = firstTry
      ? MG.Questions._util.pick(['מצוין! 🎉', 'כל הכבוד! 🌟', 'מדויק! 💫', 'איזה יופי! 🥳', 'אלוף/ה! 🚀'])
      : 'יפה מאוד, הצלחת! 💛';
    $('hint-bar').innerHTML = '<div class="hint-msg good">' + praise + ' <b>+' + coins + '</b> 🪙</div>';
    floater('🪙', btn || $('question-card'));
    if (firstTry) confetti(mission.isBonus ? 30 : 18);

    adaptiveUpdate(firstTry);

    // הפתעה קטנה מדי פעם
    var surprise = Math.random() < 0.12;
    mission.idx++;
    updateTrack();

    setTimeout(function () {
      if (surprise) showSurprise(); else nextQuestion();
    }, 900);
  }

  function onWrong(btn) {
    var q = current.q;
    A.wrong();
    if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
    if (current.attempts === 1) {
      // ניסיון שני עם רמז – בלי עונש, בלי הודעת שגיאה מתסכלת
      $('hint-bar').innerHTML =
        '<div class="hint-msg soft">כמעט! 💛 בואו ננסה שוב עם רמז:</div>' +
        '<div class="hint-msg">' + q.hintHtml + '</div>';
      if (current.q.input === 'pad') { current.padValue = ''; $('pad-display').textContent = ''; }
      bringHintIntoView();
    } else {
      // מראים את הפתרון בעדינות ומבקשים ללחוץ על התשובה הנכונה
      current.answered = true;
      S.recordAnswer(q.type, false, false);
      adaptiveUpdate(false);
      revealAnswer();
    }
  }

  function revealAnswer() {
    var q = current.q;
    qsa('#answers .ans').forEach(function (b) {
      if (b.dataset.val !== undefined && String(b.dataset.val) === String(q.answer)) b.classList.add('reveal');
      b.disabled = true;
    });
    $('hint-bar').innerHTML =
      '<div class="hint-msg soft">זה בסדר גמור, ככה לומדים! הנה הפתרון:</div>' +
      '<div class="hint-msg">' + q.explainHtml + '</div>';
    var go2 = document.createElement('button');
    go2.className = 'btn btn-primary';
    go2.textContent = 'הבנתי, ממשיכים! ➜';
    go2.onclick = function () {
      A.click();
      mission.idx++;
      updateTrack();
      nextQuestion();
    };
    $('hint-bar').appendChild(go2);
    bringHintIntoView();
  }

  /* מדליות נבדקות אחרי כל תשובה, כדי שהן ייפתחו ברגע שהתנאי מתקיים */
  function grantMedals() {
    var fresh = R.checkMedals();
    fresh.forEach(function (m) {
      toast(m.ico + ' מדליה חדשה: <b>' + m.t + '</b>');
      if (mission) mission.medals = (mission.medals || []).concat([m]);
    });
    if (fresh.length) { A.levelUp(); confetti(20); }
    return fresh;
  }

  /* ---------- מנוע ההתאמה האישית ---------- */
  function adaptiveUpdate(firstTryCorrect) {
    var s = S.get();
    adaptive.recent.push(!!firstTryCorrect);
    if (adaptive.recent.length > 4) adaptive.recent.shift();
    if (adaptive.hintLeft > 0) adaptive.hintLeft--;

    if (firstTryCorrect) {
      adaptive.goodRun++;
      if (adaptive.goodRun >= 3 && s.progress.level < 5) {
        s.progress.level++; S.save();
        adaptive.goodRun = 0;
        if (mission) mission.level = Math.min(5, mission.level + (mission.isBonus ? 0 : 1));
        A.levelUp();
        toast('🚀 עלית רמה! התרגילים יהיו קצת יותר מאתגרים');
      }
    } else {
      adaptive.goodRun = 0;
      var last3 = adaptive.recent.slice(-3);
      var misses = last3.filter(function (v) { return !v; }).length;
      if (misses >= 2) {
        adaptive.hintLeft = 2;               // שני תרגילים עם המחשה חזותית
        if (s.progress.level > 1) {
          s.progress.level--; S.save();
          if (mission) mission.level = Math.max(1, mission.level - 1);
          toast('💛 ניקח את זה רגוע יותר – הנה תרגילים עם ציור');
        }
        adaptive.recent = [];
      }
    }
  }

  /* ---------- הפתעות ---------- */
  function showSurprise() {
    if (!mission) { return; }
    var s = S.get();
    var roll = Math.random();
    if (roll < 0.4) {
      var coins = MG.Questions._util.pick([3, 5, 8]);
      S.addCoins(coins); renderHeader();
      A.chest();
      confetti(24);
      modal({ emoji: '🎁', title: 'תיבת הפתעה!', body: 'מצאת ' + coins + ' מטבעות 🪙', buttons: [{ text: 'איזה כיף!', fn: nextQuestion }] });
    } else if (roll < 0.75) {
      var st = R.randomSticker();
      A.chest();
      confetti(24);
      if (st) {
        mission.stickerWon = st;
        modal({ emoji: st, title: 'מדבקה חדשה!', body: 'היא נשמרה באוסף שלך 🎁', buttons: [{ text: 'מגניב!', fn: nextQuestion }] });
      } else {
        S.addCoins(5); renderHeader();
        modal({ emoji: '💎', title: 'אוצר!', body: 'האוסף שלך מלא – קיבלת 5 מטבעות 🪙', buttons: [{ text: 'יש!', fn: nextQuestion }] });
      }
    } else {
      A.chest();
      modal({
        emoji: MG.Questions._util.pick(['🌈', '🦋', '✨', '🎪', '🐬']),
        title: 'רגע של קסם',
        body: MG.Questions._util.pick([
          'ידעת? כשמחברים שני מספרים אפשר להחליף ביניהם והתוצאה לא משתנה.',
          'טיפ: כדי לחבר 9, אפשר לחבר 10 ואז להוריד 1.',
          'כל תרגיל שפותרים מחזק את המוח – בדיוק כמו שריר!',
          'טיפ: כשסופרים בקפיצות של 10 מגיעים רחוק מאוד, ומהר.'
        ]),
        buttons: [{ text: 'ממשיכים!', fn: nextQuestion }]
      });
    }
  }

  /* ---------- סיום משימה ---------- */
  function endMission(reason) {
    var cutShort = reason === 'timeup' && mission.idx < mission.total;
    var answered = Math.max(1, mission.idx);
    // במשימה שנקטעה בגלל הזמן – מתגמלים לפי מה שנפתר בפועל, ולא סופרים אותה כמשימה שהושלמה
    var stars = mission.idx === 0 ? 0 : R.starsFor(mission.firstTry, cutShort ? answered : mission.total);
    var bonusCoins = stars * (mission.isBonus ? 6 : 4);
    var totalCoins = mission.coins + bonusCoins;   // לתצוגה בלבד
    var res = R.finishMission(mission.worldId, stars, bonusCoins, mission.isBonus, !cutShort);
    // מדליות שנפתחו במהלך המשימה מוצגות גם הן במסך הסיום
    var duringMission = mission.medals || [];
    var fresh = duringMission.concat(R.checkMedals());
    var w = R.world(mission.worldId);
    var s = S.get();

    // נגמר הזמן: מסיימים במסך הפרידה, אבל שומרים את כל מה שנצבר
    if (reason === 'timeup') {
      var mission0 = mission;
      mission = null;
      timeUpPending = false;
      $('lastcall').hidden = true;
      $('modal-root').innerHTML = '';
      lastEarned = (mission0.idx === 0) ? null :
        ('בסיבוב האחרון אספת ' + (stars ? '<b>' + stars + '</b> ⭐ ו-' : '') +
         '<b>' + totalCoins + '</b> 🪙 — הכול נשמר לך למחר.');
      go('timeup');
      renderHeader();
      return;
    }

    A.reward();
    confetti(60);

    var starsHtml = '';
    for (var i = 0; i < 3; i++) {
      starsHtml += i < stars
        ? '<span class="on" style="animation-delay:' + (i * 0.22) + 's">⭐</span>'
        : '<span class="off">⭐</span>';
    }

    var extra = '';
    if (res.worldDone) extra += '<div class="result-prize"><span class="big">' + w.emoji + '</span>סיימת את <b>' + w.name + '</b>!</div>';
    if (mission.stickerWon) extra += '<div class="result-prize"><span class="big">' + mission.stickerWon + '</span>מדבקה חדשה נוספה לאוסף</div>';
    fresh.forEach(function (m) {
      extra += '<div class="result-prize"><span class="big">' + m.ico + '</span>מדליה חדשה: <b>' + m.t + '</b></div>';
    });

    // האם נפתח עולם חדש? (חציית סף הכוכבים במשימה הנוכחית)
    R.WORLDS.forEach(function (ww) {
      if (ww.need > 0 && s.progress.stars >= ww.need && s.progress.stars - stars < ww.need) {
        extra += '<div class="result-prize"><span class="big">' + ww.emoji + '</span>נפתח עולם חדש: <b>' + ww.name + '</b>!</div>';
      }
    });

    $('screen-result').innerHTML =
      '<div class="result-box">' +
        '<div class="result-face">' + s.player.face + '</div>' +
        '<h2 class="result-title">' + (mission.isBonus ? 'אתגר הכוכב הושלם!' : 'משימה הושלמה!') + '</h2>' +
        '<div class="result-stars">' + starsHtml + '</div>' +
        '<div class="result-line">פתרת נכון ' + mission.correct + ' מתוך ' + mission.total + '</div>' +
        '<div class="result-line">🪙 קיבלת <b>' + totalCoins + '</b> מטבעות</div>' +
        extra +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary" id="res-again">▶ עוד משימה</button>' +
          '<button class="btn btn-ghost" id="res-home">🗺️ למפה</button>' +
        '</div>' +
      '</div>';

    var wid = mission.worldId;
    mission = null;
    go('result');
    $('bottombar').classList.remove('hidden');
    on($('res-again'), 'click', function () { A.click(); startMission(wid, false); });
    on($('res-home'), 'click', function () { A.click(); go('home'); });
    renderHeader();
  }

  function quitMission() {
    modal({
      emoji: '🚪',
      title: 'לצאת מהמשימה?',
      body: 'ההתקדמות במשימה הזו לא תישמר, אבל המטבעות שכבר אספת נשארים אצלך.',
      buttons: [
        { text: 'נשארים', fn: function () { } },
        { text: 'יוצאים', primary: false, fn: function () {
            mission = null; go('home');   // המטבעות שנאספו כבר נזקפו בזמן אמת
          } }
      ]
    });
  }

  /* ---------- אוסף ---------- */
  function renderCollection() {
    var s = S.get();
    var grid = $('sticker-grid'); grid.innerHTML = '';
    R.STICKERS.forEach(function (st) {
      var have = s.stickers.indexOf(st) >= 0;
      var d = document.createElement('div');
      d.className = 'sticker' + (have ? '' : ' off');
      d.textContent = have ? st : '❓';
      grid.appendChild(d);
    });

    var ml = $('medal-list'); ml.innerHTML = '';
    R.MEDALS.forEach(function (m) {
      var have = s.medals.indexOf(m.id) >= 0;
      var d = document.createElement('div');
      d.className = 'medal' + (have ? '' : ' off');
      d.innerHTML = '<span class="m-ico">' + (have ? m.ico : '🔒') + '</span>' +
        '<span><span class="m-t">' + m.t + '</span><br><span class="m-d">' + m.d + '</span></span>';
      ml.appendChild(d);
    });

    var acc = s.progress.totalAnswered ? Math.round((s.progress.firstTryCorrect / s.progress.totalAnswered) * 100) : 0;
    $('progress-cards').innerHTML =
      pcard(s.progress.totalCorrect, 'תרגילים נכונים') +
      pcard(s.progress.missions, 'משימות שהושלמו') +
      pcard(s.progress.bestStreak, 'הרצף הכי ארוך') +
      pcard(acc + '%', 'דיוק בניסיון ראשון');
  }
  function pcard(v, label) { return '<div class="pcard"><b>' + v + '</b><span>' + label + '</span></div>'; }

  /* ---------- חנות ---------- */
  function renderShop() {
    var s = S.get();
    var grid = $('shop-grid'); grid.innerHTML = '';
    R.SHOP.forEach(function (item) {
      var owned = !item.repeat && s.owned.indexOf(item.id) >= 0;
      var afford = s.progress.coins >= item.cost;
      var soldOut = item.kind === 'chest' && !R.stickersLeft();
      var d = document.createElement('div');
      d.className = 'shop-item' + (owned ? ' owned' : '');
      d.innerHTML = '<div class="s-ico">' + item.ico + '</div><div class="s-name">' + item.name + '</div>';
      var b = document.createElement('button');
      b.className = 'btn btn-small s-buy';
      b.textContent = owned ? '✔ ברשותך' : soldOut ? '💎 האוסף מלא' : (item.cost + ' 🪙');
      b.disabled = owned || soldOut || !afford;
      b.onclick = function () {
        var r = R.buy(item.id);
        if (!r.ok) {
          toast(r.reason === 'coins' ? 'צריך עוד מטבעות 🪙'
              : r.reason === 'full' ? 'כל המדבקות כבר באוסף שלך! 💎'
              : 'כבר יש לך את זה');
          return;
        }
        A.reward(); confetti(30);
        if (r.sticker) modal({ emoji: r.sticker, title: 'פתחת את התיבה!', body: 'מדבקה חדשה נוספה לאוסף 🎁' });
        else toast('קנית: ' + item.name + ' ' + item.ico);
        R.checkMedals();
        renderShop(); renderHeader();
      };
      d.appendChild(b);
      grid.appendChild(d);
    });
  }

  /* ---------- אזור ההורים ---------- */
  function newGate() {
    var a = 6 + Math.floor(Math.random() * 4);   // 6..9
    var b = 6 + Math.floor(Math.random() * 4);
    ui.gateAnswer = a * b;
    $('gate-equation').textContent = a + ' × ' + b + ' = ?';
    $('gate-input').value = '';
    $('gate-err').textContent = '';
  }

  function renderParent() {
    var s = S.get();
    var needGate = s.parent.gateEnabled && !ui.parentUnlocked;
    $('gate-card').classList.toggle('hidden', !needGate);
    $('parent-panel').classList.toggle('hidden', needGate);
    if (needGate) { newGate(); return; }

    // מגבלות זמן
    var row = $('limit-row'); row.innerHTML = '';
    T.PRESETS.forEach(function (m) {
      var b = document.createElement('button');
      b.className = 'limit-btn' + (s.parent.dailyLimitMin === m ? ' is-on' : '');
      b.textContent = m + ' דק׳';
      b.onclick = function () { A.click(); T.setLimitMinutes(m); renderParent(); toast('מגבלת הזמן היומית: ' + m + ' דקות'); };
      row.appendChild(b);
    });
    $('custom-min').value = s.parent.dailyLimitMin;

    renderParentTime(T.remainingSec(), T.limitSec());

    // סטטיסטיקה
    var acc = s.progress.totalAnswered ? Math.round((s.progress.firstTryCorrect / s.progress.totalAnswered) * 100) : 0;
    var byType = '';
    Object.keys(Q.TYPE_LABELS).forEach(function (t) {
      var d = s.byType[t];
      if (!d || !d.total) return;
      byType += '<div class="pstat"><b>' + Math.round((d.ok / d.total) * 100) + '%</b><span>' + Q.TYPE_LABELS[t] + ' (' + d.total + ')</span></div>';
    });
    $('parent-stats').innerHTML =
      '<div class="pstat"><b>' + s.progress.level + '</b><span>רמת קושי (1–5)</span></div>' +
      '<div class="pstat"><b>' + s.progress.totalAnswered + '</b><span>תרגילים שנפתרו</span></div>' +
      '<div class="pstat"><b>' + acc + '%</b><span>דיוק בניסיון ראשון</span></div>' +
      '<div class="pstat"><b>' + s.progress.missions + '</b><span>משימות שהושלמו</span></div>' +
      byType;

    $('gate-state-note').textContent = 'שאלת הכניסה כרגע: ' + (s.parent.gateEnabled ? 'פעילה' : 'כבויה');
  }

  function renderParentTime(remaining, limit) {
    if (!$('time-left-big')) return;
    $('time-left-big').textContent = T.fmt(remaining);
    var pct = limit ? Math.max(0, Math.min(100, (remaining / limit) * 100)) : 0;
    $('time-bar-fill').style.width = pct + '%';
    var used = T.usedSec();
    $('time-used-note').innerHTML = 'זמן שנוצל היום: <b dir="ltr">' + T.fmt(used) + '</b> מתוך <b dir="ltr">' + T.fmt(limit) + '</b> (דקות:שניות).';
  }

  function renderTimeup() {
    var s = S.get();
    A.bye();
    var earned = $('timeup-earned');
    earned.hidden = !lastEarned;
    earned.innerHTML = lastEarned || '';
    lastEarned = null;
    $('timeup-summary').innerHTML =
      '<div>⭐ ' + s.progress.stars + ' כוכבים</div>' +
      '<div>🪙 ' + s.progress.coins + ' מטבעות</div>' +
      '<div>🎯 ' + s.progress.totalCorrect + ' תרגילים נכונים</div>';
  }

  /* ---------- חיבור אירועים ---------- */
  function wire() {
    qsa('.nav-btn').forEach(function (b) {
      on(b, 'click', function () { A.unlock(); A.click(); go(b.dataset.go); });
    });
    on($('chip-avatar'), 'click', function () { A.click(); go('avatar'); });
    on($('btn-sound'), 'click', function () {
      var s = S.get();
      s.settings.sound = !s.settings.sound; S.save();
      renderHeader();
      if (s.settings.sound) { A.unlock(); A.click(); }
    });
    on($('btn-quit'), 'click', function () { A.click(); quitMission(); });

    on($('name-input'), 'input', function () {
      var s = S.get();
      // חותכים רווחים מיותרים בשמירה בלבד – בלי לכתוב חזרה לשדה, כדי שאפשר יהיה
      // להקליד רווח בין שתי מילים בלי שהוא ייעלם בזמן ההקלדה
      s.player.name = this.value.slice(0, 12).trim(); S.save();
    });

    // שער ההורים
    on($('gate-go'), 'click', function () {
      var v = parseInt($('gate-input').value, 10);
      if (v === ui.gateAnswer) { ui.parentUnlocked = true; renderParent(); }
      else { newGate(); $('gate-err').textContent = 'תשובה לא נכונה, נסו שוב'; }
    });
    on($('gate-input'), 'keydown', function (e) { if (e.key === 'Enter') $('gate-go').click(); });

    on($('custom-save'), 'click', function () {
      var v = parseInt($('custom-min').value, 10);
      if (!v || v < 5 || v > 180) { toast('בחרו בין 5 ל-180 דקות'); return; }
      T.setLimitMinutes(v); renderParent(); toast('מגבלת הזמן היומית: ' + v + ' דקות');
    });
    on($('add-5'), 'click', function () { T.addBonusMinutes(5); renderParent(); toast('נוספו 5 דקות להיום'); });
    on($('reset-today'), 'click', function () {
      T.resetToday(); renderParent(); toast('הזמן של היום אופס');
    });
    on($('toggle-gate'), 'click', function () {
      var s = S.get();
      s.parent.gateEnabled = !s.parent.gateEnabled; S.save();
      renderParent();
      toast('שאלת הכניסה ' + (s.parent.gateEnabled ? 'הופעלה' : 'כובתה'));
    });
    on($('reset-all'), 'click', function () {
      modal({
        emoji: '⚠️', title: 'לאפס את כל המשחק?',
        body: 'כל הכוכבים, המטבעות, המדבקות וההתקדמות יימחקו. אי אפשר לבטל.',
        buttons: [
          { text: 'ביטול', fn: function () { } },
          { text: 'כן, לאפס', primary: false, fn: function () {
              S.reset(); ui.parentUnlocked = false; adaptive = { goodRun: 0, recent: [], hintLeft: 0 };
              renderHeader(); go('home'); toast('המשחק אופס');
            } }
        ]
      });
    });
    on($('timeup-parent'), 'click', function () { A.click(); go('parent'); });

    // תמיכה במקלדת למי שמשחק במחשב
    document.addEventListener('keydown', function (e) {
      if (ui.screen !== 'play' || !current || current.answered) return;
      if (current.q.input === 'pad') {
        if (/^[0-9]$/.test(e.key)) padPress(e.key);
        else if (e.key === 'Backspace') padPress('⌫');
        else if (e.key === 'Enter') padPress('✔');
        return;
      }
      var idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) {
        var btns = qsa('#answers .ans');
        if (btns[idx] && !btns[idx].disabled) btns[idx].click();
      }
    });

    ['click', 'touchstart', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, function once() { A.unlock(); }, { once: true });
    });
  }

  /* ---------- אתחול ---------- */
  function init() {
    S.load();
    wire();
    T.init({
      onTick: renderTime,
      onExpire: function () {
        // באמצע תרגיל – נותנים לילד/ה לסיים אותו, עם באנר מבהיר
        if (mission && ui.screen === 'play') {
          timeUpPending = true;
          $('lastcall').hidden = false;
          peekClock(6000);
          return;
        }
        mission = null;
        $('modal-root').innerHTML = '';
        go('timeup');
      }
    });
    renderHeader();
    go(T.isExpired() ? 'timeup' : 'home');

    var s = S.get();
    if (!s.player.name && s.progress.totalAnswered === 0) {
      setTimeout(function () {
        modal({
          emoji: '🎒',
          title: 'ברוכים הבאים למסע המספרים!',
          body: 'בחרו דמות, צאו למשימות, אספו כוכבים ומטבעות – ותהיו אלופי חשבון.',
          buttons: [
            { text: '🎨 בוחרים דמות', fn: function () { go('avatar'); } },
            { text: '▶ מתחילים', primary: false, fn: function () { go('home'); } }
          ]
        });
      }, 400);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.MG);
