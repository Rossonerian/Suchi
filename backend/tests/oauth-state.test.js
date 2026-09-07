import test from 'node:test';
import assert from 'node:assert/strict';
import { createOAuthState, verifyOAuthState } from '../integrations/oauth-state.js';

const secret = 'state-secret-for-tests';

test('OAuth state signs organization context and verifies expiry', () => {
  const token = createOAuthState({ organizationId: 'org_a', userId: 'user_a' }, secret, 60_000);
  assert.deepEqual(verifyOAuthState(token, secret), { organizationId: 'org_a', userId: 'user_a' });
});

test('OAuth state rejects tampering and expired state', () => {
  const token = createOAuthState({ organizationId: 'org_a', userId: 'user_a' }, secret, -1);
  assert.throws(() => verifyOAuthState(token, secret), { code: 'OAUTH_STATE_INVALID' });
  const valid = createOAuthState({ organizationId: 'org_a', userId: 'user_a' }, secret);
  assert.throws(() => verifyOAuthState(`${valid}tampered`, secret), { code: 'OAUTH_STATE_INVALID' });
});
