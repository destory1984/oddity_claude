// Where the camera sits and how close it may see, given the traveler's position.
// Landing stops the traveler exactly on the surface; a camera there would have the
// ground inside its near plane and cut a hole through the planet. So the eye is held
// a little above the ground, and the near plane shrinks as the ground gets close.
import { nearestSurface } from './bodies.js';

export const NEAR_KM = 10;
// Eye height when standing: 0.2% of the body's radius (12.7 km on Earth), at least 20 m.
const EYE_SHARE = 0.002;
const EYE_MIN_KM = 0.02;

export function eyeView(position, bodies) {
  const { body, distance } = nearestSurface(position, bodies);
  if (!body) return { position, nearKm: NEAR_KM };
  const eye = Math.max(EYE_MIN_KM, body.radiusKm * EYE_SHARE);
  let altitude = distance;
  let at = position;
  if (altitude < eye) {
    const offset = position.map((n, i) => n - body.position[i]);
    const length = Math.hypot(...offset);
    const up = length > 0 ? offset.map((n) => n / length) : [0, 1, 0];
    at = body.position.map((n, i) => n + up[i] * (body.radiusKm + eye));
    altitude = eye;
  }
  return { position: at, nearKm: Math.min(NEAR_KM, altitude * 0.4) };
}
