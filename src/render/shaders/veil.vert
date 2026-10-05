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
// A dust devil (0 for everything else): how far its top sways from its foot, in the
// mesh's own units. The column is then given its shape here: a skirt of dust at the
// foot, a little wider at the top, bent and swaying slowly.
uniform float sway;
uniform float time;
void main(){
  vPos=position;
  vec3 shaped=position;
  if(sway>0.){
    float h=position.y+.5;
    shaped.xz*=(1.+1.7*exp(-h*13.))*mix(1.,1.35,smoothstep(.55,1.,h));
    shaped.xz+=sway*h*vec2(sin(h*4.6+time*.5),cos(h*3.3+time*.37));
  }
  vec3 at=(world*vec4(shaped,1.)).xyz;
  vFace=abs(dot(normalize(mat3(world)*vec3(position.x,0.,position.z)),normalize(at)));
  vDir=normalize(at-centre);
  gl_Position=worldViewProjection*vec4(shaped,1.);
}
