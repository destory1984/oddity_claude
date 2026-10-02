import { summarize, journalOrder } from '../core/progress.js';
import { surfaceDistance } from '../core/bodies.js';
import { objectParticle } from './messages.js';
import { FACTS } from '../core/facts.js';
import { photoCaption, ALBUM_MAX } from '../core/album.js';

const $ = (id) => document.getElementById(id);
// 로 after a vowel or ㄹ, 으로 after any other final consonant.
function hasFinalRieulOrNone(word) {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return [0, 8].includes((code - 0xac00) % 28);
}
const fmt = (n) => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });

// The explorer's journal: bodies found and landed on, photo missions done.
export function createJournal({ bodies, missions, stories = [], craft = [], onGo, onJump, onReset, onOpen, onClose, onDeletePhoto = () => {}, onDetail = null, notes = [], onNote = null }) {
  const dialog = $('journal');

  $('journalButton').addEventListener('click', () => open());
  $('closeJournal').addEventListener('click', () => dialog.close());
  // Ways out besides the ✕ and Esc: the J key that opened it, and a press outside it.
  dialog.addEventListener('keydown', (e) => {
    if (e.code === 'KeyJ' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) dialog.close();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  // One part of the journal shows at a time (the whole of it was fourteen screens long
  // on a phone). The part last looked at is the one it opens on.
  let tab = 'bodies';
  function showTab(name) {
    tab = name;
    for (const button of $('journalTabs').children) button.setAttribute('aria-selected', String(button.dataset.tab === name));
    for (const part of $('journalScroll').children) part.hidden = part.dataset.tab !== name;
    $('journalScroll').scrollTop = 0;
  }
  for (const button of $('journalTabs').children) button.addEventListener('click', () => showTab(button.dataset.tab));
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

    // Grandmother's notes read so far: press one to read it again.
    const read = notes.filter((n) => (progress.notes ?? []).includes(n.id));
    const noteRow = $('journalNotes');
    noteRow.hidden = !read.length || !onNote;
    noteRow.replaceChildren('할머니의 쪽지');
    for (const note of read) {
      const again = document.createElement('button');
      again.textContent = note.title;
      again.setAttribute('aria-label', `쪽지 ${note.title} 다시 읽기`);
      again.addEventListener('click', () => {
        dialog.close();
        onNote(note.id);
      });
      noteRow.append(again);
    }

    const list = $('journalBodies');
    list.replaceChildren();
    for (const { body, moon } of journalOrder(bodies)) {
      const found = progress.discovered.includes(body.id);
      const landed = progress.landed.includes(body.id);
      const li = document.createElement('li');
      const name = document.createElement('strong');
      // A moon sits under its planet, four spaces in.
      name.textContent = `${moon ? '    ' : ''}${found ? body.name : `${body.name} (미발견)`}`;
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
  // Grouped by where they are, each group under a heading with its count.
  function renderStories() {
    const box = $('journalStories');
    box.replaceChildren();
    const told = lastProgress.stories ?? [];
    const groups = [
      ['지구와 먼 곳', (s) => s.body !== 'moon' && s.body !== 'mars'],
      ['달', (s) => s.body === 'moon'],
      ['화성', (s) => s.body === 'mars'],
    ];
    for (const [label, belongs] of groups) {
      const members = stories.filter(belongs);
      if (!members.length) continue;
      const heading = document.createElement('h2');
      heading.textContent = `${label} ${members.filter((s) => told.includes(s.id)).length}/${members.length}`;
      const list = document.createElement('ul');
      box.append(heading, list);
      renderStoryList(list, members);
    }
  }

  function renderStoryList(list, members) {
    for (const story of members) {
      const done = (lastProgress.stories ?? []).includes(story.id);
      const li = document.createElement('li');
      li.className = done ? 'done' : '';
      const title = document.createElement('strong');
      title.textContent = `${done ? '✓' : '○'} ${story.name}${story.year ? ` (${story.year}년)` : ''}`;
      const line = document.createElement('span');
      line.textContent = done ? story.text : story.hint;
      li.append(title, line);
      // A place already visited opens its card again: the photograph and the longer telling.
      if (done && onDetail) {
        const more = document.createElement('button');
        more.textContent = '자세히';
        more.setAttribute('aria-label', `${story.name} 자세히`);
        more.addEventListener('click', () => {
          dialog.close();
          onDetail(story.id);
        });
        li.append(more);
      }
      // Only places on a surface have somewhere to appear.
      if (done && story.type === 'surface') li.append(jumpButton(story.id, story.name));
      list.append(li);
    }
  }

  // The album: small copies of saved photos, newest first. Pressing one makes it large.
  let album = [];
  function renderAlbum() {
    const grid = $('journalAlbum');
    grid.replaceChildren();
    $('albumNote').textContent = album.length
      ? `사진 모드에서 저장한 사진 ${album.length}장입니다(최근 ${ALBUM_MAX}장까지). 사진을 누르면 크게 보입니다.`
      : '사진 모드에서 "사진 저장"을 누르면 여기에 모입니다.';
    album.forEach((entry, index) => {
      const caption = photoCaption(entry, missions);
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = entry.image;
      img.alt = caption.title;
      img.addEventListener('click', () => figure.classList.toggle('big'));
      const text = document.createElement('figcaption');
      const title = document.createElement('strong');
      title.textContent = caption.title;
      text.append(title);
      for (const m of caption.met) {
        const line = document.createElement('span');
        line.textContent = `✓ ${m.name}: ${m.hint}`;
        text.append(line);
      }
      const remove = document.createElement('button');
      remove.textContent = '지우기';
      remove.setAttribute('aria-label', `${caption.title} 사진 지우기`);
      remove.addEventListener('click', () => {
        album = onDeletePhoto(index);
        renderAlbum();
      });
      figure.append(img, text, remove);
      grid.append(figure);
    });
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
    renderAlbum();
    dialog.showModal();
    showTab(tab);
  }

  return {
    open,
    isOpen: () => dialog.open,
    setAlbum(photos) {
      album = photos;
    },
    // Remembered for the next open; the open list is not rebuilt so focus stays put.
    update(progress, position, current = bodies) {
      lastProgress = progress;
      lastPosition = position;
      lastBodies = current;
    },
  };
}
