// Docking with a spacecraft or telescope: come close, dock, and ride along with it.
import { stopNow } from './game.js';

// How close the traveler must be to dock, and how far off they sit once docked (the
// craft are drawn 30 km wide, so 60 km shows the whole craft at arm's length).
export const DOCK_RANGE_KM = 1000;
export const DOCK_GAP_KM = 60;

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));

// The nearest craft within docking range, or null.
export function dockable(position, craft) {
  let best = null;
  let bestKm = DOCK_RANGE_KM;
  for (const c of craft) {
    const km = gap(position, c.position);
    if (km <= bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return best;
}

// Where the docked traveler sits relative to the craft: on the side they came from.
export function dockOffset(position, craft) {
  const out = position.map((n, i) => n - craft.position[i]);
  const length = Math.hypot(...out);
  if (length < 1e-9) return [0, DOCK_GAP_KM, 0];
  return out.map((n) => (n / length) * DOCK_GAP_KM);
}

// The traveler held at the craft: carried with it and at rest, free to look around.
export function dockedState(state, craft, offset) {
  return { ...stopNow(state), restingOn: null, position: craft.position.map((n, i) => n + offset[i]) };
}

// How fast the docked pair is going, in game km per second of play: the craft's motion
// round the body it belongs to (Hubble round Earth), or away from the Sun (Voyager).
// before/after: the craft and bodies one frame apart; dt: that frame in real seconds.
export function rideSpeed(craftId, craftBefore, craftAfter, bodiesBefore, bodiesAfter, dt) {
  if (!(dt > 0)) return 0;
  const anchor = (bodies, parent) => (bodies.find((b) => b.id === parent) ?? bodies.find((b) => b.kind === 'star')).position;
  const from = craftBefore.find((c) => c.id === craftId);
  const to = craftAfter.find((c) => c.id === craftId);
  const a = anchor(bodiesBefore, from.parent);
  const b = anchor(bodiesAfter, to.parent);
  return Math.hypot(...to.position.map((n, i) => n - b[i] - (from.position[i] - a[i]))) / dt;
}

// Any thrust lets go of the craft.
export function wantsToLeave({ drive = 0, strafe = 0 }) {
  return drive !== 0 || strafe !== 0;
}
