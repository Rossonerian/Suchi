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

  if (env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  // Security headers via Helmet
  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  }));

  // Request ID correlation
  app.use((req, res, next) => {
    req.requestId = req.get('X-Request-ID') || randomUUID();
    res.set('X-Request-ID', req.requestId);
    next();
  });

  // Strict CORS allowlist
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = config.trustedOrigins.includes(origin);
      callback(null, isAllowed);
    },
    credentials: true,
  }));

  // Liveness endpoints (process health)
  const healthHandler = (req, res) => res.status(200).json({
    ok: true,
    status: 'healthy',
    service: 'suchi-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Readiness endpoints (dependencies ready)
  const readyHandler = async (req, res) => {
    try {
      await database.$queryRaw`SELECT 1`;
      res.status(200).json({
        ok: true,
        status: 'ready',
        database: 'ready',
        auth: 'configured',
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        ok: false,
        status: 'not_ready',
        code: 'DATABASE_UNAVAILABLE',
        error: 'Database is not ready or reachable.',
      });
    }
  };
  app.get('/ready', readyHandler);
  app.get('/api/ready', readyHandler);

  // Feature capabilities
  app.get('/api/capabilities', (req, res) => res.json({
    googleLogin: config.googleConfigured === true,
    emailPassword: env.AUTH_EMAIL_PASSWORD_ENABLED !== '0',
    calendar: env.GOOGLE_CALENDAR_ENABLED === '1',
    ai: env.AI_ENABLED === '1',
    billing: env.BILLING_ENABLED === '1',
  }));

  // Global API rate limiting
  app.use('/api', rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => env.NODE_ENV === 'test',
  }));

  // Better Auth endpoints
  app.all('/api/auth/*', toNodeHandler(auth));

  // Webhook raw endpoints before json parser if needed
  if (env.BILLING_ENABLED === '1') {
    app.use('/api/billing/stripe/webhook', stripeWebhookRouter);
  }

  // Bounded JSON body parser
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  // CSRF protection on state-mutating requests
  app.use('/api/v1', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      if ((origin && !config.trustedOrigins.includes(origin)) || (req.get('sec-fetch-site') === 'cross-site' && !origin)) {
        return res.status(403).json({
          error: 'Request origin is not allowed.',
          code: 'CSRF_REJECTED',
          requestId: req.requestId,
        });
      }
    }
    next();
  });

  // Application SaaS routers
  app.use('/api/v1/organizations', organizationsRouter);
  if (env.GOOGLE_CALENDAR_ENABLED === '1') app.use('/api/v1/integrations', integrationsRouter);
  if (env.AI_ENABLED === '1') app.use('/api/v1/ai', aiRouter);
  if (env.BILLING_ENABLED === '1') app.use('/api/v1/billing', billingRouter);
  app.use('/api/v1', workspaceRouter, attachmentsRouter, saasRouter);

  // 404 for unhandled API routes
  app.use('/api', (req, res) => res.status(404).json({
    error: 'Route not found.',
    code: 'NOT_FOUND',
    requestId: req.requestId,
  }));

  // Global error handler
  app.use(errorHandler);

  return app;
}
