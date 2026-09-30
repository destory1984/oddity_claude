precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform vec3 eye;
uniform sampler2D day;
uniform sampler2D night;
void main(){
  vec3 N=normalize(n),V=normalize(eye-wp);
  float light=dot(N,sun);
  vec3 tex=texture2D(day,vUV).rgb;
  float daySide=smoothstep(-.08,.22,light);
  vec3 col=tex*(.095+max(0.,light)*1.28);
  vec3 cities=texture2D(night,vUV).rgb;
  col+=cities*vec3(1.25,.89,.5)*(1.-daySide)*1.25;
  float water=clamp((tex.b-tex.r)*4.,0.,1.);
  vec3 H=normalize(sun+V);
  col+=vec3(1.,.84,.61)*pow(max(dot(N,H),0.),95.)*water*daySide*.6;
  float rim=pow(1.-max(dot(N,V),0.),3.5);
  col+=vec3(.075,.33,.75)*rim*smoothstep(-.3,.4,light)*.52;
  gl_FragColor=vec4(pow(col,vec3(.86)),1.);
}
