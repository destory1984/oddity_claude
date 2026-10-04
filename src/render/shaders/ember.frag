precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
// The point on the star itself (unit length), turning with it (body.vert).
varying vec3 lp;
uniform float time;
#include<noise>
// A red dwarf (TRAPPIST-1, core/exo.js): it shines by itself. Orange-red, darker
// toward its edge, with slow grain and a few large dark spots.
void main(){
  vec3 N=normalize(n),V=normalize(-wp);
  float face=max(dot(N,V),0.);
  // Laid out on the ball itself from three sides, so nothing gathers at its poles.
  vec3 at=normalize(lp);
  float grain=(fbm(at.xy*7.+vec2(3.,time*.03))+fbm(at.yz*7.+vec2(11.,time*.03))+fbm(at.zx*7.+19.))/3.;
  grain=smoothstep(.3,.7,grain);
  float spots=smoothstep(.56,.68,(fbm(at.xy*1.6+5.)+fbm(at.yz*1.6+13.)+fbm(at.zx*1.6+23.))/3.);
  vec3 col=mix(vec3(1.,.36,.1),vec3(1.,.68,.32),grain);
  col*=1.-.55*spots;
  col*=.4+.8*pow(face,.6);
  gl_FragColor=vec4(col,1.);
}
