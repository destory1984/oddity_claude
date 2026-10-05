import { FACTS } from '../core/facts.js';
import { BODY_DATA } from '../core/bodies.js';
import { SHADOW_CASTERS, shadowEdge } from '../core/shadows.js';
import { t, english, englishKm, counted } from '../core/i18n.js';

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
      return t('천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.');
    case 'discovered': {
      // The fact goes on its own line (the toast keeps line breaks).
      const fact = FACTS[event.bodyId];
      return t`새 천체 발견: ${nameOf(bodies, event.bodyId)}${fact ? `\n${fact}` : ''}`;
    }
    case 'landed':
      return t`착지 기록: ${nameOf(bodies, event.bodyId)}. 수첩에 남겼습니다.`;
    case 'photo':
      return t`사진 임무 달성: ${event.missionName}`;
    case 'story':
      return t`이야기 장소: ${event.name}\n${event.text}`;
    case 'docking':
      return t`${event.name}에 도킹 중입니다. 0에 맞춰 붙습니다.`;
    case 'teleported':
      return t`${event.name}${towardParticle(event.name)} 순간 이동했습니다.`;
    // Going down to stand beside a place on a surface (core/visit.js).
    case 'visiting':
      return t`${event.name}에 착륙합니다. 0에 맞춰 내려섭니다.`;
    case 'visited':
      return t`${event.name} 곁에 내려섰습니다. 전진이나 후진을 누르면 떠납니다.`;
    case 'dockRefused':
      return t`${event.name}${hasFinalConsonant(event.name) ? '은' : '는'} 지표면과 너무 가까워 도킹할 수 없습니다.`;
    case 'dockAborted':
      return t`${event.name} 도킹을 그만두었습니다.`;
    case 'docked':
      return t`${event.name}${withParticle(event.name)} 도킹했습니다. 이제 함께 날아갑니다. 전진이나 후진을 누르면 떨어집니다.`;
    case 'undocked':
      return t`${event.name}${withParticle(event.name)} 도킹을 풀었습니다.`;
    case 'shower':
      return t('지구의 밤 쪽에 별똥별이 쏟아집니다. 유성우입니다.\n혜성이 지나간 길을 지구가 가로지를 때 생깁니다. 별똥별이 모두 한 점에서 퍼져 나오는 듯 보입니다.');
    case 'meteor':
      return t('지구의 밤 쪽에 별똥별이 떨어집니다. 혜성이 흘린 부스러기가 대기에서 타는 빛입니다.');
    // Why the sprite character shivers or shields her eyes (core/sprite.js).
    case 'coldFar': {
      const au = Math.round(event.au);
      return t`춥습니다. 태양에서 ${au}AU 떨어진 이곳의 햇빛은 지구의 ${(au * au).toLocaleString('en-US')}분의 1입니다.`;
    }
    case 'coldShadow':
      return t('춥습니다. 그림자 속이라 햇빛이 들지 않습니다.');
    case 'tooBright':
      return t('눈이 부십니다. 태양 표면에서 20만km 안에 들어와 있습니다.');
    case 'hot':
      return t`덥습니다. 태양에서 ${event.au.toFixed(1)}AU 떨어진 이곳의 햇빛은 지구의 ${(1 / (event.au * event.au)).toFixed(1)}배입니다.`;
    // Lights and plumes (core/glows.js), each told once.
    case 'glow':
      if (event.id.startsWith('shadow:')) return shadowMessage(event.id.slice(7));
      return {
        'aurora:earth': t('지구의 두 극 둘레에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n태양에서 날아온 입자가 100km 위 공기를 때려 내는 빛입니다.'),
        'aurora:jupiter': t('목성의 두 극에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n지구 오로라보다 수백 배 세고, 위성 이오가 뿜은 입자도 보탭니다.'),
        'ering:saturn': t('엔셀라두스가 지나는 길을 따라 푸르스름한 안개 고리가 있습니다. E 고리입니다.\n엔셀라두스의 분수에서 나온 얼음 알갱이가 토성 둘레에 퍼진 것입니다. 해를 등지고 보면 더 또렷합니다.'),
        'flare:sun': t('해 가장자리에서 가끔 빛이 번쩍하고 가스 구름이 부풀어 떠납니다. 플레어와 코로나 물질 방출입니다.\n그 구름이 지구에 닿으면 오로라가 짙어집니다. 1859년에는 전신줄에 불꽃이 튀었습니다.'),
        'flow:jupiter': t('목성의 줄무늬는 띠마다 다른 빠르기로 흐릅니다.\n밝은 대와 어두운 띠 사이로 시속 수백 km의 바람이 서로 반대로 붑니다. 대적점은 350년 넘게 그 사이를 구릅니다.'),
        'tracks:mars': t('화성 땅에 검은 줄이 구불구불 나 있습니다. 먼지 회오리가 지나간 자국입니다.\n회오리가 밝은 먼지를 걷어 내면 밑의 어두운 땅이 드러납니다. 몇 달이면 다시 덮입니다.'),
        'aurora:uranus': t('천왕성에도 오로라가 있습니다. 밤 쪽에서 보입니다.\n자기장이 자전축에서 59도나 기울어 있어 극이 아닌 엉뚱한 곳에 뜹니다. 2011년 허블이 처음 찍었습니다.'),
        'rain:saturn': t('토성의 중위도 구름 위로 가는 빛줄이 내립니다. 고리의 비입니다.\n고리의 얼음이 자기장을 따라 토성으로 떨어집니다. 30분마다 올림픽 수영장 하나를 채울 만큼입니다.'),
        'lava:io': t('이오의 밤 쪽에 붉은 점들이 숨 쉬듯 빛납니다. 용암 호수입니다.\n가장 큰 로키 파테라는 너비가 200km입니다. 식은 겉이 가라앉을 때마다 다시 밝아집니다.'),
        'devils:mars': t('화성 땅 위로 먼지 회오리가 걸어갑니다.\n낮에 땅이 데워지면 생기고 높이가 8km에 이르기도 합니다. 탐사차의 태양 전지판을 닦아 준 적도 있습니다.'),
        'methane:titan': t('타이탄의 안개 아래로 흰 구름이 흘러갑니다. 메탄 구름입니다.\n타이탄에서는 메탄이 비로 내려 강과 호수를 이룹니다. 지구 말고 땅에 비가 고이는 곳은 여기뿐입니다.'),
        'hood:uranus': t('천왕성의 극이 밝게 덮이고 흰 구름이 떠 있습니다.\n천왕성은 옆으로 누워 돌아 한 계절이 21년입니다. 봄을 맞은 극에는 밝은 안개 모자가 생깁니다.'),
        'thread:jupiter': t('해를 등진 목성 둘레에 실 같은 고리가 빛납니다.\n1979년 보이저 1호가 찾았습니다. 작은 위성에서 튄 먼지라 뒤에서 빛을 받아야 보입니다.'),
        'typhoon:earth': t('필리핀 동쪽 바다 위에 태풍이 돌고 있습니다. 가운데 뚫린 구멍이 태풍의 눈입니다.\n눈 안은 바람이 잔잔하고 하늘이 맑습니다. 북반구의 태풍은 시계 반대 방향으로 돕니다.'),
        'boats:earth': t('동해의 밤바다에 흰 불빛이 모여 있습니다. 오징어잡이 배의 집어등입니다.\n오징어는 빛을 보고 모여듭니다. 도시가 없는 바다 한가운데가 우주에서도 환하게 보입니다.'),
        'ash:earth': t('시칠리아 섬의 에트나 화산에서 잿빛 연기가 바람을 타고 흘러갑니다.\n유럽에서 가장 높은 활화산으로, 한 해에도 여러 번 분화합니다. 밤에는 분화구가 붉게 빛납니다.'),
        'rings:uranus': t('천왕성을 두른 가늘고 어두운 고리가 보입니다.\n1977년 별이 천왕성 뒤로 숨기 전에 깜빡이는 것을 보고 찾았습니다. 숯처럼 검어 햇빛의 2%만 되비춥니다.'),
        'geyser:mars': t('화성 남극의 얼음 위로 검은 먼지가 뿜어 나옵니다.\n봄 햇살에 드라이아이스가 밑에서부터 기체로 바뀌어 터져 나옵니다. 지나간 자리에 거미 무늬가 남습니다.'),
        'ashen:venus': t('금성의 밤 쪽이 어렴풋이 빛납니다. 잿빛 광채입니다.\n1643년부터 보았다는 기록이 이어지지만 까닭은 아직 모릅니다.'),
        'lightning:venus': t('금성의 밤 쪽 구름 속에서 빛이 번쩍입니다.\n금성의 번개는 아직 논쟁 중입니다. 탐사선들이 전파 신호는 잡았지만 빛을 찍은 것은 드뭅니다.'),
        'horizon:moon': t('해를 등진 달의 가장자리에 가는 빛줄이 떠 있습니다. 달 지평선 광채입니다.\n전기를 띤 먼지가 땅 위로 떠올라 햇빛을 흩뜨린다고 봅니다. 1972년 아폴로 17호 선장이 그림으로 남겼습니다.'),
        tailcut: t('혜성의 푸른 가스 꼬리가 중간에서 끊겨 떨어져 나갑니다.\n태양풍의 자기장 방향이 바뀌는 곳을 지날 때 일어납니다. 꼬리는 곧 다시 자랍니다.'),
        'transit:venus': t('금성이 해 앞을 지나고 있습니다. 태양면 통과입니다.\n지구에서는 243년에 네 번만 볼 수 있습니다. 지난번은 2012년, 다음은 2117년입니다.'),
        'transit:mercury': t('수성이 해 앞을 지나는 작은 검은 점으로 보입니다.\n지구에서는 100년에 열세 번쯤 봅니다. 다음은 2032년 11월입니다.'),
        'airglow:earth': t('지구의 밤 쪽 가장자리에 가는 초록 띠가 둘려 있습니다. 대기광입니다.\n낮 동안 햇빛에 쪼개진 산소가 95km 높이에서 다시 뭉치며 내는 빛입니다. 우주정거장 사진마다 찍힙니다.'),
        'hexagon:saturn': t('토성의 북극에 여섯 모 난 구름 띠가 있습니다.\n한 변이 지구보다 긴 제트 기류입니다. 1981년 보이저가 찾았고, 카시니가 돌아올 때까지 그대로였습니다.'),
        'backlit:saturn': t('해를 등진 토성의 고리가 뒤에서 빛을 받아 빛납니다.\n짙은 B 고리는 어둡고, 엷은 고리와 틈새가 오히려 밝습니다. 카시니가 토성의 그림자 속에서 찍은 모습입니다.'),
        'haze:titan': t('해를 등진 타이탄의 둘레에 주황빛 고리가 떴습니다.\n질소와 메탄의 안개가 수백 km 높이까지 겹겹이 쌓여 햇빛을 흩뜨립니다.'),
        'haze:pluto': t('해를 등진 명왕성의 둘레에 푸른 고리가 떴습니다.\n2015년 뉴허라이즌스가 지나가며 뒤돌아 찍은 안개층입니다. 스무 겹쯤 됩니다.'),
        'haze:mars': t('해를 등진 화성의 가장자리가 푸르게 빛납니다.\n화성의 먼지는 푸른빛을 앞쪽으로 흩뜨립니다. 그래서 화성의 노을은 해 둘레만 파랗습니다.'),
        'shine:moon': t('달의 밤 쪽이 어슴푸레 푸르게 보입니다. 지구가 되비춘 빛, 지구조입니다.\n달에서 본 보름 지구는 보름달보다 40배쯤 밝습니다. 다 빈치가 1510년쯤 그 까닭을 적었습니다.'),
        counterglow: t('해 정반대편 하늘에 희미한 빛 얼룩이 있습니다. 대일조입니다.\n행성 사이의 먼지가 햇빛을 곧장 되돌려 보내는 자리입니다. 지구에서는 아주 어두운 밤에만 보입니다.'),
        'aurora:saturn': t('토성의 두 극에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n카시니가 찍은 사진에서 아래는 붉고 위는 보랏빛이었습니다. 수소가 내는 빛입니다.'),
        'plume:triton': t('트리톤의 남반구에서 검은 기둥이 솟고 있습니다.\n1989년 보이저 2호가 본 분출입니다. 8km까지 올라가 바람을 타고 100km 넘게 옆으로 흐릅니다.'),
        sprite: t('번개 위로 붉은 빛기둥이 솟았습니다. 스프라이트입니다.\n구름 위 50 → 90km 높이에서 눈 깜짝할 사이에 번쩍이는 방전으로, 우주정거장에서도 찍혔습니다.'),
        'clouds:earth': t('지구 북극 둘레, 낮과 밤의 경계에 푸르스름한 구름이 걸려 있습니다. 야광운입니다.\n80km 높이에 뜨는 가장 높은 구름입니다. 땅은 어두워도 그 높이에는 아직 햇빛이 닿아 빛납니다.'),
        'footprint:io': t('목성의 오로라 띠 안쪽에 밝은 점이 따로 떠 있습니다. 이오의 발자국입니다.\n이오와 목성을 잇는 자기력선을 따라 전류가 흐르는 자리로, 이오가 도는 대로 따라 돕니다.'),
        'spokes:saturn': t('토성의 밝은 고리 위에 어두운 살 무늬가 가로질러 있습니다.\n1980년 보이저 1호가 찾은 스포크입니다. 고리 위로 뜬 먼지가 토성의 자기장을 따라 도는 것으로 봅니다.'),
        'spot:neptune': t('해왕성 남반구에 검푸른 소용돌이가 있습니다. 대흑점입니다.\n1989년 보이저 2호가 본 지구만 한 폭풍이고, 둘레의 흰 구름은 얼어붙은 메탄입니다. 1994년 허블이 다시 보았을 때는 사라지고 없었습니다.'),
        'tail:mercury': t('수성 뒤로 누런 꼬리가 뻗어 있습니다. 태양 반대쪽입니다.\n햇빛에 밀려 나간 나트륨 원자가 내는 빛으로, 실제 길이는 수백만 km를 넘습니다.'),
        'jets:halley': t('핼리 혜성의 핵에서 가스와 먼지가 줄기로 뿜어 나옵니다. 햇빛을 받는 쪽입니다.\n1986년 탐사선 지오토가 596km까지 다가가 이 분출을 찍었습니다.'),
        'plume:io': t('이오의 화산이 가스를 뿜고 있습니다.\n펠레 화산의 분출은 높이 300km를 넘습니다. 이오는 태양계에서 화산 활동이 가장 활발합니다.'),
        'plume:enceladus': t('엔셀라두스의 남극에서 얼음 알갱이가 솟고 있습니다.\n얼음 껍질 아래 바다에서 나온 물이고, 토성의 E 고리를 이룹니다.'),
        impact: t('달의 밤 쪽에서 작은 빛이 번쩍입니다.\n달에는 공기가 없어 별똥별이 타지 않고, 그대로 땅에 부딪히며 빛을 냅니다.'),
        'lightning:earth': t('지구의 밤 쪽 구름 속에서 번개가 번쩍입니다.\n지구에서는 1초에 40번 넘게 번개가 칩니다.'),
        lightning: t('목성의 밤 쪽 구름에서 번개가 칩니다.\n지구의 번개보다 몇 배 밝습니다.'),
      }[event.id] ?? null;
    case 'beltEntered':
      return t('소행성대에 들어섰습니다.\n실제로는 소행성 사이가 평균 100만km쯤 떨어져 있습니다.');
    default:
      return null;
  }
}

// The game clock's date in today's-sky mode, in the player's own time zone.
export function dateText(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

// How far away something is, short enough for a label: km up to 10,000, then 만 (ten
// thousands), then 억 (hundred millions), then 조
// (millions of millions: the way home from another star).
export function distanceText(km) {
  if (english()) return englishKm(km);
  // (Japanese and Chinese count the same way, with their own characters.)
  if (km < 1e4) return `${Math.round(km).toLocaleString('ko-KR')}km`;
  if (km < 999950) return counted(`${(km / 1e4).toFixed(1)}만km`);
  if (km < 1e8) return counted(`${Math.round(km / 1e4).toLocaleString('ko-KR')}만km`);
  if (km < 1e12) return counted(`${(km / 1e8).toFixed(1)}억km`);
  return counted(`${(km / 1e12).toFixed(1)}조km`);
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
    return t`${planet.name} 땅 위로 흐릿한 얼룩이 지나갑니다. 위성 ${moon.name}의 그림자입니다.
${moon.name}는 작아서 해를 다 가리지 못합니다. 화성의 탐사차들이 해 앞을 지나는 ${moon.name}를 여러 번 찍었습니다.`;
  }
  return t`${planet.name} 구름 위로 검은 점이 지나갑니다. 위성 ${moon.name}의 그림자입니다.
그 점 안에 서면 해가 ${moon.name}에 가려 보이지 않습니다. 일식입니다.`;
}
