// Shooting stars over Earth's night side: crumbs shed by comets, burning up 90 km above
// the ground. Seen from orbit they are short bright scratches on the dark half of the
// planet. Decided here; drawn by render/meteors.js.

// They show from within this far of Earth's surface.
export const METEOR_RANGE_KM = 30000;
export const METEOR_ALTITUDE_KM = 90;
// One starts every 0.4 to 1.2 seconds and burns for 0.9.
export const METEOR_GAP_S = [0.4, 1.2];
export const METEOR_LIFE_S = 0.9;
// A fireball, a larger crumb, burns longer and bursts at its end. One meteor in 25 is
// one, one in 12 during a shower; it is drawn this many times as long and thick.
export const FIREBALL_LIFE_S = 1.8;
export const FIREBALL_CHANCE = [0.04, 0.08];
export const FIREBALL_SIZE = 1.8;
// The light of the tail and of the glow round the head, by what burns (red, green,
// blue of 255): white; green (oxygen, magnesium), the commonest tint; gold (sodium);
// blue-white (fast ones). Half are white.
export const METEOR_COLOURS = [[255, 245, 225], [120, 255, 170], [255, 190, 90], [150, 200, 255]];
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

// A shower: once every SHOWER_EVERY_S seconds spent near Earth, for SHOWER_S seconds, they
// come fifteen times as thick and all run away from one point of the sky, the radiant, as
// the meteors of a real shower seem to. (Earth is crossing the trail a comet left; the
// crumbs fly side by side, and that they spread from a point is how side-by-side lines
// look from below.) near: seconds spent in range so far.
// (It was 200 and 30 until 2026-10-06: the user waited over three minutes for one. Then
// 120 until 2026-10-08, the user: "1분에 한 번 꼴로 늘려".)
export const SHOWER_EVERY_S = 60;
export const SHOWER_S = 35;
export const SHOWER_GAP_S = [0.025, 0.08];
export function inShower(near) {
  return near % SHOWER_EVERY_S >= SHOWER_EVERY_S - SHOWER_S;
}
export function showerGap(rand) {
  return SHOWER_GAP_S[0] + rand() * (SHOWER_GAP_S[1] - SHOWER_GAP_S[0]);
}
// A shower's radiant: a point over the middle of the night side, a little to one side.
export function showerRadiant(rand, toSun) {
  return unit(toSun.map((n) => -n + 0.5 * (rand() - 0.5)));
}
// A place for a meteor of the shower: as meteorSpot, but it runs straight away from the
// radiant along the top of the air (none right at the radiant, where it would be a dot).
export function showerSpot(rand, toSun, toTraveler, radiant) {
  const spot = meteorSpot(rand, toSun, toTraveler);
  if (!spot) return null;
  const lean = dot(radiant, spot.up);
  const toward = radiant.map((n, k) => n - spot.up[k] * lean);
  if (Math.hypot(...toward) < 0.1) return null;
  return { ...spot, along: unit(toward).map((n) => -n) };
}

// How bright a meteor is `age` seconds after it lit: a quick flare, then fading out.
// life: how long it burns (a fireball's is longer).
export function meteorGlow(age, life = METEOR_LIFE_S) {
  if (age < 0 || age >= life) return 0;
  const t = age / life;
  return t < 0.2 ? t / 0.2 : (1 - t) / 0.8;
}

// What a new meteor is like: which of METEOR_COLOURS it burns with, whether it is a
// fireball, and how large it is drawn (1, or FIREBALL_SIZE). shower: one is falling.
export function meteorKind(rand, shower = false) {
  const pick = rand();
  const colour = pick < 0.5 ? 0 : pick < 0.75 ? 1 : pick < 0.9 ? 2 : 3;
  const fireball = rand() < FIREBALL_CHANCE[shower ? 1 : 0];
  return { colour, fireball, size: fireball ? FIREBALL_SIZE : 1 };
}
