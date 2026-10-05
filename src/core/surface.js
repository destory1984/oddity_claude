// Places on a spinning body's surface, matching how the maps are drawn (render/planets.js).

const RAD = Math.PI / 180;

// Real sidereal days (seconds) of the bodies that carry story places. render/planets.js
// spins the same bodies with the same numbers, so a place stays on its spot of the map.
// (A negative day turns backward: Venus, Pluto and Charon.)
export const SPIN_DAY_S = {
  moon: 27.3217 * 86400,
  mars: 88643,
  titan: 1377648,
  earth: 86164,
  mercury: 5067000,
  venus: -20997000,
  jupiter: 35730,
  io: 152854,
  europa: 306822,
  saturn: 38362,
  enceladus: 1.370218 * 86400,
  neptune: 57996,
  ceres: 9.074 * 3600,
  pluto: -6.387 * 86400,
  charon: -6.387 * 86400,
};

// Earth alone starts part-way through its turn, so the opening view shows it half lit
// with the Pacific in front.
export const EARTH_START_SPIN = 1.35;
// Earth's clouds drift a little faster than the ground so the weather visibly moves,
// and start a little east of it.
export const CLOUD_DRIFT = 1.08;
export const CLOUD_START = 0.008;

// How far the cloud layer has turned when the ground has turned earthSpinRad (the
// rotation.y of the cloud sphere in render/planets.js; what is drawn on the cloud map,
// the typhoon, stands at its latitude and longitude turned by this).
export function cloudSpin(earthSpinRad) {
  return EARTH_START_SPIN + CLOUD_START + (earthSpinRad - EARTH_START_SPIN) * CLOUD_DRIFT;
}

// How far a body has turned at game time timeS: eastward, so the angle is negative
// (the same as sphere.rotation.y in render/planets.js). startRad is where it began.
export function spinAngle(dayS, timeS, startRad = 0) {
  return startRad - (timeS * 2 * Math.PI) / dayS;
}

// Unit vector from a body's centre to the place at this latitude and east longitude,
// for maps centred on longitude 0 with north at the top. Babylon's sphere puts u = 0 at
// +x and runs it toward -z, and body.vert flips u, so longitude 0 lands on -x.
export function surfaceDirection(latDeg, lonDeg, spinRad) {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD;
  const x = -Math.cos(lat) * Math.cos(lon);
  const z = -Math.cos(lat) * Math.sin(lon);
  const c = Math.cos(spinRad);
  const s = Math.sin(spinRad);
  return [x * c + z * s, Math.sin(lat), -x * s + z * c];
}

// How far the body with this id has turned at game time timeS (0 for one that carries
// no places).
export function spinOf(bodyId, timeS) {
  if (!SPIN_DAY_S[bodyId]) return 0;
  return spinAngle(SPIN_DAY_S[bodyId], timeS, bodyId === 'earth' ? EARTH_START_SPIN : 0);
}
