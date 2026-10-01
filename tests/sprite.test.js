import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  SHEETS, FRAMES, SPRITE_FPS, IDLE_ROUND_S, SHEET_HOLD_S, createSpriteState, flightSheet, stepSprite, spriteFrame, spriteFile,
} from '../src/core/sprite.js';

// Already in flight, showing her back.
const FLYING = { sheet: 'backward', time: 0, moving: true, since: 0, turn: [0, 0] };

test('eight sheets of four frames, and every drawing is in the assets folder', () => {
  assert.deepEqual(SHEETS, ['forward', 'backward', 'left', 'right', 'up', 'down', 'brake', 'idle']);
  assert.equal(FRAMES, 4);
  assert.deepEqual(SPRITE_FPS, { flight: 10, brake: 5 });
  for (const sheet of SHEETS) {
    for (let frame = 0; frame < FRAMES; frame++) {
      assert.ok(existsSync(`public/assets/${spriteFile(sheet, frame)}`), spriteFile(sheet, frame));
    }
  }
  assert.equal(spriteFile('idle', 0), 'seora-sprites/idle-1.png');
});

test('the camera is behind her: flying ahead shows her back, reversing shows her front', () => {
  assert.equal(flightSheet({ drive: 1 }), 'backward');
  assert.equal(flightSheet({ drive: 0 }), 'backward');
  assert.equal(flightSheet({ drive: -1 }), 'forward');
});

test('sliding and turning show her side; pitching shows up and down', () => {
  assert.equal(flightSheet({ drive: 0, strafe: 1 }), 'right');
  assert.equal(flightSheet({ drive: 0, strafe: -1 }), 'left');
  assert.equal(flightSheet({ drive: 1, turn: [0.6, 0] }), 'right');
  assert.equal(flightSheet({ drive: 1, turn: [-0.6, 0] }), 'left');
  assert.equal(flightSheet({ drive: 1, turn: [0, 0.6] }), 'down');
  assert.equal(flightSheet({ drive: 1, turn: [0, -0.6] }), 'up');
  // The stronger of the two wins; a slight turn is plain flight.
  assert.equal(flightSheet({ drive: 1, turn: [0.5, 0.9] }), 'down');
  assert.equal(flightSheet({ drive: 1, turn: [0.9, 0.5] }), 'right');
  assert.equal(flightSheet({ drive: 1, turn: [0.2, 0.2] }), 'backward');
  // Thrusting ahead while sliding keeps the rear view unless she is also turning.
  assert.equal(flightSheet({ drive: 1, strafe: 1 }), 'backward');
});

test('flight loops at ten frames a second and keeps its beat when the sheet changes', () => {
  let state = createSpriteState();
  assert.deepEqual(state, { sheet: 'idle', time: 0, moving: false, since: 0, turn: [0, 0] });
  state = { ...FLYING };
  assert.equal(spriteFrame(state), 0);
  for (let i = 0; i < 16; i++) state = stepSprite(state, { speed: 500, drive: 1, turn: [0, 0] }, 0.01);
  assert.equal(spriteFrame(state), 1);
  // A steady turn brings her side into view within half a second, on the same beat.
  let turned = state;
  let steps = 0;
  while (turned.sheet !== 'right' && steps < 100) {
    turned = stepSprite(turned, { speed: 500, drive: 1, turn: [0.8, 0] }, 0.01);
    steps += 1;
  }
  assert.ok(steps > 5 && steps <= 50, `${steps}`);
  assert.ok(Math.abs(turned.time - state.time - steps * 0.01) < 1e-9);
  assert.equal(spriteFrame({ sheet: 'backward', time: 0.45 }), 0);
});

test('stopping plays the turn-round once over 0.8 s, then she hovers', () => {
  let state = { sheet: 'backward', time: 0.3, moving: true };
  state = stepSprite(state, { speed: 0 }, 0.016);
  assert.deepEqual(state, { sheet: 'brake', time: 0, moving: false, since: 0, turn: [0, 0] });
  const frames = [];
  for (let t = 0; t < 0.79; t += 0.01) {
    frames.push(spriteFrame(state));
    state = stepSprite(state, { speed: 0 }, 0.01);
    assert.equal(state.sheet, 'brake');
  }
  assert.deepEqual([...new Set(frames)], [0, 1, 2, 3]);
  for (let i = 0; i < 3; i++) state = stepSprite(state, { speed: 0 }, 0.01);
  assert.equal(state.sheet, 'idle');
  assert.equal(spriteFrame(state), 0);
  state = stepSprite(state, { speed: 0 }, 0.4);
  assert.equal(spriteFrame(state), 0);
  // Setting off again she turns away from the camera first: the same four drawings
  // backwards over 0.8 s, then her back in flight.
  state = stepSprite(state, { speed: 300, drive: 1, turn: [0, 0] }, 0.016);
  assert.equal(state.sheet, 'brake');
  assert.equal(state.reverse, true);
  const away = [];
  for (let t = 0; t < 0.79; t += 0.01) {
    away.push(spriteFrame(state));
    state = stepSprite(state, { speed: 300, drive: 1, turn: [0, 0] }, 0.01);
  }
  assert.deepEqual([...new Set(away)], [3, 2, 1, 0]);
  for (let i = 0; i < 3; i++) state = stepSprite(state, { speed: 300, drive: 1, turn: [0, 0] }, 0.01);
  assert.equal(state.sheet, 'backward');
  assert.ok(!state.reverse);
  // Stopping half-way through the turn away turns her back from where she had got to.
  let half = stepSprite({ sheet: 'idle', time: 1, moving: false }, { speed: 300, drive: 1 }, 0.016);
  for (let i = 0; i < 25; i++) half = stepSprite(half, { speed: 300, drive: 1 }, 0.01);
  assert.equal(spriteFrame(half), 2);
  half = stepSprite(half, { speed: 0 }, 0.01);
  assert.equal(half.sheet, 'brake');
  assert.ok(!half.reverse);
  assert.equal(spriteFrame(half), 2);
});

test('hovering is mostly stillness: in ten seconds two blinks, one glance aside and one wave', () => {
  assert.equal(IDLE_ROUND_S, 10);
  const at = (time) => spriteFrame({ sheet: 'idle', time });
  let still = 0;
  const seen = new Set();
  for (let t = 0; t < 10; t += 0.01) {
    const frame = at(t);
    seen.add(frame);
    if (frame === 0) still += 0.01;
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
  assert.ok(still > 7.5, `${still}`);
  assert.equal(at(1), 0);
  assert.equal(at(2.55), 1);
  assert.equal(at(4.4), 2);
  assert.equal(at(6.1), 1);
  // The wave: up, rest, up, rest.
  assert.deepEqual([8.1, 8.4, 8.7, 9.0].map(at), [3, 0, 3, 0]);
  assert.equal(at(9.5), 0);
  // The round repeats.
  assert.equal(at(12.55), 1);
});

test('latched to a craft she hovers at rest, whatever speed the craft is carrying her at', () => {
  let state = { sheet: 'backward', time: 0.2, moving: true };
  state = stepSprite(state, { speed: 72, drive: 1, turn: [0, 0], held: true }, 0.016);
  assert.equal(state.sheet, 'brake');
  for (let i = 0; i < 80; i++) {
    // The craft's speed wavers above and below the "moving" line: she does not react.
    state = stepSprite(state, { speed: i % 2 ? 0.2 : 140, drive: 1, turn: [0, 0], held: true }, 0.016);
    assert.ok(state.sheet === 'brake' || state.sheet === 'idle', state.sheet);
  }
  assert.equal(state.sheet, 'idle');
  // While still gliding in (not yet latched) she flies.
  assert.equal(stepSprite({ ...FLYING }, { speed: 72, drive: 1, turn: [0, 0], held: false }, 0.016).sheet, 'backward');
});

test('a mouse drag arrives in bursts, and the drawing does not flicker with it', () => {
  assert.equal(SHEET_HOLD_S, 0.3);
  // W held, dragging left: every other frame carries a big turn, the rest none.
  let state = { ...FLYING };
  const seen = [];
  for (let i = 0; i < 180; i++) {
    const before = state.sheet;
    state = stepSprite(state, { speed: 800, drive: 1, turn: [i % 2 ? -1.6 : 0, 0] }, 1 / 60);
    if (state.sheet !== before) seen.push(state.sheet);
  }
  // Three seconds of dragging: she turns to her left side once and stays there.
  assert.deepEqual(seen, ['left']);
  // Letting go of the mouse, she comes back to the rear view once, and not at once.
  const back = [];
  for (let i = 0; i < 120; i++) {
    const before = state.sheet;
    state = stepSprite(state, { speed: 800, drive: 1, turn: [0, 0] }, 1 / 60);
    if (state.sheet !== before) back.push([state.sheet, i]);
  }
  assert.equal(back.length, 1);
  assert.equal(back[0][0], 'backward');
  assert.ok(back[0][1] > 6, `${back[0][1]}`);
  // Even a turn that swings hard from side to side changes the drawing at most about
  // three times a second.
  let changes = 0;
  for (let i = 0; i < 180; i++) {
    const before = state.sheet;
    state = stepSprite(state, { speed: 800, drive: 1, turn: [Math.sin(i / 4) * 3, 0] }, 1 / 60);
    if (state.sheet !== before) changes += 1;
  }
  assert.ok(changes <= 10, `${changes}`);
});

test('a turn sheet stays while the turn only eases, and leaves when it is nearly over', () => {
  assert.equal(flightSheet({ drive: 1, turn: [0.15, 0] }, 'right'), 'right');
  assert.equal(flightSheet({ drive: 1, turn: [0.15, 0] }, 'backward'), 'backward');
  assert.equal(flightSheet({ drive: 1, turn: [0.05, 0] }, 'right'), 'backward');
  assert.equal(flightSheet({ drive: 1, turn: [-0.15, 0] }, 'right'), 'backward');
  assert.equal(flightSheet({ drive: 1, turn: [0, -0.15] }, 'up'), 'up');
});
