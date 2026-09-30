precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform sampler2D cloudMap;
void main(){
  float a=texture2D(cloudMap,vUV).r;
  float l=max(dot(normalize(n),sun),0.);
  gl_FragColor=vec4(vec3(.65,.8,1.)*(.025+l*1.2),a*.68);
}
