precision highp float;
varying vec2 vUV;
uniform float strength;
// Seconds, for the break that now and then travels down the tail.
uniform float time;
// v = 0 at the nucleus, 1 at the far end. The tail fans out quickly, then slowly: a
// bright narrow white core inside a wide faint blue veil (the colours of 2026-10-09,
// chosen by the user of four shown: "2").
void main(){
  float along = vUV.y;
  float width = mix(.1, 1., sqrt(along));
  float across = abs(vUV.x - .5) * 2. / width;
  float core = exp(-across * across * 9.) * pow(1. - along, 2.2);
  float veil = exp(-across * across * 2.2) * pow(1. - along, 1.3) * (1. - smoothstep(.8, 1., across));
  // No hard edge where the planes begin, at the nucleus.
  float start = smoothstep(0., .015, along);
  // A disconnection: where the solar wind's magnetic field turns over, the gas tail is
  // cut off and the cut end drifts away down the tail as a bright knot, while a new
  // tail grows behind it. One trip takes 70 s, and one trip in three has a break.
  float trip = fract(time / 70.);
  float has = step(.66, fract(sin(floor(time / 70.) * 12.9898) * 43758.5453)) * smoothstep(0., .08, trip) * (1. - smoothstep(.75, 1., trip));
  float gap = exp(-pow((along - trip) / .045, 2.));
  float knot = exp(-pow((along - trip - .075) / .03, 2.)) * exp(-across * across * 3.);
  float cut = 1. - .9 * gap * has;
  gl_FragColor = vec4(start * ((vec3(.92, .96, 1.) * core * .7 + vec3(.3, .6, 1.) * veil * .45) * cut + vec3(.6, .85, 1.) * knot * has * .35) * strength, 1.);
}
