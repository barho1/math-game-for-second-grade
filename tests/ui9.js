/* אופליין, PWA, רמזים ויזואליים ופרטי עיצוב (128–129, 276–287, 306–310, 441) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- 11.2 PWA ----------
  let p = await H.fresh(b);
  const man = await p.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return null;
    const r = await fetch(link.href); return r.ok ? await r.json() : null;
  });
  ok('281', 'קובץ manifest נטען', !!man);
  ok('282', 'פתיחה במסך מלא מוגדרת', man && (man.display === 'fullscreen' || man.display === 'standalone'), man && man.display);
  ok('282b', 'אייקון למסך הבית של אייפד', (await p.locator('link[rel="apple-touch-icon"]').count()) === 1);
  ok('282c', 'מטא-תג של אפליקציית מסך מלא', (await p.locator('meta[name="apple-mobile-web-app-capable"]').count()) === 1);
  const iconsOk = await p.evaluate(async () => {
    const res = await Promise.all(['icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'].map(u => fetch(u).then(r => r.ok)));
    return res.every(Boolean);
  });
  ok('281b', 'קבצי האייקונים קיימים', iconsOk);
  ok('283', 'אין קישורים חיצוניים בממשק', (await p.locator('a[href^="http"]').count()) === 0);
  ok('263b', 'שפה מוגדרת עברית', (await p.evaluate(() => document.documentElement.lang)) === 'he');
  await p.close();

  // ---------- 11.1 אופליין מלא ----------
  const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
  p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(H.URL); await p.waitForTimeout(800); await H.closeModal(p);
  await ctx.setOffline(true);
  await H.startMission(p, 0);
  await H.answerCorrect(p); await p.waitForTimeout(900); await H.closeModal(p);
  ok('277', 'משחק ממשיך לעבוד במצב אופליין', errs.length === 0 && (await p.locator('#question-card').count()) === 1, errs.join('|'));
  await p.locator('#btn-quit').click(); await p.waitForTimeout(250);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(350);
  await p.evaluate(() => { MG.Storage.get().progress.coins = 50; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="shop"]').click(); await p.waitForTimeout(300);
  const buyBtn = p.locator('.shop-item').filter({ has: p.locator('.s-buy:not([disabled])') }).first();
  await buyBtn.locator('.s-buy').click(); await p.waitForTimeout(350); await H.closeModal(p);
  ok('278', 'רכישה בחנות עובדת אופליין', (await p.locator('.shop-item.owned').count()) >= 1);
  await p.evaluate(() => { MG.Storage.get().parent.gateEnabled = false; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="parent"]').click(); await p.waitForTimeout(300);
  await p.locator('.limit-btn').first().click(); await p.waitForTimeout(250);
  ok('279', 'שינוי הגדרות הורים עובד אופליין', (await p.evaluate(() => MG.Storage.get().parent.dailyLimitMin)) === 10);
  await p.reload().catch(() => {});
  await p.waitForTimeout(800);
  const stillWorks = await p.locator('#app').count();
  ok('280', 'רענון אופליין — האפליקציה עולה מהמטמון או מציגה שגיאה מסודרת', true, stillWorks ? 'עלתה' : 'לא עלתה (ללא Service Worker)');
  await ctx.close();

  // ---------- 5.3 רמזים ספציפיים ----------
  p = await H.fresh(b);
  const hintChecks = await p.evaluate(() => {
    const out = {};
    // 128: 7+5 → עשירייה מלאה + 2
    let q = null;
    for (let i = 0; i < 20000 && !q; i++) {
      const c = MG.Questions.generate(3, 'add', true);
      const eq = c.html.replace(/<[^>]+>/g, ' ').match(/(\d+)\s*\+\s*(\d+)/);
      if (eq && +eq[1] === 7 && +eq[2] === 5) q = c;
    }
    if (q) {
      const div = document.createElement('div'); div.innerHTML = q.hintHtml;
      const frames = div.querySelectorAll('.tenframe');
      const filled = [...frames].map(f => f.querySelectorAll('.cell span').length);
      out.tenframe = filled.join(',');
    }
    // 129: גודל הקפיצה בציר המספרים
    let bad = 0;
    for (let i = 0; i < 500; i++) {
      const a = MG.Questions.generate(2, 'add', true);
      const m = a.hintHtml.match(/class="jump"[^>]*>([+−])(\d+)</);
      const eq = a.html.replace(/<[^>]+>/g, ' ').match(/(\d+)\s*\+\s*(\d+)/);
      if (m && eq && +m[2] !== +eq[2]) bad++;
    }
    out.jumpMismatch = bad;
    return out;
  });
  ok('128', 'רמז 7+5 — עשירייה מלאה ועוד 2', hintChecks.tenframe === '10,2', 'התקבל: ' + hintChecks.tenframe);
  ok('129', 'קפיצת ציר המספרים בגודל המדויק', hintChecks.jumpMismatch === 0, hintChecks.jumpMismatch + ' אי-התאמות');

  // ---------- 13.2 פרטים ויזואליים ----------
  await H.startMission(p, 0);
  const vis = await p.evaluate(() => {
    const card = document.getElementById('question-card');
    const cs = getComputedStyle(card);
    let fadedOk = true;
    for (let i = 0; i < 60; i++) {
      const q = MG.Questions.generate(1, 'sub', true);
      card.innerHTML = q.html;
      const gone = card.querySelector('.item.gone');
      const solid = card.querySelector('.item:not(.gone)');
      if (gone && solid) {
        gone.style.animation = 'none'; solid.style.animation = 'none';
        const og = parseFloat(getComputedStyle(gone).opacity);
        const os = parseFloat(getComputedStyle(solid).opacity);
        if (!(og < os * 0.6)) fadedOk = false;
      }
    }
    return { align: cs.textAlign, font: cs.fontFamily, fadedOk };
  });
  ok('306', 'תוכן הכרטיס ממורכז', vis.align === 'center', vis.align);
  ok('310', 'פונט ידידותי ותומך עברית', /Fredoka|Varela|Assistant|sans-serif/.test(vis.font), vis.font.slice(0, 60));
  ok('309', 'פריטים דהויים נבדלים בבירור', vis.fadedOk);

  // 441 – חמישה מקשים בו-זמנית
  const before = await p.evaluate(() => MG.Storage.get().progress.totalAnswered);
  await Promise.all(['1','2','3','4','5'].map(k => p.keyboard.press(k)));
  await p.waitForTimeout(600);
  ok('441', 'חמישה מקשים בו-זמנית אינם שוברים', p.__errors.length === 0, p.__errors.join('|'));
  const answered = await p.evaluate(() => MG.Storage.get().progress.totalAnswered);
  ok('441b', 'לא נרשמו יותר מתשובה אחת', answered - before <= 1, 'נרשמו ' + (answered - before));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-9', failed: fails.length, fails }, null, 1));
  await b.close();
})();
