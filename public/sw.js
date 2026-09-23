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
    data: { url: '/dashboard?messages=1' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/dashboard?messages=1', self.location.origin);
  if (target.origin !== self.location.origin || target.pathname !== '/dashboard') {
    target.href = new URL('/dashboard?messages=1', self.location.origin).href;
  }
  target.searchParams.set('messages', '1');
  event.waitUntil((async () => {
    const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .filter(client => new URL(client.url).origin === self.location.origin);
    const appWindows = await Promise.all(windows.map(client => new Promise(resolve => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => resolve(null), 500);
      channel.port1.onmessage = message => {
        clearTimeout(timeout);
        resolve(message.data?.standalone ? client : null);
      };
      client.postMessage({ type: 'visual-steps-display-mode' }, [channel.port2]);
    })));
    const existing = appWindows.find(Boolean) || windows[0];
    if (existing) {
      try {
        const navigated = await existing.navigate(target.href);
        if (navigated) return await navigated.focus();
      } catch { /* A closed or no-longer-navigable window should not swallow the click. */ }
    }
    return self.clients.openWindow(target.href);
  })());
});
