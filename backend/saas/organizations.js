import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';

const organizationInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(3).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

async function listOrganizations(db, userContext) {
  if (!userContext?.userId) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
  const user = await db.userProfile.findUnique({
    where: { id: userContext.userId },
    include: { memberships: { include: { organization: true } } },
  });
  return user?.memberships.map((membership) => ({
    ...membership.organization,
    role: membership.role,
  })) || [];
}

async function provisionOrganization(dbOrAuth, userContextOrHeaders, input) {
  const parsed = parseSchema(organizationInput, input, 'Organization input is invalid.');
  if (dbOrAuth?.api?.createOrganization) {
    return dbOrAuth.api.createOrganization({ headers: userContextOrHeaders, body: parsed });
  }
  const db = dbOrAuth;
  const userContext = userContextOrHeaders;
  if (!userContext?.userId) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');

  const existing = await db.organization.findUnique({
    where: { slug: parsed.slug },
  });
  if (existing) {
    throw new AppError('An organization with this slug already exists.', 409, 'SLUG_CONFLICT');
  }

  const org = await db.organization.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      settings: {
        create: {
          timezone: 'UTC',
          weekStartsOn: 1,
        },
      },
      memberships: {
        create: {
          userId: userContext.userId,
          role: 'owner',
        },
      },
    },
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: 'owner',
  };
}

export { organizationInput, listOrganizations, provisionOrganization };
