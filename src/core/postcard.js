import { frameBodies } from './framing.js';
import { forward, right, up } from './orientation.js';

// Postcards to grandmother (docs/스토리-할머니의-수첩.md): a photo in the album is sent
// as a postcard, and her reply is there the next day the game is opened. The reply is
// the third voice of the story: her heart, in her own way of speaking. The stars on a
// photo are hers too, and only postcards get them.

const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);

// The subject must be at least this much of the view's height to count as a subject
// at all, and a companion this much.
const SUBJECT_FILL = 0.02;
const COMPANION_FILL = 0.005;

// How a photo is framed, judged on the view at the moment it was saved. Four things:
//   size: the subject (the largest body in view, the Sun aside) is 25 to 70% of the height
//   place: its centre is outside the middle third of the view (a rule-of-thirds spot)
//   light: more than 40% of its lit side shows, or it is a thin backlit crescent (under 10%)
//   company: another body, or Seora herself, is in the picture
// Two of the four make one star, three make two, four make three.
// Returns { stars: 0..3, subject: body id or null, met: [names of what was met] }.
// subject is the planet for a photo of one of its moons (the Moon is its own).
export function ratePhoto({ position, orientation, fovY, aspect, heroVisible, bodies }) {
  const frames = frameBodies({ position, orientation, fovY, aspect, bodies })
    .filter((f) => f.visible && !f.hidden && f.body.kind !== 'star');
  const main = frames.filter((f) => f.fill >= SUBJECT_FILL).sort((a, b) => b.fill - a.fill)[0];
  if (!main) return { stars: 0, subject: null, met: [] };

  const met = [];
  if (main.fill >= 0.25 && main.fill <= 0.7) met.push('size');

  const halfY = fovY / 2;
  const halfX = Math.atan(Math.tan(halfY) * aspect);
  const z = dot(main.direction, forward(orientation));
  const x = Math.atan2(dot(main.direction, right(orientation)), z) / halfX;
  const y = Math.atan2(dot(main.direction, up(orientation)), z) / halfY;
  if (Math.abs(x) > 1 / 3 || Math.abs(y) > 1 / 3) met.push('place');

  // The lit fraction of the disc as seen from here: (1 + cos(phase angle)) / 2.
  const sun = bodies.find((b) => b.kind === 'star');
  const toSun = sun.position.map((n, i) => n - main.body.position[i]);
  const toEye = main.direction.map((n) => -n);
  const lit = (1 + dot(toSun, toEye) / Math.hypot(...toSun)) / 2;
  if (lit > 0.4 || lit < 0.1) met.push('light');

  if (heroVisible || frames.some((f) => f !== main && f.fill >= COMPANION_FILL)) met.push('company');

  const { body } = main;
  return {
    stars: Math.max(0, met.length - 1),
    subject: body.kind === 'moon' && body.id !== 'moon' ? body.parent : body.id,
    met,
  };
}

// The local calendar day, 'YYYY-MM-DD'.
export function dayOf(date) {
  const two = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

// Mark the album's photo at index as sent today. A photo is sent once.
export function sendPostcard(album, index, today) {
  return album.map((entry, i) => (i === index && !entry.sent ? { ...entry, sent: today } : entry));
}

// Indices of postcards whose reply has come: sent on an earlier day, not yet answered.
// Skipping days loses nothing; the replies wait.
export function arrivedReplies(album, today) {
  return album.flatMap((entry, i) => (entry.sent && !entry.reply && entry.sent < today ? [i] : []));
}

// What grandmother feels about each place: one line each. Everything she says she saw
// really happened (the same events as her memos in core/story.js).
const HEARTS = {
  sun: '해를 그리 가까이서 보다니. 나는 필터 너머로만 봤단다.',
  mercury: '수성은 평생 몇 번 못 봤는데, 네가 대신 실컷 보는구나.',
  venus: '새벽마다 제일 먼저 뜨던 별이 저렇게 생겼구나.',
  earth: '우리 집이 저기 어디쯤이겠구나. 마당에 빨래 널어 놨단다.',
  moon: '열다섯 살에 올려다본 그 달이구나. 하나도 안 변했네.',
  mars: '2003년에 망원경으로 본 붉은 점이 이렇게 넓은 땅이었구나.',
  jupiter: '그 붉은 점은 내가 처음 봤을 때보다 작아졌단다.',
  saturn: '처음 망원경으로 고리를 봤을 때 숨이 멎는 줄 알았단다.',
  uranus: '내 망원경으로는 푸른 점 하나였는데, 네 눈에는 다 보이는구나.',
  neptune: '거기까지 갔구나. 춥지는 않으냐.',
  pluto: '행성에서 빠지던 날 서운했는데, 하트가 있었구나.',
  ceres: '그 작은 곳까지 들렀구나. 꼼꼼하기도 하지.',
  halley: '그렇게 희미하던 것이 가까이서는 이렇구나. 고맙다.',
  haleBopp: '1997년 저녁마다 나가서 보던 혜성이란다. 반갑구나.',
  churyumov: '내 수첩과 같은 해에 찾은 혜성이란다. 동갑이지.',
};
// A photo of no body in particular.
const PLAIN = [
  '별이 참 많구나. 여기서는 가로등 때문에 잘 안 보인단다.',
  '네가 본 것을 나도 보는구나. 고맙다.',
  '사진을 벽에 붙여 놨단다. 벌써 여러 장이다.',
  '멀리 갔구나. 밥은 잘 챙겨 먹으렴.',
];
// By the photo missions it met: these come before the place.
const BY_MISSION = {
  eclipse: '나는 평생 개기일식을 못 봤단다. 네가 봤으니 됐다.',
  earthrise: '달에서 지구가 뜨는 걸 보다니. 1968년 아폴로 8호가 찍은 그 사진 같구나.',
  paleBlueDot: '저 점 안에 내가 있단다. 손 흔든 거 봤느냐.',
};
const STARS = [
  '다음엔 무엇을 찍는지 잘 보이게 담아 보렴.',
  '별 하나. 조금 더 크게, 조금 비켜서 찍어 보렴.',
  '별 둘. 솜씨가 늘었구나.',
  '별 셋. 이건 액자에 넣어야겠다.',
];

// The reply to a postcard. entry: an album entry (rate may be missing on an old photo).
// n: a count that picks among the plain lines, so two in a row differ.
export function replyFor(entry, n = 0) {
  const mission = (entry.missions ?? []).find((id) => BY_MISSION[id]);
  const heart = BY_MISSION[mission] ?? HEARTS[entry.rate?.subject] ?? PLAIN[n % PLAIN.length];
  return entry.rate ? `${heart} ${STARS[entry.rate.stars]}` : heart;
}

export const starText = (stars) => '★'.repeat(stars) + '☆'.repeat(3 - stars);

// The stamp on a postcard, by what the photo is of: public/assets/notebook/postage-*.png.
const COMETS = ['halley', 'haleBopp', 'churyumov'];
export function postageFile(entry) {
  const subject = entry.rate?.subject ?? null;
  let stamp = 'seora';
  if (!subject) stamp = 'telescope';
  else if (['moon', 'saturn', 'earth'].includes(subject)) stamp = subject;
  else if (COMETS.includes(subject)) stamp = 'comet';
  return `notebook/postage-${stamp}.png`;
}
