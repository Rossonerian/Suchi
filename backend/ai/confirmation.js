import crypto from 'node:crypto';
import { AppError } from '../utils/validation.js';

function getSecret(explicitSecret) {
  const secret = explicitSecret || process.env.AI_CONFIRMATION_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new AppError('AI confirmations are not configured.', 503, 'AI_CONFIRMATION_UNAVAILABLE');
  return secret;
}

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function createConfirmationToken(payload, { secret, ttlSeconds = 10 * 60, now = Date.now() } = {}) {
  const body = { ...payload, exp: Math.floor(now / 1000) + ttlSeconds };
  const encodedPayload = encode(JSON.stringify(body));
  return `${encodedPayload}.${sign(encodedPayload, getSecret(secret))}`;
}

function verifyConfirmationToken(token, { secret, now = Date.now() } = {}) {
  if (typeof token !== 'string') throw new AppError('AI confirmation is invalid or expired.', 400, 'AI_CONFIRMATION_INVALID');
  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) throw new AppError('AI confirmation is invalid or expired.', 400, 'AI_CONFIRMATION_INVALID');
  const expectedSignature = sign(encodedPayload, getSecret(secret));
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new AppError('AI confirmation is invalid or expired.', 400, 'AI_CONFIRMATION_INVALID');
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new AppError('AI confirmation is invalid or expired.', 400, 'AI_CONFIRMATION_INVALID');
  }
  if (!payload.exp || payload.exp <= Math.floor(now / 1000)) {
    throw new AppError('AI confirmation is invalid or expired.', 400, 'AI_CONFIRMATION_EXPIRED');
  }
  return payload;
}

export { createConfirmationToken, verifyConfirmationToken };
