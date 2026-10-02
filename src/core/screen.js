// On a wide window (a PC) the game is shown in a frame shaped like a phone held
// upright, so the one layout made for phones is what everyone sees. (src/shell.js puts
// the game in that frame; a real phone, already that shape, gets no frame.)

// Width over height of the frame: 9 to 19.5, as on most phones.
export const PHONE_RATIO = 9 / 19.5;
// The frame's own width in CSS pixels: no narrower than a small phone (the six top
// buttons need it), no wider than the phone layout's breakpoint in style.css.
export const PHONE_MIN_WIDTH = 375;
export const PHONE_MAX_WIDTH = 480;
// A window wider than this for its height is not phone-shaped and gets the frame.
export const WIDE_RATIO = 0.62;
// A window lower than this is a phone held sideways: it keeps its own wide layout.
export const MIN_HEIGHT = 560;

// The frame for a window of the given size, or null when the window is itself about as
// narrow as a phone. Returns { width, height, scale }: the frame is laid out at
// width x height and then scaled so that it is exactly as tall as the window.
export function phoneFrame({ width, height }) {
  if (!(width > 0 && height >= MIN_HEIGHT) || width / height <= WIDE_RATIO) return null;
  const w = Math.min(PHONE_MAX_WIDTH, Math.max(PHONE_MIN_WIDTH, Math.round(height * PHONE_RATIO)));
  const h = Math.round(w / PHONE_RATIO);
  return { width: w, height: h, scale: height / h };
}
