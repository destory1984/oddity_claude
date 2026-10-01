import { PointsCloudSystem, Vector3, Color4 } from './babylon.js';

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
  await cloud.buildMeshAsync();
  cloud.mesh.alwaysSelectAsActiveMesh = true;
  cloud.mesh.isPickable = false;
  return cloud.mesh;
}
