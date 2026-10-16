import { TransformNode, CreateSphere, CreateLathe, DynamicTexture, StandardMaterial, Color3, Vector3, Quaternion } from './babylon.js';
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
  // (The lid and its knob ride together, for a scene to lift: render/craftUnfold.js.)
  const lid = new TransformNode(`${name}LidHolder`, scene);
  lid.parent = root;
  turned(scene, `${name}Lid`, lid, china, [[0, 0.27], [0.06, 0.26], [0.14, 0.21], [0.17, 0.19]]);
  ball(scene, `${name}Knob`, lid, blue, 0.07, [0, 0.29, 0]);
  root.metadata = { lid };
  // The spout, out and up from the side (+x); the handle a loop on the other side.
  drum(scene, `${name}Spout`, root, china, { height: 0.3, diameterTop: 0.04, diameterBottom: 0.1, tessellation: 16 }, [0.38, 0.06, 0], [1, 1.1, 0]);
  const loop = [[-0.27, 0.12], [-0.4, 0.13], [-0.45, 0.04], [-0.42, -0.06], [-0.28, -0.12]];
  for (let k = 0; k < loop.length - 1; k++) rod(scene, `${name}Handle${k}`, root, china, [loop[k][0], loop[k][1], 0], [loop[k + 1][0], loop[k + 1][1], 0], 0.045, 10);
  return root;
}

// One rose (the user, 2026-10-16: "장미를 좀 더 정교하게"): a stem bent a little, with
// thorns and two leaves of three leaflets each; five sepals under the bloom; the bloom a
// tight dark bud wrapped by three rings of cupped petals (3, 5 and 7), each ring wider,
// more open and lighter than the one inside it, turned by the golden angle from it.
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// A thin part leant out from the middle at `a` round it by `lean` from straight up: its
// own +y along that way, its flat face (+z) turned out from the middle.
function leanOut(mesh, a, lean) {
  const up = new Vector3(Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean));
  const face = new Vector3(Math.cos(a) * Math.cos(lean), -Math.sin(lean), Math.sin(a) * Math.cos(lean));
  mesh.rotationQuaternion = Quaternion.FromLookDirectionLH(face, up);
}
const PETAL_RINGS = [
  { count: 3, size: 0.034, out: 0.006, open: 0.25, deep: true },
  { count: 5, size: 0.042, out: 0.013, open: 0.55, deep: false },
  { count: 7, size: 0.048, out: 0.019, open: 0.95, deep: false },
];
function roseFlower(scene, name, parent, { green, red, deep }) {
  const stemTop = [0.008, 0.13, 0];
  rod(scene, `${name}Stem0`, parent, green, [0, 0, 0], [0.012, 0.065, 0], 0.01, 8);
  rod(scene, `${name}Stem1`, parent, green, [0.012, 0.065, 0], stemTop, 0.009, 8);
  [[0.007, 0.03, 0.004, 0.6], [0.015, 0.085, -0.004, -0.5], [0.004, 0.105, 0.005, 2.2]].forEach(([x, y, z, turn], k) => {
    const thorn = drum(scene, `${name}Thorn${k}`, parent, green, { height: 0.01, diameterTop: 0, diameterBottom: 0.005, tessellation: 6 }, [x, y, z]);
    thorn.rotation.set(0, turn, Math.PI / 2.3);
  });
  [[0.011, 0.05, 0.4], [0.013, 0.09, Math.PI + 0.3]].forEach(([x, y, turn], k) => {
    const leaf = new TransformNode(`${name}Leaf${k}`, scene);
    leaf.parent = parent;
    leaf.position.set(x, y, 0);
    leaf.rotation.set(0, turn, -0.9);
    rod(scene, `${name}Petiole${k}`, leaf, green, [0, 0, 0], [0, 0.03, 0], 0.004, 5);
    [[0, 0.04, 0], [-0.012, 0.025, 0.4], [0.012, 0.025, -0.4]].forEach(([lx, ly, lean], j) => {
      const blade = ball(scene, `${name}Leaflet${k}${j}`, leaf, green, 0.022, [lx, ly, 0], [0.55, 1, 0.12]);
      blade.rotation.z = lean;
    });
  });
  const head = new TransformNode(`${name}Head`, scene);
  head.parent = parent;
  head.position.set(...stemTop);
  for (let k = 0; k < 5; k++) {
    const sepal = ball(scene, `${name}Sepal${k}`, head, green, 0.03, [0, 0, 0], [0.3, 1, 0.1]);
    const a = (k / 5) * 2 * Math.PI;
    sepal.position.set(Math.cos(a) * 0.012, 0.002, Math.sin(a) * 0.012);
    leanOut(sepal, a, 2.1);
  }
  ball(scene, `${name}Bud`, head, deep, 0.026, [0, 0.022, 0], [0.8, 1.25, 0.8]);
  let turn = 0;
  PETAL_RINGS.forEach(({ count, size, out, open, deep: dark }, ring) => {
    for (let k = 0; k < count; k++) {
      turn += GOLDEN;
      const a = turn + (k / count) * 2 * Math.PI;
      const petal = ball(scene, `${name}Petal${ring}${k}`, head, dark ? deep : red, size, [0, 0, 0], [0.9, 1.15, 0.3]);
      // Stood up round the bud, its cup facing in, then leant out by `open`.
      petal.position.set(Math.cos(a) * out, 0.02 + size * 0.15, Math.sin(a) * out);
      leanOut(petal, a, open);
    }
  });
  return head;
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
  // (Its moving parts are kept for a scene: render/craftUnfold.js.)
  const volcanoes = [[[-0.5, 0.8, 0.3], true], [[-0.8, 0.3, -0.5], true], [[0.2, 0.5, -0.85], false]].map(([way, lit], k) => {
    const at = on(`Volcano${k}`, way);
    drum(scene, `${name}Cone${k}`, at, dark, { height: 0.09, diameterTop: 0.03, diameterBottom: 0.14 }, [0, 0.04, 0]);
    return lit ? ball(scene, `${name}Fire${k}`, at, fire, 0.035, [0, 0.09, 0]) : at;
  });
  const sprout = on('Sprout', [0.8, 0.4, 0.45]);
  rod(scene, `${name}SproutStem`, sprout, green, [0, 0, 0], [0, 0.07, 0], 0.012);
  ball(scene, `${name}SproutLeaf0`, sprout, green, 0.035, [0.015, 0.075, 0], [1, 0.5, 1]);
  ball(scene, `${name}SproutLeaf1`, sprout, green, 0.035, [-0.015, 0.07, 0], [1, 0.5, 1]);
  const flower = on('Rose', [0.15, 1, 0.25]);
  roseFlower(scene, `${name}Rose`, flower, { green, red, deep: paint(scene, 'roseStarDeep', '#9e0f26', { shine: 0.3, glow: 0.2 }) });
  // A bell of glass over it, taller than the rose (it stood out of a round half before).
  const dome = part(CreateSphere(`${name}Dome`, { diameter: 0.3, segments: 24, slice: 0.5 }, scene), flower, glass, [0, 0, 0], [0, 0, 0], [0.8, 1.45, 0.8]);
  root.metadata = { volcanoes, sprout, flower, dome };
  return root;
}

// The slab on the Moon is the slab by Jupiter, standing on the ground.
// Light itself, never shaded (a glow, a halo).
const LIGHTS = new WeakMap();
function light(scene, name, hex, alpha = 1) {
  const kept = LIGHTS.get(scene) ?? new Map();
  LIGHTS.set(scene, kept);
  if (kept.has(name)) return kept.get(name);
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.FromHexString(hex);
  material.alpha = alpha;
  material.backFaceCulling = false;
  kept.set(name, material);
  return material;
}
// Those standing on the ground (core/curios.js GROUND) stand on y = FLOOR, half their
// drawn size under their middle.
const FLOOR = -0.45;
const disc = (scene, name, parent, material, diameter, at, height = 0.01) => drum(scene, name, parent, material, { height, diameter, tessellation: 36 }, at);

// The Moon Rabbit (an old tale of Korea, China and Japan): a white rabbit pounding a
// mortar under the cassia tree. (metadata: the pestle and the rabbit, for a scene.)
function moonRabbit(scene, name) {
  const root = new TransformNode(name, scene);
  const bark = paint(scene, 'cassiaBark', '#6b4a2b');
  const leaves = paint(scene, 'cassiaLeaves', '#4f7a3a', { glow: 0.12 });
  const bloom = paint(scene, 'cassiaBloom', '#e8c25a', { glow: 0.35 });
  const fur = paint(scene, 'rabbitFur', '#f6f4ee', { shine: 0.2, glow: 0.25 });
  const pink = paint(scene, 'rabbitPink', '#e89aa6', { glow: 0.2 });
  const eye = paint(scene, 'rabbitEye', '#c0182c', { glow: 0.5 });
  const wood = paint(scene, 'mortarWood', '#8a5a35');
  disc(scene, `${name}Ground`, root, paint(scene, 'rabbitGround', '#8e8b86'), 1.3, [0, FLOOR - 0.005, 0]);
  // The tree, to the left.
  rod(scene, `${name}Trunk`, root, bark, [-0.28, FLOOR, 0], [-0.25, 0.05, 0], 0.07, 10);
  rod(scene, `${name}Bough0`, root, bark, [-0.26, -0.05, 0], [-0.42, 0.12, 0.04], 0.035, 8);
  rod(scene, `${name}Bough1`, root, bark, [-0.26, 0, 0], [-0.08, 0.16, -0.03], 0.03, 8);
  [[-0.25, 0.2, 0, 0.36], [-0.43, 0.14, 0.05, 0.24], [-0.07, 0.17, -0.04, 0.24], [-0.27, 0.36, 0.02, 0.22]].forEach(([x, y, z, d], k) => {
    ball(scene, `${name}Crown${k}`, root, leaves, d, [x, y, z], [1, 0.75, 1]);
  });
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4;
    ball(scene, `${name}Flower${k}`, root, bloom, 0.035, [-0.25 + Math.cos(a) * 0.18, 0.2 + Math.sin(k) * 0.1, 0.12 + Math.sin(a) * 0.05]);
  }
  // The mortar, before the rabbit.
  drum(scene, `${name}Mortar`, root, wood, { height: 0.12, diameterTop: 0.15, diameterBottom: 0.11, tessellation: 24 }, [0.1, FLOOR + 0.06, 0.05]);
  disc(scene, `${name}MortarHole`, root, paint(scene, 'mortarDark', '#3b2717'), 0.11, [0.1, FLOOR + 0.121, 0.05], 0.004);
  // The rabbit, on its hind legs, facing the mortar (-x).
  const rabbit = new TransformNode(`${name}Rabbit`, scene);
  rabbit.parent = root;
  rabbit.position.set(0.3, FLOOR, 0.05);
  ball(scene, `${name}Body`, rabbit, fur, 0.18, [0, 0.12, 0], [0.9, 1.25, 0.85]);
  ball(scene, `${name}Haunch`, rabbit, fur, 0.13, [0.04, 0.06, 0], [1.1, 0.8, 1]);
  ball(scene, `${name}Head`, rabbit, fur, 0.12, [-0.03, 0.27, 0], [1, 0.95, 0.9]);
  for (const side of [-1, 1]) {
    const ear = ball(scene, `${name}Ear${side}`, rabbit, fur, 0.05, [0.0, 0.4, side * 0.025], [0.55, 3, 0.5]);
    ear.rotation.set(side * 0.12, 0, 0.25);
    const inner = ball(scene, `${name}EarIn${side}`, rabbit, pink, 0.03, [-0.008, 0.4, side * 0.025], [0.4, 3.6, 0.3]);
    inner.rotation.set(side * 0.12, 0, 0.25);
    ball(scene, `${name}Eye${side}`, rabbit, eye, 0.016, [-0.075, 0.29, side * 0.03]);
  }
  ball(scene, `${name}Nose`, rabbit, pink, 0.016, [-0.09, 0.26, 0]);
  ball(scene, `${name}Tail`, rabbit, fur, 0.05, [0.09, 0.07, 0]);
  // The pestle stands upright in the mortar on its own (the user, 2026-10-16, of it held
  // in the rabbit's paws: "방아 위치가 좀 이상해.. 그냥 방아가 혼자서 위 아래로 움직이는걸로
  // 하자"); a scene lifts it (render/craftUnfold.js).
  const pestle = new TransformNode(`${name}PestleHolder`, scene);
  pestle.parent = root;
  pestle.position.set(0.1, FLOOR + 0.1, 0.05);
  ball(scene, `${name}PestleHead`, pestle, wood, 0.06, [0, 0.01, 0], [1, 1.5, 1]);
  rod(scene, `${name}Pestle`, pestle, wood, [0, 0.03, 0], [0, 0.22, 0], 0.025, 8);
  for (let k = 0; k < 3; k++) ball(scene, `${name}Cake${k}`, root, fur, 0.035, [0.2 + k * 0.045, FLOOR + 0.018, 0.2], [1, 0.5, 1]);
  root.metadata = { rabbit, pestle };
  return root;
}

// The Magpie Bridge (an old tale): magpies and crows wing to wing in an arch from the
// weaver's star to the herdsman's, faint lit so they show on the night sky. In its own
// units it spans x from -0.5 to 0.5, the two stars (render/craft.js sizes it).
const BIRDS = 33;
function magpieBridge(scene, name) {
  const root = new TransformNode(name, scene);
  const dark = light(scene, 'birdDark', '#33405c');
  const white = light(scene, 'birdWhite', '#eef3ff');
  const glow = light(scene, 'bridgeGlow', '#9fb8ff', 0.18);
  for (let k = 0; k < BIRDS; k++) {
    const u = k / (BIRDS - 1);
    const x = u - 0.5;
    const y = 0.07 * (1 - (2 * x) ** 2);
    const bird = new TransformNode(`${name}Bird${k}`, scene);
    bird.parent = root;
    bird.position.set(x, y + (k % 2 ? 0.006 : -0.006), 0);
    bird.rotation.z = -Math.atan(-0.28 * x) * 2;
    const magpie = k % 2 === 0;
    ball(scene, `${name}Body${k}`, bird, dark, 0.012, [0, 0, 0], [2.2, 0.8, 0.8]);
    if (magpie) ball(scene, `${name}Belly${k}`, bird, white, 0.008, [0.002, -0.002, 0.002], [1.6, 0.7, 0.7]);
    for (const side of [-1, 1]) {
      const wing = ball(scene, `${name}Wing${k}${side}`, bird, magpie ? white : dark, 0.016, [0, 0.004 * side, 0], [0.9, 0.18, 1.6]);
      wing.rotation.x = side * 0.6;
    }
    ball(scene, `${name}Halo${k}`, bird, glow, 0.05);
  }
  return root;
}

// A sperm whale and a bowl of petunias (a funny book), side by side in the dark.
function whale(scene, name) {
  const root = new TransformNode(name, scene);
  const skin = paint(scene, 'whaleSkin', '#5d6f86', { shine: 0.25, glow: 0.12 });
  const belly = paint(scene, 'whaleBelly', '#b9c4d0', { glow: 0.15 });
  const black = paint(scene, 'whaleEye', '#111418');
  // The body along -z (head) to +z (tail).
  const body = new TransformNode(`${name}Whale`, scene);
  body.parent = root;
  body.position.x = -0.18;
  ball(scene, `${name}Head`, body, skin, 0.24, [0, 0, -0.22], [1, 1.05, 1.7]);
  ball(scene, `${name}Trunk`, body, skin, 0.24, [0, -0.01, 0.05], [0.95, 0.95, 2]);
  ball(scene, `${name}Tailstock`, body, skin, 0.12, [0, 0.01, 0.33], [0.8, 0.9, 2.4]);
  ball(scene, `${name}Jaw`, body, belly, 0.06, [0, -0.1, -0.2], [0.8, 0.35, 4.2]);
  for (const side of [-1, 1]) {
    const fluke = ball(scene, `${name}Fluke${side}`, body, skin, 0.12, [side * 0.07, 0.02, 0.47], [1.2, 0.12, 0.6]);
    fluke.rotation.y = side * 0.5;
    const fin = ball(scene, `${name}Fin${side}`, body, skin, 0.07, [side * 0.12, -0.07, -0.08], [0.25, 0.12, 1]);
    fin.rotation.z = side * 0.6;
    ball(scene, `${name}Eye${side}`, body, black, 0.018, [side * 0.1, -0.02, -0.12]);
  }
  // The bowl, to its right.
  const pot = new TransformNode(`${name}Bowl`, scene);
  pot.parent = root;
  pot.position.set(0.32, -0.05, 0);
  drum(scene, `${name}Pot`, pot, paint(scene, 'potClay', '#b8613a'), { height: 0.12, diameterTop: 0.16, diameterBottom: 0.1, tessellation: 24 }, [0, 0, 0]);
  disc(scene, `${name}Soil`, pot, paint(scene, 'potSoil', '#4a3222'), 0.145, [0, 0.059, 0], 0.004);
  const leaf = paint(scene, 'petuniaLeaf', '#4e8a3e', { glow: 0.1 });
  const petals = [paint(scene, 'petuniaPurple', '#8e4cc8', { glow: 0.3 }), paint(scene, 'petuniaPink', '#e86aa8', { glow: 0.3 })];
  for (let k = 0; k < 10; k++) {
    const a = k * 2.4;
    const r = 0.025 + (k % 3) * 0.018;
    ball(scene, `${name}Leaf${k}`, pot, leaf, 0.035, [Math.cos(a) * r, 0.075, Math.sin(a) * r], [1, 0.4, 1]);
    ball(scene, `${name}Petunia${k}`, pot, petals[k % 2], 0.04, [Math.cos(a + 1) * r * 1.2, 0.1 + (k % 2) * 0.015, Math.sin(a + 1) * r * 1.2], [1, 0.55, 1]);
  }
  root.metadata = { body, pot };
  return root;
}

// A wheel of a station turning slowly round its hub (a film), and beside it a round
// hole where the light bends: a dark ball in a ring of light.
function ringStation(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const wheel = new TransformNode(`${name}Wheel`, scene);
  wheel.parent = root;
  wheel.position.x = -0.35;
  const hull = paint(scene, 'stationHull', '#d9dcdf', { shine: 0.5, glow: 0.1 });
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * 2 * Math.PI;
    box(scene, `${name}Pod${k}`, wheel, hull, [0.1, 0.07, 0.07], [Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0], [0, 0, a + Math.PI / 2]);
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * 2 * Math.PI + 0.4;
    rod(scene, `${name}Spoke${k}`, wheel, mats.grey, [0, 0, 0], [Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], 0.02, 6);
  }
  drum(scene, `${name}Hub`, wheel, hull, { height: 0.2, diameter: 0.09, tessellation: 16 }, [0, 0, 0], [0, 0, 1]);
  scene.onBeforeRenderObservable.add(() => {
    wheel.rotation.z = (performance.now() / 40000) * 2 * Math.PI;
  });
  const hole = new TransformNode(`${name}Hole`, scene);
  hole.parent = root;
  hole.position.x = 0.55;
  ball(scene, `${name}HoleCore`, hole, light(scene, 'holeCore', '#020308'), 0.5);
  ball(scene, `${name}HoleRim`, hole, light(scene, 'holeRim', '#b9d4ff', 0.22), 0.62);
  ball(scene, `${name}HoleHalo`, hole, light(scene, 'holeHalo', '#7fa3ff', 0.1), 0.85);
  drum(scene, `${name}HoleBand`, hole, light(scene, 'holeBand', '#fff1d0', 0.5), { height: 0.004, diameter: 0.7, tessellation: 48 }, [0, 0, 0], [0.15, 1, 0.25]);
  root.metadata = { wheel, hole };
  return root;
}

// A round house on Mars with potato shoots in rows inside it (a story), a rover beside it
// and a row of solar panels.
function potatoFarm(scene, name, mats) {
  const root = new TransformNode(name, scene);
  disc(scene, `${name}Ground`, root, paint(scene, 'farmGround', '#a5623a'), 1.5, [0, FLOOR - 0.005, 0]);
  disc(scene, `${name}Soil`, root, paint(scene, 'farmSoil', '#5a3b26'), 0.62, [0, FLOOR + 0.002, 0], 0.006);
  const shoot = paint(scene, 'potatoShoot', '#5aa047', { glow: 0.2 });
  const shoots = [];
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k < 7; k++) {
      const x = -0.21 + k * 0.07;
      const z = -0.16 + row * 0.08;
      if (Math.hypot(x, z) > 0.27) continue;
      shoots.push(ball(scene, `${name}Shoot${row}${k}`, root, shoot, 0.04, [x, FLOOR + 0.02, z], [1, 0.8, 1]));
    }
  }
  part(CreateSphere(`${name}Dome`, { diameter: 0.7, segments: 24, slice: 0.5 }, scene), root, paint(scene, 'farmDome', '#eef2f4', { shine: 0.6, glow: 0.15, alpha: 0.35 }), [0, FLOOR, 0], [0, 0, 0], [1, 0.75, 1]);
  box(scene, `${name}Door`, root, paint(scene, 'farmDoor', '#d8d8d8'), [0.1, 0.12, 0.08], [0.36, FLOOR + 0.06, 0]);
  // The rover, to the right.
  const rover = new TransformNode(`${name}Rover`, scene);
  rover.parent = root;
  rover.position.set(0.52, FLOOR, 0.25);
  box(scene, `${name}RoverBody`, rover, paint(scene, 'roverBody', '#e8e4dc'), [0.2, 0.07, 0.11], [0, 0.07, 0]);
  for (const x of [-0.07, 0, 0.07]) for (const z of [-0.065, 0.065]) drum(scene, `${name}Wheel${x}${z}`, rover, mats.dark, { height: 0.02, diameter: 0.05, tessellation: 12 }, [x, 0.025, z], [0, 0, 1]);
  // Solar panels, to the left.
  for (let k = 0; k < 3; k++) {
    const panel = box(scene, `${name}Panel${k}`, root, mats.solar ?? paint(scene, 'farmPanel', '#24346a'), [0.16, 0.008, 0.1], [-0.5, FLOOR + 0.05, -0.2 + k * 0.13]);
    panel.rotation.z = 0.35;
  }
  root.metadata = { shoots, rover };
  return root;
}

// Voyager's golden record (real): a disc of gold with the drawings on its cover: the
// fourteen pulsars' lines out from the Sun, the hydrogen atom's two rings, the way to play it.
function goldenRecord(scene, name) {
  const root = new TransformNode(name, scene);
  const map = new DynamicTexture('goldenRecordMap', { width: 512, height: 512 }, scene, true);
  const c = map.getContext();
  const grad = c.createRadialGradient(256, 256, 20, 256, 256, 256);
  grad.addColorStop(0, '#f6d67a');
  grad.addColorStop(1, '#b8892f');
  c.fillStyle = grad;
  c.fillRect(0, 0, 512, 512);
  c.strokeStyle = 'rgba(90, 60, 10, 0.35)';
  for (let r = 70; r < 250; r += 7) {
    c.beginPath();
    c.arc(256, 256, r, 0, 2 * Math.PI);
    c.stroke();
  }
  c.strokeStyle = 'rgba(60, 40, 5, 0.9)';
  c.lineWidth = 2;
  // The pulsar map, lower left.
  const [px, py] = [170, 330];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * 2 * Math.PI + 0.3;
    const len = 30 + ((k * 37) % 50);
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    c.stroke();
  }
  // Hydrogen's two states, lower right; the record and its stylus, upper left.
  for (const x of [330, 370]) {
    c.beginPath();
    c.arc(x, 360, 10, 0, 2 * Math.PI);
    c.stroke();
  }
  c.beginPath();
  c.arc(170, 170, 34, 0, 2 * Math.PI);
  c.stroke();
  c.beginPath();
  c.moveTo(150, 120);
  c.lineTo(205, 170);
  c.stroke();
  c.fillStyle = '#8a6420';
  c.beginPath();
  c.arc(256, 256, 22, 0, 2 * Math.PI);
  c.fill();
  map.update();
  const gold = new StandardMaterial('goldenRecordFace', scene);
  gold.diffuseTexture = map;
  gold.emissiveTexture = map;
  gold.emissiveColor = new Color3(0.35, 0.3, 0.2);
  gold.specularColor = new Color3(0.8, 0.7, 0.4);
  gold.specularPower = 40;
  // A flat drum, its faces along z (the craft's way: +z toward the Sun).
  const face = drum(scene, `${name}Disc`, root, gold, { height: 0.03, diameter: 0.9, tessellation: 64 }, [0, 0, 0], [0, 0, 1]);
  face.rotation.y = Math.PI / 2;
  root.metadata = { face };
  return root;
}

// A little robot on Pluto's plain (a cartoon), squashing rubbish into cubes and stacking
// them into a tower: a box on two treads, a neck and two round eyes.
function robot(scene, name, mats) {
  const root = new TransformNode(name, scene);
  disc(scene, `${name}Ground`, root, paint(scene, 'robotGround', '#d9c7b0'), 1.3, [0, FLOOR - 0.005, 0]);
  const rust = paint(scene, 'robotRust', '#c9952e', { shine: 0.2, glow: 0.08 });
  const tread = paint(scene, 'robotTread', '#3a3836');
  const lens = paint(scene, 'robotLens', '#0e1820', { shine: 0.9, glow: 0.05 });
  const bot = new TransformNode(`${name}Bot`, scene);
  bot.parent = root;
  bot.position.set(-0.12, FLOOR, 0.05);
  for (const z of [-0.08, 0.08]) box(scene, `${name}Tread${z}`, bot, tread, [0.2, 0.07, 0.05], [0, 0.035, z]);
  box(scene, `${name}Box`, bot, rust, [0.15, 0.14, 0.14], [0, 0.14, 0]);
  rod(scene, `${name}Neck`, bot, mats.grey, [0, 0.21, 0], [-0.01, 0.29, 0], 0.025, 6);
  for (const z of [-0.035, 0.035]) {
    drum(scene, `${name}Eye${z}`, bot, mats.grey, { height: 0.07, diameter: 0.055, tessellation: 16 }, [-0.02, 0.31, z], [-1, 0, 0]);
    disc(scene, `${name}Lens${z}`, bot, lens, 0.04, [-0.056, 0.31, z], 0.004).rotation.z = Math.PI / 2;
  }
  for (const z of [-0.09, 0.09]) rod(scene, `${name}Arm${z}`, bot, mats.grey, [0, 0.15, z], [-0.12, 0.12, z * 1.1], 0.02, 6);
  // The tower of cubes, to the right.
  const shades = ['#7a6f63', '#8c7a5c', '#6c6a66', '#9a8566', '#77706a', '#857767', '#6f6559'];
  const cubes = [];
  for (let k = 0; k < 7; k++) {
    const sizeK = 0.09 - k * 0.004;
    cubes[k] = box(scene, `${name}Cube${k}`, root, paint(scene, `rubbish${k}`, shades[k]), [sizeK, sizeK, sizeK], [0.25 + (k % 2 ? 0.008 : -0.006), FLOOR + 0.045 + k * 0.088, 0.02], [0, k * 0.4, 0]);
  }
  const waiting = box(scene, `${name}Waiting`, root, paint(scene, 'rubbishNew', '#8f8473'), [0.08, 0.08, 0.08], [0.04, FLOOR + 0.04, 0.12], [0, 0.3, 0]);
  root.metadata = { bot, cubes, waiting };
  return root;
}

// The slab on the Moon is the slab by Jupiter, standing on the ground.
export const CURIO_BUILD = { monolith, unknown, teapot, rose, moonSlab: monolith, moonRabbit, magpieBridge, whale, ringStation, potatoFarm, goldenRecord, robot };
