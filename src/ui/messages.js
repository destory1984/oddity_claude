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
    case 'teleported': {
      // 로 after a vowel or ㄹ, 으로 after any other final consonant.
      const code = event.name.charCodeAt(event.name.length - 1);
      const final = code >= HANGUL_START && code <= HANGUL_END ? (code - HANGUL_START) % 28 : 0;
      return `${event.name}${final === 0 || final === 8 ? '로' : '으로'} 순간 이동했습니다.`;
    }
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
