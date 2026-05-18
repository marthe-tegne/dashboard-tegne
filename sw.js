// TEGNE Dashboard — Service Worker (PWA)
const CACHE = 'tegne-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/sheets.js',
  '/js/ai.js',
  '/js/weekly.js',
  '/js/monthly.js',
  '/js/quarterly.js',
  '/js/app.js',
  '/manifest.json',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
];

// Installer og cache kjerne-assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Rydd opp gamle caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API-kall går alltid mot nett
  if (url.pathname.startsWith('/api/') || url.hostname.includes('script.google.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Alt annet: cache-first med nett-fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
