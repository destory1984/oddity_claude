// Copyright (c) 2026 destory1984. All rights reserved.
// This file (the player character's design) is NOT covered by the MIT License;
// see LICENSE, part 2. Forks must replace the character with their own.

import {
  Scene, FreeCamera, Vector3, TransformNode, HemisphericLight, DirectionalLight,
  StandardMaterial, Color3, Quaternion, CreateIcoSphere, CreateCylinder, CreatePolyhedron,
  DynamicTexture,
} from './babylon.js';
import {
  blendFlight, hoverFlightPose, armPose, lookBack, idleStep, idlePose, idleProgress, heroScaleFor,
} from '../core/pose.js';
import { clamp } from './math.js';

// A faceless paper doll, as if folded from colored craft paper: pink twin tails of
// long folded strips, a white beret with a gold star, a white capelet over a red
// dress, gold paper trim, dark stockings and folded brown boots.
//
// Local axes of the body: +z runs from the feet to the head, +y is the back and -y
// the front. The flight poses in core/pose.js rotate this whole frame.

const COLORS = {
  skin: '#efd3bf',
  hair: '#e8928e',
  hairFold: '#cf7478',
  paper: '#f2ede4',
  band: '#5b3b2f',
  gold: '#c9a55c',
  dress: '#b04852',
  vest: '#6e2b33',
  stocking: '#2f2b2e',
  boot: '#6b4332',
  bow: '#b8444f',
};

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
  hero.position.set(0, -1.15, 6);

  // Strong key light and a soft fill, so every fold shows a light and a dark side.
  const fill = new HemisphericLight('fill', new Vector3(-0.3, 1, -1), scene);
  fill.intensity = 0.7;
  fill.groundColor = new Color3(0.3, 0.28, 0.3);
  const direct = new DirectionalLight('sunlight', sunDirection.negate(), scene);
  direct.intensity = 1.9;

  // Matte paper: no shine, a little self-light so it never goes black in space.
  const grain = paperTexture(scene);
  const materials = {};
  for (const [name, hex] of Object.entries(COLORS)) {
    const m = new StandardMaterial(name, scene);
    const c = Color3.FromHexString(hex);
    m.diffuseColor = c;
    m.diffuseTexture = grain;
    m.emissiveColor = c.scale(0.14);
    m.specularColor = new Color3(0, 0, 0);
    materials[name] = m;
  }

  function place(mesh, position, scale, material, parent, rotation = [0, 0, 0]) {
    mesh.parent = parent;
    mesh.position = new Vector3(...position);
    mesh.scaling = new Vector3(...scale);
    mesh.rotation = new Vector3(...rotation);
    mesh.material = material;
    return mesh;
  }

  // A lump of crumpled-and-folded paper: an icosahedron, 20 flat faces.
  function facet(name, position, scale, material, parent = hero) {
    return place(CreateIcoSphere(name, { radius: 0.5, subdivisions: 1, flat: true }, scene), position, scale, material, parent);
  }

  // A folded strip: a tapered triangular prism along the body axis.
  function strip(name, position, length, top, bottom, material, parent = hero, rotation = [0, 0, 0]) {
    const mesh = CreateCylinder(name, { height: 1, diameterTop: top, diameterBottom: bottom, tessellation: 3 }, scene);
    mesh.convertToFlatShadedMesh();
    const holder = new TransformNode(`${name}Holder`, scene);
    holder.parent = parent;
    holder.position = new Vector3(...position);
    holder.rotation = new Vector3(...rotation);
    place(mesh, [0, 0, 0], [1, length, 1], material, holder, [Math.PI / 2, 0, 0]);
    return holder;
  }

  function gem(name, position, size, parent = hero) {
    const mesh = CreatePolyhedron(name, { type: 1, size, flat: true }, scene);
    return place(mesh, position, [1, 0.6, 1.3], materials.gold, parent);
  }

  // Folded cone along the body axis (feet to head): top radius at +z, bottom at -z.
  function flare(name, z, height, top, bottom, material, sides = 6, parent = hero) {
    const mesh = CreateCylinder(name, { height, diameterTop: top, diameterBottom: bottom, tessellation: sides }, scene);
    mesh.convertToFlatShadedMesh();
    return place(mesh, [0, 0, z], [1, 1, 1], material, parent, [Math.PI / 2, 0, 0]);
  }

  // Body: blouse, dark vest, belt with a gold buckle, white capelet with gold trim.
  const torso = new TransformNode('torso', scene);
  torso.parent = hero;
  facet('blouse', [0, 0, 0.12], [0.38, 0.28, 0.44], materials.paper, torso);
  facet('vest', [0, -0.04, 0.08], [0.34, 0.24, 0.34], materials.vest, torso);
  flare('belt', -0.02, 0.05, 0.4, 0.4, materials.band, 6, torso);
  gem('buckle', [0, -0.2, -0.02], 0.035, torso);
  flare('capelet', 0.24, 0.2, 0.28, 0.64, materials.paper, 6, torso);
  flare('capeletTrim', 0.14, 0.03, 0.64, 0.66, materials.gold, 6, torso);
  flare('collar', 0.37, 0.07, 0.2, 0.22, materials.paper, 6, torso);

  // Dress: white under-layer, red folded skirt, gold hem.
  const skirtParts = [
    flare('petticoat', -0.26, 0.26, 0.48, 1.0, materials.paper),
    flare('skirt', -0.14, 0.42, 0.44, 0.96, materials.dress),
    flare('hem', -0.35, 0.035, 0.96, 0.98, materials.gold),
  ];

  // Head: a blank folded face, as in paper dolls, under folded pink hair and a beret.
  const head = new TransformNode('head', scene);
  head.parent = hero;
  head.position.z = 0.7;
  facet('skull', [0, -0.02, -0.02], [0.6, 0.58, 0.7], materials.skin, head);
  facet('hairBack', [0, 0.1, 0.06], [0.72, 0.62, 0.8], materials.hair, head);
  strip('bangsLeft', [-0.12, -0.24, 0.16], 0.34, 0.03, 0.26, materials.hair, head, [0.25, 0.3, 0]);
  strip('bangsRight', [0.12, -0.24, 0.16], 0.34, 0.03, 0.26, materials.hairFold, head, [0.25, -0.3, 0]);
  for (const s of [-1, 1]) {
    strip(`sideLock${s}`, [s * 0.3, -0.12, -0.12], 0.46, 0.18, 0.04, materials.hair, head, [0, s * 0.12, 0]);
  }
  const beret = new TransformNode('beret', scene);
  beret.parent = head;
  beret.position.set(0.04, 0.04, 0.34);
  beret.rotation.set(0.12, 0.18, 0);
  facet('beretTop', [0, 0, 0.06], [0.9, 0.86, 0.28], materials.paper, beret);
  flare('beretBand', 0, 0.07, 0.74, 0.74, materials.gold, 8, beret);
  gem('beretStar', [0, -0.38, 0.02], 0.06, beret);

  // Twin tails: long folded strips hanging from red bows.
  const tails = [];
  const TAIL = [
    { length: 0.5, top: 0.2, bottom: 0.3 },
    { length: 0.54, top: 0.3, bottom: 0.22 },
    { length: 0.48, top: 0.22, bottom: 0.05 },
  ];
  for (const s of [-1, 1]) {
    const root = new TransformNode(`tail${s}`, scene);
    root.parent = head;
    root.position.set(s * 0.4, 0.08, 0.1);
    facet(`bow${s}`, [0, 0, 0.02], [0.26, 0.1, 0.18], materials.bow, root);
    gem(`bowGem${s}`, [0, -0.06, 0.02], 0.04, root);
    const segments = TAIL.map((t, i) =>
      strip(`tail${s}_${i}`, [0, 0, 0], t.length, t.top, t.bottom, i % 2 ? materials.hairFold : materials.hair, root));
    tails.push({ s, segments });
  }

  // Arms with wide paper sleeves and gold cuffs; legs in dark stockings and folded boots.
  const limbs = [];
  for (const s of [-1, 1]) {
    const shoulder = new TransformNode(`shoulder${s}`, scene);
    shoulder.parent = hero;
    shoulder.position.set(s * 0.26, 0, 0.28);
    facet(`upperArm${s}`, [0, 0, 0.13], [0.16, 0.16, 0.28], materials.paper, shoulder);
    const elbow = new TransformNode(`elbow${s}`, scene);
    elbow.parent = shoulder;
    elbow.position.z = 0.26;
    const sleeve = CreateCylinder(`sleeve${s}`, { height: 0.2, diameterTop: 0.2, diameterBottom: 0.12, tessellation: 5 }, scene);
    sleeve.convertToFlatShadedMesh();
    place(sleeve, [0, 0, 0.1], [1, 1, 1], materials.paper, elbow, [-Math.PI / 2, 0, 0]);
    const cuff = CreateCylinder(`cuff${s}`, { height: 0.03, diameter: 0.21, tessellation: 5 }, scene);
    cuff.convertToFlatShadedMesh();
    place(cuff, [0, 0, 0.2], [1, 1, 1], materials.gold, elbow, [Math.PI / 2, 0, 0]);
    facet(`hand${s}`, [0, 0, 0.26], [0.11, 0.09, 0.13], materials.skin, elbow);

    const hip = new TransformNode(`hip${s}`, scene);
    hip.parent = hero;
    hip.position.set(s * 0.12, 0, -0.26);
    strip(`thigh${s}`, [0, 0, -0.14], 0.28, 0.13, 0.1, materials.stocking, hip);
    const knee = new TransformNode(`knee${s}`, scene);
    knee.parent = hip;
    knee.position.z = -0.26;
    facet(`boot${s}`, [0, -0.02, -0.14], [0.16, 0.19, 0.3], materials.boot, knee);
    facet(`bootCuff${s}`, [0, 0, -0.02], [0.17, 0.17, 0.08], materials.boot, knee);
    limbs.push({ s, shoulder, elbow, hip, knee });
  }

  let bank = 0;
  let bend = 0;
  let sway = 0;
  let flightBlend = 0;
  let facing = { angle: 0, idle: 0 };
  let idle = { untilNext: 3, name: null, t: 0, last: null };
  let elapsed = 0;

  // Tails hang toward the feet when still and stream behind in flight, swinging
  // out on turns and rippling faster with speed. Each strip tilts to follow the one above.
  function placeTails(velocity) {
    for (const tail of tails) {
      let offset = [0, 0, -0.1];
      tail.segments.forEach((segment, i) => {
        const wave = Math.sin(elapsed * (2.2 + velocity * 4) - i * 0.9) * (0.03 + 0.06 * velocity) * (i + 1) * 0.5;
        const step = [
          tail.s * 0.05 * (1 - velocity) + sway * 0.06 * i,
          0.03 + velocity * 0.06 + wave,
          -0.4 * (1 - 0.1 * velocity),
        ];
        segment.position.set(offset[0] + step[0] / 2, offset[1] + step[1] / 2, offset[2] + step[2] / 2);
        segment.rotation.set(-Math.atan2(step[1], -step[2]), Math.atan2(step[0], -step[2]), 0);
        offset = offset.map((n, k) => n + step[k]);
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
    hero.position.y = -1.15 + Math.sin(elapsed * 1.5) * 0.04 * (1 - flying) + move.hop;
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
      limb.hip.position.x = limb.s * (0.1 + 0.04 * flying);
      limb.hip.rotation.y = limb.s * (0.06 + inside * 0.22) * flying;
      limb.hip.rotation.x = 0;
      limb.knee.rotation.x = bodyPose.kneeFlex - (inside * 1.05 + Math.abs(bend) * 0.6) * flying;
    }
    placeTails(Math.min(speed / 100, 1) * flying);
    // In flight the skirt narrows and streams back instead of opening like a bell.
    for (const part of skirtParts) part.scaling.set(1 - 0.4 * flying, 1 + 0.35 * flying, 1 - 0.4 * flying);

    hero.setEnabled(visible);
    camera.fov = fov;
    camera.rotationQuaternion = new Quaternion(...(photoOrientation || [0, 0, 0, 1]));
  }

  return { scene, camera, root: hero, update };
}
