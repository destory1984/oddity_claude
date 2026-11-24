import { Engine, Scene, FreeCamera, Vector2, Vector3, Color3, Color4, CreateSphere, CreatePlane, CreateBox, CreateCylinder, CreateGround, TransformNode, ShaderMaterial, Effect, Texture, DynamicTexture, StandardMaterial, Mesh, VertexData, DirectionalLight, HemisphericLight, Constants } from './babylon.js';

// A walk on Mars along Perseverance's own wheel tracks in Jezero crater (the user,
// 2026-11-23: "화성 탐사선이 이동하면서 보낸 사진들을 모아서, 화성 산책하는 것 같은 3D 모션",
// "가+나로 만들어"): from where she landed (18 February 2021) to Van Zyl Overlook, where she
// watched Ingenuity's first flight (19 April 2021), 265 m. A little world of its own drawn on
// a canvas over the game's while the course runs:
//   - the ground from HiRISE (NASA/JPL/University of Arizona, USGS): heights from the stereo
//     model DTEEC_045994_1985_046060_1985_U01 (1 m), the look from the orthophoto
//     ESP_046060_1985_RED_A_01 (25 cm), 600 m round the walk, and 7 km round it coarser;
//   - the path: the rover's localized traverse from NASA's map of her (mars.nasa.gov);
//   - at both ends, her own 360-degree Mastcam-Z panoramas (PIA24264, sol 3, at the landing
//     site; PIA24663, Van Zyl Overlook), wrapped round the eye, the 3D ground showing under
//     their foot; where NASA masked parts of the rover out (black), the holes filled with
//     the same rows' ground from further round (the user, 2026-11-24: "네모 조각 고쳐").
// In metres, y up, x east, z north; the origin at 77.4516 E, 18.4448 N, height 0 at 2,569 m
// under Mars's datum. Course seconds (t) as in MARS_WALK.

// Where she stopped and when (the waypoint each sol's drive ended at; sol 13: the landing
// site itself). The path between, thinned to 1.5 m: [east, north, sol].
const PATH = [[-40.2,-10.3,14],[-40.2,-10.3,14],[-38.8,-13.4,14],[-37.0,-14.7,14],[-36.6,-15.4,14],[-37.0,-14.8,14],[-38.0,-12.9,15],[-38.0,-11.0,15],[-37.5,-9.0,15],[-37.0,-6.8,15],[-36.5,-4.4,15],[-36.0,-1.9,15],[-35.6,0.8,15],[-35.2,3.4,15],[-34.7,6.2,15],[-34.3,8.8,15],[-33.8,11.5,15],[-33.4,14.1,15],[-33.0,16.6,15],[-32.4,19.3,15],[-31.8,19.9,16],[-29.8,20.4,16],[-27.4,21.1,16],[-24.9,22.0,16],[-22.5,22.9,16],[-20.0,23.9,16],[-17.6,24.8,16],[-15.2,25.8,16],[-12.6,26.7,16],[-10.2,27.6,16],[-7.8,28.2,16],[-5.8,28.5,16],[-3.5,28.3,20],[-1.2,28.0,20],[1.1,27.3,20],[3.4,26.4,20],[5.5,25.4,20],[7.4,24.4,20],[9.3,23.3,20],[11.2,22.1,20],[13.0,21.2,20],[14.4,20.7,20],[13.3,21.6,23],[11.6,22.8,23],[10.0,23.8,23],[11.4,22.6,29],[12.5,21.6,29],[10.8,22.6,31],[8.6,23.8,31],[6.6,24.9,31],[4.5,25.9,31],[2.2,26.5,31],[-0.1,26.9,31],[-2.5,26.9,31],[-4.8,26.6,31],[-7.0,26.2,31],[-9.3,25.6,31],[-11.5,24.6,31],[-13.6,23.6,31],[-15.1,22.5,31],[-15.6,20.2,32],[-16.0,17.6,32],[-16.5,15.1,32],[-17.0,12.6,32],[-17.6,10.0,32],[-18.2,7.6,32],[-18.8,5.1,32],[-19.5,2.6,32],[-20.2,0.1,32],[-21.0,-2.4,32],[-21.9,-4.6,32],[-22.7,-5.9,32],[-24.9,-5.6,33],[-27.3,-4.9,33],[-29.8,-4.0,33],[-32.2,-3.1,33],[-32.4,-2.8,33],[-32.4,-0.6,34],[-32.5,1.9,34],[-32.5,3.7,34],[-32.4,5.9,43],[-32.4,8.3,43],[-32.6,8.5,44],[-31.0,6.8,47],[-29.0,5.1,47],[-26.9,3.6,47],[-24.7,2.4,47],[-22.4,1.4,47],[-20.0,0.7,47],[-17.6,0.1,47],[-15.1,-0.4,47],[-12.5,-0.7,47],[-10.0,-0.9,47],[-7.6,-1.1,47],[-5.2,-1.2,47],[-4.0,-1.2,47],[-1.8,-0.4,48],[0.6,0.4,48],[3.0,1.2,48],[5.4,2.0,48],[7.8,2.8,48],[10.2,3.6,48],[12.3,4.2,48],[14.6,3.6,49],[16.9,2.7,49],[19.1,1.6,49],[21.3,0.6,49],[23.6,-0.3,49],[25.6,-1.1,52],[27.7,-1.9,52],[29.6,-2.5,52],[30.4,-2.8,52]];

// The course's seconds (courses.js keeps its captions to these): the landing-site panorama,
// the walk at a slow stroll's pace, Van Zyl Overlook's panorama (the user, 2026-11-23:
// "움직이는걸 전체적으로 좀 느리게 해.. 지금의 절반": all of it half as fast as at first,
// but for Ingenuity's flight, which keeps its own 39 seconds).
const SPEED = 0.75;
// At Van Zyl Overlook: her panorama, then a turn toward Ingenuity, 63 m off, the view drawn
// in as her mast camera's was (the user, 2026-11-23: "바퀴 자국이랑 헬리콥터 넣어"), its
// first flight in its own 39 seconds (19 April 2021: up to 3 m, a turn of 96 degrees in the
// hover, down), and out to the panorama again.
const WALK_FROM = 40;
const WALK_END = WALK_FROM + 264.8 / SPEED;
export const MARS_WALK = { panoA: [0, WALK_FROM], walkFrom: WALK_FROM, speed: SPEED, lengthM: 264.8, walkEnd: WALK_END, panoB: [WALK_END, WALK_END + 82],
  fly: { look: [WALK_END + 12, WALK_END + 20], spin: [WALK_END + 19, WALK_END + 23], takeoff: WALK_END + 23, land: WALK_END + 62.1, back: [WALK_END + 64, WALK_END + 72] },
  // Then on to evening, hours gone by in a few seconds (the user, 2026-11-23: "화성 석양
  // 화성 산책에 넣어", "좀 더 극적인 광경은 없나?", "가,나,다,라로 만들어"), its seconds
  // from sunset[0]: dust devils across the plain against the low Sun (4 to 30), the Sun
  // drawn in on while Phobos crosses it (36 to 76, as Perseverance filmed on 2 April 2022),
  // the Sun setting in the blue glow Mars's fine dust makes (82 to 118, Curiosity's
  // PIA19400), high clouds shining like mother-of-pearl after it (110 to 150, as Curiosity
  // saw in 2021), and the stars, with Earth and the Moon low in the west (from 132); then
  // night (the user: "포보스랑 초록 오로라 넣어"): Phobos rising in the west, a lit sliver of
  // it drawn in on (180 to 232), and the faint green glow over the whole sky that
  // Perseverance saw in March 2024, the first aurora seen from the ground of Mars (228 on).
  sunset: [WALK_END + 82, WALK_END + 354] };
// Where Ingenuity was set down (the rover's stop of sol 34, 3/1392: she let it go under her
// belly on sol 43 and drove 4.6 m on), and where it shows: once she has driven off it.
const HELI = [-32.5, 3.7], HELI_SHOWN_FROM = 184;
const FADE = 5;
// Each panorama: where it was taken, what bearing (degrees east of north) its left edge
// looks to, and how high its top and bottom edges stand (degrees above the horizon); the
// bearings judged from the rover's deck in them and her heading (the map's yaw) there.
const PANOS = [
  { src: 'assets/mars/pia24264.webp', at: [-40.2, -10.3], left: 81, top: 8, bottom: -87.5, eye: 2.1 },
  { src: 'assets/mars/pia24663.webp', at: [30.4, -2.8], left: 320, top: 9, bottom: -71, eye: 2.1 },
];
const NEAR = 300, FAR = 3500;

Effect.ShadersStore.marsGroundVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec2 vUV;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vW = w.xyz; vUV = uv; vN = normal;
  gl_Position = viewProjection * w;
}`;
Effect.ShadersStore.marsGroundFragmentShader = `
precision highp float;
varying vec2 vUV;
varying vec3 vN;
varying vec3 vW;
uniform sampler2D photo;
uniform sampler2D grain;
uniform sampler2D gravel;
uniform vec3 sunDir;
uniform vec3 eye;
uniform vec3 haze;
uniform float hole;
uniform float zoom;
uniform float sunK; // the Sun's strength
uniform float skyK; // the sky's
void main() {
  if (hole > 0.0 && abs(vW.x) < hole && abs(vW.z) < hole) discard;
  float d = length(vW - eye);
  float g = texture2D(photo, vUV).r;
  // Grain finer than the orbiter can see: sand, pebbles, small shadows, strongest close by.
  // (Only in the colour, two sizes at odd angles so that the tiles do not show; as bumps
  // they made a quilt.)
  // (Detail by how near it looks: drawn in on the helicopter, far ground looks near.)
  float dz = d * zoom;
  float near = 1.0 - smoothstep(8.0, 60.0, dz);
  vec2 p1 = mat2(0.83, -0.56, 0.56, 0.83) * vW.xz / 3.1, p2 = mat2(0.36, 0.93, -0.93, 0.36) * vW.xz / 0.73;
  float fine = (texture2D(grain, p1).r - 0.5) * 0.7 + (texture2D(grain, p2).r - 0.5) * 0.5;
  g = clamp(g + fine * 0.16 * near, 0.0, 1.0);
  vec3 dark = vec3(0.28, 0.17, 0.105), light = vec3(0.90, 0.64, 0.45);
  vec3 alb = mix(dark, light, g);
  // Gravel too small to make one by one, painted lit and shaded, in two sizes.
  float close = 1.0 - smoothstep(4.0, 30.0, dz);
  vec4 s1 = texture2D(gravel, vW.xz / 1.7), s2 = texture2D(gravel, vW.xz / 2.9 + 0.37);
  alb = mix(alb, s1.rgb * (0.6 + 0.8 * g), s1.a * close * 0.7);
  alb = mix(alb, s2.rgb * (0.6 + 0.8 * g), s2.a * close * 0.5);
  vec3 n = normalize(vN);
  float sun = max(dot(n, sunDir), 0.0);
  vec3 col = alb * (vec3(1.0, 0.93, 0.84) * sun * sunK + vec3(0.62, 0.48, 0.38) * (0.55 + 0.45 * n.y) * skyK);
  float f = 1.0 - exp(-d / 2600.0);
  col = mix(col, haze, clamp(f * 1.1, 0.0, 0.92));
  gl_FragColor = vec4(col, 1.0);
}`;
// Her wheel tracks: ribbons along the path whose v is the distance along it, shown only as
// far as she has driven (upTo).
Effect.ShadersStore.marsTrackVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec2 vUV;
varying vec3 vW;
void main() {
  vec4 w = world * vec4(position, 1.0);
  vW = w.xyz; vUV = uv;
  gl_Position = viewProjection * w;
}`;
Effect.ShadersStore.marsTrackFragmentShader = `
precision highp float;
varying vec2 vUV;
varying vec3 vW;
uniform sampler2D tread;
uniform float upTo;
uniform vec3 sunDir;
uniform vec3 eye;
uniform vec3 haze;
uniform float zoom;
uniform float sunK;
uniform float skyK;
void main() {
  if (vUV.y > upTo) discard;
  vec4 c = texture2D(tread, vec2(vUV.x, vUV.y / 0.5));
  float d = length(vW - eye);
  float sun = max(sunDir.y, 0.0);
  vec3 col = c.rgb * (vec3(1.0, 0.93, 0.84) * sun * sunK + vec3(0.62, 0.48, 0.38) * skyK);
  col = mix(col, haze, clamp((1.0 - exp(-d / 2600.0)) * 1.1, 0.0, 0.92));
  gl_FragColor = vec4(col, c.a * (1.0 - smoothstep(50.0, 140.0, d * zoom)));
}`;
Effect.ShadersStore.marsSkyVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() { vDir = position; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.marsSkyFragmentShader = `
precision highp float;
varying vec3 vDir;
uniform vec3 sunDir;
uniform vec3 haze;
uniform vec3 zenith;
uniform float dusk;
uniform float pix;     // radians a pixel, so points stay a pixel or two at any zoom
uniform float time;
uniform vec2 phobos;   // Phobos off the Sun's centre (radians, across and up)
uniform float clouds;  // the shining clouds
uniform float night;   // the stars
uniform vec3 earthDir;
uniform float earth;
uniform vec3 phobosDir;
uniform float phobosOn;
uniform float aurora;
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
// The angle between two directions, true when it is small.
float ang(vec3 a, vec3 b) { return atan(length(cross(a, b)), dot(a, b)); }
void main() {
  vec3 d = normalize(vDir);
  float up = clamp(d.y, 0.0, 1.0);
  // Butterscotch by day, paler and dustier toward the horizon; a small pale glow round the
  // Sun. At dusk grey, with a cold blue glow round the Sun that reaches up over it.
  vec3 col = mix(haze, zenith, pow(up, 0.55));
  float s = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.93, 0.82) * (pow(s, 900.0) * 3.0 + pow(s, 40.0) * 0.18) * (1.0 - smoothstep(0.05, 0.3, dusk));
  // (Wider across than up: the glow stands over the Sun in a pale column.)
  vec3 off = d - sunDir;
  float a = exp(-(off.x * off.x + off.z * off.z) * 40.0 - max(off.y, 0.0) * max(off.y, 0.0) * 6.0 - min(off.y, 0.0) * min(off.y, 0.0) * 60.0);
  col = mix(col, vec3(0.56, 0.68, 0.84), dusk * min(1.0, 0.85 * a + 0.4 * pow(s, 300.0)));
  // Darker all over once the Sun is down.
  col *= 1.0 - 0.6 * dusk * (1.0 - smoothstep(-0.07, 0.12, sunDir.y));
  col *= 1.0 - 0.55 * smoothstep(-0.12, -0.3, sunDir.y);
  // Drawn in on the Sun the camera is stopped down: the sky goes dark round it.
  col *= 1.0 - 0.93 * clamp((0.0004 - pix) / 0.00028, 0.0, 1.0) * (1.0 - night);
  // The stars, as the sky darkens.
  if (night > 0.0) {
    vec3 cell = floor(d * 150.0);
    float h = hash3(cell);
    if (h > 0.982) {
      vec3 sd = normalize((cell + vec3(hash3(cell + 1.3), hash3(cell + 2.7), hash3(cell + 5.1))) / 150.0);
      float b = (h - 0.982) / 0.018;
      col += vec3(0.9, 0.92, 1.0) * night * (0.25 + 0.75 * b * b) * smoothstep(1.5 * pix, 0.3 * pix, ang(d, sd)) * smoothstep(0.02, 0.12, d.y);
    }
  }
  // High thin clouds of ice still in sunlight after sunset: wisps of pearl with the colours
  // of mother-of-pearl in them, brightest toward the sunset.
  if (clouds > 0.0 && d.y > 0.03) {
    vec2 q = d.xz / (d.y + 0.12);
    q = vec2(q.x * 0.8 + q.y * 0.6, -q.x * 0.6 + q.y * 0.8) * vec2(1.4, 4.0) + vec2(time * 0.012, time * 0.003);
    float n = fbm(q);
    float m = smoothstep(0.56, 0.8, n) * smoothstep(0.03, 0.25, d.y);
    float hue = fbm(q * 1.6 + 4.0) * 2.2 + d.y * 1.3;
    vec3 irid = 0.55 + 0.45 * cos(6.2831 * (hue + vec3(0.0, 0.33, 0.67)));
    vec3 pearl = mix(vec3(0.82, 0.84, 0.9), irid, 0.22) * (0.5 + 0.4 * n);
    float toward = 0.55 + 0.45 * max(dot(normalize(d.xz), normalize(sunDir.xz)), 0.0);
    col = mix(col, pearl * toward, m * clouds * 0.7);
  }
  // The aurora: no curtains (Mars has no great magnetic field to gather it), the whole sky
  // faintly green, more so low down where the eye looks through more of the air, stirring.
  if (aurora > 0.0) {
    float wav = 0.8 + 0.2 * fbm(d.xz / (d.y + 0.3) * 1.5 + vec2(time * 0.02, -time * 0.013));
    col += vec3(0.22, 0.72, 0.36) * aurora * 0.22 * (0.55 + 0.45 * (1.0 - clamp(d.y, 0.0, 1.0))) * wav * smoothstep(-0.02, 0.06, d.y);
  }
  // Phobos by night: its lumpy shape, lit only on the side toward the Sun under the horizon.
  if (phobosOn > 0.0 && dot(d, phobosDir) > 0.0) {
    vec3 R3 = normalize(cross(vec3(0.0, 1.0, 0.0), phobosDir)), U3 = cross(phobosDir, R3);
    vec2 pe = vec2(dot(d, R3), dot(d, U3)) / vec2(0.0018, 0.00145);
    float e = length(pe);
    if (e < 2.0) {
      float an = atan(pe.y, pe.x);
      float lump = 1.0 + 0.07 * sin(3.0 * an + 1.0) + 0.05 * sin(5.0 * an + 2.3) + 0.03 * sin(9.0 * an);
      float body = smoothstep(lump + pix / 0.0016, lump - pix / 0.0016, e);
      float r = min(1.0, e / lump);
      vec3 n = normalize(vec3(pe / lump, sqrt(max(0.0, 1.0 - r * r))));
      vec3 L = normalize(vec3(dot(sunDir, R3), dot(sunDir, U3), -dot(sunDir, phobosDir)));
      float lit = max(dot(n, L), 0.0) * (0.8 + 0.2 * vnoise(pe * 5.0));
      col = mix(col, vec3(0.58, 0.52, 0.47) * (0.04 + 2.0 * lit), body * phobosOn);
    }
  }
  // The Sun's disc, two-thirds as wide as Earth's Sun (0.35 degrees), darker at its rim;
  // Phobos's lumpy shape on it when it crosses; a camera's glare round it when not drawn in.
  float th = ang(d, sunDir), rs = 0.00305;
  col += vec3(0.97, 0.98, 1.0) * 0.35 * smoothstep(0.1, 0.4, dusk) * exp(-th * th / 0.000012) * clamp((pix - 0.0002) / 0.0006, 0.0, 1.0);
  float disc = smoothstep(rs + pix, rs - pix, th);
  if (disc > 0.0) {
    vec3 R = normalize(cross(vec3(0.0, 1.0, 0.0), sunDir)), U = cross(sunDir, R);
    vec2 p = vec2(dot(d, R), dot(d, U)) - phobos;
    p = vec2(0.83 * p.x - 0.56 * p.y, 0.56 * p.x + 0.83 * p.y);
    float an = atan(p.y, p.x);
    float lump = 1.0 + 0.07 * sin(3.0 * an + 1.0) + 0.05 * sin(5.0 * an + 2.3) + 0.03 * sin(9.0 * an);
    float e = length(p / vec2(0.0018, 0.00145));
    float body = smoothstep(lump + pix / 0.0016, lump - pix / 0.0016, e);
    float limb = 0.72 + 0.28 * sqrt(max(0.0, 1.0 - (th / rs) * (th / rs)));
    vec3 sunCol = mix(vec3(1.0, 0.97, 0.92) * limb, vec3(0.07, 0.055, 0.05), body);
    col = mix(col, sunCol, disc);
  }
  // Earth, a blue star, and the Moon beside it.
  if (earth > 0.0) {
    float ae = ang(d, earthDir);
    col += vec3(0.62, 0.78, 1.0) * earth * (smoothstep(2.8 * pix, 0.8 * pix, ae) * 1.5 + exp(-ae / (6.0 * pix)) * 0.15);
    vec3 R2 = normalize(cross(vec3(0.0, 1.0, 0.0), earthDir)), U2 = cross(earthDir, R2);
    float am = ang(d, normalize(earthDir + R2 * 0.0026 + U2 * 0.0009));
    col += vec3(0.85, 0.85, 0.82) * earth * 0.6 * smoothstep(1.5 * pix, 0.3 * pix, am);
  }
  if (d.y < 0.0) col = haze;
  gl_FragColor = vec4(col, 1.0);
}`;
// A dust devil: a column of dust on a sheet that turns to face the eye, swirling, wider
// aloft and leaning, with a skirt of dust at its foot; backlit, brighter at its edges.
Effect.ShadersStore.marsDevilVertexShader = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.marsDevilFragmentShader = `
precision highp float;
varying vec2 vUV;
uniform float time;
uniform float seed;
uniform float fade;
uniform vec3 tint;
void main() {
  float y = vUV.y, x = vUV.x - 0.5;
  x -= 0.1 * y * y + 0.03 * sin(y * 7.0 + time * 1.3 + seed);
  float w = 0.13 + 0.33 * pow(y, 1.2);
  float core = 1.0 - smoothstep(w * 0.3, w, abs(x));
  float swirl = 0.75 + 0.25 * sin(y * 26.0 - time * 4.0 + x * 18.0 + seed);
  float body = smoothstep(0.0, 0.04, y) * (1.0 - smoothstep(0.6, 1.0, y));
  float skirt = (1.0 - smoothstep(0.0, 0.08, y)) * (1.0 - smoothstep(0.05, 0.22, abs(x)));
  float a = (core * swirl * body + skirt * 0.6) * fade;
  vec3 c = tint * (0.85 + 0.5 * smoothstep(w * 0.2, w, abs(x)));
  gl_FragColor = vec4(c, min(1.0, a * 0.85));
}`;
// A panorama wrapped round the eye: a bearing across, a height up and down; no picture (above
// its top, below its bottom, or black where the rover's deck was masked) lets the world show.
Effect.ShadersStore.marsPanoVertexShader = Effect.ShadersStore.marsSkyVertexShader;
Effect.ShadersStore.marsPanoFragmentShader = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 vDir;
uniform sampler2D pano;
uniform float left;
uniform float top;
uniform float bottom;
uniform float fade;
void main() {
  vec3 d = normalize(vDir);
  float bearing = degrees(atan(d.x, d.z));
  float up = degrees(asin(clamp(d.y, -1.0, 1.0)));
  // Across the picture's two ends u jumps from 1 to 0, and the texture's smallest mip was
  // read there: a thin line down the whole picture. Of two ways of counting u, the one
  // that does not jump at that spot (the other jumps half way round).
  float u1 = fract((bearing - left) / 360.0 + 2.0);
  float u2 = fract((bearing - left) / 360.0 + 2.5) - 0.5;
  float u = fwidth(u1) <= fwidth(u2) + 1e-6 ? u1 : u2;
  float v = (top - up) / (top - bottom);
  vec3 c = texture2D(pano, vec2(u, 1.0 - clamp(v, 0.0, 1.0))).rgb;
  // (The panoramas' top rows are a black edge: from just under it. Their black holes
  // where the rover was masked are filled with the ground round them in the pictures
  // themselves; under their foot the 3D ground shows.)
  float a = smoothstep(0.016, 0.07, v) * (1.0 - smoothstep(0.985, 1.0, v));
  gl_FragColor = vec4(c, a * fade);
}`;

// One wheel's track, 0.42 m across and 0.5 m along: packed sand a shade darker, the
// wheel's curved cleats pressed across it every 3.4 cm, a low pale ridge either side.
function paintTread(g, w, h) {
  g.clearRect(0, 0, w, h);
  const band = g.createLinearGradient(0, 0, w, 0);
  band.addColorStop(0, 'rgba(200,146,104,0)');
  band.addColorStop(0.08, 'rgba(196,142,102,0.25)');
  band.addColorStop(0.16, 'rgba(105,64,42,0.45)');
  band.addColorStop(0.5, 'rgba(98,60,40,0.5)');
  band.addColorStop(0.84, 'rgba(105,64,42,0.45)');
  band.addColorStop(0.92, 'rgba(196,142,102,0.25)');
  band.addColorStop(1, 'rgba(200,146,104,0)');
  g.fillStyle = band;
  g.fillRect(0, 0, w, h);
  const n = 15;
  for (let k = 0; k < n; k++) {
    const y = ((k + 0.5) / n) * h;
    g.strokeStyle = 'rgba(70,40,25,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(w * 0.17, y + 3);
    g.quadraticCurveTo(w * 0.5, y - 4, w * 0.83, y + 3);
    g.stroke();
    g.strokeStyle = 'rgba(190,135,95,0.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(w * 0.17, y + 5);
    g.quadraticCurveTo(w * 0.5, y - 2, w * 0.83, y + 5);
    g.stroke();
  }
}

// Ingenuity (1.8 kg, 0.49 m tall): a small box of a body on four thin legs, two rotors of
// 1.2 m one over the other on a mast, the solar panel on top. y = 0 under its feet.
function buildHeli(scene) {
  const root = new TransformNode('heli', scene);
  const mat = (name, c, spec = 0.1) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = new Color3(...c);
    m.specularColor = new Color3(spec, spec, spec);
    return m;
  };
  const body = mat('heliBody', [0.78, 0.76, 0.72], 0.25);
  const dark = mat('heliDark', [0.12, 0.12, 0.13], 0.2);
  const gold = mat('heliGold', [0.75, 0.55, 0.25], 0.3);
  const casters = [];
  const part = (m, material, parent = root) => { m.material = material; m.parent = parent; m.isPickable = false; casters.push(m); return m; };
  const box = part(CreateBox('heliBox', { width: 0.136, height: 0.163, depth: 0.195 }, scene), body);
  box.position.y = 0.17;
  const foot = part(CreateBox('heliBoxFoot', { width: 0.14, height: 0.012, depth: 0.2 }, scene), gold);
  foot.position.y = 0.09;
  // The legs: from the body's lower corners out and down to the ground.
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const from = new Vector3(sx * 0.06, 0.13, sz * 0.08), to = new Vector3(sx * 0.27, 0.0, sz * 0.27);
    const len = Vector3.Distance(from, to);
    const leg = part(CreateCylinder('heliLeg', { height: len, diameter: 0.012, tessellation: 6 }, scene), dark);
    leg.position = from.add(to).scale(0.5);
    const dir = to.subtract(from).normalize();
    const axis = Vector3.Cross(Vector3.Up(), dir).normalize();
    leg.rotationQuaternion = null;
    leg.rotate(axis, Math.acos(Vector3.Dot(Vector3.Up(), dir)));
  }
  const mast = part(CreateCylinder('heliMast', { height: 0.24, diameter: 0.028, tessellation: 8 }, scene), dark);
  mast.position.y = 0.37;
  const panel = part(CreateBox('heliPanel', { width: 0.425, height: 0.008, depth: 0.165 }, scene), mat('heliCells', [0.08, 0.09, 0.14], 0.5));
  panel.position.y = 0.49;
  // The rotors: blades that turn, and a faint disc for the blur when they turn fast.
  const bladeMat = mat('heliBlade', [0.16, 0.16, 0.17], 0.2);
  bladeMat.alpha = 1;
  const discMat = mat('heliDisc', [0.2, 0.19, 0.18], 0);
  discMat.alpha = 0;
  discMat.disableDepthWrite = true;
  const rotors = [0.355, 0.43].map((y, k) => {
    const hub = new TransformNode(`heliHub${k}`, scene);
    hub.parent = root;
    hub.position.y = y;
    for (const a of [0, Math.PI]) {
      const blade = part(CreateBox(`heliBlade${k}`, { width: 0.58, height: 0.008, depth: 0.075 }, scene), bladeMat, hub);
      blade.position.x = Math.cos(a) * 0.3;
      blade.rotation.y = a;
    }
    const disc = CreateCylinder(`heliDisc${k}`, { height: 0.004, diameter: 1.21, tessellation: 40 }, scene);
    disc.material = discMat; disc.parent = root; disc.position.y = y; disc.isPickable = false;
    return hub;
  });
  return { root, rotors, bladeMat, discMat, casters };
}

// Pebbles on a clear tile (it repeats every 1.7 m): each a lit body with a shadow to the
// side away from the Sun (sunAz, east of north; the tile's x is east, its rows run south as
// they go down, as the ground's picture does).
function paintGravel(g, n, sunAz) {
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.clearRect(0, 0, n, n);
  const sx = -Math.sin(sunAz), sy = Math.cos(sunAz); // shadow way on the tile (y down is south)
  for (let k = 0; k < 380; k++) {
    const r = 2.5 + 11 * rnd() ** 3, x = rnd() * n, y = rnd() * n, a = rnd() * Math.PI, e = 0.55 + rnd() * 0.4;
    const sh = 0.45 + rnd() * 0.45;
    for (const [ox, oy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {
      g.save();
      g.translate(x + ox, y + oy);
      g.fillStyle = 'rgba(20,10,5,0.45)';
      g.beginPath(); g.ellipse(sx * r * 0.6, sy * r * 0.6, r * 1.05, r * e * 1.05, a, 0, Math.PI * 2); g.fill();
      const grd = g.createRadialGradient(-sx * r * 0.35, -sy * r * 0.35, r * 0.1, 0, 0, r);
      const c = (m) => `rgb(${Math.round(150 * sh * m + 20)},${Math.round(105 * sh * m + 10)},${Math.round(80 * sh * m + 5)})`;
      grd.addColorStop(0, c(1.25)); grd.addColorStop(1, c(0.6));
      g.fillStyle = grd;
      g.beginPath(); g.ellipse(0, 0, r, r * e, a, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
}

// Tileable grey noise for the ground's fine grain.
function paintGrain(g, n) {
  const img = g.createImageData(n, n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const layers = [8, 16, 32, 64, 128].map((cells) => {
    const v = new Float32Array(cells * cells).map(() => rnd());
    return { cells, v };
  });
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s = 0, w = 0, amp = 1;
    for (const { cells, v } of layers) {
      const fx = (x / n) * cells, fy = (y / n) * cells;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const at = (i, j) => v[((j + cells) % cells) * cells + ((i + cells) % cells)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const b = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      s += (a * (1 - sy) + b * sy) * amp; w += amp; amp *= 0.72;
    }
    const k = (y * n + x) * 4;
    const c = Math.round(Math.min(1, Math.max(0, (s / w - 0.5) * 2.2 + 0.5)) * 255);
    img.data[k] = img.data[k + 1] = img.data[k + 2] = c; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

// Heights packed in a picture's red and green (millimetres, 32.768 m added).
function loadHeights(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, img.width, img.height).data;
      const h = new Float32Array(img.width * img.height);
      for (let i = 0; i < h.length; i++) h[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / 1000 - 32.768;
      resolve({ n: img.width, h });
    };
    img.onerror = reject;
    img.src = src;
  });
}
// Height at (x, z) from a grid covering +-half metres, its first row the northmost.
function sampler({ n, h }, half) {
  return (x, z) => {
    const fx = Math.min(n - 1.001, Math.max(0, ((x + half) / (2 * half)) * (n - 1)));
    const fy = Math.min(n - 1.001, Math.max(0, ((half - z) / (2 * half)) * (n - 1)));
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    const a = h[j * n + i] * (1 - tx) + h[j * n + i + 1] * tx;
    const b = h[(j + 1) * n + i] * (1 - tx) + h[(j + 1) * n + i + 1] * tx;
    return a * (1 - ty) + b * ty;
  };
}
function groundMesh(name, scene, half, cells, height, drop) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
    const x = -half + (2 * half * i) / cells, z = -half + (2 * half * j) / cells;
    pos.push(x, height(x, z) - drop, z);
    uv.push(i / cells, j / cells);
  }
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = j * (cells + 1) + i, b = a + 1, c = a + cells + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const normals = [];
  VertexData.ComputeNormals(pos, idx, normals);
  const vd = new VertexData();
  Object.assign(vd, { positions: pos, indices: idx, normals, uvs: uv });
  const m = new Mesh(name, scene);
  vd.applyToMesh(m);
  m.isPickable = false;
  return m;
}

export function createMarsStage(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  // (The panoramas' own sky near the horizon.)
  const haze = new Color3(0.75, 0.615, 0.46);
  scene.clearColor = new Color4(haze.r, haze.g, haze.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP;
  scene.fogDensity = 1 / 2600;
  scene.fogColor = haze;
  // The Sun 38 degrees up in the west-south-west, as in the afternoon the orbiter's
  // pictures were taken (their shadows fall that way).
  const sunEl = 0.66, sunAz = (250 * Math.PI) / 180;
  const sunDir = new Vector3(Math.cos(sunEl) * Math.sin(sunAz), Math.sin(sunEl), Math.cos(sunEl) * Math.cos(sunAz)).normalize();
  // At sunset: low in the west, a little north of it (northern spring at Jezero).
  const setAz = (282 * Math.PI) / 180;
  const hazeDay = haze.clone(), hazeDusk = new Color3(0.38, 0.355, 0.345);
  const zenithDay = new Color3(0.60, 0.47, 0.36), zenithDusk = new Color3(0.30, 0.30, 0.32);
  const sun = new DirectionalLight('marsSun', sunDir.scale(-1), scene);
  sun.diffuse = new Color3(1, 0.93, 0.84);
  sun.specular = new Color3(0, 0, 0);
  sun.intensity = 1.25;
  const sky = new HemisphericLight('marsSky', new Vector3(0, 1, 0), scene);
  sky.diffuse = new Color3(0.62, 0.48, 0.38);
  sky.groundColor = new Color3(0.3, 0.2, 0.14);
  sky.specular = new Color3(0, 0, 0);
  sky.intensity = 0.55;

  const camera = new FreeCamera('marsEye', new Vector3(PANOS[0].at[0], 2, PANOS[0].at[1]), scene);
  camera.minZ = 0.05;
  camera.maxZ = 30000;
  camera.fov = 0.95;
  camera.inputs.clear();

  const skyMat = new ShaderMaterial('marsSkyMat', scene, { vertex: 'marsSky', fragment: 'marsSky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'sunDir', 'haze', 'zenith', 'dusk', 'pix', 'time', 'phobos', 'clouds', 'night', 'earthDir', 'earth', 'phobosDir', 'phobosOn', 'aurora'] });
  skyMat.setVector3('sunDir', sunDir);
  skyMat.setColor3('haze', haze);
  skyMat.setColor3('zenith', new Color3(0.60, 0.47, 0.36));
  skyMat.setFloat('dusk', 0);
  for (const n of ['pix', 'time', 'clouds', 'night', 'earth', 'phobosOn', 'aurora']) skyMat.setFloat(n, 0);
  skyMat.setVector3('phobosDir', new Vector3(0, 1, 0));
  skyMat.setVector2('phobos', new Vector2(1, 1));
  skyMat.setVector3('earthDir', new Vector3(0, 1, 0));
  skyMat.backFaceCulling = false;
  skyMat.disableDepthWrite = true;
  const skyBall = CreateSphere('marsSkyBall', { diameter: 50000, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  skyBall.material = skyMat;
  skyBall.infiniteDistance = true;
  skyBall.renderingGroupId = 0;
  skyBall.isPickable = false;

  const grain = new DynamicTexture('marsGrain', { width: 256, height: 256 }, scene, true);
  paintGrain(grain.getContext(), 256);
  grain.update();
  grain.wrapU = grain.wrapV = Texture.WRAP_ADDRESSMODE;
  const gravel = new DynamicTexture('marsGravel', { width: 512, height: 512 }, scene, true);
  gravel.hasAlpha = true;
  paintGravel(gravel.getContext(), 512, sunAz);
  gravel.update();
  gravel.wrapU = gravel.wrapV = Texture.WRAP_ADDRESSMODE;
  const groundMat = (name, photo, hole) => {
    const m = new ShaderMaterial(name, scene, { vertex: 'marsGround', fragment: 'marsGround' }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'viewProjection', 'sunDir', 'eye', 'haze', 'hole', 'zoom', 'sunK', 'skyK'], samplers: ['photo', 'grain', 'gravel'] });
    const tex = new Texture(photo, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    tex.anisotropicFilteringLevel = 8;
    tex.wrapU = tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    m.setTexture('photo', tex);
    m.setTexture('grain', grain);
    m.setTexture('gravel', gravel);
    m.setVector3('sunDir', sunDir);
    m.setColor3('haze', haze);
    m.setFloat('hole', hole);
    m.setFloat('zoom', 1);
    m.setFloat('sunK', 1.25);
    m.setFloat('skyK', 0.55);
    return m;
  };
  const nearMat = groundMat('marsNearMat', 'assets/mars/near.webp', 0);
  const farMat = groundMat('marsFarMat', 'assets/mars/far.webp', NEAR - 6);

  // The panoramas, round the eye, over everything.
  const panos = PANOS.map((p, k) => {
    const m = new ShaderMaterial(`marsPanoMat${k}`, scene, { vertex: 'marsPano', fragment: 'marsPano' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'left', 'top', 'bottom', 'fade'], samplers: ['pano'], needAlphaBlending: true });
    const tex = new Texture(p.src, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    tex.wrapU = Texture.WRAP_ADDRESSMODE; tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    m.setTexture('pano', tex);
    m.setFloat('left', p.left); m.setFloat('top', p.top); m.setFloat('bottom', p.bottom); m.setFloat('fade', 0);
    m.backFaceCulling = false;
    m.disableDepthWrite = true;
    m.depthFunction = Constants.ALWAYS;
    const ball = CreateSphere(`marsPano${k}`, { diameter: 40, segments: 48, sideOrientation: Mesh.BACKSIDE }, scene);
    ball.material = m;
    ball.renderingGroupId = 1;
    ball.isPickable = false;
    ball.isVisible = false;
    return { ...p, mat: m, ball };
  });

  const tread = new DynamicTexture('marsTread', { width: 64, height: 128 }, scene, true);
  tread.hasAlpha = true;
  paintTread(tread.getContext(), 64, 128);
  tread.update();
  tread.wrapU = Texture.CLAMP_ADDRESSMODE; tread.wrapV = Texture.WRAP_ADDRESSMODE;
  const trackMat = new ShaderMaterial('marsTrackMat', scene, { vertex: 'marsTrack', fragment: 'marsTrack' }, { attributes: ['position', 'uv'], uniforms: ['world', 'viewProjection', 'upTo', 'sunDir', 'eye', 'haze', 'zoom', 'sunK', 'skyK'], samplers: ['tread'], needAlphaBlending: true });
  trackMat.setTexture('tread', tread);
  trackMat.setVector3('sunDir', sunDir);
  trackMat.setColor3('haze', haze);
  trackMat.setFloat('upTo', -1);
  trackMat.setFloat('zoom', 1);
  trackMat.setFloat('sunK', 1.25);
  trackMat.setFloat('skyK', 0.55);
  trackMat.backFaceCulling = false;
  trackMat.disableDepthWrite = true;
  trackMat.zOffset = -2;

  // Dust devils far off in the west, for the evening (bearing off the sunset, distance,
  // height, width, drift m/s across).
  const devils = [[-0.13, 520, 150, 45, 1.2], [0.11, 850, 260, 70, -1.5], [-0.03, 1400, 380, 90, 2]].map(([db, r, h, w, v], k) => {
    const m = new ShaderMaterial(`marsDevilMat${k}`, scene, { vertex: 'marsDevil', fragment: 'marsDevil' }, { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'time', 'seed', 'fade', 'tint'], needAlphaBlending: true });
    m.backFaceCulling = false;
    m.disableDepthWrite = true;
    m.setFloat('seed', k * 2.7);
    const mesh = CreatePlane(`marsDevil${k}`, { width: w, height: h }, scene);
    mesh.material = m;
    mesh.billboardMode = Mesh.BILLBOARDMODE_Y;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    return { mesh, m, db, r, h, v };
  });
  const heli = buildHeli(scene);
  heli.root.setEnabled(false);
  let heliGround = 0, rotorTurn = 0;
  // Its shadow: a soft dark patch the Sun throws from it onto the ground.
  const shade = new DynamicTexture('heliShade', { width: 128, height: 128 }, scene, true);
  shade.hasAlpha = true;
  {
    const g = shade.getContext();
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    r.addColorStop(0, 'rgba(25,12,6,0.55)'); r.addColorStop(0.35, 'rgba(25,12,6,0.4)'); r.addColorStop(1, 'rgba(25,12,6,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    shade.update();
  }
  const shadeMat = new StandardMaterial('heliShadeMat', scene);
  shadeMat.diffuseTexture = shade;
  shadeMat.useAlphaFromDiffuseTexture = true;
  shadeMat.disableLighting = true;
  shadeMat.emissiveColor = new Color3(1, 1, 1);
  shadeMat.disableDepthWrite = true;
  shadeMat.zOffset = -3;
  const heliShadow = CreateGround('heliShadow', { width: 1.0, height: 0.75 }, scene);
  heliShadow.material = shadeMat;
  heliShadow.isPickable = false;
  heliShadow.setEnabled(false);

  // The ground, once its heights are in.
  let height = () => 0;
  let ready = false;
  Promise.all([loadHeights('assets/mars/near-h.png'), loadHeights('assets/mars/far-h.png'), loadBright('assets/mars/near.webp')]).then(([n, f, bright]) => {
    if (scene.isDisposed) return;
    const nearH = sampler(n, NEAR), farH = sampler(f, FAR);
    // (Stones and the eye stand on the ground as drawn, its 2 m triangles, not on the finer
    // heights between: on those, pebbles sank out of sight.)
    const CELLS = 300, step = (2 * NEAR) / CELLS;
    const onMesh = (x, z) => {
      const fx = (x + NEAR) / step, fz = (z + NEAR) / step;
      const i = Math.min(CELLS - 1, Math.max(0, Math.floor(fx))), j = Math.min(CELLS - 1, Math.max(0, Math.floor(fz)));
      const u = fx - i, v = fz - j;
      const X = -NEAR + i * step, Z = -NEAR + j * step;
      const ha = nearH(X, Z), hb = nearH(X + step, Z), hc = nearH(X, Z + step), hd = nearH(X + step, Z + step);
      return u + v <= 1 ? ha + (hb - ha) * u + (hc - ha) * v : hd + (hc - hd) * (1 - u) + (hb - hd) * (1 - v);
    };
    height = (x, z) => (Math.abs(x) < NEAR && Math.abs(z) < NEAR ? onMesh(x, z) : farH(x, z));
    const near = groundMesh('marsNear', scene, NEAR, CELLS, nearH, 0);
    near.material = nearMat;
    const far = groundMesh('marsFar', scene, FAR, 160, farH, 0.4);
    far.material = farMat;
    scatterRocks(scene, height, bright);
    // The two wheel tracks, 2.4 m apart, a sample every 0.25 m.
    const pos = [], uv = [], idx = [];
    const STEP = 0.25, L = cum[cum.length - 1];
    for (const side of [-1.2, 1.2]) {
      const first = pos.length / 3;
      let k = 0;
      for (let s = 0; s <= L; s += STEP, k++) {
        const [px, pz] = along(s);
        const a = along(s - 0.7), b = along(s + 0.7);
        let tx = b[0] - a[0], tz = b[1] - a[1];
        const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        // (Square to the way she went: east-north tangent turned a quarter.)
        const nx = tz, nz = -tx;
        for (const across of [-0.21, 0.21]) {
          const x = px + nx * (side + across), z = pz + nz * (side + across);
          pos.push(x, height(x, z) + 0.012, z);
          uv.push(across < 0 ? 0 : 1, s);
        }
        if (k > 0) {
          const q = first + (k - 1) * 2;
          idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
        }
      }
    }
    const vd = new VertexData();
    Object.assign(vd, { positions: pos, indices: idx, uvs: uv });
    const tracks = new Mesh('marsTracks', scene);
    vd.applyToMesh(tracks);
    tracks.material = trackMat;
    tracks.isPickable = false;
    tracks.alwaysSelectAsActiveMesh = true;
    heli.root.position.set(HELI[0], height(HELI[0], HELI[1]), HELI[1]);
    heliGround = height(HELI[0], HELI[1]);
    ready = true;
  });

  // Along the path by distance walked.
  const cum = [0];
  for (let i = 1; i < PATH.length; i++) cum.push(cum[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
  const along = (s) => {
    s = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const k = cum[i] > cum[i - 1] ? (s - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
    return [PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * k, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * k];
  };
  // The bearing the walker faces at s: along the path a few metres on, from a little back.
  const facing = (s) => {
    const a = along(s - 4), b = along(s + 12);
    return Math.atan2(b[0] - a[0], b[1] - a[1]);
  };
  const W = MARS_WALK;
  const walkEnd = W.panoB[0];
  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  // Distance walked at t: easing off from the start and onto the end.
  const walked = (t) => {
    const T = walkEnd - W.walkFrom, x = Math.min(T, Math.max(0, t - W.walkFrom));
    const e = 6; // seconds to get going and to stop
    const v = W.lengthM / (T - e);
    if (x < e) return (v * x * x) / (2 * e);
    if (x > T - e) return W.lengthM - (v * (T - x) * (T - x)) / (2 * e);
    return v * (x - e / 2);
  };
  const startFace = facing(0), endFace = facing(W.lengthM);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // From where she stopped round to the helicopter, the short way.
  const heliBearing = Math.atan2(HELI[0] - PANOS[1].at[0], HELI[1] - PANOS[1].at[1]);
  const sweep = wrap(heliBearing - endFace);
  // The view turns no faster than 5 degrees a second, easing into a turn and out of it.
  const TURN = (5 * Math.PI) / 180;
  let yaw = startFace, spin = 0, lastT = null;

  // The evening by its own seconds (R from sunset[0]): where the Sun is.
  const evening = (t) => {
    const R = t - W.sunset[0];
    if (R <= 0) return { R, el: sunEl, az: sunAz };
    const k = smooth(0, 8, R);
    let el = sunEl + (0.35 - sunEl) * k;
    if (R > 8) el = 0.35 - 0.105 * Math.min(1, (R - 8) / 74);
    if (R > 82) el = 0.245 - 0.315 * Math.min(1, (R - 82) / 36);
    if (R > 118) el = -0.07 - 0.09 * Math.min(1, (R - 118) / 60);
    if (R > 178) el = -0.16 - 0.19 * Math.min(1, (R - 178) / 60);
    return { R, el, az: sunAz + (setAz - sunAz) * k };
  };
  // Phobos by night, hours gone by in seconds: up from the west-south-west horizon toward
  // the south (it goes round faster than Mars turns, so it rises in the west).
  const phobosAt = (R) => {
    const u = Math.min(1, Math.max(0, (R - 182) / 50));
    return { el: -0.03 + 0.45 * u, az: ((252 - 30 * u) * Math.PI) / 180 };
  };
  // A field of view eased by its logarithm (drawn in on the Sun from far out).
  const toward = (f, g, k) => f * Math.pow(g / f, k);
  function update(t) {
    const jump = lastT === null || Math.abs(t - lastT) > 0.5;
    const dt = jump ? 0 : t - lastT;
    lastT = t;
    let x, z, eye, want, pitch = -0.1;
    if (t < W.walkFrom) {
      // At the landing site, turning slowly round to face the way she went.
      [x, z] = PANOS[0].at; eye = PANOS[0].eye;
      want = startFace - 2.4 * (1 - smooth(0, W.walkFrom, t));
      pitch = -0.12;
    } else if (t < walkEnd) {
      const s = walked(t);
      [x, z] = along(s);
      eye = 1.75 + (PANOS[0].eye - 1.75) * (1 - smooth(W.walkFrom, W.walkFrom + 4, t)) + (PANOS[1].eye - 1.75) * smooth(walkEnd - 4, walkEnd, t);
      want = facing(s);
      // A stroll's sway: a little up and down with each step, a little side to side.
      const step = (s / 0.72) * Math.PI;
      const go = smooth(W.walkFrom, W.walkFrom + 6, t) * (1 - smooth(walkEnd - 6, walkEnd, t));
      eye += go * 0.022 * Math.abs(Math.sin(step));
      x += go * 0.015 * Math.cos(want) * Math.sin(step / 2);
      z -= go * 0.015 * Math.sin(want) * Math.sin(step / 2);
    } else {
      // At Van Zyl Overlook: round the panorama to Ingenuity, drawn in on it while it flies,
      // and out again, turning on a little.
      [x, z] = PANOS[1].at; eye = PANOS[1].eye;
      const F = W.fly;
      const toHeli = endFace + sweep;
      want = endFace + sweep * smooth(walkEnd, F.look[1], t) + 0.9 * smooth(F.back[0], W.panoB[1], t);
      const aim = Math.atan2(heliGround + 1.9 - (height(x, z) + eye), Math.hypot(HELI[0] - x, HELI[1] - z));
      const on = smooth(F.look[0], F.look[1], t) * (1 - smooth(F.back[0], F.back[1], t));
      pitch = -0.08 + (aim + 0.08) * on;
      void toHeli;
      // Evening: round to the west, looking a touch up; at the Sun while drawn in on it, up
      // at the clouds, then down at Earth.
      if (t >= W.sunset[0]) {
        const ev = evening(t), R = ev.R;
        want = setAz + 0.14 * smooth(138, 146, R);
        pitch = -0.08 + 0.2 * smooth(0, 10, R);
        pitch += (ev.el - pitch) * smooth(26, 32, R) * (1 - smooth(76, 82, R));
        pitch += (0.55 - pitch) * smooth(110, 118, R) * (1 - smooth(136, 144, R));
        pitch += (0.1 - pitch) * smooth(136, 144, R);
        // After Phobos as it rises, then up at the green sky, toward the south.
        const ph = phobosAt(R), onPh = smooth(180, 188, R) * (1 - smooth(228, 238, R));
        want += wrap(ph.az - want) * onPh;
        pitch += (ph.el - pitch) * onPh;
        want += wrap((205 * Math.PI) / 180 - want) * smooth(228, 238, R);
        pitch += (0.32 - pitch) * smooth(228, 238, R);
      }
    }
    // Turning lags behind the path's bends, as a head would (and not at all on a seek).
    if (jump) { yaw = want; spin = 0; }
    else {
      const wish = Math.max(-TURN, Math.min(TURN, wrap(want - yaw) * 0.9));
      spin += (wish - spin) * Math.min(1, dt * 1.5);
      yaw += spin * dt;
    }
    // Drawn in on Phobos the view keeps it centred.
    const lock = smooth(W.sunset[0] + 190, W.sunset[0] + 196, t) * (1 - smooth(W.sunset[0] + 226, W.sunset[0] + 232, t));
    if (lock > 0) yaw += wrap(want - yaw) * lock;
    // At the end, up off the night ground (the user, 2026-11-24: "화성의 오로라를 공중에서
    // 보는건어떄?", "만들어"): 400 m up in 10 s, the view let down toward the horizon; the
    // game's own Mars takes over from there (core/courses.js marsOrbitAt).
    const rise = smooth(W.sunset[0] + 266, W.sunset[0] + 276, t);
    if (rise > 0) {
      eye += 400 * rise * rise;
      pitch += (0.08 - pitch) * rise;
    }
    camera.position.set(x, height(x, z) + eye, z);
    camera.rotation.set(-pitch, yaw, 0);
    // The panoramas fade in and out over the walk's two ends.
    const a = 1 - smooth(W.walkFrom, W.walkFrom + FADE, t);
    const F = W.fly;
    const b = (smooth(walkEnd - FADE, walkEnd, t) * (1 - smooth(F.look[0] - 1, F.look[0] + 2, t)) + smooth(F.back[0] + 1, F.back[1] + 1, t)) * (1 - smooth(W.sunset[0], W.sunset[0] + 5, t));
    // Drawn in, as her mast camera was on the helicopter, and out again.
    const zoomed = smooth(F.look[0] + 1, F.look[1] + 1, t) * (1 - smooth(F.back[0], F.back[1], t));
    camera.fov = 0.95 + (0.17 - 0.95) * zoomed;
    if (t >= W.sunset[0]) {
      const R = t - W.sunset[0];
      let f = 0.95 + (0.6 - 0.95) * smooth(2, 14, R);
      f = toward(f, 0.035, smooth(28, 36, R) * (1 - smooth(76, 84, R)));
      f += (0.95 - f) * smooth(108, 116, R) * (1 - smooth(140, 146, R));
      f = toward(f, 0.15, smooth(146, 162, R));
      f = toward(f, 0.95, smooth(174, 184, R));
      f = toward(f, 0.055, smooth(194, 206, R) * (1 - smooth(220, 230, R)));
      camera.fov = f;
    }
    // The hour: the afternoon Sun swung down to 9 degrees in the west over 8 seconds, then
    // setting, to 4 degrees under the horizon by the end.
    const { R, el, az } = evening(t);
    sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const dusk = Math.min(1, Math.max(0, (0.5 - el) / 0.55));
    const sunK = 1.25 * smooth(-0.03, 0.12, el) * (1 - 0.7 * dusk), skyK = 0.55 * (1 - 0.86 * dusk) * (0.4 + 0.6 * smooth(-0.3, -0.12, el));
    sun.direction.copyFrom(sunDir).scaleInPlace(-1);
    sun.intensity = sunK;
    sun.diffuse.set(1, 0.93 - 0.1 * dusk, 0.84 - 0.12 * dusk);
    sky.intensity = skyK;
    const hz = Color3.Lerp(hazeDay, hazeDusk, dusk).scale(0.3 + 0.7 * smooth(-0.3, -0.12, el));
    haze.copyFrom(hz);
    scene.fogColor = hz;
    scene.clearColor.set(hz.r, hz.g, hz.b, 1);
    skyMat.setVector3('sunDir', sunDir);
    skyMat.setColor3('haze', hz);
    skyMat.setColor3('zenith', Color3.Lerp(zenithDay, zenithDusk, dusk));
    skyMat.setFloat('dusk', dusk);
    skyMat.setFloat('pix', camera.fov / Math.max(1, engine.getRenderHeight()));
    skyMat.setFloat('time', t);
    const crossing = R > 36 && R < 76 ? (R - 36) / 40 : -1;
    skyMat.setVector2('phobos', crossing < 0 ? new Vector2(1, 1) : new Vector2(-0.0085 + 0.017 * crossing, 0.0026 - 0.004 * crossing));
    skyMat.setFloat('clouds', R > 0 ? smooth(108, 118, R) * (1 - smooth(150, 166, R)) : 0);
    skyMat.setFloat('night', R > 0 ? smooth(118, 150, R) : 0);
    const eAz = setAz + 0.14, eEl = 0.1;
    skyMat.setVector3('earthDir', new Vector3(Math.cos(eEl) * Math.sin(eAz), Math.sin(eEl), Math.cos(eEl) * Math.cos(eAz)));
    skyMat.setFloat('earth', R > 0 ? smooth(130, 146, R) : 0);
    const ph = phobosAt(R);
    skyMat.setVector3('phobosDir', new Vector3(Math.cos(ph.el) * Math.sin(ph.az), Math.sin(ph.el), Math.cos(ph.el) * Math.cos(ph.az)));
    skyMat.setFloat('phobosOn', R > 0 ? smooth(176, 182, R) : 0);
    skyMat.setFloat('aurora', R > 0 ? smooth(226, 244, R) * (0.85 + 0.15 * Math.sin(t * 0.4)) : 0);
    // The dust devils, drifting across the plain.
    const devilsOn = R > 0 ? smooth(4, 8, R) * (1 - smooth(26, 30, R)) : 0;
    for (const dv of devils) {
      dv.mesh.setEnabled(ready && devilsOn > 0.001);
      if (!(ready && devilsOn > 0.001)) continue;
      const b = setAz + dv.db, o = PANOS[1].at;
      const side = dv.v * (R - 15);
      const dx = o[0] + Math.sin(b) * dv.r + Math.cos(b) * side, dz = o[1] + Math.cos(b) * dv.r - Math.sin(b) * side;
      dv.mesh.position.set(dx, height(dx, dz) + dv.h / 2, dz);
      dv.m.setFloat('time', t);
      dv.m.setFloat('fade', devilsOn);
      dv.m.setColor3('tint', Color3.Lerp(new Color3(0.62, 0.47, 0.35), hz, 0.25));
    }
    for (const m of [nearMat, farMat, trackMat]) {
      m.setVector3('sunDir', sunDir);
      m.setColor3('haze', hz);
      m.setFloat('sunK', sunK);
      m.setFloat('skyK', skyK);
    }
    const zoom = camera.fov / 0.95;
    for (const m of [nearMat, farMat, trackMat]) m.setFloat('zoom', zoom);
    // Her tracks, as far as she has driven.
    trackMat.setFloat('upTo', t < W.walkFrom ? -1 : t < walkEnd ? walked(t) - 0.3 : 1e6);
    trackMat.setVector3('eye', camera.position);
    // Ingenuity: there once she has driven off it; up, round and down at its hour.
    const shown = ready && t >= W.walkFrom && (t >= walkEnd || walked(t) >= HELI_SHOWN_FROM);
    heli.root.setEnabled(shown);
    heliShadow.setEnabled(shown);
    if (shown) {
      const tau = t - F.takeoff, flight = F.land - F.takeoff;
      const up = tau <= 0 || tau >= flight ? 0 : 3 * smooth(0, 6, tau) * (1 - smooth(flight - 6, flight, tau));
      const hover = up > 0.5 ? 0.02 * Math.sin(t * 2.3) : 0;
      const hy = heliGround + up + hover;
      heli.root.position.set(HELI[0] + (up > 0.5 ? 0.015 * Math.sin(t * 1.7) : 0), hy, HELI[1]);
      heli.root.rotation.y = (96 * Math.PI / 180) * smooth(12, 22, tau);
      const spin = t >= walkEnd ? smooth(F.spin[0], F.spin[1], t) * (1 - smooth(F.land + 1, F.land + 5, t)) : 0;
      rotorTurn += dt * (0.6 + 2 * spin) * 2 * Math.PI;
      heli.rotors[0].rotation.y = rotorTurn;
      heli.rotors[1].rotation.y = -rotorTurn * 1.07;
      heli.bladeMat.alpha = 1 - 0.7 * spin;
      heli.discMat.alpha = 0.22 * spin;
      // The shadow, where the Sun's line through the rotors meets the ground.
      const lift = up + 0.3;
      const sx = HELI[0] - (sunDir.x / sunDir.y) * lift, sz = HELI[1] - (sunDir.z / sunDir.y) * lift;
      heliShadow.position.set(sx, height(sx, sz) + 0.02, sz);
      heliShadow.rotation.y = heli.root.rotation.y;
      shadeMat.alpha = (0.3 + Math.min(0.25, up * 0.08)) * smooth(0.25, 0.4, el);
      const sc = 0.75 + Math.min(0.35, up * 0.12);
      heliShadow.scaling.set(sc, 1, sc);
    }
    panos.forEach((p, k) => {
      const f = k === 0 ? a : b;
      p.mat.setFloat('fade', f);
      p.ball.isVisible = f > 0.002;
      p.ball.position.copyFrom(camera.position);
    });
    for (const m of [nearMat, farMat]) m.setVector3('eye', camera.position);
    // (Babylon binds a material's values only when it is not the one drawn last: without
    // this the ground kept an earlier hour's light from one frame to the next.)
    scene.resetCachedMaterial();
    if (ready || panos.some((p) => p.ball.isVisible)) scene.render();
  }

  return {
    update,
    scene,
    resize: () => engine.resize(),
    dispose: () => engine.dispose(),
  };
}

// Stones round the path (the user's panoramas are thick with them): pebbles close by, more
// near where she went; stones up to half a metre; and flat pale slabs where the orbiter's
// picture is bright (the broken pale rock that pavers the floor there). None where her
// wheels went (1.6 m either side of the middle of her path).
function scatterRocks(scene, height, bright) {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // A geodesic ball whose corners are shared by the faces round them, so the normals run
  // smoothly across it: level 1 has 80 faces, 2 has 320, 3 has 1,280.
  const shape = (level) => {
    const t = (1 + Math.sqrt(5)) / 2;
    const p = [];
    const put = (x, y, z) => { const l = Math.hypot(x, y, z); p.push(x / l, y / l, z / l); return p.length / 3 - 1; };
    [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].forEach((v) => put(...v));
    let f = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
    for (let l = 0; l < level; l++) {
      const mid = new Map();
      const half = (a, b) => {
        const key = a < b ? a * 65536 + b : b * 65536 + a;
        if (!mid.has(key)) mid.set(key, put(p[a * 3] + p[b * 3], p[a * 3 + 1] + p[b * 3 + 1], p[a * 3 + 2] + p[b * 3 + 2]));
        return mid.get(key);
      };
      const g = [];
      for (let i = 0; i < f.length; i += 3) {
        const a = f[i], b = f[i + 1], c = f[i + 2];
        const ab = half(a, b), bc = half(b, c), ca = half(c, a);
        g.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
      }
      f = g;
    }
    // Wound the way Babylon's left-handed frame faces outward.
    for (let i = 0; i < f.length; i += 3) { const b = f[i + 1]; f[i + 1] = f[i + 2]; f[i + 2] = b; }
    return { p, i: f };
  };
  const small = shape(1), big = shape(2), round = shape(3);
  const pos = [], col = [], idx = [];
  const clear = (x, z) => {
    for (let i = 0; i < PATH.length; i++) if (Math.abs(PATH[i][0] - x) < 1.6 && Math.abs(PATH[i][1] - z) < 1.6 && Math.hypot(PATH[i][0] - x, PATH[i][1] - z) < 1.6) return false;
    return true;
  };
  const add = (geo, x, z, sx, sy, sz, rc, sink) => {
    const turn = rnd() * Math.PI * 2, c = Math.cos(turn), s = Math.sin(turn);
    const y = height(x, z) - sy * sink;
    const start = pos.length / 3;
    const lump = [rnd() * 9, rnd() * 9, rnd() * 9];
    const bp = geo.p;
    for (let v = 0; v < bp.length; v += 3) {
      const k = 1 + 0.22 * Math.sin(bp[v] * 3 + lump[0]) * Math.sin(bp[v + 1] * 3 + lump[1]) + 0.14 * Math.sin(bp[v + 2] * 5 + lump[2]);
      const lx = bp[v] * sx * k, ly = (bp[v + 1] > -0.2 ? bp[v + 1] : -0.2 - 0.1 * (1 - Math.exp((bp[v + 1] + 0.2) * 6))) * sy * k, lz = bp[v + 2] * sz * k;
      pos.push(x + lx * c - lz * s, y + ly, z + lx * s + lz * c);
      // A touch darker underneath, as dust and shade would make it.
      const under = 0.75 + 0.25 * Math.min(1, Math.max(0, bp[v + 1] + 0.6));
      col.push(rc[0] * under, rc[1] * under, rc[2] * under, 1);
    }
    for (const i of geo.i) idx.push(start + i);
  };
  // Somewhere near the walk: by a random point of the path, spread out.
  const nearPath = (spread) => {
    const q = PATH[Math.floor(rnd() * PATH.length)];
    const r = spread * Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)) * 0.6, a = rnd() * Math.PI * 2;
    return [q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r];
  };
  const stone = (shade) => [0.5 * shade + 0.06, 0.36 * shade + 0.03, 0.27 * shade + 0.02];
  for (let n = 0; n < 5200; n++) {
    const [x, z] = nearPath(14);
    if (!clear(x, z)) continue;
    const r = 0.018 + 0.05 * rnd() ** 2;
    add(r < 0.03 ? small : big, x, z, r * (0.8 + rnd() * 0.5), r * (0.5 + rnd() * 0.4), r * (0.8 + rnd() * 0.5), stone(0.7 + rnd() * 0.5), 0.3);
  }
  for (let n = 0; n < 3200; n++) {
    const [x, z] = nearPath(16);
    if (!clear(x, z)) continue;
    const r = 0.07 + 0.45 * rnd() ** 5;
    add(r > 0.14 ? round : big, x, z, r * (0.8 + rnd() * 0.6), r * (0.45 + rnd() * 0.4), r * (0.8 + rnd() * 0.6), stone(0.55 + rnd() * 0.5), 0.35);
  }
  // The pale slabs, where the picture is brightest.
  let slabs = 0;
  for (let n = 0; n < 14000 && slabs < 900; n++) {
    const [x, z] = nearPath(35);
    const b = bright(x, z);
    if (b < 0.58 || rnd() > (b - 0.58) * 4 || !clear(x, z)) continue;
    const w = 0.3 + 0.9 * rnd() ** 2;
    const sh = 0.85 + rnd() * 0.25;
    add(big, x, z, w * (0.7 + rnd() * 0.6), 0.05 + rnd() * 0.07, w * (0.7 + rnd() * 0.6), [0.62 * sh, 0.46 * sh, 0.34 * sh], 0.45);
    slabs++;
  }
  const normals = [];
  VertexData.ComputeNormals(pos, idx, normals);
  const vd = new VertexData();
  Object.assign(vd, { positions: pos, indices: idx, normals, colors: col });
  const rocks = new Mesh('marsRocks', scene);
  vd.applyToMesh(rocks);
  const m = new StandardMaterial('marsRockMat', scene);
  m.diffuseColor = new Color3(1, 1, 1);
  m.specularColor = new Color3(0.04, 0.03, 0.02);
  rocks.material = m;
  rocks.isPickable = false;
}

// How bright the orbiter's picture is at (x, z), 0 to 1.
function loadBright(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const n = 512;
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, n, n);
      const px = g.getImageData(0, 0, n, n).data;
      resolve((x, z) => {
        const i = Math.floor(((x + NEAR) / (2 * NEAR)) * n), j = Math.floor(((NEAR - z) / (2 * NEAR)) * n);
        if (i < 0 || j < 0 || i >= n || j >= n) return 0;
        return px[(j * n + i) * 4] / 255;
      });
    };
    img.onerror = reject;
    img.src = src;
  });
}
