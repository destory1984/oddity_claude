import { createProgress, sanitizeProgress } from '../core/progress.js';
import { sanitizeAlbum } from '../core/album.js';

const KEY = 'oddity.progress.v1';

// Storage can be missing or refuse writes (private windows, blocked site data).
// Every call is guarded; without storage the log lasts only for this page.
export function loadProgress(bodies, missions, stories, craft) {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(KEY)), bodies, missions, stories, craft);
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
