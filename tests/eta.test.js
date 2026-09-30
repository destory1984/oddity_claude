import { test } from 'vitest';
import assert from 'node:assert/strict';
import { estimateTravelSeconds } from '../src/core/eta.js';
import { createState, step } from '../src/core/game.js';
import { lookAtDirection } from '../src/core/orientation.js';
import { BODIES, START_POSITION, bodyById } from '../src/core/bodies.js';

const ball = (id, z, radiusKm = 1000) => ({ id, name: id, kind: 'planet', radiusKm, position: [0, 0, z] });

test('matches flying the real rules straight at the target', () => {
  const dt = 1 / 20;
  const earth = bodyById('earth');
  let state = createState(START_POSITION);
  state = { ...state, orientation: lookAtDirection(earth.position.map((n, i) => n - START_POSITION[i])) };
  let t = 0;
  while (state.restingOn !== 'earth') {
    state = step(state, { drive: 1 }, dt, BODIES).state;
    t += dt;
  }
  const estimate = estimateTravelSeconds(createState(START_POSITION), 'earth', BODIES, { dt });
  assert.ok(Math.abs(estimate.seconds - t) < 1e-9, `${estimate.seconds} vs ${t}`);
});

test('already on the target is zero', () => {
  const state = { ...createState([0, 0, -1000], [0, 0, 0, 1], [ball('x', 0)]), restingOn: 'x' };
  assert.deepEqual(estimateTravelSeconds(state, 'x', [ball('x', 0)]), { seconds: 0 });
});

test('a body in the way is named', () => {
  const bodies = [ball('wall', 10000), ball('goal', 100000)];
  assert.deepEqual(estimateTravelSeconds(createState([0, 0, 0], [0, 0, 0, 1], bodies), 'goal', bodies), { blockedBy: 'wall' });
});

test('gives up past the time limit', () => {
  const bodies = [ball('goal', 1e9)];
  assert.equal(estimateTravelSeconds(createState([0, 0, 0], [0, 0, 0, 1], bodies), 'goal', bodies, { maxSeconds: 0.5 }), null);
});

test('every planet from the start is reachable in under a minute or reports what blocks it', () => {
  for (const body of BODIES.filter((b) => b.kind === 'planet' && b.id !== 'earth')) {
    const seconds = estimateTravelSeconds(createState(START_POSITION), body.id, BODIES);
    assert.ok(seconds.blockedBy || seconds.seconds < 60, `${body.id}: ${JSON.stringify(seconds)}`);
  }
});

test('gives up at once when even top speed cannot arrive in time', () => {
  const bodies = [ball('goal', 1e12)];
  const started = performance.now();
  const result = estimateTravelSeconds(createState([0, 0, 0], [0, 0, 0, 1], bodies), 'goal', bodies);
  const took = performance.now() - started;
  assert.equal(result, null);
  assert.ok(took < 5, `took ${took.toFixed(1)} ms; the full 600 s simulation takes about 50 ms`);
});
