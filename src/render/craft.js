import {
  TransformNode, StandardMaterial, Color3, Vector3, CreateCylinder, CreateBox,
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

// Hubble: a silver tube with its aperture door open and two solar wings. It never
// looks at the Sun, so the tube lies across the sunward axis.
function hubble(scene, name, mats) {
  const outer = new TransformNode(name, scene);
  const root = new TransformNode(`${name}Body`, scene);
  root.parent = outer;
  root.rotation.x = -QUARTER;
  part(cyl(scene, `${name}Tube`, { height: 0.62, diameter: 0.2, tessellation: 20 }), root, mats.silver, [0, 0, 0.12], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Aft`, { height: 0.3, diameter: 0.26, tessellation: 20 }), root, mats.silver, [0, 0, -0.32], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Mouth`, { height: 0.01, diameter: 0.18, tessellation: 20 }), root, mats.dark, [0, 0, 0.432], [QUARTER, 0, 0]);
  part(cyl(scene, `${name}Door`, { height: 0.012, diameter: 0.2, tessellation: 20 }), root, mats.silver, [0, 0.12, 0.46], [0.5, 0, 0]);
  for (const s of [-1, 1]) {
    part(cyl(scene, `${name}Arm${s}`, { height: 0.12, diameter: 0.012, tessellation: 5 }), root, mats.grey, [s * 0.15, 0, -0.05], [0, 0, QUARTER]);
    part(CreateBox(`${name}Wing${s}`, { width: 0.16, height: 0.012, depth: 0.5 }, scene), root, mats.solar, [s * 0.29, 0, -0.05]);
  }
  return outer;
}

// Webb: a gold hexagonal mirror standing on a five-layer kite-shaped sunshield.
function webb(scene, name, mats) {
  const root = new TransformNode(name, scene);
  for (let i = 0; i < 3; i++) {
    part(cyl(scene, `${name}Shield${i}`, { height: 0.006, diameter: 1, tessellation: 4 }), root, i === 0 ? mats.shield : mats.silver, [0, 0, 0.04 - i * 0.03], [QUARTER, 0, 0], [0.62, 1, 1]);
  }
  // Mirror: seven gold hexagons (centre and six round it), facing sideways, away from the Sun's heat.
  const mirror = new TransformNode(`${name}Mirror`, scene);
  mirror.parent = root;
  mirror.position.set(0, 0.02, -0.3);
  const hex = 0.15;
  const spots = [[0, 0]];
  for (let k = 0; k < 6; k++) spots.push([Math.cos((k * Math.PI) / 3 + Math.PI / 6) * hex * 0.9, Math.sin((k * Math.PI) / 3 + Math.PI / 6) * hex * 0.9]);
  spots.forEach(([x, z], i) => {
    part(cyl(scene, `${name}Hex${i}`, { height: 0.012, diameter: hex, tessellation: 6 }), mirror, i === 0 ? mats.dark : mats.gold, [x, 0, z]);
  });
  mirror.rotation.x = 0.25;
  // Secondary mirror on three struts.
  for (const [x, z] of [[-0.18, 0.1], [0.18, 0.1], [0, -0.22]]) {
    const strut = part(cyl(scene, `${name}Strut`, { height: 0.34, diameter: 0.008, tessellation: 4 }), mirror, mats.dark, [x / 2, 0.16, z / 2]);
    strut.rotation.set(Math.atan2(z, 0.32), 0, -Math.atan2(x, 0.32));
  }
  part(cyl(scene, `${name}Secondary`, { height: 0.01, diameter: 0.05, tessellation: 12 }), mirror, mats.gold, [0, 0.32, 0]);
  return root;
}

export function createCraft(scene, craftList) {
  const mats = {
    white: paint(scene, 'craftWhite', '#e8e6e0'),
    silver: paint(scene, 'craftSilver', '#b9bcc4'),
    grey: paint(scene, 'craftGrey', '#8a8d93'),
    dark: paint(scene, 'craftDark', '#2d2f36', 0.5),
    gold: paint(scene, 'craftGold', '#e2b648', 0.5),
    solar: paint(scene, 'craftSolar', '#27408f', 0.5),
    shield: paint(scene, 'craftShield', '#c9a6d8', 0.45),
  };
  const build = { voyager1: voyager, voyager2: voyager, hubble, jwst: webb };
  const nodes = new Map(craftList.map((c) => [c.id, build[c.id](scene, c.id, mats)]));

  // craft: this frame's positions (km); position: the traveler (km); sunPosition (km).
  function update(craft, position, sunPosition) {
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
    }
  }

  return { update };
}
