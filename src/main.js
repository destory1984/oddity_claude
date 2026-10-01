import {
  BODIES, BODY_DATA, TIME_SCALE, placeBodies, bodyById, nearestSurface, nearestLocalBody,
} from './core/bodies.js';
import { C, speedLimit } from './core/flight.js';
import {
  createState, step, stopNow, totalSpeed, carryAlong, TURN_RATE, START_YAW,
} from './core/game.js';
import { rotateLocal, lookAtDirection, multiply, conjugate, forward } from './core/orientation.js';
import { CRAFT, craftAt, craftById } from './core/craft.js';
import { skyLabels } from './core/sky.js';
import { createWorld } from './render/world.js';
import { createInput } from './ui/input.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createPhoto } from './ui/photo.js';
import { createToast } from './ui/toast.js';
import { eventMessage, limitText, dateText } from './ui/messages.js';
import { MISSIONS, completedMissions } from './core/missions.js';
import {
  updateProgress, recordPhotos, recordStories, createProgress, summarize, score, isComplete,
} from './core/progress.js';
import { STORIES, storySitesAt, completedStories, siteHidden } from './core/stories.js';
import {
  loadProgress, saveProgress, loadGuideDone, saveGuideDone, loadLayout, saveLayout,
} from './ui/storage.js';
import { todayData, startAbove } from './core/ephemeris.js';
import { createGuide, updateGuide, skipGuide, guideGoal } from './core/guide.js';
import { createGuideView } from './ui/guide.js';
import { createJournal } from './ui/journal.js';
import { createSound } from './ui/sound.js';
import { cueForEvent, engineSound } from './core/audio.js';

const $ = (id) => document.getElementById(id);
const MAX_FRAME_GAP_S = 0.5;
const HUD_EVERY_N_FRAMES = 6;

// For tuning a planet's look: set to e.g. { id: 'jupiter', fromCentreKm: 400000 } to
// start beside it. null starts above Earth, where the first-visit guide begins.
const START_NEAR = null;

// Two layouts: 'tour' is the hand-made one (planets spread round the Sun); 'today' puts
// the planets where they really are on the day the game is opened.
const layout = loadLayout();
const openedAt = new Date();
const bodyData = layout === 'today' ? todayData(openedAt) : BODY_DATA;
const bodiesAt = (timeS) => placeBodies(bodyData, timeS);
let bodies = bodiesAt(0);

function startNear({ id, fromCentreKm }) {
  const body = bodyById(id, bodies);
  const sun = bodyById('sun', bodies);
  // On the sunlit side and a little above the planet's orbit, looking at it, far enough
  // that the whole disc fits in the view. (Planets move about 70 to 180 km/s on the game
  // clock, so it stays put for a long look.)
  const toSun = sun.position.map((n, i) => n - body.position[i]);
  const length = Math.hypot(...toSun);
  const out = [0.9 * toSun[0] / length, 0.9 * toSun[1] / length + 0.35, 0.9 * toSun[2] / length];
  const norm = Math.hypot(...out);
  const position = body.position.map((n, i) => n + (out[i] / norm) * fromCentreKm);
  return createState(position, lookAtDirection(body.position.map((n, i) => n - position[i])));
}

// Above Earth, facing it; a wide screen turns a little toward the Sun so Earth sits on
// the left and the Sun's edge on the right (a tall phone screen has no room for both).
function startAboveEarth() {
  const { position, forward: toEarth } = startAbove(bodies);
  const facing = lookAtDirection(toEarth);
  return createState(position, innerWidth / innerHeight < 1 ? facing : rotateLocal(facing, START_YAW, 0));
}

let state = START_NEAR ? startNear(START_NEAR) : startAboveEarth();
let paused = false;
let selectedId = START_NEAR ? START_NEAR.id : 'earth';
let dragTurn = [0, 0];
let progress = loadProgress(BODIES, MISSIONS, STORIES);
// Simulated seconds since the start; bodies orbit on this clock (TIME_SCALE x real time).
// The first-visit guide assumes the opening view above Earth.
let guide = createGuide(progress, loadGuideDone() || Boolean(START_NEAR));
let simTime = 0;
// The note on entering the asteroid belt shows once per visit to the game.
let beltSeen = false;
// Where a body is right now (BODIES is only the starting layout).
// Spacecraft and telescopes: found and selected like bodies, but they are not in the
// journal and only slow the traveler nearby (core/craft.js).
let craft = craftAt(0, bodies);
// Story places on a surface: named and selected like craft, turning with their body.
let sites = storySitesAt(0, bodies);
const here = (id) => bodyById(id, bodies) ?? craft.find((c) => c.id === id) ?? sites.find((s) => s.id === id);
const named = (id) => bodyById(id) ?? craftById(id) ?? sites.find((s) => s.id === id);

const toast = createToast($('toast'));
const sound = createSound();
const canvas = $('space');

// Call after every change to the log: saves it and shows the score. Returns true
// when this change filled in the last record, so the caller can celebrate after
// showing what was just achieved.
function progressChanged(before) {
  saveProgress(progress);
  const now = summarize(progress, BODIES, MISSIONS, STORIES);
  const { done, total } = score(now);
  $('journalButton').textContent = `수첩 ${done}/${total}`;
  return Boolean(before) && !isComplete(summarize(before, BODIES, MISSIONS, STORIES)) && isComplete(now);
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
    world = await createWorld(canvas, bodies);
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
        craft,
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
    hud.showSelection(named(id));
  }

  const hud = createHud([...BODIES, ...craft, ...sites], {
    skyLabels: skyLabels(),
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
  hud.showSelection(named(selectedId));
  const minimap = createMinimap($('minimap'), { onPick: selectBody });

  let journalPriorPause = false;
  const journal = createJournal({
    bodies: BODIES,
    missions: MISSIONS,
    stories: STORIES,
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
  // Switching the layout moves every planet, so the game starts over (the log is kept).
  $('layoutNow').textContent = layout === 'today' ? '지금: 오늘의 하늘(오늘 날짜의 실제 위치).' : '지금: 여행 배치(행성을 태양 둘레에 고루 흩어 놓음).';
  $('layoutButton').textContent = layout === 'today' ? '여행 배치로 바꾸기' : '오늘의 하늘로 바꾸기';
  $('layoutButton').addEventListener('click', () => {
    saveLayout(layout === 'today' ? 'tour' : 'today');
    location.reload();
  });
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
  const touch = document.body.classList.contains('touch');
  const journalHow = touch ? '수첩 버튼' : 'J 키나 수첩 버튼';
  const guideView = createGuideView({
    onSkip() {
      guide = skipGuide(guide);
      saveGuideDone();
      guideView.show(null);
      toast.show(`${journalHow}으로 탐험 목표를 확인하세요.`);
    },
  });
  guideView.show(guideGoal(guide, touch));

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
      craft = craftAt(simTime, bodies);
      sites = storySitesAt(simTime, bodies);
      state = carryAlong(state, before, bodies);
    }
    const intent = input.intent();
    const slowPoints = craft.map((c) => c.position);
    const result = step(state, intent, dt, bodies, slowPoints);
    state = result.state;
    const logged = updateProgress(progress, state, bodies);
    let finished = false;
    if (logged.events.length) {
      const before = progress;
      progress = logged.progress;
      finished = progressChanged(before);
    }
    const told = recordStories(progress, completedStories({
      position: state.position, restingOn: state.restingOn, bodies, craft, sites,
    }));
    const storyEvents = told.newly.map((id) => {
      const story = STORIES.find((s) => s.id === id);
      return { type: 'story', name: story.name, text: story.text };
    });
    if (told.newly.length) {
      const before = progress;
      progress = told.progress;
      finished = progressChanged(before) || finished;
    }
    for (const event of [...result.events, ...logged.events, ...storyEvents]) {
      const text = eventMessage(event, BODIES);
      if (text) toast.show(text);
      const cue = cueForEvent(event);
      if (cue) sound.cue(cue);
    }
    if (finished) celebrate();

    if (guide.step !== null) {
      guide = updateGuide(guide, {
        heading: forward(state.orientation),
        toMoon: here('moon').position.map((n, i) => n - state.position[i]),
        progress,
      });
      if (guide.finished) {
        saveGuideDone();
        toast.show(`첫 탐험을 마쳤습니다. ${journalHow}으로 다음 목적지를 고르세요.`);
      }
      guideView.show(guideGoal(guide, touch));
    }

    const turn = dt > 0
      // Sliding sideways leans the character like a gentle turn.
      ? [dragTurn[0] / dt + intent.turnX * TURN_RATE + intent.strafe * 0.6, dragTurn[1] / dt + intent.turnY * TURN_RATE]
      : [0, 0];
    dragTurn = [0, 0];

    const limit = speedLimit(Math.min(
      nearestSurface(state.position, bodies).distance,
      ...slowPoints.map((p) => Math.hypot(...p.map((n, i) => n - state.position[i]))),
    ));
    sound.engine(engineSound({
      speed: paused ? 0 : totalSpeed(state),
      maxSpeed: limit,
      thrusting: !paused && input.driving(),
    }), elapsed || 1 / 60);

    const view = world.update({
      bodies,
      craft,
      sites,
      position: state.position,
      orientation: state.orientation,
      dt,
      speed: totalSpeed(state),
      photoOrientation: photo.orientation(),
      heroVisible: photo.heroVisible(),
      turn,
    });
    if (view.ringCrossed) toast.show(`${bodyById(view.ringCrossed).name} 고리를 지났습니다. 얼음 알갱이가 흩날립니다.`);
    if (view.inBelt && !beltSeen) {
      beltSeen = true;
      toast.show(eventMessage({ type: 'beltEntered' }));
    }
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
    // In today's sky the game clock's date rides along with the flight state.
    if (layout === 'today') flightLabel += ` · ${dateText(new Date(openedAt.getTime() + simTime * 1000))}`;
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
      goalId: guideGoal(guide)?.targetId ?? null,
      // A place on the far side of its body gets no label.
      hiddenIds: sites.filter((s) => siteHidden(s, here(s.parent), state.position)).map((s) => s.id),
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
