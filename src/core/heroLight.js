// The light that falls on the character, worked out from where she really is: sunlight
// from the Sun's true direction, cut off in a planet's shadow, and the glow thrown back
// by the nearest world (blue under Earth, rust beside Mars). render/spriteHero.js takes
// the sunlight's strength from it to dim her drawing in a shadow.
import { conjugate, rotateVector } from './orientation.js';

// The colour each world throws back; grey for the rest.
export const BOUNCE_COLOR = {
  earth: [0.45, 0.62, 1], moon: [0.75, 0.75, 0.75], mercury: [0.6, 0.58, 0.55], venus: [1, 0.9, 0.65],
  mars: [0.95, 0.55, 0.35], jupiter: [0.95, 0.8, 0.6], saturn: [1, 0.9, 0.65], uranus: [0.65, 0.9, 0.95],
  neptune: [0.35, 0.55, 1], io: [0.95, 0.85, 0.45], europa: [0.9, 0.85, 0.75], titan: [0.95, 0.7, 0.4],
  pluto: [0.8, 0.68, 0.55],
};
const GREY = [0.7, 0.7, 0.7];

const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => {
  const length = Math.hypot(...v);
  return length > 0 ? v.map((n) => n / length) : [0, 0, 1];
};
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);

// position, orientation: the traveler's. sunVisibility: 0 (the Sun fully hidden behind
// a body) to 1. Directions come back in the traveler's own frame (x right, y up, z
// ahead), pointing toward the light's source.
//   sun:    { direction, strength 0..1 }
//   bounce: { direction, color, strength 0..1 } from the world that fills most of the
//           sky with sunlit ground: how much sky it takes (radius / distance, squared)
//           times how much of the side facing the traveler is lit.
export function heroLighting({ position, orientation, bodies, sunVisibility = 1 }) {
  const toLocal = (worldDirection) => rotateVector(conjugate(orientation), worldDirection);
  const star = bodies.find((b) => b.kind === 'star');
  const sunDirection = unit(sub(star.position, position));
  let bounce = { direction: [0, -1, 0], color: GREY, strength: 0 };
  for (const body of bodies) {
    if (body.kind === 'star') continue;
    const out = sub(position, body.position);
    const distance = Math.max(Math.hypot(...out), body.radiusKm);
    const sky = (body.radiusKm / distance) ** 2;
    if (sky < 1e-4) continue;
    // Phase: 1 with the Sun behind the traveler, 0 looking at the night side.
    const lit = 0.5 * (1 + dot(unit(out), unit(sub(star.position, body.position))));
    const strength = Math.min(1, sky * lit);
    if (strength > bounce.strength) {
      bounce = { direction: toLocal(unit(sub(body.position, position))), color: BOUNCE_COLOR[body.id] ?? GREY, strength };
    }
  }
  return {
    sun: { direction: toLocal(sunDirection), strength: Math.max(0, Math.min(1, sunVisibility)) },
    bounce,
  };
}
