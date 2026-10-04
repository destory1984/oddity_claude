import { Vector3, Quaternion, Color3, CreatePlane, StandardMaterial, Texture, TransformNode, DynamicTexture } from './babylon.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import { CRAFT_SIZE_KM } from '../core/craft.js';
import { craftMaterials } from './craftParts.js';
import { CRAFT_BUILD } from './craftModels.js';
import { SITE_BUILD, SITE_REPLAY_BUILD } from './siteModels.js';
import { drum, dish, rod, group, box } from './craftParts.js';

// Spacecraft and landers. The models are in craftModels.js (in orbit) and
// siteModels.js (on the ground), built from the parts in craftParts.js; this file
// places them each frame.
// Real craft are metres across; here they are shown 30 km wide, and from farther away
// they keep the same size on screen so they can be found at all.

const APPARENT = 0.05; // shown width as a share of the distance
// How far each one can be seen, and the largest it may be drawn (Hubble flies only
// 540 km above Earth, so it must stay small enough not to dip into the planet).
const RULES = {
  voyager1: { visibleKm: 3e6, maxKm: Infinity },
  voyager2: { visibleKm: 3e6, maxKm: Infinity },
  hubble: { visibleKm: 60000, maxKm: 300 },
  jwst: { visibleKm: 400000, maxKm: 4000 },
  kepler: { visibleKm: 400000, maxKm: 4000 },
  // Chandra comes within 1,600 km of Earth, so it too must stay small.
  chandra: { visibleKm: 100000, maxKm: 600 },
  euclid: { visibleKm: 400000, maxKm: 4000 },
  // Low over a planet: small, like Hubble.
  iss: { visibleKm: 60000, maxKm: 300 },
  tiangong: { visibleKm: 60000, maxKm: 300 },
  sputnik: { visibleKm: 60000, maxKm: 300 },
  mro: { visibleKm: 60000, maxKm: 200 },
  juno: { visibleKm: 400000, maxKm: 4000 },
  cassini: { visibleKm: 400000, maxKm: 4000 },
  parker: { visibleKm: 400000, maxKm: 4000 },
  roadster: { visibleKm: 400000, maxKm: 4000 },
  newHorizons: { visibleKm: 3e6, maxKm: Infinity },
  pioneer10: { visibleKm: 3e6, maxKm: Infinity },
  // 100 km over the Moon: smaller still.
  danuri: { visibleKm: 30000, maxKm: 60 },
  lro: { visibleKm: 30000, maxKm: 60 },
  europaClipper: { visibleKm: 400000, maxKm: 4000 },
  lucy: { visibleKm: 400000, maxKm: 4000 },
  pioneer11: { visibleKm: 3e6, maxKm: Infinity },
};

// A place with no model of its own gets the plain four-legged lander.
const DEFAULT_SITE = SITE_BUILD.chandrayaan3;
// Shown from this far; drawn this big (they are metres across, like the craft in
// orbit, and would be invisible at their real size).
const SITE_VISIBLE_KM = 6000;
const SITE_MIN_KM = 6;
const SITE_MAX_KM = 30;

// Dokdo is drawn, not modelled: a flat card with a pixel drawing of the two islets
// (public/assets/dokdo.png, 384 x 192), its foot on the sea and its face always turned
// to the traveler. The islets are a kilometre across, far too small to see, so the card
// is 12 km wide from close by and up to 60 km from far off.
const DOKDO_MIN_KM = 12;
const DOKDO_MAX_KM = 60;
const DOKDO_APPARENT = 0.1;
// On the night side it is drawn this dim.
const DOKDO_NIGHT = 0.25;

// Places shown as a drawing on a card, and the picture of each (public/assets/).
const SITE_CARDS = { dokdo: 'dokdo.png', wadiRum: 'wadi-rum.png' };

function createSiteCard(scene, id, file) {
  // The node sits at sea level; the card stands on it (two wide, one high, +y up).
  const node = new TransformNode(`site_${id}`, scene);
  node.rotationQuaternion = new Quaternion();
  const card = CreatePlane(`${id}Card`, { width: 2, height: 1 }, scene);
  card.parent = node;
  card.position.y = 0.5;
  card.isPickable = false;
  const texture = new Texture(`${import.meta.env.BASE_URL}assets/${file}`, scene, true, true, Texture.NEAREST_SAMPLINGMODE);
  texture.hasAlpha = true;
  const material = new StandardMaterial(`${id}Card`, scene);
  material.disableLighting = true;
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  card.material = material;
  node.setEnabled(false);

  // site, body, sun: this frame's positions (km); position: the eye (km).
  function update(site, body, sun, position) {
    const rel = site.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
    const distanceKm = Math.hypot(...rel) * KM_PER_UNIT;
    node.setEnabled(distanceKm < SITE_VISIBLE_KM);
    if (!node.isEnabled()) return;
    const up = new Vector3(...site.position.map((n, i) => n - body.position[i])).normalize();
    // Its face is turned fully toward the eye, from whatever height (seen from above,
    // a card standing upright would be a thin line), with the top of the drawing as
    // near to the sky as that allows. z runs from the eye to the card (the card's front
    // is its -z side), y is the drawing's top, x its right.
    const z = new Vector3(rel[0], rel[1], rel[2]).normalize();
    let y = up.subtract(z.scale(Vector3.Dot(up, z)));
    // Straight overhead there is no "top": any direction along the ground will do.
    if (y.lengthSquared() < 1e-6) y = Vector3.Cross(z, Vector3.Right());
    y.normalize();
    const x = Vector3.Cross(y, z).normalize();
    Quaternion.RotationQuaternionFromAxisToRef(x, y, z, node.rotationQuaternion);
    const widthKm = Math.min(DOKDO_MAX_KM, Math.max(DOKDO_MIN_KM, distanceKm * DOKDO_APPARENT));
    node.scaling.setAll(widthKm / 2 / KM_PER_UNIT);
    node.position.set(rel[0], rel[1], rel[2]);
    const toSun = new Vector3(...sun.position.map((n, i) => n - site.position[i])).normalize();
    // Full daylight from the Sun 12 degrees up; dusk below that.
    const lit = DOKDO_NIGHT + (1 - DOKDO_NIGHT) * Math.min(1, Math.max(0, Vector3.Dot(toSun, up) / 0.2 + 0.5));
    material.emissiveColor = new Color3(lit, lit, lit);
  }

  return { update };
}

// siteList: story places on a surface (core/stories.js storySitesAt). Those on the
// Moon, Mars and Titan and Earth's two launch pads get a model, and Dokdo a drawing; the craters, seas and
// mountains have nothing standing on them.
export function createSiteModels(scene, siteList) {
  const mats = craftMaterials(scene);
  const nodes = new Map();
  const cards = new Map();
  for (const site of siteList) {
    if (SITE_CARDS[site.id]) cards.set(site.id, createSiteCard(scene, site.id, SITE_CARDS[site.id]));
  }
  for (const site of siteList) {
    // A landmark (a crater, a sea, a mountain) has nothing standing on it, unless a
    // model was made for it: MESSENGER's wreck where it hit Mercury.
    if (site.landmark && !SITE_BUILD[site.id]) continue;
    // Elsewhere only what has a model of its own: Earth's two launch pads.
    if (!['moon', 'mars', 'titan'].includes(site.parent) && !SITE_BUILD[site.id]) continue;
    const [build, options] = SITE_BUILD[site.id] ?? DEFAULT_SITE;
    const node = build(scene, `site_${site.id}`, mats, options);
    node.rotationQuaternion = new Quaternion();
    node.setEnabled(false);
    nodes.set(site.id, node);
  }

  // The same places as they were on their day, for a scene played again
  // (core/replay.js): the model that comes down, and its engine's flame under it.
  const then = new Map();
  const flameMaterial = new StandardMaterial('replayFlame', scene);
  flameMaterial.disableLighting = true;
  flameMaterial.emissiveColor = new Color3(1, 0.82, 0.5);
  flameMaterial.alpha = 0.38;
  flameMaterial.backFaceCulling = false;
  for (const [id, [build, options, coming = 'flame']] of Object.entries(SITE_REPLAY_BUILD)) {
    const node = build(scene, `then_${id}`, mats, options);
    node.rotationQuaternion = new Quaternion();
    let flame;
    if (coming === 'chute') {
      // A white canopy over it, open downward, and eight lines down to its top.
      flame = group(scene, `then_${id}_chute`, node);
      dish(scene, `then_${id}_canopy`, flame, mats, { at: [0, 1.7, 0], toward: [0, -1, 0], diameter: 1.3, depth: 0.45, feed: false });
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        rod(scene, `then_${id}_line${k}`, flame, mats.white, [Math.cos(a) * 0.64, 1.25, Math.sin(a) * 0.64], [Math.cos(a) * 0.2, 0.28, Math.sin(a) * 0.2], 0.008, 4);
      }
    } else if (coming === 'crane') {
      // The stage that hovers over it: a flat frame, a flame at each corner pointing
      // out and down, and three cords down to the rover's deck.
      flame = group(scene, `then_${id}_crane`, node);
      box(scene, `then_${id}_stage`, flame, mats.plate, [0.62, 0.14, 0.5], [0, 1.55, 0]);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          box(scene, `then_${id}_tank${sx}${sz}`, flame, mats.goldFoil, [0.14, 0.16, 0.14], [sx * 0.3, 1.6, sz * 0.24]);
          drum(scene, `then_${id}_jet${sx}${sz}`, flame, flameMaterial, { height: 0.45, diameterTop: 0.04, diameterBottom: 0.16, tessellation: 10 }, [sx * 0.46, 1.28, sz * 0.36], [-sx * 0.35, 1, -sz * 0.35]);
        }
      }
      for (const [x, z] of [[0.16, 0.1], [-0.16, 0.1], [0, -0.14]]) rod(scene, `then_${id}_cord${x}`, flame, mats.white, [x * 0.6, 1.48, z * 0.6], [x, 0.3, z], 0.008, 4);
    } else {
      // Under the engine bell (the model's feet are at y = 0), widening downward.
      flame = drum(scene, `then_${id}_flame`, node, flameMaterial, { height: 0.34, diameterTop: 0.05, diameterBottom: 0.2, tessellation: 12 }, [0, -0.06, 0]);
    }
    node.setEnabled(false);
    then.set(id, { node, flame });
  }
  // Cassini's plunge into Saturn: the craft itself, and round it the glow of the air it
  // heats, drawn out behind it (the model's -x is the way it has come).
  {
    const node = CRAFT_BUILD.cassini(scene, 'then_cassiniPlunge', mats);
    node.rotationQuaternion = new Quaternion();
    // A soft teardrop of light drawn on a canvas: white-hot at the head, orange behind,
    // fading to nothing along the tail and at the edges.
    const glowTexture = new DynamicTexture('replayFireGlow', { width: 512, height: 128 }, scene, true);
    {
      const ctx = glowTexture.getContext();
      const [w, h] = [512, 128];
      const head = w * 0.86;
      ctx.clearRect(0, 0, w, h);
      const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, h / 2);
      shade.addColorStop(0, 'rgba(255, 250, 235, 1)');
      shade.addColorStop(0.16, 'rgba(255, 214, 150, 0.95)');
      shade.addColorStop(0.45, 'rgba(255, 150, 70, 0.55)');
      shade.addColorStop(1, 'rgba(255, 110, 40, 0)');
      ctx.fillStyle = shade;
      // The tail: the same glow stretched back to the far end.
      ctx.save();
      ctx.translate(head, h / 2);
      ctx.scale(head / (h / 2), 1);
      ctx.fillRect(-h / 2, -h / 2, h / 2, h);
      ctx.restore();
      // The head: round.
      ctx.save();
      ctx.translate(head, h / 2);
      ctx.fillRect(0, -h / 2, h / 2, h);
      ctx.restore();
      glowTexture.update();
      glowTexture.hasAlpha = true;
    }
    const fireMaterial = new StandardMaterial('replayFire', scene);
    fireMaterial.disableLighting = true;
    fireMaterial.diffuseColor = new Color3(0, 0, 0);
    fireMaterial.specularColor = new Color3(0, 0, 0);
    fireMaterial.emissiveTexture = glowTexture;
    fireMaterial.opacityTexture = glowTexture;
    fireMaterial.alpha = 0;
    fireMaterial.backFaceCulling = false;
    // Three sheets crossed along the way it flies, so it is a glow from any side.
    const fire = new TransformNode('then_cassiniPlunge_fire', scene);
    fire.parent = node;
    for (let k = 0; k < 3; k++) {
      const sheet = CreatePlane(`then_cassiniPlunge_fire${k}`, { width: 5, height: 1.7 }, scene);
      sheet.parent = fire;
      sheet.material = fireMaterial;
      sheet.position.x = 0.15 - (0.86 - 0.5) * 5;
      sheet.rotation.x = (k * Math.PI) / 3;
    }
    node.setEnabled(false);
    then.set('cassiniPlunge', { node, flame: null, fire, fireMaterial });
  }

  // sites, bodies: this frame's positions (km); position: the traveler (km).
  // replay: { id, liftKm, flame } while that place's day is played again: its model as
  // it was then stands liftKm above the ground in place of the one that is there now.
  // A streak (Cassini) also has across: [x, y, z] km to the side of the place, glow 0 → 1
  // and gone; it has no model of now, and flies nose first along the way it goes.
  function update(sites, bodies, position, replay = null) {
    for (const [id, old] of then) if (replay?.id !== id) old.node.setEnabled(false);
    for (const site of sites) {
      const card = cards.get(site.id);
      if (card) {
        card.update(site, bodies.find((b) => b.id === site.parent), bodies.find((b) => b.kind === 'star'), position);
        continue;
      }
      const now = nodes.get(site.id);
      const old = replay?.id === site.id ? then.get(site.id) : null;
      if (!now && !old) continue;
      if (old && now) now.setEnabled(false);
      const node = old ? old.node : now;
      const rel = site.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
      const distanceKm = Math.hypot(...rel) * KM_PER_UNIT;
      node.setEnabled(distanceKm < SITE_VISIBLE_KM && !(old && replay.gone));
      if (!node.isEnabled()) continue;
      const body = bodies.find((b) => b.id === site.parent);
      const up = new Vector3(...site.position.map((n, i) => n - body.position[i])).normalize();
      if (old) {
        const lift = replay.liftKm / KM_PER_UNIT;
        rel[0] += up.x * lift;
        rel[1] += up.y * lift;
        rel[2] += up.z * lift;
        old.flame?.setEnabled(replay.flame);
      }
      // Stand it on the ground: turn the model's +y onto the local "up".
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), up, node.rotationQuaternion);
      if (old?.fire) {
        rel[0] += replay.across[0] / KM_PER_UNIT;
        rel[1] += replay.across[1] / KM_PER_UNIT;
        rel[2] += replay.across[2] / KM_PER_UNIT;
        // Its +x toward the place it is going to, its dish (+y) up.
        // (and down the slope it comes in on).
        const x = new Vector3(...replay.across).scale(-1).normalize().subtract(up.scale(replay.slope)).normalize();
        const z = Vector3.Cross(x, up).normalize();
        Quaternion.RotationQuaternionFromAxisToRef(x, Vector3.Cross(z, x), z, node.rotationQuaternion);
        old.fireMaterial.alpha = replay.glow;
        old.fire.setEnabled(replay.glow > 0);
      }
      node.scaling.setAll(Math.min(SITE_MAX_KM, Math.max(SITE_MIN_KM, distanceKm * APPARENT)) / KM_PER_UNIT);
      node.position.set(rel[0], rel[1], rel[2]);
    }
  }

  return { update, has: (id) => nodes.has(id) || cards.has(id) };
}

export function createCraft(scene, craftList) {
  const mats = craftMaterials(scene);
  const nodes = new Map(craftList.map((c) => [c.id, CRAFT_BUILD[c.id](scene, c.id, mats)]));

  // craft: this frame's positions (km); position: the traveler (km); sunPosition (km).
  // jolt: { id, push, tilt } for the craft being docked with (core/dock.js latchJolt).
  // hidden: ids not to draw at all (core/craft.js hiddenCraft).
  function update(craft, position, sunPosition, jolt = null, hidden = []) {
    for (const c of craft) {
      const node = nodes.get(c.id);
      const rel = c.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
      const distanceKm = Math.hypot(...rel) * KM_PER_UNIT;
      const rule = RULES[c.id];
      node.setEnabled(distanceKm < rule.visibleKm && !hidden.includes(c.id));
      if (!node.isEnabled()) continue;
      const sizeKm = Math.min(rule.maxKm, Math.max(CRAFT_SIZE_KM, distanceKm * APPARENT));
      node.scaling.setAll(sizeKm / KM_PER_UNIT);
      node.position.set(rel[0], rel[1], rel[2]);
      node.lookAt(new Vector3(...sunPosition.map((n, i) => (n - position[i]) / KM_PER_UNIT)));
      if (jolt?.id === c.id && (jolt.push || jolt.tilt)) {
        // Knocked sideways as the traveler sees it (a shove along the line of sight
        // would not show), a little away, and tipped about its own sunward axis.
        const away = new Vector3(rel[0], rel[1], rel[2]).normalize();
        const across = Vector3.Cross(away, Vector3.Up()).normalize();
        const reach = (jolt.push * sizeKm) / KM_PER_UNIT;
        node.position.addInPlace(across.scale(reach)).addInPlace(away.scale(reach * 0.5));
        node.rotate(Vector3.Forward(), jolt.tilt);
      }
    }
  }

  return { update };
}
