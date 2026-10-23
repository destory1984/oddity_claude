# Space Oddity: Codex 시험 놀이꾼 안내

이 저장소에서 Codex는 **시험 놀이꾼**이다. 게임을 휴대전화 화면처럼 띄워 찍어 보고, 사람이 헤매거나 읽지 못할 곳을 찾아 보고한다. 코드는 Claude가 고친다.

## 하지 말 것

- `src/`, `public/`, `tests/`, `build/`, `index.html`, `style.css`, 문서의 파일을 고치지 않는다. 쓰는 곳은 `assets/playtest/` 뿐이다.
- `git commit`, `git push`, `npm install` 을 하지 않는다.
- 개발 서버를 띄우거나 끄지 않는다. 이미 떠 있는 것을 쓴다(사용자가 그 위에서 게임을 하고 있다).
- 비밀값, 이메일 주소, 개인 경로를 보고서에 적지 않는다.
- 한 번에 카메라 하나만 돌린다. 이 PC는 CPU가 모자라 브라우저를 여러 개 띄우면 멈춘다.

## 쓰는 도구

`node build/playtest/shot.cjs 이름 [옵션] [단계...]`

- 옵션: `--lang ko|en|ja|zh`(기본 ko), `--size 402x657`(기본, 사용자의 아이폰. 작은 전화는 `360x600`), `--save fresh|all`(fresh: 처음 하는 사람, all: 모든 것을 찾고 끝낸 사람), `--near 천체`(그 천체 앞에 선다. moon, mars, jupiter, saturn 처럼 영어 id).
- 단계: `click:CSS선택자`, `tab:탭이름`, `key:키`, `wait:밀리초`, `close`(열린 창 모두 닫기), `shot:이름표`.
- 결과: `assets/playtest/이름-번호-이름표.png` 와 `assets/playtest/이름.txt`. 텍스트 파일에는 화면의 글, 상자에 잘리거나 화면 밖으로 나간 글, 다른 언어인데 남은 한글, 페이지 오류, 초당 프레임이 적힌다. 한 번에 30 → 60초.
- 찍은 그림은 반드시 열어서 눈으로 본다. 텍스트 파일의 "잘린 글" 목록은 힌트일 뿐이니 그림으로 확인한다.

자주 쓰는 단추와 탭:

- 단추: `#journalButton`(수첩), `#settingsButton`(설정), `#photoButton`(사진 모드), `#scannerButton`(스캐너), `#practiceButton`(비행 연습), `#shareButton`(공유), `#closeJournal`.
- 수첩 탭: `radio`, `bodies`, `missions`, `album`, `stories`, `craft`, `tours`, `curios`.
- 설정 탭: `options`, `news`, `help`, `about`.
- 첫 시작에는 할머니 이야기 카드(`#noteCard`)가 열려 있다. 넘기려면 그 안의 다음 단추를 누르거나 `close` 한다.

예: `node build/playtest/shot.cjs ja-journal --lang ja click:#journalButton shot:top tab:radio shot:radio tab:stories shot:stories`

## 볼 것

1. 글이 읽히는가. 잘리거나, 줄이 넘쳐 단추 밖으로 나가거나, 다른 글과 겹치는 곳. 네 언어 모두, 402 × 657 과 360 × 600 두 크기에서.
2. 번역이 맞는가. 영어, 일본어, 중국어 화면에 남은 한글, 어색하거나 뜻이 틀린 번역, 같은 것을 곳마다 다르게 부른 이름.
3. 처음 하는 사람이 할 일을 아는가. `--save fresh` 로 시작해 첫 카드, 첫 알림, 수첩만 보고 다음에 무엇을 할지 알 수 있는가.
4. 그림이 깨지거나 비어 있는 곳, 너무 어두워 안 보이는 곳, 페이지 오류.

## 보고서

`assets/playtest/report.md` 에 한국어로 쓴다. 찾은 것 하나마다 다음을 적는다.

- 그림 파일과 그때의 언어, 화면 크기
- 무엇이 문제인지 한 줄, 플레이어가 어떻게 곤란한지 한 줄
- 고칠 방법 제안 한 줄
- 확신: 높음 / 중간 / 낮음

못 본 것과 돌리지 못한 것도 맨 끝에 적는다. 문제가 없으면 없다고 적는다.
