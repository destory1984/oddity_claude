#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
varying vec3 lp;
uniform vec3 sun;
uniform sampler2D map;
uniform vec3 tint;
uniform vec3 baseColor;
uniform float saturation;
uniform float mapWeight;
uniform float haze;
uniform float detail;
// Close-up ground for airless, cratered worlds. craters: 0 (none: clouds, ice, gas) to 1
// (the Moon). close: the camera's height above the ground in body radii. radius: the
// body's radius in scene units.
uniform float craters;
uniform float close;
uniform float radius;
// 1 for a world mapped sharply on one side only (Pluto, Charon, Triton: one fly-by
// each). Where the map is a blur, craters and mottling are drawn in from any distance.
uniform float patchy;
// A thin atmosphere seen from behind, with the Sun beyond: its edge glows in this
// colour (blue round Pluto, orange round Titan, the blue dusk of Mars). rimLight: how strongly.
uniform vec3 rimColor;
uniform float rimLight;
// 1 for Saturn: the six-sided jet stream round its north pole.
uniform float hexagon;
// 1 for Titan: sunlight glinting off the lakes round its north pole.
uniform float glint;
// Ring plane normal (zero when the planet has no rings) and the ring radii in planet radii.
uniform vec3 ringNormal;
uniform float ringInner;
uniform float ringOuter;
#include<noise>
#include<rings>

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}

// Bowl-shaped craters with raised rims, scattered in 3D so there is no seam. Two of
// every five cells stay empty, so the ground is not evenly pocked.
// x: the ground's height in cells (a bowl is a fifth as deep as it is wide, as real
// simple craters are); y: a shade for the colour (rims pale, floors a little darker).
vec2 craterField(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec2 sum = vec2(0.);
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 o = hash3(i + g);
        if (o.y > .6) continue;
        float d = length(g + o - f);
        float size = .1 + .34 * o.x * o.x;
        float rim = smoothstep(size * 1.5, size, d) * smoothstep(size * .8, size, d);
        float bowl = 1. - smoothstep(0., size, d);
        sum += vec2(size * (rim * .08 - bowl * bowl * .4), rim * .12 - bowl * .1);
      }
    }
  }
  return sum;
}

// The map shows 2.7 km a pixel at best, so from close by the ground would be a blur.
// Finer and finer craters come in as the camera nears the ground: 60 km ones from
// three radii up, down to 700 m ones from a twenty-fifth of a radius.
// Returns the height in scene units (x) and a shade for the colour (y).
vec2 closeGround(vec3 p, float strength, float height) {
  vec2 sum = vec2(0.);
  float freq = 30.;
  float from = 3.;
  for (int k = 0; k < 5; k++) {
    float w = strength * (1. - smoothstep(from * .45, from, height));
    if (w > .002) {
      vec2 f = craterField(p * freq + float(k) * 17.3);
      // The map already shows the largest craters: the widest layer only hints.
      float keep = k == 0 ? .4 : 1.;
      sum += w * keep * vec2(f.x * radius / freq, f.y);
    }
    freq *= 3.;
    from *= .34;
  }
  return sum;
}

void main(){
  vec3 col = texture2D(map, vUV).rgb;
  // Hide the seam where the map's left and right edges meet: over the last third of a
  // degree each side, fade to the average of the two edges. (A band of three degrees
  // each side showed from close by as 170 km of smeared streaks across the Moon.)
  float edge = min(vUV.x, 1. - vUV.x);
  vec3 across = .5 * (texture2D(map, vec2(.001, vUV.y)).rgb + texture2D(map, vec2(.999, vUV.y)).rgb);
  col = mix(across, col, smoothstep(.0002, .001, edge));
  // How blurred the map is here, 0 (sharp) to 1: how little two softened copies of it
  // differ, taken over a small neighbourhood so the answer itself is smooth.
  float blurred = 0.;
  if (patchy > 0.) {
    float busy = 0.;
    for (int k = 0; k < 4; k++) {
      vec2 at = vUV + vec2(k < 2 ? .012 : -.012, (k == 0 || k == 2) ? .016 : -.016);
      busy += abs(dot(texture2D(map, at, 2.).rgb - texture2D(map, at, 5.).rgb, vec3(.333)));
    }
    blurred = patchy * (1. - smoothstep(.006, .022, busy * .25));
  }
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  // Some maps have no data near the poles (black): fill with the base color.
  col = mix(baseColor, col, smoothstep(0.02, 0.08, lum));
  col = mix(vec3(lum), col, saturation) * tint;
  // Venus: thick clouds hide most of the surface map.
  col = mix(baseColor, col, mapWeight);
  // Fine grain so low-resolution maps do not look blurry up close.
  float ang = vUV.x * 6.28318;
  // Stretched along longitude, like wind-drawn bands and dust streaks.
  float grain = fbm(vec2(cos(ang), sin(ang)) * 6. + vec2(vUV.y * 160., 5.)) * .6 + fbm(vec2(cos(ang), sin(ang)) * 24. + vec2(vUV.y * 90., 9.)) * .4;
  // A cratered world has no wind: its grain is the same in every direction (the
  // stretched kind showed from close by as streaks across the Moon).
  if (craters > 0.) {
    vec3 w3 = abs(lp) / (abs(lp.x) + abs(lp.y) + abs(lp.z));
    float even = fbm(lp.xy * 190.) * w3.z + fbm(lp.yz * 190. + 7.) * w3.x + fbm(lp.zx * 190. + 13.) * w3.y;
    grain = mix(grain, even, min(1., craters * 3.));
  }
  col *= 1. + (grain - .5) * detail;

  if (hexagon > 0. && lp.y > .9) {
    // A hexagon 12 degrees out from the pole (latitude 78), darker and bluer inside,
    // with a dark rim and the eye of the polar storm in the middle.
    float polar = acos(clamp(lp.y, -1., 1.));
    float a = atan(lp.z, lp.x);
    float side = .19 / cos(mod(a, 1.0472) - .5236);
    float inside = 1. - smoothstep(side - .012, side + .012, polar);
    col = mix(col, col * vec3(.7, .8, .98), inside * .6 * hexagon);
    col *= 1. - .4 * exp(-pow((polar - side) / .012, 2.)) * hexagon;
    col *= 1. - .55 * exp(-pow(polar / .035, 2.)) * hexagon;
  }
  vec3 N = normalize(n);
  // On the blurred side the ground is drawn as if from close by, and more strongly.
  float strength = mix(craters, 1., blurred);
  float height = mix(close, min(close, .3), blurred);
  if (blurred > 0.) {
    vec3 w3 = abs(lp) / (abs(lp.x) + abs(lp.y) + abs(lp.z));
    float mottle = fbm(lp.xy * 14.) * w3.z + fbm(lp.yz * 14. + 3.) * w3.x + fbm(lp.zx * 14. + 9.) * w3.y;
    float fine = fbm(lp.xy * 55. + 1.) * w3.z + fbm(lp.yz * 55. + 5.) * w3.x + fbm(lp.zx * 55. + 2.) * w3.y;
    col *= 1. + blurred * ((mottle - .5) * .6 + (fine - .5) * .45);
  }
  if (strength > 0. && height < 3.) {
    vec2 ground = closeGround(lp, strength, height);
    col *= 1. + ground.y;
    // Tip the surface by the slope of that ground, so rims catch the Sun and bowls
    // hold shadow (the slope is read from how the height changes across the screen).
    vec3 sx = dFdx(wp);
    vec3 sy = dFdy(wp);
    vec3 r1 = cross(sy, N);
    vec3 r2 = cross(N, sx);
    float det = dot(sx, r1);
    vec3 grad = sign(det) * (dFdx(ground.x) * r1 + dFdy(ground.x) * r2);
    N = normalize(abs(det) * N - 1.6 * grad);
  }
  vec3 V = normalize(-wp);
  float l = dot(N, sun);
  // The night side keeps a tenth of the light, so a traveler can still see where they fly.
  float lit = smoothstep(-.06, .2, l) * max(l, 0.) * 1.15 + .1;
  // The rings' shadow: follow the sunlight back from this spot to the ring plane and
  // dim it by how dense the ring is where the ray crosses.
  float toPlane = dot(sun, ringNormal);
  if (abs(toPlane) > 1e-4) {
    float reach = -dot(N, ringNormal) / toPlane;
    if (reach > 0.) {
      float rr = length(N + sun * reach);
      lit *= 1. - .8 * ringProfile((rr - ringInner) / (ringOuter - ringInner)).a;
    }
  }
  float facing = max(dot(N, V), 0.);
  // Atmosphere: a soft glow on the lit limb.
  float rim = pow(1. - facing, 3.) * haze * smoothstep(-.25, .35, l);
  // From behind, the haze scatters sunlight on toward the viewer: a glowing ring.
  float beyond = max(dot(-V, sun), 0.);
  // (By the smooth globe, not the cratered ground: its slopes would sparkle.)
  float limbEdge = 1. - max(dot(normalize(n), V), 0.);
  vec3 light = col * lit + baseColor * rim + rimColor * pow(limbEdge, 4.) * beyond * beyond * rimLight;
  if (glint > 0.) {
    vec3 H = normalize(sun + V);
    float lakes = smoothstep(.55, .8, lp.y) * smoothstep(.42, .6, fbm(lp.xz * 9. + 3.));
    light += vec3(1., .86, .6) * pow(max(dot(N, H), 0.), 140.) * lakes * glint * 2.5;
  }
  gl_FragColor = vec4(pow(light, vec3(.92)), 1.);
}
