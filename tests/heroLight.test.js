import { test } from 'vitest';
import assert from 'node:assert/strict';
import { heroLighting, BOUNCE_COLOR } from '../src/core/heroLight.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { lookAtDirection } from '../src/core/orientation.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const earth = bodyById('earth');
const sun = bodyById('sun');
const toSun = unit(sub(sun.position, earth.position));
// A point `km` above Earth's surface on the side given by the unit vector `side`.
const above = (side, km) => earth.position.map((n, i) => n + side[i] * (earth.radiusKm + km));

test('sunlight comes from where the Sun really is, in the traveler\'s own frame', () => {
  const position = above(toSun, 500);
  // Facing the Sun: the light is dead ahead.
  let light = heroLighting({ position, orientation: lookAtDirection(sub(sun.position, position)), bodies: BODIES });
  near(light.sun.direction[2], 1, 1e-6);
  near(light.sun.strength, 1);
  // Facing away from it: dead behind.
  light = heroLighting({ position, orientation: lookAtDirection(sub(position, sun.position)), bodies: BODIES });
  near(light.sun.direction[2], -1, 1e-6);
  near(Math.hypot(...light.sun.direction), 1);
});

test('in a planet\'s shadow the sunlight is cut off', () => {
  const position = above(toSun.map((n) => -n), 500);
  const facing = lookAtDirection([0, 0, 1]);
  assert.equal(heroLighting({ position, orientation: facing, bodies: BODIES, sunVisibility: 0 }).sun.strength, 0);
  assert.equal(heroLighting({ position, orientation: facing, bodies: BODIES, sunVisibility: 0.4 }).sun.strength, 0.4);
  assert.equal(heroLighting({ position, orientation: facing, bodies: BODIES, sunVisibility: 7 }).sun.strength, 1);
});

test('low over the day side of Earth, blue light comes up from the planet', () => {
  const position = above(toSun, 500);
  // Flying level over the ground, Earth straight below.
  const up = toSun;
  const ahead = unit([up[2], 0, -up[0]]);
  const light = heroLighting({ position, orientation: lookAtDirection(ahead), bodies: BODIES });
  assert.deepEqual(light.bounce.color, BOUNCE_COLOR.earth);
  assert.ok(light.bounce.strength > 0.8, `${light.bounce.strength}`);
  // The glow's source is square to her heading (Earth is beside her, not ahead), and
  // on the opposite side from the Sun, which is straight overhead of the ground here.
  near(light.bounce.direction[2], 0, 1e-6);
  near(Math.hypot(...light.bounce.direction), 1);
  near(light.bounce.direction.reduce((sum, n, i) => sum + n * light.sun.direction[i], 0), -1, 1e-3);
});

test('the glow fades with distance and is gone over the night side', () => {
  const facing = lookAtDirection([0, 0, 1]);
  const at = (km) => heroLighting({ position: above(toSun, km), orientation: facing, bodies: BODIES }).bounce.strength;
  assert.ok(at(500) > at(6000) && at(6000) > at(30000));
  // One Earth radius up, the planet takes a quarter of the sky's measure.
  near(at(earth.radiusKm), 0.25, 1e-6);
  const night = heroLighting({ position: above(toSun.map((n) => -n), 500), orientation: facing, bodies: BODIES });
  assert.ok(night.bounce.strength < 0.01 || night.bounce.color !== BOUNCE_COLOR.earth);
  // Far from everything there is no glow at all.
  assert.equal(heroLighting({ position: [9e9, 9e9, 9e9], orientation: facing, bodies: BODIES }).bounce.strength, 0);
});

test('beside Mars the glow is rust; a world with no colour of its own gives grey', () => {
  const mars = bodyById('mars');
  const marsToSun = unit(sub(sun.position, mars.position));
  const position = mars.position.map((n, i) => n + marsToSun[i] * (mars.radiusKm + 300));
  const light = heroLighting({ position, orientation: lookAtDirection([0, 0, 1]), bodies: BODIES });
  assert.deepEqual(light.bounce.color, BOUNCE_COLOR.mars);
  assert.ok(light.bounce.color[0] > light.bounce.color[2]);
  const rhea = bodyById('rhea');
  const rheaToSun = unit(sub(sun.position, rhea.position));
  const by = rhea.position.map((n, i) => n + rheaToSun[i] * (rhea.radiusKm + 50));
  assert.deepEqual(heroLighting({ position: by, orientation: lookAtDirection([0, 0, 1]), bodies: BODIES }).bounce.color, [0.7, 0.7, 0.7]);
});
