precision highp float;
varying vec3 wp;
// Galactic north pole and the direction of the galactic centre (Sagittarius), both in
// the game's axes (y is north of the planets' plane).
uniform vec3 pole;
uniform vec3 centre;
#include<noise>
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
  gl_FragColor = vec4(col, 1.);
}
