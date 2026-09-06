const { z } = require('zod');
const { AppError, parseSchema } = require('../utils/validation');

const createProjectInput = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(10_000).optional().default(''),
  teamId: z.string().trim().min(1).nullable().optional().default(null),
  startDate: z.coerce.date().nullable().optional().default(null),
  targetDate: z.coerce.date().nullable().optional().default(null),
}).strict();

async function resolveMembership(db, context) {
  if (!context?.userId || !context.organizationId) {
    throw new AppError('An authenticated organization context is required.', 401, 'UNAUTHENTICATED');
  }
  const user = await db.userProfile.findUnique({ where: { clerkUserId: context.userId } });
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
  return db.project.findFirst({ where: { id: projectId, organizationId: context.organizationId } });
}

async function createProject(db, context, input) {
  const { user, membership } = await resolveMembership(db, context);
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

module.exports = { createProjectInput, resolveMembership, listProjects, getProject, createProject };
