import { objectParticle, distanceText, markedName } from './messages.js';
import { keepMarker, spreadArrows, crowdedMoons, nearCentre, overlapped, COMPACT_WIDTH } from '../core/markers.js';

const $ = (id) => document.getElementById(id);
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
// Whole numbers only: the altitude and the speed are shown without a decimal.
const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);

export function createHud(bodies, { onSelect, onFace, onInspect, skyLabels = [] }) {
  const markers = new Map();
  for (const body of bodies) {
    const el = document.createElement('button');
    el.className = { star: 'marker sun', site: 'marker site' }[body.kind] ?? 'marker';
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
    el.hidden = true;
    $('markers').append(el);
    return { el, direction: label.direction };
  });
  let lastMask = null;
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
    },
    // goalId: the body the first-visit guide points at; its label always shows and pulses.
    // knownIds: a Set of what is in the journal (bodies found, craft met, places logged).
    // nearestIds: the body whose surface is closest (a moon counts) and a neighbour next
    // nearest (core/markers.js nearestBodies); their labels always say how far they
    // are, and off screen they keep an edge arrow, on a phone too.
    update({ view, local, nearestIds = [local.body.id], selected, speed, motionSign, limitLabel, flightLabel, throttle, C, goalId = null, hiddenIds = [], knownIds = null }) {
      $('altitudeLabel').textContent = local.label;
      $('altitude').textContent = fmt(local.altitude);
      const backward = speed > 0.01 && motionSign < 0;
      $('speed').innerHTML = `${backward ? '후진 ' : ''}${fmt(speed)} <small>km/s</small>`;
      $('lightSpeed').textContent = `${backward ? '-' : ''}${(speed / C).toFixed(6)} c`;
      $('throttleValue').textContent = `${Math.round(throttle * 100)}%`;
      $('speedLimit').textContent = `현재 제한 ${limitLabel}`;
      $('flightState').textContent = flightLabel;
      const compact = innerWidth <= COMPACT_WIDTH;
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
        if (nearestHere || (!spot.outside && nearCentre(spot.x, spot.y, innerWidth, innerHeight))) {
          el.textContent += ` · ${distanceText(Math.max(0, view.distances[body.id] - body.radiusKm))}`;
        }
        const selectedHere = body.id === selected.id;
        // A story place gets no off-screen arrow unless it is the chosen target.
        const keep = (body.kind !== 'site' || !spot.outside || selectedHere) && keepMarker({
          outside: spot.outside,
          selected: selectedHere,
          nearest: nearestHere,
          surfaceKm: view.distances[body.id] - body.radiusKm,
          always: body.id === 'earth' || body.kind === 'star' || body.id === goalId,
          compact,
        });
        return { body, el, spot, keep, selected: selectedHere };
      });
      const crowded = crowdedMoons(placed.map(({ body, spot, selected: sel }) => ({
        id: body.id, parent: ['moon', 'craft', 'site'].includes(body.kind) ? body.parent : null, x: spot.x, y: spot.y, outside: spot.outside, selected: sel || body.id === goalId,
      })));
      // On a phone the readouts, the minimap and the target panel fill the top of the
      // screen: an off-screen arrow that would stand on them is brought down under them
      // (the label of Mars 3's site once lay over the target's name).
      const arrowTop = compact
        ? Math.max($('minimap').getBoundingClientRect().bottom, $('targetPanel').getBoundingClientRect().bottom) + 18
        : 0;
      const arrows = [];
      for (const { body, el, spot, keep, selected: sel } of placed) {
        el.hidden = !keep || crowded.has(body.id) || hiddenIds.includes(body.id);
        el.classList.toggle('selected', sel);
        el.classList.toggle('goal', body.id === goalId);
        if (!el.hidden && spot.outside) arrows.push({ el, ...spot, y: Math.max(spot.y, arrowTop) });
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
      for (const { el, direction } of skyNames) {
        const z = dot(direction, view.camera.forward);
        const px = (dot(direction, view.camera.right) / Math.max(0.001, z)) * focal;
        const py = (-dot(direction, view.camera.up) / Math.max(0.001, z)) * focal;
        // A phone has no room for the names of constellations.
        el.hidden = compact || z <= 0.2 || Math.abs(px) > innerWidth / 2 || Math.abs(py) > innerHeight / 2;
        if (el.hidden) continue;
        el.style.left = `${innerWidth / 2 + px}px`;
        el.style.top = `${innerHeight / 2 + py}px`;
      }
    },
    // Labels pass behind the character: her outline is cut out of the label layer, using
    // the very drawing that is on screen. card: world.update's heroCard, or null.
    maskHero(card) {
      let mask = 'none';
      if (card) {
        const height = card.height * innerHeight;
        const width = height * card.shape;
        const left = innerWidth / 2 - width / 2;
        const top = innerHeight / 2 - card.up * innerHeight - height / 2;
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
