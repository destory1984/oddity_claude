// "그날로" at the landmarks: the craters, seas and mountains that have no machine standing
// on them (the user, 2026-10-07: "시르티스는 애니가 없네", "다른 명소도 다 애니 넣자"). Three
// kinds of stage, each made of the same few pieces (render/siteModels.js landmarkPieces):
//   photo: a craft crosses the sky, its shutter sounds, the place's picture comes up.
//   look: nothing flies: the picture comes up (seen from the ground, or a drawing).
//   impact: something falls out of the sky and hits; then the picture of the place now.
//   sunrise: no picture: the Sun comes up behind a ridge, goes back down, comes up again.
// The picture is the story's own (public/assets/stories/<id>.jpg). What each scene tells
// is in core/landmarkScenes.js. Pieces are placed as in core/moonScenes.js: x to the
// side, y up, in the model's units; a narrow phone's view ends about 1.45 to either side,
// and the sheet of telling comes down to about y = 1.45 when it has three rows (English):
// no bubble stands higher.
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (t, from, to) => {
  const u = clamp((t - from) / (to - from));
  return u * u * (3 - 2 * u);
};
// Something that swells in at `from` and shrinks away by `to`.
const up = (t, from, to) => ease(t, from, from + 0.5) * (1 - ease(t, to - 0.5, to));
// A flash: full in an eighth of a second, gone in half a second more.
const flashAt = (s) => (s < 0 ? 0 : s < 0.12 ? s / 0.12 : Math.max(0, 1 - (s - 0.12) / 0.5));

// When things happen in each kind, in seconds: how long it lasts, its own moment
// (the shutter, the picture, the hit), when each of the four lines comes, what is heard.
export const LANDMARK_TIMES = {
  photo: { seconds: 26, downAt: 9, lines: [0, 6, 10, 18], sounds: [[9, 'shutter'], [10.5, 'discovered']] },
  look: { seconds: 22, downAt: 5, lines: [0, 5, 10, 16], sounds: [[5, 'discovered']] },
  impact: { seconds: 24, downAt: 9, lines: [0, 5, 9, 15], sounds: [[9, 'impact'], [12.5, 'discovered']] },
  sunrise: { seconds: 21, downAt: 12.8, lines: [0, 6, 11, 15.5], sounds: [[12.8, 'discovered']] },
  huygens: { seconds: 24, downAt: 16, lines: [0, 5, 10, 16], sounds: [[16, 'discovered']] },
  // Stonehenge's midsummer dawn: the sky pales, the Sun comes up by the Heel Stone, and
  // its first light runs down the axis to the middle of the ring at downAt.
  solstice: { seconds: 30, downAt: 19, lines: [0, 7, 13, 20], sounds: [[19, 'discovered']] },
  // Cheomseongdae on a clear night: the stars wheel round the north star, leaving trails,
  // a lamp burns in the window, and a shooting star crosses at downAt.
  starNight: { seconds: 30, downAt: 16.5, lines: [0, 7, 14, 21], sounds: [[16.5, 'discovered']] },
};

// Huygens's night (render/huygensStage.js): Mars turns in the eyepiece once every
// HUYGENS_TURN seconds, its dark wedge facing the eye at TURN_FROM and at each turn after;
// each time it comes back a drawing is laid on the table. (Its true day is 24 h 37 min:
// here a day goes by in 6.5 s.)
export const HUYGENS_TURN = 6.5;
const TURN_FROM = 3;
export const huygensTurn = (t) => (2 * Math.PI * (t - TURN_FROM)) / HUYGENS_TURN;
// Where things stand (render/huygensStage.js builds them so): the eyepiece's round field
// and Mars in it, under the telling's reach (1.45 up); the table to the left, where a
// drawing is laid each time the wedge comes back.
// (The field stands nearer than the telescope, whose tube then runs in under its rim:
// behind it, the tube lay across Mars.)
const VIEW_Z = -0.3;
export const HUYGENS = { view: { x: -0.2, y: 0.82, size: 1.0, globe: 0.36 }, table: { x: -0.92, top: 0.36 }, sheets: 3 };

// The sunrise's Sun: where it stands to the side and behind the rim, and how high its
// middle is when it is down (its disc, 0.49 to its edge, is then wholly behind the rim,
// whose crest is 0.45 up: render/siteModels.js SUNRISE), at its first stop (four fifths
// of the disc over the rim) and at the end (clear of it, its top under the telling).
// RIDGE_SUNK: how far the rim's drawing stands in the ground.
const SUN_X = -0.15;
const SUN_BEHIND = 0.7;
const SUN_DOWN = -0.5;
const SUN_HALF = 0.75;
const SUN_UP = 1.1;
const RIDGE_SUNK = 0.3;

// Chicxulub's three dinosaurs (render/dinoModels.js; the user, 2026-10-18: "공룡들이
// 하늘에서 돌 떨어지는거 보고 있다가.. 이건 어때?"): where each stands on the right of
// where the stone comes down, turned to face it; how large; the joint of its neck in its
// own units (x ahead, y up), about which its head is raised; how far it raises it (rad)
// and when it starts to, once the stone is in a phone's view (about 4 s). Till then the
// heads are a little down and bob, as if grazing. They are gone in the flash.
export const DINOS = [
  { id: 'trex', x: 0.3, z: -0.05, scale: 0.75, neck: [0.15, 0.42], raise: 0.7, from: 4.4 },
  { id: 'longNeck', x: 0.82, z: 0.45, scale: 0.62, neck: [0.2, 0.48], raise: 0.35, from: 5.2 },
  { id: 'triceratops', x: 1.15, z: -0.35, scale: 0.66, neck: [0.2, 0.3], raise: 0.6, from: 5.8 },
];
const GONE_AT = 9.3;
function dinoPieces(t) {
  // The rise of grass they stand on (in the air over the sea they seemed to float).
  const out = { dinoGround: { x: 0.78, y: -0.02, z: 0.05, scale: 1, shown: t < GONE_AT } };
  DINOS.forEach((d, k) => {
    const shown = t < GONE_AT;
    const grazing = -0.18 + 0.06 * Math.sin(t * 1.4 + k * 2.1);
    const lean = grazing + (d.raise - grazing) * ease(t, d.from, d.from + 1.6);
    // Turned half round (to face -x, the stone), its neck joint lies to the left of its middle.
    out[`${d.id}Body`] = { x: d.x, y: 0, z: d.z, scale: d.scale, turn: Math.PI, shown };
    out[`${d.id}Head`] = { x: d.x - d.neck[0] * d.scale, y: d.neck[1] * d.scale, z: d.z, scale: d.scale, turn: Math.PI, lean, shown };
  });
  return out;
}

// Stonehenge about 2500 BC (render/hengeModels.js builds it from these; the user,
// 2026-10-20: "스톤헨지 장면 만들어"). In the model's units: x across the view, z away
// from the eye, the middle of the ring at 0. The real ring of sarsens is 33 m across:
// here 1.2 units, so a unit is about 27 m, and the stones stand a little taller than that
// would make them (4 m uprights 0.17, the 7 m trilithon 0.3). The bank and ditch (about
// 55 m out) and the Heel Stone (about 77 m) are drawn nearer in, so that all of it, the
// Sun on the horizon too, is in a phone's view.
// axis: the way to the midsummer sunrise, in radians from straight away (+z) toward +x:
// the stage is turned so that it runs up and to the right (seen along it, the horseshoe
// of trilithons hid the middle). sky: how far away the horizon is drawn.
export const HENGE = {
  axis: 0.5,
  sky: 2.6,
  ring: { radius: 0.6, count: 30, size: [0.075, 0.17, 0.045], lintel: 0.032 },
  // The five trilithons (two uprights and a lintel), by the angle from the axis (rad) and
  // the distance from the middle: highest at the closed end, open toward the sunrise.
  trilithons: [[-1.2, 0.34, 0.22], [-2.15, 0.32, 0.26], [Math.PI, 0.3, 0.3], [2.15, 0.32, 0.26], [1.2, 0.34, 0.22]],
  // A ring of small bluestones between the two, and a few inside the horseshoe.
  blue: { radius: 0.47, count: 18, inner: 0.2, innerCount: 7, height: 0.065 },
  ditch: 1.12,
  heel: { along: 1.5, aside: 0.08, size: [0.1, 0.16, 0.08], lean: 0.18 },
};
// A point `r` out from the middle, `angle` (rad) round from the axis.
export const hengeAt = (r, angle) => [r * Math.sin(HENGE.axis + angle), r * Math.cos(HENGE.axis + angle)];
// Every stone as it stands: where (x, z), how wide across the ring (w), how tall (h), how
// thick (d), its turn about the upright (rad), its lean and what it is. Each is a little
// unlike the next (a seeded wobble, the same every time).
export function hengeStones() {
  let seed = 11;
  const wobble = (n) => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 2 * n; };
  const stones = [];
  const { ring, trilithons, blue, heel } = HENGE;
  // (The axis runs between two uprights: the first is half a step round from it.)
  for (let k = 0; k < ring.count; k += 1) {
    const angle = ((k + 0.5) / ring.count) * 2 * Math.PI;
    const [x, z] = hengeAt(ring.radius, angle);
    stones.push({ kind: 'sarsen', x, z, w: ring.size[0] * (1 + wobble(0.12)), h: ring.size[1], d: ring.size[2] * (1 + wobble(0.15)), turn: HENGE.axis + angle + wobble(0.06), lean: wobble(0.03) });
  }
  for (const [angle, r, h] of trilithons) {
    const [x, z] = hengeAt(r, angle);
    // The two uprights side by side across the radius, a narrow slot between them.
    const across = [Math.cos(HENGE.axis + angle), -Math.sin(HENGE.axis + angle)];
    for (const side of [-1, 1]) {
      stones.push({ kind: 'trilithon', x: x + side * 0.042 * across[0], z: z + side * 0.042 * across[1], w: 0.068 * (1 + wobble(0.08)), h, d: 0.055, turn: HENGE.axis + angle + wobble(0.04), lean: wobble(0.02) });
    }
  }
  for (let k = 0; k < blue.count; k += 1) {
    const angle = ((k + 0.5) / blue.count) * 2 * Math.PI + wobble(0.06);
    const [x, z] = hengeAt(blue.radius, angle);
    stones.push({ kind: 'blue', x, z, w: 0.035, h: blue.height * (1 + wobble(0.25)), d: 0.028, turn: HENGE.axis + angle, lean: wobble(0.08) });
  }
  // (Inside the horseshoe, not across its open end.)
  for (let k = 0; k < blue.innerCount; k += 1) {
    const angle = 1.15 + (k / (blue.innerCount - 1)) * (2 * Math.PI - 2.3);
    const [x, z] = hengeAt(blue.inner, angle);
    stones.push({ kind: 'blue', x, z, w: 0.03, h: blue.height * 1.2, d: 0.025, turn: HENGE.axis + angle, lean: wobble(0.05) });
  }
  // The Heel Stone stands alone outside, a little to the right of the axis, leaning in.
  const [hx, hz] = hengeAt(heel.along, Math.atan2(heel.aside, heel.along));
  stones.push({ kind: 'heel', x: hx, z: hz, w: heel.size[0], h: heel.size[1], d: heel.size[2], turn: HENGE.axis, lean: heel.lean });
  return stones;
}
// The lintels on the ring and on each trilithon: from where to where (x, z), how high
// their underside is.
export function hengeLintels() {
  const { ring, trilithons } = HENGE;
  const out = [];
  for (let k = 0; k < ring.count; k += 1) {
    out.push({ from: hengeAt(ring.radius, ((k + 0.5) / ring.count) * 2 * Math.PI), to: hengeAt(ring.radius, ((k + 1.5) / ring.count) * 2 * Math.PI), y: ring.size[1], h: ring.lintel, d: ring.size[2] * 1.1 });
  }
  for (const [angle, r, h] of trilithons) {
    const [x, z] = hengeAt(r, angle);
    const across = [Math.cos(HENGE.axis + angle), -Math.sin(HENGE.axis + angle)];
    out.push({ from: [x - 0.085 * across[0], z - 0.085 * across[1]], to: [x + 0.085 * across[0], z + 0.085 * across[1]], y: h, h: 0.04, d: 0.06 });
  }
  return out;
}
// Where the Sun is, t seconds in: a little to the left of the axis as it comes up (its
// disc, 0.08 to its edge, first shows over the horizon at about 10.7 s and is clear of it
// at 15.5 s), drifting right as it climbs. x, y, z in the model's units, on the far sky.
export const HENGE_SUN = { disc: 0.08 };
export function hengeSun(t) {
  const along = HENGE.sky - 0.05;
  const angle = HENGE.axis - 0.05 + 0.004 * Math.max(0, t - 10);
  return { x: Math.tan(angle) * along, y: -0.1 + 0.035 * Math.max(0, t - 10), z: along, angle };
}
function solsticeStage(t) {
  const sun = hengeSun(t);
  const said = up(t, 4, 10.5);
  const said2 = up(t, 20.5, 28.5);
  // The shadows: from when the Sun's disc is half up, thrown away from it, shortening as it climbs.
  const shade = ease(t, 12, 15);
  return {
    // The sky (and the stones and grass with it) goes from night to dawn, then to morning.
    sky: { x: 0, y: 0, z: 0, dawn: ease(t, 1, 13), day: ease(t, 15, 28), sunX: sun.x, sunY: sun.y },
    henge: { x: 0, y: 0, z: 0, dawn: ease(t, 1, 13), day: ease(t, 15, 28) },
    sun: { x: sun.x, y: sun.y, z: sun.z, glow: ease(t, 8, 13) },
    shadows: { x: 0, y: 0, z: 0, angle: sun.angle + Math.PI, length: 1.3 - 0.55 * ease(t, 16, 30), fade: shade, shown: shade > 0 },
    // The first light down the axis, from the horizon to the middle (reach 0 → 1), and
    // the middle lit once it is there.
    beam: { x: 0, y: 0, z: 0, reach: ease(t, 12.5, 19), glow: ease(t, 12.5, 13.5), middle: ease(t, 18.6, 19.8) * (0.85 + 0.15 * Math.sin(t * 3)), shown: t > 12.5 },
    bubble: { x: -0.62, y: 1.05, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
    bubble2: { x: -0.5, y: 1.05, scale: Math.max(0.01, 0.8 * said2), shown: said2 > 0.01 },
  };
}

// Cheomseongdae in Gyeongju, built in Queen Seondeok's time (about 632 → 647; the user,
// 2026-10-20: "첨성대 장면도 같이 만들어"; render/cheomModels.js builds it). In the model's
// units, x across, z away from the eye, which looks north at its south window: a unit
// is about 9.5 m. 27 courses of granite rising 0.9 from a base 0.27 across at the foot
// to 0.15 at the top, curving in like a bottle; a square platform of two tiers under it;
// the window, about 1 m square, at courses 13 to 15; the frame of long stones laid two
// deep in the shape of 井 on top. (The real tower is 9.17 m tall, 5.17 m across at the
// foot.) The tower stands right of the middle; the north star is up to its left, lower
// than its true 36 degrees so that it is in a phone's view under the telling.
export const CHEOM = {
  x: 0.3,
  courses: 27,
  base: 0.07,
  height: 0.9,
  foot: 0.27,
  top: 0.15,
  window: { from: 12, to: 15, width: 0.1 },
  pole: { x: -0.55, y: 1.05, z: 3 },
};
// The radius of course k (0 at the foot), its bottom (y) and its height.
export function cheomCourse(k) {
  const { courses, base, height, foot, top } = CHEOM;
  const u = k / (courses - 1);
  const h = height / courses;
  return { r: top / 2 + ((foot - top) / 2) * (1 - u) ** 1.7, y: base + k * h, h };
}
// How far the sky has turned round the north star, t seconds in (radians; anticlockwise,
// as the northern sky turns seen facing north), and how long the trails behind each star
// are: drawn faster than the true quarter of a degree a minute, about 2 hours in 30 s.
export const cheomTurn = (t) => 0.018 * t;
export const cheomTrail = (t) => 0.35 * ease(t, 4, 26);
function starNightStage(t) {
  const said = up(t, 4.5, 11);
  const said2 = up(t, 21.5, 28.5);
  // The shooting star: across the upper left in under a second.
  const fall = clamp((t - 16) / 0.9);
  const { pole } = CHEOM;
  return {
    night: { x: 0, y: 0, z: 0 },
    tower: { x: CHEOM.x, y: 0, z: 0, lamp: ease(t, 1, 4) * (0.88 + 0.08 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 17.1)) },
    stars: { x: pole.x, y: pole.y, z: pole.z, wheel: cheomTurn(t), trail: cheomTrail(t), fade: ease(t, 0, 2.5) },
    meteor: { x: -0.2 - 1.3 * fall, y: 1.25 - 0.45 * fall, z: 2.9, fade: Math.sin(Math.PI * fall), shown: t > 16 && t < 16.9 },
    bubble: { x: -0.55, y: 0.75, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
    bubble2: { x: -0.55, y: 0.75, scale: Math.max(0.01, 0.8 * said2), shown: said2 > 0.01 },
  };
}

// sayBy: 'craft' (the bubble goes along with what flies or falls) or 'place' (it stands
// by the picture). dinos: Chicxulub's three stand and watch (DINOS).
export function landmarkStage(kind, sayBy = 'craft', { dinos = false } = {}) {
  if (kind === 'photo') {
    return (t) => {
      const x = -2.4 + 4.8 * clamp(t / 20);
      const said = up(t, 10.6, 16);
      return {
        probe: { x, y: 0.95, scale: 0.6, shown: t < 20 },
        flash: { x: x + 0.1, y: 0.95, scale: Math.max(0.01, 0.5 * flashAt(t - 9)), shown: flashAt(t - 9) > 0 },
        // The picture stays up to the end.
        photo: { x: -0.7, y: 0.02, scale: Math.max(0.01, ease(t, 9.3, 10.3)), shown: t >= 9.3 },
        bubble: sayBy === 'craft'
          ? { x: Math.min(0.9, x + 0.5), y: 1.26, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 }
          : { x: 0.5, y: 1.2, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
      };
    };
  }
  if (kind === 'look') {
    return (t) => {
      const said = up(t, 7, 13);
      return {
        photo: { x: -0.25, y: 0.02, scale: Math.max(0.01, 1.15 * ease(t, 5, 6.2)), shown: t >= 5 },
        bubble: { x: 0.85, y: 1.0, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
      };
    };
  }
  if (kind === 'huygens') {
    const { view, table, sheets } = HUYGENS;
    return (t) => {
      const shown = ease(t, 1.2, 2.4);
      const said = up(t, 17, 23);
      const stage = {
        room: { x: 0, y: 0 },
        // The candle's flame (at the table's front corner, before the drawings) trembles a little.
        flame: { x: table.x - 0.17, y: table.top + 0.13, z: 0.0, scale: 1 + 0.12 * Math.sin(t * 13) * Math.sin(t * 3.1) },
        view: { x: view.x, y: view.y, z: VIEW_Z, scale: Math.max(0.01, view.size * shown), shown: shown > 0 },
        globe: { x: view.x, y: view.y, z: VIEW_Z, scale: Math.max(0.01, view.globe * shown), turn: huygensTurn(t), shown: shown > 0 },
        bubble: { x: 0.55, y: 1.3, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
      };
      for (let k = 0; k < sheets; k += 1) {
        const laid = ease(t, TURN_FROM + k * HUYGENS_TURN + 0.2, TURN_FROM + k * HUYGENS_TURN + 0.8);
        stage[`sheet${k}`] = { x: table.x - 0.05 + k * 0.05, y: table.top + 0.015, z: 0.12 - k * 0.04, scale: Math.max(0.01, laid), shown: laid > 0 };
      }
      return stage;
    };
  }
  if (kind === 'solstice') return solsticeStage;
  if (kind === 'starNight') return starNightStage;
  if (kind === 'sunrise') {
    return (t) => {
      // The Sun's middle over the ground: up till most of its disc is over the rim, a
      // stop, back down behind it, then up again and clear of it.
      const y = t < 8 ? SUN_DOWN + (SUN_HALF - SUN_DOWN) * ease(t, 1.5, 6.5)
        : t < 12.5 ? SUN_DOWN + (SUN_HALF - SUN_DOWN) * (1 - ease(t, 8, 11.6))
          : SUN_DOWN + (SUN_UP - SUN_DOWN) * ease(t, 12.8, 19.5);
      const said = up(t, 14, 19.5);
      return {
        sky: { x: 0, y: 0, z: SUN_BEHIND + 0.25 },
        sun: { x: SUN_X, y, z: SUN_BEHIND },
        ridge: { x: 0, y: -RIDGE_SUNK },
        // (Larger than the other stages' 0.8, the user, 2026-10-13: "자막이 너무 작아"; at
        // 1.7 it ran off a phone's right edge: "너무 커졌잖아". Up and right of the Sun.)
        bubble: { x: 0.78, y: 1.65, scale: Math.max(0.01, 1.1 * said), shown: said > 0.01 },
      };
    };
  }
  return (t) => {
    const u = clamp(t / 9);
    const s = t - 9;
    const flash = s < 0 ? 0 : s < 0.25 ? (s / 0.25) * 2.4 : 2.4 * Math.max(0, 1 - (s - 0.25) / 1.6);
    // It comes in from the upper left slowly enough to be in a phone's view from about
    // 4 s (it was a fast streak seen only for the last 2 s, and its bubble hung alone
    // in the sky before it: the user's sheet, 2026-10-07). The bubble waits for it.
    const said = sayBy === 'craft' ? up(t, 4.4, 8.8) : up(t, 13.6, 19);
    const rock = { x: -2.6 * (1 - u), y: 0.1 + 2.23 * (1 - u) };
    return {
      ...(dinos ? dinoPieces(t) : {}),
      rock: { ...rock, lean: -3 * t, shown: t < 9 },
      flash: { x: 0, y: 0.15, scale: Math.max(0.01, flash), shown: flash > 0 },
      // What it threw out: a ring that spreads and thins.
      scraps: { x: 0, y: 0.05 + 0.5 * Math.max(0, s) - 0.16 * s * s, scale: 0.3 + 1.8 * Math.max(0, s), shown: s >= 0 && s < 3 },
      // The place as it is now.
      photo: { x: -0.7, y: 0.02, scale: Math.max(0.01, ease(t, 12.5, 13.5)), shown: t >= 12.5 },
      bubble: sayBy === 'craft'
        ? { x: Math.min(0.85, Math.max(-0.85, rock.x + 0.6)), y: Math.min(1.25, rock.y + 0.45), scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 }
        : { x: 0.5, y: 1.2, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
    };
  };
}

// A scene as core/replay.js wants it, from what it tells: { kind, sayBy, name, day,
// lines: four texts }. One with little to tell has fewer lines and its own `seconds`
// (no shorter than its bubble's stay: a look's is gone at 13 s). On a planet of gas the
// eye is held 0.2% of its radius over the clouds (core/eye.js: 116 km on Saturn), so a
// scene there is seen from farther (viewKm) and drawn larger to match (sizeKm, km to a
// unit), as the comet's fall on Jupiter is.
export function landmarkScene({ kind, sayBy, name, day, lines, seconds, viewKm = 56, sizeKm, dinos }) {
  const times = LANDMARK_TIMES[kind];
  return {
    name, day, kind,
    seconds: seconds ?? times.seconds,
    downAt: times.downAt,
    viewKm,
    ...(sizeKm ? { sizeKm } : {}),
    sounds: times.sounds,
    lines: lines.map((text, i) => ({ at: times.lines[i], text })),
    stage: landmarkStage(kind, sayBy, { dinos }),
  };
}
