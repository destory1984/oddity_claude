precision highp float;
varying vec3 vPos;
varying vec3 vDir;
uniform vec3 colorLow;
uniform vec3 colorHigh;
uniform float strength;
uniform float time;
uniform float ripple;
uniform float nightOnly;
uniform vec3 sunDir;
// 1 for a dark plume (Triton's): drawn over the ground as smoke, not added as light.
uniform float dark;
// 1 for a jet seen from close by (Halley's): the cone's wall fades out where it is seen
// edge on, so the jet is a soft stream bright down its middle. With an even wall it
// crossed the close view as a flat wedge with a hard edge.
uniform float soft;
// 1 for a dust devil on Mars: a column of dust lit by the Sun, drawn over the ground
// (as a cone of added light it looked like a torch's beam, or a falling meteor: the
// user, 2026-10-06, "이건 뭐야", "나는 유성 떨어지는건 줄 알았어").
uniform float devil;
varying float vFace;
// A number between 0 and 1 for each whole step along x, joined smoothly; it comes round
// to where it began after `period` steps, so a ring of it closes.
float hash1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float ringNoise(float x, float period){
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3. - 2. * f);
  return mix(hash1(mod(i, period)), hash1(mod(i + 1., period)), f);
}
// A thin glowing sheet wrapped round an axis: an aurora curtain or a plume. The mesh is
// a cone band one unit tall, so vPos.y + .5 runs 0 at the foot to 1 at the top.
void main(){
  float h = vPos.y + .5;
  float a = atan(vPos.z, vPos.x);
  float fade = smoothstep(0., .05, h) * pow(1. - h, 1.5);
  // How far up its own height this bit is: the colour runs from the foot's to the top's.
  float tint = h;
  // Folds drifting round the ring (ripple is a whole number, so the ring closes).
  float folds = .5 + .5 * sin(a * ripple + time * .7 + 2.5 * sin(a * 5. - time * .4));
  float wave = mix(1., (.3 + .7 * folds) * (.7 + .3 * sin(a * 3. + time * .23)), step(.5, ripple));
  // Aurora shows on the night side only (nightOnly 1); a plume is lit by the Sun (0);
  // night-shining clouds show only along the edge of night, where the ground is dark
  // and their height is still in sunlight (2).
  float lit = dot(vDir, sunDir);
  float night = nightOnly < .5 ? 1.
    : nightOnly < 1.5 ? smoothstep(.1, -.15, lit)
    : smoothstep(.1, -.02, lit) * smoothstep(-.45, -.12, lit);
  // The clouds are a sheet, not a curtain: even across, with fine ripples in it.
  if (nightOnly > 1.5) {
    fade = smoothstep(0., .12, h) * smoothstep(1., .75, h);
    wave = (.5 + .5 * (.5 + .5 * sin(a * ripple * 9. + h * 70. + time * .2 + 3. * sin(a * 13. + h * 11.))))
      * (.55 + .45 * sin(a * 5. + h * 7. + 1.7 * sin(a * 3. - time * .05)));
  }
  // An aurora is a curtain of rays, not an even band (the user, 2026-10-05, asked
  // whether Saturn's smooth pink tube was right: it was not). Rays stand side by side
  // round the ring, each as tall as it happens to be and brighter or fainter than the
  // next; whole stretches of the ring are bright and others nearly dark; the foot is
  // sharp and the top fades. They drift slowly round.
  if (nightOnly > .5 && nightOnly < 1.5) {
    float u = a / 6.2831853 + .5;
    float fine = ringNoise(u * 520. + time * .22, 520.);
    float mid = ringNoise(u * 130. - time * .09, 130.);
    float stretch = ringNoise(u * 22. + time * .02, 22.);
    float top = .3 + .7 * mid * (.55 + .45 * fine);
    fade = smoothstep(0., .03, h) * pow(max(0., 1. - h / top), 1.1);
    // Each ray turns to the top's colour by its own top, short or tall.
    tint = clamp(h / top * 1.3, 0., 1.);
    float rays = .25 + .75 * fine * fine * (.5 + .5 * mid);
    wave = rays * mix(.1, 1.7, smoothstep(.25, .7, stretch)) * (.75 + .25 * folds);
  }
  if (dark > .5) {
    // Smoke: densest in the column, thinning into the cloud and gone by the top. Above
    // the column the wind carries it off to one side (Voyager 2 saw the clouds drawn
    // out more than a hundred km downwind). (Even all the way up and all the way
    // round, it stood past the limb as a flat grey triangle.)
    float downwind = pow(.5 + .5 * cos(a - 1.), 2.);
    float drift = mix(1., 1.3 * downwind, smoothstep(.1, .5, h));
    float smoke = smoothstep(0., .08, h) * (1. - smoothstep(.45, 1., h)) * drift * (.85 + .15 * sin(a * 2. + h * 9.)) * strength;
    gl_FragColor = vec4(colorLow, smoke);
    return;
  }
  if (devil > .5) {
    // Dust wound up the column in bands that climb as they turn, with finer grain the
    // other way; thick down the middle, thin at the edges; thickest in the skirt at the
    // foot, gone by the top.
    float wound = .5 + .5 * sin(a * 2. + h * 17. - time * 3.2);
    float grain = .5 + .5 * sin(a * 5. - h * 33. + time * 1.9);
    float dust = (.5 + .32 * wound + .18 * grain) * smoothstep(0., .55, vFace)
      * smoothstep(0., .05, h) * smoothstep(1., .7, h) * (.7 + .5 * exp(-h * 10.));
    float sunlit = .5 + .5 * clamp(dot(vDir, sunDir) * 1.6, 0., 1.);
    gl_FragColor = vec4(mix(colorLow, colorHigh, h) * sunlit * (.85 + .15 * wound), clamp(dust * strength, 0., 1.));
    return;
  }
  float stream = mix(1., smoothstep(0., .75, vFace), soft);
  gl_FragColor = vec4(mix(colorLow, colorHigh, tint) * fade * wave * night * strength * stream, 1.);
}
