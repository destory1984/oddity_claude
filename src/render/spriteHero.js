import {
  Scene, FreeCamera, Vector3, Color3, Quaternion, StandardMaterial, Texture, CreatePlane, Mesh,
} from './babylon.js';
import { FLIGHT_SHEETS, FRAMES, createSpriteState, stepSprite, spriteFrame, spriteFile } from '../core/sprite.js';
import { heroScaleFor } from '../core/pose.js';
import { PAL_FPS, PAL_FRAMES, palFile } from '../core/pal.js';

// The character, drawn as pixel art: one flat card that always faces the camera,
// showing one of 152 drawings chosen by what the traveler is doing (core/sprite.js).

// The card: 192 x 256 drawings. Its height in the hero scene's units, where the
// folded-paper model this replaced stood about 2.9 tall. (At 3.4 she covered too much of the view.)
const CARD_HEIGHT = 2.4;
const CARD_AT = [0, -0.75, 6];
// The companion beside her (core/pal.js): 64 x 64 drawings on a card of its own, up by
// her left shoulder as the camera sees her.
const PAL_SIZE = (CARD_HEIGHT * 64) / 256;
const PAL_OFFSET = [-0.82, 0.78];

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

  const palCard = CreatePlane('heroPal', { width: PAL_SIZE, height: PAL_SIZE }, scene);
  palCard.billboardMode = Mesh.BILLBOARDMODE_ALL;
  palCard.isPickable = false;
  palCard.setEnabled(false);
  const palMaterial = new StandardMaterial('heroPal', scene);
  palMaterial.disableLighting = true;
  palMaterial.useAlphaFromDiffuseTexture = true;
  palMaterial.backFaceCulling = false;
  palCard.material = palMaterial;
  const palDrawings = new Map();
  function palDrawing(id, frame) {
    const file = palFile(id, frame);
    if (!palDrawings.has(file)) {
      const texture = new Texture(base + file, scene, true, true, Texture.NEAREST_SAMPLINGMODE);
      texture.hasAlpha = true;
      palDrawings.set(file, texture);
    }
    return palDrawings.get(file);
  }

  let state = createSpriteState();
  let elapsed = 0;
  // The drawing on the card now and where the card is on screen, for labels to pass
  // behind her (ui/hud.js maskHero); null while she is not drawn.
  let shown = null;
  let shownFile = null;

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
      shownFile = base + spriteFile(state.sheet, spriteFrame(state));
    }
    const lit = light ? 0.45 + 0.55 * light.sun.strength : 1;
    material.emissiveColor = new Color3(lit, lit, lit);
    card.scaling.setAll(heroScaleFor(aspect) / 1.3);
    // Sitting beside something on her left, the drawing (which looks right) is turned over.
    if (state.sheet === 'sit' && move.mirror) card.scaling.x = -card.scaling.x;
    // A slow bob while hovering.
    const afloat = state.mode === 'hover';
    card.position.y = CARD_AT[1] + (afloat ? Math.sin(elapsed * 1.5) * 0.04 : 0);
    card.setEnabled(visible);
    // The companion keeps its place by her shoulder and is hidden with her.
    const pal = move.pal ?? null;
    const palNow = pal ? palDrawing(pal, Math.floor(elapsed * PAL_FPS) % PAL_FRAMES) : null;
    palCard.setEnabled(Boolean(pal) && visible && palNow.isReady());
    if (palNow?.isReady()) {
      for (let frame = 0; frame < PAL_FRAMES; frame++) palDrawing(pal, frame);
      palMaterial.diffuseTexture = palNow;
      palMaterial.emissiveTexture = palNow;
      palMaterial.emissiveColor = new Color3(lit, lit, lit);
      const scale = card.scaling.y;
      palCard.scaling.setAll(scale);
      palCard.position.set(CARD_AT[0] + PAL_OFFSET[0] * scale, card.position.y + PAL_OFFSET[1] * scale, CARD_AT[2]);
    }
    // As shares of the view's height: the card's height, and how far its middle is
    // above the middle of the view. (The card faces the camera, 6 units ahead.)
    const span = 2 * CARD_AT[2] * Math.tan(fov / 2);
    shown = visible && shownFile && !photoOrientation
      ? { file: shownFile, height: (CARD_HEIGHT * card.scaling.y) / span, up: card.position.y / span, shape: 192 / 256 }
      : null;
    camera.fov = fov;
    camera.rotationQuaternion = new Quaternion(...(photoOrientation || [0, 0, 0, 1]));
  }

  return { scene, camera, root: card, update, sheet: () => state.sheet, card: () => shown };
}
