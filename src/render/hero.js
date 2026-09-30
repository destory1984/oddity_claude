// Copyright (c) 2026 destory1984. All rights reserved.
// This file (the player character's design) is NOT covered by the MIT License;
// see LICENSE, part 2. Forks must replace the character with their own.

import {
  Scene, FreeCamera, Vector3, TransformNode, HemisphericLight, DirectionalLight,
  StandardMaterial, Color3, Quaternion, Mesh, VertexData, DynamicTexture,
} from './babylon.js';
import { MAGE } from './mageModel.js';
import {
  blendFlight, hoverFlightPose, armPose, lookBack, idleStep, idlePose, idleProgress, heroScaleFor,
} from '../core/pose.js';
import { clamp } from './math.js';

// A papercraft mage folded from craft paper: silver twin tails, a blank two-plane
// face, a white capelet with gold trim over a striped shirt, a long white robe with a
// gold hem, wide square sleeves and folded brown boots. The shapes come from the
// Blender model in mageModel.js; this file joints and poses them.
//
// Local axes of the body: +z runs from the feet to the head, +y is the back and -y
// the front. The flight poses in core/pose.js rotate this whole frame.

// Craft paper: an off-white sheet with faint fibers, tinted by each material's color.
function paperTexture(scene) {
  const texture = new DynamicTexture('paper', { width: 256, height: 256 }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 4242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 900; i++) {
    const shade = rand() < 0.5 ? 255 : 200;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade - 8}, ${0.06 + rand() * 0.1})`;
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2);
  }
  ctx.lineWidth = 1;
  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = `rgba(180, 175, 165, ${0.05 + rand() * 0.08})`;
    const x = rand() * 256;
    const y = rand() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 24, y + (rand() - 0.5) * 24);
    ctx.stroke();
  }
  texture.update();
  return texture;
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
  hero.scaling.setAll(1.3);
  // Her origin is at the belt, lower on her body than the old doll's, so she sits higher.
  const BASE_Y = -0.87;
  hero.position.set(0, BASE_Y, 6);

  // Strong key light and a soft fill, so every fold shows a light and a dark side.
  const fill = new HemisphericLight('fill', new Vector3(-0.3, 1, -1), scene);
  fill.intensity = 0.7;
  fill.groundColor = new Color3(0.3, 0.28, 0.3);
  const direct = new DirectionalLight('sunlight', sunDirection.negate(), scene);
  direct.intensity = 1.9;

  // Matte paper: no shine, a little self-light so it never goes black in space.
  // Paper is a single sheet, so both sides are drawn and lit.
  const grain = paperTexture(scene);
  const materials = {};
  for (const [name, hex] of Object.entries(MAGE.colors)) {
    const m = new StandardMaterial(name, scene);
    const c = Color3.FromHexString(hex);
    m.diffuseColor = c;
    m.diffuseTexture = grain;
    m.emissiveColor = c.scale(0.14);
    m.specularColor = new Color3(0, 0, 0);
    m.backFaceCulling = false;
    m.twoSidedLighting = true;
    materials[name] = m;
  }

  // Flat triangles with the paper grain projected along each face's main axis.
  function paperMesh(name, tris, material, parent) {
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i < tris.length; i += 9) {
      const p = [0, 3, 6].map((k) => tris.slice(i + k, i + k + 3));
      const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
      const v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]].map(Math.abs);
      const axis = n.indexOf(Math.max(...n));
      const [a, b] = [[1, 2], [0, 2], [0, 1]][axis];
      for (const q of p) {
        indices.push(positions.length / 3);
        positions.push(q[0], q[1], q[2]);
        uvs.push(q[a] * 3, q[b] * 3);
      }
    }
    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData();
    Object.assign(data, { positions, indices, normals, uvs });
    const mesh = new Mesh(name, scene);
    data.applyToMesh(mesh);
    mesh.parent = parent;
    mesh.material = material;
    return mesh;
  }

  // Joints: pivots offset from their parent joint (or the body origin).
  const PARENT = { 'elbow1': 'shoulder1', 'elbow-1': 'shoulder-1', 'knee1': 'hip1', 'knee-1': 'hip-1' };
  const joints = {};
  for (const [name, offset] of Object.entries(MAGE.joints)) {
    const node = new TransformNode(name, scene);
    node.position = new Vector3(...offset);
    joints[name] = node;
  }
  for (const [name, node] of Object.entries(joints)) node.parent = joints[PARENT[name]] || hero;
  for (const part of MAGE.parts) {
    paperMesh(`${part.joint}_${part.mat}`, part.tris, materials[part.mat], joints[part.joint]);
  }
  const { torso, skirt, head } = joints;
  const limbs = [1, -1].map((s) => ({
    s,
    shoulder: joints[`shoulder${s}`],
    elbow: joints[`elbow${s}`],
    hip: joints[`hip${s}`],
    hipX: joints[`hip${s}`].position.x,
    knee: joints[`knee${s}`],
  }));

  // Twin tails: a chain of folded segments per tail, each pivoting where the one above ends.
  const tails = MAGE.tails.map((tail) => {
    let parent = head;
    const segments = tail.segments.map((segment, i) => {
      const node = new TransformNode(`tail${tail.s}_${i}`, scene);
      node.parent = parent;
      node.position = new Vector3(...segment.pivot);
      for (const [mat, tris] of Object.entries(segment.mats)) paperMesh(`tail${tail.s}_${i}_${mat}`, tris, materials[mat], node);
      parent = node;
      return node;
    });
    return { s: tail.s, segments };
  });

  let bank = 0;
  let bend = 0;
  let sway = 0;
  let flightBlend = 0;
  let facing = { angle: 0, idle: 0 };
  let idle = { untilNext: 3, name: null, t: 0, last: null };
  let elapsed = 0;

  // Tails hang toward the feet when still and stream behind in flight, swinging
  // out on turns and rippling faster with speed. Each segment bends from the one above,
  // so the ripple travels down the tail.
  function placeTails(velocity) {
    for (const tail of tails) {
      tail.segments.forEach((segment, i) => {
        const wave = Math.sin(elapsed * (2.2 + velocity * 4) - i * 0.9) * (0.03 + 0.05 * velocity);
        segment.rotation.set(
          (i === 0 ? 0.12 * velocity : 0) + wave,
          (i === 0 ? -tail.s * 0.06 * (1 - velocity) : 0) - sway * 0.08,
          0,
        );
      });
    }
  }

  function update({ dt, speed, turn, fov, photoOrientation, visible, aspect = 16 / 9 }) {
    elapsed += dt;
    hero.scaling.setAll(heroScaleFor(aspect));
    const smooth = 1 - Math.exp(-dt * 6);
    bank += (clamp(-turn[0] * 1.15, -0.9, 0.9) - bank) * smooth;
    bend += (clamp(turn[1] * 0.38, -0.3, 0.3) - bend) * smooth;
    sway += (bank - sway) * (1 - Math.exp(-dt * 2.8));
    flightBlend = blendFlight(flightBlend, speed, dt);

    const flying = flightBlend;
    const bodyPose = hoverFlightPose(flying, bank, bend);
    hero.rotation.z = bodyPose.bodyBank;
    hero.rotation.x = bodyPose.bodyPitch;
    // Standing still for a moment, the hero turns around to look back at the camera.
    facing = lookBack(facing.angle, facing.idle, flying < 0.05 && speed < 1, dt);
    // While she looks back at the camera, now and then a cute move (core/pose.js).
    idle = idleStep(idle, dt, facing.angle > 2.8);
    const move = idlePose(idle.name, idleProgress(idle));
    hero.rotation.y = facing.angle + move.spin;
    torso.rotation.z = bank * 0.3 * flying;
    torso.rotation.x = -0.18 * flying;
    hero.position.y = BASE_Y + Math.sin(elapsed * 1.5) * 0.04 * (1 - flying) + move.hop;
    head.rotation.z = -bank * 0.25 * flying + move.headTurn;
    head.rotation.y = move.headTilt;
    head.rotation.x = move.headNod;

    for (const limb of limbs) {
      const inside = Math.max(0, bank * limb.s);
      const arm = armPose(limb.s, bank, bend);
      const lift = move.armBlend[limb.s];
      const target = move.arms[limb.s];
      const yaw = limb.s * 0.08 + (arm.shoulderYaw - limb.s * 0.08) * flying;
      limb.shoulder.rotation.y = yaw + (target.yaw - yaw) * lift;
      limb.shoulder.rotation.x = bodyPose.shoulderPitch + (target.pitch - bodyPose.shoulderPitch) * lift;
      limb.elbow.rotation.set((-0.08 + (arm.elbowFlex + 0.08) * flying) * (1 - lift), 0, 0);
      limb.hip.position.x = limb.hipX + limb.s * 0.04 * flying;
      limb.hip.rotation.y = limb.s * (0.06 + inside * 0.22) * flying;
      limb.hip.rotation.x = 0;
      limb.knee.rotation.x = bodyPose.kneeFlex - (inside * 1.05 + Math.abs(bend) * 0.6) * flying;
    }
    placeTails(Math.min(speed / 100, 1) * flying);
    // In flight the robe narrows and streams back instead of opening like a bell.
    skirt.scaling.set(1 - 0.35 * flying, 1 - 0.35 * flying, 1 + 0.1 * flying);

    hero.setEnabled(visible);
    camera.fov = fov;
    camera.rotationQuaternion = new Quaternion(...(photoOrientation || [0, 0, 0, 1]));
  }

  return { scene, camera, root: hero, update };
}
