const express = require('express');
const { clerkClient } = require('@clerk/express');
const { requireClerkUser, requireClerkOrganization } = require('../utils/clerk');
const { getSaasDatabase } = require('../saas/database');
const { listOrganizations, provisionOrganization } = require('../saas/organizations');
const { listOrganizationMembers, inviteOrganizationMember } = require('../saas/members');

const router = express.Router();
router.use(requireClerkUser);

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
      clerkClient,
      req.userContext,
      req.body,
    );
    return res.status(201).json({ organization });
  } catch (error) {
    return next(error);
  }
});

router.get('/members', requireClerkOrganization, async (req, res, next) => {
  try { return res.json({ members: await listOrganizationMembers(clerkClient, req.organizationContext) }); } catch (error) { return next(error); }
});

router.post('/members/invitations', requireClerkOrganization, async (req, res, next) => {
  try { return res.status(201).json({ invitation: await inviteOrganizationMember(clerkClient, req.organizationContext, req.body) }); } catch (error) { return next(error); }
});

module.exports = router;
