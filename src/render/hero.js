import {
  Scene, FreeCamera, Vector3, TransformNode, HemisphericLight, DirectionalLight,
  StandardMaterial, Color3, Mesh, Quaternion, CreateSphere, CreateRibbon,
} from './babylon.js';
import capeFrag from './shaders/cape.frag?raw';
import { shader } from './planets.js';
import { blendFlight, hoverFlightPose, armPose } from '../core/pose.js';
import { clamp } from './math.js';

const CAPE_ROWS = 19;
const CAPE_COLUMNS = 17;

// Cape shape: narrow at the shoulders, widening, with two shallow rounded lobes at the hem.
function capePaths(time, velocity, capeLag) {
  return Array.from({ length: CAPE_ROWS }, (_, j) => {
    const t = j / (CAPE_ROWS - 1);
    const ease = t * t * (3 - 2 * t);
    return Array.from({ length: CAPE_COLUMNS }, (_, i) => {
      const u = i / (CAPE_COLUMNS - 1) - 0.5;
      const across = Math.abs(u) * 2;
      const shoulder = 0.48 + t * 0.08;
      const width = shoulder + ease * 0.86;
      const softEdge = 1 - 0.08 * Math.pow(across, 4) * ease;
      const x = u * width * softEdge + capeLag * t * t * 0.55;
      const folds = Math.sin(u * Math.PI * 5.2 + t * 2.1 - time * 2.7) * (0.018 + 0.055 * t) * (1 - across * 0.28);
      const billow = Math.sin(t * Math.PI) * (0.07 + velocity * 0.035) + folds + Math.abs(capeLag) * t * 0.12;
      const tail = Math.max(0, (t - 0.8) / 0.2);
      const centerNotch = (1 - Math.min(1, across * 2.4)) * 0.075 * tail * tail;
      const scallop = (0.5 + 0.5 * Math.cos((across - 0.52) * Math.PI * 3.1)) * 0.018 * tail;
      return new Vector3(x, 0.19 + billow + t * 0.16, 0.37 - t * 1.92 + centerNotch + scallop);
    });
  });
}

// The meter-scale character lives in its own scene and pass, so the planetary
// camera can keep a far near-plane and good depth precision.
export function createHero(engine, sunDirection) {
  const scene = new Scene(engine);
  scene.autoClear = false;
  scene.autoClearDepthAndStencil = true;

  const camera = new FreeCamera('heroCamera', Vector3.Zero(), scene);
  camera.minZ = 0.1;
  camera.maxZ = 100;
  camera.inputs.clear();

  const rig = new TransformNode('heroRig', scene);
  const hero = new TransformNode('hero', scene);
  hero.parent = rig;
  hero.scaling.setAll(0.85);
  hero.position.set(0, -1.15, 6);

  const fill = new HemisphericLight('suitFill', new Vector3(-0.3, 1, -1), scene);
  fill.intensity = 0.9;
  const direct = new DirectionalLight('sunlight', sunDirection.negate(), scene);
  direct.intensity = 2;

  const suit = new StandardMaterial('suit', scene);
  suit.diffuseColor = Color3.FromHexString('#243c54');
  suit.specularColor = new Color3(0.55, 0.68, 0.8);
  const trim = new StandardMaterial('trim', scene);
  trim.diffuseColor = Color3.FromHexString('#6ad6c6');
  trim.emissiveColor = new Color3(0.03, 0.15, 0.12);
  const skin = new StandardMaterial('skin', scene);
  skin.diffuseColor = Color3.FromHexString('#bd9276');

  function part(name, position, scale, material, parent = hero) {
    const mesh = CreateSphere(name, { diameter: 1, segments: 12 }, scene);
    mesh.parent = parent;
    mesh.position = new Vector3(...position);
    mesh.scaling = new Vector3(...scale);
    mesh.material = material;
    return mesh;
  }

  const torso = part('torso', [0, 0, 0], [0.57, 0.33, 0.87], suit);
  const head = part('head', [0, 0.08, 0.66], [0.3, 0.3, 0.32], skin);
  const hair = part('hair', [0, 0.16, 0.62], [0.32, 0.22, 0.31], suit);

  const limbs = [];
  for (const s of [-1, 1]) {
    const shoulder = new TransformNode(`shoulder${s}`, scene);
    shoulder.parent = hero;
    shoulder.position.set(s * 0.31, 0, 0.25);
    part(`upperArm${s}`, [0, 0, 0.2], [0.19, 0.19, 0.48], suit, shoulder);
    const elbow = new TransformNode(`elbow${s}`, scene);
    elbow.parent = shoulder;
    elbow.position.z = 0.42;
    part(`elbowJoint${s}`, [0, 0, 0], [0.18, 0.18, 0.18], suit, elbow);
    part(`forearm${s}`, [0, 0, 0.19], [0.16, 0.17, 0.4], suit, elbow);
    part(`hand${s}`, [0, 0, 0.41], [0.15, 0.15, 0.2], skin, elbow);

    const hip = new TransformNode(`hip${s}`, scene);
    hip.parent = hero;
    hip.position.set(s * 0.18, -0.04, -0.34);
    part(`thigh${s}`, [0, 0, -0.23], [0.24, 0.25, 0.53], suit, hip);
    const knee = new TransformNode(`knee${s}`, scene);
    knee.parent = hip;
    knee.position.z = -0.45;
    part(`shin${s}`, [0, 0, -0.2], [0.2, 0.21, 0.45], suit, knee);
    part(`boot${s}`, [0, -0.03, -0.44], [0.22, 0.23, 0.28], trim, knee);
    limbs.push({ s, shoulder, elbow, hip, knee });
  }

  const capeMaterial = shader(scene, 'capeCloth', capeFrag);
  capeMaterial.backFaceCulling = false;
  const cape = CreateRibbon('cape', {
    pathArray: capePaths(0, 0, 0), updatable: true, sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  cape.parent = hero;
  cape.material = capeMaterial;

  let bank = 0;
  let bend = 0;
  let capeLag = 0;
  let flightBlend = 0;
  let elapsed = 0;

  function update({ dt, speed, turn, fov, photoOrientation, visible }) {
    elapsed += dt;
    const smooth = 1 - Math.exp(-dt * 6);
    bank += (clamp(-turn[0] * 1.15, -0.9, 0.9) - bank) * smooth;
    bend += (clamp(turn[1] * 0.38, -0.3, 0.3) - bend) * smooth;
    capeLag += (bank - capeLag) * (1 - Math.exp(-dt * 2.8));
    flightBlend = blendFlight(flightBlend, speed, dt);

    const flying = flightBlend;
    const bodyPose = hoverFlightPose(flying, bank, bend);
    hero.rotation.z = bodyPose.bodyBank;
    hero.rotation.x = bodyPose.bodyPitch;
    torso.rotation.z = bank * 0.3 * flying;
    torso.rotation.x = -0.18 * flying;
    hero.position.y = -1.15 + Math.sin(elapsed * 1.5) * 0.04 * (1 - flying);
    head.rotation.z = -bank * 0.25 * flying;
    hair.rotation.z = head.rotation.z;

    for (const limb of limbs) {
      const inside = Math.max(0, bank * limb.s);
      const arm = armPose(limb.s, bank, bend);
      limb.shoulder.rotation.y = limb.s * 0.08 + (arm.shoulderYaw - limb.s * 0.08) * flying;
      limb.shoulder.rotation.x = bodyPose.shoulderPitch;
      limb.elbow.rotation.set(-0.08 + (arm.elbowFlex + 0.08) * flying, 0, 0);
      limb.hip.position.x = limb.s * (0.13 + 0.05 * flying);
      limb.hip.rotation.y = limb.s * (0.06 + inside * 0.22) * flying;
      limb.hip.rotation.x = 0;
      limb.knee.rotation.x = bodyPose.kneeFlex - (inside * 1.05 + Math.abs(bend) * 0.6) * flying;
    }

    hero.setEnabled(visible);
    camera.fov = fov;
    camera.rotationQuaternion = new Quaternion(...(photoOrientation || [0, 0, 0, 1]));
    CreateRibbon('cape', {
      pathArray: capePaths(elapsed, Math.min(speed / 100, 1), capeLag), instance: cape,
    });
  }

  return { scene, camera, root: hero, update };
}
