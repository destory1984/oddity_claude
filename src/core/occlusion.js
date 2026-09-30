import { apparentAngularRadius } from './bodies.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// How much of the Sun disc is visible (0..1), taking the smallest value over every
// body in front of it. Directions are unit vectors from the viewer; distances are km.
export function sunVisibility(sunDir, sunDistance, sunRadius, occluders) {
  const sunAngular = apparentAngularRadius(sunRadius, sunDistance);
  let visibility = 1;
  for (const { direction, distance, radius } of occluders) {
    if (distance >= sunDistance) continue;
    const angular = apparentAngularRadius(radius, distance);
    const cos = clamp(direction.reduce((s, n, i) => s + n * sunDir[i], 0), -1, 1);
    const separation = Math.acos(cos);
    visibility = Math.min(visibility, smoothstep(0, 1, (separation - angular + sunAngular) / (sunAngular * 2)));
  }
  return visibility;
}
