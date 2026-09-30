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
uniform float craters;
#include<noise>

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}

// Bowl-shaped craters with bright rims, scattered in 3D so there is no seam.
float craterField(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float shade = 0.;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 o = hash3(i + g);
        float d = length(g + o - f);
        float size = .18 + .32 * o.x;
        float rim = smoothstep(size * 1.2, size, d) * smoothstep(size * .7, size, d);
        float bowl = 1. - smoothstep(0., size * .95, d);
        shade += rim * .35 - bowl * .28;
      }
    }
  }
  return shade;
}

void main(){
  float ang = vUV.x * 6.28318;
  vec2 around = vec2(cos(ang), sin(ang));
  float large = fbm(around * 2. + vec2(vUV.y * 7., 3.));
  float fine = fbm(around * 9. + vec2(vUV.y * 30., 11.));
  vec3 col = mix(colorA, colorB, smoothstep(.3, .7, large));
  col *= 1. + (fine - .5) * contrast;
  vec3 N = normalize(n);
  if (craters > 0.) {
    col *= 1. + craters * (craterField(N * 5.) + .6 * craterField(N * 13.) + .35 * craterField(N * 31.));
  }
  float polar = smoothstep(1. - cap, 1. - cap + .03, abs(vUV.y - .5) * 2.);
  col = mix(col, vec3(.93, .93, .96), polar * step(.001, cap));
  vec3 V = normalize(-wp);
  float l = dot(N, sun);
  float lit = max(l, 0.) * 1.2 + .02;
  float rim = pow(1. - max(dot(N, V), 0.), 3.) * haze * smoothstep(-.2, .4, l);
  gl_FragColor = vec4(pow(max(col, 0.) * lit + colorB * rim, vec3(.9)), 1.);
}
