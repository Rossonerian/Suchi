// Single responsibility: CRUD for team plan/progress entries.
import express from 'express';
import Plan from '../models/Plan.js';
import { PHASES } from '../constants/phases.js';
import Team from '../models/Team.js';
import Member from '../models/Member.js';
import { requiredString, optionalString, normalizeHttpUrl, parseDate, parseObjectId, optionalObjectId, ValidationError } from '../utils/validation.js';
import { assertOwnTeam } from '../utils/auth.js';

const router = express.Router();

// GET /api/plans?team=<teamId>&phase=<phase>
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.team) filter.team = parseObjectId(req.query.team, 'team');
    if (req.query.phase) {
      if (!PHASES.includes(req.query.phase)) throw new ValidationError('phase is invalid.');
      filter.phase = req.query.phase;
    }

    const plans = await Plan.find(filter)
      .populate('createdBy', 'name')
      .populate('team', 'displayName')
      .sort({ forDate: -1 })
      .lean();

    res.json(plans);
  } catch (err) {
    next(err);
  }
});

// GET /api/plans/phases — the fixed list of phases, for the frontend dropdown
router.get('/phases', (req, res) => {
  res.json(PHASES);
});

// POST /api/plans  { team, title, content, fileUrl, phase, forDate }
router.post('/', async (req, res, next) => {
  try {
    const team = parseObjectId(req.body.team, 'team');
    const title = requiredString(req.body.title, 'title', { max: 240 });
    const content = optionalString(req.body.content, 'content');
    const fileUrl = normalizeHttpUrl(req.body.fileUrl, 'fileUrl');
    const phase = req.body.phase || 'simulation';
    const forDate = parseDate(req.body.forDate, 'forDate');
    if (!PHASES.includes(phase)) throw new ValidationError('phase is invalid.');
    assertOwnTeam(req.member, team);
    const teamDoc = await Team.exists({ _id: team });
    if (!teamDoc) return res.status(404).json({ error: 'Team not found.', code: 'NOT_FOUND' });

    const plan = await Plan.create({
      team,
      title,
      content, fileUrl, phase,
      forDate,
      createdBy: req.member._id,
    });

    const populated = await plan.populate([
      { path: 'createdBy', select: 'name' },
      { path: 'team', select: 'displayName' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/plans/:id
router.delete('/:id', async (req, res, next) => {
  try {
    parseObjectId(req.params.id, 'plan');
    const plan = await Plan.findById(req.params.id).select('team');
    if (!plan) return res.status(404).json({ error: 'Plan not found.', code: 'NOT_FOUND' });
    assertOwnTeam(req.member, plan.team);
    await Plan.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
