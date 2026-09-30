import {
  Scene, FreeCamera, Vector3, TransformNode, HemisphericLight, DirectionalLight,
  StandardMaterial, Color3, Quaternion, CreateIcoSphere, CreateCylinder, CreatePolyhedron,
  CreatePlane, DynamicTexture,
} from './babylon.js';
import { blendFlight, hoverFlightPose, armPose, lookBack, winkStep } from '../core/pose.js';
import { clamp } from './math.js';

// A chibi girl in faceted, paper-craft style: pink twin tails, a white beret with a
// gold star, a red and white dress and brown boots.
//
// Local axes of the body: +z runs from the feet to the head, +y is the back and -y
// the front (the face). The flight poses in core/pose.js rotate this whole frame.

const COLORS = {
  skin: '#f6d2bf',
  hair: '#ec8f8a',
  hairDark: '#d0646a',
  beret: '#efe8e1',
  band: '#5a3a2e',
  gold: '#e3b24c',
  dress: '#b8444c',
  vest: '#7e2f36',
  blouse: '#f3eee8',
  boot: '#5c392d',
  bow: '#c24b55',
};

const TAIL_SEGMENTS = [0.36, 0.44, 0.42, 0.34, 0.26];

function drawFace(texture, winking) {
  const ctx = texture.getContext();
  const size = texture.getSize().width;
  const u = size / 256;
  ctx.clearRect(0, 0, size, size);
  // Blush.
  ctx.fillStyle = 'rgba(240, 130, 130, 0.55)';
  ctx.fillRect(28 * u, 156 * u, 46 * u, 24 * u);
  ctx.fillRect(182 * u, 156 * u, 46 * u, 24 * u);
  // Open eyes with highlights; the right one closes into an arc for a wink.
  const openEye = (x) => {
    ctx.fillStyle = '#4a2a22';
    ctx.beginPath();
    ctx.ellipse(x * u, 118 * u, 27 * u, 36 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse((x - 9) * u, 104 * u, 9 * u, 12 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  openEye(84);
  if (winking) {
    ctx.strokeStyle = '#4a2a22';
    ctx.lineWidth = 9 * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(172 * u, 132 * u, 27 * u, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    openEye(172);
  }
  // Open smile.
  ctx.fillStyle = '#b8454f';
  ctx.beginPath();
  ctx.moveTo(100 * u, 172 * u);
  ctx.quadraticCurveTo(128 * u, 226 * u, 156 * u, 172 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f08c95';
  ctx.beginPath();
  ctx.ellipse(128 * u, 196 * u, 13 * u, 8 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  texture.update();
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

  const fill = new HemisphericLight('fill', new Vector3(-0.3, 1, -1), scene);
  fill.intensity = 0.95;
  fill.groundColor = new Color3(0.35, 0.3, 0.35);
  const direct = new DirectionalLight('sunlight', sunDirection.negate(), scene);
  direct.intensity = 1.6;

  // Flat pastel paper: mostly its own color, lit enough to show the facets.
  const materials = {};
  for (const [name, hex] of Object.entries(COLORS)) {
    const m = new StandardMaterial(name, scene);
    const c = Color3.FromHexString(hex);
    m.diffuseColor = c;
    m.emissiveColor = c.scale(0.28);
    m.specularColor = new Color3(0.06, 0.06, 0.06);
    materials[name] = m;
  }

  function facet(name, position, scale, material, parent = hero, subdivisions = 1) {
    const mesh = CreateIcoSphere(name, { radius: 0.5, subdivisions, flat: true }, scene);
    mesh.parent = parent;
    mesh.position = new Vector3(...position);
    mesh.scaling = new Vector3(...scale);
    mesh.material = material;
    return mesh;
  }

  function gem(name, position, size, parent = hero) {
    const mesh = CreatePolyhedron(name, { type: 1, size, flat: true }, scene);
    mesh.parent = parent;
    mesh.position = new Vector3(...position);
    mesh.scaling = new Vector3(1, 0.6, 1.3);
    mesh.material = materials.gold;
    return mesh;
  }

  // Cone along the body axis (feet to head): top radius at +z, bottom at -z.
  function flare(name, z, height, top, bottom, material, sides = 9) {
    const mesh = CreateCylinder(name, { height, diameterTop: top, diameterBottom: bottom, tessellation: sides }, scene);
    mesh.convertToFlatShadedMesh();
    mesh.parent = hero;
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = z;
    mesh.material = material;
    return mesh;
  }

  // Body and dress.
  const torso = new TransformNode('torso', scene);
  torso.parent = hero;
  facet('blouse', [0, 0, 0.12], [0.4, 0.3, 0.44], materials.blouse, torso);
  facet('vest', [0, -0.05, 0.08], [0.36, 0.24, 0.36], materials.vest, torso);
  facet('neckBow', [0, -0.16, 0.3], [0.24, 0.1, 0.12], materials.bow, torso);
  gem('neckStar', [0, -0.21, 0.3], 0.05, torso);
  gem('vestStar', [0, -0.18, 0.1], 0.035, torso);
  const skirtParts = [
    flare('petticoat', -0.24, 0.26, 0.5, 1.02, materials.blouse),
    flare('skirt', -0.12, 0.42, 0.46, 0.96, materials.dress),
    flare('hem', -0.33, 0.035, 0.96, 0.98, materials.gold),
  ];

  // Head, face and hair.
  const head = new TransformNode('head', scene);
  head.parent = hero;
  head.position.z = 0.72;
  facet('skull', [0, 0, 0], [0.74, 0.7, 0.74], materials.skin, head, 2);
  const faceTexture = new DynamicTexture('faceTexture', { width: 256, height: 256 }, scene, true);
  faceTexture.hasAlpha = true;
  drawFace(faceTexture, false);
  let winkShown = false;
  const faceMaterial = new StandardMaterial('face', scene);
  faceMaterial.diffuseTexture = faceTexture;
  faceMaterial.emissiveColor = new Color3(0.45, 0.45, 0.45);
  faceMaterial.specularColor = new Color3(0, 0, 0);
  faceMaterial.useAlphaFromDiffuseTexture = true;
  faceMaterial.backFaceCulling = false;
  const face = CreatePlane('face', { size: 0.5 }, scene);
  face.parent = head;
  // Plane faces -z by default: turn it to face the front (-y) with its top toward +z.
  face.rotation.set(-Math.PI / 2, 0, Math.PI);
  face.position.set(0, -0.36, -0.04);
  face.material = faceMaterial;

  facet('hairBack', [0, 0.1, 0.04], [0.84, 0.72, 0.84], materials.hair, head, 2);
  facet('bangs', [0, -0.2, 0.2], [0.74, 0.34, 0.34], materials.hair, head);
  for (const s of [-1, 1]) {
    facet(`sideLock${s}`, [s * 0.34, -0.12, -0.1], [0.18, 0.2, 0.4], materials.hair, head);
  }
  const beret = new TransformNode('beret', scene);
  beret.parent = head;
  beret.position.set(0.04, 0.04, 0.33);
  beret.rotation.set(0.12, 0.18, 0);
  facet('beretTop', [0, 0, 0.06], [0.98, 0.94, 0.34], materials.beret, beret);
  const band = CreateCylinder('beretBand', { height: 0.07, diameter: 0.8, tessellation: 12 }, scene);
  band.convertToFlatShadedMesh();
  band.parent = beret;
  band.rotation.x = Math.PI / 2;
  band.material = materials.band;
  gem('beretStar', [0, -0.4, 0.02], 0.06, beret);

  // Twin tails: a chain of faceted lumps from each side of the head, tied with red bows.
  const tails = [];
  for (const s of [-1, 1]) {
    const root = new TransformNode(`tail${s}`, scene);
    root.parent = head;
    root.position.set(s * 0.44, 0.08, 0.08);
    facet(`bow${s}a`, [0, 0, 0.02], [0.28, 0.12, 0.2], materials.bow, root);
    gem(`bowGem${s}`, [0, -0.06, 0.02], 0.045, root);
    const segments = TAIL_SEGMENTS.map((size, i) =>
      facet(`tail${s}_${i}`, [0, 0, 0], [size, size * 0.85, size * 1.1], i % 2 ? materials.hairDark : materials.hair, root));
    const tip = facet(`tailBow${s}`, [0, 0, 0], [0.22, 0.1, 0.16], materials.bow, root);
    tails.push({ s, root, segments, tip });
  }

  // Arms and legs on the same joints as before, so core/pose.js drives them.
  const limbs = [];
  for (const s of [-1, 1]) {
    const shoulder = new TransformNode(`shoulder${s}`, scene);
    shoulder.parent = hero;
    shoulder.position.set(s * 0.28, 0, 0.28);
    facet(`sleeve${s}`, [0, 0, 0.14], [0.2, 0.2, 0.3], materials.blouse, shoulder);
    const elbow = new TransformNode(`elbow${s}`, scene);
    elbow.parent = shoulder;
    elbow.position.z = 0.28;
    facet(`forearm${s}`, [0, 0, 0.09], [0.15, 0.15, 0.2], materials.blouse, elbow);
    facet(`cuff${s}`, [0, 0, 0.19], [0.13, 0.13, 0.05], materials.band, elbow);
    facet(`hand${s}`, [0, 0, 0.27], [0.13, 0.11, 0.14], materials.skin, elbow);

    const hip = new TransformNode(`hip${s}`, scene);
    hip.parent = hero;
    hip.position.set(s * 0.13, 0, -0.26);
    facet(`thigh${s}`, [0, 0, -0.13], [0.15, 0.15, 0.28], materials.skin, hip);
    const knee = new TransformNode(`knee${s}`, scene);
    knee.parent = hip;
    knee.position.z = -0.26;
    facet(`boot${s}`, [0, -0.02, -0.14], [0.18, 0.2, 0.3], materials.boot, knee);
    gem(`bootGem${s}`, [0, -0.13, -0.08], 0.04, knee);
    limbs.push({ s, shoulder, elbow, hip, knee });
  }

  let bank = 0;
  let bend = 0;
  let sway = 0;
  let flightBlend = 0;
  let facing = { angle: 0, idle: 0 };
  let wink = { untilNext: 1, left: 0 };
  let elapsed = 0;

  // Tails hang toward the feet when still and stream behind in flight, swinging
  // out on turns and rippling faster with speed.
  function placeTails(velocity) {
    for (const tail of tails) {
      let offset = [0, 0, -0.08];
      tail.segments.forEach((segment, i) => {
        const wave = Math.sin(elapsed * (2.2 + velocity * 4) - i * 0.9) * (0.02 + 0.05 * velocity) * (i + 1) * 0.5;
        offset = [
          offset[0] + tail.s * 0.05 * (1 - velocity) + sway * 0.05 * i,
          offset[1] + 0.03 + velocity * 0.05 + wave,
          offset[2] - (i === 0 ? 0.12 : 0.3) * (1 - 0.15 * velocity),
        ];
        segment.position.set(...offset);
      });
      const last = tail.segments.at(-1).position;
      tail.tip.position.set(last.x, last.y, last.z - 0.18);
    }
  }

  function update({ dt, speed, turn, fov, photoOrientation, visible }) {
    elapsed += dt;
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
    hero.rotation.y = facing.angle;
    // Now and then a wink while she looks back at the camera.
    wink = winkStep(wink, dt, facing.angle > 2.8);
    if ((wink.left > 0) !== winkShown) {
      winkShown = wink.left > 0;
      drawFace(faceTexture, winkShown);
    }
    torso.rotation.z = bank * 0.3 * flying;
    torso.rotation.x = -0.18 * flying;
    hero.position.y = -1.15 + Math.sin(elapsed * 1.5) * 0.04 * (1 - flying);
    head.rotation.z = -bank * 0.25 * flying;

    for (const limb of limbs) {
      const inside = Math.max(0, bank * limb.s);
      const arm = armPose(limb.s, bank, bend);
      limb.shoulder.rotation.y = limb.s * 0.08 + (arm.shoulderYaw - limb.s * 0.08) * flying;
      limb.shoulder.rotation.x = bodyPose.shoulderPitch;
      limb.elbow.rotation.set(-0.08 + (arm.elbowFlex + 0.08) * flying, 0, 0);
      limb.hip.position.x = limb.s * (0.11 + 0.04 * flying);
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

