import { Engine, Scene, FreeCamera, Vector3, Color4, Quaternion } from './babylon.js';
import { BODIES, KM_PER_UNIT } from '../core/bodies.js';
import { multiply } from '../core/orientation.js';
import { sunVisibility } from '../core/occlusion.js';
import { createBodyMeshes } from './planets.js';
import { createSun } from './sun.js';
import { createStars } from './stars.js';
import { createHero } from './hero.js';
import { normalize } from './math.js';

// Floating origin: the player stays at the scene origin and every body is placed
// relative to it, one scene unit per 1,000 km.
export async function createWorld(canvas, bodies = BODIES) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance',
  });
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.6));

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
  await createStars(scene);

  // The character's sunlight is set once from the starting view, as in the prototype.
  const earth = bodies.find((b) => b.id === 'earth');
  const heroSun = new Vector3(...normalize(sunBody.position.map((n, i) => n - earth.position[i])));
  const hero = createHero(engine, heroSun);

  const relative = (body, position) => body.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
  let elapsed = 0;

  // now: where every body is this frame (they orbit); defaults to the starting layout.
  function update({ bodies: now = bodies, position, orientation, dt, speed, photoOrientation, heroVisible, turn }) {
    elapsed += dt;
    const directions = {};
    const distances = {};
    const sunNow = now.find((b) => b.kind === 'star');
    for (const body of now) {
      const rel = relative(body, position);
      const length = Math.hypot(...rel);
      directions[body.id] = rel.map((n) => n / length);
      distances[body.id] = length * KM_PER_UNIT;
    }

    for (const item of rendered) {
      const body = now.find((b) => b.id === item.body.id) ?? item.body;
      const rel = relative(body, position);
      for (const mesh of item.meshes) mesh.position.set(rel[0], rel[1], rel[2]);
      item.spin(elapsed);
      item.setSun(normalize(sunNow.position.map((n, i) => n - body.position[i])));
    }
    const sunRel = relative(sunNow, position);
    sun.mesh.position.set(sunRel[0], sunRel[1], sunRel[2]);

    const occluders = now.filter((b) => b.kind !== 'star').map((b) => ({
      direction: directions[b.id], distance: distances[b.id], radius: b.radiusKm,
    }));
    const visibility = sunVisibility(directions[sunNow.id], distances[sunNow.id], sunNow.radiusKm, occluders);
    sun.material.setFloat('visibility', visibility);

    camera.rotationQuaternion = new Quaternion(...multiply(orientation, photoOrientation || [0, 0, 0, 1]));
    hero.update({ dt, speed, turn, fov: camera.fov, photoOrientation, visible: heroVisible });

    camera.computeWorldMatrix(true); // axes below must reflect this frame's rotation
    const axis = (v) => {
      const d = camera.getDirection(v);
      return [d.x, d.y, d.z];
    };
    return {
      directions,
      distances,
      sunVisibility: visibility,
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
    render() {
      scene.render();
      hero.scene.render();
    },
    resize() {
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
