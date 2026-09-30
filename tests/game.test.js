import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createState, step, stopNow } from '../src/core/game.js';
import { C, ZONES, speedZone } from '../src/core/flight.js';
import { lookAtDirection } from '../src/core/orientation.js';
import { BODIES, START_POSITION, bodyById, nearestSurface } from '../src/core/bodies.js';

const DT = 1 / 60;
const ball = { id: 'ball', name: '공', kind: 'planet', radiusKm: 1000, position: [0, 0, 0] };
const facingBall = lookAtDirection([0, 0, 1]);
const awayFromBall = lookAtDirection([0, 0, -1]);

function run(state, input, steps, bodies) {
  const events = [];
  for (let i = 0; i < steps; i++) {
    const result = step(state, input, DT, bodies);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

test('createState starts at rest in the zone of its position', () => {
  const state = createState(START_POSITION);
  assert.equal(state.speed, 0);
  assert.equal(state.zoneId, 'near');
  assert.equal(state.restingOn, null);
});

test('zero or negative dt changes nothing', () => {
  const state = createState(START_POSITION);
  assert.deepEqual(step(state, { drive: 1 }, 0).state, state);
  assert.deepEqual(step(state, { drive: 1 }, -1).state, state);
});

test('full throttle reaches 1000c in three seconds in empty space', () => {
  const state = createState([0, 0, 0], [0, 0, 0, 1], []);
  const after = run(state, { drive: 1 }, 180, []).state;
  assert.ok(Math.abs(after.speed - C * 1000) < 1e-2);
  assert.ok(run(state, { drive: 1 }, 170, []).state.speed < C * 1000);
});

test('releasing input stops within one second from any speed', () => {
  for (const speed of [C * 0.01, C * 0.1, C * 1000]) {
    const state = { ...createState([0, 0, 0], [0, 0, 0, 1], []), speed };
    const after = run(state, { drive: 0 }, 61, []).state;
    assert.equal(after.speed, 0);
  }
});

test('stopNow halts at once', () => {
  const moving = { ...createState([0, 0, 0], [0, 0, 0, 1], []), speed: C, brakeRate: C };
  assert.equal(stopNow(moving).speed, 0);
  assert.equal(stopNow(moving).brakeRate, 0);
});

test('a fast dive stops on the surface, never inside, announcing each zone once', () => {
  let state = { ...createState([0, 0, -1e7], facingBall, [ball]), speed: C * 1000 };
  const events = [];
  for (let i = 0; i < 5000 && state.restingOn === null; i++) {
    const result = step(state, { drive: 1 }, DT, [ball]);
    state = result.state;
    events.push(...result.events);
    const distance = Math.hypot(...state.position);
    assert.ok(distance >= ball.radiusKm - 1e-6, 'went inside the body');
    const zone = speedZone(distance - ball.radiusKm);
    assert.ok(state.speed <= zone.maxSpeed + 1e-6, 'faster than the zone allows');
  }
  assert.equal(state.restingOn, 'ball');
  assert.equal(state.speed, 0);
  assert.deepEqual(events, [
    { type: 'zoneChanged', from: 'far', to: 'near' },
    { type: 'zoneChanged', from: 'near', to: 'veryNear' },
    { type: 'surfaceReached', bodyId: 'ball' },
  ]);
});

test('resting on a surface while pushing inward stays put without repeating the arrival', () => {
  let state = { ...createState([0, 0, -1000], facingBall, [ball]) };
  const { state: after, events } = run(state, { drive: 1 }, 120, [ball]);
  assert.deepEqual(events, [{ type: 'surfaceReached', bodyId: 'ball' }]);
  assert.ok(Math.abs(Math.hypot(...after.position) - 1000) < 1e-6);
});

test('idle on a surface produces no events', () => {
  const state = createState([0, 0, -1000], facingBall, [ball]);
  assert.deepEqual(run(state, {}, 120, [ball]).events, []);
});

test('a traveler on the surface can leave outward at once, announcing each zone once', () => {
  const state = createState([0, 0, -1000], awayFromBall, [ball]);
  const { state: after, events } = run(state, { drive: 1 }, 600, [ball]);
  assert.ok(Math.hypot(...after.position) > 1000 + 50000);
  assert.deepEqual(events, [
    { type: 'zoneChanged', from: 'veryNear', to: 'near' },
    { type: 'zoneChanged', from: 'near', to: 'far' },
  ]);
});

test('boundary rest: sitting exactly on the 50,000 km shell emits no events', () => {
  const state = createState([0, 0, -(1000 + 50000)], awayFromBall, [ball]);
  assert.deepEqual(run(state, {}, 120, [ball]).events, []);
});

test('reverse near a body: S while diving at full near-zone speed brakes, never enters, then backs away', () => {
  let state = { ...createState([0, 0, -(1000 + 40000)], facingBall, [ball]), speed: C * 0.1 };
  const { state: after } = run(state, { drive: -1 }, 180, [ball]);
  assert.ok(Math.hypot(...after.position) >= 1000 - 1e-6);
  assert.equal(after.motionSign, -1);
  assert.ok(after.speed > 0);
});

test('the real table: diving from the start at Earth lands on Earth', () => {
  let state = createState(START_POSITION);
  const { state: after, events } = run(state, { drive: 1 }, 600, BODIES);
  assert.equal(after.restingOn, 'earth');
  assert.ok(Math.abs(nearestSurface(after.position).distance) < 1e-6);
  assert.ok(events.some((e) => e.type === 'surfaceReached' && e.bodyId === 'earth'));
});

test('a move that ends just past a zone shell still lands inside it', () => {
  // Shell of the near zone around the ball is at 51,000 km from its center.
  // Travel 1.0005 km in one frame starting 1 km outside it: less than t + inset.
  const speed = 1.0005 * 60;
  let state = { ...createState([0, 0, -(51000 + 1)], facingBall, [ball]), speed };
  const first = step(state, { drive: 1, throttle: 0 }, DT, [ball]);
  assert.ok(Math.hypot(...first.state.position) < 51000, 'must end inside the shell');
  assert.deepEqual(first.events, [{ type: 'zoneChanged', from: 'far', to: 'near' }]);
  const { events } = run(first.state, {}, 30, [ball]);
  assert.deepEqual(events, []);
});
