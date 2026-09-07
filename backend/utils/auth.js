import crypto from 'node:crypto';
import Session from '../models/Session.js';
import { AppError } from './validation.js';

const SESSION_COOKIE = 'nidar_session';
const SESSION_TTL_MS = Math.max(60 * 60 * 1000, Number(process.env.SESSION_TTL_HOURS || 168) * 60 * 60 * 1000);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions() {
  const sameSite = (process.env.SESSION_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: ['strict', 'lax', 'none'].includes(sameSite) ? sameSite : 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

function parseCookies(header) {
  return String(header || '').split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    if (key) {
      const value = part.slice(separator + 1).trim();
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        // Malformed cookie values are untrusted input, not server errors.
        cookies[key] = '';
      }
    }
    return cookies;
  }, {});
}

function publicMember(member) {
  if (!member) return null;
  return {
    _id: member._id,
    name: member.name,
    email: member.email,
    team: member.team,
    role: member.role || 'member',
    status: member.status || 'invited',
  };
}

async function issueSession(res, member) {
  // Rotate any existing session on login/claim to limit session fixation.
  const cookies = parseCookies(res.req?.headers?.cookie);
  if (cookies[SESSION_COOKIE]) await Session.deleteOne({ tokenHash: hashToken(cookies[SESSION_COOKIE]) });
  const token = crypto.randomBytes(32).toString('base64url');
  await Session.create({ tokenHash: hashToken(token), member: member._id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

async function requireAuth(req, res, next) {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token || token.length > 200) throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
    const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } })
      .populate({ path: 'member', select: '+passwordHash name email team role status', populate: { path: 'team' } });
    if (!session || !session.member || session.member.status === 'disabled' || session.member.status !== 'active' || !session.member.passwordHash) {
      if (session) await Session.deleteOne({ _id: session._id });
      throw new AppError('Authentication required.', 401, 'UNAUTHENTICATED');
    }
    req.member = session.member;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.member || req.member.status !== 'active') {
    return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
  }
  if (req.member.role !== 'admin') return next(new AppError('Administrator access required.', 403, 'FORBIDDEN'));
  return next();
}

async function revokeAllSessions(memberId) {
  return Session.deleteMany({ member: memberId });
}

async function revokeSession(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
}

function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

function requireSameOrigin(allowedOrigins) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: 'Request origin is not allowed.', code: 'CSRF_REJECTED' });
    }
    return next();
  };
}

function assertOwnTeam(member, teamId) {
  if (!member || String(member.team?._id || member.team) !== String(teamId)) {
    throw new AppError('You can only change resources for your own team.', 403, 'FORBIDDEN');
  }
}

export {
  SESSION_COOKIE,
  hashToken,
  parseCookies,
  publicMember,
  issueSession,
  requireAuth,
  requireAdmin,
  revokeSession,
  revokeAllSessions,
  clearSession,
  requireSameOrigin,
  assertOwnTeam,
};
