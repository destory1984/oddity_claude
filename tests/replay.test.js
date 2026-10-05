import { test } from 'vitest';
import assert from 'node:assert/strict';
import { REPLAYS, replayFor, replayFrame, replayOn, replaySounds } from '../src/core/replay.js';
import { STORIES } from '../src/core/stories.js';
import { CRAFT } from '../src/core/craft.js';

test('every scene belongs to a story place on a surface and tells its lines in order', () => {
  for (const [id, scene] of Object.entries(REPLAYS)) {
    // A scene on a body belongs to a story told there: by landing on it (Saturn), or by
    // passing near it (Philae's comet).
    // A scene of unfolding belongs to a craft she can dock with.
    if (scene.unfold) assert.ok(CRAFT.some((c) => c.id === id), id);
    else if (scene.on) assert.ok(STORIES.some((s) => (s.type === 'land' && s.body === scene.on) || (s.type === 'near' && s.target === scene.on)), id);
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
  const at = (t) => replayFrame('viking1', t);
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
  const at = (t) => replayFrame('viking1', t);
  assert.equal(at(0).line, 0);
  assert.equal(at(5.9).line, 0);
  assert.equal(at(6).line, 1);
  assert.equal(at(12).line, 2);
  assert.match(at(17).text, /첫 사진/);
  assert.ok(!at(23.9).done);
  assert.ok(at(24).done);
});

test('resting on Saturn offers the plunge of Cassini, on Philae\'s comet its landing, and no other body a scene', () => {
  assert.equal(replayOn('saturn'), 'cassiniPlunge');
  assert.equal(replayOn('churyumov'), 'philaeLanding');
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
  assert.equal(Object.keys(REPLAYS).length, 18);
  assert.equal(replayFor('viking1').day, '1976년 7월 20일');
  assert.match(replayFrame('viking1', 17).text, /25초/);
});

test('the seconds since it came down are counted from the moment it is down', () => {
  assert.equal(replayFrame('curiosity', 10).after, 0);
  assert.equal(replayFrame('curiosity', 17).after, 0);
  assert.equal(replayFrame('curiosity', 19.5).after, 2.5);
});

test('Luna 9 and Pathfinder come in bouncing inside their air bags and stop at the place', () => {
  for (const id of ['luna9', 'pathfinder']) {
    const scene = REPLAYS[id];
    const at = (t) => replayFrame(id, t);
    assert.equal(at(0).liftKm, scene.fromKm, id);
    assert.equal(at(0).acrossKm, scene.acrossKm, id);
    assert.equal(at(0).bag, 1, id);
    assert.ok(!at(0).flame && !at(0).gone);
    // It touches the ground at the end of the fall and at the end of every hop, and is
    // in the air between; each hop is lower than the one before.
    assert.ok(at(scene.fall).liftKm < 1e-9, id);
    let start = scene.fall;
    let last = Infinity;
    for (const hop of scene.hops) {
      assert.ok(Math.abs(at((start + hop.until) / 2).liftKm - hop.peakKm) < 1e-9, `${id} peak`);
      assert.ok(hop.peakKm < last, id);
      last = hop.peakKm;
      start = hop.until;
    }
    assert.equal(scene.hops[scene.hops.length - 1].until, scene.downAt, id);
    // Nearer all the way, and never going back.
    let side = Infinity;
    for (let t = 0; t <= scene.downAt; t += 0.5) {
      assert.ok(at(t).acrossKm <= side, id);
      side = at(t).acrossKm;
    }
    assert.equal(at(scene.downAt).acrossKm, 0, id);
    assert.equal(at(scene.downAt).liftKm, 0, id);
    assert.ok(at(scene.downAt).down && !at(scene.downAt - 0.1).down, id);
    // The ball has gone round whole turns, so what is inside is the right way up.
    assert.ok(Math.abs(at(scene.downAt).turn - scene.turns * 2 * Math.PI) < 1e-9, id);
    // The bags go down after it has stopped, not before.
    assert.equal(at(scene.downAt).bag, 1, id);
    assert.ok(at(scene.downAt + scene.bagSeconds / 2).bag > 0 && at(scene.downAt + scene.bagSeconds / 2).bag < 1, id);
    assert.equal(at(scene.downAt + scene.bagSeconds).bag, 0, id);
    assert.ok(at(scene.seconds).done && !at(scene.seconds - 0.1).done, id);
  }
});

test('Luna 9 opens its petals after its bags are off; Pathfinder is shown open as its bags go down', () => {
  const luna = REPLAYS.luna9;
  assert.ok(luna.openAt >= luna.downAt + luna.bagSeconds);
  assert.ok(!replayFrame('luna9', luna.openAt - 0.1).open);
  assert.ok(replayFrame('luna9', luna.openAt).open);
  assert.ok(!replayFrame('pathfinder', 25).open);
});

test('Philae comes straight down, bounces away twice and ends leaning, with no bags round it', () => {
  const scene = REPLAYS.philaeLanding;
  const at = (t) => replayFrame('philaeLanding', t);
  // Straight down: it does not move sideways until it has touched.
  assert.equal(at(0).acrossKm, scene.acrossKm);
  assert.equal(at(scene.fall).acrossKm, scene.acrossKm);
  assert.ok(at(scene.fall + 2).acrossKm < scene.acrossKm);
  assert.equal(at(scene.downAt).acrossKm, 0);
  // The first bounce is far the longer and higher (1 h 50 min against 7 min).
  const [first, second] = scene.hops;
  assert.ok(first.until - scene.fall > 3 * (second.until - first.until));
  assert.ok(first.peakKm > 5 * second.peakKm);
  // Upright until the last hop, leaning over by the end of it.
  assert.equal(at(first.until).tilt, 0);
  assert.ok(Math.abs(at(scene.downAt).tilt - scene.tiltRad) < 1e-9);
  assert.equal(at(5).bag, 0);
  assert.equal(at(5).turn, 0);
  // Drawn small: the comet is 4 km across.
  assert.ok(at(0).sizeKm < 1 && scene.fromKm < 2 && scene.viewKm < 5);
});

test('a scene that does not bounce has none of the bouncing measures', () => {
  const frame = replayFrame('viking1', 3);
  assert.equal(frame.bag, undefined);
  assert.equal(frame.open, undefined);
  assert.ok(frame.flame);
});

test('Crew Dragon goes up from pad 39A: the stages part, the first comes back to stand on the ship', () => {
  const scene = REPLAYS.lc39a;
  const at = (t) => replayFrame('lc39a', t).launch;
  assert.equal(replayFor('lc39a').day, '2020년 5월 30일');
  // On the pad until it leaves; the engines light a second before.
  assert.equal(at(0).booster.y, 0);
  assert.ok(!at(1).booster.burn && at(2.5).booster.burn && at(2.5).booster.y === 0);
  // One piece until they part, rising faster and faster.
  assert.equal(at(8).booster.y, at(8).upper.y);
  assert.ok(at(8).booster.y - at(6).booster.y > at(6).booster.y - at(4).booster.y);
  assert.ok(Math.abs(at(scene.launch.partAt).booster.y - scene.launch.partUnits) < 1e-9);
  // Then the second stage goes on up and is gone; the first falls back to the ship.
  assert.ok(at(16).upper.y > at(16).booster.y + 2);
  assert.ok(at(20).upper.gone);
  assert.ok(at(22).booster.burn && at(22).booster.legs && at(22).booster.y > 0);
  const landed = replayFrame('lc39a', scene.downAt);
  assert.ok(landed.down && landed.launch.booster.y < 1e-9 && !landed.launch.booster.burn);
  assert.ok(Math.abs(landed.launch.booster.x - scene.launch.shipUnits) < 1e-9);
});

test('the launch is heard: the engines at 2 s, the stages parting at 12, the landing burn as it begins, the bells as it stands', () => {
  assert.deepEqual(replaySounds('lc39a', -1, 30), ['liftoff', 'staging', 'landingBurn', 'stood']);
  // Each once, in the frame its moment falls in.
  assert.deepEqual(replaySounds('lc39a', -1, 1.9), []);
  assert.deepEqual(replaySounds('lc39a', 1.99, 2.01), ['liftoff']);
  assert.deepEqual(replaySounds('lc39a', 2.01, 2.03), []);
  assert.deepEqual(replaySounds('lc39a', 11, 25), ['staging', 'landingBurn', 'stood']);
  // The landing burn sounds when the first stage's engine lights again, the bells when it is down.
  const scene = REPLAYS.lc39a;
  const burnAt = scene.sounds.find(([, name]) => name === 'landingBurn')[0];
  assert.ok(!replayFrame('lc39a', burnAt - 0.1).launch.booster.burn && replayFrame('lc39a', burnAt + 0.1).launch.booster.burn);
  assert.equal(scene.sounds.find(([, name]) => name === 'stood')[0], scene.downAt);
  assert.equal(scene.sounds.find(([, name]) => name === 'liftoff')[0], scene.launch.igniteAt);
  assert.deepEqual(replaySounds('nowhere', -1, 100), []);
});

test('every scene is heard: an engine over the last seconds, wind past a parachute, a thud at each bounce, a roar as Cassini burns', () => {
  for (const [id, scene] of Object.entries(REPLAYS)) {
    assert.ok(scene.sounds?.length > 0, id);
    const times = scene.sounds.map(([at]) => at);
    assert.ok(times.every((at, i) => at >= 0 && at < scene.seconds && (i === 0 || at >= times[i - 1])), id);
  }
  // The landing burn (3.7 s long) ends as it touches.
  for (const id of ['apollo11', 'viking1', 'curiosity']) assert.ok(Math.abs(REPLAYS[id].sounds[0][0] + 3.7 - REPLAYS[id].downAt) < 1e-9, id);
  // A bounce at the first touch and at the end of every hop but the last (the thump of landing is that one).
  for (const id of ['luna9', 'pathfinder', 'philaeLanding']) {
    const scene = REPLAYS[id];
    const touches = [scene.fall, ...scene.hops.slice(0, -1).map((hop) => hop.until)];
    assert.deepEqual(scene.sounds.filter(([, name]) => name === 'bounce').map(([at]) => at), touches, id);
    for (const at of touches) assert.ok(replayFrame(id, at).liftKm < 1e-9, `${id} at ${at}`);
  }
  // Cassini's roar (ten seconds) is cut off as it is gone.
  assert.equal(REPLAYS.cassiniPlunge.sounds[0][0] + 10, REPLAYS.cassiniPlunge.downAt);
  assert.deepEqual(replaySounds('huygens', -1, 100), ['chute']);
});

test('Apollo 11: Eagle lands, Armstrong comes down the ladder and says his sentence, Aldrin follows, the flag goes up and the two hop about', async () => {
  const { APOLLO11 } = await import('../src/core/moonScenes.js');
  assert.equal(REPLAYS.apollo11, APOLLO11);
  const at = (t) => APOLLO11.stage(t);
  const names = Object.keys(at(0));
  assert.deepEqual(names, ['lander', 'neilLadder', 'neil', 'buzzLadder', 'buzz', 'flag']);
  let lastY = Infinity;
  for (let t = 0; t <= APOLLO11.seconds; t += 0.05) {
    const frame = replayFrame('apollo11', t);
    assert.deepEqual(Object.keys(frame.stage), names);
    for (const [name, piece] of Object.entries(frame.stage)) {
      for (const key of ['x', 'y', 'z', 'lean', 'turn', 'scale']) if (key in piece) assert.ok(Number.isFinite(piece[key]), `${name}.${key} at ${t}`);
      if (piece.shown !== false) assert.ok(piece.y >= -1e-9, `${name} at ${t}`);
    }
    // The lander only comes down, and nobody is out before it stands.
    assert.ok(frame.stage.lander.y <= lastY + 1e-9);
    lastY = frame.stage.lander.y;
    if (t < 17) assert.ok(frame.stage.lander.burn && Object.entries(frame.stage).every(([name, piece]) => name === 'lander' || piece.shown === false));
  }
  assert.ok(at(0).lander.y >= 2 && at(17).lander.y === 0 && at(17).lander.x === 0 && !at(17).lander.burn);
  // Armstrong: from the porch down nine rungs to the ground, where he is as his sentence is told.
  // He comes down backwards, facing the lander, hands on the ladder, and turns round on the ground.
  assert.ok(at(23.5).neilLadder.shown && !at(23.5).neil.shown && Math.abs(at(23.5).neilLadder.y - 0.41) < 1e-9);
  for (let t = 23.5, last = 1; t < 29.5; t += 0.1) {
    assert.ok(at(t).neilLadder.y <= last + 1e-9, `he does not climb back up at ${t}`);
    assert.equal(at(t).neilLadder.turn, Math.PI);
    last = at(t).neilLadder.y;
  }
  assert.ok(!at(29.5).neilLadder.shown && at(29.5).neil.shown && at(29.5).neil.turn === Math.PI && at(30.5).neil.turn === 0);
  assert.ok(Math.abs(at(29.49).neilLadder.x - at(29.5).neil.x) < 0.01 && at(29.49).neilLadder.y < 0.01);
  assert.ok(at(30).neil.y === 0 && Math.abs(at(30).neil.x - 0.5) < 1e-9);
  assert.match(replayFrame('apollo11', 30).text, /작은 한 걸음/);
  // Aldrin is out after him and down before the flag stands.
  assert.ok(!at(35.9).buzzLadder.shown && at(36).buzzLadder.shown && at(36).buzzLadder.turn === Math.PI && at(40).buzz.shown && !at(40).buzzLadder.shown && at(40).buzz.y < 1e-9 && at(41).buzz.turn === 0);
  // The flag goes up between them, where the place's own model has it (0.62, 0, 0.3).
  assert.ok(at(40.4).flag.shown === false && at(41).flag.scale < 1 && at(42).flag.scale === 1);
  assert.deepEqual([at(50).flag.x, at(50).flag.z], [0.62, 0.3]);
  assert.ok(at(43).neil.x < 0.62 && at(43).buzz.x > 0.62 && at(43).neil.z === 0.3 && Math.abs(at(43).buzz.z - 0.3) < 1e-9);
  // They hop: off the ground and back many times in twelve seconds, never into each other's place for long,
  // and stand again by the flag at the end.
  for (const who of ['neil', 'buzz']) {
    let hops = 0;
    for (let t = 44, up = false; t <= 56; t += 0.02) {
      const high = at(t)[who].y > 0.05;
      if (high && !up) hops += 1;
      up = high;
    }
    assert.ok(hops >= 14, `${who} hops ${hops} times`);
    assert.ok(at(56)[who].y < 1e-9 && at(57.9)[who].y < 1e-9, who);
  }
  assert.ok(Math.abs(at(57).neil.x - 0.5) < 1e-9 && Math.abs(at(57).buzz.x - 0.78) < 1e-9);
  // Heard: the engine, the thump, bells at the first step and as the flag stands, the hops as they begin.
  assert.deepEqual(replaySounds('apollo11', -1, 60), ['landingBurn', 'landed', 'stood', 'stood', 'hops']);
  assert.ok(!replayFrame('apollo11', 57.9).done && replayFrame('apollo11', 58).done);
});

test('eight scenes on the Moon are stages: every piece has a place at every moment, and each ends as the place stands now', async () => {
  const { MOON_SCENES } = await import('../src/core/moonScenes.js');
  assert.deepEqual(Object.keys(MOON_SCENES).sort(), ['apollo12', 'apollo17', 'chandrayaan3', 'luna16', 'luna2', 'lunokhod1', 'odysseus', 'slim']);
  for (const [id, scene] of Object.entries(MOON_SCENES)) {
    assert.equal(REPLAYS[id], scene, id);
    const names = Object.keys(scene.stage(0));
    for (let t = 0; t <= scene.seconds; t += 0.25) {
      const frame = replayFrame(id, t);
      assert.deepEqual(Object.keys(frame.stage), names, `${id} at ${t}`);
      assert.ok(!frame.down && !frame.flame && frame.liftKm === 0, id);
      for (const [name, at] of Object.entries(frame.stage)) {
        for (const key of ['x', 'y', 'lean', 'scale']) if (key in at) assert.ok(Number.isFinite(at[key]), `${id} ${name}.${key} at ${t}`);
        // Nothing shown is under the ground.
        if (at.shown !== false) assert.ok(at.y >= -1e-9, `${id} ${name} at ${t}: y ${at.y}`);
      }
    }
    // What is heard falls inside the scene, in order.
    const times = scene.sounds.map(([at]) => at);
    assert.ok(times.every((at, i) => at >= 0 && at < scene.seconds && (i === 0 || at > times[i - 1])), id);
  }
});

test('on the Moon two go up, three land, two roll out, one falls on its nose, one on its side and one only hits', async () => {
  const { MOON_SCENES } = await import('../src/core/moonScenes.js');
  const at = (id, t) => MOON_SCENES[id].stage(t);
  // Apollo 17's cabin and Luna 16's rocket stand until their moment, then climb out of sight.
  for (const [id, piece] of [['apollo17', 'ascent'], ['luna16', 'rocket']]) {
    const leaves = MOON_SCENES[id].downAt;
    assert.equal(at(id, leaves - 0.1)[piece].y, 0, id);
    assert.ok(!at(id, leaves - 0.1)[piece].burn && at(id, leaves + 0.1)[piece].burn, id);
    assert.ok(at(id, leaves + 2)[piece].y > at(id, leaves + 1)[piece].y, id);
    assert.equal(at(id, MOON_SCENES[id].seconds)[piece].shown, false, id);
  }
  assert.deepEqual(at('apollo17', 20).descent, { x: 0, y: 0 });
  // The landers come down slower and slower and are down at their moment, engines off.
  for (const [id, piece] of [['lunokhod1', 'lander'], ['chandrayaan3', 'lander'], ['apollo12', 'lander'], ['odysseus', 'lander']]) {
    const down = MOON_SCENES[id].downAt;
    assert.ok(at(id, 0)[piece].y > 2 && at(id, 0)[piece].burn, id);
    assert.ok(at(id, down / 2)[piece].y < at(id, 0)[piece].y / 2, id);
    assert.equal(at(id, down)[piece].y, 0, id);
    assert.ok(!at(id, down)[piece].burn, id);
  }
  // Apollo 12 comes to rest at the place, Surveyor 1.2 to the side of it all along.
  assert.ok(Math.abs(at('apollo12', 14).lander.x) < 1e-9 && at('apollo12', 3).surveyor.x === 1.2);
  // The rovers ride down on the deck, take the ramp nose down and drive off level.
  for (const id of ['lunokhod1', 'chandrayaan3']) {
    const end = at(id, MOON_SCENES[id].seconds).rover;
    assert.ok(end.x > 1.5 && end.y === 0 && end.lean === 0, id);
    let tipped = false;
    let last = -Infinity;
    for (let t = MOON_SCENES[id].downAt; t <= MOON_SCENES[id].seconds; t += 0.25) {
      const r = at(id, t).rover;
      assert.ok(r.x >= last - 1e-9, `${id} rolls back at ${t}`);
      last = r.x;
      if (r.lean < -0.5) tipped = true;
    }
    assert.ok(tipped, id);
  }
  assert.equal(at('lunokhod1', 4).rover.y, 0.41 + at('lunokhod1', 4).lander.y);
  assert.equal(at('chandrayaan3', 10).rover.shown, false);
  // SLIM ends on its nose at the place, as its model stands there (2.9 radians over,
  // its middle 0.2 up); its robots are out before it is down.
  const slim = at('slim', 24).slim;
  assert.ok(Math.abs(slim.x) < 1e-9 && Math.abs(slim.y - 0.2) < 1e-9 && Math.abs(slim.lean - 2.9) < 1e-9);
  assert.ok(!at('slim', 10).lev1.shown && at('slim', 11).lev1.shown && at('slim', 11).lev1.x > at('slim', 11).lev2.x);
  assert.ok(!at('slim', 5.9).nozzle.shown && at('slim', 6.1).nozzle.shown);
  // Odysseus ends leaning as its model does (0.55 radians), at the place.
  const ody = at('odysseus', 24).lander;
  assert.ok(Math.abs(ody.x) < 1e-9 && Math.abs(ody.lean + 0.55) < 1e-9 && at('odysseus', 11).lander.lean === 0);
  // Luna 2 flies in at an even speed and is gone at the flash; the wreck is there after.
  const gap = (a, b) => Math.hypot(at('luna2', a).probe.x - at('luna2', b).probe.x, at('luna2', a).probe.y - at('luna2', b).probe.y);
  assert.ok(Math.abs(gap(1, 2) - gap(7, 8)) < 1e-9);
  assert.ok(at('luna2', 8.9).probe.shown && !at('luna2', 9).probe.shown && at('luna2', 9).wreck.shown && !at('luna2', 8.9).wreck.shown);
  assert.ok(!at('luna2', 8.9).flash.shown && at('luna2', 9.25).flash.scale > 1.9 && !at('luna2', 11).flash.shown);
});

test('Webb unfolds while she is docked with it: pallets, tower, booms, the five layers, the secondary mirror, then the two wings', async () => {
  const { CRAFT_SCENES } = await import('../src/core/craftScenes.js');
  const scene = CRAFT_SCENES.jwst;
  assert.equal(REPLAYS.jwst, scene);
  const order = ['pallets', 'tower', 'booms', 'tension', 'secondary', 'wingLeft', 'wingRight'];
  assert.deepEqual(Object.keys(scene.unfold(0)), order);
  // Folded as it left, open as it flies now, and nothing folds back on the way.
  assert.ok(order.every((name) => scene.unfold(0)[name] === 0 && scene.unfold(scene.downAt)[name] === 1));
  const last = Object.fromEntries(order.map((name) => [name, 0]));
  const doneAt = {};
  for (let t = 0; t <= scene.seconds; t += 0.05) {
    const frame = replayFrame('jwst', t);
    assert.ok(!frame.down && !frame.flame && frame.liftKm === 0 && frame.acrossKm === 0);
    for (const name of order) {
      const now = frame.unfold[name];
      assert.ok(now >= last[name] - 1e-12 && now >= 0 && now <= 1, `${name} at ${t}`);
      last[name] = now;
      if (now === 1 && doneAt[name] === undefined) doneAt[name] = t;
    }
  }
  // One part at a time, in the order it really went.
  order.forEach((name, i) => {
    if (i > 0) assert.ok(scene.unfold(doneAt[order[i - 1]] - 0.1)[name] === 0, `${name} waits for ${order[i - 1]}`);
  });
  // The last wing latches as the last line is told, and each latch is heard as it happens.
  assert.match(replayFrame('jwst', scene.downAt).text, /344/);
  assert.deepEqual(scene.sounds.filter(([, name]) => name === 'clunk').map(([at]) => at), [34, 37]);
  assert.ok(!replayFrame('jwst', scene.seconds - 0.1).done && replayFrame('jwst', scene.seconds).done);
});
