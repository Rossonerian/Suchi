import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { ValidationError } from './validation.js';

const scrypt = promisify(crypto.scrypt);
const MIN_PASSWORD_LENGTH = 10;
// A deliberately moderate interactive profile for a small-team service. The
// encoded parameters travel with each hash so future tuning remains readable.
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

function assertPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > 256) throw new ValidationError('password must be 256 characters or fewer.');
}

async function hashPassword(password) {
  assertPassword(password);
  const salt = crypto.randomBytes(16);
  const digest = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt:${SCRYPT_OPTIONS.N}:${SCRYPT_OPTIONS.r}:${SCRYPT_OPTIONS.p}:${salt.toString('base64url')}:${digest.toString('base64url')}`;
}

async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const parts = encoded.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltText, digestText] = parts;
  const N = Number(n); const R = Number(r); const P = Number(p);
  if (![N, R, P].every(Number.isInteger) || N < 1024 || R < 1 || P < 1) return false;
  let salt; let expected;
  try {
    salt = Buffer.from(saltText, 'base64url');
    expected = Buffer.from(digestText, 'base64url');
    if (!salt.length || !expected.length) return false;
    const actual = await scrypt(password, salt, expected.length, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export { MIN_PASSWORD_LENGTH, assertPassword, hashPassword, verifyPassword };
