import { Vector3, Quaternion, Color3, StandardMaterial, TransformNode, DynamicTexture, Mesh, CreateCylinder, CreateSphere, CreateBox, CreateTorus, CreatePlane, Texture, Constants } from './babylon.js';

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
  weatherCommand(g, w, h, rnd);
}
// Eight days flown (the user, 2026-11-20: "웨더링 더 넣고"): the tape crinkled all over in
// fine creases that catch the light or go dark, dull and bright patches where it lies flat
// or lifts, a few lifted corners with their shadows, scorch round the windows' rims and the
// brown fans of the module's own small jets.
function weatherCommand(g, w, h, rnd) {
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w, y = rnd() * h, l = 4 + rnd() * 18, a = (rnd() - 0.5) * 2.4;
    g.strokeStyle = rnd() < 0.55 ? `rgba(255,255,255,${(0.1 + rnd() * 0.25).toFixed(2)})` : `rgba(40,42,46,${(0.12 + rnd() * 0.25).toFixed(2)})`;
    g.lineWidth = 0.6 + rnd() * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 70;
    const spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, rnd() < 0.5 ? 'rgba(150,146,138,.28)' : 'rgba(255,255,250,.22)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 14; i++) {
    // A corner of tape lifted: bright face, dark gap under it.
    const x = rnd() * w, y = rnd() * h, k = 8 + rnd() * 14;
    g.fillStyle = 'rgba(30,30,34,.55)';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + k, y + 2); g.lineTo(x + 2, y + k); g.closePath(); g.fill();
    g.fillStyle = 'rgba(250,250,252,.8)';
    g.beginPath(); g.moveTo(x - 2, y - 2); g.lineTo(x + k - 3, y - 1); g.lineTo(x - 1, y + k - 3); g.closePath(); g.fill();
  }
  for (const [u, v] of [[0.22, 0.6], [0.28, 0.6], [0.08, 0.42], [0.42, 0.42], [0.25, 0.38]]) {
    const x = u * w, y = (1 - v) * h, r = 46;
    const ring = g.createRadialGradient(x, y, 24, x, y, r);
    ring.addColorStop(0, 'rgba(92,70,44,.4)');
    ring.addColorStop(1, 'rgba(92,70,44,0)');
    g.fillStyle = ring;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (const u of [0.12, 0.37, 0.62, 0.87]) {
    const x = u * w, y = 0.3 * h;
    const fan = g.createRadialGradient(x, y, 2, x, y, 70);
    fan.addColorStop(0, 'rgba(88,62,34,.55)');
    fan.addColorStop(0.5, 'rgba(120,92,52,.22)');
    fan.addColorStop(1, 'rgba(120,92,52,0)');
    g.fillStyle = fan;
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, 70, 0.9, 2.25); g.closePath(); g.fill();
  }
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
  weatherService(g, w, h, rnd);
}
// Eight days flown: the words and the flag a little faded, grime run along the panels,
// the radiators greyed unevenly, and round each of the four thruster quads (u 1/8, 3/8,
// 5/8, 7/8 round, some 83% of the way forward) the yellow-brown fans of their exhaust.
function weatherService(g, w, h, rnd) {
  g.fillStyle = 'rgba(200,198,190,.22)';
  g.fillRect(0.8 * w, 0, 0.12 * w, h);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w, y0 = rnd() * h, l = 40 + rnd() * 200;
    const run = g.createLinearGradient(0, y0, 0, y0 + l);
    run.addColorStop(0, `rgba(70,62,50,${(0.12 + rnd() * 0.2).toFixed(2)})`);
    run.addColorStop(1, 'rgba(70,62,50,0)');
    g.fillStyle = run;
    g.fillRect(x, y0, 1 + rnd() * 3, l);
  }
  for (const u0 of [0.05, 0.55]) {
    for (let i = 0; i < 18; i++) {
      const x = (u0 + rnd() * 0.22) * w, y = h * (0.05 + rnd() * 0.42), r = 10 + rnd() * 34;
      const spot = g.createRadialGradient(x, y, 0, x, y, r);
      spot.addColorStop(0, `rgba(150,146,130,${(0.15 + rnd() * 0.2).toFixed(2)})`);
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = spot;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  for (const u of [0.125, 0.375, 0.625, 0.875]) {
    const x = u * w, y = (1 - 0.83) * h;
    for (const [a0, a1, r] of [[-0.5, 0.5, 120], [Math.PI - 0.5, Math.PI + 0.5, 120], [Math.PI / 2 - 0.35, Math.PI / 2 + 0.35, 210]]) {
      const fan = g.createRadialGradient(x, y, 4, x, y, r);
      fan.addColorStop(0, 'rgba(96,66,30,.6)');
      fan.addColorStop(0.45, 'rgba(150,112,58,.28)');
      fan.addColorStop(1, 'rgba(160,124,70,0)');
      g.fillStyle = fan;
      g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a0, a1); g.closePath(); g.fill();
    }
  }
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
  // Heat: the throat darkest, then bands going blue-grey, straw and bronze toward the rim,
  // mottled.
  const heat = g.createLinearGradient(0, 0, 0, h);
  heat.addColorStop(0, 'rgba(10,10,12,.55)');
  heat.addColorStop(0.3, 'rgba(60,70,96,.35)');
  heat.addColorStop(0.55, 'rgba(120,110,150,.22)');
  heat.addColorStop(0.72, 'rgba(176,150,90,.3)');
  heat.addColorStop(0.88, 'rgba(150,100,60,.32)');
  heat.addColorStop(1, 'rgba(110,84,60,.2)');
  g.fillStyle = heat;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 16;
    g.fillStyle = `rgba(${rnd() < 0.5 ? '40,36,40' : '190,160,120'},${(0.08 + rnd() * 0.12).toFixed(2)})`;
    g.fillRect(x - r, y - r / 3, 2 * r, (2 * r) / 3);
  }
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
  add(along(CreateCylinder(`${name}Cone`, { height: 3.0, diameterTop: 1.3, diameterBottom: 3.84, tessellation: 64, cap: Mesh.NO_CAP }, scene)), cmMat, 1.62, 0, 0);
  add(along(CreateTorus(`${name}Shoulder`, { diameter: 3.64, thickness: 0.3, tessellation: 64 }, scene)), cmMat, 0.12, 0, 0);
  const heat = add(CreateSphere(`${name}Heat`, { diameter: 3.9, segments: 32, slice: 0.5 }, scene), shield, 0.02, 0, 0);
  heat.rotation.z = PI / 2;
  heat.scaling.y = 0.12;
  // Her nose as Aldrin's photograph from Eagle shows it (AS11-37-5446; the user, 2026-11-21:
  // "3,4만 해"): a flat ring of bright metal at the top of the cone, the docking tunnel's
  // mouth inside it rimmed with a copper ring, dark within, and the probe in it: a dark
  // hub on three dark arms that reach to the rim, its spike standing out with a small head.
  add(along(CreateCylinder(`${name}NoseRing`, { height: 0.04, diameter: 1.3, tessellation: 48 }, scene)), metal, 3.12, 0, 0);
  const copper = material(scene, `${name}Copper`, null, { color: [0.72, 0.38, 0.22], spec: 0.6, power: 40 });
  add(along(CreateTorus(`${name}TunnelRim`, { diameter: 0.96, thickness: 0.07, tessellation: 48 }, scene)), copper, 3.15, 0, 0);
  add(along(CreateCylinder(`${name}Tunnel`, { height: 0.3, diameter: 0.92, tessellation: 32 }, scene)), dark, 3.0, 0, 0);
  add(along(CreateCylinder(`${name}ProbeHub`, { height: 0.16, diameter: 0.32, tessellation: 20 }, scene)), dark, 3.2, 0, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * 2 * PI + PI / 6;
    const arm = add(CreateBox(`${name}ProbeArm${k}`, { width: 0.07, height: 0.34, depth: 0.07 }, scene), dark, 3.18, 0.3 * Math.cos(a), 0.3 * Math.sin(a));
    arm.rotation.x = a - PI / 2;
  }
  add(along(CreateCylinder(`${name}Probe`, { height: 0.5, diameterTop: 0.05, diameterBottom: 0.1, tessellation: 12 }, scene)), metal, 3.5, 0, 0);
  add(CreateSphere(`${name}ProbeHead`, { diameter: 0.1, segments: 8 }, scene), dark, 3.76, 0, 0);

  // The service module behind it: a can 3.9 m across and 3.9 m long, its front fairing,
  // the four thruster quads, the engine bell, the high-gain antenna on its boom.
  add(along(CreateCylinder(`${name}Fairing`, { height: 0.32, diameterTop: 3.86, diameterBottom: 3.92, tessellation: 64 }, scene)), white, -0.18, 0, 0);
  add(along(CreateCylinder(`${name}Service`, { height: 3.9, diameter: 3.92, tessellation: 64 }, scene)), smMat, -2.29, 0, 0);
  add(along(CreateCylinder(`${name}Aft`, { height: 0.2, diameterTop: 3.92, diameterBottom: 3.4, tessellation: 64 }, scene)), dark, -4.34, 0, 0);
  add(along(CreateCylinder(`${name}Bell`, { height: 2.9, diameterTop: 0.9, diameterBottom: 2.5, tessellation: 48, cap: Mesh.NO_CAP }, scene)), bellMat, -5.85, 0, 0);
  const quads = [];
  for (let k = 0; k < 4; k++) {
    const a = PI / 4 + (k / 4) * 2 * PI;
    const quad = new TransformNode(`${name}Quad${k}`, scene);
    quad.parent = root;
    quad.position.set(-1.0, 2.0 * Math.cos(a), 2.0 * Math.sin(a));
    quad.rotation.x = a;
    quads.push(quad);
    const box = add(CreateBox(`${name}QuadBox${k}`, { width: 0.75, height: 0.22, depth: 0.55 }, scene), metal);
    box.parent = quad;
    for (const [dx, dz, ry, rz] of [[0.42, 0, 0, -PI / 2], [-0.42, 0, 0, PI / 2], [0, 0.32, PI / 2, 0], [0, -0.32, -PI / 2, 0]]) {
      const nozzle = add(CreateCylinder(`${name}Rcs${k}${dx}${dz}`, { height: 0.22, diameterTop: 0.05, diameterBottom: 0.13, tessellation: 12 }, scene), dark);
      nozzle.parent = quad;
      nozzle.position.set(dx, 0.02, dz);
      nozzle.rotation.set(rz === 0 ? (dz > 0 ? PI / 2 : -PI / 2) : 0, ry, rz);
    }
  }
  // The high-gain antenna as the photograph shows it: close beside the service module's
  // aft rim on a short boom, its four dishes dark grey mesh on spokes, facing ahead (it had
  // no gold box; that was a guess).
  const dishTex = paintTexture(scene, `${name}DishT`, 128, 128, (g, w, h) => {
    g.fillStyle = '#3a3b3e';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,152,156,.8)';
    g.lineWidth = 2;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * 2 * PI;
      g.beginPath();
      g.moveTo(w / 2, h / 2);
      g.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * h);
      g.stroke();
    }
    g.strokeStyle = 'rgba(120,122,126,.5)';
    for (const r of [0.2, 0.35, 0.48]) { g.beginPath(); g.arc(w / 2, h / 2, r * w, 0, 2 * PI); g.stroke(); }
  });
  const mesh = material(scene, `${name}DishMat`, dishTex, { spec: 0.35, power: 30 });
  const ay = Math.cos(PI / 4), az = -Math.sin(PI / 4);
  const boom = add(CreateCylinder(`${name}Boom`, { height: 1.3, diameter: 0.09, tessellation: 10 }, scene), metal, -4.05, 2.6 * ay, 2.6 * az);
  boom.rotation.x = -PI / 4 - PI / 2;
  const cx = -4.15, cr = 3.4;
  const tang = [-az, ay];
  for (const [dr, dt] of [[0.4, 0.4], [0.4, -0.4], [-0.4, 0.4], [-0.4, -0.4]]) {
    const dish = add(CreateSphere(`${name}Dish${dr}${dt}`, { diameter: 0.8, segments: 16, slice: 0.5 }, scene), mesh, cx, (cr + dr) * ay + dt * tang[0], (cr + dr) * az + dt * tang[1]);
    dish.rotation.z = -PI / 2;
    dish.scaling.y = 0.32;
  }
  add(CreateBox(`${name}DishBack`, { width: 0.22, height: 0.3, depth: 0.3 }, scene), dark, cx - 0.12, cr * ay, cr * az);

  // The jets' puffs (the user, 2026-11-20: "도킹이 저렇게 쉽다구?"), out of each quad's
  // forward nozzle (fwd: braking as she comes, pushing back as she goes) and one side nozzle
  // (side: the small corrections), shown by pose(). As the films show them in vacuum (the
  // user, 2026-11-22, chose sample "1+2+3"): a fan bright at the nozzle that spreads wide and
  // thins out at once, fired in 0.1 s bursts each with a flash at the nozzle, and grains of
  // propellant frozen as they leave flung out along the fan, fading as they go.
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
      const at = kind === 'fwd' ? [0.53, 0.02, 0] : [0, 0.02, k % 2 ? -0.43 : 0.43];
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
  // A burst every PULSE seconds while a jet is on, BURST long, sharp at the start.
  const PULSE = 0.24, BURST = 0.1;
  const fired = { fwd: -1, side: -1 };
  let lastT = null;
  const LENGTH = 4.47 + 7.3;
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
          // A handful of grains each burst, out along the fan, fading as they go.
          if (fresh) {
            for (let i = 0; i < 6; i++) {
              const g = jet.grains[jet.next];
              jet.next = (jet.next + 1) % jet.grains.length;
              const speed = 3 + 4 * Math.random();
              const a = Math.random() * 2 * PI;
              const r = 0.55 * Math.random();
              // Along the jet, with a spread across it (the two axes square to dir).
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

