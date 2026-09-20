/* תזמון מדליות, הפתעות ומסלול ההתקדמות (171–176, 193–197, 311) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };
async function stub(p) {
  await p.evaluate(() => {
    MG.Questions.generate = function (level, type, hint) {
      return { type: 'add', kicker: 'חיבור', level: level,
        html: '<div class="equation">1 + 1 = <span class="blank">?</span></div>', input: 'choices',
        choices: [{ v: 2, sym: '2' }, { v: 3, sym: '3' }, { v: 4, sym: '4' }, { v: 5, sym: '5' }],
        answer: 2, hintHtml: '<p>רמז</p>', explainHtml: '<p>הסבר</p>' };
    };
  });
}
const right = async (p) => { await p.locator('#answers .ans .sym:text-is("2")').locator('..').click(); await p.waitForTimeout(900); };

(async () => {
  const b = await chromium.launch();

  // 193 — מדליה ראשונה מיד בתרגיל הנכון הראשון
  let p = await H.fresh(b); await stub(p); await H.startMission(p, 0);
  await right(p);
  let medals = await p.evaluate(() => MG.Storage.get().medals);
  ok('193', 'מדליית "הצעד הראשון" נפתחת מיד', medals.includes('first'), medals.join(','));
  const toast1 = await p.locator('#toast-root').textContent();
  ok('193b', 'מוצגת הודעה על המדליה', /מדליה חדשה/.test(toast1), toast1.trim().slice(0, 50));
  await p.close();

  // 194 — מדליית 10 נכונים נפתחת בדיוק בתרגיל העשירי
  p = await H.fresh(b, 820, 1180, { progress: { totalCorrect: 9, totalAnswered: 9, firstTryCorrect: 9 } });
  await p.evaluate(() => { MG.Storage.get().medals = ['first']; MG.Storage.save(); });
  await stub(p); await H.startMission(p, 0);
  const before = await p.evaluate(() => MG.Storage.get().medals.slice());
  await right(p);
  const after = await p.evaluate(() => MG.Storage.get().medals.slice());
  ok('194', 'מדליית 10 נכונים נפתחת בתרגיל העשירי עצמו',
    !before.includes('ten') && after.includes('ten'), before.join(',') + ' → ' + after.join(','));
  const t2 = await p.locator('#toast-root').textContent();
  ok('194b', 'הודעה בזמן אמת', /עשרה נכונים/.test(t2), t2.trim().slice(0, 60));
  ok('411-430', 'המדליה מוארת באוסף', await (async () => {
    // המדליה שזה עתה נפתחה מציגה מודל, והוא חוסם את כפתור היציאה
    await H.closeModal(p);
    await p.locator('#btn-quit').click(); await p.waitForTimeout(300);
    await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(400);
    await p.locator('.nav-btn[data-go="collection"]').click(); await p.waitForTimeout(350);
    const lit = await p.locator('.medal:not(.off)').count();
    return lit >= 2;
  })());
  await p.close();

  // 197 — רצף של 5
  p = await H.fresh(b); await stub(p); await H.startMission(p, 0);
  for (let i = 0; i < 5; i++) { await right(p); await H.closeModal(p); }
  const m5 = await p.evaluate(() => MG.Storage.get().medals);
  ok('197', 'מדליית רצף 5 נפתחת בזמן אמת', m5.includes('streak5'), m5.join(','));
  await p.close();

  // 176 — הפתעה אינה גורמת לאיבוד תשובה
  p = await H.fresh(b); await stub(p);
  await p.evaluate(() => { window.__origRandom = Math.random; });
  await H.startMission(p, 0);
  await p.evaluate(() => { Math.random = () => 0.01; });   // מכריח הפתעה
  const stepsBefore = await p.locator('#track .track-step.done').count();
  await right(p); await p.waitForTimeout(600);
  const hasModal = await p.locator('#modal-root .modal').count();
  ok('171-174', 'הפתעה מופיעה אחרי תשובה נכונה', hasModal === 1);
  const surpriseTxt = hasModal ? await p.locator('#modal-root .modal').textContent() : '';
  ok('175', 'תוכן ההפתעה קריא ונסגר בכפתור', surpriseTxt.length > 5 && (await p.locator('#modal-root .btn').count()) >= 1, surpriseTxt.slice(0, 50));
  await p.locator('#modal-root .btn').first().click(); await p.waitForTimeout(700);
  const stepsAfter = await p.locator('#track .track-step.done').count();
  ok('176', 'הפתעה אינה קוטעת את רצף המשימה', stepsAfter === stepsBefore + 1, stepsBefore + '→' + stepsAfter);
  await p.evaluate(() => { Math.random = window.__origRandom; });
  await p.close();

  // 311/313 — צעידת הדמות במסלול
  p = await H.fresh(b); await stub(p); await H.startMission(p, 0);
  const pos = [];
  for (let i = 0; i < 4; i++) {
    pos.push(await p.evaluate(() => Math.round(document.getElementById('walker').getBoundingClientRect().left)));
    await right(p); await H.closeModal(p);
  }
  const moving = pos.every((v, i) => i === 0 || v < pos[i - 1]);   // RTL: מימין לשמאל
  ok('311', 'הדמות מתקדמת אחרי כל תרגיל', moving, pos.join('→'));
  await p.close();

  // 133 — אין חפיפת טקסט ברמז
  p = await H.fresh(b, 390, 844);
  await H.startMission(p, 0);
  const overlaps = await p.evaluate(() => {
    const card = document.getElementById('question-card');
    const hint = document.getElementById('hint-bar');
    let bad = 0;
    for (let lvl = 1; lvl <= 5; lvl++) for (let i = 0; i < 12; i++) {
      const q = MG.Questions.generate(lvl, null, true);
      card.innerHTML = q.html;
      hint.innerHTML = '<div class="hint-msg">' + q.hintHtml + '</div>';
      const els = [...hint.querySelectorAll('.tenframe, .numline, .equation, .visual, .pv')];
      for (let a = 0; a < els.length; a++) for (let c = a + 1; c < els.length; c++) {
        const r1 = els[a].getBoundingClientRect(), r2 = els[c].getBoundingClientRect();
        if (els[a].contains(els[c]) || els[c].contains(els[a])) continue;
        if (!(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom)) bad++;
      }
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth) bad += 100;
    }
    return bad;
  });
  ok('133', 'אין חפיפה בין אלמנטים ברמז', overlaps === 0, overlaps + ' חפיפות');
  await p.close();

  console.log(JSON.stringify({ part: 'UI-8', failed: fails.length, fails }, null, 1));
  await b.close();
})();
