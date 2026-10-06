import { TransformNode, CreateSphere, StandardMaterial, Color3, Mesh, VertexData } from './babylon.js';
import { part, cyl, group, box, drum, rod, fuse } from './craftParts.js';
import { CRAFT_BUILD, CRAFT_UNFOLD } from './craftModels.js';
import { astronaut, sayBubble } from './siteModels.js';
import { t } from '../core/i18n.js';

// The craft that have a day played again (core/craftScenes.js), each built once more
// with what moves in that scene left loose: id → builder giving { root, pose }.
// pose(values) takes what the scene's `unfold(t)` gives. Most are the craft's own model
// (CRAFT_BUILD) with a few things added round it; local +z points at the Sun, as there.
//
// A group that is fused must stand at the origin, unturned, while it is fused (fuse
// bakes where its parts stand into them): it is moved afterwards.

const Z = [0, 0, 1];
const clamp = (n) => Math.max(0, Math.min(1, n));
const smooth = (n) => {
  const u = clamp(n);
  return u * u * (3 - 2 * u);
};
const mix = (a, b, u) => a.map((n, i) => n + (b[i] - n) * u);

// A plain paint of its own colour, lit like the craft's.
function tint(scene, name, hex) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(hex);
  material.emissiveColor = Color3.FromHexString(hex).scale(0.25);
  material.specularColor = new Color3(0.05, 0.05, 0.05);
  return material;
}
// Light itself: a flame, a beam, a glow. Seen from both sides, never shaded.
function glow(scene, name, hex, alpha) {
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.FromHexString(hex);
  material.alpha = alpha;
  material.backFaceCulling = false;
  return material;
}
const ball = (scene, name, parent, material, diameter, position = [0, 0, 0], scaling = [1, 1, 1]) => part(
  CreateSphere(name, { diameter, segments: 14 }, scene), parent, material, position, [0, 0, 0], scaling,
);
function based(scene, name, mats, id, options) {
  const root = new TransformNode(name, scene);
  const base = CRAFT_BUILD[id](scene, `${name}Base`, mats, options);
  base.parent = root;
  return { root, base };
}

// Voyager 1 looking back: a beam from its scan platform sweeps across the planets, and
// a picture of each comes up in a row sunward of it; Earth's, a dot in a ray of light,
// is then brought forward.
function voyagerPortrait(scene, name, mats) {
  const { root } = based(scene, name, mats, 'voyager1');
  const pivot = group(scene, `${name}BeamPivot`, root, [0.4, -0.08, -0.1]);
  drum(scene, `${name}Beam`, pivot, glow(scene, `${name}BeamLight`, '#fff3d0', 0.16), { height: 1, diameterTop: 0.3, diameterBottom: 0.02, tessellation: 16 }, [0, 0, 0.5], Z);
  // In the order they were taken. [name, colour, size]
  const PLANETS = [['Neptune', '#3f66d8', 0.07], ['Uranus', '#9fd8dc', 0.075], ['Saturn', '#d9c28a', 0.08], ['Jupiter', '#c9a27a', 0.11], ['Earth', '#8fbaff', 0.016], ['Venus', '#efe6c8', 0.05]];
  const slot = (i) => [-0.5 + 0.2 * i, 0.36, 0.3];
  const cards = PLANETS.map(([id, hex, size], i) => {
    const card = group(scene, `${name}Card${id}`, root, slot(i));
    box(scene, `${name}Frame${id}`, card, mats.black, [0.16, 0.16, 0.008]);
    box(scene, `${name}Edge${id}`, card, mats.white, [0.172, 0.172, 0.004]);
    ball(scene, `${name}Planet${id}`, card, tint(scene, `${name}Paint${id}`, hex), size);
    if (id === 'Saturn') drum(scene, `${name}Ring`, card, mats.goldFoil, { height: 0.003, diameter: 0.15, tessellation: 24 }, [0, 0, 0], [0.25, 1, 0.3]);
    // The ray of scattered sunlight Earth sits in.
    if (id === 'Earth') box(scene, `${name}Ray`, card, glow(scene, `${name}RayLight`, '#e8c9a0', 0.4), [0.022, 0.2, 0.004], [0, 0, 0], [0, 0, 0.5]);
    return card;
  });

  function pose({ looking, sweep, cards: taken, earth }) {
    pivot.setEnabled(looking > 0.01);
    pivot.scaling.setAll(Math.max(0.01, looking));
    pivot.rotation.y = -0.6 + 1.2 * sweep;
    cards.forEach((card, i) => {
      const shown = clamp((taken - i) * 4);
      card.setEnabled(shown > 0);
      const forward = i === 4 ? earth : 0;
      card.scaling.setAll(Math.max(0.01, shown) * (1 + 2.4 * forward));
      const at = mix(slot(i), [0, 0.05, 0.6], forward);
      card.position.set(at[0], at[1], at[2]);
    });
  }
  pose({ looking: 0, sweep: 0, cards: 0, earth: 0 });
  // The row of pictures faces the watcher (seen from the side or from above they were
  // thin slanted strips).
  return { root, pose, face: true, fit: 0.8 };
}

// A flat plate: the outline (three or more corners in one plane, going round, bulging
// nowhere inward) pushed `through` to give it thickness. Seen from both sides, and flat
// shaded: every triangle has corners of its own.
function slab(scene, name, parent, material, outline, through) {
  const far = outline.map((p) => p.map((n, i) => n + through[i]));
  const faces = [];
  for (let i = 1; i < outline.length - 1; i++) faces.push([outline[0], outline[i], outline[i + 1]], [far[0], far[i], far[i + 1]]);
  outline.forEach((p, i) => {
    const j = (i + 1) % outline.length;
    faces.push([p, outline[j], far[j]], [p, far[j], far[i]]);
  });
  const positions = [];
  const indices = [];
  for (const [a, b, c] of faces) {
    for (const corners of [[a, b, c], [a, c, b]]) {
      for (const corner of corners) {
        indices.push(positions.length / 3);
        positions.push(...corner);
      }
    }
  }
  const normals = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = new Array((positions.length / 3) * 2).fill(0);
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  return part(mesh, parent, material);
}

// Hubble being mended: the shuttle comes up under its aft end, two people float out to
// the telescope, a box the size of a phone booth goes in, and the shuttle backs away.
// (The shuttle is drawn at half its true size beside the telescope, to fit the view.)
// The scene faces the watcher (render/craft.js `face`): the shuttle is seen from its side.
function hubbleService(scene, name, mats) {
  const { root } = based(scene, name, mats, 'hubble');
  const shuttle = group(scene, `${name}Shuttle`, root);
  // Its nose to +x, its open bay up (+y) under the telescope. (Redrawn on 2026-10-06 with
  // a round body, delta wings, a swept fin, engine pods and the arm: the user, of the
  // first one made of six boxes, "엔데버.. 폴리곤 몇 개만 더 쓰자".)
  const along = [1, 0, 0];
  drum(scene, `${name}Body`, shuttle, mats.white, { height: 1.02, diameter: 0.2, tessellation: 18 }, [-0.07, 0, 0], along).scaling.set(1.08, 1, 1);
  drum(scene, `${name}Cabin`, shuttle, mats.white, { height: 0.2, diameterTop: 0.135, diameterBottom: 0.2, tessellation: 18 }, [0.54, -0.006, 0], along);
  drum(scene, `${name}Nose`, shuttle, mats.white, { height: 0.13, diameterTop: 0.05, diameterBottom: 0.135, tessellation: 18 }, [0.705, -0.012, 0], along);
  part(CreateSphere(`${name}NoseCap`, { diameter: 0.056, segments: 10 }, scene), shuttle, mats.black, [0.768, -0.014, 0]);
  // The black tiles of its underside, from nose to tail.
  box(scene, `${name}Belly`, shuttle, mats.black, [1.1, 0.03, 0.17], [-0.05, -0.092, 0]);
  box(scene, `${name}Chin`, shuttle, mats.black, [0.2, 0.026, 0.11], [0.56, -0.078, 0], [0, 0, 0.16]);
  // The flight deck's windows, sloped back.
  box(scene, `${name}Windows`, shuttle, mats.dark, [0.075, 0.03, 0.12], [0.555, 0.066, 0], [0, 0, -0.32]);
  for (const s of [-1, 1]) box(scene, `${name}SideWindow${s}`, shuttle, mats.dark, [0.05, 0.028, 0.01], [0.5, 0.05, s * 0.088], [0, s * 0.2, 0]);
  // Double-delta wings: white above, black beneath.
  for (const s of [-1, 1]) {
    const glove = [[0.36, 0.085], [0.04, 0.17], [0.04, 0.085]];
    const main = [[0.04, 0.085], [0.04, 0.17], [-0.27, 0.37], [-0.43, 0.37], [-0.52, 0.085]];
    for (const [key, outline] of [['Glove', glove], ['Main', main]]) {
      const flat = outline.map(([x, z]) => [x, s * z]);
      slab(scene, `${name}Wing${key}${s}`, shuttle, mats.white, flat.map(([x, z]) => [x, -0.086, z]), [0, 0.018, 0]);
      slab(scene, `${name}WingUnder${key}${s}`, shuttle, mats.black, flat.map(([x, z]) => [x, -0.1, z]), [0, 0.014, 0]);
    }
    // The engine pods either side of the fin, and their small bells.
    drum(scene, `${name}Pod${s}`, shuttle, mats.white, { height: 0.2, diameter: 0.085, tessellation: 12 }, [-0.5, 0.095, s * 0.072], along);
    drum(scene, `${name}PodNose${s}`, shuttle, mats.white, { height: 0.09, diameterTop: 0.02, diameterBottom: 0.085, tessellation: 12 }, [-0.355, 0.092, s * 0.072], along);
    drum(scene, `${name}PodBell${s}`, shuttle, mats.dark, { height: 0.05, diameterTop: 0.025, diameterBottom: 0.055, tessellation: 12 }, [-0.625, 0.095, s * 0.072], along);
    // The bay's two doors stand open. They are drawn silver, not white: in sunlight white
    // doors and the white body were one mass.
    box(scene, `${name}Door${s}`, shuttle, mats.silver, [0.62, 0.008, 0.11], [-0.02, 0.125, s * 0.14], [s * 0.75, 0, 0]);
    box(scene, `${name}Radiator${s}`, shuttle, mats.grey, [0.6, 0.004, 0.1], [-0.02, 0.129, s * 0.137], [s * 0.75, 0, 0]);
  }
  // The swept fin.
  slab(scene, `${name}Fin`, shuttle, mats.white, [[-0.3, 0.09, -0.011], [-0.6, 0.42, -0.011], [-0.71, 0.42, -0.011], [-0.6, 0.09, -0.011]], [0, 0, 0.022]);
  // The open bay, and the ring the telescope stands on.
  box(scene, `${name}Bay`, shuttle, mats.dark, [0.62, 0.014, 0.17], [-0.02, 0.094, 0]);
  drum(scene, `${name}Cradle`, shuttle, mats.grey, { height: 0.03, diameter: 0.2, tessellation: 20 }, [0, 0.112, 0]);
  // The arm that caught the telescope: shoulder at the bay's front, elbow, hand.
  rod(scene, `${name}ArmUpper`, shuttle, mats.white, [0.26, 0.1, 0.075], [0.3, 0.3, 0.13], 0.014, 8);
  rod(scene, `${name}ArmLower`, shuttle, mats.white, [0.3, 0.3, 0.13], [0.1, 0.33, 0.1], 0.012, 8);
  part(CreateSphere(`${name}Elbow`, { diameter: 0.024, segments: 8 }, scene), shuttle, mats.grey, [0.3, 0.3, 0.13]);
  drum(scene, `${name}Hand`, shuttle, mats.grey, { height: 0.03, diameter: 0.024, tessellation: 10 }, [0.092, 0.33, 0.1], along);
  // Three main engines and the flap beneath them.
  for (const [y, z] of [[0.045, 0], [-0.035, 0.05], [-0.035, -0.05]]) drum(scene, `${name}Bell${y}${z}`, shuttle, mats.dark, { height: 0.08, diameterTop: 0.04, diameterBottom: 0.085, tessellation: 14 }, [-0.625, y, z], along);
  box(scene, `${name}Flap`, shuttle, mats.black, [0.09, 0.014, 0.17], [-0.635, -0.1, 0]);
  fuse(scene, shuttle);
  const people = [-1, 1].map((s) => {
    const person = astronaut(scene, `${name}Person${s}`, mats);
    person.parent = root;
    return person;
  });
  const fixer = group(scene, `${name}Fixer`, root);
  box(scene, `${name}Costar`, fixer, mats.goldFoil, [0.05, 0.11, 0.05]);

  function pose({ shuttle: up, out, fix, away }) {
    shuttle.position.set(0, -0.71 - 1.7 * (1 - up) - 1.9 * away, 0);
    people.forEach((person, k) => {
      const s = k ? 1 : -1;
      person.setEnabled(out > 0.02);
      const at = mix([s * 0.15, -0.6, 0], [s * 0.27, -0.33 - k * 0.1, 0.02], out);
      person.position.set(at[0], at[1], at[2]);
      person.rotation.y = s > 0 ? Math.PI : 0;
      person.scaling.setAll(0.62);
    });
    // Out of the bay, up beside the aft shroud, then in through its door.
    fixer.setEnabled(fix > 0.01 && fix < 0.99);
    const at = fix < 0.7 ? mix([0, -0.6, 0.1], [0, -0.37, 0.24], fix / 0.7) : mix([0, -0.37, 0.24], [0, -0.37, 0.08], (fix - 0.7) / 0.3);
    fixer.position.set(at[0], at[1], at[2]);
  }
  pose({ shuttle: 0, out: 0, fix: 0, away: 0 });
  return { root, pose, face: true, fit: 0.7, lift: 0.2 };
}

// The station built up: its eight groups, each coming in from its own side and joining.
const ISS_GROUPS = [
  ['zarya', [0, 0, -1.3]], ['unity', [0, 0, 1.3]], ['zvezda', [0, 0, -1.3]], ['destiny', [0, 1.1, 0.7]],
  ['port', [-1.3, 0, 0]], ['starboard', [1.3, 0, 0]], ['labs', [0, 0, 1.3]], ['rooms', [0, -1.2, 0]],
];
function issAssembly(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const stage = Object.fromEntries(ISS_GROUPS.map(([key]) => [key, group(scene, `${name}_${key}`, root)]));
  CRAFT_BUILD.iss(scene, `${name}Parts`, mats, stage).dispose();
  for (const node of Object.values(stage)) fuse(scene, node);

  function pose({ built }) {
    ISS_GROUPS.forEach(([key, from], i) => {
      const come = clamp(built - i);
      stage[key].setEnabled(come > 0);
      const left = 1 - smooth(come);
      stage[key].position.set(from[0] * left, from[1] * left, from[2] * left);
    });
  }
  pose({ built: 0 });
  return { root, pose };
}

// Sputnik 1 leaving its rocket: the nose cone's two halves go, the rocket falls behind,
// the four whips spring back, and each beep goes out as a shell of light.
function sputnikLeaves(scene, name, mats) {
  const top = new TransformNode(name, scene);
  // Seen from the side (render/craft.js face: 'side'). Everything hangs from `root`,
  // which slides along as the rocket falls behind: first the ball and its rocket are
  // both in view, at the end the ball is in the middle.
  const root = group(scene, `${name}Stage`, top);
  const body = group(scene, `${name}Body`, root);
  part(CreateSphere(`${name}Ball`, { diameter: 0.3, segments: 24 }, scene), body, mats.chrome);
  drum(scene, `${name}Seam`, body, mats.grey, { height: 0.01, diameter: 0.304, tessellation: 32 }, [0, 0, 0], Z);
  fuse(scene, body);
  const whips = [[0, 1, 1], [1, -1, 1], [2, 1, -1], [3, -1, -1]].map(([i, x, y]) => {
    const long = i % 3 === 0 ? 1 : 0.83;
    const from = [x * 0.07, y * 0.07, 0.115];
    const pivot = group(scene, `${name}WhipPivot${i}`, root, from);
    rod(scene, `${name}Whip${i}`, pivot, mats.chrome, [0, 0, 0], [x * 0.44 * long - from[0], y * 0.44 * long - from[1], -0.75 * long - from[2]], 0.012, 5);
    return pivot;
  });
  const rocket = group(scene, `${name}Rocket`, root);
  drum(scene, `${name}Core`, rocket, mats.grey, { height: 1.4, diameter: 0.55, tessellation: 24 }, [0, 0, -1.05], Z);
  drum(scene, `${name}Adapter`, rocket, mats.silver, { height: 0.25, diameterTop: 0.2, diameterBottom: 0.55, tessellation: 24 }, [0, 0, -0.225], Z);
  drum(scene, `${name}Bell`, rocket, mats.dark, { height: 0.2, diameterTop: 0.2, diameterBottom: 0.4, tessellation: 20 }, [0, 0, -1.85], Z);
  fuse(scene, rocket);
  const halves = [0, 1].map((k) => {
    const holder = group(scene, `${name}FairingHolder${k}`, root);
    const half = group(scene, `${name}Fairing${k}`, holder);
    part(cyl(scene, `${name}FairingShell${k}`, { height: 0.8, diameterTop: 0.02, diameterBottom: 0.58, tessellation: 24, arc: 0.5 }), half, mats.white, [0, 0.3, 0]);
    // Built standing on y, a half ring about it; laid along the craft's z by its holder.
    holder.rotation.set(Math.PI / 2, 0, 0);
    half.rotation.y = k * Math.PI;
    return half;
  });
  const shells = [0, 1, 2].map((k) => ({
    material: glow(scene, `${name}BeepLight${k}`, '#bfe3ff', 0.2),
    mesh: null,
  }));
  shells.forEach((shell, k) => {
    shell.mesh = ball(scene, `${name}Beep${k}`, root, shell.material, 0.32);
  });

  function pose({ fairing, sep, whips: sprung, beeps }) {
    halves.forEach((half, k) => {
      const s = k ? -1 : 1;
      half.setEnabled(fairing < 0.99);
      half.position.set(0, 0.7 * fairing, s * 1.1 * fairing);
      half.rotation.x = s * 0.9 * fairing;
    });
    rocket.setEnabled(sep < 0.995);
    rocket.position.z = -2.8 * sep;
    rocket.scaling.setAll(1 - 0.5 * sep);
    root.position.z = 0.6 * (1 - sep);
    const f = 0.06 + 0.94 * sprung;
    for (const pivot of whips) pivot.scaling.set(f, f, 1);
    shells.forEach((shell, k) => {
      const u = (((beeps - k) / 3) % 1 + 1) % 1;
      shell.mesh.setEnabled(beeps > k);
      shell.mesh.scaling.setAll(1 + 6 * u);
      shell.material.alpha = 0.22 * (1 - u);
    });
  }
  pose({ fairing: 0, sep: 0, whips: 0, beeps: 0 });
  return { root: top, pose, face: 'side', fit: 0.6 };
}

// Parker in the corona: the face of its shield glows, a haze of light stands before
// it, and the corona's streamers go by.
function parkerCorona(scene, name, mats) {
  const { root } = based(scene, name, mats, 'parker');
  const face = glow(scene, `${name}FaceLight`, '#ff9a3c', 0);
  drum(scene, `${name}Face`, root, face, { height: 0.004, diameter: 0.56, tessellation: 6 }, [0, 0, 0.334], Z);
  const haze = glow(scene, `${name}HazeLight`, '#ffd98a', 0);
  ball(scene, `${name}Haze`, root, haze, 1, [0, 0, 0.5], [1, 1, 0.35]);
  const stream = glow(scene, `${name}StreamLight`, '#ffe9b8', 0);
  const streamers = Array.from({ length: 10 }, (_, k) => {
    const a = k * 2.4;
    const r = 0.55 + 0.45 * ((k * 0.37) % 1);
    return box(scene, `${name}Stream${k}`, root, stream, [0.02, 0.02, 1.2 + 0.5 * ((k * 0.61) % 1)], [Math.cos(a) * r, Math.sin(a) * r, 0]);
  });

  function pose({ heat, flow }) {
    face.alpha = 0.85 * heat;
    haze.alpha = 0.16 * heat;
    stream.alpha = 0.3 * clamp((heat - 0.3) / 0.4);
    streamers.forEach((bar, k) => {
      bar.setEnabled(stream.alpha > 0.01);
      bar.position.z = 2.5 - ((flow + k * 0.53) % 5);
    });
  }
  pose({ heat: 0, flow: 0 });
  return { root, pose };
}

// Cassini letting Huygens go: the probe, spinning, draws away toward Titan, a small
// ball to one side. The scene faces the watcher, and the probe stays in view to the end
// (it went 1.9 craft-widths sunward and was out of sight after nine seconds).
function huygensLeaves(scene, name, mats) {
  const { root } = based(scene, name, mats, 'cassini', { probe: false });
  const probe = group(scene, `${name}Probe`, root);
  drum(scene, `${name}Shield`, probe, mats.goldFoil, { height: 0.06, diameterTop: 0.24, diameterBottom: 0.1, tessellation: 24 }, [0, 0, 0.015], [0, 0, -1]);
  drum(scene, `${name}Back`, probe, mats.silver, { height: 0.02, diameter: 0.2, tessellation: 24 }, [0, 0, -0.015], Z);
  // A mark on its rim, so that its turning shows.
  box(scene, `${name}Mark`, probe, mats.dark, [0.05, 0.02, 0.012], [0.085, 0, -0.03]);
  fuse(scene, probe);
  ball(scene, `${name}Titan`, root, tint(scene, `${name}TitanPaint`, '#d9a34a'), 0.2, [-0.62, -0.42, 0.2]);

  function pose({ away, spin }) {
    probe.position.set(-0.5 * away, -0.34 * away, 0.115 + 0.2 * away);
    probe.rotation.z = spin;
    probe.scaling.setAll(1 - 0.6 * away);
  }
  pose({ away: 0, spin: 0 });
  return { root, pose, face: true, fit: 0.8 };
}

// The Roadster shown to the sky: the fairing round it parts in two and falls away to
// the sides, and Earth, behind it, grows small. The scene faces the watcher, so Earth
// stands behind the car (it stood below and behind the craft's sunward side, out of sight).
function roadsterReveal(scene, name, mats) {
  const { root, base } = based(scene, name, mats, 'roadster');
  // The car is seen from its side.
  base.rotation.y = Math.PI / 2;
  const halves = [0, 1].map((k) => {
    const holder = group(scene, `${name}FairingHolder${k}`, root);
    const half = group(scene, `${name}Fairing${k}`, holder);
    part(cyl(scene, `${name}FairingWall${k}`, { height: 0.56, diameter: 0.56, tessellation: 28, arc: 0.5 }), half, mats.white, [0, 0.42, 0]);
    part(cyl(scene, `${name}FairingNose${k}`, { height: 0.34, diameterTop: 0.03, diameterBottom: 0.56, tessellation: 28, arc: 0.5 }), half, mats.white, [0, 0.87, 0]);
    part(cyl(scene, `${name}FairingBand${k}`, { height: 0.02, diameter: 0.565, tessellation: 28, arc: 0.5 }), half, mats.grey, [0, 0.7, 0]);
    fuse(scene, half);
    holder.rotation.y = k * Math.PI + Math.PI / 2;
    return half;
  });
  const earth = ball(scene, `${name}Earth`, root, tint(scene, `${name}EarthPaint`, '#3f78d8'), 1.1, [0.3, -0.35, -1.2]);

  function pose({ open, gone }) {
    for (const half of halves) {
      half.setEnabled(open < 0.99);
      half.position.set(0, -0.5 * open * open, 1.0 * open);
      half.rotation.x = 1.0 * open;
    }
    earth.scaling.setAll(1 - 0.8 * gone);
    earth.position.set(0.3 + 0.25 * gone, -0.35 - 0.2 * gone, -1.2 - 0.8 * gone);
  }
  pose({ open: 0, gone: 0 });
  return { root, pose, face: true, fit: 0.85 };
}

// Juno braking into orbit: the whole craft turns about its axis and its main engine,
// at its back, burns.
function junoArrives(scene, name, mats) {
  const { root, base } = based(scene, name, mats, 'juno');
  const flame = drum(scene, `${name}Flame`, root, glow(scene, `${name}FlameLight`, '#ffd28a', 0.45), { height: 0.7, diameterTop: 0.05, diameterBottom: 0.2, tessellation: 14 }, [0, 0, -0.47], Z);

  function pose({ burn, spin }) {
    base.rotation.z = spin;
    flame.setEnabled(burn > 0);
    // It flickers.
    const flick = 1 + 0.08 * Math.sin(spin * 9);
    flame.scaling.set(flick, 1, flick);
  }
  pose({ burn: 0, spin: 0 });
  return { root, pose };
}

// The thirteen that came last (the user, 2026-10-06: "도킹할 수 있는 모든 곳에는 애니
// 넣어"). All but two face the watcher, with what they met behind them (the stage's -z).

// A world going by behind a craft: `make(parent)` builds it (and may give a pose of its
// own for what else moves), and it goes from `from` to `to` as `pass` goes 0 → 1,
// growing from grow[0] to grow[1] and turning `turn` radians about the line of sight.
function goesBy(id, make, { from, to, grow = [1, 1], turn = 0, fit = 0.8 }) {
  return (scene, name, mats) => {
    const { root } = based(scene, name, mats, id);
    const world = group(scene, `${name}World`, root);
    const more = make(scene, name, world, mats, root);
    function pose(values) {
      const u = values.pass ?? 0;
      const at = mix(from, to, u);
      world.position.set(at[0], at[1], at[2]);
      world.scaling.setAll(grow[0] + (grow[1] - grow[0]) * u);
      world.rotation.z = turn * u;
      more?.(values);
    }
    pose({});
    return { root, pose, face: true, fit };
  };
}
// A belt or a band round a ball: a thin drum a little wider than the ball is there.
const belt = (scene, name, parent, material, diameter, y, height) => drum(scene, name, parent, material, { height, diameter: Math.sqrt(Math.max(0.0001, diameter * diameter - 4 * y * y)) * 1.03, tessellation: 40 }, [0, y, 0]);
// A picture that has just been taken: a black card with a white edge, which `fill`
// draws on (its front is +z). It comes up from nothing as its value goes 0 → 1.
function picture(scene, name, parent, mats, at, size, fill) {
  const card = group(scene, name, parent, at);
  box(scene, `${name}Frame`, card, mats.black, [size, size, 0.008]);
  box(scene, `${name}Edge`, card, mats.white, [size + 0.014, size + 0.014, 0.004]);
  fill(card);
  return (shown) => {
    card.setEnabled(shown > 0.01);
    card.scaling.setAll(Math.max(0.01, smooth(shown)));
  };
}
// What a camera looks along: a faint cone of light from `from`, `length` along `toward`.
function gaze(scene, name, parent, from, toward, length, wide, hex = '#fff3d0') {
  const d = Math.hypot(...toward);
  const beam = drum(scene, name, parent, glow(scene, `${name}Light`, hex, 0.16), { height: length, diameterTop: wide, diameterBottom: 0.02, tessellation: 16, cap: 0 }, from.map((n, i) => n + (toward[i] / d) * (length / 2)), toward);
  return (looking) => beam.setEnabled(looking > 0.5);
}

// Voyager 2 at Neptune: the blue planet with its dark storm, and Triton after it.
const neptuneGoesBy = goesBy('voyager2', (scene, name, world) => {
  ball(scene, `${name}Neptune`, world, tint(scene, `${name}NeptunePaint`, '#3f66d8'), 1.3);
  ball(scene, `${name}Spot`, world, tint(scene, `${name}SpotPaint`, '#22367e'), 0.3, [-0.22, -0.12, 0.56], [1.5, 0.8, 0.3]);
  for (const y of [0.3, -0.36]) belt(scene, `${name}Band${y}`, world, tint(scene, `${name}BandPaint${y}`, '#5b84ea'), 1.3, y, 0.05);
  ball(scene, `${name}Triton`, world, tint(scene, `${name}TritonPaint`, '#d9c3b6'), 0.2, [-1.35, 0.3, 0.3]);
}, { from: [-2.1, -0.35, -1.4], to: [2.3, 0.15, -1.4] });

// Pioneer 10 at Jupiter: belts and the red spot.
const jupiterGoesBy = goesBy('pioneer10', (scene, name, world, mats, root) => {
  ball(scene, `${name}Jupiter`, world, tint(scene, `${name}JupiterPaint`, '#d8b890'), 1.7);
  for (const [y, hex] of [[0.5, '#a9744a'], [0.2, '#b98558'], [-0.22, '#a9744a'], [-0.55, '#b98558']]) belt(scene, `${name}Belt${y}`, world, tint(scene, `${name}BeltPaint${y}`, hex), 1.7, y, 0.1);
  ball(scene, `${name}RedSpot`, world, tint(scene, `${name}RedSpotPaint`, '#c2553a'), 0.3, [0.3, -0.36, 0.7], [1.4, 0.8, 0.3]);
  // What it says before the shutter (the user, 2026-10-06: "중간에 \"목성아. 스마일~\"하고
  // 셔터 소리 내줘"): a bubble up to the watcher's right of it (the craft's -x), turned
  // half round so that its words face them.
  const bubble = sayBubble(scene, `${name}Bubble`, t('목성아. 스마일~'));
  bubble.parent = root;
  bubble.position.set(-0.27, 0.36, 0.35);
  bubble.rotation.y = Math.PI;
  return ({ say = 0 }) => {
    bubble.setEnabled(say > 0.01);
    bubble.scaling.setAll(Math.max(0.01, 0.5 * say));
  };
}, { from: [-2.4, -0.3, -1.5], to: [2.4, 0.2, -1.5] });

// Pioneer 11 at Saturn: the ball and its rings, tipped toward the watcher.
const saturnGoesBy = goesBy('pioneer11', (scene, name, world) => {
  const tipped = group(scene, `${name}Tipped`, world, [0, 0, 0], [0.42, 0, 0.2]);
  ball(scene, `${name}Saturn`, tipped, tint(scene, `${name}SaturnPaint`, '#dcc48c'), 1.1, [0, 0, 0], [1, 0.9, 1]);
  for (const y of [0.2, -0.2]) belt(scene, `${name}Band${y}`, tipped, tint(scene, `${name}BandPaint${y}`, '#c4a86e'), 1.1, y, 0.06);
  for (const [k, d, hex] of [[0, 2.5, '#cbb98a'], [1, 2.0, '#8f7f5c'], [2, 1.9, '#d9c9a0'], [3, 1.45, '#2a2418']]) drum(scene, `${name}Ring${k}`, tipped, tint(scene, `${name}RingPaint${k}`, hex), { height: 0.004 + 0.002 * k, diameter: d, tessellation: 48 }, [0, 0, 0]);
}, { from: [-2.6, -0.3, -1.5], to: [2.6, 0.2, -1.5] });

// New Horizons at Arrokoth: two flat red lumps joined, turning slowly as it goes by.
const arrokothGoesBy = goesBy('newHorizons', (scene, name, world) => {
  const red = tint(scene, `${name}ArrokothPaint`, '#a8573d');
  ball(scene, `${name}Wenu`, world, red, 0.56, [-0.2, 0, 0], [1, 0.95, 0.55]);
  ball(scene, `${name}Weeyo`, world, red, 0.4, [0.25, 0.02, 0], [1, 0.95, 0.7]);
  ball(scene, `${name}Neck`, world, tint(scene, `${name}NeckPaint`, '#d9a890'), 0.14, [0.07, 0.01, 0.03], [1, 1, 0.6]);
}, { from: [-1.9, -0.35, -1.0], to: [1.9, 0.3, -1.0], turn: 1.2 });

// Europa Clipper at Mars: the red planet with a white cap.
const marsGoesBy = goesBy('europaClipper', (scene, name, world) => {
  ball(scene, `${name}Mars`, world, tint(scene, `${name}MarsPaint`, '#b9573a'), 1.6);
  ball(scene, `${name}Cap`, world, tint(scene, `${name}CapPaint`, '#f2ece4'), 0.5, [0, 0.66, 0.1], [1, 0.45, 1]);
  ball(scene, `${name}Dark`, world, tint(scene, `${name}DarkPaint`, '#7a3a2a'), 0.6, [-0.2, 0.05, 0.56], [1.3, 0.6, 0.3]);
}, { from: [-2.4, -0.4, -1.5], to: [2.4, 0.1, -1.5] });

// Lucy at Dinkinesh: the small asteroid, and from behind it a moon that turns out to be
// two lumps joined. moon: it has come out; pair: its second lump is seen.
const dinkineshGoesBy = goesBy('lucy', (scene, name, world) => {
  const rock = tint(scene, `${name}RockPaint`, '#8f867a');
  ball(scene, `${name}Dinkinesh`, world, rock, 0.6, [0, 0, 0], [1, 0.88, 0.95]);
  belt(scene, `${name}Ridge`, world, tint(scene, `${name}RidgePaint`, '#a39a8c'), 0.6 * 0.88, 0, 0.03).scaling.set(1.13, 1, 1.08);
  const moon = group(scene, `${name}Selam`, world);
  const lobes = [0, 1].map((k) => ball(scene, `${name}Lobe${k}`, moon, rock, 0.13 - 0.02 * k));
  return ({ moon: out = 0, pair = 0 }) => {
    const at = mix([0.05, 0.02, -0.3], [-0.42, 0.36, -0.05], out);
    moon.position.set(at[0], at[1], at[2]);
    lobes[1].position.set(0.11 * pair, 0.02 * pair, -0.05 * (1 - pair));
  };
}, { from: [-1.8, -0.3, -1.0], to: [1.4, 0.15, -1.0] });

// A craft that looks down on the world it goes round and takes one picture: the ground
// under it, the camera's cone of light, and the picture coming up beside it.
function looksDown(id, hex, eye, fill) {
  return (scene, name, mats) => {
    const { root } = based(scene, name, mats, id);
    ball(scene, `${name}Ground`, root, tint(scene, `${name}GroundPaint`, hex), 3.2, [0, -2.42, -0.2]);
    const look = gaze(scene, `${name}Gaze`, root, eye, [0, -1, 0], 0.5, 0.2);
    const show = picture(scene, `${name}Picture`, root, mats, [0.5, 0.52, 0.25], 0.42, (card) => fill(scene, name, card, mats));
    function pose({ looking = 0, snap = 0 }) {
      look(looking);
      show(snap);
    }
    pose({});
    return { root, pose, face: true, fit: 0.75 };
  };
}
// MRO's picture: Curiosity under its parachute, with Mars far below.
const mroParachute = looksDown('mro', '#b9573a', [0, -0.3, 0.03], (scene, name, card, mats) => {
  box(scene, `${name}Sand`, card, tint(scene, `${name}SandPaint`, '#a8553c'), [0.4, 0.4, 0.002], [0, 0, 0.005]);
  ball(scene, `${name}Canopy`, card, mats.white, 0.15, [-0.03, 0.07, 0.012], [1, 0.62, 0.2]);
  ball(scene, `${name}Vent`, card, tint(scene, `${name}VentPaint`, '#c9a79a'), 0.03, [-0.03, 0.08, 0.026], [1, 0.62, 0.2]);
  drum(scene, `${name}Shell`, card, mats.silver, { height: 0.035, diameterTop: 0.02, diameterBottom: 0.05, tessellation: 12 }, [0.05, -0.1, 0.012], [-0.5, 1, 0]);
  for (const s of [-1, 1]) rod(scene, `${name}Line${s}`, card, mats.white, [-0.03 + s * 0.06, 0.04, 0.012], [0.045, -0.085, 0.012], 0.004, 3);
});
// LRO's picture: a lander's lower stage with its long shadow, and the paths walked from it.
const lroFootpaths = looksDown('lro', '#9c9a96', [0, -0.33, 0.03], (scene, name, card, mats) => {
  box(scene, `${name}Dust`, card, tint(scene, `${name}DustPaint`, '#8e8c88'), [0.4, 0.4, 0.002], [0, 0, 0.005]);
  const dark = tint(scene, `${name}TrackPaint`, '#55534f');
  for (const [k, x, y, d] of [[0, -0.12, 0.1, 0.07], [1, 0.13, -0.11, 0.05], [2, 0.1, 0.13, 0.04]]) drum(scene, `${name}Crater${k}`, card, dark, { height: 0.002, diameter: d, tessellation: 16 }, [x, y, 0.007], Z);
  box(scene, `${name}Shadow`, card, mats.black, [0.12, 0.022, 0.002], [0.075, -0.012, 0.008], [0, 0, -0.15]);
  box(scene, `${name}Stage`, card, mats.goldFoil, [0.03, 0.03, 0.01], [0, 0, 0.012], [0, 0, 0.78]);
  // The paths: thin dark lines out to where they set their instruments.
  let from = [0, 0];
  for (const [k, x, y] of [[0, -0.05, -0.05], [1, -0.12, -0.06], [2, -0.15, -0.12]]) {
    rod(scene, `${name}Path${k}`, card, dark, [from[0], from[1], 0.008], [x, y, 0.008], 0.006, 3);
    from = [x, y];
  }
  rod(scene, `${name}PathB`, card, dark, [0, 0, 0.008], [-0.04, 0.09, 0.008], 0.005, 3);
});

// Danuri braking into orbit: its engines burn at its back. (It goes round the Moon in the
// game, so the Moon itself is in the view.) flick: the time, for the flame's flicker.
function danuriArrives(scene, name, mats) {
  const { root } = based(scene, name, mats, 'danuri');
  const flame = drum(scene, `${name}Flame`, root, glow(scene, `${name}FlameLight`, '#ffd28a', 0.5), { height: 0.6, diameterTop: 0.05, diameterBottom: 0.2, tessellation: 14 }, [0, 0, -0.45], Z);

  function pose({ burn = 0, flick = 0 }) {
    flame.setEnabled(burn > 0);
    const f = 1 + 0.08 * Math.sin(flick * 23);
    flame.scaling.set(f, 1, f);
  }
  pose({});
  return { root, pose };
}

// Kepler watching one star: a planet goes round it and each time it crosses the line
// from the star to the telescope the light dips, a dot lower on the row of dots that
// grows beside it. planet: where it is across the line (-1 → 1), dots: how many are drawn.
// (A dot for every half second from the scene's eighth, a crossing every five seconds:
// core/craftScenes.js kepler.)
function keplerTransit(scene, name, mats) {
  const { root } = based(scene, name, mats, 'kepler');
  const star = [0, 1.25, 0];
  // A dark sheet behind it all: in the game Kepler is often seen before the Sun, where
  // a pale star and its beam were lost.
  box(scene, `${name}Night`, root, mats.black, [1.9, 1.15, 0.004], [-0.3, 0.98, -0.3]);
  ball(scene, `${name}Star`, root, glow(scene, `${name}StarLight`, '#fff0c0', 1), 0.42, star);
  ball(scene, `${name}Halo`, root, glow(scene, `${name}HaloLight`, '#ffe2a0', 0.2), 0.62, star);
  const light = glow(scene, `${name}BeamLight`, '#fff0c0', 0.2);
  drum(scene, `${name}Beam`, root, light, { height: 0.56, diameterTop: 0.12, diameterBottom: 0.3, tessellation: 16, cap: 0 }, [0, 0.8, 0]);
  const planet = ball(scene, `${name}Planet`, root, mats.black, 0.13);
  const DOTS = 30;
  const lit = glow(scene, `${name}DotLight`, '#9fe0ff', 1);
  const dots = Array.from({ length: DOTS }, (_, k) => {
    const x = (((k * 0.5) % 5) / 5) * 2 - 1;
    const dip = Math.abs(x) < 0.22 ? 0.07 : 0;
    // (Facing the watcher, the craft's +x is to their left: the row grows to their right.)
    return ball(scene, `${name}Dot${k}`, root, lit, 0.024, [-0.36 - 0.022 * k, 0.5 - dip, 0.1]);
  });
  box(scene, `${name}Axis`, root, mats.grey, [0.68, 0.004, 0.004], [-0.68, 0.38, 0.1]);

  function pose({ planet: across = 9, dots: drawn = 0 }) {
    planet.setEnabled(Math.abs(across) <= 1);
    planet.position.set(0.62 * across, 0.86, 0.02);
    light.alpha = Math.abs(across) < 0.22 ? 0.08 : 0.2;
    dots.forEach((dot, k) => dot.setEnabled(k < drawn));
  }
  pose({});
  return { root, pose, face: true, fit: 0.6, lift: -0.25 };
}

// Chandra's first picture: X-rays come down its tube, and the picture comes up: what
// is left of a star that blew up, rings of colour round a point in the middle.
function chandraFirstLight(scene, name, mats) {
  const { root } = based(scene, name, mats, 'chandra');
  const look = gaze(scene, `${name}Gaze`, root, [0, 0.46, 0], [0, 1, 0], 0.8, 0.26, '#c8b0ff');
  const show = picture(scene, `${name}Picture`, root, mats, [0.55, 0.62, 0.3], 0.46, (card) => {
    for (const [k, hex, d] of [[0, '#ff5a4a', 0.38], [1, '#58e08c', 0.32], [2, '#4a7cff', 0.26], [3, '#06060c', 0.18]]) drum(scene, `${name}Shell${k}`, card, glow(scene, `${name}ShellLight${k}`, hex, 1), { height: 0.002, diameter: d, tessellation: 22 + 3 * k }, [0.01 * k, 0.006 * k, 0.006 + 0.002 * k], Z);
    ball(scene, `${name}Point`, card, glow(scene, `${name}PointLight`, '#ffffff', 1), 0.022, [0.012, 0.004, 0.016]);
  });

  function pose({ looking = 0, snap = 0 }) {
    look(looking);
    show(snap);
  }
  pose({});
  return { root, pose, face: true, fit: 0.7, lift: -0.15 };
}

// Euclid's map of the sky: squares of sky, each with its few galaxies, come up one
// after another over it and join into a sheet. tiles: how many have come.
function euclidMosaic(scene, name, mats) {
  const { root } = based(scene, name, mats, 'euclid');
  const sky = tint(scene, `${name}SkyPaint`, '#0c1436');
  const far = glow(scene, `${name}GalaxyLight`, '#ffe9c0', 1);
  const blue = glow(scene, `${name}GalaxyBlue`, '#a8c8ff', 1);
  const tiles = Array.from({ length: 15 }, (_, k) => {
    const [col, row] = [k % 5, Math.floor(k / 5)];
    // Back and forth, as a field is swept.
    const x = (row % 2 ? 4 - col : col) * 0.2 - 0.4;
    const tile = group(scene, `${name}Tile${k}`, root, [x, 0.72 + 0.2 * row, -0.05]);
    box(scene, `${name}TileSky${k}`, tile, sky, [0.192, 0.192, 0.006]);
    for (let j = 0; j < 4; j++) {
      const a = k * 2.4 + j * 1.9;
      ball(scene, `${name}Galaxy${k}${j}`, tile, j % 2 ? blue : far, 0.012 + 0.012 * ((k * 0.37 + j * 0.61) % 1), [0.07 * Math.cos(a), 0.07 * Math.sin(a * 1.3), 0.006], [1.6, 0.8, 0.3]);
    }
    return tile;
  });

  function pose({ tiles: come = 0 }) {
    tiles.forEach((tile, k) => {
      const shown = clamp((come - k) * 3);
      tile.setEnabled(shown > 0);
      tile.scaling.setAll(Math.max(0.01, smooth(shown)));
    });
  }
  pose({});
  return { root, pose, face: true, fit: 0.58, lift: -0.3 };
}

// Tiangong built up: the core, the first crew's ship, and the two labs from either side.
const TIANGONG_GROUPS = [['core', [0, 0, -1.4]], ['crew', [0, 0, 1.4]], ['wentian', [-1.4, 0, 0]], ['mengtian', [1.4, 0, 0]]];
function tiangongAssembly(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const stage = Object.fromEntries(TIANGONG_GROUPS.map(([key]) => [key, group(scene, `${name}_${key}`, root)]));
  CRAFT_BUILD.tiangong(scene, `${name}Parts`, mats, stage).dispose();
  for (const node of Object.values(stage)) fuse(scene, node);

  function pose({ built = 0 }) {
    TIANGONG_GROUPS.forEach(([key, from], i) => {
      const come = clamp(built - i);
      stage[key].setEnabled(come > 0);
      const left = 1 - smooth(come);
      stage[key].position.set(from[0] * left, from[1] * left, from[2] * left);
    });
  }
  pose({});
  return { root, pose };
}

export const CRAFT_UNFOLD_ALL = {
  ...CRAFT_UNFOLD,
  voyager2: neptuneGoesBy,
  pioneer10: jupiterGoesBy,
  pioneer11: saturnGoesBy,
  newHorizons: arrokothGoesBy,
  europaClipper: marsGoesBy,
  lucy: dinkineshGoesBy,
  mro: mroParachute,
  lro: lroFootpaths,
  danuri: danuriArrives,
  kepler: keplerTransit,
  chandra: chandraFirstLight,
  euclid: euclidMosaic,
  tiangong: tiangongAssembly,
  voyager1: voyagerPortrait,
  hubble: hubbleService,
  iss: issAssembly,
  sputnik: sputnikLeaves,
  parker: parkerCorona,
  cassini: huygensLeaves,
  roadster: roadsterReveal,
  juno: junoArrives,
};
