// Going down to a place on a surface: choose its name from nearby and glide down to
// stand beside it. The ground turns (Mars once every 15 minutes of play, 24 km a
// second at its equator), so the traveler is held to the spot and turns with it, as
// when docked with a craft. Any thrust lets go.
import { stopNow } from './game.js';
import { eyeHeightKm } from './eye.js';
import { surfaceDirection, spinOf } from './surface.js';
import { orientationFrom, rotateLocal, blend, multiply, turnAboutY } from './orientation.js';

// The glide down runs under a countdown, like docking (core/dock.js): "Landing in
// progress", then 3 down to 0, one number a second, and she touches down as the word
// "zero" ends. (It was a silent three seconds before.)
export const LAND_COUNT_FROM = 3;
const COUNT_STARTS_S = 2;
const ZERO_WORD_S = 0.6;
export const VISIT_SECONDS = COUNT_STARTS_S + LAND_COUNT_FROM + ZERO_WORD_S;
// Where she stands: this far from the place, toward the equator, and this high (the
// models are drawn 6 km across from close by, so they fill a seventh of the view).
export const STAND_KM = 25;
export const STAND_UP_KM = 1.5;
// She looks at the middle of the model, turned a little so it stands beside her.
const MODEL_MIDDLE_KM = 2;
const ASIDE_YAW = 0.3;
// A tall narrow screen (a phone) shows 15 degrees to each side, not 40: from 25 km and
// turned 17 degrees the model was half off the left edge. There she stands farther
// back (still inside every place's range; the smallest is 40 km) and turns less.
export const NARROW_STAND_KM = 36;
const NARROW_YAW = 0.15;
const DOWN_MOST = 0.4;
// There she also looks a little above it, so it stands beside her and not beside the
// speech bubble over her head.
const NARROW_PITCH = -0.1;

const RAD = Math.PI / 180;
const sub = (a, b) => a.map((n, i) => n - b[i]);

// The standing spot beside a story place (a STORIES entry of type 'surface') at game
// time timeS: fixed to the ground, so it turns with the body.
// Returns { position, up, facing }: where, which way is up there, and the orientation
// that looks at the place from there.
export function standSpot(story, body, timeS, narrow = false) {
  const spin = spinOf(story.body, timeS);
  const shiftDeg = ((narrow ? NARROW_STAND_KM : STAND_KM) / body.radiusKm) / RAD;
  const up = surfaceDirection(story.latDeg - (story.latDeg < 0 ? -1 : 1) * shiftDeg, story.lonDeg, spin);
  const siteUp = surfaceDirection(story.latDeg, story.lonDeg, spin);
  const position = body.position.map((n, i) => n + up[i] * (body.radiusKm + STAND_UP_KM));
  const target = body.position.map((n, i) => n + siteUp[i] * (body.radiusKm + MODEL_MIDDLE_KM));
  // The view is drawn from the eye, which is held higher than she stands on a big body
  // (core/eye.js: 12.7 km on Earth, 6.8 km on Mars). Aimed from where she stands, the
  // place fell 18 degrees below the middle of the view on Earth, behind the buttons.
  // Not steeper than about 22 degrees down: on Jupiter the eye is 143 km up.
  const eyeUp = Math.min(Math.max(STAND_UP_KM, eyeHeightKm(body)), (narrow ? NARROW_STAND_KM : STAND_KM) * DOWN_MOST);
  const eye = body.position.map((n, i) => n + up[i] * (body.radiusKm + eyeUp));
  return { position, up, facing: rotateLocal(orientationFrom(sub(target, eye), up), narrow ? NARROW_YAW : ASIDE_YAW, narrow ? NARROW_PITCH : 0) };
}

// A visit under way: where the traveler was relative to the standing spot, how they
// faced, and how long the glide has run.
export function startVisit(state, id, spot) {
  return { id, from: sub(state.position, spot.position), facing: state.orientation, elapsed: 0 };
}

// The numbers to call out as the glide's clock goes from `before` to `after` seconds.
// Normally none or one; after a stutter only the latest, so calls never pile up.
export function landingCounts(before, after) {
  let latest = null;
  for (let n = LAND_COUNT_FROM; n >= 0; n--) {
    const at = COUNT_STARTS_S + (LAND_COUNT_FROM - n);
    if (at > before && at <= after) latest = n;
  }
  return latest === null ? [] : [latest];
}

// True once the glide is over and she stands at the place.
export function hasArrived(visit) {
  return visit.elapsed >= VISIT_SECONDS;
}

// The traveler dt seconds on. spot: the standSpot of this frame; body: the body the
// place is on; spun: how far (radians) the body turned in this frame.
// Returns { state, visit, arrived }: arrived is true in the frame she touches down.
export function visitStep(state, visit, dt, { spot, body, spun }) {
  const elapsed = visit.elapsed + dt;
  const next = { ...visit, elapsed };
  if (elapsed < VISIT_SECONDS) {
    // Sets off from rest and settles gently.
    const t = elapsed / VISIT_SECONDS;
    const eased = t * t * (3 - 2 * t);
    let position = spot.position.map((n, i) => n + visit.from[i] * (1 - eased));
    // Never through the ground on the way: the place may be near the horizon.
    const out = sub(position, body.position);
    const height = Math.hypot(...out);
    const floor = body.radiusKm + STAND_UP_KM;
    if (height < floor) position = body.position.map((n, i) => n + (out[i] / (height || 1)) * floor);
    return {
      state: { ...stopNow(state), restingOn: null, position, orientation: blend(visit.facing, spot.facing, eased) },
      visit: next,
      arrived: false,
    };
  }
  const arrived = !hasArrived(visit);
  // Standing: carried round with the ground, free to look about.
  const orientation = arrived ? spot.facing : multiply(turnAboutY(spun), state.orientation);
  return { state: { ...stopNow(state), restingOn: body.id, position: spot.position, orientation }, visit: next, arrived };
}
