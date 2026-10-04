import {
  CreateCylinder, CreatePlane, Mesh, ShaderMaterial, StandardMaterial, DynamicTexture, Effect, Color3, Vector3, Quaternion, Constants, Matrix, TransformNode,
} from './babylon.js';
import veilVert from './shaders/veil.vert?raw';
import veilFrag from './shaders/veil.frag?raw';
import glowVert from './shaders/glow.vert?raw';
import sodiumFrag from './shaders/sodium.frag?raw';
import { KM_PER_UNIT, TIME_SCALE, AU_KM } from '../core/bodies.js';
import { cometActivity } from '../core/comet.js';
import { meteorSpot } from '../core/meteors.js';
import {
  AURORAS, auroraBand, STORMS, LIGHTNING_LIFE_S, lightningGap, lightningGlow,
  PLUMES, PLUME_DAY_S, PLUME_RANGE_RADII, plumeUp,
  IMPACT_RANGE_KM, IMPACT_LIFE_S, IMPACT_SIZE_KM, impactGap, impactGlow,
  NIGHT_CLOUDS, sheetBand, FOOTPRINT, footprintUp, SODIUM_TAIL, JETS, jetDirections, SPRITE, spriteGlow,
} from '../core/glows.js';

const FLASHES = 8;
// How many different bolts are drawn; each flash shows one of them, turned any way.
const BOLTS = 4;

const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

// A bolt seen from above: the cloud round it lit unevenly from inside, and the forked
// channel itself, thin and white. On black, to be added to the picture.
function boltTexture(scene, n) {
  const size = 128;
  const texture = new DynamicTexture(`bolt${n}`, { width: size, height: size }, scene, true);
  const ctx = texture.getContext();
  const rand = seeded(977 + n * 131);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  // The lit cloud: a few soft patches of different sizes, off centre.
  for (let k = 0; k < 5; k++) {
    const x = size * (0.5 + (rand() - 0.5) * 0.36);
    const y = size * (0.5 + (rand() - 0.5) * 0.36);
    const r = size * (0.12 + rand() * 0.2);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, 'rgba(150,170,255,0.55)');
    glow.addColorStop(0.5, 'rgba(90,110,220,0.2)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }
  // The channel: a crooked line across the patch, with two or three forks off it.
  const crooked = (fromX, fromY, heading, length, width, forks) => {
    let x = fromX;
    let y = fromY;
    let angle = heading;
    const steps = Math.max(3, Math.round(length / 6));
    for (let i = 0; i < steps; i++) {
      angle += (rand() - 0.5) * 1.3;
      const toX = x + Math.cos(angle) * (length / steps);
      const toY = y + Math.sin(angle) * (length / steps);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      x = toX;
      y = toY;
      if (forks > 0 && rand() < 0.3) crooked(x, y, angle + (rand() < 0.5 ? 0.9 : -0.9), length * 0.4, width * 0.6, forks - 1);
    }
  };
  const start = rand() * Math.PI * 2;
  crooked(size * (0.5 - Math.cos(start) * 0.22), size * (0.5 - Math.sin(start) * 0.22), start, size * 0.46, 2.2, 2);
  texture.update();
  return texture;
}

// A red sprite seen from the side: a red glow at the top, and thin tendrils hanging
// from it that turn violet toward the bottom. On black, to be added to the picture.
function spriteTexture(scene, n) {
  const size = 128;
  const texture = new DynamicTexture(`sprite${n}`, { width: size, height: size }, scene, true);
  const ctx = texture.getContext();
  const rand = seeded(4421 + n * 277);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const x = size * (0.5 + (rand() - 0.5) * 0.3);
    const y = size * (0.24 + (rand() - 0.5) * 0.12);
    const r = size * (0.16 + rand() * 0.12);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, 'rgba(255,90,70,0.6)');
    glow.addColorStop(0.5, 'rgba(230,40,50,0.22)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }
  const strands = 7 + Math.floor(rand() * 5);
  for (let k = 0; k < strands; k++) {
    let x = size * (0.3 + rand() * 0.4);
    let y = size * (0.28 + rand() * 0.08);
    const end = size * (0.62 + rand() * 0.32);
    while (y < end) {
      const toX = x + (rand() - 0.5) * 5;
      const toY = y + 5 + rand() * 4;
      const t = (y / size - 0.28) / 0.66;
      ctx.strokeStyle = `rgba(${Math.round(255 - 110 * t)},${Math.round(70 + 20 * t)},${Math.round(80 + 170 * t)},${(0.75 * (1 - t * 0.7)).toFixed(2)})`;
      ctx.lineWidth = 1.6 - t;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      x = toX;
      y = toY;
    }
  }
  texture.update();
  return texture;
}

// A round soft light of one colour, on black: Io's footprint.
function spotTexture(scene, name, [r, g, b]) {
  const texture = new DynamicTexture(name, { width: 64, height: 64 }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 64, 64);
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.15, `rgba(${r},${g},${b},0.9)`);
  glow.addColorStop(0.45, `rgba(${r},${g},${b},0.25)`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  texture.update();
  return texture;
}

// A flat picture that only adds its light.
function lightCard(scene, name, texture) {
  const material = new StandardMaterial(name, scene);
  material.emissiveTexture = texture;
  material.emissiveColor = new Color3(0, 0, 0);
  material.diffuseColor = new Color3(0, 0, 0);
  material.specularColor = new Color3(0, 0, 0);
  material.disableLighting = true;
  material.alphaMode = Constants.ALPHA_ADD;
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  const mesh = CreatePlane(name, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return { mesh, material };
}

function veilMaterial(scene, name, { low, high, ripple, nightOnly, dark = false, soft = false }) {
  Effect.ShadersStore.veilVertexShader = veilVert;
  Effect.ShadersStore.veilFragmentShader = veilFrag;
  const material = new ShaderMaterial(name, scene, { vertex: 'veil', fragment: 'veil' }, {
    attributes: ['position'],
    uniforms: ['worldViewProjection', 'world', 'centre', 'colorLow', 'colorHigh', 'strength', 'time', 'ripple', 'nightOnly', 'sunDir', 'dark', 'soft'],
  });
  // Smoke covers what is behind it; light is added to it.
  material.alphaMode = dark ? Constants.ALPHA_COMBINE : Constants.ALPHA_ADD;
  material.setFloat('dark', dark ? 1 : 0);
  material.setFloat('soft', soft ? 1 : 0);
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  material.setColor3('colorLow', new Color3(...low));
  material.setColor3('colorHigh', new Color3(...high));
  material.setFloat('ripple', ripple);
  material.setFloat('nightOnly', Number(nightOnly));
  material.setFloat('strength', 1);
  material.setFloat('time', 0);
  material.setVector3('sunDir', Vector3.Up());
  material.setVector3('centre', Vector3.Zero());
  return material;
}

// An open cone band one unit tall: radius `foot` at the bottom, `top` at the top.
function band(scene, name, foot, top, tessellation) {
  const mesh = CreateCylinder(name, {
    height: 1, diameterBottom: 2 * foot, diameterTop: 2 * top, tessellation, cap: Mesh.NO_CAP,
  }, scene);
  mesh.isPickable = false;
  mesh.rotationQuaternion = new Quaternion();
  mesh.setEnabled(false);
  return mesh;
}

// Aurora, lightning and plumes (core/glows.js).
export function createGlows(scene, bodies) {
  const radiusOf = (id) => bodies.find((b) => b.id === id).radiusKm;

  const auroras = AURORAS.flatMap((aurora) => [true, false].map((north) => {
    const { foot, top } = auroraBand(aurora, radiusOf(aurora.body), north);
    const material = veilMaterial(scene, `aurora_${aurora.body}_${north}`, { low: aurora.low, high: aurora.high, ripple: 14, nightOnly: true });
    const mesh = band(scene, `aurora_${aurora.body}_${north}`, foot.radiusKm / KM_PER_UNIT, top.radiusKm / KM_PER_UNIT, 96);
    mesh.material = material;
    // The southern one is the same band upside down.
    if (!north) Quaternion.RotationAxisToRef(Vector3.Right(), Math.PI, mesh.rotationQuaternion);
    mesh.scaling.y = Math.abs(top.yKm - foot.yKm) / KM_PER_UNIT;
    return { aurora, mesh, material, yKm: (foot.yKm + top.yKm) / 2 };
  }));

  const plumes = PLUMES.map((plume) => {
    const ice = plume.body === 'enceladus';
    const dusty = plume.body === 'mars';
    const material = veilMaterial(scene, `plume_${plume.id}`, plume.dark
      ? { low: [0.1, 0.09, 0.09], high: [0.1, 0.09, 0.09], ripple: 0, nightOnly: false, dark: true }
      : dusty
        ? { low: [0.95, 0.72, 0.5], high: [0.8, 0.6, 0.42], ripple: 0, nightOnly: false }
        : { low: ice ? [0.8, 0.9, 1] : [0.75, 0.8, 1], high: ice ? [0.5, 0.7, 1] : [0.45, 0.55, 0.9], ripple: 0, nightOnly: false });
    material.setFloat('strength', plume.dark ? 0.6 : dusty ? 0.45 : ice ? 0.13 : 0.4);
    const mesh = band(scene, `plume_${plume.id}`, (plume.widthKm * 0.04) / KM_PER_UNIT, (plume.widthKm / 2) / KM_PER_UNIT, 24);
    mesh.material = material;
    mesh.scaling.y = plume.heightKm / KM_PER_UNIT;
    return { plume, mesh, material };
  });

  // Night-shining clouds: a sheet over Earth's north polar cap, lit along the edge of night.
  const cloudBand = sheetBand(NIGHT_CLOUDS, radiusOf(NIGHT_CLOUDS.body));
  const cloudMaterial = veilMaterial(scene, 'nightClouds', { low: NIGHT_CLOUDS.low, high: NIGHT_CLOUDS.high, ripple: 9, nightOnly: 2 });
  const cloudMesh = band(scene, 'nightClouds', cloudBand.foot.radiusKm / KM_PER_UNIT, cloudBand.top.radiusKm / KM_PER_UNIT, 96);
  cloudMesh.material = cloudMaterial;
  cloudMesh.scaling.y = (cloudBand.top.yKm - cloudBand.foot.yKm) / KM_PER_UNIT;
  const cloudYKm = (cloudBand.foot.yKm + cloudBand.top.yKm) / 2;

  // Io's footprint: a point of light in each hemisphere of Jupiter.
  const footTexture = spotTexture(scene, 'footprint', [150, 190, 255]);
  const footprints = [true, false].map((north) => {
    const card = lightCard(scene, `footprint_${north}`, footTexture);
    card.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    return { ...card, north };
  });

  // Mercury's sodium tail: two planes crossed along its length, like a comet's.
  Effect.ShadersStore.sodiumVertexShader = glowVert;
  Effect.ShadersStore.sodiumFragmentShader = sodiumFrag;
  const sodiumMaterial = new ShaderMaterial('sodium', scene, { vertex: 'sodium', fragment: 'sodium' }, {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'strength'],
  });
  sodiumMaterial.alphaMode = Constants.ALPHA_ADD;
  sodiumMaterial.needAlphaBlending = () => true;
  sodiumMaterial.disableDepthWrite = true;
  sodiumMaterial.backFaceCulling = false;
  sodiumMaterial.setFloat('strength', 0.2);
  const sodium = new TransformNode('sodiumTail', scene);
  sodium.rotationQuaternion = new Quaternion();
  for (const turn of [0, Math.PI / 2]) {
    const plane = CreatePlane(`sodiumTail${turn}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
    plane.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0));
    plane.rotation.y = turn;
    plane.parent = sodium;
    plane.material = sodiumMaterial;
    plane.isPickable = false;
  }
  const sodiumLength = SODIUM_TAIL.lengthKm / KM_PER_UNIT;
  sodium.scaling.set(sodiumLength * SODIUM_TAIL.spread, sodiumLength, sodiumLength * SODIUM_TAIL.spread);

  // The jets of Halley's nucleus: narrow cones of lit dust on its day side.
  const jets = JETS.lean.map((_, i) => {
    const material = veilMaterial(scene, `jet${i}`, { low: [1, 0.97, 0.9], high: [0.75, 0.85, 1], ripple: 0, nightOnly: false, soft: true });
    const mesh = band(scene, `jet${i}`, (JETS.widthKm * 0.04) / KM_PER_UNIT, (JETS.widthKm / 2) / KM_PER_UNIT, 20);
    mesh.material = material;
    mesh.scaling.y = JETS.heightKm / KM_PER_UNIT;
    return { mesh, material };
  });

  // Red sprites over Earth's thunderstorms: a few pictures, a few cards to show them on.
  const spritePictures = [0, 1, 2].map((n) => spriteTexture(scene, n));
  const sprites = [0, 1, 2, 3].map((i) => {
    const card = lightCard(scene, `sprite${i}`, spritePictures[i % 3]);
    card.mesh.rotationQuaternion = new Quaternion();
    return { ...card, up: null, age: 0, sizeKm: 0 };
  });

  const bolts = Array.from({ length: BOLTS }, (_, n) => boltTexture(scene, n));
  // One set of flashes for each world with thunderstorms (core/glows.js STORMS).
  const storms = STORMS.map((storm) => {
    const flashes = [];
    for (let i = 0; i < FLASHES; i++) {
      const material = new StandardMaterial(`flash_${storm.body}${i}`, scene);
      // The picture alone gives the light (an emissive colour would be added on top of it).
      material.emissiveTexture = bolts[i % BOLTS];
      material.emissiveColor = new Color3(0, 0, 0);
      material.diffuseColor = new Color3(0, 0, 0);
      material.specularColor = new Color3(0, 0, 0);
      material.disableLighting = true;
      material.alphaMode = Constants.ALPHA_ADD;
      material.backFaceCulling = false;
      material.disableDepthWrite = true;
      const mesh = CreatePlane(`flash_${storm.body}${i}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
      mesh.material = material;
      mesh.isPickable = false;
      mesh.rotationQuaternion = new Quaternion();
      mesh.setEnabled(false);
      flashes.push({ mesh, material, up: null, age: 0, sizeKm: 0 });
    }
    // coming: strokes still to come in the storm that last flashed, [{ in: seconds, up }].
    return { storm, flashes, coming: [], wait: 1 };
  });

  // Impact flashes on the Moon: a white point in a small warm glow.
  const spark = new DynamicTexture('impactSpark', { width: 64, height: 64 }, scene, true);
  {
    const ctx = spark.getContext();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 64);
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.12, 'rgba(255,240,200,0.9)');
    glow.addColorStop(0.4, 'rgba(255,190,110,0.25)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    spark.update();
  }
  const impacts = [];
  for (let i = 0; i < 3; i++) {
    const material = new StandardMaterial(`impact${i}`, scene);
    material.emissiveTexture = spark;
    material.emissiveColor = new Color3(0, 0, 0);
    material.diffuseColor = new Color3(0, 0, 0);
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    material.alphaMode = Constants.ALPHA_ADD;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    const mesh = CreatePlane(`impact${i}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    impacts.push({ mesh, material, up: null, age: 0, sizeKm: 0 });
  }
  let impactWait = 2;

  const rel = (km, position) => km.map((n, i) => (n - position[i]) / KM_PER_UNIT);
  const height = (body, position) => Math.hypot(...position.map((n, i) => n - body.position[i])) - body.radiusKm;

  // now: this frame's bodies (km); position: the traveler (km); elapsed: seconds of
  // play (the bodies' spin runs off the same clock). Returns what flashed in this frame
  // ('lightning', 'lightning:earth', 'sprite', 'impact'), else null.
  function update(dt, elapsed, now, sunPosition, position) {
    const find = (id) => now.find((b) => b.id === id);
    const sunFrom = (body) => new Vector3(...sunPosition.map((n, i) => n - body.position[i])).normalize();

    for (const { aurora, mesh, material, yKm } of auroras) {
      const body = find(aurora.body);
      const on = height(body, position) <= aurora.rangeRadii * body.radiusKm;
      mesh.setEnabled(on);
      if (!on) continue;
      const centre = rel(body.position, position);
      mesh.position.set(centre[0], centre[1] + yKm / KM_PER_UNIT, centre[2]);
      material.setVector3('centre', new Vector3(...centre));
      material.setVector3('sunDir', sunFrom(body));
      material.setFloat('time', elapsed);
      material.setFloat('strength', 1.7);
    }

    {
      const body = find(NIGHT_CLOUDS.body);
      const on = height(body, position) <= NIGHT_CLOUDS.rangeRadii * body.radiusKm;
      cloudMesh.setEnabled(on);
      if (on) {
        const centre = rel(body.position, position);
        cloudMesh.position.set(centre[0], centre[1] + cloudYKm / KM_PER_UNIT, centre[2]);
        cloudMaterial.setVector3('centre', new Vector3(...centre));
        cloudMaterial.setVector3('sunDir', sunFrom(body));
        cloudMaterial.setFloat('time', elapsed);
        cloudMaterial.setFloat('strength', 0.5);
      }
    }

    {
      const body = find(FOOTPRINT.body);
      const moon = find(FOOTPRINT.moon);
      const on = height(body, position) <= FOOTPRINT.rangeRadii * body.radiusKm;
      const toMoon = moon.position.map((n, i) => n - body.position[i]);
      const toSun = sunFrom(body);
      for (const { mesh, material, north } of footprints) {
        const up = footprintUp(toMoon, north);
        // It is seen on the night side, like the aurora it belongs to.
        const night = Math.max(0, Math.min(1, (0.1 - Vector3.Dot(new Vector3(...up), toSun)) / 0.25));
        mesh.setEnabled(on && night > 0);
        if (!on || night <= 0) continue;
        const at = rel(body.position.map((n, i) => n + up[i] * (body.radiusKm + FOOTPRINT.liftKm)), position);
        mesh.position.set(at[0], at[1], at[2]);
        // A little flicker, and never smaller on screen than a few pixels.
        const size = Math.max(FOOTPRINT.sizeKm, Math.hypot(...at) * KM_PER_UNIT * 0.012);
        mesh.scaling.setAll(size / KM_PER_UNIT);
        material.alpha = 0.99 * night * (0.8 + 0.2 * Math.sin(elapsed * 5.3));
      }
    }

    {
      const body = find(SODIUM_TAIL.body);
      const at = rel(body.position, position);
      const away = new Vector3(...body.position.map((n, i) => n - sunPosition[i])).normalize();
      sodium.position.set(at[0], at[1], at[2]);
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), away, sodium.rotationQuaternion);
    }

    {
      const body = find(JETS.body);
      const activity = cometActivity(body.sunKm / AU_KM);
      const on = activity > 0 && height(body, position) <= JETS.rangeKm;
      const toSun = sunFrom(body);
      const ways = jetDirections([toSun.x, toSun.y, toSun.z]);
      jets.forEach(({ mesh, material }, i) => {
        mesh.setEnabled(on);
        if (!on) return;
        const way = ways[i];
        const middle = rel(body.position.map((n, k) => n + way[k] * (body.radiusKm + JETS.heightKm / 2)), position);
        mesh.position.set(middle[0], middle[1], middle[2]);
        Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(...way), mesh.rotationQuaternion);
        // Each swells and sinks on its own.
        material.setFloat('strength', (0.1 + 0.16 * activity) * (0.75 + 0.25 * Math.sin(elapsed * 0.9 + i * 2.1)));
      });
    }

    for (const { plume, mesh } of plumes) {
      const body = find(plume.body);
      const on = height(body, position) <= PLUME_RANGE_RADII * body.radiusKm;
      mesh.setEnabled(on);
      if (!on) continue;
      const up = plumeUp(plume, -(elapsed * TIME_SCALE * 2 * Math.PI) / PLUME_DAY_S[plume.body]);
      // A dust devil is raised by the Sun warming the ground: none at night.
      if (plume.body === 'mars' && Vector3.Dot(new Vector3(...up), sunFrom(body)) < 0.15) {
        mesh.setEnabled(false);
        continue;
      }
      const middle = rel(body.position.map((n, i) => n + up[i] * (body.radiusKm + plume.heightKm / 2)), position);
      mesh.position.set(middle[0], middle[1], middle[2]);
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(...up), mesh.rotationQuaternion);
    }

    // Lightning: patches of night-side cloud lighting up, on Jupiter and on Earth.
    let lit = null;
    let sprited = false;
    for (const set of storms) {
      const { storm, flashes } = set;
      const world = find(storm.body);
      const out = position.map((n, i) => n - world.position[i]);
      const distance = Math.hypot(...out);
      const inRange = distance - world.radiusKm <= storm.rangeKm;
      const strike = (up) => {
        const free = flashes.find((f) => !f.up);
        if (!free) return;
        free.up = up;
        free.age = 0;
        free.sizeKm = storm.sizeKm[0] + Math.random() * (storm.sizeKm[1] - storm.sizeKm[0]);
        free.material.emissiveTexture = bolts[Math.floor(Math.random() * BOLTS)];
        // Over some of Earth's strokes a red sprite stands up for a moment.
        if (storm.body === SPRITE.body && Math.random() < SPRITE.chance) {
          const card = sprites.find((s) => !s.up);
          if (card) {
            card.up = up;
            card.age = 0;
            card.sizeKm = SPRITE.heightKm[0] + Math.random() * (SPRITE.heightKm[1] - SPRITE.heightKm[0]);
            card.material.emissiveTexture = spritePictures[Math.floor(Math.random() * spritePictures.length)];
            sprited = true;
          }
        }
        // Lying flat on the cloud tops, turned any way round.
        const normal = new Vector3(...up);
        Quaternion.FromUnitVectorsToRef(Vector3.Forward(), normal, free.mesh.rotationQuaternion);
        Quaternion.RotationAxis(normal, Math.random() * Math.PI * 2).multiplyToRef(free.mesh.rotationQuaternion, free.mesh.rotationQuaternion);
      };
      if (inRange) {
        set.wait -= dt;
        if (set.wait <= 0) {
          const toSun = sunFrom(world);
          const spot = meteorSpot(Math.random, [toSun.x, toSun.y, toSun.z], out.map((n) => n / distance));
          set.wait = lightningGap(Math.random, storm);
          if (spot) {
            strike(spot.up);
            lit = storm.id;
            // A storm flashes several times: one to three more strokes close by, within
            // half a second.
            const more = 1 + Math.floor(Math.random() * 3);
            for (let k = 0; k < more; k++) {
              const near = spot.up.map((n) => n + (Math.random() - 0.5) * storm.spread);
              const length = Math.hypot(...near);
              set.coming.push({ in: 0.08 + Math.random() * 0.42, up: near.map((n) => n / length) });
            }
          }
        }
        for (const stroke of set.coming) {
          stroke.in -= dt;
          if (stroke.in <= 0) strike(stroke.up);
        }
        set.coming = set.coming.filter((stroke) => stroke.in > 0);
      } else {
        set.coming = [];
      }
      for (const flash of flashes) {
        if (!flash.up) continue;
        flash.age += dt;
        const glow = inRange ? lightningGlow(flash.age) : 0;
        if (flash.age >= LIGHTNING_LIFE_S || !inRange) {
          flash.up = null;
          flash.mesh.setEnabled(false);
          continue;
        }
        const at = rel(world.position.map((n, i) => n + flash.up[i] * (world.radiusKm + storm.liftKm)), position);
        flash.mesh.setEnabled(true);
        flash.mesh.position.set(at[0], at[1], at[2]);
        flash.mesh.scaling.setAll(flash.sizeKm / KM_PER_UNIT);
        // Just under 1 at the brightest, so the picture is always added, never pasted on.
        flash.material.alpha = 0.99 * glow;
      }
    }
    // Sprites: standing up from the storm, turned to face the traveler.
    const earth = find(SPRITE.body);
    for (const sprite of sprites) {
      if (!sprite.up) continue;
      sprite.age += dt;
      if (sprite.age >= SPRITE.lifeS) {
        sprite.up = null;
        sprite.mesh.setEnabled(false);
        continue;
      }
      const at = rel(earth.position.map((n, i) => n + sprite.up[i] * (earth.radiusKm + SPRITE.liftKm + sprite.sizeKm / 2)), position);
      const up = new Vector3(...sprite.up);
      const toEye = new Vector3(-at[0], -at[1], -at[2]);
      const flat = toEye.subtract(up.scale(Vector3.Dot(toEye, up)));
      if (flat.lengthSquared() > 1e-9) Quaternion.FromLookDirectionLHToRef(flat.normalize(), up, sprite.mesh.rotationQuaternion);
      sprite.mesh.setEnabled(true);
      sprite.mesh.position.set(at[0], at[1], at[2]);
      sprite.mesh.scaling.setAll(sprite.sizeKm / KM_PER_UNIT);
      sprite.material.alpha = 0.99 * spriteGlow(sprite.age);
    }
    // Impact flashes on the Moon's night side.
    const moon = find('moon');
    const fromMoon = position.map((n, i) => n - moon.position[i]);
    const moonDistance = Math.hypot(...fromMoon);
    const nearMoon = moonDistance - moon.radiusKm <= IMPACT_RANGE_KM;
    let hit = false;
    if (nearMoon) {
      impactWait -= dt;
      const free = impacts.find((f) => !f.up);
      if (impactWait <= 0 && free) {
        const toSun = sunFrom(moon);
        const spot = meteorSpot(Math.random, [toSun.x, toSun.y, toSun.z], fromMoon.map((n) => n / moonDistance));
        impactWait = impactGap(Math.random);
        if (spot) {
          free.up = spot.up;
          free.age = 0;
          free.sizeKm = IMPACT_SIZE_KM[0] + Math.random() * (IMPACT_SIZE_KM[1] - IMPACT_SIZE_KM[0]);
          hit = true;
        }
      }
    }
    for (const impact of impacts) {
      if (!impact.up) continue;
      impact.age += dt;
      if (impact.age >= IMPACT_LIFE_S || !nearMoon) {
        impact.up = null;
        impact.mesh.setEnabled(false);
        continue;
      }
      const at = rel(moon.position.map((n, i) => n + impact.up[i] * (moon.radiusKm + 5)), position);
      impact.mesh.setEnabled(true);
      impact.mesh.position.set(at[0], at[1], at[2]);
      // Never smaller on screen than a dozen pixels or so, however far off.
      const size = Math.max(impact.sizeKm, Math.hypot(...at) * KM_PER_UNIT * 0.03);
      impact.mesh.scaling.setAll(size / KM_PER_UNIT);
      impact.material.alpha = 0.99 * impactGlow(impact.age);
    }
    if (sprited) return 'sprite';
    if (lit) return lit;
    return hit ? 'impact' : null;
  }

  return { update };
}
