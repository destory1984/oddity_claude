// What people have seen in the Moon's dark seas, culture by culture (the user, 2026-11-28:
// "달 토끼가 문화권에 따라서 다르게 보인다고 하네. 여러가지 소개해봐", "달 토끼 시작하자",
// "만들어"): the full Moon's near side, and over it each figure traced in gold, drawn on stroke
// by stroke and filled, then faded for the next (render/moonFigures.js). A flat stage on a 2D
// canvas: the near side is made once from the Moon's map (assets/planets/moon.webp,
// u = 0.5 + lon / 360, v = 0.5 - lat / 180, east to the right as seen from the Earth).
import { FIGURES } from './moonFigures.js';

// The course's seconds (core/courses.js keeps its captions to these). Each figure [from, to],
// drawn on stroke by stroke for DRAW seconds from its start, faded out at its end.
export const FIGS = [
  ['rabbit', 12.5, 44.5],
  ['tree', 15, 25.5],
  ['toad', 37.5, 44.5],
  ['banyan', 44.5, 51.5],
  ['hare', 51.5, 90.5],
  ['fire', 57.5, 70.5],
  ['man', 90.5, 104.5],
  ['lantern', 97.5, 104.5],
  ['pail', 104.5, 111.5],
  ['rona', 111.5, 118.5],
  ['hina', 118.5, 125.5],
  ['lady', 125.5, 132.5],
  ['rabbit', 132.5, 142],
];
// The place's name under the Moon: [from, to, key].
const PLACES = [
  [12.5, 25, 'korea'], [25.5, 31, 'japan'], [31.5, 44, 'china'], [44.5, 51, 'vietnam'], [51.5, 77, 'india'],
  [77.5, 90, 'aztec'], [90.5, 104, 'europe'], [104.5, 111, 'north'], [111.5, 118, 'maori'], [118.5, 125, 'hawaii'],
  [132.5, 140, 'south'], [141.5, 152, 'seas'],
];
const AZTEC = [77.5, 84]; // the Moon as bright as the Sun, till a god strikes it with the rabbit
const DRAW = 3.2;
const FLIP = [134, 137]; // the Moon turning upside down, as seen south of the equator
const SEAS = [140.5, 154]; // the seas lit up: old lava
export const END = 166;

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// A stroke as a polyline: Catmull-Rom through its points, and its length.
function polyline(stroke) {
  const q = [];
  for (let i = 0; i < stroke.p.length; i += 2) q.push([stroke.p[i], stroke.p[i + 1]]);
  const n = q.length;
  const at = (i) => (stroke.closed ? q[(i + n) % n] : q[Math.min(n - 1, Math.max(0, i))]);
  const out = [];
  const segs = stroke.closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < 10; s++) {
      const t = s / 10, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(stroke.closed ? q[0] : q[n - 1]);
  let length = 0;
  for (let i = 1; i < out.length; i++) length += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
  return { points: out, length, fill: !!stroke.fill, closed: !!stroke.closed };
}
const SHAPES = Object.fromEntries(Object.entries(FIGURES).map(([name, f]) => {
  const strokes = f.strokes.map(polyline);
  return [name, { strokes, length: strokes.reduce((s, x) => s + x.length, 0) }];
}));

export function createMoonFiguresStage(canvas) {
  const ctx = canvas.getContext('2d');
  const base = import.meta.env?.BASE_URL ?? './';
  let W = 1, H = 1, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  resize();

  // The near side, made once from the map; and its seas, for lighting them up.
  const SIZE = 1024;
  let disc = null, seas = null;
  const map = new Image();
  map.onload = () => {
    const mw = 2048, mh = 1024;
    const src = document.createElement('canvas');
    src.width = mw; src.height = mh;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(map, 0, 0, mw, mh);
    const from = sctx.getImageData(0, 0, mw, mh).data;
    const make = () => { const c = document.createElement('canvas'); c.width = c.height = SIZE; return c; };
    const d = make(), s = make();
    const dctx = d.getContext('2d'), sc = s.getContext('2d');
    const img = dctx.createImageData(SIZE, SIZE), sea = sc.createImageData(SIZE, SIZE);
    for (let j = 0; j < SIZE; j++) {
      const y = 1 - ((j + 0.5) / SIZE) * 2;
      for (let i = 0; i < SIZE; i++) {
        const x = ((i + 0.5) / SIZE) * 2 - 1;
        const r2 = x * x + y * y;
        if (r2 >= 1) continue;
        const z = Math.sqrt(1 - r2);
        const lat = Math.asin(y), lon = Math.atan2(x, z);
        const u = Math.min(mw - 1, Math.floor((0.5 + lon / (2 * Math.PI)) * mw));
        const v = Math.min(mh - 1, Math.floor((0.5 - lat / Math.PI) * mh));
        const k = (v * mw + u) * 4, o = (j * SIZE + i) * 4;
        // A little darker toward the edge, as the full Moon looks; the edge itself soft.
        const limb = (0.78 + 0.22 * z) * Math.min(1, (1 - Math.sqrt(r2)) * 300);
        img.data[o] = from[k] * limb; img.data[o + 1] = from[k + 1] * limb; img.data[o + 2] = from[k + 2] * limb;
        img.data[o + 3] = 255 * Math.min(1, (1 - Math.sqrt(r2)) * 300);
        const lum = (from[k] + from[k + 1] + from[k + 2]) / 3;
        const m = Math.min(1, Math.max(0, (118 - lum) / 30));
        sea.data[o] = 60; sea.data[o + 1] = 130; sea.data[o + 2] = 255; sea.data[o + 3] = 200 * m;
      }
    }
    dctx.putImageData(img, 0, 0);
    sc.putImageData(sea, 0, 0);
    disc = d; seas = s;
  };
  map.src = `${base}assets/planets/moon.webp`;

  // The stars.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 260 }, () => [rnd(), rnd(), 0.3 + rnd() * 0.9, rnd() * 6]);

  // The place's name, under the Moon.
  const label = document.createElement('div');
  label.style.cssText = 'position:fixed;left:0;right:0;z-index:7;pointer-events:none;text-align:center;color:#f3d48a;font:600 clamp(17px,4.6vw,24px) system-ui,sans-serif;letter-spacing:0.12em;text-shadow:0 1px 8px #000;opacity:0;transition:opacity 0.7s';
  canvas.after(label);
  const WORDS = { korea: '한국', japan: '일본', china: '중국', vietnam: '베트남', india: '인도', aztec: '아즈텍 (멕시코)', europe: '유럽', north: '북유럽', maori: '마오리 (뉴질랜드)', hawaii: '하와이', south: '남반구에서 본 달', seas: '달의 바다' };

  function drawFigure(name, k, alpha, cx, cy, R, turn) {
    const shape = SHAPES[name];
    if (!shape || alpha <= 0.002) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(turn);
    ctx.scale(R, -R);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = (2.6 * dpr) / R;
    let left = k * shape.length;
    for (const s of shape.strokes) {
      if (left <= 0) break;
      const part = Math.min(1, left / s.length);
      left -= s.length;
      const path = new Path2D();
      const upto = Math.max(1, Math.round(part * (s.points.length - 1)));
      s.points.slice(0, upto + 1).forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      if (s.fill && part >= 1) {
        ctx.fillStyle = `rgba(255, 205, 110, ${0.2 * alpha * smooth(0.6, 1, k)})`;
        ctx.fill(path);
      }
      ctx.strokeStyle = `rgba(255, 214, 130, ${alpha})`;
      ctx.shadowColor = `rgba(255, 180, 60, ${0.9 * alpha})`;
      ctx.shadowBlur = 10 * dpr;
      ctx.stroke(path);
    }
    ctx.restore();
  }

  function update(T, words) {
    const w = { ...WORDS, ...(words ?? {}) };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const fade = smooth(-1, 0.8, T) * (1 - smooth(END - 2, END, T));
    // The stars, twinkling a little.
    for (const [x, y, r, ph] of stars) {
      ctx.fillStyle = `rgba(235, 240, 255, ${(0.35 + 0.35 * Math.sin(T * 0.8 + ph)) * fade})`;
      ctx.fillRect(x * canvas.width, y * canvas.height, r * dpr, r * dpr);
    }
    // The Moon: below the captions, slowly breathing in.
    const cw = canvas.width, ch = canvas.height;
    const R = Math.min(cw * 0.43, ch * 0.3) * (1 + 0.03 * smooth(0, END, T));
    const cx = cw / 2, cy = ch * 0.54;
    const turn = Math.PI * smooth(FLIP[0], FLIP[1], T) * (1 - smooth(SEAS[0], SEAS[0] + 2.5, T));
    if (disc) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(cx, cy);
      ctx.rotate(turn);
      // A soft glow round it.
      ctx.shadowColor = 'rgba(200, 210, 255, 0.35)';
      ctx.shadowBlur = R * 0.12;
      ctx.drawImage(disc, -R, -R, 2 * R, 2 * R);
      ctx.shadowBlur = 0;
      // Too bright at first; then struck, and dimmed.
      const glare = smooth(AZTEC[0], AZTEC[0] + 1.5, T) * (1 - smooth(AZTEC[1] - 0.1, AZTEC[1] + 0.3, T));
      if (glare > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * glare * 0.75;
        ctx.drawImage(disc, -R, -R, 2 * R, 2 * R);
        ctx.globalCompositeOperation = 'source-over';
      }
      const hit = T - AZTEC[1];
      if (hit > 0 && hit < 1.2) {
        ctx.globalAlpha = fade * (1 - hit / 1.2);
        ctx.strokeStyle = '#fff6dd';
        ctx.lineWidth = 4 * dpr;
        ctx.beginPath();
        ctx.arc(R * 0.35, R * -0.2, R * (0.05 + 0.4 * hit), 0, Math.PI * 2);
        ctx.stroke();
      }
      const lit = smooth(SEAS[0] + 1, SEAS[0] + 3, T) * (1 - smooth(SEAS[1] - 2, SEAS[1], T));
      if (lit > 0) {
        ctx.globalAlpha = fade * lit * 0.55;
        ctx.drawImage(seas, -R, -R, 2 * R, 2 * R);
      }
      ctx.restore();
    }
    // The figures.
    for (const [f, a, b] of FIGS) {
      if (T < a - 0.3 || T > b) continue;
      const alpha = fade * smooth(a - 0.3, a + 0.2, T) * (1 - smooth(b - 1, b, T));
      drawFigure(f, smooth(a, a + DRAW, T), alpha, cx, cy, R, turn);
    }
    const name = PLACES.find(([a, b]) => T >= a && T < b)?.[2] ?? '';
    const text = name ? w[name] : '';
    if (text && label.textContent !== text) label.textContent = text;
    label.style.opacity = text ? String(fade) : '0';
    label.style.top = `${(cy + R) / dpr + 18}px`;
  }

  return {
    update,
    resize,
    dispose: () => { label.remove(); },
  };
}
