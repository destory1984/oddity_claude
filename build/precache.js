// Build-time offline list for the service worker (see src/sw.js).
// Babylon.js loads shader chunks lazily, so caching only what the first page load
// fetched is not enough: every built file is listed and fetched when the worker installs.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function precacheEntries(bundleFiles, publicFiles) {
  const files = [...bundleFiles, ...publicFiles]
    .filter((f) => !f.endsWith('.map') && f !== 'sw.js' && f !== 'index.html');
  return ['./', ...[...new Set(files)].sort()];
}

export function cacheVersion(entries) {
  return createHash('sha256').update(entries.join('\n')).digest('hex').slice(0, 8);
}

export function renderServiceWorker(template, entries) {
  return template
    .replaceAll('__VERSION__', cacheVersion(entries))
    .replaceAll('__PRECACHE__', JSON.stringify(entries));
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

// Vite plugin: emits sw.js with the full file list. A new build with different files
// produces a different worker, so browsers install it and drop the old cache.
export function serviceWorkerPlugin({ template = 'src/sw.js', publicDir = 'public' } = {}) {
  return {
    name: 'space-oddity-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const entries = precacheEntries(Object.keys(bundle), listFiles(publicDir));
      const source = renderServiceWorker(fs.readFileSync(template, 'utf8'), entries);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
