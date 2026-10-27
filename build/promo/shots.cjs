// The shots of the promo video, each a short script of moves on the game page (p),
// recording only between rec.start() and rec.stop(). See shoot.cjs.
const settle = async (p) => {
  await p.waitForFunction(() => window.oddity, null, { timeout: 30000 });
  await p.waitForTimeout(4000);
  // A key wakes the sound, as a player's first key does (Shift moves nothing).
  await p.keyboard.press('Shift');
  await closeAll(p);
  // A new player is offered the flight practice and handed notes: shut them as they come.
  await p.evaluate(() => { window.__hush = true; });
  await p.evaluate(() => { window.__shut = setInterval(() => document.querySelectorAll('dialog[open]').forEach((d) => { if (!window.__keep?.includes(d.id)) d.close(); }), 150); });
};
const closeAll = async (p) => {
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await p.waitForTimeout(400);
  if (await p.evaluate(() => { const b = document.getElementById('pauseButton'); return b.offsetParent && b.classList.contains('paused'); })) await p.click('#pauseButton');
};
// Picks a body or a place by its name tag (the tag may be hidden under her bubble).
// (names: the tag's words in each language the film is made in.)
const pick = (p, names) => p.evaluate((ns) => {
  // (A body's own tag before a place's: "Saturn" is also in "Saturn's Hexagon".)
  const all = [...document.querySelectorAll('.marker')].filter((e) => ns.some((n) => e.textContent.includes(n)));
  const m = all.find((e) => !e.classList.contains('site')) ?? all[0];
  if (m) m.click();
  return Boolean(m);
}, [].concat(names));
// Stands 'km' off the body, on the Sun's side, looking at it.
const near = (p, id, radii) => p.evaluate(([id, radii]) => {
  const o = window.oddity;
  const b = o.bodies().find((x) => x.id === id);
  const l = Math.hypot(...b.position);
  const out = b.position.map((n) => -n / l);
  o.place(b.position.map((n, i) => n + out[i] * b.radiusKm * radii), b.position);
}, [id, radii]);
// The scene's own keys at the foot (save photo, replay, back to flight, the field of view)
// and the dev server's test keys at the top are hidden while a day is filmed.
const clean = (p) => p.evaluate(() => {
  const tools = document.getElementById('photoTools');
  if (tools) tools.style.visibility = 'hidden';
  const test = document.getElementById('testBar');
  if (test) test.style.visibility = 'hidden';
});
const gaze = (p) => p.evaluate(() => document.getElementById('gazeButton').click());
const busy = (p) => p.evaluate(() => document.body.classList.contains('warping') || /가는 중|on the way|向かって|前往/.test(document.querySelector('#flightLabel, .flightLabel')?.textContent ?? ''));

// The camera moving through a shot, as in a film (the user, 2026-10-28: "모든 장면들은
// 영화처럼 카메라 시점이 움직이는 기법.. 그렇게 찍어"): the view as it was framed goes
// round the body's middle by 'yaw' degrees (about the camera's own up) and in to 'push'
// of its height over the ground, over 's' seconds, eased at both ends. The framing
// itself is kept: the camera turns with the move, so what was in the middle stays there.
const glide = async (p, id, { s, yaw = 0, push = 1 }) => {
  const steps = Math.max(1, Math.round(s * 20));
  const start = await p.evaluate((id) => {
    const o = window.oddity;
    const b = o.bodies().find((x) => x.id === id);
    const st = o.getState();
    const [x, y, z, w] = st.orientation;
    const turn = (v) => {
      const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])];
      return [v[0] + w * t[0] + (y * t[2] - z * t[1]), v[1] + w * t[1] + (z * t[0] - x * t[2]), v[2] + w * t[2] + (x * t[1] - y * t[0])];
    };
    return { off: st.position.map((n, i) => n - b.position[i]), ahead: turn([0, 0, 1]), above: turn([0, 1, 0]), radius: b.radiusKm };
  }, id);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const e = t * t * (3 - 2 * t);
    await p.evaluate(({ id, off, ahead, above, radius, a, k }) => {
      const o = window.oddity;
      const b = o.bodies().find((x) => x.id === id);
      // (Rodrigues: v turned by a about the unit axis 'above'.)
      const c = Math.cos(a), sn = Math.sin(a);
      const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const turn = (v) => { const x = cross(above, v), d = dot(above, v); return v.map((n, j) => n * c + x[j] * sn + above[j] * d * (1 - c)); };
      const r = Math.hypot(...off);
      const there = turn(off).map((n) => n / r * (radius + (r - radius) * k));
      const at = b.position.map((n, j) => n + there[j]);
      const look = turn(ahead);
      o.place(at, at.map((n, j) => n + look[j]), above);
    }, { id, ...start, a: (yaw * Math.PI / 180) * e, k: 1 - (1 - push) * e });
    await p.waitForTimeout(50);
  }
};

// A best view by the plate's four-pointed star.
const vista = (id, name, holdS, move = null) => async (p, rec) => {
  await settle(p);
  await near(p, id, 40);
  await p.waitForTimeout(2500);
  await closeAll(p);
  const picked = await pick(p, name);
  await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('vistaButton').click());
  await p.waitForTimeout(14000);
  await closeAll(p);
  await gaze(p);
  await p.waitForTimeout(1500);
  await rec.start();
  if (move) await glide(p, id, { s: holdS, ...move });
  else await p.waitForTimeout(holdS * 1000);
  return `picked ${picked}`;
};

// A place's "That day" scene: 60 km over the place, its tag, then the key on the plate
// (the card that opens on arrival is shut by settle's watcher).
const scene = (body, id, name, holdS, skipS = 0) => async (p, rec) => {
  await settle(p);
  await p.evaluate(([body, id]) => {
    const o = window.oddity;
    const s = o.sites().find((x) => x.id === id);
    const b = o.bodies().find((x) => x.id === body);
    const up = s.position.map((n, i) => n - b.position[i]);
    const l = Math.hypot(...up);
    o.place(s.position.map((n, i) => n + (up[i] / l) * 60), s.position);
  }, [body, id]);
  await p.waitForTimeout(2500);
  const picked = await pick(p, name);
  await p.waitForTimeout(11000);
  const key = await p.evaluate(() => { const k = document.getElementById('thenKey'); if (k) k.click(); return Boolean(k); });
  await p.waitForTimeout(skipS * 1000);
  await clean(p);
  await rec.start();
  await p.waitForTimeout(holdS * 1000);
  return `picked ${picked}, key ${key}`;
};

// A craft's "That day" scene (core/craftScenes.js): 200 km off the craft, away from the
// body nearest it, docked by the dock key, then the scene's key; recording from skipS in.
const craftDay = (id, holdS, skipS = 0) => async (p, rec) => {
  await settle(p);
  await p.evaluate((craftId) => {
    const o = window.oddity;
    const c = o.craft().find((x) => x.id === craftId);
    let near = null;
    let nearKm = Infinity;
    for (const b of o.bodies()) {
      const km = Math.hypot(...c.position.map((n, i) => n - b.position[i])) - b.radiusKm;
      if (km < nearKm) { nearKm = km; near = b; }
    }
    const d = c.position.map((n, i) => n - near.position[i]);
    const l = Math.hypot(...d);
    o.place(c.position.map((n, i) => n + (d[i] / l) * 200), c.position);
  }, id);
  await p.waitForTimeout(1500);
  const docked = await p.evaluate(() => { const b = document.getElementById('dockTarget'); if (b && !b.hidden) { b.click(); return true; } return false; });
  let key = false;
  for (let i = 0; i < 30 && !key; i++) {
    await p.waitForTimeout(1000);
    key = await p.evaluate(() => { const k = document.getElementById('thenKey'); return Boolean(k && !k.hidden && k.offsetParent); });
  }
  await closeAll(p);
  await p.evaluate(() => document.getElementById('thenKey')?.click());
  await p.waitForTimeout(skipS * 1000);
  await clean(p);
  await rec.start();
  await p.waitForTimeout(holdS * 1000);
  return `docked ${docked}, key ${key}`;
};

// The space-out film (2026-10-16): the space-out key pressed on screen.
// spaceout: the opening view, then the key once: the words and keys go.
const spaceout = async (p, rec) => {
  await settle(p);
  await p.waitForTimeout(9000);
  // Her word to a newcomer about the flight practice and the notices came and went in
  // the first second of the shot (the user, 2026-10-16: "7~8초 사이에 대사가 1컷"):
  // neither shows while it is filmed.
  await p.addStyleTag({ content: '#heroSay, #toast { visibility: hidden !important; }' });
  await rec.start();
  await p.waitForTimeout(1500);
  await gaze(p);
  await p.waitForTimeout(3000);
};
// A best view with the key already pressed once, then once more: she hides too.
const vistaHide = (id, name, holdS, hideAtS) => async (p, rec) => {
  const log = await vista(id, name, 0)(p, rec);
  await p.waitForTimeout(hideAtS * 1000);
  await gaze(p);
  await p.waitForTimeout((holdS - hideAtS) * 1000);
  return log;
};

module.exports = {
  spaceout,
  hide: vistaHide('saturn', ['토성', 'Saturn'], 5, 1.2),
  calm: vistaHide('moon', ['달', 'Moon'], 6, 0),
  // The "그날로" film (2026-10-16): six days played again where they happened.
  dart: craftDay('hera', 7, 1),
  hayabusa: craftDay('hayabusa2', 7, 13),
  soho: craftDay('soho', 7, 6),
  osiris: craftDay('osirisRex', 7, 12.5),
  herschel: scene('mimas', 'herschel', ['허셜', 'Herschel'], 30),
  tess: craftDay('tess', 9, 7),
  // The opening view, as a new player sees it once the first cards are closed.
  earth: async (p, rec) => {
    await settle(p);
    // (After her two opening lines: the second is long and runs to the screen's edge.)
    await p.waitForTimeout(9000);
    // (The turn of the camera makes her say she is dizzy: her bubble is left out.)
    await p.addStyleTag({ content: '#heroSay { visibility: hidden !important; }' });
    await rec.start();
    await glide(p, 'earth', { s: 6, yaw: 8, push: 0.85 });
  },
  // The music alone, longer than the film (shoot.cjs turns the effects off for it).
  music: async (p, rec) => {
    await settle(p);
    await p.waitForTimeout(1500);
    await rec.start();
    await p.waitForTimeout(36000);
  },
  // She flies by the player's own hand: facing the Moon, the forward key held down and the
  // speed climbing. Where and when the key was held goes to touch.json, for cut.py to draw
  // a fingertip on it (x, y: its middle in CSS pixels; from, to: seconds since 1970).
  fly: async (p, rec, lang, out) => {
    await settle(p);
    await p.waitForTimeout(6000);
    const picked = await pick(p, ['달', 'Moon']);
    await p.waitForTimeout(600);
    await p.evaluate(() => document.getElementById('faceTarget').click());
    await p.waitForTimeout(3000);
    const box = await p.evaluate(() => { const r = document.getElementById('flyButton').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
    // (Her word to a newcomer, that she might try the practice first, covered the middle
    // of the shot in the cut of 2026-10-28: left out.)
    await p.addStyleTag({ content: '#heroSay { visibility: hidden !important; }' });
    await rec.start();
    await p.waitForTimeout(800);
    await p.mouse.move(box.x, box.y);
    await p.mouse.down();
    const from = await p.evaluate(() => Date.now() / 1000);
    await p.waitForTimeout(5500);
    await p.mouse.up();
    const to = await p.evaluate(() => Date.now() / 1000);
    await p.waitForTimeout(700);
    require('fs').writeFileSync(require('path').join(out, 'touch.json'), JSON.stringify({ ...box, from, to }));
    return `picked ${picked}, key at ${Math.round(box.x)},${Math.round(box.y)}`;
  },
  // The aurora by Earth's plate key.
  aurora: async (p, rec) => {
    await settle(p);
    const picked = await pick(p, ['지구', 'Earth']);
    await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById('auroraButton').click());
    await p.waitForTimeout(14000);
    await closeAll(p);
    await gaze(p);
    await p.waitForTimeout(1500);
    await rec.start();
    await glide(p, 'earth', { s: 6, yaw: 10, push: 0.92 });
    return `picked ${picked}`;
  },
  // The Sun going behind Earth, seen from Earth's shadow (2026-10-28, the user picked the
  // still with its last edge going and the aurora on the rim): photo mode, nothing laid
  // over the view but her; the camera 3 Earth radii off on the shadow's axis, sliding in
  // from 0.45 to 0.2 radii aside. (Nearer than the Moon: the game's Sun is drawn much
  // larger than it would look from so close, and from the Moon Earth could not cover it.)
  eclipse: async (p, rec) => {
    await settle(p);
    await p.evaluate(() => document.getElementById('photoButton').click());
    await p.waitForTimeout(800);
    await p.addStyleTag({ content: '#hud > *:not(#markers), #photoTools, #toast, #heroSay, #guide, #skyTold, #testBar, .marker, .skyName, .viewBackKey { visibility: hidden !important; }' });
    const stand = (f) => p.evaluate((f) => {
      const e = window.oddity.bodies().find((b) => b.id === 'earth');
      const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
      const s = norm(e.position.map((x) => -x));
      const side = norm([s[2], 0, -s[0]]);
      window.oddity.place(e.position.map((x, i) => x - s[i] * 3 * e.radiusKm + side[i] * f * e.radiusKm), e.position);
    }, f);
    await stand(0.45);
    await p.waitForTimeout(5000);
    await rec.start();
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      await stand(0.45 - 0.25 * (i / steps));
      await p.waitForTimeout(100);
    }
    await p.waitForTimeout(1000);
  },
  // Jupiter on its sunlit side with her before it (its best view stood on its night
  // side by 2026-10-28, and the plate's view is its own camera, which a move would leave).
  jupiter: async (p, rec) => {
    await settle(p);
    await p.evaluate(() => {
      const bs = window.oddity.bodies();
      const by = (x) => bs.find((b) => b.id === x);
      const j = by('jupiter');
      const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
      const d = norm(by('sun').position.map((x, i) => x - j.position[i]));
      const s = norm([d[2], 0, -d[0]]);
      const dir = norm([d[0] * 0.8 + s[0] * 0.6, d[1] * 0.8 + 0.25, d[2] * 0.8 + s[2] * 0.6]);
      const at = j.position.map((x, i) => x + dir[i] * j.radiusKm * 5);
      window.oddity.place(at, j.position.map((x, i) => x - [0, 1, 0][i] * 1.4 * j.radiusKm));
    });
    await p.waitForTimeout(3000);
    await closeAll(p);
    await gaze(p);
    await p.waitForTimeout(2000);
    await rec.start();
    await glide(p, 'jupiter', { s: 6, yaw: 12, push: 0.85 });
  },
  apollo: scene('moon', 'apollo11', ['아폴로 11호', 'Apollo 11'], 24),
  naro: scene('earth', 'naro', ['나로우주센터', 'Naro'], 24),
  // The notebook, full (the dev server's test key fills it: PROMO_URL to port 4417).
  journal: async (p, rec) => {
    await settle(p);
    await p.evaluate(() => { window.__keep = ['journal']; window.__hush = false; document.getElementById('testAll').click(); });
    await p.waitForTimeout(2500);
    // Notes and today's request come one after another: fold each by its own key.
    await p.evaluate(() => clearInterval(window.__shut));
    for (let i = 0; i < 30; i++) {
      await p.evaluate(() => { for (const id of ['closeNoteCard', 'closeGate', 'closeStoryCard']) { const b = document.getElementById(id); if (b?.offsetParent) b.click(); } document.querySelectorAll('dialog[open]:not(#journal):not(#noteCard):not(#gateScene)').forEach((d) => d.close()); });
      await p.waitForTimeout(300);
    }
    await p.evaluate(() => { window.__hush = true; document.getElementById('journalButton').click(); });
    await p.waitForTimeout(1200);
    await rec.start();
    await p.waitForTimeout(1500);
    for (let i = 0; i < 12; i++) { await p.evaluate(() => { document.getElementById('journalScroll').scrollBy({ top: 120, behavior: 'smooth' }); }); await p.waitForTimeout(400); }
    await p.waitForTimeout(800);
  },
  saturn: vista('saturn', ['토성', 'Saturn'], 6, { yaw: -12, push: 0.85 }),
  settle, closeAll, pick, near, gaze, busy,
};
