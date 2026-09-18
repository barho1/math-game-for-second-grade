const URL = 'http://127.0.0.1:8123/index.html';
async function fresh(browser, w = 820, h = 1180, state) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.__errors = [];
  p.on('pageerror', e => p.__errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/CERT|net::|favicon/.test(m.text())) p.__errors.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(800);
  if (state) { await p.evaluate(s => { Object.assign(MG.Storage.get().progress, s.progress || {});
      Object.assign(MG.Storage.get(), s.root || {}); MG.Storage.save(); }, state);
    await p.reload(); await p.waitForTimeout(800); }
  await closeModal(p);
  return p;
}
async function closeModal(p) {
  for (let i = 0; i < 4; i++) {
    if (!(await p.locator('#modal-root .modal').count())) return;
    await p.locator('#modal-root .btn').last().click({ force: true });
    await p.waitForTimeout(250);
  }
}
/* עונה נכון על התרגיל הנוכחי; מחזיר 'first' אם בניסיון הראשון */
/* המשחק מתעלם מהקשה שמגיעה פחות מ-300ms אחרי תשובה שגויה (הגנה מהקשה כפולה),
   ולכן בין ניחוש לניחוש צריך להמתין מעבר לחלון הזה. */
const GUARD_MS = 340;
async function answerCorrect(p) {
  if (await p.locator('#answers.pad').count()) {
    for (let v = 0; v <= 110; v++) {
      for (const d of String(v)) await p.locator(`#answers .pad-key:text-is("${d}")`).first().click();
      await p.locator('#answers .pad-ok').click(); await p.waitForTimeout(90);
      if (await p.locator('#hint-bar .hint-msg.good').count()) return v === 0 ? 'first' : 'retry';
      if (await p.locator('#hint-bar .btn').count()) return 'revealed';
      for (let k = 0; k < 3; k++) await p.locator('#answers .pad-del').click();
      await p.waitForTimeout(GUARD_MS);
    }
    return 'stuck';
  }
  const n = await p.locator('#answers .ans').count();
  for (let i = 0; i < n; i++) {
    const f = p.locator('#answers .ans:not([disabled])').first();
    if (!await f.count()) break;
    await f.click(); await p.waitForTimeout(110);
    if (await p.locator('#answers .ans.correct').count()) return i === 0 ? 'first' : 'retry';
    if (await p.locator('#hint-bar .btn').count()) return 'revealed';
    await p.waitForTimeout(GUARD_MS);
  }
  return 'stuck';
}
/* משחק משימה שלמה; אם perfect=true מנסה לענות נכון מיד ע"י ניחוש עד הצלחה */
async function playMission(p, maxSteps = 60) {
  for (let s = 0; s < maxSteps; s++) {
    if (await p.locator('#screen-result.is-active, #screen-timeup.is-active').count()) return true;
    if (await p.locator('#modal-root .modal').count()) { await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(280); continue; }
    if (await p.locator('#hint-bar .btn').count()) { await p.locator('#hint-bar .btn').click(); await p.waitForTimeout(280); continue; }
    await answerCorrect(p); await p.waitForTimeout(820);
  }
  return false;
}
async function startMission(p, worldIdx = 0, bonus = false) {
  // אם אנחנו עדיין בתוך משימה, סרגל הניווט מוסתר – יוצאים קודם
  if (await p.locator('#screen-play.is-active').count()) {
    await p.locator('#btn-quit').click(); await p.waitForTimeout(250);
    await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(350);
  }
  await closeModal(p);
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(200);
  await p.locator('.world').nth(worldIdx).click(); await p.waitForTimeout(250);
  await p.locator('#modal-root .btn').nth(bonus ? 1 : 0).click(); await p.waitForTimeout(450);
}
async function openParent(p) {
  await p.locator('.nav-btn[data-go="parent"]').click(); await p.waitForTimeout(250);
  if (await p.locator('#gate-card:not(.hidden)').count()) {
    const eq = await p.locator('#gate-equation').textContent();
    const m = eq.match(/(\d+)\s*×\s*(\d+)/);
    await p.fill('#gate-input', String(+m[1] * +m[2]));
    await p.click('#gate-go'); await p.waitForTimeout(300);
  }
}
async function reload(p) { await p.reload(); await p.waitForTimeout(850); await closeModal(p); }
module.exports = { URL, fresh, reload, closeModal, answerCorrect, playMission, startMission, openParent };
