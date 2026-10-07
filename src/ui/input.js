import { controlIntent, rangeKeepsKey, tracksKey } from '../core/controls.js';

const $ = (id) => document.getElementById(id);
const DRAG_RATE = 0.0035;
// A press on the view that ends within this time and this many pixels is a tap, not a drag.
const TAP_MS = 300;
const TAP_PIXELS = 8;

// The keys that fly or turn her: pressing one while paused takes the game off pause (onMove).
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function createInput({ canvas, onDrag, onBrake, onTogglePhoto, onGaze, onJournal, onMute, onMusic = () => {}, onRear = () => {}, onMove = () => {}, onTap = () => {}, onPress = () => {}, onEscape, onWheel, isBlocked }) {
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
    for (const id of Object.keys(slide)) slide[id] = false;
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

  // The slide pad: four buttons like arrow keys, held to slide across the view.
  const slide = { slideUp: false, slideDown: false, slideLeft: false, slideRight: false };
  for (const id of Object.keys(slide)) {
    const button = $(id);
    button.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (!Object.values(slide).some(Boolean)) onMove();
      slide[id] = true;
      button.setPointerCapture(e.pointerId);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(ev, () => { slide[id] = false; });
  }
  const sliding = () => Object.values(slide).some(Boolean);

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
    // Tab: just looking ("우주멍"), as its button in the corner (the user, 2026-10-08:
    // "키보드로 할 때에는 탭 = 우주멍 버튼"). It no longer walks the focus over the buttons
    // of the game (inside an open card it still does: isBlocked above).
    else if (e.code === 'Tab' && tracksKey(e)) {
      e.preventDefault();
      if (!e.repeat) onGaze?.();
    }
    else if (e.code === 'KeyJ' && !e.repeat && tracksKey(e)) onJournal();
    else if (e.code === 'KeyM' && !e.repeat && tracksKey(e)) onMute();
    else if (e.code === 'KeyB' && !e.repeat && tracksKey(e)) onMusic();
    else if (e.code === 'KeyR' && !e.repeat && tracksKey(e)) onRear(true);
    else if (e.code === 'Escape' && !e.repeat) onEscape();
    if (tracksKey(e)) held.add(e.code);
  });
  document.addEventListener('keyup', (e) => {
    held.delete(e.code);
    // The view behind lasts only while its key is held.
    if (e.code === 'KeyR') onRear(false);
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
    onPress();
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, at: performance.now(), far: e.button !== 0 };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag?.id === e.pointerId && !drag.far && performance.now() - drag.at <= TAP_MS) onTap(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag?.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > TAP_PIXELS) drag.far = true;
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
        strafe: Math.max(-1, Math.min(1, c.strafe + (slide.slideRight ? 1 : 0) - (slide.slideLeft ? 1 : 0))),
        rise: Math.max(-1, Math.min(1, c.rise + (slide.slideUp ? 1 : 0) - (slide.slideDown ? 1 : 0))),
        throttle,
      };
    },
    driving() {
      return held.has('KeyW') || held.has('KeyS') || held.has('KeyA') || held.has('KeyD') || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some((k) => held.has(k)) || flyingButton || reversingButton || sliding();
    },
  };
}
