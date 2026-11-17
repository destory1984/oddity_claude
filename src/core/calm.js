// A minute at each point keeps the clock from resting on the same pixels all night.
export function clockOffset(now) {
  const angle = Math.floor(now / 60000) * Math.PI / 24;
  return { x: 12 * Math.cos(angle), y: 12 * Math.sin(angle) };
}

export function sleepState(deadline, now) {
  const fade = deadline === null ? 0 : Math.max(0, Math.min(1, (now - deadline) / 60000));
  return {
    minutes: deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 60000)),
    fade, music: 1 - fade, veil: 0.92 * fade, done: fade === 1,
  };
}

export function wallpaperSize(width, height, dpr, textureLimit) {
  const limit = Math.min(4096, textureLimit);
  const ratio = Math.min(3, dpr || 1, limit / width, limit / height);
  return { width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)) };
}
