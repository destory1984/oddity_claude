import { Engine, Scene, FreeCamera, Vector3, Quaternion, Color3, Color4, HemisphericLight, DirectionalLight, CreateSphere, CreateGround, CreatePlane, StandardMaterial, ShaderMaterial, Effect, DynamicTexture, Texture, Mesh, Constants } from './babylon.js';
import { buildBooster, buildShip, buildTower } from './starship3d.js';

// The ground at Starbase, Texas, for the first and last of Starship's fifth flight (the user,
// 2026-11-22, chose "3": the liftoff and the catch seen from the ground, the flight between
// from a camera on the booster). The game's Earth cannot be stood on (its eye is held 12.7 km
// up, core/eye.js), so this is a little world of its own, drawn on its own canvas over the
// game's while it is shown: a dawn sky, the flats and lagoons by the Gulf, the launch tower
// and mount, the rocket, its fire and its clouds of steam. In metres, y up; the launch
// mount's middle at the origin, the Gulf to the east (+x), the Sun just risen over it.
// Course seconds (t): 0 is liftoff.

Effect.ShadersStore.dawnSkyVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() { vDir = position; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore.dawnSkyFragmentShader = `
precision highp float;
varying vec3 vDir;
uniform vec3 sunDir;
uniform float light;
void main() {
  vec3 d = normalize(vDir);
  float up = max(d.y, 0.0);
  float toSun = max(dot(d, sunDir), 0.0);
  // Blue overhead, pale toward the horizon, warm round the Sun and along the horizon under it.
  vec3 zenith = vec3(0.20, 0.36, 0.62);
  vec3 horizon = vec3(0.78, 0.80, 0.84);
  vec3 c = mix(horizon, zenith, pow(up, 0.45));
  float warm = pow(toSun, 3.0) * (1.0 - up);
  c = mix(c, vec3(1.0, 0.62, 0.32), 0.75 * warm);
  c += vec3(1.0, 0.85, 0.6) * pow(toSun, 60.0) * 0.6;
  c += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9997, toSun) * 2.0;
  // Below the horizon (seen only past the ground's far edge): haze.
  if (d.y < 0.0) c = mix(horizon * 0.9, vec3(0.55, 0.52, 0.5), clamp(-d.y * 8.0, 0.0, 1.0));
  gl_FragColor = vec4(c * light, 1.0);
}`;

const PI = Math.PI;
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// The flats round the pad seen from the air, 12 km across: sand and scrub, the lagoons of
// the Rio Grande's mouth, the road, the beach and the Gulf to the east.
function paintFlats(g, w, h) {
  const rnd = seeded(91);
  g.fillStyle = '#a99a7c';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 30;
    const k = rnd();
    g.fillStyle = k < 0.45 ? `rgba(110,112,78,${(0.15 + rnd() * 0.3).toFixed(2)})` : k < 0.8 ? `rgba(196,182,150,${(0.15 + rnd() * 0.3).toFixed(2)})` : `rgba(130,120,96,${(0.2 + rnd() * 0.3).toFixed(2)})`;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.4 + rnd() * 0.6), rnd() * PI, 0, 2 * PI);
    g.fill();
  }
  // Lagoons: wide, flat, grey-blue water with pale edges.
  for (let i = 0; i < 22; i++) {
    const x = rnd() * w * 0.75, y = rnd() * h, rx = 30 + rnd() * 160, ry = 15 + rnd() * 70;
    g.fillStyle = 'rgba(214,206,186,.8)';
    g.beginPath(); g.ellipse(x, y, rx + 8, ry + 6, rnd() * PI, 0, 2 * PI); g.fill();
    g.fillStyle = `rgba(${96 + rnd() * 20},${118 + rnd() * 20},${130 + rnd() * 20},.95)`;
    g.beginPath(); g.ellipse(x, y, rx, ry, rnd() * PI, 0, 2 * PI); g.fill();
  }
  // The road east to the beach, the pad's concrete in the middle.
  g.fillStyle = '#6d6a64';
  g.fillRect(w * 0.5, h * 0.5 - 2, w * 0.33, 4);
  g.fillStyle = '#b8b4aa';
  g.fillRect(w * 0.5 - 14, h * 0.5 - 14, 28, 28);
  // The beach and the sea (x from 0.83 of the way east).
  g.fillStyle = '#d9ccb0';
  g.fillRect(w * 0.83, 0, w * 0.02, h);
  const sea = g.createLinearGradient(w * 0.85, 0, w, 0);
  sea.addColorStop(0, '#5d7d8c');
  sea.addColorStop(1, '#3f5d70');
  g.fillStyle = sea;
  g.fillRect(w * 0.85, 0, w * 0.15, h);
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (let y = 0; y < h; y += 3) g.fillRect(w * 0.85 + rnd() * 6, y, 2 + rnd() * 4, 2);
}

// A puff of steam: soft, round, a little lumpy.
function paintPuff(g, w, h) {
  const rnd = seeded(5);
  g.clearRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = w * (0.3 + 0.4 * rnd()), y = h * (0.3 + 0.4 * rnd()), r = w * (0.15 + 0.2 * rnd());
    const s = g.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, 'rgba(255,255,255,.55)');
    s.addColorStop(0.6, 'rgba(255,255,255,.25)');
    s.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = s;
    g.fillRect(0, 0, w, h);
  }
}

// Where things are and when (course seconds).
export const STAGE = {
  // Booster on the mount, the ship on it; height of their foot above the ground (m).
  mountTop: 22,
  // The ascent: height (m) t seconds after liftoff (slow at first, the stack 5,000 t).
  climb: (t) => (t <= 0 ? 0 : 1.9 * t * t + 0.02 * t * t * t),
  liftoff: 0,
  // The booster coming home: lit at `burn` (13 engines), 3 from `three`, caught at `catch`.
  burn: 381,
  three: 392,
  catch: 407,
  armsFrom: 398,
  carriage: 98,
};

export function createStarshipStage(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.6, 0.62, 0.66, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.00009;
  scene.fogColor = new Color3(0.74, 0.72, 0.72);
  // The Sun 7 degrees up over the Gulf, a little south of east.
  const sunDir = new Vector3(Math.cos(0.12) * Math.cos(-0.25), Math.sin(0.12), Math.cos(0.12) * Math.sin(-0.25)).normalize();
  const sun = new DirectionalLight('stageSun', sunDir.scale(-1), scene);
  sun.diffuse = new Color3(1, 0.78, 0.55);
  sun.specular = new Color3(1, 0.85, 0.7);
  sun.intensity = 1.8;
  const sky = new HemisphericLight('stageSky', new Vector3(0, 1, 0), scene);
  sky.diffuse = new Color3(0.55, 0.62, 0.78);
  sky.groundColor = new Color3(0.36, 0.32, 0.28);
  sky.intensity = 0.8;

  const dome = CreateSphere('stageSky', { diameter: 40000, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  const skyMat = new ShaderMaterial('stageSkyMat', scene, { vertex: 'dawnSky', fragment: 'dawnSky' }, { attributes: ['position'], uniforms: ['worldViewProjection', 'sunDir', 'light'] });
  skyMat.setVector3('sunDir', sunDir);
  skyMat.setFloat('light', 1);
  skyMat.backFaceCulling = false;
  skyMat.fogEnabled = false;
  dome.material = skyMat;
  dome.infiniteDistance = true;
  dome.isPickable = false;

  const flats = new DynamicTexture('stageFlats', { width: 2048, height: 2048 }, scene, true);
  paintFlats(flats.getContext(), 2048, 2048);
  flats.update();
  flats.anisotropicFilteringLevel = 16;
  const ground = CreateGround('stageGround', { width: 12000, height: 12000, subdivisions: 2 }, scene);
  const groundMat = new StandardMaterial('stageGroundMat', scene);
  groundMat.diffuseTexture = flats;
  groundMat.specularColor = new Color3(0.04, 0.04, 0.04);
  groundMat.emissiveColor = new Color3(0.42, 0.38, 0.32);
  ground.material = groundMat;
  ground.isPickable = false;
  // (Beyond the flats, the Gulf to the horizon.)
  const sea = CreateGround('stageSea', { width: 40000, height: 40000 }, scene);
  const seaMat = new StandardMaterial('stageSeaMat', scene);
  seaMat.diffuseColor = new Color3(0.27, 0.38, 0.45);
  seaMat.specularColor = new Color3(0.6, 0.5, 0.4);
  seaMat.specularPower = 40;
  sea.material = seaMat;
  sea.position.y = -0.5;
  sea.isPickable = false;

  const tower = buildTower(scene, 'stageTower');
  const booster = buildBooster(scene, 'stageBooster');
  const ship = buildShip(scene, 'stageShip');
  const upright = Quaternion.RotationAxis(new Vector3(0, 0, 1), PI / 2);
  booster.root.rotationQuaternion = upright.clone();
  ship.root.rotationQuaternion = upright.clone();

  // Steam and smoke: soft puffs, each born at the foot of the fire, rising and spreading,
  // lit warm on the Sun's side.
  const puffTex = new DynamicTexture('stagePuff', { width: 128, height: 128 }, scene, false);
  paintPuff(puffTex.getContext(), 128, 128);
  puffTex.update();
  puffTex.hasAlpha = true;
  const puffMat = new StandardMaterial('stagePuffMat', scene);
  puffMat.diffuseTexture = puffTex;
  puffMat.useAlphaFromDiffuseTexture = true;
  puffMat.emissiveColor = new Color3(0.72, 0.68, 0.66);
  puffMat.diffuseColor = new Color3(0.6, 0.55, 0.5);
  puffMat.specularColor = new Color3(0, 0, 0);
  puffMat.backFaceCulling = false;
  puffMat.disableDepthWrite = true;
  const puffs = [];
  for (let i = 0; i < 180; i++) {
    const p = CreatePlane(`stagePuff${i}`, { size: 1 }, scene);
    p.material = puffMat;
    p.billboardMode = Mesh.BILLBOARDMODE_ALL;
    p.isPickable = false;
    p.setEnabled(false);
    puffs.push({ p, born: -1e9, life: 1, from: [0, 0, 0], v: [0, 0, 0], size: 1, grow: 1 });
  }
  const rnd = seeded(77);
  let next = 0;
  const puffAt = (t, from, spread, size, life) => {
    const q = puffs[next];
    next = (next + 1) % puffs.length;
    const a = rnd() * 2 * PI;
    q.born = t;
    q.life = life * (0.7 + 0.6 * rnd());
    q.from = from;
    q.v = [Math.cos(a) * spread * (0.5 + rnd()), 1 + 3 * rnd(), Math.sin(a) * spread * (0.5 + rnd())];
    q.size = size * (0.6 + 0.6 * rnd());
    q.grow = 1.5 + 2 * rnd();
  };

  const camera = new FreeCamera('stageCam', new Vector3(0, 10, -600), scene);
  camera.minZ = 1;
  camera.maxZ = 60000;
  camera.fov = 0.75;

  // Where the camera stands and looks, by the shot.
  function aim(t) {
    if (t < 200) {
      // The liftoff, from the sands 600 m south: the whole stack, then turning up after it.
      const h = STAGE.mountTop + STAGE.climb(t - STAGE.liftoff);
      camera.position.set(30, 6, -430);
      const lookY = Math.max(72, Math.min(h + 60, 0.62 * Math.hypot(430, h) + 30));
      camera.setTarget(new Vector3(-5, lookY, 0));
    } else {
      // The catch, from 750 m off, a little up the beach road: the tower's top half and
      // the sky over it, the booster coming down into the frame.
      camera.position.set(150, 12, -390);
      camera.setTarget(new Vector3(-8, 128, 0));
    }
  }

  // The booster's way home over the last 30 s: down from high over the Gulf to the arms.
  function homeAt(t) {
    const pinsAt = STAGE.carriage - 64.5 + 2.6;
    if (t >= STAGE.catch) return { y: pinsAt, x: 0, fire: 0, lit: 3, v: 0 };
    // Height falls as a braked fall would: fast, then slow over the last ten seconds.
    const left = STAGE.catch - t;
    const y = pinsAt + 3.2 * left * left + 0.25 * left * left * left;
    // Coming in from the Gulf side, then straight down beside the tower.
    const x = 160 * Math.max(0, left - 6) / 20;
    const fire = t < STAGE.burn ? 0 : Math.min(1, (t - STAGE.burn) / 0.6);
    return { y, x, fire, lit: t < STAGE.three ? 13 : 3, v: 6.4 * left + 0.75 * left * left };
  }

  // How many puffs now, for `expected` on average (so many a second, whatever the frame rate).
  const some = (expected) => { let n = 0; for (let k = expected; k > 0; k--) if (rnd() < k) n++; return n; };
  let lastT = null;
  function update(t) {
    const dt = lastT === null ? 0 : Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    aim(t);
    let catchSway = 0;
    if (t < 200) {
      // On the pad, then up.
      const h = STAGE.mountTop + STAGE.climb(t - STAGE.liftoff);
      booster.root.position.set(0, h, 0);
      ship.root.position.set(0, h + 71, 0);
      const fire = t < -3 ? 0 : t < 0 ? (t + 3) / 3 * 0.6 : 1;
      booster.pose({ fire, engines: 33, air: 1, frost: 1, at: t });
      ship.root.setEnabled(true);
      ship.pose({ fire: 0 });
      tower.pose({ arms: 0, carriage: 120 });
      // Steam: a little venting before; a great deal from the mount at liftoff.
      if (t > -25 && t < 0) for (let i = some(8 * dt); i > 0; i--) puffAt(t, [(rnd() - 0.5) * 8, STAGE.mountTop + 4 + rnd() * 30, (rnd() - 0.5) * 8], 1.5, 8, 5);
      if (t > -2 && t < 14) for (let i = some(22 * dt); i > 0; i--) puffAt(t, [(rnd() - 0.5) * 24, 4 + rnd() * 8, (rnd() - 0.5) * 24], 26 + 34 * rnd(), 38, 14);
      if (t > 0 && t < 12 && h < 400) for (let i = some(14 * dt); i > 0; i--) puffAt(t, [(rnd() - 0.5) * 6, Math.max(5, h - 50), (rnd() - 0.5) * 6], 10, 40, 9);
    } else {
      // Home: the booster alone, the arms closing round it as it comes.
      const home = homeAt(t);
      if (t > STAGE.catch) {
        const s = t - STAGE.catch;
        catchSway = 0.022 * Math.exp(-s / 3.5) * Math.sin(s * 2.3);
      }
      booster.root.position.set(home.x, home.y, 0);
      booster.root.rotationQuaternion = Quaternion.RotationAxis(new Vector3(0, 0, 1), PI / 2 + catchSway + (home.x > 0 ? 0.04 * Math.min(1, home.x / 80) : 0));
      booster.pose({ fire: home.fire, engines: home.lit, air: 1, frost: 0, at: t });
      ship.root.setEnabled(false);
      const shut = Math.min(1, Math.max(0, (t - STAGE.armsFrom) / (STAGE.catch - 1 - STAGE.armsFrom)));
      tower.pose({ arms: shut * shut * (3 - 2 * shut), carriage: STAGE.carriage });
      // Its fire striking the mount and the deck, the last seconds.
      if (home.fire > 0 && home.y < 260) for (let i = some(16 * dt); i > 0; i--) puffAt(t, [(rnd() - 0.5) * 20, 3 + rnd() * 6, (rnd() - 0.5) * 20], 14, 34, 9);
    }
    for (const q of puffs) {
      const age = t - q.born;
      if (age < 0 || age > q.life) { q.p.setEnabled(false); continue; }
      q.p.setEnabled(true);
      const x = age / q.life;
      const slow = 1 - Math.exp(-age / 3);
      q.p.position.set(q.from[0] + q.v[0] * 3 * slow, q.from[1] + q.v[1] * age, q.from[2] + q.v[2] * 3 * slow);
      q.p.scaling.setAll(q.size * (1 + q.grow * slow));
      q.p.visibility = Math.min(1, age * 3) * (1 - x) * 0.75;
    }
    scene.render();
  }
  return {
    update,
    resize: () => engine.resize(),
    dispose: () => engine.dispose(),
  };
}
