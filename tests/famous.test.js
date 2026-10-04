import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { FAMOUS, famousFor } from '../src/core/famous.js';
import { MISSIONS } from '../src/core/missions.js';

test('eight photo missions have the real photograph they follow', () => {
  assert.equal(Object.keys(FAMOUS).length, 8);
  const known = new Set(MISSIONS.map((m) => m.id));
  for (const id of Object.keys(FAMOUS)) assert.ok(known.has(id), id);
});

test('each real photograph has a file on disk, a name, who took it when, a note and a credit', () => {
  for (const [id, f] of Object.entries(FAMOUS)) {
    assert.ok(existsSync(new URL(`../public/assets/${f.file}`, import.meta.url)), `${id}: ${f.file}`);
    assert.ok(f.name && f.by && f.credit, id);
    assert.match(f.by, /\d{4}년/, id);
    assert.ok(f.note.length >= 20 && f.note.length <= 90, `${id}: ${f.note.length}`);
  }
});

test('a photo shows the real one of the first mission it met that has one', () => {
  assert.equal(famousFor(['twoPlanets', 'blueMarble', 'earthrise']).id, 'blueMarble');
  assert.equal(famousFor(['earthrise']).name, '지구돋이');
});

test('a photo that met no such mission has nothing to stand beside', () => {
  assert.equal(famousFor(['twoPlanets', 'heroSelfie']), null);
  assert.equal(famousFor([]), null);
  assert.equal(famousFor(undefined), null);
});
