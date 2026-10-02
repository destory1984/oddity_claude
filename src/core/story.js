// The story 「할머니의 수첩」 (docs/스토리-할머니의-수첩.md): the notes grandmother left
// between the pages of her journal. She never appears; only her handwriting does. Every
// event in a note really happened. The notes come out in the order of their years.
//
// when: 'start' (a new log), { landed: bodyId } (the first landing there), or
// { slots: n } (that many journal slots filled).
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
];

export function noteById(id) {
  return NOTES.find((n) => n.id === id) ?? null;
}

function met(when, progress, done) {
  if (when === 'start') return true;
  if (when.landed) return progress.landed.includes(when.landed);
  return done >= when.slots;
}

// The note to bring out now, or null. done: how many journal slots are filled
// (core/progress.js score). Only the earliest unread note is ever due, so they come in
// order even on a log that was far along before the story was added.
export function dueNote(progress, done) {
  const read = progress.notes ?? [];
  const next = NOTES.find((n) => !read.includes(n.id));
  return next && met(next.when, progress, done) ? next : null;
}
