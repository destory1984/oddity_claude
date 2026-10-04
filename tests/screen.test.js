import { test } from 'vitest';
import assert from 'node:assert/strict';
import { phoneFrame, PHONE_RATIO, PHONE_WIDTH, PHONE_HEIGHT } from '../src/core/screen.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('a phone, or a window as narrow as one, gets no frame', () => {
  assert.equal(phoneFrame({ width: 375, height: 812 }), null);
  assert.equal(phoneFrame({ width: 412, height: 915 }), null);
  assert.equal(phoneFrame({ width: 480, height: 800 }), null);
  assert.equal(phoneFrame({ width: 0, height: 0 }), null);
  // A phone held sideways keeps the wide layout it always had.
  assert.equal(phoneFrame({ width: 812, height: 375 }), null);
});

test('a wide window gets a frame of a phone\'s shape, as tall as the window', () => {
  for (const [width, height] of [[1280, 720], [1366, 768], [1920, 1080], [2560, 1440], [3840, 2160], [1024, 1366]]) {
    const frame = phoneFrame({ width, height });
    assert.ok(frame, `${width}x${height}`);
    // The phone layout applies: the frame is laid out at the phone's own size.
    assert.equal(frame.width, PHONE_WIDTH);
    assert.equal(frame.height, PHONE_HEIGHT);
    // Scaled, it is exactly as tall as the window and never wider than it.
    near(frame.height * frame.scale, height, 1e-6);
    assert.ok(frame.width * frame.scale <= width, `${width}x${height}`);
  }
});

test('the frame has the shape of the page on the phone in its browser, and is scaled to fit', () => {
  // 402 x 657: the page on the user's iPhone with Safari's bars showing.
  near(PHONE_RATIO, 402 / 657);
  // 657 high: its own size. Lower: shrunk. Higher: enlarged.
  near(phoneFrame({ width: 1280, height: 657 }).scale, 1);
  near(phoneFrame({ width: 1280, height: 720 }).scale, 720 / 657);
  near(phoneFrame({ width: 2560, height: 1440 }).scale, 1440 / 657);
  assert.ok(phoneFrame({ width: 1024, height: 600 }).scale < 1);
});
