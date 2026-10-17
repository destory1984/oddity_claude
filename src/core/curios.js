import { t } from './i18n.js';
import { CRAFT_SIZE_KM } from './craft.js';
import { BELT } from './belt.js';
import { spinOf, surfaceDirection } from './surface.js';
import { craftAt } from './craft.js';
import { fromEquatorial } from './sky.js';
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
  // Seven more (the user, 2026-10-16: "1,2" of our own old tales, then "1, 2, 3, 7, 4" of
  // ones that only hint at a recent film or book, or are real).
  { id: 'moonRabbit', name: t('옥토끼와 계수나무'), nameEn: 'The Moon Rabbit', kind: 'curio', tellKm: 800, shownKm: 20000, minKm: 8, maxKm: 40 },
  { id: 'magpieBridge', name: t('오작교'), nameEn: 'The Magpie Bridge', kind: 'curio', sky: true },
  { id: 'whale', name: t('고래와 피튜니아 화분'), nameEn: 'A Whale and a Bowl of Petunias', kind: 'curio', tellKm: 2500, shownKm: 300000 },
  { id: 'ringStation', name: t('바퀴 정거장과 구멍'), nameEn: 'The Wheel Station and the Hole', kind: 'curio', tellKm: 3000, shownKm: 300000 },
  { id: 'potatoFarm', name: t('화성의 감자밭'), nameEn: 'The Potato Farm on Mars', kind: 'curio', tellKm: 800, shownKm: 20000, minKm: 8, maxKm: 40 },
  { id: 'goldenRecord', name: t('보이저의 금빛 음반'), nameEn: "Voyager's Golden Record", kind: 'curio', tellKm: 2500, shownKm: 300000 },
  { id: 'robot', name: t('명왕성의 작은 로봇'), nameEn: 'The Little Robot on Pluto', kind: 'curio', tellKm: 800, shownKm: 20000, minKm: 8, maxKm: 40 },
];
// Those standing on a world's ground (upright, turned with it): where.
const GROUND = {
  // A little north of Tycho's middle (the place's own tag stands there).
  moonSlab: { body: 'moon', latDeg: -42.8, lonDeg: -11.36 },
  // In the Sea of Serenity, the dark patch of the rabbit's body as seen from Korea.
  moonRabbit: { body: 'moon', latDeg: 28, lonDeg: 17.5 },
  // Acidalia Planitia, where the novel's crew landed.
  potatoFarm: { body: 'mars', latDeg: 31.2, lonDeg: -28.5 },
  // Out on the plains west of the heart.
  robot: { body: 'pluto', latDeg: 12, lonDeg: 120 },
};
// Where one standing on the ground is, or null: she can go down and stand beside it, as
// beside a story place (main.js standBeside; the user, 2026-10-17, of the potato farm:
// "도킹 안 됨?", then "해바바").
export const groundSpot = (id) => GROUND[id] ?? null;
// The Magpie Bridge stands in the sky between Vega (the weaver) and Altair (the herdsman)
// on Chilseok, the seventh day of the seventh lunar month, alone: these days (read off a
// lunar calendar on 2026-10-16). Drawn this far off, as the stars are, spanning the two.
const CHILSEOK = ['2026-08-19', '2027-08-08', '2028-08-26', '2029-08-16', '2030-08-05'];
const VEGA = fromEquatorial(18.616, 38.78);
const ALTAIR = fromEquatorial(19.846, 8.87);
const SKY_KM = 2e8;
// How wide the bridge is drawn: the two stars' distance apart, seen from SKY_KM.
export const BRIDGE_KM = SKY_KM * Math.hypot(...VEGA.map((n, i) => n - ALTAIR[i]));
// The day of the game (main.js sets it from when it was opened).
let today = new Date();
export function setCurioDay(date) {
  today = date;
}
const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const isChilseok = (date = today) => CHILSEOK.includes(dayKey(date));
// The next Chilseok from `date`, as YYYY-MM-DD, or null past the table.
export const nextChilseok = (date = today) => CHILSEOK.find((d) => d >= dayKey(date)) ?? null;
const CURIO = Object.fromEntries(CURIOS.map((c) => [c.id, c]));
// What a close look at one reads (main.js readingFor): where it comes from, and its notice
// (ui/messages.js gives the same when she comes near).
const FROM_FILM = t('소설과 영화에서 온 것');
export const CURIO_ABOUT = {
  monolith: { kicker: FROM_FILM, text: t('목성과 이오 사이에 대리석 판 하나가 떠 있습니다. 가로, 세로, 두께가 1:4:9입니다.\n누가 왜 두었는지 아무도 모릅니다. 앞의 우주선도 이것을 보러 온 듯합니다.') },
  teapot: { kicker: t('철학자의 비유에서 온 것'), text: t('지구와 화성 사이에서 사기 찻주전자 하나가 태양을 돕니다.\n철학자 러셀의 비유로, 너무 작아 없다고 증명할 수 없는 것을 뜻합니다.') },
  rose: { kicker: t('책에서 온 것'), text: t('소행성대의 작은 별에 화산 셋과 바오밥 싹, 장미 한 송이가 있습니다.\n어느 책에서 읽은 별과 꼭 닮았습니다.') },
  moonSlab: { kicker: FROM_FILM, text: t('달의 티코 분화구에 목성 곁과 같은 1:4:9 대리석 판이 서 있습니다.\n소설과 영화에서는 이 판을 파내자 목성 쪽으로 신호를 보냈습니다.') },
  moonRabbit: { kicker: t('옛이야기에서 온 것'), text: t('달 앞면 맑음의 바다에서 옥토끼가 계수나무 아래 방아를 찧습니다.\n옛사람들은 보름달의 어두운 무늬를 보고 이 모습을 떠올렸습니다.') },
  magpieBridge: { kicker: t('옛이야기에서 온 것'), text: t('칠석날 밤, 까치와 까마귀가 은하수에 다리를 놓았습니다.\n견우성과 직녀성이 일 년에 한 번 이 다리에서 만납니다.') },
  whale: { kicker: t('소설에서 온 것'), text: t('지구보다 42도 앞선 자리에 향유고래 한 마리와 피튜니아 화분 하나가 떠 있습니다.\n어느 우스운 소설에서는 둘이 갑자기 하늘에 나타나 떨어졌습니다.') },
  ringStation: { kicker: t('영화에서 온 것'), text: t('토성 곁에서 바퀴 모양 우주정거장이 돌고, 그 옆에 빛이 휘어 보이는 둥근 구멍이 있습니다.\n어느 영화에서는 이 구멍을 지나 먼 은하로 건너갔습니다.') },
  potatoFarm: { kicker: FROM_FILM, text: t('화성 아키달리아 평원에 둥근 집 하나가 서 있고, 그 안에서 감자 싹이 줄지어 자랍니다.\n어느 이야기에서는 홀로 남은 사람이 이렇게 감자를 키워 살아남았습니다.') },
  goldenRecord: { kicker: t('실제로 실려 간 것'), text: t('보이저 1호에는 지구의 소리와 그림을 담은 금빛 음반이 실려 있습니다.\n55개 언어의 인사가 들어 있고, 한국어로는 "안녕하세요"라고 인사합니다.') },
  robot: { kicker: t('만화 영화에서 온 것'), text: t('명왕성 땅 위에서 작은 로봇 하나가 쓰레기를 네모나게 뭉쳐 탑을 쌓고 있습니다.\n어느 만화 영화 속 로봇과 닮았지만, 여기 있는 건 이 녀석뿐입니다.') },
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
// The whale goes round the Sun with Earth, 42 degrees ahead of it (the number of a funny
// book); the wheel station stands this many of Saturn's radii from it, square to the
// line to the Sun and a little above its rings, with the hole beside it; the golden
// record floats this far from Voyager 1, sunward.
const WHALE_LEAD = (42 * Math.PI) / 180;
const STATION_RADII = 6;
const RECORD_KM = 120;

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
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
  out.push({ ...CURIO.whale, position: round(sun, earth, toEarth, WHALE_LEAD), radiusKm: CRAFT_SIZE_KM / 2 });
  const saturn = at('saturn');
  if (saturn) {
    const toLight = unit(sun.position.map((n, i) => n - saturn.position[i]));
    const side = unit([-toLight[2], 0.25, toLight[0]]);
    out.push({ ...CURIO.ringStation, position: saturn.position.map((n, i) => n + side[i] * STATION_RADII * saturn.radiusKm), radiusKm: CRAFT_SIZE_KM / 2 });
  }
  const voyager = craftAt(bodies.timeS ?? 0, bodies).find((c) => c.id === 'voyager1');
  if (voyager) {
    const back = unit(sun.position.map((n, i) => n - voyager.position[i]));
    out.push({ ...CURIO.goldenRecord, position: voyager.position.map((n, i) => n + back[i] * RECORD_KM), radiusKm: CRAFT_SIZE_KM / 2 });
  }
  // Standing on the ground: its middle half its height up (render/curioModels.js: the
  // slab is 0.9 of its drawn size tall, the others stand as high), its face turned up
  // with the ground (up).
  for (const [id, spot] of Object.entries(GROUND)) {
    const world = at(spot.body);
    if (!world) continue;
    const up = surfaceDirection(spot.latDeg, spot.lonDeg, spinOf(spot.body, bodies.timeS ?? 0));
    const ground = world.position.map((n, i) => n + up[i] * world.radiusKm);
    const tall = curioSizeKm(gap(position, ground), id);
    out.push({ ...CURIO[id], position: ground.map((n, i) => n + up[i] * 0.45 * tall), radiusKm: 0, up, parent: spot.body });
  }
  // In the sky, as the stars are: always SKY_KM off whichever way she looks from. facing:
  // its +z away from her, +y square to the line from Altair to Vega (render/craft.js).
  const mid = unit(VEGA.map((n, i) => n + ALTAIR[i]));
  const span = unit(VEGA.map((n, i) => n - ALTAIR[i]));
  const lift = unit(cross(mid, span));
  out.push({ ...CURIO.magpieBridge, position: position.map((n, i) => n + mid[i] * SKY_KM), radiusKm: 0, facing: { forward: mid, up: lift } });
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
    // (The bridge is up on Chilseok alone, wherever she is.)
    if (c.sky) return !isChilseok();
    if (c.id === keepId || known.includes(curioHead(c.id))) return false;
    if (c.id === 'monolith' || c.id === 'unknown') return !byJupiter;
    return gap(position, c.position) > c.shownKm;
  }).map((c) => c.id);
}

// Within this far of one that goes round on its own (the slab by Jupiter, the teapot...)
// she is carried along with it, not with the body she is nearest (the slab by Jupiter
// goes round with Io and ran from her at 160 km a second). Not one on the ground: she
// goes with its world there; nor the bridge in the sky.
export const CURIO_CARRY_KM = 5000;
export function carryingCurio(bodies, position) {
  return curiosAt(bodies, position).find((c) => !c.group && !c.up && !c.sky && gap(position, c.position) <= CURIO_CARRY_KM) ?? null;
}

// The curios (by the one each goes by) near enough for her to say something of them.
export function curiosNear(bodies, position) {
  // (The bridge, on its day, from anywhere.)
  return curiosAt(bodies, position).filter((c) => !c.group && (c.sky ? isChilseok() : gap(position, c.position) <= c.tellKm)).map((c) => c.id);
}
export const nearSlab = (bodies, position) => curiosNear(bodies, position).includes('monolith');
