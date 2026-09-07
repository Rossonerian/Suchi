import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';

const invitationInput = z.object({ email: z.string().trim().toLowerCase().email().max(254), role: z.enum(['admin', 'member']).default('member') }).strict();

function assertOrgAdmin(context) {
  if (!['owner', 'admin'].includes(context?.organizationRole)) throw new AppError('Only organization administrators can manage members.', 403, 'FORBIDDEN');
}

async function listOrganizationMembers(db, context) {
  const result = await db.organizationMembership.findMany({ where: { organizationId: context.organizationId }, include: { user: true }, orderBy: { createdAt: 'asc' }, take: 100 });
  return result.map(membership => ({ id: membership.id, userId: membership.userId, role: membership.role, email: membership.user.email, displayName: membership.user.displayName }));
}

async function inviteOrganizationMember(auth, context, input, headers) {
  assertOrgAdmin(context);
  const parsed = parseSchema(invitationInput, input, 'Member invitation is invalid.');
  const invitation = await auth.api.createInvitation({ headers, body: { organizationId: context.organizationId, email: parsed.email, role: parsed.role } });
  return { id: invitation.id, email: parsed.email, role: parsed.role, status: invitation.status || 'pending' };
}

export { invitationInput, assertOrgAdmin, listOrganizationMembers, inviteOrganizationMember };
