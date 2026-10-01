import {
  CreatePlane, Mesh, ShaderMaterial, Effect, Vector3, Quaternion, Matrix, Constants, TransformNode,
} from './babylon.js';
import glowVert from './shaders/glow.vert?raw';
import comaFrag from './shaders/coma.frag?raw';
import tailFrag from './shaders/tail.frag?raw';
import { AU_KM, KM_PER_UNIT } from '../core/bodies.js';
import { cometActivity, tailLengthKm, COMA_KM } from '../core/comet.js';

// From closer than this the glow thins out, or standing on the nucleus would be a
// white-out with nothing to see or photograph.
const FULL_GLOW_KM = 60000;
const CLOSE_GLOW = 0.1;
// Tail width at its far end, as a share of its length.
const TAIL_SPREAD = 0.3;

function glowMaterial(scene, name, fragment) {
  Effect.ShadersStore[`${name}VertexShader`] = glowVert;
  Effect.ShadersStore[`${name}FragmentShader`] = fragment;
  const material = new ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'strength'],
  });
  material.alphaMode = Constants.ALPHA_ADD;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  return material;
}

// The glow round a comet's nucleus and the tail blown straight away from the Sun.
// Both fade with distance from the Sun (core/comet.js) and vanish past 5 AU.
export function createComet(scene) {
  const comaMaterial = glowMaterial(scene, 'coma', comaFrag);
  const coma = CreatePlane('coma', { size: 1 }, scene);
  coma.billboardMode = Mesh.BILLBOARDMODE_ALL;
  coma.material = comaMaterial;
  coma.isPickable = false;

  // Two planes crossed along the tail's axis so it shows from every side. Each plane
  // spans x -0.5..0.5 and y 0..1 (pivot at the nucleus end), with +y pointing away from the Sun.
  const tailMaterial = glowMaterial(scene, 'tail', tailFrag);
  const tail = new TransformNode('tail', scene);
  for (const turn of [0, Math.PI / 2]) {
    const plane = CreatePlane(`tail${turn}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
    plane.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0));
    plane.rotation.y = turn;
    plane.parent = tail;
    plane.material = tailMaterial;
    plane.isPickable = false;
  }

  function update(body, travelerKm, sunPositionKm) {
    const activity = cometActivity(body.sunKm / AU_KM);
    const on = activity > 0;
    coma.setEnabled(on);
    tail.setEnabled(on);
    if (!on) return;
    const rel = body.position.map((n, i) => (n - travelerKm[i]) / KM_PER_UNIT);
    const near = Math.max(CLOSE_GLOW, Math.min(1, (Math.hypot(...rel) * KM_PER_UNIT) / FULL_GLOW_KM));
    const comaSize = (2 * COMA_KM * (0.4 + 0.6 * activity)) / KM_PER_UNIT;
    coma.position.set(rel[0], rel[1], rel[2]);
    coma.scaling.setAll(comaSize);
    comaMaterial.setFloat('strength', (0.5 + 0.5 * activity) * near);

    const length = tailLengthKm(body.sunKm / AU_KM) / KM_PER_UNIT;
    const away = new Vector3(...body.position.map((n, i) => n - sunPositionKm[i])).normalize();
    tail.position.set(rel[0], rel[1], rel[2]);
    tail.scaling.set(length * TAIL_SPREAD, length, length * TAIL_SPREAD);
    // Turn the node's +y onto the direction away from the Sun.
    const up = Vector3.Up();
    const axis = Vector3.Cross(up, away);
    const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, away))));
    tail.rotationQuaternion = axis.lengthSquared() < 1e-12
      ? Quaternion.Identity()
      : Quaternion.RotationAxis(axis.normalize(), angle);
    tailMaterial.setFloat('strength', (0.35 + 0.45 * activity) * near);
  }

  return { update };
}
