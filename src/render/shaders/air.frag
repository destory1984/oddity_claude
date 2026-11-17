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
  // Orbital sunrise (the user, 2026-11-18: "2번 해보자", of a list of bright sights): seen
  // from low orbit, where the day-night line meets the limb toward the Sun, the air shows
  // in layers, red at the ground, then orange, a thin white, and blue fading into black.
  // Height in the shell along a ray that grazes it: the ray's closest distance from the
  // middle is the shell's radius times sqrt(1 - mu^2); the ground is 12.742 / 13 of it
  // (planets.js AIR_SCALE). Rays that reach the ground get none.
  float graze=sqrt(max(0.,1.-mu*mu));
  float hgt=clamp((graze-.98015)/.01985,0.,1.);
  float toward=max(dot(-V,sun),0.);
  // The Sun here looks 18 degrees in radius (distances are squeezed, sizes are not), so
  // the layers are brightest with its middle 20 degrees under the limb, its edge just under.
  float dawnSide=step(.98015,graze)*pow(toward,3.)*exp(-pow((nl+.35)/.25,2.));
  float twilight=dawnSide*(1.-smoothstep(.55,1.,hgt));
  vec3 layers=mix(vec3(.9,.08,.02),vec3(1.,.42,.06),smoothstep(0.,.3,hgt));
  layers=mix(layers,vec3(1.,.82,.45),smoothstep(.26,.4,hgt));
  layers=mix(layers,vec3(.08,.22,.85),smoothstep(.38,.62,hgt));
  // The air's own blue gives way where the layers are, or it washes them white.
  float own=1.-.95*min(dawnSide*2.,1.);
  // (Blended as added light, source times its alpha: the air's own light is weighted here
  // so the layers can be added at full strength.)
  gl_FragColor=vec4((blue+warm+vec3(.15,1.,.4)*airglow)*min(alpha,1.)*own+layers*twilight*1.,1.);
}
