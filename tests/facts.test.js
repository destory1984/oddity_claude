import { test } from 'vitest';
import assert from 'node:assert/strict';
import { FACTS } from '../src/core/facts.js';
import { BODIES } from '../src/core/bodies.js';

test('every body has one short fact, and there are no facts for unknown bodies', () => {
  for (const body of BODIES) {
    const fact = FACTS[body.id];
    assert.ok(fact, `${body.id} has no fact`);
    assert.ok(fact.length <= 60, `${body.id}: ${fact.length} characters`);
    assert.ok(fact.endsWith('.'), body.id);
    assert.ok(!fact.includes('~'), body.id);
  }
  assert.equal(Object.keys(FACTS).length, BODIES.length);
});
