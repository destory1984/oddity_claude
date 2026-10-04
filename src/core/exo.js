// A trip outside the Solar System: TRAPPIST-1, a red dwarf with seven planets about the
// size of Earth, some 40 light-years off toward Aquarius. Docked with the Kepler
// telescope (which watched it for 79 days in 2016 and 2017) the traveler can jump
// there and back. Sizes, orbits, periods and light received are the measured ones
// (Agol et al. 2021); what the planets look like is not known, and is made up.
import { AU_KM, DISTANCE_COMPRESSION, SATELLITE_COMPRESSION, compressedCenterDistance, surfaceDistance } from './bodies.js';
import { fromEquatorial } from './sky.js';
import { lookAtDirection, rotateLocal } from './orientation.js';

const DAY_S = 86400;
const EARTH_KM = 6371;
const LIGHT_YEAR_KM = 9.4607e12;
export const EXO_LIGHT_YEARS = 40.66;

export const EXO_STAR = {
  id: 'trappist1', name: '트라피스트-1', nameEn: 'TRAPPIST-1', kind: 'exostar', radiusKm: 82930,
  note: '목성보다 조금 큰 붉은 왜성입니다. 표면 온도는 약 2,300도로 태양(약 5,500도)의 절반이 안 됩니다. 지구에서 약 40광년, 물병자리 쪽에 있습니다.',
};

// radius in Earth radii, orbit in AU, period in days, light: starlight received, Earth = 1.
// turn: where on its orbit it starts (in turns), spread so the seven are not in a row.
const PLANETS = [
  { letter: 'b', radius: 1.116, orbit: 0.01154, period: 1.510826, light: 4.153, turn: 0.05,
    note: '별빛을 지구의 4.2배 받습니다. 제임스 웹 망원경이 잰 낮 쪽 온도는 약 230도였고, 두꺼운 대기는 없어 보입니다.' },
  { letter: 'c', radius: 1.097, orbit: 0.01580, period: 2.421937, light: 2.214, turn: 0.42,
    note: '별빛을 지구의 2.2배 받습니다. 웹 망원경이 잰 낮 쪽 온도는 약 110도로, 금성 같은 두꺼운 이산화탄소 대기는 없어 보입니다.' },
  { letter: 'd', radius: 0.788, orbit: 0.02227, period: 4.049219, light: 1.115, turn: 0.71,
    note: '지름은 지구의 0.79배, 질량은 0.39배로 가벼운 편입니다. 받는 빛은 지구의 1.1배로 비슷합니다.' },
  { letter: 'e', radius: 0.920, orbit: 0.02925, period: 6.101013, light: 0.646, turn: 0.18,
    note: '지름은 지구의 0.92배입니다. 받는 빛이 지구의 0.65배로, 물이 액체로 있을 수 있는 구역 안에 있습니다.' },
  { letter: 'f', radius: 1.045, orbit: 0.03849, period: 9.207540, light: 0.373, turn: 0.55,
    note: '크기가 지구와 거의 같습니다(1.05배). 받는 빛은 지구의 0.37배로 화성(0.43배)보다 조금 적습니다.' },
  { letter: 'g', radius: 1.129, orbit: 0.04683, period: 12.352446, light: 0.252, turn: 0.86,
    note: '일곱 가운데 가장 큽니다(지구의 1.13배). 받는 빛은 지구의 4분의 1입니다.' },
  { letter: 'h', radius: 0.755, orbit: 0.06189, period: 18.772866, light: 0.144, turn: 0.31,
    note: '가장 작고 가장 멉니다. 18.8일에 한 바퀴 돈다는 것은 케플러 망원경이 79일 동안 지켜보고 알아냈습니다.' },
];

export const EXO_PLANETS = PLANETS.map((p) => ({
  id: `trappist1${p.letter}`, name: `트라피스트-1 ${p.letter}`, nameEn: `TRAPPIST-1 ${p.letter}`, kind: 'exoplanet',
  radiusKm: Math.round(p.radius * EARTH_KM), orbitKm: p.orbit * AU_KM, periodS: p.period * DAY_S, light: p.light, turn: p.turn, note: p.note,
}));

export const EXO_IDS = [EXO_STAR.id, ...EXO_PLANETS.map((p) => p.id)];

const unit = (v) => { const l = Math.hypot(...v); return v.map((n) => n / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Where the star is: its real place in the sky (23h 06m 29s, -5° 02′), at its real
// distance squeezed like every distance from the Sun. The Sun is the origin.
const TO_STAR = unit(fromEquatorial(23.108, -5.04));
export const EXO_CENTRE = Object.freeze(TO_STAR.map((n) => n * ((EXO_LIGHT_YEARS * LIGHT_YEAR_KM) / DISTANCE_COMPRESSION)));

// The planets' plane holds the line to the Sun: seen from home they pass in front of
// their star, which is how they were found.
const HOME = TO_STAR.map((n) => -n);
const ACROSS = unit(cross(HOME, [0, 1, 0]));
export const EXO_NORMAL = unit(cross(HOME, ACROSS));

// How far a planet is drawn from the star's middle. The seven are packed like moons
// round a planet (b is 1.7 million km out), so their distances are squeezed like a
// moon's, by ten: by a hundred, b and c would overlap.
export function exoOrbitKm(planet) {
  return compressedCenterDistance(planet.orbitKm, EXO_STAR.radiusKm, planet.radiusKm, SATELLITE_COMPRESSION);
}

// The star and its seven planets at game time timeS, as bodies (core/bodies.js) with
// exo: true and, for the planets, star: the id of what lights them.
export function exoBodiesAt(timeS = 0) {
  const { note: _, ...star } = EXO_STAR;
  const out = [Object.freeze({ ...star, parent: null, position: EXO_CENTRE, exo: true })];
  for (const p of EXO_PLANETS) {
    const angle = 2 * Math.PI * (p.turn + timeS / p.periodS);
    const km = exoOrbitKm(p);
    const position = EXO_CENTRE.map((n, i) => n + km * (HOME[i] * Math.cos(angle) + ACROSS[i] * Math.sin(angle)));
    out.push(Object.freeze({
      id: p.id, name: p.name, nameEn: p.nameEn, kind: p.kind, radiusKm: p.radiusKm, parent: EXO_STAR.id,
      position: Object.freeze(position), exo: true, star: EXO_STAR.id,
    }));
  }
  return out;
}

// Within this of the star she is "there": the way home is offered.
export const EXO_REACH_KM = 5e6;

export function inExo(position) {
  return Math.hypot(...position.map((n, i) => n - EXO_CENTRE[i])) <= EXO_REACH_KM;
}

// Where the jump from Kepler arrives: outside the last planet's orbit and 35 degrees
// above the planets' plane, on the Sun's side, facing the star, so the seven are spread
// out before her.
export const EXO_ARRIVAL_KM = 1.6e6;
const ARRIVAL_RISE = (35 * Math.PI) / 180;
const ARRIVAL_TIP = 0.15;

export function exoArrival() {
  const out = HOME.map((n, i) => n * Math.cos(ARRIVAL_RISE) + EXO_NORMAL[i] * Math.sin(ARRIVAL_RISE));
  const position = EXO_CENTRE.map((n, i) => n + out[i] * EXO_ARRIVAL_KM);
  // She stands in the middle of the view: it is tipped a little so the star is over her head.
  return { position, orientation: rotateLocal(lookAtDirection(out.map((n) => -n)), 0, ARRIVAL_TIP) };
}

// The planets seen from close by (as near as a body is discovered from, core/progress.js).
export const EXO_SEEN_KM = 50000;

export function createExoRecord() {
  return { been: false, seen: [] };
}

// Stored data may be old or edited: keep only what is known.
export function sanitizeExo(raw) {
  if (!raw || typeof raw !== 'object') return createExoRecord();
  const known = new Set(EXO_PLANETS.map((p) => p.id));
  const seen = Array.isArray(raw.seen) ? [...new Set(raw.seen.filter((id) => known.has(id)))] : [];
  return { been: raw.been === true || seen.length > 0, seen };
}

// The planets newly come close to. bodies: where everything is now (exoBodiesAt).
export function recordExo(record, position, bodies) {
  const newly = bodies
    .filter((b) => b.kind === 'exoplanet' && !record.seen.includes(b.id) && surfaceDistance(position, b) <= EXO_SEEN_KM)
    .map((b) => b.id);
  if (!newly.length) return { record, newly };
  return { record: { ...record, been: true, seen: [...record.seen, ...newly] }, newly };
}

export function exoNote(id) {
  return id === EXO_STAR.id ? EXO_STAR.note : EXO_PLANETS.find((p) => p.id === id)?.note ?? null;
}
