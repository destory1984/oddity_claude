precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform sampler2D map;
uniform vec3 tint;
uniform vec3 baseColor;
uniform float saturation;
uniform float mapWeight;
uniform float haze;
uniform float detail;
// Ring plane normal (zero when the planet has no rings) and the ring radii in planet radii.
uniform vec3 ringNormal;
uniform float ringInner;
uniform float ringOuter;
#include<noise>
#include<rings>
void main(){
  vec3 col = texture2D(map, vUV).rgb;
  // Hide the seam where the map's left and right edges meet.
  float edge = min(vUV.x, 1. - vUV.x);
  vec3 across = .5 * (texture2D(map, vec2(.004, vUV.y)).rgb + texture2D(map, vec2(.996, vUV.y)).rgb);
  col = mix(across, col, smoothstep(.002, .008, edge));
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  // Some maps have no data near the poles (black): fill with the base color.
  col = mix(baseColor, col, smoothstep(0.02, 0.08, lum));
  col = mix(vec3(lum), col, saturation) * tint;
  // Venus: thick clouds hide most of the surface map.
  col = mix(baseColor, col, mapWeight);
  // Fine grain so low-resolution maps do not look blurry up close.
  float ang = vUV.x * 6.28318;
  // Stretched along longitude, like wind-drawn bands and dust streaks.
  float grain = fbm(vec2(cos(ang), sin(ang)) * 6. + vec2(vUV.y * 160., 5.)) * .6 + fbm(vec2(cos(ang), sin(ang)) * 24. + vec2(vUV.y * 90., 9.)) * .4;
  col *= 1. + (grain - .5) * detail;

  vec3 N = normalize(n);
  vec3 V = normalize(-wp);
  float l = dot(N, sun);
  float lit = smoothstep(-.06, .2, l) * max(l, 0.) * 1.15 + .02;
  // The rings' shadow: follow the sunlight back from this spot to the ring plane and
  // dim it by how dense the ring is where the ray crosses.
  float toPlane = dot(sun, ringNormal);
  if (abs(toPlane) > 1e-4) {
    float reach = -dot(N, ringNormal) / toPlane;
    if (reach > 0.) {
      float rr = length(N + sun * reach);
      lit *= 1. - .8 * ringProfile((rr - ringInner) / (ringOuter - ringInner)).a;
    }
  }
  float facing = max(dot(N, V), 0.);
  // Atmosphere: a soft glow on the lit limb.
  float rim = pow(1. - facing, 3.) * haze * smoothstep(-.25, .35, l);
  gl_FragColor = vec4(pow(col * lit + baseColor * rim, vec3(.92)), 1.);
}
