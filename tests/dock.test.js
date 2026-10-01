import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DOCK_RANGE_KM, DOCK_GAP_KM, DOCK_MIN_ALTITUDE_KM, tooLowToDock, DOCK_SECONDS, dockable, dockOffset, dockedState, wantsToLeave, rideSpeed,
  startDocking, dockingOffset, countsBetween, isDocked, latchJolt, ZERO_WORD_S, JOLT_SECONDS, releaseDrift,
  DOCK_ASIDE, dockFacing, dockingFacing,
} from '../src/core/dock.js';
import { forward, rotateVector, conjugate } from '../src/core/orientation.js';
import { bodiesAt } from '../src/core/bodies.js';
import { craftAt } from '../src/core/craft.js';
import { createState } from '../src/core/game.js';

const hubble = { id: 'hubble', name: '허블 우주망원경', kind: 'craft', radiusKm: 15, position: [1000, 2000, 3000] };
const webb = { id: 'jwst', name: '제임스 웹 우주망원경', kind: 'craft', radiusKm: 15, position: [9000, 2000, 3000] };
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('a craft can be docked with from within 10,000 km, not from farther', () => {
  assert.equal(DOCK_RANGE_KM, 10000);
  assert.equal(dockable([1000, 2000, 3900], [hubble, webb]).id, 'hubble');
  assert.equal(dockable([1000, 2000, 12900], [hubble]).id, 'hubble');
  assert.equal(dockable([1000, 2000, 13001], [hubble]), null);
  assert.equal(dockable([0, 0, 0], []), null);
});

test('a craft less than 200 km above a surface cannot be docked with: LRO and Danuri, not the others', () => {
  assert.equal(DOCK_MIN_ALTITUDE_KM, 200);
  const bodies = bodiesAt(0);
  const low = craftAt(0, bodies).filter((c) => tooLowToDock(c, bodies)).map((c) => c.id);
  assert.deepEqual(low, ['danuri', 'lro']);
  const moon = bodies.find((b) => b.id === 'moon');
  const at = (km) => ({ id: 'x', position: [moon.position[0], moon.position[1] + moon.radiusKm + km, moon.position[2]] });
  assert.equal(tooLowToDock(at(199), bodies), true);
  assert.equal(tooLowToDock(at(201), bodies), false);
});

test('with two craft in range the nearer one is offered', () => {
  const close = { ...webb, position: [1000, 2000, 3500] };
  assert.equal(dockable([1000, 2000, 3400], [hubble, close]).id, 'jwst');
});

test('docking pulls the traveler in to 60 km, on the side they came from', () => {
  const offset = dockOffset([1000, 2000, 3800], hubble);
  near(Math.hypot(...offset), DOCK_GAP_KM);
  assert.deepEqual(offset, [0, 0, 60]);
  // Sitting exactly on the craft still gives a usable offset.
  near(Math.hypot(...dockOffset(hubble.position, hubble)), DOCK_GAP_KM);
});

test('while docked the traveler rides with the craft, at rest, keeping their heading', () => {
  const state = { ...createState([0, 0, 0], [0, 0.6, 0, 0.8]), speed: 500, sideSpeed: 40, restingOn: null };
  const moved = { ...hubble, position: [5000, 6000, 7000] };
  const docked = dockedState(state, moved, [0, 0, 60]);
  assert.deepEqual(docked.position, [5000, 6000, 7060]);
  assert.equal(docked.speed, 0);
  assert.equal(docked.sideSpeed, 0);
  assert.deepEqual(docked.orientation, [0, 0.6, 0, 0.8]);
});

test('thrusting any way undocks; turning to look around does not', () => {
  assert.equal(wantsToLeave({ drive: 1 }), true);
  assert.equal(wantsToLeave({ drive: -1 }), true);
  assert.equal(wantsToLeave({ strafe: 1 }), true);
  assert.equal(wantsToLeave({ turnX: 1, turnY: -1, roll: 1 }), false);
  assert.equal(wantsToLeave({}), false);
});

test('riding with Hubble shows its speed round Earth: about 72 km a second of play', () => {
  // One frame at 60 frames a second; the game clock runs 720 times faster.
  const dt = 1 / 60;
  const before = bodiesAt(1000);
  const after = bodiesAt(1000 + dt * 720);
  const speed = rideSpeed('hubble', craftAt(1000, before), craftAt(1000 + dt * 720, after), before, after, dt);
  near(speed, (2 * Math.PI * (6371 + 540)) / 600, 0.5);
});

test('riding with Voyager 1 shows its speed away from the Sun, and no time passing shows none', () => {
  const dt = 1 / 60;
  const before = bodiesAt(0);
  const after = bodiesAt(dt * 720);
  near(rideSpeed('voyager1', craftAt(0, before), craftAt(dt * 720, after), before, after, dt), (17 * 720) / 100, 0.01);
  assert.equal(rideSpeed('voyager1', craftAt(0, before), craftAt(0, before), before, before, 0), 0);
});

test('docking glides in over the countdown instead of jumping', () => {
  assert.equal(DOCK_SECONDS, 6.1);
  let dock = startDocking([1000, 2000, 3800], hubble);
  assert.equal(dock.id, 'hubble');
  // At the first instant the traveler has not moved.
  assert.deepEqual(dockingOffset(dock), [0, 0, 800]);
  const frames = Math.round(DOCK_SECONDS * 60);
  const seen = [800];
  for (let i = 0; i < frames; i++) {
    dock = { ...dock, elapsed: dock.elapsed + 1 / 60 };
    seen.push(dockingOffset(dock)[2]);
  }
  // Always closing in, never past the docking spot, and there at the end.
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] <= seen[i - 1] + 1e-9 && seen[i] >= 60 - 1e-9);
  near(seen[frames], 60, 1e-6);
  // It sets off gently, but does not stop short and hang there: it is still closing
  // at a good pace when it touches (the jolt is what stops it).
  const half = Math.round(frames / 2);
  const early = seen[0] - seen[6];
  const middle = seen[half - 3] - seen[half + 3];
  const late = seen[frames - 6] - seen[frames];
  assert.ok(early < middle / 5, `${early} ${middle}`);
  assert.ok(late > middle / 4 && late < middle, `${late} ${middle}`);
  // In the last two seconds (the 2 and the 1) it covers a real share of the way.
  assert.ok(seen[frames - 120] - seen[frames] > 60, `${seen[frames - 120] - seen[frames]}`);
  // Long after, it stays put.
  near(dockingOffset({ ...dock, elapsed: 99 })[2], 60, 1e-9);
});

test('the countdown runs 3 to 0, one a second, and contact comes as the word zero ends', () => {
  // Nothing is counted for 2.5 seconds, while "Docking in progress" is being said
  // (it takes about two): otherwise the numbers queue up behind it and run late.
  assert.deepEqual(countsBetween(0, 2.4), []);
  assert.deepEqual(countsBetween(2.4, 2.5), [3]);
  assert.deepEqual(countsBetween(2.5, 3.4), []);
  assert.deepEqual(countsBetween(3.4, 3.6), [2]);
  // Zero is called 0.6 seconds before contact: the time it takes to say it.
  assert.equal(ZERO_WORD_S, 0.6);
  assert.deepEqual(countsBetween(5.4, 5.5), [0]);
  near(DOCK_SECONDS - 5.5, ZERO_WORD_S, 1e-9);
  assert.deepEqual(countsBetween(5.5, DOCK_SECONDS + 5), []);
  // Frame by frame, every number is called exactly once, in order.
  const called = [];
  for (let i = 0; i < 60 * 9; i++) called.push(...countsBetween(i / 60, (i + 1) / 60));
  assert.deepEqual(called, [3, 2, 1, 0]);
  // A long frame (a stutter) calls only the latest number, not a pile of them.
  assert.deepEqual(countsBetween(2, 3.6), [2]);
  assert.equal(isDocked({ elapsed: DOCK_SECONDS - 0.01 }), false);
  assert.equal(isDocked({ elapsed: DOCK_SECONDS }), true);
});

test('docking from inside the docking distance eases outward to it', () => {
  const dock = startDocking([1000, 2000, 3010], hubble);
  near(Math.hypot(...dockingOffset(dock)), 10);
  near(Math.hypot(...dockingOffset({ ...dock, elapsed: DOCK_SECONDS })), 60, 1e-9);
});

test('on contact the craft is jolted for a moment, at once', () => {
  const at = (afterContact) => latchJolt({ elapsed: DOCK_SECONDS + afterContact });
  // Nothing before contact, and it starts from rest.
  assert.deepEqual(latchJolt({ elapsed: DOCK_SECONDS - 0.5 }), { push: 0, tilt: 0 });
  assert.deepEqual(at(0), { push: 0, tilt: 0 });
  // A quick shove within the first tenth of a second...
  assert.ok(at(0.08).push > 0.04, `${at(0.08).push}`);
  // ...never more than a tenth of the craft's size, or four degrees of tilt...
  let swings = 0;
  let last = 0;
  for (let t = 0; t <= JOLT_SECONDS; t += 1 / 120) {
    const { push, tilt } = at(t);
    assert.ok(Math.abs(push) <= 0.1 && Math.abs(tilt) <= 0.07);
    if (push * last < 0) swings += 1;
    if (push !== 0) last = push;
  }
  // ...swinging back and forth a few times as it dies away, then still.
  assert.ok(swings >= 3, `${swings}`);
  assert.ok(Math.abs(at(1).push) < 0.01);
  assert.deepEqual(at(JOLT_SECONDS + 0.01), { push: 0, tilt: 0 });
});

test('letting go of Hubble keeps its speed round Earth: 72 km/s, measured against Earth', () => {
  const dt = 1 / 60;
  const before = bodiesAt(1000);
  const after = bodiesAt(1000 + dt * 720);
  const craftBefore = craftAt(1000, before);
  const craftAfter = craftAt(1000 + dt * 720, after);
  const hubbleNow = craftAfter.find((c) => c.id === 'hubble');
  const drift = releaseDrift('hubble', craftBefore, craftAfter, before, after, hubbleNow.position, dt);
  near(Math.hypot(...drift), (2 * Math.PI * (6371 + 540)) / 600, 0.5);
  // Earth's own motion round the Sun is not in it: the traveler is already carried with Earth there.
  const earthStep = after.find((b) => b.id === 'earth').position.map((n, i) => n - before.find((b) => b.id === 'earth').position[i]);
  const hubbleStep = hubbleNow.position.map((n, i) => n - craftBefore.find((c) => c.id === 'hubble').position[i]);
  drift.forEach((n, i) => near(n, (hubbleStep[i] - earthStep[i]) / dt, 1e-6));
});

test('letting go far from any body keeps the whole speed of the craft', () => {
  const dt = 1 / 60;
  const before = bodiesAt(0);
  const after = bodiesAt(dt * 720);
  const craftAfter = craftAt(dt * 720, after);
  const voyager = craftAfter.find((c) => c.id === 'voyager1');
  near(Math.hypot(...releaseDrift('voyager1', craftAt(0, before), craftAfter, before, after, voyager.position, dt)), 122.4, 0.1);
  // Webb is 150,000 km from Earth, outside the 50,000 km where Earth carries the traveler,
  // so it keeps Earth's whole speed round the Sun (about 333 km/s on the game clock).
  const webb = craftAfter.find((c) => c.id === 'jwst');
  const speed = Math.hypot(...releaseDrift('jwst', craftAt(0, before), craftAfter, before, after, webb.position, dt));
  assert.ok(speed > 300 && speed < 350, `${speed}`);
  assert.deepEqual(releaseDrift('jwst', craftAfter, craftAfter, after, after, webb.position, 0), [0, 0, 0]);
});

test('the view turns aside on the way in, so the craft ends up beside the traveler, not behind', () => {
  const at = [400, 2100, 3050];
  // Where the craft is in the traveler's own frame (x right, y up, z ahead).
  const seen = (q) => {
    const rel = hubble.position.map((n, i) => n - at[i]);
    const length = Math.hypot(...rel);
    return rotateVector(conjugate(q), rel).map((n) => n / length);
  };
  const wide = seen(dockFacing(at, hubble.position, true));
  near(wide[0], -Math.sin(DOCK_ASIDE.yaw), 1e-9);
  near(wide[1], 0, 1e-9);
  const tall = seen(dockFacing(at, hubble.position, false));
  near(tall[0], 0, 1e-9);
  near(tall[1], Math.sin(DOCK_ASIDE.pitch), 1e-9);
  // It starts as the traveler faced, gets there half a second before contact, and
  // once docked leaves the view alone.
  const from = [0, 0, 0, 1];
  const dock = startDocking(at, hubble);
  forward(dockingFacing(dock, from, at, hubble.position)).forEach((n, i) => near(n, [0, 0, 1][i], 1e-9));
  const late = dockingFacing({ ...dock, elapsed: DOCK_SECONDS - 0.4 }, from, at, hubble.position);
  forward(late).forEach((n, i) => near(n, forward(dockFacing(at, hubble.position))[i], 1e-9));
  assert.equal(dockingFacing({ ...dock, elapsed: DOCK_SECONDS }, from, at, hubble.position), null);
});

test('a craft low over a surface is docked with from straight above, and the glide stays out of the ground', () => {
  const bodies = bodiesAt(0);
  const moon = bodies.find((b) => b.id === 'moon');
  const danuri = craftAt(0, bodies).find((c) => c.id === 'danuri');
  assert.ok(tooLowToDock(danuri, bodies));
  const up = danuri.position.map((n, i) => n - moon.position[i]);
  const height = Math.hypot(...up);
  // Coming from the far side of the Moon.
  const from = moon.position.map((n, i) => n - (up[i] / height) * (moon.radiusKm + 3000));
  const dock = startDocking(from, danuri, bodies);
  dock.to.forEach((n, i) => near(n, (up[i] / height) * DOCK_GAP_KM, 1e-6));
  for (let t = 0; t <= DOCK_SECONDS; t += 0.1) {
    const state = dockedState(createState(from), danuri, dockingOffset({ ...dock, elapsed: t }), bodies);
    const above = Math.hypot(...state.position.map((n, i) => n - moon.position[i])) - moon.radiusKm;
    assert.ok(above >= 20 - 1e-6, `${t}: ${above}`);
  }
  const end = dockedState(createState(from), danuri, dockingOffset({ ...dock, elapsed: DOCK_SECONDS }), bodies);
  near(Math.hypot(...end.position.map((n, i) => n - danuri.position[i])), DOCK_GAP_KM, 1e-6);
});
