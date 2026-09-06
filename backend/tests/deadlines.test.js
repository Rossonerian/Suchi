const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDeadlineNotifications, runDeadlineSweep } = require('../jobs/deadlines');

test('deadline notifications include only incomplete tasks due soon or overdue', () => {
  const now = new Date('2099-01-01T12:00:00.000Z');
  const notifications = buildDeadlineNotifications([
    { id: 'task_soon', organizationId: 'org_a', title: 'Soon', dueAt: new Date('2099-01-02T12:00:00.000Z'), status: 'todo', assignees: [{ membership: { userId: 'user_a' } }] },
    { id: 'task_overdue', organizationId: 'org_a', title: 'Overdue', dueAt: new Date('2098-12-31T12:00:00.000Z'), status: 'in_progress', assignees: [{ membership: { userId: 'user_a' } }] },
    { id: 'task_done', organizationId: 'org_a', title: 'Done', dueAt: new Date('2098-12-31T12:00:00.000Z'), status: 'done', assignees: [{ membership: { userId: 'user_a' } }] },
  ], now);
  assert.equal(notifications.length, 2);
  assert.deepEqual(notifications.map((entry) => entry.type), ['task_due_soon', 'task_overdue']);
  assert.equal(notifications[0].dedupeKey, 'task_soon:due:2099-01-02');
});

test('deadline notification generation is safe for missing assignees', () => {
  assert.deepEqual(buildDeadlineNotifications([{ id: 'task', organizationId: 'org_a', title: 'No owner', dueAt: new Date('2099-01-01T13:00:00.000Z'), status: 'todo', assignees: [] }], new Date('2099-01-01T12:00:00.000Z')), []);
});

test('deadline sweep uses idempotent notification insertion', async () => {
  let createManyArgs;
  const db = {
    task: { findMany: async () => [{ id: 'task', organizationId: 'org_a', title: 'Soon', dueAt: new Date('2099-01-01T13:00:00.000Z'), status: 'todo', assignees: [{ membership: { userId: 'user_a' } }] }] },
    notification: { createMany: async (args) => { createManyArgs = args; return { count: 1 }; } },
  };
  const result = await runDeadlineSweep(db, new Date('2099-01-01T12:00:00.000Z'));
  assert.deepEqual(result, { scanned: 1, generated: 1 });
  assert.equal(createManyArgs.skipDuplicates, true);
});
