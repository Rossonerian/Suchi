import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';
import { resolveMembership } from '../saas/projects.js';

const MAX_BYTES = 25 * 1024 * 1024;
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv']);
const uploadInput = z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(120), byteSize: z.coerce.number().int().min(1).max(MAX_BYTES) }).strict();

function storageConfig() {
  const { S3_BUCKET: bucket, S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
  if (!bucket || !accessKeyId || !secretAccessKey) throw new AppError('Private object storage is not configured.', 503, 'STORAGE_UNAVAILABLE');
  return { bucket, region: process.env.S3_REGION || 'auto', endpoint: process.env.S3_ENDPOINT, accessKeyId, secretAccessKey };
}

function safeFileName(fileName) {
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 180);
  return base || 'attachment';
}

function createStorageClient(config) {
  return new S3Client({ region: config.region, endpoint: config.endpoint, forcePathStyle: Boolean(config.endpoint), credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
}

async function createUpload({ db, context, taskId, input, s3Client = null, signUrl = getSignedUrl }) {
  const { user } = await resolveMembership(db, context);
  const task = await db.task.findFirst({ where: { id: taskId, organizationId: context.organizationId } });
  if (!task) throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
  const parsed = parseSchema(uploadInput, input, 'Attachment input is invalid.');
  if (!allowedTypes.has(parsed.contentType)) throw new AppError('This file type is not allowed.', 400, 'ATTACHMENT_TYPE_INVALID');
  const config = storageConfig();
  const objectKey = `${context.organizationId}/tasks/${taskId}/${crypto.randomUUID()}-${safeFileName(parsed.fileName)}`;
  const attachment = await db.attachment.create({ data: { organizationId: context.organizationId, taskId, objectKey, fileName: safeFileName(parsed.fileName), contentType: parsed.contentType, byteSize: parsed.byteSize, status: 'pending' } });
  const command = new PutObjectCommand({ Bucket: config.bucket, Key: objectKey, ContentType: parsed.contentType, ContentLength: parsed.byteSize, Metadata: { organization: context.organizationId, task: taskId, attachment: attachment.id, uploader: user.id } });
  const uploadUrl = await signUrl(s3Client || createStorageClient(config), command, { expiresIn: 15 * 60 });
  return { attachment: { id: attachment.id, fileName: attachment.fileName, contentType: attachment.contentType, byteSize: attachment.byteSize, status: attachment.status }, uploadUrl, expiresIn: 15 * 60 };
}

async function createDownload({ db, context, attachmentId, s3Client = null, signUrl = getSignedUrl }) {
  await resolveMembership(db, context);
  const attachment = await db.attachment.findFirst({ where: { id: attachmentId, organizationId: context.organizationId, status: 'uploaded' } });
  if (!attachment) throw new AppError('Attachment not found.', 404, 'ATTACHMENT_NOT_FOUND');
  const config = storageConfig();
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: attachment.objectKey, ResponseContentType: attachment.contentType, ResponseContentDisposition: `attachment; filename="${attachment.fileName.replace(/"/g, '')}"` });
  const downloadUrl = await signUrl(s3Client || createStorageClient(config), command, { expiresIn: 10 * 60 });
  return { downloadUrl, expiresIn: 10 * 60 };
}

async function completeUpload({ db, context, attachmentId, s3Client = null }) {
  await resolveMembership(db, context);
  const attachment = await db.attachment.findFirst({ where: { id: attachmentId, organizationId: context.organizationId, status: 'pending' } });
  if (!attachment) throw new AppError('Attachment not found.', 404, 'ATTACHMENT_NOT_FOUND');
  const config = storageConfig();
  try {
    await (s3Client || createStorageClient(config)).send(new HeadObjectCommand({ Bucket: config.bucket, Key: attachment.objectKey }));
  } catch {
    throw new AppError('The upload has not completed.', 409, 'ATTACHMENT_UPLOAD_INCOMPLETE');
  }
  return db.attachment.update({ where: { id: attachment.id }, data: { status: 'uploaded', uploadedAt: new Date() } });
}

export { MAX_BYTES, allowedTypes, uploadInput, storageConfig, safeFileName, createUpload, completeUpload, createDownload };
