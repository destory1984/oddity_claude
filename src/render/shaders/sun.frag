precision highp float;
varying vec2 vUV;
uniform float visibility;
uniform float time;
#include<noise>
void main(){
  vec2 p = (vUV - .5) * 2.;
  float r = length(p);
  float disc = 1. - smoothstep(.124, .129, r);

  // Surface: limb darkening toward the edge, boiling granules, a few dark spots.
  vec2 q = p / .129;
  float mu = sqrt(max(0., 1. - dot(q, q)));
  float limb = .45 + .55 * pow(mu, .6);
  float granules = fbm(q * 18. + vec2(time * .06, -time * .04));
  float cells = fbm(q * 55. - vec2(time * .1, time * .07));
  float spots = smoothstep(.72, .8, fbm(q * 3.5 + 7.3));
  vec3 hot = vec3(1.25, 1.12, .9);
  vec3 warm = vec3(1.1, .62, .22);
  vec3 surface = mix(warm, hot, limb) * (.85 + .25 * granules + .1 * cells) * (1. - .6 * spots);

  float corona = exp(-r * 9.) * 2.35 + exp(-r * 4.) * .42 + exp(-r * 1.65) * .075;
  float rayH = pow(max(0., 1. - abs(p.y) * 22.), 7.) * exp(-abs(p.x) * 2.8) * .34;
  float rayV = pow(max(0., 1. - abs(p.x) * 29.), 8.) * exp(-abs(p.y) * 3.8) * .16;
  float ring = exp(-pow((r - .28) * 15., 2.)) * .045;
  vec3 glow = vec3(1., .51, .12) * (corona + rayH + rayV) * (1. - disc) + vec3(1., .78, .38) * ring;
  // The planet in front already hides the covered part of the disc; what is left keeps
  // its full surface brightness. Only the glare around it fades with the covered area.
  // (Additive blending multiplies the colour by alpha, so visibility goes in once.)
  vec3 col = (surface * disc * 1.35 + glow * visibility) * .8;
  float a = clamp(disc + corona * .38 + rayH + rayV + ring, 0., 1.);
  gl_FragColor = vec4(col, a);
}
