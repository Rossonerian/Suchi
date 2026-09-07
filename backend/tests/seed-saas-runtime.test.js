import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRuntimeSeedPlan,
  isLoopbackDatabaseUrl,
  validateRuntimeSeedConfig,
} from '../scripts/seed-saas-runtime.js';

function validEnv(overrides = {}) {
  return {
    SAAS_RUNTIME_SEED: '1',
    DATABASE_URL: 'postgresql://nidar_dev:password@127.0.0.1:55432/nidar_saas',
    NODE_ENV: 'test',
    AUTH_EMAIL_PASSWORD_ENABLED: '1',
    SAAS_RUNTIME_PASSWORD: 'test-only-password-for-fixtures',
    ...overrides,
  };
}

test('runtime seed requires explicit opt-in, non-production, and a supplied fixture password', () => {
  assert.throws(() => validateRuntimeSeedConfig({}), /SAAS_RUNTIME_SEED=1/);
  assert.throws(() => validateRuntimeSeedConfig(validEnv({ SAAS_RUNTIME_PASSWORD: '' })), /SAAS_RUNTIME_PASSWORD/);
  assert.throws(() => validateRuntimeSeedConfig(validEnv({ NODE_ENV: 'production' })), /production/);
  assert.equal(validateRuntimeSeedConfig(validEnv()).password, 'test-only-password-for-fixtures');
});

test('runtime seed accepts loopback database URLs only', () => {
  assert.equal(isLoopbackDatabaseUrl('postgresql://user:pass@127.0.0.1:55432/db'), true);
  assert.equal(isLoopbackDatabaseUrl('postgresql://user:pass@localhost:5432/db'), true);
  assert.equal(isLoopbackDatabaseUrl('postgresql://user:pass@[::1]:5432/db'), true);
  assert.equal(isLoopbackDatabaseUrl('postgresql://user:pass@10.0.0.5:5432/db'), false);
  assert.throws(() => validateRuntimeSeedConfig(validEnv({ DATABASE_URL: 'postgresql://user:pass@db.example.com/prod' })), /loopback/);
});

test('runtime seed plan is tenant-separated, representative, and deterministic', () => {
  const plan = buildRuntimeSeedPlan(validateRuntimeSeedConfig(validEnv()), new Date('2026-09-07T12:00:00.000Z'));
  assert.deepEqual(plan.organizations.map((item) => item.slug), ['alpha-runtime', 'beta-runtime']);
  assert.equal(plan.users.length, 2);
  assert.equal(plan.memberships.filter((item) => item.organizationKey === 'alpha').length, 1);
  assert.equal(plan.memberships.filter((item) => item.organizationKey === 'beta').length, 2);
  assert.equal(plan.projects.filter((item) => item.organizationKey === 'alpha').length, 2);
  assert.equal(plan.projects.filter((item) => item.organizationKey === 'beta').length, 1);
  assert.equal(plan.tasks.filter((item) => item.organizationKey === 'alpha').length, 6);
  assert.equal(plan.tasks.filter((item) => item.organizationKey === 'beta').length, 2);
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-overdue').status, 'todo');
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-blocked').status, 'blocked');
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-completed').status, 'done');
  assert.equal(plan.meetings.length, 2);
  assert.equal(plan.notifications.length, 2);
  assert.equal(plan.meetings[0].timezone, 'Asia/Kolkata');
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-today').dueAt.toISOString(), '2026-09-07T17:00:00.000Z');
  assert.notEqual(plan.projects.find((item) => item.key === 'alpha-operations').organizationKey, plan.projects.find((item) => item.key === 'beta-operations').organizationKey);
});
