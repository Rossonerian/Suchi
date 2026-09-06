const express = require('express');
const { requireClerkOrganization } = require('../utils/clerk');
const { getSaasDatabase } = require('../saas/database');
const { listProjects, getProject, createProject } = require('../saas/projects');

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

module.exports = router;
