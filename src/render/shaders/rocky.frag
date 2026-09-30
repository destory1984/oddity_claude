precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform vec3 colorA;
uniform vec3 colorB;
uniform float cap;
uniform float haze;
uniform float contrast;
#include<noise>
void main(){
  float ang = vUV.x * 6.28318;
  vec2 around = vec2(cos(ang), sin(ang));
  float large = fbm(around * 2. + vec2(vUV.y * 7., 3.));
  float fine = fbm(around * 9. + vec2(vUV.y * 30., 11.));
  vec3 col = mix(colorA, colorB, smoothstep(.3, .7, large));
  col *= 1. + (fine - .5) * contrast;
  float polar = smoothstep(1. - cap, 1. - cap + .03, abs(vUV.y - .5) * 2.);
  col = mix(col, vec3(.93, .93, .96), polar * step(.001, cap));
  vec3 N = normalize(n);
  vec3 V = normalize(-wp);
  float l = dot(N, sun);
  float lit = max(l, 0.) * 1.2 + .02;
  float rim = pow(1. - max(dot(N, V), 0.), 3.) * haze * smoothstep(-.2, .4, l);
  gl_FragColor = vec4(pow(col * lit + colorB * rim, vec3(.9)), 1.);
}
