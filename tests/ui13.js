/* נתיבי התאמה: כפל וחילוק לצד הליבה (שלב 1 בתכנון, docs/PLAN.md) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

/* מחליף את המחולל בתרגיל קבוע מהסוג הנתון, עם תשובה 2, כדי לשלוט במה שנספר */
async function stub(p, type) {
  await p.evaluate((type) => {
    window.__gen = [];
    MG.Questions.generate = function (level, t, hint) {
      window.__gen.push({ level: level, type: t, hint: !!hint });
      return {
        type: type, kicker: 'x', level: level,
        html: '<div class="equation">1 + 1 = <span class="blank">?</span></div>',
        input: 'choices',
        choices: [{ v: 2, sym: '2' }, { v: 3, sym: '3' }, { v: 4, sym: '4' }, { v: 5, sym: '5' }],
        answer: 2, hintHtml: '<p class="q-text">רמז</p>', explainHtml: '<p class="q-text">הסבר</p>'
      };
    };
  }, type);
}
/* עוטף את המחולל האמיתי ורושם אילו סוגים נוצרו */
async function trace(p) {
  await p.evaluate(() => {
    window.__types = [];
    const orig = MG.Questions.generate;
    MG.Questions.generate = function () { const q = orig.apply(this, arguments); window.__types.push(q.type); return q; };
  });
}
const right = async (p) => { await p.locator('#answers .ans .sym:text-is("2")').locator('..').click(); await p.waitForTimeout(1000); await H.closeModal(p); };
const wrong = async (p) => {
  const btn = p.locator('#answers .ans:not([disabled]) .sym:text-is("5")').locator('..');
  if (!(await btn.count())) return;
  await btn.click();
  await p.waitForTimeout(550);
};
const prog = (p) => p.evaluate(() => { const g = MG.Storage.get().progress; return { level: g.level, mult: g.skills.mult, opened: g.opened }; });
const strandCount = (p) => p.evaluate(() => window.__types.filter(t => MG.Questions.strandOf(t) === 'mult').length);

(async () => {
  const b = await chromium.launch();

  // ---------- ברירות מחדל והגירה ----------
  let p = await H.fresh(b);
  let g = await prog(p);
  ok('N1', 'התחלה חדשה: רמה 1, שלב 1 בכפל, בלי פתיחה מוקדמת', g.level === 1 && g.mult === 1 && JSON.stringify(g.opened) === '{}', JSON.stringify(g));
  await p.close();
  // שמירה מלפני הנתיבים נכתבת לפני טעינת הדף. כתיבה אחרי הטעינה אינה אפשרית: המשחק שומר את מצבו בזיכרון.
  p = await b.newPage({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
  p.__errors = [];
  p.on('pageerror', e => p.__errors.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('mg-number-journey-v1', JSON.stringify({
      version: 1, progress: { level: 4, stars: 12, coins: 3 },
      help: { tourDone: true, handShown: true, seenTypes: [], seenScreens: [] }
    }));
  });
  await p.goto(H.URL); await p.waitForTimeout(900);
  g = await prog(p);
  ok('N2', 'שמירה ישנה, בלי נתיבים, נטענת בשלב 1 ובלי לאבד רמה', g.level === 4 && g.mult === 1 && p.__errors.length === 0, JSON.stringify(g) + p.__errors.join('|'));
  await p.close();

  // ---------- הרכב המשימה לפי פתיחת הנתיב ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 2 } });
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  let types = await p.evaluate(() => window.__types);
  ok('N3', 'ברמה 2 הנתיב סגור: אין תרגילי כפל וחילוק', types.length === 8 && (await strandCount(p)) === 0, types.join());
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 3 } });
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  types = await p.evaluate(() => window.__types);
  ok('N4', 'ברמה 3 הנתיב נפתח: 3 מתוך 8 תרגילים', types.length === 8 && (await strandCount(p)) === 3, types.join());
  ok('N5', 'המשימה הושלמה בלי שגיאות', p.__errors.length === 0, p.__errors.join('|'));
  await p.close();

  // ---------- התאמה נפרדת לכל נתיב ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 3 } });
  await stub(p, 'mult'); await H.startMission(p, 0);
  await right(p); await right(p); g = await prog(p);
  ok('N6', 'שתי הצלחות בכפל: עדיין שלב 1', g.mult === 1 && g.level === 3, JSON.stringify(g));
  await right(p); g = await prog(p);
  ok('N7', 'שלוש הצלחות בכפל: עולים שלב בכפל, והרמה הכללית נשארת', g.mult === 2 && g.level === 3, JSON.stringify(g));
  const toastTxt = await p.locator('#toast-root').textContent();
  ok('N8', 'ההודעה מציינת את הנושא', /בכפל וחילוק עלית שלב/.test(toastTxt), toastTxt.trim().slice(0, 60));
  await wrong(p); await right(p); await wrong(p); await right(p);
  g = await prog(p);
  ok('N9', 'שתי טעויות בכפל: יורדים שלב בכפל, והרמה הכללית לא יורדת', g.mult === 1 && g.level === 3, JSON.stringify(g));
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 3 } });
  await stub(p, 'add'); await H.startMission(p, 0);
  await right(p); await right(p); await right(p); g = await prog(p);
  ok('N10', 'הצלחות בחיבור מעלות את הרמה הכללית ולא את הכפל', g.level === 4 && g.mult === 1, JSON.stringify(g));
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 2 } });
  await stub(p, 'add'); await H.startMission(p, 0);
  await right(p); await right(p); await right(p);
  const unlockToast = await p.locator('#toast-root').textContent();
  ok('N11', 'כשהרמה מגיעה ל-3 מוצגת הודעה על נושא חדש', /כפל וחילוק/.test(unlockToast) && /עלית רמה/.test(unlockToast), unlockToast.trim().slice(0, 90));
  await p.close();

  // ---------- אזור הורים: שאלת כניסה ובורר רמה ----------
  p = await H.fresh(b);
  await p.locator('.nav-btn[data-go="parent"]').click(); await p.waitForTimeout(300);
  const gateEq = await p.locator('#gate-equation').textContent();
  const gm = gateEq.match(/^(\d+) × (\d+) = \?$/);
  ok('N12', 'שאלת הכניסה היא כפל דו-ספרתי בחד-ספרתי', gm && +gm[1] >= 21 && +gm[1] <= 39 && +gm[2] >= 6 && +gm[2] <= 9, gateEq);
  await H.openParent(p);
  ok('N13', 'שאלת הכניסה נפתרת ומכניסה', (await p.locator('#parent-panel:not(.hidden)').count()) === 1);
  ok('N14', 'בבורר שורה לליבה ושורה לכפל', (await p.locator('#level-pickers .level-row').count()) === 2);
  ok('N15', 'ברמה 1 הנתיב סגור והסבר על כך מוצג', /ייפתח לבד ברמה 3/.test(await p.locator('#level-pickers').textContent()));

  await p.locator('#level-pickers .level-row').nth(1).locator('button:text-is("4")').click(); await p.waitForTimeout(300);
  g = await prog(p);
  ok('N16', 'בחירת שלב בכפל קובעת אותו ופותחת את הנתיב', g.mult === 4 && g.opened.mult === true && g.level === 1, JSON.stringify(g));
  const stat = await p.locator('#parent-stats').textContent();
  ok('N17', 'הסטטיסטיקה מציגה את השלב בכפל', /כפל וחילוק/.test(stat), stat.replace(/\s+/g, ' ').slice(0, 120));
  await p.locator('#level-pickers .level-row').nth(0).locator('button:text-is("5")').click(); await p.waitForTimeout(300);
  g = await prog(p);
  ok('N18', 'בחירת רמה בליבה', g.level === 5 && g.mult === 4, JSON.stringify(g));
  await p.locator('#level-pickers .level-row').nth(0).locator('button:text-is("1")').click(); await p.waitForTimeout(300);
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  types = await p.evaluate(() => window.__types);
  ok('N19', 'נתיב שההורה פתח משתתף במשימה גם ברמה 1', (await strandCount(p)) === 3, types.join());
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(300);
  ok('N20', 'מסך הבית מציג את השלב בכפל', /כפל וחילוק: שלב \d/.test(await p.locator('#home-tip').textContent()), await p.locator('#home-tip').textContent());
  await p.close();

  // ---------- איפוס ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 4, skills: { mult: 5 }, opened: { mult: true } } });
  await p.evaluate(() => { MG.Storage.reset(); });
  g = await prog(p);
  ok('N21', 'איפוס מחזיר רמה 1 ושלב 1', g.level === 1 && g.mult === 1 && JSON.stringify(g.opened) === '{}', JSON.stringify(g));
  await p.close();

  // ---------- מדליה ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 3, skills: { mult: 6 } } });
  const medal = await p.evaluate(() => MG.Rewards.checkMedals().some(m => m.id === 'multmaster'));
  ok('N22', 'מדליית אלוף הכפל נפתחת בשלב 6', medal);
  await p.close();

  // ---------- משימות מלאות עם התרגילים האמיתיים בשלבים הגבוהים ----------
  for (const st of [1, 3, 5, 6]) {
    p = await H.fresh(b, 820, 1180, { progress: { level: 5, skills: { mult: st } } });
    await trace(p); await H.startMission(p, 0);
    const done = await H.playMission(p, 80);
    types = await p.evaluate(() => window.__types);
    ok('N23-' + st, 'משימה מלאה בשלב ' + st + ' מסתיימת בלי שגיאות', done && p.__errors.length === 0, p.__errors.join('|') + ' ' + types.join());
    ok('N24-' + st, 'שלב ' + st + ': כל הסוגים שהופיעו פתוחים בו', await p.evaluate((s) =>
      window.__types.every(t => MG.Questions.strandOf(t) === 'core' || MG.Questions.typesForStage('mult', s).includes(t)), st), types.join());
    await p.close();
  }

  // ---------- פריסה: המערך הגדול ביותר נכנס במסך בלי גלילה אופקית או אנכית ----------
  const SIZES = [[390, 844, 'טלפון'], [820, 1180, 'אייפד לאורך'], [1180, 820, 'אייפד לרוחב']];
  for (const [w, h, name] of SIZES) {
    p = await H.fresh(b, w, h, { progress: { level: 3 } });
    await p.evaluate(() => {
      // כפל 10 × 10 עם מערך מלא בשאלה עצמה: המקרה הגדול ביותר
      const e = '🍪', cells = Array.from({ length: 100 }, () => '<span>' + e + '</span>').join('');
      MG.Questions.generate = function (level) {
        return {
          type: 'mult', kicker: 'כפל', text: 'יש 10 שורות, ובכל שורה 10 עוגיות. כמה יש בסך הכול?', level: level,
          html: '<div class="array s-small" style="--cols:10">' + cells + '</div>', input: 'choices',
          choices: [{ v: 100, sym: '100' }, { v: 90, sym: '90' }, { v: 110, sym: '110' }, { v: 20, sym: '20' }],
          answer: 100, hintHtml: '<p class="q-text">רמז</p>', explainHtml: '<p class="q-text">הסבר</p>'
        };
      };
    });
    await H.startMission(p, 0);
    const m = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      sh: document.documentElement.scrollHeight, ih: window.innerHeight,
      cells: document.querySelectorAll('#question-card .array span').length
    }));
    ok('N25-' + name, 'מערך של 100 פריטים מוצג במלואו', m.cells === 100, JSON.stringify(m));
    ok('N26-' + name, 'מערך של 100 פריטים: אין גלילה אופקית', m.sw <= m.iw + 1, JSON.stringify(m));
    if (w > 600) ok('N27-' + name, 'במסך גדול אין גלילה אנכית', m.sh <= m.ih + 2, JSON.stringify(m));
    await p.close();
  }

  console.log(JSON.stringify({ part: 'UI-13', failed: fails.length, fails }, null, 1));
  await b.close();
})();
