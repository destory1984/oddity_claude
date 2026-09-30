precision highp float;
varying vec2 vUV;
uniform float visibility;
void main(){
  vec2 p=(vUV-.5)*2.;
  float r=length(p);
  float disc=1.-smoothstep(.124,.129,r);
  float corona=exp(-r*9.)*2.35+exp(-r*4.)*.42+exp(-r*1.65)*.075;
  float rayH=pow(max(0.,1.-abs(p.y)*22.),7.)*exp(-abs(p.x)*2.8)*.34;
  float rayV=pow(max(0.,1.-abs(p.x)*29.),8.)*exp(-abs(p.y)*3.8)*.16;
  float ring=exp(-pow((r-.28)*15.,2.))*.045;
  vec3 core=mix(vec3(1.,.72,.27),vec3(1.),disc);
  vec3 col=core*disc*2.15+vec3(1.,.51,.12)*(corona+rayH+rayV)+vec3(1.,.78,.38)*ring;
  float a=clamp(disc+corona*.38+rayH+rayV+ring,0.,1.);
  gl_FragColor=vec4(col*visibility,a*visibility);
}
