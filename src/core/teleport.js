// Jumping straight to somewhere already visited: choose its name on screen and arrive
// there. A body is shown from its best side, a craft is docked with, a story place is
// seen from above.
import { nearestSurface } from './bodies.js';
import { DOCK_RANGE_KM } from './dock.js';

// A body is seen from this many of its radii from its centre: the disc then fills
// about a third of the screen's height (the view is 60 degrees tall).
export const VISTA_RADII = 5;
// Saturn's rings reach 2.35 radii out, so stand back and look from higher up.
const RINGED = { saturn: { radii: 9, liftDeg: 22 } };
// Off to one side of the line to the Sun, so most of the disc is lit and the night
// edge shows; and a little above the planets' plane.
const SIDE_DEG = 40;
const LIFT_DEG = 12;
// A craft is met from this far off, and a place from this far above the ground.
export const CRAFT_ARRIVAL_KM = 300;
export const SITE_ARRIVAL_KM = 400;
// A craft within this far of a surface is met from the side away from the ground.
const LOW_CRAFT_KM = 20000;

const rad = (deg) => (deg * Math.PI) / 180;
const sub = (a, b) => a.map((n, i) => n - b[i]);
const gap = (a, b) => Math.hypot(...sub(a, b));
const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a, b, deg) => unit(a.map((n, i) => n * Math.cos(rad(deg)) + b[i] * Math.sin(rad(deg))));
// A level direction square to d (any, when d points straight up).
function sideOf(d) {
  const s = cross(d, [0, 1, 0]);
  return Math.hypot(...s) < 1e-6 ? [1, 0, 0] : unit(s);
}

// Whether the traveler has been to the target before: a body discovered, a craft come
// within docking range of, a story place logged.
export function visited(target, progress) {
  if (target.kind === 'craft') return (progress.craft ?? []).includes(target.id);
  if (target.kind === 'site') return (progress.stories ?? []).includes(target.id);
  return progress.discovered.includes(target.id);
}

// True when the target is far enough that going there is a journey: more than twice
// the viewing distance from a body, out of docking range of a craft, 2,000 km from a place.
export function farFrom(target, position) {
  const km = gap(position, target.position);
  if (target.kind === 'craft') return km > DOCK_RANGE_KM;
  if (target.kind === 'site') return km > 2000;
  return km > 2 * vistaKm(target);
}

// How far from a body's centre its best view is.
export function vistaKm(body) {
  return (RINGED[body.id]?.radii ?? VISTA_RADII) * body.radiusKm;
}

// The direction `level` laid into the rings' plane and lifted RING_LIFT_DEG off it, on
// the side of the plane the Sun is on (the lit face).
const RING_LIFT_DEG = 30;
function overRings(level, toLight, ringNormal) {
  const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
  let n = unit(ringNormal);
  const lit = dot(n, toLight);
  // The Sun in the rings' own plane lights neither face: take the side that is up.
  if (Math.abs(lit) > 0.02 ? lit < 0 : n[1] < 0) n = n.map((x) => -x);
  const flat = level.map((x, i) => x - n[i] * dot(level, n));
  return mix(unit(flat), n, RING_LIFT_DEG);
}

// Where to stand to see a body at its best: sunlit, with the night edge showing, the
// whole disc (and rings) in view. Tries the other side, then closer in, if another
// body is in the way there.
// ringNormal: the direction square to the body's rings, when it has rings. The view is
// then lifted off the rings' own plane, on their sunlit side: lifted off the planets'
// plane alone, Saturn's rings (tilted 27 degrees) could come out edge on, a thin line.
// toward: a direction from the body's centre to something on it worth seeing (a moon's
// shadow): of the two sides of the line to the Sun, the one nearer to it is tried first.
export function bodyVista(body, bodies, ringNormal = null, toward = null) {
  const sun = bodies.find((b) => b.kind === 'star');
  const earth = bodies.find((b) => b.id === 'earth');
  const { radii, liftDeg } = { radii: VISTA_RADII, liftDeg: LIFT_DEG, ...RINGED[body.id] };
  // The Sun has no lit side: look from the side Earth is on.
  const toLight = unit(sub((body.kind === 'star' ? earth : sun).position, body.position));
  const side = sideOf(toLight);
  const turns = toward && toward.reduce((s, n, i) => s + n * side[i], 0) < 0 ? [-1, 1] : [1, -1];
  const spots = [];
  for (const shrink of [1, 0.6, 0.4]) {
    for (const turn of turns) {
      const level = mix(toLight, side.map((n) => n * turn), SIDE_DEG);
      const out = ringNormal ? overRings(level, toLight, ringNormal) : mix(level, [0, 1, 0], liftDeg);
      spots.push(body.position.map((n, i) => n + out[i] * radii * shrink * body.radiusKm));
    }
  }
  // Well clear of every other body if possible; a moon that hugs its planet (Phobos,
  // 600 km over Mars) settles for staying above the ground.
  const clear = (margin) => (spot) => bodies.every((b) => b.id === body.id || gap(spot, b.position) > margin(b));
  return spots.find(clear((b) => b.radiusKm * 1.5)) ?? spots.find(clear((b) => b.radiusKm + 100)) ?? spots[0];
}

// Where to appear beside a craft before docking: 300 km off, on the side away from
// the ground when it flies low, else on its sunlit side.
export function craftArrival(craft, bodies) {
  const near = nearestSurface(craft.position, bodies);
  const sun = bodies.find((b) => b.kind === 'star');
  const out = near.body && near.distance < LOW_CRAFT_KM
    ? unit(sub(craft.position, near.body.position))
    : unit(sub(sun.position, craft.position));
  return craft.position.map((n, i) => n + out[i] * CRAFT_ARRIVAL_KM);
}

// Where to appear over a story place: 400 km up and as far to one side, so the ground
// slants away to the horizon.
export function siteArrival(site, body) {
  const up = unit(sub(site.position, body.position));
  const side = sideOf(up);
  return site.position.map((n, i) => n + (up[i] + side[i]) * SITE_ARRIVAL_KM);
}

// Where choosing `target` takes the traveler, or null when it does not (never been
// there, or already near). parent: the body a story place is on. anywhere: the jump
// was asked for outright (the journal's button), so being near does not cancel it.
// known: the next stop of a tour, which may be jumped near without having been there.
export function teleportSpot(target, { position, progress, bodies, parent = null, anywhere = false, known = false, ringNormal = null, toward = null }) {
  if ((!known && !visited(target, progress)) || (!anywhere && !farFrom(target, position))) return null;
  if (target.kind === 'craft') return craftArrival(target, bodies);
  if (target.kind === 'site') return siteArrival(target, parent);
  return bodyVista(target, bodies, ringNormal, toward);
}
