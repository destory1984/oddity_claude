import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DOCK_RANGE_KM, DOCK_GAP_KM, DOCK_SECONDS, dockable, dockOffset, dockedState, wantsToLeave, rideSpeed,
  startDocking, dockingOffset, countsBetween, isDocked,
} from '../src/core/dock.js';
import { bodiesAt } from '../src/core/bodies.js';
import { craftAt } from '../src/core/craft.js';
import { createState } from '../src/core/game.js';

const hubble = { id: 'hubble', name: '허블 우주망원경', kind: 'craft', radiusKm: 15, position: [1000, 2000, 3000] };
const webb = { id: 'jwst', name: '제임스 웹 우주망원경', kind: 'craft', radiusKm: 15, position: [9000, 2000, 3000] };
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('a craft can be docked with from within 1,000 km, not from farther', () => {
  assert.equal(DOCK_RANGE_KM, 1000);
  assert.equal(dockable([1000, 2000, 3900], [hubble, webb]).id, 'hubble');
  assert.equal(dockable([1000, 2000, 4001], [hubble]), null);
  assert.equal(dockable([0, 0, 0], []), null);
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
  assert.equal(DOCK_SECONDS, 11.5);
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
  // Gentle at both ends: the first and last tenth of a second move far less than the middle.
  const half = Math.round(frames / 2);
  const early = seen[0] - seen[6];
  const middle = seen[half - 3] - seen[half + 3];
  const late = seen[frames - 6] - seen[frames];
  assert.ok(early < middle / 5 && late < middle / 5, `${early} ${middle} ${late}`);
  // Long after, it stays put.
  near(dockingOffset({ ...dock, elapsed: 99 })[2], 60, 1e-9);
});

test('the countdown runs 10 to 0, one a second, and 0 lands exactly when the glide ends', () => {
  // Nothing is counted while "Docking in progress" is being said.
  assert.deepEqual(countsBetween(0, 1.4), []);
  assert.deepEqual(countsBetween(1.4, 1.5), [10]);
  assert.deepEqual(countsBetween(1.5, 2.4), []);
  assert.deepEqual(countsBetween(2.4, 2.6), [9]);
  assert.deepEqual(countsBetween(DOCK_SECONDS - 0.01, DOCK_SECONDS), [0]);
  assert.deepEqual(countsBetween(DOCK_SECONDS, DOCK_SECONDS + 5), []);
  // Frame by frame, every number is called exactly once, in order.
  const called = [];
  for (let i = 0; i < 60 * 13; i++) called.push(...countsBetween(i / 60, (i + 1) / 60));
  assert.deepEqual(called, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  // A long frame (a stutter) calls only the latest number, not a pile of them.
  assert.deepEqual(countsBetween(3, 6.6), [5]);
  assert.equal(isDocked({ elapsed: DOCK_SECONDS - 0.01 }), false);
  assert.equal(isDocked({ elapsed: DOCK_SECONDS }), true);
});

test('docking from inside the docking distance eases outward to it', () => {
  const dock = startDocking([1000, 2000, 3010], hubble);
  near(Math.hypot(...dockingOffset(dock)), 10);
  near(Math.hypot(...dockingOffset({ ...dock, elapsed: DOCK_SECONDS })), 60, 1e-9);
});
