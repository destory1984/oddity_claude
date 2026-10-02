import { summarize, journalOrder } from '../core/progress.js';
import { surfaceDistance } from '../core/bodies.js';
import { objectParticle } from './messages.js';
import { FACTS } from '../core/facts.js';
import { photoCaption, ALBUM_MAX } from '../core/album.js';
import { starText, postageFile } from '../core/postcard.js';
import { TOURS, stopName, stampFile } from '../core/tours.js';

const $ = (id) => document.getElementById(id);
// 로 after a vowel or ㄹ, 으로 after any other final consonant.
function hasFinalRieulOrNone(word) {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return true;
  return [0, 8].includes((code - 0xac00) % 28);
}
const fmt = (n) => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
// A drawing from public/assets (the pictures drawn to order are in notebook/).
function picture(file, alt, className = '') {
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}assets/${file}`;
  img.alt = alt;
  if (className) img.className = className;
  return img;
}
// The last slot before it opens (core/story.js LAST_SLOT).
const CLIPPING = '1990.2.14. 보이저 1호가 60억km 밖에서 찍은 지구. 신문에서 오려 붙였다. 나머지 칸을 모두 채우면 열리는 마지막 칸.';

// The explorer's journal: bodies found and landed on, photo missions done.
export function createJournal({ bodies, missions, stories = [], craft = [], onGo, onJump, onReset, onOpen, onClose, onDeletePhoto = () => {}, onDetail = null, notes = [], onNote = null, memos = {}, lastSlot = null, lastShut = () => false, onSendPhoto = null, onTourStart = null, onTourQuit = null, daily = null }) {
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

  // Today's request (core/daily.js): daily() gives { text, done, days, streak } or null.
  $('dailyGo').addEventListener('click', () => {
    dialog.close();
    daily().go();
  });
  function renderDaily() {
    const today = daily ? daily() : null;
    $('journalDaily').hidden = !today;
    if (!today) return;
    $('dailyText').textContent = `${today.done ? '★' : '☆'} 오늘의 부탁: ${today.text}`;
    $('dailyCount').textContent = `해낸 날 ${today.days}일${today.streak > 1 ? ` · ${today.streak}일째 이어서` : ''}`;
    $('dailyGo').hidden = today.done;
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
      // Grandmother's memo is there from the start; Seora's line joins it once she has
      // been there. Without the story, the fact as before.
      const entry = memos[body.id];
      if (entry) {
        const memo = document.createElement('small');
        memo.className = 'memo';
        memo.textContent = entry.memo;
        li.append(memo);
      }
      if (found && (entry || FACTS[body.id])) {
        const fact = document.createElement('small');
        fact.className = entry ? 'fact said' : 'fact';
        fact.textContent = entry ? `서라: ${entry.line}` : FACTS[body.id];
        li.append(fact);
      }
      list.append(li);
    }

    const missionList = $('journalMissions');
    missionList.replaceChildren();
    for (const mission of missions) {
      const done = progress.photos.includes(mission.id);
      // The last slot, still shut: only grandmother's clipping shows.
      const shut = !done && mission.id === lastSlot && lastShut(progress);
      const li = document.createElement('li');
      li.className = done ? 'done' : shut ? 'clipping' : '';
      const title = document.createElement('strong');
      title.textContent = `${done ? '✓' : '○'} ${mission.name}`;
      const hint = document.createElement('span');
      hint.textContent = shut ? CLIPPING : mission.hint;
      li.append(title, ...(shut ? [picture('notebook/clipping.png', '신문에서 오려 붙인 사진: 빛줄기 속의 푸른 점 하나')] : []), hint);
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
      const last = !done && story.id === lastSlot;
      const shut = last && lastShut(lastProgress);
      li.className = done ? 'done' : shut ? 'clipping' : '';
      const title = document.createElement('strong');
      title.textContent = `${done ? '✓' : '○'} ${story.name}${story.year ? ` (${story.year}년)` : ''}`;
      const line = document.createElement('span');
      line.textContent = done ? story.text : shut ? CLIPPING : last ? `${story.hint}. 거기서 지구를 사진에 담기` : story.hint;
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
      ? `사진 모드에서 저장한 사진 ${album.length}장입니다(최근 ${ALBUM_MAX}장까지). 사진을 누르면 크게 보입니다. 할머니께 엽서로 보내면 다음 날 답장과 별이 옵니다.`
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
      let send = null;
      // A postcard to grandmother: sent once; her reply (and her stars) come the next day.
      if (entry.reply) {
        const reply = document.createElement('p');
        reply.className = 'reply';
        if (entry.rate) {
          // Three stars in her pencil: filled for those given.
          const stars = document.createElement('span');
          stars.className = 'stars';
          stars.setAttribute('role', 'img');
          stars.setAttribute('aria-label', `별 ${entry.rate.stars}개 (${starText(entry.rate.stars)})`);
          for (let i = 0; i < 3; i++) stars.append(picture(`notebook/star-${i < entry.rate.stars ? 'on' : 'off'}.png`, ''));
          reply.append(stars);
        }
        reply.append(entry.reply);
        text.append(reply);
      } else if (entry.sent) {
        const sent = document.createElement('span');
        sent.className = 'sent';
        sent.textContent = '엽서로 보냈다. 답장은 다음 날 게임을 열면 와 있다.';
        text.append(sent);
      } else if (onSendPhoto) {
        send = document.createElement('button');
        send.textContent = '할머니께 엽서로';
        send.setAttribute('aria-label', `${caption.title} 사진을 할머니께 엽서로 보내기`);
        send.addEventListener('click', () => {
          album = onSendPhoto(index);
          renderAlbum();
        });
      }
      const remove = document.createElement('button');
      remove.textContent = '지우기';
      remove.setAttribute('aria-label', `${caption.title} 사진 지우기`);
      remove.addEventListener('click', () => {
        album = onDeletePhoto(index);
        renderAlbum();
      });
      // A photo sent as a postcard carries a stamp and a postmark on its corner.
      const frame = document.createElement('div');
      frame.className = 'photoFrame';
      frame.append(img);
      if (entry.sent) frame.append(picture('notebook/postmark.png', '', 'postmark'), picture(postageFile(entry), '우표', 'postage'));
      figure.append(frame, text, ...(send ? [send] : []), remove);
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

  // The nine tours: gone round (a stamp), under way (how far), or yet to start.
  function renderTours() {
    const list = $('journalTours');
    list.replaceChildren();
    const done = lastProgress.tours ?? [];
    const going = lastProgress.tour;
    $('journalCrane').hidden = !TOURS.every((t) => done.includes(t.id));
    for (const tour of TOURS) {
      const isGoing = going?.id === tour.id;
      const isDone = done.includes(tour.id);
      const li = document.createElement('li');
      li.className = isGoing ? 'going' : isDone ? 'done' : '';
      const title = document.createElement('strong');
      title.textContent = `${isDone ? '✓' : '○'} ${tour.name}${isGoing ? ` · 가는 중 ${going.step}/${tour.stops.length}` : ''}`;
      if (isDone) li.append(picture(stampFile(tour), `${tour.name} 도장`, 'stamp'));
      const memo = document.createElement('span');
      memo.className = 'memo';
      memo.textContent = tour.memo;
      const stops = document.createElement('span');
      stops.className = 'stops';
      stops.textContent = tour.stops.map((stop, i) => `${isGoing && i < going.step ? '✓ ' : ''}${stopName(stop)}`).join(' → ');
      li.append(title, memo, stops);
      if (onTourStart) {
        const button = document.createElement('button');
        button.textContent = isGoing ? '그만두기' : isDone ? '이 길로 다시 떠나기' : '이 길로 떠나기';
        button.setAttribute('aria-label', `${tour.name} ${button.textContent}`);
        button.addEventListener('click', () => {
          dialog.close();
          if (isGoing) onTourQuit();
          else onTourStart(tour.id);
        });
        li.append(button);
      }
      list.append(li);
    }
  }

  function open() {
    if (dialog.open) return;
    onOpen();
    render();
    renderDaily();
    renderStories();
    renderCraft();
    renderTours();
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
