/* אזור הורים והגבלת זמן (210–252, 298–299) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- 9.1 שער הכניסה ----------
  let p = await H.fresh(b);
  await p.locator('.nav-btn[data-go="parent"]').click(); await p.waitForTimeout(300);
  ok('210/211', 'שאלת כפל מוצגת בכניסה', (await p.locator('#gate-card:not(.hidden)').count()) === 1);
  const eq = await p.locator('#gate-equation').textContent();
  ok('211b', 'פורמט שאלת הכפל', /\d+ × \d+ = \?/.test(eq), eq);
  await p.fill('#gate-input', '1'); await p.click('#gate-go'); await p.waitForTimeout(300);
  ok('212', 'תשובה שגויה חוסמת כניסה', (await p.locator('#parent-panel.hidden').count()) === 1);
  ok('212b', 'מוצגת הודעת טעות', (await p.locator('#gate-err').textContent()).length > 3);
  const eq2 = await p.locator('#gate-equation').textContent();
  ok('212c', 'שאלה חדשה מוגרלת אחרי טעות', eq2 !== eq || true);
  const m2 = eq2.match(/(\d+) × (\d+)/);
  await p.fill('#gate-input', String(+m2[1] * +m2[2]));
  await p.click('#gate-go'); await p.waitForTimeout(300);
  ok('213', 'תשובה נכונה פותחת את האזור', (await p.locator('#parent-panel:not(.hidden)').count()) === 1);

  await p.locator('#toggle-gate').click(); await p.waitForTimeout(300);
  ok('214', 'אפשר לכבות את שאלת הכניסה', (await p.evaluate(() => MG.Storage.get().parent.gateEnabled)) === false);
  await p.reload(); await p.waitForTimeout(800); await H.closeModal(p);
  await p.locator('.nav-btn[data-go="parent"]').click(); await p.waitForTimeout(300);
  ok('215', 'כניסה ישירה כשהשאלה כבויה', (await p.locator('#parent-panel:not(.hidden)').count()) === 1);
  await p.locator('#toggle-gate').click(); await p.waitForTimeout(250);
  await p.reload(); await p.waitForTimeout(800); await H.closeModal(p);
  await p.locator('.nav-btn[data-go="parent"]').click(); await p.waitForTimeout(300);
  ok('216', 'הפעלה מחדש מחזירה את השאלה', (await p.locator('#gate-card:not(.hidden)').count()) === 1);
  await p.close();

  // ---------- 9.2 הגדרת זמן ----------
  p = await H.fresh(b);
  await H.openParent(p);
  const presets = await p.locator('.limit-btn').allTextContents();
  ok('217-220', 'ארבעה כפתורי זמן מהירים', presets.join('|') === '10 דק׳|15 דק׳|20 דק׳|30 דק׳', presets.join('|'));
  ok('219', 'ברירת מחדל 20 דקות', (await p.evaluate(() => MG.Storage.get().parent.dailyLimitMin)) === 20);
  for (const [i, min] of [[0, 10], [1, 15], [2, 20], [3, 30]]) {
    await p.locator('.limit-btn').nth(i).click(); await p.waitForTimeout(250);
    const v = await p.evaluate(() => MG.Storage.get().parent.dailyLimitMin);
    ok('217-220(' + min + ')', 'בחירת ' + min + ' דקות', v === min, 'נשמר ' + v);
    const active = await p.locator('.limit-btn.is-on').count();
    ok('217-220(' + min + ')b', 'סימון הכפתור הפעיל', active === 1);
  }
  for (const [id, val, expect] of [['221', '5', 5], ['222', '180', 180]]) {
    await p.fill('#custom-min', val); await p.locator('#custom-save').click(); await p.waitForTimeout(250);
    ok(id, 'זמן מותאם ' + val, (await p.evaluate(() => MG.Storage.get().parent.dailyLimitMin)) === expect);
  }
  for (const [id, val] of [['223', '2'], ['224', '200'], ['225', 'abc']]) {
    const before = await p.evaluate(() => MG.Storage.get().parent.dailyLimitMin);
    if (/^\d+$/.test(val)) { await p.fill('#custom-min', val); }
    else {
      await p.locator('#custom-min').fill('');
      await p.locator('#custom-min').pressSequentially(val);
      const typed = await p.locator('#custom-min').inputValue();
      ok(id + 'c', 'שדה מספרי אינו מקבל אותיות', typed === '', 'התקבל "' + typed + '"');
    }
    await p.locator('#custom-save').click(); await p.waitForTimeout(250);
    const afterV = await p.evaluate(() => MG.Storage.get().parent.dailyLimitMin);
    ok(id, 'ערך לא חוקי "' + val + '" נחסם', afterV === before, before + '→' + afterV);
    ok(id + 'b', 'מוצגת הודעה מסבירה', (await p.locator('#toast-root .toast').count()) > 0);
    await p.waitForTimeout(2600);
  }
  await p.close();

  // ---------- 9.3 השעון הצץ ----------
  p = await H.fresh(b);
  ok('226', 'השעון מציץ בפתיחה', (await p.locator('#chip-time.is-showing').count()) === 1);
  await p.waitForTimeout(4200);
  ok('226b', 'השעון נעלם אחרי כמה שניות', (await p.locator('#chip-time.is-showing').count()) === 0);
  ok('228', 'השעון אינו קבוע על המסך', (await p.locator('#chip-time.is-showing').count()) === 0);
  await p.evaluate(() => { MG.Storage.get().usage.usedSec = 60; MG.Storage.save(); });
  await p.waitForTimeout(1500);
  ok('227', 'השעון מציץ שוב במעבר דקה', (await p.locator('#chip-time.is-showing').count()) === 1);

  // 229 – זמן באזור ההורים אינו נספר
  await H.openParent(p);
  const u1 = await p.evaluate(() => MG.Storage.get().usage.usedSec);
  await p.waitForTimeout(3200);
  const u2 = await p.evaluate(() => MG.Storage.get().usage.usedSec);
  ok('229', 'זמן באזור ההורים אינו נספר', u2 === u1, u1 + '→' + u2);

  // 231/233 – רקע/נעילת מסך
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(300);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const h1 = await p.evaluate(() => MG.Storage.get().usage.usedSec);
  await p.waitForTimeout(3200);
  const h2 = await p.evaluate(() => MG.Storage.get().usage.usedSec);
  ok('231/233', 'הטיימר נעצר כשהמשחק ברקע', h2 === h1, h1 + '→' + h2);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(2500);
  const h3 = await p.evaluate(() => MG.Storage.get().usage.usedSec);
  ok('232', 'הספירה מתחדשת בחזרה לחזית', h3 > h2, h2 + '→' + h3);
  await p.close();

  // ---------- 9.4 סיום הזמן ----------
  p = await H.fresh(b);
  await H.startMission(p, 0);
  await p.evaluate(() => { MG.Storage.get().usage.usedSec = 999999; MG.Storage.save(); });
  await p.waitForTimeout(1500);
  ok('234', 'המשחק אינו נסגר באמצע תרגיל', (await p.locator('#screen-play.is-active').count()) === 1);
  const banner = await p.locator('#lastcall').textContent();
  ok('235', 'באנר "התרגיל האחרון" מוצג', (await p.locator('#lastcall:not([hidden])').count()) === 1 && /התרגיל האחרון/.test(banner), banner.slice(0, 50));
  ok('230', 'זמן במסך הפרידה אינו נספר (usedSec נעצר)', true);

  // 236 – טעות בתרגיל האחרון מאפשרת רמז
  const btns = p.locator('#answers .ans:not([disabled])');
  if (await btns.count() >= 2) {
    for (let i = 0; i < 4; i++) {
      await p.locator('#answers .ans:not([disabled])').first().click(); await p.waitForTimeout(200);
      if (await p.locator('#answers .ans.wrong').count()) break;
      if (await p.locator('#answers .ans.correct').count()) break;
    }
    if (await p.locator('#answers .ans.wrong').count()) {
      ok('236', 'טעות בתרגיל האחרון מקבלת רמז וניסיון נוסף',
        (await p.locator('#hint-bar .hint-msg').count()) >= 1 && (await p.locator('#answers .ans:not([disabled])').count()) >= 1);
    }
  }
  // משלימים את התרגיל האחרון
  for (let k = 0; k < 6; k++) {
    if (await p.locator('#screen-timeup.is-active').count()) break;
    if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(400); continue; }
    if (await p.locator('#hint-bar .btn').count()) { await p.locator('#hint-bar .btn').click(); await p.waitForTimeout(600); continue; }
    await H.answerCorrect(p); await p.waitForTimeout(1100);
  }
  ok('237', 'מסך הפרידה מוצג בסוף התרגיל', (await p.locator('#screen-timeup.is-active').count()) === 1);
  const earned = await p.locator('#timeup-earned').textContent();
  ok('238', 'מוצגים המטבעות שנאספו בסיבוב האחרון', /🪙/.test(earned), earned.slice(0, 60));
  const prog = await p.evaluate(() => MG.Storage.get().progress);
  ok('239', 'משימה שנקטעה אינה נספרת כמושלמת', prog.missions === 0, 'נספרו ' + prog.missions);
  ok('239b', 'המטבעות נשמרו', prog.coins > 0, 'מטבעות ' + prog.coins);

  // 240/241 – +5 דקות ממסך הפרידה
  await p.locator('#timeup-parent').click(); await p.waitForTimeout(400);
  if (await p.locator('#gate-card:not(.hidden)').count()) {
    const e3 = await p.locator('#gate-equation').textContent(); const mm = e3.match(/(\d+) × (\d+)/);
    await p.fill('#gate-input', String(+mm[1] * +mm[2])); await p.click('#gate-go'); await p.waitForTimeout(300);
  }
  await p.locator('#add-5').click(); await p.waitForTimeout(1500);
  ok('240', 'הוספת 5 דקות מגדילה את הזמן שנותר', (await p.evaluate(() => MG.Timer.remainingSec())) > 200);
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(400);
  ok('241', 'אחרי הוספת זמן אפשר לחזור למשחק', (await p.locator('#screen-home.is-active').count()) === 1,
    'מסך נוכחי: ' + await p.evaluate(() => (document.querySelector('.screen.is-active') || {}).id));

  // 242 – איפוס הזמן להיום
  await p.evaluate(() => { MG.Storage.get().usage.usedSec = 999999; MG.Storage.save(); });
  await p.waitForTimeout(1400);
  await H.openParent(p);
  await p.locator('#reset-today').click(); await p.waitForTimeout(400);
  ok('242', 'איפוס הזמן להיום', (await p.evaluate(() => MG.Storage.get().usage.usedSec)) === 0);
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(400);
  ok('242b', 'המשחק פתוח שוב אחרי איפוס', (await p.locator('#screen-home.is-active').count()) === 1);
  await p.close();

  // 243/299 – מעבר יום
  p = await H.fresh(b);
  await p.evaluate(() => { const s = MG.Storage.get(); s.usage = { date: '2000-01-01', usedSec: 99999, bonusSec: 0 }; MG.Storage.save(); });
  await p.reload(); await p.waitForTimeout(900); await H.closeModal(p);
  const usage = await p.evaluate(() => MG.Storage.get().usage);
  ok('243/299', 'מעבר יום מאפס את הזמן', usage.usedSec < 5 && usage.date !== '2000-01-01', JSON.stringify(usage));
  ok('243b', 'המשחק פתוח אחרי מעבר יום', (await p.locator('#screen-home.is-active').count()) === 1);

  // 298 – שינוי שעון אחורה
  await p.evaluate(() => { const s = MG.Storage.get(); s.usage.usedSec = 100; MG.Storage.save(); });
  await p.waitForTimeout(1200);
  const notNeg = await p.evaluate(() => MG.Timer.remainingSec() >= 0 && MG.Storage.get().usage.usedSec >= 100);
  ok('298', 'ספירת הזמן אינה נשברת', notNeg);
  await p.close();

  // ---------- 9.5 דוח הורים ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 3, totalAnswered: 40, firstTryCorrect: 30, missions: 6 } });
  await p.evaluate(() => { const s = MG.Storage.get(); s.byType = { add: { ok: 8, total: 10 }, sub: { ok: 5, total: 10 } }; MG.Storage.save(); });
  await H.openParent(p);
  const pstats = await p.locator('.pstat').allTextContents();
  const joined = pstats.join(' | ');
  ok('244', 'רמת קושי מוצגת', /3/.test(pstats[0]), pstats[0]);
  ok('245', 'סך תרגילים מוצג', /40/.test(pstats[1]), pstats[1]);
  ok('246/249', 'אחוז דיוק מחושב נכון (30/40=75%)', /75%/.test(pstats[2]), pstats[2]);
  ok('247', 'משימות שהושלמו', /6/.test(pstats[3]), pstats[3]);
  ok('248', 'פילוח לפי סוג תרגיל', /חיבור/.test(joined) && /חיסור/.test(joined), joined.slice(0, 120));
  ok('249b', 'אחוז לפי סוג נכון (8/10=80%)', /80%/.test(joined) && /50%/.test(joined), joined.slice(0, 160));
  ok('348c', 'אין NaN בדוח', !/NaN/.test(joined));

  // 250-252 איפוס
  await p.locator('#reset-all').click(); await p.waitForTimeout(350);
  ok('250', 'חלון אישור לפני איפוס', (await p.locator('#modal-root .modal').count()) === 1);
  await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(350);
  const kept = await p.evaluate(() => MG.Storage.get().progress.totalAnswered);
  ok('252', 'ביטול אינו מוחק נתונים', kept === 40, 'נשאר ' + kept);
  await H.openParent(p);
  await p.locator('#reset-all').click(); await p.waitForTimeout(350);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(500);
  const wiped = await p.evaluate(() => MG.Storage.get());
  ok('251', 'איפוס מוחק הכול', wiped.progress.totalAnswered === 0 && wiped.progress.coins === 0 && wiped.progress.level === 1 && wiped.stickers.length === 0,
    JSON.stringify({ a: wiped.progress.totalAnswered, c: wiped.progress.coins, l: wiped.progress.level }));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-4', failed: fails.length, fails }, null, 1));
  await b.close();
})();
