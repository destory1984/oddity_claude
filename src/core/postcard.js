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
//   company: another body, or Sora herself, is in the picture
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
// A line from one of the tables below by a key read from storage, which may be anything
// ("constructor" is a key of every plain object).
const lineOf = (table, key) => (typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : undefined);

// By the story place the photo was taken at (an album entry's `place`): the two ends of
// the ninth tour. Sora thinks the film was shot on Mars; grandmother puts it right. The
// film is not named anywhere.
const BY_PLACE = {
  acidalia: '영화에서 본 그 평원이구나. 그런데 그 장면은 요르단 사막에서 찍었단다.',
  wadiRum: '2015년 극장에서 본 화성이 바로 그 사막이란다. 지구인 줄 몰랐지.',
};
// The place to keep with a photo, of the story places she is at (core/stories.js
// completedStories), or null.
export const cardPlace = (storyIds) => storyIds.find((id) => lineOf(BY_PLACE, id)) ?? null;

// What she says when a place or a picture she has already answered comes again.
const AGAIN = {
  sun: '또 해구나. 눈 조심하렴. 나는 2009년 일식 때도 필터를 꼭 댔단다.',
  mercury: '수성을 또 찍었구나. 해 뜨기 전에 나가도 번번이 놓치던 별인데.',
  venus: '금성을 또 보냈구나. 2012년에 해 앞을 지나던 검은 점이 저것이란다.',
  earth: '또 우리 집이구나. 이번에는 마당에 나가 손을 흔들었단다.',
  moon: '달을 또 찍었구나. 볼 때마다 좋은 건 나도 그렇단다.',
  mars: '화성을 또 보냈구나. 내 망원경으로는 흰 극관밖에 못 봤는데.',
  jupiter: '목성을 또 찍었구나. 1994년에 혜성이 부딪혀 든 멍은 이제 없지?',
  saturn: '토성을 또 보냈구나. 1995년에는 고리가 누워서 며칠 안 보였단다.',
  uranus: '천왕성을 또 찍었구나. 정말 누워서 도느냐.',
  neptune: '해왕성을 또 보냈구나. 1989년에 신문에서 본 그 푸른빛 그대로다.',
  pluto: '명왕성을 또 찍었구나. 그 하트는 볼수록 정이 간다.',
  ceres: '세레스를 또 찍었구나. 처음엔 행성이라 불렸던 곳이란다.',
  halley: '핼리를 또 보냈구나. 2061년에 다시 온다니, 그때는 네가 보렴.',
  haleBopp: '헤일-밥을 또 보냈구나. 저녁마다 마당에 나가던 생각이 난다.',
  churyumov: '그 혜성을 또 찍었구나. 오리처럼 생긴 건 볼 때마다 우습다.',
  eclipse: '개기일식을 또 봤구나. 부럽기도 하지.',
  earthrise: '지구가 뜨는 걸 또 찍었구나. 몇 번을 봐도 곱다.',
  paleBlueDot: '또 그 점이구나. 이번에도 손 흔들었단다.',
};
const STARS = [
  '다음엔 무엇을 찍는지 잘 보이게 담아 보렴.',
  '별 하나. 조금 더 크게, 조금 비켜서 찍어 보렴.',
  '별 둘. 솜씨가 늘었구나.',
  '별 셋. 이건 액자에 넣어야겠다.',
];

// The reply to a postcard. entry: an album entry (rate may be missing on an old photo).
// n: a count that picks among the plain lines, so two in a row differ.
// earlier: the replies she has already written. A place answered before gets her second
// line, and after that a plain one: she does not say the same thing twice.
export function replyFor(entry, n = 0, earlier = []) {
  const mission = (entry.missions ?? []).find((id) => lineOf(BY_MISSION, id));
  const key = mission ?? entry.rate?.subject;
  // Known by its first sentence, so a line reworded later (the earthrise one was) still
  // counts as said.
  const opening = (line) => line.slice(0, line.indexOf('.') + 1) || line;
  const said = (line) => earlier.some((text) => text.startsWith(opening(line)));
  // A mission met comes first; then the story place it was taken at; then the body.
  const lines = mission ? [BY_MISSION[mission], lineOf(AGAIN, mission)] : [lineOf(BY_PLACE, entry.place), lineOf(HEARTS, key), lineOf(AGAIN, key)];
  const own = lines.find((line) => line && !said(line));
  const heart = own ?? PLAIN[n % PLAIN.length];
  return entry.rate ? `${heart} ${STARS[entry.rate.stars]}` : heart;
}

// The words on the paper band of a postcard picture (ui/postcardImage.js): where it was
// taken, then the day (by the local calendar) and the photo missions it met.
export function cardWords(entry, missions = []) {
  const at = new Date(entry.at);
  const names = (entry.missions ?? []).map((id) => missions.find((m) => m.id === id)?.name).filter(Boolean);
  return { place: entry.where, day: [`${at.getFullYear()}.${at.getMonth() + 1}.${at.getDate()}`, ...names].join(' · ') };
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
