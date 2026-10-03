precision highp float;
varying vec2 vUV;
uniform float strength;
// Mercury's sodium tail: v = 0 at the planet, 1 at the far end. Narrow and nearly
// straight, the yellow-orange of sodium light, faint, and fainter with distance.
void main(){
  float along = vUV.y;
  float width = mix(.18, 1., along);
  float across = abs(vUV.x - .5) * 2. / width;
  float core = exp(-across * across * 7.) * pow(1. - along, 1.6);
  float veil = exp(-across * across * 2.) * pow(1. - along, 1.1) * (1. - smoothstep(.8, 1., across));
  float start = smoothstep(0., .02, along);
  gl_FragColor = vec4(start * (vec3(1., .78, .3) * core * .55 + vec3(1., .62, .18) * veil * .3) * strength, 1.);
}
