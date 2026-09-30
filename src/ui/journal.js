import { summarize } from '../core/progress.js';
import { surfaceDistance } from '../core/bodies.js';
import { objectParticle } from './messages.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });

// The explorer's journal: bodies found and landed on, photo missions done.
export function createJournal({ bodies, missions, onGo, onReset, onOpen, onClose }) {
  const dialog = $('journal');

  $('journalButton').addEventListener('click', () => open());
  $('closeJournal').addEventListener('click', () => dialog.close());
  $('resetJournal').addEventListener('click', () => {
    if (window.confirm('탐험 기록을 모두 지울까요? 되돌릴 수 없습니다. 지금 가까이 있는 천체는 곧바로 다시 기록됩니다.')) onReset();
  });
  dialog.addEventListener('close', () => onClose());

  let lastProgress = null;
  let lastPosition = null;

  function render() {
    const progress = lastProgress;
    const s = summarize(progress, bodies, missions);
    $('journalSummary').textContent =
      `발견 ${s.discovered}/${s.bodies} · 착지 ${s.landed}/${s.bodies} · 사진 ${s.photos}/${s.missions}`;

    const list = $('journalBodies');
    list.replaceChildren();
    for (const body of bodies) {
      const found = progress.discovered.includes(body.id);
      const landed = progress.landed.includes(body.id);
      const li = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = found ? body.name : `${body.name} (미발견)`;
      const marks = document.createElement('span');
      marks.className = 'marks';
      marks.textContent = `${found ? '발견 ✓' : '발견 —'}  ${landed ? '착지 ✓' : '착지 —'}`;
      const distance = document.createElement('span');
      distance.className = 'distance';
      distance.textContent = `${fmt(surfaceDistance(lastPosition, body))} km`;
      const go = document.createElement('button');
      go.textContent = '목적지로';
      go.setAttribute('aria-label', `${body.name}${objectParticle(body.name)} 목적지로`);
      go.addEventListener('click', () => {
        dialog.close();
        onGo(body.id);
      });
      li.append(name, marks, distance, go);
      list.append(li);
    }

    const missionList = $('journalMissions');
    missionList.replaceChildren();
    for (const mission of missions) {
      const done = progress.photos.includes(mission.id);
      const li = document.createElement('li');
      li.className = done ? 'done' : '';
      const title = document.createElement('strong');
      title.textContent = `${done ? '✓' : '○'} ${mission.name}`;
      const hint = document.createElement('span');
      hint.textContent = mission.hint;
      li.append(title, hint);
      missionList.append(li);
    }
  }

  function open() {
    if (dialog.open) return;
    onOpen();
    render();
    dialog.showModal();
  }

  return {
    open,
    isOpen: () => dialog.open,
    // Remembered for the next open; the open list is not rebuilt so focus stays put.
    update(progress, position) {
      lastProgress = progress;
      lastPosition = position;
    },
  };
}
