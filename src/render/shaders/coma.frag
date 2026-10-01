precision highp float;
varying vec2 vUV;
uniform float strength;
void main(){
  float d = length(vUV - .5) * 2.;
  float glow = pow(max(0., 1. - d), 2.5);
  gl_FragColor = vec4(vec3(.75, .9, 1.) * glow * strength, 1.);
}
