import { test } from 'vitest';
import assert from 'node:assert/strict';
import { precacheEntries, cacheVersion, renderServiceWorker, contentStamp } from '../build/precache.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('precache lists every built file and public file, but not the worker or source maps', () => {
  const list = precacheEntries(
    ['assets/index-abc.js', 'assets/index-abc.js.map', 'assets/default.vertex-x.js', 'index.html'],
    ['assets/earth-day.jpg', 'icons/icon-192.png', 'manifest.webmanifest', 'sw.js'],
  );
  assert.deepEqual(list, [
    './',
    'assets/default.vertex-x.js',
    'assets/earth-day.jpg',
    'assets/index-abc.js',
    'icons/icon-192.png',
    'manifest.webmanifest',
  ]);
});

test('the cache version changes when the file list changes and only then', () => {
  const a = cacheVersion(['./', 'assets/index-abc.js']);
  assert.equal(a, cacheVersion(['./', 'assets/index-abc.js']));
  assert.notEqual(a, cacheVersion(['./', 'assets/index-def.js']));
  assert.match(a, /^[0-9a-f]{8}$/);
});

test('the worker template gets the list and version filled in', () => {
  const out = renderServiceWorker("const CACHE = 'space-oddity-__VERSION__';\nconst PRECACHE = __PRECACHE__;", ['./', 'a.js']);
  assert.match(out, /const CACHE = 'space-oddity-[0-9a-f]{8}';/);
  assert.match(out, /const PRECACHE = \["\.\/","a\.js"\];/);
  assert.doesNotMatch(out, /__VERSION__|__PRECACHE__/);
});

test('a public file redrawn under the same name still changes the cache version', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oddity-stamp-'));
  try {
    fs.writeFileSync(path.join(dir, 'crane.png'), 'a star');
    const before = contentStamp(dir, ['crane.png']);
    assert.equal(before, contentStamp(dir, ['crane.png']));
    fs.writeFileSync(path.join(dir, 'crane.png'), 'a crane');
    const after = contentStamp(dir, ['crane.png']);
    assert.notEqual(before, after);
    const template = "const CACHE = 'space-oddity-__VERSION__';";
    const list = ['./', 'crane.png'];
    assert.notEqual(renderServiceWorker(template, list, before), renderServiceWorker(template, list, after));
    assert.equal(renderServiceWorker(template, list, after), renderServiceWorker(template, list, after));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
