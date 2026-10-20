import { TransformNode, CreateSphere, CreatePlane, DynamicTexture, Texture, StandardMaterial, Color3 } from './babylon.js';
import { part, box, drum, rod, fuse } from './craftParts.js';
import { HUYGENS } from '../core/landmarkStages.js';
import { seeded } from '../core/seeded.js';

// Syrtis Major's scene (core/landmarkStages.js 'huygens'): a night in 1659, Christiaan
// Huygens at his long telescope, what he sees in it drawn large in the middle (Mars
// turning, its dark wedge going round and coming back), and his drawing (the real one) laid on a table each time.
// The user (2026-10-18) had the old scene, the photo alone, made again ("애니 다시
// 만들어"): of three ways they chose this one, and of three looks side by side, "C".
// Built of shapes and canvas paint and his own drawing, no ordered drawings. A stage's +z is away from the
// one who watches, x to the side, y up; a phone's view ends about 1.45 to either side.

// A colour lit by the scene's light, with some of its own so the night does not swallow it.
function paint(scene, name, hex, own = 0.3) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  m.emissiveColor = Color3.FromHexString(hex).scale(own);
  return m;
}
// A flat card painted on a canvas and lit by nothing.
function card(scene, name, [width, height], [w, h], draw) {
  const texture = new DynamicTexture(`${name}Texture`, { width: w, height: h }, scene, true);
  texture.hasAlpha = true;
  draw(texture.getContext(), w, h);
  texture.update();
  const m = new StandardMaterial(`${name}Material`, scene);
  m.disableLighting = true;
  m.emissiveTexture = texture;
  m.opacityTexture = texture;
  m.diffuseColor = new Color3(0, 0, 0);
  m.specularColor = new Color3(0, 0, 0);
  m.backFaceCulling = false;
  const plane = CreatePlane(name, { width, height }, scene);
  plane.material = m;
  plane.isPickable = false;
  return plane;
}

// The dark wedge of Syrtis Major as he drew it: wide to the north, a point to the south.
function wedge(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy - r * 0.35);
  ctx.quadraticCurveTo(cx, cy - r * 0.5, cx + r * 0.38, cy - r * 0.32);
  ctx.quadraticCurveTo(cx + r * 0.12, cy, cx + r * 0.02, cy + r * 0.45);
  ctx.quadraticCurveTo(cx - r * 0.12, cy, cx - r * 0.42, cy - r * 0.35);
  ctx.fill();
}
// Mars's face, all the way round (u = 0.25 is Syrtis: on a Babylon ball that is the side
// toward -z, the one who watches, when it is not turned): ochre, a few soft dark lands,
// the wedge, white caps.
function marsMap(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#d98a55');
  g.addColorStop(0.5, '#e09a62');
  g.addColorStop(1, '#c8774a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(90,45,28,0.45)';
  for (const [u, v, rx, ry] of [[0.55, 0.62, 0.07, 0.06], [0.72, 0.42, 0.05, 0.08], [0.88, 0.58, 0.06, 0.05], [0.05, 0.38, 0.04, 0.05]]) {
    ctx.beginPath();
    ctx.ellipse(u * w, v * h, rx * w, ry * h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#4a2416';
  // (The ball shows the canvas upside down: the wedge is drawn so, its point up.)
  ctx.save();
  ctx.translate(w * 0.25, h * 0.5);
  ctx.scale(1, -1);
  wedge(ctx, 0, 0, h * 0.42);
  ctx.restore();
  ctx.fillStyle = '#f6f2ea';
  ctx.fillRect(0, 0, w, h * 0.18);
  ctx.fillRect(0, h * 0.88, w, h * 0.12);
}
// A night sky behind, deep blue with its stars.
function stars(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#050a1c');
  g.addColorStop(1, '#16244a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const next = seeded(7);
  for (let i = 0; i < 220; i += 1) {
    ctx.fillStyle = `rgba(255,255,240,${0.3 + next() * 0.7})`;
    const r = next() < 0.08 ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.arc(next() * w, next() * h * 0.9, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Huygens, 0.56 tall, feet at y = 0, facing -x (his telescope): a black coat, the wide
// flat white collar of the day, long brown hair to the shoulders.
function huygens(scene, name, parent) {
  const root = new TransformNode(name, scene);
  root.parent = parent;
  const coat = paint(scene, `${name}Coat`, '#23222b');
  const skin = paint(scene, `${name}Skin`, '#e7c3a2', 0.35);
  const hair = paint(scene, `${name}Hair`, '#5a3a22');
  const white = paint(scene, `${name}White`, '#f2f0ea', 0.4);
  const brass = paint(scene, `${name}Brass`, '#c9a25a', 0.35);
  const dark = paint(scene, `${name}Dark`, '#2e2e36');
  const ball = (m, d, at, s = [1, 1, 1]) => part(CreateSphere(`${name}Ball`, { diameter: d, segments: 14 }, scene), root, m, at, [0, 0, 0], s);
  for (const z of [-0.03, 0.03]) {
    box(scene, `${name}Leg`, root, dark, [0.03, 0.15, 0.03], [0, 0.075, z]);
    box(scene, `${name}Shoe`, root, dark, [0.06, 0.02, 0.034], [-0.011, 0.01, z]);
  }
  drum(scene, `${name}CoatBody`, root, coat, { height: 0.27, diameterTop: 0.13, diameterBottom: 0.2 }, [0, 0.285, 0]);
  for (let k = 0; k < 4; k += 1) ball(brass, 0.011, [-0.068 + k * 0.0045, 0.37 - k * 0.052, 0]);
  drum(scene, `${name}Collar`, root, white, { height: 0.015, diameterTop: 0.075, diameterBottom: 0.165 }, [0, 0.427, 0]);
  ball(hair, 0.112, [0.015, 0.517, 0], [1, 0.9, 1.05]);
  for (const z of [-0.052, 0.052]) ball(hair, 0.06, [0.015, 0.45, z], [0.9, 1.6, 0.8]);
  ball(skin, 0.075, [-0.019, 0.491, 0], [0.8, 0.95, 0.8]);
  rod(scene, `${name}ArmUp`, root, coat, [0, 0.39, -0.06], [-0.1, 0.495, -0.04], 0.038, 6);
  rod(scene, `${name}ArmDown`, root, coat, [0, 0.39, 0.06], [-0.04, 0.27, 0.09], 0.038, 6);
  ball(skin, 0.026, [-0.045, 0.255, 0.09]);
  return root;
}
// His long tube on a wooden post, the eyepiece at `eye`, rising toward -x.
function telescope(scene, name, parent, eye, length, lift) {
  const wood = paint(scene, `${name}Wood`, '#6b4a2c');
  const tube = paint(scene, `${name}Tube`, '#7b6040');
  const brass = paint(scene, `${name}Brass`, '#c9a25a', 0.35);
  const dir = [-Math.cos(lift), Math.sin(lift), 0];
  const at = (f) => eye.map((n, i) => n + dir[i] * length * f);
  rod(scene, `${name}Tube`, parent, tube, eye, at(1), 0.052, 12);
  for (const f of [0, 0.33, 0.66, 1]) {
    const p = at(f);
    rod(scene, `${name}Ring`, parent, brass, p.map((n, i) => n - dir[i] * 0.008), p.map((n, i) => n + dir[i] * 0.008), 0.064, 12);
  }
  const mid = at(0.45);
  rod(scene, `${name}Post`, parent, wood, [mid[0], 0, 0], [mid[0], mid[1] - 0.03, 0], 0.038, 6);
  for (const s of [-1, 1]) rod(scene, `${name}Foot`, parent, wood, [mid[0], 0.15, 0], [mid[0] + s * 0.075, 0, s * 0.09], 0.022, 5);
}

// The pieces: the room (sky, floor, table and candle, telescope, Huygens), the eyepiece's
// field, the turning globe in it, the drawings that are laid on the table one by one.
export function huygensPieces(scene, name) {
  const room = new TransformNode(`${name}Room`, scene);
  const sky = card(scene, `${name}Sky`, [6, 4], [512, 340], stars);
  sky.parent = room;
  sky.position.set(0, 1.2, 1.3);
  const floor = paint(scene, `${name}Floor`, '#4a3220', 0.35);
  const seam = paint(scene, `${name}Seam`, '#2c1d12', 0.3);
  // (The boards go on far toward the eye, which looks down on them: shorter, the game's
  // own ground showed in front of them.)
  box(scene, `${name}Boards`, room, floor, [6, 0.02, 6], [0, -0.01, -1.7]);
  for (let k = -12; k <= 12; k += 1) box(scene, `${name}Seam${k}`, room, seam, [0.01, 0.022, 6], [k * 0.25, -0.005, -1.7]);
  const wood = paint(scene, `${name}Table`, '#5b3d24');
  const { x, top } = HUYGENS.table;
  box(scene, `${name}Top`, room, wood, [0.42, 0.03, 0.3], [x, top, 0.1]);
  for (const dx of [-0.18, 0.18]) for (const dz of [-0.12, 0.12]) box(scene, `${name}TableLeg`, room, wood, [0.03, top, 0.03], [x + dx, top / 2, 0.1 + dz]);
  drum(scene, `${name}Candle`, room, paint(scene, `${name}Wax`, '#efe6d0', 0.6), { height: 0.1, diameter: 0.03 }, [x - 0.17, top + 0.065, 0.0]);
  telescope(scene, `${name}Scope`, room, [0.68, 0.49, 0], 0.9, 0.6);
  const man = huygens(scene, `${name}Huygens`, room);
  man.position.set(0.75, 0, 0);
  fuse(scene, room);
  // The flame is light itself, kept out of the fused room so it can flicker.
  const flame = new TransformNode(`${name}Flame`, scene);
  part(CreateSphere(`${name}FlameBall`, { diameter: 0.035, segments: 10 }, scene), flame, paint(scene, `${name}FlameLight`, '#ffcf6a', 1.4), [0, 0, 0], [0, 0, 0], [0.7, 1.3, 0.7]);

  const view = new TransformNode(`${name}View`, scene);
  const field = card(scene, `${name}Field`, [1, 1], [256, 256], (ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a25a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
  });
  field.parent = view;

  // Mars itself, a ball with its map, lit by nothing (it is seen through the tube).
  const globe = new TransformNode(`${name}Globe`, scene);
  const map = new DynamicTexture(`${name}MarsMap`, { width: 512, height: 256 }, scene, true);
  marsMap(map.getContext(), 512, 256);
  map.update();
  const face = new StandardMaterial(`${name}MarsFace`, scene);
  face.disableLighting = true;
  face.emissiveTexture = map;
  face.diffuseColor = new Color3(0, 0, 0);
  face.specularColor = new Color3(0, 0, 0);
  part(CreateSphere(`${name}MarsBall`, { diameter: 1, segments: 32 }, scene), globe, face);

  const pieces = { room, flame, view, globe };
  // His own drawing of that night (south up, as the telescope showed it), from Lowell's
  // "Mars" (1894): public/assets/replay/huygens-1659.jpg, THIRD-PARTY.md. The user
  // (2026-10-18) asked why the drawing was not the real one; it is now.
  const drawing = new StandardMaterial(`${name}Drawing`, scene);
  drawing.disableLighting = true;
  drawing.emissiveTexture = new Texture(`${import.meta.env.BASE_URL}assets/replay/huygens-1659.jpg`, scene, true, true);
  drawing.diffuseColor = new Color3(0, 0, 0);
  drawing.specularColor = new Color3(0, 0, 0);
  drawing.backFaceCulling = false;
  for (let k = 0; k < HUYGENS.sheets; k += 1) {
    const sheet = new TransformNode(`${name}Sheet${k}`, scene);
    const paper = CreatePlane(`${name}Paper${k}`, { width: 0.26, height: 0.294 }, scene);
    paper.material = drawing;
    paper.isPickable = false;
    paper.parent = sheet;
    // Standing on the table, leant back a little, each a little askew; its foot at the
    // sheet's own y = 0. (Lying flat, the drawing was a pale strip too small to make out.)
    paper.position.y = 0.147;
    paper.rotation.set(0.15, 0, [0.06, -0.05, 0.02][k]);
    pieces[`sheet${k}`] = sheet;
  }
  return pieces;
}
