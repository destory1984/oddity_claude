precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform sampler2D cloudMap;
uniform float time;
float hash1(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash1(i),hash1(i+vec2(1.,0.)),f.x),mix(hash1(i+vec2(0.,1.)),hash1(i+vec2(1.,1.)),f.x),f.y);
}
// A place on the cloud map (the map's u runs from 180 west to 180 east, its v from the
// north pole down): how far east and south of it this spot is, in radians of arc.
vec2 fromPlace(float u,float v,float cosLat){
  return vec2((fract(vUV.x-u+.5)-.5)*6.28318*cosLat,(vUV.y-v)*3.14159);
}
void main(){
  float a=texture2D(cloudMap,vUV).r;
  // (Drawn weather stood here: a typhoon east of the Philippines with its lightning,
  // ship tracks off California, honeycomb cloud off Chile and thunderheads with their
  // shadows across the tropics, 2026-10-05 to 2026-10-19. Real clouds came in, and they
  // went: the user, "초반에 넣었던 필리핀 옆 태풍은 없애", then of a drawn thunderhead
  // among the real clouds, "이 예쁜 구름들도 강제로 넣은거지?", "모두 빼".)
  float facing=dot(normalize(n),sun);
  float l=max(facing,0.);
  vec3 lit=vec3(.65,.8,1.)*(.025+l*1.2);
  // A glory: rings of colour round the spot straight down-Sun of the traveler, where
  // the light comes back out of the cloud drops the way it went in. Only on cloud. Drawn
  // many times its size, so that its first ring stands clear of the traveler herself,
  // who is always in the middle of it (as a climber's shadow is in the middle of hers).
  float back=dot(normalize(-wp),sun);
  if(back>.9){
    float off=acos(min(back,1.));
    // White in the middle, then rings that run through the colours, red outermost.
    vec3 rings=mix(vec3(1.),.5+.5*cos(6.28318*(off/.085-vec3(0.,.33,.67))),smoothstep(.02,.06,off));
    // (Thin cloud would not show it: where the rings are, the layer is let show more.)
    float shows=exp(-off/.13)*smoothstep(.2,.5,facing)*(.6+.4*smoothstep(.02,.25,a));
    lit=mix(lit,rings*1.5,shows*.85);
    a=max(a,.75*shows);
  }
  gl_FragColor=vec4(lit,a*.68);
}
