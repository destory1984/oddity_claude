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
// A thin glowing sheet wrapped round an axis: an aurora curtain or a plume. The mesh is
// a cone band one unit tall, so vPos.y + .5 runs 0 at the foot to 1 at the top.
void main(){
  float h = vPos.y + .5;
  float a = atan(vPos.z, vPos.x);
  float fade = smoothstep(0., .05, h) * pow(1. - h, 1.5);
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
  if (dark > .5) {
    // Smoke: densest in the column, thinning into the cloud at the top.
    float smoke = smoothstep(0., .08, h) * (1. - .55 * h) * strength;
    gl_FragColor = vec4(colorLow, smoke);
    return;
  }
  gl_FragColor = vec4(mix(colorLow, colorHigh, h) * fade * wave * night * strength, 1.);
}
