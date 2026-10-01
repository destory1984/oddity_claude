import { PointsCloudSystem, Vector3, Color4, CreateSphere, Constants } from './babylon.js';
import skyFrag from './shaders/sky.frag?raw';
import { shader } from './planets.js';

// The galaxy's plane is tilted 60 degrees to the planets' plane. In the game's axes
// (y north of the ecliptic) the galactic north pole is at ecliptic longitude 180,
// latitude 29.8 degrees, and the centre (Sagittarius) at longitude 266.8, latitude -5.5.
const rad = (deg) => (deg * Math.PI) / 180;
const fromEcliptic = (lonDeg, latDeg) => new Vector3(
  Math.cos(rad(latDeg)) * Math.cos(rad(lonDeg)), Math.sin(rad(latDeg)), Math.cos(rad(latDeg)) * Math.sin(rad(lonDeg)),
);
const GALACTIC_POLE = fromEcliptic(180, 29.8);
const GALACTIC_CENTRE = fromEcliptic(266.8, -5.5);

// Sparse, fixed celestial background. Points are distant directions, not nearby dust.
export async function createStars(scene) {
  let seed = 78123;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const cloud = new PointsCloudSystem('stars', 1.5, scene);
  cloud.addPoints(1400, (p) => {
    const z = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    p.position = new Vector3(r * Math.cos(t), z, r * Math.sin(t)).scale(80000);
    const v = 0.35 + rand() * 0.55;
    p.color = new Color4(v * 0.87, v * 0.93, v, 1);
  });
  // Fainter stars crowding the Milky Way's band, thickest toward the galactic centre.
  const side = Vector3.Cross(GALACTIC_POLE, GALACTIC_CENTRE);
  cloud.addPoints(2200, (p) => {
    // Longitude leans toward the centre; latitude is a narrow bell round the plane.
    const lon = (rand() + rand() + rand() - 1.5) * Math.PI * 0.67 * (rand() < 0.6 ? 1 : 2.2);
    const lat = (rand() + rand() + rand() - 1.5) * 0.22;
    const inPlane = GALACTIC_CENTRE.scale(Math.cos(lon)).add(side.scale(Math.sin(lon)));
    p.position = inPlane.scale(Math.cos(lat)).add(GALACTIC_POLE.scale(Math.sin(lat))).scale(80000);
    const v = 0.16 + rand() * 0.3;
    p.color = new Color4(v, v * 0.95, v * 0.88, 1);
  });
  await cloud.buildMeshAsync();
  cloud.mesh.alwaysSelectAsActiveMesh = true;
  cloud.mesh.isPickable = false;

  // The Milky Way's glow, painted on the inside of a sphere just nearer than the stars.
  const sky = CreateSphere('milkyWay', { diameter: 2 * 79000, segments: 24, sideOrientation: 1 }, scene);
  const material = shader(scene, 'sky', skyFrag, ['pole', 'centre']);
  material.setVector3('pole', GALACTIC_POLE);
  material.setVector3('centre', GALACTIC_CENTRE);
  material.backFaceCulling = false;
  material.alphaMode = Constants.ALPHA_ADD;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  sky.material = material;
  sky.isPickable = false;
  sky.alwaysSelectAsActiveMesh = true;
  sky.alphaIndex = 0; // drawn before the rings and the Sun's glare, which do not write depth
  return cloud.mesh;
}
