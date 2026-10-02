import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  STUNTS, startStunt, stepStunt, stuntStatus, recordStunt, sanitizeStunts, recordText, stuntById, COMET_S,
} from '../src/core/stunts.js';
import { BODIES, bodyById } from '../src/core/bodies.js';

const earth = bodyById('earth');
const moon = bodyById('moon');
const halley = bodyById('halley');
// A point `km` above a body's surface, along a direction from its centre.
const above = (body, km, dir = [1, 0, 0]) => body.position.map((n, i) => n + dir[i] * (body.radiusKm + km));
const at = (position, restingOn = null, jumped = false) => ({ position, restingOn, bodies: BODIES, jumped });
// Step the same sample `n` times of `dt` seconds.
function hold(run, sample, n, dt = 1) {
  let done = null;
  for (let i = 0; i < n && done === null; i++) ({ run, done } = stepStunt(run, sample, dt));
  return { run, done };
}

test('four stunts, each with a name, what to do and a line of hers', () => {
  assert.deepEqual(STUNTS.map((s) => s.id), ['moonRun', 'moonSkim', 'earthLap', 'cometChase']);
  for (const s of STUNTS) {
    assert.ok(s.name && s.todo && !s.todo.includes('~'), s.id);
    assert.ok(s.line.length <= 25 && (s.line.match(/!/g) ?? []).length <= 1, s.id);
    assert.ok(['less', 'more', 'none'].includes(s.better), s.id);
  }
  assert.equal(startStunt('nothing'), null);
  assert.equal(stuntById('moonRun').name, '달까지 달리기');
});

test('the run to the Moon: ready on Earth, timed from leaving it to touching the Moon', () => {
  let run = startStunt('moonRun');
  // In space it is not ready, and flying about starts nothing.
  ({ run } = hold(run, at(above(earth, 500)), 3));
  assert.equal(run.going, false);
  assert.match(stuntStatus(run), /지구 표면에 내려서면/);
  ({ run } = stepStunt(run, at(above(earth, 0), 'earth'), 1));
  assert.match(stuntStatus(run), /준비됐습니다/);
  ({ run } = hold(run, at(above(earth, 800)), 5));
  assert.equal(run.going, true);
  assert.equal(run.seconds, 5);
  assert.equal(stuntStatus(run), '달까지 달리기 5초');
  const end = stepStunt(run, at(above(moon, 0), 'moon'), 1);
  assert.equal(end.done, 5);
  assert.equal(end.run.going, false);
});

test('a jump starts a stunt over, and landing back on Earth resets the clock', () => {
  let run = startStunt('moonRun');
  ({ run } = stepStunt(run, at(above(earth, 0), 'earth'), 1));
  ({ run } = hold(run, at(above(earth, 800)), 4));
  const jumped = stepStunt(run, at(above(moon, 50), null, true), 1);
  assert.equal(jumped.done, null);
  assert.equal(jumped.run.going, false);
  assert.equal(stepStunt(jumped.run, at(above(moon, 0), 'moon'), 1).done, null);
  const back = stepStunt(run, at(above(earth, 0), 'earth'), 1);
  assert.equal(back.run.going, false);
  assert.match(stuntStatus(back.run), /준비됐습니다/);
});

test('skimming the Moon: inside 100 km without touching, ten seconds or more', () => {
  let run = startStunt('moonSkim');
  ({ run } = hold(run, at(above(moon, 60)), 12));
  assert.equal(run.seconds, 12);
  assert.equal(stepStunt(run, at(above(moon, 300)), 1).done, 12);
  // Too short, or ended by touching down after too short a time: nothing.
  let brief = startStunt('moonSkim');
  ({ run: brief } = hold(brief, at(above(moon, 60)), 4));
  assert.equal(stepStunt(brief, at(above(moon, 0), 'moon'), 1).done, null);
  // Standing on the Moon is not skimming.
  assert.equal(hold(startStunt('moonSkim'), at(above(moon, 0), 'moon'), 20).run.going, false);
});

test('a lap of Earth: all the way round inside 1,000 km, turning back unwinds it', () => {
  const ring = (deg, km = 400) => above(earth, km, [Math.cos((deg * Math.PI) / 180), 0, Math.sin((deg * Math.PI) / 180)]);
  let run = startStunt('earthLap');
  let done = null;
  for (let deg = 0; deg <= 350 && done === null; deg += 10) ({ run, done } = stepStunt(run, at(ring(deg)), 1));
  assert.equal(done, null);
  assert.match(stuntStatus(run), /지구 한 바퀴 97% · 35초/);
  ({ run, done } = stepStunt(run, at(ring(360)), 1));
  assert.equal(done, 36);
  // Back and forth over the same stretch gets nowhere.
  let wig = startStunt('earthLap');
  for (let i = 0; i < 80; i++) ({ run: wig } = stepStunt(wig, at(ring(i % 2 ? 20 : 0)), 1));
  assert.ok(Math.abs(wig.angle) < 1);
  // Climbing out of the band, or landing, starts it over.
  let out = startStunt('earthLap');
  for (let deg = 0; deg <= 180; deg += 10) ({ run: out } = stepStunt(out, at(ring(deg)), 1));
  assert.equal(stepStunt(out, at(ring(190, 5000)), 1).run.going, false);
  assert.equal(stepStunt(out, at(ring(190, 0), 'earth'), 1).run.going, false);
});

test('chasing the comet: thirty seconds inside 500 km of Halley, not standing on it', () => {
  const near = hold(startStunt('cometChase'), at(above(halley, 200)), COMET_S);
  assert.equal(near.done, COMET_S);
  let run = startStunt('cometChase');
  ({ run } = hold(run, at(above(halley, 200)), 20));
  assert.equal(stuntStatus(run), '혜성 따라잡기 20/30초');
  ({ run } = stepStunt(run, at(above(halley, 900)), 1));
  assert.equal(run.seconds, 0);
  assert.equal(hold(startStunt('cometChase'), at(above(halley, 0), 'halley'), 40).done, null);
});

test('the best of each is kept: less time for a run, more for a skim', () => {
  let records = {};
  let best;
  ({ records, best } = recordStunt(records, 'moonRun', 20));
  assert.equal(best, true);
  ({ records, best } = recordStunt(records, 'moonRun', 25));
  assert.equal(best, false);
  ({ records, best } = recordStunt(records, 'moonRun', 15.26));
  assert.deepEqual([records.moonRun, best], [15.26, true]);
  ({ records } = recordStunt(records, 'moonSkim', 12));
  assert.equal(recordStunt(records, 'moonSkim', 30).best, true);
  assert.equal(recordStunt(records, 'moonSkim', 11).best, false);
  ({ records } = recordStunt(records, 'cometChase', 30));
  assert.equal(recordStunt(records, 'cometChase', 30).best, false);
  assert.equal(recordText('moonRun', records), '기록 15.3초');
  assert.equal(recordText('cometChase', records), '해냈음');
  assert.equal(recordText('earthLap', records), '아직 기록 없음');
  assert.deepEqual(sanitizeStunts({ moonRun: 15.26, moonSkim: -1, earthLap: 'x', other: 3 }), { moonRun: 15.26 });
  assert.deepEqual(sanitizeStunts(null), {});
});
