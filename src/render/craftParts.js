import {
  TransformNode, StandardMaterial, DynamicTexture, Color3, Vector3, Quaternion, Mesh,
  CreateCylinder, CreateBox, CreateLathe,
} from './babylon.js';

// The building blocks for the spacecraft and landers (craftModels.js, siteModels.js):
// paints and drawn sheets, and the parts that recur from one machine to the next: a
// dish with its feed, a lattice boom, a solar wing, a finned power unit, a nozzle.
// No image files: every surface is a flat paint or a small canvas drawn here.

export const QUARTER = Math.PI / 2;

function paint(scene, name, hex, glow = 0.25) {
  const m = new StandardMaterial(name, scene);
  const c = Color3.FromHexString(hex);
  m.diffuseColor = c;
  m.emissiveColor = c.scale(glow);
  m.specularColor = new Color3(0.25, 0.25, 0.25);
  return m;
}

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

// The flag of Korea, for Danuri: white, the red and blue taeguk in the middle, a
// trigram toward each corner. Drawn in the flag's own 3 by 2 units, stretched over the
// square texture (the panel it goes on is 3 by 2).
function taegukgi(scene) {
  return drawn(scene, 'craftTaegukgiMap', 256, (ctx, size) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.scale(size / 3, size / 2);
    ctx.translate(1.5, 1);
    const tilt = Math.atan2(2, 3);
    ctx.save();
    ctx.rotate(tilt);
    ctx.fillStyle = '#cd2e3a';
    ctx.beginPath(); ctx.arc(0, 0, 0.5, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#0047a0';
    ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#cd2e3a';
    ctx.beginPath(); ctx.arc(-0.25, 0, 0.25, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#0047a0';
    ctx.beginPath(); ctx.arc(0.25, 0, 0.25, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
    // Bars from the middle outward: 1 whole, 0 broken. Upper left geon, lower right
    // gon, upper right gam, lower left ri.
    const trigrams = [[Math.PI + tilt, [1, 1, 1]], [tilt, [0, 0, 0]], [-tilt, [0, 1, 0]], [Math.PI - tilt, [1, 0, 1]]];
    ctx.fillStyle = '#111111';
    for (const [angle, bars] of trigrams) {
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0.5 + 0.25 + 1 / 6, 0);
      bars.forEach((whole, k) => {
        const x = (k - 1) / 8 - 1 / 24;
        if (whole) ctx.fillRect(x, -0.25, 1 / 12, 0.5);
        else {
          ctx.fillRect(x, -0.25, 1 / 12, 0.5 / 2 - 1 / 48);
          ctx.fillRect(x, 1 / 48, 1 / 12, 0.5 / 2 - 1 / 48);
        }
      });
      ctx.restore();
    }
    ctx.restore();
  });
}

const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

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

// Crinkled insulation in panels, with seams and a few darker patches.
// base: the sheet's colour; silver for most craft, gold for Kapton blankets.
function foil(scene, name, base, tint) {
  return drawn(scene, name, 256, (ctx, size) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    const rand = seeded(9151);
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

// White painted skin: plates with seams, rivet rows and a few hatches and marks.
function plating(scene) {
  return drawn(scene, 'craftPlating', 256, (ctx, size) => {
    ctx.fillStyle = '#e6e4de';
    ctx.fillRect(0, 0, size, size);
    const rand = seeded(377);
    for (let n = 0; n < 60; n++) {
      const v = 205 + Math.floor(rand() * 40);
      ctx.fillStyle = `rgba(${v},${v},${v - 4},0.5)`;
      ctx.fillRect(Math.floor(rand() * 8) * 32, Math.floor(rand() * 8) * 32, 32, 32);
    }
    ctx.fillStyle = 'rgba(96,100,110,0.6)';
    for (let i = 0; i <= 8; i++) {
      ctx.fillRect(0, i * 32, size, 1);
      ctx.fillRect(i * 32, 0, 1, size);
    }
    ctx.fillStyle = 'rgba(120,124,132,0.7)';
    for (let i = 0; i < 8; i++) for (let j = 4; j < size; j += 8) ctx.fillRect(j, i * 32 + 4, 1.4, 1.4);
    for (let n = 0; n < 7; n++) {
      ctx.strokeStyle = 'rgba(70,74,84,0.7)';
      ctx.strokeRect(8 + Math.floor(rand() * 7) * 32, 8 + Math.floor(rand() * 7) * 32, 14, 16);
    }
  });
}

// The shared paints and sheets, made once per scene.
const MATERIALS = new WeakMap();
export function craftMaterials(scene) {
  if (MATERIALS.has(scene)) return MATERIALS.get(scene);
  const mats = {
    white: paint(scene, 'craftWhite', '#e8e6e0'),
    silver: paint(scene, 'craftSilver', '#8f939c', 0.15),
    grey: paint(scene, 'craftGrey', '#8a8d93'),
    dark: paint(scene, 'craftDark', '#2d2f36', 0.5),
    black: paint(scene, 'craftBlack', '#15161a', 0.6),
    gold: paint(scene, 'craftGold', '#e2b648', 0.5),
    solar: paint(scene, 'craftSolar', '#27408f', 0.5),
    shield: paint(scene, 'craftShield', '#6f6384', 0.12),
    lamp: paint(scene, 'craftLamp', '#fff4d6', 0.9),
    tail: paint(scene, 'craftTail', '#ff3b24', 0.9),
    red: paint(scene, 'craftRed', '#c4302b', 0.4),
    orange: paint(scene, 'craftOrange', '#d9792b', 0.4),
    chrome: paint(scene, 'craftChrome', '#d9dde4', 0.3),
    cells: textured(scene, 'craftCells', solarCells(scene), 0.45),
    foil: textured(scene, 'craftFoil', foil(scene, 'craftFoilMap', '#b4b8c0', [1, 1, 1.04]), 0.3),
    goldFoil: textured(scene, 'craftGoldFoil', foil(scene, 'craftGoldFoilMap', '#b8892f', [1, 0.78, 0.36]), 0.3),
    blackFoil: textured(scene, 'craftBlackFoil', foil(scene, 'craftBlackFoilMap', '#2a2b30', [0.3, 0.3, 0.33]), 0.5),
    plate: textured(scene, 'craftPlate', plating(scene), 0.28),
    taegukgi: textured(scene, 'craftTaegukgi', taegukgi(scene), 0.6),
  };
  mats.chrome.specularColor = new Color3(0.9, 0.9, 0.9);
  mats.chrome.specularPower = 40;
  // Car paint: a deep cherry red with a sharp highlight.
  mats.paint = paint(scene, 'craftPaint', '#b3121d', 0.35);
  mats.paint.specularColor = new Color3(0.9, 0.9, 0.9);
  mats.paint.specularPower = 48;
  mats.glass = paint(scene, 'craftGlass', '#9fc4d8', 0.3);
  mats.glass.alpha = 0.4;
  MATERIALS.set(scene, mats);
  return mats;
}

export function part(mesh, parent, material, position = [0, 0, 0], rotation = [0, 0, 0], scaling = [1, 1, 1]) {
  mesh.parent = parent;
  mesh.material = material;
  mesh.position = new Vector3(...position);
  mesh.rotation = new Vector3(...rotation);
  mesh.scaling = new Vector3(...scaling);
  mesh.isPickable = false;
  return mesh;
}

export const cyl = (scene, name, options) => CreateCylinder(name, options, scene);

export function group(scene, name, parent, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const node = new TransformNode(name, scene);
  node.parent = parent;
  node.position = new Vector3(...position);
  node.rotation = new Vector3(...rotation);
  return node;
}

// Turn a part's own axis (+y) to point along `direction`.
export function aim(node, direction) {
  node.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(...direction).normalize(), new Quaternion());
  return node;
}

export function box(scene, name, parent, material, [width, height, depth], position = [0, 0, 0], rotation = [0, 0, 0]) {
  return part(CreateBox(name, { width, height, depth }, scene), parent, material, position, rotation);
}

// A cylinder or cone standing on y at `position`; `along` lays its axis another way.
export function drum(scene, name, parent, material, options, position = [0, 0, 0], along = null) {
  const mesh = part(cyl(scene, name, { tessellation: 20, ...options }), parent, material, position);
  if (along) aim(mesh, along);
  return mesh;
}

// A thin cylinder from one point to another.
export function rod(scene, name, parent, material, from, to, diameter, tessellation = 6) {
  const d = to.map((n, i) => n - from[i]);
  const length = Math.hypot(...d);
  const mesh = part(cyl(scene, name, { height: length, diameter, tessellation }), parent, material, from.map((n, i) => n + d[i] / 2));
  return aim(mesh, d);
}

const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Two unit vectors square to `axis` and to each other.
function across(axis) {
  const a = unit(cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  return [a, cross(axis, a)];
}

// A parabolic dish facing `toward`, with a hub behind it and, if `feed`, three struts
// holding a small reflector at its focus.
export function dish(scene, name, parent, mats, {
  at = [0, 0, 0], toward = [0, 0, 1], diameter = 0.5, depth = diameter * 0.16, feed = true, material = mats.white,
} = {}) {
  const node = aim(group(scene, name, parent, at), toward);
  const radius = diameter / 2;
  const shape = [];
  for (let i = 0; i <= 8; i++) {
    const r = (radius * i) / 8;
    shape.push(new Vector3(r, depth * (r / radius) ** 2, 0));
  }
  const bowl = CreateLathe(`${name}Bowl`, { shape, tessellation: 28, sideOrientation: Mesh.DOUBLESIDE }, scene);
  part(bowl, node, material);
  drum(scene, `${name}Rim`, node, mats.grey, { height: diameter * 0.012, diameter: diameter * 1.01, tessellation: 28 }, [0, depth, 0]);
  drum(scene, `${name}Hub`, node, mats.dark, { height: diameter * 0.1, diameterTop: diameter * 0.3, diameterBottom: diameter * 0.18 }, [0, -diameter * 0.05, 0]);
  if (feed) {
    const focus = [0, diameter * 0.42, 0];
    for (let k = 0; k < 3; k++) {
      const a = (k * 2 * Math.PI) / 3 + 0.5;
      rod(scene, `${name}Strut${k}`, node, mats.grey, [Math.cos(a) * radius * 0.9, depth * 0.81, Math.sin(a) * radius * 0.9], focus, diameter * 0.014, 5);
    }
    drum(scene, `${name}Sub`, node, mats.white, { height: diameter * 0.04, diameterTop: diameter * 0.04, diameterBottom: diameter * 0.16 }, focus);
    drum(scene, `${name}Horn`, node, mats.dark, { height: diameter * 0.14, diameterTop: diameter * 0.03, diameterBottom: diameter * 0.07 }, [0, diameter * 0.07, 0]);
  }
  return node;
}

// A lattice boom of square section: four long rods tied by a square and a diagonal
// zigzag in each bay.
export function truss(scene, name, parent, material, from, to, width, bays, thick = width * 0.12) {
  const axis = unit(sub(to, from));
  const [a, b] = across(axis);
  const corner = (t, i) => {
    const s = [[1, 1], [-1, 1], [-1, -1], [1, -1]][i % 4];
    return from.map((n, k) => n + (to[k] - n) * t + (a[k] * s[0] + b[k] * s[1]) * width * 0.5);
  };
  for (let i = 0; i < 4; i++) rod(scene, `${name}Long${i}`, parent, material, corner(0, i), corner(1, i), thick, 4);
  for (let bay = 0; bay <= bays; bay++) {
    const t = bay / bays;
    for (let i = 0; i < 4; i++) {
      rod(scene, `${name}Tie${bay}_${i}`, parent, material, corner(t, i), corner(t, i + 1), thick * 0.8, 4);
      if (bay < bays) {
        const flip = (bay + i) % 2;
        rod(scene, `${name}Brace${bay}_${i}`, parent, material, corner(t, i + flip), corner(t + 1 / bays, i + 1 - flip), thick * 0.7, 4);
      }
    }
  }
}

// A solar wing: `panels` panels in a row from `from` toward `to`, `width` across,
// facing `face`; cells on the front, bare sheet behind, hinges between panels and a
// yoke at the root.
export function wing(scene, name, parent, mats, {
  from, to, width, panels = 3, face = [0, 0, 1], yoke = 0.12, back = mats.silver,
}) {
  const span = sub(to, from);
  const length = Math.hypot(...span);
  const along = unit(span);
  const normal = unit(face);
  const side = cross(normal, along);
  const node = group(scene, name, parent, from);
  // Local axes: x along the wing, y across it, z out of its face.
  node.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(new Vector3(...along), new Vector3(...side), new Vector3(...normal));
  const start = length * yoke;
  const each = (length - start) / panels;
  for (let k = 0; k < panels; k++) {
    const x = start + each * (k + 0.5);
    box(scene, `${name}Cells${k}`, node, mats.cells, [each * 0.96, width, 0.004], [x, 0, 0.003]);
    box(scene, `${name}Back${k}`, node, back, [each * 0.96, width, 0.004], [x, 0, -0.002]);
    box(scene, `${name}Edge${k}a`, node, mats.grey, [each * 0.96, 0.008, 0.012], [x, width / 2, 0]);
    box(scene, `${name}Edge${k}b`, node, mats.grey, [each * 0.96, 0.008, 0.012], [x, -width / 2, 0]);
    box(scene, `${name}Hinge${k}`, node, mats.grey, [0.008, width * 0.9, 0.014], [start + each * k, 0, 0]);
  }
  // The yoke: two arms spreading from the root to the first panel.
  if (start > 0) {
    for (const s of [-1, 1]) rod(scene, `${name}Yoke${s}`, node, mats.grey, [0, 0, 0], [start, s * width * 0.35, 0], 0.012, 5);
  }
  return node;
}

// A radioisotope power unit: a dark can with cooling fins along it.
export function rtg(scene, name, parent, mats, from, to, diameter) {
  rod(scene, `${name}Can`, parent, mats.black, from, to, diameter * 0.55, 10);
  const axis = unit(sub(to, from));
  const [a, b] = across(axis);
  const middle = from.map((n, i) => (n + to[i]) / 2);
  const length = Math.hypot(...sub(to, from));
  for (let k = 0; k < 4; k++) {
    const angle = (k * Math.PI) / 4;
    const blade = part(CreateBox(`${name}Fin${k}`, { width: diameter, height: length * 0.9, depth: diameter * 0.04 }, scene), parent, mats.dark, middle);
    const x = a.map((n, i) => n * Math.cos(angle) + b[i] * Math.sin(angle));
    blade.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(new Vector3(...x), new Vector3(...axis), new Vector3(...cross(x, axis)));
  }
  for (const end of [from, to]) rod(scene, `${name}Cap${end[0]}${end[1]}`, parent, mats.grey, end, end.map((n, i) => n + axis[i] * diameter * 0.06), diameter * 0.7, 10);
}

// A rocket nozzle: a bell opening along `direction`, its throat at `at`.
export function nozzle(scene, name, parent, material, at, direction, length, mouth) {
  const d = unit(direction);
  const centre = at.map((n, i) => n + d[i] * length * 0.5);
  const mesh = part(cyl(scene, name, { height: length, diameterTop: mouth, diameterBottom: mouth * 0.3, tessellation: 12 }), parent, material, centre);
  return aim(mesh, d);
}

// Little thrusters in pairs round a body, each a tiny dark bell.
export function thrusters(scene, name, parent, mats, spots, size = 0.02) {
  spots.forEach(([at, direction], i) => nozzle(scene, `${name}${i}`, parent, mats.dark, at, direction, size * 1.4, size));
}

// A model is built from dozens of small parts. Drawing each one separately would cost
// a draw call apiece, so once built, the parts that share a paint are fused into one
// mesh each. keep: nodes whose parts must stay separate (none so far move).
export function fuse(scene, root) {
  const byMaterial = new Map();
  for (const mesh of root.getChildMeshes(false)) {
    mesh.computeWorldMatrix(true);
    const list = byMaterial.get(mesh.material) ?? [];
    list.push(mesh);
    byMaterial.set(mesh.material, list);
  }
  for (const [material, list] of byMaterial) {
    const merged = list.length > 1 ? Mesh.MergeMeshes(list, true, true) : list[0];
    if (!merged) continue;
    if (list.length === 1) {
      // A lone part keeps its own transform; lift it to the root as it stands.
      merged.setParent(root);
    } else {
      merged.parent = root;
    }
    merged.material = material;
    merged.isPickable = false;
    merged.name = `${root.name}_${material.name}`;
  }
  for (const node of root.getChildTransformNodes(false)) {
    if (!(node instanceof Mesh)) node.dispose();
  }
  return root;
}
