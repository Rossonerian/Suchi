import express from 'express';
import { requireOrganization } from '../saas/auth-context.js';
import { getSaasDatabase } from '../saas/database.js';
import { askAi, confirmAiWrite } from '../saas/ai.js';

const router = express.Router();
router.use(requireOrganization);

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

export default router;
