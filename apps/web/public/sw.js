/* global self, URL */
// Service worker for Notificações (GROWTH_PLAN.md 2.9). Push only: no caching, no offline.
self.addEventListener('push', (event) => {
  const m = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(m.title || 'De Cabeça', {
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
