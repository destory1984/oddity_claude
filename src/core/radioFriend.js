import { t } from './i18n.js';

// The radio friend (docs/superpowers/specs/2026-10-22-radio-friend-design.md): what Sora
// hears from people at the stations and on the ground, and reads in the logs of three
// craft, is written in the journal as clues; the clues open five hidden places; at the
// last she gets his call sign, and grandmother's note follows (the user, 2026-10-22, of
// three ways for people met in space: "C로 가보자", the story chosen part by part). It
// is a side story: the journal's 261 slots do not count it. Every rule is here, as the
// orbit lock's are in core/orbitLock.js; main.js only asks.
//
// SPEAKERS: kind 'person' (a face and a few lines) or 'log' (a craft's log, short lines,
// no talk); at: the craft she docks with or the story place she stays at. Each meeting
// comes in turn, once its `needs` are known, and `gives` its clues.
export const SPEAKERS = [
  {
    // (Made up, as everyone met here is: no real astronaut is a speaker.)
    id: 'issCrew', kind: 'person', at: { craft: 'iss' }, name: t('국제우주정거장 당번, 마야 린드'), portrait: null,
    visits: [
      {
        needs: [],
        lines: [
          t('안녕, 꼬마 손님. 이번 달 정거장 당번 마야야. 여기까지 날아오다니 대단한걸.'),
          t('일본 실험실 "기보"의 서랍에 낡은 무전 일지가 한 권 있어. 몇 해 전 여기 올라왔던 일본 기술자가 두고 간 거래.'),
          t('끝장에 호출 부호가 하나 적혀 있는데, 물이 번져서 앞의 두 글자 "JA"만 읽혀. 일본 무전가의 부호는 그렇게 시작하거든.'),
        ],
        gives: ['kiboLog'],
      },
    ],
  },
];

// A clue: one line in the journal. from: who told it; points: the hidden place or the
// speaker it leads to; at: its place in the journal's web (0 → 1 across and down).
export const CLUES = [
  { id: 'kiboLog', text: t('기보 실험실의 낡은 무전 일지: 일본 기술자가 두고 갔다. 호출 부호는 앞의 "JA"만 읽힌다.'), from: 'issCrew', points: 'issCrew', at: [0.5, 0.2] },
];

// The hidden places, as story places are (core/stories.js): 'surface' on a body's ground,
// 'near' a body or a craft. needs: the clues that open one.
export const HIDDEN = [];

export function createRadio() {
  return { visits: {}, clues: [], found: [], callSign: false, noteAt: null, noteRead: false };
}

const speakerById = (id) => SPEAKERS.find((s) => s.id === id);

// The meeting to be heard now from this speaker, or null (all heard, or the next waits
// for clues not yet known).
export function nextVisit(radio, speakerId) {
  const speaker = speakerById(speakerId);
  if (!speaker) return null;
  const index = radio.visits[speakerId] ?? 0;
  const visit = speaker.visits[index];
  if (!visit || !visit.needs.every((id) => radio.clues.includes(id))) return null;
  return { index, lines: visit.lines, gives: visit.gives };
}

// The log after hearing that meeting; the same log when there is none to hear.
export function hear(radio, speakerId) {
  const visit = nextVisit(radio, speakerId);
  if (!visit) return radio;
  return {
    ...radio,
    visits: { ...radio.visits, [speakerId]: visit.index + 1 },
    clues: [...radio.clues, ...visit.gives.filter((id) => !radio.clues.includes(id))],
  };
}

// The hidden places open now: those whose clues are all known.
export function openHidden(radio) {
  return HIDDEN.filter((h) => h.needs.every((id) => radio.clues.includes(id))).map((h) => h.id);
}

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));

// The open hidden places she is at now. position, restingOn: hers; bodies, craft: this
// frame's; sites: the places on the ground, as main.js keeps them (with the open hidden
// ones among them).
export function foundHidden({ radio, position, restingOn, bodies, craft = [], sites = [] }) {
  const open = new Set(openHidden(radio));
  return HIDDEN.filter((h) => open.has(h.id) && !radio.found.includes(h.id)).filter((h) => {
    if (h.type === 'surface') {
      const site = sites.find((s) => s.id === h.id);
      return restingOn === h.body && Boolean(site) && gap(position, site.position) <= h.withinKm;
    }
    const target = bodies.find((b) => b.id === h.target) ?? craft.find((c) => c.id === h.target);
    return Boolean(target) && gap(position, target.position) - (target.radiusKm ?? 0) <= h.withinKm;
  }).map((h) => h.id);
}

export function recordFound(radio, ids) {
  const newly = ids.filter((id) => !radio.found.includes(id));
  return newly.length ? { ...radio, found: [...radio.found, ...newly] } : radio;
}

// A log read back from storage: unknown ids dropped, each speaker's count held to the
// meetings there are, the rest of the wrong kind put back as new.
export function sanitizeRadio(raw) {
  const fresh = createRadio();
  if (!raw || typeof raw !== 'object') return fresh;
  const known = (list, ids) => (Array.isArray(list) ? [...new Set(list.filter((id) => ids.has(id)))] : []);
  const visits = {};
  if (raw.visits && typeof raw.visits === 'object') {
    for (const speaker of SPEAKERS) {
      const n = raw.visits[speaker.id];
      if (Number.isInteger(n) && n > 0) visits[speaker.id] = Math.min(n, speaker.visits.length);
    }
  }
  return {
    visits,
    clues: known(raw.clues, new Set(CLUES.map((c) => c.id))),
    found: known(raw.found, new Set(HIDDEN.map((h) => h.id))),
    callSign: raw.callSign === true,
    noteAt: Number.isFinite(raw.noteAt) ? raw.noteAt : null,
    noteRead: raw.noteRead === true,
  };
}

// Who is to be met where she is: the craft she is docked with, else the story place she
// stays at.
export function speakerAt({ docked = null, visit = null } = {}) {
  const craftId = docked?.id;
  const placeId = visit?.id;
  const speaker = SPEAKERS.find((s) => (craftId && s.at.craft === craftId) || (placeId && s.at.site === placeId));
  return speaker ? speaker.id : null;
}

// A meeting as the note card (ui/noteCard.js) shows it: the speaker's name and face on
// the first page (the card's title is not shown on screen, so the name is in its words), then a line a page, told plainly above the paper (`scene`): there is
// no paper, which is grandmother's hand. radio: who it was, for main.js when it closes.
// (No id: it is not one of grandmother's notes, kept as read and read over.)
export function talkNote(speakerId, visit) {
  const speaker = speakerById(speakerId);
  return {
    radio: speakerId,
    title: speaker.name,
    button: t('무전을 끈다'),
    pages: [
      { image: speaker.portrait, scene: speaker.kind === 'log' ? t`${speaker.name}의 기록장이 열린다.` : t`${speaker.name}의 무전이 닿았다.` },
      ...visit.lines.map((line) => ({ scene: line })),
    ],
  };
}
