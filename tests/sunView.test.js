import { test } from 'vitest';
import assert from 'node:assert/strict';
import { sunFrame, ballPoint } from '../src/core/sunView.js';

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

test('a spot is drawn where it is: the line of sight through its place on the card meets the ball at the spot', () => {
  const away = [0, 0, 1];
  const card = { away, cardRight: [1, 0, 0], cardUp: [0, 1, 0] };
  // A spot 40 degrees round from the point under the eye, toward the right.
  const spot = [Math.sin(0.7), 0, -Math.cos(0.7)];
  for (const eyeDist of [1.5, 2.4, 10, 1000]) {
    // Where the line from the eye (at -away * eyeDist) to the spot crosses the card,
    // which stands at the Sun's centre.
    const x = spot[0] * eyeDist / (eyeDist + spot[2]);
    close(ballPoint({ ...card, eyeDist }, x, 0), spot);
    // Seen from infinitely far it would be at sin(0.7) of a radius; from close by it is
    // farther out than that, and the nearer the eye the farther.
    assert.ok(x > Math.sin(0.7));
  }
  assert.ok(Math.abs(1000 * Math.sin(0.7) / (1000 - Math.cos(0.7)) - Math.sin(0.7)) < 1e-3);
  // The middle of the card is the point under the eye; far enough off it, the sight misses.
  close(ballPoint({ ...card, eyeDist: 2.4 }, 0, 0), [0, 0, -1]);
  assert.equal(ballPoint({ ...card, eyeDist: 2.4 }, 1.2, 0), null);
  // From 2.4 radii the ball's edge is at 2.4 / sqrt(2.4^2 - 1) = 1.1 radii on the card, not 1.
  assert.ok(ballPoint({ ...card, eyeDist: 2.4 }, 1.09, 0));
  // A card that does not face the Sun squarely (the Sun off to one side of the view)
  // still shows the spot where it is.
  const tilted = { away, eyeDist: 2.4, cardRight: [Math.cos(0.5), 0, -Math.sin(0.5)], cardUp: [0, 1, 0] };
  // The line from the eye to the spot: eye + t * (spot - eye) = s * cardRight.
  const eye = [0, 0, -2.4];
  const ray = spot.map((n, i) => n - eye[i]);
  const s2 = (eye[2] * ray[0] - eye[0] * ray[2]) / (tilted.cardRight[2] * ray[0] - tilted.cardRight[0] * ray[2]);
  close(ballPoint(tilted, s2, 0), spot);
});

test('a line of sight that points away from the Sun does not see it, though the line passes through the ball behind the eye', () => {
  const card = { away: [0, 0, 1], cardRight: [1, 0, 0], cardUp: [0, 1, 0] };
  // 43,147 km over the Sun: 1.062 radii from its middle.
  assert.ok(ballPoint({ ...card, eyeDist: 1.062 }, 0.2, 0));
  assert.equal(ballPoint({ ...card, away: [0, 0, -1], eyeDist: -1.062 }, 0.2, 0), null);
});
