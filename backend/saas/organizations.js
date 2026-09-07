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

async function provisionOrganization(auth, headers, input) {
  const parsed = parseSchema(organizationInput, input, 'Organization input is invalid.');
  return auth.api.createOrganization({ headers, body: parsed });
}

export { organizationInput, listOrganizations, provisionOrganization };
