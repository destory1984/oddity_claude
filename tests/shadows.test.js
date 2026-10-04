import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  SHADOW_CASTERS, SHADOW_SLOTS, SHADOW_SEEN_FROM, shadowEdge, shadowSpot, castShadows, shadowsNear, nextShadow,
} from '../src/core/shadows.js';
import { BODIES, BODY_DATA, bodiesAt, bodyById } from '../src/core/bodies.js';
import { eventMessage } from '../src/ui/messages.js';
import { bodyVista } from '../src/core/teleport.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const sunOf = (bodies) => bodies.find((b) => b.kind === 'star');

test('the moons that cast shadows belong to their planets, and fit the shader', () => {
  for (const [planet, moons] of Object.entries(SHADOW_CASTERS)) {
    assert.ok(moons.length <= SHADOW_SLOTS, planet);
    for (const id of moons) assert.equal(BODY_DATA.find((b) => b.id === id).parent, planet, id);
  }
});

test("a large moon's shadow is black with a narrow soft edge; Phobos never covers the whole Sun", () => {
  const io = shadowEdge('io');
  assert.equal(io.depth, 1);
  // Io is 1,822 km in radius; the edge is soft over a few hundred km each way.
  assert.ok(io.innerKm > 1300 && io.innerKm < 1822 && io.outerKm > 1822 && io.outerKm < 2300, JSON.stringify(io));
  near(io.innerKm + io.outerKm, 2 * BODY_DATA.find((b) => b.id === 'io').radiusKm, 1e-6);
  const phobos = shadowEdge('phobos');
  assert.ok(phobos.depth > 0.2 && phobos.depth < 0.7, String(phobos.depth));
  assert.ok(phobos.outerKm < 40);
  assert.equal(shadowEdge('titan').depth, 1);
});

test('the shadow falls where the line from the Sun through the moon meets the planet', () => {
  const planet = { id: 'p', radiusKm: 100, position: [0, 0, 0] };
  const sun = [1e9, 0, 0];
  // Straight between: the shadow is under the moon.
  const under = shadowSpot(planet, { position: [300, 0, 0] }, sun);
  near(under[0], 1, 1e-9);
  near(under[1], 0, 1e-9);
  // Off to the side by half a radius: it lands half a radius up, on the surface.
  const up = shadowSpot(planet, { position: [300, 50, 0] }, sun);
  near(up[1], 0.5, 1e-6);
  near(Math.hypot(...up), 1, 1e-9);
  // Past the limb, or behind the planet: no shadow on it.
  assert.equal(shadowSpot(planet, { position: [300, 101, 0] }, sun), null);
  assert.equal(shadowSpot(planet, { position: [-300, 0, 0] }, sun), null);
});

test("every caster's shadow crosses its planet within one turn of its orbit", () => {
  for (const moons of Object.values(SHADOW_CASTERS)) {
    for (const id of moons) {
      const periodS = BODY_DATA.find((b) => b.id === id).periodS;
      const wait = nextShadow(bodiesAt, id, 0, periodS, periodS / 200);
      assert.ok(wait !== null, id);
    }
  }
});

test('the shader gets each moon in planet radii, and zeros in the unused slots', () => {
  const { at, edge } = castShadows('jupiter', BODIES);
  assert.equal(at.length, SHADOW_SLOTS * 4);
  assert.equal(edge.length, SHADOW_SLOTS * 3);
  const jupiter = bodyById('jupiter');
  const io = bodyById('io');
  near(Math.hypot(at[0], at[1], at[2]), Math.hypot(...io.position.map((n, i) => n - jupiter.position[i])) / jupiter.radiusKm, 1e-9);
  near(edge[1], shadowEdge('io').outerKm / jupiter.radiusKm, 1e-12);
  assert.equal(edge[2], 1);
  // Four moons: slots five and six are empty.
  assert.deepEqual(at.slice(16), new Array(8).fill(0));
  assert.deepEqual(edge.slice(12), new Array(6).fill(0));
  assert.deepEqual(castShadows('venus', BODIES).edge, new Array(SHADOW_SLOTS * 3).fill(0));
});

test('a shadow is told about from over it, not from the far side nor from too far to see', () => {
  const periodS = BODY_DATA.find((b) => b.id === 'io').periodS;
  const wait = nextShadow(bodiesAt, 'io', 0, periodS, periodS / 400);
  // A little later, so the shadow is well onto the disc.
  const bodies = bodiesAt(wait + periodS / 20);
  const jupiter = bodies.find((b) => b.id === 'jupiter');
  const spot = shadowSpot(jupiter, bodies.find((b) => b.id === 'io'), sunOf(bodies).position);
  assert.ok(spot);
  const over = (radii) => jupiter.position.map((n, i) => n + spot[i] * jupiter.radiusKm * (1 + radii));
  assert.ok(shadowsNear(bodies, over(2)).includes('shadow:io'));
  const behind = jupiter.position.map((n, i) => n - spot[i] * jupiter.radiusKm * 3);
  assert.ok(!shadowsNear(bodies, behind).includes('shadow:io'));
  const farKm = SHADOW_SEEN_FROM * shadowEdge('io').outerKm * 1.05;
  assert.ok(!shadowsNear(bodies, over(farKm / jupiter.radiusKm)).includes('shadow:io'));
  assert.deepEqual(shadowsNear(bodies, bodyById('earth', bodies).position), []);
});

test('each shadow has its notice, naming the moon and the planet', () => {
  for (const [planet, moons] of Object.entries(SHADOW_CASTERS)) {
    for (const id of moons) {
      const text = eventMessage({ type: 'glow', id: `shadow:${id}` });
      assert.ok(text.includes(BODY_DATA.find((b) => b.id === id).name), id);
      assert.ok(text.includes(BODY_DATA.find((b) => b.id === planet).name), id);
      assert.ok(text.includes('그림자'), id);
    }
  }
  assert.equal(eventMessage({ type: 'glow', id: 'shadow:moon' }), null);
});

test('a jump from the sky news arrives on the side of the planet the shadow is on', () => {
  const periodS = BODY_DATA.find((b) => b.id === 'io').periodS;
  const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
  let checked = 0;
  for (let k = 0; k < 40; k++) {
    const bodies = bodiesAt((k * periodS) / 40);
    const jupiter = bodies.find((b) => b.id === 'jupiter');
    const spot = shadowSpot(jupiter, bodies.find((b) => b.id === 'io'), sunOf(bodies).position);
    if (!spot) continue;
    checked += 1;
    const from = (vista) => vista.map((n, i) => n - jupiter.position[i]);
    const unit = (v) => v.map((n) => n / Math.hypot(...v));
    const plain = unit(from(bodyVista(jupiter, bodies)));
    const aimed = unit(from(bodyVista(jupiter, bodies, null, spot)));
    assert.ok(dot(aimed, spot) >= dot(plain, spot) - 1e-9);
    // The shadow is then seen at a slant of 70 degrees or less, whenever it is on the planet.
    assert.ok(dot(aimed, spot) > 0.34, `slot ${k}: ${dot(aimed, spot)}`);
  }
  assert.ok(checked >= 5);
});
