import { TransformNode, CreateSphere, CreatePlane, DynamicTexture, Texture, StandardMaterial, Color3 } from './babylon.js';
import { t } from '../core/i18n.js';
import { CRAFT_BUILD } from './craftModels.js';
import { LANDMARKS } from '../core/landmarkScenes.js';
import { LANDER_TEXTS } from '../core/landerTexts.js';
import {
  QUARTER, part, cyl, group, aim, box, drum, rod, dish, wing, rtg, nozzle, truss, fuse,
} from './craftParts.js';

// What stands at the story places on the Moon, Mars and Titan, and at Earth's two launch
// pads: the landers and rovers themselves and the rockets on their pads, each about one unit across with its feet at y = 0 and +y up, away from
// the ground. Built from the parts in craftParts.js, like the craft in orbit.

const sphere = (scene, name, parent, material, diameter, position, scaling = [1, 1, 1]) => part(
  CreateSphere(name, { diameter, segments: 12 }, scene), parent, material, position, [0, 0, 0], scaling,
);
const round = (count, r, turn = 0) => Array.from({ length: count }, (_, k) => {
  const a = turn + (k * 2 * Math.PI) / count;
  return [Math.cos(a) * r, Math.sin(a) * r, a];
});

// Landing legs: a main strut from the body down to a footpad, with two side braces.
function legs(scene, name, parent, mats, count, { top, foot, height, turn = 0.785, pad = 0.1 }) {
  for (const [x, z, a] of round(count, 1, turn)) {
    const hip = [x * top, height, z * top];
    const toe = [x * foot, 0.02, z * foot];
    rod(scene, `${name}Leg${a}`, parent, mats.grey, hip, toe, 0.024, 6);
    for (const s of [-1, 1]) {
      const b = a + s * 0.5;
      rod(scene, `${name}Brace${a}${s}`, parent, mats.grey, [Math.cos(b) * top, height * 0.45, Math.sin(b) * top], [toe[0] * 0.8, toe[1] + height * 0.25, toe[2] * 0.8], 0.012, 4);
    }
    drum(scene, `${name}Pad${a}`, parent, mats.goldFoil, { height: 0.016, diameterTop: pad * 0.7, diameterBottom: pad, tessellation: 12 }, [toe[0], 0.008, toe[2]]);
  }
}

function flag(scene, name, parent, mats, at) {
  rod(scene, `${name}Pole`, parent, mats.grey, at, [at[0], at[1] + 0.46, at[2]], 0.012, 5);
  rod(scene, `${name}Bar`, parent, mats.grey, [at[0], at[1] + 0.455, at[2]], [at[0] + 0.2, at[1] + 0.455, at[2]], 0.008, 4);
  box(scene, `${name}Flag`, parent, mats.white, [0.2, 0.12, 0.005], [at[0] + 0.1, at[1] + 0.39, at[2]]);
  box(scene, `${name}Canton`, parent, mats.solar, [0.08, 0.065, 0.007], [at[0] + 0.04, at[1] + 0.4175, at[2]]);
  for (let k = 0; k < 4; k++) box(scene, `${name}Stripe${k}`, parent, mats.red, [k < 2 ? 0.12 : 0.2, 0.012, 0.007], [at[0] + (k < 2 ? 0.14 : 0.1), at[1] + 0.438 - k * 0.03, at[2]]);
}

// The Apollo Lunar Module: the eight-sided descent stage in gold foil on four legs
// with the ladder down the front one, and the angular ascent stage with its two
// triangular windows, hatch, thruster quads, radar dish and antennas. A flag beside it.
// stage: 'descent' or 'ascent' builds only that half (the scene of Apollo 17 leaving).
function apollo(scene, name, mats, { withFlag = true, stage = 'both' } = {}) {
  const root = new TransformNode(name, scene);
  if (stage !== 'ascent') {
  drum(scene, `${name}Descent`, root, mats.goldFoil, { height: 0.2, diameter: 0.5, tessellation: 8 }, [0, 0.3, 0], null).rotation.y = Math.PI / 8;
  drum(scene, `${name}DescentTop`, root, mats.blackFoil, { height: 0.012, diameter: 0.5, tessellation: 8 }, [0, 0.404, 0]).rotation.y = Math.PI / 8;
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0.21, 0], [0, -1, 0], 0.12, 0.16);
  legs(scene, `${name}Gear`, root, mats, 4, { top: 0.22, foot: 0.47, height: 0.36, turn: 0 });
  // The ladder on the front (+z... the leg at angle 0 is +x) leg, and the porch above it.
  for (let k = 0; k < 6; k++) box(scene, `${name}Rung${k}`, root, mats.grey, [0.012, 0.008, 0.07], [0.27 + k * 0.03, 0.34 - k * 0.05, 0]);
  box(scene, `${name}Porch`, root, mats.grey, [0.08, 0.01, 0.09], [0.23, 0.41, 0]);
  if (withFlag) flag(scene, `${name}Flag`, root, mats, [0.62, 0, 0.3]);
  }
  if (stage === 'descent') return fuse(scene, root);
  // Ascent stage: a boxy cabin with a faceted face, grey and gold.
  const cabin = group(scene, `${name}Cabin`, root, [0, 0.53, 0]);
  drum(scene, `${name}Hull`, cabin, mats.foil, { height: 0.26, diameter: 0.3, tessellation: 8 }, [0, 0, 0], [1, 0, 0]);
  box(scene, `${name}Face`, cabin, mats.plate, [0.08, 0.2, 0.22], [0.15, 0.0, 0]);
  box(scene, `${name}Hatch`, cabin, mats.dark, [0.006, 0.08, 0.08], [0.192, -0.06, 0]);
  for (const s of [-1, 1]) {
    box(scene, `${name}Window${s}`, cabin, mats.black, [0.006, 0.06, 0.06], [0.192, 0.05, s * 0.07], [0.6 * s, 0, 0]);
    box(scene, `${name}Tank${s}`, cabin, mats.goldFoil, [0.14, 0.12, 0.08], [-0.03, -0.03, s * 0.17]);
    // Thruster quads on outriggers at the four corners.
    for (const f of [-1, 1]) {
      const at = [f * 0.13, 0.06, s * 0.2];
      rod(scene, `${name}Outrigger${s}${f}`, cabin, mats.grey, [f * 0.1, 0.03, s * 0.15], at, 0.012, 4);
      for (const [dx, dy, dz] of [[0, 1, 0], [0, -1, 0], [f, 0, 0], [0, 0, s]]) nozzle(scene, `${name}Quad${s}${f}${dx}${dy}${dz}`, cabin, mats.dark, at, [dx, dy, dz], 0.03, 0.025);
    }
  }
  drum(scene, `${name}Tunnel`, cabin, mats.grey, { height: 0.03, diameter: 0.1, tessellation: 12 }, [0, 0.16, 0]);
  dish(scene, `${name}Radar`, cabin, mats, { at: [0.12, 0.17, 0], toward: [1, 0.6, 0], diameter: 0.08 });
  dish(scene, `${name}Sband`, cabin, mats, { at: [-0.1, 0.24, 0.1], toward: [-0.3, 1, 0.2], diameter: 0.09 });
  rod(scene, `${name}SbandMast`, cabin, mats.grey, [-0.08, 0.13, 0.08], [-0.1, 0.24, 0.1], 0.01, 4);
  rod(scene, `${name}Vhf`, cabin, mats.chrome, [-0.05, 0.15, -0.1], [-0.07, 0.34, -0.14], 0.006, 4);
  if (stage === 'ascent') nozzle(scene, `${name}AscentEngine`, cabin, mats.dark, [0, -0.1, 0], [0, -1, 0], 0.07, 0.09);
  return fuse(scene, root);
}

// Surveyor: an open tripod frame with three legs, tanks and boxes slung in it, and a
// mast holding a flat solar panel and a flat antenna above. The camera looks out from
// under a mirror hood.
function surveyor(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const corners = round(3, 0.2, 0.5).map(([x, z]) => [x, 0.26, z]);
  for (let k = 0; k < 3; k++) {
    rod(scene, `${name}Frame${k}`, root, mats.chrome, corners[k], corners[(k + 1) % 3], 0.016, 5);
    rod(scene, `${name}Rise${k}`, root, mats.chrome, corners[k], [0, 0.5, 0], 0.014, 5);
    sphere(scene, `${name}Tank${k}`, root, mats.white, 0.1, [corners[k][0] * 0.5, 0.3, corners[k][2] * 0.5]);
    nozzle(scene, `${name}Vernier${k}`, root, mats.dark, [corners[k][0] * 0.75, 0.24, corners[k][2] * 0.75], [0, -1, 0], 0.05, 0.04);
  }
  legs(scene, `${name}Gear`, root, mats, 3, { top: 0.2, foot: 0.46, height: 0.27, turn: 0.5, pad: 0.11 });
  for (const s of [-1, 1]) box(scene, `${name}Box${s}`, root, mats.goldFoil, [0.1, 0.12, 0.08], [s * 0.1, 0.33, -0.06 * s]);
  rod(scene, `${name}Mast`, root, mats.chrome, [0, 0.5, 0], [0, 0.82, 0], 0.016, 6);
  box(scene, `${name}Solar`, root, mats.cells, [0.26, 0.2, 0.008], [-0.15, 0.84, 0], [0.5, 0, 0.3]);
  box(scene, `${name}SolarBack`, root, mats.silver, [0.26, 0.2, 0.004], [-0.15, 0.835, 0.004], [0.5, 0, 0.3]);
  box(scene, `${name}Antenna`, root, mats.white, [0.24, 0.24, 0.008], [0.16, 0.84, 0], [-0.6, 0, -0.3]);
  drum(scene, `${name}Camera`, root, mats.white, { height: 0.12, diameter: 0.05 }, [0.08, 0.44, 0.12], [0.2, 1, 0.3]);
  drum(scene, `${name}Hood`, root, mats.chrome, { height: 0.04, diameterTop: 0.08, diameterBottom: 0.05 }, [0.096, 0.51, 0.14], [0.2, 1, 0.3]);
  for (const s of [-1, 1]) rod(scene, `${name}Omni${s}`, root, mats.chrome, [s * 0.1, 0.3, 0.1], [s * 0.4, 0.42, 0.25], 0.008, 4);
  return fuse(scene, root);
}

// A boxy modern lander on four legs with solar panels folded out from its top deck, a
// dish, and a ramp for the rover it carried (Chang'e 3 and 4, Chandrayaan-3, Blue Ghost).
// ascender: the sample-return ones (Chang'e 5 and 6) carry a small rocket on top instead
// ('gone': the deck it stood on, bare, for the scene in which it leaves).
function deckLander(scene, name, mats, { ascender = false, skin = 'goldFoil', ramp = true } = {}) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Body`, root, mats[skin], { height: 0.2, diameter: 0.5, tessellation: 8 }, [0, 0.3, 0]).rotation.y = Math.PI / 8;
  box(scene, `${name}Deck`, root, mats.plate, [0.36, 0.012, 0.36], [0, 0.406, 0]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0.21, 0], [0, -1, 0], 0.1, 0.14);
  legs(scene, `${name}Gear`, root, mats, 4, { top: 0.22, foot: 0.45, height: 0.34 });
  for (const [x, z] of round(4, 0.2, 0)) sphere(scene, `${name}Tank${x}${z}`, root, mats.white, 0.09, [x, 0.3, z]);
  if (ascender) {
    if (ascender !== 'gone') drum(scene, `${name}Ascender`, root, mats.plate, { height: 0.18, diameter: 0.2, tessellation: 8 }, [0, 0.5, 0]);
    if (ascender !== 'gone') drum(scene, `${name}AscenderTop`, root, mats.goldFoil, { height: 0.04, diameterTop: 0.1, diameterBottom: 0.2, tessellation: 8 }, [0, 0.61, 0]);
    // The sampling arm that scooped the ground.
    rod(scene, `${name}Arm0`, root, mats.chrome, [0.17, 0.41, 0.1], [0.34, 0.5, 0.2], 0.012, 5);
    rod(scene, `${name}Arm1`, root, mats.chrome, [0.34, 0.5, 0.2], [0.46, 0.1, 0.28], 0.012, 5);
  } else {
    box(scene, `${name}Top`, root, mats.goldFoil, [0.2, 0.08, 0.2], [0, 0.45, 0]);
    dish(scene, `${name}Dish`, root, mats, { at: [0.1, 0.56, -0.1], toward: [0.3, 1, -0.2], diameter: 0.13 });
    rod(scene, `${name}DishMast`, root, mats.grey, [0.1, 0.49, -0.1], [0.1, 0.56, -0.1], 0.012, 4);
    rod(scene, `${name}Mast`, root, mats.grey, [-0.1, 0.49, 0.1], [-0.1, 0.7, 0.1], 0.012, 4);
    box(scene, `${name}MastCamera`, root, mats.white, [0.05, 0.04, 0.04], [-0.1, 0.72, 0.1]);
  }
  for (const s of [-1, 1]) wing(scene, `${name}Wing${s}`, root, mats, { from: [0, 0.41, s * 0.18], to: [0, 0.5, s * 0.5], width: 0.3, panels: 1, face: [0, 1, -s * 0.3], yoke: 0.08 });
  if (ramp) {
    for (const s of [-1, 1]) rod(scene, `${name}Ramp${s}`, root, mats.grey, [0.2, 0.4, s * 0.06], [0.62, 0.02, s * 0.06], 0.014, 4);
  }
  return fuse(scene, root);
}

// Luna 16 and 24, the Soviet sample-return landers: a ring of four round tanks on four
// legs, and standing on it the return rocket with its ball-shaped capsule on top.
// stage: 'lander' or 'rocket' builds only that part (the scene of Luna 16 leaving).
function lunaReturn(scene, name, mats, { stage = 'both' } = {}) {
  const root = new TransformNode(name, scene);
  if (stage !== 'lander') {
    drum(scene, `${name}Rocket`, root, mats.plate, { height: 0.24, diameter: 0.14, tessellation: 14 }, [0, 0.52, 0]);
    for (const [x, z] of round(3, 0.09, 0.3)) sphere(scene, `${name}RocketTank${x}`, root, mats.foil, 0.09, [x, 0.46, z]);
    sphere(scene, `${name}Capsule`, root, mats.chrome, 0.12, [0, 0.7, 0]);
    for (const s of [-1, 1]) rod(scene, `${name}Whip${s}`, root, mats.chrome, [s * 0.05, 0.64, 0], [s * 0.3, 0.86, -0.1], 0.006, 4);
    if (stage === 'rocket') {
      nozzle(scene, `${name}RocketEngine`, root, mats.dark, [0, 0.4, 0], [0, -1, 0], 0.06, 0.08);
      return fuse(scene, root);
    }
  }
  for (const [x, z] of round(4, 0.14, 0.785)) sphere(scene, `${name}Tank${x}${z}`, root, mats.foil, 0.2, [x, 0.3, z]);
  drum(scene, `${name}Ring`, root, mats.grey, { height: 0.03, diameter: 0.42, tessellation: 16 }, [0, 0.3, 0]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0.22, 0], [0, -1, 0], 0.12, 0.13);
  legs(scene, `${name}Gear`, root, mats, 4, { top: 0.2, foot: 0.44, height: 0.3, turn: 0 });
  rod(scene, `${name}Drill0`, root, mats.chrome, [0.12, 0.4, 0.1], [0.3, 0.5, 0.22], 0.014, 5);
  rod(scene, `${name}Drill1`, root, mats.chrome, [0.3, 0.5, 0.22], [0.4, 0.04, 0.3], 0.014, 5);
  return fuse(scene, root);
}

// Viking: a six-sided body on three legs, a dish on a mast, two power units under
// wind covers, the two cameras standing like cans, the weather boom and the long arm
// that dug the trenches.
function viking(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Body`, root, mats.plate, { height: 0.12, diameter: 0.5, tessellation: 6 }, [0, 0.3, 0]);
  drum(scene, `${name}Deck`, root, mats.white, { height: 0.01, diameter: 0.51, tessellation: 6 }, [0, 0.364, 0]);
  legs(scene, `${name}Gear`, root, mats, 3, { top: 0.22, foot: 0.44, height: 0.3, turn: 0.52, pad: 0.12 });
  for (const s of [-1, 1]) {
    box(scene, `${name}Cover${s}`, root, mats.white, [0.14, 0.12, 0.16], [-0.1, 0.43, s * 0.14]);
    drum(scene, `${name}Camera${s}`, root, mats.white, { height: 0.14, diameter: 0.045 }, [0.12, 0.44, s * 0.1]);
    box(scene, `${name}Slit${s}`, root, mats.black, [0.006, 0.05, 0.012], [0.143, 0.47, s * 0.1]);
    for (const [x, z] of round(2, 0.2, 0.3 * s)) sphere(scene, `${name}Fuel${s}${x}`, root, mats.goldFoil, 0.12, [x * 0.4, 0.25, s * 0.2 + z * 0.2]);
  }
  rod(scene, `${name}Mast`, root, mats.grey, [0.0, 0.37, -0.02], [0.0, 0.62, -0.02], 0.016, 6);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0.64, -0.02], toward: [0.4, 1, 0.2], diameter: 0.24 });
  rod(scene, `${name}Weather0`, root, mats.grey, [0.2, 0.36, -0.14], [0.36, 0.5, -0.3], 0.01, 4);
  box(scene, `${name}Weather`, root, mats.white, [0.03, 0.05, 0.03], [0.37, 0.52, -0.31]);
  rod(scene, `${name}Arm`, root, mats.chrome, [0.22, 0.38, 0.05], [0.62, 0.12, 0.2], 0.014, 5);
  box(scene, `${name}Scoop`, root, mats.grey, [0.05, 0.04, 0.04], [0.63, 0.1, 0.2]);
  for (const [x, z] of round(3, 0.14, 1.5)) nozzle(scene, `${name}Engine${x}`, root, mats.dark, [x, 0.25, z], [0, -1, 0], 0.05, 0.07);
  return fuse(scene, root);
}

// Phoenix and InSight: a round deck on three legs with a ten-sided solar fan to each
// side, a mast, and an arm. insight: the arm has set a domed seismometer on the ground.
function fanLander(scene, name, mats, { insight = false } = {}) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Body`, root, mats.goldFoil, { height: 0.1, diameter: 0.34, tessellation: 12 }, [0, 0.26, 0]);
  drum(scene, `${name}Deck`, root, mats.plate, { height: 0.012, diameter: 0.36, tessellation: 12 }, [0, 0.316, 0]);
  legs(scene, `${name}Gear`, root, mats, 3, { top: 0.14, foot: 0.3, height: 0.25, turn: 0.52, pad: 0.08 });
  for (const s of [-1, 1]) {
    drum(scene, `${name}Fan${s}`, root, mats.cells, { height: 0.006, diameter: 0.42, tessellation: 10 }, [0, 0.33, s * 0.38]);
    drum(scene, `${name}FanBack${s}`, root, mats.silver, { height: 0.006, diameter: 0.42, tessellation: 10 }, [0, 0.324, s * 0.38]);
    for (const [x, z, a] of round(10, 0.21, 0.314)) rod(scene, `${name}Rib${s}${a}`, root, mats.grey, [0, 0.335, s * 0.38], [x, 0.335, s * 0.38 + z], 0.005, 3);
    rod(scene, `${name}FanArm${s}`, root, mats.grey, [0, 0.32, s * 0.15], [0, 0.325, s * 0.2], 0.02, 5);
  }
  box(scene, `${name}Box0`, root, mats.white, [0.1, 0.07, 0.1], [-0.06, 0.36, -0.03]);
  box(scene, `${name}Box1`, root, mats.goldFoil, [0.07, 0.05, 0.08], [0.07, 0.35, 0.06]);
  rod(scene, `${name}Mast`, root, mats.grey, [0.08, 0.32, -0.08], [0.08, 0.62, -0.08], 0.012, 5);
  box(scene, `${name}MastHead`, root, mats.white, [0.05, 0.03, 0.03], [0.08, 0.63, -0.08]);
  rod(scene, `${name}Antenna`, root, mats.chrome, [-0.1, 0.32, 0.08], [-0.1, 0.48, 0.08], 0.01, 4);
  rod(scene, `${name}Arm0`, root, mats.chrome, [0.14, 0.33, 0], [0.3, 0.5, 0.04], 0.014, 5);
  rod(scene, `${name}Arm1`, root, mats.chrome, [0.3, 0.5, 0.04], [0.48, 0.12, 0.06], 0.014, 5);
  if (insight) {
    drum(scene, `${name}Seismometer`, root, mats.white, { height: 0.06, diameterTop: 0.08, diameterBottom: 0.14, tessellation: 16 }, [0.5, 0.03, 0.08]);
    rod(scene, `${name}Tether`, root, mats.goldFoil, [0.16, 0.3, 0.02], [0.46, 0.03, 0.08], 0.008, 4);
    box(scene, `${name}Mole`, root, mats.dark, [0.04, 0.1, 0.04], [0.42, 0.05, -0.12]);
  } else {
    box(scene, `${name}Scoop`, root, mats.grey, [0.05, 0.04, 0.04], [0.49, 0.1, 0.06]);
  }
  return fuse(scene, root);
}

// Mars Pathfinder: the lander's three petals lying open like a flower with the base in
// the middle, the deflated airbags round them, a camera mast, and the little Sojourner
// rover out on the ground. stowed: on the day it landed, the rover still rides on a petal.
function pathfinder(scene, name, mats, { stowed = false } = {}) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Base`, root, mats.cells, { height: 0.02, diameter: 0.36, tessellation: 3 }, [0, 0.06, 0]);
  for (const [x, z, a] of round(3, 0.27, 1.047)) {
    const petal = drum(scene, `${name}Petal${a}`, root, mats.cells, { height: 0.016, diameter: 0.36, tessellation: 3 }, [x, 0.045, z]);
    petal.rotation.y = Math.PI;
    sphere(scene, `${name}Bag${a}`, root, mats.white, 0.3, [x * 1.25, 0.02, z * 1.25], [1, 0.22, 1]);
  }
  box(scene, `${name}Electronics`, root, mats.goldFoil, [0.14, 0.09, 0.12], [0, 0.11, 0]);
  rod(scene, `${name}Mast`, root, mats.grey, [0.03, 0.15, 0.02], [0.03, 0.48, 0.02], 0.014, 5);
  drum(scene, `${name}Camera`, root, mats.white, { height: 0.05, diameter: 0.06 }, [0.03, 0.5, 0.02]);
  rod(scene, `${name}Antenna`, root, mats.chrome, [-0.04, 0.15, -0.03], [-0.04, 0.34, -0.03], 0.008, 4);
  dish(scene, `${name}Dish`, root, mats, { at: [-0.08, 0.22, 0.05], toward: [-0.4, 1, 0.3], diameter: 0.1, feed: false });
  // Sojourner: the size of a microwave oven, six wheels, a solar panel for a roof.
  const [petalX, petalZ] = round(3, 0.27, 1.047)[0];
  const rover = stowed ? group(scene, `${name}Rover`, root, [petalX, 0.055, petalZ], [0, 1.047, 0]) : group(scene, `${name}Rover`, root, [0.5, 0, -0.28], [0, 0.6, 0]);
  box(scene, `${name}RoverBody`, rover, mats.goldFoil, [0.14, 0.04, 0.09], [0, 0.07, 0]);
  box(scene, `${name}RoverPanel`, rover, mats.cells, [0.15, 0.006, 0.1], [0, 0.094, 0]);
  for (const s of [-1, 1]) for (const x of [-0.055, 0, 0.055]) drum(scene, `${name}RoverWheel${s}${x}`, rover, mats.dark, { height: 0.025, diameter: 0.045, tessellation: 10 }, [x, 0.0225, s * 0.06], [0, 0, 1]);
  rod(scene, `${name}RoverWhip`, rover, mats.chrome, [-0.06, 0.09, 0.03], [-0.06, 0.2, 0.03], 0.005, 4);
  return fuse(scene, root);
}

// A rover: a body on six wheels hung from rocker-bogie arms (or eight on a tub, for
// the Lunokhods), with a camera mast, a robot arm and its power.
// power: 'wings' (Spirit and Opportunity's swept solar deck), 'butterfly' (Zhurong's
// four panels), 'lid' (the Lunokhods' hinged solar lid) or 'rtg' (Curiosity,
// Perseverance: a finned power unit slanting up at the back). helicopter: Ingenuity.
function rover(scene, name, mats, { power = 'wings', helicopter = false } = {}) {
  const root = new TransformNode(name, scene);
  const tub = power === 'lid';
  const perSide = tub ? 4 : 3;
  const reach = tub ? 0.27 : 0.23;
  for (const s of [-1, 1]) {
    const xs = Array.from({ length: perSide }, (_, k) => -reach + (2 * reach * k) / (perSide - 1));
    for (const x of xs) {
      drum(scene, `${name}Wheel${s}${x}`, root, mats.dark, { height: 0.06, diameter: 0.15, tessellation: 14 }, [x, 0.075, s * 0.22], [0, 0, 1]);
      drum(scene, `${name}Hub${s}${x}`, root, mats.grey, { height: 0.064, diameter: 0.07, tessellation: 8 }, [x, 0.075, s * 0.22], [0, 0, 1]);
      // Cleats: a few bars across the tread.
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        box(scene, `${name}Cleat${s}${x}${k}`, root, mats.grey, [0.012, 0.012, 0.062], [x + Math.cos(a) * 0.074, 0.075 + Math.sin(a) * 0.074, s * 0.22], [0, 0, a]);
      }
    }
    if (tub) {
      rod(scene, `${name}Axle${s}`, root, mats.grey, [-reach, 0.075, s * 0.19], [reach, 0.075, s * 0.19], 0.02, 5);
    } else {
      // Rocker-bogie: one arm from the body to the front wheel, a rocking pair behind.
      const pivot = [0.02, 0.2, s * 0.19];
      rod(scene, `${name}Rocker${s}`, root, mats.chrome, pivot, [reach, 0.09, s * 0.19], 0.02, 5);
      rod(scene, `${name}RockerBack${s}`, root, mats.chrome, pivot, [-reach * 0.5, 0.15, s * 0.19], 0.02, 5);
      rod(scene, `${name}Bogie${s}a`, root, mats.chrome, [-reach * 0.5, 0.15, s * 0.19], [0, 0.09, s * 0.19], 0.018, 5);
      rod(scene, `${name}Bogie${s}b`, root, mats.chrome, [-reach * 0.5, 0.15, s * 0.19], [-reach, 0.09, s * 0.19], 0.018, 5);
    }
  }
  if (tub) {
    drum(scene, `${name}Tub`, root, mats.foil, { height: 0.16, diameterTop: 0.48, diameterBottom: 0.36, tessellation: 18 }, [0, 0.24, 0]);
    drum(scene, `${name}TubRim`, root, mats.grey, { height: 0.012, diameter: 0.49, tessellation: 18 }, [0, 0.322, 0]);
    const lid = group(scene, `${name}LidHinge`, root, [-0.24, 0.33, 0], [0, 0, -1.9]);
    drum(scene, `${name}Lid`, lid, mats.cells, { height: 0.01, diameter: 0.46, tessellation: 18 }, [0.23, 0, 0]);
    drum(scene, `${name}LidBack`, lid, mats.foil, { height: 0.01, diameter: 0.47, tessellation: 18 }, [0.23, -0.01, 0]);
    // The eyes at the front, the cone antenna and the laser reflector.
    for (const s of [-1, 1]) drum(scene, `${name}Eye${s}`, root, mats.black, { height: 0.03, diameter: 0.04 }, [0.24, 0.24, s * 0.06], [1, 0, 0]);
    drum(scene, `${name}Cone`, root, mats.chrome, { height: 0.12, diameterTop: 0.01, diameterBottom: 0.06, tessellation: 10 }, [0.16, 0.39, 0.14], [0.4, 1, 0.2]);
    box(scene, `${name}Reflector`, root, mats.gold, [0.03, 0.05, 0.1], [0.27, 0.31, 0]);
    rod(scene, `${name}Whip`, root, mats.chrome, [0.1, 0.33, -0.16], [0.2, 0.62, -0.26], 0.006, 4);
    return fuse(scene, root);
  }
  box(scene, `${name}Body`, root, power === 'rtg' ? mats.plate : mats.goldFoil, [0.42, 0.11, 0.26], [0, 0.23, 0]);
  box(scene, `${name}Belly`, root, mats.dark, [0.4, 0.02, 0.24], [0, 0.17, 0]);
  if (power === 'wings') {
    box(scene, `${name}Deck`, root, mats.cells, [0.44, 0.01, 0.3], [-0.01, 0.292, 0]);
    for (const s of [-1, 1]) {
      box(scene, `${name}WingFront${s}`, root, mats.cells, [0.2, 0.01, 0.16], [0.1, 0.292, s * 0.22], [0, s * 0.35, 0]);
      box(scene, `${name}WingBack${s}`, root, mats.cells, [0.22, 0.01, 0.14], [-0.2, 0.292, s * 0.16], [0, -s * 0.5, 0]);
    }
    box(scene, `${name}Tail`, root, mats.cells, [0.14, 0.01, 0.2], [-0.29, 0.292, 0]);
  } else if (power === 'butterfly') {
    box(scene, `${name}Deck`, root, mats.cells, [0.4, 0.01, 0.24], [0, 0.292, 0]);
    for (const s of [-1, 1]) for (const f of [-1, 1]) box(scene, `${name}Petal${s}${f}`, root, mats.cells, [0.2, 0.01, 0.2], [f * 0.11, 0.3, s * 0.23], [s * 0.25, f * s * 0.25, 0]);
  } else {
    box(scene, `${name}Deck`, root, mats.white, [0.43, 0.01, 0.27], [0, 0.29, 0]);
    rtg(scene, `${name}Power`, root, mats, [-0.2, 0.3, 0], [-0.36, 0.42, 0], 0.1);
    box(scene, `${name}Fins`, root, mats.white, [0.14, 0.1, 0.004], [-0.27, 0.35, 0.07], [0, 0, -0.64]);
    box(scene, `${name}Fins2`, root, mats.white, [0.14, 0.1, 0.004], [-0.27, 0.35, -0.07], [0, 0, -0.64]);
  }
  // The mast with its camera head: two eyes and the laser's round window between.
  rod(scene, `${name}Mast`, root, mats.grey, [0.16, 0.29, 0.08], [0.16, 0.6, 0.08], 0.022, 6);
  box(scene, `${name}Head`, root, mats.white, [0.07, 0.07, 0.16], [0.17, 0.635, 0.08]);
  for (const s of [-1, 1]) drum(scene, `${name}Eye${s}`, root, mats.black, { height: 0.01, diameter: 0.025 }, [0.207, 0.63, 0.08 + s * 0.055], [1, 0, 0]);
  drum(scene, `${name}Laser`, root, mats.black, { height: 0.01, diameter: 0.04 }, [0.207, 0.645, 0.08], [1, 0, 0]);
  // Antennas: a hexagon that tracks Earth, and a short stub.
  drum(scene, `${name}Hga`, root, mats.gold, { height: 0.012, diameter: 0.13, tessellation: 6 }, [-0.1, 0.38, -0.08], [0.3, 1, -0.3]);
  rod(scene, `${name}HgaArm`, root, mats.grey, [-0.1, 0.29, -0.08], [-0.1, 0.37, -0.08], 0.012, 4);
  drum(scene, `${name}Uhf`, root, mats.grey, { height: 0.09, diameter: 0.03, tessellation: 8 }, [-0.16, 0.335, 0.09]);
  // The arm, folded forward with its turret of tools.
  rod(scene, `${name}Arm0`, root, mats.chrome, [0.2, 0.22, -0.06], [0.36, 0.3, -0.1], 0.02, 5);
  rod(scene, `${name}Arm1`, root, mats.chrome, [0.36, 0.3, -0.1], [0.44, 0.14, -0.06], 0.02, 5);
  drum(scene, `${name}Turret`, root, mats.grey, { height: 0.05, diameter: 0.08, tessellation: 10 }, [0.45, 0.12, -0.06], [1, 0, 0]);
  for (const s of [-1, 1]) box(scene, `${name}Hazcam${s}`, root, mats.black, [0.01, 0.02, 0.03], [0.212, 0.2, s * 0.06]);
  if (helicopter) {
    // Ingenuity: a box the size of a tissue box under two rotors, standing on four thin legs.
    const heli = group(scene, `${name}Heli`, root, [0.34, 0, 0.42]);
    box(scene, `${name}HeliBody`, heli, mats.goldFoil, [0.045, 0.045, 0.045], [0, 0.09, 0]);
    rod(scene, `${name}HeliMast`, heli, mats.grey, [0, 0.11, 0], [0, 0.19, 0], 0.008, 4);
    for (const [k, turn] of [[0, 0.3], [1, 1.5]]) box(scene, `${name}Rotor${k}`, heli, mats.dark, [0.3, 0.004, 0.02], [0, 0.14 + k * 0.035, 0], [0, turn, 0]);
    box(scene, `${name}HeliPanel`, heli, mats.cells, [0.05, 0.004, 0.035], [0, 0.195, 0]);
    for (const [x, z, a] of round(4, 0.07, 0.785)) rod(scene, `${name}HeliLeg${a}`, heli, mats.grey, [0, 0.08, 0], [x, 0, z], 0.005, 3);
  }
  return fuse(scene, root);
}

// An early probe: a ball that opened four petals to stand itself upright (Luna 9,
// Mars 3), with its whip antennas up. closed: as it came down, a bare ball, its petals
// still shut round it and its antennas folded.
function capsule(scene, name, mats, { closed = false } = {}) {
  const root = new TransformNode(name, scene);
  part(CreateSphere(`${name}Ball`, { diameter: 0.4, segments: 16 }, scene), root, mats.chrome, [0, 0.22, 0]);
  drum(scene, `${name}Band`, root, mats.grey, { height: 0.02, diameter: 0.404, tessellation: 24 }, [0, 0.22, 0]);
  if (closed) {
    // The four petals lie against the ball, their seams showing.
    for (let k = 0; k < 4; k++) drum(scene, `${name}Seam${k}`, root, mats.foil, { height: 0.012, diameter: 0.408, tessellation: 24 }, [0, 0.22, 0], [Math.cos((k * Math.PI) / 4), 0.0001, Math.sin((k * Math.PI) / 4)]);
    return fuse(scene, root);
  }
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    box(scene, `${name}Petal${k}`, root, mats.foil, [0.2, 0.01, 0.34], [Math.sin(a) * 0.3, 0.04, Math.cos(a) * 0.3], [-0.25, a, 0]);
    rod(scene, `${name}Whip${k}`, root, mats.chrome, [Math.sin(a + 0.8) * 0.1, 0.38, Math.cos(a + 0.8) * 0.1], [Math.sin(a + 0.8) * 0.3, 0.72, Math.cos(a + 0.8) * 0.3], 0.01, 4);
  }
  drum(scene, `${name}Camera`, root, mats.dark, { height: 0.08, diameter: 0.06, tessellation: 10 }, [0, 0.45, 0]);
  drum(scene, `${name}Mirror`, root, mats.chrome, { height: 0.02, diameter: 0.09, tessellation: 10 }, [0, 0.5, 0]);
  return fuse(scene, root);
}

// Luna 2 did not land: it hit at 3 km/s. What stands here is the ball as it flew, half
// buried, with its antennas bent.
function impactor(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(CreateSphere(`${name}Ball`, { diameter: 0.5, segments: 16 }, scene), root, mats.chrome, [0, 0.1, 0]);
  drum(scene, `${name}Seam`, root, mats.grey, { height: 0.014, diameter: 0.505, tessellation: 24 }, [0, 0.1, 0], [0.3, 1, 0.2]);
  for (const [x, z, a] of round(5, 0.18, 0.4)) rod(scene, `${name}Rod${a}`, root, mats.chrome, [x, 0.25, z], [x * 3, 0.42 + Math.sin(a * 3) * 0.12, z * 3], 0.01, 4);
  drum(scene, `${name}Crater`, root, mats.dark, { height: 0.02, diameterTop: 0.9, diameterBottom: 1.0, tessellation: 20 }, [0, 0.01, 0]);
  return fuse(scene, root);
}

// MESSENGER ran out of fuel and hit Mercury at 3.9 km/s. What lies here is what the
// place is for: the gold-foiled body on its side in a small dark crater, the white
// sunshade that kept it cool torn half off, the two solar panels thrown clear and the
// long boom of its magnetometer bent over the rim.
function messenger(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Crater`, root, mats.dark, { height: 0.02, diameterTop: 1.0, diameterBottom: 1.1, tessellation: 20 }, [0, 0.01, 0]);
  drum(scene, `${name}Rim`, root, mats.grey, { height: 0.03, diameterTop: 1.02, diameterBottom: 1.16, tessellation: 20 }, [0, 0.005, 0]);
  box(scene, `${name}Body`, root, mats.goldFoil, [0.3, 0.26, 0.3], [0.02, 0.13, 0], [0.35, 0.5, 0.25]);
  box(scene, `${name}Deck`, root, mats.plate, [0.2, 0.04, 0.2], [0.1, 0.27, -0.04], [0.35, 0.5, 0.25]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0.16, 0.2, -0.14], [0.6, 0.5, -0.6], 0.12, 0.1);
  box(scene, `${name}Shade`, root, mats.white, [0.5, 0.42, 0.015], [-0.16, 0.2, 0.2], [1.0, 0.3, 0.1]);
  box(scene, `${name}ShadeTorn`, root, mats.white, [0.22, 0.2, 0.012], [-0.42, 0.04, 0.36], [1.45, -0.4, 0.2]);
  box(scene, `${name}Panel0`, root, mats.cells, [0.42, 0.012, 0.2], [0.46, 0.04, -0.12], [0.08, 0.5, 0.12]);
  box(scene, `${name}Panel1`, root, mats.cells, [0.42, 0.012, 0.2], [-0.3, 0.08, -0.38], [0.3, -0.7, -0.2]);
  rod(scene, `${name}Boom0`, root, mats.grey, [0.05, 0.2, -0.1], [0.2, 0.42, -0.4], 0.014, 5);
  rod(scene, `${name}Boom1`, root, mats.grey, [0.2, 0.42, -0.4], [0.28, 0.06, -0.62], 0.014, 5);
  for (const [x, z, a] of round(7, 0.42, 0.9)) box(scene, `${name}Scrap${a}`, root, a % 2 > 1 ? mats.goldFoil : mats.silver, [0.05, 0.02, 0.035], [x * (1 + Math.sin(a * 5) * 0.25), 0.02, z * (1 + Math.cos(a * 3) * 0.25)], [0.3, a, 0.2]);
  return fuse(scene, root);
}

// SLIM: a small box that touched down on target and then tipped onto its nose, its
// engine bells pointing at the sky and its solar cells facing sideways.
// upright: as it flew, its middle at the model's own middle (the scene turns it over).
function slim(scene, name, mats, { upright = false } = {}) {
  const root = new TransformNode(name, scene);
  const body = group(scene, `${name}Tipped`, root, upright ? [0, 0, 0] : [0, 0.2, 0], [0, 0, upright ? 0 : 2.9]);
  box(scene, `${name}Body`, body, mats.goldFoil, [0.3, 0.34, 0.26]);
  box(scene, `${name}Cells`, body, mats.cells, [0.3, 0.34, 0.006], [0, 0, 0.134]);
  for (const s of [-1, 1]) {
    nozzle(scene, `${name}Engine${s}`, body, mats.dark, [s * 0.07, -0.17, 0], [0, -1, 0], 0.1, 0.1);
    for (const f of [-1, 1]) rod(scene, `${name}Foot${s}${f}`, body, mats.grey, [s * 0.14, -0.1, f * 0.12], [s * 0.2, -0.26, f * 0.16], 0.016, 5);
  }
  sphere(scene, `${name}Tank`, body, mats.white, 0.14, [0, 0.2, 0]);
  dish(scene, `${name}Dish`, body, mats, { at: [0.16, 0.05, 0], toward: [1, 0.2, 0], diameter: 0.1, feed: false });
  return fuse(scene, root);
}

// Odysseus: a tall six-sided tower on six legs that caught a foot and came to rest
// leaning well over on one side.
// upright: as it flew (the scene leans it over).
function odysseus(scene, name, mats, { upright = false } = {}) {
  const root = new TransformNode(name, scene);
  const lean = group(scene, `${name}Lean`, root, [0, 0.02, 0], [0, 0, upright ? 0 : -0.55]);
  drum(scene, `${name}Tower`, lean, mats.plate, { height: 0.6, diameter: 0.26, tessellation: 6 }, [0, 0.42, 0]);
  drum(scene, `${name}Top`, lean, mats.goldFoil, { height: 0.03, diameter: 0.27, tessellation: 6 }, [0, 0.735, 0]);
  for (const [x, z, a] of round(3, 0.131, 0.52)) box(scene, `${name}Cells${a}`, lean, mats.cells, [0.004, 0.44, 0.12], [x, 0.46, z], [0, -a, 0]);
  sphere(scene, `${name}Tank`, lean, mats.white, 0.22, [0, 0.2, 0]);
  nozzle(scene, `${name}Engine`, lean, mats.dark, [0, 0.12, 0], [0, -1, 0], 0.1, 0.12);
  legs(scene, `${name}Gear`, lean, mats, 6, { top: 0.13, foot: 0.32, height: 0.22, turn: 0, pad: 0.06 });
  dish(scene, `${name}Dish`, lean, mats, { at: [0.05, 0.76, 0.03], toward: [0.2, 1, 0], diameter: 0.1, feed: false });
  return fuse(scene, root);
}

// Beagle 2: a pocket watch that opened its lid and unfolded four round solar panels;
// two of them never opened, which is why it was never heard from.
function beagle(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Base`, root, mats.goldFoil, { height: 0.08, diameterTop: 0.36, diameterBottom: 0.26, tessellation: 20 }, [0, 0.04, 0]);
  drum(scene, `${name}Lid`, root, mats.goldFoil, { height: 0.03, diameter: 0.36, tessellation: 20 }, [0.36, 0.02, 0]);
  for (const [k, x, z, y] of [[0, 0.3, 0.3, 0.04], [1, 0.3, -0.3, 0.04], [2, 0.36, 0, 0.07]]) {
    drum(scene, `${name}Panel${k}`, root, mats.cells, { height: 0.008, diameter: 0.3, tessellation: 5 }, [x, y, z]);
  }
  box(scene, `${name}Stuck`, root, mats.cells, [0.3, 0.02, 0.3], [0.36, 0.1, 0], [0, 0.6, 0.5]);
  rod(scene, `${name}Arm0`, root, mats.chrome, [0, 0.08, 0], [-0.14, 0.3, 0.06], 0.014, 5);
  rod(scene, `${name}Arm1`, root, mats.chrome, [-0.14, 0.3, 0.06], [-0.3, 0.1, 0.1], 0.014, 5);
  box(scene, `${name}Paw`, root, mats.grey, [0.07, 0.05, 0.07], [-0.31, 0.08, 0.1]);
  return fuse(scene, root);
}

// Philae: a six-sided box the size of a washing machine, its sides covered in solar
// cells, standing on three thin legs splayed wide (they were to dig screws into the ice).
function philae(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Body`, root, mats.cells, { height: 0.3, diameter: 0.52, tessellation: 6 }, [0, 0.47, 0]);
  drum(scene, `${name}Top`, root, mats.plate, { height: 0.014, diameter: 0.53, tessellation: 6 }, [0, 0.627, 0]);
  drum(scene, `${name}Floor`, root, mats.goldFoil, { height: 0.014, diameter: 0.53, tessellation: 6 }, [0, 0.313, 0]);
  // The open side with the instruments (the "balcony"), and the drill under it.
  box(scene, `${name}Balcony`, root, mats.goldFoil, [0.14, 0.2, 0.26], [0.27, 0.45, 0]);
  box(scene, `${name}Eye`, root, mats.dark, [0.02, 0.06, 0.06], [0.345, 0.5, 0.06]);
  rod(scene, `${name}Drill`, root, mats.chrome, [0.3, 0.34, -0.06], [0.3, 0.12, -0.06], 0.012, 5);
  // The hub the legs turn on, and the three legs.
  drum(scene, `${name}Hub`, root, mats.grey, { height: 0.12, diameter: 0.14, tessellation: 10 }, [0, 0.26, 0]);
  legs(scene, `${name}Gear`, root, mats, 3, { top: 0.08, foot: 0.62, height: 0.26, turn: 0.52, pad: 0.1 });
  for (const [x, z, a] of round(2, 0.16, 0.4)) rod(scene, `${name}Antenna${a}`, root, mats.chrome, [x, 0.63, z], [x * 1.3, 0.8, z * 1.3], 0.008, 4);
  return fuse(scene, root);
}

// Huygens: a shallow saucer 1.3 m across, resting on Titan's damp ground with its
// spin vanes round the rim and its instruments under a flat top.
function huygens(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Dome`, root, mats.silver, { height: 0.2, diameterTop: 0.9, diameterBottom: 0.3, tessellation: 28 }, [0, 0.1, 0]);
  drum(scene, `${name}Top`, root, mats.plate, { height: 0.06, diameterTop: 0.7, diameterBottom: 0.9, tessellation: 28 }, [0, 0.23, 0]);
  drum(scene, `${name}Lid`, root, mats.goldFoil, { height: 0.02, diameter: 0.5, tessellation: 20 }, [0, 0.27, 0]);
  for (const [x, z, a] of round(24, 0.45, 0)) box(scene, `${name}Vane${a}`, root, mats.grey, [0.04, 0.03, 0.006], [x, 0.2, z], [0.4, -a, 0]);
  for (const [x, z, a] of round(4, 0.3, 0.4)) rod(scene, `${name}Antenna${a}`, root, mats.chrome, [x, 0.26, z], [x, 0.36, z], 0.012, 4);
  box(scene, `${name}Camera`, root, mats.dark, [0.06, 0.06, 0.08], [0.4, 0.14, 0.1]);
  rod(scene, `${name}Boom`, root, mats.grey, [0.42, 0.2, -0.1], [0.62, 0.22, -0.16], 0.01, 4);
  return fuse(scene, root);
}

// A launch pad with its rocket standing ready: the platform, the service tower with
// its swing arms, and the rocket. Taller than the landers (1.6 units), as it was.
//   saturn: Apollo 11's Saturn V at pad 39A: three white stages narrowing upward with
//     black bands, five engines, the spacecraft and its escape tower; a red tower.
//   nuri: Nuri at Naro: a slim white rocket of one width with the flag on its side; a
//     blue tower.
// Two rockets more, each in the parts that go their own ways when it flies
// (core/moonScenes.js ROCKET_SIZES has the same heights): core [tall, wide, paint],
// upper stage [tall, wide], fairing [tall, wide], boosters round the core's foot.
// h2a: Japan's H-IIA (the 202 kind): an orange core (its insulation), a white upper
// stage and fairing, two white solid boosters. cz5: China's Long March 5: a wide white
// core and four boosters with pointed noses.
const ROCKETS = {
  h2a: { core: [0.6, 0.11, 'orange'], upper: [0.16, 0.11], fairing: [0.22, 0.125], boosters: { count: 2, tall: 0.3, wide: 0.065 } },
  cz5: { core: [0.56, 0.16, 'white'], upper: [0.18, 0.16], fairing: [0.24, 0.165], boosters: { count: 4, tall: 0.46, wide: 0.095 } },
};
// Its parts, each with its foot at its own y = 0 and none fused yet: the core, the upper
// stage, the boosters in two groups (those to the left, those to the right), the
// fairing's two halves and what it carries.
function rocketParts(scene, name, mats, look) {
  const { core: [coreTall, coreWide, coreTint], upper: [upperTall, upperWide], fairing: [fairingTall, fairingWide], boosters } = ROCKETS[look];
  const core = new TransformNode(`${name}Core`, scene);
  for (const [x, z] of look === 'cz5' ? round(2, 0.04) : [[0, 0]]) nozzle(scene, `${name}CoreEngine${x}${z}`, core, mats.dark, [x, 0, z], [0, -1, 0], 0.06, 0.06);
  drum(scene, `${name}CoreBody`, core, mats[coreTint], { height: coreTall - 0.02, diameter: coreWide }, [0, coreTall / 2 - 0.01, 0]);
  drum(scene, `${name}CoreBand`, core, mats.black, { height: 0.02, diameter: coreWide * 1.01 }, [0, coreTall - 0.01, 0]);
  const upper = new TransformNode(`${name}Upper`, scene);
  nozzle(scene, `${name}UpperEngine`, upper, mats.dark, [0, 0.04, 0], [0, -1, 0], 0.06, 0.06);
  drum(scene, `${name}UpperBody`, upper, mats.white, { height: upperTall - 0.04, diameter: upperWide }, [0, 0.04 + (upperTall - 0.04) / 2, 0]);
  const out = coreWide / 2 + boosters.wide / 2;
  const groups = [-1, 1].map((way) => {
    const group = new TransformNode(`${name}Boosters${way}`, scene);
    const spots = boosters.count === 2 ? [[way, 0]] : [[way * 0.707, 0.707], [way * 0.707, -0.707]];
    spots.forEach(([sx, sz], k) => {
      const x = sx * out;
      const z = sz * out;
      nozzle(scene, `${name}BoosterEngine${way}${k}`, group, mats.dark, [x, 0, z], [0, -1, 0], 0.05, 0.05);
      drum(scene, `${name}Booster${way}${k}`, group, mats.white, { height: boosters.tall * 0.8, diameter: boosters.wide }, [x, boosters.tall * 0.4, z]);
      drum(scene, `${name}BoosterNose${way}${k}`, group, mats.white, { height: boosters.tall * 0.2, diameterTop: 0.01, diameterBottom: boosters.wide }, [x, boosters.tall * 0.9, z]);
    });
    return group;
  });
  const halves = [0, 1].map((k) => {
    const half = new TransformNode(`${name}Fairing${k}`, scene);
    const shell = part(cyl(scene, `${name}FairingShell${k}`, { height: fairingTall, diameterTop: 0.03, diameterBottom: fairingWide, tessellation: 20, arc: 0.5 }), half, mats.white, [0, fairingTall / 2, 0]);
    // A half ring about the upright: one toward -x, the other toward +x.
    shell.rotation.y = k ? -Math.PI / 2 : Math.PI / 2;
    return half;
  });
  const payload = new TransformNode(`${name}Payload`, scene);
  box(scene, `${name}PayloadBody`, payload, mats.goldFoil, [0.06, 0.08, 0.06], [0, 0.05, 0]);
  for (const s of [-1, 1]) box(scene, `${name}PayloadWing${s}`, payload, mats.cells, [0.004, 0.05, 0.1], [0, 0.05, s * 0.085]);
  return { core, upper, groups, halves, payload, coreTall, upperTall, out: boosters.count === 2 ? out : out * 0.707 };
}
// The same for a stage (core/moonScenes.js rocketLaunch): the bare pad and the parts.
const rocketPieces = (look) => (scene, name, mats) => {
  const parts = rocketParts(scene, name, mats, look);
  return {
    pieces: {
      pad: launchPad(scene, `${name}Pad`, mats, { rocket: 'none', tower: look }),
      boostersLeft: fuse(scene, parts.groups[0]),
      boostersRight: fuse(scene, parts.groups[1]),
      core: fuse(scene, parts.core),
      upper: fuse(scene, parts.upper),
      fairingLeft: parts.halves[0],
      fairingRight: parts.halves[1],
      payload: fuse(scene, parts.payload),
    },
    flames: {
      core: [0, -0.04, 0, 0.42, 0.12], upper: [0, -0.02, 0, 0.26, 0.09],
      boostersLeft: [-parts.out, -0.04, 0, 0.36, 0.09], boostersRight: [parts.out, -0.04, 0, 0.36, 0.09],
    },
  };
};

function launchPad(scene, name, mats, { rocket = 'saturn', tower = rocket } = {}) {
  const root = new TransformNode(name, scene);
  const saturn = rocket === 'saturn';
  // 'none': the pad alone, for a scene whose rocket leaves it (falconLaunch below).
  const bare = rocket === 'none';
  // The platform, and the flame trench cut under the rocket.
  box(scene, `${name}Apron`, root, mats.grey, [1.3, 0.04, 0.9], [0, 0.02, 0]);
  box(scene, `${name}Deck`, root, mats.silver, [0.62, 0.1, 0.5], [0.08, 0.09, 0]);
  box(scene, `${name}Trench`, root, mats.black, [0.2, 0.06, 0.92], [0.16, 0.035, 0]);
  // The tower beside the rocket, a crane on its top, arms reaching across.
  const towerX = -0.2;
  const top = saturn ? 1.5 : 1.2;
  // (Tanegashima's towers are red and white, Wenchang's grey.)
  const towerPaint = tower === 'h2a' ? mats.red : tower === 'cz5' ? mats.grey : bare ? mats.dark : saturn ? mats.red : mats.solar;
  truss(scene, `${name}Tower`, root, towerPaint, [towerX, 0.14, 0], [towerX, top, 0], 0.16, saturn ? 9 : 7, 0.014);
  box(scene, `${name}TowerBase`, root, mats.dark, [0.2, 0.06, 0.2], [towerX, 0.17, 0]);
  rod(scene, `${name}Crane`, root, mats.grey, [towerX - 0.14, top + 0.03, 0], [towerX + 0.3, top + 0.03, 0], 0.02, 5);
  rod(scene, `${name}Mast`, root, mats.grey, [towerX, top, 0], [towerX, top + 0.14, 0], 0.012, 5);
  const rocketX = 0.16;
  const base = 0.2;
  const band = (id, y, diameter, height = 0.03) => drum(scene, `${name}Band${id}`, root, mats.black, { height, diameter: diameter * 1.01 }, [rocketX, y, 0]);
  let arms;
  if (bare) {
    // One arm high up: the walkway the crew went along.
    arms = [1.0];
  } else if (ROCKETS[rocket]) {
    // It stands whole on the pad: the parts of its flight, put together.
    const parts = rocketParts(scene, name, mats, rocket);
    const stand = (node, y) => {
      node.parent = root;
      node.position.set(rocketX, base + y, 0);
    };
    stand(parts.core, 0);
    stand(parts.upper, parts.coreTall);
    for (const group of parts.groups) stand(group, 0);
    for (const half of parts.halves) stand(half, parts.coreTall + parts.upperTall - 0.02);
    parts.payload.dispose();
    arms = [0.45, 0.75];
  } else if (saturn) {
    // First stage and its five engines.
    for (const [x, z] of [[0, 0], ...round(4, 0.055, 0.785)]) nozzle(scene, `${name}F1${x}${z}`, root, mats.dark, [rocketX + x, base, z], [0, -1, 0], 0.07, 0.07);
    drum(scene, `${name}S1`, root, mats.white, { height: 0.5, diameter: 0.2 }, [rocketX, base + 0.25, 0]);
    for (const [x, z, a] of round(4, 0.1, 0.785)) box(scene, `${name}Fin${a}`, root, mats.black, [0.05, 0.1, 0.012], [rocketX + x * 1.15, base + 0.05, z * 1.15], [0, -a, 0]);
    band('S1a', base + 0.12, 0.2, 0.08);
    band('S1b', base + 0.47, 0.2, 0.05);
    // Second stage, the cone up to the third, and the third.
    drum(scene, `${name}S2`, root, mats.white, { height: 0.3, diameter: 0.2 }, [rocketX, base + 0.65, 0]);
    band('S2', base + 0.79, 0.2, 0.025);
    drum(scene, `${name}Cone2`, root, mats.white, { height: 0.07, diameterTop: 0.13, diameterBottom: 0.2 }, [rocketX, base + 0.835, 0]);
    drum(scene, `${name}S3`, root, mats.white, { height: 0.2, diameter: 0.13 }, [rocketX, base + 0.97, 0]);
    band('S3', base + 1.06, 0.13, 0.02);
    // The lunar module's shroud, the service module, the capsule and the escape tower.
    drum(scene, `${name}Shroud`, root, mats.white, { height: 0.08, diameterTop: 0.08, diameterBottom: 0.13 }, [rocketX, base + 1.11, 0]);
    drum(scene, `${name}Service`, root, mats.chrome, { height: 0.07, diameter: 0.08 }, [rocketX, base + 1.185, 0]);
    drum(scene, `${name}Capsule`, root, mats.silver, { height: 0.06, diameterTop: 0.02, diameterBottom: 0.08 }, [rocketX, base + 1.25, 0]);
    rod(scene, `${name}Escape`, root, mats.white, [rocketX, base + 1.28, 0], [rocketX, base + 1.4, 0], 0.016, 6);
    arms = [0.45, 0.7, 0.95, 1.15, 1.38];
  } else {
    for (const [x, z] of round(4, 0.035, 0.785)) nozzle(scene, `${name}Engine${x}${z}`, root, mats.dark, [rocketX + x, base, z], [0, -1, 0], 0.06, 0.05);
    drum(scene, `${name}S1`, root, mats.white, { height: 0.5, diameter: 0.13 }, [rocketX, base + 0.25, 0]);
    band('S1', base + 0.5, 0.13, 0.02);
    drum(scene, `${name}S2`, root, mats.white, { height: 0.26, diameter: 0.13 }, [rocketX, base + 0.64, 0]);
    band('S2', base + 0.77, 0.13, 0.015);
    drum(scene, `${name}S3`, root, mats.white, { height: 0.12, diameter: 0.13 }, [rocketX, base + 0.84, 0]);
    drum(scene, `${name}Fairing`, root, mats.white, { height: 0.16, diameterTop: 0.012, diameterBottom: 0.13 }, [rocketX, base + 0.98, 0]);
    // The flag on the side that faces away from the tower.
    box(scene, `${name}Flag`, root, mats.taegukgi, [0.004, 0.06, 0.09], [rocketX + 0.066, base + 0.36, 0]);
    arms = [0.4, 0.7, 0.95];
  }
  for (const y of arms) {
    box(scene, `${name}Arm${y}`, root, mats.grey, [rocketX - towerX - 0.08, 0.022, 0.04], [(rocketX + towerX) / 2, y, 0]);
  }
  // Four lightning masts at the corners of the apron.
  for (const [x, z, a] of round(4, 1, 0.785)) rod(scene, `${name}Rod${a}`, root, mats.grey, [x * 0.58, 0.04, z * 0.4], [x * 0.58, saturn ? 0.5 : 0.9, z * 0.4], 0.01, 4);
  return fuse(scene, root);
}

// Pad 39A on 30 May 2020, for the scene of Crew Dragon's launch (core/replay.js lc39a):
// the pad with a black tower, and Falcon 9 in the pieces that go their own ways. Each
// piece has its foot at its own y = 0.
//   booster: the first stage, white, sooty at the foot, a black band at its top where
//     the grid fins are; nine engines. legs: its four legs, put out to land.
//   upper: the second stage, Dragon's trunk and the capsule, white, its nose a cone.
//   ship: the barge it comes down on, a black deck with a ring painted on it.
function falconLaunch(scene, name, mats) {
  const pad = launchPad(scene, `${name}Pad`, mats, { rocket: 'none' });
  const booster = new TransformNode(`${name}Booster`, scene);
  nozzle(scene, `${name}Engines`, booster, mats.dark, [0, 0, 0], [0, -1, 0], 0.05, 0.085);
  drum(scene, `${name}Soot`, booster, mats.grey, { height: 0.1, diameter: 0.092 }, [0, 0.05, 0]);
  drum(scene, `${name}S1`, booster, mats.white, { height: 0.38, diameter: 0.09 }, [0, 0.29, 0]);
  drum(scene, `${name}Inter`, booster, mats.black, { height: 0.07, diameter: 0.091 }, [0, 0.515, 0]);
  for (const [x, z, a] of round(4, 0.06, 0.785)) box(scene, `${name}Grid${a}`, booster, mats.grey, [0.04, 0.008, 0.03], [x, 0.5, z], [0, -a, 0]);
  const boosterNode = fuse(scene, booster);
  const legsRoot = new TransformNode(`${name}Legs`, scene);
  for (const [x, z, a] of round(4, 1, 0.785)) {
    rod(scene, `${name}Leg${a}`, legsRoot, mats.black, [x * 0.045, 0.12, z * 0.045], [x * 0.2, -0.03, z * 0.2], 0.016, 5);
    rod(scene, `${name}Strut${a}`, legsRoot, mats.grey, [x * 0.045, 0.02, z * 0.045], [x * 0.2, -0.03, z * 0.2], 0.008, 4);
  }
  const legs = fuse(scene, legsRoot);
  const upper = new TransformNode(`${name}Upper`, scene);
  nozzle(scene, `${name}Vac`, upper, mats.dark, [0, 0.02, 0], [0, -1, 0], 0.05, 0.06);
  drum(scene, `${name}S2`, upper, mats.white, { height: 0.16, diameter: 0.09 }, [0, 0.1, 0]);
  drum(scene, `${name}Trunk`, upper, mats.white, { height: 0.07, diameter: 0.088 }, [0, 0.215, 0]);
  drum(scene, `${name}TrunkBand`, upper, mats.dark, { height: 0.012, diameter: 0.09 }, [0, 0.182, 0]);
  drum(scene, `${name}Dragon`, upper, mats.white, { height: 0.075, diameterTop: 0.03, diameterBottom: 0.088 }, [0, 0.288, 0]);
  drum(scene, `${name}Nose`, upper, mats.chrome, { height: 0.02, diameterTop: 0.006, diameterBottom: 0.03 }, [0, 0.335, 0]);
  const upperNode = fuse(scene, upper);
  const ship = new TransformNode(`${name}Ship`, scene);
  box(scene, `${name}Deck`, ship, mats.black, [0.62, 0.06, 0.4], [0, 0.03, 0]);
  drum(scene, `${name}Ring`, ship, mats.white, { height: 0.004, diameter: 0.3, tessellation: 28 }, [0, 0.062, 0]);
  drum(scene, `${name}RingIn`, ship, mats.black, { height: 0.005, diameter: 0.26, tessellation: 28 }, [0, 0.063, 0]);
  for (const sx of [-1, 1]) box(scene, `${name}Wall${sx}`, ship, mats.grey, [0.03, 0.07, 0.4], [sx * 0.3, 0.09, 0]);
  const shipNode = fuse(scene, ship);
  return { pad, booster: boosterNode, legs, upper: upperNode, ship: shipNode };
}

// The pieces of the Moon's eight scenes (core/moonScenes.js), under the names the scenes
// move them by. flames: a flame under a piece, [x, y, z, height, width at its foot].
// lit: pieces that are light itself (a flash).

// Apollo's rover: four wire wheels under a flat frame, two seats, the dish on its mast
// and the television camera that watched the others leave.
function lunarRover(scene, name, mats) {
  const root = new TransformNode(name, scene);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      drum(scene, `${name}Wheel${sx}${sz}`, root, mats.grey, { height: 0.05, diameter: 0.16, tessellation: 12 }, [sx * 0.2, 0.08, sz * 0.17], [0, 0, 1]);
      box(scene, `${name}Fender${sx}${sz}`, root, mats.goldFoil, [0.14, 0.01, 0.06], [sx * 0.2, 0.175, sz * 0.17]);
    }
  }
  box(scene, `${name}Frame`, root, mats.plate, [0.5, 0.025, 0.26], [0, 0.13, 0]);
  for (const sz of [-1, 1]) {
    box(scene, `${name}Seat${sz}`, root, mats.white, [0.1, 0.015, 0.1], [-0.02, 0.19, sz * 0.07]);
    box(scene, `${name}Back${sz}`, root, mats.white, [0.015, 0.11, 0.1], [-0.075, 0.24, sz * 0.07]);
  }
  box(scene, `${name}Console`, root, mats.dark, [0.03, 0.09, 0.1], [0.1, 0.2, 0]);
  rod(scene, `${name}Mast`, root, mats.grey, [0.2, 0.14, 0.09], [0.2, 0.42, 0.09], 0.01, 4);
  dish(scene, `${name}Dish`, root, mats, { at: [0.2, 0.44, 0.09], toward: [0.2, 1, 0.3], diameter: 0.16, material: mats.goldFoil });
  rod(scene, `${name}CameraPost`, root, mats.grey, [0.2, 0.14, -0.09], [0.2, 0.3, -0.09], 0.01, 4);
  box(scene, `${name}Camera`, root, mats.white, [0.06, 0.04, 0.04], [0.21, 0.32, -0.09], [0, 0, 0.5]);
  box(scene, `${name}Tools`, root, mats.goldFoil, [0.1, 0.1, 0.22], [-0.2, 0.2, 0]);
  return fuse(scene, root);
}

// A ring of scraps thrown off (foil as Apollo's cabin leaves, dust from Luna 2): bits
// on a circle one unit wide, which the scene swells and lets fall.
function scraps(scene, name, mats, material) {
  const root = new TransformNode(name, scene);
  for (const [x, z, a] of round(14, 0.5, 0.2)) {
    const far = 0.75 + 0.25 * Math.sin(a * 5);
    box(scene, `${name}Bit${a}`, root, material, [0.035, 0.012, 0.03], [x * far, 0.05 * Math.sin(a * 7), z * far], [a, a * 2, a * 3]);
  }
  return fuse(scene, root);
}

// Luna 2 as it flew: a ball with its antennas out.
function lunaBall(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(CreateSphere(`${name}Ball`, { diameter: 0.5, segments: 16 }, scene), root, mats.chrome, [0, 0.25, 0]);
  drum(scene, `${name}Seam`, root, mats.grey, { height: 0.014, diameter: 0.505, tessellation: 24 }, [0, 0.25, 0]);
  for (const [x, z, a] of round(5, 0.18, 0.4)) rod(scene, `${name}Rod${a}`, root, mats.chrome, [x, 0.42, z], [x * 2.6, 0.78, z * 2.6], 0.01, 4);
  rod(scene, `${name}Boom`, root, mats.chrome, [0, 0.5, 0], [0, 0.95, 0], 0.012, 4);
  return fuse(scene, root);
}

// A person in a moon suit, 0.22 tall (drawn a little large beside the lander, to be
// seen), feet at y = 0: white suit and pack, a gold visor toward +x.
// climbing: both arms up and forward, hands on a ladder's rails.
export function astronaut(scene, name, mats, { climbing = false } = {}) {
  const root = new TransformNode(name, scene);
  for (const s of [-1, 1]) {
    box(scene, `${name}Leg${s}`, root, mats.white, [0.035, 0.085, 0.035], [0, 0.0425, s * 0.022]);
    box(scene, `${name}Boot${s}`, root, mats.grey, [0.05, 0.016, 0.036], [0.008, 0.008, s * 0.022]);
    rod(scene, `${name}Arm${s}`, root, mats.white, [0.005, 0.15, s * 0.045], climbing ? [0.075, 0.185, s * 0.04] : [0.03, 0.085, s * 0.06], 0.026, 6);
  }
  box(scene, `${name}Body`, root, mats.white, [0.06, 0.085, 0.085], [0, 0.125, 0]);
  box(scene, `${name}Pack`, root, mats.white, [0.04, 0.1, 0.075], [-0.045, 0.14, 0]);
  box(scene, `${name}Chest`, root, mats.grey, [0.014, 0.03, 0.04], [0.034, 0.13, 0]);
  sphere(scene, `${name}Helmet`, root, mats.white, 0.07, [0, 0.19, 0]);
  sphere(scene, `${name}Visor`, root, mats.goldFoil, 0.052, [0.014, 0.19, 0]);
  return fuse(scene, root);
}

function flagAlone(scene, name, mats) {
  const root = new TransformNode(name, scene);
  flag(scene, name, root, mats, [0, 0, 0]);
  return fuse(scene, root);
}

// A flat card that shows a drawing, lit by nothing: `draw(ctx, w, h)` paints it on a
// canvas w by h. It faces the one who watches (a stage's +z is away from them).
function card(scene, name, [width, height], [w, h], draw) {
  const root = new TransformNode(name, scene);
  const texture = new DynamicTexture(`${name}Texture`, { width: w, height: h }, scene, true);
  texture.hasAlpha = true;
  draw(texture.getContext(), w, h);
  texture.update();
  // (Drawn again when a font it wants has come: redraw below.)
  root.redraw = () => {
    draw(texture.getContext(), w, h);
    texture.update();
  };
  const material = new StandardMaterial(`${name}Material`, scene);
  material.disableLighting = true;
  material.emissiveTexture = texture;
  material.opacityTexture = texture;
  material.diffuseColor = new Color3(0, 0, 0);
  material.specularColor = new Color3(0, 0, 0);
  material.backFaceCulling = false;
  const plane = CreatePlane(`${name}Plane`, { width, height }, scene);
  plane.parent = root;
  plane.material = material;
  plane.isPickable = false;
  return root;
}
const heartPath = (ctx, x, y, size) => {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.3);
  ctx.bezierCurveTo(x, y - size * 0.25, x - size * 0.6, y - size * 0.25, x - size * 0.6, y + size * 0.15);
  ctx.bezierCurveTo(x - size * 0.6, y + size * 0.5, x - size * 0.2, y + size * 0.7, x, y + size);
  ctx.bezierCurveTo(x + size * 0.2, y + size * 0.7, x + size * 0.6, y + size * 0.5, x + size * 0.6, y + size * 0.15);
  ctx.bezierCurveTo(x + size * 0.6, y - size * 0.25, x, y - size * 0.25, x, y + size * 0.3);
  ctx.closePath();
};
// The picture New Horizons took: Pluto, tan and brown, with its pale heart.
function plutoPhoto(scene, name) {
  return card(scene, name, [0.8, 0.8], [256, 256], (ctx, w, h) => {
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(12, 12, w - 24, h - 24);
    const shade = ctx.createRadialGradient(108, 104, 10, 128, 128, 92);
    shade.addColorStop(0, '#d8b48c');
    shade.addColorStop(0.7, '#a9805c');
    shade.addColorStop(1, '#5d4332');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.fill();
    // The dark band to the left of the heart, and the heart.
    ctx.fillStyle = '#6b4a36';
    ctx.beginPath();
    ctx.ellipse(86, 150, 34, 20, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6ecd8';
    heartPath(ctx, 150, 118, 58);
    ctx.fill();
  });
}
// What it says, in a bubble with a tail toward the lower left; `tail` 'upRight': toward
// the upper right (what speaks is above it and to the right); 'downRight': toward the
// lower right (what speaks is going off to the right).
// The letters are the game's plain bold ones, not the handwriting of Sora's own bubble:
// the web fonts come in pieces as they are wanted, and a bubble drawn before its piece
// had come was in another face than one drawn after (some at the start, the landmarks'
// when first played). So each bubble is drawn again once its letters' font is in.
const BUBBLE_FACE = '"Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
// by: whose words they are, written small on a dark tag at the bubble's upper left (where
// the speaker cannot be pointed at: Saturn, seen from its own clouds).
export function sayBubble(scene, name, words, { tail = 'downLeft', by = null } = {}) {
  const up = tail === 'upRight';
  const bubble = card(scene, name, [1.0, 0.5], [512, 256], (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1b2440';
    ctx.lineWidth = 8;
    // (The same outline, turned over both ways.)
    ctx.save();
    if (up) {
      ctx.translate(w, h);
      ctx.scale(-1, -1);
    } else if (tail === 'downRight') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.beginPath();
    ctx.moveTo(60, 20);
    ctx.lineTo(w - 60, 20);
    ctx.quadraticCurveTo(w - 16, 20, w - 16, 64);
    ctx.lineTo(w - 16, 140);
    ctx.quadraticCurveTo(w - 16, 184, w - 60, 184);
    ctx.lineTo(150, 184);
    ctx.lineTo(70, 240);
    ctx.lineTo(96, 184);
    ctx.lineTo(60, 184);
    ctx.quadraticCurveTo(16, 184, 16, 140);
    ctx.lineTo(16, 64);
    ctx.quadraticCurveTo(16, 20, 60, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#1b2440';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Smaller letters for longer words (the other languages), and two rows when one row
    // would need letters under 46px: broken at the space nearest the middle.
    const fit = (rows, from, least) => {
      let size = from;
      for (;;) {
        ctx.font = `700 ${size}px ${BUBBLE_FACE}`;
        if (size <= least || rows.every((row) => ctx.measureText(row).width <= w - 80)) return size;
        size -= 6;
      }
    };
    // (Under a name tag the words have less room: smaller letters.)
    const [one, pair] = by ? [60, 46] : [78, 60];
    let rows = [words];
    let size = fit(rows, one, 46);
    // Two rows when one does not fit, or when two can be written larger than one.
    const over = ctx.measureText(words).width > w - 80;
    if (over || size < 60) {
      const half = words.length / 2;
      const nearest = (list) => list.reduce((best, i) => (Math.abs(i - half) < Math.abs(best - half) ? i : best), list[0]);
      let two = null;
      if (words.includes(' ')) {
        const spaces = [...words].map((c, i) => (c === ' ' ? i : -1)).filter((i) => i > 0);
        // (Before an aside in brackets, if there is one.)
        const aside = words.indexOf(' (');
        // (Or where a sentence ends, if one does near the middle; else at any space.)
        const ends = spaces.filter((i) => '.?!,。？！、'.includes(words[i - 1]) && Math.abs(i - half) <= 0.3 * words.length);
        const cut = aside > 0 ? aside : nearest(ends.length ? ends : spaces);
        two = [words.slice(0, cut), words.slice(cut + 1)];
      } else if (words.length > 3) {
        // (Japanese and Chinese have no spaces: after a mark if there is one, else in the
        // middle.)
        const marks = [...words].map((c, i) => ('、。！？，'.includes(c) ? i + 1 : -1)).filter((i) => i > 0 && i < words.length);
        const cut = marks.length ? nearest(marks) : Math.round(half);
        two = [words.slice(0, cut), words.slice(cut)];
      }
      if (two) {
        const twoSize = fit(two, pair, 26);
        if (over || twoSize > size) {
          rows = two;
          size = twoSize;
        } else size = fit(rows, one, 46);
      }
    }
    const middle = (up ? h - 104 : 104) + (by ? 26 : 0);
    if (by) {
      // The tag sits on the bubble's upper edge, at its left.
      const top = up ? h - 184 : 20;
      ctx.font = `700 44px ${BUBBLE_FACE}`;
      const wide = ctx.measureText(by).width + 44;
      ctx.fillStyle = '#1b2440';
      ctx.beginPath();
      ctx.roundRect(36, top - 16, wide, 60, 30);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(by, 36 + wide / 2, top + 16);
      ctx.fillStyle = '#1b2440';
      ctx.font = `700 ${size}px ${BUBBLE_FACE}`;
    }
    rows.forEach((row, k) => ctx.fillText(row, w / 2, middle + (k - (rows.length - 1) / 2) * (size + 8)));
  });
  globalThis.document?.fonts?.load(`700 60px ${BUBBLE_FACE}`, words).then(() => bubble.redraw()).catch(() => {});
  return bubble;
}

// Nuri in the pieces that go their own ways (core/moonScenes.js PLACE_STAGES.naro), each
// with its foot at its own y = 0, and the pad it leaves.
function nuriPieces(scene, name, mats) {
  const first = new TransformNode(`${name}First`, scene);
  for (const [x, z] of round(4, 0.035, 0.785)) nozzle(scene, `${name}Engine${x}${z}`, first, mats.dark, [x, 0, z], [0, -1, 0], 0.06, 0.05);
  drum(scene, `${name}S1`, first, mats.white, { height: 0.5, diameter: 0.13 }, [0, 0.25, 0]);
  drum(scene, `${name}Band1`, first, mats.black, { height: 0.02, diameter: 0.1313 }, [0, 0.5, 0]);
  box(scene, `${name}Flag`, first, mats.taegukgi, [0.004, 0.06, 0.09], [0.066, 0.36, 0]);
  const second = new TransformNode(`${name}Second`, scene);
  nozzle(scene, `${name}Engine2`, second, mats.dark, [0, 0.04, 0], [0, -1, 0], 0.06, 0.07);
  drum(scene, `${name}S2`, second, mats.white, { height: 0.22, diameter: 0.13 }, [0, 0.14, 0]);
  drum(scene, `${name}Band2`, second, mats.black, { height: 0.015, diameter: 0.1313 }, [0, 0.25, 0]);
  const third = new TransformNode(`${name}Third`, scene);
  nozzle(scene, `${name}Engine3`, third, mats.dark, [0, 0.03, 0], [0, -1, 0], 0.04, 0.04);
  drum(scene, `${name}S3`, third, mats.white, { height: 0.1, diameter: 0.13 }, [0, 0.07, 0]);
  const halves = [0, 1].map((k) => {
    const half = new TransformNode(`${name}Fairing${k}`, scene);
    const shell = part(cyl(scene, `${name}FairingShell${k}`, { height: 0.2, diameterTop: 0.012, diameterBottom: 0.13, tessellation: 20, arc: 0.5 }), half, mats.white, [0, 0.1, 0]);
    // A half ring about the upright: one toward -x, the other toward +x.
    shell.rotation.y = k ? -Math.PI / 2 : Math.PI / 2;
    return half;
  });
  const satellite = new TransformNode(`${name}Satellite`, scene);
  box(scene, `${name}SatBody`, satellite, mats.goldFoil, [0.06, 0.06, 0.06], [0, 0.04, 0]);
  for (const s of [-1, 1]) box(scene, `${name}SatWing${s}`, satellite, mats.cells, [0.004, 0.05, 0.1], [0, 0.04, s * 0.085]);
  return {
    pieces: {
      pad: launchPad(scene, `${name}Pad`, mats, { rocket: 'none' }),
      first: fuse(scene, first),
      second: fuse(scene, second),
      third: fuse(scene, third),
      fairingLeft: halves[0],
      fairingRight: halves[1],
      satellite: fuse(scene, satellite),
      // The satellite's first call, to the station in Antarctica that heard it first (the
      // user, 2026-10-07, of five lines offered: "5"). It has left the view by then: the
      // bubble's tail points up after it.
      say: sayBubble(scene, `${name}Say`, t('세종기지야. 내 목소리 들려?'), { tail: 'upRight' }),
    },
    flames: { first: [0, -0.04, 0, 0.42, 0.12], second: [0, -0.02, 0, 0.3, 0.1], third: [0, -0.01, 0, 0.18, 0.06] },
  };
}

// A drawing that stands in a stage, lit by nothing, its foot at the piece's own y = 0:
// `file` under public/assets/, `size` [width, height] in the stage's units. The stage
// faces whoever watches, so the drawing does too.
function drawing(scene, name, file, [width, height]) {
  const root = new TransformNode(name, scene);
  const texture = new Texture(`${import.meta.env.BASE_URL}assets/${file}`, scene, true, true, Texture.NEAREST_SAMPLINGMODE);
  texture.hasAlpha = true;
  // (Not wrapped: the sea at a drawing's foot showed as a dark line along its top.)
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  const material = new StandardMaterial(`${name}Material`, scene);
  material.disableLighting = true;
  // (The colour is the emissive one alone; the diffuse texture is there for its alpha.)
  material.diffuseTexture = texture;
  material.diffuseColor = new Color3(0, 0, 0);
  material.specularColor = new Color3(0, 0, 0);
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  const plane = CreatePlane(`${name}Plane`, { width, height }, scene);
  plane.parent = root;
  plane.material = material;
  plane.position.y = height / 2;
  plane.isPickable = false;
  return root;
}

// Dokdo on the day its first lighthouse was lit (core/moonScenes.js PLACE_STAGES.dokdo):
// the islets as they were in 1954, with nothing built on them, and as the place's own
// drawing shows them now (each two units wide, its foot at y = 0); the boat that brought
// the iron; the square tower of iron; and for each of the two lights a lamp and a beam
// that the scene turns about the upright (the beam lies along the piece's +x). The
// drawings were ordered on 2026-10-06 (public/assets/replay/): the first stage showed
// the lighthouse of 1998 from its first moment, and a boat and a tower made of boxes.
function dokdoPieces(scene, name) {
  const light = (id, hex, alpha) => {
    const material = new StandardMaterial(`${name}${id}`, scene);
    material.disableLighting = true;
    material.emissiveColor = Color3.FromHexString(hex);
    material.alpha = alpha;
    material.backFaceCulling = false;
    return material;
  };
  const glow = light('Glow', '#fff3c4', 1);
  const ray = light('Ray', '#ffe9a0', 0.26);
  const lampOf = (id) => {
    const lamp = new TransformNode(`${name}${id}`, scene);
    sphere(scene, `${name}${id}Ball`, lamp, glow, 0.045, [0, 0, 0]);
    return lamp;
  };
  const beamOf = (id) => {
    const beam = new TransformNode(`${name}${id}`, scene);
    drum(scene, `${name}${id}Cone`, beam, ray, { height: 0.9, diameterTop: 0.2, diameterBottom: 0.012, tessellation: 16, cap: 0 }, [0.45, 0, 0], [1, 0, 0]);
    return beam;
  };
  return {
    pieces: {
      isle1954: drawing(scene, `${name}Isle1954`, 'replay/dokdo-1954.png', [2, 1]),
      isle: drawing(scene, `${name}Isle`, 'dokdo.png', [2, 1]),
      // (The boat is drawn 112 by 50 pixels and the tower 50 by 96.)
      boat: drawing(scene, `${name}Boat`, 'replay/boat.png', [0.44, 0.196]),
      tower: drawing(scene, `${name}Tower`, 'replay/tower.png', [0.172, 0.33]),
      lamp: lampOf('Lamp'),
      beam: beamOf('Beam'),
      topLamp: lampOf('TopLamp'),
      topBeam: beamOf('TopBeam'),
    },
    flames: {},
  };
}

// A picture that stands in a stage, as `drawing` above, but white-framed like a print and
// fetched only when it is first shown (forty of them at the start would be 2 MB).
function printOf(scene, name, file, size) {
  const root = new TransformNode(name, scene);
  const material = new StandardMaterial(`${name}Material`, scene);
  material.disableLighting = true;
  material.diffuseColor = new Color3(0, 0, 0);
  material.specularColor = new Color3(0, 0, 0);
  material.emissiveColor = new Color3(0.12, 0.13, 0.18);
  material.backFaceCulling = false;
  const paper = new StandardMaterial(`${name}Paper`, scene);
  paper.disableLighting = true;
  paper.diffuseColor = new Color3(0, 0, 0);
  paper.specularColor = new Color3(0, 0, 0);
  paper.emissiveColor = new Color3(0.96, 0.95, 0.9);
  paper.backFaceCulling = false;
  const sheet = CreatePlane(`${name}Sheet`, { width: size * 1.08, height: size * 1.08 }, scene);
  sheet.parent = root;
  sheet.material = paper;
  sheet.position.set(0, size * 0.54, 0.004);
  sheet.isPickable = false;
  const plane = CreatePlane(`${name}Plane`, { width: size, height: size }, scene);
  plane.parent = root;
  plane.material = material;
  plane.position.y = size * 0.54;
  plane.isPickable = false;
  root.onEnabledStateChangedObservable.add((on) => {
    if (!on || material.emissiveTexture) return;
    const texture = new Texture(`${import.meta.env.BASE_URL}assets/${file}`, scene, true, true);
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    material.emissiveTexture = texture;
    material.emissiveColor = new Color3(0, 0, 0);
  });
  return root;
}
// Which model stands for the craft that took a landmark's picture: its own where the
// game has one, else the orbiter of that world, else a Voyager. (Lunar Orbiter 2 is
// drawn as the Lunar Reconnaissance Orbiter: a small craft far off, told by its name.)
function probeFor(by, body) {
  const known = [['Voyager', 'voyager1'], ['Cassini', 'cassini'], ['New Horizons', 'newHorizons'], ['Juno', 'juno'], ['Reconnaissance', body === 'mars' ? 'mro' : 'lro'], ['Danuri', 'danuri']];
  const own = known.find(([word]) => by.includes(word));
  if (own) return own[1];
  return body === 'moon' ? 'lro' : body === 'mars' ? 'mro' : 'voyager1';
}
// The pieces of a landmark's scene (core/landmarkStages.js): what flies or falls, the
// flash, the picture, and what is said. `lazy`: built when the scene is first played.
const landmarkPieces = (id, { kind, by, body, say }) => {
  const build = (scene, name, mats) => {
    const pieces = { photo: printOf(scene, `${name}Photo`, `stories/${id}.jpg`, 1.05) };
    if (kind !== 'look') {
      const flash = new TransformNode(`${name}Flash`, scene);
      part(CreateSphere(`${name}FlashBall`, { diameter: 1, segments: 14 }, scene), flash, mats.white, [0, 0, 0]);
      pieces.flash = flash;
    }
    if (kind === 'photo') pieces.probe = CRAFT_BUILD[probeFor(by, body)](scene, `${name}Probe`, mats);
    if (kind === 'impact') {
      const rock = new TransformNode(`${name}Rock`, scene);
      if (by) {
        // A craft that hit: a foil box with its panels.
        box(scene, `${name}RockBody`, rock, mats.goldFoil, [0.2, 0.2, 0.2], [0, 0.1, 0]);
        for (const s of [-1, 1]) box(scene, `${name}RockWing${s}`, rock, mats.cells, [0.3, 0.012, 0.14], [s * 0.26, 0.1, 0]);
      } else {
        sphere(scene, `${name}RockBall`, rock, mats.dark, 0.4, [0, 0.2, 0], [1, 0.82, 0.9]);
        sphere(scene, `${name}RockLump`, rock, mats.grey, 0.22, [0.1, 0.3, 0.05]);
      }
      pieces.rock = fuse(scene, rock);
      pieces.scraps = scraps(scene, `${name}Scraps`, mats, mats.grey);
    }
    if (say) pieces.bubble = sayBubble(scene, `${name}Bubble`, say);
    return { pieces, flames: {}, lit: pieces.flash ? ['flash'] : [] };
  };
  build.lazy = true;
  return build;
};

// The pieces of the twenty-one landing scenes of core/landerScenes.js.
const landerSay = (scene, name, id, tail) => sayBubble(scene, `${name}Say`, LANDER_TEXTS[id].say, tail ? { tail } : {});
const LANDER_FLAME = [0, 0.12, 0, 0.34, 0.2];
// Chang'e 5 and 6's ascender alone, standing where it stands on the deck.
function ascenderAlone(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Body`, root, mats.plate, { height: 0.18, diameter: 0.2, tessellation: 8 }, [0, 0.5, 0]);
  drum(scene, `${name}Top`, root, mats.goldFoil, { height: 0.04, diameterTop: 0.1, diameterBottom: 0.2, tessellation: 8 }, [0, 0.61, 0]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0.42, 0], [0, -1, 0], 0.05, 0.07);
  return fuse(scene, root);
}
// A small red flag on a short staff held out sideways.
function redFlag(scene, name, mats) {
  const root = new TransformNode(name, scene);
  rod(scene, `${name}Staff`, root, mats.grey, [0, 0, 0], [-0.16, 0.16, 0], 0.008, 4);
  box(scene, `${name}Cloth`, root, mats.red, [0.16, 0.1, 0.005], [-0.24, 0.2, 0]);
  return fuse(scene, root);
}
function lump(scene, name, material, size, squash = 1) {
  const root = new TransformNode(name, scene);
  sphere(scene, `${name}Ball`, root, material, size, [0, (size * squash) / 2, 0], [1, squash, 1]);
  return fuse(scene, root);
}
const apolloCrew = (id, more) => (scene, name, mats) => ({
  pieces: {
    lander: apollo(scene, `${name}Lander`, mats, { withFlag: false }),
    ladder: astronaut(scene, `${name}Ladder`, mats, { climbing: true }),
    ...more(scene, name, mats),
    say: landerSay(scene, name, id),
  },
  flames: { lander: LANDER_FLAME },
});
const withRover = (id, lander, power) => (scene, name, mats) => ({
  pieces: {
    lander: deckLander(scene, `${name}Lander`, mats, lander),
    rover: rover(scene, `${name}Rover`, mats, { power }),
    say: landerSay(scene, name, id, id === 'change4' ? null : 'downRight'),
  },
  flames: { lander: LANDER_FLAME },
});
const alone = (id, build, options, flame) => (scene, name, mats) => ({
  pieces: { lander: build(scene, `${name}Lander`, mats, options), say: landerSay(scene, name, id) },
  flames: { lander: flame },
});
const LANDER_STAGE_BUILD = {
  apollo14: apolloCrew('apollo14', (scene, name, mats) => ({
    al: astronaut(scene, `${name}Al`, mats),
    ed: astronaut(scene, `${name}Ed`, mats),
    ball: lump(scene, `${name}Ball`, mats.white, 0.035),
  })),
  apollo15: apolloCrew('apollo15', (scene, name, mats) => ({ rover: lunarRover(scene, `${name}Rover`, mats) })),
  apollo16: apolloCrew('apollo16', (scene, name, mats) => ({
    flag: flagAlone(scene, `${name}Flag`, mats),
    john: astronaut(scene, `${name}John`, mats),
  })),
  surveyor1: (scene, name, mats) => ({
    pieces: {
      lander: surveyor(scene, `${name}Lander`, mats),
      retro: lump(scene, `${name}Retro`, mats.dark, 0.2),
      say: landerSay(scene, name, 'surveyor1'),
    },
    flames: { lander: [0, 0.14, 0, 0.3, 0.16] },
  }),
  surveyor7: alone('surveyor7', surveyor, undefined, [0, 0.14, 0, 0.3, 0.16]),
  luna24: (scene, name, mats) => ({
    pieces: {
      lander: lunaReturn(scene, `${name}Lander`, mats, { stage: 'lander' }),
      rocket: lunaReturn(scene, `${name}Rocket`, mats, { stage: 'rocket' }),
      say: landerSay(scene, name, 'luna24'),
    },
    flames: { lander: LANDER_FLAME, rocket: [0, 0.24, 0, 0.26, 0.13] },
  }),
  lunokhod2: (scene, name, mats) => ({
    pieces: {
      lander: deckLander(scene, `${name}Lander`, mats, { skin: 'foil' }),
      rover: rover(scene, `${name}Rover`, mats, { power: 'lid' }),
      say: landerSay(scene, name, 'lunokhod2', 'downRight'),
    },
    flames: { lander: LANDER_FLAME },
  }),
  change3: withRover('change3', {}, 'wings'),
  change4: withRover('change4', {}, 'wings'),
  ...Object.fromEntries(['change5', 'change6'].map((id) => [id, (scene, name, mats) => ({
    pieces: {
      lander: deckLander(scene, `${name}Lander`, mats, { ascender: 'gone', ramp: false }),
      rocket: ascenderAlone(scene, `${name}Rocket`, mats),
      flag: redFlag(scene, `${name}Flag`, mats),
      say: landerSay(scene, name, id),
    },
    flames: { lander: LANDER_FLAME, rocket: [0, 0.4, 0, 0.22, 0.1] },
  })])),
  blueGhost: alone('blueGhost', deckLander, { ramp: false, skin: 'plate' }, LANDER_FLAME),
  viking2: (scene, name, mats) => ({
    pieces: {
      lander: viking(scene, `${name}Lander`, mats),
      // The rock one of its feet came down on.
      rock: lump(scene, `${name}Rock`, mats.grey, 0.1, 0.6),
      say: landerSay(scene, name, 'viking2'),
    },
    flames: { lander: [0, 0.1, 0, 0.34, 0.2] },
  }),
  zhurong: withRover('zhurong', {}, 'butterfly'),
  phoenix: alone('phoenix', fanLander, {}, [0, 0.1, 0, 0.3, 0.16]),
  insight: alone('insight', fanLander, {}, [0, 0.1, 0, 0.3, 0.16]),
};

const MOON_STAGES = {
  ...LANDER_STAGE_BUILD,
  ...Object.fromEntries(Object.entries(LANDMARKS).map(([id, def]) => [id, landmarkPieces(id, def)])),
  naro: nuriPieces,
  tanegashima: rocketPieces('h2a'),
  wenchang: rocketPieces('cz5'),
  dokdo: dokdoPieces,
  // Shoemaker-Levy 9: four pieces of the comet (a bright head and its tail, light
  // itself), the ball of fire, and four bruises on the cloud tops.
  levyImpact: (scene, name, mats) => {
    // Fire of its own colours, lit by nothing: white light was lost on the pale cloud
    // tops of the day side.
    const fire = (id, hex) => {
      const material = new StandardMaterial(`${name}${id}`, scene);
      material.disableLighting = true;
      material.emissiveColor = Color3.FromHexString(hex);
      return material;
    };
    const hot = fire('Hot', '#ff7a1f');
    const ember = fire('Ember', '#c2330f');
    const core = fire('Core', '#ffd27a');
    const pieces = {};
    for (let i = 0; i < 4; i++) {
      const piece = new TransformNode(`${name}Piece${i}`, scene);
      sphere(scene, `${name}Head${i}`, piece, core, 0.13, [0, 0, 0]);
      drum(scene, `${name}Glow${i}`, piece, hot, { height: 0.5, diameterTop: 0.05, diameterBottom: 0.15, tessellation: 12 }, [0, 0.22, 0]);
      drum(scene, `${name}Tail${i}`, piece, ember, { height: 1.1, diameterTop: 0.01, diameterBottom: 0.09, tessellation: 10 }, [0, 0.62, 0]);
      pieces[`piece${i}`] = piece;
      const bruise = new TransformNode(`${name}Bruise${i}`, scene);
      drum(scene, `${name}Dark${i}`, bruise, mats.black, { height: 0.004, diameter: 0.5, tessellation: 28 }, [0, 0, 0]);
      drum(scene, `${name}Ring${i}`, bruise, mats.dark, { height: 0.002, diameter: 0.8, tessellation: 28 }, [0, -0.002, 0]);
      pieces[`bruise${i}`] = bruise;
    }
    // The ball of fire: a bright heart before an orange ball before a dark red one
    // (the stage's -z is toward whoever watches).
    const flash = new TransformNode(`${name}Flash`, scene);
    sphere(scene, `${name}FlashEmber`, flash, ember, 1, [0, 0, 0]);
    sphere(scene, `${name}FlashHot`, flash, hot, 0.8, [0, 0.04, -0.2]);
    sphere(scene, `${name}FlashCore`, flash, core, 0.5, [0, 0.08, -0.42]);
    pieces.flash = flash;
    return { pieces, flames: {} };
  },
  tombaughRegio: (scene, name, mats) => {
    const flash = new TransformNode(`${name}Flash`, scene);
    part(CreateSphere(`${name}FlashBall`, { diameter: 1, segments: 14 }, scene), flash, mats.white, [0, 0, 0]);
    return {
      pieces: {
        probe: CRAFT_BUILD.newHorizons(scene, `${name}Probe`, mats),
        flash,
        photo: plutoPhoto(scene, `${name}Photo`),
        bubble: sayBubble(scene, `${name}Bubble`, t('앗. 하트네')),
      },
      flames: {},
      lit: ['flash'],
    };
  },
  apollo11: (scene, name, mats) => ({
    pieces: {
      lander: apollo(scene, `${name}Lander`, mats, { withFlag: false }),
      neilLadder: astronaut(scene, `${name}NeilLadder`, mats, { climbing: true }),
      neil: astronaut(scene, `${name}Neil`, mats),
      buzzLadder: astronaut(scene, `${name}BuzzLadder`, mats, { climbing: true }),
      buzz: astronaut(scene, `${name}Buzz`, mats),
      flag: flagAlone(scene, `${name}Flag`, mats),
      sayLanded: sayBubble(scene, `${name}SayLanded`, t('휴스턴, 이글은 착륙했다')),
      sayStep: sayBubble(scene, `${name}SayStep`, t('이것은 한 사람에게는 작은 한 걸음이지만')),
      sayDesolation: sayBubble(scene, `${name}SayDesolation`, t('장엄한 황무지로군')),
      sayHops: sayBubble(scene, `${name}SayHops`, t('통. 통. 통. 이거 재밌는데?')),
    },
    flames: { lander: [0, 0.12, 0, 0.34, 0.2] },
  }),
  apollo17: (scene, name, mats) => ({
    pieces: {
      descent: apollo(scene, `${name}Descent`, mats, { stage: 'descent' }),
      ascent: apollo(scene, `${name}Ascent`, mats, { stage: 'ascent', withFlag: false }),
      rover: lunarRover(scene, `${name}Rover`, mats),
      scraps: scraps(scene, `${name}Scraps`, mats, mats.goldFoil),
      say: sayBubble(scene, `${name}Say`, t('토끼야. 빠이~')),
    },
    flames: { ascent: [0, 0.3, 0, 0.2, 0.14] },
  }),
  luna16: (scene, name, mats) => ({
    pieces: {
      lander: lunaReturn(scene, `${name}Lander`, mats, { stage: 'lander' }),
      rocket: lunaReturn(scene, `${name}Rocket`, mats, { stage: 'rocket' }),
      say: sayBubble(scene, `${name}Say`, t('나는 왜 두고 가?')),
    },
    flames: { rocket: [0, 0.24, 0, 0.26, 0.13] },
  }),
  lunokhod1: (scene, name, mats) => ({
    pieces: {
      lander: deckLander(scene, `${name}Lander`, mats, { skin: 'foil' }),
      rover: rover(scene, `${name}Rover`, mats, { power: 'lid' }),
      say: sayBubble(scene, `${name}Say`, t('부릉부릉. 드라이브 가자~'), { tail: 'downRight' }),
    },
    flames: { lander: [0, 0.12, 0, 0.34, 0.2] },
  }),
  slim: (scene, name, mats) => {
    const bit = (id, material, size) => {
      const root = new TransformNode(`${name}${id}`, scene);
      sphere(scene, `${name}${id}Ball`, root, material, size, [0, size / 2, 0]);
      return fuse(scene, root);
    };
    const nozzleRoot = new TransformNode(`${name}Nozzle`, scene);
    nozzle(scene, `${name}NozzleBell`, nozzleRoot, mats.dark, [0, 0.1, 0], [0, -1, 0], 0.1, 0.1);
    return {
      pieces: {
        slim: slim(scene, `${name}Body`, mats, { upright: true }),
        nozzle: fuse(scene, nozzleRoot),
        lev1: bit('Lev1', mats.goldFoil, 0.09),
        lev2: bit('Lev2', mats.chrome, 0.07),
        say: sayBubble(scene, `${name}Say`, t('아이쿠~')),
      },
      flames: { slim: [0, -0.25, 0, 0.3, 0.16] },
    };
  },
  odysseus: (scene, name, mats) => ({
    pieces: {
      lander: odysseus(scene, `${name}Lander`, mats, { upright: true }),
      say: sayBubble(scene, `${name}Say`, t('아슬아슬했다')),
    },
    flames: { lander: [0, 0.06, 0, 0.32, 0.18] },
  }),
  chandrayaan3: (scene, name, mats) => ({
    pieces: {
      lander: deckLander(scene, `${name}Lander`, mats, {}),
      rover: rover(scene, `${name}Rover`, mats, { power: 'wings' }),
      say: sayBubble(scene, `${name}Say`, t('인도여, 나는 목적지에 닿았고 그대도 그러하다')),
    },
    flames: { lander: [0, 0.12, 0, 0.34, 0.2] },
  }),
  luna2: (scene, name, mats) => {
    const flash = new TransformNode(`${name}Flash`, scene);
    part(CreateSphere(`${name}FlashBall`, { diameter: 1, segments: 14 }, scene), flash, mats.white, [0, 0, 0]);
    return {
      pieces: {
        probe: lunaBall(scene, `${name}Probe`, mats),
        wreck: impactor(scene, `${name}Wreck`, mats),
        scraps: scraps(scene, `${name}Scraps`, mats, mats.grey),
        flash,
        say: sayBubble(scene, `${name}Say`, t('아야. 그래도 일등')),
      },
      flames: {},
      lit: ['flash'],
    };
  },
  apollo12: (scene, name, mats) => ({
    pieces: {
      surveyor: surveyor(scene, `${name}Surveyor`, mats),
      lander: apollo(scene, `${name}Lander`, mats, { withFlag: false }),
      say: sayBubble(scene, `${name}Say`, t('야호! 닐에게는 작은 걸음, 나한테는 큰 걸음')),
    },
    flames: { lander: [0, 0.12, 0, 0.34, 0.2] },
  }),
};

// Which model stands at which place.
const apolloLm = [apollo, {}];
export const SITE_BUILD = {
  apollo11: apolloLm, apollo12: apolloLm, apollo14: apolloLm, apollo15: apolloLm, apollo16: apolloLm, apollo17: apolloLm,
  surveyor1: [surveyor, {}], surveyor7: [surveyor, {}],
  luna2: [impactor, {}], luna9: [capsule, {}], mars3: [capsule, {}],
  luna16: [lunaReturn, {}], luna24: [lunaReturn, {}],
  lunokhod1: [rover, { power: 'lid' }], lunokhod2: [rover, { power: 'lid' }],
  change3: [deckLander, {}], change4: [deckLander, {}],
  change5: [deckLander, { ascender: true, ramp: false }], change6: [deckLander, { ascender: true, ramp: false }],
  chandrayaan3: [deckLander, {}], blueGhost: [deckLander, { ramp: false, skin: 'plate' }],
  slim: [slim, {}], odysseus: [odysseus, {}],
  viking1: [viking, {}], viking2: [viking, {}],
  pathfinder: [pathfinder, {}], beagle2: [beagle, {}],
  spirit: [rover, { power: 'wings' }], opportunity: [rover, { power: 'wings' }], zhurong: [rover, { power: 'butterfly' }],
  curiosity: [rover, { power: 'rtg' }], perseverance: [rover, { power: 'rtg', helicopter: true }],
  phoenix: [fanLander, {}], insight: [fanLander, { insight: true }],
  huygens: [huygens, {}],
  lc39a: [launchPad, { rocket: 'saturn' }], naro: [launchPad, { rocket: 'nuri' }],
  tanegashima: [launchPad, { rocket: 'h2a' }], wenchang: [launchPad, { rocket: 'cz5' }],
  messenger: [messenger, {}], venera7: [capsule, {}], venera13: [capsule, {}],
};

// What one that bounces or comes straight down says (core/replay.js `say`; the user, 2026-10-06, of
// five lines offered for Luna 9: "1").
export const SITE_SAYS = {
  luna9: () => t('통. 통. 통. 어지러워~'),
  // (Of five lines offered for Viking 1, 2026-10-07: "2".)
  viking1: () => t('화성아. 안녕? 처음 뵙겠습니다'),
  // (Of five offered for Curiosity: "4": to the stage that let it down, as that flies off.)
  curiosity: () => t('태워 줘서 고마워. 잘 가~'),
  // (Of five offered for Venera 7: "1": as it comes down through 475 degrees.)
  venera7: () => t('앗 뜨거. 사우나보다 더워~'),
  // (Of five offered for Venera 13: "4": it sent the first sound from another planet.)
  venera13: () => t('쉿. 금성의 바람 소리야'),
  // (Of five offered for Huygens, 2026-10-07: "2": the ground it met was like wet sand.)
  huygens: () => t('푹. 어라, 젖은 모래 같네'),
  // (Of five offered for pad 39A: "1": Doug Hurley's own words before lift-off, "Let's
  // light this candle", which were Alan Shepard's in 1961.)
  lc39a: () => t('이 불을 켜 봅시다'),
  // (Of five offered for Cassini's plunge: "5": Saturn itself, once Cassini is gone; a
  // pair to its "첫 손님이네요" in Voyager 2's scene.)
  cassiniPlunge: () => t('잘 왔어. 이제 쉬어'),
  // (Philae: the user's own two, 2026-10-07, in place of the five offered: 첫번째
  // "어~ 어~ 어~", 두번째 "아이쿠". The second is in SECOND_SAYS below.)
  philaeLanding: () => t('어~ 어~ 어~'),
  // The five of core/landerScenes.js that are not stages (core/landerTexts.js).
  ...Object.fromEntries(['mars3', 'beagle2', 'spirit', 'opportunity', 'perseverance'].map((id) => [id, () => LANDER_TEXTS[id].say])),
};

// Whose first bubble carries the speaker's name on a tag: Saturn, in Cassini's plunge (the
// user, 2026-10-07: "토성이 너무 크니까, 말하는게 토성인지 뭔지 알 수가 없네", then of
// three ways offered: "1").
export const SAYS_BY = { cassiniPlunge: () => t('토성') };

// Whose first bubble stands to its LEFT, the tail down to the right: Philae is at the
// right edge of a narrow phone's view while it floats.
// (And Saturn's in Cassini's plunge: Cassini comes in from the right, across where a
// bubble on the right would stand.)
export const SAYS_ON_LEFT = new Set(['philaeLanding', 'cassiniPlunge']);

// A second thing one of them says later in its scene (core/replay.js `say2`).
export const SECOND_SAYS = {
  philaeLanding: () => t('아이쿠'),
  // (Cassini's plunge, the user, 2026-10-07: "떨어지기 전에 토성이 얘기하고, 카시니가
  // 떨어지기 시작한다. 쿵~".)
  cassiniPlunge: () => t('쿵~'),
};

// What a rocket's first stage says as it parts and turns back (core/replay.js sayBooster;
// the user, 2026-10-07, after choosing "1": "3도 추가").
export const BOOSTER_SAYS = {
  lc39a: () => t('나는 집에 갈게. 잘 가~'),
};

// For "그날로" (core/replay.js): what came down that day, as it was then.
// The third item says what shows while it comes down: an engine's flame (the default)
// a parachute, or a rocket stage it hangs from (the sky crane).
export const SITE_REPLAY_BUILD = {
  // (The fourth item: how high the flame's middle is; Viking's engines are under its
  // body, between the legs.)
  viking1: [viking, {}, 'flame', 0.1],
  huygens: [huygens, {}, 'chute'],
  // Venus: both came down under a parachute through the thick air.
  venera7: [capsule, {}, 'chute'], venera13: [capsule, {}, 'chute'],
  curiosity: [rover, { power: 'rtg' }, 'crane'], perseverance: [rover, { power: 'rtg' }, 'crane'],
  // Mars 3 under its parachute (its last rocket is not drawn).
  mars3: [capsule, {}, 'chute'],
  // Those that bounced. 'bag': it comes down inside air bags (the fourth item: the
  // ball's radius, how high the model's middle is, and how many lobes: Luna 9's two
  // halves, Pathfinder's cluster), which go down when it stops. 'bare': nothing round it.
  luna9: [capsule, { closed: true }, 'bag', { radius: 0.37, centre: 0.22, lobes: 2 }],
  pathfinder: [pathfinder, { stowed: true }, 'bag', { radius: 0.66, centre: 0.2, lobes: 4 }],
  // Spirit and Opportunity came down as Pathfinder did, each folded on its lander's base.
  spirit: [pathfinder, { stowed: true }, 'bag', { radius: 0.66, centre: 0.2, lobes: 4 }],
  opportunity: [pathfinder, { stowed: true }, 'bag', { radius: 0.66, centre: 0.2, lobes: 4 }],
  beagle2: [beagle, {}, 'bag', { radius: 0.34, centre: 0.06, lobes: 3 }],
  // Not a story place of its own: played on the comet (core/replay.js philaeLanding).
  philaeLanding: [philae, {}, 'bare'],
  // 'launch': it goes up, in pieces (falconLaunch above; render/craft.js moves them).
  lc39a: [falconLaunch, {}, 'launch'],
  // 'stage': pieces put where the scene says, each moment (MOON_STAGES above).
  ...Object.fromEntries(Object.entries(MOON_STAGES).map(([id, build]) => [id, [build, {}, 'stage']])),
};
