import { TransformNode, Vector3, CreateBox, CreateSphere, CreateRibbon, Mesh } from './babylon.js';
import {
  QUARTER, part, cyl, group, aim, box, drum, rod, dish, truss, wing, rtg, nozzle, thrusters, fuse,
} from './craftParts.js';

// The spacecraft, telescopes and stations, each about one unit across and built from
// the parts in craftParts.js. Local +z points at the Sun (Voyager's dish toward home,
// Webb's sunshield toward the light). Proportions follow the real machines; the small
// fittings (thrusters, antennas, handrails, radiators) are where they really are, though
// thicker than life so they can be seen.

const Z = [0, 0, 1];
const sphere = (scene, name, parent, material, diameter, position, scaling = [1, 1, 1]) => part(
  CreateSphere(name, { diameter, segments: 12 }, scene), parent, material, position, [0, 0, 0], scaling,
);
// Points on a circle of radius r in the xy plane (z given), starting at angle `turn`.
const ring = (count, r, z = 0, turn = 0) => Array.from({ length: count }, (_, k) => {
  const a = turn + (k * 2 * Math.PI) / count;
  return [Math.cos(a) * r, Math.sin(a) * r, z, a];
});

// Voyager: a 3.7 m dish on a ten-sided bus, three power units out on a boom to one
// side, the science boom with its scan platform to the other, the 13 m magnetometer
// boom, two whip antennas, and the Golden Record on the bus.
function voyager(scene, name, mats) {
  const root = new TransformNode(name, scene);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0, 0.03], toward: Z, diameter: 0.5 });
  drum(scene, `${name}Bus`, root, mats.blackFoil, { height: 0.08, diameter: 0.25, tessellation: 10 }, [0, 0, -0.03], Z);
  for (const [x, y, z, a] of ring(10, 0.122, -0.03, 0.31)) {
    box(scene, `${name}Louver${a}`, root, mats.white, [0.05, 0.004, 0.05], [x, y, z], [0, 0, a + QUARTER]);
  }
  sphere(scene, `${name}Tank`, root, mats.gold, 0.1, [0, 0, -0.08]);
  // The Golden Record, on the bus's outer wall.
  drum(scene, `${name}Record`, root, mats.gold, { height: 0.008, diameter: 0.075 }, [0.04, -0.128, -0.03]);
  drum(scene, `${name}RecordHub`, root, mats.dark, { height: 0.01, diameter: 0.02 }, [0.04, -0.129, -0.03]);
  // Power: three finned units end to end.
  truss(scene, `${name}RtgBoom`, root, mats.grey, [-0.11, 0, -0.05], [-0.27, 0, -0.1], 0.03, 3);
  for (let k = 0; k < 3; k++) {
    rtg(scene, `${name}Rtg${k}`, root, mats, [-0.28 - k * 0.075, 0, -0.103 - k * 0.023], [-0.345 - k * 0.075, 0, -0.123 - k * 0.023], 0.055);
  }
  // Science boom and scan platform: two cameras and two spectrometers that turn together.
  truss(scene, `${name}SciBoom`, root, mats.grey, [0.11, 0, -0.05], [0.36, -0.06, -0.09], 0.03, 4);
  box(scene, `${name}Plasma`, root, mats.goldFoil, [0.04, 0.05, 0.04], [0.24, -0.06, -0.06]);
  const scan = group(scene, `${name}Scan`, root, [0.4, -0.08, -0.1], [0.3, 0.4, 0]);
  box(scene, `${name}ScanBase`, scan, mats.white, [0.07, 0.07, 0.05]);
  drum(scene, `${name}Narrow`, scan, mats.white, { height: 0.11, diameter: 0.04 }, [0.02, 0.07, 0]);
  drum(scene, `${name}NarrowLens`, scan, mats.black, { height: 0.004, diameter: 0.034 }, [0.02, 0.126, 0]);
  drum(scene, `${name}Wide`, scan, mats.white, { height: 0.06, diameter: 0.028 }, [-0.02, 0.05, 0.015]);
  box(scene, `${name}Iris`, scan, mats.goldFoil, [0.03, 0.08, 0.03], [-0.02, 0.05, -0.02]);
  // The long magnetometer boom, a spidery lattice, with two sensors on it.
  rod(scene, `${name}MagBoom`, root, mats.grey, [0.08, 0.09, -0.07], [0.5, 0.55, -0.14], 0.012, 3);
  box(scene, `${name}Mag0`, root, mats.goldFoil, [0.025, 0.025, 0.025], [0.29, 0.32, -0.105]);
  box(scene, `${name}Mag1`, root, mats.goldFoil, [0.025, 0.025, 0.025], [0.5, 0.55, -0.14]);
  // Two ten-metre whips at right angles for radio and plasma waves.
  rod(scene, `${name}Whip0`, root, mats.chrome, [0, -0.1, -0.07], [-0.3, -0.42, -0.2], 0.006, 4);
  rod(scene, `${name}Whip1`, root, mats.chrome, [0, -0.1, -0.07], [0.3, -0.42, -0.2], 0.006, 4);
  thrusters(scene, `${name}Jet`, root, mats, ring(4, 0.13, -0.07, 0.8).map(([x, y, z]) => [[x, y, z], [x, y, -0.1]]), 0.018);
  return fuse(scene, root);
}

// Hubble: a narrow forward tube with the aperture door open, a fatter equipment ring
// and aft shroud with its instrument doors and handrails, two solar arrays on masts and
// two dish antennas on booms. It never looks at the Sun, so the tube lies across the
// sunward axis.
function hubble(scene, name, mats) {
  const outer = new TransformNode(name, scene);
  const root = group(scene, `${name}Body`, outer, [0, 0, 0], [-QUARTER, 0, 0]);
  const tube = (id, diameter, height, z, material, tessellation = 32) => drum(scene, `${name}${id}`, root, material, { height, diameter, tessellation }, [0, 0, z], Z);
  tube('Forward', 0.23, 0.6, 0.18, mats.foil);
  tube('Bay', 0.31, 0.12, -0.18, mats.foil);
  tube('Aft', 0.32, 0.26, -0.37, mats.foil);
  tube('Bulkhead', 0.3, 0.012, -0.505, mats.dark);
  tube('Mouth', 0.21, 0.01, 0.482, mats.black);
  // Dark bands where the sections join, and the rim of the aperture.
  for (const [i, z, d] of [[0, 0.47, 0.238], [1, 0.3, 0.236], [2, 0.12, 0.236], [3, -0.12, 0.316], [4, -0.24, 0.326], [5, -0.49, 0.326]]) {
    tube(`Band${i}`, d, 0.008, z, mats.grey);
  }
  // Aperture door, swung open on its hinge at the top of the mouth.
  const hinge = group(scene, `${name}Hinge`, root, [0, 0.115, 0.48], [-1.85, 0, 0]);
  drum(scene, `${name}Door`, hinge, mats.foil, { height: 0.01, diameter: 0.23, tessellation: 32 }, [0, -0.115, 0], Z);
  drum(scene, `${name}DoorInside`, hinge, mats.black, { height: 0.004, diameter: 0.2, tessellation: 32 }, [0, -0.115, 0.007], Z);
  // Equipment bay doors round the ring, and the instrument doors on the aft shroud.
  for (const [x, y, , a] of ring(8, 0.157, 0, 0.39)) {
    box(scene, `${name}BayDoor${a}`, root, mats.plate, [0.09, 0.004, 0.09], [x, y, -0.18], [0, 0, a + QUARTER]);
  }
  for (const [x, y, , a] of ring(4, 0.162, 0, 0.78)) {
    box(scene, `${name}AftDoor${a}`, root, mats.plate, [0.13, 0.004, 0.2], [x, y, -0.37], [0, 0, a + QUARTER]);
  }
  // Yellow handrails for the astronauts who serviced it, and their foot sockets.
  for (const [x, y, , a] of ring(6, 0.167, 0, 0.2)) {
    rod(scene, `${name}Rail${a}`, root, mats.gold, [x, y, -0.28], [x, y, -0.46], 0.006, 4);
    rod(scene, `${name}BayRail${a}`, root, mats.gold, [x * 0.96, y * 0.96, -0.13], [x * 0.96, y * 0.96, -0.23], 0.006, 4);
  }
  for (const [x, y, , a] of ring(4, 0.12, 0, 0.6)) rod(scene, `${name}TubeRail${a}`, root, mats.gold, [x, y, 0.14], [x, y, 0.44], 0.005, 4);
  // Fine guidance sensors and star trackers looking out of the aft shroud.
  for (const [x, y] of ring(3, 0.17, 0, 2.2)) box(scene, `${name}Tracker${x}`, root, mats.dark, [0.04, 0.04, 0.06], [x, y, -0.27]);
  // Solar arrays: rigid panels 7.6 m long, each on a mast, lying along the tube.
  for (const s of [-1, 1]) {
    rod(scene, `${name}Mast${s}`, root, mats.grey, [s * 0.12, 0, 0.08], [s * 0.32, 0, 0.08], 0.014, 6);
    wing(scene, `${name}ArrayA${s}`, root, mats, { from: [s * 0.41, 0, 0.08], to: [s * 0.41, 0, 0.37], width: 0.19, panels: 2, face: [0, 1, 0], yoke: 0, back: mats.goldFoil });
    wing(scene, `${name}ArrayB${s}`, root, mats, { from: [s * 0.41, 0, 0.08], to: [s * 0.41, 0, -0.21], width: 0.19, panels: 2, face: [0, 1, 0], yoke: 0, back: mats.goldFoil });
    box(scene, `${name}Spar${s}`, root, mats.grey, [0.014, 0.016, 0.6], [s * 0.41, 0, 0.08]);
    box(scene, `${name}Drive${s}`, root, mats.dark, [0.04, 0.04, 0.04], [s * 0.13, 0, 0.08]);
    // High-gain antennas: small dishes on booms above and below the tube.
    rod(scene, `${name}Boom${s}`, root, mats.grey, [0, s * 0.11, 0.1], [0, s * 0.36, 0.1], 0.008, 5);
    dish(scene, `${name}Hga${s}`, root, mats, { at: [0, s * 0.36, 0.1], toward: [0, s, 0], diameter: 0.1 });
  }
  // The docking ring left by the last servicing mission.
  tube('Dock', 0.14, 0.02, -0.52, mats.grey, 20);
  return fuse(scene, outer);
}

// Webb: five kite-shaped sunshield layers with their spreader bars, and on the cold
// side a gold mirror of 18 hexagons facing sideways, its secondary held out on three
// booms and the dark cone of the aft optics at its centre. The bus, solar panel, star
// trackers and antenna hang on the hot side.
function webb(scene, name, mats) {
  const root = new TransformNode(name, scene);
  for (let i = 0; i < 5; i++) {
    const size = 1 - i * 0.035;
    part(cyl(scene, `${name}Shield${i}`, { height: 0.004, diameter: size, tessellation: 6 }), root, i === 0 ? mats.shield : mats.silver,
      [0, 0, 0.05 - i * 0.02], [QUARTER, 0, 0], [0.66, 1, 1]);
  }
  // Spreader bars from the centre to the six corners, and the pallets fore and aft.
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    rod(scene, `${name}Bar${k}`, root, mats.grey, [0, 0, 0.056], [Math.cos(a) * 0.5 * 0.66, Math.sin(a) * 0.5, 0.056], 0.008, 4);
    rod(scene, `${name}BackBar${k}`, root, mats.grey, [0, 0, -0.036], [Math.cos(a) * 0.43 * 0.66, Math.sin(a) * 0.43, -0.036], 0.008, 4);
  }
  box(scene, `${name}PalletFore`, root, mats.dark, [0.09, 0.42, 0.02], [0, 0.26, 0.068]);
  box(scene, `${name}PalletAft`, root, mats.dark, [0.09, 0.42, 0.02], [0, -0.26, 0.068]);
  // The hot side: bus, a solar panel on its boom, radiators, star trackers and the antenna.
  box(scene, `${name}Bus`, root, mats.foil, [0.15, 0.13, 0.07], [0, -0.04, 0.105]);
  box(scene, `${name}BusRadiator`, root, mats.white, [0.152, 0.06, 0.02], [0, -0.04, 0.142]);
  wing(scene, `${name}Panel`, root, mats, { from: [0, -0.1, 0.11], to: [0, -0.46, 0.2], width: 0.1, panels: 5, face: [0, 0.25, 1], yoke: 0.08 });
  dish(scene, `${name}Antenna`, root, mats, { at: [0.05, 0.0, 0.17], toward: Z, diameter: 0.07 });
  rod(scene, `${name}AntennaArm`, root, mats.grey, [0.05, -0.02, 0.14], [0.05, 0, 0.165], 0.01, 4);
  for (const s of [-1, 1]) box(scene, `${name}Tracker${s}`, root, mats.dark, [0.025, 0.03, 0.04], [s * 0.06, -0.09, 0.15], [0.5, 0, 0]);
  thrusters(scene, `${name}Jet`, root, mats, [[[0.08, -0.1, 0.11], [1, -1, 1]], [[-0.08, -0.1, 0.11], [-1, -1, 1]], [[0.08, 0.02, 0.11], [1, 1, 1]], [[-0.08, 0.02, 0.11], [-1, 1, 1]]], 0.016);
  // The flap at the far tip that balances the push of sunlight.
  box(scene, `${name}Flap`, root, mats.silver, [0.1, 0.11, 0.004], [0, -0.53, 0.02], [0.7, 0, 0]);
  rod(scene, `${name}FlapArm`, root, mats.grey, [0, -0.47, 0.06], [0, -0.5, 0.04], 0.008, 4);

  // Mirror: two rings of hexagons round an empty middle, standing on the cold side.
  const mirror = group(scene, `${name}Mirror`, root, [0, 0.03, -0.24]);
  const pitch = 0.064; // centre to centre: 1.32 m segments on a 21 m shield
  let n = 0;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if ((q === 0 && r === 0) || Math.abs(q + r) > 2) continue;
      const x = pitch * q * Math.cos(Math.PI / 6);
      const z = pitch * (r + q * Math.sin(Math.PI / 6));
      part(cyl(scene, `${name}Hex${n}`, { height: 0.01, diameter: pitch * 1.1, tessellation: 6 }), mirror, mats.gold, [x, 0, z]);
      part(cyl(scene, `${name}HexBack${n++}`, { height: 0.012, diameter: pitch * 0.9, tessellation: 6 }), mirror, mats.black, [x, -0.012, z]);
    }
  }
  // The backplane lattice, the instrument module behind it and its radiator.
  part(cyl(scene, `${name}Back`, { height: 0.012, diameter: 0.34, tessellation: 6 }), mirror, mats.black, [0, -0.026, 0], [0, Math.PI / 6, 0]);
  box(scene, `${name}Instruments`, mirror, mats.blackFoil, [0.17, 0.08, 0.15], [0, -0.07, 0]);
  box(scene, `${name}Radiator`, mirror, mats.white, [0.17, 0.004, 0.12], [0, -0.112, 0]);
  // The aft optics: a dark cone standing in the mirror's central hole.
  drum(scene, `${name}Aft`, mirror, mats.black, { height: 0.08, diameterTop: 0.012, diameterBottom: 0.04, tessellation: 12 }, [0, 0.045, 0]);
  // Secondary mirror on three booms, 7 m in front of the primary.
  const apex = [0, 0.34, 0];
  for (const [i, x, z] of [[0, -0.15, 0.09], [1, 0.15, 0.09], [2, 0, -0.17]]) rod(scene, `${name}Strut${i}`, mirror, mats.black, [x, 0, z], apex, 0.007, 4);
  drum(scene, `${name}Secondary`, mirror, mats.gold, { height: 0.01, diameter: 0.04, tessellation: 16 }, apex);
  drum(scene, `${name}SecondaryBack`, mirror, mats.black, { height: 0.012, diameter: 0.046, tessellation: 16 }, [0, 0.351, 0]);
  // Tower holding the mirror clear of the shield.
  box(scene, `${name}Tower`, root, mats.black, [0.05, 0.05, 0.1], [0, 0.0, -0.08]);
  for (const s of [-1, 1]) rod(scene, `${name}TowerBrace${s}`, root, mats.grey, [s * 0.06, -0.06, -0.04], [s * 0.03, 0.0, -0.13], 0.008, 4);
  return fuse(scene, root);
}

// Webb again with its moving parts loose, for the scene of its unfolding
// (core/craftScenes.js): the same measures as `webb` above. pose({ pallets, tower,
// booms, tension, secondary, wingLeft, wingRight }), each 0 (folded) → 1 (as it flies).
// Folded, the shield is a narrow short bundle of five layers lying together, the
// telescope sits low on it, the secondary mirror's legs lie flat and the mirror's two
// outer columns are swung back behind it.
function webbUnfolding(scene, name, mats) {
  const root = new TransformNode(name, scene);
  // What does not move: the bus and what hangs on the hot side, and the tower.
  const fixed = group(scene, `${name}Fixed`, root);
  box(scene, `${name}Bus`, fixed, mats.foil, [0.15, 0.13, 0.07], [0, -0.04, 0.105]);
  box(scene, `${name}BusRadiator`, fixed, mats.white, [0.152, 0.06, 0.02], [0, -0.04, 0.142]);
  wing(scene, `${name}Panel`, fixed, mats, { from: [0, -0.1, 0.11], to: [0, -0.46, 0.2], width: 0.1, panels: 5, face: [0, 0.25, 1], yoke: 0.08 });
  dish(scene, `${name}Antenna`, fixed, mats, { at: [0.05, 0.0, 0.17], toward: Z, diameter: 0.07 });
  box(scene, `${name}Tower`, fixed, mats.black, [0.05, 0.05, 0.1], [0, 0.0, -0.08]);
  fuse(scene, fixed);
  // The shield: its bars and pallets in one group that widens (the booms) and lengthens
  // (the pallets), and five layers that also draw apart.
  const frame = group(scene, `${name}Frame`, root);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    rod(scene, `${name}Bar${k}`, frame, mats.grey, [0, 0, 0.056], [Math.cos(a) * 0.5 * 0.66, Math.sin(a) * 0.5, 0.056], 0.008, 4);
  }
  box(scene, `${name}PalletFore`, frame, mats.dark, [0.09, 0.42, 0.02], [0, 0.26, 0.068]);
  box(scene, `${name}PalletAft`, frame, mats.dark, [0.09, 0.42, 0.02], [0, -0.26, 0.068]);
  const layers = [];
  for (let i = 0; i < 5; i++) {
    layers.push(part(cyl(scene, `${name}Shield${i}`, { height: 0.004, diameter: 1 - i * 0.035, tessellation: 6 }), root, i === 0 ? mats.shield : mats.silver,
      [0, 0, 0.05], [QUARTER, 0, 0], [0.66, 1, 1]));
  }
  // The telescope: the middle three columns of the mirror with what is behind them, a
  // wing of three hexagons hinged to either side, and the secondary on its legs.
  const mirror = group(scene, `${name}Mirror`, root, [0, 0.03, -0.24]);
  const pitch = 0.064;
  const across = pitch * Math.cos(Math.PI / 6);
  const wings = { [-1]: group(scene, `${name}WingLeft`, mirror, [-1.5 * across, 0, 0]), 1: group(scene, `${name}WingRight`, mirror, [1.5 * across, 0, 0]) };
  let n = 0;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if ((q === 0 && r === 0) || Math.abs(q + r) > 2) continue;
      const x = across * q;
      const z = pitch * (r + q * Math.sin(Math.PI / 6));
      const side = Math.abs(q) === 2 ? Math.sign(q) : 0;
      const parent = side ? wings[side] : mirror;
      const at = side ? x - side * 1.5 * across : x;
      part(cyl(scene, `${name}Hex${n}`, { height: 0.01, diameter: pitch * 1.1, tessellation: 6 }), parent, mats.gold, [at, 0, z]);
      part(cyl(scene, `${name}HexBack${n++}`, { height: 0.012, diameter: pitch * 0.9, tessellation: 6 }), parent, mats.black, [at, -0.012, z]);
    }
  }
  part(cyl(scene, `${name}Back`, { height: 0.012, diameter: 0.25, tessellation: 6 }), mirror, mats.black, [0, -0.026, 0], [0, Math.PI / 6, 0]);
  box(scene, `${name}Instruments`, mirror, mats.blackFoil, [0.17, 0.08, 0.15], [0, -0.07, 0]);
  box(scene, `${name}Radiator`, mirror, mats.white, [0.17, 0.004, 0.12], [0, -0.112, 0]);
  drum(scene, `${name}Aft`, mirror, mats.black, { height: 0.08, diameterTop: 0.012, diameterBottom: 0.04, tessellation: 12 }, [0, 0.045, 0]);
  const secondary = group(scene, `${name}SecondaryLegs`, mirror);
  const apex = [0, 0.34, 0];
  for (const [i, x, z] of [[0, -0.15, 0.09], [1, 0.15, 0.09], [2, 0, -0.17]]) rod(scene, `${name}Strut${i}`, secondary, mats.black, [x, 0, z], apex, 0.007, 4);
  drum(scene, `${name}Secondary`, secondary, mats.gold, { height: 0.01, diameter: 0.04, tessellation: 16 }, apex);
  drum(scene, `${name}SecondaryBack`, secondary, mats.black, { height: 0.012, diameter: 0.046, tessellation: 16 }, [0, 0.351, 0]);
  for (const mesh of root.getChildMeshes(false)) mesh.isPickable = false;

  function pose({ pallets, tower, booms, tension, secondary: legs, wingLeft, wingRight }) {
    const wide = 0.16 + 0.84 * booms;
    const long = 0.36 + 0.64 * pallets;
    frame.scaling.set(wide, long, 1);
    layers.forEach((layer, i) => {
      // The local z of a layer lies along the craft's length (it is turned a quarter).
      layer.scaling.set(0.66 * wide, 1, long);
      // Together at first, 0.004 apart; each in turn goes out to its own 0.02.
      const out = Math.max(0, Math.min(1, tension * 5 - (4 - i)));
      layer.position.z = 0.05 - i * (0.004 + 0.016 * out);
    });
    mirror.position.z = -0.17 - 0.07 * tower;
    secondary.scaling.y = 0.1 + 0.9 * legs;
    // Swung back behind the mirror by 100 degrees, then round into its plane.
    wings[-1].rotation.z = 1.75 * (1 - wingLeft);
    wings[1].rotation.z = -1.75 * (1 - wingRight);
  }
  pose({ pallets: 0, tower: 0, booms: 0, tension: 0, secondary: 0, wingLeft: 0, wingRight: 0 });
  return { root, pose };
}

// The craft that have a scene of unfolding: id → builder giving { root, pose }.
export const CRAFT_UNFOLD = { jwst: webbUnfolding };

// Kepler: a photometer tube under a slanted sunshade, solar panels wrapped round the
// sunward side, a six-sided bus with its radiator, star trackers and thrusters, and a
// dish antenna at the foot. The tube points across the sunward axis; the panels face the Sun.
function kepler(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const up = (id, options, material, y) => drum(scene, `${name}${id}`, root, material, { tessellation: 24, ...options }, [0, y, 0]);
  up('Bus', { height: 0.18, diameter: 0.46, tessellation: 6 }, mats.goldFoil, -0.36);
  up('Deck', { height: 0.012, diameter: 0.48, tessellation: 6 }, mats.grey, -0.268);
  up('Tube', { height: 0.5, diameter: 0.34 }, mats.foil, -0.02);
  up('Shade', { height: 0.3, diameterTop: 0.4, diameterBottom: 0.36 }, mats.foil, 0.36);
  up('Mouth', { height: 0.01, diameter: 0.36 }, mats.black, 0.512);
  up('Lip', { height: 0.012, diameter: 0.405 }, mats.grey, 0.51);
  for (const y of [0.215, 0.05, -0.12]) up(`Collar${y}`, { height: 0.012, diameter: 0.35 }, mats.grey, y);
  // Four panels round the sunward half of the tube, each framed.
  for (const [i, angle] of [[0, -0.9], [1, -0.3], [2, 0.3], [3, 0.9]]) {
    const at = [Math.sin(angle) * 0.2, 0.0, Math.cos(angle) * 0.2];
    box(scene, `${name}Panel${i}`, root, mats.cells, [0.115, 0.58, 0.008], at, [0, angle, 0]);
    box(scene, `${name}PanelTop${i}`, root, mats.grey, [0.12, 0.01, 0.012], [at[0], 0.292, at[2]], [0, angle, 0]);
    box(scene, `${name}PanelFoot${i}`, root, mats.grey, [0.12, 0.01, 0.012], [at[0], -0.292, at[2]], [0, angle, 0]);
  }
  // The radiator on the shaded side keeps the detectors cold.
  box(scene, `${name}Radiator`, root, mats.white, [0.2, 0.26, 0.006], [0, 0.0, -0.176]);
  dish(scene, `${name}Dish`, root, mats, { at: [0, -0.47, -0.08], toward: [0, -1, 0], diameter: 0.2 });
  rod(scene, `${name}DishArm`, root, mats.grey, [0, -0.45, -0.08], [0, -0.42, -0.02], 0.014, 5);
  for (const s of [-1, 1]) {
    box(scene, `${name}Tracker${s}`, root, mats.dark, [0.045, 0.07, 0.045], [s * 0.13, -0.27, -0.19], [-0.5, 0, 0]);
    box(scene, `${name}Box${s}`, root, mats.plate, [0.1, 0.1, 0.02], [s * 0.1, -0.36, 0.2]);
  }
  thrusters(scene, `${name}Jet`, root, mats, ring(6, 0.22, 0, 0.5).map(([x, z]) => [[x, -0.44, z], [x, -0.3, z]]), 0.02);
  return fuse(scene, root);
}

// Chandra: a long tube that narrows toward the instruments at the back, a wider
// spacecraft module at the front with the sunshade door swung open, and two solar
// wings of three panels each. The tube lies across the sunward axis, like Hubble's.
function chandra(scene, name, mats) {
  const outer = new TransformNode(name, scene);
  const root = group(scene, `${name}Body`, outer, [0, 0, 0], [-QUARTER, 0, 0]);
  const tube = (id, options, z, material) => drum(scene, `${name}${id}`, root, material, { tessellation: 28, ...options }, [0, 0, z], Z);
  tube('Module', { height: 0.2, diameter: 0.3, tessellation: 8 }, 0.34, mats.goldFoil);
  tube('Mouth', { height: 0.01, diameter: 0.2 }, 0.445, mats.black);
  // Babylon's cylinder has diameterTop at +y, which is laid toward +z.
  tube('Bench', { height: 0.62, diameterTop: 0.2, diameterBottom: 0.12 }, -0.07, mats.foil);
  for (const [z, d] of [[0.24, 0.31], [0.1, 0.19], [-0.1, 0.155], [-0.3, 0.125]]) tube(`Ring${z}`, { height: 0.012, diameter: d }, z, mats.grey);
  box(scene, `${name}Instruments`, root, mats.goldFoil, [0.2, 0.16, 0.14], [0, 0, -0.44]);
  box(scene, `${name}Radiator`, root, mats.white, [0.17, 0.006, 0.17], [0, 0.085, -0.44]);
  box(scene, `${name}Shade`, root, mats.foil, [0.22, 0.006, 0.1], [0, -0.09, -0.4], [0.3, 0, 0]);
  const hinge = group(scene, `${name}Hinge`, root, [0, 0.1, 0.445], [-1.9, 0, 0]);
  drum(scene, `${name}Door`, hinge, mats.goldFoil, { height: 0.008, diameter: 0.2, tessellation: 28 }, [0, -0.1, 0], Z);
  // The gratings that swing into the beam, seen as two rings inside the tube's waist.
  for (const z of [0.0, -0.04]) tube(`Grating${z}`, { height: 0.006, diameter: 0.165 }, z, mats.gold);
  for (const s of [-1, 1]) {
    wing(scene, `${name}Wing${s}`, root, mats, { from: [s * 0.15, 0, 0.34], to: [s * 0.6, 0, 0.34], width: 0.2, panels: 3, face: [0, 1, 0], yoke: 0.2 });
    rod(scene, `${name}Low${s}`, root, mats.grey, [s * 0.1, -0.1, 0.4], [s * 0.1, -0.2, 0.44], 0.008, 4);
  }
  dish(scene, `${name}Antenna`, root, mats, { at: [0.06, 0.16, 0.36], toward: [0, 1, 0.3], diameter: 0.07 });
  thrusters(scene, `${name}Jet`, root, mats, ring(4, 0.15, 0.25, 0.78).map(([x, y, z]) => [[x, y, z], [x, y, z - 0.1]]), 0.025);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0, -0.51], [0, 0, -1], 0.06, 0.07);
  return fuse(scene, outer);
}

// Euclid: a telescope tube standing on a gold service module, with one tall flat
// sunshield of solar cells down the sunward side, its braces, and a dish underneath.
function euclid(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Service`, root, mats.goldFoil, { height: 0.2, diameter: 0.5, tessellation: 6 }, [0, -0.36, -0.03]);
  drum(scene, `${name}Deck`, root, mats.grey, { height: 0.012, diameter: 0.52, tessellation: 6 }, [0, -0.256, -0.03]);
  drum(scene, `${name}Tube`, root, mats.blackFoil, { height: 0.62, diameter: 0.36, tessellation: 24 }, [0, 0.05, -0.05]);
  drum(scene, `${name}Baffle`, root, mats.white, { height: 0.06, diameter: 0.38, tessellation: 24 }, [0, 0.39, -0.05]);
  drum(scene, `${name}Mouth`, root, mats.black, { height: 0.01, diameter: 0.33, tessellation: 24 }, [0, 0.423, -0.05]);
  for (const y of [0.22, 0.0, -0.2]) drum(scene, `${name}Hoop${y}`, root, mats.grey, { height: 0.01, diameter: 0.37, tessellation: 24 }, [0, y, -0.05]);
  // The sunshield: three tall strips of solar cells facing the Sun, white behind.
  for (const k of [-1, 0, 1]) {
    box(scene, `${name}Shield${k}`, root, mats.cells, [0.168, 0.94, 0.012], [k * 0.174, 0.0, 0.17]);
    box(scene, `${name}Seam${k}`, root, mats.grey, [0.006, 0.94, 0.016], [k * 0.174 + 0.087, 0.0, 0.17]);
  }
  box(scene, `${name}ShieldBack`, root, mats.white, [0.52, 0.94, 0.006], [0, 0.0, 0.158]);
  box(scene, `${name}ShieldTop`, root, mats.grey, [0.53, 0.012, 0.02], [0, 0.47, 0.166]);
  for (const s of [-1, 1]) {
    rod(scene, `${name}Brace${s}a`, root, mats.grey, [s * 0.22, 0.35, 0.155], [s * 0.15, 0.2, 0.08], 0.012, 4);
    rod(scene, `${name}Brace${s}b`, root, mats.grey, [s * 0.22, -0.2, 0.155], [s * 0.2, -0.28, 0.08], 0.012, 4);
    box(scene, `${name}Radiator${s}`, root, mats.white, [0.004, 0.3, 0.2], [s * 0.185, 0.05, -0.08]);
  }
  dish(scene, `${name}Dish`, root, mats, { at: [0.1, -0.49, -0.05], toward: [0, -1, 0], diameter: 0.18 });
  thrusters(scene, `${name}Jet`, root, mats, ring(6, 0.25, 0, 0.3).map(([x, z]) => [[x, -0.44, z - 0.03], [x * 1.3, -0.6, z * 1.3]]), 0.02);
  return fuse(scene, root);
}

// A pressurised module: a cylinder with end cones and hoops, lying from `from` to `to`.
function module(scene, name, parent, mats, from, to, diameter, material = mats.plate) {
  const d = to.map((n, i) => n - from[i]);
  const length = Math.hypot(...d);
  const node = aim(group(scene, name, parent, from.map((n, i) => n + d[i] / 2)), d);
  drum(scene, `${name}Hull`, node, material, { height: length * 0.86, diameter, tessellation: 18 });
  for (const s of [-1, 1]) {
    drum(scene, `${name}Cone${s}`, node, material, { height: length * 0.07, diameterTop: s > 0 ? diameter * 0.6 : diameter, diameterBottom: s > 0 ? diameter : diameter * 0.6, tessellation: 18 }, [0, s * length * 0.465, 0]);
    drum(scene, `${name}Hoop${s}`, node, mats.grey, { height: length * 0.02, diameter: diameter * 1.04, tessellation: 18 }, [0, s * length * 0.3, 0]);
  }
  return node;
}

// A capsule ship docked nose-in at `at`, its tail pointing along `out`: Soyuz, Dragon,
// Shenzhou. Two little solar wings and an engine bell.
function ship(scene, name, parent, mats, at, out, size = 0.09) {
  const node = aim(group(scene, name, parent, at), out);
  drum(scene, `${name}Nose`, node, mats.plate, { height: size * 0.5, diameterTop: size * 0.75, diameterBottom: size * 0.35, tessellation: 14 }, [0, size * 0.25, 0]);
  drum(scene, `${name}Body`, node, mats.white, { height: size, diameter: size * 0.75, tessellation: 14 }, [0, size, 0]);
  drum(scene, `${name}Bell`, node, mats.dark, { height: size * 0.2, diameterTop: size * 0.5, diameterBottom: size * 0.25, tessellation: 12 }, [0, size * 1.6, 0]);
  for (const s of [-1, 1]) box(scene, `${name}Wing${s}`, node, mats.cells, [size * 1.3, size * 0.5, 0.004], [s * size, size * 1.1, 0]);
  return node;
}

// The International Space Station: the 109 m lattice truss with four pairs of solar
// wings on turning joints, folded radiators, and the string of modules across its
// middle: the Russian end, the node, the American lab, the European and Japanese labs,
// the cupola, the robot arm and two ships docked.
// stage: for the scene of its building (render/craftUnfold.js), a map of group nodes
// to build into instead of one root: zarya, unity, zvezda, destiny, port, starboard,
// labs, rooms. Nothing is fused then.
function iss(scene, name, mats, stage = null) {
  const root = new TransformNode(name, scene);
  const P = (key) => (stage ? stage[key] : root);
  if (stage) {
    truss(scene, `${name}TrussMid`, stage.destiny, mats.grey, [-0.2, 0, 0], [0.2, 0, 0], 0.045, 5, 0.006);
    for (const s of [-1, 1]) truss(scene, `${name}TrussSide${s}`, s < 0 ? stage.port : stage.starboard, mats.grey, [s * 0.2, 0, 0], [s * 0.5, 0, 0], 0.045, 4, 0.006);
  } else truss(scene, `${name}Truss`, root, mats.grey, [-0.5, 0, 0], [0.5, 0, 0], 0.045, 12, 0.006);
  for (const s of [-1, 1]) {
    const side = stage ? (s < 0 ? stage.port : stage.starboard) : root;
    // Turning joints, then two masts each carrying a pair of blankets.
    drum(scene, `${name}Joint${s}`, side, mats.dark, { height: 0.02, diameter: 0.07 }, [s * 0.23, 0, 0], [1, 0, 0]);
    for (const x of [0.31, 0.45]) {
      for (const up of [-1, 1]) {
        rod(scene, `${name}Mast${s}${x}${up}`, side, mats.grey, [s * x, 0, 0], [s * x, up * 0.36, 0], 0.008, 4);
        for (const half of [-1, 1]) {
          box(scene, `${name}Blanket${s}${x}${up}${half}`, side, mats.cells, [0.05, 0.3, 0.003], [s * x + half * 0.03, up * 0.2, 0.004]);
          box(scene, `${name}BlanketBack${s}${x}${up}${half}`, side, mats.goldFoil, [0.05, 0.3, 0.003], [s * x + half * 0.03, up * 0.2, 0]);
        }
        box(scene, `${name}Tip${s}${x}${up}`, side, mats.grey, [0.12, 0.008, 0.01], [s * x, up * 0.352, 0]);
      }
    }
    // Radiators: three white panels folded like a fan, behind the truss.
    for (let k = 0; k < 3; k++) {
      box(scene, `${name}Radiator${s}${k}`, side, mats.white, [0.035, 0.004, 0.2], [s * (0.1 + k * 0.038), 0, -0.14], [0, 0, (k - 1) * 0.5]);
    }
    box(scene, `${name}SmallRadiator${s}`, side, mats.white, [0.03, 0.004, 0.12], [s * 0.38, 0, -0.09]);
  }
  // The pressurised string, fore (+z) to aft.
  const y = -0.04;
  module(scene, `${name}Harmony`, P('labs'), mats, [0, y, 0.22], [0, y, 0.3], 0.07);
  module(scene, `${name}Destiny`, P('destiny'), mats, [0, y, 0.07], [0, y, 0.22], 0.07);
  module(scene, `${name}Unity`, P('unity'), mats, [0, y, -0.02], [0, y, 0.07], 0.075);
  module(scene, `${name}Zarya`, P('zarya'), mats, [0, y, -0.2], [0, y, -0.02], 0.065, mats.foil);
  module(scene, `${name}Zvezda`, P('zvezda'), mats, [0, y, -0.38], [0, y, -0.2], 0.065, mats.foil);
  // Labs to either side of the forward node, with Japan's porch and its own arm.
  module(scene, `${name}Columbus`, P('labs'), mats, [0.035, y, 0.26], [0.14, y, 0.26], 0.065);
  module(scene, `${name}Kibo`, P('labs'), mats, [-0.035, y, 0.26], [-0.2, y, 0.26], 0.07);
  box(scene, `${name}Porch`, P('labs'), mats.grey, [0.07, 0.01, 0.08], [-0.24, y, 0.26]);
  module(scene, `${name}KiboAttic`, P('labs'), mats, [-0.12, y + 0.035, 0.26], [-0.12, y + 0.09, 0.26], 0.05);
  // Side rooms on the middle node, and the cupola looking down at Earth.
  module(scene, `${name}Tranquility`, P('rooms'), mats, [-0.035, y, 0.025], [-0.14, y, 0.025], 0.065);
  drum(scene, `${name}Cupola`, P('rooms'), mats.glass, { height: 0.02, diameterTop: 0.05, diameterBottom: 0.03, tessellation: 6 }, [-0.1, y - 0.045, 0.025]);
  module(scene, `${name}Airlock`, P('rooms'), mats, [0.035, y, 0.025], [0.1, y, 0.025], 0.06);
  // Russian solar wings on the aft modules.
  for (const z of [-0.11, -0.3]) {
    for (const s of [-1, 1]) wing(scene, `${name}RuWing${z}${s}`, P(z > -0.2 ? 'zarya' : 'zvezda'), mats, { from: [s * 0.03, y, z], to: [s * 0.2, y, z], width: 0.05, panels: 3, face: [0, 0, 1], yoke: 0.15 });
  }
  ship(scene, `${name}Soyuz`, P('zvezda'), mats, [0, y - 0.03, -0.3], [0, -1, 0], 0.06);
  ship(scene, `${name}Progress`, P('zvezda'), mats, [0, y, -0.38], [0, 0, -1], 0.06);
  ship(scene, `${name}Dragon`, P('labs'), mats, [0, y, 0.3], [0, 0, 1], 0.065);
  // The robot arm, bent at its elbow.
  rod(scene, `${name}Arm0`, P('destiny'), mats.white, [0.05, 0.02, 0.12], [0.16, 0.12, 0.2], 0.012, 6);
  rod(scene, `${name}Arm1`, P('destiny'), mats.white, [0.16, 0.12, 0.2], [0.24, 0.03, 0.3], 0.012, 6);
  sphere(scene, `${name}Elbow`, P('destiny'), mats.grey, 0.02, [0.16, 0.12, 0.2]);
  return stage ? root : fuse(scene, root);
}

// Tiangong: the core module with its docking hub, two lab modules to either side in a
// T, a pair of long solar wings on each, a cargo ship aft, a crew ship at the hub and
// the robot arm folded along the core.
// stage: for the scene of its building (render/craftUnfold.js), a map of group nodes
// (core, crew, wentian, mengtian) that take its parts in place of the one fused model.
function tiangong(scene, name, mats, stage = null) {
  const root = new TransformNode(name, scene);
  const P = (key) => (stage ? stage[key] : root);
  module(scene, `${name}CoreWide`, P('core'), mats, [0, 0, -0.34], [0, 0, -0.1], 0.13);
  module(scene, `${name}CoreNarrow`, P('core'), mats, [0, 0, -0.1], [0, 0, 0.12], 0.095);
  sphere(scene, `${name}Hub`, P('core'), mats.foil, 0.13, [0, 0, 0.19]);
  for (const s of [-1, 1]) {
    const lab = P(s < 0 ? 'wentian' : 'mengtian');
    module(scene, `${name}Lab${s}`, lab, mats, [s * 0.06, 0, 0.19], [s * 0.4, 0, 0.19], 0.12);
    // Each lab carries wings 27 m long at its far end, on a lattice arm.
    truss(scene, `${name}LabArm${s}`, lab, mats.grey, [s * 0.4, 0, 0.19], [s * 0.47, 0, 0.19], 0.03, 2);
    for (const up of [-1, 1]) wing(scene, `${name}LabWing${s}${up}`, lab, mats, { from: [s * 0.47, up * 0.02, 0.19], to: [s * 0.47, up * 0.4, 0.19], width: 0.09, panels: 5, face: [0, 0, 1], yoke: 0.08 });
    wing(scene, `${name}CoreWing${s}`, P('core'), mats, { from: [s * 0.05, 0, -0.02], to: [s * 0.3, 0, -0.02], width: 0.07, panels: 4, face: [0, 0, 1], yoke: 0.12 });
    box(scene, `${name}Radiator${s}`, P('core'), mats.white, [0.004, 0.07, 0.16], [s * 0.068, 0, -0.22]);
  }
  ship(scene, `${name}Tianzhou`, P('core'), mats, [0, 0, -0.34], [0, 0, -1], 0.1);
  ship(scene, `${name}Shenzhou`, P('crew'), mats, [0, 0, 0.255], [0, 0, 1], 0.075);
  ship(scene, `${name}Shenzhou2`, P('mengtian'), mats, [0, -0.065, 0.19], [0, -1, 0], 0.075);
  rod(scene, `${name}Arm0`, P('core'), mats.white, [0.03, 0.05, 0.1], [0.05, 0.11, -0.08], 0.012, 6);
  rod(scene, `${name}Arm1`, P('core'), mats.white, [0.05, 0.11, -0.08], [0.03, 0.07, -0.22], 0.012, 6);
  dish(scene, `${name}Relay`, P('core'), mats, { at: [0, 0.09, -0.3], toward: [0, 1, -0.3], diameter: 0.07 });
  return stage ? root : fuse(scene, root);
}

// Sputnik 1: a polished ball in two halves bolted at a seam, with four whip antennas
// swept back, two of them longer than the others.
function sputnik(scene, name, mats) {
  const root = new TransformNode(name, scene);
  part(CreateSphere(`${name}Ball`, { diameter: 0.3, segments: 24 }, scene), root, mats.chrome);
  drum(scene, `${name}Seam`, root, mats.grey, { height: 0.01, diameter: 0.304, tessellation: 32 }, [0, 0, 0], Z);
  for (const [x, y] of ring(18, 0.153)) sphere(scene, `${name}Bolt${x}`, root, mats.grey, 0.012, [x, y, 0]);
  for (const [i, x, y] of [[0, 1, 1], [1, -1, 1], [2, 1, -1], [3, -1, -1]]) {
    // Each whip leaves the front half and trails back at about 35 degrees from the axis.
    const long = i % 3 === 0 ? 1 : 0.83;
    const from = [x * 0.07, y * 0.07, 0.115];
    const to = [x * 0.44 * long, y * 0.44 * long, -0.75 * long];
    rod(scene, `${name}Whip${i}`, root, mats.chrome, from, to, 0.012, 5);
    drum(scene, `${name}Socket${i}`, root, mats.grey, { height: 0.03, diameterTop: 0.02, diameterBottom: 0.035, tessellation: 8 }, from, [x, y, -1.2]);
  }
  return fuse(scene, root);
}

// MRO: a gold box bus with two big solar wings of two panels each, a three-metre dish
// on a gimbal, the HiRISE telescope looking down, the radar's long rods and the engines.
function mro(scene, name, mats) {
  const root = new TransformNode(name, scene);
  box(scene, `${name}Bus`, root, mats.goldFoil, [0.2, 0.22, 0.2]);
  box(scene, `${name}Deck`, root, mats.grey, [0.21, 0.01, 0.21], [0, 0.112, 0]);
  rod(scene, `${name}Gimbal`, root, mats.grey, [0, 0.11, 0], [0, 0.2, 0], 0.03, 6);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0.21, 0], toward: [0, 1, 0.25], diameter: 0.38 });
  // HiRISE: the largest camera sent to another planet, half a metre across.
  drum(scene, `${name}Camera`, root, mats.blackFoil, { height: 0.2, diameter: 0.09, tessellation: 16 }, [0, -0.19, 0.03]);
  drum(scene, `${name}CameraHood`, root, mats.goldFoil, { height: 0.03, diameter: 0.1, tessellation: 16 }, [0, -0.285, 0.03]);
  drum(scene, `${name}CameraEye`, root, mats.black, { height: 0.004, diameter: 0.08, tessellation: 16 }, [0, -0.301, 0.03]);
  box(scene, `${name}Crism`, root, mats.white, [0.05, 0.07, 0.05], [0.06, -0.14, -0.05]);
  box(scene, `${name}Ctx`, root, mats.dark, [0.03, 0.08, 0.03], [-0.06, -0.15, -0.04]);
  for (const s of [-1, 1]) {
    wing(scene, `${name}Wing${s}`, root, mats, { from: [s * 0.1, 0.02, 0.02], to: [s * 0.5, 0.12, 0.02], width: 0.2, panels: 2, face: [0, 0, 1], yoke: 0.15 });
    // The radar: a ten-metre rod to each side.
    rod(scene, `${name}Radar${s}`, root, mats.chrome, [s * 0.1, -0.1, -0.09], [s * 0.5, -0.16, -0.12], 0.006, 4);
  }
  for (const [x, y, , a] of ring(6, 0.06)) nozzle(scene, `${name}Engine${a}`, root, mats.dark, [x, y, -0.1], [0, 0, -1], 0.04, 0.035);
  thrusters(scene, `${name}Jet`, root, mats, [[[0.1, 0.1, -0.1], [1, 1, -1]], [[-0.1, 0.1, -0.1], [-1, 1, -1]], [[0.1, -0.1, -0.1], [1, -1, -1]], [[-0.1, -0.1, -0.1], [-1, -1, -1]]], 0.018);
  return fuse(scene, root);
}

// Juno: a six-sided body with the titanium vault on top, three solar wings 9 m long
// like a pinwheel (one ends in the magnetometer boom), a dish over the vault, and the
// main engine underneath.
function juno(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Bus`, root, mats.goldFoil, { height: 0.1, diameter: 0.22, tessellation: 6 }, [0, 0, 0], Z);
  drum(scene, `${name}Deck`, root, mats.grey, { height: 0.008, diameter: 0.23, tessellation: 6 }, [0, 0, 0.052], Z);
  box(scene, `${name}Vault`, root, mats.silver, [0.08, 0.08, 0.06], [0, 0, 0.085]);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0, 0.12], toward: Z, diameter: 0.22 });
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 + QUARTER;
    const out = [Math.cos(a), Math.sin(a), 0];
    const reach = k === 0 ? 0.42 : 0.5;
    wing(scene, `${name}Wing${k}`, root, mats, { from: out.map((n) => n * 0.1), to: out.map((n) => n * reach), width: 0.13, panels: k === 0 ? 3 : 4, face: Z, yoke: 0.1, back: mats.blackFoil });
    if (k === 0) {
      // The magnetometer boom: sensors kept as far from the craft as possible.
      box(scene, `${name}MagBoom`, root, mats.goldFoil, [0.05, 0.09, 0.012], out.map((n) => n * 0.465));
      box(scene, `${name}Mag`, root, mats.dark, [0.03, 0.03, 0.02], out.map((n, i) => n * 0.49 + (i === 2 ? 0.012 : 0)));
    }
  }
  // The microwave radiometer's flat antennas on two faces of the body.
  for (const [x, y, , a] of ring(2, 0.097, 0, 0)) box(scene, `${name}Mwr${a}`, root, mats.white, [0.004, 0.1, 0.08], [x, y, 0], [0, 0, a]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0, -0.05], [0, 0, -1], 0.07, 0.07);
  thrusters(scene, `${name}Jet`, root, mats, ring(4, 0.1, 0.06, 0.5).map(([x, y, z]) => [[x, y, z], [x, y, 1]]), 0.02);
  // Wire antennas of the waves instrument, in a V.
  rod(scene, `${name}Wave0`, root, mats.chrome, [0, -0.1, -0.04], [0.12, -0.2, -0.1], 0.005, 4);
  rod(scene, `${name}Wave1`, root, mats.chrome, [0, -0.1, -0.04], [-0.12, -0.2, -0.1], 0.005, 4);
  return fuse(scene, root);
}

// Cassini: a four-metre dish over a stack of gold-wrapped modules, the Huygens probe
// on its side like a shield, three power units, two engines, the eleven-metre
// magnetometer boom, three radio whips and the camera pallet.
// probe: false leaves Huygens off (the scene of its leaving has it as a part of its own).
function cassini(scene, name, mats, { probe = true } = {}) {
  const root = new TransformNode(name, scene);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0.3, 0], toward: [0, 1, 0], diameter: 0.5 });
  drum(scene, `${name}Upper`, root, mats.goldFoil, { height: 0.08, diameter: 0.24, tessellation: 12 }, [0, 0.24, 0]);
  drum(scene, `${name}Tank`, root, mats.goldFoil, { height: 0.32, diameterTop: 0.2, diameterBottom: 0.18, tessellation: 16 }, [0, 0.04, 0]);
  drum(scene, `${name}Lower`, root, mats.blackFoil, { height: 0.08, diameter: 0.24, tessellation: 12 }, [0, -0.16, 0]);
  for (const y of [0.2, -0.12]) drum(scene, `${name}Ring${y}`, root, mats.grey, { height: 0.01, diameter: 0.25, tessellation: 12 }, [0, y, 0]);
  // Huygens: the Titan probe under its gold heat shield.
  if (probe) {
    drum(scene, `${name}Huygens`, root, mats.goldFoil, { height: 0.06, diameterTop: 0.24, diameterBottom: 0.1, tessellation: 24 }, [0, 0.0, 0.13], [0, 0, -1]);
    drum(scene, `${name}HuygensBack`, root, mats.silver, { height: 0.02, diameter: 0.2, tessellation: 24 }, [0, 0.0, 0.1], Z);
  }
  // The remote-sensing pallet: cameras and spectrometers on one side.
  box(scene, `${name}Pallet`, root, mats.white, [0.03, 0.12, 0.1], [-0.14, 0.14, -0.02]);
  drum(scene, `${name}NarrowCamera`, root, mats.white, { height: 0.11, diameter: 0.035 }, [-0.19, 0.16, -0.02], [-1, 0, 0]);
  drum(scene, `${name}WideCamera`, root, mats.dark, { height: 0.05, diameter: 0.03 }, [-0.17, 0.11, 0.0], [-1, 0, 0]);
  box(scene, `${name}Fields`, root, mats.goldFoil, [0.03, 0.1, 0.09], [0.14, 0.12, -0.02]);
  // The magnetometer boom, a lattice eleven metres long.
  truss(scene, `${name}Boom`, root, mats.grey, [0.12, 0.2, 0], [0.75, 0.2, 0], 0.025, 8, 0.004);
  box(scene, `${name}Mag`, root, mats.goldFoil, [0.03, 0.03, 0.03], [0.76, 0.2, 0]);
  for (const [i, to] of [[0, [-0.25, -0.05, -0.4]], [1, [0.25, -0.05, -0.4]], [2, [0, -0.5, -0.12]]]) rod(scene, `${name}Whip${i}`, root, mats.chrome, [0, 0.12, -0.11], to, 0.005, 4);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 + 0.5;
    rtg(scene, `${name}Power${k}`, root, mats, [Math.cos(a) * 0.15, -0.14, Math.sin(a) * 0.15], [Math.cos(a) * 0.2, -0.3, Math.sin(a) * 0.2], 0.05);
  }
  for (const s of [-1, 1]) nozzle(scene, `${name}Engine${s}`, root, mats.dark, [s * 0.04, -0.2, 0], [0, -1, 0], 0.11, 0.07);
  thrusters(scene, `${name}Jet`, root, mats, ring(4, 0.16, 0, 0.78).map(([x, z]) => [[x, -0.18, z], [x, -1, z]]), 0.02);
  return fuse(scene, root);
}

// Parker Solar Probe: a carbon heat shield held toward the Sun, white in front; the
// cooling radiators on the truss in its shadow; a six-sided body; two solar wings that
// fold back out of the light; four whips and a rear boom for the fields, and the cup
// that peeks round the shield to catch the solar wind.
function parker(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Shield`, root, mats.black, { height: 0.05, diameter: 0.56, tessellation: 6 }, [0, 0, 0.3], Z);
  drum(scene, `${name}ShieldFace`, root, mats.white, { height: 0.006, diameter: 0.555, tessellation: 6 }, [0, 0, 0.328], Z);
  // The truss: six legs from the body to the shield, with radiators between them.
  for (const [x, y, , a] of ring(6, 1, 0, 0.52)) {
    rod(scene, `${name}Leg${a}`, root, mats.grey, [x * 0.1, y * 0.1, 0.07], [x * 0.2, y * 0.2, 0.27], 0.012, 5);
  }
  for (const [x, y, , a] of ring(4, 0.15, 0.17, 0.26)) box(scene, `${name}Radiator${a}`, root, mats.dark, [0.14, 0.004, 0.16], [x, y, 0.17], [0, 0, a + QUARTER]);
  drum(scene, `${name}Bus`, root, mats.goldFoil, { height: 0.34, diameter: 0.2, tessellation: 6 }, [0, 0, -0.1], Z);
  drum(scene, `${name}Deck`, root, mats.grey, { height: 0.01, diameter: 0.21, tessellation: 6 }, [0, 0, 0.072], Z);
  for (const s of [-1, 1]) {
    wing(scene, `${name}Wing${s}`, root, mats, { from: [s * 0.1, 0, -0.02], to: [s * 0.32, 0, -0.16], width: 0.11, panels: 2, face: [s * 0.5, 0, 0.87], yoke: 0.2 });
    // The whips sit just behind the shield's edge, their tips out in the sunlight.
    for (const u of [-1, 1]) rod(scene, `${name}Whip${s}${u}`, root, mats.chrome, [s * 0.2, u * 0.16, 0.25], [s * 0.5, u * 0.42, 0.22], 0.006, 4);
  }
  rod(scene, `${name}MagBoom`, root, mats.grey, [0, 0, -0.27], [0, 0.06, -0.62], 0.01, 4);
  for (const z of [-0.4, -0.52, -0.62]) box(scene, `${name}Mag${z}`, root, mats.goldFoil, [0.025, 0.025, 0.025], [0, 0.06 * ((-0.27 - z) / 0.35), z]);
  box(scene, `${name}Cup`, root, mats.gold, [0.035, 0.035, 0.03], [0.29, 0.02, 0.3]);
  rod(scene, `${name}CupArm`, root, mats.grey, [0.2, 0.02, 0.26], [0.29, 0.02, 0.29], 0.01, 4);
  dish(scene, `${name}Dish`, root, mats, { at: [0, -0.11, -0.2], toward: [0, -1, -0.4], diameter: 0.09 });
  thrusters(scene, `${name}Jet`, root, mats, ring(6, 0.1, -0.27, 0).map(([x, y, z]) => [[x, y, z], [x, y, -1]]), 0.02);
  return fuse(scene, root);
}

// The Roadster's body as slices from tail to nose: [z, underside, top, half-width].
// A high tail, a low nose, widest at the doors.
const ROADSTER_HULL = [
  [-0.221, -0.012, 0.04, 0.06],
  [-0.2, -0.03, 0.057, 0.088],
  [-0.13, -0.036, 0.063, 0.098],
  [-0.05, -0.036, 0.056, 0.1],
  [0.05, -0.036, 0.052, 0.1],
  [0.12, -0.036, 0.04, 0.096],
  [0.18, -0.03, 0.024, 0.086],
  [0.21, -0.022, 0.01, 0.066],
  [0.222, -0.014, 0.0, 0.04],
];

// The slices joined into one smooth skin, each a box with rounded corners.
function roadsterHull(scene, name) {
  const AROUND = 20;
  const round = (v, power) => Math.sign(v) * Math.abs(v) ** power;
  const slice = ([z, low, high, half]) => {
    const middle = (low + high) / 2;
    const path = [];
    for (let k = 0; k < AROUND; k++) {
      const a = (k * 2 * Math.PI) / AROUND;
      path.push(new Vector3(half * round(Math.cos(a), 0.45), middle + ((high - low) / 2) * round(Math.sin(a), 0.6), z));
    }
    return path;
  };
  // A slice squeezed to a point closes each end.
  const tip = ([z, low, high]) => slice([z, (low + high) / 2, (low + high) / 2, 0]);
  const pathArray = [tip(ROADSTER_HULL[0]), ...ROADSTER_HULL.map(slice), tip(ROADSTER_HULL[ROADSTER_HULL.length - 1])];
  return CreateRibbon(name, { pathArray, closePath: true, sideOrientation: Mesh.DOUBLESIDE }, scene);
}

// The Tesla Roadster on its rocket stage: a red open car with Starman at the wheel,
// one arm on the door, tipped nose-up on the mount the way the launch cameras saw it.
function roadster(scene, name, mats) {
  const root = new TransformNode(name, scene);
  const rig = new TransformNode(`${name}Rig`, scene);
  rig.parent = root;
  rig.position.y = 0.22;
  const up = (id, options, material, y) => part(cyl(scene, `${name}${id}`, { tessellation: 28, ...options }), rig, material, [0, y, 0]);
  // The stage, shortened: tank, two weld bands, the engine's bell underneath.
  up('Stage', { height: 0.4, diameter: 0.3 }, mats.white, -0.3);
  up('Band0', { height: 0.008, diameter: 0.304 }, mats.grey, -0.16);
  up('Band1', { height: 0.008, diameter: 0.304 }, mats.grey, -0.44);
  up('Dome', { height: 0.03, diameterTop: 0.27, diameterBottom: 0.1 }, mats.dark, -0.515);
  up('Bell', { height: 0.15, diameterTop: 0.06, diameterBottom: 0.21 }, mats.grey, -0.605);
  up('Throat', { height: 0.004, diameter: 0.2 }, mats.dark, -0.679);
  up('Adapter', { height: 0.08, diameterTop: 0.11, diameterBottom: 0.22 }, mats.dark, -0.06);
  up('Mount', { height: 0.06, diameter: 0.05, tessellation: 10 }, mats.grey, 0.005);

  const car = new TransformNode(`${name}Car`, scene);
  car.parent = rig;
  car.position.set(0, 0.062, 0);
  car.rotation.set(-0.35, 0, 0.12);
  part(roadsterHull(scene, `${name}Body`), car, mats.paint);
  part(CreateBox(`${name}Cockpit`, { width: 0.15, height: 0.03, depth: 0.13 }, scene), car, mats.dark, [0, 0.045, -0.01]);
  for (const s of [-1, 1]) {
    part(CreateBox(`${name}Seat${s}`, { width: 0.052, height: 0.062, depth: 0.014 }, scene), car, mats.dark, [s * 0.042, 0.082, -0.072], [-0.2, 0, 0]);
    part(CreateBox(`${name}Mirror${s}`, { width: 0.022, height: 0.012, depth: 0.008 }, scene), car, mats.paint, [s * 0.106, 0.064, 0.05]);
    part(CreateSphere(`${name}Lamp${s}`, { diameter: 0.032, segments: 8 }, scene), car, mats.lamp, [s * 0.056, 0.01, 0.193], [0, 0, 0], [1, 0.55, 1]);
    part(CreateBox(`${name}TailLamp${s}`, { width: 0.032, height: 0.012, depth: 0.01 }, scene), car, mats.tail, [s * 0.046, 0.03, -0.214]);
    for (const z of [-0.135, 0.135]) {
      part(cyl(scene, `${name}Tyre${s}${z}`, { height: 0.032, diameter: 0.076, tessellation: 18 }), car, mats.dark, [s * 0.085, -0.03, z], [0, 0, QUARTER]);
      part(cyl(scene, `${name}Hub${s}${z}`, { height: 0.035, diameter: 0.044, tessellation: 10 }), car, mats.chrome, [s * 0.085, -0.03, z], [0, 0, QUARTER]);
    }
  }
  // Windscreen: glass in a dark frame, raked back.
  const screen = new TransformNode(`${name}Screen`, scene);
  screen.parent = car;
  screen.position.set(0, 0.05, 0.068);
  screen.rotation.x = -0.75;
  part(CreateBox(`${name}Glass`, { width: 0.16, height: 0.052, depth: 0.003 }, scene), screen, mats.glass, [0, 0.026, 0]);
  part(CreateBox(`${name}Header`, { width: 0.17, height: 0.005, depth: 0.006 }, scene), screen, mats.dark, [0, 0.054, 0]);
  for (const s of [-1, 1]) {
    part(CreateBox(`${name}Pillar${s}`, { width: 0.005, height: 0.056, depth: 0.006 }, scene), screen, mats.dark, [s * 0.0825, 0.027, 0]);
  }
  part(cyl(scene, `${name}Wheel`, { height: 0.004, diameter: 0.036, tessellation: 14 }), car, mats.dark, [-0.042, 0.074, 0.026], [QUARTER - 0.4, 0, 0]);
  // Starman: a white suit and helmet with a dark visor, right hand on the wheel,
  // left arm resting on the door.
  part(CreateBox(`${name}Suit`, { width: 0.05, height: 0.06, depth: 0.032 }, scene), car, mats.white, [-0.042, 0.084, -0.05], [-0.15, 0, 0]);
  part(CreateSphere(`${name}Helmet`, { diameter: 0.046, segments: 12 }, scene), car, mats.white, [-0.042, 0.134, -0.054]);
  part(CreateSphere(`${name}Visor`, { diameter: 0.036, segments: 12 }, scene), car, mats.dark, [-0.042, 0.135, -0.045]);
  rod(scene, `${name}ArmRight`, car, mats.white, [-0.018, 0.102, -0.05], [-0.036, 0.08, 0.02], 0.015);
  rod(scene, `${name}ArmLeft`, car, mats.white, [-0.068, 0.102, -0.05], [-0.1, 0.068, -0.012], 0.015);
  rod(scene, `${name}ForearmLeft`, car, mats.white, [-0.1, 0.068, -0.012], [-0.102, 0.066, 0.026], 0.015);
  return fuse(scene, root);
}

// New Horizons: a gold wedge the size of a piano, a 2.1 m dish stacked with two smaller
// antennas, one finned power unit sticking out of a corner, the long-range camera's
// tube, the colour camera and the star trackers.
function newHorizons(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Bus`, root, mats.goldFoil, { height: 0.12, diameter: 0.5, tessellation: 3 }, [0, 0, 0], Z);
  drum(scene, `${name}Deck`, root, mats.grey, { height: 0.008, diameter: 0.51, tessellation: 3 }, [0, 0, 0.062], Z);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0, 0.1], toward: Z, diameter: 0.42 });
  dish(scene, `${name}Medium`, root, mats, { at: [0, 0, 0.29], toward: Z, diameter: 0.07, feed: false });
  rod(scene, `${name}DishLeg`, root, mats.grey, [0, 0, 0.06], [0, 0, 0.1], 0.04, 6);
  // The power unit, on the corner that points away from the instruments.
  rod(scene, `${name}PowerMount`, root, mats.grey, [0.2, 0, 0], [0.27, 0, 0], 0.05, 8);
  rtg(scene, `${name}Power`, root, mats, [0.27, 0, 0], [0.56, 0, 0], 0.085);
  // LORRI, the telescope camera, looking out of one side; Ralph beside it; Alice below.
  drum(scene, `${name}Lorri`, root, mats.blackFoil, { height: 0.16, diameter: 0.07 }, [-0.13, -0.17, -0.01], [-0.3, -1, 0]);
  drum(scene, `${name}LorriEye`, root, mats.black, { height: 0.004, diameter: 0.06 }, [-0.154, -0.25, -0.01], [-0.3, -1, 0]);
  box(scene, `${name}Ralph`, root, mats.goldFoil, [0.07, 0.08, 0.09], [-0.2, -0.05, 0.0]);
  drum(scene, `${name}RalphEye`, root, mats.black, { height: 0.03, diameter: 0.045 }, [-0.245, -0.05, 0.0], [-1, 0, 0]);
  box(scene, `${name}Alice`, root, mats.white, [0.04, 0.05, 0.12], [-0.08, -0.14, -0.075]);
  box(scene, `${name}Pepssi`, root, mats.white, [0.04, 0.03, 0.04], [0.06, 0.2, 0.08]);
  box(scene, `${name}Swap`, root, mats.silver, [0.05, 0.04, 0.03], [0.14, 0.1, 0.075]);
  for (const s of [-1, 1]) box(scene, `${name}Tracker${s}`, root, mats.dark, [0.03, 0.03, 0.05], [-0.02 + s * 0.05, 0.22, -0.07], [0.6, 0, 0]);
  // The dust counter, built by students: a flat panel on the underside.
  box(scene, `${name}Dust`, root, mats.dark, [0.09, 0.12, 0.006], [0.05, 0.0, -0.064]);
  thrusters(scene, `${name}Jet`, root, mats, [[[-0.12, 0.2, 0.06], [-1, 1, 0]], [[-0.12, -0.2, 0.06], [-1, -1, 0]], [[0.23, 0.02, 0.06], [1, 1, 0]], [[0.23, -0.02, -0.06], [1, -1, 0]]], 0.018);
  return fuse(scene, root);
}

// Pioneer 10 and 11 (twins): a 2.7 m dish with its feed on three struts over a small
// six-sided body, two pairs of power units out on booms, the long magnetometer boom,
// and the plaque bolted to the dish's struts.
function pioneer(scene, name, mats) {
  const root = new TransformNode(name, scene);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0, 0.02], toward: Z, diameter: 0.5, depth: 0.09 });
  drum(scene, `${name}Bus`, root, mats.goldFoil, { height: 0.09, diameter: 0.24, tessellation: 6 }, [0, 0, -0.05], Z);
  drum(scene, `${name}Bay`, root, mats.goldFoil, { height: 0.07, diameter: 0.12, tessellation: 6 }, [0.14, 0, -0.05], Z);
  // The plaque: a gold plate with two people and where Earth is, facing inward.
  box(scene, `${name}Plaque`, root, mats.gold, [0.07, 0.05, 0.004], [0.07, -0.11, 0.0], [0.3, 0, 0]);
  for (const s of [-1, 1]) {
    const elbow = [s * 0.42, 0.24, -0.05];
    truss(scene, `${name}Boom${s}`, root, mats.grey, [s * 0.1, 0.06, -0.05], elbow, 0.02, 5, 0.004);
    // Two power units side by side at the end of each boom.
    for (const u of [-1, 1]) rtg(scene, `${name}Power${s}${u}`, root, mats, [elbow[0] + u * 0.03, elbow[1], -0.05], [elbow[0] + u * 0.03 + s * 0.07, elbow[1] + 0.05, -0.05], 0.05);
  }
  truss(scene, `${name}MagBoom`, root, mats.grey, [0, -0.1, -0.05], [0, -0.7, -0.05], 0.018, 9, 0.003);
  box(scene, `${name}Mag`, root, mats.goldFoil, [0.03, 0.03, 0.03], [0, -0.71, -0.05]);
  // Instruments round the body: the photopolarimeter that took its pictures, the
  // meteoroid panels behind the dish, the star and Sun sensors.
  drum(scene, `${name}Imager`, root, mats.dark, { height: 0.06, diameter: 0.03 }, [-0.12, -0.05, -0.07], [-1, -0.5, 0]);
  for (const [x, y] of ring(6, 0.18, 0, 0.3)) box(scene, `${name}Panel${x}`, root, mats.silver, [0.06, 0.03, 0.004], [x, y, -0.005]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0, -0.095], [0, 0, -1], 0.03, 0.03);
  thrusters(scene, `${name}Jet`, root, mats, [[[0.24, 0, 0.06], [0, 0, 1]], [[0.24, 0, 0.04], [0, 0, -1]], [[-0.24, 0, 0.06], [0, 0, 1]], [[-0.24, 0, 0.04], [0, 0, -1]]], 0.018);
  return fuse(scene, root);
}

// Danuri: a box wrapped in dark blankets with a solar wing of two panels on each side,
// a dish on a two-jointed boom, the main cameras looking down and NASA's shadow camera.
function danuri(scene, name, mats) {
  const root = new TransformNode(name, scene);
  // The bus: gold blankets in a white frame, a dark radiator on the shaded side.
  box(scene, `${name}Bus`, root, mats.goldFoil, [0.26, 0.32, 0.26]);
  box(scene, `${name}Top`, root, mats.white, [0.275, 0.012, 0.275], [0, 0.166, 0]);
  box(scene, `${name}Deck`, root, mats.grey, [0.275, 0.012, 0.275], [0, -0.166, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(scene, `${name}Post${sx}${sz}`, root, mats.white, [0.016, 0.33, 0.016], [sx * 0.131, 0, sz * 0.131]);
  box(scene, `${name}Radiator`, root, mats.blackFoil, [0.2, 0.22, 0.006], [0, 0.01, -0.133]);
  box(scene, `${name}Louvre`, root, mats.chrome, [0.2, 0.05, 0.008], [0, -0.1, -0.134]);
  // The flag, on the sunward face.
  box(scene, `${name}Flag`, root, mats.taegukgi, [0.12, 0.08, 0.004], [0.045, 0.085, 0.133]);
  box(scene, `${name}Hatch`, root, mats.blackFoil, [0.09, 0.1, 0.004], [-0.06, -0.06, 0.133]);
  // Two wings of three panels, turned to the Sun.
  for (const s of [-1, 1]) {
    drum(scene, `${name}Drive${s}`, root, mats.grey, { height: 0.03, diameter: 0.05 }, [s * 0.145, 0.03, 0], [1, 0, 0]);
    wing(scene, `${name}Wing${s}`, root, mats, { from: [s * 0.15, 0.03, 0], to: [s * 0.9, 0.03, 0], width: 0.27, panels: 3, face: Z, yoke: 0.15 });
  }
  // The dish for sending pictures home, on a two-jointed arm.
  rod(scene, `${name}Boom0`, root, mats.white, [0.05, 0.17, -0.05], [0.05, 0.3, -0.1], 0.018, 6);
  sphere(scene, `${name}Elbow`, root, mats.grey, 0.04, [0.05, 0.3, -0.1]);
  rod(scene, `${name}Boom1`, root, mats.white, [0.05, 0.3, -0.1], [0.05, 0.38, -0.03], 0.018, 6);
  sphere(scene, `${name}Wrist`, root, mats.grey, 0.04, [0.05, 0.38, -0.03]);
  dish(scene, `${name}Dish`, root, mats, { at: [0.05, 0.39, -0.03], toward: [0, 1, 0.45], diameter: 0.3 });
  // Small aerials and the star trackers that tell it which way it faces.
  for (const s of [-1, 1]) {
    drum(scene, `${name}Aerial${s}`, root, mats.white, { height: 0.05, diameterTop: 0.012, diameterBottom: 0.04 }, [s * 0.1, 0.195, 0.1]);
    drum(scene, `${name}Tracker${s}`, root, mats.black, { height: 0.07, diameter: 0.04 }, [s * 0.09, 0.19, -0.02], [s * 0.6, 1, -0.3]);
    drum(scene, `${name}TrackerHood${s}`, root, mats.white, { height: 0.012, diameter: 0.048 }, [s * 0.108, 0.22, -0.029], [s * 0.6, 1, -0.3]);
  }
  // Looking down: the high-resolution camera pair, the wide polarising camera, the
  // gamma-ray spectrometer and ShadowCam, which sees into craters the Sun never reaches.
  for (const s of [-1, 1]) {
    drum(scene, `${name}Luti${s}`, root, mats.white, { height: 0.08, diameter: 0.055 }, [s * 0.038 - 0.05, -0.21, 0.06]);
    drum(scene, `${name}LutiEye${s}`, root, mats.black, { height: 0.004, diameter: 0.044 }, [s * 0.038 - 0.05, -0.251, 0.06]);
  }
  drum(scene, `${name}Shadow`, root, mats.goldFoil, { height: 0.12, diameter: 0.08 }, [0.07, -0.23, -0.05]);
  drum(scene, `${name}ShadowHood`, root, mats.black, { height: 0.03, diameterTop: 0.08, diameterBottom: 0.1 }, [0.07, -0.3, -0.05]);
  box(scene, `${name}Polcam`, root, mats.white, [0.06, 0.05, 0.06], [0.08, -0.195, 0.08]);
  drum(scene, `${name}PolcamEye`, root, mats.black, { height: 0.004, diameter: 0.035 }, [0.08, -0.222, 0.08]);
  box(scene, `${name}Gamma`, root, mats.foil, [0.06, 0.05, 0.06], [-0.07, -0.195, -0.07]);
  // The magnetometer on its long boom, three sensors along it.
  rod(scene, `${name}MagBoom`, root, mats.grey, [-0.11, -0.12, -0.12], [-0.3, -0.3, -0.42], 0.009, 4);
  for (const t of [0.4, 0.7, 1]) box(scene, `${name}Mag${t}`, root, mats.gold, [0.024, 0.024, 0.024], [-0.11 - 0.19 * t, -0.12 - 0.18 * t, -0.12 - 0.3 * t]);
  // Four main engines and the small ones that turn it.
  for (const [x, y, , a] of ring(4, 0.075, 0, 0.78)) nozzle(scene, `${name}Engine${a}`, root, mats.dark, [x, y, -0.135], [0, 0, -1], 0.04, 0.04);
  thrusters(scene, `${name}Jets`, root, mats, [[[0.135, 0.14, -0.12], [1, 0, 0]], [[-0.135, 0.14, -0.12], [-1, 0, 0]], [[0.135, -0.14, -0.12], [1, 0, 0]], [[-0.135, -0.14, -0.12], [-1, 0, 0]]], 0.016);
  return fuse(scene, root);
}


// LRO: a tall silver box with its instrument deck underneath, one solar array of three
// panels out to one side, a dish on a long two-jointed boom, the pair of narrow cameras
// with the wide one between them, the laser altimeter's telescope and the cooled
// radiometer.
function lro(scene, name, mats) {
  const root = new TransformNode(name, scene);
  box(scene, `${name}Bus`, root, mats.foil, [0.2, 0.36, 0.2]);
  box(scene, `${name}Deck`, root, mats.goldFoil, [0.21, 0.02, 0.21], [0, -0.19, 0]);
  box(scene, `${name}Module`, root, mats.goldFoil, [0.16, 0.12, 0.16], [0, 0.24, 0]);
  wing(scene, `${name}Array`, root, mats, { from: [0.1, 0.02, 0.03], to: [0.6, 0.02, 0.03], width: 0.3, panels: 3, face: Z, yoke: 0.12 });
  rod(scene, `${name}Boom0`, root, mats.grey, [-0.1, 0.1, 0], [-0.26, 0.16, 0], 0.014, 6);
  rod(scene, `${name}Boom1`, root, mats.grey, [-0.26, 0.16, 0], [-0.34, 0.26, 0], 0.014, 6);
  dish(scene, `${name}Dish`, root, mats, { at: [-0.34, 0.26, 0], toward: [-0.3, 1, 0], diameter: 0.17 });
  for (const s of [-1, 1]) {
    drum(scene, `${name}Narrow${s}`, root, mats.blackFoil, { height: 0.13, diameter: 0.05 }, [s * 0.045, -0.26, 0.03]);
    drum(scene, `${name}NarrowEye${s}`, root, mats.black, { height: 0.004, diameter: 0.042 }, [s * 0.045, -0.326, 0.03]);
  }
  box(scene, `${name}Wide`, root, mats.dark, [0.03, 0.04, 0.03], [0, -0.22, 0.07]);
  drum(scene, `${name}Lola`, root, mats.white, { height: 0.08, diameterTop: 0.04, diameterBottom: 0.07 }, [-0.05, -0.24, -0.05]);
  box(scene, `${name}Diviner`, root, mats.goldFoil, [0.06, 0.06, 0.06], [0.06, -0.23, -0.05]);
  drum(scene, `${name}Lamp`, root, mats.white, { height: 0.07, diameter: 0.03 }, [0.11, -0.1, -0.06], [0, -1, -0.5]);
  for (const [x, z] of ring(4, 0.06, 0, 0.78)) nozzle(scene, `${name}Engine${x}`, root, mats.dark, [x, 0.3, z], [0, 1, 0], 0.035, 0.03);
  thrusters(scene, `${name}Jet`, root, mats, ring(4, 0.11, 0, 0).map(([x, z]) => [[x, 0.26, z], [x, 0.4, z]]), 0.016);
  return fuse(scene, root);
}

// Europa Clipper: a slim body with the electronics vault, a three-metre dish, two
// solar wings of five panels that span more than thirty metres with the ice radar's
// rods across them, the magnetometer boom, and the cameras and spectrometers on a deck.
function europaClipper(scene, name, mats) {
  const root = new TransformNode(name, scene);
  drum(scene, `${name}Body`, root, mats.foil, { height: 0.34, diameter: 0.1, tessellation: 14 });
  drum(scene, `${name}Vault`, root, mats.goldFoil, { height: 0.1, diameter: 0.14, tessellation: 8 }, [0, 0.1, 0]);
  for (const y of [0.16, 0.04, -0.1]) drum(scene, `${name}Hoop${y}`, root, mats.grey, { height: 0.008, diameter: 0.108, tessellation: 14 }, [0, y, 0]);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0.08, 0.075], toward: Z, diameter: 0.26 });
  for (const s of [-1, 1]) {
    wing(scene, `${name}Wing${s}`, root, mats, { from: [s * 0.05, -0.02, 0], to: [s * 0.5, -0.02, 0], width: 0.17, panels: 5, face: Z, yoke: 0.08, back: mats.blackFoil });
    // The radar: rods standing across the wings, the long ones for deep ice.
    for (const x of [0.2, 0.36]) rod(scene, `${name}Radar${s}${x}`, root, mats.chrome, [s * x, -0.19, -0.012], [s * x, 0.15, -0.012], 0.006, 4);
    rod(scene, `${name}RadarLong${s}`, root, mats.chrome, [s * 0.5, -0.02, -0.012], [s * 0.5, -0.02, -0.2], 0.006, 4);
  }
  truss(scene, `${name}MagBoom`, root, mats.grey, [0.04, -0.14, -0.04], [0.2, -0.34, -0.2], 0.014, 5, 0.003);
  box(scene, `${name}Mag`, root, mats.goldFoil, [0.02, 0.02, 0.02], [0.205, -0.345, -0.205]);
  // The instrument deck at the foot: two cameras, the infrared mapper and the ultraviolet one.
  box(scene, `${name}Deck`, root, mats.goldFoil, [0.14, 0.03, 0.12], [0, -0.13, 0.04]);
  drum(scene, `${name}NarrowCamera`, root, mats.blackFoil, { height: 0.07, diameter: 0.04 }, [-0.04, -0.13, 0.12], Z);
  drum(scene, `${name}WideCamera`, root, mats.dark, { height: 0.04, diameter: 0.03 }, [0.01, -0.13, 0.11], Z);
  box(scene, `${name}Mise`, root, mats.white, [0.04, 0.03, 0.06], [0.05, -0.13, 0.12]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, -0.17, 0], [0, -1, 0], 0.05, 0.07);
  thrusters(scene, `${name}Jet`, root, mats, ring(4, 0.07, 0, 0.78).map(([x, z]) => [[x, -0.16, z], [x * 2, -0.3, z * 2]]), 0.018);
  return fuse(scene, root);
}

// Lucy: a small body between two round solar arrays, each wider than the craft is
// long and folded out like a fan (ten gores round a hub), with a two-metre dish facing
// home and the cameras together on a platform that turns to follow an asteroid.
function lucy(scene, name, mats) {
  const root = new TransformNode(name, scene);
  box(scene, `${name}Bus`, root, mats.goldFoil, [0.12, 0.16, 0.12]);
  dish(scene, `${name}Dish`, root, mats, { at: [0, 0.02, 0.065], toward: Z, diameter: 0.17 });
  for (const s of [-1, 1]) {
    rod(scene, `${name}Arm${s}`, root, mats.grey, [s * 0.06, 0, 0], [s * 0.1, 0, 0], 0.016, 6);
    const hub = [s * 0.31, 0, 0];
    drum(scene, `${name}Array${s}`, root, mats.cells, { height: 0.005, diameter: 0.42, tessellation: 10 }, [hub[0], 0, 0.003], Z);
    drum(scene, `${name}ArrayBack${s}`, root, mats.blackFoil, { height: 0.005, diameter: 0.42, tessellation: 10 }, [hub[0], 0, -0.002], Z);
    drum(scene, `${name}Hub${s}`, root, mats.grey, { height: 0.016, diameter: 0.04, tessellation: 10 }, hub, Z);
    // The ribs of the fan.
    for (const [x, y, , a] of ring(10, 0.21, 0, 0.314)) rod(scene, `${name}Rib${s}${a}`, root, mats.grey, [hub[0], 0, 0.006], [hub[0] + x, y, 0.006], 0.005, 3);
  }
  // The instrument platform, on a gimbal under the body.
  rod(scene, `${name}Gimbal`, root, mats.grey, [0, -0.08, 0], [0, -0.1, 0], 0.03, 6);
  box(scene, `${name}Platform`, root, mats.blackFoil, [0.11, 0.05, 0.1], [0, -0.125, 0.01]);
  drum(scene, `${name}Lorri`, root, mats.blackFoil, { height: 0.08, diameter: 0.04 }, [0.03, -0.13, 0.08], Z);
  drum(scene, `${name}LorriEye`, root, mats.black, { height: 0.004, diameter: 0.034 }, [0.03, -0.13, 0.121], Z);
  box(scene, `${name}Ralph`, root, mats.white, [0.04, 0.04, 0.05], [-0.03, -0.13, 0.07]);
  box(scene, `${name}Tes`, root, mats.goldFoil, [0.03, 0.03, 0.03], [-0.03, -0.165, 0.05]);
  nozzle(scene, `${name}Engine`, root, mats.dark, [0, 0, -0.06], [0, 0, -1], 0.04, 0.04);
  thrusters(scene, `${name}Jet`, root, mats, [[[0.06, 0.08, -0.06], [1, 1, -1]], [[-0.06, 0.08, -0.06], [-1, 1, -1]], [[0.06, -0.08, -0.06], [1, -1, -1]], [[-0.06, -0.08, -0.06], [-1, -1, -1]]], 0.016);
  return fuse(scene, root);
}

export const CRAFT_BUILD = {
  voyager1: voyager, voyager2: voyager, hubble, jwst: webb, kepler, chandra, euclid,
  iss, tiangong, sputnik, mro, juno, cassini, parker, roadster, newHorizons, pioneer10: pioneer,
  danuri, lro, europaClipper, lucy, pioneer11: pioneer,
};
