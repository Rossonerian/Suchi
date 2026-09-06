const express = require('express');
const { requireClerkOrganization } = require('../utils/clerk');
const { getSaasDatabase } = require('../saas/database');
const { listProjects, getProject, createProject, updateProject, deleteProject } = require('../saas/projects');
const { listTasks, getTask, createTask, updateTask, deleteTask } = require('../saas/tasks');
const { listMeetings, createMeeting, updateMeeting, cancelMeeting } = require('../saas/meetings');

const router = express.Router();
router.use(requireClerkOrganization);

router.get('/projects', async (req, res, next) => {
  try {
    const projects = await listProjects(getSaasDatabase(), req.organizationContext);
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.get('/projects/:projectId', async (req, res, next) => {
  try {
    const project = await getProject(getSaasDatabase(), req.organizationContext, req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.', code: 'PROJECT_NOT_FOUND' });
    return res.json({ project });
  } catch (error) {
    return next(error);
  }
});

router.post('/projects', async (req, res, next) => {
  try {
    const project = await createProject(getSaasDatabase(), req.organizationContext, req.body);
    return res.status(201).json({ project });
  } catch (error) {
    return next(error);
  }
});

router.patch('/projects/:projectId', async (req, res, next) => {
  try {
    const project = await updateProject(getSaasDatabase(), req.organizationContext, req.params.projectId, req.body);
    return res.json({ project });
  } catch (error) {
    return next(error);
  }
});

router.delete('/projects/:projectId', async (req, res, next) => {
  try {
    await deleteProject(getSaasDatabase(), req.organizationContext, req.params.projectId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await listTasks(getSaasDatabase(), req.organizationContext, {
      projectId: req.query.projectId,
      status: req.query.status,
      priority: req.query.priority,
      assigneeMembershipId: req.query.assigneeMembershipId,
    });
    return res.json({ tasks });
  } catch (error) {
    return next(error);
  }
});

router.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const task = await getTask(getSaasDatabase(), req.organizationContext, req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found.', code: 'TASK_NOT_FOUND' });
    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

router.post('/tasks', async (req, res, next) => {
  try {
    const task = await createTask(getSaasDatabase(), req.organizationContext, req.body);
    return res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
});

router.patch('/tasks/:taskId', async (req, res, next) => {
  try {
    const task = await updateTask(getSaasDatabase(), req.organizationContext, req.params.taskId, req.body);
    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

router.delete('/tasks/:taskId', async (req, res, next) => {
  try {
    await deleteTask(getSaasDatabase(), req.organizationContext, req.params.taskId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get('/meetings', async (req, res, next) => {
  try {
    const meetings = await listMeetings(getSaasDatabase(), req.organizationContext, { from: req.query.from, to: req.query.to });
    return res.json({ meetings });
  } catch (error) {
    return next(error);
  }
});

router.post('/meetings', async (req, res, next) => {
  try {
    const meeting = await createMeeting(getSaasDatabase(), req.organizationContext, req.body);
    return res.status(201).json({ meeting });
  } catch (error) {
    return next(error);
  }
});

router.post('/meetings/:meetingId/cancel', async (req, res, next) => {
  try {
    const meeting = await cancelMeeting(getSaasDatabase(), req.organizationContext, req.params.meetingId);
    return res.json({ meeting });
  } catch (error) {
    return next(error);
  }
});

router.patch('/meetings/:meetingId', async (req, res, next) => {
  try {
    const meeting = await updateMeeting(getSaasDatabase(), req.organizationContext, req.params.meetingId, req.body);
    return res.json({ meeting });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
