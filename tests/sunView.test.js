import { test } from 'vitest';
import assert from 'node:assert/strict';
import { sunFrame } from '../src/core/sunView.js';

const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const close = (a, b) => a.forEach((n, i) => assert.ok(Math.abs(n - b[i]) < 1e-9, `${a} != ${b}`));

test("the Sun's card has three axes at right angles, the third from the eye into the Sun", () => {
  for (const [toSun, viewRight] of [[[0, 0, 1], [1, 0, 0]], [[0.3, -0.2, 0.9], [0.9, 0.1, -0.3]], [[-1, 0, 0], [0, 0, -1]]]) {
    const { right, up, away } = sunFrame(toSun, viewRight);
    for (const v of [right, up, away]) assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
    assert.ok(Math.abs(dot(right, up)) < 1e-9 && Math.abs(dot(right, away)) < 1e-9 && Math.abs(dot(up, away)) < 1e-9);
    assert.ok(dot(away, toSun) > 0);
  }
  // Looking straight at the Sun along +z with the view upright: the screen's own axes.
  const straight = sunFrame([0, 0, 1], [1, 0, 0]);
  close(straight.right, [1, 0, 0]);
  close(straight.up, [0, 1, 0]);
});

test('from another side of the Sun the card looks at another part of it; turning the head does not change it', () => {
  // From the far side, the same screen direction "right" is the opposite way in space.
  close(sunFrame([0, 0, -1], [-1, 0, 0]).right, [-1, 0, 0]);
  close(sunFrame([0, 0, -1], [-1, 0, 0]).up, [0, 1, 0]);
  // The Sun a little off the middle of the screen (the view turned, not moved): the
  // frame stays square to the line to the Sun and all but where it was.
  const turned = sunFrame([0, 0, 1], [Math.cos(0.3), 0, -Math.sin(0.3)]);
  close(turned.right, [1, 0, 0]);
  close(turned.away, [0, 0, 1]);
  // The Sun dead abeam still gives a frame.
  const abeam = sunFrame([1, 0, 0], [1, 0, 0]);
  assert.ok(Math.abs(dot(abeam.right, abeam.away)) < 1e-9 && Math.abs(Math.hypot(...abeam.up) - 1) < 1e-9);
});
