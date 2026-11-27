// How old is sunlight? (the user, 2026-11-27: "태양 빛이 우리에게 오는데, 수 백 만 년이 걸린다는걸
// 만들어볼까", "석기 시대 -> 청동기 -> 현대 사회.. 이렇게 시간이 흐르는 동안", "햇빛은 몇 살일까로
// 목록에 올려", "이거 우주 상식에 넣자", "만들어"): a little world of its own on a canvas over the
// game's, as the Moon's two sides are.
//   morning: the Earth in the morning light.
//   sun:     back along the light to the Sun: 8 min 20 s is only the last stretch.
//   cut:     the Sun cut in half: core, radiative zone, convective zone.
//   walk:    one photon's random walk out of the radiative zone (drawn far bigger than it is),
//            a bar of the 170,000 years beside it filling with what happened on the Earth.
//   convect: the boiling outer third carries the heat up.
//   split:   one gamma ray comes out as thousands of visible photons.
//   fly:     8 min 20 s to the Earth (sizes and distance shrunk).
//   neutrino: born with it, out of the Sun in 2 s, and through the Earth (Super-Kamiokande
//            and Japan taken out: the user, 2026-11-27, "일본 사람 얘기는 삭제", "가로 하고 고쳐").
//   end:     the morning again.
// The Sun's radius is 1, its middle at 0; the eye looks at the cut face from +z.
import { Engine, Scene, FreeCamera, Vector3, Color3, Color4, CreateSphere, CreatePlane, CreateLineSystem, ShaderMaterial, Effect, Texture, Mesh, Matrix, Constants } from './babylon.js';
import './orbitStage.js'; // its shaders: orbitSky
import './moonSidesStage.js'; // its shaders: sidesMoon (vertex), sidesEarth

// The course's seconds (core/courses.js keeps its captions to these).
export const SUNLIGHT = {
  morning: [0, 16],
  sun: [16, 30],
  cut: [30, 50],
  walk: [50, 110],
  convect: [110, 128],
  split: [128, 144],
  fly: [144, 164],
  neutrino: [164, 189],
  end: [189, 205],
};

const CORE = 0.25; // the core's edge, in the Sun's radii
const RAD = 0.7; // the radiative zone's outer edge
const EARTH = new Vector3(14, 0, 0); // (the distance shrunk 1/15: the real one is 215 radii)
const EARTH_R = 0.3; // (drawn 30 times its size)

Effect.ShadersStore.sunBallVertexShader = `
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
// The Sun's face: boiling granules, darker toward the rim.
Effect.ShadersStore.sunBallFragmentShader = `
precision highp float;
varying vec3 vN;
varying vec3 vW;
uniform vec3 eye;
uniform float cutOn;
uniform float time;
uniform float fade;
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void main() {
  if (cutOn > 0.5 && vW.z > 0.0) discard;
  vec3 n = normalize(vN);
  float mu = max(dot(n, normalize(eye - vW)), 0.0);
  float limb = 0.3 + 0.7 * pow(mu, 0.55);
  vec3 q = n * 34.0 + vec3(0.0, time * 0.08, 0.0);
  float g = vnoise(q) * 0.6 + vnoise(q * 2.1) * 0.4;
  float lanes = smoothstep(0.35, 0.6, g);
  vec3 col = mix(vec3(0.95, 0.45, 0.1), vec3(1.0, 0.86, 0.55), lanes) * limb * 1.35;
  gl_FragColor = vec4(col * fade, 1.0);
}`;
// The cut face: the core white-hot, the radiative zone, the boiling convective zone.
Effect.ShadersStore.sunCutVertexShader = `
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
Effect.ShadersStore.sunCutFragmentShader = `
precision highp float;
varying vec3 vW;
uniform float time;
uniform float fade;
uniform float dim;
uniform float boil;
uniform float fusion;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 q = vW.xy;
  float r = length(q);
  if (r > 1.0) discard;
  float ang = atan(q.y, q.x);
  vec3 col;
  if (r < ${CORE.toFixed(2)}) {
    col = mix(vec3(1.0, 1.0, 0.9), vec3(1.0, 0.9, 0.6), r / ${CORE.toFixed(2)});
    // Hydrogen joining into helium: sparks coming and going.
    vec2 cell = floor(q * 60.0);
    float h = hash(cell);
    float ph = fract(time * (0.6 + h) + h * 7.0);
    col += vec3(0.7, 0.6, 1.0) * fusion * step(0.93, h) * smoothstep(0.3, 0.0, ph) * 1.5;
  } else if (r < ${RAD.toFixed(2)}) {
    float k = (r - ${CORE.toFixed(2)}) / ${(RAD - CORE).toFixed(2)};
    col = mix(vec3(1.0, 0.78, 0.4), vec3(0.92, 0.42, 0.12), k);
  } else {
    float k = (r - ${RAD.toFixed(2)}) / ${(1 - RAD).toFixed(2)};
    // Rolling cells: gas rising in some, sinking in the next.
    float cells = sin(ang * 22.0) * sin(k * 3.14159);
    float flow = sin(ang * 22.0 + 1.5708) * sin(k * 6.28318 - time * 1.8 * sign(cells));
    col = mix(vec3(0.9, 0.36, 0.08), vec3(0.62, 0.16, 0.04), k);
    col *= 1.0 + (0.18 + 0.3 * boil) * cells + 0.12 * boil * flow;
  }
  // Lines between the layers.
  col *= 1.0 - 0.4 * smoothstep(0.006, 0.0, abs(r - ${CORE.toFixed(2)})) - 0.4 * smoothstep(0.006, 0.0, abs(r - ${RAD.toFixed(2)}));
  col *= 1.0 - 0.6 * dim;
  gl_FragColor = vec4(col * fade, 1.0);
}`;
// The glow round the Sun, added on.
Effect.ShadersStore.sunGlowVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.sunGlowFragmentShader = `
precision highp float;
varying vec2 vUV;
uniform float fade;
void main() {
  float d = length(vUV - 0.5) * 2.0;
  float g = pow(max(1.0 - d, 0.0), 2.6) * 0.9;
  gl_FragColor = vec4(vec3(1.0, 0.7, 0.35) * g * fade, 1.0);
}`;

Effect.ShadersStore.sunHeadFragmentShader = 'precision highp float; uniform float fade; void main() { gl_FragColor = vec4(vec3(1.0, 1.0, 0.95) * fade, 1.0); }';

export function createSunlightStage(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);
  const camera = new FreeCamera('sunEye', new Vector3(0, 0, 5), scene);
  camera.minZ = 0.01;
  camera.maxZ = 20000;
  camera.inputs.clear();
  const base = import.meta.env?.BASE_URL ?? './';

  const skyMat = new ShaderMaterial('sunSkyMat', scene, { vertex: 'orbitSky', fragment: 'orbitSky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'pix', 'fade'] });
  skyMat.backFaceCulling = false;
  const sky = CreateSphere('sunSky', { diameter: 15000, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
  sky.material = skyMat;
  sky.infiniteDistance = true;

  const sunMat = new ShaderMaterial('sunBallMat', scene, { vertex: 'sunBall', fragment: 'sunBall' }, { attributes: ['position', 'normal'], uniforms: ['world', 'viewProjection', 'eye', 'cutOn', 'time', 'fade'] });
  sunMat.backFaceCulling = false;
  const sun = CreateSphere('sunBall', { diameter: 2, segments: 96 }, scene);
  sun.material = sunMat;
  const cutMat = new ShaderMaterial('sunCutMat', scene, { vertex: 'sunCut', fragment: 'sunCut' }, { attributes: ['position'], uniforms: ['world', 'viewProjection', 'time', 'fade', 'dim', 'boil', 'fusion'] });
  cutMat.backFaceCulling = false;
  const cut = CreatePlane('sunCut', { size: 2.02 }, scene);
  cut.material = cutMat;
  const glowMat = new ShaderMaterial('sunGlowMat', scene, { vertex: 'sunGlow', fragment: 'sunGlow' }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'fade'], needAlphaBlending: true });
  glowMat.alphaMode = Constants.ALPHA_ADD;
  glowMat.backFaceCulling = false;
  glowMat.disableDepthWrite = true;
  const glow = CreatePlane('sunGlow', { size: 5.2 }, scene);
  glow.material = glowMat;
  glow.billboardMode = Mesh.BILLBOARDMODE_ALL;

  const earthMat = new ShaderMaterial('sunEarthMat', scene, { vertex: 'sidesMoon', fragment: 'sidesEarth' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'sunDir', 'middle', 'eye', 'hot', 'fade', 'time'], samplers: ['map'] });
  earthMat.setTexture('map', new Texture(`${base}assets/earth-day.webp`, scene, false, false));
  earthMat.setFloat('hot', 0);
  earthMat.setVector3('sunDir', new Vector3(-1, 0.12, 0.2).normalize());
  const earth = CreateSphere('sunEarth', { diameter: 2 * EARTH_R, segments: 64 }, scene);
  earth.material = earthMat;
  earth.position.copyFrom(EARTH);
  earth.rotation.x = 0.41; // its tilt

  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // One photon's random walk from the middle to the radiative zone's edge, turned so it ends
  // straight up (+y), on the cut face just in front of it.
  const walk = [new Vector3(0, 0, 0)];
  {
    let x = 0, y = 0;
    const STEP = 0.019;
    while (Math.hypot(x, y) < RAD && walk.length < 6000) {
      const a = rnd() * Math.PI * 2;
      x += Math.cos(a) * STEP;
      y += Math.sin(a) * STEP;
      walk.push(new Vector3(x, y, 0));
    }
    const end = walk[walk.length - 1];
    const turn = Math.PI / 2 - Math.atan2(end.y, end.x);
    const c = Math.cos(turn), s = Math.sin(turn);
    for (const p of walk) p.set(p.x * c - p.y * s, p.x * s + p.y * c, 0.004);
  }
  const walkColors = walk.map((_, i) => {
    const k = i / (walk.length - 1);
    return new Color4(0.7 + 0.3 * k, 0.55 + 0.45 * k, 1.0, 1);
  });
  const walkLine = CreateLineSystem('sunWalk', { lines: [walk.map((p) => p.clone())], colors: [walkColors], updatable: true }, scene);
  const head = CreateSphere('sunHead', { diameter: 0.03, segments: 8 }, scene);
  const headMat = new ShaderMaterial('sunHeadMat', scene, { vertex: 'sunGlow', fragment: 'sunHead' }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'fade'] });
  head.material = headMat;

  // One gamma ray coming out as many photons of light, fanning out from the top.
  const TOP = new Vector3(0, 1, 0.004);
  const N_FAN = 36;
  const fan = Array.from({ length: N_FAN }, (_, i) => {
    const a = Math.PI / 2 + (rnd() - 0.5) * 2.2;
    const hue = i / N_FAN;
    const col = hue < 0.33 ? new Color4(1, 0.4 + hue * 1.5, 0.3, 1) : hue < 0.66 ? new Color4(1, 0.95, 0.5 + (hue - 0.33), 1) : new Color4(0.6 + (1 - hue), 0.8, 1, 1);
    return { dir: new Vector3(Math.cos(a), Math.sin(a), 0), len: 0.25 + 0.35 * rnd(), col };
  });
  const fanLines = CreateLineSystem('sunFan', { lines: fan.map(() => [TOP.clone(), TOP.clone()]), colors: fan.map((f) => [f.col, f.col]), updatable: true }, scene);

  // Neutrinos: green streaks straight out of the middle, and then through the Earth.
  const N_NU = 40;
  const nus = Array.from({ length: N_NU }, (_, i) => {
    const a = (i / N_NU) * Math.PI * 2 + rnd() * 0.1;
    return { dir: new Vector3(Math.cos(a), Math.sin(a), 0), phase: rnd(), y: (rnd() - 0.5) * 1.3, z: (rnd() - 0.5) * 1.3 };
  });
  const nuLines = CreateLineSystem('sunNu', { lines: nus.map(() => [Vector3.Zero(), Vector3.One()]), updatable: true }, scene);
  nuLines.color = new Color3(0.4, 1, 0.55);

  // The light on its way to the Earth.
  const photon = CreateSphere('sunPhoton', { diameter: 0.09, segments: 8 }, scene);
  photon.material = headMat;

  for (const [mat, mesh] of [[sunMat, sun], [cutMat, cut], [glowMat, glow], [earthMat, earth], [headMat, head], [walkLine.material, walkLine], [fanLines.material, fanLines], [nuLines.material, nuLines]]) mat?.forceCompilation(mesh);

  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const inPart = (part, T) => T >= part[0] && T < part[1];

  // Names on the screen over what they name, and the bar of the years.
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
  const WORDS = {
    sun: '태양', earth: '지구', core: '핵 · 1,500만 도', radiative: '복사층', convective: '대류층', photon: '빛 한 알',
    neutrino: '중성미자',
    start: '17만 년 전', stone: '석기 시대', leave: '아프리카를 떠남', farm: '농사', bronze: '청동기', today: '오늘',
    leaveAgo: '6만 년 전', farmAgo: '1만 2천 년 전', bronzeAgo: '5천 년 전',
    clock: (s) => `${Math.floor(s / 60)}분 ${String(Math.floor(s % 60)).padStart(2, '0')}초`,
  };
  let w = WORDS;

  // The bar: 170,000 years, the Stone Age most of it.
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:9%;right:9%;top:20%;height:80px;opacity:0;transition:opacity 0.8s;font-size:12px';
  names.append(bar);
  const track = document.createElement('div');
  track.style.cssText = 'position:absolute;left:0;right:0;top:26px;height:10px;border-radius:5px;background:#ffffff1f;box-shadow:inset 0 0 0 1px #ffffff40;overflow:hidden';
  const fill = document.createElement('div');
  fill.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#b98a5a,#d9b27a)';
  const last = document.createElement('div');
  last.style.cssText = 'position:absolute;left:97%;right:0;top:0;bottom:0;background:#ffd76a;opacity:0;transition:opacity 0.8s;box-shadow:0 0 8px #ffd76a';
  track.append(fill, last);
  bar.append(track);
  // row: 0 above the bar, 1 under it, 2 further under.
  const mark = (at, text, row, align = 'center') => {
    const el = document.createElement('div');
    const x = `${(at * 100).toFixed(2)}%`;
    el.textContent = text;
    el.style.cssText = `position:absolute;left:${x};top:${[0, 42, 60][row]}px;transform:translateX(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'});white-space:nowrap;opacity:0;transition:opacity 0.5s`;
    const tick = document.createElement('div');
    tick.style.cssText = `position:absolute;left:${x};top:${row ? 36 : 18}px;width:1px;height:${[8, 8, 26][row]}px;background:#ffffffa0;opacity:0;transition:opacity 0.5s`;
    bar.append(el, tick);
    return { at, el, tick };
  };
  let marks = [];
  let stoneTag = null;
  let events = [];
  const callout = document.createElement('div');
  callout.style.cssText = 'position:absolute;left:50%;top:calc(20% + 90px);transform:translateX(-50%);text-align:center;opacity:0;transition:opacity 0.5s;color:#ffe7b0;background:rgba(10,6,4,0.72);border-radius:12px;padding:6px 18px 7px;white-space:nowrap;box-shadow:0 0 0 1px #ffd76a40';
  const calloutName = document.createElement('div');
  calloutName.style.cssText = 'font:700 24px system-ui,sans-serif;letter-spacing:0.04em';
  const calloutAgo = document.createElement('div');
  calloutAgo.style.cssText = 'font:600 14px system-ui,sans-serif;opacity:0.85;margin-top:2px';
  callout.append(calloutName, calloutAgo);
  names.append(callout);
  const YEARS = 170000;
  const atYears = (ago) => 1 - ago / YEARS;

  // The walk's progress and the bar's fill, both from 0 to 1.
  const walkK = (T) => smooth(52, 106, T);
  // (Slower toward the end, so each of the last events has its own few seconds: the user,
  // 2026-11-27, of GPT's advice: "가, 나 둘 다 해".)
  const BAR = [[72, 0], [88, atYears(60000)], [94, atYears(12000)], [99, atYears(5000)], [104, 1]];
  const barK = (T) => {
    if (T <= BAR[0][0]) return 0;
    for (let i = 1; i < BAR.length; i++) {
      const [a, ka] = BAR[i - 1], [b, kb] = BAR[i];
      if (T <= b) return ka + ((T - a) / (b - a)) * (kb - ka);
    }
    return 1;
  };

  // The course's clock to the stage's: the lines read aloud follow one another 0.8 s apart
  // (the user, 2026-11-27: "문장과 문장에 쉬는 시간이 너무 길어"), so the course is shorter than
  // the stage's own seconds above, which stay as they were drawn; KNOTS pairs the two (course
  // seconds, stage seconds), each line's start with its start, each part's a second before.
  const KNOTS = [[0.0, 0], [1.0, 1], [4.4, 8], [8.4, 16], [9.4, 17], [15.0, 30], [16.0, 31], [21.3, 40], [26.3, 50], [27.3, 51], [31.9, 55], [39.1, 61], [47.0, 71], [54.4, 81], [60.2, 91], [66.2, 101], [74.5, 110], [75.5, 111], [81.0, 119], [86.7, 128], [87.7, 129], [95.0, 144], [96.0, 145], [101.5, 155], [106.6, 164], [107.6, 165], [113.1, 170], [119.2, 176], [125.8, 182], [132.6, 189], [133.6, 190], [138.9, 198], [146.8, 205]];
  const stageTime = (t) => {
    if (t <= KNOTS[0][0]) return t;
    for (let i = 1; i < KNOTS.length; i++) {
      const [a, sa] = KNOTS[i - 1], [b, sb] = KNOTS[i];
      if (t <= b) return sa + ((t - a) / (b - a)) * (sb - sa);
    }
    return KNOTS[KNOTS.length - 1][1] + (t - KNOTS[KNOTS.length - 1][0]);
  };
  function update(course, words) {
    const T = stageTime(course);
    if (!tags.length) {
      w = { ...WORDS, ...(words ?? {}) };
      tag(w.core, () => new Vector3(0, -0.06, 0.01), (t) => inPart([33, 50], t));
      tag(w.radiative, () => new Vector3(0.34, 0.34, 0.01), (t) => inPart([35, 50], t) || inPart([52, 62], t));
      tag(w.convective, () => new Vector3(0.6, 0.6, 0.01), (t) => inPart([37, 50], t) || inPart([111, 124], t));
      tag(w.photon, () => head.position.add(new Vector3(0.12, 0.06, 0)), (t) => inPart([54, 66], t));
      tag(w.sun, () => new Vector3(-2.3, 0, 0), (t) => inPart([146, 164], t));
      tag(w.earth, () => EARTH.add(new Vector3(0, 1.9, 0)), (t) => inPart([146, 164], t));
      tag(w.neutrino, () => new Vector3(1.55, 0.85, 0.01), (t) => inPart([171, 181], t));
      marks = [
        mark(0, w.start, 0, 'left'),
        mark(atYears(60000), '', 1),
        mark(atYears(12000), '', 1),
        mark(atYears(5000), '', 1),
        mark(1, w.today, 0, 'right'),
      ];
      // Each event, as the bar reaches it, large under the bar till the next.
      events = [[atYears(60000), w.leave, w.leaveAgo], [atYears(12000), w.farm, w.farmAgo], [atYears(5000), w.bronze, w.bronzeAgo], [1, w.today, '']];
      stoneTag = document.createElement('div');
      stoneTag.textContent = w.stone;
      stoneTag.style.cssText = 'position:absolute;left:30%;top:42px;transform:translateX(-50%);white-space:nowrap;opacity:0;transition:opacity 0.6s;color:#f0d6a8';
      bar.append(stoneTag);
    }
    // Dips to black between the parts that cut.
    let fade = 1 - smooth(SUNLIGHT.end[1] - 1.5, SUNLIGHT.end[1], T);
    for (const d of [SUNLIGHT.sun[0], SUNLIGHT.cut[0], SUNLIGHT.fly[0], SUNLIGHT.neutrino[0], 181, SUNLIGHT.end[0]]) fade *= 1 - smooth(d - 1, d, T) * (1 - smooth(d, d + 1.2, T));
    fade *= smooth(-1, 0.5, T);

    const cutOn = inPart([SUNLIGHT.cut[0], SUNLIGHT.fly[0]], T) || inPart([SUNLIGHT.neutrino[0], 181], T);
    sunMat.setFloat('cutOn', cutOn ? 1 : 0);
    cut.setEnabled(cutOn);
    glow.setEnabled(!cutOn);
    cutMat.setFloat('dim', inPart(SUNLIGHT.walk, T) ? smooth(50, 54, T) * (1 - smooth(106, 110, T)) : 0);
    cutMat.setFloat('boil', inPart(SUNLIGHT.convect, T) ? 1 : 0);
    cutMat.setFloat('fusion', inPart([38, 50], T) || inPart([164, 181], T) ? 1 : 0.25);
    cutMat.setFloat('time', T);
    sunMat.setFloat('time', T);

    // The walk, drawn as far as the photon has come.
    const walkOn = inPart([SUNLIGHT.walk[0], SUNLIGHT.split[1]], T);
    walkLine.setEnabled(walkOn);
    head.setEnabled(inPart([SUNLIGHT.walk[0], SUNLIGHT.split[0] + 1], T));
    if (walkOn) {
      const n = Math.max(1, Math.floor(walkK(T) * (walk.length - 1)));
      const at = walk[n];
      const pts = walk.map((p, i) => (i <= n ? p : at));
      CreateLineSystem('sunWalk', { lines: [pts], instance: walkLine }, scene);
      walkLine.alpha = fade;
      // Then carried up through the boiling layer to the top.
      const up = smooth(113, 124, T);
      head.position.copyFrom(T < SUNLIGHT.convect[0] ? at : Vector3.Lerp(walk[walk.length - 1], TOP, up));
    }

    // One gamma ray out as many.
    const fanOn = inPart(SUNLIGHT.split, T);
    fanLines.setEnabled(fanOn);
    if (fanOn) {
      const k = smooth(131, 140, T);
      CreateLineSystem('sunFan', { lines: fan.map((f) => [TOP, TOP.add(f.dir.scale(f.len * k))]), instance: fanLines }, scene);
    }

    // To the Earth.
    const flyOn = inPart(SUNLIGHT.fly, T);
    photon.setEnabled(flyOn && T > 147 && T < 161);
    const flyK = smooth(147, 160, T);
    photon.scaling.setAll(4);
  if (flyOn) photon.position.copyFrom(Vector3.Lerp(new Vector3(1.02, 0, 0), EARTH.add(new Vector3(-EARTH_R * 2.4, 0, 0)), flyK));

    // Neutrinos.
    const nuOut = inPart([170, 181], T), nuThrough = inPart([181, 189], T);
    nuLines.setEnabled(nuOut || nuThrough);
    if (nuOut || nuThrough) {
      const lines = nus.map((n) => {
        if (nuOut) {
          const p = ((T - 170) * 0.9 + n.phase) % 1;
          const a = n.dir.scale(p * 3.2), b = n.dir.scale(p * 3.2 + 0.35);
          a.z = b.z = 0.005;
          return [a, b];
        }
        const p = ((T - 181) * 0.55 + n.phase) % 1;
        const x = EARTH.x - 2.2 + p * 4.4;
        return [new Vector3(x, n.y * 0.6, n.z * 0.6), new Vector3(x + 0.45, n.y * 0.6, n.z * 0.6)];
      });
      CreateLineSystem('sunNu', { lines, instance: nuLines }, scene);
      nuLines.color = new Color3(0.4, 1, 0.55).scale(fade);
    }

    earth.rotation.y = -T * 0.05;
    // (Bigger again while it is a dot across the whole way.)
    earth.scaling.setAll(flyOn ? 2.4 : 1);
    const eye = cameraAt(T);
    camera.position.copyFrom(eye.at);
    camera.upVector.copyFrom(eye.up);
    camera.setTarget(eye.look);
    camera.fov = eye.fov;
    sunMat.setVector3('eye', eye.at);
    sunMat.setFloat('fade', fade);
    cutMat.setFloat('fade', fade);
    glowMat.setFloat('fade', fade);
    headMat.setFloat('fade', fade);
    earthMat.setVector3('eye', eye.at);
    earthMat.setVector3('middle', EARTH);
    earthMat.setFloat('fade', fade);
    earthMat.setFloat('time', T);
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
    // The bar, while the photon wanders.
    const barOn = inPart([68, 110], T) && fade > 0.5;
    bar.style.opacity = barOn ? '1' : '0';
    const k = barK(T);
    fill.style.width = `${(k * 100).toFixed(2)}%`;
    for (const m of marks) {
      const seen = k >= m.at - 0.001 && barOn ? '1' : '0';
      m.el.style.opacity = seen;
      m.tick.style.opacity = seen;
    }
    if (stoneTag) stoneTag.style.opacity = barOn && k > 0.3 ? '1' : '0';
    let now = null;
    for (const e of events) if (k >= e[0] - 0.001) now = e;
    if (now) { calloutName.textContent = now[1]; calloutAgo.textContent = now[2]; }
    callout.style.opacity = barOn && now ? '1' : '0';
    last.style.opacity = T > 100 ? '1' : '0';
    // The clock on the way to the Earth: 0 to 8 min 20 s.
    clock.textContent = w.clock(500 * flyK);
    clock.style.opacity = flyOn && T > 146.5 && fade > 0.5 ? '1' : '0';
  }
  const clock = document.createElement('div');
  clock.style.cssText = 'position:absolute;right:9%;top:44%;text-align:right;font:700 26px system-ui,sans-serif;letter-spacing:0.04em;opacity:0;transition:opacity 0.6s;color:#ffe7b0';
  names.append(clock);

  // Where the eye is: keys (time, at, look, up, fov), eased between.
  const Y = new Vector3(0, 1, 0);
  const key = (at, look, fov = 0.8, up = Y) => ({ at, look, fov, up });
  const earthView = key(EARTH.add(new Vector3(-0.7, 0.3, 1.55)), EARTH.add(new Vector3(-0.05, 0, 0)), 0.75);
  const KEYS = [
    [0, earthView],
    [16, key(EARTH.add(new Vector3(-0.85, 0.3, 1.7)), EARTH.add(new Vector3(-0.1, 0, 0)), 0.75)],
    // Back along the light to the Sun.
    [16, key(new Vector3(1.2, 0.8, 7.5), new Vector3(0, 0, 0), 0.8)],
    [30, key(new Vector3(0.4, 0.4, 4.3), new Vector3(0, 0, 0), 0.8)],
    // Cut in half, seen face on.
    [30, key(new Vector3(0, 0, 3.9), new Vector3(0, 0, 0))],
    [50, key(new Vector3(0, 0, 3.5), new Vector3(0, 0, 0))],
    // (Far enough that the whole walk stays between the bar above and the captions below.)
    [52, key(new Vector3(0, 0.13, 4.1), new Vector3(0, 0.13, 0))],
    [108, key(new Vector3(0, 0.13, 4.0), new Vector3(0, 0.13, 0))],
    // Up into the boiling layer, and to the top.
    [112, key(new Vector3(0, 0.62, 1.5), new Vector3(0, 0.66, 0))],
    [126, key(new Vector3(0, 0.82, 1.2), new Vector3(0, 0.86, 0))],
    [131, key(new Vector3(0, 1.08, 1.05), new Vector3(0, 1.1, 0))],
    [144, key(new Vector3(0, 1.12, 1.25), new Vector3(0, 1.14, 0))],
    // The whole way, Sun to Earth, from aside.
    // (Upright: the Sun low on the screen, the Earth high, both clear of the captions.)
    [144, key(new Vector3(5.9, 0, 37), new Vector3(5.9, 0, 0), 0.85, new Vector3(1, 0, 0))],
    [164, key(new Vector3(5.9, 0, 35.5), new Vector3(5.9, 0, 0), 0.85, new Vector3(1, 0, 0))],
    // Cut again, the neutrinos going straight out.
    [164, key(new Vector3(0, 0, 4.4), new Vector3(0, 0, 0))],
    [181, key(new Vector3(0, 0, 5.6), new Vector3(0, 0, 0))],
    // Through the Earth.
    [181, key(EARTH.add(new Vector3(0.2, 0.35, 1.7)), EARTH, 0.85)],
    [189, key(EARTH.add(new Vector3(0.15, 0.32, 1.55)), EARTH, 0.85)],
    [189, earthView],
    [205, key(EARTH.add(new Vector3(-0.6, 0.25, 1.35)), EARTH.add(new Vector3(-0.05, 0, 0)), 0.75)],
  ];
  function cameraAt(T) {
    let i = 0;
    while (i < KEYS.length - 2 && T >= KEYS[i + 1][0]) i++;
    const [ta, a] = KEYS[i], [tb, b] = KEYS[i + 1];
    const k = tb > ta ? smooth(ta, tb, T) : 1;
    return { at: Vector3.Lerp(a.at, b.at, k), look: Vector3.Lerp(a.look, b.look, k), up: Vector3.Lerp(a.up, b.up, k).normalize(), fov: lerp(a.fov, b.fov, k) };
  }

  return {
    update,
    scene,
    resize: () => engine.resize(),
    dispose: () => { names.remove(); engine.dispose(); },
  };
}
