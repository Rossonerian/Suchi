import { fromNodeHeaders } from 'better-auth/node';
import { AppError } from '../utils/validation.js';
import { getSaasDatabase } from './database.js';
import { getAuth } from './auth.js';

export async function resolveSessionContext(db, result, requireOrganization = true) {
  if (!result?.user?.id || !result.session?.id || result.session.userId !== result.user.id) {
    throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
  }
  const context = { userId: result.user.id, sessionId: result.session.id };
  if (!requireOrganization) return context;
  const organizationId = result.session.activeOrganizationId;
  if (!organizationId) throw new AppError('Select a workspace before continuing.', 400, 'ORGANIZATION_REQUIRED');
  const membership = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: context.userId } },
  });
  if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
    throw new AppError('You are not a member of this workspace.', 403, 'FORBIDDEN');
  }
  return { ...context, organizationId, membershipId: membership.id, organizationRole: membership.role };
}

function requireSession(requireOrganization) {
  return async (req, res, next) => {
    try {
      const result = await getAuth().api.getSession({ headers: fromNodeHeaders(req.headers) });
      const context = await resolveSessionContext(getSaasDatabase(), result, requireOrganization);
      req.authContext = context;
      req.userContext = { userId: context.userId, sessionId: context.sessionId };
      if (requireOrganization) req.organizationContext = context;
      next();
    } catch (error) { next(error); }
  };
}

export const requireAuthenticatedUser = requireSession(false);
export const requireOrganization = requireSession(true);
