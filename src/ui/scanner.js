import { scannerPoints, scannerGround } from '../core/scanner.js';
import { distanceText } from './messages.js';

// The 3D scanner over the speed box (core/scanner.js says where each thing goes): a gold
// ellipse lying flat round her, she a white wedge in its middle pointing ahead, each
// thing a dot on her level and a stalk up or down to a round head with its name. The
// look the user chose of three ("B", 2026-10-18). It stands where the speed box stood,
// from its left edge to just before the flying keys, and the speed box goes up over it
// (the user, the same day: "비행속도계와 스캐너 위치 바꿈").
const GOLD = '#e9c46a';
const FAINT = 'rgba(233, 196, 106, 0.35)';
const KIND_COLOUR = { craft: '#9fd3ff', curio: '#f0a8ff', body: '#ffd27a' };

export function createScanner(canvas) {
  const ctx = canvas.getContext('2d');
  let size = [0, 0];

  // In the speed box's own place; the speed box goes over the flying keys, its right edge
  // on theirs (the user, 2026-10-18, a picture with an arrow from the box to that corner).
  const GAP = 16;
  let moved = [0, 0];
  function place() {
    const box = document.querySelector('#hud footer .speedBox');
    const speed = box?.getBoundingClientRect();
    const keys = ['reverseButton', 'slideLeft', 'rearButton']
      .map((id) => document.getElementById(id)?.getBoundingClientRect())
      .filter((r) => r && r.width > 0);
    if (!speed || !speed.width) return;
    // As large as the corner allows (the user: "그 위치에서 최대한 크게"): from the screen's
    // edge to just before the keys, and as tall as their three rows.
    // (Where the box stands before it is moved.)
    const natural = { left: speed.left - moved[0], right: speed.right - moved[0], bottom: speed.bottom - moved[1] };
    const left = Math.max(4, natural.left - 10);
    const end = keys.length ? Math.min(...keys.map((r) => r.left)) - 6 : left + 260;
    const width = Math.max(120, end - left);
    const rows = keys.length ? Math.max(...keys.map((r) => r.bottom)) - Math.min(...keys.map((r) => r.top)) : 0;
    const height = Math.round(Math.max(width * 0.42, Math.min(width * 0.7, rows || width * 0.5)));
    const bottom = Math.max(natural.bottom, ...keys.map((r) => r.bottom));
    canvas.style.left = `${left}px`;
    canvas.style.top = `${bottom - height}px`;
    const pad = ['reverseButton', 'flyButton', 'slideUp', 'slideRight', 'gazeButton']
      .map((id) => document.getElementById(id)?.getBoundingClientRect())
      .filter((r) => r && r.width > 0);
    const want = pad.length
      ? [Math.round(Math.max(...pad.map((r) => r.right)) - natural.right), Math.round(Math.min(...pad.map((r) => r.top)) - GAP - natural.bottom)]
      : [0, -(height + GAP)];
    if (want[0] !== moved[0] || want[1] !== moved[1]) {
      moved = want;
      box.style.transform = `translate(${moved[0]}px, ${moved[1]}px)`;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    size = [width, height];
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  const byIdOf = (things) => new Map(things.map((thing) => [thing.id, thing]));

  // The world she is close to (core/scanner.js scannerGround), as round ground coming in
  // from its side of the ellipse: a large circle, clipped to the ellipse, whose near edge
  // reaches `fill` of the way in, with its name and how far its surface is. The side is
  // where its middle would be drawn on the scanner (below her when it is under her feet).
  const GROUND_TINT = { earth: '#7fb2ff', mars: '#e8916a', moon: '#cfc9c0', venus: '#e8cf8a', jupiter: '#e3b98d', sun: '#ffd27a' };
  function drawGround(ground, thing, cx, cy, rx, ry) {
    let [u, v] = [ground.x, -(ground.z + 1.4 * ground.h)];
    const length = Math.hypot(u, v);
    [u, v] = length > 1e-3 ? [u / length, v / length] : [0, 1];
    const big = 1.6;
    const from = 1 - ground.fill + big;
    const tint = GROUND_TINT[ground.id] ?? '#b9c6e8';
    const ratio = window.devicePixelRatio || 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1, 1, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(u * from, v * from, big, 0, Math.PI * 2);
    // (Filled and stroked in plain pixels, so the line keeps its width.)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = tint;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // Its name and height in the upper left corner, in its colour (on the ground itself the
    // names of the craft round her lay over it).
    const label = `${thing?.name ?? ground.id} · ${distanceText(ground.surface)}`;
    ctx.font = '600 10px "Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const lx = 4;
    const ly = 8;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeText(label, lx, ly);
    ctx.fillStyle = tint;
    ctx.fillText(label, lx, ly);
    ctx.textAlign = 'start';
    ctx.lineWidth = 1;
  }

  // things: [{ id, name, kind: 'craft'|'curio'|'body', position, radiusKm? }].
  function draw({ position, orientation, things, selectedId = null }) {
    place();
    const [w, h] = size;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.62;
    const rx = w / 2 - 4;
    const ry = h * 0.3;
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(8, 20, 40, 0.75)';
    ctx.strokeStyle = GOLD;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const ground = scannerGround(position, orientation, things);
    if (ground) drawGround(ground, byIdOf(things).get(ground.id), cx, cy, rx, ry);
    ctx.strokeStyle = FAINT;
    for (const f of [0.5, 0.25]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * f, ry * f, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy);
    ctx.lineTo(cx + rx, cy);
    ctx.moveTo(cx, cy - ry);
    ctx.lineTo(cx, cy + ry);
    for (const s of [-1, 1]) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + s * rx * 0.55, cy - ry * 0.83);
    }
    ctx.stroke();
    // Herself, pointing ahead.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 4, cy + 3);
    ctx.lineTo(cx + 4, cy + 3);
    ctx.fill();
    const byId = new Map(things.map((thing) => [thing.id, thing]));
    const points = scannerPoints(position, orientation, things);
    ctx.font = '600 10px "Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
    ctx.textBaseline = 'middle';
    // Farthest first, so the nearer stand in front. A name that would lie on one already
    // written moves a line up (down, at the top), never out of the box.
    const written = [];
    for (const p of [...points].reverse()) {
      const thing = byId.get(p.id);
      const colour = KIND_COLOUR[thing.kind] ?? KIND_COLOUR.body;
      const px = cx + p.x * rx;
      const py = cy - p.z * ry;
      const top = Math.max(7, Math.min(h - 7, py - p.h * ry * 1.4));
      ctx.strokeStyle = colour;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, top);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.ellipse(px, py, 2, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, top, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (p.id === selectedId) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, top, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      // The name to the side with more room.
      const name = thing.name;
      const toLeft = px > cx + rx * 0.35;
      const tw = ctx.measureText(name).width;
      const tx = toLeft ? Math.max(2, px - 7 - tw) : Math.min(w - 2 - tw, px + 7);
      const clash = (y) => written.some(([x0, y0, ww]) => tx < x0 + ww && x0 < tx + tw && Math.abs(y - y0) < 11);
      let ty = Math.max(7, Math.min(h - 7, top));
      for (let step = 1; clash(ty) && step < 8; step += 1) {
        const upY = top - 11 * step;
        const downY = top + 11 * step;
        if (upY >= 7 && !clash(upY)) ty = upY;
        else if (downY <= h - 7 && !clash(downY)) ty = downY;
      }
      written.push([tx, ty, tw]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeText(name, tx, ty);
      ctx.fillStyle = '#fff';
      ctx.fillText(name, tx, ty);
      ctx.lineWidth = 1;
    }
  }

  return { draw };
}
