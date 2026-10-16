import { t } from './i18n.js';
import { CRAFT_SIZE_KM } from './craft.js';
import { BELT } from './belt.js';
import { SPIN_DAY_S, spinAngle, surfaceDirection } from './surface.js';
// Things from no real mission, from books, films and a philosopher's word. They are not
// craft: nothing docks with them and the notebook does not count them; each has its tag,
// a notice and her word, and once she has been near one its tag jumps there.
//
// Near Jupiter (the user, 2026-10-16: "목성 근처에 영화 스페이스 오딧세이에 나왔던 그 우주선
// 넣으면 안 됨?"; then "까만돌 말고 대리석으로 하자" of the slab, and of the ship's name
// "spaceship unknown"): a slab of 1 : 4 : 9 floats between Jupiter and Io (where the slab
// of the book "2010" stood), and square before its sunlit face a ship with a turning wheel
// has stopped to look at it. The two show as one, named for the slab ("대표명 모노리스").
// Then three more ("1,4 그리고 달에도 모노리스 있잖아"): Russell's teapot between Earth and
// Mars, a little star with a rose in the asteroid belt (the book is not named: its name
// and drawings are held as a trademark in places), and a slab like Jupiter's standing in
// Tycho on the Moon, where the film's was dug up.
// group: the slab whose name and jump the ship shares. tellKm: how near for the notice and
// her word. shownKm: how near for its tag (the Jupiter pair: SHOWN_RADII of Jupiter).
export const CURIOS = [
  { id: 'monolith', name: t('모노리스'), nameEn: 'Monolith', kind: 'curio', tellKm: 2500 },
  { id: 'unknown', name: t('spaceship unknown'), nameEn: 'spaceship unknown', kind: 'curio', group: 'monolith' },
  { id: 'teapot', name: t('러셀의 찻주전자'), nameEn: "Russell's Teapot", kind: 'curio', tellKm: 2500, shownKm: 300000 },
  { id: 'rose', name: t('장미가 있는 작은 별'), nameEn: 'The Little Star with a Rose', kind: 'curio', tellKm: 2500, shownKm: 300000 },
  { id: 'moonSlab', name: t('달의 모노리스'), nameEn: 'Monolith on the Moon', kind: 'curio', tellKm: 800, shownKm: 20000, minKm: 8, maxKm: 40 },
];
const CURIO = Object.fromEntries(CURIOS.map((c) => [c.id, c]));
// What a close look at one reads (main.js readingFor): where it comes from, and its notice
// (ui/messages.js gives the same when she comes near).
const FROM_FILM = t('소설과 영화에서 온 것');
export const CURIO_ABOUT = {
  monolith: { kicker: FROM_FILM, text: t('목성과 이오 사이에 대리석 판 하나가 떠 있습니다. 가로, 세로, 두께가 1:4:9입니다.\n누가 왜 두었는지 아무도 모릅니다. 앞의 배도 이것을 보러 온 듯합니다.') },
  teapot: { kicker: t('철학자의 비유에서 온 것'), text: t('지구와 화성 사이에서 사기 찻주전자 하나가 태양을 돕니다.\n철학자 러셀의 비유로, 너무 작아 없다고 증명할 수 없는 것을 뜻합니다.') },
  rose: { kicker: t('책에서 온 것'), text: t('소행성대의 작은 별에 화산 셋과 바오밥 싹, 장미 한 송이가 있습니다.\n어느 책에서 읽은 별과 꼭 닮았습니다.') },
  moonSlab: { kicker: FROM_FILM, text: t('달의 티코 분화구에 목성 곁과 같은 1:4:9 대리석 판이 서 있습니다.\n소설과 영화에서는 이 판을 파내자 목성 쪽으로 신호를 보냈습니다.') },
};
// The curio whose name, notice and jump this one goes by: the ship goes by the slab.
export const curioHead = (id) => CURIO[id]?.group ?? id;
// How far along the gap from Jupiter's cloud tops to Io's ground the slab stands.
const ALONG = 0.55;
// Drawn as craft are (render/craft.js): CRAFT_SIZE_KM tall from near by, a twentieth of
// the distance from farther, at most CURIO_MAX_KM; the slab on the Moon has its own
// bounds (minKm, maxKm: a slab 30 km tall would stand over Tycho's walls).
const APPARENT = 0.05;
export const CURIO_MAX_KM = 4000;
export const curioSizeKm = (distanceKm, id = null) => Math.min(CURIO[id]?.maxKm ?? CURIO_MAX_KM, Math.max(CURIO[id]?.minKm ?? CRAFT_SIZE_KM, distanceKm * APPARENT));
// The ship stands this many of the slab's heights from it, square before its sunlit face,
// its head toward it (the user, 2026-10-16: "모노리스와 우주선은 | - 배치"; a jump to
// them looks at the two from a quarter, core/teleport.js curioArrival).
const SHIP_OFF = 1.7;
// The Jupiter pair's tags show from within this many of Jupiter's radii of its cloud tops.
const SHOWN_RADII = 8;
// The teapot goes round the Sun halfway between Earth's and Mars's distances, this far
// ahead of Earth (radians); the little star in the middle of the belt, this far behind.
const TEAPOT_LEAD = 0.6;
const ROSE_LEAD = -1.2;
// The slab on the Moon: a little north of Tycho's middle (the place's own tag stands
// there), upright on the ground.
const TYCHO_AT = { latDeg: -42.8, lonDeg: -11.36 };

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
// The point `distance` from the Sun, `lead` radians round from `from`'s direction, in
// the planets' plane (turned as core/bodies.js turns an orbit).
function round(sun, from, distance, lead) {
  const [x, , z] = from.position.map((n, i) => n - sun.position[i]);
  const c = Math.cos(lead);
  const s = Math.sin(lead);
  const turned = [x * c + z * s, 0, -x * s + z * c];
  const length = Math.hypot(...turned);
  return sun.position.map((n, i) => n + (turned[i] / length) * distance);
}

// Where they are, seen from `position` (the ship's place, and the Moon's slab's, depend
// on how big the slab is drawn from there). bodies: as core/bodies.js gives them, with
// their game time (the Moon turns under its slab).
export function curiosAt(bodies, position) {
  const at = (id) => bodies.find((b) => b.id === id);
  const sun = bodies.find((b) => b.kind === 'star');
  const [jupiter, io, earth, mars, moon] = ['jupiter', 'io', 'earth', 'mars', 'moon'].map(at);
  if (!sun || !jupiter || !io || !earth || !mars || !moon) return [];
  const out = [];
  // Along the open gap between the two surfaces (the game draws the moons close in:
  // from the middles, it stood 140 km over Jupiter's clouds).
  const apart = gap(io.position, jupiter.position);
  const along = jupiter.radiusKm + (apart - jupiter.radiusKm - io.radiusKm) * ALONG;
  const slab = jupiter.position.map((n, i) => n + ((io.position[i] - n) / apart) * along);
  const toSun = sun.position.map((n, i) => n - slab[i]);
  const far = Math.hypot(...toSun);
  const size = curioSizeKm(gap(position, slab));
  const ship = slab.map((n, i) => n + (toSun[i] / far) * size * SHIP_OFF);
  out.push({ ...CURIO.monolith, position: slab, radiusKm: CRAFT_SIZE_KM / 2 });
  // (awayFrom: render/craft.js turns its back from there, its head to the slab.)
  out.push({ ...CURIO.unknown, position: ship, radiusKm: CRAFT_SIZE_KM / 2, awayFrom: slab });
  const toEarth = gap(earth.position, sun.position);
  const toMars = gap(mars.position, sun.position);
  out.push({ ...CURIO.teapot, position: round(sun, earth, (toEarth + toMars) / 2, TEAPOT_LEAD), radiusKm: CRAFT_SIZE_KM / 2 });
  out.push({ ...CURIO.rose, position: round(sun, earth, (BELT.innerKm + BELT.outerKm) / 2, ROSE_LEAD), radiusKm: CRAFT_SIZE_KM / 2 });
  // Standing on the ground: its middle half its height up (render/curioModels.js: the
  // slab is 0.9 of its drawn size tall), its face turned up with the ground (up).
  const up = surfaceDirection(TYCHO_AT.latDeg, TYCHO_AT.lonDeg, spinAngle(SPIN_DAY_S.moon, bodies.timeS ?? 0));
  const ground = moon.position.map((n, i) => n + up[i] * moon.radiusKm);
  const tall = curioSizeKm(gap(position, ground), 'moonSlab');
  out.push({ ...CURIO.moonSlab, position: ground.map((n, i) => n + up[i] * 0.45 * tall), radiusKm: 0, up, parent: 'moon' });
  return out;
}

// The ids not to draw or name from where she is: the Jupiter pair far from Jupiter, the
// others far from themselves. The chosen target stays, and so does one she has been near
// (known: ids of the log's curios), from anywhere (the user, 2026-10-16: "한 번 찾으면, 그
// 다음부터는 멀리서도 뜨는거지?").
export function hiddenCurios(position, bodies, keepId = null, known = []) {
  const jupiter = bodies.find((b) => b.id === 'jupiter');
  if (!jupiter) return CURIOS.map((c) => c.id);
  const byJupiter = gap(position, jupiter.position) - jupiter.radiusKm <= SHOWN_RADII * jupiter.radiusKm;
  const all = curiosAt(bodies, position);
  return all.filter((c) => {
    if (c.id === keepId || known.includes(curioHead(c.id))) return false;
    if (c.id === 'monolith' || c.id === 'unknown') return !byJupiter;
    return gap(position, c.position) > c.shownKm;
  }).map((c) => c.id);
}

// Within this far of a slab, the teapot or the little star she is carried along with it,
// not with the body she is nearest (the slab by Jupiter goes round with Io and ran from
// her at 160 km a second). Not the one on the Moon: she goes with the Moon there.
export const CURIO_CARRY_KM = 5000;
export function carryingCurio(bodies, position) {
  return curiosAt(bodies, position).find((c) => !c.group && c.id !== 'moonSlab' && gap(position, c.position) <= CURIO_CARRY_KM) ?? null;
}

// The curios (by the one each goes by) near enough for her to say something of them.
export function curiosNear(bodies, position) {
  return curiosAt(bodies, position).filter((c) => !c.group && gap(position, c.position) <= c.tellKm).map((c) => c.id);
}
export const nearSlab = (bodies, position) => curiosNear(bodies, position).includes('monolith');
