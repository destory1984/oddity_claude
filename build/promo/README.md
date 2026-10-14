# 홍보 동영상 만들기

유튜브 쇼츠용 세로 영상(1080 x 1920, 30fps, 약 29초)을 게임 화면에서 바로 만든다. 한국어판과 영어판이 있다.
결과물과 녹화 원본은 `assets/promo/` 에 쌓이고 저장소에는 올리지 않는다(원본 그림이 1GB 넘게 나온다).

## 순서

1. 장면 녹화: `node build/promo/shoot.cjs ko music earth naro aurora apollo jupiter saturn`
   - 공개 페이지(https://destory1984.github.io/oddity_claude/)를 창 없이 띄워 찍는다. 장면마다 효과음도 같이 녹음한다.
   - `music` 은 음악만 36초 녹음한다(효과음을 끈다). 다른 장면은 음악을 끄고 효과음만 녹음한다.
   - 수첩 장면은 가득 찬 수첩을 보이려고 개발 서버의 "모든 임무 완료" 단추를 쓴다:
     `PROMO_URL=http://localhost:4417/oddity_claude/ node build/promo/shoot.cjs ko journal`
2. 자막과 끝 화면: `node build/promo/captions.cjs ko` (개발 서버가 떠 있어야 게임 글꼴을 쓴다)
3. 편집: `python -P build/promo/cut.py ko` → `assets/promo/oddity-ko.mp4`
4. 확인용 장면표: `python -P build/promo/sheet.py ko earth naro` → `assets/promo/ko/sheet.jpg`

영어판은 `ko` 자리에 `en` 을 넣는다.

## 고칠 곳

| 무엇 | 파일 |
| --- | --- |
| 장면을 찍는 동작(어디로 가서 무엇을 누르나) | `shots.cjs` |
| 장면 순서, 장면마다 쓰는 구간(몇 초부터 몇 초 동안) | `cut.py` 의 `CUT` |
| 자막 글, 끝 화면 글, 모양 | `captions.cjs` 의 `LINES` 와 CSS |
| 이 PC의 Playwright와 Chromium 찾기 | `env.cjs` (`PLAYWRIGHT_DIR`, `PROMO_CHROME` 로 바꿀 수 있다) |

## 알아 둘 것

- 녹화는 405 x 720 폰 화면을 2.6667배로 그려 1080 x 1920으로 받는다. 브라우저 전체에 배율을 걸어야(`--force-device-scale-factor`) 화면 캡처가 큰 그림으로 나온다.
- 녹화 중에는 처음 하는 사람에게 뜨는 안내 창(비행 연습 권유, 쪽지)을 0.15초마다 닫는다.
- 게임 소리는 모두 코드로 만든 소리라 따로 받은 음원이 없다. 저작권 걱정 없이 쓴다.
- 소리 크기는 유튜브 기준(-14 LUFS)에 맞춘다.
