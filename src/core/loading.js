// The loading screen stays up at least this long, however fast the game is ready: it
// carries the title, the picture and the version, and on a fast connection it was gone
// before any of it could be read.
export const LOADING_MIN_MS = 3000;

// How much longer to keep it up, given the milliseconds since the page began to load.
export function loadingWait(sinceStartMs, minMs = LOADING_MIN_MS) {
  return Math.max(0, minMs - Math.max(0, sinceStartMs));
}
