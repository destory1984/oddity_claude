// Lights and plumes on the worlds: aurora rings round the poles of Earth and Jupiter,
// lightning on Jupiter's night side, volcanic plumes on Io, ice jets at the south pole
// of Enceladus. Decided here; drawn by render/glows.js.
import { surfaceDirection } from './surface.js';

const RAD = Math.PI / 180;

// A curtain round each pole at this latitude, from baseKm up to baseKm + heightKm.
// Real aurora is 100 to 400 km up on Earth and far fainter: the height and brightness
// are raised so it shows from orbit. Shown from within rangeRadii of the surface.
export const AURORAS = [
  { body: 'earth', latDeg: 67, baseKm: 100, heightKm: 700, low: [0.2, 1, 0.45], high: [0.75, 0.25, 0.9], rangeRadii: 6 },
  { body: 'jupiter', latDeg: 76, baseKm: 300, heightKm: 4000, low: [0.45, 0.55, 1], high: [0.8, 0.4, 1], rangeRadii: 6 },
];

// The curtain as a cone-shaped band about the spin axis (y): radius and height above
// the equator plane at its foot and at its top, in km. north: true for the north pole.
export function auroraBand(aurora, radiusKm, north = true) {
  const lat = aurora.latDeg * RAD;
  const sign = north ? 1 : -1;
  const at = (km) => ({ radiusKm: (radiusKm + km) * Math.cos(lat), yKm: sign * (radiusKm + km) * Math.sin(lat) });
  return { foot: at(aurora.baseKm), top: at(aurora.baseKm + aurora.heightKm) };
}

// Lightning in Jupiter's clouds: seen on the night side from within this far.
export const LIGHTNING_RANGE_KM = 500000;
// A storm flashes every 0.3 to 1.6 seconds, each stroke 0.4 seconds long: a forked
// channel and the cloud lit round it, this wide over all (real storms light patches
// hundreds of km across; widened to show from afar). One to three more strokes follow
// close by within half a second (render/glows.js).
export const LIGHTNING_GAP_S = [0.3, 1.6];
export const LIGHTNING_LIFE_S = 0.4;
export const LIGHTNING_SIZE_KM = [4000, 9000];

export function lightningGap(rand) {
  return LIGHTNING_GAP_S[0] + rand() * (LIGHTNING_GAP_S[1] - LIGHTNING_GAP_S[0]);
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
  ...[0, 72, 144, 216, 288].map((turnDeg, i) => ({
    id: `tiger${i + 1}`, body: 'enceladus', name: '호랑이 줄무늬', latDeg: -84, lonDeg: turnDeg, heightKm: 450, widthKm: 130,
  })),
];
// Io's day (it keeps one face to Jupiter), for turning its plumes with its ground:
// the same number as render/planets.js.
export const PLUME_DAY_S = { io: 152854, enceladus: 1.370218 * 86400 };
// Plumes show from within this many radii of the body's surface.
export const PLUME_RANGE_RADII = 60;

// Unit vector from the body's centre to the plume's vent when the body has turned by
// spinRad (core/surface.js spinAngle).
export function plumeUp(plume, spinRad) {
  return surfaceDirection(plume.latDeg, plume.lonDeg, spinRad);
}

// Which of these the traveler is close enough to be told about, or null:
// 'aurora:earth', 'aurora:jupiter', 'plume:io', 'plume:enceladus'. (Lightning is told
// when a flash lights.) surfaceKm: distance to that body's surface.
export const TELL_RADII = { aurora: 3, plume: 12 };
export function glowNear(bodies, position) {
  const near = (id, radii) => {
    const body = bodies.find((b) => b.id === id);
    if (!body) return false;
    return Math.hypot(...position.map((n, i) => n - body.position[i])) - body.radiusKm <= radii * body.radiusKm;
  };
  for (const id of ['io', 'enceladus']) if (near(id, TELL_RADII.plume)) return `plume:${id}`;
  for (const { body } of AURORAS) if (near(body, TELL_RADII.aurora)) return `aurora:${body}`;
  return null;
}
