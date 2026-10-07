import {
  CreateCylinder, CreatePlane, Mesh, ShaderMaterial, StandardMaterial, DynamicTexture, Effect, Color3, Vector3, Quaternion, Constants, Matrix, TransformNode,
} from './babylon.js';
import veilVert from './shaders/veil.vert?raw';
import veilFrag from './shaders/veil.frag?raw';
import glowVert from './shaders/glow.vert?raw';
import sodiumFrag from './shaders/sodium.frag?raw';
import eringFrag from './shaders/ering.frag?raw';
import { KM_PER_UNIT, TIME_SCALE, AU_KM } from '../core/bodies.js';
import { SPIN_DAY_S, EARTH_START_SPIN, spinAngle, cloudSpin } from '../core/surface.js';
import { cometActivity } from '../core/comet.js';
import { meteorSpot } from '../core/meteors.js';
import {
  AURORAS, auroraBand, auroraStorm, STEVE, PEARL_CLOUDS, PULSE, STORMS, LIGHTNING_LIFE_S, lightningGap, lightningGlow, TYPHOON, typhoonUp, typhoonStrike,
  PLUMES, PLUME_DAY_S, PLUME_RANGE_RADII, plumeUp,
  IMPACT_RANGE_KM, IMPACT_LIFE_S, IMPACT_SIZE_KM, impactGap, impactGlow,
  NIGHT_CLOUDS, sheetBand, FOOTPRINT, footprintUp, SODIUM_TAIL, JETS, jetDirections, SPRITE, spriteGlow, ELVES, elvesRing, BLUE_JET, blueJetGlow, E_RING,
} from '../core/glows.js';

const FLASHES = 8;
// A dust devil's shadow: at most this many times its height long (at five its far end
// stood 11 km clear of the ground and showed past the limb as a dark line on the sky),
// and drawn this far above the ground (the ground is a ball: a flat strip laid on it
// would dip under).
const DEVIL_SHADOW_MAX = 3;
// And never longer than this: the strip is flat and the ground falls away under it.
const DEVIL_SHADOW_MAX_KM = 170;
const DEVIL_SHADOW_LIFT_KM = 1.2;
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

// ELVES seen from above: a red ring, soft on both sides, empty in the middle. On black.
function elvesTexture(scene) {
  const size = 128;
  const texture = new DynamicTexture('elves', { width: size, height: size }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const ring = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  ring.addColorStop(0, 'rgba(255,60,50,0.06)');
  ring.addColorStop(0.55, 'rgba(255,60,50,0.12)');
  ring.addColorStop(0.8, 'rgba(255,80,60,0.85)');
  ring.addColorStop(0.9, 'rgba(255,120,90,0.5)');
  ring.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, size, size);
  texture.update();
  return texture;
}

// A blue jet seen from the side: a narrow stem from the foot that opens into a fan of
// strands, blue below and paler violet at the top. On black.
function blueJetTexture(scene) {
  const size = 128;
  const texture = new DynamicTexture('blueJet', { width: size, height: size }, scene, true);
  const ctx = texture.getContext();
  const rand = seeded(9173);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createLinearGradient(0, size, 0, 0);
  glow.addColorStop(0, 'rgba(120,170,255,1)');
  glow.addColorStop(0.6, 'rgba(80,120,255,0.8)');
  glow.addColorStop(1, 'rgba(150,120,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(size * 0.47, size);
  ctx.lineTo(size * 0.53, size);
  ctx.lineTo(size * 0.74, size * 0.04);
  ctx.lineTo(size * 0.26, size * 0.04);
  ctx.closePath();
  ctx.fill();
  for (let k = 0; k < 9; k++) {
    let x = size * 0.5;
    let y = size;
    const lean = (rand() - 0.5) * 0.5;
    ctx.strokeStyle = 'rgba(160,195,255,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y > size * (0.05 + rand() * 0.2)) {
      x += lean * 6 + (rand() - 0.5) * 3;
      y -= 6 + rand() * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
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

function veilMaterial(scene, name, { low, high, ripple, nightOnly, dark = false, soft = false, devil = false }) {
  Effect.ShadersStore.veilVertexShader = veilVert;
  Effect.ShadersStore.veilFragmentShader = veilFrag;
  const material = new ShaderMaterial(name, scene, { vertex: 'veil', fragment: 'veil' }, {
    attributes: ['position'],
    uniforms: ['worldViewProjection', 'world', 'centre', 'colorLow', 'colorHigh', 'strength', 'time', 'ripple', 'nightOnly', 'sunDir', 'dark', 'soft', 'devil', 'sway', 'storm', 'flip', 'arcAt', 'flare'],
  });
  // Smoke covers what is behind it; light is added to it.
  material.alphaMode = dark || devil ? Constants.ALPHA_COMBINE : Constants.ALPHA_ADD;
  material.setFloat('dark', dark ? 1 : 0);
  material.setFloat('devil', devil ? 1 : 0);
  material.setFloat('sway', 0);
  material.setFloat('storm', 0);
  material.setFloat('flip', 1);
  material.setFloat('arcAt', 0);
  material.setFloat('flare', 0);
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

// The shadow a dust devil lays on the ground: dark at its foot, fading along its length
// (x) and soft at the sides.
function shadowTexture(scene) {
  const texture = new DynamicTexture('devilShadow', { width: 128, height: 32 }, scene, true);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 128, 32);
  const image = ctx.createImageData(128, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 128; x++) {
      const along = x / 127;
      const across = Math.abs((y - 15.5) / 15.5);
      const alpha = Math.min(1, along / 0.04) * (1 - along) ** 0.8 * Math.max(0, 1 - across * across) ** 1.5;
      image.data[(y * 128 + x) * 4 + 3] = Math.round(255 * alpha);
    }
  }
  ctx.putImageData(image, 0, 0);
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

// An open cone band one unit tall: radius `foot` at the bottom, `top` at the top.
// rings: how many bands it is cut into up its height (more for one bent by its shader).
function band(scene, name, foot, top, tessellation, rings = 1) {
  const mesh = CreateCylinder(name, {
    height: 1, diameterBottom: 2 * foot, diameterTop: 2 * top, tessellation, subdivisions: rings, cap: Mesh.NO_CAP,
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
    if (aurora.body === 'jupiter') material.setFloat('flare', 1);
    // Earth's two rings mirror each other: the same folds over the same longitude.
    if (aurora.body === 'earth') material.setFloat('flip', north ? 1 : -1);
    // The southern one is the same band upside down.
    if (!north) Quaternion.RotationAxisToRef(Vector3.Right(), Math.PI, mesh.rotationQuaternion);
    mesh.scaling.y = Math.abs(top.yKm - foot.yKm) / KM_PER_UNIT;
    return { aurora, mesh, material, yKm: (foot.yKm + top.yKm) / 2 };
  }));

  const devilShadow = shadowTexture(scene);
  const plumes = PLUMES.map((plume) => {
    const ice = plume.body === 'enceladus';
    const dusty = plume.body === 'mars';
    // A dust devil on Mars: a column of dust and the shadow it lays on the ground.
    if (dusty && !plume.dark) {
      const material = veilMaterial(scene, `plume_${plume.id}`, { low: [0.8, 0.56, 0.38], high: [0.93, 0.74, 0.56], ripple: 0, nightOnly: false, devil: true });
      material.setFloat('strength', 0.92);
      const radius = (plume.widthKm * 0.3) / KM_PER_UNIT;
      material.setFloat('sway', radius * 1.6);
      const mesh = band(scene, `plume_${plume.id}`, radius, radius, 20, 24);
      mesh.material = material;
      mesh.scaling.y = plume.heightKm / KM_PER_UNIT;
      const dark = new StandardMaterial(`shadow_${plume.id}`, scene);
      dark.diffuseColor = new Color3(0, 0, 0);
      dark.emissiveColor = new Color3(0.07, 0.03, 0.02);
      dark.specularColor = new Color3(0, 0, 0);
      dark.disableLighting = true;
      dark.opacityTexture = devilShadow;
      dark.alpha = 0.6;
      dark.backFaceCulling = false;
      dark.disableDepthWrite = true;
      const shadow = CreatePlane(`shadow_${plume.id}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
      shadow.material = dark;
      shadow.isPickable = false;
      shadow.rotationQuaternion = new Quaternion();
      shadow.setEnabled(false);
      return { plume, mesh, material, shadow };
    }
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

  // Round Earth's aurora (core/glows.js): STEVE's ribbon on the equator's side of the
  // northern ring, the mother-of-pearl clouds over the south polar cap, and the
  // pulsating patches inside either ring's reach.
  const steveBand = auroraBand(STEVE, radiusOf(STEVE.body));
  const steveMaterial = veilMaterial(scene, 'steve', { low: STEVE.low, high: STEVE.high, ripple: 0, nightOnly: 3 });
  const steveMesh = band(scene, 'steve', steveBand.foot.radiusKm / KM_PER_UNIT, steveBand.top.radiusKm / KM_PER_UNIT, 96);
  steveMesh.material = steveMaterial;
  steveMesh.scaling.y = (steveBand.top.yKm - steveBand.foot.yKm) / KM_PER_UNIT;
  const steveYKm = (steveBand.foot.yKm + steveBand.top.yKm) / 2;
  const polarSheets = [
    { sheet: PEARL_CLOUDS, mode: 4, strength: 0.6 },
    { sheet: PULSE, mode: 5, strength: 0.45 },
    { sheet: { ...PULSE, latDeg: [-PULSE.latDeg[1], -PULSE.latDeg[0]] }, mode: 5, strength: 0.45 },
  ].map(({ sheet, mode, strength }, i) => {
    const { foot, top } = sheetBand(sheet, radiusOf(sheet.body));
    const material = veilMaterial(scene, `polarSheet${i}`, { low: sheet.low, high: sheet.high, ripple: 0, nightOnly: mode });
    const mesh = band(scene, `polarSheet${i}`, foot.radiusKm / KM_PER_UNIT, top.radiusKm / KM_PER_UNIT, 96);
    mesh.material = material;
    mesh.scaling.y = (top.yKm - foot.yKm) / KM_PER_UNIT;
    return { sheet, mesh, material, strength, yKm: (foot.yKm + top.yKm) / 2 };
  });

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

  // Saturn's E ring: one flat card in the plane Enceladus goes round in.
  Effect.ShadersStore.eringVertexShader = glowVert;
  Effect.ShadersStore.eringFragmentShader = eringFrag;
  const eringMaterial = new ShaderMaterial('ering', scene, { vertex: 'ering', fragment: 'ering' }, {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'strength', 'at'],
  });
  eringMaterial.alphaMode = Constants.ALPHA_ADD;
  eringMaterial.needAlphaBlending = () => true;
  eringMaterial.disableDepthWrite = true;
  eringMaterial.backFaceCulling = false;
  eringMaterial.setFloat('at', 1 / E_RING.spread);
  const ering = CreatePlane('ering', { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
  ering.rotation.x = Math.PI / 2;
  ering.material = eringMaterial;
  ering.isPickable = false;
  ering.setEnabled(false);

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

  // ELVES (rings lying flat, high over the storm) and blue jets (standing up from it).
  const elvesPicture = elvesTexture(scene);
  const elves = [0, 1].map((i) => {
    const card = lightCard(scene, `elves${i}`, elvesPicture);
    card.mesh.rotationQuaternion = new Quaternion();
    return { ...card, up: null, age: 0, sizeKm: 0 };
  });
  const blueJetPicture = blueJetTexture(scene);
  const blueJets = [0, 1].map((i) => {
    const card = lightCard(scene, `blueJet${i}`, blueJetPicture);
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
  // Seconds until the typhoon's next stroke (core/glows.js TYPHOON).
  let typhoonWait = 1;

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
  // ('lightning', 'lightning:earth', 'sprite', 'elves', 'bluejet', 'impact'), else null.
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
      // A strong night (core/glows.js auroraStorm): Earth's curtains brighten and their
      // tops redden.
      const storm = aurora.body === 'earth' ? auroraStorm(elapsed) : 0;
      material.setFloat('storm', storm);
      material.setFloat('strength', 1.7 * (1 + 0.5 * storm));
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
      const body = find(STEVE.body);
      const high = height(body, position);
      const centre = rel(body.position, position);
      const toSun = sunFrom(body);
      const storm = auroraStorm(elapsed);
      const steveOn = storm > 0 && high <= STEVE.rangeRadii * body.radiusKm;
      steveMesh.setEnabled(steveOn);
      if (steveOn) {
        steveMesh.position.set(centre[0], centre[1] + steveYKm / KM_PER_UNIT, centre[2]);
        steveMaterial.setVector3('centre', new Vector3(...centre));
        steveMaterial.setVector3('sunDir', toSun);
        steveMaterial.setFloat('time', elapsed);
        steveMaterial.setFloat('storm', storm);
        // Its arc stands on the evening side of midnight.
        steveMaterial.setFloat('arcAt', Math.atan2(-toSun.z, -toSun.x) + 0.6);
        steveMaterial.setFloat('strength', 1.2);
      }
      for (const { sheet, mesh, material, strength, yKm } of polarSheets) {
        const on = high <= sheet.rangeRadii * body.radiusKm;
        mesh.setEnabled(on);
        if (!on) continue;
        mesh.position.set(centre[0], centre[1] + yKm / KM_PER_UNIT, centre[2]);
        material.setVector3('centre', new Vector3(...centre));
        material.setVector3('sunDir', toSun);
        material.setFloat('time', elapsed);
        material.setFloat('strength', strength);
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
      const body = find(E_RING.body);
      const moon = find(E_RING.moon);
      const on = height(body, position) <= E_RING.rangeRadii * body.radiusKm;
      ering.setEnabled(on);
      if (on) {
        const out = moon.position.map((n, i) => n - body.position[i]);
        // In the plane the moon goes round in (level, at the moon's own height).
        const centre = rel([body.position[0], moon.position[1], body.position[2]], position);
        ering.position.set(centre[0], centre[1], centre[2]);
        ering.scaling.setAll((2 * Math.hypot(out[0], out[2]) * E_RING.spread) / KM_PER_UNIT);
        // Against the light the fine ice scatters the Sun forward and the ring stands out.
        const eye = new Vector3(...position.map((n, i) => n - body.position[i])).normalize();
        const against = Math.max(0, -Vector3.Dot(eye, sunFrom(body)));
        eringMaterial.setFloat('strength', E_RING.light * (1 + 3 * against * against));
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

    for (const { plume, mesh, material, shadow } of plumes) {
      const body = find(plume.body);
      const on = height(body, position) <= PLUME_RANGE_RADII * body.radiusKm;
      mesh.setEnabled(on);
      shadow?.setEnabled(false);
      if (!on) continue;
      const up = plumeUp(plume, -(elapsed * TIME_SCALE * 2 * Math.PI) / PLUME_DAY_S[plume.body]);
      // A dust devil is raised by the Sun warming the ground: none at night.
      // (The polar jets burst out at the first low sunlight of spring: for them the Sun
      // need only be at the horizon.)
      if (plume.body === 'mars' && Vector3.Dot(new Vector3(...up), sunFrom(body)) < (plume.dark ? -0.02 : 0.15)) {
        mesh.setEnabled(false);
        continue;
      }
      const middle = rel(body.position.map((n, i) => n + up[i] * (body.radiusKm + plume.heightKm / 2)), position);
      mesh.position.set(middle[0], middle[1], middle[2]);
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(...up), mesh.rotationQuaternion);
      if (shadow) {
        const toSun = sunFrom(body);
        material.setVector3('centre', new Vector3(...rel(body.position, position)));
        material.setVector3('sunDir', toSun);
        material.setFloat('time', elapsed);
        // The shadow lies on the ground from the foot, straight away from the Sun, as
        // long as the Sun's height makes it (three heights at most, near sunset).
        const above = new Vector3(...up);
        const high = Vector3.Dot(above, toSun);
        const away = above.scale(high).subtract(toSun);
        const low = away.length();
        if (low > 0.02) {
          away.scaleInPlace(1 / low);
          const lengthKm = Math.min(DEVIL_SHADOW_MAX_KM, Math.min(DEVIL_SHADOW_MAX, low / Math.max(high, 0.05)) * plume.heightKm);
          const across = Vector3.Cross(above, away);
          Quaternion.RotationQuaternionFromAxisToRef(away, across, above, shadow.rotationQuaternion);
          const foot = rel(body.position.map((n, i) => n + up[i] * (body.radiusKm + DEVIL_SHADOW_LIFT_KM)), position);
          const half = lengthKm / 2 / KM_PER_UNIT;
          shadow.position.set(foot[0] + away.x * half, foot[1] + away.y * half, foot[2] + away.z * half);
          shadow.scaling.set(lengthKm / KM_PER_UNIT, (plume.widthKm * 0.9) / KM_PER_UNIT, 1);
          shadow.setEnabled(true);
        }
      }
    }

    // Lightning: patches of night-side cloud lighting up, on Jupiter and on Earth.
    let lit = null;
    let sprited = false;
    let ringed = false;
    let jetted = false;
    for (const set of storms) {
      const { storm, flashes } = set;
      const world = find(storm.body);
      const out = position.map((n, i) => n - world.position[i]);
      const distance = Math.hypot(...out);
      const inRange = distance - world.radiusKm <= storm.rangeKm;
      const strike = (up, sizeKm = storm.sizeKm) => {
        const free = flashes.find((f) => !f.up);
        if (!free) return;
        free.up = up;
        free.age = 0;
        free.sizeKm = sizeKm[0] + Math.random() * (sizeKm[1] - sizeKm[0]);
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
        } else if (storm.body === ELVES.body && Math.random() < ELVES.chance) {
          // Or a red ring spreads high over it,
          const card = elves.find((s) => !s.up);
          if (card) {
            card.up = up;
            card.age = 0;
            card.sizeKm = ELVES.sizeKm[0] + Math.random() * (ELVES.sizeKm[1] - ELVES.sizeKm[0]);
            Quaternion.FromUnitVectorsToRef(Vector3.Forward(), new Vector3(...up), card.mesh.rotationQuaternion);
            ringed = true;
          }
        } else if (storm.body === BLUE_JET.body && Math.random() < BLUE_JET.chance) {
          // or a blue jet shoots up from the cloud top.
          const card = blueJets.find((s) => !s.up);
          if (card) {
            card.up = up;
            card.age = 0;
            card.sizeKm = BLUE_JET.heightKm[0] + Math.random() * (BLUE_JET.heightKm[1] - BLUE_JET.heightKm[0]);
            jetted = true;
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
        // The typhoon's own lightning, while it is in the dark and on the side she sees.
        if (storm.body === TYPHOON.body) {
          const eye = typhoonUp(cloudSpin(spinAngle(SPIN_DAY_S.earth, elapsed * TIME_SCALE, EARTH_START_SPIN)));
          const toSun = sunFrom(world);
          const dark = eye[0] * toSun.x + eye[1] * toSun.y + eye[2] * toSun.z < -0.05;
          const seen = (eye[0] * out[0] + eye[1] * out[1] + eye[2] * out[2]) / distance > 0.1;
          typhoonWait -= dt;
          if (typhoonWait <= 0) {
            typhoonWait = TYPHOON.gapS[0] + Math.random() * (TYPHOON.gapS[1] - TYPHOON.gapS[0]);
            if (dark && seen) {
              strike(typhoonStrike(Math.random, eye, world.radiusKm), TYPHOON.sizeKm);
              lit = storm.id;
            }
          }
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
    // ELVES: flat over the storm, spreading as they fade.
    for (const ring of elves) {
      if (!ring.up) continue;
      ring.age += dt;
      const now = elvesRing(ring.age);
      if (ring.age >= ELVES.lifeS) {
        ring.up = null;
        ring.mesh.setEnabled(false);
        continue;
      }
      const at = rel(earth.position.map((n, i) => n + ring.up[i] * (earth.radiusKm + ELVES.liftKm)), position);
      ring.mesh.setEnabled(true);
      ring.mesh.position.set(at[0], at[1], at[2]);
      ring.mesh.scaling.setAll((ring.sizeKm * now.spread) / KM_PER_UNIT);
      ring.material.alpha = 0.99 * now.light;
    }
    // Blue jets: standing up from the cloud top, turned to face the traveler, shooting up.
    for (const jet of blueJets) {
      if (!jet.up) continue;
      jet.age += dt;
      const now = blueJetGlow(jet.age);
      if (jet.age >= BLUE_JET.lifeS) {
        jet.up = null;
        jet.mesh.setEnabled(false);
        continue;
      }
      const tall = jet.sizeKm * now.rise;
      const at = rel(earth.position.map((n, i) => n + jet.up[i] * (earth.radiusKm + BLUE_JET.liftKm + tall / 2)), position);
      const up = new Vector3(...jet.up);
      const toEye = new Vector3(-at[0], -at[1], -at[2]);
      const level = toEye.subtract(up.scale(Vector3.Dot(toEye, up)));
      if (level.lengthSquared() > 1e-9) Quaternion.FromLookDirectionLHToRef(level.normalize(), up, jet.mesh.rotationQuaternion);
      jet.mesh.setEnabled(true);
      jet.mesh.position.set(at[0], at[1], at[2]);
      jet.mesh.scaling.set((jet.sizeKm * 0.5) / KM_PER_UNIT, tall / KM_PER_UNIT, 1);
      jet.material.alpha = 0.99 * now.light;
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
    if (ringed) return 'elves';
    if (jetted) return 'bluejet';
    if (lit) return lit;
    return hit ? 'impact' : null;
  }

  return { update };
}
