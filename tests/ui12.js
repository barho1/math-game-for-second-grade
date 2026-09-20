/* הקראה מדויקת בעברית, השתקה כללית ודרכי יציאה (תיקוני סבב המשוב) */
const { chromium } = require('playwright');
const H = require('./helpers');
const fails = [];
const ok = (id, d, c, x) => { if (!c) fails.push({ id, d, x: x || '' }); };

(async () => {
  const b = await chromium.launch();

  // ---------- מילות מספר בעברית ----------
  let p = await H.fresh(b);
  const words = await p.evaluate(() => {
    const Q = MG.Questions;
    return {
      f3: Q.numWord(3, 'f'), m3: Q.numWord(3, 'm'),
      attrF2: Q.numWord(2, 'f', true), attrM2: Q.numWord(2, 'm', true),
      f11: Q.numWord(11, 'f'), m12: Q.numWord(12, 'm'),
      f21: Q.numWord(21, 'f'), m35: Q.numWord(35, 'm'),
      t60: Q.numWord(60, 'f'), h100: Q.numWord(100, 'm'),
      over: Q.numWord(137, 'f')
    };
  });
  ok('S1', 'מין דקדוקי בספרות בודדות', words.f3 === 'שלוש' && words.m3 === 'שלושה', JSON.stringify(words));
  ok('S2', 'צורת סמיכות ל-2', words.attrF2 === 'שתי' && words.attrM2 === 'שני', words.attrF2 + '/' + words.attrM2);
  ok('S3', 'מספרי עשרה', words.f11 === 'אחת עשרה' && words.m12 === 'שנים עשר', words.f11 + '/' + words.m12);
  ok('S4', 'מספרים מורכבים', words.f21 === 'עשרים ואחת' && words.m35 === 'שלושים וחמישה', words.f21 + '/' + words.m35);
  ok('S5', 'עשרות ומאה', words.t60 === 'שישים' && words.h100 === 'מאה', words.t60 + '/' + words.h100);
  ok('S6', 'מחוץ לטווח נשאר כספרה', words.over === '137', words.over);

  // ---------- כל טקסט מדובר נקי מספרות, אימוג'י ותוויות ציר ----------
  const scan = await p.evaluate(() => {
    const Q = MG.Questions;
    const types = Object.keys(Q.HOW_TO);
    const bad = { digits: [], emoji: [], ruler: [], empty: 0 };
    const EMOJI = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
    for (let lvl = 1; lvl <= 5; lvl++) {
      for (const t of types) {
        for (let i = 0; i < 60; i++) {
          const q = Q.generate(lvl, t, i % 2 === 0);
          for (const key of ['spoken', 'hintSpoken', 'explainSpoken']) {
            const v = q[key] || '';
            if (!v) continue;
            if (/\d/.test(v) && bad.digits.length < 4) bad.digits.push(key + ': ' + v);
            if (EMOJI.test(v) && bad.emoji.length < 4) bad.emoji.push(key + ': ' + v);
            // דמפ של ציר המספרים נראה כך: "אפס אחת שתיים שלוש ארבע"
            if (/אפס אחת שתיים שלוש/.test(v) && bad.ruler.length < 4) bad.ruler.push(key + ': ' + v);
          }
          if (!q.spoken) bad.empty++;
        }
      }
    }
    return bad;
  });
  ok('S7', 'אין ספרות בטקסט המוקרא', scan.digits.length === 0, scan.digits.join(' | '));
  ok('S8', 'אין אימוג\'י בטקסט המוקרא', scan.emoji.length === 0, scan.emoji.join(' | '));
  ok('S9', 'הרמז אינו מקריא את כל ציר המספרים', scan.ruler.length === 0, scan.ruler.join(' | '));
  ok('S10', 'לכל שאלה יש טקסט מוקרא', scan.empty === 0, 'חסרים ' + scan.empty);

  // ---------- התאמת מין לשם העצם בבעיות מילוליות ----------
  const gender = await p.evaluate(() => {
    const Q = MG.Questions;
    const FEM = ['עוגיות', 'מכוניות', 'דבורים', 'חלליות', 'פטריות', 'צפרדעים', 'מתנות'];
    let checked = 0; const wrong = [];
    for (let i = 0; i < 900; i++) {
      const q = Q.generate(3, 'word', false);
      const noun = FEM.find(n => q.spoken.indexOf(n) >= 0);
      if (!noun) continue;
      checked++;
      // צורת זכר לפני שם עצם נקבי היא הטעות שאנחנו מונעים
      if (/(שלושה|ארבעה|חמישה|שישה|שבעה|תשעה|שני) /.test(q.spoken) && wrong.length < 4) wrong.push(q.spoken);
    }
    return { checked, wrong };
  });
  ok('S11', 'נבדקו מספיק בעיות עם שם עצם נקבי', gender.checked > 100, 'נבדקו ' + gender.checked);
  ok('S12', 'אין צורת זכר לפני שם עצם נקבי', gender.wrong.length === 0, gender.wrong.join(' | '));

  // ---------- השתקה כללית ----------
  await H.startMission(p, 0);
  const before = await p.evaluate(() => MG.Speech.enabled());
  await p.locator('#btn-sound').click(); await p.waitForTimeout(300);
  const muted = await p.evaluate(() => ({ snd: MG.Storage.get().settings.sound, sp: MG.Speech.enabled(), icon: document.getElementById('btn-sound').textContent }));
  ok('M1', 'כפתור הרמקול משתיק גם את ההקראה', muted.snd === false && muted.sp === false, JSON.stringify(muted));
  ok('M2', 'האייקון משתנה', muted.icon === '🔇', muted.icon);
  ok('M3', 'יש תווית נגישות', !!(await p.locator('#btn-sound').getAttribute('aria-label')));
  await p.locator('#btn-sound').click(); await p.waitForTimeout(300);
  const back = await p.evaluate(() => ({ snd: MG.Storage.get().settings.sound, sp: MG.Speech.enabled() }));
  ok('M4', 'ביטול ההשתקה מחזיר את ההקראה', back.snd === true && back.sp === before, JSON.stringify(back) + ' לפני ' + before);

  // כוונת ההורה נשמרת: הקראה כבויה נשארת כבויה גם אחרי השתקה וביטולה
  await p.evaluate(() => { MG.Storage.get().settings.speech = false; MG.Storage.save(); });
  await p.locator('#btn-sound').click(); await p.waitForTimeout(250);
  await p.locator('#btn-sound').click(); await p.waitForTimeout(250);
  const keep = await p.evaluate(() => ({ sp: MG.Storage.get().settings.speech, en: MG.Speech.enabled(), snd: MG.Storage.get().settings.sound }));
  ok('M5', 'הגדרת ההורה נשמרת אחרי השתקה וביטולה', keep.sp === false && keep.en === false && keep.snd === true, JSON.stringify(keep));
  await p.evaluate(() => { MG.Storage.get().settings.speech = true; MG.Storage.save(); });
  await p.close();

  // ---------- יציאה מדיאלוג העולם ----------
  p = await H.fresh(b);
  await p.locator('.world').first().click(); await p.waitForTimeout(350);
  const btns = await p.locator('#modal-root .btn').allTextContents();
  ok('E1', 'לדיאלוג העולם יש דרך חזרה', btns.length === 3 && /לא עכשיו/.test(btns[2]), btns.join('|'));
  await p.locator('#modal-root .btn').nth(2).click(); await p.waitForTimeout(350);
  ok('E2', '"לא עכשיו" מחזיר למפה בלי להתחיל משימה',
     (await p.locator('#screen-home.is-active').count()) === 1 &&
     (await p.locator('#modal-root .modal').count()) === 0 &&
     (await p.evaluate(() => MG.Storage.get().progress.totalAnswered)) === 0);

  await p.locator('.world').first().click(); await p.waitForTimeout(350);
  await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
  await p.waitForTimeout(300);
  ok('E3', 'Escape סוגר את דיאלוג העולם', (await p.locator('#modal-root .modal').count()) === 0);

  await p.locator('.world').first().click(); await p.waitForTimeout(350);
  await p.locator('#modal-root').click({ position: { x: 8, y: 8 } }); await p.waitForTimeout(300);
  ok('E4', 'לחיצה על הרקע סוגרת את דיאלוג העולם', (await p.locator('#modal-root .modal').count()) === 0);

  // ---------- כפתור היציאה מהמשימה ----------
  await H.startMission(p, 0);
  const quit = await p.evaluate(() => {
    const q = document.getElementById('btn-quit');
    const cs = getComputedStyle(q);
    const r = q.getBoundingClientRect();
    const track = document.getElementById('track').getBoundingClientRect();
    return { txt: q.textContent.replace(/\s+/g, ''), aria: q.getAttribute('aria-label'),
             bg: cs.backgroundColor, gap: Math.round(Math.min(Math.abs(r.left - track.right), Math.abs(track.left - r.right))) };
  });
  ok('E5', 'כפתור היציאה נושא מילה ולא רק חץ', /למפה/.test(quit.txt), quit.txt);
  ok('E6', 'לכפתור היציאה יש תווית נגישות', /מפה/.test(quit.aria || ''), String(quit.aria));
  ok('E7', 'רקע הכפתור אטום ולא שקוף', quit.bg === 'rgb(255, 255, 255)', quit.bg);
  ok('E8', 'הכפתור מופרד מפס ההתקדמות', quit.gap >= 12, 'מרווח ' + quit.gap);

  // דיאלוג האישור של היציאה דווקא כן דורש החלטה
  await p.locator('#btn-quit').click(); await p.waitForTimeout(300);
  ok('E9', 'לחיצה על היציאה מבקשת אישור', (await p.locator('#modal-root .modal').count()) === 1);
  await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
  await p.waitForTimeout(250);
  ok('E10', 'אישור היציאה אינו נסגר ב-Escape', (await p.locator('#modal-root .modal').count()) === 1);
  await p.locator('#modal-root').click({ position: { x: 8, y: 8 } }); await p.waitForTimeout(250);
  ok('E11', 'אישור היציאה אינו נסגר בלחיצה על הרקע', (await p.locator('#modal-root .modal').count()) === 1);
  await p.locator('#modal-root .btn').last().click(); await p.waitForTimeout(400);
  ok('E12', 'היציאה מחזירה למפה', (await p.locator('#screen-home.is-active').count()) === 1);

  // שורת העזרה על היציאה
  await H.startMission(p, 0);
  await p.locator('#btn-help').click(); await p.waitForTimeout(400);
  const helpTxt = await p.locator('.help-sheet').textContent();
  ok('E13', 'העזרה מסבירה איך יוצאים', /למפה/.test(helpTxt), helpTxt.slice(0, 120));
  await p.close();

  console.log(JSON.stringify({ part: 'UI-12 (הקראה, השתקה ויציאה)', failed: fails.length, fails }, null, 1));
  await b.close();
})();
