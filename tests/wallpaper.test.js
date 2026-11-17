import { test, beforeEach, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { createPhoto } from '../src/ui/photo.js';

let controls;
let downloads;
let world;
let onCaptured;
let toast;
let photo;

beforeEach(() => {
  vi.useFakeTimers();
  controls = {};
  downloads = [];
  const drawing = () => ({
    width: 1206, height: 1971,
    getContext: () => ({ drawImage() {} }),
    toDataURL: () => 'data:image/jpeg;base64,AA==',
    toBlob: (callback) => callback(new Blob(['picture'], { type: 'image/png' })),
  });
  const control = (id) => controls[id] ??= {
    checked: true, hidden: false, disabled: false, events: {},
    addEventListener(type, listener) { this.events[type] = listener; },
  };
  vi.stubGlobal('document', {
    getElementById: control,
    body: { classList: { contains: () => false } },
    createElement: (tag) => tag === 'canvas' ? drawing() : {
      click() { downloads.push(this.download); },
    },
  });
  vi.stubGlobal('navigator', {});
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  world = { render: vi.fn(), picture: drawing, wallpaper: vi.fn(drawing), fov: () => Math.PI / 3, setFov() {} };
  onCaptured = vi.fn();
  toast = { show: vi.fn() };
  photo = createPhoto({ world, canvas: { width: 402, height: 657 }, toast, setPaused() {}, isPaused: () => false, clearInput() {}, onCaptured });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('wallpaper downloads once without recording a mission or album photo', async () => {
  await controls.wallpaper.events.click();
  assert.equal(world.wallpaper.mock.calls.length, 1);
  assert.equal(downloads.length, 1);
  assert.match(downloads[0], /^oddity-wallpaper-.+\.png$/);
  assert.equal(onCaptured.mock.calls.length, 0);
  assert.equal(controls.wallpaper.disabled, false);
  assert.equal(toast.show.mock.calls.length, 1);
});

test('ordinary capture still records its view and album thumbnail', async () => {
  await controls.capture.events.click();
  assert.equal(downloads.length, 1);
  assert.match(downloads[0], /^oddity-(?!wallpaper).+\.png$/);
  assert.equal(world.wallpaper.mock.calls.length, 0);
  assert.equal(onCaptured.mock.calls.length, 1);
  assert.equal(onCaptured.mock.lastCall[0].aspect, 402 / 657);
  assert.match(onCaptured.mock.lastCall[0].thumb, /^data:image\/jpeg/);
});

test('clock guide follows photo mode and its checkbox, without entering pictures', () => {
  photo.toggle();
  controls.clockSpace.checked = true;
  controls.clockSpace.events.change();
  assert.equal(controls.wallpaperGuide.hidden, false);
  photo.toggle();
  assert.equal(controls.wallpaperGuide.hidden, true);
});
