import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';
import { resolveMembership } from './projects.js';
import { assertPermission } from './authorization.js';

const taskStatus = z.enum(['backlog', 'todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled']);
const taskPriority = z.enum(['none', 'low', 'medium', 'high', 'urgent']);
const createTaskInput = z.object({
  projectId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).optional().default(''),
  status: taskStatus.optional().default('todo'),
  priority: taskPriority.optional().default('none'),
  startAt: z.coerce.date().nullable().optional().default(null),
  dueAt: z.coerce.date().nullable().optional().default(null),
  milestoneId: z.string().trim().min(1).nullable().optional().default(null),
  recurringRule: z.string().trim().max(500).nullable().optional().default(null),
  assigneeIds: z.array(z.string().trim().min(1)).max(50).optional().default([]),
}).strict();
const updateTaskInput = createTaskInput.omit({ projectId: true }).partial().strict();

function taskNotFound() {
  return new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
}

async function resolveAssignees(db, organizationId, ids) {
  const uniqueIds = [...new Set(ids || [])];
  if (!uniqueIds.length) return [];
  const memberships = await db.organizationMembership.findMany({
    where: { organizationId, id: { in: uniqueIds } },
  });
  if (memberships.length !== uniqueIds.length) {
    throw new AppError('One or more assignees are not members of this organization.', 400, 'ASSIGNEE_INVALID');
  }
  return memberships;
}

async function listTasks(db, context, filters = {}) {
  await resolveMembership(db, context);
  const where = { organizationId: context.organizationId };
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.status) where.status = parseSchema(taskStatus, filters.status, 'Task status filter is invalid.');
  if (filters.priority) where.priority = parseSchema(taskPriority, filters.priority, 'Task priority filter is invalid.');
  if (filters.assigneeMembershipId) {
    where.assignees = { some: { membershipId: filters.assigneeMembershipId } };
  }
  return db.task.findMany({ where, orderBy: { dueAt: 'asc' } });
}

async function getTask(db, context, taskId) {
  await resolveMembership(db, context);
  return db.task.findFirst({ where: { id: taskId, organizationId: context.organizationId } });
}

async function createTask(db, context, input) {
  const { user } = await resolveMembership(db, context);
  const parsed = parseSchema(createTaskInput, input, 'Task input is invalid.');
  await assertPermission(db, context, 'task:create', parsed.projectId);
  const project = await db.project.findFirst({ where: { id: parsed.projectId, organizationId: context.organizationId } });
  if (!project) throw new AppError('Project not found in this organization.', 404, 'PROJECT_NOT_FOUND');
  if (parsed.milestoneId) {
    const milestone = await db.milestone.findFirst({ where: { id: parsed.milestoneId, projectId: parsed.projectId } });
    if (!milestone) throw new AppError('Milestone not found in this project.', 404, 'MILESTONE_NOT_FOUND');
  }
  const assignees = await resolveAssignees(db, context.organizationId, parsed.assigneeIds);
  return db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        organizationId: context.organizationId,
        projectId: parsed.projectId,
        milestoneId: parsed.milestoneId,
        creatorId: user.id,
        title: parsed.title,
        description: parsed.description,
        status: parsed.status,
        priority: parsed.priority,
        startAt: parsed.startAt,
        dueAt: parsed.dueAt,
        recurringRule: parsed.recurringRule,
      },
    });
    if (assignees.length) {
      await tx.taskAssignee.createMany({ data: assignees.map((membership) => ({ taskId: task.id, membershipId: membership.id })) });
    }
    return { ...task, assigneeCount: assignees.length };
  });
}

async function updateTask(db, context, taskId, input) {
  await resolveMembership(db, context);
  const existing = await db.task.findFirst({ where: { id: taskId, organizationId: context.organizationId } });
  if (!existing) throw taskNotFound();
  const parsed = parseSchema(updateTaskInput, input, 'Task input is invalid.');
  await assertPermission(db, context, 'task:update', existing.projectId);
  const { assigneeIds, ...data } = parsed;
  if (data.status === 'done') data.completedAt = new Date();
  if (data.status && data.status !== 'done') data.completedAt = null;
  if (data.milestoneId) {
    const milestone = await db.milestone.findFirst({ where: { id: data.milestoneId, projectId: existing.projectId } });
    if (!milestone) throw new AppError('Milestone not found in this project.', 404, 'MILESTONE_NOT_FOUND');
  }
  if (assigneeIds !== undefined) await assertPermission(db, context, 'task:assign', existing.projectId);
  const assignees = assigneeIds === undefined ? null : await resolveAssignees(db, context.organizationId, assigneeIds);
  return db.$transaction(async (tx) => {
    const task = Object.keys(data).length ? await tx.task.update({ where: { id: taskId }, data }) : existing;
    if (assignees) {
      await tx.taskAssignee.deleteMany({ where: { taskId } });
      if (assignees.length) await tx.taskAssignee.createMany({ data: assignees.map((membership) => ({ taskId, membershipId: membership.id })) });
    }
    return { ...task, assigneeCount: assignees ? assignees.length : undefined };
  });
}

async function deleteTask(db, context, taskId) {
  await resolveMembership(db, context);
  const existing = await db.task.findFirst({ where: { id: taskId, organizationId: context.organizationId } });
  if (!existing) throw taskNotFound();
  await assertPermission(db, context, 'task:delete', existing.projectId);
  await db.task.delete({ where: { id: taskId } });
  return null;
}

export { createTaskInput, updateTaskInput, listTasks, getTask, createTask, updateTask, deleteTask };
