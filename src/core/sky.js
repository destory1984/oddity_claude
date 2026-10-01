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
  { id: 'm31', name: '안드로메다은하', raH: 0.712, decDeg: 41.27, paDeg: 35, sizeDeg: 1.5, ratio: 0.32, light: 0.5, irregular: 0 },
  { id: 'm33', name: '삼각형자리은하', raH: 1.564, decDeg: 30.66, paDeg: 23, sizeDeg: 0.55, ratio: 0.6, light: 0.3, irregular: 0 },
  { id: 'lmc', name: '대마젤란은하', raH: 5.393, decDeg: -69.75, paDeg: 170, sizeDeg: 4.5, ratio: 0.85, light: 0.42, irregular: 1 },
  { id: 'smc', name: '소마젤란은하', raH: 0.878, decDeg: -72.83, paDeg: 45, sizeDeg: 2.2, ratio: 0.6, light: 0.36, irregular: 1 },
];

// Glowing gas clouds and star clusters, the showpieces of the night sky. kind: 0 a
// nebula (pink hydrogen light), 1 an open cluster (young blue stars in a haze), 2 a
// globular cluster (a ball of old stars). sizeDeg: real half-width; light: brightness.
// Drawn larger than life like the galaxies (render/stars.js).
export const NEBULAE = [
  { id: 'm42', name: '오리온 대성운', raH: 5.588, decDeg: -5.39, sizeDeg: 0.6, light: 0.75, kind: 0 },
  { id: 'carina', name: '용골자리 성운', raH: 10.752, decDeg: -59.87, sizeDeg: 1, light: 0.6, kind: 0 },
  { id: 'm8', name: '석호 성운', raH: 18.06, decDeg: -24.38, sizeDeg: 0.6, light: 0.5, kind: 0 },
  { id: 'm45', name: '플레이아데스성단', raH: 3.79, decDeg: 24.12, sizeDeg: 0.9, light: 0.8, kind: 1 },
  { id: 'omegaCen', name: '오메가 센타우리', raH: 13.447, decDeg: -47.48, sizeDeg: 0.4, light: 0.7, kind: 2 },
];

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
// a nebula or a cluster.
export function skyLabels() {
  const labels = CONSTELLATIONS.map((c) => ({ id: c.id, name: c.name, direction: fromEquatorial(c.label[0], c.label[1]) }));
  for (const g of [...GALAXIES, ...NEBULAE]) labels.push({ id: g.id, name: g.name, direction: fromEquatorial(g.raH, g.decDeg) });
  return labels;
}
