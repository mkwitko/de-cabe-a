/* global self, URL, caches, fetch, Response */
// Service worker: installable app, offline shell, and Notificações (GROWTH_PLAN.md 2.9).
// The build stamps BUILD (vite.config.ts), so every deploy installs a new worker and drops the old
// cache. Only the shell and the hashed /assets are cached; the API (/v1), SEO pages and anything
// cross-origin always go to the network.
const BUILD = '__BUILD__';
const CACHE = `shell-${BUILD}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch('/', { cache: 'no-cache' });
      const html = await res.clone().text();
      await cache.put('/', res);
      // The entry scripts and styles of this build; lazy chunks are cached when first used.
      const assets = [...new Set(html.match(/\/assets\/[^"'\s)]+/g) ?? [])];
      await cache.addAll(assets).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Network first, so a deploy shows at once; the cached shell only when offline.
    event.respondWith(fetch(req).catch(async () => (await caches.match('/')) ?? Response.error()));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    // Hashed names never change content: cache first.
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
            }
            return res;
          }),
      ),
    );
  }
});

self.addEventListener('push', (event) => {
  const m = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(m.title || 'De Cabeça F.C.', {
      body: m.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'pt-BR',
      data: { url: m.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((t) => t.url.startsWith(self.location.origin));
      return tab ? tab.navigate(url).then((t) => t && t.focus()) : self.clients.openWindow(url);
    }),
  );
});
