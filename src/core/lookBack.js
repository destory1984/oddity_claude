// Looking back: the photos of the album shown one after another, the oldest first, as
// the road she came (docs/재미-기획서.md 3.10, the ending). About half a minute in all,
// but no photo passes faster than it can be seen, nor stays too long.
export const LOOK_BACK_S = 30;
export const LOOK_MIN_S = 1.5;
export const LOOK_MAX_S = 4;

// album: newest first (core/album.js). Returns { photos: oldest first, each: seconds a photo stays }.
export function lookBackPlan(album, totalS = LOOK_BACK_S) {
  const photos = [...album].reverse();
  const each = photos.length ? Math.min(LOOK_MAX_S, Math.max(LOOK_MIN_S, totalS / photos.length)) : 0;
  return { photos, each };
}
