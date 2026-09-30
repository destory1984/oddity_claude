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

export function subjectParticle(word) {
  return hasFinalConsonant(word) ? '이' : '가';
}

const nameOf = (bodies, id) => bodies.find((b) => b.id === id)?.name ?? id;

export function eventMessage(event, bodies = []) {
  switch (event.type) {
    case 'surfaceReached':
      return '천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.';
    case 'discovered':
      return `새 천체 발견: ${nameOf(bodies, event.bodyId)}`;
    case 'landed':
      return `착지 기록: ${nameOf(bodies, event.bodyId)}. 수첩에 남겼습니다.`;
    case 'photo':
      return `사진 임무 달성: ${event.missionName}`;
    default:
      return null;
  }
}

// The live speed limit as a multiple of light speed.
export function limitText(ratio) {
  if (ratio < 1) return `${ratio.toFixed(2)}c`;
  if (ratio < 10) return `${ratio.toFixed(1)}c`;
  return `${Math.round(ratio)}c`;
}
