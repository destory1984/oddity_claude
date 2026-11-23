// Offline support for the installed game. This is a template: the build
// (build/precache.js) fills in the version, the files fetched on install, and a digest of
// every built file's content.
// - Installing downloads the game, so it opens offline right after the first visit; the
//   big pictures only some views show (the courses' cabins and stages, the notebook's
//   photos: build/precache.js LAZY) are fetched the first time they are shown instead, and
//   kept from then on.
// - The files are kept in one cache from build to build, each stamped with the digest of
//   its content: a new build fetches only the files whose content changed (it fetched all
//   60 MB again on every build until 2026-11-24).
// - The page itself (navigations) goes to the network first and past the browser's own
//   cache (GitHub Pages lets a browser keep the page for ten minutes), so a reload always
//   shows the newest build; the cached copy is used only when offline.
// - Other files come from the cache first while their digest matches this build's.
const VERSION = '__VERSION__';
const FILES = 'space-oddity-files';
const PRECACHE = __PRECACHE__;
const MANIFEST = __MANIFEST__;
const STAMP = 'x-oddity-hash';
const at = (path) => new URL(path, self.registration.scope).href;
// ignoreVary: module scripts are requested with an Origin header, stored copies without.
const KEEP = { ignoreVary: true };

async function fresh(cache, path) {
  const hit = await cache.match(at(path), KEEP);
  return hit && hit.headers.get(STAMP) === MANIFEST[path] ? hit : null;
}

async function store(cache, path, response) {
  const headers = new Headers(response.headers);
  headers.set(STAMP, MANIFEST[path]);
  const body = await response.blob();
  await cache.put(at(path), new Response(body, { status: response.status, statusText: response.statusText, headers }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(FILES);
    const todo = [];
    for (const path of PRECACHE) if (path !== './' && !(await fresh(cache, path))) todo.push(path);
    // Six at a time; past the browser's own cache, which may hold a picture's old content.
    let next = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (next < todo.length) {
        const path = todo[next++];
        const response = await fetch(at(path), { cache: 'no-cache' });
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        await store(cache, path, response);
      }
    }));
    await cache.put(at('./'), await fetch(at('./'), { cache: 'no-store' }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // The caches of the builds before 2026-11-24 (one whole copy each), and in this one
    // the files no longer in the game.
    for (const key of await caches.keys()) if (key !== FILES) await caches.delete(key);
    const cache = await caches.open(FILES);
    const scope = self.registration.scope;
    for (const request of await cache.keys()) {
      const path = request.url.startsWith(scope) ? request.url.slice(scope.length) : null;
      if (path !== '' && !(path in MANIFEST)) await cache.delete(request);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request.url, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(FILES).then((cache) => cache.put(at('./'), copy));
          return response;
        })
        .catch(() => caches.match(at('./'), KEEP)),
    );
    return;
  }

  const scope = self.registration.scope;
  const path = !url.search && url.href.startsWith(scope) ? url.href.slice(scope.length) : null;
  // A file of the game (not a part of one asked for: sounds may be read in ranges).
  if (path && path in MANIFEST && !request.headers.has('range')) {
    event.respondWith((async () => {
      const cache = await caches.open(FILES);
      const hit = await fresh(cache, path);
      if (hit) return hit;
      try {
        const response = await fetch(request);
        if (response.status === 200) event.waitUntil(store(cache, path, response.clone()));
        return response;
      } catch (error) {
        // Offline: an older copy is better than none.
        const old = await cache.match(at(path), KEEP);
        if (old) return old;
        throw error;
      }
    })());
    return;
  }

  event.respondWith(caches.match(request, KEEP).then((cached) => cached || fetch(request)));
});

void VERSION;
