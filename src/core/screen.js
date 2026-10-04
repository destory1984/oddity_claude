// On a wide window (a PC) the game is shown in a frame shaped like a phone held
// upright, so the one layout made for phones is what everyone sees. (src/shell.js puts
// the game in that frame; a real phone, already that shape, gets no frame.)

// The frame's own size in CSS pixels: what the page gets on the user's iPhone in Safari
// with its address bar and tool bar showing (402 wide, 657 tall; measured on a
// screenshot of 2026-10-05), so that a PC shows exactly what that phone shows. (It was
// the whole screen's shape, 9 to 19.5, and 375 to 480 wide by the window's height: a
// PC then showed a taller and wider picture than the phone did.)
export const PHONE_WIDTH = 402;
export const PHONE_HEIGHT = 657;
export const PHONE_RATIO = PHONE_WIDTH / PHONE_HEIGHT;
// A window wider than this for its height is not phone-shaped and gets the frame.
export const WIDE_RATIO = 0.62;
// A window lower than this is a phone held sideways: it keeps its own wide layout.
export const MIN_HEIGHT = 560;

// The frame for a window of the given size, or null when the window is itself about as
// narrow as a phone. Returns { width, height, scale }: the frame is laid out at
// width x height and then scaled so that it is exactly as tall as the window.
export function phoneFrame({ width, height }) {
  if (!(width > 0 && height >= MIN_HEIGHT) || width / height <= WIDE_RATIO) return null;
  return { width: PHONE_WIDTH, height: PHONE_HEIGHT, scale: height / PHONE_HEIGHT };
}
