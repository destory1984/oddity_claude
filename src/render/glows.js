import {
  CreateCylinder, CreateSphere, Mesh, ShaderMaterial, StandardMaterial, Effect, Color3, Vector3, Quaternion, Constants,
} from './babylon.js';
import veilVert from './shaders/veil.vert?raw';
import veilFrag from './shaders/veil.frag?raw';
import { KM_PER_UNIT, TIME_SCALE } from '../core/bodies.js';
import { meteorSpot } from '../core/meteors.js';
import {
  AURORAS, auroraBand, LIGHTNING_RANGE_KM, LIGHTNING_LIFE_S, LIGHTNING_SIZE_KM, lightningGap, lightningGlow,
  PLUMES, PLUME_DAY_S, PLUME_RANGE_RADII, plumeUp,
} from '../core/glows.js';

const FLASHES = 4;

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

  const flashes = [];
  for (let i = 0; i < FLASHES; i++) {
    const material = new StandardMaterial(`flash${i}`, scene);
    material.emissiveColor = new Color3(0.85, 0.9, 1);
    material.diffuseColor = new Color3(0, 0, 0);
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    material.alphaMode = Constants.ALPHA_ADD;
    const mesh = CreateSphere(`flash${i}`, { diameter: 1, segments: 8 }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    flashes.push({ mesh, material, up: null, age: 0, sizeKm: 0 });
  }
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
    if (inRange) {
      wait -= dt;
      const free = flashes.find((f) => !f.up);
      if (wait <= 0 && free) {
        const toSun = sunFrom(jupiter);
        const spot = meteorSpot(Math.random, [toSun.x, toSun.y, toSun.z], out.map((n) => n / distance));
        wait = lightningGap(Math.random);
        if (spot) {
          free.up = spot.up;
          free.age = 0;
          free.sizeKm = LIGHTNING_SIZE_KM[0] + Math.random() * (LIGHTNING_SIZE_KM[1] - LIGHTNING_SIZE_KM[0]);
          lit = true;
        }
      }
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
      // A ball sunk to its middle in the cloud tops shows as a lit patch.
      const at = rel(jupiter.position.map((n, i) => n + flash.up[i] * jupiter.radiusKm), position);
      flash.mesh.setEnabled(true);
      flash.mesh.position.set(at[0], at[1], at[2]);
      flash.mesh.scaling.setAll(flash.sizeKm / KM_PER_UNIT);
      flash.material.alpha = 0.6 * glow;
    }
    return lit;
  }

  return { update };
}
