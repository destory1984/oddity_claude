export function controlIntent(keys, flyingButton, reversingButton = false) {
  const forward = keys.has('KeyW') || flyingButton ? 1 : 0;
  const reverse = keys.has('KeyS') || reversingButton ? 1 : 0;
  // The arrow keys slide her across the view (left and right as A and D do, and up and
  // down); they do not turn it. They turned it until 2026-10-04, when the slide pad was
  // drawn as arrow keys on the screen and the user had the real ones do the same ("PC는
  // 커서키로 이동시켜"). The view is turned by dragging.
  const side = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  return {
    turnX: 0,
    turnY: 0,
    drive: forward - reverse,
    strafe: side,
    rise: (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0),
  };
}

// Keys a focused range slider may keep; everything else goes to flight.
export function rangeKeepsKey(code) {
  return code === 'Home' || code === 'End';
}

// Browser shortcuts (Ctrl+S, Cmd+W...) must not leave a flight key held: on macOS
// the letter's keyup never arrives while Cmd is down.
export function tracksKey(event) {
  return !(event.ctrlKey || event.altKey || event.metaKey);
}
