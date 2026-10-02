import { test } from 'vitest';
import assert from 'node:assert/strict';
import { phoneFrame, PHONE_RATIO, PHONE_MIN_WIDTH, PHONE_MAX_WIDTH } from '../src/core/screen.js';

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
    // The phone layout applies: between a small phone's width and the breakpoint.
    assert.ok(frame.width >= PHONE_MIN_WIDTH && frame.width <= PHONE_MAX_WIDTH, `${width}x${height}: ${frame.width}`);
    assert.ok(Math.abs(frame.width / frame.height - PHONE_RATIO) < 0.002, `${width}x${height}`);
    // Scaled, it is exactly as tall as the window and never wider than it.
    near(frame.height * frame.scale, height, 1e-6);
    assert.ok(frame.width * frame.scale <= width, `${width}x${height}`);
  }
});

test('the frame is laid out at 375 wide on a low screen, 480 on a tall one, and scaled to fit', () => {
  // 720 high: a 375 x 813 layout shrunk a little.
  const low = phoneFrame({ width: 1280, height: 720 });
  assert.equal(low.width, 375);
  assert.ok(low.scale < 1 && low.scale > 0.85);
  // 1,000 high: its own size, not scaled.
  const mid = phoneFrame({ width: 1920, height: 1000 });
  assert.equal(mid.width, 462);
  near(mid.scale, 1000 / mid.height);
  assert.ok(Math.abs(mid.scale - 1) < 0.002);
  // 1,440 high: 480 wide, enlarged.
  const tall = phoneFrame({ width: 2560, height: 1440 });
  assert.equal(tall.width, 480);
  assert.ok(tall.scale > 1.35 && tall.scale < 1.4);
});
