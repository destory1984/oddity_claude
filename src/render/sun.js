import { CreatePlane, Mesh, Constants, Vector3 } from './babylon.js';
import sunFrag from './shaders/sun.frag?raw';
import { shader } from './planets.js';
import { KM_PER_UNIT } from '../core/bodies.js';

const DISC_FRACTION = 0.129; // disc edge in the billboard's UV radius (see sun.frag)

export function createSun(scene, sunBody) {
  const size = (2 * sunBody.radiusKm) / KM_PER_UNIT / DISC_FRACTION;
  const plane = CreatePlane('sun', { size }, scene);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const material = shader(scene, 'sunGlow', sunFrag, ['visibility', 'time', 'eclipse', 'bead']);
  material.alphaMode = Constants.ALPHA_ADD;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  material.setFloat('visibility', 1);
  material.setFloat('eclipse', 0);
  material.setVector3('bead', Vector3.Zero());
  plane.material = material;
  return { mesh: plane, material };
}
