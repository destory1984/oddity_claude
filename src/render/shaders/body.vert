precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
// The point on the body itself (unit length), turning with it: close-up detail is
// laid out in these coordinates so it stays put on the ground.
varying vec3 lp;
void main(){
  vec4 p=world*vec4(position,1.);
  wp=p.xyz;
  lp=normalize(position);
  n=normalize(mat3(world)*normal);
  // Babylon spheres wrap u westward when seen from outside; flip it so east is east
  // on every map (Arabia right of Egypt). Rings and the Sun are symmetric in u.
  vUV=vec2(1.-uv.x,uv.y);
  gl_Position=worldViewProjection*vec4(position,1.);
}
