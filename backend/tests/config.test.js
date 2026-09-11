import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../saas/config.js';

test('loadConfig validates required production settings', () => {
  // Missing database URL in production
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production' }),
    /DATABASE_URL is required/,
  );

  // Missing Better Auth secret
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost:5432/suchi',
    }),
    /BETTER_AUTH_SECRET is required/,
  );

  // Short Better Auth secret
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost:5432/suchi',
      BETTER_AUTH_SECRET: 'short',
    }),
    /at least 32 characters/,
  );

  // Non-HTTPS Better Auth URL in production
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost:5432/suchi',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://api.suchi.app',
    }),
    /must use HTTPS in production/,
  );

  // Wildcard CORS origin in production
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost:5432/suchi',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'https://api.suchi.app',
      CORS_ORIGIN: '*',
    }),
    /must not contain wildcards in production/,
  );

  // Missing integration secrets when integrations enabled in production
  assert.throws(
    () => loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost:5432/suchi',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'https://api.suchi.app',
      CORS_ORIGIN: 'https://suchi.app',
      GOOGLE_CALENDAR_ENABLED: '1',
    }),
    /INTEGRATION_ENCRYPTION_KEY is required/,
  );
});

test('loadConfig loads valid production configuration', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@ep-suchi.neon.tech/suchi?sslmode=require',
    DIRECT_DATABASE_URL: 'postgresql://user:pass@ep-suchi-pooler.neon.tech/suchi?sslmode=require',
    BETTER_AUTH_SECRET: 'secret-with-minimum-thirty-two-chars-entropy',
    BETTER_AUTH_URL: 'https://api.suchi.app',
    CORS_ORIGIN: 'https://suchi.app',
    PORT: '8080',
  });

  assert.equal(config.isProduction, true);
  assert.equal(config.port, 8080);
  assert.equal(config.appName, 'Suchi');
  assert.ok(config.trustedOrigins.includes('https://suchi.app'));
  assert.ok(config.trustedOrigins.includes('suchi://'));
});
