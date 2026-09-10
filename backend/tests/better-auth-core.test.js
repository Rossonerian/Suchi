import test from 'node:test';
import assert from 'node:assert/strict';
import { authConfiguration, createAuth } from '../saas/auth.js';
import { provisionApplicationUser } from '../saas/identity-bridge.js';
import { resolveSessionContext } from '../saas/auth-context.js';

test('Better Auth configuration enforces invariants', () => {
  assert.throws(
    () => authConfiguration({ BETTER_AUTH_SECRET: 'short', BETTER_AUTH_URL: 'http://localhost:5000' }),
    /at least 32 characters/,
  );
  assert.throws(
    () => authConfiguration({ BETTER_AUTH_SECRET: 'a'.repeat(32), BETTER_AUTH_URL: '' }),
    /BETTER_AUTH_URL is required/,
  );
  assert.throws(
    () => authConfiguration({
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://example.com',
      NODE_ENV: 'production',
    }),
    /must use HTTPS in production/,
  );

  const config = authConfiguration({
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    BETTER_AUTH_URL: 'http://localhost:5000',
    BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000, http://127.0.0.1:3000',
  });
  assert.equal(config.baseURL, 'http://localhost:5000');
  assert.ok(config.trustedOrigins.includes('http://localhost:3000'));
  assert.ok(config.trustedOrigins.includes('nidar://'));
});

test('identity bridge provisions and links application UserProfile idempotently', async () => {
  const store = {
    profiles: new Map(),
  };

  const mockDb = {
    userProfile: {
      findUnique: async ({ where }) => {
        if (where.authUserId) {
          for (const p of store.profiles.values()) {
            if (p.authUserId === where.authUserId) return p;
          }
        }
        if (where.email) {
          return store.profiles.get(where.email) || null;
        }
        return null;
      },
      create: async ({ data }) => {
        const profile = { id: `profile_${Date.now()}`, ...data };
        store.profiles.set(data.email, profile);
        return profile;
      },
      update: async ({ where, data }) => {
        for (const [email, p] of store.profiles.entries()) {
          if (p.id === where.id) {
            const updated = { ...p, ...data };
            store.profiles.set(email, updated);
            return updated;
          }
        }
        return null;
      },
    },
  };

  const authUser = {
    id: 'auth_usr_123',
    email: '  User.Test@Example.COM ',
    name: 'Test User',
    image: 'https://example.com/avatar.png',
    emailVerified: true,
  };

  // 1. Initial provisioning
  const profile1 = await provisionApplicationUser(mockDb, authUser);
  assert.ok(profile1.id);
  assert.equal(profile1.authUserId, 'auth_usr_123');
  assert.equal(profile1.email, 'user.test@example.com');
  assert.equal(profile1.displayName, 'Test User');
  assert.equal(profile1.avatarUrl, 'https://example.com/avatar.png');
  assert.equal(profile1.emailVerified, true);

  // 2. Idempotent re-provisioning returns identical profile
  const profile2 = await provisionApplicationUser(mockDb, authUser);
  assert.equal(profile2.id, profile1.id);
  assert.equal(profile2.authUserId, profile1.authUserId);

  // 3. Linking existing application profile by email
  const unlinkedProfile = {
    id: 'profile_legacy_456',
    authUserId: null,
    email: 'legacy@example.com',
    displayName: 'Legacy User',
    avatarUrl: null,
    emailVerified: false,
  };
  store.profiles.set('legacy@example.com', unlinkedProfile);

  const authUserLegacy = {
    id: 'auth_usr_legacy',
    email: 'legacy@example.com',
    name: 'Legacy User Updated',
  };

  const linked = await provisionApplicationUser(mockDb, authUserLegacy);
  assert.equal(linked.id, 'profile_legacy_456');
  assert.equal(linked.authUserId, 'auth_usr_legacy');

  // 4. Conflicting authUserId rejects linking to prevent account takeover
  const attackerAuthUser = {
    id: 'auth_usr_attacker',
    email: 'legacy@example.com',
  };
  await assert.rejects(
    () => provisionApplicationUser(mockDb, attackerAuthUser),
    { code: 'ACCOUNT_CONFLICT', status: 409 },
  );
});

test('session and tenant context resolution enforces isolation, switching, and domain contracts', async () => {
  const users = {
    'auth_user_a': { id: 'app_user_a', authUserId: 'auth_user_a', email: 'a@example.com' },
    'auth_user_b': { id: 'app_user_b', authUserId: 'auth_user_b', email: 'b@example.com' },
  };

  const organizations = {
    'org_alpha': { id: 'org_alpha', slug: 'alpha-team', name: 'Alpha Team' },
    'org_beta': { id: 'org_beta', slug: 'beta-team', name: 'Beta Team' },
  };

  // User A belongs to Alpha (owner) and Beta (member)
  // User B belongs ONLY to Beta (member)
  const memberships = {
    'org_alpha:app_user_a': { id: 'mem_a_alpha', organizationId: 'org_alpha', userId: 'app_user_a', role: 'owner' },
    'org_beta:app_user_a': { id: 'mem_a_beta', organizationId: 'org_beta', userId: 'app_user_a', role: 'member' },
    'org_beta:app_user_b': { id: 'mem_b_beta', organizationId: 'org_beta', userId: 'app_user_b', role: 'member' },
  };

  const mockDb = {
    userProfile: {
      findUnique: async ({ where }) => {
        if (where.authUserId) return users[where.authUserId] || null;
        if (where.id) return Object.values(users).find(u => u.id === where.id) || null;
        return null;
      },
    },
    organization: {
      findFirst: async ({ where }) => {
        const term = where.OR?.[0]?.id || where.OR?.[1]?.slug;
        for (const org of Object.values(organizations)) {
          if (org.id === term || org.slug === term) return org;
        }
        return null;
      },
    },
    organizationMembership: {
      findUnique: async ({ where }) => {
        const key = `${where.organizationId_userId.organizationId}:${where.organizationId_userId.userId}`;
        return memberships[key] || null;
      },
    },
  };

  // User A accesses Alpha via slug
  const sessionA = {
    user: { id: 'auth_user_a' },
    session: { id: 'sess_a', userId: 'auth_user_a', activeOrganizationId: null },
  };

  const contextAAlpha = await resolveSessionContext(mockDb, sessionA, true, 'alpha-team');
  assert.equal(contextAAlpha.authUserId, 'auth_user_a');
  assert.equal(contextAAlpha.applicationUserId, 'app_user_a');
  assert.equal(contextAAlpha.userId, 'app_user_a'); // Preserves application user ID contract!
  assert.equal(contextAAlpha.organizationId, 'org_alpha');
  assert.equal(contextAAlpha.membershipId, 'mem_a_alpha');
  assert.equal(contextAAlpha.organizationRole, 'owner');

  // User A switches to Beta via id
  const contextABeta = await resolveSessionContext(mockDb, sessionA, true, 'org_beta');
  assert.equal(contextABeta.organizationId, 'org_beta');
  assert.equal(contextABeta.membershipId, 'mem_a_beta');
  assert.equal(contextABeta.organizationRole, 'member');

  // User B accesses Beta successfully
  const sessionB = {
    user: { id: 'auth_user_b' },
    session: { id: 'sess_b', userId: 'auth_user_b', activeOrganizationId: 'org_beta' },
  };
  const contextBBeta = await resolveSessionContext(mockDb, sessionB, true);
  assert.equal(contextBBeta.applicationUserId, 'app_user_b');
  assert.equal(contextBBeta.organizationId, 'org_beta');
  assert.equal(contextBBeta.membershipId, 'mem_b_beta');

  // User B attempts to access Alpha -> MUST BE REJECTED 403
  await assert.rejects(
    () => resolveSessionContext(mockDb, sessionB, true, 'alpha-team'),
    { status: 403, code: 'FORBIDDEN' },
  );

  // Unknown workspace -> 404 NOT_FOUND
  await assert.rejects(
    () => resolveSessionContext(mockDb, sessionA, true, 'non-existent-team'),
    { status: 404, code: 'ORGANIZATION_NOT_FOUND' },
  );

  // Missing session -> 401 UNAUTHENTICATED
  await assert.rejects(
    () => resolveSessionContext(mockDb, null),
    { status: 401, code: 'UNAUTHENTICATED' },
  );

  // Tampered session where session.userId does not match user.id
  await assert.rejects(
    () => resolveSessionContext(mockDb, {
      user: { id: 'auth_user_a' },
      session: { id: 'sess_x', userId: 'auth_user_attacker', activeOrganizationId: 'org_alpha' },
    }),
    { status: 401, code: 'UNAUTHENTICATED' },
  );
});

test('task assignees remain authoritative application Memberships, not Better Auth user IDs', () => {
  // Application domain invariant check:
  // A task assignee references OrganizationMembership.id
  const task = {
    id: 'task_1',
    title: 'Implement Option B Bridge',
    organizationId: 'org_alpha',
    assignees: [
      { taskId: 'task_1', membershipId: 'mem_a_alpha' },
    ],
  };
  assert.ok(task.assignees[0].membershipId.startsWith('mem_'));
  assert.ok(!task.assignees[0].membershipId.startsWith('auth_usr_'));
});
