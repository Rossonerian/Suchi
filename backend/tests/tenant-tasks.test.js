const test = require('node:test');
const assert = require('node:assert/strict');
const { listTasks, getTask, createTask, updateTask, deleteTask } = require('../saas/tasks');

const contextA = { userId: 'user_a', organizationId: 'org_a', organizationRole: 'member' };

function fakeDatabase() {
  const tasks = [{ id: 'task_a', organizationId: 'org_a', projectId: 'project_a', title: 'A task', status: 'todo', priority: 'medium' }];
  const users = { user_a: { id: 'local_user_a' } };
  const memberships = [
    { id: 'membership_a', organizationId: 'org_a', userId: 'local_user_a', role: 'member' },
    { id: 'membership_b', organizationId: 'org_b', userId: 'local_user_b', role: 'member' },
  ];
  const projects = [{ id: 'project_a', organizationId: 'org_a' }];
  const db = {
    userProfile: { findUnique: async ({ where }) => users[where.clerkUserId] || null },
    organizationMembership: {
      findUnique: async ({ where }) => memberships.find((entry) => entry.organizationId === where.organizationId_userId.organizationId && entry.userId === where.organizationId_userId.userId) || null,
      findMany: async ({ where }) => memberships.filter((entry) => entry.organizationId === where.organizationId && (!where.id?.in || where.id.in.includes(entry.id))),
    },
    project: { findFirst: async ({ where }) => projects.find((project) => project.id === where.id && project.organizationId === where.organizationId) || null },
    task: {
      findMany: async ({ where }) => tasks.filter((task) => task.organizationId === where.organizationId && (!where.projectId || task.projectId === where.projectId)),
      findFirst: async ({ where }) => tasks.find((task) => task.id === where.id && task.organizationId === where.organizationId) || null,
      create: async ({ data }) => { const task = { id: `task_${tasks.length + 1}`, ...data }; tasks.push(task); return task; },
      update: async ({ where, data }) => { const task = tasks.find((entry) => entry.id === where.id); Object.assign(task, data); return task; },
      delete: async ({ where }) => { const index = tasks.findIndex((entry) => entry.id === where.id); return tasks.splice(index, 1)[0]; },
    },
    taskAssignee: {
      createMany: async ({ data }) => ({ count: data.length }),
      deleteMany: async () => ({ count: 0 }),
    },
    $transaction: async (callback) => callback(db),
  };
  return db;
}

test('task reads are scoped to organization and optional project', async () => {
  const db = fakeDatabase();
  assert.equal((await listTasks(db, contextA)).length, 1);
  assert.equal((await listTasks(db, contextA, { projectId: 'project_missing' })).length, 0);
  assert.equal(await getTask(db, contextA, 'task_from_other_org'), null);
});

test('task creation derives creator and tenant and validates project ownership', async () => {
  const task = await createTask(fakeDatabase(), contextA, {
    projectId: 'project_a', title: 'New task', priority: 'high', assigneeIds: ['membership_a'],
  });
  assert.equal(task.organizationId, 'org_a');
  assert.equal(task.creatorId, 'local_user_a');
  assert.equal(task.assigneeCount, 1);
});

test('task update and delete cannot cross organization boundaries', async () => {
  const db = fakeDatabase();
  await assert.rejects(() => updateTask(db, contextA, 'task_from_other_org', { status: 'done' }), { code: 'TASK_NOT_FOUND', status: 404 });
  await assert.rejects(() => deleteTask(db, contextA, 'task_from_other_org'), { code: 'TASK_NOT_FOUND', status: 404 });
});
