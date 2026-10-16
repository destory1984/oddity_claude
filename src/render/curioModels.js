import { TransformNode, CreateSphere, CreateLathe, DynamicTexture, StandardMaterial, Color3, Vector3 } from './babylon.js';
import { part, box, rod, nozzle, fuse, drum, aim } from './craftParts.js';

// The two curios near Jupiter (core/curios.js), built as craft are: about one unit
// across, local +z toward the Sun (render/craft.js turns them so).

// White marble with soft grey veins, one material for every slab in a scene.
const MARBLE = new WeakMap();
function marble(scene) {
  if (MARBLE.has(scene)) return MARBLE.get(scene);
  const map = new DynamicTexture('marbleMap', { width: 256, height: 512 }, scene, true);
  const c = map.getContext();
  c.fillStyle = '#efece6';
  c.fillRect(0, 0, 256, 512);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let v = 0; v < 22; v++) {
    const grey = 105 + Math.round(rnd() * 40);
    c.strokeStyle = `rgba(${grey}, ${grey}, ${grey + 12}, ${0.12 + rnd() * 0.35})`;
    c.lineWidth = 0.5 + rnd() * (v < 5 ? 3 : 1.2);
    c.beginPath();
    let x = rnd() * 256;
    let y = -10;
    c.moveTo(x, y);
    while (y < 522) {
      x += (rnd() - 0.45) * 23;
      y += 9 + rnd() * 20;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  map.update();
  const material = new StandardMaterial('marble', scene);
  material.diffuseTexture = map;
  material.specularColor = new Color3(0.35, 0.35, 0.35);
  material.specularPower = 60;
  material.emissiveColor = new Color3(0.14, 0.14, 0.14);
  MARBLE.set(scene, material);
  return material;
}

// The slab: 1 : 4 : 9, standing upright, its broad face to the Sun.
function monolith(scene, name) {
  const root = new TransformNode(name, scene);
  box(scene, `${name}Slab`, root, marble(scene), [0.4, 0.9, 0.1]);
  return root;
}

// spaceship unknown: a round head with its windows, a long spine, a wheel turning round
// the spine, and its engines at the back. Its head is at -z, away from the Sun: it faces
// the slab, which stands behind it. (Picked by the user from five on 2026-10-16: "B".)
const ball = (scene, name, parent, material, diameter, at = [0, 0, 0], scaling = [1, 1, 1]) => part(
  CreateSphere(name, { diameter, segments: 18 }, scene), parent, material, at, [0, 0, 0], scaling,
);
function unknown(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const body = new TransformNode(`${name}Body`, scene);
  body.parent = root;
  ball(scene, `${name}Head`, body, mats.white, 0.17, [0, 0, -0.5]);
  for (const [k, x] of [[0, -0.06], [1, -0.02], [2, 0.02], [3, 0.06]]) ball(scene, `${name}Window${k}`, body, mats.black, 0.022, [x, 0.025, -0.5 - 0.078], [1, 1, 0.4]);
  rod(scene, `${name}Spine`, body, mats.grey, [0, 0, -0.42], [0, 0, 0.42], 0.03, 8);
  box(scene, `${name}Engine`, body, mats.white, [0.12, 0.09, 0.14], [0, 0, 0.48]);
  for (const [k, x, y] of [[0, 0, 0.02], [1, 0.035, -0.025], [2, -0.035, -0.025]]) nozzle(scene, `${name}Nozzle${k}`, body, mats.dark, [x, y, 0.55], [0, 0, 1], 0.05, 0.04);
  fuse(scene, body);
  // The wheel turns slowly round the spine (once in a minute).
  const wheel = new TransformNode(`${name}Wheel`, scene);
  wheel.parent = root;
  wheel.position.z = -0.12;
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * 2 * Math.PI;
    box(scene, `${name}Ring${k}`, wheel, mats.white, [0.075, 0.055, 0.03], [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0], [0, 0, a]);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * 2 * Math.PI;
    rod(scene, `${name}Spoke${k}`, wheel, mats.grey, [0, 0, 0], [Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0], 0.012, 6);
  }
  scene.onBeforeRenderObservable.add(() => {
    wheel.rotation.z = (performance.now() / 60000) * 2 * Math.PI;
  });
  return root;
}

// A plain coloured material, made once a scene.
const PAINTS = new WeakMap();
function paint(scene, name, hex, { shine = 0.1, glow = 0, alpha = 1 } = {}) {
  const kept = PAINTS.get(scene) ?? new Map();
  PAINTS.set(scene, kept);
  if (kept.has(name)) return kept.get(name);
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(hex);
  material.specularColor = new Color3(shine, shine, shine);
  material.emissiveColor = Color3.FromHexString(hex).scale(glow);
  material.alpha = alpha;
  kept.set(name, material);
  return material;
}
const turned = (scene, name, parent, material, profile, at = [0, 0, 0]) => part(
  CreateLathe(name, { shape: profile.map(([r, y]) => new Vector3(r, y, 0)), tessellation: 36, sideOrientation: 2 }, scene), parent, material, at,
);

// Russell's teapot: white porcelain with a blue band, its spout and handle on either side.
function teapot(scene, name) {
  const root = new TransformNode(name, scene);
  const china = paint(scene, 'porcelain', '#f4f1ea', { shine: 0.6, glow: 0.12 });
  const blue = paint(scene, 'teapotBlue', '#2f5fae', { shine: 0.4, glow: 0.1 });
  turned(scene, `${name}Body`, root, china, [[0, -0.22], [0.2, -0.21], [0.29, -0.12], [0.31, 0], [0.27, 0.12], [0.18, 0.19], [0, 0.2]]);
  drum(scene, `${name}Band`, root, blue, { height: 0.035, diameter: 0.625, tessellation: 36 }, [0, -0.02, 0]);
  turned(scene, `${name}Lid`, root, china, [[0, 0.27], [0.06, 0.26], [0.14, 0.21], [0.17, 0.19]]);
  ball(scene, `${name}Knob`, root, blue, 0.07, [0, 0.29, 0]);
  // The spout, out and up from the side (+x); the handle a loop on the other side.
  drum(scene, `${name}Spout`, root, china, { height: 0.3, diameterTop: 0.04, diameterBottom: 0.1, tessellation: 16 }, [0.38, 0.06, 0], [1, 1.1, 0]);
  const loop = [[-0.27, 0.12], [-0.4, 0.13], [-0.45, 0.04], [-0.42, -0.06], [-0.28, -0.12]];
  for (let k = 0; k < loop.length - 1; k++) rod(scene, `${name}Handle${k}`, root, china, [loop[k][0], loop[k][1], 0], [loop[k + 1][0], loop[k + 1][1], 0], 0.045, 10);
  return root;
}

// The little star with a rose: a grey-brown ball no bigger than a house, three volcanoes
// (two of them glowing), a baobab sprout, and a rose under a glass dome.
function rose(scene, name) {
  const root = new TransformNode(name, scene);
  const rock = paint(scene, 'roseStarRock', '#a08f7c', { shine: 0.05 });
  const dark = paint(scene, 'roseStarDark', '#6b5d50', { shine: 0.05 });
  const fire = paint(scene, 'roseStarFire', '#ff8a3c', { glow: 1 });
  const green = paint(scene, 'roseStarGreen', '#4f9a45', { glow: 0.15 });
  const red = paint(scene, 'roseStarRed', '#d7263d', { shine: 0.3, glow: 0.25 });
  const glass = paint(scene, 'roseStarGlass', '#d8ecff', { shine: 0.9, glow: 0.2, alpha: 0.28 });
  const R = 0.3;
  ball(scene, `${name}Ball`, root, rock, 2 * R);
  // Something standing on the ball at `way` (any length; local +y outward).
  const on = (key, way) => {
    const length = Math.hypot(...way);
    const up = way.map((n) => n / length);
    const holder = new TransformNode(`${name}${key}`, scene);
    holder.parent = root;
    holder.position = new Vector3(...up.map((n) => n * R * 0.97));
    aim(holder, up);
    return holder;
  };
  [[[-0.5, 0.8, 0.3], true], [[-0.8, 0.3, -0.5], true], [[0.2, 0.5, -0.85], false]].forEach(([way, lit], k) => {
    const at = on(`Volcano${k}`, way);
    drum(scene, `${name}Cone${k}`, at, dark, { height: 0.09, diameterTop: 0.03, diameterBottom: 0.14 }, [0, 0.04, 0]);
    if (lit) ball(scene, `${name}Fire${k}`, at, fire, 0.035, [0, 0.09, 0]);
  });
  const sprout = on('Sprout', [0.8, 0.4, 0.45]);
  rod(scene, `${name}SproutStem`, sprout, green, [0, 0, 0], [0, 0.07, 0], 0.012);
  ball(scene, `${name}SproutLeaf0`, sprout, green, 0.035, [0.015, 0.075, 0], [1, 0.5, 1]);
  ball(scene, `${name}SproutLeaf1`, sprout, green, 0.035, [-0.015, 0.07, 0], [1, 0.5, 1]);
  const flower = on('Rose', [0.15, 1, 0.25]);
  rod(scene, `${name}RoseStem`, flower, green, [0, 0, 0], [0, 0.13, 0], 0.012);
  ball(scene, `${name}RoseLeaf`, flower, green, 0.04, [0.02, 0.06, 0], [1, 0.4, 0.6]);
  ball(scene, `${name}RoseBloom`, flower, red, 0.06, [0, 0.15, 0], [1, 1.2, 1]);
  ball(scene, `${name}RosePetal`, flower, red, 0.045, [0.02, 0.17, 0.01], [1, 1.3, 1]);
  part(CreateSphere(`${name}Dome`, { diameter: 0.24, segments: 18, slice: 0.5 }, scene), flower, glass, [0, 0, 0]);
  return root;
}

// The slab on the Moon is the slab by Jupiter, standing on the ground.
export const CURIO_BUILD = { monolith, unknown, teapot, rose, moonSlab: monolith };
