// Why the Moon's near side has smooth dark seas and its far side is all craters (the user,
// 2026-11-26: "달의 뒷면은 왜 곰보이고, 앞면은 매끈한다에 대해서 우주멍 만들어보자",
// "만들어봐"): a little world of its own on a canvas over the game's, as the Moon's one face
// is. The Moon is drawn with its real map (assets/planets/moon.webp: u = 0.5 + lon / 360,
// v = 0.5 - lat / 180, east to the right as seen from the Earth).
//   near:   the near side as seen from the Earth; the seas lit up in blue.
//   far:    turned round to the far side: hardly any seas.
//   shield: the Earth does not shield the near side: rocks come from every side.
//   seas:   the near side before the seas (old cratered ground in their place: the far side's
//           own map laid over them), then the lava filling the deepest first.
//   crust:  the Moon cut in half: the crust thin on the Earth's side, thick on the far side,
//           the molten rock getting through only where it is thin (drawn thicker than it is).
//   hot, kreep, spa, twin: four ideas for why the crust differs.
//   change6: where Chang'e 6 took the first far-side rock, in 2024.
// y up (north); the near side faces -x, where the Earth is.
import { Engine, Scene, FreeCamera, Vector3, Color3, Color4, CreateSphere, CreatePlane, CreateLineSystem, ShaderMaterial, Effect, Texture, Mesh, Matrix } from './babylon.js';
import './orbitStage.js'; // its shaders: orbitSky

// The course's seconds (core/courses.js keeps its captions to these).
export const SIDES = {
  near: [0, 22],
  far: [22, 44],
  shield: [44, 60],
  seas: [60, 104],
  crust: [104, 134],
  hot: [134, 150],
  kreep: [150, 166],
  spa: [166, 182],
  twin: [182, 198],
  change6: [198, 218],
  end: [218, 232],
};

const rad = (d) => (d * Math.PI) / 180;
// The direction from the Moon's middle to a place on it (lon east, lat north, in degrees).
export function dirOf(lon, lat) {
  const L = rad(lon), p = rad(lat);
  return new Vector3(-Math.cos(L) * Math.cos(p), Math.sin(p), -Math.sin(L) * Math.cos(p));
}
const PROCELLARUM = dirOf(-25, 18); // the heart of the thorium-rich ground (Procellarum KREEP Terrane)
const SPA = dirOf(-169, -53); // South Pole-Aitken basin, some 2,500 km across
const SPA_R = 0.72; // its radius as an angle (1,250 km / 1,737 km)
const CHANGE6 = dirOf(-153.98, -41.63);

Effect.ShadersStore.sidesMoonVertexShader = `
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
Effect.ShadersStore.sidesMoonFragmentShader = `
precision highp float;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
uniform sampler2D map;
uniform vec3 sunDir;
uniform vec3 middle;
uniform float seaHi;
uniform float early;
uniform float flood;
uniform float cutOn;
uniform float warm;
uniform float kreep;
uniform float spa;
uniform float site;
uniform float time;
uniform float fade;
uniform vec3 kreepDir;
uniform vec3 spaDir;
uniform vec3 siteDir;
uniform float spaR;
uniform vec3 capDir;
uniform float cap;
void main() {
  vec3 p = vW - middle;
  if (cutOn > 0.5 && p.z > 0.0) discard;
  vec3 n = normalize(vN);
  vec3 d = normalize(p);
  float lit = max(dot(n, sunDir), 0.0);
  vec3 tex = texture2D(map, vUV).rgb;
  float lum = dot(tex, vec3(0.333));
  // How deep in a sea (0 on the highlands, 1 in the darkest).
  float mare = smoothstep(0.44, 0.27, lum);
  // Before the seas: old cratered highland in their place (the far side's own ground).
  vec3 old = texture2D(map, vUV + vec2(0.5, 0.0)).rgb;
  old = mix(old, vec3(0.64, 0.62, 0.6), 0.25);
  float filled = smoothstep(1.0 - flood - 0.05, 1.0 - flood, mare);
  vec3 base = mix(tex, mix(old, tex, filled), early * smoothstep(0.02, 0.18, mare));
  vec3 col = base * (0.035 + 1.3 * lit);
  // The lava's edge, glowing as it spreads.
  float edge = smoothstep(0.07, 0.0, abs(mare - (1.0 - flood))) * smoothstep(0.03, 0.12, mare) * smoothstep(0.0, 0.03, flood) * (1.0 - smoothstep(0.92, 1.0, flood));
  col += vec3(1.0, 0.38, 0.06) * edge * early * 1.3;
  // The seas lit up.
  col = mix(col, vec3(0.18, 0.45, 1.0) * (0.25 + 0.9 * lit), seaHi * smoothstep(0.1, 0.5, mare) * 0.75);
  // Warmed on the side toward the young Earth.
  float toward = smoothstep(-0.3, 0.9, dot(d, vec3(-1.0, 0.0, 0.0)));
  col = mix(col, col * vec3(1.25, 0.75, 0.5) + vec3(0.5, 0.14, 0.02) * toward, warm * toward);
  col = mix(col, col * vec3(0.85, 0.9, 1.0), warm * (1.0 - toward));
  // Thorium, as the Lunar Prospector mapped it: most under the great western sea.
  float k = smoothstep(0.72, 0.98, dot(d, kreepDir)) * (0.45 + 0.55 * mare);
  vec3 heat = mix(vec3(0.95, 0.8, 0.15), vec3(1.0, 0.22, 0.05), smoothstep(0.3, 0.9, k));
  col = mix(col, heat * (0.35 + 0.8 * lit), kreep * smoothstep(0.0, 0.25, k) * 0.65);
  // Where the second moon spread: a thick layer of bright old ground, its edge glowing at first.
  float c = acos(clamp(dot(d, capDir), -1.0, 1.0));
  float capR = 0.25 + 0.75 * cap;
  col = mix(col, col * 1.25 + vec3(0.05), smoothstep(capR, capR - 0.15, c) * step(0.001, cap));
  col += vec3(1.0, 0.4, 0.08) * smoothstep(0.05, 0.0, abs(c - capR)) * step(0.001, cap) * (1.0 - cap) * 1.2;
  // South Pole-Aitken's rim.
  float a = acos(clamp(dot(d, spaDir), -1.0, 1.0));
  col = mix(col, vec3(1.0, 0.82, 0.35), spa * smoothstep(0.035, 0.0, abs(a - spaR)));
  col *= 1.0 - 0.25 * spa * smoothstep(spaR + 0.02, spaR - 0.1, a);
  // A landing site, with a ring going out from it.
  float s = acos(clamp(dot(d, siteDir), -1.0, 1.0));
  float ph = fract(time * 0.6);
  float ring = smoothstep(0.014, 0.0, abs(s - (0.04 + 0.12 * ph))) * (1.0 - ph);
  col = mix(col, vec3(1.0, 0.45, 0.3), site * max(smoothstep(0.03, 0.018, s), ring));
  gl_FragColor = vec4(col * fade, 1.0);
}`;

// The Moon cut in half: core, mantle and crust, thin on the Earth's side (-x).
Effect.ShadersStore.sidesCutVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vW;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = viewProjection * w;
}`;
Effect.ShadersStore.sidesCutFragmentShader = `
precision highp float;
varying vec3 vW;
uniform float rise;
uniform float fade;
uniform float time;
void main() {
  vec2 q = vW.xy;
  float r = length(q);
  if (r > 1.0) discard;
  vec2 dir = q / max(r, 1e-4);
  float near = dot(dir, vec2(-1.0, 0.0));
  float thick = mix(0.105, 0.04, smoothstep(-0.6, 0.9, near));
  float ang = atan(dir.y, dir.x);
  vec3 core = vec3(0.62, 0.38, 0.24);
  vec3 mantle = mix(vec3(0.33, 0.2, 0.14), vec3(0.42, 0.36, 0.28), smoothstep(0.25, 0.9, r));
  vec3 crust = vec3(0.78, 0.74, 0.66);
  vec3 col = r < 0.21 ? core : (r < 1.0 - thick ? mantle : crust);
  // Lines between the layers.
  col *= 1.0 - 0.45 * smoothstep(0.008, 0.0, abs(r - 0.21)) - 0.45 * smoothstep(0.008, 0.0, abs(r - (1.0 - thick)));
  // Molten rock rising in cracks: through the thin crust on the near side, stopped under
  // the thick one on the far side.
  float hot = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float a0 = 3.14159 + (fi - 4.0) * 0.17 + 0.05 * sin(fi * 7.3);
    float da = abs(mod(ang - a0 + 3.14159, 6.28318) - 3.14159);
    float from = 1.0 - thick - 0.12;
    float top = from + rise * (thick + 0.12 + 0.01);
    hot = max(hot, smoothstep(0.022, 0.006, da * r) * step(from, r) * step(r, top));
  }
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float a0 = (fi - 3.0) * 0.24 + 0.07 * sin(fi * 5.1);
    float da = abs(mod(ang - a0 + 3.14159, 6.28318) - 3.14159);
    float from = 1.0 - thick - 0.12;
    float top = from + min(rise * (thick + 0.12), 0.115);
    hot = max(hot, smoothstep(0.022, 0.006, da * r) * step(from, r) * step(r, top));
  }
  float flick = 0.85 + 0.15 * sin(time * 6.0 + r * 40.0);
  col = mix(col, vec3(1.0, 0.45, 0.08) * flick * 1.4, hot);
  // The seas on top where it came out.
  float sea = step(1.0 - 0.022, r) * smoothstep(0.6, 0.8, near) * smoothstep(0.85, 1.0, rise);
  col = mix(col, vec3(0.16, 0.16, 0.18), sea);
  gl_FragColor = vec4(col * fade, 1.0);
}`;

// The Earth: its day map, or molten and glowing when young.
Effect.ShadersStore.sidesEarthFragmentShader = `
precision highp float;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
uniform sampler2D map;
uniform vec3 sunDir;
uniform vec3 middle;
uniform vec3 eye;
uniform float hot;
uniform float fade;
uniform float time;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 n = normalize(vN);
  float lit = max(dot(n, sunDir), 0.0);
  vec3 col = texture2D(map, vUV).rgb * (0.04 + 1.25 * lit);
  float u = vUV.x * 6.28318, v = vUV.y * 3.14159;
  vec3 q = vec3(cos(u) * sin(v), cos(v), sin(u) * sin(v)) * 3.0;
  float w = fbm(q + vec3(time * 0.04, 0.0, -time * 0.03));
  float crack = smoothstep(0.05, 0.0, abs(fbm(q * 1.7 + 5.0 + w) - 0.5));
  vec3 fire = mix(vec3(0.75, 0.16, 0.03), vec3(1.0, 0.62, 0.18), smoothstep(0.35, 0.7, w));
  fire = mix(fire * (0.25 + 0.2 * w), vec3(1.0, 0.85, 0.45), crack) * mix(1.0, 1.0, lit);
  fire = mix(fire, mix(vec3(0.75, 0.16, 0.03), vec3(1.0, 0.62, 0.18), w), smoothstep(0.55, 0.75, fbm(q * 0.8 - 3.0)));
  float rim = pow(1.0 - max(dot(n, normalize(eye - vW)), 0.0), 2.5);
  col = mix(col, fire + vec3(1.0, 0.4, 0.1) * rim, hot);
  col += vec3(0.3, 0.55, 1.0) * rim * 0.5 * (1.0 - hot) * lit;
  gl_FragColor = vec4(col * fade, 1.0);
}`;

export function createMoonSidesStage(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);
  const camera = new FreeCamera('sidesEye', new Vector3(-5, 0, 0), scene);
  camera.minZ = 0.02;
  camera.maxZ = 20000;
  camera.inputs.clear();
  const base = import.meta.env?.BASE_URL ?? './';

  // The stars (the Solar System's turning's sky, borrowed).
  const skyMat = new ShaderMaterial('sidesSkyMat', scene, { vertex: 'orbitSky', fragment: 'orbitSky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'pix', 'fade'] });
  skyMat.backFaceCulling = false;
  const sky = CreateSphere('sidesSky', { diameter: 15000, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
  sky.material = skyMat;
  sky.infiniteDistance = true;

  const moonTex = new Texture(`${base}assets/planets/moon.webp`, scene, false, false);
  const moonMatOf = (name) => {
    const m = new ShaderMaterial(name, scene, { vertex: 'sidesMoon', fragment: 'sidesMoon' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'sunDir', 'middle', 'seaHi', 'early', 'flood', 'cutOn', 'warm', 'kreep', 'spa', 'site', 'time', 'fade', 'kreepDir', 'spaDir', 'siteDir', 'spaR', 'capDir', 'cap'], samplers: ['map'] });
    m.setTexture('map', moonTex);
    for (const k of ['seaHi', 'early', 'flood', 'cutOn', 'warm', 'kreep', 'spa', 'site', 'time']) m.setFloat(k, 0);
    m.setFloat('fade', 1);
    m.setFloat('spaR', SPA_R);
    m.setVector3('middle', Vector3.Zero());
    m.setVector3('kreepDir', PROCELLARUM);
    m.setVector3('spaDir', SPA);
    m.setVector3('siteDir', CHANGE6);
    m.setVector3('capDir', dirOf(180, 15));
    m.setFloat('cap', 0);
    m.backFaceCulling = false;
    return m;
  };
  // The Moon, radius 1 (mirrored in z so that east is to the right as seen from the Earth).
  const moonMat = moonMatOf('sidesMoonMat');
  const moon = CreateSphere('sidesMoon', { diameter: 2, segments: 96 }, scene);
  moon.material = moonMat;
  moon.scaling.z = -1;
  // The cut face.
  const cutMat = new ShaderMaterial('sidesCutMat', scene, { vertex: 'sidesCut', fragment: 'sidesCut' }, { attributes: ['position'], uniforms: ['world', 'viewProjection', 'rise', 'fade', 'time'] });
  cutMat.backFaceCulling = false;
  const cut = CreatePlane('sidesCut', { size: 2.02 }, scene);
  cut.material = cutMat;
  // A second, smaller moon (one of the ideas), of the same old cratered ground.
  const twinMat = moonMatOf('sidesTwinMat');
  twinMat.setFloat('early', 1);
  twinMat.setFloat('flood', 0);
  const twin = CreateSphere('sidesTwin', { diameter: 0.74, segments: 48 }, scene);
  twin.material = twinMat;
  twin.scaling.z = -1;
  // The Earth.
  const earthMat = new ShaderMaterial('sidesEarthMat', scene, { vertex: 'sidesMoon', fragment: 'sidesEarth' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'sunDir', 'middle', 'eye', 'hot', 'fade', 'time'], samplers: ['map'] });
  earthMat.setTexture('map', new Texture(`${base}assets/earth-day.webp`, scene, false, false));
  earthMat.setFloat('hot', 0);
  const earth = CreateSphere('sidesEarth', { diameter: 2, segments: 64 }, scene);
  earth.material = earthMat;

  // Rocks falling on the Moon from every side.
  const N_ROCKS = 46;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rocks = Array.from({ length: N_ROCKS }, () => {
    const z = 2 * rnd() - 1, a = 2 * Math.PI * rnd(), s = Math.sqrt(1 - z * z);
    const hit = new Vector3(s * Math.cos(a), z, s * Math.sin(a));
    const from = hit.add(new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).scale(0.9)).normalize();
    return { hit, from, phase: rnd(), speed: 0.35 + 0.3 * rnd() };
  });
  const rockLines = CreateLineSystem('sidesRocks', { lines: rocks.map(() => [Vector3.Zero(), Vector3.One()]), updatable: true }, scene);
  rockLines.color = new Color3(1, 0.85, 0.6);

  // (Compiled at once, so nothing that comes on later is missing for its first moments.)
  for (const [mat, mesh] of [[moonMat, moon], [cutMat, cut], [twinMat, twin], [earthMat, earth], [rockLines.material, rockLines]]) mat.forceCompilation(mesh);

  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const inPart = (part, T) => T >= part[0] && T < part[1];

  // Names on the screen, over what they name.
  const names = document.createElement('div');
  names.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;font:600 13px system-ui,sans-serif;color:#e8ecf4;text-shadow:0 1px 4px #000';
  canvas.after(names);
  const tags = [];
  const tag = (text, at, shown) => {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);white-space:nowrap;opacity:0;transition:opacity 0.6s';
    names.append(el);
    tags.push({ el, at, shown });
  };
  const toScreen = (p) => {
    const w = engine.getRenderWidth(), h = engine.getRenderHeight();
    const v = Vector3.Project(p, Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(w, h));
    const dpr = w / Math.max(1, canvas.clientWidth);
    return { x: v.x / dpr, y: v.y / dpr };
  };
  const WORDS = { near: '앞면', far: '뒷면', seas: '바다', highland: '고지대', earth: '지구', earthSide: '지구 쪽', thin: '얇은 겉껍질', thick: '두꺼운 겉껍질', mantle: '맨틀', core: '핵', hotEarth: '갓 생긴 뜨거운 지구', thorium: '토륨이 많은 곳', spa: '남극-에이킨 분지', twin: '작은 둘째 달', change6: '창어 6호 (2024)' };

  let T0 = 0;
  function update(T, words) {
    T0 = T;
    if (!tags.length) {
      const w = { ...WORDS, ...(words ?? {}) };
      tag(w.seas, () => dirOf(30, 10).scale(0.6), (t) => inPart([10, 22], t));
      tag(w.highland, () => dirOf(-8, -45).scale(1.0), (t) => inPart([12, 22], t));
      tag(w.far, () => new Vector3(1.2, 1.25, 0), (t) => inPart([32, 44], t));
      tag(w.earth, () => new Vector3(-10, 1.7, 0), (t) => inPart(SIDES.shield, t));
      tag(`${w.earthSide} →`, () => new Vector3(-0.7, 1.3, 0), (t) => inPart(SIDES.crust, t));
      tag(w.thin, () => new Vector3(-0.72, -0.48, 0.02), (t) => inPart([108, 134], t));
      tag(w.thick, () => new Vector3(0.7, -0.48, 0.02), (t) => inPart([108, 134], t));
      tag(w.mantle, () => new Vector3(0.0, 0.5, 0.02), (t) => inPart([106, 116], t));
      tag(w.core, () => new Vector3(0.0, 0.0, 0.02), (t) => inPart([106, 116], t));
      tag(w.hotEarth, () => new Vector3(-6.55, 0, 0), (t) => inPart([136, 150], t));
      tag(w.thorium, () => PROCELLARUM.scale(1.05).add(new Vector3(0, 0.15, 0)), (t) => inPart([154, 166], t) || inPart([177, 182], t));
      tag(w.spa, () => SPA.scale(1.0).add(new Vector3(0, 0.5, 0)), (t) => inPart([168, 176], t));
      tag(w.twin, () => twin.position.add(new Vector3(0, 0.55, 0)), (t) => inPart([184, 191], t));
      tag(w.change6, () => CHANGE6.scale(1.02).add(new Vector3(0, 0.22, 0)), (t) => inPart([202, 218], t));
    }
    // Dips to black between the parts.
    let fade = 1 - smooth(SIDES.end[1] - 1.5, SIDES.end[1], T);
    for (const d of [SIDES.shield[0], SIDES.seas[0], SIDES.crust[0], SIDES.hot[0], SIDES.kreep[0], SIDES.spa[0], SIDES.twin[0], SIDES.change6[0]]) fade *= 1 - smooth(d - 1, d, T) * (1 - smooth(d, d + 1.2, T));
    fade *= smooth(-1, 0.5, T);

    // What is drawn on the Moon.
    const seaHi = smooth(9, 12, T) * (1 - smooth(SIDES.far[1] - 2, SIDES.far[1], T));
    const inSeas = inPart(SIDES.seas, T);
    const cutOn = inPart(SIDES.crust, T);
    moonMat.setFloat('seaHi', seaHi);
    moonMat.setFloat('early', inSeas ? 1 : 0);
    moonMat.setFloat('flood', smooth(70, 96, T));
    moonMat.setFloat('cutOn', cutOn ? 1 : 0);
    moonMat.setFloat('warm', smooth(SIDES.hot[0] + 4, SIDES.hot[0] + 8, T) * (T < SIDES.hot[1] ? 1 : 0));
    moonMat.setFloat('kreep', inPart(SIDES.kreep, T) ? smooth(SIDES.kreep[0] + 3, SIDES.kreep[0] + 6, T) : inPart(SIDES.spa, T) ? smooth(176, 179, T) : 0);
    moonMat.setFloat('spa', inPart(SIDES.spa, T) ? smooth(167, 169, T) : inPart(SIDES.change6, T) ? 0.45 : 0);
    moonMat.setFloat('site', inPart(SIDES.change6, T) ? smooth(200, 202, T) : 0);
    moonMat.setFloat('time', T);
    cut.setEnabled(cutOn);
    cutMat.setFloat('rise', smooth(116, 128, T));
    cutMat.setFloat('time', T);

    // The Earth: far off while the rocks fall; close and molten for the first idea.
    const earthOn = inPart(SIDES.shield, T) || inPart(SIDES.hot, T);
    earth.setEnabled(earthOn);
    if (inPart(SIDES.shield, T)) { earth.position.set(-10, 0, 0); earth.scaling.setAll(1.1); earthMat.setFloat('hot', 0); }
    else { earth.position.set(-4.6, 0, 0); earth.scaling.setAll(1.6); earthMat.setFloat('hot', 1); }
    earth.rotation.y = -T * 0.3;
    earthMat.setFloat('time', T);

    // The rocks.
    const rocksOn = inPart(SIDES.shield, T);
    rockLines.setEnabled(rocksOn);
    if (rocksOn) {
      const lines = rocks.map((r) => {
        const p = (T * r.speed + r.phase) % 1;
        const head = r.hit.add(r.from.scale((1 - p) * 9));
        return [head, head.add(r.from.scale(0.9))];
      });
      CreateLineSystem('sidesRocks', { lines, instance: rockLines }, scene);
      rockLines.color = new Color3(1, 0.85, 0.6).scale(fade);
    }

    // The second moon: coming in slowly on the far side and spreading over it.
    const twinOn = inPart(SIDES.twin, T);
    twin.setEnabled(twinOn);
    if (twinOn) {
      const k = smooth(SIDES.twin[0] + 1, SIDES.twin[0] + 10, T);
      const touch = dirOf(180, 15);
      const start = touch.scale(3.2).add(new Vector3(0, 0.6, 2.2));
      const at = Vector3.Lerp(start, touch.scale(1.37), k);
      // Sinking into the far side as it spreads over it.
      const sink = smooth(SIDES.twin[0] + 9.5, SIDES.twin[0] + 12, T);
      const size = 1 - sink;
      twin.position.copyFrom(Vector3.Lerp(at, touch.scale(1 + 0.37 * size * 0.6), sink));
      twin.scaling.set(size, size, -size);
      twin.setEnabled(size > 0.02);
    }
    moonMat.setFloat('cap', twinOn ? smooth(SIDES.twin[0] + 9.5, SIDES.twin[0] + 15, T) : 0);

    const eye = cameraAt(T);
    camera.position.copyFrom(eye.at);
    camera.upVector.copyFrom(eye.up);
    camera.setTarget(eye.look);
    camera.fov = eye.fov;
    // The light: from behind the eye's shoulder, so the faces seen are lit.
    const fromEye = eye.at.subtract(eye.look).normalize();
    const sun = Vector3.TransformNormal(fromEye, Matrix.RotationAxis(eye.up, 0.55)).add(eye.up.scale(0.25)).normalize();
    for (const m of [moonMat, twinMat]) { m.setVector3('sunDir', sun); m.setFloat('fade', fade); }
    earthMat.setVector3('sunDir', sun);
    earthMat.setVector3('eye', eye.at);
    earthMat.setFloat('fade', fade);
    cutMat.setFloat('fade', fade);
    skyMat.setFloat('fade', fade);
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
    void T0;
  }

  // Where the eye is: keys round the Moon's middle (lon, lat, distance), each with where it
  // looks and which way is up; within a part they are eased between, at the parts' starts
  // the view dips to black and cuts.
  const Y = new Vector3(0, 1, 0);
  const round = (lon, lat, dist, fov = 0.8, look = new Vector3(0, -0.3, 0), up = Y) => ({ lon, lat, dist, fov, look, up });
  const KEYS = [
    [0, round(-6, 0, 5.4)],
    [20, round(4, 0, 5.4)],
    [31, round(180, 0, 5.4)],
    [44, round(186, 4, 5.4)],
    // The Earth above the Moon, the rocks coming in from all round.
    [44, { at: new Vector3(-3.7, 4, 14.5), look: new Vector3(-3.7, 0, 0), up: new Vector3(-1, 0, 0), fov: 1.22 }],
    [60, { at: new Vector3(-3.7, 5.5, 14), look: new Vector3(-3.7, 0, 0), up: new Vector3(-1, 0, 0), fov: 1.22 }],
    [60, round(0, 6, 4.6)],
    [104, round(0, 6, 3.9, 0.8, new Vector3(0, -0.25, 0))],
    [104, round(-90, 6, 5.6)],
    [134, round(-90, 6, 5.4)],
    // The young Earth above the Moon.
    [134, { at: new Vector3(-1.6, 2, 8.6), look: new Vector3(-1.6, 0, 0), up: new Vector3(-1, 0, 0), fov: 1.1 }],
    [150, { at: new Vector3(-1.6, 2.5, 8.3), look: new Vector3(-1.6, 0, 0), up: new Vector3(-1, 0, 0), fov: 1.1 }],
    [150, round(-10, 12, 5.2)],
    [166, round(-20, 15, 5.0)],
    [166, round(-169, -42, 5.2)],
    [175, round(-169, -42, 5.2)],
    [181, round(-20, 28, 5.2)],
    [182, round(-20, 28, 5.2)],
    [182, round(140, 18, 6.6, 0.8, new Vector3(0.6, 0.2, 0))],
    [198, round(150, 18, 6.0, 0.8, new Vector3(0.4, -0.1, 0))],
    [198, round(-150, -32, 4.6, 0.8, new Vector3(0, -0.35, 0))],
    [218, round(-158, -30, 4.4, 0.8, new Vector3(0, -0.35, 0))],
    [228, round(0, 0, 5.4)],
    [232, round(0, 0, 5.4)],
  ];
  const place = (k) => (k.at ? k : { ...k, at: dirOf(k.lon, k.lat).scale(k.dist) });
  function cameraAt(T) {
    let i = 0;
    while (i < KEYS.length - 2 && T >= KEYS[i + 1][0]) i++;
    const [ta, a] = KEYS[i], [tb, b] = KEYS[i + 1];
    const k = tb > ta ? smooth(ta, tb, T) : 1;
    if (a.lon !== undefined && b.lon !== undefined) {
      // Round the Moon, not through it.
      const lon = lerp(a.lon, b.lon, k), lat = lerp(a.lat, b.lat, k), dist = lerp(a.dist, b.dist, k);
      return { at: dirOf(lon, lat).scale(dist), look: Vector3.Lerp(a.look, b.look, k), up: Vector3.Lerp(a.up, b.up, k).normalize(), fov: lerp(a.fov, b.fov, k) };
    }
    const pa = place(a), pb = place(b);
    return { at: Vector3.Lerp(pa.at, pb.at, k), look: Vector3.Lerp(pa.look, pb.look, k), up: Vector3.Lerp(pa.up, pb.up, k).normalize(), fov: lerp(pa.fov, pb.fov, k) };
  }

  return {
    update,
    scene,
    resize: () => engine.resize(),
    dispose: () => { names.remove(); engine.dispose(); },
  };
}
