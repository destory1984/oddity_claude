export function controlIntent(keys, stickActive, flyingButton, reversingButton = false) {
  const forward = keys.has('KeyW') || stickActive || flyingButton ? 1 : 0;
  const reverse = keys.has('KeyS') || reversingButton ? 1 : 0;
  return {
    turnX: (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0),
    turnY: (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0),
    drive: forward - reverse,
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
