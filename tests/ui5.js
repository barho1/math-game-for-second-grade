/* רספונסיביות, RTL, שמע, נגישות, אחסון ומרוצי לחיצות (253–305) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- 10.2 מסכים שונים ----------
  for (const [id, w, h, label] of [['257', 320, 568, 'iPhone SE'], ['258', 390, 844, 'טלפון סטנדרטי'],
       ['259', 800, 1280, 'טאבלט אנדרואיד'], ['260', 1920, 1080, 'מחשב'], ['253', 1194, 834, 'iPad לרוחב'], ['255', 820, 1180, 'iPad לאורך']]) {
    const p = await H.fresh(b, w, h);
    await H.startMission(p, 0);
    const r = await p.evaluate(() => ({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
      cols: getComputedStyle(document.getElementById('screen-play')).gridTemplateColumns,
      btn: Math.round(document.querySelector('#answers .ans').getBoundingClientRect().height),
    }));
    ok(id, label + ' — אין גלישה אופקית', r.x === 0, r.x + 'px');
    ok(id + 'b', label + ' — כפתורים גדולים', r.btn >= 48, r.btn + 'px');
    if (w > h && w >= 820) ok('253c', 'אייפד לרוחב — שתי עמודות', r.cols.split(' ').length === 2, r.cols);
    if (w >= 820 && w > h) ok('254', 'אייפד לרוחב — אין גלילה', r.y === 0, r.y + 'px');
    await p.close();
  }

  // 261 – שינוי גודל חלון בזמן אמת
  let p = await H.fresh(b, 1194, 834);
  await H.startMission(p, 0);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
  const afterResize = await p.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    card: !!document.querySelector('#question-card .q-kicker'),
  }));
  ok('261', 'שינוי גודל חלון — אין שבירה', afterResize.x === 0 && afterResize.card, JSON.stringify(afterResize));

  // 262 – סיבוב מסך באמצע תרגיל אינו מאפס
  const qBefore = await p.locator('#question-card').textContent();
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(400);
  const qAfter = await p.locator('#question-card').textContent();
  ok('262', 'סיבוב מסך אינו מאפס את התרגיל', qBefore === qAfter);
  await p.close();

  // ---------- 10.3 כיווניות ----------
  p = await H.fresh(b);
  ok('263', 'כיווניות RTL', (await p.evaluate(() => document.documentElement.dir)) === 'rtl');
  await H.startMission(p, 0);
  const dirs = await p.evaluate(() => {
    const eq = document.querySelector('.equation, .seq, .visual');
    return eq ? getComputedStyle(eq).direction : 'none';
  });
  ok('264', 'תרגילים מוצגים LTR', dirs === 'ltr' || dirs === 'none', dirs);
  await p.close();

  // ---------- 10.4 שמע ----------
  p = await b.newPage();
  await p.addInitScript(() => {
    window.__osc = 0;
    const patch = (C) => { if (!C) return; const o = C.prototype.createOscillator;
      C.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; };
    patch(window.AudioContext); patch(window.webkitAudioContext);
  });
  await p.goto(H.URL); await p.waitForTimeout(800); await H.closeModal(p);
  await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(300);
  const oscAfterClick = await p.evaluate(() => window.__osc);
  ok('267', 'צליל מושמע בפעולה', oscAfterClick > 0, 'אוסילטורים: ' + oscAfterClick);

  await p.locator('#btn-sound').click(); await p.waitForTimeout(250);
  ok('270', 'כפתור ההשתקה משנה מצב', (await p.evaluate(() => MG.Storage.get().settings.sound)) === false);
  ok('270b', 'האייקון משתנה ל-🔇', (await p.locator('#btn-sound').textContent()) === '🔇');
  const before = await p.evaluate(() => window.__osc);
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(250);
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(250);
  const afterMuted = await p.evaluate(() => window.__osc);
  ok('271', 'במצב מושתק אין שמע', afterMuted === before, before + '→' + afterMuted);
  await p.reload(); await p.waitForTimeout(850); await H.closeModal(p);
  ok('273', 'מצב ההשתקה נשמר אחרי רענון', (await p.evaluate(() => MG.Storage.get().settings.sound)) === false
    && (await p.locator('#btn-sound').textContent()) === '🔇');
  await p.locator('#btn-sound').click(); await p.waitForTimeout(250);
  const before2 = await p.evaluate(() => window.__osc);
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  ok('272', 'ביטול ההשתקה מחזיר שמע', (await p.evaluate(() => window.__osc)) > before2);
  await p.close();

  // ---------- 10.5 נגישות ----------
  p = await b.newPage({ reducedMotion: 'reduce' });
  await p.goto(H.URL); await p.waitForTimeout(800); await H.closeModal(p);
  const durations = await p.evaluate(() => {
    const els = [...document.querySelectorAll('.hello-face, .world, .nav-btn')];
    return els.map(e => getComputedStyle(e).animationDuration);
  });
  ok('274', 'הפחתת תנועה מבטלת אנימציות', durations.every(d => d === '0s' || parseFloat(d) < 0.02), durations.join(','));
  await p.close();

  // 443 – מצב כהה
  p = await b.newPage({ colorScheme: 'dark' });
  await p.goto(H.URL); await p.waitForTimeout(800); await H.closeModal(p);
  const bodyBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const cardBg = await p.evaluate(() => { const c = document.querySelector('.home-tip'); return c ? getComputedStyle(c).color : ''; });
  ok('443', 'מצב כהה אינו משנה את צבעי המשחק', /rgba?\(/.test(bodyBg) && bodyBg !== 'rgb(0, 0, 0)', bodyBg);
  const inputScheme = await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  ok('443b', 'color-scheme מוגדר כדי שהשדות לא יתהפכו', inputScheme.includes('light'), inputScheme);
  await p.close();

  // ---------- 11 אחסון ואופליין ----------
  p = await H.fresh(b, 820, 1180, { progress: { coins: 42, stars: 7 } });
  await p.evaluate(() => { MG.Storage.get().stickers = ['🦄']; MG.Storage.save(); });
  await p.reload(); await p.waitForTimeout(850); await H.closeModal(p);
  const persisted = await p.evaluate(() => MG.Storage.get().progress);
  ok('284', 'ההתקדמות נשמרת אחרי רענון', persisted.coins === 42 && persisted.stars === 7, JSON.stringify(persisted).slice(0, 80));

  // 287 – אין קריאות רשת
  const reqs = [];
  p.on('request', r => { const u = r.url(); if (!u.startsWith('http://127.0.0.1:8123') && !u.startsWith('data:')) reqs.push(u); });
  await H.startMission(p, 0);
  await p.waitForTimeout(800);
  ok('287', 'אין קריאות לשרתים חיצוניים בזמן משחק', reqs.filter(u => !/fonts\.(googleapis|gstatic)/.test(u)).length === 0, reqs.join(' | ').slice(0, 120));
  ok('447', 'אפס פרסומות/קישורים חיצוניים', (await p.locator('a[href^="http"]').count()) === 0);
  await p.close();

  // 286 – אחסון מלא
  p = await b.newPage();
  await p.addInitScript(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k.indexOf('mg-') === 0) throw new Error('QuotaExceededError'); return orig.apply(this, arguments); };
  });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(H.URL); await p.waitForTimeout(800); await H.closeModal(p);
  await H.startMission(p, 0);
  await H.answerCorrect(p); await p.waitForTimeout(900);
  ok('286', 'אחסון מלא — המשחק ממשיך לעבוד', errs.length === 0 && (await p.locator('#question-card').count()) === 1, errs.join('|'));
  await p.close();

  // ---------- 12.1 לחיצות כפולות ומהירות ----------
  p = await H.fresh(b);
  await H.startMission(p, 0);
  const firstBtn = p.locator('#answers .ans').first();
  await firstBtn.dblclick(); await p.waitForTimeout(300);
  ok('288/289', 'לחיצה כפולה אינה סופרת פעמיים',
    (await p.locator('#answers .ans.wrong').count()) <= 1 && p.__errors.length === 0, p.__errors.join('|'));
  await p.waitForTimeout(1000);
  await H.closeModal(p);

  // 290 – לחיצה על שני כפתורים "בו זמנית"
  const enabled = await p.locator('#answers .ans:not([disabled])').count();
  if (enabled >= 2) {
    await Promise.all([
      p.locator('#answers .ans:not([disabled])').nth(0).click().catch(() => {}),
      p.locator('#answers .ans:not([disabled])').nth(1).click().catch(() => {}),
    ]);
    await p.waitForTimeout(500);
    ok('290', 'מולטי-טאץ׳ אינו קורס', p.__errors.length === 0, p.__errors.join('|'));
  }
  await p.waitForTimeout(900); await H.closeModal(p);

  // יוצאים מהמשימה כדי לבדוק ניווט (סרגל הניווט מוסתר בזמן משחק – וזו התנהגות נכונה)
  if (await p.locator('#screen-play.is-active').count()) {
    await p.locator('#btn-quit').click(); await p.waitForTimeout(300);
    await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(400);
  }
  ok('431', 'יציאה מהמשחק מחזירה למפה', (await p.locator('#screen-home.is-active').count()) === 1);

  // 292 – לחיצות ניווט מהירות
  for (let i = 0; i < 12; i++) {
    const tabs = ['home', 'avatar', 'collection', 'shop'];
    await p.locator(`.nav-btn[data-go="${tabs[i % 4]}"]`).click({ timeout: 4000 }).catch(() => {});
  }
  await p.waitForTimeout(400);
  ok('292', 'ניווט מהיר אינו שובר את המשחק', p.__errors.length === 0 && (await p.locator('.screen.is-active').count()) === 1, p.__errors.join('|'));

  // 291 – לחיצות מהירות על "יוצאים למשימה"
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(250);
  await p.locator('.world').first().click(); await p.waitForTimeout(250);
  for (let i = 0; i < 5; i++) { await p.locator('#modal-root .btn').first().click({ timeout: 2000 }).catch(() => {}); }
  await p.waitForTimeout(600);
  const steps = await p.locator('#track .track-step').count();
  ok('291', 'לחיצות מהירות על "יוצאים למשימה" יוצרות משימה אחת', steps === 8 && p.__errors.length === 0, 'שלבים ' + steps);
  await p.close();

  // ---------- 13 ויזואל ----------
  p = await H.fresh(b, 390, 844);
  const bar = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('.nav-btn')].map(e => e.getBoundingClientRect());
    return { sameTop: new Set(btns.map(r => Math.round(r.top))).size === 1,
             widths: new Set(btns.map(r => Math.round(r.width))).size };
  });
  ok('301', 'כפתורי הניווט מיושרים', bar.sameTop, JSON.stringify(bar));
  const safe = await p.evaluate(() => getComputedStyle(document.querySelector('.bottombar')).paddingBottom);
  ok('305', 'ריפוד ל-Safe Area בסרגל התחתון', parseFloat(safe) >= 6, safe);

  await H.startMission(p, 0);
  const visual = await p.evaluate(() => {
    const card = document.getElementById('question-card').getBoundingClientRect();
    let outside = 0;
    document.querySelectorAll('#question-card .visual, #question-card .equation, #question-card .seq, #question-card .tenframe')
      .forEach(e => { const r = e.getBoundingClientRect(); if (r.right > card.right + 2 || r.left < card.left - 2) outside++; });
    return outside;
  });
  ok('307', 'האיור אינו חורג מהכרטיס', visual === 0, visual + ' חורגים');
  const walkerPos = await p.evaluate(() => {
    const w = document.getElementById('walker').getBoundingClientRect();
    const t = document.getElementById('track').getBoundingClientRect();
    return { inside: w.left >= t.left - 8 && w.right <= t.right + 8 };
  });
  ok('312/314', 'הדמות בתוך גבולות המסלול', walkerPos.inside);
  await p.close();

  // ---------- 352/353 ----------
  p = await H.fresh(b, 820, 1180, { progress: { totalCorrect: 22, coins: 40, bestStreak: 6 } });
  await p.evaluate(() => { MG.Storage.get().medals = ['first', 'ten']; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(250);
  await p.fill('#name-input', 'שינוי'); await p.waitForTimeout(200);
  await p.locator('#pick-faces .pick').nth(3).click(); await p.waitForTimeout(200);
  const kept = await p.evaluate(() => ({ p: MG.Storage.get().progress, m: MG.Storage.get().medals }));
  ok('352/353', 'שינוי שם/דמות אינו מאפס נתונים',
    kept.p.totalCorrect === 22 && kept.p.coins === 40 && kept.m.length === 2, JSON.stringify(kept).slice(0, 90));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-5', failed: fails.length, fails }, null, 1));
  await b.close();
})();
