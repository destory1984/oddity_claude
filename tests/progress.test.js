import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createProgress, updateProgress, recordPhotos, recordStories, summarize, sanitizeProgress, isComplete, score, journalOrder,
} from '../src/core/progress.js';
import { STORIES } from '../src/core/stories.js';
import { BODIES, START_POSITION, bodyById } from '../src/core/bodies.js';
import { MISSIONS } from '../src/core/missions.js';

const at = (position, restingOn = null) => ({ position, restingOn });
const above = (id, km) => {
  const b = bodyById(id);
  return [b.position[0], b.position[1] + b.radiusKm + km, b.position[2]];
};

test('the journal lists the Sun, then each world by distance with its moons under it, largest first', () => {
  const order = journalOrder(BODIES);
  assert.equal(order.length, BODIES.length);
  const ids = order.map((o) => o.body.id);
  assert.equal(new Set(ids).size, BODIES.length);
  assert.deepEqual(ids.slice(0, 8), ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'phobos', 'deimos']);
  const where = (id) => ids.indexOf(id);
  assert.deepEqual(ids.slice(where('jupiter'), where('jupiter') + 5), ['jupiter', 'ganymede', 'callisto', 'io', 'europa']);
  assert.deepEqual(ids.slice(where('saturn') + 1, where('saturn') + 3), ['titan', 'rhea']);
  assert.ok(where('mars') < where('ceres') && where('ceres') < where('jupiter'));
  assert.ok(where('uranus') < where('neptune') && where('neptune') + 1 === where('triton') && where('triton') < where('pluto'));
  assert.equal(where('pluto') + 1, where('charon'));
  for (const { body, moon } of order) assert.equal(moon, body.kind === 'moon', body.id);
});

test('a new log knows Earth only', () => {
  assert.deepEqual(createProgress(), { discovered: ['earth'], landed: [], photos: [], stories: [], craft: [] });
});

test('entering 50,000 km of a surface discovers the body once', () => {
  let progress = createProgress();
  let result = updateProgress(progress, at(above('mars', 60000)), BODIES);
  assert.deepEqual(result.events, []);
  result = updateProgress(result.progress, at(above('mars', 49000)), BODIES);
  assert.deepEqual(result.events, [{ type: 'discovered', bodyId: 'mars' }]);
  assert.ok(result.progress.discovered.includes('mars'));
  // Closer in, Mars is not found again (its two little moons, a few thousand km up, are).
  result = updateProgress(result.progress, at(above('mars', 100)), BODIES);
  assert.deepEqual(result.events.filter((e) => e.bodyId === 'mars'), []);
  assert.deepEqual(result.events.map((e) => e.bodyId).sort(), ['deimos', 'phobos']);
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

test('the start discovers nothing new: the Moon waits just outside 50,000 km', () => {
  assert.deepEqual(updateProgress(createProgress(), at(START_POSITION), BODIES).events, []);
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
    discovered: 2, landed: 1, photos: 1, stories: 0, bodies: BODIES.length, missions: MISSIONS.length, storyTotal: 0,
  });
  const withStories = summarize({ ...progress, stories: ['giotto'] }, BODIES, MISSIONS, STORIES);
  assert.equal(withStories.stories, 1);
  assert.equal(withStories.storyTotal, 71);
});

test('sanitizeProgress drops junk from storage and keeps known ids', () => {
  const junk = { discovered: ['mars', 'vulcan', 3], landed: 'moon', photos: ['eclipse', 'eclipse', 'fake'] };
  assert.deepEqual(sanitizeProgress(junk, BODIES, MISSIONS), { discovered: ['earth', 'mars'], landed: [], photos: ['eclipse'], stories: [], craft: [] });
  const kept = sanitizeProgress({ stories: ['giotto', 'giotto', 'atlantis', 7] }, BODIES, MISSIONS, STORIES);
  assert.deepEqual(kept.stories, ['giotto']);
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

test('a log saved when there were 75 slots still reads, as 75 of 89', () => {
  const old = {
    discovered: BODIES.slice(0, 29).map((b) => b.id),
    landed: BODIES.slice(0, 29).map((b) => b.id),
    photos: MISSIONS.slice(0, 17).map((m) => m.id),
  };
  const read = sanitizeProgress(JSON.parse(JSON.stringify(old)), BODIES, MISSIONS);
  const summary = summarize(read, BODIES, MISSIONS);
  assert.deepEqual(score(summary), { done: 75, total: 89 });
  assert.equal(isComplete(summary), false);
  // With the 71 story places and 35 bodies the same log is 75 of 160.
  assert.deepEqual(score(summarize(sanitizeProgress(old, BODIES, MISSIONS, STORIES), BODIES, MISSIONS, STORIES)), { done: 75, total: 160 });
});

test('recordStories keeps the first visit only', () => {
  let { progress, newly } = recordStories(createProgress(), ['cassini']);
  assert.deepEqual(newly, ['cassini']);
  ({ progress, newly } = recordStories(progress, ['cassini', 'giotto']));
  assert.deepEqual(newly, ['giotto']);
  assert.deepEqual(progress.stories, ['cassini', 'giotto']);
  assert.deepEqual(recordStories(progress, ['giotto']).newly, []);
  // A log from before story places existed has no list yet.
  assert.deepEqual(recordStories({ discovered: ['earth'], landed: [], photos: [] }, ['giotto']).progress.stories, ['giotto']);
});

test('the tour is not complete until every story place is visited', () => {
  const all = {
    discovered: BODIES.map((b) => b.id), landed: BODIES.map((b) => b.id), photos: MISSIONS.map((m) => m.id),
    stories: STORIES.map((s) => s.id),
  };
  assert.equal(isComplete(summarize(all, BODIES, MISSIONS, STORIES)), true);
  assert.equal(isComplete(summarize({ ...all, stories: all.stories.slice(1) }, BODIES, MISSIONS, STORIES)), false);
});
