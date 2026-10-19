import { bodyShape } from './bodies.js';

export const C = 299792.458;

export const MIN_SPEED = C * 0.01;
export const MAX_SPEED = C * 100;
// The limit grows with the distance to the nearest surface: flying straight at a body
// at the limit, the surface is always at least two seconds away, so the traveler slows
// down smoothly on approach and speeds up smoothly on departure. (It was one second
// until 2026-10-03: leaving a planet, the speed doubled every 0.7 s and ran away.)
export const LIMIT_PER_SECOND = 0.5;

export function speedLimit(surfaceKm) {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, surfaceKm * LIMIT_PER_SECOND));
}

// Full thrust reaches the limit of the spot in this long (3 s until 2026-10-03).
export const ACCELERATION_SECONDS = 6;

export function accelerateSpeed(current, strength, dt, maxSpeed) {
  const clampedStrength = Math.max(0, Math.min(1, strength));
  const next = Math.max(0, current) + (maxSpeed / ACCELERATION_SECONDS) * clampedStrength * Math.max(0, dt);
  // Snap rounding residue so a full-strength burn of that long lands exactly on the limit.
  if (next >= maxSpeed * (1 - 1e-12)) return maxSpeed;
  return next;
}

export function brakeSpeed(current, rate, dt) {
  const next = Math.max(0, current) - Math.max(0, rate) * Math.max(0, dt);
  return next < 0.01 ? 0 : next;
}

// Distance t along the unit direction where the segment first meets the sphere,
// or null. A traveler on (or numerically inside) the sphere moving inward hits at t = 0.
export function sweepSphere(start, direction, length, center, radius) {
  const relative = start.map((n, i) => n - center[i]);
  const b = relative.reduce((sum, n, i) => sum + n * direction[i], 0);
  if (b >= 0) return null;
  const q = relative.reduce((sum, n) => sum + n * n, 0) - radius * radius;
  if (q <= 0) return 0;
  const discriminant = b * b - q;
  if (discriminant < 0) return null;
  const t = -b - Math.sqrt(discriminant);
  return t <= length ? t : null;
}

// The same against a squat ball (core/bodies.js bodyShape: [round the middle, along the
// spin axis y]): squeezed along y until it is a ball, the way stays a line and its length
// along it the same `t`.
export function sweepSquat(start, direction, length, center, [round, axis]) {
  const squeeze = round / axis;
  const relative = start.map((n, i) => (n - center[i]) * (i === 1 ? squeeze : 1));
  const way = direction.map((n, i) => n * (i === 1 ? squeeze : 1));
  const a = way.reduce((sum, n) => sum + n * n, 0);
  const b = relative.reduce((sum, n, i) => sum + n * way[i], 0);
  if (b >= 0) return null;
  const q = relative.reduce((sum, n) => sum + n * n, 0) - round * round;
  if (q <= 0) return 0;
  const discriminant = b * b - a * q;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t <= length ? t : null;
}

export function firstSphereHit(start, direction, length, bodies, margin = 0) {
  let best = null;
  for (const body of bodies) {
    const shape = bodyShape(body);
    const t = shape
      ? sweepSquat(start, direction, length, body.position, [shape[0] + margin, shape[1] + margin])
      : sweepSphere(start, direction, length, body.position, body.radiusKm + margin);
    if (t !== null && (best === null || t < best.t)) best = { body, t };
  }
  if (!best) return null;
  return { ...best, position: start.map((n, i) => n + direction[i] * best.t) };
}
