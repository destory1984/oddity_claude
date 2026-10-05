import { TransformNode, CreateSphere, StandardMaterial, Color3 } from './babylon.js';
import { part, cyl, group, box, drum, rod, fuse } from './craftParts.js';
import { CRAFT_BUILD, CRAFT_UNFOLD } from './craftModels.js';
import { astronaut } from './siteModels.js';

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

// Hubble being mended: the shuttle comes up under its aft end, two people float out to
// the telescope, a box the size of a phone booth goes in, and the shuttle backs away.
// (The shuttle is drawn at half its true size beside the telescope, to fit the view.)
// The scene faces the watcher (render/craft.js `face`): the shuttle is seen from its side.
function hubbleService(scene, name, mats) {
  const { root } = based(scene, name, mats, 'hubble');
  const shuttle = group(scene, `${name}Shuttle`, root);
  box(scene, `${name}Body`, shuttle, mats.white, [1.2, 0.18, 0.22]);
  box(scene, `${name}Belly`, shuttle, mats.black, [1.2, 0.03, 0.225], [0, -0.1, 0]);
  drum(scene, `${name}Nose`, shuttle, mats.white, { height: 0.2, diameterTop: 0.06, diameterBottom: 0.2, tessellation: 16 }, [0.7, -0.005, 0], [1, 0, 0]);
  drum(scene, `${name}NoseTip`, shuttle, mats.black, { height: 0.05, diameterTop: 0.01, diameterBottom: 0.06, tessellation: 16 }, [0.825, -0.005, 0], [1, 0, 0]);
  box(scene, `${name}Windows`, shuttle, mats.dark, [0.07, 0.04, 0.16], [0.56, 0.085, 0]);
  box(scene, `${name}Fin`, shuttle, mats.white, [0.22, 0.26, 0.02], [-0.5, 0.2, 0], [0, 0, 0.35]);
  box(scene, `${name}Wings`, shuttle, mats.white, [0.5, 0.02, 0.72], [-0.32, -0.08, 0]);
  box(scene, `${name}WingsUnder`, shuttle, mats.black, [0.5, 0.012, 0.722], [-0.32, -0.095, 0]);
  box(scene, `${name}Bay`, shuttle, mats.dark, [0.62, 0.012, 0.18], [-0.02, 0.092, 0]);
  for (const s of [-1, 1]) {
    box(scene, `${name}Door${s}`, shuttle, mats.silver, [0.62, 0.008, 0.1], [-0.02, 0.12, s * 0.15], [s * 0.7, 0, 0]);
    drum(scene, `${name}Pod${s}`, shuttle, mats.white, { height: 0.18, diameter: 0.07, tessellation: 12 }, [-0.56, 0.1, s * 0.07], [1, 0, 0]);
  }
  for (const [y, z] of [[0.04, 0], [-0.04, 0.05], [-0.04, -0.05]]) drum(scene, `${name}Bell${y}${z}`, shuttle, mats.dark, { height: 0.07, diameterTop: 0.04, diameterBottom: 0.08, tessellation: 12 }, [-0.635, y, z], [1, 0, 0]);
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

export const CRAFT_UNFOLD_ALL = {
  ...CRAFT_UNFOLD,
  voyager1: voyagerPortrait,
  hubble: hubbleService,
  iss: issAssembly,
  sputnik: sputnikLeaves,
  parker: parkerCorona,
  cassini: huygensLeaves,
  roadster: roadsterReveal,
  juno: junoArrives,
};
