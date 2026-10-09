precision highp float;
varying vec2 vUV;
uniform float strength;
// A faint green, as a comet's head is, to stand apart from the blue gas tail.
void main(){
  float d = length(vUV - .5) * 2.;
  float glow = pow(max(0., 1. - d), 2.5);
  gl_FragColor = vec4(vec3(.72, 1., .88) * glow * strength, 1.);
}
