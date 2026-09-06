const test = require('node:test');
const assert = require('node:assert/strict');
const { listOrganizationMembers, inviteOrganizationMember } = require('../saas/members');

test('member listing is limited to the authenticated organization', async () => {
  let params;
  const provider = { getOrganizationMembershipList: async (value) => { params = value; return { data: [{ id: 'membership_a', role: 'org:admin', publicUserData: { userId: 'user_a', identifier: 'alice@example.com', firstName: 'Alice' } }] }; } };
  const members = await listOrganizationMembers(provider, { userId: 'user_a', organizationId: 'org_a', organizationRole: 'admin' });
  assert.equal(params.organizationId, 'org_a');
  assert.equal(members[0].role, 'admin');
});

test('member invitations require an admin and never trust a client organization ID', async () => {
  let params;
  const provider = { createOrganizationInvitation: async (value) => { params = value; return { id: 'invite_a', status: 'pending' }; } };
  const invitation = await inviteOrganizationMember(provider, { userId: 'user_a', organizationId: 'org_a', organizationRole: 'owner' }, { email: 'Alice@Example.com', role: 'member' });
  assert.equal(invitation.email, 'alice@example.com');
  assert.deepEqual(params, { organizationId: 'org_a', emailAddress: 'alice@example.com', role: 'org:member', inviterUserId: 'user_a', expiresInDays: 30 });
  await assert.rejects(() => inviteOrganizationMember(provider, { userId: 'user_a', organizationId: 'org_a', organizationRole: 'member' }, { email: 'bob@example.com' }), { code: 'FORBIDDEN', status: 403 });
});
