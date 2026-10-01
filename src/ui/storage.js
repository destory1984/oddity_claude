import { createProgress, sanitizeProgress } from '../core/progress.js';

const KEY = 'oddity.progress.v1';

// Storage can be missing or refuse writes (private windows, blocked site data).
// Every call is guarded; without storage the log lasts only for this page.
export function loadProgress(bodies, missions, stories) {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(KEY)), bodies, missions, stories);
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

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Keep playing; the log simply is not kept.
  }
}
