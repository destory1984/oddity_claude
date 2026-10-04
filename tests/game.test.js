import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createState, step, stopNow, totalSpeed, carryAlong, START_ORIENTATION, startOrientation, keepRange, slideCap, LOCK_TURN_RATE } from '../src/core/game.js';
import { C, speedLimit, MAX_SPEED, ACCELERATION_SECONDS } from '../src/core/flight.js';
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

test('createState starts at rest', () => {
  const state = createState(START_POSITION);
  assert.equal(state.speed, 0);
  assert.equal('zoneId' in state, false);
  assert.equal(state.restingOn, null);
});
test('zero or negative dt changes nothing', () => {
  const state = createState(START_POSITION);
  assert.deepEqual(step(state, { drive: 1 }, 0).state, state);
  assert.deepEqual(step(state, { drive: 1 }, -1).state, state);
});

test('full throttle reaches 100c in six seconds in empty space', () => {
  const state = createState([0, 0, 0], [0, 0, 0, 1], []);
  const after = run(state, { drive: 1 }, 360, []).state;
  assert.ok(Math.abs(after.speed - MAX_SPEED) < 1e-3);
  assert.ok(run(state, { drive: 1 }, 350, []).state.speed < MAX_SPEED);
});

test('releasing the keys keeps the speed: the traveler coasts', () => {
  for (const speed of [C * 0.01, C * 0.1, C * 100]) {
    const state = { ...createState([0, 0, 0], [0, 0, 0, 1], []), speed };
    const after = run(state, { drive: 0 }, 300, []).state;
    assert.equal(after.speed, speed);
    assert.ok(Math.abs(after.position[2] - speed * 5) < speed * 1e-6, 'five seconds straight ahead');
  }
});

test('coasting toward a body still slows to its limit and lands without passing through', () => {
  let state = { ...createState([0, 0, -(1000 + 40000)], facingBall, [ball]), speed: C * 0.1 };
  const { state: after, events } = run(state, {}, 1200, [ball]);
  assert.equal(after.restingOn, 'ball');
  assert.ok(Math.abs(Math.hypot(...after.position) - 1000) < 1e-6);
  assert.equal(events.filter((e) => e.type === 'surfaceReached').length, 1);
});

test('pressing the other way while coasting brakes to a stop in one second, then goes back', () => {
  const state = { ...createState([0, 0, 0], [0, 0, 0, 1], []), speed: C };
  const braking = run(state, { drive: -1 }, 30, []).state;
  assert.equal(braking.motionSign, 1);
  assert.ok(Math.abs(braking.speed - C / 2) < C * 1e-6);
  const back = run(state, { drive: -1 }, 90, []).state;
  assert.equal(back.motionSign, -1);
  assert.ok(back.speed > 0);
  // Letting go halfway through the braking keeps what speed is left.
  const let_go = run(braking, {}, 120, []).state;
  assert.ok(Math.abs(let_go.speed - C / 2) < C * 1e-6);
  assert.equal(let_go.brakeRate, 0);
});

test('stopNow halts at once', () => {
  const moving = { ...createState([0, 0, 0], [0, 0, 0, 1], []), speed: C, brakeRate: C };
  assert.equal(stopNow(moving).speed, 0);
  assert.equal(stopNow(moving).brakeRate, 0);
});

test('a fast dive slows with the distance and stops on the surface, never inside', () => {
  let state = { ...createState([0, 0, -1e7], facingBall, [ball]), speed: MAX_SPEED };
  const events = [];
  for (let i = 0; i < 20000 && state.restingOn === null; i++) {
    const result = step(state, { drive: 1 }, DT, [ball]);
    state = result.state;
    events.push(...result.events);
    const distance = Math.hypot(...state.position);
    assert.ok(distance >= ball.radiusKm - 1e-6, 'went inside the body');
    assert.ok(state.speed <= speedLimit(distance - ball.radiusKm) + 1e-6, 'faster than the limit');
  }
  assert.equal(state.restingOn, 'ball');
  assert.equal(state.speed, 0);
  assert.deepEqual(events, [{ type: 'surfaceReached', bodyId: 'ball' }]);
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

test('leaving a surface the speed grows a little every frame, never in a jump', () => {
  let state = createState([0, 0, -1000], awayFromBall, [ball]);
  const events = [];
  for (let i = 0; i < 60 * 20; i++) {
    const before = state;
    const result = step(state, { drive: 1 }, DT, [ball]);
    state = result.state;
    events.push(...result.events);
    const limit = speedLimit(Math.hypot(...before.position) - ball.radiusKm);
    assert.ok(state.speed - before.speed <= limit / ACCELERATION_SECONDS * DT + 1e-6, `jumped at frame ${i}`);
  }
  assert.ok(Math.hypot(...state.position) > 5e5, 'got far away in 20 s');
  assert.deepEqual(events, []);
});
test('reverse near a body: S while diving brakes, never enters, then backs away', () => {
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

test('strafing right slides along the body right axis at the limit within six seconds', () => {
  const state = createState([0, 0, 0], [0, 0, 0, 1], []);
  const after = run(state, { strafe: 1 }, 360, []).state;
  assert.ok(after.position[0] > 0, 'moved right');
  assert.ok(Math.abs(after.position[2]) < 1e-6, 'no forward motion');
  assert.ok(Math.abs(totalSpeed(after) - MAX_SPEED) < 1e-3);
});

test('strafing left moves the other way', () => {
  const after = run(createState([0, 0, 0], [0, 0, 0, 1], []), { strafe: -1 }, 30, []).state;
  assert.ok(after.position[0] < 0);
});

test('forward plus sideways never exceeds the limit', () => {
  let state = createState([0, 0, 0], [0, 0, 0, 1], []);
  for (let i = 0; i < 400; i++) {
    state = step(state, { drive: 1, strafe: 1 }, DT, []).state;
    assert.ok(totalSpeed(state) <= MAX_SPEED + 1e-6);
  }
  assert.ok(state.position[0] > 0 && state.position[2] > 0);
});

test('releasing A or D keeps the slide going; Space stops everything', () => {
  const moving = run(createState([0, 0, 0], [0, 0, 0, 1], []), { strafe: 1 }, 120, []).state;
  const after = run(moving, {}, 61, []).state;
  assert.equal(totalSpeed(after), totalSpeed(moving));
  assert.ok(after.position[0] > moving.position[0]);
  assert.equal(totalSpeed(stopNow(after)), 0);
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

test('on a tall phone screen the opening view faces Earth squarely', async () => {
  const { frameBodies } = await import('../src/core/framing.js');
  const portrait = startOrientation(390 / 844);
  const frames = frameBodies({ position: START_POSITION, orientation: portrait, fovY: Math.PI / 3, aspect: 390 / 844, bodies: BODIES });
  const earth = frames.find((f) => f.body.id === 'earth');
  const toEarth = earth.direction;
  const f = [2 * (portrait[0] * portrait[2] + portrait[3] * portrait[1]), 0, 1 - 2 * (portrait[0] ** 2 + portrait[1] ** 2)];
  assert.ok(toEarth[0] * f[0] + toEarth[2] * f[2] > 0.999, 'Earth dead ahead');
  assert.deepEqual(startOrientation(16 / 9), START_ORIENTATION);
});

test('a drift carries the traveler along whatever way they face, until they stop', () => {
  // 72 km/s toward +x while facing +z with no keys held.
  let state = { ...createState([0, 0, 0], [0, 0, 0, 1], []), drift: [72, 0, 0] };
  const after = run(state, {}, 120, []).state;
  assert.ok(Math.abs(after.position[0] - 144) < 1e-6, `${after.position[0]}`);
  assert.ok(Math.abs(after.position[2]) < 1e-9);
  assert.deepEqual(after.drift, [72, 0, 0]);
  assert.ok(Math.abs(totalSpeed(after) - 72) < 1e-9);
  // Turning does not turn the drift.
  const turned = run(state, { turnX: 1 }, 60, []).state;
  assert.deepEqual(turned.drift, [72, 0, 0]);
  // Thrust adds to it; Space ends it.
  const thrusting = run(state, { drive: 1 }, 60, []).state;
  assert.ok(thrusting.position[0] > 71 && thrusting.position[2] > 1000);
  assert.deepEqual(stopNow(after).drift, [0, 0, 0]);
  assert.equal(totalSpeed(stopNow(after)), 0);
});

test('a new state has no drift, and an old state without the field still flies', () => {
  assert.deepEqual(createState([0, 0, 0]).drift, [0, 0, 0]);
  const { drift, ...old } = createState([0, 0, 0], [0, 0, 0, 1]);
  const after = run({ ...old, speed: 100 }, {}, 60, []).state;
  assert.ok(Math.abs(after.position[2] - 100) < 1e-6);
  assert.deepEqual(after.drift, [0, 0, 0]);
});

test('drifting into a body lands on it and the drift ends', () => {
  let state = { ...createState([0, 0, -(1000 + 500)], facingBall, [ball]), drift: [0, 0, 72] };
  const { state: after, events } = run(state, {}, 600, [ball]);
  assert.equal(after.restingOn, 'ball');
  assert.deepEqual(after.drift, [0, 0, 0]);
  assert.equal(events.filter((e) => e.type === 'surfaceReached').length, 1);
});

test('a drift faster than the speed limit is cut down to it', () => {
  // 4 km above the ball the limit is 0.01c.
  const state = { ...createState([0, 0, -1004], awayFromBall, [ball]), drift: [0, 0, -C] };
  const after = step(state, {}, DT, [ball]).state;
  assert.ok(Math.abs(totalSpeed(after) - C * 0.01) < 1e-6);
});

test('rise slides her along her own up axis without turning her, and keeps to the limit with the other axes', () => {
  const state = createState([0, 0, 0], [0, 0, 0, 1], []);
  const up = run(state, { rise: 1 }, 60, []).state;
  assert.ok(up.position[1] > 0 && Math.abs(up.position[0]) < 1e-6 && Math.abs(up.position[2]) < 1e-6);
  assert.deepEqual(up.orientation, [0, 0, 0, 1]);
  assert.equal(up.speed, 0);
  assert.ok(up.riseSpeed > 0 && up.riseSign === 1);
  const down = run(state, { rise: -1 }, 60, []).state;
  assert.ok(down.position[1] < 0 && down.riseSign === -1);
  // Letting go coasts; pressing the other way brakes within a second and goes back.
  const coast = run(up, {}, 30, []).state;
  assert.equal(coast.riseSpeed, up.riseSpeed);
  assert.equal(run(up, { rise: -1 }, 90, []).state.riseSign, -1);
  // All three together never pass the limit, and stopping clears the slide too.
  const all = run(state, { drive: 1, strafe: 1, rise: 1 }, 400, []).state;
  assert.ok(totalSpeed(all) <= MAX_SPEED + 1e-6);
  assert.equal(stopNow(all).riseSpeed, 0);
});

test('keepRange puts her back at the same distance from the centre, the same way from it', () => {
  const at = keepRange([30, 40, 0], [0, 0, 0], 100);
  assert.ok(Math.abs(at[0] - 60) < 1e-9 && Math.abs(at[1] - 80) < 1e-9 && at[2] === 0);
  const off = keepRange([10, 0, 5], [10, 0, 0], 2);
  assert.deepEqual(off, [10, 0, 2]);
  assert.deepEqual(keepRange([1, 2, 3], [1, 2, 3], 50), [1, 2, 3]);
});

test('round a locked target she slides no faster than half a radian a second', () => {
  assert.equal(LOCK_TURN_RATE, 0.5);
  // 300 km from Tiangong: 150 km/s, a turn in 12.6 s (at the 3,000 km/s the limit allows there it was a turn in 0.6 s).
  assert.equal(slideCap(300), 150);
  assert.equal(slideCap(40000), 20000);
});
