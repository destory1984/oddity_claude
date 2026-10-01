// A gravity slingshot, as the Voyagers used at Jupiter and Saturn: fly fast past a
// planet (or the Sun) without landing, and on the way out it flings the traveler off,
// path bent round it, faster than the place normally allows.
//
// This is a game rule, not real gravity: nothing pulls on the traveler until the
// moment of closest approach has passed.
import { surfaceDistance } from './bodies.js';
import { speedLimit, MAX_SPEED } from './flight.js';
import { velocity } from './game.js';

// The pass counts within this many radii above the surface.
export const SLING_RADII = 3;
// How long the fling lasts, and how much faster than the local limit it starts: twice
// at the edge of the zone, three times when skimming the surface. It fades to nothing.
export const SLING_SECONDS = 6;
// The path bends toward the planet by up to this much, more the closer the pass.
export const SLING_BEND_DEG = 40;
// Only a real fly-by counts: at least this share of the allowed speed at the closest
// point, having come in from at least a quarter farther out than that point (or from
// outside the zone altogether).
const MIN_SPEED_SHARE = 0.5;
const MIN_APPROACH = 1.25;
// Closest approach is over once the distance has grown this much again.
const PAST = 1.03;

const massive = (body) => body.kind === 'planet' || body.kind === 'star';

// Call every frame. pass: what this function returned last time (null at first).
// Returns { pass, flung }: flung is null, or { bodyId, state, factor } with the
// traveler's new state when the fling begins.
export function slingshot(pass, state, bodies) {
  let near = null;
  for (const body of bodies) {
    if (!massive(body)) continue;
    const km = surfaceDistance(state.position, body);
    if (km <= SLING_RADII * body.radiusKm && (!near || km < near.km)) near = { body, km };
  }
  if (!near) return { pass: null, flung: null };
  const { body, km } = near;
  let now = pass && pass.id === body.id ? pass : { id: body.id, enteredKm: km, minKm: km, done: false };
  // Touching down, or a fling already under way, ends this pass: leave and come back.
  if (state.restingOn || state.boost) now = { ...now, done: true };
  now = { ...now, minKm: Math.min(now.minKm, km) };
  if (now.done || km <= now.minKm * PAST + 1) return { pass: now, flung: null };

  // Past the closest point. Whatever happens, this pass is used up.
  now = { ...now, done: true };
  const v = velocity(state);
  const speed = Math.hypot(...v);
  const cameIn = now.enteredKm >= Math.min(now.minKm * MIN_APPROACH, SLING_RADII * body.radiusKm * 0.97);
  if (!cameIn || speed < MIN_SPEED_SHARE * speedLimit(now.minKm)) return { pass: now, flung: null };

  const closeness = 1 - now.minKm / (SLING_RADII * body.radiusKm);
  const factor = 2 + closeness;
  // Bend the way of travel toward the planet: the part of "toward the planet" that is
  // square to the motion, mixed in by the bend angle.
  const along = v.map((n) => n / speed);
  const toBody = body.position.map((n, i) => n - state.position[i]);
  const inline = toBody.reduce((s, n, i) => s + n * along[i], 0);
  const across = toBody.map((n, i) => n - along[i] * inline);
  const acrossLength = Math.hypot(...across);
  const bend = (SLING_BEND_DEG * closeness * Math.PI) / 180;
  const direction = acrossLength > 1e-9
    ? along.map((n, i) => n * Math.cos(bend) + (across[i] / acrossLength) * Math.sin(bend))
    : along;
  const fast = Math.min(MAX_SPEED, speedLimit(km) * factor);
  return {
    pass: now,
    flung: {
      bodyId: body.id,
      factor,
      // The traveler's own thrust is spent: the fling carries them, whichever way they face.
      state: {
        ...state, speed: 0, brakeRate: 0, sideSpeed: 0, sideBrakeRate: 0,
        drift: direction.map((n) => n * fast),
        boost: { factor, seconds: SLING_SECONDS, total: SLING_SECONDS },
      },
    },
  };
}
