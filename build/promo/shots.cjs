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

// A best view by the plate's four-pointed star.
const vista = (id, name, holdS) => async (p, rec) => {
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
  await p.waitForTimeout(holdS * 1000);
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
    await rec.start();
    await p.waitForTimeout(6000);
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
    await p.waitForTimeout(6000);
    return `picked ${picked}`;
  },
  jupiter: vista('jupiter', ['목성', 'Jupiter'], 6),
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
  saturn: vista('saturn', ['토성', 'Saturn'], 6),
  settle, closeAll, pick, near, gaze, busy,
};
