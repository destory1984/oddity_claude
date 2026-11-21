import { Vector3, Quaternion, Color3, StandardMaterial, TransformNode, DynamicTexture, Mesh, VertexData, CreateCylinder, CreateSphere, CreateBox, CreatePlane, Texture, ShadowGenerator } from './babylon.js';

// The space shuttle Challenger as Bruce McCandless saw it in February 1984, built in
// metres: nose at +x, the payload bay on top (+y), port side +z. Its two payload bay doors
// swing open on their hinges and its arm (the RMS, on the port sill) moves at the shoulder,
// elbow and wrist (the user, 2026-11-20: "좀 진짜스럽게 그려야해. 그리고 화물칸과 로봇팔도
// 다 움직여야함"). Surfaces are painted here (tiles, quilted blankets, radiators), not loaded.

const PI = Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const spow = (v, p) => Math.sign(v) * Math.abs(v) ** p;

// The body's cross-sections along x: half width, bottom, top (metres).
const PROFILE = [
  [18.75, 0.03, -0.78, -0.58],
  [18.55, 0.58, -1.38, 0.02],
  [18.0, 1.05, -1.86, 0.72],
  [17.0, 1.58, -2.16, 1.58],
  [15.8, 2.08, -2.32, 2.48],
  [14.4, 2.46, -2.4, 3.32],
  [13.0, 2.66, -2.4, 3.72],
  [11.0, 2.68, -2.4, 3.78],
  [9.8, 2.68, -2.4, 3.6],
  [9.2, 2.68, -2.4, 3.55],
  [-9.2, 2.68, -2.4, 3.55],
  [-12.0, 2.7, -2.38, 3.5],
  [-16.5, 2.72, -2.3, 3.45],
  [-18.6, 2.66, -2.12, 3.3],
];
const BAY = [-9.2, 9.2];
function section(x) {
  let i = 0;
  while (i < PROFILE.length - 2 && x < PROFILE[i + 1][0]) i++;
  const [x0, w0, b0, t0] = PROFILE[i];
  const [x1, w1, b1, t1] = PROFILE[i + 1];
  const t = clamp01((x - x0) / (x1 - x0));
  const hw = lerp(w0, w1, t), yb = lerp(b0, b1, t), yt = lerp(t0, t1, t);
  const ys = yb + (yt - yb) * 0.55;
  const nLow = x > 14 ? lerp(4, 2.2, clamp01((x - 14) / 4.75)) : 4;
  const nUp = x > BAY[1] ? 2.5 : x < BAY[0] ? 2.9 : 2;
  return { hw, yb, yt, ys, nLow, nUp };
}
// A point on the body: lower half (phi 0 at port, PI/2 at the keel, PI at starboard) or
// upper half (phi 0 at port, PI/2 at the top, PI at starboard).
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

// A surface from a grid: at(u, v) gives [x, y, z]; uv as given.
function surface(scene, name, parent, material, rows, cols, at) {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      const u = j / cols, v = i / rows;
      positions.push(...at(u, v));
      uvs.push(u, v);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
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
// A flat fan: the outline's points [x, y, z] round a middle, uv from (y, z) over the box.
function fan(scene, name, parent, material, outline, box) {
  const n = outline.length;
  const mid = outline.reduce((s, p) => s.map((v, i) => v + p[i] / n), [0, 0, 0]);
  const positions = [...mid, ...outline.flat()];
  const uv = (p) => [(p[2] - box.z0) / (box.z1 - box.z0), 1 - (p[1] - box.y0) / (box.y1 - box.y0)];
  const uvs = [...uv(mid), ...outline.flatMap(uv)];
  const indices = [];
  for (let i = 0; i < n; i++) indices.push(0, 1 + i, 1 + ((i + 1) % n));
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
function grime(g, w, h, rnd, count, dark = 0.12, size = 60) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h, r = size * (0.3 + rnd());
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    const a = (dark * (0.3 + rnd())).toFixed(3);
    spot.addColorStop(0, rnd() < 0.7 ? `rgba(60,56,48,${a})` : `rgba(150,130,90,${a})`);
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
// Tiles in a grid, each a little lighter or darker; a few patched ones. Weathered as the
// flown orbiters were: on white tiles some new ones far whiter, some gone yellow, some
// grey with use; on black ones faded grey patches. Rows of a shade run together a little,
// as tiles were replaced a stretch at a time.
function paintTiles(g, w, h, rnd, { base, spread, size, gap, gapColor, patch }) {
  g.fillStyle = gapColor;
  g.fillRect(0, 0, w, h);
  const white = base[0] > 128;
  let run = 0;
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      if (rnd() < 0.05) run = (rnd() - 0.5) * spread * 1.6;
      run *= 0.85;
      const k = (rnd() - 0.5) * spread * 1.6 + run + (rnd() < 0.025 ? patch : 0);
      let c = base.map((n) => n + k);
      const r = rnd();
      if (white) {
        if (r < 0.035) c = c.map((n) => n + 22); // new, unflown
        else if (r < 0.085) c = [c[0] + 4, c[1] - 2, c[2] - 18]; // yellowed
        else if (r < 0.13) c = c.map((n) => n - 24); // grey with use
      } else if (r < 0.06) c = c.map((n) => n + 18 + rnd() * 16); // faded
      c = c.map((n) => Math.max(0, Math.min(255, Math.round(n))));
      g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      g.fillRect(x + gap, y + gap, size - gap, size - gap);
    }
  }
}
// Streaks, as rain runs down a wall: soft dark (or rusty) lines in one direction.
function streaks(g, w, h, rnd, count, dark = 0.12, along = 'y') {
  for (let i = 0; i < count; i++) {
    const x0 = rnd() * w, y0 = rnd() * h, len = (0.15 + rnd() * 0.45) * (along === 'y' ? h : w), wide = 3 + rnd() * 10;
    const grad = along === 'y' ? g.createLinearGradient(0, y0, 0, y0 + len) : g.createLinearGradient(x0, 0, x0 + len, 0);
    const tone = rnd() < 0.75 ? '52,48,40' : '120,96,60';
    grad.addColorStop(0, `rgba(${tone},${(dark * (0.5 + rnd())).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = grad;
    if (along === 'y') g.fillRect(x0, y0, wide, len);
    else g.fillRect(x0, y0, len, wide);
  }
}
// The white blankets: quilted squares with their stitching, soft hollows, grime.
function paintBlanket(g, w, h, rnd, { size = 64, base = [226, 222, 211] } = {}) {
  g.fillStyle = `rgb(${base.join(',')})`;
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const k = (rnd() - 0.5) * 10;
      const pillow = g.createRadialGradient(x + size / 2, y + size / 2, size * 0.1, x + size / 2, y + size / 2, size * 0.75);
      pillow.addColorStop(0, `rgba(255,255,250,${(0.25 + k / 60).toFixed(3)})`);
      pillow.addColorStop(1, 'rgba(120,112,95,0.22)');
      g.fillStyle = pillow;
      g.fillRect(x, y, size, size);
    }
  }
  g.strokeStyle = 'rgba(110,104,90,0.6)';
  g.lineWidth = 1;
  g.setLineDash([3, 3]);
  for (let y = 0; y <= h; y += size) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
  for (let x = 0; x <= w; x += size) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
  g.setLineDash([]);
  grime(g, w, h, rnd, 70, 0.16, 70);
  // Yellowed patches, and dirty hand marks near the seams.
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 70;
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(190,160,95,${(0.08 + rnd() * 0.12).toFixed(3)})`);
    spot.addColorStop(1, 'rgba(190,160,95,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  streaks(g, w, h, rnd, 14, 0.1);
}
function materialOf(scene, name, tex, { spec = 0.12, power = 24, emissive = 0, color = null } = {}) {
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

// The upper body ahead of the bay: white tiles, the black mask round the windows, the
// windows, the nose cap.
function paintForward(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { base: [222, 219, 210], spread: 12, size: 22, gap: 1, gapColor: '#a8a49a', patch: -30 });
  grime(g, w, h, rnd, 30, 0.1, 50);
  const X0 = BAY[1], X1 = 18.75;
  const px = (phi) => (phi / PI) * w;
  const py = (x) => ((x - X0) / (X1 - X0)) * h;
  // The black mask.
  g.fillStyle = '#18181a';
  g.beginPath();
  g.moveTo(px(0.42), py(15.9));
  g.lineTo(px(0.6), py(13.55));
  g.lineTo(px(1.2), py(13.1));
  g.lineTo(px(1.2), py(12.1));
  g.lineTo(px(PI - 1.2), py(12.1));
  g.lineTo(px(PI - 1.2), py(13.1));
  g.lineTo(px(PI - 0.6), py(13.55));
  g.lineTo(px(PI - 0.42), py(15.9));
  g.lineTo(px(PI - 0.3), py(16.6));
  g.lineTo(px(0.3), py(16.6));
  g.closePath();
  g.fill();
  // Black tiles within the mask (a grid of their own).
  g.save();
  g.clip();
  for (let y = 0; y < h; y += 20) for (let x = 0; x < w; x += 20) {
    const k = 20 + Math.round(rnd() * 14);
    g.fillStyle = `rgb(${k},${k},${k + 2})`;
    g.fillRect(x + 1, y + 1, 19, 19);
  }
  g.restore();
  // Windows: the six of the windshield, two overhead.
  const pane = (a0, a1, x0, x1, skew = 0) => {
    const glass = g.createLinearGradient(px(a0), py(x1), px(a1), py(x0));
    glass.addColorStop(0, '#05070b');
    glass.addColorStop(0.55, '#1b2330');
    glass.addColorStop(1, '#06080c');
    g.fillStyle = glass;
    g.beginPath();
    g.moveTo(px(a0) + skew, py(x1));
    g.lineTo(px(a1) - skew, py(x1));
    g.lineTo(px(a1), py(x0));
    g.lineTo(px(a0), py(x0));
    g.closePath();
    g.fill();
    g.strokeStyle = '#3a3a3c';
    g.lineWidth = 3;
    g.stroke();
  };
  const panes = [[0.72, 1.0], [1.04, 1.32], [1.36, 1.55], [PI - 1.55, PI - 1.36], [PI - 1.32, PI - 1.04], [PI - 1.0, PI - 0.72]];
  for (const [a0, a1] of panes) pane(a0, a1, 14.05, 15.3, 6);
  pane(1.3, 1.5, 12.35, 13.05);
  pane(PI - 1.5, PI - 1.3, 12.35, 13.05);
  // The forward thrusters: dark ports either side ahead of the windows, soot blown back
  // from each over the tiles behind it.
  for (const a of [0.55, 0.85, PI - 0.85, PI - 0.55]) {
    const soot = g.createLinearGradient(0, py(17.05), 0, py(15.4));
    soot.addColorStop(0, 'rgba(25,23,20,.55)');
    soot.addColorStop(1, 'rgba(25,23,20,0)');
    g.fillStyle = soot;
    g.beginPath();
    g.moveTo(px(a) - 8, py(17.05));
    g.lineTo(px(a) + 8, py(17.05));
    g.lineTo(px(a) + 22, py(15.4));
    g.lineTo(px(a) - 22, py(15.4));
    g.closePath();
    g.fill();
  }
  grime(g, w, h, rnd, 30, 0.12, 40);
  g.fillStyle = '#0d0d0f';
  for (const a of [0.55, 0.85, PI - 0.85, PI - 0.55]) {
    g.beginPath();
    g.ellipse(px(a), py(17.05), 9, 7, 0, 0, 2 * PI);
    g.fill();
  }
  // The nose cap, black carbon.
  const cap = g.createLinearGradient(0, py(17.55), 0, py(18.75));
  cap.addColorStop(0, 'rgba(30,30,32,0)');
  cap.addColorStop(0.25, '#232325');
  cap.addColorStop(1, '#161618');
  g.fillStyle = cap;
  g.fillRect(0, py(17.55), w, h - py(17.55));
}
// The bay's lining: pale panels, seams, cable trays along it.
function paintLiner(g, w, h, rnd) {
  g.fillStyle = '#5c5a55';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 64) {
    const k = Math.round((rnd() - 0.5) * 40);
    g.fillStyle = `rgb(${110 + k},${108 + k},${102 + k})`;
    g.fillRect(x + 2, y + 2, 60, 28);
  }
  // The frames across the bay, dark, every few metres.
  g.fillStyle = 'rgba(20,20,20,0.85)';
  for (let y = 0; y < h; y += 85) g.fillRect(0, y, w, 7);
  // Cable trays and tubes along it.
  g.fillStyle = 'rgba(25,25,25,0.7)';
  for (const u of [0.18, 0.31, 0.69, 0.82]) g.fillRect(u * w - 4, 0, 8, h);
  g.fillStyle = 'rgba(200,170,90,0.7)';
  for (const u of [0.24, 0.76]) g.fillRect(u * w - 2, 0, 4, h);
  g.fillStyle = 'rgba(220,220,215,0.5)';
  for (const u of [0.12, 0.88]) g.fillRect(u * w - 1, 0, 3, h);
  // Little bright fittings and lamps.
  for (let i = 0; i < 60; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(235,232,220,0.9)' : 'rgba(30,30,30,0.9)';
    g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 8, 3 + rnd() * 8);
  }
  grime(g, w, h, rnd, 50, 0.18, 50);
}
// The doors' inner faces: radiator panels, silvery white with their tubes.
function paintRadiator(g, w, h, rnd) {
  // Silvered panels, one per repeat, each a little different in shade, framed by dark seams;
  // the coolant tubes run their length as fine ridges.
  for (let y = 0; y < h; y += 256) {
    const k = Math.round((rnd() - 0.5) * 26);
    g.fillStyle = `rgb(${128 + k},${134 + k},${144 + k})`;
    g.fillRect(0, y, w, 256);
    for (let x = 0; x < w; x += 22) {
      g.fillStyle = `rgba(55,62,74,${(0.5 + rnd() * 0.2).toFixed(2)})`;
      g.fillRect(x, y + 8, 5, 240);
      g.fillStyle = 'rgba(235,240,248,0.4)';
      g.fillRect(x + 5, y + 8, 4, 240);
    }
    const glint = g.createLinearGradient(0, y, w, y + 256);
    glint.addColorStop(0, 'rgba(255,255,255,0)');
    glint.addColorStop(0.4 + rnd() * 0.2, 'rgba(255,255,255,0.3)');
    glint.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glint;
    g.fillRect(0, y, w, 256);
    g.fillStyle = 'rgba(30,32,38,0.95)';
    g.fillRect(0, y, w, 8);
  }
  g.fillStyle = 'rgba(30,32,38,0.95)';
  g.fillRect(0, 0, 10, h);
  g.fillRect(w - 10, 0, 10, h);
  grime(g, w, h, rnd, 40, 0.14, 60);
  // Haze on the silvering, and a dull patch here and there.
  for (let i = 0; i < 18; i++) {
    const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 90;
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(210,212,215,${(0.1 + rnd() * 0.15).toFixed(3)})`);
    spot.addColorStop(1, 'rgba(210,212,215,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
function paintWingTop(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { base: [224, 221, 212], spread: 10, size: 16, gap: 1, gapColor: '#aaa69c', patch: -25 });
  grime(g, w, h, rnd, 70, 0.14, 60);
  streaks(g, w, h, rnd, 30, 0.1, 'x');
  // The leading edge, grey carbon; the elevons' hinge lines.
  const le = g.createLinearGradient(0, 0, w * 0.06, 0);
  le.addColorStop(0, '#3b3b3e');
  le.addColorStop(0.7, '#4a4a4d');
  le.addColorStop(1, 'rgba(74,74,77,0)');
  g.fillStyle = le;
  g.fillRect(0, 0, w * 0.06, h);
  g.fillStyle = 'rgba(40,40,40,0.75)';
  g.fillRect(w * 0.8, h * 0.08, 3, h * 0.84);
  g.fillRect(w * 0.8, h * 0.5, w * 0.2, 3);
  g.fillStyle = 'rgba(30,30,30,0.5)';
  g.fillRect(w * 0.96, 0, w * 0.04, h);
}
function paintBlackTiles(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { base: [26, 26, 28], spread: 16, size: 32, gap: 2, gapColor: '#0c0c0d', patch: 40 });
  // Faded grey blotches and scuffs.
  for (let i = 0; i < 24; i++) {
    const x = rnd() * w, y = rnd() * h, r = 15 + rnd() * 50;
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, `rgba(120,118,112,${(0.08 + rnd() * 0.12).toFixed(3)})`);
    spot.addColorStop(1, 'rgba(120,118,112,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  g.strokeStyle = 'rgba(140,138,130,.25)';
  g.lineWidth = 1;
  for (let i = 0; i < 30; i++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 12); g.stroke(); }
}
function paintTail(g, w, h, rnd) {
  paintTiles(g, w, h, rnd, { base: [224, 221, 212], spread: 10, size: 18, gap: 1, gapColor: '#aaa69c', patch: -25 });
  grime(g, w, h, rnd, 50, 0.14, 60);
  streaks(g, w, h, rnd, 20, 0.1, 'x');
  g.fillStyle = '#3c3c3f';
  g.fillRect(0, 0, w * 0.07, h);
  g.fillStyle = 'rgba(40,40,40,0.8)';
  g.fillRect(w * 0.72, h * 0.05, 3, h * 0.8);
  g.fillRect(w * 0.72, h * 0.45, w * 0.28, 3);
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
// Words and the flag, on a see-through sheet.
function decal(scene, name, parent, w, h, paint, at, size, turn) {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, true, Texture.TRILINEAR_SAMPLINGMODE, undefined, false);
  tex.hasAlpha = true;
  const g = tex.getContext();
  g.clearRect(0, 0, w, h);
  paint(g, w, h);
  tex.update(false);
  const m = new StandardMaterial(name, scene);
  m.diffuseTexture = tex;
  m.useAlphaFromDiffuseTexture = true;
  m.specularColor = new Color3(0.1, 0.1, 0.1);
  m.backFaceCulling = false;
  m.zOffset = -2;
  const plane = CreatePlane(name, { width: size[0], height: size[1] }, scene);
  plane.parent = parent;
  plane.material = m;
  plane.position.set(...at);
  plane.rotation.set(...turn);
  plane.isPickable = false;
  return plane;
}

// ---- Wings and tail: an airfoil swept between a leading and a trailing edge. ----
function airfoil(c) {
  return 5 * (0.2969 * Math.sqrt(c) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1015 * c ** 4);
}
function wingLE(z) {
  if (z < 4.4) return lerp(3.2, -5.2, (z - 2.5) / 1.9);
  const x = -5.2 - (z - 4.4) * (9.6 / 7.4);
  return z > 11.2 ? x - ((z - 11.2) / 0.75) ** 2 * 0.9 : x;
}
const wingTE = (z) => -17.4 + (z - 2.5) * 0.08;
const WING_TIP = 11.95;
const wingY = (z) => -1.72 + (z - 2.5) * 0.06;
const wingT = (z) => lerp(1.25, 0.3, (z - 2.5) / (WING_TIP - 2.5));
function wingPoint(side, u, v, upper) {
  const z = lerp(2.5, WING_TIP, v);
  const c = (1 - Math.cos(u * PI)) / 2;
  const x = lerp(wingLE(z), wingTE(z), c);
  const t = wingT(z) * airfoil(c);
  const y = wingY(z) + (upper ? 0.62 * t : -0.38 * t);
  return [x, y, side * z];
}
// The fin: span up from the aft top, chord along x, thickness along z.
function finPoint(u, v, side) {
  const s = v;
  const le = lerp(-10.9, -16.9, s), te = lerp(-18.3, -19.3, s);
  const c = (1 - Math.cos(u * PI)) / 2;
  const x = lerp(le, te, c);
  const t = lerp(0.62, 0.22, s) * airfoil(c);
  return [x, 3.25 + s * 8.0, side * 0.5 * t];
}

export function buildChallenger(scene, name = 'challenger') {
  const root = new TransformNode(name, scene);
  root.rotationQuaternion = Quaternion.Identity();

  const blackTex = canvasTexture(scene, `${name}BlackTiles`, 512, 512, paintBlackTiles, { u: 4, v: 18 });
  const black = materialOf(scene, `${name}Black`, blackTex, { spec: 0.08 });
  const blanketTex = canvasTexture(scene, `${name}Blanket`, 512, 512, (g, w, h, r) => paintBlanket(g, w, h, r), { u: 2, v: 14 });
  const blanket = materialOf(scene, `${name}BlanketM`, blanketTex, { spec: 0.06 });
  const forwardTex = canvasTexture(scene, `${name}Forward`, 1024, 1024, paintForward, { clamp: true });
  const forward = materialOf(scene, `${name}ForwardM`, forwardTex, { spec: 0.25, power: 40 });
  const aftTex = canvasTexture(scene, `${name}AftTop`, 512, 512, (g, w, h, r) => paintTiles(g, w, h, r, { base: [222, 219, 210], spread: 12, size: 22, gap: 1, gapColor: '#a8a49a', patch: -30 }), { u: 4, v: 4 });
  const aftTop = materialOf(scene, `${name}AftTopM`, aftTex, { spec: 0.1 });
  const linerTex = canvasTexture(scene, `${name}Liner`, 512, 512, paintLiner, { u: 1, v: 6 });
  const liner = materialOf(scene, `${name}LinerM`, linerTex, { spec: 0.05 });
  const doorOutTex = canvasTexture(scene, `${name}DoorOut`, 512, 512, (g, w, h, r) => paintBlanket(g, w, h, r, { size: 48, base: [230, 227, 218] }), { u: 1.5, v: 10 });
  const doorOut = materialOf(scene, `${name}DoorOutM`, doorOutTex, { spec: 0.06 });
  const radTex = canvasTexture(scene, `${name}Radiator`, 512, 1024, paintRadiator, { u: 1, v: 4 });
  const radiator = materialOf(scene, `${name}RadiatorM`, radTex, { spec: 0.8, power: 40 });
  const wingTex = canvasTexture(scene, `${name}WingTop`, 1024, 1024, paintWingTop, { clamp: true });
  const wingTop = materialOf(scene, `${name}WingTopM`, wingTex, { spec: 0.1 });
  const wingUnder = materialOf(scene, `${name}WingUnderM`, canvasTexture(scene, `${name}WingUnderT`, 512, 512, paintBlackTiles, { u: 6, v: 6 }), { spec: 0.08 });
  const tailTex = canvasTexture(scene, `${name}Tail`, 1024, 1024, paintTail, { clamp: true });
  const tail = materialOf(scene, `${name}TailM`, tailTex, { spec: 0.1 });
  const metalTex = canvasTexture(scene, `${name}Metal`, 256, 256, (g, w, h, r) => paintMetal(g, w, h, r));
  const metal = materialOf(scene, `${name}MetalM`, metalTex, { spec: 0.5, power: 40 });
  const dark = materialOf(scene, `${name}DarkM`, null, { color: [0.16, 0.16, 0.17], spec: 0.3 });
  // The engine bells: hundreds of cooling tubes running down them, bronze, scorched toward the mouth.
  const bell = materialOf(scene, `${name}BellM`, canvasTexture(scene, `${name}BellT`, 512, 256, (g, w, h, r) => {
    paintMetal(g, w, h, r, [104, 88, 70]);
    for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(30,24,18,${(0.35 + r() * 0.2).toFixed(2)})`; g.fillRect(x, 0, 1, h); }
    const burn = g.createLinearGradient(0, 0, 0, h);
    burn.addColorStop(0, 'rgba(20,16,12,0.65)');
    burn.addColorStop(0.5, 'rgba(20,16,12,0.1)');
    burn.addColorStop(1, 'rgba(20,16,12,0)');
    g.fillStyle = burn;
    g.fillRect(0, 0, w, h);
  }), { spec: 0.55, power: 28 });
  const gold = materialOf(scene, `${name}GoldM`, null, { color: [0.78, 0.6, 0.25], spec: 0.7, power: 50 });
  const greyBox = materialOf(scene, `${name}GreyM`, metalTex, { spec: 0.3 });

  const X = [-18.6, 18.75];
  // Lower body: the black belly, the white sides.
  const blackEdge = (x) => (x > 15.6 ? lerp(0.52, 0.12, clamp01((x - 15.6) / 2.6)) : 0.52);
  surface(scene, `${name}Belly`, root, black, 90, 24, (u, v) => {
    const x = lerp(X[0], X[1], v);
    const e = blackEdge(x);
    return onBody(x, lerp(e, PI - e, u), false);
  });
  for (const [side, from, to] of [['Port', 0, 1], ['Star', 1, 0]]) {
    surface(scene, `${name}Side${side}`, root, blanket, 90, 6, (u, v) => {
      const x = lerp(X[0], X[1], v);
      const e = blackEdge(x);
      return onBody(x, from ? PI - e * u : e * u, false);
    });
    void to;
  }
  // Upper body ahead of the bay, and aft of it.
  surface(scene, `${name}Cabin`, root, forward, 60, 40, (u, v) => onBody(lerp(BAY[1], X[1], v), u * PI, true));
  surface(scene, `${name}AftUpper`, root, aftTop, 20, 30, (u, v) => onBody(lerp(X[0], BAY[0], v), u * PI, true));
  // The bay: its lining, its end walls.
  const linerMesh = surface(scene, `${name}BayLiner`, root, liner, 40, 30, (u, v) => onBody(lerp(BAY[0], BAY[1], v), u * PI, false, 0.12));
  void linerMesh;
  const sectionOutline = (x, steps = 40) => {
    const out = [];
    for (let k = 0; k <= steps; k++) out.push(onBody(x, (k / steps) * PI, false, 0.05));
    for (let k = steps; k >= 0; k--) out.push(onBody(x, (k / steps) * PI, true, 0.05));
    return out;
  };
  const s0 = section(BAY[1]);
  const wallBox = { z0: -s0.hw, z1: s0.hw, y0: s0.yb, y1: s0.yt };
  const fwdWallTex = canvasTexture(scene, `${name}FwdWall`, 512, 512, (g, w, h, rnd) => {
    paintLiner(g, w, h, rnd);
    const toY = (y) => (1 - (y - wallBox.y0) / (wallBox.y1 - wallBox.y0)) * h;
    const toZ = (z) => ((z - wallBox.z0) / (wallBox.z1 - wallBox.z0)) * w;
    g.fillStyle = '#0a0c10';
    for (const z of [-0.85, 0.85]) g.fillRect(toZ(z - 0.38), toY(2.85), toZ(0.38) - toZ(-0.38), toY(2.15) - toY(2.85));
  }, { clamp: true });
  fan(scene, `${name}FwdWall`, root, materialOf(scene, `${name}FwdWallM`, fwdWallTex, { spec: 0.1 }), sectionOutline(BAY[1] - 0.02), wallBox);
  fan(scene, `${name}AftWall`, root, liner, sectionOutline(BAY[0] + 0.02), wallBox);
  fan(scene, `${name}Base`, root, metal, sectionOutline(X[0], 30), wallBox);
  // Sills along the bay's edges.
  for (const side of [1, -1]) {
    const sill = CreateBox(`${name}Sill${side}`, { width: BAY[1] - BAY[0], height: 0.16, depth: 0.22 }, scene);
    sill.parent = root;
    sill.material = greyBox;
    sill.position.set(0, s0.ys + 0.02, side * (s0.hw - 0.08));
  }

  // The doors: each a quarter shell on its hinge at the sill, white without, radiators within.
  const doors = [];
  for (const side of [1, -1]) {
    const hinge = new TransformNode(`${name}Hinge${side}`, scene);
    hinge.parent = root;
    hinge.position.set(0, s0.ys, side * s0.hw);
    const from = side > 0 ? 0 : PI / 2, to = side > 0 ? PI / 2 : PI;
    const rel = (p) => [p[0], p[1] - s0.ys, p[2] - side * s0.hw];
    surface(scene, `${name}DoorOut${side}`, hinge, doorOut, 30, 16, (u, v) => rel(onBody(lerp(BAY[0], BAY[1], v), lerp(from, to, u), true)));
    surface(scene, `${name}DoorIn${side}`, hinge, radiator, 30, 16, (u, v) => rel(onBody(lerp(BAY[0], BAY[1], v), lerp(from, to, u), true, 0.08)));
    // The door's edge ribs, darker, so its thickness shows when it stands open.
    for (const x of [BAY[0], -4.6, 0, 4.6, BAY[1]]) {
      surface(scene, `${name}DoorRib${side}_${x}`, hinge, greyBox, 1, 16, (u, v) => rel(onBody(x, lerp(from, to, u), true, v * 0.08)));
    }
    doors.push({ hinge, side });
  }

  // Wings, fin, body flap.
  for (const side of [1, -1]) {
    surface(scene, `${name}WingTop${side}`, root, wingTop, 30, 30, (u, v) => wingPoint(side, u, v, true));
    surface(scene, `${name}WingUnder${side}`, root, wingUnder, 30, 30, (u, v) => wingPoint(side, u, v, false));
    surface(scene, `${name}Fin${side}`, root, tail, 20, 24, (u, v) => finPoint(u, v, side));
  }
  // The wings' words, black on white, their tops toward the nose: on the port wing USA and
  // the flag, on the starboard wing the NASA logo and the name.
  const flat = Quaternion.RotationQuaternionFromAxis(new Vector3(0, 0, -1), new Vector3(1, 0, 0), new Vector3(0, -1, 0));
  const onWing = (x, z) => wingY(Math.abs(z)) + 0.62 * wingT(Math.abs(z)) * 0.55 + 0.04;
  const words = (n, text, x, z, size, font) => {
    const d = decal(scene, `${name}${n}`, root, 1024, 256, (g, w, h) => {
      g.fillStyle = '#141414';
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2);
    }, [x, onWing(x, z), z], size, [0, 0, 0]);
    d.rotationQuaternion = flat.clone();
    // Seen from above with the nose up, the words read left to right, their tops toward the
    // nose, as on the real wings (photo S84-27020).
    d.scaling.y = -1;
  };
  words('Usa', 'USA', -9.9, 6.6, [4.2, 1.05], 'bold 200px Helvetica, Arial, sans-serif');
  const flag = decal(scene, `${name}Flag`, root, 380, 200, (g, w, h) => {
    for (let k = 0; k < 13; k++) { g.fillStyle = k % 2 ? '#f4f1ea' : '#b4232c'; g.fillRect(0, (k * h) / 13, w, h / 13 + 1); }
    g.fillStyle = '#23305f';
    g.fillRect(0, 0, w * 0.4, (h * 7) / 13);
    g.fillStyle = '#f4f1ea';
    for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) g.fillRect(8 + c * 24 + (r % 2 ? 12 : 0), 5 + r * 11, 4, 4);
  }, [-11.7, onWing(-11.7, 6.6), 6.6], [2.6, 1.37], [0, 0, 0]);
  flag.rotationQuaternion = flat.clone();
  flag.scaling.y = -1;
  words('Nasa', 'NASA', -10.2, -5.8, [4.6, 1.15], 'bold italic 230px "Arial Black", Arial, sans-serif');
  words('Name', 'Challenger', -11.7, -6.0, [5.2, 1.0], 'bold 170px Helvetica, Arial, sans-serif');

  const flap = CreateBox(`${name}BodyFlap`, { width: 2.2, height: 0.42, depth: 6.0 }, scene);
  flap.parent = root;
  flap.material = black;
  flap.position.set(-19.5, -2.0, 0);

  // OMS pods on the aft top, either side of the fin.
  for (const side of [1, -1]) {
    surface(scene, `${name}Pod${side}`, root, aftTop, 24, 24, (u, v) => {
      // (Starting a little aft of the bay's end: from -9.0 the pods ran into the open doors'
      // aft corners, the user, 2026-11-20: "붙었네".)
      const x = lerp(-9.9, -18.9, v);
      const r = 1.18 * Math.sqrt(clamp01((-9.9 - x) / 2.4)) ** 0.8;
      const a = u * 2 * PI;
      return [x, 2.62 + r * 0.82 * Math.sin(a), side * 1.82 + r * Math.cos(a)];
    });
    const n = CreateCylinder(`${name}OmsBell${side}`, { height: 1.1, diameterTop: 0.35, diameterBottom: 0.95, tessellation: 24, cap: Mesh.NO_CAP }, scene);
    n.parent = root;
    n.material = bell;
    n.rotation.z = PI / 2;
    n.position.set(-19.4, 2.7, side * 1.82);
  }
  // The three main engines.
  for (const [y, z] of [[1.55, 0], [-0.45, 1.35], [-0.45, -1.35]]) {
    const b = CreateCylinder(`${name}Ssme${y}${z}`, { height: 3.1, diameterTop: 1.05, diameterBottom: 2.35, tessellation: 32, cap: Mesh.NO_CAP }, scene);
    b.parent = root;
    b.material = bell;
    b.rotation.z = PI / 2;
    b.position.set(-20.15, y, z);
  }

  // ---- In the bay (STS-41B): the two empty sunshields of the satellites let go, a pallet,
  // the MMU stations at the front, and the arm on the port sill. ----
  // Each sunshield: a quilted drum, closed again after its satellite left (as in the photo),
  // a low quilted lid, a grey seam round its rim, a ring of struts round its foot.
  const quiltTex = canvasTexture(scene, `${name}Quilt`, 512, 256, (g, w, h, r) => paintBlanket(g, w, h, r, { size: 40, base: [214, 210, 198] }), { u: 3, v: 1 });
  const quilt = materialOf(scene, `${name}QuiltM`, quiltTex, { spec: 0.05 });
  for (const x of [-3.1, -6.9]) {
    const shield = CreateCylinder(`${name}Shield${x}`, { height: 2.4, diameter: 3.4, tessellation: 40, cap: Mesh.NO_CAP }, scene);
    shield.parent = root;
    shield.material = quilt;
    shield.position.set(x, s0.ys - 0.1, 0);
    const lip = CreateCylinder(`${name}ShieldLip${x}`, { height: 0.14, diameter: 3.5, tessellation: 40, cap: Mesh.NO_CAP }, scene);
    lip.parent = root;
    lip.material = greyBox;
    lip.position.set(x, s0.ys + 1.1, 0);
    const lid = CreateSphere(`${name}ShieldLid${x}`, { diameter: 3.4, segments: 20, slice: 0.5 }, scene);
    lid.parent = root;
    lid.material = quilt;
    lid.scaling.y = 0.2;
    lid.position.set(x, s0.ys + 1.1, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * PI;
      const strut = CreateBox(`${name}Strut${x}_${k}`, { width: 0.12, height: 0.12, depth: 0.9 }, scene);
      strut.parent = root;
      strut.material = metal;
      strut.position.set(x + 1.15 * Math.cos(a), s0.ys - 0.45, 1.15 * Math.sin(a));
      strut.rotation.y = -a;
    }
  }
  // The pallet: a frame carrying many grey, black and foil-wrapped boxes, as in the photo.
  const pallet = CreateBox(`${name}Pallet`, { width: 3.0, height: 1.1, depth: 4.6 }, scene);
  pallet.parent = root;
  pallet.material = greyBox;
  pallet.position.set(1.8, s0.ys - 1.0, 0);
  const foil = materialOf(scene, `${name}FoilM`, null, { color: [0.62, 0.6, 0.55], spec: 0.8, power: 60 });
  const boxMats = [greyBox, dark, foil, blanket, gold];
  const rndBay = seeded(4111);
  for (let k = 0; k < 16; k++) {
    const sx = 0.35 + rndBay() * 0.8, sy = 0.25 + rndBay() * 0.6, sz = 0.35 + rndBay() * 0.9;
    const b = CreateBox(`${name}Box${k}`, { width: sx, height: sy, depth: sz }, scene);
    b.parent = pallet;
    b.material = boxMats[k % 7 === 6 ? 4 : k % 4];
    b.position.set((rndBay() - 0.5) * 2.4, 0.55 + sy / 2, (rndBay() - 0.5) * 3.8);
  }
  // Along both walls: boxes, round tanks and cable runs, all down the bay.
  for (const side of [1, -1]) {
    for (let x = BAY[0] + 0.8; x < BAY[1] - 0.8; x += 0.9 + rndBay() * 0.9) {
      const sec = section(x);
      if (rndBay() < 0.3) {
        const tank = CreateSphere(`${name}Tank${side}_${x.toFixed(1)}`, { diameter: 0.55 + rndBay() * 0.3, segments: 10 }, scene);
        tank.parent = root;
        tank.material = rndBay() < 0.5 ? foil : greyBox;
        tank.position.set(x, sec.ys - 0.9, side * (sec.hw - 0.55));
        continue;
      }
      const sy = 0.3 + rndBay() * 0.5;
      const b = CreateBox(`${name}Side${side}_${x.toFixed(1)}`, { width: 0.4 + rndBay() * 0.5, height: sy, depth: 0.35 + rndBay() * 0.3 }, scene);
      b.parent = root;
      b.material = boxMats[Math.floor(rndBay() * 4)];
      b.position.set(x, sec.ys - 0.75 + rndBay() * 0.5, side * (sec.hw - 0.5));
    }
  }
  for (const side of [1, -1]) {
    const station = CreateBox(`${name}Mmu${side}`, { width: 1.2, height: 1.6, depth: 0.8 }, scene);
    station.parent = root;
    station.material = greyBox;
    station.position.set(7.8, s0.ys - 0.4, side * (s0.hw - 0.7));
  }

  // The arm: shoulder at the bay's front on the port sill, two booms, elbow, wrist, the end
  // effector. pose.arm: { yaw, pitch, elbow, wristPitch, wristYaw } in radians; all 0 = stowed
  // along the sill, pointing aft.
  const armSkinTex = canvasTexture(scene, `${name}ArmSkin`, 256, 512, (g, w, h, rnd) => {
    paintBlanket(g, w, h, rnd, { size: 32, base: [222, 216, 200] });
    g.fillStyle = 'rgba(40,40,40,0.8)';
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, h - 10, w, 10);
  }, { u: 1, v: 1 });
  const armSkin = materialOf(scene, `${name}ArmSkinM`, armSkinTex, { spec: 0.08 });
  const boom = (n, parent, length, diameter, mat = armSkin) => {
    const m = CreateCylinder(`${name}${n}`, { height: length, diameter, tessellation: 20 }, scene);
    m.parent = parent;
    m.material = mat;
    m.rotation.z = PI / 2;
    m.position.x = -length / 2;
    return m;
  };
  const joint = (n, parent, diameter, length, at = [0, 0, 0]) => {
    const m = CreateCylinder(`${name}${n}`, { height: length, diameter, tessellation: 20 }, scene);
    m.parent = parent;
    m.material = metal;
    m.rotation.x = PI / 2;
    m.position.set(...at);
    return m;
  };
  const shoulder = new TransformNode(`${name}Shoulder`, scene);
  shoulder.parent = root;
  shoulder.position.set(8.5, s0.ys + 0.5, s0.hw - 0.42);
  const pedestal = CreateBox(`${name}ArmBase`, { width: 0.8, height: 0.6, depth: 0.6 }, scene);
  pedestal.parent = root;
  pedestal.material = metal;
  pedestal.position.set(8.5, s0.ys + 0.2, s0.hw - 0.42);
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
  boom('LowerBoom', elbow, 7.06, 0.33);
  const wrist = new TransformNode(`${name}Wrist`, scene);
  wrist.parent = elbow;
  wrist.position.x = -7.06;
  joint('WristJoint', wrist, 0.48, 0.5);
  const wristYaw = new TransformNode(`${name}WristYaw`, scene);
  wristYaw.parent = wrist;
  boom('WristBody', wristYaw, 0.9, 0.42, metal);
  const effector = boom('Effector', wristYaw, 1.6, 0.4, dark);
  effector.position.x = -0.9 - 0.8;
  const ring = CreateCylinder(`${name}EffectorRing`, { height: 0.12, diameter: 0.46, tessellation: 20 }, scene);
  ring.parent = wristYaw;
  ring.material = gold;
  ring.rotation.z = PI / 2;
  ring.position.x = -2.45;
  // Stowed, the arm rests on its cradles along the sill.
  for (const x of [2.4, -4.0]) {
    const c = CreateBox(`${name}Cradle${x}`, { width: 0.3, height: 0.5, depth: 0.4 }, scene);
    c.parent = root;
    c.material = metal;
    c.position.set(x, s0.ys + 0.25, s0.hw - 0.42);
  }

  // The size of the whole, nose to engines, for whoever places it.
  const LENGTH = 18.75 + 21.7;
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
    // (A jet's glow is light: it casts no shadow, render/columbia3d.js.)
    if (m.metadata?.light) continue;
    shadows.addShadowCaster(m, false);
    m.receiveShadows = true;
  }
  return shadows;
}
