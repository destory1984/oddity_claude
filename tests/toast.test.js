import { test, vi, beforeEach, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import { createToast } from '../src/ui/toast.js';

function stubElement() {
  const classes = new Set();
  let text = "";
  return {
    shown: [],
    get textContent() { return text; },
    set textContent(v) { text = v; this.shown.push(v); },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('messages arriving together are shown one after another, none lost', () => {
  const el = stubElement();
  const toast = createToast(el);
  toast.show('A');
  toast.show('B');
  toast.show('C');
  assert.equal(el.textContent, 'A');
  vi.advanceTimersByTime(2600);
  assert.equal(el.textContent, 'B');
  vi.advanceTimersByTime(2600);
  assert.equal(el.textContent, 'C');
  vi.advanceTimersByTime(3600);
  assert.equal(el.classList.contains('on'), false);
});

test('the same text again while showing only extends it', () => {
  const el = stubElement();
  const toast = createToast(el);
  toast.show('A');
  vi.advanceTimersByTime(3000);
  toast.show('A');
  vi.advanceTimersByTime(3000);
  assert.equal(el.classList.contains('on'), true);
  assert.equal(el.textContent, 'A');
});

test('a queued duplicate is not shown twice', () => {
  const el = stubElement();
  const toast = createToast(el);
  toast.show('A');
  toast.show('B');
  toast.show('B');
  vi.advanceTimersByTime(2600);
  assert.equal(el.textContent, 'B');
  vi.advanceTimersByTime(10000);
  assert.deepEqual(el.shown, ['A', 'B']);
});

test('a newer message of the same kind replaces a queued older one', () => {
  const el = stubElement();
  const toast = createToast(el);
  toast.show('discovered Jupiter');
  toast.show('zone: 1000c', 'zone');
  toast.show('zone: 0.1c', 'zone');
  toast.show('zone: 0.01c', 'zone');
  vi.advanceTimersByTime(20000);
  assert.deepEqual(el.shown, ['discovered Jupiter', 'zone: 0.01c']);
});

test('a newer message of the same kind replaces the one on screen at once', () => {
  const el = stubElement();
  const toast = createToast(el);
  toast.show('zone: 1000c', 'zone');
  toast.show('zone: 0.1c', 'zone');
  assert.equal(el.textContent, 'zone: 0.1c');
  vi.advanceTimersByTime(20000);
  assert.deepEqual(el.shown, ['zone: 1000c', 'zone: 0.1c']);
});

test('a steady stream of queued updates does not keep the current message up forever', () => {
  const el = stubElement();
  const toast = createToast(el);
  toast.show('A');
  for (let t = 0; t < 20; t += 2) {
    toast.show(`zone ${t}`, 'zone');
    vi.advanceTimersByTime(2000);
  }
  assert.notEqual(el.shown.length, 1, 'A was never replaced');
  assert.equal(el.shown[1].startsWith('zone'), true);
});
