import { objectParticle, distanceText, markedName } from './messages.js';
import { lookedAt, touchedSky } from '../core/sky.js';
import { keepMarker, spreadArrows, settleAbove, crowdedMoons, nearCentre, overlapped, clearOfPanels, COMPACT_WIDTH } from '../core/markers.js';
import { t } from '../core/i18n.js';

const $ = (id) => document.getElementById(id);
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
// Whole numbers only: the altitude and the speed are shown without a decimal.
const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
// A touch on the sky counts within this many pixels of a name or a constellation's line,
// and what it tells stays up this long.
const TOUCH_REACH = 30;
// The space kept between an arrow's label and the side of the screen (--gap on a phone).
const EDGE_GAP = 8;
const TOUCH_SECONDS = 10;

// The name plate is as wide as a whole number of the keys over it with the gaps between
// them: two at least, and as many more as its words need. (Nothing is set while the
// panel does not show: the keys then have no width to count by.)
function fitName() {
  const plate = $('targetName');
  const keys = [$('faceTarget'), $('lockTarget')].map((key) => key.getBoundingClientRect());
  const key = keys[0].width;
  if (!(key > 0)) return;
  const step = keys[1].left - keys[0].left;
  plate.style.width = '';
  const needs = plate.getBoundingClientRect().width;
  const count = Math.max(2, Math.ceil((needs + (step - key) - 0.5) / step));
  plate.style.width = `${count * step - (step - key)}px`;
}

export function createHud(bodies, { onSelect, onFace, onInspect, onHome, onAurora, onVista, vistas = [], auroras = ['earth'], skyLabels = [] }) {
  // The way home (core/home.js): a key that stands at the end of the name plate while
  // Earth is the one chosen. Writing another name into the plate takes it out again.
  const homeKey = $('homeButton');
  homeKey.hidden = false;
  homeKey.remove();
  homeKey.addEventListener('click', (event) => {
    event.stopPropagation();
    onHome?.();
  });
  // ...and before it the key to the place in the aurora.
  const auroraKey = $('auroraButton');
  auroraKey.hidden = false;
  auroraKey.remove();
  auroraKey.addEventListener('click', (event) => {
    event.stopPropagation();
    onAurora?.();
  });
  // The worlds that have one best view (core/vista.js) show one key for it.
  const vistaKey = $('vistaButton');
  vistaKey.hidden = false;
  vistaKey.remove();
  vistaKey.addEventListener('click', (event) => {
    event.stopPropagation();
    onVista?.();
  });
  window.addEventListener('resize', fitName);
  document.fonts?.ready.then(fitName);
  const markers = new Map();
  for (const body of bodies) {
    const el = document.createElement('button');
    el.className = { star: 'marker sun', exostar: 'marker sun', site: 'marker site' }[body.kind] ?? 'marker';
    el.textContent = body.name;
    el.addEventListener('click', () => onSelect(body.id));
    $('markers').append(el);
    markers.set(body.id, el);
  }
  // Names of constellations and galaxies: plain text on the sky, not targets.
  const skyNames = skyLabels.map((label) => {
    const el = document.createElement('span');
    el.className = 'skyLabel';
    el.textContent = label.name;
    // A line about it, shown only while it is the one looked at.
    const note = document.createElement('small');
    note.textContent = label.note ?? '';
    el.append(note);
    el.hidden = true;
    $('markers').append(el);
    return { id: label.id, el, direction: label.direction, figure: label.figure ?? [], name: label.name, story: label.story ?? label.note ?? '', picture: label.picture ?? null };
  });
  // What a touched sky thing tells: its picture, its name and two or three lines on a plate. It
  // stands over the label layer, so the character's outline is not cut out of it.
  const plate = document.createElement('div');
  plate.id = 'skyTold';
  plate.hidden = true;
  const platePicture = document.createElement('img');
  platePicture.alt = '';
  platePicture.width = 56;
  platePicture.height = 56;
  const plateName = document.createElement('strong');
  const plateStory = document.createElement('small');
  const plateWords = document.createElement('div');
  plateWords.append(plateName, plateStory);
  plate.append(platePicture, plateWords);
  // Last in the page, so it also stands over the notice and over what she is saying when
  // there is no room clear of them: what was asked for by a touch is read first.
  document.body.append(plate);
  let lastMask = null;
  let headsFoot = null;
  // Where the character is drawn, in pixels: the plate keeps off her.
  let heroBox = null;
  // The camera of the last frame drawn, and the sky thing touched: { id, until }.
  let lastCamera = null;
  let touched = null;
  // When a press on the view last put the plate away: that same press tells nothing new.
  let putAwayAt = -Infinity;
  // A direction as a point on screen, from its middle; null when it is behind the view.
  function skyPoint(direction, camera, least) {
    const z = dot(direction, camera.forward);
    if (z <= least) return null;
    const focal = innerHeight / (2 * Math.tan(camera.fov / 2));
    return [(dot(direction, camera.right) / z) * focal, (-dot(direction, camera.up) / z) * focal];
  }
  $('faceTarget').addEventListener('click', onFace);
  $('inspectTarget').addEventListener('click', onInspect);

  // Returns the screen point and whether the body is off screen.
  // A place this near is one she has come to see (a press on its name lands her there).
  const NEAR_PLACE_KM = 2000;
  function placeMarker(el, direction, camera, label) {
    const x = dot(direction, camera.right);
    const y = dot(direction, camera.up);
    const z = dot(direction, camera.forward);
    const w = innerWidth;
    const h = innerHeight;
    const focal = h / (2 * Math.tan(camera.fov / 2));
    let px = (x / Math.max(0.001, z)) * focal;
    let py = (-y / Math.max(0.001, z)) * focal;
    const mx = Math.max(50, w / 2 - 70);
    const my = Math.max(35, h / 2 - 100);
    const outside = z <= 0 || Math.abs(px) > mx || Math.abs(py) > my;
    if (outside) {
      if (Math.abs(px) + Math.abs(py) < 0.01) px = mx;
      const scale = Math.max(Math.abs(px) / mx, Math.abs(py) / my);
      px /= scale;
      py /= scale;
    }
    el.style.left = `${w / 2 + px}px`;
    el.style.top = `${h / 2 + py}px`;
    el.classList.toggle('inView', !outside);
    const arrow = outside ? `${ARROWS[(Math.round(Math.atan2(py, px) / (Math.PI / 4)) + 8) % 8]} ` : '';
    el.textContent = arrow + label;
    return { outside, x: w / 2 + px, y: h / 2 + py };
  }

  return {
    showSelection(body) {
      $('targetName').innerHTML = `${body.name} <small>${body.nameEn}</small>`;
      if (body.id === 'earth') $('targetName').append(auroraKey, homeKey);
      else if (auroras.includes(body.id) && vistas.includes(body.id)) $('targetName').append(auroraKey, vistaKey);
      else if (vistas.includes(body.id)) $('targetName').append(vistaKey);
      else if (auroras.includes(body.id)) $('targetName').append(auroraKey);
      fitName();
      $('faceTarget').textContent = t`${body.name} 바라보기`;
      // The button shows a picture only: its words are its name and its tip.
      $('faceTarget').title = t`${body.name} 바라보기`;
    },
    // goalId: the body the first-visit guide points at; its label always shows and pulses.
    // knownIds: a Set of what is in the journal (bodies found, craft met, places logged).
    // nearestIds: the body whose surface is closest (a moon counts) and a neighbour next
    // nearest (core/markers.js nearestBodies); their labels always say how far they
    // are, and off screen they keep an edge arrow, on a phone too.
    // moonIds: the moons of the planet she is near (nearbyMoons): they keep an arrow and
    // say how far they are, without the nearest one's mint line.
    update({ view, local, nearestIds = [local.body.id], moonIds = [], selected, speed, motionSign, limitLabel, flightLabel, throttle, C, goalId = null, hiddenIds = [], knownIds = null, skyHidden = null }) {
      $('altitudeLabel').textContent = local.label;
      $('altitude').textContent = fmt(local.altitude);
      const backward = speed > 0.01 && motionSign < 0;
      $('speed').innerHTML = `${backward ? t('후진 ') : ''}${fmt(speed)} <small>km/s</small>`;
      $('lightSpeed').textContent = `${backward ? '-' : ''}${(speed / C).toFixed(6)} c`;
      $('throttleValue').textContent = `${Math.round(throttle * 100)}%`;
      $('speedLimit').textContent = t`현재 제한 ${limitLabel}`;
      $('flightState').textContent = flightLabel;
      const compact = innerWidth <= COMPACT_WIDTH;
      lastCamera = view.camera;
      // Every body in view gets a label; off-screen arrows only for the selected, the
      // nearest and nearby bodies (core/markers.js), so fifteen arrows do not pile up.
      const placed = bodies.map((body) => {
        const el = markers.get(body.id);
        const hidden = body.kind === 'star' && view.sunVisibility < 0.01;
        // ✓ somewhere already in the journal, ○ somewhere not yet.
        const name = knownIds ? markedName(body.name, knownIds.has(body.id)) : body.name;
        el.classList.toggle('unknown', Boolean(knownIds) && !knownIds.has(body.id));
        const spot = placeMarker(el, view.directions[body.id], view.camera, hidden ? t`${name} · 가려짐` : name);
        // What the traveler is looking toward also says how far its surface is.
        const nearestHere = nearestIds.includes(body.id);
        el.classList.toggle('nearest', nearestHere);
        const moonHere = moonIds.includes(body.id);
        if (nearestHere || moonHere || (!spot.outside && nearCentre(spot.x, spot.y, innerWidth, innerHeight))) {
          el.textContent += ` · ${distanceText(Math.max(0, view.distances[body.id] - body.radiusKm))}`;
        }
        const selectedHere = body.id === selected.id;
        // A story place gets no off-screen arrow unless it is the chosen target.
        const keep = (body.kind !== 'site' || !spot.outside || selectedHere) && keepMarker({
          outside: spot.outside,
          selected: selectedHere,
          nearest: nearestHere || moonHere,
          surfaceKm: view.distances[body.id] - body.radiusKm,
          always: body.kind === 'star' || body.id === goalId,
          compact,
        });
        return { body, el, spot, keep, selected: selectedHere };
      });
      const crowded = crowdedMoons(placed.map(({ body, spot, selected: sel }) => ({
        id: body.id, parent: ['moon', 'craft', 'site'].includes(body.kind) ? body.parent : null, x: spot.x, y: spot.y, outside: spot.outside,
        // (A place she is right over keeps its name: looking straight down at Apollo 17's
        // from 120 km, the Moon's own name stood at the same point and the place had none.)
        selected: sel || body.id === goalId || (body.kind === 'site' && view.distances[body.id] < NEAR_PLACE_KM),
      })));
      // An off-screen arrow that would stand on the readouts, the minimap or the target
      // panel is brought down under them (core/markers.js clearOfPanels). On a phone
      // those fill the top of the screen from side to side (the label of Mars 3's site
      // once lay over the target's name); on a wide screen they stand at its two sides
      // (the Sun's arrow lay over the dock button and over the minimap).
      const map = $('minimap').getBoundingClientRect();
      const readout = $('altitudeLabel').getBoundingClientRect();
      const target = $('targetPanel').getBoundingClientRect();
      // On a phone the notice stands right under those, so an arrow goes under it too
      // while it is up.
      const headsBottom = Math.max(map.bottom, target.bottom);
      const notice = $('toast');
      const noticeUp = notice.classList.contains('on');
      const noticeBottom = compact && noticeUp ? notice.getBoundingClientRect().bottom : 0;
      // The chosen target's (and the goal's) own name in view comes down under the target
      // panel too: turned to face Earth with the guide's line up, Earth's name lay under
      // the name plate, where it is pressed again to jump (23: half a label and one gap);
      // and, on a phone, under the notice while that is up.
      for (const { body, el, spot, keep, selected: sel } of placed) {
        if (!keep || spot.outside || !(sel || body.id === goalId)) continue;
        const y = clearOfPanels(spot, compact && noticeUp ? [target, notice.getBoundingClientRect()] : [target], 23, el.offsetWidth / 2 + 4);
        if (y === spot.y) continue;
        spot.y = y;
        el.style.top = `${y}px`;
      }
      const panels = compact
        ? [{ left: 0, top: 0, right: innerWidth, bottom: Math.max(headsBottom, noticeBottom) }]
        : [
          // (The height plate is hidden on every screen since v0.1.187: then the minimap alone.)
          readout.width ? { left: Math.min(map.left, readout.left), top: readout.top, right: Math.max(map.right, readout.right), bottom: map.bottom } : { left: map.left, top: map.top, right: map.right, bottom: map.bottom },
          { left: target.left, top: target.top, right: target.right, bottom: target.bottom },
        ];
      // What Sora is saying, while it is up: an arrow's label does not stand under it
      // (the bubble is drawn over the labels and hid them).
      const bubble = $('heroSay');
      const saying = bubble?.classList.contains('on') ? [bubble.getBoundingClientRect()] : [];
      // A place she is right over, whose name would lie on its own world's (looking straight
      // down they stand at one point, and the world's would win): it stands one line under,
      // and the arrows keep off it as off the chosen target's name.
      const nearPlace = (body) => body.kind === 'site' && view.distances[body.id] < NEAR_PLACE_KM;
      for (const { body, el, spot, keep } of placed) {
        if (!keep || spot.outside || !nearPlace(body) || crowded.has(body.id) || hiddenIds.includes(body.id)) continue;
        const world = markers.get(body.parent);
        if (!world || world.hidden) continue;
        el.hidden = false;
        const a = el.getBoundingClientRect();
        const b = world.getBoundingClientRect();
        if (a.left < b.right && b.left < a.right && a.top < b.bottom + 6 && b.top < a.bottom + 6) el.style.top = `${b.bottom + 6 + a.height / 2}px`;
      }
      // The chosen target's and the goal's own names, when they are in view: an arrow
      // keeps off them as off a panel (on a small phone two arrows lay on the target's
      // name, which is never hidden).
      const keptNames = placed
        .filter(({ body, el, spot, keep, selected: sel }) => keep && !spot.outside && (sel || body.id === goalId || nearPlace(body)) && !hiddenIds.includes(body.id) && !el.hidden)
        .map(({ el }) => el.getBoundingClientRect())
        .filter((box) => box.width)
        .map(({ left, top, right, bottom }) => ({ left, top, right, bottom }));
      const arrows = [];
      for (const { body, el, spot, keep, selected: sel } of placed) {
        el.hidden = !keep || crowded.has(body.id) || hiddenIds.includes(body.id);
        el.classList.toggle('selected', sel);
        el.classList.toggle('goal', body.id === goalId);
        if (el.hidden || !spot.outside) continue;
        // An arrow's label stays whole on screen, one gap from the edge: a long one
        // ("← ✓ 지구 · 6,794km") ran past the left edge of a phone, and two of them
        // stood at two different distances from it.
        const half = el.offsetWidth / 2;
        const x = Math.max(EDGE_GAP + half, Math.min(innerWidth - EDGE_GAP - half, spot.x));
        const y = clearOfPanels({ x, y: clearOfPanels(spot, panels) }, keptNames, 16, half + 4);
        // Brought down from under her bubble it may come onto the target's name: off that again.
        const clear = clearOfPanels({ x, y: clearOfPanels({ x, y }, saying, 18, half + 4) }, keptNames, 16, half + 4);
        // Those moved from under the bubble keep their order from top to bottom.
        arrows.push({ el, ...spot, x, half, y: clear === y ? y : clear + y * 1e-4 });
      }
      // Labels in view that would cover each other: the nearer thing keeps its label.
      const inView = placed.filter(({ el, spot }) => !el.hidden && !spot.outside);
      const covered = overlapped(inView.map(({ body, el, selected: sel }) => {
        const { left, top, right, bottom } = el.getBoundingClientRect();
        return {
          id: body.id, left, top, right, bottom, km: view.distances[body.id] - body.radiusKm, first: sel || body.id === goalId,
          minor: body.kind === 'craft' || body.kind === 'site',
        };
      }));
      for (const { body, el } of inView) if (covered.has(body.id)) el.hidden = true;
      // The keys and the readouts along the foot: no arrow's label lies on them (30: y is
      // the middle of a label some 28px tall, and a plate's ring reaches 8px past its box).
      const feet = ['footer .speedBox', 'footer .throttle', '#hint', '#slidePad', '#reverseButton', '#flyButton', '#rearButton', '#slideDown', '#craftCard']
        .map((q) => document.querySelector(q)?.getBoundingClientRect())
        .filter((box) => box?.width && box.top > innerHeight / 2);
      settleAbove(spreadArrows(arrows, 40, innerHeight).map((spot, i) => ({ ...arrows[i], y: spot.y })), feet, 30).forEach((spot, i) => {
        arrows[i].el.style.top = `${spot.y}px`;
        arrows[i].el.style.left = `${arrows[i].x}px`;
      });
      // An arrow's label that has come to lie on a name in view: the name waits (the arrows
      // are few and chosen: the nearest body, the target, the Sun). The chosen target's and
      // the goal's own names stay.
      if (arrows.length) {
        const boxes = arrows.map(({ el }) => el.getBoundingClientRect());
        const hits = (name, box) => name.left < box.right + 2 && box.left < name.right + 2 && name.top < box.bottom + 2 && box.top < name.bottom + 2;
        for (const { body, el, selected: sel } of inView) {
          if (el.hidden) continue;
          const name = el.getBoundingClientRect();
          if (sel || body.id === goalId || nearPlace(body)) continue;
          if (boxes.some((box) => hits(name, box))) el.hidden = true;
        }
      }
      // On a phone the notice stands one gap under the minimap and the target panel,
      // however tall they are (style.css reads --heads-foot).
      const foot = compact ? Math.round(headsBottom) : null;
      if (foot !== headsFoot) {
        headsFoot = foot;
        if (foot === null) document.documentElement.style.removeProperty('--heads-foot');
        else document.documentElement.style.setProperty('--heads-foot', `${foot}px`);
      }
      const focal = innerHeight / (2 * Math.tan(view.camera.fov / 2));
      // The names of what is in the sky, on a phone too (they were left out there; the
      // user, 2026-10-04: "시야에 보일 때에는 설명 태그도 보여줘", "별자리도 설명 태그 보여줘").
      if (touched && performance.now() > touched.until) touched = null;
      const shown = [];
      let touchedSpot = null;
      for (const { id, el, direction } of skyNames) {
        const z = dot(direction, view.camera.forward);
        const px = (dot(direction, view.camera.right) / Math.max(0.001, z)) * focal;
        const py = (-dot(direction, view.camera.up) / Math.max(0.001, z)) * focal;
        const off = Math.abs(px) > innerWidth / 2 || Math.abs(py) > innerHeight / 2;
        // The one touched keeps telling though its name's own place may be off screen (a
        // large figure touched at its far end).
        // It lets go once the view has turned half a screen past it.
        const kept = touched?.id === id && z > 0.2 && Math.abs(px) < innerWidth && Math.abs(py) < innerHeight;
        // The plate stands in for its name.
        // (And a name behind a planet or a moon is not written over it.)
        el.hidden = kept || z <= 0.2 || off || Boolean(skyHidden?.(direction));
        if (kept) touchedSpot = { x: innerWidth / 2 + px, y: innerHeight / 2 + py };
        if (el.hidden) continue;
        el.style.left = `${innerWidth / 2 + px}px`;
        el.style.top = `${innerHeight / 2 + py}px`;
        shown.push({ id, x: px, y: py });
      }
      // Turned away from what was touched: it stops telling.
      if (touched && !touchedSpot) touched = null;
      // The one being looked at tells a line about itself, unless a plate is up.
      const told = touched ? null : lookedAt(shown, Math.min(innerWidth, innerHeight) * 0.3);
      for (const { id, el } of skyNames) el.classList.toggle('told', id === told);
      plate.hidden = !touched;
      if (touchedSpot) {
        // The plate hangs under its point, whole on screen, clear of the panels above it
        // and, on a phone, of the keys at the foot. It keeps off the character and what
        // she is saying: it goes above them, and if there is no room there at its own
        // place, to her left or her right, where the panels may end higher.
        const width = plate.offsetWidth;
        const height = plate.offsetHeight;
        const foot = (compact ? document.querySelector('#hud footer').getBoundingClientRect().top : innerHeight) - 8;
        const heads = ['#hud nav', '#minimap', '#targetPanel', '#guide'].map((q) => document.querySelector(q)?.getBoundingClientRect()).filter((box) => box?.width);
        const bubble = $('heroSay');
        const saying = bubble && getComputedStyle(bubble).opacity > 0.05 ? bubble.getBoundingClientRect() : null;
        const across = (box, left) => left < box.right && left + width > box.left;
        const place = (left) => {
          const top = Math.max(0, ...heads.filter((box) => across(box, left)).map((box) => box.bottom)) + 8;
          let y = Math.max(top, Math.min(foot - height, touchedSpot.y + 14));
          const kept = [heroBox, saying].filter((box) => box && across(box, left));
          const over = kept.some((box) => y < box.bottom && y + height > box.top);
          if (over) y = Math.min(...kept.map((box) => box.top)) - 8 - height;
          return { left, y: Math.max(top, y), fits: !over || y >= top };
        };
        const own = Math.max(8, Math.min(innerWidth - 8 - width, touchedSpot.x - width / 2));
        // Beside her: as near as the screen lets it (on a phone that is the edge).
        const hers = [heroBox, saying].filter(Boolean);
        const within = (left) => Math.max(8, Math.min(innerWidth - 8 - width, left));
        const sides = hers.length ? [within(Math.min(...hers.map((box) => box.left)) - 8 - width), within(Math.max(...hers.map((box) => box.right)) + 8)] : [];
        if (touchedSpot.x > innerWidth / 2) sides.reverse();
        const spots = [own, ...sides].map(place);
        const spot = spots.find((s) => s.fits) ?? spots[0];
        plate.style.left = `${spot.left}px`;
        plate.style.top = `${spot.y}px`;
      }
    },
    // A press anywhere on the view while a plate is up puts it away (the user,
    // 2026-10-05: "화면을 터치 OR 10초 지나면 없어지게 해").
    pressSky() {
      if (!touched) return;
      touched = null;
      plate.hidden = true;
      putAwayAt = performance.now();
    },
    // A short touch on the sky at (x, y): the constellation, galaxy or cluster there tells
    // its lines for a while. Returns its id, or null.
    touchSky(x, y) {
      if (!lastCamera || performance.now() - putAwayAt < 500) return null;
      const shapes = [];
      for (const { id, direction, figure } of skyNames) {
        const middle = skyPoint(direction, lastCamera, 0.2);
        if (!middle) continue;
        // A stroke with an end behind the view is left out.
        const lines = [];
        for (const line of figure) {
          const points = line.map((p) => skyPoint(p, lastCamera, 0.05));
          for (let i = 1; i < points.length; i += 1) if (points[i - 1] && points[i]) lines.push([points[i - 1], points[i]]);
        }
        shapes.push({ id, x: middle[0], y: middle[1], lines });
      }
      // The name is written 14px under its point (style.css): count the touch from there.
      const point = { x: x - innerWidth / 2, y: y - innerHeight / 2 };
      const id = touchedSky(shapes, point, TOUCH_REACH) ?? touchedSky(shapes.map((s) => ({ ...s, y: s.y + 20, lines: [] })), point, TOUCH_REACH);
      touched = id ? { id, until: performance.now() + TOUCH_SECONDS * 1000 } : null;
      const thing = skyNames.find((s) => s.id === id);
      plateName.textContent = thing?.name ?? '';
      plateStory.textContent = thing?.story ?? '';
      platePicture.hidden = !thing?.picture;
      if (thing?.picture) platePicture.src = `${import.meta.env.BASE_URL}assets/${thing.picture}`;
      if (!thing) plate.hidden = true;
      return id;
    },
    // Labels pass behind the character: her outline is cut out of the label layer, using
    // the very drawing that is on screen. card: world.update's heroCard, or null.
    maskHero(card) {
      let mask = 'none';
      heroBox = null;
      if (card) {
        const height = card.height * innerHeight;
        const width = height * card.shape;
        const left = innerWidth / 2 - width / 2;
        const top = innerHeight / 2 - card.up * innerHeight - height / 2;
        heroBox = { left, top, right: left + width, bottom: top + height };
        mask = `url("${card.file}") ${left.toFixed(1)}px ${top.toFixed(1)}px / ${width.toFixed(1)}px ${height.toFixed(1)}px no-repeat, linear-gradient(#000, #000)`;
      }
      if (mask === lastMask) return;
      lastMask = mask;
      const layer = $('markers');
      layer.style.webkitMask = mask;
      layer.style.mask = mask;
      layer.style.webkitMaskComposite = card ? 'xor' : '';
      layer.style.maskComposite = card ? 'exclude' : '';
    },
    faceToast(body) {
      return t`${body.name}${objectParticle(body.name)} 바라봅니다. 위치와 속도는 유지됩니다.`;
    },
  };
}
