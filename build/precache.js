// Build-time offline list for the service worker (see src/sw.js).
// Babylon.js loads shader chunks lazily, so caching only what the first page load
// fetched is not enough: every built file is listed and fetched when the worker installs.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// The big pictures only some views show: fetched the first time they are shown, not on
// install (the user, 2026-11-23: "이건 전체 로딩할 때에 로딩하지말고, 이 화면을 선택할 때에
// 로딩하게 하면 낫지않나?"; built 2026-11-24): the courses' cabins and photos, the cupola's
// window and fine Earth maps, the Mars walk's ground, and the notebook's photos.
export const LAZY = ['assets/tours/', 'assets/cupola/', 'assets/mars/', 'assets/craftPhotos/', 'assets/stories/', 'assets/objectPhotos/'];

const cached = (f) => !f.endsWith('.map') && f !== 'sw.js' && f !== 'index.html';

// The files fetched on install: all but the lazy ones.
export function precacheEntries(bundleFiles, publicFiles, lazy = []) {
  const files = [...bundleFiles, ...publicFiles].filter((f) => cached(f) && !lazy.some((dir) => f.startsWith(dir)));
  return ['./', ...[...new Set(files)].sort()];
}

// Every file the worker keeps (lazy ones too), with a digest of its content: a file is
// fetched again only when its digest changes. contents: { name: Buffer | string }.
export function fileManifest(contents) {
  const out = {};
  for (const name of Object.keys(contents).filter(cached).sort()) {
    out[name] = createHash('sha256').update(contents[name]).digest('hex').slice(0, 12);
  }
  return out;
}

export function cacheVersion(entries) {
  return createHash('sha256').update(entries.join('\n')).digest('hex').slice(0, 8);
}

// stamp: a digest of what is in the public files. Their names carry no hash, so a
// picture redrawn under the same name (a new crane, a new frame) would otherwise leave
// the version, and the copy in an installed game, unchanged.
export function renderServiceWorker(template, entries, stamp = '', manifest = {}) {
  return template
    .replaceAll('__VERSION__', cacheVersion(stamp ? [...entries, stamp] : entries))
    .replaceAll('__PRECACHE__', JSON.stringify(entries))
    .replaceAll('__MANIFEST__', JSON.stringify(manifest));
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

// One digest over the contents of the given files, in name order.
export function contentStamp(dir, files) {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(dir, file)));
  }
  return hash.digest('hex').slice(0, 16);
}

// Vite plugin: emits sw.js with the install list and every file's digest. A new build
// with any file changed produces a different worker, so browsers install it and fetch
// the changed files only.
export function serviceWorkerPlugin({ template = 'src/sw.js', publicDir = 'public' } = {}) {
  return {
    name: 'space-oddity-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const publicFiles = listFiles(publicDir);
      const entries = precacheEntries(Object.keys(bundle), publicFiles, LAZY);
      const contents = {};
      for (const file of publicFiles) contents[file] = fs.readFileSync(path.join(publicDir, file));
      for (const [name, item] of Object.entries(bundle)) contents[name] = item.type === 'chunk' ? item.code : item.source;
      const manifest = fileManifest(contents);
      const source = renderServiceWorker(fs.readFileSync(template, 'utf8'), entries, JSON.stringify(manifest), manifest);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
