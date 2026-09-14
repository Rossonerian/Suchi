import test from 'node:test';
import assert from 'node:assert/strict';
import { activateOrganization, resolveActiveOrganization } from './workspace-selection.mjs';

const organizations = [
  { id: 'org-a', slug: 'acme', name: 'Acme' },
  { id: 'org-b', slug: 'beta', name: 'Beta' },
];

test('does not infer an active workspace when the session has no active organization', () => {
  assert.equal(resolveActiveOrganization(organizations, null), null);
  assert.equal(resolveActiveOrganization(organizations, undefined), null);
});

test('resolves the organization selected by the Better Auth active organization id', () => {
  assert.equal(resolveActiveOrganization(organizations, 'org-b')?.name, 'Beta');
  assert.equal(resolveActiveOrganization(organizations, 'acme')?.id, 'org-a');
  assert.equal(resolveActiveOrganization(organizations, 'missing'), null);
});

test('activation errors propagate and do not refresh into a fake selection', async () => {
  let refreshed = false;
  await assert.rejects(
    activateOrganization(
      async () => { throw new Error('activation failed'); },
      async () => { refreshed = true; },
      'org-a',
    ),
    /activation failed/,
  );
  assert.equal(refreshed, false);
});
