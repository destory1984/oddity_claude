import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = () => JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));

// PNG stores width and height as big-endian 32-bit numbers at bytes 16 and 20.
function pngSize(file) {
  const b = fs.readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('the manifest names the game and opens full screen at the site root', () => {
  const m = manifest();
  assert.equal(m.name, 'Space Oddity');
  assert.ok(m.short_name && m.short_name.length <= 12);
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.ok(['fullscreen', 'standalone'].includes(m.display));
  assert.match(m.background_color, /^#[0-9a-f]{6}$/i);
  assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
});

test('install icons exist at the sizes the manifest claims, including 192 and 512', () => {
  const m = manifest();
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  for (const icon of m.icons) {
    const file = `public/${icon.src}`;
    assert.ok(fs.existsSync(file), file);
    assert.deepEqual(pngSize(file).join('x'), icon.sizes);
  }
  assert.ok(m.icons.some((i) => (i.purpose ?? '').includes('maskable')));
});

test('the page links the manifest and the iPhone icon, and the worker template has its placeholders', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png">/);
  assert.deepEqual(pngSize('public/icons/apple-touch-icon.png'), [180, 180]);
  const worker = fs.readFileSync('src/sw.js', 'utf8');
  assert.match(worker, /__VERSION__/);
  assert.match(worker, /__PRECACHE__/);
});
