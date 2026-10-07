// Which drawing of the sprite character to show (render/spriteHero.js draws it).
// 40 sheets of four frames each, in public/assets/seora-sprites. (Four more are in the
// folder but not used: 'backward', the first rear view, which leaned 45 degrees; 'up'
// and 'down', which show her from the front; and 'dock-hold', a flying pose for riding
// a craft, dropped because once docked she should look stopped.)
//
// The camera sits behind the traveler, so in flight she is seen from behind:
//   'away'                       flying straight into the screen
//   'away-left', 'away-right'    the same, leaning about 20 degrees
//   'back-left', 'back-right'    banking in a turn
//   'back-up', 'back-down'       climbing, diving
//   'left', 'right'              side-on (sliding sideways, or carried well off to one side)
//   'forward'                    her front (coming toward the camera: flying in reverse)

export const FRAMES = 4;
export const FLIGHT_SHEETS = ['away', 'away-left', 'away-right', 'back-left', 'back-right', 'back-up', 'back-down', 'left', 'right', 'forward'];
// What she does now and then while hovering. times: how often the four drawings run.
export const REST_ACTIONS = [
  { sheet: 'rest-tilt', times: 1 }, { sheet: 'rest-wave', times: 2 }, { sheet: 'rest-spin', times: 1 },
  { sheet: 'rest-hop', times: 2 }, { sheet: 'rest-look', times: 1 }, { sheet: 'rest-stretch', times: 1 },
  { sheet: 'rest-nod', times: 2 }, { sheet: 'rest-sway', times: 2 }, { sheet: 'rest-cheer', times: 1 },
  { sheet: 'rest-wave2', times: 2 }, { sheet: 'rest-sit', times: 3 }, { sheet: 'rest-star', times: 1 },
  { sheet: 'rest-ribbon', times: 1 },
  // Drawn to order on 2026-10-04 (the user: "모두 다 하자"): a yawn, writing in the
  // notebook, a look through a small telescope, a rice ball.
  { sheet: 'rest-yawn', times: 1 }, { sheet: 'rest-note', times: 2 }, { sheet: 'rest-scope', times: 2 },
  { sheet: 'rest-snack', times: 2 },
  // Ten more, drawn to order on 2026-10-05 (the user: "10개 더 넣자"): tea, a camera, a
  // paper crane let go, a map turned upside down, a postcard held close, soap bubbles,
  // curled up afloat, a sock pulled up, a toy rabbit, headphones.
  { sheet: 'rest-tea', times: 2 }, { sheet: 'rest-photo', times: 1 }, { sheet: 'rest-crane', times: 1 },
  { sheet: 'rest-map', times: 1 }, { sheet: 'rest-letter', times: 1 }, { sheet: 'rest-bubble', times: 2 },
  { sheet: 'rest-float', times: 3 }, { sheet: 'rest-socks', times: 1 }, { sheet: 'rest-plush', times: 1 },
  { sheet: 'rest-music', times: 3 },
  // And the last ten, on 2026-10-06 (the user: "10개 오면... 그걸로 끝하자": thirty-seven
  // is enough): knitting, bubble gum, a sketch, a yo-yo, a comb and a hand mirror, three
  // stars juggled, an umbrella, stars counted on her fingers, a cat's cradle, clapping.
  { sheet: 'rest-knit', times: 3 }, { sheet: 'rest-gum', times: 1 }, { sheet: 'rest-draw', times: 1 },
  { sheet: 'rest-yoyo', times: 3 }, { sheet: 'rest-comb', times: 1 }, { sheet: 'rest-juggle', times: 3 },
  { sheet: 'rest-umbrella', times: 1 }, { sheet: 'rest-count', times: 1 }, { sheet: 'rest-string', times: 1 },
  { sheet: 'rest-clap', times: 2 },
  // Three more on 2026-10-07, by the user's own word after all ("소라 휴식 시 행동은 3개
  // 더 만들어서 50개 채우자"): a skipping rope, a pinwheel blown round, a sprout
  // watered until it flowers. Forty.
  { sheet: 'rest-rope', times: 3 }, { sheet: 'rest-pinwheel', times: 1 }, { sheet: 'rest-water', times: 1 },
];
export const SHEETS = [
  ...FLIGHT_SHEETS, 'brake', 'idle', ...REST_ACTIONS.map((a) => a.sheet), 'rest-sleep',
  'dock-reach', 'stand', 'land', 'warp-out', 'warp-in', 'sling', 'photo-v', 'photo-jump',
  'cheer-big', 'hurt-bright', 'cold', 'hot',
  // Drawn to order on 2026-10-02 (docs/seora-sprite-order-photo-landing.md): a V sign
  // that reads at a glance, coming down feet first, and touching down. They take the
  // place of 'photo-v' and 'land', whose drawings stay in the folder.
  'photo-v2', 'land-descend', 'land-touch',
  // Wiping her brow with a sleeve: takes turns with 'hot' (fanning herself).
  'hot-wipe',
  // Drawn to order for the story (docs/art-order-story.md): sitting beside a probe left
  // alone, and reading a note from grandmother.
  'sit', 'read',
  // Drawn to order on 2026-10-04: what she does when a sight is pointed out (pointing
  // at it, wide-eyed at it, looking up at it), and speaking, while her bubble is up.
  'see-point', 'see-wow', 'see-up', 'talk',
  // Drawn to order on 2026-10-06: a finger to her lips, when the sound or the music is
  // switched off (the user: "소리 끄기 버튼을 누르면, 소라가 손가락을 입에 대고, 쉬잇~
  // 하는 움직임 넣어줘", "소리/음악 공통으로 해줘"). Shown as a sight is: see 'hush'.
  'see-hush',
  // Drawn to order on 2026-10-06: a picture taken with a small camera (up to her eye, the
  // button pressed, a smile), played in the close view when a shutter sounds: a craft's
  // in a scene of its day, or the player's own ("사진 저장").
  'see-snap',
];

// Which of the three she does for a sight (the ids of core/glows.js, with 'meteor' and
// 'belt'): she looks up at what is in the sky, is startled by what flashes or happens
// of a sudden, and points at the rest.
const SEE_UP = ['aurora', 'counterglow', 'meteor', 'clouds', 'airglow', 'flare', 'shine'];
const SEE_WOW = ['lightning', 'sprite', 'impact', 'transit', 'tailcut', 'plume', 'jets', 'geyser'];
export function seeFor(sight) {
  const kind = String(sight).split(':')[0];
  if (SEE_UP.includes(kind)) return 'up';
  if (SEE_WOW.includes(kind)) return 'wow';
  return 'point';
}
// How long she keeps at it.
export const SEE_S = 3;

// Frames per second.
export const SPRITE_FPS = {
  flight: 10,
  // The turn-round: the four 'brake' drawings, forwards as she stops and turns to face
  // the camera, backwards as she turns away again to fly off. 0.8 s.
  brake: 5,
  rest: 4, sit: 4, read: 4, sleep: 1.5, reach: 2, stand: 3, land: 8, descend: 6, sling: 12, cheer: 8, bright: 4, cold: 6, hot: 4,
  see: 4, talk: 6,
};
const TURN_ROUND_S = FRAMES / SPRITE_FPS.brake;
// Slower than this (km/s) she is standing still.
const MOVING_KM_S = 1;
// Turning faster than this (radians per second) shows the turn instead of plain flight;
// once showing, the turn sheet stays until the turn eases below the lower figure.
const TURN = 0.25;
const TURN_EASED = 0.1;
// A mouse drag arrives in bursts: a big turn one frame, none the next. So the turn is
// smoothed over about a fifth of a second, and a flight sheet, once shown, stays up at
// least this long.
const TURN_SMOOTHING = 5;
export const SHEET_HOLD_S = 0.3;
// Carried somewhere other than straight ahead: beyond the first figure (the sine of
// about 9 degrees) she leans that way, beyond the second (27 degrees) she is side-on.
const LEAN = 0.15;
const SIDEWAYS = 0.45;
// Hovering: the first rest action after this long, then one every 8 to 15 seconds;
// after a minute of stillness she dozes off.
export const FIRST_REST_S = 3;
export const REST_GAP_S = [8, 15];
export const SLEEP_AFTER_S = 60;
// Shielding her eyes near the Sun, fanning herself in its heat, shivering in the cold:
// how long each time, and the
// SPRITE_FPS entry for each sheet.
export const FEELING_S = 2;
const FEELINGS = { 'hurt-bright': 'bright', cold: 'cold', hot: 'hot', 'hot-wipe': 'hot' };
// The jump: how long each half of it takes (ui/warp.js).
const WARP_OUT_S = 2.7;
const WARP_IN_S = 2.6;

// Steady numbers in 0..1 for n, the same every time.
function chance(n) {
  let x = Math.imul(n + 1, 0x9e3779b1) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function createSpriteState() {
  return { mode: 'hover', sheet: 'idle', frame: 0, time: 0, since: 0, turn: [0, 0], rests: 0, still: 0, nextRest: FIRST_REST_S };
}

// The flight sheet for what the traveler is doing.
// drive: 1 forward, -1 reverse, 0 coasting. strafe: 1 right, -1 left, 0 none.
// turn: [yaw, pitch] in radians per second; yaw > 0 turns right, pitch > 0 noses down.
// heading: when she is being carried somewhere other than where she faces (gliding in
// to dock, flung by a slingshot, coasting on a craft's speed), the way she is really
// going, as a unit vector in her own frame (x right, y up, z ahead).
// showing: the sheet up now, which a turn that is only easing off does not yet leave.
export function flightSheet({ drive = 0, strafe = 0, turn = [0, 0], heading = null }, showing = null) {
  if (heading) {
    const [x, y, z] = heading;
    if (z < -0.2) return 'forward';
    if (Math.abs(x) > SIDEWAYS && Math.abs(x) >= Math.abs(y)) return x > 0 ? 'right' : 'left';
    if (Math.abs(y) > SIDEWAYS) return y > 0 ? 'back-up' : 'back-down';
    if (Math.abs(x) > LEAN) return x > 0 ? 'away-right' : 'away-left';
    return 'away';
  }
  // Sliding sideways with no thrust ahead: she flies side-on.
  if (strafe !== 0 && drive === 0) return strafe > 0 ? 'right' : 'left';
  if (drive < 0) return 'forward';
  const [yaw, pitch] = turn;
  if (Math.abs(pitch) > TURN && Math.abs(pitch) >= Math.abs(yaw)) return pitch > 0 ? 'back-down' : 'back-up';
  if (Math.abs(yaw) > TURN) return yaw > 0 ? 'back-right' : 'back-left';
  const still = {
    'back-right': yaw > TURN_EASED, 'back-left': yaw < -TURN_EASED, 'back-down': pitch > TURN_EASED, 'back-up': pitch < -TURN_EASED,
  };
  if (still[showing]) return showing;
  return 'away';
}

// What she is doing, from most pressing to least.
// input: { speed, drive, strafe, turn, heading, held, docking, landing, resting, boost,
//          warp, photo, cheer, bright, hot, cold, see, talk }
//   see: null or 'point' | 'wow' | 'up' while a sight has just been pointed out;
//   talk: true while her speech bubble is up. Both show only while she hovers.
//   warp: null, or { phase: 'out' | 'in', t } with t seconds into that half of a jump.
export function modeFor(input) {
  if (input.warp) return 'warp';
  if (input.cheer) return 'cheer';
  if (input.photo) return 'photo';
  // Reading a note she has just put away; sitting a while beside a probe left alone.
  if (input.read) return 'read';
  if (input.sit) return 'sit';
  if (input.docking) return 'reach';
  // Gliding down to a place on a surface, under the countdown (core/visit.js).
  if (input.landing) return 'descend';
  // Latched to a craft she is at rest, whatever speed the craft carries her at: she
  // turns to face the camera and hovers, as when she stops anywhere else.
  if (input.held) return 'hover';
  // (Nothing sets boost now: the slingshot was taken out of the game. The drawings stay.)
  if (input.boost) return 'sling';
  if (input.resting) return 'ground';
  return input.speed >= MOVING_KM_S ? 'fly' : 'hover';
}

const loop = (time, fps) => Math.floor(time * fps) % FRAMES;
// Leaning as she flies away, the third drawing kicks one leg up: played in turn with
// the others the legs jerked about ("다리 움직임이 매우 이상한데?"). It is left out: the
// first drawing comes round again in its place.
const CALM_ORDER = [0, 1, 0, 3];
const CALM_SHEETS = ['away-left', 'away-right'];
// The straight set, 'away', and the dive, 'back-down', were drawn again on 2026-10-05
// with the head and body in one place in all four drawings (measured: no shift between
// them), only the sashes and the ends of the hair moving: they play all four. (Before
// that 'away' played two of its four, because the other two stood 6 and 12px aside and
// her head shook, and 'back-down' left out a drawing that threw her hair up.)
export function flightFrame(sheet, n) {
  return CALM_SHEETS.includes(sheet) ? CALM_ORDER[n] : n;
}
const once = (time, fps) => Math.min(FRAMES - 1, Math.floor(time * fps));
// Facing the camera: these turn round by the 'brake' drawings on the way to and from flight.
const FACING = ['hover', 'ground', 'photo', 'cheer', 'read', 'sit'];

function hover(state, input, dt, fresh) {
  // The turn-round, when she has just stopped flying.
  if (state.sheet === 'brake' && !state.reverse && !fresh) {
    const time = state.time + dt;
    if (time < TURN_ROUND_S) return { ...state, time, frame: once(time, SPRITE_FPS.brake) };
    return { ...state, sheet: 'idle', time: 0, frame: 0, still: 0, nextRest: FIRST_REST_S };
  }
  const still = fresh ? 0 : state.still + dt;
  let { rests, nextRest } = fresh ? { rests: state.rests, nextRest: FIRST_REST_S } : state;
  // A sight has just been pointed out, or she is speaking: that takes the place of
  // whatever she was at, and she is awake for it.
  // (The finger to her lips is played once and held: the other three go round.)
  const showing = input.see ? `see-${input.see}` : input.talk ? 'talk' : null;
  if (showing) {
    const time = state.sheet === showing ? state.time + dt : 0;
    const awake = Math.min(still, SLEEP_AFTER_S - 5);
    return { ...state, sheet: showing, time, frame: input.see === 'hush' ? once(time, SPRITE_FPS.see) : loop(time, input.see ? SPRITE_FPS.see : SPRITE_FPS.talk), still: awake, rests, nextRest: Math.max(nextRest, awake + 2) };
  }
  if (still >= SLEEP_AFTER_S) return { ...state, sheet: 'rest-sleep', time: still, frame: loop(still - SLEEP_AFTER_S, SPRITE_FPS.sleep), still, rests, nextRest };
  // A rest action under way.
  const action = REST_ACTIONS.find((a) => a.sheet === state.sheet);
  if (action && !fresh) {
    const time = state.time + dt;
    if (time < (FRAMES * action.times) / SPRITE_FPS.rest) return { ...state, time, frame: loop(time, SPRITE_FPS.rest), still };
    return { ...state, sheet: 'idle', time: 0, frame: 0, still };
  }
  // Shielding her eyes or shivering, under way.
  const felt = FEELINGS[state.sheet];
  if (felt && !fresh) {
    const time = state.time + dt;
    if (time < FEELING_S) return { ...state, time, frame: loop(time, SPRITE_FPS[felt]), still };
    return { ...state, sheet: 'idle', time: 0, frame: 0, still };
  }
  if (still >= nextRest) {
    // Too bright to look, hot, or cold: every other rest action is that instead. (It used to
    // take the place of everything, and out past Uranus she did nothing but shiver.)
    // In the heat she fans herself one time and wipes her brow the next.
    const heat = (rests / 2) % 2 < 1 ? 'hot' : 'hot-wipe';
    const feeling = input.bright ? 'hurt-bright' : input.hot ? heat : input.cold ? 'cold' : null;
    if (feeling && rests % 2 === 0) {
      nextRest = still + FEELING_S + REST_GAP_S[0] + chance(rests + 1000) * (REST_GAP_S[1] - REST_GAP_S[0]);
      return { ...state, sheet: feeling, time: 0, frame: 0, still, rests: rests + 1, nextRest };
    }
    const pick = REST_ACTIONS[Math.floor(chance(rests) * REST_ACTIONS.length)];
    nextRest = still + (FRAMES * pick.times) / SPRITE_FPS.rest + REST_GAP_S[0] + chance(rests + 1000) * (REST_GAP_S[1] - REST_GAP_S[0]);
    return { ...state, sheet: pick.sheet, time: 0, frame: 0, still, rests: rests + 1, nextRest };
  }
  // Just hovering: eyes open, with a blink every four seconds or so.
  const blink = still % 4 > 3.85;
  return { ...state, sheet: 'idle', time: still, frame: blink ? 1 : 0, still, rests, nextRest };
}

// Advance by dt seconds.
export function stepSprite(state, input, dt) {
  const mode = modeFor(input);
  const fresh = mode !== state.mode;
  const from = state.mode;
  const next = { ...state, mode };

  if (mode === 'warp') {
    const { phase, t } = input.warp;
    const span = phase === 'out' ? WARP_OUT_S : WARP_IN_S;
    return { ...next, sheet: phase === 'out' ? 'warp-out' : 'warp-in', time: t, frame: once(t, FRAMES / span), reverse: false };
  }
  if (mode === 'cheer') {
    const time = fresh ? 0 : state.time + dt;
    return { ...next, sheet: 'cheer-big', time, frame: loop(time, SPRITE_FPS.cheer), reverse: false };
  }
  if (mode === 'photo') {
    // The game is paused in photo mode, so no time passes: she holds the finished pose,
    // two fingers up in a V. (Every other time it was a jump, 'photo-jump'; the drawings stay.)
    // Only the last of the four drawings is ever seen.
    // A shutter has just sounded (`snap`: seconds since, by the real clock): she takes a
    // picture too, once through at six drawings a second, and holds her smile.
    if (input.snap !== null && input.snap !== undefined) return { ...next, sheet: 'see-snap', time: input.snap, frame: once(input.snap, 6), reverse: false };
    return { ...next, sheet: 'photo-v2', time: 0, frame: FRAMES - 1, reverse: false };
  }
  if (mode === 'read') {
    // Once through, then she holds the note to her chest.
    const time = fresh ? 0 : state.time + dt;
    return { ...next, sheet: 'read', time, frame: once(time, SPRITE_FPS.read), reverse: false };
  }
  if (mode === 'sit') {
    const time = fresh ? 0 : state.time + dt;
    return { ...next, sheet: 'sit', time, frame: loop(time, SPRITE_FPS.sit), reverse: false };
  }
  if (mode === 'sling') {
    const time = fresh ? 0 : state.time + dt;
    return { ...next, sheet: 'sling', time, frame: loop(time, SPRITE_FPS.sling), reverse: false };
  }
  if (mode === 'reach') {
    // Gliding in to dock: her arm goes out, unless the craft is well off to one side.
    const time = fresh ? 0 : state.time + dt;
    const way = input.heading ? flightSheet({ heading: input.heading }) : 'away';
    if (way === 'left' || way === 'right' || way === 'forward') return { ...next, sheet: way, time, frame: loop(time, SPRITE_FPS.flight), reverse: false };
    return { ...next, sheet: 'dock-reach', time, frame: once(time, SPRITE_FPS.reach), reverse: false };
  }
  if (mode === 'descend') {
    // Coming down feet first, seen from behind, hair and sash lifted by the fall.
    const time = fresh ? 0 : state.time + dt;
    return { ...next, sheet: 'land-descend', time, frame: loop(time, SPRITE_FPS.descend), reverse: false };
  }
  if (mode === 'ground') {
    // Touching down, then standing.
    // Getting up from sitting or looking up from a note, she is already on the ground.
    if (fresh && (from === 'sit' || from === 'read')) return { ...next, sheet: 'stand', time: 0, frame: 0, reverse: false };
    if (fresh) return { ...next, sheet: 'land-touch', time: 0, frame: 0, reverse: false };
    const time = state.time + dt;
    if (state.sheet === 'land-touch' && time < FRAMES / SPRITE_FPS.land) return { ...next, time, frame: once(time, SPRITE_FPS.land) };
    if (state.sheet === 'land-touch') return { ...next, sheet: 'stand', time: 0, frame: 0 };
    return { ...next, sheet: 'stand', time, frame: loop(time, SPRITE_FPS.stand) };
  }
  if (mode === 'fly') {
    const raw = input.turn ?? [0, 0];
    const was = from === 'fly' ? state.turn ?? [0, 0] : [0, 0];
    const k = 1 - Math.exp(-dt * TURN_SMOOTHING);
    const turn = was.map((n, i) => n + (raw[i] - n) * k);
    // Setting off from facing the camera: turn away first, by the brake drawings in
    // reverse (from wherever a stop that was still under way had got to).
    if (fresh && FACING.includes(from)) {
      const time = state.sheet === 'brake' && !state.reverse ? Math.max(0, TURN_ROUND_S - state.time) : 0;
      return { ...next, sheet: 'brake', reverse: true, time, frame: FRAMES - 1 - once(time, SPRITE_FPS.brake), since: 0, turn };
    }
    if (state.reverse && !fresh) {
      const time = state.time + dt;
      if (time < TURN_ROUND_S) return { ...next, time, frame: FRAMES - 1 - once(time, SPRITE_FPS.brake), turn };
      return { ...next, sheet: flightSheet({ ...input, turn }), reverse: false, time: 0, frame: 0, since: 0, turn };
    }
    if (fresh) return { ...next, sheet: flightSheet({ ...input, turn }), reverse: false, time: 0, frame: 0, since: 0, turn };
    const since = state.since + dt;
    const time = state.time + dt;
    const wanted = flightSheet({ ...input, turn }, state.sheet);
    const sheet = wanted === state.sheet || since < SHEET_HOLD_S ? state.sheet : wanted;
    return { ...next, sheet, time, frame: flightFrame(sheet, loop(time, SPRITE_FPS.flight)), since: sheet === state.sheet ? since : 0, turn };
  }
  // Hovering. Coming out of flight she turns round to face the camera first.
  if (fresh && ['fly', 'sling', 'reach', 'descend'].includes(from)) {
    const time = state.reverse ? Math.max(0, TURN_ROUND_S - state.time) : 0;
    return { ...next, sheet: 'brake', reverse: false, time, frame: once(time, SPRITE_FPS.brake), still: 0, turn: [0, 0] };
  }
  return hover({ ...next, reverse: false }, input, dt, fresh);
}

// Which of the four frames (0..3) to show.
export function spriteFrame(state) {
  return state.frame;
}

// The file for a sheet and frame, under the site's assets folder.
export function spriteFile(sheet, frame) {
  return `seora-sprites/${sheet}-${frame + 1}.png`;
}
