import {
  TransformNode, StandardMaterial, DynamicTexture, Color3, Vector3, CreateCylinder, CreateBox, CreateSphere,
} from './babylon.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import { CRAFT_SIZE_KM } from '../core/craft.js';

// Spacecraft drawn from a few simple shapes, each about one unit across. Local +z
// points at the Sun (Voyager's dish toward home, Webb's sunshield toward the light).
// Real craft are metres across; here they are shown 30 km wide, and from farther away
// they keep the same size on screen so they can be found at all.

const APPARENT = 0.05; // shown width as a share of the distance
// How far each one can be seen, and the largest it may be drawn (Hubble flies only
// 540 km above Earth, so it must stay small enough not to dip into the planet).
const RULES = {
  voyager1: { visibleKm: 3e6, maxKm: Infinity },
  voyager2: { visibleKm: 3e6, maxKm: Infinity },
  hubble: { visibleKm: 60000, maxKm: 300 },
  jwst: { visibleKm: 400000, maxKm: 4000 },
  kepler: { visibleKm: 400000, maxKm: 4000 },
  // Chandra comes within 1,600 km of Earth, so it too must stay small.
  chandra: { visibleKm: 100000, maxKm: 600 },
  euclid: { visibleKm: 400000, maxKm: 4000 },
  // Low over a planet: small, like Hubble.
  iss: { visibleKm: 60000, maxKm: 300 },
  tiangong: { visibleKm: 60000, maxKm: 300 },
  sputnik: { visibleKm: 60000, maxKm: 300 },
  mro: { visibleKm: 60000, maxKm: 200 },
  juno: { visibleKm: 400000, maxKm: 4000 },
  cassini: { visibleKm: 400000, maxKm: 4000 },
  parker: { visibleKm: 400000, maxKm: 4000 },
  roadster: { visibleKm: 400000, maxKm: 4000 },
  newHorizons: { visibleKm: 3e6, maxKm: Infinity },
  pioneer10: { visibleKm: 3e6, maxKm: Infinity },
};

function paint(scene, name, hex, glow = 0.25) {
  const m = new StandardMaterial(name, scene);
  const c = Color3.FromHexString(hex);
  m.diffuseColor = c;
  m.emissiveColor = c.scale(glow);
  m.specularColor = new Color3(0.25, 0.25, 0.25);
  return m;
}

function part(mesh, parent, material, position = [0, 0, 0], rotation = [0, 0, 0], scaling = [1, 1, 1]) {
  mesh.parent = parent;
  mesh.material = material;
  mesh.position = new Vector3(...position);
  mesh.rotation = new Vector3(...rotation);
  mesh.scaling = new Vector3(...scaling);
  mesh.isPickable = false;
  return mesh;
}

const cyl = (scene, name, options) => CreateCylinder(name, options, scene);
const QUARTER = Math.PI / 2;

// Voyager: a 3.7 m white dish on a ten-sided bus, the RTG boom to one side, the long
// magnetometer boom and the science boom to the other, and the Golden Record.
function voyager(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Dish`, { height: 0.08, diameterTop: 0.5, diameterBottom: 0.12, tessellation: 24 }), root, mats.white, [0, 0, 0.08], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Feed`, { height: 0.16, diameter: 0.03, tessellation: 8 }), root, mats.dark, [0, 0, 0.22], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Bus`, { height: 0.08, diameter: 0.24, tessellation: 10 }), root, mats.dark, [0, 0, -0.02], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Record`, { height: 0.01, diameter: 0.07, tessellation: 20 }), root, mats.gold, [0.06, -0.125, -0.02], [0, 0, 0]);
  part(cyl(scene, `${name}RtgBoom`, { height: 0.3, diameter: 0.015, tessellation: 6 }), root, mats.grey, [-0.25, 0, -0.04], [0, 0, QUARTER]);
  part(cyl(scene, `${name}Rtg`, { height: 0.16, diameter: 0.05, tessellation: 10 }), root, mats.dark, [-0.42, 0, -0.04], [0, 0, QUARTER]);
  part(cyl(scene, `${name}MagBoom`, { height: 0.75, diameter: 0.01, tessellation: 5 }), root, mats.grey, [0.3, 0.3, -0.05], [0, 0, -QUARTER / 2]);
  part(cyl(scene, `${name}SciBoom`, { height: 0.28, diameter: 0.015, tessellation: 6 }), root, mats.grey, [0.2, -0.1, -0.04], [0, 0, QUARTER * 1.3]);
  part(CreateBox(`${name}Cameras`, { width: 0.07, height: 0.07, depth: 0.09 }, scene), root, mats.white, [0.34, -0.17, -0.04]);
  return root;
}

// Painted surfaces, drawn once on small canvases: no image files.
function drawn(scene, name, size, draw) {
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, true);
  draw(texture.getContext(), size);
  texture.update();
  return texture;
}

function textured(scene, name, texture, glow = 0.3) {
  const m = new StandardMaterial(name, scene);
  m.diffuseTexture = texture;
  m.emissiveTexture = texture;
  m.emissiveColor = new Color3(glow, glow, glow);
  m.specularColor = new Color3(0.3, 0.3, 0.3);
  return m;
}

// Solar cells: dark blue squares between thin silver lines.
function solarCells(scene) {
  return drawn(scene, 'craftCells', 128, (ctx, size) => {
    ctx.fillStyle = '#1b2f7a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#22398c' : '#1a2c74';
        ctx.fillRect(i * 16 + 1, j * 16 + 1, 14, 14);
      }
    }
    ctx.fillStyle = '#9aa6c8';
    for (let i = 0; i <= 8; i += 4) ctx.fillRect(i * 16 - 1, 0, 2, size);
  });
}

// Crinkled silver insulation in panels, with seams and a few darker patches.
// base: the sheet's colour; silver for most craft, gold for Kapton blankets.
function foil(scene, name = 'craftFoil', base = '#b4b8c0', tint = [1, 1, 1.04]) {
  return drawn(scene, name, 256, (ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    let seed = 9151;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let n = 0; n < 260; n++) {
      const v = 150 + Math.floor(rand() * 80);
      ctx.fillStyle = `rgba(${Math.round(v * tint[0])},${Math.round(v * tint[1])},${Math.round(v * tint[2])},0.35)`;
      ctx.fillRect(rand() * size, rand() * size, 6 + rand() * 30, 3 + rand() * 14);
    }
    ctx.fillStyle = 'rgba(70,74,84,0.55)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 32, size, 1.5);
    for (let i = 0; i < 6; i++) ctx.fillRect(i * 43, 0, 1.5, size);
  });
}

// Hubble: a narrow forward tube with the aperture door open, a fatter equipment ring
// and aft shroud, two solar arrays on masts and two dish antennas on booms. It never
// looks at the Sun, so the tube lies across the sunward axis.
function hubble(scene, name, mats) {
  const outer = new TransformNode(name, scene);
  const root = new TransformNode(`${name}Body`, scene);
  root.parent = outer;
  root.rotation.x = -QUARTER;
  const tube = (id, diameter, height, z, material) => part(
    cyl(scene, `${name}${id}`, { height, diameter, tessellation: 32 }), root, material, [0, 0, z], [QUARTER, 0, 0],
  );
  tube('Forward', 0.23, 0.6, 0.18, mats.foil);
  tube('Bay', 0.31, 0.12, -0.18, mats.foil);
  tube('Aft', 0.32, 0.26, -0.37, mats.foil);
  tube('Bulkhead', 0.3, 0.012, -0.505, mats.dark);
  tube('Mouth', 0.21, 0.01, 0.482, mats.dark);
  // Dark bands where the sections join, and the rim of the aperture.
  for (const [i, z, d] of [[0, 0.47, 0.238], [1, 0.3, 0.236], [2, 0.12, 0.236], [3, -0.12, 0.316], [4, -0.24, 0.326], [5, -0.49, 0.326]]) {
    tube(`Band${i}`, d, 0.008, z, mats.grey);
  }
  // Aperture door, swung open on its hinge at the top of the mouth.
  const hinge = new TransformNode(`${name}Hinge`, scene);
  hinge.parent = root;
  hinge.position.set(0, 0.115, 0.48);
  hinge.rotation.x = -1.85;
  part(cyl(scene, `${name}Door`, { height: 0.01, diameter: 0.23, tessellation: 32 }), hinge, mats.foil, [0, -0.115, 0], [QUARTER, 0, 0]);
  // Solar arrays: rigid panels 7.6 m long, each on a mast, lying along the tube.
  for (const s of [-1, 1]) {
    part(cyl(scene, `${name}Mast${s}`, { height: 0.2, diameter: 0.012, tessellation: 6 }), root, mats.grey, [s * 0.215, 0, 0.08], [0, 0, QUARTER]);
    part(CreateBox(`${name}Array${s}`, { width: 0.19, height: 0.008, depth: 0.56 }, scene), root, mats.cells, [s * 0.41, 0, 0.08]);
    part(CreateBox(`${name}Spar${s}`, { width: 0.012, height: 0.014, depth: 0.58 }, scene), root, mats.grey, [s * 0.41, 0, 0.08]);
    // High-gain antennas: small dishes on booms above and below the tube.
    part(cyl(scene, `${name}Boom${s}`, { height: 0.24, diameter: 0.008, tessellation: 5 }), root, mats.grey, [0, s * 0.23, 0.1]);
    part(cyl(scene, `${name}Dish${s}`, { height: 0.02, diameterTop: 0.09, diameterBottom: 0.02, tessellation: 20 }), root, mats.white, [0, s * 0.36, 0.1], [s > 0 ? 0 : Math.PI, 0, 0]);
    // Yellow handrails for the astronauts who serviced it.
    for (const z of [-0.3, -0.42]) {
      part(cyl(scene, `${name}Rail${s}${z}`, { height: 0.09, diameter: 0.006, tessellation: 5 }), root, mats.gold, [s * 0.165, 0, z], [QUARTER, 0, 0]);
    }
  }
  return outer;
}

// Webb: five kite-shaped sunshield layers (the sunward one a pinkish silver), and on
// the cold side a gold mirror of 18 hexagons facing sideways, with its small secondary
// mirror held out on three booms. The bus, solar panel and antenna hang on the hot side.
function webb(scene, name, mats) {
  const root = new TransformNode(name, scene);
  for (let i = 0; i < 5; i++) {
    const size = 1 - i * 0.035;
    part(cyl(scene, `${name}Shield${i}`, { height: 0.004, diameter: size, tessellation: 6 }), root, i === 0 ? mats.shield : mats.silver,
      [0, 0, 0.05 - i * 0.02], [QUARTER, 0, 0], [0.66, 1, 1]);
  }
  // The hot side: bus, a solar panel and the antenna that talks to Earth.
  part(CreateBox(`${name}Bus`, { width: 0.14, height: 0.12, depth: 0.07 }, scene), root, mats.foil, [0, -0.05, 0.09]);
  part(CreateBox(`${name}Panel`, { width: 0.1, height: 0.3, depth: 0.006 }, scene), root, mats.cells, [0, -0.3, 0.1], [0.35, 0, 0]);
  part(cyl(scene, `${name}Antenna`, { height: 0.015, diameterTop: 0.06, diameterBottom: 0.015, tessellation: 16 }), root, mats.white, [0.05, -0.02, 0.14], [QUARTER, 0, 0]);
  // The flap at the far tip that balances the push of sunlight.
  part(CreateBox(`${name}Flap`, { width: 0.1, height: 0.09, depth: 0.004 }, scene), root, mats.silver, [0, 0.5, 0.0], [-0.7, 0, 0]);

  // Mirror: two rings of hexagons round an empty middle, standing on the cold side.
  const mirror = new TransformNode(`${name}Mirror`, scene);
  mirror.parent = root;
  mirror.position.set(0, 0.03, -0.24);
  const pitch = 0.064; // centre to centre: 1.32 m segments on a 21 m shield
  let n = 0;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if ((q === 0 && r === 0) || Math.abs(q + r) > 2) continue;
      const x = pitch * q * Math.cos(Math.PI / 6);
      const z = pitch * (r + q * Math.sin(Math.PI / 6));
      part(cyl(scene, `${name}Hex${n++}`, { height: 0.01, diameter: pitch * 1.1, tessellation: 6 }), mirror, mats.gold, [x, 0, z]);
    }
  }
  // Black backplane and the instrument box behind the mirror.
  part(cyl(scene, `${name}Back`, { height: 0.012, diameter: 0.34, tessellation: 6 }), mirror, mats.dark, [0, -0.012, 0], [0, Math.PI / 6, 0]);
  part(CreateBox(`${name}Instruments`, { width: 0.16, height: 0.07, depth: 0.14 }, scene), mirror, mats.dark, [0, -0.05, 0]);
  // Secondary mirror on three booms, 7 m in front of the primary.
  const apex = [0, 0.34, 0];
  for (const [i, x, z] of [[0, -0.15, 0.09], [1, 0.15, 0.09], [2, 0, -0.17]]) {
    const length = Math.hypot(x, apex[1], z);
    const strut = part(cyl(scene, `${name}Strut${i}`, { height: length, diameter: 0.007, tessellation: 4 }), mirror, mats.dark, [x / 2, apex[1] / 2, z / 2]);
    strut.rotation.set(-Math.atan2(z, apex[1]), 0, Math.atan2(x, Math.hypot(apex[1], z)));
  }
  part(cyl(scene, `${name}Secondary`, { height: 0.01, diameter: 0.036, tessellation: 16 }), mirror, mats.gold, apex);
  // Tower holding the mirror clear of the shield.
  part(CreateBox(`${name}Tower`, { width: 0.05, height: 0.05, depth: 0.1 }, scene), root, mats.dark, [0, 0.0, -0.06]);
  return root;
}

// Kepler: a photometer tube under a slanted sunshade, solar panels wrapped round the
// sunward side, a six-sided bus and a dish antenna at the foot. The tube points across
// the sunward axis; the panels face the Sun.
function kepler(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const up = (id, options, material, y, rotation = [0, 0, 0]) => part(cyl(scene, `${name}${id}`, options), root, material, [0, y, 0], rotation);
  up('Bus', { height: 0.18, diameter: 0.46, tessellation: 6 }, mats.goldFoil, -0.36);
  up('Tube', { height: 0.5, diameter: 0.34, tessellation: 24 }, mats.foil, -0.02);
  up('Shade', { height: 0.3, diameterTop: 0.4, diameterBottom: 0.36, tessellation: 24 }, mats.foil, 0.36);
  up('Mouth', { height: 0.01, diameter: 0.36, tessellation: 24 }, mats.dark, 0.512);
  up('Collar', { height: 0.012, diameter: 0.37, tessellation: 24 }, mats.grey, 0.215);
  // Four panels round the sunward half of the tube.
  for (const [i, angle] of [[0, -0.9], [1, -0.3], [2, 0.3], [3, 0.9]]) {
    part(CreateBox(`${name}Panel${i}`, { width: 0.115, height: 0.58, depth: 0.008 }, scene), root, mats.cells,
      [Math.sin(angle) * 0.2, 0.0, Math.cos(angle) * 0.2], [0, angle, 0]);
  }
  part(cyl(scene, `${name}Dish`, { height: 0.03, diameterTop: 0.2, diameterBottom: 0.04, tessellation: 20 }), root, mats.white, [0, -0.48, -0.08], [Math.PI, 0, 0]);
  part(CreateBox(`${name}Tracker`, { width: 0.05, height: 0.07, depth: 0.05 }, scene), root, mats.dark, [0.12, -0.3, -0.2]);
  return root;
}

// Chandra: a long tube that narrows toward the instruments at the back, a wider
// spacecraft module at the front with the sunshade door swung open, and two solar
// wings of three panels each. The tube lies across the sunward axis, like Hubble's.
function chandra(scene, name, mats) {
  const outer = new TransformNode(name, scene);
  const root = new TransformNode(`${name}Body`, scene);
  root.parent = outer;
  root.rotation.x = -QUARTER;
  const tube = (id, options, z, material) => part(cyl(scene, `${name}${id}`, { tessellation: 28, ...options }), root, material, [0, 0, z], [QUARTER, 0, 0]);
  tube('Module', { height: 0.2, diameter: 0.3 }, 0.34, mats.goldFoil);
  tube('Mouth', { height: 0.01, diameter: 0.2 }, 0.445, mats.dark);
  // Babylon's cylinder has diameterTop at +y, which the quarter turn lays toward +z.
  tube('Bench', { height: 0.62, diameterTop: 0.2, diameterBottom: 0.12 }, -0.07, mats.foil);
  tube('Ring', { height: 0.012, diameter: 0.31 }, 0.24, mats.grey);
  part(CreateBox(`${name}Instruments`, { width: 0.2, height: 0.16, depth: 0.14 }, scene), root, mats.goldFoil, [0, 0, -0.44]);
  part(cyl(scene, `${name}Radiator`, { height: 0.012, diameter: 0.24, tessellation: 4 }), root, mats.silver, [0, 0.09, -0.44]);
  const hinge = new TransformNode(`${name}Hinge`, scene);
  hinge.parent = root;
  hinge.position.set(0, 0.1, 0.445);
  hinge.rotation.x = -1.9;
  part(cyl(scene, `${name}Door`, { height: 0.008, diameter: 0.2, tessellation: 28 }), hinge, mats.goldFoil, [0, -0.1, 0], [QUARTER, 0, 0]);
  for (const s of [-1, 1]) {
    part(cyl(scene, `${name}Arm${s}`, { height: 0.1, diameter: 0.012, tessellation: 6 }), root, mats.grey, [s * 0.2, 0, 0.34], [0, 0, QUARTER]);
    for (let k = 0; k < 3; k++) {
      part(CreateBox(`${name}Wing${s}${k}`, { width: 0.115, height: 0.008, depth: 0.2 }, scene), root, mats.cells, [s * (0.31 + k * 0.12), 0, 0.34]);
    }
  }
  return outer;
}

// Euclid: a telescope tube standing on a gold service module, with one tall flat
// sunshield of solar cells down the sunward side and a dish underneath.
function euclid(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Service`, { height: 0.2, diameter: 0.5, tessellation: 6 }), root, mats.goldFoil, [0, -0.36, -0.03]);
  part(cyl(scene, `${name}Tube`, { height: 0.62, diameter: 0.36, tessellation: 24 }), root, mats.dark, [0, 0.05, -0.05]);
  part(cyl(scene, `${name}Baffle`, { height: 0.06, diameter: 0.38, tessellation: 24 }), root, mats.white, [0, 0.39, -0.05]);
  part(cyl(scene, `${name}Mouth`, { height: 0.01, diameter: 0.33, tessellation: 24 }), root, mats.dark, [0, 0.423, -0.05]);
  // The sunshield: solar cells facing the Sun, white behind.
  part(CreateBox(`${name}Shield`, { width: 0.52, height: 0.94, depth: 0.012 }, scene), root, mats.cells, [0, 0.0, 0.17]);
  part(CreateBox(`${name}ShieldBack`, { width: 0.52, height: 0.94, depth: 0.006 }, scene), root, mats.white, [0, 0.0, 0.158]);
  for (const s of [-1, 1]) {
    part(CreateBox(`${name}Brace${s}`, { width: 0.02, height: 0.5, depth: 0.2 }, scene), root, mats.grey, [s * 0.2, 0.0, 0.06]);
  }
  part(cyl(scene, `${name}Dish`, { height: 0.03, diameterTop: 0.18, diameterBottom: 0.04, tessellation: 20 }), root, mats.white, [0.1, -0.5, -0.05], [Math.PI, 0, 0]);
  return root;
}

// The International Space Station: a long truss with four pairs of solar wings at its
// ends, white radiators, and a row of crew modules across the middle.
function iss(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(CreateBox(`${name}Truss`, { width: 1, height: 0.035, depth: 0.035 }, scene), root, mats.grey);
  for (const s of [-1, 1]) {
    for (const [k, x] of [[0, 0.3], [1, 0.45]]) {
      for (const up of [-1, 1]) {
        part(CreateBox(`${name}Wing${s}${k}${up}`, { width: 0.11, height: 0.3, depth: 0.006 }, scene), root, mats.cells, [s * x, up * 0.19, 0.01]);
      }
    }
    part(CreateBox(`${name}Radiator${s}`, { width: 0.07, height: 0.006, depth: 0.2 }, scene), root, mats.white, [s * 0.12, 0, -0.13]);
  }
  for (const [i, z, d, length] of [[0, 0.14, 0.07, 0.2], [1, -0.02, 0.075, 0.12], [2, -0.2, 0.065, 0.22]]) {
    part(cyl(scene, `${name}Module${i}`, { height: length, diameter: d, tessellation: 16 }), root, mats.foil, [0, -0.04, z], [QUARTER, 0, 0]);
  }
  part(cyl(scene, `${name}Lab`, { height: 0.2, diameter: 0.065, tessellation: 16 }), root, mats.white, [0, -0.04, 0.2], [0, 0, QUARTER]);
  return root;
}

// Tiangong: three modules joined in a T, with a pair of solar wings on each.
function tiangong(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Core`, { height: 0.55, diameter: 0.12, tessellation: 18 }), root, mats.white, [0, 0, -0.1], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Hub`, { height: 0.14, diameter: 0.14, tessellation: 18 }), root, mats.foil, [0, 0, 0.2], [QUARTER, 0, 0]);
  for (const s of [-1, 1]) {
    part(cyl(scene, `${name}Lab${s}`, { height: 0.36, diameter: 0.12, tessellation: 18 }), root, mats.white, [s * 0.25, 0, 0.2], [0, 0, QUARTER]);
    part(CreateBox(`${name}LabWing${s}`, { width: 0.1, height: 0.5, depth: 0.006 }, scene), root, mats.cells, [s * 0.44, 0, 0.2]);
    part(CreateBox(`${name}CoreWing${s}`, { width: 0.3, height: 0.08, depth: 0.006 }, scene), root, mats.cells, [s * 0.22, 0, -0.3]);
  }
  return root;
}

// Sputnik 1: a polished ball with four whip antennas swept back.
function sputnik(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const ball = CreateSphere(`${name}Ball`, { diameter: 0.3, segments: 20 }, scene);
  part(ball, root, mats.chrome);
  for (const [i, x, y] of [[0, 1, 1], [1, -1, 1], [2, 1, -1], [3, -1, -1]]) {
    // Each whip leaves the ball and trails back at about 35 degrees from the axis.
    const d = [x * 0.4, y * 0.4, -0.82];
    const whip = part(cyl(scene, `${name}Whip${i}`, { height: 0.8, diameter: 0.012, tessellation: 5 }), root, mats.chrome, d.map((n) => n * 0.53));
    // Turn the cylinder's own axis (+y) onto d: about x, then about z.
    whip.rotation.set(Math.atan2(d[2], d[1]), 0, -Math.asin(d[0] / Math.hypot(...d)));
  }
  return root;
}

// MRO: a box bus with two big solar wings and a three-metre dish on top.
function mro(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(CreateBox(`${name}Bus`, { width: 0.2, height: 0.22, depth: 0.2 }, scene), root, mats.goldFoil);
  part(cyl(scene, `${name}Dish`, { height: 0.06, diameterTop: 0.36, diameterBottom: 0.06, tessellation: 24 }), root, mats.white, [0, 0.2, 0]);
  part(cyl(scene, `${name}Camera`, { height: 0.16, diameter: 0.08, tessellation: 14 }), root, mats.dark, [0, -0.17, 0.02]);
  for (const s of [-1, 1]) {
    part(CreateBox(`${name}Wing${s}`, { width: 0.36, height: 0.2, depth: 0.008 }, scene), root, mats.cells, [s * 0.3, 0, 0.02], [0, 0, s * 0.25]);
  }
  return root;
}

// Juno: a six-sided body with three long solar wings like a pinwheel and a dish on top.
function juno(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Bus`, { height: 0.1, diameter: 0.2, tessellation: 6 }), root, mats.goldFoil, [0, 0, 0], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Dish`, { height: 0.04, diameterTop: 0.2, diameterBottom: 0.04, tessellation: 20 }), root, mats.white, [0, 0, 0.07], [QUARTER, 0, 0]);
  for (let k = 0; k < 3; k++) {
    const arm = new TransformNode(`${name}Arm${k}`, scene);
    arm.parent = root;
    arm.rotation.z = (k * 2 * Math.PI) / 3;
    part(CreateBox(`${name}Wing${k}`, { width: 0.12, height: 0.4, depth: 0.006 }, scene), arm, mats.cells, [0, 0.3, 0]);
  }
  return root;
}

// Cassini: a four-metre white dish over a gold body, the Huygens probe on its side,
// a long magnetometer boom and three power units at the foot.
function cassini(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Dish`, { height: 0.08, diameterTop: 0.5, diameterBottom: 0.1, tessellation: 28 }), root, mats.white, [0, 0.3, 0]);
  part(cyl(scene, `${name}Body`, { height: 0.5, diameter: 0.2, tessellation: 12 }), root, mats.goldFoil);
  part(cyl(scene, `${name}Huygens`, { height: 0.05, diameter: 0.22, tessellation: 20 }), root, mats.goldFoil, [0, -0.02, 0.13], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Boom`, { height: 0.7, diameter: 0.012, tessellation: 5 }), root, mats.grey, [0.42, 0.1, 0], [0, 0, QUARTER]);
  part(cyl(scene, `${name}Engine`, { height: 0.1, diameterTop: 0.06, diameterBottom: 0.12, tessellation: 14 }), root, mats.dark, [0, -0.3, 0]);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3;
    part(cyl(scene, `${name}Power${k}`, { height: 0.14, diameter: 0.04, tessellation: 8 }), root, mats.dark, [Math.cos(a) * 0.14, -0.2, Math.sin(a) * 0.14]);
  }
  return root;
}

// Parker Solar Probe: a white heat shield held toward the Sun, a tapering body in its
// shadow, two small solar panels and four antennas peeking past the shield.
function parker(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Shield`, { height: 0.05, diameter: 0.56, tessellation: 6 }), root, mats.white, [0, 0, 0.3], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Truss`, { height: 0.2, diameterTop: 0.3, diameterBottom: 0.16, tessellation: 6 }), root, mats.grey, [0, 0, 0.17], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Bus`, { height: 0.34, diameter: 0.2, tessellation: 6 }), root, mats.goldFoil, [0, 0, -0.1], [QUARTER, 0, 0]);
  for (const s of [-1, 1]) {
    part(CreateBox(`${name}Panel${s}`, { width: 0.22, height: 0.008, depth: 0.12 }, scene), root, mats.cells, [s * 0.2, 0, -0.05], [0, 0, s * 0.6]);
    part(cyl(scene, `${name}Whip${s}a`, { height: 0.5, diameter: 0.008, tessellation: 4 }), root, mats.grey, [s * 0.3, 0.2, 0.2], [0, 0, -s * 0.9]);
    part(cyl(scene, `${name}Whip${s}b`, { height: 0.5, diameter: 0.008, tessellation: 4 }), root, mats.grey, [s * 0.3, -0.2, 0.2], [0, 0, s * 0.9]);
  }
  return root;
}

// The Tesla Roadster on its rocket stage: a red open car with Starman at the wheel.
function roadster(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Stage`, { height: 0.5, diameter: 0.26, tessellation: 20 }), root, mats.white, [0, -0.2, 0], [0, 0, 0]);
  const car = new TransformNode(`${name}Car`, scene);
  car.parent = root;
  car.position.set(0, 0.2, 0);
  car.rotation.x = -0.35;
  part(CreateBox(`${name}Body`, { width: 0.2, height: 0.06, depth: 0.46 }, scene), car, mats.red);
  part(CreateBox(`${name}Nose`, { width: 0.18, height: 0.04, depth: 0.14 }, scene), car, mats.red, [0, 0.03, 0.14], [0.25, 0, 0]);
  part(CreateBox(`${name}Tail`, { width: 0.19, height: 0.05, depth: 0.14 }, scene), car, mats.red, [0, 0.035, -0.15]);
  part(CreateBox(`${name}Glass`, { width: 0.18, height: 0.06, depth: 0.01 }, scene), car, mats.dark, [0, 0.07, 0.05], [-0.6, 0, 0]);
  part(CreateBox(`${name}Seats`, { width: 0.16, height: 0.02, depth: 0.12 }, scene), car, mats.dark, [0, 0.035, -0.03]);
  // Starman: a white suit and helmet, one arm on the door.
  part(CreateBox(`${name}Suit`, { width: 0.05, height: 0.07, depth: 0.04 }, scene), car, mats.white, [-0.045, 0.075, -0.04]);
  part(CreateSphere(`${name}Helmet`, { diameter: 0.045, segments: 10 }, scene), car, mats.white, [-0.045, 0.13, -0.035]);
  for (const [i, x, z] of [[0, 1, 1], [1, -1, 1], [2, 1, -1], [3, -1, -1]]) {
    part(cyl(scene, `${name}Wheel${i}`, { height: 0.03, diameter: 0.08, tessellation: 14 }), car, mats.dark, [x * 0.1, -0.03, z * 0.15], [0, 0, QUARTER]);
  }
  return root;
}

// New Horizons: a gold wedge the size of a piano, a white dish on top, and one black
// power unit sticking out of a corner.
function newHorizons(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Bus`, { height: 0.12, diameter: 0.5, tessellation: 3 }), root, mats.goldFoil, [0, 0, 0], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Dish`, { height: 0.07, diameterTop: 0.42, diameterBottom: 0.08, tessellation: 24 }), root, mats.white, [0, 0, 0.12], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Feed`, { height: 0.14, diameter: 0.02, tessellation: 6 }), root, mats.grey, [0, 0, 0.22], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Power`, { height: 0.32, diameter: 0.07, tessellation: 10 }), root, mats.dark, [0.36, 0, 0], [0, 0, QUARTER]);
  part(CreateBox(`${name}Camera`, { width: 0.06, height: 0.06, depth: 0.14 }, scene), root, mats.goldFoil, [-0.14, -0.16, -0.02]);
  return root;
}

// Pioneer 10: a 2.7-metre dish on a small six-sided body, two power units out on
// booms, and a long boom for the magnetometer.
function pioneer(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(cyl(scene, `${name}Dish`, { height: 0.08, diameterTop: 0.5, diameterBottom: 0.1, tessellation: 26 }), root, mats.white, [0, 0, 0.06], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Feed`, { height: 0.2, diameter: 0.015, tessellation: 5 }), root, mats.grey, [0, 0, 0.2], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Bus`, { height: 0.1, diameter: 0.24, tessellation: 6 }), root, mats.goldFoil, [0, 0, -0.04], [QUARTER, 0, 0]);
  part(CreateBox(`${name}Plaque`, { width: 0.07, height: 0.05, depth: 0.004 }, scene), root, mats.gold, [0.06, -0.11, -0.04], [0, 0, 0]);
  for (const s of [-1, 1]) {
    part(cyl(scene, `${name}Boom${s}`, { height: 0.34, diameter: 0.01, tessellation: 5 }), root, mats.grey, [s * 0.26, 0.1, -0.04], [0, 0, QUARTER - s * 0.35]);
    part(cyl(scene, `${name}Power${s}`, { height: 0.1, diameter: 0.045, tessellation: 8 }), root, mats.dark, [s * 0.44, 0.165, -0.04], [0, 0, QUARTER - s * 0.35]);
  }
  part(cyl(scene, `${name}MagBoom`, { height: 0.6, diameter: 0.008, tessellation: 4 }), root, mats.grey, [0, -0.4, -0.04]);
  return root;
}

export function createCraft(scene, craftList) {
  const mats = {
    white: paint(scene, 'craftWhite', '#e8e6e0'),
    silver: paint(scene, 'craftSilver', '#8f939c', 0.15),
    grey: paint(scene, 'craftGrey', '#8a8d93'),
    dark: paint(scene, 'craftDark', '#2d2f36', 0.5),
    gold: paint(scene, 'craftGold', '#e2b648', 0.5),
    solar: paint(scene, 'craftSolar', '#27408f', 0.5),
    shield: paint(scene, 'craftShield', '#6f6384', 0.12),
    red: paint(scene, 'craftRed', '#b3121d', 0.35),
    chrome: paint(scene, 'craftChrome', '#d9dde4', 0.3),
    cells: textured(scene, 'craftCells', solarCells(scene), 0.45),
    foil: textured(scene, 'craftFoil', foil(scene), 0.3),
    goldFoil: textured(scene, 'craftGoldFoil', foil(scene, 'craftGoldFoilMap', '#b8892f', [1, 0.78, 0.36]), 0.3),
  };
  const build = {
    voyager1: voyager, voyager2: voyager, hubble, jwst: webb, kepler, chandra, euclid,
    iss, tiangong, sputnik, mro, juno, cassini, parker, roadster, newHorizons, pioneer10: pioneer,
  };
  const nodes = new Map(craftList.map((c) => [c.id, build[c.id](scene, c.id, mats)]));

  // craft: this frame's positions (km); position: the traveler (km); sunPosition (km).
  // jolt: { id, push, tilt } for the craft being docked with (core/dock.js latchJolt).
  function update(craft, position, sunPosition, jolt = null) {
    for (const c of craft) {
      const node = nodes.get(c.id);
      const rel = c.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
      const distanceKm = Math.hypot(...rel) * KM_PER_UNIT;
      const rule = RULES[c.id];
      node.setEnabled(distanceKm < rule.visibleKm);
      if (!node.isEnabled()) continue;
      const sizeKm = Math.min(rule.maxKm, Math.max(CRAFT_SIZE_KM, distanceKm * APPARENT));
      node.scaling.setAll(sizeKm / KM_PER_UNIT);
      node.position.set(rel[0], rel[1], rel[2]);
      node.lookAt(new Vector3(...sunPosition.map((n, i) => (n - position[i]) / KM_PER_UNIT)));
      if (jolt?.id === c.id && (jolt.push || jolt.tilt)) {
        // Knocked sideways as the traveler sees it (a shove along the line of sight
        // would not show), a little away, and tipped about its own sunward axis.
        const away = new Vector3(rel[0], rel[1], rel[2]).normalize();
        const across = Vector3.Cross(away, Vector3.Up()).normalize();
        const reach = (jolt.push * sizeKm) / KM_PER_UNIT;
        node.position.addInPlace(across.scale(reach)).addInPlace(away.scale(reach * 0.5));
        node.rotate(Vector3.Forward(), jolt.tilt);
      }
    }
  }

  return { update };
}
