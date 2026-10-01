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

// Craft paper: an off-white sheet tinted by each material's color. `strong` is the
// clothing's sheet, with visible fibers and flecks like handmade paper (kept light,
// so the cloth does not look stained); the plain sheet (skin and hair) keeps only a faint grain.
function paperTexture(scene, strong) {
  const size = 512;
  const texture = new DynamicTexture(strong ? 'paperStrong' : 'paper', { width: size, height: size }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, size, size);
  let seed = 4242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const k = strong ? 1 : 0.4;
  // Cloudy mottling: broad soft patches, darker and lighter.
  if (strong) {
    for (let i = 0; i < 70; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 30 + rand() * 70;
      const dark = rand() < 0.6;
      const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
      blot.addColorStop(0, dark ? 'rgba(150, 142, 128, 0.05)' : 'rgba(255, 255, 255, 0.14)');
      blot.addColorStop(1, dark ? 'rgba(132, 120, 100, 0)' : 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = blot;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  // Flecks.
  for (let i = 0; i < 3600; i++) {
    const shade = rand() < 0.5 ? 255 : 170;
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade - 10}, ${(0.08 + rand() * 0.16) * k})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2.5, 1 + rand() * 2.5);
  }
  // Fibers: short pale and dark hairs lying every which way.
  for (let i = 0; i < (strong ? 900 : 480); i++) {
    const pale = rand() < 0.4;
    ctx.strokeStyle = pale
      ? `rgba(255, 255, 250, ${(0.2 + rand() * 0.3) * k})`
      : `rgba(128, 120, 106, ${(0.1 + rand() * 0.16) * k})`;
    ctx.lineWidth = 0.6 + rand() * (strong ? 1.2 : 0.6);
    const x = rand() * size;
    const y = rand() * size;
    const bend = (rand() - 0.5) * 20;
    const dx = (rand() - 0.5) * 60;
    const dy = (rand() - 0.5) * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dx / 2 + bend, y + dy / 2 - bend, x + dx, y + dy);
    ctx.stroke();
  }
  // Repeat across faces wider than one sheet (the default would smear the edge pixels).
  texture.wrapU = 1;
  texture.wrapV = 1;
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
  // Four heads tall. The Blender model is 5.6 (head 0.368 of 2.05); growing the head
  // 1.566 times about the neck makes it 0.576 of 2.305, and the whole figure is then
  // shrunk to its old height.
  const HEAD_SCALE = 1.566;
  const BODY_SCALE = 2.05 / 2.305;
  hero.scaling.setAll(1.3 * BODY_SCALE);
  // Her origin is at the belt, lower on her body than the old doll's, so she sits higher.
  const BASE_Y = -0.99;
  hero.position.set(0, BASE_Y, 6);

  // Strong key light and a soft fill, so every fold shows a light and a dark side.
  const fill = new HemisphericLight('fill', new Vector3(-0.3, 1, -1), scene);
  fill.intensity = 0.7;
  fill.groundColor = new Color3(0.3, 0.28, 0.3);
  const direct = new DirectionalLight('sunlight', sunDirection.negate(), scene);
  direct.intensity = 1.9;

  // Matte paper: no shine, a little self-light so it never goes black in space.
  // Paper is a single sheet, so both sides are drawn and lit.
  const grain = paperTexture(scene, false);
  const cloth = paperTexture(scene, true);
  const PLAIN = new Set(['skin', 'silver', 'silver0', 'silver2', 'silver3']);
  const materials = {};
  for (const [name, hex] of Object.entries(MAGE.colors)) {
    const m = new StandardMaterial(name, scene);
    const c = Color3.FromHexString(hex);
    m.diffuseColor = c;
    m.diffuseTexture = PLAIN.has(name) ? grain : cloth;
    m.emissiveColor = c.scale(0.14);
    m.specularColor = new Color3(0, 0, 0);
    m.backFaceCulling = false;
    m.twoSidedLighting = true;
    materials[name] = m;
  }

  // Flat triangles with the paper sheet laid on each face.
  function paperMesh(name, tris, material, parent) {
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i < tris.length; i += 9) {
      const p = [0, 3, 6].map((k) => tris.slice(i + k, i + k + 3));
      const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
      const v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
      // Lay the sheet flat on the face: two axes in the face's own plane, chosen from
      // its normal alone so that neighbouring triangles of one panel share them.
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const nl = Math.hypot(...n) || 1;
      const [nx, ny, nz] = n.map((c) => c / nl);
      const ref = Math.abs(nz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      let a = [ny * ref[2] - nz * ref[1], nz * ref[0] - nx * ref[2], nx * ref[1] - ny * ref[0]];
      const al = Math.hypot(...a) || 1;
      a = a.map((c) => c / al);
      const b = [ny * a[2] - nz * a[1], nz * a[0] - nx * a[2], nx * a[1] - ny * a[0]];
      for (const q of p) {
        indices.push(positions.length / 3);
        positions.push(q[0], q[1], q[2]);
        uvs.push((q[0] * a[0] + q[1] * a[1] + q[2] * a[2]) * 2.4, (q[0] * b[0] + q[1] * b[1] + q[2] * b[2]) * 2.4);
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
  head.scaling.setAll(HEAD_SCALE);
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
      // The tails grow less than the head (1.2 times), or they would hide her whole back.
      if (i === 0) node.scaling.setAll(1.2 / HEAD_SCALE);
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
    hero.scaling.setAll(heroScaleFor(aspect) * BODY_SCALE);
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
