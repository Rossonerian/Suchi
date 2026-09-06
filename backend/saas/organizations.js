const { z } = require('zod');
const { AppError, parseSchema } = require('../utils/validation');

const organizationInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(3).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

async function listOrganizations(db, userContext) {
  if (!userContext?.userId) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
  const user = await db.userProfile.findUnique({
    where: { clerkUserId: userContext.userId },
    include: { memberships: { include: { organization: true } } },
  });
  return user?.memberships.map((membership) => ({
    ...membership.organization,
    role: membership.role,
  })) || [];
}

async function provisionOrganization(db, identityProvider, userContext, input) {
  if (!userContext?.userId) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
  const parsed = parseSchema(organizationInput, input, 'Organization input is invalid.');
  const profile = identityProvider.getUser ? await identityProvider.getUser(userContext.userId) : null;
  const displayName = profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || userContext.userId;
  const email = profile?.email || null;
  const externalOrganization = await identityProvider.createOrganization({
    name: parsed.name,
    slug: parsed.slug,
    createdBy: userContext.userId,
  });

  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.userProfile.upsert({
        where: { clerkUserId: userContext.userId },
        create: { clerkUserId: userContext.userId, displayName, email },
        update: { displayName, email },
      });
      return tx.organization.create({
        data: {
          clerkOrgId: externalOrganization.id,
          name: parsed.name,
          slug: parsed.slug,
          settings: { create: {} },
          memberships: { create: { userId: user.id, role: 'owner' } },
        },
        include: { settings: true, memberships: true },
      });
    });
  } catch (error) {
    // Avoid leaving an orphaned Clerk organization if local persistence fails.
    if (identityProvider.deleteOrganization) {
      await identityProvider.deleteOrganization(externalOrganization.id).catch(() => undefined);
    }
    throw error;
  }
}

module.exports = { organizationInput, listOrganizations, provisionOrganization };
