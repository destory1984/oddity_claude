import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHANGES } from '../src/core/changes.js';
import { changesDoc, CHANGES_DOC } from '../build/changes-doc.mjs';

test('the document of changes is what the game\'s own list makes', () => {
  const made = changesDoc();
  assert.equal(readFileSync(CHANGES_DOC, 'utf8').replaceAll('\r\n', '\n'), made, 'run: node build/changes-doc.mjs');
  assert.equal(made.split('\n').filter((line) => line.startsWith('- ')).length, CHANGES.length);
  assert.ok(!made.includes('~'));
  // A day has one heading, the newest first.
  const days = made.split('\n').filter((line) => line.startsWith('## ')).map((line) => line.slice(3));
  assert.equal(new Set(days).size, days.length);
  assert.deepEqual(days, [...days].sort().reverse());
});
