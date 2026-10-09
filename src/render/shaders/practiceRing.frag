precision highp float;
varying vec2 vUV;
uniform float strength;
uniform float time;
// The flight practice's ring: a bright thin circle with a soft light round it, a faint
// veil inside to say "through here", a slow pulse, and one horn on its top: the card is
// kept upright in the place (render/practiceRing.js), so the horn says which way is up. The ring itself is at 0.72 of the
// card's half width (render/practiceRing.js RING_AT).
void main(){
  float d = length(vUV - .5) * 2.;
  float pulse = .85 + .15 * sin(time * 2.4);
  float line = exp(-pow((d - .72) / .026, 2.));
  float halo = exp(-pow((d - .72) / .11, 2.)) * .45;
  float veil = (1. - smoothstep(.0, .72, d)) * .06;
  // A second, thinner circle running outward from the ring, again and again.
  float wave = fract(time * .35);
  float ripple = exp(-pow((d - .72 - wave * .16) / .02, 2.)) * (1. - wave) * .5;
  // The horn: a narrow spike standing on the ring's top, from the ring out to the card's
  // edge, soft at its sides.
  vec2 p = (vUV - .5) * 2.;
  float rise = clamp((p.y - .72) / .27, 0., 1.);
  float horn = step(.72, p.y) * (1. - smoothstep(.0, .012, abs(p.x) - .085 * (1. - rise))) * (1. - smoothstep(.96, 1., rise));
  vec3 gold = vec3(1., .86, .5);
  vec3 white = vec3(1., .97, .88);
  gl_FragColor = vec4((white * max(line, horn * .9) + gold * (halo + ripple) * pulse + gold * veil) * strength, 1.);
}
