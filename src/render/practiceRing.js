import {
  Mesh, CreatePlane, ShaderMaterial, Effect, Constants,
} from './babylon.js';
import glowVert from './shaders/glow.vert?raw';
import ringFrag from './shaders/practiceRing.frag?raw';
import { KM_PER_UNIT } from '../core/bodies.js';

// Where on its card the ring is drawn, as a part of the card's half width
// (shaders/practiceRing.frag).
const RING_AT = 0.8;

// The flight practice's ring (core/practice.js): a card that always faces her, so the
// ring is a circle from wherever she comes at it. Drawn only while practising.
export function createPracticeRing(scene) {
  Effect.ShadersStore.practiceRingVertexShader = glowVert;
  Effect.ShadersStore.practiceRingFragmentShader = ringFrag;
  const material = new ShaderMaterial('practiceRing', scene, { vertex: 'practiceRing', fragment: 'practiceRing' }, {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'strength', 'time'],
  });
  material.alphaMode = Constants.ALPHA_ADD;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  const card = CreatePlane('practiceRing', { size: 1 }, scene);
  card.billboardMode = Mesh.BILLBOARDMODE_ALL;
  card.material = material;
  card.isPickable = false;
  card.setEnabled(false);

  // ring: { position (km), radiusKm } or null.
  function update(ring, travelerKm) {
    card.setEnabled(Boolean(ring));
    if (!ring) return;
    const rel = ring.position.map((n, i) => (n - travelerKm[i]) / KM_PER_UNIT);
    card.position.set(rel[0], rel[1], rel[2]);
    card.scaling.setAll((2 * ring.radiusKm) / RING_AT / KM_PER_UNIT);
    material.setFloat('strength', 1);
    material.setFloat('time', performance.now() / 1000);
  }

  return { update };
}
