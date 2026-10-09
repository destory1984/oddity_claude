precision highp float;
varying vec2 vUV;
uniform float strength;
uniform float time;
// The flight practice's ring: a bright thin circle with a soft light round it, a faint
// veil inside to say "through here", and a slow pulse. The ring itself is at 0.8 of the
// card's half width (render/practiceRing.js RING_AT).
void main(){
  float d = length(vUV - .5) * 2.;
  float pulse = .85 + .15 * sin(time * 2.4);
  float line = exp(-pow((d - .8) / .028, 2.));
  float halo = exp(-pow((d - .8) / .12, 2.)) * .45;
  float veil = (1. - smoothstep(.0, .8, d)) * .06;
  // A second, thinner circle running outward from the ring, again and again.
  float wave = fract(time * .35);
  float ripple = exp(-pow((d - .8 - wave * .18) / .02, 2.)) * (1. - wave) * .5;
  vec3 gold = vec3(1., .86, .5);
  vec3 white = vec3(1., .97, .88);
  gl_FragColor = vec4((white * line + gold * (halo + ripple) * pulse + gold * veil) * strength, 1.);
}
