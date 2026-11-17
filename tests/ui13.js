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
  const nStrands = await p.evaluate(() => Object.keys(MG.Questions.STRANDS).filter(k => MG.Questions.STRANDS[k].types).length);
  ok('N14', 'בבורר שורה לליבה ושורה לכל נתיב', (await p.locator('#level-pickers .level-row').count()) === 1 + nStrands, nStrands + ' נתיבים');
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

  // ---------- נתיב מספרים וערך מקום ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 4 } });
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  types = await p.evaluate(() => window.__types);
  ok('N28', 'ברמה 4 נתיב ערך המקום סגור', types.every(t => !['place', 'words', 'chart', 'line', 'parity', 'pseq', 'pcompare', 'neighbors'].includes(t)), types.join());
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 5 } });
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  types = await p.evaluate(() => window.__types);
  const kinds = await p.evaluate(() => window.__types.map(t => MG.Questions.strandOf(t)));
  ok('N29', 'ברמה 5: 3 כפל, 1 ערך מקום, ותרגיל אחד ממסתובב; השאר ליבה (לפחות 3)', types.length === 8 && kinds.filter(k => k === 'core').length >= 3 &&
    kinds.filter(k => k === 'mult').length === 3 && kinds.filter(k => k === 'place').length === 1 &&
    kinds.filter(k => ['time', 'money', 'measure', 'fractions', 'data'].includes(k)).length <= 2, kinds.join());
  ok('N30', 'משימה עם שלושה נתיבים מסתיימת בלי שגיאות', p.__errors.length === 0, p.__errors.join('|'));
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 5 } });
  await stub(p, 'place'); await H.startMission(p, 0);
  await right(p); await right(p); await right(p);
  g = await p.evaluate(() => ({ place: MG.Storage.get().progress.skills.place, mult: MG.Storage.get().progress.skills.mult, level: MG.Storage.get().progress.level }));
  ok('N31', 'שלוש הצלחות בערך מקום מעלות רק אותו', g.place === 2 && g.mult === 1 && g.level === 5, JSON.stringify(g));
  ok('N32', 'ההודעה מציינת את הנושא', /במספרים וערך מקום עלית שלב/.test(await p.locator('#toast-root').textContent()));
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 2, skills: { mult: 1, place: 4 } } });
  ok('N33', 'מדליית אלוף ערך המקום נפתחת בשלב 4', await p.evaluate(() => MG.Rewards.checkMedals().some(m => m.id === 'placemaster')));
  await p.close();

  // כל סוג תרגיל מוצג כראוי, נכנס במסך בלי גלילה אופקית, והתשובה הנכונה מתקבלת
  const PLACE_TYPES = ['place', 'words', 'chart', 'line', 'parity', 'pseq', 'pcompare', 'neighbors'];
  for (const [w, h, name] of [[390, 844, 'טלפון'], [820, 1180, 'אייפד']]) {
    for (const t of PLACE_TYPES) {
      p = await H.fresh(b, w, h, { progress: { level: 5 } });
      await p.evaluate((t) => {
        const o = MG.Questions.generate;
        MG.Questions.generate = function () { window.__last = o.call(MG.Questions, 4, t, false); return window.__last; };
      }, t);
      await H.startMission(p, 0);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, card: document.querySelector('#question-card').scrollWidth, cw: document.querySelector('#question-card').clientWidth }));
      ok('N34-' + name + '-' + t, 'התרגיל מוצג בלי גלישה אופקית', m.sw <= m.iw + 1 && m.card <= m.cw + 1, JSON.stringify(m));
      const ansVal = await p.evaluate(() => String(window.__last.answer));
      await p.locator('#answers .ans[data-val="' + ansVal + '"]').click(); await p.waitForTimeout(250);
      ok('N35-' + name + '-' + t, 'התשובה הנכונה מתקבלת בלחיצה', (await p.locator('#answers .ans.correct').count()) === 1, 'תשובה ' + ansVal);
      ok('N36-' + name + '-' + t, 'בלי שגיאות', p.__errors.length === 0, p.__errors.join('|'));
      await p.close();
    }
  }

  // ---------- הסתרת נושא באזור ההורים ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 5 } });
  await H.openParent(p);
  const nTog = await p.evaluate(() => Object.keys(MG.Questions.STRANDS).filter(k => k !== 'core' && MG.Questions.STRANDS[k].types).length);
  ok('N50', 'לכל נתיב נושא יש מתג הצגה והסתרה, ולליבה אין', (await p.locator('#level-pickers .level-toggle').count()) === nTog, nTog + ' נתיבים');
  await p.locator('#level-pickers .level-row').nth(1).locator('.level-toggle').click(); await p.waitForTimeout(250);
  ok('N51', 'לחיצה מסתירה את הנושא', await p.evaluate(() => MG.Storage.get().parent.hidden.mult === true));
  ok('N52', 'השורה מציינת שהנושא מוסתר', /הנושא מוסתר/.test(await p.locator('#level-pickers').textContent()));
  await p.locator('.nav-btn[data-go="home"]').click(); await p.waitForTimeout(250);
  ok('N53', 'הנושא המוסתר לא מוצג במסך הבית', !/כפל וחילוק/.test(await p.locator('#home-tip').textContent()), await p.locator('#home-tip').textContent());
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  types = await p.evaluate(() => window.__types);
  ok('N54', 'נושא מוסתר לא מופיע במשימה (ונושא פתוח אחר כן)', types.length === 8 && (await strandCount(p)) === 0 &&
    (await p.evaluate(() => window.__types.some(t => MG.Questions.strandOf(t) === 'place'))), types.join());
  await H.startMission(p, 0, true);
  types = await p.evaluate(() => window.__types.slice(8));
  ok('N55', 'אתגר הכוכב גם הוא מכבד את ההסתרה', types.length > 0 && (await p.evaluate(() => window.__types.slice(8).every(t => MG.Questions.strandOf(t) !== 'mult'))), types.join());
  await p.locator('#btn-quit').click(); await p.waitForTimeout(250);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(350);
  await H.openParent(p);
  await p.locator('#level-pickers .level-row').nth(1).locator('.level-toggle').click(); await p.waitForTimeout(250);
  ok('N56', 'לחיצה נוספת מחזירה את הנושא', await p.evaluate(() => !MG.Storage.get().parent.hidden.mult));
  await p.close();

  p = await H.fresh(b, 820, 1180, { progress: { level: 5, skills: { mult: 3, place: 2 } } });
  await p.evaluate(() => { const hd = {}; Object.keys(MG.Questions.STRANDS).forEach(k => { if (k !== 'core') hd[k] = true; }); MG.Storage.get().parent.hidden = hd; MG.Storage.save(); });
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  types = await p.evaluate(() => window.__types);
  ok('N57', 'כל הנתיבים מוסתרים: המשימה בליבה בלבד, בלי שגיאות', types.length === 8 && (await p.evaluate(() => window.__types.every(t => MG.Questions.strandOf(t) === 'core'))) && p.__errors.length === 0, types.join());
  await p.evaluate(() => { MG.Storage.reset(); });
  ok('N58', 'איפוס מחזיר את כל הנושאים', await p.evaluate(() => JSON.stringify(MG.Storage.get().parent.hidden) === '{}'));
  await p.close();

  // ---------- שלב 3: רמות 6-8 וסוגי הליבה החדשים ----------
  p = await H.fresh(b, 820, 1180, { progress: { level: 5 } });
  await trace(p); await H.startMission(p, 0); await H.playMission(p);
  types = await p.evaluate(() => window.__types);
  ok('N40', 'ברמה 5 אין עדיין סוגי ליבה חדשים', types.every(t => !['vertical', 'tf', 'inverse', 'estimate', 'word2'].includes(t)), types.join());
  await p.close();

  for (const lv of [6, 8]) {
    p = await H.fresh(b, 820, 1180, { progress: { level: lv } });
    await trace(p); await H.startMission(p, 0);
    const done6 = await H.playMission(p, 80);
    types = await p.evaluate(() => window.__types);
    ok('N41-' + lv, 'משימה מלאה ברמה ' + lv + ' מסתיימת בלי שגיאות', done6 && p.__errors.length === 0, p.__errors.join('|') + ' ' + types.join());
    // במשימה אחת זה אקראי (4 תרגילי ליבה מתוך 12 סוגים), ולכן בודקים על הרבה תכנוני משימה
    ok('N42-' + lv, 'ברמה ' + lv + ' סוגי הליבה החדשים נכנסים לתכנון המשימות', await p.evaluate((lv) =>
      Array.from({ length: 80 }, () => MG.Questions.missionPlan(lv, 8, { open: [], stages: {} })).some(pl => pl.some(t => ['vertical', 'tf', 'inverse', 'estimate', 'word2'].includes(t))), lv));
    ok('N43-' + lv, 'הרמה לא חורגת מהתקרה', (await prog(p)).level <= 8);
    await p.close();
  }

  // כל סוג חדש בטלפון ובאייפד: בלי גלישה, התשובה הנכונה מתקבלת (כולל הקלדה במאונך)
  const CORE_NEW = ['vertical', 'tf', 'estimate', 'inverse', 'word2'];
  for (const [w, h, name] of [[390, 844, 'טלפון'], [820, 1180, 'אייפד']]) {
    for (const t of CORE_NEW) {
      p = await H.fresh(b, w, h, { progress: { level: 8 } });
      await p.evaluate((t) => {
        const o = MG.Questions.generate;
        MG.Questions.generate = function () { window.__last = o.call(MG.Questions, 8, t, false); return window.__last; };
      }, t);
      await H.startMission(p, 0);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, card: document.querySelector('#question-card').scrollWidth, cw: document.querySelector('#question-card').clientWidth }));
      ok('N44-' + name + '-' + t, 'התרגיל מוצג בלי גלישה אופקית', m.sw <= m.iw + 1 && m.card <= m.cw + 1, JSON.stringify(m));
      const info = await p.evaluate(() => ({ ans: String(window.__last.answer), input: window.__last.input }));
      if (info.input === 'pad') {
        for (const d of info.ans) await p.locator('#answers .pad-key:text-is("' + d + '")').first().click();
        await p.locator('#answers .pad-ok').click();
        await p.waitForTimeout(300);
        ok('N45-' + name + '-' + t, 'הקלדת התשובה הנכונה מתקבלת', (await p.locator('#hint-bar .hint-msg.good').count()) === 1, info.ans);
      } else {
        await p.locator('#answers .ans[data-val="' + info.ans + '"]').click(); await p.waitForTimeout(250);
        ok('N45-' + name + '-' + t, 'התשובה הנכונה מתקבלת בלחיצה', (await p.locator('#answers .ans.correct').count()) === 1, info.ans);
      }
      ok('N46-' + name + '-' + t, 'בלי שגיאות', p.__errors.length === 0, p.__errors.join('|'));
      await p.close();
    }
  }

  // ---------- שלב 4: כל סוג תרגיל בטלפון ובאייפד ----------
  const P4 = ['clock', 'tclock', 'duration', 'coins', 'pay', 'change', 'ruler', 'unit', 'weight', 'area', 'perimeter', 'frac', 'fracof', 'fracrel', 'pict', 'bar',
    'solid', 'objsolid', 'shape', 'symmetry', 'reflect', 'translate', 'parts3d'];
  for (const [w, h, name, subset] of [[390, 844, 'טלפון', P4], [820, 1180, 'אייפד', ['clock', 'tclock', 'pay', 'area', 'bar', 'ruler', 'solid', 'reflect', 'translate']]]) {
    for (const t of subset) {
      p = await H.fresh(b, w, h, { progress: { level: 8 } });
      await p.evaluate((t) => {
        const o = MG.Questions.generate;
        MG.Questions.generate = function () { window.__last = o.call(MG.Questions, 4, t, false); return window.__last; };
      }, t);
      await H.startMission(p, 0);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, card: document.querySelector('#question-card').scrollWidth, cw: document.querySelector('#question-card').clientWidth,
        ans: document.querySelector('#answers').scrollWidth, aw: document.querySelector('#answers').clientWidth }));
      ok('N60-' + name + '-' + t, 'התרגיל והתשובות מוצגים בלי גלישה אופקית', m.sw <= m.iw + 1 && m.card <= m.cw + 1 && m.ans <= m.aw + 1, JSON.stringify(m));
      const ansVal = await p.evaluate(() => String(window.__last.answer));
      await p.locator('#answers .ans[data-val="' + ansVal + '"]').click(); await p.waitForTimeout(250);
      ok('N61-' + name + '-' + t, 'התשובה הנכונה מתקבלת בלחיצה', (await p.locator('#answers .ans.correct').count()) === 1, 'תשובה ' + ansVal);
      ok('N62-' + name + '-' + t, 'בלי שגיאות', p.__errors.length === 0, p.__errors.join('|'));
      await p.close();
    }
  }

  // משימה מלאה עם כל הנתיבים פתוחים, ובדיקה שנתיב מוסתר לא נכנס
  p = await H.fresh(b, 820, 1180, { progress: { level: 8, skills: { mult: 3, place: 2, time: 3, money: 3, measure: 2, fractions: 2, data: 2, geometry: 2 } } });
  await p.evaluate(() => { MG.Storage.get().parent.hidden = { time: true, data: true }; MG.Storage.save(); });
  await trace(p); await H.startMission(p, 0);
  const done4 = await H.playMission(p, 80);
  types = await p.evaluate(() => window.__types);
  ok('N63', 'משימה מלאה עם כל הנתיבים מסתיימת בלי שגיאות', done4 && p.__errors.length === 0, p.__errors.join('|') + ' ' + types.join());
  ok('N64', 'נתיבים מוסתרים (שעון, נתונים) לא נכנסו', await p.evaluate(() => window.__types.every(t => !['time', 'data'].includes(MG.Questions.strandOf(t)))), types.join());
  await p.close();

  // מדליית מלך החשבון
  p = await H.fresh(b, 820, 1180, { progress: { level: 8 } });
  ok('N47', 'מדליית מלך החשבון נפתחת ברמה 8', await p.evaluate(() => MG.Rewards.checkMedals().some(m => m.id === 'level8')));
  await p.close();

  // ---------- משימות מלאות עם התרגילים האמיתיים בשלבים הגבוהים ----------
  for (const st of [1, 3, 5, 6]) {
    p = await H.fresh(b, 820, 1180, { progress: { level: 5, skills: { mult: st } } });
    await trace(p); await H.startMission(p, 0);
    const done = await H.playMission(p, 80);
    types = await p.evaluate(() => window.__types);
    ok('N23-' + st, 'משימה מלאה בשלב ' + st + ' מסתיימת בלי שגיאות', done && p.__errors.length === 0, p.__errors.join('|') + ' ' + types.join());
    ok('N24-' + st, 'שלב ' + st + ': כל הסוגים שהופיעו פתוחים בו (ובנתיב ערך המקום בשלב 1)', await p.evaluate((s) =>
      window.__types.every(t => { const k = MG.Questions.strandOf(t); return k === 'core' || MG.Questions.typesForStage(k, k === 'mult' ? s : 1).includes(t); }), st), types.join());
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
