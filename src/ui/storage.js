import { createProgress, sanitizeProgress } from '../core/progress.js';

const KEY = 'oddity.progress.v1';

// Storage can be missing or refuse writes (private windows, blocked site data).
// Every call is guarded; without storage the log lasts only for this page.
export function loadProgress(bodies, missions) {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(KEY)), bodies, missions);
  } catch {
    return createProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Keep playing; the log simply is not kept.
  }
}
