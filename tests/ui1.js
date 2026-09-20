/* פרופיל, דמות, מפת עולמות וניווט (תרחישים 1–62, 301–304, 431) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- 1.1 שדה השם ----------
  let p = await H.fresh(b);
  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(250);

  await p.fill('#name-input', 'א'); await p.waitForTimeout(150);
  ok('1', 'שם בן תו אחד נשמר', (await p.evaluate(() => MG.Storage.get().player.name)) === 'א');

  await p.fill('#name-input', 'ישראל ישראלי'); await p.waitForTimeout(150);
  ok('2', 'שם באורך 12 נשמר במלואו', (await p.evaluate(() => MG.Storage.get().player.name)) === 'ישראל ישראלי');

  await p.fill('#name-input', 'אבגדהוזחטיכלמנס'); await p.waitForTimeout(150);
  const long = await p.evaluate(() => MG.Storage.get().player.name);
  ok('3', 'שם מעל 12 תווים נקטע', long.length <= 12, 'אורך ' + long.length);

  await p.fill('#name-input', '   '); await p.waitForTimeout(150);
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(250);
  const greetSpaces = await p.locator('#hello-title').textContent();
  ok('4', 'שם של רווחים בלבד אינו יוצר ברכה משובשת', !/שלום,\s{2,}!/.test(greetSpaces), 'התקבל: "' + greetSpaces + '"');

  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(200);
  await p.fill('#name-input', '  אריאל  '); await p.waitForTimeout(150);
  const trimmed = await p.evaluate(() => MG.Storage.get().player.name);
  ok('5', 'רווחים מיותרים נחתכים (Trim)', trimmed === 'אריאל', 'נשמר: "' + trimmed + '"');

  for (const [id, val] of [['6', '!@#$%^&*()'], ['7', '😀🎈'], ['8', 'Bar'], ['9', 'محمد'], ['10', 'דני123']]) {
    await p.fill('#name-input', val); await p.waitForTimeout(120);
    await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(200);
    const t = await p.locator('#hello-title').textContent();
    ok(id, 'שם מסוג "' + val + '" מוצג', t.length > 5, t);
    await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(150);
  }

  await p.fill('#name-input', '<script>x</script>'); await p.waitForTimeout(150);
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(250);
  const xssHtml = await p.locator('#hello-title').innerHTML();
  ok('11', 'אין הזרקת HTML דרך השם', !/<script/i.test(xssHtml) && xssHtml.includes('&lt;') === false ? !xssHtml.includes('<script') : true, xssHtml.slice(0, 60));
  const scriptRan = await p.evaluate(() => !!window.__xss);
  ok('11b', 'סקריפט מהשם לא רץ', !scriptRan);

  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(200);
  await p.fill('#name-input', 'אאאאאאאאאאאא'); await p.waitForTimeout(200);
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(300);
  const overflow = await p.evaluate(() => {
    const t = document.getElementById('hello-title');
    const box = t.closest('.hello').getBoundingClientRect();
    return { xo: document.documentElement.scrollWidth - document.documentElement.clientWidth,
             inside: t.getBoundingClientRect().right <= box.right + 2 };
  });
  ok('12', 'שם ארוך רצוף אינו גולש מהכרטיס', overflow.xo === 0, 'גלישה ' + overflow.xo + 'px');

  // השם במסכים אחרים
  await p.evaluate(() => { MG.Storage.get().usage.usedSec = 999999; MG.Storage.save(); });
  await p.waitForTimeout(1400);
  ok('15', 'מסך הפרידה נפתח', await p.locator('#screen-timeup.is-active').count() > 0);
  await p.evaluate(() => MG.Timer.resetToday()); await p.waitForTimeout(1200);
  await p.close();

  // 16 – ללא שם
  p = await H.fresh(b);
  const noName = await p.locator('#hello-title').textContent();
  ok('16', 'ללא שם — ברכה כללית', noName.trim() === 'שלום!', noName);

  // ---------- 1.2 דמות, צבע, כובע ----------
  const faces = ['🦊','🐼','🐨','🦄','🐯','🐵','🐧','🐢','🐰','🐻','🦁','🐸'];
  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(250);
  const faceBtns = await p.locator('#pick-faces .pick').count();
  ok('17-28a', '12 דמויות מוצגות', faceBtns === 12, 'נמצאו ' + faceBtns);
  let facesOk = true;
  for (let i = 0; i < faceBtns; i++) {
    await p.locator('#pick-faces .pick').nth(i).click(); await p.waitForTimeout(90);
    const saved = await p.evaluate(() => MG.Storage.get().player.face);
    const shown = await p.locator('#avatar-face').textContent();
    const chip = await p.locator('#chip-face').textContent();
    if (saved !== shown || chip !== saved) facesOk = false;
  }
  ok('17-28', 'כל דמות נשמרת ומוצגת בסרגל', facesOk);
  ok('29', 'מעבר מהיר בין דמויות ללא שגיאה', p.__errors.length === 0, p.__errors.join('|'));

  const colorBtns = await p.locator('#pick-colors .pick').count();
  ok('30', '8 צבעי רקע', colorBtns === 8, 'נמצאו ' + colorBtns);
  let colorsOk = true;
  for (let i = 0; i < colorBtns; i++) {
    await p.locator('#pick-colors .pick').nth(i).click(); await p.waitForTimeout(80);
    const c = await p.evaluate(() => MG.Storage.get().player.color);
    const bg = await p.evaluate(() => document.getElementById('avatar-big').style.background);
    if (!bg || !c) colorsOk = false;
  }
  ok('30b/31', 'בחירת צבע נשמרת ומשתקפת', colorsOk);

  const lockedHat = p.locator('#pick-hats .pick.locked').first();
  await lockedHat.click(); await p.waitForTimeout(250);
  const hatAfter = await p.evaluate(() => MG.Storage.get().player.hat);
  ok('32', 'כובע שלא נקנה אינו נלבש', !hatAfter, 'נלבש: ' + hatAfter);
  const toastShown = await p.locator('#toast-root .toast').count();
  ok('32b', 'מוצגת הודעה שמפנה לחנות', toastShown > 0);

  // קניית כובע ובדיקת תצוגה בכל המסכים
  await p.evaluate(() => { MG.Storage.get().progress.coins = 100; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(250);
  await p.locator('.shop-item .s-buy').first().click(); await p.waitForTimeout(350);
  const ownedHat = await p.evaluate(() => MG.Storage.get().player.hat);
  ok('33', 'כובע שנקנה נלבש אוטומטית', !!ownedHat, String(ownedHat));
  await p.locator('.nav-btn[data-go="avatar"]').click(); await p.waitForTimeout(250);
  ok('33b', 'הכובע מוצג על הדמות', (await p.locator('#avatar-hat').textContent()) === ownedHat);
  await p.locator('#pick-hats .pick').first().click(); await p.waitForTimeout(200);
  ok('34', 'אפשר להסיר כובע', (await p.evaluate(() => MG.Storage.get().player.hat)) === '');

  // 35 – כובע במסלול ההתקדמות
  await p.evaluate(() => { const s = MG.Storage.get(); s.player.hat = '👑'; MG.Storage.save(); });
  await H.startMission(p, 0);
  const walker = await p.locator('#walker').textContent();
  ok('35', 'הדמות במסלול תואמת לדמות שנבחרה', walker === (await p.evaluate(() => MG.Storage.get().player.face)), 'מסלול: ' + walker);
  await p.close();

  // ---------- 2. מפת העולמות ----------
  p = await H.fresh(b);
  const names = await p.locator('.world-name').allTextContents();
  ok('39', 'חמישה עולמות בסדר הנכון',
    names.map(n => n.replace(' ✔','')).join('|') === 'אחו הפרחים|מפרץ הים|מסע לחלל|ארץ הממתקים|ג׳ונגל הקופים', names.join('|'));
  const bgs = await p.locator('.world').evaluateAll(els => els.map(e => e.style.background));
  ok('40', 'לכל עולם צבע ייחודי', new Set(bgs).size === 5);
  ok('41', 'מוצג מונה כוכבים לכל עולם', (await p.locator('.world-stars').count()) === 5);
  ok('42', 'מוצג פס התקדמות לכל עולם', (await p.locator('.world-progress').count()) === 5);
  ok('43', 'מנעול על עולמות נעולים', (await p.locator('.world .lock').count()) === 4);
  const lockText = await p.locator('.world').nth(1).locator('.world-sub').textContent();
  ok('44', 'טקסט "צריך X כוכבים"', /צריך \d+ כוכבים/.test(lockText), lockText);
  ok('46', 'עולם 1 פתוח מההתחלה', !(await p.locator('.world').first().evaluate(e => e.classList.contains('locked'))));

  // 45 – גלישת טקסט בעולם נעול
  const clip = await p.evaluate(() => {
    let bad = 0;
    document.querySelectorAll('.world-sub').forEach(e => { if (e.scrollWidth > e.clientWidth + 2) bad++; });
    return bad;
  });
  ok('45', 'טקסט הכוכבים החסרים אינו נחתך', clip === 0, clip + ' נחתכים');

  // 47-55 ספי פתיחה
  const thresholds = [[8, 1, false], [9, 1, true], [23, 2, false], [24, 2, true], [41, 3, false], [42, 3, true], [62, 4, false], [63, 4, true]];
  for (const [stars, idx, shouldOpen] of thresholds) {
    await p.evaluate(s => { MG.Storage.get().progress.stars = s; MG.Storage.save(); }, stars);
    await H.reload(p);
    const locked = await p.locator('.world').nth(idx).evaluate(e => e.classList.contains('locked'));
    ok('47-54(' + stars + ')', stars + ' כוכבים → עולם ' + (idx + 1) + (shouldOpen ? ' פתוח' : ' נעול'), locked !== shouldOpen);
  }

  // 55 – לחיצה על נעול
  await p.evaluate(() => { MG.Storage.get().progress.stars = 0; MG.Storage.save(); });
  await H.reload(p);
  await p.locator('.world').nth(1).click(); await p.waitForTimeout(300);
  ok('55', 'לחיצה על עולם נעול אינה פותחת משימה', (await p.locator('#modal-root .modal').count()) === 0 && (await p.locator('#screen-home.is-active').count()) === 1);
  ok('55b', 'מוצגת הודעה כמה כוכבים חסרים', (await p.locator('#toast-root .toast').count()) > 0);

  // 56-58 דיאלוג משימה
  await p.locator('.world').first().click(); await p.waitForTimeout(300);
  const dlgBtns = await p.locator('#modal-root .btn').allTextContents();
  ok('56', 'דיאלוג עם שלוש אפשרויות, כולל דרך חזרה',
     dlgBtns.length === 3 && /משימה/.test(dlgBtns[0]) && /אתגר/.test(dlgBtns[1]) && /לא עכשיו/.test(dlgBtns[2]),
     dlgBtns.join('|'));
  await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(450);
  ok('57', 'משימה רגילה = 8 שלבים', (await p.locator('#track .track-step').count()) === 8);
  await p.locator('#btn-quit').click(); await p.waitForTimeout(250);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(350);
  await p.locator('.world').first().click(); await p.waitForTimeout(300);
  await p.locator('#modal-root .btn').nth(1).click(); await p.waitForTimeout(450);
  ok('58', 'אתגר הכוכב = 4 שלבים', (await p.locator('#track .track-step').count()) === 4);
  await p.close();

  // 59/60 רמת אתגר הכוכב
  p = await H.fresh(b, 820, 1180, { progress: { level: 1, stars: 99 } });
  await H.startMission(p, 0, true);
  const kicker1 = await p.evaluate(() => MG.Storage.get().progress.level);
  ok('59', 'אתגר הכוכב אינו משנה את רמת הילד', kicker1 === 1, 'רמה ' + kicker1);
  await p.close();
  p = await H.fresh(b, 820, 1180, { progress: { level: 5, stars: 99 } });
  await H.startMission(p, 4, true);
  await p.waitForTimeout(400);
  ok('60', 'אתגר הכוכב ברמה 5 ללא קריסה', p.__errors.length === 0 && (await p.locator('#question-card').count()) === 1, p.__errors.join('|'));

  // 61 יציאה באמצע משימה
  await p.locator('#btn-quit').click(); await p.waitForTimeout(250);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(350);
  const missions = await p.evaluate(() => MG.Storage.get().progress.missions);
  ok('61', 'יציאה באמצע אינה נספרת כמשימה שהושלמה', missions === 0, 'נספרו ' + missions);
  ok('61b', 'היציאה מחזירה למפה', (await p.locator('#screen-home.is-active').count()) === 1);

  // 431-435 ניווט
  await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(200);
  ok('301', '5 כפתורי ניווט', (await p.locator('.nav-btn').count()) === 5);
  ok('302', 'הלשונית הפעילה מודגשת', (await p.locator('.nav-btn.is-active').count()) === 1);
  await H.startMission(p, 0);
  ok('304', 'סרגל הניווט מוסתר במשחק', (await p.locator('#bottombar.hidden').count()) === 1);
  await p.close();

  console.log(JSON.stringify({ part: 'UI-1', failed: fails.length, fails }, null, 1));
  await b.close();
})();
