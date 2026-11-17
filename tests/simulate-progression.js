/* סימולציית קצב ההתקדמות בנתיב הכפל והחילוק.
   אינה בדיקה (לא נכללת ב-run-all): היא כלי לקבל החלטה, ומדפיסה כמה משימות לוקח לילד/ה
   מדומה להגיע לכל שלב, תחת כללי עלייה שונים.

   מחוללי התרגילים, תכנון המשימה ותפקוד הנתיבים הם הקוד האמיתי. מנוע ההתאמה משוכפל כאן
   כי הוא ב-app.js וקשור ל-DOM; אם הכללים ב-adaptiveUpdate משתנים, יש לעדכן גם כאן.

   הרצה:  node tests/simulate-progression.js [ניסויים=400] [משימות=40] */
global.window = {};
const R = require('path').join(__dirname, '..', 'js') + require('path').sep;
require(R + 'storage.js'); require(R + 'questions.js'); require(R + 'mult.js');
const Q = global.window.MG.Questions;

const TRIALS = +process.argv[2] || 400, MISSIONS = +process.argv[3] || 40;
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* פרופיל = כמה הילד/ה יודע/ת. known = הלוח הגבוה ביותר שנלמד בעל פה (2, 5 ו-10 תמיד ידועים).
   pKnown/pUnknown = ההסתברות לענות נכון בניסיון ראשון בתרגיל שמוכר/לא מוכר
   (בבחירה בין 4 אפשרויות, ניחוש טהור הוא 25%). */
const PROFILES = {
  'מושלם/ת (תמיד נכון)':       { known: 10, pKnown: 1.0,  pUnknown: 1.0,  core: 1.0 },
  'חזק/ה (מכיר/ה עד 10×10)':   { known: 10, pKnown: 0.95, pUnknown: 0.95, core: 0.92 },
  'בינוני/ת (מכיר/ה עד 6×6)':  { known: 6,  pKnown: 0.92, pUnknown: 0.4,  core: 0.88 },
  'מתחיל/ה (מכיר/ה עד 4×4)':   { known: 4,  pKnown: 0.9,  pUnknown: 0.3,  core: 0.85 },
  'מתקשה (50% בכל תרגיל)':     { known: 0,  pKnown: 0.5,  pUnknown: 0.5,  core: 0.6 }
};

/* האם התרגיל שייך למה שהילד/ה יודע/ת: כל הגורמים בתרגיל מוכרים */
function pCorrect(q, prof, strand) {
  if (strand === 'core') return prof.core;
  const eq = plain(q.explainHtml).match(/(\d+) [×:] (\d+) = (\d+)/);
  if (!eq) return prof.pKnown;                       // סוגריים וסימני התחלקות: אין לוח מסוים
  const ops = [+eq[1], +eq[2], +eq[3]].sort((a, b) => a - b).slice(0, 2);   // שני הקטנים הם הגורמים
  const known = ops.every(x => x <= prof.known || [0, 1, 2, 5, 10].includes(x));
  return known ? prof.pKnown : prof.pUnknown;
}

/* מנוע ההתאמה כמו ב-app.js, עם מספר ההצלחות הנדרש לעלייה כפרמטר */
function runOne(prof, need) {
  const stage = { core: 1, mult: 1 }, track = { core: { good: 0, recent: [] }, mult: { good: 0, recent: [] } };
  const reached = {}, log = { drops: 0, ups: 0 };
  let multQs = 0;
  for (let m = 1; m <= MISSIONS; m++) {
    const open = stage.core >= Q.STRANDS.mult.open ? ['mult'] : [];
    const levels = { core: stage.core, mult: stage.mult };
    const plan = Q.missionPlan(levels.core, 8, { open, stages: levels });
    for (const type of plan) {
      const strand = Q.strandOf(type), def = Q.STRANDS[strand];
      const q = Q.generate(Q.levelFor(type, levels), type, false);
      const ok = Math.random() < pCorrect(q, prof, strand);
      if (strand === 'mult') multQs++;
      const tr = track[strand];
      tr.recent.push(ok); if (tr.recent.length > 4) tr.recent.shift();
      if (ok) {
        tr.good++;
        if (tr.good >= need && stage[strand] < def.max) {
          stage[strand]++; levels[strand]++; tr.good = 0; log.ups++;
          if (strand === 'mult' && !reached[stage.mult]) reached[stage.mult] = { mission: m, qs: multQs };
        }
      } else {
        tr.good = 0;
        if (tr.recent.slice(-3).filter(v => !v).length >= 2) {
          if (stage[strand] > 1) { stage[strand]--; levels[strand]--; if (strand === 'mult') log.drops++; }
          tr.recent = [];
        }
      }
    }
  }
  return { reached, final: stage.mult, drops: log.drops };
}

const median = (a) => a.length ? a.sort((x, y) => x - y)[Math.floor(a.length / 2)] : null;
const pct = (a, p) => a.length ? a.sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : null;
const fmt = (v) => v == null ? '  —' : String(v).padStart(3);

for (const need of [3, 4, 5]) {
  console.log('\n=== עלייה אחרי ' + need + ' הצלחות ברצף (' + TRIALS + ' ניסויים, ' + MISSIONS + ' משימות) ===');
  console.log('פרופיל'.padEnd(30) + 'משימות עד שלב 3 / 4 / 6 (חציון)   בשלב 6 בסוף   שלב בסוף (חציון)   ירידות');
  for (const [name, prof] of Object.entries(PROFILES)) {
    const runs = Array.from({ length: TRIALS }, () => runOne(prof, need));
    const at = (st) => { const v = runs.map(r => r.reached[st] && r.reached[st].mission).filter(x => x != null); return [median(v), v.length / TRIALS]; };
    const [m3, f3] = at(3), [m4, f4] = at(4), [m6, f6] = at(6);
    console.log(name.padEnd(30) +
      (fmt(m3) + (f3 < 0.5 ? '*' : ' ') + '/' + fmt(m4) + (f4 < 0.5 ? '*' : ' ') + '/' + fmt(m6) + (f6 < 0.5 ? '*' : ' ')).padEnd(34) +
      (Math.round(100 * f6) + '%').padStart(8) + '      ' +
      String(median(runs.map(r => r.final))).padStart(8) + '          ' +
      (runs.reduce((s, r) => s + r.drops, 0) / TRIALS).toFixed(1));
  }
}
console.log('\n* = פחות ממחצית הניסויים הגיעו לשלב הזה, והחציון מבוסס רק על מי שהגיע');
console.log('משימות עד שלב: סופרים מתחילת המשחק, כולל המשימות שבהן הנתיב עדיין סגור (רמה כללית נמוכה מ-3)');
