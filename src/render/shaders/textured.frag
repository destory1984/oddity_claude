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
// Jupiter's polar cyclones, as Juno found them in 2016: one over each pole and a ring
// of others round it, eight in the north and five in the south, that have kept their
// places for years. [strength, size (1 = their true size), how fast the arms turn].
uniform vec3 cyclones;
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
// A faint glow of its own on the night side (Venus's ashen light).
// Jupiter: its belts and zones go round at different rates, so the stripes slide past
// each other (flow: how fast, in turns a second at most). Mars: the dark tracks dust
// devils leave, seen from close by.
uniform float flow;
uniform float tracks;
// Mars: the white cap of ice over its south pole (how far it reaches, 0 for none).
uniform float polarCap;
// Four sights more, each on one world (0 elsewhere): x Saturn, the rain of its rings;
// y Io, its lakes of lava; z Mars, dust devils walking; w Titan, clouds of methane.
uniform vec4 sights;
uniform vec3 nightGlow;
// A thin layer of air that shines of itself over the whole night side, brightest seen
// edge on along the limb (Venus's green oxygen light).
uniform vec3 nightAir;
// The glory: rings of colour on the cloud tops round the point straight away from the
// Sun as she sees it (her own shadow's place), where droplets send light back the way it
// came. x: how strong; y: degrees from its middle to its first ring; z: how many rings.
uniform vec3 glory;
uniform vec4 shine;
// Earth's shadow coming over the Moon in a lunar eclipse (core/eclipses.js): xyz the
// side it comes from, w how far it has come (0 none, 1 all of the disc).
uniform vec4 eclipsed;
// The Moon's own sights (planets.js LOOKS moon `lunar`): x the opposition surge, y the
// rays of Tycho, z the minerals' colours (a choice in photo mode). rayFrom: Tycho in
// the body's own frame (as lp).
uniform vec3 lunar;
uniform vec3 rayFrom;
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

// One steady number in -0.5..0.5 for each belt.
float beltSpeed(float belt) {
  return fract(sin(belt * 91.7 + 3.1) * 43758.5453) - .5;
}

// The map at u (which may run past 1: the map repeats round the globe by itself, and
// wrapping the number here would leave a line where it jumps from 1 to 0). The seam
// where the map's left and right edges meet is hidden: over the last third of a degree
// each side it fades to the average of the two edges (`across`). (A band of three
// degrees each side showed from close by as 170 km of smeared streaks across the Moon.)
// The seam is found on the map itself, so it is hidden too where the map is slid round.
vec3 mapAt(float u, vec3 across) {
  float along = fract(u);
  float edge = min(along, 1. - along);
  return mix(across, texture2D(map, vec2(u, vUV.y)).rgb, smoothstep(.0002, .001, edge));
}

void main(){
  vec3 across = .5 * (texture2D(map, vec2(.001, vUV.y)).rgb + texture2D(map, vec2(.999, vUV.y)).rgb);
  vec3 col;
  if (flow > 0.) {
    // Fourteen belts from pole to pole, each carried round at its own rate; across the
    // edge between two the map is cross-faded, so no line is cut through the clouds.
    // Two layers take turns: one holds the even belts, the other the odd ones, and a
    // layer steps to its next belt only where it is not seen. (Where a layer's place on
    // the map jumps, the card reads the most blurred copy of the map for a row of
    // pixels: seen, that was a pale dashed line along every belt's edge.)
    float at = vUV.y * 14. - .5;
    float pair = fract(at * .5) * 2.;
    float odd = smoothstep(.3, .7, pair) - smoothstep(1.3, 1.7, pair);
    float evenBelt = 2. * floor(at * .5 + .5);
    float oddBelt = 2. * floor(at * .5) + 1.;
    vec3 a = mapAt(vUV.x + time * flow * beltSpeed(evenBelt), across);
    vec3 b = mapAt(vUV.x + time * flow * beltSpeed(oddBelt), across);
    col = mix(a, b, odd);
  } else {
    col = mapAt(vUV.x, across);
  }
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
  if (polarCap > 0.) {
    // Carbon dioxide ice from the pole out to about latitude 80, with a ragged edge:
    // the ground the dark spring jets burst out of.
    float edge = -.985 + .012 * (fbm(lp.xz * 18.) - .5) * 2.;
    float ice = smoothstep(edge + .006, edge - .006, lp.y) * polarCap;
    col = mix(col, vec3(.94, .92, .9) * (.9 + .2 * fbm(lp.xz * 60.)), ice);
  }
  if (tracks > 0. && close < .3) {
    // Thin dark wandering lines in patches: where a dust devil has swept the pale dust
    // off the darker ground. They come into view within a third of a radius.
    float wander = fbm(lp.zy * 40. + 2.) * 9. + fbm(lp.xy * 40. + 5.) * 9.;
    float line = smoothstep(.06, 0., abs(sin(lp.x * 700. + lp.z * 500. + wander)));
    float swept = smoothstep(.5, .68, fbm(lp.xz * 11. + lp.y * 7.));
    col *= 1. - .28 * line * swept * tracks * (1. - smoothstep(.1, .3, close));
  }

  if (sights.z > 0. && close < .3) {
    // Dust devils: here and there a pale puff walks across the ground along its own
    // straight way, comes out of nothing and thins away again, trailing a little dust.
    // (A real one is a few hundred metres wide and up to 8 km tall: drawn 10 km wide to
    // be seen from above.) They come into view within a third of a radius.
    vec3 gp = lp * 50.;
    vec3 gi = floor(gp);
    vec3 gf = fract(gp);
    float puff = 0.;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        for (int z = -1; z <= 1; z++) {
          vec3 g = vec3(float(x), float(y), float(z));
          vec3 o = hash3(gi + g);
          if (o.y > .3) continue;
          vec3 way = normalize(hash3(gi + g + 31.) - .5);
          float walk = fract(time * (.012 + .01 * o.x) + o.z);
          vec3 d = g + vec3(.5) + way * (walk - .5) * .9 - gf;
          float back = dot(d, way);
          float aside = length(d - way * back);
          float body = exp(-dot(d, d) / .006);
          float trail = back > 0. ? exp(-pow(aside / .045, 2.)) * exp(-back / .3) * .45 : 0.;
          puff += (body + trail) * sin(walk * 3.14159);
        }
      }
    }
    col = mix(col, vec3(1., .93, .82), clamp(puff, 0., 1.) * .9 * sights.z * (1. - smoothstep(.15, .3, close)));
  }
  if (sights.w > 0.) {
    // Titan: streaks of white methane cloud at its southern middle latitudes and over
    // the lakes of the north, carried slowly east.
    float ca = vUV.x * 6.28318 + time * .004;
    float streaks = smoothstep(.55, .75, fbm(vec2(cos(ca), sin(ca)) * 5. + vec2(vUV.y * 46., 3.)));
    float where = exp(-pow((lp.y + .62) / .08, 2.)) + .7 * smoothstep(.72, .86, lp.y);
    col = mix(col, vec3(1., .95, .86), streaks * where * .55 * sights.w);
  }

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
  float poleLight = 0.;
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
  if (hexagon > 0. && lp.y < -.9) {
    // The storm on the south pole (Cassini, 2006): a dark eye 8,000 km across, its wall
    // of cloud standing bright round it, and bands of cloud wound in round it.
    float polar = acos(clamp(-lp.y, -1., 1.));
    float a = atan(lp.z, lp.x);
    float eye = 1. - smoothstep(.05, .072, polar);
    col = mix(col, col * vec3(.55, .5, .48), eye * hexagon);
    col = mix(col, min(col * 1.3 + .06, vec3(1.)), exp(-pow((polar - .078) / .012, 2.)) * .7 * hexagon);
    float arms = smoothstep(.085, .11, polar) * (1. - smoothstep(.17, .26, polar));
    col *= 1. - .2 * arms * (.5 + .5 * sin(a * 3. + polar * 70.)) * hexagon;
    // (Along the edge of day, as Jupiter's poles: a little light of its own.)
    poleLight = (1. - smoothstep(.2, .32, polar)) * hexagon;
  }
  // (The poles lie along the edge of day: the cap keeps a little light of its own there,
  // or nothing of it would show.)
  if (cyclones.x > 0. && abs(lp.y) > .7) {
    float north = step(0., lp.y);
    float count = mix(5., 8., north);
    // (In the north they stand 7 degrees from the pole and are 4,000 km and more across;
    // the southern five are larger.)
    float ringAt = .125 * cyclones.y;
    float size = mix(.058, .046, north) * cyclones.y;
    float polar = acos(clamp(abs(lp.y), -1., 1.));
    float a = atan(lp.z, lp.x) * (north * 2. - 1.);
    vec2 onCap = polar * vec2(cos(a), sin(a));
    // The poles are bluer than the belts.
    float cap = 1. - smoothstep(ringAt + size * 1.5, ringAt + size * 3.5, polar);
    col = mix(col, dot(col, vec3(.4)) * vec3(.7, .86, 1.15), cap * .65 * cyclones.x);
    poleLight = cap * cyclones.x;
    float swirl = 0.;
    float eye = 0.;
    for (int k = 0; k < 9; k++) {
      if (float(k) > count) break;
      float at = (float(k) - 1.) * 6.2832 / count + .3;
      vec2 centre = k == 0 ? vec2(0.) : ringAt * vec2(cos(at), sin(at));
      vec2 from = onCap - centre;
      float d = length(from) / size;
      if (d < 2.) {
        float arms = .5 + .5 * sin(atan(from.y, from.x) * 2. + d * 5.5 - time * cyclones.z + float(k));
        float body = exp(-d * d * 1.5);
        swirl = max(swirl, body * (.35 + .65 * arms) * smoothstep(0., .25, d));
        eye = max(eye, exp(-d * d * 40.));
      }
    }
    col = mix(col, vec3(1., .96, .88), swirl * .9 * cyclones.x);
    col *= 1. - .45 * eye * cyclones.x;
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
  lit += poleLight * .3 * smoothstep(-.35, .05, l);
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
  if (nightGlow.r + nightGlow.g + nightGlow.b > 0.) {
    light += nightGlow * (1. - smoothstep(-.15, .1, l)) * (.5 + fbm(lp.xz * 3. + lp.y * 2. + time * .01));
  }
  if (nightAir.r + nightAir.g + nightAir.b > 0.) {
    float mottle = .65 + .7 * fbm(lp.xz * 2. + lp.y * 1.5 + time * .02);
    // (It shines high over the clouds: standing on the ground under them she saw the
    // ground itself green. It comes in between 60 and 240 km up.)
    // (Against the Sun the rim is the haze's ring of sunlight: the faint green gives way to it.)
    light += nightAir * (.16 + pow(limbEdge, 5.) * 1.2 * (1. - .85 * beyond * beyond)) * (1. - smoothstep(-.2, .05, l)) * mottle * smoothstep(.01, .04, close);
  }
  if (glory.x > 0.) {
    // How far this spot is from sending the Sun's light straight back to her, in rings.
    float turned = degrees(acos(clamp(dot(sun, V), -1., 1.))) / glory.y;
    if (turned < glory.z + .5) {
      // Each colour's rings stand a little apart, red outermost: white in the middle,
      // then a dark gap, then rings blue within and red without, paler each time.
      vec3 rings = pow(cos(3.14159 * turned / vec3(1.12, 1., .86)), vec3(2.));
      float fade = exp(-turned * .55) * (1. - smoothstep(glory.z - .5, glory.z + .5, turned)) * smoothstep(0., .25, l) * glory.x;
      light = light * (1. - .34 * fade) + rings * fade * .5;
    }
  }
  // The planet's light on the side turned to it: it shows where the Sun does not reach.
  light += col * shineColor * max(dot(N, shine.xyz), 0.) * shine.w;
  if (sights.x > 0.) {
    // Saturn, the rain of the rings: ice from the rings slides down the magnetic field
    // and falls on the middle latitudes of both halves. Thin pale streaks come down
    // toward the equator there, each at its own pace, clearest on the night side.
    float alat = abs(lp.y);
    float belt = smoothstep(.56, .62, alat) * (1. - smoothstep(.78, .84, alat));
    if (belt > 0.) {
      float down = (alat - .56) / .28;
      float around = atan(lp.z, lp.x);
      float drops = 0.;
      for (int k = 0; k < 2; k++) {
        float fk = float(k);
        float lane = around * (70. + 37. * fk) + fk * 1.7;
        float id = floor(lane);
        float h = fract(sin(id * 91.7 + fk * 13.) * 43758.5453);
        float at = 1. - fract(time * (.07 + .09 * h) + h * 7.);
        float above = down - at;
        drops += exp(-pow((fract(lane) - .5) / .11, 2.)) * (above > 0. ? exp(-above / .16) : 0.) * smoothstep(.0, .12, at);
      }
      light += vec3(.72, .88, 1.) * drops * belt * sights.x * .3 * (1.15 - .85 * smoothstep(-.1, .3, l));
    }
  }
  if (sights.y > 0.) {
    // Io, the lakes of lava: red spots on its ground that breathe, each brightening
    // as its cooled crust founders and dimming as a new one forms. They show at night;
    // by day the sunlit ground drowns them.
    vec3 gp = lp * 6.;
    vec3 gi = floor(gp);
    vec3 gf = fract(gp);
    float lava = 0.;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        for (int z = -1; z <= 1; z++) {
          vec3 g = vec3(float(x), float(y), float(z));
          vec3 o = hash3(gi + g);
          if (o.y > .45) continue;
          float d = length(g + o - gf);
          // (.05 + .09 at first: "너무 작아.. 조금 더 키워줘", the user, 2026-10-06.)
          float size = .09 + .14 * o.x;
          lava += exp(-pow(d / size, 2.)) * (.55 + .45 * sin(time * (.35 + .5 * o.z) + o.x * 40.));
        }
      }
    }
    lava = min(lava, 1.2);
    light += (vec3(1., .3, .05) * lava + vec3(1., .75, .3) * pow(lava, 3.) * .6) * sights.y * 1.8 * (1. - .8 * smoothstep(-.1, .25, l));
  }
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
  if (lunar.y > 0.) {
    // Tycho's rays (the user, 2026-10-18, "모두 넣자"): streaks of rock thrown out by
    // the crater, up to 1,500 km long, each of its own length and width, brightest under
    // a high Sun; and the crater's bright rim, 86 km across.
    float dd = acos(clamp(dot(lp, rayFrom), -1., 1.));
    vec3 e1 = normalize(cross(rayFrom, vec3(0., 1., 0.)));
    vec3 e2 = cross(rayFrom, e1);
    float around = atan(dot(lp, e2), dot(lp, e1)) / 6.28318 + .5;
    float rays = 0.;
    for (int k = 0; k < 2; k++) {
      float s = around * (34. + 19. * float(k)) + float(k) * .37;
      float id = floor(s);
      float h = fract(sin(id * 12.9898 + float(k) * 4.1) * 43758.5453);
      float h2 = fract(sin(id * 78.233 + float(k) * 9.7) * 12345.678);
      float across = abs(fract(s) - .5 - (h2 - .5) * .3);
      float reach = .12 + .55 * h2 * h2;
      rays += step(.35, h) * (1. - smoothstep(0., .05 + .1 * h, across)) * exp(-dd / reach) * (.5 + .5 * h2);
    }
    rays = min(rays, 1.) * smoothstep(.035, .07, dd) * (1. - smoothstep(.9, 1.2, dd));
    float pit = exp(-pow((dd - .022) / .009, 2.)) * .8 + exp(-pow(dd / .016, 2.)) * .4;
    light += col * (rays * .55 + pit) * max(l, 0.) * lunar.y * 1.4;
  }
  if (lunar.x > 0.) {
    // The opposition surge: with the Sun straight behind her every stone hides its own
    // shadow, and the ground brightens sharply round the point opposite the Sun (why a
    // full Moon is some ten times brighter than a half one).
    float phase = acos(clamp(dot(sun, V), -1., 1.));
    light *= 1. + lunar.x * (1.1 * exp(-phase / .03) + .35 * exp(-phase / .14));
  }
  if (lunar.z > 0.) {
    // The minerals' colours, as Galileo's enhanced-colour pictures show them: the seas
    // rich in titanium blue, the poorer ones and the highlands orange.
    float lm = dot(col, vec3(.299, .587, .114));
    light *= mix(vec3(1.), mix(vec3(.45, .6, 1.2), vec3(1.15, .8, .52), smoothstep(.3, .52, lm)), .65 * lunar.z) * (1. + .08 * lunar.z);
  }
  if (eclipsed.w > 0.) {
    // The shadow's edge crosses the globe; under it the ground is lit only by the red
    // light bent round Earth: copper (brighter since 2026-10-18, as photographs show
    // it), and along the shadow's edge a thin blue band, sunlight that came through the
    // ozone high in Earth's air.
    float edge = 1.2 - 2.4 * eclipsed.w;
    float across = dot(normalize(n), eclipsed.xyz);
    float under = smoothstep(edge - .22, edge + .22, across);
    light = mix(light, col * vec3(.62, .17, .06) * 1.25, under);
    light += vec3(.25, .5, 1.) * exp(-pow((across - edge) / .06, 2.)) * .22 * max(dot(normalize(n), V), 0.);
  }
  gl_FragColor = vec4(pow(light, vec3(.92)), 1.);
}
