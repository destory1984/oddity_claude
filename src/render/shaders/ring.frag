precision highp float;
varying vec2 vUV;
uniform vec3 sunLight;
uniform float inner;
uniform float outer;
// Direction to the Sun in the ring plane's own axes (x, y in the plane, z its normal),
// and the planet's radius as a share of the outer ring radius.
uniform vec3 sunLocal;
uniform float planetRadius;
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

  gl_FragColor = vec4(ring.rgb * sunLight * (1. - .94 * shadow), ring.a);
}
