import test from 'node:test';
import assert from 'node:assert/strict';

test('verified sessions resolve authoritative database memberships and ignore request identities', async () => {
  const { resolveSessionContext } = await import('../saas/auth-context.js');
  const db = { organizationMembership: { findUnique: async ({ where }) => where.organizationId_userId.organizationId === 'beta' ? { id: 'member-b', role: 'member' } : null } };
  const session = { user: { id: 'user-b' }, session: { id: 'session-b', userId: 'user-b', activeOrganizationId: 'beta' } };
  assert.deepEqual(await resolveSessionContext(db, session), { userId: 'user-b', sessionId: 'session-b', organizationId: 'beta', membershipId: 'member-b', organizationRole: 'member' });
  await assert.rejects(() => resolveSessionContext(db, { ...session, session: { ...session.session, activeOrganizationId: 'alpha' } }), { status: 403 });
  await assert.rejects(() => resolveSessionContext(db, null), { status: 401 });
  await assert.rejects(() => resolveSessionContext(db, { ...session, session: { ...session.session, activeOrganizationId: null } }), { code: 'ORGANIZATION_REQUIRED' });
});
