precision highp float;
varying vec2 vUV;
varying vec3 wp;
uniform vec3 sunLight;
uniform float inner;
uniform float outer;
// Direction to the Sun in the ring plane's own axes (x, y in the plane, z its normal),
// and the planet's radius as a share of the outer ring radius.
uniform vec3 sunLocal;
uniform float planetRadius;
// 0: Saturn's broad bright rings; 1: the nine narrow dark rings of Uranus.
uniform float style;
// The way to the Sun and the ring plane's normal, both in the world's axes: for the
// rings seen against the light (the eye is at the world's origin).
uniform vec3 sunWorld;
uniform vec3 normalWorld;
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
  if (style > .5) {
    // 6, 5, 4, alpha, beta, eta, gamma, delta, epsilon, by distance between 41,000 and
    // 52,000 km. Each is a few km to a hundred km wide: drawn some hundreds wide so
    // they show at all, the outermost (epsilon) the widest and brightest.
    float at = (r - inner) / (1. - inner);
    float lines = 0.;
    lines += exp(-pow((at - .076) / .006, 2.)) * .35;
    lines += exp(-pow((at - .112) / .006, 2.)) * .35;
    lines += exp(-pow((at - .143) / .006, 2.)) * .35;
    lines += exp(-pow((at - .338) / .008, 2.)) * .5;
    lines += exp(-pow((at - .424) / .008, 2.)) * .5;
    lines += exp(-pow((at - .561) / .006, 2.)) * .35;
    lines += exp(-pow((at - .602) / .007, 2.)) * .45;
    lines += exp(-pow((at - .664) / .007, 2.)) * .45;
    lines += exp(-pow((at - .923) / .016, 2.)) * .85;
    ring = vec4(vec3(.42, .43, .46), clamp(lines, 0., 1.) * .75);
  }

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
  // Against the light (Cassini looking back from Saturn's shadow, 2006 and 2013): from
  // the side the Sun does not light, the dense B ring lets little through and is dark,
  // while the thin C ring, the Cassini division and the A ring pass the light on and
  // glow; and looking toward the Sun every thin part scatters its light forward.
  vec3 V = normalize(-wp);
  float through = step(dot(V, normalWorld) * sunLocal.z, 0.);
  float passed = .07 + 22. * ring.a * exp(-6. * ring.a);
  float toward = pow(max(dot(-V, sunWorld), 0.), 4.);
  float thin = ring.a * exp(-2.5 * ring.a) * 2.7;
  vec3 lit = ring.rgb * sunLight * mix(1., passed, through) + vec3(1., .93, .8) * toward * thin * mix(.35, 1.1, through);
  // The thin parts are nearly clear glass from the lit side; against the light they show.
  float cover = mix(ring.a, clamp(ring.a + thin * .55, 0., 1.), through);
  gl_FragColor = vec4(lit * (1. - .94 * shadow) * (1. - spokeDark * spokes), cover);
}
