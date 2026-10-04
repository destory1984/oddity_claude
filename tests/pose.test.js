import { test } from 'vitest';
import assert from 'node:assert/strict';
import { heroScaleFor } from '../src/core/pose.js';

test('the hero shrinks on tall phone screens so the view stays open', () => {
  assert.equal(heroScaleFor(16 / 9), 1.3);
  assert.equal(heroScaleFor(1.2), 1.3);
  assert.ok(Math.abs(heroScaleFor(390 / 844) - 0.78) < 1e-9);
  const mid = heroScaleFor(0.9);
  assert.ok(mid > 0.78 && mid < 1.3);
});
