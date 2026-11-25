# 홍보 동영상 만들기

유튜브 쇼츠용 세로 영상(1080 x 1920, 30fps, 약 27초)을 게임 화면에서 바로 만든다. 2026-10-28에 한국어판을 다시 만들었다(나로호와 수첩을 빼고 일식을 넣었다. 장면마다 카메라가 돌며 다가간다). 영어판은 아직 10-14의 장면 차례다.
결과물과 녹화 원본은 `assets/promo/` 에 쌓이고 저장소에는 올리지 않는다(원본 그림이 1GB 넘게 나온다).

## 순서

1. 장면 녹화: `node build/promo/shoot.cjs ko music earth fly eclipse aurora apollo jupiter saturn`
   - 공개 페이지(https://destory1984.github.io/oddity_claude/)를 창 없이 띄워 찍는다. 장면마다 효과음도 같이 녹음한다.
   - `music` 은 음악만 36초 녹음한다(효과음을 끈다). 다른 장면은 음악을 끄고 효과음만 녹음한다.
   - 수첩 장면은 가득 찬 수첩을 보이려고 개발 서버의 "모든 임무 완료" 단추를 쓴다:
     `PROMO_URL=http://localhost:4417/oddity_claude/ node build/promo/shoot.cjs ko journal`
2. 자막과 끝 화면: `node build/promo/captions.cjs ko` (개발 서버가 떠 있어야 게임 글꼴을 쓴다)
3. 편집: `python -P build/promo/cut.py ko` → `assets/promo/oddity-ko.mp4`
4. 확인용 장면표: `python -P build/promo/sheet.py ko earth naro` → `assets/promo/ko/sheet.jpg`

영어판은 `ko` 자리에 `en` 을 넣는다.

## 추천코스 쇼츠

코스 하나를 30초 쇼츠로 만든다. 한 장면이 길어 `cut.py` 대신 `tour.py` 를 쓴다(그림을 모두 메모리에 올리면 10GB가 든다).

1. 녹화: `PROMO_URL=http://localhost:4417/oddity_claude/ node build/promo/shoot.cjs ko auroraDrift`
2. 자막과 끝 화면: `FILM=tour node build/promo/captions.cjs ko`
3. 편집: `python -P build/promo/tour.py ko auroraDrift 1` → `assets/promo/tour-auroraDrift-1-ko.mp4` (마지막 숫자는 자막 안의 번호, 자막의 때는 `tour.py` 의 `TAKES`)

공개 페이지에 코스가 올라간 뒤에는 `PROMO_URL` 을 빼도 된다.

### 그려서 만드는 쇼츠 (태양계는 어떻게 도는가)

이 코스는 568초라 실시간으로 찍으면 이 PC에서 끊긴다. 코스의 장면(`src/render/orbitStage.js`)은 시각만 주면 그 순간을 그릴 수 있어서, 한 장씩 그려 초당 30장으로 엮는다. 여섯 토막을 2 → 3배로 감아 48초, 끝 화면 5초.

1. 음악: `PROMO_URL=http://localhost:4417/oddity_claude/ node build/promo/shoot.cjs ko music60` (게임 음악 62초)
2. 장면: `node build/promo/orbits.cjs ko` → `assets/promo/ko/orbits/` 1,440장, 약 8분. 토막 몇 개만 다시 그릴 때는 `node build/promo/orbits.cjs ko 4 6`
3. 자막과 끝 화면: `FILM=tour node build/promo/captions.cjs ko`
4. 편집: `python -P build/promo/tour.py ko orbits 1` → `assets/promo/tour-orbits-1-ko.mp4`

토막마다 쓰는 구간과 감는 배, 자막에 가리지 않게 장면을 내리는 정도는 `orbits.cjs` 의 `PARTS` 에 있다.

### 목소리가 있는 쇼츠 (달은 왜 한쪽 얼굴만 보일까)

하린의 목소리가 16줄을 읽고, 장면과 자막의 길이를 그 목소리에 맞춘다. 같은 말이라도 언어마다 길이가 달라 영상 길이도 다르다(한국어 58.7초, 영어 57.3초, 중국어 63.5초, 일본어 72.6초).

1. 대사: `build/promo/moon-lines.json` 에 언어마다 16줄, 읽는 문장과 화면 자막(줄바꿈, 금빛 낱말은 `<em>`)을 함께 둔다. 마지막 줄은 끝 화면 위에서 읽는다.
2. 목소리: TTS 세션이 만든 `moonShort2-01-ko.mp3` 같은 파일을 `assets/promo/<언어>/voice/` 에 둔다. 목소리는 로컬 모델이라 돈이 들지 않는다. 영어, 일본어, 중국어는 그 말이 모국어인 하린 목소리를 따로 만들어 쓴다(한국어 하린으로 읽히면 한국어 억양이 짙다).
3. 시간 맞추기: `python -P build/promo/moon-timing.py ko` → `assets/promo/ko/moon-timing.json` (토막 길이, 자막 시각, 줄마다 읽기 시작하는 때)
4. 장면: `node build/promo/moon.cjs ko` (약 1분, `PEEK=1` 이면 토막마다 한 장만 그려 미리 본다)
5. 자막과 끝 화면: `FILM=tour node build/promo/captions.cjs ko`
6. 편집: `python -P build/promo/tour.py ko moon 1` → `assets/promo/tour-moon-1-ko.mp4`. 음악은 목소리 밑에 절반 크기로 깐다.

한국어를 다 만들고 사용자가 허락한 뒤에 다른 언어를 만든다.

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
