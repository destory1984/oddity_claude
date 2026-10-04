import { test } from 'vitest';
import assert from 'node:assert/strict';
import { REPLAYS, replayFor, replayFrame } from '../src/core/replay.js';
import { STORIES } from '../src/core/stories.js';

test('every scene belongs to a story place on a surface and tells its lines in order', () => {
  for (const [id, scene] of Object.entries(REPLAYS)) {
    assert.equal(STORIES.find((s) => s.id === id)?.type, 'surface', id);
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
