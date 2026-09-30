import { objectParticle } from './messages.js';

const $ = (id) => document.getElementById(id);
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
const fmt = (n) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);

export function createHud(bodies, { onSelect, onFace, onInspect }) {
  const markers = new Map();
  for (const body of bodies) {
    const el = document.createElement('button');
    el.className = body.kind === 'star' ? 'marker sun' : 'marker';
    el.textContent = body.name;
    el.addEventListener('click', () => onSelect(body.id));
    $('markers').append(el);
    markers.set(body.id, el);
  }
  $('faceTarget').addEventListener('click', onFace);
  $('inspectTarget').addEventListener('click', onInspect);

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
  }

  return {
    showSelection(body) {
      $('targetName').innerHTML = `${body.name} <small>${body.nameEn}</small>`;
      $('faceTarget').textContent = `${body.name} 바라보기`;
    },
    update({ view, local, selected, selectedDistance, speed, motionSign, zoneLabel, flightLabel, throttle, C }) {
      $('altitudeLabel').textContent = local.label;
      $('altitude').textContent = fmt(local.altitude);
      const backward = speed > 0.01 && motionSign < 0;
      $('speed').innerHTML = `${backward ? '후진 ' : ''}${fmt(speed)} <small>km/s</small>`;
      $('lightSpeed').textContent = `${backward ? '-' : ''}${(speed / C).toFixed(6)} c`;
      $('throttleValue').textContent = `${Math.round(throttle * 100)}%`;
      $('speedLimit').textContent = `현재 제한 ${zoneLabel}`;
      $('flightState').textContent = flightLabel;
      $('targetDistance').textContent = `${selected.name} 표면까지 ${fmt(selectedDistance)} km`;
      for (const body of bodies) {
        const hidden = body.kind === 'star' && view.sunVisibility < 0.01;
        placeMarker(markers.get(body.id), view.directions[body.id], view.camera, hidden ? `${body.name} · 가려짐` : body.name);
      }
    },
    faceToast(body) {
      return `${body.name}${objectParticle(body.name)} 바라봅니다. 위치와 속도는 유지됩니다.`;
    },
  };
}
