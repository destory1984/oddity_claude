// Planetshine: the light a planet throws back on its moon. The Moon's dark side facing
// Earth is not black: a full Earth hangs there forty times brighter than a full Moon
// (Leonardo worked out in about 1510 that this is why the old Moon shows in the new
// Moon's arms). Drawn by render/shaders/textured.frag.

// The colour of each planet's light.
export const SHINE_COLOR = {
  earth: [0.55, 0.7, 1], mars: [1, 0.62, 0.42], jupiter: [1, 0.86, 0.66], saturn: [1, 0.9, 0.7],
  uranus: [0.62, 0.9, 0.95], neptune: [0.5, 0.65, 1], pluto: [0.92, 0.82, 0.7],
};
// The real light is a ten-thousandth of sunlight and the eye, grown used to the dark,
// still sees by it: here it is raised to at most this share of full sunlight.
export const SHINE_MAX = 0.16;
const SHINE_GAIN = 6;

// moon, planet, sun: { position: [km], radiusKm }. Returns { direction: unit vector from
// the moon to the planet, strength: 0 to SHINE_MAX, color }. The strength goes by how
// large the planet stands in the moon's sky and how much of its lit side faces the moon
// (none at "new Earth", when the planet is between the moon and... the Sun's far side).
export function planetshine(moon, planet, sun) {
  const toPlanet = planet.position.map((n, i) => n - moon.position[i]);
  const distance = Math.hypot(...toPlanet);
  const direction = toPlanet.map((n) => n / distance);
  const toSun = sun.position.map((n, i) => n - planet.position[i]);
  const sunDistance = Math.hypot(...toSun);
  // From the planet: the way to the moon against the way to the Sun. 1: the moon sees
  // the planet's whole lit side; -1: only its night side.
  const facing = -direction.reduce((sum, n, i) => sum + n * (toSun[i] / sunDistance), 0);
  const lit = (1 + facing) / 2;
  const size = (planet.radiusKm / distance) ** 2;
  return {
    direction,
    strength: Math.min(SHINE_MAX, SHINE_GAIN * size * lit),
    color: SHINE_COLOR[planet.id] ?? [1, 1, 1],
  };
}
