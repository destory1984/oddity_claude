// "그날로" at the landmarks: the craters, seas and mountains that have no machine standing
// on them (the user, 2026-10-07: "시르티스는 애니가 없네", "다른 명소도 다 애니 넣자"). Three
// kinds of stage, each made of the same few pieces (render/siteModels.js landmarkPieces):
//   photo: a craft crosses the sky, its shutter sounds, the place's picture comes up.
//   look: nothing flies: the picture comes up (seen from the ground, or a drawing).
//   impact: something falls out of the sky and hits; then the picture of the place now.
// The picture is the story's own (public/assets/stories/<id>.jpg). What each scene tells
// is in core/landmarkScenes.js. Pieces are placed as in core/moonScenes.js: x to the
// side, y up, in the model's units; a narrow phone's view ends about 1.45 to either side,
// and the sheet of telling comes down to about y = 1.45 when it has three rows (English):
// no bubble stands higher.
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (t, from, to) => {
  const u = clamp((t - from) / (to - from));
  return u * u * (3 - 2 * u);
};
// Something that swells in at `from` and shrinks away by `to`.
const up = (t, from, to) => ease(t, from, from + 0.5) * (1 - ease(t, to - 0.5, to));
// A flash: full in an eighth of a second, gone in half a second more.
const flashAt = (s) => (s < 0 ? 0 : s < 0.12 ? s / 0.12 : Math.max(0, 1 - (s - 0.12) / 0.5));

// When things happen in each kind, in seconds: how long it lasts, its own moment
// (the shutter, the picture, the hit), when each of the four lines comes, what is heard.
export const LANDMARK_TIMES = {
  photo: { seconds: 26, downAt: 9, lines: [0, 6, 10, 18], sounds: [[9, 'shutter'], [10.5, 'discovered']] },
  look: { seconds: 22, downAt: 5, lines: [0, 5, 10, 16], sounds: [[5, 'discovered']] },
  impact: { seconds: 24, downAt: 9, lines: [0, 5, 9, 15], sounds: [[9, 'impact'], [12.5, 'discovered']] },
};

// sayBy: 'craft' (the bubble goes along with what flies or falls) or 'place' (it stands
// by the picture).
export function landmarkStage(kind, sayBy = 'craft') {
  if (kind === 'photo') {
    return (t) => {
      const x = -2.4 + 4.8 * clamp(t / 20);
      const said = up(t, 10.6, 16);
      return {
        probe: { x, y: 0.95, scale: 0.6, shown: t < 20 },
        flash: { x: x + 0.1, y: 0.95, scale: Math.max(0.01, 0.5 * flashAt(t - 9)), shown: flashAt(t - 9) > 0 },
        // The picture stays up to the end.
        photo: { x: -0.7, y: 0.02, scale: Math.max(0.01, ease(t, 9.3, 10.3)), shown: t >= 9.3 },
        bubble: sayBy === 'craft'
          ? { x: Math.min(0.9, x + 0.5), y: 1.26, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 }
          : { x: 0.5, y: 1.2, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
      };
    };
  }
  if (kind === 'look') {
    return (t) => {
      const said = up(t, 7, 13);
      return {
        photo: { x: -0.25, y: 0.02, scale: Math.max(0.01, 1.15 * ease(t, 5, 6.2)), shown: t >= 5 },
        bubble: { x: 0.85, y: 1.0, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
      };
    };
  }
  return (t) => {
    const u = clamp(t / 9);
    const s = t - 9;
    const flash = s < 0 ? 0 : s < 0.25 ? (s / 0.25) * 2.4 : 2.4 * Math.max(0, 1 - (s - 0.25) / 1.6);
    const said = sayBy === 'craft' ? up(t, 3.5, 8.6) : up(t, 13.6, 19);
    const rock = { x: -5.6 * (1 - u), y: 0.1 + 4.8 * (1 - u) };
    return {
      rock: { ...rock, lean: -3 * t, shown: t < 9 },
      flash: { x: 0, y: 0.15, scale: Math.max(0.01, flash), shown: flash > 0 },
      // What it threw out: a ring that spreads and thins.
      scraps: { x: 0, y: 0.05 + 0.5 * Math.max(0, s) - 0.16 * s * s, scale: 0.3 + 1.8 * Math.max(0, s), shown: s >= 0 && s < 3 },
      // The place as it is now.
      photo: { x: -0.7, y: 0.02, scale: Math.max(0.01, ease(t, 12.5, 13.5)), shown: t >= 12.5 },
      bubble: sayBy === 'craft'
        ? { x: Math.min(0.85, Math.max(-0.85, rock.x + 0.6)), y: Math.min(1.25, rock.y + 0.45), scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 }
        : { x: 0.5, y: 1.2, scale: Math.max(0.01, 0.8 * said), shown: said > 0.01 },
    };
  };
}

// A scene as core/replay.js wants it, from what it tells: { kind, sayBy, name, day,
// lines: four texts }.
export function landmarkScene({ kind, sayBy, name, day, lines }) {
  const times = LANDMARK_TIMES[kind];
  return {
    name, day, kind,
    seconds: times.seconds,
    downAt: times.downAt,
    viewKm: 56,
    sounds: times.sounds,
    lines: lines.map((text, i) => ({ at: times.lines[i], text })),
    stage: landmarkStage(kind, sayBy),
  };
}
