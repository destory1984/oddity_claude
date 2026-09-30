import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createState, step, stopNow, totalSpeed, carryAlong, START_ORIENTATION } from '../src/core/game.js';
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

test('full throttle reaches 100c in three seconds in empty space', () => {
  const state = createState([0, 0, 0], [0, 0, 0, 1], []);
  const after = run(state, { drive: 1 }, 180, []).state;
  assert.ok(Math.abs(after.speed - C * 100) < 1e-3);
  assert.ok(run(state, { drive: 1 }, 170, []).state.speed < C * 100);
});

test('releasing input stops within one second from any speed', () => {
  for (const speed of [C * 0.01, C * 0.1, C * 100]) {
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
  let state = { ...createState([0, 0, -1e7], facingBall, [ball]), speed: C * 100 };
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

test('strafing right slides along the body right axis at the zone limit within three seconds', () => {
  const state = createState([0, 0, 0], [0, 0, 0, 1], []);
  const after = run(state, { strafe: 1 }, 180, []).state;
  assert.ok(after.position[0] > 0, 'moved right');
  assert.ok(Math.abs(after.position[2]) < 1e-6, 'no forward motion');
  assert.ok(Math.abs(totalSpeed(after) - C * 100) < 1e-3);
});

test('strafing left moves the other way', () => {
  const after = run(createState([0, 0, 0], [0, 0, 0, 1], []), { strafe: -1 }, 30, []).state;
  assert.ok(after.position[0] < 0);
});

test('forward plus sideways never exceeds the zone limit', () => {
  let state = createState([0, 0, 0], [0, 0, 0, 1], []);
  for (let i = 0; i < 400; i++) {
    state = step(state, { drive: 1, strafe: 1 }, DT, []).state;
    assert.ok(totalSpeed(state) <= C * 100 + 1e-6);
  }
  assert.ok(state.position[0] > 0 && state.position[2] > 0);
});

test('releasing A or D stops the slide within one second', () => {
  const moving = run(createState([0, 0, 0], [0, 0, 0, 1], []), { strafe: 1 }, 120, []).state;
  const after = run(moving, {}, 61, []).state;
  assert.equal(totalSpeed(after), 0);
});

test('sliding sideways into a body stops on its surface', () => {
  // Ball to the right of a traveler looking along +z.
  const side = { id: 'side', name: 'side', kind: 'planet', radiusKm: 1000, position: [5000, 0, 0] };
  let state = createState([0, 0, 0], [0, 0, 0, 1], [side]);
  for (let i = 0; i < 2000 && !state.restingOn; i++) state = step(state, { strafe: 1 }, DT, [side]).state;
  assert.equal(state.restingOn, 'side');
  assert.ok(Math.abs(Math.hypot(...state.position.map((n, i) => n - side.position[i])) - 1000) < 1e-6);
  assert.equal(totalSpeed(state), 0);
});

test('within 50,000 km of a surface the traveler rides along with that body', () => {
  const before = [{ ...ball, position: [0, 0, 0] }];
  const after = [{ ...ball, position: [300, 0, 0] }];
  const state = createState([0, 0, -1000 - 20000], facingBall, before);
  const carried = carryAlong(state, before, after);
  assert.deepEqual(carried.position, [300, 0, -21000]);
});

test('far from every surface nothing carries the traveler', () => {
  const before = [{ ...ball, position: [0, 0, 0] }];
  const after = [{ ...ball, position: [300, 0, 0] }];
  const state = createState([0, 0, -1e6], facingBall, before);
  assert.deepEqual(carryAlong(state, before, after).position, [0, 0, -1e6]);
});

test('the nearest body does the carrying when two are close', () => {
  const small = { id: 'small', name: 'small', kind: 'moon', radiusKm: 100, position: [0, 0, 0] };
  const big = { id: 'big', name: 'big', kind: 'planet', radiusKm: 1000, position: [0, 0, 30000] };
  const moved = [{ ...small, position: [0, 50, 0] }, { ...big, position: [0, 0, 30000] }];
  const state = createState([0, 0, -200], [0, 0, 0, 1], [small, big]);
  assert.deepEqual(carryAlong(state, [small, big], moved).position, [0, 50, -200]);
});

test('a body that moves into the traveler pushes them out to its surface', () => {
  const inside = createState([0, 0, -900], facingBall, [ball]);
  const { state, events } = step(inside, {}, DT, [ball]);
  assert.ok(Math.abs(Math.hypot(...state.position) - 1000) < 1e-6);
  assert.equal(state.restingOn, 'ball');
  assert.deepEqual(events, [{ type: 'surfaceReached', bodyId: 'ball' }]);
});

test('the opening view shows Earth and a sliver of the Sun on a wide screen', async () => {
  const { frameBodies } = await import('../src/core/framing.js');
  const frames = frameBodies({
    position: START_POSITION, orientation: START_ORIENTATION, fovY: Math.PI / 3, aspect: 16 / 9, bodies: BODIES,
  });
  const earth = frames.find((f) => f.body.id === 'earth');
  const sun = frames.find((f) => f.body.id === 'sun');
  assert.ok(earth.visible && !earth.hidden, 'Earth in view');
  assert.ok(sun.visible && !sun.hidden, 'Sun edge in view');
});
