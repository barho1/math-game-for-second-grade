/* גיבוי והעברת התקדמות בין מכשירים: יצירת קוד, הדבקה ושחזור באזור ההורים */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- המכשיר הראשון: יש בו התקדמות ----------
  const src = await H.fresh(b);
  await src.evaluate(() => {
    const s = MG.Storage.get();
    s.player = { name: 'נועה', face: 'capybara', color: '#6c5ce7', hat: '👑' };
    Object.assign(s.progress, { stars: 17, coins: 33, coinsEarned: 90, level: 3 });
    s.progress.skills.mult = 4; s.owned = ['hat-crown']; s.stickers = ['🦄'];
    s.usage.usedSec = 5000; s.parent.dailyLimitMin = 90;   // של המכשיר הראשון: לא אמורים לעבור
    MG.Storage.save();
  });
  await H.openParent(src);
  ok('1', 'כרטיס הגיבוי מוצג באזור ההורים', (await src.locator('#backup-card').isVisible()));
  ok('2', 'הכרטיס מסביר את ההבדל בין Safari לאפליקציה', /Safari/.test(await src.locator('#backup-card .screen-note').first().textContent()));

  // התיבה בגודל 16px לפחות, אחרת iOS מגדיל את הדף כשהיא מקבלת מיקוד
  const fs = await src.locator('#backup-code').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  ok('3', 'גודל גופן בתיבה 16px ומעלה (בלי זום ב-iOS)', fs >= 16, fs + 'px');

  await src.locator('#backup-copy').click(); await src.waitForTimeout(400);
  const code = await src.locator('#backup-code').inputValue();
  ok('4', 'יצירת קוד ממלאת את התיבה בקוד MGJ1', /^MGJ1\.[0-9a-f]{8}\.[A-Za-z0-9_-]+$/.test(code), code.slice(0, 30));
  ok('5', 'מוצגת הודעת מצב (הועתק, או הוראות להעתקה ידנית)', (await src.locator('#backup-note').textContent()).trim().length > 5);
  ok('6', 'הקוד מסומן בתיבה, כדי שאפשר יהיה להעתיק ידנית',
    await src.locator('#backup-code').evaluate(e => e.selectionStart === 0 && e.selectionEnd === e.value.length));
  const srcStars = await src.evaluate(() => MG.Storage.get().progress.stars);
  ok('7', 'יצירת קוד אינה משנה את ההתקדמות', srcStars === 17);

  // ---------- המכשיר השני: דפדפן נפרד, בלי התקדמות ----------
  const dst = await H.fresh(b);
  await dst.evaluate(() => { const s = MG.Storage.get(); s.parent.dailyLimitMin = 45; s.usage.usedSec = 321; MG.Storage.save(); });
  await H.openParent(dst);

  // תיבה ריקה
  await dst.locator('#backup-restore').click(); await dst.waitForTimeout(250);
  ok('8', 'שחזור בלי קוד: הודעה, ובלי חלון אישור', (await dst.locator('#modal-root .modal').count()) === 0 && /הדביקו/.test(await dst.locator('#backup-note').textContent()));

  // טקסט שאינו קוד
  await dst.fill('#backup-code', 'שלום עולם'); await dst.locator('#backup-restore').click(); await dst.waitForTimeout(250);
  ok('9', 'טקסט שאינו קוד נדחה בהודעה ברורה', (await dst.locator('#modal-root .modal').count()) === 0 && /לא נראה כמו קוד/.test(await dst.locator('#backup-note').textContent()),
    await dst.locator('#backup-note').textContent());

  // קוד חתוך (העתקה חלקית)
  await dst.fill('#backup-code', code.slice(0, code.length - 8)); await dst.locator('#backup-restore').click(); await dst.waitForTimeout(250);
  ok('10', 'קוד חתוך נדחה ומתבקשים להעתיק שוב', (await dst.locator('#modal-root .modal').count()) === 0 && /נחתך/.test(await dst.locator('#backup-note').textContent()),
    await dst.locator('#backup-note').textContent());
  ok('11', 'דחיית קוד לא שינתה את ההתקדמות', (await dst.evaluate(() => MG.Storage.get().progress.stars)) === 0);

  // קוד תקין שהודבק עם שורות חדשות (כמו עטיפת שורות בהודעה)
  const wrapped = code.replace(/(.{40})/g, '$1\n');
  await dst.fill('#backup-code', wrapped); await dst.locator('#backup-restore').click(); await dst.waitForTimeout(350);
  const modalText = await dst.locator('#modal-root .modal').textContent();
  ok('12', 'קוד תקין: חלון אישור מציג את ההתקדמות שבקוד', /17/.test(modalText) && /33/.test(modalText) && /נועה/.test(modalText), modalText.slice(0, 120));
  ok('13', 'חלון האישור מציג גם את ההתקדמות שתוחלף', /⭐ 0/.test(modalText), modalText);

  // ביטול
  await dst.locator('#modal-root .btn').first().click(); await dst.waitForTimeout(300);
  ok('14', 'ביטול אינו משחזר דבר', (await dst.evaluate(() => MG.Storage.get().progress.stars)) === 0 && (await dst.locator('#modal-root .modal').count()) === 0);

  // אישור
  await dst.locator('#backup-restore').click(); await dst.waitForTimeout(350);
  await dst.locator('#modal-root .btn').last().click(); await dst.waitForTimeout(600);
  const got = await dst.evaluate(() => { const s = MG.Storage.get(); return { n: s.player.name, f: s.player.face, c: s.player.color, h: s.player.hat, st: s.progress.stars, co: s.progress.coins, lv: s.progress.level, mult: s.progress.skills.mult, o: s.owned, sk: s.stickers, lim: s.parent.dailyLimitMin, used: s.usage.usedSec }; });
  ok('15', 'השחזור העביר שחקן, כוכבים, מטבעות, רמה ושלב נתיב', got.n === 'נועה' && got.f === 'capybara' && got.c === '#6c5ce7' && got.h === '👑' && got.st === 17 && got.co === 33 && got.lv === 3 && got.mult === 4, JSON.stringify(got));
  ok('16', 'השחזור העביר פריטים ומדבקות', got.o[0] === 'hat-crown' && got.sk[0] === '🦄');
  // הטיימר מוסיף שנייה לשנייה בזמן שהדף פתוח, ולכן 321 עשוי להיות 322. מה שחשוב: לא 5000 של המכשיר הראשון.
  ok('17', 'הגבלת הזמן והזמן היומי של המכשיר השני נשארו, ולא הוחלפו באלה של הראשון', got.lim === 45 && got.used >= 321 && got.used < 400, 'limit ' + got.lim + ' used ' + got.used);
  ok('18', 'אחרי שחזור חוזרים למסך הבית', (await dst.locator('#screen-home.is-active').count()) === 1);
  ok('19', 'הסרגל העליון מציג את הדמות ואת הכוכבים החדשים',
    (await dst.locator('#chip-face').getAttribute('data-face')) === 'capybara' && (await dst.locator('#stat-stars').textContent()) === '17');
  ok('20', 'ברכת הבית משתמשת בשם ששוחזר', /נועה/.test(await dst.locator('#hello-title').textContent()));

  // הלוך-חזור יציב: קוד שנוצר מהמצב ששוחזר זהה לקוד המקורי (לפני שמשחקים, כי משחק משנה את המצב)
  const again = await dst.evaluate(() => MG.Storage.exportCode());
  ok('21', 'קוד שנוצר אחרי שחזור זהה לקוד המקורי', again === code, again.slice(0, 40));

  // ההתקדמות נשמרה בפועל, לא רק בזיכרון
  await H.reload(dst);
  ok('22', 'ההתקדמות ששוחזרה שרדה רענון', (await dst.evaluate(() => MG.Storage.get().progress.stars)) === 17);
  ok('23', 'אין שגיאות בדף', dst.__errors.length === 0, dst.__errors.join(' | '));

  // אחרי שחזור אפשר לשחק ולהשלים משימה בלי שגיאות
  await H.startMission(dst, 0);
  ok('24', 'אפשר להתחיל משימה אחרי שחזור', (await dst.locator('#answers .ans').count()) > 0);
  ok('25', 'אין שגיאות אחרי התחלת משימה', dst.__errors.length === 0, dst.__errors.join(' | '));

  await src.close(); await dst.close();
  console.log(JSON.stringify({ part: 'UI-14', failed: fails.length, fails }, null, 1));
  await b.close();
})();
