const express = require('express');
const { requireClerkOrganization } = require('../utils/clerk');
const { getSaasDatabase } = require('../saas/database');
const { listNotifications, markNotificationRead } = require('../saas/notifications');
const { searchWorkspace } = require('../saas/search');
const { listComments, createComment } = require('../saas/comments');

const router = express.Router();
router.use(requireClerkOrganization);

router.get('/notifications', async (req, res, next) => {
  try { return res.json({ notifications: await listNotifications(getSaasDatabase(), req.organizationContext, req.query) }); } catch (error) { return next(error); }
});

router.post('/notifications/:notificationId/read', async (req, res, next) => {
  try { return res.json({ notification: await markNotificationRead(getSaasDatabase(), req.organizationContext, req.params.notificationId) }); } catch (error) { return next(error); }
});

router.get('/search', async (req, res, next) => {
  try { return res.json(await searchWorkspace(getSaasDatabase(), req.organizationContext, req.query)); } catch (error) { return next(error); }
});

router.get('/tasks/:taskId/comments', async (req, res, next) => {
  try { return res.json({ comments: await listComments(getSaasDatabase(), req.organizationContext, req.params.taskId) }); } catch (error) { return next(error); }
});

router.post('/tasks/:taskId/comments', async (req, res, next) => {
  try { return res.status(201).json({ comment: await createComment(getSaasDatabase(), req.organizationContext, req.params.taskId, req.body) }); } catch (error) { return next(error); }
});

module.exports = router;
