import { Vector3, Quaternion, Color3, StandardMaterial, Texture, TransformNode, Mesh, VertexData } from './babylon.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import { surfaceDirection, spinOf } from '../core/surface.js';

// A real satellite picture laid on the ground at a few famous places, where Earth's own
// map is far too coarse: 4,096 across, about 10 km a pixel at the equator, so the Eye
// of the Sahara (40 km) was four pixels (the user, 2026-10-22: "지구에 예쁜 지형을 (예)
// 사하라의 눈)을 매핑해서 보여줄 순 없어?", minding old tablets that are slow already).
// One round patch each, curved to the ground, its edge fading into Earth's map. Its
// picture is loaded only the first time she comes near, and it is drawn only while she
// is near and the place is on her side of the world: away from it, it costs nothing.
// id: a name (the Eye of the Sahara's is its story place's); latDeg, lonDeg: the middle
// of the picture on Earth; sizeKm: the picture's width; file: public/assets/terrain/,
// north up, its alpha the round fade. The four after the first were added the same day
// ("다른 것도 넣자"); the Great Barrier Reef and Everest were tried and left out (the
// reef's picture ends in a dark line out at sea, Everest's is snow and white glare).
export const GROUND_PATCHES = [
  { id: 'richat', latDeg: 21.124, lonDeg: -11.402, sizeKm: 73.2, file: 'richat.webp' },
  { id: 'grandCanyon', latDeg: 36.1, lonDeg: -112.12, sizeKm: 70, file: 'grandCanyon.webp' },
  { id: 'uluru', latDeg: -25.33, lonDeg: 130.92, sizeKm: 50, file: 'uluru.webp' },
  { id: 'nileDelta', latDeg: 30.85, lonDeg: 31.05, sizeKm: 200, file: 'nileDelta.webp' },
  { id: 'uyuni', latDeg: -20.2, lonDeg: -67.6, sizeKm: 150, file: 'uyuni.webp' },
];
// All lie on Earth.
const ON = 'earth';

// Shown from within this far of the place (km), fading in over the outer part.
const SHOWN_KM = 3000;
const FADE_FROM_KM = 2200;
// Picture loaded from within this far, a little before it shows.
const LOAD_KM = 4000;
// Laid this far above the ground, under the clouds (km); the map's sphere is drawn
// from flat facets that lie under the true sphere, so the patch is not cut by them.
const LIFT_KM = 0.05;
// Rings of the curved patch, and points round each.
const RINGS = 16;
const ROUND = 48;
// On the night side it is drawn this dim, as Dokdo's drawing is (render/craft.js).
const NIGHT = 0.06;

// A round cap of the sphere of radius radiusKm, sizeKm across, in units: y up from the
// place's own ground point, x east, z north; uv with north up.
function capMesh(scene, name, radiusKm, sizeKm) {
  const half = sizeKm / 2;
  const positions = [0, LIFT_KM / KM_PER_UNIT, 0];
  const uvs = [0.5, 0.5];
  const indices = [];
  for (let ring = 1; ring <= RINGS; ring += 1) {
    const r = (half * ring) / RINGS;
    for (let k = 0; k < ROUND; k += 1) {
      const a = (2 * Math.PI * k) / ROUND;
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      // Down from the tangent plane to the sphere (and the lift above it).
      const y = Math.sqrt(radiusKm * radiusKm - x * x - z * z) - radiusKm + LIFT_KM;
      positions.push(x / KM_PER_UNIT, y / KM_PER_UNIT, z / KM_PER_UNIT);
      uvs.push(0.5 + x / sizeKm, 0.5 + z / sizeKm);
    }
  }
  const at = (ring, k) => (ring === 0 ? 0 : 1 + (ring - 1) * ROUND + (k % ROUND));
  for (let ring = 0; ring < RINGS; ring += 1) {
    for (let k = 0; k < ROUND; k += 1) {
      if (ring === 0) indices.push(0, at(1, k + 1), at(1, k));
      else indices.push(at(ring, k), at(ring, k + 1), at(ring + 1, k + 1), at(ring, k), at(ring + 1, k + 1), at(ring + 1, k));
    }
  }
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.uvs = uvs;
  data.applyToMesh(mesh);
  mesh.isPickable = false;
  return mesh;
}

export function createGroundPatches(scene) {
  const patches = GROUND_PATCHES.map((patch) => ({ ...patch, node: null, mesh: null, material: null }));

  function build(patch, body) {
    const node = new TransformNode(`ground_${patch.id}`, scene);
    node.rotationQuaternion = new Quaternion();
    const mesh = capMesh(scene, `ground_${patch.id}_cap`, body.radiusKm, patch.sizeKm);
    mesh.parent = node;
    const texture = new Texture(`${import.meta.env.BASE_URL}assets/terrain/${patch.file}`, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const material = new StandardMaterial(`ground_${patch.id}`, scene);
    material.disableLighting = true;
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    // Drawn just in front of the map under it, which it lies so close to.
    material.zOffset = -4;
    material.backFaceCulling = false;
    mesh.material = material;
    node.setEnabled(false);
    Object.assign(patch, { node, mesh, material });
  }

  // bodies: every body this frame; position: the eye (km); timeS: the game clock, which
  // turns Earth (core/surface.js spinOf), as it does the story places.
  function update(bodies, position, timeS) {
    const sun = bodies.find((b) => b.kind === 'star');
    const body = bodies.find((b) => b.id === ON);
    if (!body || !sun) return;
    const spin = spinOf(ON, timeS ?? 0);
    for (const patch of patches) {
      const dir = surfaceDirection(patch.latDeg, patch.lonDeg, spin);
      const site = { position: body.position.map((n, i) => n + dir[i] * body.radiusKm) };
      const fromSite = position.map((n, i) => n - site.position[i]);
      const distanceKm = Math.hypot(...fromSite);
      if (!patch.node && distanceKm < LOAD_KM) build(patch, body);
      if (!patch.node) continue;
      const upKm = site.position.map((n, i) => n - body.position[i]);
      const up = new Vector3(...upKm).normalize();
      // Over the horizon from here (the eye under the place's own ground plane, with
      // room for the patch's width): not drawn.
      const above = Vector3.Dot(up, new Vector3(...fromSite)) > -patch.sizeKm;
      const shown = distanceKm < SHOWN_KM && above;
      patch.node.setEnabled(shown);
      if (!shown) continue;
      // North along the spin axis (world +y, core/surface.js surfaceDirection), east
      // from it: the picture is laid north up.
      let north = new Vector3(0, 1, 0).subtract(up.scale(up.y));
      if (north.lengthSquared() < 1e-9) north = new Vector3(0, 0, 1);
      north.normalize();
      const east = Vector3.Cross(up, north).normalize();
      Quaternion.RotationQuaternionFromAxisToRef(east, up, north, patch.node.rotationQuaternion);
      patch.node.position.set(...site.position.map((n, i) => (n - position[i]) / KM_PER_UNIT));
      const toSun = new Vector3(...sun.position.map((n, i) => n - site.position[i])).normalize();
      // Full daylight from the Sun 12 degrees up; dusk below that (as Dokdo's card).
      const lit = NIGHT + (1 - NIGHT) * Math.min(1, Math.max(0, Vector3.Dot(toSun, up) / 0.2 + 0.5));
      patch.material.emissiveColor = new Color3(lit, lit, lit);
      patch.mesh.visibility = Math.min(1, Math.max(0, (SHOWN_KM - distanceKm) / (SHOWN_KM - FADE_FROM_KM)));
    }
  }

  return { update };
}
