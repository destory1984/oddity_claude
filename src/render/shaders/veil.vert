precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform vec3 centre;
varying vec3 vPos;
varying vec3 vDir;
void main(){
  vPos=position;
  vDir=normalize((world*vec4(position,1.)).xyz-centre);
  gl_Position=worldViewProjection*vec4(position,1.);
}
