import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lockRefusal, lockWaiting, lockLetGo, lockKeyState } from '../src/core/orbitLock.js';

test('a press sets the lock unless a jump is going out, she stays at a story place, or stands on the target', () => {
  assert.equal(lockRefusal({}), null);
  assert.equal(lockRefusal({ warping: true }), 'warp');
  assert.equal(lockRefusal({ visiting: true }), 'visit');
  assert.equal(lockRefusal({ restingOnTarget: true }), 'resting');
  // The jump is told first: it is the one that ends by itself.
  assert.equal(lockRefusal({ warping: true, visiting: true, restingOnTarget: true }), 'warp');
});

test('the lock waits while docked, at a story place, at a held view, looking behind, or in the close view', () => {
  assert.equal(lockWaiting({}), null);
  for (const why of ['docked', 'home', 'rear', 'photo']) assert.equal(lockWaiting({ [why]: true }), why);
  assert.equal(lockWaiting({ visiting: true }), 'visit');
});

test('it lets go of itself only for another choice, or for flying forward with the target off the screen', () => {
  const on = { lockFor: 'halley', selectedId: 'halley' };
  assert.equal(lockLetGo(on), null);
  assert.equal(lockLetGo({ ...on, selectedId: 'earth' }), 'other');
  // Forward with the target in view goes straight at it: the lock stays.
  assert.equal(lockLetGo({ ...on, driving: true }), null);
  assert.equal(lockLetGo({ ...on, driving: true, targetOffScreen: true }), 'away');
  // Waiting (docked, a story place, a held view, the close view) it does not go away...
  for (const waiting of ['docked', 'visit', 'home', 'photo']) assert.equal(lockLetGo({ ...on, driving: true, targetOffScreen: true, waiting }), null);
  // ...but looking behind is no reason to keep it.
  assert.equal(lockLetGo({ ...on, driving: true, targetOffScreen: true, waiting: 'rear' }), 'away');
  // Just set, before a frame has passed, it has its target: it does not take that for another choice.
  assert.equal(lockLetGo({ lockFor: null, selectedId: 'halley' }), null);
});

test('the key shows off, on, or waiting', () => {
  assert.equal(lockKeyState(false, null), 'off');
  assert.equal(lockKeyState(false, 'docked'), 'off');
  assert.equal(lockKeyState(true, null), 'on');
  assert.equal(lockKeyState(true, 'rear'), 'wait');
});

// main.js keeps one way to let go (unlock, which says why) and sets lockFor wherever it
// sets the lock: a bare "locked = false" let it go without a word, and a lock set
// without lockFor was let go on the next frame as "another choice" (the big map).
test('main.js lets go of the lock only through unlock() and gives every new lock its target at once', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const bare = [...main.matchAll(/^\s+locked = false;/gm)].length;
  assert.equal(bare, 1, 'only unlock() itself writes locked = false');
  const sets = main.split('locked = true;').slice(1);
  assert.ok(sets.length >= 2);
  for (const after of sets) assert.match(after.slice(0, 400), /lockFor = /, 'each lock is set with its target');
});
