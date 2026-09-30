import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createProgress, updateProgress, recordPhotos, summarize, sanitizeProgress, isComplete, score } from '../src/core/progress.js';
import { BODIES, START_POSITION, bodyById } from '../src/core/bodies.js';
import { MISSIONS } from '../src/core/missions.js';

const at = (position, restingOn = null) => ({ position, restingOn });
const above = (id, km) => {
  const b = bodyById(id);
  return [b.position[0], b.position[1] + b.radiusKm + km, b.position[2]];
};

test('a new log knows Earth only', () => {
  assert.deepEqual(createProgress(), { discovered: ['earth'], landed: [], photos: [] });
});

test('entering 50,000 km of a surface discovers the body once', () => {
  let progress = createProgress();
  let result = updateProgress(progress, at(above('mars', 60000)), BODIES);
  assert.deepEqual(result.events, []);
  result = updateProgress(result.progress, at(above('mars', 49000)), BODIES);
  assert.deepEqual(result.events, [{ type: 'discovered', bodyId: 'mars' }]);
  assert.ok(result.progress.discovered.includes('mars'));
  result = updateProgress(result.progress, at(above('mars', 100)), BODIES);
  assert.deepEqual(result.events, []);
});

test('touching a surface records a landing once, and discovers it too', () => {
  let { progress, events } = updateProgress(createProgress(), at(above('moon', 0), 'moon'), BODIES);
  assert.deepEqual(events, [
    { type: 'discovered', bodyId: 'moon' },
    { type: 'landed', bodyId: 'moon' },
  ]);
  ({ progress, events } = updateProgress(progress, at(above('moon', 0), 'moon'), BODIES));
  assert.deepEqual(events, []);
  assert.deepEqual(progress.landed, ['moon']);
});

test('updates never mutate the previous log', () => {
  const before = createProgress();
  updateProgress(before, at(above('mars', 10), 'mars'), BODIES);
  assert.deepEqual(before, createProgress());
});

test('the Moon, 12,000 km away, is discovered on the first frame', () => {
  assert.deepEqual(updateProgress(createProgress(), at(START_POSITION), BODIES).events, [{ type: 'discovered', bodyId: 'moon' }]);
});

test('recordPhotos keeps the first completion only', () => {
  let { progress, newly } = recordPhotos(createProgress(), ['heroSelfie']);
  assert.deepEqual(newly, ['heroSelfie']);
  ({ progress, newly } = recordPhotos(progress, ['heroSelfie', 'eclipse']));
  assert.deepEqual(newly, ['eclipse']);
  assert.deepEqual(progress.photos, ['heroSelfie', 'eclipse']);
});

test('summary counts against every body and mission', () => {
  const progress = { discovered: ['earth', 'moon'], landed: ['moon'], photos: ['eclipse'] };
  assert.deepEqual(summarize(progress, BODIES, MISSIONS), {
    discovered: 2, landed: 1, photos: 1, bodies: BODIES.length, missions: MISSIONS.length,
  });
});

test('sanitizeProgress drops junk from storage and keeps known ids', () => {
  const junk = { discovered: ['mars', 'pluto', 3], landed: 'moon', photos: ['eclipse', 'eclipse', 'fake'] };
  assert.deepEqual(sanitizeProgress(junk, BODIES, MISSIONS), { discovered: ['earth', 'mars'], landed: [], photos: ['eclipse'] });
  assert.deepEqual(sanitizeProgress(null, BODIES, MISSIONS), createProgress());
  assert.deepEqual(sanitizeProgress('nonsense', BODIES, MISSIONS), createProgress());
});

test('the tour is complete only when every body is found and landed on and every photo taken', () => {
  const all = { discovered: BODIES.map((b) => b.id), landed: BODIES.map((b) => b.id), photos: MISSIONS.map((m) => m.id) };
  assert.equal(isComplete(summarize(all, BODIES, MISSIONS)), true);
  assert.equal(isComplete(summarize({ ...all, photos: all.photos.slice(1) }, BODIES, MISSIONS)), false);
  assert.equal(isComplete(summarize(createProgress(), BODIES, MISSIONS)), false);
});

test('score counts every record out of the total', () => {
  const s = summarize({ discovered: ['earth', 'moon'], landed: ['moon'], photos: ['eclipse'] }, BODIES, MISSIONS);
  assert.deepEqual(score(s), { done: 4, total: BODIES.length * 2 + MISSIONS.length });
});
