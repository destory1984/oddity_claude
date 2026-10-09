precision highp float;
varying vec2 vUV;
uniform float strength;
// Seconds, for the gas streaming down the tail and the break that travels down it.
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
  // tail grows behind it. One trip takes 70 s, each with a break (one in three at
  // first; the user, 2026-10-09, found a comet with nothing moving too still and had
  // all four ways offered put in: the design doc has their words).
  float trip = fract(time / 70.);
  float has = smoothstep(0., .08, trip) * (1. - smoothstep(.75, 1., trip));
  float gap = exp(-pow((along - trip) / .045, 2.));
  float knot = exp(-pow((along - trip - .075) / .03, 2.)) * exp(-across * across * 3.);
  float cut = 1. - .9 * gap * has;
  // Gas blown down the tail by the solar wind: soft bright bands that leave the head
  // and run to the far end in about half a minute, never two alike.
  float flow = 1. + .2 * sin(along * 17. - time * .55 + across * 1.5) + .12 * sin(along * 41. - time * 1.25 - across * 2.6);
  gl_FragColor = vec4(start * ((vec3(.92, .96, 1.) * core * .7 * mix(1., flow, .5) + vec3(.3, .6, 1.) * veil * .45 * flow) * cut + vec3(.6, .85, 1.) * knot * has * .35) * strength, 1.);
}
