precision highp float;
varying vec2 vUV;
uniform float strength;
uniform float time;
// A faint green, as a comet's head is, to stand apart from the blue gas tail.
void main(){
  float d = length(vUV - .5) * 2.;
  // It breathes a little, as gas comes off the nucleus in puffs.
  float breath = 1. + .07 * sin(time * .8) + .04 * sin(time * 2.1 + 1.3);
  float glow = pow(max(0., 1. - d / (.94 + .06 * breath)), 2.5) * breath;
  gl_FragColor = vec4(vec3(.72, 1., .88) * glow * strength, 1.);
}
