import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRuntimeSeedPlan,
  isLoopbackDatabaseUrl,
  validateRuntimeSeedConfig,
} from '../scripts/seed-saas-runtime.js';

const ids = {
  userA: 'user_a_real_clerk_id',
  userB: 'user_b_real_clerk_id',
  alpha: 'org_alpha_real_clerk_id',
  beta: 'org_beta_real_clerk_id',
};

function validEnv(overrides = {}) {
  return {
    SAAS_RUNTIME_SEED: '1',
    DATABASE_URL: 'postgresql://nidar_dev:password@127.0.0.1:55432/nidar_saas',
    SAAS_RUNTIME_USER_A_CLERK_ID: ids.userA,
    SAAS_RUNTIME_USER_B_CLERK_ID: ids.userB,
    SAAS_RUNTIME_ALPHA_ORG_CLERK_ID: ids.alpha,
    SAAS_RUNTIME_BETA_ORG_CLERK_ID: ids.beta,
    ...overrides,
  };
}

test('runtime seed requires explicit opt-in and all real Clerk identifiers', () => {
  assert.throws(() => validateRuntimeSeedConfig({}), /SAAS_RUNTIME_SEED=1/);
  assert.throws(() => validateRuntimeSeedConfig(validEnv({ SAAS_RUNTIME_USER_A_CLERK_ID: '' })), /SAAS_RUNTIME_USER_A_CLERK_ID/);
  assert.deepEqual(validateRuntimeSeedConfig(validEnv()).clerk, ids);
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
  assert.equal(plan.tasks.filter((item) => item.organizationKey === 'beta').length, 1);
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-overdue').status, 'todo');
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-blocked').status, 'blocked');
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-completed').status, 'done');
  assert.equal(plan.meetings.length, 2);
  assert.equal(plan.notifications.length, 2);
  assert.equal(plan.meetings[0].timezone, 'Asia/Kolkata');
  assert.equal(plan.tasks.find((item) => item.key === 'alpha-today').dueAt.toISOString(), '2026-09-07T17:00:00.000Z');
  assert.notEqual(plan.projects.find((item) => item.key === 'alpha-operations').organizationKey, plan.projects.find((item) => item.key === 'beta-operations').organizationKey);
});
