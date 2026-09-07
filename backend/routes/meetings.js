// Single responsibility: create/list meetings, and email invitees on creation.
import express from 'express';
import Meeting from '../models/Meeting.js';
import Member from '../models/Member.js';
import { deliverMeetingInvite, populatedMeetingResponse } from '../services/meetingNotifications.js';
import { requiredString, optionalString, normalizeHttpUrl, parseFutureDate, parseObjectId, ValidationError } from '../utils/validation.js';
import { AppError } from '../utils/validation.js';

const router = express.Router();

// GET /api/meetings — upcoming + past meetings, most recent first
router.get('/', async (req, res, next) => {
  try {
    const meetings = await Meeting.find()
      .populate('invitees', 'name')
      .populate('organizer', 'name')
      .sort({ scheduledAt: -1 })
      .lean();
    res.json(meetings);
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings  { title, agenda, meetLink, scheduledAt, inviteeIds }
// Meeting persistence completes before notification delivery is attempted.
router.post('/', async (req, res, next) => {
  try {
    const title = requiredString(req.body.title, 'title', { max: 240 });
    const agenda = optionalString(req.body.agenda, 'agenda');
    const meetLink = normalizeHttpUrl(req.body.meetLink, 'meetLink');
    const scheduledAt = parseFutureDate(req.body.scheduledAt);
    if (!Array.isArray(req.body.inviteeIds) || req.body.inviteeIds.length === 0) throw new ValidationError('At least one invitee is required.');
    const inviteeIds = [...new Set(req.body.inviteeIds.map((id) => parseObjectId(id, 'inviteeId')))];

    const invitees = await Member.find({ _id: { $in: inviteeIds } });
    if (invitees.length !== inviteeIds.length) return res.status(404).json({ error: 'One or more invitees were not found.', code: 'NOT_FOUND' });
    if (invitees.some((invitee) => invitee.status !== 'active')) throw new ValidationError('All invitees must have active accounts.');
    const meeting = await Meeting.create({
      title,
      agenda,
      meetLink: meetLink || '',
      scheduledAt,
      invitees: invitees.map((m) => m._id),
      organizer: req.member._id,
    });
    await deliverMeetingInvite(meeting);
    res.status(201).json(await populatedMeetingResponse(meeting));
  } catch (err) {
    next(err);
  }
});

// Retry delivery for the meeting's organizer. A sent notification is
// idempotent; retrying it returns the existing meeting without sending again.
router.post('/:id/notifications/retry', async (req, res, next) => {
  try {
    parseObjectId(req.params.id, 'meeting');
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.', code: 'NOT_FOUND' });
    if (!meeting.organizer || String(meeting.organizer) !== String(req.member._id)) {
      throw new AppError('Only the meeting organizer can retry its notification.', 403, 'FORBIDDEN');
    }
    if (meeting.emailStatus === 'sent') return res.json(await populatedMeetingResponse(meeting));
    await deliverMeetingInvite(meeting);
    res.json(await populatedMeetingResponse(meeting));
  } catch (err) {
    next(err);
  }
});

export default router;
