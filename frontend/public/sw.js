/*
 * Royal Bee service worker — installability + static asset caching only.
 * API data is NEVER cached here (no offline workspaces, per specification).
 */
const VERSION = 'rb-static-v2';
const SHELL = ['/offline.html', '/manifest.webmanifest', '/android-chrome-192x192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache API responses

  // Hashed build assets: cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Page navigations: network-first, fall back to cached shell
  if (request.mode === 'navigate') {
  event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
  }
});
