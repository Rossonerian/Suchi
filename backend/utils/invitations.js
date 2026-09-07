import crypto from 'node:crypto';
import Invitation from '../models/Invitation.js';
import Member from '../models/Member.js';
import { hashToken, revokeAllSessions } from './auth.js';

const INVITATION_TTL_DAYS = 7;

function createInvitationToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

async function issueInvitation({ name, email, team, role = 'member', createdBy, expiresAt }) {
  const { token, tokenHash } = createInvitationToken();
  const expiry = expiresAt || new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await Invitation.updateMany({ email, usedAt: null }, { $set: { usedAt: new Date() } });
  const invitation = await Invitation.create({ name, email, team, role, tokenHash, expiresAt: expiry, createdBy });
  return { token, invitation };
}

async function claimInvitation(token, passwordHash) {
  const invitation = await Invitation.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).populate('team', 'key displayName');
  if (!invitation) return null;

  let member = await Member.findOne({ email: invitation.email }).select('+passwordHash');
  if (member) {
    member.name = invitation.name;
    member.team = invitation.team._id;
    member.role = invitation.role;
    member.passwordHash = passwordHash;
    member.status = 'active';
    await member.save();
  } else {
    member = await Member.create({
      name: invitation.name,
      email: invitation.email,
      team: invitation.team._id,
      role: invitation.role,
      passwordHash: passwordHash,
      status: 'active',
    });
  }
  await revokeAllSessions(member._id);
  return { invitation, member };
}

export { INVITATION_TTL_DAYS, createInvitationToken, issueInvitation, claimInvitation };
