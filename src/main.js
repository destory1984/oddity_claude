import {
  BODIES, BODY_DATA, TIME_SCALE, placeBodies, bodyById, nearestSurface, nearestLocalBody, surfaceDistance, AU_KM,
} from './core/bodies.js';
import { C, speedLimit } from './core/flight.js';
import {
  createState, step, stopNow, totalSpeed, carryAlong, boostLift, velocity, TURN_RATE, START_YAW, keepRange, slideCap,
} from './core/game.js';
import {
  rotateLocal, lookAtDirection, multiply, conjugate, forward, rotateVector, orientationFrom, REAR_VIEW, rearTurn, right, swingToward,
} from './core/orientation.js';
import { CRAFT, craftAt, craftById, hiddenCraft, craftPicture } from './core/craft.js';
import { skyLabels } from './core/sky.js';
import { createWorld } from './render/world.js';
import { createInput } from './ui/input.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createPhoto } from './ui/photo.js';
import { createToast } from './ui/toast.js';
import { createBackKey } from './ui/backKey.js';
import { createWarp } from './ui/warp.js';
import { addPhoto, removePhoto, photoPlace, photoCaption } from './core/album.js';
import { ratePhoto, dayOf, sendPostcard, arrivedReplies, replyFor, cardPlace } from './core/postcard.js';
import { isLocalHost } from './core/count.js';
import { pickSpot, fromSpot, toSpot } from './core/startSpots.js';
import { teleportSpot } from './core/teleport.js';
import { behindBody, lostInGlare, nearestBodies, nearbyMoons } from './core/markers.js';
import { FACTS } from './core/facts.js';
import { eventMessage, limitText, dateText, withParticle, objectParticle, distanceText } from './ui/messages.js';
import { MISSIONS, completedMissions } from './core/missions.js';
import {
  updateProgress, recordPhotos, recordStories, recordCraft, recordNote, recordQuiz, createProgress, summarize, score, isComplete,
} from './core/progress.js';
import { STORIES, storySitesAt, completedStories, siteHidden, siteFar } from './core/stories.js';
import {
  loadProgress, saveProgress, loadGuideDone, saveGuideDone, loadLayout, saveLayout, loadAlbum, saveAlbum,
  loadDaily, saveDaily, loadTold, saveTold, loadScreen, saveScreen, saveResume, takeResume, loadStunts, saveStunts, loadFeel, saveFeel, loadExo, saveExo, loadEclipses, saveEclipses,
} from './ui/storage.js';
import { todayData, startAbove } from './core/ephemeris.js';
import { createGuide, updateGuide, skipGuide, guideGoal } from './core/guide.js';
import { createGuideView } from './ui/guide.js';
import { createJournal } from './ui/journal.js';
import { createStoryCard } from './ui/storyCard.js';
import { createNoteCard } from './ui/noteCard.js';
import { createSay } from './ui/say.js';
import { skyNews, newsLine } from './core/forecast.js';
import { createSettings } from './ui/settings.js';
import { createLookBack } from './ui/lookBack.js';
import { createPair } from './ui/pair.js';
import { feelFovDeg, easeFovDeg, streakAmount, BASE_FOV_DEG } from './core/speedFeel.js';
import { famousFor } from './core/famous.js';
import { bindTextSize } from './ui/textSize.js';
import { shadowSpot } from './core/shadows.js';
import { dailyRequest, requestTarget, requestMet, recordDay, streak, lastWeek } from './core/daily.js';
import { palFor } from './core/pal.js';
import { seeFor, SEE_S } from './core/sprite.js';
import {
  LANDED, IDLE, AGAIN, IDLE_AFTER_S, IDLE_GAP_S, freshLine, milestoneLine,
  NEAR, NEAR_RADII, DEEP, DEEP_FROM_KM, REAR, PHOTO, JUMP, DOCK, SIGHTS, fastLine,
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
  releaseDrift, dockingFacing, DOCK_SECONDS,
} from './core/dock.js';
import { inspectLight } from './core/lamp.js';
import { READINGS, bodyFacts } from './core/readings.js';
import { readingQuizFor, readingKey } from './core/readingQuiz.js';
import { STUNTS, startStunt, stepStunt, stuntStatus, recordStunt, recordText, valueText, stuntById } from './core/stunts.js';
import { STORY_DETAILS } from './core/storyDetails.js';
import { STORY_MORE } from './core/storyMore.js';
import { replayFor, replayFrame, replayOn } from './core/replay.js';
import { EXO_STAR, EXO_PLANETS, EXO_IDS, exoBodiesAt, inExo, exoArrival, recordExo, exoNote } from './core/exo.js';
import { createInspectInfo } from './ui/inspectInfo.js';
import { standSpot, startVisit, hasArrived, visitStep, landingCounts } from './core/visit.js';
import { spinOf, spinAngle, SPIN_DAY_S, EARTH_START_SPIN } from './core/surface.js';
import {
  eclipseNow, eclipseNews, eclipseTitle, eclipseDayText, eclipseSpot, canWatch, showFrame, stagedMoon, stagedNote,
} from './core/eclipses.js';
import { t } from './core/i18n.js';

const $ = (id) => document.getElementById(id);
const MAX_FRAME_GAP_S = 0.5;
// After a jump to a body the view is turned this far (radians) off it.
const VISTA_YAW = 0.3;
// Turned to face a target (바라보기, 목표 고정, the big map), the view is tipped down by
// this much, 15 degrees, so the target stands over her head: square on, it sat in the
// very middle of the view, behind her ("소라의 머리가 그걸 막게 되어서 움직이기 불편해").
const AIM_OVER = 0.26;
const faceToward = (toward) => rotateLocal(lookAtDirection(toward), 0, AIM_OVER);
// The line of the view, in its own axes, that a faced target lies on (over her head).
const AIM_LINE = rotateVector(conjugate(faceToward([0, 0, 1])), [0, 0, 1]);
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
  // (The drawn cards of a small place: the islets, the observatory on its mountain.)
  if (target.id === 'dokdo' || target.id === 'bohyunsan') return { distanceKm: 30, fovDeg: 40 };
  // (A landmark with something standing on it, MESSENGER's wreck, is looked at from close.)
  if (target.kind === 'site') return target.landmark && !world?.hasSiteModel(target.id) ? { distanceKm: 500, fovDeg: 50 } : { distanceKm: 28, fovDeg: 28 };
  return { distanceKm: target.radiusKm * (target.id === 'saturn' ? 7 : 4), fovDeg: 44 };
}

// The close view while a day is played again (core/replay.js): the model is drawn 6 km
// wide and starts 14 km up; from 48 km at 34 degrees the view is 29 km high.
const REPLAY_VIEW = { distanceKm: 48, fovDeg: 34 };

// For tuning a planet's look: set to e.g. { id: 'jupiter', fromCentreKm: 400000 } to
// start beside it. null starts above Earth, where the first-visit guide begins.
const START_NEAR = null;

// Two layouts: 'tour' is the hand-made one (planets spread round the Sun); 'today' puts
// the planets where they really are on the day the game is opened.
const layout = loadLayout();
// (A test may set the day: sessionStorage 'oddity.day', as 2027-08-02.)
const openedAt = (() => {
  try {
    const day = sessionStorage.getItem('oddity.day');
    if (day) return new Date(`${day}T12:00:00`);
  } catch {
    // No session storage: today.
  }
  return new Date();
})();
const bodyData = layout === 'today' ? todayData(openedAt) : BODY_DATA;
const bodiesAt = (timeS) => placeBodies(bodyData, timeS);
// Everything that is flown among and drawn: the Solar System, and far off TRAPPIST-1
// with its seven planets (core/exo.js), which have no slot in the journal (it lists
// the ones she has been to at the foot of its bodies, uncounted).
const allAt = (timeS) => [...bodiesAt(timeS), ...exoBodiesAt(timeS)];
let bodies = allAt(0);
// The trip there: whether she has been, and which planets she has seen from close by.
let exo = loadExo();

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

// The first of the places the game may open at (core/startSpots.js 'dawn'): dawn over
// Earth's night side (the user sent a picture of the place on 2026-10-04: "당분간 시작 위치를 여기로 변경"): 6,794 km up, the dark
// Earth with its city lights filling the left of the view and the Sun coming up over
// its edge at the upper right. The angles are read off that picture: from the middle
// of the view the Sun stands 16.5 degrees to the right and 18.8 up, Earth's centre 23
// to the left and 4.6 up.
const DAWN_HEIGHT_KM = 6794;
function startAtDawn() {
  const earth = bodyById('earth', bodies);
  const sun = bodyById('sun', bodies);
  const toSun = sun.position.map((n, i) => n - earth.position[i]);
  const far = Math.hypot(...toSun);
  const deg = Math.PI / 180;
  const way = (turn, lift) => [Math.cos(lift) * Math.sin(turn), Math.sin(lift), Math.cos(lift) * Math.cos(turn)];
  // The view's own heading and tilt, from where the Sun must stand in it.
  const turn = Math.atan2(toSun[0], toSun[2]) - 16.5 * deg;
  const lift = Math.asin(toSun[1] / far) - 18.8 * deg;
  const toEarth = way(turn - 23 * deg, lift + 4.6 * deg);
  const position = earth.position.map((n, i) => n - toEarth[i] * (earth.radiusKm + DAWN_HEIGHT_KM));
  return createState(position, lookAtDirection(way(turn, lift)));
}

// One of the places written down in core/startSpots.js, by chance (?start=2 in the
// address opens at the second, for looking at one).
function startAtSpot(spot) {
  if (spot.id === 'dawn') return startAtDawn();
  const { position, orientation } = fromSpot(spot, bodyById(spot.body, bodies), bodyById('sun', bodies));
  return createState(position, orientation);
}
const startSpot = pickSpot(Math.random(), new URLSearchParams(location.search).get('start'), !loadGuideDone());

// After a change of language the game carries on where she was (ui/storage.js).
const resume = takeResume();
let state = resume ? createState(resume.position, resume.orientation) : START_NEAR ? startNear(START_NEAR) : startAtSpot(startSpot);
let paused = false;
let selectedId = START_NEAR ? START_NEAR.id : resume?.selectedId && BODIES.some((b) => b.id === resume.selectedId) ? resume.selectedId : resume ? 'earth' : startSpot.target ?? 'earth';
let dragTurn = [0, 0];
// Target lock: the chosen target is held in the middle of the view; the slide buttons
// then take her round it, and forward and back bring her nearer and farther. Dragging
// the view or turning with the arrow keys lets go.
let locked = false;
// Turned to face a target without locking on (바라보기, the journal's 목적지로): the id of
// it while the view has not been turned since. Forward then goes straight at it, though
// the view is tipped to keep it over her head (along the view she flew 15 degrees under it).
let aimedId = null;
// How fast the view swings onto the target: most of the way in a third of a second.
const LOCK_RATE = 6;
let progress = loadProgress(BODIES, MISSIONS, STORIES, CRAFT, NOTES, TOURS);
// Small copies of saved photos, shown in the journal (core/album.js).
let album = loadAlbum(MISSIONS);
// Simulated seconds since the start; bodies orbit on this clock (TIME_SCALE x real time).
// The first-visit guide assumes the opening view above Earth.
let guide = createGuide(progress, loadGuideDone() || Boolean(START_NEAR));
let simTime = resume?.simTime ?? 0;
// The note on entering the asteroid belt shows once per visit to the game.
// Lights and plumes already told about (core/glows.js), with 'belt', 'meteor' and
// 'start' (how to look round). Kept on the device for the day: each is told once a day,
// not at every opening (the user, 2026-10-04: "처음 지구 근처에서 시작할 때에 메시지가 되게
// 반복적으로 많이 뜨네", then "하루에 한 번").
const toldDay = dayOf(new Date());
const glowsTold = new Set(loadTold(toldDay));
const markTold = (id) => {
  glowsTold.add(id);
  saveTold([...glowsTold], toldDay);
};
let beltSeen = glowsTold.has('belt');
// So does the note on the first shooting star over Earth.
let meteorSeen = glowsTold.has('meteor');
// How far the close view of a craft is turned from straight on: to the side and up, in radians.
const CRAFT_VIEW_TURN = [(35 * Math.PI) / 180, (18 * Math.PI) / 180];
// Sights are told this far apart, a flash too (they came 9 s apart beside Earth), and
// none in the first seconds of a sitting.
const SIGHT_GAP_S = 30;
const SIGHT_START_S = 20;
let glowTellWait = SIGHT_START_S;
// What she does at a sight just told of (core/sprite.js seeFor), and until when.
let seeKind = null;
let seeUntil = 0;
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
// A place that opens docked (core/startSpots.js `dock`): held at the craft from the first
// frame, with no glide and no count; she is free to look round and leaves as from any dock.
if (!resume && !START_NEAR && startSpot.dock) {
  const at = craft.find((c) => c.id === startSpot.dock);
  const offset = state.position.map((n, i) => n - at.position[i]);
  docked = { id: at.id, from: offset, to: offset, elapsed: DOCK_SECONDS, facing: state.orientation };
}
// Story places on a surface: named and selected like craft, turning with their body.
let sites = storySitesAt(0, bodies);
// The week of a real eclipse (core/eclipses.js): which one, the place on Earth it is
// seen from (a place for the labels and the jump only, not a story place), the record
// of those watched, and the show while it is watched: { startedAt, id } and this frame of it.
const eclipse = eclipseNow(openedAt);
let eclipsesSeen = loadEclipses();
const eclipseSpotAt = (timeS, at) => eclipseSpot(eclipse, bodyById('earth', at), bodyById('sun', at), spinAngle(SPIN_DAY_S.earth, timeS, EARTH_START_SPIN));
const eventPlace = eclipse
  ? { id: 'eclipseSpot', name: t`${eclipseTitle(eclipse)} 자리`, nameEn: '', kind: 'site', parent: 'earth', radiusKm: 0, landmark: true, ...eclipseSpotAt(0, bodies) }
  : null;
let show = null;
let showNow = null;
// The spot a scene with no story place of its own is played at (core/replay.js: Cassini's
// plunge, where she rests on Saturn): a place for the close view only, with `up` its
// direction from the body's middle and `level` the way the view looks along the ground.
let scenePlace = null;
const here = (id) => bodyById(id, bodies) ?? craft.find((c) => c.id === id) ?? sites.find((s) => s.id === id) ?? (scenePlace?.id === id ? scenePlace : null) ?? (eventPlace?.id === id ? eventPlace : null);
const named = (id) => bodyById(id) ?? craftById(id) ?? sites.find((s) => s.id === id) ?? (scenePlace?.id === id ? scenePlace : null) ?? (eventPlace?.id === id ? eventPlace : null);

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
  $('journalButton').setAttribute('aria-label', t`수첩 ${done}/${total}`);
  $('journalButton').title = t('탐험 수첩 (J)');
  // Eighty, a hundred and twenty, a hundred and sixty slots: Sora counts aloud.
  const counted = before ? milestoneLine(score(summarize(before, BODIES, MISSIONS, STORIES)).done, done) : null;
  if (counted) say.show(counted);
  // The last slot is not listed in the journal until every other slot is filled
  // (ui/journal.js): the moment it comes into the lists, a notice says so.
  if (before && !lastSlotOpen(before, score(summarize(before, BODIES, MISSIONS, STORIES)).done, total) && lastSlotOpen(progress, done, total) && done < total) {
    toast.show(t('수첩에 마지막 칸이 나타났습니다. 임무 갈래의 맨 끝을 보세요.'));
  }
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
// Stunt flights (core/stunts.js): the best of each, the one under way, and whether a
// jump happened since the last frame (a jump starts a stunt over).
let stuntRecords = loadStunts();
let stunt = null;
let stuntJumped = false;
// A ring plane crossed last frame ({ body, t }), for the stunt through the gap.
let ringHit = null;
// A jump happened this frame: the straight line of the jump is not a flight through rings.
let ringSkip = false;
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
  toast.show(t`태양계 탐험을 모두 마쳤습니다. 수첩이 가득 찼습니다!${album.length >= 2 ? t('\n수첩의 사진첩에서 "지나온 길 돌아보기"를 눌러 보세요.') : ''}`);
}

function setPaused(value) {
  paused = value;
  input?.clear();
  $('pauseButton').textContent = paused ? t('비행 계속') : t('일시 정지');
  $('pauseButton').title = paused ? t('비행 계속') : t('일시 정지 (Esc)');
  $('pauseButton').classList.toggle('paused', paused);
}

// Looking behind (R, the bent arrow): only the view turns half round. She flies on the
// way she was going, and is not drawn, being behind the view.
let rear = false;
// "그날로" (core/replay.js): the place whose day is being played again in the close
// view, since when (ms), and the line last shown. null when none is.
let replay = null;
// The feel of speed (core/speedFeel.js): on unless turned off in the settings; the
// view's height now, in degrees.
let feel = loadFeel();
let feelFov = BASE_FOV_DEG;
function setRear(value) {
  rear = value;
  document.body.classList.toggle('rear', rear);
  $('rearButton').setAttribute('aria-pressed', String(rear));
  $('rearButton').title = rear ? t('앞 보기 (R)') : t('뒤 보기 (R)');
  $('reticle').querySelector('span').textContent = rear ? t('뒤 보기') : t('비행 방향');
}

function brake() {
  input.clear();
  if (totalSpeed(state) > 0) sound.cue('brake');
  state = stopNow(state);
  toast.show(t('정지했습니다. 주변을 둘러보세요.'));
}

let input;
let photo;
let pair;
let world;

async function init() {
  try {
    world = await createWorld(canvas, bodies);
  } catch (e) {
    console.error(e);
    $('loadError').textContent = t`${e.message} 최신 Chrome이나 Edge에서 하드웨어 가속을 켜고 다시 열어 주세요.`;
    return;
  }

  input = createInput({
    canvas,
    onDrag(dx, dy) {
      if (photo.active()) photo.rotate(dx, dy);
      else if (!paused) {
        if (locked) unlock();
        aimedId = null;
        state = { ...state, orientation: rotateLocal(state.orientation, ...(rear ? rearTurn(dx, dy) : [dx, dy])) };
        dragTurn[0] += dx;
        dragTurn[1] += dy;
      }
    },
    // A short touch on a constellation, a galaxy or a cluster: it tells its lines.
    onTap(x, y) {
      if (!photo.active() && !paused) hud.touchSky(x, y);
    },
    // Any press on the view puts away what the last touch was telling.
    onPress: () => hud.pressSky(),
    onBrake: brake,
    onTogglePhoto: () => photo.toggle(),
    onJournal: () => journal.open(),
    onMute: () => toggleSound(),
    onMusic: () => toggleMusic(),
    onRear: () => { if (!photo.active()) setRear(!rear); },
    // A flight key pressed while paused flies on at once (not in photo mode, which is
    // paused on purpose, nor behind a story card).
    onMove() {
      if (paused && !photo.active() && !$('storyCard').open && !$('noteCard').open) setPaused(false);
    },
    // Esc holds the game and lets it go again. There is no button for it on screen (the
    // user, 2026-10-05: "일시 정지 버튼이 굳이 필요할까?"; #pauseButton stays in the page,
    // hidden, and only keeps the state), so a notice says what happened and how to go on.
    onEscape() {
      if (photo.active()) return photo.toggle();
      setPaused(!paused);
      // (Behind another notice it waits four seconds at most: later it may no longer be true.)
      if (paused) toast.show(t('멈췄습니다. Esc나 비행 키를 누르면 이어집니다.'), 'pause', 4);
    },
    onWheel: (deltaY) => photo.zoom(deltaY),
    isBlocked: () => $('settings').open || $('journal').open || $('noteCard').open || $('bigMap').open,
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
            at: new Date().toISOString(), where: t`${here(shot.orbit.id).name} 확대 관찰`, missions: [], image: shot.thumb,
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
        // A story place she stands at that grandmother has a word about (core/postcard.js).
        const placesNow = completedStories({ position: state.position, restingOn: state.restingOn, bodies, craft, sites });
        const storyPlace = cardPlace(placesNow);
        // Standing at a place on a surface: its name is where the photo was taken.
        const stoodAt = STORIES.find((story) => story.type === 'surface' && placesNow.includes(story.id));
        album = saveAlbum(addPhoto(album, {
          at: new Date().toISOString(),
          // Docked, or far from every body with a craft in reach: the craft is the place.
          // Standing at a story place: that place.
          where: photoPlace(local.label, local.altitude, (docked ? here(docked.id) : local.altitude >= 1e5 ? dockable(state.position, craft) : stoodAt)?.name),
          missions: done,
          image: shot.thumb,
          ...(storyPlace ? { place: storyPlace } : {}),
          rate: { stars, subject },
        }));
        journal.setAlbum(album);
      }
      const mine = album[0];
      const before = progress;
      const result = recordPhotos(progress, done);
      const told = recordStories(result.progress, slots.stories);
      if (slots.held === 'locked') toast.show(t('창백한 푸른 점은 수첩의 마지막 칸입니다. 나머지 칸을 모두 채우면 열립니다.'));
      if (slots.held === 'near') toast.show(t('마지막 칸은 지구에서 6,000만km 넘게 떨어져서 찍어야 채워집니다.'));
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
        say.show(t('저 점이 지구야? 진짜 작다.'));
      }
      if (finished) celebrate();
      // A mission after a famous photograph, met for the first time: the real one is
      // shown beside hers. Not over the last slot's own telling.
      const famous = famousFor(result.newly);
      if (famous && shot.thumb && !told.newly.length && !finished) pair.show(shot.thumb, photoCaption(mine, MISSIONS).title, famous);
    },
  });

  function announce(event, keepS) {
    toast.show(eventMessage(event), null, keepS);
    const cue = cueForEvent(event);
    if (cue) sound.cue(cue);
  }

  // The card beside the view while docked: when it went up and what it does. On a low
  // phone screen it is folded to two lines (style.css) and a press unfolds it.
  $('craftCard').addEventListener('click', () => $('craftCard').classList.toggle('open'));
  function showCraftCard(target) {
    $('craftCard').hidden = !target;
    $('craftCard').classList.remove('open');
    if (!target) return;
    $('craftCardArt').src = `${import.meta.env.BASE_URL}assets/${craftPicture(target.id)}`;
    $('craftCardYear').textContent = t`${target.launched}년 발사`;
    // Its English name after it, in a part the folded card leaves out (style.css).
    $('craftCardName').textContent = target.name;
    if (target.nameEn) {
      const en = document.createElement('span');
      en.className = 'en';
      en.textContent = ` ${target.nameEn}`;
      $('craftCardName').append(en);
    }
    $('craftCardIntro').textContent = target.intro;
  }

  // Opened docked (a start place): the craft's card is up from the first.
  if (docked) showCraftCard(here(docked.id));

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
    // (The place of a solar eclipse is no story, but it has a latitude and a longitude.)
    const story = STORIES.find((s) => s.id === id) ?? (eventPlace?.id === id ? { body: 'earth', latDeg: eclipse.latDeg, lonDeg: eclipse.lonDeg } : null);
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
  // toward: something on the body to arrive on the side of (core/teleport.js bodyVista).
  // free: somewhere not been to may be jumped to as well (the big map, an eclipse's place).
  function teleport(id, anywhere = false, known = false, toward = null, free = false) {
    if (warp.busy()) return;
    sound.cue('warp');
    warp.play(() => {
      const target = here(id);
      const spot = teleportSpot(target, { position: state.position, progress, bodies, parent: target.parent ? here(target.parent) : null, anywhere, known: known || free, ringNormal: world.ringNormal(target.id), toward });
      if (!spot) return;
      if (docked) {
        docked = null;
        showCraftCard(null);
        sound.hush();
      }
      if (visit && !hasArrived(visit)) sound.hush();
      visit = null;
      stuntJumped = true;
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
      const about = todo ? t`할 일: ${todo}` : docking ? null : aboutKnown(target);
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
    // A scene drawn small (Philae on its comet, 4 km across: core/replay.js sizeKm) is
    // looked at from close by: the measures below, made for models 6 km wide, are its own.
    const small = replayFor(target.id)?.sizeKm ?? null;
    const clearKm = small ? small * 0.6 : INSPECT_CLEAR_KM;
    if (target.kind === 'site') {
      // The middle of what stands there, not the ground under it.
      const ground = here(target.parent);
      centre = centre.map((n, i) => n + ((n - ground.position[i]) / ground.radiusKm) * (small ? small * 0.5 : 2));
    }
    const ahead = forward(orbit.orientation);
    let position = centre.map((n, i) => n - ahead[i] * orbit.distanceKm);
    const { body, distance } = nearestSurface(position, bodies);
    if (body && body.id !== target.id && distance < clearKm) {
      const up = position.map((n, i) => n - body.position[i]);
      const height = Math.hypot(...up) || 1;
      position = body.position.map((n, i) => n + (up[i] / height) * (body.radiusKm + clearKm));
      return { position, orientation: lookAtDirection(centre.map((n, i) => n - position[i])) };
    }
    return { position, orientation: orbit.orientation };
  }

  // What there is to read about the target being looked at closely: a body found, a
  // craft met, a place been to. Before that, only how to open it.
  const KIND = { star: t('별'), planet: t('행성'), moon: t('위성'), dwarf: t('왜행성'), comet: t('혜성') };
  function readingFor(target) {
    const head = { name: target.name, nameEn: target.nameEn };
    if (target.kind === 'craft') {
      if (!(progress.craft ?? []).includes(target.id)) return { ...head, kicker: t('탐사선'), text: t('아직 수첩에 없는 탐사선입니다. 3,000km 안까지 다가가면 읽을거리가 열립니다.') };
      return { ...head, kicker: t`${target.launched}년 발사`, text: READINGS[target.id] ?? target.intro, quiz: readingQuiz(target.id) };
    }
    if (target.kind === 'site') {
      const story = STORIES.find((s) => s.id === target.id);
      const kicker = `${story.year ? t`${story.year}년 · ` : ''}${here(target.parent).name}`;
      if (!progress.stories.includes(target.id)) return { ...head, kicker, text: t`아직 수첩에 없는 곳입니다. ${story.hint}.` };
      const told = STORY_DETAILS[target.id]?.detail ?? story.text;
      return { ...head, kicker, text: STORY_MORE[target.id] ? `${told}

${STORY_MORE[target.id]}` : told };
    }
    // Another star and its planets (core/exo.js): a word each, no journal slot.
    if (target.exo) return { ...head, kicker: target.kind === 'exostar' ? t('붉은 왜성 · 지구에서 약 40광년') : t('외계 행성 · 겉모습은 상상해서 그림'), text: exoNote(target.id) };
    const parent = target.parent ? bodyById(target.parent) : null;
    const kicker = `${KIND[target.kind] ?? t('천체')}${parent && target.kind === 'moon' ? t` · ${parent.name}의 위성` : ''}`;
    if (!progress.discovered.includes(target.id)) return { ...head, kicker, text: t('아직 수첩에 없는 천체입니다. 표면에서 5만km 안까지 다가가면 읽을거리가 열립니다.') };
    return { ...head, kicker, facts: bodyFacts(BODY_DATA.find((b) => b.id === target.id), parent?.name), text: READINGS[target.id] ?? FACTS[target.id] ?? '', quiz: readingQuiz(target.id) };
  }
  function readingQuiz(id) {
    const quiz = READINGS[id] ? readingQuizFor(id) : null;
    return quiz && { ...quiz, id: readingKey(id), solved: (progress.quiz ?? []).includes(readingKey(id)) };
  }
  const inspectInfo = createInspectInfo({
    onSolve(id) {
      progress = recordQuiz(progress, id);
      saveProgress(progress);
    },
  });
  let inspectShown = null;
  function showInspectInfo() {
    const id = photo.orbit()?.id ?? null;
    // A day played again: its lines take the sheet's place, each at its moment.
    const scene = replay && id === replay.id ? replayFrame(replay.id, (performance.now() - replay.startedAt) / 1000) : null;
    const key = show && showNow ? `eclipse:${showNow.line}` : scene ? `${id}:then:${scene.line}` : id;
    if (key === inspectShown) return;
    inspectShown = key;
    // An eclipse being watched: its lines, each at its moment, and under each that it is staged.
    if (show && showNow) {
      inspectInfo.show({ name: eclipseTitle(eclipse), nameEn: '', kicker: `${eclipseDayText(eclipse)} · ${eclipse.where}`, text: `${showNow.text}\n\n${stagedNote(eclipse)}` });
      return;
    }
    if (scene) inspectInfo.show({ name: replayFor(id).name, nameEn: '', kicker: t`그날로 · ${replayFor(id).day}`, text: scene.text });
    else inspectInfo.show(id ? readingFor(here(id)) : null);
  }

  // A place being looked round while it is night there: its body is lit for the look.
  let lampTold = null;
  function orbitLamp() {
    const orbit = photo.orbit();
    const target = orbit ? here(orbit.id) : null;
    if (target?.kind !== 'site') {
      lampTold = null;
      return null;
    }
    const ground = here(target.parent);
    const direction = inspectLight(
      target.position.map((n, i) => n - ground.position[i]),
      here('sun').position.map((n, i) => n - target.position[i]),
    );
    if (!direction) return null;
    if (lampTold !== target.id) {
      lampTold = target.id;
      toast.show(t('이곳은 지금 밤입니다. 살펴보는 동안만 빛을 비춥니다.'));
    }
    return { id: ground.id, direction };
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
    const place = sites.find((s) => s.id === id) ?? (eventPlace?.id === id && eclipse.kind === 'solar' ? eventPlace : null);
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

  // "그날로": standing at a place that has a scene, its day is played again in the close view.
  // The Moon where the eclipse being watched needs it (core/eclipses.js stagedMoon),
  // seen from where she is.
  function stageMoon(frame) {
    const earth = here('earth');
    const out = state.position.map((n, i) => n - earth.position[i]);
    const far = Math.hypot(...out);
    const at = stagedMoon(eclipse, frame, state.position, out.map((n) => n / far), here('sun'), bodyById('moon', allAt(simTime)), earth);
    bodies = bodies.map((b) => (b.id === 'moon' ? Object.freeze({ ...b, position: Object.freeze(at) }) : b));
  }
  function startShow() {
    show = { startedAt: performance.now(), id: eclipse.kind === 'solar' ? 'sun' : 'moon' };
    showNow = showFrame(eclipse, 0);
    stageMoon(showNow);
    const target = here(show.id);
    const toward = target.position.map((n, i) => n - state.position[i]);
    // From where she stands, looking up at it: the whole Sun with its corona, or the Moon large.
    photo.orbitAround({ id: show.id, facing: lookAtDirection(toward), distanceKm: Math.hypot(...toward), fovDeg: eclipse.kind === 'solar' ? (innerWidth < innerHeight ? 95 : 70) : 14 });
  }
  // The jump to the eclipse's place, and then down to stand there: the ground turns
  // under anyone who only hovers (46 km a second at this clock), and standing she is
  // carried with it, through the night too if the Sun is not up yet.
  let landAtEclipse = false;
  $('eclipseJump').addEventListener('click', () => {
    if (!eclipse || photo.active() || warp.busy()) return;
    teleport(eventPlace.id, true, false, null, true);
    landAtEclipse = true;
  });

  $('replayButton').addEventListener('click', () => {
    if (photo.active()) return;
    if (eclipse && (!visit || visit.id === eventPlace.id)) {
      const watch = canWatch(eclipse, eventPlace, here('sun'), state.position);
      if (watch === 'yes') return startShow();
      if (watch === 'night') return toast.show(t('이곳은 지금 밤입니다. 해가 뜨면 볼 수 있습니다. 게임의 하루는 14분 24초입니다.'));
    }
    const onBody = !visit && state.restingOn ? replayOn(state.restingOn) : null;
    if (onBody) {
      // Where she rests, seen along the ground from 15 degrees above it; what comes in
      // crosses the view from one side.
      const ground = here(state.restingOn);
      const out = state.position.map((n, i) => n - ground.position[i]);
      const far = Math.hypot(...out);
      const up = out.map((n) => n / far);
      const ahead = forward(state.orientation);
      const rise = ahead.reduce((sum, n, i) => sum + n * up[i], 0);
      let level = ahead.map((n, i) => n - up[i] * rise);
      if (Math.hypot(...level) < 1e-6) level = [up[1], -up[0], 0];
      const length = Math.hypot(...level);
      level = level.map((n) => n / length);
      const scene = replayFor(onBody);
      scenePlace = {
        id: onBody, name: scene.name, nameEn: '', kind: 'site', parent: ground.id, radiusKm: 0, landmark: false, up, level,
        position: ground.position.map((n, i) => n + up[i] * ground.radiusKm),
      };
      const tilt = (15 * Math.PI) / 180;
      const facing = orientationFrom(level.map((n, i) => n * Math.cos(tilt) - up[i] * Math.sin(tilt)), up);
      photo.orbitAround({ id: onBody, facing, distanceKm: scene.viewKm, fovDeg: REPLAY_VIEW.fovDeg });
      replay = { id: onBody, startedAt: performance.now(), down: false };
      return;
    }
    if (!visit || !hasArrived(visit) || !replayFor(visit.id)) return;
    selectedId = visit.id;
    hud.showSelection(named(visit.id));
    $('inspectTarget').click();
    if (photo.orbit()?.id !== visit.id) return;
    // Seen from farther back than a plain close look, so the way down fits in the view.
    photo.orbitAround({ id: visit.id, facing: photo.orbit().orientation, distanceKm: REPLAY_VIEW.distanceKm, fovDeg: REPLAY_VIEW.fovDeg });
    replay = { id: visit.id, startedAt: performance.now(), down: false };
  });

  // A scene's frame as the renderer wants it: with the way it comes in from the side as
  // a direction in space. At a scene's own spot (Cassini, Philae) that is to the left of
  // the view, across the ground, square to the way the view looks; at a story place it
  // is along the ground toward the east. What comes in over round ground is lowered by
  // as much as the ground falls away under it (on Philae's comet, 2 km in radius, a
  // tenth of a kilometre at the first touch).
  function replayForWorld(frame) {
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    let side = [0, 0, 0];
    let radiusKm = Infinity;
    if (scenePlace) {
      side = cross(scenePlace.up, scenePlace.level);
      radiusKm = here(scenePlace.parent).radiusKm;
    } else if (frame.acrossKm) {
      const site = here(replay.id);
      const ground = site && here(site.parent);
      if (ground) {
        const out = site.position.map((n, i) => n - ground.position[i]);
        const flat = cross([0, 1, 0], out);
        const length = Math.hypot(...flat);
        side = length > 1e-9 ? flat.map((n) => n / length) : [1, 0, 0];
        radiusKm = ground.radiusKm;
      }
    }
    return {
      id: replay.id, flame: frame.flame, after: frame.after, glow: frame.glow, gone: frame.gone, slope: frame.slope,
      liftKm: frame.liftKm - (frame.acrossKm ** 2) / (2 * radiusKm),
      across: side.map((n) => n * frame.acrossKm),
      side,
      turn: frame.turn ?? 0, tilt: frame.tilt ?? 0, bag: frame.bag ?? 0, open: Boolean(frame.open), sizeKm: frame.sizeKm ?? null,
    };
  }

  // The jump to TRAPPIST-1, offered while latched to Kepler, and the way home from there.
  $('exoJump').addEventListener('click', () => {
    if (warp.busy()) return undefined;
    if (inExo(state.position)) return teleport('kepler', true);
    sound.cue('warp');
    warp.play(() => {
      docked = null;
      showCraftCard(null);
      sound.hush();
      visit = null;
      stuntJumped = true;
      input.clear();
      const spot = exoArrival();
      state = createState(spot.position, spot.orientation);
      selectedId = EXO_STAR.id;
      hud.showSelection(here(EXO_STAR.id));
      if (!exo.been) {
        exo = { ...exo, been: true };
        saveExo(exo);
      }
      toast.show(t('트라피스트-1에 왔습니다. 지구에서 약 40광년 떨어진 붉은 왜성과 행성 일곱입니다.\n크기와 궤도는 잰 값이고, 겉모습은 아무도 몰라 상상해서 그렸습니다.'));
      say.show(t('해가 빨개! 행성이 일곱이나 돼.'));
    });
    return undefined;
  });
  // What is left unnamed while she is at the other star: everything at home but the Sun.
  const homeIds = [...BODIES.filter((b) => b.kind !== 'star').map((b) => b.id), ...craft.map((c) => c.id), ...sites.map((s) => s.id)];

  const hud = createHud([...BODIES, ...exoBodiesAt(0), ...craft, ...sites, ...(eventPlace ? [eventPlace] : [])], {
    skyLabels: skyLabels(),
    onSelect: selectBody,
    onFace() {
      const body = here(selectedId);
      const direction = body.position.map((n, i) => n - state.position[i]);
      state = { ...state, orientation: faceToward(direction) };
      aimedId = selectedId;
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
      // A craft is first seen from a little to one side and above. Docked, she is on its
      // sunlit side, which is where its dish or its heat shield points: straight on, half
      // the craft were a white disc with nothing of the craft behind it.
      if (body.kind === 'craft') facing = rotateLocal(facing, CRAFT_VIEW_TURN[0], CRAFT_VIEW_TURN[1]);
      photo.orbitAround({ id: body.id, facing, ...inspectView(body) });
    },
  });
  hud.showSelection(named(selectedId));
  function unlock() {
    locked = false;
    toast.show(t('목표 고정을 풀었습니다.'));
  }
  $('lockTarget').addEventListener('click', () => {
    if (locked) return unlock();
    locked = true;
    const body = here(selectedId);
    state = { ...state, orientation: faceToward(body.position.map((n, i) => n - state.position[i])) };
    toast.show(t`${body.name}에 화면을 고정했습니다. 방향키 단추로 그 둘레를 돌고, 전진과 후진으로 다가가고 물러납니다.\n화면을 끌면 풀립니다.`);
    return undefined;
  });

  // The big map: a tap on the small one opens it. A place is picked on the map or by
  // its name, then "이 방향으로" turns her to it and locks the view on it.
  let mapPick = null;
  const mapBodies = () => {
    const away = inExo(state.position);
    return bodies.filter((b) => (away ? b.exo : !b.exo && ['star', 'planet', 'dwarf', 'comet'].includes(b.kind)));
  };
  function pickOnMap(id) {
    mapPick = id;
    const body = here(id);
    $('bigMapInfo').textContent = `${body.name} · ${distanceText(surfaceDistance(state.position, body))}`;
    $('bigMapGo').disabled = false;
    $('bigMapJump').disabled = false;
    for (const chip of $('bigMapList').children) chip.setAttribute('aria-pressed', String(chip.dataset.id === id));
  }
  const bigMap = createMinimap($('bigMapCanvas'), { big: true, onPick: pickOnMap });
  function openBigMap() {
    if (photo.active() || $('bigMap').open) return;
    const prior = paused;
    setPaused(true);
    mapPick = null;
    $('bigMapInfo').textContent = t('갈 곳을 지도나 이름에서 고르세요.');
    $('bigMapGo').disabled = true;
    $('bigMapJump').disabled = true;
    $('bigMapList').replaceChildren(...mapBodies().map((b) => {
      const chip = document.createElement('button');
      chip.textContent = b.name;
      chip.dataset.id = b.id;
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', () => pickOnMap(b.id));
      return chip;
    }));
    $('bigMap').showModal();
    $('bigMap').addEventListener('close', () => setPaused(prior), { once: true });
  }
  $('bigMapClose').addEventListener('click', () => $('bigMap').close());
  $('bigMapGo').addEventListener('click', () => {
    if (!mapPick) return;
    const body = here(mapPick);
    selectedId = mapPick;
    hud.showSelection(named(mapPick));
    state = { ...state, orientation: faceToward(body.position.map((n, i) => n - state.position[i])) };
    locked = true;
    $('bigMap').close();
    toast.show(t`${body.name} 쪽을 바라보고 화면을 고정했습니다. 전진을 누르면 다가갑니다.`);
  });
  $('bigMapJump').addEventListener('click', () => {
    const id = mapPick;
    $('bigMap').close();
    if (!id) return;
    // Anywhere on the map, been there or not (as a tour's jump goes): on a phone,
    // finding the way by hand was the hard part ("미니맵을 터치하면, 크게 확대되고, 거기에서
    // 별을 선택해서 텔레포트하는 식으로 바꾸자").
    selectedId = id;
    hud.showSelection(named(id));
    teleport(id, true, false, null, true);
  });
  const minimap = createMinimap($('minimap'), { onTap: openBigMap });

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
    if (!line) return false;
    saidLines.add(line);
    say.show(line);
    return true;
  }
  // What she was doing last frame, to notice what she has just done (core/lines.js).
  let lastDoing = null;
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
      // The tour's name leads on a wide screen only: on a phone the line has room for
      // the place alone (style.css).
      lead: `${now.tour.name}: `,
      text: stopName(now.stop),
      targetId: stopTarget(now.stop),
      jump: true,
    };
  }
  // A stunt flight: taken up from the journal, given up from the goal line.
  function beginStunt(id) {
    if (guide.step !== null) {
      toast.show(t('첫 안내를 마치거나 건너뛴 뒤에 할 수 있습니다.'));
      return;
    }
    if (currentStop(progress)) {
      toast.show(t('코스를 마치거나 그만둔 뒤에 할 수 있습니다.'));
      return;
    }
    stunt = startStunt(id);
    const { name, todo } = stuntById(id);
    toast.show(t`묘기 "${name}": ${todo}.\n순간 이동을 쓰면 처음부터 다시 잽니다. 화면 위의 "그만두기"로 그만둡니다.`);
  }
  function quitStunt() {
    stunt = null;
    toast.show(t('묘기를 그만두었습니다. 수첩의 코스 갈래에서 다시 할 수 있습니다.'));
  }
  function finishStunt(value) {
    const { id, name, line } = stuntById(stunt.id);
    const result = recordStunt(stuntRecords, id, value);
    stuntRecords = result.records;
    saveStunts(stuntRecords);
    stunt = null;
    const beside = result.best ? t('새 기록입니다.') : t`가장 좋은 기록은 ${valueText(id, stuntRecords[id])}입니다.`;
    toast.show(t`묘기 "${name}": ${valueText(id, value)}. ${beside}\n수첩의 코스 갈래에서 다시 할 수 있습니다.`);
    say.show(line);
    sound.cue('discovered');
  }
  const stuntGoal = () => ({ count: t('묘기'), text: stuntStatus(stunt), quit: true });
  function beginTour(id) {
    stunt = null;
    // A tour takes over from the first-visit guide.
    if (guide.step !== null) {
      guide = skipGuide(guide);
      saveGuideDone();
    }
    progress = startTour(progress, id);
    saveProgress(progress);
    aimAtStop();
    const now = currentStop(progress);
    toast.show(t`코스 "${now.tour.name}"${objectParticle(now.tour.name)} 시작합니다. 첫 곳은 ${stopName(now.stop)}입니다.\n화면 위의 "근처로"를 누르면 그 가까이로 순간 이동합니다.`, 'tour');
  }
  function endTour() {
    progress = quitTour(progress);
    saveProgress(progress);
    toast.show(t('코스를 그만두었습니다. 수첩의 코스 갈래에서 다시 떠날 수 있습니다.'));
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

  // Grandmother's notes (core/story.js): the game waits while one is open, and Sora
  // answers the first reading with a line of her own.
  let notePriorPause = false;
  let noteWait = 0;
  let dailyDue = !requestDone();
  let noteDueId = null;
  // A note read again from the journal: folding it brings the journal back (the user,
  // 2026-10-05; it went back to the flight).
  let noteFromJournal = false;
  const noteCard = createNoteCard({
    onOpen() {
      notePriorPause = paused;
      setPaused(true);
      input.clear();
    },
    onClose(note, first) {
      setPaused(notePriorPause);
      previous = null;
      if (noteFromJournal) {
        noteFromJournal = false;
        journal.open();
      }
      if (!first) return;
      noteWait = NOTE_GAP_S;
      // The last line was spoken at the gate.
      if (!note.gate && note.line) say.show(note.line);
      // One of grandmother's notes (not a reply): she reads it over once more.
      if (note.id && !note.gate) readUntil = performance.now() + READ_MS;
    },
  });

  // Postcards answered since the last visit (core/postcard.js): grandmother's replies
  // are written into the album now and read out on one sheet, after any note.
  let repliesDue = arrivedReplies(album, dayOf(openedAt));
  function openReplies() {
    const earlier = album.flatMap((e) => (e.reply ? [e.reply] : []));
    const texts = [];
    for (const index of repliesDue) texts.push(replyFor(album[index], earlier.length + texts.length, [...earlier, ...texts]));
    album = saveAlbum(album.map((entry, i) => (repliesDue.includes(i) ? { ...entry, reply: texts[repliesDue.indexOf(i)] } : entry)));
    journal.setAlbum(album);
    const best = Math.max(...repliesDue.map((i) => album[i]?.rate?.stars ?? 0));
    const count = repliesDue.length;
    repliesDue = [];
    noteCard.show({
      image: 'mailbox.png',
      imageAlt: t('아침의 대문 옆 나무 우편함. 우표와 소인이 찍힌 누런 봉투가 반쯤 나와 있다'),
      scene: count > 1 ? t`우편함에 할머니의 답장이 ${count}통 와 있다.` : t('우편함에 할머니의 답장이 와 있다.'),
      title: t('소라에게'),
      text: texts.join('\n\n'),
      button: t('답장을 넣어 둔다'),
      line: best === 3 ? t('할머니가 별 세 개 주셨어!') : t('답장 왔다! 또 보내야지.'),
    });
  }
  // What Sora says when the journal closes after a postcard was sent from it.
  let sayAfterJournal = null;

  let journalPriorPause = false;
  const journal = createJournal({
    onSendPhoto(index) {
      album = saveAlbum(sendPostcard(album, index, dayOf(new Date())));
      sayAfterJournal = t('할머니, 이거 보면 깜짝 놀랄걸.');
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
    exo: () => exo,
    // The next real eclipse first (core/eclipses.js), then the shadows of moons.
    sky: () => [
      ...(eclipseNews(openedAt) ? [{ text: eclipseNews(openedAt), planet: null, toward: null }] : []),
      ...skyNews(bodiesAt, simTime).map((news) => ({ text: newsLine(news), planet: bodyById(news.planet, bodies),
        toward: shadowSpot(bodyById(news.planet, bodies), bodyById(news.moon, bodies), bodyById('sun', bodies).position),
      })),
    ],
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
        state = { ...state, orientation: faceToward(target.position.map((n, i) => n - state.position[i])) };
        aimedId = selectedId;
        toast.show(hud.faceToast(target));
      },
    }),
    onTourStart: beginTour,
    onTourQuit: endTour,
    stunts: {
      all: () => STUNTS.map((s) => ({ ...s, record: recordText(s.id, stuntRecords), on: stunt?.id === s.id, done: stuntRecords[s.id] !== undefined })),
      start: beginStunt,
      quit: quitStunt,
    },
    lastSlot: LAST_SLOT,
    lastShut: () => !lastOpen(),
    onNote(id) {
      noteCard.show(noteById(id), false);
      notePriorPause = journalPriorPause;
      noteFromJournal = noteCard.isOpen();
    },
    bodies: BODIES,
    missions: MISSIONS,
    stories: STORIES,
    craft: CRAFT,
    onPair: (entry, famous) => pair.show(entry.image, photoCaption(entry, MISSIONS).title, famous),
    onDeletePhoto(index) {
      album = saveAlbum(removePhoto(album, index));
      return album;
    },
    // The journal's "순간 이동": jump there from anywhere.
    // toward: for sky news, where the shadow is on the planet now, to arrive on its side.
    onJump(id, toward = null) {
      selectedId = id;
      hud.showSelection(named(id));
      teleport(id, true, false, toward);
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
      state = { ...state, orientation: faceToward(body.position.map((n, i) => n - state.position[i])) };
      aimedId = id;
      toast.show(hud.faceToast(body));
    },
    onReset() {
      progress = createProgress();
      progressChanged(null);
      journal.update(progress, state.position, bodies);
      $('journal').close();
      toast.show(t('탐험 기록을 지웠습니다.'));
    },
  });
  journal.setAlbum(album);
  bindTextSize();
  const lookBack = createLookBack({ missions: MISSIONS });
  pair = createPair();
  $('lookBackButton').addEventListener('click', () => lookBack.play(album));
  // Opened before the first frame, the journal still has something to show.
  journal.update(progress, state.position, bodies);

  // For testing the opening: wipe the log, the album, the daily record and the first-visit
  // guide (the settings stay) and start again from the first page. Only the maker sees the
  // button: on the dev server, not on the public site or in the store app.
  $('testReset').hidden = !isLocalHost(location.hostname);
  $('testReset').addEventListener('click', () => {
    for (const key of ['oddity.progress.v1', 'oddity.album.v1', 'oddity.daily.v1', 'oddity.guide.v1', 'oddity.stunts.v1', 'oddity.told.v1', 'oddity.exo.v1', 'oddity.eclipse.v1']) {
      try { localStorage.removeItem(key); } catch { /* storage shut: nothing to wipe */ }
    }
    location.reload();
  });

  function showSoundButton() {
    $('soundButton').textContent = sound.muted() ? '🔇' : '🔊';
    $('soundButton').classList.toggle('off', sound.muted());
    $('soundButton').setAttribute('aria-label', sound.muted() ? t('효과음 켜기') : t('효과음 끄기'));
    $('soundButton').title = sound.muted() ? t('효과음 꺼짐 (M)') : t('효과음 켜짐 (M)');
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
    $('musicButton').textContent = on ? t('배경 음악 끄기') : t('배경 음악 켜기');
    $('bgmButton').classList.toggle('off', !on);
    $('bgmButton').setAttribute('aria-label', on ? t('배경 음악 끄기') : t('배경 음악 켜기'));
    $('bgmButton').title = on ? t('배경 음악 켜짐 (B)') : t('배경 음악 꺼짐 (B)');
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
    // Told beside the button: a notice would be hidden behind the settings.
    $('tuneNow').textContent = `♪ ${sound.nextTune()}${sound.musicOn() ? '' : t(' (배경 음악이 꺼져 있습니다)')}`;
  });

  $('brake').addEventListener('click', brake);
  $('rearButton').addEventListener('click', () => setRear(!rear));
  $('pauseButton').addEventListener('click', () => setPaused(!paused));
  $('photoButton').addEventListener('click', () => photo.toggle());
  // The settings hold the game while they are open. (The help is their second page: it
  // was a sheet of its own behind a "?" button until 2026-10-05.)
  let settingsPriorPause = false;
  createSettings({
    onOpen() {
      settingsPriorPause = paused;
      setPaused(true);
    },
    onClose: () => setPaused(settingsPriorPause),
    today: () => dayOf(new Date()),
    // The game starts again in the other language, from this very place and moment.
    onLanguage: () => saveResume({ position: [...state.position], orientation: [...state.orientation], simTime, selectedId }),
    reopen: Boolean(resume),
  });
  // Switching the layout moves every planet, so the game starts over (the log is kept).
  $('layoutNow').textContent = layout === 'today' ? t('지금: 오늘의 하늘(오늘 날짜의 실제 위치).') : t('지금: 여행 배치(행성을 태양 둘레에 고루 흩어 놓음).');
  $('layoutButton').textContent = layout === 'today' ? t('여행 배치로 바꾸기') : t('오늘의 하늘로 바꾸기');
  // On a PC the game is in a phone-shaped frame (src/shell.js) unless the wide view was
  // chosen; a phone has neither, and is not offered the switch.
  const inFrame = window.self !== window.top;
  const wideChosen = loadScreen() === 'wide';
  if (inFrame || wideChosen) {
    $('screenTerm').hidden = false;
    $('screenRow').hidden = false;
    $('screenNow').textContent = inFrame ? t('지금: 휴대전화와 같은 세로 화면.') : t('지금: 창을 가득 채운 넓은 화면.');
    $('screenButton').textContent = inFrame ? t('넓은 화면으로 바꾸기') : t('세로 화면으로 바꾸기');
    $('screenButton').addEventListener('click', () => {
      saveScreen(inFrame ? 'wide' : 'phone');
      window.top.location.reload();
    });
  }
  $('layoutButton').addEventListener('click', () => {
    saveLayout(layout === 'today' ? 'tour' : 'today');
    location.reload();
  });
  // The feel of speed: switched at once, no restart.
  const showFeel = () => {
    $('feelNow').textContent = feel ? t('지금: 켜짐.') : t('지금: 꺼짐.');
    $('feelButton').textContent = feel ? t('끄기') : t('켜기');
  };
  showFeel();
  $('feelButton').addEventListener('click', () => {
    feel = !feel;
    saveFeel(feel);
    showFeel();
  });
  // Another window in front: the keys held are let go (their keyups never arrive), and
  // the flight goes on.
  window.addEventListener('blur', () => input.clear());
  // The screen put away (another app, another tab): the game waits, and goes on by
  // itself when the screen is back. (Until 2026-10-03 it stayed paused until the play
  // button was pressed.) A pause the player made, or a dialog's, is left as it was.
  let awayPaused = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      awayPaused = !paused;
      if (awayPaused) setPaused(true);
    } else {
      if (awayPaused && paused) setPaused(false);
      awayPaused = false;
    }
  });
  window.addEventListener('resize', () => world.resize());
  if (matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0) document.body.classList.add('touch');

  $('loading').style.display = 'none';
  document.body.dataset.ready = 'true';
  if (!glowsTold.has('start') && !resume) {
    markTold('start');
    toast.show(t`${here(selectedId).name} 근처에 도착했습니다. 드래그로 둘러보세요.`);
  }
  // The week of a real eclipse: say so each time the game is opened.
  if (eclipse) toast.show(t`${eclipseNews(openedAt)}\n"${eclipseTitle(eclipse)} 자리로" 단추를 누르면 그곳으로 갑니다.`);
  progressChanged(null);
  const touch = document.body.classList.contains('touch');
  const journalHow = touch ? t('수첩 버튼') : t('J 키나 수첩 버튼');
  const guideView = createGuideView({
    onSkip() {
      // The same button ends a stunt or a tour once the first-visit guide is over.
      if (guide.step === null) {
        if (stunt) quitStunt();
        else endTour();
        return;
      }
      guide = skipGuide(guide);
      saveGuideDone();
      guideView.show(null);
      toast.show(t`${journalHow}으로 탐험 목표를 확인하세요.`);
    },
    onJump() {
      const goal = tourGoal();
      if (goal && !paused) teleport(goal.targetId, true, true);
    },
  });
  // What the goal line points at: the guide's Moon, or a tour's next stop.
  const goalNow = () => (guide.step !== null ? guideGoal(guide, touch) : stunt ? stuntGoal() : tourGoal());
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
    // (That one long frame counts as no time; the flight goes on from the next.)
    const dt = paused || elapsed > MAX_FRAME_GAP_S ? 0 : elapsed;

    // Advance the orbits, carry the traveler with a nearby body, then fly.
    if (dt > 0) {
      const before = bodies;
      const craftBefore = craft;
      simTime += dt * TIME_SCALE;
      bodies = allAt(simTime);
      craft = craftAt(simTime, bodies);
      if (docked) {
        rideKmS = rideSpeed(docked.id, craftBefore, craft, before, bodies, dt);
        rideDrift = releaseDrift(docked.id, craftBefore, craft, before, bodies, state.position, dt);
      }
      sites = storySitesAt(simTime, bodies);
      if (eventPlace) Object.assign(eventPlace, eclipseSpotAt(simTime, bodies));
      state = carryAlong(state, before, bodies);
    }
    // Photo mode has a view of its own, which starts looking ahead.
    if (rear && photo.active()) setRear(false);
    const intent = input.intent();
    // Looking behind, up and down and the roll are the other way round for her body.
    if (rear) {
      intent.turnY = -intent.turnY;
      intent.roll = -intent.roll;
    }
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
    // (How far the locked target is before this step: sliding round it keeps that.)
    if (aimedId !== selectedId) aimedId = null;
    const guided = locked || aimedId !== null;
    const lockRange = guided ? Math.hypot(...here(selectedId).position.map((n, i) => n - state.position[i])) : 0;
    const lockFrom = guided ? state.position : null;
    const result = step(state, intent, dt, bodies, slowPoints);
    state = result.state;
    // Target lock: the view swings onto the target and stays on it as she moves. Turning
    // with the keys lets go; docked, going down to a place, looking behind or resting on
    // the target itself it waits.
    // (Only faced, not locked: the view is left alone and sliding is a plain slide, but
    // forward and back still go straight to the target and away.)
    if (guided && dt > 0 && !docked && !visit && !rear && !photo.active()) {
      if (intent.turnX !== 0 || intent.turnY !== 0 || intent.roll !== 0) {
        if (locked) unlock();
        aimedId = null;
      } else {
        const aim = here(selectedId);
        const toward = aim.position.map((n, i) => n - state.position[i]);
        if (Math.hypot(...toward) > 1 && state.restingOn !== aim.id) {
          // Only sliding (not going forward or back): she goes round it at the distance
          // she was at. A straight slide drew away: 1,900 km in 2.5 s beside Earth.
          const sliding = state.speed < 0.01 && Math.max(state.sideSpeed ?? 0, state.riseSpeed ?? 0) > 0.01;
          // Near the target the slide is held to half a radian a second round it
          // (core/game.js slideCap): at the speed the limit allowed she whirled.
          if (locked && sliding && lockRange > 1) {
            const slide = Math.hypot(state.sideSpeed ?? 0, state.riseSpeed ?? 0);
            const cap = slideCap(lockRange);
            if (slide > cap) state = { ...state, sideSpeed: ((state.sideSpeed ?? 0) * cap) / slide, riseSpeed: ((state.riseSpeed ?? 0) * cap) / slide };
          }
          let position = locked && sliding && !state.restingOn && lockRange > 1 ? keepRange(state.position, aim.position, lockRange) : state.position;
          // Only going forward or back: straight at the target or straight away from it,
          // though the view is tipped to keep it over her head (along the view she would
          // curl in round it).
          const went = Math.hypot(...state.position.map((n, i) => n - lockFrom[i]));
          if (!sliding && state.speed > 0.01 && went > 0 && !state.restingOn && lockRange > 1) {
            const along = Math.min(went, state.motionSign > 0 ? lockRange : Infinity) * state.motionSign;
            position = lockFrom.map((n, i) => n + ((aim.position[i] - n) / lockRange) * along);
          }
          // The view is swung onto the target from where it is, by the shortest turn
          // (core/orientation.js swingToward): built anew from world-up each frame it
          // span half round whenever she passed over or under the target.
          const orientation = locked ? swingToward(state.orientation, AIM_LINE, aim.position.map((n, i) => n - position[i]), 1 - Math.exp(-dt * LOCK_RATE)) : state.orientation;
          state = { ...state, position, orientation };
        }
      }
    }
    // The journal is of the Solar System: another star's planets are kept apart (below).
    const logged = updateProgress(progress, EXO_IDS.includes(state.restingOn) ? { ...state, restingOn: null } : state, bodies.filter((b) => !b.exo));
    const away = inExo(state.position);
    if (away && dt > 0) {
      const seenNow = recordExo(exo, state.position, bodies);
      if (seenNow.newly.length) {
        exo = seenNow.record;
        saveExo(exo);
        for (const id of seenNow.newly) toast.show(t`${here(id).name}\n${exoNote(id)}\n가까이에서 본 외계 행성 ${exo.seen.length}/${EXO_PLANETS.length}`, null, SIGHT_S);
        sound.cue('discovered');
        if (exo.seen.length === EXO_PLANETS.length) {
          toast.show(t('트라피스트-1의 행성 일곱을 모두 가까이에서 보았습니다.'));
          say.show(t('일곱 개 다 봤다! 할머니가 믿으실까?'));
        }
      }
    }
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
      toast.show(t`오늘의 부탁을 해냈습니다. 수첩에 별이 붙었습니다(해낸 날 ${daily.days.length}일${run > 1 ? t`, ${run}일째 이어서` : ''}).`);
      say.show(run > 0 && run % 7 === 0 ? t('일주일 내내 했어! 대단하지?') : t('부탁 끝! 할머니 좋아하시겠다.'));
      // Seven days running: a stamp of seven stars.
      if (run > 0 && run % 7 === 0) stampDown('notebook/stamp-week.png');
      sound.cue('discovered');
    }
    photoSubject = null;
    // A stunt under way (core/stunts.js): its clock, and its end.
    if (stunt) {
      const stepped = stepStunt(stunt, { position: state.position, restingOn: state.restingOn, bodies, jumped: stuntJumped, ring: ringHit, speedKmS: shownSpeed() }, dt);
      stunt = stepped.run;
      if (stepped.done !== null) finishStunt(stepped.done);
    }
    ringSkip = stuntJumped;
    stuntJumped = false;
    // A tour under way: at its next stop, Sora says her line and the tour moves on.
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
          toast.show(t`코스 "${leg.tour.name}"${objectParticle(leg.tour.name)} 다 돌았습니다. 수첩의 코스 갈래에 도장이 찍혔습니다.`, 'tour');
          // Not under the white of a jump: the stamp waits until the flash has cleared.
          const after = warp.busy() ? 3600 : 0;
          setTimeout(() => stampDown(stampFile(leg.tour)), after);
          if (all) setTimeout(() => stampDown(CRANE_FILE), after + 2600);
          if (all) toast.show(t('아홉 길을 모두 돌았습니다. 수첩 사이에서 할머니가 접어 둔 종이학이 나왔습니다.'));
        };
        // A story card is about to cover the view: celebrate once it is put away.
        if (cardDue) afterCard = finish;
        else finish();
      } else {
        aimAtStop();
        toast.show(t`${leg.tour.name} ${leg.step + 1}/${leg.tour.stops.length}: ${stopName(leg.stop)}에 왔습니다. 다음은 ${stopName(currentStop(progress).stop)}입니다.`, 'tour');
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
      // Somewhere new: Sora says her line (the same one the journal keeps).
      if (event.type === 'discovered' && MEMOS[event.bodyId] && !saidAtStop) say.show(MEMOS[event.bodyId].line);
      // A first landing: her line for standing there.
      if (event.type === 'landed' && LANDED[event.bodyId] && !saidAtStop) say.show(LANDED[event.bodyId]);
    }
    // With nothing to do a while (coasting, hovering, standing or riding a craft) she
    // talks to herself: about the world she is near, or the emptiness far from all of
    // them, and when those are said, whatever comes to mind.
    const atEase = dt > 0 && !input.driving() && !visit;
    idleFor = atEase ? idleFor + dt : (dt > 0 ? 0 : idleFor);
    idleQuiet = Math.max(0, idleQuiet - dt);
    if (idleFor >= IDLE_AFTER_S && idleQuiet === 0) {
      const nearby = nearestSurface(state.position, bodies);
      const topic = nearby.distance <= NEAR_RADII * nearby.body.radiusKm ? NEAR[nearby.body.id]
        : (nearby.distance >= DEEP_FROM_KM ? DEEP : null);
      if (!(topic && sayFresh(topic))) sayFresh(IDLE);
      idleFor = 0;
      idleQuiet = IDLE_GAP_S;
    }
    // A word on what she has just done: looked behind, saved a photo, come by a jump,
    // docked, passed the speed of light.
    {
      const speedC = totalSpeed(state) / C;
      const doing = { rear, photos: album.length, docked: Boolean(docked), speedC, position: state.position };
      if (lastDoing && dt > 0) {
        const leap = Math.hypot(...doing.position.map((n, i) => n - lastDoing.position[i]));
        if (doing.rear && !lastDoing.rear) sayFresh(REAR);
        else if (doing.photos > lastDoing.photos) sayFresh(PHOTO);
        else if (doing.docked && !lastDoing.docked) sayFresh(DOCK);
        // Farther in one frame than flying could take her: a jump.
        else if (leap > 1e4 && leap > totalSpeed(state) * dt * 20) sayFresh(JUMP);
        else {
          const fast = fastLine(lastDoing.speedC, speedC);
          if (fast && !saidLines.has(fast)) {
            saidLines.add(fast);
            say.show(fast);
          }
        }
      }
      lastDoing = doing;
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
    // Today's request comes on a sheet of its own as the day's play begins, and the
    // game waits until it is put away with its button (as a passing notice it was
    // gone in six seconds). Only the very first note, which opens the story, goes before it.
    const settled = dt > 0 && !noteCard.isOpen() && !cardDue && !storyCard.isOpen() && !warp.busy()
      && !(docked && !isDocked(docked)) && !(visit && !hasArrived(visit));
    // (After a note it waits out the gap between notes, so the first sitting does not
    // open sheet upon sheet.)
    // Nor does it come while one of her notes is due (landing on the Moon for the first
    // time, the request came up 20 s before the note of 1969), nor during the newcomer's
    // steps to the Moon (once she stands there and its note is read, it may).
    if (dailyDue && settled && noteWait === 0 && !note && (guide.step === null || guide.step === 'photo') && (progress.notes ?? []).length > 0) {
      dailyDue = false;
      noteCard.show({
        scene: t('수첩 사이에 오늘 날짜가 적힌 쪽지가 끼워져 있다.'),
        title: t('오늘의 부탁'),
        text: t`${request.text}\n\n수첩을 열면 다시 볼 수 있단다.`,
        button: t('확인'),
      });
    } else if (note && calm) {
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
        toast.show(t`첫 탐험을 마쳤습니다. ${journalHow}을 열고 코스 갈래에서 "${tourById('firstSteps').name}"을 골라 보세요.`);
      }
    }
    guideView.show(goalNow());

    const turn = dt > 0
      // Sliding sideways leans the character like a gentle turn; sliding up or down (the
      // slide pad) shows her nose up or down, for as long as she keeps going that way.
      ? [dragTurn[0] / dt + intent.turnX * TURN_RATE + intent.strafe * 0.6,
        dragTurn[1] / dt + intent.turnY * TURN_RATE - (!docked && (state.riseSpeed ?? 0) > 0.01 ? state.riseSign : 0) * 0.6]
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
      : (!docked && state.speed < 0.01 && (state.sideSpeed ?? 0) < 0.01 && (state.riseSpeed ?? 0) < 0.01 ? velocity(state) : null);
    if (carried && Math.hypot(...carried) > 1) {
      const local = rotateVector(conjugate(state.orientation), carried);
      const length = Math.hypot(...local);
      heading = local.map((n) => n / length);
    }
    // A day being played again: over when its time is up or the close view is left.
    let replayNow = null;
    if (replay) {
      replayNow = photo.orbit()?.id === replay.id ? replayFrame(replay.id, (performance.now() - replay.startedAt) / 1000) : null;
      if (!replayNow || replayNow.done) {
        replay = null;
        replayNow = null;
      } else if (replayNow.down && !replay.down) {
        replay.down = true;
        if (!replayNow.gone) sound.cue('landed');
      }
    }
    if (scenePlace) {
      // It turns with its body. When its scene is over the close view closes too (there
      // is nothing left there to look at), and it is forgotten once the view has left it.
      const ground = here(scenePlace.parent);
      scenePlace.position = ground.position.map((n, i) => n + scenePlace.up[i] * ground.radiusKm);
      if (!replay && photo.orbit()?.id === scenePlace.id) $('exitPhoto').click();
      if (photo.orbit()?.id !== scenePlace.id) scenePlace = null;
    }
    // While a day is played again nothing else is told: the notice and her bubble are
    // hidden (style.css), and the sights wait, so none is spent unseen.
    // An eclipse being watched: the Moon is put where this moment of it needs it. Over
    // when its time is up or the close view is left; the Moon then goes back to its orbit.
    if (show) {
      showNow = photo.orbit()?.id === show.id ? showFrame(eclipse, (performance.now() - show.startedAt) / 1000) : null;
      if (!showNow || showNow.done) {
        const watched = Boolean(showNow?.done);
        if (photo.orbit()?.id === show.id) $('exitPhoto').click();
        show = null;
        showNow = null;
        bodies = allAt(simTime);
        if (watched) {
          const first = !eclipsesSeen.seen.includes(eclipse.id);
          if (first) {
            eclipsesSeen = { seen: [...eclipsesSeen.seen, eclipse.id] };
            saveEclipses(eclipsesSeen);
          }
          toast.show(t`${eclipseDayText(eclipse)}의 ${eclipseTitle(eclipse)}${first ? t('을 보았습니다') : t('을 다시 보았습니다')}. 이번 주 동안 몇 번이든 볼 수 있습니다.`);
          say.show(eclipse.kind === 'lunar' ? t('달이 빨개졌어. 할머니한테 말해야지.') : eclipse.type === 'total' ? t('해가 사라졌어. 저 하얀 게 코로나구나.') : t('불반지다! 가운데가 까매.'));
        }
      } else stageMoon(showNow);
    }
    document.body.classList.toggle('replaying', Boolean(replay || show));
    if (replay || show) glowTellWait = Math.max(glowTellWait, 1);
    showInspectInfo();
    // The feel of speed: the view widens near the limit of the spot, and the stars draw
    // out from 2c. Photo mode and the close view keep their own view; docked or gliding
    // to a place she is carried, not flying.
    const flying = !docked && !visit;
    if (photo.active()) feelFov = BASE_FOV_DEG;
    else {
      feelFov = easeFovDeg(feelFov, feel && flying ? feelFovDeg(totalSpeed(state) / limit, canvas.height > canvas.width) : BASE_FOV_DEG, dt);
      world.setFov((feelFov * Math.PI) / 180);
    }
    const going = velocity(state);
    const goingKmS = Math.hypot(...going);
    const trail = feel && flying && !paused && goingKmS > 0
      ? { heading: going.map((n) => n / goingKmS), amount: streakAmount(goingKmS / C) }
      : null;
    const view = world.update({
      trail,
      replay: replayNow && replayForWorld(replayNow),
      bodies,
      craft,
      hiddenCraft: awayCraft,
      sites: scenePlace || eventPlace ? [...sites, ...(scenePlace ? [scenePlace] : []), ...(eventPlace ? [eventPlace] : [])] : sites,
      // A lunar eclipse being watched: Earth's shadow comes over the Moon from one side.
      eclipsed: show && showNow && eclipse.kind === 'lunar'
        ? { id: 'moon', direction: right(photo.orbit()?.orientation ?? state.orientation), amount: showNow.shade }
        : null,
      jolt: docked ? { id: docked.id, ...latchJolt(docked) } : null,
      position: state.position,
      orientation: state.orientation,
      dt,
      speed: shownSpeed(),
      photoOrientation: photo.orientation() ?? (rear ? REAR_VIEW : null),
      seen: orbitEye(),
      lamp: orbitLamp(),
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
        // Pointing at a sight just told of, and speaking while her bubble is up.
        see: performance.now() < seeUntil ? seeKind : null,
        talk: say.showing(),
        // The companion earned last (core/pal.js); drawn beside the sprite character only.
        pal: palFor({
          ...tally(), allTours: allToursDone(progress),
          allStunts: STUNTS.every((s) => stuntRecords[s.id] !== undefined),
          allPhotos: progress.photos.length >= MISSIONS.length,
        }),
        read: performance.now() < readUntil,
        // Getting up as soon as she moves off.
        sit: performance.now() < sitUntil && Boolean(visit) && hasArrived(visit),
        // The sitting drawing looks to her right: turned over when the probe is on her left.
        mirror: Boolean(visit) && rotateVector(conjugate(state.orientation), here(visit.id).position.map((n, i) => n - state.position[i]))[0] < 0,
        // Close over the Sun's surface it is too bright to look; out to half an AU in
        // full sunlight it is hot; in a planet's shadow, or out past Uranus, it is cold.
        bright: surfaceDistance(state.position, here('sun')) < BRIGHT_KM,
        hot: sunShown > 0.5 && surfaceDistance(state.position, here('sun')) < HOT_AU * AU_KM / 100,
        // (Not at another star: its seven planets are all close in to it.)
        cold: !away && (sunShown < 0.05 || surfaceDistance(state.position, here('sun')) > 19 * AU_KM / 100),
      },
    });
    sunShown = view.sunVisibility;
    hud.maskHero(view.heroCard);
    say.place(view.heroCard);
    ringHit = view.ringCrossed && !ringSkip ? { body: view.ringCrossed, t: view.ringAt } : null;
    if (ringHit) toast.show(t`${bodyById(view.ringCrossed).name} 고리를 지났습니다. 얼음 알갱이가 흩날립니다.`, null, SIGHT_S);
    glowTellWait = Math.max(0, glowTellWait - elapsed);
    if (view.meteorLit && !meteorSeen && glowTellWait === 0) {
      meteorSeen = true;
      markTold('meteor');
      glowTellWait = SIGHT_GAP_S;
      say.show(SIGHTS.meteor);
      seeKind = seeFor('meteor');
      seeUntil = performance.now() + SEE_S * 1000;
      toast.show(eventMessage({ type: 'meteor' }), null, SIGHT_S);
    }
    // Say why she shivers or shields her eyes: once each time she comes into the cold
    // or the glare, at the first such drawing.
    const sunKm = surfaceDistance(state.position, here('sun'));
    let feeling = null;
    if (view.heroSheet === 'hurt-bright') feeling = { type: 'tooBright' };
    else if (view.heroSheet === 'hot' || view.heroSheet === 'hot-wipe') feeling = { type: 'hot', au: sunKm * 100 / AU_KM };
    else if (view.heroSheet === 'cold') feeling = sunKm > 19 * AU_KM / 100 ? { type: 'coldFar', au: sunKm * 100 / AU_KM } : { type: 'coldShadow' };
    if (feeling && feelingTold !== feeling.type && !replay) {
      feelingTold = feeling.type;
      toast.show(eventMessage(feeling), null, SIGHT_S);
    }
    if (!docked && shownSpeed() > 1) feelingTold = null;
    // Lights and plumes, each told once on this device: a flash that is lit now, or of
    // the standing sights in reach the first not yet told; the next only SIGHT_GAP_S on.
    const sight = glowTellWait > 0 ? null
      : (view.glow && !glowsTold.has(view.glow) ? view.glow : view.glowsNear.find((id) => !glowsTold.has(id)));
    if (sight) {
      markTold(sight);
      glowTellWait = SIGHT_GAP_S;
      // Her own word under the notice that explains it, and a gesture toward it.
      if (SIGHTS[sight]) say.show(SIGHTS[sight]);
      seeKind = seeFor(sight);
      seeUntil = performance.now() + SEE_S * 1000;
      toast.show(eventMessage({ type: 'glow', id: sight }), null, SIGHT_S);
    }
    if (view.inBelt && !beltSeen && !replay) {
      beltSeen = true;
      markTold('belt');
      say.show(SIGHTS.belt);
      toast.show(eventMessage({ type: 'beltEntered' }), null, SIGHT_S);
    }
    world.render();

    if (frame++ % HUD_EVERY_N_FRAMES !== 0) return;
    const selected = here(selectedId);
    const driving = input.driving();
    let flightLabel = t('자유 비행');
    if (paused) flightLabel = t('일시 정지');
    else if (docked && !isDocked(docked)) flightLabel = t`${here(docked.id).name}에 도킹 중`;
    else if (docked) flightLabel = t`${here(docked.id).name}${withParticle(here(docked.id).name)} 함께 비행`;
    else if (visit && !hasArrived(visit)) flightLabel = t`${here(visit.id).name}에 착륙 중`;
    else if (visit) flightLabel = t`${here(visit.id).name} 곁`;
    else if (state.restingOn) flightLabel = t`${bodyById(state.restingOn).name} 표면`;
    else if (shownSpeed() < 0.01) flightLabel = t('정지 비행');
    else if (!driving) flightLabel = t('관성 비행');
    else if (Math.max(state.sideSpeed, state.riseSpeed ?? 0) > state.speed) flightLabel = (state.riseSpeed ?? 0) > state.sideSpeed ? (state.riseSign > 0 ? t('위로 비행') : t('아래로 비행')) : t('옆으로 비행');
    else if (state.motionSign < 0) flightLabel = t('후진 비행');
    journal.update(progress, state.position, bodies);
    // Not while she stands on the ground or is going down to a place: the station
    // passing overhead put a docking button over a launch pad. (Its name tag still docks.)
    const offer = docked || onGround() ? null : dockable(state.position, craft);
    $('dockTarget').hidden = !docked && !offer;
    // Standing at a place that has a scene of its day.
    const thenHere = visit ? (hasArrived(visit) ? replayFor(visit.id) : null) : (state.restingOn ? replayFor(replayOn(state.restingOn)) : null);
    // The week of a real eclipse: near its place the same button plays it, and from
    // elsewhere another jumps there.
    if (landAtEclipse && !warp.busy()) {
      landAtEclipse = false;
      // (A lunar eclipse is watched from the middle of the night side, which does not
      // turn with the ground: hovering there is enough.)
      if (eclipse.kind === 'solar' && !visit && !docked && canWatch(eclipse, eventPlace, here('sun'), state.position) !== 'far') goDownTo(eventPlace);
    }
    const watch = eclipse && (!visit || visit.id === eventPlace.id) && !photo.active() ? canWatch(eclipse, eventPlace, here('sun'), state.position) : null;
    const watchable = watch === 'yes' || watch === 'night';
    $('replayButton').hidden = !thenHere && !watchable;
    if (watchable) $('replayButton').textContent = watch === 'yes' ? t`${eclipseTitle(eclipse)} 보기` : t('해가 뜨면 일식을 볼 수 있습니다');
    else if (thenHere) $('replayButton').textContent = t`그날로 · ${thenHere.day}`;
    $('eclipseJump').hidden = watch !== 'far' || away;
    if (eclipse) $('eclipseJump').textContent = t`${eclipseTitle(eclipse)} 자리로`;
    // Latched to Kepler: the jump to the star it watched. There: the way home.
    $('exoJump').hidden = !away && !(docked?.id === 'kepler' && isDocked(docked));
    $('exoJump').textContent = away ? t('태양계로 돌아가기') : t('케플러가 본 별로');
    if (docked) $('dockTarget').textContent = t('도킹 풀기');
    else if (offer) $('dockTarget').textContent = t`${offer.name}에 도킹`;
    // In today's sky the game clock's date rides along with the flight state.
    if (layout === 'today') flightLabel += ` · ${dateText(new Date(openedAt.getTime() + simTime * 1000))}`;
    hud.update({
      view,
      local: nearestLocalBody(state.position, bodies),
      nearestIds: nearestBodies(state.position, bodies),
      moonIds: nearbyMoons(state.position, bodies),
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
      knownIds: new Set([...progress.discovered, ...(progress.craft ?? []), ...progress.stories, ...exo.seen, ...(exo.been ? [EXO_STAR.id] : []), ...(eventPlace ? [eventPlace.id] : [])]),
      hiddenIds: [
        // The other star is named only from there, and home is one name from there: the Sun.
        ...(away ? homeIds : EXO_IDS),
        ...sites.filter((s) => siteHidden(s, here(s.parent), state.position) || (s.id !== selectedId && siteFar(here(s.parent), state.position))).map((s) => s.id),
        ...awayCraft,
        // Whatever is behind a planet or a moon cannot be seen and gets no label (the
        // Sun says "가려짐" itself; the chosen target and the guide's goal stay).
        ...[...bodies, ...craft]
          .filter((t) => t.kind !== 'star' && t.id !== selectedId && t.id !== goalNow()?.targetId && behindBody(t, state.position, bodies))
          .map((t) => t.id),
        // Far off and beside the Sun: lost in its light (core/markers.js lostInGlare). Home
        // keeps its name from anywhere; so do the chosen target and the guide's goal.
        ...bodies
          .filter((b) => b.kind !== 'star' && b.id !== 'earth' && b.id !== selectedId && b.id !== goalNow()?.targetId && lostInGlare(b, state.position, bodyById('sun', bodies)))
          .map((b) => b.id),
      ],
    });
    minimap.draw({ bodies, position: state.position, heading: forward(state.orientation), selectedId, away });
    if ($('bigMap').open) bigMap.draw({ bodies, position: state.position, heading: forward(state.orientation), selectedId: mapPick ?? selectedId, away });
    $('lockTarget').setAttribute('aria-pressed', String(locked));
    $('lockTarget').textContent = locked ? t('고정 풀기') : t('목표 고정');
  });

  // As an app, the phone's back key puts away what is open before it leaves the game.
  createBackKey({ isView: () => photo.active(), leaveView: () => $('exitPhoto').click(), watch: [$('photoTools')] });

  // Read-only diagnostics for verification. No travel shortcuts.
  window.oddity = {
    getState: () => ({
      position: [...state.position],
      orientation: [...state.orientation],
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
    // For test scripts that must look at something from a chosen place: where the
    // bodies are now, and a way to stand at `position` (km) facing the point `toward`.
    bodies: () => bodies.map((b) => ({ id: b.id, position: [...b.position], radiusKm: b.radiusKm })),
    craft: () => craft.map((c) => ({ id: c.id, position: [...c.position] })),
    sites: () => sites.map((x) => ({ id: x.id, parent: x.parent, position: [...x.position] })),
    // Where she stands now, as a line for core/startSpots.js (a place the game may open at).
    spot: (bodyId = null) => toSpot(state, (bodyId && bodyById(bodyId, bodies)) || nearestSurface(state.position, bodies).body, bodyById('sun', bodies)),
    place(position, toward) {
      state = createState(position, lookAtDirection(toward.map((n, i) => n - position[i])));
    },
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
