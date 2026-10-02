// The photo album: small copies of the photos the traveler saved, newest first, with
// where each was taken and which photo missions it met. Kept in the browser (ui/storage.js).

// Each small copy is about 40 KB, so this many fit comfortably in browser storage.
export const ALBUM_MAX = 24;
export const THUMB_WIDTH = 480;

// entry: { at: ISO time, where: '달 상공 1,200km', missions: [mission ids], image: data URL }
// and, for postcards (core/postcard.js): rate { stars, subject }, sent 'YYYY-MM-DD',
// reply (grandmother's words, once they have come).
// When the album is full the oldest photo goes, but a postcard still waiting for its
// reply is kept as long as anything else can go instead.
export function addPhoto(album, entry, max = ALBUM_MAX) {
  const all = [entry, ...album];
  while (all.length > max) {
    const waiting = (e) => e.sent && !e.reply;
    let drop = all.length - 1;
    while (drop > 0 && waiting(all[drop])) drop -= 1;
    all.splice(drop > 0 ? drop : all.length - 1, 1);
  }
  return all;
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
    .map((e) => {
      const entry = {
        at: e.at,
        where: e.where.slice(0, 60),
        missions: Array.isArray(e.missions) ? [...new Set(e.missions.filter((id) => known.has(id)))] : [],
        image: e.image,
      };
      const stars = e.rate?.stars;
      if ([0, 1, 2, 3].includes(stars)) entry.rate = { stars, subject: typeof e.rate.subject === 'string' ? e.rate.subject.slice(0, 20) : null };
      if (typeof e.sent === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.sent)) {
        entry.sent = e.sent;
        if (typeof e.reply === 'string' && e.reply) entry.reply = e.reply.slice(0, 200);
      }
      return entry;
    })
    .slice(0, ALBUM_MAX);
}

// The lines under a photo: the day and place, then each mission it met with that
// mission's recipe (which names the famous photo it follows).
export function photoCaption(entry, missions) {
  // The day by the local calendar: a photo taken at dawn in Korea is still the day
  // before by the stored (UTC) time.
  const at = new Date(entry.at);
  const two = (n) => String(n).padStart(2, '0');
  const day = `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`;
  const met = entry.missions
    .map((id) => missions.find((m) => m.id === id))
    .filter(Boolean)
    .map((m) => ({ name: m.name, hint: m.hint }));
  return { title: `${day} · ${entry.where}`, met };
}

// Where a photo was taken, for its caption: beside a craft, or over the nearest body with
// the height. Far out the plain number grows too long to read ("명왕성 상공
// 212,468,948km"), so from 100,000 km it is told in 만 and 억, as a distance from the body.
export function photoPlace(label, altitudeKm, craftName = null) {
  if (craftName) return `${craftName} 곁`;
  const km = Math.round(altitudeKm);
  if (km < 1e5) return `${label} ${km.toLocaleString('ko-KR')}km`;
  const from = label.replace(/ 상공$/, '에서');
  return km >= 1e8 ? `${from} ${(km / 1e8).toFixed(1)}억km` : `${from} ${Math.round(km / 1e4).toLocaleString('ko-KR')}만km`;
}

// The small copy's size for a view of the given size: THUMB_WIDTH wide, same shape.
export function thumbSize(width, height) {
  const w = Math.min(THUMB_WIDTH, width);
  return { width: w, height: Math.max(1, Math.round((height * w) / width)) };
}
