import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  SHEETS, FRAMES, SPRITE_FPS, createSpriteState, flightSheet, stepSprite, spriteFrame, spriteFile,
} from '../src/core/sprite.js';

test('eight sheets of four frames, and every drawing is in the assets folder', () => {
  assert.deepEqual(SHEETS, ['forward', 'backward', 'left', 'right', 'up', 'down', 'brake', 'idle']);
  assert.equal(FRAMES, 4);
  assert.deepEqual(SPRITE_FPS, { flight: 10, brake: 8, idle: 3 });
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
  assert.deepEqual(state, { sheet: 'idle', time: 0, moving: false });
  state = stepSprite(state, { speed: 500, drive: 1, turn: [0, 0] }, 0.016);
  assert.equal(state.sheet, 'backward');
  assert.equal(spriteFrame(state), 0);
  for (let i = 0; i < 16; i++) state = stepSprite(state, { speed: 500, drive: 1, turn: [0, 0] }, 0.01);
  assert.equal(spriteFrame(state), 1);
  const turned = stepSprite(state, { speed: 500, drive: 1, turn: [0.8, 0] }, 0.01);
  assert.equal(turned.sheet, 'right');
  assert.ok(Math.abs(turned.time - state.time - 0.01) < 1e-9);
  assert.equal(spriteFrame({ sheet: 'backward', time: 0.45 }), 0);
});

test('stopping plays the brake once over half a second, then she hovers at three frames a second', () => {
  let state = { sheet: 'backward', time: 0.3, moving: true };
  state = stepSprite(state, { speed: 0 }, 0.016);
  assert.deepEqual(state, { sheet: 'brake', time: 0, moving: false });
  const frames = [];
  for (let t = 0; t < 0.49; t += 0.01) {
    frames.push(spriteFrame(state));
    state = stepSprite(state, { speed: 0 }, 0.01);
    assert.equal(state.sheet, 'brake');
  }
  assert.deepEqual([...new Set(frames)], [0, 1, 2, 3]);
  for (let i = 0; i < 3; i++) state = stepSprite(state, { speed: 0 }, 0.01);
  assert.equal(state.sheet, 'idle');
  assert.equal(spriteFrame(state), 0);
  state = stepSprite(state, { speed: 0 }, 0.4);
  assert.equal(spriteFrame(state), 1);
  // Setting off again leaves the hover at once.
  state = stepSprite(state, { speed: 300, drive: 1, turn: [0, 0] }, 0.016);
  assert.deepEqual(state, { sheet: 'backward', time: 0, moving: true });
});
