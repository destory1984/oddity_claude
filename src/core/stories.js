import { SPIN_DAY_S, spinAngle, surfaceDirection } from './surface.js';

// Story places: spots where something real happened. Reaching one logs it in the
// journal and tells its story. Each is added by hand.
//   surface: land on the body within withinKm of the spot (east longitude, north latitude)
//   land: touch the body anywhere
//   near: come within withinKm of the target's surface (a body or a spacecraft)
export const STORIES = [
  {
    id: 'apollo11', name: '아폴로 11호 착륙지', nameEn: 'Apollo 11', year: 1969,
    type: 'surface', body: 'moon', latDeg: 0.674, lonDeg: 23.473, withinKm: 150,
    hint: '달 고요의 바다(북위 0.7도, 동경 23.5도) 150km 안에 내려앉기',
    text: '1969년 7월 20일, 닐 암스트롱과 버즈 올드린이 이곳에 내려 21시간 36분 머물렀습니다.',
  },
  {
    id: 'viking1', name: '바이킹 1호 착륙지', nameEn: 'Viking 1', year: 1976,
    type: 'surface', body: 'mars', latDeg: 22.27, lonDeg: -47.95, withinKm: 150,
    hint: '화성 크리세 평원(북위 22.3도, 서경 48도) 150km 안에 내려앉기',
    text: '1976년 7월 20일 화성에 내려 처음으로 표면 사진을 보내고, 6년 넘게 일했습니다.',
  },
  {
    id: 'huygens', name: '하위헌스 착륙지', nameEn: 'Huygens', year: 2005,
    type: 'surface', body: 'titan', latDeg: -10.57, lonDeg: 167.66, withinKm: 150,
    hint: '타이탄(남위 10.6도, 서경 192.3도) 150km 안에 내려앉기',
    text: '2005년 1월 14일 타이탄에 내렸습니다. 지구에서 가장 먼 곳에 내린 착륙선입니다.',
  },
  {
    id: 'cassini', name: '카시니의 마지막 돌입', nameEn: 'Cassini', year: 2017,
    type: 'land', body: 'saturn',
    hint: '토성의 구름 꼭대기에 닿기',
    text: '13년 동안 토성을 돈 카시니는 2017년 9월 15일 토성 대기로 뛰어들어 타 버렸습니다.',
  },
  {
    id: 'newHorizons', name: '뉴허라이즌스의 최근접', nameEn: 'New Horizons', year: 2015,
    type: 'near', target: 'pluto', withinKm: 12500,
    hint: '명왕성 표면 12,500km 안을 지나기',
    text: '2015년 7월 14일, 9년 반을 날아온 뉴허라이즌스가 명왕성을 12,500km 거리로 스쳐 갔습니다.',
  },
  {
    id: 'giotto', name: '지오토의 혜성 통과', nameEn: 'Giotto', year: 1986,
    type: 'near', target: 'halley', withinKm: 600,
    hint: '핼리 혜성의 핵 600km 안을 지나기',
    text: '1986년 3월 14일 지오토가 핼리의 핵을 596km 거리에서 지나며 처음으로 혜성 핵을 찍었습니다.',
  },
  {
    id: 'voyager1', name: '보이저 1호의 길', nameEn: 'Voyager 1', year: 2012,
    type: 'near', target: 'voyager1', withinKm: 5000,
    hint: '보이저 1호 5,000km 안까지 따라가기',
    text: '1977년 떠난 보이저 1호는 2012년 8월 태양권을 벗어나 별 사이 공간에 들어섰습니다.',
  },
];

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));

// Where the surface places are at game time timeS. They are shown and selected like
// spacecraft (kind 'site', no size), and turn with their body.
export function storySitesAt(timeS, bodies) {
  return STORIES.filter((s) => s.type === 'surface').map((s) => {
    const body = bodies.find((b) => b.id === s.body);
    const up = surfaceDirection(s.latDeg, s.lonDeg, spinAngle(SPIN_DAY_S[s.body], timeS));
    return {
      id: s.id, name: s.name, nameEn: s.nameEn, kind: 'site', parent: s.body, radiusKm: 0,
      position: body.position.map((n, i) => n + up[i] * body.radiusKm),
    };
  });
}

// The stories whose place the traveler is at right now.
export function completedStories({ position, restingOn, bodies, craft = [], sites }) {
  return STORIES.filter((s) => {
    if (s.type === 'land') return restingOn === s.body;
    if (s.type === 'surface') {
      return restingOn === s.body && gap(position, sites.find((site) => site.id === s.id).position) <= s.withinKm;
    }
    const target = bodies.find((b) => b.id === s.target) ?? craft.find((c) => c.id === s.target);
    return Boolean(target) && gap(position, target.position) - target.radiusKm <= s.withinKm;
  }).map((s) => s.id);
}

// True when the body itself is in the way: the place is over the horizon from here.
export function siteHidden(site, body, position) {
  const up = site.position.map((n, i) => (n - body.position[i]) / body.radiusKm);
  const out = position.map((n, i) => n - body.position[i]);
  const distance = Math.hypot(...out);
  if (distance <= body.radiusKm) return false;
  const cos = up.reduce((s, n, i) => s + n * out[i], 0) / distance;
  return cos < body.radiusKm / distance;
}
