import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  PRACTICE_STEPS, RING_KM, FAR_KM, FREE_RINGS, createPractice, updatePractice, practiceGoal, slideSide, tagSpot,
} from '../src/core/practice.js';

const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// A pose looking along `forward`, level.
const pose = (position, forward = [0, 0, 1], more = {}) => {
  const f = unit(forward);
  const right = unit(cross([0, 1, 0], f));
  return { position, forward: f, right, up: cross(f, right), speed: 0, sliding: false, ...more };
};
const facing = (practice, position) => pose(position, sub(practice.ring, position));

test('the six lessons come in order, each with a line and the control it teaches', () => {
  assert.deepEqual(PRACTICE_STEPS, ['look', 'fly', 'stop', 'slide', 'find', 'free']);
  const start = pose([0, 0, 0]);
  let practice = createPractice(start);
  assert.equal(practice.step, 'look');
  assert.equal(practiceGoal(practice).count, '1/6');
  assert.equal(practiceGoal(practice).teach, null);
  assert.ok(Math.abs(Math.hypot(...practice.ring) - FAR_KM) < FAR_KM * 0.01, 'the first ring is one flight off');

  // 1. Looking at something else does nothing; turning the view onto the ring does.
  practice = updatePractice(practice, start);
  assert.equal(practice.step, 'look');
  practice = updatePractice(practice, facing(practice, [0, 0, 0]));
  assert.equal(practice.step, 'fly');
  assert.deepEqual(practice.events, ['step']);
  assert.equal(practiceGoal(practice).teach, 'fly');
  // (The line names the key on the screen: the game is played on phones.)
  assert.match(practiceGoal(practice).text, /전진 버튼/);

  // 2. Flying into the ring she found.
  const ring = practice.ring;
  practice = updatePractice(practice, facing(practice, ring.map((n) => n * 0.5)));
  assert.equal(practice.step, 'fly');
  assert.deepEqual(practice.events, []);
  const through = pose(ring.map((n) => n * (1 - (RING_KM * 0.5) / FAR_KM)), ring, { speed: 5000 });
  practice = updatePractice(practice, through);
  assert.equal(practice.step, 'stop');
  assert.deepEqual(practice.events, ['ring', 'step']);
  assert.ok(Math.hypot(...sub(practice.ring, through.position)) > FAR_KM, 'a new ring ahead');

  // 3. Standing still does not count as stopping: she must have flown first.
  practice = updatePractice(practice, { ...through, speed: 0 });
  assert.equal(practice.step, 'stop');
  practice = updatePractice(practice, { ...through, speed: 9000 });
  practice = updatePractice(practice, { ...through, speed: 0 });
  assert.equal(practice.step, 'slide');
  assert.equal(practiceGoal(practice).teach, 'slide');

  // 4. Turning to face the ring is not a slide; sliding until it is before her is.
  const from = through.position;
  assert.equal(slideSide(practice, through), 1, 'the ring is put to her right');
  practice = updatePractice(practice, facing(practice, from));
  assert.equal(practice.step, 'slide');
  const acrossKm = practice.ring.map((n, i) => n - from[i]).reduce((s, n, i) => s + n * through.right[i], 0);
  const beside = from.map((n, i) => n + through.right[i] * acrossKm);
  practice = updatePractice(practice, { ...through, position: beside, sliding: true });
  assert.equal(practice.step, 'find');
  assert.equal(practiceGoal(practice).tag, true);

  // 5. The ring behind her, reached.
  const at = { ...through, position: beside };
  assert.ok(sub(practice.ring, beside).reduce((s, n, i) => s + n * at.forward[i], 0) < 0, 'behind her');
  practice = updatePractice(practice, pose(practice.ring));
  assert.equal(practice.step, 'free');
  assert.equal(practice.left, FREE_RINGS);
  assert.match(practiceGoal(practice).text, new RegExp(`${FREE_RINGS}개`));

  // 6. Three rings one after another, then it is over.
  for (let n = FREE_RINGS; n > 1; n--) {
    practice = updatePractice(practice, pose(practice.ring));
    assert.equal(practice.step, 'free');
    assert.equal(practice.left, n - 1);
    assert.deepEqual(practice.events, ['ring']);
  }
  practice = updatePractice(practice, pose(practice.ring));
  assert.equal(practice.step, null);
  assert.deepEqual(practice.events, ['ring', 'step', 'finished']);
  assert.equal(practiceGoal(practice), null);
  // (Told once.)
  assert.deepEqual(updatePractice(practice, pose([0, 0, 0])).events, []);
});

test('a near miss counts once she is going away again, a wide one does not', () => {
  let practice = updatePractice(createPractice(pose([0, 0, 0])), pose([0, 0, 0]));
  practice = updatePractice(practice, facing(practice, [0, 0, 0]));
  assert.equal(practice.step, 'fly');
  const ring = practice.ring;
  // (Square to the way to the ring.)
  const off = unit(cross(ring, [0, 0, 1]));
  const aside = (km, along) => ring.map((n, i) => n * along + off[i] * km);
  // Coming nearer, 10,000 km to its side: not yet.
  practice = updatePractice(practice, pose(aside(10000, 0.98)));
  practice = updatePractice(practice, pose(aside(10000, 1)));
  assert.equal(practice.step, 'fly');
  // Past it and going away: reached.
  practice = updatePractice(practice, pose(aside(10000, 1.02)));
  assert.equal(practice.step, 'stop');
  // (Twenty thousand km to its side is a miss.)
  let wide = updatePractice(createPractice(pose([0, 0, 0])), pose([0, 0, 0]));
  wide = updatePractice(wide, facing(wide, [0, 0, 0]));
  for (const along of [0.98, 1, 1.02]) wide = updatePractice(wide, pose(wide.ring.map((n, i) => n * along + off[i] * 20000)));
  assert.equal(wide.step, 'fly');
});

test('a ring left far behind comes round before her again', () => {
  let practice = updatePractice(createPractice(pose([0, 0, 0])), pose([0, 0, 0]));
  const away = pose([0, 0, -FAR_KM * 5]);
  practice = updatePractice(practice, away);
  const to = sub(practice.ring, away.position);
  assert.ok(Math.abs(Math.hypot(...to) - FAR_KM) < 1);
  assert.ok(to[2] > FAR_KM * 0.99, 'straight ahead');
});

test('the ring\'s name tag sits on the ring in view and on the edge toward it out of view', () => {
  const camera = { forward: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0], fov: Math.PI / 3 };
  const [w, h] = [402, 657];
  const ahead = tagSpot([0, 0, 1000], [0, 0, 0], camera, w, h);
  assert.deepEqual([Math.round(ahead.x), Math.round(ahead.y), ahead.off], [201, 329, false]);
  const upRight = tagSpot([100, 200, 1000], [0, 0, 0], camera, w, h);
  assert.ok(upRight.x > 201 && upRight.y < 329 && !upRight.off);
  // To the right, out of view: on the right edge, pointing right.
  const right = tagSpot([5000, 0, 1000], [0, 0, 0], camera, w, h);
  assert.ok(right.off && Math.abs(right.x - (w - 44)) < 1 && Math.abs(right.y - h / 2) < 1 && Math.abs(right.angle) < 0.01);
  // Behind and below: on the bottom edge.
  const behind = tagSpot([-10, -500, -1000], [0, 0, 0], camera, w, h);
  assert.ok(behind.off && Math.abs(behind.y - (h - 44)) < 1 && behind.x < w / 2);
  // Dead astern: somewhere on the edge all the same.
  const astern = tagSpot([0, 0, -1000], [0, 0, 0], camera, w, h);
  assert.ok(astern.off && Number.isFinite(astern.x) && Number.isFinite(astern.y));
});
