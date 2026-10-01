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
