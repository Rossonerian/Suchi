import express from 'express';
import Stripe from 'stripe';
import { requireOrganization } from '../saas/auth-context.js';
import { getSaasDatabase } from '../saas/database.js';
import { getBillingStatus, applyStripeEvent } from '../saas/billing.js';
import { AppError } from '../utils/validation.js';

const router = express.Router();
const stripeWebhookRouter = express.Router();

router.get('/status', requireOrganization, async (req, res, next) => {
  try { return res.json(await getBillingStatus(getSaasDatabase(), req.organizationContext)); } catch (error) { return next(error); }
});

stripeWebhookRouter.post('/', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) throw new AppError('Stripe billing is not configured.', 503, 'BILLING_UNAVAILABLE');
    const signature = req.get('stripe-signature');
    if (!signature) throw new AppError('Stripe signature is required.', 400, 'STRIPE_SIGNATURE_INVALID');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    return res.json(await applyStripeEvent(getSaasDatabase(), event));
  } catch (error) {
    if (error?.type === 'StripeSignatureVerificationError') return next(new AppError('Stripe signature is invalid.', 400, 'STRIPE_SIGNATURE_INVALID'));
    return next(error);
  }
});

export { router, stripeWebhookRouter };
