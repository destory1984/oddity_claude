// Sora going away in 우주멍 and coming back, drawn over her on a sheet of its own (the
// user, 2026-10-19: "우주멍에서 소라가 없어지는 애니를 좀 더 예쁘게 넣어보자"; of six ways
// offered, "2,6 만들어줘"): she breaks into twinkling star dust that drifts up, or a soap
// bubble closes round her and floats off and pops. Coming back runs the same backwards.
// The picture of her is taken from her own sheet as she goes, and used again to bring her
// back (she is not drawn while away).
import { seeded } from '../core/seeded.js';

const DUST_S = 1.9;
const BUBBLE_S = 2.1;
// Of the bubble's time: closing round her, then rising, then the pop.
const CLOSE = 0.16;
const POP = 0.82;

const ease = (x) => x * x * (3 - 2 * x);

// Her picture: the part of `sheet` (a canvas the size of the screen) she is drawn on, as a
// canvas and its place in css px, or null when nothing of her shows.
export function cutOut(sheet) {
  const w = sheet.clientWidth || window.innerWidth;
  const h = sheet.clientHeight || window.innerHeight;
  const copy = document.createElement('canvas');
  copy.width = Math.round(w);
  copy.height = Math.round(h);
  const pen = copy.getContext('2d', { willReadFrequently: true });
  pen.drawImage(sheet, 0, 0, copy.width, copy.height);
  const { data } = pen.getImageData(0, 0, copy.width, copy.height);
  let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
  for (let y = 0; y < copy.height; y += 2) {
    for (let x = 0; x < copy.width; x += 2) {
      if (data[(y * copy.width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2);
  y0 = Math.max(0, y0 - 2);
  const bw = Math.min(copy.width - x0, x1 - x0 + 4);
  const bh = Math.min(copy.height - y0, y1 - y0 + 4);
  const picture = document.createElement('canvas');
  picture.width = bw;
  picture.height = bh;
  picture.getContext('2d').drawImage(copy, x0, y0, bw, bh, 0, 0, bw, bh);
  return { picture, x: x0, y: y0, w: bw, h: bh };
}

// The picture of something drawn on a canvas of its own (the scanner), where it stands.
export function pictureOf(canvas) {
  const box = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(box.width));
  const h = Math.max(1, Math.round(box.height));
  const picture = document.createElement('canvas');
  picture.width = w;
  picture.height = h;
  picture.getContext('2d').drawImage(canvas, 0, 0, w, h);
  return { picture, x: box.left, y: box.top, w, h };
}

// Star dust: a speck for every two pixels of her (three of a large picture, as the
// scanner, so that it does not drag), each with its own drift, twinkle and
// moment to leave (from the top of her down).
function specks(her) {
  const { picture, x, y, w, h } = her;
  const { data } = picture.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
  const out = [];
  const random = seeded(7);
  const step = w * h > 40000 ? 3 : 2;
  for (let py = 0; py < h; py += step) {
    for (let px = 0; px < w; px += step) {
      const k = (py * w + px) * 4;
      if (data[k + 3] < 60) continue;
      out.push({
        x: x + px,
        y: y + py,
        color: `rgb(${data[k]},${data[k + 1]},${data[k + 2]})`,
        vx: (random() - 0.5) * 50,
        vy: -(25 + random() * 90),
        wait: (py / h) * 0.55 + random() * 0.15,
        life: 0.9 + random() * 0.6,
        phase: random() * 6.28,
        star: random() < 0.04,
      });
    }
  }
  return out;
}

// sheetFor: () => a canvas over the view and under the words, made and put away here.
// heard(going): called as the dust starts, for its sound (ui/sound.js dustAway, dustBack).
export function createVanish({ heard } = {}) {
  let frame = 0;
  let canvas = null;
  function sheet() {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'vanishSheet';
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
      document.getElementById('hud').before(canvas);
    }
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    const pen = canvas.getContext('2d');
    pen.setTransform(ratio, 0, 0, ratio, 0, 0);
    return pen;
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas?.remove();
    canvas = null;
  }

  function dust(her, going, done) {
    const pen = sheet();
    const all = specks(her);
    const began = performance.now();
    const draw = (now) => {
      // going: 0 → 1 as time runs; coming back: the same film backwards.
      const t = (now - began) / 1000;
      const k = going ? t : DUST_S - t;
      pen.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of all) {
        const a = Math.max(0, k - p.wait);
        // Not yet left: still part of her.
        const flown = Math.min(1, a / p.life);
        const x = p.x + p.vx * a + Math.sin(a * 3 + p.phase) * 6 * flown;
        const y = p.y + p.vy * a * (0.6 + 0.4 * flown);
        const twinkle = 0.55 + 0.45 * Math.sin(now / 90 + p.phase);
        pen.globalAlpha = a <= 0 ? 1 : Math.max(0, 1 - flown) * twinkle;
        pen.fillStyle = a <= 0 ? p.color : flown > 0.25 ? '#fff6dd' : p.color;
        const size = a <= 0 ? 2 : 2 - flown;
        pen.fillRect(x, y, size, size);
        if (p.star && a > 0 && flown < 0.9) {
          pen.globalAlpha = (1 - flown) * twinkle;
          pen.fillStyle = '#ffffff';
          const arm = 3 + 3 * twinkle;
          pen.fillRect(x - arm, y, arm * 2 + 1, 1);
          pen.fillRect(x, y - arm, 1, arm * 2 + 1);
        }
      }
      pen.globalAlpha = 1;
      if (t < DUST_S) frame = requestAnimationFrame(draw);
      else {
        stop();
        done();
      }
    };
    frame = requestAnimationFrame(draw);
  }

  function bubble(her, going, done) {
    const pen = sheet();
    const began = performance.now();
    const cx = her.x + her.w / 2;
    const cy = her.y + her.h / 2;
    const r = Math.max(her.w, her.h) * 0.62;
    const drops = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * 6.28 + Math.sin(i * 7.1), v: 70 + (i % 4) * 25 }));
    const draw = (now) => {
      const t = (now - began) / 1000;
      const u = Math.min(1, (going ? t : BUBBLE_S - t) / BUBBLE_S);
      pen.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const close = Math.min(1, u / CLOSE);
      const rise = ease(Math.min(1, Math.max(0, (u - CLOSE) / (POP - CLOSE))));
      const scale = 1 - 0.55 * rise;
      const bx = cx + Math.sin(u * 9) * 10 * rise;
      const by = cy - rise * Math.min(260, window.innerHeight * 0.35);
      if (u < POP) {
        // Her, carried in it.
        pen.save();
        pen.translate(bx, by);
        pen.scale(scale, scale);
        pen.drawImage(her.picture, -her.w / 2, -her.h / 2);
        pen.restore();
        // The bubble: clear in the middle, a thin bright skin with colours on it, and a
        // highlight up on the left.
        const rr = r * scale * (0.3 + 0.7 * ease(close));
        const skin = pen.createRadialGradient(bx, by, rr * 0.7, bx, by, rr);
        skin.addColorStop(0, 'rgba(200,230,255,0)');
        skin.addColorStop(0.8, 'rgba(200,230,255,0.10)');
        skin.addColorStop(1, 'rgba(220,240,255,0.45)');
        pen.globalAlpha = close;
        pen.fillStyle = skin;
        pen.beginPath();
        pen.arc(bx, by, rr, 0, Math.PI * 2);
        pen.fill();
        const tint = pen.createLinearGradient(bx - rr, by - rr, bx + rr, by + rr);
        for (const [stop, color] of [[0, '#ff9ad5'], [0.3, '#ffe68a'], [0.55, '#8affc8'], [0.8, '#8ac8ff'], [1, '#c79aff']]) tint.addColorStop(stop, color);
        pen.globalAlpha = 0.35 * close;
        pen.strokeStyle = tint;
        pen.lineWidth = 2;
        pen.stroke();
        pen.globalAlpha = 0.8 * close;
        pen.strokeStyle = '#ffffff';
        pen.lineWidth = 3;
        pen.lineCap = 'round';
        pen.beginPath();
        pen.arc(bx, by, rr * 0.78, Math.PI * 1.08, Math.PI * 1.38);
        pen.stroke();
        pen.globalAlpha = 0.6 * close;
        pen.beginPath();
        pen.arc(bx - rr * 0.48, by - rr * 0.52, 2.5, 0, Math.PI * 2);
        pen.fillStyle = '#ffffff';
        pen.fill();
      } else {
        // The pop: a ring and drops flying off.
        const p = Math.min(1, (u - POP) / (1 - POP));
        const rr = r * (1 - 0.55);
        pen.globalAlpha = 1 - p;
        pen.strokeStyle = '#e8f6ff';
        pen.lineWidth = 2 * (1 - p) + 0.5;
        pen.beginPath();
        pen.arc(bx, by, rr * (1 + 0.6 * p), 0, Math.PI * 2);
        pen.stroke();
        pen.fillStyle = '#e8f6ff';
        for (const d of drops) {
          const far = rr + d.v * p * 0.9;
          pen.beginPath();
          pen.arc(bx + Math.cos(d.a) * far, by + Math.sin(d.a) * far + 30 * p * p, 2 * (1 - p) + 0.5, 0, Math.PI * 2);
          pen.fill();
        }
      }
      pen.globalAlpha = 1;
      if (t < BUBBLE_S) frame = requestAnimationFrame(draw);
      else {
        stop();
        done();
      }
    };
    frame = requestAnimationFrame(draw);
  }

  return {
    // kind: 'dust' or 'bubble'; going: true as she leaves, false as she comes back; her:
    // cutOut's picture. done: called at the end (she is to be drawn again, coming back).
    play(kind, her, going, done) {
      stop();
      if (!her) return done();
      if (kind === 'bubble') return bubble(her, going, done);
      heard?.(going);
      return dust(her, going, done);
    },
    stop,
  };
}
