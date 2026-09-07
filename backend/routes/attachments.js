import express from 'express';
import { requireOrganization } from '../saas/auth-context.js';
import { getSaasDatabase } from '../saas/database.js';
import { createUpload, completeUpload, createDownload } from '../integrations/object-storage.js';

const router = express.Router();
router.use(requireOrganization);

router.post('/tasks/:taskId/attachments/upload', async (req, res, next) => {
  try { return res.status(201).json(await createUpload({ db: getSaasDatabase(), context: req.organizationContext, taskId: req.params.taskId, input: req.body })); } catch (error) { return next(error); }
});

router.post('/attachments/:attachmentId/complete', async (req, res, next) => {
  try { return res.json({ attachment: await completeUpload({ db: getSaasDatabase(), context: req.organizationContext, attachmentId: req.params.attachmentId }) }); } catch (error) { return next(error); }
});

router.get('/attachments/:attachmentId/download', async (req, res, next) => {
  try { return res.json(await createDownload({ db: getSaasDatabase(), context: req.organizationContext, attachmentId: req.params.attachmentId })); } catch (error) { return next(error); }
});

export default router;
