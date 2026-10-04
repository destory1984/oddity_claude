precision highp float;
varying vec2 vUV;
uniform float strength;
// Where the ring is brightest, as a share of the card's half-width.
uniform float at;
// Saturn's E ring: a wide faint blue haze of ice grains from the jets of Enceladus,
// brightest along that moon's path, with a sharp inner side and a long outer one.
void main(){
  float r = length((vUV - .5) * 2.) / at;
  float wide = r < 1. ? .14 : .42;
  float haze = exp(-pow((r - 1.) / wide, 2.));
  gl_FragColor = vec4(vec3(.5, .7, 1.) * haze * strength, 1.);
}
