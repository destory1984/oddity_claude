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
  // Eighteen more (the user, 2026-10-04: "서라가 말이 별로 없는 편이잖아. 좀 더 많은 대화를 하게 해줘").
  '발끝에 별이 걸릴 것 같아.',
  '숨 한번 크게 쉬고.',
  '이 고요함, 나쁘지 않네.',
  '엄마는 내가 어디 있는지 알까.',
  '모자 날아갈 뻔했어.',
  '어제 본 별이 저 별인가.',
  '손 흔들면 누가 볼까?',
  '한 바퀴 빙 돌아 볼까.',
  '주머니에 사탕 하나 남았다.',
  '별똥별 보면 소원 빌어야지.',
  '우주에도 냄새가 있을까.',
  '빛이 여기까지 몇 분 걸렸을까.',
  '지구는 지금 낮일까 밤일까.',
  '오늘 본 것 중에 뭐가 제일이지.',
  '망토에 별가루 묻었네.',
  '할머니도 이 길로 왔을까.',
  '노래 한 곡만 더 듣고 가자.',
  '천천히 가도 돼. 급할 것 없어.',
];
// She speaks after this long with nothing to do, and then not again for this long.
// (It was 30 s and 90 s, and only while coasting: she said little.)
export const IDLE_AFTER_S = 20;
export const IDLE_GAP_S = 45;

// With nothing to do near a world, she talks about that world first: within
// NEAR_RADII of its ground. Numbers are the well-known ones (the Sun is 109 Earths
// across, Jupiter holds 1,300 Earths, sunlight takes four hours to reach Neptune).
export const NEAR_RADII = 30;
export const NEAR = {
  sun: ['눈부셔! 손차양 해야겠다.', '해는 지구 백구 개가 늘어선 크기래.'],
  mercury: ['해가 엄청 크게 보여.', '수성의 하루는 일 년보다 길대.'],
  venus: ['구름이 두꺼워서 땅이 안 보여.', '금성은 거꾸로 돈대. 신기해.'],
  earth: ['저기 어디쯤이 우리 집일 텐데.', '바다가 진짜 파랗다.', '구름이 솜사탕 같아.'],
  moon: ['토끼는 어디 있지?', '달은 늘 같은 얼굴만 보여 줘.'],
  mars: ['저 큰 산이 올림푸스래.', '화성 하늘은 분홍빛이래.'],
  jupiter: ['줄무늬가 살살 움직여.', '목성엔 지구가 천삼백 개 들어간대.'],
  io: ['화산이 지금도 뿜고 있어.', '달걀노른자 색이야.'],
  europa: ['얼음 밑에 바다가 있대.', '금이 실처럼 가 있어.'],
  saturn: ['고리가 레코드판 같아.', '토성은 물에 뜰 만큼 가볍대.'],
  titan: ['주황 안개 속에 호수가 있대.', '여기선 팔만 저어도 날겠어.'],
  uranus: ['옆으로 누워서 도는 별이야.', '색이 박하사탕 같아.'],
  neptune: ['바람이 소리보다 빠르대.', '여기까지 햇빛이 네 시간 걸려.'],
  pluto: ['하트가 진짜 있네.', '작아도 달이 다섯이나 돼.'],
};
// Far from every world (DEEP_FROM_KM from the nearest ground, or more).
export const DEEP_FROM_KM = 2e6;
export const DEEP = ['사방이 다 별이야.', '여긴 아무것도 없어. 넓다.', '내 숨소리만 들려.'];

// What she says about what she does: looking behind, saving a photo, arriving by a
// jump, docking with a craft, and the first time she passes each speed (in c).
export const REAR = ['뒤에 누가 따라오나?', '지나온 길이 저기 있네.', '뒤도 예쁘다.'];
export const PHOTO = ['찰칵! 잘 나왔다.', '이건 액자에 넣어야지.', '한 장 더 찍을까.', '할머니 보여 드려야지.'];
export const JUMP = ['눈 깜빡하니 여기야.', '휙! 머리가 헝클어졌어.', '순간 이동은 늘 신기해.'];
export const DOCK = ['같이 가자. 옆자리 비었지?', '얌전히 붙어 있을게.', '안녕, 오래 혼자였지?'];
export const FAST = { 1: '빛보다 빨라! 모자 꽉 잡아.', 10: '별이 줄줄 흘러가.', 50: '너무 빠른가? 그래도 신나.' };

// The speed line for going from `before` to `after` (both in c), or null.
export function fastLine(before, after) {
  const hit = Object.keys(FAST).map(Number).find((c) => before < c && after >= c);
  return hit ? FAST[hit] : null;
}

// What she says when a sight is pointed out (the ids of core/glows.js, with 'meteor'
// and 'belt'): under the notice that explains it, her own word.
export const SIGHTS = {
  'aurora:earth': '오로라다! 커튼이 펄럭여.',
  'aurora:jupiter': '목성 오로라는 보랏빛이네.',
  'aurora:saturn': '토성에도 오로라가 있구나.',
  'plume:triton': '검은 연기가 옆으로 누웠어.',
  sprite: '방금 빨간 거 봤어?',
  'clouds:earth': '밤에 빛나는 구름이야.',
  'footprint:io': '이오가 발자국을 찍었네.',
  'spokes:saturn': '고리에 바큇살이 생겼어.',
  'spot:neptune': '검은 눈이 날 보는 것 같아.',
  'tail:mercury': '수성에도 꼬리가 있었어?',
  'jets:halley': '혜성이 숨을 내쉬어.',
  'plume:io': '화산이 우산처럼 퍼져.',
  'plume:enceladus': '얼음 분수다! 반짝반짝해.',
  impact: '달에 뭐가 떨어졌나 봐.',
  'lightning:earth': '번쩍! 저 밑엔 비 오겠다.',
  lightning: '목성 번개는 크기도 하지.',
  'airglow:earth': '초록 실을 두른 것 같아.',
  'hexagon:saturn': '구름이 육각형이야. 누가 그렸지?',
  'backlit:saturn': '고리가 뒤에서 빛나. 예쁘다.',
  'haze:titan': '주황 반지를 꼈네.',
  'haze:pluto': '파란 테두리가 생겼어.',
  'haze:mars': '화성 노을은 파랗구나.',
  'shine:moon': '달 그늘이 푸르스름해.',
  counterglow: '저기 희미한 빛, 보여?',
  'aurora:uranus': '천왕성 오로라는 삐딱하네.',
  'rings:uranus': '실처럼 가는 고리야.',
  'geyser:mars': '얼음에서 검은 김이 나.',
  'ashen:venus': '금성 밤은 숯불 같아.',
  'lightning:venus': '금성에서도 번쩍했어.',
  'horizon:moon': '달 끝에 빛줄이 섰어.',
  tailcut: '꼬리가 뚝 끊어졌어.',
  'transit:venus': '해 위에 까만 점이 지나가.',
  'transit:mercury': '저 작은 점이 수성이야?',
  meteor: '별똥별! 소원 빌었어.',
  belt: '돌멩이 밭이다. 살살 가자.',
};

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
