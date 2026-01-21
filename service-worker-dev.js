/*
  Dev Service Worker (no-cache)
  - satisfies PWA install requirements
  - avoids "old UI comes back" during local development
*/

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-only: don't cache in dev
  event.respondWith(fetch(event.request));
});
