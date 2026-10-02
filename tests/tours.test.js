import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  TOURS, tourById, stopName, stopTarget, currentStop, startTour, quitTour, stopReached, stopHint, advanceTour, allToursDone, stampFile, sceneFile, CRANE_FILE,
} from '../src/core/tours.js';
import { existsSync } from 'node:fs';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { STORIES } from '../src/core/stories.js';
import { CRAFT, craftAt } from '../src/core/craft.js';
import { MISSIONS } from '../src/core/missions.js';
import { createProgress, sanitizeProgress } from '../src/core/progress.js';
import { teleportSpot } from '../src/core/teleport.js';

test('nine tours of three to six stops, each a real place, body or craft, with a memo and a line', () => {
  assert.deepEqual(TOURS.map((t) => t.id), [
    'firstSteps', 'apollo', 'grandTour', 'water', 'rovers', 'marsSights', 'korea', 'comets', 'marsFilm',
  ]);
  assert.equal(new Set(TOURS.map((t) => t.name)).size, 9);
  for (const tour of TOURS) {
    assert.ok(tour.stops.length >= 3 && tour.stops.length <= 6, tour.id);
    assert.ok(tour.memo.length <= 60 && tour.memo.endsWith('.') && !tour.memo.includes('~'), tour.id);
    for (const stop of tour.stops) {
      const known = STORIES.some((s) => s.id === stop.story) || BODIES.some((b) => b.id === stop.body) || CRAFT.some((c) => c.id === stop.craft);
      assert.ok(known, `${tour.id}: ${JSON.stringify(stop)}`);
      assert.ok(stopName(stop), tour.id);
      assert.ok(stop.line.length <= 25 && (stop.line.match(/!/g) ?? []).length <= 1, `${tour.id}: ${stop.line}`);
    }
    // No stop twice in one tour.
    assert.equal(new Set(tour.stops.map(stopTarget)).size, tour.stops.length, tour.id);
  }
  assert.equal(tourById('nowhere'), null);
});

test('the ninth tour names no film: only the places on its road', () => {
  const tour = tourById('marsFilm');
  assert.deepEqual(tour.stops.map(stopName), ['와디럼 사막', '아키달리아 평원', '패스파인더 착륙지', '스키아파렐리 분화구']);
  assert.ok(!/마션|Martian|와트니/.test(JSON.stringify(tour)));
});

test('a stop points at the place itself on a surface, else at the body or craft of its story', () => {
  assert.equal(stopTarget({ story: 'apollo11' }), 'apollo11');
  assert.equal(stopTarget({ story: 'voyager2Uranus' }), 'uranus');
  assert.equal(stopTarget({ story: 'voyager2Out' }), 'voyager2');
  assert.equal(stopTarget({ story: 'giotto' }), 'halley');
  assert.equal(stopTarget({ body: 'jupiter' }), 'jupiter');
  assert.equal(stopTarget({ craft: 'danuri' }), 'danuri');
  assert.equal(stopName({ craft: 'danuri' }), '다누리');
});

test('a tour is gone round in order and done once', () => {
  let progress = startTour(createProgress(), 'comets');
  assert.deepEqual(progress.tour, { id: 'comets', step: 0 });
  assert.equal(currentStop(progress).stop.story, 'giotto');
  let moved = advanceTour(progress);
  assert.equal(moved.finished, false);
  assert.equal(currentStop(moved.progress).stop.story, 'rosetta');
  moved = advanceTour(advanceTour(moved.progress).progress);
  assert.equal(moved.finished, true);
  assert.deepEqual(moved.progress.tours, ['comets']);
  assert.equal(moved.progress.tour, null);
  assert.equal(currentStop(moved.progress), null);
  // Round again: the stamp is not doubled.
  let again = startTour(moved.progress, 'comets');
  for (let i = 0; i < 3; i++) again = advanceTour(again).progress;
  assert.deepEqual(again.tours, ['comets']);
  assert.equal(quitTour(startTour(createProgress(), 'apollo')).tour, null);
  assert.equal(startTour(createProgress(), 'nowhere').tour, null);
  assert.equal(allToursDone(again), false);
  assert.equal(allToursDone({ ...again, tours: TOURS.map((t) => t.id) }), true);
});

test('a stop is reached at its story place, within discovery range of a body, within docking range of a craft', () => {
  const craft = craftAt(0, BODIES);
  const jupiter = bodyById('jupiter');
  const above = (km) => [jupiter.position[0], jupiter.position[1] + jupiter.radiusKm + km, jupiter.position[2]];
  const at = (position, storiesNow = []) => ({ storiesNow, position, bodies: BODIES, craft });
  assert.equal(stopReached({ body: 'jupiter' }, at(above(40000))), true);
  // As near as the jump puts her counts too: five radii from a body's centre, nine for Saturn.
  assert.equal(stopReached({ body: 'jupiter' }, at(above(60000))), true);
  assert.equal(stopReached({ body: 'jupiter' }, at(above(jupiter.radiusKm * 6))), false);
  for (const id of ['jupiter', 'saturn', 'haleBopp']) {
    const body = bodyById(id);
    const spot = teleportSpot(body, { position: [0, 0, 0], progress: createProgress(), bodies: BODIES, anywhere: true, known: true });
    assert.equal(stopReached({ body: id }, at(spot)), true, id);
  }
  const moon = bodyById('moon');
  assert.equal(stopReached({ body: 'moon' }, at(moon.position.map((n, i) => n + (i === 1 ? moon.radiusKm + 60000 : 0)))), false);
  const danuri = craft.find((c) => c.id === 'danuri');
  assert.equal(stopReached({ craft: 'danuri' }, at(danuri.position.map((n, i) => n + (i === 1 ? 2900 : 0)))), true);
  assert.equal(stopReached({ craft: 'danuri' }, at(danuri.position.map((n, i) => n + (i === 1 ? 3100 : 0)))), false);
  assert.equal(stopReached({ story: 'luna9' }, at([0, 0, 0], ['luna2', 'luna9'])), true);
  assert.equal(stopReached({ story: 'luna9' }, at([0, 0, 0], ['luna2'])), false);
});

test('a stop the jump does not reach by itself says what is left to do', () => {
  assert.equal(stopHint({ story: 'voyager2Uranus' }), '천왕성 구름 꼭대기 81,500km 안을 지나기');
  assert.equal(stopHint({ story: 'apollo11' }), null);
  assert.equal(stopHint({ body: 'jupiter' }), null);
  assert.equal(stopHint({ craft: 'danuri' }), null);
  for (const tour of TOURS) {
    for (const stop of tour.stops) assert.ok(stopHint(stop) === null || stopHint(stop).length > 5, tour.id);
  }
});

test('the log keeps the tours done and the one under way; junk is dropped', () => {
  const read = (raw) => sanitizeProgress(raw, BODIES, MISSIONS, STORIES, CRAFT, [], TOURS);
  assert.deepEqual(read({ tours: ['comets', 'comets', 'forged'], tour: { id: 'apollo', step: 5 } }).tours, ['comets']);
  assert.deepEqual(read({ tour: { id: 'apollo', step: 5 } }).tour, { id: 'apollo', step: 5 });
  assert.equal(read({ tour: { id: 'apollo', step: 6 } }).tour, null);
  assert.equal(read({ tour: { id: 'forged', step: 0 } }).tour, null);
  assert.equal(read({ tour: 'apollo' }).tour, null);
  assert.equal(read({}).tour, null);
});

test("a tour's next stop can be jumped near without having been there", () => {
  const mars = bodyById('mars');
  const far = [mars.position[0], mars.position[1] + 5e6, mars.position[2]];
  const fresh = createProgress();
  assert.equal(teleportSpot(mars, { position: far, progress: fresh, bodies: BODIES, anywhere: true }), null);
  assert.ok(teleportSpot(mars, { position: far, progress: fresh, bodies: BODIES, anywhere: true, known: true }));
});

test('every tour has its own stamp on file, and there is a paper crane for all nine', () => {
  const files = TOURS.map(stampFile);
  assert.equal(new Set(files).size, 9);
  for (const file of [...files, CRANE_FILE]) assert.ok(existsSync(`public/assets/${file}`), file);
});

test('every tour has a picture of its own for its page in the journal', () => {
  const files = TOURS.map(sceneFile);
  assert.equal(new Set(files).size, 9);
  for (const file of files) assert.ok(existsSync(`public/assets/${file}`), file);
});
