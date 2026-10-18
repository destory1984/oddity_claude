precision highp float;
varying vec3 n;
varying vec3 wp;
uniform vec3 sun;
// size: the shell's radius in scene units; shell: that over the Moon's radius.
uniform float size;
uniform float shell;
// The Moon's horizon glow (the user, 2026-10-18, "모두 넣자"): seen from behind the Moon
// just before sunrise, streamers of light stand over its edge, as Eugene Cernan drew them
// from Apollo 17's orbit in 1972 (thought to be fine dust lifted off the ground and
// lit from behind). Drawn on a shell round the Moon: each point of it stands for the
// line of sight that passes it, by how high that line passes over the ground.
void main(){
  vec3 N = normalize(n);
  vec3 ray = normalize(wp);
  vec3 centre = wp - N * size;
  // From outside the shell its far side would count each line twice.
  if (!gl_FrontFacing && length(centre) > size) discard;
  // The point of the line nearest the Moon's centre: how high it is, and which way.
  vec3 near = centre - ray * dot(centre, ray);
  float h = length(near) / (size / shell) - 1.;
  if (h <= 0. || dot(centre, ray) < 0.) discard;
  vec3 Q = normalize(-near);
  // Only looking toward the Sun (it lights the dust from behind), over the side of the
  // edge where it is about to rise.
  float toward = pow(max(dot(ray, sun), 0.), 3.);
  float side = smoothstep(-.4, .3, dot(Q, sun));
  vec3 e1 = normalize(cross(sun, abs(sun.y) < .9 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
  vec3 e2 = cross(sun, e1);
  float s = (atan(dot(Q, e2), dot(Q, e1)) / 6.28318 + .5) * 36.;
  float hsh = fract(sin(floor(s) * 12.9898) * 43758.5453);
  // (Clearer since the user, 2026-10-18, "지평선 빛 더 또렷하게 해줘": fewer, wider and
  // longer streamers with dark gaps between, brighter.)
  float streak = .12 + .88 * (1. - smoothstep(.06, .32, abs(fract(s) - .5))) * (.3 + .7 * hsh);
  float glow = exp(-h / (.12 + .45 * hsh)) * streak + .5 * exp(-h / .03);
  float k = glow * toward * side;
  gl_FragColor = vec4(vec3(1., .88, .66), min(k * 3., 1.));
}
