/* בדיקות לוגיקה (ללא דפדפן) — מחוללי תרגילים, כלכלת המשחק, מדליות */
global.window = {};
const path = require('path');
const R = path.join(__dirname, '..', 'js') + path.sep;
require(R + 'storage.js'); require(R + 'questions.js');
const MG = global.window.MG, Q = MG.Questions;

const fails = [];
function check(id, desc, cond, extra) {
  if (!cond) fails.push({ id, desc, extra: extra || '' });
}
const N = 3000;

// ---------- 3.1 טווחי מספרים לפי רמה ----------
const MAXBY = { 1: 10, 2: 20, 3: 20, 4: 50, 5: 100 };
for (let lvl = 1; lvl <= 5; lvl++) {
  let over = null, overT = '';
  for (let i = 0; i < N; i++) {
    const t = Q.typesForLevel(lvl)[i % Q.typesForLevel(lvl).length];
    const q = Q.generate(lvl, t, false);
    const visible = (q.html.replace(/<[^>]*>/g, ' ') + ' ' + (q.text || ''));
    const all = visible.match(/\d+/g) || [];
    const mx = Math.max(...all.map(Number), 0);
    // ספירה יכולה להציג עד count, לא עד max
    const cap = t === 'count' ? { 1: 10, 2: 20, 3: 30, 4: 40, 5: 60 }[lvl] : MAXBY[lvl];
    if (mx > cap && !over) { over = mx; overT = t; }
  }
  check('63/66/70/71/72-L' + lvl, 'טווח מספרים ברמה ' + lvl, over === null, over ? 'הופיע ' + over + ' בסוג ' + overT : '');
}

// ---------- 3.1 סוגי תרגילים פתוחים לפי רמה ----------
const t1 = Q.typesForLevel(1);
check('64', 'רמה 1 — הסוגים המותרים', ['count','visual','add','sub','compare','sequence'].every(t => t1.includes(t)));
check('65', 'רמה 1 — אין השלמת נעלם/בעיות מילוליות', !t1.includes('missing') && !t1.includes('word'), 'בפועל: ' + t1.join(','));
check('69', 'רמה 2 — יש השלמת נעלם ובעיות מילוליות', Q.typesForLevel(2).includes('missing') && Q.typesForLevel(2).includes('word'));

// ---------- 3.2 תקינות מתמטית ----------
function parseEq(html) { return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

let addBad = 0, subNeg = 0, subOrder = 0, carry2 = 0, complete10 = 0, carry3 = 0;
for (let i = 0; i < N; i++) {
  let q = Q.generate(2, 'add', false);
  let m = parseEq(q.html).match(/(\d+)\s*\+\s*(\d+)/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a + b !== q.answer) addBad++;
    if ((a % 10) + (b % 10) > 10) carry2++;
    if ((a % 10) + (b % 10) === 10) complete10++;
  }
  q = Q.generate(3, 'add', false);
  m = parseEq(q.html).match(/(\d+)\s*\+\s*(\d+)/);
  if (m && (+m[1] % 10) + (+m[2] % 10) > 10) carry3++;

  q = Q.generate(1 + (i % 5), 'sub', false);
  m = parseEq(q.html).match(/(\d+)\s*−\s*(\d+)/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a - b !== q.answer) addBad++;
    if (a - b < 0) subNeg++;
    if (a < b) subOrder++;
  }
}
check('73', 'חיבור מדויק', addBad === 0, addBad + ' שגיאות');
check('74', 'אין חיסור שלילי', subNeg === 0);
check('75', 'בחיסור המחוסר גדול/שווה', subOrder === 0);
check('67', 'רמה 2 — אין חציית עשרת', carry2 === 0, carry2 + ' מקרים');
check('68', 'רמה 2 — יש השלמה ל-10', complete10 > 0);
check('70', 'רמה 3 — יש חציית עשרת', carry3 > 0);

// חיסור: האם קיים אי פעם 0 כתוצאה, ו-0 כמחסר (מקרי קצה 294/295/316)
let subZeroResult = false, subZeroSubtrahend = false, addZero = false;
for (let i = 0; i < N * 2; i++) {
  let q = Q.generate(1, 'sub', false);
  let m = parseEq(q.html).match(/(\d+)\s*−\s*(\d+)/);
  if (m) { if (+m[1] === +m[2]) subZeroResult = true; if (+m[2] === 0) subZeroSubtrahend = true; }
  q = Q.generate(1, 'add', false);
  m = parseEq(q.html).match(/(\d+)\s*\+\s*(\d+)/);
  if (m && (+m[1] === 0 || +m[2] === 0)) addZero = true;
}
check('294', 'קיים תרגיל חיסור שתוצאתו 0 (X−X)', subZeroResult);
check('316b', 'קיים תרגיל חיסור עם 0 (X−0)', subZeroSubtrahend);
check('295', 'קיים תרגיל חיבור עם 0 (X+0)', addZero);

// השלמת נעלם — שלושת המבנים
const shapes = { 'a+?=c': 0, '?+b=c': 0, 'a-?=c': 0 };
let missBad = 0;
for (let i = 0; i < N; i++) {
  const q = Q.generate(3, 'missing', false);
  const e = parseEq(q.html);
  let m;
  if ((m = e.match(/^(\d+)\s*\+\s*\?\s*=\s*(\d+)/))) { shapes['a+?=c']++; if (+m[1] + q.answer !== +m[2]) missBad++; }
  else if ((m = e.match(/^\?\s*\+\s*(\d+)\s*=\s*(\d+)/))) { shapes['?+b=c']++; if (q.answer + +m[1] !== +m[2]) missBad++; }
  else if ((m = e.match(/^(\d+)\s*−\s*\?\s*=\s*(\d+)/))) { shapes['a-?=c']++; if (+m[1] - q.answer !== +m[2]) missBad++; }
}
check('76', 'השלמת נעלם A+?=C', shapes['a+?=c'] > 0);
check('77', 'השלמת נעלם ?+B=C', shapes['?+b=c'] > 0);
check('78', 'השלמת נעלם A−?=C', shapes['a-?=c'] > 0);
check('76-78b', 'חשבון השלמת נעלם מדויק', missBad === 0, missBad + ' שגיאות');

// השוואה
let cmpExprNum = 0, cmpExprExpr = 0, cmpEq = 0, cmpBad = 0;
for (let i = 0; i < N; i++) {
  for (const lvl of [1, 3, 4, 5]) {
    const q = Q.generate(lvl, 'compare', false);
    const e = parseEq(q.html).replace(/\?/g, '?');
    const sides = e.split('?');
    const evalSide = s => { const p = s.match(/(\d+)\s*([+−])\s*(\d+)/); if (p) return p[2] === '+' ? +p[1] + +p[3] : +p[1] - +p[3]; const n = s.match(/\d+/); return n ? +n[0] : NaN; };
    const L = evalSide(sides[0]), Rv = evalSide(sides[1] || '');
    const expect = L > Rv ? '>' : L < Rv ? '<' : '=';
    if (!isNaN(L) && !isNaN(Rv) && expect !== q.answer) cmpBad++;
    const hasOpL = /[+−]/.test(sides[0]), hasOpR = /[+−]/.test(sides[1] || '');
    if (hasOpL && !hasOpR) cmpExprNum++;
    if (hasOpL && hasOpR) cmpExprExpr++;
    if (q.answer === '=') cmpEq++;
  }
}
check('79/80', 'השוואה — תרגיל מול מספר קיימת', cmpExprNum > 0);
check('81/335/340', 'השוואה — תרגיל מול תרגיל קיימת', cmpExprExpr > 0, 'נמצאו ' + cmpExprExpr);
check('296', 'השוואה — קיים מקרה של שוויון', cmpEq > 0);
check('79b', 'תשובת ההשוואה נכונה תמיד', cmpBad === 0, cmpBad + ' שגיאות');

// סדרות
const steps = new Set(); const blanks = new Set(); let seqBad = 0, seqDesc = 0, seqDescL1 = 0;
for (let i = 0; i < N; i++) {
  for (const lvl of [1, 2, 3, 4, 5]) {
    const q = Q.generate(lvl, 'sequence', false);
    const cells = [...q.html.matchAll(/<span(?: class="blank")?>([^<]*)<\/span>/g)].map(m => m[1]);
    const idx = cells.findIndex(c => c === '?');
    const nums = cells.map(c => c === '?' ? null : +c);
    let step = null;
    for (let k = 1; k < nums.length; k++) if (nums[k] !== null && nums[k-1] !== null) { step = nums[k] - nums[k-1]; break; }
    steps.add(step);
    if (step < 0) { seqDesc++; if (lvl === 1) seqDescL1++; }
    blanks.add(idx);
    const full = nums.map((n, k) => n === null ? q.answer : n);
    for (let k = 1; k < full.length; k++) if (full[k] - full[k - 1] !== step) seqBad++;
  }
}
check('82-86', 'סדרות — חוקיות עקבית ותשובה נכונה', seqBad === 0, seqBad + ' שגיאות');
check('87', 'קיימות סדרות יורדות', seqDesc > 0);
check('318', 'רמה 1 — קיימת סדרה יורדת', seqDescL1 > 0, 'נמצאו ' + seqDescL1);
check('88', 'הנעלם מופיע גם בהתחלה/באמצע', blanks.size >= 3 && Math.min(...blanks) <= 1,
  'מיקומי נעלם: ' + [...blanks].sort().join(','));

// ספירה
let countGroup = true;
for (let i = 0; i < 500; i++) {
  const q = Q.generate(4, 'count', false);
  const n = q.answer;
  if (n > 10 && !/tenframe|bundle/.test(q.html)) countGroup = false;
}
check('90', 'ספירה מעל 10 מסודרת בעשרות', countGroup);

// בעיות מילוליות
let wordLong = 0, wordBadNum = 0;
for (let i = 0; i < N; i++) {
  const q = Q.generate(2, 'word', false);
  const sentences = (q.text.match(/[.?]/g) || []).length;
  if (sentences > 3 || q.text.length > 120) wordLong++;
  const nums = (q.text.match(/\d+/g) || []).map(Number);
  if (nums.some(n => n > 20)) wordBadNum++;
}
check('91', 'בעיות מילוליות קצרות', wordLong === 0, wordLong + ' ארוכות');
check('92', 'מספרים בבעיה תואמים לרמה', wordBadNum === 0, wordBadNum + ' חריגות');

// ---------- 6.1 אפשרויות תשובה ----------
let dup = 0, missingAns = 0, notFour = 0, posCount = [0, 0, 0, 0];
for (let i = 0; i < N; i++) {
  const lvl = 1 + (i % 5);
  const types = Q.typesForLevel(lvl);
  const q = Q.generate(lvl, types[i % types.length], false);
  if (q.input !== 'choices') continue;
  const vs = q.choices.map(c => c.v);
  if (new Set(vs).size !== vs.length) dup++;
  const at = vs.indexOf(q.answer);
  if (at < 0) missingAns++; else if (at < 4) posCount[at]++;
  if (q.type !== 'compare' && vs.length !== 4) notFour++;
}
check('135', '4 אפשרויות בתרגילים רגילים', notFour === 0, notFour + ' חריגים');
check('136', 'התשובה הנכונה קיימת', missingAns === 0);
check('138', 'אין מסיחים כפולים', dup === 0);
check('139', 'מיקום התשובה הנכונה מפוזר', posCount.every(c => c > 0), posCount.join('/'));

// מסיחים סבירים (קרובים לתשובה)
let farDistractor = 0;
for (let i = 0; i < N; i++) {
  const q = Q.generate(3, 'add', false);
  const spread = Math.max(...q.choices.map(c => Math.abs(c.v - q.answer)));
  if (spread > 15) farDistractor++;
}
check('137', 'מסיחים קרובים לתשובה', farDistractor === 0, farDistractor + ' רחוקים');

// ---------- 5.3 דיוק הרמזים ----------
let hintBad = 0;
for (let i = 0; i < N; i++) {
  const q = Q.generate(2, 'add', true);
  const m = parseEq(q.html).match(/(\d+)\s*\+\s*(\d+)/);
  if (!m) continue;
  const items = (q.html.match(/class="item/g) || []).length;
  if (items && items !== +m[1] + +m[2]) hintBad++;
}
check('130', 'ההמחשה תואמת 1:1 למספרים', hintBad === 0, hintBad + ' אי-התאמות');

let jumpBad = 0;
for (let i = 0; i < N; i++) {
  const q = Q.generate(5, 'add', true);
  const lines = (q.hintHtml.match(/(\d+) \+ (\d+) = (\d+)/g) || []);
  for (const l of lines) { const p = l.match(/(\d+) \+ (\d+) = (\d+)/); if (+p[1] + +p[2] !== +p[3]) jumpBad++; }
  const eq = parseEq(q.html).match(/(\d+)\s*\+\s*(\d+)/);
  if (eq && lines.length) {
    const last = lines[lines.length - 1].match(/= (\d+)/)[1];
    if (+last !== q.answer) jumpBad++;
  }
}
check('131', 'רמז פירוק לעשרות מגיע לתשובה הנכונה', jumpBad === 0, jumpBad + ' שגיאות');

// ---------- 7.2 כוכבים ----------
require(R + 'rewards.js');
const Rw = MG.Rewards;
check('165', '8/8 → 3 כוכבים', Rw.starsFor(8, 8) === 3);
check('166', '7/8 → 2 כוכבים', Rw.starsFor(7, 8) === 2, 'קיבלנו ' + Rw.starsFor(7, 8));
check('167', '6/8 → 2 כוכבים', Rw.starsFor(6, 8) === 2);
check('168', '5/8 → כוכב אחד', Rw.starsFor(5, 8) === 1, 'קיבלנו ' + Rw.starsFor(5, 8));
check('169', '0/8 → כוכב אחד לפחות', Rw.starsFor(0, 8) >= 1);

// ---------- ספי עולמות ----------
const need = {}; Rw.WORLDS.forEach(w => need[w.id] = w.need);
check('47-54', 'ספי פתיחת עולמות 0/9/24/42/63',
  need.meadow === 0 && need.ocean === 9 && need.space === 24 && need.candy === 42 && need.jungle === 63,
  JSON.stringify(need));
check('39', 'חמישה עולמות בסדר הנכון',
  Rw.WORLDS.map(w => w.id).join() === 'meadow,ocean,space,candy,jungle');
check('199', '5 משימות להשלמת עולם', Rw.MISSIONS_PER_WORLD === 5);
check('57', 'משימה רגילה = 8 תרגילים', Rw.TASKS_PER_MISSION === 8);
check('58', 'אתגר הכוכב = 4 תרגילים', Rw.TASKS_PER_BONUS === 4);
check('191', '20 מדבקות', Rw.STICKERS.length === 20);
check('205', '12 מדליות', Rw.MEDALS.length === 12);

// ---------- 14: האם כל סוגי התרגילים שבמסמך באמת מיוצרים בכל רמה ----------
function sample(level, type, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const q = Q.generate(level, type, false);
    const txt = q.html.replace(/<[^>]+>/g, ' ');
    out.push({ q, txt, add: txt.match(/(\d+)\s*\+\s*(\d+)/), sub: txt.match(/(\d+)\s*−\s*(\d+)/) });
  }
  return out;
}
const S1add = sample(1, 'add', 4000), S1sub = sample(1, 'sub', 4000);
check('315', 'רמה 1 — חיבור בתחום 10 כולל אפסים ותוצאה 10',
  S1add.some(x => x.add && +x.add[1] + +x.add[2] === 10) && S1add.some(x => x.add && (+x.add[1] === 0 || +x.add[2] === 0)));
check('316', 'רמה 1 — חיסור כולל X−X ו-X−0',
  S1sub.some(x => x.sub && +x.sub[1] === +x.sub[2]) && S1sub.some(x => x.sub && +x.sub[2] === 0));
check('317', 'רמה 1 — השוואה כולל שוויון',
  sample(1, 'compare', 2000).some(x => x.q.answer === '='));
check('319', 'רמה 1 — ספירה בתחום 10',
  sample(1, 'count', 500).every(x => x.q.answer >= 1 && x.q.answer <= 10));
check('320', 'רמה 1 — תרגיל חזותי בתחום',
  sample(1, 'visual', 500).every(x => x.q.answer >= 0 && x.q.answer <= 10));

const S2add = sample(2, 'add', 4000);
check('321', 'רמה 2 — חיבור דו-ספרתי בלי חצייה (למשל 12+3)',
  S2add.some(x => x.add && +x.add[1] >= 10 && +x.add[1] + +x.add[2] <= 20));
check('322', 'רמה 2 — חיסור בתחום 20',
  sample(2, 'sub', 2000).every(x => !x.sub || (+x.sub[1] <= 20 && +x.sub[1] - +x.sub[2] >= 0)));
check('323', 'רמה 2 — שלושת מבני ההשלמה קיימים',
  new Set(sample(2, 'missing', 2000).map(x => x.txt.trim().replace(/\d+/g, 'N').replace(/\s+/g, ' '))).size >= 3);
check('325/326', 'רמה 2 — בעיות מילוליות חיבור וחיסור',
  sample(2, 'word', 2000).some(x => /קיבל/.test(x.q.text)) && sample(2, 'word', 2000).some(x => /נתן|עפו|נשאר/.test(x.q.text)));

const S3add = sample(3, 'add', 4000), S3sub = sample(3, 'sub', 4000);
check('327', 'רמה 3 — חיבור עם חציית עשרת (7+5)',
  S3add.some(x => x.add && (+x.add[1] % 10) + (+x.add[2] % 10) > 10));
check('328', 'רמה 3 — חיסור עם פריטה (12−5)',
  S3sub.some(x => x.sub && (+x.sub[1] % 10) < (+x.sub[2] % 10)));
check('330/331', 'רמה 3 — השוואת תרגיל למספר',
  sample(3, 'compare', 2000).some(x => /[+−]/.test(x.txt.split('?')[0])));

const S4add = sample(4, 'add', 4000);
check('332', 'רמה 4 — חיבור בלי חצייה (23+12)',
  S4add.some(x => x.add && +x.add[1] >= 20 && (+x.add[1] % 10) + (+x.add[2] % 10) <= 10));
check('333', 'רמה 4 — חיבור עם חצייה (27+15)',
  S4add.some(x => x.add && +x.add[1] >= 20 && (+x.add[1] % 10) + (+x.add[2] % 10) > 10));
check('334', 'רמה 4 — חיסור דו-ספרתי',
  sample(4, 'sub', 2000).some(x => x.sub && +x.sub[1] >= 30));
check('336', 'רמה 4 — סדרה בקפיצות של 10',
  sample(4, 'sequence', 2000).some(x => { const n = x.txt.match(/\d+/g).map(Number); return n.length >= 2 && Math.abs(n[1] - n[0]) === 10; }));

const S5add = sample(5, 'add', 4000), S5sub = sample(5, 'sub', 4000);
check('337', 'רמה 5 — חיבור עשרות שלמות (50+40)',
  S5add.some(x => x.add && +x.add[1] % 10 === 0 && +x.add[2] % 10 === 0 && +x.add[1] >= 30));
check('338', 'רמה 5 — חיבור מורכב עד 100 (47+25)',
  S5add.some(x => x.add && +x.add[1] + +x.add[2] > 60 && (+x.add[1] % 10) + (+x.add[2] % 10) > 10));
check('339', 'רמה 5 — חיסור מורכב (90−44)',
  S5sub.some(x => x.sub && +x.sub[1] >= 70 && +x.sub[2] >= 20));
check('340', 'רמה 5 — השוואה בין שני תרגילים',
  sample(5, 'compare', 3000).some(x => { const p = x.txt.split('?'); return /[+−]/.test(p[0]) && /[+−]/.test(p[1] || ''); }));
check('341', 'רמה 5 — בעיה מילולית עד 100',
  sample(5, 'word', 2000).some(x => (x.q.text.match(/\d+/g) || []).some(n => +n > 40)));

// 89: התאמה מוחלטת בין הציור לתשובה בתרגיל חזותי
let visualBad = 0;
for (let i = 0; i < 3000; i++) {
  const q = Q.generate(1 + (i % 3), 'visual', false);
  const solid = (q.html.match(/class="item"/g) || []).length;
  const gone = (q.html.match(/class="item gone"/g) || []).length;
  const plus = /class="op">\+</.test(q.html);
  if (plus) { if (solid !== q.answer) visualBad++; }
  else if (solid !== q.answer) visualBad++;
}
check('89', 'תרגיל חזותי — הציור תואם בדיוק לתשובה', visualBad === 0, visualBad + ' אי-התאמות');

// 93: לכל בעיה מילולית יש שאלה ברורה בסוף
let noQuestion = 0;
for (let i = 0; i < 2000; i++) {
  const q = Q.generate(1 + (i % 4) + 1, 'word', false);
  if (!/\?\s*$/.test(q.text.trim())) noQuestion++;
}
check('93', 'בעיה מילולית מסתיימת בשאלה', noQuestion === 0, noQuestion + ' בלי סימן שאלה');

console.log(JSON.stringify({ total: 60, failed: fails.length, fails }, null, 1));
