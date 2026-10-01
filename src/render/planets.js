import {
  CreateSphere, CreatePlane, Mesh, ShaderMaterial, Effect, Texture, Vector3, Color3, Constants, Matrix,
} from './babylon.js';
import vertex from './shaders/body.vert?raw';
import planetFrag from './shaders/planet.frag?raw';
import cloudsFrag from './shaders/clouds.frag?raw';
import airFrag from './shaders/air.frag?raw';
import gasFrag from './shaders/gas.frag?raw';
import rockyFrag from './shaders/rocky.frag?raw';
import ringFrag from './shaders/ring.frag?raw';
import noiseGlsl from './shaders/noise.glsl?raw';
import ringsGlsl from './shaders/rings.glsl?raw';
import texturedFrag from './shaders/textured.frag?raw';
import { KM_PER_UNIT } from '../core/bodies.js';
import { normalize } from './math.js';

const SIDEREAL_DAY_S = 86164;
// Real rotation is too slow to see (Earth turns 1.25 degrees in five minutes), so
// every body spins 720 times faster: one Earth day passes in two minutes.
const SPIN_SPEEDUP = 720;
// Clouds drift a little faster than the ground so the weather visibly moves.
const CLOUD_DRIFT = 1.08;
const EARTH_START_SPIN = 1.35;
// Shell sizes relative to the Earth sphere, kept from the prototype (12.776 and 13.0 over 12.742).
const CLOUD_SCALE = 12.776 / 12.742;
const AIR_SCALE = 13.0 / 12.742;

Effect.IncludesShadersStore.noise = noiseGlsl;
Effect.IncludesShadersStore.rings = ringsGlsl;

export function shader(scene, name, fragment, uniforms = [], samplers = []) {
  Effect.ShadersStore[`${name}VertexShader`] = vertex;
  Effect.ShadersStore[`${name}FragmentShader`] = fragment;
  return new ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    attributes: ['position', 'normal', 'uv'],
    uniforms: ['world', 'worldViewProjection', ...uniforms],
    samplers,
  });
}

function texture(scene, file) {
  return new Texture(`${import.meta.env.BASE_URL}assets/${file}`, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
}

// Direction from a body toward the Sun. Bodies do not move, so this is fixed.
function sunDirectionFor(body, sunBody) {
  return new Vector3(...normalize(sunBody.position.map((n, i) => n - body.position[i])));
}

function createEarth(scene, body, sunDir) {
  const diameter = (2 * body.radiusKm) / KM_PER_UNIT;

  const earth = CreateSphere('earth', { diameter, segments: 112 }, scene);
  const surface = shader(scene, 'planet', planetFrag, ['sun', 'eye'], ['day', 'night']);
  surface.setTexture('day', texture(scene, 'earth-day.jpg'));
  surface.setTexture('night', texture(scene, 'earth-night.jpg'));
  surface.setVector3('sun', sunDir);
  surface.setVector3('eye', Vector3.Zero());
  earth.material = surface;

  const clouds = CreateSphere('clouds', { diameter: diameter * CLOUD_SCALE, segments: 96 }, scene);
  const cloudMaterial = shader(scene, 'cloudLayer', cloudsFrag, ['sun'], ['cloudMap']);
  cloudMaterial.setTexture('cloudMap', texture(scene, 'earth-clouds.jpg'));
  cloudMaterial.setVector3('sun', sunDir);
  cloudMaterial.alphaMode = Constants.ALPHA_COMBINE;
  cloudMaterial.needAlphaBlending = () => true;
  clouds.material = cloudMaterial;

  const air = CreateSphere('atmosphere', { diameter: diameter * AIR_SCALE, segments: 112 }, scene);
  const airMaterial = shader(scene, 'air', airFrag, ['sun', 'eye']);
  airMaterial.setVector3('sun', sunDir);
  airMaterial.setVector3('eye', Vector3.Zero());
  airMaterial.alphaMode = Constants.ALPHA_ADD;
  airMaterial.needAlphaBlending = () => true;
  airMaterial.disableDepthWrite = true;
  airMaterial.backFaceCulling = false;
  air.material = airMaterial;

  return {
    body,
    meshes: [earth, clouds, air],
    spin(elapsed) {
      const turn = (elapsed * SPIN_SPEEDUP * 2 * Math.PI) / SIDEREAL_DAY_S;
      // Negative rotation turns counterclockwise seen from the north: the ground moves east.
      earth.rotation.y = EARTH_START_SPIN - turn;
      clouds.rotation.y = EARTH_START_SPIN + 0.008 - turn * CLOUD_DRIFT;
    },
    setSun(dir) {
      const v = new Vector3(...dir);
      surface.setVector3('sun', v);
      cloudMaterial.setVector3('sun', v);
      airMaterial.setVector3('sun', v);
    },
  };
}

// How each body is drawn. 'textured' uses a NASA map from public/assets/planets
// (see THIRD-PARTY.md) with color correction; 'rocky' and 'gas' are procedural for
// bodies without a usable map. Colors are linear RGB; dayS is the real sidereal
// rotation period in seconds (negative spins backward).
//   saturation: 0 grey .. 1 as photographed .. >1 richer; tint multiplies the map;
//   base fills map gaps and colors the limb glow; mapWeight < 1 hides the map under
//   base (Venus's clouds); haze is the limb glow; detail adds fine grain up close.
const LOOKS = {
  // The Moon is tidally locked: one turn per 27.3-day orbit keeps one face toward Earth.
  moon: { shader: 'rocky', colorA: [0.33, 0.33, 0.35], colorB: [0.72, 0.71, 0.68], cap: 0, haze: 0, contrast: 0.45, craters: 0.9, dayS: 27.3217 * 86400 },
  // Small moons: plain cratered rock or ice in each one's own shade. All keep one face
  // to their planet, so a day lasts one orbit.
  phobos: { shader: 'rocky', colorA: [0.2, 0.18, 0.17], colorB: [0.42, 0.38, 0.35], cap: 0, haze: 0, contrast: 0.5, craters: 1, dayS: 0.31891 * 86400 },
  deimos: { shader: 'rocky', colorA: [0.24, 0.22, 0.2], colorB: [0.48, 0.44, 0.4], cap: 0, haze: 0, contrast: 0.4, craters: 0.8, dayS: 1.263 * 86400 },
  mimas: { shader: 'rocky', colorA: [0.5, 0.5, 0.52], colorB: [0.8, 0.8, 0.82], cap: 0, haze: 0, contrast: 0.5, craters: 1, dayS: 0.942422 * 86400 },
  enceladus: { shader: 'rocky', colorA: [0.78, 0.83, 0.9], colorB: [0.98, 0.99, 1.0], cap: 0, haze: 0, contrast: 0.25, craters: 0.25, dayS: 1.370218 * 86400 },
  rhea: { shader: 'rocky', colorA: [0.52, 0.52, 0.53], colorB: [0.82, 0.81, 0.8], cap: 0, haze: 0, contrast: 0.45, craters: 0.9, dayS: 4.518212 * 86400 },
  iapetus: { shader: 'rocky', colorA: [0.16, 0.13, 0.11], colorB: [0.78, 0.76, 0.72], cap: 0, haze: 0, contrast: 0.95, craters: 0.8, dayS: 79.3215 * 86400 },
  miranda: { shader: 'rocky', colorA: [0.45, 0.46, 0.48], colorB: [0.78, 0.78, 0.8], cap: 0, haze: 0, contrast: 0.8, craters: 0.7, dayS: 1.413479 * 86400 },
  ariel: { shader: 'rocky', colorA: [0.5, 0.5, 0.52], colorB: [0.82, 0.82, 0.84], cap: 0, haze: 0, contrast: 0.5, craters: 0.6, dayS: 2.520379 * 86400 },
  umbriel: { shader: 'rocky', colorA: [0.2, 0.2, 0.22], colorB: [0.4, 0.4, 0.42], cap: 0, haze: 0, contrast: 0.4, craters: 0.8, dayS: 4.144177 * 86400 },
  titania: { shader: 'rocky', colorA: [0.42, 0.4, 0.4], colorB: [0.7, 0.68, 0.66], cap: 0, haze: 0, contrast: 0.5, craters: 0.7, dayS: 8.705872 * 86400 },
  oberon: { shader: 'rocky', colorA: [0.36, 0.33, 0.32], colorB: [0.64, 0.6, 0.58], cap: 0, haze: 0, contrast: 0.5, craters: 0.9, dayS: 13.463239 * 86400 },
  triton: { shader: 'rocky', colorA: [0.6, 0.52, 0.5], colorB: [0.92, 0.86, 0.84], cap: 0, haze: 0, contrast: 0.4, craters: 0.25, dayS: -5.876854 * 86400 },
  mercury: { shader: 'rocky', colorA: [0.4, 0.38, 0.36], colorB: [0.64, 0.62, 0.59], cap: 0, haze: 0, contrast: 0.9, craters: 1, dayS: 5067000 },
  venus: {
    shader: 'textured', map: 'venus.jpg', saturation: 0.3, tint: [1.05, 0.96, 0.8], base: [0.92, 0.82, 0.6],
    mapWeight: 0.2, haze: 1.1, detail: 0.05, dayS: -20997000,
  },
  mars: {
    shader: 'textured', map: 'mars.jpg', saturation: 0.85, tint: [1, 0.98, 0.95], base: [0.72, 0.42, 0.26],
    mapWeight: 1, haze: 0.4, detail: 0.14, dayS: 88643,
  },
  jupiter: {
    shader: 'textured', map: 'jupiter.jpg', saturation: 1.1, tint: [1.03, 1, 0.96], base: [0.82, 0.7, 0.54],
    mapWeight: 1, haze: 0.2, detail: 0.2, dayS: 35730,
  },
  saturn: {
    shader: 'textured', map: 'saturn.jpg', saturation: 1.15, tint: [1.03, 0.99, 0.9], base: [0.9, 0.8, 0.6],
    mapWeight: 1, haze: 0.15, detail: 0.12, dayS: 38362, rings: { innerKm: 74500, outerKm: 136775, tilt: 0.47 },
  },
  io: {
    shader: 'textured', map: 'io.jpg', saturation: 1.25, tint: [1.06, 1, 0.9], base: [0.82, 0.72, 0.38],
    mapWeight: 1, haze: 0, detail: 0.12, dayS: 152854,
  },
  europa: {
    shader: 'textured', map: 'europa.jpg', saturation: 1, tint: [1, 1, 1], base: [0.82, 0.76, 0.68],
    mapWeight: 1, haze: 0, detail: 0.1, dayS: 306822,
  },
  ganymede: {
    shader: 'textured', map: 'ganymede.jpg', saturation: 1, tint: [1, 1, 1], base: [0.55, 0.5, 0.45],
    mapWeight: 1, haze: 0, detail: 0.12, dayS: 618153,
  },
  callisto: {
    shader: 'textured', map: 'callisto.jpg', saturation: 1, tint: [1, 1, 1], base: [0.35, 0.32, 0.28],
    mapWeight: 1, haze: 0, detail: 0.14, dayS: 1441931,
  },
  titan: {
    shader: 'textured', map: 'titan.jpg', saturation: 0.5, tint: [1, 0.88, 0.72], base: [0.82, 0.6, 0.32],
    mapWeight: 1, haze: 1.2, detail: 0.03, dayS: 1377648,
  },
  uranus: {
    shader: 'gas', colorA: [0.62, 0.85, 0.88], colorB: [0.57, 0.81, 0.86], colorC: [0.74, 0.92, 0.94],
    bands: 5, turbulence: 0.12, spot: 0, dayS: -62064,
  },
  neptune: {
    shader: 'textured', map: 'neptune.jpg', saturation: 1, tint: [0.9, 1, 1.1], base: [0.25, 0.42, 0.85],
    mapWeight: 1, haze: 0.35, detail: 0.12, dayS: 57996,
  },
};

// Rings are a flat square plane; the shader keeps only the annulus between the radii.
// Babylon applies rotation z, then x, then y: x lays the plane flat and tilts it,
// y turns the tilt toward the Sun so rings open up to travelers arriving from it.
function createRings(scene, body, rings, sunDir) {
  const outer = rings.outerKm / KM_PER_UNIT;
  const plane = CreatePlane(`${body.id}Rings`, { size: 2 * outer, sideOrientation: Mesh.DOUBLESIDE }, scene);
  plane.rotation.x = Math.PI / 2 + rings.tilt;
  plane.rotation.y = Math.atan2(-sunDir.x, -sunDir.z);
  const material = shader(scene, 'ring', ringFrag, ['sunLight', 'inner', 'outer', 'sunLocal', 'planetRadius']);
  material.setFloat('inner', rings.innerKm / rings.outerKm);
  material.setFloat('outer', 1);
  material.setFloat('planetRadius', body.radiusKm / rings.outerKm);
  material.setColor3('sunLight', new Color3(0.95, 0.93, 0.9));
  material.backFaceCulling = false;
  material.alphaMode = Constants.ALPHA_COMBINE;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  plane.material = material;
  // The plane's turn carries the Sun's direction into its own axes (for Saturn's shadow
  // on the rings) and its normal out to the world (for the rings' shadow on Saturn).
  const turn = Matrix.RotationYawPitchRoll(plane.rotation.y, plane.rotation.x, 0);
  const back = turn.clone().invert();
  const normal = Vector3.TransformNormal(new Vector3(0, 0, 1), turn);
  const setSun = (dir) => material.setVector3('sunLocal', Vector3.TransformNormal(dir, back));
  setSun(sunDir);
  return { plane, normal, setSun };
}

function createProceduralPlanet(scene, body, look, sunDir) {
  const diameter = (2 * body.radiusKm) / KM_PER_UNIT;
  const sphere = CreateSphere(body.id, { diameter, segments: body.radiusKm > 20000 ? 96 : 64 }, scene);
  const color = (v) => new Color3(...v);
  let material;
  if (look.shader === 'textured') {
    material = shader(scene, 'textured', texturedFrag,
      ['sun', 'tint', 'baseColor', 'saturation', 'mapWeight', 'haze', 'detail', 'ringNormal', 'ringInner', 'ringOuter'], ['map']);
    material.setVector3('ringNormal', Vector3.Zero());
    material.setFloat('ringInner', 1);
    material.setFloat('ringOuter', 2);
    material.setTexture('map', texture(scene, `planets/${look.map}`));
    material.setColor3('tint', color(look.tint));
    material.setColor3('baseColor', color(look.base));
    material.setFloat('saturation', look.saturation);
    material.setFloat('mapWeight', look.mapWeight);
    material.setFloat('haze', look.haze);
    material.setFloat('detail', look.detail);
  } else if (look.shader === 'gas') {
    material = shader(scene, 'gas', gasFrag, ['sun', 'colorA', 'colorB', 'colorC', 'bands', 'turbulence', 'spot']);
    material.setColor3('colorC', color(look.colorC));
    material.setFloat('bands', look.bands);
    material.setFloat('turbulence', look.turbulence);
    material.setFloat('spot', look.spot);
  } else {
    material = shader(scene, 'rocky', rockyFrag, ['sun', 'colorA', 'colorB', 'cap', 'haze', 'contrast', 'craters']);
    material.setFloat('cap', look.cap);
    material.setFloat('craters', look.craters ?? 0);
    material.setFloat('haze', look.haze);
    material.setFloat('contrast', look.contrast);
  }
  if (look.colorA) material.setColor3('colorA', color(look.colorA));
  if (look.colorB) material.setColor3('colorB', color(look.colorB));
  material.setVector3('sun', sunDir);
  sphere.material = material;

  const meshes = [sphere];
  let ring = null;
  if (look.rings) {
    ring = createRings(scene, body, look.rings, sunDir);
    meshes.push(ring.plane);
    material.setVector3('ringNormal', ring.normal);
    material.setFloat('ringInner', look.rings.innerKm / body.radiusKm);
    material.setFloat('ringOuter', look.rings.outerKm / body.radiusKm);
  }
  return {
    body,
    meshes,
    // For the rings: the plane's normal and its edges, to notice the traveler flying through.
    rings: ring && { normal: [ring.normal.x, ring.normal.y, ring.normal.z], innerKm: look.rings.innerKm, outerKm: look.rings.outerKm },
    spin(elapsed) {
      sphere.rotation.y = -(elapsed * SPIN_SPEEDUP * 2 * Math.PI) / look.dayS;
    },
    setSun(dir) {
      material.setVector3('sun', new Vector3(...dir));
      if (ring) ring.setSun(new Vector3(...dir));
    },
  };
}

// One entry per rendered body: { body, meshes, spin(elapsed), setSun([x,y,z]) }. The Sun is drawn by sun.js.
export function createBodyMeshes(scene, bodies, sunBody) {
  const made = [];
  for (const body of bodies) {
    const sunDir = sunDirectionFor(body, sunBody);
    if (body.id === 'earth') made.push(createEarth(scene, body, sunDir));
    else if (LOOKS[body.id]) made.push(createProceduralPlanet(scene, body, LOOKS[body.id], sunDir));
  }
  return made;
}
