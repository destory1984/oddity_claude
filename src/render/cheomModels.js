import {
  TransformNode, CreateBox, CreateCylinder, CreatePlane, CreateSphere, DynamicTexture, Color3, Color4, Constants, Mesh, VertexData,
} from './babylon.js';
import { fuse } from './craftParts.js';
import { lit, glowing, spotTexture } from './hengeModels.js';
import { CHEOM, cheomCourse } from '../core/landmarkStages.js';

// Cheomseongdae on a clear night in Queen Seondeok's time (core/landmarkStages.js
// 'starNight' says where and when): the tower of 27 courses of granite on its platform,
// the 井 frame on top, a lamp in the window, the grass and low hills, and a sky of stars
// that wheels round the north star, all built here with no drawing (the user,
// 2026-10-13: no more stages of ordered pictures). Lit by its own colours, as Stonehenge
// is (render/hengeModels.js): the game's Sun may be anywhere when it is played.

// Pale granite, a little unlike from course to course; the moonless night dims it.
const GRANITE = [0.36, 0.35, 0.34];
function towerPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const stone = lit(scene, `${name}Stone`);
  stone.emissiveColor = new Color3(...GRANITE);
  let seed = 9;
  const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const shade = (f) => {
    const n = (0.88 + 0.2 * next()) * f;
    return new Color4(n, n * 0.98, n * 0.94, 1);
  };
  const block = (meshName, size, at, f = 1) => {
    const faceColors = [0.8, 0.8, 0.68, 0.68, 1, 0.45].map((k) => shade(k * f));
    const mesh = CreateBox(meshName, { width: size[0], height: size[1], depth: size[2], faceColors }, scene);
    mesh.parent = root;
    mesh.material = stone;
    mesh.position.set(...at);
    mesh.isPickable = false;
    return mesh;
  };
  // The platform: two square tiers.
  block(`${name}Tier0`, [0.4, 0.035, 0.4], [0, 0.0175, 0], 0.9);
  block(`${name}Tier1`, [0.34, 0.035, 0.34], [0, 0.0525, 0], 0.95);
  // The courses: each a ring of 18 faces (blocks), each turned half a block from the
  // last so the joints are staggered, each a little wider or narrower than its curve.
  const { courses, window: hole } = CHEOM;
  for (let k = 0; k < courses; k += 1) {
    const { r, y, h } = cheomCourse(k);
    const side = shade(0.82);
    const course = CreateCylinder(`${name}Course${k}`, {
      height: h * 0.96, diameter: 2 * r * (1 + (next() - 0.5) * 0.03), tessellation: 18,
      faceColors: [shade(0.5), side, shade(1)],
    }, scene);
    course.parent = root;
    course.material = stone;
    course.position.set((next() - 0.5) * 0.003, y + h / 2, (next() - 0.5) * 0.003);
    course.rotation.y = (k % 2) * (Math.PI / 18);
    course.isPickable = false;
  }
  // The window: a dark square opening on the south face (toward the eye, -z), a sill
  // stone under it, and the lamp's light inside (below).
  const bottom = cheomCourse(hole.from).y;
  const top = cheomCourse(hole.to).y;
  const front = -cheomCourse(Math.round((hole.from + hole.to) / 2)).r;
  const dark = lit(scene, `${name}Dark`);
  dark.emissiveColor = new Color3(0.02, 0.015, 0.01);
  const opening = CreateBox(`${name}Opening`, { width: hole.width, height: top - bottom, depth: 0.04 }, scene);
  opening.parent = root;
  opening.material = dark;
  opening.position.set(0, (bottom + top) / 2, front + 0.012);
  opening.isPickable = false;
  // The frame on top, two layers of two long stones each, crossing as 井.
  const crown = cheomCourse(courses - 1);
  const over = crown.y + crown.h;
  const reach = crown.r * 2 + 0.07;
  for (const s of [-1, 1]) block(`${name}Frame0${s}`, [reach, 0.03, 0.03], [0, over + 0.015, s * crown.r * 0.72], 1.05);
  for (const s of [-1, 1]) block(`${name}Frame1${s}`, [0.03, 0.03, reach], [s * crown.r * 0.72, over + 0.045, 0], 1.1);
  fuse(scene, root);
  // The lamp: a warm square in the opening and a soft glow round it, flickering.
  const flame = CreatePlane(`${name}Lamp`, { width: hole.width * 0.8, height: (top - bottom) * 0.8 }, scene);
  flame.parent = root;
  flame.position.set(0, (bottom + top) / 2, front - 0.01);
  const lampTex = new DynamicTexture(`${name}LampLight`, { width: 64, height: 64 }, scene, true);
  const ctx = lampTex.getContext();
  const g = ctx.createRadialGradient(32, 44, 2, 32, 40, 40);
  g.addColorStop(0, 'rgba(255,236,170,1)');
  g.addColorStop(0.5, 'rgba(255,170,80,0.85)');
  g.addColorStop(1, 'rgba(160,70,20,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  lampTex.update();
  lampTex.hasAlpha = true;
  const lamp = glowing(scene, `${name}LampShine`, lampTex);
  flame.material = lamp;
  flame.isPickable = false;
  const halo = CreatePlane(`${name}Halo`, { size: 0.42 }, scene);
  halo.parent = root;
  halo.position.set(0, (bottom + top) / 2, front - 0.03);
  const haloLight = glowing(scene, `${name}HaloLight`, spotTexture(scene, `${name}HaloSpot`, [[0, 'rgba(255,200,120,0.55)'], [0.3, 'rgba(255,160,80,0.18)'], [1, 'rgba(255,140,60,0)']]));
  halo.material = haloLight;
  halo.isPickable = false;
  root.metadata = {
    pose: ({ lamp: on = 1 }) => {
      lamp.alpha = on;
      haloLight.alpha = on;
    },
  };
  return root;
}

// The ground and the night round it: dark grass to low hills, and the sky behind them,
// deep blue going to black overhead.
function nightPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const grass = lit(scene, `${name}Grass`);
  grass.emissiveColor = new Color3(0.035, 0.055, 0.05);
  grass.backFaceCulling = false;
  const field = CreatePlane(`${name}Field`, { width: 10, height: 5.6 }, scene);
  field.parent = root;
  field.material = grass;
  field.rotation.x = Math.PI / 2;
  field.position.set(0, 0, 0.4);
  field.isPickable = false;
  const hill = lit(scene, `${name}Hill`);
  hill.emissiveColor = new Color3(0.025, 0.035, 0.05);
  for (const [x, z, w, h] of [[-2.6, 2.7, 2.6, 0.5], [-0.7, 2.85, 2.2, 0.32], [1.3, 2.75, 2.8, 0.42], [3.4, 2.6, 2.4, 0.55]]) {
    const mound = CreateSphere(`${name}Hill${x}`, { diameter: 1, segments: 12 }, scene);
    mound.parent = root;
    mound.material = hill;
    mound.scaling.set(w, h * 2, 0.6);
    mound.position.set(x, 0, z);
    mound.isPickable = false;
  }
  // The sky: a wall behind the hills, its colour on a few rows of points.
  const W = 12;
  const H = 4.5;
  const positions = [];
  const colors = [];
  const indices = [];
  const rows = 6;
  const low = [0.04, 0.07, 0.17];
  const high = [0.005, 0.01, 0.035];
  for (let j = 0; j <= rows; j += 1) {
    const u = j / rows;
    for (const x of [-W / 2, W / 2]) {
      positions.push(x, H * u ** 1.5, 0);
      colors.push(...low.map((n, i) => n + (high[i] - n) * Math.min(1, u * 1.6)), 1);
    }
  }
  for (let j = 0; j < rows; j += 1) indices.push(2 * j, 2 * j + 2, 2 * j + 1, 2 * j + 1, 2 * j + 2, 2 * j + 3);
  const wall = new Mesh(`${name}Wall`, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.colors = colors;
  data.applyToMesh(wall);
  const paint = lit(scene, `${name}Paint`);
  paint.emissiveColor = new Color3(1, 1, 1);
  paint.backFaceCulling = false;
  wall.material = paint;
  wall.parent = root;
  wall.position.z = CHEOM.pole.z + 0.1;
  wall.isPickable = false;
  return root;
}

// The stars, on a disc centred on the north star that the scene turns; behind the stars
// a few fainter copies of the disc, turned back a little each, so that every star draws
// a trail as the sky goes round. The Milky Way is a faint band across the disc.
const TRAILS = 7;
function starsPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const size = 1024;
  const tex = new DynamicTexture(`${name}Field`, { width: size, height: size }, scene, true);
  const ctx = tex.getContext();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  // The Milky Way: a soft pale band, a little patchy.
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-0.9);
  let seed = 21;
  const next = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i += 1) {
    const x = (next() - 0.5) * size;
    const y = 150 + (next() - 0.5) * 90;
    const r = 30 + 60 * next();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(150,160,200,0.07)');
    g.addColorStop(1, 'rgba(150,160,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
  // The north star in the middle, and the rest.
  ctx.fillStyle = '#fff';
  ctx.fillRect(size / 2 - 2, size / 2 - 2, 4, 4);
  for (let i = 0; i < 520; i += 1) {
    const x = Math.floor(next() * size);
    const y = Math.floor(next() * size);
    const bright = next();
    ctx.fillStyle = `rgba(${220 + Math.floor(35 * next())},${225 + Math.floor(30 * next())},255,${0.35 + 0.65 * bright})`;
    const s = bright > 0.93 ? 3 : bright > 0.6 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
  tex.update();
  const sheets = [];
  for (let k = 0; k <= TRAILS; k += 1) {
    const light = lit(scene, `${name}Light${k}`);
    light.emissiveTexture = tex;
    light.alphaMode = Constants.ALPHA_ADD;
    light.disableDepthWrite = true;
    light.backFaceCulling = false;
    const sheet = CreatePlane(`${name}Sheet${k}`, { size: 7 }, scene);
    sheet.parent = root;
    sheet.material = light;
    sheet.position.z = 0.002 * k;
    sheet.isPickable = false;
    sheets.push({ sheet, light });
  }
  root.metadata = {
    pose: ({ wheel = 0, trail = 0, fade = 1 }) => {
      // (The disc turns in its own plane, about z; a piece's `turn` is about the upright.)
      sheets.forEach(({ sheet, light }, k) => {
        sheet.rotation.z = wheel - (trail * k) / TRAILS;
        light.alpha = fade * (k === 0 ? 1 : 0.42 * (1 - k / (TRAILS + 1)));
        sheet.setEnabled(k === 0 || trail > 0.01);
      });
    },
  };
  return root;
}

// A shooting star: a short bright streak with a tail, flying down to the left.
function meteorPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const tex = new DynamicTexture(`${name}Streak`, { width: 256, height: 16 }, scene, true);
  const ctx = tex.getContext();
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15, 'rgba(210,225,255,0.7)');
  g.addColorStop(1, 'rgba(160,190,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 6, 256, 4);
  tex.update();
  tex.hasAlpha = true;
  const light = glowing(scene, `${name}Light`, tex);
  const streak = CreatePlane(`${name}Plane`, { width: 0.6, height: 0.04 }, scene);
  streak.parent = root;
  streak.material = light;
  // Its head at the piece's origin, the tail up and to the right (where it came from).
  streak.position.x = 0.3;
  streak.rotation.z = Math.atan2(0.45, 1.3);
  streak.isPickable = false;
  root.metadata = { pose: ({ fade = 1 }) => { light.alpha = fade; } };
  return root;
}

// The pieces of the scene, as render/siteModels.js landmarkPieces wants them.
export function cheomPieces(scene, name) {
  return {
    night: nightPiece(scene, `${name}Night`),
    stars: starsPiece(scene, `${name}Stars`),
    tower: towerPiece(scene, `${name}Tower`),
    meteor: meteorPiece(scene, `${name}Meteor`),
  };
}
