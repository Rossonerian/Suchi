const { AppError } = require('../utils/validation');
const { resolveMembership } = require('./projects');

const PLAN_ENTITLEMENTS = {
  free: { members: 5, projects: 3, ai_requests_month: 25, storage_bytes: 100 * 1024 * 1024 },
  pro: { members: 25, projects: 50, ai_requests_month: 2_000, storage_bytes: 10 * 1024 * 1024 * 1024 },
  business: { members: 250, projects: 500, ai_requests_month: 20_000, storage_bytes: 100 * 1024 * 1024 * 1024 },
};

function entitlementsFor(planKey) {
  return PLAN_ENTITLEMENTS[planKey] || PLAN_ENTITLEMENTS.free;
}

async function getBillingStatus(db, context) {
  await resolveMembership(db, context);
  const subscription = await db.subscription.findUnique({ where: { organizationId: context.organizationId }, include: { entitlements: true } });
  const planKey = subscription?.planKey || 'free';
  const defaults = entitlementsFor(planKey);
  const entitlements = Object.fromEntries(Object.entries(defaults).map(([key, value]) => {
    const stored = subscription?.entitlements?.find((item) => item.key === key)?.value;
    if (stored === undefined) return [key, value];
    const numeric = Number(stored);
    return [key, Number.isFinite(numeric) ? numeric : stored];
  }));
  return { planKey, status: subscription?.status || 'inactive', currentPeriodEnd: subscription?.currentPeriodEnd || null, entitlements };
}

function stripePeriodEnd(subscription) {
  const timestamp = subscription?.current_period_end;
  return Number.isFinite(timestamp) ? new Date(timestamp * 1000) : null;
}

function stripePlanKey(subscription) {
  const metadataKey = subscription?.metadata?.planKey;
  if (metadataKey && PLAN_ENTITLEMENTS[metadataKey]) return metadataKey;
  const lookupKey = subscription?.items?.data?.[0]?.price?.lookup_key;
  return PLAN_ENTITLEMENTS[lookupKey] ? lookupKey : 'free';
}

async function applyStripeEvent(db, event) {
  if (!event?.id || !event.type) throw new AppError('Stripe event is invalid.', 400, 'STRIPE_EVENT_INVALID');
  if (!db.$transaction) throw new AppError('Billing storage is unavailable.', 503, 'BILLING_UNAVAILABLE');
  return db.$transaction(async (tx) => {
    try {
      await tx.billingWebhookEvent.create({ data: { provider: 'stripe', eventId: event.id } });
    } catch (error) {
      if (error?.code === 'P2002') return { duplicate: true };
      throw error;
    }
    const subscription = event.data?.object;
    if (!['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      await tx.billingWebhookEvent.update({ where: { provider_eventId: { provider: 'stripe', eventId: event.id } }, data: { processedAt: new Date() } });
      return { ignored: true };
    }
    const organizationId = subscription?.metadata?.organizationId;
    if (!organizationId) throw new AppError('Stripe subscription is missing an organization.', 400, 'STRIPE_EVENT_INVALID');
    const status = event.type.endsWith('.deleted') ? 'cancelled' : String(subscription.status || 'active');
    const planKey = stripePlanKey(subscription);
    const saved = await tx.subscription.upsert({
      where: { organizationId },
      create: { organizationId, provider: 'stripe', externalId: subscription.id, status, planKey, currentPeriodEnd: stripePeriodEnd(subscription), entitlements: { create: Object.entries(entitlementsFor(planKey)).map(([key, value]) => ({ key, value: String(value) })) } },
      update: { externalId: subscription.id, status, planKey, currentPeriodEnd: stripePeriodEnd(subscription) },
      include: { entitlements: true },
    });
    if (tx.subscriptionEntitlement?.upsert) {
      for (const [key, value] of Object.entries(entitlementsFor(planKey))) {
        await tx.subscriptionEntitlement.upsert({ where: { subscriptionId_key: { subscriptionId: saved.id, key } }, create: { subscriptionId: saved.id, key, value: String(value) }, update: { value: String(value) } });
      }
    }
    await tx.billingWebhookEvent.update({ where: { provider_eventId: { provider: 'stripe', eventId: event.id } }, data: { processedAt: new Date() } });
    return { subscription: { id: saved.id, organizationId, status: saved.status, planKey: saved.planKey } };
  });
}

module.exports = { PLAN_ENTITLEMENTS, entitlementsFor, getBillingStatus, applyStripeEvent };
