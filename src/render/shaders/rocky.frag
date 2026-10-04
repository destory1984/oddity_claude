#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
// The point on the body itself (unit length), turning with it (body.vert).
varying vec3 lp;
uniform mat4 world;
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

// Bowl-shaped craters with raised rims, scattered in 3D so there is no seam.
// x: a shade for the colour (rims a little paler, floors a little darker).
// yzw: the slope of the ground, how its height changes along p. A bowl is a fifth as
// deep as it is wide and its rim stands a tenth of its radius high. The slope is worked
// out from each crater's own shape, so the light falls on it as on real relief: the
// wall facing the Sun is bright and the one turned away is in shade. (Painted as pale
// rings only, the craters looked like soap bubbles.)
vec4 craterField(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec4 sum = vec4(0.);
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 o = hash3(i + g);
        vec3 from = f - (g + o);
        float d = length(from);
        float size = .18 + .32 * o.x;
        float rim = smoothstep(size * 1.2, size, d) * smoothstep(size * .7, size, d);
        float bowl = 1. - smoothstep(0., size * .95, d);
        float w = size * .18;
        float lip = exp(-pow((d - size) / w, 2.));
        float steep = .8 * d / size * (1. - smoothstep(size * .9, size, d)) - .2 * size * (d - size) / (w * w) * lip;
        sum += vec4(rim * .12 - bowl * .1, from / max(d, 1e-4) * steep);
      }
    }
  }
  return sum;
}

void main(){
  float ang = vUV.x * 6.28318;
  vec2 around = vec2(cos(ang), sin(ang));
  float large = fbm(around * 2. + vec2(vUV.y * 7., 3.));
  float fine = fbm(around * 9. + vec2(vUV.y * 30., 11.));
  vec3 col = mix(colorA, colorB, smoothstep(.3, .7, large));
  col *= 1. + (fine - .5) * contrast;
  vec3 N = normalize(n);
  // The ground as lit: the smooth ball tipped by the slope of its craters.
  vec3 ground = N;
  if (craters > 0.) {
    // Three sizes of crater. A size whose cells are only a few pixels wide is left out:
    // smaller than a pixel, its slopes would sparkle.
    // They are laid out on the body itself, so they turn with it (laid out by the
    // direction in space, they stood still while the ball turned under them); the
    // slope is then carried out to space by the body's turn.
    vec3 at = normalize(lp);
    float pixel = max(length(dFdx(at)), length(dFdy(at)));
    vec4 relief = craterField(at * 5.) * smoothstep(3., 9., 1. / (5. * pixel))
      + craterField(at * 13.) * .8 * smoothstep(3., 9., 1. / (13. * pixel))
      + craterField(at * 31.) * .6 * smoothstep(3., 9., 1. / (31. * pixel));
    col *= 1. + craters * relief.x;
    vec3 slope = mat3(world) * (relief.yzw - at * dot(relief.yzw, at));
    ground = normalize(N - craters * slope);
  }
  float polar = smoothstep(1. - cap, 1. - cap + .03, abs(vUV.y - .5) * 2.);
  col = mix(col, vec3(.93, .93, .96), polar * step(.001, cap));
  vec3 V = normalize(-wp);
  float l = dot(N, sun);
  // Shade from the relief only where the ball itself is in daylight.
  float lit = max(dot(ground, sun), 0.) * smoothstep(-.05, .1, l) * 1.2 + .1;
  float rim = pow(1. - max(dot(N, V), 0.), 3.) * haze * smoothstep(-.2, .4, l);
  gl_FragColor = vec4(pow(max(col, 0.) * lit + colorB * rim, vec3(.9)), 1.);
}
