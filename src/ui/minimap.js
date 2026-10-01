import { mapPoint, mapHeading, pickNearest } from '../core/minimap.js';

const COLORS = {
  sun: '#ffd27a',
  mercury: '#b9b1a8',
  venus: '#e8cf9a',
  earth: '#6fb6ff',
  mars: '#e0835a',
  jupiter: '#d9b48c',
  saturn: '#e8d49a',
  uranus: '#9fe3ea',
  neptune: '#6f8dff',
};
const EDGE_PX = 8;

// Round map in the HUD: the Sun, the eight planets and their orbits, and the
// traveler with an arrow for the flight heading. Tapping a planet selects it.
export function createMinimap(canvas, { onPick }) {
  const ctx = canvas.getContext('2d');
  let dots = [];

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const id = pickNearest([e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2], dots);
    if (id) onPick(id);
  });

  function draw({ bodies, position, heading, selectedId }) {
    const size = canvas.clientWidth;
    if (!size) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, size / 2 * dpr, size / 2 * dpr);
    ctx.clearRect(-size / 2, -size / 2, size, size);

    const radius = size / 2 - EDGE_PX;
    const sun = bodies.find((b) => b.kind === 'star');
    const planets = bodies.filter((b) => b.kind === 'planet');
    const dist = (b) => Math.hypot(b.position[0] - sun.position[0], b.position[2] - sun.position[2]);
    const outerKm = Math.max(...planets.map(dist));
    const at = (p) => mapPoint(p, sun.position, outerKm, radius);

    ctx.fillStyle = 'rgba(7, 21, 34, 0.55)';
    ctx.strokeStyle = 'rgba(174, 205, 231, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(174, 205, 231, 0.16)';
    for (const planet of planets) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * Math.sqrt(dist(planet) / outerKm), 0, Math.PI * 2);
      ctx.stroke();
    }

    const selected = bodies.find((b) => b.id === selectedId);
    const ringed = selected?.kind === 'moon' ? selected.parent : selectedId;
    dots = [];
    for (const body of [sun, ...planets]) {
      const [x, y] = at(body.position);
      ctx.fillStyle = COLORS[body.id] ?? '#cfe3f3';
      ctx.beginPath();
      ctx.arc(x, y, body.kind === 'star' ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (body.id === ringed) {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (body.kind === 'planet') dots.push({ id: body.id, x, y });
    }

    const [px, py] = at(position);
    const dir = mapHeading(heading);
    ctx.fillStyle = '#9fffe7';
    ctx.beginPath();
    if (dir) {
      const [hx, hy] = dir;
      ctx.moveTo(px + hx * 7, py + hy * 7);
      ctx.lineTo(px - hx * 4 - hy * 4, py - hy * 4 + hx * 4);
      ctx.lineTo(px - hx * 4 + hy * 4, py - hy * 4 - hx * 4);
      ctx.closePath();
    } else {
      ctx.arc(px, py, 3, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  return { draw };
}
