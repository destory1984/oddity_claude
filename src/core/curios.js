import { t } from './i18n.js';
import { CRAFT_SIZE_KM } from './craft.js';
// Two things from no real mission, near Jupiter (the user, 2026-10-16: "목성 근처에 영화
// 스페이스 오딧세이에 나왔던 그 우주선 넣으면 안 됨?"; then "까만돌 말고 대리석으로 하자" of the
// slab, and of the ship's name "spaceship unknown"). A slab of 1 : 4 : 9 floats between
// Jupiter and Io (where the slab of the book "2010" stood), and on its Sun's side a ship
// with a turning wheel has stopped to look at it. They are not craft: nothing docks with
// them and the notebook does not count them; they have their tags, a notice and her word.
export const CURIOS = [
  { id: 'monolith', name: t('모노리스'), nameEn: 'Monolith', kind: 'curio' },
  { id: 'unknown', name: t('spaceship unknown'), nameEn: 'spaceship unknown', kind: 'curio' },
];
// How far along the gap from Jupiter's cloud tops to Io's ground the slab stands.
const ALONG = 0.55;
// Drawn as craft are (render/craft.js): CRAFT_SIZE_KM tall from near by, a twentieth of
// the distance from farther, at most CURIO_MAX_KM.
const APPARENT = 0.05;
export const CURIO_MAX_KM = 4000;
export const curioSizeKm = (distanceKm) => Math.min(CURIO_MAX_KM, Math.max(CRAFT_SIZE_KM, distanceKm * APPARENT));
// The ship stands this many of the slab's heights from it, before its sunlit face but
// SHIP_ASIDE off the line to the Sun, its head toward the slab: on that line it hid the
// slab from anyone who came from the Sun's side (the user, 2026-10-16: "너무 정면에
// 배치했네. 45도 쿼터뷰로 배치해").
const SHIP_OFF = 1.7;
const SHIP_ASIDE = Math.PI / 4;
// Their tags show from within this many of Jupiter's radii of its cloud tops.
const SHOWN_RADII = 8;

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));

// Where the two are, seen from `position` (the ship's place depends on how big the slab
// is drawn from there, so that the two keep apart as they do on screen).
export function curiosAt(bodies, position) {
  const jupiter = bodies.find((b) => b.id === 'jupiter');
  const io = bodies.find((b) => b.id === 'io');
  const sun = bodies.find((b) => b.kind === 'star');
  if (!jupiter || !io || !sun) return [];
  // Along the open gap between the two surfaces (the game draws the moons close in:
  // from the middles, it stood 140 km over Jupiter's clouds).
  const apart = gap(io.position, jupiter.position);
  const out = jupiter.radiusKm + (apart - jupiter.radiusKm - io.radiusKm) * ALONG;
  const slab = jupiter.position.map((n, i) => n + ((io.position[i] - n) / apart) * out);
  const toSun = sun.position.map((n, i) => n - slab[i]);
  const far = Math.hypot(...toSun);
  const size = curioSizeKm(gap(position, slab));
  // Level and square to the line to the Sun.
  const level = [-toSun[2], 0, toSun[0]];
  const flat = Math.hypot(...level) || 1;
  const aside = toSun.map((n, i) => (n / far) * Math.cos(SHIP_ASIDE) + (level[i] / flat) * Math.sin(SHIP_ASIDE));
  const ship = slab.map((n, i) => n + aside[i] * size * SHIP_OFF);
  return [
    { ...CURIOS[0], position: slab, radiusKm: CRAFT_SIZE_KM / 2 },
    // (awayFrom: render/craft.js turns its back from there, its head to the slab.)
    { ...CURIOS[1], position: ship, radiusKm: CRAFT_SIZE_KM / 2, awayFrom: slab },
  ];
}

// The ids not to draw or name from where she is: both, when far from Jupiter (the chosen
// target stays).
export function hiddenCurios(position, bodies, keepId = null) {
  const jupiter = bodies.find((b) => b.id === 'jupiter');
  if (!jupiter) return CURIOS.map((c) => c.id);
  const above = gap(position, jupiter.position) - jupiter.radiusKm;
  return above > SHOWN_RADII * jupiter.radiusKm ? CURIOS.map((c) => c.id).filter((id) => id !== keepId) : [];
}

// Within this far of the slab she is carried along with it, not with Jupiter.
export const CURIO_CARRY_KM = 5000;

// Near enough to the slab for her to say something about it.
export const CURIO_TELL_KM = 2500;
export function nearSlab(bodies, position) {
  const [slab] = curiosAt(bodies, position);
  return Boolean(slab) && gap(position, slab.position) <= CURIO_TELL_KM;
}
