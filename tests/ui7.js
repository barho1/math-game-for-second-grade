/* מנוע ההתאמה האדפטיבית (94–114, 59, 62, 156–157) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

/* מחליף את מחולל התרגילים בתרגיל קבוע עם תשובה ידועה, כדי לשלוט במה שקורה */
async function stub(p) {
  await p.evaluate(() => {
    window.__gen = [];
    MG.Questions.generate = function (level, type, hint) {
      window.__gen.push({ level: level, hint: !!hint });
      return {
        type: 'add', kicker: 'חיבור', level: level,
        html: '<div class="equation">1 + 1 = <span class="blank">?</span></div>',
        input: 'choices',
        choices: [{ v: 2, sym: '2' }, { v: 3, sym: '3' }, { v: 4, sym: '4' }, { v: 5, sym: '5' }],
        answer: 2, hintHtml: '<p class="q-text">רמז</p>', explainHtml: '<p class="q-text">הסבר</p>'
      };
    };
  });
}
const right = async (p) => { await p.locator('#answers .ans .sym:text-is("2")').locator('..').click(); await p.waitForTimeout(1000); await H.closeModal(p); };
const wrong = async (p) => {
  const btn = p.locator('#answers .ans:not([disabled]) .sym:text-is("5")').locator('..');
  if (!(await btn.count())) return;                 // כבר נלחץ – אין מה לעשות
  await btn.click();
  await p.waitForTimeout(550);                      // מעבר לחלון ההגנה מהקשה כפולה
};
const level = (p) => p.evaluate(() => MG.Storage.get().progress.level);

(async () => {
  const b = await chromium.launch();

  // ---------- 4.1 עליית רמה ----------
  let p = await H.fresh(b);
  await stub(p);
  await H.startMission(p, 0);
  await right(p); ok('94', 'נכון אחד — הרמה לא משתנה', (await level(p)) === 1, 'רמה ' + await level(p));
  await right(p); ok('95', 'שניים נכונים — הרמה לא משתנה', (await level(p)) === 1);
  await right(p);
  ok('96/101', 'שלושה נכונים ברצף — עלייה לרמה 2', (await level(p)) === 2, 'רמה ' + await level(p));
  const toastTxt = await p.locator('#toast-root').textContent();
  ok('97', 'הודעת "עלית רמה" מוצגת', /עלית רמה/.test(toastTxt), toastTxt.trim().slice(0, 40));
  const gens = await p.evaluate(() => window.__gen);
  ok('98', 'התרגיל הבא נוצר ברמה החדשה', gens[gens.length - 1].level >= 2, JSON.stringify(gens.slice(-3)));
  await p.close();

  // 99/100 — תשובה נכונה בניסיון שני אינה נספרת ברצף
  p = await H.fresh(b); await stub(p); await H.startMission(p, 0);
  await right(p);
  await wrong(p); await right(p);          // נכון בניסיון שני
  await right(p);
  ok('99/100', 'נכון אחרי רמז אינו נספר ברצף לעליית רמה', (await level(p)) === 1, 'רמה ' + await level(p));
  await p.close();

  // 101-105 — עלייה דרך כל הרמות
  p = await H.fresh(b); await stub(p); await H.startMission(p, 0);
  const seen = [];
  for (let i = 0; i < 15; i++) { await right(p); seen.push(await level(p));
    if (await p.locator('#screen-result.is-active').count()) { await p.locator('#res-again').click(); await p.waitForTimeout(600); await stub(p); } }
  ok('102-104', 'עלייה רציפה עד רמה 5', Math.max(...seen) === 5, seen.join(','));
  for (let i = 0; i < 6; i++) { await right(p);
    if (await p.locator('#screen-result.is-active').count()) { await p.locator('#res-again').click(); await p.waitForTimeout(600); await stub(p); } }
  ok('105', 'ברמה 5 נשארים ברמה 5 ללא קריסה', (await level(p)) === 5 && p.__errors.length === 0, 'רמה ' + await level(p) + ' ' + p.__errors.join('|'));
  await p.close();

  // ---------- 4.2 ירידת רמה ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 5 } }); await stub(p); await H.startMission(p, 0);
  await wrong(p); await right(p);   // טעות 1
  await wrong(p); await right(p);   // טעות 2 מתוך 3 האחרונים
  ok('106/109', 'שתי טעויות מתוך שלושה — ירידת רמה', (await level(p)) === 4, 'רמה ' + await level(p));
  const downToast = await p.locator('#toast-root').textContent();
  ok('107', 'הודעה חיובית בירידת רמה', /רגוע/.test(downToast), downToast.trim().slice(0, 40));
  const g2 = await p.evaluate(() => window.__gen);
  ok('108', 'שני התרגילים הבאים מגיעים עם המחשה חזותית', g2.slice(-1)[0].hint === true, JSON.stringify(g2.slice(-2)));
  await p.close();

  // 110-113 — ירידה עד רמה 1 ולא מתחת
  p = await H.fresh(b, 820, 1180, { progress: { level: 2 } }); await stub(p); await H.startMission(p, 0);
  for (let i = 0; i < 4; i++) { await wrong(p); await right(p);
    if (await p.locator('#screen-result.is-active').count()) { await p.locator('#res-again').click(); await p.waitForTimeout(600); await stub(p); } }
  const lvl = await level(p);
  ok('112/113', 'לא יורדים מתחת לרמה 1', lvl === 1 && p.__errors.length === 0, 'רמה ' + lvl);

  // 114 — שמירת הרמה אחרי רענון
  await p.evaluate(() => { MG.Storage.get().progress.level = 3; MG.Storage.save(); });
  await p.reload(); await p.waitForTimeout(850); await H.closeModal(p);
  ok('114', 'הרמה נשמרת אחרי סגירת הדפדפן', (await level(p)) === 3, 'רמה ' + await level(p));
  await p.close();

  // ---------- 59/62 אתגר הכוכב ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 2, stars: 99 } });
  await stub(p);
  await H.startMission(p, 0, true);
  await p.evaluate(() => { Math.random = () => 0.5; });
  const bonusLevels = await p.evaluate(() => window.__gen.map(g => g.level));
  ok('59', 'אתגר הכוכב מייצר תרגילים ברמה אחת מעל', bonusLevels[0] === 3, JSON.stringify(bonusLevels));
  const coinsBefore = await p.evaluate(() => MG.Storage.get().progress.coins);
  await right(p);
  const coinsAfter = await p.evaluate(() => MG.Storage.get().progress.coins);
  ok('62', 'אתגר הכוכב מתגמל 4 מטבעות', coinsAfter - coinsBefore === 4, 'קיבל ' + (coinsAfter - coinsBefore));
  await p.close();

  // ---------- 156-158 תגמול רגיל ----------
  p = await H.fresh(b); await stub(p); await H.startMission(p, 0);
  // מנטרלים את ההפתעות האקראיות, אחרת הן מוסיפות מטבעות ומעוותות את המדידה
  await p.evaluate(() => { Math.random = () => 0.5; });
  let c0 = await p.evaluate(() => MG.Storage.get().progress.coins);
  await right(p);
  let c1 = await p.evaluate(() => MG.Storage.get().progress.coins);
  ok('156', 'נכון בניסיון ראשון = 2 מטבעות', c1 - c0 === 2, 'קיבל ' + (c1 - c0));
  await wrong(p); await right(p);
  let c2 = await p.evaluate(() => MG.Storage.get().progress.coins);
  ok('157', 'נכון בניסיון שני = מטבע אחד', c2 - c1 === 1, 'קיבל ' + (c2 - c1));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-7', failed: fails.length, fails }, null, 1));
  await b.close();
})();
