import { mapStars, twinkle, cometAt } from '../core/mapSky.js';

// Draws the sky round the big map (core/mapSky.js) on a canvas that lies behind the map
// and is as wide as the sheet: stars twinkle and a comet goes by now and then, outside the
// map's circle only. It runs while the sheet is open (start / stop). Someone who asked
// their device for less motion gets the stars standing still and no comet.
export function createMapSky(canvas, map) {
  const ctx = canvas.getContext('2d');
  const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let frame = null;
  let began = 0;
  let stars = [];
  // A few of the larger stars in each corner, joined by thin lines like a constellation.
  let figures = [];
  let size = [0, 0, 0];

  function fit() {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = Math.round(box.width);
    const h = Math.round(box.height);
    const r = map.getBoundingClientRect().width / 2;
    if (w === size[0] && h === size[1] && r === size[2]) return;
    size = [w, h, r];
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // (About one star to every 900 square pixels of sky.)
    stars = mapStars(Math.round((w * h - Math.PI * r * r) / 900), w, h, r);
    figures = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([right, low]) => stars
      .filter((star) => (star.x > w / 2) === Boolean(right) && (star.y > h / 2) === Boolean(low) && Math.hypot(star.x - w / 2, star.y - h / 2) > r + 14)
      .sort((a, b) => b.size - a.size).slice(0, 4).sort((a, b) => a.x - b.x));
  }

  // The brass rim round the map: two rings and a tick every ten degrees, longer at every
  // thirty (the circle itself is the map's own).
  function rim(w, h, r) {
    const [cx, cy] = [w / 2, h / 2];
    const metal = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    metal.addColorStop(0, '#fff3c9');
    metal.addColorStop(0.35, '#e9c46a');
    metal.addColorStop(0.7, '#b98a2c');
    metal.addColorStop(1, '#f3d27a');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = metal;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let k = 0; k < 36; k += 1) {
      const a = (k * Math.PI) / 18;
      const out = r + (k % 3 === 0 ? 8.5 : 6.8);
      ctx.moveTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
      ctx.lineTo(cx + Math.cos(a) * out, cy + Math.sin(a) * out);
    }
    ctx.stroke();
  }

  function draw(now) {
    fit();
    const [w, h, r] = size;
    const t = still ? 0 : (now - began) / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    // Everything keeps out of the map's circle.
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(w / 2, h / 2, r + 2, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    rim(w, h, r);
    // The constellations: thin gold lines, glowing faintly with their stars.
    ctx.strokeStyle = '#e9c46a';
    ctx.lineWidth = 0.8;
    for (const figure of figures) {
      if (figure.length < 3) continue;
      ctx.globalAlpha = 0.22 + 0.14 * twinkle(figure[0], t);
      ctx.beginPath();
      figure.forEach((star, i) => (i ? ctx.lineTo(star.x, star.y) : ctx.moveTo(star.x, star.y)));
      ctx.stroke();
    }
    for (const star of stars) {
      const light = twinkle(star, t);
      ctx.globalAlpha = light;
      ctx.fillStyle = star.cross ? '#ffe9a8' : '#f4ecd2';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.cross && light > 0.55) {
        // A little cross of light at its brightest.
        const arm = star.size * (2 + 5 * (light - 0.55));
        ctx.globalAlpha = (light - 0.55) * 1.6;
        ctx.strokeStyle = '#fff3c9';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(star.x - arm, star.y);
        ctx.lineTo(star.x + arm, star.y);
        ctx.moveTo(star.x, star.y - arm);
        ctx.lineTo(star.x, star.y + arm);
        ctx.stroke();
      }
    }
    const comet = still ? null : cometAt(t, w, h);
    if (comet) {
      const [x, y] = comet.head;
      const tail = 46;
      const end = [x - comet.way[0] * tail, y - comet.way[1] * tail];
      const fade = ctx.createLinearGradient(x, y, end[0], end[1]);
      fade.addColorStop(0, '#ffffff');
      fade.addColorStop(0.25, '#f3d27aaa');
      fade.addColorStop(1, '#f3d27a00');
      ctx.globalAlpha = comet.light;
      ctx.strokeStyle = fade;
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (!still) frame = requestAnimationFrame(draw);
  }

  return {
    start() {
      if (frame !== null) return;
      began = performance.now();
      frame = requestAnimationFrame(draw);
    },
    stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
