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
// Neptune's Great Dark Spot: xy where it is on the map, z 1 when there is one. Its
// bright companion clouds (methane ice riding over the storm) are drawn in and shift.
uniform vec3 storm;
uniform float time;
// Ring plane normal (zero when the planet has no rings) and the ring radii in planet radii.
uniform vec3 ringNormal;
uniform float ringInner;
uniform float ringOuter;
// The shadows of its moons (core/shadows.js), in planet radii: where each moon is from
// the planet's centre, and its shadow's edge (x: fully dark out to here, y: no shadow
// from here, z: how dark the middle is; y is zero for an unused slot).
// Light thrown back by the planet a moon goes round (earthshine on the Moon): xyz the
// way to the planet, w how strong; and its colour (core/shine.js).
uniform vec4 shine;
uniform vec3 shineColor;
uniform vec4 shadeAt[6];
uniform vec3 shadeEdge[6];
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
// A layer whose cells are only a few pixels wide is left out: craters smaller than a
// pixel tip the ground at random from one pixel to the next, and it showed as black
// specks all over Triton, where the blurred side is drawn this way from any distance.
// pixel: how much ground one pixel covers, in scene units.
// Returns a shade for the colour (x) and how the ground's height (in scene units)
// changes across the screen (yz: per pixel to the right, per pixel up). That change is
// taken from the craters' own shape, layer by layer, and only then weighed: strength
// and height differ from pixel to pixel where the map is half blurred, and the change
// of the weighed height made the ground there tip at random (black dashes on Triton).
vec3 closeGround(vec3 p, float strength, float height, float pixel) {
  vec3 sum = vec3(0.);
  float freq = 30.;
  float from = 3.;
  for (int k = 0; k < 5; k++) {
    float w = strength * (1. - smoothstep(from * .45, from, height)) * smoothstep(3., 9., radius / (freq * pixel));
    if (w > .002) {
      vec2 f = craterField(p * freq + float(k) * 17.3);
      // The map already shows the largest craters: the widest layer only hints.
      float keep = k == 0 ? .4 : 1.;
      sum += w * keep * vec3(f.y, vec2(dFdx(f.x), dFdy(f.x)) * radius / freq);
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

  if (storm.z > 0.) {
    // Across the spot: x along the latitude (wrapped), y across it; the spot is an oval
    // about twice as wide as it is tall.
    vec2 fromSpot = vec2((fract(vUV.x - storm.x + .5) - .5) * 2., vUV.y - storm.y);
    vec2 oval = fromSpot / vec2(.085, .05);
    float inSpot = 1. - smoothstep(.55, 1., length(oval));
    col = mix(col, col * vec3(.5, .58, .78), inSpot * .55);
    // Thin white streaks along its rim, mostly on the side toward the south pole (v
    // grows southward), that creep and change (Voyager watched them change within hours).
    float rim = exp(-pow((length(oval) - 1.05) / .22, 2.));
    float side = smoothstep(-.1, .6, oval.y);
    float wisps = smoothstep(.5, .78, fbm(vec2(fromSpot.x * 60. + time * .02, fromSpot.y * 260. - time * .015)));
    col = mix(col, vec3(.95, .97, 1.), rim * side * wisps * .85);
    // The small bright cloud farther south that went round faster (the "Scooter").
    vec2 fromScooter = vec2((fract(vUV.x - storm.x - .08 + time * .0006 + .5) - .5) * 2., vUV.y - storm.y - .11);
    col = mix(col, vec3(.92, .95, 1.), (1. - smoothstep(.2, 1., length(fromScooter / vec2(.02, .008)))) * .7);
  }
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
    vec3 sx = dFdx(wp);
    vec3 sy = dFdy(wp);
    vec3 ground = closeGround(lp, strength, height, max(length(sx), length(sy)));
    // Under a high Sun there is no shade in the bowls to carry them, and the pale rims
    // alone looked like bubbles: there they are painted fainter.
    col *= 1. + ground.x * mix(1., .45, smoothstep(.5, 1., max(dot(N, sun), 0.)));
    // Tip the surface by the slope of that ground, so rims catch the Sun and bowls
    // hold shadow (the slope is read from how the height changes across the screen).
    vec3 r1 = cross(sy, N);
    vec3 r2 = cross(N, sx);
    float det = dot(sx, r1);
    vec3 grad = 1.6 * sign(det) * (ground.y * r1 + ground.z * r2);
    // No slope steeper than 56 degrees: a crater's wall is not, and a stray value
    // must not turn the ground away from the Sun.
    grad *= min(1., 1.5 * abs(det) / max(length(grad), 1e-12));
    N = normalize(abs(det) * N - grad);
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
  // The shadows of its moons: how far this spot is from the line that runs from the
  // moon's centre straight away from the Sun.
  vec3 spot = normalize(n);
  for (int k = 0; k < 6; k++) {
    vec3 edge = shadeEdge[k];
    if (edge.y <= 0.) continue;
    vec3 toMoon = shadeAt[k].xyz - spot;
    float along = dot(toMoon, sun);
    if (along <= 0.) continue;
    float off = length(toMoon - sun * along);
    lit *= 1. - .92 * edge.z * (1. - smoothstep(edge.x, edge.y, off));
  }
  float facing = max(dot(N, V), 0.);
  // Atmosphere: a soft glow on the lit limb.
  float rim = pow(1. - facing, 3.) * haze * smoothstep(-.25, .35, l);
  // From behind, the haze scatters sunlight on toward the viewer: a glowing ring.
  float beyond = max(dot(-V, sun), 0.);
  // (By the smooth globe, not the cratered ground: its slopes would sparkle.)
  float limbEdge = 1. - max(dot(normalize(n), V), 0.);
  vec3 light = col * lit + baseColor * rim + rimColor * pow(limbEdge, 4.) * beyond * beyond * rimLight;
  // The planet's light on the side turned to it: it shows where the Sun does not reach.
  light += col * shineColor * max(dot(N, shine.xyz), 0.) * shine.w;
  if (glint > 0.) {
    vec3 H = normalize(sun + V);
    float lakes = smoothstep(.55, .8, lp.y) * smoothstep(.42, .6, fbm(lp.xz * 9. + 3.));
    light += vec3(1., .86, .6) * pow(max(dot(N, H), 0.), 140.) * lakes * glint * 2.5;
  }
  // Close over a cratered world at its noon the whole view was white: the map shows
  // 2.7 km a pixel at best, so from 160 km up it is one even glare (Danuri over the
  // Moon). Near the ground under a high Sun everything is turned down together, as an
  // eye takes in a bright ground, so the ground keeps its markings; a landing site in a
  // low Sun is untouched.
  if (craters > 0.) {
    float nearness = 1. - smoothstep(.05, .5, close);
    // (By how cratered the world is: the Moon in full, Mars a third, which is darker anyway.)
    light /= 1. + craters * nearness * .75 * smoothstep(.6, 1., max(dot(normalize(n), sun), 0.));
  }
  gl_FragColor = vec4(pow(light, vec3(.92)), 1.);
}
