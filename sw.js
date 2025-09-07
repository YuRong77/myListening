// Minimal service worker to enable PWA install
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients so updates apply immediately on refresh
  event.waitUntil(self.clients.claim());
});

// Optional no-op fetch listener to satisfy older install criteria
self.addEventListener('fetch', () => {
  // Intentionally do nothing; network falls through as normal
});

