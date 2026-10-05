// Spacecraft and telescopes. They are not bodies: nothing lands on them, they are
// not in the journal and they block nothing. Flying near one only lowers the speed
// limit, like nearing a surface (see step() in game.js).
import { named } from './i18n.js';
import { DISTANCE_COMPRESSION, SATELLITE_COMPRESSION, TIME_SCALE, compressedCenterDistance } from './bodies.js';
import { ellipsePoint } from './kepler.js';
import { t } from './i18n.js';

const AU_KM = 149597870.7;
const rad = (deg) => (deg * Math.PI) / 180;

export const HUBBLE_ALTITUDE_KM = 540;
// The real orbit takes 95 minutes, which is 57 s on the game clock (100x): too fast to
// catch at the 0.01c limit. One lap in 72 minutes of play keeps it at 10 km/s.
const HUBBLE_PERIOD_S = 4320;
// Webb is at the Sun-Earth L2 point, 1.5 million km behind Earth. Gaps around a
// planet shrink 1/10 here, as for moons.
export const JWST_FROM_EARTH_KM = 150000;

// Kepler follows Earth round the Sun, falling slowly behind. When it retired in 2018 it
// was 151 million km from Earth, which is 60 degrees round the orbit.
const KEPLER_BEHIND = rad(60);
// Chandra's real orbit round Earth: 16,000 km up at its lowest, 133,000 km at its
// highest, once in 63.5 hours. Heights shrink 1/10 here, as for moons.
const EARTH_RADIUS_KM = 6371;
export const CHANDRA_PERIOD_S = 63.5 * 3600;
const CHANDRA_ORBIT = {
  semiMajorKm: EARTH_RADIUS_KM + (16000 + 133000) / 2,
  eccentricity: (133000 - 16000) / (2 * EARTH_RADIUS_KM + 16000 + 133000),
  periodS: CHANDRA_PERIOD_S,
  perihelionAtS: 0,
};
// Euclid circles the same L2 point as Webb, in a wide loop: here, a fixed 50,000 km
// to one side of it.
export const EUCLID_FROM_WEBB_KM = 50000;

// launched and intro are shown on the card that opens when the traveler docks.
export const CRAFT = [
  // Heliocentric distance at the start (2026), speed away from the Sun, and ecliptic
  // direction of travel. The planets' start layout is not a real date, so only the
  // latitudes (north / south) are meaningful.
  {
    id: 'voyager1', name: t('보이저 1호'), nameEn: 'Voyager 1', kind: 'craft', parent: null, au: 170, kmPerS: 17, lonDeg: 255, latDeg: 35,
    launched: 1977,
    intro: t('목성과 토성을 지나 2012년 태양권을 벗어났습니다. 사람이 만든 것 가운데 가장 멀리 있고, 지구의 소리와 인사를 담은 금빛 레코드를 싣고 있습니다.'),
  },
  {
    id: 'voyager2', name: t('보이저 2호'), nameEn: 'Voyager 2', kind: 'craft', parent: null, au: 142, kmPerS: 15.3, lonDeg: 290, latDeg: -37,
    launched: 1977,
    intro: t('목성, 토성, 천왕성, 해왕성을 모두 찾아간 하나뿐인 탐사선입니다. 1호보다 16일 먼저 떠났고, 2018년 태양권을 벗어났습니다.'),
  },
  {
    id: 'hubble', name: t('허블 우주망원경'), nameEn: 'Hubble', kind: 'craft', parent: 'earth',
    launched: 1990,
    intro: t('지구 500km쯤 위를 95분에 한 바퀴 돕니다. 지름 2.4m 거울로 우주의 나이와 팽창 속도를 쟀고, 우주비행사들이 다섯 번 올라가 고쳤습니다.'),
  },
  {
    id: 'jwst', name: t('제임스 웹 우주망원경'), nameEn: 'Webb', kind: 'craft', parent: 'earth',
    launched: 2021,
    intro: t('지구에서 150만km 떨어진 L2 점 둘레를 돕니다. 금빛 거울 18장(지름 6.5m)으로 적외선을 보고, 테니스장만 한 가리개로 햇빛을 막아 영하 230도를 지킵니다.'),
  },
  {
    id: 'kepler', name: t('케플러 우주망원경'), nameEn: 'Kepler', kind: 'craft', parent: null,
    launched: 2009,
    intro: t('지구 뒤를 따라 태양을 돌며 별 15만 개의 밝기를 지켜봤습니다. 별빛이 살짝 어두워지는 순간을 잡아 외계 행성 2,600여 개를 찾았고, 2018년 연료가 떨어져 퇴역했습니다.'),
  },
  {
    id: 'chandra', name: t('찬드라 X선 망원경'), nameEn: 'Chandra', kind: 'craft', parent: 'earth',
    launched: 1999,
    intro: t('X선으로 블랙홀과 초신성 잔해를 봅니다. 지구를 64시간에 한 바퀴 도는 길쭉한 궤도로, 가장 멀 때는 달까지 거리의 3분의 1에 이릅니다.'),
  },
  {
    id: 'euclid', name: t('유클리드 우주망원경'), nameEn: 'Euclid', kind: 'craft', parent: 'earth',
    launched: 2023,
    intro: t('제임스 웹처럼 L2 점 둘레를 돕니다. 6년 동안 하늘의 3분의 1을 찍어, 은하 수십억 개로 암흑 물질과 암흑 에너지의 지도를 만듭니다.'),
  },
  // ring: a circle round the parent, `altitudeKm` above its surface (game km), one lap
  // every `lapPlayS` seconds of play (real laps of 90 minutes would take 54 seconds, too
  // fast to catch), tilted `tiltDeg` to the planets' plane, starting `phaseDeg` round.
  {
    id: 'iss', name: t('국제우주정거장'), nameEn: 'ISS', kind: 'craft', parent: 'earth',
    ring: { altitudeKm: 420, lapPlayS: 3888, tiltDeg: 51.6, phaseDeg: 120 },
    launched: 1998,
    intro: t('여러 나라가 함께 지은 길이 109m의 우주정거장입니다. 지구 420km 위를 92분에 한 바퀴 돌고, 2000년부터 사람이 끊이지 않고 살고 있습니다.'),
  },
  {
    id: 'tiangong', name: t('톈궁 우주정거장'), nameEn: 'Tiangong', kind: 'craft', parent: 'earth',
    ring: { altitudeKm: 390, lapPlayS: 4104, tiltDeg: 41.5, phaseDeg: 240 },
    launched: 2021,
    intro: t('중국이 지은 우주정거장입니다. 모듈 셋이 T자로 이어져 있고, 우주비행사 셋이 여섯 달씩 머뭅니다.'),
  },
  {
    id: 'sputnik', name: t('스푸트니크 1호'), nameEn: 'Sputnik 1', kind: 'craft', parent: 'earth',
    ring: { altitudeKm: 900, lapPlayS: 5040, tiltDeg: 65, phaseDeg: 300 },
    launched: 1957,
    intro: t('1957년 10월 4일에 올라간 첫 인공위성입니다. 지름 58cm 공에서 삐삐 소리를 21일 동안 보냈고, 석 달 뒤 대기에서 타 버렸습니다. 여기 있는 것은 그 기념입니다.'),
  },
  {
    id: 'mro', name: t('화성 정찰 궤도선'), nameEn: 'MRO', kind: 'craft', parent: 'mars',
    ring: { altitudeKm: 300, lapPlayS: 4320, tiltDeg: 87, phaseDeg: 0 },
    launched: 2005,
    intro: t('화성 300km 위에서 지름 50cm 카메라로 표면을 찍습니다. 탁자만 한 것까지 보여서, 화성에 내린 탐사차들의 바퀴 자국도 찍었습니다.'),
  },
  // loop: a real ellipse (km and seconds, before any squeeze) round the parent or, with
  // no parent, the Sun; heights shrink by `squeeze` as for moons (10) or planets (100).
  {
    id: 'juno', name: t('주노'), nameEn: 'Juno', kind: 'craft', parent: 'jupiter',
    loop: { lowKm: 69911 + 4200, highKm: 8.1e6, periodS: 53 * 86400, lowAtS: 6 * 86400, tiltDeg: 90, turnDeg: 30, squeeze: 10 },
    launched: 2011,
    intro: t('2016년부터 목성의 극 위를 지나며 돕니다. 길이 9m 태양전지 날개 셋을 단, 햇빛만으로 목성까지 간 첫 탐사선입니다.'),
  },
  {
    id: 'cassini', name: t('카시니'), nameEn: 'Cassini', kind: 'craft', parent: 'saturn',
    ring: { altitudeKm: 160000 - 58232, lapPlayS: 6480, tiltDeg: 60, phaseDeg: 45 },
    launched: 1997,
    intro: t('13년 동안 토성을 294바퀴 돌고 타이탄에 하위헌스를 내려보냈습니다. 2017년 토성 대기로 뛰어들어 임무를 마쳤습니다. 여기 있는 것은 그 기념입니다.'),
  },
  {
    id: 'parker', name: t('파커 태양 탐사선'), nameEn: 'Parker', kind: 'craft', parent: null,
    loop: { lowKm: 6.9e6, highKm: 0.73 * AU_KM, periodS: 88 * 86400, lowAtS: 20 * 86400, tiltDeg: 3.4, turnDeg: 40, squeeze: 100 },
    launched: 2018,
    intro: t('태양의 코로나 속을 지나는 탐사선입니다. 가장 가까울 때 초속 190km가 넘어 사람이 만든 가장 빠른 물체이고, 11cm 두께 방패로 1,400도를 견딥니다.'),
  },
  {
    id: 'roadster', name: t('테슬라 로드스터'), nameEn: 'Tesla Roadster', kind: 'craft', parent: null,
    loop: { lowKm: 0.986 * AU_KM, highKm: 1.664 * AU_KM, periodS: 557 * 86400, lowAtS: 150 * 86400, tiltDeg: 1, turnDeg: 200, squeeze: 100 },
    launched: 2018,
    intro: t('팰컨 헤비의 첫 발사에 실려 올라간 빨간 전기차입니다. 운전석에 우주복 마네킹 스타맨이 앉아, 557일에 한 바퀴씩 태양을 돕니다.'),
  },
  {
    id: 'newHorizons', name: t('뉴허라이즌스'), nameEn: 'New Horizons', kind: 'craft', parent: null, au: 63, kmPerS: 13.7, lonDeg: 293, latDeg: 2,
    launched: 2006,
    intro: t('2015년 명왕성을 처음으로 가까이에서 찍었습니다. 그 뒤 카이퍼대의 아로코스를 지나, 지금도 초속 14km로 태양계를 떠나고 있습니다.'),
  },
  {
    id: 'pioneer10', name: t('파이어니어 10호'), nameEn: 'Pioneer 10', kind: 'craft', parent: null, au: 140, kmPerS: 11.9, lonDeg: 80, latDeg: 3,
    launched: 1972,
    intro: t('소행성대를 처음 건너 1973년 목성을 처음 지나갔습니다. 사람 남녀와 지구의 위치를 새긴 금속판을 싣고 있고, 2003년 교신이 끊겼습니다.'),
  },
  {
    id: 'danuri', name: t('다누리'), nameEn: 'Danuri', kind: 'craft', parent: 'moon',
    ring: { altitudeKm: 100, lapPlayS: 3600, tiltDeg: 90, phaseDeg: 0 },
    launched: 2022,
    intro: t('한국의 첫 달 탐사선입니다. 달 100km 위에서 시작해 지금은 60km까지 내려가며 표면과 자원을 찍고, 햇빛이 들지 않는 극지 분화구 속까지 들여다보는 카메라를 실었습니다.'),
  },
  {
    id: 'lro', name: t('달 정찰 궤도선'), nameEn: 'LRO', kind: 'craft', parent: 'moon',
    ring: { altitudeKm: 120, lapPlayS: 3096, tiltDeg: 86, phaseDeg: 150 },
    launched: 2009,
    intro: t('2009년부터 달을 돌며 표면 전체의 지도를 만들었습니다. 50cm까지 보는 카메라로 아폴로 착륙선과 우주비행사가 걸어간 자국도 찍었습니다.'),
  },
  {
    id: 'europaClipper', name: t('유로파 클리퍼'), nameEn: 'Europa Clipper', kind: 'craft', parent: null,
    loop: { lowKm: 1.0 * AU_KM, highKm: 5.2 * AU_KM, periodS: 1994 * 86400, lowAtS: -200 * 86400, tiltDeg: 2, turnDeg: 310, squeeze: 100 },
    launched: 2024,
    intro: t('목성의 얼음 위성 유로파로 가는 중입니다. 2030년에 도착해 얼음 밑 바다를 49번 스쳐 지나며 살핍니다. 태양전지 날개를 펴면 30m가 넘습니다.'),
  },
  {
    id: 'lucy', name: t('루시'), nameEn: 'Lucy', kind: 'craft', parent: null,
    loop: { lowKm: 1.0 * AU_KM, highKm: 5.7 * AU_KM, periodS: 2191 * 86400, lowAtS: -400 * 86400, tiltDeg: 5, turnDeg: 120, squeeze: 100 },
    launched: 2021,
    intro: t('목성과 같은 궤도를 도는 트로이 소행성들을 처음 찾아갑니다. 12년 동안 소행성 여럿을 지나가며, 지름 7m 둥근 태양전지판 둘을 달았습니다.'),
  },
  {
    id: 'pioneer11', name: t('파이어니어 11호'), nameEn: 'Pioneer 11', kind: 'craft', parent: null, au: 114, kmPerS: 11.2, lonDeg: 285, latDeg: 14,
    launched: 1973,
    intro: t('1979년 토성을 처음으로 지나간 탐사선입니다. 10호와 같은 금속판을 싣고 반대쪽으로 태양계를 떠나고 있으며, 1995년 교신이 끊겼습니다.'),
  },
];
named(CRAFT);

// Shown size: real craft are metres across and would be invisible at this scale.
export const CRAFT_SIZE_KM = 30;

// A point on a tilted circle or ellipse round `centre`: `out` km away, `angleOrXy` either
// an angle or the ellipse's own [x, y] direction; then turned `turnDeg` about north.
function onOrbit(centre, out, [x, y], tiltDeg, turnDeg = 0) {
  const tilt = rad(tiltDeg);
  const turn = rad(turnDeg);
  const flat = [x, y * Math.cos(tilt)];
  return [
    centre[0] + out * (flat[0] * Math.cos(turn) - flat[1] * Math.sin(turn)),
    centre[1] + out * y * Math.sin(tilt),
    centre[2] + out * (flat[0] * Math.sin(turn) + flat[1] * Math.cos(turn)),
  ];
}

// A craft that goes round a planet or a moon shows only from close to that body: within
// this many of its radii above the surface (the Moon: 6,950 km; Earth: 25,500 km), or,
// for one that flies far out (Webb, Cassini, Juno at its far point), within twice the
// craft's own distance from the body. From farther off the names only pile up on the
// planet's disc.
export const SHOWN_RADII = 4;
// The Roadster goes round the Sun some four million km from Earth, but counts as
// Earth's: it shows from within this far of Earth's surface, or of the car itself.
export const CRAFT_SHOWN_KM = 300000;
const HOME = { roadster: 'earth' };

// The ids of the craft to leave undrawn and unnamed from where the traveler is.
// keepId: the chosen target, which stays. craft: this frame's positions (craftAt).
export function hiddenCraft(position, bodies, keepId = null, craft = []) {
  const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
  const above = (body) => gap(position, body.position) - body.radiusKm;
  return CRAFT.filter((c) => {
    if (c.id === keepId) return false;
    const there = craft.find((x) => x.id === c.id);
    if (c.parent) {
      const parent = bodies.find((b) => b.id === c.parent);
      const out = there ? gap(there.position, parent.position) : 0;
      return above(parent) > Math.max(SHOWN_RADII * parent.radiusKm, 2 * out);
    }
    if (!HOME[c.id]) return false;
    const beside = Boolean(there) && gap(position, there.position) <= CRAFT_SHOWN_KM;
    return above(bodies.find((b) => b.id === HOME[c.id])) > CRAFT_SHOWN_KM && !beside;
  }).map((c) => c.id);
}

export function craftById(id) {
  return CRAFT.find((c) => c.id === id);
}

// Where every craft is at simulated time timeS, given the bodies at that time.
export function craftAt(timeS, bodies) {
  const sun = bodies.find((b) => b.kind === 'star');
  const earth = bodies.find((b) => b.id === 'earth');
  return CRAFT.map((craft) => {
    let position;
    if (craft.id === 'hubble') {
      const a = (2 * Math.PI * timeS) / (HUBBLE_PERIOD_S * TIME_SCALE);
      const r = earth.radiusKm + HUBBLE_ALTITUDE_KM;
      // A 28.5 degree inclined circle.
      const tilt = rad(28.5);
      position = [
        earth.position[0] + r * Math.cos(a),
        earth.position[1] + r * Math.sin(a) * Math.sin(tilt),
        earth.position[2] + r * Math.sin(a) * Math.cos(tilt),
      ];
    } else if (craft.id === 'jwst' || craft.id === 'euclid') {
      const away = earth.position.map((n, i) => n - sun.position[i]);
      const length = Math.hypot(...away);
      position = earth.position.map((n, i) => n + (away[i] / length) * JWST_FROM_EARTH_KM);
      if (craft.id === 'euclid') {
        // Sideways along Earth's path, level with the planets.
        const side = Math.hypot(away[2], away[0]);
        position = [position[0] - (away[2] / side) * EUCLID_FROM_WEBB_KM, position[1], position[2] + (away[0] / side) * EUCLID_FROM_WEBB_KM];
      }
    } else if (craft.id === 'kepler') {
      // Earth's place, turned back round the Sun (the planets go from +x toward +z).
      const [x, y, z] = earth.position.map((n, i) => n - sun.position[i]);
      const c = Math.cos(KEPLER_BEHIND);
      const k = Math.sin(KEPLER_BEHIND);
      position = [sun.position[0] + x * c + z * k, sun.position[1] + y, sun.position[2] - x * k + z * c];
    } else if (craft.id === 'chandra') {
      const { x, y, r } = ellipsePoint(CHANDRA_ORBIT, timeS);
      const out = compressedCenterDistance(r, earth.radiusKm, 0, SATELLITE_COMPRESSION);
      // The same 28.5 degree tilt as Hubble's orbit, stretched along +x.
      const tilt = rad(28.5);
      position = [
        earth.position[0] + (x / r) * out,
        earth.position[1] + (y / r) * out * Math.sin(tilt),
        earth.position[2] + (y / r) * out * Math.cos(tilt),
      ];
    } else if (craft.ring) {
      const parent = bodies.find((b) => b.id === craft.parent);
      const a = (2 * Math.PI * timeS) / (craft.ring.lapPlayS * TIME_SCALE) + rad(craft.ring.phaseDeg);
      position = onOrbit(parent.position, parent.radiusKm + craft.ring.altitudeKm, [Math.cos(a), Math.sin(a)], craft.ring.tiltDeg);
    } else if (craft.loop) {
      const parent = bodies.find((b) => b.id === craft.parent) ?? sun;
      const { lowKm, highKm, periodS, lowAtS, tiltDeg, turnDeg, squeeze } = craft.loop;
      const { x, y, r } = ellipsePoint({
        semiMajorKm: (lowKm + highKm) / 2, eccentricity: (highKm - lowKm) / (highKm + lowKm), periodS, perihelionAtS: lowAtS,
      }, timeS);
      position = onOrbit(parent.position, compressedCenterDistance(r, parent.radiusKm, 0, squeeze), [x / r, y / r], tiltDeg, turnDeg);
    } else {
      // Still flying straight out; on the game clock about 110 to 120 km each second of play.
      const r = (craft.au * AU_KM + craft.kmPerS * timeS) / DISTANCE_COMPRESSION;
      const lat = rad(craft.latDeg);
      const lon = rad(craft.lonDeg);
      position = [
        sun.position[0] + r * Math.cos(lat) * Math.cos(lon),
        sun.position[1] + r * Math.sin(lat),
        sun.position[2] + r * Math.cos(lat) * Math.sin(lon),
      ];
    }
    return { ...craft, radiusKm: CRAFT_SIZE_KM / 2, position };
  });
}
