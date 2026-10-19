import { test } from 'vitest';
import assert from 'node:assert/strict';
import { picturesWithRetry, RETRY_MS, cloudDay, gibsUrl } from '../src/render/realClouds.js';

// A loader that fails the first n tries of each address, then gives it.
function flaky(failures) {
  const tries = new Map();
  const load = async (url) => {
    const n = (tries.get(url) ?? 0) + 1;
    tries.set(url, n);
    if (n <= (failures[url] ?? 0)) throw new Error('504');
    return `picture of ${url}`;
  };
  return { load, tries };
}

test('a picture GIBS refuses at first (504) is asked for once more, a minute later, and no more', async () => {
  const waits = [];
  const sleep = async (ms) => { waits.push(ms); };
  const { load, tries } = flaky({ a: 1, b: 5 });
  const got = await picturesWithRetry(['a', 'b', 'c'], { load, sleep });
  assert.deepEqual(got, ['picture of a', 'picture of c']);
  assert.deepEqual(waits, [RETRY_MS]);
  assert.equal(RETRY_MS, 60000);
  assert.deepEqual([...tries.entries()], [['a', 2], ['b', 2], ['c', 1]]);
});

test('when every picture comes at once there is no second try and no wait', async () => {
  const waits = [];
  const { load, tries } = flaky({});
  const got = await picturesWithRetry(['a', 'b'], { load, sleep: async (ms) => { waits.push(ms); } });
  assert.deepEqual(got, ['picture of a', 'picture of b']);
  assert.deepEqual(waits, []);
  assert.deepEqual([...tries.values()], [1, 1]);
});

test('yesterday is asked for, by its UTC day', () => {
  assert.equal(cloudDay(Date.parse('2026-10-19T23:30:00Z')), '2026-10-18');
  assert.match(gibsUrl('VIIRS_SNPP_CorrectedReflectance_TrueColor', '2026-10-18'), /LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&TIME=2026-10-18$/);
});
