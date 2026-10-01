// Spacecraft and telescopes. They are not bodies: nothing lands on them, they are
// not in the journal and they block nothing. Flying near one only lowers the speed
// limit, like nearing a surface (see step() in game.js).
import { DISTANCE_COMPRESSION, SATELLITE_COMPRESSION, compressedCenterDistance } from './bodies.js';
import { ellipsePoint } from './kepler.js';

const AU_KM = 149597870.7;
const rad = (deg) => (deg * Math.PI) / 180;

export const HUBBLE_ALTITUDE_KM = 540;
// The real orbit takes 95 minutes, which is 8 s on the game clock (720x): too fast to
// catch at the 0.01c limit. One lap in ten minutes of play keeps it at 72 km/s.
const HUBBLE_PERIOD_S = 600;
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
    id: 'voyager1', name: '보이저 1호', nameEn: 'Voyager 1', kind: 'craft', parent: null, au: 170, kmPerS: 17, lonDeg: 255, latDeg: 35,
    launched: 1977,
    intro: '목성과 토성을 지나 2012년 태양권을 벗어났습니다. 사람이 만든 것 가운데 가장 멀리 있고, 지구의 소리와 인사를 담은 금빛 레코드를 싣고 있습니다.',
  },
  {
    id: 'voyager2', name: '보이저 2호', nameEn: 'Voyager 2', kind: 'craft', parent: null, au: 142, kmPerS: 15.3, lonDeg: 290, latDeg: -37,
    launched: 1977,
    intro: '목성, 토성, 천왕성, 해왕성을 모두 찾아간 하나뿐인 탐사선입니다. 1호보다 16일 먼저 떠났고, 2018년 태양권을 벗어났습니다.',
  },
  {
    id: 'hubble', name: '허블 우주망원경', nameEn: 'Hubble', kind: 'craft', parent: 'earth',
    launched: 1990,
    intro: '지구 540km 위를 95분에 한 바퀴 돕니다. 지름 2.4m 거울로 우주의 나이와 팽창 속도를 쟀고, 우주비행사들이 다섯 번 올라가 고쳤습니다.',
  },
  {
    id: 'jwst', name: '제임스 웹 우주망원경', nameEn: 'Webb', kind: 'craft', parent: 'earth',
    launched: 2021,
    intro: '지구에서 150만km 떨어진 L2 점 둘레를 돕니다. 금빛 거울 18장(지름 6.5m)으로 적외선을 보고, 테니스장만 한 가리개로 햇빛을 막아 영하 230도를 지킵니다.',
  },
  {
    id: 'kepler', name: '케플러 우주망원경', nameEn: 'Kepler', kind: 'craft', parent: null,
    launched: 2009,
    intro: '지구 뒤를 따라 태양을 돌며 별 15만 개의 밝기를 지켜봤습니다. 별빛이 살짝 어두워지는 순간을 잡아 외계 행성 2,600여 개를 찾았고, 2018년 연료가 떨어져 퇴역했습니다.',
  },
  {
    id: 'chandra', name: '찬드라 X선 망원경', nameEn: 'Chandra', kind: 'craft', parent: 'earth',
    launched: 1999,
    intro: 'X선으로 블랙홀과 초신성 잔해를 봅니다. 지구를 64시간에 한 바퀴 도는 길쭉한 궤도로, 가장 멀 때는 달까지 거리의 3분의 1에 이릅니다.',
  },
  {
    id: 'euclid', name: '유클리드 우주망원경', nameEn: 'Euclid', kind: 'craft', parent: 'earth',
    launched: 2023,
    intro: '제임스 웹처럼 L2 점 둘레를 돕니다. 6년 동안 하늘의 3분의 1을 찍어, 은하 수십억 개로 암흑 물질과 암흑 에너지의 지도를 만듭니다.',
  },
];

// Shown size: real craft are metres across and would be invisible at this scale.
export const CRAFT_SIZE_KM = 30;

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
      const a = (2 * Math.PI * timeS) / (HUBBLE_PERIOD_S * 720);
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
