/* עבודה אופליין דרך Service Worker (תרחישים 276–283) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
  await H.skipHelp(ctx);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  // טעינה ראשונה עם רשת
  await p.goto(H.URL); await p.waitForTimeout(500);
  const registered = await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    return !!reg;
  });
  ok('SW-1', 'ה-Service Worker נרשם', registered);

  // ממתינים שהמטמון יתמלא
  const cached = await p.evaluate(async () => {
    for (let i = 0; i < 40; i++) {
      const keys = await caches.keys();
      for (const k of keys) {
        const c = await caches.open(k);
        const reqs = await c.keys();
        if (reqs.length >= 10) return reqs.map(r => new URL(r.url).pathname);
      }
      await new Promise(r => setTimeout(r, 250));
    }
    return [];
  });
  ok('SW-2', 'כל קבצי המשחק נשמרו במטמון', cached.length >= 10, cached.length + ' קבצים');
  ok('SW-3', 'הקבצים הנכונים נשמרו',
    ['/index.html', '/js/app.js', '/css/styles.css', '/manifest.webmanifest'].every(f => cached.some(c => c.endsWith(f))),
    cached.join(', ').slice(0, 160));

  // מנתקים רשת ומרעננים — הרגע שבו זה באמת נבחן
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(900);
  const aliveOffline = await p.evaluate(() => ({
    app: !!document.getElementById('app'),
    worlds: document.querySelectorAll('.world').length,
    mg: typeof MG !== 'undefined' && !!MG.Questions,
  }));
  ok('280', 'רענון במצב אופליין — המשחק עולה במלואו',
    aliveOffline.app && aliveOffline.worlds === 5 && aliveOffline.mg, JSON.stringify(aliveOffline));

  // ומשחקים בפועל בלי רשת
  await H.closeModal(p);
  await p.locator('.world').first().click(); await p.waitForTimeout(300);
  await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(500);
  ok('277', 'אפשר לשחק אופליין', (await p.locator('#question-card').count()) === 1);
  const res = await H.answerCorrect(p); await p.waitForTimeout(900);
  ok('277b', 'תשובה נרשמת אופליין', (await p.evaluate(() => MG.Storage.get().progress.totalAnswered)) >= 1, String(res));
  ok('SW-4', 'אין שגיאות בזמן אופליין', errs.length === 0, errs.join('|'));

  // פתיחה מחדש לגמרי (כמו הקשה על האייקון במסך הבית) עדיין בלי רשת
  const p2 = await ctx.newPage();
  await p2.goto(H.URL, { waitUntil: 'load' }).catch(() => {});
  await p2.waitForTimeout(900);
  ok('282', 'פתיחה מאפס בלי רשת עובדת', (await p2.locator('.world').count()) === 5);
  const saved = await p2.evaluate(() => MG.Storage.get().progress.totalAnswered);
  ok('284', 'ההתקדמות נשמרה בין הפתיחות', saved >= 1, 'נענו ' + saved);

  await ctx.close();
  console.log(JSON.stringify({ part: 'UI-10 (אופליין)', failed: fails.length, fails }, null, 1));
  await b.close();
})();
