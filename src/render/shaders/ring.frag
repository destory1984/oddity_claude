precision highp float;
varying vec2 vUV;
uniform vec3 sunLight;
uniform float inner;
uniform float outer;
// Direction to the Sun in the ring plane's own axes (x, y in the plane, z its normal),
// and the planet's radius as a share of the outer ring radius.
uniform vec3 sunLocal;
uniform float planetRadius;
// Seconds of play, and the spokes (core/glows.js SPOKES): how many places one may
// stand, the turn of Saturn's magnetic field in radians, where across the rings they
// lie, how much darker they are.
uniform float time;
uniform float spokeCount;
uniform float spokeTurn;
uniform vec2 spokeRing;
uniform float spokeDark;
#include<noise>
#include<rings>
void main(){
  // body.vert flips u, so undo it to get the plane's own x.
  vec3 p = vec3((.5 - vUV.x) * 2., (vUV.y - .5) * 2., 0.);
  float r = length(p);
  if (r < inner || r > 1.) discard;
  vec4 ring = ringProfile((r - inner) / (1. - inner));

  // Saturn's shadow: ring particles behind the planet, as seen from the Sun, are dark.
  float along = dot(p, sunLocal);
  float off = length(p - sunLocal * along);
  float shadow = (1. - smoothstep(planetRadius * .97, planetRadius * 1.02, off)) * step(along, 0.);

  // Spokes: dark smudges lying along the radius across the B ring, carried round with
  // Saturn's magnetic field. Each place has a spoke part of the time: it comes over a
  // minute or so, stays, and fades.
  float t = (r - inner) / (1. - inner);
  float spokes = 0.;
  float around = atan(p.y, p.x) - spokeTurn;
  for (int k = 0; k < 12; k++) {
    if (float(k) >= spokeCount) break;
    float fk = float(k);
    float at = fk * 6.28318 / spokeCount + 1.3 * sin(fk * 12.9898);
    float wide = .025 + .035 * fract(sin(fk * 78.233) * 43758.5);
    float da = atan(sin(around - at), cos(around - at));
    // Wider toward the outside, like a wedge, and ragged along its length.
    float edge = wide * (.6 + .8 * (t - spokeRing.x) / (spokeRing.y - spokeRing.x));
    float shape = exp(-pow(da / edge, 2.)) * smoothstep(spokeRing.x, spokeRing.x + .05, t) * (1. - smoothstep(spokeRing.y - .06, spokeRing.y, t));
    float alive = smoothstep(.15, .6, sin(time * (.035 + .02 * fract(sin(fk * 39.3) * 9871.3)) + fk * 2.4));
    spokes = max(spokes, shape * alive * (.75 + .25 * noise(vec2(t * 40. + fk * 5., fk))));
  }
  gl_FragColor = vec4(ring.rgb * sunLight * (1. - .94 * shadow) * (1. - spokeDark * spokes), ring.a);
}
