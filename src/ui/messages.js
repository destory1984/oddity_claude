import { FACTS } from '../core/facts.js';

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
      return `${event.name}${towardParticle(event.name)} 내려갑니다.`;
    case 'visited':
      return `${event.name} 곁에 내려섰습니다. 전진이나 후진을 누르면 떠납니다.`;
    case 'slingshot':
      return `${nameOf(bodies, event.bodyId)} 스윙바이! 제한 속도의 ${event.factor.toFixed(1)}배로 튕겨 나갑니다. Space로 멈춥니다.`;
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
      return {
        'aurora:earth': '지구의 두 극 둘레에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n태양에서 날아온 입자가 100km 위 공기를 때려 내는 빛입니다.',
        'aurora:jupiter': '목성의 두 극에 오로라가 떠 있습니다. 밤 쪽에서 보입니다.\n지구 오로라보다 수백 배 세고, 위성 이오가 뿜은 입자도 보탭니다.',
        'plume:io': '이오의 화산이 가스를 뿜고 있습니다.\n펠레 화산의 분출은 높이 300km를 넘습니다. 이오는 태양계에서 화산 활동이 가장 활발합니다.',
        'plume:enceladus': '엔셀라두스의 남극에서 얼음 알갱이가 솟고 있습니다.\n얼음 껍질 아래 바다에서 나온 물이고, 토성의 E 고리를 이룹니다.',
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
