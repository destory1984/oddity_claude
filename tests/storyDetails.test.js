import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { STORY_DETAILS, storyPhotoFile } from '../src/core/storyDetails.js';
import { STORIES } from '../src/core/stories.js';

test('every story place has a longer telling of three sentences or more', () => {
  assert.deepEqual(Object.keys(STORY_DETAILS).sort(), STORIES.map((s) => s.id).sort());
  for (const story of STORIES) {
    const { detail } = STORY_DETAILS[story.id];
    assert.ok(detail.length >= 100 && detail.length <= 420, `${story.id}: ${detail.length}`);
    assert.ok(detail.split('. ').length >= 3, story.id);
    assert.ok(detail.endsWith('.'), story.id);
    assert.ok(detail.length > story.text.length, story.id);
  }
});

test('90 of the 91 have a photograph on file, with a caption and a credit; the Ocean of Storms has none', () => {
  const without = STORIES.filter((s) => !STORY_DETAILS[s.id].photo).map((s) => s.id);
  assert.deepEqual(without, ['procellarum']);
  assert.equal(storyPhotoFile('procellarum'), null);
  const credits = readFileSync('THIRD-PARTY.md', 'utf8');
  let bytes = 0;
  for (const story of STORIES) {
    const { photo } = STORY_DETAILS[story.id];
    if (!photo) continue;
    const file = storyPhotoFile(story.id);
    assert.equal(file, `stories/${story.id}.jpg`);
    assert.ok(existsSync(`public/assets/${file}`), file);
    bytes += statSync(`public/assets/${file}`).size;
    assert.ok(photo.caption.length >= 6 && photo.credit.length >= 4, story.id);
    // Where it came from and its licence are written down.
    assert.ok(credits.includes(`| \`${story.id}.jpg\` |`), `${story.id} is not in THIRD-PARTY.md`);
  }
  assert.equal(readdirSync('public/assets/stories').length, 90);
  assert.ok(bytes < 3.6e6, `${bytes} bytes of photographs`);
});
