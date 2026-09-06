const { z } = require('zod');
const { AppError, parseSchema } = require('../utils/validation');

const invitationInput = z.object({ email: z.string().trim().toLowerCase().email().max(254), role: z.enum(['admin', 'member']).default('member') }).strict();

function assertOrgAdmin(context) {
  if (!['owner', 'admin'].includes(context?.organizationRole)) throw new AppError('Only organization administrators can manage members.', 403, 'FORBIDDEN');
}

async function listOrganizationMembers(identityProvider, context) {
  const result = await identityProvider.getOrganizationMembershipList({ organizationId: context.organizationId, limit: 100 });
  return (result?.data || []).map((membership) => ({ id: membership.id, userId: membership.publicUserData?.userId || membership.publicUserData?.identifier || null, role: String(membership.role || '').replace(/^org:/, ''), email: membership.publicUserData?.identifier || null, displayName: [membership.publicUserData?.firstName, membership.publicUserData?.lastName].filter(Boolean).join(' ') || null }));
}

async function inviteOrganizationMember(identityProvider, context, input) {
  assertOrgAdmin(context);
  const parsed = parseSchema(invitationInput, input, 'Member invitation is invalid.');
  const invitation = await identityProvider.createOrganizationInvitation({ organizationId: context.organizationId, emailAddress: parsed.email, role: `org:${parsed.role}`, inviterUserId: context.userId, expiresInDays: 30 });
  return { id: invitation.id, email: parsed.email, role: parsed.role, status: invitation.status || 'pending' };
}

module.exports = { invitationInput, assertOrgAdmin, listOrganizationMembers, inviteOrganizationMember };
