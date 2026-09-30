export const DISTANCE_COMPRESSION = 100;
export const KM_PER_UNIT = 1000;
export const START_ALTITUDE_KM = 9129;

const AU_KM = 149597870.7;

// Parents must be listed before their children. orbitKm is the real mean
// distance (semi-major axis); directions are fixed, not today's positions.
// Planets are spread around the Sun so trips go in many directions.
export const BODY_DATA = [
  { id: 'sun', name: '태양', nameEn: 'Sun', kind: 'star', radiusKm: 696340, parent: null },
  {
    id: 'mercury', name: '수성', nameEn: 'Mercury', kind: 'planet', radiusKm: 2439.7,
    parent: 'sun', orbitKm: 57909050, direction: [0.64, 0.02, 0.77],
  },
  {
    id: 'venus', name: '금성', nameEn: 'Venus', kind: 'planet', radiusKm: 6051.8,
    parent: 'sun', orbitKm: 108208000, direction: [-0.34, 0.03, 0.94],
  },
  {
    id: 'earth', name: '지구', nameEn: 'Earth', kind: 'planet', radiusKm: 6371,
    parent: 'sun', orbitKm: AU_KM, direction: [-1, -0.12, 0],
  },
  {
    id: 'moon', name: '달', nameEn: 'Moon', kind: 'moon', radiusKm: 1737.4,
    parent: 'earth', orbitKm: 384400, direction: [0.83, 0.22, -0.512],
  },
  {
    id: 'mars', name: '화성', nameEn: 'Mars', kind: 'planet', radiusKm: 3389.5,
    parent: 'sun', orbitKm: 227939200, direction: [-0.34, -0.02, -0.94],
  },
  {
    id: 'jupiter', name: '목성', nameEn: 'Jupiter', kind: 'planet', radiusKm: 69911,
    parent: 'sun', orbitKm: 778570000, direction: [0.77, 0.01, -0.64],
  },
  // Jupiter's four Galilean moons, spread around it.
  {
    id: 'io', name: '이오', nameEn: 'Io', kind: 'moon', radiusKm: 1821.6,
    parent: 'jupiter', orbitKm: 421700, direction: [-0.6, 0.05, 0.8],
  },
  {
    id: 'europa', name: '유로파', nameEn: 'Europa', kind: 'moon', radiusKm: 1560.8,
    parent: 'jupiter', orbitKm: 671034, direction: [-0.95, -0.04, -0.3],
  },
  {
    id: 'ganymede', name: '가니메데', nameEn: 'Ganymede', kind: 'moon', radiusKm: 2634.1,
    parent: 'jupiter', orbitKm: 1070412, direction: [0.3, 0.03, 0.95],
  },
  {
    id: 'callisto', name: '칼리스토', nameEn: 'Callisto', kind: 'moon', radiusKm: 2410.3,
    parent: 'jupiter', orbitKm: 1882709, direction: [0.85, -0.02, -0.52],
  },
  {
    id: 'saturn', name: '토성', nameEn: 'Saturn', kind: 'planet', radiusKm: 58232,
    parent: 'sun', orbitKm: 1433530000, direction: [0.94, 0.04, 0.34],
  },
  {
    id: 'titan', name: '타이탄', nameEn: 'Titan', kind: 'moon', radiusKm: 2574.7,
    parent: 'saturn', orbitKm: 1221870, direction: [-0.7, 0.1, -0.7],
  },
  {
    id: 'uranus', name: '천왕성', nameEn: 'Uranus', kind: 'planet', radiusKm: 25362,
    parent: 'sun', orbitKm: 2872460000, direction: [-0.87, 0.02, 0.5],
  },
  {
    id: 'neptune', name: '해왕성', nameEn: 'Neptune', kind: 'planet', radiusKm: 24622,
    parent: 'sun', orbitKm: 4495060000, direction: [0.17, -0.03, -0.98],
  },
];

const sub = (a, b) => a.map((n, i) => n - b[i]);

function normalize(v) {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
}

export function compressedCenterDistance(originalKm, radiusA, radiusB) {
  const radii = radiusA + radiusB;
  return radii + (originalKm - radii) / DISTANCE_COMPRESSION;
}

export function placeBodies(data) {
  const placed = new Map();
  for (const item of data) {
    let position = [0, 0, 0];
    if (item.parent) {
      const parent = placed.get(item.parent);
      if (!parent) throw new Error(`parent ${item.parent} must come before ${item.id}`);
      const distance = compressedCenterDistance(item.orbitKm, parent.radiusKm, item.radiusKm);
      position = normalize(item.direction).map((n, i) => parent.position[i] + n * distance);
    }
    const { id, name, nameEn, kind, radiusKm, parent = null } = item;
    placed.set(id, Object.freeze({ id, name, nameEn, kind, radiusKm, parent, position: Object.freeze(position) }));
  }
  return Object.freeze([...placed.values()]);
}

export const BODIES = placeBodies(BODY_DATA);

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
  const local = bodies.filter((body) => body.kind === 'planet' || body.kind === 'moon');
  const { body, distance } = nearestSurface(position, local);
  return { body, altitude: distance, label: `${body.name} 상공` };
}

export function apparentAngularRadius(radius, distance) {
  return Math.asin(Math.min(1, radius / distance));
}
