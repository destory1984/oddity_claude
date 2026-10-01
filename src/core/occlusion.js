import { apparentAngularRadius } from './bodies.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Area shared by two circles of radius a and b whose centres are d apart.
function overlapArea(a, b, d) {
  if (d >= a + b) return 0;
  const small = Math.min(a, b);
  if (d <= Math.abs(a - b)) return Math.PI * small * small;
  const alpha = Math.acos(clamp((d * d + a * a - b * b) / (2 * d * a), -1, 1));
  const beta = Math.acos(clamp((d * d + b * b - a * a) / (2 * d * b), -1, 1));
  return a * a * (alpha - Math.sin(2 * alpha) / 2) + b * b * (beta - Math.sin(2 * beta) / 2);
}

// The uncovered share of the Sun disc's area (0..1), taking the smallest value over
// every body in front of it. Directions are unit vectors from the viewer; distances are km.
export function sunVisibility(sunDir, sunDistance, sunRadius, occluders) {
  const sunAngular = apparentAngularRadius(sunRadius, sunDistance);
  let visibility = 1;
  for (const { direction, distance, radius } of occluders) {
    if (distance >= sunDistance) continue;
    const angular = apparentAngularRadius(radius, distance);
    const cos = clamp(direction.reduce((s, n, i) => s + n * sunDir[i], 0), -1, 1);
    const separation = Math.acos(cos);
    const covered = overlapArea(sunAngular, angular, separation) / (Math.PI * sunAngular * sunAngular);
    visibility = Math.min(visibility, 1 - Math.min(1, covered));
  }
  return visibility;
}

// How far into an eclipse the view is, 0 (none) to 1 (total): it sets in over the last
// eighth of the disc, so the corona comes out as the Sun goes.
export function eclipseDepth(visibility) {
  const t = clamp(visibility / 0.12, 0, 1);
  return 1 - t * t * (3 - 2 * t);
}

// The diamond ring: with a sliver of the Sun left (under 6% of the disc), a bead of
// light at the edge of the covered disc, on the side away from the body in front.
// Returns { direction, strength }: a unit vector square to the line of sight, pointing
// from the Sun's centre to the bead, and 0..1 (0 when there is none).
export function sunBead(sunDir, sunDistance, sunRadius, occluders) {
  const none = { direction: [0, 0, 0], strength: 0 };
  const sunAngular = apparentAngularRadius(sunRadius, sunDistance);
  let worst = null;
  for (const occluder of occluders) {
    if (occluder.distance >= sunDistance) continue;
    const visibility = sunVisibility(sunDir, sunDistance, sunRadius, [occluder]);
    if (!worst || visibility < worst.visibility) worst = { ...occluder, visibility };
  }
  if (!worst || worst.visibility <= 0 || worst.visibility >= 0.06) return none;
  const along = worst.direction.reduce((sum, n, i) => sum + n * sunDir[i], 0);
  // The way from the body in front to the Sun's centre, across the line of sight.
  const across = sunDir.map((n, i) => n * along - worst.direction[i]);
  const length = Math.hypot(...across);
  if (length < 1e-9 * Math.max(1, sunAngular)) return none;
  const rise = clamp(worst.visibility / 0.003, 0, 1);
  const fall = 1 - clamp((worst.visibility - 0.012) / 0.048, 0, 1);
  return { direction: across.map((n) => n / length), strength: rise * fall };
}
