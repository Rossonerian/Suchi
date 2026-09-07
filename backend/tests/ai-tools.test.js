import test from 'node:test';
import assert from 'node:assert/strict';
import { getToolDefinitions, executeToolCall } from '../ai/tools.js';

const context = { userId: 'user_a', organizationId: 'org_a', organizationRole: 'member' };

test('AI tool definitions expose only bounded operations', () => {
  const names = getToolDefinitions().map((tool) => tool.function.name);
  assert.deepEqual(names, ['list_projects', 'list_tasks', 'list_deadlines', 'list_meetings', 'create_task']);
});

test('AI read tools enforce organization filters', async () => {
  let where;
  const db = {
    userProfile: { findUnique: async () => ({ id: 'local_user_a' }) },
    organizationMembership: { findUnique: async () => ({ id: 'membership_a' }) },
    project: { findMany: async ({ where: value }) => { where = value; return [{ id: 'project_a', organizationId: value.organizationId }]; } },
  };
  const result = await executeToolCall('list_projects', {}, { db, context });
  assert.equal(where.organizationId, 'org_a');
  assert.equal(result[0].organizationId, 'org_a');
});

test('AI write tools return confirmation proposals and do not mutate', async () => {
  let called = false;
  const result = await executeToolCall('create_task', { projectId: 'project_a', title: 'Proposed task' }, { db: { project: { findFirst: async () => ({ id: 'project_a', organizationId: 'org_a' }) }, userProfile: { findUnique: async () => ({ id: 'local_user_a' }) }, organizationMembership: { findUnique: async () => ({ id: 'membership_a' }) } }, context, createTask: async () => { called = true; } });
  assert.equal(result.requiresConfirmation, true);
  assert.equal(result.operation, 'create_task');
  assert.equal(called, false);
});
