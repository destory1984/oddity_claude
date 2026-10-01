# 외부 자료 출처

| 파일 | 출처 | 조건 |
|---|---|---|
| `public/assets/earth-day.jpg` | NASA Visible Earth, Blue Marble (2004년 7월). https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74092/world.200407.3x5400x2700.jpg 를 가로 4096px로 줄였다. | 미국 정부 저작물, 저작권 없음 |
| `public/assets/earth-night.jpg` | NASA Visible Earth, Black Marble 2016. https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg | 미국 정부 저작물, 저작권 없음 |
| `public/assets/earth-clouds.jpg` | NASA Visible Earth, 구름 합성 지도. https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg | 미국 정부 저작물, 저작권 없음 |
| `public/assets/planets/mars.jpg` | Solar System Scope 지도(2048×1024). https://www.solarsystemscope.com/textures/ | CC BY 4.0 (출처 표시) |
| `public/assets/planets/venus.jpg` | NASA 3D Resources, Venus. https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Venus | NASA 자료, 저작권 없음 (NASA 로고·휘장 제외) |
| `public/assets/planets/jupiter.jpg` | Solar System Scope 지도(2048×1024). https://www.solarsystemscope.com/textures/ | CC BY 4.0 (출처 표시) |
| `public/assets/planets/saturn.jpg` | Solar System Scope 지도(2048×1024). https://www.solarsystemscope.com/textures/ | CC BY 4.0 (출처 표시) |
| `public/assets/planets/neptune.jpg` | Solar System Scope 지도(2048×1024). https://www.solarsystemscope.com/textures/ | CC BY 4.0 (출처 표시) |
| `public/assets/planets/io.jpg` | NASA 3D Resources, Jupiter - Io (A). https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter%20-%20Io%20(A) | NASA 자료, 저작권 없음 (NASA 로고·휘장 제외) |
| `public/assets/planets/europa.jpg` | NASA 3D Resources, Jupiter - Europa. https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter%20-%20Europa | NASA 자료, 저작권 없음 (NASA 로고·휘장 제외) |
| `public/assets/planets/ganymede.jpg` | NASA 3D Resources, Jupiter - Ganymede. https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter%20-%20Ganymede | NASA 자료, 저작권 없음 (NASA 로고·휘장 제외) |
| `public/assets/planets/callisto.jpg` | NASA 3D Resources, Jupiter - Callisto. https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Jupiter%20-%20Callisto | NASA 자료, 저작권 없음 (NASA 로고·휘장 제외) |
| `public/assets/planets/titan.jpg` | NASA 3D Resources, Saturn - Titan. https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures/Saturn%20-%20Titan | NASA 자료, 저작권 없음 (NASA 로고·휘장 제외) |
| `src/core/constellations.js` | d3-celestial의 별자리 선과 이름 자료(constellations.lines.json, constellations.json)를 게임용으로 줄인 것. https://github.com/ofrohn/d3-celestial | BSD 3-Clause, Copyright (c) 2015 Olaf Frohn |
| `@babylonjs/core` (npm) | https://github.com/BabylonJS/Babylon.js | Apache-2.0 |

화성, 목성, 토성, 해왕성 지도는 Solar System Scope(https://www.solarsystemscope.com)가 NASA 자료로 만든 것이며 CC BY 4.0 조건으로 쓴다. 예전의 720 → 1440px NASA 3D Resources 지도보다 또렷해서 바꿨다.

NASA 이미지는 NASA가 이 게임을 보증한다는 뜻으로 쓰지 않는다. 캐릭터, 셰이더, 효과음과 게임 코드는 이 저장소에서 직접 만든 것이다. 수성, 천왕성, 달은 공개된 지도가 없거나 쓸 수 없는 사진이라 셰이더로 그렸다. 금성 지도는 레이더 지표 지도라 두꺼운 구름 아래 옅게만 비치게 했다.

## d3-celestial 라이선스 (BSD 3-Clause)

Copyright (c) 2015, Olaf Frohn. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
