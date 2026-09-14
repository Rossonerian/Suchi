import test from 'node:test';
import assert from 'node:assert/strict';
import { findWorkspaceMembership, workspaceContextState } from './workspace-context.mjs';

const memberships = [
  { id: 'membership-a', organization: { id: 'org-a', slug: 'acme', name: 'Acme' } },
  { id: 'membership-b', organization: { id: 'org-b', slug: 'beta', name: 'Beta' } },
];

test('resolves a workspace route by slug or organization id', () => {
  assert.equal(findWorkspaceMembership(memberships, 'acme')?.id, 'membership-a');
  assert.equal(findWorkspaceMembership(memberships, 'org-b')?.id, 'membership-b');
  assert.equal(findWorkspaceMembership(memberships, 'unknown'), null);
});

test('does not mark an unloaded organization context ready', () => {
  assert.deepEqual(
    workspaceContextState({ isLoaded: false, organization: null, memberships, orgSlug: 'acme' }),
    { ready: false, status: 'Loading workspace…', membership: null },
  );
});

test('requires the active organization to match the route workspace', () => {
  const state = workspaceContextState({
    isLoaded: true,
    organization: { id: 'org-b' },
    memberships,
    orgSlug: 'acme',
  });
  assert.equal(state.ready, false);
  assert.equal(state.status, 'Switching to Acme…');
  assert.equal(state.membership.id, 'membership-a');
});

test('does not render a route as ready while the active organization is missing', () => {
  assert.deepEqual(
    workspaceContextState({ isLoaded: true, organization: null, memberships, orgSlug: 'acme' }),
    { ready: false, status: 'Switching to Acme…', membership: memberships[0] },
  );
});

test('rejects a route for a workspace the user does not belong to', () => {
  assert.deepEqual(
    workspaceContextState({ isLoaded: true, organization: { id: 'org-a' }, memberships, orgSlug: 'other' }),
    { ready: false, status: 'This workspace is unavailable for your account.', membership: null },
  );
});

test('marks the route ready only for the matching active organization', () => {
  const state = workspaceContextState({
    isLoaded: true,
    organization: { id: 'org-a' },
    memberships,
    orgSlug: 'acme',
  });
  assert.equal(state.ready, true);
  assert.equal(state.status, '');
  assert.equal(state.membership.id, 'membership-a');
});
