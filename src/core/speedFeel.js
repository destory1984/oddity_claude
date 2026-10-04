// The feel of speed: near the speed limit of the spot the view widens, and from 2c the
// stars draw out into short lines away from the point she flies toward. It can be
// turned off in the settings (it may unsettle the stomach).
export const BASE_FOV_DEG = 60;
export const WIDE_FOV_DEG = 12;
// The share of the limit from which the view starts to widen.
const WIDEN_FROM = 0.6;
// Going from the plain view to the widest takes this long.
const WIDEN_SECONDS = 0.5;
// (10c in the first plan: but the limit passes 10c only some 6,000,000 km from every
// surface, so in the inner system the stars would never have moved.)
const STREAK_FROM_C = 2;
const STREAK_FULL_C = 100;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

// The view's height in degrees. ratio: her speed over the limit of the spot.
// upright: a screen taller than wide, where the widening is halved.
export function feelFovDeg(ratio, upright) {
  return BASE_FOV_DEG + WIDE_FOV_DEG * (upright ? 0.5 : 1) * clamp01((ratio - WIDEN_FROM) / (1 - WIDEN_FROM));
}

// One frame's step of the view toward its goal, at a steady rate.
export function easeFovDeg(current, goal, dt) {
  const step = (WIDE_FOV_DEG / WIDEN_SECONDS) * Math.max(0, dt);
  return current < goal ? Math.min(goal, current + step) : Math.max(goal, current - step);
}

// How far the stars are drawn out: 0 up to 2c, 1 from 100c.
export function streakAmount(speedC) {
  if (speedC <= STREAK_FROM_C) return 0;
  return clamp01(Math.log10(speedC / STREAK_FROM_C) / Math.log10(STREAK_FULL_C / STREAK_FROM_C));
}
