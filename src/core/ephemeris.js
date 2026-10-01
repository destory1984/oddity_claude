// "Today's sky": where the planets really are on a given date, for a layout that
// starts from today instead of the hand-made tour layout in bodies.js.
import { BODY_DATA, START_ALTITUDE_KM } from './bodies.js';
import { eccentricAnomaly } from './kepler.js';

const RAD = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86400000;

// JPL's approximate elements for 1800-2050 (Standish, "Approximate Positions of the
// Planets", table 1): value at J2000 and change per Julian century, for
// a (AU), e, inclination, mean longitude, longitude of perihelion, longitude of the node
// (degrees). 'earth' is the Earth-Moon barycentre. Good to a small fraction of a degree.
const ELEMENTS = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus: [[0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418]],
  earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
  mars: [[1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  uranus: [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
  pluto: [[39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684],
    [-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482]],
};

// Halley's next perihelion. In today's sky the comet is where it really is: far out,
// with no tail.
export const HALLEY_NEXT_PERIHELION = new Date(Date.UTC(2061, 6, 28));

// Heliocentric ecliptic longitude and latitude (degrees) and distance (AU) on a date.
export function heliocentric(id, date) {
  const centuries = (date - J2000_MS) / DAY_MS / 36525;
  const [at, rate] = ELEMENTS[id];
  const [a, e, incDeg, meanLon, periLon, nodeLon] = at.map((n, i) => n + rate[i] * centuries);
  const E = eccentricAnomaly((meanLon - periLon) * RAD, e);
  // In the orbit's plane, x toward perihelion.
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (periLon - nodeLon) * RAD;
  const node = nodeLon * RAD;
  const inc = incDeg * RAD;
  // Turn by the argument of perihelion, tip by the inclination, turn by the node.
  const px = x * Math.cos(w) - y * Math.sin(w);
  const py = x * Math.sin(w) + y * Math.cos(w);
  const ex = px * Math.cos(node) - py * Math.cos(inc) * Math.sin(node);
  const ey = px * Math.sin(node) + py * Math.cos(inc) * Math.cos(node);
  const ez = py * Math.sin(inc);
  const rAu = Math.hypot(ex, ey, ez);
  return {
    lonDeg: ((Math.atan2(ey, ex) / RAD) + 360) % 360,
    latDeg: Math.asin(ez / rAu) / RAD,
    rAu,
  };
}

// The Moon's mean ecliptic longitude seen from Earth (degrees). Its real place wanders
// up to 6 degrees either side; the phase comes out right to within half a day.
export function moonLongitudeDeg(date) {
  const days = (date - J2000_MS) / DAY_MS;
  return (((218.316 + 13.176396 * days) % 360) + 360) % 360;
}

// Game axes: y is north of the ecliptic, longitude runs from +x toward +z (the way the
// planets go round), the same frame the stars and constellations are drawn in.
function direction(lonDeg, latDeg) {
  const lon = lonDeg * RAD;
  const lat = latDeg * RAD;
  return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
}

// The table of bodies with the planets, Pluto and the Moon turned to where they are on
// `date`, and Halley on its real schedule. Orbits stay circles of the real mean size;
// moons other than ours, and Ceres, keep the tour layout's places.
export function todayData(date, data = BODY_DATA) {
  return data.map((item) => {
    if (ELEMENTS[item.id]) {
      const { lonDeg, latDeg } = heliocentric(item.id, date);
      return { ...item, direction: direction(lonDeg, latDeg) };
    }
    if (item.id === 'moon') return { ...item, direction: direction(moonLongitudeDeg(date), 0) };
    if (item.id === 'halley') {
      return { ...item, ellipse: { ...item.ellipse, perihelionAtS: (HALLEY_NEXT_PERIHELION - date) / 1000 } };
    }
    return item;
  });
}

// The opening spot for any layout: START_ALTITUDE_KM above Earth, on the line between
// its day and night sides, facing Earth with the Sun to the right.
export function startAbove(bodies) {
  const earth = bodies.find((b) => b.id === 'earth');
  const sun = bodies.find((b) => b.kind === 'star');
  const s = sun.position.map((n, i) => n - earth.position[i]);
  // Level with the planets' plane and square to the Sun: cross(toSun, north).
  const flat = [-s[2], 0, s[0]];
  const length = Math.hypot(...flat);
  const forward = flat.map((n) => n / length);
  return {
    position: earth.position.map((n, i) => n - forward[i] * (earth.radiusKm + START_ALTITUDE_KM)),
    forward,
  };
}
