precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform vec3 eye;
uniform sampler2D day;
uniform sampler2D night;
// The cloud layer's map and how far east of the ground's it stands (in turns), for the
// clouds' shadows on the ground.
uniform sampler2D cloudMap;
uniform float cloudShift;
uniform float time;
float cellHash(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float cellNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(cellHash(i),cellHash(i+vec2(1.,0.)),f.x),mix(cellHash(i+vec2(0.,1.)),cellHash(i+vec2(1.,1.)),f.x),f.y);
}
void main(){
  vec3 N=normalize(n),V=normalize(eye-wp);
  float light=dot(N,sun);
  vec3 tex=texture2D(day,vUV).rgb;
  float daySide=smoothstep(-.08,.22,light);
  // Cloud shadows: the cloud that shades this spot stands a little toward the Sun from
  // it, farther the lower the Sun (the clouds are drawn higher than they are, so the
  // shadows fall well clear of them near the edge of day).
  vec3 east=normalize(cross(vec3(0.,1.,0.),N)+vec3(1e-5,0.,0.));
  vec3 north=cross(N,east);
  float reach=.0035/max(light,.18);
  vec2 toSun=vec2(dot(sun,east)/max(sqrt(1.-N.y*N.y),.2),-dot(sun,north)*2.)*reach;
  float shade=smoothstep(.3,.8,texture2D(cloudMap,vec2(vUV.x-cloudShift+toSun.x,clamp(vUV.y+toSun.y,0.,1.))).r);
  vec3 col=tex*(.095+max(0.,light)*1.28*(1.-.4*shade));
  vec3 cities=texture2D(night,vUV).rgb;
  col+=cities*vec3(1.25,.89,.5)*(1.-daySide)*1.25;
  // The squid boats of the East Sea (38 degrees north, 131.3 east; the map's u runs from
  // 180 west to 180 east, its v from the north pole down): a patch of white-green lamps
  // on the dark water, where no city is, each a tenth of a degree from the next and
  // flickering. They show at night only.
  vec2 sea=(vUV-vec2(.8655,.2889))/vec2(.0045,.0095);
  float fleet=exp(-dot(sea,sea));
  if(fleet>.02){
    vec2 grid=vUV*vec2(3600.,1800.);
    vec2 cell=floor(grid);
    float lamp=cellHash(cell);
    // Each lamp stands anywhere in its cell, and the boats keep together in shoals:
    // most cells of a shoal have one, the water between has none.
    vec2 inCell=fract(grid)-.2-.6*vec2(cellHash(cell+7.3),cellHash(cell+19.1));
    float shoal=smoothstep(.45,.7,cellNoise(grid*.16+3.));
    float lit=step(1.-.75*shoal,lamp)*exp(-dot(inCell,inCell)/.035)*(.65+.35*sin(time*2.3+lamp*40.));
    // (From far off the lamps are smaller than a pixel: a faint glow stands for them.)
    col+=vec3(.7,1.,.88)*(lit*1.6+.09*shoal)*fleet*(1.-daySide);
  }
  // Etna, on Sicily (37.75 north, 15 east): a plume of grey ash carried east on the wind,
  // widening and thinning over some 700 km, its puffs moving along it; at night the
  // crater glows red. along, aside: east and south of the crater, in radians of arc.
  float along=(vUV.x-.5417)*6.28318*.79;
  float aside=(vUV.y-.2903)*3.14159;
  if(along>-.01&&along<.16&&abs(aside)<.05){
    float drift=aside-.012*sin(along*40.)*along/.1;
    float wide=.0035+along*.11;
    float ash=exp(-pow(drift/wide,2.))*exp(-max(along,0.)/.055)*smoothstep(-.002,.004,along);
    ash*=.55+.45*cellNoise(vec2(along*220.-time*.35,aside*300.));
    col=mix(col,vec3(.5,.47,.44)*(.095+max(0.,light)*1.1),clamp(ash,0.,1.)*.9);
    float crater=exp(-(along*along+aside*aside)/.0000035);
    col+=vec3(1.,.32,.08)*crater*(1.-daySide)*(.7+.3*sin(time*1.7));
  }
  float water=clamp((tex.b-tex.r)*4.,0.,1.);
  vec3 H=normalize(sun+V);
  col+=vec3(1.,.84,.61)*pow(max(dot(N,H),0.),95.)*water*daySide*.6;
  float rim=pow(1.-max(dot(N,V),0.),3.5);
  col+=vec3(.075,.33,.75)*rim*smoothstep(-.3,.4,light)*.52;
  gl_FragColor=vec4(pow(col,vec3(.86)),1.);
}
