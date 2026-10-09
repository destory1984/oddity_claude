import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// A blank line inside a markdown table cuts it in two, and the rows after it are shown
// as one run of text with bars in it (the user, 2026-10-09, of the craft table in the
// design document on GitHub: "여긴 왜 다 깨져?").
test('no table in the documents is cut in two by a blank line', () => {
  const files = ['README.md', 'THIRD-PARTY.md', ...readdirSync('docs').filter((name) => name.endsWith('.md')).map((name) => `docs/${name}`)];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 1; i < lines.length - 1; i++) {
      if (!lines[i].startsWith('|') || lines[i - 1].startsWith('|')) continue;
      // The first row of a table is its heading, with the row of dashes under it.
      assert.match(lines[i + 1], /^\|[\s:|-]+\|?\s*$/, `${file}:${i + 1} ${lines[i].slice(0, 40)}`);
    }
  }
});
