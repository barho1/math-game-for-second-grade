/* חנות, אוסף, מדליות וסטטיסטיקה (177–209, 348) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- 8.1 חנות ----------
  let p = await H.fresh(b, 820, 1180, { progress: { coins: 14 } });
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  const items = await p.locator('.shop-item').count();
  ok('177a', '9 פריטים בחנות', items === 9, 'נמצאו ' + items);
  const allDisabled = await p.locator('.shop-item .s-buy:not([disabled])').count();
  ok('177', 'קנייה חסומה כשחסר מטבע', allDisabled === 0, allDisabled + ' פעילים');

  await p.evaluate(() => { MG.Storage.get().progress.coins = 15; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(200);
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  const cheap = p.locator('.shop-item').filter({ has: p.locator('.s-buy:not([disabled])') }).first();
  await cheap.locator('.s-buy').click(); await p.waitForTimeout(400);
  const after = await p.evaluate(() => MG.Storage.get().progress);
  ok('178', 'קנייה מורידה בדיוק את המחיר', after.coins === 0, 'נשאר ' + after.coins);
  ok('178b', 'הפריט עובר למצב "בבעלותך"', (await p.locator('.shop-item.owned').count()) === 1);
  const btnTxt = await p.locator('.shop-item.owned .s-buy').textContent();
  ok('178c', 'כפתור הפריט משתנה', /ברשותך/.test(btnTxt), btnTxt);
  await p.close();

  // רכישת כל הפריטים
  p = await H.fresh(b, 820, 1180, { progress: { coins: 500 } });
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  const prices = [15, 15, 20, 20, 25, 30, 35, 40, 50];
  let allBought = true;
  for (let i = 0; i < 9; i++) {
    const before = await p.evaluate(() => MG.Storage.get().progress.coins);
    const btn = p.locator('.shop-item').nth(i).locator('.s-buy');
    if (await btn.isDisabled()) continue;
    const priceTxt = await btn.textContent();
    await btn.click(); await p.waitForTimeout(350);
    await H.closeModal(p);
    const nowC = await p.evaluate(() => MG.Storage.get().progress.coins);
    const paid = before - nowC;
    const expected = parseInt(priceTxt, 10);
    if (paid !== expected) { allBought = false; fails.push({ id: '179-186', d: 'מחיר שגוי בפריט ' + i, x: 'שולם ' + paid + ' במקום ' + expected }); }
  }
  ok('179-186', 'כל המחירים בחנות נגבים נכון', allBought);
  ok('345', 'רכישת כל הפריטים ללא שגיאות', p.__errors.length === 0, p.__errors.join('|'));

  // 187 – תיבת הפתעה נרכשת שוב ושוב
  await p.evaluate(() => { MG.Storage.get().progress.coins = 200; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(150);
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  let chestIdx = -1;
  const names = await p.locator('.shop-item .s-name').allTextContents();
  names.forEach((n, i) => { if (/תיבת הפתעה/.test(n)) chestIdx = i; });
  let repeats = 0;
  for (let k = 0; k < 3; k++) {
    const btn = p.locator('.shop-item').nth(chestIdx).locator('.s-buy');
    if (await btn.isDisabled()) break;
    await btn.click(); await p.waitForTimeout(350); await H.closeModal(p); repeats++;
  }
  ok('187', 'תיבת ההפתעה נרכשת שוב ושוב', repeats === 3, 'הצליחו ' + repeats);

  // 188 – תיבת הפתעה כשהאוסף מלא
  await p.evaluate(() => { const s = MG.Storage.get(); s.stickers = MG.Rewards.STICKERS.slice(); s.progress.coins = 100; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(150);
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  const coinsBefore = await p.evaluate(() => MG.Storage.get().progress.coins);
  const chestBtn = p.locator('.shop-item').nth(chestIdx).locator('.s-buy');
  const chestDisabled = await chestBtn.isDisabled();
  const chestLabel = await chestBtn.textContent();
  ok('188', 'תיבת הפתעה נחסמת כשכל המדבקות נאספו', chestDisabled, 'הכפתור: "' + chestLabel + '"');
  ok('188b', 'הכפתור מסביר למה', /מלא/.test(chestLabel), chestLabel);
  // גם קריאה ישירה ל-API לא תגבה מטבעות
  const direct = await p.evaluate(() => { const before = MG.Storage.get().progress.coins;
    const r = MG.Rewards.buy('chest'); return { r, paid: before - MG.Storage.get().progress.coins }; });
  ok('188c', 'גם קנייה ישירה אינה גובה מטבעות כשהאוסף מלא', direct.paid === 0 && direct.r.ok === false, JSON.stringify(direct));
  await H.closeModal(p);
  await p.close();

  // ---------- 8.2 מדבקות ----------
  p = await H.fresh(b);
  await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(300);
  ok('191', '20 משבצות מדבקות', (await p.locator('.sticker').count()) === 20);
  ok('189', 'מדבקה שלא נאספה מוצגת כסימן שאלה', (await p.locator('.sticker.off').count()) === 20);
  await p.evaluate(() => { MG.Storage.get().stickers = ['🦄']; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(150);
  await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(300);
  ok('190', 'מדבקה שנאספה מוצגת בצבע', (await p.locator('.sticker:not(.off)').count()) === 1);

  // ---------- 8.3 מדליות ----------
  const medalTests = [
    ['193', { totalCorrect: 1 }, 'first'],
    ['194', { totalCorrect: 10 }, 'ten'],
    ['195', { totalCorrect: 50 }, 'fifty'],
    ['196', { totalCorrect: 100 }, 'hundred'],
    ['197', { bestStreak: 5 }, 'streak5'],
    ['198', { bestStreak: 10 }, 'streak10'],
    ['204', { level: 5 }, 'level5'],
  ];
  for (const [id, prog, medalId] of medalTests) {
    const got = await p.evaluate(({ prog, medalId }) => {
      const s = MG.Storage.get();
      s.medals = []; Object.assign(s.progress, prog); MG.Storage.save();
      const fresh = MG.Rewards.checkMedals();
      return fresh.some(m => m.id === medalId);
    }, { prog, medalId });
    ok(id, 'מדליה "' + medalId + '" נפתחת בתנאי', got);
  }
  const coinsMedal = await p.evaluate(() => {
    const s = MG.Storage.get();
    s.medals = []; s.progress.coins = 0; s.progress.coinsEarned = 0; MG.Storage.save();
    MG.Storage.addCoins(120);            // צבר 120
    MG.Storage.get().progress.coins = 20; MG.Storage.save();   // הוציא 100 בחנות
    return MG.Rewards.checkMedals().map(m => m.id);
  });
  ok('201', 'מדליית 100 מטבעות לפי סך שנצבר ולא לפי היתרה', coinsMedal.includes('coins100'), coinsMedal.join(','));

  const stickMedal = await p.evaluate(() => {
    const s = MG.Storage.get();
    s.medals = []; s.stickers = MG.Rewards.STICKERS.slice(0, 5); MG.Storage.save();
    return MG.Rewards.checkMedals().map(m => m.id);
  });
  ok('202', 'מדליית 5 מדבקות', stickMedal.includes('stick5'), stickMedal.join(','));
  const allStick = await p.evaluate(() => {
    const s = MG.Storage.get();
    s.medals = []; s.stickers = MG.Rewards.STICKERS.slice(); MG.Storage.save();
    return MG.Rewards.checkMedals().map(m => m.id);
  });
  ok('203', 'מדליית האוסף המושלם', allStick.includes('stickall'), allStick.join(','));

  const worldMedals = await p.evaluate(() => {
    const s = MG.Storage.get();
    s.medals = []; s.progress.worlds = { meadow: { stars: 15, missions: 5, done: true } }; MG.Storage.save();
    const m1 = MG.Rewards.checkMedals().map(m => m.id);
    s.medals = [];
    MG.Rewards.WORLDS.forEach(w => s.progress.worlds[w.id] = { stars: 15, missions: 5, done: true });
    MG.Storage.save();
    const m2 = MG.Rewards.checkMedals().map(m => m.id);
    return { m1, m2 };
  });
  ok('199', 'מדליית עולם 1', worldMedals.m1.includes('world1'), worldMedals.m1.join(','));
  ok('200', 'מדליית כל העולמות', worldMedals.m2.includes('allworlds'), worldMedals.m2.join(','));

  // 205 – טקסט מדליות לא נחתך
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(150);
  await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(300);
  const clipped = await p.evaluate(() => {
    let bad = 0;
    document.querySelectorAll('.medal .m-t, .medal .m-d').forEach(e => { if (e.scrollWidth > e.clientWidth + 2) bad++; });
    return bad;
  });
  ok('205', 'טקסט המדליות אינו נחתך', clipped === 0, clipped + ' נחתכים');

  // ---------- 8.4 / 16 סטטיסטיקה ----------
  const stats = await p.evaluate(() => {
    const s = MG.Storage.get();
    Object.assign(s.progress, { totalCorrect: 37, missions: 4, bestStreak: 9, totalAnswered: 50, firstTryCorrect: 25 });
    MG.Storage.save(); return true;
  });
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(150);
  await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(300);
  const cards = await p.locator('.pcard b').allTextContents();
  ok('206-209', 'ארבעת המספרים האישיים נכונים', cards.join('|') === '37|4|9|50%', cards.join('|'));
  await p.close();

  // 348 – 0 תרגילים, ללא NaN
  p = await H.fresh(b);
  await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(300);
  const zeroCards = await p.locator('.pcard b').allTextContents();
  ok('348', 'ללא תרגילים — 0% ולא NaN', !zeroCards.join('').includes('NaN'), zeroCards.join('|'));
  const zeroTxt = await p.locator('#progress-cards').textContent();
  ok('348b', 'אין NaN בשום מקום במסך', !/NaN/.test(zeroTxt));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-3', failed: fails.length, fails }, null, 1));
  await b.close();
})();
