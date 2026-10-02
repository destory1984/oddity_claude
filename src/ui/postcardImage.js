// A photo from the album as a postcard picture, to keep or to send to someone: the photo
// on paper, and under it a band with where and when it was taken (core/postcard.js
// cardWords) and a stamp. Drawn at twice the small copy's size so the words stay sharp.
const SCALE = 2;
const PAD = 20 * SCALE;
const BAND = 84 * SCALE;
const STAMP = 56 * SCALE;
const PAPER = '#f6efdc';
const INK = '#3b2a1a';
const FADED = '#7a5a36';

const load = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('그림을 읽지 못했습니다'));
  img.src = src;
});

// entry: an album entry; words: { place, day }; stampUrl: the stamp's address.
// Resolves to a PNG blob.
export async function postcardBlob(entry, words, stampUrl) {
  const [photo, stamp] = await Promise.all([load(entry.image), load(stampUrl).catch(() => null)]);
  // Seora's own hand, as in her speech bubble.
  const family = getComputedStyle(document.documentElement).getPropertyValue('--seora').trim() || 'sans-serif';
  await document.fonts?.load(`${26 * SCALE}px ${family}`, words.place + words.day).catch(() => {});

  const w = photo.width * SCALE;
  const h = photo.height * SCALE;
  const canvas = document.createElement('canvas');
  canvas.width = w + PAD * 2;
  canvas.height = PAD + h + BAND;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(photo, PAD, PAD, w, h);
  ctx.strokeStyle = '#b79a6a';
  ctx.lineWidth = SCALE;
  ctx.strokeRect(PAD, PAD, w, h);

  let room = w;
  if (stamp) {
    // The stamps are small pixel drawings: keep their edges.
    ctx.imageSmoothingEnabled = false;
    // Its own paper edge is the colour of the card: a soft shadow lifts it off.
    ctx.shadowColor = '#3b2a1a66';
    ctx.shadowBlur = 3 * SCALE;
    ctx.shadowOffsetY = SCALE;
    ctx.drawImage(stamp, canvas.width - PAD - STAMP, PAD + h + (BAND - STAMP) / 2, STAMP, STAMP);
    ctx.shadowColor = 'transparent';
    room -= STAMP + 12 * SCALE;
  }
  // A line too long for the band is set smaller until it fits.
  const write = (text, size, y, colour) => {
    let px = size * SCALE;
    ctx.font = `${px}px ${family}`;
    while (px > 10 * SCALE && ctx.measureText(text).width > room) {
      px -= SCALE;
      ctx.font = `${px}px ${family}`;
    }
    ctx.fillStyle = colour;
    ctx.fillText(text, PAD, PAD + h + y * SCALE);
  };
  ctx.textBaseline = 'alphabetic';
  write(words.place, 26, 38, INK);
  write(words.day, 18, 64, FADED);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지 생성 실패'))), 'image/png');
  });
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
