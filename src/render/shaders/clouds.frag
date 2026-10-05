precision highp float;
varying vec3 n;
varying vec3 wp;
varying vec2 vUV;
uniform vec3 sun;
uniform sampler2D cloudMap;
uniform float time;
void main(){
  float a=texture2D(cloudMap,vUV).r;
  // A typhoon east of the Philippines (18 degrees north, 135 east on the cloud map, which
  // drifts with the clouds): a disc of cloud 1,100 km across with two arms wound into it
  // and a clear eye in the middle, turning slowly anticlockwise as storms of the north do.
  // from: east and south of its middle, in radians of arc.
  vec2 from=vec2((fract(vUV.x-.875+.5)-.5)*6.28318*.951,(vUV.y-.4)*3.14159);
  float far=length(from)/.09;
  if(far<1.6){
    float arms=.5+.5*sin(2.*atan(from.y,from.x)+9.*log(far+.03)+time*.12);
    // Ragged like the other clouds: the cloud map itself, read small, breaks it up.
    float ragged=.6+.8*texture2D(cloudMap,fract(vUV*5.+vec2(.13,.45))).r;
    float storm=(exp(-far*far*1.1)*(.12+.88*arms*arms)+.5*exp(-pow(far/.28,2.)))*ragged;
    storm*=smoothstep(.035,.08,far);
    a=max(a*(1.-.8*exp(-pow(far/.1,2.))),min(1.,storm*1.3));
  }
  float l=max(dot(normalize(n),sun),0.);
  gl_FragColor=vec4(vec3(.65,.8,1.)*(.025+l*1.2),a*.68);
}
