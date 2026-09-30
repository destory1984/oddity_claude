precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
void main(){
  float across=abs(vUV.x-.5)*2.;
  float fold=.5+.5*cos((vUV.x-.5)*25.+vUV.y*2.4);
  float light=.42+max(dot(normalize(n),normalize(vec3(-.35,.7,-.55))),0.)*.48;
  float ridge=fold*.13*(.35+.65*vUV.y);
  float edge=smoothstep(.72,1.,across)*.16;
  vec3 deep=vec3(.018,.22,.25),teal=vec3(.05,.68,.68),rim=vec3(.18,.88,.82);
  vec3 col=mix(deep,teal,light+ridge-edge);
  col=mix(col,rim,smoothstep(.92,1.,across)*.18);
  gl_FragColor=vec4(col,1.);
}
