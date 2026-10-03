import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { versionLabel, updatedText, fillVersion } from '../build/version.js';

test('the version is shown short: v0.1 for 0.1.0, v0.1.3 for 0.1.3', () => {
  assert.equal(versionLabel('0.1.0'), 'v0.1');
  assert.equal(versionLabel('0.1.3'), 'v0.1.3');
  assert.equal(versionLabel('0.10.0'), 'v0.10');
  assert.equal(versionLabel('1.0.0'), 'v1.0');
});

test('the time of the update is given on the Korean clock, to the minute', () => {
  assert.equal(updatedText(new Date('2026-10-03T12:34:56Z')), '2026-10-03 21:34');
  // Late evening in UTC is the next day in Korea.
  assert.equal(updatedText(new Date('2026-12-31T15:05:00Z')), '2027-01-01 00:05');
  assert.equal(updatedText(new Date('2026-10-03T21:34:00+09:00')), '2026-10-03 21:34');
});

test('the note sheet has a place for both at its foot, and the build fills it', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const note = html.slice(html.indexOf('<dialog id="noteCard"'));
  const sheet = note.slice(0, note.indexOf('</dialog>'));
  assert.match(sheet, /journalActions[\s\S]*<small id="noteCardVersion">\{\{version\}\} · \{\{updated\}\}<\/small>\s*$/);
  // Nowhere else: the loading screen no longer carries it.
  assert.equal(html.split('{{version}}').length, 2);
  const filled = fillVersion('<small>{{version}} · {{updated}}</small>', '0.1.2', new Date('2026-10-03T12:00:00Z'));
  assert.equal(filled, '<small>v0.1.2 · 2026-10-03 21:00</small>');
  // The version in package.json is one the label can show.
  assert.match(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, /^\d+\.\d+\.\d+$/);
});
