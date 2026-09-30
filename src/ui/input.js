import { controlIntent, rangeKeepsKey, tracksKey } from '../core/controls.js';

const $ = (id) => document.getElementById(id);
const DRAG_RATE = 0.0035;

export function createInput({ canvas, onDrag, onBrake, onTogglePhoto, onJournal, onEscape, onWheel, isBlocked }) {
  const held = new Set();
  let stick = [0, 0];
  let stickId = null;
  let flyingButton = false;
  let reversingButton = false;
  let drag = null;
  let throttle = 1;

  function clear() {
    held.clear();
    stick = [0, 0];
    stickId = null;
    flyingButton = false;
    reversingButton = false;
    drag = null;
    $('stickKnob').style.transform = '';
  }

  $('throttle').addEventListener('input', (e) => { throttle = Number(e.target.value) / 1000; });

  for (const [id, set] of [['flyButton', (v) => { flyingButton = v; }], ['reverseButton', (v) => { reversingButton = v; }]]) {
    const button = $(id);
    button.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // a right-click opens a menu and may never send pointerup
      set(true);
      button.setPointerCapture(e.pointerId);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(ev, () => set(false));
  }

  document.addEventListener('keydown', (e) => {
    if (isBlocked()) return;
    const onRange = e.target.matches?.('input[type="range"]');
    if (onRange && rangeKeepsKey(e.code)) return;
    if (onRange && e.code.startsWith('Arrow')) e.target.blur();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space' && !e.repeat) onBrake();
    else if (e.code === 'KeyP' && !e.repeat) onTogglePhoto();
    else if (e.code === 'KeyJ' && !e.repeat && tracksKey(e)) onJournal();
    else if (e.code === 'Escape' && !e.repeat) onEscape();
    if (tracksKey(e)) held.add(e.code);
  });
  document.addEventListener('keyup', (e) => {
    held.delete(e.code);
    // Releasing a modifier may swallow the keyups of letters pressed with it.
    if (['MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight'].includes(e.code)) held.clear();
  });

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag?.id !== e.pointerId) return;
    onDrag((e.clientX - drag.x) * DRAG_RATE, (e.clientY - drag.y) * DRAG_RATE);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); onWheel(e.deltaY); }, { passive: false });

  const stickEl = $('stick');
  function moveStick(e) {
    const r = stickEl.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / (r.width * 0.35);
    const y = (e.clientY - r.top - r.height / 2) / (r.height * 0.35);
    const length = Math.max(1, Math.hypot(x, y));
    stick = [x / length, y / length];
    $('stickKnob').style.transform = `translate(${stick[0] * r.width * 0.3}px,${stick[1] * r.height * 0.3}px)`;
  }
  stickEl.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    stickEl.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stickEl.addEventListener(ev, (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      stick = [0, 0];
      $('stickKnob').style.transform = '';
    });
  }

  return {
    clear,
    throttle: () => throttle,
    intent() {
      const c = controlIntent(held, stickId !== null, flyingButton, reversingButton);
      return {
        turnX: c.turnX + stick[0],
        turnY: c.turnY + stick[1],
        roll: (held.has('KeyE') ? 1 : 0) - (held.has('KeyQ') ? 1 : 0),
        drive: c.drive,
        throttle,
      };
    },
    driving() {
      return held.has('KeyW') || held.has('KeyS') || stickId !== null || flyingButton || reversingButton;
    },
  };
}
