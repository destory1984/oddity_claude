precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform sampler2D cloudMap;
uniform float time;
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
  float facing=dot(normalize(n),sun);
  float l=max(facing,0.);
  vec3 lit=vec3(.65,.8,1.)*(.025+l*1.2)+vec3(.8,.86,1.)*flash*(1.-smoothstep(-.1,.05,facing))*3.;
  gl_FragColor=vec4(lit,a*.68);
}
