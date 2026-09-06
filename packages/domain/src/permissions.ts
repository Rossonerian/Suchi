import type { OrganizationContext, OrganizationRole, ProjectRole } from '../../schemas/src/index.js';

export const PERMISSIONS = [
  'organization:update',
  'member:invite',
  'member:remove',
  'project:create',
  'project:update',
  'project:delete',
  'task:create',
  'task:update',
  'task:delete',
  'task:assign',
  'meeting:create',
  'integration:manage',
  'billing:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type PermissionContext = OrganizationContext & {
  projectRole?: ProjectRole | null;
  isProjectMember?: boolean;
};

const organizationPermissions: Record<OrganizationRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: [
    'organization:update', 'member:invite', 'member:remove',
    'project:create', 'project:update', 'project:delete',
    'task:create', 'task:update', 'task:delete', 'task:assign',
    'meeting:create', 'integration:manage', 'billing:manage',
  ],
  member: ['project:create', 'task:create', 'task:update', 'task:assign', 'meeting:create'],
};

const projectPermissions: Record<Exclude<ProjectRole, 'viewer'>, readonly Permission[]> = {
  owner: ['project:update', 'project:delete', 'task:create', 'task:update', 'task:delete', 'task:assign', 'meeting:create'],
  manager: ['project:update', 'task:create', 'task:update', 'task:delete', 'task:assign', 'meeting:create'],
  member: ['task:create', 'task:update', 'meeting:create'],
};

export function hasPermission(context: PermissionContext, permission: Permission): boolean {
  // Owners/admins retain organization-level authority. For members, an
  // explicit project membership is narrower than the organization default.
  if (context.organizationRole === 'owner' || context.organizationRole === 'admin') {
    return organizationPermissions[context.organizationRole].includes(permission);
  }
  if (context.isProjectMember && context.projectRole) {
    if (context.projectRole === 'viewer') return false;
    return projectPermissions[context.projectRole].includes(permission);
  }
  return organizationPermissions[context.organizationRole].includes(permission);
}

export function assertPermission(context: PermissionContext, permission: Permission): void {
  if (!hasPermission(context, permission)) {
    const error = new Error(`Permission denied: ${permission}`);
    error.name = 'PermissionDeniedError';
    throw error;
  }
}

export function sameOrganization(context: OrganizationContext, resourceOrganizationId: string): boolean {
  return context.organizationId === resourceOrganizationId;
}

export function assertSameOrganization(context: OrganizationContext, resourceOrganizationId: string): void {
  if (!sameOrganization(context, resourceOrganizationId)) {
    const error = new Error('Resource does not belong to the active organization.');
    error.name = 'OrganizationBoundaryError';
    throw error;
  }
}
