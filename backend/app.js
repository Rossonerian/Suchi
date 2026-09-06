const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const teamsRouter = require('./routes/teams');
const membersRouter = require('./routes/members');
const tasksRouter = require('./routes/tasks');
const authRouter = require('./routes/auth');
const meetingsRouter = require('./routes/meetings');
const plansRouter = require('./routes/plans');
const adminRouter = require('./routes/admin');
const { MISSION_DEADLINE } = require('./constants/mission');
const { requireAuth, requireSameOrigin } = require('./utils/auth');
const { clerkMiddlewareIfConfigured } = require('./utils/clerk');
const saasRouter = require('./routes/saas');
const organizationsRouter = require('./routes/organizations');
const jobsRouter = require('./routes/jobs');
const integrationsRouter = require('./routes/integrations');
const aiRouter = require('./routes/ai');
const workspaceRouter = require('./routes/workspace');
const { router: billingRouter, stripeWebhookRouter } = require('./routes/billing');
const attachmentsRouter = require('./routes/attachments');
const { rateLimitHandler } = require('./utils/rateLimit');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
// The API does not serve frontend scripts, so Helmet's default CSP is safe to
// keep enabled. Resource policy remains relaxed for credentialed cross-origin
// API responses from the explicitly allowed frontend origin.
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
}));
// Stripe requires the untouched request bytes for signature verification. This
// endpoint is mounted before the JSON parser; all other API routes use JSON.
app.use('/api/billing/stripe/webhook', stripeWebhookRouter);
app.use(express.json({ limit: '100kb' }));
const limiterOptions = { standardHeaders: 'draft-7', legacyHeaders: false, handler: rateLimitHandler, skip: () => process.env.NODE_ENV === 'test' };
app.use('/api', rateLimit({ ...limiterOptions, windowMs: 60 * 1000, limit: 120 }));
// SameSite cookies protect normal browser navigation. The explicit Origin
// check also protects cookie-authenticated mutations when production uses
// SameSite=None for a separately hosted frontend/API.
app.use('/api', requireSameOrigin(allowedOrigins));
// New organization-aware endpoints use Clerk when explicitly enabled. The
// existing routes remain on the compatibility session until their resources
// are migrated, so local NIDAR pages keep working during the transition.
app.use('/api/v1', clerkMiddlewareIfConfigured());
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1', workspaceRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1', attachmentsRouter);
app.use('/api/v1', saasRouter);
app.use('/api/inngest', jobsRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/mission', (req, res) => res.json({ deadline: MISSION_DEADLINE }));
app.use('/api/auth', authRouter);
app.use('/api/admin', rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 10 }), adminRouter);
app.use('/api/teams', requireAuth, teamsRouter);
app.use('/api/members', requireAuth, membersRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/meetings', requireAuth, meetingsRouter);
app.use('/api/plans', requireAuth, plansRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' }));
app.use(errorHandler);

module.exports = app;
