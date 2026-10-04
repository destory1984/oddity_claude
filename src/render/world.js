import {
  Engine, Scene, FreeCamera, Vector3, Color4, Quaternion, HemisphericLight, DirectionalLight,
} from './babylon.js';
import { BODIES, KM_PER_UNIT } from '../core/bodies.js';
import { multiply } from '../core/orientation.js';
import { sunVisibility, eclipseDepth, sunBead } from '../core/occlusion.js';
import { heroLighting } from '../core/heroLight.js';
import { planetshine } from '../core/shine.js';
import { createBodyMeshes } from './planets.js';
import { createSun } from './sun.js';
import { createStars } from './stars.js';
import { createSpriteHero } from './spriteHero.js';
import { createCraft, createSiteModels } from './craft.js';
import { storySitesAt } from '../core/stories.js';
import { createComet } from './comet.js';
import { createMeteors } from './meteors.js';
import { createGlows } from './glows.js';
import { glowsNear } from '../core/glows.js';
import { SHADOW_CASTERS, castShadows, shadowsNear } from '../core/shadows.js';
import { createBelt } from './belt.js';
import { inBelt } from '../core/belt.js';
import { createIce } from './ice.js';
import { ringCrossing, ringDensity } from '../core/rings.js';
import { eyeView } from '../core/eye.js';
import { sunFrame } from '../core/sunView.js';
import { CRAFT } from '../core/craft.js';
import { normalize } from './math.js';

// Floating origin: the player stays at the scene origin and every body is placed
// relative to it, one scene unit per 1,000 km.
export async function createWorld(canvas, bodies = BODIES) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance',
  });
  // Inside the phone-shaped frame of a wide window (src/shell.js) the page is scaled to
  // the window's height: the picture is drawn that much finer so it stays sharp.
  const sharpen = () => {
    const zoom = Number(window.frameElement?.dataset.scale) || 1;
    engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.6) / Math.max(1, zoom));
  };
  sharpen();

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.002, 0.004, 0.012, 1);
  const camera = new FreeCamera('pilot', Vector3.Zero(), scene);
  camera.minZ = 0.01;
  camera.maxZ = 400000; // same as the prototype; the Sun is about 2,192 units away at start
  camera.fov = Math.PI / 3;
  camera.inputs.clear();

  const sunBody = bodies.find((b) => b.kind === 'star');
  const rendered = createBodyMeshes(scene, bodies, sunBody);
  const sun = createSun(scene, sunBody);
  const stars = await createStars(scene);
  const belt = await createBelt(scene);
  // Lights only matter to the spacecraft; planets and the Sun use their own shaders.
  const craftFill = new HemisphericLight('craftFill', new Vector3(0, 1, 0), scene);
  craftFill.intensity = 0.35;
  const craftSun = new DirectionalLight('craftSun', new Vector3(0, 0, 1), scene);
  craftSun.intensity = 1.1;
  const craftMeshes = createCraft(scene, CRAFT);
  const siteModels = createSiteModels(scene, storySitesAt(0, bodies));
  // A glow and a tail for each comet.
  const comets = bodies.filter((b) => b.kind === 'comet').map((b) => ({ id: b.id, glow: createComet(scene) }));
  const meteors = createMeteors(scene);
  const glows = createGlows(scene, bodies);

  // The character (the pixel-art drawings) is drawn in the camera's own space.
  const hero = createSpriteHero(engine);
  const ice = createIce(hero.scene);
  // The traveler's place relative to each ringed planet last frame, to catch a crossing.
  const lastByRings = new Map();

  const relative = (body, position) => body.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
  let elapsed = 0;

  // now: where every body is this frame (they orbit); defaults to the starting layout.
  // seen: { position, orientation } when the view is from somewhere other than where
  // the traveler is (looking round a target, ui/photo.js); she herself stays put.
  function update({ bodies: now = bodies, craft = [], hiddenCraft = [], sites = [], jolt = null, position: traveler, orientation, dt, speed, photoOrientation, heroVisible, turn, move = {}, seen = null, lamp = null, trail = null, replay = null }) {
    elapsed += dt;
    // Draw from a point just above the ground when standing on it, and pull the near
    // plane in as the ground gets close; otherwise the planet under the feet is cut away
    // and looks transparent (core/eye.js).
    const eye = eyeView(seen?.position ?? traveler, now);
    const position = eye.position;
    camera.minZ = eye.nearKm / KM_PER_UNIT;
    const directions = {};
    const distances = {};
    const sunNow = now.find((b) => b.kind === 'star');
    for (const body of now) {
      const rel = relative(body, position);
      const length = Math.hypot(...rel);
      directions[body.id] = rel.map((n) => n / length);
      distances[body.id] = length * KM_PER_UNIT;
    }

    let ringCrossed = null;
    let ringAt = null;
    for (const item of rendered) {
      const body = now.find((b) => b.id === item.body.id) ?? item.body;
      const rel = relative(body, position);
      if (item.rings) {
        const from = traveler.map((n, i) => n - body.position[i]);
        const before = lastByRings.get(body.id);
        const hit = before && dt > 0 && ringCrossing(before, from, item.rings.normal, item.rings.innerKm, item.rings.outerKm);
        if (hit) {
          ice.burst(ringDensity(hit.t));
          ringCrossed = body.id;
          ringAt = hit.t;
        }
        lastByRings.set(body.id, from);
      }
      for (const mesh of item.meshes) mesh.position.set(rel[0], rel[1], rel[2]);
      item.spin(elapsed);
      item.setClose?.(Math.max(0, (Math.hypot(...rel) * KM_PER_UNIT) / body.radiusKm - 1));
      // lamp: { id, direction } lights one body from elsewhere than the Sun, while a
      // place in its night is being looked at closely (core/lamp.js).
      // A planet of another star is lit by that star (core/exo.js).
      const lightFrom = body.star ? now.find((b) => b.id === body.star) : sunNow;
      item.setSun(lamp?.id === body.id ? lamp.direction : normalize(lightFrom.position.map((n, i) => n - body.position[i])));
      if (SHADOW_CASTERS[body.id]) item.setShadows?.(castShadows(body.id, now));
      // A moon is lit a little by the planet it goes round (core/shine.js).
      if (body.kind === 'moon' && item.setShine) {
        const planet = now.find((b) => b.id === body.parent);
        if (planet) item.setShine(planetshine(body, planet, sunNow));
      }
    }
    const sunRel = relative(sunNow, position);
    sun.mesh.position.set(sunRel[0], sunRel[1], sunRel[2]);

    for (const c of [...craft, ...sites]) {
      const rel = relative(c, position);
      const length = Math.hypot(...rel);
      directions[c.id] = rel.map((n) => n / length);
      distances[c.id] = length * KM_PER_UNIT;
    }
    craftMeshes.update(craft, position, sunNow.position, jolt, hiddenCraft);
    siteModels.update(sites, now, position, replay);
    craftSun.direction = new Vector3(...normalize(sunRel)).scale(-1);
    for (const { id, glow } of comets) glow.update(now.find((b) => b.id === id), position, sunNow.position);
    const meteorLit = meteors.update(dt, now.find((b) => b.id === 'earth'), sunNow.position, position);
    const flashed = glows.update(dt, elapsed, now, sunNow.position, position);
    belt.update(position, sunNow.position, directions[sunNow.id]);

    // (Nothing of another star's hides the Sun: from there it is one point among the stars.)
    const occluders = now.filter((b) => b.kind !== 'star' && !b.exo).map((b) => ({
      direction: directions[b.id], distance: distances[b.id], radius: b.radiusKm,
    }));
    const visibility = sunVisibility(directions[sunNow.id], distances[sunNow.id], sunNow.radiusKm, occluders);
    stars.setSun(directions[sunNow.id]);
    // The stars drawn out by speed: { heading, amount } (core/speedFeel.js).
    stars.setStreak(trail?.heading ?? null, trail?.amount ?? 0);
    sun.material.setFloat('visibility', visibility);
    sun.material.setFloat('time', elapsed);
    sun.material.setFloat('eclipse', eclipseDepth(visibility));
    const bead = sunBead(directions[sunNow.id], distances[sunNow.id], sunNow.radiusKm, occluders);

    camera.rotationQuaternion = new Quaternion(...(seen?.orientation ?? multiply(orientation, photoOrientation || [0, 0, 0, 1])));
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
    hero.update({
      dt, speed, turn, fov: camera.fov, photoOrientation, visible: heroVisible, aspect, move,
      light: heroLighting({ position: traveler, orientation, bodies: now, sunVisibility: visibility }),
    });
    ice.update(dt);

    camera.computeWorldMatrix(true); // axes below must reflect this frame's rotation
    const axis = (v) => {
      const d = camera.getDirection(v);
      return [d.x, d.y, d.z];
    };
    const [right, up] = [axis(Vector3.Right()), axis(Vector3.Up())];
    // What is on the Sun's card is looked up in the Sun's own axes (core/sunView.js),
    // along each pixel's line of sight from the eye.
    const card = sunFrame(directions[sunNow.id], right);
    // The bead of the diamond ring, in those axes.
    const across = (a) => bead.direction.reduce((sum, n, i) => sum + n * a[i], 0);
    sun.material.setVector3('bead', new Vector3(across(card.right), across(card.up), bead.strength));
    sun.material.setFloat('eyeDist', Math.max(1.0005, distances[sunNow.id] / sunNow.radiusKm));
    sun.material.setVector3('axisR', new Vector3(...card.right));
    sun.material.setVector3('axisU', new Vector3(...card.up));
    sun.material.setVector3('axisF', new Vector3(...card.away));
    return {
      directions,
      distances,
      sunVisibility: visibility,
      ringCrossed,
      // Where along the rings the crossing was: 0 at the inner edge, 1 at the outer.
      ringAt,
      inBelt: inBelt(traveler, sunNow.position),
      meteorLit,
      // A flash (lightning, a sprite, an impact on the Moon) in the frame it happens.
      glow: flashed,
      // Everything of that kind within reach, the nearest thing first (core/glows.js).
      glowsNear: [...glowsNear(now, traveler), ...shadowsNear(now, traveler)],
      // The sprite character's drawing; the paper model has none.
      heroSheet: hero.sheet ? hero.sheet() : null,
      // Where her drawing is on screen: { file, height, up, shape } (render/spriteHero.js).
      heroCard: hero.card ? hero.card() : null,
      camera: {
        forward: axis(Vector3.Forward()),
        right: axis(Vector3.Right()),
        up: axis(Vector3.Up()),
        fov: camera.fov,
      },
    };
  }

  await scene.whenReadyAsync();

  return {
    engine,
    update,
    // Whether something is drawn standing at a story place.
    hasSiteModel: (id) => siteModels.has(id),
    // The direction square to a body's rings ([x, y, z]), or null when it has none.
    ringNormal(id) {
      return rendered.find((item) => item.body.id === id)?.rings?.normal ?? null;
    },
    render() {
      scene.render();
      hero.scene.render();
    },
    resize() {
      sharpen();
      engine.resize();
    },
    setFov(radians) {
      camera.fov = radians;
    },
    fov() {
      return camera.fov;
    },
  };
}
