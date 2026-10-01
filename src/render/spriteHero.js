import {
  Scene, FreeCamera, Vector3, Color3, Quaternion, StandardMaterial, Texture, CreatePlane, Mesh,
} from './babylon.js';
import { FLIGHT_SHEETS, FRAMES, createSpriteState, stepSprite, spriteFrame, spriteFile } from '../core/sprite.js';
import { heroScaleFor } from '../core/pose.js';

// A trial of the character as pixel-art drawings instead of the folded-paper model:
// one flat card that always faces the camera, showing one of 152 drawings chosen by
// what the traveler is doing (core/sprite.js). Same interface as render/hero.js, so
// the world can use either.

// The card: 192 x 256 drawings. Its height in the hero scene's units, where the
// paper model stands about 2.9 tall. (At 3.4 she covered too much of the view.)
const CARD_HEIGHT = 2.4;
const CARD_AT = [0, -0.75, 6];

export function createSpriteHero(engine) {
  const scene = new Scene(engine);
  scene.autoClear = false;
  scene.autoClearDepthAndStencil = true;

  const camera = new FreeCamera('heroCamera', Vector3.Zero(), scene);
  camera.minZ = 0.1;
  camera.maxZ = 100;
  camera.inputs.clear();

  const card = CreatePlane('heroCard', { width: (CARD_HEIGHT * 192) / 256, height: CARD_HEIGHT }, scene);
  card.position.set(...CARD_AT);
  card.billboardMode = Mesh.BILLBOARDMODE_ALL;
  card.isPickable = false;

  // Drawings are loaded when first wanted, with hard pixel edges (1.4 MB in all; the
  // ones for flying, stopping and hovering are fetched at once so the first take-off
  // does not show a blank card).
  const base = `${import.meta.env.BASE_URL}assets/`;
  const loaded = new Map();
  function drawing(sheet, frame) {
    const file = spriteFile(sheet, frame);
    if (!loaded.has(file)) {
      const texture = new Texture(base + file, scene, true, true, Texture.NEAREST_SAMPLINGMODE);
      texture.hasAlpha = true;
      loaded.set(file, texture);
    }
    return loaded.get(file);
  }
  for (const sheet of ['idle', 'brake', ...FLIGHT_SHEETS]) for (let frame = 0; frame < FRAMES; frame++) drawing(sheet, frame);
  // Drawn as painted, not shaded: only dimmed in a planet's shadow.
  const material = new StandardMaterial('heroCard', scene);
  material.disableLighting = true;
  material.diffuseTexture = drawing('idle', 0);
  material.emissiveTexture = drawing('idle', 0);
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  card.material = material;

  let state = createSpriteState();
  let elapsed = 0;

  // move: { drive, strafe } from the flight state; light: core/heroLight.js heroLighting().
  function update({ dt, speed, turn, fov, photoOrientation, visible, aspect = 16 / 9, light = null, move = {} }) {
    elapsed += dt;
    state = stepSprite(state, { speed, turn, ...move }, dt);
    // A drawing still on its way keeps the last one up rather than a blank card; all
    // four of a sheet are asked for together.
    for (let frame = 0; frame < FRAMES; frame++) drawing(state.sheet, frame);
    const now = drawing(state.sheet, spriteFrame(state));
    if (now.isReady()) {
      material.diffuseTexture = now;
      material.emissiveTexture = now;
    }
    const lit = light ? 0.45 + 0.55 * light.sun.strength : 1;
    material.emissiveColor = new Color3(lit, lit, lit);
    card.scaling.setAll(heroScaleFor(aspect) / 1.3);
    // A slow bob while hovering, as the paper model has.
    const afloat = state.mode === 'hover';
    card.position.y = CARD_AT[1] + (afloat ? Math.sin(elapsed * 1.5) * 0.04 : 0);
    card.setEnabled(visible);
    camera.fov = fov;
    camera.rotationQuaternion = new Quaternion(...(photoOrientation || [0, 0, 0, 1]));
  }

  return { scene, camera, root: card, update, sheet: () => state.sheet };
}
