import {
  CreatePlane, Mesh, ShaderMaterial, Effect, Vector3, Quaternion, Matrix, Constants, TransformNode,
} from './babylon.js';
import glowVert from './shaders/glow.vert?raw';
import comaFrag from './shaders/coma.frag?raw';
import tailFrag from './shaders/tail.frag?raw';
import dustFrag from './shaders/dust.frag?raw';
import { AU_KM, KM_PER_UNIT } from '../core/bodies.js';
import { cometActivity, tailLengthKm, tailShown, COMA_KM, TAIL_END_ON } from '../core/comet.js';

// From closer than this the glow thins out, or standing on the nucleus would be a
// white-out with nothing to see or photograph.
const FULL_GLOW_KM = 60000;
const CLOSE_GLOW = 0.1;
// Tail width at its far end, as a share of its length.
const TAIL_SPREAD = 0.3;
// The dust tail: shorter and wider than the gas tail, and swept back round the orbit
// by this much (the tangent of the angle between the two tails, about 21 degrees).
const DUST_LENGTH = 0.6;
const DUST_SPREAD = 0.55;
const DUST_LAG = 0.38;

function glowMaterial(scene, name, fragment) {
  Effect.ShadersStore[`${name}VertexShader`] = glowVert;
  Effect.ShadersStore[`${name}FragmentShader`] = fragment;
  const material = new ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'strength', 'time'],
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

  // The dust tail, built the same way.
  const dustMaterial = glowMaterial(scene, 'dustTail', dustFrag);
  const dust = new TransformNode('dustTail', scene);
  for (const turn of [0, Math.PI / 2]) {
    const plane = CreatePlane(`dustTail${turn}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
    plane.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0));
    plane.rotation.y = turn;
    plane.parent = dust;
    plane.material = dustMaterial;
    plane.isPickable = false;
  }
  // Turn a tail node's +y onto `direction`.
  const aim = (node, direction) => {
    const up = Vector3.Up();
    const axis = Vector3.Cross(up, direction);
    const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, direction))));
    node.rotationQuaternion = axis.lengthSquared() < 1e-12 ? Quaternion.Identity() : Quaternion.RotationAxis(axis.normalize(), angle);
  };
  // How far off a tail's line she is: the sine of the angle between `direction` and the
  // way from the nucleus to her.
  const offLine = (direction, eye) => {
    const along = Vector3.Dot(eye, direction);
    return Math.sqrt(Math.max(0, 1 - along * along));
  };
  // Where the comet was last frame, to know which way it is going.
  let last = null;
  let lag = null;

  function update(body, travelerKm, sunPositionKm) {
    const activity = cometActivity(body.sunKm / AU_KM);
    const on = activity > 0;
    coma.setEnabled(on);
    tail.setEnabled(on);
    dust.setEnabled(on);
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
    // The gas tail is blown straight away from the Sun by the solar wind.
    aim(tail, away);
    // (Seen along its length a tail is four wedges: it fades as she comes onto its line.)
    const eye = new Vector3(-rel[0], -rel[1], -rel[2]).normalize();
    tailMaterial.setFloat('strength', (0.35 + 0.45 * activity) * near * tailShown(offLine(away, eye), TAIL_END_ON.gas));
    tailMaterial.setFloat('time', performance.now() / 1000);

    // The dust is heavier: it falls behind along the orbit, so its tail leans back the
    // way the comet came. Until the comet has been seen to move, lean it in the
    // planets' plane.
    if (last) {
      const moved = new Vector3(...body.position.map((n, i) => n - last[i]));
      const back = moved.subtract(away.scale(Vector3.Dot(moved, away))).scale(-1);
      if (back.lengthSquared() > 1e-6) lag = back.normalize();
    }
    last = [...body.position];
    const lean = lag ?? Vector3.Cross(Vector3.Up(), away).normalize();
    const dustLength = length * DUST_LENGTH;
    dust.position.set(rel[0], rel[1], rel[2]);
    dust.scaling.set(dustLength * DUST_SPREAD, dustLength, dustLength * DUST_SPREAD);
    const dustWay = away.add(lean.scale(DUST_LAG)).normalize();
    aim(dust, dustWay);
    dustMaterial.setFloat('strength', (0.3 + 0.5 * activity) * near * tailShown(offLine(dustWay, eye), TAIL_END_ON.dust));
  }

  return { update };
}
