import { CreateCylinder, CreatePlane, StandardMaterial, DynamicTexture, Color3, Vector3, Quaternion, Constants, Mesh } from './babylon.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import {
  METEOR_RANGE_KM, METEOR_ALTITUDE_KM, METEOR_LIFE_S, FIREBALL_LIFE_S, METEOR_COLOURS, meteorSpot, meteorGap, meteorGlow, meteorKind,
  inShower, showerGap, showerRadiant, showerSpot,
} from '../core/meteors.js';

const POOL = 64; // six were enough until the showers (core/meteors.js inShower)
// Trail thickness as a share of its distance from the traveler: a few pixels at the head.
// (0.0075 at first, with heads 7 wide and showers 1.5 times: the user, "너무 큰데? ㅋㅋㅋ".)
const THICK = 0.0042;
// A shower's meteors are drawn this many times as long and thick as the common ones.
const SHOWER_SIZE = 1.2;
// The glow round the head, as many times the trail's thickness across.
const HEAD = 5;

// A trail's light along its length: white hot at the head, its own colour behind, gone
// at the tail. Drawn down the picture; the cylinder's head end takes the top of it.
function trailTexture(scene, name, [r, g, b]) {
  const texture = new DynamicTexture(name, { width: 4, height: 64 }, scene, true);
  const ctx = texture.getContext();
  const light = ctx.createLinearGradient(0, 0, 0, 64);
  light.addColorStop(0, 'rgb(255,255,255)');
  light.addColorStop(0.08, `rgb(${Math.round(140 + r * 0.45)},${Math.round(140 + g * 0.45)},${Math.round(140 + b * 0.45)})`);
  light.addColorStop(0.3, `rgb(${Math.round(r * 0.75)},${Math.round(g * 0.75)},${Math.round(b * 0.75)})`);
  light.addColorStop(0.7, `rgb(${Math.round(r * 0.25)},${Math.round(g * 0.25)},${Math.round(b * 0.25)})`);
  light.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 4, 64);
  texture.update();
  return texture;
}

// The glow round a meteor's head: a round soft light of its colour, on black.
function headTexture(scene, name, [r, g, b]) {
  const texture = new DynamicTexture(name, { width: 64, height: 64 }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 64, 64);
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.12, `rgba(${r},${g},${b},0.85)`);
  glow.addColorStop(0.4, `rgba(${r},${g},${b},0.22)`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  texture.update();
  return texture;
}

// A material that only adds its picture's light.
function lightOf(scene, name) {
  const material = new StandardMaterial(name, scene);
  material.emissiveColor = new Color3(0, 0, 0);
  material.diffuseColor = new Color3(0, 0, 0);
  material.specularColor = new Color3(0, 0, 0);
  material.disableLighting = true;
  material.alphaMode = Constants.ALPHA_ADD;
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  return material;
}

// Shooting stars on Earth's night side (core/meteors.js): bright trails, reused. Each
// lights at a spot, runs its length along the top of the air and fades: a white head
// with a glow round it and a tail of its own colour (white, green, gold or blue: the
// user, 2026-10-06, of the thin pale scratches they were, "엄청난 쇼는 아니네", "좀 더
// 예쁘게 해보자"). Now and then a fireball: thicker, slower, and it bursts at its end.
export function createMeteors(scene) {
  const tails = METEOR_COLOURS.map((colour, n) => trailTexture(scene, `meteorTail${n}`, colour));
  const heads = METEOR_COLOURS.map((colour, n) => headTexture(scene, `meteorHead${n}`, colour));
  const trails = [];
  for (let i = 0; i < POOL; i++) {
    const material = lightOf(scene, `meteor${i}`);
    material.emissiveTexture = tails[0];
    const mesh = CreateCylinder(`meteor${i}`, { height: 1, diameterTop: 0.08, diameterBottom: 1, tessellation: 6, cap: Mesh.NO_CAP }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.rotationQuaternion = new Quaternion();
    mesh.setEnabled(false);
    const glow = lightOf(scene, `meteorGlow${i}`);
    glow.emissiveTexture = heads[0];
    const head = CreatePlane(`meteorGlow${i}`, { size: 1 }, scene);
    head.material = glow;
    head.isPickable = false;
    head.billboardMode = Mesh.BILLBOARDMODE_ALL;
    head.setEnabled(false);
    trails.push({ mesh, material, head, glow, spot: null, age: 0, kind: null, size: 1 });
  }
  let wait = 0.5;
  // Seconds spent near Earth, for the showers, and the shower's radiant while one falls.
  let near = 0;
  let radiant = null;

  // earth, sunPosition, position: km. Returns true in the frame a meteor lights.
  function update(dt, earth, sunPosition, position) {
    const out = position.map((n, i) => n - earth.position[i]);
    const distance = Math.hypot(...out);
    const inRange = distance - earth.radiusKm <= METEOR_RANGE_KM;
    let lit = false;
    if (inRange) {
      wait -= dt;
      near += dt;
      const toSun = sunPosition.map((n, i) => n - earth.position[i]);
      const sunLength = Math.hypot(...toSun);
      const sunward = toSun.map((n) => n / sunLength);
      const shower = inShower(near);
      if (shower && !radiant) {
        radiant = showerRadiant(Math.random, sunward);
        wait = 0;
      } else if (!shower) radiant = null;
      const free = trails.find((t) => !t.spot);
      if (wait <= 0 && free) {
        const toTraveler = out.map((n) => n / distance);
        free.spot = radiant ? showerSpot(Math.random, sunward, toTraveler, radiant) : meteorSpot(Math.random, sunward, toTraveler);
        free.age = 0;
        free.kind = meteorKind(Math.random, Boolean(radiant));
        free.size = free.kind.size * (radiant ? SHOWER_SIZE : 1);
        free.material.emissiveTexture = tails[free.kind.colour];
        free.glow.emissiveTexture = heads[free.kind.colour];
        wait = radiant ? showerGap(Math.random) : meteorGap(Math.random);
        lit = Boolean(free.spot);
      }
    }
    for (const trail of trails) {
      if (!trail.spot) continue;
      trail.age += dt;
      const life = trail.kind.fireball ? FIREBALL_LIFE_S : METEOR_LIFE_S;
      const glow = inRange ? meteorGlow(trail.age, life) : 0;
      if (glow <= 0 && trail.age > 0) {
        trail.spot = null;
        trail.mesh.setEnabled(false);
        trail.head.setEnabled(false);
        continue;
      }
      const { up, along } = trail.spot;
      const lengthKm = trail.spot.lengthKm * trail.size;
      // The head runs forward along the trail as it burns; the tail trails behind it.
      const run = (trail.age / life) * lengthKm;
      const top = up.map((n, i) => earth.position[i] + n * (earth.radiusKm + METEOR_ALTITUDE_KM));
      const centre = top.map((n, i) => n + along[i] * (run - lengthKm / 2));
      const rel = centre.map((n, i) => (n - position[i]) / KM_PER_UNIT);
      const thick = Math.hypot(...rel) * THICK * trail.size;
      trail.mesh.setEnabled(true);
      trail.mesh.position.set(rel[0], rel[1], rel[2]);
      // The cylinder's own axis (+y, its thin end) lies back along the trail.
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), new Vector3(...along.map((n) => -n)), trail.mesh.rotationQuaternion);
      trail.mesh.scaling.set(thick, lengthKm / KM_PER_UNIT, thick);
      trail.material.alpha = 0.99 * glow;
      // The glow rides on the head. A fireball's swells as it bursts at the end.
      const front = top.map((n, i) => (n + along[i] * run - position[i]) / KM_PER_UNIT);
      const t = trail.age / life;
      const burst = trail.kind.fireball ? 1 + 3.5 * Math.max(0, (t - 0.7) / 0.3) ** 2 : 1;
      // The glow is a flat card facing the eye: drawn where the head is it would cut
      // into the ground and show an arc of its edge. It is brought toward the eye by
      // more than its own half width, along the line of sight, so it stays where it is
      // on the screen.
      const wide = thick * HEAD * burst;
      const far = Math.hypot(...front);
      const nearer = Math.max(0.5, (far - wide * 0.6) / far);
      trail.head.setEnabled(true);
      trail.head.position.set(front[0] * nearer, front[1] * nearer, front[2] * nearer);
      trail.head.scaling.setAll(wide * nearer);
      trail.glow.alpha = 0.99 * Math.min(1, glow * (trail.kind.fireball ? 1.6 : 1.1));
    }
    return lit;
  }

  // Whether a shower is falling now.
  return { update, shower: () => Boolean(radiant) };
}
