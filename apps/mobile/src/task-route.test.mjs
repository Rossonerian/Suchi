import assert from 'node:assert/strict';
import test from 'node:test';
import { projectIdFromParams } from './task-route.mjs';

test('uses the latest project route parameter when a Tasks screen is reused', () => {
  assert.equal(projectIdFromParams({ projectId: 'project_b' }), 'project_b');
  assert.equal(projectIdFromParams({ projectId: ['project_b'] }), '');
  assert.equal(projectIdFromParams({}), '');
});
