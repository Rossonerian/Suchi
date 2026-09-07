import test from 'node:test';
import assert from 'node:assert/strict';
import { entitlementsFor, getBillingStatus, applyStripeEvent } from '../saas/billing.js';

test('billing entitlements are data-driven with a safe free-plan fallback', () => {
  assert.equal(entitlementsFor('pro').projects, 50);
  assert.equal(entitlementsFor('unknown').projects, 3);
});

test('billing status is scoped to the authenticated organization', async () => {
  let where;
  const db = {
    userProfile: { findUnique: async () => ({ id: 'user_a' }) },
    organizationMembership: { findUnique: async () => ({ id: 'membership_a', userId: 'user_a' }) },
    subscription: { findUnique: async ({ where: value }) => { where = value; return null; } },
  };
  const status = await getBillingStatus(db, { userId: 'clerk_a', organizationId: 'org_a' });
  assert.equal(status.planKey, 'free');
  assert.equal(status.entitlements.members, 5);
});

test('Stripe subscription events update entitlements and are idempotent', async () => {
  let saved;
  const db = {
    $transaction: async (callback) => callback({
      billingWebhookEvent: {
        create: async () => ({}),
        update: async () => ({}),
      },
      subscription: {
        upsert: async ({ create, update }) => { saved = { id: 'sub_a', ...(create || update) }; return { ...saved, entitlements: [] }; },
      },
    }),
  };
  const result = await applyStripeEvent(db, { id: 'evt_1', type: 'customer.subscription.created', data: { object: { id: 'sub_external', status: 'active', metadata: { organizationId: 'org_a', planKey: 'pro' }, current_period_end: 2_000 } } });
  assert.equal(result.subscription.organizationId, 'org_a');
  assert.equal(saved.planKey, 'pro');

  const duplicateDb = { $transaction: async (callback) => callback({ billingWebhookEvent: { create: async () => { const error = new Error('duplicate'); error.code = 'P2002'; throw error; } } }) };
  assert.deepEqual(await applyStripeEvent(duplicateDb, { id: 'evt_1', type: 'customer.subscription.updated', data: { object: {} } }), { duplicate: true });
});

test('Stripe events without tenant metadata are rejected', async () => {
  const db = { $transaction: async (callback) => callback({ billingWebhookEvent: { create: async () => ({}) } }) };
  await assert.rejects(() => applyStripeEvent(db, { id: 'evt_2', type: 'customer.subscription.updated', data: { object: { id: 'sub' } } }), { code: 'STRIPE_EVENT_INVALID', status: 400 });
});
