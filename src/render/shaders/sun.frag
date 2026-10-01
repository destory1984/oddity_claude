precision highp float;
varying vec2 vUV;
uniform float visibility;
uniform float time;
// How far into an eclipse (0 none, 1 total), and the last bead of sunlight at the
// covered Sun's edge: xy the way to it from the centre, z how bright.
uniform float eclipse;
uniform vec3 bead;
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
  // Sunspots ride the Sun's rotation: one turn in 25.4 days, 51 minutes on the game
  // clock. The disc is treated as a ball turning about the screen's vertical axis.
  float lon = atan(q.x, mu) + time * 6.28318 / 3048.;
  float lat = asin(clamp(q.y, -1., 1.));
  float spots = smoothstep(.72, .8, fbm(vec2(cos(lon), sin(lon)) * 2.6 + vec2(lat * 4.2, lat * 1.7 + 7.3)));
  vec3 hot = vec3(1.25, 1.12, .9);
  vec3 warm = vec3(1.1, .62, .22);
  vec3 surface = mix(warm, hot, limb) * (.85 + .25 * granules + .1 * cells) * (1. - .6 * spots);

  float ang = atan(p.y, p.x);
  vec2 dir = vec2(cos(ang), sin(ang));
  // The corona is not still: broad streamers that slowly swell and shift round the
  // disc, and finer wisps that stream outward. Calm against the limb, livelier far out.
  float streams = fbm(dir * 2.2 + vec2(time * .021, -time * .016));
  float flow = fbm(dir * 5. + vec2(r * 9. - time * .11, r * 6. - time * .07));
  float alive = mix(1., .5 + .75 * streams + .55 * flow, smoothstep(.129, .4, r));
  float corona = (exp(-r * 9.) * 2.35 + exp(-r * 4.) * .42 + exp(-r * 1.65) * .075) * alive;
  float rayH = pow(max(0., 1. - abs(p.y) * 22.), 7.) * exp(-abs(p.x) * 2.8) * .34;
  float rayV = pow(max(0., 1. - abs(p.x) * 29.), 8.) * exp(-abs(p.y) * 3.8) * .16;
  float ring = exp(-pow((r - .28) * 15., 2.)) * .045;
  vec3 glow = vec3(1., .51, .12) * (corona + rayH + rayV) * (1. - disc) + vec3(1., .78, .38) * ring;
  // Prominences: arches of glowing gas standing on the limb, seven of them, each
  // slowly swelling and sinking. They are red, and show best when the disc is covered.
  float prom = 0.;
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    float at = fk * .8976 + .5 * sin(fk * 12.9898);
    float width = .1 + .2 * fract(sin(fk * 78.233) * 43758.5);
    float height = (.007 + .02 * fract(sin(fk * 39.3) * 9871.3)) * (.75 + .25 * sin(time * .35 + fk * 2.1));
    float da = atan(sin(ang - at), cos(ang - at));
    float x = da / width;
    if (abs(x) < 1.) {
      // Lopsided and a little ragged, not a neat hoop.
      float arch = .129 + height * sqrt(1. - x * x) * (.75 + .5 * fbm(vec2(x * 2.5 + fk * 7., time * .2)));
      float thick = .002 + .002 * fbm(vec2(ang * 30., time * .5 + fk));
      prom += exp(-pow((r - arch) / thick, 2.)) * (.6 + .4 * fbm(vec2(ang * 60. + fk, time * .8)));
      prom += .16 * (1. - smoothstep(.129, arch, r));
    }
  }
  prom *= 1. - disc;
  // The corona seen in a total eclipse: a pearly glow hugging the black disc, drawn out
  // into two broad streamers.
  float beyond = max(0., r - .129);
  float streamers = pow(.5 + .5 * sin(ang * 2. + .6), 3.);
  float wisps = .55 + .45 * fbm(dir * 3. + 2. + vec2(beyond * 7. - time * .05, time * .02));
  float pearl = (exp(-beyond * 14.) * 2.4 + exp(-beyond * 4.5) * 1.1 * (.3 + 1. * streamers)) * wisps * eclipse * (1. - disc);
  // The diamond ring: the last bead of sunlight, a point with a soft halo and four rays.
  vec2 fromBead = p - bead.xy * .129;
  float bd = length(fromBead);
  float diamond = (exp(-bd * 90.) * 3. + exp(-bd * 28.) * .4
    + pow(max(0., 1. - abs(fromBead.y) * 40.), 6.) * exp(-abs(fromBead.x) * 9.) * .5
    + pow(max(0., 1. - abs(fromBead.x) * 40.), 6.) * exp(-abs(fromBead.y) * 9.) * .5) * bead.z;
  // The planet in front already hides the covered part of the disc; what is left keeps
  // its full surface brightness. Only the glare around it fades with the covered area.
  // (Additive blending multiplies the colour by alpha, so visibility goes in once.)
  vec3 col = (surface * disc * 1.35 + glow * visibility + vec3(1., .3, .27) * prom * .9
    + vec3(.86, .9, 1.) * pearl + vec3(1., .97, .9) * diamond) * .68;
  float a = clamp(disc + corona * .38 + rayH + rayV + ring + prom + pearl + diamond, 0., 1.);
  gl_FragColor = vec4(col, a);
}
