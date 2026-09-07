import express from 'express';
import { serve } from 'inngest/express';
import { inngest, functions } from '../jobs/inngest.js';

const router = express.Router();

router.use((req, res, next) => {
  if (!process.env.INNGEST_SIGNING_KEY && !process.env.INNGEST_EVENT_KEY) {
    return res.status(503).json({ error: 'Background jobs are not configured.', code: 'JOBS_UNAVAILABLE' });
  }
  return serve({ client: inngest, functions })(req, res, next);
});

export default router;
