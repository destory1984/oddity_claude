import { LANG_KEY } from '../core/i18n.js';
import { sanitizeExo } from '../core/exo.js';
import { sanitizeEclipses } from '../core/eclipses.js';
import { createProgress, sanitizeProgress } from '../core/progress.js';
import { sanitizeAlbum } from '../core/album.js';
import { createDaily, sanitizeDaily } from '../core/daily.js';
import { sanitizeStunts } from '../core/stunts.js';
import { sanitizeViews } from '../core/viewCards.js';

const KEY = 'oddity.progress.v1';

// Storage can be missing or refuse writes (private windows, blocked site data).
// Every call is guarded; without storage the log lasts only for this page.
export function loadProgress(bodies, missions, stories, craft, notes, tours) {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(KEY)), bodies, missions, stories, craft, notes, tours);
  } catch {
    return createProgress();
  }
}

const GUIDE_KEY = 'oddity.guide.v1';

// Whether the first-visit guide was finished or skipped before.
export function loadGuideDone() {
  try {
    return localStorage.getItem(GUIDE_KEY) === 'done';
  } catch {
    return false;
  }
}

export function saveGuideDone() {
  try {
    localStorage.setItem(GUIDE_KEY, 'done');
  } catch {
    // The guide simply shows again next time.
  }
}

const TEXT_KEY = 'oddity.text.v1';

// How large the journal's writing is (core/textSize.js); the raw kept value, or null.
export function loadTextSize() {
  try {
    return localStorage.getItem(TEXT_KEY);
  } catch {
    return null;
  }
}

export function saveTextSize(size) {
  try {
    localStorage.setItem(TEXT_KEY, String(size));
  } catch {
    // The size simply is not kept.
  }
}

const LAYOUT_KEY = 'oddity.layout.v1';

// 'tour' (the hand-made layout) unless the player chose today's sky.
export function loadLayout() {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'today' ? 'today' : 'tour';
  } catch {
    return 'tour';
  }
}

export function saveLayout(layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // The choice simply does not stick.
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Keep playing; the log simply is not kept.
  }
}

const ALBUM_KEY = 'oddity.album.v1';

export function loadAlbum(missions) {
  try {
    return sanitizeAlbum(JSON.parse(localStorage.getItem(ALBUM_KEY)), missions);
  } catch {
    return [];
  }
}

// Returns the album as stored. If the browser is out of room, the oldest photos are
// dropped until it fits (or nothing is kept).
export function saveAlbum(album) {
  let keep = album;
  for (;;) {
    try {
      localStorage.setItem(ALBUM_KEY, JSON.stringify(keep));
      return keep;
    } catch {
      if (keep.length === 0) return keep;
      keep = keep.slice(0, -1);
    }
  }
}

const DAILY_KEY = 'oddity.daily.v1';

// The days today's request was done (core/daily.js).
export function loadDaily() {
  try {
    return sanitizeDaily(JSON.parse(localStorage.getItem(DAILY_KEY)));
  } catch {
    return createDaily();
  }
}

export function saveDaily(daily) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
  } catch {
    // The star lasts only for this page.
  }
}

const STUNT_KEY = 'oddity.stunts.v1';

// The best of each stunt flight (core/stunts.js).
export function loadStunts() {
  try {
    return sanitizeStunts(JSON.parse(localStorage.getItem(STUNT_KEY)));
  } catch {
    return {};
  }
}

export function saveStunts(records) {
  try {
    localStorage.setItem(STUNT_KEY, JSON.stringify(records));
  } catch {
    // The record lasts only for this page.
  }
}

const VIEWS_KEY = 'oddity.views.v1';

// The picture postcards got and the auroras stood in (core/viewCards.js).
export function loadViews() {
  try {
    return sanitizeViews(JSON.parse(localStorage.getItem(VIEWS_KEY)));
  } catch {
    return sanitizeViews(null);
  }
}

export function saveViews(views) {
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    // They last only for this page.
  }
}

const TOLD_KEY = 'oddity.told.v1';

// The notices already given today on this device (sights near a world, the first
// shooting star, the belt, how to look round): each is given once a day, not at every
// opening. day: 'YYYY-MM-DD' by the player's own calendar.
export function loadTold(day) {
  try {
    const raw = JSON.parse(localStorage.getItem(TOLD_KEY));
    if (!raw || raw.day !== day || !Array.isArray(raw.ids)) return [];
    return raw.ids.filter((id) => typeof id === 'string').slice(0, 200);
  } catch {
    return [];
  }
}

export function saveTold(ids, day) {
  try {
    localStorage.setItem(TOLD_KEY, JSON.stringify({ day, ids }));
  } catch {
    // They are told again next time.
  }
}

const SCREEN_KEY = 'oddity.screen.v1';

// On a wide window the game is shown in a phone-shaped frame (core/screen.js) unless
// the player chose 'wide'.
export function loadScreen() {
  try {
    return localStorage.getItem(SCREEN_KEY) === 'wide' ? 'wide' : 'phone';
  } catch {
    return 'phone';
  }
}

export function saveScreen(choice) {
  try {
    localStorage.setItem(SCREEN_KEY, choice);
  } catch {
    // The choice simply does not stick.
  }
}

const FEEL_KEY = 'oddity.feel.v1';

// The feel of speed (core/speedFeel.js) is on unless the player turned it off.
export function loadFeel() {
  try {
    return localStorage.getItem(FEEL_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveFeel(on) {
  try {
    localStorage.setItem(FEEL_KEY, on ? 'on' : 'off');
  } catch {
    // The choice simply does not stick.
  }
}

const EXO_KEY = 'oddity.exo.v1';
const ECLIPSE_KEY = 'oddity.eclipse.v1';

// The trip to another star (core/exo.js): whether she has been, and the planets seen.
export function loadExo() {
  try {
    return sanitizeExo(JSON.parse(localStorage.getItem(EXO_KEY)));
  } catch {
    return sanitizeExo(null);
  }
}

// The real eclipses watched (core/eclipses.js).
export function loadEclipses() {
  try {
    return sanitizeEclipses(JSON.parse(localStorage.getItem(ECLIPSE_KEY)));
  } catch {
    return sanitizeEclipses(null);
  }
}

export function saveEclipses(record) {
  try {
    localStorage.setItem(ECLIPSE_KEY, JSON.stringify(record));
  } catch {
    // The record lasts only until the page is closed.
  }
}

export function saveExo(record) {
  try {
    localStorage.setItem(EXO_KEY, JSON.stringify(record));
  } catch {
    // The record lasts only until the page is closed.
  }
}

// The language chosen in the settings (one of LANGUAGES); until one is chosen the device's
// own language decides (core/i18n.js).
export function saveLanguage(choice) {
  try {
    localStorage.setItem(LANG_KEY, choice);
  } catch {
    // The choice simply does not stick.
  }
}

// Where she was when the language was changed: the game starts again in the other
// language (its sentences are made as the code loads) and carries on from this place.
// Kept for the tab only, and taken once.
// Also kept when a link out of the game is pressed (About: Carl Sagan's page, the privacy
// page): where such a link opens in the same window, coming back loads the game anew
// (the user, 2026-10-07: "백버튼 누르면, 게임이 완전히 새로 시작하네"). `until` (ms): after
// that moment the place is forgotten, so that a link that opened a new window does not
// decide where a much later reload begins.
const RESUME_KEY = 'oddity.resume';

export function saveResume(place) {
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(place));
  } catch {
    // The game then starts from its first place.
  }
}

export function takeResume() {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    const place = raw ? JSON.parse(raw) : null;
    const numbers = (list, n) => Array.isArray(list) && list.length === n && list.every(Number.isFinite);
    if (place && Number.isFinite(place.until) && Date.now() > place.until) return null;
    if (!place || !numbers(place.position, 3) || !Array.isArray(place.orientation) || !place.orientation.every(Number.isFinite)) return null;
    return { position: place.position, orientation: place.orientation, simTime: Number.isFinite(place.simTime) ? place.simTime : 0, selectedId: typeof place.selectedId === 'string' ? place.selectedId : null, tab: typeof place.tab === 'string' ? place.tab : null };
  } catch {
    return null;
  }
}

// The flight practice (core/practice.js): asked: a newcomer has been offered it once;
// button: its button is kept at the top of the screen (the player may put it away).
const PRACTICE_KEY = 'oddity.practice.v1';

export function loadPractice() {
  try {
    const kept = JSON.parse(localStorage.getItem(PRACTICE_KEY));
    return { asked: Boolean(kept?.asked), button: kept?.button !== false };
  } catch {
    return { asked: false, button: true };
  }
}

export function savePractice(value) {
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify({ asked: Boolean(value.asked), button: value.button !== false }));
  } catch {
    // It is then offered again at the next opening.
  }
  return value;
}
