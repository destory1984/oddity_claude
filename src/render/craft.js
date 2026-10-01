import { Vector3, Quaternion, Color3, CreatePlane, StandardMaterial, Texture, TransformNode } from './babylon.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import { CRAFT_SIZE_KM } from '../core/craft.js';
import { craftMaterials } from './craftParts.js';
import { CRAFT_BUILD } from './craftModels.js';
import { SITE_BUILD } from './siteModels.js';

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

function createDokdo(scene) {
  // The node sits at sea level; the card stands on it (two wide, one high, +y up).
  const node = new TransformNode('site_dokdo', scene);
  node.rotationQuaternion = new Quaternion();
  const card = CreatePlane('dokdoCard', { width: 2, height: 1 }, scene);
  card.parent = node;
  card.position.y = 0.5;
  card.isPickable = false;
  const texture = new Texture(`${import.meta.env.BASE_URL}assets/dokdo.png`, scene, true, true, Texture.NEAREST_SAMPLINGMODE);
  texture.hasAlpha = true;
  const material = new StandardMaterial('dokdoCard', scene);
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
// Moon, Mars and Titan get a model, and Dokdo a drawing; the craters, seas and
// mountains have nothing standing on them.
export function createSiteModels(scene, siteList) {
  const mats = craftMaterials(scene);
  const nodes = new Map();
  const dokdo = siteList.some((s) => s.id === 'dokdo') ? createDokdo(scene) : null;
  for (const site of siteList) {
    if (!['moon', 'mars', 'titan'].includes(site.parent) || site.landmark) continue;
    const [build, options] = SITE_BUILD[site.id] ?? DEFAULT_SITE;
    const node = build(scene, `site_${site.id}`, mats, options);
    node.rotationQuaternion = new Quaternion();
    node.setEnabled(false);
    nodes.set(site.id, node);
  }

  // sites, bodies: this frame's positions (km); position: the traveler (km).
  function update(sites, bodies, position) {
    for (const site of sites) {
      if (dokdo && site.id === 'dokdo') {
        dokdo.update(site, bodies.find((b) => b.id === site.parent), bodies.find((b) => b.kind === 'star'), position);
        continue;
      }
      const node = nodes.get(site.id);
      if (!node) continue;
      const rel = site.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
      const distanceKm = Math.hypot(...rel) * KM_PER_UNIT;
      node.setEnabled(distanceKm < SITE_VISIBLE_KM);
      if (!node.isEnabled()) continue;
      const body = bodies.find((b) => b.id === site.parent);
      const up = new Vector3(...site.position.map((n, i) => n - body.position[i])).normalize();
      // Stand it on the ground: turn the model's +y onto the local "up".
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), up, node.rotationQuaternion);
      node.scaling.setAll(Math.min(SITE_MAX_KM, Math.max(SITE_MIN_KM, distanceKm * APPARENT)) / KM_PER_UNIT);
      node.position.set(rel[0], rel[1], rel[2]);
    }
  }

  return { update, has: (id) => nodes.has(id) };
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
