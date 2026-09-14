import express from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuth } from '../saas/auth.js';
import { requireAuthenticatedUser, requireOrganization } from '../saas/auth-context.js';
import { getSaasDatabase } from '../saas/database.js';
import { listOrganizations, provisionOrganization } from '../saas/organizations.js';
import { listOrganizationMembers, inviteOrganizationMember } from '../saas/members.js';
import { AppError } from '../utils/validation.js';
import { createJoinCode, joinOrganizationByCode, revokeJoinCode, rotateJoinCode } from '../saas/join-codes.js';

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
      getSaasDatabase(),
      req.userContext,
      req.body,
    );
    return res.status(201).json({ organization });
  } catch (error) {
    return next(error);
  }
});

router.post('/join', async (req, res, next) => {
  try {
    const result = await joinOrganizationByCode(getSaasDatabase(), req.userContext, req.body);
    if (req.authContext?.sessionId) {
      await getSaasDatabase().authSession.update({ where: { id: req.authContext.sessionId }, data: { activeOrganizationId: result.organization.id } });
    }
    return res.json(result);
  } catch (error) { return next(error); }
});

router.post('/join-codes', requireOrganization, async (req, res, next) => {
  try { return res.status(201).json(await createJoinCode(getSaasDatabase(), req.organizationContext, req.body)); }
  catch (error) { return next(error); }
});

router.post('/join-codes/rotate', requireOrganization, async (req, res, next) => {
  try { return res.status(201).json(await rotateJoinCode(getSaasDatabase(), req.organizationContext, req.body)); }
  catch (error) { return next(error); }
});

router.delete('/join-codes/:id', requireOrganization, async (req, res, next) => {
  try { await revokeJoinCode(getSaasDatabase(), req.organizationContext, req.params.id); return res.status(204).end(); }
  catch (error) { return next(error); }
});

router.post('/active', async (req, res, next) => {
  try {
    const { organizationId } = req.body;
    if (!organizationId) throw new AppError('Organization ID is required.', 400, 'ORGANIZATION_REQUIRED');
    const db = getSaasDatabase();
    const org = await db.organization.findFirst({
      where: { OR: [{ id: organizationId }, { slug: organizationId }] },
    });
    if (!org) throw new AppError('Workspace not found.', 404, 'NOT_FOUND');
    const membership = await db.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId: req.userContext.userId } },
    });
    if (!membership) throw new AppError('You are not a member of this workspace.', 403, 'FORBIDDEN');
    if (req.authContext?.sessionId) {
      await db.authSession.update({
        where: { id: req.authContext.sessionId },
        data: { activeOrganizationId: org.id },
      });
    }
    return res.json({ ok: true, activeOrganizationId: org.id, organization: org });
  } catch (error) {
    return next(error);
  }
});

router.get('/members', requireOrganization, async (req, res, next) => {
  try {
    return res.json({ members: await listOrganizationMembers(getSaasDatabase(), req.organizationContext) });
  } catch (error) {
    return next(error);
  }
});

router.post('/members/invitations', requireOrganization, async (req, res, next) => {
  try {
    return res.status(201).json({
      invitation: await inviteOrganizationMember(
        getSaasDatabase(),
        req.organizationContext,
        req.body,
        fromNodeHeaders(req.headers),
      ),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
