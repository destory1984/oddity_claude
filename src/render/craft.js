import { Vector3, Quaternion, Color3, CreatePlane, CreateSphere, StandardMaterial, Texture, TransformNode, DynamicTexture } from './babylon.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import { CRAFT_SIZE_KM } from '../core/craft.js';
import { craftMaterials } from './craftParts.js';
import { CRAFT_BUILD } from './craftModels.js';
import { CRAFT_UNFOLD_ALL as CRAFT_UNFOLD } from './craftUnfold.js';
import { SITE_BUILD, SITE_REPLAY_BUILD } from './siteModels.js';
import { drum, rod, group, box } from './craftParts.js';

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
const SITE_CARDS = { dokdo: 'dokdo.png', wadiRum: 'wadi-rum.png', bohyunsan: 'bohyunsan.png' };

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
  // The cloth of an air bag: pale, and lit a little from within so it is not lost in shadow.
  const bagCloth = new StandardMaterial('replayBag', scene);
  bagCloth.diffuseColor = new Color3(0.93, 0.88, 0.76);
  bagCloth.emissiveColor = new Color3(0.3, 0.27, 0.22);
  bagCloth.specularColor = new Color3(0.05, 0.05, 0.05);
  // A flash: light itself, white, nearly solid.
  const flashMaterial = new StandardMaterial('replayFlash', scene);
  flashMaterial.disableLighting = true;
  flashMaterial.emissiveColor = new Color3(1, 0.96, 0.86);
  flashMaterial.alpha = 0.85;
  for (const [id, [build, options, coming = 'flame', flameY = -0.06]] of Object.entries(SITE_REPLAY_BUILD)) {
    if (coming === 'stage') {
      // Pieces under one root, which is placed and sized as any model is; the scene
      // says where each stands at each moment (core/moonScenes.js). A piece that burns
      // has a flame under it.
      const root = new TransformNode(`then_${id}`, scene);
      root.rotationQuaternion = new Quaternion();
      const parts = build(scene, `then_${id}`, mats, options);
      const flames = {};
      for (const [name, piece] of Object.entries(parts.pieces)) {
        piece.parent = root;
        const spec = parts.flames?.[name];
        if (spec) flames[name] = drum(scene, `then_${id}_${name}_flame`, piece, flameMaterial, { height: spec[3], diameterTop: spec[4] * 0.25, diameterBottom: spec[4], tessellation: 12 }, [spec[0], spec[1] - spec[3] / 2, spec[2]]);
      }
      for (const name of parts.lit ?? []) for (const mesh of parts.pieces[name].getChildMeshes()) mesh.material = flashMaterial;
      root.setEnabled(false);
      then.set(id, { node: root, flame: null, cords: null, stage: { pieces: parts.pieces, flames } });
      continue;
    }
    if (coming === 'launch') {
      // The pad stays; the rocket stands on it in two pieces, each with a flame under
      // it, and a ship waits to the side. Everything hangs from one root, which is
      // placed and sized as any model is; the pieces move within it (core/replay.js
      // launchFrame gives where, in the model's own units).
      const root = new TransformNode(`then_${id}`, scene);
      root.rotationQuaternion = new Quaternion();
      const parts = build(scene, `then_${id}`, mats, options);
      for (const piece of [parts.pad, parts.booster, parts.upper, parts.ship]) piece.parent = root;
      parts.legs.parent = parts.booster;
      const boosterFlame = drum(scene, `then_${id}_flame1`, parts.booster, flameMaterial, { height: 0.5, diameterTop: 0.05, diameterBottom: 0.17, tessellation: 12 }, [0, -0.27, 0]);
      const upperFlame = drum(scene, `then_${id}_flame2`, parts.upper, flameMaterial, { height: 0.3, diameterTop: 0.04, diameterBottom: 0.13, tessellation: 12 }, [0, -0.16, 0]);
      root.setEnabled(false);
      then.set(id, { node: root, flame: null, cords: null, launch: { ...parts, boosterFlame, upperFlame } });
      continue;
    }
    if (coming === 'bag' || coming === 'bare') {
      // One that bounces: the model hangs from a node that turns (a ball rolling, Philae
      // leaning over), and a bagged one sits in the middle of its ball of air bags, which
      // hide it until they go down. The ball's foot is on the ground when the lift is 0.
      const root = new TransformNode(`then_${id}`, scene);
      root.rotationQuaternion = new Quaternion();
      const tumble = group(scene, `then_${id}_tumble`, root);
      const model = build(scene, `then_${id}_model`, mats, options);
      model.parent = tumble;
      const shape = coming === 'bag' ? flameY : null;
      let bag = null;
      if (shape) {
        model.position.y = -shape.centre;
        bag = group(scene, `then_${id}_bag`, tumble);
        const lobe = (name, diameter, at, squash = [1, 1, 1]) => {
          const ball = CreateSphere(`then_${id}_${name}`, { diameter, segments: 14 }, scene);
          ball.parent = bag;
          ball.material = bagCloth;
          ball.position.set(...at);
          ball.scaling.set(...squash);
          return ball;
        };
        if (shape.lobes === 2) {
          // Two halves with a seam between them.
          lobe('half0', shape.radius * 2, [0, shape.radius * 0.06, 0], [1, 0.9, 1]);
          lobe('half1', shape.radius * 2, [0, -shape.radius * 0.06, 0], [1, 0.9, 1]);
          drum(scene, `then_${id}_seam`, bag, mats.grey, { height: shape.radius * 0.05, diameter: shape.radius * 2.02, tessellation: 24 }, [0, 0, 0]);
        } else {
          // A cluster: a ball in the middle and four lobes at the corners of a tetrahedron,
          // each of them with three smaller bulges.
          lobe('core', shape.radius * 1.5, [0, 0, 0]);
          const corners = [[0, 1, 0], [0.943, -0.333, 0], [-0.471, -0.333, 0.816], [-0.471, -0.333, -0.816]];
          corners.forEach((c, k) => {
            lobe(`lobe${k}`, shape.radius * 1.16, c.map((n) => n * shape.radius * 0.42));
            for (let j = 0; j < 3; j++) {
              const a = (j * 2 * Math.PI) / 3 + k;
              const side = [Math.cos(a), Math.sin(a) * 0.6, Math.sin(a + 1.3)];
              lobe(`bulge${k}${j}`, shape.radius * 0.62, c.map((n, i) => (n * 0.62 + side[i] * 0.3) * shape.radius));
            }
          });
        }
      }
      root.setEnabled(false);
      then.set(id, { node: root, flame: null, cords: null, tumble, bag, shape });
      continue;
    }
    const node = build(scene, `then_${id}`, mats, options);
    node.rotationQuaternion = new Quaternion();
    let flame;
    let cords = null;
    if (coming === 'chute') {
      // A white canopy over it, open downward, and eight lines down to its top. The
      // cloth is lit from within a little: under Titan's haze a plain white went grey.
      flame = group(scene, `then_${id}_chute`, node);
      const cloth = new StandardMaterial(`then_${id}_cloth`, scene);
      cloth.diffuseColor = new Color3(1, 0.97, 0.9);
      cloth.emissiveColor = new Color3(0.62, 0.58, 0.5);
      cloth.specularColor = new Color3(0, 0, 0);
      cloth.backFaceCulling = false;
      const canopy = CreateSphere(`then_${id}_canopy`, { diameter: 1.3, slice: 0.5, segments: 20 }, scene);
      canopy.parent = flame;
      canopy.material = cloth;
      canopy.position.y = 1.25;
      canopy.scaling.y = 0.75;
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
      cords = group(scene, `then_${id}_cords`, flame);
      for (const [x, z] of [[0.16, 0.1], [-0.16, 0.1], [0, -0.14]]) rod(scene, `then_${id}_cord${x}`, cords, mats.white, [x * 0.6, 1.48, z * 0.6], [x, 0.3, z], 0.008, 4);
    } else {
      // Under the engine bell (the model's feet are at y = 0), widening downward.
      flame = drum(scene, `then_${id}_flame`, node, flameMaterial, { height: 0.34, diameterTop: 0.05, diameterBottom: 0.2, tessellation: 12 }, [0, flameY, 0]);
    }
    node.setEnabled(false);
    then.set(id, { node, flame, cords });
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

  // A stage of pieces is turned to face whoever watches as it begins: its +x across the
  // view to the right, its +z away (Apollo 11's ladder was on the far side of the lander
  // and the two who came down it were hidden). The place's own model keeps that turn
  // afterwards, so nothing swings round as the scene ends. id → the way that was "away".
  const faced = new Map();
  let playing = null;

  // sites, bodies: this frame's positions (km); position: the traveler (km).
  // replay: { id, liftKm, flame } while that place's day is played again: its model as
  // it was then stands liftKm above the ground in place of the one that is there now.
  // A streak (Cassini) also has across: [x, y, z] km to the side of the place, glow 0 → 1
  // and gone; it has no model of now, and flies nose first along the way it goes.
  // One that bounced (core/replay.js hopFrame) also has turn and tilt (radians), bag
  // (1 → 0), open (it now stands as the place's own model does), side (the way it comes
  // from) and sizeKm (drawn that wide whatever the distance: Philae on its small comet).
  function update(sites, bodies, position, replay = null) {
    if (!replay) playing = null;
    for (const [id, old] of then) if (replay?.id !== id || replay.open) old.node.setEnabled(false);
    for (const site of sites) {
      const card = cards.get(site.id);
      if (card) {
        card.update(site, bodies.find((b) => b.id === site.parent), bodies.find((b) => b.kind === 'star'), position);
        continue;
      }
      const now = nodes.get(site.id);
      const old = replay?.id === site.id && !replay.open ? then.get(site.id) : null;
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
        old.flame?.setEnabled(replay.flame || Boolean(old.cords));
        if (old.cords) {
          // The stage that let it down cuts its cords and flies off, up and to one side.
          old.cords.setEnabled(replay.flame);
          old.flame.position.set(0.6 * replay.after ** 2, 0.5 * replay.after, 0);
        }
      }
      if (old?.stage && playing !== site.id) {
        playing = site.id;
        faced.set(site.id, new Vector3(rel[0], rel[1], rel[2]));
      }
      // Stand it on the ground: turn the model's +y onto the local "up".
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), up, node.rotationQuaternion);
      const away = faced.get(site.id);
      if (away) {
        const z = away.subtract(up.scale(Vector3.Dot(away, up)));
        if (z.length() > 1e-9) {
          z.normalize();
          Quaternion.RotationQuaternionFromAxisToRef(Vector3.Cross(up, z), up, z, node.rotationQuaternion);
        }
      }
      if (old && replay.across) {
        rel[0] += replay.across[0] / KM_PER_UNIT;
        rel[1] += replay.across[1] / KM_PER_UNIT;
        rel[2] += replay.across[2] / KM_PER_UNIT;
      }
      if (old?.tumble) {
        // Its +x along the ground the way it travels, so that it rolls and leans that way.
        const from = new Vector3(...(replay.side ?? [1, 0, 0]));
        const x = from.subtract(up.scale(Vector3.Dot(from, up))).scale(-1).normalize();
        const z = Vector3.Cross(x, up).normalize();
        Quaternion.RotationQuaternionFromAxisToRef(x, up, z, node.rotationQuaternion);
        old.tumble.rotation.z = -((replay.turn ?? 0) + (replay.tilt ?? 0));
        if (old.bag) {
          const full = replay.bag ?? 0;
          old.bag.setEnabled(full > 0.03);
          old.bag.scaling.setAll(Math.max(0.03, full));
          old.tumble.position.y = old.shape.centre + (old.shape.radius - old.shape.centre) * full;
        }
      }
      if (old?.launch && replay.launch) {
        // The rocket stands 0.16 to the side of the pad's middle, 0.2 up on its deck;
        // the second stage sits on the first (0.55 tall). The ship lies to the same side.
        const { upper, booster } = replay.launch;
        const parts = old.launch;
        parts.booster.position.set(0.16 + booster.x, 0.2 + booster.y - 0.14 * Math.min(1, booster.x / 0.6), 0);
        parts.booster.rotation.z = booster.lean;
        parts.legs.setEnabled(booster.legs);
        parts.boosterFlame.setEnabled(booster.burn);
        parts.upper.position.set(0.16 + upper.x, 0.75 + upper.y, 0);
        parts.upper.rotation.z = -upper.lean;
        parts.upper.setEnabled(!upper.gone);
        parts.upperFlame.setEnabled(upper.burn && upper.y > booster.y + 0.01);
        parts.ship.position.set(0.16 + 1.7, 0, 0);
      }
      if (old?.stage && replay.stage) {
        for (const [name, piece] of Object.entries(old.stage.pieces)) {
          const at = replay.stage[name];
          piece.setEnabled(Boolean(at) && at.shown !== false);
          if (!piece.isEnabled()) continue;
          piece.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0);
          piece.rotation.z = at.lean ?? 0;
          piece.rotation.y = at.turn ?? 0;
          piece.scaling.setAll(at.scale ?? 1);
          old.stage.flames[name]?.setEnabled(Boolean(at.burn));
        }
      }
      if (old?.fire) {
        // Its +x toward the place it is going to, its dish (+y) up.
        // (and down the slope it comes in on).
        const x = new Vector3(...replay.across).scale(-1).normalize().subtract(up.scale(replay.slope)).normalize();
        const z = Vector3.Cross(x, up).normalize();
        Quaternion.RotationQuaternionFromAxisToRef(x, Vector3.Cross(z, x), z, node.rotationQuaternion);
        old.fireMaterial.alpha = replay.glow;
        old.fire.setEnabled(replay.glow > 0);
      }
      node.scaling.setAll((old && replay.sizeKm ? replay.sizeKm : Math.min(SITE_MAX_KM, Math.max(SITE_MIN_KM, distanceKm * APPARENT))) / KM_PER_UNIT);
      node.position.set(rel[0], rel[1], rel[2]);
    }
  }

  return { update, has: (id) => nodes.has(id) || cards.has(id) };
}

export function createCraft(scene, craftList) {
  const mats = craftMaterials(scene);
  const nodes = new Map(craftList.map((c) => [c.id, CRAFT_BUILD[c.id](scene, c.id, mats)]));
  const unfolding = new Map(Object.entries(CRAFT_UNFOLD).map(([id, build]) => {
    const loose = build(scene, `${id}Unfolding`, mats);
    loose.root.setEnabled(false);
    return [id, loose];
  }));

  // craft: this frame's positions (km); position: the traveler (km); sunPosition (km).
  // jolt: { id, push, tilt } for the craft being docked with (core/dock.js latchJolt).
  // hidden: ids not to draw at all (core/craft.js hiddenCraft).
  // replay: { id, unfold } while a craft's day is played again (core/craftScenes.js):
  // the one with loose parts is drawn in its place, posed as the scene says.
  // Which craft's scene is on and when it began (the turn to face the watcher).
  let began = { id: null, at: 0 };
  // And the scene just ended: which craft's, when, and how it stood last (it turns back
  // to its everyday self over the same second).
  let left = { id: null, at: 0, unfold: null };
  const TURN_MS = 1000;
  function update(craft, position, sunPosition, jolt = null, hidden = [], replay = null) {
    if (!replay?.unfold) {
      if (began.id && left.unfold) left = { ...left, id: began.id, at: performance.now() };
      began = { id: null, at: 0 };
    }
    for (const c of craft) {
      const node = nodes.get(c.id);
      const loose = unfolding.get(c.id);
      loose?.root.setEnabled(false);
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
      const playing = Boolean(loose && replay?.id === c.id && replay.unfold);
      const leaving = Boolean(loose?.face && !playing && left.id === c.id && performance.now() - left.at < TURN_MS);
      if (playing || leaving) {
        loose.root.setEnabled(true);
        // A scene with things round the craft (a shuttle under Hubble, Earth behind the
        // Roadster) is a stage: it faces whoever watches, stands smaller by `fit` and
        // higher by `lift` of its own size, so that all of it is in view from any side.
        // (face: true, its sunward side to the watcher; 'side', below.)
        // It turns to its place over the first second (it jumped round at a stroke).
        if (playing && began.id !== c.id) began = { id: c.id, at: performance.now() };
        if (playing) left = { id: null, at: 0, unfold: replay.unfold };
        const u = playing ? Math.min(1, (performance.now() - began.at) / TURN_MS) : 1 - (performance.now() - left.at) / TURN_MS;
        const eased = u * u * (3 - 2 * u);
        loose.root.scaling.copyFrom(node.scaling).scaleInPlace(1 + ((loose.fit ?? 1) - 1) * eased);
        loose.root.position.copyFrom(node.position);
        if (loose.lift) loose.root.position.y += loose.lift * node.scaling.y * eased;
        if (loose.face) {
          // Its +z toward the eye (as lookAt at the eye turned it: this look direction is
          // the one from the eye), with the eye's own "up": docked from above or rolled
          // over, the scene still stands upright in the view.
          const eye = scene.activeCamera;
          const facing = Quaternion.FromLookDirectionLH(loose.root.position.subtract(eye.globalPosition).normalize(), eye.getDirection(Vector3.Up()));
          // 'side': its own z runs across the view (a rocket falling behind is seen from the side).
          if (loose.face === 'side') facing.multiplyInPlace(Quaternion.RotationAxis(Vector3.Up(), Math.PI / 2));
          if (eased < 1) {
            node.computeWorldMatrix(true);
            loose.root.rotationQuaternion = Quaternion.Slerp(node.absoluteRotationQuaternion, facing, eased);
          } else loose.root.rotationQuaternion = facing;
        } else loose.root.lookAt(new Vector3(...sunPosition.map((n, i) => (n - position[i]) / KM_PER_UNIT)));
        loose.pose(playing ? replay.unfold : left.unfold);
        node.setEnabled(false);
      }
    }
  }

  return { update };
}
