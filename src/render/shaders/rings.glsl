// Saturn's main rings by distance from the planet, t = 0 at the inner edge of the
// C ring (74,500 km) and 1 at the outer edge of the A ring (136,775 km):
// C ring 0 to 0.28 (thin, grey), B ring 0.28 to 0.69 (dense, cream-white),
// Cassini division 0.69 to 0.765 (nearly empty), A ring 0.765 to 1 (medium, pale grey),
// Encke gap at 0.95. Colours follow Hubble's 2020 portrait. Returns rgb and density.
vec4 ringProfile(float t) {
  if (t < 0. || t > 1.) return vec4(0.);
  float cRing = smoothstep(0., .03, t) * (1. - smoothstep(.27, .29, t));
  float bRing = smoothstep(.27, .29, t) * (1. - smoothstep(.685, .695, t));
  float aRing = smoothstep(.76, .77, t) * (1. - smoothstep(.985, 1., t));
  float cassini = smoothstep(.69, .70, t) * (1. - smoothstep(.755, .765, t));
  float encke = 1. - (1. - smoothstep(0., .004, abs(t - .95))) * .85;

  // Fine ringlets: soft, many widths, never pure black stripes.
  float broad = noise(vec2(t * 26., 3.7));
  float fine = noise(vec2(t * 140., 9.1));
  float hair = noise(vec2(t * 520., 1.3));
  float ringlets = .78 + .12 * broad + .07 * fine + .03 * hair;

  // The B ring is brightest in its outer half; the C ring thickens outward.
  float bDepth = mix(.72, 1., smoothstep(.3, .55, t));
  float density = cRing * mix(.1, .28, t / .28)
                + bRing * .95 * bDepth
                + cassini * .06
                + aRing * .7 * encke;
  density *= ringlets;

  vec3 cCol = vec3(.46, .45, .44);
  vec3 bCol = mix(vec3(.80, .74, .64), vec3(.99, .96, .89), smoothstep(.3, .6, t));
  vec3 aCol = vec3(.84, .82, .78);
  vec3 col = cCol * cRing + bCol * bRing + aCol * aRing + cCol * cassini;
  col *= .92 + .16 * broad;
  return vec4(col, clamp(density, 0., 1.));
}
