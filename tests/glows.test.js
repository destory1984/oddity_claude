import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  TYPHOON, typhoonUp, typhoonStrike,
  AURORAS, auroraBand, STORMS, LIGHTNING_GAP_S, LIGHTNING_LIFE_S, lightningGap, lightningGlow,
  PLUMES, PLUME_DAY_S, plumeUp, glowNear, glowsNear, TELL_RADII, TELL_JETS_KM, COUNTERGLOW_FROM_KM,
  IMPACT_GAP_S, IMPACT_LIFE_S, impactGap, impactGlow,
  NIGHT_CLOUDS, sheetBand, FOOTPRINT, footprintUp, SODIUM_TAIL, JETS, jetDirections, SPRITE, spriteGlow, SPOKES,
  ELVES, elvesRing, BLUE_JET, blueJetGlow,
} from '../src/core/glows.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { eventMessage } from '../src/ui/messages.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('aurora curtains ring both poles of Earth, Jupiter and Saturn, standing straight up from the air', () => {
  assert.deepEqual(AURORAS.map((a) => a.body), ['earth', 'jupiter', 'saturn', 'uranus', 'neptune', 'mars', 'venus', 'ganymede']);
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
  assert.deepEqual(STORMS.map((s) => s.body), ['jupiter', 'earth', 'venus']);
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
  assert.equal(PLUMES.filter((p) => p.body === 'mars' && !p.dark).length, 6);
  // Four dark jets on Mars's south polar cap.
  assert.deepEqual(PLUMES.filter((p) => p.body === 'mars' && p.dark).map((p) => p.latDeg < -80), [true, true, true, true]);
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
  // (Past the aurora's reach only the Sun's flares are left to tell of: Earth is within three Sun radii of it.)
  assert.equal(glowNear(BODIES, above('earth', TELL_RADII.aurora + 0.1)), 'flare:sun');
  assert.equal(glowNear(BODIES, above('jupiter', 1)), 'aurora:jupiter');
  assert.equal(glowNear(BODIES, above('io', 5)), 'plume:io');
  assert.equal(glowNear(BODIES, above('enceladus', 5)), 'plume:enceladus');
  assert.equal(glowNear(BODIES, above('uranus', 1)), 'aurora:uranus');
  assert.equal(glowNear(BODIES, above('ceres', 1)), null);
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
  // (Over the pole she stands over the edge of day: the thunderheads' last light is told.)
  assert.deepEqual(glowsNear(BODIES, above('earth', 1)), ['aurora:earth', 'clouds:earth', 'flare:sun', 'anvils:earth']);
  assert.deepEqual(glowsNear(BODIES, above('earth', 2.5)), ['aurora:earth', 'flare:sun']);
  assert.deepEqual(glowsNear(BODIES, above('jupiter', 1)), ['aurora:jupiter', 'footprint:io', 'flow:jupiter']);
  assert.deepEqual(glowsNear(BODIES, above('saturn', 1)), ['aurora:saturn', 'spokes:saturn', 'hexagon:saturn', 'rain:saturn']);
  assert.deepEqual(glowsNear(BODIES, above('neptune', 1)), ['aurora:neptune', 'spot:neptune']);
  // Triton is within three radii of Neptune.
  assert.deepEqual(glowsNear(BODIES, above('triton', 5)), ['plume:triton', 'aurora:neptune', 'spot:neptune']);
  // From where Saturn is looked at with its rings, nine radii off: the spokes, not yet the aurora.
  assert.deepEqual(glowsNear(BODIES, above('saturn', 8)), ['spokes:saturn']);
  assert.deepEqual(glowsNear(BODIES, above('mercury', 20)), ['tail:mercury', 'flare:sun']);
  assert.ok(glowsNear(BODIES, above('enceladus', 5)).includes('ering:saturn'));
  const halley = bodyById('halley');
  const off = (km) => [halley.position[0], halley.position[1] + halley.radiusKm + km, halley.position[2]];
  assert.deepEqual(glowsNear(BODIES, off(TELL_JETS_KM - 1)), ['jets:halley', 'flare:sun', 'tailcut']);
  // Past the jets' reach the tail is still told of, out to 300,000 km.
  assert.deepEqual(glowsNear(BODIES, off(TELL_JETS_KM + 1)), ['flare:sun', 'tailcut']);
  assert.deepEqual(glowsNear(BODIES, off(300001)), ['flare:sun']);
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
  assert.equal(PLUMES.filter((p) => p.dark && p.body === 'triton').length, 2);
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

test('the weather of Earth: three sights from low over the day side, the glory from straight down-Sun, the anvils from the edge of day', () => {
  const earth = BODIES.find((b) => b.id === 'earth');
  const sun = BODIES.find((b) => b.kind === 'star');
  const toSun = sun.position.map((n, i) => n - earth.position[i]);
  const far = Math.hypot(...toSun);
  const from = (share, radii) => earth.position.map((n, i) => n + (toSun[i] / far) * share * earth.radiusKm * (1 + radii));
  const day = glowsNear(BODIES, from(1, 0.8));
  for (const id of ['shiptracks:earth', 'honeycomb:earth', 'glory:earth']) assert.ok(day.includes(id), id);
  assert.ok(!day.includes('anvils:earth'));
  // Farther off than two radii the glory is not told, nor the three in the cloud.
  const off = glowsNear(BODIES, from(1, 2.2));
  for (const id of ['shiptracks:earth', 'honeycomb:earth', 'glory:earth']) assert.ok(!off.includes(id), id);
  // From the night side none of them.
  const night = glowsNear(BODIES, from(-1, 0.8));
  for (const id of ['shiptracks:earth', 'honeycomb:earth', 'glory:earth', 'anvils:earth']) assert.ok(!night.includes(id), id);
  for (const id of ['shiptracks:earth', 'honeycomb:earth', 'glory:earth', 'anvils:earth', 'elves', 'bluejet']) {
    assert.ok(eventMessage({ type: 'glow', id }).length > 20, id);
  }
});

test('ELVES spread as they fade and a blue jet shoots up at once; both are gone in under a second', () => {
  assert.ok(elvesRing(0).spread < elvesRing(0.3).spread && elvesRing(0.3).spread < 1);
  assert.ok(elvesRing(0).light === 1 && elvesRing(0.3).light < 0.5);
  assert.equal(elvesRing(ELVES.lifeS).light, 0);
  assert.ok(blueJetGlow(0).rise < 0.3 && blueJetGlow(0.18).rise === 1);
  assert.equal(blueJetGlow(0.2).light, 1);
  assert.ok(blueJetGlow(0.5).light < 1);
  assert.equal(blueJetGlow(BLUE_JET.lifeS).light, 0);
  assert.ok(ELVES.lifeS < 1 && BLUE_JET.lifeS < 1 && ELVES.chance + BLUE_JET.chance < 0.6);
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
  assert.ok(SODIUM_TAIL.light > 0 && SODIUM_TAIL.endOn[0] > 0 && SODIUM_TAIL.endOn[0] < SODIUM_TAIL.endOn[1] && SODIUM_TAIL.endOn[1] < 1);
  assert.ok(SPOKES.ring[0] > 0.29 && SPOKES.ring[1] < 0.685, 'within the B ring');
  assert.ok(SPOKES.count > 0 && SPOKES.dark > 0 && SPOKES.dark < 0.5);
});

test('sights that show from one side: behind a world with the Sun beyond, over the night side, far from everything', () => {
  const sun = bodyById('sun');
  // A place `radii` above the ground of a body, on the side away from the Sun (-1) or toward it (1).
  const beside = (id, radii, sunward) => {
    const b = bodyById(id);
    const way = sun.position.map((n, i) => n - b.position[i]);
    const length = Math.hypot(...way);
    return b.position.map((n, i) => n + sunward * (way[i] / length) * b.radiusKm * (1 + radii));
  };
  assert.ok(glowsNear(BODIES, beside('saturn', 5, -1)).includes('backlit:saturn'));
  assert.ok(!glowsNear(BODIES, beside('saturn', 5, 1)).includes('backlit:saturn'));
  for (const id of ['titan', 'pluto', 'mars']) {
    assert.ok(glowsNear(BODIES, beside(id, 3, -1)).includes(`haze:${id}`), id);
    assert.ok(!glowsNear(BODIES, beside(id, 3, 1)).includes(`haze:${id}`), id);
  }
  assert.ok(glowsNear(BODIES, beside('earth', 1, -1)).includes('airglow:earth'));
  assert.ok(!glowsNear(BODIES, beside('earth', 1, 1)).includes('airglow:earth'));
  // Far above the planets' plane, away from everything.
  const far = [sun.position[0], sun.position[1] + 3 * COUNTERGLOW_FROM_KM + sun.radiusKm, sun.position[2]];
  assert.deepEqual(glowsNear(BODIES, far), ['counterglow']);
});

test('a transit is told when Venus or Mercury stands as a small dot on the Sun as seen from here', () => {
  const sun = bodyById('sun');
  const venus = bodyById('venus');
  const out = venus.position.map((n, i) => n - sun.position[i]);
  const far = Math.hypot(...out);
  // On the line from the Sun through Venus, well beyond Venus: it stands on the Sun's face.
  const beyond = sun.position.map((n, i) => n + (out[i] / far) * (far + 600000));
  assert.ok(glowsNear(BODIES, beyond).includes('transit:venus'));
  // Close behind Venus it is a wall across the Sun, not a dot.
  const close = sun.position.map((n, i) => n + (out[i] / far) * (far + 9000));
  assert.ok(!glowsNear(BODIES, close).includes('transit:venus'));
  // Off the line: no transit.
  const off = beyond.map((n, i) => n + (i === 1 ? 800000 : 0));
  assert.ok(!glowsNear(BODIES, off).includes('transit:venus'));
});

test('Uranus has an aurora and rings to tell of; Mars its polar jets from over the south; Venus its ashen light at night', () => {
  const above = (id, radii, way = 1) => { const b = bodyById(id); return [b.position[0], b.position[1] + way * b.radiusKm * (1 + radii), b.position[2]]; };
  const uranus = glowsNear(BODIES, above('uranus', 1));
  assert.ok(uranus.includes('aurora:uranus') && uranus.includes('rings:uranus'));
  assert.ok(glowsNear(BODIES, above('mars', 1, -1)).includes('geyser:mars'));
  assert.ok(!glowsNear(BODIES, above('mars', 1, 1)).includes('geyser:mars'));
  const sun = bodyById('sun'); const venus = bodyById('venus');
  const away = venus.position.map((n, i) => n - sun.position[i]); const d = Math.hypot(...away);
  const night = venus.position.map((n, i) => n + (away[i] / d) * venus.radiusKm * 2);
  assert.ok(glowsNear(BODIES, night).includes('ashen:venus'));
});

test('the typhoon keeps its place on the drifting clouds and its lightning falls in the disc, off the eye', async () => {
  const { cloudSpin, EARTH_START_SPIN, CLOUD_DRIFT, surfaceDirection } = await import('../src/core/surface.js');
  // The clouds start a little east of the ground and turn 8% faster.
  assert.ok(Math.abs(cloudSpin(EARTH_START_SPIN) - EARTH_START_SPIN - 0.008) < 1e-12);
  assert.ok(Math.abs(cloudSpin(EARTH_START_SPIN - 1) - cloudSpin(EARTH_START_SPIN) + CLOUD_DRIFT) < 1e-12);
  const eye = typhoonUp(0.7);
  assert.deepEqual(eye, surfaceDirection(TYPHOON.latDeg, TYPHOON.lonDeg, 0.7));
  const radiusKm = 6371;
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 200; i++) {
    const up = typhoonStrike(rand, eye, radiusKm);
    assert.ok(Math.abs(Math.hypot(...up) - 1) < 1e-9);
    const km = Math.acos(Math.min(1, up[0] * eye[0] + up[1] * eye[1] + up[2] * eye[2])) * radiusKm;
    assert.ok(km >= TYPHOON.eyeKm - 1e-6 && km <= TYPHOON.radiusKm + 1e-6, `${km} km from the eye`);
  }
  assert.ok(TYPHOON.sizeKm[1] < TYPHOON.radiusKm, 'a stroke lights a patch, not the whole storm');
});

import { auroraStorm, AURORA_STORM, STEVE, PEARL_CLOUDS, PULSE } from '../src/core/glows.js';

test('round Earth\'s aurora: strong nights come and go, and what shows only then is told only then', () => {
  const { everyS, fromS, lastS, rampS } = AURORA_STORM;
  assert.equal(auroraStorm(0), 0);
  assert.equal(auroraStorm(fromS + lastS / 2), 1);
  assert.equal(auroraStorm(everyS + fromS + lastS / 2), 1);
  assert.ok(Math.abs(auroraStorm(fromS + rampS / 2) - 0.5) < 1e-9);
  assert.equal(auroraStorm(fromS + lastS + 1), 0);
  for (let s = 0; s < 2 * everyS; s += 0.7) assert.ok(auroraStorm(s) >= 0 && auroraStorm(s) <= 1);
  // STEVE stands nearer the equator than the aurora; the pearl clouds are over the south.
  assert.ok(STEVE.latDeg < AURORAS.find((a) => a.body === 'earth').latDeg);
  assert.ok(PEARL_CLOUDS.latDeg.every((lat) => lat < 0) && PULSE.latDeg[1] < 67);
  const earth = bodyById('earth');
  const sun = BODIES.find((b) => b.kind === 'star');
  const toSun = sun.position.map((n, i) => n - earth.position[i]);
  const far = Math.hypot(...toSun);
  const at = (sign, south = 0) => earth.position.map((n, i) => n + (sign * toSun[i] / far + (i === 1 ? south : 0)) * earth.radiusKm * 2);
  const strong = fromS + lastS / 2;
  const night = glowsNear(BODIES, at(-1), strong);
  for (const id of ['storm:earth', 'steve:earth', 'pulse:earth']) assert.ok(night.includes(id), id);
  assert.ok(!glowsNear(BODIES, at(-1), 0).includes('steve:earth'));
  assert.ok(!glowsNear(BODIES, at(-1)).includes('storm:earth'));
  assert.ok(glowsNear(BODIES, at(-1), 0).includes('pulse:earth'));
  assert.ok(!glowsNear(BODIES, at(1), strong).some((id) => ['storm:earth', 'steve:earth', 'pulse:earth'].includes(id)));
  assert.ok(glowsNear(BODIES, at(-0.3, -1)).includes('pearl:earth'));
  assert.ok(!glowsNear(BODIES, at(-1)).includes('pearl:earth'));
  for (const id of ['storm:earth', 'steve:earth', 'pearl:earth', 'pulse:earth']) assert.ok(eventMessage({ type: 'glow', id }).length > 20, id);
});
