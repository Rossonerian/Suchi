const express = require('express');
const { requireClerkOrganization } = require('../utils/clerk');
const { getSaasDatabase } = require('../saas/database');
const { createUpload, completeUpload, createDownload } = require('../integrations/object-storage');

const router = express.Router();
router.use(requireClerkOrganization);

router.post('/tasks/:taskId/attachments/upload', async (req, res, next) => {
  try { return res.status(201).json(await createUpload({ db: getSaasDatabase(), context: req.organizationContext, taskId: req.params.taskId, input: req.body })); } catch (error) { return next(error); }
});

router.post('/attachments/:attachmentId/complete', async (req, res, next) => {
  try { return res.json({ attachment: await completeUpload({ db: getSaasDatabase(), context: req.organizationContext, attachmentId: req.params.attachmentId }) }); } catch (error) { return next(error); }
});

router.get('/attachments/:attachmentId/download', async (req, res, next) => {
  try { return res.json(await createDownload({ db: getSaasDatabase(), context: req.organizationContext, attachmentId: req.params.attachmentId })); } catch (error) { return next(error); }
});

module.exports = router;
