// 우주 관광 추천코스, in the journal's flight tab: a press jumps her to the start of a round
// and the orbit lock carries her round by itself, until a key is pressed (the user,
// 2026-11-02: "지금 내가 돌고 있는 비행 경로도 되게 좋거든.. 이런걸 얘기하는거야", "1번은 지금 내가
// 돌고 있는 궤도", "우주 관광 추천코스라는 이름으로 메뉴에 만들고"). The rest are what amateur
// astronomers' lists name most often (Sky at Night's hundred, Astronomy Trek's ten,
// Astronomy's and New Atlas's beginners' lists, counted 2026-11-02), those the game draws.
// M33 goes with M31, 15 degrees from it; the Crab and Ring nebulae are not in the game.
//
// body: what she goes round. lapS: a round in seconds. A round is kept in one of four ways:
//   sun: from and toward, in the directions of core/startSpots.js, measured to the Sun;
//   sky: a thing of the fixed sky stands overDeg above the plane of the round, so that it
//     keeps passing over the body; 'milkyWay': the plane is the galaxy's and the band runs
//     behind the body all the way round;
//   rings: inclined overDeg to the rings, starting roundDeg from the Sun's side.
//   rail: round a stretch of the aurora over the night side, which no lock can do: the
//     lock goes round a body, and the ring shows on the night side only (the user,
//     2026-11-02: "오로라만 집중적으로 보는 곳으로", "이건 맴돌기가 아니네..."). atKm: how high the
//     point she looks at stands, in the curtain (100 to 1,500 km up); highKm: how high she
//     flies; rangeKm: how far off she goes round it, through the curtain twice a lap;
//     startS: how far into a lap it starts, where the curtains stand thickest.
// rollDeg: the view turned, for a band that lies across a tall screen.
import { orientationFrom, right, up } from './orientation.js';
import { GALACTIC_CENTRE, GALACTIC_POLE, GALAXIES, NEBULAE, fromEquatorial } from './sky.js';
import { outOf, sunFrame } from './startSpots.js';
import { t } from './i18n.js';

export const COURSES = [
  { id: 'auroraDrift', body: 'earth', lapS: 120, rail: { latDeg: 67, startS: 75, atKm: 800, sunwardKm: 470, highKm: 400, rangeKm: 1500 }, name: t('오로라 유영'), todo: t('밤쪽 오로라 한 곳을 가까이에서 맴돌며 빛의 커튼 사이를 지나갑니다.') },
  // At the height of the round the user flew; its plane leans to the line of day and night,
  // for the Sun in view puts out the rest (the user, 2026-11-02: "태양이 안 보였으면 좋겠어").
  { id: 'earthRound', body: 'earth', lapS: 120, radii: 4.31, name: t('지구 한 바퀴'), todo: t('지구 둘레를 두 분에 한 바퀴 돕니다. 낮과 밤, 오로라가 차례로 지나갑니다.'),
    sun: { from: [0.5, 0, -0.87], toward: [0, 1, 0] } },
  { id: 'milkyWay', body: 'earth', lapS: 180, radii: 8, rollDeg: 35, sky: 'milkyWay', name: t('은하수 일주'), todo: t('은하수가 놓인 평면을 따라 지구를 돕니다. 은하 중심에서 출발합니다.') },
  { id: 'orion', body: 'earth', lapS: 150, radii: 6, sky: 'm42', overDeg: 16, name: t('오리온 대성운'), todo: t('지구를 돌면서 겨울 밤하늘의 붉은 성운을 봅니다.') },
  { id: 'andromeda', body: 'moon', lapS: 150, radii: 7, sky: 'm31', overDeg: 16, name: t('안드로메다은하'), todo: t('달을 돌면서 안드로메다은하와 곁의 삼각형자리 은하를 봅니다.') },
  { id: 'pleiades', body: 'earth', lapS: 150, radii: 6, sky: 'm45', overDeg: 16, name: t('플레이아데스'), todo: t('지구를 돌면서 일곱 자매 별무리를 봅니다.') },
  { id: 'moonLow', body: 'moon', lapS: 120, radii: 1.25, name: t('달 저공비행'), todo: t('달의 땅 위를 낮게 돌며 크레이터를 내려다봅니다.'),
    sun: { from: [0.6, 0.35, 0.7], toward: [-0.7, 0, 0.6] } },
  { id: 'jupiterMoons', body: 'jupiter', lapS: 180, radii: 5, name: t('목성과 위성들'), todo: t('목성을 돌면서 구름 띠와 안쪽 위성들을 봅니다.'),
    sun: { from: [0.7, 0.1, 0.7], toward: [-0.7, 0.1, 0.7] } },
  { id: 'saturnRings', body: 'saturn', lapS: 180, radii: 4.6, name: t('토성의 고리'), todo: t('고리 위로 비스듬히 토성을 돕니다. 고리에 드리운 그림자가 보입니다.'),
    rings: { overDeg: 16, roundDeg: 30 } },
  { id: 'redMars', body: 'mars', lapS: 120, radii: 4, name: t('붉은 화성'), todo: t('화성의 두 극 위로 돌면서 낮과 밤의 경계를 지나갑니다.'),
    sun: { from: [0.8, 0.1, 0.6], toward: [-0.1, 0.95, 0.2] } },
  { id: 'venusPhases', body: 'venus', lapS: 120, radii: 5.5, name: t('금성의 위상'), todo: t('금성을 돌면서 둥근 모습이 초승달처럼 변하는 것을 봅니다.'),
    sun: { from: [1, 0.05, 0], toward: [0, 0, 1] } },
  { id: 'coronaDrift', body: 'sun', lapS: 180, radii: 4.5, rollDeg: 35, sky: 'milkyWay', name: t('태양 코로나 유영'), todo: t('태양 가까이에서 코로나를 따라 돕니다. 뒤로 은하수가 흐릅니다.') },
  { id: 'magellan', body: 'moon', lapS: 150, radii: 7, sky: 'lmc', overDeg: 14, name: t('마젤란은하'), todo: t('달을 돌면서 남쪽 하늘의 큰 은하와 작은 은하를 봅니다.') },
];

export const courseById = (id) => COURSES.find((course) => course.id === id) ?? null;

const rad = (deg) => (deg * Math.PI) / 180;
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
};
const mix = (a, u, b, v) => u.map((n, i) => a * n + b * v[i]);
const squareTo = (v, n) => unit(mix(1, v, -dot(v, n), n));

// How far she looks under the body, so that it stands over her head and not behind her.
const DIP = 0.14;

// The direction of a thing of the fixed sky.
function skyWay(id) {
  const thing = [...GALAXIES, ...NEBULAE].find((x) => x.id === id);
  return fromEquatorial(thing.raH, thing.decDeg);
}

// The round: `from` the body's centre to where it starts, and `along` the way it goes.
function roundOf(course, frame, ringNormal) {
  if (course.sun) {
    const from = unit(outOf(frame, course.sun.from));
    return { from, along: squareTo(outOf(frame, course.sun.toward), from) };
  }
  if (course.rings) {
    const { overDeg, roundDeg } = course.rings;
    const sunSide = squareTo(frame.toSun, ringNormal);
    const flat = mix(Math.cos(rad(roundDeg)), sunSide, Math.sin(rad(roundDeg)), cross(ringNormal, sunSide));
    return { from: mix(Math.cos(rad(overDeg)), flat, Math.sin(rad(overDeg)), ringNormal), along: unit(cross(ringNormal, flat)) };
  }
  const galaxy = course.sky === 'milkyWay';
  const thing = galaxy ? GALACTIC_CENTRE : skyWay(course.sky);
  const flat = squareTo(galaxy ? GALACTIC_POLE : [0, 1, 0], thing);
  const over = rad(course.overDeg ?? 0);
  const looking = mix(Math.cos(over), thing, -Math.sin(over), flat);
  const normal = mix(Math.sin(over), thing, Math.cos(over), flat);
  const from = looking.map((n) => -n);
  return { from, along: cross(normal, from) };
}

// Where a rail has her after `seconds`, looking at the point it goes round.
export function railAt(course, body, sun, seconds) {
  // (Over midnight, Earth a strip at the foot of the view (the user, 2026-11-02: "지구가 조금
  // 보여야해"); facing the Sun the view rises by sunwardKm, for the Sun, drawn large, stands
  // on the horizon there, and in view it puts out the aurora and the stars. The user, 2026-11-02: "태양은 안 나와야해... 다 없어지네".)
  const { latDeg, atKm, sunwardKm, highKm, rangeKm } = course.rail;
  const away = unit([body.position[0] - sun.position[0], 0, body.position[2] - sun.position[2]]);
  const over = mix(Math.cos(rad(latDeg)), away, Math.sin(rad(latDeg)), [0, 1, 0]);
  const east = unit(cross(over, [0, 1, 0]));
  const north = cross(over, east);
  const turn = (2 * Math.PI * seconds) / course.lapS;
  const aside = mix(Math.cos(turn), east, Math.sin(turn), north);
  const position = body.position.map((n, i) => n + over[i] * (body.radiusKm + highKm) + aside[i] * rangeKm);
  const facingSun = Math.max(0, dot(aside, away));
  const point = body.position.map((n, i) => n + over[i] * (body.radiusKm + atKm + sunwardKm * facingSun));
  return { position, orientation: orientationFrom(point.map((n, i) => n - position[i]), over) };
}

// Where a round starts and the slide that carries her along it, with the bodies where
// they are now. ringNormal: of the body, for a round kept to its rings.
export function courseStart(course, body, sun, ringNormal = null) {
  if (course.rail) return { ...railAt(course, body, sun, course.rail.startS), slide: {} };
  const frame = sunFrame(body.position, sun.position);
  const { from, along } = roundOf(course, frame, ringNormal);
  const km = course.radii * body.radiusKm;
  const looking = from.map((n) => -n);
  const normal = cross(from, along);
  const roll = rad(course.rollDeg ?? 0);
  const above = mix(Math.cos(roll), normal, Math.sin(roll), cross(looking, normal));
  const stand = {
    position: body.position.map((n, i) => n + from[i] * km),
    orientation: orientationFrom(mix(Math.cos(DIP), looking, -Math.sin(DIP), above), above),
  };
  const speed = (2 * Math.PI * km) / course.lapS;
  const side = dot(along, right(stand.orientation)) * speed;
  const rise = dot(along, up(stand.orientation)) * speed;
  return { ...stand, slide: { sideSpeed: Math.abs(side), sideSign: side < 0 ? -1 : 1, riseSpeed: Math.abs(rise), riseSign: rise < 0 ? -1 : 1 } };
}
