precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform vec3 centre;
varying vec3 vPos;
varying vec3 vDir;
// How squarely this bit of the cone's wall faces the eye (the eye is the scene's
// origin): 1 face on, 0 edge on.
varying float vFace;
void main(){
  vPos=position;
  vec3 at=(world*vec4(position,1.)).xyz;
  vFace=abs(dot(normalize(mat3(world)*vec3(position.x,0.,position.z)),normalize(at)));
  vDir=normalize(at-centre);
  gl_Position=worldViewProjection*vec4(position,1.);
}
