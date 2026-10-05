import { t } from './i18n.js';
// Days played again at a craft, not at a place: while she is docked with it, the same
// "그날로" button plays them (the user, 2026-10-06: "제임스웹은 렌즈 펼치고, 가림막
// 펼치는게, 빅이벤트 아니었나? 그것도 만들어줘").
//
// Such a scene is an `unfold`: for every moment, how far each of the craft's moving
// parts has come, 0 (folded, as it left) → 1 (as it flies now). render/craftModels.js
// builds the craft with those parts loose (CRAFT_UNFOLD) and render/craft.js shows that
// one in place of the craft while the scene runs.

const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (t, from, to) => {
  const u = clamp((t - from) / (to - from));
  return u * u * (3 - 2 * u);
};

export const CRAFT_SCENES = {
  // Webb left folded to fit inside its rocket and opened itself over two weeks on the
  // way to L2, in this order: the two pallets that carry the sunshield go down (28
  // December 2021), the tower lifts the telescope clear (29th), the two side booms pull
  // the shield out into a kite (31st), its five layers are drawn tight (3 and 4 January
  // 2022), the secondary mirror's three legs swing out (5th), and the two wings of the
  // main mirror latch (7th and 8th). Drawn as seconds.
  jwst: {
    name: t('웹이 펼쳐지다'),
    day: t('2022년 1월 8일'),
    seconds: 44,
    downAt: 37,
    sounds: [[7, 'roll'], [10.5, 'roll'], [14, 'roll'], [17.5, 'roll'], [21, 'roll'], [24.5, 'roll'], [28, 'roll'], [31, 'roll'], [34, 'clunk'], [34.1, 'roll'], [37, 'clunk'], [37.5, 'stood']],
    lines: [
      { at: 0, text: t('2021년 12월 25일, 웹은 로켓에 들어가도록 종이접기처럼 접힌 채 떠났습니다. 가는 길에 스스로 펼쳐야 합니다.') },
      { at: 7, text: t('사흘 뒤, 햇빛 가리개를 실은 앞뒤 받침대가 내려갑니다. 이어 망원경을 받친 탑이 1.2m 솟습니다.') },
      { at: 14, text: t('양옆으로 팔이 뻗어 나가며 가리개를 연 모양으로 펼칩니다. 테니스장만 한 넓이입니다.') },
      { at: 21, text: t('머리카락만큼 얇은 막 다섯 겹을 한 겹씩 팽팽하게 당깁니다. 겹과 겹 사이로 열이 빠져나갑니다.') },
      { at: 28, text: t('보조 거울을 받친 세 다리가 펴집니다. 이어 접혀 있던 주거울의 양 날개가 차례로 제자리에 잠깁니다.') },
      { at: 37, text: t('2022년 1월 8일, 다 펼쳤습니다. 하나만 어긋나도 끝인 곳이 344군데였지만 모두 제대로 움직였습니다.') },
    ],
    unfold(t) {
      return {
        pallets: ease(t, 7, 11.5),
        tower: ease(t, 11.5, 14),
        booms: ease(t, 14, 20.5),
        // The layers part one after another: 0 → 1 is all five.
        tension: ease(t, 21, 27.5),
        secondary: ease(t, 28, 31),
        wingLeft: ease(t, 31, 34),
        wingRight: ease(t, 34, 37),
      };
    },
  },
};
