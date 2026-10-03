import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  AURORAS, auroraBand, STORMS, LIGHTNING_GAP_S, LIGHTNING_LIFE_S, lightningGap, lightningGlow,
  PLUMES, PLUME_DAY_S, plumeUp, glowNear, glowsNear, TELL_RADII, TELL_JETS_KM,
  IMPACT_GAP_S, IMPACT_LIFE_S, impactGap, impactGlow,
  NIGHT_CLOUDS, sheetBand, FOOTPRINT, footprintUp, SODIUM_TAIL, JETS, jetDirections, SPRITE, spriteGlow, SPOKES,
} from '../src/core/glows.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { eventMessage } from '../src/ui/messages.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('aurora curtains ring both poles of Earth, Jupiter and Saturn, standing straight up from the air', () => {
  assert.deepEqual(AURORAS.map((a) => a.body), ['earth', 'jupiter', 'saturn']);
  // Saturn's is red at the foot and purple at the top, as Cassini saw it.
  const saturn = AURORAS[2];
  assert.ok(saturn.low[0] > saturn.low[2] && saturn.high[2] > saturn.high[0]);
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
  assert.deepEqual(STORMS.map((s) => s.body), ['jupiter', 'earth']);
  assert.equal(lightningGap(() => 0, STORMS[1]), 0.5);
  assert.ok(STORMS[1].sizeKm[1] < STORMS[0].sizeKm[0], 'storms on Earth are far smaller');
  near(lightningGap(() => 1), LIGHTNING_GAP_S[1]);
  assert.equal(lightningGlow(-0.01), 0);
  assert.equal(lightningGlow(0.02), 1);
  assert.ok(lightningGlow(0.08) < lightningGlow(0.13));
  assert.ok(lightningGlow(0.3) < lightningGlow(0.2));
  assert.equal(lightningGlow(LIGHTNING_LIFE_S), 0);
});

test('a meteoroid hitting the Moon flashes every 2 to 6 seconds, bright at once and gone in a third of a second', () => {
  assert.equal(impactGap(() => 0), IMPACT_GAP_S[0]);
  near(impactGap(() => 1), IMPACT_GAP_S[1]);
  assert.equal(impactGlow(-0.01), 0);
  assert.equal(impactGlow(0), 1);
  assert.ok(impactGlow(0.1) < 1 && impactGlow(0.2) < impactGlow(0.1));
  assert.equal(impactGlow(IMPACT_LIFE_S), 0);
  assert.ok(eventMessage({ type: 'glow', id: 'impact' }).includes('공기가 없어'));
});

test('three plumes on Io and five jets round the south pole of Enceladus, turning with the ground', () => {
  assert.equal(PLUMES.filter((p) => p.body === 'io').length, 3);
  assert.equal(PLUMES.filter((p) => p.body === 'mars').length, 6);
  const jets = PLUMES.filter((p) => p.body === 'enceladus');
  assert.equal(jets.length, 5);
  for (const jet of jets) assert.ok(plumeUp(jet, 0)[1] < -0.99);
  assert.equal(new Set(PLUMES.map((p) => p.id)).size, PLUMES.length);
  for (const plume of PLUMES) {
    assert.ok(PLUME_DAY_S[plume.body] > 0 || plume.body === 'triton');
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
  assert.equal(glowNear(BODIES, above('uranus', 1)), null);
  for (const id of ['aurora:earth', 'aurora:jupiter', 'aurora:saturn', 'plume:io', 'plume:enceladus', 'plume:triton', 'lightning', 'lightning:earth',
    'sprite', 'clouds:earth', 'footprint:io', 'spokes:saturn', 'spot:neptune', 'tail:mercury', 'jets:halley']) {
    assert.ok(eventMessage({ type: 'glow', id }).length > 20, id);
  }
  assert.equal(eventMessage({ type: 'glow', id: 'nothing' }), null);
});

test('where several sights are in reach they are all listed, the nearest thing first', () => {
  const above = (id, radii) => {
    const b = bodyById(id);
    return [b.position[0], b.position[1] + b.radiusKm * (1 + radii), b.position[2]];
  };
  assert.deepEqual(glowsNear(BODIES, above('earth', 1)), ['aurora:earth', 'clouds:earth']);
  assert.deepEqual(glowsNear(BODIES, above('earth', 2.5)), ['aurora:earth']);
  assert.deepEqual(glowsNear(BODIES, above('jupiter', 1)), ['aurora:jupiter', 'footprint:io']);
  assert.deepEqual(glowsNear(BODIES, above('saturn', 1)), ['aurora:saturn', 'spokes:saturn']);
  assert.deepEqual(glowsNear(BODIES, above('neptune', 1)), ['spot:neptune']);
  // Triton is within three radii of Neptune.
  assert.deepEqual(glowsNear(BODIES, above('triton', 5)), ['plume:triton', 'spot:neptune']);
  // From where Saturn is looked at with its rings, nine radii off: the spokes, not yet the aurora.
  assert.deepEqual(glowsNear(BODIES, above('saturn', 8)), ['spokes:saturn']);
  assert.deepEqual(glowsNear(BODIES, above('mercury', 20)), ['tail:mercury']);
  const halley = bodyById('halley');
  const off = (km) => [halley.position[0], halley.position[1] + halley.radiusKm + km, halley.position[2]];
  assert.deepEqual(glowsNear(BODIES, off(TELL_JETS_KM - 1)), ['jets:halley']);
  assert.deepEqual(glowsNear(BODIES, off(TELL_JETS_KM + 1)), []);
  assert.equal(glowNear(BODIES, above('jupiter', 1)), 'aurora:jupiter');
});

test('two dark plumes stand in the south of Triton and turn with its ground, the other way round', () => {
  const plumes = PLUMES.filter((p) => p.body === 'triton');
  assert.deepEqual(plumes.map((p) => p.id), ['hili', 'mahilani']);
  for (const plume of plumes) {
    assert.ok(plume.dark && plume.latDeg < -45 && plume.latDeg > -60);
    assert.ok(plumeUp(plume, 0)[1] < -0.7);
  }
  // Triton goes round backwards: its day is counted the other way.
  assert.ok(PLUME_DAY_S.triton < 0);
  assert.equal(PLUMES.filter((p) => p.dark).length, 2);
});

test("the night-shining clouds lie over Earth's north polar cap at one height", () => {
  const { foot, top } = sheetBand(NIGHT_CLOUDS, 6371);
  near(Math.hypot(foot.radiusKm, foot.yKm), 6371 + NIGHT_CLOUDS.heightKm);
  near(Math.hypot(top.radiusKm, top.yKm), 6371 + NIGHT_CLOUDS.heightKm);
  assert.ok(top.yKm > foot.yKm && top.radiusKm < foot.radiusKm && foot.yKm > 0);
  assert.equal(NIGHT_CLOUDS.body, 'earth');
});

test("Io's footprint is under Io's longitude, short of the aurora ring, in both hemispheres", () => {
  const toIo = [0.6, 0.05, -0.8];
  const north = footprintUp(toIo, true);
  const south = footprintUp(toIo, false);
  near(Math.hypot(...north), 1);
  near(Math.atan2(north[2], north[0]), Math.atan2(toIo[2], toIo[0]));
  near(Math.asin(north[1]), (FOOTPRINT.latDeg * Math.PI) / 180);
  assert.deepEqual([south[0], south[2]], [north[0], north[2]]);
  near(south[1], -north[1]);
  assert.ok(FOOTPRINT.latDeg < AURORAS.find((a) => a.body === 'jupiter').latDeg);
});

test("a comet's jets leave the day side, each its own way, none toward the night", () => {
  for (const toSun of [[1, 0, 0], [0, 1, 0], [-0.6, 0.64, 0.48]]) {
    const jets = jetDirections(toSun);
    assert.equal(jets.length, 3);
    for (const jet of jets) {
      near(Math.hypot(...jet), 1);
      assert.ok(jet.reduce((s, n, i) => s + n * toSun[i], 0) > 0.7, `${jet}`);
    }
    assert.ok(Math.hypot(...jets[0].map((n, i) => n - jets[1][i])) > 0.3);
  }
  assert.equal(JETS.body, 'halley');
  assert.ok(JETS.heightKm > 0 && JETS.widthKm > 0);
});

test('a sprite lights a moment after its stroke and is gone in under half a second', () => {
  assert.equal(spriteGlow(0), 0);
  assert.equal(spriteGlow(0.04), 0);
  near(spriteGlow(0.05), 1);
  assert.ok(spriteGlow(0.2) < spriteGlow(0.1));
  assert.equal(spriteGlow(SPRITE.lifeS), 0);
  assert.ok(SPRITE.chance > 0 && SPRITE.chance < 1 && SPRITE.body === 'earth');
  // Above the cloud tops where the stroke is drawn.
  assert.ok(SPRITE.liftKm > STORMS.find((s) => s.body === 'earth').liftKm);
});

test("Mercury's tail and the ring spokes have their sizes", () => {
  assert.equal(SODIUM_TAIL.body, 'mercury');
  assert.equal(Math.round(SODIUM_TAIL.lengthKm / bodyById('mercury').radiusKm), 100);
  assert.ok(SPOKES.ring[0] > 0.29 && SPOKES.ring[1] < 0.685, 'within the B ring');
  assert.ok(SPOKES.count > 0 && SPOKES.dark > 0 && SPOKES.dark < 0.5);
});
