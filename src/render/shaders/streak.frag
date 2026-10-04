precision highp float;
varying vec3 vShade;
void main(){
  gl_FragColor=vec4(vShade,1.);
}
