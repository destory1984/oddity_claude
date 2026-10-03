// Offline support for the installed game. This is a template: the build
// (build/precache.js) fills in the version and the list of every built file.
// - Installing downloads the whole game, so it opens offline right after the first visit.
// - The page itself (navigations) goes to the network first and past the browser's own
//   cache (GitHub Pages lets a browser keep the page for ten minutes), so a reload always
//   shows the newest build; the cached copy is used only when offline.
// - Other files come from the cache first; hashed names never change their content.
const CACHE = 'space-oddity-__VERSION__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // ignoreVary: module scripts are requested with an Origin header, stored copies without.
  const lookup = (key) => caches.match(key, { ignoreVary: true });

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request.url, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => lookup('./')),
    );
    return;
  }

  event.respondWith(lookup(request).then((cached) => cached || fetch(request)));
});
