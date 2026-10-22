// Earth's clouds as they really were yesterday (the user, 2026-10-19, of three looks laid
// side by side: "A 넣어"): the day's pictures of the whole Earth from two weather
// satellites (VIIRS on Suomi NPP and NOAA-20, NASA's GIBS, public domain), the clouds
// picked out of them here in the page, the gaps between the satellites' passes filled
// with the game's own cloud map. Nothing is kept: it is made again at each start. When
// the pictures cannot be had (no network) the game's own map stays.

const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0'
  + '&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&STYLES=&FORMAT=image/jpeg';
const LAYERS = ['VIIRS_SNPP_CorrectedReflectance_TrueColor', 'VIIRS_NOAA20_CorrectedReflectance_TrueColor'];
const W = 2048;
const H = 1024;

// The day before nowMs, as GIBS names it (UTC): yesterday's pictures are whole.
export function cloudDay(nowMs) {
  return new Date(nowMs - 86400000).toISOString().slice(0, 10);
}

export function gibsUrl(layer, day) {
  return `${GIBS}&LAYERS=${layer}&TIME=${day}`;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// How white and grey a pixel is, 0..1: clouds, not land, sea or deserts.
export function whiteness(r, g, b) {
  const lo = Math.min(r, g, b);
  const hi = Math.max(r, g, b);
  const sat = (hi - lo) / Math.max(hi, 1e-3);
  return smooth(0.2, 0.95, lo) * (1 - smooth(0.1, 0.3, sat));
}

function picture(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('picture'));
    image.src = url;
  });
}

// GIBS answered its first request for a day's picture with "504 Gateway Time-out" (and
// without the header that lets the page read it) on 2026-10-19 at night; a minute later
// the same address gave the picture. So a picture that could not be had is asked for once
// more, about a minute later, and no more; the game's own clouds stay meanwhile.
export const RETRY_MS = 60000;

// The pictures that could be had (in the order of urls; those not had are left out), each
// asked for again once after `wait` ms if the first try failed.
export async function picturesWithRetry(urls, { load = picture, wait = RETRY_MS, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const first = await Promise.allSettled(urls.map((url) => load(url)));
  const missed = urls.filter((_, i) => first[i].status !== 'fulfilled');
  let again = [];
  if (missed.length) {
    await sleep(wait);
    again = await Promise.allSettled(missed.map((url) => load(url)));
  }
  let next = 0;
  return first.map((shot) => (shot.status === 'fulfilled' ? shot : again[next++]))
    .filter((shot) => shot.status === 'fulfilled')
    .map((shot) => shot.value);
}

function pixels(image, w = W, h = H) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const pen = canvas.getContext('2d', { willReadFrequently: true });
  pen.drawImage(image, 0, 0, w, h);
  return pen.getImageData(0, 0, w, h).data;
}

// The cloud map (a canvas, white clouds on black, as public/assets/earth-clouds.webp), or
// null. groundUrl: the day map (its ice and snow are not clouds); ownUrl: the game's own
// cloud map, for the gaps.
export async function realCloudMap({ nowMs = Date.now(), groundUrl, ownUrl }) {
  const day = cloudDay(nowMs);
  const got = (await picturesWithRetry(LAYERS.map((layer) => gibsUrl(layer, day)))).map((image) => pixels(image));
  if (!got.length) return null;
  const [ground, own] = await Promise.all([picture(groundUrl), picture(ownUrl)]).then((both) => both.map((image) => pixels(image)));
  const n = W * H;
  const cloud = new Float32Array(n);
  const seen = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i += 1) {
    const k = i * 4;
    const ice = smooth(0.55, 0.8, Math.min(ground[k], ground[k + 1], ground[k + 2]) / 255);
    let sum = 0;
    let count = 0;
    for (const shot of got) {
      const r = shot[k] / 255;
      const g = shot[k + 1] / 255;
      const b = shot[k + 2] / 255;
      // (Black where a satellite did not pass.)
      if (Math.max(r, g, b) <= 0.03) continue;
      sum += whiteness(r, g, b) * (1 - 0.85 * ice);
      count += 1;
    }
    cloud[i] = count ? sum / count : 0;
    seen[i] = count ? 255 : 0;
  }
  // The edge of the gaps feathered: the mask of where a satellite passed, drawn small and
  // drawn back large, comes out blurred some thirty pixels each way.
  const mask = document.createElement('canvas');
  mask.width = W;
  mask.height = H;
  const maskData = new ImageData(W, H);
  for (let i = 0; i < n; i += 1) {
    maskData.data[i * 4] = seen[i];
    maskData.data[i * 4 + 3] = 255;
  }
  mask.getContext('2d').putImageData(maskData, 0, 0);
  const small = document.createElement('canvas');
  small.width = W / 32;
  small.height = H / 32;
  const smallPen = small.getContext('2d');
  smallPen.imageSmoothingQuality = 'high';
  smallPen.drawImage(mask, 0, 0, small.width, small.height);
  const soft = document.createElement('canvas');
  soft.width = W;
  soft.height = H;
  const softPen = soft.getContext('2d', { willReadFrequently: true });
  softPen.imageSmoothingQuality = 'high';
  softPen.drawImage(small, 0, 0, W, H);
  const weight = softPen.getImageData(0, 0, W, H).data;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const outPen = out.getContext('2d');
  const result = outPen.createImageData(W, H);
  for (let i = 0; i < n; i += 1) {
    // Inside a gap and close to its edge the game's own clouds. The blurred mask is a half
    // at the gap's edge: the satellites' share goes from nothing there to all some fifty
    // pixels in. (It was 0.8 at the edge and dropped to nothing across it: a straight
    // seam on the globe, the user, 2026-10-22, over the Pacific: "지구에 금이 생겼어".)
    // And at longitude 180°, where each day's picture changes its date and the blur does
    // not wrap round, they give way to the game's own over the last 48 pixels (about 8°)
    // each side (the review, 2026-10-22: a straight north-south line in the Pacific).
    const x = i % W;
    const dateline = Math.min(1, Math.min(x, W - 1 - x) / 48);
    const w = seen[i] ? Math.min(1, Math.max(0, (weight[i * 4] / 255 - 0.5) * 2.5)) * dateline : 0;
    const v = (cloud[i] * w + (own[i * 4] / 255) * (1 - w)) ** 1.15;
    const byte = Math.round(Math.min(1, v) * 255);
    result.data[i * 4] = byte;
    result.data[i * 4 + 1] = byte;
    result.data[i * 4 + 2] = byte;
    result.data[i * 4 + 3] = 255;
  }
  outPen.putImageData(result, 0, 0);
  return out;
}
