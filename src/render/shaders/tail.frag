precision highp float;
varying vec2 vUV;
uniform float strength;
// v = 0 at the nucleus, 1 at the far end. The tail fans out quickly, then slowly: a
// bright narrow core inside a wide faint veil.
void main(){
  float along = vUV.y;
  float width = mix(.1, 1., sqrt(along));
  float across = abs(vUV.x - .5) * 2. / width;
  float core = exp(-across * across * 9.) * pow(1. - along, 2.2);
  float veil = exp(-across * across * 2.2) * pow(1. - along, 1.3) * (1. - smoothstep(.8, 1., across));
  // No hard edge where the planes begin, at the nucleus.
  float start = smoothstep(0., .015, along);
  gl_FragColor = vec4(start * (vec3(.7, .86, 1.) * core * .7 + vec3(.5, .7, 1.) * veil * .45) * strength, 1.);
}
