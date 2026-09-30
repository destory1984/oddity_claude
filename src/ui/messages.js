const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

export function objectParticle(word) {
  const code = word.charCodeAt(word.length - 1);
  if (code < HANGUL_START || code > HANGUL_END) return '을';
  return (code - HANGUL_START) % 28 === 0 ? '를' : '을';
}

export function eventMessage(event) {
  if (event.type === 'surfaceReached') {
    return '천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.';
  }
  if (event.type !== 'zoneChanged') return null;
  if (event.to === 'far') return '근처에 별이 없어서, 광속의 100배까지 속도를 올립니다.';
  if (event.to === 'veryNear') return '별 표면에 아주 가까워서, 안전을 위해 속도를 광속의 1/10로 낮춥니다.';
  if (event.from === 'veryNear') return '별 표면에서 멀어져서, 속도를 광속까지 올립니다.';
  return '별 근처에서는 안전을 위해서 속도를 광속으로 낮춥니다.';
}
