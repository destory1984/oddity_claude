precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
void main(){
  vec4 p=world*vec4(position,1.);
  wp=p.xyz;
  n=normalize(mat3(world)*normal);
  // Babylon spheres wrap u westward when seen from outside; flip it so east is east
  // on every map (Arabia right of Egypt). Rings and the Sun are symmetric in u.
  vUV=vec2(1.-uv.x,uv.y);
  gl_Position=worldViewProjection*vec4(position,1.);
}
