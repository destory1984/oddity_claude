import { test } from 'vitest';
import assert from 'node:assert/strict';
import { TEXT_SIZES, TEXT_SIZE_DEFAULT, textSizeFrom, nextTextSize, canResize } from '../src/core/textSize.js';

test("the journal's writing has five sizes, from 85% to 150%, and starts at 100%", () => {
  assert.deepEqual(TEXT_SIZES, [0.85, 1, 1.15, 1.3, 1.5]);
  assert.equal(TEXT_SIZE_DEFAULT, 1);
  assert.ok(TEXT_SIZES.includes(TEXT_SIZE_DEFAULT));
});

test('a kept size is used only when it is one of the five', () => {
  assert.equal(textSizeFrom('1.3'), 1.3);
  assert.equal(textSizeFrom(0.85), 0.85);
  for (const bad of [null, undefined, '', 'big', '7', 0, -1, NaN]) assert.equal(textSizeFrom(bad), 1, String(bad));
});

test('the buttons step one size at a time and stop at the ends', () => {
  assert.equal(nextTextSize(1, 1), 1.15);
  assert.equal(nextTextSize(1, -1), 0.85);
  assert.equal(nextTextSize(1.5, 1), 1.5);
  assert.equal(nextTextSize(0.85, -1), 0.85);
  assert.equal(nextTextSize('junk', 1), 1.15);
  // Four presses of "larger" from the start reach the largest.
  let size = TEXT_SIZE_DEFAULT;
  for (let i = 0; i < 4; i++) size = nextTextSize(size, 1);
  assert.equal(size, 1.5);
  assert.equal(canResize(1.5, 1), false);
  assert.equal(canResize(1.5, -1), true);
  assert.equal(canResize(0.85, -1), false);
  assert.equal(canResize(1, 1), true);
});
