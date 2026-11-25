// Why the Moon shows us one face (the user, 2026-11-25: "달의 자전과 달의 공전이 둘 다
// 27.3 같아?", "우주멍으로 이거 만들자", "태양계는 어떻게 도는가에서 달의 움직임 관련한걸
// 아예 빼서, 따로 만드는거야"): a little world of its own on a canvas over the game's, as
// the Solar System's turning is (it borrows that one's shaders). Not to scale: sizes and
// distances shrunk, the paces sped up, and the tidal bulges drawn hugely swollen (the
// Moon's is some metres, the seas' under one): the captions say so.
//   round:  the Moon going round the Earth, the same way the Earth turns.
//   lock:   a red spot on its face kept toward the Earth; beside it a Moon that did not
//           turn, its spot pointing one way, so both its faces would show.
//   why:    the newborn Moon turning fast; the Earth's pull stretches it toward the Earth;
//           the turning carries the bulge ahead, the Earth pulls it back, the turning slows
//           until it keeps pace with the round: one face for good.
//   seas:   the same on the Earth: the Moon raises its seas, the Earth's quicker turn carries
//           them ahead; the Moon pulls them back, so the day grows longer, and they pull the
//           Moon on, so it draws away (3.8 cm a year).
//   pluto, eris, trojans: is it only the Earth and the Moon? Pluto and Charon, each keeping
//          one face to the other; Eris, keeping one face to its moon Dysnomia; and the twin
//          asteroids Patroclus and Menoetius, locked to each other (the user: "명왕성 말고도
//          또 있으면, 샘플 넣어"). (The Moon's shape went to a course of its own: "달의
//          모양은 다른 영상으로 뺴자".)
// y up (north); x and z in the Earth's orbit's plane.
import { Engine, Scene, FreeCamera, Vector3, Color3, Color4, CreateSphere, CreateLineSystem, ShaderMaterial, Effect, Texture, Mesh, TransformNode, Matrix } from './babylon.js';
import './orbitStage.js'; // its shaders: orbitBody, orbitSky

// The course's seconds (core/courses.js keeps its captions to these).
export const MOONS = {
  round: [0, 34],
  lock: [34, 72],
  why: [72, 132],
  seas: [132, 170],
  pluto: [170, 204],
  eris: [204, 228],
  trojans: [228, 262],
  end: 264,
};

const TILT = (23.4 * Math.PI) / 180;
const MOON_TILT = (5.1 * Math.PI) / 180;
const MOON_ORBIT = 5;
const MOON_R = 0.27 * 1.8;

// A swollen sea: a see-through shell, brighter toward its edge.
Effect.ShadersStore.moonShellVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize((world * vec4(normal, 0.0)).xyz);
  gl_Position = viewProjection * w;
}`;
Effect.ShadersStore.moonShellFragmentShader = `
precision highp float;
varying vec3 vN;
varying vec3 vW;
uniform vec3 eye;
uniform vec3 tint;
uniform float power;
void main() {
  float f = 1.0 - abs(dot(normalize(vN), normalize(eye - vW)));
  gl_FragColor = vec4(tint * (0.2 + 0.9 * pow(f, 2.0)) * power, 1.0);
}`;

export function createMoonStage(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);
  const camera = new FreeCamera('moonEye', new Vector3(0, 15, -9), scene);
  camera.minZ = 0.02;
  camera.maxZ = 20000;
  camera.inputs.clear();
  const base = import.meta.env?.BASE_URL ?? './';

  const skyMat = new ShaderMaterial('moonSkyMat', scene, { vertex: 'orbitSky', fragment: 'orbitSky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'pix', 'fade'] });
  skyMat.backFaceCulling = false;
  const sky = CreateSphere('moonSky', { diameter: 15000, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
  sky.material = skyMat;
  sky.infiniteDistance = true;

  const bodyMat = (name, src, tint = [0.5, 0.5, 0.5]) => {
    const m = new ShaderMaterial(name, scene, { vertex: 'orbitBody', fragment: 'orbitBody' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'sunAt', 'sunPoint', 'hasMap', 'tint', 'night', 'markAt', 'mark', 'fade', 'markR', 'hasNight', 'gain'], samplers: ['map', 'nightMap'] });
    if (src) m.setTexture('map', new Texture(`${base}${src}`, scene, false, false));
    m.setFloat('hasMap', src ? 1 : 0);
    m.setColor3('tint', new Color3(...tint));
    m.setFloat('night', 0.2);
    m.setFloat('mark', 0);
    m.setFloat('markR', 0.2);
    m.setFloat('hasNight', 0);
    m.setFloat('gain', 1.7);
    m.setVector3('markAt', Vector3.Zero());
    m.setFloat('fade', 1);
    m.setFloat('sunPoint', 0);
    return m;
  };
  const shellMat = (name, tint) => {
    const m = new ShaderMaterial(name, scene, { vertex: 'moonShell', fragment: 'moonShell' }, { attributes: ['position', 'normal'], uniforms: ['world', 'viewProjection', 'eye', 'tint', 'power'], needAlphaBlending: true });
    m.alphaMode = 1; // added
    m.disableDepthWrite = true;
    m.setColor3('tint', new Color3(...tint));
    m.setFloat('power', 0);
    return m;
  };
  // Lines faded by their colour (a line system's alpha does nothing here).
  const lineOf = (name, color, pts) => {
    const l = CreateLineSystem(name, { lines: [pts], updatable: true }, scene);
    l.color = new Color3(...color);
    l.metadata = { base: new Color3(...color) };
    return l;
  };
  const setLine = (l, pts, on) => {
    l.setEnabled(on > 0.001);
    if (on > 0.001) {
      CreateLineSystem(l.name, { lines: [pts], instance: l }, scene);
      l.color = l.metadata.base.scale(on);
    }
  };

  // Where round the Moon's way (leaning 5 degrees from the Earth's orbit) an angle is.
  const wayDir = (a) => new Vector3(Math.cos(a), Math.sin(a) * Math.sin(MOON_TILT), Math.sin(a) * Math.cos(MOON_TILT));
  const flatDir = (a) => new Vector3(Math.cos(a), 0, Math.sin(a));
  const circle = (R) => Array.from({ length: 161 }, (_, i) => wayDir((i / 160) * Math.PI * 2).scale(R));

  // The Earth (radius 1), its axis leaning 23.4 degrees, and its swollen seas.
  const earthTilt = new TransformNode('moonEarthTilt', scene);
  earthTilt.rotation.z = -TILT;
  const earthMat = bodyMat('moonEarthMat', 'assets/earth-day.webp');
  earthMat.setTexture('nightMap', new Texture(`${base}assets/earth-night.webp`, scene, false, false));
  earthMat.setFloat('hasNight', 1);
  earthMat.setFloat('gain', 1.6);
  earthMat.setFloat('night', 0.15);
  const earth = CreateSphere('moonEarth', { diameter: 2, segments: 64 }, scene);
  earth.material = earthMat;
  earth.parent = earthTilt;
  const seasHold = new TransformNode('moonSeasHold', scene);
  const seas = CreateSphere('moonSeas', { diameter: 2.06, segments: 48 }, scene);
  seas.material = shellMat('moonSeasMat', [0.35, 0.65, 1]);
  seas.parent = seasHold;

  // The Moon, held in a node that stretches it toward the Earth (its rock turns inside).
  const moonMat = bodyMat('moonMoonMat', 'assets/planets/moon.webp');
  const moonHold = new TransformNode('moonMoonHold', scene);
  const moon = CreateSphere('moonMoon', { diameter: 0.54, segments: 48 }, scene);
  moon.material = moonMat;
  moon.parent = moonHold;
  moon.scaling.setAll(1.8);
  const moonRing = lineOf('moonRing', [0.7, 0.7, 0.75], circle(MOON_ORBIT));
  // The Moon as it would go if it did not turn: outside the true one, its spot fixed.
  const ghostMat = bodyMat('moonGhostMat', 'assets/planets/moon.webp');
  const ghost = CreateSphere('moonGhost', { diameter: 0.54, segments: 48 }, scene);
  ghost.material = ghostMat;
  ghost.scaling.setAll(1.8);
  const ghostRing = lineOf('moonGhostRing', [0.55, 0.45, 0.45], circle(MOON_ORBIT * 1.35));
  // The pull on the near bulge, and the line between the middles to show the bulge is aside.
  const pull = lineOf('moonPull', [1, 0.85, 0.35], [Vector3.Zero(), Vector3.Zero()]);
  const middles = lineOf('moonMiddles', [0.55, 0.6, 0.7], [Vector3.Zero(), Vector3.Zero()]);
  const seaPull = lineOf('moonSeaPull', [1, 0.85, 0.35], [Vector3.Zero(), Vector3.Zero()]);

  // Pairs locked to each other (or one to the other), each going round their common middle:
  // a and b with their radius, a map or a colour, and a shape (stretched along the line
  // between them, z in each one's own frame); sep the distance between, mid how far from a
  // the middle lies; lap the seconds of a round, drawn.
  //   Pluto and Charon: Charon 0.51 of Pluto across, an eighth of its weight, so the middle
  //   lies outside Pluto. Eris and Dysnomia: Dysnomia about a quarter of Eris across, some
  //   0.5% of its weight (not well measured), the middle inside Eris; only Eris is known to
  //   keep one face (Dysnomia's own turn is not known: no spot on it; Codex, 2026-11-25). Patroclus and Menoetius: near twins some 110 km across, each
  //   a little drawn out.
  const PAIRS = [
    { part: 'pluto', words: ['pluto', 'charon'], a: { src: 'assets/planets/pluto.webp', r: 0.6 }, b: { src: 'assets/planets/charon.webp', r: 0.31 }, sep: 6, mid: 6 * 0.109, lap: 10 },
    { part: 'eris', words: ['eris', 'dysnomia'], a: { tint: [0.9, 0.9, 0.92], r: 0.6 }, b: { tint: [0.32, 0.3, 0.29], r: 0.16, noMark: true }, sep: 6, mid: 6 * 0.005, lap: 12 },
    { part: 'trojans', words: ['patroclus', 'menoetius'], a: { src: 'assets/planets/phobos.webp', r: 0.5, shape: [0.85, 0.9, 1.25] }, b: { src: 'assets/planets/vesta.webp', r: 0.46, shape: [0.9, 0.85, 1.2] }, sep: 4.2, mid: 4.2 * 0.47, lap: 8 },
  ];
  const flatCircle = (R) => Array.from({ length: 161 }, (_, i) => flatDir((i / 160) * Math.PI * 2).scale(R));
  for (const p of PAIRS) {
    for (const k of ['a', 'b']) {
      const o = p[k];
      o.mat = bodyMat(`moon${p.part}${k}Mat`, o.src, o.tint);
      o.mesh = CreateSphere(`moon${p.part}${k}`, { diameter: o.r * 2, segments: 48 }, scene);
      o.mesh.material = o.mat;
      const [x, y, z] = o.shape ?? [1, 1, 1];
      o.mesh.scaling.set(x, y, z);
      o.ring = lineOf(`moon${p.part}${k}Ring`, [0.7, 0.7, 0.75], flatCircle(k === 'a' ? p.mid : p.sep - p.mid));
    }
  }
  const pairOf = (T) => PAIRS.find((p) => T >= MOONS[p.part][0] && T < MOONS[p.part][1]) ?? (T >= MOONS.trojans[1] ? PAIRS[2] : null);
  const pairAng = (p, T) => (2 * Math.PI * (T - MOONS[p.part][0])) / p.lap + 2.2;

  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const vlerp = (a, b, k) => Vector3.Lerp(a, b, k);
  const inPart = (part, T) => T >= part[0] && T < part[1];

  // Where the Moon is round the Earth (anticlockwise from above): a month in 16 s, slower
  // while its turning and its shape are watched up close (40 s), then 20 s.
  const LAPS = [[MOONS.round[0], 16], [MOONS.why[0] + 2, 40], [MOONS.seas[0] + 2, 20]];
  const moonAngle = (T) => {
    let a = 0;
    for (let i = 0; i < LAPS.length; i++) {
      const from = LAPS[i][0], to = i + 1 < LAPS.length ? LAPS[i + 1][0] : Infinity;
      if (T > from) a += (Math.min(T, to) - from) / LAPS[i][1];
    }
    return 2 * Math.PI * a - 1.9;
  };
  // The young Moon's own turn ahead of its round: fast at first, slowing to none (five
  // turns more, so its spot comes back to the Earth).
  const SPIN_FROM = MOONS.why[0] + 5, SPIN_S = 40, SPIN_TURNS = 5;
  const spinX = (T) => Math.min(1, Math.max(0, (T - SPIN_FROM) / SPIN_S));
  const extraOf = (T) => 2 * Math.PI * SPIN_TURNS * (1 - Math.pow(1 - spinX(T), 3));
  const extraRate = (T) => (T < SPIN_FROM ? 0 : Math.pow(1 - spinX(T), 2));
  // How far out the Moon is: drawing off while the Earth's seas pull it on.
  const orbitOf = (T) => lerp(MOON_ORBIT, 6.3, smooth(MOONS.seas[0] + 10, MOONS.seas[1] - 4, T));

  // Names on the screen, over what they name.
  const names = document.createElement('div');
  names.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;font:600 13px system-ui,sans-serif;color:#e8ecf4;text-shadow:0 1px 4px #000';
  canvas.after(names);
  const tags = [];
  const tag = (text, at, shown) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;transform:translate(-50%,-150%);white-space:nowrap;opacity:0;transition:opacity 0.6s';
    names.append(el);
    tags.push({ el, at, shown });
  };
  const toScreen = (p) => {
    const w = engine.getRenderWidth(), h = engine.getRenderHeight();
    const v = Vector3.Project(p, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(w, h));
    const dpr = w / Math.max(1, canvas.clientWidth);
    return { x: v.x / dpr, y: v.y / dpr, front: v.z > 0 && v.z < 1 };
  };

  let moonAt = Vector3.Zero();
  let T0 = 0;
  let moonDir = wayDir(0);
  function update(T, words) {
    T0 = T;
    if (words && !tags.length) {
      // (Over the close views from above, where the screen's up is toward the Earth, each
      // name goes on that side of what it names, not over its face.)
      tag(words.earth, () => (T0 >= MOONS.seas[0] ? moonDir.scale(-1.15) : new Vector3(0, 0.95, 0)), (t) => inPart([MOONS.round[0] + 2, MOONS.lock[1]], t) || inPart([MOONS.seas[0] + 4, MOONS.seas[1]], t));
      tag(words.moon, () => (T0 >= MOONS.seas[0] ? moonAt.add(moonDir.scale(-MOON_R * 1.2)) : moonAt), (t) => inPart([MOONS.round[0] + 4, MOONS.why[0]], t) || inPart([MOONS.seas[0] + 4, MOONS.seas[1]], t));
      tag(words.ghost, () => ghost.position, (t) => inPart([MOONS.lock[0] + 14, MOONS.lock[1]], t));
      for (const p of PAIRS) {
        const span = [MOONS[p.part][0] + 2, MOONS[p.part][1]];
        tag(words[p.words[0]], () => p.a.mesh.position.add(flatDir(pairAng(p, T0)).scale(-p.a.r * 1.15)), (t) => inPart(span, t));
        tag(words[p.words[1]], () => p.b.mesh.position.add(flatDir(pairAng(p, T0)).scale(-p.b.r * 1.4)), (t) => inPart(span, t));
      }
    }
    // A dip to black between the Earth's part and the pairs, and between them, and at the end.
    let fade = 1 - smooth(MOONS.trojans[1] + 0.5, MOONS.end, T);
    for (const d of [MOONS.pluto[0], MOONS.eris[0], MOONS.trojans[0]]) fade *= 1 - smooth(d - 1, d, T) * (1 - smooth(d, d + 1.5, T));
    const nearOn = T < MOONS.seas[1];

    // --- The Earth and the Moon ---
    earthTilt.setEnabled(nearOn);
    moonHold.setEnabled(nearOn);
    // The Earth turns once in 6 s (a day), anticlockwise from above.
    earth.rotation.y = -(2 * Math.PI * T) / 6;
    const ma = moonAngle(T);
    const R = orbitOf(T);
    moonDir = wayDir(ma);
    moonAt = moonDir.scale(R);
    moonHold.position.copyFrom(moonAt);
    setLine(moonRing, circle(R), 0.6 * smooth(MOONS.round[0] + 1, MOONS.round[0] + 5, T) * (1 - smooth(MOONS.why[0], MOONS.why[0] + 3, T) + smooth(MOONS.seas[0] + 2, MOONS.seas[0] + 5, T)) * (nearOn ? 1 : 0));
    // Up close while its turning is watched.
    const big = 1 + 0.75 * smooth(MOONS.why[0], MOONS.why[0] + 4, T) * (1 - smooth(MOONS.seas[0] - 2, MOONS.seas[0] + 2, T));
    const extra = extraOf(T);
    // The bulge: carried ahead (anticlockwise) by the fast turn, drawn back to the Earth as
    // the turn slows; kept, pointing at the Earth, once it is locked.
    const bulgeOn = smooth(MOONS.why[0] + 8, MOONS.why[0] + 12, T) * (1 - smooth(MOONS.seas[0] - 2, MOONS.seas[0] + 2, T));
    const toEarth = ma + Math.PI;
    // (Swollen hugely, and carried far ahead, to show: the user, 2026-11-25, of a stretch of
    // 1.42 and a lead of 30 degrees: "좀 더 과장해서 그려".)
    const bulgeAng = toEarth + 0.8 * extraRate(T);
    const stretch = 1 + 0.8 * bulgeOn;
    moonHold.rotation.y = -bulgeAng;
    moonHold.scaling.set(stretch * big, big, big);
    // The rock's own turn, in the stretching node's frame: its near face (u = 0.5 under
    // Babylon's sphere map) toward the spot.
    const spotAng = toEarth + extra;
    moon.rotation.y = bulgeAng - spotAng - Math.PI / 2;
    // The red spot, on the stretched surface.
    const r = MOON_R * big;
    const off = spotAng - bulgeAng;
    const surf = r / Math.sqrt(Math.pow(Math.cos(off) / stretch, 2) + Math.pow(Math.sin(off), 2));
    const markOn = smooth(MOONS.lock[0], MOONS.lock[0] + 3, T) * (1 - smooth(MOONS.seas[0] - 2, MOONS.seas[0] + 1, T));
    moonMat.setFloat('mark', markOn);
    // (Larger up close over it, where it is seen side-on at its edge.)
    const markR = 0.24 * lerp(1, 1.9, smooth(MOONS.why[0], MOONS.why[0] + 4, T));
    moonMat.setFloat('markR', markR);
    moonMat.setVector3('markAt', moonAt.add(flatDir(spotAng).scale(surf)));

    // The Moon that does not turn.
    const ghostOn = smooth(MOONS.lock[0] + 12, MOONS.lock[0] + 15, T) * (1 - smooth(MOONS.lock[1] - 2, MOONS.lock[1], T));
    ghost.setEnabled(ghostOn > 0.001);
    ghost.position.copyFrom(moonDir.scale(MOON_ORBIT * 1.35));
    ghostMat.setFloat('mark', ghostOn);
    ghostMat.setFloat('markR', 0.24);
    ghostMat.setVector3('markAt', ghost.position.add(new Vector3(-1, 0, 0).scale(MOON_R)));
    setLine(ghostRing, circle(MOON_ORBIT * 1.35), 0.5 * ghostOn);

    // The Earth's pull on the Moon's near bulge.
    const pullOn = smooth(MOONS.why[0] + 16, MOONS.why[0] + 19, T) * (1 - smooth(MOONS.seas[0] - 3, MOONS.seas[0], T));
    const tip = moonAt.add(flatDir(bulgeAng).scale(r * stretch));
    setLine(pull, [moonDir.scale(1.02), tip], pullOn);
    setLine(middles, [moonDir.scale(1.02), moonAt.add(moonDir.scale(-r))], pullOn * 0.55);

    // The Earth's seas: swollen toward the Moon and away from it, carried ahead by the Earth's turn.
    const seaOn = smooth(MOONS.seas[0] + 3, MOONS.seas[0] + 7, T) * (1 - smooth(MOONS.seas[1] - 2, MOONS.seas[1], T));
    const seaAng = ma + 0.5;
    seasHold.setEnabled(seaOn > 0.001);
    seasHold.rotation.y = -seaAng;
    seasHold.scaling.set(1 + 0.32 * seaOn, 1, 1);
    // Its near bulge pulling the Moon on, and the Moon pulling it back.
    const seaTip = flatDir(seaAng).scale(1.03 * (1 + 0.32 * seaOn));
    setLine(seaPull, [seaTip, moonAt.add(moonDir.scale(-MOON_R))], smooth(MOONS.seas[0] + 10, MOONS.seas[0] + 13, T) * (1 - smooth(MOONS.seas[1] - 2, MOONS.seas[1], T)));

    // --- The pairs: round their middle, each keeping its near face to the other ---
    const pairNow = pairOf(T);
    for (const p of PAIRS) {
      const on = p === pairNow;
      const pa = pairAng(p, T);
      const pd = flatDir(pa);
      p.a.mesh.setEnabled(on);
      p.b.mesh.setEnabled(on);
      p.a.mesh.position.copyFrom(pd.scale(-p.mid));
      p.b.mesh.position.copyFrom(pd.scale(p.sep - p.mid));
      // (Each turned so its own near face, and its long way, look at the other.)
      p.a.mesh.rotation.y = -pa - Math.PI / 2;
      p.b.mesh.rotation.y = -pa + Math.PI / 2;
      p.a.mat.setVector3('markAt', p.a.mesh.position.add(pd.scale(p.a.r * (p.a.shape?.[2] ?? 1))));
      p.b.mat.setVector3('markAt', p.b.mesh.position.add(pd.scale(-p.b.r * (p.b.shape?.[2] ?? 1))));
      p.a.mat.setFloat('markR', p.a.r * 0.37);
      p.b.mat.setFloat('markR', Math.max(0.16, p.b.r * 0.6));
      const markOn = smooth(MOONS[p.part][0] + 6, MOONS[p.part][0] + 8, T);
      p.a.mat.setFloat('mark', markOn);
      p.b.mat.setFloat('mark', p.b.noMark ? 0 : markOn);
      const ringOn = on ? 0.5 * smooth(MOONS[p.part][0] + 1, MOONS[p.part][0] + 3, T) : 0;
      setLine(p.a.ring, flatCircle(p.mid), ringOn);
      setLine(p.b.ring, flatCircle(p.sep - p.mid), ringOn);
    }

    // The light: from behind the eye's shoulder, so the day sides face the eye.
    const eye = cameraAt(T);
    const fromEye = eye.at.subtract(eye.look).normalize();
    const eyeSun = Vector3.TransformNormal(fromEye, Matrix.RotationY(0.7)).add(new Vector3(0, 0.25, 0)).normalize();
    const sunAt = eyeSun;
    for (const m of [earthMat, moonMat, ghostMat, ...PAIRS.flatMap((p) => [p.a.mat, p.b.mat])]) {
      m.setVector3('sunAt', sunAt);
      m.setFloat('fade', fade);
    }
    seas.material.setFloat('power', 0.8 * seaOn * fade);
    seas.material.setVector3('eye', eye.at);
    skyMat.setFloat('fade', fade);
    camera.position.copyFrom(eye.at);
    camera.setTarget(eye.look);
    camera.fov = eye.fov;
    skyMat.setFloat('pix', camera.fov / Math.max(1, engine.getRenderHeight()));
    scene.render();

    for (const t of tags) {
      const on = t.shown(T);
      if (on) {
        const s = toScreen(t.at());
        t.el.style.left = `${s.x}px`;
        t.el.style.top = `${s.y}px`;
      }
      t.el.style.opacity = on && fade > 0.5 ? '1' : '0';
    }
  }

  // Where the eye is: beside the Earth, then up over the Moon's way; close over the Moon,
  // the Earth at the top of the screen; over the Earth's seas; then each pair, turning with it.
  function cameraAt(T) {
    const at = (x, y, z) => new Vector3(x, y, z);
    const keys = [
      { t: MOONS.round[0], at: at(-2.4, 2.2, -4.2), look: at(0, 0, 0), fov: 0.75 },
      { t: MOONS.round[0] + 10, at: at(1, 12, -11), look: at(0, 0, 0), fov: 0.8 },
      { t: MOONS.lock[0] + 8, at: at(0, 26, -4), look: at(0, 0, 0.5), fov: 0.9 },
      { t: MOONS.lock[1] - 1, at: at(0, 26, -4), look: at(0, 0, 0.5), fov: 0.9 },
    ];
    const closeMoon = { at: flatDir(moonAngle(T)).scale(MOON_ORBIT + 1.4).add(at(0, 9.5, 0)), look: flatDir(moonAngle(T)).scale(MOON_ORBIT - 1.3), fov: 0.85 };
    const R = orbitOf(T);
    const closeSeas = { at: flatDir(moonAngle(T)).scale(R + 2).add(at(0, 12, 0)), look: flatDir(moonAngle(T)).scale(R * 0.62), fov: 0.85 };
    const mix = (a, b, k) => ({ at: vlerp(a.at, b.at, k), look: vlerp(a.look, b.look, k), fov: lerp(a.fov, b.fov, k) });
    const p = pairOf(T);
    if (p) {
      const pd = flatDir(pairAng(p, T));
      const k = p.sep / 6;
      // (Far enough back that the upper one's name, over it, stays on the screen.)
      return { at: pd.scale(p.sep - p.mid + 1.2 * k).add(at(0, 12 * k, 0)), look: pd.scale(p.sep / 2 - p.mid + 0.6 * k), fov: 0.85 };
    }
    if (T >= MOONS.seas[0] - 2) return mix(closeMoon, closeSeas, smooth(MOONS.seas[0] - 2, MOONS.seas[0] + 5, T));
    if (T >= MOONS.lock[1] - 1) return mix(keys[3], closeMoon, smooth(MOONS.lock[1] - 1, MOONS.why[0] + 5, T));
    let i = 0;
    while (i < keys.length - 2 && T > keys[i + 1].t) i++;
    return mix(keys[i], keys[i + 1], smooth(keys[i].t, keys[i + 1].t, T));
  }

  return {
    update,
    resize: () => engine.resize(),
    dispose: () => { names.remove(); engine.dispose(); },
  };
}
