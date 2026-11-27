// The figures people have seen in the Moon's dark seas, traced over its near side as seen
// from the Earth (render/moonFiguresStage.js draws them). Each stroke is a list of points
// x0, y0, x1, y1, ... on the Moon's disc: x east (right), y north (up), the disc's radius 1;
// the stroke is drawn as a smooth curve through them (closed: back to its first point;
// fill: tinted inside).

// A ring of n points round (cx, cy), radii rx and ry.
function ring(cx, cy, rx, ry = rx, n = 10) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(+(cx + rx * Math.cos(a)).toFixed(3), +(cy + ry * Math.sin(a)).toFixed(3));
  }
  return p;
}

// The rabbit (Korea, Japan, China; India's hare and the Aztecs' rabbit are the same figure):
// its back along the top of Mare Imbrium and Serenitatis, its head bowed at Tranquillitatis,
// its lop ears hanging down to the lower right over Fecunditatis and Nectaris, its paws on
// the pestle over Mare Nubium.
const RABBIT = [
  { fill: true, closed: true, p: [
    0.2, -0.04, 0.24, 0.12, 0.34, 0.28, 0.46, 0.34, 0.38, 0.44, 0.28, 0.58, 0.05, 0.72, -0.3, 0.76,
    -0.6, 0.64, -0.8, 0.38, -0.86, 0.06, -0.8, -0.2, -0.72, -0.38, -0.52, -0.46, -0.44, -0.4,
    -0.48, -0.3, -0.44, -0.16, -0.3, -0.04, -0.1, 0.02, 0.06, -0.02, 0.14, -0.06] },
  { fill: true, closed: true, p: [0.44, 0.3, 0.62, 0.14, 0.76, -0.12, 0.76, -0.34, 0.66, -0.22, 0.54, 0.02, 0.4, 0.2] },
  { fill: true, closed: true, p: [0.38, 0.22, 0.5, 0.02, 0.58, -0.2, 0.53, -0.34, 0.45, -0.2, 0.33, 0.08] },
  { closed: true, p: ring(0.28, 0.08, 0.025, 0.025, 6) },
  // a front paw
  { fill: true, closed: true, p: [0.08, 0.0, -0.04, -0.06, -0.14, -0.13, -0.17, -0.08, -0.06, 0.02, 0.02, 0.05] },
];
const PESTLE = { p: [-0.04, 0.06, -0.26, -0.4] };
const MORTAR = { fill: true, closed: true, p: [-0.44, -0.36, -0.4, -0.5, -0.3, -0.58, -0.32, -0.66, -0.12, -0.66, -0.14, -0.58, -0.04, -0.5, -0.02, -0.36] };

export const FIGURES = {
  // Korea and Japan: pounding rice cake in a mortar.
  rabbit: { strokes: [...RABBIT, PESTLE, MORTAR] },
  // Korea: the osmanthus tree beside it, over Mare Crisium.
  tree: { strokes: [
    { p: [0.7, 0.1, 0.71, 0.24, 0.7, 0.36] },
    { p: [0.71, 0.22, 0.77, 0.3] },
    { fill: true, closed: true, p: [0.58, 0.42, 0.6, 0.54, 0.68, 0.6, 0.77, 0.56, 0.82, 0.46, 0.8, 0.36, 0.7, 0.33, 0.62, 0.35] },
  ] },
  // China: a toad beside the rabbit in the old pictures, squatting over Mare Crisium.
  toad: { strokes: [
    { fill: true, closed: true, p: [0.63, 0.397, 0.72, 0.427, 0.795, 0.383, 0.825, 0.292, 0.795, 0.202, 0.72, 0.172, 0.645, 0.202, 0.615, 0.292] },
    { p: [0.66, 0.383, 0.615, 0.458, 0.645, 0.502] },
    { p: [0.795, 0.397, 0.84, 0.458, 0.825, 0.502] },
    { p: [0.66, 0.202, 0.585, 0.157, 0.585, 0.097] },
    { p: [0.795, 0.202, 0.855, 0.157, 0.84, 0.097] },
    { closed: true, p: ring(0.69, 0.41, 0.016, 0.016, 6) },
    { closed: true, p: ring(0.76, 0.41, 0.016, 0.016, 6) },
  ] },
  // Vietnam: Cuội sitting under the great banyan tree.
  banyan: { strokes: [
    // the crown, over the northern seas
    { fill: true, closed: true, p: [
      -0.84, 0.18, -0.86, 0.4, -0.7, 0.6, -0.5, 0.74, -0.22, 0.8, 0.06, 0.74, 0.3, 0.64, 0.48, 0.48,
      0.56, 0.3, 0.46, 0.14, 0.24, 0.1, 0.04, 0.16, -0.16, 0.12, -0.4, 0.06, -0.64, 0.04] },
    // the trunk and its roots
    { fill: true, closed: true, p: [-0.12, 0.14, -0.16, -0.1, -0.24, -0.34, -0.36, -0.44, -0.1, -0.42, 0.02, -0.44, 0.1, -0.4, 0.0, -0.3, -0.04, -0.1, 0.02, 0.14] },
    // Cuội, sitting at its foot
    { closed: true, p: ring(0.24, -0.2, 0.055, 0.055, 8) },
    { fill: true, closed: true, p: [0.2, -0.26, 0.16, -0.4, 0.34, -0.42, 0.3, -0.26] },
  ] },
  // India: the hare that leapt into the fire (and the Aztecs' rabbit).
  hare: { strokes: [...RABBIT] },
  fire: { strokes: [
    { fill: true, closed: true, p: [-0.44, -0.62, -0.5, -0.5, -0.42, -0.4, -0.38, -0.5, -0.32, -0.34, -0.26, -0.48, -0.18, -0.36, -0.16, -0.5, -0.08, -0.42, -0.1, -0.56, -0.2, -0.64, -0.34, -0.66] },
  ] },
  // Europe: the man carrying a bundle of sticks, walking right with a staff.
  man: { strokes: [
    { fill: true, closed: true, p: ring(0.2, 0.44, 0.1, 0.11, 10) },
    // the bent body
    { fill: true, closed: true, p: [0.1, 0.36, 0.2, 0.3, 0.12, 0.1, -0.04, -0.06, -0.24, -0.06, -0.24, 0.12, -0.12, 0.3] },
    // legs
    { fill: true, closed: true, p: [-0.04, -0.06, 0.06, -0.3, 0.06, -0.52, 0.14, -0.56, 0.12, -0.3, -0.02, -0.02] },
    { fill: true, closed: true, p: [-0.24, -0.06, -0.34, -0.3, -0.46, -0.5, -0.38, -0.54, -0.24, -0.32, -0.14, -0.06] },
    // arm and staff
    { p: [0.12, 0.24, 0.26, 0.12, 0.32, 0.14] },
    { p: [0.34, 0.32, 0.3, -0.56] },
    // the bundle of sticks on his back
    { p: [-0.56, 0.6, 0.0, 0.3] }, { p: [-0.52, 0.68, 0.04, 0.38] }, { p: [-0.58, 0.52, -0.04, 0.24] }, { p: [-0.46, 0.74, 0.06, 0.46] },
    { p: [-0.3, 0.6, -0.22, 0.42] },
  ] },
  // A Midsummer Night's Dream: his lantern, his thornbush and his dog.
  lantern: { strokes: [
    { fill: true, closed: true, p: [0.42, 0.2, 0.52, 0.2, 0.54, 0.06, 0.4, 0.06] },
    { p: [0.33, 0.24, 0.47, 0.24, 0.47, 0.2] },
    { fill: true, closed: true, p: [0.4, -0.5, 0.44, -0.38, 0.5, -0.42, 0.52, -0.34, 0.62, -0.36, 0.66, -0.44, 0.7, -0.4, 0.7, -0.52, 0.6, -0.56, 0.46, -0.56] },
    { p: [-0.62, -0.56, -0.66, -0.36, -0.58, -0.44, -0.56, -0.3, -0.5, -0.42, -0.46, -0.32, -0.44, -0.5] },
  ] },
  // The North: Hjúki and Bil carrying the pail on a pole.
  pail: { strokes: [
    { fill: true, closed: true, p: ring(-0.52, 0.5, 0.08, 0.09, 10) },
    { fill: true, closed: true, p: [-0.6, 0.4, -0.44, 0.4, -0.4, 0.0, -0.44, -0.4, -0.52, -0.4, -0.54, -0.1, -0.6, -0.4, -0.68, -0.4, -0.66, 0.0] },
    { fill: true, closed: true, p: ring(0.36, 0.42, 0.08, 0.09, 10) },
    { fill: true, closed: true, p: [0.28, 0.32, 0.44, 0.32, 0.48, -0.06, 0.42, -0.44, 0.34, -0.44, 0.34, -0.14, 0.26, -0.44, 0.18, -0.44, 0.22, -0.06] },
    // the pole over their shoulders, the pail hanging from it
    { p: [-0.7, 0.36, 0.56, 0.3] },
    { p: [-0.06, 0.33, -0.06, 0.12] },
    { fill: true, closed: true, p: [-0.2, 0.12, 0.08, 0.12, 0.04, -0.16, -0.16, -0.16] },
  ] },
  // The Maori: Rona with her calabash, holding on to the ngaio tree.
  rona: { strokes: [
    { fill: true, closed: true, p: ring(-0.24, 0.42, 0.09, 0.1, 10) },
    { fill: true, closed: true, p: [-0.32, 0.32, -0.16, 0.32, -0.08, 0.0, 0.0, -0.46, -0.48, -0.46, -0.38, 0.0] },
    // her arm and the calabash
    { p: [-0.18, 0.24, -0.02, 0.12, 0.08, 0.08] },
    { fill: true, closed: true, p: [0.08, 0.14, 0.14, 0.06, 0.2, -0.06, 0.12, -0.16, 0.02, -0.12, 0.0, 0.0, 0.04, 0.08] },
    // the tree she held on to
    { p: [-0.62, -0.5, -0.6, 0.0, -0.56, 0.3] },
    { fill: true, closed: true, p: [-0.84, 0.3, -0.76, 0.6, -0.56, 0.72, -0.36, 0.64, -0.36, 0.44, -0.5, 0.3, -0.7, 0.24] },
    { p: [-0.6, 0.06, -0.4, 0.22, -0.3, 0.26] },
  ] },
  // Hawaii: Hina beating bark cloth with her mallet.
  hina: { strokes: [
    { fill: true, closed: true, p: ring(-0.2, 0.36, 0.09, 0.1, 10) },
    // kneeling
    { fill: true, closed: true, p: [-0.28, 0.26, -0.1, 0.26, -0.02, -0.02, -0.06, -0.24, 0.08, -0.4, -0.5, -0.4, -0.42, -0.1, -0.36, 0.06] },
    // her hair, long down her back
    { p: [-0.26, 0.44, -0.4, 0.4, -0.46, 0.16, -0.44, -0.06] },
    // the arm up with the mallet
    { p: [-0.1, 0.2, 0.08, 0.34, 0.2, 0.42] },
    { fill: true, closed: true, p: [0.16, 0.52, 0.3, 0.52, 0.3, 0.3, 0.16, 0.3] },
    // the anvil and the cloth spread out
    { fill: true, closed: true, p: [0.1, -0.24, 0.62, -0.24, 0.62, -0.34, 0.1, -0.34] },
    { p: [0.14, -0.2, 0.3, -0.16, 0.46, -0.2, 0.6, -0.16] },
  ] },
  // A woman's face turned to the right, her hair the western seas.
  lady: { strokes: [
    // brow, nose, lips and chin
    { p: [0.18, 0.78, 0.3, 0.6, 0.36, 0.42, 0.52, 0.24, 0.42, 0.18, 0.44, 0.1, 0.38, 0.06, 0.42, 0.0, 0.36, -0.08, 0.34, -0.2, 0.18, -0.3, 0.06, -0.3, 0.04, -0.6] },
    // the eye
    { p: [0.18, 0.38, 0.26, 0.42, 0.32, 0.38] },
    // the hair, flowing back over the western seas
    { fill: true, closed: true, p: [0.18, 0.78, -0.1, 0.84, -0.46, 0.74, -0.74, 0.5, -0.86, 0.14, -0.8, -0.26, -0.56, -0.5, -0.3, -0.44, -0.14, -0.2, -0.06, 0.1, 0.0, 0.4, 0.12, 0.62] },
    // the ear
    { p: [-0.02, 0.2, -0.08, 0.12, -0.04, 0.0] },
  ] },
};
