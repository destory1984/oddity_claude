import { createProgress, sanitizeProgress } from '../core/progress.js';
import { sanitizeAlbum } from '../core/album.js';
import { createDaily, sanitizeDaily } from '../core/daily.js';

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

const HERO_KEY = 'oddity.hero.v1';

// Which character is drawn: 'sprite' (the pixel-art drawings, on trial as the default)
// unless the player chose 'model' (the folded-paper figure). `?hero=sprite` or `?hero=model` in the address wins.
export function loadHeroKind() {
  const asked = new URLSearchParams(location.search).get('hero');
  if (asked === 'sprite' || asked === 'model') return asked;
  try {
    return localStorage.getItem(HERO_KEY) === 'model' ? 'model' : 'sprite';
  } catch {
    return 'sprite';
  }
}

export function saveHeroKind(kind) {
  try {
    localStorage.setItem(HERO_KEY, kind);
  } catch {
    // The choice lasts only for this page.
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
