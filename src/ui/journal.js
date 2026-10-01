import { summarize } from '../core/progress.js';
import { surfaceDistance } from '../core/bodies.js';
import { objectParticle } from './messages.js';
import { FACTS } from '../core/facts.js';

const $ = (id) => document.getElementById(id);
// 로 after a vowel or ㄹ, 으로 after any other final consonant.
function hasFinalRieulOrNone(word) {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return [0, 8].includes((code - 0xac00) % 28);
}
const fmt = (n) => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });

// The explorer's journal: bodies found and landed on, photo missions done.
export function createJournal({ bodies, missions, stories = [], craft = [], onGo, onJump, onReset, onOpen, onClose }) {
  const dialog = $('journal');

  $('journalButton').addEventListener('click', () => open());
  $('closeJournal').addEventListener('click', () => dialog.close());
  $('resetJournal').addEventListener('click', () => {
    if (window.confirm('탐험 기록을 모두 지울까요? 되돌릴 수 없습니다. 지금 가까이 있는 천체는 곧바로 다시 기록됩니다.')) onReset();
  });
  dialog.addEventListener('close', () => onClose());

  // A button that closes the journal and jumps to somewhere already visited.
  function jumpButton(id, name) {
    const jump = document.createElement('button');
    jump.textContent = '순간 이동';
    jump.setAttribute('aria-label', `${name}${hasFinalRieulOrNone(name) ? '로' : '으로'} 순간 이동`);
    jump.addEventListener('click', () => {
      dialog.close();
      onJump(id);
    });
    return jump;
  }

  let lastProgress = null;
  let lastPosition = null;
  let lastBodies = bodies;

  function render() {
    const progress = lastProgress;
    const s = summarize(progress, bodies, missions, stories);
    $('journalSummary').textContent =
      `발견 ${s.discovered}/${s.bodies} · 착지 ${s.landed}/${s.bodies} · 사진 ${s.photos}/${s.missions} · 이야기 ${s.stories}/${s.storyTotal}`;

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
      const now = lastBodies.find((b) => b.id === body.id) ?? body;
      distance.textContent = `${fmt(surfaceDistance(lastPosition, now))} km`;
      const go = document.createElement('button');
      go.textContent = '목적지로';
      go.setAttribute('aria-label', `${body.name}${objectParticle(body.name)} 목적지로`);
      go.addEventListener('click', () => {
        dialog.close();
        onGo(body.id);
      });
      li.append(name, marks, distance, go);
      if (found) li.append(jumpButton(body.id, body.name));
      if (found && FACTS[body.id]) {
        const fact = document.createElement('small');
        fact.className = 'fact';
        fact.textContent = FACTS[body.id];
        li.append(fact);
      }
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

  // Story places: the story itself shows only after the visit; before, how to get there.
  function renderStories() {
    const list = $('journalStories');
    list.replaceChildren();
    for (const story of stories) {
      const done = (lastProgress.stories ?? []).includes(story.id);
      const li = document.createElement('li');
      li.className = done ? 'done' : '';
      const title = document.createElement('strong');
      title.textContent = `${done ? '✓' : '○'} ${story.name}${story.year ? ` (${story.year}년)` : ''}`;
      const line = document.createElement('span');
      line.textContent = done ? story.text : story.hint;
      li.append(title, line);
      // Only places on a surface have somewhere to appear.
      if (done && story.type === 'surface') li.append(jumpButton(story.id, story.name));
      list.append(li);
    }
  }

  // Craft are not scored: the list only says which have been met and offers the jump.
  function renderCraft() {
    const list = $('journalCraft');
    list.replaceChildren();
    for (const c of craft) {
      const met = (lastProgress.craft ?? []).includes(c.id);
      const li = document.createElement('li');
      li.className = met ? 'done' : '';
      const title = document.createElement('strong');
      title.textContent = `${met ? '✓' : '○'} ${c.name} (${c.launched}년)`;
      const line = document.createElement('span');
      line.textContent = met ? c.intro : '아직 만나지 못했습니다.';
      li.append(title, line);
      if (met) li.append(jumpButton(c.id, c.name));
      list.append(li);
    }
  }

  function open() {
    if (dialog.open) return;
    onOpen();
    render();
    renderStories();
    renderCraft();
    dialog.showModal();
    // The close button at the foot takes the focus, which scrolls the long list to its
    // end: start at the top instead.
    dialog.scrollTop = 0;
  }

  return {
    open,
    isOpen: () => dialog.open,
    // Remembered for the next open; the open list is not rebuilt so focus stays put.
    update(progress, position, current = bodies) {
      lastProgress = progress;
      lastPosition = position;
      lastBodies = current;
    },
  };
}
