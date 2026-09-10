import { fromNodeHeaders } from 'better-auth/node';
import { AppError } from '../utils/validation.js';
import { getSaasDatabase } from './database.js';
import { getAuth } from './auth.js';
import { provisionApplicationUser } from './identity-bridge.js';
import {
  isClerkConfigured,
  requireClerkOrganization,
  requireClerkUser,
} from '../utils/clerk.js';

export async function resolveSessionContext(
  db,
  result,
  requireOrganization = true,
  requestedWorkspace = null,
) {
  if (!result?.user?.id || !result.session?.id || result.session.userId !== result.user.id) {
    throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
  }

  let userProfile = await db.userProfile.findUnique({
    where: { authUserId: result.user.id },
  });

  if (!userProfile) {
    userProfile = await provisionApplicationUser(db, result.user);
  }

  const context = {
    authUserId: result.user.id,
    applicationUserId: userProfile.id,
    userId: userProfile.id,
    sessionId: result.session.id,
  };

  if (!requireOrganization) return context;

  const requested =
    requestedWorkspace?.id ||
    requestedWorkspace?.slug ||
    requestedWorkspace ||
    result.session.activeOrganizationId;

  if (!requested) {
    throw new AppError('Select a workspace before continuing.', 400, 'ORGANIZATION_REQUIRED');
  }

  const organization = await db.organization.findFirst({
    where: {
      OR: [
        { id: String(requested) },
        { slug: String(requested) },
      ],
    },
  });

  if (!organization) {
    throw new AppError('Workspace not found.', 404, 'ORGANIZATION_NOT_FOUND');
  }

  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: userProfile.id,
      },
    },
  });

  if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
    throw new AppError('You are not a member of this workspace.', 403, 'FORBIDDEN');
  }

  return {
    ...context,
    organizationId: organization.id,
    membershipId: membership.id,
    organizationRole: membership.role,
    role: membership.role,
  };
}

function requireSession(requireOrganization) {
  return async (req, res, next) => {
    try {
      if (isClerkConfigured()) {
        if (requireOrganization) {
          return requireClerkOrganization(req, res, next);
        }
        return requireClerkUser(req, res, next);
      }

      const result = await getAuth().api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      const requested =
        req.headers['x-organization-id'] ||
        req.headers['x-organization-slug'] ||
        req.query?.organizationId ||
        req.query?.organizationSlug ||
        req.query?.orgSlug ||
        null;

      const context = await resolveSessionContext(
        getSaasDatabase(),
        result,
        requireOrganization,
        requested,
      );

      req.authContext = {
        authUserId: context.authUserId,
        applicationUserId: context.applicationUserId,
        sessionId: context.sessionId,
      };
      req.userContext = {
        userId: context.applicationUserId,
        sessionId: context.sessionId,
        authUserId: context.authUserId,
      };
      if (requireOrganization) {
        req.organizationContext = context;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuthenticatedUser = requireSession(false);
export const requireOrganization = requireSession(true);
