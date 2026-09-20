/* הוראות ועזרה בתוך המשחק: סיור, הסברים לפי סוג תרגיל, גיליון עזרה והקראה */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

/* מחליף את מנוע ההקראה ב-stub שסופר קריאות, כי בסביבת הבדיקה אין קול עברי */
/* speechSynthesis היא תכונה לקריאה בלבד על window, ולכן חייבים defineProperty */
function installSpeechStub(voices) {
  window.__spoken = [];
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => voices,
      speak: u => { if (u && u.text && String(u.text).trim()) window.__spoken.push(String(u.text).trim()); },
      cancel: () => {},
      addEventListener: () => {},
    },
  });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: function (t) { this.text = t; },
  });
}
async function stubSpeech(p) {
  await p.addInitScript(installSpeechStub, [{ lang: 'he-IL', name: 'Carmit', default: true }]);
}
const spoken = p => p.evaluate(() => window.__spoken || []);
const tourStep = p => p.locator('.tour-line').textContent();
const next = async (p) => { await p.locator('.tour-btns .btn-primary').click(); await p.waitForTimeout(450); };

(async () => {
  const b = await chromium.launch();

  // ---------- הסיור ----------
  let p = await b.newPage({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await stubSpeech(p);
  await p.goto(H.URL); await p.waitForTimeout(1100);

  ok('T1', 'הסיור נפתח בכניסה הראשונה', (await p.locator('#tour-root:not(.hidden)').count()) === 1);
  ok('T2', 'הצעד הראשון מצביע על הדמות', /הדמות שלך/.test(await tourStep(p)));
  const hole = await p.evaluate(() => {
    const h = document.getElementById('tour-hole'), c = document.getElementById('chip-avatar');
    if (!h || !c) return null;
    const a = h.getBoundingClientRect(), t = c.getBoundingClientRect();
    return { over: a.left <= t.left + 2 && a.right >= t.right - 2 && a.top <= t.top + 2 };
  });
  ok('T3', 'הזרקור ממוקם על האלמנט האמיתי', hole && hole.over, JSON.stringify(hole));
  ok('T4', 'הטקסט הוקרא', (await spoken(p)).some(s => /הדמות שלך/.test(s)), (await spoken(p)).join(' | '));
  ok('T5', 'יש מחוון צעדים', (await p.locator('.tour-dot').count()) === 4);

  await next(p);
  ok('T6', 'הצעד השני מצביע על עולם', /בוחרים לאן/.test(await tourStep(p)));
  await next(p);
  ok('T7', 'צעד התרגול מציג תרגיל אמיתי', (await p.locator('.tour-practice .item').count()) > 0);
  ok('T8', 'שתי אפשרויות בלבד בתרגול', (await p.locator('.tour-answers .ans').count()) === 2);
  const pTxt = await p.locator('.tour-practice .q-text').textContent();
  ok('T9', 'התרגול הוא חיבור פשוט', /בסך הכול/.test(pTxt) && (await p.locator('.tour-practice .item.gone').count()) === 0, pTxt);

  // לוחצים על האפשרות הראשונה. אם היא שגויה – בודקים שלא מתקדמים ואין עונש,
  // ואם במקרה היא הנכונה, מדלגים על הבדיקות האלה ועוברים הלאה.
  await p.locator('.tour-answers .ans').first().click();
  await p.waitForTimeout(400);
  if (await p.locator('.tour-answers .ans.wrong').count()) {
    ok('T10', 'תשובה שגויה בתרגול אינה מתקדמת', /נסו! לוחצים/.test(await tourStep(p)));
    ok('T11', 'הודעה מעודדת בתרגול', /כמעט/.test(await p.locator('.tour-praise').textContent()));
    const left = p.locator('.tour-answers .ans:not([disabled])').first();
    if (await left.count()) { await left.click(); await p.waitForTimeout(400); }
  }
  ok('T12', 'תשובה נכונה מקבלת חיזוק', /כל הכבוד/.test(await p.locator('.tour-praise').last().textContent()));
  ok('T12b', 'הודעת "כמעט" הקודמת נעלמת', (await p.locator('.tour-praise').count()) === 1);
  await p.waitForTimeout(1600);
  ok('T13', 'ממשיכים לצעד האחרון', /המטבעות/.test(await tourStep(p)));

  const st1 = await p.evaluate(() => MG.Storage.get().progress);
  ok('T14', 'התרגול אינו נרשם בסטטיסטיקה',
    st1.totalAnswered === 0 && st1.coins === 0 && st1.totalCorrect === 0,
    JSON.stringify({ a: st1.totalAnswered, c: st1.coins }));
  const byType = await p.evaluate(() => MG.Storage.get().byType);
  ok('T15', 'התרגול אינו משפיע על הפילוח להורה', Object.keys(byType).length === 0, JSON.stringify(byType));

  await next(p);
  ok('T16', 'סיום הסיור סוגר ומסמן', (await p.evaluate(() => MG.Storage.get().help.tourDone)) === true
    && (await p.locator('#tour-root.hidden').count()) === 1);
  await p.reload(); await p.waitForTimeout(1100);
  ok('T17', 'הסיור אינו חוזר בכניסה הבאה', (await p.locator('#tour-root.hidden').count()) === 1);
  await p.close();

  // דילוג
  p = await b.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await stubSpeech(p);
  await p.goto(H.URL); await p.waitForTimeout(1100);
  ok('T18', 'אין גלישה אופקית עם הסיור פתוח בטלפון',
    (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0);
  await p.locator('.tour-btns .btn-ghost').click(); await p.waitForTimeout(400);
  ok('T19', 'דילוג סוגר ומסמן כהושלם', (await p.evaluate(() => MG.Storage.get().help.tourDone)) === true);
  await p.close();

  // הסיור לא מופעל כשהזמן נגמר
  p = await b.newPage({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
  await stubSpeech(p);
  await p.goto(H.URL); await p.waitForTimeout(600);
  await p.evaluate(() => { const s = MG.Storage.get(); s.help.tourDone = false; s.usage.usedSec = 999999; MG.Storage.save(); });
  await p.reload(); await p.waitForTimeout(1200);
  ok('T20', 'אין סיור כשנגמר הזמן היומי',
    (await p.locator('#tour-root.hidden').count()) === 1 && (await p.locator('#screen-timeup.is-active').count()) === 1);
  await p.close();

  // ---------- הסבר לפי סוג תרגיל ----------
  p = await b.newPage({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
  const errs2 = []; p.on('pageerror', e => errs2.push(e.message));
  await stubSpeech(p);
  await p.goto(H.URL); await p.waitForTimeout(800);
  await p.evaluate(() => { MG.Storage.get().help.tourDone = true; MG.Storage.save(); });
  await p.reload(); await p.waitForTimeout(800);

  await p.locator('.world').first().click(); await p.waitForTimeout(300);
  await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(700);
  ok('E1', 'הסבר סוג התרגיל מופיע לפני השאלה הראשונה', (await p.locator('.help-sheet .demo-box').count()) === 1);
  ok('E2', 'ההסבר כולל דוגמה עם התשובה', /התשובה:/.test(await p.locator('.demo-answer').textContent()));
  ok('E3', 'להסבר יש כפתור הקראה', (await p.locator('.help-sheet .speak-btn').count()) >= 1);
  const firstType = (await p.evaluate(() => MG.Storage.get().help.seenTypes.slice()))[0];
  ok('E4', 'הסוג נרשם כמוסבר', !!firstType, String(firstType));
  await p.locator('#modal-root .btn-primary').click(); await p.waitForTimeout(600);
  ok('E5', 'אחרי ההסבר מוצג התרגיל', (await p.locator('#question-card .q-kicker').count()) === 1);
  ok('E6', 'רמקול על כרטיס התרגיל', (await p.locator('#question-card .speak-btn').count()) === 1);
  ok('E7', 'אצבע מנחה בתרגיל הראשון', (await p.locator('#answers .point-hand').count()) === 1);

  // אותו סוג לא מוסבר שוב
  const same = await p.evaluate((t) => {
    MG.Storage.get().help.seenTypes = [t]; MG.Storage.save();
    return MG.Help.needsExplain(t);
  }, firstType);
  ok('E8', 'סוג שכבר הוסבר אינו חוזר', same === false);

  // ---------- גיליון עזרה ----------
  ok('S1', 'עזרה זמינה גם בתוך תרגיל', (await p.locator('#btn-help').isVisible()));
  await p.locator('#btn-help').click(); await p.waitForTimeout(450);
  ok('S2', 'העזרה במשחק מדברת על המשחק', /איך משחקים/.test(await p.locator('.help-sheet h3').textContent()));
  ok('S3', 'לכל שורה יש רמקול', (await p.locator('.help-row .speak-btn').count()) === (await p.locator('.help-row').count()));
  const before = (await spoken(p)).length;
  await p.locator('.help-row .speak-btn').first().click(); await p.waitForTimeout(250);
  ok('S4', 'לחיצה על רמקול מקריאה', (await spoken(p)).length > before, (await spoken(p)).slice(-1)[0]);
  await p.locator('#modal-root .btn-primary').click(); await p.waitForTimeout(400);

  await p.locator('#btn-quit').click(); await p.waitForTimeout(300);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(400);
  for (const [screen, title] of [['home', 'המפה'], ['shop', 'החנות'], ['collection', 'האוסף שלי'], ['avatar', 'הדמות שלי']]) {
    await p.locator(`.nav-btn[data-go="${screen}"]`).click(); await p.waitForTimeout(250);
    await p.locator('#btn-help').click(); await p.waitForTimeout(350);
    const t = await p.locator('.help-sheet h3').textContent();
    ok('S5-' + screen, 'עזרה לפי הקשר במסך ' + screen, t === title, t);
    await p.locator('#modal-root .btn-primary').click(); await p.waitForTimeout(250);
  }

  // סיור מחדש מתוך העזרה
  await p.locator('#btn-help').click(); await p.waitForTimeout(350);
  await p.locator('#modal-root .btn-ghost').click(); await p.waitForTimeout(700);
  ok('S6', 'אפשר להפעיל את הסיור מחדש מהעזרה', (await p.locator('#tour-root:not(.hidden)').count()) === 1);
  await p.locator('.tour-btns .btn-ghost').click(); await p.waitForTimeout(400);

  // ---------- הגדרות הורים ----------
  await H.openParent(p);
  ok('P1', 'כרטיס העזרה וההקראה קיים', (await p.locator('#help-settings-card').count()) === 1);
  const speechBefore = await p.evaluate(() => MG.Storage.get().settings.speech);
  await p.locator('#toggle-speech').click(); await p.waitForTimeout(350);
  ok('P2', 'מתג ההקראה מתחלף ונשמר',
    (await p.evaluate(() => MG.Storage.get().settings.speech)) !== speechBefore);
  await p.locator('#toggle-speech').click(); await p.waitForTimeout(350);
  await p.locator('#toggle-autoread').click(); await p.waitForTimeout(350);
  ok('P3', 'מתג ההקראה האוטומטית נשמר', (await p.evaluate(() => MG.Storage.get().settings.autoRead)) === true);
  await p.locator('#reset-help').click(); await p.waitForTimeout(400);
  const h2 = await p.evaluate(() => MG.Storage.get().help);
  ok('P4', 'איפוס ההסברים מנקה הכול',
    h2.seenTypes.length === 0 && h2.tourDone === false && h2.handShown === false, JSON.stringify(h2));

  // הקראה אוטומטית בפועל
  await p.evaluate(() => { const s = MG.Storage.get(); s.help.tourDone = true; s.help.seenTypes = ['add','sub','missing','compare','sequence','visual','count','word']; s.settings.autoRead = true; MG.Storage.save(); });
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(300);
  const beforeQ = (await spoken(p)).length;
  await p.locator('.world').first().click(); await p.waitForTimeout(300);
  await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(800);
  ok('P5', 'הקראה אוטומטית מקריאה את השאלה', (await spoken(p)).length > beforeQ, (await spoken(p)).slice(-1)[0]);

  ok('X1', 'אין שגיאות JS', errs.length === 0 && errs2.length === 0, errs.concat(errs2).join('|'));
  await p.close();

  // ---------- ללא תמיכה בהקראה ----------
  p = await b.newPage({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
  const errs3 = []; p.on('pageerror', e => errs3.push(e.message));
  // מכשיר עם קולות, אבל בלי עברית
  await p.addInitScript(installSpeechStub, [{ lang: 'en-US', name: 'Samantha' }]);
  await p.goto(H.URL); await p.waitForTimeout(1200);
  await p.evaluate(() => { MG.Storage.get().help.tourDone = true; MG.Storage.save(); });
  await p.reload(); await p.waitForTimeout(900);
  await p.locator('#btn-help').click(); await p.waitForTimeout(400);
  ok('N1', 'בלי קול עברי — אין כפתורי רמקול', (await p.locator('.speak-btn').count()) === 0);
  ok('N2', 'העזרה עדיין עובדת', (await p.locator('.help-row').count()) >= 2);
  ok('N3', 'אין שגיאות בלי הקראה', errs3.length === 0, errs3.join('|'));
  await p.close();

  // שאר החבילות מדלגות על ההסברים דרך רשימת סוגים קבועה ב-helpers. אם יתווסף
  // סוג תרגיל חדש והרשימה לא תעודכן, כרטיס ההסבר שלו יחסום אותן. נתפס כאן.
  p = await b.newPage({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
  await p.goto(H.URL); await p.waitForTimeout(900);
  const howTo = await p.evaluate(() => Object.keys(MG.Questions.HOW_TO).sort());
  ok('D1', 'רשימת סוגי ההסבר ב-helpers מעודכנת',
     howTo.join(',') === H.HELP_TYPES.slice().sort().join(','),
     'במשחק: ' + howTo.join(',') + ' | בבדיקות: ' + H.HELP_TYPES.slice().sort().join(','));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-11 (עזרה והוראות)', failed: fails.length, fails }, null, 1));
  await b.close();
})();
