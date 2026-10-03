// The shadows of moons on their planets: a black dot crossing Jupiter's clouds under Io,
// Europa, Ganymede or Callisto, the dots of Saturn's moons (Titan's the largest), the
// faint smudge of Phobos on Mars. Decided here; drawn by render/shaders/textured.frag.
// Where a moon's shadow falls follows from where the moon and the Sun are in the game;
// how sharp its edge is follows from the real sizes and distances, since in the game the
// Sun stands a hundred times nearer and would blur every shadow away.
import { BODY_DATA } from './bodies.js';

// Planets whose moons' shadows are drawn, and the moons. (Not Earth: the Moon's orbit
// here passes well above the line to the Sun. Not Neptune or Pluto: Triton's shadow
// does not reach Neptune in these years, nor Charon's Pluto.)
export const SHADOW_CASTERS = {
  mars: ['phobos'],
  jupiter: ['io', 'europa', 'ganymede', 'callisto'],
  saturn: ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan'],
};
// The shader takes this many shadows on one planet.
export const SHADOW_SLOTS = 6;
// A shadow is told about from where it is at least a few pixels wide: within this many
// of its own outer radii (0.4 degrees across).
export const SHADOW_SEEN_FROM = 286;

const data = (id) => BODY_DATA.find((b) => b.id === id);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};

// The edge of a moon's shadow on its planet, in km from the shadow's middle:
//   innerKm: as dark as it gets out to here
//   outerKm: no darker than the ground round it from here
//   depth: the share of the Sun the moon covers at the middle (1: all of it)
// The Sun is a disc, so the edge is soft over the moon's distance times the Sun's
// angular size. A moon that looks smaller than the Sun (Phobos) never covers it all.
export function shadowEdge(moonId) {
  const moon = data(moonId);
  const planet = data(moon.parent);
  const softKm = ((moon.orbitKm - planet.radiusKm) * data('sun').radiusKm) / planet.orbitKm;
  return {
    innerKm: Math.abs(moon.radiusKm - softKm),
    outerKm: moon.radiusKm + softKm,
    depth: Math.min(1, (moon.radiusKm / softKm) ** 2),
  };
}

const castersOf = (planetId, bodies) => (SHADOW_CASTERS[planetId] ?? [])
  .map((id) => bodies.find((b) => b.id === id))
  .filter(Boolean);

// Unit vector from the planet's centre to the middle of a moon's shadow on it, or null
// when the shadow misses the planet (or the moon is on the night side).
export function shadowSpot(planet, moon, sunPosition) {
  const toSun = unit(sunPosition.map((n, i) => n - planet.position[i]));
  const at = moon.position.map((n, i) => (n - planet.position[i]) / planet.radiusKm);
  const along = dot(at, toSun);
  const inside = along * along - (dot(at, at) - 1);
  if (along <= 0 || inside < 0) return null;
  const reach = along - Math.sqrt(inside);
  return at.map((n, i) => n - toSun[i] * reach);
}

// What the shader needs for a planet: for each slot, where the moon is from the
// planet's centre and the shadow's edge, all in planet radii. Unused slots are zero.
//   at: SHADOW_SLOTS x [x, y, z, 0], edge: SHADOW_SLOTS x [inner, outer, depth]
export function castShadows(planetId, bodies) {
  const planet = bodies.find((b) => b.id === planetId);
  const at = new Array(SHADOW_SLOTS * 4).fill(0);
  const edge = new Array(SHADOW_SLOTS * 3).fill(0);
  castersOf(planetId, bodies).slice(0, SHADOW_SLOTS).forEach((moon, k) => {
    moon.position.forEach((n, i) => { at[k * 4 + i] = (n - planet.position[i]) / planet.radiusKm; });
    const { innerKm, outerKm, depth } = shadowEdge(moon.id);
    edge.splice(k * 3, 3, innerKm / planet.radiusKm, outerKm / planet.radiusKm, depth);
  });
  return { at, edge };
}

// The shadows the traveler can see now: 'shadow:io'... The shadow is on the planet, on
// the side toward the traveler, and near enough to be more than a speck.
export function shadowsNear(bodies, position) {
  const sun = bodies.find((b) => b.kind === 'star');
  const found = [];
  for (const planetId of Object.keys(SHADOW_CASTERS)) {
    const planet = bodies.find((b) => b.id === planetId);
    if (!planet) continue;
    for (const moon of castersOf(planetId, bodies)) {
      const spot = shadowSpot(planet, moon, sun.position);
      if (!spot) continue;
      const from = position.map((n, i) => n - (planet.position[i] + spot[i] * planet.radiusKm));
      const distance = Math.hypot(...from);
      if (distance > SHADOW_SEEN_FROM * shadowEdge(moon.id).outerKm) continue;
      // Seen at a slant of 70 degrees or less.
      if (dot(from, spot) / distance < 0.34) continue;
      found.push(`shadow:${moon.id}`);
    }
  }
  return found;
}

// Seconds of game time until a moon's shadow is next on its planet (0 when it is on
// now), looking ahead up to limitS, or null. bodiesAt: time → bodies.
export function nextShadow(bodiesAt, moonId, fromS, limitS, stepS = 600) {
  for (let t = 0; t <= limitS; t += stepS) {
    const bodies = bodiesAt(fromS + t);
    const moon = bodies.find((b) => b.id === moonId);
    const planet = bodies.find((b) => b.id === moon.parent);
    if (shadowSpot(planet, moon, bodies.find((b) => b.kind === 'star').position)) return t;
  }
  return null;
}
