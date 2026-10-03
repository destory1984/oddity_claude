import { controlIntent, rangeKeepsKey, tracksKey } from '../core/controls.js';

const $ = (id) => document.getElementById(id);
const DRAG_RATE = 0.0035;

// The keys that fly or turn her: pressing one while paused takes the game off pause (onMove).
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function createInput({ canvas, onDrag, onBrake, onTogglePhoto, onJournal, onMute, onMusic = () => {}, onMove = () => {}, onEscape, onWheel, isBlocked }) {
  const held = new Set();
  let flyingButton = false;
  let reversingButton = false;
  let drag = null;
  let throttle = 1;

  function clear() {
    held.clear();
    flyingButton = false;
    reversingButton = false;
    drag = null;
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
    // Before the key is noted as held: taking the game off pause clears the held keys.
    if (MOVE_KEYS.includes(e.code) && !e.repeat && tracksKey(e)) onMove();
    if (e.code === 'Space' && !e.repeat) onBrake();
    else if (e.code === 'KeyP' && !e.repeat) onTogglePhoto();
    else if (e.code === 'KeyJ' && !e.repeat && tracksKey(e)) onJournal();
    else if (e.code === 'KeyM' && !e.repeat && tracksKey(e)) onMute();
    else if (e.code === 'KeyB' && !e.repeat && tracksKey(e)) onMusic();
    else if (e.code === 'Escape' && !e.repeat) onEscape();
    if (tracksKey(e)) held.add(e.code);
  });
  document.addEventListener('keyup', (e) => {
    held.delete(e.code);
    // Releasing a modifier may swallow the keyups of letters pressed with it.
    if (['MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight'].includes(e.code)) held.clear();
  });

  // A clicked button keeps the keyboard focus, and Space or Enter would then press it
  // again: Space is the stop key, so stopping would re-dock, re-pause or re-aim. Hand the
  // focus back to the view after any click on the flight screen's own buttons.
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('#hud button')) canvas.focus({ preventScroll: true });
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

  return {
    clear,
    throttle: () => throttle,
    intent() {
      const c = controlIntent(held, flyingButton, reversingButton);
      return {
        turnX: c.turnX,
        turnY: c.turnY,
        roll: (held.has('KeyE') ? 1 : 0) - (held.has('KeyQ') ? 1 : 0),
        drive: c.drive,
        strafe: c.strafe,
        throttle,
      };
    },
    driving() {
      return held.has('KeyW') || held.has('KeyS') || held.has('KeyA') || held.has('KeyD') || flyingButton || reversingButton;
    },
  };
}
