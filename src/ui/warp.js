// The flash that covers a jump (core/teleport.js), six seconds in all: streaks gather
// and rush out from the middle for 2.6 s, the screen stays white for 0.6 s while the
// traveler is moved, and the new place fades in over the last 2.8 s. The look is in style.css (#warp).
const TOTAL_MS = 6000;
// The screen is fully white from here; the traveler is moved at this moment.
const WHITE_MS = 2800;

export function createWarp(element) {
  let busy = false;
  return {
    busy: () => busy,
    // onWhite runs once, while nothing behind the flash can be seen.
    play(onWhite) {
      if (busy) return;
      busy = true;
      element.classList.remove('on');
      // Restart the animation even if it has just run.
      void element.offsetWidth;
      element.classList.add('on');
      setTimeout(onWhite, WHITE_MS);
      setTimeout(() => {
        element.classList.remove('on');
        busy = false;
      }, TOTAL_MS);
    },
  };
}
