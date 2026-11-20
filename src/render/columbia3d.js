import { Vector3, Quaternion, Color3, StandardMaterial, TransformNode, DynamicTexture, Mesh, CreateCylinder, CreateSphere, CreateBox, CreateTorus, Texture } from './babylon.js';

// Apollo 11's command and service module, Columbia, as Eagle saw it coming back from the
// Moon to dock (the user, 2026-11-20: "아폴로 귀환 시에 사령선이 도킹하는걸 게임에 넣는건 어때",
// then a scene to watch, not to fly). Built in metres: the nose (the docking probe) at +x,
// "up" (+y) the side with the high-gain antenna. Surfaces are painted here, not loaded.

const PI = Math.PI;
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
function paintTexture(scene, name, w, h, paint, { u = 1, v = 1 } = {}) {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, false);
  const g = tex.getContext();
  paint(g, w, h, seeded(name.length * 7907 + w));
  tex.update(false);
  tex.uScale = u;
  tex.vScale = v;
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
  m.backFaceCulling = false;
  return m;
}
function grime(g, w, h, rnd, count, dark, size) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h, r = size * (0.3 + rnd());
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(50,46,40,${(dark * (0.3 + rnd())).toFixed(3)})`);
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
// The command module's skin: the silvered tape over it in long strips, a little rumpled,
// its seams, and its five windows (two forward for the rendezvous, two at the sides, one
// in the hatch). u goes round the cone, v from its base (0) to its top (1).
function paintCommand(g, w, h, rnd) {
  for (let x = 0; x < w; x += 16) {
    const k = Math.round((rnd() - 0.5) * 34);
    const strip = g.createLinearGradient(x, 0, x + 16, 0);
    strip.addColorStop(0, `rgb(${196 + k},${200 + k},${206 + k})`);
    strip.addColorStop(0.5, `rgb(${226 + k},${229 + k},${233 + k})`);
    strip.addColorStop(1, `rgb(${182 + k},${186 + k},${192 + k})`);
    g.fillStyle = strip;
    g.fillRect(x, 0, 16, h);
  }
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '60,62,66'},${(0.08 + rnd() * 0.14).toFixed(2)})`;
    g.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 26, 2 + rnd() * 10);
  }
  g.fillStyle = 'rgba(70,72,78,.55)';
  for (const v of [0.16, 0.5, 0.82]) g.fillRect(0, (1 - v) * h, w, 3);
  const win = (u, v, ww, hh, tri = false) => {
    const x = u * w, y = (1 - v) * h;
    g.fillStyle = '#1b2026';
    g.strokeStyle = '#5b6068';
    g.lineWidth = 4;
    g.beginPath();
    if (tri) {
      g.moveTo(x - ww / 2, y + hh / 2);
      g.lineTo(x + ww / 2, y + hh / 2);
      g.lineTo(x, y - hh / 2);
    } else g.roundRect(x - ww / 2, y - hh / 2, ww, hh, 8);
    g.closePath();
    g.fill();
    g.stroke();
    const glint = g.createLinearGradient(x - ww / 2, y - hh / 2, x + ww / 2, y + hh / 2);
    glint.addColorStop(0, 'rgba(120,150,180,.35)');
    glint.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = glint;
    g.fill();
  };
  win(0.22, 0.6, 46, 52, true);
  win(0.28, 0.6, 46, 52, true);
  win(0.08, 0.42, 54, 54);
  win(0.42, 0.42, 54, 54);
  win(0.25, 0.38, 60, 60);
  grime(g, w, h, rnd, 30, 0.08, 40);
}
// The service module: a ring of panels, the white radiator strips near its front, the
// words UNITED STATES down one side with the flag. u round it, v along it (0 at the back).
function paintService(g, w, h, rnd) {
  g.fillStyle = '#b8bcc1';
  g.fillRect(0, 0, w, h);
  const sectors = 6;
  for (let s = 0; s < sectors; s++) {
    const k = Math.round((rnd() - 0.5) * 22);
    g.fillStyle = `rgb(${186 + k},${190 + k},${196 + k})`;
    g.fillRect((s * w) / sectors + 3, 0, w / sectors - 6, h);
  }
  g.fillStyle = 'rgba(60,62,68,.7)';
  for (let s = 0; s <= sectors; s++) g.fillRect((s * w) / sectors - 2, 0, 4, h);
  // Radiators: white bands with fine fins, near the front on two sides.
  for (const u0 of [0.05, 0.55]) {
    g.fillStyle = '#eef0f2';
    g.fillRect(u0 * w, h * 0.05, 0.22 * w, h * 0.42);
    g.fillStyle = 'rgba(150,156,166,.6)';
    for (let x = u0 * w; x < (u0 + 0.22) * w; x += 7) g.fillRect(x, h * 0.05, 2, h * 0.42);
  }
  // UNITED STATES along its length, and the flag ahead of it.
  g.save();
  g.translate(0.86 * w, h * 0.5);
  g.rotate(-PI / 2);
  g.fillStyle = '#1b1d22';
  g.font = `bold ${Math.round(w * 0.04)}px Helvetica, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('UNITED STATES', -h * 0.05, 0);
  g.restore();
  const fx = 0.83 * w, fy = h * 0.06, fw = w * 0.06, fh = h * 0.16;
  for (let k = 0; k < 13; k++) { g.fillStyle = k % 2 ? '#f2efe8' : '#b0242c'; g.fillRect(fx, fy + (k * fh) / 13, fw, fh / 13 + 1); }
  g.fillStyle = '#23305f';
  g.fillRect(fx, fy, fw * 0.45, fh * 0.54);
  grime(g, w, h, rnd, 40, 0.1, 50);
}
function paintBell(g, w, h, rnd) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#2b2a2a');
  grad.addColorStop(0.35, '#5d5a55');
  grad.addColorStop(1, '#c9c7c2');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 6) { g.fillStyle = `rgba(30,28,26,${(0.18 + rnd() * 0.15).toFixed(2)})`; g.fillRect(x, 0, 1, h); }
  for (const v of [0.35, 0.55, 0.75]) { g.fillStyle = 'rgba(40,38,36,.5)'; g.fillRect(0, v * h, w, 3); }
}

export function buildColumbia(scene, name = 'columbia') {
  const root = new TransformNode(name, scene);
  root.rotationQuaternion = Quaternion.Identity();
  const add = (mesh, mat, x = 0, y = 0, z = 0) => {
    mesh.parent = root;
    mesh.material = mat;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    return mesh;
  };
  const along = (mesh) => { mesh.rotation.z = -PI / 2; return mesh; }; // a builder's +y onto +x

  const cmMat = material(scene, `${name}CM`, paintTexture(scene, `${name}CMT`, 1024, 512, paintCommand), { spec: 0.9, power: 60 });
  const smMat = material(scene, `${name}SM`, paintTexture(scene, `${name}SMT`, 1024, 512, paintService), { spec: 0.5, power: 40 });
  const bellMat = material(scene, `${name}Bell`, paintTexture(scene, `${name}BellT`, 256, 256, paintBell), { spec: 0.4, power: 24 });
  const dark = material(scene, `${name}Dark`, null, { color: [0.13, 0.13, 0.14], spec: 0.3 });
  const shield = material(scene, `${name}Shield`, null, { color: [0.42, 0.33, 0.24], spec: 0.15 });
  const metal = material(scene, `${name}Metal`, null, { color: [0.62, 0.63, 0.66], spec: 0.6, power: 50 });
  const white = material(scene, `${name}White`, null, { color: [0.9, 0.9, 0.88], spec: 0.25 });
  const gold = material(scene, `${name}Gold`, null, { color: [0.78, 0.6, 0.25], spec: 0.7, power: 50 });

  // The command module: a cone 3.9 m across and 3.2 m high, its shoulder rounded, the
  // heat shield behind it, the docking tunnel and probe at its top.
  add(along(CreateCylinder(`${name}Cone`, { height: 3.0, diameterTop: 0.9, diameterBottom: 3.84, tessellation: 64, cap: Mesh.NO_CAP }, scene)), cmMat, 1.62, 0, 0);
  add(along(CreateTorus(`${name}Shoulder`, { diameter: 3.64, thickness: 0.3, tessellation: 64 }, scene)), cmMat, 0.12, 0, 0);
  const heat = add(CreateSphere(`${name}Heat`, { diameter: 3.9, segments: 32, slice: 0.5 }, scene), shield, 0.02, 0, 0);
  heat.rotation.z = PI / 2;
  heat.scaling.y = 0.12;
  add(along(CreateCylinder(`${name}Tunnel`, { height: 0.42, diameter: 0.86, tessellation: 32 }, scene)), metal, 3.3, 0, 0);
  add(along(CreateCylinder(`${name}ProbeBase`, { height: 0.18, diameter: 0.7, tessellation: 24 }, scene)), metal, 3.58, 0, 0);
  add(along(CreateCylinder(`${name}Probe`, { height: 0.85, diameterTop: 0.05, diameterBottom: 0.12, tessellation: 12 }, scene)), metal, 4.05, 0, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * 2 * PI;
    const arm = add(CreateCylinder(`${name}ProbeArm${k}`, { height: 0.62, diameter: 0.04, tessellation: 8 }, scene), metal, 3.85, 0.17 * Math.cos(a), 0.17 * Math.sin(a));
    arm.rotation.set(0.55 * Math.sin(a), 0, -PI / 2 + 0.55 * Math.cos(a));
  }

  // The service module behind it: a can 3.9 m across and 3.9 m long, its front fairing,
  // the four thruster quads, the engine bell, the high-gain antenna on its boom.
  add(along(CreateCylinder(`${name}Fairing`, { height: 0.32, diameterTop: 3.86, diameterBottom: 3.92, tessellation: 64 }, scene)), white, -0.18, 0, 0);
  add(along(CreateCylinder(`${name}Service`, { height: 3.9, diameter: 3.92, tessellation: 64 }, scene)), smMat, -2.29, 0, 0);
  add(along(CreateCylinder(`${name}Aft`, { height: 0.2, diameterTop: 3.92, diameterBottom: 3.4, tessellation: 64 }, scene)), dark, -4.34, 0, 0);
  add(along(CreateCylinder(`${name}Bell`, { height: 2.9, diameterTop: 0.9, diameterBottom: 2.5, tessellation: 48, cap: Mesh.NO_CAP }, scene)), bellMat, -5.85, 0, 0);
  for (let k = 0; k < 4; k++) {
    const a = PI / 4 + (k / 4) * 2 * PI;
    const quad = new TransformNode(`${name}Quad${k}`, scene);
    quad.parent = root;
    quad.position.set(-1.0, 2.0 * Math.cos(a), 2.0 * Math.sin(a));
    quad.rotation.x = a;
    const box = add(CreateBox(`${name}QuadBox${k}`, { width: 0.75, height: 0.22, depth: 0.55 }, scene), metal);
    box.parent = quad;
    for (const [dx, dz, ry, rz] of [[0.42, 0, 0, -PI / 2], [-0.42, 0, 0, PI / 2], [0, 0.32, PI / 2, 0], [0, -0.32, -PI / 2, 0]]) {
      const nozzle = add(CreateCylinder(`${name}Rcs${k}${dx}${dz}`, { height: 0.22, diameterTop: 0.05, diameterBottom: 0.13, tessellation: 12 }, scene), dark);
      nozzle.parent = quad;
      nozzle.position.set(dx, 0.02, dz);
      nozzle.rotation.set(rz === 0 ? (dz > 0 ? PI / 2 : -PI / 2) : 0, ry, rz);
    }
  }
  const boom = add(CreateCylinder(`${name}Boom`, { height: 1.6, diameter: 0.1, tessellation: 10 }, scene), metal, -3.9, 2.55, 0);
  boom.rotation.z = -0.45;
  for (const [dy, dz] of [[0.3, 0.3], [0.3, -0.3], [-0.3, 0.3], [-0.3, -0.3]]) {
    const dish = add(CreateSphere(`${name}Dish${dy}${dz}`, { diameter: 0.8, segments: 16, slice: 0.5 }, scene), white, -4.45, 3.35 + dy, dz);
    dish.rotation.z = PI / 2;
    dish.scaling.y = 0.35;
  }
  add(CreateBox(`${name}DishBack`, { width: 0.2, height: 0.7, depth: 0.7 }, scene), gold, -4.3, 3.35, 0);

  const LENGTH = 4.47 + 7.3;
  return { root, length: LENGTH, pose() {} };
}
