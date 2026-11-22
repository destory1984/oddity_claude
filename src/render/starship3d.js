import { Quaternion, Color3, StandardMaterial, TransformNode, DynamicTexture, Mesh, CreateCylinder, CreateBox, CreateLathe, CreatePlane, Vector3, Texture, Constants } from './babylon.js';

// Starship's fifth flight, 13 October 2024 (the user, 2026-11-22: "스페이스X 이륙 -> 착륙은
// 어때?", "1안", "3", "만들어"): the booster (Super Heavy, 71 m, 9 m across, 33 engines,
// four grid fins), the ship on it (Starship, 50 m, black tiles on one side, two flaps fore
// and two aft) and, for the ground (render/starshipStage.js), the launch tower with its two
// catching arms and the launch mount. No marks or names on them. Built in metres; the
// booster and the ship lie along +x, the engines at x = 0 and the nose at x = length, +y
// the ship's tiled side (as render/columbia3d.js does, for render/craft.js to place them);
// the tower stands up +y.

const PI = Math.PI;
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
function paintTexture(scene, name, w, h, paint) {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, false);
  paint(tex.getContext(), w, h, seeded(name.length * 7907 + w));
  tex.update(false);
  tex.anisotropicFilteringLevel = 8;
  return tex;
}
function material(scene, name, tex, { spec = 0.3, power = 32, color = null, emissive = 0 } = {}) {
  const m = new StandardMaterial(name, scene);
  if (tex) m.diffuseTexture = tex;
  if (color) m.diffuseColor = Color3.FromArray(color);
  m.specularColor = new Color3(spec, spec, spec);
  m.specularPower = power;
  if (emissive) m.emissiveColor = new Color3(emissive, emissive, emissive);
  // (Self-lit by its own picture, so that dark tiles stay dark.)
  if (emissive && tex) m.emissiveTexture = tex;
  m.backFaceCulling = false;
  return m;
}
// Stainless steel in rings of sheet, welded round (y is along the vehicle: rows of rings
// every `ring` pixels), a little uneven from sheet to sheet, the long cover of the cables
// down one side (at u = 0.25), soot and streaks. Frost (frost > 0): the white of the cold
// propellant inside, below `frostTop` (0 to 1 of v).
function paintSteel(rings, { soot = 0.25, frostTop = 0, chine = true } = {}) {
  return (g, w, h, rnd) => {
    const ring = h / rings;
    for (let r = 0; r < rings; r++) {
      const k = Math.round((rnd() - 0.5) * 26);
      for (let x = 0; x < w; x += 32) {
        const j = k + Math.round((rnd() - 0.5) * 10);
        const band = g.createLinearGradient(x, 0, x + 32, 0);
        band.addColorStop(0, `rgb(${170 + j},${172 + j},${176 + j})`);
        band.addColorStop(0.5, `rgb(${196 + j},${198 + j},${202 + j})`);
        band.addColorStop(1, `rgb(${168 + j},${170 + j},${175 + j})`);
        g.fillStyle = band;
        g.fillRect(x, r * ring, 32, ring);
      }
      g.fillStyle = 'rgba(70,70,74,.55)';
      g.fillRect(0, r * ring, w, 2);
    }
    // Vertical seams between sheets, staggered ring to ring.
    g.fillStyle = 'rgba(80,80,86,.35)';
    for (let r = 0; r < rings; r++) for (let n = 0; n < 4; n++) g.fillRect(((n + (r % 2) * 0.5) / 4) * w, r * ring, 2, ring);
    if (chine) {
      const x0 = 0.25 * w;
      g.fillStyle = 'rgba(120,122,128,1)';
      g.fillRect(x0 - 10, 0, 20, h);
      g.fillStyle = 'rgba(60,60,66,.6)';
      g.fillRect(x0 - 11, 0, 2, h);
      g.fillRect(x0 + 9, 0, 2, h);
    }
    // Soot and dark streaks running back (down) from what sticks out.
    for (let i = 0; i < 90 * soot; i++) {
      const x = rnd() * w, y = rnd() * h, len = 30 + rnd() * 200;
      const s = g.createLinearGradient(x, y, x, y + len);
      s.addColorStop(0, `rgba(50,44,38,${(0.08 + rnd() * 0.18).toFixed(3)})`);
      s.addColorStop(1, 'rgba(50,44,38,0)');
      g.fillStyle = s;
      g.fillRect(x, y, 3 + rnd() * 14, len);
    }
    if (frostTop > 0) {
      // (Canvas y runs down while v runs up: the frost from the foot, h, up to (1 - frostTop) h.)
      const top = (1 - frostTop) * h;
      for (let i = 0; i < 1400; i++) {
        const x = rnd() * w, y = top + rnd() * (h - top), r = 4 + rnd() * 26;
        const f = g.createRadialGradient(x, y, 0, x, y, r);
        f.addColorStop(0, `rgba(240,244,248,${(0.25 + rnd() * 0.35).toFixed(3)})`);
        f.addColorStop(1, 'rgba(240,244,248,0)');
        g.fillStyle = f;
        g.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
    }
  };
}
// The ship's skin: steel, and on the windward half (u 0.5 → 1, +y) the black hexagonal
// tiles, a few lighter ones missing or new.
function paintShip(g, w, h, rnd) {
  paintSteel(18, { soot: 0.15, chine: false })(g, w, h, rnd);
  const s = 9;
  for (let row = 0, y = 0; y < h; row++, y += s * 1.5) {
    for (let x = w * 0.5 + (row % 2) * s * 0.87; x < w; x += s * 1.74) {
      const k = Math.round(rnd() * 22);
      g.fillStyle = rnd() < 0.015 ? `rgb(${150 + k},${150 + k},${150 + k})` : `rgb(${18 + k},${18 + k},${21 + k})`;
      g.beginPath();
      for (let a = 0; a < 6; a++) g.lineTo(x + s * Math.cos(a * PI / 3 + PI / 6), y + s * Math.sin(a * PI / 3 + PI / 6));
      g.fill();
    }
  }
}
// A grid fin: a thick frame with a grid of square cells through it (transparent).
function paintGrid(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#5d5f63';
  const bar = 14;
  for (let x = 0; x <= w; x += (w - bar) / 5) g.fillRect(Math.min(x, w - bar), 0, bar, h);
  for (let y = 0; y <= h; y += (h - bar) / 6) g.fillRect(0, Math.min(y, h - bar), w, bar);
  g.fillStyle = '#4a4b4f';
  g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22); g.fillRect(0, 0, 22, h); g.fillRect(w - 22, 0, 22, h);
  g.fillStyle = 'rgba(30,26,22,.45)';
  g.fillRect(0, h - 60, w, 60);
}

// The engines' fire: for each engine a short bright core and a longer plume, drawn as
// added light; and one wide plume round the whole cluster. pose: on (0 to 1), air (1 low
// in thick air: long and narrow, orange; 0 in vacuum: wide, faint, blue-white).
function soft(scene, name, w, h, paint) {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, false);
  paint(tex.getContext(), w, h);
  tex.update();
  return tex;
}
function glow(scene, name, tex, color) {
  const m = new StandardMaterial(name, scene);
  m.disableLighting = true;
  m.emissiveTexture = tex;
  m.opacityTexture = tex;
  m.emissiveColor = color;
  m.backFaceCulling = false;
  m.alphaMode = Constants.ALPHA_ADD;
  m.disableDepthWrite = true;
  return m;
}
function fireOf(scene, name, root, engines) {
  // Along a cylinder v runs from its foot (0) to its head (1): bright at the head (the nozzle).
  const lengthTex = soft(scene, `${name}FireTex`, 32, 256, (g, w, h) => {
    const f = g.createLinearGradient(0, 0, 0, h);
    f.addColorStop(0, 'rgba(255,255,255,1)');
    f.addColorStop(0.15, 'rgba(255,250,235,.9)');
    f.addColorStop(0.5, 'rgba(255,200,140,.4)');
    f.addColorStop(1, 'rgba(255,170,110,0)');
    g.fillStyle = f;
    g.fillRect(0, 0, w, h);
  });
  const core = glow(scene, `${name}FireCore`, lengthTex, new Color3(1, 0.95, 0.85));
  const plume = glow(scene, `${name}FirePlume`, lengthTex, new Color3(1, 0.62, 0.3));
  const cones = engines.map(([y, z, d], i) => {
    const c = CreateCylinder(`${name}Core${i}`, { height: 1, diameterTop: d * 0.8, diameterBottom: d * 0.5, tessellation: 12, cap: Mesh.NO_CAP }, scene);
    c.material = core;
    c.parent = root;
    c.rotation.z = -PI / 2;
    c.isPickable = false;
    c.metadata = { light: true, y, z, d };
    c.setEnabled(false);
    return c;
  });
  const span = Math.max(...engines.map(([y, z, d]) => Math.hypot(y, z) + d / 2)) * 2;
  const big = CreateCylinder(`${name}Plume`, { height: 1, diameterTop: span, diameterBottom: span * 1.6, tessellation: 32, cap: Mesh.NO_CAP }, scene);
  big.material = plume;
  big.parent = root;
  big.rotation.z = -PI / 2;
  big.isPickable = false;
  big.metadata = { light: true };
  big.setEnabled(false);
  return ({ on = 0, lit = null, air = 1, at = 0 }) => {
    const flicker = 0.9 + 0.1 * Math.sin(at * 53) * Math.sin(at * 31);
    cones.forEach((c, i) => {
      const shown = on > 0.02 && (!lit || lit(i));
      c.setEnabled(shown);
      if (!shown) return;
      const len = (4 + 12 * air) * on * flicker;
      const wide = 1.1 * air + (1 - air) * 2.2;
      c.scaling.set(wide, len, wide);
      c.position.set(-1.6 - len / 2, c.metadata.y, c.metadata.z);
      c.visibility = (0.55 + 0.4 * air) * on;
    });
    // (In vacuum the plume spreads too thin to see: the cores alone.)
    const any = air > 0.3 && on > 0.02 && (!lit || cones.some((_, i) => lit(i)));
    big.setEnabled(any);
    if (any) {
      const count = lit ? cones.filter((_, i) => lit(i)).length : cones.length;
      const share = Math.sqrt(count / cones.length);
      const len = (20 + 120 * air) * on * share * flicker;
      const wide = share * (0.55 + 0.45 * air + (1 - air) * 1.6);
      big.scaling.set(wide, len, wide);
      big.position.set(-1.6 - len / 2, 0, 0);
      big.visibility = (0.25 + 0.55 * air) * on;
    }
  };
}

export function buildBooster(scene, name = 'booster') {
  const root = new TransformNode(name, scene);
  root.rotationQuaternion = Quaternion.Identity();
  const add = (mesh, mat, x = 0, y = 0, z = 0) => {
    mesh.parent = root;
    mesh.material = mat;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    return mesh;
  };
  const along = (mesh) => { mesh.rotation.z = -PI / 2; return mesh; };
  const steel = material(scene, `${name}Steel`, paintTexture(scene, `${name}SteelT`, 1024, 2048, paintSteel(36, { soot: 0.3 })), { spec: 0.8, power: 48 });
  const frosty = material(scene, `${name}Frost`, paintTexture(scene, `${name}FrostT`, 1024, 2048, paintSteel(36, { soot: 0.25, frostTop: 0.7 })), { spec: 0.6, power: 40 });
  const dark = material(scene, `${name}Dark`, null, { color: [0.16, 0.16, 0.17], spec: 0.3 });
  const bellMat = material(scene, `${name}Bell`, null, { color: [0.34, 0.3, 0.28], spec: 0.5, power: 30 });
  const ringMat = material(scene, `${name}Ring`, paintTexture(scene, `${name}RingT`, 1024, 128, (g, w, h) => {
    g.fillStyle = '#a8aaae';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#26262a';
    for (let x = 6; x < w; x += 21) g.fillRect(x, 26, 11, 76);
  }), { spec: 0.6, power: 40 });
  const gridMat = material(scene, `${name}Grid`, paintTexture(scene, `${name}GridT`, 256, 384, paintGrid), { spec: 0.4 });
  gridMat.diffuseTexture.hasAlpha = true;
  gridMat.useAlphaFromDiffuseTexture = true;

  // The tank: 9 m across, 69 m long; the skirt round the engines at its foot, darker.
  const tank = add(along(CreateCylinder(`${name}Tank`, { height: 69, diameter: 9, tessellation: 64, cap: Mesh.NO_CAP }, scene)), steel, 34.5);
  add(along(CreateCylinder(`${name}Skirt`, { height: 2.2, diameterTop: 9, diameterBottom: 9.1, tessellation: 64 }, scene)), dark, 1.1);
  // The hot-staging ring on top: vented all round, where the ship's engines light.
  add(along(CreateCylinder(`${name}HotRing`, { height: 1.8, diameter: 9, tessellation: 64 }, scene)), ringMat, 69.9);
  add(along(CreateCylinder(`${name}Dome`, { height: 0.4, diameter: 8.9, tessellation: 64 }, scene)), dark, 70.9);
  // The two pins the tower's arms catch it by, and the four grid fins, high up.
  for (const side of [1, -1]) add(CreateBox(`${name}Pin${side}`, { width: 1.2, height: 0.8, depth: 1.6 }, scene), dark, 64.5, 0, side * 4.9);
  const fins = [];
  for (let k = 0; k < 4; k++) {
    const a = PI / 4 + (k / 4) * 2 * PI;
    const hinge = new TransformNode(`${name}FinHinge${k}`, scene);
    hinge.parent = root;
    hinge.position.set(66.3, 4.5 * Math.cos(a), 4.5 * Math.sin(a));
    hinge.rotation.x = a;
    const fin = CreatePlane(`${name}Fin${k}`, { width: 4.2, height: 6 }, scene);
    fin.parent = hinge;
    fin.material = gridMat;
    fin.isPickable = false;
    fin.rotation.z = PI / 2;
    fin.position.set(0, 3.1, 0);
    const box = CreateBox(`${name}FinRoot${k}`, { width: 1.6, height: 0.8, depth: 1.2 }, scene);
    box.parent = hinge;
    box.material = dark;
    box.position.set(0, 0.2, 0);
    fins.push(fin);
  }
  // 33 engines: 3 in the middle, 10 round them, 20 round the edge (the 13 inner ones steer
  // and relight for the way back and the landing; 3 alone for the last of it).
  const engines = [];
  for (let k = 0; k < 3; k++) engines.push([0.75 * Math.cos(k * 2 * PI / 3), 0.75 * Math.sin(k * 2 * PI / 3), 1.3]);
  for (let k = 0; k < 10; k++) engines.push([2.25 * Math.cos(k * PI / 5 + 0.3), 2.25 * Math.sin(k * PI / 5 + 0.3), 1.3]);
  for (let k = 0; k < 20; k++) engines.push([3.75 * Math.cos(k * PI / 10), 3.75 * Math.sin(k * PI / 10), 1.3]);
  engines.forEach(([y, z, d], i) => {
    const bell = add(along(CreateCylinder(`${name}Bell${i}`, { height: 1.6, diameterTop: 0.5, diameterBottom: d, tessellation: 16, cap: Mesh.NO_CAP }, scene)), bellMat, -0.8, y, z);
    bell.rotation.z = PI / 2;
  });
  const fire = fireOf(scene, name, root, engines);
  const LENGTH = 71;
  return {
    root,
    length: LENGTH,
    // fire: 0 to 1; engines: 33, 13 or 3 lit; air: 1 low down, 0 in vacuum; frost: the
    // cold tanks white (full), clear (empty); at: a clock for the flicker (s).
    pose({ fire: on = 0, engines: lit = 33, air = 1, frost = 1, at = performance.now() / 1000 } = {}) {
      tank.material = frost > 0.5 ? frosty : steel;
      fire({ on, air, at, lit: (i) => i < lit });
    },
  };
}

export function buildShip(scene, name = 'ship') {
  const root = new TransformNode(name, scene);
  root.rotationQuaternion = Quaternion.Identity();
  const add = (mesh, mat, x = 0, y = 0, z = 0) => {
    mesh.parent = root;
    mesh.material = mat;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    return mesh;
  };
  const along = (mesh) => { mesh.rotation.z = -PI / 2; return mesh; };
  const skinTex = paintTexture(scene, `${name}SkinT`, 1024, 1024, paintShip);
  // (The tiles on +y: a cylinder's u = 0 faces +z once laid along x; turn the skin a quarter.)
  skinTex.uOffset = 0.25;
  const skin = material(scene, `${name}Skin`, skinTex, { spec: 0.7, power: 44, emissive: 0.22 });
  const dark = material(scene, `${name}Dark`, null, { color: [0.07, 0.07, 0.08], spec: 0.2 });
  const bellMat = material(scene, `${name}Bell`, null, { color: [0.34, 0.3, 0.28], spec: 0.5, power: 30 });
  add(along(CreateCylinder(`${name}Body`, { height: 33, diameter: 9, tessellation: 64, cap: Mesh.NO_CAP }, scene)), skin, 16.5);
  // The nose: an ogive 17 m long, made by turning its outline.
  const outline = [];
  for (let i = 0; i <= 24; i++) {
    const x = i / 24;
    outline.push(new Vector3(4.5 * Math.sqrt(Math.max(0, 1 - x * x)) * (1 - 0.06 * x), 17 * x, 0));
  }
  const nose = add(CreateLathe(`${name}Nose`, { shape: outline, tessellation: 64, sideOrientation: Mesh.DOUBLESIDE }, scene), skin, 33);
  nose.rotation.z = -PI / 2;
  add(along(CreateCylinder(`${name}Base`, { height: 0.5, diameter: 9, tessellation: 64 }, scene)), dark, 0.25);
  // Flaps, black on the tiled side's edges: two small fore, two large aft.
  for (const side of [1, -1]) {
    const aft = add(CreateBox(`${name}AftFlap${side}`, { width: 11, height: 0.5, depth: 4.2 }, scene), dark, 6.5, 1.2, side * 6.4);
    aft.rotation.x = side * -0.08;
    const fore = add(CreateBox(`${name}ForeFlap${side}`, { width: 6.5, height: 0.4, depth: 2.6 }, scene), dark, 40.5, 1.6, side * 4.9);
    fore.rotation.y = side * 0.25;
  }
  // Six engines: three for the air in the middle, three for vacuum round them, larger.
  const engines = [];
  for (let k = 0; k < 3; k++) engines.push([0.9 * Math.cos(k * 2 * PI / 3), 0.9 * Math.sin(k * 2 * PI / 3), 1.3]);
  for (let k = 0; k < 3; k++) engines.push([3 * Math.cos(k * 2 * PI / 3 + PI / 3), 3 * Math.sin(k * 2 * PI / 3 + PI / 3), 2.3]);
  engines.forEach(([y, z, d], i) => {
    const bell = add(along(CreateCylinder(`${name}Bell${i}`, { height: d > 2 ? 2.4 : 1.6, diameterTop: 0.6, diameterBottom: d, tessellation: 20, cap: Mesh.NO_CAP }, scene)), bellMat, -0.9, y, z);
    bell.rotation.z = PI / 2;
  });
  const fire = fireOf(scene, name, root, engines);
  return {
    root,
    length: 50,
    pose({ fire: on = 0, air = 0, at = performance.now() / 1000 } = {}) {
      fire({ on, air, at });
    },
  };
}

// The launch tower (146 m) on the ground beside the launch mount, with the carriage up it
// and the two arms that caught the booster. Stands up +y; the mount's middle at the origin,
// the tower to the -x side of it. pose({ arms: 0 open → 1 closed, carriage: its height }).
export function buildTower(scene, name = 'tower') {
  const root = new TransformNode(name, scene);
  const steelGrey = material(scene, `${name}Steel`, null, { color: [0.38, 0.38, 0.4], spec: 0.25 });
  const rusty = material(scene, `${name}Rust`, null, { color: [0.36, 0.3, 0.26], spec: 0.15 });
  const concrete = material(scene, `${name}Concrete`, null, { color: [0.62, 0.6, 0.56], spec: 0.05 });
  const add = (mesh, mat, x, y, z) => { mesh.parent = root; mesh.material = mat; mesh.position.set(x, y, z); mesh.isPickable = false; return mesh; };
  // The tower: four corner columns, a cross brace every 6 m on each face.
  const T = { x: -22, w: 12, h: 146 };
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(CreateBox(`${name}Col${cx}${cz}`, { width: 1.4, height: T.h, depth: 1.4 }, scene), steelGrey, T.x + cx * T.w / 2, T.h / 2, cz * T.w / 2);
  for (let y = 3; y < T.h; y += 6) {
    for (const [dx, dz, w, d] of [[0, -1, T.w, 0.6], [0, 1, T.w, 0.6], [-1, 0, 0.6, T.w], [1, 0, 0.6, T.w]]) {
      add(CreateBox(`${name}Beam${y}${dx}${dz}`, { width: w, height: 0.6, depth: d }, scene), y < 30 ? rusty : steelGrey, T.x + dx * T.w / 2, y, dz * T.w / 2);
    }
    for (const [dz, s] of [[-1, 1], [1, -1]]) {
      const brace = add(CreateBox(`${name}Brace${y}${dz}`, { width: Math.hypot(T.w, 6), height: 0.4, depth: 0.4 }, scene), steelGrey, T.x, y + 3, dz * T.w / 2);
      brace.rotation.z = s * Math.atan2(6, T.w);
    }
  }
  // A crane at its top.
  add(CreateBox(`${name}Top`, { width: 14, height: 2, depth: 14 }, scene), steelGrey, T.x, T.h + 1, 0);
  // The carriage and the arms: each arm 36 m long, hinged at the carriage's front corners,
  // swinging round in the level from wide open (straight out) to closed about the booster.
  const carriage = new TransformNode(`${name}Carriage`, scene);
  carriage.parent = root;
  add(CreateBox(`${name}CarBox`, { width: 4, height: 7, depth: 14 }, scene), steelGrey, 0, 0, 0).parent = carriage;
  carriage.getChildMeshes()[0].position.set(T.x + T.w / 2 + 2, 0, 0);
  const arms = [];
  for (const side of [1, -1]) {
    const hinge = new TransformNode(`${name}ArmHinge${side}`, scene);
    hinge.parent = carriage;
    hinge.position.set(T.x + T.w / 2 + 4, 0, side * 6.2);
    const arm = CreateBox(`${name}Arm${side}`, { width: 34, height: 4.5, depth: 2.4 }, scene);
    arm.parent = hinge;
    arm.material = steelGrey;
    arm.isPickable = false;
    arm.position.set(17, 0, 0);
    // Rails along its inner face, where the booster's pin comes down on.
    const rail = CreateBox(`${name}ArmRail${side}`, { width: 30, height: 0.7, depth: 0.7 }, scene);
    rail.parent = hinge;
    rail.material = rusty;
    rail.position.set(18, 2.5, -side * 1.3);
    arms.push({ hinge, side });
  }
  // The launch mount: a ring table 20 m up on six legs, its deck of concrete under it.
  add(CreateCylinder(`${name}Deck`, { height: 1, diameter: 90, tessellation: 48 }, scene), concrete, 0, -0.5, 0);
  const ring = add(CreateCylinder(`${name}Mount`, { height: 4, diameterTop: 15, diameterBottom: 16, tessellation: 48 }, scene), steelGrey, 0, 20, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 2 * PI;
    add(CreateBox(`${name}Leg${k}`, { width: 2.2, height: 19, depth: 2.2 }, scene), concrete, 7.5 * Math.cos(a), 9.5, 7.5 * Math.sin(a));
  }
  void ring;
  // Tanks to one side, the tank farm.
  for (let k = 0; k < 5; k++) add(CreateCylinder(`${name}TankFarm${k}`, { height: 22, diameter: 8, tessellation: 24 }, scene), concrete, -60 - k * 11, 11, 70);
  return {
    root,
    // arms: 0 wide open → 1 closed round the booster; carriage: its height up the tower (m).
    pose({ arms: shut = 0, carriage: high = 80 } = {}) {
      carriage.position.y = high;
      for (const { hinge, side } of arms) hinge.rotation.y = -side * (1 - shut) * 0.95;
    },
  };
}
