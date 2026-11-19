/* ===================================================================
   avatars.js – דמויות שאין להן אימוג'י (קפיברה), מצוירות כ-SVG

   שאר הדמויות הן אימוג'י רגיל ונשמרות כטקסט. דמות מצוירת נשמרת בשם
   ('capybara'), וכל מקום שמציג דמות עובר דרך MG.Avatars.set
   או MG.Avatars.html כדי שהתצוגה תהיה אחידה בסרגל, בבית, במסלול ובסיכום.

   הציור בלי מילוי מדורג ובלי מזהים (id), כדי שאפשר יהיה להציג את אותה
   דמות כמה פעמים באותו דף בלי התנגשות. הגודל נקבע לפי גודל הגופן (ראו .face-svg ב-CSS).
   =================================================================== */
window.MG = window.MG || {};

(function (MG) {
  'use strict';

  var DRAWN = {
    /* קפיברה: ראש וכתפיים עם קו מתאר כהה, בסגנון קריקטורה חמודה. מה שמזהה אותה:
       ראש רחב עם לחיים, אוזניים קטנות, עיניים עצומות למחצה וחוטם כהה גדול.
       הכול בתוך קבוצה מוקטנת, כדי שהגודל יתאים לשאר הדמויות (אימוג'י). */
    capybara: {
      label: 'קפיברה',
      body:
        '<g transform="translate(7 9) scale(.86)" stroke="#5b2f1e" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">' +
        /* כתפיים */
        '<path d="M10 102 Q14 74 36 70 H64 Q86 74 90 102 Z" fill="#d4a06a"/>' +
        /* אוזניים */
        '<circle cx="24" cy="28" r="9.5" fill="#8a5a40"/><circle cx="76" cy="28" r="9.5" fill="#8a5a40"/>' +
        /* ראש רחב עם לחיים בולטות */
        '<path d="M50 21 C70 21 80 29 83 44 C92 50 94 63 87 71 C79 83 64 85 50 85 C36 85 21 83 13 71 C6 63 8 50 17 44 C20 29 30 21 50 21 Z" fill="#d4a06a"/>' +
        /* קווצת שיער */
        '<path d="M45 22 Q42 13 47 11 M50 21 Q51 11 56 12 M55 22 Q61 15 64 18" fill="none"/>' +
        /* לחיים ורודות */
        '<ellipse cx="24" cy="62" rx="7.5" ry="5" fill="#f08a8a" stroke="none" opacity=".55"/>' +
        '<ellipse cx="76" cy="62" rx="7.5" ry="5" fill="#f08a8a" stroke="none" opacity=".55"/>' +
        /* עיניים עצומות למחצה */
        '<path d="M27 47 Q33 50 40 47 M60 47 Q67 50 73 47" fill="none"/>' +
        /* חוטם כהה גדול */
        '<path d="M37 58 Q37 51 50 51 Q63 51 63 58 V70 Q63 80 50 80 Q37 80 37 70 Z" fill="#8a5e48"/>' +
        '<ellipse cx="43.5" cy="60" rx="2.8" ry="1.9" fill="#3b2218" stroke="none" transform="rotate(20 43.5 60)"/>' +
        '<ellipse cx="56.5" cy="60" rx="2.8" ry="1.9" fill="#3b2218" stroke="none" transform="rotate(-20 56.5 60)"/>' +
        '<path d="M50 65 V72 M45 74 Q50 77 55 74" fill="none" stroke-width="2.4"/>' +
        /* כפות */
        '<ellipse cx="29" cy="95" rx="10" ry="8" fill="#7d4f3a"/><ellipse cx="71" cy="95" rx="10" ry="8" fill="#7d4f3a"/>' +
        '</g>'
    }
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function isDrawn(face) { return Object.prototype.hasOwnProperty.call(DRAWN, face); }

  /* ה-HTML של דמות: SVG לדמות מצוירת, ואחרת הטקסט עצמו (אימוג'י) */
  function html(face) {
    if (!isDrawn(face)) return esc(face);
    var d = DRAWN[face];
    return '<svg class="face-svg" viewBox="0 0 100 100" role="img" aria-label="' + d.label + '">' + d.body + '</svg>';
  }

  /* מציב דמות באלמנט, ושומר את שמה ב-data-face (בדיקות ונגישות) */
  function set(el, face) {
    el.innerHTML = html(face);
    el.setAttribute('data-face', face);
  }

  MG.Avatars = { html: html, set: set, isDrawn: isDrawn };
})(window.MG);
