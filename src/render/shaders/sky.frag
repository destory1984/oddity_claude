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
#include<noise>
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
  gl_FragColor = vec4(col, 1.);
}
