import { t } from './i18n.js';
// What Sora says to herself on the way (docs/재미-기획서.md 3.2): one line in the speech
// bubble, 반말, 25 characters at most, one exclamation at most. Her lines on finding a
// body are in core/story.js MEMOS and those at a tour's stops in core/tours.js. Numbers
// equal core/facts.js.

// On the first landing on each body (the gas planets: on touching the cloud tops).
export const LANDED = {
  sun: t('앗 뜨거! 발 데겠어.'),
  mercury: t('낮엔 430도래. 그늘로 가자.'),
  venus: t('여기선 납도 녹는대.'),
  earth: t('집에 왔다! 흙냄새 좋아.'),
  moon: t('폴짝! 몸이 엄청 가벼워.'),
  mars: t('온통 붉은 흙이야. 녹슬었대.'),
  phobos: t('세게 뛰면 날아가겠어.'),
  deimos: t('여기선 화성이 엄청 커.'),
  jupiter: t('땅이 없어! 구름뿐이야.'),
  io: t('바닥이 노래. 유황이래.'),
  europa: t('얼음 위야. 밑에서 물소리 나?'),
  ganymede: t('얼음이랑 바위가 섞였어.'),
  callisto: t('구덩이 안에 또 구덩이야.'),
  saturn: t('여기도 구름뿐. 둥둥 떠 있어.'),
  titan: t('메탄 비가 와. 우산 없는데!'),
  rhea: t('온통 얼음이야. 미끄러워.'),
  iapetus: t('까만 쪽에 내렸어. 숯 같아.'),
  dione: t('하얀 절벽이 줄줄이 있어.'),
  tethys: t('빙수 위에 선 기분이야.'),
  enceladus: t('눈이 폴폴 내려. 분수에서 왔대.'),
  mimas: t('큰 구덩이 가장자리야.'),
  uranus: t('푸른 구름 위야. 춥다.'),
  miranda: t('절벽이 20km래. 내려다보지 마.'),
  ariel: t('골짜기가 길게 나 있어.'),
  umbriel: t('어둑어둑해. 손전등 줘.'),
  titania: t('금 간 얼음이 끝도 없어.'),
  oberon: t('구덩이 바닥이 까매.'),
  neptune: t('바람이 세! 날아가겠어.'),
  triton: t('발이 시려. 영하 235도래.'),
  ceres: t('하얀 소금밭이 반짝여.'),
  pluto: t('하트 위에 섰어. 질소 얼음이래.'),
  charon: t('명왕성이 하늘에 딱 붙어 있어.'),
  halley: t('혜성 위야! 작은 감자 같아.'),
  haleBopp: t('얼음 먼지가 폴폴 날려.'),
  churyumov: t('필레처럼 통통 튈 뻔했어.'),
};

// Coasting a long while with nothing to do. She is never in a hurry.
export const IDLE = [
  t('심심한데 노래나 부를까.'),
  t('별이 참 많다. 다 못 세겠어.'),
  t('할머니는 지금 뭐 하실까.'),
  t('배고프다. 간식 싸 올걸.'),
  t('우주는 왜 이렇게 조용해?'),
  t('가만있어도 가네. 편하다.'),
  t('저 별엔 누가 살까?'),
  t('하암, 조금만 졸까.'),
  t('수첩 어디까지 채웠더라.'),
  t('집에 가면 다 얘기해 줘야지.'),
  t('멀리 왔다. 그래도 안 무서워.'),
  t('다음엔 어디 갈까.'),
  // Eighteen more (the user, 2026-10-04: "소라가 말이 별로 없는 편이잖아. 좀 더 많은 대화를 하게 해줘").
  t('발끝에 별이 걸릴 것 같아.'),
  t('숨 한번 크게 쉬고.'),
  t('이 고요함, 나쁘지 않네.'),
  t('엄마는 내가 어디 있는지 알까.'),
  t('모자 날아갈 뻔했어.'),
  t('어제 본 별이 저 별인가.'),
  t('손 흔들면 누가 볼까?'),
  t('한 바퀴 빙 돌아 볼까.'),
  t('주머니에 사탕 하나 남았다.'),
  t('별똥별 보면 소원 빌어야지.'),
  t('우주에도 냄새가 있을까.'),
  t('빛이 여기까지 몇 분 걸렸을까.'),
  t('지구는 지금 낮일까 밤일까.'),
  t('오늘 본 것 중에 뭐가 제일이지.'),
  t('망토에 별가루 묻었네.'),
  t('할머니도 이 길로 왔을까.'),
  t('노래 한 곡만 더 듣고 가자.'),
  t('천천히 가도 돼. 급할 것 없어.'),
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
  sun: [t('눈부셔! 손차양 해야겠다.'), t('해는 지구 백구 개가 늘어선 크기래.')],
  mercury: [t('해가 엄청 크게 보여.'), t('수성의 하루는 일 년보다 길대.')],
  venus: [t('구름이 두꺼워서 땅이 안 보여.'), t('금성은 거꾸로 돈대. 신기해.')],
  earth: [t('저기 어디쯤이 우리 집일 텐데.'), t('바다가 진짜 파랗다.'), t('구름이 솜사탕 같아.')],
  moon: [t('토끼는 어디 있지?'), t('달은 늘 같은 얼굴만 보여 줘.')],
  mars: [t('저 큰 산이 올림푸스래.'), t('화성 하늘은 분홍빛이래.')],
  jupiter: [t('줄무늬가 살살 움직여.'), t('목성엔 지구가 천삼백 개 들어간대.')],
  io: [t('화산이 지금도 뿜고 있어.'), t('달걀노른자 색이야.')],
  europa: [t('얼음 밑에 바다가 있대.'), t('금이 실처럼 가 있어.')],
  saturn: [t('고리가 레코드판 같아.'), t('토성은 물에 뜰 만큼 가볍대.')],
  titan: [t('주황 안개 속에 호수가 있대.'), t('여기선 팔만 저어도 날겠어.')],
  uranus: [t('옆으로 누워서 도는 별이야.'), t('색이 박하사탕 같아.')],
  neptune: [t('바람이 소리보다 빠르대.'), t('여기까지 햇빛이 네 시간 걸려.')],
  pluto: [t('하트가 진짜 있네.'), t('작아도 달이 다섯이나 돼.')],
};
// Far from every world (DEEP_FROM_KM from the nearest ground, or more).
export const DEEP_FROM_KM = 2e6;
export const DEEP = [t('사방이 다 별이야.'), t('여긴 아무것도 없어. 넓다.'), t('내 숨소리만 들려.')];

// What she says about what she does: looking behind, saving a photo, arriving by a
// jump, docking with a craft, and the first time she passes each speed (in c).
export const REAR = [t('뒤에 누가 따라오나?'), t('지나온 길이 저기 있네.'), t('뒤도 예쁘다.')];
export const PHOTO = [t('찰칵! 잘 나왔다.'), t('이건 액자에 넣어야지.'), t('한 장 더 찍을까.'), t('할머니 보여 드려야지.')];
export const JUMP = [t('눈 깜빡하니 여기야.'), t('휙! 머리가 헝클어졌어.'), t('순간 이동은 늘 신기해.')];
export const DOCK = [t('같이 가자. 옆자리 비었지?'), t('얌전히 붙어 있을게.'), t('안녕, 오래 혼자였지?')];
export const FAST = { 1: t('빛보다 빨라! 모자 꽉 잡아.'), 10: t('별이 줄줄 흘러가.'), 50: t('너무 빠른가? 그래도 신나.') };

// The speed line for going from `before` to `after` (both in c), or null.
export function fastLine(before, after) {
  const hit = Object.keys(FAST).map(Number).find((c) => before < c && after >= c);
  return hit ? FAST[hit] : null;
}

// What she says when a sight is pointed out (the ids of core/glows.js, with 'meteor'
// and 'belt'): under the notice that explains it, her own word.
export const SIGHTS = {
  'aurora:earth': t('오로라다! 커튼이 펄럭여.'),
  'aurora:jupiter': t('목성 오로라는 보랏빛이네.'),
  'aurora:saturn': t('토성에도 오로라가 있구나.'),
  'plume:triton': t('검은 연기가 옆으로 누웠어.'),
  sprite: t('방금 빨간 거 봤어?'),
  'anvils:earth': t('구름 꼭대기만 노을빛이야.'),
  'shiptracks:earth': t('구름에 누가 줄을 그었네.'),
  'honeycomb:earth': t('구름이 벌집 같아.'),
  'glory:earth': t('내 둘레에 무지개 고리가 생겼어!'),
  elves: t('방금 빨간 고리 봤어?'),
  bluejet: t('번개가 위로 올라갔어!'),
  'clouds:earth': t('밤에 빛나는 구름이야.'),
  'footprint:io': t('이오가 발자국을 찍었네.'),
  'spokes:saturn': t('고리에 바큇살이 생겼어.'),
  'spot:neptune': t('검은 눈이 날 보는 것 같아.'),
  'tail:mercury': t('수성에도 꼬리가 있었어?'),
  'jets:halley': t('혜성이 숨을 내쉬어.'),
  'plume:io': t('화산이 우산처럼 퍼져.'),
  'plume:enceladus': t('얼음 분수다! 반짝반짝해.'),
  impact: t('달에 뭐가 떨어졌나 봐.'),
  'lightning:earth': t('번쩍! 저 밑엔 비 오겠다.'),
  lightning: t('목성 번개는 크기도 하지.'),
  'airglow:earth': t('초록 실을 두른 것 같아.'),
  'storm:earth': t('오로라 끝이 빨개졌어!'),
  'steve:earth': t('보라색 리본이 따로 떴네.'),
  'pearl:earth': t('구름이 자개처럼 반짝여.'),
  'pulse:earth': t('초록 불이 깜박깜박해.'),
  'hexagon:saturn': t('구름이 육각형이야. 누가 그렸지?'),
  'backlit:saturn': t('고리가 뒤에서 빛나. 예쁘다.'),
  'haze:titan': t('주황 반지를 꼈네.'),
  'haze:pluto': t('파란 테두리가 생겼어.'),
  'haze:mars': t('화성 노을은 파랗구나.'),
  'shine:moon': t('달 그늘이 푸르스름해.'),
  counterglow: t('저기 희미한 빛, 보여?'),
  'ering:saturn': t('분수가 고리를 만들었대.'),
  'flare:sun': t('해가 재채기를 했어.'),
  'flow:jupiter': t('띠마다 따로 흘러가네.'),
  'tracks:mars': t('누가 땅에 낙서했어?'),
  'aurora:uranus': t('천왕성 오로라는 삐딱하네.'),
  'rings:uranus': t('실처럼 가는 고리야.'),
  'typhoon:earth': t('태풍의 눈이 보여!'),
  'boats:earth': t('바다 위에 별밭이 생겼네.'),
  'ash:earth': t('화산이 연기를 뿜어.'),
  shower: t('별똥별이 쏟아진다!'),
  'rain:saturn': t('고리에서 비가 내려!'),
  'lava:io': t('빨간 불이 숨을 쉬어.'),
  'devils:mars': t('회오리가 걸어간다!'),
  'methane:titan': t('저 구름은 메탄이래.'),
  'hood:uranus': t('하얀 모자를 썼네.'),
  'thread:jupiter': t('목성에도 고리가 있었네!'),
  'geyser:mars': t('얼음에서 검은 김이 나.'),
  'ashen:venus': t('금성 밤은 숯불 같아.'),
  'lightning:venus': t('금성에서도 번쩍했어.'),
  'horizon:moon': t('달 끝에 빛줄이 섰어.'),
  tailcut: t('꼬리가 뚝 끊어졌어.'),
  'transit:venus': t('해 위에 까만 점이 지나가.'),
  'transit:mercury': t('저 작은 점이 수성이야?'),
  meteor: t('별똥별! 소원 빌었어.'),
  belt: t('돌멩이 밭이다. 살살 가자.'),
};

// Standing again beside a place already in the journal.
export const AGAIN = [
  t('또 왔네. 여기 좋지?'),
  t('여기 올 때마다 새로워.'),
  t('안녕, 나 또 왔어.'),
  t('저번이랑 똑같네. 다행이다.'),
  t('여긴 벌써 외웠어.'),
  t('단골이 됐네.'),
  t('또 봐도 멋있어.'),
  t('할머니한테 또 얘기해야지.'),
];

// On filling this many slots of the journal (40 and 100 bring a note from grandmother
// instead, core/story.js).
export const MILESTONES = {
  80: t('여든 칸! 연필이 닳겠어.'),
  120: t('백스무 칸. 절반 넘었어!'),
  160: t('백예순 칸! 거의 다 왔어.'),
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

// Earth's weather she explains herself (the user, 2026-10-07: "지구의 기상현상을 근거리에서
// 보면, 하루에 한 번은 소라가 설명해주는 것도 넣어", then of three ways offered: "2"): after
// her own word (SIGHTS) come these two lines, one after the other, in place of the notice.
export const SIGHT_TELLS = {
  'anvils:earth': [t('높이 솟은 번개 구름의 머리야.'), t('땅은 저물어도 저기는 아직 해가 닿아.')],
  'shiptracks:earth': [t('배가 지나간 자국이야.'), t('배 연기에 물방울이 맺혀 더 하얘진대.')],
  'honeycomb:earth': [t('찬 바다 위에서 공기가 오르내려서 그래.'), t('오르는 데는 구름, 내리는 데는 맑아.')],
  'glory:earth': [t('해를 등지고 구름을 보면 생겨.'), t('비행기 창밖으로도 볼 수 있대.')],
  elves: [t('번개 한참 위 하늘에서 퍼진 빛이야.'), t('눈 깜짝할 새보다 빨리 사라져.')],
  bluejet: [t('번개가 하늘 쪽으로 친 거야.'), t('구름 위로 40km까지 올라간대.')],
};
