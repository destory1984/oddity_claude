import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PHOTO_MORE } from '../src/core/photoMore.js';
import { BODIES } from '../src/core/bodies.js';
import { CRAFT } from '../src/core/craft.js';
import { STORIES } from '../src/core/stories.js';

test('every body, craft and story place has a third paragraph for its photo page, one paragraph each, no tilde', () => {
  // (A story place that shares its id with a craft goes as "place:<id>".)
  const things = [...BODIES.filter((b) => !b.exo), ...CRAFT].map((x) => x.id);
  const ids = [...things, ...STORIES.map((s) => (things.includes(s.id) ? `place:${s.id}` : s.id))];
  for (const id of ids) {
    const text = PHOTO_MORE[id];
    assert.ok(text && text.length > 100, id);
    assert.ok(!/[~～\n]/.test(text), id);
  }
  assert.equal(Object.keys(PHOTO_MORE).length, ids.length);
});
