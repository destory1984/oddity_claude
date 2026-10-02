import { test } from 'vitest';
import assert from 'node:assert/strict';
import { inspectLight } from '../src/core/lamp.js';

const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);

test('a place in daylight is left as it is', () => {
  assert.equal(inspectLight([0, 1, 0], [0, 1, 0]), null);
  assert.equal(inspectLight([0, 1, 0], [0.9, 0.44, 0]), null);
});

test('a place in the night is lit from 37 degrees up, on the side the Sun is on', () => {
  for (const [up, sun] of [[[0, 1, 0], [1, -0.5, 0]], [[0, 2, 0], [0, -1, 0]], [[1, 0, 0], [-1, 0, 0]], [[0.6, 0.8, 0], [0.2, 0.1, -0.97]], [[0, 1, 0], [1, 0.1, 0]]]) {
    const light = inspectLight(up, sun);
    const u = up.map((n) => n / Math.hypot(...up));
    assert.ok(Math.abs(Math.hypot(...light) - 1) < 1e-9);
    assert.ok(Math.abs(dot(light, u) - 0.6) < 1e-9, `${up}`);
    const along = sun.map((n, i) => n - u[i] * dot(u, sun));
    if (Math.hypot(...along) > 1e-6) assert.ok(dot(light, along) > 0, `${up}`);
  }
});
