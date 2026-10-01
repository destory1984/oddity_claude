// Docking with a spacecraft or telescope: come close, dock, and ride along with it.
import { stopNow, CARRY_KM } from './game.js';
import { nearestSurface } from './bodies.js';
import { lookAtDirection, rotateLocal, blend } from './orientation.js';

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

// A craft flying lower than this over a surface (LRO and Danuri over the Moon) is
// docked with from straight above: sitting 60 km off it on any other side, the
// traveler would be skimming the ground or under it.
export const DOCK_MIN_ALTITUDE_KM = 200;
// The glide in never comes closer to a surface than this.
export const GLIDE_CLEAR_KM = 20;

// True when the craft is that close to the ground.
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

// Where the docked traveler sits relative to the craft: on the side they came from,
// or, for a craft flying low over a surface (bodies given), on the side away from
// the ground.
export function dockOffset(position, craft, bodies = null) {
  const ground = bodies ? nearestSurface(craft.position, bodies) : null;
  const out = ground?.body && ground.distance < DOCK_MIN_ALTITUDE_KM
    ? craft.position.map((n, i) => n - ground.body.position[i])
    : position.map((n, i) => n - craft.position[i]);
  const length = Math.hypot(...out);
  if (length < 1e-9) return [0, DOCK_GAP_KM, 0];
  return out.map((n) => (n / length) * DOCK_GAP_KM);
}

// A docking in progress: where the traveler was relative to the craft, where they will
// sit, and how long the glide has run (seconds of play).
export function startDocking(position, craft, bodies = null) {
  return {
    id: craft.id,
    from: position.map((n, i) => n - craft.position[i]),
    to: dockOffset(position, craft, bodies),
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

// The traveler stands in the middle of the view, so a craft straight ahead would be
// hidden behind them. The view is turned this far (radians) off the craft as the glide
// runs: to one side on a wide screen, downward on a tall one (the craft then sits above).
export const DOCK_ASIDE = { yaw: 0.42, pitch: 0.36 };

// The way to face on contact: at the craft, turned aside. wide: the screen is wider
// than it is tall.
export function dockFacing(position, craftPosition, wide = true) {
  const at = lookAtDirection(craftPosition.map((n, i) => n - position[i]));
  return wide ? rotateLocal(at, DOCK_ASIDE.yaw, 0) : rotateLocal(at, 0, DOCK_ASIDE.pitch);
}

// The orientation part-way through the glide: from how the traveler faced at the
// start (`from`) round to dockFacing, evenly eased; null once docked (free to look).
export function dockingFacing(dock, from, position, craftPosition, wide = true) {
  if (isDocked(dock)) return null;
  const t = Math.max(0, Math.min(1, dock.elapsed / (DOCK_SECONDS - 0.5)));
  return blend(from, dockFacing(position, craftPosition, wide), t * t * (3 - 2 * t));
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
// bodies: when given, the glide is kept above the ground (a craft low over the far
// side of a moon would otherwise be reached through it).
export function dockedState(state, craft, offset, bodies = null) {
  let position = craft.position.map((n, i) => n + offset[i]);
  if (bodies) {
    const { body, distance } = nearestSurface(position, bodies);
    if (body && distance < GLIDE_CLEAR_KM) {
      const up = position.map((n, i) => n - body.position[i]);
      const height = Math.hypot(...up) || 1;
      position = body.position.map((n, i) => n + (up[i] / height) * (body.radiusKm + GLIDE_CLEAR_KM));
    }
  }
  return { ...stopNow(state), restingOn: null, position };
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
