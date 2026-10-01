precision highp float;
varying vec2 vUV;
uniform float strength;
// A comet's dust tail: v = 0 at the nucleus, 1 at the far end. Wider and softer than
// the gas tail (tail.frag), yellowish with reflected sunlight, and brightest along the
// edge that leads round the orbit.
void main(){
  float along = vUV.y;
  float width = mix(.16, 1., pow(along, .6));
  float across = (vUV.x - .5) * 2. / width;
  float veil = exp(-across * across * 1.8) * pow(1. - along, 1.1) * (1. - smoothstep(.75, 1., abs(across)));
  float streaks = .8 + .2 * sin(across * 9. + along * 5.);
  float start = smoothstep(0., .02, along);
  gl_FragColor = vec4(start * vec3(1., .88, .62) * veil * streaks * .5 * strength, 1.);
}
