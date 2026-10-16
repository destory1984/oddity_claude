import { TransformNode, CreateSphere, DynamicTexture, StandardMaterial, Color3 } from './babylon.js';
import { part, box, rod, nozzle, fuse } from './craftParts.js';

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

export const CURIO_BUILD = { monolith, unknown };
