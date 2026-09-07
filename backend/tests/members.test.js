import test from 'node:test';
import assert from 'node:assert/strict';
import { listOrganizationMembers, inviteOrganizationMember } from '../saas/members.js';

test('member listing is limited to the authenticated organization', async () => {
  let params;
  const provider = { organizationMembership: { findMany: async (value) => { params = value; return [{ id: 'membership_a', role: 'admin', userId: 'user_a', user: { email: 'alice@example.com', displayName: 'Alice' } }]; } } };
  const members = await listOrganizationMembers(provider, { userId: 'user_a', organizationId: 'org_a', organizationRole: 'admin' });
  assert.equal(params.where.organizationId, 'org_a');
  assert.equal(members[0].role, 'admin');
});

test('member invitations require an admin and never trust a client organization ID', async () => {
  let params;
  const provider = { api: { createInvitation: async (value) => { params = value; return { id: 'invite_a', status: 'pending' }; } } };
  const invitation = await inviteOrganizationMember(provider, { userId: 'user_a', organizationId: 'org_a', organizationRole: 'owner' }, { email: 'Alice@Example.com', role: 'member' });
  assert.equal(invitation.email, 'alice@example.com');
  assert.deepEqual(params.body, { organizationId: 'org_a', email: 'alice@example.com', role: 'member' });
  await assert.rejects(() => inviteOrganizationMember(provider, { userId: 'user_a', organizationId: 'org_a', organizationRole: 'member' }, { email: 'bob@example.com' }), { code: 'FORBIDDEN', status: 403 });
});
