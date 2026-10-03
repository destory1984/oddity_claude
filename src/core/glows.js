// Lights and plumes on the worlds: aurora rings round the poles of Earth, Jupiter and
// Saturn, lightning on Jupiter's night side and Earth's (with red sprites over it),
// volcanic plumes on Io, ice jets at the south pole of Enceladus, dark plumes on Triton,
// night-shining clouds round Earth's north pole, Io's footprint in Jupiter's aurora,
// Mercury's sodium tail, the jets of Halley's nucleus. Decided here; drawn by
// render/glows.js. Every one of them has been photographed.
import { surfaceDirection } from './surface.js';

const RAD = Math.PI / 180;

// A curtain round each pole at this latitude, from baseKm up to baseKm + heightKm.
// Real aurora is 100 to 400 km up on Earth and far fainter: the height and brightness
// are raised so it shows from orbit. Shown from within rangeRadii of the surface.
export const AURORAS = [
  { body: 'earth', latDeg: 67, baseKm: 100, heightKm: 700, low: [0.2, 1, 0.45], high: [0.75, 0.25, 0.9], rangeRadii: 6 },
  { body: 'jupiter', latDeg: 76, baseKm: 300, heightKm: 4000, low: [0.45, 0.55, 1], high: [0.8, 0.4, 1], rangeRadii: 6 },
  // Saturn's, as Cassini photographed it in visible light: red at the foot, purple at
  // the top (hydrogen's light), standing over a thousand km above the cloud tops.
  { body: 'saturn', latDeg: 75, baseKm: 800, heightKm: 4500, low: [1, 0.3, 0.38], high: [0.62, 0.35, 1], rangeRadii: 12 },
];

// Night-shining (noctilucent) clouds: the highest clouds there are, ice at about 83 km,
// round the summer pole. The ground below is in the dark and they are still in sunlight,
// so they show as an electric-blue veil along the edge of night. A sheet lying over the
// cap between two latitudes (not a curtain standing up), drawn a little higher than it
// is so it clears the air's own glow. Shown from within rangeRadii of the surface.
export const NIGHT_CLOUDS = { body: 'earth', latDeg: [58, 80], heightKm: 140, low: [0.45, 0.75, 1], high: [0.85, 0.95, 1], rangeRadii: 4 };

// The sheet as a cone-shaped band about the spin axis: its edge toward the equator
// (foot) and its edge toward the pole (top), both at the sheet's height.
export function sheetBand(sheet, radiusKm) {
  const at = (latDeg) => ({ radiusKm: (radiusKm + sheet.heightKm) * Math.cos(latDeg * RAD), yKm: (radiusKm + sheet.heightKm) * Math.sin(latDeg * RAD) });
  return { foot: at(sheet.latDeg[0]), top: at(sheet.latDeg[1]) };
}

// Io's footprint: Io and Jupiter are joined along Jupiter's magnetic field by an
// electric current, and where it comes down, a little toward the equator from the main
// aurora ring, there is a bright spot in each hemisphere that goes round as Io does.
export const FOOTPRINT = { body: 'jupiter', moon: 'io', latDeg: 66, liftKm: 900, sizeKm: 6000, rangeRadii: 6 };

// Unit vector from Jupiter's centre to the footprint, given the direction from Jupiter
// to Io: under Io's longitude, at the footprint's latitude, north or south.
export function footprintUp(toMoon, north = true, footprint = FOOTPRINT) {
  const flat = Math.hypot(toMoon[0], toMoon[2]) || 1;
  const lat = footprint.latDeg * RAD * (north ? 1 : -1);
  return [(toMoon[0] / flat) * Math.cos(lat), Math.sin(lat), (toMoon[2] / flat) * Math.cos(lat)];
}

// Mercury's sodium tail: sunlight pushes sodium atoms off Mercury's thin outer air into
// a tail straight away from the Sun, glowing yellow-orange. The real one is millions of
// km long; here 100 radii, like everything between the worlds a hundredth of that.
export const SODIUM_TAIL = { body: 'mercury', lengthKm: 243970, spread: 0.09 };

// Jets from a comet's nucleus: gas and dust break out where the Sun warms the ground,
// in a few narrow streams on the day side (Giotto photographed Halley's in 1986). Each
// is given as a lean away from the line to the Sun: [tilt in degrees, turn round that
// line in degrees]. Drawn far longer than the 5.5 km nucleus so they show; from within rangeKm.
export const JETS = { body: 'halley', lean: [[12, 20], [38, 150], [30, 265]], heightKm: 170, widthKm: 34, rangeKm: 40000 };

// Unit vectors the jets point along, given the unit direction from the nucleus to the Sun.
export function jetDirections(toSun, jets = JETS) {
  const side = Math.abs(toSun[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (v) => v.map((n) => n / Math.hypot(...v));
  const u = unit(cross(side, toSun));
  const v = cross(toSun, u);
  return jets.lean.map(([tiltDeg, turnDeg]) => {
    const tilt = tiltDeg * RAD;
    const turn = turnDeg * RAD;
    return toSun.map((n, i) => n * Math.cos(tilt) + (u[i] * Math.cos(turn) + v[i] * Math.sin(turn)) * Math.sin(tilt));
  });
}

// Red sprites: a discharge high above a thunderstorm, 50 to 90 km up, red with bluish
// tendrils hanging down, gone in a few hundredths of a second (photographed from the
// space station). One follows some of Earth's strokes; drawn several times its height
// and held longer, to be seen from orbit.
export const SPRITE = { body: 'earth', chance: 0.45, liftKm: 110, heightKm: [320, 520], lifeS: 0.45 };

// How bright a sprite is `age` seconds after its stroke: it lights a moment after the
// stroke, at once, and dies away.
export function spriteGlow(age, sprite = SPRITE) {
  const t = age - 0.05;
  if (t < 0 || age >= sprite.lifeS) return 0;
  return (1 - t / (sprite.lifeS - 0.05)) ** 1.5;
}

// The curtain as a cone-shaped band about the spin axis (y): radius and height above
// the equator plane at its foot and at its top, in km. north: true for the north pole.
export function auroraBand(aurora, radiusKm, north = true) {
  const lat = aurora.latDeg * RAD;
  const sign = north ? 1 : -1;
  const at = (km) => ({ radiusKm: (radiusKm + km) * Math.cos(lat), yKm: sign * (radiusKm + km) * Math.sin(lat) });
  return { foot: at(aurora.baseKm), top: at(aurora.baseKm + aurora.heightKm) };
}

// Thunderstorms seen from above on a world's night side: a forked channel and the cloud
// lit round it (render/glows.js). rangeKm: seen from within this far of the surface.
// gapS: a storm flashes this often; one to three more strokes follow close by within
// half a second. sizeKm: how wide a flash is over all (real storms light patches tens
// to hundreds of km across; widened to show from afar). liftKm: how far above the
// surface it is drawn (above the cloud layer). spread: how far apart the strokes of
// one storm fall, as a share of the radius.
export const STORMS = [
  { id: 'lightning', body: 'jupiter', rangeKm: 500000, gapS: [0.3, 1.6], sizeKm: [4000, 9000], liftKm: 150, spread: 0.04 },
  { id: 'lightning:earth', body: 'earth', rangeKm: 60000, gapS: [0.5, 2.2], sizeKm: [350, 800], liftKm: 40, spread: 0.05 },
];
export const LIGHTNING_RANGE_KM = STORMS[0].rangeKm;
export const LIGHTNING_GAP_S = STORMS[0].gapS;
// Each stroke lasts this long.
export const LIGHTNING_LIFE_S = 0.4;
export const LIGHTNING_SIZE_KM = STORMS[0].sizeKm;

// Seconds until a storm flashes again (Jupiter's when no storm is given).
export function lightningGap(rand, storm = STORMS[0]) {
  return storm.gapS[0] + rand() * (storm.gapS[1] - storm.gapS[0]);
}

// How bright a flash is `age` seconds in: two quick strokes, then an afterglow dying away.
export function lightningGlow(age) {
  if (age < 0 || age >= LIGHTNING_LIFE_S) return 0;
  if (age < 0.06) return 1;
  if (age < 0.11) return 0.25;
  if (age < 0.17) return 0.85;
  return 0.5 * (1 - (age - 0.17) / (LIGHTNING_LIFE_S - 0.17));
}

// Impact flashes on the Moon: with no air to burn up in, a meteoroid hits the ground
// as it is and gives a flash a tenth of a second long, seen from Earth through
// telescopes on the Moon's night side. Shown from within this far of the Moon.
export const IMPACT_RANGE_KM = 30000;
// One every 2 to 6 seconds, lasting 0.35 seconds (longer than life, to be noticed), a
// point of light with a glow this wide round it (the real ones are metres across).
export const IMPACT_GAP_S = [2, 6];
export const IMPACT_LIFE_S = 0.35;
export const IMPACT_SIZE_KM = [220, 480];

export function impactGap(rand) {
  return IMPACT_GAP_S[0] + rand() * (IMPACT_GAP_S[1] - IMPACT_GAP_S[0]);
}

// How bright an impact flash is `age` seconds in: full at once, then dying away fast.
export function impactGlow(age) {
  if (age < 0 || age >= IMPACT_LIFE_S) return 0;
  const t = age / IMPACT_LIFE_S;
  return (1 - t) * (1 - t);
}

// Plumes: gas and dust (Io) or ice grains (Enceladus) thrown up from the ground.
// lat/lon in degrees (east positive); heightKm: how high it reaches; widthKm: how wide
// it is at the top. Io's heights are about the real ones; the jets of Enceladus really
// reach hundreds of km, several times the moon's own 252 km radius.
export const PLUMES = [
  { id: 'pele', body: 'io', name: '펠레', latDeg: -18.7, lonDeg: 104.7, heightKm: 350, widthKm: 1100 },
  { id: 'loki', body: 'io', name: '로키', latDeg: 13, lonDeg: 51, heightKm: 200, widthKm: 500 },
  { id: 'prometheus', body: 'io', name: '프로메테우스', latDeg: -1.5, lonDeg: -153.9, heightKm: 100, widthKm: 300 },
  // Dust devils on Mars: whirlwinds that the Sun raises off the warm ground by day. The
  // real ones are up to 20 km tall and a few hundred metres across; drawn 45 km by 9.
  ...[[30, -155], [-14, -175], [22, 60], [-28, -45], [8, 110], [-40, 20]].map(([latDeg, lonDeg], i) => ({
    id: `devil${i + 1}`, body: 'mars', name: '먼지 회오리', latDeg, lonDeg, heightKm: 45, widthKm: 9,
  })),
  ...[0, 72, 144, 216, 288].map((turnDeg, i) => ({
    id: `tiger${i + 1}`, body: 'enceladus', name: '호랑이 줄무늬', latDeg: -84, lonDeg: turnDeg, heightKm: 450, widthKm: 130,
  })),
  // Triton's two plumes, seen by Voyager 2 in 1989: dark columns 8 km tall whose smoke
  // the thin wind carries more than a hundred km sideways. Drawn 70 km tall and wide at
  // the top (the cloud), dark against the bright ice.
  { id: 'hili', body: 'triton', name: '힐리', latDeg: -57, lonDeg: 28, heightKm: 70, widthKm: 150, dark: true },
  { id: 'mahilani', body: 'triton', name: '마힐라니', latDeg: -50, lonDeg: 359.4, heightKm: 70, widthKm: 180, dark: true },
];
// Io's day (it keeps one face to Jupiter), for turning its plumes with its ground:
// the same number as render/planets.js.
export const PLUME_DAY_S = { io: 152854, enceladus: 1.370218 * 86400, mars: 88643, triton: -5.876854 * 86400 };
// Plumes show from within this many radii of the body's surface.
export const PLUME_RANGE_RADII = 60;

// Unit vector from the body's centre to the plume's vent when the body has turned by
// spinRad (core/surface.js spinAngle).
export function plumeUp(plume, spinRad) {
  return surfaceDirection(plume.latDeg, plume.lonDeg, spinRad);
}

// Which of these the traveler is close enough to be told about, the nearest thing
// first: 'plume:io', 'aurora:saturn', 'clouds:earth'... (Lightning, sprites and impact
// flashes are told when one lights.) Several may be in reach at once (near Jupiter: its
// aurora and Io's footprint); the game tells them one at a time.
// (Saturn is looked at from nine radii off, to take in its rings: the spokes are told from there.)
export const TELL_RADII = { aurora: 3, plume: 12, sheet: 2, footprint: 2.5, tail: 40, spot: 5, spokes: 9 };
export const TELL_JETS_KM = 3000;
export function glowsNear(bodies, position) {
  const surfaceKm = (id) => {
    const body = bodies.find((b) => b.id === id);
    return body ? Math.hypot(...position.map((n, i) => n - body.position[i])) - body.radiusKm : Infinity;
  };
  const near = (id, radii) => surfaceKm(id) <= radii * (bodies.find((b) => b.id === id)?.radiusKm ?? 0);
  const found = [];
  for (const id of ['io', 'enceladus', 'triton']) if (near(id, TELL_RADII.plume)) found.push(`plume:${id}`);
  for (const { body } of AURORAS) if (near(body, TELL_RADII.aurora)) found.push(`aurora:${body}`);
  if (near(NIGHT_CLOUDS.body, TELL_RADII.sheet)) found.push(`clouds:${NIGHT_CLOUDS.body}`);
  if (near(FOOTPRINT.body, TELL_RADII.footprint)) found.push(`footprint:${FOOTPRINT.moon}`);
  if (near('saturn', TELL_RADII.spokes)) found.push('spokes:saturn');
  if (near('neptune', TELL_RADII.spot)) found.push('spot:neptune');
  if (near(SODIUM_TAIL.body, TELL_RADII.tail)) found.push(`tail:${SODIUM_TAIL.body}`);
  if (surfaceKm(JETS.body) <= TELL_JETS_KM) found.push(`jets:${JETS.body}`);
  return found;
}

// The first of them, or null.
export function glowNear(bodies, position) {
  return glowsNear(bodies, position)[0] ?? null;
}

// Spokes on Saturn's rings: dark smudges across the B ring, lying along the radius,
// that come and go in hours (Voyager found them; they return round Saturn's equinoxes).
// Dust lifted off the ring and carried round with Saturn's magnetic field, one turn in
// 10.6 hours. count: how many places a spoke may stand; each is there a part of the time.
// ring: where across the rings they lie (0 the inner edge of the C ring, 1 the outer
// edge of the A ring; the B ring is 0.28 to 0.69). dark: how much darker a spoke is.
export const SPOKES = { count: 9, turnS: 38362, ring: [0.34, 0.66], dark: 0.3 };
