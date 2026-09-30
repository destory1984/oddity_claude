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
