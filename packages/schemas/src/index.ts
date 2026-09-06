import { z } from 'zod';

export const organizationSlugSchema = z.string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.');

export const taskStatusSchema = z.enum(['backlog', 'todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled']);
export const taskPrioritySchema = z.enum(['none', 'low', 'medium', 'high', 'urgent']);
export const organizationRoleSchema = z.enum(['owner', 'admin', 'member']);
export const projectRoleSchema = z.enum(['owner', 'manager', 'member', 'viewer']);

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: organizationSlugSchema,
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(10_000).optional().default(''),
  ownerId: z.string().min(1),
  teamId: z.string().min(1).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).optional().default(''),
  projectId: z.string().min(1),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('none'),
  dueAt: z.coerce.date().nullable().optional(),
  assigneeIds: z.array(z.string().min(1)).max(50).default([]),
});

export const organizationContextSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  organizationRole: organizationRoleSchema,
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type ProjectRole = z.infer<typeof projectRoleSchema>;
export type OrganizationContext = z.infer<typeof organizationContextSchema>;
