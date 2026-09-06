const express = require('express');
const { requireClerkOrganization } = require('../utils/clerk');
const { getSaasDatabase } = require('../saas/database');
const { askAi, confirmAiWrite } = require('../saas/ai');

const router = express.Router();
router.use(requireClerkOrganization);

router.post('/ask', async (req, res, next) => {
  try {
    const result = await askAi({ db: getSaasDatabase(), context: req.organizationContext, input: req.body });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post('/confirm', async (req, res, next) => {
  try {
    const result = await confirmAiWrite({ db: getSaasDatabase(), context: req.organizationContext, input: req.body });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
