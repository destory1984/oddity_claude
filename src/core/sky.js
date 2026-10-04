// The fixed sky: nearby galaxies, twenty constellations and a few famous stars,
// placed by their real coordinates (right ascension in hours, declination in degrees).
// Nothing here can be visited; it is the backdrop.

import { CONSTELLATIONS } from './constellations.js';

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
  { id: 'm31', name: '안드로메다은하', note: '250만 광년. 맨눈으로 보이는 가장 먼 것', raH: 0.712, decDeg: 41.27, paDeg: 35, sizeDeg: 1.5, ratio: 0.32, light: 0.5, irregular: 0 },
  { id: 'm33', name: '삼각형자리은하', note: '270만 광년. 아주 어두운 밤에만 보인다', raH: 1.564, decDeg: 30.66, paDeg: 23, sizeDeg: 0.55, ratio: 0.6, light: 0.3, irregular: 0 },
  { id: 'lmc', name: '대마젤란은하', note: '16만 광년. 우리 은하 곁을 도는 작은 은하', raH: 5.393, decDeg: -69.75, paDeg: 170, sizeDeg: 4.5, ratio: 0.85, light: 0.42, irregular: 1 },
  { id: 'smc', name: '소마젤란은하', note: '20만 광년. 남쪽 하늘의 흐린 구름 조각', raH: 0.878, decDeg: -72.83, paDeg: 45, sizeDeg: 2.2, ratio: 0.6, light: 0.36, irregular: 1 },
];

// Glowing gas clouds and star clusters, the showpieces of the night sky. kind: 0 a
// nebula (pink hydrogen light), 1 an open cluster (young blue stars in a haze), 2 a
// globular cluster (a ball of old stars). sizeDeg: real half-width; light: brightness.
// Drawn larger than life like the galaxies (render/stars.js).
export const NEBULAE = [
  { id: 'm42', name: '오리온 대성운', note: '1,340광년. 별이 태어나는 가스 구름', raH: 5.588, decDeg: -5.39, sizeDeg: 0.6, light: 0.75, kind: 0 },
  { id: 'carina', name: '용골자리 성운', note: '7,500광년. 오리온 대성운의 네 배 크기', raH: 10.752, decDeg: -59.87, sizeDeg: 1, light: 0.6, kind: 0 },
  { id: 'm8', name: '석호 성운', note: '4,100광년. 궁수자리의 별 요람', raH: 18.06, decDeg: -24.38, sizeDeg: 0.6, light: 0.5, kind: 0 },
  { id: 'm45', name: '플레이아데스성단', note: '444광년. 1억 살쯤 된 젊은 별 무리(좀생이별)', raH: 3.79, decDeg: 24.12, sizeDeg: 0.9, light: 0.8, kind: 1 },
  { id: 'omegaCen', name: '오메가 센타우리', note: '1만 7천 광년. 별 천만 개의 가장 큰 구상성단', raH: 13.447, decDeg: -47.48, sizeDeg: 0.4, light: 0.7, kind: 2 },
  // Six more that the naked eye sees from Earth (the user, 2026-10-04: "다 넣고").
  { id: 'hyades', name: '히아데스성단', note: '153광년. 가장 가까운 성단, 황소의 얼굴', raH: 4.45, decDeg: 15.87, sizeDeg: 1.5, light: 0.5, kind: 1 },
  { id: 'm44', name: '벌집성단', note: '610광년. 게자리의 프레세페', raH: 8.667, decDeg: 19.67, sizeDeg: 0.6, light: 0.5, kind: 1 },
  { id: 'doubleCluster', name: '페르세우스 이중성단', note: '7,500광년. 나란히 붙은 두 성단', raH: 2.33, decDeg: 57.13, sizeDeg: 0.5, light: 0.55, kind: 1 },
  { id: 'tuc47', name: '큰부리새자리 47', note: '1만 3천 광년. 둘째로 밝은 구상성단', raH: 0.402, decDeg: -72.08, sizeDeg: 0.35, light: 0.6, kind: 2 },
  { id: 'm7', name: '프톨레마이오스 성단', note: '980광년. 전갈 꼬리 곁의 M7', raH: 17.897, decDeg: -34.79, sizeDeg: 0.6, light: 0.55, kind: 1 },
  // kind 3: a dark cloud, which takes light away from the Milky Way behind it.
  { id: 'coalsack', name: '석탄자루', note: '600광년. 은하수를 가린 검은 먼지 구름', raH: 12.52, decDeg: -63.7, sizeDeg: 1.3, light: 0.8, kind: 3 },
];

// A line about each constellation, shown under its name while it is looked at.
export const CONSTELLATION_NOTES = {
  ori: '겨울 밤의 사냥꾼. 허리에 세 별이 나란하다',
  uma: '국자 모양의 북두칠성이 든 큰 곰',
  umi: '꼬리 끝이 북극성이다',
  cas: '북쪽 하늘의 W 모양',
  cru: '남쪽을 가리키는 작은 십자가',
  sco: '붉은 심장 안타레스를 품은 여름 별자리',
  cyg: '은하수 위를 나는 북십자',
  leo: '봄 하늘의 사자. 심장은 레굴루스',
  tau: '붉은 눈 알데바란과 플레이아데스',
  gem: '나란한 두 별 카스토르와 폴룩스',
  cma: '가장 밝은 별 시리우스가 있다',
  lyr: '직녀성 베가의 작은 거문고',
  aql: '견우성 알타이르의 독수리',
  sgr: '찻주전자 모양. 그 너머가 은하의 중심이다',
  and: '안드로메다은하가 이 별자리에 있다',
  peg: '가을 하늘의 큰 사각형',
  per: '해마다 8월 별똥별이 퍼져 나오는 곳',
  vir: '봄의 밝은 별 스피카',
  cen: '가장 가까운 별 알파 센타우리가 있다',
  boo: '주황빛 아르크투루스의 목동',
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
// a nebula or a cluster. note: a line about it, shown while it is looked at.
export function skyLabels() {
  const labels = CONSTELLATIONS.map((c) => ({ id: c.id, name: c.name, note: CONSTELLATION_NOTES[c.id] ?? '', direction: fromEquatorial(c.label[0], c.label[1]) }));
  for (const g of [...GALAXIES, ...NEBULAE]) labels.push({ id: g.id, name: g.name, note: g.note, direction: fromEquatorial(g.raH, g.decDeg) });
  return labels;
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
