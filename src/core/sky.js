// The fixed sky: nearby galaxies, twenty constellations and a few famous stars,
// placed by their real coordinates (right ascension in hours, declination in degrees).
// Nothing here can be visited; it is the backdrop.

import { CONSTELLATIONS } from './constellations.js';
import { t } from './i18n.js';

const rad = (deg) => (deg * Math.PI) / 180;
const OBLIQUITY = rad(23.44);

// Equatorial coordinates (the sky as mapped from Earth's poles) to a unit vector in the
// game's axes: x and z span the planets' plane, y is north of it.
export function fromEquatorial(raH, decDeg) {
  const ra = rad(raH * 15);
  const dec = rad(decDeg);
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  return [x, -y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY), y * Math.cos(OBLIQUITY) + z * Math.sin(OBLIQUITY)];
}

// sizeDeg: real half-length on the sky; ratio: short axis over long; paDeg: position
// angle of the long axis; light: brightness; irregular: 1 for the Magellanic Clouds.
export const GALAXIES = [
  { id: 'm31', name: t('안드로메다은하'), note: t('250만 광년. 맨눈으로 보이는 가장 먼 것'), raH: 0.712, decDeg: 41.27, paDeg: 35, sizeDeg: 1.5, ratio: 0.32, light: 0.5, irregular: 0 },
  { id: 'm33', name: t('삼각형자리은하'), note: t('270만 광년. 아주 어두운 밤에만 보인다'), raH: 1.564, decDeg: 30.66, paDeg: 23, sizeDeg: 0.55, ratio: 0.6, light: 0.3, irregular: 0 },
  { id: 'lmc', name: t('대마젤란은하'), note: t('16만 광년. 우리 은하 곁을 도는 작은 은하'), raH: 5.393, decDeg: -69.75, paDeg: 170, sizeDeg: 4.5, ratio: 0.85, light: 0.42, irregular: 1 },
  { id: 'smc', name: t('소마젤란은하'), note: t('20만 광년. 남쪽 하늘의 흐린 구름 조각'), raH: 0.878, decDeg: -72.83, paDeg: 45, sizeDeg: 2.2, ratio: 0.6, light: 0.36, irregular: 1 },
];

// Glowing gas clouds and star clusters, the showpieces of the night sky. kind: 0 a
// nebula (pink hydrogen light), 1 an open cluster (young blue stars in a haze), 2 a
// globular cluster (a ball of old stars). sizeDeg: real half-width; light: brightness.
// Drawn larger than life like the galaxies (render/stars.js).
export const NEBULAE = [
  { id: 'm42', name: t('오리온 대성운'), note: t('1,340광년. 별이 태어나는 가스 구름'), raH: 5.588, decDeg: -5.39, sizeDeg: 0.6, light: 0.75, kind: 0 },
  { id: 'carina', name: t('용골자리 성운'), note: t('7,500광년. 오리온 대성운의 네 배 크기'), raH: 10.752, decDeg: -59.87, sizeDeg: 1, light: 0.6, kind: 0 },
  { id: 'm8', name: t('석호 성운'), note: t('4,100광년. 궁수자리의 별 요람'), raH: 18.06, decDeg: -24.38, sizeDeg: 0.6, light: 0.5, kind: 0 },
  { id: 'm45', name: t('플레이아데스성단'), note: t('444광년. 1억 살쯤 된 젊은 별 무리(좀생이별)'), raH: 3.79, decDeg: 24.12, sizeDeg: 0.9, light: 0.8, kind: 1 },
  { id: 'omegaCen', name: t('오메가 센타우리'), note: t('1만 7천 광년. 별 천만 개의 가장 큰 구상성단'), raH: 13.447, decDeg: -47.48, sizeDeg: 0.4, light: 0.7, kind: 2 },
  // Six more that the naked eye sees from Earth (the user, 2026-10-04: "다 넣고").
  { id: 'hyades', name: t('히아데스성단'), note: t('153광년. 가장 가까운 성단, 황소의 얼굴'), raH: 4.45, decDeg: 15.87, sizeDeg: 1.5, light: 0.5, kind: 1 },
  { id: 'm44', name: t('벌집성단'), note: t('610광년. 게자리의 프레세페'), raH: 8.667, decDeg: 19.67, sizeDeg: 0.6, light: 0.5, kind: 1 },
  { id: 'doubleCluster', name: t('페르세우스 이중성단'), note: t('7,500광년. 나란히 붙은 두 성단'), raH: 2.33, decDeg: 57.13, sizeDeg: 0.5, light: 0.55, kind: 1 },
  { id: 'tuc47', name: t('큰부리새자리 47'), note: t('1만 3천 광년. 둘째로 밝은 구상성단'), raH: 0.402, decDeg: -72.08, sizeDeg: 0.35, light: 0.6, kind: 2 },
  { id: 'm7', name: t('프톨레마이오스 성단'), note: t('980광년. 전갈 꼬리 곁의 M7'), raH: 17.897, decDeg: -34.79, sizeDeg: 0.6, light: 0.55, kind: 1 },
  // kind 3: a dark cloud, which takes light away from the Milky Way behind it.
  { id: 'coalsack', name: t('석탄자루'), note: t('600광년. 은하수를 가린 검은 먼지 구름'), raH: 12.52, decDeg: -63.7, sizeDeg: 1.3, light: 0.8, kind: 3 },
];

// A line about each constellation, shown under its name while it is looked at.
export const CONSTELLATION_NOTES = {
  ori: t('겨울 밤의 사냥꾼. 허리에 세 별이 나란하다'),
  uma: t('국자 모양의 북두칠성이 든 큰 곰'),
  umi: t('꼬리 끝이 북극성이다'),
  cas: t('북쪽 하늘의 W 모양'),
  cru: t('남쪽을 가리키는 작은 십자가'),
  sco: t('붉은 심장 안타레스를 품은 여름 별자리'),
  cyg: t('은하수 위를 나는 북십자'),
  leo: t('봄 하늘의 사자. 심장은 레굴루스'),
  tau: t('붉은 눈 알데바란과 플레이아데스'),
  gem: t('나란한 두 별 카스토르와 폴룩스'),
  cma: t('가장 밝은 별 시리우스가 있다'),
  lyr: t('직녀성 베가의 작은 거문고'),
  aql: t('견우성 알타이르의 독수리'),
  sgr: t('찻주전자 모양. 그 너머가 은하의 중심이다'),
  and: t('안드로메다은하가 이 별자리에 있다'),
  peg: t('가을 하늘의 큰 사각형'),
  per: t('해마다 8월 별똥별이 퍼져 나오는 곳'),
  vir: t('봄의 밝은 별 스피카'),
  cen: t('가장 가까운 별 알파 센타우리가 있다'),
  boo: t('주황빛 아르크투루스의 목동'),
};

// Two or three lines about each constellation, shown when it is touched (the user,
// 2026-10-05: "별자리 터치하면 설명 보여줘", "2~3줄"). Each line fits one row on a phone.
export const CONSTELLATION_STORIES = {
  ori: [t('붉은 어깨 베텔게우스와 푸른 발 리겔의 사냥꾼.'), t('허리 세 별 아래 칼에 오리온 대성운이 있다.'), t('겨울 저녁 남쪽 하늘에 선다.')],
  uma: [t('엉덩이와 꼬리의 일곱 별이 북두칠성이다.'), t('국자 끝 두 별을 이어 다섯 배 가면 북극성.'), t('봄 저녁에 가장 높이 뜬다.')],
  umi: [t('꼬리 끝 폴라리스가 지금의 북극성이다.'), t('하늘의 북극에서 1도도 안 떨어져 있다.'), t('약 430광년 떨어진 노란 초거성.')],
  cas: [t('에티오피아의 왕비 카시오페이아.'), t('북극성을 사이에 두고 북두칠성 맞은편에 있다.'), t('1572년 튀코 브라헤가 여기서 초신성을 보았다.')],
  cru: [t('88개 별자리 가운데 가장 작다.'), t('긴 막대를 네 배 반 늘이면 하늘의 남극이다.'), t('남반구 여러 나라의 국기에 그려져 있다.')],
  sco: [t('안타레스는 태양 지름의 700배쯤인 붉은 초거성.'), t('이름은 "화성의 맞수"라는 뜻이다.'), t('오리온을 쏜 전갈이라 둘은 함께 뜨지 않는다.')],
  cyg: [t('꼬리별 데네브는 천 광년 넘게 멀어도 1등성이다.'), t('베가, 알타이르와 여름의 대삼각형을 이룬다.'), t('부리의 알비레오는 금빛과 푸른빛의 짝별.')],
  leo: [t('머리는 물음표를 뒤집은 낫 모양이다.'), t('심장 레굴루스는 79광년 떨어진 푸른 별.'), t('11월 사자자리 별똥별이 여기서 퍼져 나온다.')],
  tau: [t('붉은 눈 알데바란은 65광년 떨어진 거성이다.'), t('어깨에 플레이아데스, 얼굴에 히아데스가 있다.'), t('뿔 끝에 1054년 초신성의 자취 게성운이 있다.')],
  gem: [t('카스토르와 폴룩스는 쌍둥이 형제의 머리다.'), t('더 밝은 쪽이 폴룩스, 34광년 떨어져 있다.'), t('12월 쌍둥이자리 별똥별이 여기서 퍼져 나온다.')],
  cma: [t('시리우스는 8.6광년, 밤하늘에서 가장 밝은 별.'), t('곁에 지구만 한 백색왜성이 돌고 있다.'), t('오리온의 허리 세 별을 이어 내려가면 닿는다.')],
  lyr: [t('베가는 25광년 떨어진 푸른 흰빛의 별.'), t('1만 2천 년 뒤에는 베가가 북극성이 된다.'), t('칠월칠석 이야기의 직녀다.')],
  aql: [t('알타이르는 17광년 떨어진 가까운 별이다.'), t('열 시간도 안 되어 한 바퀴 돌아 옆으로 납작하다.'), t('은하수 건너 직녀를 바라보는 견우다.')],
  sgr: [t('찻주전자 주둥이 쪽이 우리 은하의 중심이다.'), t('2만 6천 광년 저편에 큰 블랙홀이 있다.'), t('여름 은하수가 가장 짙은 곳.')],
  and: [t('바다 괴물에게 바쳐진 공주 안드로메다.'), t('허리께의 흐린 얼룩이 안드로메다은하다.'), t('페가수스의 사각형과 별 하나를 나눠 쓴다.')],
  peg: [t('네 별이 큰 사각형을 이루는 날개 달린 말.'), t('가을 밤하늘의 길잡이다.'), t('1995년 이곳 51번 별에서 외계행성을 찾았다.')],
  per: [t('메두사의 머리를 든 영웅 페르세우스.'), t('알골은 2.9일마다 어두워지는 "악마의 별".'), t('8월 페르세우스 별똥별이 여기서 퍼져 나온다.')],
  vir: [t('둘째로 큰 별자리. 보리 이삭을 든 여신이다.'), t('스피카는 250광년 떨어진 푸른 별.'), t('이쪽에 은하 천여 개가 모인 은하단이 있다.')],
  cen: [t('반은 사람, 반은 말인 켄타우로스.'), t('알파 센타우리는 4.4광년, 가장 가까운 이웃 별.'), t('그 곁의 프록시마는 4.2광년으로 더 가깝다.')],
  boo: [t('아르크투루스는 37광년 떨어진 주황빛 거성.'), t('북두칠성 손잡이의 굽은 길을 따라가면 닿는다.'), t('하늘의 북쪽 절반에서 가장 밝은 별이다.')],
};

// The same for the galaxies, the nebulae and the clusters (the user, 2026-10-05: "ㅇㅇ
// 그렇게 해" to giving these two or three lines too).
export const DEEP_SKY_STORIES = {
  m31: [t('250만 광년 떨어진 가장 가까운 큰 은하.'), t('별이 1조 개쯤으로 우리 은하보다 크다.'), t('40억 년쯤 뒤 우리 은하와 만난다.')],
  m33: [t('270만 광년. 우리 은하군에서 셋째로 큰 은하.'), t('별이 400억 개쯤인 나선 은하다.'), t('아주 어두운 밤에만 맨눈에 보인다.')],
  lmc: [t('16만 광년. 우리 은하 곁을 도는 작은 은하.'), t('1987년 여기서 터진 초신성이 맨눈에 보였다.'), t('남반구에서만 보인다.')],
  smc: [t('20만 광년 떨어진 작은 은하.'), t('이곳의 변광성으로 우주의 거리를 재기 시작했다.'), t('대마젤란은하와 가스 다리로 이어져 있다.')],
  m42: [t('1,340광년. 가장 가까운 큰 별 탄생 구름.'), t('가운데 네 별 트라페지움이 가스를 빛낸다.'), t('오리온의 칼에서 맨눈에 뿌옇게 보인다.')],
  carina: [t('7,500광년. 오리온 대성운의 네 배 크기.'), t('안의 별 에타 카리나이는 1843년 크게 터졌다.'), t('남쪽 은하수에서 가장 밝은 성운.')],
  m8: [t('4,100광년 떨어진 궁수자리의 별 요람.'), t('어두운 띠가 가운데를 갈라 석호처럼 보인다.'), t('여름 밤 맨눈에 희미하게 보인다.')],
  m45: [t('444광년. 1억 살쯤 된 젊은 푸른 별 무리.'), t('맨눈에 예닐곱 개, 실제로는 천 개가 넘는다.'), t('우리말로 좀생이별, 일본말로 스바루다.')],
  omegaCen: [t('1만 7천 광년. 별 천만 개가 뭉친 공.'), t('우리 은하에서 가장 크고 밝은 구상성단.'), t('삼켜진 작은 은하의 고갱이로 여겨진다.')],
  hyades: [t('153광년. 가장 가까운 산개성단.'), t('V자 모양으로 황소의 얼굴을 그린다.'), t('알데바란은 식구가 아니라 그 앞에 있는 별이다.')],
  m44: [t('610광년 떨어진 게자리의 성단.'), t('맨눈에는 뿌연 얼룩, 별은 천 개쯤이다.'), t('갈릴레이가 망원경으로 처음 별로 갈라 보았다.')],
  doubleCluster: [t('7,500광년. 나란히 붙은 두 젊은 성단.'), t('나이는 1,300만 살쯤으로 아주 어리다.'), t('카시오페이아와 페르세우스 사이에 있다.')],
  tuc47: [t('1만 3천 광년. 둘째로 밝은 구상성단.'), t('별 백만 개쯤이 120광년 안에 모여 있다.'), t('하늘에서 소마젤란은하 바로 곁에 보인다.')],
  m7: [t('980광년. 전갈의 꼬리 곁에 있는 성단.'), t('서기 130년 프톨레마이오스가 적어 두었다.'), t('맨눈에 보이는 별 80개쯤의 무리다.')],
  coalsack: [t('600광년. 은하수를 가린 검은 먼지 구름.'), t('남십자자리 바로 곁의 까만 구멍처럼 보인다.'), t('호주 원주민은 에뮤의 머리로 보았다.')],
};

const star = (name, raH, decDeg, mag) => ({ name, raH, decDeg, mag });

export { CONSTELLATIONS };

// Famous stars, drawn larger than the figures' own stars.
export const BRIGHT_STARS = [
  star('Sirius', 6.752, -16.72, -1.46), star('Canopus', 6.399, -52.7, -0.74), star('Alpha Centauri', 14.66, -60.83, -0.27),
  star('Arcturus', 14.261, 19.18, -0.05), star('Vega', 18.616, 38.78, 0.03), star('Capella', 5.278, 46.0, 0.08),
  star('Procyon', 7.655, 5.22, 0.34), star('Altair', 19.846, 8.87, 0.76), star('Aldebaran', 4.599, 16.51, 0.86),
  star('Spica', 13.42, -11.16, 0.97), star('Polaris', 2.53, 89.26, 1.98),
];

// Where to write each name: a constellation's label point, the centre of a galaxy,
// a nebula or a cluster. note: a line about it, shown while it is looked at. story: what
// it tells when touched (two or three lines; its note if it has none). figure: a
// constellation's drawing as lists of unit directions, so a touch on a line finds it.
// picture: its small drawing for the plate, under public/assets/.
export function skyLabels() {
  const labels = CONSTELLATIONS.map((c) => ({
    id: c.id,
    // Its English name is in the dictionary (src/i18n/en.json).
    name: t(c.name),
    picture: `sky/${c.id}.png`,
    note: CONSTELLATION_NOTES[c.id] ?? '',
    story: (CONSTELLATION_STORIES[c.id] ?? [CONSTELLATION_NOTES[c.id] ?? '']).join('\n'),
    direction: fromEquatorial(c.label[0], c.label[1]),
    figure: c.lines.map((line) => line.map(([raH, decDeg]) => fromEquatorial(raH, decDeg))),
  }));
  for (const g of [...GALAXIES, ...NEBULAE]) labels.push({ id: g.id, name: g.name, picture: `sky/${g.id}.png`, note: g.note, story: (DEEP_SKY_STORIES[g.id] ?? [g.note]).join('\n'), direction: fromEquatorial(g.raH, g.decDeg), figure: [] });
  return labels;
}

// How far a point is from the stroke between a and b (all [x, y] in pixels).
function strokeDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const along = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - ax - dx * along, py - ay - dy * along);
}

// Of the sky things on screen, the one a finger touched: the one whose middle or whose
// drawn line is nearest to the touch, within `reach` pixels.
// shapes: [{ id, x, y, lines: [[[x, y], ...], ...] }]; point: { x, y }. Returns an id, or null.
export function touchedSky(shapes, point, reach) {
  let best = null;
  for (const shape of shapes) {
    let far = Math.hypot(shape.x - point.x, shape.y - point.y);
    for (const line of shape.lines ?? []) {
      for (let i = 1; i < line.length; i += 1) far = Math.min(far, strokeDistance([point.x, point.y], line[i - 1], line[i]));
    }
    if (far <= reach && (!best || far < best.far)) best = { id: shape.id, far };
  }
  return best ? best.id : null;
}

// Of the sky names on screen, the one being looked at: the nearest to the middle of
// the view, within `reach` pixels of it. Its note is shown under its name.
// spots: [{ id, x, y }] from the middle of the screen. Returns an id, or null.
export function lookedAt(spots, reach) {
  let best = null;
  for (const spot of spots) {
    const far = Math.hypot(spot.x, spot.y);
    if (far <= reach && (!best || far < best.far)) best = { id: spot.id, far };
  }
  return best ? best.id : null;
}
