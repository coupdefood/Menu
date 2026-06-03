/* Coup de Food Service Worker (assets) */
const CACHE_VERSION = 'v2';
const CACHE_NAME = `cdf-cache-${CACHE_VERSION}`;

// Base scope of the SW (works whether deployed at root or in a sub-folder like /CoupDeFood/)
const SCOPE = self.registration ? self.registration.scope : self.location.href.replace(/sw\.js.*$/, '');

// Precache core local assets (resolved against SCOPE so it works on GitHub Pages sub-folders)
const CORE_PATHS = [
  './',
  'index.html',
  'assets/styles.css',
  'assets/animations.css',
  'assets/scripts.js',
  'assets/images/logo.png'
];

const CORE_ASSETS = CORE_PATHS.map((p) => new URL(p, SCOPE).toString());

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(CORE_ASSETS);
    } catch (e) {
      // Continue activation even if some assets fail
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME) {
        return caches.delete(key);
      }
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigation requests: network-first with cache fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match(new URL('index.html', SCOPE).toString());
        const cachedReq = await cache.match(req);
        return cachedIndex || cachedReq || new Response('Vous êtes hors ligne.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // Same-origin static assets: cache-first, then network
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return cached || Response.error();
      }
    })());
  }
});
