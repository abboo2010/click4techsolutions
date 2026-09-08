// Minimal service worker — exists mainly so Chrome/Android recognizes this
// page as an installable app (a real "Install app" prompt instead of a
// plain bookmark). It caches only the small app-shell files, not any
// content fetched live from the CMS.
const CACHE_NAME = 'click4tech-shell-v1';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './assets/cms-loader.js',
  './assets/site-animations.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for everything so live CMS content and edits show up
  // immediately; falls back to the cached app shell only if offline.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
