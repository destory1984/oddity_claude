import {
  Scene, FreeCamera, Vector3, Color3, Quaternion, StandardMaterial, Texture, CreatePlane, Mesh,
} from './babylon.js';
import { SHEETS, FRAMES, createSpriteState, stepSprite, spriteFrame, spriteFile } from '../core/sprite.js';
import { heroScaleFor } from '../core/pose.js';

// A trial of the character as pixel-art drawings instead of the folded-paper model:
// one flat card that always faces the camera, showing one of 32 drawings chosen by
// what the traveler is doing (core/sprite.js). Same interface as render/hero.js, so
// the world can use either.

// The card: 192 x 256 drawings. Its height in the hero scene's units, where the
// paper model stands about 2.9 tall.
const CARD_HEIGHT = 3.4;
const CARD_AT = [0, -0.55, 6];

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

  // Every drawing is loaded up front (1.6 MB in all), with hard pixel edges.
  const base = `${import.meta.env.BASE_URL}assets/`;
  const drawings = {};
  for (const sheet of SHEETS) {
    drawings[sheet] = [];
    for (let frame = 0; frame < FRAMES; frame++) {
      const texture = new Texture(base + spriteFile(sheet, frame), scene, true, true, Texture.NEAREST_SAMPLINGMODE);
      texture.hasAlpha = true;
      drawings[sheet].push(texture);
    }
  }
  // Drawn as painted, not shaded: only dimmed in a planet's shadow.
  const material = new StandardMaterial('heroCard', scene);
  material.disableLighting = true;
  material.diffuseTexture = drawings.idle[0];
  material.emissiveTexture = drawings.idle[0];
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  card.material = material;

  let state = createSpriteState();
  let elapsed = 0;

  // move: { drive, strafe } from the flight state; light: core/heroLight.js heroLighting().
  function update({ dt, speed, turn, fov, photoOrientation, visible, aspect = 16 / 9, light = null, move = {} }) {
    elapsed += dt;
    state = stepSprite(state, { speed, drive: move.drive ?? 0, strafe: move.strafe ?? 0, turn }, dt);
    const drawing = drawings[state.sheet][spriteFrame(state)];
    material.diffuseTexture = drawing;
    material.emissiveTexture = drawing;
    const lit = light ? 0.45 + 0.55 * light.sun.strength : 1;
    material.emissiveColor = new Color3(lit, lit, lit);
    card.scaling.setAll(heroScaleFor(aspect) / 1.3);
    // A slow bob while hovering, as the paper model has.
    card.position.y = CARD_AT[1] + (state.moving ? 0 : Math.sin(elapsed * 1.5) * 0.04);
    card.setEnabled(visible);
    camera.fov = fov;
    camera.rotationQuaternion = new Quaternion(...(photoOrientation || [0, 0, 0, 1]));
  }

  return { scene, camera, root: card, update, sheet: () => state.sheet };
}
