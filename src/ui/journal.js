import { famousFor, FAMOUS } from '../core/famous.js';
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
import { CURIOS, CURIO_ABOUT, nextChilseok } from '../core/curios.js';
import { CURIO_HINTS } from '../core/lines.js';
import { createRadioWeb } from './radioWeb.js';
import { radioHint, HIDDEN } from '../core/radioFriend.js';
import { whereOf } from '../core/daily.js';

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
export function createJournal({ bodies, missions, stories = [], craft = [], onGo, onJump, onReset, onOpen, onClose, onDeletePhoto = () => {}, onDetail = null, notes = [], onNote = null, memos = {}, lastSlot = null, lastShut = () => false, onSendPhoto = null, onPair = null, onTourStart = null, onTourQuit = null, daily = null, stunts = null, views = null, sky = null, exo = null, onRadioJump = () => {}, onTab = () => {}, errands = null }) {
  const dialog = $('journal');
  // The radio friend's page (ui/radioWeb.js): drawn again with each log, its points
  // pressed in the journal's own "무전" part, as every other part is read (it opened over
  // the whole screen from 2026-10-22, "따로 전체 화면", till the user, 2026-10-23: "수첩 ->
  // 무전 탭도 다른 탭과 동일하게").
  const radioChart = createRadioWeb($('radioChart'), $('radioDetail'), { onJump: onRadioJump });

  $('journalButton').addEventListener('click', () => open());
  $('closeJournal').addEventListener('click', () => dialog.close());
  // The same at its foot, as the settings have (the user, 2026-10-19: "비행 수첩도 아래에 비행으로
  // 돌아가기 버튼 추가").
  $('journalBack').addEventListener('click', () => dialog.close());
  // Ways out besides the ✕ and Esc: the J key that opened it, and a press outside it
  // (ui/backKeys.js, as for every sheet).
  dialog.addEventListener('keydown', (e) => {
    if (e.code === 'KeyJ' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) dialog.close();
  });

  // What was done last (the user, 2026-10-20: "탐험 수첩 펼치면.. 마지막으로 해낸 것
  // 열어줘"): a body found or landed on, a photo mission, a story place, a craft met, a
  // curio, a tour gone round: its part and its row. Kept in the browser, so that a new
  // day opens the journal there too. { tab, id, at, seen }: seen once the journal has
  // opened on it.
  const LAST_KEY = 'oddity.journal.last';
  const DONE_TABS = [['discovered', 'bodies'], ['landed', 'bodies'], ['photos', 'missions'], ['stories', 'stories'], ['craft', 'craft'], ['curios', 'curios'], ['tours', 'tours']];
  let lastDone = null;
  try {
    lastDone = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null');
  } catch {
    // Not kept here: the journal opens as it did.
  }
  function keepLastDone() {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(lastDone));
    } catch {
      // Not kept; it still holds for this sitting.
    }
  }
  function noteDone(before, after) {
    // (Called every frame: a log that has not changed is the same object.)
    if (!before || !after || before === after) return;
    // The log wiped: nothing was done last.
    if (after.discovered.length < before.discovered.length) {
      lastDone = null;
      keepLastDone();
      return;
    }
    for (const [key, part] of DONE_TABS) {
      const had = before[key] ?? [];
      const newly = (after[key] ?? []).filter((id) => !had.includes(id));
      if (newly.length) lastDone = { tab: part, id: newly.at(-1), at: Date.now(), seen: false };
    }
    if (lastDone && !lastDone.seen) keepLastDone();
  }

  // One part of the journal shows at a time (the whole of it was fourteen screens long
  // on a phone). It opens on the part of what was done last, when that is new since it
  // was last opened, and else on the part last looked at; first of all on "오늘", the
  // page of today's request, the radio story, the sky news, grandmother's notes and the
  // count (they stood above the tabs and left a quarter of the screen to the lists: the
  // user, 2026-10-23, "수첩이 좀 난잡해졌는데", then plan "1").
  // Six tabs, each holding one or more parts, chosen in a row of small keys under the
  // tabs: what is looked for, grouped (the user, 2026-10-23, "수첩의 메뉴 트리를 전체적으로
  // 좀 손 보자.. gpt하고 상의해봐", then "만들어"; nine tabs before). A tab opens on the part
  // of it last looked at.
  const GROUPS = {
    today: ['today'],
    places: ['bodies', 'craft', 'curios'],
    photos: ['missions', 'album', 'views'],
    stories: ['stories'],
    radio: ['radio'],
    flight: ['tours', 'stunts'],
  };
  const PART_NAMES = {
    bodies: t('천체'), craft: t('탐사선'), curios: t('상상'),
    missions: t('따라 찍기'), album: t('내 사진'), views: t('엽서'),
    tours: t('할머니의 길'), stunts: t('묘기 비행'),
  };
  const groupOf = (part) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(part)) ?? part;
  const lastPart = {};
  // (A kept part no longer in GROUPS opens "오늘".)
  let tab = Object.values(GROUPS).flat().includes(lastDone?.tab) ? lastDone.tab : 'today';
  // name: a part, or a tab (its part last looked at).
  function showTab(name) {
    const part = GROUPS[name] ? lastPart[name] ?? GROUPS[name][0] : name;
    const group = groupOf(part);
    tab = part;
    lastPart[group] = part;
    for (const button of $('journalTabs').children) button.setAttribute('aria-selected', String(button.dataset.tab === group));
    const seg = $('journalSeg');
    seg.hidden = GROUPS[group].length < 2;
    seg.replaceChildren(...(seg.hidden ? [] : GROUPS[group].map((p) => {
      const key = document.createElement('button');
      key.setAttribute('role', 'tab');
      key.dataset.part = p;
      key.textContent = PART_NAMES[p];
      key.setAttribute('aria-selected', String(p === part));
      key.addEventListener('click', () => {
        if (p !== tab) onTab();
        showTab(p);
      });
      return key;
    })));
    for (const section of $('journalScroll').children) section.hidden = section.dataset.tab !== part;
    $('journalScroll').scrollTop = 0;
  }
  // "기록" by the title: every count in one place, the notebook's 261 slots and what is
  // kept beside them, and the wipe (the user, 2026-10-23, the journal's new tree, step 2;
  // the count stood at the foot of "오늘" and the wipe at the foot of the bodies).
  function showRecord(on) {
    $('journalRecord').hidden = !on;
    $('recordKey').setAttribute('aria-expanded', String(on));
    if (on) renderRecord();
  }
  $('recordKey').addEventListener('click', () => {
    onTab();
    showRecord($('journalRecord').hidden);
  });
  function renderRecord() {
    const progress = lastProgress;
    if (!progress) return;
    const s = summarize(progress, bodies, missions, stories);
    const row = (name, got, of) => {
      const line = document.createElement('p');
      const what = document.createElement('span');
      what.textContent = name;
      const count = document.createElement('b');
      count.textContent = `${got} / ${of}`;
      line.append(what, count);
      return line;
    };
    const head = (words, small = '') => {
      const h = document.createElement('h3');
      h.textContent = words;
      if (small) {
        const note = document.createElement('small');
        note.textContent = small;
        h.append(' ', note);
      }
      return h;
    };
    const filled = s.discovered + s.landed + s.photos + s.stories;
    const slots = 2 * s.bodies + s.missions + s.storyTotal;
    const outside = [
      [t('무전 숨은 장소'), radioHint(progress.radio).found, radioHint(progress.radio).total],
      [t('탐사선'), craft.filter((c) => (progress.craft ?? []).includes(c.id)).length, craft.length],
      [t('상상 속 장소'), CURIOS.filter((c) => !c.group && (progress.curios ?? []).includes(c.id)).length, CURIOS.filter((c) => !c.group).length],
      [t('할머니의 길'), TOURS.filter((x) => (progress.tours ?? []).includes(x.id)).length, TOURS.length],
      ...(views ? [[t('엽서'), views.cards().filter((card) => card.got).length, views.cards().length]] : []),
      ...(errands ? [[t('마친 부탁'), errands().done, errands().total]] : []),
    ];
    $('recordRows').replaceChildren(
      head(t('수첩 채우기'), t`${filled} / ${slots}칸`),
      row(t('천체 발견'), s.discovered, s.bodies),
      row(t('천체 착지'), s.landed, s.bodies),
      row(t('따라 찍기'), s.photos, s.missions),
      row(t('이야기 장소'), s.stories, s.storyTotal),
      head(t('칸 밖의 기록')),
      ...outside.map(([name, got, of]) => row(name, got, of)),
    );
  }

  // A tab pressed turns a page (onTab: its sound), unless it is the one already open.
  for (const button of $('journalTabs').children) {
    button.addEventListener('click', () => {
      if (button.dataset.tab !== groupOf(tab)) onTab();
      showRecord(false);
      showTab(button.dataset.tab);
    });
  }
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
  // A jump to it (an errand only sends her where she has been), and the errands before
  // and after the one shown (the user, 2026-10-19: "미션을 완성했을 때에 다음 미션, 이전 미션").
  $('dailyJump').addEventListener('click', () => {
    dialog.close();
    daily().jump();
  });
  $('dailyNext').addEventListener('click', () => {
    daily().step(1);
    renderDaily();
  });
  $('dailyPrev').addEventListener('click', () => {
    daily().step(-1);
    renderDaily();
  });
  let doneOpen = false;
  $('dailyDone').addEventListener('click', () => {
    doneOpen = !doneOpen;
    renderDaily();
  });
  function renderDaily() {
    const today = daily ? daily() : null;
    $('journalDaily').hidden = !today;
    if (!today) return;
    // ("할머니의 부탁": it was "오늘의 부탁", but it is one list walked in turn, any number a
    // day: Codex (GPT) and the user, 2026-10-23.)
    const label = today.index ? t`할머니의 부탁 ${today.index + 1}` : t('할머니의 부탁');
    // One done has grandmother's red tick and "해냄" before it, in a paler ink (the user,
    // 2026-10-20: "해낸 부탁은 표시를 해줘. 헷갈리네": a ★ for the ☆ was all that told it;
    // 2026-10-22, of the red ring it had: "동그라미가 아니라 체크 표시").
    const text = $('dailyText');
    text.classList.toggle('done', today.done);
    if (today.done) text.replaceChildren(picture('notebook/mark-check.png', ''), t`${label} · 해냄: ${today.text}`);
    else text.textContent = `☆ ${label}: ${today.text}`;
    // The errands done, folded to their count; a press lists them, the latest first, with
    // the day each was done (the journal's new tree, step 3: the seven days' stars were
    // hard to read, the user, 2026-10-23: "별.. 저게 뭔지 나도 모르겠으니").
    const done = $('dailyDone');
    done.hidden = !today.doneList.length;
    done.textContent = `${t`마친 부탁 ${today.doneList.length}`} ${doneOpen ? '▴' : '▾'}`;
    done.setAttribute('aria-expanded', String(doneOpen));
    const list = $('dailyDoneList');
    list.hidden = !doneOpen || !today.doneList.length;
    list.replaceChildren(...(list.hidden ? [] : today.doneList.map(({ name, day }) => {
      const li = document.createElement('li');
      const when = document.createElement('small');
      when.textContent = day ? t`${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일` : '';
      li.append(when, name);
      return li;
    })));
    $('dailyGo').hidden = today.done;
    $('dailyJump').hidden = today.done || !today.canJump;
    // Free to walk the errands either way, done or not (the user, 2026-10-22: "왜 좌우로
    // 이동하는 화살표 없어짐?": it waited on the shown one being done).
    $('dailyNext').hidden = !today.hasNext;
    $('dailyPrev').hidden = !today.index;
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

  // The radio story's line under the sky news (the user, 2026-10-22: "무전 탭을 좀 더
  // 비중 있게 다뤄주는게 맞지않음?"): the hidden places found, what comes next, and a
  // press opens its page; the tab keeps a red mark till the story is told.
  function renderRadio() {
    if (!lastProgress) return;
    const { found, total, next } = radioHint(lastProgress.radio);
    const fold = document.createElement('button');
    fold.id = 'radioFold';
    const head = document.createElement('b');
    head.textContent = t`무전 ${found}/${total}`;
    const line = document.createElement('span');
    if (next?.kind === 'hidden') line.textContent = t`가 볼 곳: ${HIDDEN.find((h) => h.id === next.id).name}`;
    else if (next?.kind === 'speaker') line.textContent = t`다음 무전: ${whereOf(next.at)}`;
    else if (next?.kind === 'note') line.textContent = t('할머니의 쪽지를 기다리는 중');
    else if (next?.kind === 'done') line.textContent = t('오십 년 만에 이어졌다');
    fold.append(head, line, t('펼치기'));
    fold.addEventListener('click', () => {
      onTab();
      showTab('radio');
    });
    $('journalRadio').replaceChildren(fold);
    $('journalRadio').hidden = false;
    document.querySelector('#journalTabs button[data-tab="radio"]').classList.toggle('live', next?.kind !== 'done');
  }

  let notesOpen = false;
  let lastProgress = null;
  let lastPosition = null;
  let lastBodies = bodies;

  function render() {
    const progress = lastProgress;
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
      li.dataset.id = body.id;
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
      li.dataset.id = mission.id;
      li.className = done ? 'done' : '';
      const title = document.createElement('strong');
      title.textContent = `${done ? '✓' : '○'} ${mission.name}`;
      const hint = document.createElement('span');
      hint.textContent = mission.hint;
      // The old photograph it is taken after, when it is one (core/famous.js).
      if (FAMOUS[mission.id]) {
        const art = picture(FAMOUS[mission.id].file, '', 'missionArt');
        art.loading = 'lazy';
        li.append(art);
      }
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
      li.dataset.id = story.id;
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
      : t('사진 모드에서 "사진 찍기"를 누르면 여기에 모입니다.');
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
      li.dataset.id = c.id;
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

  // The imaginary places (core/curios.js; the user, 2026-10-16: "오늘 만든 상상 속의 장소들도
  // 나중에 쉽게 갈 수 있도록, 탐험 수첩에 넣어줘"): not scored, as the craft. One not
  // found yet shows the word she has heard of it, where to look. (The ship by Jupiter's
  // slab is in the slab's row.)
  const CURIO_MARKS = { monolith: '▮', teapot: '🫖', rose: '🌹', moonSlab: '▯', moonRabbit: '🐇', magpieBridge: '🌉', whale: '🐋', ringStation: '🛰', potatoFarm: '🥔', goldenRecord: '💿', robot: '🤖' };
  function renderCurios() {
    const list = $('journalCurios');
    list.replaceChildren();
    for (const c of CURIOS.filter((x) => !x.group)) {
      const found = (lastProgress.curios ?? []).includes(c.id);
      const li = document.createElement('li');
      li.dataset.id = c.id;
      li.className = found ? 'done' : '';
      const art = document.createElement('span');
      art.className = 'craftArt curioArt';
      art.textContent = CURIO_MARKS[c.id] ?? '?';
      art.setAttribute('aria-hidden', 'true');
      const title = document.createElement('strong');
      title.textContent = `${found ? '✓' : '○'} ${c.name}`;
      const line = document.createElement('span');
      // (Its notice's first line alone: "소설과 영화에서 온 것." before it was "굳이?".)
      line.textContent = found ? CURIO_ABOUT[c.id].text.split('\n')[0] : t`아직 찾지 못했습니다. ${CURIO_HINTS[c.id]?.line ?? ''}`;
      // The bridge is not gone to: it is up in the sky on Chilseok alone.
      if (c.sky) {
        const next = nextChilseok();
        line.textContent += ` ${next ? t`칠석날에만 놓입니다. 다음 칠석은 ${next}입니다.` : t('칠석날에만 놓입니다.')}`;
      }
      li.append(art, title, line);
      if (found && !c.sky) li.append(jumpButton(c.id, c.name));
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
      li.dataset.id = tour.id;
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
    // All of them got: a slip with their stamp, as the paper crane's over the tours.
    $('journalViewsAll').hidden = !cards.every((card) => card.got);
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
    renderRadio();
    renderStories();
    renderCraft();
    renderCurios();
    renderTours();
    renderStunts();
    renderViews();
    renderAlbum();
    showRecord(false);
    dialog.showModal();
    if (lastDone && !lastDone.seen && DONE_TABS.some(([, part]) => part === lastDone.tab)) {
      showTab(lastDone.tab);
      lastDone.seen = true;
      keepLastDone();
      // Its row in the middle of the part, lit for a moment.
      const row = $('journalScroll').querySelector(`section[data-tab="${lastDone.tab}"] li[data-id="${CSS.escape(lastDone.id)}"]`);
      if (row) {
        row.scrollIntoView({ block: 'center' });
        row.classList.remove('lastDone');
        void row.offsetWidth;
        row.classList.add('lastDone');
      }
    } else showTab(tab);
  }

  return {
    open,
    isOpen: () => dialog.open,
    setAlbum(photos) {
      album = photos;
    },
    // Remembered for the next open; the open list is not rebuilt so focus stays put.
    update(progress, position, current = bodies) {
      noteDone(lastProgress, progress);
      if (progress.radio !== lastProgress?.radio) {
        radioChart.draw(progress.radio);
      }
      if (dialog.open && progress.radio !== lastProgress?.radio) {
        lastProgress = progress;
        renderRadio();
      }
      lastProgress = progress;
      lastPosition = position;
      lastBodies = current;
    },
  };
}
