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
// Thunderheads of the tropics: here and there in a grid of cells 7.5 degrees wide, within
// 15 degrees of the equator, one cell has an anvil top, a lumpy round of cloud 150 to
// 250 km across (larger than life, to be seen from orbit). 1 inside one, 0 outside.
float anvil(vec2 uv){
  vec2 g=uv*vec2(48.,24.);
  vec2 c=floor(g);
  if(hash1(c+3.1)<.8||abs((c.y+.5)/24.-.5)>.085)return 0.;
  vec2 o=fract(g)-.3-.4*vec2(hash1(c+7.7),hash1(c+13.9));
  float r=(.085+.06*hash1(c+21.))*(.72+.5*vnoise(vec2(atan(o.y,o.x)*1.9,hash1(c)*9.)));
  return 1.-smoothstep(r*.5,r,length(o));
}
void main(){
  float a=texture2D(cloudMap,vUV).r;
  float flash=0.;
  // A typhoon east of the Philippines (18 degrees north, 135 east on the cloud map, which
  // drifts with the clouds): a disc of cloud 1,100 km across with two arms wound into it
  // and a clear eye in the middle, turning anticlockwise as storms of the north do, once
  // in 30 seconds (it was 105, too slow to see: the user, 2026-10-06, "안 움직이는거?").
  // from: east and south of its middle, in radians of arc.
  vec2 from=vec2((fract(vUV.x-.875+.5)-.5)*6.28318*.951,(vUV.y-.4)*3.14159);
  float far=length(from)/.09;
  if(far<1.6){
    float arms=.5+.5*sin(2.*atan(from.y,from.x)+9.*log(far+.03)+time*.42);
    // Ragged like the other clouds: the cloud map itself, read small, breaks it up. It
    // is read turned by the same angle, so the lumps go round with the arms.
    float turn=time*.21;
    vec2 turned=vec2(from.x*cos(turn)-from.y*sin(turn),from.x*sin(turn)+from.y*cos(turn));
    float ragged=.6+.8*texture2D(cloudMap,fract(turned*vec2(.84,1.59)+vec2(.13,.45))).r;
    float storm=(exp(-far*far*1.1)*(.12+.88*arms*arms)+.5*exp(-pow(far/.28,2.)))*ragged;
    storm*=smoothstep(.035,.08,far);
    a=max(a*(1.-.8*exp(-pow(far/.1,2.))),min(1.,storm*1.3));
    // By night its own lightning shows it (the user, 2026-10-06: "태풍이 밤에는 안
    // 보이는구나"): the disc is cut into patches, six round by rings, and now and then a
    // patch of cloud is lit from inside for a third of a second, two strokes and a glow
    // dying away (core/glows.js lightningGlow). The bolts themselves are drawn over it
    // (render/glows.js, TYPHOON).
    vec2 grid=vec2((atan(from.y,from.x)+3.14159)*.955,far*2.2);
    vec2 cell=floor(grid);
    vec2 off=fract(grid)-.5;
    float beat=time*1.5+fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453)*9.;
    float on=step(.62,fract(sin(dot(cell+floor(beat)*.37,vec2(39.346,11.135)))*43758.5453));
    float age=fract(beat);
    float pulse=age<.08?1.:age<.14?.25:age<.22?.85:.5*max(0.,1.-(age-.22)/.3);
    flash=on*pulse*exp(-dot(off,off)*5.)*min(1.,storm*1.6);
  }
  // Four sights of the weather more (the user, 2026-10-07, of ten offered: "1, 2, 4,
  // 6,9,10"; the first is on the ground map, the last in render/glows.js).
  // Ship tracks, off California (36 north, 138 west): a thin low deck of cloud, and over
  // it the bright lines that ships' smoke draws in it, each narrow and sharp at the
  // ship's end and spreading and fading away behind. Drawn 15 to 50 km wide.
  vec2 lane=fromPlace(.1167,.3,.809);
  float laneFar=length(lane)/.17;
  if(laneFar<1.4){
    float under=exp(-laneFar*laneFar*1.5);
    float deck=under*(.3+.3*vnoise(lane*70.)+.15*vnoise(lane*190.));
    float lines=0.;
    for(int k=0;k<12;k++){
      float fk=float(k);
      float ang=hash1(vec2(fk,1.7))*3.14159;
      vec2 d=vec2(cos(ang),sin(ang));
      vec2 q=lane-(vec2(hash1(vec2(fk,5.1)),hash1(vec2(fk,9.3)))-.5)*.24;
      float along=dot(q,d);
      float len=.06+.08*hash1(vec2(fk,3.3));
      float across=dot(q,vec2(-d.y,d.x))+.003*sin(along*30.+fk*2.);
      float head=clamp((along+len)/(2.*len),0.,1.);
      float wide=.002+.006*(1.-head);
      lines=max(lines,exp(-pow(across/wide,2.))*step(abs(along),len)*smoothstep(0.,.35,head)*(.4+.6*head));
    }
    a=max(a,min(1.,deck*.8+lines*under));
  }
  // Honeycomb clouds, off Chile (22 south, 84 west): a deck of low cloud broken into
  // cells 90 km across: a soft white puff in each, the sea showing thinly between. (No
  // hard rims and no dark lanes: drawn so at first, it read as cracked glass. The user,
  // 2026-10-07: "이건 호불호가 있겠는데?")
  vec2 comb=fromPlace(.2667,.6222,.927);
  // How much of what is drawn here is a puff of the honeycomb (drawn white, below).
  float puffs=0.;
  float combFar=length(comb)/.12;
  if(combFar<1.4){
    vec2 g=comb/.011+.9*vec2(vnoise(comb*40.),vnoise(comb*40.+5.));
    vec2 gi=floor(g),gf=fract(g);
    float d1=9.,d2=9.,tone=0.;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
      vec2 o=vec2(float(x),float(y));
      vec2 pt=o+vec2(hash1(gi+o),hash1(gi+o+17.3))-gf;
      float dd=dot(pt,pt);
      if(dd<d1){d2=d1;d1=dd;tone=hash1(gi+o+3.7);}else if(dd<d2)d2=dd;
    }
    float edge=sqrt(d2)-sqrt(d1);
    // Bright at the heart of a cell, thinning toward its neighbours.
    float puff=(1.-smoothstep(.25,.75,sqrt(d1)))*(.55+.45*smoothstep(0.,.35,edge));
    float cells=puff*(.7+.3*tone)*(.75+.25*vnoise(comb*260.));
    float spread=exp(-combFar*combFar*2.4);
    a=mix(a,max(.1,cells),spread);
    puffs=cells*spread;
  }
  float facing=dot(normalize(n),sun);
  // Thunderheads, and the long shadows they throw when the Sun is low: the shadow of an
  // anvil 10 km up reaches hundreds of km along the edge of day. (East and north here
  // as on the ground map: the globe's pole is +y.)
  vec3 N=normalize(n);
  vec3 east=normalize(cross(vec3(0.,1.,0.),N)+vec3(1e-5,0.,0.));
  vec3 north=cross(N,east);
  float top=anvil(vUV);
  float shadow=0.;
  if(facing>.01&&facing<.45&&abs(vUV.y-.5)<.2){
    vec2 level=vec2(dot(sun,east),dot(sun,north));
    float low=sqrt(max(0.,1.-facing*facing))/facing;
    float reach=min(.11,.006*low);
    vec2 step1=normalize(level+vec2(1e-5,0.))*vec2(1./(6.28318*max(sqrt(1.-N.y*N.y),.3)),-1./3.14159)*reach/8.;
    for(int k=1;k<=8;k++)shadow=max(shadow,anvil(vUV+step1*float(k))*(1.-float(k)/11.));
    shadow*=(1.-top)*smoothstep(.01,.06,facing);
  }
  a=max(a,max(top,shadow*.62));
  float l=max(facing,0.);
  vec3 lit=vec3(.65,.8,1.)*(.025+l*1.2)+vec3(.8,.86,1.)*flash*(1.-smoothstep(-.1,.05,facing))*3.;
  // An anvil stands above the rest: it is still lit a little past the edge of day, and
  // warm in the low light. Its shadow is dark.
  vec3 high=mix(vec3(1.,.5,.26)*2.6,vec3(.75,.86,1.),smoothstep(.04,.3,facing))*(.03+max(facing+.12,0.)*1.25);
  lit=mix(lit,high,top);
  // (The layer is bluish and darkens the white cloud map under it: a puff is white.)
  lit=mix(lit,vec3(.96,.98,1.)*(.03+l*1.7),puffs);
  lit*=1.-.9*shadow;
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
