// "그날로": at a story place, the day it is known for is played again in the close
// view. The model that stands there comes down as it did, and a few lines tell what
// happened, each at its moment. One scene so far: Apollo 11's landing.
// seconds: how long the scene lasts. downAt: when it touches the ground.
// fromKm: how high the model starts (it is drawn 6 km wide, so this is in drawn km).
export const REPLAYS = {
  apollo11: {
    name: '이글의 착륙',
    day: '1969년 7월 20일',
    seconds: 24,
    downAt: 17,
    fromKm: 14,
    lines: [
      { at: 0, text: '1969년 7월 20일. 암스트롱과 올드린이 탄 착륙선 이글이 고요의 바다로 내려옵니다.' },
      { at: 5, text: '컴퓨터가 고른 자리는 바위가 널린 분화구였습니다. 암스트롱이 손으로 몰아 그 너머로 넘어갑니다.' },
      { at: 11, text: '"60초." 연료가 얼마 남지 않았다고 지상에서 알립니다. 엔진 바람에 먼지가 사방으로 날립니다.' },
      { at: 17, text: '"휴스턴, 여기는 고요의 기지. 이글은 착륙했다." 한국 시간으로 7월 21일 새벽 5시 17분이었습니다.' },
    ],
  },
};

export function replayFor(id) {
  return REPLAYS[id] ?? null;
}

// The scene t seconds in: how high the model is (it slows as it nears the ground),
// whether its engine burns, which line is told, and whether the scene is over.
export function replayFrame(id, t) {
  const scene = REPLAYS[id];
  if (!scene) return null;
  const u = Math.max(0, Math.min(1, t / scene.downAt));
  let line = 0;
  scene.lines.forEach((l, i) => { if (t >= l.at) line = i; });
  return {
    liftKm: scene.fromKm * (1 - u) ** 2,
    flame: t < scene.downAt,
    down: t >= scene.downAt,
    line,
    text: scene.lines[line].text,
    done: t >= scene.seconds,
  };
}
