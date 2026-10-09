import {
  CreatePlane, ShaderMaterial, Effect, Constants, Vector3, Quaternion,
} from './babylon.js';
import glowVert from './shaders/glow.vert?raw';
import ringFrag from './shaders/practiceRing.frag?raw';
import { KM_PER_UNIT } from '../core/bodies.js';

// Where on its card the ring is drawn, as a part of the card's half width
// (shaders/practiceRing.frag).
const RING_AT = 0.72;

// The flight practice's ring (core/practice.js): a card that always faces her, so the
// ring is a circle from wherever she comes at it, but stays upright in the place: the
// one horn on its top points the place's up whichever way she has rolled or tipped (the
// user, 2026-10-10: "연습고리 위에 뿔 하나만 그려줘. 방향 감각"). Drawn only while practising.
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
  card.material = material;
  card.isPickable = false;
  card.setEnabled(false);

  // ring: { position (km), radiusKm } or null.
  function update(ring, travelerKm) {
    card.setEnabled(Boolean(ring));
    if (!ring) return;
    const rel = ring.position.map((n, i) => (n - travelerKm[i]) / KM_PER_UNIT);
    card.position.set(rel[0], rel[1], rel[2]);
    // Facing along her line of sight to it, its top toward the place's up (seen from
    // straight above or below, toward the place's forward).
    const along = new Vector3(rel[0], rel[1], rel[2]).normalize();
    const top = Math.abs(along.y) > 0.999 ? new Vector3(0, 0, 1) : Vector3.Up();
    card.rotationQuaternion = Quaternion.FromLookDirectionLH(along, top);
    card.scaling.setAll((2 * ring.radiusKm) / RING_AT / KM_PER_UNIT);
    material.setFloat('strength', 1);
    material.setFloat('time', performance.now() / 1000);
  }

  return { update };
}
