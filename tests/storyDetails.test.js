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

test('all 132 have a picture on file, with a caption and a credit (125 photographs and seven drawings made for the game)', () => {
  const without = STORIES.filter((s) => !STORY_DETAILS[s.id].photo).map((s) => s.id);
  assert.deepEqual(without, []);
  assert.equal(storyPhotoFile('wadiRum'), 'stories/wadiRum.jpg');
  assert.equal(storyPhotoFile('nowhere'), null);
  // A drawing says that it is one.
  for (const id of ['procellarum', 'acidalia', 'schiaparelli', 'bohyunsan', 'tanegashima', 'wenchang', 'vega']) assert.match(STORY_DETAILS[id].photo.caption, /^그림으로 그린 .*사진이 아닙니다\.$/);
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
  assert.equal(readdirSync('public/assets/stories').length, 132);
  // (4 MB until the four of Mercury came, 2026-10-12; 4.2 MB until the two of Venus,
  // 2026-10-13; 4.3 MB until the three round Jupiter, 2026-10-14; 4.45 MB until Osiris, the
  // same day; 4.55 MB until Inktomi, the same day: 117 pictures, 39 KB each on average;
  // 4.65 MB until Rubin, MeerKAT and SALT, 2026-10-18; 5 MB until Lowell, Palomar and the VLA, the same day;
  // 5.2 MB until Luna 3, Cheomseongdae, Stonehenge and Arecibo, 2026-10-19.)
  assert.ok(bytes < 5.2e6, `${bytes} bytes of pictures`);
});
