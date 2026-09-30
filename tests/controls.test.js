import { test } from 'vitest';
import assert from 'node:assert/strict';
import { controlIntent, rangeKeepsKey, tracksKey } from '../src/core/controls.js';

test('arrow keys steer in four directions without applying thrust', () => {
  assert.deepEqual(controlIntent(new Set(['ArrowLeft']), false, false), { turnX: -1, turnY: 0, drive: 0, strafe: 0 });
  assert.deepEqual(controlIntent(new Set(['ArrowRight']), false, false), { turnX: 1, turnY: 0, drive: 0, strafe: 0 });
  assert.deepEqual(controlIntent(new Set(['ArrowUp']), false, false), { turnX: 0, turnY: -1, drive: 0, strafe: 0 });
  assert.deepEqual(controlIntent(new Set(['ArrowDown']), false, false), { turnX: 0, turnY: 1, drive: 0, strafe: 0 });
});

test('W and flight controls apply thrust independently from arrow steering', () => {
  assert.equal(controlIntent(new Set(['KeyW']), false, false, false).drive, 1);
  assert.equal(controlIntent(new Set(), true, false, false).drive, 1);
  assert.equal(controlIntent(new Set(), false, true, false).drive, 1);
  assert.equal(controlIntent(new Set(['KeyS', 'KeyW']), false, false, false).drive, 0);
});

test('S and reverse button drive backward at the same command strength', () => {
  assert.equal(controlIntent(new Set(['KeyS']), false, false, false).drive, -1);
  assert.equal(controlIntent(new Set(), false, false, true).drive, -1);
});

test('focused speed slider cannot consume direction arrows', () => {
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    assert.equal(rangeKeepsKey(key), false);
  }
  assert.equal(rangeKeepsKey('Home'), true);
  assert.equal(rangeKeepsKey('End'), true);
});

test('keys pressed with Ctrl, Alt or Meta are not held for flight', () => {
  assert.equal(tracksKey({ code: 'KeyW' }), true);
  assert.equal(tracksKey({ code: 'KeyS', metaKey: true }), false);
  assert.equal(tracksKey({ code: 'KeyS', ctrlKey: true }), false);
  assert.equal(tracksKey({ code: 'KeyW', altKey: true }), false);
});

test('A and D slide left and right without turning', () => {
  assert.deepEqual(controlIntent(new Set(['KeyA']), false, false), { turnX: 0, turnY: 0, drive: 0, strafe: -1 });
  assert.deepEqual(controlIntent(new Set(['KeyD']), false, false), { turnX: 0, turnY: 0, drive: 0, strafe: 1 });
  assert.equal(controlIntent(new Set(['KeyA', 'KeyD']), false, false).strafe, 0);
});
