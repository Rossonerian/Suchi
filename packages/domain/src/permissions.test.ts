import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPermission, assertSameOrganization, hasPermission } from './permissions.js';

const admin = { userId: 'user_a', organizationId: 'org_a', organizationRole: 'admin' as const };
const member = { userId: 'user_a', organizationId: 'org_a', organizationRole: 'member' as const };

test('organization context controls tenant ownership', () => {
  assert.equal(hasPermission(admin, 'project:delete'), true);
  assert.equal(hasPermission(member, 'project:delete'), false);
  assert.equal(hasPermission({ ...member, projectRole: 'manager', isProjectMember: true }, 'project:update'), true);
  assert.equal(hasPermission({ ...member, projectRole: 'viewer', isProjectMember: true }, 'task:update'), false);
});

test('cross-organization resources are rejected', () => {
  assert.doesNotThrow(() => assertSameOrganization(admin, 'org_a'));
  assert.throws(() => assertSameOrganization(admin, 'org_b'), { name: 'OrganizationBoundaryError' });
});

test('assertPermission produces a stable authorization error', () => {
  assert.doesNotThrow(() => assertPermission(admin, 'member:invite'));
  assert.throws(() => assertPermission(member, 'billing:manage'), { name: 'PermissionDeniedError' });
});
