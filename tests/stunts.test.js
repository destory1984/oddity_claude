import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  STUNTS, startStunt, stepStunt, stuntStatus, recordStunt, sanitizeStunts, recordText, valueText, stuntById,
} from '../src/core/stunts.js';
import { BODIES, bodyById } from '../src/core/bodies.js';

const earth = bodyById('earth');
const moon = bodyById('moon');
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
  assert.deepEqual(STUNTS.map((s) => s.id), ['moonRun', 'moonSkim', 'earthLap', 'ringGap']);
  for (const s of STUNTS) {
    assert.ok(s.name && s.todo && !s.todo.includes('~'), s.id);
    assert.ok(s.line.length <= 25 && (s.line.match(/!/g) ?? []).length <= 1, s.id);
    assert.ok(['less', 'more'].includes(s.better) && ['초', 'km', 'km/s'].includes(s.unit), s.id);
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

test('skimming the Moon: ground covered inside 100 km without touching, 1,000 km or more', () => {
  // Along the Moon's side at 60 km up, 300 km a step.
  const along = (n, km = 60) => above(moon, km).map((v, i) => v + (i === 2 ? n * 300 : 0));
  // (The steps are short beside the Moon's radius, so the height stays inside the band.)
  let run = startStunt('moonSkim');
  for (let n = 0; n <= 1; n++) ({ run } = stepStunt(run, at(along(n)), 1));
  assert.equal(run.km, 300);
  assert.equal(stuntStatus(run), '달 스치기 300km');
  // Hanging still covers no ground however long it lasts.
  ({ run } = hold(run, at(along(1)), 50));
  assert.equal(run.km, 300);
  // Leaving the band before 1,000 km: nothing, and it starts over.
  const early = stepStunt(run, at(above(moon, 400)), 1);
  assert.equal(early.done, null);
  assert.equal(early.run.km, 0);
  // 1,200 km covered in small steps round the Moon, then climbing out: it counts.
  const ring = (deg) => above(moon, 50, [Math.cos((deg * Math.PI) / 180), 0, Math.sin((deg * Math.PI) / 180)]);
  let far = startStunt('moonSkim');
  for (let deg = 0; deg <= 40; deg += 1) ({ run: far } = stepStunt(far, at(ring(deg)), 0.1));
  assert.ok(far.km > 1200 && far.km < 1260, String(far.km));
  const out = stepStunt(far, at(above(moon, 300)), 0.1);
  assert.equal(out.done, far.km);
  // Touching down ends it too; standing on the Moon is not skimming.
  assert.equal(stepStunt(far, at(above(moon, 0), 'moon'), 0.1).done, far.km);
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

test('the best of each is kept: less time for a run, more for a skim', () => {
  let records = {};
  let best;
  ({ records, best } = recordStunt(records, 'moonRun', 20));
  assert.equal(best, true);
  ({ records, best } = recordStunt(records, 'moonRun', 25));
  assert.equal(best, false);
  ({ records, best } = recordStunt(records, 'moonRun', 15.26));
  assert.deepEqual([records.moonRun, best], [15.26, true]);
  ({ records } = recordStunt(records, 'moonSkim', 1200.4));
  assert.equal(recordStunt(records, 'moonSkim', 3000).best, true);
  assert.equal(recordStunt(records, 'moonSkim', 1100).best, false);
  assert.equal(recordText('moonRun', records), '기록 15.3초');
  assert.equal(recordText('moonSkim', records), '기록 1,200km');
  assert.equal(valueText('moonSkim', 2140.6), '2,141km');
  assert.equal(recordText('earthLap', records), '아직 기록 없음');
  assert.deepEqual(sanitizeStunts({ moonRun: 15.26, moonSkim: -1, earthLap: 'x', other: 3 }), { moonRun: 15.26 });
  assert.deepEqual(sanitizeStunts(null), {});
});

test('through the gap in the rings of Saturn: only a crossing inside the Cassini division counts', () => {
  const saturn = bodyById('saturn');
  const cross = (t, body = 'saturn') => ({ ...at(above(saturn, 60000)), ring: { body, t }, speedKmS: 41234.4 });
  let run = startStunt('ringGap');
  assert.equal(stuntStatus(run), '고리 틈 지나기: 토성 고리의 검은 틈으로');
  // No crossing: nothing. Through the bright B ring: said, and she may try again.
  assert.equal(stepStunt(run, at(above(saturn, 60000)), 1).done, null);
  const ice = stepStunt(run, cross(0.5), 1);
  assert.equal(ice.done, null);
  assert.match(stuntStatus(ice.run), /얼음을 지났습니다/);
  assert.equal(stepStunt(ice.run, cross(0.9), 1).done, null);
  assert.equal(stepStunt(run, cross(0.72, 'uranus'), 1).done, null);
  // Inside the division, at either edge of it.
  assert.equal(stepStunt(ice.run, cross(0.72), 1).done, 41234.4);
  assert.equal(stepStunt(run, cross(0.69), 1).done, 41234.4);
  assert.equal(stepStunt(run, cross(0.765), 1).done, null);
  assert.equal(valueText('ringGap', 41234.4), '초속 41,234km');
  assert.equal(recordStunt({ ringGap: 30000 }, 'ringGap', 41234.4).best, true);
});
