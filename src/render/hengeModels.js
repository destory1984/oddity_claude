import {
  TransformNode, CreateBox, CreatePlane, CreateLathe, DynamicTexture, StandardMaterial, Color3, Color4, Constants, Mesh, VertexData, Vector3,
} from './babylon.js';
import { fuse } from './craftParts.js';
import { seeded } from '../core/seeded.js';
import { HENGE, HENGE_SUN, hengeStones, hengeLintels } from '../core/landmarkStages.js';

// Stonehenge at dawn on midsummer's day, about 2500 BC (core/landmarkStages.js 'solstice'
// says where and when): stones, grass, the bank and ditch, a sky and the Sun, all made
// here of boxes and planes, with no drawing (the user, 2026-10-13: no more stages of
// ordered pictures). Everything is lit by its own colours, set each moment by the
// scene (a piece's metadata.pose, render/craft.js), not by the game's Sun, which may be
// anywhere over Wiltshire when it is played.
const mix = (a, b, u) => a.map((n, i) => n + (b[i] - n) * u);
// Night, dawn and morning, for each thing that changes colour.
const SKY = {
  top: [[0.012, 0.02, 0.07], [0.16, 0.24, 0.48], [0.3, 0.5, 0.82]],
  low: [[0.05, 0.08, 0.2], [0.85, 0.52, 0.38], [0.86, 0.78, 0.7]],
};
const GRASS = [[0.025, 0.04, 0.05], [0.16, 0.2, 0.15], [0.3, 0.42, 0.2]];
const STONE = [[0.05, 0.055, 0.08], [0.3, 0.29, 0.31], [0.55, 0.53, 0.5]];
const stage = (colours, dawn, day) => (day > 0 ? mix(colours[1], colours[2], day) : mix(colours[0], colours[1], dawn));

export const lit = (scene, name) => {
  const m = new StandardMaterial(name, scene);
  m.disableLighting = true;
  m.diffuseColor = new Color3(0, 0, 0);
  m.specularColor = new Color3(0, 0, 0);
  return m;
};
// Light added over what is behind it (the Sun, its glow, the light on the grass).
export const glowing = (scene, name, texture) => {
  const m = lit(scene, name);
  m.emissiveTexture = texture;
  m.opacityTexture = texture;
  m.alphaMode = Constants.ALPHA_ADD;
  m.disableDepthWrite = true;
  m.backFaceCulling = false;
  return m;
};
// A soft round spot of light: white in the middle, gone at the edge.
export function spotTexture(scene, name, stops) {
  const tex = new DynamicTexture(name, { width: 128, height: 128 }, scene, true);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  tex.update();
  tex.hasAlpha = true;
  return tex;
}

// A stone: a box, its faces shaded unlike one another (the top palest), its grey a little
// its own; standing on y = 0, turned and leaning as given.
const FACES = [0.78, 0.7, 0.62, 0.66, 1, 0.4];
function stone(scene, name, parent, material, { x, z, w, h, d, turn, lean }, grey) {
  const faceColors = FACES.map((f) => new Color4(f * grey[0], f * grey[1], f * grey[2], 1));
  const mesh = CreateBox(name, { width: w, height: h, depth: d, faceColors }, scene);
  mesh.parent = parent;
  mesh.material = material;
  mesh.isPickable = false;
  // (Its foot stays on the ground as it leans: the box turns about its own bottom.)
  mesh.setPivotPoint(new Vector3(0, -h / 2, 0));
  mesh.position.set(x, h / 2, z);
  mesh.rotation.set(0, turn, lean);
  return mesh;
}

function hengeStonesPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const rock = lit(scene, `${name}Rock`);
  const next = seeded(5);
  // Sarsen is grey with a little brown; bluestone a little bluer and darker.
  const greyOf = (kind) => {
    const n = 0.9 + 0.2 * next();
    return kind === 'blue' ? [0.78 * n, 0.82 * n, 0.9 * n] : [n, 0.97 * n, 0.92 * n];
  };
  hengeStones().forEach((s, k) => stone(scene, `${name}Stone${k}`, root, rock, s, greyOf(s.kind)));
  hengeLintels().forEach((l, k) => {
    const dx = l.to[0] - l.from[0];
    const dz = l.to[1] - l.from[1];
    const length = Math.hypot(dx, dz) + 0.03;
    stone(scene, `${name}Lintel${k}`, root, rock, {
      x: (l.from[0] + l.to[0]) / 2, z: (l.from[1] + l.to[1]) / 2, w: length, h: l.h, d: l.d, turn: Math.atan2(-dz, dx), lean: 0,
    }, greyOf('sarsen')).position.y = l.y + l.h / 2;
  });
  // The grass, out to the horizon, and the bank and ditch round it all: a low ring of
  // chalky earth, and a darker trench just outside it, both open where the axis runs out.
  const grass = lit(scene, `${name}Grass`);
  grass.backFaceCulling = false;
  const field = CreatePlane(`${name}Field`, { width: 9, height: HENGE.sky + 2.4 }, scene);
  field.parent = root;
  field.material = grass;
  field.rotation.x = Math.PI / 2;
  field.position.set(0, 0, (HENGE.sky - 2.4) / 2);
  field.isPickable = false;
  const bank = lit(scene, `${name}Bank`);
  const ditch = lit(scene, `${name}Ditch`);
  const ring = (meshName, material, shape) => {
    // (The lathe goes round from +x; the gap is turned to face the axis.)
    const gap = 0.06;
    const mesh = CreateLathe(meshName, { shape: shape.map(([r, y]) => new Vector3(r, y, 0)), arc: 1 - gap, closed: false, tessellation: 72, sideOrientation: Mesh.DOUBLESIDE }, scene);
    mesh.parent = root;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.rotation.y = HENGE.axis - Math.PI / 2 - Math.PI * gap;
    return mesh;
  };
  const r = HENGE.ditch;
  ring(`${name}BankRing`, bank, [[r - 0.16, 0.001], [r - 0.12, 0.022], [r - 0.08, 0.026], [r - 0.045, 0.003]]);
  ring(`${name}DitchRing`, ditch, [[r - 0.04, 0.002], [r, 0.0025], [r + 0.04, 0.002]]);
  fuse(scene, root);
  root.metadata = {
    pose: ({ dawn = 0, day = 0 }) => {
      rock.emissiveColor = Color3.FromArray(stage(STONE, dawn, day));
      grass.emissiveColor = Color3.FromArray(stage(GRASS, dawn, day));
      bank.emissiveColor = Color3.FromArray(stage(GRASS, dawn, day).map((n, i) => n * 1.25 + [0.03, 0.03, 0.02][i] * (dawn + day)));
      ditch.emissiveColor = Color3.FromArray(stage(GRASS, dawn, day).map((n) => n * 0.55));
    },
  };
  root.metadata.pose({});
  return root;
}

// The sky: a wall at the horizon, its colours on a grid of points so that they can go
// from night to dawn and gather warm round where the Sun comes up; stars that fade.
const SKY_W = 12;
const SKY_H = 4.5;
const COLS = 24;
const ROWS = 10;
function skyPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const positions = [];
  const indices = [];
  for (let j = 0; j <= ROWS; j += 1) {
    for (let i = 0; i <= COLS; i += 1) positions.push(-SKY_W / 2 + (SKY_W * i) / COLS, SKY_H * (j / ROWS) ** 1.6, 0);
  }
  for (let j = 0; j < ROWS; j += 1) {
    for (let i = 0; i < COLS; i += 1) {
      const a = j * (COLS + 1) + i;
      indices.push(a, a + COLS + 1, a + 1, a + 1, a + COLS + 1, a + COLS + 2);
    }
  }
  const wall = new Mesh(`${name}Wall`, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.colors = new Array((positions.length / 3) * 4).fill(1);
  data.applyToMesh(wall, true);
  const paint = lit(scene, `${name}Paint`);
  paint.emissiveColor = new Color3(1, 1, 1);
  paint.backFaceCulling = false;
  wall.material = paint;
  wall.parent = root;
  wall.position.z = HENGE.sky;
  wall.isPickable = false;
  const stars = new DynamicTexture(`${name}Stars`, { width: 512, height: 256 }, scene, true);
  const ctx = stars.getContext();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 256);
  const next = seeded(3);
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * next()})`;
    const size = next() < 0.2 ? 2 : 1;
    ctx.fillRect(Math.floor(next() * 510), Math.floor(next() * 200), size, size);
  }
  stars.update();
  const starLight = lit(scene, `${name}StarLight`);
  starLight.emissiveTexture = stars;
  starLight.alphaMode = Constants.ALPHA_ADD;
  starLight.disableDepthWrite = true;
  starLight.backFaceCulling = false;
  const sheet = CreatePlane(`${name}StarSheet`, { width: SKY_W, height: SKY_H - 0.3 }, scene);
  sheet.parent = root;
  sheet.material = starLight;
  sheet.position.set(0, (SKY_H + 0.3) / 2, HENGE.sky - 0.01);
  sheet.isPickable = false;
  const colours = new Float32Array((positions.length / 3) * 4);
  // (The colours are worked out and sent again only when the light has changed: not in
  // the dark first second, nor once the morning has come.)
  let last = '';
  root.metadata = {
    pose: ({ dawn = 0, day = 0, sunX = 0, sunY = 0 }) => {
      const now = `${dawn} ${day} ${sunX} ${sunY}`;
      if (now === last) return;
      last = now;
      const top = stage(SKY.top, dawn, day);
      const low = stage(SKY.low, dawn, day);
      for (let j = 0; j <= ROWS; j += 1) {
        for (let i = 0; i <= COLS; i += 1) {
          const k = j * (COLS + 1) + i;
          const x = positions[k * 3];
          const y = positions[k * 3 + 1];
          // From the horizon up, the low colour gives way to the top's within about 1.6.
          const c = mix(low, top, Math.min(1, y / 1.6) ** 0.8);
          // Warm round the place the Sun comes up, wider as it nears.
          const near = Math.exp(-((x - sunX) ** 2) / 1.8 - ((y - Math.max(0, sunY)) ** 2) / 0.5) * (0.9 * dawn - 0.35 * day);
          colours[k * 4] = Math.min(1, c[0] + near * 0.75);
          colours[k * 4 + 1] = Math.min(1, c[1] + near * 0.42);
          colours[k * 4 + 2] = Math.min(1, c[2] + near * 0.12);
          colours[k * 4 + 3] = 1;
        }
      }
      wall.updateVerticesData('color', colours);
      starLight.alpha = Math.max(0, 1 - 1.4 * dawn);
      sheet.setEnabled(starLight.alpha > 0);
    },
  };
  root.metadata.pose({});
  return root;
}

// The Sun: a disc of light in a wide warm glow, added over the sky.
function sunPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const disc = CreatePlane(`${name}Disc`, { size: HENGE_SUN.disc * 2.6 }, scene);
  disc.parent = root;
  disc.material = glowing(scene, `${name}DiscLight`, spotTexture(scene, `${name}DiscSpot`, [[0, '#fffbe8'], [0.58, '#fff1c4'], [0.74, 'rgba(255,214,140,0.7)'], [1, 'rgba(255,170,90,0)']]));
  disc.isPickable = false;
  const halo = CreatePlane(`${name}Halo`, { size: 1.6 }, scene);
  halo.parent = root;
  halo.position.z = 0.02;
  const haloLight = glowing(scene, `${name}HaloLight`, spotTexture(scene, `${name}HaloSpot`, [[0, 'rgba(255,220,150,0.85)'], [0.25, 'rgba(255,170,90,0.35)'], [1, 'rgba(255,120,60,0)']]));
  halo.material = haloLight;
  halo.isPickable = false;
  root.metadata = { pose: ({ glow = 1 }) => { haloLight.alpha = glow; } };
  return root;
}

// The long shadows of the big stones, thrown along the grass away from the Sun: a dark
// strip from each one's foot, turned and drawn out as the scene says.
function shadowsPiece(scene, name) {
  const root = new TransformNode(name, scene);
  const shade = lit(scene, `${name}Shade`);
  shade.emissiveColor = new Color3(0, 0, 0);
  shade.alpha = 0.4;
  shade.disableDepthWrite = true;
  shade.backFaceCulling = false;
  const strips = hengeStones().filter((s) => s.kind !== 'blue').map((s, k) => {
    const foot = new TransformNode(`${name}Foot${k}`, scene);
    foot.parent = root;
    foot.position.set(s.x, 0.004, s.z);
    const strip = CreatePlane(`${name}Strip${k}`, { width: 1, height: 1 }, scene);
    strip.parent = foot;
    strip.material = shade;
    strip.rotation.x = Math.PI / 2;
    strip.isPickable = false;
    return { foot, strip, w: s.w, h: s.h };
  });
  root.metadata = {
    pose: ({ angle = 0, length = 1, fade = 1 }) => {
      shade.alpha = 0.42 * fade;
      for (const { foot, strip, w, h } of strips) {
        // (The taller the stone, the longer its shadow; the Heel Stone's reaches past the ring.)
        const reach = (length * h) / 0.17;
        foot.rotation.y = angle;
        strip.scaling.set(w, reach, 1);
        strip.position.z = reach / 2;
      }
    },
  };
  return root;
}

// The first light, down the axis: a warm strip on the grass from the horizon toward the
// middle, and a spot of light in the middle once it is there.
function beamPiece(scene, name) {
  const root = new TransformNode(name, scene);
  // (Turned to the axis on a node of its own: render/craft.js sets the root's turn from
  // the scene every moment, and the scene gives the beam none.)
  const along = new TransformNode(`${name}Along`, scene);
  along.parent = root;
  along.rotation.y = HENGE.axis;
  const tex = new DynamicTexture(`${name}Band`, { width: 64, height: 256 }, scene, true);
  const ctx = tex.getContext();
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(255,190,110,0)');
  g.addColorStop(0.5, 'rgba(255,214,150,1)');
  g.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  tex.update();
  tex.hasAlpha = true;
  const light = glowing(scene, `${name}Light`, tex);
  const far = HENGE.sky / Math.cos(HENGE.axis);
  const strip = CreatePlane(`${name}Strip`, { width: 0.12, height: 1 }, scene);
  strip.parent = along;
  strip.material = light;
  strip.rotation.x = Math.PI / 2;
  strip.position.y = 0.006;
  strip.isPickable = false;
  const middle = CreatePlane(`${name}Middle`, { size: 0.5 }, scene);
  middle.parent = root;
  middle.rotation.x = Math.PI / 2;
  middle.position.y = 0.008;
  const middleLight = glowing(scene, `${name}MiddleLight`, spotTexture(scene, `${name}MiddleSpot`, [[0, 'rgba(255,230,170,1)'], [0.35, 'rgba(255,190,110,0.5)'], [1, 'rgba(255,160,80,0)']]));
  middle.material = middleLight;
  middle.isPickable = false;
  root.metadata = {
    pose: ({ reach = 0, glow = 1, middle: there = 0 }) => {
      // From the horizon (far) in to `reach` of the way to the middle.
      const near = far * (1 - reach);
      strip.scaling.y = Math.max(0.001, far - near);
      strip.position.z = (far + near) / 2;
      light.alpha = 0.9 * glow;
      middleLight.alpha = there;
      middle.setEnabled(there > 0.01);
    },
  };
  return root;
}

// The pieces of the scene, as render/siteModels.js landmarkPieces wants them.
export function hengePieces(scene, name) {
  return {
    sky: skyPiece(scene, `${name}Sky`),
    henge: hengeStonesPiece(scene, `${name}Henge`),
    sun: sunPiece(scene, `${name}Sun`),
    shadows: shadowsPiece(scene, `${name}Shadows`),
    beam: beamPiece(scene, `${name}Beam`),
  };
}
