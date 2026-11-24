// How the Solar System turns, from the smallest motion to the largest (the user,
// 2026-11-24: "태양계 공전에 대해서 설명하는 우주멍 만들자. 지구의 자전, 달의 자전, 달의
// 공전... 작은 것부터 설명해봐", "만들어"): a little world of its own on a canvas over the
// game's, as the Moon's birth is. Not to scale: at true sizes and distances the Moon and
// the planets would not show at all, so sizes and distances are shrunk and the paces sped
// up (the captions say so); the ways things turn are kept: every orbit and spin goes the
// same way (anticlockwise seen from the north), the Earth's axis leans 23.4 degrees and
// keeps pointing the same way round the Sun, the Moon keeps one face to the Earth, and
// the planets go slower the further out they are (Kepler: the period as the distance to
// the power 1.5).
// y up (the north of the Earth's orbit); x and z in its plane.
import { Engine, Scene, FreeCamera, Vector3, Color3, Color4, CreateSphere, CreatePlane, CreateLineSystem, ShaderMaterial, Effect, Texture, Mesh, VertexData, TransformNode, Matrix } from './babylon.js';

// The course's seconds (core/courses.js keeps its captions to these).
export const ORBITS = {
  spin: [0, 46], // the Earth turning once a day
  moon: [46, 96], // the Moon going round the Earth
  lock: [96, 146], // the Moon turning once as it goes round: one face to the Earth
  phases: [146, 196], // why its shape changes, seen from the Earth
  year: [196, 250], // the Earth round the Sun, its axis keeping its way: the seasons
  planets: [250, 300], // all the planets, the further the slower
  sun: [300, 312], // the Sun turning
  helix: [312, 352], // the Sun going on, the planets with it: helices
  galaxy: [352, 422], // the Sun going round the galaxy
  end: 422,
};

const TILT = (23.4 * Math.PI) / 180;
// The Earth's axis: leaning toward +x (so at the year's x end its north is toward the Sun).
const AXIS = new Vector3(Math.sin(TILT), Math.cos(TILT), 0);
// Near the Earth (the first four parts) the Sun is far off, on the eye's side of the Earth
// so its day side faces the eye (the user, 2026-11-24: "지구가 너무 어두워").
const LOCAL_SUN = new Vector3(-0.8, 0.15, -0.55).normalize();
const MOON_R = 0.27;
const MOON_ORBIT = 5;
const MOON_LAP = 16; // seconds a month, drawn

// Planets: [id, map, display radius, distance in AU, display size].
const PLANETS = [
  ['mercury', 'assets/planets/mercury.webp', 0.39, 0.32],
  ['venus', 'assets/planets/venus.webp', 0.72, 0.55],
  ['earth', 'assets/earth-day.webp', 1, 0.6],
  ['mars', 'assets/planets/mars.webp', 1.52, 0.42],
  ['jupiter', 'assets/planets/jupiter.webp', 5.2, 1.7],
  ['saturn', 'assets/planets/saturn.webp', 9.58, 1.45],
  ['uranus', null, 19.2, 1.0],
  ['neptune', 'assets/planets/neptune.webp', 30.1, 0.95],
];
const SUN_R = 3;
const orbitOf = (au) => 14 * Math.sqrt(au) + 4;
// A year, drawn; the others by Kepler's law.
const YEAR = 14;
const lapOf = (au) => YEAR * Math.pow(au, 1.5);

Effect.ShadersStore.orbitBodyVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize((world * vec4(normal, 0.0)).xyz);
  vUV = uv;
  gl_Position = viewProjection * w;
}`;
// Lit by the Sun: from a point (sunAt, sunPoint 1) or from a way (sunAt as a direction).
// tint: a colour of its own where it has no map; mark: a red spot on its face (the Moon's,
// toward markDir in its own turning frame).
Effect.ShadersStore.orbitBodyFragmentShader = `
precision highp float;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
uniform vec3 sunAt;
uniform float sunPoint;
uniform sampler2D map;
uniform float hasMap;
uniform vec3 tint;
uniform float night;
uniform vec3 markAt;
uniform float mark;
uniform float fade;
uniform float markR;
uniform sampler2D nightMap;
uniform float hasNight;
uniform float gain;
void main() {
  vec3 n = normalize(vN);
  vec3 l = normalize(sunPoint > 0.5 ? sunAt - vW : sunAt);
  float lit = max(dot(n, l), 0.0);
  vec3 c = hasMap > 0.5 ? texture2D(map, vUV).rgb : tint;
  // The Earth's dark seas lifted, so a sea-turned face does not read as night.
  if (hasNight > 0.5) c = pow(c, vec3(0.7)) * 1.05;
  vec3 col = c * (night + (1.0 - night) * lit * gain);
  // The Earth's night side: its cities' lights.
  if (hasNight > 0.5) col += texture2D(nightMap, vUV).rgb * vec3(1.0, 0.85, 0.6) * 1.6 * smoothstep(0.15, -0.05, dot(n, l));
  float m = mark * smoothstep(markR, markR * 0.6, length(vW - markAt));
  col = mix(col, vec3(1.0, 0.25, 0.2), m);
  gl_FragColor = vec4(col * fade, 1.0);
}`;
// The Sun: a boiling face, darker toward its edge, a few spots turning with it.
Effect.ShadersStore.orbitSunFragmentShader = `
precision highp float;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
uniform vec3 eye;
uniform float spin;
uniform float fade;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 n = normalize(vN);
  float limb = max(dot(n, normalize(eye - vW)), 0.0);
  vec2 uv = vec2(vUV.x + spin, vUV.y);
  float g = n2(uv * vec2(90.0, 45.0)) * 0.5 + n2(uv * vec2(30.0, 15.0)) * 0.5;
  float spots = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 at = vec2(0.13 + 0.27 * float(i), 0.38 + 0.08 * mod(float(i), 2.0) + 0.12 * step(1.5, float(i)));
    vec2 d = vec2(fract(uv.x - at.x + 0.5) - 0.5, uv.y - at.y) * vec2(2.0, 1.0);
    spots += smoothstep(0.03, 0.015, length(d));
  }
  vec3 col = vec3(1.0, 0.78, 0.42) * (0.85 + 0.25 * g);
  col *= 0.45 + 0.55 * pow(limb, 0.5);
  col *= 1.0 - 0.75 * min(spots, 1.0);
  gl_FragColor = vec4(col * fade, 1.0);
}`;
Effect.ShadersStore.orbitGlowVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.orbitGlowFragmentShader = `
precision highp float;
varying vec2 vUV;
uniform vec3 tint;
uniform float power;
void main() {
  float r = length(vUV - 0.5) * 2.0;
  float g = (exp(-r * r * 5.0) + 0.3 * exp(-r * 3.0)) * smoothstep(1.0, 0.7, r);
  gl_FragColor = vec4(tint * g * power, 1.0);
}`;
// Stars, fixed to the screen's size.
Effect.ShadersStore.orbitSkyVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() { vDir = position; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.orbitSkyFragmentShader = `
precision highp float;
varying vec3 vDir;
uniform float pix;
uniform float fade;
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  vec3 g = d * 260.0;
  vec3 c = floor(g);
  float hh = h31(c);
  vec3 col = vec3(0.0);
  if (hh > 0.985) {
    vec3 at = c + 0.5 + 0.35 * (vec3(h31(c + 1.7), h31(c + 3.1), h31(c + 5.3)) - 0.5);
    float dist = length(g - at) / 260.0;
    col += mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.7), h31(c + 9.0)) * pow((hh - 0.985) / 0.015, 3.0) * smoothstep(pix * 1.6, 0.0, dist) * 1.3;
  }
  gl_FragColor = vec4(col * fade, 1.0);
}`;
// The galaxy: points in two arms and a bar, added together.
Effect.ShadersStore.orbitStarsVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec4 seed;
uniform mat4 viewProjection;
uniform float turn;
uniform vec3 centre;
uniform float pixel;
uniform vec3 eye;
uniform float maxSize;
varying vec3 vCol;
void main() {
  float c = cos(turn), s = sin(turn);
  vec3 p = centre + vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z);
  gl_Position = viewProjection * vec4(p, 1.0);
  vCol = mix(vec3(1.0, 0.85, 0.65), vec3(0.65, 0.75, 1.0), seed.x) * (0.35 + 0.65 * seed.y);
  gl_PointSize = clamp(pixel * 1.6 / length(eye - p), 1.0, maxSize);
}`;
Effect.ShadersStore.orbitStarsFragmentShader = `
precision highp float;
varying vec3 vCol;
uniform float fade;
uniform float bright;
void main() { gl_FragColor = vec4(vCol * fade * bright, 1.0); }`;
// The galaxy's own light under its stars: the glow along its arms with a dark lane of dust
// on their inner side, pink knots where stars are born, and its yellow middle.
Effect.ShadersStore.orbitDiscVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec2 vP;
void main() { vP = position.xy; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.orbitDiscFragmentShader = `
precision highp float;
varying vec2 vP;
uniform float fade;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
const float PI = 3.14159265;
float wrapA(float a) { return mod(a + PI, 2.0 * PI) - PI; }
void main() {
  // (The plane lies flat, turned from x-y: its y is the galaxy's z.)
  vec2 q = vP;
  float r = length(q);
  float ang = atan(q.y, q.x);
  float aa = log(max(r, 1.0) / 60.0) * 1.7;
  float d0 = wrapA(ang - aa), d1 = wrapA(ang - aa - PI);
  float d = abs(d0) < abs(d1) ? d0 : d1;
  float edge = smoothstep(520.0, 380.0, r) * smoothstep(50.0, 110.0, r);
  float arm = exp(-pow(d / 0.28, 2.0)) * edge;
  float lane = exp(-pow((d + 0.2) / 0.06, 2.0)) * edge;
  float bulge = exp(-r * r / 9000.0);
  float knots = smoothstep(0.75, 0.95, n2(q / 7.0)) * exp(-pow(d / 0.16, 2.0)) * edge;
  vec3 col = vec3(0.32, 0.4, 0.62) * arm * (1.0 - lane) * 0.28 + vec3(0.04, 0.045, 0.065) * edge * (1.0 - 0.8 * lane)
    + vec3(1.0, 0.78, 0.5) * bulge * 0.55 + vec3(1.0, 0.3, 0.55) * knots * 0.35;
  gl_FragColor = vec4(col * fade, 1.0);
}`;

export function createOrbitStage(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);
  const camera = new FreeCamera('orbitEye', new Vector3(0, 3, -9), scene);
  camera.minZ = 0.02;
  camera.maxZ = 20000;
  camera.inputs.clear();
  const base = import.meta.env?.BASE_URL ?? './';

  const skyMat = new ShaderMaterial('orbitSkyMat', scene, { vertex: 'orbitSky', fragment: 'orbitSky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'pix', 'fade'] });
  skyMat.backFaceCulling = false;
  const sky = CreateSphere('orbitSky', { diameter: 15000, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
  sky.material = skyMat;
  sky.infiniteDistance = true;

  const bodyMat = (name, src, tint = [0.5, 0.5, 0.5]) => {
    const m = new ShaderMaterial(name, scene, { vertex: 'orbitBody', fragment: 'orbitBody' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'sunAt', 'sunPoint', 'hasMap', 'tint', 'night', 'markAt', 'mark', 'fade', 'markR', 'hasNight', 'gain'], samplers: ['map', 'nightMap'] });
    if (src) m.setTexture('map', new Texture(`${base}${src}`, scene, false, false));
    m.setFloat('hasMap', src ? 1 : 0);
    m.setColor3('tint', new Color3(...tint));
    m.setFloat('night', 0.05);
    m.setFloat('mark', 0);
    m.setFloat('markR', 0.07);
    m.setFloat('hasNight', 0);
    m.setFloat('gain', 1.25);
    m.setVector3('markAt', Vector3.Zero());
    m.setFloat('fade', 1);
    return m;
  };
  const glowMat = (name, tint) => {
    const m = new ShaderMaterial(name, scene, { vertex: 'orbitGlow', fragment: 'orbitGlow' }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'tint', 'power'], needAlphaBlending: true });
    m.alphaMode = 1; // added
    m.disableDepthWrite = true;
    m.setColor3('tint', new Color3(...tint));
    m.setFloat('power', 1);
    return m;
  };
  // A ring of line round a centre in the plane square to `up` (an orbit drawn).
  const ring = (name, radius, color, up = Vector3.Up()) => {
    const a = Vector3.Cross(up, new Vector3(1, 0, 0)).length() > 0.1 ? Vector3.Cross(up, new Vector3(1, 0, 0)).normalize() : new Vector3(0, 0, 1);
    const b = Vector3.Cross(up, a).normalize();
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      pts.push(a.scale(Math.cos(t) * radius).add(b.scale(Math.sin(t) * radius)));
    }
    const line = CreateLineSystem(name, { lines: [pts] }, scene);
    line.color = new Color3(...color);
    line.alpha = 0.6;
    return line;
  };

  // --- Near the Earth ---------------------------------------------------------------
  const near = new TransformNode('orbitNear', scene);
  const earthTilt = new TransformNode('orbitEarthTilt', scene);
  earthTilt.parent = near;
  earthTilt.rotation.z = -TILT;
  const earthMat = bodyMat('orbitEarthMat', 'assets/earth-day.webp');
  const nightLights = new Texture(`${base}assets/earth-night.webp`, scene, false, false);
  earthMat.setTexture('nightMap', nightLights);
  earthMat.setFloat('hasNight', 1);
  // Brighter, its shade not black (the user, 2026-11-24: "지구를 좀 더 밝게").
  earthMat.setFloat('gain', 1.6);
  earthMat.setFloat('night', 0.15);
  const earth = CreateSphere('orbitEarth', { diameter: 2, segments: 64 }, scene);
  earth.material = earthMat;
  earth.parent = earthTilt;
  // The axis through it, and a pin at Seoul turning with it.
  const axisLine = CreateLineSystem('orbitAxis', { lines: [[new Vector3(0, -1.6, 0), new Vector3(0, 1.6, 0)]] }, scene);
  axisLine.color = new Color3(0.6, 0.85, 1);
  axisLine.parent = earthTilt;
  const moonMat = bodyMat('orbitMoonMat', 'assets/planets/moon.webp');
  const moon = CreateSphere('orbitMoon', { diameter: MOON_R * 2, segments: 48 }, scene);
  moon.material = moonMat;
  moon.parent = near;
  moon.scaling.setAll(1.8);
  // The Moon as it would go if it did not turn: beside the true one, its spot fixed.
  const ghostMat = bodyMat('orbitGhostMat', 'assets/planets/moon.webp');
  const ghost = CreateSphere('orbitGhost', { diameter: MOON_R * 2, segments: 48 }, scene);
  ghost.material = ghostMat;
  ghost.parent = near;
  ghost.scaling.setAll(1.8);
  const moonRing = ring('orbitMoonRing', MOON_ORBIT, [0.7, 0.7, 0.75]);
  moonRing.parent = near;
  const ghostRing = ring('orbitGhostRing', MOON_ORBIT * 1.35, [0.55, 0.45, 0.45]);
  ghostRing.parent = near;

  // --- Round the Sun ----------------------------------------------------------------
  const helio = new TransformNode('orbitHelio', scene);
  const sunMat = new ShaderMaterial('orbitSunMat', scene, { vertex: 'orbitBody', fragment: 'orbitSun' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'eye', 'spin', 'fade'] });
  const sun = CreateSphere('orbitSun', { diameter: SUN_R * 2, segments: 64 }, scene);
  sun.material = sunMat;
  sun.parent = helio;
  const sunGlow = CreatePlane('orbitSunGlow', { size: SUN_R * 4.5 }, scene);
  sunGlow.material = glowMat('orbitSunGlowMat', [1, 0.75, 0.4]);
  sunGlow.billboardMode = Mesh.BILLBOARDMODE_ALL;
  sunGlow.parent = helio;
  const planets = PLANETS.map(([id, src, au, size]) => {
    const tilt = new TransformNode(`orbit-${id}-tilt`, scene);
    tilt.parent = helio;
    if (id === 'earth') tilt.rotation.z = -TILT;
    const mesh = CreateSphere(`orbit-${id}`, { diameter: size * 2, segments: 40 }, scene);
    mesh.material = bodyMat(`orbit-${id}-mat`, src, id === 'uranus' ? [0.62, 0.85, 0.9] : [0.5, 0.5, 0.5]);
    mesh.parent = tilt;
    if (id === 'earth') { mesh.material.setTexture('nightMap', nightLights); mesh.material.setFloat('hasNight', 1); }
    // Their shade not black, so a planet between the Sun and the eye still shows; the small
    // dark ones brighter (the user, 2026-11-24: "수성도 완전 검은색인데, 화성도").
    mesh.material.setFloat('night', id === 'mercury' || id === 'mars' ? 0.45 : id === 'earth' ? 0.3 : 0.35);
    mesh.material.setFloat('gain', id === 'mercury' ? 2.6 : id === 'mars' ? 2.0 : id === 'earth' ? 1.6 : 1.5);
    const line = ring(`orbit-${id}-ring`, orbitOf(au), id === 'earth' ? [0.45, 0.7, 1] : [0.45, 0.45, 0.55]);
    line.parent = helio;
    let axis = null;
    if (id === 'earth') {
      axis = CreateLineSystem('orbitYearAxis', { lines: [[new Vector3(0, -size * 2.2, 0), new Vector3(0, size * 2.2, 0)]] }, scene);
      axis.color = new Color3(0.6, 0.85, 1);
      axis.parent = tilt;
    }
    return { id, au, size, tilt, mesh, line, axis };
  });
  // Where a planet stands round the Sun (in the Sun's frame) at the course's second t.
  const localAt = (p, t) => {
    const ang = (2 * Math.PI * (t - ORBITS.year[0])) / lapOf(p.au) + p.au * 2.1;
    const r = orbitOf(p.au);
    return new Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r);
  };
  const WAY = new Vector3(Math.sin(Math.PI / 6), Math.cos(Math.PI / 6), 0);
  // Drawn so that the Earth's helix shows: 30 a year; truly the Sun goes 48 times the
  // Earth's distance from it in a year, 864 here (said in a caption).
  const HELIX_PACE = 30 / YEAR;
  const trails = [null, ...planets.filter((p) => ['mercury', 'venus', 'earth', 'mars', 'jupiter'].includes(p.id))].map((p) => {
    const name = `orbitTrail-${p ? p.id : 'sun'}`;
    // (Made with as many points as it is redrawn with: an update keeps the count.)
    const line = CreateLineSystem(name, { lines: [Array.from({ length: 241 }, () => Vector3.Zero())], updatable: true }, scene);
    line.color = p ? (p.id === 'earth' ? new Color3(0.45, 0.75, 1) : new Color3(0.6, 0.65, 0.85)) : new Color3(1, 0.8, 0.45);
    line.setEnabled(false);
    return { p, name, line };
  });
  const yearMoon = CreateSphere('orbitYearMoon', { diameter: 0.3, segments: 24 }, scene);
  yearMoon.material = bodyMat('orbitYearMoonMat', 'assets/planets/moon.webp');
  yearMoon.parent = helio;
  const saturnRing = (() => {
    const s = planets.find((p) => p.id === 'saturn');
    const r = ring('orbitSaturnRing', s.size * 2.1, [0.85, 0.78, 0.6]);
    const r2 = ring('orbitSaturnRing2', s.size * 1.7, [0.7, 0.64, 0.5]);
    for (const x of [r, r2]) { x.parent = s.tilt; x.rotation.x = 0.47; }
    return [r, r2];
  })();

  // --- The galaxy -------------------------------------------------------------------
  // 60,000 stars in a barred spiral 1,000 across, its middle GAL_AT; the Sun 2/3 of the way out.
  const GAL_R = 500;
  const GAL_AT = new Vector3(-330, 0, 0);
  const galaxy = new Mesh('orbitGalaxy', scene);
  {
    const N = 60000;
    let sd = 11;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const pos = new Float32Array(N * 3), seeds = new Float32Array(N * 4), ind = new Uint32Array(N);
    for (let i = 0; i < N; i++) {
      const r = GAL_R * (0.04 + 0.96 * Math.pow(rnd(), 0.85));
      const arm = rnd() < 0.5 ? 0 : Math.PI;
      const bar = r < 70;
      const off = (rnd() - 0.5) * (0.35 + 0.35 * rnd());
      const ang = bar ? arm + (rnd() - 0.5) * 0.5 : arm + Math.log(r / 60) * 1.7 + off;
      const spread = rnd() < 0.35 ? (rnd() - 0.5) * 2 * Math.PI : 0;
      const a = ang + spread;
      const rr = bar ? r * (0.3 + rnd()) : r;
      pos.set([Math.cos(a) * rr, (rnd() - 0.5) * (bar ? 30 : 12) * Math.exp(-r / 400), Math.sin(a) * rr], i * 3);
      const dusty = !bar && spread === 0 && Math.abs(off + 0.2) < 0.06;
      seeds.set([spread === 0 && !bar ? 0.7 * rnd() + 0.3 : 0.2 * rnd(), rnd() * (dusty ? 0.1 : 1), 0, 0], i * 4);
      ind[i] = i;
    }
    const vd = new VertexData();
    vd.positions = pos;
    vd.indices = ind;
    vd.applyToMesh(galaxy);
    galaxy.setVerticesData('seed', seeds, false, 4);
  }
  const galMat = new ShaderMaterial('orbitGalMat', scene, { vertex: 'orbitStars', fragment: 'orbitStars' }, { attributes: ['position', 'seed'], uniforms: ['viewProjection', 'turn', 'centre', 'pixel', 'eye', 'fade', 'bright', 'maxSize'], needAlphaBlending: true });
  galMat.setVector3('centre', GAL_AT);
  galMat.setFloat('bright', 0.3);
  galMat.setFloat('maxSize', 3);
  galMat.pointsCloud = true;
  galMat.alphaMode = 1;
  galMat.disableDepthWrite = true;
  galaxy.material = galMat;
  galaxy.position.copyFrom(GAL_AT);
  galaxy.alwaysSelectAsActiveMesh = true;
  const galCore = CreatePlane('orbitGalCore', { size: 420 }, scene);
  galCore.material = glowMat('orbitGalCoreMat', [1, 0.85, 0.6]);
  galCore.billboardMode = Mesh.BILLBOARDMODE_ALL;
  galCore.position.copyFrom(GAL_AT);
  const disc = CreatePlane('orbitGalDisc', { size: 1100 }, scene);
  disc.rotation.x = Math.PI / 2;
  disc.position.copyFrom(GAL_AT);
  const discMat = new ShaderMaterial('orbitDiscMat', scene, { vertex: 'orbitDisc', fragment: 'orbitDisc' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'fade'], needAlphaBlending: true });
  discMat.alphaMode = 1;
  discMat.disableDepthWrite = true;
  discMat.backFaceCulling = false;
  disc.material = discMat;
  disc.setEnabled(false);
  // Pink clouds where stars are being born, strung along the arms.
  const nebulae = [];
  {
    const nebMat = glowMat('orbitNebMat', [1, 0.38, 0.62]);
    const neb0 = CreatePlane('orbitNeb', { size: 1 }, scene);
    neb0.material = nebMat;
    neb0.billboardMode = Mesh.BILLBOARDMODE_ALL;
    let sd = 5;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const r = 120 + 360 * rnd();
      const a = (rnd() < 0.5 ? 0 : Math.PI) + Math.log(r / 60) * 1.7 + (rnd() - 0.5) * 0.14;
      const m = i ? neb0.clone(`orbitNeb${i}`) : neb0;
      m.position.set(GAL_AT.x + Math.cos(a) * r, (rnd() - 0.5) * 3, Math.sin(a) * r);
      m.scaling.setAll(8 + 18 * rnd());
      nebulae.push(m);
    }
  }
  // The Sun's lap round the middle: u (0 to 1) at the course's second T. Slow while the
  // eye rides close behind it among the stars near it, then fast as the eye draws back.
  const SUN_GAL_R = Math.abs(GAL_AT.x);
  const galSunAt = (u) => {
    // (Clockwise from above, the way its trailing arms turn.)
    const a = -2 * Math.PI * u;
    return new Vector3(GAL_AT.x + SUN_GAL_R * Math.cos(a), 0, SUN_GAL_R * Math.sin(a));
  };
  const lapU = (() => {
    const [g0, g1] = ORBITS.galaxy;
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const v = (t) => 0.0016 * sm(g0 + 1, g0 + 4, t) + 0.045 * sm(g0 + 16, g0 + 34, t) * (1 - sm(g1 - 14, g1 - 5, t));
    const table = [0];
    for (let t = g0; t < g1; t += 0.1) table.push(table[table.length - 1] + v(t + 0.05) * 0.1);
    const all = table[table.length - 1];
    return (T) => {
      const k = Math.min(table.length - 1, Math.max(0, (T - g0) / 0.1));
      const i = Math.floor(k);
      const f = k - i;
      return (table[i] + (table[Math.min(i + 1, table.length - 1)] - table[i]) * f) / all;
    };
  })();
  // The stars near the Sun at the start, which it passes among.
  const nearStars = new Mesh('orbitNearStars', scene);
  {
    const N = 1600;
    let sd = 23;
    const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const pos = new Float32Array(N * 3), seeds = new Float32Array(N * 4), ind = new Uint32Array(N);
    for (let i = 0; i < N; i++) {
      let o;
      do o = new Vector3(rnd() - 0.5, (rnd() - 0.5) * 0.5, rnd() - 0.5).scale(80);
      while (o.length() > 40 || Math.hypot(o.x, o.y) < 5);
      const b = galSunAt(-0.01 + 0.07 * rnd()).add(o);
      pos.set([b.x, b.y, b.z], i * 3);
      seeds.set([rnd() * 0.8 + 0.1, 0.4 + 0.6 * rnd(), 0, 0], i * 4);
      ind[i] = i;
    }
    const vd = new VertexData();
    vd.positions = pos;
    vd.indices = ind;
    vd.applyToMesh(nearStars);
    nearStars.setVerticesData('seed', seeds, false, 4);
  }
  const nearMat = new ShaderMaterial('orbitNearMat', scene, { vertex: 'orbitStars', fragment: 'orbitStars' }, { attributes: ['position', 'seed'], uniforms: ['viewProjection', 'turn', 'centre', 'pixel', 'eye', 'fade', 'bright', 'maxSize'], needAlphaBlending: true });
  nearMat.setVector3('centre', Vector3.Zero());
  nearMat.setFloat('turn', 0);
  nearMat.setFloat('bright', 1);
  nearMat.setFloat('maxSize', 3);
  nearMat.pointsCloud = true;
  nearMat.alphaMode = 1;
  nearMat.disableDepthWrite = true;
  nearStars.material = nearMat;
  nearStars.alwaysSelectAsActiveMesh = true;
  nearStars.setEnabled(false);
  // Where the Sun was when things happened on the Earth: a lap takes 230 million years.
  const LAP_MY = 230;
  const marks = [{ my: 230, key: 'firstDino' }, { my: 66, key: 'dinoGone' }].map((m) => {
    const dot = CreatePlane(`orbitMark-${m.key}`, { size: 1 }, scene);
    dot.material = glowMat(`orbitMarkMat-${m.key}`, [1, 0.6, 0.45]);
    dot.billboardMode = Mesh.BILLBOARDMODE_ALL;
    dot.position.copyFrom(galSunAt(1 - m.my / LAP_MY));
    dot.setEnabled(false);
    return { ...m, u: 1 - m.my / LAP_MY, dot };
  });
  // Where the Sun is in it: a marker that stays a few pixels across.
  const sunMark = CreatePlane('orbitSunMark', { size: 1 }, scene);
  sunMark.material = glowMat('orbitSunMarkMat', [1, 0.9, 0.5]);
  sunMark.billboardMode = Mesh.BILLBOARDMODE_ALL;
  sunMark.parent = helio;
  // The Sun's way round the galaxy's middle, and a brighter stretch behind it showing which
  // way it goes (the user, 2026-11-24: "태양계의 공전도 공전 동그라미 그려").
  const galRing = ring('orbitGalRing', Math.abs(GAL_AT.x), [1, 0.85, 0.55]);
  galRing.position.copyFrom(GAL_AT);
  galRing.setEnabled(false);
  // The way just gone, drawn bright: a fifth of a lap behind the Sun (less at the start).
  const galTrailAt = (u) => {
    const pts = [];
    const from = Math.max(0, u - 0.22);
    for (let i = 0; i <= 60; i++) pts.push(galSunAt(from + ((u - from) * i) / 60));
    return pts;
  };
  let galTrail = CreateLineSystem('orbitGalTrail', { lines: [galTrailAt(0.2)], updatable: true }, scene);
  galTrail.color = new Color3(1, 0.95, 0.75);
  galTrail.setEnabled(false);

  // Names on the screen, over what they name.
  const names = document.createElement('div');
  names.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;font:600 13px system-ui,sans-serif;color:#e8ecf4;text-shadow:0 1px 4px #000';
  canvas.after(names);
  const label = (text) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;transform:translate(-50%,-150%);white-space:nowrap;opacity:0;transition:opacity 0.6s';
    names.append(el);
    return el;
  };

  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const vlerp = (a, b, k) => Vector3.Lerp(a, b, k);
  const inPart = (part, T) => T >= part[0] && T < part[1];

  // Where the Moon is round the Earth (anticlockwise from above), and its own turn.
  // (Slower while its shape is watched: a month in 40 s there.)
  const moonAngle = (T) => {
    const a = ORBITS.phases[0] - ORBITS.moon[0], b = ORBITS.phases[1] - ORBITS.moon[0];
    const turns = Math.min(T, a) / MOON_LAP + Math.max(0, Math.min(T, b) - a) / 40 + Math.max(0, T - b) / MOON_LAP;
    return 2 * Math.PI * turns;
  };
  const toScreen = (p) => {
    const w = engine.getRenderWidth(), h = engine.getRenderHeight();
    const v = Vector3.Project(p, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(w, h));
    const dpr = w / Math.max(1, canvas.clientWidth);
    return { x: v.x / dpr, y: v.y / dpr, front: v.z > 0 && v.z < 1 };
  };
  const tags = [];
  const clock = document.createElement('div');
  clock.style.cssText = 'position:absolute;left:0;right:0;top:12%;text-align:center;font:700 clamp(18px,5vw,24px) system-ui,sans-serif;letter-spacing:0.04em;opacity:0;transition:opacity 0.8s';
  names.append(clock);
  const tag = (text, at, shown) => tags.push({ el: label(text), at, shown });

  function update(T, words) {
    if (words && !tags.length) {
      tag(words.sun, () => helio.position, (t) => inPart([ORBITS.year[0], ORBITS.planets[1]], t));
      tag(words.earth, () => near.position, (t) => inPart([ORBITS.moon[0], ORBITS.lock[1]], t));
      tag(words.moon, () => moon.getAbsolutePosition(), (t) => inPart([ORBITS.moon[0] + 4, ORBITS.lock[1]], t));
      tag(words.ghost, () => ghost.getAbsolutePosition(), (t) => inPart([ORBITS.lock[0] + 14, ORBITS.lock[1]], t));
      for (const p of planets) tag(words[p.id], () => p.mesh.getAbsolutePosition(), (t) => inPart([ORBITS.planets[0] + 4, ORBITS.planets[1] + 6], t) || (p.id === 'earth' && inPart(ORBITS.year, t)));
      tag(words.here, () => helio.position, (t) => t >= ORBITS.galaxy[0] + 10);
      for (const m of marks) tag(words[m.key], () => m.dot.position, (t) => (m.u === 0 ? t >= ORBITS.galaxy[0] + 40 : lapU(t) >= m.u) && t < ORBITS.end - 8);
      tag(words.sun, () => helio.position, (t) => inPart([ORBITS.helix[0] + 4, ORBITS.helix[1]], t));
    }
    const nearOn = T < ORBITS.year[0];
    const nearFade = 1 - smooth(ORBITS.phases[1] - 3, ORBITS.phases[1], T);
    const helioIn = smooth(ORBITS.year[0], ORBITS.year[0] + 3, T);
    near.setEnabled(nearOn);
    helio.setEnabled(!nearOn);

    // The Earth turning once in 6 s (a day), anticlockwise from above.
    earth.rotation.y = -(2 * Math.PI * T) / 6;
    // While the Moon's shape is not watched, the Sun stands behind the eye's shoulder, so the
    // Earth's day side faces the eye wherever the camera goes; while it is, the Sun stays put.
    const shapeSun = smooth(ORBITS.phases[0] - 4, ORBITS.phases[0], T);
    const fromEye = camera.position.subtract(near.position).normalize();
    const eyeSun = Vector3.TransformNormal(fromEye, Matrix.RotationY(0.7)).add(new Vector3(0, 0.25, 0)).normalize();
    const nearSun = Vector3.Lerp(eyeSun, LOCAL_SUN, shapeSun).normalize();
    for (const m of [earthMat, moonMat, ghostMat]) {
      m.setVector3('sunAt', nearSun);
      m.setFloat('sunPoint', 0);
      m.setFloat('fade', nearFade);
    }
    // The Moon: in sight from the second part; its spot shown from the third.
    const showMoon = T >= ORBITS.moon[0] - 2;
    moon.setEnabled(showMoon);
    moonRing.setEnabled(showMoon);
    moonRing.setEnabled(showMoon && !inPart([ORBITS.phases[0] + 3, ORBITS.phases[1]], T));
    moonRing.alpha = 0.6 * smooth(ORBITS.moon[0], ORBITS.moon[0] + 4, T) * nearFade;
    const ma = moonAngle(T - ORBITS.moon[0]);
    moon.position.set(Math.cos(ma) * MOON_ORBIT, 0, Math.sin(ma) * MOON_ORBIT);
    // It turns once a month: one face (u = 0.5 under Babylon's sphere map) to the Earth.
    moon.rotation.y = -ma + Math.PI / 2;
    const face = moon.position.scale(-1).normalize();
    const markOn = smooth(ORBITS.lock[0], ORBITS.lock[0] + 3, T) * (1 - smooth(ORBITS.phases[0] + 6, ORBITS.phases[0] + 9, T));
    moonMat.setFloat('mark', markOn);
    // Brighter, its shade not black, while its round is watched from far (the user,
    // 2026-11-24: "달도 너무 어둡다"); dark-shaded while its shape is watched.
    const shapeOn = smooth(ORBITS.phases[0], ORBITS.phases[0] + 3, T) * (1 - smooth(ORBITS.phases[1] - 3, ORBITS.phases[1], T));
    for (const m of [moonMat, ghostMat]) { m.setFloat('night', lerp(0.2, 0.02, shapeOn)); m.setFloat('gain', lerp(1.7, 1.3, shapeOn)); }
    // (Large while seen from far over both rounds, small up close.)
    const markR = lerp(0.24, 0.09, smooth(ORBITS.phases[0], ORBITS.phases[0] + 3, T));
    moonMat.setFloat('markR', markR);
    ghostMat.setFloat('markR', markR);
    moonMat.setVector3('markAt', moon.position.add(face.scale(MOON_R * 1.8)).add(near.position));
    const ghostOn = smooth(ORBITS.lock[0] + 12, ORBITS.lock[0] + 15, T) * (1 - smooth(ORBITS.lock[1] - 2, ORBITS.lock[1], T));
    ghost.setEnabled(ghostOn > 0.001);
    ghostRing.setEnabled(ghostOn > 0.001);
    ghostRing.alpha = 0.5 * ghostOn;
    ghost.position.set(Math.cos(ma) * MOON_ORBIT * 1.35, 0, Math.sin(ma) * MOON_ORBIT * 1.35);
    ghostMat.setFloat('mark', ghostOn);
    // Its spot keeps pointing the one way (toward where the Earth was at the start).
    ghostMat.setVector3('markAt', ghost.position.add(new Vector3(-1, 0, 0).scale(MOON_R * 1.8)));
    ghostMat.setFloat('fade', nearFade * ghostOn);

    // Round the Sun.
    const ySince = T - ORBITS.year[0];
    for (const p of planets) {
      p.tilt.position.copyFrom(localAt(p, T));
      p.mesh.rotation.y = -ySince * 1.5;
      p.mesh.material.setVector3('sunAt', helio.position);
      p.mesh.material.setFloat('sunPoint', 1);
      const others = p.id === 'earth' ? 1 : smooth(ORBITS.planets[0], ORBITS.planets[0] + 4, T);
      const away = 1 - smooth(ORBITS.galaxy[0] - 1, ORBITS.galaxy[0] + 3, T);
      // (No rings while they go on with the Sun: their trails show the way they go.)
      const ringOff = smooth(ORBITS.helix[0], ORBITS.helix[0] + 4, T);
      p.mesh.material.setFloat('fade', helioIn * others * away);
      p.line.alpha = 0.55 * others * away * helioIn * (1 - ringOff);
      p.line.setEnabled(others * away * (1 - ringOff) > 0.001);
      p.mesh.setEnabled(others * away > 0.001);
      if (p.axis) p.axis.setEnabled(others * away > 0.001);
      // The Earth drawn larger while it is the one watched (the year), smaller among the rest.
      if (p.id === 'earth') { const big = lerp(5, 1, smooth(ORBITS.planets[0], ORBITS.planets[0] + 6, T)); p.mesh.scaling.setAll(big); p.axis.scaling.setAll(big); }
    }
    for (const r of saturnRing) r.setEnabled(T >= ORBITS.planets[0] + 2 && T < ORBITS.galaxy[0]);
    const pe = planets.find((p) => p.id === 'earth');
    const yma = (2 * Math.PI * ySince) / 3;
    yearMoon.position.copyFrom(pe.tilt.position.add(new Vector3(Math.cos(yma) * 2.2, 0, Math.sin(yma) * 2.2)));
    yearMoon.material.setVector3('sunAt', helio.position);
    yearMoon.material.setFloat('sunPoint', 1);
    yearMoon.setEnabled(T < ORBITS.planets[0] + 6);
    // The Sun turning: once in 25 days, drawn once in 25 s in the last part.
    sunMat.setFloat('spin', T >= ORBITS.sun[0] ? (T - ORBITS.sun[0]) / 25 : 0);
    sunMat.setFloat('fade', helioIn);
    sunMat.setVector3('eye', camera.position);
    sunGlow.material.setFloat('power', helioIn * (1 - 0.6 * smooth(ORBITS.galaxy[0] + 20, ORBITS.galaxy[0] + 30, T)));

    // The galaxy: the Sun (and all that goes with it) going round its middle, which
    // takes 230 million years; drawn as a quarter turn over the last part.
    const gOn = smooth(ORBITS.galaxy[0], ORBITS.galaxy[0] + 4, T);
    galaxy.setEnabled(gOn > 0.001);
    disc.setEnabled(gOn > 0.001);
    discMat.setFloat('fade', gOn * (0.25 + 0.75 * smooth(ORBITS.galaxy[0] + 22, ORBITS.galaxy[0] + 40, T)));
    for (const n of nebulae) n.setEnabled(gOn > 0.001);
    nebulae[0].material.setFloat('power', gOn * 0.5);
    const nearOnG = gOn * (1 - smooth(ORBITS.galaxy[0] + 24, ORBITS.galaxy[0] + 34, T));
    nearStars.setEnabled(nearOnG > 0.001);
    nearMat.setFloat('fade', nearOnG);
    nearMat.setFloat('pixel', engine.getRenderHeight() / camera.fov);
    nearMat.setVector3('eye', camera.position);
    const uNow = lapU(T);
    for (const m of marks) {
      const shown = gOn > 0.001 && (m.u === 0 ? T >= ORBITS.galaxy[0] + 40 : uNow >= m.u);
      m.dot.setEnabled(shown);
      m.dot.scaling.setAll(Math.max(1, camera.position.subtract(m.dot.position).length() * 0.012));
      m.dot.material.setFloat('power', 1.2);
    }
    if (words) {
      const on = gOn > 0.001 && T >= ORBITS.galaxy[0] + 4 && T < ORBITS.end - 0.5;
      clock.style.opacity = on ? '1' : '0';
      if (on) clock.textContent = words.ago(Math.round(LAP_MY * (1 - uNow)));
    }
    galCore.setEnabled(gOn > 0.001);
    galMat.setFloat('fade', gOn);
    galCore.material.setFloat('power', gOn * 0.45 * smooth(ORBITS.galaxy[0] + 20, ORBITS.galaxy[0] + 40, T));
    galMat.setFloat('turn', 0);
    galMat.setFloat('pixel', engine.getRenderHeight() / camera.fov);
    galMat.setVector3('eye', camera.position);
    helio.position.copyFrom(galSunAt(uNow));
    const wayOn = smooth(ORBITS.galaxy[0] + 26, ORBITS.galaxy[0] + 36, T);
    galRing.setEnabled(wayOn > 0.001);
    galRing.alpha = wayOn;
    galRing.color.set(0.35 * wayOn, 0.3 * wayOn, 0.2 * wayOn);
    galTrail.setEnabled(wayOn > 0.001);
    if (wayOn > 0.001) {
      galTrail = CreateLineSystem('orbitGalTrail', { lines: [galTrailAt(uNow)], instance: galTrail }, scene);
      galTrail.alpha = 0.9 * wayOn;
    }
    // Going on with the Sun: it moves along WAY, the planets round it, so each draws a helix
    // behind it (the user, 2026-11-24, of a picture of such helices: "태양이 우리를 데리고,
    // 은하를 공전하는 것도 그려"). WAY stands 60 degrees from the planets' plane (30 from
    // its pole), as the Sun's way round the galaxy does from the plane the planets go round in.
    const hOn = inPart(ORBITS.helix, T);
    if (hOn) helio.position.copyFrom(WAY.scale(HELIX_PACE * (T - ORBITS.helix[0])));
    for (const tr of trails) {
      const show = hOn && T > ORBITS.helix[0] + 1;
      tr.line.setEnabled(show);
      if (!show) continue;
      const from = Math.max(ORBITS.helix[0], T - 36);
      const pts = [];
      for (let i = 0; i <= 240; i++) {
        const t = from + ((T - from) * i) / 240;
        pts.push(WAY.scale(HELIX_PACE * (t - ORBITS.helix[0])).add(tr.p ? localAt(tr.p, t) : Vector3.Zero()));
      }
      tr.line = CreateLineSystem(tr.name, { lines: [pts], instance: tr.line }, scene);
      tr.line.alpha = Math.min(1, (T - ORBITS.helix[0] - 1) / 3) * (1 - smooth(ORBITS.helix[1] - 3, ORBITS.helix[1], T));
    }
    sunMark.setEnabled(gOn > 0.001);
    sunMark.material.setFloat('power', gOn * 1.4);
    sunMark.scaling.setAll(Math.max(1, camera.position.subtract(helio.position).length() * 0.02));

    // Where the eye is.
    const eye = cameraAt(T);
    camera.position.copyFrom(eye.at);
    camera.setTarget(eye.look);
    camera.fov = eye.fov;
    skyMat.setFloat('pix', camera.fov / Math.max(1, engine.getRenderHeight()));
    skyMat.setFloat('fade', 1);
    scene.render();

    for (const t of tags) {
      const on = t.shown(T);
      if (on) {
        const s = toScreen(t.at());
        t.el.style.left = `${s.x}px`;
        t.el.style.top = `${s.y}px`;
        t.el.style.opacity = s.front ? '1' : '0';
      } else t.el.style.opacity = '0';
    }
  }

  // The eye's way: close by the turning Earth; up over the Earth and the Moon's round;
  // out over both rounds (the true Moon and the one that does not turn); at the Earth,
  // looking at the Moon as it goes round (its shape); then over the Sun and the Earth's
  // year, out over all the planets, in to the Sun, and far out over the galaxy.
  function cameraAt(T) {
    const at = (x, y, z) => new Vector3(x, y, z);
    const helioAt = (x, y, z) => helio.position.add(new Vector3(x, y, z));
    const moonNow = moon.position.add(near.position);
    const keys = [
      { t: 0, at: at(-2.6, 1.2, -3.2), look: at(0, 0.1, 0), fov: 0.75 },
      { t: ORBITS.spin[1] - 6, at: at(-2.2, 2.6, -3.2), look: at(0, 0, 0), fov: 0.75 },
      { t: ORBITS.moon[0] + 8, at: at(1, 12, -11), look: at(0, 0, 0), fov: 0.8 },
      { t: ORBITS.lock[0] + 8, at: at(0, 26, -4), look: at(0, 0, 0.5), fov: 0.9 },
      { t: ORBITS.lock[1] - 2, at: at(0, 26, -4), look: at(0, 0, 0.5), fov: 0.9 },
      // From just off the Earth toward the Moon, looking at it.
      { t: ORBITS.phases[0] + 4, at: moonNow.scale(0.25).add(at(0, 1.3, 0)), look: moonNow, fov: 0.5 },
      { t: ORBITS.phases[1], at: moonNow.scale(0.25).add(at(0, 1.3, 0)), look: moonNow, fov: 0.5 },
      // The year: over the Sun and the Earth's round, a little to its side.
      { t: ORBITS.year[0] + 1, at: helioAt(0, 58, -46), look: helioAt(0, 0, 0), fov: 0.8 },
      { t: ORBITS.year[1], at: helioAt(0, 56, -44), look: helioAt(0, 0, 0), fov: 0.8 },
      { t: ORBITS.planets[0] + 12, at: helioAt(10, 95, -120), look: helioAt(0, 0, 0), fov: 0.8 },
      { t: ORBITS.planets[1], at: helioAt(10, 80, -110), look: helioAt(0, 0, 0), fov: 0.8 },
      // In to the Sun turning.
      { t: ORBITS.sun[1] - 2, at: helioAt(1.5, 3, -11), look: helioAt(0, 0, 0), fov: 0.7 },
      // Beside the Sun's way, its trail and the planets' helices running down behind it.
      { t: ORBITS.helix[0] + 8, at: helioAt(10, -30, -95), look: helioAt(0, -30, 0), fov: 0.8 },
      { t: ORBITS.helix[1], at: helioAt(10, -30, -95), look: helioAt(0, -30, 0), fov: 0.8 },
      // Close behind the Sun on its way, the stars near it going by; the galaxy a band of light.
      { t: ORBITS.galaxy[0] + 0.1, at: helioAt(7, 5, 36), look: helioAt(-1, 0, -30), fov: 0.85 },
      { t: ORBITS.galaxy[0] + 18, at: helioAt(5, 5, 30), look: helioAt(-1, 0, -30), fov: 0.85 },
      // Drawing back and up as it speeds on, the arms coming into sight...
      { t: ORBITS.galaxy[0] + 32, at: helioAt(60, 90, 130), look: helioAt(0, 0, -20), fov: 0.85 },
      // ...to the whole galaxy, its lap drawn.
      { t: ORBITS.galaxy[0] + 46, at: GAL_AT.add(at(260, 1500, 950)), look: GAL_AT.add(at(40, 0, 0)), fov: 0.8 },
      { t: ORBITS.end, at: GAL_AT.add(at(-120, 1950, 700)), look: GAL_AT, fov: 0.8 },
    ];
    let i = 0;
    while (i < keys.length - 2 && T > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1];
    // Over a cut (near the Earth to round the Sun) the eye jumps behind the fade.
    const k = a.t < ORBITS.year[0] && b.t >= ORBITS.year[0] ? (T >= ORBITS.year[0] ? 1 : 0) : smooth(a.t, b.t, T);
    // (Hold the phases' view on the Moon: it moves while the keys stand.)
    if (T >= ORBITS.phases[0] + 4 && T < ORBITS.phases[1]) return { at: keys[5].at, look: keys[5].look, fov: 0.5 };
    return { at: vlerp(a.at, b.at, k), look: vlerp(a.look, b.look, k), fov: lerp(a.fov, b.fov, k) };
  }

  return {
    update,
    resize: () => engine.resize(),
    dispose: () => { names.remove(); engine.dispose(); },
  };
}
