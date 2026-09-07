import express from 'express';
import Member from '../models/Member.js';
import Team from '../models/Team.js';
import { parseEmail, parseObjectId, requiredString, ValidationError, AppError } from '../utils/validation.js';
import { requireAuth, requireAdmin, publicMember, revokeAllSessions } from '../utils/auth.js';
import { issueInvitation } from '../utils/invitations.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

function resolveTeam(value) {
  return value && typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
    ? parseObjectId(value, 'team') : requiredString(value, 'team', { max: 100 });
}

async function findTeam(value) {
  const normalized = resolveTeam(value);
  const team = await Team.findOne(/^[a-f\d]{24}$/i.test(normalized) ? { _id: normalized } : { key: normalized });
  if (!team) throw new AppError('Team not found.', 404, 'NOT_FOUND');
  return team;
}

function invitationResponse(token, invitation) {
  const origin = (process.env.FRONTEND_URL || (process.env.CORS_ORIGIN || '').split(',')[0] || '').replace(/\/$/, '');
  const claimPath = `/claim-invite?token=${encodeURIComponent(token)}`;
  return { invitation: { _id: invitation._id, email: invitation.email, expiresAt: invitation.expiresAt }, token, claimPath, invitationUrl: origin ? `${origin}${claimPath}` : claimPath };
}

router.get('/members', async (req, res, next) => {
  try {
    const members = await Member.find().select('name email team role status createdAt updatedAt').populate('team', 'key displayName').sort({ nameLower: 1 }).lean();
    res.json(members);
  } catch (err) { next(err); }
});

router.post('/invites', async (req, res, next) => {
  try {
    const name = requiredString(req.body.name, 'name', { max: 100 });
    const email = parseEmail(req.body.email);
    const role = req.body.role == null || req.body.role === '' ? 'member' : requiredString(req.body.role, 'role', { max: 20 });
    if (!['admin', 'member'].includes(role)) throw new ValidationError('role is invalid.');
    const team = await findTeam(req.body.team);
    const existing = await Member.findOne({ email }).select('_id status');
    if (existing?.status === 'active') throw new AppError('That email already has an active account.', 409, 'MEMBER_ALREADY_ACTIVE');
    if (existing) await Member.updateOne({ _id: existing._id }, { $set: { name, team: team._id, role, status: 'invited' }, $unset: { passwordHash: 1 } });
    const { token, invitation } = await issueInvitation({ name, email, team: team._id, role, createdBy: req.member._id });
    if (existing) await revokeAllSessions(existing._id);
    res.status(201).json(invitationResponse(token, invitation));
  } catch (err) { next(err); }
});

router.post('/members/:id/reset-access', async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id, 'member');
    const member = await Member.findById(id).select('name email team role status');
    if (!member) return res.status(404).json({ error: 'Member not found.', code: 'NOT_FOUND' });
    const email = req.body?.email == null || req.body.email === '' ? member.email : parseEmail(req.body.email);
    if (!email) throw new ValidationError('email is required when migrating a legacy member.');
    const duplicate = await Member.findOne({ email, _id: { $ne: id } }).select('_id');
    if (duplicate) throw new AppError('That email already belongs to another member.', 409, 'MEMBER_EMAIL_CONFLICT');
    const { token, invitation } = await issueInvitation({ name: member.name, email, team: member.team, role: member.role === 'admin' ? 'admin' : 'member', createdBy: req.member._id });
    await Member.updateOne({ _id: id }, { $set: { email, status: 'invited' }, $unset: { passwordHash: 1 } });
    await revokeAllSessions(id);
    res.status(201).json(invitationResponse(token, invitation));
  } catch (err) { next(err); }
});

router.patch('/members/:id', async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id, 'member');
    const member = await Member.findById(id).select('+passwordHash name email team role status');
    if (!member) return res.status(404).json({ error: 'Member not found.', code: 'NOT_FOUND' });
    const updates = {};
    if ('name' in req.body) updates.name = requiredString(req.body.name, 'name', { max: 100 });
    if ('team' in req.body) updates.team = (await findTeam(req.body.team))._id;
    if ('role' in req.body) {
      updates.role = requiredString(req.body.role, 'role', { max: 20 });
      if (!['admin', 'member'].includes(updates.role)) throw new ValidationError('role is invalid.');
    }
    if ('status' in req.body) {
      updates.status = requiredString(req.body.status, 'status', { max: 20 });
      if (!['invited', 'active', 'disabled'].includes(updates.status)) throw new ValidationError('status is invalid.');
    }
    if (!Object.keys(updates).length) throw new ValidationError('Provide at least one member field to update.');
    const resultingRole = updates.role || member.role;
    const resultingStatus = updates.status || member.status;
    if (member.role === 'admin' && member.status === 'active' && (resultingRole !== 'admin' || resultingStatus !== 'active')) {
      const adminCount = await Member.countDocuments({ role: 'admin', status: 'active' });
      if (adminCount <= 1) throw new AppError('Keep at least one active administrator.', 400, 'LAST_ADMIN');
    }
    Object.assign(member, updates);
    await member.save();
    if ('team' in updates || 'role' in updates || 'status' in updates) await revokeAllSessions(id);
    res.json({ member: publicMember(await member.populate('team')) });
  } catch (err) { next(err); }
});

router.post('/members/:id/revoke-sessions', async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id, 'member');
    if (!await Member.exists({ _id: id })) return res.status(404).json({ error: 'Member not found.', code: 'NOT_FOUND' });
    await revokeAllSessions(id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
