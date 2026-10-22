import { scannerPoints, scannerGround, easePoints } from '../core/scanner.js';
import { distanceText } from './messages.js';

// The 3D scanner over the speed box (core/scanner.js says where each thing goes): an
// ellipse lying flat round her, she a white wedge in its middle pointing ahead, each
// thing a dot on her level and a stalk up or down to a round head with its name. The
// look the user chose of three ("B", 2026-10-18). It stands where the speed box stood,
// from its left edge to just before the flying keys, and the speed box goes up over it
// (the user, the same day: "비행속도계와 스캐너 위치 바꿈").
// Its colour: an ice-blue line on a half-clear navy, like a hologram (the user's pick "C"
// of five, 2026-10-19; it was gold).
const LINE = '#a8dcff';
const FAINT = 'rgba(168, 220, 255, 0.3)';
const KIND_COLOUR = { craft: '#7fe3ff', curio: '#f0a8ff', body: '#ffd27a' };

export function createScanner(canvas, button = null) {
  const ctx = canvas.getContext('2d');
  let on = true;
  let size = [0, 0];
  // On a wide screen, where the ellipse stands in the canvas: [middle, half height].
  let tall = null;

  // In the speed box's own place; the speed box goes over the flying keys, its right edge
  // on theirs (the user, 2026-10-18, a picture with an arrow from the box to that corner).
  // 8px, the space between two keys (the user, 2026-10-19: "아이콘 간격과 아이콘과 가장자리의
  // 간격도 모두 통일"; it was 16).
  const GAP = 8;
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
    // 8px from the screen's edge and from the keys, as every key is from the next (it was
    // 6px from both).
    const left = Math.max(8, natural.left - 8);
    const end = keys.length ? Math.min(...keys.map((r) => r.left)) - 8 : left + 260;
    // At most 440 px: on a wide screen the room up to the keys is the whole width and the
    // ellipse lay over half the view (the user, 2026-10-19: "큰화면으로 보면 스캐너가 너무 크네").
    const MAX = 440;
    const width = Math.min(MAX, Math.max(120, end - left));
    const rows = keys.length ? Math.max(...keys.map((r) => r.bottom)) - Math.min(...keys.map((r) => r.top)) : 0;
    // There the ellipse is as tall as the keys' three rows, its top and foot on theirs
    // (the user: "높이는 왼쪽 아이콘 묶음과 같게"), with room above it for the heads.
    const wide = end - left > MAX && rows > 0;
    const above = Math.round(rows * 0.45);
    const height = wide ? rows + above : Math.round(Math.max(width * 0.42, Math.min(width * 0.7, rows || width * 0.5)));
    tall = wide ? [above + rows / 2, rows / 2 - 1] : null;
    const bottom = wide ? Math.max(...keys.map((r) => r.bottom)) : Math.max(natural.bottom, ...keys.map((r) => r.bottom));
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
    // Its switch in the lower left corner, where the ellipse leaves room.
    // (Over the line of key hints a wide screen shows along the bottom, not under it.)
    if (button) {
      const hint = document.getElementById('hint')?.getBoundingClientRect();
      // (Its foot on the keys' foot and its side on the screen's, 8px in like them.)
      const foot = hint && hint.width > 0 && hint.top < bottom ? hint.top - 4 : bottom;
      button.style.left = `${left}px`;
      button.style.top = `${foot - button.offsetHeight}px`;
    }
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
  // The dots as last drawn, and when (core/scanner.js easePoints).
  let shown = [];
  let lastMs = null;
  function draw({ position, orientation, things, selectedId = null }) {
    place();
    const [w, h] = size;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    if (!on) return;
    const cx = w / 2;
    const cy = tall ? tall[0] : h * 0.62;
    const rx = w / 2 - 4;
    const ry = tall ? tall[1] : h * 0.3;
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(10, 24, 48, 0.55)';
    ctx.strokeStyle = LINE;
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
    // The dots glide to their places and fade in and out (core/scanner.js easePoints).
    const nowMs = performance.now();
    const dtS = lastMs === null ? 1 : Math.min(0.5, (nowMs - lastMs) / 1000);
    lastMs = nowMs;
    shown = easePoints(shown, scannerPoints(position, orientation, things), dtS);
    ctx.font = '600 10px "Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
    ctx.textBaseline = 'middle';
    // Farthest first, so the nearer stand in front. A name that would lie on one already
    // written moves a line up (down, at the top), never out of the box.
    const written = [];
    for (const p of [...shown].reverse()) {
      const thing = byId.get(p.id);
      if (!thing) continue;
      ctx.globalAlpha = p.alpha;
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
        ctx.strokeStyle = LINE;
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
      // A fading name takes no room: those staying would be pushed a line and snap back.
      if (!p.leaving) written.push([tx, ty, tw]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeText(name, tx, ty);
      ctx.fillStyle = '#fff';
      ctx.fillText(name, tx, ty);
      ctx.lineWidth = 1;
    }
    ctx.globalAlpha = 1;
  }

  return {
    draw,
    on: () => on,
    // Off: nothing is drawn, the switch stays to bring it back.
    setOn(value) {
      on = value;
      canvas.style.visibility = on ? '' : 'hidden';
      // Back on after a flight, the dots start where they are, not where they were.
      if (!on) {
        shown = [];
        lastMs = null;
      }
    },
  };
}
