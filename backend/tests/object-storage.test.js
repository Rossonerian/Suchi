import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpload, completeUpload, createDownload, safeFileName } from '../integrations/object-storage.js';

const context = { userId: 'clerk_a', organizationId: 'org_a', organizationRole: 'member' };
const originalStorage = { bucket: process.env.S3_BUCKET, key: process.env.S3_ACCESS_KEY_ID, secret: process.env.S3_SECRET_ACCESS_KEY };

test.before(() => { process.env.S3_BUCKET = 'private-test'; process.env.S3_ACCESS_KEY_ID = 'access'; process.env.S3_SECRET_ACCESS_KEY = 'secret'; });
test.after(() => { for (const [key, value] of [['S3_BUCKET', originalStorage.bucket], ['S3_ACCESS_KEY_ID', originalStorage.key], ['S3_SECRET_ACCESS_KEY', originalStorage.secret]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

function dbForAttachment() {
  const attachment = { id: 'attachment_a', organizationId: 'org_a', taskId: 'task_a', objectKey: 'org_a/tasks/task_a/object', fileName: 'plan.pdf', contentType: 'application/pdf', byteSize: 10, status: 'pending' };
  return {
    userProfile: { findUnique: async () => ({ id: 'user_a' }) },
    organizationMembership: { findUnique: async () => ({ id: 'membership_a', userId: 'user_a' }) },
    task: { findFirst: async ({ where }) => where.organizationId === 'org_a' ? { id: where.id } : null },
    attachment: {
      create: async ({ data }) => Object.assign(attachment, data),
      findFirst: async ({ where }) => where.organizationId === 'org_a' && where.id === attachment.id && where.status === attachment.status ? attachment : null,
      update: async ({ data }) => Object.assign(attachment, data),
    },
  };
}

test('attachment uploads use tenant-prefixed keys and signed URLs', async () => {
  let command;
  const result = await createUpload({ db: dbForAttachment(), context, taskId: 'task_a', input: { fileName: '../plan final.pdf', contentType: 'application/pdf', byteSize: 10 }, s3Client: {}, signUrl: async (_client, value, options) => { command = value; assert.equal(options.expiresIn, 900); return 'https://signed-upload.example'; } });
  assert.match(result.uploadUrl, /^https:\/\/signed-upload/);
  assert.match(command.input.Key, /^org_a\/tasks\/task_a\//);
  assert.equal(command.input.ContentType, 'application/pdf');
  assert.equal(safeFileName('../plan final.pdf'), 'plan-final.pdf');
});

test('attachment completion and download remain organization-scoped', async () => {
  const db = dbForAttachment();
  const completed = await completeUpload({ db, context, attachmentId: 'attachment_a', s3Client: { send: async () => ({}) } });
  assert.equal(completed.status, 'uploaded');
  const result = await createDownload({ db, context, attachmentId: 'attachment_a', s3Client: {}, signUrl: async (_client, command, options) => { assert.equal(command.input.ResponseContentType, 'application/pdf'); assert.equal(options.expiresIn, 600); return 'https://signed-download.example'; } });
  assert.equal(result.downloadUrl, 'https://signed-download.example');
  await assert.rejects(() => createDownload({ db, context: { ...context, organizationId: 'org_b' }, attachmentId: 'attachment_a', s3Client: {}, signUrl: async () => 'nope' }), { code: 'ATTACHMENT_NOT_FOUND', status: 404 });
});

test('attachment completion does not mark an object uploaded before storage confirms it exists', async () => {
  const db = dbForAttachment();
  await assert.rejects(
    () => completeUpload({ db, context, attachmentId: 'attachment_a', s3Client: { send: async () => { throw new Error('not found'); } } }),
    { code: 'ATTACHMENT_UPLOAD_INCOMPLETE', status: 409 },
  );
  assert.equal(db.attachment ? (await db.attachment.findFirst({ where: { id: 'attachment_a', organizationId: 'org_a', status: 'pending' } })).status : undefined, 'pending');
});

test('unsupported attachment types fail before a signed URL is issued', async () => {
  await assert.rejects(() => createUpload({ db: dbForAttachment(), context, taskId: 'task_a', input: { fileName: 'script.js', contentType: 'application/javascript', byteSize: 10 }, s3Client: {}, signUrl: async () => 'should-not-run' }), { code: 'ATTACHMENT_TYPE_INVALID', status: 400 });
});
