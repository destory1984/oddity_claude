precision highp float;
varying vec3 wp;
// Galactic north pole and the direction of the galactic centre (Sagittarius), both in
// the game's axes (y is north of the planets' plane).
uniform vec3 pole;
uniform vec3 centre;
// Nearby galaxies: direction, long-axis direction on the sky, and
// (half-length in radians, short/long ratio, brightness, 0 spiral or 1 irregular).
uniform vec3 galDir[4];
uniform vec3 galAxis[4];
uniform vec4 galShape[4];
// Nebulae and star clusters: direction, and (half-width in radians, kind, brightness, 0).
uniform vec3 nebDir[5];
uniform vec4 nebShape[5];
// The way to the Sun from the traveler, for the zodiacal light.
uniform vec3 sunDir;
#include<noise>
// A glowing gas cloud (kind 0), an open cluster of young blue stars (1) or a ball of
// old stars (2).
vec3 nebula(vec3 d, vec3 dir, vec4 shape) {
  float c = dot(d, dir);
  if (c < .97) return vec3(0.);
  vec3 ax = normalize(cross(dir, vec3(0., 1., 0.)));
  vec3 ay = cross(dir, ax);
  vec3 v = d - dir * c;
  vec2 p = vec2(dot(v, ax), dot(v, ay)) / shape.x;
  float r = length(p);
  if (r > 2.) return vec3(0.);
  float edge = 1. - smoothstep(1.2, 2., r);
  vec2 here = dir.xz * 30.;
  if (shape.y < .5) {
    // Ragged, with dark lanes across it; pink at the rim, bluish white at the heart.
    float cloud = fbm(p * 2.2 + here);
    float body = exp(-r * r * 1.4) * (.3 + 1.3 * cloud);
    float dark = smoothstep(.45, .7, fbm(p * 3.5 + here + 9.));
    vec3 tint = mix(vec3(1., .36, .55), vec3(.75, .84, 1.), exp(-r * r * 6.));
    return tint * body * (1. - .6 * dark) * edge * shape.z;
  }
  if (shape.y < 1.5) {
    // A blue haze with a handful of sharp stars in it.
    float haze = exp(-r * r * 2.) * .3 * (.6 + .8 * fbm(p * 3. + here));
    float stars = 0.;
    for (int k = 0; k < 8; k++) {
      vec2 at = vec2(sin(float(k) * 12.9898 + 1.) * .6, sin(float(k) * 78.233 + 2.) * .42);
      stars += exp(-dot(p - at, p - at) * 900.);
    }
    return vec3(.7, .82, 1.) * (haze + stars * 1.6) * edge * shape.z;
  }
  float ball = exp(-r * 5.) * 1.4 + exp(-r * r * 3.) * .4 * (.5 + noise(p * 40. + here));
  return vec3(1., .93, .8) * ball * edge * shape.z;
}
// A galaxy as a small glowing patch: a bright core in a soft disc. Spirals get two
// faint arms; the irregular Magellanic Clouds get a bar and ragged clumps instead.
vec3 galaxy(vec3 d, vec3 dir, vec3 axis, vec4 shape) {
  if (dot(d, dir) < .9) return vec3(0.);
  vec3 v = d - dir * dot(d, dir);
  float x = dot(v, axis) / shape.x;
  float y = dot(v, cross(dir, axis)) / (shape.x * shape.y);
  float r = length(vec2(x, y));
  if (r > 2.2) return vec3(0.);
  float edge = 1. - smoothstep(1.4, 2.2, r);
  vec2 grain = vec2(x, y) * 3. + dir.xy * 40.;
  float light;
  vec3 tint;
  if (shape.w < .5) {
    float arms = .65 + .35 * sin(atan(y, x) * 2. + log(r + .05) * 4.5);
    light = exp(-r * 7.) * 1.6 + exp(-r * r * 2.2) * .55 * arms * (.75 + .5 * fbm(grain));
    tint = mix(vec3(.78, .84, 1.), vec3(1., .9, .72), exp(-r * 4.));
  } else {
    float bar = exp(-pow(y * 2.6, 2.) - pow(x * 1.1, 2.));
    light = (exp(-r * r * 1.6) * .5 + bar * .5) * (.45 + 1.1 * fbm(grain * 1.6));
    tint = vec3(.82, .88, 1.);
  }
  return tint * light * edge * shape.z;
}
// The Milky Way as seen from inside it: a soft band of unresolved starlight round the
// whole sky, widest and brightest toward the centre, split by dark dust lanes.
void main(){
  vec3 d = normalize(wp);
  float lat = asin(clamp(dot(d, pole), -1., 1.));
  vec3 inPlane = normalize(d - pole * dot(d, pole));
  float toCentre = dot(inPlane, centre);          // 1 at the centre, -1 opposite
  vec3 side = cross(pole, centre);
  float lon = atan(dot(inPlane, side), toCentre);

  float bulge = smoothstep(.2, 1., toCentre);
  float width = mix(.11, .26, bulge);
  float band = exp(-pow(lat / width, 2.));
  float glow = band * mix(.35, 1., smoothstep(-1., 1., toCentre));

  // Clumpy star clouds, and dust lanes hugging the midplane.
  vec2 q = vec2(lon * 3., lat * 9.);
  vec2 q2 = vec2(lon + 6.2832, lat * 3.) * 3.;   // same pattern one turn on, to hide the seam
  float seam = smoothstep(2.6, 3.14, abs(lon));
  float clouds = mix(fbm(q * 1.7 + 3.), fbm(q2 * 1.7 + 3.), seam);
  float dustN = mix(fbm(q * 2.6 + 11.), fbm(q2 * 2.6 + 11.), seam);
  float lane = exp(-pow((lat + .02 * sin(lon * 3.)) / (width * .28), 2.));
  float dust = lane * smoothstep(.35, .7, dustN) * .85;

  float light = glow * (.45 + .9 * clouds) * (1. - dust);
  vec3 warm = vec3(1., .86, .66);
  vec3 cool = vec3(.72, .8, 1.);
  vec3 col = mix(cool, warm, bulge * .8 + .1) * light * .3;
  for (int i = 0; i < 4; i++) col += galaxy(d, galDir[i], galAxis[i], galShape[i]);
  for (int i = 0; i < 5; i++) col += nebula(d, nebDir[i], nebShape[i]);
  // Zodiacal light: sunlight scattered by the dust between the planets, a faint wedge
  // lying along their plane (y = 0) and brightest toward the Sun.
  float elong = acos(clamp(dot(d, sunDir), -1., 1.));
  float fromPlane = asin(clamp(d.y, -1., 1.));
  float zodiacal = exp(-elong * 1.9) * exp(-pow(fromPlane / (.09 + .2 * elong), 2.)) * .2;
  col += vec3(1., .93, .8) * zodiacal;
  // The counterglow (gegenschein): the same dust seen straight away from the Sun, where
  // every grain shows its full lit face: a faint oval some ten degrees across.
  float anti = acos(clamp(dot(d, -sunDir), -1., 1.));
  col += vec3(1., .95, .85) * exp(-pow(anti / .13, 2.)) * exp(-pow(fromPlane / .1, 2.)) * .1;
  gl_FragColor = vec4(col, 1.);
}
