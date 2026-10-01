import { PointsCloudSystem, Vector3, Color3, Color4, CreateIcoSphere } from './babylon.js';
import rockyFrag from './shaders/rocky.frag?raw';
import { shader } from './planets.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import { beltPoints, rocksNear, MAX_ROCKS } from '../core/belt.js';

const BAND_POINTS = 3000;

// The asteroid belt: a faint band of points seen from afar, and a few lumpy rocks
// round the traveler inside it (core/belt.js decides where they are).
export async function createBelt(scene) {
  const points = beltPoints(BAND_POINTS);
  const band = new PointsCloudSystem('beltBand', 1.2, scene);
  let n = 0;
  band.addPoints(points.length, (p) => {
    const [x, y, z] = points[n++];
    p.position = new Vector3(x / KM_PER_UNIT, y / KM_PER_UNIT, z / KM_PER_UNIT);
    const v = 0.16 + ((n * 37) % 100) / 500;
    p.color = new Color4(v, v * 0.95, v * 0.88, 1);
  });
  await band.buildMeshAsync();
  band.mesh.alwaysSelectAsActiveMesh = true;
  band.mesh.isPickable = false;

  const material = shader(scene, 'beltRock', rockyFrag, ['sun', 'colorA', 'colorB', 'cap', 'haze', 'contrast', 'craters']);
  material.setColor3('colorA', new Color3(0.16, 0.15, 0.14));
  material.setColor3('colorB', new Color3(0.4, 0.37, 0.34));
  material.setFloat('cap', 0);
  material.setFloat('haze', 0);
  material.setFloat('contrast', 0.7);
  material.setFloat('craters', 0.8);
  const rocks = [];
  for (let i = 0; i < MAX_ROCKS; i++) {
    const rock = CreateIcoSphere(`beltRock${i}`, { radius: 1, subdivisions: 2, flat: true }, scene);
    rock.material = material;
    rock.isPickable = false;
    rock.setEnabled(false);
    rocks.push(rock);
  }

  // sunDirection: unit vector from the traveler toward the Sun (the rocks are close
  // together, so one light direction serves them all).
  function update(travelerKm, sunPositionKm, sunDirection) {
    band.mesh.position.set(
      (sunPositionKm[0] - travelerKm[0]) / KM_PER_UNIT,
      (sunPositionKm[1] - travelerKm[1]) / KM_PER_UNIT,
      (sunPositionKm[2] - travelerKm[2]) / KM_PER_UNIT,
    );
    const near = rocksNear(travelerKm, sunPositionKm);
    material.setVector3('sun', new Vector3(...sunDirection));
    rocks.forEach((rock, i) => {
      const data = near[i];
      rock.setEnabled(Boolean(data));
      if (!data) return;
      rock.position.set(...data.position.map((v, a) => (v - travelerKm[a]) / KM_PER_UNIT));
      // Lumpy, not round: squash each one its own way.
      const r = data.radiusKm / KM_PER_UNIT;
      rock.scaling.set(r, r * (0.55 + (data.seed % 40) / 100), r * (0.7 + (data.seed % 23) / 100));
      rock.rotation.set(data.seed % 6, (data.seed >> 3) % 6, (data.seed >> 6) % 6);
    });
  }

  return { update };
}
