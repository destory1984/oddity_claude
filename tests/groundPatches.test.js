import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { GROUND_PATCHES } from '../src/render/groundPatches.js';
import { STORIES } from '../src/core/stories.js';

test('each ground patch has its picture on file and credited, and is a size one picture can hold', () => {
  const credits = readFileSync('THIRD-PARTY.md', 'utf8');
  assert.equal(new Set(GROUND_PATCHES.map((p) => p.id)).size, GROUND_PATCHES.length);
  for (const patch of GROUND_PATCHES) {
    assert.ok(Math.abs(patch.latDeg) <= 90 && Math.abs(patch.lonDeg) <= 180, patch.id);
    assert.ok(existsSync(`public/assets/terrain/${patch.file}`), patch.file);
    assert.ok(credits.includes(`| \`${patch.file}\` |`), `${patch.file} is not in THIRD-PARTY.md`);
    // 512 across: from 100 m to 400 m a pixel, against about 10 km for Earth's own map.
    assert.ok(patch.sizeKm >= 30 && patch.sizeKm <= 200, patch.id);
  }
});

test('the Eye of the Sahara patch lies on its story place and holds its logging range', () => {
  const patch = GROUND_PATCHES.find((p) => p.id === 'richat');
  const story = STORIES.find((s) => s.id === 'richat');
  assert.equal(patch.latDeg, story.latDeg);
  assert.equal(patch.lonDeg, story.lonDeg);
  assert.ok(patch.sizeKm >= story.withinKm);
});
