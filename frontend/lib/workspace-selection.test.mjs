import test from 'node:test';
import assert from 'node:assert/strict';
import { activateOrganization, resolveActiveOrganization, workspaceActivationState, workspaceDisplayName } from './workspace-selection.mjs';

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

test('the workspace shell does not display a route as selected before activation matches it', () => {
  assert.equal(workspaceDisplayName(null, 'acme'), 'Choose workspace');
  assert.equal(workspaceDisplayName({ id: 'org-b', slug: 'beta', name: 'Beta' }, 'acme'), 'Choose workspace');
  assert.equal(workspaceDisplayName({ id: 'org-a', slug: 'acme', name: 'Acme' }, 'acme'), 'Acme');
});

test('workspace activation waits for completion and settles successful state', async () => {
  const events = [];
  const result = workspaceActivationState({
    isLoaded: true,
    isSignedIn: true,
    organization: { id: 'org-a' },
    membership: { organization: { id: 'org-b', slug: 'beta', name: 'Beta' } },
    activation: { status: 'pending', targetId: 'org-b', error: '' },
  });
  assert.equal(result.phase, 'SWITCHING_WORKSPACE');
  await activateOrganization(
    async () => { events.push('activate'); return { activeOrganizationId: 'org-b' }; },
    async () => { events.push('refresh'); return { session: { session: { activeOrganizationId: 'org-b' } }, organizations: [{ id: 'org-b', slug: 'beta', name: 'Beta' }] }; },
    'org-b',
  );
  assert.deepEqual(events, ['activate', 'refresh']);
  assert.equal(workspaceActivationState({
    isLoaded: true,
    isSignedIn: true,
    organization: { id: 'org-b' },
    membership: { organization: { id: 'org-b', slug: 'beta', name: 'Beta' } },
    activation: { status: 'pending', targetId: 'org-b', error: '' },
  }).phase, 'ACTIVE');
});

test('activation rejects when reconciliation returns a server error', async () => {
  await assert.rejects(
    activateOrganization(
      async () => ({ activeOrganizationId: 'org-b' }),
      async () => { throw Object.assign(new Error('Your workspaces could not be loaded. Try again.'), { status: 500 }); },
      'org-b',
    ),
    /workspaces could not be loaded/,
  );
});

test('activation rejects when reconciliation has a transient network failure', async () => {
  await assert.rejects(
    activateOrganization(
      async () => ({ activeOrganizationId: 'org-b' }),
      async () => { throw Object.assign(new Error('Service is unavailable.'), { code: 'NETWORK_ERROR' }); },
      'org-b',
    ),
    /Service is unavailable/,
  );
});

test('workspace activation failure settles in a visible error state', () => {
  const result = workspaceActivationState({
    isLoaded: true,
    isSignedIn: true,
    organization: null,
    membership: { organization: { id: 'org-b', slug: 'beta', name: 'Beta' } },
    activation: { status: 'error', targetId: 'org-b', error: 'Workspace could not be activated.' },
  });
  assert.equal(result.phase, 'ERROR');
  assert.equal(result.status, 'Workspace could not be activated.');
});

test('authenticated users with missing workspace context are not treated as signed out', () => {
  const result = workspaceActivationState({
    isLoaded: true,
    isSignedIn: true,
    organization: null,
    membership: null,
    activation: { status: 'idle', targetId: null, error: '' },
  });
  assert.equal(result.phase, 'ERROR');
  assert.notEqual(result.phase, 'UNAUTHENTICATED');
});

test('organization-list failure is an explicit recoverable error, not an empty active state', () => {
  const result = workspaceActivationState({
    isLoaded: true,
    isSignedIn: true,
    organization: null,
    membership: null,
    organizationError: 'Your workspaces could not be loaded. Try again.',
    activation: { status: 'idle', targetId: null, error: '' },
  });
  assert.equal(result.phase, 'ERROR');
  assert.equal(result.status, 'Your workspaces could not be loaded. Try again.');
});

test('an active organization is only active when it is present in the resolved organization list', () => {
  const result = workspaceActivationState({
    isLoaded: true,
    isSignedIn: true,
    organization: { id: 'org-target' },
    membership: { organization: { id: 'org-target', slug: 'target', name: 'Target' } },
    organizationError: '',
    activation: { status: 'active', targetId: 'org-target', error: '' },
  });
  assert.equal(result.phase, 'ACTIVE');
});

test('stale authoritative active organization cannot settle the requested workspace as active', async () => {
  await assert.rejects(
    activateOrganization(
      async () => ({ activeOrganizationId: 'org-b' }),
      async () => ({ session: { session: { activeOrganizationId: 'org-a' } }, organizations }),
      'org-b',
    ),
    /activation could not be confirmed/,
  );
});

test('missing target organization cannot settle activation as active', async () => {
  await assert.rejects(
    activateOrganization(
      async () => ({ activeOrganizationId: 'org-b' }),
      async () => ({ session: { session: { activeOrganizationId: 'org-b' } }, organizations: organizations.filter((organization) => organization.id === 'org-a') }),
      'org-b',
    ),
    /activation could not be confirmed/,
  );
});
