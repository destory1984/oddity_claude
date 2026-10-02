// The story 「할머니의 수첩」 (docs/스토리-할머니의-수첩.md): the notes grandmother left
// between the pages of her journal. She never appears; only her handwriting does. Every
// event in a note really happened. The notes come out in the order of their years.
//
// when: 'start' (a new log), { landed: bodyId } (the first landing there),
// { slots: n } (that many journal slots filled), or 'complete' (every slot filled).
// gate: the last note only. The scene at grandmother's gate that follows it, where the
// line is spoken instead of going into a speech bubble.
// scene: a line of plain telling above the paper. text: grandmother's hand.
// line: what Seora says once the note is put away (반말, 25 characters at most).
export const NOTES = [
  {
    id: 'opening',
    when: 'start',
    scene: '심부름으로 온 할머니 댁. 할머니는 마실 나가셨고, 마루에 낡은 수첩과 쪽지가 놓여 있다.',
    title: '서라에게',
    text: '서라야, 수첩 빈칸 좀 채워 주련.\n나는 이제 멀리 못 간단다.\n\n첫 칸은 달이다.',
    button: '수첩을 편다',
    line: '빈칸 채우기? 그거 내 특기야.',
  },
  {
    id: 'y1969',
    when: { landed: 'moon' },
    scene: '달에 내려서자 수첩 첫 장 사이에서 쪽지가 떨어졌다.',
    title: '1969.7.21',
    text: '열다섯 살이었단다. 그날은 임시 공휴일이라 학교에 안 갔지.\n\n'
      + '텔레비전 있는 집이 드물어서 이웃집 마당에 온 동네가 모였단다. 새벽부터 생중계를 했는데 흑백 화면이 흐려서 뭐가 뭔지 잘 안 보였어.\n\n'
      + '그래도 사람이 달에 내려섰다는 건 알았지. 그날 밤 달을 한참 올려다보고 이 수첩 첫 장을 적었단다.',
    button: '쪽지를 접는다',
    line: '할머니가 본 달에 나 서 있어!',
  },
  {
    id: 'y1979',
    when: { slots: 40 },
    scene: '마흔 칸을 채우자 수첩 사이에서 쪽지가 또 나왔다.',
    title: '1979',
    text: '신문에서 보이저 1호가 보낸 목성 사진을 봤단다.\n\n'
      + '내 망원경으로는 점 넷으로만 보이던 위성들에 하나하나 얼굴이 있더구나. 이오에서는 화산이 뿜고 있었지. 지구 밖에서 처음 찾은 살아 있는 화산이란다.\n\n'
      + '그 사진을 오려서 한참 들여다봤어.',
    button: '쪽지를 접는다',
    line: '마흔 칸이다. 쪽지가 또 나왔어!',
  },
  {
    id: 'y1986',
    when: { slots: 100 },
    scene: '백 칸을 채우자 수첩 사이에서 쪽지가 또 나왔다.',
    title: '1986',
    text: '핼리 혜성이 76년 만에 온다고 해서 몇 달을 기다렸단다.\n\n'
      + '새벽에 옥상에 올라가 지평선 가까이에서 겨우 찾았는데, 생각보다 희미해서 실망했지. 꼬리는 보이지도 않았어.\n\n'
      + '다음에 오는 건 2061년이란다.',
    button: '쪽지를 접는다',
    line: '희미해도 봤잖아. 난 가까이서 볼게!',
  },
  {
    id: 'last',
    when: 'complete',
    scene: '마지막 칸을 채우자 수첩 맨 뒷장이 열렸다.',
    title: '이 수첩을 다 채운 사람에게',
    text: '1990년 신문에서 사진 한 장을 봤단다.\n60억 km 밖에서 찍은 지구가 먼지 한 톨 같더구나.\n\n'
      + '언젠가 그 자리에서 우리 집을 돌아보고 싶었는데, 나는 못 갔다.\n\n'
      + '이 장을 읽는 사람은 갔다 왔구나. 와서 얘기해 주련.',
    button: '수첩을 덮는다',
    line: '할머니, 나 왔어!',
    gate: '할머니 댁 대문 앞. 서라가 문을 두드린다.',
  },
];

export function noteById(id) {
  return NOTES.find((n) => n.id === id) ?? null;
}

function met(when, progress, done, total) {
  if (when === 'start') return true;
  if (when === 'complete') return done >= total;
  if (when.landed) return progress.landed.includes(when.landed);
  return done >= when.slots;
}

// The note to bring out now, or null. done, total: how many journal slots are filled,
// out of how many (core/progress.js score). Only the earliest unread note is ever due, so they come in
// order even on a log that was far along before the story was added.
export function dueNote(progress, done, total = Infinity) {
  const read = progress.notes ?? [];
  const next = NOTES.find((n) => !read.includes(n.id));
  return next && met(next.when, progress, done, total) ? next : null;
}

// The last slot: the Pale Blue Dot, a photo mission and a story place with the same id
// (two slots). Grandmother's clipping of the 1990 photograph is at the back of the
// journal; the slots stay shut until every other one is filled, and then one photograph
// of Earth as a dot, taken at least this far from it, fills both.
export const LAST_SLOT = 'paleBlueDot';
export const LAST_SLOT_KM = 6e7;

export function lastSlotOpen(progress, done, total) {
  const have = Number(progress.photos.includes(LAST_SLOT)) + Number((progress.stories ?? []).includes(LAST_SLOT));
  return done - have >= total - 2;
}

// What a saved photo fills. missionIds: the missions it meets (core/missions.js);
// earthKm: how far she is from Earth's centre. Returns the missions to record, the
// story places to record, and why the last slot was held back ('locked', 'near') or null.
// A log from before the story may already have one or both of the two slots: they are
// kept, and nothing more is said about them.
export function photoSlots(missionIds, { open, earthKm, progress }) {
  if (!missionIds.includes(LAST_SLOT)) return { missions: missionIds, stories: [], held: null };
  const hasPhoto = progress.photos.includes(LAST_SLOT);
  if (hasPhoto && (progress.stories ?? []).includes(LAST_SLOT)) return { missions: missionIds, stories: [], held: null };
  if (open && earthKm >= LAST_SLOT_KM) return { missions: missionIds, stories: [LAST_SLOT], held: null };
  return {
    missions: hasPhoto ? missionIds : missionIds.filter((id) => id !== LAST_SLOT),
    stories: [],
    held: open ? 'near' : 'locked',
  };
}

// Beside each of the 35 bodies in the journal: grandmother's memo (what she saw from
// Earth, or read, in a short record; "봤다" for what an amateur's telescope or the naked
// eye shows, "읽었다" for the rest) and Seora's line on getting there (the speech bubble
// at the discovery, then under the memo). Numbers in a line equal core/facts.js.
export const MEMOS = {
  sun: { memo: '2009.7.22. 부분일식. 해가 80%쯤 가려졌다. 필터를 대고 봤다.', line: '더워, 부채 어디 갔지.' },
  mercury: { memo: '해 뜨기 전 동쪽 하늘 낮은 곳. 평생 몇 번밖에 못 봤다.', line: '낮이랑 밤이 600도 차이래.' },
  venus: { memo: '2012.6.6. 금성이 해 앞을 지나감. 검은 점 하나를 봤다. 다음은 2117년.', line: '하루가 일 년보다 길대. 이상해!' },
  earth: { memo: '1972.12. 아폴로 17호가 찍은 둥근 지구. 잡지에서 오려 붙이고 한참 봤다.', line: '우리 집이다. 바다가 71%래.' },
  moon: { memo: '1969.7.21. 사람이 달에 내렸다. 이웃집 마당 텔레비전으로 봤다.', line: '달이다! 할머니 수첩 첫 장이네.' },
  mars: { memo: '2003.8.27. 6만 년 만에 가장 가까이 옴. 망원경으로 흰 극관을 봤다.', line: '산 높이가 22km래. 못 올라가.' },
  phobos: { memo: '1877년 아사프 홀이 발견. 내 망원경으로는 안 보인다. 책에서 읽었다.', line: '감자처럼 생겼어. 진짜야!' },
  deimos: { memo: '1877년 발견. 포보스보다 엿새 먼저 찾았다고 책에서 읽었다.', line: '지름이 12km래. 동네만 해.' },
  jupiter: { memo: '1994.7. 슈메이커-레비 혜성이 목성에 부딪힘. 망원경으로 검은 멍을 봤다.', line: '멍은 없어! 대신 붉은 점이 엄청 커.' },
  io: { memo: '목성 옆 점 넷 가운데 가장 안쪽. 이틀이 안 돼 한 바퀴 도는 걸 봤다.', line: '화산이 400개 넘는대. 뜨거워!' },
  europa: { memo: '목성 옆 점 넷 가운데 가장 작은 것. 맑은 밤에 봤다.', line: '얼음 밑에 바다가 있대.' },
  ganymede: { memo: '목성 옆 점 넷 가운데 가장 밝은 것. 쌍안경으로도 봤다.', line: '수성보다 크대. 달 맞아?' },
  callisto: { memo: '목성 옆 점 넷 가운데 가장 멀리 떨어진 것. 가장 어둡다. 봤다.', line: '구덩이투성이야. 곰보빵 같아.' },
  saturn: { memo: '1995. 고리가 옆으로 누워 실처럼 가늘어짐. 며칠은 아예 사라진 걸 봤다.', line: '고리가 다 얼음 조각이래. 반짝반짝.' },
  titan: { memo: '토성 옆의 작은 점. 봤다. 2005.1 하위헌스가 내렸다는 건 신문에서.', line: '주황색 안개야. 비도 온대!' },
  rhea: { memo: '1672년 카시니가 발견. 책에서 읽었다.', line: '토성에서 두 번째로 크대.' },
  iapetus: { memo: '1671년 카시니가 발견. 토성 한쪽에서만 보였다고 책에서 읽었다.', line: '반은 까맣고 반은 하얘!' },
  dione: { memo: '1684년 카시니가 테티스와 함께 발견. 책에서 읽었다.', line: '작은 달 둘이랑 같이 돈대.' },
  tethys: { memo: '1684년 카시니가 발견. 책에서 읽었다.', line: '통째로 얼음이래. 빙수다!' },
  enceladus: { memo: '1789년 허셜이 발견. 2005년 물기둥을 찾았다고 신문에서 읽었다.', line: '물을 뿜어! 분수 같아.' },
  mimas: { memo: '1789년 허셜이 발견. 1980년 보이저가 찍은 큰 구덩이를 신문에서 읽었다.', line: '구덩이가 눈알처럼 커!' },
  uranus: { memo: '망원경으로 푸른 점 하나를 봤다. 1977.3 고리가 발견됐다고 읽었다.', line: '누워서 굴러가. 98도래!' },
  miranda: { memo: '1948년 카이퍼가 발견. 1986.1 보이저 2호가 지나갔다고 신문에서 읽었다.', line: '절벽이 20km래. 아찔해.' },
  ariel: { memo: '1851년 라셀이 발견. 책에서 읽었다.', line: '여기서 제일 밝은 달이래.' },
  umbriel: { memo: '1851년 라셀이 아리엘과 함께 발견. 책에서 읽었다.', line: '여긴 제일 어두운 달이래.' },
  titania: { memo: '1787년 허셜이 발견. 천왕성을 찾고 6년 뒤라고 책에서 읽었다.', line: '천왕성 달 중에 대장이야.' },
  oberon: { memo: '1787년 허셜이 티타니아와 같은 날 발견. 책에서 읽었다.', line: '1787년에 찾았대. 오래됐다.' },
  neptune: { memo: '1989.8. 보이저 2호가 지나감. 푸른 사진은 신문에서, 점 하나는 망원경으로 봤다.', line: '바람이 시속 2,000km래!' },
  triton: { memo: '1846년 라셀이 발견. 해왕성을 찾고 17일 뒤라고 책에서 읽었다.', line: '영하 235도래. 얼음 분수도 있어.' },
  ceres: { memo: '1801.1.1 피아치가 발견. 처음엔 행성이라 불렀다고 책에서 읽었다.', line: '소행성대에서 제일 큰 애야.' },
  pluto: { memo: '1930년 톰보가 발견. 2006.8 행성에서 빠졌다고 신문에서 읽었다.', line: '하트가 있어! 진짜 하트야.' },
  charon: { memo: '1978년 크리스티가 발견. 사진 속 혹 하나로 찾았다고 읽었다.', line: '명왕성 반만 해. 둘이 마주 돌아.' },
  halley: { memo: '1986.3. 새벽 지평선 가까이. 생각보다 희미했다. 그래도 봤다.', line: '할머니가 희미했다던 그 혜성이다!' },
  haleBopp: { memo: '1997.3. 맨눈으로 꼬리까지. 평생 가장 밝은 혜성. 저녁마다 봤다.', line: '핼리보다 다섯 배 크대!' },
  churyumov: { memo: '1969년 발견. 내 수첩과 같은 해. 2014년 로제타 소식을 신문에서 읽었다.', line: '고무 오리다! 두 덩이야.' },
};
