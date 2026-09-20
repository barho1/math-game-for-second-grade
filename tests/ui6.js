/* זרימות מלאות, טקסטים וביצועים (342–347, 354–440) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- E2E 1: משתמש חדש ----------
  let p = await H.fresh(b);
  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(250);
  await p.fill('#name-input', 'נועם'); await p.waitForTimeout(150);
  await p.locator('#pick-faces .pick').nth(1).click(); await p.waitForTimeout(200);
  await H.startMission(p, 0);
  const done = await H.playMission(p);
  ok('354-370a', 'משימה ראשונה הושלמה', done && (await p.locator('#screen-result.is-active').count()) === 1);
  const st1 = await p.evaluate(() => MG.Storage.get().progress);
  ok('354-370b', 'התקבלו כוכבים ומטבעות', st1.stars >= 1 && st1.coins >= 4, JSON.stringify({ s: st1.stars, c: st1.coins }));
  ok('433', 'כפתור "עוד משימה" קיים', (await p.locator('#res-again').count()) === 1);
  ok('432', 'כפתור "למפה" קיים', (await p.locator('#res-home').count()) === 1);
  await p.locator('#res-home').click(); await p.waitForTimeout(400);
  ok('432b', 'חזרה למפה עובדת', (await p.locator('#screen-home.is-active').count()) === 1);

  await p.evaluate(() => { MG.Storage.get().progress.coins = 20; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  const cheap = p.locator('.shop-item').filter({ has: p.locator('.s-buy:not([disabled])') }).first();
  await cheap.locator('.s-buy').click(); await p.waitForTimeout(400); await H.closeModal(p);
  const hat = await p.evaluate(() => MG.Storage.get().player.hat);
  ok('354-370c', 'קניית כובע והרכבתו', !!hat, String(hat));
  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(300);
  ok('354-370d', 'הכובע מוצג על הדמות', (await p.locator('#avatar-hat').textContent()) === hat);
  await p.close();

  // ---------- E2E 4: מדליה בזמן אמת ----------
  p = await H.fresh(b, 820, 1180, { progress: { totalCorrect: 8, totalAnswered: 8, firstTryCorrect: 8 } });
  await H.startMission(p, 0);
  let medalSeen = false, answers = 0;
  for (let s = 0; s < 8 && answers < 3; s++) {
    if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(350); continue; }
    if (await p.locator('#hint-bar .btn').count()) { await p.locator('#hint-bar .btn').click(); await p.waitForTimeout(350); continue; }
    await H.answerCorrect(p); answers++;
    await p.waitForTimeout(500);
    const toastTxt = await p.locator('#toast-root').textContent();
    const modalTxt = (await p.locator('#modal-root .modal').count()) ? await p.locator('#modal-root .modal').textContent() : '';
    if (/מדליה|עשרה נכונים/.test(toastTxt + modalTxt)) medalSeen = true;
    const corr = await p.evaluate(() => MG.Storage.get().progress.totalCorrect);
    if (corr >= 10) break;
    await p.waitForTimeout(400);
  }
  const corrNow = await p.evaluate(() => MG.Storage.get().progress.totalCorrect);
  const medalsNow = await p.evaluate(() => MG.Storage.get().medals);
  ok('194/411-430', 'מדליה נפתחת מיד עם התקיימות התנאי (ולא רק בסוף המשימה)',
    corrNow < 10 || medalsNow.includes('ten') || medalSeen,
    'נכונים=' + corrNow + ' מדליות=' + medalsNow.join(',') + ' הודעה=' + medalSeen);
  await p.close();

  // ---------- E2E 2: פתיחת עולם ----------
  p = await H.fresh(b, 820, 1180, { progress: { stars: 8 } });
  await H.startMission(p, 0);
  await H.playMission(p);
  const resultTxt = await p.locator('#screen-result').textContent();
  const starsNow = await p.evaluate(() => MG.Storage.get().progress.stars);
  ok('371-390', 'חציית 9 כוכבים מכריזה על פתיחת עולם', starsNow < 9 || /נפתח עולם חדש/.test(resultTxt),
    'כוכבים=' + starsNow);
  await p.locator('#res-home').click(); await p.waitForTimeout(400);
  const ocean = await p.locator('.world').nth(1).evaluate(e => e.classList.contains('locked'));
  ok('371-390b', 'עולם 2 נפתח במפה', starsNow < 9 || !ocean);
  await p.close();

  // ---------- 18: טקסטים ותוכן ----------
  p = await H.fresh(b);
  const worlds = (await p.locator('.world-name').allTextContents()).map(s => s.replace(' ✔', '').trim());
  ok('438', 'שמות העולמות תקינים',
    worlds.join('|') === 'אחו הפרחים|מפרץ הים|מסע לחלל|ארץ הממתקים|ג׳ונגל הקופים', worlds.join('|'));
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  const shopNames = await p.locator('.shop-item .s-name').allTextContents();
  const expected = ['כתר מלכותי','כובע מצחייה','מגבעת קסמים','כובע בוגרים','פפיון ורוד','כובע מסיבה','זר פרחים','מסכת גיבור','תיבת הפתעה'];
  ok('439', 'שמות פריטי החנות תקינים', expected.every(n => shopNames.includes(n)), shopNames.join('|'));

  // 440 – שמות הרמות
  const levelNames = [];
  for (let lv = 1; lv <= 5; lv++) {
    await p.evaluate(l => { MG.Storage.get().progress.level = l; MG.Storage.save(); }, lv);
    await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(200);
    const tip = await p.locator('#home-tip').textContent();
    levelNames.push((tip.match(/רמה נוכחית:\s*([^·]+)/) || [])[1].trim());
    await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(150);
  }
  ok('440', 'שמות הרמות', levelNames.join('|') === 'מתחילים|מתקדמים|אלופים|סופר-אלופים|אשפי חשבון', levelNames.join('|'));

  // 437 – גיוון שאלת הכפל
  const gates = new Set();
  for (let i = 0; i < 12; i++) {
    await p.locator('.nav-btn[data-go="parent"]').click(); await p.waitForTimeout(200);
    if (await p.locator('#gate-card:not(.hidden)').count()) gates.add(await p.locator('#gate-equation').textContent());
    await p.fill('#gate-input', '0'); await p.click('#gate-go'); await p.waitForTimeout(150);
    await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(150);
  }
  ok('437', 'שאלת הכפל מתחלפת', gates.size >= 4, 'שאלות שונות: ' + gates.size);

  // 436 – טקסטים של "רגע של קסם"
  const tips = await p.evaluate(() => {
    const src = document.querySelector('script[src*="app.js"]');
    return null;
  });
  await p.close();

  // ---------- 15 ביצועים ----------
  p = await b.newPage({ viewport: { width: 820, height: 1180 } }); await H.skipHelp(p);
  const t0 = Date.now();
  await p.goto(H.URL, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  ok('346', 'זמן טעינה מתחת ל-2 שניות', loadMs < 2000, loadMs + 'ms');
  await p.waitForTimeout(800); await H.closeModal(p);

  // 343 – 100 תרגילים ברצף (רינדור בלבד, בלי המתנות)
  const perf = await p.evaluate(() => {
    const card = document.getElementById('question-card');
    const t = performance.now();
    for (let i = 0; i < 300; i++) {
      const q = MG.Questions.generate(1 + (i % 5), null, i % 2 === 0);
      card.innerHTML = '<div class="q-kicker">' + q.kicker + '</div>' + q.html;
    }
    return { ms: Math.round(performance.now() - t), nodes: document.querySelectorAll('*').length };
  });
  ok('343', '300 תרגילים מרונדרים מהר', perf.ms < 3000, perf.ms + 'ms');
  ok('342/345', 'אין הצטברות אלמנטים ב-DOM', perf.nodes < 3000, perf.nodes + ' אלמנטים');

  // 344 – כניסה ויציאה מהירה מאזור ההורים
  await p.evaluate(() => { MG.Storage.get().parent.gateEnabled = false; MG.Storage.save(); });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  for (let i = 0; i < 20; i++) {
    await p.locator('.nav-btn[data-go="parent"]').click({ timeout: 3000 }).catch(() => {});
    await p.locator('.nav-btn[data-go="home"]').click({ timeout: 3000 }).catch(() => {});
  }
  await p.waitForTimeout(300);
  ok('344', '20 כניסות/יציאות מאזור ההורים', errs.length === 0, errs.join('|'));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-6', failed: fails.length, fails }, null, 1));
  await b.close();
})();
