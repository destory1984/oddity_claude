import { test } from 'vitest';
import assert from 'node:assert/strict';
import { LOADING_MIN_MS, loadingWait } from '../src/core/loading.js';

test('the loading screen stays up three seconds at least, and no longer than the loading itself when that is slower', () => {
  assert.equal(LOADING_MIN_MS, 3000);
  assert.equal(loadingWait(0), 3000);
  assert.equal(loadingWait(1200), 1800);
  assert.equal(loadingWait(3000), 0);
  assert.equal(loadingWait(9000), 0);
  assert.equal(loadingWait(-5), 3000);
});
