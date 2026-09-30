import { test } from 'vitest';
import assert from 'node:assert/strict';
import { frameBodies } from '../src/core/framing.js';
import { lookAtDirection } from '../src/core/orientation.js';

const DEG = Math.PI / 180;
const ball = (id, position, radiusKm = 1000, kind = 'planet') => ({ id, name: id, kind, radiusKm, position });
const view = (orientation, extra = {}) => ({ position: [0, 0, 0], orientation, fovY: 60 * DEG, aspect: 16 / 9, ...extra });

test('a body straight ahead is visible and its fill is its angular size over the view height', () => {
  const [f] = frameBodies({ ...view([0, 0, 0, 1]), bodies: [ball('a', [0, 0, 10000])] });
  assert.equal(f.visible, true);
  const expected = 2 * Math.asin(1000 / 10000);
  assert.ok(Math.abs(f.angularDiameter - expected) < 1e-12);
  assert.ok(Math.abs(f.fill - expected / (60 * DEG)) < 1e-12);
  assert.equal(f.distance, 10000);
});

test('a body behind the camera is not visible', () => {
  const [f] = frameBodies({ ...view([0, 0, 0, 1]), bodies: [ball('a', [0, 0, -10000])] });
  assert.equal(f.visible, false);
});

test('a wide screen sees farther sideways than up', () => {
  // 40 degrees off axis: outside the 30 degree half-height, inside the wide half-width.
  const side = [Math.sin(40 * DEG) * 1e6, 0, Math.cos(40 * DEG) * 1e6];
  const above = [0, Math.sin(40 * DEG) * 1e6, Math.cos(40 * DEG) * 1e6];
  const frames = frameBodies({ ...view([0, 0, 0, 1]), bodies: [ball('side', side, 1), ball('above', above, 1)] });
  assert.equal(frames[0].visible, true);
  assert.equal(frames[1].visible, false);
});

test('a large body counts as visible when only its edge reaches the frame', () => {
  // Center 50 degrees up, but the disc (radius ~30 degrees) reaches into the frame.
  const center = [0, Math.sin(50 * DEG) * 20000, Math.cos(50 * DEG) * 20000];
  const [f] = frameBodies({ ...view([0, 0, 0, 1]), bodies: [ball('big', center, 10000)] });
  assert.equal(f.visible, true);
});

test('the camera orientation is respected', () => {
  const target = ball('a', [10000, 0, 0]);
  assert.equal(frameBodies({ ...view([0, 0, 0, 1]), bodies: [target] })[0].visible, false);
  assert.equal(frameBodies({ ...view(lookAtDirection([1, 0, 0])), bodies: [target] })[0].visible, true);
});

test('a huge body whose center is behind the camera is visible only if its limb enters the frame', () => {
  // 100 km above a 1,737 km moon, looking level: the limb dips about 19 degrees below the view axis.
  const R = 1737.4;
  const moonBelow = ball('moon', [0, -(R + 100), 0], R, 'moon');
  const level = frameBodies({ ...view([0, 0, 0, 1]), bodies: [moonBelow] })[0];
  assert.equal(level.visible, true);
  // Looking 40 degrees up, the limb (19 degrees below level) falls under the 30 degree half-height.
  const upward = lookAtDirection([0, Math.sin(40 * DEG), Math.cos(40 * DEG)]);
  assert.equal(frameBodies({ ...view(upward), bodies: [moonBelow] })[0].visible, false);
});

test('a body entirely behind a nearer, larger disc is hidden', () => {
  const near = ball('near', [0, 0, 10000], 3000);
  const far = ball('far', [0, 0, 1e6], 1000);
  const beside = ball('beside', [5e5, 0, 1e6], 1000);
  const frames = frameBodies({ ...view([0, 0, 0, 1]), bodies: [near, far, beside] });
  assert.deepEqual(frames.map((f) => f.hidden), [false, true, false]);
});

test('a limb 40 degrees straight below the view axis is outside a 60 degree tall frame', () => {
  const R = 1737.4;
  const moonBelow = ball('moon', [0, -(R + 100), 0], R, 'moon');
  const slightlyUp = lookAtDirection([0, Math.sin(21 * DEG), Math.cos(21 * DEG)]);
  assert.equal(frameBodies({ ...view(slightlyUp), bodies: [moonBelow] })[0].visible, false);
});
