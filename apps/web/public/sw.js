// MasterLMS Service Worker — Phase 17 PWA
const CACHE_NAME = 'masterlms-v3';
const OFFLINE_URL = '/offline';

// Static assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, API calls, and socket.io
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // Navigation requests: network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(r => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // JS/CSS chunks (_next/static/chunks): network-first, cache fallback
  // Chunks have content-hash in filename so stale cache = wrong version → always try network first
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(request).then(r => r ?? new Response('', { status: 404 })))
    );
    return;
  }

  // Other static assets (fonts, images, manifests): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|avif|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'MasterLMS', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: data.tag || 'masterlms',
        data: { url: data.url || '/dashboard' },
        vibrate: [100, 50, 100],
      })
    );
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
