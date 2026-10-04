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
  float water=clamp((tex.b-tex.r)*4.,0.,1.);
  vec3 H=normalize(sun+V);
  col+=vec3(1.,.84,.61)*pow(max(dot(N,H),0.),95.)*water*daySide*.6;
  float rim=pow(1.-max(dot(N,V),0.),3.5);
  col+=vec3(.075,.33,.75)*rim*smoothstep(-.3,.4,light)*.52;
  gl_FragColor=vec4(pow(col,vec3(.86)),1.);
}
