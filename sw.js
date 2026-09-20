/* ===================================================================
   sw.js — Service Worker
   מעתיק את כל קבצי המשחק לזיכרון המכשיר בטעינה הראשונה, כך שמאותו רגע
   המשחק נפתח גם בלי אינטרנט (כולל מצב טיסה) ובלי המתנה.

   בעת שחרור גרסה חדשה: להעלות את VERSION. זה מה שגורם לדפדפן להחליף
   את המטמון הישן בחדש. בלי זה, מכשיר שכבר שיחק ימשיך לראות גרסה ישנה.
   =================================================================== */

const VERSION = 'v3';
const CACHE = 'mg-' + VERSION;

/* נתיבים יחסיים בכוונה: המשחק עשוי לשבת בתת-תיקייה (כמו ב-GitHub Pages) */
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/storage.js',
  './js/audio.js',
  './js/speech.js',
  './js/help.js',
  './js/questions.js',
  './js/rewards.js',
  './js/timer.js',
  './js/app.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CACHE);
    // כל קובץ בנפרד: קובץ בודד שחסר לא יפיל את כל ההתקנה
    await Promise.all(ASSETS.map(function (url) {
      return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      return (k.indexOf('mg-') === 0 && k !== CACHE) ? caches.delete(k) : null;
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async function () {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // שומרים גם משאבים חיצוניים (הפונטים של Google), כדי שיהיו זמינים אופליין.
      // תשובה מסוג opaque מגיעה מבקשה חוצת-מקור ואי אפשר לקרוא אותה, אבל אפשר לשמור.
      if (res && (res.ok || res.type === 'opaque')) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone()).catch(function () {});
      }
      return res;
    } catch (err) {
      // אין רשת: אם ביקשו דף, מגישים את המשחק מהמטמון
      if (req.mode === 'navigate') {
        const fallback = await caches.match('./index.html', { ignoreSearch: true });
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
