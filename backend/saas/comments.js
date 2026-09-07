import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';
import { resolveMembership } from './projects.js';

const commentInput = z.object({ body: z.string().trim().min(1).max(20_000) }).strict();

async function ensureTask(db, context, taskId) {
  const task = await db.task.findFirst({ where: { id: taskId, organizationId: context.organizationId } });
  if (!task) throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
  return task;
}

async function listComments(db, context, taskId) {
  await resolveMembership(db, context);
  await ensureTask(db, context, taskId);
  return db.comment.findMany({ where: { organizationId: context.organizationId, taskId }, orderBy: { createdAt: 'asc' } });
}

async function createComment(db, context, taskId, input) {
  const { user } = await resolveMembership(db, context);
  await ensureTask(db, context, taskId);
  const parsed = parseSchema(commentInput, input, 'Comment input is invalid.');
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data: { organizationId: context.organizationId, taskId, authorId: user.id, body: parsed.body } });
    if (tx.activityEvent?.create) await tx.activityEvent.create({ data: { organizationId: context.organizationId, actorId: user.id, action: 'comment.created', resourceType: 'task', resourceId: taskId, metadata: { commentId: comment.id } } });
    return comment;
  });
}

export { commentInput, listComments, createComment };
