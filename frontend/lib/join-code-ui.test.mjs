import test from 'node:test';
import assert from 'node:assert/strict';
import { joinCodeAction } from './join-code-ui.mjs';

test('lost client state still uses replacement rotation and never creates a second active code', () => {
  assert.deepEqual(joinCodeAction(false), { label: 'Generate / replace join code', method: 'rotate' });
  assert.deepEqual(joinCodeAction(true), { label: 'Rotate code', method: 'rotate' });
});
