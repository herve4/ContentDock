// ContentDock Service Worker - offline cache
const CACHE = 'contentdock-v1';
const ASSETS = [
  './ContentDock.html',
  './styles.css',
  './data.js',
  './manifest.json',
  './icons.jsx',
  './shell.jsx',
  './views.jsx',
  './calendar.jsx',
  './extras.jsx',
  './analytics.jsx',
  './cmdk.jsx',
  './attachments.jsx',
  './features.jsx',
  './settings.jsx',
  './mobile.jsx',
  './onboarding.jsx',
  './collab.jsx',
  './templates.jsx',
  './integrations.jsx',
  './pwa.jsx',
  './ocr.jsx',
  './assistant.jsx',
  './detail.jsx',
  './capture.jsx',
  './app.jsx',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.filter(a => a))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin GETs
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        // Update cache
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
