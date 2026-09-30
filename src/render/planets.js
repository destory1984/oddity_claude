import {
  CreateSphere, CreatePlane, Mesh, ShaderMaterial, Effect, Texture, Vector3, Color3, Constants,
} from './babylon.js';
import vertex from './shaders/body.vert?raw';
import planetFrag from './shaders/planet.frag?raw';
import lunarFrag from './shaders/lunar.frag?raw';
import cloudsFrag from './shaders/clouds.frag?raw';
import airFrag from './shaders/air.frag?raw';
import gasFrag from './shaders/gas.frag?raw';
import rockyFrag from './shaders/rocky.frag?raw';
import ringFrag from './shaders/ring.frag?raw';
import noiseGlsl from './shaders/noise.glsl?raw';
import { KM_PER_UNIT } from '../core/bodies.js';
import { normalize } from './math.js';

const SIDEREAL_DAY_S = 86164;
const EARTH_START_SPIN = 1.35;
// Shell sizes relative to the Earth sphere, kept from the prototype (12.776 and 13.0 over 12.742).
const CLOUD_SCALE = 12.776 / 12.742;
const AIR_SCALE = 13.0 / 12.742;

Effect.IncludesShadersStore.noise = noiseGlsl;

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
      earth.rotation.y = EARTH_START_SPIN + (elapsed * 2 * Math.PI) / SIDEREAL_DAY_S;
      clouds.rotation.y = earth.rotation.y + 0.008;
    },
  };
}

function createMoon(scene, body, sunDir) {
  const moon = CreateSphere('moon', { diameter: (2 * body.radiusKm) / KM_PER_UNIT, segments: 48 }, scene);
  const material = shader(scene, 'lunar', lunarFrag, ['sun']);
  material.setVector3('sun', sunDir);
  moon.material = material;
  return { body, meshes: [moon], spin() {} };
}

// Procedural looks for bodies without photo textures. Colors are linear RGB;
// dayS is the real sidereal rotation period in seconds (negative spins backward).
const LOOKS = {
  mercury: { shader: 'rocky', colorA: [0.42, 0.4, 0.38], colorB: [0.62, 0.6, 0.57], cap: 0, haze: 0, contrast: 0.9, dayS: 5067000 },
  venus: { shader: 'rocky', colorA: [0.84, 0.72, 0.5], colorB: [0.95, 0.88, 0.7], cap: 0, haze: 0.9, contrast: 0.15, dayS: -20997000 },
  mars: { shader: 'rocky', colorA: [0.5, 0.22, 0.12], colorB: [0.76, 0.43, 0.26], cap: 0.09, haze: 0.3, contrast: 0.6, dayS: 88643 },
  jupiter: {
    shader: 'gas', colorA: [0.82, 0.7, 0.54], colorB: [0.58, 0.42, 0.3], colorC: [0.96, 0.93, 0.86],
    bands: 14, turbulence: 1, spot: 1, dayS: 35730,
  },
  saturn: {
    shader: 'gas', colorA: [0.9, 0.8, 0.6], colorB: [0.77, 0.65, 0.45], colorC: [0.96, 0.9, 0.76],
    bands: 18, turbulence: 0.5, spot: 0, dayS: 38362, rings: { innerKm: 74500, outerKm: 136775, tilt: 0.47 },
  },
  uranus: {
    shader: 'gas', colorA: [0.62, 0.85, 0.88], colorB: [0.55, 0.79, 0.84], colorC: [0.76, 0.92, 0.94],
    bands: 6, turbulence: 0.2, spot: 0, dayS: -62064,
  },
  neptune: {
    shader: 'gas', colorA: [0.26, 0.43, 0.86], colorB: [0.17, 0.31, 0.72], colorC: [0.58, 0.72, 0.96],
    bands: 8, turbulence: 0.6, spot: 0, dayS: 57996,
  },
};

// Rings are a flat square plane; the shader keeps only the annulus between the radii.
function createRings(scene, body, rings) {
  const outer = rings.outerKm / KM_PER_UNIT;
  const plane = CreatePlane(`${body.id}Rings`, { size: 2 * outer, sideOrientation: Mesh.DOUBLESIDE }, scene);
  plane.rotation.x = Math.PI / 2;
  plane.rotation.z = rings.tilt;
  const material = shader(scene, 'ring', ringFrag, ['sunLight', 'inner', 'outer']);
  material.setFloat('inner', rings.innerKm / rings.outerKm);
  material.setFloat('outer', 1);
  material.setColor3('sunLight', new Color3(0.95, 0.93, 0.9));
  material.backFaceCulling = false;
  material.alphaMode = Constants.ALPHA_COMBINE;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  plane.material = material;
  return plane;
}

function createProceduralPlanet(scene, body, look, sunDir) {
  const diameter = (2 * body.radiusKm) / KM_PER_UNIT;
  const sphere = CreateSphere(body.id, { diameter, segments: body.radiusKm > 20000 ? 96 : 64 }, scene);
  const color = (v) => new Color3(...v);
  let material;
  if (look.shader === 'gas') {
    material = shader(scene, 'gas', gasFrag, ['sun', 'colorA', 'colorB', 'colorC', 'bands', 'turbulence', 'spot']);
    material.setColor3('colorC', color(look.colorC));
    material.setFloat('bands', look.bands);
    material.setFloat('turbulence', look.turbulence);
    material.setFloat('spot', look.spot);
  } else {
    material = shader(scene, 'rocky', rockyFrag, ['sun', 'colorA', 'colorB', 'cap', 'haze', 'contrast']);
    material.setFloat('cap', look.cap);
    material.setFloat('haze', look.haze);
    material.setFloat('contrast', look.contrast);
  }
  material.setColor3('colorA', color(look.colorA));
  material.setColor3('colorB', color(look.colorB));
  material.setVector3('sun', sunDir);
  sphere.material = material;

  const meshes = [sphere];
  if (look.rings) meshes.push(createRings(scene, body, look.rings));
  return {
    body,
    meshes,
    spin(elapsed) {
      sphere.rotation.y = (elapsed * 2 * Math.PI) / look.dayS;
    },
  };
}

// One entry per rendered body: { body, meshes, spin(elapsed) }. The Sun is drawn by sun.js.
export function createBodyMeshes(scene, bodies, sunBody) {
  const made = [];
  for (const body of bodies) {
    const sunDir = sunDirectionFor(body, sunBody);
    if (body.id === 'earth') made.push(createEarth(scene, body, sunDir));
    else if (body.id === 'moon') made.push(createMoon(scene, body, sunDir));
    else if (LOOKS[body.id]) made.push(createProceduralPlanet(scene, body, LOOKS[body.id], sunDir));
  }
  return made;
}
