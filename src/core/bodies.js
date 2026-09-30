export const DISTANCE_COMPRESSION = 100;
export const KM_PER_UNIT = 1000;
export const START_ALTITUDE_KM = 9129;

const AU_KM = 149597870.7;

// Parents must be listed before their children.
export const BODY_DATA = [
  { id: 'sun', name: '태양', nameEn: 'Sun', kind: 'star', radiusKm: 696340, parent: null },
  {
    id: 'earth', name: '지구', nameEn: 'Earth', kind: 'planet', radiusKm: 6371,
    parent: 'sun', orbitKm: AU_KM, direction: [-1, -0.12, 0],
  },
  {
    id: 'moon', name: '달', nameEn: 'Moon', kind: 'moon', radiusKm: 1737.4,
    parent: 'earth', orbitKm: 384400, direction: [0.83, 0.22, -0.512],
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
