const express = require('express');
const { clerkClient } = require('@clerk/express');
const { requireClerkUser } = require('../utils/clerk');
const { getSaasDatabase } = require('../saas/database');
const { listOrganizations, provisionOrganization } = require('../saas/organizations');

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

module.exports = router;
