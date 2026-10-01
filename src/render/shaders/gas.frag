precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform vec3 colorA;
uniform vec3 colorB;
uniform vec3 colorC;
uniform float bands;
uniform float turbulence;
uniform float spot;
#include<noise>
void main(){
  float lat = vUV.y;
  // Longitude wraps at u = 0/1; sample noise on a circle so the seam does not show.
  float ang = vUV.x * 6.28318;
  vec2 around = vec2(cos(ang), sin(ang));
  float warp = fbm(around * 2.5 + vec2(lat * 24., 0.)) * turbulence;
  float band = sin((lat + warp * .045) * bands * 3.14159);
  vec3 col = mix(colorA, colorB, smoothstep(-.45, .45, band));
  float streak = fbm(around * 6. + vec2(0., lat * 70.));
  col = mix(col, colorC, smoothstep(.55, .9, streak) * .4);
  if (spot > .5) {
    vec2 d = vec2(atan(sin(ang - 1.9), cos(ang - 1.9)) * 1.6, (lat - .38) * 9.);
    float s = 1. - smoothstep(.55, 1., length(d));
    col = mix(col, vec3(.74, .34, .2), s * .85);
  }
  vec3 N = normalize(n);
  vec3 V = normalize(-wp);
  float l = dot(N, sun);
  float lit = smoothstep(-.08, .25, l) * max(l, 0.) * 1.15 + .1;
  float limb = pow(max(dot(N, V), 0.), .35);
  gl_FragColor = vec4(pow(col * lit * limb, vec3(.9)), 1.);
}
