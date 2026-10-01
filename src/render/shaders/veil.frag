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
// A thin glowing sheet wrapped round an axis: an aurora curtain or a plume. The mesh is
// a cone band one unit tall, so vPos.y + .5 runs 0 at the foot to 1 at the top.
void main(){
  float h = vPos.y + .5;
  float a = atan(vPos.z, vPos.x);
  float fade = smoothstep(0., .05, h) * pow(1. - h, 1.5);
  // Folds drifting round the ring (ripple is a whole number, so the ring closes).
  float folds = .5 + .5 * sin(a * ripple + time * .7 + 2.5 * sin(a * 5. - time * .4));
  float wave = mix(1., (.3 + .7 * folds) * (.7 + .3 * sin(a * 3. + time * .23)), step(.5, ripple));
  // Aurora shows on the night side only; a plume is lit by the Sun.
  float night = mix(1., smoothstep(.1, -.15, dot(vDir, sunDir)), nightOnly);
  gl_FragColor = vec4(mix(colorLow, colorHigh, h) * fade * wave * night * strength, 1.);
}
