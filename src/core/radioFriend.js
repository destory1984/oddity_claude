import { t } from './i18n.js';
import { surfaceDirection, spinOf } from './surface.js';

// The radio friend (docs/superpowers/specs/2026-10-22-radio-friend-design.md): what Sora
// hears from people at the stations and on the ground, and reads in the logs of three
// craft, is written in the journal as clues; the clues open five hidden places; at the
// last she gets his call sign, and grandmother's note follows (the user, 2026-10-22, of
// three ways for people met in space: "C로 가보자", the story chosen part by part). It
// is a side story: the journal's 261 slots do not count it. Every rule is here, as the
// orbit lock's are in core/orbitLock.js; main.js only asks.
//
// SPEAKERS: kind 'person' (a face and a few lines) or 'log' (a craft's log, short lines,
// no talk); at: the craft she docks with or the story place she stays at; hail: the
// first page, the speaker's call or the log's heading. Each meeting comes in turn, once
// its `needs` are known, and `gives` its clues.
// Facts used here, checked 2026-10-22: Hayabusa2 launched 2014-12-03; each target marker
// held about 180,000 names (JAXA's campaign of 2013) and its capsule a chip with about
// 250,000; a marker was dropped on Ryugu on 2018-10-25; the capsule came down near Woomera,
// South Australia (about 31°S 136°E) on 2020-12-06 local time. Akatsuki launched 2010-05-21
// with aluminium plates of more than 260,000 names and messages printed small, missed
// Venus in December 2010 and went into its orbit on 2015-12-07. BepiColombo launched
// 2018-10-20 with Japan's Mercury orbiter "Mio". Kibo is Japan's lab on the ISS. Japan's
// radio amateurs' call signs begin with JA, Korea's with HL. Hayashi Shota and everyone
// met here are made up.
export const SPEAKERS = [
  {
    // (Made up, as everyone met here is: no real astronaut is a speaker.)
    id: 'issCrew', kind: 'person', at: { craft: 'iss' }, name: t('국제우주정거장 당번, 마야 린드'), portrait: 'radio-iss.png',
    hail: t('치익… 여기는 국제우주정거장, 당번 마야 린드. 들리니?'),
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
      {
        needs: ['nextStation'],
        lines: [
          t('하야시 쇼타? 맞아, 일지 첫 장의 서명이 그 이름이야.'),
          t('마지막 장에 이렇게 적혀 있어. "오늘 밤 기보의 창에서 HL로 시작하는 그 부호를 불렀다. 답이 없었다."'),
          t('HL은 한국 무전가의 부호야. 그 사람은 바다 건너 누군가를 끝내 못 불렀던 거지. 기보의 창에 한번 가 볼래?'),
        ],
        gives: ['unansweredCall'],
      },
    ],
  },
  {
    id: 'tiangongCrew', kind: 'person', at: { craft: 'tiangong' }, name: t('톈궁 승무원, 저우 린'), portrait: 'radio-tiangong.png',
    hail: t('치익… 여기는 톈궁, 승무원 저우 린. 잘 들려.'),
    visits: [
      {
        needs: ['korea1973'],
        lines: [
          t('반가워. 무전 이야기라면 생각나는 밤이 있어.'),
          t('몇 해 전, 우리 무전기에 다른 정거장에서 누군가를 부르는 소리가 걸렸어. 일본 억양의 영어였지.'),
          t('"바다 건너 친구, 들리면 답해 줘. 그 바닷가에서 같이 보던 별이 여기선 아주 잘 보여." 그러고는 조용해졌어.'),
        ],
        gives: ['overheardCall'],
      },
    ],
  },
  {
    id: 'tanegashimaCrew', kind: 'person', at: { site: 'tanegashima' }, name: t('다네가시마의 은퇴한 발사 요원, 오카다 스미에'), portrait: 'radio-tanegashima.png',
    hail: t('치익… 다네가시마예요. 은퇴한 늙은이지만 무전기는 아직 켜 둔답니다.'),
    visits: [
      {
        needs: ['kiboLog'],
        lines: [
          t('"JA"로 시작하는 일지라면 하야시 쇼타 군 거겠네요. 하야부사2를 같이 쏘아 올렸지요.'),
          t('사람들의 이름을 모아 싣는 행사가 있었는데, 그 친구가 이름 하나를 몰래 더 냈어요. 누구 거냐고 물으니 웃기만 하더군요.'),
        ],
        gives: ['shotaName'],
      },
      {
        needs: ['hayabusa2Mark'],
        lines: [
          t('그 부호가 하야부사2 기록에 있었어요? 그럼 표적 표지에 들어간 거예요.'),
          t('표적 표지는 착륙할 자리에 먼저 떨어뜨리는 공이에요. 2018년 10월에 류구 위에 떨어졌지요. 그 이름도 거기 있겠네요.'),
        ],
        gives: ['markerOnRyugu'],
      },
    ],
  },
  {
    id: 'vlaCrew', kind: 'person', at: { site: 'vla' }, name: t('VLA 전파천문학자, 엘레나 루이스'), portrait: 'radio-vla.png',
    hail: t('치익… VLA 관측실이야. 접시 스물일곱 개가 지금 하늘을 듣고 있어.'),
    visits: [
      {
        needs: ['shotaName'],
        lines: [
          t('쇼타? 학회에서 몇 번 만났어. 전파천문학을 하게 된 까닭을 물으니 무전 이야기를 하더라.'),
          t('어릴 때 바닷가 마을 언덕에서 무전기를 켜고, 바다 건너 누군가와 같은 별 이야기를 했대. 그게 시작이었다고.'),
        ],
        gives: ['shoreBoy'],
      },
      {
        needs: ['akatsukiMark'],
        lines: [
          t('아카쓰키 이야기라면, 2010년 금성 궤도에 들지 못했을 때 그는 정말 애가 탔대.'),
          t('5년 동안 해 둘레를 떠도는 탐사선의 신호를 듣다가, 2015년 12월에 마침내 궤도에 들었어. 그 판에 실은 글이 무사해서 다행이라고 했지.'),
        ],
        gives: ['akatsukiWait'],
      },
    ],
  },
  {
    id: 'naroCrew', kind: 'person', at: { site: 'naro' }, name: t('나로우주센터 발사 요원, 한도윤'), portrait: 'radio-naro.png',
    hail: t('치익… 나로우주센터입니다. 고흥 바닷바람이 세네요.'),
    visits: [
      {
        needs: ['kiboLog'],
        lines: [
          t('무전 일지라면 우리 할아버지 것도 있어요. 1970년대 한국 아마추어 무전가셨죠.'),
          t('1973년 쪽에 이런 줄이 있어요. "오늘도 HL 아가씨가 바다 건너 일본 소년과 별 이야기. 둘 다 망원경 자랑뿐."'),
        ],
        gives: ['korea1973'],
      },
    ],
  },
  {
    id: 'hayabusa2Log', kind: 'log', at: { craft: 'hayabusa2' }, name: t('하야부사2 기록장'), portrait: null,
    hail: t('하야부사2 기록장 · 2014년'),
    visits: [
      {
        needs: ['shotaName'],
        lines: [
          t('2014.12.03 발사. 표적 표지마다 이름 약 18만 개.'),
          t('2014.12.03 이름 명단 끝에 1건 덧붙음: 이름 없이 호출 부호 "HL"로 시작. 넣은 이: 하야시.'),
        ],
        gives: ['hayabusa2Mark'],
      },
      {
        needs: ['markerOnRyugu'],
        lines: [
          t('2020.12.06 재진입 캡슐, 오스트레일리아 우메라 사막에 내림.'),
          t('2020.12.06 캡슐 기억 칩, 이름 약 25만 개. 같은 "HL" 부호 1건 들어 있음.'),
        ],
        gives: ['capsuleChip'],
      },
    ],
  },
  {
    id: 'akatsukiLog', kind: 'log', at: { craft: 'akatsuki' }, name: t('아카쓰키 기록장'), portrait: null,
    hail: t('아카쓰키 기록장 · 2010년'),
    visits: [
      {
        needs: ['shotaName'],
        lines: [
          t('2010.05.21 발사. 알루미늄 판에 작은 글씨로 이름과 글 26만여 건.'),
          t('2010.05.21 판 셋째 장 끝줄: "바다 건너 같은 별을 보던 HL에게. 쇼타."'),
        ],
        gives: ['akatsukiMark'],
      },
    ],
  },
  {
    id: 'bepiLog', kind: 'log', at: { craft: 'bepiColombo' }, name: t('베피콜롬보 기록장'), portrait: null,
    hail: t('베피콜롬보 기록장 · 2018년'),
    visits: [
      {
        needs: ['capsuleChip'],
        lines: [
          t('2018.10.20 발사. 일본의 수성 궤도선 "미오" 실음.'),
          t('2018.10.20 미오 시험 기술자 서명: 하야시 쇼타. 메모: "이것이 마지막 탐사선. 다음은 정거장에서 직접 부를 것."'),
        ],
        gives: ['nextStation'],
      },
    ],
  },
];

// A clue: one line in the journal. from: who told it; points: the hidden place or the
// speaker it leads to; at: its place in the journal's web (0 → 1 across and down).
export const CLUES = [
  { id: 'kiboLog', text: t('기보 실험실의 낡은 무전 일지: 일본 기술자가 두고 갔다. 호출 부호는 앞의 "JA"만 읽힌다.'), from: 'issCrew', points: 'tanegashimaCrew', at: [0.5, 0.14] },
  { id: 'korea1973', text: t('나로의 할아버지 무전 일지, 1973년: 한국의 HL 아가씨와 일본 소년이 바다 건너 별 이야기를 했다.'), from: 'naroCrew', points: 'shotaShore', at: [0.2, 0.3] },
  { id: 'shotaName', text: t('일지의 주인은 하야시 쇼타. 하야부사2의 이름 명단에 이름 하나를 몰래 더 냈다.'), from: 'tanegashimaCrew', points: 'hayabusa2Log', at: [0.72, 0.3] },
  { id: 'overheardCall', text: t('톈궁이 엿들은 부름: "바다 건너 친구, 들리면 답해 줘."'), from: 'tiangongCrew', points: 'kiboWindow', at: [0.12, 0.52] },
  { id: 'shoreBoy', text: t('쇼타는 어릴 때 바닷가 마을 언덕에서 무전기를 켰다.'), from: 'vlaCrew', points: 'shotaShore', at: [0.32, 0.48] },
  { id: 'hayabusa2Mark', text: t('하야부사2의 이름 명단 끝: 이름 없이 "HL"로 시작하는 부호 하나.'), from: 'hayabusa2Log', points: 'ryuguMarker', at: [0.82, 0.46] },
  { id: 'akatsukiMark', text: t('아카쓰키의 알루미늄 판: "바다 건너 같은 별을 보던 HL에게. 쇼타."'), from: 'akatsukiLog', points: 'akatsukiOrbit', at: [0.58, 0.5] },
  { id: 'markerOnRyugu', text: t('그 부호는 표적 표지에 실려 2018년 10월 류구에 떨어졌다.'), from: 'tanegashimaCrew', points: 'ryuguMarker', at: [0.9, 0.62] },
  { id: 'akatsukiWait', text: t('아카쓰키는 5년을 떠돈 끝에 2015년 12월 금성 궤도에 들었다.'), from: 'vlaCrew', points: 'akatsukiOrbit', at: [0.55, 0.68] },
  { id: 'capsuleChip', text: t('하야부사2의 캡슐도 같은 부호를 싣고 오스트레일리아 우메라 사막에 내렸다.'), from: 'hayabusa2Log', points: 'woomera', at: [0.78, 0.8] },
  { id: 'nextStation', text: t('베피콜롬보의 메모: "이것이 마지막 탐사선. 다음은 정거장에서 직접 부를 것."'), from: 'bepiLog', points: 'issCrew', at: [0.4, 0.84] },
  { id: 'unansweredCall', text: t('기보의 일지 끝: "기보의 창에서 HL로 시작하는 그 부호를 불렀다. 답이 없었다."'), from: 'issCrew', points: 'kiboWindow', at: [0.22, 0.86] },
];

// The hidden places, as story places are (core/stories.js): 'surface' on a body's ground
// (latDeg, lonDeg), 'near' a body or a craft (target). needs: the clues that open one;
// needsFound: hidden places to be found first (the Kibo window, the last). text: told when
// she gets there. One by a craft reaches past DOCK_GAP_KM (core/dock.js, 60 km): docked
// with Akatsuki or the station, she is there.
export const HIDDEN = [
  {
    id: 'ryuguMarker', name: t('류구의 표적 표지'), nameEn: 'Target marker on Ryugu', type: 'near', target: 'ryugu', withinKm: 1,
    needs: ['hayabusa2Mark', 'markerOnRyugu'], at: [0.92, 0.36],
    text: t('2018년 10월, 하야부사2가 떨어뜨린 표적 표지가 이 바위 사이 어딘가에 있다. 18만 개의 이름 끝에, 이름 없는 "HL" 부호 하나가 함께 잠들어 있다.'),
  },
  {
    id: 'woomera', name: t('우메라 사막의 캡슐 자리'), nameEn: 'Capsule site, Woomera', type: 'surface', body: 'earth', latDeg: -31, lonDeg: 136, withinKm: 40,
    needs: ['capsuleChip'], at: [0.66, 0.94],
    text: t('2020년 12월 6일 새벽, 하야부사2의 캡슐이 낙하산을 펴고 이 붉은 사막에 내렸다. 류구의 흙과 함께, 그 부호도 지구로 돌아왔다.'),
  },
  {
    id: 'akatsukiOrbit', name: t('아카쓰키의 금성 궤도'), nameEn: "Akatsuki's orbit of Venus", type: 'near', target: 'akatsuki', withinKm: 80,
    needs: ['akatsukiMark', 'akatsukiWait'], at: [0.44, 0.6],
    text: t('5년을 떠돈 끝에 아카쓰키가 들어선 금성의 궤도다. 탐사선 옆구리의 알루미늄 판에 "바다 건너 같은 별을 보던 HL에게"라는 글이 실려 있다.'),
  },
  {
    // (A made-up village: a stretch of Kyushu's coast facing Korea, no real place named.)
    id: 'shotaShore', name: t('규슈의 바닷가 마을'), nameEn: 'A seaside village in Kyushu', type: 'surface', body: 'earth', latDeg: 33.45, lonDeg: 129.95, withinKm: 40,
    needs: ['korea1973', 'shoreBoy'], at: [0.1, 0.18],
    text: t('바다 건너 한국을 마주 보는 언덕이다. 1973년 여름, 열여덟 살 소년이 여기서 무전기를 켜고 바다 건너 처녀와 같은 별 이야기를 했다.'),
  },
  {
    id: 'kiboWindow', name: t('기보의 창'), nameEn: "Kibo's window", type: 'near', target: 'iss', withinKm: 80,
    needs: [], needsFound: ['ryuguMarker', 'woomera', 'akatsukiOrbit', 'shotaShore'], at: [0.5, 0.74],
    text: t('일본 실험실 기보의 작은 창 앞이다. 일지 맨 뒤 장, 번지지 않은 자리에 호출 부호가 끝까지 적혀 있다. 소라는 그 부호를 수첩에 옮겨 적는다. 할머니께 전해 드리자.'),
  },
];

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

// The hidden places open now: those whose clues are all known (and, for the last, whose
// places to be found first are found).
export function openHidden(radio) {
  return HIDDEN.filter((h) => h.needs.every((id) => radio.clues.includes(id)) && (h.needsFound ?? []).every((id) => radio.found.includes(id))).map((h) => h.id);
}

// The open hidden places on a body's ground, as storySitesAt (core/stories.js) gives the
// story places: where they are at game time timeS, turning with their body.
export function hiddenSitesAt(radio, timeS, bodies) {
  const open = new Set(openHidden(radio));
  return HIDDEN.filter((h) => h.type === 'surface' && open.has(h.id)).map((h) => {
    const body = bodies.find((b) => b.id === h.body);
    const up = surfaceDirection(h.latDeg, h.lonDeg, spinOf(h.body, timeS));
    return {
      id: h.id, name: h.name, nameEn: h.nameEn, kind: 'site', parent: h.body, radiusKm: 0, landmark: false,
      position: body.position.map((n, i) => n + up[i] * body.radiusKm),
    };
  });
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

// The log with those hidden places found. The Kibo window gives the call sign, and
// grandmother's note is due from then (nowMs: the time, Date.now()).
export function recordFound(radio, ids, nowMs = Date.now()) {
  const newly = ids.filter((id) => !radio.found.includes(id));
  if (!newly.length) return radio;
  const kibo = newly.includes('kiboWindow');
  return { ...radio, found: [...radio.found, ...newly], ...(kibo ? { callSign: true, noteAt: nowMs } : {}) };
}

// A hidden place as the note card shows it when she gets there: its name, then its telling.
export function foundNote(id) {
  const place = HIDDEN.find((h) => h.id === id);
  return {
    radioFound: id,
    title: place.name,
    button: t('수첩을 덮는다'),
    pages: [{ scene: place.name }, { scene: place.text }],
  };
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
// the first page, with the speaker's own call, as a radio is answered (`hail`; a log's
// is its heading, "하야부사2 기록장 · 2014년"). (The user, 2026-10-22, of a line of telling
// there, "국제우주정거장 당번, 마야 린드의 무전이 닿았다": "문체가 이게 뭐냐", then of four
// ways "1번으로 하자".) then a line a page, told plainly above the paper (`scene`): there is
// no paper, which is grandmother's hand. radio: who it was, for main.js when it closes.
// (No id: it is not one of grandmother's notes, kept as read and read over.)
export function talkNote(speakerId, visit) {
  const speaker = speakerById(speakerId);
  return {
    radio: speakerId,
    title: speaker.name,
    button: t('무전을 끈다'),
    pages: [
      { image: speaker.portrait, scene: speaker.hail },
      ...visit.lines.map((line) => ({ scene: line })),
    ],
  };
}

// Where each speaker stands in the journal's web (0 → 1 across and down); the young
// radio operator, Shota, is in the middle, known from the start.
const SPEAKER_AT = {
  issCrew: [0.5, 0.06], tanegashimaCrew: [0.86, 0.16], naroCrew: [0.08, 0.36], vlaCrew: [0.34, 0.32],
  tiangongCrew: [0.06, 0.7], hayabusa2Log: [0.95, 0.5], akatsukiLog: [0.68, 0.4], bepiLog: [0.34, 0.96],
};
export const WEB_CENTRE = [0.5, 0.5];

// The journal's web: a point for Shota, each speaker, clue and hidden place, and a line
// from who told a clue to it and from it to where it points. A point is known once heard,
// told of, or (the hidden places) open; lines only between known points.
export function radioWeb(radio) {
  const heard = new Set(radio.clues);
  const known = CLUES.filter((c) => heard.has(c.id));
  const toldOf = new Set(known.flatMap((c) => [c.from, c.points]));
  const open = new Set(openHidden(radio));
  const nodes = [
    { id: 'shota', kind: 'centre', at: WEB_CENTRE, known: true },
    ...SPEAKERS.map((s) => ({ id: s.id, kind: 'speaker', at: SPEAKER_AT[s.id], known: (radio.visits[s.id] ?? 0) > 0 || toldOf.has(s.id) })),
    ...CLUES.map((c) => ({ id: c.id, kind: 'clue', at: c.at, known: heard.has(c.id) })),
    ...HIDDEN.map((h) => ({ id: h.id, kind: 'hidden', at: h.at, known: open.has(h.id) || toldOf.has(h.id), open: open.has(h.id), found: radio.found.includes(h.id) })),
  ];
  const links = known.flatMap((c) => [[c.from, c.id], [c.id, c.points]]);
  return { nodes, links };
}

// Grandmother's note at the end, in her hand as her other notes are (core/story.js):
// she switched the radio on and called the sign Sora brought. What was said is not told:
// only that it was (her voice is never heard in the game).
export const FINAL_NOTE = {
  id: 'radioNote',
  scene: t('수첩 사이에 할머니의 쪽지가 새로 끼워져 있다.'),
  title: '2026',
  text: t('어젯밤, 오십 년 만에 무전기를 켰단다.\n\n')
    + t('네가 적어 온 부호를 불렀더니, 한참 만에 바다 건너에서 낯익은 말투가 돌아오더구나. 하늘 이야기를 하다 보니 날이 새는 줄도 몰랐어.\n\n')
    + t('그 사람이 나를 찾느라 우주까지 갔더구나. 나는 망원경 앞에서 기다리기만 했는데. 고맙다, 소라야.'),
  button: t('쪽지를 접는다'),
  line: t('오십 년 만에 닿았구나!'),
};

// Whether grandmother's note is due: the call sign got and the note not yet read, and
// either ten minutes gone since (nowMs, Date.now()) or the game opened anew (freshStart).
export function noteDue(radio, nowMs, freshStart) {
  if (!radio.callSign || radio.noteRead) return false;
  return freshStart || (Number.isFinite(radio.noteAt) && nowMs - radio.noteAt >= 600000);
}

export function readNote(radio) {
  return { ...radio, noteRead: true };
}
