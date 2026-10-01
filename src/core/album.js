// The photo album: small copies of the photos the traveler saved, newest first, with
// where each was taken and which photo missions it met. Kept in the browser (ui/storage.js).

// Each small copy is about 40 KB, so this many fit comfortably in browser storage.
export const ALBUM_MAX = 24;
export const THUMB_WIDTH = 480;

// entry: { at: ISO time, where: '달 상공 1,200km', missions: [mission ids], image: data URL }
export function addPhoto(album, entry, max = ALBUM_MAX) {
  return [entry, ...album].slice(0, max);
}

export function removePhoto(album, index) {
  return album.filter((_, i) => i !== index);
}

// Stored data may be old, edited or broken: keep only well-formed entries.
export function sanitizeAlbum(raw, missions = []) {
  if (!Array.isArray(raw)) return [];
  const known = new Set(missions.map((m) => m.id));
  return raw
    .filter((e) => e && typeof e === 'object'
      && typeof e.image === 'string' && e.image.startsWith('data:image/jpeg;base64,')
      && typeof e.at === 'string' && !Number.isNaN(Date.parse(e.at))
      && typeof e.where === 'string')
    .map((e) => ({
      at: e.at,
      where: e.where.slice(0, 60),
      missions: Array.isArray(e.missions) ? [...new Set(e.missions.filter((id) => known.has(id)))] : [],
      image: e.image,
    }))
    .slice(0, ALBUM_MAX);
}

// The lines under a photo: the day and place, then each mission it met with that
// mission's recipe (which names the famous photo it follows).
export function photoCaption(entry, missions) {
  const day = entry.at.slice(0, 10);
  const met = entry.missions
    .map((id) => missions.find((m) => m.id === id))
    .filter(Boolean)
    .map((m) => ({ name: m.name, hint: m.hint }));
  return { title: `${day} · ${entry.where}`, met };
}

// The small copy's size for a view of the given size: THUMB_WIDTH wide, same shape.
export function thumbSize(width, height) {
  const w = Math.min(THUMB_WIDTH, width);
  return { width: w, height: Math.max(1, Math.round((height * w) / width)) };
}
