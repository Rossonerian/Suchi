const { AppError } = require('../utils/validation');
function getResolveMembership() {
  return require('./projects').resolveMembership;
}

const permissionRoles = {
  'project:create': new Set(['owner', 'admin', 'member']),
  'project:update': new Set(['owner', 'admin', 'project:owner', 'project:manager']),
  'project:delete': new Set(['owner', 'admin', 'project:owner']),
  'task:create': new Set(['owner', 'admin', 'member', 'project:owner', 'project:manager', 'project:member']),
  'task:update': new Set(['owner', 'admin', 'member', 'project:owner', 'project:manager', 'project:member']),
  'task:delete': new Set(['owner', 'admin', 'project:owner', 'project:manager']),
  'task:assign': new Set(['owner', 'admin', 'member', 'project:owner', 'project:manager', 'project:member']),
  'meeting:create': new Set(['owner', 'admin', 'member']),
};

async function authorizationContext(db, context, projectId) {
  const resolved = await getResolveMembership()(db, context);
  let projectRole = null;
  if (projectId && db.projectMember?.findUnique) {
    const projectMember = await db.projectMember.findUnique({ where: { projectId_membershipId: { projectId, membershipId: resolved.membership.id } } });
    projectRole = projectMember?.role || null;
  }
  return { ...context, organizationRole: resolved.membership.role || context.organizationRole, projectRole, user: resolved.user, membership: resolved.membership };
}

async function assertPermission(db, context, permission, projectId) {
  const auth = await authorizationContext(db, context, projectId);
  const role = auth.organizationRole === 'owner' || auth.organizationRole === 'admin' ? auth.organizationRole : (auth.projectRole ? `project:${auth.projectRole}` : auth.organizationRole);
  if (!permissionRoles[permission]?.has(role)) throw new AppError(`Permission denied: ${permission}.`, 403, 'FORBIDDEN');
  return auth;
}

module.exports = { permissionRoles, authorizationContext, assertPermission };
