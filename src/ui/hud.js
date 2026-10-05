import { objectParticle, distanceText, markedName } from './messages.js';
import { lookedAt, touchedSky } from '../core/sky.js';
import { keepMarker, spreadArrows, crowdedMoons, nearCentre, overlapped, clearOfPanels, COMPACT_WIDTH } from '../core/markers.js';

const $ = (id) => document.getElementById(id);
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
// Whole numbers only: the altitude and the speed are shown without a decimal.
const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
// A touch on the sky counts within this many pixels of a name or a constellation's line,
// and what it tells stays up this long.
const TOUCH_REACH = 30;
const TOUCH_SECONDS = 10;

export function createHud(bodies, { onSelect, onFace, onInspect, skyLabels = [] }) {
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
      $('faceTarget').textContent = `${body.name} 바라보기`;
      // The button shows a picture only: its words are its name and its tip.
      $('faceTarget').title = `${body.name} 바라보기`;
    },
    // goalId: the body the first-visit guide points at; its label always shows and pulses.
    // knownIds: a Set of what is in the journal (bodies found, craft met, places logged).
    // nearestIds: the body whose surface is closest (a moon counts) and a neighbour next
    // nearest (core/markers.js nearestBodies); their labels always say how far they
    // are, and off screen they keep an edge arrow, on a phone too.
    // moonIds: the moons of the planet she is near (nearbyMoons): they keep an arrow and
    // say how far they are, without the nearest one's mint line.
    update({ view, local, nearestIds = [local.body.id], moonIds = [], selected, speed, motionSign, limitLabel, flightLabel, throttle, C, goalId = null, hiddenIds = [], knownIds = null }) {
      $('altitudeLabel').textContent = local.label;
      $('altitude').textContent = fmt(local.altitude);
      const backward = speed > 0.01 && motionSign < 0;
      $('speed').innerHTML = `${backward ? '후진 ' : ''}${fmt(speed)} <small>km/s</small>`;
      $('lightSpeed').textContent = `${backward ? '-' : ''}${(speed / C).toFixed(6)} c`;
      $('throttleValue').textContent = `${Math.round(throttle * 100)}%`;
      $('speedLimit').textContent = `현재 제한 ${limitLabel}`;
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
        const spot = placeMarker(el, view.directions[body.id], view.camera, hidden ? `${name} · 가려짐` : name);
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
        id: body.id, parent: ['moon', 'craft', 'site'].includes(body.kind) ? body.parent : null, x: spot.x, y: spot.y, outside: spot.outside, selected: sel || body.id === goalId,
      })));
      // An off-screen arrow that would stand on the readouts, the minimap or the target
      // panel is brought down under them (core/markers.js clearOfPanels). On a phone
      // those fill the top of the screen from side to side (the label of Mars 3's site
      // once lay over the target's name); on a wide screen they stand at its two sides
      // (the Sun's arrow lay over the dock button and over the minimap).
      const map = $('minimap').getBoundingClientRect();
      const readout = $('altitudeLabel').getBoundingClientRect();
      const target = $('targetPanel').getBoundingClientRect();
      const panels = compact
        ? [{ left: 0, top: 0, right: innerWidth, bottom: Math.max(map.bottom, target.bottom) }]
        : [
          { left: Math.min(map.left, readout.left), top: readout.top, right: Math.max(map.right, readout.right), bottom: map.bottom },
          { left: target.left, top: target.top, right: target.right, bottom: target.bottom },
        ];
      const arrows = [];
      for (const { body, el, spot, keep, selected: sel } of placed) {
        el.hidden = !keep || crowded.has(body.id) || hiddenIds.includes(body.id);
        el.classList.toggle('selected', sel);
        el.classList.toggle('goal', body.id === goalId);
        if (!el.hidden && spot.outside) arrows.push({ el, ...spot, y: clearOfPanels(spot, panels) });
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
      spreadArrows(arrows, 40, innerHeight).forEach((spot, i) => {
        arrows[i].el.style.top = `${spot.y}px`;
      });
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
        el.hidden = kept || z <= 0.2 || off;
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
      return `${body.name}${objectParticle(body.name)} 바라봅니다. 위치와 속도는 유지됩니다.`;
    },
  };
}
