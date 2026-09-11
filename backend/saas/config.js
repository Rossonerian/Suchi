import { URL } from 'node:url';

/**
 * Strict runtime configuration validation for Suchi SaaS platform.
 * Validates required environment variables on startup and enforces production invariants.
 */
export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const nodeEnv = env.NODE_ENV || (isProduction ? 'production' : 'development');
  const port = Number(env.PORT || 5000);

  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be a valid port number between 1 and 65535, received: ${env.PORT}`);
  }

  // Database URL validation
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl && nodeEnv !== 'test') {
    throw new Error('DATABASE_URL is required for Suchi backend.');
  }

  const directDatabaseUrl = env.DIRECT_DATABASE_URL || databaseUrl;

  // Better Auth Secret validation (min 32 characters)
  const betterAuthSecret = env.BETTER_AUTH_SECRET;
  if ((!betterAuthSecret || betterAuthSecret.length < 32) && nodeEnv !== 'test') {
    throw new Error('BETTER_AUTH_SECRET is required and must contain at least 32 characters.');
  }

  // Better Auth URL validation
  const betterAuthUrl = env.BETTER_AUTH_URL || (nodeEnv === 'test' ? 'http://localhost:5000' : '');
  if (!betterAuthUrl && nodeEnv !== 'test') {
    throw new Error('BETTER_AUTH_URL is required.');
  }

  if (betterAuthUrl) {
    try {
      const parsed = new URL(betterAuthUrl);
      if (isProduction && parsed.protocol !== 'https:') {
        throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
      }
    } catch (err) {
      if (err.message.includes('HTTPS')) throw err;
      throw new Error(`BETTER_AUTH_URL is invalid: ${betterAuthUrl}`);
    }
  }

  // CORS and Trusted Origins validation
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
  const corsOrigin = env.CORS_ORIGIN || frontendUrl;
  const rawOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS || corsOrigin)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (isProduction) {
    if (rawOrigins.some((origin) => origin.includes('*'))) {
      throw new Error('CORS_ORIGIN / trusted origins must not contain wildcards in production.');
    }
    if (rawOrigins.some((origin) => !origin.startsWith('https://') && !origin.startsWith('suchi://') && !origin.startsWith('nidar://'))) {
      throw new Error('All production trusted origins must use HTTPS or native application scheme.');
    }
  }

  const trustedOrigins = [...new Set([...rawOrigins, 'suchi://', 'nidar://'])];

  // Optional integrations validation
  const googleCalendarEnabled = env.GOOGLE_CALENDAR_ENABLED === '1';
  const integrationsEnabled = googleCalendarEnabled || env.INTEGRATIONS_ENABLED === '1';
  const integrationEncryptionKey = env.INTEGRATION_ENCRYPTION_KEY;
  const integrationStateSecret = env.INTEGRATION_STATE_SECRET;

  if (integrationsEnabled && isProduction) {
    if (!integrationEncryptionKey) {
      throw new Error('INTEGRATION_ENCRYPTION_KEY is required when integrations are enabled in production.');
    }
    if (!integrationStateSecret) {
      throw new Error('INTEGRATION_STATE_SECRET is required when integrations are enabled in production.');
    }
  }

  return {
    appName: 'Suchi',
    nodeEnv,
    isProduction,
    port,
    databaseUrl,
    directDatabaseUrl,
    betterAuthSecret,
    betterAuthUrl,
    frontendUrl,
    corsOrigin,
    trustedOrigins,
    // Database connection pool settings
    pgMaxConnections: Number(env.PGMAXCONNECTIONS || 20),
    pgConnectTimeoutMs: Number(env.PGCONNECT_TIMEOUT_MS || 5000),
    pgIdleTimeoutMs: Number(env.PGIDLE_TIMEOUT_MS || 30000),
    // Integrations
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET || null,
    googleCalendarEnabled,
    stripeSecretKey: env.STRIPE_SECRET_KEY || null,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || null,
    billingEnabled: env.BILLING_ENABLED === '1',
    openRouterApiKey: env.OPENROUTER_API_KEY || null,
    aiEnabled: env.AI_ENABLED === '1',
    inngestEventKey: env.INNGEST_EVENT_KEY || null,
    inngestSigningKey: env.INNGEST_SIGNING_KEY || null,
    resendApiKey: env.RESEND_API_KEY || null,
    gmailUser: env.GMAIL_USER || null,
    gmailAppPassword: env.GMAIL_APP_PASSWORD || null,
    authEmailPasswordEnabled: env.AUTH_EMAIL_PASSWORD_ENABLED !== '0',
    trustProxy: env.TRUST_PROXY === '1',
    integrationEncryptionKey,
    integrationStateSecret,
  };
}
