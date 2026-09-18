/* טעויות ורמזים, קלט, כלכלת מטבעות וכוכבים (115–176) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

/* לוחץ על תשובה שגויה ומחזיר את הכפתור */
async function clickWrong(p) {
  const btns = p.locator('#answers .ans:not([disabled])');
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    const b = btns.nth(i);
    await b.click(); await p.waitForTimeout(160);
    if (await p.locator('#answers .ans.wrong').count()) return true;
    if (await p.locator('#answers .ans.correct').count()) return false; // ניחשנו נכון, ננסה בתרגיל הבא
  }
  return false;
}

(async () => {
  const b = await chromium.launch();

  // ---------- 5.1 / 5.2 מנגנון הטעות ----------
  let p = await H.fresh(b);
  await H.startMission(p, 0);
  let found = false;
  for (let k = 0; k < 8 && !found; k++) {
    if (await clickWrong(p)) { found = true; break; }
    await p.waitForTimeout(900);
    if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(400); }
  }
  ok('115', 'טעות ראשונה מסמנת את הכפתור', found);
  if (found) {
    const hint = await p.locator('#hint-bar').textContent();
    ok('116', 'הודעת "כמעט!" מוצגת', /כמעט/.test(hint), hint.slice(0, 40));
    ok('119', 'מוצג רמז חזותי', (await p.locator('#hint-bar .hint-msg').count()) >= 2);
    ok('118', 'המטבעות לא ירדו', (await p.evaluate(() => MG.Storage.get().progress.coins)) === 0);
    const enabled = await p.locator('#answers .ans:not([disabled])').count();
    ok('120', 'התרגיל פתוח לניסיון נוסף', enabled >= 1, 'זמינים ' + enabled);
    const wrongDisabled = await p.locator('#answers .ans.wrong[disabled]').count();
    ok('121', 'הכפתור השגוי מנוטרל ואינו נספר שוב', wrongDisabled >= 1);

    // טעות שנייה
    await clickWrong(p); await p.waitForTimeout(300);
    const allDisabled = (await p.locator('#answers .ans:not([disabled])').count()) === 0;
    ok('122', 'אין ניסיון שלישי', allDisabled);
    ok('123', 'הפתרון הנכון מודגש', (await p.locator('#answers .ans.reveal').count()) === 1);
    const txt = await p.locator('#hint-bar').textContent();
    ok('124', 'הסבר מעודד מוצג', /ככה לומדים/.test(txt));
    ok('125', 'כפתור "הבנתי, ממשיכים"', (await p.locator('#hint-bar .btn').count()) === 1);
    const before = await p.locator('#track .track-step.done').count();
    await p.locator('#hint-bar .btn').click(); await p.waitForTimeout(600);
    const after = await p.locator('#track .track-step.done').count();
    ok('126/127', 'ממשיכים לתרגיל הבא', after === before + 1, before + '→' + after);
  }
  await p.close();

  // ---------- 6.1 כפתורי תשובה ----------
  p = await H.fresh(b);
  await H.startMission(p, 0);
  const sizes = await p.locator('#answers .ans').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  ok('140', 'שטח לחיצה מספק (48px+)', sizes.every(([w, h]) => w >= 48 && h >= 48), JSON.stringify(sizes[0]));

  // ---------- 6.2 מקלדת מספרים ----------
  await p.evaluate(() => { MG.Storage.get().progress.level = 4; MG.Storage.save(); });
  let padFound = false;
  for (let k = 0; k < 25 && !padFound; k++) {
    await p.evaluate(() => {
      const card = document.getElementById('question-card');
      const q = MG.Questions.generate(4, 'missing', false);
      window.__q = q;
    });
    padFound = true;
  }
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 4 } });
  // מכריחים תרגיל מקלדת: משימה עד שמופיע pad
  let gotPad = false;
  for (let attempt = 0; attempt < 6 && !gotPad; attempt++) {
    await H.startMission(p, 0);
    for (let s = 0; s < 8; s++) {
      if (await p.locator('#answers.pad').count()) { gotPad = true; break; }
      if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(350); continue; }
      if (await p.locator('#hint-bar .btn').count()) { await p.locator('#hint-bar .btn').click(); await p.waitForTimeout(350); continue; }
      await H.answerCorrect(p); await p.waitForTimeout(820);
      if (await p.locator('#screen-result.is-active').count()) break;
    }
    if (!gotPad && await p.locator('#screen-result.is-active').count()) { await p.locator('#res-home').click(); await p.waitForTimeout(300); }
  }
  ok('141', 'מקלדת מספרים מופיעה בתרגילי הקלדה', gotPad);
  if (gotPad) {
    await p.locator('#answers .pad-key:text-is("7")').click(); await p.waitForTimeout(120);
    ok('142', 'הקלדת ספרה בודדת', (await p.locator('#pad-display').textContent()) === '7');
    await p.locator('#answers .pad-key:text-is("1")').click(); await p.waitForTimeout(100);
    await p.locator('#answers .pad-key:text-is("5")').click(); await p.waitForTimeout(100);
    ok('143/144', 'הקלדת 3 ספרות', (await p.locator('#pad-display').textContent()) === '715');
    await p.locator('#answers .pad-key:text-is("9")').click(); await p.waitForTimeout(100);
    ok('145', 'ספרה רביעית נחסמת', (await p.locator('#pad-display').textContent()) === '715');
    await p.locator('#answers .pad-del').click(); await p.waitForTimeout(100);
    ok('146', 'מחיקה מוחקת ספרה אחת', (await p.locator('#pad-display').textContent()) === '71');
    for (let i = 0; i < 3; i++) await p.locator('#answers .pad-del').click();
    await p.waitForTimeout(100);
    ok('146b', 'מחיקה מרוקנת בלי לקרוס', (await p.locator('#pad-display').textContent()) === '');
    await p.locator('#answers .pad-ok').click(); await p.waitForTimeout(250);
    ok('147', 'אישור על שדה ריק אינו מתקדם/קורס', (await p.locator('#answers.pad').count()) === 1 && p.__errors.length === 0, p.__errors.join('|'));
    // 152-154 מקלדת חומרה במצב pad
    await p.keyboard.press('5'); await p.waitForTimeout(120);
    ok('152', 'מקלדת חומרה מקלידה ספרה', (await p.locator('#pad-display').textContent()) === '5');
    await p.keyboard.press('Backspace'); await p.waitForTimeout(120);
    ok('154', 'Backspace מוחק', (await p.locator('#pad-display').textContent()) === '');
    await p.keyboard.press('a'); await p.waitForTimeout(120);
    ok('155', 'אותיות מתעלמות', (await p.locator('#pad-display').textContent()) === '');
  }
  await p.close();

  // ---------- 6.3 מקלדת חומרה בבחירה מרובעת ----------
  p = await H.fresh(b);
  await H.startMission(p, 0);
  while (await p.locator('#answers.pad').count()) { await H.answerCorrect(p); await p.waitForTimeout(800); }
  for (const key of ['1', '2', '3', '4']) {
    const before = await p.locator('#answers .ans').count();
    if (before < 4) break;
    await p.keyboard.press(key); await p.waitForTimeout(200);
    const reacted = (await p.locator('#answers .ans.correct, #answers .ans.wrong').count()) > 0;
    ok('148-151(' + key + ')', 'מקש ' + key + ' בוחר תשובה', reacted);
    if (await p.locator('#answers .ans.correct').count()) { await p.waitForTimeout(900); }
    if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(350); }
    if (await p.locator('#hint-bar .btn').count()) { await p.locator('#hint-bar .btn').click(); await p.waitForTimeout(400); }
    if (await p.locator('#screen-result.is-active').count()) break;
  }
  await p.close();

  // ---------- 7.1 כלכלה: מטבעות ----------
  p = await H.fresh(b);
  await H.startMission(p, 0);
  let firstTryCount = 0, coinsExpected = 0;
  for (let s = 0; s < 8; s++) {
    if (await p.locator('#screen-result.is-active').count()) break;
    if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(350); }
    const res = await H.answerCorrect(p);
    if (res === 'first') { firstTryCount++; coinsExpected += 2; }
    else if (res === 'retry') coinsExpected += 1;
    await p.waitForTimeout(850);
    if (await p.locator('#hint-bar .btn').count()) { await p.locator('#hint-bar .btn').click(); await p.waitForTimeout(400); }
  }
  await p.waitForTimeout(600);
  if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(600); }
  const onResult = await p.locator('#screen-result.is-active').count();
  ok('156/157', 'מסך סיום נפתח אחרי 8 תרגילים', onResult === 1);
  if (onResult) {
    const st = await p.evaluate(() => MG.Storage.get().progress);
    const starsShown = await p.locator('#screen-result .result-stars .on').count();
    const expStars = firstTryCount / 8 >= 0.9 ? 3 : firstTryCount / 8 >= 0.65 ? 2 : 1;
    ok('165-169', 'חישוב כוכבים תואם לדיוק', starsShown === expStars, firstTryCount + '/8 → ' + starsShown + ' (צפוי ' + expStars + ')');
    const bonus = expStars * 4;
    // המטבעות כוללים גם הפתעות, לכן בודקים מינימום
    ok('159-161', 'בונוס כוכבים בסיום', st.coins >= coinsExpected + bonus, 'יש ' + st.coins + ', מינימום צפוי ' + (coinsExpected + bonus));
    ok('163', 'יתרת המטבעות מתעדכנת בסרגל', (await p.locator('#stat-coins').textContent()) === String(st.coins));
    ok('170', 'הכוכבים מוצגים באנימציה', (await p.locator('#screen-result .result-stars .on').first().evaluate(e => getComputedStyle(e).animationName)) !== 'none');
  }
  await p.close();

  // 164 – תצוגת 999+ מטבעות
  p = await H.fresh(b, 390, 844, { progress: { coins: 99999, stars: 999 } });
  const xo = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('164', 'יתרה גדולה אינה גורמת לגלישה', xo === 0, xo + 'px');
  await p.close();

  console.log(JSON.stringify({ part: 'UI-2', failed: fails.length, fails }, null, 1));
  await b.close();
})();
