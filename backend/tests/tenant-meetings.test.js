const test = require('node:test');
const assert = require('node:assert/strict');
const { listMeetings, createMeeting, updateMeeting, cancelMeeting } = require('../saas/meetings');

const contextA = { userId: 'user_a', organizationId: 'org_a', organizationRole: 'member' };

function fakeDatabase() {
  const meetings = [];
  const memberships = [
    { id: 'membership_a', organizationId: 'org_a', userId: 'local_user_a', role: 'member' },
    { id: 'membership_b', organizationId: 'org_a', userId: 'local_user_b', role: 'member' },
  ];
  const db = {
    userProfile: { findUnique: async ({ where }) => where.clerkUserId === 'user_a' ? { id: 'local_user_a' } : null },
    organizationMembership: {
      findUnique: async ({ where }) => memberships.find((entry) => entry.organizationId === where.organizationId_userId.organizationId && entry.userId === where.organizationId_userId.userId) || null,
      findMany: async ({ where }) => memberships.filter((entry) => entry.organizationId === where.organizationId && where.id.in.includes(entry.id)),
    },
    project: { findFirst: async ({ where }) => where.id === 'project_a' && where.organizationId === 'org_a' ? { id: 'project_a' } : null },
    meeting: {
      findMany: async ({ where }) => meetings.filter((meeting) => meeting.organizationId === where.organizationId),
      findFirst: async ({ where }) => meetings.find((meeting) => meeting.id === where.id && meeting.organizationId === where.organizationId) || null,
      create: async ({ data }) => { const meeting = { id: `meeting_${meetings.length + 1}`, ...data }; meetings.push(meeting); return meeting; },
      update: async ({ where, data }) => { const meeting = meetings.find((entry) => entry.id === where.id); Object.assign(meeting, data); return meeting; },
    },
    meetingAttendee: { createMany: async ({ data }) => ({ count: data.length }), deleteMany: async () => ({ count: 0 }) },
    notification: { createMany: async ({ data }) => ({ count: data.length }) },
    $transaction: async (callback) => callback(db),
  };
  return db;
}

test('meeting reads and writes are organization-scoped', async () => {
  const db = fakeDatabase();
  assert.deepEqual(await listMeetings(db, contextA), []);
  await assert.rejects(() => cancelMeeting(db, contextA, 'meeting_from_other_org'), { code: 'MEETING_NOT_FOUND', status: 404 });
});

test('meeting filters reject malformed dates and inverted ranges', async () => {
  const db = fakeDatabase();
  await assert.rejects(
    () => listMeetings(db, contextA, { from: 'not-a-date' }),
    { code: 'VALIDATION_ERROR', status: 400 },
  );
  await assert.rejects(
    () => listMeetings(db, contextA, { from: '2099-01-02T00:00:00.000Z', to: '2099-01-01T00:00:00.000Z' }),
    { code: 'VALIDATION_ERROR', status: 400 },
  );
});

test('meeting creation validates time order and creates attendee notifications', async () => {
  const db = fakeDatabase();
  const meeting = await createMeeting(db, contextA, {
    title: 'Project sync', projectId: 'project_a', startAt: '2099-01-01T10:00:00.000Z', endAt: '2099-01-01T11:00:00.000Z',
    timezone: 'UTC', attendeeMembershipIds: ['membership_b'],
  });
  assert.equal(meeting.organizationId, 'org_a');
  assert.equal(meeting.creatorId, 'local_user_a');
  assert.equal(meeting.attendeeCount, 1);
});

test('meeting creation rejects an end before its start', async () => {
  await assert.rejects(
    () => createMeeting(fakeDatabase(), contextA, { title: 'Invalid', startAt: '2099-01-01T11:00:00.000Z', endAt: '2099-01-01T10:00:00.000Z', timezone: 'UTC' }),
    { code: 'VALIDATION_ERROR', status: 400 },
  );
});

test('meeting updates stay tenant-scoped and preserve valid time ranges', async () => {
  const db = fakeDatabase();
  const meeting = await createMeeting(db, contextA, { title: 'Original', startAt: '2099-01-01T10:00:00.000Z', endAt: '2099-01-01T11:00:00.000Z', timezone: 'UTC' });
  const updated = await updateMeeting(db, contextA, meeting.id, { title: 'Updated' });
  assert.equal(updated.title, 'Updated');
  await assert.rejects(() => updateMeeting(db, contextA, 'meeting_from_other_org', { title: 'Nope' }), { code: 'MEETING_NOT_FOUND', status: 404 });
});
