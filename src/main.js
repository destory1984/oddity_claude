import { BODIES, START_POSITION, bodyById, surfaceDistance, nearestLocalBody } from './core/bodies.js';
import { C, ZONES } from './core/flight.js';
import { createState, step, stopNow, TURN_RATE } from './core/game.js';
import { rotateLocal, lookAtDirection, multiply, conjugate } from './core/orientation.js';
import { createWorld } from './render/world.js';
import { createInput } from './ui/input.js';
import { createHud } from './ui/hud.js';
import { createPhoto } from './ui/photo.js';
import { createToast } from './ui/toast.js';
import { eventMessage, routeText } from './ui/messages.js';
import { MISSIONS, completedMissions } from './core/missions.js';
import { updateProgress, recordPhotos, createProgress, summarize, score, isComplete } from './core/progress.js';
import { estimateTravelSeconds } from './core/eta.js';
import { loadProgress, saveProgress } from './ui/storage.js';
import { createJournal } from './ui/journal.js';

const $ = (id) => document.getElementById(id);
const MAX_FRAME_GAP_S = 0.5;
const HUD_EVERY_N_FRAMES = 6;
const ROUTE_EVERY_MS = 1000;

let state = createState(START_POSITION);
let paused = false;
let selectedId = 'earth';
let dragTurn = [0, 0];
let progress = loadProgress(BODIES, MISSIONS);
let route = null;
let routeAt = 0;

const toast = createToast($('toast'));
const canvas = $('space');

// Call after every change to the log: saves it, shows the score, and celebrates once
// when the last record is filled in.
function progressChanged(before) {
  saveProgress(progress);
  const now = summarize(progress, BODIES, MISSIONS);
  const { done, total } = score(now);
  $('journalButton').textContent = `수첩 ${done}/${total}`;
  if (before && !isComplete(summarize(before, BODIES, MISSIONS)) && isComplete(now)) {
    toast.show('태양계 탐험을 모두 마쳤습니다. 수첩이 가득 찼습니다!');
  }
}

function setPaused(value) {
  paused = value;
  input?.clear();
  $('pauseButton').textContent = paused ? '비행 계속' : '일시 정지';
}

function brake() {
  input.clear();
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
    onCaptured() {
      const done = completedMissions({
        position: state.position,
        orientation: multiply(state.orientation, photo.orientation() || [0, 0, 0, 1]),
        fovY: world.fov(),
        aspect: canvas.width / canvas.height,
        heroVisible: photo.heroVisible(),
        bodies: BODIES,
      });
      const before = progress;
      const result = recordPhotos(progress, done);
      progress = result.progress;
      if (result.newly.length) progressChanged(before);
      for (const id of result.newly) {
        toast.show(eventMessage({ type: 'photo', missionName: MISSIONS.find((mm) => mm.id === id).name }));
      }
    },
  });

  const hud = createHud(BODIES, {
    onSelect(id) {
      selectedId = id;
      routeAt = 0;
      hud.showSelection(bodyById(id));
    },
    onFace() {
      const body = bodyById(selectedId);
      const direction = body.position.map((n, i) => n - state.position[i]);
      state = { ...state, orientation: lookAtDirection(direction) };
      toast.show(hud.faceToast(body));
    },
    onInspect() {
      const body = bodyById(selectedId);
      const direction = body.position.map((n, i) => n - state.position[i]);
      const distance = Math.hypot(...direction);
      const diameterDeg = (2 * Math.asin(Math.min(1, body.radiusKm / distance)) * 180) / Math.PI;
      // Aim only the photo camera, relative to the body: the flight heading and any
      // coast in progress stay as they were when photo mode closes.
      photo.frame(diameterDeg * 1.4, multiply(conjugate(state.orientation), lookAtDirection(direction)));
    },
  });
  hud.showSelection(bodyById(selectedId));

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
    },
    onGo(id) {
      selectedId = id;
      hud.showSelection(bodyById(id));
      const body = bodyById(id);
      state = { ...state, orientation: lookAtDirection(body.position.map((n, i) => n - state.position[i])) };
      routeAt = 0;
      toast.show(hud.faceToast(body));
    },
    onReset() {
      progress = createProgress();
      progressChanged(null);
      journal.update(progress, state.position);
      $('journal').close();
      toast.show('탐험 기록을 지웠습니다.');
    },
  });

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
  toast.show('지구 근처에 도착했습니다. 드래그로 둘러보세요.');
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

    const intent = input.intent();
    const result = step(state, intent, dt);
    state = result.state;
    const logged = updateProgress(progress, state, BODIES);
    if (logged.events.length) {
      const before = progress;
      progress = logged.progress;
      progressChanged(before);
    }
    for (const event of [...result.events, ...logged.events]) {
      const text = eventMessage(event, BODIES);
      if (text) toast.show(text);
    }

    const turn = dt > 0
      ? [dragTurn[0] / dt + intent.turnX * TURN_RATE, dragTurn[1] / dt + intent.turnY * TURN_RATE]
      : [0, 0];
    dragTurn = [0, 0];

    const view = world.update({
      position: state.position,
      orientation: state.orientation,
      dt,
      speed: state.speed,
      photoOrientation: photo.orientation(),
      heroVisible: photo.heroVisible(),
      turn,
    });
    world.render();

    if (frame++ % HUD_EVERY_N_FRAMES !== 0) return;
    const selected = bodyById(selectedId);
    const driving = input.driving();
    let flightLabel = '자유 비행';
    if (paused) flightLabel = '일시 정지';
    else if (state.restingOn) flightLabel = `${bodyById(state.restingOn).name} 표면`;
    else if (state.speed < 0.01) flightLabel = '정지 비행';
    else if (!driving) flightLabel = '서서히 감속 중';
    else if (state.motionSign < 0) flightLabel = '후진 비행';
    if (now - routeAt > ROUTE_EVERY_MS) {
      route = estimateTravelSeconds(state, selectedId, BODIES);
      routeAt = now;
    }
    journal.update(progress, state.position);
    hud.update({
      route: routeText(route, BODIES),
      view,
      local: nearestLocalBody(state.position),
      selected,
      selectedDistance: surfaceDistance(state.position, selected),
      speed: state.speed,
      motionSign: state.motionSign,
      zoneLabel: ZONES[state.zoneId].label,
      flightLabel,
      throttle: input.throttle(),
      C,
    });
  });

  // Read-only diagnostics for verification. No travel shortcuts.
  window.oddity = {
    getState: () => ({
      position: [...state.position],
      speed: state.speed,
      motionSign: state.motionSign,
      zoneId: state.zoneId,
      restingOn: state.restingOn,
      paused,
      photo: photo.active(),
      throttle: input.throttle(),
      fps: world.engine.getFps(),
    }),
  };
}

init();
