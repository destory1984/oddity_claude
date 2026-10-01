import {
  BODIES, START_POSITION, TIME_SCALE, bodiesAt, bodyById, nearestSurface, nearestLocalBody,
} from './core/bodies.js';
import { C, speedLimit } from './core/flight.js';
import {
  createState, step, stopNow, totalSpeed, carryAlong, TURN_RATE, startOrientation,
} from './core/game.js';
import { rotateLocal, lookAtDirection, multiply, conjugate, forward } from './core/orientation.js';
import { createWorld } from './render/world.js';
import { createInput } from './ui/input.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createPhoto } from './ui/photo.js';
import { createToast } from './ui/toast.js';
import { eventMessage, limitText } from './ui/messages.js';
import { MISSIONS, completedMissions } from './core/missions.js';
import { updateProgress, recordPhotos, createProgress, summarize, score, isComplete } from './core/progress.js';
import { loadProgress, saveProgress } from './ui/storage.js';
import { createJournal } from './ui/journal.js';
import { createSound } from './ui/sound.js';
import { cueForEvent, engineSound } from './core/audio.js';

const $ = (id) => document.getElementById(id);
const MAX_FRAME_GAP_S = 0.5;
const HUD_EVERY_N_FRAMES = 6;

// TEMPORARY (2026-10-01): start beside Saturn while its rings are being tuned.
// Set to false to start above Earth again.
const START_AT_SATURN = true;

function saturnStart() {
  const saturn = bodyById('saturn');
  const sun = bodyById('sun');
  // 330,000 km from Saturn's centre, on the sunlit side and well above the
  // ring plane, so the whole ring system fits in the view. (Saturn moves about 70 km/s
  // on the game clock, so it stays put for a long look.)
  const toSun = sun.position.map((n, i) => n - saturn.position[i]);
  const length = Math.hypot(...toSun);
  const out = [0.6 * toSun[0] / length, 0.6 * toSun[1] / length + 0.8, 0.6 * toSun[2] / length];
  const norm = Math.hypot(...out);
  const position = saturn.position.map((n, i) => n + (out[i] / norm) * 330000);
  return createState(position, lookAtDirection(saturn.position.map((n, i) => n - position[i])));
}

let state = START_AT_SATURN ? saturnStart() : createState(START_POSITION, startOrientation(innerWidth / innerHeight));
let paused = false;
let selectedId = START_AT_SATURN ? 'saturn' : 'earth';
let dragTurn = [0, 0];
let progress = loadProgress(BODIES, MISSIONS);
// Simulated seconds since the start; bodies orbit on this clock (TIME_SCALE x real time).
let simTime = 0;
let bodies = bodiesAt(0);
// Where a body is right now (BODIES is only the starting layout).
const here = (id) => bodyById(id, bodies);

const toast = createToast($('toast'));
const sound = createSound();
const canvas = $('space');

// Call after every change to the log: saves it and shows the score. Returns true
// when this change filled in the last record, so the caller can celebrate after
// showing what was just achieved.
function progressChanged(before) {
  saveProgress(progress);
  const now = summarize(progress, BODIES, MISSIONS);
  const { done, total } = score(now);
  $('journalButton').textContent = `수첩 ${done}/${total}`;
  return Boolean(before) && !isComplete(summarize(before, BODIES, MISSIONS)) && isComplete(now);
}

function celebrate() {
  sound.cue('complete');
  toast.show('태양계 탐험을 모두 마쳤습니다. 수첩이 가득 찼습니다!');
}

function setPaused(value) {
  paused = value;
  input?.clear();
  $('pauseButton').textContent = paused ? '비행 계속' : '일시 정지';
}

function brake() {
  input.clear();
  if (totalSpeed(state) > 0) sound.cue('brake');
  state = stopNow(state);
  toast.show('정지했습니다. 주변을 둘러보세요.');
}

let input;
let photo;
let world;

async function init() {
  try {
    world = await createWorld(canvas);
  } catch (e) {
    console.error(e);
    $('loadError').textContent = `${e.message} 최신 Chrome이나 Edge에서 하드웨어 가속을 켜고 다시 열어 주세요.`;
    return;
  }

  input = createInput({
    canvas,
    onDrag(dx, dy) {
      if (photo.active()) photo.rotate(dx, dy);
      else if (!paused) {
        state = { ...state, orientation: rotateLocal(state.orientation, dx, dy) };
        dragTurn[0] += dx;
        dragTurn[1] += dy;
      }
    },
    onBrake: brake,
    onTogglePhoto: () => photo.toggle(),
    onJournal: () => journal.open(),
    onMute: () => toggleSound(),
    onEscape: () => (photo.active() ? photo.toggle() : setPaused(!paused)),
    onWheel: (deltaY) => photo.zoom(deltaY),
    isBlocked: () => $('help').open || $('journal').open,
  });
  photo = createPhoto({
    world,
    canvas,
    toast,
    setPaused,
    isPaused: () => paused,
    clearInput: () => input.clear(),
    // shot: the camera as it was when the button was pressed (photo.js snapshots it).
    onCaptured(shot) {
      const done = completedMissions({
        position: state.position,
        orientation: multiply(state.orientation, shot.orientation),
        fovY: shot.fov,
        aspect: shot.aspect,
        heroVisible: shot.heroVisible,
        bodies,
      });
      const before = progress;
      const result = recordPhotos(progress, done);
      if (!result.newly.length) return;
      progress = result.progress;
      const finished = progressChanged(before);
      for (const id of result.newly) {
        const event = { type: 'photo', missionName: MISSIONS.find((mm) => mm.id === id).name };
        toast.show(eventMessage(event));
        sound.cue(cueForEvent(event));
      }
      if (finished) celebrate();
    },
  });

  function selectBody(id) {
    selectedId = id;
    hud.showSelection(bodyById(id));
  }

  const hud = createHud(BODIES, {
    onSelect: selectBody,
    onFace() {
      const body = here(selectedId);
      const direction = body.position.map((n, i) => n - state.position[i]);
      state = { ...state, orientation: lookAtDirection(direction) };
      toast.show(hud.faceToast(body));
    },
    onInspect() {
      const body = here(selectedId);
      const direction = body.position.map((n, i) => n - state.position[i]);
      const distance = Math.hypot(...direction);
      const diameterDeg = (2 * Math.asin(Math.min(1, body.radiusKm / distance)) * 180) / Math.PI;
      // Aim only the photo camera, relative to the body: the flight heading and any
      // coast in progress stay as they were when photo mode closes.
      photo.frame(diameterDeg * 1.4, multiply(conjugate(state.orientation), lookAtDirection(direction)));
    },
  });
  hud.showSelection(bodyById(selectedId));
  const minimap = createMinimap($('minimap'), { onPick: selectBody });

  let journalPriorPause = false;
  const journal = createJournal({
    bodies: BODIES,
    missions: MISSIONS,
    onOpen() {
      journalPriorPause = paused;
      setPaused(true);
    },
    onClose() {
      setPaused(journalPriorPause);
      // Time spent in the dialog (or a confirm box) is not a frame gap.
      previous = null;
    },
    onGo(id) {
      selectedId = id;
      hud.showSelection(bodyById(id));
      const body = here(id);
      state = { ...state, orientation: lookAtDirection(body.position.map((n, i) => n - state.position[i])) };
      toast.show(hud.faceToast(body));
    },
    onReset() {
      progress = createProgress();
      progressChanged(null);
      journal.update(progress, state.position, bodies);
      $('journal').close();
      toast.show('탐험 기록을 지웠습니다.');
    },
  });

  function showSoundButton() {
    $('soundButton').textContent = sound.muted() ? '🔇' : '🔊';
    $('soundButton').setAttribute('aria-label', sound.muted() ? '소리 켜기' : '소리 끄기');
  }
  function toggleSound() {
    sound.unlock();
    sound.setMuted(!sound.muted());
    showSoundButton();
  }
  showSoundButton();
  $('soundButton').addEventListener('click', toggleSound);
  // Audio may only start after a user gesture.
  for (const type of ['pointerdown', 'keydown']) {
    document.addEventListener(type, () => sound.unlock(), { capture: true });
  }
  $('capture').addEventListener('click', () => sound.cue('shutter'));

  $('brake').addEventListener('click', brake);
  $('pauseButton').addEventListener('click', () => setPaused(!paused));
  $('photoButton').addEventListener('click', () => photo.toggle());
  $('helpButton').addEventListener('click', () => {
    const prior = paused;
    setPaused(true);
    $('help').showModal();
    $('help').addEventListener('close', () => setPaused(prior), { once: true });
  });
  $('closeHelp').addEventListener('click', () => $('help').close());
  window.addEventListener('blur', () => {
    input.clear();
    if (!photo.active()) setPaused(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPaused(true);
  });
  window.addEventListener('resize', () => world.resize());
  if (matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0) document.body.classList.add('touch');

  $('loading').style.display = 'none';
  document.body.dataset.ready = 'true';
  toast.show(`${bodyById(selectedId).name} 근처에 도착했습니다. 드래그로 둘러보세요.`);
  progressChanged(null);
  if (score(summarize(progress, BODIES, MISSIONS)).done <= 2) {
    const how = document.body.classList.contains('touch') ? '수첩 버튼' : 'J 키나 수첩 버튼';
    toast.show(`${how}으로 탐험 목표를 확인하세요. 행성을 발견하고, 내려앉고, 사진 임무를 채워 보세요.`);
  }

  // The first frame uploads shaders and textures; count it as zero time so the
  // long-gap guard below does not pause the game before the player does anything.
  let previous = null;
  let frame = 0;
  world.engine.runRenderLoop(() => {
    const now = performance.now();
    const elapsed = previous === null ? 0 : (now - previous) / 1000;
    previous = now;
    // A suspended tab must never fast-forward the journey.
    if (elapsed > MAX_FRAME_GAP_S) setPaused(true);
    const dt = paused ? 0 : elapsed;

    // Advance the orbits, carry the traveler with a nearby body, then fly.
    if (dt > 0) {
      const before = bodies;
      simTime += dt * TIME_SCALE;
      bodies = bodiesAt(simTime);
      state = carryAlong(state, before, bodies);
    }
    const intent = input.intent();
    const result = step(state, intent, dt, bodies);
    state = result.state;
    const logged = updateProgress(progress, state, bodies);
    let finished = false;
    if (logged.events.length) {
      const before = progress;
      progress = logged.progress;
      finished = progressChanged(before);
    }
    for (const event of [...result.events, ...logged.events]) {
      const text = eventMessage(event, BODIES);
      if (text) toast.show(text);
      const cue = cueForEvent(event);
      if (cue) sound.cue(cue);
    }
    if (finished) celebrate();

    const turn = dt > 0
      // Sliding sideways leans the character like a gentle turn.
      ? [dragTurn[0] / dt + intent.turnX * TURN_RATE + intent.strafe * 0.6, dragTurn[1] / dt + intent.turnY * TURN_RATE]
      : [0, 0];
    dragTurn = [0, 0];

    const limit = speedLimit(nearestSurface(state.position, bodies).distance);
    sound.engine(engineSound({
      speed: paused ? 0 : totalSpeed(state),
      maxSpeed: limit,
      thrusting: !paused && input.driving(),
    }), elapsed || 1 / 60);

    const view = world.update({
      bodies,
      position: state.position,
      orientation: state.orientation,
      dt,
      speed: totalSpeed(state),
      photoOrientation: photo.orientation(),
      heroVisible: photo.heroVisible(),
      turn,
    });
    world.render();

    if (frame++ % HUD_EVERY_N_FRAMES !== 0) return;
    const selected = here(selectedId);
    const driving = input.driving();
    let flightLabel = '자유 비행';
    if (paused) flightLabel = '일시 정지';
    else if (state.restingOn) flightLabel = `${bodyById(state.restingOn).name} 표면`;
    else if (totalSpeed(state) < 0.01) flightLabel = '정지 비행';
    else if (!driving) flightLabel = '서서히 감속 중';
    else if (state.sideSpeed > state.speed) flightLabel = '옆으로 비행';
    else if (state.motionSign < 0) flightLabel = '후진 비행';
    journal.update(progress, state.position, bodies);
    hud.update({
      view,
      local: nearestLocalBody(state.position, bodies),
      selected,
      speed: totalSpeed(state),
      // Only forward/back motion can be 'backward'; a pure slide is not.
      motionSign: state.speed > 0.01 ? state.motionSign : 1,
      limitLabel: limitText(limit / C),
      flightLabel,
      throttle: input.throttle(),
      C,
    });
    minimap.draw({ bodies, position: state.position, heading: forward(state.orientation), selectedId });
  });

  // Read-only diagnostics for verification. No travel shortcuts.
  window.oddity = {
    getState: () => ({
      position: [...state.position],
      speed: totalSpeed(state),
      motionSign: state.motionSign,
      limitC: speedLimit(nearestSurface(state.position, bodies).distance) / C,
      restingOn: state.restingOn,
      simTime,
      moonFromEarth: Math.hypot(...here('moon').position.map((n, i) => n - here('earth').position[i])),
      moonPosition: [...here('moon').position],
      paused,
      photo: photo.active(),
      throttle: input.throttle(),
      fps: world.engine.getFps(),
    }),
  };
}

// Installable app: offline cache in production builds only (dev must always be fresh).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => console.warn('offline cache unavailable', e));
}

// Android Chrome offers an install prompt we can show from the help dialog.
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  $('installButton').hidden = false;
});
$('installButton').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('installButton').hidden = true;
});

init();
