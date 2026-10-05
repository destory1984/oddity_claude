// The Korean names that are swapped for their name in another language where they are
// made (core/i18n.js `named`), as a JSON list on standard output: build/i18n.py adds them
// to the keys of the Japanese and Chinese dictionaries. Run with node from the repo root.
import { BODY_DATA } from '../src/core/bodies.js';
import { EXO_STAR, EXO_PLANETS } from '../src/core/exo.js';
import { CRAFT } from '../src/core/craft.js';
import { STORIES } from '../src/core/stories.js';
import { CONSTELLATIONS } from '../src/core/constellations.js';

const names = [...BODY_DATA, EXO_STAR, ...EXO_PLANETS, ...CRAFT, ...STORIES, ...CONSTELLATIONS].map((x) => x.name);
process.stdout.write(JSON.stringify([...new Set(names)]));
