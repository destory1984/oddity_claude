import { t, named } from './i18n.js';
import { ellipsePoint } from './kepler.js';

export const DISTANCE_COMPRESSION = 100;
// Moons get a gentler squeeze: at 1/100 the Moon hung 3,763 km above Earth and
// Titan sat inside Saturn's rings. At 1/10 they read as separate worlds.
export const SATELLITE_COMPRESSION = 10;
export const KM_PER_UNIT = 1000;
export const START_ALTITUDE_KM = 9129;

export const AU_KM = 149597870.7;
const DAY_S = 86400;
// Game time runs this many times faster than real time, for spin and orbits alike:
// one Earth day passes in 29 minutes, the Moon circles Earth in 13 hours. (It was 720
// until 2026-10-03, then 180 for a day: the ground, the moons and the craft moved too
// fast to steer by. The user chose 100, and on 2026-10-05 halved it: "게임 시간 속도를
// 100배 -> 50배로 줄여봐".)
export const TIME_SCALE = 50;

// Parents must be listed before their children. orbitKm is the real mean
// distance (semi-major axis); directions are fixed, not today's positions.
// Planets are spread around the Sun so trips go in many directions.
const SATURN_RING_EDGE_KM = 136775;

export const BODY_DATA = [
  { id: 'sun', name: '태양', nameEn: 'Sun', kind: 'star', radiusKm: 696340, parent: null },
  {
    id: 'mercury', name: '수성', nameEn: 'Mercury', kind: 'planet', radiusKm: 2439.7,
    parent: 'sun', orbitKm: 57909050, periodS: 87.969 * DAY_S, direction: [0.64, 0.02, 0.77],
  },
  {
    id: 'venus', name: '금성', nameEn: 'Venus', kind: 'planet', radiusKm: 6051.8,
    parent: 'sun', orbitKm: 108208000, periodS: 224.701 * DAY_S, direction: [-0.34, 0.03, 0.94],
  },
  {
    id: 'earth', name: '지구', nameEn: 'Earth', kind: 'planet', radiusKm: 6371,
    parent: 'sun', orbitKm: AU_KM, periodS: 365.256 * DAY_S, direction: [-1, -0.12, 0],
  },
  {
    id: 'moon', name: '달', nameEn: 'Moon', kind: 'moon', radiusKm: 1737.4,
    // Upper left of Earth in the opening view, on the side away from the Sun so its lit face shows.
    parent: 'earth', orbitKm: 384400, periodS: 27.3217 * DAY_S, direction: [-0.6, 0.35, 0.72],
  },
  {
    id: 'mars', name: '화성', nameEn: 'Mars', kind: 'planet', radiusKm: 3389.5,
    parent: 'sun', orbitKm: 227939200, periodS: 686.98 * DAY_S, direction: [-0.34, -0.02, -0.94],
  },
  // Mars's two captured lumps: Phobos laps the planet in 7.7 hours.
  {
    id: 'phobos', name: '포보스', nameEn: 'Phobos', kind: 'moon', radiusKm: 11.3,
    parent: 'mars', orbitKm: 9376, periodS: 0.31891 * DAY_S, direction: [0.8, 0.02, 0.6],
  },
  {
    id: 'deimos', name: '데이모스', nameEn: 'Deimos', kind: 'moon', radiusKm: 6.2,
    parent: 'mars', orbitKm: 23463, periodS: 1.263 * DAY_S, direction: [-0.5, -0.02, 0.87],
  },
  {
    id: 'jupiter', name: '목성', nameEn: 'Jupiter', kind: 'planet', radiusKm: 69911,
    parent: 'sun', orbitKm: 778570000, periodS: 4332.59 * DAY_S, direction: [0.77, 0.01, -0.64],
  },
  // Jupiter's four Galilean moons, spread around it.
  {
    id: 'io', name: '이오', nameEn: 'Io', kind: 'moon', radiusKm: 1821.6,
    parent: 'jupiter', orbitKm: 421700, periodS: 1.769138 * DAY_S, direction: [-0.6, 0.05, 0.8],
  },
  {
    id: 'europa', name: '유로파', nameEn: 'Europa', kind: 'moon', radiusKm: 1560.8,
    parent: 'jupiter', orbitKm: 671034, periodS: 3.551181 * DAY_S, direction: [-0.95, -0.04, -0.3],
  },
  {
    id: 'ganymede', name: '가니메데', nameEn: 'Ganymede', kind: 'moon', radiusKm: 2634.1,
    parent: 'jupiter', orbitKm: 1070412, periodS: 7.154553 * DAY_S, direction: [0.3, 0.03, 0.95],
  },
  {
    id: 'callisto', name: '칼리스토', nameEn: 'Callisto', kind: 'moon', radiusKm: 2410.3,
    parent: 'jupiter', orbitKm: 1882709, periodS: 16.689017 * DAY_S, direction: [0.85, -0.02, -0.52],
  },
  {
    id: 'saturn', name: '토성', nameEn: 'Saturn', kind: 'planet', radiusKm: 58232,
    parent: 'sun', orbitKm: 1433530000, periodS: 10759.22 * DAY_S, direction: [0.94, 0.04, 0.34],
  },
  // Saturn's moons. Its rings reach 136,775 km, farther out than the 1/10 rule would
  // put the inner moons, so for Saturn the shrinking gap is measured from the ring edge.
  {
    id: 'mimas', name: '미마스', nameEn: 'Mimas', kind: 'moon', radiusKm: 198.2, edgeKm: SATURN_RING_EDGE_KM,
    parent: 'saturn', orbitKm: 185539, periodS: 0.942422 * DAY_S, direction: [0.5, 0.02, -0.87],
  },
  {
    id: 'enceladus', name: '엔셀라두스', nameEn: 'Enceladus', kind: 'moon', radiusKm: 252.1, edgeKm: SATURN_RING_EDGE_KM,
    parent: 'saturn', orbitKm: 238042, periodS: 1.370218 * DAY_S, direction: [-0.9, 0.03, 0.44],
  },
  {
    id: 'tethys', name: '테티스', nameEn: 'Tethys', kind: 'moon', radiusKm: 531.1, edgeKm: SATURN_RING_EDGE_KM,
    parent: 'saturn', orbitKm: 294619, periodS: 1.887802 * DAY_S, direction: [0.75, -0.02, 0.66],
  },
  {
    id: 'dione', name: '디오네', nameEn: 'Dione', kind: 'moon', radiusKm: 561.4, edgeKm: SATURN_RING_EDGE_KM,
    parent: 'saturn', orbitKm: 377396, periodS: 2.736915 * DAY_S, direction: [-0.4, 0.03, -0.92],
  },
  {
    id: 'rhea', name: '레아', nameEn: 'Rhea', kind: 'moon', radiusKm: 763.8, edgeKm: SATURN_RING_EDGE_KM,
    parent: 'saturn', orbitKm: 527108, periodS: 4.518212 * DAY_S, direction: [0.2, 0.04, 0.98],
  },
  {
    id: 'titan', name: '타이탄', nameEn: 'Titan', kind: 'moon', radiusKm: 2574.7, edgeKm: SATURN_RING_EDGE_KM,
    parent: 'saturn', orbitKm: 1221870, periodS: 15.945 * DAY_S, direction: [-0.7, 0.1, -0.7],
  },
  {
    id: 'iapetus', name: '이아페투스', nameEn: 'Iapetus', kind: 'moon', radiusKm: 734.5, edgeKm: SATURN_RING_EDGE_KM,
    parent: 'saturn', orbitKm: 3560820, periodS: 79.3215 * DAY_S, direction: [0.9, -0.2, -0.38],
  },
  {
    id: 'uranus', name: '천왕성', nameEn: 'Uranus', kind: 'planet', radiusKm: 25362,
    parent: 'sun', orbitKm: 2872460000, periodS: 30688.5 * DAY_S, direction: [-0.87, 0.02, 0.5],
  },
  // Uranus's five round moons. (Really they circle over its tipped-over equator; here
  // every orbit lies flat, like the others.)
  {
    id: 'miranda', name: '미란다', nameEn: 'Miranda', kind: 'moon', radiusKm: 235.8,
    parent: 'uranus', orbitKm: 129390, periodS: 1.413479 * DAY_S, direction: [0.7, 0.02, 0.71],
  },
  {
    id: 'ariel', name: '아리엘', nameEn: 'Ariel', kind: 'moon', radiusKm: 578.9,
    parent: 'uranus', orbitKm: 191020, periodS: 2.520379 * DAY_S, direction: [-0.8, -0.03, 0.6],
  },
  {
    id: 'umbriel', name: '움브리엘', nameEn: 'Umbriel', kind: 'moon', radiusKm: 584.7,
    parent: 'uranus', orbitKm: 266300, periodS: 4.144177 * DAY_S, direction: [-0.3, 0.02, -0.95],
  },
  {
    id: 'titania', name: '티타니아', nameEn: 'Titania', kind: 'moon', radiusKm: 788.4,
    parent: 'uranus', orbitKm: 435910, periodS: 8.705872 * DAY_S, direction: [0.95, 0.03, -0.3],
  },
  {
    id: 'oberon', name: '오베론', nameEn: 'Oberon', kind: 'moon', radiusKm: 761.4,
    parent: 'uranus', orbitKm: 583520, periodS: 13.463239 * DAY_S, direction: [-0.6, -0.04, 0.8],
  },
  {
    id: 'neptune', name: '해왕성', nameEn: 'Neptune', kind: 'planet', radiusKm: 24622,
    parent: 'sun', orbitKm: 4495060000, periodS: 60182 * DAY_S, direction: [0.17, -0.03, -0.98],
  },
  // Triton, a captured world, is the one large moon that orbits backwards.
  {
    id: 'triton', name: '트리톤', nameEn: 'Triton', kind: 'moon', radiusKm: 1353.4, retrograde: true,
    parent: 'neptune', orbitKm: 354759, periodS: 5.876854 * DAY_S, direction: [0.6, 0.2, 0.77],
  },
  // Dwarf planets, on flat circles like the planets (Pluto's real orbit is tilted 17
  // degrees and stretched; that is left out).
  {
    id: 'ceres', name: '세레스', nameEn: 'Ceres', kind: 'dwarf', radiusKm: 469.7,
    parent: 'sun', orbitKm: 2.7692 * AU_KM, periodS: 1680 * DAY_S, direction: [0.5, 0.002, 0.87],
  },
  {
    id: 'pluto', name: '명왕성', nameEn: 'Pluto', kind: 'dwarf', radiusKm: 1188.3,
    parent: 'sun', orbitKm: 39.482 * AU_KM, periodS: 90560 * DAY_S, direction: [-0.71, 0.1, -0.7],
  },
  {
    // Pluto lies on its side and spins backwards; Charon circles it the same way.
    id: 'charon', name: '카론', nameEn: 'Charon', kind: 'moon', radiusKm: 606, retrograde: true,
    parent: 'pluto', orbitKm: 19591, periodS: 6.387 * DAY_S, direction: [0.8, 0.1, 0.6],
  },
  // Halley's Comet on its real ellipse (0.586 to 35.1 AU, backwards, tilted 18 degrees).
  // The real comet is near aphelion now, with no tail for decades; the game clock starts
  // 60 days before perihelion instead, so the tail grows while you watch.
  {
    id: 'halley', name: '핼리 혜성', nameEn: "Halley's Comet", kind: 'comet', radiusKm: 5.5, parent: 'sun',
    ellipse: {
      semiMajorKm: 17.834 * AU_KM, eccentricity: 0.96714, periodS: 27510 * DAY_S,
      perihelionAtS: 60 * DAY_S, perihelionDirection: [0.2, 0, -0.98], tiltRad: 0.31, retrograde: true,
    },
  },
  // Hale-Bopp, the great comet of 1997: 0.914 AU at its closest, some 350 AU at its
  // farthest, once in about 2,400 years, on a path standing almost upright to the
  // planets'. It is far out now; here it starts 20 days after perihelion.
  {
    id: 'haleBopp', name: '헤일-밥 혜성', nameEn: 'Hale-Bopp', kind: 'comet', radiusKm: 30, parent: 'sun',
    ellipse: {
      semiMajorKm: 177.4 * AU_KM, eccentricity: 0.99485, periodS: 876600 * DAY_S,
      perihelionAtS: -20 * DAY_S, perihelionDirection: [-0.7, 0, 0.71], tiltRad: 1.56, retrograde: false,
    },
  },
  // 67P/Churyumov-Gerasimenko, where Rosetta's lander Philae came down: 1.243 to 5.68 AU,
  // once in 6.44 years. Here it reaches perihelion 40 days in.
  {
    id: 'churyumov', name: '추류모프-게라시멘코 혜성', nameEn: '67P', kind: 'comet', radiusKm: 2, parent: 'sun',
    ellipse: {
      semiMajorKm: 3.463 * AU_KM, eccentricity: 0.641, periodS: 2352 * DAY_S,
      perihelionAtS: 40 * DAY_S, perihelionDirection: [0.9, 0, 0.44], tiltRad: 0.123, retrograde: false,
    },
  },
];

const sub = (a, b) => a.map((n, i) => n - b[i]);

function normalize(v) {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
}

export function compressedCenterDistance(originalKm, radiusA, radiusB, factor = DISTANCE_COMPRESSION) {
  const radii = radiusA + radiusB;
  return radii + (originalKm - radii) / factor;
}

// Circular orbits: a child's fixed direction turns about the vertical axis by
// 2π·t/period, so each orbit keeps its distance and height.
function turnAboutY([x, y, z], angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Where a body on an ellipse is: its direction from the Sun and its real distance.
function onEllipse(ellipse, timeS) {
  const { x, y, r } = ellipsePoint(ellipse, timeS);
  const toPerihelion = normalize(ellipse.perihelionDirection);
  // The planets go from +x toward +z; flat is that way, then the plane is tipped up.
  const flat = normalize(cross(toPerihelion, [0, 1, 0]));
  const along = flat.map((n, i) => n * Math.cos(ellipse.tiltRad) + [0, 1, 0][i] * Math.sin(ellipse.tiltRad));
  const side = ellipse.retrograde ? -y : y;
  return { direction: normalize(toPerihelion.map((n, i) => n * x + along[i] * side)), sunKm: r };
}

export function placeBodies(data, timeS = 0) {
  const placed = new Map();
  for (const item of data) {
    let position = [0, 0, 0];
    let sunKm;
    if (item.parent) {
      const parent = placed.get(item.parent);
      if (!parent) throw new Error(`parent ${item.parent} must come before ${item.id}`);
      const factor = parent.kind === 'star' ? DISTANCE_COMPRESSION : SATELLITE_COMPRESSION;
      let direction;
      let realKm = item.orbitKm;
      if (item.ellipse) {
        ({ direction, sunKm } = onEllipse(item.ellipse, timeS));
        realKm = sunKm;
      } else {
        // Negative: counterclockwise seen from +y (north) in Babylon's left-handed frame.
        const angle = item.periodS ? ((item.retrograde ? 2 : -2) * Math.PI * timeS) / item.periodS : 0;
        direction = normalize(turnAboutY(item.direction, angle));
      }
      const distance = compressedCenterDistance(realKm, item.edgeKm ?? parent.radiusKm, item.radiusKm, factor);
      position = direction.map((n, i) => parent.position[i] + n * distance);
    }
    const { id, name, nameEn, kind, radiusKm, parent = null } = item;
    const body = { id, name, nameEn, kind, radiusKm, parent, position: Object.freeze(position) };
    if (sunKm !== undefined) body.sunKm = sunKm;
    placed.set(id, Object.freeze(body));
  }
  return Object.freeze([...placed.values()]);
}

export const BODIES = placeBodies(named(BODY_DATA));

// Bodies where they are at game time timeS (seconds of simulated time).
export function bodiesAt(timeS) {
  return placeBodies(BODY_DATA, timeS);
}

// A body's small drawing (public/assets/bodies, 128 px): beside its name in the notebook.
export const bodyPicture = (id) => `bodies/${id}.png`;

export function bodyById(id, bodies = BODIES) {
  return bodies.find((body) => body.id === id);
}

export const START_POSITION = (() => {
  const earth = bodyById('earth');
  return [earth.position[0], earth.position[1], earth.position[2] - earth.radiusKm - START_ALTITUDE_KM];
})();

export function surfaceDistance(position, body) {
  return Math.max(0, Math.hypot(...sub(position, body.position)) - body.radiusKm);
}

export function nearestSurface(position, bodies = BODIES) {
  let best = { body: null, distance: Infinity };
  for (const body of bodies) {
    const distance = surfaceDistance(position, body);
    if (distance < best.distance) best = { body, distance };
  }
  return best;
}

export function nearestLocalBody(position, bodies = BODIES) {
  // A moon takes the readout only from close by: within one of its own radii above
  // its surface (landing on the Moon then counts down to the Moon, not from Earth).
  // Farther off it is the Sun, a planet, a dwarf planet or a comet: with so many moons
  // the label would otherwise keep flipping.
  const moon = nearestSurface(position, bodies.filter((body) => body.kind === 'moon'));
  if (moon.body && moon.distance <= moon.body.radiusKm) {
    return { body: moon.body, altitude: moon.distance, label: t`${moon.body.name} 상공` };
  }
  const local = bodies.filter((body) => body.kind !== 'moon');
  const { body, distance } = nearestSurface(position, local);
  return { body, altitude: distance, label: t`${body.name} 상공` };
}

export function apparentAngularRadius(radius, distance) {
  return Math.asin(Math.min(1, radius / distance));
}
