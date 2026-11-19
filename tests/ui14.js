/* ספירת זמן רק בתוך שלב, ומצב בדיקות (פרופיל נפרד שאינו נוגע בנתוני הילדה) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };
const used = p => p.evaluate(() => MG.Storage.get().usage.usedSec);

(async () => {
  const b = await chromium.launch();
  let p;

  // ---------- הזמן נספר רק בתוך שלב ----------
  p = await H.fresh(b);
  await p.waitForTimeout(2200);
  ok('Z1', 'במפה הזמן לא נספר', (await used(p)) === 0, String(await used(p)));
  ok('Z1b', 'במפה המונה אינו נספר', (await p.evaluate(() => MG.Timer.isCountable())) === false);
  for (const nav of ['avatar', 'collection', 'shop']) {
    await p.locator('.nav-btn[data-go="' + nav + '"]').click(); await p.waitForTimeout(1600);
  }
  ok('Z2', 'באוסף, בחנות ובדמות הזמן לא נספר', (await used(p)) === 0, String(await used(p)));
  await H.openParent(p); await p.waitForTimeout(1500);
  ok('Z3', 'באזור ההורים הזמן לא נספר', (await used(p)) === 0);

  await H.startMission(p, 0);
  ok('Z4c', 'השעון מציץ בתחילת השלב', (await p.locator('#chip-time.is-showing').count()) === 1);
  const u0 = await used(p);
  await p.waitForTimeout(3200);
  const u1 = await used(p);
  ok('Z4', 'בתוך שלב הזמן נספר', u1 - u0 >= 2 && u1 - u0 <= 4, u0 + '→' + u1);
  ok('Z4b', 'בתוך שלב המונה פעיל', (await p.evaluate(() => MG.Timer.isCountable())) === true);

  await p.locator('#btn-quit').click(); await p.waitForTimeout(250);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(500);
  const u2 = await used(p);
  await p.waitForTimeout(2200);
  ok('Z5', 'אחרי יציאה מהשלב הספירה נעצרת', (await used(p)) === u2, u2 + '→' + (await used(p)));

  await H.startMission(p, 0);
  await H.playMission(p);
  const u3 = await used(p);
  await p.waitForTimeout(2200);
  ok('Z6', 'במסך הסיכום הזמן לא נספר', (await p.locator('#screen-result.is-active').count()) === 1 && (await used(p)) === u3);
  await p.close();

  // ---------- מצב בדיקות ----------
  const girl = { progress: { stars: 33, coins: 12, level: 3 }, root: { player: { name: 'דנה', face: '🐼', color: '#ffd166', hat: '' } } };
  p = await H.fresh(b, 820, 1180, girl);
  ok('T1', 'בפרופיל הילדה אין פס בדיקות', (await p.locator('#testbar:not([hidden])').count()) === 0);

  await H.openParent(p);
  ok('T2', 'בפרופיל הילדה מוצג כפתור כניסה, בלי כלי בדיקה', (await p.locator('#test-enter:visible').count()) === 1 && (await p.locator('#test-tools:visible').count()) === 0);
  await p.locator('#test-enter').click(); await p.waitForTimeout(1200);
  // מכאן והלאה: שום דבר שקורה במצב בדיקות אינו רשאי לשנות את שמירת הילדה, בייט-בייט
  const mainBefore = await p.evaluate(() => localStorage.getItem('mg-number-journey-v1'));
  ok('T3', 'פס מצב בדיקות מוצג אחרי הכניסה', (await p.locator('#testbar:not([hidden])').count()) === 1);
  const inTest = await p.evaluate(() => ({ t: MG.Storage.isTestMode(), s: MG.Storage.get() }));
  ok('T4', 'פרופיל הבדיקות נקי: אין כוכבים, שם בדיקות, 300 דקות', inTest.t && inTest.s.progress.stars === 0 && inTest.s.player.name === 'בדיקות' && inTest.s.parent.dailyLimitMin === 300, JSON.stringify(inTest.s.progress));

  ok('T4b', 'פרופיל בדיקות חדש מציג את הסיור הראשוני', (await p.evaluate(() => MG.Storage.get().help.tourDone)) === false);
  await p.evaluate(() => { var h = MG.Storage.get().help; h.tourDone = true; h.handShown = true; h.seenTypes = Object.keys(MG.Questions.HOW_TO); MG.Storage.save(); });
  await H.reload(p);

  // כלי בדיקה
  await H.openParent(p);
  ok('T5', 'במצב בדיקות מוצגים כלי הבדיקה, וכפתור האיפוס הרגיל מוסתר', (await p.locator('#test-tools:visible').count()) === 1 && (await p.locator('#reset-all:visible').count()) === 0);
  await p.locator('#test-stars').click(); await p.locator('#test-coins').click(); await p.waitForTimeout(300);
  const tools = await p.evaluate(() => MG.Storage.get().progress);
  ok('T6', 'כוכבים ומטבעות נוספו בפרופיל הבדיקות', tools.stars === 50 && tools.coins === 100, JSON.stringify(tools));
  await p.locator('#test-near-end').click(); await p.waitForTimeout(300);
  ok('T7', 'הטיימר מכוון ל-10 שניות לסוף', (await p.evaluate(() => MG.Timer.remainingSec())) <= 10);
  await p.evaluate(() => MG.Timer.resetToday());

  // משחק מלא בפרופיל הבדיקות
  await H.startMission(p, 0);
  await H.playMission(p);
  const testProg = await p.evaluate(() => MG.Storage.get().progress.missions);
  ok('T8', 'משימה בפרופיל הבדיקות נרשמת בו', testProg >= 1, String(testProg));
  ok('T9', 'המפתח של הילדה לא השתנה (זהה בייט-בייט)', (await p.evaluate(() => localStorage.getItem('mg-number-journey-v1'))) === mainBefore);
  ok('T10', 'הפס מוצג גם בתוך שלב', await (async () => {
    await H.startMission(p, 0);
    return (await p.locator('#screen-play.is-active').count()) === 1 && (await p.locator('#testbar:visible').count()) === 1;
  })());

  // רענון בתוך אותו סשן נשאר במצב בדיקות
  await H.reload(p);
  ok('T11', 'רענון באותו סשן נשאר במצב בדיקות', (await p.evaluate(() => MG.Storage.isTestMode())) && (await p.evaluate(() => MG.Storage.get().progress.missions)) >= 1);

  // העתקת ההתקדמות של הילדה
  await H.openParent(p);
  await p.locator('#test-copy').click(); await p.waitForTimeout(350);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(600);
  const copied = await p.evaluate(() => ({ s: MG.Storage.get().progress, n: MG.Storage.get().player.name }));
  ok('T12', 'ההתקדמות של הילדה הועתקה לפרופיל הבדיקות', copied.s.stars === 33 && copied.n === 'דנה', JSON.stringify(copied));
  ok('T12b', 'ההעתקה לא שינתה את הפרופיל של הילדה', (await p.evaluate(() => localStorage.getItem('mg-number-journey-v1'))) === mainBefore);

  // איפוס פרופיל הבדיקות
  await H.openParent(p);
  await p.locator('#test-reset').click(); await p.waitForTimeout(350);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(600);
  ok('T13', 'איפוס פרופיל הבדיקות מאפס אותו בלבד', (await p.evaluate(() => MG.Storage.get().progress.stars)) === 0 && (await p.evaluate(() => localStorage.getItem('mg-number-journey-v1'))) === mainBefore);

  // יציאה מהפס העליון
  await p.locator('#testbar-exit').click(); await p.waitForTimeout(1200);
  ok('T14', 'יציאה חוזרת לפרופיל הילדה', !(await p.evaluate(() => MG.Storage.isTestMode())) && (await p.evaluate(() => MG.Storage.get().player.name)) === 'דנה'
    && (await p.locator('#testbar:not([hidden])').count()) === 0);
  ok('T15', 'נתוני הילדה לא נפגעו לאורך כל הבדיקה', (await p.evaluate(() => MG.Storage.get().progress.stars)) === 33);
  await p.close();

  // כניסה דרך הכתובת ?test=1, ויציאה שלא חוזרת למצב בדיקות
  p = await b.newPage({ serviceWorkers: 'block' });
  await p.goto(H.URL + '?test=1'); await p.waitForTimeout(900);
  ok('T16', '?test=1 מפעיל מצב בדיקות', await p.evaluate(() => MG.Storage.isTestMode()));
  await p.evaluate(() => { var h = MG.Storage.get().help; h.tourDone = true; MG.Storage.save(); });
  await p.reload(); await p.waitForTimeout(900);
  await p.locator('#testbar-exit').click(); await p.waitForTimeout(1200);
  ok('T17', 'יציאה מ-?test=1 אינה חוזרת למצב בדיקות', !(await p.evaluate(() => MG.Storage.isTestMode())) && !/test=1/.test(p.url()), p.url());
  await p.close();

  // סשן חדש תמיד נפתח בפרופיל הילדה
  const ctx = await b.newContext({ serviceWorkers: 'block' });
  p = await ctx.newPage();
  await p.goto(H.URL); await p.waitForTimeout(800);
  ok('T18', 'סשן חדש נפתח בפרופיל הילדה', !(await p.evaluate(() => MG.Storage.isTestMode())));
  await ctx.close();

  console.log(JSON.stringify({ part: 'UI-14', failed: fails.length, fails }, null, 1));
  await b.close();
})();
