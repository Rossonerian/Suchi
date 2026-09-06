const { clerkMiddleware, getAuth } = require('@clerk/express');
const { AppError } = require('./validation');

// The legacy session remains the compatibility path until Clerk is explicitly
// enabled. A secret key alone is not enough to switch production traffic over;
// this prevents an accidentally populated environment from changing auth
// semantics during the migration.
function isClerkConfigured() {
  return process.env.AUTH_PROVIDER === 'clerk' && Boolean(process.env.CLERK_SECRET_KEY);
}

function organizationRoleFromClerkRole(role) {
  const normalized = String(role || '').replace(/^org:/, '');
  if (['owner', 'admin', 'member'].includes(normalized)) return normalized;
  throw new AppError('Your organization role is not supported.', 403, 'INVALID_ORGANIZATION_ROLE');
}

function organizationContextFromClerkAuth(auth) {
  const userContext = userContextFromClerkAuth(auth);
  const userId = userContext.userId;

  const organizationId = typeof auth.orgId === 'string' ? auth.orgId : '';
  if (!organizationId) {
    throw new AppError('Select an organization before continuing.', 400, 'ORGANIZATION_REQUIRED');
  }

  return {
    userId,
    organizationId,
    organizationRole: organizationRoleFromClerkRole(auth.orgRole),
  };
}

function userContextFromClerkAuth(auth) {
  const userId = typeof auth?.userId === 'string' ? auth.userId : '';
  if (!userId) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
  return { userId };
}

function clerkMiddlewareIfConfigured() {
  return isClerkConfigured() ? clerkMiddleware() : (req, res, next) => next();
}

function requireClerkOrganization(req, res, next) {
  try {
    if (!isClerkConfigured()) {
      throw new AppError('Clerk authentication is not configured.', 503, 'AUTH_PROVIDER_UNAVAILABLE');
    }
    const auth = getAuth(req);
    req.clerkAuth = auth;
    req.organizationContext = organizationContextFromClerkAuth(auth);
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireClerkUser(req, res, next) {
  try {
    if (!isClerkConfigured()) {
      throw new AppError('Clerk authentication is not configured.', 503, 'AUTH_PROVIDER_UNAVAILABLE');
    }
    const auth = getAuth(req);
    req.clerkAuth = auth;
    req.userContext = userContextFromClerkAuth(auth);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  isClerkConfigured,
  organizationRoleFromClerkRole,
  organizationContextFromClerkAuth,
  userContextFromClerkAuth,
  clerkMiddlewareIfConfigured,
  requireClerkOrganization,
  requireClerkUser,
};
