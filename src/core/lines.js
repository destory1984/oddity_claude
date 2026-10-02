// What Seora says to herself on the way (docs/재미-기획서.md 3.2): one line in the speech
// bubble, 반말, 25 characters at most, one exclamation at most. Her lines on finding a
// body are in core/story.js MEMOS and those at a tour's stops in core/tours.js. Numbers
// equal core/facts.js.

// On the first landing on each body (the gas planets: on touching the cloud tops).
export const LANDED = {
  sun: '앗 뜨거! 발 데겠어.',
  mercury: '낮엔 430도래. 그늘로 가자.',
  venus: '여기선 납도 녹는대.',
  earth: '집에 왔다! 흙냄새 좋아.',
  moon: '폴짝! 몸이 엄청 가벼워.',
  mars: '온통 붉은 흙이야. 녹슬었대.',
  phobos: '세게 뛰면 날아가겠어.',
  deimos: '여기선 화성이 엄청 커.',
  jupiter: '땅이 없어! 구름뿐이야.',
  io: '바닥이 노래. 유황이래.',
  europa: '얼음 위야. 밑에서 물소리 나?',
  ganymede: '얼음이랑 바위가 섞였어.',
  callisto: '구덩이 안에 또 구덩이야.',
  saturn: '여기도 구름뿐. 둥둥 떠 있어.',
  titan: '메탄 비가 와. 우산 없는데!',
  rhea: '온통 얼음이야. 미끄러워.',
  iapetus: '까만 쪽에 내렸어. 숯 같아.',
  dione: '하얀 절벽이 줄줄이 있어.',
  tethys: '빙수 위에 선 기분이야.',
  enceladus: '눈이 폴폴 내려. 분수에서 왔대.',
  mimas: '큰 구덩이 가장자리야.',
  uranus: '푸른 구름 위야. 춥다.',
  miranda: '절벽이 20km래. 내려다보지 마.',
  ariel: '골짜기가 길게 나 있어.',
  umbriel: '어둑어둑해. 손전등 줘.',
  titania: '금 간 얼음이 끝도 없어.',
  oberon: '구덩이 바닥이 까매.',
  neptune: '바람이 세! 날아가겠어.',
  triton: '발이 시려. 영하 235도래.',
  ceres: '하얀 소금밭이 반짝여.',
  pluto: '하트 위에 섰어. 질소 얼음이래.',
  charon: '명왕성이 하늘에 딱 붙어 있어.',
  halley: '혜성 위야! 작은 감자 같아.',
  haleBopp: '얼음 먼지가 폴폴 날려.',
  churyumov: '필레처럼 통통 튈 뻔했어.',
};

// Coasting a long while with nothing to do. She is never in a hurry.
export const IDLE = [
  '심심한데 노래나 부를까.',
  '별이 참 많다. 다 못 세겠어.',
  '할머니는 지금 뭐 하실까.',
  '배고프다. 간식 싸 올걸.',
  '우주는 왜 이렇게 조용해?',
  '가만있어도 가네. 편하다.',
  '저 별엔 누가 살까?',
  '하암, 조금만 졸까.',
  '수첩 어디까지 채웠더라.',
  '집에 가면 다 얘기해 줘야지.',
  '멀리 왔다. 그래도 안 무서워.',
  '다음엔 어디 갈까.',
];
// She speaks after this long coasting, and then not again for this long.
export const IDLE_AFTER_S = 30;
export const IDLE_GAP_S = 90;

// Standing again beside a place already in the journal.
export const AGAIN = [
  '또 왔네. 여기 좋지?',
  '여기 올 때마다 새로워.',
  '안녕, 나 또 왔어.',
  '저번이랑 똑같네. 다행이다.',
  '여긴 벌써 외웠어.',
  '단골이 됐네.',
  '또 봐도 멋있어.',
  '할머니한테 또 얘기해야지.',
];

// On filling this many slots of the journal (40 and 100 bring a note from grandmother
// instead, core/story.js).
export const MILESTONES = {
  80: '여든 칸! 연필이 닳겠어.',
  120: '백스무 칸. 절반 넘었어!',
  160: '백예순 칸! 거의 다 왔어.',
};

// A line said nowhere yet in this visit to the game: the next in order after those in
// `used` (a Set of lines), or null when all were said. She does not repeat herself.
export function freshLine(list, used) {
  return list.find((line) => !used.has(line)) ?? null;
}

// The milestone line for going from `before` to `after` filled slots, or null.
export function milestoneLine(before, after) {
  const hit = Object.keys(MILESTONES).map(Number).find((n) => before < n && after >= n);
  return hit ? MILESTONES[hit] : null;
}
