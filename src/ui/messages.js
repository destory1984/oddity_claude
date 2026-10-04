import { FACTS } from '../core/facts.js';
import { BODY_DATA } from '../core/bodies.js';
import { SHADOW_CASTERS, shadowEdge } from '../core/shadows.js';

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

function hasFinalConsonant(word) {
  const code = word.charCodeAt(word.length - 1);
  if (code < HANGUL_START || code > HANGUL_END) return true;
  return (code - HANGUL_START) % 28 !== 0;
}

export function objectParticle(word) {
  return hasFinalConsonant(word) ? '을' : '를';
}

export function withParticle(word) {
  return hasFinalConsonant(word) ? '과' : '와';
}

export function subjectParticle(word) {
  return hasFinalConsonant(word) ? '이' : '가';
}

// 로 after a vowel or ㄹ, 으로 after any other final consonant.
export function towardParticle(word) {
  const code = word.charCodeAt(word.length - 1);
  const final = code >= HANGUL_START && code <= HANGUL_END ? (code - HANGUL_START) % 28 : 0;
  return final === 0 || final === 8 ? '로' : '으로';
}

// A name on screen with its mark: ✓ once it is in the journal, ○ until then.
export function markedName(name, known) {
  return `${known ? '✓' : '○'} ${name}`;
}

const nameOf = (bodies, id) => bodies.find((b) => b.id === id)?.name ?? id;

export function eventMessage(event, bodies = []) {
  switch (event.type) {
    case 'surfaceReached':
      return '천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.';
    case 'discovered': {
      // The fact goes on its own line (the toast keeps line breaks).
      const fact = FACTS[event.bodyId];
      return `새 천체 발견: ${nameOf(bodies, event.bodyId)}${fact ? `\n${fact}` : ''}`;
    }
    case 'landed':
      return `착지 기록: ${nameOf(bodies, event.bodyId)}. 수첩에 남겼습니다.`;
    case 'photo':
      return `사진 임무 달성: ${event.missionName}`;
    case 'story':
      return `이야기 장소: ${event.name}\n${event.text}`;
    case 'docking':
      return `${event.name}에 도킹 중입니다. 0에 맞춰 붙습니다.`;
    case 'teleported':
      return `${event.name}${towardParticle(event.name)} 순간 이동했습니다.`;
    // Going down to stand beside a place on a surface (core/visit.js).
    case 'visiting':
      return `${event.name}에 착륙합니다. 0에 맞춰 내려섭니다.`;
    case 'visited':
      return `${event.name} 곁에 내려섰습니다. 전진이나 후진을 누르면 떠납니다.`;
    case 'dockRefused':
      return `${event.name}${hasFinalConsonant(event.name) ? '은' : '는'} 지표면과 너무 가까워 도킹할 수 없습니다.`;
    case 'dockAborted':
      return `${event.name} 도킹을 그만두었습니다.`;
    case 'docked':
      return `${event.name}${withParticle(event.name)} 도킹했습니다. 이제 함께 날아갑니다. 전진이나 후진을 누르면 떨어집니다.`;
    case 'undocked':
      return `${event.name}${withParticle(event.name)} 도킹을 풀었습니다.`;
    case 'meteor':
      return '지구의 밤 쪽에 별똥별이 떨어집니다. 혜성이 흘린 부스러기가 대기에서 타는 빛입니다.';
    // Why the sprite character shivers or shields her eyes (core/sprite.js).
    case 'coldFar': {
      const au = Math.round(event.au);
      return `춥습니다. 태양에서 ${au}AU 떨어진 이곳의 햇빛은 지구의 ${(au * au).toLocaleString('en-US')}분의 1입니다.`;
    }
    case 'coldShadow':
      return '춥습니다. 그림자 속이라 햇빛이 들지 않습니다.';
    case 'tooBright':
      return '눈이 부십니다. 태양 표면에서 20만km 안에 들어와 있습니다.';
    case 'hot':
      return `덥습니다. 태양에서 ${event.au.toFixed(1)}AU 떨어진 이곳의 햇빛은 지구의 ${(1 / (event.au * event.au)).toFixed(1)}배입니다.`;
    // Lights and plumes (core/glows.js), each told once.
    case 'glow':
      if (event.id.startsWith('shadow:')) return shadowMessage(event.id.slice(7));
      return {
        'aurora:earth': '지구의 두 극 둘레에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n태양에서 날아온 입자가 100km 위 공기를 때려 내는 빛입니다.',
        'aurora:jupiter': '목성의 두 극에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n지구 오로라보다 수백 배 세고, 위성 이오가 뿜은 입자도 보탭니다.',
        'airglow:earth': '지구의 밤 쪽 가장자리에 가는 초록 띠가 둘려 있습니다. 대기광입니다.\n낮 동안 햇빛에 쪼개진 산소가 95km 높이에서 다시 뭉치며 내는 빛입니다. 우주정거장 사진마다 찍힙니다.',
        'hexagon:saturn': '토성의 북극에 여섯 모 난 구름 띠가 있습니다.\n한 변이 지구보다 긴 제트 기류입니다. 1981년 보이저가 찾았고, 카시니가 돌아올 때까지 그대로였습니다.',
        'backlit:saturn': '해를 등진 토성의 고리가 뒤에서 빛을 받아 빛납니다.\n짙은 B 고리는 어둡고, 엷은 고리와 틈새가 오히려 밝습니다. 카시니가 토성의 그림자 속에서 찍은 모습입니다.',
        'haze:titan': '해를 등진 타이탄의 둘레에 주황빛 고리가 떴습니다.\n질소와 메탄의 안개가 수백 km 높이까지 겹겹이 쌓여 햇빛을 흩뜨립니다.',
        'haze:pluto': '해를 등진 명왕성의 둘레에 푸른 고리가 떴습니다.\n2015년 뉴허라이즌스가 지나가며 뒤돌아 찍은 안개층입니다. 스무 겹쯤 됩니다.',
        'haze:mars': '해를 등진 화성의 가장자리가 푸르게 빛납니다.\n화성의 먼지는 푸른빛을 앞쪽으로 흩뜨립니다. 그래서 화성의 노을은 해 둘레만 파랗습니다.',
        'shine:moon': '달의 밤 쪽이 어슴푸레 푸르게 보입니다. 지구가 되비춘 빛, 지구조입니다.\n달에서 본 보름 지구는 보름달보다 40배쯤 밝습니다. 다 빈치가 1510년쯤 그 까닭을 적었습니다.',
        counterglow: '해 정반대편 하늘에 희미한 빛 얼룩이 있습니다. 대일조입니다.\n행성 사이의 먼지가 햇빛을 곧장 되돌려 보내는 자리입니다. 지구에서는 아주 어두운 밤에만 보입니다.',
        'aurora:saturn': '토성의 두 극에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n카시니가 찍은 사진에서 아래는 붉고 위는 보랏빛이었습니다. 수소가 내는 빛입니다.',
        'plume:triton': '트리톤의 남반구에서 검은 기둥이 솟고 있습니다.\n1989년 보이저 2호가 본 분출입니다. 8km까지 올라가 바람을 타고 100km 넘게 옆으로 흐릅니다.',
        sprite: '번개 위로 붉은 빛기둥이 솟았습니다. 스프라이트입니다.\n구름 위 50 → 90km 높이에서 눈 깜짝할 사이에 번쩍이는 방전으로, 우주정거장에서도 찍혔습니다.',
        'clouds:earth': '지구 북극 둘레, 낮과 밤의 경계에 푸르스름한 구름이 걸려 있습니다. 야광운입니다.\n80km 높이에 뜨는 가장 높은 구름입니다. 땅은 어두워도 그 높이에는 아직 햇빛이 닿아 빛납니다.',
        'footprint:io': '목성의 오로라 띠 안쪽에 밝은 점이 따로 떠 있습니다. 이오의 발자국입니다.\n이오와 목성을 잇는 자기력선을 따라 전류가 흐르는 자리로, 이오가 도는 대로 따라 돕니다.',
        'spokes:saturn': '토성의 밝은 고리 위에 어두운 살 무늬가 가로질러 있습니다.\n1980년 보이저 1호가 찾은 스포크입니다. 고리 위로 뜬 먼지가 토성의 자기장을 따라 도는 것으로 봅니다.',
        'spot:neptune': '해왕성 남반구에 검푸른 소용돌이가 있습니다. 대흑점입니다.\n1989년 보이저 2호가 본 지구만 한 폭풍이고, 둘레의 흰 구름은 얼어붙은 메탄입니다. 1994년 허블이 다시 보았을 때는 사라지고 없었습니다.',
        'tail:mercury': '수성 뒤로 누런 꼬리가 뻗어 있습니다. 태양 반대쪽입니다.\n햇빛에 밀려 나간 나트륨 원자가 내는 빛으로, 실제 길이는 수백만 km를 넘습니다.',
        'jets:halley': '핼리 혜성의 핵에서 가스와 먼지가 줄기로 뿜어 나옵니다. 햇빛을 받는 쪽입니다.\n1986년 탐사선 지오토가 596km까지 다가가 이 분출을 찍었습니다.',
        'plume:io': '이오의 화산이 가스를 뿜고 있습니다.\n펠레 화산의 분출은 높이 300km를 넘습니다. 이오는 태양계에서 화산 활동이 가장 활발합니다.',
        'plume:enceladus': '엔셀라두스의 남극에서 얼음 알갱이가 솟고 있습니다.\n얼음 껍질 아래 바다에서 나온 물이고, 토성의 E 고리를 이룹니다.',
        impact: '달의 밤 쪽에서 작은 빛이 번쩍입니다.\n달에는 공기가 없어 별똥별이 타지 않고, 그대로 땅에 부딪히며 빛을 냅니다.',
        'lightning:earth': '지구의 밤 쪽 구름 속에서 번개가 번쩍입니다.\n지구에서는 1초에 40번 넘게 번개가 칩니다.',
        lightning: '목성의 밤 쪽 구름에서 번개가 칩니다.\n지구의 번개보다 몇 배 밝습니다.',
      }[event.id] ?? null;
    case 'beltEntered':
      return '소행성대에 들어섰습니다.\n실제로는 소행성 사이가 평균 100만km쯤 떨어져 있습니다.';
    default:
      return null;
  }
}

// The game clock's date in today's-sky mode, in the player's own time zone.
export function dateText(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

// How far away something is, short enough for a label: km up to 10,000, then 만 (ten
// thousands), then 억 (hundred millions).
export function distanceText(km) {
  if (km < 1e4) return `${Math.round(km).toLocaleString('ko-KR')}km`;
  if (km < 999950) return `${(km / 1e4).toFixed(1)}만km`;
  if (km < 1e8) return `${Math.round(km / 1e4).toLocaleString('ko-KR')}만km`;
  return `${(km / 1e8).toFixed(1)}억km`;
}

// The live speed limit as a multiple of light speed.
export function limitText(ratio) {
  if (ratio < 1) return `${ratio.toFixed(2)}c`;
  if (ratio < 10) return `${ratio.toFixed(1)}c`;
  return `${Math.round(ratio)}c`;
}

// A moon's shadow on its planet (core/shadows.js), or null for a moon that casts none.
function shadowMessage(moonId) {
  const moon = BODY_DATA.find((b) => b.id === moonId);
  const planet = moon && BODY_DATA.find((b) => b.id === moon.parent);
  if (!planet || !SHADOW_CASTERS[planet.id]?.includes(moonId)) return null;
  if (shadowEdge(moonId).depth < 1) {
    return `${planet.name} 땅 위로 흐릿한 얼룩이 지나갑니다. 위성 ${moon.name}의 그림자입니다.
${moon.name}는 작아서 해를 다 가리지 못합니다. 화성의 탐사차들이 해 앞을 지나는 ${moon.name}를 여러 번 찍었습니다.`;
  }
  return `${planet.name} 구름 위로 검은 점이 지나갑니다. 위성 ${moon.name}의 그림자입니다.
그 점 안에 서면 해가 ${moon.name}에 가려 보이지 않습니다. 일식입니다.`;
}
