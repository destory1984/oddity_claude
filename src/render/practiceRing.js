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
  // The ring just done, for a moment: it swells and thins away where it stood while the
  // next one comes up (a card and a material of its own, to have its own strength).
  const gone = material.clone('practiceRingGone');
  gone.alphaMode = Constants.ALPHA_ADD;
  gone.needAlphaBlending = () => true;
  gone.disableDepthWrite = true;
  gone.backFaceCulling = false;
  const burst = CreatePlane('practiceRingGone', { size: 1 }, scene);
  burst.material = gone;
  burst.isPickable = false;
  burst.setEnabled(false);
  const place = (mesh, at, radiusKm, travelerKm, grown = 1) => {
    const rel = at.map((n, i) => (n - travelerKm[i]) / KM_PER_UNIT);
    mesh.position.set(rel[0], rel[1], rel[2]);
    const along = new Vector3(rel[0], rel[1], rel[2]).normalize();
    const top = Math.abs(along.y) > 0.999 ? new Vector3(0, 0, 1) : Vector3.Up();
    mesh.rotationQuaternion = Quaternion.FromLookDirectionLH(along, top);
    mesh.scaling.setAll(((2 * radiusKm) / RING_AT / KM_PER_UNIT) * grown);
  };

  // ring: { position (km), radiusKm, strength (0..1, 1 when left out), burst: { position,
  // age (0..1) } or null } or null.
  function update(ring, travelerKm) {
    card.setEnabled(Boolean(ring));
    burst.setEnabled(Boolean(ring?.burst));
    if (!ring) return;
    // Facing along her line of sight to it, its top toward the place's up (seen from
    // straight above or below, toward the place's forward).
    place(card, ring.position, ring.radiusKm, travelerKm);
    const now = performance.now() / 1000;
    material.setFloat('strength', ring.strength ?? 1);
    material.setFloat('time', now);
    if (ring.burst) {
      const age = Math.max(0, Math.min(1, ring.burst.age));
      place(burst, ring.burst.position, ring.radiusKm, travelerKm, 1 + 1.5 * age);
      gone.setFloat('strength', (1 - age) * (1 - age));
      gone.setFloat('time', now);
    }
  }

  return { update };
}
