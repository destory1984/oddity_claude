precision highp float;
// Cheomseongdae's stars and their trails in one pass (render/cheomModels.js): the star
// disc turned by `wheel` round its middle, and seven fainter copies turned back a little
// each, up to `trail`, added together. (It was eight sheets laid one over another, each
// as large as the view: eight times the sky drawn every frame.)
varying vec2 vUV;
uniform sampler2D field;
uniform float wheel;
uniform float trail;
uniform float fade;
const int TRAILS = 7;
vec3 turned(vec2 q, float a){
  float c = cos(a);
  float s = sin(a);
  vec2 p = vec2(q.x * c + q.y * s, -q.x * s + q.y * c) + 0.5;
  if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) return vec3(0.);
  return texture2D(field, p).rgb;
}
void main(){
  vec2 q = vUV - 0.5;
  vec3 col = turned(q, wheel);
  if (trail > 0.01) {
    for (int k = 1; k <= TRAILS; k++) {
      float u = float(k) / float(TRAILS);
      col += 0.42 * (1. - float(k) / float(TRAILS + 1)) * turned(q, wheel - trail * u);
    }
  }
  gl_FragColor = vec4(col * fade, 1.);
}
