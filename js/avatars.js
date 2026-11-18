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
    /* קפיברה: פרצוף עגול בסגנון האימוג'י של שאר הדמויות. מה שמזהה אותה הוא
       החוטם הרחב והכהה על לוע בהיר, אוזניים קטנות, ועיניים קטנות וגבוהות. */
    capybara: {
      label: 'קפיברה',
      body:
        '<ellipse cx="21" cy="29" rx="8" ry="6" fill="#7d5030"/><ellipse cx="79" cy="29" rx="8" ry="6" fill="#7d5030"/>' +
        '<rect x="8" y="24" width="84" height="68" rx="33" fill="#b7814e"/>' +
        '<ellipse cx="50" cy="73" rx="31" ry="20" fill="#dcb78a"/>' +
        '<ellipse cx="50" cy="58" rx="20" ry="10.5" fill="#3b261a"/>' +
        '<ellipse cx="43" cy="54.5" rx="5" ry="1.9" fill="#fff" opacity=".3"/>' +
        '<ellipse cx="42.5" cy="59.5" rx="2.6" ry="1.9" fill="#14090a"/><ellipse cx="57.5" cy="59.5" rx="2.6" ry="1.9" fill="#14090a"/>' +
        '<path d="M50 68.5 V74 M42 77 Q46 81 50 75 Q54 81 58 77" stroke="#5a3a22" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        /* עיניים קטנות ורגועות למחצה, גבוהות על הראש */
        '<circle cx="28" cy="41" r="4.4" fill="#2b1b12"/><circle cx="72" cy="41" r="4.4" fill="#2b1b12"/>' +
        '<circle cx="29.4" cy="42.4" r="1.4" fill="#fff"/><circle cx="73.4" cy="42.4" r="1.4" fill="#fff"/>' +
        '<path d="M22.5 40.5 Q28 33.5 33.5 40.5 Z" fill="#b7814e" stroke="#5a3a22" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M66.5 40.5 Q72 33.5 77.5 40.5 Z" fill="#b7814e" stroke="#5a3a22" stroke-width="2" stroke-linejoin="round"/>'
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
