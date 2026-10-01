import {
  BODIES, BODY_DATA, TIME_SCALE, placeBodies, bodyById, nearestSurface, nearestLocalBody, surfaceDistance, AU_KM,
} from './core/bodies.js';
import { C, speedLimit } from './core/flight.js';
import {
  createState, step, stopNow, totalSpeed, carryAlong, boostLift, velocity, TURN_RATE, START_YAW,
} from './core/game.js';
import {
  rotateLocal, lookAtDirection, multiply, conjugate, forward, rotateVector,
} from './core/orientation.js';
import { CRAFT, craftAt, craftById, hiddenCraft } from './core/craft.js';
import { skyLabels } from './core/sky.js';
import { createWorld } from './render/world.js';
import { createInput } from './ui/input.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createPhoto } from './ui/photo.js';
import { createToast } from './ui/toast.js';
import { createWarp } from './ui/warp.js';
import { slingshot } from './core/slingshot.js';
import { addPhoto, removePhoto } from './core/album.js';
import { teleportSpot } from './core/teleport.js';
import { eventMessage, limitText, dateText, withParticle } from './ui/messages.js';
import { MISSIONS, completedMissions } from './core/missions.js';
import {
  updateProgress, recordPhotos, recordStories, recordCraft, createProgress, summarize, score, isComplete,
} from './core/progress.js';
import { STORIES, storySitesAt, completedStories, siteHidden, siteFar } from './core/stories.js';
import {
  loadProgress, saveProgress, loadGuideDone, saveGuideDone, loadLayout, saveLayout, loadAlbum, saveAlbum,
  loadHeroKind, saveHeroKind,
} from './ui/storage.js';
import { todayData, startAbove } from './core/ephemeris.js';
import { createGuide, updateGuide, skipGuide, guideGoal } from './core/guide.js';
import { createGuideView } from './ui/guide.js';
import { createJournal } from './ui/journal.js';
import { createSound } from './ui/sound.js';
import { cueForEvent, engineSound } from './core/audio.js';
import { moodFor } from './core/music.js';
import {
  dockable, tooLowToDock, DOCK_RANGE_KM, dockedState, wantsToLeave, rideSpeed, startDocking, dockingOffset, countsBetween, isDocked, latchJolt,
  releaseDrift,
} from './core/dock.js';

const $ = (id) => document.getElementById(id);
const MAX_FRAME_GAP_S = 0.5;
// After a jump to a body the view is turned this far (radians) off it.
const VISTA_YAW = 0.3;
const HUD_EVERY_N_FRAMES = 6;

// For tuning a planet's look: set to e.g. { id: 'jupiter', fromCentreKm: 400000 } to
// start beside it. null starts above Earth, where the first-visit guide begins.
const START_NEAR = null;

// Two layouts: 'tour' is the hand-made one (planets spread round the Sun); 'today' puts
// the planets where they really are on the day the game is opened.
const layout = loadLayout();
// The character: the folded-paper model, or the pixel-art drawings on trial.
const heroKind = loadHeroKind();
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
let progress = loadProgress(BODIES, MISSIONS, STORIES, CRAFT);
// Small copies of saved photos, shown in the journal (core/album.js).
let album = loadAlbum(MISSIONS);
// Simulated seconds since the start; bodies orbit on this clock (TIME_SCALE x real time).
// The first-visit guide assumes the opening view above Earth.
let guide = createGuide(progress, loadGuideDone() || Boolean(START_NEAR));
let simTime = 0;
// The note on entering the asteroid belt shows once per visit to the game.
let beltSeen = false;
// So does the note on the first shooting star over Earth.
let meteorSeen = false;
// The fly-by of a planet in progress, watched for a slingshot (core/slingshot.js).
let pass = null;
// The craft the traveler is docked with, and the glide toward it (core/dock.js startDocking).
let docked = null;
// While docked, the speed shown is the craft's own (the traveler rides with it).
let rideKmS = 0;
// The craft's velocity this frame: what the traveler keeps on letting go.
let rideDrift = [0, 0, 0];
// Own speed when flying free, the craft's when docked: for the readout, the pose and the sound.
const shownSpeed = () => (docked ? rideKmS : totalSpeed(state));
// Where a body is right now (BODIES is only the starting layout).
// Spacecraft and telescopes: found and selected like bodies, but they are not in the
// journal and only slow the traveler nearby (core/craft.js).
let craft = craftAt(0, bodies);
// Story places on a surface: named and selected like craft, turning with their body.
let sites = storySitesAt(0, bodies);
const here = (id) => bodyById(id, bodies) ?? craft.find((c) => c.id === id) ?? sites.find((s) => s.id === id);
const named = (id) => bodyById(id) ?? craftById(id) ?? sites.find((s) => s.id === id);

const toast = createToast($('toast'));
const warp = createWarp($('warp'));
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

// Until when (performance.now()) the sprite character cheers a completed journal.
let cheerUntil = 0;
// The Sun's visibility last frame, for the sprite character shivering in a shadow.
let sunShown = 1;

function celebrate() {
  cheerUntil = performance.now() + 6000;
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
    world = await createWorld(canvas, bodies, { heroKind });
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
    onMusic: () => toggleMusic(),
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
      if (shot.thumb) {
        const local = nearestLocalBody(state.position, bodies);
        album = saveAlbum(addPhoto(album, {
          at: new Date().toISOString(),
          where: `${local.label} ${Math.round(local.altitude).toLocaleString('ko-KR')}km`,
          missions: done,
          image: shot.thumb,
        }));
        journal.setAlbum(album);
      }
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

  function announce(event) {
    toast.show(eventMessage(event));
    const cue = cueForEvent(event);
    if (cue) sound.cue(cue);
  }

  // The card beside the view while docked: when it went up and what it does.
  function showCraftCard(target) {
    $('craftCard').hidden = !target;
    if (!target) return;
    $('craftCardYear').textContent = `${target.launched}년 발사`;
    $('craftCardName').textContent = `${target.name} ${target.nameEn}`;
    $('craftCardIntro').textContent = target.intro;
  }

  function dock(target) {
    if (tooLowToDock(target, bodies)) {
      toast.show(eventMessage({ type: 'dockRefused', name: target.name }));
      return;
    }
    docked = startDocking(state.position, target);
    rideDrift = [0, 0, 0];
    showCraftCard(target);
    input.clear();
    announce({ type: 'docking', name: target.name });
    sound.say('Docking in progress.');
  }

  function undock() {
    const { name } = here(docked.id);
    const latched = isDocked(docked);
    docked = null;
    // Let go at the craft's speed, not at a standstill: the two fly on side by side.
    state = { ...state, drift: rideDrift };
    showCraftCard(null);
    sound.hush();
    announce({ type: latched ? 'undocked' : 'dockAborted', name });
  }

  // A place already visited, chosen from far away: appear there behind a flash. A body
  // is seen from its best side, a craft is docked with, a story place is seen from above.
  function teleport(id, anywhere = false) {
    if (warp.busy()) return;
    sound.cue('warp');
    warp.play(() => {
      const target = here(id);
      const spot = teleportSpot(target, { position: state.position, progress, bodies, parent: target.parent ? here(target.parent) : null, anywhere });
      if (!spot) return;
      if (docked) {
        docked = null;
        showCraftCard(null);
        sound.hush();
      }
      input.clear();
      const facing = lookAtDirection(target.position.map((n, i) => n - spot[i]));
      // The traveler stands in the middle of the view: on a wide screen turn a little
      // so a body sits beside them, not behind them.
      const aside = target.kind !== 'craft' && target.kind !== 'site' && innerWidth / innerHeight >= 1;
      state = createState(spot, aside ? rotateLocal(facing, VISTA_YAW, 0) : facing);
      toast.show(eventMessage({ type: 'teleported', name: target.name }));
      if (target.kind === 'craft' && !tooLowToDock(target, bodies)) dock(target);
    });
  }

  // Choosing a craft from close by docks with it; choosing somewhere already visited
  // from far away jumps there.
  function selectBody(id) {
    selectedId = id;
    hud.showSelection(named(id));
    if (paused || warp.busy()) return;
    const chosen = here(id);
    if (teleportSpot(chosen, { position: state.position, progress, bodies, parent: chosen.parent ? here(chosen.parent) : null })) {
      teleport(id);
      return;
    }
    const target = craft.find((c) => c.id === id);
    if (target && !docked && dockable(state.position, [target])) dock(target);
  }

  $('dockTarget').addEventListener('click', () => {
    if (docked) return undock();
    const target = dockable(state.position, craft);
    if (target) dock(target);
    return undefined;
  });

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
    craft: CRAFT,
    onDeletePhoto(index) {
      album = saveAlbum(removePhoto(album, index));
      return album;
    },
    // The journal's "순간 이동": jump there from anywhere.
    onJump(id) {
      selectedId = id;
      hud.showSelection(named(id));
      teleport(id, true);
    },
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
  journal.setAlbum(album);
  // Opened before the first frame, the journal still has something to show.
  journal.update(progress, state.position, bodies);

  function showSoundButton() {
    $('soundButton').textContent = sound.muted() ? '🔇' : '🔊';
    $('soundButton').setAttribute('aria-label', sound.muted() ? '효과음 켜기' : '효과음 끄기');
    $('soundButton').title = sound.muted() ? '효과음 꺼짐 (M)' : '효과음 켜짐 (M)';
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
  // Music has its own switch, in the top bar (and the same one in the help dialog).
  function showMusicButton() {
    const on = sound.musicOn();
    $('musicButton').textContent = on ? '배경 음악 끄기' : '배경 음악 켜기';
    $('bgmButton').classList.toggle('off', !on);
    $('bgmButton').setAttribute('aria-label', on ? '배경 음악 끄기' : '배경 음악 켜기');
    $('bgmButton').title = on ? '배경 음악 켜짐 (B)' : '배경 음악 꺼짐 (B)';
  }
  function toggleMusic() {
    sound.unlock();
    sound.setMusic(!sound.musicOn());
    showMusicButton();
  }
  showMusicButton();
  $('musicButton').addEventListener('click', toggleMusic);
  $('bgmButton').addEventListener('click', toggleMusic);
  $('tuneButton').addEventListener('click', () => {
    sound.unlock();
    toast.show(`다음 곡: ${sound.nextTune()}. ${sound.musicOn() ? '다음 마디부터 나옵니다.' : '배경 음악이 꺼져 있습니다.'}`, 'tune');
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
  // Switching the layout moves every planet, so the game starts over (the log is kept).
  $('layoutNow').textContent = layout === 'today' ? '지금: 오늘의 하늘(오늘 날짜의 실제 위치).' : '지금: 여행 배치(행성을 태양 둘레에 고루 흩어 놓음).';
  $('layoutButton').textContent = layout === 'today' ? '여행 배치로 바꾸기' : '오늘의 하늘로 바꾸기';
  $('heroNow').textContent = heroKind === 'sprite' ? '지금: 도트 그림(시험 중).' : '지금: 종이 인형.';
  $('heroButton').textContent = heroKind === 'sprite' ? '종이 인형으로 바꾸기' : '도트 그림으로 바꾸기';
  $('heroButton').addEventListener('click', () => {
    saveHeroKind(heroKind === 'sprite' ? 'model' : 'sprite');
    // Drop any ?hero= from the address, which would override the saved choice.
    location.href = location.pathname;
  });
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
      const craftBefore = craft;
      simTime += dt * TIME_SCALE;
      bodies = bodiesAt(simTime);
      craft = craftAt(simTime, bodies);
      if (docked) {
        rideKmS = rideSpeed(docked.id, craftBefore, craft, before, bodies, dt);
        rideDrift = releaseDrift(docked.id, craftBefore, craft, before, bodies, state.position, dt);
      }
      sites = storySitesAt(simTime, bodies);
      state = carryAlong(state, before, bodies);
    }
    const intent = input.intent();
    if (docked) {
      if (!paused && wantsToLeave(intent)) undock();
      else {
        // Count down aloud; on 0 the glide ends and the latch closes.
        const was = docked.elapsed;
        docked = { ...docked, elapsed: was + dt };
        for (const n of countsBetween(was, docked.elapsed)) {
          sound.say(String(n));
          if (n > 0) sound.cue('count');
        }
        if (isDocked(docked) && was < docked.elapsed && !isDocked({ elapsed: was })) announce({ type: 'docked', name: here(docked.id).name });
        state = dockedState(state, here(docked.id), dockingOffset(docked));
      }
    }
    const slowPoints = craft.map((c) => c.position);
    const result = step(state, intent, dt, bodies, slowPoints);
    state = result.state;
    // Flying fast past a planet flings the traveler off on the way out.
    const swing = docked ? { pass: null, flung: null } : slingshot(pass, state, bodies);
    pass = swing.pass;
    if (swing.flung) {
      state = swing.flung.state;
      result.events.push({ type: 'slingshot', bodyId: swing.flung.bodyId, factor: swing.flung.factor });
    }
    const logged = updateProgress(progress, state, bodies);
    let finished = false;
    if (logged.events.length) {
      const before = progress;
      progress = logged.progress;
      finished = progressChanged(before);
    }
    // Craft come within docking range of are remembered, so they can be jumped back to.
    const met = recordCraft(progress, craft.filter((c) => Math.hypot(...c.position.map((n, i) => n - state.position[i])) <= DOCK_RANGE_KM).map((c) => c.id));
    if (met.newly.length) {
      progress = met.progress;
      saveProgress(progress);
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
    )) * boostLift(state);
    sound.engine(engineSound({
      speed: paused ? 0 : shownSpeed(),
      maxSpeed: limit,
      thrusting: !paused && input.driving(),
      docked: Boolean(docked),
    }), elapsed || 1 / 60);
    sound.music(moodFor({ restingOn: state.restingOn, surfaceKm: nearestSurface(state.position, bodies).distance }));

    // Craft that circle a planet or a moon are drawn and named only from near it.
    const awayCraft = hiddenCraft(state.position, bodies, selectedId, craft);
    // The way she is really going when that is not where she faces: toward the craft
    // while gliding in to dock, or along a drift she is being carried on. In her own
    // frame (x right, y up, z ahead), for the sprite character's choice of drawing.
    let heading = null;
    const carried = docked && !isDocked(docked)
      ? here(docked.id).position.map((n, i) => n - state.position[i])
      : (!docked && state.speed < 0.01 && (state.sideSpeed ?? 0) < 0.01 ? velocity(state) : null);
    if (carried && Math.hypot(...carried) > 1) {
      const local = rotateVector(conjugate(state.orientation), carried);
      const length = Math.hypot(...local);
      heading = local.map((n) => n / length);
    }
    const view = world.update({
      bodies,
      craft,
      hiddenCraft: awayCraft,
      sites,
      jolt: docked ? { id: docked.id, ...latchJolt(docked) } : null,
      position: state.position,
      orientation: state.orientation,
      dt,
      speed: shownSpeed(),
      photoOrientation: photo.orientation(),
      heroVisible: photo.heroVisible(),
      turn,
      // For the sprite character: which way she is thrusting. Docked, she rides ahead.
      move: {
        drive: docked ? 1 : (state.speed > 0.01 ? state.motionSign : 0),
        strafe: docked ? 0 : ((state.sideSpeed ?? 0) > 0.01 ? state.sideSign : 0),
        held: Boolean(docked) && isDocked(docked),
        docking: Boolean(docked) && !isDocked(docked),
        heading,
        resting: Boolean(state.restingOn),
        boost: Boolean(state.boost),
        warp: warp.phase(),
        photo: photo.active() && photo.heroVisible(),
        cheer: performance.now() < cheerUntil,
        // Within a solar radius of the Sun's surface it is too bright to look; in a
        // planet's shadow, or out past Uranus, it is cold.
        bright: surfaceDistance(state.position, here('sun')) < here('sun').radiusKm,
        cold: sunShown < 0.05 || surfaceDistance(state.position, here('sun')) > 19 * AU_KM / 100,
      },
    });
    sunShown = view.sunVisibility;
    if (view.ringCrossed) toast.show(`${bodyById(view.ringCrossed).name} 고리를 지났습니다. 얼음 알갱이가 흩날립니다.`);
    if (view.meteorLit && !meteorSeen) {
      meteorSeen = true;
      toast.show(eventMessage({ type: 'meteor' }));
    }
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
    else if (docked && !isDocked(docked)) flightLabel = `${here(docked.id).name}에 도킹 중`;
    else if (docked) flightLabel = `${here(docked.id).name}${withParticle(here(docked.id).name)} 함께 비행`;
    else if (state.restingOn) flightLabel = `${bodyById(state.restingOn).name} 표면`;
    else if (shownSpeed() < 0.01) flightLabel = '정지 비행';
    else if (!driving) flightLabel = '관성 비행';
    else if (state.sideSpeed > state.speed) flightLabel = '옆으로 비행';
    else if (state.motionSign < 0) flightLabel = '후진 비행';
    journal.update(progress, state.position, bodies);
    const offer = docked ? null : dockable(state.position, craft);
    $('dockTarget').hidden = !docked && !offer;
    if (docked) $('dockTarget').textContent = '도킹 풀기';
    else if (offer) $('dockTarget').textContent = `${offer.name}에 도킹`;
    // In today's sky the game clock's date rides along with the flight state.
    if (layout === 'today') flightLabel += ` · ${dateText(new Date(openedAt.getTime() + simTime * 1000))}`;
    hud.update({
      view,
      local: nearestLocalBody(state.position, bodies),
      selected,
      speed: shownSpeed(),
      // Only forward/back motion can be 'backward'; a pure slide is not.
      motionSign: state.speed > 0.01 ? state.motionSign : 1,
      limitLabel: limitText(limit / C),
      flightLabel,
      throttle: input.throttle(),
      C,
      goalId: guideGoal(guide)?.targetId ?? null,
      // A place on the far side of its body, or seen from far away, gets no label.
      hiddenIds: [
        ...sites.filter((s) => siteHidden(s, here(s.parent), state.position) || (s.id !== selectedId && siteFar(here(s.parent), state.position))).map((s) => s.id),
        ...awayCraft,
      ],
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
