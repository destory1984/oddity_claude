import {
  CreateCylinder, CreatePlane, Mesh, ShaderMaterial, StandardMaterial, DynamicTexture, Effect, Color3, Vector3, Quaternion, Constants,
} from './babylon.js';
import veilVert from './shaders/veil.vert?raw';
import veilFrag from './shaders/veil.frag?raw';
import { KM_PER_UNIT, TIME_SCALE } from '../core/bodies.js';
import { meteorSpot } from '../core/meteors.js';
import {
  AURORAS, auroraBand, LIGHTNING_RANGE_KM, LIGHTNING_LIFE_S, LIGHTNING_SIZE_KM, lightningGap, lightningGlow,
  PLUMES, PLUME_DAY_S, PLUME_RANGE_RADII, plumeUp,
} from '../core/glows.js';

const FLASHES = 8;
// How many different bolts are drawn; each flash shows one of them, turned any way.
const BOLTS = 4;
// A flash sits this far above the cloud tops, so it is not half sunk in the globe.
const FLASH_LIFT_KM = 150;

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

function veilMaterial(scene, name, { low, high, ripple, nightOnly }) {
  Effect.ShadersStore.veilVertexShader = veilVert;
  Effect.ShadersStore.veilFragmentShader = veilFrag;
  const material = new ShaderMaterial(name, scene, { vertex: 'veil', fragment: 'veil' }, {
    attributes: ['position'],
    uniforms: ['worldViewProjection', 'world', 'centre', 'colorLow', 'colorHigh', 'strength', 'time', 'ripple', 'nightOnly', 'sunDir'],
  });
  material.alphaMode = Constants.ALPHA_ADD;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  material.setColor3('colorLow', new Color3(...low));
  material.setColor3('colorHigh', new Color3(...high));
  material.setFloat('ripple', ripple);
  material.setFloat('nightOnly', nightOnly ? 1 : 0);
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
    const material = veilMaterial(scene, `plume_${plume.id}`, {
      low: ice ? [0.8, 0.9, 1] : [0.75, 0.8, 1], high: ice ? [0.5, 0.7, 1] : [0.45, 0.55, 0.9], ripple: 0, nightOnly: false,
    });
    material.setFloat('strength', ice ? 0.13 : 0.4);
    const mesh = band(scene, `plume_${plume.id}`, (plume.widthKm * 0.04) / KM_PER_UNIT, (plume.widthKm / 2) / KM_PER_UNIT, 24);
    mesh.material = material;
    mesh.scaling.y = plume.heightKm / KM_PER_UNIT;
    return { plume, mesh, material };
  });

  const bolts = Array.from({ length: BOLTS }, (_, n) => boltTexture(scene, n));
  const flashes = [];
  for (let i = 0; i < FLASHES; i++) {
    const material = new StandardMaterial(`flash${i}`, scene);
    // The picture alone gives the light (an emissive colour would be added on top of it).
    material.emissiveTexture = bolts[i % BOLTS];
    material.emissiveColor = new Color3(0, 0, 0);
    material.diffuseColor = new Color3(0, 0, 0);
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    material.alphaMode = Constants.ALPHA_ADD;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    const mesh = CreatePlane(`flash${i}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.rotationQuaternion = new Quaternion();
    mesh.setEnabled(false);
    flashes.push({ mesh, material, up: null, age: 0, sizeKm: 0 });
  }
  // Strokes still to come in the storm that last flashed: [{ in: seconds, up }].
  let coming = [];
  let wait = 1;

  const rel = (km, position) => km.map((n, i) => (n - position[i]) / KM_PER_UNIT);
  const height = (body, position) => Math.hypot(...position.map((n, i) => n - body.position[i])) - body.radiusKm;

  // now: this frame's bodies (km); position: the traveler (km); elapsed: seconds of
  // play (the bodies' spin runs off the same clock). Returns true when lightning flashes.
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

    for (const { plume, mesh } of plumes) {
      const body = find(plume.body);
      const on = height(body, position) <= PLUME_RANGE_RADII * body.radiusKm;
      mesh.setEnabled(on);
      if (!on) continue;
      const up = plumeUp(plume, -(elapsed * TIME_SCALE * 2 * Math.PI) / PLUME_DAY_S[plume.body]);
      const middle = rel(body.position.map((n, i) => n + up[i] * (body.radiusKm + plume.heightKm / 2)), position);
      mesh.position.set(middle[0], middle[1], middle[2]);
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(...up), mesh.rotationQuaternion);
    }

    // Lightning: patches of Jupiter's night-side cloud lighting up.
    const jupiter = find('jupiter');
    const out = position.map((n, i) => n - jupiter.position[i]);
    const distance = Math.hypot(...out);
    const inRange = distance - jupiter.radiusKm <= LIGHTNING_RANGE_KM;
    let lit = false;
    const strike = (up) => {
      const free = flashes.find((f) => !f.up);
      if (!free) return;
      free.up = up;
      free.age = 0;
      free.sizeKm = LIGHTNING_SIZE_KM[0] + Math.random() * (LIGHTNING_SIZE_KM[1] - LIGHTNING_SIZE_KM[0]);
      free.material.emissiveTexture = bolts[Math.floor(Math.random() * BOLTS)];
      // Lying flat on the cloud tops, turned any way round.
      const normal = new Vector3(...up);
      Quaternion.FromUnitVectorsToRef(Vector3.Forward(), normal, free.mesh.rotationQuaternion);
      Quaternion.RotationAxis(normal, Math.random() * Math.PI * 2).multiplyToRef(free.mesh.rotationQuaternion, free.mesh.rotationQuaternion);
    };
    if (inRange) {
      wait -= dt;
      if (wait <= 0) {
        const toSun = sunFrom(jupiter);
        const spot = meteorSpot(Math.random, [toSun.x, toSun.y, toSun.z], out.map((n) => n / distance));
        wait = lightningGap(Math.random);
        if (spot) {
          strike(spot.up);
          lit = true;
          // A storm flashes several times: one to three more strokes close by, within
          // half a second.
          const more = 1 + Math.floor(Math.random() * 3);
          for (let k = 0; k < more; k++) {
            const near = spot.up.map((n) => n + (Math.random() - 0.5) * 0.04);
            const length = Math.hypot(...near);
            coming.push({ in: 0.08 + Math.random() * 0.42, up: near.map((n) => n / length) });
          }
        }
      }
      for (const stroke of coming) {
        stroke.in -= dt;
        if (stroke.in <= 0) strike(stroke.up);
      }
      coming = coming.filter((stroke) => stroke.in > 0);
    } else {
      coming = [];
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
      const at = rel(jupiter.position.map((n, i) => n + flash.up[i] * (jupiter.radiusKm + FLASH_LIFT_KM)), position);
      flash.mesh.setEnabled(true);
      flash.mesh.position.set(at[0], at[1], at[2]);
      flash.mesh.scaling.setAll(flash.sizeKm / KM_PER_UNIT);
      // Just under 1 at the brightest, so the picture is always added, never pasted on.
      flash.material.alpha = 0.99 * glow;
    }
    return lit;
  }

  return { update };
}
