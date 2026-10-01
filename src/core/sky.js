// The fixed sky: nearby galaxies, well-known constellations and a few famous stars,
// placed by their real coordinates (right ascension in hours, declination in degrees).
// Nothing here can be visited; it is the backdrop.

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

const star = (name, raH, decDeg, mag) => ({ name, raH, decDeg, mag });
const chain = (...ids) => ids.slice(1).map((b, i) => [ids[i], b]);

export const CONSTELLATIONS = [
  {
    id: 'orion', name: '오리온자리',
    stars: [
      star('Betelgeuse', 5.919, 7.41, 0.5), star('Rigel', 5.242, -8.2, 0.1), star('Bellatrix', 5.419, 6.35, 1.6),
      star('Saiph', 5.796, -9.67, 2.1), star('Mintaka', 5.533, -0.3, 2.2), star('Alnilam', 5.604, -1.2, 1.7),
      star('Alnitak', 5.679, -1.94, 1.8), star('Meissa', 5.585, 9.93, 3.4),
    ],
    lines: [[0, 2], [0, 6], [2, 4], [4, 5], [5, 6], [6, 3], [4, 1], [1, 3], [7, 0], [7, 2]],
  },
  {
    id: 'ursaMajor', name: '북두칠성',
    stars: [
      star('Dubhe', 11.062, 61.75, 1.8), star('Merak', 11.031, 56.38, 2.4), star('Phecda', 11.897, 53.69, 2.4),
      star('Megrez', 12.257, 57.03, 3.3), star('Alioth', 12.9, 55.96, 1.8), star('Mizar', 13.399, 54.93, 2.2),
      star('Alkaid', 13.792, 49.31, 1.9),
    ],
    lines: [...chain(0, 1, 2, 3, 0), ...chain(3, 4, 5, 6)],
  },
  {
    id: 'cassiopeia', name: '카시오페이아자리',
    stars: [
      star('Caph', 0.153, 59.15, 2.3), star('Schedar', 0.675, 56.54, 2.2), star('Gamma Cas', 0.945, 60.72, 2.2),
      star('Ruchbah', 1.43, 60.24, 2.7), star('Segin', 1.907, 63.67, 3.4),
    ],
    lines: chain(0, 1, 2, 3, 4),
  },
  {
    id: 'crux', name: '남십자자리',
    stars: [
      star('Acrux', 12.443, -63.1, 0.8), star('Mimosa', 12.795, -59.69, 1.3), star('Gacrux', 12.519, -57.11, 1.6),
      star('Delta Cru', 12.252, -58.75, 2.8),
    ],
    lines: [[0, 2], [1, 3]],
  },
  {
    id: 'scorpius', name: '전갈자리',
    stars: [
      star('Graffias', 16.091, -19.81, 2.6), star('Dschubba', 16.006, -22.62, 2.3), star('Pi Sco', 15.981, -26.11, 2.9),
      star('Sigma Sco', 16.353, -25.59, 2.9), star('Antares', 16.49, -26.43, 1.0), star('Tau Sco', 16.598, -28.22, 2.8),
      star('Epsilon Sco', 16.836, -34.29, 2.3), star('Mu Sco', 16.865, -38.05, 3.0), star('Zeta Sco', 16.91, -42.36, 3.6),
      star('Eta Sco', 17.203, -43.24, 3.3), star('Sargas', 17.622, -43.0, 1.9), star('Iota Sco', 17.793, -40.13, 3.0),
      star('Kappa Sco', 17.708, -39.03, 2.4), star('Shaula', 17.56, -37.1, 1.6),
    ],
    lines: [...chain(0, 1, 2), ...chain(1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13)],
  },
  {
    id: 'cygnus', name: '백조자리',
    stars: [
      star('Deneb', 20.69, 45.28, 1.3), star('Sadr', 20.37, 40.26, 2.2), star('Albireo', 19.512, 27.96, 3.1),
      star('Gienah', 20.77, 33.97, 2.5), star('Delta Cyg', 19.75, 45.13, 2.9),
    ],
    lines: [...chain(0, 1, 2), ...chain(4, 1, 3)],
  },
  {
    id: 'leo', name: '사자자리',
    stars: [
      star('Regulus', 10.14, 11.97, 1.4), star('Eta Leo', 10.122, 16.76, 3.5), star('Algieba', 10.333, 19.84, 2.0),
      star('Zeta Leo', 10.278, 23.42, 3.4), star('Mu Leo', 9.879, 26.01, 3.9), star('Epsilon Leo', 9.764, 23.77, 3.0),
      star('Denebola', 11.818, 14.57, 2.1), star('Zosma', 11.235, 20.52, 2.6), star('Chertan', 11.237, 15.43, 3.3),
    ],
    lines: [...chain(0, 1, 2, 3, 4, 5), ...chain(2, 7, 6, 8, 0), [7, 8]],
  },
];

// Famous stars that are not part of the figures above.
export const BRIGHT_STARS = [
  star('Sirius', 6.752, -16.72, -1.46), star('Canopus', 6.399, -52.7, -0.74), star('Alpha Centauri', 14.66, -60.83, -0.27),
  star('Arcturus', 14.261, 19.18, -0.05), star('Vega', 18.616, 38.78, 0.03), star('Capella', 5.278, 46.0, 0.08),
  star('Procyon', 7.655, 5.22, 0.34), star('Altair', 19.846, 8.87, 0.76), star('Aldebaran', 4.599, 16.51, 0.86),
  star('Spica', 13.42, -11.16, 0.97), star('Polaris', 2.53, 89.26, 1.98),
];

// Where to write each name: the middle of a constellation's stars, a galaxy's centre.
export function skyLabels() {
  const labels = CONSTELLATIONS.map((c) => {
    const sum = [0, 0, 0];
    for (const s of c.stars) fromEquatorial(s.raH, s.decDeg).forEach((n, i) => { sum[i] += n; });
    const length = Math.hypot(...sum);
    return { id: c.id, name: c.name, direction: sum.map((n) => n / length) };
  });
  for (const g of GALAXIES) labels.push({ id: g.id, name: g.name, direction: fromEquatorial(g.raH, g.decDeg) });
  return labels;
}
