const CACHE_NAME = 'visual-steps-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/').then(response => response || Response.error())));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});

self.addEventListener('push', event => {
  let title = 'Visual Steps';
  if (event.data) {
    try {
      const payload = event.data.json();
      if (typeof payload.title === 'string' && payload.title.length <= 100) title = payload.title;
    } catch { /* A malformed payload still produces a safe generic alert. */ }
  }
  event.waitUntil(self.registration.showNotification(title, {
    body: 'Open Visual Steps to read the message.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'learner-message',
    data: { url: '/dashboard' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate('/dashboard');
      return existing.focus();
    }
    return self.clients.openWindow('/dashboard');
  }));
});
