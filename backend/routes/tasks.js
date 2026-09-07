// Single responsibility: CRUD for tasks.
import express from 'express';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import Member from '../models/Member.js';
import { STATUSES } from '../models/Task.js';
import { requiredString, optionalString, parseObjectId, optionalObjectId, parseDate, ValidationError } from '../utils/validation.js';
import { MODULES } from '../constants/modules.js';
import { assertOwnTeam } from '../utils/auth.js';

const router = express.Router();

// GET /api/tasks?team=<teamId>&status=<status>
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.team) filter.team = parseObjectId(req.query.team, 'team');
    if (req.query.assignee) filter.assignee = parseObjectId(req.query.assignee, 'assignee');
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) throw new ValidationError('status is invalid.');
      filter.status = req.query.status;
    }

    const tasks = await Task.find(filter)
      .populate('assignee', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/seed-modules — idempotently seed the AirMouse modules.
router.post('/seed-modules', async (req, res, next) => {
  try {
    const team = await Team.findOne({ key: 'core-technical' });
    if (!team) return res.status(404).json({ error: 'core-technical team not found.' });
    let created = 0;
    let skipped = 0;
    for (const module of MODULES) {
      const existing = await Task.findOne({ team: team._id, subProblemRef: module.id });
      if (existing) { skipped += 1; continue; }
      await Task.create({ title: `SP-${String(module.id).padStart(2, '0')}: ${module.title}`, description: module.desc, team: team._id, status: 'todo', subProblemRef: module.id });
      created += 1;
    }
    res.json({ created, skipped });
  } catch (err) { next(err); }
});

// POST /api/tasks  { title, description, team, assignee, subProblemRef, dueDate }
router.post('/', async (req, res, next) => {
  try {
    const title = requiredString(req.body.title, 'title', { max: 240 });
    const team = parseObjectId(req.body.team, 'team');
    const assignee = optionalObjectId(req.body.assignee, 'assignee');
    const description = optionalString(req.body.description, 'description');
    const dueDate = req.body.dueDate ? parseDate(req.body.dueDate, 'dueDate') : null;
    const subProblemRef = req.body.subProblemRef == null || req.body.subProblemRef === '' ? null : Number(req.body.subProblemRef);
    if (subProblemRef != null && (!Number.isInteger(subProblemRef) || subProblemRef < 1 || subProblemRef > 15)) throw new ValidationError('subProblemRef must be between 1 and 15.');
    assertOwnTeam(req.member, team);
    const [teamDoc, assigneeDoc] = await Promise.all([
      Team.exists({ _id: team }), assignee ? Member.findById(assignee).select('team status').lean() : null,
    ]);
    if (!teamDoc) return res.status(404).json({ error: 'Team not found.', code: 'NOT_FOUND' });
    if (assignee && !assigneeDoc) return res.status(404).json({ error: 'Assignee not found.', code: 'NOT_FOUND' });
    if (assigneeDoc && assigneeDoc.status !== 'active') throw new ValidationError('Assignee must have an active account.');
    if (assigneeDoc && String(assigneeDoc.team) !== team) throw new ValidationError('Assignee must belong to the task team.');

    const task = await Task.create({
      title,
      description,
      team,
      assignee, subProblemRef, dueDate, createdBy: req.member._id,
    });
    await task.populate([{ path: 'assignee', select: 'name' }, { path: 'createdBy', select: 'name' }]);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id  { status?, assignee?, title?, description?, dueDate? }
router.patch('/:id', async (req, res, next) => {
  try {
    parseObjectId(req.params.id, 'task');
    const allowed = ['status', 'assignee', 'title', 'description', 'dueDate', 'subProblemRef', 'highlighted'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Provide at least one task field to update.');
    if ('title' in updates) updates.title = requiredString(updates.title, 'title', { max: 240 });
    if ('description' in updates) updates.description = optionalString(updates.description, 'description');
    if ('dueDate' in updates) updates.dueDate = updates.dueDate ? parseDate(updates.dueDate, 'dueDate') : null;
    if ('subProblemRef' in updates) {
      updates.subProblemRef = updates.subProblemRef == null || updates.subProblemRef === '' ? null : Number(updates.subProblemRef);
      if (updates.subProblemRef != null && (!Number.isInteger(updates.subProblemRef) || updates.subProblemRef < 1 || updates.subProblemRef > 15)) throw new ValidationError('subProblemRef must be between 1 and 15.');
    }
    if ('status' in updates && !STATUSES.includes(updates.status)) throw new ValidationError('status is invalid.');
    const current = await Task.findById(req.params.id).select('team');
    if (!current) return res.status(404).json({ error: 'Task not found.', code: 'NOT_FOUND' });
    assertOwnTeam(req.member, current.team);
    if ('assignee' in updates) {
      updates.assignee = optionalObjectId(updates.assignee, 'assignee');
      if (updates.assignee) {
        const assignee = await Member.findById(updates.assignee).select('team status').lean();
        if (!assignee) return res.status(404).json({ error: 'Assignee not found.', code: 'NOT_FOUND' });
        if (assignee.status !== 'active') throw new ValidationError('Assignee must have an active account.');
        if (String(assignee.team) !== String(current.team)) throw new ValidationError('Assignee must belong to the task team.');
      }
    }
    const task = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate([{ path: 'assignee', select: 'name' }, { path: 'createdBy', select: 'name' }]);

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    parseObjectId(req.params.id, 'task');
    const task = await Task.findById(req.params.id).select('team');
    if (!task) return res.status(404).json({ error: 'Task not found.', code: 'NOT_FOUND' });
    assertOwnTeam(req.member, task.team);
    await Task.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
