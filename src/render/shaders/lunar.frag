precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
void main(){
  vec3 N=normalize(n);
  float marks=sin(vUV.x*47.+sin(vUV.y*31.)*3.)*sin(vUV.y*53.);
  float shade=.62+.12*marks;
  float l=.16+max(dot(N,sun),0.)*.95;
  gl_FragColor=vec4(vec3(.88,.87,.82)*shade*l,1.);
}
