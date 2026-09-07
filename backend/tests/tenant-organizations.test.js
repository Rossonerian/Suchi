import test from 'node:test';
import assert from 'node:assert/strict';
import { listOrganizations, provisionOrganization } from '../saas/organizations.js';

test('organization listing is derived from the authenticated database user', async () => {
  const db = {
    userProfile: {
      findUnique: async ({ where, include }) => {
        assert.deepEqual(where, { id: 'user_a' });
        assert.ok(include.memberships);
        return {
          memberships: [{ role: 'owner', organization: { id: 'org_a', name: 'Acme' } }],
        };
      },
    },
  };
  assert.deepEqual(await listOrganizations(db, { userId: 'user_a' }), [{ id: 'org_a', name: 'Acme', role: 'owner' }]);
});

test('organization provisioning delegates to the verified Better Auth API without client identities', async () => {
  const headers = new Headers();
  const auth = { api: { createOrganization: async (request) => {
    assert.equal(request.headers, headers);
    assert.deepEqual(request.body, { name: 'Acme', slug: 'acme' });
    return { id: 'org-a', ...request.body };
  } } };
  assert.equal((await provisionOrganization(auth, headers, { name: 'Acme', slug: 'acme' })).id, 'org-a');
  await assert.rejects(() => provisionOrganization(auth, headers, { name: 'Acme', slug: 'acme', userId: 'attacker' }), { code: 'VALIDATION_ERROR' });
});

test('organization provisioning propagates authoritative API failure', async () => {
  const auth = { api: { createOrganization: async () => { throw new Error('database unavailable'); } } };
  await assert.rejects(
    () => provisionOrganization(auth, new Headers(), { name: 'Acme', slug: 'acme' }),
    /database unavailable/,
  );
});
