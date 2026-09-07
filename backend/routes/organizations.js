import express from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuth } from '../saas/auth.js';
import { requireAuthenticatedUser, requireOrganization } from '../saas/auth-context.js';
import { getSaasDatabase } from '../saas/database.js';
import { listOrganizations, provisionOrganization } from '../saas/organizations.js';
import { listOrganizationMembers, inviteOrganizationMember } from '../saas/members.js';

const router = express.Router();
router.use(requireAuthenticatedUser);

router.get('/', async (req, res, next) => {
  try {
    const organizations = await listOrganizations(getSaasDatabase(), req.userContext);
    return res.json({ organizations });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const organization = await provisionOrganization(
      getAuth(),
      fromNodeHeaders(req.headers),
      req.body,
    );
    return res.status(201).json({ organization });
  } catch (error) {
    return next(error);
  }
});

router.get('/members', requireOrganization, async (req, res, next) => {
  try { return res.json({ members: await listOrganizationMembers(getSaasDatabase(), req.organizationContext) }); } catch (error) { return next(error); }
});

router.post('/members/invitations', requireOrganization, async (req, res, next) => {
  try { return res.status(201).json({ invitation: await inviteOrganizationMember(getAuth(), req.organizationContext, req.body, fromNodeHeaders(req.headers)) }); } catch (error) { return next(error); }
});

export default router;
