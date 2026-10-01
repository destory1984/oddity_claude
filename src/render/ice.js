import { StandardMaterial, Color3, CreateIcoSphere } from './babylon.js';

// Ice chunks thrown up when the traveler flies through Saturn's rings. The rings are
// countless lumps of water ice, from dust to boulders; here a handful of them scatter
// past the character and tumble away. They live in the character's own scene.
const COUNT = 90;

export function createIce(scene) {
  const material = new StandardMaterial('ice', scene);
  material.diffuseColor = new Color3(0.86, 0.92, 1);
  material.emissiveColor = new Color3(0.3, 0.36, 0.46);
  material.specularColor = new Color3(0.6, 0.6, 0.6);

  let seed = 9001;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const chunks = [];
  for (let i = 0; i < COUNT; i++) {
    const mesh = CreateIcoSphere(`ice${i}`, { radius: 0.5, subdivisions: 1, flat: true }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    chunks.push({ mesh, life: 0, span: 1, size: 0.1, v: [0, 0, 0], spin: [0, 0, 0] });
  }

  // amount 0..1: how dense the ring was where it was crossed.
  function burst(amount) {
    const n = Math.round(COUNT * (0.35 + 0.65 * Math.min(1, Math.max(0, amount))));
    for (let i = 0; i < n; i++) {
      const c = chunks[i];
      // Start in a loose cloud round the character (she stands near z = 6) ...
      c.mesh.position.set((rand() - 0.5) * 9, (rand() - 0.5) * 6 - 0.4, 3 + rand() * 12);
      // ... and stream back past the camera, spreading outward.
      c.v = [c.mesh.position.x * (0.4 + rand() * 0.8), (c.mesh.position.y + 0.4) * (0.4 + rand() * 0.8) + 0.3, -(3 + rand() * 9)];
      c.spin = [rand() * 6 - 3, rand() * 6 - 3, rand() * 6 - 3];
      c.size = 0.04 + rand() * rand() * 0.3;
      c.span = 1.2 + rand() * 1.6;
      c.life = c.span;
      c.mesh.scaling.set(c.size * (0.6 + rand() * 0.8), c.size * (0.6 + rand() * 0.8), c.size);
      c.mesh.setEnabled(true);
    }
  }

  function update(dt) {
    for (const c of chunks) {
      if (c.life <= 0) continue;
      c.life -= dt;
      if (c.life <= 0) {
        c.mesh.setEnabled(false);
        continue;
      }
      c.mesh.position.x += c.v[0] * dt;
      c.mesh.position.y += c.v[1] * dt;
      c.mesh.position.z += c.v[2] * dt;
      c.mesh.rotation.x += c.spin[0] * dt;
      c.mesh.rotation.y += c.spin[1] * dt;
      c.mesh.rotation.z += c.spin[2] * dt;
      // Shrink away over the last third of its life instead of popping out.
      const fade = Math.min(1, (c.life / c.span) * 3);
      c.mesh.scaling.setAll(c.size * fade);
    }
  }

  return { burst, update };
}
