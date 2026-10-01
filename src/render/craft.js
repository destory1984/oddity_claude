import { Vector3, Quaternion } from './babylon.js';
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

// siteList: story places on a surface (core/stories.js storySitesAt). Only those on the
// Moon, Mars and Titan get a model: Dokdo is an island, not a machine, and neither are
// the Moon's craters and seas.
export function createSiteModels(scene, siteList) {
  const mats = craftMaterials(scene);
  const nodes = new Map();
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
