/* מריץ את כל חבילות הבדיקה ומסכם. דורש שרת מקומי על פורט 8123:
   npx http-server . -p 8123 */
const { execFileSync } = require('child_process');
const path = require('path');

const SUITES = [
  ['logic.js', 'לוגיקת התרגילים והכלכלה (ללא דפדפן)'],
  ['ui1.js', 'פרופיל, דמות, מפת עולמות וניווט'],
  ['ui2.js', 'טעויות ורמזים, קלט וכלכלה'],
  ['ui3.js', 'חנות, אוסף ומדליות'],
  ['ui4.js', 'אזור הורים והגבלת זמן'],
  ['ui5.js', 'רספונסיביות, שמע, נגישות ואחסון'],
  ['ui6.js', 'זרימות מלאות, טקסטים וביצועים'],
  ['ui7.js', 'מנוע ההתאמה האדפטיבית'],
  ['ui8.js', 'תזמון מדליות והפתעות'],
  ['ui9.js', 'אופליין, PWA ופרטי עיצוב'],
  ['ui10.js', 'עבודה אופליין דרך Service Worker'],
];

let totalFailed = 0;
for (const [file, title] of SUITES) {
  process.stdout.write('▶ ' + title + ' … ');
  let out = '';
  try {
    out = execFileSync('node', [path.join(__dirname, file)], { encoding: 'utf8', timeout: 900000 });
  } catch (e) {
    console.log('שגיאת הרצה');
    console.log((e.stdout || '') + (e.stderr || '').slice(0, 500));
    totalFailed++;
    continue;
  }
  try {
    const json = JSON.parse(out.slice(out.indexOf('{')));
    totalFailed += json.failed;
    console.log(json.failed === 0 ? 'עבר ✓' : 'נכשלו ' + json.failed);
    (json.fails || []).forEach(f => console.log('   ✗ [' + f.id + '] ' + (f.d || f.desc) + (f.x || f.extra ? ' — ' + (f.x || f.extra) : '')));
  } catch (e) {
    console.log('פלט לא צפוי');
    console.log(out.slice(-400));
    totalFailed++;
  }
}
console.log('\n' + (totalFailed === 0 ? '✅ כל הבדיקות עברו' : '❌ סך כשלים: ' + totalFailed));
process.exit(totalFailed === 0 ? 0 : 1);
