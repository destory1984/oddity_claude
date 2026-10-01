import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DOCK_RANGE_KM, DOCK_GAP_KM, dockable, dockOffset, dockedState, wantsToLeave, rideSpeed,
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
