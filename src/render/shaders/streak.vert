precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec4 color;
uniform mat4 worldViewProjection;
// The way she flies (a unit vector) and how far the stars are drawn out (0 to 1).
uniform vec3 heading;
uniform float streak;
varying vec3 vShade;
// Each star is a line of two points at the same spot; uv.x is 0 for the star's end and 1
// for the tail's. The tail is pushed away from the point flown toward, by more the
// farther the star is from that point, so the middle of the view stays still.
void main(){
  vec3 d=normalize(position);
  vec3 away=d-heading*dot(d,heading);
  vec3 at=normalize(d+away*uv.x*streak*.07)*length(position);
  vShade=color.rgb*(1.-uv.x)*min(1.,streak*2.5);
  gl_Position=worldViewProjection*vec4(at,1.);
}
