const test = require('node:test');
const assert = require('node:assert/strict');
const { organizationContextFromClerkAuth } = require('../utils/clerk');

test('Clerk claims become an explicit organization context', () => {
  assert.deepEqual(
    organizationContextFromClerkAuth({ userId: 'user_123', orgId: 'org_123', orgRole: 'org:admin' }),
    { userId: 'user_123', organizationId: 'org_123', organizationRole: 'admin' },
  );
});

test('organization context rejects missing tenant selection', () => {
  assert.throws(
    () => organizationContextFromClerkAuth({ userId: 'user_123', orgId: null, orgRole: null }),
    { code: 'ORGANIZATION_REQUIRED', status: 400 },
  );
});

test('organization context rejects unsupported Clerk roles', () => {
  assert.throws(
    () => organizationContextFromClerkAuth({ userId: 'user_123', orgId: 'org_123', orgRole: 'org:unknown' }),
    { code: 'INVALID_ORGANIZATION_ROLE', status: 403 },
  );
});
