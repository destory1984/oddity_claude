import {
  BODIES, BODY_DATA, TIME_SCALE, placeBodies, bodyById, nearestSurface, nearestLocalBody, surfaceDistance, AU_KM,
} from './core/bodies.js';
import { C, speedLimit } from './core/flight.js';
import {
  createState, step, stopNow, totalSpeed, carryAlong, boostLift, velocity, TURN_RATE, START_YAW,
} from './core/game.js';
import {
  rotateLocal, lookAtDirection, multiply, conjugate, forward, rotateVector, orientationFrom,
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
import { addPhoto, removePhoto } from './core/album.js';
import { ratePhoto, dayOf, sendPostcard, arrivedReplies, replyFor } from './core/postcard.js';
import { teleportSpot } from './core/teleport.js';
import { behindBody } from './core/markers.js';
import { FACTS } from './core/facts.js';
import { eventMessage, limitText, dateText, withParticle } from './ui/messages.js';
import { MISSIONS, completedMissions } from './core/missions.js';
import {
  updateProgress, recordPhotos, recordStories, recordCraft, recordNote, recordQuiz, createProgress, summarize, score, isComplete,
} from './core/progress.js';
import { STORIES, storySitesAt, completedStories, siteHidden, siteFar } from './core/stories.js';
import {
  loadProgress, saveProgress, loadGuideDone, saveGuideDone, loadLayout, saveLayout, loadAlbum, saveAlbum,
  loadHeroKind, saveHeroKind, loadDaily, saveDaily, loadScreen, saveScreen,
} from './ui/storage.js';
import { todayData, startAbove } from './core/ephemeris.js';
import { createGuide, updateGuide, skipGuide, guideGoal } from './core/guide.js';
import { createGuideView } from './ui/guide.js';
import { createJournal } from './ui/journal.js';
import { createStoryCard } from './ui/storyCard.js';
import { createNoteCard } from './ui/noteCard.js';
import { createSay } from './ui/say.js';
import { dailyRequest, requestTarget, requestMet, recordDay, streak, lastWeek } from './core/daily.js';
import { palFor } from './core/pal.js';
import {
  LANDED, IDLE, AGAIN, IDLE_AFTER_S, IDLE_GAP_S, freshLine, milestoneLine,
} from './core/lines.js';
import {
  TOURS, tourById, stopName, stopTarget, currentStop, startTour, quitTour, stopReached, stopHint, advanceTour, allToursDone, stampFile, CRANE_FILE,
} from './core/tours.js';
import {
  NOTES, MEMOS, GREETINGS, dueNote, noteById, LAST_SLOT, lastSlotOpen, photoSlots,
} from './core/story.js';
import { createSound } from './ui/sound.js';
import { cueForEvent, engineSound } from './core/audio.js';
import { moodFor } from './core/music.js';
import {
  dockable, DOCK_RANGE_KM, dockedState, wantsToLeave, rideSpeed, startDocking, dockingOffset, countsBetween, isDocked, latchJolt,
  releaseDrift, dockingFacing,
} from './core/dock.js';
import { standSpot, startVisit, hasArrived, visitStep, landingCounts } from './core/visit.js';
import { spinOf } from './core/surface.js';

const $ = (id) => document.getElementById(id);
const MAX_FRAME_GAP_S = 0.5;
// After a jump to a body the view is turned this far (radians) off it.
const VISTA_YAW = 0.3;
const HUD_EVERY_N_FRAMES = 6;
// The sprite character shields her eyes within this far of the Sun's surface, and fans
// herself out to this many AU (distances between bodies are a hundredth of the real
// ones, so Mercury's orbit is 570,000 km from the surface).
const BRIGHT_KM = 200000;
const HOT_AU = 0.5;
// Looking round a target ("확대 관찰"): the view never comes closer to a surface than this.
const INSPECT_CLEAR_KM = 3;
// A note from grandmother comes out this many seconds of play after it falls due (the
// landing is seen first), and the next one no sooner than NOTE_GAP_S after it is put away.
const NOTE_AFTER_S = 2;
const NOTE_GAP_S = 20;

// How far off and how wide the view is when looking round a target: a body fills about
// two thirds of the view's height (Saturn stands back for its rings); a craft is drawn
// 30 km wide and a lander 6 km; a crater or a sea is seen from 500 km.
function inspectView(target) {
  if (target.kind === 'craft') return { distanceKm: 110, fovDeg: 30 };
  if (target.id === 'dokdo') return { distanceKm: 30, fovDeg: 40 };
  if (target.kind === 'site') return target.landmark ? { distanceKm: 500, fovDeg: 50 } : { distanceKm: 28, fovDeg: 28 };
  return { distanceKm: target.radiusKm * (target.id === 'saturn' ? 7 : 4), fovDeg: 44 };
}

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
let progress = loadProgress(BODIES, MISSIONS, STORIES, CRAFT, NOTES, TOURS);
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
// Lights and plumes already told about (core/glows.js).
const glowsTold = new Set();
let feelingTold = null;
// The craft the traveler is docked with, and the glide toward it (core/dock.js startDocking).
let docked = null;
// While docked, the speed shown is the craft's own (the traveler rides with it).
let rideKmS = 0;
// The craft's velocity this frame: what the traveler keeps on letting go.
let rideDrift = [0, 0, 0];
// Own speed when flying free, the craft's when docked: for the readout, the pose and the sound.
// Going down to stand beside a place on a surface (core/visit.js startVisit), and how
// fast the glide is carrying her.
let visit = null;
let visitKmS = 0;
const shownSpeed = () => (docked ? rideKmS : visit ? visitKmS : totalSpeed(state));
// Where a body is right now (BODIES is only the starting layout).
// Spacecraft and telescopes: found and selected like bodies, but they are not in the
// journal and only slow the traveler nearby (core/craft.js).
let craft = craftAt(0, bodies);
// Story places on a surface: named and selected like craft, turning with their body.
let sites = storySitesAt(0, bodies);
const here = (id) => bodyById(id, bodies) ?? craft.find((c) => c.id === id) ?? sites.find((s) => s.id === id);
const named = (id) => bodyById(id) ?? craftById(id) ?? sites.find((s) => s.id === id);

const toast = createToast($('toast'));
const say = createSay($('heroSay'));
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
  // The button shows a notebook icon and the count; its name says the rest.
  $('journalButton').textContent = `${done}/${total}`;
  $('journalButton').setAttribute('aria-label', `수첩 ${done}/${total}`);
  $('journalButton').title = '탐험 수첩 (J)';
  // Eighty, a hundred and twenty, a hundred and sixty slots: Seora counts aloud.
  const counted = before ? milestoneLine(score(summarize(before, BODIES, MISSIONS, STORIES)).done, done) : null;
  if (counted) say.show(counted);
  return Boolean(before) && !isComplete(summarize(before, BODIES, MISSIONS, STORIES)) && isComplete(now);
}

// How many journal slots are filled, out of how many.
const tally = () => score(summarize(progress, BODIES, MISSIONS, STORIES));
// Whether the last slot (the Pale Blue Dot) may be filled yet (core/story.js).
function lastOpen() {
  const { done, total } = tally();
  return lastSlotOpen(progress, done, total);
}

// Today's request (core/daily.js): fixed when the game is opened, from the date and
// from where she has been. `daily` keeps the days one was done.
const today = dayOf(openedAt);
const request = dailyRequest(today, progress);
let daily = loadDaily();
const requestDone = () => daily.days.includes(today);

// Until when (performance.now()) the sprite character cheers a completed journal.
let cheerUntil = 0;
// Until when she reads the note she has just put away, and sits beside a probe left alone.
let readUntil = 0;
let sitUntil = 0;
const READ_MS = 2000;
const SIT_MS = 4000;

// The stamp that comes down in the middle of the view when a tour is gone round.
// Notices of the moment are dropped when they could not come up in time (ui/toast.js):
// a count that is running, and things seen in passing.
const MOMENT_S = 3;
const SIGHT_S = 8;

function stampDown(file) {
  const fx = $('stampFx');
  fx.src = `${import.meta.env.BASE_URL}assets/${file}`;
  fx.classList.remove('on');
  // Reading the box restarts the animation when two stamps follow each other.
  fx.getBoundingClientRect();
  fx.classList.add('on');
}
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
  $('pauseButton').title = paused ? '비행 계속' : '일시 정지 (Esc)';
  $('pauseButton').classList.toggle('paused', paused);
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
    // A flight key pressed while paused flies on at once (not in photo mode, which is
    // paused on purpose, nor behind a story card).
    onMove() {
      if (paused && !photo.active() && !$('storyCard').open && !$('noteCard').open) setPaused(false);
    },
    onEscape: () => (photo.active() ? photo.toggle() : setPaused(!paused)),
    onWheel: (deltaY) => photo.zoom(deltaY),
    isBlocked: () => $('help').open || $('journal').open || $('noteCard').open,
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
      // Taken while looking round a target: the view was not where she is, so it goes
      // in the album but is not judged as a mission.
      if (shot.orbit) {
        if (shot.thumb) {
          album = saveAlbum(addPhoto(album, {
            at: new Date().toISOString(), where: `${here(shot.orbit.id).name} 확대 관찰`, missions: [], image: shot.thumb,
          }));
          journal.setAlbum(album);
        }
        return;
      }
      // The last slot is held back until the rest is done and she is far enough out.
      const slots = photoSlots(completedMissions({
        position: state.position,
        orientation: multiply(state.orientation, shot.orientation),
        fovY: shot.fov,
        aspect: shot.aspect,
        heroVisible: shot.heroVisible,
        bodies,
        craft,
      }), {
        open: lastOpen(),
        earthKm: Math.hypot(...here('earth').position.map((n, i) => n - state.position[i])),
        progress,
      });
      const done = slots.missions;
      // Today's request may be a photo of a body: the subject of this one.
      photoSubject = ratePhoto({
        position: state.position,
        orientation: multiply(state.orientation, shot.orientation),
        fovY: shot.fov,
        aspect: shot.aspect,
        heroVisible: shot.heroVisible,
        bodies,
      }).subject;
      if (shot.thumb) {
        const local = nearestLocalBody(state.position, bodies);
        // How it is framed: kept with the photo, for grandmother's stars if it is sent.
        const { stars, subject } = ratePhoto({
          position: state.position,
          orientation: multiply(state.orientation, shot.orientation),
          fovY: shot.fov,
          aspect: shot.aspect,
          heroVisible: shot.heroVisible,
          bodies,
        });
        album = saveAlbum(addPhoto(album, {
          at: new Date().toISOString(),
          where: `${local.label} ${Math.round(local.altitude).toLocaleString('ko-KR')}km`,
          missions: done,
          image: shot.thumb,
          rate: { stars, subject },
        }));
        journal.setAlbum(album);
      }
      const before = progress;
      const result = recordPhotos(progress, done);
      const told = recordStories(result.progress, slots.stories);
      if (slots.held === 'locked') toast.show('창백한 푸른 점은 수첩의 마지막 칸입니다. 나머지 칸을 모두 채우면 열립니다.');
      if (slots.held === 'near') toast.show('마지막 칸은 지구에서 6,000만km 넘게 떨어져서 찍어야 채워집니다.');
      if (!result.newly.length && !told.newly.length) return;
      progress = told.progress;
      const finished = progressChanged(before);
      for (const id of result.newly) {
        const event = { type: 'photo', missionName: MISSIONS.find((mm) => mm.id === id).name };
        toast.show(eventMessage(event));
        sound.cue(cueForEvent(event));
      }
      for (const id of told.newly) {
        const story = STORIES.find((s) => s.id === id);
        toast.show(eventMessage({ type: 'story', name: story.name, text: story.text }));
        say.show('저 점이 지구야? 진짜 작다.');
      }
      if (finished) celebrate();
    },
  });

  function announce(event, keepS) {
    toast.show(eventMessage(event), null, keepS);
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
    if (visit && !hasArrived(visit)) sound.hush();
    visit = null;
    docked = { ...startDocking(state.position, target, bodies), facing: state.orientation };
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

  // Where to stand beside a place on a surface right now.
  const standBeside = (id) => {
    const story = STORIES.find((s) => s.id === id);
    return standSpot(story, here(story.body), simTime, innerWidth / innerHeight < 0.75);
  };

  // A place whose name shows (near its body, this side of the horizon): glide down and
  // stand beside it.
  function goDownTo(place) {
    visit = startVisit(state, place.id, standBeside(place.id));
    visitKmS = 0;
    input.clear();
    announce({ type: 'visiting', name: place.name }, MOMENT_S);
    sound.say('Landing in progress.');
  }

  // What a target already in the journal is, in a sentence or two: a body's fact, a
  // craft's introduction, a place's story. null for somewhere not yet known.
  function aboutKnown(target) {
    if (target.kind === 'craft') return (progress.craft ?? []).includes(target.id) ? craftById(target.id).intro : null;
    if (target.kind === 'site') return progress.stories.includes(target.id) ? STORIES.find((s) => s.id === target.id).text : null;
    return progress.discovered.includes(target.id) ? FACTS[target.id] ?? null : null;
  }

  // A place already visited, chosen from far away: appear there behind a flash. A body
  // is seen from its best side, a craft is docked with, a story place is seen from above.
  function teleport(id, anywhere = false, known = false) {
    if (warp.busy()) return;
    sound.cue('warp');
    warp.play(() => {
      const target = here(id);
      const spot = teleportSpot(target, { position: state.position, progress, bodies, parent: target.parent ? here(target.parent) : null, anywhere, known, ringNormal: world.ringNormal(target.id) });
      if (!spot) return;
      if (docked) {
        docked = null;
        showCraftCard(null);
        sound.hush();
      }
      if (visit && !hasArrived(visit)) sound.hush();
      visit = null;
      input.clear();
      const facing = lookAtDirection(target.position.map((n, i) => n - spot[i]));
      // The traveler stands in the middle of the view: on a wide screen turn a little
      // so a body sits beside them, not behind them.
      const aside = target.kind !== 'craft' && target.kind !== 'site' && innerWidth / innerHeight >= 1;
      state = createState(spot, aside ? rotateLocal(facing, VISTA_YAW, 0) : facing);
      // On arrival, say what this is. A craft about to be docked with shows its card instead.
      const docking = target.kind === 'craft';
      // On a tour, a stop the jump alone does not reach says what is left to do.
      const leg = known ? currentStop(progress) : null;
      const todo = leg ? stopHint(leg.stop) : null;
      const about = todo ? `할 일: ${todo}` : docking ? null : aboutKnown(target);
      const arrived = eventMessage({ type: 'teleported', name: target.name });
      // A tour's jump: its notices replace one another (kind 'tour'), so word of the
      // stop reached is not kept waiting behind this one.
      toast.show(about ? `${arrived}\n${about}` : arrived, known ? 'tour' : null);
      if (docking) dock(target);
    });
  }

  // Where the view is while looking round a target (photo.orbit()): on a ball about the
  // target, facing it, and never under the ground. null when not looking round anything.
  function orbitEye() {
    const orbit = photo.orbit();
    if (!orbit) return null;
    const target = here(orbit.id);
    let centre = target.position;
    if (target.kind === 'site') {
      // The middle of what stands there, not the ground under it.
      const ground = here(target.parent);
      centre = centre.map((n, i) => n + ((n - ground.position[i]) / ground.radiusKm) * 2);
    }
    const ahead = forward(orbit.orientation);
    let position = centre.map((n, i) => n - ahead[i] * orbit.distanceKm);
    const { body, distance } = nearestSurface(position, bodies);
    if (body && body.id !== target.id && distance < INSPECT_CLEAR_KM) {
      const up = position.map((n, i) => n - body.position[i]);
      const height = Math.hypot(...up) || 1;
      position = body.position.map((n, i) => n + (up[i] / height) * (body.radiusKm + INSPECT_CLEAR_KM));
      return { position, orientation: lookAtDirection(centre.map((n, i) => n - position[i])) };
    }
    return { position, orientation: orbit.orientation };
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
    const place = sites.find((s) => s.id === id);
    if (place && !docked && visit?.id !== id
      && !siteHidden(place, here(place.parent), state.position) && !siteFar(here(place.parent), state.position)) goDownTo(place);
  }

  const onGround = () => Boolean(state.restingOn || visit);

  $('dockTarget').addEventListener('click', () => {
    if (docked) return undock();
    const target = onGround() ? null : dockable(state.position, craft);
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
      // Somewhere already known: say again what it is.
      const about = aboutKnown(body);
      toast.show(about ? `${hud.faceToast(body)}\n${about}` : hud.faceToast(body));
    },
    onInspect() {
      const body = here(selectedId);
      // The view goes close and circles the target; she herself stays where she is, so
      // the flight heading and any coast in progress are as they were when it closes.
      const toward = body.position.map((n, i) => n - state.position[i]);
      let facing = lookAtDirection(toward);
      if (body.kind === 'site') {
        // A place on the ground is first seen from the side she is on, 15 degrees above
        // its horizon, with its sky at the top of the view.
        const ground = here(body.parent);
        const up = body.position.map((n, i) => (n - ground.position[i]) / ground.radiusKm);
        const rise = toward.reduce((sum, n, i) => sum + n * up[i], 0);
        let level = toward.map((n, i) => n - up[i] * rise);
        if (Math.hypot(...level) < 1e-6) level = [up[1], -up[0], 0];
        const length = Math.hypot(...level);
        const tilt = (15 * Math.PI) / 180;
        facing = orientationFrom(level.map((n, i) => (n / length) * Math.cos(tilt) - up[i] * Math.sin(tilt)), up);
      }
      photo.orbitAround({ id: body.id, facing, ...inspectView(body) });
    },
  });
  hud.showSelection(named(selectedId));
  const minimap = createMinimap($('minimap'), { onPick: selectBody });

  // A word to a probe left alone (core/story.js GREETINGS): once per visit to the game.
  const greeted = new Set();
  function greet(id) {
    if (!GREETINGS[id] || greeted.has(id)) return false;
    greeted.add(id);
    say.show(GREETINGS[id]);
    // Beside one that stands on the ground she sits down a while.
    if (visit && hasArrived(visit) && visit.id === id) sitUntil = performance.now() + SIT_MS;
    return true;
  }
  // The place whose card opened on reaching it: greeted once the card is put away.
  let greetAfterCard = null;
  // The subject of a photo just saved, until the next frame has looked at it.
  let photoSubject = null;
  // Lines said in this visit to the game (core/lines.js): she does not repeat herself.
  const saidLines = new Set();
  function sayFresh(list) {
    const line = freshLine(list, saidLines);
    if (!line) return;
    saidLines.add(line);
    say.show(line);
  }
  // The card that is open came up on standing again beside a place already logged.
  let againAfterCard = false;
  // How long she has been coasting with nothing to do, and how long until she may speak again.
  let idleFor = 0;
  let idleQuiet = 0;
  // A tour's line held back while a story card is in the way.
  let sayAfterCard = null;
  // What else waits for the card to close (a finished tour's stamp and cheer).
  let afterCard = null;

  // The tour under way (core/tours.js): its next stop is chosen as the target, so its
  // name shows from anywhere; the goal line names it and offers a jump near it.
  function aimAtStop() {
    const now = currentStop(progress);
    if (!now) return;
    selectedId = stopTarget(now.stop);
    hud.showSelection(named(selectedId));
  }
  function tourGoal() {
    const now = currentStop(progress);
    if (!now) return null;
    return {
      count: `${now.step + 1}/${now.tour.stops.length}`,
      text: `${now.tour.name}: ${stopName(now.stop)}`,
      targetId: stopTarget(now.stop),
      jump: true,
    };
  }
  function beginTour(id) {
    // A tour takes over from the first-visit guide.
    if (guide.step !== null) {
      guide = skipGuide(guide);
      saveGuideDone();
    }
    progress = startTour(progress, id);
    saveProgress(progress);
    aimAtStop();
    const now = currentStop(progress);
    toast.show(`코스 "${now.tour.name}"을 시작합니다. 첫 곳은 ${stopName(now.stop)}입니다.\n화면 위의 "근처로"를 누르면 그 가까이로 순간 이동합니다.`, 'tour');
  }
  function endTour() {
    progress = quitTour(progress);
    saveProgress(progress);
    toast.show('코스를 그만두었습니다. 수첩의 코스 갈래에서 다시 떠날 수 있습니다.');
  }

  // The card at a story place; the game waits while it is open.
  let cardPriorPause = false;
  const storyCard = createStoryCard({
    isSolved: (id) => (progress.quiz ?? []).includes(id),
    onSolve(id) {
      progress = recordQuiz(progress, id);
      saveProgress(progress);
    },
    onOpen() {
      cardPriorPause = paused;
      setPaused(true);
      input.clear();
    },
    onClose() {
      setPaused(cardPriorPause);
      previous = null;
      // One line only: a tour's, else a word to a probe left alone, else "here again".
      if (sayAfterCard) say.show(sayAfterCard);
      else if (!(greetAfterCard && greet(greetAfterCard)) && againAfterCard) sayFresh(AGAIN);
      // Beside a probe left alone she sits down a while, whichever line it was.
      if (GREETINGS[greetAfterCard] && visit && hasArrived(visit) && visit.id === greetAfterCard) sitUntil = performance.now() + SIT_MS;
      // A tour finished here: its stamp and the cheer waited for the card to be put away.
      if (afterCard) afterCard();
      afterCard = null;
      sayAfterCard = null;
      greetAfterCard = null;
      againAfterCard = false;
    },
  });
  const showStory = (id) => storyCard.show(STORIES.find((s) => s.id === id));
  // The card for a place just reached opens a moment later, once she has come to rest
  // and the landing has played: { id, in: seconds of play still to wait }.
  let cardDue = null;
  const CARD_AFTER_S = 1.2;

  // Grandmother's notes (core/story.js): the game waits while one is open, and Seora
  // answers the first reading with a line of her own.
  let notePriorPause = false;
  let noteWait = 0;
  let noteDueId = null;
  const noteCard = createNoteCard({
    onOpen() {
      notePriorPause = paused;
      setPaused(true);
      input.clear();
    },
    onClose(note, first) {
      setPaused(notePriorPause);
      previous = null;
      if (!first) return;
      noteWait = NOTE_GAP_S;
      // The last line was spoken at the gate.
      if (!note.gate) say.show(note.line);
      // One of grandmother's notes (not a reply): she reads it over once more.
      if (note.id && !note.gate) readUntil = performance.now() + READ_MS;
    },
  });

  // Postcards answered since the last visit (core/postcard.js): grandmother's replies
  // are written into the album now and read out on one sheet, after any note.
  let repliesDue = arrivedReplies(album, dayOf(openedAt));
  function openReplies() {
    const texts = repliesDue.map((index, n) => replyFor(album[index], n + album.filter((e) => e.reply).length));
    album = saveAlbum(album.map((entry, i) => (repliesDue.includes(i) ? { ...entry, reply: texts[repliesDue.indexOf(i)] } : entry)));
    journal.setAlbum(album);
    const best = Math.max(...repliesDue.map((i) => album[i]?.rate?.stars ?? 0));
    const count = repliesDue.length;
    repliesDue = [];
    noteCard.show({
      image: 'mailbox.png',
      imageAlt: '아침의 대문 옆 나무 우편함. 우표와 소인이 찍힌 누런 봉투가 반쯤 나와 있다',
      scene: count > 1 ? `우편함에 할머니의 답장이 ${count}통 와 있다.` : '우편함에 할머니의 답장이 와 있다.',
      title: '서라에게',
      text: texts.join('\n\n'),
      button: '답장을 넣어 둔다',
      line: best === 3 ? '할머니가 별 세 개 주셨어!' : '답장 왔다! 또 보내야지.',
    });
  }
  // What Seora says when the journal closes after a postcard was sent from it.
  let sayAfterJournal = null;

  let journalPriorPause = false;
  const journal = createJournal({
    onSendPhoto(index) {
      album = saveAlbum(sendPostcard(album, index, dayOf(new Date())));
      sayAfterJournal = '할머니, 이거 보면 깜짝 놀랄걸.';
      return album;
    },
    // A card or a note opened from the journal: the journal's own closing comes after
    // (a dialog's close event is late), so what to go back to is what the journal found.
    onDetail(id) {
      showStory(id);
      cardPriorPause = journalPriorPause;
    },
    notes: NOTES,
    memos: MEMOS,
    daily: () => ({
      text: request.text,
      done: requestDone(),
      days: daily.days.length,
      streak: streak(daily, today),
      week: lastWeek(daily, today),
      go() {
        selectedId = requestTarget(request);
        hud.showSelection(named(selectedId));
        const target = here(selectedId);
        state = { ...state, orientation: lookAtDirection(target.position.map((n, i) => n - state.position[i])) };
        toast.show(hud.faceToast(target));
      },
    }),
    onTourStart: beginTour,
    onTourQuit: endTour,
    lastSlot: LAST_SLOT,
    lastShut: () => !lastOpen(),
    onNote(id) {
      noteCard.show(noteById(id), false);
      notePriorPause = journalPriorPause;
    },
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
      // Closed to show a card or a note: that one ends the wait.
      if (storyCard.isOpen() || noteCard.isOpen()) return;
      setPaused(journalPriorPause);
      if (sayAfterJournal) say.show(sayAfterJournal);
      sayAfterJournal = null;
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
    $('soundButton').classList.toggle('off', sound.muted());
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
  // On a PC the game is in a phone-shaped frame (src/shell.js) unless the wide view was
  // chosen; a phone has neither, and is not offered the switch.
  const inFrame = window.self !== window.top;
  const wideChosen = loadScreen() === 'wide';
  if (inFrame || wideChosen) {
    $('screenTerm').hidden = false;
    $('screenRow').hidden = false;
    $('screenNow').textContent = inFrame ? '지금: 휴대전화와 같은 세로 화면.' : '지금: 창을 가득 채운 넓은 화면.';
    $('screenButton').textContent = inFrame ? '넓은 화면으로 바꾸기' : '세로 화면으로 바꾸기';
    $('screenButton').addEventListener('click', () => {
      saveScreen(inFrame ? 'wide' : 'phone');
      window.top.location.reload();
    });
  }
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
  if (!requestDone()) toast.show(`오늘의 부탁: ${request.text}
수첩을 열면 다시 볼 수 있습니다.`);
  const touch = document.body.classList.contains('touch');
  const journalHow = touch ? '수첩 버튼' : 'J 키나 수첩 버튼';
  const guideView = createGuideView({
    onSkip() {
      // The same button ends a tour once the first-visit guide is over.
      if (guide.step === null) {
        endTour();
        return;
      }
      guide = skipGuide(guide);
      saveGuideDone();
      guideView.show(null);
      toast.show(`${journalHow}으로 탐험 목표를 확인하세요.`);
    },
    onJump() {
      const goal = tourGoal();
      if (goal && !paused) teleport(goal.targetId, true, true);
    },
  });
  // What the goal line points at: the guide's Moon, or a tour's next stop.
  const goalNow = () => (guide.step !== null ? guideGoal(guide, touch) : tourGoal());
  guideView.show(goalNow());
  if (guide.step === null) aimAtStop();

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
        if (isDocked(docked) && was < docked.elapsed && !isDocked({ elapsed: was })) {
          announce({ type: 'docked', name: here(docked.id).name });
          greet(docked.id);
        }
        state = dockedState(state, here(docked.id), dockingOffset(docked), bodies);
        // Turn aside on the way in, so the craft ends up beside her, not behind her.
        const facing = dt > 0 ? dockingFacing(docked, docked.facing, state.position, here(docked.id).position, innerWidth >= innerHeight) : null;
        if (facing) state = { ...state, orientation: facing };
      }
    }
    if (visit) {
      if (!paused && wantsToLeave(intent)) {
        // Called off part-way down: the count stops.
        if (!hasArrived(visit)) sound.hush();
        visit = null;
      } else if (dt > 0) {
        const place = here(visit.id);
        const from = state.position;
        // Count down aloud; she touches down as "zero" ends.
        for (const n of landingCounts(visit.elapsed, visit.elapsed + dt)) {
          sound.say(String(n));
          if (n > 0) sound.cue('count');
        }
        const went = visitStep(state, visit, dt, {
          spot: standBeside(visit.id),
          body: here(place.parent),
          spun: spinOf(place.parent, simTime) - spinOf(place.parent, simTime - dt * TIME_SCALE),
        });
        ({ state, visit } = went);
        visitKmS = hasArrived(visit) ? 0 : Math.hypot(...state.position.map((n, i) => n - from[i])) / dt;
        if (went.arrived) {
          toast.show(eventMessage({ type: 'visited', name: place.name }), null, SIGHT_S);
          sound.cue('landed');
          // Somewhere been before: the card again (a first visit opens it below).
          if (progress.stories.includes(place.id)) cardDue = { id: place.id, in: CARD_AFTER_S, again: true };
        }
      }
    }
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
    // Craft come within docking range of are remembered, so they can be jumped back to.
    const met = recordCraft(progress, craft.filter((c) => Math.hypot(...c.position.map((n, i) => n - state.position[i])) <= DOCK_RANGE_KM).map((c) => c.id));
    if (met.newly.length) {
      progress = met.progress;
      saveProgress(progress);
    }
    // The Pale Blue Dot is not logged by going far: it is the last slot, filled by a
    // photograph (photoSlots above).
    const storiesNow = completedStories({
      position: state.position, restingOn: state.restingOn, bodies, craft, sites,
    });
    const told = recordStories(progress, storiesNow.filter((id) => id !== LAST_SLOT));
    const storyEvents = told.newly.map((id) => {
      const story = STORIES.find((s) => s.id === id);
      return { type: 'story', name: story.name, text: story.text };
    });
    if (told.newly.length) {
      const before = progress;
      progress = told.progress;
      finished = progressChanged(before) || finished;
    }
    // A place reached for the first time opens its card, once she has settled.
    if (told.newly.length) cardDue = { id: told.newly[0], in: CARD_AFTER_S };
    // Today's request, done: a star for the day. (A photo is looked at once, while the
    // game is still stopped in photo mode.)
    if (!requestDone() && requestMet(request, { storiesNow, position: state.position, bodies, craft, photoSubject })) {
      daily = recordDay(daily, today);
      saveDaily(daily);
      const run = streak(daily, today);
      toast.show(`오늘의 부탁을 해냈습니다. 수첩에 별이 붙었습니다(해낸 날 ${daily.days.length}일${run > 1 ? `, ${run}일째 이어서` : ''}).`);
      say.show(run > 0 && run % 7 === 0 ? '일주일 내내 했어! 대단하지?' : '부탁 끝! 할머니 좋아하시겠다.');
      // Seven days running: a stamp of seven stars.
      if (run > 0 && run % 7 === 0) stampDown('notebook/stamp-week.png');
      sound.cue('discovered');
    }
    photoSubject = null;
    // A tour under way: at its next stop, Seora says her line and the tour moves on.
    const leg = guide.step === null ? currentStop(progress) : null;
    // Her line at a tour's stop is not talked over by the line for finding the body.
    let saidAtStop = false;
    if (leg && dt > 0 && stopReached(leg.stop, { storiesNow, position: state.position, bodies, craft })) {
      const moved = advanceTour(progress);
      progress = moved.progress;
      saveProgress(progress);
      if (cardDue) sayAfterCard = leg.stop.line;
      else say.show(leg.stop.line);
      saidAtStop = true;
      if (moved.finished) {
        const all = allToursDone(progress);
        const finish = () => {
          cheerUntil = performance.now() + 6000;
          sound.cue('complete');
          toast.show(`코스 "${leg.tour.name}"을 다 돌았습니다. 수첩의 코스 갈래에 도장이 찍혔습니다.`, 'tour');
          // Not under the white of a jump: the stamp waits until the flash has cleared.
          const after = warp.busy() ? 3600 : 0;
          setTimeout(() => stampDown(stampFile(leg.tour)), after);
          if (all) setTimeout(() => stampDown(CRANE_FILE), after + 2600);
          if (all) toast.show('아홉 길을 모두 돌았습니다. 수첩 사이에서 할머니가 접어 둔 종이학이 나왔습니다.');
        };
        // A story card is about to cover the view: celebrate once it is put away.
        if (cardDue) afterCard = finish;
        else finish();
      } else {
        aimAtStop();
        toast.show(`${leg.tour.name} ${leg.step + 1}/${leg.tour.stops.length}: ${stopName(leg.stop)}에 왔습니다. 다음은 ${stopName(currentStop(progress).stop)}입니다.`, 'tour');
      }
    }
    if (cardDue && dt > 0) {
      cardDue.in -= dt;
      if (cardDue.in <= 0) {
        greetAfterCard = cardDue.id;
        againAfterCard = Boolean(cardDue.again);
        showStory(cardDue.id);
        cardDue = null;
      }
    }
    for (const event of [...result.events, ...logged.events, ...storyEvents]) {
      const text = eventMessage(event, BODIES);
      if (text) toast.show(text);
      const cue = cueForEvent(event);
      if (cue) sound.cue(cue);
      // Somewhere new: Seora says her line (the same one the journal keeps).
      if (event.type === 'discovered' && MEMOS[event.bodyId] && !saidAtStop) say.show(MEMOS[event.bodyId].line);
      // A first landing: her line for standing there.
      if (event.type === 'landed' && LANDED[event.bodyId] && !saidAtStop) say.show(LANDED[event.bodyId]);
    }
    // Coasting a long while with nothing to do, she talks to herself.
    const coasting = dt > 0 && !input.driving() && !docked && !visit && !state.restingOn && totalSpeed(state) > 0.01;
    idleFor = coasting ? idleFor + dt : (dt > 0 ? 0 : idleFor);
    idleQuiet = Math.max(0, idleQuiet - dt);
    if (idleFor >= IDLE_AFTER_S && idleQuiet === 0) {
      sayFresh(IDLE);
      idleFor = 0;
      idleQuiet = IDLE_GAP_S;
    }
    if (finished) celebrate();

    // A note that has fallen due comes out once she is at rest from whatever she was
    // doing: not during a glide or a jump, nor on top of a story card.
    const filled = tally();
    const note = dueNote(progress, filled.done, filled.total);
    if (note?.id !== noteDueId) {
      noteDueId = note?.id ?? null;
      if (note) noteWait = Math.max(noteWait, NOTE_AFTER_S);
    }
    noteWait = Math.max(0, noteWait - dt);
    const calm = dt > 0 && noteWait === 0 && !cardDue && !storyCard.isOpen() && !warp.busy()
      && !(docked && !isDocked(docked)) && !(visit && !hasArrived(visit));
    if (note && calm) {
      progress = recordNote(progress, note.id);
      saveProgress(progress);
      noteCard.show(note);
    } else if (!note && calm && repliesDue.length) {
      openReplies();
    }

    if (guide.step !== null) {
      guide = updateGuide(guide, {
        heading: forward(state.orientation),
        toMoon: here('moon').position.map((n, i) => n - state.position[i]),
        progress,
      });
      if (guide.finished) {
        saveGuideDone();
        toast.show(`첫 탐험을 마쳤습니다. ${journalHow}을 열고 코스 갈래에서 "${tourById('firstSteps').name}"을 골라 보세요.`);
      }
    }
    guideView.show(goalNow());

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
    const gliding = visit && !hasArrived(visit);
    const carried = docked && !isDocked(docked)
      ? here(docked.id).position.map((n, i) => n - state.position[i])
      : gliding ? standBeside(visit.id).position.map((n, i) => n - state.position[i])
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
      seen: orbitEye(),
      heroVisible: photo.heroVisible(),
      turn,
      // For the sprite character: which way she is thrusting. Docked, she rides ahead.
      move: {
        drive: docked ? 1 : (state.speed > 0.01 ? state.motionSign : 0),
        strafe: docked ? 0 : ((state.sideSpeed ?? 0) > 0.01 ? state.sideSign : 0),
        held: Boolean(docked) && isDocked(docked),
        docking: Boolean(docked) && !isDocked(docked),
        landing: Boolean(gliding),
        heading,
        resting: Boolean(state.restingOn),
        boost: Boolean(state.boost),
        warp: warp.phase(),
        photo: photo.active() && photo.heroVisible(),
        cheer: performance.now() < cheerUntil,
        // The companion earned last (core/pal.js); drawn beside the sprite character only.
        pal: palFor({ ...tally(), allTours: allToursDone(progress) }),
        read: performance.now() < readUntil,
        // Getting up as soon as she moves off.
        sit: performance.now() < sitUntil && Boolean(visit) && hasArrived(visit),
        // The sitting drawing looks to her right: turned over when the probe is on her left.
        mirror: Boolean(visit) && rotateVector(conjugate(state.orientation), here(visit.id).position.map((n, i) => n - state.position[i]))[0] < 0,
        // Close over the Sun's surface it is too bright to look; out to half an AU in
        // full sunlight it is hot; in a planet's shadow, or out past Uranus, it is cold.
        bright: surfaceDistance(state.position, here('sun')) < BRIGHT_KM,
        hot: sunShown > 0.5 && surfaceDistance(state.position, here('sun')) < HOT_AU * AU_KM / 100,
        cold: sunShown < 0.05 || surfaceDistance(state.position, here('sun')) > 19 * AU_KM / 100,
      },
    });
    sunShown = view.sunVisibility;
    hud.maskHero(view.heroCard);
    say.place(view.heroCard);
    if (view.ringCrossed) toast.show(`${bodyById(view.ringCrossed).name} 고리를 지났습니다. 얼음 알갱이가 흩날립니다.`, null, SIGHT_S);
    if (view.meteorLit && !meteorSeen) {
      meteorSeen = true;
      toast.show(eventMessage({ type: 'meteor' }), null, SIGHT_S);
    }
    // Say why she shivers or shields her eyes: once each time she comes into the cold
    // or the glare, at the first such drawing.
    const sunKm = surfaceDistance(state.position, here('sun'));
    let feeling = null;
    if (view.heroSheet === 'hurt-bright') feeling = { type: 'tooBright' };
    else if (view.heroSheet === 'hot' || view.heroSheet === 'hot-wipe') feeling = { type: 'hot', au: sunKm * 100 / AU_KM };
    else if (view.heroSheet === 'cold') feeling = sunKm > 19 * AU_KM / 100 ? { type: 'coldFar', au: sunKm * 100 / AU_KM } : { type: 'coldShadow' };
    if (feeling && feelingTold !== feeling.type) {
      feelingTold = feeling.type;
      toast.show(eventMessage(feeling), null, SIGHT_S);
    }
    if (!docked && shownSpeed() > 1) feelingTold = null;
    if (view.glow && !glowsTold.has(view.glow)) {
      glowsTold.add(view.glow);
      toast.show(eventMessage({ type: 'glow', id: view.glow }), null, SIGHT_S);
    }
    if (view.inBelt && !beltSeen) {
      beltSeen = true;
      toast.show(eventMessage({ type: 'beltEntered' }), null, SIGHT_S);
    }
    world.render();

    if (frame++ % HUD_EVERY_N_FRAMES !== 0) return;
    const selected = here(selectedId);
    const driving = input.driving();
    let flightLabel = '자유 비행';
    if (paused) flightLabel = '일시 정지';
    else if (docked && !isDocked(docked)) flightLabel = `${here(docked.id).name}에 도킹 중`;
    else if (docked) flightLabel = `${here(docked.id).name}${withParticle(here(docked.id).name)} 함께 비행`;
    else if (visit && !hasArrived(visit)) flightLabel = `${here(visit.id).name}에 착륙 중`;
    else if (visit) flightLabel = `${here(visit.id).name} 곁`;
    else if (state.restingOn) flightLabel = `${bodyById(state.restingOn).name} 표면`;
    else if (shownSpeed() < 0.01) flightLabel = '정지 비행';
    else if (!driving) flightLabel = '관성 비행';
    else if (state.sideSpeed > state.speed) flightLabel = '옆으로 비행';
    else if (state.motionSign < 0) flightLabel = '후진 비행';
    journal.update(progress, state.position, bodies);
    // Not while she stands on the ground or is going down to a place: the station
    // passing overhead put a docking button over a launch pad. (Its name tag still docks.)
    const offer = docked || onGround() ? null : dockable(state.position, craft);
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
      goalId: goalNow()?.targetId ?? null,
      // A place on the far side of its body, or seen from far away, gets no label.
      knownIds: new Set([...progress.discovered, ...(progress.craft ?? []), ...progress.stories]),
      hiddenIds: [
        ...sites.filter((s) => siteHidden(s, here(s.parent), state.position) || (s.id !== selectedId && siteFar(here(s.parent), state.position))).map((s) => s.id),
        ...awayCraft,
        // Whatever is behind a planet or a moon cannot be seen and gets no label (the
        // Sun says "가려짐" itself; the chosen target and the guide's goal stay).
        ...[...bodies, ...craft]
          .filter((t) => t.kind !== 'star' && t.id !== selectedId && t.id !== goalNow()?.targetId && behindBody(t, state.position, bodies))
          .map((t) => t.id),
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
