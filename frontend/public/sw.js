/* Service Worker básico — cache de assets estáticos, network-first para API. */
const CACHE = 'acad-v1';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // APIs e Supabase: sempre network, fallback cache
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    return;
  }

  // Assets: cache-first
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then((c) => c || fetch(request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((ca) => ca.put(request, copy));
        return r;
      })),
    );
    return;
  }

  // HTML: network-first
  e.respondWith(
    fetch(request).catch(() => caches.match(request).then((r) => r || caches.match('/'))),
  );
});
