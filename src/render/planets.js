import { CreateSphere, ShaderMaterial, Effect, Texture, Vector3, Constants } from './babylon.js';
import vertex from './shaders/body.vert?raw';
import planetFrag from './shaders/planet.frag?raw';
import lunarFrag from './shaders/lunar.frag?raw';
import cloudsFrag from './shaders/clouds.frag?raw';
import airFrag from './shaders/air.frag?raw';
import { KM_PER_UNIT } from '../core/bodies.js';
import { normalize } from './math.js';

const SIDEREAL_DAY_S = 86164;
const EARTH_START_SPIN = 1.35;
// Shell sizes relative to the Earth sphere, kept from the prototype (12.776 and 13.0 over 12.742).
const CLOUD_SCALE = 12.776 / 12.742;
const AIR_SCALE = 13.0 / 12.742;

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

// One entry per rendered body: { body, meshes, spin(elapsed) }. The Sun is drawn by sun.js.
export function createBodyMeshes(scene, bodies, sunBody) {
  const made = [];
  for (const body of bodies) {
    if (body.id === 'earth') made.push(createEarth(scene, body, sunDirectionFor(body, sunBody)));
    else if (body.id === 'moon') made.push(createMoon(scene, body, sunDirectionFor(body, sunBody)));
  }
  return made;
}
