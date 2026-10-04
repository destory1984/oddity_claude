import { shouldCount, countUrl } from '../core/count.js';

// One visit told to the counter (core/count.js). It never holds the game up: no cookie
// goes with it, and a failure (offline, a blocker) is passed over in silence.
export function countVisit() {
  try {
    if (!shouldCount({ hostname: location.hostname, inFrame: window.self !== window.top, webdriver: navigator.webdriver === true })) return;
    const url = countUrl({
      path: location.pathname,
      title: document.title,
      referrer: document.referrer,
      screen: { width: screen.width, height: screen.height, scale: devicePixelRatio || 1 },
      rnd: Math.random().toString(36).slice(2, 8),
    });
    fetch(url, { mode: 'no-cors', credentials: 'omit', keepalive: true }).catch(() => {});
  } catch {
    // Counting is never worth an error on the player's screen.
  }
}
