// Why the aurora is green (the user, 2026-11-28: "“오로라 색깔은 대기 속 원자가 정한다”로
// 만들까", "gpt 자문 받고 만들어"): a flat stage on a 2D canvas, as the Moon's figures are.
//   sky:     a night sky over dark hills, a green curtain waving in it.
//   sun:     the Sun's wind; the Earth's field turns most of it aside and lets some slide
//            down to the poles, where the oval lights up.
//   cut:     the air cut open, 0 to 400 km: the particles coming down strike atoms, and each
//            gives back the light of its kind at its height (oxygen green, oxygen red high
//            up where a slow glow is not knocked out of it, nitrogen violet low down).
//   curtain: one curtain, red over green over violet, named.
//   korea:   May 2024: the oval spreads south; from Korea the high red top shows best over
//            the northern horizon.
//   planets: Jupiter's aurora (ultraviolet, painted to be seen) and Mars's green sky.
// Course seconds (core/courses.js keeps its captions to these).
export const PARTS = {
  sky: [0, 13],
  sun: [13, 39],
  cut: [39, 120],
  curtain: [120, 129],
  korea: [129, 153],
  planets: [153, 175],
  end: [175, 186],
};
export const END = 186;
// Within the cut: the particles striking, then each colour in turn.
const HIT = [39, 57], GREEN = [57, 77], RED = [77, 108], VIOLET = [108, 120];
const JUPITER = [153, 161], MARS = [161, 175];
// The red glow waits (110 s on average; shown in a few seconds), and is knocked out lower down.
const WAIT = 90, KNOCK = 96;
// Everything is drawn above this share of the screen's height: the captions stand below.
const LOW = 0.7;

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const inside = ([a, b], T) => T >= a && T < b;
const COL = { green: [120, 255, 150], red: [255, 70, 70], violet: [190, 110, 255], pink: [255, 120, 200] };
const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${a})`;

// maxDpr: the most screen pixels to a page pixel (2 in the game; the Shorts draw at 8 / 3).
export function createAuroraColorsStage(canvas, { maxDpr = 2 } = {}) {
  const ctx = canvas.getContext('2d');
  const base = import.meta.env?.BASE_URL ?? './';
  let dpr = 1;
  function resize() {
    dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    canvas.width = Math.round((canvas.clientWidth || innerWidth) * dpr);
    canvas.height = Math.round((canvas.clientHeight || innerHeight) * dpr);
  }
  resize();

  // Planet discs made once from their maps (equirectangular, as the game's).
  const discs = {};
  function disc(name, size = 512) {
    const img = new Image();
    img.onload = () => {
      const mw = 1024, mh = 512;
      const src = document.createElement('canvas');
      src.width = mw; src.height = mh;
      const s = src.getContext('2d', { willReadFrequently: true });
      s.drawImage(img, 0, 0, mw, mh);
      const from = s.getImageData(0, 0, mw, mh).data;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const d = c.getContext('2d');
      const out = d.createImageData(size, size);
      for (let j = 0; j < size; j++) {
        const y = 1 - ((j + 0.5) / size) * 2;
        for (let i = 0; i < size; i++) {
          const x = ((i + 0.5) / size) * 2 - 1;
          const r2 = x * x + y * y;
          if (r2 >= 1) continue;
          const z = Math.sqrt(1 - r2);
          const lat = Math.asin(y), lon = Math.atan2(x, z);
          const u = Math.min(mw - 1, Math.floor((0.5 + lon / (2 * Math.PI)) * mw));
          const v = Math.min(mh - 1, Math.floor((0.5 - lat / Math.PI) * mh));
          const k = (v * mw + u) * 4, o = (j * size + i) * 4;
          const lit = name === 'earth' ? Math.min(1.35, 0.85 + 0.6 * z) : 0.25 + 0.75 * z;
          out.data[o] = Math.min(255, from[k] * lit); out.data[o + 1] = Math.min(255, from[k + 1] * lit); out.data[o + 2] = Math.min(255, from[k + 2] * lit);
          out.data[o + 3] = 255 * Math.min(1, (1 - Math.sqrt(r2)) * 200);
        }
      }
      d.putImageData(out, 0, 0);
      discs[name] = c;
    };
    img.src = `${base}assets/${name === 'earth' ? 'earth-day.webp' : `planets/${name}.webp`}`;
  }
  disc('earth');
  disc('jupiter');

  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 220 }, () => [rnd(), rnd(), 0.4 + rnd() * 0.9, rnd() * 6]);
  // Atoms in the cut: height (km), across (0..1), kind.
  const atoms = Array.from({ length: 150 }, () => {
    const h = 70 + Math.pow(rnd(), 1.6) * 330;
    return { h, x: rnd(), kind: h < 100 ? 'n2' : 'o', ph: rnd() };
  });
  // Particles coming down: across, speed, start.
  const drops = Array.from({ length: 26 }, () => ({ x: rnd(), v: 0.5 + rnd() * 0.5, ph: rnd() }));
  // The wind from the Sun.
  const wind = Array.from({ length: 70 }, () => ({ y: rnd() * 2 - 1, ph: rnd(), v: 0.6 + rnd() * 0.5 }));

  // Names on the screen.
  const names = document.createElement('div');
  names.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;font:600 13px system-ui,sans-serif;color:#e8ecf4;text-shadow:0 1px 4px #000';
  canvas.after(names);
  const pool = [];
  function label(i, text, x, y, color = '#e8ecf4', size = 13, align = 'center') {
    // (A name, not a sentence: "the solar wind", "A magnetic field" as the game's English has them → "Solar wind", "Magnetic field".)
    text = text.replace(/^(a|an|the) /i, '').replace(/^[a-z]/, (c) => c.toUpperCase());
    let el = pool[i];
    if (!el) {
      el = document.createElement('div');
      el.style.cssText = 'position:absolute;white-space:nowrap';
      names.append(el);
      pool[i] = el;
    }
    if (el.textContent !== text) el.textContent = text;
    el.style.left = `${x / dpr}px`;
    el.style.top = `${y / dpr}px`;
    el.style.color = color;
    el.style.fontSize = `${size}px`;
    el.style.transform = align === 'center' ? 'translate(-50%, -50%)' : align === 'left' ? 'translate(0, -50%)' : 'translate(-100%, -50%)';
    el.style.opacity = '1';
    used.add(i);
  }
  const used = new Set();
  const WORDS = { solarWind: '태양풍', sun: '태양', earth: '지구', field: '자기장', oval: '오로라 고리', km: 'km', oxygen: '산소', nitrogen: '질소', green: '초록', red: '빨강', violet: '보라 · 분홍', knocked: '부딪혀 빛을 잃음', waiting: '빛을 내기까지 기다리는 중', korea: '한국', north: '북쪽', horizon: '지평선', seen: '높은 곳이 먼저 보임', jupiter: '목성', jupiterNote: '자외선 사진에 색을 입힘', mars: '화성', marsNote: '하늘 전체가 엷은 초록' };

  // A curtain: rays along a wavy line, red at the top, green, violet at the foot.
  function curtain(x0, x1, foot, tall, T, mix = { red: 1, green: 1, violet: 1 }, alpha = 1, rays = 90) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < rays; i++) {
      const u = i / (rays - 1);
      const x = x0 + (x1 - x0) * u + Math.sin(u * 9 + T * 0.7) * (x1 - x0) * 0.03;
      const y = foot + Math.sin(u * 5.3 + T * 0.45) * tall * 0.12 + Math.sin(u * 13 - T * 0.9) * tall * 0.03;
      const glow = (0.45 + 0.55 * Math.pow(Math.sin(u * 23 + T * 1.3) * 0.5 + 0.5, 2)) * alpha * Math.sin(Math.PI * u);
      const h = tall * (0.8 + 0.3 * Math.sin(u * 7 + T * 0.3));
      const g = ctx.createLinearGradient(0, y, 0, y - h);
      g.addColorStop(0, rgba(COL.violet, 0.0));
      g.addColorStop(0.03, rgba(COL.pink, 0.55 * glow * mix.violet));
      g.addColorStop(0.1, rgba(COL.green, 0.9 * glow * mix.green));
      g.addColorStop(0.45, rgba(COL.green, 0.45 * glow * mix.green));
      g.addColorStop(0.62, rgba(COL.red, 0.35 * glow * mix.red));
      g.addColorStop(1, rgba(COL.red, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - ((x1 - x0) / rays) * 0.9, y - h, ((x1 - x0) / rays) * 1.8, h);
    }
    ctx.restore();
  }

  function sky(W, H, T, fade, ground = true) {
    for (const [x, y, r, ph] of stars) {
      ctx.fillStyle = `rgba(235, 240, 255, ${(0.3 + 0.3 * Math.sin(T * 0.8 + ph)) * fade})`;
      ctx.fillRect(x * W, y * H * 0.8, r * dpr, r * dpr);
    }
    if (!ground) return;
    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * W;
      ctx.lineTo(x, H * (LOW - 0.02) - (Math.sin(i * 0.7) * 0.02 + Math.sin(i * 0.23 + 1) * 0.03) * H);
    }
    ctx.lineTo(W, H);
    ctx.fill();
  }

  function update(T, words) {
    const w = { ...WORDS, ...(words ?? {}) };
    used.clear();
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // Dips to black between the parts.
    let fade = smooth(-1, 0.6, T) * (1 - smooth(END - 1.5, END, T));
    for (const d of [PARTS.sun[0], PARTS.cut[0], PARTS.curtain[0], PARTS.korea[0], PARTS.planets[0], MARS[0], PARTS.end[0]]) fade *= 1 - smooth(d - 0.8, d, T) * (1 - smooth(d, d + 1, T));
    ctx.globalAlpha = fade;
    const S = Math.min(W, H * 0.62);

    if (inside(PARTS.sky, T) || inside(PARTS.end, T)) {
      // (A dark blue night, the curtain over the hills.)
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#02040a'); g.addColorStop(1, '#0a1424');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      sky(W, H, T, fade);
      curtain(-W * 0.1, W * 1.1, H * 0.55, H * 0.42, T, { red: 0.55, green: 1, violet: 0.6 }, fade);
      sky(W, H, T, 0, true);
    } else if (inside(PARTS.sun, T)) {
      sky(W, H, T, fade, false);
      const cy = H * 0.4, sx = W * -0.05, ex = W * 0.68, R = S * 0.13;
      // The Sun at the left edge.
      const sg = ctx.createRadialGradient(sx, cy, 0, sx, cy, S * 0.32);
      sg.addColorStop(0, '#fff6d0'); sg.addColorStop(0.35, '#ffcc55'); sg.addColorStop(1, 'rgba(255, 140, 30, 0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, cy, S * 0.32, 0, Math.PI * 2); ctx.fill();
      label(0, w.sun, sx + S * 0.12, cy - S * 0.22, '#ffd98a');
      // The field: loops out of the poles, pressed on the Sun's side.
      const field = smooth(19.5, 22.5, T);
      ctx.strokeStyle = `rgba(120, 180, 255, ${0.45 * field})`;
      ctx.lineWidth = 1.2 * dpr;
      for (const L of [1.6, 2.2, 3.0, 4.0]) {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          for (let k = 0; k <= 60; k++) {
            const lat = -Math.PI / 2 + (k / 60) * Math.PI;
            const r = L * Math.cos(lat) ** 2 * (side < 0 ? 0.75 : 1.25);
            const x = ex + side * r * R * Math.cos(lat), y = cy - r * R * Math.sin(lat);
            k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      }
      if (field > 0.5) label(1, w.field, ex - R * 1.6, cy + R * 2.7, '#9cc6ff');
      // The wind: straight on, then round the field; a few slide down to the poles.
      for (const p of wind) {
        const k = (T * 0.25 * p.v + p.ph) % 1;
        let x = sx + S * 0.2 + (ex - sx - S * 0.2) * k * 1.3, y = cy + p.y * S * 0.42;
        const near = ex - R * 3.2;
        if (x > near && field > 0) {
          if (Math.abs(p.y) < 0.18) {
            // Down a field line to the pole.
            const q = Math.min(1, (x - near) / (R * 2.4));
            const pole = p.y < 0 ? -1 : 1;
            x = near + (ex - near) * q;
            y = cy + (p.y * S * 0.42) * (1 - q) - pole * R * 1.05 * q;
          } else {
            y += Math.sign(p.y) * (x - near) * 0.9 * field;
          }
        }
        if (x > W) continue;
        ctx.fillStyle = 'rgba(255, 220, 150, 0.9)';
        ctx.fillRect(x, y, 2.4 * dpr, 2.4 * dpr);
      }
      if (T < 26) label(2, w.solarWind, W * 0.3, cy - S * 0.36, '#ffd98a');
      // The Earth, bright in the sunlight (the user, 2026-11-28: "지구 아주 밝게.."), its air a blue rim.
      const halo = ctx.createRadialGradient(ex, cy, R * 0.9, ex, cy, R * 1.35);
      halo.addColorStop(0, 'rgba(110, 170, 255, 0.55)'); halo.addColorStop(1, 'rgba(110, 170, 255, 0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(ex, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();
      if (discs.earth) ctx.drawImage(discs.earth, ex - R, cy - R, 2 * R, 2 * R);
      const oval = smooth(32.5, 35.5, T);
      if (oval > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const pole of [-1, 1]) {
          ctx.strokeStyle = rgba(COL.green, 0.9 * oval);
          ctx.shadowColor = rgba(COL.green, oval); ctx.shadowBlur = 12 * dpr;
          ctx.lineWidth = 3 * dpr;
          ctx.beginPath();
          ctx.ellipse(ex, cy - pole * R * 0.86, R * 0.42, R * 0.13, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        label(3, w.oval, ex, cy - R * 1.45, rgba(COL.green, 1));
      }
      label(4, w.earth, ex, cy + R * 1.4);
    } else if (inside(PARTS.cut, T)) {
      // The air cut open: 0 km at the foot, 400 km at the top.
      // (The top clear of the game's clock and date at the upper left.)
      const top = H * 0.17, foot = H * (LOW - 0.02), x0 = W * 0.2, x1 = W * 0.95;
      const yOf = (km) => foot - ((foot - top) * km) / 400;
      const g = ctx.createLinearGradient(0, top, 0, foot);
      g.addColorStop(0, '#03050c'); g.addColorStop(1, '#0d1a33');
      ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, foot - top);
      ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, foot, W, H - foot);
      // The scale.
      ctx.strokeStyle = 'rgba(220, 230, 255, 0.5)'; ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, foot); ctx.stroke();
      [0, 100, 200, 400].forEach((km, i) => {
        const y = yOf(km);
        ctx.beginPath(); ctx.moveTo(x0 - 6 * dpr, y); ctx.lineTo(km ? x1 : x0, y);
        ctx.strokeStyle = km ? 'rgba(220, 230, 255, 0.14)' : 'rgba(220, 230, 255, 0.5)'; ctx.stroke();
        label(10 + i, `${km}${w.km}`, x0 - 10 * dpr, y, '#c9d4ea', 12, 'right');
      });
      // Which band is lit up now.
      const show = {
        green: smooth(GREEN[0], GREEN[0] + 1.5, T),
        red: smooth(RED[0], RED[0] + 1.5, T),
        violet: smooth(VIOLET[0], VIOLET[0] + 1.5, T),
      };
      // (Soft edges: the colours overlap; these are only where each is commonest.)
      const band = (a, b, col, k) => {
        if (k <= 0) return;
        const g = ctx.createLinearGradient(0, yOf(b + 30), 0, yOf(a - 30));
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.25, rgba(col, 0.12 * k));
        g.addColorStop(0.75, rgba(col, 0.12 * k)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x0, yOf(Math.min(400, b + 30)), x1 - x0, yOf(a - 30) - yOf(Math.min(400, b + 30)));
      };
      band(100, 200, COL.green, show.green);
      band(200, 400, COL.red, show.red);
      band(70, 110, COL.violet, show.violet);
      // The particles coming down, and the atoms they strike.
      const falling = smooth(HIT[0], HIT[0] + 2, T);
      for (const d of drops) {
        const k = (T * 0.35 * d.v + d.ph) % 1;
        const km = 420 - 360 * k;
        const x = x0 + (x1 - x0) * d.x, y = yOf(km);
        ctx.strokeStyle = `rgba(255, 230, 170, ${0.85 * falling})`;
        ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 14 * dpr); ctx.stroke();
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const a of atoms) {
        const x = x0 + (x1 - x0) * a.x, y = yOf(a.h);
        const col = a.kind === 'n2' ? COL.violet : a.h > 200 ? COL.red : COL.green;
        const on = a.kind === 'n2' ? show.violet : a.h > 200 ? show.red : show.green;
        // A flash when struck: each atom now and then.
        const beat = (T * (a.h > 200 ? 0.18 : 0.5) + a.ph) % 1;
        const flash = falling * (a.h > 200 ? smooth(0.55, 0.62, beat) * (1 - smooth(0.7, 0.95, beat)) : Math.max(0, 1 - beat * 6));
        const r = (a.kind === 'n2' ? 2.2 : 2.6) * dpr;
        ctx.fillStyle = `rgba(200, 210, 230, ${0.35 + 0.3 * (1 - on)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (a.kind === 'n2') { ctx.beginPath(); ctx.arc(x + r * 1.6, y, r, 0, Math.PI * 2); ctx.fill(); }
        const glow = flash * (0.25 + 0.75 * on);
        if (glow > 0.01) {
          const gg = ctx.createRadialGradient(x, y, 0, x, y, 14 * dpr);
          gg.addColorStop(0, rgba(col, glow)); gg.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 14 * dpr, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      // The red glow waits; lower down, a knock takes it away.
      if (inside(RED, T) && T > WAIT - 2) {
        const k = smooth(WAIT - 2, WAIT + 4, T);
        const hx = x0 + (x1 - x0) * 0.72, hy = yOf(330);
        ctx.strokeStyle = rgba(COL.red, 0.9); ctx.lineWidth = 2.5 * dpr;
        ctx.beginPath(); ctx.arc(hx, hy, 12 * dpr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        label(20, w.waiting, hx, hy - 24 * dpr, '#ff9a9a', 11);
        if (T > KNOCK) {
          const lx = x0 + (x1 - x0) * 0.35, ly = yOf(190);
          const b = smooth(KNOCK, KNOCK + 1, T);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * b})`;
          ctx.beginPath(); ctx.moveTo(lx - 30 * dpr, ly - 8 * dpr); ctx.lineTo(lx - 4 * dpr, ly); ctx.stroke();
          ctx.strokeStyle = rgba(COL.red, 0.5 * (1 - b)); ctx.beginPath(); ctx.arc(lx, ly, 10 * dpr, 0, Math.PI * 2); ctx.stroke();
          label(21, w.knocked, lx, ly - 22 * dpr, '#ffb3b3', 11);
        }
      }
      if (show.green > 0.3) label(22, `${w.oxygen} · ${w.green} 557.7nm`, x1 - 6 * dpr, yOf(150), rgba(COL.green, 1), 13, 'right');
      if (show.red > 0.3) label(23, `${w.oxygen} · ${w.red} 630nm`, x1 - 6 * dpr, yOf(385), rgba(COL.red, 1), 13, 'right');
      if (show.violet > 0.3) label(24, `${w.nitrogen} · ${w.violet}`, x1 - 6 * dpr, yOf(85), rgba(COL.violet, 1), 13, 'right');
    } else if (inside(PARTS.curtain, T)) {
      sky(W, H, T, fade, false);
      const foot = H * (LOW - 0.06), tall = H * 0.5;
      curtain(W * 0.08, W * 0.92, foot, tall, T, { red: 1, green: 1, violet: 1 }, fade, 70);
      label(30, w.red, W * 0.5, foot - tall * 0.85, rgba(COL.red, 1), 15);
      label(31, w.green, W * 0.5, foot - tall * 0.45, '#eaffef', 15);
      label(32, w.violet, W * 0.5, foot + 14 * dpr, rgba(COL.pink, 1), 15);
    } else if (inside(PARTS.korea, T)) {
      sky(W, H, T, fade, false);
      // The Earth's curve, seen from the side: the far north at the left, Korea at the right
      // (heights drawn far taller than they are, so that the horizon's cut shows).
      const R = W * 0.75, cx = W / 2, cy = H * 0.56 + R;
      const on = (th, km) => { const r = R + (km / 400) * W * 0.35; return [cx + r * Math.sin(th), cy - r * Math.cos(th)]; };
      ctx.fillStyle = '#0b1220';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(140, 170, 220, 0.5)'; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
      // The aurora: over the far north at first, then spreading south toward Korea.
      const spread = smooth(136, 141, T);
      const ta = -0.5 + 0.4 * spread, tk = 0.5;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [a, b, col] of [[200, 400, COL.red], [100, 200, COL.green], [80, 100, COL.violet]]) {
        for (let i = 0; i < 16; i++) {
          const th = ta - 0.07 + (i / 15) * 0.14;
          const [x1, y1] = on(th, a), [x2, y2] = on(th, b);
          const g = ctx.createLinearGradient(x1, y1, x2, y2);
          g.addColorStop(0, rgba(col, 0.4)); g.addColorStop(1, rgba(col, 0.08));
          ctx.strokeStyle = g; ctx.lineWidth = 4 * dpr;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      }
      ctx.restore();
      const [nx, ny] = on(ta, 0);
      label(40, w.north, nx, ny + 16 * dpr, '#c9d4ea');
      // Korea, and its horizon: what is over the line is seen, what is under it is hidden.
      const [px, py] = on(tk, 0);
      const look = smooth(145, 148, T);
      if (look > 0) {
        const tx = -Math.cos(tk), ty = -Math.sin(tk);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * look})`;
        ctx.setLineDash([6 * dpr, 6 * dpr]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + tx * W * 1.4, py + ty * W * 1.4); ctx.stroke();
        ctx.setLineDash([]);
        label(41, w.horizon, px + tx * W * 0.3, py + ty * W * 0.3 + 12 * dpr, '#ffffff', 11);
        if (T > 147) { const [sx2, sy2] = on(ta, 360); label(42, w.seen, sx2, sy2 - 14 * dpr, rgba(COL.red, 1), 12); }
      }
      ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(px, py, 4 * dpr, 0, Math.PI * 2); ctx.fill();
      label(43, w.korea, px, py + 16 * dpr, '#ffd98a');
    } else if (inside(PARTS.planets, T)) {
      sky(W, H, T, fade, false);
      if (inside(JUPITER, T) && discs.jupiter) {
        const R = S * 0.34, cx = W / 2, cy = H * 0.38;
        ctx.drawImage(discs.jupiter, cx - R, cy - R, 2 * R, 2 * R);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const k = smooth(JUPITER[0] + 2, JUPITER[0] + 4, T);
        for (const pole of [-1, 1]) {
          ctx.strokeStyle = `rgba(150, 120, 255, ${0.9 * k})`;
          ctx.shadowColor = `rgba(150, 120, 255, ${k})`; ctx.shadowBlur = 14 * dpr;
          ctx.lineWidth = 4 * dpr;
          ctx.beginPath(); ctx.ellipse(cx, cy - pole * R * 0.9, R * 0.3, R * 0.09, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        label(50, w.jupiter, cx, cy + R + 16 * dpr, '#ffe2b8');
        if (k > 0.5) label(51, w.jupiterNote, cx, cy + R + 36 * dpr, '#bfb4ff', 11);
      } else if (inside(MARS, T)) {
        // From the ground at night: the whole sky faintly green.
        const k = smooth(MARS[0] + 1, MARS[0] + 3, T);
        const g = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.85);
        g.addColorStop(0, `rgba(60, 160, 90, ${0.05 * k})`); g.addColorStop(1, `rgba(80, 200, 110, ${0.28 * k})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#120806';
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let i = 0; i <= 30; i++) ctx.lineTo((i / 30) * W, H * (LOW - 0.02) - (Math.sin(i * 0.5) * 0.015 + Math.sin(i * 0.17 + 2) * 0.025) * H);
        ctx.lineTo(W, H); ctx.fill();
        label(52, w.mars, W / 2, H * 0.2, '#ffb08a', 15);
        if (k > 0.5) label(53, w.marsNote, W / 2, H * 0.26, rgba(COL.green, 1), 12);
      }
    }
    ctx.globalAlpha = 1;
    pool.forEach((el, i) => { if (el && !used.has(i)) el.style.opacity = '0'; });
    names.style.opacity = String(fade);
  }

  return { update, resize, dispose: () => names.remove() };
}
