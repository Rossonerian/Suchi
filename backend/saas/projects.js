import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';
import { assertPermission } from './authorization.js';

const createProjectInput = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(10_000).optional().default(''),
  teamId: z.string().trim().min(1).nullable().optional().default(null),
  startDate: z.coerce.date().nullable().optional().default(null),
  targetDate: z.coerce.date().nullable().optional().default(null),
}).strict();

const updateProjectInput = createProjectInput.partial().strict();

function projectSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'project';
}

async function resolveMembership(db, context) {
  if (!context?.userId || !context.organizationId) {
    throw new AppError('An authenticated organization context is required.', 401, 'UNAUTHENTICATED');
  }
  const user = await db.userProfile.findUnique({ where: { id: context.userId } });
  if (!user) throw new AppError('Organization membership is not provisioned.', 403, 'FORBIDDEN');
  const membership = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId: context.organizationId, userId: user.id } },
  });
  if (!membership) throw new AppError('You are not a member of this organization.', 403, 'FORBIDDEN');
  return { user, membership };
}

async function listProjects(db, context) {
  await resolveMembership(db, context);
  return db.project.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { updatedAt: 'desc' },
  });
}

async function getProject(db, context, projectId) {
  await resolveMembership(db, context);
  return db.project.findFirst({ where: { id: projectId, organizationId: context.organizationId }, include: { members: true, milestones: true, tasks: true } });
}

async function createProject(db, context, input) {
  const { user, membership } = await resolveMembership(db, context);
  await assertPermission(db, context, 'project:create');
  const parsed = parseSchema(createProjectInput, input, 'Project input is invalid.');
  if (parsed.teamId) {
    const team = await db.team.findFirst({ where: { id: parsed.teamId, organizationId: context.organizationId } });
    if (!team) throw new AppError('Team not found in this organization.', 404, 'TEAM_NOT_FOUND');
  }

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        organizationId: context.organizationId,
        teamId: parsed.teamId,
        name: parsed.name,
        slug: parsed.slug || projectSlug(parsed.name),
        description: parsed.description,
        ownerId: user.id,
        startDate: parsed.startDate,
        targetDate: parsed.targetDate,
      },
    });
    const ownerMembership = await tx.projectMember.create({
      data: { projectId: project.id, membershipId: membership.id, role: 'owner' },
    });
    return { ...project, members: [ownerMembership] };
  });
}

async function updateProject(db, context, projectId, input) {
  const existing = await getProject(db, context, projectId);
  if (!existing) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
  await assertPermission(db, context, 'project:update', projectId);
  const parsed = parseSchema(updateProjectInput, input, 'Project input is invalid.');
  if (parsed.teamId) {
    const team = await db.team.findFirst({ where: { id: parsed.teamId, organizationId: context.organizationId } });
    if (!team) throw new AppError('Team not found in this organization.', 404, 'TEAM_NOT_FOUND');
  }
  return db.project.update({ where: { id: projectId }, data: parsed });
}

async function deleteProject(db, context, projectId) {
  const existing = await getProject(db, context, projectId);
  if (!existing) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
  await assertPermission(db, context, 'project:delete', projectId);
  await db.project.delete({ where: { id: projectId } });
  return null;
}

export { createProjectInput, updateProjectInput, projectSlug, resolveMembership, listProjects, getProject, createProject, updateProject, deleteProject };
