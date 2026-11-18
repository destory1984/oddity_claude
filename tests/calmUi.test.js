import { test, beforeEach, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { createCalm } from '../src/ui/calm.js';

let elements;
let documentEvents;
let storage;
let sound;

function element() {
  const events = {};
  const properties = {};
  const classes = new Set();
  return {
    textContent: '', hidden: false,
    style: { setProperty: (name, value) => { properties[name] = value; } },
    classList: { toggle: (name, on) => { if (on) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
    addEventListener: (name, handler) => { events[name] = handler; },
    setAttribute: (name, value) => { properties[name] = value; },
    click: () => events.click(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  elements = Object.fromEntries(['gazeClock', 'sleepVeil', 'gazeClockButton', 'sleepButton', 'time', '.gazeDate', '.gazeSleep'].map((id) => [id, element()]));
  elements.gazeClock.querySelector = (selector) => elements[selector];
  documentEvents = {};
  storage = new Map();
  vi.stubGlobal('document', {
    hidden: false,
    getElementById: (id) => elements[id],
    addEventListener: (name, handler) => { documentEvents[name] = handler; },
  });
  vi.stubGlobal('window', { addEventListener() {} });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('localStorage', { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) });
  sound = { sleepVolume: vi.fn() };
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('clock defaults on, remembers its switch, waits for the pieces, and hides immediately', () => {
  const rest = createCalm({ sound });
  rest.setGazing(true);
  rest.reveal();
  vi.advanceTimersByTime(1000);
  assert.equal(elements.gazeClock.classList.contains('visible'), true);
  elements.gazeClockButton.click();
  assert.equal(storage.get('oddity.gazeClock'), '0');
  assert.equal(elements.gazeClock.classList.contains('visible'), false);
  elements.gazeClockButton.click();
  assert.equal(storage.get('oddity.gazeClock'), '1');
  assert.equal(elements.gazeClock.classList.contains('visible'), true);
  rest.setGazing(false);
  assert.equal(elements.gazeClock.classList.contains('visible'), false);
  rest.setGazing(true);
  rest.reveal();
  vi.advanceTimersByTime(599);
  assert.equal(elements.gazeClock.classList.contains('visible'), false);
  vi.advanceTimersByTime(1);
  assert.equal(elements.gazeClock.classList.contains('visible'), true);
});

test('sleep ramps down, releases the screen after sixty seconds, and wakes on input', async () => {
  const release = vi.fn(async () => {});
  const request = vi.fn(async () => ({ release, addEventListener() {} }));
  navigator.wakeLock = { request };
  storage.set('oddity.gazeClock', '1');
  const rest = createCalm({ sound });
  rest.setGazing(true);
  rest.reveal();
  await Promise.resolve();
  elements.sleepButton.click();
  await vi.advanceTimersByTimeAsync(900000);
  assert.equal(sound.sleepVolume.mock.lastCall[0], 0);
  assert.equal(sound.sleepVolume.mock.lastCall[1], 60);
  assert.equal(release.mock.calls.length, 0);
  await vi.advanceTimersByTimeAsync(30000);
  assert.equal(Number(elements.sleepVeil.style.opacity), 0.46);
  await vi.advanceTimersByTimeAsync(30000);
  assert.equal(Number(elements.sleepVeil.style.opacity), 0.92);
  assert.equal(release.mock.calls.length, 1);
  documentEvents.keydown({ preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(elements.sleepVeil.style.opacity, '0');
  assert.deepEqual(sound.sleepVolume.mock.lastCall, [1, 0.4]);
  await Promise.resolve();
  assert.equal(request.mock.calls.length, 2);
});

test('a pending wake lock is released if gaze ends before the request resolves', async () => {
  let resolve;
  const release = vi.fn(async () => {});
  navigator.wakeLock = { request: () => new Promise((done) => { resolve = done; }) };
  storage.set('oddity.gazeClock', '1');
  const rest = createCalm({ sound });
  rest.setGazing(true);
  rest.setGazing(false);
  resolve({ release, addEventListener() {} });
  await Promise.resolve();
  assert.equal(release.mock.calls.length, 1);
});

test('the pointer gesture that wakes the screen cannot also activate a button', () => {
  createCalm({ sound });
  elements.sleepButton.click();
  vi.advanceTimersByTime(900000);
  const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
  documentEvents.pointerdown(event);
  documentEvents.click(event);
  assert.equal(event.stopImmediatePropagation.mock.calls.length, 2);
});

test('visibility returning acquires a new wake lock, and denied locks do not reject', async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue({ release: async () => {}, addEventListener() {} });
  navigator.wakeLock = { request };
  storage.set('oddity.gazeClock', '1');
  const rest = createCalm({ sound });
  rest.setGazing(true);
  await Promise.resolve();
  document.hidden = true;
  documentEvents.visibilitychange();
  document.hidden = false;
  documentEvents.visibilitychange();
  await Promise.resolve();
  assert.equal(request.mock.calls.length, 2);
});
