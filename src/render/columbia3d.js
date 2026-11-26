import { Vector3, Quaternion, Color3, StandardMaterial, TransformNode, DynamicTexture, Mesh, VertexData, CreateCylinder, CreateSphere, CreateBox, CreateTorus, CreatePlane, Texture, Constants } from './babylon.js';

// Apollo 11's command and service module, Columbia, as Eagle saw it leaving and coming back
// to dock. Rebuilt from photographs with the img2threejs method (the user, 2026-11-26:
// "콜롬비아 다시 그려보자", "넣고"): AS15-88-11972 for the stack's proportions (its open SIM
// bay ignored: Columbia's side there was plain panels), AS09-20-3064 for the command
// module's skin, AS11-37-5446 (Columbia from Eagle) for the nose and the antenna; the spec
// behind the numbers is on branch try/columbia-img2 (trial/img2/object-sculpt-spec.json).
// Metres: the nose (docking probe) at +x, +y the side with the high-gain antenna, the root
// at the joint of the two modules; jets "fwd"/"side". Surfaces are painted here, not loaded.

const PI = Math.PI;
const TAU = 2 * PI;
const R = 1.956; // the service module's radius (3.91 m across)
// Round the axis: azimuth 0 is +y (the antenna's side), PI/2 is +z.
const QUAD_AZ = [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4];
// The hatch, as Eagle saw it (AS11-37-5446): 225 degrees round from the antenna.
const HATCH_AZ = (5 * PI) / 4;

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
function paintTexture(scene, name, w, h, paint) {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, false);
  const g = tex.getContext();
  paint(g, w, h, seeded(name.length * 7907 + w));
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.CLAMP_ADDRESSMODE;
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

// A surface of revolution about x. profile: [x, r, crease?] from aft to fore; a crease
// point gets two rings so the edge stays sharp. u goes round (0 at +y, toward +z), v is
// x mapped from [v0, v1] onto 0..1. Normals come from the profile, not from averaging.
function revolve(scene, name, profile, { segments = 64, v0 = null, v1 = null, inside = false } = {}) {
  const xs = profile.map((p) => p[0]);
  const lo = v0 ?? Math.min(...xs), hi = v1 ?? Math.max(...xs);
  const segN = [];
  for (let i = 0; i + 1 < profile.length; i++) {
    const dx = profile[i + 1][0] - profile[i][0], dr = profile[i + 1][1] - profile[i][1];
    const l = Math.hypot(dx, dr) || 1;
    segN.push([-dr / l, dx / l]); // outward (x, r) normal of a segment going +x
  }
  const rings = [];
  profile.forEach(([x, r, crease], i) => {
    const before = segN[i - 1], after = segN[i];
    if (crease && before && after) {
      rings.push({ x, r, n: before });
      rings.push({ x, r, n: after });
    } else {
      const a = before || after, b = after || before;
      const n = [a[0] + b[0], a[1] + b[1]];
      const l = Math.hypot(n[0], n[1]) || 1;
      rings.push({ x, r, n: [n[0] / l, n[1] / l] });
    }
  });
  const positions = [], normals = [], uvs = [], indices = [];
  const flip = inside ? -1 : 1;
  for (const ring of rings) {
    for (let k = 0; k <= segments; k++) {
      const a = (k / segments) * TAU, c = Math.cos(a), s = Math.sin(a);
      positions.push(ring.x, ring.r * c, ring.r * s);
      normals.push(flip * ring.n[0], flip * ring.n[1] * c, flip * ring.n[1] * s);
      uvs.push(k / segments, 1 - (ring.x - lo) / (hi - lo || 1));
    }
  }
  const row = segments + 1;
  for (let j = 0; j + 1 < rings.length; j++) {
    if (rings[j].x === rings[j + 1].x && rings[j].r === rings[j + 1].r) continue; // a crease's pair
    for (let k = 0; k < segments; k++) {
      const a = j * row + k, b = a + 1, c = a + row, d = c + 1;
      if (inside) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.normals = normals;
  data.uvs = uvs;
  data.indices = indices;
  data.applyToMesh(mesh);
  return mesh;
}

// ---- the command module ----------------------------------------------------------------
// Its profile (x, r): the aft heat shield and the rounded shoulder (both hidden inside the
// service module's forward fairing), the 33-degree cone, a flat ring at the top round the docking tunnel's collar.
const CM_PROFILE = [
  [-0.26, 0.001], [-0.22, 0.9], [-0.1, 1.55], [0.04, 1.86], [0.14, 1.93], [0.24, 1.92], [0.34, 1.86, true],
  [2.26, 0.62], [2.32, 0.58], [2.34, 0.54, true],
];
const CM_X0 = -0.26, CM_X1 = 2.34;
const cmV = (x) => 1 - (x - CM_X0) / (CM_X1 - CM_X0); // canvas y fraction for an x
const coneR = (x) => 1.86 + ((0.62 - 1.86) * (x - 0.34)) / (2.26 - 0.34);
const coneX = (r) => 0.34 + ((r - 1.86) * (2.26 - 0.34)) / (0.62 - 1.86);

// The skin: silvered tape in strips along the cone (it mirrored the Moon and the black sky
// in turn), crinkled; the shoulder's bright rim with the thin copper line Eagle's photograph
// shows; the forward heat shield's smoother ring round the top; five windows (two forward
// rendezvous windows, two side ones, one in the hatch), the hatch's outline, the small
// dark ports of its own thrusters with their brown fans.
function paintCommand(g, w, h, rnd) {
  for (let x = 0; x < w; x += 16) {
    const k = Math.round((rnd() - 0.5) * 70);
    const dark = rnd() < 0.22;
    const strip = g.createLinearGradient(x, 0, x + 16, 0);
    const c = dark ? 120 : 205;
    strip.addColorStop(0, `rgb(${c - 30 + k},${c - 28 + k},${c - 24 + k})`);
    strip.addColorStop(0.5, `rgb(${c + 25 + k},${c + 27 + k},${c + 30 + k})`);
    strip.addColorStop(1, `rgb(${c - 40 + k},${c - 38 + k},${c - 34 + k})`);
    g.fillStyle = strip;
    g.fillRect(x, 0, 16, h);
  }
  // The forward heat shield: the upper cone above r = 1.0 m, smoother and brighter.
  const yTop = cmV(coneX(1.0)) * h;
  g.fillStyle = 'rgba(232,234,238,.45)';
  g.fillRect(0, 0, w, yTop);
  g.fillStyle = 'rgba(60,62,68,.7)';
  g.fillRect(0, yTop - 2, w, 3);
  // The shoulder: bright, with the copper line at its edge and the dark gap under it.
  const ySh0 = cmV(0.34) * h, ySh1 = cmV(0.04) * h;
  const sh = g.createLinearGradient(0, ySh0, 0, ySh1);
  sh.addColorStop(0, '#e6e8eb');
  sh.addColorStop(0.5, '#b9bdc2');
  sh.addColorStop(1, '#6d6f73');
  g.fillStyle = sh;
  g.fillRect(0, ySh0, w, ySh1 - ySh0);
  g.fillStyle = 'rgba(176,104,72,.85)';
  g.fillRect(0, cmV(0.4) * h, w, 3);
  g.fillStyle = '#4a3a2c';
  g.fillRect(0, ySh1, w, h - ySh1); // the aft heat shield, brown (hidden)
  // Crinkles and lifted corners over the tape.
  for (let i = 0; i < 1100; i++) {
    const x = rnd() * w, y = rnd() * ySh0, l = 4 + rnd() * 16, a = (rnd() - 0.5) * 2.4;
    g.strokeStyle = rnd() < 0.55 ? `rgba(255,255,255,${(0.1 + rnd() * 0.25).toFixed(2)})` : `rgba(40,42,46,${(0.12 + rnd() * 0.25).toFixed(2)})`;
    g.lineWidth = 0.6 + rnd() * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w, y = rnd() * ySh0, r = 20 + rnd() * 60;
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, rnd() < 0.5 ? 'rgba(130,128,124,.3)' : 'rgba(255,255,250,.25)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // A window at azimuth az, centre at cone radius r, size in metres (wide round, tall up the cone).
  const pxU = (m, r) => (m / (TAU * r)) * w;
  const pxV = (m) => (m * 0.84 / (CM_X1 - CM_X0)) * h; // slant metres to axial (cos 33 deg)
  const uOf = (az) => (((az % TAU) + TAU) % TAU) / TAU;
  const shape = (az, r, ww, hh, kind) => {
    const x = uOf(az) * w, y = cmV(coneX(r)) * h, a = pxU(ww, r), b = pxV(hh);
    g.beginPath();
    if (kind === 'tri') { g.moveTo(x - a / 2, y + b / 2); g.lineTo(x + a / 2, y + b / 2); g.lineTo(x + a * 0.32, y - b / 2); g.lineTo(x - a * 0.32, y - b / 2); }
    else if (kind === 'hatch') { g.moveTo(x - a / 2, y + b / 2); g.lineTo(x + a / 2, y + b / 2); g.lineTo(x + a * 0.4, y - b / 2); g.lineTo(x - a * 0.4, y - b / 2); }
    else g.roundRect(x - a / 2, y - b / 2, a, b, 6);
    g.closePath();
    return [x, y, a, b];
  };
  // The hatch: a trapezoid of plain panel round its window, its edge dark.
  shape(HATCH_AZ, 1.32, 0.95, 1.05, 'hatch');
  g.fillStyle = 'rgba(170,174,180,.55)';
  g.fill();
  g.strokeStyle = 'rgba(40,42,46,.85)';
  g.lineWidth = 3;
  g.stroke();
  const win = (az, r, ww, hh, kind) => {
    const [x, y, a] = shape(az, r, ww, hh, kind);
    g.fillStyle = '#121519';
    g.fill();
    g.strokeStyle = '#3c4046';
    g.lineWidth = 5;
    g.stroke();
    const glint = g.createLinearGradient(x - a / 2, y, x + a / 2, y);
    glint.addColorStop(0, 'rgba(110,130,160,.35)');
    glint.addColorStop(0.6, 'rgba(255,255,255,0)');
    g.fillStyle = glint;
    g.fill();
    // Scorch round the rim.
    const ring = g.createRadialGradient(x, y, a * 0.5, x, y, a * 1.1);
    ring.addColorStop(0, 'rgba(92,70,44,.35)');
    ring.addColorStop(1, 'rgba(92,70,44,0)');
    g.fillStyle = ring;
    g.fillRect(x - a * 1.2, y - a * 1.2, a * 2.4, a * 2.4);
  };
  win(HATCH_AZ, 1.3, 0.3, 0.3, 'rect');
  win(HATCH_AZ - 0.42, 1.05, 0.32, 0.34, 'tri');
  win(HATCH_AZ + 0.42, 1.05, 0.32, 0.34, 'tri');
  win(HATCH_AZ - 1.15, 1.42, 0.33, 0.33, 'rect');
  win(HATCH_AZ + 1.15, 1.42, 0.33, 0.33, 'rect');
  // Its own thrusters: pitch and yaw pairs high on the cone, roll pairs low, with fans.
  const port = (az, r) => {
    const x = uOf(az) * w, y = cmV(coneX(r)) * h;
    const fan = g.createRadialGradient(x, y, 2, x, y, 60);
    fan.addColorStop(0, 'rgba(88,62,34,.5)');
    fan.addColorStop(1, 'rgba(120,92,52,0)');
    g.fillStyle = fan;
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, 60, 0.9, 2.25); g.closePath(); g.fill();
    g.fillStyle = '#16181b';
    g.fillRect(x - 7, y - 6, 14, 12);
  };
  for (const az of [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4]) port(HATCH_AZ + az, 0.95);
  for (const az of [0.3, PI + 0.3]) { port(HATCH_AZ + az + PI / 2, 1.72); port(HATCH_AZ + az + PI / 2 + 0.08, 1.72); }
}

// ---- the service module ----------------------------------------------------------------
const SM_PROFILE = [
  [-4.42, R, true], [0.3, R], [0.36, 1.94, true], [0.36, 1.8, true], [0.36, 0.001],
];
const SM_X0 = -4.42, SM_X1 = 0.36;
const smV = (x) => 1 - (x - SM_X0) / (SM_X1 - SM_X0);
// Painted aluminium in six sectors with dark seams; round its forward edge the white ribbed
// radiators of the fuel cells, broken where the thruster quads sit; low on two opposite
// sides the big white ribbed radiators of the cabin's cooling; UNITED STATES and the flag;
// the yellow-brown fans round each quad; grime run aft.
function paintService(g, w, h, rnd) {
  g.fillStyle = '#9a9ea4';
  g.fillRect(0, 0, w, h);
  const seams = [0.02, 0.19, 0.35, 0.52, 0.69, 0.85];
  for (let s = 0; s < seams.length; s++) {
    const u0 = seams[s], u1 = seams[(s + 1) % seams.length] + (s + 1 === seams.length ? 1 : 0);
    const k = Math.round((rnd() - 0.5) * 24);
    g.fillStyle = `rgb(${150 + k},${154 + k},${160 + k})`;
    for (const off of [0, -1]) g.fillRect((u0 + off) * w + 3, 0, (u1 - u0) * w - 6, h);
  }
  // Long panel shading: each sector a little brighter in its middle.
  for (let x = 0; x < w; x += 4) {
    const t = 0.5 + 0.5 * Math.sin((x / w) * TAU * 6);
    g.fillStyle = `rgba(255,255,255,${(0.05 * t).toFixed(3)})`;
    g.fillRect(x, 0, 4, h);
  }
  g.fillStyle = 'rgba(50,52,58,.75)';
  for (const u of seams) g.fillRect(u * w - 2, 0, 4, h);
  // Bolt rows along each seam.
  g.fillStyle = 'rgba(60,62,66,.5)';
  for (const u of seams) for (let y = 6; y < h; y += 14) { g.fillRect(u * w - 7, y, 2, 2); g.fillRect(u * w + 5, y, 2, 2); }
  const ribbed = (u0, u1, x0, x1, gap) => {
    const y0 = smV(x1) * h, y1 = smV(x0) * h;
    for (const off of [0, -1, 1]) {
      const a = (u0 + off) * w, b = (u1 + off) * w;
      g.fillStyle = '#e9eaeb';
      g.fillRect(a, y0, b - a, y1 - y0);
      g.fillStyle = 'rgba(120,126,134,.55)';
      for (let y = y0 + 2; y < y1; y += gap) g.fillRect(a, y, b - a, 1.5);
      g.fillStyle = 'rgba(60,62,66,.6)';
      g.fillRect(a, y0, b - a, 2);
      g.fillRect(a, y1 - 2, b - a, 2);
    }
  };
  // Fuel-cell radiators: forward 0.45 m, in eight panels between the quads' places.
  for (let k = 0; k < 8; k++) {
    const mid = k / 8 + 1 / 16; // the quads sit at 1/8, 3/8, ...: skip a gap there
    ribbed(mid - 0.045, mid + 0.045, -0.12, 0.33, 6);
  }
  // Cabin radiators: two big panels low on opposite sides (azimuth 90 and 270 deg).
  ribbed(0.25 - 0.1, 0.25 + 0.1, -4.3, -3.1, 5);
  ribbed(0.75 - 0.1, 0.75 + 0.1, -4.3, -3.1, 5);
  // UNITED STATES down the side away from the antenna, the flag ahead of it.
  g.save();
  g.translate(0.5 * w, smV(-2.0) * h);
  g.scale(-1, 1); // u runs the other way to the eye outside
  g.rotate(-PI / 2);
  g.fillStyle = 'rgba(28,30,36,.85)';
  g.font = `bold ${Math.round(h * 0.07)}px Helvetica, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('UNITED STATES', 0, 0);
  g.restore();
  // (u runs right to left seen from outside, so the canton is drawn at the high-u end.)
  const fx = 0.46 * w, fy = smV(-0.6) * h, fw = w * 0.075, fh = h * 0.1;
  for (let k = 0; k < 13; k++) { g.fillStyle = k % 2 ? '#e8e5de' : '#a8262e'; g.fillRect(fx, fy + (k * fh) / 13, fw, fh / 13 + 1); }
  g.fillStyle = '#26315c';
  g.fillRect(fx + fw * 0.6, fy, fw * 0.4, fh * 0.54);
  // Weathering: grime run aft, scuffs, the quads' fans.
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w, y0 = rnd() * h, l = 40 + rnd() * 160;
    const run = g.createLinearGradient(0, y0, 0, y0 + l);
    run.addColorStop(0, `rgba(70,62,50,${(0.1 + rnd() * 0.18).toFixed(2)})`);
    run.addColorStop(1, 'rgba(70,62,50,0)');
    g.fillStyle = run;
    g.fillRect(x, y0, 1 + rnd() * 3, l);
  }
  for (let i = 0; i < 50; i++) {
    const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 50;
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(${rnd() < 0.5 ? '90,84,72' : '230,230,226'},${(0.08 + rnd() * 0.12).toFixed(2)})`);
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (const az of QUAD_AZ) {
    const x = (az / TAU) * w, y = smV(-1.25) * h;
    for (const [a0, a1, r] of [[-0.5, 0.5, 110], [PI - 0.5, PI + 0.5, 110], [PI / 2 - 0.35, PI / 2 + 0.35, 190], [-PI / 2 - 0.35, -PI / 2 + 0.35, 120]]) {
      const fan = g.createRadialGradient(x, y, 4, x, y, r);
      fan.addColorStop(0, 'rgba(96,66,30,.55)');
      fan.addColorStop(0.45, 'rgba(150,112,58,.25)');
      fan.addColorStop(1, 'rgba(160,124,70,0)');
      g.fillStyle = fan;
      g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a0, a1); g.closePath(); g.fill();
    }
  }
}
// The aft skirt: crinkled foil, gold and silver.
function paintFoil(g, w, h, rnd) {
  g.fillStyle = '#b4b2aa';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w, y = rnd() * h, s = 3 + rnd() * 14;
    const t = rnd();
    g.fillStyle = t < 0.35 ? 'rgba(250,248,240,.7)' : t < 0.65 ? 'rgba(60,58,54,.5)' : 'rgba(196,166,104,.55)';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + rnd() * s * 0.6); g.lineTo(x + rnd() * s * 0.5, y + s); g.closePath(); g.fill();
  }
}
// The engine's nozzle: just under the skirt a bright collar, then dull grey-brown, the last
// quarter darker (its cooler extension), mottled, the rim lit.
const BELL_PROFILE = [
  [-7.42, 1.245], [-7.0, 1.2], [-6.5, 1.14], [-6.0, 1.07], [-5.5, 0.98], [-5.05, 0.86], [-4.85, 0.78], [-4.7, 0.66], [-4.62, 0.5],
];
function paintBell(g, w, h, rnd) {
  const grad = g.createLinearGradient(0, 0, 0, h); // top = forward (collar), bottom = exit
  grad.addColorStop(0, '#a29b8c');
  grad.addColorStop(0.08, '#857d6e');
  grad.addColorStop(0.15, '#625a4e');
  grad.addColorStop(0.68, '#5a5449');
  grad.addColorStop(0.72, '#3b3c38');
  grad.addColorStop(0.97, '#34352f');
  grad.addColorStop(1, '#8a8a84');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 5) { g.fillStyle = `rgba(30,28,26,${(0.1 + rnd() * 0.12).toFixed(2)})`; g.fillRect(x, 0, 1, h); }
  g.fillStyle = 'rgba(30,28,26,.6)';
  g.fillRect(0, 0.7 * h, w, 3);
  for (let i = 0; i < 140; i++) {
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 18;
    g.fillStyle = `rgba(${rnd() < 0.5 ? '40,36,40' : '170,150,120'},${(0.06 + rnd() * 0.1).toFixed(2)})`;
    g.fillRect(x - r, y - r / 3, 2 * r, (2 * r) / 3);
  }
}

export function buildColumbia(scene, name = 'columbia') {
  const root = new TransformNode(name, scene);
  root.rotationQuaternion = Quaternion.Identity();
  const parts = new Map(); // material -> meshes, merged into one mesh each at the end
  const add = (mesh, mat, x = 0, y = 0, z = 0) => {
    mesh.parent = root;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    if (!parts.has(mat)) parts.set(mat, []);
    parts.get(mat).push(mesh);
    return mesh;
  };
  const along = (mesh) => { mesh.rotation.z = -PI / 2; return mesh; }; // a builder's +y onto +x
  // A rod from a to b (game frame).
  const rod = (id, a, b, d, mat) => {
    const va = Vector3.FromArray(a), vb = Vector3.FromArray(b);
    const len = Vector3.Distance(va, vb);
    const m = add(CreateCylinder(id, { height: len, diameter: d, tessellation: 8 }, scene), mat);
    m.position.copyFrom(va.add(vb).scale(0.5));
    const dir = vb.subtract(va).normalize();
    const axis = Vector3.Cross(Vector3.Up(), dir);
    const ang = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(Vector3.Up(), dir))));
    m.rotationQuaternion = axis.length() < 1e-6 ? Quaternion.Identity() : Quaternion.RotationAxis(axis.normalize(), ang);
    return m;
  };

  const cmMat = material(scene, `${name}CM`, paintTexture(scene, `${name}CMT`, 1024, 512, paintCommand), { spec: 0.9, power: 70 });
  const smMat = material(scene, `${name}SM`, paintTexture(scene, `${name}SMT`, 1024, 512, paintService), { spec: 0.45, power: 36 });
  const bellMat = material(scene, `${name}Bell`, paintTexture(scene, `${name}BellT`, 256, 256, paintBell), { spec: 0.35, power: 20 });
  const foilMat = material(scene, `${name}Foil`, paintTexture(scene, `${name}FoilT`, 512, 64, paintFoil), { spec: 0.8, power: 40 });
  const dark = material(scene, `${name}Dark`, null, { color: [0.14, 0.14, 0.15], spec: 0.3 });
  const metal = material(scene, `${name}Metal`, null, { color: [0.66, 0.67, 0.7], spec: 0.6, power: 50 });
  const copper = material(scene, `${name}Copper`, null, { color: [0.72, 0.4, 0.26], spec: 0.6, power: 40 });
  const gold = material(scene, `${name}Gold`, null, { color: [0.7, 0.55, 0.28], spec: 0.6, power: 40 });

  // The command module, one profile; the tunnel's collar on top, copper-rimmed, dark inside;
  // the probe: three dark arms from the rim to its head, the spike beyond.
  add(revolve(scene, `${name}Cone`, CM_PROFILE, { segments: 72, v0: CM_X0, v1: CM_X1 }), cmMat);
  add(revolve(scene, `${name}Collar`, [[2.34, 0.54, true], [2.36, 0.5, true], [2.62, 0.5], [2.66, 0.47, true], [2.66, 0.41, true], [2.5, 0.41, true], [2.5, 0.001]], { segments: 40 }), metal);
  add(along(CreateTorus(`${name}TunnelRim`, { diameter: 0.9, thickness: 0.06, tessellation: 40 }, scene)), copper, 2.67, 0, 0);
  add(along(CreateCylinder(`${name}ProbeHub`, { height: 0.2, diameter: 0.34, tessellation: 16 }, scene)), dark, 2.6, 0, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + PI / 6;
    rod(`${name}ProbeArm${k}`, [2.66, 0.36 * Math.cos(a), 0.36 * Math.sin(a)], [3.08, 0.05 * Math.cos(a), 0.05 * Math.sin(a)], 0.06, dark);
  }
  add(along(CreateCylinder(`${name}Probe`, { height: 0.5, diameterTop: 0.04, diameterBottom: 0.1, tessellation: 10 }, scene)), metal, 3.25, 0, 0);
  add(CreateSphere(`${name}ProbeHead`, { diameter: 0.1, segments: 6 }, scene), dark, 3.5, 0, 0);

  // The service module, its aft foil skirt, the engine.
  add(revolve(scene, `${name}Service`, SM_PROFILE, { segments: 72, v0: SM_X0, v1: SM_X1 }), smMat);
  add(revolve(scene, `${name}Skirt`, [[-4.8, 1.78, true], [-4.74, 1.96], [-4.6, R + 0.04], [-4.42, R + 0.012, true]], { segments: 72 }), foilMat);
  add(revolve(scene, `${name}Aft`, [[-4.8, 0.001], [-4.8, 1.78, true]], { segments: 48 }), dark);
  add(revolve(scene, `${name}Bell`, BELL_PROFILE, { segments: 48 }), bellMat);
  add(revolve(scene, `${name}BellIn`, BELL_PROFILE.map(([x, r]) => [x, r - 0.02]), { segments: 48, inside: true }), dark);

  // The four thruster quads, each a plate on the skin with its housing and four nozzles
  // (fore, aft, and the two round the module).
  const quads = [];
  QUAD_AZ.forEach((a, k) => {
    const quad = new TransformNode(`${name}Quad${k}`, scene);
    quad.parent = root;
    quad.position.set(-1.25, (R + 0.02) * Math.cos(a), (R + 0.02) * Math.sin(a));
    quad.rotation.x = a;
    quad.computeWorldMatrix(true);
    quads.push(quad);
    const inQuad = (mesh, mat, x, y, z) => { add(mesh, mat); mesh.parent = quad; mesh.position.set(x, y, z); return mesh; };
    // (The plate thick enough not to shadow itself: a 5 cm one went black in the Sun's map.)
    inQuad(CreateBox(`${name}QuadPlate${k}`, { width: 0.9, height: 0.14, depth: 0.72 }, scene), metal, 0, 0, 0);
    inQuad(CreateBox(`${name}QuadBox${k}`, { width: 0.6, height: 0.2, depth: 0.42 }, scene), metal, 0, 0.15, 0);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = inQuad(CreateCylinder(`${name}Rcs${k}${dx}${dz}`, { height: 0.24, diameterTop: 0.14, diameterBottom: 0.05, tessellation: 10 }, scene), dark, dx * 0.41, 0.14, dz * 0.32);
      if (dx) n.rotation.z = -dx * PI / 2;
      else n.rotation.x = dz * PI / 2;
    }
  });

  // The high-gain antenna as Columbia flew it (AS11-37-5446): out from the aft skirt on the
  // +y side, on a boom, four dark mesh dishes in a square round a small gold horn, facing
  // ahead.
  const dishTex = paintTexture(scene, `${name}DishT`, 128, 128, (g, w, h) => {
    g.fillStyle = '#4a4c50';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(190,192,196,.9)';
    g.lineWidth = 2;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * h); g.stroke();
    }
    g.strokeStyle = 'rgba(200,200,204,.9)';
    g.lineWidth = 4;
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.48, 0, TAU); g.stroke();
  });
  const dishMat = material(scene, `${name}DishMat`, dishTex, { spec: 0.35, power: 30 });
  const hx = -4.85, hr = 3.05; // the dishes' centre: aft of the skirt, out on +y
  rod(`${name}Boom`, [-4.65, R - 0.1, 0], [hx - 0.1, hr - 0.15, 0], 0.09, metal);
  rod(`${name}HgaFrameA`, [hx - 0.1, hr - 0.42, -0.42], [hx - 0.1, hr + 0.42, 0.42], 0.04, metal);
  rod(`${name}HgaFrameB`, [hx - 0.1, hr - 0.42, 0.42], [hx - 0.1, hr + 0.42, -0.42], 0.04, metal);
  for (const [dy, dz] of [[0.42, 0.42], [0.42, -0.42], [-0.42, 0.42], [-0.42, -0.42]]) {
    const dish = add(CreateSphere(`${name}Dish${dy}${dz}`, { diameter: 0.79, segments: 12, slice: 0.5, sideOrientation: Mesh.DOUBLESIDE }, scene), dishMat, hx, hr + dy, dz);
    dish.rotation.z = PI / 2; // the bowl opens toward +x
    dish.scaling.y = 0.3;
  }
  add(CreateBox(`${name}HgaHorn`, { width: 0.3, height: 0.2, depth: 0.2 }, scene), gold, hx - 0.05, hr, 0);

  // Merge what doesn't move into one mesh per material (few draw calls on a phone).
  for (const [mat, meshes] of parts) {
    for (const m of meshes) m.computeWorldMatrix(true);
    const merged = meshes.length > 1 ? Mesh.MergeMeshes(meshes, true, true) : meshes[0];
    merged.name = `${name}${mat.name.slice(name.length)}Body`;
    merged.parent = root;
    merged.material = mat;
    merged.isPickable = false;
  }

  // The jets' puffs, exactly as render/columbia3d.js makes them (the user, 2026-11-22,
  // chose sample "1+2+3"): a fan bright at the nozzle that spreads and thins at once, 0.1 s
  // bursts each with a flash, grains of frozen propellant flung out along the fan.
  const glowTex = (w, h, paint) => {
    const tex = new DynamicTexture(`${name}Glow${w}x${h}`, { width: w, height: h }, scene, false);
    paint(tex.getContext());
    tex.update();
    return tex;
  };
  const fanTex = glowTex(64, 256, (c) => {
    const g = c.createLinearGradient(0, 256, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(235,238,245,0.75)');
    g.addColorStop(0.45, 'rgba(200,210,225,0.25)');
    g.addColorStop(1, 'rgba(180,190,210,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 256);
  });
  const dotTex = glowTex(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,240,215,0.6)');
    g.addColorStop(1, 'rgba(255,220,180,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  const glowMat = (part, tex, color) => {
    const m = new StandardMaterial(`${name}${part}`, scene);
    m.disableLighting = true;
    m.emissiveTexture = tex;
    m.opacityTexture = tex;
    m.emissiveColor = color;
    m.backFaceCulling = false;
    m.alphaMode = Constants.ALPHA_ADD;
    m.disableDepthWrite = true;
    return m;
  };
  const fanMat = glowMat('PuffFan', fanTex, new Color3(0.9, 0.92, 0.96));
  const flashMat = glowMat('PuffFlash', dotTex, new Color3(1, 0.93, 0.8));
  const grainMat = glowMat('PuffGrain', dotTex, new Color3(0.85, 0.9, 1));
  // (Light, not stuff: none of it casts a shadow, render/challenger3d.js shadeChallenger.)
  const glowing = (mesh) => {
    mesh.isPickable = false;
    mesh.metadata = { ...mesh.metadata, light: true };
    mesh.setEnabled(false);
    return mesh;
  };
  const jets = { fwd: [], side: [] };
  quads.forEach((quad, k) => {
    for (const kind of ['fwd', 'side']) {
      const dir = kind === 'fwd' ? [1, 0, 0] : [0, 0, k % 2 ? -1 : 1];
      const at = kind === 'fwd' ? [0.53, 0.14, 0] : [0, 0.14, k % 2 ? -0.44 : 0.44];
      const fan = glowing(CreateCylinder(`${name}PuffFan${kind}${k}`, { height: 1, diameterTop: 1.7, diameterBottom: 0.06, tessellation: 24, cap: Mesh.NO_CAP }, scene));
      fan.material = fanMat;
      fan.parent = quad;
      if (kind === 'fwd') fan.rotation.z = -PI / 2;
      else fan.rotation.x = k % 2 ? -PI / 2 : PI / 2;
      const flash = glowing(CreatePlane(`${name}PuffFlash${kind}${k}`, { size: 1 }, scene));
      flash.material = flashMat;
      flash.parent = quad;
      flash.billboardMode = Mesh.BILLBOARDMODE_ALL;
      flash.position.set(at[0] + dir[0] * 0.07, at[1], at[2] + dir[2] * 0.07);
      const grains = [];
      for (let i = 0; i < 24; i++) {
        const grain = glowing(CreatePlane(`${name}PuffGrain${kind}${k}_${i}`, { size: 0.07 }, scene));
        grain.material = grainMat;
        grain.parent = quad;
        grain.billboardMode = Mesh.BILLBOARDMODE_ALL;
        grains.push({ mesh: grain, v: [0, 0, 0], age: 9, life: 1 });
      }
      jets[kind].push({ fan, flash, grains, at, dir, next: 0 });
    }
  });
  const PULSE = 0.24, BURST = 0.1;
  const fired = { fwd: -1, side: -1 };
  let lastT = null;
  const LENGTH = 3.55 + 7.42; // probe head to the nozzle's exit
  return {
    root,
    length: LENGTH,
    // fwd, side: how hard each set of jets is on now (0 to 1); t: the course's clock (s).
    pose({ fwd = 0, side = 0, t = performance.now() / 1000 } = {}) {
      const dt = lastT === null ? 0 : Math.max(0, Math.min(0.1, t - lastT));
      lastT = t;
      for (const [kind, v] of [['fwd', fwd], ['side', side]]) {
        const on = v > 0.02;
        const pulse = Math.floor(t / PULSE);
        const inPulse = t - pulse * PULSE;
        const k = on && inPulse < BURST ? Math.min(1, inPulse / 0.015) * Math.exp(-inPulse / 0.06) * (0.6 + 0.4 * v) : 0;
        const fresh = on && pulse !== fired[kind];
        if (fresh) fired[kind] = pulse;
        for (const jet of jets[kind]) {
          const { fan, flash, at, dir } = jet;
          fan.setEnabled(k > 0.02);
          if (k > 0.02) {
            const jitter = 0.92 + 0.08 * Math.random();
            const len = (1.6 + 1.4 * k) * jitter;
            const wide = (0.7 + 0.5 * k) * jitter;
            fan.scaling.set(wide, len, wide);
            fan.position.set(at[0] + dir[0] * len * 0.5, at[1], at[2] + dir[2] * len * 0.5);
            fan.visibility = 0.75 * k;
          }
          flash.setEnabled(k > 0.05);
          if (k > 0.05) {
            flash.scaling.setAll(0.35 + 0.5 * k);
            flash.visibility = k;
          }
          if (fresh) {
            for (let i = 0; i < 6; i++) {
              const g = jet.grains[jet.next];
              jet.next = (jet.next + 1) % jet.grains.length;
              const speed = 3 + 4 * Math.random();
              const a = Math.random() * TAU;
              const r = 0.55 * Math.random();
              const across = dir[0] ? [0, Math.cos(a), Math.sin(a)] : [Math.cos(a), Math.sin(a), 0];
              g.v = dir.map((d, n) => speed * (d + r * across[n]));
              g.age = 0;
              g.life = 0.6 + 0.8 * Math.random();
              g.mesh.position.set(at[0] + dir[0] * 0.07, at[1], at[2] + dir[2] * 0.07);
            }
          }
          for (const g of jet.grains) {
            if (g.age >= g.life) {
              g.mesh.setEnabled(false);
              continue;
            }
            g.age += dt;
            g.mesh.setEnabled(true);
            g.mesh.position.x += g.v[0] * dt;
            g.mesh.position.y += g.v[1] * dt;
            g.mesh.position.z += g.v[2] * dt;
            g.mesh.visibility = 0.9 * Math.max(0, 1 - g.age / g.life) * (0.6 + 0.4 * Math.random());
          }
        }
      }
    },
  };
}
