import { test } from 'vitest';
import assert from 'node:assert/strict';
import { eyeView, NEAR_KM } from '../src/core/eye.js';
import { BODIES, bodyById } from '../src/core/bodies.js';

const dist = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const above = (id, km) => {
  const b = bodyById(id);
  return [b.position[0], b.position[1] + b.radiusKm + km, b.position[2]];
};

test('far from everything the eye is the traveler and the near plane is the usual 10 km', () => {
  const p = above('earth', 200000);
  const view = eyeView(p, BODIES);
  assert.deepEqual(view.position, p);
  assert.equal(view.nearKm, NEAR_KM);
  assert.equal(NEAR_KM, 10);
});

test('standing on a surface the eye is lifted off it, and the near plane is closer than the ground', () => {
  for (const id of ['earth', 'jupiter', 'moon', 'deimos']) {
    const body = bodyById(id);
    const view = eyeView(above(id, 0), BODIES);
    const altitude = dist(view.position, body.position) - body.radiusKm;
    assert.ok(altitude >= 0.02, `${id}: eye ${altitude} km up`);
    assert.ok(altitude <= body.radiusKm * 0.01 + 0.02, `${id}: not far above the ground`);
    assert.ok(view.nearKm < altitude, `${id}: near plane ${view.nearKm} under altitude ${altitude}`);
    // Lifted straight up, not sideways.
    assert.ok(Math.abs(view.position[0] - body.position[0]) < 1e-6);
  }
});

test('flying low, the near plane shrinks with the altitude so the ground is never cut away', () => {
  const view = eyeView(above('moon', 5), BODIES);
  assert.ok(view.nearKm < 5 && view.nearKm > 0);
  const higher = eyeView(above('moon', 20), BODIES);
  assert.ok(higher.nearKm > view.nearKm && higher.nearKm <= NEAR_KM);
});
