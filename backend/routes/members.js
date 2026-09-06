// Single responsibility: list members (used to populate assignee pickers)
// and let a member update their own profile email. Role/access changes belong
// to the administrator route so a profile request cannot escalate privileges.
const express = require('express');
const Member = require('../models/Member');
const { parseObjectId, parseEmail, AppError, ValidationError } = require('../utils/validation');

const router = express.Router();

// GET /api/members?team=<teamId>
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.team) filter.team = parseObjectId(req.query.team, 'team');

    const members = await Member.find(filter).select('name role team status').lean();
    res.json(members);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/members/:id  { email?, role? }
router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id, 'member');
    if (String(req.member._id) !== String(id)) {
      throw new AppError('You can only update your own profile.', 403, 'FORBIDDEN');
    }
    if ('role' in req.body) {
      throw new AppError('Role changes require administrator access.', 403, 'FORBIDDEN');
    }
    if (!('email' in req.body)) throw new ValidationError('Provide an email to update.');

    const email = parseEmail(req.body.email);
    const duplicate = await Member.findOne({ email, _id: { $ne: id } }).select('_id');
    if (duplicate) throw new AppError('That email already belongs to another member.', 409, 'MEMBER_EMAIL_CONFLICT');
    const member = await Member.findByIdAndUpdate(id, { $set: { email } }, {
      new: true,
      runValidators: true,
    }).populate('team');

    if (!member) return res.status(404).json({ error: 'Member not found.', code: 'NOT_FOUND' });
    res.json(member);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
