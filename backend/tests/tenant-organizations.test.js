const test = require('node:test');
const assert = require('node:assert/strict');
const { listOrganizations, provisionOrganization } = require('../saas/organizations');

test('organization listing is derived from the authenticated Clerk user', async () => {
  const db = {
    userProfile: {
      findUnique: async ({ where, include }) => {
        assert.deepEqual(where, { clerkUserId: 'user_a' });
        assert.ok(include.memberships);
        return {
          memberships: [{ role: 'owner', organization: { id: 'org_a', name: 'Acme' } }],
        };
      },
    },
  };
  assert.deepEqual(await listOrganizations(db, { userId: 'user_a' }), [{ id: 'org_a', name: 'Acme', role: 'owner' }]);
});

test('organization provisioning creates Clerk and local records atomically', async () => {
  let externalDeleted = false;
  const db = {
    $transaction: async (callback) => callback({
      userProfile: {
        upsert: async ({ create }) => ({ id: 'local_user_a', ...create }),
      },
      organization: {
        create: async ({ data, include }) => {
          assert.ok(data.settings.create);
          assert.equal(data.memberships.create.userId, 'local_user_a');
          assert.equal(include.memberships, true);
          return { id: 'org_local_a', ...data };
        },
      },
    }),
  };
  const provider = {
    getUser: async () => ({ firstName: 'Alice', lastName: 'A', email: 'alice@example.com' }),
    createOrganization: async () => ({ id: 'org_clerk_a' }),
    deleteOrganization: async () => { externalDeleted = true; },
  };
  const organization = await provisionOrganization(db, provider, { userId: 'user_a' }, { name: 'Acme', slug: 'acme' });
  assert.equal(organization.clerkOrgId, 'org_clerk_a');
  assert.equal(organization.memberships.create.role, 'owner');
  assert.equal(externalDeleted, false);
});

test('failed local provisioning attempts to clean up the external organization', async () => {
  let deletedId = '';
  const provider = {
    createOrganization: async () => ({ id: 'org_orphan' }),
    deleteOrganization: async (id) => { deletedId = id; },
  };
  const db = { $transaction: async () => { throw new Error('database unavailable'); } };
  await assert.rejects(
    () => provisionOrganization(db, provider, { userId: 'user_a' }, { name: 'Acme', slug: 'acme' }),
    /database unavailable/,
  );
  assert.equal(deletedId, 'org_orphan');
});
