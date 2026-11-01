import { test } from 'vitest';
import assert from 'node:assert/strict';
import { COURSES, courseById, courseStart, railAt } from '../src/core/courses.js';
import { BODIES } from '../src/core/bodies.js';
import { forward } from '../src/core/orientation.js';
import { GALACTIC_POLE, GALAXIES, NEBULAE, fromEquatorial } from '../src/core/sky.js';
import { right, up } from '../src/core/orientation.js';

const body = (id) => BODIES.find((b) => b.id === id);
const sun = { position: [0, 0, 0] };
const at = (id) => ({ ...body(id), position: [150000000, 3000, 80000000] });
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const velocity = ({ orientation, slide }) => {
  const r = right(orientation);
  const u = up(orientation);
  return r.map((n, i) => n * slide.sideSpeed * slide.sideSign + u[i] * slide.riseSpeed * slide.riseSign);
};

test('thirteen rounds, the aurora first, then the one the user was flying, each of a known body', () => {
  assert.equal(COURSES.length, 13);
  assert.equal(COURSES[0].id, 'auroraDrift');
  assert.equal(COURSES[1].id, 'earthRound');
  assert.equal(new Set(COURSES.map((c) => c.id)).size, 13);
  for (const c of COURSES) {
    assert.ok(body(c.body), c.id);
    assert.ok(c.name && c.todo, c.id);
    assert.equal(courseById(c.id), c);
  }
});

test('every round starts clear of the ground, going square to the body at the speed of its lap', () => {
  for (const c of COURSES.filter((x) => !x.rail)) {
    const b = at(c.body);
    const start = courseStart(c, b, sun, [0.1, 0.99, 0.05]);
    const out = start.position.map((n, i) => n - b.position[i]);
    const range = Math.hypot(...out);
    assert.ok(range > b.radiusKm * 1.2, c.id);
    const going = velocity(start);
    assert.ok(Math.abs(dot(unit(going), unit(out))) < 0.1, c.id);
    assert.ok(Math.abs(Math.hypot(...going) - (2 * Math.PI * range) / c.lapS) / Math.hypot(...going) < 0.03, c.id);
  }
});

test('the aurora rail goes round a point of the curtain, keeping off it and above the ground', () => {
  const c = courseById('auroraDrift');
  const b = at('earth');
  const point = (seconds) => railAt(c, b, sun, seconds);
  const out = (p) => p.position.map((n, i) => n - b.position[i]);
  const zero = point(0);
  const half = point(c.lapS / 2);
  assert.ok(Math.hypot(...zero.position.map((n, i) => n - half.position[i])) > 2 * c.rail.rangeKm * 0.99);
  assert.ok(Math.hypot(...zero.position.map((n, i) => n - point(c.lapS).position[i])) < 1);
  for (const s of [0, 30, 60, 90]) assert.ok(Math.hypot(...out(point(s))) > b.radiusKm + 300);
});

test('she looks at the body from the start', () => {
  for (const c of COURSES.filter((x) => !x.rail)) {
    const b = at(c.body);
    const start = courseStart(c, b, sun, [0.1, 0.99, 0.05]);
    const toward = unit(b.position.map((n, i) => n - start.position[i]));
    assert.ok(dot(forward(start.orientation), toward) > 0.85, c.id);
  }
});

test('the Milky Way round lies in the galaxy\'s plane', () => {
  const b = at('earth');
  const start = courseStart(courseById('milkyWay'), b, sun);
  const out = unit(start.position.map((n, i) => n - b.position[i]));
  assert.ok(Math.abs(dot(out, GALACTIC_POLE)) < 0.01);
  assert.ok(Math.abs(dot(unit(velocity(start)), GALACTIC_POLE)) < 0.05);
});

test('a thing of the sky stands over the plane of its round by what is asked', () => {
  for (const c of COURSES.filter((x) => x.sky && x.sky !== 'milkyWay')) {
    const b = at(c.body);
    const start = courseStart(c, b, sun);
    const thing = [...GALAXIES, ...NEBULAE].find((x) => x.id === c.sky);
    const way = fromEquatorial(thing.raH, thing.decDeg);
    const out = unit(start.position.map((n, i) => n - b.position[i]));
    assert.ok(Math.abs(dot(way, out) + Math.cos((c.overDeg * Math.PI) / 180)) < 1e-6, c.id);
  }
});
