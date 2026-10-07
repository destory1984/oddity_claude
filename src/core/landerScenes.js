import { LANDER_TEXTS } from './landerTexts.js';
import { clamp, ease, comeDown, rollOut, downLadder, said } from './moonScenes.js';

// Twenty-one more landings played again (the user, 2026-10-07, of the landers that had a
// model and no scene: "다 넣어"): twelve on the Moon and nine on Mars. Sixteen are stages
// of pieces as in core/moonScenes.js (LANDER_STAGES); five come down in the plain way of
// core/replay.js, under a parachute, inside air bags or on cords (LANDER_REPLAYS).
// What each tells is in core/landerTexts.js; render/siteModels.js builds the pieces.
// Real hours are drawn as seconds: a rover that rolled out seven hours (or seven days)
// after the landing rolls out a few seconds after it here, as the lines say.

// The four lines of a scene, each from its moment.
const told = (id, at) => LANDER_TEXTS[id].lines.map((text, i) => ({ at: at[i], text }));
const scene = (id, { at, ...rest }) => ({ name: LANDER_TEXTS[id].name, day: LANDER_TEXTS[id].day, lines: told(id, at), ...rest });

// A jump straight up between two moments, `high` at its top.
const jump = (t, from, to, high) => {
  const u = clamp((t - from) / (to - from));
  return high * 4 * u * (1 - u);
};

// An Apollo lunar module comes down by `downAt` and settles leaning `lean` (radians); one
// of the two climbs down the ladder between `outAt` and `outAt + 2.5`.
const apolloLands = (t, { downAt, lean = 0, outAt }) => {
  const climbing = t >= outAt && t < outAt + 2.5;
  return {
    lander: { x: -0.8 * (1 - ease(t, 0, downAt)), y: comeDown(t, downAt, 2.6), lean: lean * ease(t, downAt - 0.3, downAt + 0.5), burn: t < downAt },
    // (Drawn half as large again as they were, as Apollo 11's two are.)
    ladder: { ...downLadder(t, outAt, outAt + 2.5), turn: Math.PI, scale: 1.5, shown: climbing },
  };
};

// A lander with a rover on its deck: it comes down by `downAt` from `slide` to the side,
// and the rover rolls down the ramp at `rollAt`.
const roverLands = (t, { downAt, slide = 0, rollAt, to = 1.7, scale = 0.42 }) => {
  const y = comeDown(t, downAt, 2.5);
  return {
    lander: { x: -slide * (1 - ease(t, downAt * 0.5, downAt * 0.9)), y, burn: t < downAt },
    rover: { ...rollOut(t, { rollAt, ramp: 3, drive: 5.5, to, liftY: y, scale }), shown: t >= downAt },
  };
};

// One that takes soil and sends its top home: down by `downAt`, the flag out at
// `flagAt` (Chang'e 5 and 6), the top away at `leaveAt`.
const takesSoil = (t, { downAt, leaveAt, flagAt = null }) => {
  const y = comeDown(t, downAt, 2.4);
  const s = Math.max(0, t - leaveAt);
  const up = 0.26 * s * s;
  return {
    lander: { x: 0, y, burn: t < downAt },
    rocket: { x: 0, y: y + up, burn: t >= leaveAt, shown: up < 7 },
    ...(flagAt === null ? {} : { flag: { x: -0.42, y: 0.3, scale: Math.max(0.01, ease(t, flagAt, flagAt + 0.8)), shown: t >= flagAt } }),
  };
};

export const LANDER_STAGES = {
  // Apollo 14: Antares on a slope at Fra Mauro, and Shepard's golf shot at the end of
  // the second walk ("miles and miles and miles").
  apollo14: scene('apollo14', {
    seconds: 26, downAt: 10, viewKm: 56, at: [0, 6, 10, 17],
    sounds: [[6.3, 'landingBurn'], [10, 'landed'], [19.3, 'toss']],
    stage(t) {
      const fly = Math.max(0, t - 19.3);
      return {
        ...apolloLands(t, { downAt: 10, lean: 0.14, outAt: 11.5 }),
        al: { x: 0.75, y: 0, scale: 1.5, lean: -0.5 * Math.sin(Math.PI * clamp((t - 18.9) / 0.8)), shown: t >= 14 },
        ed: { x: 1.15, y: 0, scale: 1.5, turn: Math.PI, shown: t >= 15.5 },
        ball: { x: 0.85 + 0.9 * fly, y: 0.04 + 0.5 * fly - 0.04 * fly * fly, shown: t >= 19.3 && fly < 4.5 },
        say: said(t, 19.8, 24.6, 0.3, 1.05, 1.1),
      };
    },
  }),
  // Apollo 15: Falcon on a crater's rim at Hadley, and the first car driven on the Moon.
  apollo15: scene('apollo15', {
    seconds: 26, downAt: 10, viewKm: 56, at: [0, 6, 13, 19],
    sounds: [[6.3, 'landingBurn'], [10, 'landed'], [16.5, 'roll'], [20, 'roll']],
    stage(t) {
      return {
        ...apolloLands(t, { downAt: 10, lean: 0.15, outAt: 11.5 }),
        rover: { x: 0.8 + 1.5 * ease(t, 16.5, 24), y: 0, shown: t >= 14 },
        // Scott's own words as it set down.
        say: said(t, 10.4, 15.6, 0.5, 1.35, 1.5),
      };
    },
  }),
  // Apollo 16: Orion in the Descartes highlands, and Young's jump with a salute to the flag.
  apollo16: scene('apollo16', {
    seconds: 26, downAt: 10, viewKm: 56, at: [0, 6, 12, 20],
    sounds: [[6.3, 'landingBurn'], [10, 'landed'], [17.5, 'bounce'], [19.6, 'bounce']],
    stage(t) {
      return {
        ...apolloLands(t, { downAt: 10, outAt: 11.5 }),
        rover: { x: -1.35, y: 0, shown: t >= 14 },
        flag: { x: 0.7, y: 0, shown: t >= 14.5 },
        john: { x: 1.05, y: jump(t, 17.5, 19, 0.32) + jump(t, 19.6, 21.1, 0.32), turn: Math.PI, scale: 1.5, shown: t >= 14 },
        say: said(t, 17.7, 22.8, 0.4, 1.15, 1.1),
      };
    },
  }),
  // Surveyor 1: the big rocket under it is let go, the small engines cut 3.4 m up, and
  // it drops the rest. America's first soft landing on the Moon, at the first try.
  surveyor1: scene('surveyor1', {
    seconds: 24, downAt: 15, viewKm: 56, at: [0, 5, 12, 18],
    sounds: [[0.3, 'landingBurn'], [7, 'clunk'], [15, 'landed']],
    stage(t) {
      const y = t < 14 ? 0.25 + 2.6 * (1 - t / 14) ** 2 : 0.25 * (1 - clamp(t - 14)) ** 2;
      const fall = Math.max(0, t - 7);
      return {
        lander: { x: 0, y, burn: t < 14 },
        retro: { x: -0.25 * fall, y: Math.max(0.02, y - 0.02 - 0.9 * fall * fall), lean: 1.5 * fall, shown: t < 9.5 },
        say: said(t, 15.8, 21, 0.55, 1.3, 1.1),
      };
    },
  }),
  // Surveyor 7, the last, on the rough ground outside Tycho.
  surveyor7: scene('surveyor7', {
    seconds: 24, downAt: 10, viewKm: 56, at: [0, 6, 12, 18],
    sounds: [[6.3, 'landingBurn'], [10, 'landed']],
    stage(t) {
      return {
        lander: { x: 0, y: comeDown(t, 10, 2.6), burn: t < 9.6 },
        say: said(t, 12.6, 17.6, 0.55, 1.3, 1.1),
      };
    },
  }),
  // Luna 24: down, two metres of drilling, and the rocket leaves a day later.
  luna24: scene('luna24', {
    seconds: 26, downAt: 7, viewKm: 62, at: [0, 7, 14, 20],
    sounds: [[3.3, 'landingBurn'], [7, 'landed'], [15, 'ascent']],
    stage(t) {
      return {
        ...takesSoil(t, { downAt: 7, leaveAt: 15 }),
        say: said(t, 10.2, 14.6, 0.65, 1.3, 1.1),
      };
    },
  }),
  // Lunokhod 2 rolls off Luna 21 and turns to look back at it.
  lunokhod2: scene('lunokhod2', {
    seconds: 26, downAt: 8, viewKm: 56, at: [0, 8, 14, 20],
    sounds: [[4.3, 'landingBurn'], [8, 'landed'], [11, 'roll'], [16, 'roll']],
    stage(t) {
      const y = comeDown(t, 8, 2.4);
      const rover = rollOut(t, { rollAt: 11.5, ramp: 3.5, drive: 6, to: 1.6, liftY: y, scale: 0.5 });
      return {
        lander: { x: 0, y, burn: t < 8 },
        // Thirty metres off it turns round to take the lander's picture.
        rover: { ...rover, turn: Math.PI * ease(t, 21, 23) },
        say: said(t, 15.6, 20.4, Math.min(rover.x, 1.15) - 0.42, 0.95, 1.1),
      };
    },
  }),
  // Chang'e 3: it hovers and picks its own spot, and Yutu rolls out.
  change3: scene('change3', {
    seconds: 26, downAt: 10, viewKm: 56, at: [0, 5, 13, 20],
    sounds: [[6.3, 'landingBurn'], [10, 'landed'], [15.5, 'roll'], [19, 'roll']],
    stage(t) {
      const pieces = roverLands(t, { downAt: 10, slide: 0.6, rollAt: 15.5 });
      return { ...pieces, say: said(t, 17, 22, Math.min(pieces.rover.x, 1.15) - 0.42, 0.95, 1.1) };
    },
  }),
  // Chang'e 4 and Yutu-2: the first on the far side.
  change4: scene('change4', {
    seconds: 26, downAt: 9, viewKm: 56, at: [0, 5, 10, 19],
    sounds: [[5.3, 'landingBurn'], [9, 'landed'], [15.5, 'roll'], [19, 'roll']],
    stage(t) {
      return {
        ...roverLands(t, { downAt: 9, rollAt: 15.5 }),
        say: said(t, 9.6, 14.4, 0.55, 1.3, 1.1),
      };
    },
  }),
  // Chang'e 5: soil, a flag, and the ascender leaves two days later.
  change5: scene('change5', {
    seconds: 26, downAt: 7, viewKm: 62, at: [0, 7, 14, 20],
    sounds: [[3.3, 'landingBurn'], [7, 'landed'], [16, 'ascent']],
    stage(t) {
      return {
        ...takesSoil(t, { downAt: 7, leaveAt: 16, flagAt: 11.5 }),
        say: said(t, 8.2, 13, 0.65, 1.3, 1.1),
      };
    },
  }),
  // Chang'e 6: the same, on the far side.
  change6: scene('change6', {
    seconds: 26, downAt: 7, viewKm: 62, at: [0, 6, 12, 20],
    sounds: [[3.3, 'landingBurn'], [7, 'landed'], [16, 'ascent']],
    stage(t) {
      return {
        ...takesSoil(t, { downAt: 7, leaveAt: 16, flagAt: 12.5 }),
        say: said(t, 17.6, 22.6, 0.65, 1.3, 1.1),
      };
    },
  }),
  // Blue Ghost steps aside twice from the boulders and stands upright.
  blueGhost: scene('blueGhost', {
    seconds: 24, downAt: 12, viewKm: 56, at: [0, 6, 12, 18],
    sounds: [[8.3, 'landingBurn'], [12, 'landed']],
    stage(t) {
      return {
        lander: { x: -0.7 + 0.35 * ease(t, 5.5, 7) + 0.35 * ease(t, 8, 9.5), y: comeDown(t, 12, 2.6), burn: t < 12 },
        say: said(t, 12.6, 17.8, 0.55, 1.3, 1.1),
      };
    },
  }),
  // Viking 2: one leg on a rock, 8 degrees over.
  viking2: scene('viking2', {
    seconds: 24, downAt: 17, viewKm: 56, at: [0, 6, 12, 18],
    sounds: [[13.3, 'landingBurn'], [17, 'landed']],
    stage(t) {
      return {
        lander: { x: 0, y: comeDown(t, 17, 2.8), lean: -0.14 * ease(t, 16.8, 17.5), burn: t >= 8 && t < 17 },
        rock: { x: 0.36, y: 0 },
        say: said(t, 17.8, 22.8, 0.55, 1.2, 1.1),
      };
    },
  }),
  // Zhurong rides down on its lander and rolls off a week later.
  zhurong: scene('zhurong', {
    seconds: 26, downAt: 10, viewKm: 56, at: [0, 5, 10, 17],
    sounds: [[6.3, 'landingBurn'], [10, 'landed'], [15.5, 'roll'], [19, 'roll']],
    stage(t) {
      const pieces = roverLands(t, { downAt: 10, rollAt: 15.5, scale: 0.5 });
      return { ...pieces, say: said(t, 17, 22, Math.min(pieces.rover.x, 1.15) - 0.42, 0.95, 1.1) };
    },
  }),
  // Phoenix on twelve pulsing thrusters, level to a third of a degree.
  phoenix: scene('phoenix', {
    seconds: 24, downAt: 17, viewKm: 56, at: [0, 6, 12, 18],
    sounds: [[13.3, 'landingBurn'], [17, 'landed']],
    stage(t) {
      return {
        // (Its thrusters fired in pulses.)
        lander: { x: 0, y: comeDown(t, 17, 2.8), burn: t >= 8 && t < 17 && (t * 6) % 1 < 0.7 },
        say: said(t, 17.6, 22.6, 0.55, 1.2, 1.1),
      };
    },
  }),
  // InSight, which came to listen to the inside of Mars.
  insight: scene('insight', {
    seconds: 24, downAt: 17, viewKm: 56, at: [0, 6, 12, 18],
    sounds: [[13.3, 'landingBurn'], [17, 'landed']],
    stage(t) {
      return {
        lander: { x: 0, y: comeDown(t, 17, 2.8), burn: t >= 8 && t < 17 },
        say: said(t, 17.6, 22.6, 0.55, 1.2, 1.1),
      };
    },
  }),
};

// Six bounces shown for the dozens there were (Spirit 28, Opportunity 26), as Pathfinder's.
const BOUNCES = {
  seconds: 26, downAt: 16, fromKm: 10, fall: 5,
  hops: [{ until: 8, peakKm: 6 }, { until: 10.4, peakKm: 4 }, { until: 12.3, peakKm: 2.6 }, { until: 13.8, peakKm: 1.6 }, { until: 15, peakKm: 0.9 }, { until: 16, peakKm: 0.4 }],
  acrossKm: 10, rollFrom: 'start', turns: 5, bagSeconds: 2.5,
  sounds: [[0, 'chuteShort'], [5, 'bounce'], [8, 'bounce'], [10.4, 'bounce'], [12.3, 'bounce'], [13.8, 'bounce'], [15, 'bounce']],
};

export const LANDER_REPLAYS = {
  // Mars 3: the first thing to land whole on Mars, heard for twenty seconds.
  mars3: scene('mars3', { seconds: 24, downAt: 17, fromKm: 14, at: [0, 6, 12, 18], say: [18.2, 23], sounds: [[0, 'chute']] }),
  // Beagle 2: nothing was heard; this is how it was meant to go, and it did land.
  beagle2: scene('beagle2', { ...BOUNCES, hops: BOUNCES.hops.slice(0, 3).map((hop, i) => ({ ...hop, until: [9, 12.5, 16][i] })), turns: 3, at: [0, 5, 11, 17], say: [18.6, 24], sounds: [[0, 'chuteShort'], [5, 'bounce'], [9, 'bounce'], [12.5, 'bounce']] }),
  spirit: scene('spirit', { ...BOUNCES, at: [0, 5, 11, 17], say: [13, 18.6] }),
  opportunity: scene('opportunity', { ...BOUNCES, at: [0, 5, 13, 19], say: [13.4, 18.8] }),
  // Perseverance, let down on cords as Curiosity was.
  perseverance: scene('perseverance', { seconds: 24, downAt: 17, fromKm: 14, at: [0, 6, 12, 18], say: [17.8, 22.8], sounds: [[13.3, 'landingBurn'], [17.2, 'clunk'], [17.5, 'ascent']] }),
};
