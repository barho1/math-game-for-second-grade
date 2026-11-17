/* בדיקות לוגיקה (ללא דפדפן) — מחוללי תרגילים, כלכלת המשחק, מדליות */
global.window = {};
const path = require('path');
const R = path.join(__dirname, '..', 'js') + path.sep;
require(R + 'storage.js'); require(R + 'questions.js'); require(R + 'core2.js'); require(R + 'mult.js'); require(R + 'place.js');
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
check('205', '15 מדליות', Rw.MEDALS.length === 15);

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


// ---------- נתיב כפל וחילוק ----------
const MT = Q.STRANDS.mult.types;
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
check('M1', 'חמשת סוגי הכפל רשומים בנתיב', ['mult', 'div', 'mword', 'brackets', 'divis'].every(t => MT.includes(t)), MT.join());
check('M2', 'לכל סוג יש כרטיס הסבר ותווית', MT.every(t => Q.HOW_TO[t] && Q.TYPE_LABELS[t]));
check('M3', 'strandOf מפריד בין הליבה לכפל', Q.strandOf('add') === 'core' && Q.strandOf('div') === 'mult' && Q.strandOf('nope') === 'core');
check('M4', 'levelFor מחזיר את השלב של הנתיב', Q.levelFor('mult', { core: 5, mult: 3 }) === 3 && Q.levelFor('add', { core: 5, mult: 3 }) === 5 && Q.levelFor('mult', { core: 5 }) === 1);

const mBad = {};
const mfail = (k, info) => { (mBad[k] = mBad[k] || []).push(info); };
for (let st = 1; st <= 6; st++) for (const t of MT) for (let i = 0; i < 800; i++) {
  const hint = i % 5 === 0, key = t + '@' + st;
  const q = Q.generate(st, t, hint);
  if (q.type !== t) mfail('type ' + key, q.type);
  if (q.input === 'choices') {
    const vs = q.choices.map(c => c.v);
    if (vs.length !== 4) mfail('אפשרויות ' + key, vs.length);
    if (new Set(vs).size !== vs.length) mfail('כפילות ' + key, vs.join());
    if (!vs.includes(q.answer)) mfail('התשובה חסרה ' + key, vs.join() + '/' + q.answer);
    if (vs.some(v => typeof v === 'number' && v < 0)) mfail('שלילי ' + key, vs.join());
  } else if (q.input === 'pad') {
    if (!(q.answer >= 0 && q.answer <= 999)) mfail('pad ' + key, q.answer);
  } else mfail('input ' + key, q.input);
  for (const f of ['spoken', 'hintSpoken', 'explainSpoken']) {
    if (!q[f]) mfail('ללא הקראה ' + f + ' ' + key, '');
    else if (/\d/.test(q[f])) mfail('ספרה בהקראה ' + f + ' ' + key, q[f]);
  }
  // נכונות: התרגיל המפורש בהסבר חייב להתאים לתשובה
  const ex = plain(q.explainHtml);
  let m;
  if (t === 'mult' || t === 'mword') {
    m = ex.match(/(\d+) × (\d+) = (\d+)/);
    if (m && +m[1] * +m[2] !== +m[3]) mfail('כפל שגוי ' + key, ex);
    if (t === 'mult' && m && !/[?]/.test(plain(q.html)) && +m[3] !== q.answer) mfail('כפל מול תשובה ' + key, ex + '/' + q.answer);
  }
  if (t === 'div') {
    m = ex.match(/(\d+) : (\d+) = (\d+)/);
    if (m && (+m[2] === 0 || +m[1] % +m[2] !== 0 || +m[1] / +m[2] !== +m[3])) mfail('חילוק שגוי ' + key, ex);
  }
  if (t === 'brackets') {
    m = ex.match(/^(.*?) = (\d+)/);
    const v = m && Function('return ' + m[1].replace(/×/g, '*').replace(/−/g, '-'))();
    if (!m || v !== +m[2] || v !== q.answer) mfail('סוגריים ' + key, ex);
    if (!/\(/.test(plain(q.html))) mfail('בלי סוגריים ' + key, q.html);
  }
  if (t === 'divis') {
    const d = +q.text.match(/ב-(\d+)/)[1];
    if (q.answer % d !== 0) mfail('התחלקות ' + key, q.text + q.answer);
    if (q.choices.filter(c => c.v % d === 0).length !== 1) mfail('יותר ממתחלק אחד ' + key, q.choices.map(c => c.v).join());
  }
  const nums = (plain(q.html) + ' ' + (q.text || '')).match(/\d+/g) || [];
  if (Math.max(0, ...nums.map(Number)) > 100) mfail('מעל 100 ' + key, nums.join());
}
check('M5', 'כל תרגילי הכפל והחילוק תקינים (שלבים 1-6)', Object.keys(mBad).length === 0,
  JSON.stringify(Object.fromEntries(Object.entries(mBad).slice(0, 4).map(([k, v]) => [k, [v.length, v[0]]]))));

// המערך המצויר תמיד משקף את המכפלה האמיתית, ולעולם אינו מטעה
let arrayBad = 0, arrayChecked = 0;
for (let i = 0; i < 6000; i++) {
  const q = Q.generate(1 + (i % 6), 'mult', i % 3 === 0), grid = q.html.match(/class="array[^>]*>([\s\S]*?)<\/div>/);
  if (!grid) continue;
  const cells = (grid[1].match(/<span>/g) || []).length;
  const m = plain(q.explainHtml).match(/(\d+) × (\d+) = (\d+)/);
  arrayChecked++;
  if (!m || cells !== +m[3]) arrayBad++;
}
check('M5b', 'מערך הכפל מכיל בדיוק את מספר הפריטים של המכפלה', arrayChecked > 500 && arrayBad === 0, arrayChecked + ' נבדקו, ' + arrayBad + ' לא תואמים');

// התקדמות לפי שלב: מה מופיע ומה לא
function productsAt(st, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const q = Q.generate(st, 'mult', false), m = plain(q.html).match(/^(\d+) × (\d+) = \?/);
    if (m) out.push([+m[1], +m[2]]);
  }
  return out;
}
const s1 = productsAt(1, 2000);
check('M6', 'שלב 1 — רק לוחות 2 ו-10 (ועוד 0 ו-1)', s1.length > 0 && s1.every(([a, b]) => [a, b].some(x => x === 2 || x === 10)), 'נמצאו ' + s1.filter(([a, b]) => ![a, b].some(x => x === 2 || x === 10)).slice(0, 3));
check('M7', 'שלב 1 — כולל כפל באפס ובאחד', s1.some(([a, b]) => a === 0 || b === 0) && s1.some(([a, b]) => a === 1 || b === 1));
const s4 = productsAt(4, 3000);
check('M8', 'שלב 4 — עד 6×6 (או לוחות 2, 5, 10)', s4.every(([a, b]) => (a <= 6 && b <= 6) || [a, b].some(x => [2, 5, 10].includes(x))), 'חורג: ' + s4.filter(([a, b]) => !((a <= 6 && b <= 6) || [a, b].some(x => [2, 5, 10].includes(x)))).slice(0, 3));
const s5 = productsAt(5, 3000);
check('M9', 'שלב 5 — מגיע לגורמים 7 עד 10', s5.some(([a, b]) => Math.max(a, b) >= 8) && s5.some(([a, b]) => a * b === 100 || a * b === 81));
check('M10', 'שלב 3 — מופיעים לוחות 3 ו-4', productsAt(3, 3000).some(([a, b]) => [a, b].some(x => x === 3)) && productsAt(3, 3000).some(([a, b]) => [a, b].some(x => x === 4)));

check('M11', 'שלב 1 — אין מקלדת מספרים', Array.from({ length: 800 }, () => Q.generate(1, 'mult', false)).every(q => q.input === 'choices'));
check('M12', 'שלב 5 — לפעמים מקלידים', Array.from({ length: 800 }, () => Q.generate(5, 'mult', false)).some(q => q.input === 'pad'));
check('M13', 'במצב רמז לא מקלידים', Array.from({ length: 800 }, () => Q.generate(6, 'mult', true)).every(q => q.input === 'choices'));
check('M14', 'חילוק — אף פעם לא בלי שארית ולא ב-0', Array.from({ length: 3000 }, () => plain(Q.generate(1 + Math.floor(Math.random() * 6), 'div', false).explainHtml)).every(t => { const m = t.match(/(\d+) : (\d+) = (\d+)/); return !m || (+m[2] > 0 && +m[1] % +m[2] === 0); }));
check('M15', 'סימן החילוק הוא נקודתיים, ולא ÷', Array.from({ length: 400 }, () => Q.generate(3, 'div', false)).every(q => !/÷/.test(q.html + q.explainHtml) && / : |class="div"/.test(q.html)));
check('M16', 'חילוק מוקרא "חלקי" וסוגריים "בסוגריים"', Q.generate(2, 'div', false).spoken.includes('חלקי') &&
  Array.from({ length: 50 }, () => Q.generate(6, 'brackets', false)).every(q => q.spoken.includes('בסוגריים')));
check('M17', 'הסבר מוקרא כולל את שורות הפתרון (לא רק את המשפט הפותח)', Array.from({ length: 400 }, () => Q.generate(6, 'mult', true).explainSpoken).some(t => /אפשר לפרק/.test(t) && (t.match(/שווה/g) || []).length >= 3));

// בעיות מילוליות: התאמת מין לשם העצם
const CFEM = ['קופסאות', 'שקיות', 'צלחות', 'עוגיות', 'ביצים'];
let genderBad = 0, genderChecked = 0;
for (let i = 0; i < 3000; i++) {
  const q = Q.generate(4, 'mword', false);
  // ספרה לפני שם עצם נקבי חייבת להיות בצורת נקבה ("שלוש עוגיות", לא "שלושה עוגיות").
  // "עשרה" אינה ברשימה: היא גם סוף של "חמש עשרה", שהיא צורת הנקבה הנכונה.
  const mm = q.spoken.match(/(שלושה|ארבעה|חמישה|שישה|שבעה|תשעה|שני) (קופסאות|שקיות|צלחות|עוגיות|ביצים)/);
  if (CFEM.some(n => q.spoken.includes(n))) genderChecked++;
  if (mm) genderBad++;
}
check('M18', 'בעיות כפל — מין תקין לפני שם עצם נקבי', genderChecked > 200 && genderBad === 0, genderChecked + ' נבדקו, ' + genderBad + ' שגויים');
check('M19', 'בעיות כפל מסתיימות בשאלה', Array.from({ length: 1000 }, () => Q.generate(4, 'mword', false)).every(q => /\?\s*$/.test(q.text.trim())));

// ---------- תכנון משימה לפי נתיבים ----------
const countMult = (plan) => plan.filter(t => Q.strandOf(t) === 'mult').length;
let planOk = true, planInfo = '';
for (let i = 0; i < 300; i++) {
  const none = Q.missionPlan(2, 8), two = Q.missionPlan(3, 8, { open: ['mult'], stages: { mult: 2 } }),
        bonus = Q.missionPlan(3, 4, { open: ['mult'], stages: { mult: 2 } });
  if (none.length !== 8 || countMult(none) !== 0) { planOk = false; planInfo = 'ליבה בלבד: ' + none; }
  if (two.length !== 8 || countMult(two) !== 3) { planOk = false; planInfo = 'משימה רגילה: ' + two; }
  if (bonus.length !== 4 || countMult(bonus) !== 2) { planOk = false; planInfo = 'אתגר: ' + bonus; }
  if (!two.filter(t => Q.strandOf(t) === 'mult').every(t => Q.typesForStage('mult', 2).includes(t))) { planOk = false; planInfo = 'סוג שלא נפתח בשלב: ' + two; }
}
check('P1', 'משימה: 8 תרגילים, 3 מהם כפל וחילוק כשהנתיב פתוח, אפס כשסגור', planOk, planInfo);
check('P2', 'משימה קצרה מאוד נשארת עם תרגיל ליבה אחד', Q.missionPlan(3, 1, { open: ['mult'], stages: { mult: 1 } }).length === 1 &&
  Q.strandOf(Q.missionPlan(3, 1, { open: ['mult'], stages: { mult: 1 } })[0]) === 'core');
check('P3', 'שלב 1 מכיל כפל בלבד', Q.typesForStage('mult', 1).join() === 'mult');
check('P4', 'שלב 6 מכיל סוגריים ושלב 3 לא', Q.typesForStage('mult', 6).includes('brackets') && !Q.typesForStage('mult', 3).includes('brackets'));
check('P5', 'הנתיב נפתח ברמה 3 או בבחירת ההורה', !Q.isStrandOpen('mult', 2, {}) && Q.isStrandOpen('mult', 3, {}) && Q.isStrandOpen('mult', 1, { mult: true }) && !Q.isStrandOpen('core', 5, {}));


// ---------- נתיב מספרים וערך מקום ----------
const PT = Q.STRANDS.place.types;
check('V1', 'שמונת סוגי ערך המקום רשומים', ['place', 'words', 'chart', 'line', 'parity', 'pseq', 'pcompare', 'neighbors'].every(t => PT.includes(t)), PT.join());
check('V2', 'לכל סוג יש כרטיס הסבר ותווית', PT.every(t => Q.HOW_TO[t] && Q.TYPE_LABELS[t]));
check('V3', 'הנתיב נפתח ברמה 5', !Q.isStrandOpen('place', 4, {}) && Q.isStrandOpen('place', 5, {}) && Q.isStrandOpen('place', 1, { place: true }));
check('V4', 'שלב 1 ללא לוח המאה, מילים והשוואה; שלב 3 עם השוואה',
  !['chart', 'words', 'line', 'pcompare'].some(t => Q.typesForStage('place', 1).includes(t)) &&
  Q.typesForStage('place', 2).includes('chart') && !Q.typesForStage('place', 2).includes('pcompare') && Q.typesForStage('place', 3).includes('pcompare'));

// מילות מספר עד 1000
const NW = [[100, 'מאה'], [101, 'מאה ואחת'], [110, 'מאה ועשר'], [115, 'מאה וחמש עשרה'], [120, 'מאה ועשרים'], [123, 'מאה עשרים ושלוש'],
  [200, 'מאתיים'], [202, 'מאתיים ושתיים'], [300, 'שלוש מאות'], [347, 'שלוש מאות ארבעים ושבע'], [409, 'ארבע מאות ותשע'],
  [550, 'חמש מאות וחמישים'], [999, 'תשע מאות תשעים ותשע'], [1000, 'אלף']];
check('V5', 'מילות מספר עד 1000', NW.every(([n, w]) => Q.numWord(n) === w), NW.filter(([n, w]) => Q.numWord(n) !== w).map(([n]) => n + '=' + Q.numWord(n)).join());
check('V6', 'מין זכר ונקבה במאות', Q.numWord(347, 'm') === 'שלוש מאות ארבעים ושבעה' && Q.numWord(105, 'm') === 'מאה וחמישה' && Q.numWord(115, 'm') === 'מאה וחמישה עשר');
check('V7', 'מעל 1000 נשאר כספרה', Q.numWord(1001) === '1001' && Q.numWord(-1) === '-1');

const vBad = {}, vfail = (k, i) => { (vBad[k] = vBad[k] || []).push(i); };
const nums = (t) => (t.match(/\d+/g) || []).map(Number);
for (let st = 1; st <= 4; st++) for (const t of PT) for (let i = 0; i < 700; i++) {
  const key = t + '@' + st, q = Q.generate(st, t, i % 4 === 0);
  if (q.type !== t) vfail('type ' + key, q.type);
  const vs = q.choices.map(c => c.v), signs = vs.includes('>');
  if (vs.length !== (signs ? 3 : 4)) vfail('אפשרויות ' + key, vs.join());
  if (new Set(vs).size !== vs.length) vfail('כפילות ' + key, vs.join());
  if (!vs.includes(q.answer)) vfail('התשובה חסרה ' + key, vs.join() + '/' + q.answer);
  if (vs.some(v => typeof v === 'number' && (v < 0 || v > 1000))) vfail('טווח ' + key, vs.join());
  for (const f of ['spoken', 'hintSpoken', 'explainSpoken']) {
    if (!q[f]) vfail('ללא הקראה ' + f + ' ' + key, ''); else if (/\d/.test(q[f])) vfail('ספרה בהקראה ' + f + ' ' + key, q[f]);
  }
  const txt = plain(q.html), a = q.answer;
  if (t === 'words') { if (Q.numWord(a) !== txt) vfail('מילים ' + key, txt + '/' + a); }
  if (t === 'parity') {
    const even = /^איזה מספר זוגי/.test(q.text);
    if ((a % 2 === 0) !== even || vs.filter(v => (v % 2 === 0) === even).length !== 1) vfail('זוגיות ' + key, q.text + vs.join());
  }
  if (t === 'neighbors') {
    let m;
    if ((m = q.text.match(/(גדול|קטן) ב-(\d+) מ-(\d+)/))) { if (a !== (m[1] === 'גדול' ? +m[3] + +m[2] : +m[3] - +m[2])) vfail('שכנים ' + key, q.text + '/' + a); }
    else if ((m = q.text.match(/בין (\d+) ל-(\d+)/))) { if (!(+m[2] - +m[1] === 2 && a === +m[1] + 1)) vfail('בין ' + key, q.text + '/' + a); }
    else vfail('ניסוח ' + key, q.text);
  }
  if (t === 'pcompare') {
    if (signs) {
      const m = txt.match(/^(\d+) \? (\d+)$/), x = +m[1], y = +m[2];
      if (a !== (x > y ? '>' : x < y ? '<' : '=')) vfail('סימן ' + key, txt + '/' + a);
    } else {
      const big = /הגדול/.test(q.text);
      if (a !== (big ? Math.max(...vs) : Math.min(...vs))) vfail('קיצון ' + key, q.text + vs.join());
    }
  }
  if (t === 'pseq') {
    const seqNums = [...q.explainHtml.matchAll(/<span[^>]*>(\d+)<\/span>/g)].map(x => +x[1]);
    const hit = q.explainHtml.match(/<span class="hit">(\d+)<\/span>/);
    const diffs = new Set(seqNums.slice(1).map((v, i) => v - seqNums[i]));
    if (seqNums.length !== 5 || diffs.size !== 1 || !hit || +hit[1] !== a || seqNums.some(v => v < 0 || v > 1000)) vfail('סדרה ' + key, seqNums.join());
  }
  if (t === 'line') {
    const ticks = [...q.html.matchAll(/left:([\d.]+)%"><i><\/i><em>([^<]*)<\/em>/g)].map(x => [+x[1], x[2]]);
    const lab = ticks.filter(([, l]) => /^\d+$/.test(l)), mark = ticks.find(([, l]) => l === '?');
    const lo = +lab[0][1], hi = +lab[lab.length - 1][1];
    if (!mark || Math.abs(lo + (mark[0] / 100) * (hi - lo) - a) > 0.001 || lab[0][0] !== 0 || lab[lab.length - 1][0] !== 100) vfail('ישר ' + key, JSON.stringify([lo, hi, mark, a]));
  }
  if (t === 'chart') {
    if (/<table/.test(q.html)) {
      const rows = [...q.html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map(c => c[1]));
      let base = null, ok2 = true, blank = null;
      rows.forEach((r, ri) => r.forEach((c, ci) => { if (c === '?') blank = [ri, ci]; else { const b = +c - ri * 10 - ci; if (base === null) base = b; else if (b !== base) ok2 = false; } }));
      if (!ok2 || !blank || base + blank[0] * 10 + blank[1] !== a) vfail('לוח ' + key, JSON.stringify(rows) + '/' + a);
    } else {
      const m = q.text.match(/ב-(\d+) וזזים: (\d+) למטה ו-(\d+) ימינה/);
      if (!m || +m[1] + 10 * +m[2] + +m[3] !== a || a > 100) vfail('תנועה ' + key, q.text + '/' + a);
    }
  }
  if (t === 'place') {
    const hi = q.html.match(/class="equation bignum">(.*)<\/div>/);
    if (hi) {                                          // ערך הספרה המסומנת
      const str = hi[1].replace(/<[^>]+>/g, ''), idx = hi[1].replace(/<span class="hi">/, '\u0001').replace(/<[^>]+>/g, '').indexOf('\u0001');
      if (+str[idx] * Math.pow(10, str.length - 1 - idx) !== a) vfail('ספרה מסומנת ' + key, hi[1] + '/' + a);
    } else if (/^\d+ = /.test(txt)) {                  // השלמת פירוק
      const m = txt.match(/^(\d+) = (.*)$/), parts = m[2].split(' + '), total = +m[1];
      const sum = parts.reduce((x, p2) => x + (p2 === '?' ? a : +p2), 0);
      if (sum !== total) vfail('פירוק ' + key, txt + '/' + a);
    } else {                                           // הרכבה: מאות, עשרות, יחידות
      const ex = plain(q.explainHtml).match(/^([\d +]+) = (\d+)/);
      if (!ex || ex[1].split('+').reduce((x, y) => x + +y, 0) !== +ex[2] || +ex[2] !== a) vfail('הרכבה ' + key, plain(q.explainHtml).slice(0, 50) + '/' + a);
    }
  }
}
check('V8', 'כל תרגילי ערך המקום תקינים (שלבים 1-4)', Object.keys(vBad).length === 0,
  JSON.stringify(Object.fromEntries(Object.entries(vBad).slice(0, 4).map(([k, v]) => [k, [v.length, v[0]]]))));
check('V9', 'שלב 1 נשאר עד 100 ושלב 3 מגיע ל-3 ספרות', (() => {
  const mx = (st) => Math.max(...Array.from({ length: 1500 }, () => { const q = Q.generate(st, pick(['place', 'pseq', 'neighbors', 'parity']), false); return Math.max(...nums(plain(q.html) + ' ' + (q.text || ''))); }));
  return mx(1) <= 100 && mx(3) >= 500;
})());
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
check('V10', 'בשלב 4 יש מספרים עם אפס באמצע או בסוף (שומר מקום)', Array.from({ length: 3000 }, () => Q.generate(4, 'words', false).answer).some(n => n % 100 !== 0 && (Math.floor(n / 10) % 10 === 0 || n % 10 === 0)));

// תכנון משימה כשכל הנתיבים פתוחים
{
  const full = Q.missionPlan(5, 8, { open: ['mult', 'place'], stages: { mult: 2, place: 2 } });
  const cnt = (strand) => full.filter(t => Q.strandOf(t) === strand).length;
  check('V11', 'משימה עם שני נתיבים: 4 ליבה, 3 כפל, 1 ערך מקום', full.length === 8 && cnt('core') === 4 && cnt('mult') === 3 && cnt('place') === 1, full.join());
  const one = Q.missionPlan(5, 1, { open: ['mult', 'place'], stages: {} });
  check('V12', 'משימה של תרגיל אחד נשארת בליבה', one.length === 1 && Q.strandOf(one[0]) === 'core', one.join());
  const bonus = Q.missionPlan(5, 4, { open: ['mult', 'place'], stages: {} });
  check('V13', 'אתגר הכוכב עם שני נתיבים: 4 תרגילים ולפחות אחד בליבה', bonus.length === 4 && bonus.some(t => Q.strandOf(t) === 'core'), bonus.join());
}


// ---------- שלב 3: חיבור וחיסור עמוק (רמות 6-8) ----------
const ev = (t) => Function('return ' + t.replace(/×/g, '*').replace(/−/g, '-').replace(/:/g, '/'))();
check('C1', 'הליבה מגיעה עד רמה 8', Q.STRANDS.core.max === 8);
check('C2', 'סוגי הליבה החדשים נפתחים לפי רמה', ['vertical', 'tf', 'inverse', 'word2'].every(t => Q.typesForLevel(6).includes(t) && !Q.typesForLevel(5).includes(t)) &&
  Q.typesForLevel(7).includes('estimate') && !Q.typesForLevel(6).includes('estimate'));
check('C3', 'כל סוג חדש רשום עם הסבר ותווית', ['vertical', 'tf', 'estimate', 'inverse', 'word2'].every(t => Q.HOW_TO[t] && Q.TYPE_LABELS[t]));
check('C4', 'טיפוס חדש שייך לליבה', Q.strandOf('vertical') === 'core' && Q.strandOf('word2') === 'core');

// חיבור וחיסור ברמות 6-8
{
  const cb = {}, cf = (k, i) => { (cb[k] = cb[k] || []).push(i); };
  let carry6 = 0, borrow6 = 0, over100at7 = false, round7 = false, tens8 = false, big8 = false, n6 = 0;
  for (let lv = 6; lv <= 8; lv++) for (let i = 0; i < 1500; i++) {
    for (const t of ['add', 'sub']) {
      const q = Q.generate(lv, t, i % 5 === 0), m = plain(q.html).match(/^(\d+) [+−] (\d+) = \?/);
      if (!m) { cf('פורמט ' + t + lv, plain(q.html)); continue; }
      const a = +m[1], b = +m[2], want = t === 'add' ? a + b : a - b;
      if (want !== q.answer) cf('תוצאה ' + t + lv, a + ' ' + t + ' ' + b);
      if (want < 0 || want > 1000 || a > 1000 || b > 1000) cf('טווח ' + t + lv, a + ',' + b);
      const vs = q.choices.map(c => c.v);
      if (vs.length !== 4 || new Set(vs).size !== 4 || !vs.includes(q.answer) || vs.some(v => v < 0 || v > 1000)) cf('אפשרויות ' + t + lv, vs.join());
      if (/\d/.test(q.spoken + q.hintSpoken + q.explainSpoken)) cf('ספרה בהקראה ' + t + lv, q.spoken + '|' + q.hintSpoken);
      if (/class="(tenframe|frames|qty-bundles)/.test(q.html + q.hintHtml)) cf('ציור במספר גדול ' + t + lv, '');
      if (lv === 6) { n6++; if (a > 100 || b < 11) cf('רמה 6 טווח ' + t, a + ',' + b); if (t === 'add' && (a % 10) + (b % 10) >= 10) carry6++; if (t === 'sub' && (a % 10) < (b % 10)) borrow6++; }
      if (lv === 7 && t === 'add' && a + b > 100) over100at7 = true;
      if (lv === 7 && t === 'add' && a % 10 === 0 && (b % 10 === 0)) round7 = true;
      if (lv === 8 && t === 'add' && a >= 100 && b < 100) tens8 = true;
      if (lv === 8 && t === 'sub' && a >= 100) big8 = true;
    }
  }
  check('C5', 'חיבור וחיסור ברמות 6-8 תקינים', Object.keys(cb).length === 0, JSON.stringify(Object.fromEntries(Object.entries(cb).slice(0, 3).map(([k, v]) => [k, [v.length, v[0]]]))));
  check('C6', 'רמה 6: כל חיבור עם חציית עשרת וכל חיסור עם פריטה', carry6 > 0 && borrow6 > 0 && carry6 + borrow6 === n6, carry6 + '+' + borrow6 + ' מתוך ' + n6);
  check('C7', 'רמה 7: חיבור מעל 100 ועשרות שלמות כמו 240+30', over100at7 && round7);
  check('C8', 'רמה 8: תלת-ספרתי עם חד/דו-ספרתי, וחיסור תלת-ספרתי', tens8 && big8);
  check('C9', 'סוגים ישנים נשארים בטווח רמה 5 גם ברמות 6-8', (() => {
    for (let i = 0; i < 1500; i++) {
      const t = pick(['compare', 'sequence', 'missing', 'visual', 'count']), q = Q.generate(6 + (i % 3), t, false);
      if (Math.max(...nums(plain(q.html) + ' ' + (q.text || '')), 0) > 100) return false;
    }
    return true;
  })());
}

// סוגי הליבה החדשים
{
  const nb = {}, nf = (k, i) => { (nb[k] = nb[k] || []).push(i); };
  const NEWT = ['vertical', 'tf', 'estimate', 'inverse', 'word2'];
  const rowsOf = (html) => [...html.matchAll(/<div class="vr"><i>([^<]*)<\/i>((?:<b[^>]*>[^<]*<\/b>)*)<\/div>/g)].map(r => ({ sign: r[1], cells: [...r[2].matchAll(/<b([^>]*)>([^<]*)<\/b>/g)].map(c => ({ blank: /blank/.test(c[1]), ch: c[2] })) }));
  for (let lv = 6; lv <= 8; lv++) for (const t of NEWT) {
    if (t === 'estimate' && lv < 7) continue;
    for (let i = 0; i < 700; i++) {
      const key = t + '@' + lv, q = Q.generate(lv, t, i % 4 === 0);
      if (q.type !== t) nf('type ' + key, q.type);
      if (q.input === 'choices') {
        const vs = q.choices.map(c => c.v), two = vs.includes('T') || vs.includes('A'), signs = vs.includes('>');
        if (vs.length !== (two ? 2 : signs ? 3 : 4) || new Set(vs).size !== vs.length || !vs.includes(q.answer)) nf('אפשרויות ' + key, vs.join() + '/' + q.answer);
      } else if (!(q.input === 'pad' && q.answer >= 0 && q.answer <= 999)) nf('קלט ' + key, q.input);
      for (const f of ['spoken', 'hintSpoken', 'explainSpoken']) { if (!q[f]) nf('ללא הקראה ' + f + ' ' + key, ''); else if (/\d/.test(q[f])) nf('ספרה בהקראה ' + f + ' ' + key, q[f]); }
      const txt = plain(q.html), ex = plain(q.explainHtml);
      if (t === 'vertical') {
        const rows = rowsOf(q.html), num = (r) => +r.cells.map(c => c.ch).join('') || 0;
        const a = num(rows[0]), b = num(rows[1]), minus = rows[1].sign === '−', res = minus ? a - b : a + b;
        if (rows.length !== 3) nf('שורות ' + key, rows.length);
        else if (q.input === 'pad' || q.input === 'choices' && rows[2].cells.every(c => c.blank || c.ch === '')) { if (res !== q.answer) nf('מאונך תוצאה ' + key, a + (minus ? '-' : '+') + b + '/' + q.answer); }
        else { const bi = rows[2].cells.findIndex(c => c.blank); const digs = String(res); const idx = bi - (rows[2].cells.length - digs.length); if (+digs[idx] !== q.answer) nf('ספרה חסרה ' + key, a + ',' + b + ',' + q.answer); }
        if (minus ? (a % 10 >= b % 10) : (a % 10 + b % 10 < 10)) nf('בלי פריטה/חציה ' + key, a + (minus ? '-' : '+') + b);
      }
      if (t === 'tf') {
        const m = txt.match(/^(.*) = (\d+)$/); if (!m || (ev(m[1]) === +m[2]) !== (q.answer === 'T')) nf('נכון/לא נכון ' + key, txt + '/' + q.answer);
      }
      if (t === 'estimate') {
        if (/^א /.test(txt)) {
          const m = txt.match(/^א (.*?) ב (.*)$/), x = ev(m[1]), y = ev(m[2]), big = /גדולה/.test(q.text);
          if ((x > y) === big ? q.answer !== 'A' : q.answer !== 'B') nf('איזה גדול ' + key, txt + '/' + q.answer);
        } else {
          const m = txt.match(/^(.*?) \? (.*)$/), x = ev(m[1]), y = ev(m[2]);
          if (q.answer !== (x > y ? '>' : x < y ? '<' : '=')) nf('סימן ' + key, txt + '/' + q.answer);
        }
      }
      if (t === 'inverse') {
        // כל משוואה ב-div משלה; האחרונה היא השאלה, והראשונה (אם יש שתיים) נתון נכון
        const eqs = [...q.html.matchAll(/<div class="equation">(.*?)<\/div>/g)].map(e => e[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
        const ask = eqs[eqs.length - 1].split(' = ')[0];
        if (eqs.length === 2) { const [l, r] = eqs[0].split(' = '); if (ev(l) !== +r) nf('נתון שגוי ' + key, txt); }
        if (ev(ask) !== q.answer) nf('הפוכות ' + key, txt + '/' + q.answer);
      }
      if (t === 'word2') {
        const lines = [...q.explainHtml.matchAll(/<div class="equation step">(.*?)<\/div>/g)].map(e => e[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
        const [l, r] = (lines[lines.length - 1] || '').split(' = ');
        if (!r || +r !== q.answer || ev(l) !== q.answer) nf('בעיה ' + key, ex.slice(0, 80) + '/' + q.answer);
        if (q.answer < 0 || q.answer > 250) nf('בעיה טווח ' + key, q.answer);
      }
    }
  }
  check('C10', 'כל סוגי הליבה החדשים נכונים (רמות 6-8)', Object.keys(nb).length === 0, JSON.stringify(Object.fromEntries(Object.entries(nb).slice(0, 4).map(([k, v]) => [k, [v.length, v[0]]]))));
  // מין דקדוקי ושמות בבעיות מורכבות
  let gb = 0, gc = 0;
  for (let i = 0; i < 3000; i++) { const q = Q.generate(8, 'word2', false); if (/עוגיות|מכוניות|דבורים|חלליות|פטריות|צפרדעים|מתנות/.test(q.spoken)) { gc++; if (/(שלושה|ארבעה|חמישה|שישה|שבעה|תשעה|שני) (עוגיות|מכוניות|דבורים|חלליות|פטריות|צפרדעים|מתנות)/.test(q.spoken)) gb++; } }
  check('C11', 'בעיות מורכבות: מין תקין לפני שם עצם נקבי', gc > 50 && gb === 0, gc + ' נבדקו, ' + gb + ' שגויים');
  check('C12', 'בעיות מורכבות: רמה 6 בלי איסוף ובלי שני צעדים; רמה 8 עם שניהם',
    Array.from({ length: 800 }, () => Q.generate(6, 'word2', false)).every(q => !/ק"ג|מחברת|ואז/.test(q.text)) &&
    Array.from({ length: 800 }, () => Q.generate(8, 'word2', false)).some(q => /ק"ג|מחברת/.test(q.text)) &&
    Array.from({ length: 800 }, () => Q.generate(8, 'word2', false)).some(q => /ואז/.test(q.text)));
  check('C13', 'ההקראה קוראת משבצת ריקה "כמה"', /כמה/.test(Array.from({ length: 300 }, () => Q.generate(8, 'word2', false).hintSpoken).find(h => /כמה/.test(h)) || ''));
}

// ---------- הגירה של שמירות ישנות ----------
// טוענים מחדש את storage.js מול localStorage מדומה שמכיל שמירה מלפני הנתיבים
{
  const realWindow = global.window;
  const KEY = 'mg-number-journey-v1', store = {};
  const load = (save) => {
    store[KEY] = JSON.stringify(save);
    global.window = { localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } } };
    delete require.cache[require.resolve(R + 'storage.js')];
    require(R + 'storage.js');
    return global.window.MG.Storage.load();
  };
  const old = load({ version: 1, progress: { level: 4, stars: 20, coins: 7 }, owned: ['hat-top'] });
  check('G1', 'שמירה ישנה נטענת עם שלב 1 בכפל, בלי לאבד נתונים',
    old.progress.skills && old.progress.skills.mult === 1 && old.progress.level === 4 && old.progress.stars === 20 && old.owned[0] === 'hat-top',
    JSON.stringify(old.progress));
  check('G2', 'שמירה ישנה — אין פתיחה מוקדמת של נתיבים', JSON.stringify(old.progress.opened) === '{}');
  const kept = load({ version: 1, progress: { level: 5, skills: { mult: 4 }, opened: { mult: true } } });
  check('G3', 'שלב כפל שנשמר נשמר', kept.progress.skills.mult === 4 && kept.progress.opened.mult === true);
  const fresh = load(null);
  check('G4', 'התחלה חדשה: רמה 1 ושלב 1', fresh.progress.level === 1 && fresh.progress.skills.mult === 1 && JSON.stringify(fresh.progress.opened) === '{}');
  global.window = realWindow;
}

console.log(JSON.stringify({ total: 60, failed: fails.length, fails }, null, 1));
