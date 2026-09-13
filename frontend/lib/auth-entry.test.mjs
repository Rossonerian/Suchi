import test from 'node:test';
import assert from 'node:assert/strict';
import { authErrorMessage, validEmail } from './auth-entry.mjs';

test('auth entry validates email and maps Better Auth errors without leaking internals', () => {
  assert.equal(validEmail('person@example.com'), true);
  assert.equal(validEmail('not-an-email'), false);
  assert.equal(authErrorMessage({ name: 'BetterAuthError', status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' }, 'signin'), 'The email or password is incorrect.');
  assert.equal(authErrorMessage({ name: 'BetterAuthError', status: 500, code: 'DB_FAILURE', message: 'secret db details' }, 'signin'), 'We could not complete that request. Please try again.');
  assert.equal(authErrorMessage({ name: 'BetterAuthError', status: 0, code: 'NETWORK_ERROR' }, 'signin'), 'Suchi is unavailable right now. Check your connection and try again.');
});
