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
// How thick Etna's ash is at a place east (along) and south (aside) of its crater, in
// radians of arc, 0 to 1. A column close and solid at the crater that breaks into lumps
// as the wind carries it off and spreads it; and once in 90 s a burst: a great puff
// that leaves the crater, swells and thins as it rides downwind for most of a minute.
float etnaAsh(float along,float aside){
  float drift=aside-.019*sin(along*25.)*along/.16;
  float wide=(.0045+along*.1)*(.7+.6*cellNoise(vec2(along*55.-time*.2,3.7)));
  float column=exp(-pow(drift/wide,2.))*exp(-max(along,0.)/.1)*smoothstep(-.003,.004,along);
  float lumps=cellNoise(vec2(along*105.-time*.33,aside*150.));
  float fine=cellNoise(vec2(along*290.-time*.6,aside*370.+7.));
  float broken=smoothstep(.2,.75,lumps*.75+fine*.4);
  column*=mix(1.,broken*1.5,smoothstep(.004,.05,along));
  float since=mod(time,90.);
  float middle=.005+since*.0042;
  float size=.009+since*.0012;
  float puff=exp(-(pow(along-middle,2.)+drift*drift)/(size*size))*exp(-since/24.)*1.7*(.55+.7*lumps);
  return clamp(column*1.15+puff,0.,1.);
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
  // Etna, on Sicily (37.75 north, 15 east), in eruption (the user, 2026-10-06, of the
  // pale even streak it was: "화산 같은 느낌은 안 난다"): dark ash boiling out of the
  // crater in lumps and carried east on the wind over some 1,100 km, its shadow on the
  // sea beside it; fire in the crater by day and by night, and by night lava running
  // down the slope; and once in 90 s it bursts (etnaAsh above). along, aside: east and
  // south of the crater, in radians of arc.
  float along=(vUV.x-.5417)*6.28318*.79;
  float aside=(vUV.y-.2903)*3.14159;
  if(along>-.03&&along<.3&&abs(aside)<.1){
    float ash=etnaAsh(along,aside);
    // Its shadow, a little south of it, on whatever is not under the ash itself.
    float shade=etnaAsh(along+.003,aside-.014);
    col*=1.-.5*smoothstep(.06,.45,shade)*(1.-smoothstep(.06,.45,ash))*daySide;
    // Lumps lit from above: pale tops, dark hollows.
    float tone=cellNoise(vec2(along*105.-time*.33+.6,aside*150.+.35));
    vec3 ashColour=mix(vec3(.1,.08,.07),vec3(.37,.31,.26),tone*tone);
    col=mix(col,ashColour*(.095+max(0.,light)*1.1),smoothstep(.06,.45,ash)*.97);
    // Fire. since: seconds since the last burst; flash: the burst's own light, a few
    // seconds long.
    float since=mod(time,90.);
    float flash=exp(-since*.45);
    float near2=along*along+aside*aside;
    float vent=exp(-near2/.000006);
    float halo=exp(-near2/.00003);
    float flicker=.75+.25*sin(time*1.7);
    col+=vec3(1.,.45,.12)*vent*(.85+1.6*flash)*flicker;
    col+=vec3(1.,.32,.08)*halo*((1.-daySide)*.9+flash*1.1)*flicker;
    // Lava down the south-east slope: a thin crooked line, faint by day, red by night.
    float down=along*.45+aside*.89;
    float off=along*.89-aside*.45-.0011*sin(down*900.);
    float lava=exp(-pow(off/.0009,2.))*smoothstep(0.,.002,down)*smoothstep(.015,.006,down);
    col+=vec3(1.,.28,.05)*lava*(.22+.78*(1.-daySide))*(.7+.3*sin(time*2.3+down*700.));
  }
  float water=clamp((tex.b-tex.r)*4.,0.,1.);
  vec3 H=normalize(sun+V);
  col+=vec3(1.,.84,.61)*pow(max(dot(N,H),0.),95.)*water*daySide*.6;
  float rim=pow(1.-max(dot(N,V),0.),3.5);
  col+=vec3(.075,.33,.75)*rim*smoothstep(-.3,.4,light)*.52;
  gl_FragColor=vec4(pow(col,vec3(.86)),1.);
}
