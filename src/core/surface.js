// Places on a spinning body's surface, matching how the maps are drawn (render/planets.js).

const RAD = Math.PI / 180;

// Real sidereal days (seconds) of the bodies that carry story places. render/planets.js
// spins the same bodies with the same numbers, so a place stays on its spot of the map.
export const SPIN_DAY_S = {
  moon: 27.3217 * 86400,
  mars: 88643,
  titan: 1377648,
};

// How far a body has turned at game time timeS: eastward, so the angle is negative
// (the same as sphere.rotation.y in render/planets.js).
export function spinAngle(dayS, timeS) {
  return -(timeS * 2 * Math.PI) / dayS;
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
