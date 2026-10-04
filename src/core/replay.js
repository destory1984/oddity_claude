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
  // Not a place but a body: resting anywhere on Saturn's cloud tops (the story 'cassini';
  // the id differs because 'cassini' is also the craft that still flies in the game).
  // It does not come down to stand: it comes in from the side (acrossKm away, drawn km),
  // glows, and at downAt is gone.
  cassiniPlunge: {
    name: '카시니의 마지막 돌입',
    day: '2017년 9월 15일',
    on: 'saturn',
    streak: true,
    seconds: 22,
    downAt: 15,
    // Seen from 480 km: the eye is never drawn lower than 0.2% of a body's radius
    // (core/eye.js), which on Saturn is 116 km, so a view from 48 km would look over it.
    viewKm: 480,
    fromKm: 70,
    toKm: 20,
    acrossKm: 130,
    lines: [
      { at: 0, text: '2017년 9월 15일. 13년 동안 토성을 돈 카시니가 연료를 거의 다 쓰고 토성으로 뛰어듭니다.' },
      { at: 5, text: '엔셀라두스와 타이탄의 바다를 지구의 미생물로 더럽히지 않으려고 고른 끝이었습니다.' },
      { at: 10, text: '시속 11만km. 안테나를 지구로 돌린 채 추진기를 끝까지 뿜으며 대기 자료를 보냅니다.' },
      { at: 15, text: '신호가 끊겼습니다. 마지막 전파는 83분 뒤 지구에 닿았고, 카시니는 토성의 일부가 되었습니다.' },
    ],
  },
};

// The scene played by resting on this body, if there is one.
export function replayOn(bodyId) {
  return Object.keys(REPLAYS).find((id) => REPLAYS[id].on === bodyId) ?? null;
}

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
    liftKm: scene.streak ? scene.fromKm + (scene.toKm - scene.fromKm) * u : scene.fromKm * (1 - u) ** 2,
    // A streak: how far to the side it still is, how hot it glows (from a third of the
    // way in), and whether it has burnt away.
    acrossKm: scene.streak ? scene.acrossKm * (1 - u) : 0,
    glow: scene.streak ? Math.max(0, Math.min(1, (u - 0.33) / 0.4)) : 0,
    // How steeply it comes down: km lost for each km it comes nearer.
    slope: scene.streak ? (scene.fromKm - scene.toKm) / scene.acrossKm : 0,
    gone: Boolean(scene.streak) && t >= scene.downAt,
    flame: !scene.streak && t < scene.downAt,
    down: t >= scene.downAt,
    line,
    text: scene.lines[line].text,
    done: t >= scene.seconds,
  };
}
