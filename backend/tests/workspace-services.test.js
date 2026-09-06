const test = require('node:test');
const assert = require('node:assert/strict');
const { listNotifications, markNotificationRead } = require('../saas/notifications');
const { searchWorkspace } = require('../saas/search');
const { listComments, createComment } = require('../saas/comments');

const context = { userId: 'clerk_a', organizationId: 'org_a', organizationRole: 'member' };

function membershipDb() {
  return {
    userProfile: { findUnique: async () => ({ id: 'user_a' }) },
    organizationMembership: {
      findUnique: async () => ({ id: 'membership_a', userId: 'user_a' }),
    },
  };
}

test('notifications are scoped by organization and authenticated member', async () => {
  let query;
  const db = { ...membershipDb(), notification: { findMany: async (value) => { query = value; return [{ id: 'notice_a' }]; } } };
  assert.deepEqual(await listNotifications(db, context, { unreadOnly: true }), [{ id: 'notice_a' }]);
  assert.deepEqual(query.where, { organizationId: 'org_a', userId: 'user_a', readAt: null });
});

test('marking a notification read cannot cross organizations', async () => {
  const db = {
    ...membershipDb(),
    notification: {
      findFirst: async ({ where }) => where.organizationId === 'org_a' && where.userId === 'user_a' ? { id: 'notice_a' } : null,
      update: async ({ data }) => ({ id: 'notice_a', ...data }),
    },
  };
  assert.ok((await markNotificationRead(db, context, 'notice_a')).readAt instanceof Date);
  await assert.rejects(() => markNotificationRead(db, { ...context, organizationId: 'org_b' }, 'notice_a'), { code: 'NOTIFICATION_NOT_FOUND', status: 404 });
});

test('workspace search applies the active organization to every resource query', async () => {
  const seen = [];
  const db = {
    ...membershipDb(),
    project: { findMany: async ({ where }) => { seen.push(where.organizationId); return [{ id: 'project_a', name: 'Apollo' }]; } },
    task: { findMany: async ({ where }) => { seen.push(where.organizationId); return []; } },
    meeting: { findMany: async ({ where }) => { seen.push(where.organizationId); return []; } },
    organizationMembership: { ...membershipDb().organizationMembership, findMany: async ({ where }) => { seen.push(where.organizationId); return []; } },
  };
  const result = await searchWorkspace(db, context, { q: 'ap' });
  assert.deepEqual(seen, ['org_a', 'org_a', 'org_a', 'org_a']);
  assert.equal(result.projects[0].id, 'project_a');
});

test('comments require an organization-owned task and record activity', async () => {
  let activity;
  const db = {
    ...membershipDb(),
    task: { findFirst: async ({ where }) => where.organizationId === 'org_a' ? { id: where.id } : null },
    comment: { findMany: async () => [{ id: 'comment_a' }], create: async ({ data }) => ({ id: 'comment_a', ...data }) },
    $transaction: async (callback) => callback({
      comment: db.comment,
      activityEvent: { create: async ({ data }) => { activity = data; } },
    }),
  };
  assert.deepEqual(await listComments(db, context, 'task_a'), [{ id: 'comment_a' }]);
  const comment = await createComment(db, context, 'task_a', { body: 'Progress update' });
  assert.equal(comment.organizationId, 'org_a');
  assert.equal(activity.resourceId, 'task_a');
  await assert.rejects(() => createComment(db, { ...context, organizationId: 'org_b' }, 'task_a', { body: 'No access' }), { code: 'TASK_NOT_FOUND', status: 404 });
});
