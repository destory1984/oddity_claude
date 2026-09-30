import { test } from 'vitest';
import assert from 'node:assert/strict';
import { cueForEvent, engineSound } from '../src/core/audio.js';

test('each game event maps to one sound cue', () => {
  assert.equal(cueForEvent({ type: 'surfaceReached', bodyId: 'moon' }), 'landed');
  assert.equal(cueForEvent({ type: 'discovered', bodyId: 'mars' }), 'discovered');
  assert.equal(cueForEvent({ type: 'landed', bodyId: 'mars' }), null, 'the thud already played');
  assert.equal(cueForEvent({ type: 'photo', missionName: 'x' }), 'mission');
  assert.equal(cueForEvent({ type: 'other' }), null);
});

test('engine is silent at rest and grows with thrust and speed', () => {
  const rest = engineSound({ speed: 0, maxSpeed: 1000, thrusting: false });
  assert.equal(rest.gain, 0);
  const idleThrust = engineSound({ speed: 0, maxSpeed: 1000, thrusting: true });
  const fastThrust = engineSound({ speed: 1000, maxSpeed: 1000, thrusting: true });
  assert.ok(idleThrust.gain > 0);
  assert.ok(fastThrust.gain > idleThrust.gain);
  assert.ok(fastThrust.pitch > idleThrust.pitch);
  const coasting = engineSound({ speed: 1000, maxSpeed: 1000, thrusting: false });
  assert.ok(coasting.gain > 0 && coasting.gain < fastThrust.gain, 'a quiet rush while coasting');
});

test('engine values stay in a safe range even past the limit', () => {
  const s = engineSound({ speed: 5000, maxSpeed: 1000, thrusting: true });
  assert.ok(s.gain <= 0.25 && s.pitch <= 660);
});

test('the flight tone sits in a light, high register rather than an engine rumble', () => {
  const slow = engineSound({ speed: 0, maxSpeed: 1000, thrusting: true });
  const fast = engineSound({ speed: 1000, maxSpeed: 1000, thrusting: true });
  assert.ok(slow.pitch >= 330, 'no low hum');
  assert.equal(fast.pitch, 660);
  assert.ok(fast.sparkle > slow.sparkle && slow.sparkle > 0, 'more twinkles when faster');
  assert.equal(engineSound({ speed: 0, maxSpeed: 1000, thrusting: false }).sparkle, 0);
});
