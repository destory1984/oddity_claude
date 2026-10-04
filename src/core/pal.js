// The small thing that floats beside Sora (docs/art-order-story-2.md): one is earned
// at 40, 80 and 120 filled slots, for all the stunts, for all the photo missions, when
// the journal is full, and when all nine tours are gone round. The one earned last in this order is the one that shows.
// Drawings: public/assets/pals/pal-<id>-1.png to -4.png, four a second.
export const PALS = [
  { id: 'star', name: '작은 별', slots: 40 },
  { id: 'saturn', name: '작은 토성', slots: 80 },
  { id: 'voyager', name: '작은 보이저', slots: 120 },
  // Two more, drawn to order on 2026-10-04: for a record in all four stunt flights, and
  // for all the photo missions.
  { id: 'comet', name: '작은 혜성', stunts: true },
  { id: 'aurora', name: '작은 오로라', photos: true },
  { id: 'earth', name: '작은 지구', full: true },
  { id: 'crane', name: '종이학', tours: true },
];
export const PAL_FPS = 4;
export const PAL_FRAMES = 4;

// done, total: journal slots filled, out of how many. allTours: every tour gone round.
// allStunts: a record in every stunt flight. allPhotos: every photo mission met.
// Returns the pal's id, or null before the first is earned.
export function palFor({ done, total, allTours, allStunts = false, allPhotos = false }) {
  const earned = PALS.filter((p) => (p.tours ? allTours : p.stunts ? allStunts : p.photos ? allPhotos : p.full ? done >= total : done >= p.slots));
  return earned.length ? earned[earned.length - 1].id : null;
}

export function palFile(id, frame) {
  return `pals/pal-${id}-${frame + 1}.png`;
}
