import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  AURORAS, auroraBand, LIGHTNING_GAP_S, LIGHTNING_LIFE_S, lightningGap, lightningGlow,
  PLUMES, PLUME_DAY_S, plumeUp, glowNear, TELL_RADII,
} from '../src/core/glows.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { eventMessage } from '../src/ui/messages.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('aurora curtains ring both poles of Earth and Jupiter, standing straight up from the air', () => {
  assert.deepEqual(AURORAS.map((a) => a.body), ['earth', 'jupiter']);
  for (const aurora of AURORAS) {
    const radiusKm = bodyById(aurora.body).radiusKm;
    const north = auroraBand(aurora, radiusKm, true);
    const south = auroraBand(aurora, radiusKm, false);
    // The foot and the top lie on one line out from the centre, at the ring's latitude.
    near(Math.hypot(north.foot.radiusKm, north.foot.yKm), radiusKm + aurora.baseKm);
    near(Math.hypot(north.top.radiusKm, north.top.yKm), radiusKm + aurora.baseKm + aurora.heightKm);
    near(Math.atan2(north.top.yKm, north.top.radiusKm), (aurora.latDeg * Math.PI) / 180);
    near(Math.atan2(north.foot.yKm, north.foot.radiusKm), (aurora.latDeg * Math.PI) / 180);
    assert.equal(south.foot.yKm, -north.foot.yKm);
    assert.equal(south.top.radiusKm, north.top.radiusKm);
  }
});

test('lightning comes every 0.3 to 1.6 seconds as two strokes and an afterglow', () => {
  assert.equal(lightningGap(() => 0), LIGHTNING_GAP_S[0]);
  near(lightningGap(() => 1), LIGHTNING_GAP_S[1]);
  assert.equal(lightningGlow(-0.01), 0);
  assert.equal(lightningGlow(0.02), 1);
  assert.ok(lightningGlow(0.08) < lightningGlow(0.13));
  assert.ok(lightningGlow(0.3) < lightningGlow(0.2));
  assert.equal(lightningGlow(LIGHTNING_LIFE_S), 0);
});

test('three plumes on Io and five jets round the south pole of Enceladus, turning with the ground', () => {
  assert.equal(PLUMES.filter((p) => p.body === 'io').length, 3);
  const jets = PLUMES.filter((p) => p.body === 'enceladus');
  assert.equal(jets.length, 5);
  for (const jet of jets) assert.ok(plumeUp(jet, 0)[1] < -0.99);
  assert.equal(new Set(PLUMES.map((p) => p.id)).size, PLUMES.length);
  for (const plume of PLUMES) {
    assert.ok(PLUME_DAY_S[plume.body] > 0);
    near(Math.hypot(...plumeUp(plume, 1.2)), 1);
    assert.ok(plume.heightKm > 0 && plume.widthKm > 0);
  }
  // Half a turn carries a plume near the equator to the other side.
  const pele = PLUMES.find((p) => p.id === 'pele');
  const a = plumeUp(pele, 0);
  const b = plumeUp(pele, Math.PI);
  near(a[0], -b[0]);
  near(a[1], b[1]);
  near(a[2], -b[2]);
});

test('each light is told about from nearby, in words', () => {
  const above = (id, radii) => {
    const b = bodyById(id);
    return [b.position[0], b.position[1] + b.radiusKm * (1 + radii), b.position[2]];
  };
  assert.equal(glowNear(BODIES, above('earth', TELL_RADII.aurora - 0.1)), 'aurora:earth');
  assert.equal(glowNear(BODIES, above('earth', TELL_RADII.aurora + 0.1)), null);
  assert.equal(glowNear(BODIES, above('jupiter', 1)), 'aurora:jupiter');
  assert.equal(glowNear(BODIES, above('io', 5)), 'plume:io');
  assert.equal(glowNear(BODIES, above('enceladus', 5)), 'plume:enceladus');
  assert.equal(glowNear(BODIES, above('neptune', 1)), null);
  for (const id of ['aurora:earth', 'aurora:jupiter', 'plume:io', 'plume:enceladus', 'lightning']) {
    assert.ok(eventMessage({ type: 'glow', id }).length > 20, id);
  }
  assert.equal(eventMessage({ type: 'glow', id: 'nothing' }), null);
});
