// The orbit lock ("맴돌기", main.js): she holds what is chosen in her view and the arrow
// keys take her round it. Its rules were spread over main.js, ten patches in two weeks,
// and they met in ways no one patch showed: it went off without a word, or a press
// seemed to do nothing while the reason waited behind another notice (the user,
// 2026-10-21: "이 기능이 제일 버그가 많은데.. 근본적인 문제가 따로 있는거 아님?").
// Every rule is here now; main.js asks these and goes through one way to set it and
// one to let it go, which always says why at once.

// Why a press cannot set the lock (main.js shows the reason at once).
// warping: a jump's flash is still going out; visiting: she stays at a story place;
// restingOnTarget: she stands on what she would go round.
export function lockRefusal({ warping = false, visiting = false, restingOnTarget = false } = {}) {
  if (warping) return 'warp';
  if (visiting) return 'visit';
  if (restingOnTarget) return 'resting';
  return null;
}

// While set, why it does nothing for now: docked with a craft, at a story place, held
// at a view (home, a best view, an aurora), looking behind, in the close view. It stays
// set and goes on when that ends.
// restingOnTarget: standing on what it goes round (flown straight at it, she lands).
export function lockWaiting({ docked = false, visiting = false, home = false, rear = false, photo = false, restingOnTarget = false } = {}) {
  if (docked) return 'docked';
  if (restingOnTarget) return 'resting';
  if (visiting) return 'visit';
  if (home) return 'home';
  if (rear) return 'rear';
  if (photo) return 'photo';
  return null;
}

// Each frame while set: why it lets go of itself, or null.
// other: something else was chosen (lockFor is what it was set on).
// away: flying forward with the target off the screen, she means to go elsewhere (the
// user, 2026-10-18, having forgotten the lock: "화면이 미친듯이 움직이는데"); not while it
// waits for something other than looking behind, as before.
export function lockLetGo({ lockFor = null, selectedId = null, driving = false, targetOffScreen = false, waiting = null } = {}) {
  if (lockFor && lockFor !== selectedId) return 'other';
  if ((waiting === null || waiting === 'rear') && driving && targetOffScreen) return 'away';
  return null;
}

// What the key shows: 'off', 'on', or 'wait' (set, but waiting).
export function lockKeyState(locked, waiting) {
  if (!locked) return 'off';
  return waiting ? 'wait' : 'on';
}
