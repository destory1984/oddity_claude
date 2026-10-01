import { mapPoint, mapHeading, pickNearest } from '../core/minimap.js';
import { BELT } from '../core/belt.js';

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
  ceres: '#b5aea6',
  pluto: '#d9bfa5',
  halley: '#bfe6ff',
};
const EDGE_PX = 8;

// Round map in the HUD: the Sun, the planets and dwarf planets with their orbits, the
// asteroid belt, the comet, and the
// traveler with an arrow for the flight heading. Tapping a planet selects it.
export function createMinimap(canvas, { onPick }) {
  const ctx = canvas.getContext('2d');
  let dots = [];
  // Every circle that can be named on hover: the Sun, the planets and the traveler.
  let named = [];
  let hover = null;

  const pointAt = (e) => {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2];
  };
  canvas.addEventListener('pointerdown', (e) => {
    const id = pickNearest(pointAt(e), dots);
    if (id) onPick(id);
  });
  canvas.addEventListener('pointermove', (e) => {
    hover = pickNearest(pointAt(e), named, 10);
  });
  canvas.addEventListener('pointerleave', () => {
    hover = null;
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
    const planets = bodies.filter((b) => b.kind === 'planet' || b.kind === 'dwarf');
    const comets = bodies.filter((b) => b.kind === 'comet');
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

    // The asteroid belt: one dotted ring down its middle.
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * Math.sqrt((BELT.innerKm + BELT.outerKm) / 2 / outerKm), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const selected = bodies.find((b) => b.id === selectedId);
    const ringed = selected?.kind === 'moon' ? selected.parent : selectedId;
    dots = [];
    named = [];
    for (const body of [sun, ...planets, ...comets]) {
      const [x, y] = at(body.position);
      ctx.fillStyle = COLORS[body.id] ?? '#cfe3f3';
      ctx.beginPath();
      ctx.arc(x, y, body.kind === 'star' ? 4 : body.kind === 'planet' ? 2.6 : 2, 0, Math.PI * 2);
      ctx.fill();
      if (body.id === ringed) {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (body.kind !== 'star') dots.push({ id: body.id, x, y });
      named.push({ id: body.id, x, y, name: body.name });
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
    named.push({ id: 'me', x: px, y: py, name: '나' });

    // The name of the circle under the pointer, kept inside the map.
    const shown = named.find((n) => n.id === hover);
    if (shown) {
      ctx.font = '12px sans-serif';
      const width = ctx.measureText(shown.name).width + 12;
      const x = Math.max(-size / 2 + 2, Math.min(size / 2 - width - 2, shown.x - width / 2));
      const y = shown.y < -size / 2 + 30 ? shown.y + 10 : shown.y - 26;
      ctx.fillStyle = 'rgba(7, 21, 34, 0.9)';
      ctx.fillRect(x, y, width, 18);
      ctx.fillStyle = '#e6f2fb';
      ctx.textBaseline = 'middle';
      ctx.fillText(shown.name, x + 6, y + 9.5);
    }
  }

  return { draw };
}
