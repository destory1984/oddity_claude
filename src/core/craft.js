// Spacecraft and telescopes. They are not bodies: nothing lands on them, they are
// not in the journal and they block nothing. Flying near one only lowers the speed
// limit, like nearing a surface (see step() in game.js).
import { DISTANCE_COMPRESSION } from './bodies.js';

const AU_KM = 149597870.7;
const rad = (deg) => (deg * Math.PI) / 180;

export const HUBBLE_ALTITUDE_KM = 540;
// The real orbit takes 95 minutes, which is 8 s on the game clock (720x): too fast to
// catch at the 0.01c limit. One lap in ten minutes of play keeps it at 72 km/s.
const HUBBLE_PERIOD_S = 600;
// Webb is at the Sun-Earth L2 point, 1.5 million km behind Earth. Gaps around a
// planet shrink 1/10 here, as for moons.
export const JWST_FROM_EARTH_KM = 150000;

export const CRAFT = [
  // Heliocentric distance at the start (2026), speed away from the Sun, and ecliptic
  // direction of travel. The planets' start layout is not a real date, so only the
  // latitudes (north / south) are meaningful.
  { id: 'voyager1', name: '보이저 1호', nameEn: 'Voyager 1', kind: 'craft', parent: null, au: 170, kmPerS: 17, lonDeg: 255, latDeg: 35 },
  { id: 'voyager2', name: '보이저 2호', nameEn: 'Voyager 2', kind: 'craft', parent: null, au: 142, kmPerS: 15.3, lonDeg: 290, latDeg: -37 },
  { id: 'hubble', name: '허블 우주망원경', nameEn: 'Hubble', kind: 'craft', parent: 'earth' },
  { id: 'jwst', name: '제임스 웹 우주망원경', nameEn: 'Webb', kind: 'craft', parent: 'earth' },
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
    } else if (craft.id === 'jwst') {
      const away = earth.position.map((n, i) => n - sun.position[i]);
      const length = Math.hypot(...away);
      position = earth.position.map((n, i) => n + (away[i] / length) * JWST_FROM_EARTH_KM);
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
