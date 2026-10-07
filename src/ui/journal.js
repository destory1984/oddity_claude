import { famousFor } from '../core/famous.js';
import { lastSlotLast } from '../core/story.js';
import { summarize, journalOrder } from '../core/progress.js';
import { surfaceDistance, bodyPicture } from '../core/bodies.js';
import { objectParticle } from './messages.js';
import { FACTS } from '../core/facts.js';
import { photoCaption, ALBUM_MAX } from '../core/album.js';
import { starText, postageFile, cardWords } from '../core/postcard.js';
import { postcardBlob, saveBlob } from './postcardImage.js';
import { readingKey } from '../core/readingQuiz.js';
import { EXO_PLANETS, exoJournal } from '../core/exo.js';
import { TOURS, stopName, stampFile, sceneFile } from '../core/tours.js';
import { stuntStampFile } from '../core/stunts.js';
import { t } from '../core/i18n.js';
import { craftPicture } from '../core/craft.js';

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
const CLIPPING = t('1990.2.14. 보이저 1호가 60억km 밖에서 찍은 지구. 신문에서 오려 붙였다. 나머지 칸을 모두 채우면 열리는 마지막 칸.');

// The explorer's journal: bodies found and landed on, photo missions done.
export function createJournal({ bodies, missions, stories = [], craft = [], onGo, onJump, onReset, onOpen, onClose, onDeletePhoto = () => {}, onDetail = null, notes = [], onNote = null, memos = {}, lastSlot = null, lastShut = () => false, onSendPhoto = null, onPair = null, onTourStart = null, onTourQuit = null, daily = null, stunts = null, views = null, sky = null, exo = null }) {
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
    if (window.confirm(t('탐험 기록을 모두 지울까요? 되돌릴 수 없습니다. 지금 가까이 있는 천체는 곧바로 다시 기록됩니다.'))) onReset();
  });
  dialog.addEventListener('close', () => onClose());

  // A button that closes the journal and jumps to somewhere already visited.
  // toward: see onJump in main.js (sky news).
  function jumpButton(id, name, toward = null) {
    const jump = document.createElement('button');
    jump.textContent = t('순간 이동');
    jump.setAttribute('aria-label', t`${name}${hasFinalRieulOrNone(name) ? '로' : '으로'} 순간 이동`);
    jump.addEventListener('click', () => {
      dialog.close();
      onJump(id, toward);
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
    $('dailyText').textContent = t`${today.done ? '★' : '☆'} 오늘의 부탁: ${today.text}`;
    // The last seven days, today last.
    $('dailyWeek').setAttribute('aria-label', t`지난 7일 가운데 ${today.week.filter(Boolean).length}일 해냄`);
    $('dailyWeek').replaceChildren(...today.week.map((did) => (did ? picture('notebook/day-star.png', '') : document.createElement('i'))));
    $('dailyCount').textContent = t`해낸 날 ${today.days}일${today.streak > 1 ? t` · ${today.streak}일째 이어서` : ''}`;
    $('dailyGo').hidden = today.done;
  }

  // Sky news (core/forecast.js): sky() gives [{ text, planet: { id, name }, toward }]. A planet
  // already found can be jumped to.
  // The sky news is folded to one line (the user, 2026-10-05: its three or four lines
  // left too little of the page for the lists under it): "하늘 소식 3" and the first
  // line, cut short; a press unfolds them all. Opening the journal folds it again.
  let skyOpen = false;
  function renderSky() {
    const news = sky ? sky() : [];
    $('journalSky').hidden = news.length === 0;
    const fold = document.createElement('button');
    fold.id = 'skyFold';
    fold.setAttribute('aria-expanded', String(skyOpen));
    const head = document.createElement('b');
    head.textContent = t`하늘 소식 ${news.length}`;
    const first = document.createElement('span');
    first.textContent = skyOpen ? '' : news[0]?.text ?? '';
    fold.append(head, first, skyOpen ? t('접기') : t('펼치기'));
    fold.addEventListener('click', () => {
      skyOpen = !skyOpen;
      renderSky();
      $('skyFold').focus();
    });
    $('journalSky').replaceChildren(fold, ...(skyOpen ? news : []).map(({ text, planet, toward }) => {
      const line = document.createElement('p');
      const words = document.createElement('span');
      words.append(text);
      line.append(words);
      // (A line with no planet, the next real eclipse, is only told.)
      if (planet && lastProgress.discovered.includes(planet.id)) line.append(jumpButton(planet.id, planet.name, toward));
      return line;
    }));
  }

  let notesOpen = false;
  let lastProgress = null;
  let lastPosition = null;
  let lastBodies = bodies;

  function render() {
    const progress = lastProgress;
    const s = summarize(progress, bodies, missions, stories);
    $('journalSummary').textContent =
      t`발견 ${s.discovered}/${s.bodies} · 착지 ${s.landed}/${s.bodies} · 사진 ${s.photos}/${s.missions} · 이야기 ${s.stories}/${s.storyTotal}`;

    // Grandmother's notes read so far: press one to read it again.
    const read = notes.filter((n) => (progress.notes ?? []).includes(n.id));
    const noteRow = $('journalNotes');
    noteRow.hidden = !read.length || !onNote;
    // Folded to one line until pressed (the user, 2026-10-06, over a picture of five of
    // them in three rows: "단추가 너무 많아져서 화면을 많이 차지하고 있음. 단추를 줄여").
    const fold = document.createElement('button');
    fold.id = 'noteFold';
    fold.setAttribute('aria-expanded', String(notesOpen));
    const head = document.createElement('b');
    head.textContent = `${t('할머니의 쪽지')} ${read.length}`;
    fold.append(head, document.createElement('span'), notesOpen ? t('접기') : t('펼치기'));
    fold.addEventListener('click', () => {
      notesOpen = !notesOpen;
      render();
      $('noteFold').focus();
    });
    noteRow.replaceChildren(fold);
    for (const note of notesOpen ? read : []) {
      const again = document.createElement('button');
      again.textContent = note.title;
      again.setAttribute('aria-label', t`쪽지 ${note.title} 다시 읽기`);
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
      // Its small drawing before its name; one not yet found is a dark shape, and a moon
      // sits under its planet, a little way in (style.css).
      const art = picture(bodyPicture(body.id), '', 'bodyArt');
      art.loading = 'lazy';
      art.width = 128;
      art.height = 128;
      name.append(art, found ? body.name : t`${body.name} (미발견)`);
      li.className = `${found ? 'found' : ''}${moon ? ' moon' : ''}`.trim();
      const marks = document.createElement('span');
      marks.className = 'marks';
      // The question under its reading, answered right (core/readingQuiz.js).
      const solved = found && (progress.quiz ?? []).includes(readingKey(body.id));
      marks.textContent = `${found ? t('발견 ✓') : t('발견 —')}  ${landed ? t('착지 ✓') : t('착지 —')}${solved ? t('  문제 ✓') : ''}`;
      const distance = document.createElement('span');
      distance.className = 'distance';
      const now = lastBodies.find((b) => b.id === body.id) ?? body;
      distance.textContent = `${fmt(surfaceDistance(lastPosition, now))} km`;
      const go = document.createElement('button');
      go.textContent = t('목적지로');
      go.setAttribute('aria-label', t`${body.name}${objectParticle(body.name)} 목적지로`);
      go.addEventListener('click', () => {
        dialog.close();
        onGo(body.id);
      });
      li.append(name, marks, distance, go);
      if (found) li.append(jumpButton(body.id, body.name));
      // Grandmother's memo is there from the start; Sora's line joins it once she has
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
        fact.textContent = entry ? t`소라: ${entry.line}` : FACTS[body.id];
        li.append(fact);
      }
      list.append(li);
    }

    // Another star (core/exo.js): its lines join the list once she has been there, the
    // star and then the planets she has come close to, each with its drawing and a word.
    const away = exoJournal(exo?.());
    if (away.length) {
      const head = document.createElement('li');
      head.className = 'found awayHead';
      const title = document.createElement('strong');
      title.textContent = t('다른 별');
      const count = document.createElement('span');
      count.className = 'marks';
      count.textContent = t`가까이에서 본 행성 ${away.length - 1}/${EXO_PLANETS.length}`;
      head.append(title, count);
      list.append(head);
    }
    for (const row of away) {
      const li = document.createElement('li');
      li.className = row.star ? 'found' : 'found moon';
      const name = document.createElement('strong');
      const art = picture(bodyPicture(row.id), '', 'bodyArt');
      art.loading = 'lazy';
      art.width = 128;
      art.height = 128;
      name.append(art, row.name);
      const marks = document.createElement('span');
      marks.className = 'marks';
      marks.textContent = row.star ? t('가 봄 ✓') : t('가까이에서 봄 ✓');
      const fact = document.createElement('small');
      fact.className = 'fact';
      fact.textContent = row.note;
      li.append(name, marks, fact);
      list.append(li);
    }

    const missionList = $('journalMissions');
    missionList.replaceChildren();
    for (const mission of lastSlotLast(missions, lastSlot)) {
      const done = progress.photos.includes(mission.id);
      // The last slot is not listed at all until every other slot is filled (the user,
      // 2026-10-05: "모든 임무를 다 끝내야 보여주는거 아니냐고"; grandmother's clipping
      // stood in its place before). The count above still tells of twenty.
      const shut = !done && mission.id === lastSlot && lastShut(progress);
      if (shut) continue;
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
    // The last slot stands by itself at the end, under its own heading, and only once
    // every other slot is filled: until then it is not listed.
    const lastHidden = !told.includes(lastSlot) && lastShut(lastProgress);
    const groups = [
      [t('지구와 먼 곳'), (s) => s.body !== 'moon' && s.body !== 'mars' && s.id !== lastSlot],
      [t('달'), (s) => s.body === 'moon'],
      [t('화성'), (s) => s.body === 'mars'],
      [t('마지막 칸'), (s) => s.id === lastSlot && !lastHidden],
    ];
    for (const [label, belongs] of groups) {
      const members = stories.filter(belongs);
      if (!members.length) continue;
      const heading = document.createElement('h2');
      const solvedCount = members.filter((s) => (lastProgress.quiz ?? []).includes(s.id)).length;
      heading.textContent = `${label} ${members.filter((s) => told.includes(s.id)).length}/${members.length}${solvedCount ? t` · 맞힌 문제 ${solvedCount}` : ''}`;
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
      const solved = done && (lastProgress.quiz ?? []).includes(story.id);
      li.className = solved ? 'done solved' : done ? 'done' : shut ? 'clipping' : '';
      const title = document.createElement('strong');
      title.textContent = `${done ? '✓' : '○'} ${story.name}${story.year ? t` (${story.year}년)` : ''}`;
      // Its question answered right: grandmother's red ring before the name.
      if (solved) title.prepend(picture('notebook/mark-right.png', t('문제를 맞힘')));
      const line = document.createElement('span');
      line.textContent = done ? story.text : shut ? CLIPPING : last ? t`${story.hint}. 거기서 지구를 사진에 담기` : story.hint;
      li.append(title, line);
      // A place already visited opens its card again: the photograph and the longer telling.
      if (done && onDetail) {
        const more = document.createElement('button');
        more.textContent = t('자세히');
        more.setAttribute('aria-label', t`${story.name} 자세히`);
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
    // Looking back turns through the photos (ui/lookBack.js): it needs two at least.
    $('lookBackButton').hidden = album.length < 2;
    $('albumNote').textContent = album.length
      ? t`사진 모드에서 저장한 사진 ${album.length}장입니다(최근 ${ALBUM_MAX}장까지). 사진을 누르면 크게 보입니다. 할머니께 엽서로 보내면 다음 날 답장과 별이 옵니다.`
      : t('사진 모드에서 "사진 저장"을 누르면 여기에 모입니다.');
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
          stars.setAttribute('aria-label', t`별 ${entry.rate.stars}개 (${starText(entry.rate.stars)})`);
          for (let i = 0; i < 3; i++) stars.append(picture(`notebook/star-${i < entry.rate.stars ? 'on' : 'off'}.png`, ''));
          reply.append(stars);
        }
        reply.append(entry.reply);
        text.append(reply);
      } else if (entry.sent) {
        const sent = document.createElement('span');
        sent.className = 'sent';
        sent.textContent = t('엽서로 보냈다. 답장은 다음 날 게임을 열면 와 있다.');
        text.append(sent);
      } else if (onSendPhoto) {
        send = document.createElement('button');
        send.textContent = t('할머니께 엽서로');
        send.setAttribute('aria-label', t`${caption.title} 사진을 할머니께 엽서로 보내기`);
        send.addEventListener('click', () => {
          album = onSendPhoto(index);
          renderAlbum();
        });
      }
      // The photo as a postcard picture with where and when on it: a file to keep or send on.
      const card = document.createElement('button');
      card.textContent = t('엽서 그림 저장');
      card.setAttribute('aria-label', t`${caption.title} 사진을 엽서 그림으로 저장`);
      card.addEventListener('click', async () => {
        card.disabled = true;
        try {
          const blob = await postcardBlob(entry, cardWords(entry, missions), `${import.meta.env.BASE_URL}assets/${postageFile(entry)}`);
          saveBlob(blob, `oddity-postcard-${caption.title.slice(0, 10)}.png`);
          card.textContent = t('저장했습니다');
        } catch {
          card.textContent = t('저장하지 못했습니다');
        }
        setTimeout(() => {
          card.textContent = t('엽서 그림 저장');
          card.disabled = false;
        }, 2000);
      });
      // A mission after a famous photograph: the real one beside this one (ui/pair.js).
      const famous = onPair && famousFor(entry.missions);
      let pair = null;
      if (famous) {
        pair = document.createElement('button');
        pair.textContent = t('실제 사진과 나란히');
        pair.setAttribute('aria-label', t`${caption.title} 사진을 ${famous.name}의 실제 사진과 나란히 보기`);
        pair.addEventListener('click', () => onPair(entry, famous));
      }
      const remove = document.createElement('button');
      remove.textContent = t('지우기');
      remove.setAttribute('aria-label', t`${caption.title} 사진 지우기`);
      remove.addEventListener('click', () => {
        album = onDeletePhoto(index);
        renderAlbum();
      });
      // A photo sent as a postcard carries a stamp and a postmark on its corner.
      const frame = document.createElement('div');
      frame.className = 'photoFrame';
      frame.append(img);
      if (entry.sent) frame.append(picture('notebook/postmark.png', '', 'postmark'), picture(postageFile(entry), t('우표'), 'postage'));
      figure.append(frame, text, ...(pair ? [pair] : []), ...(send ? [send] : []), card, remove);
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
      const solved = met && (lastProgress.quiz ?? []).includes(readingKey(c.id));
      title.textContent = t`${met ? '✓' : '○'} ${c.name} (${c.launched}년)${solved ? t(' · 문제 ✓') : ''}`;
      const line = document.createElement('span');
      line.textContent = met ? c.intro : t('아직 만나지 못했습니다.');
      // Its small drawing; one not yet met is a dark shape (style.css).
      const art = picture(craftPicture(c.id), '', 'craftArt');
      art.loading = 'lazy';
      art.width = 128;
      art.height = 128;
      li.append(art, title, line);
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
      title.textContent = `${isDone ? '✓' : '○'} ${tour.name}${isGoing ? t` · 가는 중 ${going.step}/${tour.stops.length}` : ''}`;
      // A picture of the road, pasted in like a photograph (it says nothing the words do not).
      const scene = picture(sceneFile(tour), '', 'scene');
      scene.loading = 'lazy';
      scene.width = 384;
      scene.height = 216;
      li.append(scene);
      if (isDone) li.append(picture(stampFile(tour), t`${tour.name} 도장`, 'stamp'));
      const memo = document.createElement('span');
      memo.className = 'memo';
      memo.textContent = tour.memo;
      const stops = document.createElement('span');
      stops.className = 'stops';
      stops.textContent = tour.stops.map((stop, i) => `${isGoing && i < going.step ? '✓ ' : ''}${stopName(stop)}`).join(' → ');
      li.append(title, memo, stops);
      if (onTourStart) {
        const button = document.createElement('button');
        button.textContent = isGoing ? t('그만두기') : isDone ? t('이 길로 다시 떠나기') : t('이 길로 떠나기');
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

  // Stunt flights (core/stunts.js): what each asks, the best so far, and a button.
  // stunts: { all(): [{ id, name, todo, record, on, done }], start(id), quit() }.
  function renderStunts() {
    const list = $('journalStunts');
    list.replaceChildren();
    if (!stunts) return;
    for (const stunt of stunts.all()) {
      const li = document.createElement('li');
      li.className = stunt.on ? 'going' : '';
      const title = document.createElement('strong');
      title.textContent = `${stunt.name}${stunt.on ? t(' · 하는 중') : ''}`;
      const todo = document.createElement('span');
      todo.className = 'stops';
      todo.textContent = `${stunt.todo}.`;
      const record = document.createElement('span');
      // Not grandmother's hand: the record is the game's word.
      record.className = 'record';
      record.textContent = stunt.record;
      const button = document.createElement('button');
      button.textContent = stunt.on ? t('그만두기') : t('해 보기');
      button.setAttribute('aria-label', `${stunt.name} ${button.textContent}`);
      button.addEventListener('click', () => {
        dialog.close();
        if (stunt.on) stunts.quit();
        else stunts.start(stunt.id);
      });
      li.append(title, todo, record, button);
      // Done once, it carries its stamp, as a tour gone round does.
      if (stunt.done) li.append(picture(stuntStampFile(stunt.id), t`${stunt.name} 도장`, 'stamp'));
      list.append(li);
    }
  }

  // Picture postcards and the round of the auroras (core/viewCards.js).
  // views: { cards(): [{ id, name, file, got }], round(): { stood, of, done, stamp, names } }.
  function renderViews() {
    const list = $('journalViews');
    const line = $('journalRound');
    list.replaceChildren();
    line.replaceChildren();
    if (!views) return;
    const round = views.round();
    const words = document.createElement('span');
    words.textContent = t`오로라 순례 ${round.stood}/${round.of}: ${round.names.map((n) => `${n.stood ? '✓' : '○'} ${n.name}`).join('  ')}`;
    line.append(words);
    if (round.done) line.append(picture(round.stamp, t('오로라 순례 도장'), 'stamp'));
    line.classList.toggle('done', round.done);
    const cards = views.cards();
    $('journalViewsCount').textContent = `${cards.filter((card) => card.got).length}/${cards.length}`;
    for (const card of cards) {
      const li = document.createElement('li');
      li.className = card.got ? 'got' : '';
      const name = document.createElement('span');
      name.textContent = card.name;
      if (card.got) li.append(picture(card.file, card.name), name);
      else {
        const blank = document.createElement('i');
        blank.textContent = '?';
        blank.setAttribute('aria-label', t('아직 얻지 못한 엽서'));
        li.append(blank, name);
      }
      list.append(li);
    }
  }

  function open() {
    if (dialog.open) return;
    onOpen();
    render();
    renderDaily();
    skyOpen = false;
    renderSky();
    renderStories();
    renderCraft();
    renderTours();
    renderStunts();
    renderViews();
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
