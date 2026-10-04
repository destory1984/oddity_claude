// What changed, as a player sees it: the first page of the settings ("이번 주에 바뀐
// 것"). One line each, in plain words, the newest day first. Only what shows on screen or
// is heard goes in here; how it was done does not. Add a line at the top of its day
// when something a player would notice is changed.
export const CHANGES = [
  { day: '2026-10-04', text: '다누리 곁에서 달의 한낮 땅이 하얗게 날아가 보이던 것을 고쳤습니다.' },
  { day: '2026-10-04', text: '탐사선을 확대 관찰로 열면 비스듬한 자리에서 보여, 접시 안테나 뒤의 몸통이 보입니다.' },
  { day: '2026-10-04', text: '화면 위 오른쪽 끝에 설정 단추가 생겼습니다. 이번 주에 바뀐 것을 여기서 봅니다.' },
  { day: '2026-10-04', text: '한국어 기기에서는 도킹과 착륙을 한국어로 셉니다. "도킹 준비 중. 삼, 이, 일, 영."' },
  { day: '2026-10-04', text: '곡이 바뀔 때 뜨던 알림을 없앴습니다.' },
  { day: '2026-10-04', text: '움직임 단추 넷이 위쪽 단추와 같은 크기가 됐습니다.' },
  { day: '2026-10-04', text: '미니맵에서 지구와 그 바깥 행성 옆에 영어 이름 첫 글자가 붙습니다. 토성은 S입니다.' },
  { day: '2026-10-04', text: '지구와 달 사이에 있으면 달 쪽 화살표도 나옵니다.' },
  { day: '2026-10-04', text: '목성과 토성 위로 위성의 그림자가 지나갑니다. 언제 지나가는지는 수첩의 "하늘 소식"에 나옵니다.' },
  { day: '2026-10-04', text: '로딩 화면이 준비되는 대로 바로 걷힙니다.' },
  { day: '2026-10-04', text: '버전은 할머니의 쪽지 화면 맨 아래로 옮겼습니다.' },
  { day: '2026-10-04', text: '트리톤, 해왕성의 대흑점, 작은 위성과 혜성의 겉모습을 손봤습니다.' },
  { day: '2026-10-03', text: '나는 속도를 절반으로 줄였습니다.' },
  { day: '2026-10-03', text: '뒤 보기 단추가 생겼습니다(R 키).' },
  { day: '2026-10-03', text: '수첩의 글자 크기를 "가−", "가+"로 바꿉니다.' },
  { day: '2026-10-03', text: '볼거리 아홉이 늘었습니다. 토성의 오로라, 지구의 야광운, 핼리 혜성의 분출 등입니다.' },
  { day: '2026-10-03', text: '1969년, 1979년, 1986년의 쪽지를 네 쪽에 걸쳐 읽습니다.' },
];

const DAY_MS = 86400000;
const stamp = (day) => Date.parse(`${day}T00:00:00Z`);

// The changes of the last `days` days up to `today` ('YYYY-MM-DD'), the newest first,
// in the order written. When the week has none, the last day that had any is shown, so
// the page is never empty.
export function weekChanges(today, changes = CHANGES, days = 7) {
  const from = stamp(today) - (days - 1) * DAY_MS;
  const week = changes.filter((c) => stamp(c.day) >= from && stamp(c.day) <= stamp(today));
  if (week.length > 0 || changes.length === 0) return week;
  const last = changes.reduce((best, c) => (stamp(c.day) > stamp(best) ? c.day : best), changes[0].day);
  return changes.filter((c) => c.day === last);
}

// '2026-10-04' → '10.4'
export function dayLabel(day) {
  const [, month, date] = day.split('-').map(Number);
  return `${month}.${date}`;
}
