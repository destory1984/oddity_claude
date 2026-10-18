import { TransformNode, CreateSphere, StandardMaterial, Color3 } from './babylon.js';
import { part, drum, rod, fuse } from './craftParts.js';

// The three dinosaurs of Chicxulub's "그날로" (core/landmarkStages.js DINOS places them):
// a tyrannosaur, a long-neck and a triceratops (the user, 2026-10-18, of three stagings
// "A", three on a rise, then of two looks the round one "A"). Each faces +x with its feet
// on y = 0, about 0.5 tall (the long-neck about 1), in two pieces: the body, and the head
// with its neck, whose own origin is the joint (DINO_NECK) so that the stage can raise
// it as they look up at the stone coming down.
const mat = (scene, name, hex, shine = 0.08) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(shine, shine, shine);
  return m;
};
const blob = (scene, name, parent, m, size, at, rot = [0, 0, 0]) => part(CreateSphere(name, { diameter: 1, segments: 16 }, scene), parent, m, at, rot, size);
// A tapering tube from one point to another.
const cone = (scene, name, parent, m, from, to, d0, d1) => {
  const dir = to.map((n, i) => n - from[i]);
  const len = Math.hypot(...dir);
  const mid = from.map((n, i) => n + dir[i] / 2);
  return drum(scene, name, parent, m, { height: len, diameterBottom: d0, diameterTop: d1, tessellation: 16 }, mid, dir.map((n) => n / len));
};
const pieces = (scene, name) => [new TransformNode(`${name}Body`, scene), new TransformNode(`${name}Head`, scene)];

function trex(scene, name) {
  const [body, head] = pieces(scene, name);
  const skin = mat(scene, `${name}Skin`, '#6f7a4a');
  const belly = mat(scene, `${name}Belly`, '#b9b48a');
  const dark = mat(scene, `${name}Dark`, '#1d1a14', 0.4);
  blob(scene, `${name}Trunk`, body, skin, [0.38, 0.2, 0.2], [0, 0.34, 0], [0, 0, 0.15]);
  blob(scene, `${name}Under`, body, belly, [0.3, 0.13, 0.16], [0.02, 0.3, 0], [0, 0, 0.15]);
  cone(scene, `${name}Tail`, body, skin, [-0.14, 0.31, 0], [-0.42, 0.25, 0], 0.17, 0.025);
  for (const z of [-1, 1]) {
    blob(scene, `${name}Thigh${z}`, body, skin, [0.13, 0.17, 0.07], [-0.01, 0.24, z * 0.085]);
    rod(scene, `${name}Shin${z}`, body, skin, [0, 0.17, z * 0.085], [0.03, 0.03, z * 0.085], 0.045);
    blob(scene, `${name}Foot${z}`, body, skin, [0.09, 0.035, 0.05], [0.05, 0.018, z * 0.085]);
    rod(scene, `${name}Arm${z}`, body, skin, [0.13, 0.33, z * 0.06], [0.18, 0.28, z * 0.07], 0.022);
  }
  blob(scene, `${name}NeckBall`, head, skin, [0.12, 0.14, 0.12], [0.02, 0.03, 0]);
  blob(scene, `${name}Skull`, head, skin, [0.25, 0.13, 0.13], [0.13, 0.08, 0], [0, 0, -0.1]);
  blob(scene, `${name}Jaw`, head, belly, [0.2, 0.06, 0.1], [0.13, 0.03, 0]);
  for (const z of [-1, 1]) blob(scene, `${name}Eye${z}`, head, dark, [0.022, 0.022, 0.012], [0.15, 0.12, z * 0.06]);
  return { body: fuse(scene, body), head: fuse(scene, head) };
}

function longNeck(scene, name) {
  const [body, head] = pieces(scene, name);
  const skin = mat(scene, `${name}Skin`, '#7d8f6a');
  const belly = mat(scene, `${name}Belly`, '#b7bf9a');
  const dark = mat(scene, `${name}Dark`, '#1d1a14', 0.4);
  blob(scene, `${name}Trunk`, body, skin, [0.5, 0.27, 0.27], [0, 0.42, 0]);
  blob(scene, `${name}Under`, body, belly, [0.42, 0.16, 0.22], [0, 0.36, 0]);
  for (const [x, z] of [[0.15, -1], [0.15, 1], [-0.15, -1], [-0.15, 1]]) {
    cone(scene, `${name}Leg${x}${z}`, body, skin, [x, 0.38, z * 0.08], [x, 0.02, z * 0.08], 0.13, 0.09);
    blob(scene, `${name}Foot${x}${z}`, body, skin, [0.11, 0.04, 0.11], [x + 0.01, 0.02, z * 0.08]);
  }
  cone(scene, `${name}Tail`, body, skin, [-0.22, 0.44, 0], [-0.8, 0.3, 0], 0.15, 0.015);
  cone(scene, `${name}Neck`, head, skin, [0, 0, 0], [0.24, 0.42, 0], 0.13, 0.06);
  blob(scene, `${name}Skull`, head, skin, [0.12, 0.065, 0.07], [0.28, 0.43, 0]);
  for (const z of [-1, 1]) blob(scene, `${name}Eye${z}`, head, dark, [0.016, 0.016, 0.01], [0.29, 0.45, z * 0.032]);
  return { body: fuse(scene, body), head: fuse(scene, head) };
}

function triceratops(scene, name) {
  const [body, head] = pieces(scene, name);
  const skin = mat(scene, `${name}Skin`, '#a8754a');
  const frill = mat(scene, `${name}Frill`, '#c98f5a');
  const horn = mat(scene, `${name}Horn`, '#efe4c8', 0.2);
  const dark = mat(scene, `${name}Dark`, '#1d1a14', 0.4);
  blob(scene, `${name}Trunk`, body, skin, [0.44, 0.25, 0.26], [0, 0.27, 0]);
  for (const [x, z] of [[0.13, -1], [0.13, 1], [-0.13, -1], [-0.13, 1]]) {
    cone(scene, `${name}Leg${x}${z}`, body, skin, [x, 0.24, z * 0.085], [x, 0.02, z * 0.085], 0.11, 0.075);
    blob(scene, `${name}Foot${x}${z}`, body, skin, [0.09, 0.035, 0.09], [x + 0.01, 0.018, z * 0.085]);
  }
  cone(scene, `${name}Tail`, body, skin, [-0.2, 0.27, 0], [-0.42, 0.17, 0], 0.11, 0.015);
  blob(scene, `${name}Skull`, head, skin, [0.18, 0.14, 0.15], [0.08, -0.01, 0]);
  blob(scene, `${name}Beak`, head, skin, [0.09, 0.07, 0.08], [0.17, -0.04, 0]);
  blob(scene, `${name}Shield`, head, frill, [0.035, 0.25, 0.3], [-0.035, 0.09, 0], [0, 0, 0.45]);
  cone(scene, `${name}NoseHorn`, head, horn, [0.18, 0, 0], [0.22, 0.06, 0], 0.03, 0.002);
  for (const z of [-1, 1]) {
    cone(scene, `${name}BrowHorn${z}`, head, horn, [0.1, 0.05, z * 0.04], [0.22, 0.13, z * 0.05], 0.03, 0.002);
    blob(scene, `${name}Eye${z}`, head, dark, [0.018, 0.018, 0.01], [0.11, 0.02, z * 0.07]);
  }
  return { body: fuse(scene, body), head: fuse(scene, head) };
}

// The rise of grass under them: a low mound about 1.6 across (the stage's units).
export function dinoGround(scene, name) {
  const root = new TransformNode(name, scene);
  blob(scene, `${name}Grass`, root, mat(scene, `${name}GrassSkin`, '#55693a', 0.02), [1.7, 0.12, 1.1], [0, -0.03, 0]);
  blob(scene, `${name}Earth`, root, mat(scene, `${name}EarthSkin`, '#6b5a40', 0.02), [1.6, 0.1, 1.0], [0, -0.06, 0]);
  return fuse(scene, root);
}

export const DINO_BUILD = { trex, longNeck, triceratops };
