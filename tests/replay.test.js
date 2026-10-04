import { test } from 'vitest';
import assert from 'node:assert/strict';
import { REPLAYS, replayFor, replayFrame, replayOn } from '../src/core/replay.js';
import { STORIES } from '../src/core/stories.js';

test('every scene belongs to a story place on a surface and tells its lines in order', () => {
  for (const [id, scene] of Object.entries(REPLAYS)) {
    if (scene.on) assert.ok(STORIES.some((s) => s.type === 'land' && s.body === scene.on), id);
    else assert.equal(STORIES.find((s) => s.id === id)?.type, 'surface', id);
    assert.equal(scene.lines[0].at, 0);
    for (let i = 1; i < scene.lines.length; i++) assert.ok(scene.lines[i].at > scene.lines[i - 1].at);
    assert.ok(scene.downAt < scene.seconds);
    for (const l of scene.lines) {
      assert.ok(l.text.length >= 30 && l.text.length <= 80, `${id}: ${l.text.length}`);
      // Each line stays up at least four seconds.
      const next = scene.lines[scene.lines.indexOf(l) + 1]?.at ?? scene.seconds;
      assert.ok(next - l.at >= 4, `${id} at ${l.at}`);
    }
  }
});

test('a place with no scene has none', () => {
  assert.equal(replayFor('tycho'), null);
  assert.equal(replayFrame('tycho', 3), null);
  assert.equal(replayFor('apollo11').day, '1969년 7월 20일');
});

test('the lander starts high, slows as it nears the ground and is down at 17 seconds', () => {
  const at = (t) => replayFrame('apollo11', t);
  assert.equal(at(0).liftKm, 14);
  assert.ok(at(0).flame);
  // Slower and slower: the first half of the way down takes less than the second.
  assert.ok(at(8.5).liftKm < 7);
  let last = Infinity;
  for (let t = 0; t <= 17; t += 0.5) {
    assert.ok(at(t).liftKm <= last);
    last = at(t).liftKm;
  }
  assert.equal(at(17).liftKm, 0);
  assert.ok(at(17).down);
  assert.ok(!at(17).flame);
  assert.ok(!at(16.9).down);
});

test('the line told is the last one whose moment has come, and the scene ends at 24 seconds', () => {
  const at = (t) => replayFrame('apollo11', t);
  assert.equal(at(0).line, 0);
  assert.equal(at(4.9).line, 0);
  assert.equal(at(5).line, 1);
  assert.equal(at(12).line, 2);
  assert.match(at(17).text, /이글은 착륙했다/);
  assert.ok(!at(23.9).done);
  assert.ok(at(24).done);
});

test('resting on Saturn offers the plunge of Cassini, and no other body offers a scene', () => {
  assert.equal(replayOn('saturn'), 'cassiniPlunge');
  assert.equal(replayOn('moon'), null);
  assert.equal(replayOn('jupiter'), null);
});

test('Cassini comes in from the side, glows from a third of the way and is gone at 15 seconds', () => {
  const at = (t) => replayFrame('cassiniPlunge', t);
  assert.equal(at(0).acrossKm, 130);
  assert.equal(at(0).liftKm, 70);
  assert.equal(at(0).glow, 0);
  assert.ok(!at(0).flame);
  assert.ok(at(7.5).acrossKm < 130 && at(7.5).acrossKm > 0);
  assert.ok(at(7.5).glow > 0 && at(7.5).glow < 1);
  assert.equal(at(12).glow, 1);
  assert.ok(!at(14.9).gone);
  assert.ok(at(15).gone);
  assert.equal(at(15).acrossKm, 0);
  assert.equal(at(15).liftKm, 20);
  assert.match(at(15).text, /신호가 끊겼습니다/);
  assert.ok(at(22).done);
  // The landing never goes sideways, glows or vanishes.
  assert.deepEqual([replayFrame('apollo11', 8).acrossKm, replayFrame('apollo11', 8).glow, replayFrame('apollo11', 20).gone], [0, 0, false]);
});

test('Huygens comes down like the lander: from 14 km, down at 17 seconds, its last line then', () => {
  const at = (t) => replayFrame('huygens', t);
  assert.equal(replayFor('huygens').day, '2005년 1월 14일');
  assert.equal(at(0).liftKm, 14);
  assert.ok(at(16.9).flame && !at(17).flame);
  assert.equal(at(17).liftKm, 0);
  assert.equal(at(11.9).line, 1);
  assert.match(at(17).text, /가장 먼 곳/);
  assert.ok(at(24).done);
});

test('Curiosity has a scene of its own day, told in four lines', () => {
  assert.equal(replayFor('curiosity').day, '2012년 8월 6일');
  assert.equal(replayFor('curiosity').lines.length, 4);
  assert.match(replayFrame('curiosity', 17).text, /게일 분화구/);
  assert.equal(Object.keys(REPLAYS).length, 5);
  assert.equal(replayFor('viking1').day, '1976년 7월 20일');
  assert.match(replayFrame('viking1', 17).text, /25초/);
});

test('the seconds since it came down are counted from the moment it is down', () => {
  assert.equal(replayFrame('curiosity', 10).after, 0);
  assert.equal(replayFrame('curiosity', 17).after, 0);
  assert.equal(replayFrame('curiosity', 19.5).after, 2.5);
});
