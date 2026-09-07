import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfirmationToken, verifyConfirmationToken } from '../ai/confirmation.js';

test('AI confirmation tokens are short-lived and tamper resistant', () => {
  const token = createConfirmationToken({ operation: 'create_task', organizationId: 'org_a' }, { secret: 'test-secret', now: 1_000_000, ttlSeconds: 60 });
  assert.deepEqual(verifyConfirmationToken(token, { secret: 'test-secret', now: 1_000_010 }), { operation: 'create_task', organizationId: 'org_a', exp: 1_060 });
  assert.throws(() => verifyConfirmationToken(`${token}tampered`, { secret: 'test-secret', now: 1_000_010 }), { code: 'AI_CONFIRMATION_INVALID' });
  assert.throws(() => verifyConfirmationToken(token, { secret: 'test-secret', now: 1_060_000 }), { code: 'AI_CONFIRMATION_EXPIRED' });
});
