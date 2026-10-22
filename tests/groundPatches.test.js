import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { GROUND_PATCHES } from '../src/render/groundPatches.js';
import { STORIES } from '../src/core/stories.js';

test('each ground patch lies on a story place of Earth, with its picture on file and credited', () => {
  const credits = readFileSync('THIRD-PARTY.md', 'utf8');
  for (const patch of GROUND_PATCHES) {
    const story = STORIES.find((s) => s.id === patch.id);
    assert.ok(story && story.type === 'surface' && story.body === 'earth', patch.id);
    assert.ok(existsSync(`public/assets/terrain/${patch.file}`), patch.file);
    assert.ok(credits.includes(`| \`${patch.file}\` |`), `${patch.file} is not in THIRD-PARTY.md`);
    // Wide enough to hold the place's own logging range, small enough to stay one picture.
    assert.ok(patch.sizeKm >= story.withinKm && patch.sizeKm <= 300, patch.id);
  }
});
