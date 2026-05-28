/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

// Workbox injects the precache manifest at build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Live menu data: always try network first, fallback cache for offline
registerRoute(
  ({ url }) => url.pathname.endsWith('/menu-data.json'),
  new NetworkFirst({ cacheName: 'menu-data', networkTimeoutSeconds: 3 })
);

// External menu photos: cache-first, 30 days
registerRoute(
  ({ url }) => url.hostname === 'images.unsplash.com' || url.hostname === 'loremflickr.com',
  new CacheFirst({ cacheName: 'menu-photos' })
);

// ---------- Push notifications ----------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Pipón Pipón' };
  }

  const title = data.title || 'Pipón Pipón';
  const body  = data.body  || '';
  const url   = data.url   || '/#menu-del-dia';
  const items = Array.isArray(data.items) ? data.items : [];

  // Build a short summary of items for the notification body if not provided
  let finalBody = body;
  if (!finalBody && items.length > 0) {
    finalBody = items.slice(0, 3).map((it) => it.name).join(' · ');
    if (items.length > 3) finalBody += ` y ${items.length - 3} más`;
  }

  const options = {
    body: finalBody,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image || undefined,
    vibrate: [120, 60, 120],
    tag: 'pipon-notif',
    renotify: true,
    requireInteraction: false,
    data: { url, items }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url.includes(self.location.origin)) {
        await client.focus();
        if ('navigate' in client) {
          try { await client.navigate(url); } catch { /* ignore */ }
        }
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(url);
    }
  })());
});

// Allow the page to take control immediately after install
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
