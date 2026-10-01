// Shooting stars over Earth's night side: crumbs shed by comets, burning up 90 km above
// the ground. Seen from orbit they are short bright scratches on the dark half of the
// planet. Decided here; drawn by render/meteors.js.

// They show from within this far of Earth's surface.
export const METEOR_RANGE_KM = 30000;
export const METEOR_ALTITUDE_KM = 90;
// One starts every 0.4 to 1.2 seconds and burns for 0.7.
export const METEOR_GAP_S = [0.4, 1.2];
export const METEOR_LIFE_S = 0.7;
// Trail length, far longer than the real 20 km so it can be seen from orbit.
export const METEOR_LENGTH_KM = [300, 700];

const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// A place for the next meteor, or null if this try found none: a point on the unit
// sphere that is in the dark (the Sun below its horizon) and on the half of Earth the
// traveler can see, with a level direction to streak along and a length.
// rand: () => 0..1. toSun, toTraveler: unit vectors from Earth's centre.
export function meteorSpot(rand, toSun, toTraveler) {
  for (let i = 0; i < 24; i++) {
    const z = 2 * rand() - 1;
    const a = 2 * Math.PI * rand();
    const r = Math.sqrt(1 - z * z);
    const up = [r * Math.cos(a), z, r * Math.sin(a)];
    if (dot(up, toSun) > -0.05 || dot(up, toTraveler) < 0.15) continue;
    // Any level heading: start from one tangent and turn it about "up".
    const east = unit(cross(Math.abs(up[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], up));
    const north = cross(up, east);
    const heading = 2 * Math.PI * rand();
    return {
      up,
      along: east.map((n, k) => n * Math.cos(heading) + north[k] * Math.sin(heading)),
      lengthKm: METEOR_LENGTH_KM[0] + rand() * (METEOR_LENGTH_KM[1] - METEOR_LENGTH_KM[0]),
    };
  }
  return null;
}

// Seconds until the next one.
export function meteorGap(rand) {
  return METEOR_GAP_S[0] + rand() * (METEOR_GAP_S[1] - METEOR_GAP_S[0]);
}

// How bright a meteor is `age` seconds after it lit: a quick flare, then fading out.
export function meteorGlow(age) {
  if (age < 0 || age >= METEOR_LIFE_S) return 0;
  const t = age / METEOR_LIFE_S;
  return t < 0.2 ? t / 0.2 : (1 - t) / 0.8;
}
