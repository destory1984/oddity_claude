// The Moon's birth (the user, 2026-11-24: "테이아 달 형성론을 3D로 만들어볼까", "개발 시작"): a
// little world of its own on a canvas over the game's, as the Mars walk's is. 4.5 billion
// years ago a body the size of Mars, named Theia, struck the young Earth a glancing blow;
// the rock thrown off went round the Earth as a glowing disc, and out of it the Moon came
// together, close by, and has drawn away ever since. The most widely held account (the
// giant impact); its shapes are taken from the published simulations (Canup 2004; the
// Durham group's, Kegerreis 2022) but nothing here is computed: some 14,000 grains move
// on paths set out in the vertex shader, as those runs show them going.
// In Earth radii; the Earth at the origin, spinning about y; the Sun far off along SUN.
import { Engine, Scene, FreeCamera, Vector3, Vector4, Color3, Color4, CreateSphere, CreatePlane, ShaderMaterial, Effect, Texture, Mesh, VertexData, Constants } from './babylon.js';

// The course's seconds (core/courses.js keeps its captions to these).
export const THEIA = {
  // (Theia's coming 12 s longer, for a caption on where it came from: the user, 2026-11-25.)
  approach: [0, 50], // Theia drawing near
  impact: 50, // the first touch
  arms: [52, 90], // the mantle flung out in a long arm, wrapping round
  disc: [90, 130], // a glowing disc round a molten Earth
  moon: [124, 164], // the Moon gathering out of it beyond 3 radii
  recede: [164, 218], // the hundreds of millions of years after, in seconds: the Moon drawing off, the Earth cooling
  end: 226,
};

// (From the side the blow is watched from, so the struck ground and Theia are lit.)
const SUN = new Vector3(Math.cos(0.75), 0.3, Math.sin(0.75)).normalize();
const THEIA_R = 0.53;
const MOON_R = 0.273;
// Where the Moon goes round when it forms (Roche's limit is 2.9 radii) and today (60).
const MOON_FROM = 3.8;

const NOISE = `
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n3(p); p *= 2.03; a *= 0.5; } return s; }
`;

// A world: dark basalt with faint red seams; molten (heat) a sea of moving fire glowing of
// itself; cooling, a black crust whose cracks fade; and at the end (today) its own map.
Effect.ShadersStore.theiaWorldVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
// The blow on its surface (the user, 2026-11-24, of "the two only melt into each other":
// "고쳐"): dent: x how deep the hollow, y seconds since the touch, z how high the waves;
// dentDir: toward the struck spot. flatDir, flatCut: Theia pressed flat against the Earth,
// all of it beyond flatCut (in its radii, 1 = none) along flatDir laid onto that plane.
uniform vec3 dentDir;
uniform vec4 dent;
uniform vec3 flatDir;
uniform float flatCut;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vec3 c = (world * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float r = length(w.xyz - c);
  vec3 n = (w.xyz - c) / r;
  if (dent.x > 0.0 || dent.z > 0.0) {
    float a = acos(clamp(dot(n, dentDir), -1.0, 1.0));
    float hollow = -dent.x * exp(-pow(a / 0.42, 2.0));
    // Rings of waves running out from it over the molten ground, slowing and dying away.
    float front = dent.y * 0.22;
    float wave = dent.z * sin(16.0 * (a - front)) * exp(-pow((a - front) / 0.35, 2.0)) * exp(-dent.y / 9.0);
    w.xyz += n * r * (hollow + wave);
  }
  if (flatCut < 1.0) {
    float d = dot(w.xyz - c, flatDir) / r;
    if (d > flatCut) w.xyz -= flatDir * (d - flatCut) * r;
  }
  vW = w.xyz;
  vObj = normalize(position);
  vN = normalize((world * vec4(normal, 0.0)).xyz);
  vUV = uv;
  gl_Position = viewProjection * w;
}`;
Effect.ShadersStore.theiaWorldFragmentShader = `
precision highp float;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUV;
uniform vec3 sunDir;
uniform vec3 eye;
uniform float heat;
uniform float today;
uniform float ocean;
uniform float time;
uniform vec3 rock;
uniform vec3 hitDir;
uniform float hit;
uniform sampler2D map;
${NOISE}
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(eye - vW);
  float lit = max(dot(n, sunDir), 0.0);
  float fac = max(dot(n, v), 0.0);
  // The old crust: dark rock, mottled, with thin red seams.
  float m = fbm(vObj * 4.0);
  vec3 crust = rock * (0.55 + 0.6 * m);
  float seam = smoothstep(0.02, 0.0, abs(fbm(vObj * 3.0 + 7.0) - 0.5)) * smoothstep(0.45, 0.6, fbm(vObj * 2.0 + 1.0));
  vec3 col = crust * (0.05 + 1.35 * lit);
  vec3 glow = vec3(0.9, 0.25, 0.05) * seam * 0.22 * (1.0 - today) * (1.0 - 0.7 * lit);
  // Molten: cells of yellow-white fire in darker orange, drifting.
  float flow = fbm(vObj * 5.0 + vec3(time * 0.05, -time * 0.03, time * 0.04));
  float cells = fbm(vObj * 11.0 - vec3(0.0, time * 0.07, 0.0));
  vec3 fire = mix(vec3(0.55, 0.08, 0.02), vec3(1.0, 0.55, 0.12), smoothstep(0.35, 0.7, flow));
  fire = mix(fire, vec3(1.0, 0.92, 0.6), smoothstep(0.62, 0.8, cells) * 0.8);
  // Cooling (heat from 1 to 0): the fire breaks into a black crust from the cool side.
  float crustOver = smoothstep(heat * 1.15 - 0.05, heat * 1.15 + 0.1, 0.35 + 0.5 * fbm(vObj * 6.0 + 3.0));
  vec3 molten = fire * (1.0 - crustOver) + col * crustOver + vec3(0.7, 0.12, 0.02) * seam * crustOver * heat;
  col = mix(col + glow, molten, step(0.001, heat));
  // Where it was struck: white-hot, fading out from the spot.
  float spot = smoothstep(0.55, 1.0, dot(vObj, hitDir));
  col += vec3(1.0, 0.8, 0.5) * spot * hit * 2.0;
  // The first seas: water gathering in the low ground of the dark crust, under white cloud.
  float low = smoothstep(0.52, 0.42, fbm(vObj * 2.2 + 11.0));
  vec3 sea = vec3(0.03, 0.12, 0.28) * (0.08 + 1.1 * lit) + vec3(0.6) * pow(max(dot(reflect(-sunDir, n), v), 0.0), 40.0) * 0.4;
  col = mix(col, sea, ocean * low);
  float cloud = smoothstep(0.55, 0.75, fbm(vObj * 3.5 + vec3(time * 0.01, 0.0, 0.0)));
  col = mix(col, vec3(0.9) * (0.05 + lit), ocean * cloud * 0.55 * (1.0 - today));
  // Today: its own map, lit by the Sun.
  vec3 tex = texture2D(map, vUV).rgb;
  col = mix(col, tex * (0.03 + 1.15 * lit), today);
  // The hot air round it (rock vapour) or, today, the blue of its air on the lit edge.
  float rim = pow(1.0 - fac, 3.0);
  col += vec3(1.0, 0.45, 0.15) * rim * 0.6 * heat;
  col += vec3(0.35, 0.6, 1.0) * rim * max(today, ocean * 0.7) * smoothstep(-0.2, 0.4, dot(n, sunDir)) * 0.8;
  gl_FragColor = vec4(col, 1.0);
}`;

// The grains: each on its own path from the struck side, out along the arm, round the
// Earth in the disc, and at the end into the Moon (beyond 2.9 radii) or back down onto the
// Earth (within). attributes: seed (x: final radius, y: when it leaves, z: along the arm,
// w: a number of its own), drawn as soft round points, added together.
Effect.ShadersStore.theiaDustVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec4 seed;
uniform mat4 viewProjection;
uniform vec3 eye;
uniform float T;
uniform float impact;
uniform vec3 hitAt;
uniform float hitAngle;
uniform vec3 moonAt;
uniform vec2 moonWhen;
uniform float pixel;
varying float vHeat;
varying float vShow;
const float PI = 3.14159265;
float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
void main() {
  float a = seed.x, t0 = impact + seed.y, s = T - t0, w = seed.w;
  vec3 p = hitAt;
  float heat = 1.0;
  float show = step(0.0, s);
  if (s > 0.0) {
    // Out along the arm: thrown up to beyond its final radius, then settling round to it.
    float up = 1.0 - exp(-s / (2.5 + 3.0 * seed.z));
    float apo = a * (1.25 + 0.5 * seed.z);
    float settle = 1.0 - exp(-s / 30.0);
    float r = mix(1.02 + (apo - 1.02) * up, a, settle);
    // Going round, as fast as its height lets it (Kepler), slower while it is thrown up.
    float om = 0.32 / pow(a, 1.5);
    float phi = hitAngle + seed.z * 0.6 + om * s * (0.4 + 0.6 * up) + 0.12 * (w - 0.5);
    float thick = (0.25 + 0.5 * w) * exp(-s / 18.0) + 0.03 * (w - 0.5);
    // Up and down: a fan out of the struck spot, narrow at the ground and widening with
    // height, thickest in its middle and thinning to the edges (three of its own numbers
    // added, so it has no hard top or bottom: spread evenly, seen side-on it was a box).
    float g = (fract(w * 40.0) + fract(w * 91.7) + fract(w * 137.3) - 1.5) / 1.5;
    float fan = clamp((r - 1.0) / 1.2, 0.12, 1.0);
    p = vec3(cos(phi) * r, thick * fan * (g + 0.15 * sin(w * 40.0 + s * 0.3)), sin(phi) * r);
    heat = exp(-s / (45.0 + 30.0 * w));
    // The end of the disc: beyond Roche's limit into the Moon, within it down onto the Earth.
    float k = ease((T - mix(moonWhen.x, moonWhen.y, w * 0.8)) / 6.0);
    if (a > 2.9) {
      vec3 near = moonAt + 0.35 * vec3(cos(w * 70.0), (w - 0.5) * 0.6, sin(w * 70.0)) * (1.0 - k);
      p = mix(p, near, k);
    } else {
      p = mix(p, normalize(p + vec3(0.0, 0.001, 0.0)) * 1.0, k);
    }
    show *= 1.0 - step(0.999, k);
  }
  vHeat = heat;
  vShow = show;
  vec4 c = viewProjection * vec4(p, 1.0);
  gl_Position = c;
  float d = length(eye - p);
  gl_PointSize = show * clamp(pixel * (0.02 + 0.03 * seed.w) / d, 1.5, 12.0);
}`;
Effect.ShadersStore.theiaDustFragmentShader = `
precision highp float;
varying float vHeat;
varying float vShow;
uniform float bright;
void main() {
  if (vShow < 0.5) discard;
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  if (r > 1.0) discard;
  float soft = (1.0 - r) * (1.0 - r);
  vec3 hot = vec3(1.0, 0.85, 0.55), warm = vec3(1.0, 0.42, 0.1), cool = vec3(0.45, 0.12, 0.05);
  vec3 c = mix(cool, mix(warm, hot, smoothstep(0.55, 0.95, vHeat)), smoothstep(0.1, 0.55, vHeat));
  gl_FragColor = vec4(c * soft * bright * (0.35 + 0.65 * vHeat), 1.0);
}`;

// The sky: stars, a faint band of the Milky Way, and the Sun's glow toward SUN.
Effect.ShadersStore.theiaSkyVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() { vDir = position; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.theiaSkyFragmentShader = `
precision highp float;
varying vec3 vDir;
uniform vec3 sunDir;
uniform float pix;
${NOISE}
void main() {
  vec3 d = normalize(vDir);
  vec3 col = vec3(0.0);
  // Stars, of a fixed size on the screen however wide the view.
  vec3 g = d * 260.0;
  vec3 c = floor(g);
  float h = h31(c);
  if (h > 0.985) {
    vec3 at = c + 0.5 + 0.35 * (vec3(h31(c + 1.7), h31(c + 3.1), h31(c + 5.3)) - 0.5);
    float dist = length(g - at) / 260.0;
    float b = pow((h - 0.985) / 0.015, 3.0);
    col += mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.7), h31(c + 9.0)) * b * smoothstep(pix * 1.6, 0.0, dist) * 1.4;
  }
  // The Milky Way: a soft band, a tilted great circle.
  float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.9, 0.3))) / 0.22, 2.0));
  col += vec3(0.5, 0.48, 0.55) * band * (0.04 + 0.05 * fbm(d * 7.0));
  // The Sun's light round its way.
  float s = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.85, 0.65) * (pow(s, 600.0) * 3.0 + pow(s, 40.0) * 0.08);
  gl_FragColor = vec4(col, 1.0);
}`;

// A glow card facing the eye (the flash of the blow).
Effect.ShadersStore.theiaGlowVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.theiaGlowFragmentShader = `
precision highp float;
varying vec2 vUV;
uniform vec3 tint;
uniform float power;
void main() {
  float r = length(vUV - 0.5) * 2.0;
  float g = (exp(-r * r * 6.0) + 0.25 * exp(-r * 2.5)) * smoothstep(1.0, 0.6, r);
  gl_FragColor = vec4(tint * g * power, 1.0);
}`;

export function createTheiaStage(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);
  const camera = new FreeCamera('theiaEye', new Vector3(0, 2, -9), scene);
  camera.minZ = 0.02;
  camera.maxZ = 5000;
  camera.fov = 0.8;
  camera.inputs.clear();

  const base = import.meta.env?.BASE_URL ?? './';
  const skyMat = new ShaderMaterial('theiaSkyMat', scene, { vertex: 'theiaSky', fragment: 'theiaSky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'sunDir', 'pix'] });
  skyMat.backFaceCulling = false;
  skyMat.setVector3('sunDir', SUN);
  const sky = CreateSphere('theiaSky', { diameter: 4000, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  sky.material = skyMat;
  sky.infiniteDistance = true;

  const worldMat = (name, rock, mapSrc) => {
    const m = new ShaderMaterial(name, scene, { vertex: 'theiaWorld', fragment: 'theiaWorld' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'sunDir', 'eye', 'heat', 'today', 'ocean', 'time', 'rock', 'hitDir', 'hit', 'dentDir', 'dent', 'flatDir', 'flatCut'], samplers: ['map'] });
    m.setVector3('dentDir', new Vector3(1, 0, 0));
    m.setVector4('dent', new Vector4(0, 0, 0, 0));
    m.setVector3('flatDir', new Vector3(1, 0, 0));
    m.setFloat('flatCut', 1);
    m.setFloat('ocean', 0);
    m.setVector3('sunDir', SUN);
    m.setColor3('rock', rock);
    m.setFloat('heat', 0);
    m.setFloat('today', 0);
    m.setFloat('hit', 0);
    m.setVector3('hitDir', new Vector3(1, 0, 0));
    m.setTexture('map', new Texture(`${base}${mapSrc}`, scene, false, false));
    return m;
  };
  const earth = CreateSphere('theiaEarth', { diameter: 2, segments: 96 }, scene);
  const earthMat = worldMat('theiaEarthMat', new Color3(0.32, 0.27, 0.24), 'assets/earth-day.webp');
  earth.material = earthMat;
  const theia = CreateSphere('theiaBody', { diameter: 2 * THEIA_R, segments: 64 }, scene);
  const theiaMat = worldMat('theiaBodyMat', new Color3(0.4, 0.33, 0.27), 'assets/planets/moon.webp');
  theia.material = theiaMat;
  const moon = CreateSphere('theiaMoon', { diameter: 2 * MOON_R, segments: 64 }, scene);
  const moonMat = worldMat('theiaMoonMat', new Color3(0.42, 0.4, 0.38), 'assets/planets/moon.webp');
  moon.material = moonMat;

  // The grains.
  const N = 14000;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(N * 3), seeds = new Float32Array(N * 4), ind = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    // Most of the disc within Roche's limit; a third beyond it, out of which the Moon comes.
    const a = rnd() < 0.62 ? 1.15 + 1.75 * rnd() ** 1.4 : 2.95 + 2.2 * rnd();
    seeds.set([a, 0.4 + 9 * rnd() ** 1.6, rnd(), rnd()], i * 4);
    ind[i] = i;
  }
  const dust = new Mesh('theiaDust', scene);
  const vd = new VertexData();
  vd.positions = pos;
  vd.indices = ind;
  vd.applyToMesh(dust);
  dust.setVerticesData('seed', seeds, false, 4);
  dust.alwaysSelectAsActiveMesh = true;
  const dustMat = new ShaderMaterial('theiaDustMat', scene, { vertex: 'theiaDust', fragment: 'theiaDust' }, { attributes: ['position', 'seed'], uniforms: ['viewProjection', 'eye', 'T', 'impact', 'hitAt', 'hitAngle', 'moonAt', 'moonWhen', 'pixel', 'bright'], needAlphaBlending: true });
  dustMat.fillMode = Constants.MATERIAL_PointFillMode;
  dustMat.alphaMode = Constants.ALPHA_ADD;
  dustMat.disableDepthWrite = true;
  dustMat.setFloat('impact', THEIA.impact);
  dustMat.setVector2('moonWhen', { x: THEIA.moon[0] + 4, y: THEIA.moon[0] + 32 });
  dust.material = dustMat;

  const flash = CreatePlane('theiaFlash', { size: 1 }, scene);
  flash.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const flashMat = new ShaderMaterial('theiaFlashMat', scene, { vertex: 'theiaGlow', fragment: 'theiaGlow' }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'tint', 'power'], needAlphaBlending: true });
  flashMat.alphaMode = Constants.ALPHA_ADD;
  flashMat.disableDepthWrite = true;
  flashMat.backFaceCulling = false;
  flashMat.setColor3('tint', new Color3(1, 0.8, 0.55));
  flash.material = flashMat;

  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const vlerp = (a, b, k) => Vector3.Lerp(a, b, k);

  // Theia's way in: in the Earth's equator plane on a straight line that misses the
  // Earth's middle, so it strikes the edge at 45 degrees and slides on round the way the
  // thrown rock goes (the user, 2026-11-24, of it coming straight at the middle: "저렇게
  // 정면 출돌하면, 다 없어지지않을까? 살짝 빗겨서 맞춰").
  const hitAngle = 2.3;
  const hitDir = new Vector3(Math.cos(hitAngle), 0, Math.sin(hitAngle));
  const TOUCH = 1 + THEIA_R * 0.7;
  const along = new Vector3(-Math.sin(hitAngle), 0, Math.cos(hitAngle)); // round the Earth, as the arm goes
  const way = hitDir.scale(-Math.SQRT1_2).add(along.scale(Math.SQRT1_2)); // 45 degrees off straight in
  const touchAt = hitDir.scale(TOUCH);
  const theiaAt = (T) => {
    const s = THEIA.impact - T; // seconds before the touch
    if (s <= 0) {
      // On along its way, grinding into the Earth's side as it goes, over 8 s (drawn as
      // shrinking and pressed flat).
      const k = smooth(0, 8, -s);
      const on = touchAt.add(way.scale(0.9 * Math.sqrt(k)));
      return on.normalize().scale(lerp(TOUCH, 0.75, k));
    }
    // Slowing a little as it nears (the pull of the Earth drawn the other way round: it
    // is quicker far off, so the last seconds can be watched).
    return touchAt.subtract(way.scale(0.2 * s + 0.004 * s * s)).add(new Vector3(0, 0.005 * s, 0));
  };
  // The Moon: gathering at 3.8 radii, then drawing away (hundreds of millions of years in
  // seconds) to where it is today, 60 radii, the month lengthening as it goes.
  const moonOrbit = (T) => {
    const k = smooth(THEIA.recede[0] + 4, THEIA.recede[1], T);
    return lerp(MOON_FROM, 60, Math.pow(k, 1.6));
  };
  // Where round its way the Moon is: counted back from the end, where it stands a little
  // aside of straight behind the Earth from the Sun (full, beside the Earth's lit face).
  // (Kepler: a month of 5.4 days at 3.8 radii drawn as 14 s, lengthening as R^1.5.)
  const phaseEnd = Math.atan2(-SUN.z, -SUN.x) + 0.35;
  const phaseAt = (T) => {
    let left = 0;
    const steps = 120, from = Math.max(T, THEIA.moon[0] - 20);
    for (let i = 0; i < steps; i++) {
      const t = from + ((THEIA.end - from) * (i + 0.5)) / steps;
      left += ((THEIA.end - from) / steps) * (2 * Math.PI / 14) * Math.pow(MOON_FROM / moonOrbit(t), 1.5);
    }
    return phaseEnd - left - Math.max(0, THEIA.moon[0] - 20 - T) * (2 * Math.PI / 14);
  };

  function update(T) {
    const R = moonOrbit(T);
    const moonPhase = phaseAt(T);
    const moonAt = new Vector3(Math.cos(moonPhase) * R, 0.0, Math.sin(moonPhase) * R);

    // Theia.
    const tp = theiaAt(T);
    theia.position.copyFrom(tp);
    const gone = smooth(THEIA.impact + 1, THEIA.impact + 9, T);
    // Pressed flat against the Earth as it goes in, the rest of it shrinking away.
    theia.scaling.setAll(Math.max(0.001, 1 - 0.7 * smooth(THEIA.impact + 3, THEIA.impact + 9, T)));
    theiaMat.setVector3('flatDir', tp.scale(-1).normalize());
    theiaMat.setFloat('flatCut', 1 - 2.2 * smooth(THEIA.impact - 0.4, THEIA.impact + 7, T));
    theia.setEnabled(gone < 0.999);
    theiaMat.setFloat('heat', smooth(THEIA.impact - 0.5, THEIA.impact + 3, T));
    theiaMat.setVector3('hitDir', hitDir.scale(-1));
    theiaMat.setFloat('hit', smooth(THEIA.impact - 0.3, THEIA.impact, T) * (1 - gone));

    // The Earth: molten from the blow, cooling through the last part, then today's.
    const heat = smooth(THEIA.impact, THEIA.impact + 6, T) * (1 - smooth(THEIA.recede[0], THEIA.recede[0] + 30, T));
    earthMat.setFloat('heat', heat);
    // Cooled black, then the first seas (some hundred million years on), then today's map.
    earthMat.setFloat('ocean', smooth(THEIA.recede[0] + 26, THEIA.recede[0] + 36, T));
    earthMat.setFloat('today', smooth(THEIA.recede[0] + 40, THEIA.recede[0] + 52, T));
    // The hollow the blow makes, filling in again as the molten rock flows back.
    const since = T - THEIA.impact;
    earthMat.setVector3('dentDir', hitDir);
    earthMat.setVector4('dent', new Vector4(since > 0 ? 0.16 * smooth(0, 3, since) * (1 - smooth(6, 22, since)) : 0, Math.max(0, since), since > 0 ? 0.035 * smooth(0, 1.5, since) : 0, 0));
    earthMat.setVector3('hitDir', hitDir);
    earthMat.setFloat('hit', smooth(THEIA.impact - 0.2, THEIA.impact + 0.5, T) * (1 - smooth(THEIA.impact + 2, THEIA.impact + 14, T)));
    // A day of 5 hours then, 24 today: drawn turning once in 20 s, then once in 60.
    earth.rotation.y = -T * (2 * Math.PI) / lerp(20, 60, smooth(THEIA.recede[0], THEIA.recede[1], T));

    // The Moon: from a glowing knot to a cooled grey ball, then today's face.
    const born = smooth(THEIA.moon[0] + 6, THEIA.moon[0] + 30, T);
    moon.setEnabled(born > 0.001);
    moon.scaling.setAll(Math.max(0.001, Math.pow(born, 0.6)));
    moon.position.copyFrom(moonAt);
    // (Small, it cools faster than the Earth: a crust within some thousand years.)
    moonMat.setFloat('heat', 0.85 * (1 - smooth(THEIA.moon[0] + 24, THEIA.moon[1] + 4, T)));
    moonMat.setFloat('today', smooth(THEIA.recede[0] + 40, THEIA.recede[0] + 52, T));
    // It turns to keep one face toward the Earth.
    moon.rotation.y = -moonPhase + Math.PI;

    // The flash of the blow.
    const f = smooth(THEIA.impact - 0.3, THEIA.impact + 0.2, T) * (1 - smooth(THEIA.impact + 0.5, THEIA.impact + 6, T));
    flash.setEnabled(f > 0.001);
    flash.position.copyFrom(hitDir.scale(1.05));
    flash.scaling.setAll(0.8 + 2 * smooth(THEIA.impact, THEIA.impact + 4, T));
    flashMat.setFloat('power', f * 1.0);

    // Where the eye is.
    const eye = cameraAt(T, tp, moonAt, R);
    camera.position.copyFrom(eye.at);
    camera.setTarget(eye.look);
    camera.fov = eye.fov;

    for (const m of [earthMat, theiaMat, moonMat]) {
      m.setVector3('eye', camera.position);
      m.setFloat('time', T);
    }
    skyMat.setFloat('pix', camera.fov / Math.max(1, engine.getRenderHeight()));
    dustMat.setVector3('eye', camera.position);
    dustMat.setFloat('T', T);
    dustMat.setVector3('hitAt', hitDir.scale(1.02));
    dustMat.setFloat('hitAngle', hitAngle);
    dustMat.setVector3('moonAt', moonAt);
    dustMat.setFloat('pixel', engine.getRenderHeight() / camera.fov);
    dustMat.setFloat('bright', 1.1);
    dust.setEnabled(T > THEIA.impact - 1 && T < THEIA.moon[1] + 4);
    scene.resetCachedMaterial();
    scene.render();
  }

  // The eye's way through it all: off to the side as Theia comes; close by the blow; high
  // over the arm as it wraps round; low over the disc; beside the new Moon; out and back to
  // see the two of them as they are today.
  function cameraAt(T, tp, moonAt, R) {
    const polar = (ang, r, y) => new Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
    const keys = [
      // (From behind Theia as it sets off, the Earth far ahead.)
      { t: 0, at: touchAt.subtract(way.scale(17)).add(new Vector3(0, 1.2, 0)), look: touchAt, fov: 0.75 },
      // (The blow seen from above its side, so Theia's way missing the Earth's middle shows,
      // and the hollow and Theia pressed flat.)
      { t: THEIA.impact - 10, at: null, look: null, fov: 0.75 },
      { t: THEIA.impact - 4, at: polar(hitAngle - 0.75, 3.6, 4.6), look: polar(hitAngle - 0.15, 1.4, 0), fov: 0.75 },
      { t: THEIA.impact + 2, at: polar(hitAngle - 0.5, 3.2, 4.0), look: hitDir.scale(1.1), fov: 0.75 },
      { t: THEIA.arms[0] + 14, at: new Vector3(-3, 9, 3.5), look: new Vector3(0, 0, 0.3), fov: 0.85 },
      { t: THEIA.arms[1], at: new Vector3(2, 11, 7), look: new Vector3(0, 0, 0), fov: 0.85 },
      { t: THEIA.disc[0] + 22, at: new Vector3(9, 2.2, 4), look: new Vector3(0, -0.2, 0), fov: 0.8 },
      { t: THEIA.disc[1], at: new Vector3(7.5, 1.3, -5), look: new Vector3(0, 0, 0), fov: 0.8 },
      { t: THEIA.moon[1] - 6, at: null, look: null, fov: 0.75 },
      { t: THEIA.recede[0] + 18, at: new Vector3(4, 2.5, -14), look: new Vector3(0, 0, 0), fov: 0.7 },
      { t: THEIA.recede[1], at: new Vector3(3, 1.2, -6.5), look: new Vector3(0, 0, 0), fov: 0.75 },
      { t: THEIA.end, at: new Vector3(3, 1.2, -6.5), look: new Vector3(0, 0, 0), fov: 0.75 },
    ];
    // Coming in: just behind Theia and above, so it stays in sight with the Earth ahead.
    // Then, over the last seconds, up over the blow (the next key).
    const chase = (p) => ({ at: p.subtract(way.scale(4)).add(new Vector3(0, 0.7, 0)), look: Vector3.Lerp(p, touchAt, 0.3) });
    Object.assign(keys[0], chase(tp));
    Object.assign(keys[1], chase(theiaAt(Math.min(T, THEIA.impact - 10))));
    // Beside the Moon as it gathers: outside its way and above, the Earth beyond it.
    const out = moonAt.clone().normalize();
    const along = Vector3.Cross(Vector3.Up(), out);
    keys[8].at = moonAt.add(out.scale(3.6)).add(new Vector3(0, 2.2, 0)).add(along.scale(-1.8));
    keys[8].look = Vector3.Lerp(moonAt, Vector3.Zero(), 0.3);
    keys[8].fov = 0.85;
    // As it draws off: on the Sun's side of the Earth, the Moon beyond it and aside, full,
    // growing small; at the end, today's two.
    const sunSide = (d, up) => SUN.scale(d).add(new Vector3(0, up, 0));
    keys[9].at = sunSide(11, 3);
    keys[9].look = moonAt.scale(0.35);
    // Far off at the end (60 radii): from behind the Earth, a little aside, so the Moon stands
    // just past the Earth's edge, small, full (it ends a little aside of opposite the Sun).
    keys[10].at = out.scale(-7).add(along.scale(1.7)).add(new Vector3(0, 0.6, 0));
    keys[10].look = out.scale(2.2);
    keys[10].fov = 0.62;
    keys[11].at = keys[10].at;
    keys[11].look = keys[10].look;
    keys[11].fov = 0.62;
    let i = 0;
    while (i < keys.length - 2 && T > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1];
    const k = smooth(a.t, b.t, T);
    void R;
    const ra = a.at.length(), rb = b.at.length();
    const at = vlerp(a.at.scale(1 / ra), b.at.scale(1 / rb), k).normalize().scale(lerp(ra, rb, k));
    let look = vlerp(a.look, b.look, k), fov = lerp(a.fov, b.fov, k);
    // Once the Moon has formed, both always in the view: aimed between them, wide enough
    // for the two with a margin (it went out of the view as it drew off).
    const both = smooth(THEIA.moon[1] - 8, THEIA.moon[1], T) * (1 - smooth(THEIA.recede[0] + 18, THEIA.recede[0] + 32, T));
    if (both > 0) {
      const toE = Vector3.Zero().subtract(at).normalize(), toM = moonAt.subtract(at).normalize();
      const mid = toE.add(toM).normalize();
      const sep = Math.acos(Math.min(1, Vector3.Dot(toE, toM)));
      const eAng = Math.asin(Math.min(1, 1 / Vector3.Distance(at, Vector3.Zero())));
      const want = at.add(mid.scale(5));
      look = vlerp(look, want, both);
      // (fov is the view's height; the phone's view is narrower than it is tall.)
      const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
      fov = lerp(fov, Math.max(fov, ((sep + 2 * eAng) * 1.25) / Math.min(1, aspect)), both);
    }
    return { at, look, fov: Math.min(fov, 1.6) };
  }

  return {
    update,
    scene,
    resize: () => engine.resize(),
    dispose: () => engine.dispose(),
  };
}
