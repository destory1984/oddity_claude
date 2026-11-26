import { Color3, StandardMaterial, DynamicTexture, Texture, Mesh, CreatePlane, CreateTorus } from './babylon.js';
import { QUARTER, part, cyl, group, box, drum, rod, dish, fuse } from './craftParts.js';

// The Hubble Space Telescope, rebuilt from photographs by the img2threejs method (on the
// branch try/hubble-img2, trial/img2: the spec and the notes), in two looks:
// - hubble1990: as Discovery let it go on 25 April 1990 (STS-31; photos grapple-orig, the
//   checkout view): the first, flexible solar arrays, each wing a drum with two gold
//   blankets rolled out either way on silver bi-STEM booms; the bay doors bare foil;
//   no ring on the aft bulkhead. { stowed: true } folds the wings and the antennas along
//   the tube as in the checkout photo; { wingTurn } turns the wings on their drives.
// - hubble: as it is since the last servicing (2009, photo hst-sm4): the rigid arrays of
//   2002, the white NOBL blankets over the bay doors, the soft-capture ring on the aft
//   bulkhead.
// The frame is the old model's: about one unit long (13.2 m), the tube along local +z
// before the quarter turn (the aperture forward), the wings out to +-x (V2), the antennas
// and the door hinge on +-y (V3); the whole turned so the tube lies across the sunward
// axis. The arm takes hold on the aft shroud's lower side (the grapple fixture at -48 deg).

const M = 1 / 13.2; // units per metre
const Z = [0, 0, 1];
// Metres from the aft bulkhead (zm) to units, centred on the tube.
const at = (x, y, zm) => [x * M, y * M, (zm - 6.6) * M];
const R_AFT = 2.12; // aft shroud, 4.24 m across
const R_FWD = 1.55; // forward shell and light shield, 3.1 m
const AFT = [0, 3.6]; // aft shroud
const BAY = [3.6, 5.9]; // equipment section: ten flat bays
const FWD = [5.9, 13.2]; // forward shell + light shield
const MAST_Z = 5.3; // the wings' masts (S109E5018: 5 m from the aft end)
const HGA_Z = 6.4; // the antennas' masts, just ahead of the bay
const WING_X = 3.55; // a wing's middle off the axis

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
function drawn(scene, name, w, h, draw) {
  const tex = new DynamicTexture(name, { width: w, height: h }, scene, true);
  draw(tex.getContext(), w, h, seeded(w * 31 + h + name.length * 977));
  tex.update();
  tex.anisotropicFilteringLevel = 8;
  return tex;
}
// The game's way (craftParts.js `textured`): the sheet also glows a little, so the shaded
// side is not black; spec/power give the metal its sheen.
function sheet(scene, name, tex, { glow = 0.3, spec = 0.3, power = 32 } = {}) {
  const m = new StandardMaterial(name, scene);
  m.diffuseTexture = tex;
  m.emissiveTexture = tex;
  m.emissiveColor = new Color3(glow, glow, glow);
  m.specularColor = new Color3(spec, spec, spec);
  m.specularPower = power;
  return m;
}

// Crinkled silver MLI in blanket panels: bright and dark creases, seams round and along.
function mliTexture(scene) {
  return drawn(scene, 'hubbleMliMap', 512, 512, (g, w, h, rand) => {
    g.fillStyle = '#c3c7cf';
    g.fillRect(0, 0, w, h);
    for (let n = 0; n < 900; n++) {
      const v = rand() < 0.5 ? 120 + rand() * 60 : 215 + rand() * 40;
      g.fillStyle = `rgba(${v | 0},${v | 0},${(v + 6) | 0},0.4)`;
      g.save();
      g.translate(rand() * w, rand() * h);
      g.rotate((rand() - 0.5) * 1.2);
      g.fillRect(0, 0, 10 + rand() * 46, 2 + rand() * 7);
      g.restore();
    }
    g.fillStyle = 'rgba(60,64,74,0.6)';
    for (let i = 0; i < 12; i++) g.fillRect((i * w) / 12, 0, 2, h);
    for (let j = 1; j < 5; j++) g.fillRect(0, (j * h) / 5, w, 2);
  });
}
// The aft shroud: polished panels, 24 round and 3 along, with a few hatch outlines.
function shroudTexture(scene) {
  return drawn(scene, 'hubbleShroudMap', 1024, 256, (g, w, h, rand) => {
    g.fillStyle = '#9ea4ad';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 3; j++) {
        const v = 160 + rand() * 45;
        g.fillStyle = `rgb(${v | 0},${(v + 4) | 0},${(v + 12) | 0})`;
        g.fillRect((i * w) / 24 + 2, (j * h) / 3 + 2, w / 24 - 4, h / 3 - 4);
      }
    }
    g.fillStyle = 'rgba(70,74,84,0.6)';
    for (let i = 0; i < 24; i++) g.fillRect((i * w) / 24, 0, 2, h);
    for (let j = 0; j <= 3; j++) g.fillRect(0, (j * h) / 3 - 1, w, 2);
    // Instrument and radial-bay doors outlined (big ones a quarter apart).
    g.strokeStyle = 'rgba(80,84,94,0.7)';
    g.lineWidth = 2;
    for (let k = 0; k < 4; k++) g.strokeRect(k * (w / 4) + 30, 28, 90, 150);
    for (let k = 0; k < 6; k++) g.strokeRect(rand() * w, 30 + rand() * 170, 26, 18);
  });
}
// The ten bay doors: 1990 bare foil with dark radiator strips; since 1997 to 2009 the
// white NOBL blankets over them.
function bayTexture(scene, nobl) {
  return drawn(scene, nobl ? 'hubbleNoblMap' : 'hubbleBayMap', 1024, 128, (g, w, h, rand) => {
    const dw = w / 10;
    g.fillStyle = nobl ? '#b9bdc4' : '#a9aeb7';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      const x = i * dw;
      if (nobl) {
        g.fillStyle = '#d9dce0';
        g.fillRect(x + 6, 8, dw - 12, h - 16);
        g.strokeStyle = 'rgba(120,124,132,0.8)';
        g.lineWidth = 2;
        for (let k = 0; k < 3; k++) g.strokeRect(x + 10 + k * (dw - 20) / 3, 14, (dw - 20) / 3 - 4, h - 28);
      } else {
        for (let n = 0; n < 40; n++) {
          const v = rand() < 0.5 ? 110 + rand() * 50 : 200 + rand() * 40;
          g.fillStyle = `rgba(${v | 0},${v | 0},${(v + 8) | 0},0.45)`;
          g.fillRect(x + rand() * dw, rand() * h, 6 + rand() * 20, 2 + rand() * 8);
        }
        g.fillStyle = 'rgba(40,46,60,0.75)';
        g.fillRect(x + dw * 0.3, 16, dw * 0.4, h - 32);
      }
      g.fillStyle = 'rgba(50,52,60,0.9)';
      g.fillRect(x, 0, 3, h);
    }
  });
}
// The first arrays' blankets: gold cells in a fine grid, brighter bus lines across.
function blanketTexture(scene) {
  return drawn(scene, 'hubbleBlanketMap', 128, 512, (g, w, h, rand) => {
    g.fillStyle = '#c98b22';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,70,10,0.55)';
    for (let x = 0; x < w; x += 5) g.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.fillStyle = '#f0c048';
    for (let k = 1; k < 5; k++) g.fillRect(0, (k * h) / 5, w, 3);
    g.fillRect(w / 2 - 1, 0, 2, h);
    for (let n = 0; n < 6; n++) g.fillRect(rand() * w, rand() * h, 16, 2);
  });
}
// The rigid arrays since 2002: four strips of near-black cells, silver lines between.
function rigidTexture(scene) {
  return drawn(scene, 'hubbleRigidMap', 128, 512, (g, w, h) => {
    g.fillStyle = '#9aa0aa';
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      g.fillStyle = '#141a2a';
      g.fillRect(k * (w / 4) + 3, 3, w / 4 - 6, h - 6);
      g.fillStyle = 'rgba(70,86,120,0.35)';
      for (let y = 8; y < h; y += 8) g.fillRect(k * (w / 4) + 3, y, w / 4 - 6, 1);
    }
  });
}

const MATERIALS = new WeakMap();
function hubbleMaterials(scene) {
  if (MATERIALS.has(scene)) return MATERIALS.get(scene);
  const m = {
    mli: sheet(scene, 'hubbleMli', mliTexture(scene), { glow: 0.32, spec: 0.55, power: 18 }),
    shroud: sheet(scene, 'hubbleShroud', shroudTexture(scene), { glow: 0.28, spec: 0.8, power: 48 }),
    bay: sheet(scene, 'hubbleBay', bayTexture(scene, false), { glow: 0.3, spec: 0.5, power: 24 }),
    nobl: sheet(scene, 'hubbleNobl', bayTexture(scene, true), { glow: 0.3, spec: 0.15, power: 8 }),
    blanket: sheet(scene, 'hubbleBlanket', blanketTexture(scene), { glow: 0.35, spec: 0.35, power: 24 }),
    rigid: sheet(scene, 'hubbleRigid', rigidTexture(scene), { glow: 0.25, spec: 0.5, power: 40 }),
  };
  m.blanket.backFaceCulling = false;
  MATERIALS.set(scene, m);
  return m;
}

// A thin double-sided sheet `w` across (local x) and `h` long (local y), lying in the xz
// plane of `parent` with its length along z.
function blanket(scene, name, parent, material, w, h, position) {
  const plane = CreatePlane(name, { width: w, height: h, sideOrientation: Mesh.DOUBLESIDE }, scene);
  return part(plane, parent, material, position, [QUARTER, 0, 0]);
}

// What both looks share: the tube, its rims and rails, the bay (painted per look), the
// door, the grapple fixtures and the antennas' masts.
function body(scene, name, root, mats, h, { bay, stowed = false }) {
  const tube = (id, r, [z0, z1], material, tessellation = 48) => drum(scene, `${name}${id}`, root, material,
    { height: (z1 - z0) * M, diameter: 2 * r * M, tessellation }, at(0, 0, (z0 + z1) / 2), Z);
  tube('Aft', R_AFT, AFT, h.shroud);
  tube('Bay', R_AFT * 1.02, BAY, bay, 10);
  tube('Forward', R_FWD, FWD, h.mli, 40);
  // The bulkheads: the aft one dark, the bay's front face foil, the aperture black inside.
  tube('AftPlate', R_AFT * 0.98, [-0.04, 0.02], mats.dark);
  tube('BayFace', R_AFT * 1.01, [5.88, 5.93], h.mli, 40);
  tube('Mouth', R_FWD * 0.94, [13.19, 13.24], mats.black, 32);
  // Gold rims round the shroud's ends and the bay's, stiffening bands on the light shield.
  for (const [i, r, z] of [[0, R_AFT * 1.008, 0.06], [1, R_AFT * 1.008, 3.56], [2, R_AFT * 1.025, 3.64], [3, R_AFT * 1.025, 5.86]]) {
    tube(`Rim${i}`, r, [z - 0.04, z + 0.04], mats.gold, 40);
  }
  for (const [i, z] of [[0, 8.3], [1, 10.6], [2, 13.12]]) tube(`Band${i}`, R_FWD * 1.012, [z - 0.05, z + 0.05], mats.grey, 32);
  // Handrails: long ones along the forward shell, short ones on the shroud.
  for (let k = 0; k < 8; k++) {
    const a = 0.2 + (k * Math.PI) / 4;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const rf = R_FWD + 0.12;
    rod(scene, `${name}FwdRail${k}`, root, mats.gold, at(c * rf, s * rf, 6.3), at(c * rf, s * rf, 12.6), 0.07 * M, 4);
    const ra = R_AFT + 0.12;
    rod(scene, `${name}AftRail${k}`, root, mats.gold, at(c * ra, s * ra, 0.5), at(c * ra, s * ra, 1.6), 0.07 * M, 4);
    if (k % 2) rod(scene, `${name}AftRailB${k}`, root, mats.gold, at(c * ra, s * ra, 2.2), at(c * ra, s * ra, 3.3), 0.07 * M, 4);
  }
  // Grapple fixtures on the aft shroud: a gold disc and a dark pin (the arm's at -48 deg).
  for (const [k, a, z] of [[0, -0.84, 1.6], [1, Math.PI - 0.84, 2.2]]) {
    const [c, s] = [Math.cos(a), Math.sin(a)];
    drum(scene, `${name}Grapple${k}`, root, mats.gold, { height: 0.06 * M, diameter: 0.6 * M, tessellation: 16 }, at(c * R_AFT, s * R_AFT, z), [c, s, 0]);
    rod(scene, `${name}GrapplePin${k}`, root, mats.dark, at(c * R_AFT, s * R_AFT, z), at(c * (R_AFT + 0.35), s * (R_AFT + 0.35), z), 0.12 * M, 6);
  }
  // Magnetometers at the light shield's front, and the white aft antenna on the bulkhead.
  for (const s of [-1, 1]) box(scene, `${name}Mag${s}`, root, mats.white, [0.3 * M, 0.3 * M, 0.5 * M], at(s * (R_FWD + 0.15), 0.4, 12.7));
  drum(scene, `${name}AftLga`, root, mats.white, { height: 0.7 * M, diameterTop: 0.05 * M, diameterBottom: 0.45 * M, tessellation: 12 }, at(0, -1.75, -0.35), [0, 0, -1]);
  // Aperture door, swung open about 106 degrees on its hinge at the top (+y) of the mouth:
  // a white flap, straight then rounded, a little longer than the mouth is wide.
  const hinge = group(scene, `${name}Hinge`, root, at(0, R_FWD + 0.05, 13.2), [-1.85, 0, 0]);
  box(scene, `${name}Door`, hinge, mats.white, [3.1 * M, 1.9 * M, 0.06 * M], [0, -0.95 * M, 0]);
  part(cyl(scene, `${name}DoorEnd`, { height: 0.06 * M, diameter: 3.1 * M, arc: 0.5, tessellation: 24 }), hinge, mats.white, [0, -1.9 * M, 0], [QUARTER, 0, 0]);
  box(scene, `${name}DoorInside`, hinge, mats.dark, [2.9 * M, 1.8 * M, 0.02 * M], [0, -0.95 * M, 0.045 * M]);
  rod(scene, `${name}DoorArm`, root, mats.grey, at(0, R_FWD, 12.6), at(0, R_FWD + 0.6, 13.2), 0.15 * M, 6);
  // High-gain antennas: dishes 1.3 m across on masts above and below (+-y). Stowed, the
  // masts lie forward along the tube.
  for (const s of [-1, 1]) {
    const foot = at(0, s * R_FWD, HGA_Z);
    if (stowed) {
      rod(scene, `${name}HgaMast${s}`, root, mats.grey, at(0, s * (R_FWD + 0.25), HGA_Z), at(0, s * (R_FWD + 0.25), 10.2), 0.14 * M, 6);
      dish(scene, `${name}Hga${s}`, root, mats, { at: at(0, s * (R_FWD + 0.35), 10.7), toward: [0, s, 0], diameter: 1.3 * M, material: mats.silver });
    } else {
      rod(scene, `${name}HgaMast${s}`, root, mats.grey, foot, at(0, s * 5.2, HGA_Z), 0.14 * M, 6);
      box(scene, `${name}HgaGimbal${s}`, root, mats.dark, [0.35 * M, 0.35 * M, 0.35 * M], at(0, s * 5.25, HGA_Z));
      dish(scene, `${name}Hga${s}`, root, mats, { at: at(0, s * 5.4, HGA_Z + 0.1), toward: [0, s * 0.35, 1], diameter: 1.3 * M, material: mats.silver });
    }
  }
}

// One flexible wing of 1990 (SA1): a storage drum on its mast with two gold blankets
// rolled out fore and aft, 12.1 m by 2.4 m in all, a silver bi-STEM boom along each edge
// and a spreader bar across each tip. `turn` turns it on its drive about the mast.
function flexWing(scene, name, root, mats, h, s, turn) {
  rod(scene, `${name}Mast`, root, mats.grey, at(s * R_AFT * 0.97, 0, MAST_Z), at(s * (WING_X - 1.25), 0, MAST_Z), 0.18 * M, 6);
  const wing = group(scene, `${name}Wing`, root, at(s * WING_X, 0, MAST_Z), [turn, 0, 0]);
  drum(scene, `${name}Drum`, wing, mats.grey, { height: 2.6 * M, diameter: 0.4 * M, tessellation: 12 }, [0, 0, 0], [1, 0, 0]);
  box(scene, `${name}Drive`, wing, mats.dark, [0.5 * M, 0.45 * M, 0.6 * M], [-s * 1.35 * M, 0, 0]);
  const half = (12.1 - 0.4) / 2;
  for (const e of [-1, 1]) {
    blanket(scene, `${name}Blanket${e}`, wing, h.blanket, 2.4 * M, half * M, [0, 0, e * (0.2 + half / 2) * M]);
    for (const side of [-1, 1]) {
      rod(scene, `${name}Stem${e}${side}`, wing, mats.chrome, [side * 1.25 * M, 0, e * 0.2 * M], [side * 1.25 * M, 0, e * 6.05 * M], 0.07 * M, 4);
    }
    box(scene, `${name}Spreader${e}`, wing, mats.chrome, [2.6 * M, 0.1 * M, 0.14 * M], [0, 0, e * 6.05 * M]);
  }
}
// Stowed: the drum with both blankets rolled on it, along the forward shell.
function flexStowed(scene, name, root, mats, h, s) {
  rod(scene, `${name}Mast`, root, mats.grey, at(s * R_AFT * 0.97, 0, MAST_Z), at(s * (R_FWD + 0.4), 0, 7.0), 0.18 * M, 6);
  drum(scene, `${name}Roll`, root, h.blanket, { height: 3.6 * M, diameter: 0.55 * M, tessellation: 14 }, at(s * (R_FWD + 0.4), 0, 8.8), Z);
  for (const e of [7.0, 10.6]) drum(scene, `${name}RollEnd${e}`, root, mats.grey, { height: 0.12 * M, diameter: 0.62 * M, tessellation: 14 }, at(s * (R_FWD + 0.4), 0, e), Z);
}
// One rigid wing since 2002 (SA3): 7.1 m by 2.6 m in two panels either side of the mast,
// cells on the sunward face (-y here, as the old model faced them), a grey back.
function rigidWing(scene, name, root, mats, h, s) {
  rod(scene, `${name}Mast`, root, mats.grey, at(s * R_AFT * 0.97, 0, MAST_Z), at(s * (WING_X + 1.35), 0, MAST_Z), 0.18 * M, 6);
  const wing = group(scene, `${name}Wing`, root, at(s * WING_X, 0, MAST_Z));
  const len = (7.1 - 0.5) / 2;
  for (const e of [-1, 1]) {
    const z = e * (0.25 + len / 2) * M;
    for (const face of [-1, 1]) {
      const p = CreatePlane(`${name}Cells${e}${face}`, { width: 2.6 * M, height: len * M }, scene);
      part(p, wing, face < 0 ? h.rigid : mats.grey, [0, face * 0.02 * M, z], [face * QUARTER, 0, 0]);
    }
    for (const side of [-1, 1]) box(scene, `${name}Frame${e}${side}`, wing, mats.grey, [0.08 * M, 0.1 * M, len * M], [side * 1.32 * M, 0, z]);
    box(scene, `${name}Tip${e}`, wing, mats.grey, [2.7 * M, 0.1 * M, 0.1 * M], [0, 0, e * (0.25 + len) * M]);
  }
  box(scene, `${name}Hub${s}`, wing, mats.dark, [0.5 * M, 0.4 * M, 0.5 * M], [-s * 1.0 * M, 0, 0]);
}
// The soft-capture ring of 2009 on the aft bulkhead: a grey plate, the ring on three posts.
function softCapture(scene, name, root, mats) {
  drum(scene, `${name}ScmPlate`, root, mats.grey, { height: 0.12 * M, diameter: 3.4 * M, tessellation: 32 }, at(0, 0, -0.1), Z);
  const ring = CreateTorus(`${name}ScmRing`, { diameter: 1.5 * M, thickness: 0.16 * M, tessellation: 32 }, scene);
  part(ring, root, mats.silver, at(0, 0, -0.55), [QUARTER, 0, 0]);
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 + 0.3;
    rod(scene, `${name}ScmPost${k}`, root, mats.dark, at(Math.cos(a) * 0.75, Math.sin(a) * 0.75, -0.15), at(Math.cos(a) * 0.75, Math.sin(a) * 0.75, -0.55), 0.14 * M, 6);
    box(scene, `${name}ScmPetal${k}`, root, mats.silver, [0.3 * M, 0.5 * M, 0.25 * M], at(Math.cos(a) * 0.82, Math.sin(a) * 0.82, -0.68));
  }
  for (const [x, y] of [[1.2, 0.6], [-1.1, 0.8], [0.3, -1.3]]) box(scene, `${name}AftBox${x}`, root, mats.dark, [0.6 * M, 0.5 * M, 0.3 * M], at(x, y, -0.25));
}

// The tube is laid along local +y under the quarter turn, as the old model was.
function frame(scene, name) {
  const outer = group(scene, name, null);
  const root = group(scene, `${name}Body`, outer, [0, 0, 0], [-QUARTER, 0, 0]);
  return { outer, root };
}

export function hubbleToday(scene, name, mats) {
  const h = hubbleMaterials(scene);
  const { outer, root } = frame(scene, name);
  body(scene, name, root, mats, h, { bay: h.nobl });
  for (const s of [-1, 1]) rigidWing(scene, `${name}Sa${s}`, root, mats, h, s);
  softCapture(scene, name, root, mats);
  return fuse(scene, outer);
}

export function hubble1990(scene, name, mats, options = {}) {
  const h = hubbleMaterials(scene);
  const { outer, root } = frame(scene, name);
  const stowed = Boolean(options?.stowed);
  body(scene, name, root, mats, h, { bay: h.bay, stowed });
  for (const s of [-1, 1]) {
    if (stowed) flexStowed(scene, `${name}Sa${s}`, root, mats, h, s);
    else flexWing(scene, `${name}Sa${s}`, root, mats, h, s, options?.wingTurn ?? 0);
  }
  // The bulkhead bare: boxes and vents only, no ring yet.
  for (const [x, y] of [[1.2, 0.6], [-1.1, 0.8], [0.3, -1.3]]) box(scene, `${name}AftBox${x}`, root, mats.dark, [0.6 * M, 0.5 * M, 0.3 * M], at(x, y, -0.2));
  return fuse(scene, outer);
}
