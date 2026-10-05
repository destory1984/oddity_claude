precision highp float;
varying vec2 vUV;
uniform float visibility;
uniform float time;
// How far into an eclipse (0 none, 1 total), and the last bead of sunlight at the
// covered Sun's edge: xy the way to it from the centre, z how bright.
uniform float eclipse;
uniform vec3 bead;
// Where the card's axes point in space (core/sunView.js): right and up across it, and
// away, from the eye into the Sun. The patterns below are looked up along these, so
// they belong to the Sun and not to the screen: seen from another side, or with the
// view rolled over, the spots, the prominences and the corona's streamers are others.
uniform vec3 axisR;
uniform vec3 axisU;
uniform vec3 axisF;
// Where this point of the card is in space, from the eye (the eye is the scene's
// origin), and how far the eye is from the Sun's centre, in Sun radii. With these each
// pixel's line of sight is followed to the ball itself: from close by, a spot is drawn where it is, and flying at it it
// stays ahead. (The disc was drawn as if seen from infinitely far: close in, spots sat
// nearer the middle than they were and slid away from whoever flew at them.)
varying vec3 wp;
uniform float eyeDist;
#include<noise>
float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1., 0., 0.)), f.x), mix(hash3(i + vec3(0., 1., 0.)), hash3(i + vec3(1., 1., 0.)), f.x), f.y),
    mix(mix(hash3(i + vec3(0., 0., 1.)), hash3(i + vec3(1., 0., 1.)), f.x), mix(hash3(i + vec3(0., 1., 1.)), hash3(i + vec3(1., 1., 1.)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p) {
  float v = 0.;
  float a = .5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p *= 2.;
    a *= .5;
  }
  return v;
}
void main(){
  // The line of sight through this pixel, and how near it passes the Sun's centre
  // (miss, in Sun radii: under 1 it meets the ball). p is the pixel's place round the
  // centre along the Sun-facing axes, with the disc's edge at .129 as before. On the
  // disc it goes by the miss. Off it, by the angle from the centre, measured in disc
  // radii as seen from here: the glow falls off across the sky as it did, and does not
  // fill it. (By the miss alone, which is never more than the distance, the whole sky
  // near Earth was a yellow haze.)
  vec3 sight = normalize(wp);
  float along = dot(sight, axisF);
  vec3 aside = sight - axisF * along;
  // (Only ahead: a line of sight that points away from the Sun also passes within a
  // radius of its middle, behind the eye. Close in, 43,000 km up, the card is all round
  // the eye and the Sun was drawn a second time on the far side of the view.)
  float miss = along > 0. ? eyeDist * length(aside) : 2.;
  float off = length(aside) / max(along, 1e-4) * sqrt(eyeDist * eyeDist - 1.);
  vec2 p = .129 * (miss < 1. ? miss : off) * vec2(dot(aside, axisR), dot(aside, axisU)) / max(length(aside), 1e-6);
  float r = length(p);
  float disc = 1. - smoothstep(.124, .129, r);

  // Surface: limb darkening toward the edge, boiling granules, a few dark spots.
  vec2 q = p / .129;
  float mu = sqrt(max(0., 1. - dot(q, q)));
  float limb = .45 + .55 * pow(mu, .6);
  // The point of the ball the line of sight meets, in space.
  vec3 n3 = normalize(-axisF * eyeDist + sight * (eyeDist * along - mu));
  float granules = fbm3(n3 * 18. + vec3(time * .06, -time * .04, time * .03));
  float cells = fbm3(n3 * 55. - vec3(time * .1, time * .07, time * .05));
  // Sunspots ride the Sun's rotation: one turn in 25.4 days, 51 minutes on the game
  // clock, about the Sun's own axis (the y axis, square to the planets' orbits).
  float spin = time * 6.28318 / 3048.;
  float lon = atan(n3.x, n3.z) + spin;
  float lat = asin(clamp(n3.y, -1., 1.));
  float spots = smoothstep(.72, .8, fbm(vec2(cos(lon), sin(lon)) * 2.6 + vec2(lat * 4.2, lat * 1.7 + 7.3)));
  vec3 hot = vec3(1.25, 1.12, .9);
  vec3 warm = vec3(1.1, .62, .22);
  vec3 surface = mix(warm, hot, limb) * (.85 + .25 * granules + .1 * cells) * (1. - .6 * spots);

  float ang = atan(p.y, p.x);
  vec2 dir = vec2(cos(ang), sin(ang));
  // The corona is not still: broad streamers that slowly swell and shift round the
  // disc, and finer wisps that stream outward. Calm against the limb, livelier far out.
  // d3: which way out from the Sun this pixel is, in space.
  vec3 d3 = axisR * dir.x + axisU * dir.y;
  float streams = fbm3(d3 * 2.2 + vec3(time * .021, -time * .016, time * .012));
  float flow = fbm3(d3 * 5. + vec3(r * 9. - time * .11, r * 6. - time * .07, r * 4. + time * .05));
  float alive = mix(1., .5 + .75 * streams + .55 * flow, smoothstep(.129, .4, r));
  float corona = (exp(-r * 9.) * 2.35 + exp(-r * 4.) * .42 + exp(-r * 1.65) * .075) * alive;
  float rayH = pow(max(0., 1. - abs(p.y) * 22.), 7.) * exp(-abs(p.x) * 2.8) * .34;
  float rayV = pow(max(0., 1. - abs(p.x) * 29.), 8.) * exp(-abs(p.y) * 3.8) * .16;
  float ring = exp(-pow((r - .28) * 15., 2.)) * .045;
  vec3 glow = vec3(1., .51, .12) * (corona + rayH + rayV) * (1. - disc) + vec3(1., .78, .38) * ring;
  // Prominences: arches of glowing gas, each slowly swelling and sinking. They are red,
  // and show best when the disc is covered. Fourteen stand at fixed places on the Sun
  // and turn with it; one shows only while its place is near the edge as seen from
  // here, so which ones stand on the limb depends on where the Sun is looked at from.
  // Turned toward the eye, the same place shows as a bright thread on the disc (below).
  float prom = 0.;
  for (int k = 0; k < 14; k++) {
    float fk = float(k);
    float py = (fract(sin(fk * 12.9898) * 43758.5) - .5) * 1.4;
    float pl = fk * 2.39996 - spin;
    vec3 place = vec3(sqrt(1. - py * py) * sin(pl), py, sqrt(1. - py * py) * cos(pl));
    // The same gas over the face of the Sun, when its place is turned toward the eye:
    // not an arch against the sky but a bright ragged thread across the disc, like a
    // stroke of lightning, in a darker lane. It lies along a line through its place,
    // each at its own slant, and flickers and creeps.
    float facing = dot(place, n3);
    if (miss < 1. && facing > .9) {
      float slant = fk * 1.7;
      vec3 east = normalize(cross(vec3(0., 1., 0.), place));
      vec3 north = cross(place, east);
      vec3 lineAlong = east * cos(slant) + north * sin(slant);
      vec3 lineAcross = north * cos(slant) - east * sin(slant);
      float reach = .1 + .12 * fract(sin(fk * 78.233) * 43758.5);
      float bx = dot(n3, lineAlong) / reach;
      float by = dot(n3, lineAcross);
      if (abs(bx) < 1.) {
        float bend = (fbm(vec2(bx * 2.2 + fk * 7., time * .05)) - .47) * reach * .9
          + (noise(vec2(bx * 13. + fk * 3., time * .3)) - .5) * reach * .22;
        float taper = 1. - bx * bx;
        float swell = .7 + .3 * sin(time * .35 + fk * 2.1);
        float thin = .003 + .0015 * noise(vec2(bx * 9. + fk, time * .6));
        float thread = exp(-pow((by - bend) / thin, 2.)) * taper * swell;
        float lane = exp(-pow((by - bend) / .016, 2.)) * taper;
        // Fainter toward the edge of the disc, where the arch takes over.
        float onFace = smoothstep(.25, .6, mu);
        // The lane is the cooler, redder gas round the thread; the thread itself is white.
        surface = mix(surface, surface * vec3(.95, .5, .22), .7 * lane * onFace);
        surface += vec3(1.5, 1.4, 1.1) * thread * onFace * (.75 + .25 * noise(vec2(bx * 30. + fk, time * 2.)));
      }
    }
    vec2 on = vec2(dot(place, axisR), dot(place, axisU));
    float edge = smoothstep(.82, .98, length(on));
    if (edge <= 0.) continue;
    float at = atan(on.y, on.x);
    float width = .1 + .2 * fract(sin(fk * 78.233) * 43758.5);
    float height = (.007 + .02 * fract(sin(fk * 39.3) * 9871.3)) * (.75 + .25 * sin(time * .35 + fk * 2.1)) * edge;
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
  // An eruption: once in 150 s a prominence at the limb does not sink back. For a few
  // seconds it stands and swells like the others, then it lifts off, faster and faster,
  // out to a radius and a half, widening and thickening as it goes, and is torn into
  // shreds that thin away: a red ribbon let go into space.
  float lapE = time / 150. + .37;
  float sE = fract(lapE) / .42;
  if (sE < 1.) {
    float seedE = floor(lapE);
    float whereE = 6.2832 * fract(sin(seedE * 39.34) * 9871.3);
    float lift = sE * sE * sE;
    float xE = atan(sin(ang - whereE), cos(ang - whereE)) / (.16 + .25 * lift);
    if (abs(xE) < 1.) {
      float tallE = .012 + .02 * smoothstep(0., .35, sE) + .2 * lift;
      float archE = .129 + tallE * sqrt(1. - xE * xE) * (.8 + .4 * fbm(vec2(xE * 2.5 + seedE, time * .15)));
      float thickE = .0025 + .012 * lift;
      float torn = smoothstep(lift * .75, lift * .75 + .25, fbm(vec2(ang * 26. + seedE, r * 40. - time * .2)) + .15 * (1. - lift));
      prom += exp(-pow((r - archE) / thickE, 2.)) * torn * smoothstep(0., .08, sE) * (1. - smoothstep(.6, 1., sE)) * 1.3;
    }
  }
  prom *= 1. - disc;
  // The corona seen in a total eclipse: a pearly glow hugging the black disc, drawn out
  // into two broad streamers along the Sun's equator. Seen from over a pole there is no
  // equator to either side, and the glow is even all round.
  float beyond = max(0., r - .129);
  float alongAxis = dot(dir, vec2(axisR.y, axisU.y));
  float streamers = pow(1. - alongAxis * alongAxis, 3.);
  float wisps = .55 + .45 * fbm3(d3 * 3. + 2. + vec3(beyond * 7. - time * .05, time * .02, beyond * 3.));
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
  // A flare and the cloud it throws off (a coronal mass ejection): once in 90 s a point
  // near the limb flashes white for a few seconds and a shell of gas swells away from
  // it, out to three radii, thinning as it goes. (Always off the limb as seen from here:
  // one that came straight at the eye would be a halo all round the disc.)
  float lap = time / 90.;
  float u = fract(lap);
  float where = 6.2832 * fract(sin(floor(lap) * 78.233) * 43758.5453);
  vec2 from = vec2(cos(where), sin(where));
  float da = acos(clamp(dot(p / max(r, 1e-6), from), -1., 1.));
  float kernel = exp(-dot(p - from * .118, p - from * .118) / .00016) * smoothstep(0., .012, u) * exp(-u * 14.) * 2.5;
  float shell = exp(-pow((r - .129 * (1.05 + 2.2 * u)) / (.012 + .05 * u), 2.)) * exp(-pow(da / (.3 + .35 * u), 2.))
    * pow(1. - u, 2.) * smoothstep(0., .03, u) * .5;
  // Coronal rain: when the flare has flashed, three loops stand over its place for half
  // a minute, one inside another, and bright drops of cooled gas slide down both legs of
  // each from the top to the feet, one after another.
  float rain = 0.;
  float rainOn = smoothstep(.07, .14, u) * (1. - smoothstep(.42, .58, u));
  float sda = atan(sin(ang - where), cos(ang - where));
  if (rainOn > 0. && abs(sda) < .5 && r > .12 && r < .22) {
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float wideR = .09 + .05 * fk;
      float tallR = .016 + .014 * fk;
      float xR = (sda - (fk - 1.) * .03) / wideR;
      if (abs(xR) < 1.) {
        float bow = max(.05, sqrt(1. - xR * xR));
        // How steep the loop is here, to measure the distance across it and not up from it.
        float steep = tallR * xR / (bow * wideR * r);
        float gap = (r - (.127 + tallR * bow)) / sqrt(1. + steep * steep);
        float drops = pow(.5 + .5 * cos(6.2832 * (abs(xR) * (1.1 + .4 * fk) - time * (.11 + .02 * fk) - fk * .37)), 4.);
        rain += exp(-pow(gap / .0016, 2.)) * (.16 + 1.5 * drops * (.4 + .6 * abs(xR)));
      }
    }
    rain *= rainOn * (1. - disc);
  }
  // The wave on the surface (a Moreton wave): from the place of the flash a ring spreads
  // over the face of the Sun for twelve seconds, a fainter one behind it, like a stone
  // dropped in water. Measured on the ball itself, so it runs round the curve of it.
  float wave = 0.;
  float uw = u / .13;
  if (uw < 1. && miss < 1.) {
    vec3 burst = normalize((axisR * from.x + axisU * from.y) * .915 - axisF * .404);
    float gone = acos(clamp(dot(n3, burst), -1., 1.));
    float front = 1.3 * uw;
    wave = (exp(-pow((gone - front) / .03, 2.)) + .4 * exp(-pow((gone - front * .72) / .04, 2.)))
      * pow(1. - uw, 1.5) * smoothstep(0., .08, uw);
  }
  // A comet that grazes the Sun: once in 210 s a small one falls in from the edge of the
  // glow, faster as it nears, its tail blown straight out from the Sun and growing, and
  // at the limb it goes out in a puff. (Real ones come by the hundred each year, crumbs
  // of one great comet broken long ago; few live through it.)
  float graze = 0.;
  float lapC = time / 210. + .61;
  float sC = fract(lapC) / .26;
  if (sC < 1.) {
    float turnC = 6.2832 * fract(sin(floor(lapC) * 12.9898) * 43758.5) + .8 * sC * sC;
    vec2 outC = vec2(cos(turnC), sin(turnC));
    vec2 rel = p - outC * (.133 + .34 * (1. - sC * sC));
    float outward = dot(rel, outC);
    float beside = dot(rel, vec2(-outC.y, outC.x));
    float tailC = outward > 0. ? exp(-pow(beside / (.0015 + outward * .07), 2.)) * exp(-outward / (.03 + .1 * sC)) : 0.;
    float headC = exp(-dot(rel, rel) / .000012);
    float shine = smoothstep(0., .12, sC) * (.35 + .65 * sC) * (1. - smoothstep(.94, 1., sC));
    float puff = exp(-dot(rel, rel) / .0002) * smoothstep(.9, .97, sC) * (1. - smoothstep(.97, 1., sC));
    graze = ((tailC * .7 + headC * 1.6) * shine + puff * 1.2) * (1. - disc);
  }
  vec3 col = (surface * (1. + .55 * wave) * disc * 1.35 + glow * visibility + vec3(1., .3, .27) * prom * .9
    + vec3(1., .96, .88) * kernel * disc + vec3(1., .8, .6) * shell * 3. * (1. - disc)
    + vec3(1., .62, .7) * rain * 1.6 + vec3(.8, .9, 1.) * graze
    + vec3(.86, .9, 1.) * pearl + vec3(1., .97, .9) * diamond) * .68;
  float a = clamp(disc + corona * .38 + rayH + rayV + ring + prom + pearl + diamond + shell + rain + graze, 0., 1.);
  // The glow is light added to the sky, but the disc itself hides what is behind it: the
  // colour goes out already multiplied by its strength, and the alpha says how much of
  // the background is taken away (all of it on the disc, none of it in the glow). Added
  // over everything, the disc let the constellation lines show across it.
  gl_FragColor = vec4(col * a, disc);
}
