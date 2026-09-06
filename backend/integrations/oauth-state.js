const crypto = require('node:crypto');

function signingKey(secret = process.env.INTEGRATION_STATE_SECRET) {
  if (!secret) {
    const error = new Error('INTEGRATION_STATE_SECRET is required.');
    error.code = 'OAUTH_STATE_INVALID';
    throw error;
  }
  return Buffer.from(secret, 'utf8');
}

function createOAuthState({ organizationId, userId }, secret, ttlMs = 10 * 60 * 1000) {
  if (!organizationId || !userId) throw new Error('OAuth state context is incomplete.');
  const payload = Buffer.from(JSON.stringify({ organizationId, userId, exp: Date.now() + ttlMs }), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', signingKey(secret)).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyOAuthState(token, secret) {
  try {
    const [payload, signature] = String(token).split('.');
    const expected = crypto.createHmac('sha256', signingKey(secret)).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (!payload || !signature || supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw new Error('signature');
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!value.organizationId || !value.userId || !Number.isFinite(value.exp) || value.exp <= Date.now()) throw new Error('expired');
    return { organizationId: value.organizationId, userId: value.userId };
  } catch (error) {
    if (error.code === 'OAUTH_STATE_INVALID') throw error;
    const wrapped = new Error('OAuth state is invalid or expired.');
    wrapped.code = 'OAUTH_STATE_INVALID';
    throw wrapped;
  }
}

module.exports = { createOAuthState, verifyOAuthState };
