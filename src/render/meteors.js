import { CreateCylinder, StandardMaterial, Color3, Vector3, Quaternion } from './babylon.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import {
  METEOR_RANGE_KM, METEOR_ALTITUDE_KM, METEOR_LIFE_S, meteorSpot, meteorGap, meteorGlow,
} from '../core/meteors.js';

const POOL = 6;
// Trail thickness as a share of its distance from the traveler: a pixel or two.
const THICK = 0.003;

// Shooting stars on Earth's night side (core/meteors.js): a few thin bright trails,
// reused. Each lights at a spot, runs its length along the top of the air and fades.
export function createMeteors(scene) {
  const trails = [];
  for (let i = 0; i < POOL; i++) {
    const material = new StandardMaterial(`meteor${i}`, scene);
    material.emissiveColor = new Color3(1, 0.95, 0.8);
    material.diffuseColor = new Color3(0, 0, 0);
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    const mesh = CreateCylinder(`meteor${i}`, { height: 1, diameterTop: 0.15, diameterBottom: 1, tessellation: 5 }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.rotationQuaternion = new Quaternion();
    mesh.setEnabled(false);
    trails.push({ mesh, material, spot: null, age: 0 });
  }
  let wait = 0.5;

  // earth, sunPosition, position: km. Returns true in the frame a meteor lights.
  function update(dt, earth, sunPosition, position) {
    const out = position.map((n, i) => n - earth.position[i]);
    const distance = Math.hypot(...out);
    const inRange = distance - earth.radiusKm <= METEOR_RANGE_KM;
    let lit = false;
    if (inRange) {
      wait -= dt;
      const free = trails.find((t) => !t.spot);
      if (wait <= 0 && free) {
        const toSun = sunPosition.map((n, i) => n - earth.position[i]);
        const sunLength = Math.hypot(...toSun);
        free.spot = meteorSpot(Math.random, toSun.map((n) => n / sunLength), out.map((n) => n / distance));
        free.age = 0;
        wait = meteorGap(Math.random);
        lit = Boolean(free.spot);
      }
    }
    for (const trail of trails) {
      if (!trail.spot) continue;
      trail.age += dt;
      const glow = inRange ? meteorGlow(trail.age) : 0;
      if (glow <= 0 && trail.age > 0) {
        trail.spot = null;
        trail.mesh.setEnabled(false);
        continue;
      }
      const { up, along, lengthKm } = trail.spot;
      // The head runs forward along the trail as it burns; the tail trails behind it.
      const run = (trail.age / METEOR_LIFE_S) * lengthKm;
      const centre = up.map((n, i) => earth.position[i] + n * (earth.radiusKm + METEOR_ALTITUDE_KM) + along[i] * (run - lengthKm / 2));
      const rel = centre.map((n, i) => (n - position[i]) / KM_PER_UNIT);
      const thick = Math.hypot(...rel) * THICK;
      trail.mesh.setEnabled(true);
      trail.mesh.position.set(rel[0], rel[1], rel[2]);
      // The cylinder's own axis (+y, its thin end) lies back along the trail.
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(...along.map((n) => -n)), trail.mesh.rotationQuaternion);
      trail.mesh.scaling.set(thick, lengthKm / KM_PER_UNIT, thick);
      trail.material.alpha = glow;
    }
    return lit;
  }

  return { update };
}
