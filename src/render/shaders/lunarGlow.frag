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
  float toward = pow(max(dot(ray, sun), 0.), 6.);
  float side = smoothstep(-.15, .5, dot(Q, sun));
  vec3 e1 = normalize(cross(sun, abs(sun.y) < .9 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
  vec3 e2 = cross(sun, e1);
  float s = (atan(dot(Q, e2), dot(Q, e1)) / 6.28318 + .5) * 60.;
  float hsh = fract(sin(floor(s) * 12.9898) * 43758.5453);
  float streak = .35 + .65 * (1. - smoothstep(.1, .45, abs(fract(s) - .5))) * (.4 + .6 * hsh);
  float glow = exp(-h / (.05 + .22 * hsh)) * streak + .6 * exp(-h / .02);
  float k = glow * toward * side;
  gl_FragColor = vec4(vec3(1., .93, .8), k * .9);
}
