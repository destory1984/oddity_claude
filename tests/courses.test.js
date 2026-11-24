import { test } from 'vitest';
import assert from 'node:assert/strict';
import { COURSES, courseById, courseStart, cupolaPlan, railAt, mmuShipFacing, mmuFlyAt } from '../src/core/courses.js';
import fs from 'node:fs';
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

test('twenty-one rounds, the aurora first, then the one the user was flying, each of a known body', () => {
  assert.equal(COURSES.length, 21);
  assert.equal(COURSES[0].id, 'auroraDrift');
  assert.equal(COURSES[1].id, 'earthRound');
  assert.equal(new Set(COURSES.map((c) => c.id)).size, 21);
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

test('the orbital sunrise goes round low, from the night side toward the Sun, looking ahead', () => {
  const c = courseById('orbitSunrise');
  const b = at('earth');
  const toSun = unit(sun.position.map((n, i) => n - b.position[i]));
  const point = (seconds) => railAt(c, b, sun, seconds);
  const out = (p) => p.position.map((n, i) => n - b.position[i]);
  for (const s of [0, 30, 90, 200, 359]) assert.ok(Math.abs(Math.hypot(...out(point(s))) - (b.radiusKm + 400)) < 1, s);
  // From midnight at 0 s it starts on the night side and comes to noon half a lap on.
  assert.ok(dot(unit(out(point(0))), toSun) < -0.99);
  assert.ok(dot(unit(out(point(c.rail.startS))), toSun) < -0.5);
  assert.ok(dot(unit(out(point(c.lapS / 2))), toSun) > 0.99);
  // Looking ahead where it goes, 12 degrees under the level.
  const p = point(c.rail.startS);
  const going = point(c.rail.startS + 0.5).position.map((n, i) => n - p.position[i]);
  const look = forward(p.orientation);
  const level = unit(going);
  assert.ok(Math.abs(Math.asin(-dot(look, unit(out(p)))) * 180 / Math.PI - 12) < 0.5);
  assert.ok(dot(look, level) > 0.97);
});

test('the cupola course goes over both poles 1,000 km up, past the planned place, the Sun in sight never in the window', () => {
  const c = { ...courseById('cupola'), rail: { ...courseById('cupola').rail } };
  const b = at('earth');
  const toSun = unit(sun.position.map((n, i) => n - b.position[i]));
  // A place on the night side, 37.6 degrees north, standing still for the test.
  const place = unit([-toSun[0] * 0.79, 0.61, -toSun[2] * 0.79]);
  c.rail.plan = cupolaPlan(c, b, sun, () => place);
  const out = (s) => unit(railAt(c, b, sun, s).position.map((n, i) => n - b.position[i]));
  let north = -1, south = 1, worst = -1;
  for (let s = 0; s < c.lapS; s += 15) {
    const p = railAt(c, b, sun, s);
    assert.ok(Math.abs(Math.hypot(...p.position.map((n, i) => n - b.position[i])) - (b.radiusKm + 1000)) < 1, s);
    north = Math.max(north, out(s)[1]);
    south = Math.min(south, out(s)[1]);
    // Looking toward the Sun only while the Earth hides it (the dusk and dawn glance).
    const dip = Math.acos(b.radiusKm / (b.radiusKm + 1000));
    if (Math.asin(dot(out(s), toSun)) > -dip) worst = Math.max(worst, dot(forward(p.orientation), toSun));
  }
  assert.ok(north > 0.99 && south < -0.99, 'over both poles');
  assert.ok(worst < 0.5, `the Sun in sight at least 60 degrees from the middle of the view (${worst})`);
  // At leadS it is beside the place, near enough to see it in the middle of the view.
  const by = dot(out(c.rail.leadS), place);
  assert.ok(by > Math.cos((25 * Math.PI) / 180) && by < 0.9999, String(by));
});

test('every picture and sound a course names is there in public/', () => {
  const named = new Set();
  const walk = (v) => {
    if (typeof v === 'string' && /\.(png|webp|jpg|mp3)$/.test(v)) named.add(v);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  for (const c of COURSES) walk(c.rail ?? {});
  assert.ok(named.size >= 18, String(named.size));
  for (const path of named) assert.ok(fs.existsSync(`public/${path}`), path);
});

test("McCandless's Challenger lies square: her nose across her open bay, both unit long", () => {
  const c = courseById('mmu');
  const earth = { position: [150000000, 0, 0] };
  const hubble = { position: [150000000 + 6900, 300, 200] };
  const { forward: f, up: u } = mmuShipFacing(c, earth, hubble, sun);
  assert.ok(Math.abs(Math.hypot(...f) - 1) < 1e-9 && Math.abs(Math.hypot(...u) - 1) < 1e-9);
  assert.ok(Math.abs(dot(f, u)) < 1e-9, String(dot(f, u)));
});

test('flying himself, McCandless stands where his way from Challenger says and looks back at her', () => {
  const earth = { position: [150000000, 0, 0] };
  const hubble = { position: [150000000 + 6900, 300, 200] };
  const rel = [120, -40, 30];
  const { position, orientation } = mmuFlyAt(earth, hubble, rel);
  assert.deepEqual(position.map((v, i) => Math.round(v - hubble.position[i])), rel);
  const look = forward(orientation);
  const back = unit(rel.map((v) => -v));
  assert.ok(dot(look, back) > 0.9999, String(dot(look, back)));
});

test("Apollo's burns at the far side of the Moon fire with the Earth hidden, and none overlaps another", () => {
  const apollo = courseById('apollo11');
  const earth = { position: [0, 0, 0], radiusKm: 6371 };
  const moon = { position: [384400, 0, 0], radiusKm: 1737 };
  const sun = { position: [0, 0, -1.5e8] };
  const hidden = (t) => {
    const p = railAt(apollo, earth, sun, t, moon, null).position;
    const d = earth.position.map((v, i) => v - p[i]);
    const l = Math.hypot(...d);
    const m = moon.position.map((v, i) => v - p[i]);
    const along = m.reduce((s, v, i) => s + (v * d[i]) / l, 0);
    return along > 0 && Math.hypot(...m.map((v, i) => v - (d[i] / l) * along)) < moon.radiusKm;
  };
  const burns = apollo.rail.burns;
  for (const at of [322, 800]) {
    const b = burns.find((k) => k.from === at);
    assert.ok(b, at);
    for (let t = b.from; t <= b.to; t += 2) assert.ok(hidden(t), `${t}`);
    // Each with its countdown, whose own sound gives way to the burn's.
    assert.equal(apollo.rail.countdowns.find((c) => c.at === at)?.goCue, 'none');
  }
  const sorted = [...burns].sort((a, b) => a.from - b.from);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].from > sorted[i - 1].to, sorted[i].from);
  // The landing's engine with no buzz (the user: "진동은 별로고").
  assert.ok(!burns.find((b) => b.landing).buzz);
});
