import { test } from 'vitest';
import assert from 'node:assert/strict';
import { LANDER_STAGES, LANDER_REPLAYS } from '../src/core/landerScenes.js';
import { LANDER_TEXTS } from '../src/core/landerTexts.js';
import { REPLAYS, replayFrame, replaySounds } from '../src/core/replay.js';
import { STORIES } from '../src/core/stories.js';

const ALL = { ...LANDER_STAGES, ...LANDER_REPLAYS };

test('twenty-one landing places that had only a model have a scene: twelve on the Moon, nine on Mars', () => {
  assert.equal(Object.keys(LANDER_STAGES).length, 16);
  assert.equal(Object.keys(LANDER_REPLAYS).length, 5);
  assert.deepEqual(Object.keys(ALL).sort(), Object.keys(LANDER_TEXTS).sort());
  const on = (body) => Object.keys(ALL).filter((id) => STORIES.find((s) => s.id === id).body === body).length;
  assert.equal(on('moon'), 12);
  assert.equal(on('mars'), 9);
  for (const id of Object.keys(ALL)) assert.equal(REPLAYS[id], ALL[id], id);
});

test('each is told in four lines of 30 to 80 letters, the first from its day, and has a bubble', () => {
  for (const [id, scene] of Object.entries(ALL)) {
    assert.equal(scene.lines.length, 4, id);
    assert.equal(scene.lines[0].at, 0, id);
    scene.lines.forEach((line, i) => {
      assert.ok(line.text.length >= 30 && line.text.length <= 80, `${id} ${i}: ${line.text.length}`);
      assert.ok(!line.text.includes('~'), id);
      if (i) assert.ok(line.at > scene.lines[i - 1].at && line.at < scene.seconds, `${id} ${i}`);
    });
    assert.ok(scene.lines[0].text.startsWith(`${scene.day}.`), id);
    const say = LANDER_TEXTS[id].say;
    assert.ok(say.length >= 4 && !/\d/.test(say), id);
    assert.ok(replayFrame(id, scene.seconds).done, id);
    for (const [at] of scene.sounds) assert.ok(at >= 0 && at < scene.seconds, id);
    assert.ok(replaySounds(id, -1, scene.seconds).length === scene.sounds.length, id);
  }
});

test('a stage has its lander high at first and on the ground from the moment it is down, and its bubble comes and goes', () => {
  for (const [id, scene] of Object.entries(LANDER_STAGES)) {
    const at = (t) => scene.stage(t);
    assert.ok(at(0).lander.y > 2, id);
    assert.ok(at(scene.downAt + 1).lander.y < 1e-9, id);
    assert.ok(at(scene.seconds).lander.y < 1e-9, id);
    assert.equal(Boolean(at(0).say.shown), false, id);
    let said = 0;
    for (let t = 0; t <= scene.seconds; t += 0.25) {
      const pieces = at(t);
      if (pieces.say.shown) said += 1;
      // Nothing is drawn past the right edge of a phone's view while the bubble is up.
      if (pieces.say.shown) assert.ok(pieces.say.x <= 1.25, `${id} ${t}`);
      for (const [name, piece] of Object.entries(pieces)) for (const key of ['x', 'y']) assert.ok(Number.isFinite(piece[key]), `${id} ${name} ${key} ${t}`);
    }
    assert.ok(said >= 12, `${id}: the bubble is up ${said / 4} s`);
  }
});

test('what happens after the landing: a golf ball flies, a car drives off, a jump, a rover rolls out, a rocket leaves', () => {
  const s = (id, t) => LANDER_STAGES[id].stage(t);
  assert.ok(!s('apollo14', 19).ball.shown && s('apollo14', 21).ball.shown && s('apollo14', 21).ball.x > 1.5);
  // What an astronaut says stands over him, to the right of the lander, not over the lander.
  assert.ok(s('apollo14', 21).say.x > s('apollo14', 21).al.x && s('apollo14', 21).lander.x < -0.5);
  assert.ok(s('apollo16', 20).say.x > s('apollo16', 20).john.x);
  // The photograph of the jump comes up at its top, over the lander, and stays.
  assert.ok(!s('apollo16', 18.2).photo.shown && s('apollo16', 20).photo.shown && s('apollo16', 26).photo.scale === 1);
  assert.ok(s('apollo16', 20).photo.x < 0 && s('apollo16', 20).photo.y + 0.65 <= 1.5);
  assert.ok(s('apollo15', 24).rover.x > s('apollo15', 16).rover.x + 1);
  assert.ok(s('apollo16', 18.25).john.y > 0.3 && s('apollo16', 19.3).john.y === 0 && s('apollo16', 20.35).john.y > 0.3);
  for (const id of ['lunokhod2', 'change3', 'change4', 'zhurong']) {
    assert.ok(s(id, 12).rover.y > 0.3, id);
    assert.ok(s(id, 25).rover.y === 0 && s(id, 25).rover.x > 1.5, id);
  }
  for (const id of ['luna24', 'change5', 'change6']) {
    assert.ok(s(id, 14).rocket.y < 1e-9 && !s(id, 14).rocket.burn, id);
    assert.ok(s(id, 19).rocket.y > 1.5 && s(id, 19).rocket.burn, id);
    assert.ok(s(id, 25).lander.y < 1e-9, id);
  }
  assert.ok(Math.abs(s('viking2', 20).lander.lean + 0.14) < 1e-9);
  assert.ok(Math.abs(s('apollo14', 12).lander.lean - 0.14) < 1e-9);
});

test('five come down in the older ways: Mars 3 under a parachute, three inside air bags, Perseverance on cords', () => {
  for (const id of ['beagle2', 'spirit', 'opportunity']) {
    assert.equal(replayFrame(id, 0).bag, 1, id);
    assert.ok(replayFrame(id, LANDER_REPLAYS[id].downAt).liftKm < 1e-9, id);
    assert.ok(replayFrame(id, LANDER_REPLAYS[id].seconds).bag === 0, id);
    // Shut inside the bags; once they are down it opens (the place's own model stands there).
    assert.ok(!replayFrame(id, LANDER_REPLAYS[id].downAt).open && replayFrame(id, LANDER_REPLAYS[id].seconds - 1).open, id);
    // (Its bubble is gone, or nearly, before it opens: the bubble goes with what came down.)
    assert.ok(id === 'beagle2' || LANDER_REPLAYS[id].say[1] <= LANDER_REPLAYS[id].openAt, id);
  }
  for (const id of ['mars3', 'perseverance']) {
    assert.equal(replayFrame(id, 0).liftKm, 14, id);
    assert.ok(replayFrame(id, 17).down, id);
  }
  for (const id of Object.keys(LANDER_REPLAYS)) {
    const [from, to] = LANDER_REPLAYS[id].say;
    assert.ok(replayFrame(id, (from + to) / 2).say === 1 && replayFrame(id, from - 0.1).say === 0, id);
  }
});
