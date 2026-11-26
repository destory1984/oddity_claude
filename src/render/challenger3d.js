import { Vector3, Quaternion, Color3, StandardMaterial, TransformNode, DynamicTexture, Mesh, VertexData, CreateCylinder, CreateBox, CreatePlane, Texture, ShadowGenerator } from './babylon.js';

// The space shuttle Challenger as Bruce McCandless saw it in February 1984 (STS-41-B), rebuilt
// from the photographs S84-27020 (the whole orbiter from above, the bay open) and S84-27040
// (from the bay, looking aft at the fin and the port OMS pod) by the img2threejs method
// (on the branch try/challenger-img2, trial/img2: the spec, the generated Three.js factory,
// the notes; S84-27020's forward bay for its dark quilted blankets). In metres: nose at +x, the
// payload bay on top (+y), port side +z. Her two bay doors swing open on their hinges and her
// arm (the RMS, on the port sill) moves at the shoulder, elbow and wrist, as the model before
// it did (the user, 2026-11-26: "넣고, 챌린저로 가자", "이쪽 디테일을 좀 더 넣어봐", "넣어").
//
// Stations from the orbiter's own (x = 9.2 - (Xo - 582) * 0.0254): nose +17.9, bay +9.2 to -9.2,
// base -14.8, body flap to -17.0, fin tip -19.3; 37.2 m long, 23.8 m across the wings, the fin
// 8 m over the aft fuselage. Surfaces are painted here (tiles, blankets, radiators, the words on
// the wings), not loaded; parts that share a paint and do not move are merged into one mesh.

const PI = Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const spow = (v, p) => Math.sign(v) * Math.abs(v) ** p;

const NOSE = 17.9;
const BASE = -14.8;
const BAY = [-9.2, 9.2];
// The body's cross-sections along x: half width, bottom, top (metres).
const PROFILE = [
  [17.9, 0.03, -0.74, -0.56],
  [17.72, 0.55, -1.32, 0.0],
  [17.2, 1.02, -1.8, 0.66],
  [16.3, 1.55, -2.12, 1.48],
  [15.2, 2.05, -2.3, 2.38],
  [13.9, 2.44, -2.38, 3.2],
  [12.6, 2.64, -2.4, 3.66],
  [10.8, 2.68, -2.4, 3.76],
  [9.8, 2.68, -2.4, 3.6],
  [9.2, 2.68, -2.4, 3.55],
  [-9.2, 2.68, -2.4, 3.55],
  [-12.0, 2.69, -2.33, 3.47],
  [-14.8, 2.64, -2.08, 3.36],
];
function section(x) {
  let i = 0;
  while (i < PROFILE.length - 2 && x < PROFILE[i + 1][0]) i++;
  const [x0, w0, b0, t0] = PROFILE[i];
  const [x1, w1, b1, t1] = PROFILE[i + 1];
  const t = clamp01((x - x0) / (x1 - x0));
  const hw = lerp(w0, w1, t), yb = lerp(b0, b1, t), yt = lerp(t0, t1, t);
  const ys = yb + (yt - yb) * 0.55;
  const nLow = x > 13 ? lerp(4, 2.2, clamp01((x - 13) / 4.9)) : 4;
  const nUp = x > BAY[1] ? 2.5 : x < BAY[0] ? 2.9 : 2;
  return { hw, yb, yt, ys, nLow, nUp };
}
// A point on the body: lower half (phi 0 at port, PI/2 at the keel, PI at starboard) or upper
// half (phi 0 at port, PI/2 at the top, PI at starboard).
function onBody(x, phi, upper, inset = 0) {
  const s = section(x);
  const hw = s.hw - inset;
  if (upper) {
    const hh = s.yt - s.ys - inset;
    return [x, s.ys + hh * Math.abs(Math.sin(phi)) ** (2 / s.nUp), hw * spow(Math.cos(phi), 2 / s.nUp)];
  }
  const hh = s.ys - s.yb - inset;
  return [x, s.ys - hh * Math.abs(Math.sin(phi)) ** (2 / s.nLow), hw * spow(Math.cos(phi), 2 / s.nLow)];
}

// A surface from a grid: at(u, v) gives [x, y, z]; uv(u, v, p) gives its texture place (default u, v).
function surface(scene, name, parent, material, rows, cols, at, uv = null) {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const u = j / cols, v = i / rows;
      const p = at(u, v);
      positions.push(...p);
      uvs.push(...(uv ? uv(u, v, p) : [u, v]));
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return meshOf(scene, name, parent, material, positions, indices, uvs);
}
function meshOf(scene, name, parent, material, positions, indices, uvs) {
  const normals = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData();
  Object.assign(data, { positions, indices, normals, uvs });
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  mesh.parent = parent;
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}
// A flat fan: the outline's points [x, y, z] round a middle, uv from (z, y) over the box.
function fan(scene, name, parent, material, outline, box) {
  const n = outline.length;
  const mid = outline.reduce((s, p) => s.map((v, i) => v + p[i] / n), [0, 0, 0]);
  const positions = [...mid, ...outline.flat()];
  const uv = (p) => [(p[2] - box.z0) / (box.z1 - box.z0), 1 - (p[1] - box.y0) / (box.y1 - box.y0)];
  const uvs = [...uv(mid), ...outline.flatMap(uv)];
  const indices = [];
  for (let i = 0; i < n; i++) indices.push(0, 1 + i, 1 + ((i + 1) % n));
  return meshOf(scene, name, parent, material, positions, indices, uvs);
}

// ---- Paint ----
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
function canvasTexture(scene, name, w, h, paint, { u = 1, v = 1, clamp = false } = {}) {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, false);
  const g = tex.getContext();
  paint(g, w, h, seeded(name.length * 7919 + w));
  tex.update(false);
  tex.uScale = u;
  tex.vScale = v;
  if (clamp) {
    tex.wrapU = Texture.CLAMP_ADDRESSMODE;
    tex.wrapV = Texture.CLAMP_ADDRESSMODE;
  }
  tex.anisotropicFilteringLevel = 8;
  return tex;
}
function spots(g, w, h, rnd, count, rgb, alpha, size) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h, r = size * (0.3 + rnd());
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(${rgb},${(alpha * (0.3 + rnd())).toFixed(3)})`);
    spot.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
// Tiles in a grid, each a little lighter or darker. The flown orbiters' white tiles: most a
// clean warm white, a few new ones whiter, some gone yellow, some grey with use; on black tiles
// faded grey ones. Rows of a shade run together a little, as tiles were replaced a stretch at a time.
function paintTiles(g, w, h, rnd, { base, spread, size, gap, gapColor, x0 = 0, y0 = 0, x1 = w, y1 = h, sizeY = size }) {
  g.fillStyle = gapColor;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const white = base[0] > 128;
  let run = 0;
  for (let y = y0; y < y1; y += sizeY) {
    for (let x = x0; x < x1; x += size) {
      if (rnd() < 0.05) run = (rnd() - 0.5) * spread * 1.4;
      run *= 0.85;
      let c = base.map((n) => n + (rnd() - 0.5) * spread + run);
      const r = rnd();
      if (white) {
        if (r < 0.03) c = c.map((n) => n + 14);
        else if (r < 0.07) c = [c[0] + 2, c[1] - 2, c[2] - 14];
        else if (r < 0.1) c = c.map((n) => n - 18);
      } else if (r < 0.07) c = c.map((n) => n + 16 + rnd() * 14);
      c = c.map((n) => Math.max(0, Math.min(255, Math.round(n))));
      g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      g.fillRect(x + gap, y + gap, size - gap, sizeY - gap);
    }
  }
}
const WHITE_TILE = { base: [228, 225, 216], spread: 9, gap: 1, gapColor: '#bdb9ae' };
const BLACK_TILE = { base: [30, 30, 32], spread: 12, gap: 1, gapColor: '#0f0f10' };
// The white blankets (AFRSI / FRSI): quilted squares with their stitching, soft hollows.
function paintBlanket(g, w, h, rnd, { size = 64, base = [230, 227, 218], dirt = 0.1 } = {}) {
  g.fillStyle = `rgb(${base.join(',')})`;
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const pillow = g.createRadialGradient(x + size / 2, y + size / 2, size * 0.1, x + size / 2, y + size / 2, size * 0.75);
      pillow.addColorStop(0, `rgba(255,255,252,${(0.2 + rnd() * 0.1).toFixed(3)})`);
      pillow.addColorStop(1, 'rgba(120,114,100,0.18)');
      g.fillStyle = pillow;
      g.fillRect(x, y, size, size);
    }
  }
  g.strokeStyle = 'rgba(120,114,100,0.55)';
  g.lineWidth = 1;
  g.setLineDash([3, 3]);
  for (let y = 0; y <= h; y += size) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
  for (let x = 0; x <= w; x += size) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
  g.setLineDash([]);
  spots(g, w, h, rnd, 30, '70,64,52', dirt, 60);
  spots(g, w, h, rnd, 16, '190,165,110', dirt, 60);
}
function materialOf(scene, name, tex, { spec = 0.08, power = 24, emissive = 0, color = null } = {}) {
  const m = new StandardMaterial(name, scene);
  if (tex) m.diffuseTexture = tex;
  if (color) m.diffuseColor = Color3.FromArray(color);
  m.specularColor = new Color3(spec, spec, spec);
  m.specularPower = power;
  if (emissive) m.emissiveColor = new Color3(emissive, emissive, emissive);
  m.backFaceCulling = false;
  m.twoSidedLighting = true;
  return m;
}
// Words drawn on a canvas turned so that they read the right way on the ship:
// right and down are where the text's right and down go on the canvas.
function writeAt(g, x, y, right, down, draw) {
  g.save();
  g.setTransform(right[0], right[1], down[0], down[1], x, y);
  draw(g);
  g.restore();
}
function flagAt(g, w, h) {
  for (let k = 0; k < 13; k++) { g.fillStyle = k % 2 ? '#f2efe8' : '#b0262f'; g.fillRect(0, (k * h) / 13, w, h / 13 + 0.5); }
  g.fillStyle = '#26315e';
  g.fillRect(0, 0, w * 0.4, (h * 7) / 13);
  g.fillStyle = '#f2efe8';
  for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) g.fillRect(w * 0.025 + (c + (r % 2 ? 0.5 : 0)) * w * 0.063, h * 0.03 + r * h * 0.057, w * 0.012, h * 0.022);
}

// ---- The wing (planform) ----
const W_ROOT = 2.6;
const WING_TIP = 11.9;
// Leading edge: the 81 degree strake from just behind the crew module, then 45 degrees outboard,
// the tip rounded; trailing edge (elevons) nearly straight across.
function wingLE(z) {
  if (z < 4.5) return lerp(7.4, -3.2, (z - W_ROOT) / (4.5 - W_ROOT));
  const x = -3.2 - (z - 4.5);
  return z > 11.2 ? x - ((z - 11.2) / 0.7) ** 2 * 0.7 : x;
}
const wingTE = (z) => lerp(-14.6, -14.2, (z - W_ROOT) / (WING_TIP - W_ROOT));
const wingY = (z) => -1.66 + (z - W_ROOT) * 0.06;
// Thickness: deep where the wing box is (behind the strake), thin on the strake and at the tip.
const wingT = (z) => lerp(1.3, 0.32, (z - W_ROOT) / (WING_TIP - W_ROOT));
function airfoil(c) {
  return 5 * (0.2969 * Math.sqrt(c) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1015 * c ** 4);
}
function wingPoint(side, u, v, upper) {
  const z = lerp(W_ROOT, WING_TIP, v);
  const c = (1 - Math.cos(u * PI)) / 2;
  const le = wingLE(z), te = wingTE(z);
  const x = lerp(le, te, c);
  // The thick part sits over the wing box, not on the long thin strake.
  const box = clamp01((x - 2) / -6);
  const t = wingT(z) * airfoil(c) * lerp(0.45, 1, box);
  const y = wingY(z) + (upper ? 0.6 * t : -0.4 * t);
  return [x, y, side * z];
}
// The wings' paint in planform: px from the nose end (x 7.6) to the tail (x -15.4), py from the
// root (z 2.6) to the tip; port on the left half of the canvas, starboard on the right.
const WX = [7.6, -15.4], WZ = [W_ROOT, 12.0];
const wingUV = (side) => (u, v, p) => [(side > 0 ? 0 : 0.5) + 0.5 * ((p[0] - WX[0]) / (WX[1] - WX[0])), (Math.abs(p[2]) - WZ[0]) / (WZ[1] - WZ[0])];
function paintWings(g, W, H, rnd) {
  const w = W / 2;
  for (const side of [1, -1]) {
    const ox = side > 0 ? 0 : w;
    const px = (x) => ox + ((x - WX[0]) / (WX[1] - WX[0])) * w;
    const py = (z) => ((z - WZ[0]) / (WZ[1] - WZ[0])) * H;
    // Blankets inboard and forward (AFRSI, big quilts), tiles over the wing box.
    paintTiles(g, W, H, rnd, { ...WHITE_TILE, size: 10, x0: ox, x1: ox + w });
    const quilt = (x0, z0, x1, z1) => {
      g.save();
      g.beginPath();
      g.rect(px(x0), py(z0), px(x1) - px(x0), py(z1) - py(z0));
      g.clip();
      g.fillStyle = 'rgb(232,229,220)';
      g.fill();
      g.strokeStyle = 'rgba(150,144,130,0.55)';
      g.lineWidth = 1;
      for (let x = px(x0); x < px(x1); x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = py(z0); y < py(z1); y += 22) { g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + w, y); g.stroke(); }
      g.restore();
    };
    quilt(5, W_ROOT, -9, 4.6);
    spots(g, W, H, rnd, 25, '70,64,52', 0.07, 40);
    // The leading edge: grey carbon panels along it, black tiles behind on the strake.
    const leLine = (off) => {
      g.beginPath();
      for (let z = W_ROOT; z <= WING_TIP + 0.01; z += 0.1) {
        const x = wingLE(z) - off;
        if (z === W_ROOT) g.moveTo(px(x), py(z)); else g.lineTo(px(x), py(z));
      }
    };
    g.lineCap = 'round';
    g.strokeStyle = '#1e1e20';
    g.lineWidth = 0.9 * (w / 23);
    leLine(0.6);
    g.stroke();
    g.strokeStyle = '#4a4a4e';
    g.lineWidth = 0.6 * (w / 23);
    leLine(0.15);
    g.stroke();
    g.strokeStyle = 'rgba(20,20,22,0.8)';
    g.lineWidth = 1.5;
    for (let z = 4.6; z < WING_TIP; z += 0.55) { g.beginPath(); g.moveTo(px(wingLE(z) + 0.1), py(z)); g.lineTo(px(wingLE(z) - 0.42), py(z)); g.stroke(); }
    // The elevons: black tiles along the hinge gap, a black trailing edge, the split between
    // inboard and outboard elevon.
    const hinge = (z) => lerp(wingTE(z), wingLE(z), 0.17 - (z - W_ROOT) * 0.006);
    g.fillStyle = '#18181a';
    g.beginPath();
    g.moveTo(px(hinge(W_ROOT + 0.4)), py(W_ROOT + 0.4));
    g.lineTo(px(hinge(WING_TIP - 0.6)), py(WING_TIP - 0.6));
    g.lineTo(px(hinge(WING_TIP - 0.6) - 0.45), py(WING_TIP - 0.6));
    g.lineTo(px(hinge(W_ROOT + 0.4) - 0.55), py(W_ROOT + 0.4));
    g.fill();
    g.fillRect(px(wingTE(W_ROOT) + 0.25), 0, px(wingTE(W_ROOT)) - px(wingTE(W_ROOT) + 0.25) + 2, H);
    g.fillStyle = 'rgba(25,25,27,0.85)';
    const zSplit = 7.3;
    g.fillRect(Math.min(px(hinge(zSplit)), px(wingTE(zSplit))), py(zSplit) - 2, Math.abs(px(wingTE(zSplit)) - px(hinge(zSplit))), 4);
    // The black tip edge.
    g.fillRect(ox, py(WING_TIP - 0.12), w, H - py(WING_TIP - 0.12));
    // Faint streaks aft from the leading edge.
    g.strokeStyle = 'rgba(80,74,62,0.06)';
    g.lineWidth = 6;
    for (let i = 0; i < 40; i++) { const y = rnd() * H; g.beginPath(); g.moveTo(ox + rnd() * w * 0.5, y); g.lineTo(ox + w, y + (rnd() - 0.5) * 20); g.stroke(); }
    // The words: seen from above with the nose up they read left to right, their tops to the
    // nose (S84-27020): USA and the flag on the port wing, NASA and the name on the starboard.
    // On this canvas the nose is to the left (-px); the text's right is the ship's starboard.
    const right = side > 0 ? [0, -1] : [0, 1];
    const down = [1, 0];
    const m = w / 23; // px per metre along x
    const n = H / (WZ[1] - WZ[0]);
    const word = (text, x, z, height, font, widthM) => writeAt(g, px(x), py(z), [right[0] * n / m, right[1] * n / m], down, (c) => {
      c.fillStyle = '#121214';
      c.font = `bold ${height * m}px ${font}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const tw = c.measureText(text).width;
      const k = (widthM * m) / tw;
      c.scale(k, 1);
      c.fillText(text, 0, 0);
    });
    if (side > 0) {
      word('USA', -8.5, 6.6, 1.5, 'Helvetica, Arial, sans-serif', 3.9);
      writeAt(g, px(-10.8 + 0.72), py(6.6 + 1.35), [right[0] * n / m, right[1] * n / m], down, (c) => flagAt(c, 2.7 * m, 1.45 * m));
    } else {
      word('NASA', -8.5, 6.6, 1.5, '"Arial Black", Arial, sans-serif', 4.3);
      word('Challenger', -10.3, 6.9, 0.95, 'Helvetica, Arial, sans-serif', 5.0);
    }
  }
}
function paintWingUnder(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { ...BLACK_TILE, size: 12 });
  spots(g, w, h, rnd, 30, '120,118,112', 0.1, 40);
}

// ---- The fin (side view, x along the canvas, y up it) ----
const FIN_Y0 = 3.3, FIN_H = 8.05;
function finLE(s) { return lerp(-9.0, -17.0, s); }
function finTE(s) { return lerp(-17.6, -19.3, s); }
function finPoint(u, v, side) {
  const c = (1 - Math.cos(u * PI)) / 2;
  const x = lerp(finLE(v), finTE(v), c);
  const t = lerp(0.62, 0.24, v) * airfoil(c);
  return [x, FIN_Y0 + v * FIN_H, side * 0.5 * t];
}
const FX = [-8.8, -19.5];
const finUV = (u, v, p) => [(p[0] - FX[0]) / (FX[1] - FX[0]), 1 - (p[1] - FIN_Y0) / FIN_H];
function paintFin(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { ...WHITE_TILE, size: 14 });
  spots(g, w, h, rnd, 20, '70,64,52', 0.07, 40);
  const px = (x) => ((x - FX[0]) / (FX[1] - FX[0])) * w;
  const py = (y) => (1 - (y - FIN_Y0) / FIN_H) * h;
  const m = w / Math.abs(FX[1] - FX[0]);
  // The black tile strip along the leading edge (S84-27040), its tiles in two columns.
  g.save();
  g.beginPath();
  g.moveTo(px(finLE(0)), py(FIN_Y0));
  g.lineTo(px(finLE(1)), py(FIN_Y0 + FIN_H));
  g.lineTo(px(finLE(1) - 0.75), py(FIN_Y0 + FIN_H));
  g.lineTo(px(finLE(0) - 0.75), py(FIN_Y0));
  g.closePath();
  g.clip();
  paintTiles(g, w, h, rnd, { ...BLACK_TILE, size: 0.32 * m });
  g.restore();
  // The rudder / speed brake: its hinge line and the split down its middle.
  g.fillStyle = 'rgba(40,40,42,0.85)';
  g.beginPath();
  g.moveTo(px(lerp(finLE(0), finTE(0), 0.64)), py(FIN_Y0 + 0.4));
  g.lineTo(px(lerp(finLE(0.92), finTE(0.92), 0.6)), py(FIN_Y0 + 0.92 * FIN_H));
  g.lineTo(px(lerp(finLE(0.92), finTE(0.92), 0.6)) + 3, py(FIN_Y0 + 0.92 * FIN_H));
  g.lineTo(px(lerp(finLE(0), finTE(0), 0.64)) + 3, py(FIN_Y0 + 0.4));
  g.fill();
  g.fillRect(px(lerp(finLE(0.45), finTE(0.45), 0.6)), py(FIN_Y0 + 0.45 * FIN_H) - 1, px(finTE(0.45)) - px(lerp(finLE(0.45), finTE(0.45), 0.6)), 3);
  // A black trailing edge and tip cap.
  g.fillRect(0, 0, w, py(FIN_Y0 + FIN_H - 0.12));
  g.beginPath();
  g.moveTo(px(finTE(0)), py(FIN_Y0));
  g.lineTo(px(finTE(1)), py(FIN_Y0 + FIN_H));
  g.lineTo(px(finTE(1)) - 6, py(FIN_Y0 + FIN_H));
  g.lineTo(px(finTE(0)) - 6, py(FIN_Y0));
  g.fill();
}

// ---- The forward fuselage's top: tiles, the black window mask, windows, the forward RCS ----
const CABIN = [BAY[1], NOSE];
function paintForward(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { ...WHITE_TILE, size: 18 });
  spots(g, w, h, rnd, 20, '70,64,52', 0.06, 50);
  const px = (phi) => (phi / PI) * w;
  const py = (x) => ((x - CABIN[0]) / (CABIN[1] - CABIN[0])) * h;
  const blackPoly = (pts) => {
    g.save();
    g.beginPath();
    pts.forEach(([a, x], i) => (i ? g.lineTo(px(a), py(x)) : g.moveTo(px(a), py(x))));
    g.closePath();
    g.clip();
    paintTiles(g, w, h, rnd, { ...BLACK_TILE, size: 16 });
    g.restore();
  };
  const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([a, x]) => [PI - a, x])];
  // The window mask, the "moustache" round the six windshield panes and the two overhead ones.
  blackPoly(mirror([[0.42, 15.15], [0.6, 14.95], [0.72, 13.85], [1.1, 13.65], [1.24, 13.65], [1.24, 12.4], [1.55, 12.4]]));
  // Forward RCS module: black tiles over the nose top, with its thruster holes, its door
  // outlined behind it; the nose cap grey carbon.
  blackPoly(mirror([[0.42, 17.45], [0.5, 16.55], [1.0, 16.35], [1.57, 16.35]]));
  g.strokeStyle = '#1c1c1e';
  g.lineWidth = 3;
  g.strokeRect(px(1.08), py(15.55), px(PI - 1.08) - px(1.08), py(16.3) - py(15.55));
  const glass = (a0, a1, x0, x1, skew = 0) => {
    const gl = g.createLinearGradient(px(a0), py(x1), px(a1), py(x0));
    gl.addColorStop(0, '#06080c');
    gl.addColorStop(0.55, '#2a2d33');
    gl.addColorStop(1, '#07090d');
    g.fillStyle = gl;
    g.beginPath();
    g.moveTo(px(a0) + skew, py(x1));
    g.lineTo(px(a1) - skew, py(x1));
    g.lineTo(px(a1), py(x0));
    g.lineTo(px(a0), py(x0));
    g.closePath();
    g.fill();
    g.strokeStyle = '#38383a';
    g.lineWidth = 2;
    g.stroke();
  };
  const panes = [[0.7, 0.98], [1.02, 1.3], [1.34, 1.54], [PI - 1.54, PI - 1.34], [PI - 1.3, PI - 1.02], [PI - 0.98, PI - 0.7]];
  for (const [a0, a1] of panes) glass(a0, a1, 14.05, 14.7, 5);
  glass(1.28, 1.5, 12.5, 13.1);
  glass(PI - 1.5, PI - 1.28, 12.5, 13.1);
  // Thruster holes: two rows of three, each side, with soot blown back.
  for (const a of [0.6, 0.78, PI - 0.78, PI - 0.6]) {
    for (const x of [16.95, 16.7]) {
      g.fillStyle = '#070708';
      g.beginPath();
      g.ellipse(px(a), py(x), 7, 6, 0, 0, 2 * PI);
      g.fill();
      g.strokeStyle = '#555558';
      g.lineWidth = 1.5;
      g.stroke();
    }
  }
  const cap = g.createLinearGradient(0, py(17.45), 0, py(NOSE));
  cap.addColorStop(0, '#2c2c2f');
  cap.addColorStop(1, '#3d3d41');
  g.fillStyle = cap;
  g.fillRect(0, py(17.5), w, h - py(17.5));
  // The name on both sides below the windows (S84-27020: "Cha..." on the port side),
  // reading from the nose aft on the port side and from the tail forward on the starboard.
  const m = h / (CABIN[1] - CABIN[0]); // px per metre along x
  const k = (w / PI) / 2.0; // px per metre round the side, near the sill
  const name = (a, sgn) => writeAt(g, px(a), py(11.4), [0, sgn * (m / k)], [sgn, 0], (c) => {
    c.fillStyle = '#141416';
    c.font = `bold ${0.5 * k}px Helvetica, Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Challenger', 0, 0);
  });
  name(0.3, -1);
  name(PI - 0.3, 1);
}
// The aft fuselage's top behind the bay (round the fin's root).
function paintAftTop(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { ...WHITE_TILE, size: 16 });
  spots(g, w, h, rnd, 20, '70,64,52', 0.08, 40);
}
// The sides: white blankets above, the black tiles' edge below, along the whole body.
function paintSide(g, w, h, rnd) {
  paintBlanket(g, w, h, rnd, { size: 36, base: [232, 229, 220], dirt: 0.08 });
}
// The bay's lining (S84-27020): dark grey-silver quilted blankets over walls and floor, calm and
// low in contrast, the frames across the bay a little darker, a few small fittings and lamps.
// u runs round the bay (about 7.5 m over the canvas), v along it. The bay's own canvas is
// tall (one repeat over its 18.4 m; repeated six times the squares across it vanished).
function paintLiner(g, w, h, rnd, { cw = 32, ch = 64, frame = h / 2, lamps = 2 } = {}) {
  g.fillStyle = '#333336';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += ch) for (let x = 0; x < w; x += cw) {
    const k = Math.round((rnd() - 0.5) * 8);
    // A soft pillow in each quilt square: lighter in the middle, the stitched edges darker.
    const q = g.createLinearGradient(x, y, x + cw, y + ch);
    q.addColorStop(0, `rgb(${68 + k},${69 + k},${73 + k})`);
    q.addColorStop(0.45, `rgb(${59 + k},${60 + k},${64 + k})`);
    q.addColorStop(1, `rgb(${47 + k},${48 + k},${52 + k})`);
    g.fillStyle = q;
    g.fillRect(x + 1, y + 1, cw - 2, ch - 2);
  }
  // The stitching between the squares.
  g.fillStyle = 'rgba(36,36,39,0.55)';
  for (let y = 0; y < h; y += ch) g.fillRect(0, y, w, 2);
  for (let x = 0; x < w; x += cw) g.fillRect(x, 0, 2, h);
  // Silver sheen here and there, as the blankets' foil catches the Sun.
  for (let i = 0; i < (w * h) / 10000; i++) {
    g.fillStyle = `rgba(170,172,178,${(0.04 + rnd() * 0.06).toFixed(3)})`;
    g.fillRect(Math.floor(rnd() * (w / cw)) * cw + 1, Math.floor(rnd() * (h / ch)) * ch + 1, cw - 2, ch * (1 + Math.floor(rnd() * 2)) - 2);
  }
  // The frames across the bay, every 1.5 m.
  g.fillStyle = 'rgba(26,26,28,0.6)';
  for (let y = 0; y < h; y += frame) g.fillRect(0, y, w, 6);
  // Wire trays along the floor's edges: thin and dim.
  g.fillStyle = 'rgba(30,30,32,0.5)';
  for (const u of [0.31, 0.69]) g.fillRect(u * w - 3, 0, 6, h);
  // A few small fittings, grey, not white.
  for (let i = 0; i < (w * h) / 26000; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(130,130,134,0.8)' : 'rgba(28,28,30,0.85)';
    g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 5, 3 + rnd() * 5);
  }
  // Floodlights on the walls: small bright rounds, two per repeat each side.
  for (let i = 0; i < 2 * lamps; i++) {
    const x = (i % 2 ? 0.1 : 0.9) * w, y = ((i >> 1) + 0.5) * (h / lamps);
    const r = 7;
    const l = g.createRadialGradient(x, y, 0, x, y, r);
    l.addColorStop(0, 'rgba(255,250,230,1)');
    l.addColorStop(1, 'rgba(255,250,230,0)');
    g.fillStyle = l;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  spots(g, w, h, rnd, Math.round((w * h) / 8700), '20,20,22', 0.12, 50);
}
// The doors' inner faces: four radiator panels each (S84-27020), silvered and the brightest
// thing on her, streaked along their length, framed by dark seams; the door's frame dark.
function paintRadiator(g, w, h, rnd) {
  g.fillStyle = '#2a2c31';
  g.fillRect(0, 0, w, h);
  const panels = 4, edge = 10, seam = 7;
  for (let k = 0; k < panels; k++) {
    const y0 = (k * h) / panels + seam, y1 = ((k + 1) * h) / panels - seam;
    const t = Math.round((rnd() - 0.5) * 14);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, `rgb(${132 + t},${138 + t},${148 + t})`);
    grad.addColorStop(0.35 + rnd() * 0.3, `rgb(${198 + t},${202 + t},${210 + t})`);
    grad.addColorStop(1, `rgb(${140 + t},${146 + t},${156 + t})`);
    g.fillStyle = grad;
    g.fillRect(edge, y0, w - 2 * edge, y1 - y0);
    // Streaks along the panel (the door's length runs down this canvas), and the coolant tubes.
    for (let i = 0; i < 60; i++) {
      const x = edge + rnd() * (w - 2 * edge);
      g.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${(0.05 + rnd() * 0.12).toFixed(3)})` : `rgba(60,66,78,${(0.05 + rnd() * 0.12).toFixed(3)})`;
      g.fillRect(x, y0, 1 + rnd() * 4, y1 - y0);
    }
    for (let x = edge + 6; x < w - edge; x += 16) {
      g.fillStyle = 'rgba(90,96,108,0.22)';
      g.fillRect(x, y0, 2, y1 - y0);
    }
    // A broad dull band across, as the photo's reflections of the Earth's dark make them.
    const band = y0 + rnd() * (y1 - y0) * 0.6;
    const bg = g.createLinearGradient(0, band, 0, band + 120);
    bg.addColorStop(0, 'rgba(60,66,78,0)');
    bg.addColorStop(0.5, `rgba(60,66,78,${(0.12 + rnd() * 0.12).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(60,66,78,0)');
    g.fillStyle = bg;
    g.fillRect(edge, band, w - 2 * edge, 120);
  }
}
function paintMetal(g, w, h, rnd, base = [92, 90, 86]) {
  g.fillStyle = `rgb(${base.join(',')})`;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) {
    const k = Math.round((rnd() - 0.5) * 30);
    g.fillStyle = `rgba(${base[0] + k},${base[1] + k},${base[2] + k},0.5)`;
    g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 30, 1 + rnd() * 2);
  }
}
// The OMS pods: big white tiles in a clear grid (S84-27040), black tiles low on the outboard
// side and at the aft end, where the aft RCS thrusters' ports are. u round the pod (0 at the top,
// going outboard then down), v from the front dome aft.
function paintPod(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { ...WHITE_TILE, size: 18, sizeY: 14 });
  spots(g, w, h, rnd, 25, '70,64,52', 0.08, 40);
  g.save();
  g.beginPath();
  g.rect(w * 0.27, h * 0.25, w * 0.2, h * 0.75);
  g.rect(0, h * 0.86, w, h * 0.14);
  g.clip();
  paintTiles(g, w, h, rnd, { ...BLACK_TILE, size: 14 });
  g.restore();
  // Over the front dome the rows of tiles crowd to a point in this paint: soften them there.
  const dome = g.createLinearGradient(0, 0, 0, h * 0.12);
  dome.addColorStop(0, 'rgba(228,225,216,1)');
  dome.addColorStop(1, 'rgba(228,225,216,0)');
  g.fillStyle = dome;
  g.fillRect(0, 0, w, h * 0.12);
  // The aft RCS ports: rows of dark holes on the black, outboard and aft.
  g.fillStyle = '#050506';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    g.beginPath();
    g.ellipse(w * (0.3 + c * 0.045), h * (0.9 + r * 0.03), 5, 4, 0, 0, 2 * PI);
    g.fill();
  }
}
// The sunshields: quilted white with brown snap dots in rows, the clamshell's seams, and on the
// Westar one the four names facing forward (S84-27040).
function paintShield(g, w, h, rnd, words) {
  paintBlanket(g, w, h, rnd, { size: 34, base: [232, 229, 222], dirt: 0.06 });
  g.fillStyle = '#7a5530';
  for (let y = 18; y < h; y += 38) for (let x = 10 + ((y / 38) % 2) * 20; x < w; x += 40) { g.beginPath(); g.arc(x, y, 2.4, 0, 2 * PI); g.fill(); }
  g.strokeStyle = 'rgba(110,104,90,0.8)';
  g.lineWidth = 3;
  for (const u of [0.25, 0.75]) { g.beginPath(); g.moveTo(u * w, 0); g.lineTo(u * w, h); g.stroke(); }
  for (const u of [0.0, 0.5]) { g.beginPath(); g.moveTo(u * w + 0.05 * w, h); g.lineTo(u * w + 0.22 * w, 0); g.stroke(); }
  if (!words) return;
  // u 0.5 faces forward (+x) on the cylinder as built.
  const c0 = 0.5 * w;
  const label = (x, y, bw, bh, draw) => {
    g.fillStyle = 'rgba(244,242,236,0.95)';
    g.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    g.strokeStyle = 'rgba(120,110,90,0.7)';
    g.lineWidth = 1.5;
    g.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    draw(x, y);
  };
  label(c0 - 70, 40, 120, 34, (x, y) => { g.font = 'bold 15px Arial, sans-serif'; g.fillText('McDONNELL', x, y - 7); g.fillText('DOUGLAS', x, y + 9); });
  label(c0 + 70, 40, 120, 34, (x, y) => { g.font = 'bold 22px Arial, sans-serif'; g.fillText('WU', x, y - 4); g.font = '11px Arial, sans-serif'; g.fillText('western union', x, y + 12); });
  label(c0 - 70, 84, 120, 30, (x, y) => { g.font = 'bold 20px Arial, sans-serif'; g.fillText('HUGHES', x, y); });
  label(c0 + 70, 84, 120, 30, (x, y) => { g.font = '18px Georgia, serif'; g.fillText('WESTAR VI', x, y); });
}

export function buildChallenger(scene, name = 'challenger') {
  const root = new TransformNode(name, scene);
  root.rotationQuaternion = Quaternion.Identity();

  const black = materialOf(scene, `${name}Black`, canvasTexture(scene, `${name}BlackTiles`, 512, 512, (g, w, h, r) => { paintTiles(g, w, h, r, { ...BLACK_TILE, size: 24 }); spots(g, w, h, r, 24, '120,118,112', 0.1, 50); }, { u: 4, v: 18 }));
  const side = materialOf(scene, `${name}SideM`, canvasTexture(scene, `${name}Side`, 512, 512, paintSide, { u: 1, v: 16 }), { spec: 0.05 });
  const forward = materialOf(scene, `${name}ForwardM`, canvasTexture(scene, `${name}Forward`, 1024, 1024, paintForward, { clamp: true }), { spec: 0.12, power: 30 });
  const aftTop = materialOf(scene, `${name}AftTopM`, canvasTexture(scene, `${name}AftTop`, 512, 512, paintAftTop, { u: 3, v: 3 }));
  const liner = materialOf(scene, `${name}LinerM`, canvasTexture(scene, `${name}Liner`, 256, 2048, (g, w, h, r) => paintLiner(g, w, h, r, { cw: 16, ch: 64, frame: 2048 / 12, lamps: 6 })), { spec: 0.1, power: 16 });
  const doorOut = materialOf(scene, `${name}DoorOutM`, canvasTexture(scene, `${name}DoorOut`, 512, 512, (g, w, h, r) => paintBlanket(g, w, h, r, { size: 48 }), { u: 1.5, v: 10 }), { spec: 0.05 });
  // The radiators: bright, with a strong cold glint (no sky to mirror here, so a little light
  // of their own stands in for the Earth they reflect).
  const radiator = materialOf(scene, `${name}RadiatorM`, canvasTexture(scene, `${name}Radiator`, 256, 1024, paintRadiator, { clamp: true }), { spec: 0.9, power: 30, emissive: 0.04 });
  radiator.specularColor = new Color3(0.8, 0.85, 0.95);
  const wings = materialOf(scene, `${name}WingsM`, canvasTexture(scene, `${name}Wings`, 2048, 1024, paintWings, { clamp: true }));
  const wingUnder = materialOf(scene, `${name}WingUnderM`, canvasTexture(scene, `${name}WingUnderT`, 512, 512, paintWingUnder, { u: 6, v: 6 }));
  const fin = materialOf(scene, `${name}FinM`, canvasTexture(scene, `${name}Fin`, 1024, 1024, paintFin, { clamp: true }));
  const pod = materialOf(scene, `${name}PodM`, canvasTexture(scene, `${name}Pod`, 512, 512, paintPod, { clamp: true }));
  const metalTex = canvasTexture(scene, `${name}Metal`, 256, 256, (g, w, h, r) => paintMetal(g, w, h, r));
  const metal = materialOf(scene, `${name}MetalM`, metalTex, { spec: 0.45, power: 40 });
  const dark = materialOf(scene, `${name}DarkM`, null, { color: [0.13, 0.13, 0.14], spec: 0.25 });
  const bell = materialOf(scene, `${name}BellM`, canvasTexture(scene, `${name}BellT`, 512, 256, (g, w, h, r) => {
    paintMetal(g, w, h, r, [96, 82, 66]);
    for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(30,24,18,${(0.35 + r() * 0.2).toFixed(2)})`; g.fillRect(x, 0, 1, h); }
    const burn = g.createLinearGradient(0, 0, 0, h);
    burn.addColorStop(0, 'rgba(20,16,12,0.6)');
    burn.addColorStop(0.5, 'rgba(20,16,12,0.1)');
    burn.addColorStop(1, 'rgba(20,16,12,0)');
    g.fillStyle = burn;
    g.fillRect(0, 0, w, h);
  }), { spec: 0.5, power: 28 });
  const gold = materialOf(scene, `${name}GoldM`, null, { color: [0.74, 0.58, 0.28], spec: 0.6, power: 50 });
  const blanket = materialOf(scene, `${name}BlanketM`, canvasTexture(scene, `${name}Blanket`, 256, 256, (g, w, h, r) => paintBlanket(g, w, h, r, { size: 32 }), { u: 2, v: 2 }), { spec: 0.05 });
  const foil = materialOf(scene, `${name}FoilM`, null, { color: [0.66, 0.64, 0.6], spec: 0.8, power: 60 });

  const X = [BASE, NOSE];
  // Lower body: the black belly and chines, the white sides above them. The black reaches higher
  // round the nose and along the aft chines.
  const blackEdge = (x) => (x > 14.6 ? lerp(0.52, 0.1, clamp01((x - 14.6) / 3.1)) : 0.52);
  surface(scene, `${name}Belly`, root, black, 90, 24, (u, v) => {
    const x = lerp(X[0], X[1], v);
    const e = blackEdge(x);
    return onBody(x, lerp(e, PI - e, u), false);
  });
  for (const [s, mirror] of [['Port', false], ['Star', true]]) {
    surface(scene, `${name}Side${s}`, root, side, 90, 6, (u, v) => {
      const x = lerp(X[0], X[1], v);
      const e = blackEdge(x);
      return onBody(x, mirror ? PI - e * u : e * u, false);
    });
  }
  // Upper body ahead of the bay, and aft of it.
  surface(scene, `${name}Cabin`, root, forward, 60, 40, (u, v) => onBody(lerp(CABIN[0], CABIN[1], v), u * PI, true));
  surface(scene, `${name}AftUpper`, root, aftTop, 16, 30, (u, v) => onBody(lerp(X[0], BAY[0], v), u * PI, true));
  // The bay: its lining, its end walls.
  // Its texture runs round the bay by length, not by angle: the boxy section packs the whole
  // floor into a few degrees, and by angle the quilt there would smear into stripes.
  const arc = [0];
  for (let k = 1, prev = onBody(0, 0, false, 0.12); k <= 120; k++) {
    const p = onBody(0, (k / 120) * PI, false, 0.12);
    arc.push(arc[k - 1] + Math.hypot(p[1] - prev[1], p[2] - prev[2]));
    prev = p;
  }
  const arcU = (u) => { const f = u * 120, k = Math.min(119, Math.floor(f)); return lerp(arc[k], arc[k + 1], f - k) / arc[120]; };
  surface(scene, `${name}BayLiner`, root, liner, 40, 30, (u, v) => onBody(lerp(BAY[0], BAY[1], v), u * PI, false, 0.12), (u, v) => [arcU(u), v]);
  const sectionOutline = (x, steps = 40) => {
    const out = [];
    for (let k = 0; k <= steps; k++) out.push(onBody(x, (k / steps) * PI, false, 0.05));
    for (let k = steps; k >= 0; k--) out.push(onBody(x, (k / steps) * PI, true, 0.05));
    return out;
  };
  const s0 = section(BAY[1]);
  const wallBox = { z0: -s0.hw, z1: s0.hw, y0: s0.yb, y1: s0.yt };
  const wallPx = (w, h) => ({ y: (y) => (1 - (y - wallBox.y0) / (wallBox.y1 - wallBox.y0)) * h, z: (z) => ((z - wallBox.z0) / (wallBox.z1 - wallBox.z0)) * w });
  const fwdWallTex = canvasTexture(scene, `${name}FwdWall`, 512, 512, (g, w, h, rnd) => {
    // The forward bulkhead (S84-27020, the bay's top end): quilted white blankets over most of
    // it, the two aft flight-deck windows high up, the airlock hatch's ring low in the middle,
    // a floodlight either side and dark equipment panels near the floor.
    paintBlanket(g, w, h, rnd, { size: 26, base: [214, 210, 200], dirt: 0.12 });
    const P = wallPx(w, h);
    g.fillStyle = 'rgba(70,68,64,0.9)';
    g.fillRect(0, P.y(-0.9), w, h - P.y(-0.9));
    for (let i = 0; i < 9; i++) {
      g.fillStyle = i % 2 ? '#2c2c2e' : '#5a5856';
      g.fillRect(P.z(-2.2 + i * 0.5), P.y(-1.0), P.z(0.35) - P.z(0), P.y(-1.9) - P.y(-1.0));
    }
    for (const z of [-0.85, 0.85]) {
      g.fillStyle = '#2a2a2c';
      g.fillRect(P.z(z - 0.46), P.y(2.95), P.z(0.92) - P.z(0), P.y(2.1) - P.y(2.95));
      const gl = g.createLinearGradient(P.z(z - 0.38), P.y(2.85), P.z(z + 0.38), P.y(2.2));
      gl.addColorStop(0, '#05070a');
      gl.addColorStop(0.5, '#253040');
      gl.addColorStop(1, '#06080b');
      g.fillStyle = gl;
      g.fillRect(P.z(z - 0.38), P.y(2.85), P.z(0.76) - P.z(0), P.y(2.2) - P.y(2.85));
    }
    g.strokeStyle = '#47474a';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(P.z(0), P.y(0.15), P.z(0.8) - P.z(0), 0, 2 * PI);
    g.stroke();
    g.fillStyle = 'rgba(150,146,138,0.9)';
    g.beginPath();
    g.arc(P.z(0), P.y(0.15), P.z(0.68) - P.z(0), 0, 2 * PI);
    g.fill();
    for (const z of [-1.7, 1.7]) {
      const l = g.createRadialGradient(P.z(z), P.y(1.5), 0, P.z(z), P.y(1.5), 22);
      l.addColorStop(0, 'rgba(255,252,236,1)');
      l.addColorStop(0.35, 'rgba(255,248,220,0.8)');
      l.addColorStop(1, 'rgba(255,248,220,0)');
      g.fillStyle = l;
      g.fillRect(P.z(z) - 22, P.y(1.5) - 22, 44, 44);
    }
  }, { clamp: true });
  fan(scene, `${name}FwdWall`, root, materialOf(scene, `${name}FwdWallM`, fwdWallTex, { spec: 0.05, emissive: 0.06 }), sectionOutline(BAY[1] - 0.02), wallBox);
  const aftWallTex = canvasTexture(scene, `${name}AftWall`, 512, 512, (g, w, h, rnd) => {
    paintLiner(g, w, h, rnd);
    // The aft bulkhead's rim, gold (S84-27040).
    const P = wallPx(w, h);
    g.strokeStyle = '#b8923e';
    g.lineWidth = 9;
    g.beginPath();
    sectionOutline(BAY[0], 40).forEach((p, i) => (i ? g.lineTo(P.z(p[2]), P.y(p[1])) : g.moveTo(P.z(p[2]), P.y(p[1]))));
    g.closePath();
    g.stroke();
  }, { clamp: true });
  fan(scene, `${name}AftWall`, root, materialOf(scene, `${name}AftWallM`, aftWallTex, { spec: 0.08 }), sectionOutline(BAY[0] + 0.02), wallBox);
  // The base, dark, round the engines.
  fan(scene, `${name}Base`, root, dark, sectionOutline(X[0], 30), wallBox);
  // Sills along the bay's edges.
  for (const sd of [1, -1]) {
    const sill = CreateBox(`${name}Sill${sd}`, { width: BAY[1] - BAY[0], height: 0.16, depth: 0.22 }, scene);
    sill.parent = root;
    sill.material = metal;
    sill.position.set(0, s0.ys + 0.02, sd * (s0.hw - 0.08));
  }

  // The doors: each a quarter shell on its hinge at the sill, a white blanket without, the
  // radiators within; their frames show their thickness when they stand open.
  const doors = [];
  const doorParts = [];
  for (const sd of [1, -1]) {
    const hinge = new TransformNode(`${name}Hinge${sd}`, scene);
    hinge.parent = root;
    hinge.position.set(0, s0.ys, sd * s0.hw);
    const from = sd > 0 ? 0 : PI / 2, to = sd > 0 ? PI / 2 : PI;
    const rel = (p) => [p[0], p[1] - s0.ys, p[2] - sd * s0.hw];
    const parts = [
      surface(scene, `${name}DoorOut${sd}`, hinge, doorOut, 30, 16, (u, v) => rel(onBody(lerp(BAY[0], BAY[1], v), lerp(from, to, u), true))),
      surface(scene, `${name}DoorIn${sd}`, hinge, radiator, 30, 16, (u, v) => rel(onBody(lerp(BAY[0], BAY[1], v), lerp(from, to, u), true, 0.08)),
        (u, v) => [sd > 0 ? u : 1 - u, v]),
    ];
    for (const x of [BAY[0], -4.6, 0, 4.6, BAY[1]]) {
      parts.push(surface(scene, `${name}DoorRib${sd}_${x}`, hinge, metal, 1, 16, (u, v) => rel(onBody(x, lerp(from, to, u), true, v * 0.08))));
    }
    // The door's free edge: a dark frame along it.
    parts.push(surface(scene, `${name}DoorEdge${sd}`, hinge, metal, 30, 1, (u, v) => rel(onBody(lerp(BAY[0], BAY[1], v), PI / 2, true, u * 0.08))));
    doorParts.push(parts);
    doors.push({ hinge, side: sd });
  }

  // Wings, fin, body flap.
  for (const sd of [1, -1]) {
    surface(scene, `${name}WingTop${sd}`, root, wings, 30, 36, (u, v) => wingPoint(sd, u, v, true), wingUV(sd));
    surface(scene, `${name}WingUnder${sd}`, root, wingUnder, 24, 24, (u, v) => wingPoint(sd, u, v, false));
    surface(scene, `${name}Fin${sd}`, root, fin, 20, 24, (u, v) => finPoint(u, v, sd), finUV);
  }
  // The body flap: a black wedge under the engines.
  surface(scene, `${name}BodyFlap`, root, black, 3, 8, (u, v) => {
    const a = u * 2 * PI;
    const x = lerp(BASE + 0.3, -17.0, (1 - Math.cos(a)) / 2);
    const thick = lerp(0.55, 0.12, (1 - Math.cos(a)) / 2);
    return [x, -1.75 + (Math.sin(a) > 0 ? 0.5 : -0.5) * thick, lerp(-3.05, 3.05, v)];
  });

  // OMS pods on the aft top either side of the fin, a blunt dome at the bay's aft end.
  const POD = [-9.05, -15.35];
  for (const sd of [1, -1]) {
    const podAt = (u, v) => {
      const x = lerp(POD[0], POD[1], v);
      const d = POD[0] - x;
      const front = d < 2.0 ? Math.cbrt(1 - (1 - d / 2.0) ** 3) : 1;
      const r = front * lerp(1, 0.86, clamp01((d - 2.0) / 4.3));
      // u 0 at the top, round outboard and down to the inner side (under the body's skin).
      const a = u * 2 * PI;
      const y = 3.5 + 1.12 * r * Math.cos(a);
      const z = sd * (2.0 + 1.4 * r * Math.sin(a));
      return [x, y, z];
    };
    surface(scene, `${name}Pod${sd}`, root, pod, 26, 28, podAt, (u, v) => [u, v]);
    const outline = [];
    for (let k = 0; k <= 28; k++) outline.push(podAt(k / 28, 1));
    fan(scene, `${name}PodEnd${sd}`, root, black, outline, { z0: -4, z1: 4, y0: 2, y1: 5 });
    const n = CreateCylinder(`${name}OmsBell${sd}`, { height: 1.1, diameterTop: 0.36, diameterBottom: 1.0, tessellation: 20, cap: Mesh.NO_CAP }, scene);
    n.parent = root;
    n.material = bell;
    n.rotation.z = PI / 2;
    n.position.set(POD[1] - 0.5, 3.7, sd * 2.0);
  }
  // The three main engines, the top one higher, the two below either side.
  for (const [y, z] of [[1.3, 0], [-0.75, 1.35], [-0.75, -1.35]]) {
    const b = CreateCylinder(`${name}Ssme${y}${z}`, { height: 2.9, diameterTop: 1.0, diameterBottom: 2.3, tessellation: 28, cap: Mesh.NO_CAP }, scene);
    b.parent = root;
    b.material = bell;
    b.rotation.z = PI / 2;
    b.position.set(BASE - 1.55, y, z);
    const powerhead = CreateCylinder(`${name}SsmeHead${y}${z}`, { height: 0.6, diameter: 1.15, tessellation: 16 }, scene);
    powerhead.parent = root;
    powerhead.material = dark;
    powerhead.rotation.z = PI / 2;
    powerhead.position.set(BASE - 0.15, y, z);
  }

  // ---- In the bay (STS-41-B): the two closed sunshields of the satellites let go, a pallet
  // ahead of them, the MMU stations at the front, and the arm on the port sill. ----
  const westar = materialOf(scene, `${name}WestarM`, canvasTexture(scene, `${name}Westar`, 1024, 256, (g, w, h, r) => paintShield(g, w, h, r, true), { clamp: true }), { spec: 0.05 });
  const palapa = materialOf(scene, `${name}PalapaM`, canvasTexture(scene, `${name}Palapa`, 512, 256, (g, w, h, r) => paintShield(g, w, h, r, false), { u: 2, v: 1 }), { spec: 0.05 });
  const lidTex = canvasTexture(scene, `${name}Lid`, 256, 256, (g, w, h, r) => paintShield(g, w, h, r, false), { u: 1, v: 1 });
  const lid = materialOf(scene, `${name}LidM`, lidTex, { spec: 0.05 });
  // The sunshields' plan: a rounded square (S84-27020 shows them boxier than a drum), a in
  // radians round it (the walls start at PI, as the drum did, so their faces look outward).
  const sq = (a, r) => [r * spow(Math.cos(a), 0.4), r * spow(Math.sin(a), 0.4)];
  for (const [x, mat] of [[-7.1, westar], [-2.9, palapa]]) {
    // The box, from the keel to a little over the sills, the clamshell closed in a low ridge.
    const R = 1.85, y0 = s0.ys - 1.9, y1 = s0.ys + 1.25;
    surface(scene, `${name}Shield${x}`, root, mat, 4, 40, (u, v) => {
      const [dx, dz] = sq(PI + u * 2 * PI, R);
      return [x + dx, lerp(y0, y1, v), dz];
    }, (u, v) => [u, 1 - v]);
    surface(scene, `${name}ShieldLid${x}`, root, lid, 6, 40, (u, v) => {
      const [dx, dz] = sq(u * 2 * PI, R * (1 - v));
      // The clamshell closed in a ridge across the bay (S84-27020: a pale face forward, a
      // darker one aft).
      return [x + dx, y1 + 0.4 * (1 - Math.abs(dx) / R), dz];
    }, (u, v, p) => [(p[0] - x) / (2 * R) + 0.5, p[2] / (2 * R) + 0.5]);
    surface(scene, `${name}ShieldLip${x}`, root, metal, 1, 40, (u, v) => {
      const [dx, dz] = sq(PI + u * 2 * PI, R + 0.04);
      return [x + dx, y1 + lerp(-0.06, 0.06, v), dz];
    });
  }
  // The pallet: a frame carrying grey, black, white and foil-wrapped boxes.
  const pallet = CreateBox(`${name}Pallet`, { width: 3.0, height: 1.1, depth: 4.6 }, scene);
  pallet.parent = root;
  pallet.material = metal;
  pallet.position.set(1.2, s0.ys - 1.0, 0);
  const boxMats = [metal, dark, foil, blanket, gold];
  const rndBay = seeded(4111);
  for (let k = 0; k < 16; k++) {
    const sx = 0.35 + rndBay() * 0.8, sy = 0.25 + rndBay() * 0.6, sz = 0.35 + rndBay() * 0.9;
    const b = CreateBox(`${name}Box${k}`, { width: sx, height: sy, depth: sz }, scene);
    b.parent = root;
    b.material = boxMats[k % 7 === 6 ? 4 : k % 4];
    b.position.set(1.2 + (rndBay() - 0.5) * 2.4, s0.ys - 0.45 + sy / 2, (rndBay() - 0.5) * 3.8);
  }
  // Along both walls aft of the pallet: boxes, all down the bay.
  for (const sd of [1, -1]) {
    for (let x = BAY[0] + 0.8; x < 2.4; x += 0.9 + rndBay() * 0.9) {
      const sec = section(x);
      const sy = 0.3 + rndBay() * 0.5;
      const b = CreateBox(`${name}Wall${sd}_${x.toFixed(1)}`, { width: 0.4 + rndBay() * 0.5, height: sy, depth: 0.35 + rndBay() * 0.3 }, scene);
      b.parent = root;
      b.material = boxMats[Math.floor(rndBay() * 4)];
      b.position.set(x, sec.ys - 0.75 + rndBay() * 0.5, sd * (sec.hw - 0.5));
    }
  }
  // ---- The forward bay, between the bulkhead and the pallet (the user, 2026-11-26: "이쪽
  // 디테일을 좀 더 넣어봐"): what STS-41-B carried there and what every orbiter had. ----
  const lamp = materialOf(scene, `${name}LampM`, null, { color: [1, 0.97, 0.88], emissive: 0.95, spec: 0 });
  const rail = materialOf(scene, `${name}RailM`, null, { color: [0.86, 0.68, 0.18], spec: 0.4, power: 30 });
  const part = (n, mat, size, at, rot = null) => {
    const b = CreateBox(`${name}${n}`, { width: size[0], height: size[1], depth: size[2] }, scene);
    b.parent = root;
    b.material = mat;
    b.position.set(...at);
    if (rot) b.rotation.set(...rot);
    return b;
  };
  const rod = (n, mat, length, d, at, rotZ = PI / 2, rotX = 0) => {
    const c = CreateCylinder(`${name}${n}`, { height: length, diameter: d, tessellation: 8 }, scene);
    c.parent = root;
    c.material = mat;
    c.rotation.set(rotX, 0, rotZ);
    c.position.set(...at);
    return c;
  };
  const FWD = [2.9, BAY[1] - 0.1];
  const floorY = s0.yb + 0.12;
  // The keel down the middle of the floor, low and dark (the lining paints the trays and the
  // frames); three small fittings on the floor, grey and dark under their blankets.
  part('Keel', dark, [FWD[1] - FWD[0], 0.18, 0.4], [(FWD[0] + FWD[1]) / 2, floorY + 0.09, 0]);
  for (const [x, z, sx, sy, sz, mat] of [[4.2, 1.05, 0.55, 0.32, 0.5, metal], [5.6, -1.15, 0.5, 0.28, 0.45, dark], [3.5, -0.9, 0.45, 0.25, 0.55, dark]]) {
    part(`Kit${x}${z}`, mat, [sx, sy, sz], [x, floorY + 0.25 + sy / 2, z]);
  }
  for (const sd of [1, -1]) {
    const sec = section(6);
    const wz = sd * (sec.hw - 0.25);
    // Cable runs along the wall and the sill longeron's inner face.
    for (const y of [s0.ys - 0.35]) rod(`Cable${sd}${y.toFixed(1)}`, dark, FWD[1] - FWD[0], 0.08, [(FWD[0] + FWD[1]) / 2, y, wz]);
    // The sill longeron: a beam along the bay's edge, the payload latches on it every 1.8 m,
    // and the yellow handrail on its posts (S84-27040) for the spacewalkers.
    part(`Longeron${sd}`, metal, [BAY[1] - BAY[0], 0.28, 0.2], [0, s0.ys - 0.12, sd * (s0.hw - 0.22)]);
    for (let x = BAY[0] + 0.9; x < BAY[1] - 0.5; x += 1.8) part(`Latch${sd}${x.toFixed(1)}`, dark, [0.32, 0.22, 0.26], [x, s0.ys + 0.12, sd * (s0.hw - 0.34)]);
    const railZ = sd * (s0.hw - 0.48);
    rod(`Handrail${sd}`, rail, FWD[1] - FWD[0] - 0.6, 0.06, [(FWD[0] + FWD[1]) / 2, s0.ys + 0.3, railZ]);
    for (let x = FWD[0] + 0.3; x <= FWD[1] - 0.3; x += 1.1) rod(`Post${sd}${x.toFixed(1)}`, rail, 0.3, 0.05, [x, s0.ys + 0.15, railZ], 0);
    // The floodlights down both walls, lit.
    for (const x of [-7.2, -2.4, 2.4, 6.4]) part(`Light${sd}${x}`, lamp, [0.3, 0.12, 0.06], [x, s0.ys - 0.9, sd * (section(x).hw - 0.16)]);
    // A CCTV camera on its bracket at each forward corner.
    part(`Cctv${sd}`, dark, [0.28, 0.2, 0.2], [BAY[1] - 0.35, s0.ys + 0.35, sd * (s0.hw - 0.45)]);
    // The MMU flight support station on the forward sidewall: a dark frame on the wall and its
    // foot restraint. In S84-27020 McCandless is out on one MMU; the other (Stewart's) waits
    // stowed on the starboard station, a white backpack with its two control arms folded forward.
    const mz = sd * (s0.hw - 0.75);
    part(`FssPlate${sd}`, dark, [1.3, 1.5, 0.06], [7.9, s0.ys - 0.8, sd * (s0.hw - 0.3)]);
    for (const x of [7.3, 8.5]) part(`FssPost${sd}${x}`, metal, [0.06, 1.5, 0.06], [x, s0.ys - 0.8, sd * (s0.hw - 0.38)]);
    part(`FssFoot${sd}`, dark, [0.5, 0.05, 0.4], [7.9, s0.ys - 1.45, mz - sd * 0.45]);
    if (sd > 0) continue;
    part(`Mmu${sd}`, blanket, [0.8, 1.25, 0.8], [7.9, s0.ys - 0.58, mz - sd * 0.05]);
    for (const x of [7.5, 8.3]) part(`MmuArm${sd}${x}`, metal, [0.1, 0.1, 0.5], [x, s0.ys - 0.35, mz - sd * 0.52]);
    for (const x of [7.5, 8.3]) part(`MmuHand${sd}${x}`, dark, [0.12, 0.16, 0.12], [x, s0.ys - 0.27, mz - sd * 0.8]);
  }

  // The arm: shoulder at the bay's front on the port sill (Xo 679), two booms, elbow, wrist,
  // the end effector. pose.arm: { yaw, pitch, elbow, wristPitch, wristYaw } in radians; all 0 =
  // stowed along the sill, pointing aft. White blankets on the booms (S84-27020), dark bands at
  // the joints, the joints' housings white too, a camera at the elbow.
  const armSkin = materialOf(scene, `${name}ArmSkinM`, canvasTexture(scene, `${name}ArmSkin`, 256, 512, (g, w, h, rnd) => {
    paintBlanket(g, w, h, rnd, { size: 32, base: [228, 224, 212], dirt: 0.07 });
    g.fillStyle = 'rgba(30,30,32,0.9)';
    g.fillRect(0, 0, w, 12);
    g.fillRect(0, h - 12, w, 12);
  }), { spec: 0.06 });
  const armParts = [];
  const boom = (n, parent, length, diameter, mat = armSkin) => {
    const m = CreateCylinder(`${name}${n}`, { height: length, diameter, tessellation: 16 }, scene);
    m.parent = parent;
    m.material = mat;
    m.rotation.z = PI / 2;
    m.position.x = -length / 2;
    armParts.push(m);
    return m;
  };
  const joint = (n, parent, diameter, length, at = [0, 0, 0], mat = blanket) => {
    const m = CreateCylinder(`${name}${n}`, { height: length, diameter, tessellation: 16 }, scene);
    m.parent = parent;
    m.material = mat;
    m.rotation.x = PI / 2;
    m.position.set(...at);
    armParts.push(m);
    return m;
  };
  const ARM_X = 6.7;
  const shoulder = new TransformNode(`${name}Shoulder`, scene);
  shoulder.parent = root;
  shoulder.position.set(ARM_X, s0.ys + 0.5, s0.hw - 0.42);
  const pedestal = CreateBox(`${name}ArmBase`, { width: 0.8, height: 0.6, depth: 0.6 }, scene);
  pedestal.parent = root;
  pedestal.material = metal;
  pedestal.position.set(ARM_X, s0.ys + 0.2, s0.hw - 0.42);
  const lift = new TransformNode(`${name}ShoulderPitch`, scene);
  lift.parent = shoulder;
  joint('ShoulderJoint', lift, 0.62, 0.7);
  boom('UpperBoom', lift, 6.37, 0.38);
  const elbow = new TransformNode(`${name}Elbow`, scene);
  elbow.parent = lift;
  elbow.position.x = -6.37;
  joint('ElbowJoint', elbow, 0.55, 0.62);
  const camera = CreateBox(`${name}ElbowCam`, { width: 0.35, height: 0.3, depth: 0.25 }, scene);
  camera.parent = elbow;
  camera.material = dark;
  camera.position.set(0, 0.42, 0);
  armParts.push(camera);
  boom('LowerBoom', elbow, 7.06, 0.33);
  const wrist = new TransformNode(`${name}Wrist`, scene);
  wrist.parent = elbow;
  wrist.position.x = -7.06;
  joint('WristJoint', wrist, 0.48, 0.5);
  const wristYaw = new TransformNode(`${name}WristYaw`, scene);
  wristYaw.parent = wrist;
  boom('WristBody', wristYaw, 0.9, 0.42, blanket);
  const effector = boom('Effector', wristYaw, 1.6, 0.4, armSkin);
  effector.position.x = -0.9 - 0.8;
  const ring = CreateCylinder(`${name}EffectorRing`, { height: 0.12, diameter: 0.44, tessellation: 16 }, scene);
  ring.parent = wristYaw;
  ring.material = dark;
  ring.rotation.z = PI / 2;
  ring.position.x = -2.45;
  armParts.push(ring);
  // Stowed, the arm rests on its cradles along the sill.
  for (const x of [1.2, -4.6]) {
    const c = CreateBox(`${name}Cradle${x}`, { width: 0.3, height: 0.5, depth: 0.4 }, scene);
    c.parent = root;
    c.material = metal;
    c.position.set(x, s0.ys + 0.25, s0.hw - 0.42);
  }

  // Fewer draw calls: what shares a paint and moves together becomes one mesh (the doors each
  // with their own hinge; the arm's parts on their own joints stay apart).
  const merge = (meshes, parent) => {
    const byMat = new Map();
    for (const m of meshes) {
      if (!byMat.has(m.material)) byMat.set(m.material, []);
      byMat.get(m.material).push(m);
    }
    for (const [mat, list] of byMat) {
      if (list.length < 2) continue;
      const merged = Mesh.MergeMeshes(list, true, true);
      merged.name = `${name}_${mat.name}`;
      merged.isPickable = false;
      merged.setParent(parent);
    }
  };
  root.computeWorldMatrix(true);
  for (let i = 0; i < doors.length; i++) {
    doors[i].hinge.computeWorldMatrix(true);
    merge(doorParts[i], doors[i].hinge);
  }
  merge(root.getChildMeshes(true).filter((m) => m.parent === root), root);

  // The size of the whole, nose to the fin's tip, for whoever places it.
  const LENGTH = NOSE + 19.3;
  const DOOR_OPEN = (175 * PI) / 180;
  function pose({ doors: open = 0, arm = {} } = {}) {
    const a = clamp01(open) * DOOR_OPEN;
    for (const d of doors) d.hinge.rotation.x = d.side > 0 ? a : -a;
    shoulder.rotation.y = -(arm.yaw ?? 0);
    lift.rotation.z = -(arm.pitch ?? 0);
    elbow.rotation.z = arm.elbow ?? 0;
    wrist.rotation.z = arm.wristPitch ?? 0;
    wristYaw.rotation.y = arm.wristYaw ?? 0;
  }
  pose();
  void armParts;
  void Vector3;
  void CreatePlane;
  return { root, pose, length: LENGTH };
}

// The Sun's shadows on the ship itself: the doors, the arm, the pods and the fin throw them
// on the wings and into the bay, near black as in the photos (nothing out there to fill them
// but the Earth's glow). The map follows the ship's own size, so it stays sharp; `size` is
// 2048 on a computer, 1024 is enough on a phone. Returns the generator, to dispose with it.
export function shadeChallenger(ship, light, { size = 2048, darkness = 0.08 } = {}) {
  const shadows = new ShadowGenerator(size, light);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  // Lower than these and the thin wings and the round body stripe themselves ("acne").
  shadows.bias = 0.008;
  // (In the world's units: whoever draws her at another scale multiplies it by that scale.)
  shadows.normalBias = 0.1;
  ship.normalBias = 0.1;
  shadows.setDarkness(darkness);
  // Only the ship is in the map, so its frustum fits round her, not the scene.
  light.autoUpdateExtends = true;
  light.autoCalcShadowZBounds = true;
  for (const m of ship.root.getChildMeshes()) {
    if (m.metadata?.light) continue;
    shadows.addShadowCaster(m, false);
    m.receiveShadows = true;
  }
  return shadows;
}
