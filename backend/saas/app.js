import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { toNodeHandler } from 'better-auth/node';
import { errorHandler } from '../middleware/errorHandler.js';
import { rateLimitHandler } from '../utils/rateLimit.js';
import { getSaasDatabase } from './database.js';
import { getAuth, authConfiguration } from './auth.js';
import saasRouter from '../routes/saas.js';
import organizationsRouter from '../routes/organizations.js';
import integrationsRouter from '../routes/integrations.js';
import aiRouter from '../routes/ai.js';
import workspaceRouter from '../routes/workspace.js';
import attachmentsRouter from '../routes/attachments.js';
import { router as billingRouter, stripeWebhookRouter } from '../routes/billing.js';

export function createSaasApp({ auth = getAuth(), database = getSaasDatabase(), env = process.env } = {}) {
  const config = authConfiguration(env);
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use((req, res, next) => { req.requestId = randomUUID(); res.set('X-Request-ID', req.requestId); next(); });
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || config.trustedOrigins.includes(origin)), credentials: true }));
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/ready', async (req, res) => {
    try { await database.$queryRaw`SELECT 1`; res.json({ ok: true, database: 'ready', auth: 'configured' }); }
    catch { res.status(503).json({ ok: false, code: 'NOT_READY' }); }
  });
  app.get('/api/capabilities', (req, res) => res.json({ googleLogin: config.googleConfigured, emailPassword: env.AUTH_EMAIL_PASSWORD_ENABLED === '1', calendar: env.GOOGLE_CALENDAR_ENABLED === '1', ai: env.AI_ENABLED === '1', billing: env.BILLING_ENABLED === '1' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, handler: rateLimitHandler, skip: () => env.NODE_ENV === 'test' }));
  app.all('/api/auth/*', toNodeHandler(auth));
  if (env.BILLING_ENABLED === '1') app.use('/api/billing/stripe/webhook', stripeWebhookRouter);
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/v1', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      if ((origin && !config.trustedOrigins.includes(origin)) || (req.get('sec-fetch-site') === 'cross-site' && !origin)) return res.status(403).json({ error: 'Request origin is not allowed.', code: 'CSRF_REJECTED' });
    }
    next();
  });
  app.use('/api/v1/organizations', organizationsRouter);
  if (env.GOOGLE_CALENDAR_ENABLED === '1') app.use('/api/v1/integrations', integrationsRouter);
  if (env.AI_ENABLED === '1') app.use('/api/v1/ai', aiRouter);
  if (env.BILLING_ENABLED === '1') app.use('/api/v1/billing', billingRouter);
  app.use('/api/v1', workspaceRouter, attachmentsRouter, saasRouter);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' }));
  app.use(errorHandler);
  return app;
}
