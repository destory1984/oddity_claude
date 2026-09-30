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
    case 'zoneChanged':
      if (event.to === 'far') return '근처에 별이 없어서, 광속의 1000배까지 속도를 올립니다.';
      if (event.to === 'veryNear') return '별 표면에 아주 가까워서, 안전을 위해 속도를 광속의 1/100로 낮춥니다.';
      if (event.from === 'veryNear') return '별 표면에서 멀어져서, 속도를 광속의 1/10까지 올립니다.';
      return '별 근처에서는 안전을 위해서 속도를 광속의 1/10로 낮춥니다.';
    default:
      return null;
  }
}

// Short line for the target panel from estimateTravelSeconds().
export function routeText(route, bodies) {
  if (!route) return '';
  if (route.blockedBy) {
    const name = nameOf(bodies, route.blockedBy);
    return `곧장 가면 ${name}${subjectParticle(name)} 막고 있음`;
  }
  if (route.seconds === 0) return '도착';
  if (route.seconds < 1) return '곧장 가면 1초 안';
  return `곧장 가면 약 ${Math.round(route.seconds)}초`;
}
