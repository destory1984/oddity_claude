// How large the journal's writing is: five sizes, chosen with the two buttons at its
// head (smaller, larger) and kept between visits. 1 is the size it was drawn at.
export const TEXT_SIZES = [0.85, 1, 1.15, 1.3, 1.5];
export const TEXT_SIZE_DEFAULT = 1;

// What was kept, or the default when it is not one of the sizes.
export function textSizeFrom(raw) {
  const n = Number(raw);
  return TEXT_SIZES.includes(n) ? n : TEXT_SIZE_DEFAULT;
}

// One size up (way = 1) or down (way = -1); the ends stay where they are.
export function nextTextSize(size, way) {
  const i = TEXT_SIZES.indexOf(textSizeFrom(size));
  return TEXT_SIZES[Math.max(0, Math.min(TEXT_SIZES.length - 1, i + Math.sign(way)))];
}

// Whether there is a size further that way (the button is dimmed when there is none).
export function canResize(size, way) {
  return nextTextSize(size, way) !== textSizeFrom(size);
}
