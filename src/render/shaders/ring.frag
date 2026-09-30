precision highp float;
varying vec2 vUV;
uniform vec3 sunLight;
uniform float inner;
uniform float outer;
#include<noise>
void main(){
  float r = length(vUV - .5) * 2.;
  if (r < inner || r > 1.) discard;
  float t = (r - inner) / (1. - inner);
  float rings = .55 + .45 * sin(t * 180.) * sin(t * 37. + 1.3);
  float gap = 1. - smoothstep(.0, .012, abs(t - .72)) * .9;
  float density = rings * gap * smoothstep(0., .04, t) * (1. - smoothstep(.96, 1., t));
  vec3 col = mix(vec3(.72, .64, .5), vec3(.93, .86, .72), noise(vec2(t * 90., 0.)));
  gl_FragColor = vec4(col * sunLight, density * .85);
}
