import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';
import { resolveMembership } from './projects.js';

const searchInput = z.object({ q: z.string().trim().min(2).max(100), limit: z.coerce.number().int().min(1).max(25).optional().default(10) }).strict();

async function searchWorkspace(db, context, input) {
  await resolveMembership(db, context);
  const parsed = parseSchema(searchInput, input, 'Search query is invalid.');
  const contains = { contains: parsed.q, mode: 'insensitive' };
  const [projects, tasks, meetings, members] = await Promise.all([
    db.project.findMany({ where: { organizationId: context.organizationId, OR: [{ name: contains }, { description: contains }] }, orderBy: { updatedAt: 'desc' }, take: parsed.limit }),
    db.task.findMany({ where: { organizationId: context.organizationId, OR: [{ title: contains }, { description: contains }] }, orderBy: { updatedAt: 'desc' }, take: parsed.limit }),
    db.meeting.findMany({ where: { organizationId: context.organizationId, OR: [{ title: contains }, { description: contains }] }, orderBy: { startAt: 'desc' }, take: parsed.limit }),
    db.organizationMembership.findMany({ where: { organizationId: context.organizationId, user: { OR: [{ displayName: contains }, { email: contains }] } }, include: { user: true }, take: parsed.limit }),
  ]);
  return {
    projects: projects.map(({ id, name, description, status }) => ({ id, name, description: description || '', status: status || null })),
    tasks: tasks.map(({ id, projectId, title, status, priority, dueAt }) => ({ id, projectId, title, status, priority, dueAt })),
    meetings: meetings.map(({ id, title, startAt, endAt, status }) => ({ id, title, startAt, endAt, status: status || 'scheduled' })),
    members: members.map((membership) => ({ id: membership.id, role: membership.role, displayName: membership.user?.displayName || '', email: membership.user?.email || '' })),
  };
}

export { searchInput, searchWorkspace };
