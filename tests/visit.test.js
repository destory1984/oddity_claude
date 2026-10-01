import { test } from 'vitest';
import assert from 'node:assert/strict';
import { VISIT_SECONDS, STAND_KM, STAND_UP_KM, standSpot, startVisit, hasArrived, visitStep } from '../src/core/visit.js';
import { STORIES, storySitesAt, completedStories } from '../src/core/stories.js';
import { bodiesAt } from '../src/core/bodies.js';
import { createState } from '../src/core/game.js';
import { spinOf } from '../src/core/surface.js';
import { forward, up, orientationFrom, blend, turnAboutY, multiply, rotateVector } from '../src/core/orientation.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const SURFACE = STORIES.filter((s) => s.type === 'surface');

test('an orientation is built from the way ahead and the way up', () => {
  for (const [f, u] of [[[0, 0, 1], [0, 1, 0]], [[1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0]], [[-0.6, 0.48, -0.64], [0.2, 0.9, 0.1]], [[0, 0, -1], [0, -1, 0]]]) {
    const q = orientationFrom(f, u);
    near(Math.hypot(...q), 1);
    const length = Math.hypot(...f);
    forward(q).forEach((n, i) => near(n, f[i] / length));
    assert.ok(dot(up(q), u) > 0);
    near(dot(up(q), forward(q)), 0);
  }
  const half = blend(orientationFrom([0, 0, 1], [0, 1, 0]), orientationFrom([1, 0, 0], [0, 1, 0]), 0.5);
  near(dot(forward(half), [Math.SQRT1_2, 0, Math.SQRT1_2]), 1);
});

test('every surface place has a standing spot 25 km off, 1.5 km up, inside the range that logs its story', () => {
  assert.equal(SURFACE.length, 48);
  for (const timeS of [0, 123456]) {
    const bodies = bodiesAt(timeS);
    const sites = storySitesAt(timeS, bodies);
    for (const story of SURFACE) {
      const body = bodies.find((b) => b.id === story.body);
      const site = sites.find((s) => s.id === story.id);
      const spot = standSpot(story, body, timeS);
      near(gap(spot.position, body.position), body.radiusKm + STAND_UP_KM);
      const away = gap(spot.position, site.position);
      assert.ok(away > STAND_KM - 1 && away < STAND_KM + 1 && away < story.withinKm, `${story.id} ${away}`);
      // She faces the place (turned 0.3 rad aside), head up.
      const toSite = site.position.map((n, i) => n - spot.position[i]);
      assert.ok(dot(forward(spot.facing), toSite) / Math.hypot(...toSite) > 0.9, story.id);
      assert.ok(dot(up(spot.facing), spot.up) > 0.95, story.id);
      assert.ok(completedStories({ position: spot.position, restingOn: story.body, bodies, sites }).includes(story.id), story.id);
    }
  }
});

test('the spot turns with the ground: the same turn about Y that the body makes', () => {
  const story = SURFACE.find((s) => s.body === 'mars');
  const mars = { id: 'mars', radiusKm: 3389.5, position: [0, 0, 0] };
  const a = standSpot(story, mars, 100);
  const b = standSpot(story, mars, 100 + 7200);
  const spun = spinOf('mars', 100 + 7200) - spinOf('mars', 100);
  rotateVector(turnAboutY(spun), a.position).forEach((n, i) => near(n, b.position[i]));
  forward(multiply(turnAboutY(spun), a.facing)).forEach((n, i) => near(n, forward(b.facing)[i], 1e-9));
});

test('the glide runs three seconds to the spot, never under the ground, then holds her there', () => {
  const story = SURFACE.find((s) => s.body === 'mars');
  const body = { id: 'mars', radiusKm: 3389.5, position: [5000, 0, 0] };
  let timeS = 0;
  let spot = standSpot(story, body, timeS);
  // Start 6,000 km out, well round toward the horizon from the place.
  const start = body.position.map((n, i) => n + (spot.up[i] * 0.45 + [0.6, 0.5, 0.4][i]) * 6000);
  let state = { ...createState(start), speed: 300 };
  let visit = startVisit(state, story.id, spot);
  assert.equal(hasArrived(visit), false);
  const dt = 1 / 60;
  let landings = 0;
  for (let i = 0; i < 60 * (VISIT_SECONDS + 3); i++) {
    const before = spinOf('mars', timeS);
    timeS += dt * 720;
    spot = standSpot(story, body, timeS);
    const stepped = visitStep(state, visit, dt, { spot, body, spun: spinOf('mars', timeS) - before });
    ({ state, visit } = stepped);
    if (stepped.arrived) landings++;
    assert.equal(state.speed, 0);
    assert.ok(gap(state.position, body.position) >= body.radiusKm + STAND_UP_KM - 1e-6);
    assert.equal(state.restingOn, hasArrived(visit) ? 'mars' : null);
  }
  assert.equal(landings, 1);
  assert.ok(hasArrived(visit));
  near(gap(state.position, spot.position), 0);
  // Three seconds on (the ground has gone 500 km) she still faces the place.
  forward(state.orientation).forEach((n, i) => near(n, forward(spot.facing)[i]));
});
