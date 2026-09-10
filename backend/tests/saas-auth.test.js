import test from 'node:test';
import assert from 'node:assert/strict';

test('verified sessions resolve authoritative database memberships and ignore request identities', async () => {
  const { resolveSessionContext } = await import('../saas/auth-context.js');
  const db = {
    userProfile: {
      findUnique: async ({ where }) => {
        if (where.authUserId === 'user-b' || where.id === 'profile-b') {
          return { id: 'profile-b', authUserId: 'user-b', email: 'user-b@example.com' };
        }
        return null;
      },
    },
    organization: {
      findFirst: async ({ where }) => {
        const id = where.OR?.[0]?.id || where.OR?.[1]?.slug;
        if (id === 'beta' || id === 'alpha') {
          return { id, slug: id, name: id.toUpperCase() };
        }
        return null;
      },
    },
    organizationMembership: {
      findUnique: async ({ where }) => (where.organizationId_userId.organizationId === 'beta' && where.organizationId_userId.userId === 'profile-b' ? { id: 'member-b', role: 'member' } : null),
    },
  };
  const session = {
    user: { id: 'user-b', email: 'user-b@example.com' },
    session: { id: 'session-b', userId: 'user-b', activeOrganizationId: 'beta' },
  };
  const context = await resolveSessionContext(db, session);
  assert.equal(context.authUserId, 'user-b');
  assert.equal(context.applicationUserId, 'profile-b');
  assert.equal(context.userId, 'profile-b');
  assert.equal(context.sessionId, 'session-b');
  assert.equal(context.organizationId, 'beta');
  assert.equal(context.membershipId, 'member-b');
  assert.equal(context.organizationRole, 'member');

  // User not in alpha workspace is rejected with 403 FORBIDDEN
  await assert.rejects(
    () => resolveSessionContext(db, { ...session, session: { ...session.session, activeOrganizationId: 'alpha' } }),
    { status: 403, code: 'FORBIDDEN' },
  );

  // Missing session rejected with 401 UNAUTHENTICATED
  await assert.rejects(() => resolveSessionContext(db, null), { status: 401, code: 'UNAUTHENTICATED' });

  // Missing workspace selection rejected with 400 ORGANIZATION_REQUIRED
  await assert.rejects(
    () => resolveSessionContext(db, { ...session, session: { ...session.session, activeOrganizationId: null } }),
    { status: 400, code: 'ORGANIZATION_REQUIRED' },
  );
});
