precision highp float;
varying vec3 n;
varying vec3 wp;
uniform vec3 sun;
uniform vec3 eye;
void main(){
  vec3 N=normalize(n),V=normalize(eye-wp);
  float facing=dot(N,V);
  float mu=abs(facing);
  float rim=pow(1.-mu,4.);
  if(!gl_FrontFacing)rim=max(rim,.08);
  float nl=dot(N,sun);
  float day=smoothstep(-.55,.25,nl);
  float dawn=exp(-abs(nl)*8.)*pow(1.-mu,5.);
  float forwardGlow=pow(max(dot(-V,sun),0.),18.)*pow(1.-mu,2.);
  vec3 blue=mix(vec3(.07,.21,.52),vec3(.18,.53,1.),day);
  vec3 warm=vec3(1.,.38,.08)*(dawn*.9+forwardGlow*1.5);
  // Airglow: on the night side the thin air 95 km up shines faintly green, seen edge
  // on as a fine line along the limb.
  float airglow=pow(1.-mu,9.)*(1.-day)*1.4;
  float alpha=rim*(.2+day*.92)+dawn*.24+forwardGlow*.18+airglow*.5;
  gl_FragColor=vec4(blue+warm+vec3(.15,1.,.4)*airglow,alpha);
}
