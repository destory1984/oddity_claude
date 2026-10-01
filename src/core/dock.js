// Docking with a spacecraft or telescope: come close, dock, and ride along with it.
import { stopNow, CARRY_KM } from './game.js';
import { nearestSurface } from './bodies.js';

// How close the traveler must be to dock, and how far off they sit once docked (the
// craft are drawn 30 km wide, so 60 km shows the whole craft at arm's length).
export const DOCK_RANGE_KM = 10000;
export const DOCK_GAP_KM = 60;
// The countdown: "Docking in progress", then 5 down to 0, one number a second.
export const COUNT_FROM = 5;
// The opening words take about two seconds to say; the count waits for them.
const COUNT_STARTS_S = 2.5;
// Saying "zero" takes about this long. Contact comes as the word ends, so the count,
// the touch, the clunk and the jolt read as one event.
export const ZERO_WORD_S = 0.6;
// The glide from where the traveler was to the docking spot.
export const DOCK_SECONDS = COUNT_STARTS_S + COUNT_FROM + ZERO_WORD_S;

// A craft flying lower than this over a surface cannot be docked with: sitting 60 km
// off it, the traveler would be skimming the ground (LRO and Danuri over the Moon).
export const DOCK_MIN_ALTITUDE_KM = 200;

// True when the craft is too close to the ground to dock with.
export function tooLowToDock(craft, bodies) {
  return nearestSurface(craft.position, bodies).distance < DOCK_MIN_ALTITUDE_KM;
}

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

// A docking in progress: where the traveler was relative to the craft, where they will
// sit, and how long the glide has run (seconds of play).
export function startDocking(position, craft) {
  return {
    id: craft.id,
    from: position.map((n, i) => n - craft.position[i]),
    to: dockOffset(position, craft),
    elapsed: 0,
  };
}

// The traveler's offset from the craft right now.
export function dockingOffset({ from, to, elapsed }) {
  const t = Math.max(0, Math.min(1, elapsed / DOCK_SECONDS));
  // Sets off from rest and is still closing at half its average pace on contact. (An
  // ease that also slowed to nothing at the end looked like stopping short two
  // seconds early and hanging there.)
  const eased = t * t * (2.5 - 1.5 * t);
  return from.map((n, i) => n + (to[i] - n) * eased);
}

// The numbers to call out as the glide's clock goes from `before` to `after` seconds.
// Normally none or one; after a stutter only the latest, so calls never pile up.
export function countsBetween(before, after) {
  let latest = null;
  for (let n = COUNT_FROM; n >= 0; n--) {
    const at = COUNT_STARTS_S + (COUNT_FROM - n);
    if (at > before && at <= after) latest = n;
  }
  return latest === null ? [] : [latest];
}

export const JOLT_SECONDS = 1.2;

// The knock the craft takes on contact (the clunk and the hiss in ui/sound.js start at
// the same moment): shoved away from the traveler and
// tipped a little, swinging back and forth as it dies away. push is a share of the
// craft's shown size, tilt is in radians.
export function latchJolt(dock) {
  const t = dock.elapsed - DOCK_SECONDS;
  if (!(t > 0) || t > JOLT_SECONDS) return { push: 0, tilt: 0 };
  const fade = Math.exp(-4.5 * t);
  return { push: 0.09 * fade * Math.sin(20 * t), tilt: 0.06 * fade * Math.sin(27 * t) };
}

// True once the glide is over and the traveler is held at the craft.
export function isDocked(dock) {
  return dock.elapsed >= DOCK_SECONDS;
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

// The speed the traveler keeps on letting go: the craft's velocity (game km per second
// of play, world axes), measured against the body that carries the traveler along
// there (within CARRY_KM of its surface), or against the Sun when there is none.
export function releaseDrift(craftId, craftBefore, craftAfter, bodiesBefore, bodiesAfter, position, dt) {
  if (!(dt > 0)) return [0, 0, 0];
  const from = craftBefore.find((c) => c.id === craftId).position;
  const to = craftAfter.find((c) => c.id === craftId).position;
  const { body, distance } = nearestSurface(position, bodiesAfter);
  const carried = body && distance <= CARRY_KM ? bodiesBefore.find((b) => b.id === body.id) : null;
  return to.map((n, i) => (n - from[i] - (carried ? body.position[i] - carried.position[i] : 0)) / dt);
}

// Any thrust lets go of the craft.
export function wantsToLeave({ drive = 0, strafe = 0 }) {
  return drive !== 0 || strafe !== 0;
}
