// Single responsibility: read-only endpoints for team + progress data.
import express from 'express';
import Team from '../models/Team.js';
import Task from '../models/Task.js';
import Member from '../models/Member.js';
import { computeProgress } from '../utils/progress.js';

const router = express.Router();

// GET /api/teams - every team with its members and task progress
router.get('/', async (req, res, next) => {
  try {
    const teams = await Team.find().sort({ key: 1 }).lean();
    const ids = teams.map((team) => team._id);
    const [members, tasks] = await Promise.all([
      // Only active accounts are actionable assignees/attendees. Pending or
      // disabled records remain visible to administrators, not the workboard.
      Member.find({ team: { $in: ids }, status: 'active' }).select('name role team status').lean(),
      Task.find({ team: { $in: ids } }).select('status team').lean(),
    ]);
    const membersByTeam = new Map(ids.map((id) => [String(id), []]));
    const tasksByTeam = new Map(ids.map((id) => [String(id), []]));
    members.forEach((member) => membersByTeam.get(String(member.team))?.push(member));
    tasks.forEach((task) => tasksByTeam.get(String(task.team))?.push(task));
    const enriched = teams.map((team) => ({
      ...team,
      members: membersByTeam.get(String(team._id)) || [],
      progress: computeProgress(tasksByTeam.get(String(team._id)) || []),
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

export default router;
