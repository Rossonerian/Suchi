const express = require('express');
const { serve } = require('inngest/express');
const { inngest, functions } = require('../jobs/inngest');

const router = express.Router();

router.use((req, res, next) => {
  if (!process.env.INNGEST_SIGNING_KEY && !process.env.INNGEST_EVENT_KEY) {
    return res.status(503).json({ error: 'Background jobs are not configured.', code: 'JOBS_UNAVAILABLE' });
  }
  return serve({ client: inngest, functions })(req, res, next);
});

module.exports = router;
